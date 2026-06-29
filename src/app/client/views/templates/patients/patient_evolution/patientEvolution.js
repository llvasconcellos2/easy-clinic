// Patient "Evolução" tab — turns the Triagem (vital-signs) records into a
// longitudinal view: computed IMC, weight, blood pressure and heart-rate trends
// rendered with Chart.js. Reads the already-subscribed PatientRecords.

var PALETTE = {
  blue: "#1c84c6", green: "#1ab394", teal: "#23c6c8",
  yellow: "#f8ac59", red: "#ed5565", muted: "#9aa4ac",
};

function fieldVal(rec, name) {
  for (var i = 0; i < rec.record.length; i++) {
    if (rec.record[i].name === name) {
      var v = parseFloat(String(rec.record[i].value).replace(",", "."));
      return isNaN(v) ? null : v;
    }
  }
  return null;
}

function imcClassify(imc) {
  if (imc == null) return { label: "—", cls: "default" };
  if (imc < 18.5) return { label: TAPi18n.__("evolution_imc-underweight"), cls: "info" };
  if (imc < 25) return { label: TAPi18n.__("evolution_imc-normal"), cls: "primary" };
  if (imc < 30) return { label: TAPi18n.__("evolution_imc-overweight"), cls: "warning" };
  if (imc < 35) return { label: TAPi18n.__("evolution_imc-obese-1"), cls: "warning" };
  if (imc < 40) return { label: TAPi18n.__("evolution_imc-obese-2"), cls: "danger" };
  return { label: TAPi18n.__("evolution_imc-obese-3"), cls: "danger" };
}

function paClassify(sys, dia) {
  if (sys == null || dia == null) return { label: "—", cls: "default" };
  if (sys < 120 && dia < 80) return { label: TAPi18n.__("evolution_pa-optimal"), cls: "primary" };
  if (sys < 140 && dia < 90) return { label: TAPi18n.__("evolution_pa-elevated"), cls: "warning" };
  return { label: TAPi18n.__("evolution_pa-high"), cls: "danger" };
}

// Build the longitudinal series from the patient's Triagem records (oldest first).
function buildSeries(patientId) {
  var recs = PatientRecords.find(
    { patientId: patientId, recordName: "Triagem e Sinais Vitais" },
    { sort: { date: 1 } }
  ).fetch();
  var s = { labels: [], imc: [], peso: [], altura: null, sys: [], dia: [], fc: [], spo2: [], n: recs.length, first: null, last: null };
  recs.forEach(function (r) {
    var peso = fieldVal(r, "peso");
    var alt = fieldVal(r, "altura");
    var imc = peso && alt ? Math.round((peso / Math.pow(alt / 100, 2)) * 10) / 10 : null;
    if (alt) s.altura = alt;
    s.labels.push(moment(r.date).format("DD/MM/YY"));
    s.peso.push(peso);
    s.imc.push(imc);
    s.sys.push(fieldVal(r, "pressao-sistolica"));
    s.dia.push(fieldVal(r, "pressao-diastolica"));
    s.fc.push(fieldVal(r, "frequencia-cardiaca"));
    s.spo2.push(fieldVal(r, "saturacao-oxigenio"));
  });
  if (recs.length) { s.first = recs[0].date; s.last = recs[recs.length - 1].date; }
  return s;
}

