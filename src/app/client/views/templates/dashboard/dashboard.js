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
