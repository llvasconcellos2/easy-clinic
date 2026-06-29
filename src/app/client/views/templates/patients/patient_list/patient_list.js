Template.patientList.events({
  "click .new-record": (event, template) => {
    FlowRouter.go("patientCreate");
  },
});

Template.patientList.helpers({
  reactiveDataFunction: function () {
    return function () {
      return Patients.find().fetch();
    };
  },
  optionsObject: function () {
    return {
      columns: [
        {
          title: "",
          //width: '1%',
          data: "picture",
          orderable: false,
          render: function (cellData, renderType, currentRow) {
            var url = "/avatar.jpg";
            if (cellData) {
              var image = Images.findOne({ _id: cellData });
              if (image) {
                // Relative URL so images load from any host (phone/LAN), not just localhost
                url = image.link().replace(/^https?:\/\/[^\/]+/i, "");
              }
            } else {
              if (currentRow.email) {
                url = Gravatar.imageUrl(currentRow.email, {
                  secure: true,
                  size: 28,
                  default: url,
                });
              }
            }
            return '<img class="profile-pic" src="' + url + '">';
          },
        },
        {
          title: T9n.get("name"),
          data: "name",
        },
        {
          // envelope icon lives in the header now, not on every row — frees
          // horizontal room so the patient name can stay on a single line
          title: '<i class="fa fa-envelope"></i> Email',
          data: "email",
          render: function (cellData, renderType, currentRow) {
            return cellData || "";
          },
        },
        {
          title: T9n.get("dateOfBirth"),
          data: "dateOfBirth",
          render: function (cellData, renderType, currentRow) {
            return cellData ? moment(cellData).format("DD/MM/YYYY") : "";
          },
        },
        {
          data: "_id",
          render: function (cellData, renderType, currentRow) {
            return (
              '<a class="btn btn-info" href="' +
              FlowRouter.path("patientEdit", { _id: cellData }) +
              '"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i></a>'
            );
          },
        },
      ],
    };
  },
});

Template.patientList.onCreated(function () {});

Template.patientList.onRendered(function () {
  var table = this.data.dataTable;
  $(document).ready(function () {
    $("#patients-table tbody").on("click", "tr", function () {
      var rowData = table.row(this).data();
      FlowRouter.go("patientEdit", { _id: rowData._id });
    });
  });
});

Template.patientList.onDestroyed(function () {});
