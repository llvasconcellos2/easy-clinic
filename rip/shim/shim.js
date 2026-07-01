/*
 * rip/ shim — minimal stand-ins for the Meteor APIs the cloned templates use.
 * No Meteor, no DDP. Plain jQuery + Handlebars over local data.
 * This file grows as features are brought up; for now it stands up the app frame
 * (navigation / topNavbar / footer) for the dashboard.
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // md5 (compact, public-domain Joseph Myers implementation) — for Gravatar
  // ---------------------------------------------------------------------------
  var md5 = (function () {
    function safeAdd(x, y) { var lsw = (x & 0xffff) + (y & 0xffff); var msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xffff); }
    function bitRol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function cmn(q, a, b, x, s, t) { return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function coreMd5(x, len) {
      x[len >> 5] |= 0x80 << (len % 32); x[(((len + 64) >>> 9) << 4) + 14] = len;
      var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
      for (var i = 0; i < x.length; i += 16) {
        var oa = a, ob = b, oc = c, od = d;
        a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426); c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632); c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
        a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784); c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222); c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606); c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
      }
      return [a, b, c, d];
    }
    function binlMd5(str) { var n = str.length, x = []; for (var i = 0; i < n * 8; i += 8) x[i >> 5] |= (str.charCodeAt(i / 8) & 0xff) << (i % 32); return coreMd5(x, n * 8); }
    function rhex(n) { var s = "", j; for (j = 0; j < 4; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16); return s; }
    function utf8(str) { return unescape(encodeURIComponent(str)); }
    return function (str) { var b = binlMd5(utf8(str)); var out = ""; for (var i = 0; i < b.length; i++) out += rhex(b[i]); return out; };
  })();

  // ---------------------------------------------------------------------------
  // Fake current user (the seeded super-admin doctor) + auth/roles stubs
  // ---------------------------------------------------------------------------
  var currentUser = {
    _id: "doctor-leo",
    profile: { firstName: "Leonardo", lastName: "Lima de Vasconcellos", group: "medical_doctor", language: "pt-BR" },
    emails: [{ address: "leo.lima.web@gmail.com", verified: true }],
    roles: ["default", "medical_doctor", "super-admin"]
  };

  var Meteor = global.Meteor || (global.Meteor = {});
  Meteor.userId = function () { return currentUser._id; };
  Meteor.user = function () { return currentUser; };
  Meteor.Device = {
    isPhone:  function () { return window.innerWidth < 768; },
    isTablet: function () { var w = window.innerWidth; return w >= 768 && w < 1024; }
  };

  global.Roles = {
    userIsInRole: function (userId, roles) {
      var want = Array.isArray(roles) ? roles : String(roles).split(",");
      var have = currentUser.roles || [];
      return want.some(function (r) { return have.indexOf(String(r).trim()) >= 0; });
    }
  };

  global.Gravatar = {
    imageUrl: function (email, opts) {
      opts = opts || {};
      var hash = md5(String(email || "").trim().toLowerCase());
      var url = "https://secure.gravatar.com/avatar/" + hash + "?size=" + (opts.size || 50);
      if (opts.default) url += "&default=" + encodeURIComponent(opts.default);
      return url;
    }
  };

  // Images.link() shim — returns a relative path under data/images/
  // The Store collection is loaded by store.js; we patch each doc with .link() after Store loads.
  Store.onReady(function () {
    if (global.Images) {
      global.Images.find({}).forEach(function (img) {
        img.link = function () {
          return "data/images/" + img._id + "." + (img.extension || "jpg");
        };
      });
      // Patch findOne to always return a doc with .link()
      var _orig = global.Images.findOne.bind(global.Images);
      global.Images.findOne = function (sel, opts) {
        var doc = _orig(sel, opts);
        if (doc && !doc.link) {
          doc.link = function () {
            return "data/images/" + doc._id + "." + (doc.extension || "jpg");
          };
        }
        return doc;
      };
    }
  });

  // ---------------------------------------------------------------------------
  // i18n
  // ---------------------------------------------------------------------------
  var I18N = {};
  function t(key) {
    if (key == null) return "";
    return Object.prototype.hasOwnProperty.call(I18N, key) ? I18N[key] : key;
  }
  global.TAPi18n = {
    __: function (key) { return t(key); },
    getLanguage: function () { return "pt-BR"; },
    setLanguage: function () {}
  };

  // T9n stub (softwarerero:accounts-t9n field labels used in DataTables column headers)
  var T9N_PT = {
    name: "Nome", email: "Email", dateOfBirth: "Nasc.", phone: "Telefone",
    gender: "Sexo", address: "Endereço", cpf: "CPF",
    enabled: "Ativo", disabled: "Inativo",
  };
  global.T9n = { get: function (key) { return T9N_PT[key] || key; } };

  // Meteor.users shim — wraps the Users store collection
  Meteor.users = {
    find: function (sel, opts) { return Users.find(sel, opts); },
    findOne: function (sel, opts) { return Users.findOne(sel, opts); },
  };

  // ---------------------------------------------------------------------------
  // Routing (hash-based so it works as static files on a CDN)
  // ---------------------------------------------------------------------------
  var routePaths = {
    dashboard: "dashboard", schedule: "schedule",
    patientCreate: "patients/create", patientList: "patients", patientEdit: "patients",
    doctorList: "doctors", icd10List: "icd10", drugList: "drugs",
    reportAppointments: "reports/appointments", reportPatients: "reports/patients", reportProduction: "reports/production",
    settingsForm: "settings", specialtyList: "specialties", examCatalogList: "exam-catalog",
    documentModelList: "document-models", formModelsList: "form-models",
    users: "users", import: "import", logout: "logout"
  };
  function pathFor(route, hash) {
    hash = hash || {};
    var base = "#/" + (routePaths[route] || route || "");
    if (hash._id) base += "/" + hash._id;
    return base;
  }
  function currentPath() { return (global.location.hash || "#/dashboard").replace(/^#\/?/, ""); }

  // ---------------------------------------------------------------------------
  // Handlebars helpers
  // ---------------------------------------------------------------------------
  var H = global.Handlebars;
  H.registerHelper("_", function (key) { return t(key); });
  H.registerHelper("isInRole", function (csv) { return Roles.userIsInRole(currentUser._id, csv); });
  H.registerHelper("pathFor", function (a, b) {
    // {{pathFor 'logout'}} (positional) or {{pathFor route='x' _id=y}} (hash)
    var opts = (b === undefined) ? a : b;
    var hash = (opts && opts.hash) || {};
    var route = (typeof a === "string") ? a : hash.route;
    return pathFor(route, hash);
  });
  H.registerHelper("isActivePath", function (opts) {
    var hash = (opts && opts.hash) || {};
    var cls = hash.className || "active";
    try { return new RegExp(hash.regex || "").test(currentPath()) ? cls : ""; }
    catch (e) { return ""; }
  });
  H.registerHelper("eventsCount", function (events) { return (events && events.length) || 0; });
  H.registerHelper("langActive", function (lang) { return TAPi18n.getLanguage() === lang ? "active" : ""; });

  // ---------------------------------------------------------------------------
  // Spacebars -> Handlebars: wrap helper-with-args used as an {{#if}} condition
  //   {{#if isInRole 'x'}}  ->  {{#if (isInRole 'x')}}
  // Bare paths ({{#if currentUser}}, {{#if isReady}}) are left untouched.
  // ---------------------------------------------------------------------------
  var IF_HELPERS = ["isInRole", "isActivePath", "eq"];
  function preprocess(src) {
    return src.replace(/\{\{#if\s+([a-zA-Z_]\w*)\s+([^})]+?)\}\}/g, function (m, name, args) {
      return IF_HELPERS.indexOf(name) >= 0 ? "{{#if (" + name + " " + args + ")}}" : m;
    });
  }

  // ---------------------------------------------------------------------------
  // Render harness
  // ---------------------------------------------------------------------------
  var FRAME_PARTIALS = {
    navigation:  "templates/navigation.hbs",
    topNavbar:   "templates/topNavbar.hbs",
    footer:      "templates/footer.hbs",
    loading:     "templates/loading.hbs",
    pageHeading: "templates/pageHeading.hbs",
  };

  function fetchText(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " -> " + r.status); return r.text(); }); }

  function init() {
    var names = Object.keys(FRAME_PARTIALS);
    Promise.all([fetchText("data/i18n/pt-BR.json")].concat(names.map(function (n) { return fetchText(FRAME_PARTIALS[n]); })))
      .then(function (res) {
        I18N = JSON.parse(res[0]);
        names.forEach(function (n, i) { H.registerPartial(n, preprocess(res[i + 1])); });

        var layoutSrc = document.getElementById("tpl-mainLayout").innerHTML;
        var tpl = H.compile(preprocess(layoutSrc));
        var ctx = { currentUser: currentUser, isReady: true, events: [] };
        document.getElementById("app").innerHTML = tpl(ctx);
        onFrameRendered();
        // Now that #page-content exists in the DOM, boot the router.
        if (global.Router && global.Router.boot) global.Router.boot();
      })
      .catch(function (err) {
        console.error("[rip] init failed:", err);
        document.getElementById("app").innerHTML =
          "<div style='padding:40px;color:#a00;font-family:monospace'>rip init error: " +
          Handlebars.escapeExpression(err.message) + "</div>";
      });
  }

  function onFrameRendered() {
    var email = currentUser.emails[0].address;
    $("#mini-profile-img").attr("src", Gravatar.imageUrl(email, {
      secure: true, size: 50,
      default: "https://cdn4.iconfinder.com/data/icons/medical-14/512/9-128.png"
    }));
    if ($.fn.metisMenu) $("#side-menu").metisMenu();

    // Responsive: mirrors main.js Template.mainLayout.rendered resize handler
    function checkBodySmall() {
      if ($(window).width() < 769) {
        $("body").addClass("body-small");
      } else {
        $("body").removeClass("body-small");
      }
    }
    $(window).off("resize.ripSmall").on("resize.ripSmall", checkBodySmall);
    checkBodySmall();

    // Phone: fixed top-navbar (mirrors top-navbar.js rendered)
    if (Meteor.Device.isPhone()) {
      $("body").addClass("fixed-nav");
      $(".navbar-static-top").removeClass("navbar-static-top").addClass("navbar-fixed-top");
    }

    // #navbar-minimalize: full smooth show/hide logic (mirrors top-navbar.js events)
    $(document).off("click.ripMin").on("click.ripMin", "#navbar-minimalize", function (e) {
      e.preventDefault();
      $("body").toggleClass("mini-navbar");
      if (!$("body").hasClass("mini-navbar") || $("body").hasClass("body-small")) {
        $("#side-menu").hide();
        setTimeout(function () { $("#side-menu").fadeIn(400); }, 200);
      } else if ($("body").hasClass("fixed-sidebar")) {
        $("#side-menu").hide();
        setTimeout(function () { $("#side-menu").fadeIn(400); }, 100);
      } else {
        $("#side-menu").removeAttr("style");
      }
    });

    // .hide-on-phone: close sidebar after nav click on phone (mirrors navigation.js events)
    $(document).off("click.ripPhone").on("click.ripPhone", ".hide-on-phone", function () {
      if (Meteor.Device.isPhone()) {
        $("body").toggleClass("mini-navbar");
        $("#side-menu").hide();
        setTimeout(function () { $("#side-menu").fadeIn(400); }, 200);
      }
    });

    console.log("[rip] frame rendered for", currentUser.profile.firstName);
    global.preprocess = preprocess;
  }

  // ---------------------------------------------------------------------------
  // Per-page context builder (called by router.js before rendering a content tpl)
  // ---------------------------------------------------------------------------
  global._buildContext = function (routeName, params, query) {
    return {
      currentUser: currentUser,
      params: params,
      query: query,
    };
  };

  // ---------------------------------------------------------------------------
  // Post-render hook (called by router.js after innerHTML is set)
  // ---------------------------------------------------------------------------
  var DASH_PAL = {
    blue: "#1c84c6", green: "#1ab394", teal: "#23c6c8",
    yellow: "#f8ac59", red: "#ed5565", pink: "#ec90c5", money: "#18a689",
  };

  function dashFormatBRL(n) {
    var s = (Number(n) || 0).toFixed(2).split(".");
    return "R$ " + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1];
  }

  function scheduleStatusBadge(status) {
    var map = {
      "to-confirm": { icon: "fa-hourglass-o",    cls: "danger",  key: "schedule_status-to-confirm" },
      "waiting":    { icon: "fa-calendar-check-o",cls: "warning", key: "schedule_status-waiting" },
      "scheduled":  { icon: "fa-clock-o",         cls: "info",    key: "schedule_status-scheduled" },
      "attending":  { icon: "fa-handshake-o",      cls: "primary", key: "schedule_status-attending" },
      "no-show":    { icon: "fa-user-times",       cls: "default", key: "schedule_status-no-show" },
      "finished":   { icon: "fa-check-circle",     cls: "success", key: "schedule_status-finished" },
    };
    var s = map[status];
    if (!s) return "";
    return '<span class="label label-' + s.cls + ' hollow"><i class="fa ' + s.icon + '"></i> ' + t(s.key) + "</span>";
  }

  function renderDashboard() {
    // KPIs
    Meteor.call("dashboardStats", function (err, stats) {
      if (err || !stats) return;
      $("#kpi-patients").text(stats.totals.patients);
      $("#kpi-appointments").text(stats.totals.appointmentsMonth);
      $("#kpi-records").text(stats.totals.recordsMonth);
      $("#kpi-prescriptions").text(stats.totals.prescriptions);
      $("#kpi-billing").text(dashFormatBRL(stats.billing.monthly));
      $("#kpi-billing-sub").text(stats.billing.appointments + " " + t("reports_appointments-unit"));

      // today's schedule timeline
      var now = new Date();
      var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      var userId   = currentUser._id;
      var events   = Schedule.find({ resourceId: userId, start: { $gte: dayStart, $lt: dayEnd } },
                                    { sort: { start: 1 } }).fetch();
      var $tl = $("#schedule-timeline");
      if (events.length) {
        var html = "";
        events.forEach(function (ev) {
          var timeStr = moment(ev.start).format("HH:mm");
          var diff    = moment().diff(ev.start, "hours", true);
          var diffStr = diff > 0
            ? Math.round(diff) + " " + t("schedule_hours-ago")
            : Math.round(Math.abs(diff)) + " " + t("schedule_hours-from-now");
          var title = ev.title === "to-confirm" ? t("schedule_status-to-confirm") : (ev.title || "");
          var patLink = ev.patient
            ? '<a href="#/patients/' + ev.patient + '"><b>' + Handlebars.escapeExpression(title) + "</b></a>"
            : "<b>" + Handlebars.escapeExpression(title) + "</b>";
          var btn = ev.status === "waiting"
            ? '<a href="#/patients/' + ev.patient + '" class="btn btn-sm btn-primary iniciar-consulta-btn">' +
              '<i class="fa fa-play"></i>&nbsp;&nbsp;' + t("patients_start-appointment") + "</a>"
            : '<a href="#/patients/' + ev.patient + '" class="btn btn-sm btn-secondary iniciar-consulta-btn">' +
              '<i class="fa fa-folder-open-o"></i>&nbsp;&nbsp;' + t("patients_records") + "</a>";
          html +=
            '<div class="timeline-item"><div class="row">' +
            '<div class="col-xs-3 date"><i class="fa fa-clock-o"></i> ' + timeStr +
            '<br><small class="text-navy">' + Handlebars.escapeExpression(diffStr) + "</small></div>" +
            '<div class="col-xs-7 content no-top-border">' +
            '<p><div class="timeline-label">' + t("patients_patient") + ":</div>" + patLink + "</p>" +
            '<p class="m-b-xs"><div class="timeline-label">' + t("schedule_status") + ":</div>" +
            scheduleStatusBadge(ev.status) + "</p>" + btn + "</div></div></div>";
        });
        $tl.html(html);
      }

      // Charts
      if (typeof Chart === "undefined") return;
      var mk = function (id, cfg) {
        var el = document.getElementById(id);
        if (!el) return;
        new Chart(el.getContext("2d"), cfg);
      };

      mk("dash-appts", {
        type: "bar",
        data: {
          labels: stats.apptsByMonth.map(function (x) { return x.label; }),
          datasets: [{ label: t("dashboard_appointments"), backgroundColor: DASH_PAL.blue,
            data: stats.apptsByMonth.map(function (x) { return x.value; }) }],
        },
        options: { responsive: true, maintainAspectRatio: false, legend: { display: false },
          scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
      });

      var rt = stats.recordsByType;
      mk("dash-records", {
        type: "doughnut",
        data: {
          labels: [t("dashboard_forms"), t("dashboard_prescriptions"), t("dashboard_exam-requests"), t("dashboard_certificates")],
          datasets: [{ data: [rt.form, rt.prescription, rt.exam_request, rt.medical_certificate],
            backgroundColor: [DASH_PAL.blue, DASH_PAL.teal, DASH_PAL.red, DASH_PAL.yellow] }],
        },
        options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, cutoutPercentage: 60 },
      });

      mk("dash-age", {
        type: "bar",
        data: {
          labels: stats.ageGroups.map(function (x) { return x.label; }),
          datasets: [{ label: t("dashboard_patients"), backgroundColor: DASH_PAL.green,
            data: stats.ageGroups.map(function (x) { return x.value; }) }],
        },
        options: { responsive: true, maintainAspectRatio: false, legend: { display: false },
          scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
      });

      mk("dash-gender", {
        type: "doughnut",
        data: {
          labels: [t("dashboard_male"), t("dashboard_female")],
          datasets: [{ data: [stats.gender.M, stats.gender.F],
            backgroundColor: [DASH_PAL.blue, DASH_PAL.pink] }],
        },
        options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, cutoutPercentage: 60 },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Patient list — DataTables init (per-template classification: jQuery-plugin region)
  // ---------------------------------------------------------------------------
  var DT_LANG_URL = "data/datatables-pt-BR.json";
  var _dtLang = null;
  function getDtLang(cb) {
    if (_dtLang) { cb(_dtLang); return; }
    fetch(DT_LANG_URL).then(function (r) { return r.json(); }).then(function (lang) {
      _dtLang = lang; cb(lang);
    }).catch(function () { cb({}); });
  }

  function initPatientList() {
    getDtLang(function (lang) {
      var defaultAvatar = "images/default-user-image.png";
      var columns = [
        {
          title: "",
          data: "picture",
          orderable: false,
          render: function (cellData, type, row) {
            var url = defaultAvatar;
            if (cellData) {
              var img = Images.findOne({ _id: cellData });
              if (img) url = img.link();
            } else if (row.email) {
              url = Gravatar.imageUrl(row.email, { secure: true, size: 28, default: url });
            }
            return '<img class="profile-pic" src="' + url + '">';
          },
        },
        { title: T9n.get("name"),        data: "name" },
        {
          title: '<i class="fa fa-envelope"></i> Email',
          data: "email",
          render: function (d) { return d || ""; },
        },
        {
          title: T9n.get("dateOfBirth"),
          data: "dateOfBirth",
          render: function (d) { return d ? moment(d).format("DD/MM/YYYY") : ""; },
        },
        {
          data: "_id",
          orderable: false,
          render: function (id) {
            return '<a class="btn btn-info" href="' + FlowRouter.path("patientEdit", { _id: id }) + '">' +
              '<i class="fa fa-pencil" aria-hidden="true"></i></a>';
          },
        },
      ];

      var $table = $("#patients-table");
      if (!$table.length) return;

      // Destroy previous instance if re-entering the route
      if ($.fn.DataTable.isDataTable($table[0])) {
        $table.DataTable().destroy();
        $table.empty();
      }

      var dt = $table.DataTable({
        data: Patients.find().fetch(),
        columns: columns,
        language: lang,
        searchHighlight: true,
        dom: '<"html5buttons"B>lTfgitp',
        buttons: [
          { extend: "copy",  text: '<i class="fa fa-files-o"></i>' },
          { extend: "csv",   text: '<i class="fa fa-file-excel-o"></i>' },
          { extend: "print", text: '<i class="fa fa-print"></i>',
            customize: function (win) {
              $(win.document.body).addClass("white-bg").css("font-size", "10px");
              $(win.document.body).find("table").addClass("compact").css("font-size", "inherit");
            }
          },
        ],
        infoCallback: function (settings, start, end, max, total) {
          var str = (lang.sInfo || "")
            .replace("_START_", start).replace("_END_", end).replace("_TOTAL_", total);
          $("#table-footer").html(str);
        },
      });

      // Row click → navigate to patient edit
      $table.on("click", "tbody tr", function () {
        var row = dt.row(this).data();
        if (row) FlowRouter.go("patientEdit", { _id: row._id });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Generic DataTable factory (shared by drug/icd10/specialty/doctor lists)
  // ---------------------------------------------------------------------------
  function initDT(tableId, data, columns, onRowClick) {
    getDtLang(function (lang) {
      var $table = $("#" + tableId);
      if (!$table.length) return;
      if ($.fn.DataTable.isDataTable($table[0])) { $table.DataTable().destroy(); $table.empty(); }
      var dt = $table.DataTable({
        data: data,
        columns: columns,
        language: lang,
        searchHighlight: true,
        dom: '<"html5buttons"B>lTfgitp',
        buttons: [
          { extend: "copy",  text: '<i class="fa fa-files-o"></i>' },
          { extend: "csv",   text: '<i class="fa fa-file-excel-o"></i>' },
          { extend: "print", text: '<i class="fa fa-print"></i>',
            customize: function (win) {
              $(win.document.body).addClass("white-bg").css("font-size", "10px");
              $(win.document.body).find("table").addClass("compact").css("font-size", "inherit");
            }
          },
        ],
        infoCallback: function (s, start, end, max, total) {
          var str = (lang.sInfo || "")
            .replace("_START_", start).replace("_END_", end).replace("_TOTAL_", total);
          $("#table-footer").html(str);
        },
      });
      if (onRowClick) {
        $table.on("click", "tbody tr", function () {
          var row = dt.row(this).data();
          if (row) onRowClick(row);
        });
      }
    });
  }

  function initDrugList() {
    $("#btn-new-drug").off("click.ripNew").on("click.ripNew", function () { FlowRouter.go("drugCreate"); });
    initDT("drugs-table",
      Drugs.find().fetch(),
      [
        { title: T9n.get("name"), data: "name" },
        { title: "Busca",         data: "search", defaultContent: "" },
        { data: "_id", orderable: false,
          render: function (id) {
            return '<a class="btn btn-info" href="#/drugs/' + id + '">' +
              '<i class="fa fa-pencil"></i></a>';
          }
        },
      ],
      function (row) { FlowRouter.go("drugEdit", { _id: row._id }); }
    );
  }

  function initIcd10List() {
    initDT("icd10-table",
      ICD10.find().fetch(),
      [{ title: T9n.get("name"), data: "icd" }]
    );
  }

  function initSpecialtyList() {
    $("#btn-new-specialty").off("click.ripNew").on("click.ripNew", function () { FlowRouter.go("specialtyCreate"); });
    initDT("specialties-table",
      Specialties.find().fetch(),
      [
        { title: T9n.get("name"), data: "name" },
        { data: "_id", orderable: false,
          render: function (id) {
            return '<a class="btn btn-info" href="' + FlowRouter.path("specialtyEdit", { _id: id }) + '">' +
              '<i class="fa fa-pencil"></i></a>';
          }
        },
      ],
      function (row) { FlowRouter.go("specialtyEdit", { _id: row._id }); }
    );
  }

  function initDoctorList() {
    var doctors = Meteor.users.find({ "profile.group": "medical_doctor" }).fetch();
    var defaultAvatar = "images/default-user-image.png";
    initDT("doctors-table", doctors,
      [
        {
          title: "", data: "profile.picture", orderable: false,
          render: function (cellData, type, row) {
            var url = defaultAvatar;
            if (cellData) {
              var img = Images.findOne({ _id: cellData });
              if (img) url = img.link();
            } else {
              var email = row.emails && row.emails[0] && row.emails[0].address;
              if (email) url = Gravatar.imageUrl(email, { secure: true, size: 28, default: url });
            }
            return '<img class="profile-pic" src="' + url + '">';
          },
        },
        {
          title: T9n.get("name"), data: "profile.firstName",
          render: function (d, t, row) {
            return (row.profile.firstName || "") + " " + (row.profile.lastName || "");
          },
        },
        {
          title: '<i class="fa fa-envelope"></i> Email',
          data: "emails",
          render: function (d, t, row) {
            return row.emails && row.emails[0] ? row.emails[0].address : "";
          },
        },
        {
          title: T9n.get("enabled"), data: "isUserEnabled", orderable: false,
          render: function (d, t, row) {
            var on = row.isUserEnabled;
            return '<span class="label label-' + (on ? "primary" : "danger") + '">' +
              T9n.get(on ? "enabled" : "disabled") + "</span>";
          },
        },
        {
          data: "_id", orderable: false,
          render: function (id) {
            return '<a class="btn btn-info" href="' + FlowRouter.path("doctorEdit", { _id: id }) + '">' +
              '<i class="fa fa-pencil"></i></a>';
          },
        },
      ],
      function (row) { FlowRouter.go("doctorEdit", { _id: row._id }); }
    );
  }

  // ---------------------------------------------------------------------------
  // Patient form — create (id=null) and edit (id=string) modes
  // ---------------------------------------------------------------------------
  function initPatientForm(patientId) {
    var patient = patientId ? Patients.findOne({ _id: patientId }) : null;
    var $form = $("#insertPatientForm");
    if (!$form.length) return;

    // Show/hide edit-only UI elements
    if (patient) {
      $(".tab-records-nav, .tab-evolution-nav").show();
      $("#btn-start-appointment").show();
      // Pre-fill patient photo
      if (patient.picture) {
        var img = Images.findOne({ _id: patient.picture });
        if (img) $("#patient-pic-img").attr("src", img.link());
        $("#patient-picture-id").val(patient.picture);
      } else if (patient.email) {
        $("#patient-pic-img").attr("src", Gravatar.imageUrl(patient.email, { secure: true, size: 200, default: "images/default-user-image.png" }));
      }

      // Fill text/email inputs
      var textFields = ["name","records","placeOfBirth","CPF","RG","titularCPF",
                        "fathersName","mothersName","occupation","recommendedBy","email","phone","mobile",
                        "zip","streetAddress_1","streetAddress_2","bairro","city","state","obs"];
      textFields.forEach(function (f) {
        var val = patient[f];
        if (val != null) $form.find("[name='" + f + "']").val(val);
      });

      // Date fields
      if (patient.dateOfBirth) $form.find("[name='dateOfBirth']").val(moment(patient.dateOfBirth).format("DD/MM/YYYY"));
      if (patient.returnDate)  $form.find("[name='returnDate']").val(moment(patient.returnDate).format("DD/MM/YYYY"));

      // Selects
      ["gender","maritalStatus","skinColor","literacy"].forEach(function (f) {
        if (patient[f] != null) $form.find("[name='" + f + "']").val(patient[f]);
      });
    }

    // File-upload preview (client-side only — no ostrio:files in static build)
    $("#patient-pic-file").off("change.ripPic").on("change.ripPic", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) { $("#patient-pic-img").attr("src", e.target.result); };
      reader.readAsDataURL(file);
    });

    // "New patient" button
    $(".new-record").off("click.ripNew").on("click.ripNew", function () {
      FlowRouter.go("patientCreate");
    });

    // Form submit
    $form.off("submit.ripPat").on("submit.ripPat", function (e) {
      e.preventDefault();
      var data = {};
      $form.serializeArray().forEach(function (f) { if (f.value) data[f.name] = f.value; });

      // Validate required fields
      var valid = true;
      $form.find("[required]").each(function () {
        if (!$(this).val()) { $(this).closest(".form-group").addClass("has-error"); valid = false; }
        else $(this).closest(".form-group").removeClass("has-error");
      });
      if (!valid) {
        if (global.toastr) toastr.error(t("common_field-required"), t("common_error"));
        return;
      }

      // Parse dates back to Date objects for Store
      if (data.dateOfBirth) { var d = moment(data.dateOfBirth, "DD/MM/YYYY"); if (d.isValid()) data.dateOfBirth = d.toDate(); else delete data.dateOfBirth; }
      if (data.returnDate)  { var r = moment(data.returnDate,  "DD/MM/YYYY"); if (r.isValid()) data.returnDate  = r.toDate(); else delete data.returnDate; }

      if (patient) {
        Patients.update(patient._id, { $set: data });
      } else {
        var newId = Patients.insert(data);
        FlowRouter.go("patientEdit", { _id: newId });
      }
      if (global.toastr) toastr.success(t("common_save-success"), t("common_success"));
    });

    // Populate records + evolution tabs for existing patients
    if (patientId) {
      initRecordsTab(patientId);
      initEvolutionTab(patientId);
    }
  }

  // ---------------------------------------------------------------------------
  // Settings form
  // ---------------------------------------------------------------------------
  function initSettingsForm() {
    var s = Settings.findOne({}) || {};
    var $form = $("#settingsForm");
    if (!$form.length) return;
    if (s.address)          $form.find("[name=address]").val(s.address);
    if (s.workHoursStart)   $form.find("[name=workHoursStart]").val(s.workHoursStart);
    if (s.workHoursEnd)     $form.find("[name=workHoursEnd]").val(s.workHoursEnd);
    if (s.slotDuration)     $form.find("[name=slotDuration]").val(s.slotDuration);
    if (s.appointmentValue) $form.find("[name=appointmentValue]").val(s.appointmentValue);
    if (s.notifications)    $form.find("[name=notifications]").val(s.notifications);

    $form.off("submit.ripSettings").on("submit.ripSettings", function (e) {
      e.preventDefault();
      var data = {};
      $form.serializeArray().forEach(function (f) { if (f.value !== "") data[f.name] = f.value; });
      if (data.slotDuration)     data.slotDuration     = Number(data.slotDuration);
      if (data.appointmentValue) data.appointmentValue = Number(data.appointmentValue);
      if (s._id) Settings.update(s._id, { $set: data });
      else       s._id = Settings.insert(data);
      if (global.toastr) toastr.success(t("common_save-success"), t("common_success"));
    });

    // Persistence panel
    var P = global.Persistence;
    var $ps = $("#persist-status");
    var $pa = $("#persist-actions");
    if ($ps.length && P) {
      if (P.active) {
        $ps.html(
          '<div class="alert alert-success" style="margin-bottom:0">' +
          '<i class="fa fa-database"></i> ' +
          '<strong>Modo persistente ativo.</strong> ' +
          'Suas alterações são salvas no IndexedDB do navegador e sobrevivem ao reload.' +
          '</div>'
        );
        $pa.html(
          '<button type="button" class="btn btn-warning btn-sm m-r-sm" id="persist-reset-btn">' +
          '<i class="fa fa-refresh"></i> Restaurar dados originais (fixtures)' +
          '</button>' +
          '<button type="button" class="btn btn-default btn-sm" id="persist-disable-btn">' +
          '<i class="fa fa-power-off"></i> Desativar modo persistente' +
          '</button>'
        );
        $("#persist-reset-btn").on("click", function () {
          swal({
            title: "Restaurar dados originais?",
            text: "Isso apagará todas as alterações salvas e recarregará os dados iniciais.",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ed5565",
            confirmButtonText: "Sim, restaurar",
            cancelButtonText: "Cancelar"
          }, function (confirmed) {
            if (confirmed) P.reset();
          });
        });
        $("#persist-disable-btn").on("click", function () {
          P.disable();
        });
      } else {
        $ps.html(
          '<div class="alert alert-info" style="margin-bottom:0">' +
          '<i class="fa fa-info-circle"></i> ' +
          '<strong>Modo demo (em memória).</strong> ' +
          'Alterações são perdidas ao recarregar a página.' +
          '</div>'
        );
        $pa.html(
          '<button type="button" class="btn btn-primary btn-sm" id="persist-enable-btn">' +
          '<i class="fa fa-database"></i> Ativar modo persistente (IndexedDB)' +
          '</button>'
        );
        $("#persist-enable-btn").on("click", function () {
          P.enable();
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Report pages
  // ---------------------------------------------------------------------------
  var REPORT_PAL = {
    blue: "#1c84c6", green: "#1ab394", teal: "#23c6c8",
    yellow: "#f8ac59", red: "#ed5565", pink: "#ec90c5",
  };

  function mkChart(id, cfg) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el._chartInstance) { el._chartInstance.destroy(); }
    el._chartInstance = new Chart(el.getContext("2d"), cfg);
  }

  function initReportAppointments() {
    getDtLang(function (lang) {
      var data = Appointments.find({}, { sort: { start: -1 } }).fetch();
      initDT("report-appts-table", data,
        [
          {
            title: T9n.get("name"), data: "patient",
            render: function (pid) {
              var p = Patients.findOne({ _id: pid });
              return p ? Handlebars.escapeExpression(p.name) : (pid || "");
            }
          },
          {
            title: t("schedule_status"), data: "status",
            render: function (s) { return scheduleStatusBadge(s); }
          },
          {
            title: "Data", data: "start",
            render: function (d) { return d ? moment(d).format("DD/MM/YYYY HH:mm") : ""; }
          },
          {
            title: t("users_doctors"), data: "resourceId",
            render: function (rid) {
              var doc = Meteor.users.findOne({ _id: rid });
              return doc ? Handlebars.escapeExpression((doc.profile.firstName || "") + " " + (doc.profile.lastName || "")) : "";
            }
          },
        ]
      );
    });
  }

  function initReportPatients() {
    Meteor.call("dashboardStats", function (err, stats) {
      if (err || !stats) return;
      mkChart("rep-age", {
        type: "bar",
        data: {
          labels: stats.ageGroups.map(function (x) { return x.label; }),
          datasets: [{ label: t("reports_patients"), backgroundColor: REPORT_PAL.green,
            data: stats.ageGroups.map(function (x) { return x.value; }) }],
        },
        options: { responsive: true, maintainAspectRatio: false, legend: { display: false },
          scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
      });
      mkChart("rep-gender", {
        type: "doughnut",
        data: {
          labels: [t("dashboard_male"), t("dashboard_female")],
          datasets: [{ data: [stats.gender.M, stats.gender.F],
            backgroundColor: [REPORT_PAL.blue, REPORT_PAL.pink] }],
        },
        options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, cutoutPercentage: 60 },
      });
    });
    getDtLang(function (lang) {
      var defaultAvatar = "images/default-user-image.png";
      initDT("report-patients-table",
        Patients.find({}, { sort: { name: 1 } }).fetch(),
        [
          { title: T9n.get("name"), data: "name" },
          { title: T9n.get("dateOfBirth"), data: "dateOfBirth",
            render: function (d) { return d ? moment(d).format("DD/MM/YYYY") : ""; } },
          { title: T9n.get("gender"), data: "gender",
            render: function (g) { return g === "M" ? "Masculino" : g === "F" ? "Feminino" : ""; } },
          { title: T9n.get("phone"), data: "phone", defaultContent: "" },
          { title: "Email", data: "email", defaultContent: "" },
        ]
      );
    });
  }

  function initReportProduction() {
    Meteor.call("productionStats", function (err, stats) {
      if (err || !stats) return;
      $("#prod-billing-value").text(dashFormatBRL(stats.billing.monthly));
      $("#prod-billing-sub").text(stats.billing.appointments + " " + t("reports_appointments-unit") + " × R$ " + stats.billing.value);
      $("#prod-total-form").text(stats.totals.form);
      $("#prod-total-prescription").text(stats.totals.prescription);
      $("#prod-total-exam").text(stats.totals.exam_request);
      $("#prod-total-cert").text(stats.totals.medical_certificate);

      var labels   = stats.byMonth.map(function (m) { return m.label; });
      mkChart("prod-month", {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            { label: t("dashboard_forms"),         backgroundColor: REPORT_PAL.blue,
              data: stats.byMonth.map(function (m) { return m.form; }) },
            { label: t("dashboard_prescriptions"), backgroundColor: REPORT_PAL.teal,
              data: stats.byMonth.map(function (m) { return m.prescription; }) },
            { label: t("dashboard_exam-requests"), backgroundColor: REPORT_PAL.red,
              data: stats.byMonth.map(function (m) { return m.exam_request; }) },
            { label: t("dashboard_certificates"),  backgroundColor: REPORT_PAL.yellow,
              data: stats.byMonth.map(function (m) { return m.medical_certificate; }) },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false,
          scales: { xAxes: [{ stacked: true }], yAxes: [{ stacked: true, ticks: { beginAtZero: true } }] },
          legend: { position: "bottom" } },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Exam catalog, document models, form models — DataTables list pages
  // ---------------------------------------------------------------------------
  function initExamCatalogList() {
    $("#btn-new-exam").off("click.ripNew").on("click.ripNew", function () { FlowRouter.go("examCatalogCreate"); });
    initDT("exam-catalog-table",
      ExamCatalog.find({}, { sort: { name: 1 } }).fetch(),
      [
        { title: t("exam-catalog_name"),          data: "name" },
        { title: t("exam-catalog_unit"),          data: "unit",       defaultContent: "" },
        { title: t("exam-catalog_usage-count"),   data: "usageCount", defaultContent: "0" },
        {
          data: "_id", orderable: false,
          render: function (id) {
            return '<a class="btn btn-info btn-xs" href="#/exam-catalog/' + id + '">' +
              '<i class="fa fa-pencil"></i></a>';
          }
        },
      ]
    );
  }

  function initDocumentModelList() {
    $("#btn-new-docmodel").off("click.ripNew").on("click.ripNew", function () { FlowRouter.go("documentModelCreate"); });
    var typeLabels = { form: t("patients_records"), prescription: t("dashboard_prescriptions"),
      exam_request: t("dashboard_exam-requests"), medical_certificate: t("dashboard_certificates") };
    initDT("document-models-table",
      DocumentModels.find({}, { sort: { name: 1 } }).fetch(),
      [
        { title: t("exam-catalog_name"),          data: "name" },
        { title: t("document-models_type"),       data: "type",
          render: function (d) { return typeLabels[d] || d || ""; } },
        { title: t("form-models_description"),    data: "description", defaultContent: "" },
        {
          data: "_id", orderable: false,
          render: function (id) {
            return '<a class="btn btn-info btn-xs" href="#/document-models/' + id + '">' +
              '<i class="fa fa-pencil"></i></a>';
          }
        },
      ]
    );
  }

  function initFormModelsList() {
    $("#btn-new-formmodel").off("click.ripNew").on("click.ripNew", function () { FlowRouter.go("formModelsCreate"); });
    initDT("form-models-table",
      FormModels.find({}, { sort: { name: 1 } }).fetch(),
      [
        { title: t("form-models_name"),        data: "name" },
        { title: t("form-models_description"), data: "description", defaultContent: "" },
        {
          data: "_id", orderable: false,
          render: function (id) {
            return '<a class="btn btn-info btn-xs" href="#/form-models/' + id + '">' +
              '<i class="fa fa-pencil"></i></a>';
          }
        },
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // Specialty form — create (id=null) and edit (id=string)
  // ---------------------------------------------------------------------------
  function initSpecialtyForm(id) {
    var specialty = id ? Specialties.findOne({ _id: id }) : null;
    $("#btn-new-specialty").off("click.rip").on("click.rip", function () { FlowRouter.go("specialtyCreate"); });
    if (specialty) {
      $("#specialty-name").val(specialty.name);
      $("#specialty-delete-btn").show().off("click.rip").on("click.rip", function () {
        swal({ title: t("common_areYouSure"), text: specialty.name, type: "warning",
          showCancelButton: true, confirmButtonColor: "#ed5565", confirmButtonText: t("common_confirm")
        }, function () {
          Specialties.remove(specialty._id);
          toastr.success(t("common_deleteSuccess"), t("common_success"));
          FlowRouter.go("specialtyList");
        });
      });
    }
    $("#specialtyForm").off("submit.rip").on("submit.rip", function (e) {
      e.preventDefault();
      var name = $("#specialty-name").val().trim();
      if (!name) { $("#fg-name").addClass("has-error"); return; }
      $("#fg-name").removeClass("has-error");
      if (specialty) { Specialties.update(specialty._id, { $set: { name: name } }); }
      else            { Specialties.insert({ name: name }); }
      toastr.success(t("common_save-success"), t("common_success"));
      FlowRouter.go("specialtyList");
    });
  }

  // ---------------------------------------------------------------------------
  // Exam catalog form
  // ---------------------------------------------------------------------------
  function initExamCatalogForm(id) {
    var ec = id ? ExamCatalog.findOne({ _id: id }) : null;
    var ruleCount = 0;

    function buildRuleRow(data) {
      var idx = ruleCount++;
      var tplEl = document.getElementById("rule-row-tpl");
      if (!tplEl) return $();
      var html = tplEl.innerHTML.replace(/__IDX__/g, idx);
      var $row = $(html);
      if (data) {
        $row.find("[name=gender]").val(data.gender || "todos");
        if (data.ageMin != null) $row.find("[name=ageMin]").val(data.ageMin);
        if (data.ageMax != null) $row.find("[name=ageMax]").val(data.ageMax);
        if (data.min  != null) $row.find("[name=min]").val(data.min);
        if (data.max  != null) $row.find("[name=max]").val(data.max);
        if (data.displayText) $row.find("[name=displayText]").val(data.displayText);
      }
      $row.find(".remove-rule-btn").off("click").on("click", function () { $row.remove(); });
      return $row;
    }

    $("#btn-new-exam-catalog").off("click.rip").on("click.rip", function () { FlowRouter.go("examCatalogCreate"); });
    $("#add-rule-btn").off("click.rip").on("click.rip", function () {
      $("#reference-rules-list").append(buildRuleRow(null));
    });

    if (ec) {
      $("#ec-name").val(ec.name);
      if (ec.unit) $("#ec-unit").val(ec.unit);
      (ec.referenceRules || []).forEach(function (rule) {
        $("#reference-rules-list").append(buildRuleRow(rule));
      });
      $("#ec-delete-btn").show().off("click.rip").on("click.rip", function () {
        swal({ title: t("common_areYouSure"), text: ec.name, type: "warning",
          showCancelButton: true, confirmButtonColor: "#ed5565", confirmButtonText: t("common_confirm")
        }, function () {
          ExamCatalog.remove(ec._id);
          toastr.success(t("common_deleteSuccess"), t("common_success"));
          FlowRouter.go("examCatalogList");
        });
      });
    }

    $("#examCatalogForm").off("submit.rip").on("submit.rip", function (e) {
      e.preventDefault();
      var name = $("#ec-name").val().trim();
      if (!name) return;
      var rules = [];
      $("#reference-rules-list .rule-row").each(function () {
        var $r = $(this);
        var rule = { gender: $r.find("[name=gender]").val() || "todos" };
        var ageMin = parseFloat($r.find("[name=ageMin]").val());
        var ageMax = parseFloat($r.find("[name=ageMax]").val());
        var min    = parseFloat($r.find("[name=min]").val());
        var max    = parseFloat($r.find("[name=max]").val());
        var dt     = $r.find("[name=displayText]").val();
        if (!isNaN(ageMin)) rule.ageMin = ageMin;
        if (!isNaN(ageMax)) rule.ageMax = ageMax;
        if (!isNaN(min))    rule.min    = min;
        if (!isNaN(max))    rule.max    = max;
        if (dt)             rule.displayText = dt;
        rules.push(rule);
      });
      var doc = { name: name };
      if ($("#ec-unit").val()) doc.unit = $("#ec-unit").val();
      if (rules.length) doc.referenceRules = rules;
      if (ec) { ExamCatalog.update(ec._id, { $set: doc }); }
      else    { doc.usageCount = 0; doc.createdAt = new Date(); ExamCatalog.insert(doc); }
      toastr.success(t("common_save-success"), t("common_success"));
      FlowRouter.go("examCatalogList");
    });
  }

  // ---------------------------------------------------------------------------
  // Drug form (Summernote for html field)
  // ---------------------------------------------------------------------------
  function initDrugForm(id) {
    var drug = id ? Drugs.findOne({ _id: id }) : null;
    var $html = $("textarea[name=html]");

    if (drug) {
      $("#drug-name").val(drug.name || "");
      $("[name=commercial_name]").val(drug.commercial_name || "");
      $("[name=generic_name]").val(drug.generic_name || "");
      $("[name=popular_pharmacy_name]").val(drug.popular_pharmacy_name || "");
      $("[name=search]").val(drug.search || "");
      $("[name=special_prescription][value=" + (drug.special_prescription ? "true" : "false") + "]").prop("checked", true);
    }

    if ($.fn.summernote) {
      $html.summernote({
        height: 300,
        lang: "pt-BR",
        fontSizes: ["4","6","8","9","10","11","12","14","16","18","20","24","36"],
        toolbar: [
          ["history",  ["undo","redo"]],
          ["style",    ["style","bold","italic","underline","clear"]],
          ["font",     ["strikethrough","superscript","subscript"]],
          ["fontsize", ["fontsize"]],
          ["para",     ["ul","ol","paragraph"]],
          ["insert",   ["hr","table"]],
          ["misc",     ["fullscreen","codeview"]]
        ]
      });
      if (drug && drug.html) $html.summernote("code", drug.html);
    }

    $("#btn-new-drug").off("click.rip").on("click.rip", function () { FlowRouter.go("drugCreate"); });

    if (drug) {
      $("#drug-delete-btn").show().off("click.rip").on("click.rip", function () {
        swal({ title: t("common_areYouSure"), text: drug.name, type: "warning",
          showCancelButton: true, confirmButtonColor: "#ed5565", confirmButtonText: t("common_confirm")
        }, function () {
          if ($.fn.summernote) $html.summernote("destroy");
          Drugs.remove(drug._id);
          toastr.success(t("common_deleteSuccess"), t("common_success"));
          FlowRouter.go("drugList");
        });
      });
    }

    $("#drugForm").off("submit.rip").on("submit.rip", function (e) {
      e.preventDefault();
      var name = $("#drug-name").val().trim();
      if (!name) return;
      var doc = {
        name:                  name,
        commercial_name:       $("[name=commercial_name]").val(),
        generic_name:          $("[name=generic_name]").val(),
        popular_pharmacy_name: $("[name=popular_pharmacy_name]").val(),
        search:                $("[name=search]").val(),
        special_prescription:  $("[name=special_prescription]:checked").val() === "true",
        html:                  ($.fn.summernote ? $html.summernote("code") : $html.val()),
      };
      if (drug) { Drugs.update(drug._id, { $set: doc }); }
      else      { Drugs.insert(doc); }
      if ($.fn.summernote) $html.summernote("destroy");
      toastr.success(t("common_save-success"), t("common_success"));
      FlowRouter.go("drugList");
    });
  }

  // ---------------------------------------------------------------------------
  // Doctor form (workHours grid + Summernote signature + Chosen selects)
  // ---------------------------------------------------------------------------
  var DOCTOR_COLOR_PALETTE = ["#3f81c6","#504bd0","#b1932c","#dd4f97","#17cccc","#55a7ff","#8a86ff","#ebc444","#ff86c3","#31dd81","#ff9055","#F44336","#E91E63","#9C27B0","#673AB7","#3F51B5","#2196F3","#03A9F4","#00BCD4","#009688","#4CAF50","#8BC34A","#CDDC39","#FFEB3B","#FFC107","#FF9800","#FF5722","#795548","#9E9E9E","#607D8B"];

  function buildHoursSlot(start, end, isFirst) {
    var cpInput = function (val) {
      return '<div class="input-group clockpicker" data-autoclose="true" style="width:100px">' +
        '<input type="text" class="form-control" value="' + (val || "") + '">' +
        '<span class="input-group-addon"><span class="glyphicon glyphicon-time"></span></span></div>';
    };
    var btn = isFirst
      ? '<button class="btn btn-sm btn-primary add-hours-slot" type="button"><i class="fa fa-plus"></i></button>'
      : '<button class="btn btn-sm btn-default remove-hours-slot" type="button"><i class="fa fa-times"></i></button>';
    return '<div class="hours" style="display:flex;align-items:center;gap:8px;margin-top:6px">' +
      '<div class="hours-start">' + cpInput(start) + '</div>' +
      '<div class="clockpicker-separator">—</div>' +
      '<div class="hours-end">' + cpInput(end) + '</div>' + btn + '</div>';
  }

  function buildWorkHoursDay(day, hours) {
    var dayName = moment().startOf("week").add(day, "days").format("dddd");
    var hasHours = hours && hours.length > 0;
    return '<div id="day-of-week-' + day + '" class="form-group">' +
      '<label style="width:110px;display:inline-block">' + dayName + '</label>' +
      '<label class="m-r-sm"><input type="checkbox" class="wh-toggle"' + (hasHours ? " checked" : "") + '> ' +
      '<span class="m-l-xs">' + (hasHours ? t("common_enabled") : t("common_disabled")) + '</span></label>' +
      '<div class="hours-container"' + (hasHours ? "" : ' style="display:none"') + '>' +
      (hasHours
        ? hours.map(function (sl, i) { return buildHoursSlot(sl.start, sl.end, i === 0); }).join("")
        : buildHoursSlot("", "", true)) +
      '</div></div>';
  }

  function initDoctorForm(id) {
    var doctor = id ? Meteor.users.findOne({ _id: id }) : null;
    if (!doctor) { FlowRouter.go("doctorList"); return; }
    var profile = doctor.profile || {};

    $("#doctor-form-title").text((profile.firstName || "") + " " + (profile.lastName || ""));
    $("[name=CRM]").val(profile.CRM || "");

    // Summernote for signature
    var $sig = $("textarea[name=signature]");
    if ($.fn.summernote) {
      $sig.summernote({ height: 150, lang: "pt-BR",
        toolbar: [["style",["bold","italic","underline","clear"]],["para",["ul","ol"]],["misc",["codeview"]]]
      });
      if (profile.signature) $sig.summernote("code", profile.signature);
    } else {
      $sig.val(profile.signature || "");
    }

    // Populate specialties chosen
    var $specSel = $("#doctor-specialties");
    Specialties.find({}, { sort: { name: 1 } }).fetch().forEach(function (s) {
      var selected = (doctor.specialties || []).indexOf(s.name) >= 0;
      $specSel.append('<option value="' + s.name + '"' + (selected ? " selected" : "") + '>' + s.name + '</option>');
    });

    // Populate color chosen
    var $colorSel = $("#doctor-color");
    DOCTOR_COLOR_PALETTE.forEach(function (c) {
      $colorSel.append('<option value="' + c + '"' + (doctor.color === c ? " selected" : "") + '>' + c + '</option>');
    });

    if ($.fn.chosen) {
      $specSel.chosen({ width: "100%" });
      $colorSel.chosen({ width: "100%" });
    }

    // Work hours grid
    var wh = doctor.workHours || [];
    var gridHtml = "";
    for (var d = 0; d < 7; d++) { gridHtml += buildWorkHoursDay(d, wh[d]); }
    $("#work-hours-grid").html(gridHtml);

    if ($.fn.clockpicker) {
      $("#work-hours-grid .clockpicker").clockpicker({ autoclose: true });
    }

    // Toggle checkbox → show/hide hours-container + update label
    $("#work-hours-grid").on("change", ".wh-toggle", function () {
      var $day  = $(this).closest(".form-group");
      var on    = $(this).prop("checked");
      $day.find(".hours-container").toggle(on);
      $(this).next("span").text(on ? t("common_enabled") : t("common_disabled"));
    });

    // Add extra time slot
    $("#work-hours-grid").on("click", ".add-hours-slot", function () {
      var $container = $(this).closest(".hours-container");
      var $slot = $(buildHoursSlot("", "", false));
      $slot.find(".remove-hours-slot").on("click", function () { $slot.remove(); });
      if ($.fn.clockpicker) $slot.find(".clockpicker").clockpicker({ autoclose: true });
      $container.append($slot);
    });

    // Remove time slot
    $("#work-hours-grid").on("click", ".remove-hours-slot", function () {
      $(this).closest(".hours").remove();
    });

    // Cancel
    $("#doctor-form .cancel").off("click.rip").on("click.rip", function () { FlowRouter.go("doctorList"); });

    // Submit
    $("#doctor-form").off("submit.rip").on("submit.rip", function (e) {
      e.preventDefault();
      var hours = [];
      for (var dd = 0; dd < 7; dd++) {
        var $day = $("#day-of-week-" + dd);
        if ($day.find(".wh-toggle").prop("checked")) {
          var slots = [];
          $day.find(".hours").each(function () {
            slots.push({ start: $(this).find(".hours-start input").val(), end: $(this).find(".hours-end input").val() });
          });
          hours[dd] = slots;
        } else {
          hours[dd] = null;
        }
      }
      var updateDoc = { $set: {
        "profile.CRM":       $("[name=CRM]").val(),
        "profile.signature": ($.fn.summernote ? $sig.summernote("code") : $sig.val()),
        "specialties":       $specSel.val() || [],
        "color":             $colorSel.val(),
        "workHours":         hours,
      }};
      Meteor.users.update(doctor._id, updateDoc);
      toastr.success(t("common_save-success"), t("common_success"));
      FlowRouter.go("doctorList");
    });
  }

  // ---------------------------------------------------------------------------
  // Document model form (Summernote for model HTML)
  // ---------------------------------------------------------------------------
  function initDocumentModelForm(id) {
    var dm = id ? DocumentModels.findOne({ _id: id }) : null;
    var $model = $("#dm-model");

    if (dm) {
      $("#dm-name").val(dm.name || "");
      if (dm.type) $("#dm-type").val(dm.type);
      $("#dm-description").val(dm.description || "");
    }

    if ($.fn.chosen) $("#dm-type").chosen({ width: "100%", disable_search_threshold: 3 });

    if ($.fn.summernote) {
      $model.summernote({
        height: 300, lang: "pt-BR",
        fontSizes: ["4","6","8","9","10","11","12","14","16","18","20","24","36"],
        toolbar: [
          ["history",  ["undo","redo"]],
          ["style",    ["style","bold","italic","underline","clear"]],
          ["font",     ["strikethrough","superscript","subscript"]],
          ["fontsize", ["fontsize"]],
          ["para",     ["ul","ol","paragraph"]],
          ["insert",   ["hr","table"]],
          ["misc",     ["fullscreen","codeview"]]
        ]
      });
      if (dm && dm.model) $model.summernote("code", dm.model);
    }

    $("#btn-new-document-model").off("click.rip").on("click.rip", function () { FlowRouter.go("documentModelCreate"); });
    $("#dm-cancel-btn").off("click.rip").on("click.rip", function () {
      if ($.fn.summernote) $model.summernote("destroy");
      FlowRouter.go("documentModelList");
    });

    if (dm) {
      $("#dm-delete-btn").show().off("click.rip").on("click.rip", function () {
        swal({ title: t("common_areYouSure"), text: dm.name, type: "warning",
          showCancelButton: true, confirmButtonColor: "#ed5565", confirmButtonText: t("common_confirm")
        }, function () {
          if ($.fn.summernote) $model.summernote("destroy");
          DocumentModels.remove(dm._id);
          toastr.success(t("common_deleteSuccess"), t("common_success"));
          FlowRouter.go("documentModelList");
        });
      });
    }

    $("#dm-save-btn").off("click.rip").on("click.rip", function () {
      var name        = $("#dm-name").val().trim();
      var type        = $("#dm-type").val();
      var description = $("#dm-description").val().trim();
      var modelHtml   = $.fn.summernote ? $model.summernote("code") : $model.val();
      if (!name || !type || !description || !modelHtml) {
        toastr.error(t("common_field-required"), t("common_error"));
        return;
      }
      var doc = { name: name, type: type, description: description, model: modelHtml };
      if (dm) { DocumentModels.update(dm._id, { $set: doc }); }
      else    { DocumentModels.insert(doc); }
      if ($.fn.summernote) $model.summernote("destroy");
      toastr.success(t("common_save-success"), t("common_success"));
      FlowRouter.go("documentModelList");
    });
  }

  // ---------------------------------------------------------------------------
  // Form models form (formBuilder drag-drop builder)
  // ---------------------------------------------------------------------------
  function initFormModelsForm(id) {
    var fm = id ? FormModels.findOne({ _id: id }) : null;

    if (fm) {
      $("#fm-name").val(fm.name || "");
      $("#fm-description").val(fm.description || "");
    }

    var fbOptions = {
      dataType: "json",
      roles: false,
      sortableControls: true,
      stickyControls: false,
      disableFields: ["autocomplete","button","file","date"],
      controlOrder: ["text","textarea","number","select"],
    };
    if (fm && fm.model) { fbOptions.formData = JSON.stringify(fm.model); }

    if (!$.fn.formBuilder) return;
    var formBuilder = $("#record-builder").formBuilder(fbOptions).data("formBuilder");

    // Prevent native HTML5 drag interfering with jQuery UI sortable
    $("#record-builder").on("dragstart", function (e) { e.preventDefault(); });

    // Preview tab
    $(".record-builder-tabs a[data-toggle='tab']").on("shown.bs.tab", function () {
      if (formBuilder) {
        try { $("#record-render").formRender({ dataType: "json", formData: formBuilder.formData }); } catch (err) {}
      }
    });

    // Inject extra buttons into formBuilder toolbar
    setTimeout(function () {
      var $save = $("#record-builder .form-builder-save");
      if (!$save.length) return;
      $save.prepend('<i class="fa fa-floppy-o"></i>&nbsp;');
      $save.before('<button class="btn btn-default fm-cancel-btn" type="button" style="margin-right:6px">' +
        '<i class="fa fa-ban"></i> ' + t("common_cancel") + '</button>');
      if (fm) {
        $save.before('<button class="btn btn-danger fm-delete-btn" type="button" style="margin-right:6px">' +
          '<i class="fa fa-trash"></i></button>');
      }
      $(".fm-cancel-btn").off("click.rip").on("click.rip", function () { FlowRouter.go("formModelsList"); });
      $(".fm-delete-btn").off("click.rip").on("click.rip", function () {
        swal({ title: t("common_areYouSure"), text: fm ? fm.name : "", type: "warning",
          showCancelButton: true, confirmButtonColor: "#ed5565", confirmButtonText: t("common_confirm")
        }, function () {
          FormModels.remove(fm._id);
          toastr.success(t("common_deleteSuccess"), t("common_success"));
          FlowRouter.go("formModelsList");
        });
      });
      $save.off("click.rip").on("click.rip", function (e) {
        e.preventDefault();
        var name = $("#fm-name").val().trim();
        if (!name) { toastr.error(t("common_field-required"), t("common_error")); return; }
        var data = {
          name:        name,
          description: $("#fm-description").val(),
          model:       formBuilder.actions.getData(),
        };
        if (fm) { FormModels.update(fm._id, { $set: data }); }
        else    { FormModels.insert(data); }
        toastr.success(t("common_save-success"), t("common_success"));
        FlowRouter.go("formModelsList");
      });
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // Users list + inline edit form
  // ---------------------------------------------------------------------------
  function initUserList() {
    var defaultPic = "https://cdn4.iconfinder.com/data/icons/medical-14/512/9-128.png";
    function picUrl(user) {
      if (user.profile && user.profile.picture) {
        var img = Images.findOne({ _id: user.profile.picture });
        if (img && img.link) return img.link();
      }
      var email = user.emails && user.emails[0] && user.emails[0].address;
      if (email && global.Gravatar) {
        return Gravatar.imageUrl(email, { secure: true, size: 28, default: defaultPic });
      }
      return defaultPic;
    }

    var data = Meteor.users.find().fetch();
    initDT("users-table", data, [
      {
        title: "", data: "_id", orderable: false,
        render: function (id, type, row) {
          return '<img class="profile-pic" src="' + picUrl(row) + '">';
        }
      },
      {
        title: t("users_firstName"), data: "profile.firstName",
        render: function (d, type, row) {
          var p = row.profile || {};
          return (p.firstName || "") + " " + (p.lastName || "");
        }
      },
      {
        title: "Email", data: "emails",
        render: function (d, type, row) {
          var addr = row.emails && row.emails[0] ? row.emails[0].address : "";
          return '<i class="fa fa-envelope"></i>&nbsp;' + addr;
        }
      },
      {
        title: t("common_enabled"), data: "isUserEnabled", orderable: false,
        render: function (d) {
          var cls = d ? "primary" : "danger";
          return '<span class="label label-' + cls + '">' + t(d ? "common_enabled" : "common_disabled") + '</span>';
        }
      },
      {
        title: t("superAdmin"), data: "isSuperAdmin", orderable: false,
        render: function (d) {
          var cls = d ? "primary" : "danger";
          return '<span class="label label-' + cls + '">' + t(d ? "common_enabled" : "common_disabled") + '</span>';
        }
      },
      {
        data: "_id", orderable: false,
        render: function (id) {
          return '<button class="btn btn-info btn-xs user-edit-btn" data-userid="' + id + '">' +
            '<i class="glyphicon glyphicon-edit"></i></button>';
        }
      }
    ], function (rowData) { loadUserForm(rowData._id); });

    $(document).on("click.ripUsers", ".user-edit-btn", function () {
      loadUserForm($(this).data("userid"));
    });
    $("#new-user-btn").on("click.ripUsers", function () { loadUserForm(null); });
    $("#user-form-cancel").on("click.ripUsers", hideUserForm);
    $("#user-form").on("submit.ripUsers", function (e) {
      e.preventDefault();
      toastr.success(t("common_saved"));
      hideUserForm();
    });
  }

  function showUserForm() {
    var $tb = $("#tablebox"), $fb = $("#users-formbox");
    $tb.removeClass("col-sm-12").addClass("col-sm-8");
    $fb.addClass("col-sm-4").show();
  }

  function hideUserForm() {
    var $tb = $("#tablebox"), $fb = $("#users-formbox");
    $tb.removeClass("col-sm-8").addClass("col-sm-12");
    $fb.removeClass("col-sm-4").hide();
    $("#user-form")[0] && $("#user-form")[0].reset();
  }

  function loadUserForm(userId) {
    showUserForm();
    var form = document.getElementById("user-form");
    if (!form) return;
    var f = function (name) { return form.querySelector('[name="' + name + '"]'); };
    if (userId) {
      var user = Meteor.users.findOne({ _id: userId });
      if (!user) return;
      var p = user.profile || {};
      f("firstName").value  = p.firstName || "";
      f("lastName").value   = p.lastName  || "";
      f("email").value      = user.emails && user.emails[0] ? user.emails[0].address : "";
      f("password").value   = "";
      f("password").placeholder = t("users_changepassword");
      f("group").value      = p.group || "medical_doctor";
      f("enabled").checked  = !!user.isUserEnabled;
      f("super-admin").checked = !!user.isSuperAdmin;
    } else {
      form.reset();
      f("password").placeholder = t("users_passwordPlaceholder");
    }
  }

  // ---------------------------------------------------------------------------
  // randomMC — text-seeded color (no murmur dep; consistent per unique string)
  // ---------------------------------------------------------------------------
  global.randomMC = (function () {
    var PALETTE = ["#1c84c6","#1ab394","#23c6c8","#f8ac59","#9b59b6","#e67e22","#27ae60","#e74c3c","#3498db","#f39c12"];
    function simpleHash(s) {
      var h = 0;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
      return Math.abs(h);
    }
    return {
      getColor: function (opts) {
        if (opts && opts.text) return PALETTE[simpleHash(String(opts.text)) % PALETTE.length];
        return PALETTE[Math.floor(Math.random() * PALETTE.length)];
      }
    };
  })();

  // AutoForm stub (used only to set hooks; no autoform in static build)
  global.AutoForm = { addHooks: function () {}, resetForm: function () {} };

  // ---------------------------------------------------------------------------
  // Patient records tab — timeline + FAB
  // ---------------------------------------------------------------------------
  var RECORD_ICON = { form: "fa-id-card", prescription: "fa-file-text", medical_certificate: "fa-file-text-o", exam_request: "fa-eye" };
  var RECORD_CLS  = { form: "form", prescription: "info", medical_certificate: "warning", exam_request: "danger" };
  var APPT_STATUS_MAP = {
    completed:      { icon: "fa-check-circle",  cls: "primary", key: "patient_appt-status-completed" },
    no_show:        { icon: "fa-user-times",    cls: "danger",  key: "patient_appt-status-no_show"   },
    in_progress:    { icon: "fa-handshake-o",   cls: "info",    key: "patient_appt-status-in_progress" },
    "re-scheduled": { icon: "fa-hourglass-o",  cls: "warning", key: "patient_appt-status-re-scheduled" },
  };

  function escH(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function buildTimeline(entries) {
    var datesHtml = entries.map(function (e, i) {
      var d = moment(e.date).format("DD/MM/YYYY");
      return "<li><a" + (i === 0 ? ' class="selected"' : "") + ' href="#0" data-date="' + d + '">' + d + "</a></li>";
    }).join("");

    var contentHtml = entries.map(function (e, i) {
      var d   = moment(e.date).format("DD/MM/YYYY");
      var id  = moment(e.date).format("DDMMYYYY");
      var panels = "";

      e.appointments.forEach(function (appt) {
        var s   = APPT_STATUS_MAP[appt.status] || {};
        var badge = s.key ? '<span class="label label-' + s.cls + '"><i class="fa ' + s.icon + '"></i> ' + t(s.key) + "</span>" : "";
        var time  = moment(appt.start).format("HH:mm") + (appt.end ? " &ndash; " + moment(appt.end).format("HH:mm") : "");
        var doc   = (appt.user && appt.user.name) ? "<p><b>" + t("patient_appointment-doctor") + ":</b> " + escH(appt.user.name) + "</p>" : "";
        panels += '<div class="panel panel-default timeline-appointment"><div class="panel-heading"><h5 class="panel-title"><i class="fa fa-stethoscope"></i> ' + t("schedule_appointment") + " " + badge + "</h5></div>" +
          '<div class="panel-body"><p><i class="fa fa-clock-o"></i> ' + time + "</p>" + doc + "</div></div>";
      });

      e.records.forEach(function (rec, idx) {
        var icon = RECORD_ICON[rec.recordType] || "fa-file-text-o";
        var cls  = RECORD_CLS[rec.recordType]  || "default";
        var name = escH(rec.recordName || (t("patient_records-item") + " #" + (idx + 1)));
        var cid  = id + "_" + idx;
        var fields = (rec.fields || []).map(function (f) {
          if (f.name && f.name.toLowerCase() === "document") return f.value || "";
          return "<p><b>" + escH(f.label) + ":</b> " + escH(f.value) + "</p><p>&nbsp;</p>";
        }).join("");
        panels += '<div class="panel panel-default record-type-' + cls + '">' +
          '<div class="panel-heading"><h5 class="panel-title">' +
          '<a data-toggle="collapse" data-parent="#accordion' + id + '" href="#collapse_' + cid + '">' +
          '<i class="fa ' + icon + '"></i> ' + name + "</a></h5></div>" +
          '<div id="collapse_' + cid + '" class="panel-collapse collapse in">' +
          '<div class="panel-body note-editable overflow-hiden" id="' + cid + '">' + fields + "</div></div></div>";
      });

      return "<li" + (i === 0 ? ' class="selected"' : "") + ' data-date="' + d + '">' +
        '<em><i class="fa fa-calendar"></i> ' + moment(e.date).locale("pt-br").format("LL") + "</em>" +
        '<div class="panel-group" id="accordion' + id + '">' + panels + "</div></li>";
    }).join("");

    return '<div class="cd-horizontal-timeline">' +
      '<div class="timeline"><div class="events-wrapper"><div class="events"><ol>' + datesHtml + "</ol>" +
      '<span class="filling-line" aria-hidden="true"></span>' +
      '<span class="timeline-marker" aria-hidden="true"></span>' +
      "</div></div>" +
      '<ul class="cd-timeline-navigation"><li><a href="#0" class="prev inactive">Prev</a></li><li><a href="#0" class="next">Next</a></li></ul>' +
      "</div>" +
      '<div class="events-content"><ol>' + contentHtml + "</ol></div></div>";
  }

  function initRecordsTab(patientId) {
    if (!patientId) return;
    var records = PatientRecords.find({ patientId: patientId }, { sort: { date: -1 } }).fetch();
    var appts   = Appointments.find({ "patient._id": patientId }, { sort: { start: -1 } }).fetch();

    var entries = [];
    function findByDay(date) {
      return entries.filter(function (e) { return moment(e.date).isSame(date, "day"); })[0];
    }
    records.forEach(function (item) {
      var entry = findByDay(item.date);
      if (!entry) entries.push({ date: item.date, records: [{ fields: item.record, recordType: item.recordType, recordName: item.recordName }], appointments: [], examSets: [] });
      else entry.records.push({ fields: item.record, recordType: item.recordType, recordName: item.recordName });
    });
    appts.forEach(function (appt) {
      var entry = findByDay(appt.start);
      if (!entry) entries.push({ date: appt.start, records: [], appointments: [appt], examSets: [] });
      else entry.appointments.push(appt);
    });
    entries.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (entries.length === 0) return; // leave empty state

    var el = document.getElementById("records-tab-content");
    if (!el) return;
    el.innerHTML = buildTimeline(entries);
    setTimeout(runTimeline, 80);

    // Re-run on tab click (so layout fits after the tab becomes visible)
    $('a[href="#records-tab"]').off("shown.bs.tab.ripRec").on("shown.bs.tab.ripRec", function () {
      setTimeout(runTimeline, 80);
    });

    // qtip tooltips for FAB buttons
    setTimeout(function () {
      if ($.fn.qtip) {
        $('[data-tooltip]').filter(function () { return $(this).attr("data-tooltip") !== ""; }).qtip({
          content: { attr: "data-tooltip" },
          position: { my: "center right", at: "center left" },
          style:    { classes: "qtip-tipsy qtip-shadow" },
        });
      }
    }, 150);
  }

  // Port of patientTimeLine.js runTimeline()
  function runTimeline() {
    var timelines = $(".cd-horizontal-timeline");
    if (!timelines.length) return;
    var MIN_DIST = 90;

    timelines.each(function () {
      var tl = $(this), tc = {};
      tc.wrap    = tl.find(".events-wrapper");
      tc.events  = tc.wrap.children(".events");
      tc.filling = tc.events.children(".filling-line");
      tc.links   = tc.events.find("a");
      tc.content = tl.children(".events-content");
      tc.nav     = tl.find(".cd-timeline-navigation");

      // position each date link evenly, 100px apart
      tc.links.each(function (i) { $(this).css("left", (i + 1) * 100 + "px"); });

      var total = tc.links.length * 100 + 100;
      var wrap  = tl.find(".timeline").width();
      if (total < wrap) total = wrap;
      tc.events.css("width", total + "px");

      tl.addClass("loaded");

      function updateFilling(sel) {
        var s = window.getComputedStyle(sel.get(0), null);
        var left = parseFloat(s.left) + parseFloat(s.width) / 2;
        var scale = left / total;
        tc.filling.get(0).style.transform = "scaleX(" + scale + ")";
        tc.filling.siblings(".timeline-marker").css("left", left + "px");
      }

      function fitContent() {
        var sel = tc.content.find(".selected");
        if (!sel.length) return;
        var h = Math.max(sel.height(), sel.get(0).scrollHeight) + 24;
        tc.content.css("height", h + "px");
      }

      function showContent(link) {
        var d = link.data("date");
        var cur = tc.content.find(".selected");
        var nxt = tc.content.find('[data-date="' + d + '"]');
        if (!nxt.length) return;
        var entering = nxt.index() > cur.index() ? "selected enter-right" : "selected enter-left";
        var leaving  = nxt.index() > cur.index() ? "leave-left" : "leave-right";
        nxt.attr("class", entering);
        cur.attr("class", leaving).one("webkitAnimationEnd oanimationend msAnimationEnd animationend", function () {
          cur.removeClass("leave-right leave-left");
          nxt.removeClass("enter-left enter-right");
        });
        fitContent();
        try { link.get(0).scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); } catch (e) {}
      }

      function updateOlder(link) {
        link.parent("li").prevAll("li").children("a").addClass("older-event")
          .end().end().nextAll("li").children("a").removeClass("older-event");
      }

      function updateArrows() {
        var node = tc.wrap.get(0);
        tc.nav.find(".prev").toggleClass("inactive", node.scrollLeft <= 1);
        tc.nav.find(".next").toggleClass("inactive", node.scrollLeft + node.clientWidth >= node.scrollWidth - 1);
      }

      // fit initial selected content
      fitContent();
      $(window).off("resize.tlfit").on("resize.tlfit", function () { fitContent(); });

      // fill line on first selected
      var firstSel = tc.links.filter(".selected");
      if (firstSel.length) { updateFilling(firstSel); updateOlder(firstSel); }

      // arrow scrolling
      tc.wrap.off("scroll.tlnav").on("scroll.tlnav", function () { updateArrows(); });
      tc.nav.off("click").on("click", ".next", function (e) {
        e.preventDefault();
        var node = tc.wrap.get(0);
        tc.wrap.stop().animate({ scrollLeft: node.scrollLeft + Math.max(node.clientWidth - MIN_DIST, 100) }, 300);
      });
      tc.nav.on("click", ".prev", function (e) {
        e.preventDefault();
        var node = tc.wrap.get(0);
        tc.wrap.stop().animate({ scrollLeft: node.scrollLeft - Math.max(node.clientWidth - MIN_DIST, 100) }, 300);
      });
      updateArrows();

      // date link click → show content
      tc.links.off("click").on("click", function (e) {
        e.preventDefault();
        tc.links.removeClass("selected");
        $(this).addClass("selected");
        updateOlder($(this));
        updateFilling($(this));
        showContent($(this));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Patient evolution tab — vitals series + Chart.js charts
  // ---------------------------------------------------------------------------
  var EVO_PAL = { blue: "#1c84c6", green: "#1ab394", teal: "#23c6c8", yellow: "#f8ac59", red: "#ed5565", muted: "#9aa4ac" };
  var _evoCharts = {};

  function fieldVal(rec, name) {
    for (var i = 0; i < rec.record.length; i++) {
      if (rec.record[i].name === name) {
        var v = parseFloat(String(rec.record[i].value).replace(",", "."));
        return isNaN(v) ? null : v;
      }
    }
    return null;
  }

  function lastNonNull(arr) { for (var i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]; return null; }
  function firstNonNull(arr) { for (var i = 0; i < arr.length; i++) if (arr[i] != null) return arr[i]; return null; }
  function seriesDelta(arr) {
    var f = firstNonNull(arr), l = lastNonNull(arr);
    return (f != null && l != null) ? Math.round((l - f) * 10) / 10 : null;
  }

  function imcClassify(v) {
    if (v == null) return { label: "—", cls: "default" };
    if (v < 18.5) return { label: t("evolution_imc-underweight"), cls: "info" };
    if (v < 25)   return { label: t("evolution_imc-normal"),      cls: "primary" };
    if (v < 30)   return { label: t("evolution_imc-overweight"),  cls: "warning" };
    if (v < 35)   return { label: t("evolution_imc-obese-1"),     cls: "warning" };
    if (v < 40)   return { label: t("evolution_imc-obese-2"),     cls: "danger" };
    return         { label: t("evolution_imc-obese-3"),            cls: "danger" };
  }

  function paClassify(sys, dia) {
    if (sys == null || dia == null) return { label: "—", cls: "default" };
    if (sys < 120 && dia < 80) return { label: t("evolution_pa-optimal"), cls: "primary" };
    if (sys < 140 && dia < 90) return { label: t("evolution_pa-elevated"), cls: "warning" };
    return { label: t("evolution_pa-high"), cls: "danger" };
  }

  function buildVitalsSeries(patientId) {
    var recs = PatientRecords.find(
      { patientId: patientId, recordName: "Triagem e Sinais Vitais" },
      { sort: { date: 1 } }
    ).fetch();
    var s = { labels: [], imc: [], peso: [], altura: null, sys: [], dia: [], fc: [], spo2: [], n: recs.length, first: null, last: null };
    recs.forEach(function (r) {
      var peso = fieldVal(r, "peso"), alt = fieldVal(r, "altura");
      var imc  = (peso && alt) ? Math.round(peso / Math.pow(alt / 100, 2) * 10) / 10 : null;
      if (alt) s.altura = alt;
      s.labels.push(moment(r.date).format("DD/MM/YY"));
      s.imc.push(imc); s.peso.push(peso);
      s.sys.push(fieldVal(r, "pressao-sistolica")); s.dia.push(fieldVal(r, "pressao-diastolica"));
      s.fc.push(fieldVal(r, "frequencia-cardiaca")); s.spo2.push(fieldVal(r, "saturacao-oxigenio"));
    });
    if (recs.length) { s.first = recs[0].date; s.last = recs[recs.length - 1].date; }
    return s;
  }

  function buildExamList(patientId) {
    var docs = PatientExams.find({ patientId: patientId }).fetch();
    var by = {};
    docs.forEach(function (d) {
      (d.results || []).forEach(function (r) {
        if (!r.examName || parseFloat(String(r.value).replace(",", ".")) == null) return;
        var e = by[r.examName] || (by[r.examName] = { name: r.examName, unit: r.unit || "", count: 0 });
        e.count++;
        if (r.unit) e.unit = r.unit;
      });
    });
    return Object.keys(by).map(function (k) { return by[k]; })
      .filter(function (e) { return e.count >= 2; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  }

  function buildExamSeries(patientId, name) {
    var docs = PatientExams.find({ patientId: patientId }, { sort: { datePerformed: 1 } }).fetch();
    var out = { labels: [], values: [], altered: [], refs: [], unit: "" };
    docs.forEach(function (d) {
      (d.results || []).forEach(function (r) {
        if (r.examName !== name) return;
        var v = parseFloat(String(r.value || "").replace(",", "."));
        if (isNaN(v)) return;
        out.labels.push(moment(d.datePerformed).format("DD/MM/YY"));
        out.values.push(v); out.altered.push(!!r.isAltered); out.refs.push(r.referenceUsed || "");
        if (r.unit) out.unit = r.unit;
      });
    });
    return out;
  }

  function drawEvoCharts(s, examList, patientId) {
    Object.keys(_evoCharts).forEach(function (k) { try { _evoCharts[k].destroy(); } catch (e) {} });
    _evoCharts = {};

    function lineCfg(datasets) {
      return {
        type: "line",
        data: { labels: s.labels, datasets: datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          legend: { display: datasets.length > 1, position: "bottom" },
          tooltips: { mode: "index", intersect: false },
          elements: { line: { tension: 0.3 }, point: { radius: 2, hitRadius: 8 } },
          scales: { yAxes: [{ ticks: { beginAtZero: false } }] },
        },
      };
    }
    function ds(label, color, fill) {
      return { label: label, borderColor: color, backgroundColor: fill || "transparent",
        pointBackgroundColor: color, borderWidth: 2, fill: !!fill, data: [], spanGaps: true };
    }
    function mk(id, cfg) {
      var el = document.getElementById(id);
      if (!el) return;
      _evoCharts[id] = new Chart(el.getContext("2d"), cfg);
    }

    var imcCfg = lineCfg([ds(t("evolution_imc"), EVO_PAL.blue, "rgba(28,132,198,0.08)")]);
    imcCfg.data.datasets[0].data = s.imc;
    mk("evo-imc", imcCfg);

    var pesoCfg = lineCfg([ds(t("evolution_weight"), EVO_PAL.green, "rgba(26,179,148,0.08)")]);
    pesoCfg.data.datasets[0].data = s.peso;
    mk("evo-peso", pesoCfg);

    var sysDs = ds(t("evolution_pa-systolic"), EVO_PAL.red);
    var diaDs = ds(t("evolution_pa-diastolic"), EVO_PAL.yellow);
    sysDs.data = s.sys; diaDs.data = s.dia;
    mk("evo-pa", lineCfg([sysDs, diaDs]));

    var fcDs   = ds(t("evolution_heart-rate"), EVO_PAL.teal);
    var spo2Ds = ds("SpO₂ (%)", EVO_PAL.muted);
    fcDs.data = s.fc; spo2Ds.data = s.spo2;
    mk("evo-fc", lineCfg([fcDs, spo2Ds]));

    // exam chart — first exam in list by default
    var el = document.getElementById("evo-exam");
    if (el && examList.length) {
      var exName = examList[0].name;
      var es = buildExamSeries(patientId, exName);
      var pts = es.altered.map(function (a) { return a ? EVO_PAL.red : EVO_PAL.green; });
      _evoCharts["evo-exam"] = new Chart(el.getContext("2d"), {
        type: "line",
        data: { labels: es.labels, datasets: [{
          label: exName + (es.unit ? " (" + es.unit + ")" : ""),
          data: es.values, borderColor: EVO_PAL.blue, backgroundColor: "rgba(28,132,198,0.06)",
          pointBackgroundColor: pts, pointBorderColor: pts,
          pointRadius: 4, borderWidth: 2, fill: true, spanGaps: true,
        }]},
        options: {
          responsive: true, maintainAspectRatio: false,
          legend: { display: false },
          elements: { line: { tension: 0.3 }, point: { hitRadius: 8 } },
          scales: { yAxes: [{ ticks: { beginAtZero: false } }] },
        },
      });
      $("#evo-exam-select").on("change.ripEvo", function () {
        var name = $(this).val();
        if (_evoCharts["evo-exam"]) _evoCharts["evo-exam"].destroy();
        var es2 = buildExamSeries(patientId, name);
        var pts2 = es2.altered.map(function (a) { return a ? EVO_PAL.red : EVO_PAL.green; });
        _evoCharts["evo-exam"] = new Chart(document.getElementById("evo-exam").getContext("2d"), {
          type: "line",
          data: { labels: es2.labels, datasets: [{ label: name, data: es2.values,
            borderColor: EVO_PAL.blue, backgroundColor: "rgba(28,132,198,0.06)",
            pointBackgroundColor: pts2, pointBorderColor: pts2,
            pointRadius: 4, borderWidth: 2, fill: true, spanGaps: true }]},
          options: { responsive: true, maintainAspectRatio: false, legend: { display: false },
            elements: { line: { tension: 0.3 } }, scales: { yAxes: [{ ticks: { beginAtZero: false } }] } },
        });
      });
    }
  }

  function initEvolutionTab(patientId) {
    if (!patientId) return;
    var s = buildVitalsSeries(patientId);
    var examList = buildExamList(patientId);
    if (s.n === 0 && examList.length === 0) return; // leave empty state

    var imc = lastNonNull(s.imc), peso = lastNonNull(s.peso), sys = lastNonNull(s.sys), dia = lastNonNull(s.dia), fc = lastNonNull(s.fc);
    var imcC = imcClassify(imc), paC = paClassify(sys, dia);
    var dImc = seriesDelta(s.imc), dPeso = seriesDelta(s.peso);
    var fmtD = function (d) { return d && d !== 0 ? (d > 0 ? "+" : "") + d : null; };
    var dCls = function (d, gd) { return (!d || d === 0) ? "text-muted" : ((d < 0) === gd ? "text-navy" : "text-danger"); };
    var span = s.first ? moment(s.first).format("MMM/YY") + " – " + moment(s.last).format("MMM/YY") : "";

    var imcD = fmtD(dImc), pesoD = fmtD(dPeso);
    var exPicker = examList.length
      ? '<div class="pull-right evo-exam-picker"><label class="evo-exam-label">' + t("evolution_exam-select") + "</label>" +
        '<select id="evo-exam-select" class="form-control input-sm evo-exam-select">' +
        examList.map(function (e) { return '<option value="' + escH(e.name) + '">' + escH(e.name) + (e.unit ? " (" + escH(e.unit) + ")" : "") + "</option>"; }).join("") +
        "</select></div>"
      : "";
    var exBlock = examList.length
      ? '<div class="row"><div class="col-lg-12"><div class="ibox">' +
        '<div class="ibox-title"><h5><i class="fa fa-flask"></i> ' + t("evolution_exam-results") + "</h5>" + exPicker + "</div>" +
        '<div class="ibox-content"><div class="evo-chart-wrap"><canvas id="evo-exam"></canvas></div></div>' +
        "</div></div></div>"
      : "";

    var html = '<div class="panel-body evolution-pane">' +
      '<div class="row">' +
        '<div class="col-md-3 col-sm-6"><div class="ibox"><div class="ibox-content evo-summary">' +
          '<span class="evo-summary-label">' + t("evolution_imc") + "</span>" +
          '<h2 class="evo-summary-value">' + (imc != null ? imc : "—") + ' <small>kg/m²</small></h2>' +
          '<span class="label label-' + imcC.cls + '">' + imcC.label + "</span>" +
          (imcD ? '<div class="evo-delta ' + dCls(dImc, true) + '"><i class="fa ' + (dImc < 0 ? "fa-arrow-down" : "fa-arrow-up") + '"></i> ' + imcD + " kg/m² " + t("evolution_since-first") + "</div>" : "") +
        "</div></div></div>" +
        '<div class="col-md-3 col-sm-6"><div class="ibox"><div class="ibox-content evo-summary">' +
          '<span class="evo-summary-label">' + t("evolution_weight") + "</span>" +
          '<h2 class="evo-summary-value">' + (peso != null ? peso : "—") + ' <small>kg</small></h2>' +
          '<span class="text-muted">' + t("evolution_height") + ": " + (s.altura != null ? s.altura : "—") + " cm</span>" +
          (pesoD ? '<div class="evo-delta ' + dCls(dPeso, true) + '"><i class="fa ' + (dPeso < 0 ? "fa-arrow-down" : "fa-arrow-up") + '"></i> ' + pesoD + " kg " + t("evolution_since-first") + "</div>" : "") +
        "</div></div></div>" +
        '<div class="col-md-3 col-sm-6"><div class="ibox"><div class="ibox-content evo-summary">' +
          '<span class="evo-summary-label">' + t("evolution_blood-pressure") + "</span>" +
          '<h2 class="evo-summary-value">' + (sys != null ? sys : "—") + "/" + (dia != null ? dia : "—") + ' <small>mmHg</small></h2>' +
          '<span class="label label-' + paC.cls + '">' + paC.label + "</span>" +
        "</div></div></div>" +
        '<div class="col-md-3 col-sm-6"><div class="ibox"><div class="ibox-content evo-summary">' +
          '<span class="evo-summary-label">' + t("evolution_heart-rate") + "</span>" +
          '<h2 class="evo-summary-value">' + (fc != null ? fc : "—") + ' <small>bpm</small></h2>' +
          '<span class="text-muted">' + s.n + " " + t("evolution_measurements") + " · " + span + "</span>" +
        "</div></div></div>" +
      "</div>" +
      '<div class="row">' +
        '<div class="col-lg-6"><div class="ibox"><div class="ibox-title"><h5><i class="fa fa-line-chart"></i> ' + t("evolution_imc") + '</h5><span class="label label-info pull-right">' + t("evolution_imc-subtitle") + "</span></div><div class=\"ibox-content\"><div class=\"evo-chart-wrap\"><canvas id=\"evo-imc\"></canvas></div></div></div></div>" +
        '<div class="col-lg-6"><div class="ibox"><div class="ibox-title"><h5><i class="fa fa-balance-scale"></i> ' + t("evolution_weight") + '</h5></div><div class="ibox-content"><div class="evo-chart-wrap"><canvas id="evo-peso"></canvas></div></div></div></div>' +
      "</div>" +
      '<div class="row">' +
        '<div class="col-lg-6"><div class="ibox"><div class="ibox-title"><h5><i class="fa fa-heartbeat"></i> ' + t("evolution_blood-pressure") + '</h5></div><div class="ibox-content"><div class="evo-chart-wrap"><canvas id="evo-pa"></canvas></div></div></div></div>' +
        '<div class="col-lg-6"><div class="ibox"><div class="ibox-title"><h5><i class="fa fa-heart"></i> ' + t("evolution_heart-rate") + " &amp; SpO₂</h5></div><div class=\"ibox-content\"><div class=\"evo-chart-wrap\"><canvas id=\"evo-fc\"></canvas></div></div></div></div>" +
      "</div>" +
      exBlock +
      "</div>";

    var el = document.getElementById("evolution-tab-content");
    if (el) el.innerHTML = html;

    // Draw charts once the tab becomes visible (canvas sizing requires display)
    function doDrawEvo() { drawEvoCharts(s, examList, patientId); }
    $('a[href="#evolution-tab"]').off("shown.bs.tab.ripEvo").on("shown.bs.tab.ripEvo", function () {
      setTimeout(doDrawEvo, 50);
    });
    // If tab is already active (shouldn't happen on load but guard it)
    if ($("#evolution-tab").is(":visible")) setTimeout(doDrawEvo, 50);
  }

  // ---------------------------------------------------------------------------
  // Schedule page — FullCalendar Scheduler init (matches original schedule.js)
  // ---------------------------------------------------------------------------
  function initSchedule() {
    if (!$.fn.fullCalendar) return;
    var $cal = $("#calendar");
    if (!$cal.length) return;

    if (Meteor.Device.isPhone() || Meteor.Device.isTablet()) {
      $("#mobile-hint").show();
    }

    // Populate patient select in modal
    function populatePatientSelect() {
      var $sel = $(".patients-chosen-select");
      $sel.find("option[value!='']").remove();
      Patients.find({}, { sort: { name: 1 } }).fetch().forEach(function (p) {
        $sel.append('<option value="' + p._id + '">' + Handlebars.escapeExpression(p.name || "") + "</option>");
      });
      if ($.fn.chosen) {
        if ($sel.data("chosen")) {
          $sel.trigger("chosen:updated");
        } else {
          $sel.chosen({ width: "100%" });
          $sel.on("chosen:showing_dropdown", function () { $(".carousel-inner").css("overflow", "visible"); });
          $sel.on("chosen:hiding_dropdown",  function () { $(".carousel-inner").css("overflow", ""); });
        }
      }
    }

    // Settings (mirrors schedule.js onRendered logic)
    var settings = Settings.findOne({}) || {};
    var workHoursStart   = settings.workHoursStart || "06:00";
    var workHoursEnd     = settings.workHoursEnd   || "23:00";
    var slotDurationMins = settings.slotDuration   || 20;

    // All doctors with specialties, workHours, color
    var doctors = Meteor.users.find({ "profile.group": "medical_doctor" }).fetch();

    // Event source function (used by fullCalendar so new inserts appear immediately)
    function eventSourceFn(start, end, timezone, callback) {
      var evs = Schedule.find({}).fetch().map(function (ev) {
        return {
          id:         ev._id,
          _id:        ev._id,
          title:      ev.title || t("schedule_status-to-confirm"),
          start:      ev.start,
          end:        ev.end,
          resourceId: ev.resourceId,
          patient:    ev.patient,
          status:     ev.status || "to-confirm",
          allDay:     false,
        };
      });
      if (callback) callback(evs);
    }

    // Show the event modal (mirrors original showEventModal)
    function showEventModal(eventId) {
      populatePatientSelect();
      var ev = Schedule.findOne({ _id: eventId });
      if (!ev) return;
      $(".scheduleTitle").html(moment(ev.start).format("LLLL"));
      $("#schedule-form [name='eventId']").val(eventId);
      $(".patients-chosen-select").val(ev.patient || "").trigger("chosen:updated");

      var status = ev.status === "to-confirm" ? "scheduled" : (ev.status || "scheduled");
      $("#schedule-form input[name='status']").val([status]);
      $("#schedule-form input[value='" + status + "']").closest("label").button("toggle");

      setAppointmentFormButtons();
      $("#scheduleEventForm").modal("show");
    }

    function setAppointmentFormButtons() {
      $("#scheduleEventForm .delete-btn").show();
      $(document).off("click.schSave").on("click.schSave", "#scheduleEventForm .save", function () {
        var eventId   = $("#schedule-form [name='eventId']").val();
        var patientId = $(".patients-chosen-select").val();
        var status    = $("#schedule-form input[name='status']:checked").val();
        var pat = patientId ? Patients.findOne({ _id: patientId }) : null;
        if (pat) {
          $("#patient-form-group").removeClass("has-error");
          Schedule.update(eventId, { $set: { patient: pat._id, title: pat.name, status: status } });
          $("#scheduleEventForm").modal("hide");
          $cal.fullCalendar("refetchEvents");
          if (global.toastr) toastr.success(t("common_save-success"), t("common_success"));
        } else {
          $("#patient-form-group").addClass("has-error");
        }
      });
      $(document).off("click.schDel").on("click.schDel", "#scheduleEventForm .delete-btn", function () {
        var eventId = $("#schedule-form [name='eventId']").val();
        Schedule.remove(eventId);
        $cal.fullCalendar("removeEvents", eventId);
        if (global.toastr) toastr.warning(t("schedule_appointment-canceled"), t("common_success"));
      });
    }

    function setPatientFormButtons() {
      setTimeout(function () { $("#quickPatientForm input:first:visible").focus(); }, 500);
      $("#scheduleEventForm .delete-btn").hide();
      $(document).off("click.schSave").on("click.schSave", "#scheduleEventForm .save", function () {
        $("#quickPatientForm").submit();
      });
    }

    // Modal carousel slides
    $("#scheduleEventForm").off("hidden.bs.modal.sch").on("hidden.bs.modal.sch", function () {
      $("#content-switcher").carousel(0);
      $("#patient-form-group").removeClass("has-error");
    });
    $("#content-switcher").off("slide.bs.carousel.sch").on("slide.bs.carousel.sch", function (e) {
      if (e.direction === "left") setPatientFormButtons();
      else setAppointmentFormButtons();
    });

    // Date picker custom button
    var datePicker = null;

    $cal.fullCalendar("destroy");
    $cal.fullCalendar({
      schedulerLicenseKey: "GPL-My-Project-Is-Open-Source",
      defaultView: "timelineDay",
      timezone: "America/Sao_Paulo",
      locale: TAPi18n.getLanguage().toLowerCase(),
      height: "auto",
      navLinks: true,
      editable: true,
      slotDuration: { minutes: slotDurationMins },
      minTime: workHoursStart + ":00",
      maxTime: workHoursEnd + ":00",
      resourceLabelText: t("users_doctors"),
      resourceAreaWidth: 220,
      resourceOrder: "title",
      header: {
        left:   "today prev,datePicker,next",
        center: "title",
        right:  "timelineDay,agendaDay,listWeek,agendaWeek,month",
      },
      customButtons: {
        datePicker: {
          text: moment().format("DD/MM/YYYY"),
          click: function () {
            if (datePicker) {
              datePicker.datepicker("show");
            } else {
              datePicker = $(".fc-datePicker-button")
                .datepicker({ autoclose: true, language: TAPi18n.getLanguage(), todayHighlight: true })
                .datepicker("show")
                .on("changeDate", function (e) {
                  $(".fc-datePicker-button").html(moment(e.date).format("DD/MM/YYYY"));
                  $cal.fullCalendar("gotoDate", e.date);
                });
            }
          },
        },
      },
      buttonText: {
        today: t("schedule_today"),
      },
      views: {
        timelineDay: {
          buttonText: t("schedule_timelineDay"),
          slotLabelFormat: ["HH:mm"],
          slotLabelInterval: { minutes: slotDurationMins },
          titleFormat: "dddd – MMMM D, YYYY",
        },
        listWeek:  { buttonText: t("schedule_listWeek")  },
        agendaDay: { buttonText: t("schedule_agendaDay"), titleFormat: "dddd – MMMM D, YYYY" },
        agendaWeek:{ buttonText: t("schedule_agendaWeek") },
        month:     { buttonText: t("schedule_month")     },
      },
      viewRender: function (view) {
        $(".fc-datePicker-button").html(view.intervalStart.format("DD/MM/YYYY"));
      },
      dayClick: function (date, jsEvent, view) {
        if (view.name === "month") {
          $cal.fullCalendar("changeView", "timelineDay");
          $cal.fullCalendar("gotoDate", date);
        }
      },
      selectable: true,
      selectHelper: true,
      selectOverlap: false,
      selectAllow: function (info) {
        var doctor = doctors.find(function (d) { return d._id === info.resourceId; });
        if (!doctor) return true;
        if (!doctor.workHours) {
          if (global.toastr) toastr.error(t("schedule_no-doctor-workhours-error"), t("common_notAllowed"));
          return false;
        }
        var weekday = info.start.day();
        var dayHours = doctor.workHours[weekday];
        if (!dayHours) return false;
        var calStart = moment(info.start.format("HH:mm"), "HH:mm");
        var allowed = dayHours.some(function (interval) {
          var docStart = moment(interval.start, "HH:mm");
          var docEnd   = moment(interval.end,   "HH:mm");
          return calStart.isBetween(docStart, docEnd) || calStart.diff(docStart) === 0;
        });
        return allowed;
      },
      select: function (start, end, jsEvent, view, resource) {
        if (!resource) { $cal.fullCalendar("unselect"); return; }
        var newId = Schedule.insert({
          resourceId: resource.id,
          start:  start.format(),
          end:    end.format(),
          title:  "to-confirm",
          status: "to-confirm",
        });
        $cal.fullCalendar("unselect");
        if (newId) showEventModal(newId);
      },
      eventClick: function (calEvent) {
        showEventModal(calEvent._id);
      },
      eventRender: function (event, element, view) {
        var icon = "";
        var tooltip = event.title;
        switch (event.status) {
          case "to-confirm":
            tooltip = t("schedule_status-to-confirm");
            element.find(".fc-content").css("background", "#E44F4F");
            icon = '<i class="fa fa-hourglass-o"></i>'; break;
          case "waiting":
            icon = '<i class="fa fa-calendar-check-o"></i>'; break;
          case "scheduled":
            icon = '<i class="fa fa-clock-o"></i>'; break;
          case "attending":
            icon = '<i class="fa fa-handshake-o"></i>'; break;
          case "no-show":
            icon = '<i class="fa fa-user-times"></i>'; break;
          case "finished":
            icon = '<i class="fa fa-check-circle"></i>'; break;
        }
        if (view.name === "timelineDay" || view.name === "timelineThreeDays") {
          element.find(".fc-title").html(icon);
        } else if (event.title === "to-confirm") {
          element.find(".fc-title").html(t("schedule_status-to-confirm"));
        }
        if ($.fn.qtip) {
          element.qtip({
            position: { target: "mouse", adjust: { x: 10, y: 4, mouse: true, screen: true, scroll: false, resize: false } },
            show:     { solo: true },
            style:    { classes: "qtip-bootstrap agenda-tooltip" },
            content:  tooltip,
          });
        }
      },
      resources: function (callback) {
        var calResources = [];
        doctors.forEach(function (doctor) {
          var workHours = [];
          if (doctor.workHours) {
            doctor.workHours.forEach(function (day, dayIndex) {
              if (day) {
                day.forEach(function (interval) {
                  workHours.push({ start: interval.start, end: interval.end, dow: [dayIndex] });
                });
              } else {
                workHours.push({ start: "00:00", end: "00:00", dow: [dayIndex] });
              }
            });
          }
          var color = doctor.color || randomMC.getColor();
          calResources.push({
            id:           doctor._id,
            title:        (doctor.profile.firstName || "") + " " + (doctor.profile.lastName || ""),
            picture:      doctor.profile.picture,
            email:        doctor.emails && doctor.emails[0] && doctor.emails[0].address,
            color:        color,
            eventColor:   color,
            specialties:  doctor.specialties,
            businessHours: workHours,
          });
        });
        callback(calResources);
      },
      resourceRender: function (resource, labelTds) {
        labelTds.find(".fc-cell-text").css("display", "block");
        var pictureUrl = "https://cdn4.iconfinder.com/data/icons/medical-14/512/9-128.png";
        if (resource.picture) {
          var img = Images.findOne({ _id: resource.picture });
          if (img) pictureUrl = img.link();
        } else if (resource.email) {
          pictureUrl = Gravatar.imageUrl(resource.email, { secure: true, size: 28, default: pictureUrl });
        }
        var imgHtml = '<img class="profile-pic cal-resource-pic" style="border-color:' +
          resource.color + '" src="' + Handlebars.escapeExpression(pictureUrl) + '">';
        labelTds.find(".fc-cell-content").prepend(imgHtml);

        var html = Handlebars.escapeExpression(resource.title) + "<br><small>";
        if (resource.specialties && resource.specialties.length) {
          html += Handlebars.escapeExpression(resource.specialties.join(", "));
        } else {
          html += t("schedule_no-specialties");
        }
        html += "</small>";
        labelTds.find(".fc-cell-text").html(html);
      },
      events: eventSourceFn,
    });
  }

  // ---------------------------------------------------------------------------
  // CSV import (Papa Parse)
  // ---------------------------------------------------------------------------
  var REQUIRED_FIELDS = ["name", "gender", "mobile"];
  var DATE_FIELDS = ["dateOfBirth", "returnDate", "createdAt"];

  function initImport() {
    var $file   = $("#import-csv-file");
    var $parse  = $("#import-parse-btn");
    var parsedRows = [];

    $file.off("change.rip").on("change.rip", function () {
      $parse.prop("disabled", !this.files || !this.files[0]);
    });

    $parse.off("click.rip").on("click.rip", function () {
      var file = $file[0].files && $file[0].files[0];
      if (!file) return;
      if (typeof Papa === "undefined") {
        toastr.error("Papa Parse não carregado", t("common_error"));
        return;
      }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          parsedRows = results.data;
          showPreview(parsedRows, results.meta.fields || []);
        },
        error: function (err) {
          toastr.error(err.message, t("common_error"));
        }
      });
    });

    function showPreview(rows, fields) {
      var errors = [];
      rows.forEach(function (row, i) {
        REQUIRED_FIELDS.forEach(function (f) {
          if (!row[f]) errors.push("Linha " + (i + 2) + ": campo obrigatório ausente — " + f);
        });
      });

      var $errPanel = $("#import-errors-panel");
      if (errors.length) {
        var $list = $("#import-errors-list").empty();
        errors.forEach(function (e) { $list.append("<li>" + e + "</li>"); });
        $errPanel.show();
        $("#import-confirm-btn").prop("disabled", true);
      } else {
        $errPanel.hide();
        $("#import-confirm-btn").prop("disabled", false);
      }

      // Preview table (first 20 rows)
      var cols = (fields.length ? fields : Object.keys(rows[0] || {})).slice(0, 12);
      var thead = "<tr>" + cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr>";
      var tbody = rows.slice(0, 20).map(function (row) {
        return "<tr>" + cols.map(function (c) {
          return "<td style='white-space:nowrap;font-size:11px'>" + (row[c] || "") + "</td>";
        }).join("") + "</tr>";
      }).join("");

      $("#import-preview-wrap").html(
        '<table class="table table-bordered table-hover table-condensed"><thead>' + thead +
        '</thead><tbody>' + tbody + "</tbody></table>"
      );
      $("#import-info-msg").text(rows.length + " paciente(s) encontrado(s). " +
        (rows.length > 20 ? "Mostrando os primeiros 20." : ""));

      $("#import-step-upload").hide();
      $("#import-step-preview").show();
    }

    $("#import-back-btn").off("click.rip").on("click.rip", function () {
      $("#import-step-preview").hide();
      $("#import-step-upload").show();
      parsedRows = [];
    });

    $("#import-confirm-btn").off("click.rip").on("click.rip", function () {
      var imported = 0;
      parsedRows.forEach(function (row) {
        var doc = {};
        Object.keys(row).forEach(function (k) {
          if (!row[k]) return;
          if (DATE_FIELDS.indexOf(k) >= 0) {
            var d = moment(row[k]);
            if (d.isValid()) doc[k] = d.toDate();
          } else if (k === "special_prescription") {
            doc[k] = row[k] === "true" || row[k] === "1";
          } else {
            doc[k] = row[k];
          }
        });
        if (doc.name && doc.gender) {
          doc.createdAt = doc.createdAt || new Date();
          Patients.insert(doc);
          imported++;
        }
      });
      $("#import-step-preview").hide();
      $("#import-done-msg").text(imported + " paciente(s) importado(s) com sucesso!");
      $("#import-step-done").show();
    });
  }

  global._afterRender = function (routeName, params, query) {
    params = params || {};
    query  = query  || {};
    if (routeName === "dashboard")    renderDashboard();
    if (routeName === "patientList")  initPatientList();
    if (routeName === "drugList")     initDrugList();
    if (routeName === "icd10List")    initIcd10List();
    if (routeName === "specialtyList") initSpecialtyList();
    if (routeName === "doctorList")   initDoctorList();
    if (routeName === "schedule")          initSchedule();
    if (routeName === "examCatalogList")   initExamCatalogList();
    if (routeName === "documentModelList") initDocumentModelList();
    if (routeName === "formModelsList")    initFormModelsList();
    if (routeName === "patientCreate")        initPatientForm(null);
    if (routeName === "patientEdit")          initPatientForm(params && params.id);
    if (routeName === "specialtyCreate")      initSpecialtyForm(null);
    if (routeName === "specialtyEdit")        initSpecialtyForm(params && params.id);
    if (routeName === "examCatalogCreate")    initExamCatalogForm(null);
    if (routeName === "examCatalogEdit")      initExamCatalogForm(params && params.id);
    if (routeName === "drugCreate")           initDrugForm(null);
    if (routeName === "drugEdit")             initDrugForm(params && params.id);
    if (routeName === "doctorEdit")           initDoctorForm(params && params.id);
    if (routeName === "documentModelCreate")  initDocumentModelForm(null);
    if (routeName === "documentModelEdit")    initDocumentModelForm(params && params.id);
    if (routeName === "formModelsCreate")     initFormModelsForm(null);
    if (routeName === "formModelsEdit")       initFormModelsForm(params && params.id);
    if (routeName === "reportAppointments")   initReportAppointments();
    if (routeName === "reportPatients")       initReportPatients();
    if (routeName === "reportProduction")     initReportProduction();
    if (routeName === "settingsForm")         initSettingsForm();
    if (routeName === "import")              initImport();
    if (routeName === "users")               initUserList();
    if (routeName === "logout")              doLogout();
  };

  // ---------------------------------------------------------------------------
  // Login splash — fake auth (accepts hardcoded credentials or any input in demo)
  // ---------------------------------------------------------------------------
  var DEMO_EMAIL = "leo.lima.web@gmail.com";
  var DEMO_PASS  = "123456";

  function doLogout() {
    // Show "Saindo…" for 2 s before transitioning back to the login splash
    setTimeout(function () {
      var app    = document.getElementById("app");
      var splash = document.getElementById("login-splash");
      if (app)    { app.style.transition = "opacity 0.3s"; app.style.opacity = "0";
        setTimeout(function () { app.style.display = "none"; app.style.opacity = ""; app.innerHTML = ""; }, 320); }
      if (splash) { setTimeout(function () { splash.style.display = ""; }, 350); }
      var $pw = document.getElementById("login-password");
      if ($pw) $pw.value = "";
    }, 2000);
  }

  function doLogin() {
    var email = (document.getElementById("login-email") || {}).value || "";
    var pass  = (document.getElementById("login-password") || {}).value || "";
    var valid = (email === DEMO_EMAIL && pass === DEMO_PASS);
    if (!valid) {
      var $alert = document.getElementById("login-alert");
      if ($alert) $alert.style.display = "";
      return;
    }
    // Hide splash, show app, boot
    var splash = document.getElementById("login-splash");
    var app    = document.getElementById("app");
    if (splash) { splash.style.transition = "opacity 0.3s"; splash.style.opacity = "0"; setTimeout(function() { splash.style.display = "none"; }, 320); }
    if (app)    app.style.display = "";
    init();
  }

  function bootLoginSplash() {
    var $btn  = document.getElementById("login-btn");
    var $form = document.getElementById("at-pwd-form");
    if ($btn)  $btn.addEventListener("click", doLogin);
    if ($form) $form.addEventListener("submit", function(e) { e.preventDefault(); doLogin(); });
  }

  if (document.readyState !== "loading") bootLoginSplash();
  else document.addEventListener("DOMContentLoaded", bootLoginSplash);
})(window);
