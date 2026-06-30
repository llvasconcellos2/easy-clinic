PatientExams = new Mongo.Collection('patient-exams');

PatientExams.before.insert(function (userId, doc) {
  doc.createdAt = new Date();
  doc.createdBy = userId;
});

var schema = {
  patientId: {
    type: String
  },
  laboratory: {
    type: String,
    trim: true,
    optional: true
  },
  datePerformed: {
    type: Date
  },
  createdAt: {
    type: Date,
    optional: true
  },
  createdBy: {
    type: String,
    optional: true
  },
  results: {
    type: [Object],
    blackbox: true
  }
};

PatientExams.attachSchema(new SimpleSchema(schema));

if (Meteor.isServer) {
  // All writes go through the role-gated savePatientExam method (server-side
  // inserts bypass allow/deny). Deny every client-originated write so the
  // open client connection cannot tamper with patients' exam history.
  PatientExams.allow({
    insert: function (userId, doc) {
      return false;
    },
    update: function (userId, doc, fieldNames, modifier) {
      return false;
    },
    remove: function (userId, doc) {
      return false;
    }
  });
}
