/*
 * methods.js — local client-side implementations of the Meteor server methods.
 * Registered into Meteor._methods by data-source.js; called via Meteor.call().
 */
(function (global) {
  "use strict";

  var MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  var MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  function monthLabel(d) {
    var lang = TAPi18n.getLanguage();
    var arr = lang === "en" ? MONTHS_EN : lang === "es" ? MONTHS_ES : MONTHS_PT;
    return arr[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
  }

  function ageFrom(dob, now) {
    return Math.floor((now - new Date(dob)) / (365.25 * 86400000));
  }

  Meteor._methods.dashboardStats = function () {
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var stats = {};

    stats.totals = {
      patients:           Patients.count(),
      appointmentsMonth:  Appointments.find({ status: "completed", start: { $gte: monthStart } }).count(),
      recordsMonth:       PatientRecords.find({ date: { $gte: monthStart } }).count(),
      prescriptions:      PatientRecords.find({ recordType: "prescription" }).count(),
    };

    var apptValue = ((Settings.findOne() || {}).appointmentValue) || 0;
    stats.billing = {
      value:        apptValue,
      appointments: stats.totals.appointmentsMonth,
      monthly:      apptValue * stats.totals.appointmentsMonth,
    };

    // appointments per month — last 12 months
    var months = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: monthLabel(d), value: 0 });
    }
    var since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    Appointments.find({ status: "completed", start: { $gte: since } }).forEach(function (a) {
      var ad = new Date(a.start);
      for (var j = 0; j < months.length; j++) {
        if (months[j].y === ad.getFullYear() && months[j].m === ad.getMonth()) { months[j].value++; break; }
      }
    });
    stats.apptsByMonth = months.map(function (x) { return { y: x.y, m: x.m, label: x.label, value: x.value }; });

    stats.recordsByType = {
      form:                PatientRecords.find({ recordType: "form" }).count(),
      prescription:        PatientRecords.find({ recordType: "prescription" }).count(),
      exam_request:        PatientRecords.find({ recordType: "exam_request" }).count(),
      medical_certificate: PatientRecords.find({ recordType: "medical_certificate" }).count(),
    };

    var groups = [
      { label: "0-17",  min: 0,  max: 17,  value: 0 },
      { label: "18-29", min: 18, max: 29,  value: 0 },
      { label: "30-44", min: 30, max: 44,  value: 0 },
      { label: "45-59", min: 45, max: 59,  value: 0 },
      { label: "60+",   min: 60, max: 200, value: 0 },
    ];
    var gender = { M: 0, F: 0 };
    Patients.find({}).forEach(function (p) {
      if (p.gender === "M") gender.M++; else if (p.gender === "F") gender.F++;
      if (p.dateOfBirth) {
        var age = ageFrom(p.dateOfBirth, now);
        for (var g = 0; g < groups.length; g++) {
          if (age >= groups[g].min && age <= groups[g].max) { groups[g].value++; break; }
        }
      }
    });
    stats.ageGroups = groups;
    stats.gender = gender;
    return stats;
  };

  Meteor._methods.productionStats = function () {
    var now = new Date();
    var TYPES = ["form", "prescription", "exam_request", "medical_certificate"];
    var months = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var row = { y: d.getFullYear(), m: d.getMonth(), label: monthLabel(d) };
      TYPES.forEach(function (t) { row[t] = 0; });
      months.push(row);
    }
    var since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    var totals = { form: 0, prescription: 0, exam_request: 0, medical_certificate: 0, all: 0 };
    PatientRecords.find({ date: { $gte: since } }).forEach(function (r) {
      if (totals[r.recordType] == null) return;
      totals[r.recordType]++; totals.all++;
      for (var j = 0; j < months.length; j++) {
        if (months[j].y === new Date(r.date).getFullYear() && months[j].m === new Date(r.date).getMonth()) {
          months[j][r.recordType]++; break;
        }
      }
    });
    var apptValue = ((Settings.findOne() || {}).appointmentValue) || 0;
    var mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var apptsMonth = Appointments.find({ status: "completed", start: { $gte: mStart } }).count();
    return {
      byMonth: months,
      totals: totals,
      billing: { value: apptValue, appointments: apptsMonth, monthly: apptValue * apptsMonth },
    };
  };

})(window);
