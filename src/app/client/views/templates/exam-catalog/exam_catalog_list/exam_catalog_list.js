Template.examCatalogList.events({
	'click .new-record': function (event, template) {
		FlowRouter.go('examCatalogCreate');
	}
});

Template.examCatalogList.helpers({
	reactiveDataFunction: function () {
		return function () {
			return ExamCatalog.find().fetch();
		};
	},
	optionsObject: function () {
		return {
			order: [[0, 'asc']],
			columns: [{
				title: TAPi18n.__('exam-catalog_name'),
				data: 'name'
			}, {
				title: TAPi18n.__('exam-catalog_unit'),
				data: 'unit',
				defaultContent: ''
			}, {
				title: TAPi18n.__('exam-catalog_usage-count'),
				data: 'usageCount',
				defaultContent: '0'
			}, {
				data: '_id',
				orderable: false,
				render: function (cellData, renderType, currentRow) {
					return '<a class="btn btn-info" href="' + FlowRouter.path('examCatalogEdit', { _id: cellData }) + '"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i></a>';
				}
			}]
		};
	}
});

Template.examCatalogList.onCreated(function () {});

Template.examCatalogList.onRendered(function () {
	var table = this.data.dataTable;
	$(document).ready(function () {
		$('#exam-catalog-table tbody').on('click', 'tr', function () {
			var rowData = table.row(this).data();
			if (rowData) {
				FlowRouter.go('examCatalogEdit', { _id: rowData._id });
			}
		});
	});
});

Template.examCatalogList.onDestroyed(function () {});
