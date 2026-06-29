Settings = new Mongo.Collection('settings');

var schema = {
  // notifications: {
  //   type: String,
  //   label: function() {
  //     return TAPi18n.__('settings_clinic-notifications');
  //   },
  //   autoform: {
  //     placeholder: function() {
  //       return TAPi18n.__('settings_clinic-notifications-placeholder');
  //     }
  //   }
  // },
  workHoursStart: {
    type: String,
    max: 5,
    label: function() {
      return TAPi18n.__('settings_clinic-workhours-start');
    },
  },
  workHoursEnd: {
    type: String,
    max: 5,
    label: function() {
      return TAPi18n.__('settings_clinic-workhours-end');
    },
  },
  slotDuration: {
    type: Number,
    optional: true,
    min: 1,
    label: function() {
      return TAPi18n.__('settings_slot-duration');
    },
    autoform: {
      placeholder: '20'
    }
  },
  appointmentValue: {
    type: Number,
    decimal: true,
    optional: true,
    min: 0,
    label: function() {
      return TAPi18n.__('settings_appointment-value');
    },
    autoform: {
      placeholder: '250,00'
    }
  },
  address: {
    type: String,
    label: function() {
      return TAPi18n.__('settings_clinic-address');
    },
    autoform: {
      type: 'textarea',
      rows: 6
    }
  },
};

Settings.attachSchema(new SimpleSchema(schema));

if (Meteor.isServer) {
  Settings.allow({
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
