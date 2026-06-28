// Fill patients that have no email with a fake email derived from their
// (already anonymized) name, e.g. "maria.silva47@example.com".
// Only touches null/empty emails; existing ones are left as-is.
//
// Run AFTER 04-anonymize-patients.js:
//   docker compose exec -T mongo mongo --quiet meteor < scripts/05-fill-emails.js

var DOMAINS = ["example.com", "example.org", "mailinator.com", "teste.com.br"];
var ACCENTS = { "á":"a","à":"a","ã":"a","â":"a","ä":"a","é":"e","ê":"e","ë":"e",
  "í":"i","ï":"i","ó":"o","õ":"o","ô":"o","ö":"o","ú":"u","ü":"u","ç":"c","ñ":"n" };

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function deburr(s) {
  return String(s).toLowerCase().replace(/[^\x00-\x7f]/g, function (c) { return ACCENTS[c] || ""; });
}
function emailFor(name) {
  var parts = deburr(name).replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  var first = parts[0] || "paciente";
  var last = parts.length > 1 ? parts[parts.length - 1] : "";
  var local = last ? first + "." + last : first;
  return local + Math.floor(Math.random() * 90 + 10) + "@" + pick(DOMAINS);
}

var used = {};
db.patients.find({ email: { $nin: [null, ""] } }, { email: 1 }).forEach(function (p) { used[p.email] = true; });

var targets = db.patients.find({ $or: [{ email: null }, { email: "" }] }, { name: 1 }).toArray();
print("patients missing email: " + targets.length);

var filled = 0;
targets.forEach(function (t) {
  var email, tries = 0;
  do { email = emailFor(t.name || ""); tries++; } while (used[email] && tries < 50);
  used[email] = true;
  db.patients.update({ _id: t._id }, { $set: { email: email } });
  filled++;
});

print("emails filled: " + filled);
print("patients with email now: " + db.patients.find({ email: { $nin: [null, ""] } }).count());
print("patients still without email: " + db.patients.find({ $or: [{ email: null }, { email: "" }] }).count());
print("samples:");
db.patients.find({}, { name: 1, email: 1, _id: 0 }).limit(5).forEach(function (p) { print("  " + p.name + "  ->  " + p.email); });
