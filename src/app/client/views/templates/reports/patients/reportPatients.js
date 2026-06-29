// Patients demographic report: age-group + gender charts (server aggregation)
// plus a sortable/searchable patient table.

var REP_PAL = { blue: "#1c84c6", green: "#1ab394", pink: "#ec90c5" };

function ageFromDob(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
}

Template.reportPatients.onCreated(function () {
  var self = this;
  this.stats = new ReactiveVar(null);
  Meteor.call("dashboardStats", function (err, res) { if (!err) self.stats.set(res); });
});

Template.reportPatients.helpers({
  reactiveDataFunction: function () {
    return function () { return Patients.find().fetch(); };
  },
  optionsObject: function () {
    return {
      columns: [
        {
          title: T9n.get("name"), data: "name",
          render: function (cellData, t, row) {
            return '<a href="' + FlowRouter.path("patientEdit", { _id: row._id }) + '">' + (cellData || "") + "</a>";
          },
        },
        {
          title: TAPi18n.__("schemas.patients.gender.label"), data: "gender",
          render: function (cellData) {
            if (cellData === "M") return '<span class="label label-info">' + TAPi18n.__("schemas.patients.gender.M") + "</span>";
            if (cellData === "F") return '<span class="label" style="background:#ec90c5">' + TAPi18n.__("schemas.patients.gender.F") + "</span>";
            return "";
          },
        },
        {
          title: T9n.get("dateOfBirth"), data: "dateOfBirth",
          render: function (cellData) {
            var age = ageFromDob(cellData);
            return cellData ? moment(cellData).format("DD/MM/YYYY") + (age != null ? " (" + age + ")" : "") : "";
          },
        },
        { title: TAPi18n.__("schemas.patients.city.label"), data: "city", render: function (c) { return c || ""; } },
        { title: TAPi18n.__("schemas.patients.phone.label"), data: "phone", render: function (c) { return c || ""; } },
      ],
    };
  },
});

Template.reportPatients.onRendered(function () {
  var tpl = this;
  tpl.charts = {};
  var mk = function (id, cfg) {
    var el = document.getElementById(id);
    if (!el) return;
    if (tpl.charts[id]) tpl.charts[id].destroy();
    tpl.charts[id] = new Chart(el.getContext("2d"), cfg);
  };
  var draw = function () {
    var s = tpl.stats.get();
    if (!s) return;
    mk("rep-age", {
      type: "bar",
      data: { labels: s.ageGroups.map(function (x) { return x.label; }),
        datasets: [{ label: TAPi18n.__("dashboard_patients"), backgroundColor: REP_PAL.green, data: s.ageGroups.map(function (x) { return x.value; }) }] },
      options: { responsive: true, maintainAspectRatio: false, legend: { display: false }, scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
    });
    mk("rep-gender", {
      type: "doughnut",
      data: { labels: [TAPi18n.__("dashboard_male"), TAPi18n.__("dashboard_female")],
        datasets: [{ data: [s.gender.M, s.gender.F], backgroundColor: [REP_PAL.blue, REP_PAL.pink] }] },
      options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, cutoutPercentage: 60 },
    });
  };
  tpl.autorun(function () { tpl.stats.get(); TAPi18n.getLanguage(); Tracker.afterFlush(function () { Tracker.nonreactive(draw); }); });
});

Template.reportPatients.onDestroyed(function () {
  var tpl = this;
  if (tpl.charts) Object.keys(tpl.charts).forEach(function (k) { try { tpl.charts[k].destroy(); } catch (e) {} });
});
