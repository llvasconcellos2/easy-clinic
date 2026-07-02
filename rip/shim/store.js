/*
 * store.js — synchronous in-memory minimongo-lite.
 * find(sel).fetch()/.count(), findOne(sel), insert, update (whole doc replace or $set/$unset),
 * remove; change events for reactive re-render.
 *
 * Selector support: equality, $in, $nin, $gt/$gte/$lt/$lte, $ne, $regex, $exists, $or.
 * Sort: { field: 1|-1 }. Projection ignored (always returns full doc).
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // EJSON revival: {"$date":"..."} → Date, {"$oid":"..."} → string
  // ---------------------------------------------------------------------------
  function revive(v) {
    if (Array.isArray(v)) return v.map(revive);
    if (v && typeof v === "object") {
      if (v.$date !== undefined) return new Date(v.$date);
      if (v.$oid !== undefined) return String(v.$oid);
      var o = {};
      Object.keys(v).forEach(function (k) { o[k] = revive(v[k]); });
      return o;
    }
    return v;
  }

  // ---------------------------------------------------------------------------
  // Selector matching
  // ---------------------------------------------------------------------------
  function matchOp(docVal, op, opVal) {
    switch (op) {
      case "$eq": return docVal == opVal;
      case "$ne": return docVal != opVal;
      case "$gt": return docVal > opVal;
      case "$gte": return docVal >= opVal;
      case "$lt": return docVal < opVal;
      case "$lte": return docVal <= opVal;
      case "$in":
        var arr = Array.isArray(opVal) ? opVal : [opVal];
        return arr.some(function (x) { return docVal == x; });
      case "$nin":
        var arr2 = Array.isArray(opVal) ? opVal : [opVal];
        return arr2.every(function (x) { return docVal != x; });
      case "$regex":
        try { return new RegExp(opVal).test(String(docVal || "")); } catch (e) { return false; }
      case "$exists":
        return opVal ? docVal !== undefined : docVal === undefined;
      default: return true;
    }
  }

  function getField(doc, path) {
    var parts = path.split(".");
    var v = doc;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function matchSelector(doc, sel) {
    if (!sel || typeof sel !== "object") return true;
    if (sel._id !== undefined && typeof sel._id !== "object") {
      if (doc._id !== sel._id) return false;
    }
    for (var k in sel) {
      if (!sel.hasOwnProperty(k)) continue;
      if (k === "$or") {
        var clauses = sel.$or;
        if (!clauses.some(function (c) { return matchSelector(doc, c); })) return false;
        continue;
      }
      var cond = sel[k];
      var docVal = getField(doc, k);
      if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof Date)) {
        for (var op in cond) {
          if (!cond.hasOwnProperty(op)) continue;
          if (!matchOp(docVal, op, cond[op])) return false;
        }
      } else {
        if (docVal != cond) return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Sort comparator
  // ---------------------------------------------------------------------------
  function makeSort(sort) {
    if (!sort) return null;
    var keys = Object.keys(sort);
    return function (a, b) {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var av = getField(a, k), bv = getField(b, k);
        var dir = sort[k];
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    };
  }

  // ---------------------------------------------------------------------------
  // Cursor (returned by find)
  // ---------------------------------------------------------------------------
  function Cursor(docs) { this._docs = docs; }
  Cursor.prototype.fetch = function () { return this._docs.slice(); };
  Cursor.prototype.count = function () { return this._docs.length; };
  Cursor.prototype.forEach = function (fn) { this._docs.forEach(fn); };
  Cursor.prototype.map = function (fn) { return this._docs.map(fn); };

  // ---------------------------------------------------------------------------
  // Collection
  // ---------------------------------------------------------------------------
  function Collection(name) {
    this._name = name;
    this._docs = [];
    this._listeners = [];
  }

  Collection.prototype._notify = function (op, doc) {
    var self = this;
    this._listeners.forEach(function (fn) { try { fn(op, doc); } catch (e) {} });
  };

  Collection.prototype.on = function (fn) { this._listeners.push(fn); return this; };
  Collection.prototype.off = function (fn) {
    this._listeners = this._listeners.filter(function (f) { return f !== fn; });
  };

  Collection.prototype.load = function (arr) {
    this._docs = revive(arr);
    return this;
  };

  Collection.prototype.find = function (sel, opts) {
    if (typeof sel === "string") sel = { _id: sel };
    opts = opts || {};
    var docs = this._docs.filter(function (d) { return matchSelector(d, sel); });
    if (opts.sort) {
      var cmp = makeSort(opts.sort);
      if (cmp) docs = docs.slice().sort(cmp);
    }
    if (opts.skip) docs = docs.slice(opts.skip);
    if (opts.limit) docs = docs.slice(0, opts.limit);
    return new Cursor(docs);
  };

  Collection.prototype.findOne = function (sel, opts) {
    if (typeof sel === "string") sel = { _id: sel };
    var cur = this.find(sel, opts);
    return cur.fetch()[0] || null;
  };

  Collection.prototype.insert = function (doc) {
    if (!doc._id) doc._id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    this._docs.push(doc);
    this._notify("insert", doc);
    return doc._id;
  };

  Collection.prototype.update = function (sel, modifier) {
    if (typeof sel === "string") sel = { _id: sel };
    var updated = 0;
    this._docs = this._docs.map(function (doc) {
      if (!matchSelector(doc, sel)) return doc;
      if (modifier.$set || modifier.$unset || modifier.$push || modifier.$pull) {
        var out = Object.assign({}, doc);
        if (modifier.$set) Object.assign(out, modifier.$set);
        if (modifier.$unset) Object.keys(modifier.$unset).forEach(function (k) { delete out[k]; });
        if (modifier.$push) {
          Object.keys(modifier.$push).forEach(function (k) {
            if (!Array.isArray(out[k])) out[k] = [];
            out[k].push(modifier.$push[k]);
          });
        }
        if (modifier.$pull) {
          Object.keys(modifier.$pull).forEach(function (k) {
            if (Array.isArray(out[k])) {
              var v = modifier.$pull[k];
              out[k] = out[k].filter(function (x) { return x !== v; });
            }
          });
        }
        updated++;
        return out;
      }
      // replacement
      updated++;
      return Object.assign({ _id: doc._id }, modifier);
    });
    if (updated > 0) this._notify("update", null);
    return updated;
  };

  Collection.prototype.remove = function (sel) {
    if (typeof sel === "string") sel = { _id: sel };
    var before = this._docs.length;
    this._docs = this._docs.filter(function (d) { return !matchSelector(d, sel); });
    var removed = before - this._docs.length;
    if (removed > 0) this._notify("remove", null);
    return removed;
  };

  Collection.prototype.upsert = function (sel, modifier) {
    if (typeof sel === "string") sel = { _id: sel };
    var existing = this.findOne(sel);
    if (existing) return this.update(sel, modifier);
    var doc = Object.assign({}, sel);
    if (modifier.$set) Object.assign(doc, modifier.$set);
    else Object.assign(doc, modifier);
    return this.insert(doc);
  };

  // Shorthand: count without a cursor
  Collection.prototype.count = function (sel) {
    return this.find(sel || {}).count();
  };

  // ---------------------------------------------------------------------------
  // Store registry
  // ---------------------------------------------------------------------------
  var Store = {
    _collections: {},
    _changeListeners: [],

    collection: function (name) {
      if (!this._collections[name]) {
        var c = new Collection(name);
        var self = this;
        c.on(function (op, doc) {
          self._changeListeners.forEach(function (fn) { try { fn(name, op, doc); } catch (e) {} });
        });
        this._collections[name] = c;
      }
      return this._collections[name];
    },

    onChange: function (fn) { this._changeListeners.push(fn); },
    offChange: function (fn) {
      this._changeListeners = this._changeListeners.filter(function (f) { return f !== fn; });
    }
  };

  // ---------------------------------------------------------------------------
  // Expose as global collection shims (matching Meteor app's globals)
  // ---------------------------------------------------------------------------
  var colMap = {
    Patients:       "patients",
    Appointments:   "appointments",
    Schedule:       "schedule",
    PatientRecords: "patient-records",
    PatientExams:   "patient-exams",
    Drugs:          "drugs",
    ICD10:          "icd10",
    Specialties:    "specialties",
    ExamCatalog:    "exam-catalog",
    DocumentModels: "document-models",
    FormModels:     "form-models",
    Settings:       "settings",
    Users:          "users",
    Images:         "images-meta",
  };
  Object.keys(colMap).forEach(function (k) {
    global[k] = Store.collection(colMap[k]);
  });

  global.Store = Store;
  global.EJSON = { revive: revive };

})(window);
