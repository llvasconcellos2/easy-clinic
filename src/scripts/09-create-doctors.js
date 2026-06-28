// Create 9 additional doctors (the clinic starts with only the owner).
// Each gets a Brazilian name, a distinct staggered shift inside the clinic's
// 05:00-23:00 working window, a randomly chosen specialty, and a calendar color.
// They reuse the owner's password hash, so they log in with the same password
// the owner uses ("123456"). Idempotent: skips doctors whose email already exists.
//
// Run any time after the owner exists:
//   docker compose exec -T mongo mongo --quiet meteor < scripts/09-create-doctors.js

function rid() {
  var c = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz", s = "";
  for (var i = 0; i < 17; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
var ACCENTS = { "á":"a","à":"a","ã":"a","â":"a","é":"e","ê":"e","í":"i","ó":"o","õ":"o","ô":"o","ú":"u","ç":"c" };
function deburr(s) { return String(s).toLowerCase().replace(/[^\x00-\x7f]/g, function (c) { return ACCENTS[c] || ""; }); }
function block(start, end) { return { start: start, end: end }; }
// Mon-Fri share the same shift; Sun (0) and Sat (6) are days off.
function week(blocks) { return [null, blocks, blocks, blocks, blocks, blocks, null]; }
function signature(name, crm) {
  return '<p></p><h5 style="line-height: 1.1; color: rgb(103, 106, 108); margin: 0px 0px 7px; '
    + 'font-size: 14px; display: inline-block;"><small class="m-l-sm" style="font-size: 10.5px;">'
    + name + '<br>CRM ' + crm + '</small></h5>';
}

// Reuse the owner's bcrypt hash so the new doctors share the same password ("123456").
var owner = db.users.findOne({ isSuperAdmin: true }) || db.users.findOne({ "roles": "medical_doctor" });
var bcrypt = owner && owner.services && owner.services.password && owner.services.password.bcrypt;
if (!bcrypt) { print("ERROR: could not read owner's password hash; aborting."); quit(1); }

// Random, distinct specialties (one per doctor) drawn from the specialties collection.
var specNames = db.specialties.find({}, { name: 1, _id: 0 }).toArray().map(function (s) { return s.name; });
for (var i = specNames.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = specNames[i]; specNames[i] = specNames[j]; specNames[j] = t; }

var doctors = [
  { first: "Ana Beatriz",   last: "Carvalho",  crm: "52114", color: "#e57373", shift: week([block("05:00", "11:00")]) },
  { first: "Carlos Eduardo",last: "Almeida",   crm: "48907", color: "#f06292", shift: week([block("05:00", "13:00")]) },
  { first: "Mariana",       last: "Ribeiro",   crm: "60233", color: "#ba68c8", shift: week([block("07:00", "15:00")]) },
  { first: "Rafael",        last: "Souza Lima", crm: "57841", color: "#7986cb", shift: week([block("09:00", "17:00")]) },
  { first: "Juliana",       last: "Mendes",    crm: "49620", color: "#4fc3f7", shift: week([block("11:00", "19:00")]) },
  { first: "Bruno Henrique",last: "Oliveira",  crm: "61050", color: "#4db6ac", shift: week([block("13:00", "21:00")]) },
  { first: "Patrícia",      last: "Barbosa",   crm: "53388", color: "#81c784", shift: week([block("15:00", "23:00")]) },
  { first: "Felipe",        last: "Andrade",   crm: "58712", color: "#ffb74d", shift: week([block("17:00", "23:00")]) },
  { first: "Camila",        last: "Teixeira",  crm: "55179", color: "#a1887f", shift: week([block("07:00", "12:00"), block("14:00", "19:00")]) }
];

var created = 0, skipped = 0;
doctors.forEach(function (d, idx) {
  var fullName = d.first + " " + d.last;
  var email = deburr(d.first.split(" ")[0]) + "." + deburr(d.last.split(" ")[0]) + "@easyclinic.com.br";
  if (db.users.findOne({ "emails.address": email })) { print("skip (exists): " + email); skipped++; return; }

  var specialty = specNames[idx % specNames.length];
  db.users.insert({
    _id: rid(),
    createdAt: new Date(),
    services: { password: { bcrypt: bcrypt } },
    emails: [{ address: email, verified: true }],
    profile: {
      firstName: d.first,
      lastName: d.last,
      group: "medical_doctor",
      language: "pt-BR",
      CRM: d.crm,
      signature: signature(fullName, d.crm)
    },
    roles: ["default", "medical_doctor"],
    isUserEnabled: true,
    isSuperAdmin: false,
    specialties: [specialty],
    color: d.color,
    workHours: d.shift
  });
  created++;
  print("created: Dr(a). " + fullName + "  | " + specialty + "  | shift " + JSON.stringify(d.shift[1]) + "  | " + email);
});

print("---");
print("doctors created: " + created + ", skipped: " + skipped);
print("total medical_doctor users now: " + db.users.count({ "profile.group": "medical_doctor" }));
