// Deduplicate patients sharing the same (non-null) CPF.
// Strategy: same CPF => same person. Keep ONE record per CPF:
//   - base = most complete record (most non-empty fields),
//            tie-break by most recent createdAt, then _id for stability.
//   - fill any field the base is missing from the other records
//     (preferring the next most complete/recent).
//   - union array fields (e.g. `records` medical history) so no history is lost.
//   - on genuine scalar conflicts, the base (most complete/recent) value wins.
//   - delete the now-merged duplicates.
//
// Run:  docker compose exec -T mongo mongo --quiet meteor < scripts/01-dedupe-cpf.js

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (v instanceof Date) return false;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function completeness(d) {
  var n = 0;
  for (var k in d) {
    if (k === "_id") continue;
    if (!isEmpty(d[k])) n++;
  }
  return n;
}

function timeOf(d) {
  return (d.createdAt && d.createdAt.getTime) ? d.createdAt.getTime() : 0;
}

// 1. Safety snapshot of the current collection (reversible within Mongo).
db.patients.aggregate([{ $out: "patients_backup_predupe" }]);
print("backup collection patients_backup_predupe: " +
      db.patients_backup_predupe.count() + " docs");

// 2. Find duplicate non-null CPF groups.
var groups = db.patients.aggregate([
  { $match: { CPF: { $ne: null } } },
  { $group: { _id: "$CPF", ids: { $push: "$_id" }, n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();

print("duplicate CPF groups: " + groups.length);

var groupCount = 0, deletedCount = 0, arrayUnions = 0, gapFills = 0;

groups.forEach(function (g) {
  groupCount++;
  var docs = db.patients.find({ _id: { $in: g.ids } }).toArray();

  docs.sort(function (a, b) {
    var ca = completeness(a), cb = completeness(b);
    if (cb !== ca) return cb - ca;            // most complete first
    var ta = timeOf(a), tb = timeOf(b);
    if (tb !== ta) return tb - ta;            // then most recent
    return a._id < b._id ? -1 : 1;            // stable
  });

  var base = docs[0];
  var others = docs.slice(1);

  var merged = {};
  for (var k in base) merged[k] = base[k];

  others.forEach(function (o) {
    for (var key in o) {
      if (key === "_id") continue;
      var ov = o[key];
      if (isEmpty(ov)) continue;

      if (isEmpty(merged[key])) {
        merged[key] = ov;                     // fill a gap in the base
        gapFills++;
      } else if (Array.isArray(merged[key]) && Array.isArray(ov)) {
        var seen = {};                        // union array history
        merged[key].forEach(function (x) { seen[JSON.stringify(x)] = true; });
        ov.forEach(function (x) {
          var sk = JSON.stringify(x);
          if (!seen[sk]) { merged[key].push(x); seen[sk] = true; arrayUnions++; }
        });
      }
      // else: both non-empty scalars -> keep base value (most complete/recent)
    }
  });

  delete merged._id;                          // _id is immutable; keep base's
  db.patients.update({ _id: base._id }, { $set: merged });

  var delIds = others.map(function (o) { return o._id; });
  db.patients.remove({ _id: { $in: delIds } });
  deletedCount += delIds.length;
});

print("groups merged: " + groupCount);
print("duplicate records deleted: " + deletedCount);
print("gap fields filled from duplicates: " + gapFills);
print("array items unioned: " + arrayUnions);

// 3. Verify no duplicate non-null CPFs remain.
var remaining = db.patients.aggregate([
  { $match: { CPF: { $ne: null } } },
  { $group: { _id: "$CPF", n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("remaining duplicate CPF groups: " + remaining.length);
print("final patient count: " + db.patients.count());
