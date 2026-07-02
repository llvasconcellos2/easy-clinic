// Repair schedule -> patient references broken by the anonymization scripts
// (patients were rewritten with new _ids; schedule.patient was never updated).
// For each schedule event whose `patient` id no longer exists:
//   - match a patient by exact name === event title, else
//   - assign a random existing patient and rewrite the title to its name.
// Idempotent: events with a valid patient ref are left untouched.
//
// Run:  docker compose exec -T mongo mongo --quiet meteor < scripts/12-fix-schedule-refs.js

// 1. Safety snapshot (reversible within Mongo).
db.schedule.aggregate([{ $out: "schedule_backup_prefix" }]);
print("backup collection schedule_backup_prefix: " +
      db.schedule_backup_prefix.count() + " docs");

var allPatients = db.patients.find({}, { name: 1 }).toArray();
var byName = {};
allPatients.forEach(function (p) { byName[p.name] = p._id; });

var fixed = 0, byTitle = 0, byRandom = 0, okCount = 0;

db.schedule.find({ patient: { $exists: true } }).forEach(function (ev) {
  if (db.patients.count({ _id: ev.patient }) > 0) { okCount++; return; }

  var newId, newTitle;
  if (ev.title && byName[ev.title]) {
    newId = byName[ev.title];
    newTitle = ev.title;
    byTitle++;
  } else {
    var pick = allPatients[Math.floor(Math.random() * allPatients.length)];
    newId = pick._id;
    newTitle = pick.name;
    byRandom++;
  }
  db.schedule.update({ _id: ev._id }, { $set: { patient: newId, title: newTitle } });
  fixed++;
});

print("schedule events: " + okCount + " already valid, " + fixed + " repaired " +
      "(" + byTitle + " matched by title, " + byRandom + " reassigned randomly)");

// 2. Verify: no orphans remain.
var orphans = 0;
db.schedule.find({ patient: { $exists: true } }).forEach(function (ev) {
  if (db.patients.count({ _id: ev.patient }) === 0) orphans++;
});
print(orphans === 0 ? "OK: no orphan patient refs remain" :
      "WARNING: " + orphans + " orphan refs remain");
