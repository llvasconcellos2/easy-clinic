// Fill patients that have no phone with a fake Brazilian mobile number in the
// same format the existing data uses, e.g. "(11) 97852-8596".
// Only touches missing/null/empty phones; existing ones are left as-is.
//
// Run AFTER 04-anonymize-patients.js:
//   docker compose exec -T mongo mongo --quiet meteor < scripts/11-fill-phones.js

// Valid Brazilian area codes (DDD).
var DDDS = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function pad4(n) { n = String(n); while (n.length < 4) { n = "0" + n; } return n; }

// Brazilian mobile: (DD) 9XXXX-XXXX  -> 15 chars, within the schema's max:15.
function phoneFor() {
  return "(" + pick(DDDS) + ") 9" + pad4(Math.floor(Math.random() * 10000)) +
    "-" + pad4(Math.floor(Math.random() * 10000));
}

var query = { $or: [{ phone: { $exists: false } }, { phone: null }, { phone: "" }] };
var targets = db.patients.find(query, { _id: 1 }).toArray();
print("patients missing phone: " + targets.length);

var filled = 0;
targets.forEach(function (t) {
  db.patients.update({ _id: t._id }, { $set: { phone: phoneFor() } });
  filled++;
});

print("phones filled: " + filled);
print("patients with phone now: " + db.patients.find({ phone: { $nin: [null, ""] } }).count());
print("patients still without phone: " + db.patients.find(query).count());
print("samples:");
db.patients.find({}, { name: 1, phone: 1, _id: 0 }).limit(5).forEach(function (p) { print("  " + p.name + "  ->  " + p.phone); });
