// Server-side aggregation for the dashboard / reports. Computes summaries in
// memory (cheap at this data size) and returns small objects so we never ship
// thousands of appointment/record docs to the client just to draw a chart.

var MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function monthLabel(d) { return MONTHS_PT[d.getMonth()] + '/' + String(d.getFullYear()).slice(2); }

function ageFrom(dateOfBirth, now) {
  return Math.floor((now - new Date(dateOfBirth)) / (365.25 * 86400000));
}

Meteor.methods({
  dashboardStats: function () {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    var stats = {};
    stats.totals = {
      patients: Patients.find().count(),
      appointmentsMonth: Appointments.find({ status: 'completed', start: { $gte: monthStart } }).count(),
      recordsMonth: PatientRecords.find({ date: { $gte: monthStart } }).count(),
      prescriptions: PatientRecords.find({ recordType: 'prescription' }).count(),
    };

    // completed appointments per month, last 12 months
    var months = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: monthLabel(d), value: 0 });
    }
    var since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    Appointments.find({ status: 'completed', start: { $gte: since } }, { fields: { start: 1 } }).forEach(function (a) {
      var d = new Date(a.start);
      for (var j = 0; j < months.length; j++) {
        if (months[j].y === d.getFullYear() && months[j].m === d.getMonth()) { months[j].value++; break; }
      }
    });
    stats.apptsByMonth = months.map(function (x) { return { y: x.y, m: x.m, value: x.value }; });

    stats.recordsByType = {
      form: PatientRecords.find({ recordType: 'form' }).count(),
      prescription: PatientRecords.find({ recordType: 'prescription' }).count(),
      exam_request: PatientRecords.find({ recordType: 'exam_request' }).count(),
      medical_certificate: PatientRecords.find({ recordType: 'medical_certificate' }).count(),
    };

    // age groups + gender from patients
    var groups = [
      { label: '0-17', min: 0, max: 17, value: 0 },
      { label: '18-29', min: 18, max: 29, value: 0 },
      { label: '30-44', min: 30, max: 44, value: 0 },
      { label: '45-59', min: 45, max: 59, value: 0 },
      { label: '60+', min: 60, max: 200, value: 0 },
    ];
    var gender = { M: 0, F: 0 };
    Patients.find({}, { fields: { dateOfBirth: 1, gender: 1 } }).forEach(function (p) {
      if (p.gender === 'M') gender.M++; else if (p.gender === 'F') gender.F++;
      if (p.dateOfBirth) {
        var age = ageFrom(p.dateOfBirth, now);
        for (var g = 0; g < groups.length; g++) {
          if (age >= groups[g].min && age <= groups[g].max) { groups[g].value++; break; }
        }
      }
    });
    stats.ageGroups = groups.map(function (x) { return { label: x.label, value: x.value }; });
    stats.gender = gender;

    return stats;
  },

  // Clinical production: records issued per type per month (last 12 months).
  productionStats: function () {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    var now = new Date();
    var TYPES = ['form', 'prescription', 'exam_request', 'medical_certificate'];
    var months = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var row = { y: d.getFullYear(), m: d.getMonth(), label: monthLabel(d) };
      TYPES.forEach(function (t) { row[t] = 0; });
      months.push(row);
    }
    var since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    var totals = { form: 0, prescription: 0, exam_request: 0, medical_certificate: 0, all: 0 };
    PatientRecords.find({ date: { $gte: since } }, { fields: { date: 1, recordType: 1 } }).forEach(function (r) {
      var d = new Date(r.date);
      if (totals[r.recordType] == null) return;
      totals[r.recordType]++; totals.all++;
      for (var j = 0; j < months.length; j++) {
        if (months[j].y === d.getFullYear() && months[j].m === d.getMonth()) { months[j][r.recordType]++; break; }
      }
    });
    return {
      byMonth: months.map(function (x) {
        return { y: x.y, m: x.m, form: x.form, prescription: x.prescription, exam_request: x.exam_request, medical_certificate: x.medical_certificate };
      }),
      totals: totals,
    };
  },
});
