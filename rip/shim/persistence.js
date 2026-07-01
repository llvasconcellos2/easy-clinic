/*
 * persistence.js — optional IndexedDB write-through adapter.
 *
 * Modes
 *   in-memory (default)   – data-source.js loads JSON every page load; no IDB touches.
 *   persist  (?persist=1) – first run seeds IDB from JSON; subsequent runs load from IDB.
 *                           All Store mutations write through to IDB automatically.
 *
 * Activate:  add ?persist=1 to the URL once  →  stored in localStorage, sticks.
 * Deactivate: add ?persist=0 to the URL once →  cleared from localStorage.
 * Reset:      Persistence.reset() or the Settings page button  →  wipes IDB, reloads page.
 *
 * Load order: store.js → persistence.js → data-source.js → methods.js → shim.js → router.js
 * data-source.js calls Persistence.afterLoad(done) at the end instead of done() directly.
 */
(function (global) {
  "use strict";

  var LS_KEY       = "rip-persist";
  var SEED_VERSION = "1";            // bump this string to force a reseed wipe
  var DB_NAME      = "clinica-facil-rip";
  var DB_VER       = 1;

  // Collection list mirrors data-source.js
  var COLLECTIONS = [
    { name: "patients",        col: "Patients" },
    { name: "appointments",    col: "Appointments" },
    { name: "schedule",        col: "Schedule" },
    { name: "patient-records", col: "PatientRecords" },
    { name: "patient-exams",   col: "PatientExams" },
    { name: "drugs",           col: "Drugs" },
    { name: "icd10",           col: "ICD10" },
    { name: "specialties",     col: "Specialties" },
    { name: "exam-catalog",    col: "ExamCatalog" },
    { name: "document-models", col: "DocumentModels" },
    { name: "form-models",     col: "FormModels" },
    { name: "settings",        col: "Settings" },
    { name: "users",           col: "Users" },
    { name: "images-meta",     col: "Images" },
  ];

  // ---------------------------------------------------------------------------
  // Detect persist mode (URL param overrides localStorage)
  // ---------------------------------------------------------------------------
  var searchStr   = location.search + location.hash;
  var wantEnable  = /[?&#]persist=1/.test(searchStr);
  var wantDisable = /[?&#]persist=0/.test(searchStr);

  if (wantEnable)  { try { localStorage.setItem(LS_KEY,  "1"); } catch (e) {} }
  if (wantDisable) { try { localStorage.removeItem(LS_KEY);    } catch (e) {} }

  var persistMode = !wantDisable && (wantEnable || (function () {
    try { return localStorage.getItem(LS_KEY) === "1"; } catch (e) { return false; }
  })());

  // ---------------------------------------------------------------------------
  // Raw IDB helpers — Promise wrappers, no external lib required
  // ---------------------------------------------------------------------------
  var _db = null;

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (_db) { resolve(_db); return; }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        COLLECTIONS.forEach(function (c) {
          if (!db.objectStoreNames.contains(c.name)) {
            db.createObjectStore(c.name);
          }
        });
        if (!db.objectStoreNames.contains("_meta")) {
          db.createObjectStore("_meta");
        }
      };
      req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function idbGet(storeName, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(storeName, "readonly");
        var req = tx.objectStore(storeName).get(key);
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function idbPut(storeName, key, value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(storeName, "readwrite");
        var req = tx.objectStore(storeName).put(value, key);
        req.onsuccess = function ()  { resolve(); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function idbClearAll() {
    return openDB().then(function (db) {
      var stores = Array.prototype.slice.call(db.objectStoreNames);
      if (stores.length === 0) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(stores, "readwrite");
        var pending = stores.length;
        function done() { if (--pending === 0) resolve(); }
        stores.forEach(function (n) {
          var req  = tx.objectStore(n).clear();
          req.onsuccess = done;
          req.onerror   = function (e) { reject(e.target.error); };
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Throttled write-through — debounce 300 ms to avoid hammering IDB
  // ---------------------------------------------------------------------------
  var _saveTimers = {};

  function scheduleSave(colName) {
    if (_saveTimers[colName]) clearTimeout(_saveTimers[colName]);
    _saveTimers[colName] = setTimeout(function () {
      delete _saveTimers[colName];
      var col = global.Store && global.Store._collections && global.Store._collections[colName];
      if (col) {
        idbPut(colName, "docs", col._docs).catch(function (e) {
          console.warn("[persistence] save failed for", colName, e);
        });
      }
    }, 300);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  var Persistence = {
    active: persistMode,

    /*
     * Called by data-source.js after all JSON is loaded into in-memory Store.
     * In persist mode: overlays each collection with its IDB snapshot (if any),
     * seeds IDB from JSON for collections that have no snapshot yet, then wires
     * write-through. In in-memory mode: calls done() immediately.
     */
    afterLoad: function (done) {
      if (!persistMode) { done(); return; }

      openDB()
        .then(function () {
          // Seed version check: if stale, wipe IDB so JSON becomes the baseline again
          return idbGet("_meta", "seedVersion").then(function (stored) {
            if (stored !== SEED_VERSION) {
              console.log("[persistence] seed version changed (" + stored + " → " + SEED_VERSION + "), clearing IDB");
              return idbClearAll().then(function () {
                return idbPut("_meta", "seedVersion", SEED_VERSION);
              });
            }
          });
        })
        .then(function () {
          // Overlay each collection: use IDB snapshot if it exists, else seed from JSON
          return Promise.all(COLLECTIONS.map(function (c) {
            return idbGet(c.name, "docs").then(function (docs) {
              if (Array.isArray(docs) && docs.length > 0) {
                // Subsequent visit: IDB has mutations, use them
                global[c.col].load(docs);
              } else {
                // First visit for this collection: seed IDB from JSON baseline
                return idbPut(c.name, "docs", global[c.col]._docs);
              }
            });
          }));
        })
        .then(function () {
          // Ensure seed version is written (handles fresh DB after clearAll)
          return idbGet("_meta", "seedVersion").then(function (v) {
            if (!v) return idbPut("_meta", "seedVersion", SEED_VERSION);
          });
        })
        .then(function () {
          // Wire write-through for all future Store mutations
          global.Store.onChange(function (colName) {
            scheduleSave(colName);
          });

          // Request persistent storage so the browser won't evict the IDB data
          if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then(function (granted) {
              if (granted) console.log("[persistence] persistent storage granted");
            });
          }

          console.log("[persistence] IDB ready — edits will survive reload");
          done();
        })
        .catch(function (e) {
          console.warn("[persistence] IDB error, falling back to in-memory:", e);
          done();
        });
    },

    /*
     * Wipe all IDB data and reload the page.
     * On reload, data-source.js re-reads JSON → seeds fresh IDB.
     */
    reset: function () {
      if (!_db && !persistMode) {
        // Nothing to wipe; just reload
        location.reload();
        return;
      }
      idbClearAll()
        .then(function () {
          console.log("[persistence] IDB cleared — reloading from fixtures");
          location.reload();
        })
        .catch(function (e) {
          console.warn("[persistence] reset failed:", e);
          location.reload();
        });
    },

    /*
     * Turn persist mode on: set localStorage flag, reload.
     */
    enable: function () {
      try { localStorage.setItem(LS_KEY, "1"); } catch (e) {}
      location.hash = "#/settings";
      location.reload();
    },

    /*
     * Turn persist mode off: remove localStorage flag, reload.
     */
    disable: function () {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      location.hash = "#/settings";
      location.reload();
    }
  };

  global.Persistence = Persistence;

})(window);
