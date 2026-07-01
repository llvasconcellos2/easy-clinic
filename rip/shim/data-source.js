/*
 * data-source.js — loads rip/data/*.json into the Store on startup.
 * Fires Store.onReady(fn) callbacks once all collections are loaded.
 * Also stubs Meteor.subscribe() → {ready: () => true}
 */
(function (global) {
  "use strict";

  var COLLECTIONS = [
    { name: "patients",         col: "Patients" },
    { name: "appointments",     col: "Appointments" },
    { name: "schedule",         col: "Schedule" },
    { name: "patient-records",  col: "PatientRecords" },
    { name: "patient-exams",    col: "PatientExams" },
    { name: "drugs",            col: "Drugs" },
    { name: "icd10",            col: "ICD10" },
    { name: "specialties",      col: "Specialties" },
    { name: "exam-catalog",     col: "ExamCatalog" },
    { name: "document-models",  col: "DocumentModels" },
    { name: "form-models",      col: "FormModels" },
    { name: "settings",         col: "Settings" },
    { name: "users",            col: "Users" },
    { name: "images-meta",      col: "Images" },
  ];

  var BASE = (function () {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      var m = src.match(/^(https?:\/\/[^/]+)/);
      if (m) return m[1];
    }
    return "";
  })();

  var _readyCallbacks = [];
  var _ready = false;

  Store.onReady = function (fn) {
    if (_ready) { fn(); } else { _readyCallbacks.push(fn); }
  };

  function fire() {
    _ready = true;
    _readyCallbacks.forEach(function (fn) { try { fn(); } catch (e) { console.error("[data-source]", e); } });
    _readyCallbacks = [];
  }

  // Stub Meteor.subscribe — data is preloaded so subs are instant no-ops
  var Meteor = global.Meteor || (global.Meteor = {});
  Meteor.subscribe = function () { return { ready: function () { return true; } }; };

  // Stub Meteor.call — dispatch table populated by methods.js (loaded later)
  Meteor._methods = {};
  Meteor.call = function (name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var cb = null;
    if (typeof args[args.length - 1] === "function") cb = args.pop();
    var fn = Meteor._methods[name];
    if (fn) {
      try {
        var res = fn.apply(null, args);
        if (cb) cb(null, res);
      } catch (e) {
        if (cb) cb(e);
        else console.error("[Meteor.call]", name, e);
      }
    } else {
      console.warn("[Meteor.call] no local impl for:", name);
      if (cb) cb(new Error("method not found: " + name));
    }
  };

  // Load all JSON files in parallel
  var promises = COLLECTIONS.map(function (item) {
    return fetch(BASE + "/data/" + item.name + ".json")
      .then(function (r) { return r.json(); })
      .then(function (arr) {
        if (Array.isArray(arr)) global[item.col].load(arr);
      })
      .catch(function (e) { console.warn("[data-source] failed to load", item.name, e); });
  });

  Promise.all(promises).then(function () {
    console.log("[data-source] all collections loaded");
    // Let persistence.js overlay IDB data (or seed IDB) before firing Store.onReady.
    // If persistence.js isn't loaded (shouldn't happen), fall through immediately.
    if (global.Persistence) {
      global.Persistence.afterLoad(fire);
    } else {
      fire();
    }
  });

})(window);
