// Fill every patient's `obs` (observations) with a brief, fake clinical note in
// pt-BR, in the shorthand style a doctor would jot down. Notes are tailored to
// the patient's age band and gender. Overwrites any existing obs.
//
// Run AFTER 06-fix-ages.js (needs sane ages):
//   docker compose exec -T mongo mongo --quiet meteor < scripts/08-fill-obs.js

var YEAR_MS = 31557600000;
function ageOf(d) { return (d instanceof Date && !isNaN(d.getTime())) ? (Date.now() - d.getTime()) / YEAR_MS : 40; }

// Resolve gender, inferring from the first name (pt-BR ...a -> female) when the
// stored gender is missing, so grammatical agreement matches.
var EXC = { "luca": 1, "nicola": 1, "juca": 1, "noah": 1, "josue": 1 };
function isFemale(p) {
  if (p.gender === "F") return true;
  if (p.gender === "M") return false;
  var first = String(p.name || "").trim().toLowerCase().split(/\s+/)[0] || "";
  first = first.replace(/[^\x00-\x7f]/g, "");
  return /a$/.test(first) && !EXC[first];
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function maybe(p) { return Math.random() < p; }
function g(f, masc, fem) { return f ? fem : masc; }

var BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

var CHILD = [
  "Puericultura, sem intercorrências.",
  "Desenvolvimento neuropsicomotor adequado para a idade.",
  "Vacinação em dia.",
  "Crescimento e ganho de peso adequados.",
  "Quadro de IVAS de repetição.",
  "Em acompanhamento pediátrico de rotina."
];
var TEEN = [
  "Adolescente hígido(a), sem queixas.",
  "Acne leve em face, orientado cuidados.",
  "Avaliação de rotina, sem alterações.",
  "Orientado quanto a hábitos saudáveis e sono."
];
var ADULT = [
  "Sem comorbidades conhecidas.",
  "HAS em uso de losartana 50mg/dia.",
  "Dislipidemia, em uso de sinvastatina.",
  "DM2 em uso de metformina, controle regular.",
  "Hipotireoidismo, em uso de levotiroxina.",
  "Enxaqueca recorrente, em acompanhamento.",
  "Refluxo gastroesofágico, em uso de omeprazol.",
  "Ansiedade leve, em acompanhamento.",
  "Exames de rotina dentro da normalidade."
];
var SENIOR = [
  "HAS e DM2 em acompanhamento, em uso de medicação contínua.",
  "Hipertenso(a) de longa data, PA controlada.",
  "Osteoartrose de joelhos, dor mecânica.",
  "Dislipidemia e hipotireoidismo controlados.",
  "DPOC, ex-tabagista, em uso de broncodilatador.",
  "Osteoporose, em uso de cálcio e vitamina D.",
  "ICC classe funcional II, em acompanhamento cardiológico.",
  "Em uso de anti-hipertensivo e estatina."
];
var HABITS = [
  "Tabagista (1 maço/dia).",
  "Ex-tabagista.",
  "Etilista social.",
  "Nega tabagismo e etilismo.",
  "Pratica atividade física regularmente."
];
var FOLLOWUP = [
  "Retorno em 30 dias com exames.",
  "Solicitado hemograma e glicemia de jejum.",
  "Retorno em 3 meses para reavaliação.",
  "Orientado quanto à dieta e hábitos de vida.",
  "Aguardando resultado de exames."
];

function noteFor(a, f) {
  var parts = [];
  if (a < 13) {
    parts.push(pick(CHILD));
    if (maybe(0.4)) parts.push(g(f, "Nega alergias.", "Nega alergias."));
  } else if (a < 20) {
    parts.push(pick(TEEN));
    if (maybe(0.3)) parts.push(pick(HABITS));
  } else if (a < 60) {
    parts.push(pick(ADULT));
    if (maybe(0.6)) parts.push(pick(HABITS));
    if (f && a < 45 && maybe(0.35)) parts.push(pick(["G2P2A0.", "Cesárea prévia.", "Em uso de anticoncepcional oral.", "Gestante, IG 24 semanas.", "Preventivo em dia."]));
    if (maybe(0.4)) parts.push(pick(FOLLOWUP));
  } else {
    parts.push(pick(SENIOR));
    if (maybe(0.5)) parts.push(pick(HABITS));
    if (f && maybe(0.3)) parts.push(pick(["Menopausa aos 50 anos.", "Mamografia e preventivo em dia.", "Osteopenia em densitometria."]));
    if (maybe(0.5)) parts.push(pick(["Polifarmácia, orientado adesão ao tratamento.", "Retorno em 3 meses com exames.", "Acompanhamento multidisciplinar."]));
  }
  // Allergy note (gender agreement) and occasional blood type.
  if (maybe(0.35)) parts.push(pick([
    g(f, "Alérgico a dipirona.", "Alérgica a dipirona."),
    g(f, "Alérgico a penicilina.", "Alérgica a penicilina."),
    g(f, "Alérgico a AAS.", "Alérgica a AAS."),
    "Nega alergias medicamentosas."
  ]));
  if (maybe(0.5)) parts.push("Tipo sanguíneo: " + pick(BLOOD));
  return parts.join(" ");
}

var n = 0;
db.patients.find({}, { name: 1, gender: 1, dateOfBirth: 1 }).forEach(function (p) {
  var obs = noteFor(ageOf(p.dateOfBirth), isFemale(p));
  db.patients.update({ _id: p._id }, { $set: { obs: obs } });
  n++;
});
print("observations written: " + n);
print("samples:");
db.patients.find({}, { name: 1, gender: 1, obs: 1, _id: 0 }).limit(8).forEach(function (p) {
  print("  [" + p.gender + "] " + p.name + "  ->  " + p.obs);
});
