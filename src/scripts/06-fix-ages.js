// Fix patients with a missing or impossible date of birth.
//
// The anonymized dump left ~241 patients with a corrupted/default dateOfBirth
// that computes to a nonsensical age (< 0 or > 110 years). This assigns those
// patients a fresh random dateOfBirth for a random age between 1 and 100 years,
// spread across the year. Patients with a valid age are left untouched, so the
// script is safe to re-run.
//
// Run BEFORE 07-seed-patient-photos.sh:
//   docker compose exec -T mongo mongo --quiet meteor < scripts/06-fix-ages.js

var MIN_AGE = 1;
var MAX_AGE = 100;
var YEAR_MS = 31557600000; // 365.25 days
var DAY_MS = 86400000;

function ageOf(dob) {
  if (!(dob instanceof Date) || isNaN(dob.getTime())) return null;
  return (Date.now() - dob.getTime()) / YEAR_MS;
}

function isProblematic(dob) {
  var age = ageOf(dob);
  return age === null || age < 0 || age > 110;
}

function randomDob() {
  var age = MIN_AGE + Math.floor(Math.random() * (MAX_AGE - MIN_AGE + 1));
  var offsetDays = Math.floor(Math.random() * 365);
  return new Date(Date.now() - age * YEAR_MS - offsetDays * DAY_MS);
}

var targets = db.patients.find({}, { dateOfBirth: 1 }).toArray().filter(function (p) {
  return isProblematic(p.dateOfBirth);
});
print("patients with missing/impossible dateOfBirth: " + targets.length);

var fixed = 0;
targets.forEach(function (t) {
  db.patients.update({ _id: t._id }, { $set: { dateOfBirth: randomDob() } });
  fixed++;
});
print("dateOfBirth fixed: " + fixed);

// Verify: no patient should still be problematic.
var stillBad = db.patients.find({}, { dateOfBirth: 1 }).toArray().filter(function (p) {
  return isProblematic(p.dateOfBirth);
}).length;
print("patients still problematic: " + stillBad);
print("patients with null dateOfBirth: " + db.patients.count({ $or: [{ dateOfBirth: null }, { dateOfBirth: { $exists: false } }] }));
print("samples:");
db.patients.find({}, { name: 1, dateOfBirth: 1, _id: 0 }).limit(5).forEach(function (p) {
  print("  " + p.name + "  ->  " + (p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : "null")
    + "  (age " + Math.floor(ageOf(p.dateOfBirth)) + ")");
});
