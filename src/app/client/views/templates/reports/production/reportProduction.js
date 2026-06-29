// Clinical production report: a stacked bar of records issued per type per
// month (last 12 months), fed by the productionStats server method.

var PROD_PAL = { blue: "#1c84c6", teal: "#23c6c8", red: "#ed5565", yellow: "#f8ac59" };
var PROD_MONTHS = {
  "pt-BR": ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
};
function prodMonthLabel(y, m) {
  var arr = PROD_MONTHS[TAPi18n.getLanguage()] || PROD_MONTHS["pt-BR"];
  return arr[m] + "/" + String(y).slice(2);
}

Template.reportProduction.onCreated(function () {
  var self = this;
  this.stats = new ReactiveVar(null);
  Meteor.call("productionStats", function (err, res) { if (!err) self.stats.set(res); });
});

Template.reportProduction.helpers({
  totals: function () {
    var s = Template.instance().stats.get();
    return s ? s.totals : { form: 0, prescription: 0, exam_request: 0, medical_certificate: 0 };
  },
});

Template.reportProduction.onRendered(function () {
  var tpl = this;
  tpl.charts = {};
  var draw = function () {
    var s = tpl.stats.get();
    if (!s) return;
    var labels = s.byMonth.map(function (x) { return prodMonthLabel(x.y, x.m); });
    var ds = function (key, label, color) {
      return { label: label, backgroundColor: color, data: s.byMonth.map(function (x) { return x[key]; }) };
    };
    var el = document.getElementById("prod-month");
    if (!el) return;
    if (tpl.charts.prod) tpl.charts.prod.destroy();
    tpl.charts.prod = new Chart(el.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          ds("form", TAPi18n.__("dashboard_forms"), PROD_PAL.blue),
          ds("prescription", TAPi18n.__("dashboard_prescriptions"), PROD_PAL.teal),
          ds("exam_request", TAPi18n.__("dashboard_exam-requests"), PROD_PAL.red),
          ds("medical_certificate", TAPi18n.__("dashboard_certificates"), PROD_PAL.yellow),
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        legend: { position: "bottom" },
        tooltips: { mode: "index", intersect: false },
        scales: {
          xAxes: [{ stacked: true }],
          yAxes: [{ stacked: true, ticks: { beginAtZero: true } }],
        },
      },
    });
  };
  tpl.autorun(function () { tpl.stats.get(); TAPi18n.getLanguage(); Tracker.afterFlush(function () { Tracker.nonreactive(draw); }); });
});

Template.reportProduction.onDestroyed(function () {
  var tpl = this;
  if (tpl.charts) Object.keys(tpl.charts).forEach(function (k) { try { tpl.charts[k].destroy(); } catch (e) {} });
});
