// Fill every patient that has no CPF with a randomly generated, VALID,
// unique Brazilian CPF, formatted as 000.000.000-00 (matching existing data).
//
// NOTE: run AFTER 01-dedupe-cpf.js. Also unset explicit-null CPFs first so the
// unique+sparse index can build (a sparse index still indexes fields that are
// present-but-null; it only skips MISSING fields):
//   db.patients.update({$or:[{CPF:null},{CPF:""}]}, {$unset:{CPF:""}}, {multi:true})
// This script targets CPF:null (which also matches missing) and fills all.
//
// Run:  docker compose exec -T mongo mongo --quiet meteor < scripts/02-fill-cpf.js

function checkDigit(digits, factorStart) {
  var sum = 0;
  for (var i = 0; i < digits.length; i++) sum += digits[i] * (factorStart - i);
  var r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}

function genCPF() {
  var base = [];
  for (var i = 0; i < 9; i++) base.push(Math.floor(Math.random() * 10));
  var d1 = checkDigit(base, 10);                 // factors 10..2 over 9 digits
  var d2 = checkDigit(base.concat([d1]), 11);    // factors 11..2 over 10 digits
  return base.concat([d1, d2]);
}

function allSame(d) { return d.every(function (x) { return x === d[0]; }); }

function format(d) {
  var s = d.join('');
  return s.substr(0, 3) + '.' + s.substr(3, 3) + '.' + s.substr(6, 3) + '-' + s.substr(9, 2);
}

var used = {};
db.patients.find({ CPF: { $ne: null } }, { CPF: 1 }).forEach(function (p) { used[p.CPF] = true; });
print("existing CPFs: " + Object.keys(used).length);

var targets = db.patients.find({ CPF: null }, { _id: 1 }).toArray();
print("patients needing a CPF: " + targets.length);

var filled = 0, regen = 0;
targets.forEach(function (t) {
  var digits, cpf, tries = 0;
  do {
    digits = genCPF();
    cpf = format(digits);
    tries++;
    if (tries > 1) regen++;
  } while ((allSame(digits) || used[cpf]) && tries < 1000);
  used[cpf] = true;
  db.patients.update({ _id: t._id }, { $set: { CPF: cpf } });
  filled++;
});

print("filled: " + filled + " (regenerations due to collisions/patterns: " + regen + ")");
print("patients with CPF now: " + db.patients.find({ CPF: { $ne: null } }).count());

var dups = db.patients.aggregate([
  { $match: { CPF: { $ne: null } } },
  { $group: { _id: "$CPF", n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("duplicate CPF groups: " + dups.length);
