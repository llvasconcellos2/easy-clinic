Appointments = new Mongo.Collection('appointments');

var schema = {
  'patient._id': {
    type: String,
    trim: true
  },
  'patient.name': {
    type: String,
    trim: true
  },
  start: {
  	type: Date
  },
  end: {
  	type: Date,
    optional: true
  },
  'user._id': {
    type: String,
    trim: true
  },
  'user.name': {
    type: String,
    trim: true
  },
  status: {
    type: String,
    allowedValues: ['re-scheduled', 'in_progress', 'completed', 'no_show'],
    optional: true
  }
};

Appointments.attachSchema(new SimpleSchema(schema));

if (Meteor.isServer) {
  Appointments.allow({
    insert: function (userId, doc) {
      return true;
    },

    update: function (userId, doc, fieldNames, modifier) {
      return true;
    },

    remove: function (userId, doc) {
      return true;
    }
  });
}