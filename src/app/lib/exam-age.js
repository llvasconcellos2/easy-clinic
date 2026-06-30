// Shared (client + server) helper. Converts a date of birth + reference date
// into the patient's age expressed in WHOLE MONTHS, so reference-range rules
// (stored in months in the exam catalog) can be matched with simple math.
// Mirrors spec section 4.3: subtract years/months, then drop one month when
// the reference day-of-month is earlier than the birth day-of-month.
ageInMonths = function (dateOfBirth, referenceDate) {
  if (!dateOfBirth) {
    return null;
  }
  var dob = new Date(dateOfBirth);
  var ref = referenceDate ? new Date(referenceDate) : new Date();
  var months =
    (ref.getFullYear() - dob.getFullYear()) * 12 +
    (ref.getMonth() - dob.getMonth());
  if (ref.getDate() < dob.getDate()) {
    months -= 1;
  }
  return months < 0 ? 0 : months;
};
