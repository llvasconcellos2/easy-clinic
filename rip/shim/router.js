/*
 * router.js — hash-based router (FlowRouter-compatible surface).
 * Maps  #/route  →  page template name  →  renders content partial.
 *
 * Usage pattern from app JS:
 *   FlowRouter.go('patientList')
 *   FlowRouter.getParam('_id')
 *   FlowRouter.current().route.name
 */
(function (global) {
  "use strict";

  // Route table: hash path prefix → template name (matches rip/templates/content-*.hbs)
  var ROUTES = [
    { path: "dashboard",          name: "dashboard" },
    { path: "patients/create",    name: "patientCreate" },
    { path: "patients/:id",       name: "patientEdit" },
    { path: "patients",           name: "patientList" },
    { path: "schedule",           name: "schedule" },
    { path: "doctors/:id",              name: "doctorEdit",           template: "doctorForm" },
    { path: "doctors",                  name: "doctorList" },
    { path: "drugs/create",             name: "drugCreate",           template: "drugForm" },
    { path: "drugs/:id",                name: "drugEdit",             template: "drugForm" },
    { path: "drugs",                    name: "drugList" },
    { path: "icd10",                    name: "icd10List" },
    { path: "specialties/create",       name: "specialtyCreate",      template: "specialtyForm" },
    { path: "specialties/:id",          name: "specialtyEdit",        template: "specialtyForm" },
    { path: "specialties",              name: "specialtyList" },
    { path: "exam-catalog/create",      name: "examCatalogCreate",    template: "examCatalogForm" },
    { path: "exam-catalog/:id",         name: "examCatalogEdit",      template: "examCatalogForm" },
    { path: "exam-catalog",             name: "examCatalogList" },
    { path: "document-models/create",   name: "documentModelCreate",  template: "documentModelForm" },
    { path: "document-models/:id",      name: "documentModelEdit",    template: "documentModelForm" },
    { path: "document-models",          name: "documentModelList" },
    { path: "form-models/create",       name: "formModelsCreate",     template: "formModelsForm" },
    { path: "form-models/:id",          name: "formModelsEdit",       template: "formModelsForm" },
    { path: "form-models",              name: "formModelsList" },
    { path: "reports/appointments", name: "reportAppointments" },
    { path: "reports/patients",   name: "reportPatients" },
    { path: "reports/production", name: "reportProduction" },
    { path: "settings",           name: "settingsForm" },
    { path: "users",              name: "users" },
    { path: "import",             name: "import" },
    { path: "logout",             name: "logout" },
    { path: "",                   name: "dashboard" },  // fallback
  ];

  var _current = { path: "dashboard", name: "dashboard", params: {} };
  var _routeHandlers = {};     // name → fn(params)
  var _templateCache = {};     // template text cache
  var _unsaved = false;        // unsaved-changes guard

  // ---------------------------------------------------------------------------
  // Path parsing
  // ---------------------------------------------------------------------------
  function parsePath(hash) {
    // "#/patients/abc123?tab=records" → { path: "patients/abc123", query: "tab=records" }
    var raw = (hash || "").replace(/^#\/?/, "");
    var qIdx = raw.indexOf("?");
    var query = qIdx >= 0 ? raw.slice(qIdx + 1) : "";
    var path = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    return { path: path, query: query };
  }

  function matchRoute(path) {
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i];
      var pattern = r.path;
      // parametric segment: "patients/:id"
      if (pattern.indexOf(":") >= 0) {
        var re = new RegExp("^" + pattern.replace(/:([^/]+)/g, "([^/]+)") + "$");
        var m = path.match(re);
        if (m) {
          var paramNames = (pattern.match(/:([^/]+)/g) || []).map(function (p) { return p.slice(1); });
          var params = {};
          paramNames.forEach(function (n, idx) { params[n] = m[idx + 1]; });
          return { name: r.name, template: r.template || r.name, params: params };
        }
      } else if (path === pattern || (pattern === "" && path === "")) {
        return { name: r.name, template: r.template || r.name, params: {} };
      }
    }
    return { name: "dashboard", template: "dashboard", params: {} };
  }

  function parseQuery(qs) {
    var q = {};
    if (!qs) return q;
    qs.split("&").forEach(function (p) {
      var kv = p.split("=");
      if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });
    return q;
  }

  // ---------------------------------------------------------------------------
  // Template loading & rendering
  // ---------------------------------------------------------------------------
  var BASE = (function () {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      var m = scripts[i].src.match(/^(https?:\/\/[^/]+)/);
      if (m) return m[1];
    }
    return "";
  })();

  function loadTemplate(name) {
    if (_templateCache[name]) return Promise.resolve(_templateCache[name]);
    return fetch(BASE + "/templates/content-" + name + ".hbs")
      .then(function (r) {
        if (!r.ok) throw new Error("template not found: content-" + name + ".hbs");
        return r.text();
      })
      .then(function (src) { _templateCache[name] = src; return src; });
  }

  // preprocess is defined in shim.js — guard against load-order issues
  function pp(src) { return global.preprocess ? global.preprocess(src) : src; }

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderContent(templateName, routeName, params, query) {
    loadTemplate(templateName).then(function (src) {
      var tpl = Handlebars.compile(pp(src));
      var ctx = global._buildContext ? global._buildContext(routeName, params, query) : { params: params };
      // innerHTML is intentional: templates are same-origin .hbs files we author;
      // Handlebars escapes {{ }} expressions by default (only {{{ }}} is raw).
      document.getElementById("page-content").innerHTML = tpl(ctx);
      if (global._afterRender) global._afterRender(routeName, params, query);
    }).catch(function (e) {
      document.getElementById("page-content").innerHTML =
        '<div class="wrapper wrapper-content"><div class="row"><div class="col-lg-12">' +
        '<div class="ibox"><div class="ibox-content"><p class="text-danger">' +
        escHtml(e.message) + "</p></div></div></div></div></div>";
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  function navigate(hash) {
    if (_unsaved) {
      if (!confirm("Há alterações não salvas. Deseja sair mesmo assim?")) return;
      _unsaved = false;
    }
    var parsed = parsePath(hash);
    var matched = matchRoute(parsed.path);
    var query = parseQuery(parsed.query);

    _current = { path: parsed.path, name: matched.name, params: matched.params, query: query };

    // Update active state in sidebar
    var $links = $("#side-menu a");
    $links.closest("li").removeClass("active");
    $links.each(function () {
      var href = $(this).attr("href") || "";
      if (href === hash || href === "#/" + parsed.path) {
        $(this).closest("li").addClass("active");
      }
    });

    renderContent(matched.template, matched.name, matched.params, query);

    // Fire registered handler if any
    if (_routeHandlers[matched.name]) {
      try { _routeHandlers[matched.name](matched.params, query); } catch (e) {}
    }
  }

  window.addEventListener("hashchange", function () { navigate(location.hash); });

  // ---------------------------------------------------------------------------
  // FlowRouter surface
  // ---------------------------------------------------------------------------
  var routePaths = {
    dashboard:         "#/dashboard",
    schedule:          "#/schedule",
    patientCreate:     "#/patients/create",
    patientList:       "#/patients",
    patientEdit:       "#/patients",
    doctorList:           "#/doctors",
    doctorEdit:           "#/doctors",
    icd10List:            "#/icd10",
    drugList:             "#/drugs",
    drugCreate:           "#/drugs/create",
    drugEdit:             "#/drugs",
    reportAppointments:   "#/reports/appointments",
    reportPatients:       "#/reports/patients",
    reportProduction:     "#/reports/production",
    settingsForm:         "#/settings",
    specialtyList:        "#/specialties",
    specialtyCreate:      "#/specialties/create",
    specialtyEdit:        "#/specialties",
    examCatalogList:      "#/exam-catalog",
    examCatalogCreate:    "#/exam-catalog/create",
    examCatalogEdit:      "#/exam-catalog",
    documentModelList:    "#/document-models",
    documentModelCreate:  "#/document-models/create",
    documentModelEdit:    "#/document-models",
    formModelsList:       "#/form-models",
    formModelsCreate:     "#/form-models/create",
    formModelsEdit:       "#/form-models",
    users:                "#/users",
    import:               "#/import",
    logout:               "#/logout",
  };

  global.FlowRouter = {
    go: function (routeNameOrPath, params) {
      var base = routePaths[routeNameOrPath] || ("#/" + routeNameOrPath);
      var hash = base;
      if (params && params._id) hash += "/" + params._id;
      location.hash = hash;
    },
    path: function (name, params) {
      var base = routePaths[name] || ("#/" + name);
      if (params && params._id) base += "/" + params._id;
      return base;
    },
    getParam: function (k) { return _current.params[k] || null; },
    getQueryParam: function (k) { return (_current.query || {})[k] || null; },
    current: function () {
      return { route: { name: _current.name }, path: "#/" + _current.path };
    },
    triggers: { enter: function () {}, exit: function () {} },
    route: function () {},
    group: function () { return { route: function () {} }; },
    onHandleChange: function (fn) { _routeHandlers["*"] = fn; },
  };

  global.Router = {
    onRoute: function (name, fn) { _routeHandlers[name] = fn; },
    navigate: navigate,
    // Called by shim.js init() after the app frame (#page-content) is in the DOM.
    // Never boot automatically — the router must not run before the user logs in.
    boot: function () {
      var hash = location.hash || "#/dashboard";
      navigate(hash);
    },
    current: function () { return _current; },
    setUnsaved: function (v) { _unsaved = v; },
  };

})(window);