function last(arr) {
  for (var i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}
function firstVal(arr) {
  for (var i = 0; i < arr.length; i++) if (arr[i] != null) return arr[i];
  return null;
}
function delta(arr) {
  var f = firstVal(arr), l = last(arr);
  if (f == null || l == null) return null;
  return Math.round((l - f) * 10) / 10;
}

Template.patientEvolution.helpers({
  hasData: function () {
    return PatientRecords.find({ patientId: FlowRouter.getParam("_id"), recordName: "Triagem e Sinais Vitais" }).count() > 0;
  },
  summary: function () {
    var s = buildSeries(FlowRouter.getParam("_id"));
    var imc = last(s.imc), peso = last(s.peso), sys = last(s.sys), dia = last(s.dia), fc = last(s.fc);
    var imcC = imcClassify(imc), paC = paClassify(sys, dia);
    var dImc = delta(s.imc), dPeso = delta(s.peso);
    var fmtDelta = function (d, unit) {
      if (d == null || d === 0) return null;
      return (d > 0 ? "+" : "") + d;
    };
    var deltaCls = function (d, goodDown) {
      if (d == null || d === 0) return "text-muted";
      var down = d < 0;
      return (down === goodDown) ? "text-navy" : "text-danger";
    };
    return {
      imc: imc != null ? imc : "—",
      imcLabel: imcC.label, imcCls: imcC.cls,
      imcDelta: fmtDelta(dImc), imcDeltaCls: deltaCls(dImc, true), imcDeltaIcon: dImc < 0 ? "fa-arrow-down" : "fa-arrow-up",
      peso: peso != null ? peso : "—", altura: s.altura != null ? s.altura : "—",
      pesoDelta: fmtDelta(dPeso), pesoDeltaCls: deltaCls(dPeso, true), pesoDeltaIcon: dPeso < 0 ? "fa-arrow-down" : "fa-arrow-up",
      sys: sys != null ? sys : "—", dia: dia != null ? dia : "—", paLabel: paC.label, paCls: paC.cls,
      fc: fc != null ? fc : "—",
      count: s.n,
      span: s.first ? moment(s.first).format("MMM/YY") + " – " + moment(s.last).format("MMM/YY") : "",
    };
  },
});

Template.patientEvolution.onRendered(function () {
  var tpl = this;
  tpl.charts = {};

  var lineCfg = function (datasets) {
    return {
      type: "line",
      data: { labels: [], datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        legend: { display: datasets.length > 1, position: "bottom" },
        tooltips: { mode: "index", intersect: false },
        elements: { line: { tension: 0.3 }, point: { radius: 2, hitRadius: 8 } },
        scales: { yAxes: [{ ticks: { beginAtZero: false } }] },
      },
    };
  };
  var ds = function (label, color, fill) {
    return { label: label, borderColor: color, backgroundColor: fill || "transparent",
      pointBackgroundColor: color, borderWidth: 2, fill: !!fill, data: [], spanGaps: true };
  };

  var draw = function () {
    var pane = tpl.$(".evolution-pane");
    if (!pane.length || !pane.is(":visible")) return; // canvases must be visible to size
    var s = buildSeries(FlowRouter.getParam("_id"));

    var mk = function (id, cfg) {
      var el = document.getElementById(id);
      if (!el) return;
      if (tpl.charts[id]) tpl.charts[id].destroy();
      cfg.data.labels = s.labels;
      tpl.charts[id] = new Chart(el.getContext("2d"), cfg);
    };

    var imcCfg = lineCfg([ds(TAPi18n.__("evolution_imc"), PALETTE.blue, "rgba(28,132,198,0.08)")]);
    imcCfg.data.datasets[0].data = s.imc;
    mk("evo-imc", imcCfg);

    var pesoCfg = lineCfg([ds(TAPi18n.__("evolution_weight"), PALETTE.green, "rgba(26,179,148,0.08)")]);
    pesoCfg.data.datasets[0].data = s.peso;
    mk("evo-peso", pesoCfg);

    var sysDs = ds(TAPi18n.__("evolution_pa-systolic"), PALETTE.red);
    var diaDs = ds(TAPi18n.__("evolution_pa-diastolic"), PALETTE.yellow);
    sysDs.data = s.sys; diaDs.data = s.dia;
    mk("evo-pa", lineCfg([sysDs, diaDs]));

    var fcDs = ds(TAPi18n.__("evolution_heart-rate"), PALETTE.teal);
    var spo2Ds = ds("SpO₂ (%)", PALETTE.muted);
    fcDs.data = s.fc; spo2Ds.data = s.spo2;
    mk("evo-fc", lineCfg([fcDs, spo2Ds]));
  };

  tpl.draw = draw;
  // redraw when the records data changes (and the tab is visible)
  tpl.autorun(function () {
    PatientRecords.find({ patientId: FlowRouter.getParam("_id"), recordName: "Triagem e Sinais Vitais" }).count();
    TAPi18n.getLanguage(); // redraw chart labels when the language changes
    Tracker.afterFlush(function () { Tracker.nonreactive(draw); });
  });
  // build/refresh charts when the user opens the tab (canvas becomes sized)
  $('a[href="#evolution-tab"]').on("shown.bs.tab", function () { Tracker.nonreactive(draw); });
});

Template.patientEvolution.onDestroyed(function () {
  var tpl = this;
  if (tpl.charts) Object.keys(tpl.charts).forEach(function (k) { try { tpl.charts[k].destroy(); } catch (e) {} });
  $('a[href="#evolution-tab"]').off("shown.bs.tab");
});
