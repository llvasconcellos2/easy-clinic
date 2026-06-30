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

// Parse a stored exam value into a number, tolerating pt-BR formatting:
// "1,1" -> 1.1, "215.000" (thousands) -> 215000, "1.5" -> 1.5, "190" -> 190.
function parseNum(str) {
  var s = String(str == null ? "" : str).trim();
  if (s === "") return null;
  if (s.indexOf(",") >= 0) {
    s = s.replace(/\./g, "").replace(",", "."); // comma decimal, dots = thousands
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // pure thousands grouping, e.g. 215.000
  }
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Numeric exams the patient has at least 2 readings for, most-recorded first,
// so the picker only offers exams that actually plot a trend.
function buildExamList(patientId) {
  var docs = PatientExams.find({ patientId: patientId }).fetch();
  var by = {};
  docs.forEach(function (d) {
    (d.results || []).forEach(function (r) {
      if (!r.examName || parseNum(r.value) == null) return;
      var e = by[r.examName] || (by[r.examName] = { name: r.examName, unit: r.unit || "", count: 0 });
      e.count++;
      if (r.unit) e.unit = r.unit;
    });
  });
  return Object.keys(by)
    .map(function (k) { return by[k]; })
    .filter(function (e) { return e.count >= 2; })
    .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
}

// Longitudinal series (oldest first) for one exam: numeric values, whether each
// was flagged altered, and the inline reference text shown when it was recorded.
function buildExamSeries(patientId, name) {
  var docs = PatientExams.find({ patientId: patientId }, { sort: { datePerformed: 1 } }).fetch();
  var out = { labels: [], values: [], altered: [], refs: [], unit: "" };
  docs.forEach(function (d) {
    (d.results || []).forEach(function (r) {
      if (r.examName !== name) return;
      var v = parseNum(r.value);
      if (v == null) return;
      out.labels.push(moment(d.datePerformed).format("DD/MM/YY"));
      out.values.push(v);
      out.altered.push(!!r.isAltered);
      out.refs.push(r.referenceUsed || "");
      if (r.unit) out.unit = r.unit;
    });
  });
  return out;
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

Template.patientEvolution.onCreated(function () {
  this.selectedExam = new ReactiveVar(null);
});

Template.patientEvolution.helpers({
  hasData: function () {
    var id = FlowRouter.getParam("_id");
    return (
      PatientRecords.find({ patientId: id, recordName: "Triagem e Sinais Vitais" }).count() > 0 ||
      PatientExams.find({ patientId: id }).count() > 0
    );
  },
  hasExams: function () {
    return buildExamList(FlowRouter.getParam("_id")).length > 0;
  },
  examOptions: function () {
    return buildExamList(FlowRouter.getParam("_id"));
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

    // --- exam-results chart (one exam at a time, picked from the dropdown) ---
    var el = document.getElementById("evo-exam");
    if (el) {
      var list = buildExamList(FlowRouter.getParam("_id"));
      var exName = tpl.selectedExam.get();
      if (list.length && (!exName || !_.findWhere(list, { name: exName }))) {
        exName = list[0].name;
      }
      tpl.$("#evo-exam-select").val(exName); // keep the select synced
      var es = exName ? buildExamSeries(FlowRouter.getParam("_id"), exName) : { labels: [], values: [], altered: [], refs: [], unit: "" };
      // colour each point by whether it was flagged altered (red) or normal (green)
      var pts = es.altered.map(function (a) { return a ? PALETTE.red : PALETTE.green; });
      if (tpl.charts["evo-exam"]) tpl.charts["evo-exam"].destroy();
      tpl.charts["evo-exam"] = new Chart(el.getContext("2d"), {
        type: "line",
        data: {
          labels: es.labels,
          datasets: [{
            label: exName ? exName + (es.unit ? " (" + es.unit + ")" : "") : "",
            data: es.values,
            borderColor: PALETTE.blue, backgroundColor: "rgba(28,132,198,0.06)",
            pointBackgroundColor: pts, pointBorderColor: pts,
            pointRadius: 4, pointHoverRadius: 6, borderWidth: 2, fill: true, spanGaps: true,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          legend: { display: false },
          tooltips: {
            callbacks: {
              label: function (item) { return es.unit ? item.yLabel + " " + es.unit : "" + item.yLabel; },
              afterLabel: function (item) {
                var parts = [];
                if (es.refs[item.index]) parts.push(TAPi18n.__("evolution_exam-reference") + ": " + es.refs[item.index]);
                if (es.altered[item.index]) parts.push("⚠ " + TAPi18n.__("evolution_exam-altered"));
                return parts;
              },
            },
          },
          elements: { line: { tension: 0.3 }, point: { hitRadius: 8 } },
          scales: { yAxes: [{ ticks: { beginAtZero: false } }] },
        },
      });
    }
  };

  tpl.draw = draw;
  // redraw when the records/exams data changes, the selected exam changes, or
  // the language changes (and the tab is visible)
  tpl.autorun(function () {
    PatientRecords.find({ patientId: FlowRouter.getParam("_id"), recordName: "Triagem e Sinais Vitais" }).count();
    PatientExams.find({ patientId: FlowRouter.getParam("_id") }).count();
    tpl.selectedExam.get();
    TAPi18n.getLanguage(); // redraw chart labels when the language changes
    Tracker.afterFlush(function () { Tracker.nonreactive(draw); });
  });
  // build/refresh charts when the user opens the tab (canvas becomes sized)
  $('a[href="#evolution-tab"]').on("shown.bs.tab", function () { Tracker.nonreactive(draw); });
});

Template.patientEvolution.events({
  "change #evo-exam-select": function (e, tpl) {
    tpl.selectedExam.set($(e.currentTarget).val());
  },
});

Template.patientEvolution.onDestroyed(function () {
  var tpl = this;
  if (tpl.charts) Object.keys(tpl.charts).forEach(function (k) { try { tpl.charts[k].destroy(); } catch (e) {} });
  $('a[href="#evolution-tab"]').off("shown.bs.tab");
});
