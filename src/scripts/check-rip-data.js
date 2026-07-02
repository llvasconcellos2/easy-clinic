// Referential-integrity + freshness check for the rip/data/*.json fixtures.
// Verifies that schedule/appointments/records/exams reference existing patients
// and doctors, and reports date ranges so stale "today"-dependent data is caught
// (the dashboard agenda and the schedule default view only show today's events).
//
//   node src/scripts/check-rip-data.js

const fs = require("fs");
const path = require("path");

const DATA = path.resolve(__dirname, "..", "..", "rip", "data");
const J = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

const patients = J("patients.json");
const users = J("users.json");
const schedule = J("schedule.json");
const appointments = J("appointments.json");
const records = J("patient-records.json");
const exams = J("patient-exams.json");
const imagesMeta = J("images-meta.json");

const patIds = new Set(patients.map((d) => d._id));
const usrIds = new Set(users.map((d) => d._id));

let failures = 0;
const report = (label, badList, total) => {
  const bad = badList.length;
  if (bad) failures++;
  console.log((bad ? "FAIL " : "ok   ") + label + ": " + bad + "/" + total + " orphan" +
    (bad ? "  e.g. " + JSON.stringify(badList.slice(0, 3)) : ""));
};

report("schedule.patient -> patients", schedule.filter((d) => d.patient && !patIds.has(d.patient)).map((d) => ({ _id: d._id, patient: d.patient, title: d.title })), schedule.length);
report("schedule.resourceId -> users", schedule.filter((d) => d.resourceId && !usrIds.has(d.resourceId)).map((d) => d._id), schedule.length);
// appointments embed patient/user as {_id, name} sub-docs
report("appointments.patient._id -> patients", appointments.filter((d) => d.patient && d.patient._id && !patIds.has(d.patient._id)).map((d) => d._id), appointments.length);
report("appointments.user._id -> users", appointments.filter((d) => d.user && d.user._id && !usrIds.has(d.user._id)).map((d) => d._id), appointments.length);
report("patient-records.patient -> patients", records.filter((d) => d.patient && !patIds.has(d.patient)).map((d) => d._id), records.length);
report("patient-exams.patient -> patients", exams.filter((d) => d.patient && !patIds.has(d.patient)).map((d) => d._id), exams.length);

// image files on disk vs meta docs
const imgDir = path.join(DATA, "images");
const files = fs.existsSync(imgDir) ? new Set(fs.readdirSync(imgDir).map((f) => f.replace(/\.[^.]+$/, ""))) : new Set();
report("images-meta -> data/images files", imagesMeta.filter((d) => !files.has(d._id)).map((d) => d._id), imagesMeta.length);

// date freshness: today-dependent views (dashboard agenda, schedule default view)
const range = (label, arr, get) => {
  const ds = arr.map(get).filter(Boolean).sort();
  console.log("     " + label + ": " + ds[0] + " .. " + ds[ds.length - 1]);
  return ds[ds.length - 1];
};
console.log("date ranges:");
const lastSched = range("schedule.start", schedule, (d) => d.start && d.start.$date);
range("appointments.start", appointments, (d) => d.start && d.start.$date);
range("patient-records.date", records, (d) => d.date && d.date.$date);

// Staleness is informational only: data-source.js shifts all dates forward at
// load so the newest schedule event always lands on today (demoRefresh).
const today = new Date(); today.setHours(0, 0, 0, 0);
if (lastSched && new Date(lastSched) < today) {
  const days = Math.round((today - new Date(lastSched)) / 86400000);
  console.log("info raw fixtures are " + days + " day(s) old — data-source.js demoRefresh shifts them to today at load");
} else {
  console.log("ok   schedule fixtures reach today");
}

console.log("\n" + (failures ? failures + " check(s) failed" : "all checks passed"));
process.exit(failures ? 2 : 0);
