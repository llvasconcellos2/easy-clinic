Template.examCatalogForm.events({
	'click .new-record': function (event, template) {
		FlowRouter.go('examCatalogCreate');
	}
});

Template.examCatalogForm.helpers({
	saveButton: function () {
		return Spacebars.SafeString('<i class="fa fa-floppy-o" aria-hidden="true"></i> ' + TAPi18n.__('common_save'));
	},
	isEditForm: function () {
		return (FlowRouter.getParam('_id')) ? true : false;
	},
	record: function () {
		var record = ExamCatalog.findOne({ _id: FlowRouter.getParam('_id') });
		Template.instance().data.examCatalog = record;
		return record;
	}
});

Template.examCatalogForm.onCreated(function () {
	AutoForm.addHooks('examCatalogForm', {
		onSuccess: function (formType, result) {
			toastr['success'](TAPi18n.__('common_save-success'), TAPi18n.__('common_success'));
			FlowRouter.go('examCatalogList');
		},
		onError: function (formType, error) {
			toastr['error'](error.message, TAPi18n.__('common_error'));
		}
	});
});

Template.examCatalogForm.onRendered(function () {
	var data = this.data;

	$(document).ready(function () {
		var submitParent = $('.exam-catalog-form button[type=submit]').parent();
		submitParent.addClass('text-right');
		if (data.examCatalog) {
			var deleteBtn = $.parseHTML('<button class="btn btn-danger delete-btn" type="button"><i class="fa fa-trash" aria-hidden="true"></i></button>');
			$(deleteBtn).prependTo(submitParent);
			$(deleteBtn).click(function (event) {
				swal({
					title: TAPi18n.__('common_areYouSure'),
					text: TAPi18n.__('common_deleteConfirmation', data.examCatalog.name),
					type: "warning",
					showCancelButton: true,
					confirmButtonColor: "#ed5565",
					confirmButtonText: TAPi18n.__('common_confirm')
				}, function () {
					ExamCatalog.remove(data.examCatalog._id, function (error, result) {
						if (error) {
							toastr['error'](error.message, TAPi18n.__('common_error'));
						} else {
							toastr['success'](TAPi18n.__('common_deleteSuccess'), TAPi18n.__('common_success'));
						}
					});
					FlowRouter.go('examCatalogList');
				});
			});
		}
	});
});

Template.examCatalogForm.onDestroyed(function () {
	AutoForm.resetForm('examCatalogForm');
});
