ExamCatalog = new Mongo.Collection('exam-catalog');

ExamCatalog.before.insert(function (userId, doc) {
  doc.createdAt = new Date();
  doc.createdBy = userId;
  if (typeof doc.usageCount === 'undefined') {
    doc.usageCount = 0;
  }
});

var schema = {
  name: {
    type: String,
    trim: true,
    max: 100
  },
  unit: {
    type: String,
    trim: true,
    max: 30,
    optional: true
  },
  usageCount: {
    type: Number,
    defaultValue: 0,
    optional: true,
    autoform: {
      type: 'hidden'
    }
  },
  createdAt: {
    type: Date,
    optional: true,
    autoform: {
      omit: true
    }
  },
  createdBy: {
    type: String,
    optional: true,
    autoform: {
      omit: true
    }
  },
  referenceRules: {
    type: [Object],
    optional: true
  },
  'referenceRules.$.gender': {
    type: String,
    allowedValues: ['todos', 'M', 'F'],
    defaultValue: 'todos'
  },
  'referenceRules.$.ageMin': {
    type: Number,
    optional: true
  },
  'referenceRules.$.ageMax': {
    type: Number,
    optional: true
  },
  'referenceRules.$.min': {
    type: Number,
    decimal: true,
    optional: true
  },
  'referenceRules.$.max': {
    type: Number,
    decimal: true,
    optional: true
  },
  'referenceRules.$.displayText': {
    type: String,
    optional: true
  }
};

if (Meteor.isClient) {
  schema.name.label = function () { return TAPi18n.__('exam-catalog_name'); };
  schema.unit.label = function () { return TAPi18n.__('exam-catalog_unit'); };
  schema.referenceRules.label = function () { return TAPi18n.__('exam-catalog_reference-rules'); };

  schema['referenceRules.$.gender'].label = function () { return TAPi18n.__('exam-catalog_rule-gender'); };
  schema['referenceRules.$.gender'].autoform = {
    options: function () {
      return [
        { value: 'todos', label: TAPi18n.__('exam-catalog_gender-all') },
        { value: 'M', label: TAPi18n.__('schemas.patients.gender.M') },
        { value: 'F', label: TAPi18n.__('schemas.patients.gender.F') }
      ];
    }
  };
  schema['referenceRules.$.ageMin'].label = function () { return TAPi18n.__('exam-catalog_rule-age-min'); };
  schema['referenceRules.$.ageMax'].label = function () { return TAPi18n.__('exam-catalog_rule-age-max'); };
  schema['referenceRules.$.min'].label = function () { return TAPi18n.__('exam-catalog_rule-min'); };
  schema['referenceRules.$.max'].label = function () { return TAPi18n.__('exam-catalog_rule-max'); };
  schema['referenceRules.$.displayText'].label = function () { return TAPi18n.__('exam-catalog_rule-display-text'); };
}

ExamCatalog.attachSchema(new SimpleSchema(schema));

if (Meteor.isServer) {
  ExamCatalog._ensureIndex({ name: 1 });

  // The catalog CRUD writes client-side via autoform, so gate the allow rules
  // on the same roles the Settings menu is exposed to (a logged-out userId
  // makes Roles.userIsInRole return false, so login is required too).
  var canManageCatalog = function (userId) {
    return Roles.userIsInRole(userId, ['super-admin', 'administration', 'medical_doctor']);
  };
  ExamCatalog.allow({
    insert: function (userId, doc) {
      return canManageCatalog(userId);
    },
    update: function (userId, doc, fieldNames, modifier) {
      return canManageCatalog(userId);
    },
    remove: function (userId, doc) {
      return canManageCatalog(userId);
    }
  });
}
