// Anonymize real patient PII in the `patients` collection.
//
// Replaces identifying fields with realistic fake Brazilian data while keeping
// the data shape useful for testing. Only fields that are ALREADY populated are
// replaced, so the original null/empty distribution is preserved.
//
//   Replaced : name, email, phone, RG, recommendedBy,
//              streetAddress_1, streetAddress_2, bairro, zip,
//              titularCPF (only when it looks like a real CPF),
//              obs (cleared; blood type kept if detected)
//   Kept     : CPF (already fake), city, state, dateOfBirth, gender,
//              maritalStatus, skinColor, literacy, occupation, placeOfBirth,
//              healthInsurance, records, picture, code, bed, prevRetorno
//
// Run:  docker compose exec -T mongo mongo --quiet meteor < scripts/04-anonymize-patients.js

var MALE = ["Miguel","Arthur","Heitor","Bernardo","Davi","Lucas","Gabriel","Pedro",
  "Rafael","Enzo","Matheus","Guilherme","Gustavo","Felipe","Bruno","Rodrigo",
  "Eduardo","Leandro","Marcelo","Thiago","Fernando","Ricardo","Anderson","Vinicius"];
var FEMALE = ["Helena","Alice","Laura","Maria","Sophia","Manuela","Julia","Isabela",
  "Luiza","Beatriz","Mariana","Fernanda","Camila","Patricia","Aline","Bruna",
  "Carolina","Juliana","Vanessa","Gabriela","Renata","Daniela","Cristiane","Larissa"];
var SURNAMES = ["Silva","Santos","Oliveira","Souza","Lima","Pereira","Ferreira","Costa",
  "Rodrigues","Almeida","Nascimento","Carvalho","Araujo","Ribeiro","Gomes","Martins",
  "Rocha","Barbosa","Cardoso","Teixeira","Moreira","Correia","Mendes","Freitas","Pinto"];
var STREET_TYPES = ["Rua","Avenida","Travessa","Servidão","Rodovia","Alameda"];
var BAIRROS = ["Centro","Trindade","Agronômica","Itacorubi","Córrego Grande","Saco Grande",
  "Canasvieiras","Ingleses","Coqueiros","Estreito","Capoeiras","Campinas","Kobrasol",
  "Jardim América","Vila Nova","São José","Bela Vista","Boa Vista","Santa Mônica"];
var DDDS = ["47","48","49","11","21","51","41","31","61","85"];
var DOMAINS = ["example.com","example.org","mailinator.com","teste.com.br"];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function digits(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; }
var ACCENTS = { "á":"a","à":"a","ã":"a","â":"a","ä":"a","é":"e","ê":"e","ë":"e",
  "í":"i","ï":"i","ó":"o","õ":"o","ô":"o","ö":"o","ú":"u","ü":"u","ç":"c","ñ":"n" };
function deburr(s) {
  return String(s).toLowerCase().replace(/[^\x00-\x7f]/g, function (c) { return ACCENTS[c] || ""; });
}

function fakeName(gender) {
  var first = gender === "F" ? pick(FEMALE) : gender === "M" ? pick(MALE)
            : pick(Math.random() < 0.5 ? MALE : FEMALE);
  return first + " " + pick(SURNAMES) + " " + pick(SURNAMES);
}
function fakeEmail(name) {
  var parts = deburr(name).toLowerCase().split(/\s+/);
  return parts[0] + "." + parts[parts.length - 1] + digits(2) + "@" + pick(DOMAINS);
}
function fakePhone() { return "(" + pick(DDDS) + ") 9" + digits(4) + "-" + digits(4); }
function fakeRG() { return digits(2) + "." + digits(3) + "." + digits(3) + "-" + digits(1); }
function fakeStreet() { return pick(STREET_TYPES) + " " + pick(SURNAMES) + ", " + (Math.floor(Math.random() * 1990) + 10); }
function fakeComplement() { return pick(["Apto", "Casa", "Bloco", "Sala"]) + " " + (Math.floor(Math.random() * 300) + 1); }
function fakeZip() { return digits(8); }

// Valid Brazilian CPF (mod-11), formatted — reused for real-looking titularCPF.
function cpfCheck(d, f) { var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * (f - i); var r = s % 11; return r < 2 ? 0 : 11 - r; }
function fakeCPF() {
  var b = []; for (var i = 0; i < 9; i++) b.push(Math.floor(Math.random() * 10));
  var d1 = cpfCheck(b, 10), d2 = cpfCheck(b.concat([d1]), 11);
  var s = b.concat([d1, d2]).join("");
  return s.substr(0, 3) + "." + s.substr(3, 3) + "." + s.substr(6, 3) + "-" + s.substr(9, 2);
}
function looksLikeCPF(v) {
  return typeof v === "string" && v.replace(/\D/g, "").length === 11;
}

function nonEmpty(v) { return v !== null && v !== undefined && String(v).trim() !== ""; }

var n = 0, obsCleared = 0, bloodKept = 0, titularFaked = 0;
db.patients.find({}).forEach(function (p) {
  var set = {};

  set.name = fakeName(p.gender);
  if (nonEmpty(p.email))            set.email = fakeEmail(set.name);
  if (nonEmpty(p.phone))            set.phone = fakePhone();
  if (nonEmpty(p.RG))               set.RG = fakeRG();
  if (nonEmpty(p.recommendedBy))    set.recommendedBy = fakeName(null);
  if (nonEmpty(p.streetAddress_1))  set.streetAddress_1 = fakeStreet();
  if (nonEmpty(p.streetAddress_2))  set.streetAddress_2 = fakeComplement();
  if (nonEmpty(p.bairro))           set.bairro = pick(BAIRROS);
  if (nonEmpty(p.zip))              set.zip = fakeZip();
  if (looksLikeCPF(p.titularCPF)) { set.titularCPF = fakeCPF(); titularFaked++; }

  if (nonEmpty(p.obs)) {
    // obs is free text laden with third-party PII (parents, doctors, CNS...).
    // Drop it entirely, preserving only a detected blood type for realism.
    var m = String(p.obs).match(/sang[^:]*:\s*(AB|A|B|O)\s*([+\-])/i);
    if (m) { set.obs = "Tipo sanguíneo: " + m[1].toUpperCase() + m[2]; bloodKept++; }
    else   { set.obs = ""; }
    obsCleared++;
  }

  db.patients.update({ _id: p._id }, { $set: set });
  n++;
});

print("patients anonymized: " + n);
print("obs sanitized: " + obsCleared + " (blood type preserved: " + bloodKept + ")");
print("titularCPF that looked real, re-faked: " + titularFaked);

print("=== samples after ===");
db.patients.find({}, { name: 1, email: 1, phone: 1, RG: 1, streetAddress_1: 1, bairro: 1, city: 1, state: 1, zip: 1, recommendedBy: 1, obs: 1, CPF: 1 }).limit(3).forEach(function (p) { printjson(p); });
