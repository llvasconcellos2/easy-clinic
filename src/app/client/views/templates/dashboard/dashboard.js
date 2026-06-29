Template.dashboard.events({
  // Timeline options buttons

  "click #lightVersion": function (event) {
    event.preventDefault();
    $("#ibox-content").removeClass("ibox-content");
    $("#vertical-timeline").removeClass("dark-timeline");
    $("#vertical-timeline").addClass("light-timeline");
  },

  "click #darkVersion": function (event) {
    event.preventDefault();
    $("#ibox-content").addClass("ibox-content");
    $("#vertical-timeline").removeClass("light-timeline");
    $("#vertical-timeline").addClass("dark-timeline");
  },

  "click #leftVersion": function (event) {
    event.preventDefault();
    $("#vertical-timeline").toggleClass("center-orientation");
  },
});

Template.dashboard.onRendered(function () {
  $("input[type=checkbox]").iCheck({
    checkboxClass: "icheckbox_square-green",
  });
});

// ---- dashboard analytics (KPIs + Chart.js charts) ----
var DASH_PAL = {
  blue: "#1c84c6", green: "#1ab394", teal: "#23c6c8",
  yellow: "#f8ac59", red: "#ed5565", pink: "#ec90c5", muted: "#d1dade",
};
var DASH_MONTHS = {
  "pt-BR": ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
};
function dashMonthLabel(y, m) {
  var arr = DASH_MONTHS[TAPi18n.getLanguage()] || DASH_MONTHS["pt-BR"];
  return arr[m] + "/" + String(y).slice(2);
}
function dashFormatBRL(n) {
  var s = (Number(n) || 0).toFixed(2).split(".");
  return "R$ " + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1];
}

Template.dashboard.onCreated(function () {
  var self = this;
  this.stats = new ReactiveVar(null);
  Meteor.call("dashboardStats", function (err, res) {
    if (!err) self.stats.set(res);
  });
});

Template.dashboard.helpers({
  stats: function () {
    return Template.instance().stats.get();
  },
  billing: function () {
    var s = Template.instance().stats.get();
    var b = (s && s.billing) || { value: 0, appointments: 0, monthly: 0 };
    return { value: dashFormatBRL(b.value), appointments: b.appointments, monthly: dashFormatBRL(b.monthly) };
  },
});

Template.dashboard.onRendered(function () {
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

    mk("dash-appts", {
      type: "bar",
      data: {
        labels: s.apptsByMonth.map(function (x) { return dashMonthLabel(x.y, x.m); }),
        datasets: [{ label: TAPi18n.__("dashboard_appointments"), backgroundColor: DASH_PAL.blue, data: s.apptsByMonth.map(function (x) { return x.value; }) }],
      },
      options: { responsive: true, maintainAspectRatio: false, legend: { display: false },
        scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
    });

    var rt = s.recordsByType;
    mk("dash-records", {
      type: "doughnut",
      data: {
        labels: [TAPi18n.__("dashboard_forms"), TAPi18n.__("dashboard_prescriptions"), TAPi18n.__("dashboard_exam-requests"), TAPi18n.__("dashboard_certificates")],
        datasets: [{ data: [rt.form, rt.prescription, rt.exam_request, rt.medical_certificate],
          backgroundColor: [DASH_PAL.blue, DASH_PAL.teal, DASH_PAL.red, DASH_PAL.yellow] }],
      },
      options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, cutoutPercentage: 60 },
    });

    mk("dash-age", {
      type: "bar",
      data: {
        labels: s.ageGroups.map(function (x) { return x.label; }),
        datasets: [{ label: TAPi18n.__("dashboard_patients"), backgroundColor: DASH_PAL.green, data: s.ageGroups.map(function (x) { return x.value; }) }],
      },
      options: { responsive: true, maintainAspectRatio: false, legend: { display: false },
        scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
    });

    mk("dash-gender", {
      type: "doughnut",
      data: {
        labels: [TAPi18n.__("dashboard_male"), TAPi18n.__("dashboard_female")],
        datasets: [{ data: [s.gender.M, s.gender.F], backgroundColor: [DASH_PAL.blue, DASH_PAL.pink] }],
      },
      options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, cutoutPercentage: 60 },
    });
  };

  tpl.autorun(function () {
    tpl.stats.get();
    TAPi18n.getLanguage(); // redraw chart labels when the language changes
    Tracker.afterFlush(function () { Tracker.nonreactive(draw); });
  });
});

Template.dashboard.onDestroyed(function () {
  var tpl = this;
  if (tpl.charts) Object.keys(tpl.charts).forEach(function (k) { try { tpl.charts[k].destroy(); } catch (e) {} });
});

Template.dashboard.helpers({
  patientArrived: function (status) {
    return status == "waiting";
  },
  getTitle: function (title) {
    if (title == "to-confirm") {
      return TAPi18n.__("schedule_status-to-confirm");
    } else {
      return title;
    }
  },
  scheduleStatusBadge: function (status) {
    var map = {
      "to-confirm": {
        icon: "fa-hourglass-o",
        cls: "danger",
        key: "schedule_status-to-confirm",
      },
      waiting: {
        icon: "fa-calendar-check-o",
        cls: "warning",
        key: "schedule_status-waiting",
      },
      scheduled: {
        icon: "fa-clock-o",
        cls: "info",
        key: "schedule_status-scheduled",
      },
      attending: {
        icon: "fa-handshake-o",
        cls: "primary",
        key: "schedule_status-attending",
      },
      "no-show": {
        icon: "fa-user-times",
        cls: "default",
        key: "schedule_status-no-show",
      },
      finished: {
        icon: "fa-check-circle",
        cls: "success",
        key: "schedule_status-finished",
      },
    };
    var s = map[status];
    if (!s) {
      return "";
    }
    return Spacebars.SafeString(
      '<span class="label label-' +
        s.cls +
        ' hollow"><i class="fa ' +
        s.icon +
        '"></i> ' +
        TAPi18n.__(s.key) +
        "</span>",
    );
  },
  schedule: function () {
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var end = new Date();
    end.setHours(23, 59, 59, 999);
    return Schedule.find({
      resourceId: Meteor.userId(),
      start: {
        $gte: start,
        $lt: end,
      },
    }).fetch();
  },
  getTime: function (date) {
    return moment(date).format("HH:mm");
  },
  getHoursFromNow: function (start) {
    var now = moment();
    var duration = now.diff(start, "hours", true);
    if (duration > 0) {
      return Math.round(duration) + " " + TAPi18n.__("schedule_hours-ago");
    } else {
      return (
        Math.round(Math.abs(duration)) +
        " " +
        TAPi18n.__("schedule_hours-from-now")
      );
    }
  },
});
