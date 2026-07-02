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

  // ---------------------------------------------------------------------------
  // Demo freshness: the JSON fixtures are a frozen export, so "today"-dependent
  // views (dashboard agenda, schedule default view) go stale within days.
  // 1) Shift every time-series collection forward by a uniform whole-day delta
  //    so the newest schedule event lands on today (preserves chronology and
  //    times of day).
  // 2) Fill today's calendar to ~80% of each doctor's work-hour slots with
  //    generated appointments (tagged _demo:true).
  // Runs before Persistence.afterLoad: in persist mode the shifted+filled data
  // is what gets seeded into IDB on first visit; IDB overlays (user edits on
  // later visits) are never re-shifted.
  // ---------------------------------------------------------------------------
  var FILL_RATE = 0.8;

  function demoRefresh() {
    var scheduleDocs = global.Schedule._docs;
    if (!scheduleDocs.length) return;

    // 1) uniform whole-day shift so max(schedule.start) == today
    var maxStart = null;
    scheduleDocs.forEach(function (ev) {
      if (ev.start instanceof Date && (!maxStart || ev.start > maxStart)) maxStart = ev.start;
    });
    var startOfDay = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
    var dayDelta = startOfDay(new Date()).getTime() - startOfDay(maxStart).getTime();
    if (dayDelta > 0) {
      var shift = function (docs, fields) {
        docs.forEach(function (doc) {
          fields.forEach(function (f) {
            if (doc[f] instanceof Date) doc[f] = new Date(doc[f].getTime() + dayDelta);
          });
        });
      };
      shift(scheduleDocs, ["start", "end"]);
      shift(global.Appointments._docs, ["start", "end"]);
      shift(global.PatientRecords._docs, ["date"]);
      shift(global.PatientExams._docs, ["date"]);
      console.log("[data-source] shifted fixture dates forward by " + (dayDelta / 86400000) + " day(s)");
    }

    // 2) fill today's slots (~FILL_RATE) for every doctor
    var settings = global.Settings._docs[0] || {};
    var slotMins = settings.slotDuration || 20;
    var patients = global.Patients._docs;
    if (!patients.length) return;
    var now = new Date();
    var today = startOfDay(now);
    var weekday = today.getDay();
    var randomId = function () {
      return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    };
    var occupied = function (resourceId, slotStart, slotEnd) {
      return scheduleDocs.some(function (ev) {
        return ev.resourceId === resourceId && ev.start < slotEnd && ev.end > slotStart;
      });
    };
    var added = 0;
    global.Users._docs.forEach(function (doc) {
      if (!doc.profile || doc.profile.group !== "medical_doctor") return;
      var dayHours = doc.workHours && doc.workHours[weekday];
      if (!dayHours || !dayHours.length) return;
      var waitingPlaced = false;
      dayHours.forEach(function (interval) {
        var hm = function (s) {
          var p = String(s || "").split(":");
          return new Date(today.getFullYear(), today.getMonth(), today.getDate(), +p[0] || 0, +p[1] || 0);
        };
        for (var t = hm(interval.start); t < hm(interval.end); t = new Date(t.getTime() + slotMins * 60000)) {
          var slotEnd = new Date(t.getTime() + slotMins * 60000);
          if (Math.random() >= FILL_RATE) continue;
          if (occupied(doc._id, t, slotEnd)) continue;
          var pat = patients[Math.floor(Math.random() * patients.length)];
          var status;
          if (slotEnd <= now) status = "finished";
          else if (t <= now) status = "attending";
          else if (!waitingPlaced) { status = "waiting"; waitingPlaced = true; }
          else status = "scheduled";
          scheduleDocs.push({
            _id: randomId(),
            resourceId: doc._id,
            start: t,
            end: slotEnd,
            title: pat.name,
            constraint: "available_hours",
            status: status,
            patient: pat._id,
            _demo: true,
          });
          added++;
        }
      });
    });
    if (added) console.log("[data-source] generated " + added + " demo appointments for today");
  }

  Promise.all(promises).then(function () {
    console.log("[data-source] all collections loaded");
    try { demoRefresh(); } catch (e) { console.error("[data-source] demoRefresh failed", e); }
    // Let persistence.js overlay IDB data (or seed IDB) before firing Store.onReady.
    // If persistence.js isn't loaded (shouldn't happen), fall through immediately.
    if (global.Persistence) {
      global.Persistence.afterLoad(fire);
    } else {
      fire();
    }
  });

})(window);
