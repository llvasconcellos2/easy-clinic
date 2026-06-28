Template.reportAppointments.events({});

Template.reportAppointments.helpers({
	reactiveDataFunction: function () {
		return function () {
			return Appointments.find().fetch();
		};
	},
	optionsObject: {
		columns: [{
			title: T9n.get('groupMD'),
			data: 'user.name'
		},{
			title: T9n.get('patient'),
			data: 'patient.name'
		},{
			title: T9n.get('start'),
			data: 'start',
			render: function(cellData, renderType, currentRow) {
				return moment(cellData).format('DD/MM/YYYY HH:mm');
			}
		},{
			title: T9n.get('end'),
			data: 'end',
			render: function(cellData, renderType, currentRow) {
				if(cellData){
					return moment(cellData).format('DD/MM/YYYY HH:mm');
				}
			}
		},{
			title: T9n.get('time'),
			data: 'end',
			render: function(cellData, renderType, currentRow) {
				if(cellData){
					return moment.duration(moment(cellData).diff(currentRow.start)).humanize();
					//return .humanize();
				}
			}
		},{
			title: T9n.get('status'),
			data: 'status',
			render: function(cellData, renderType, currentRow) {
				var statusMap = {
					're-scheduled': { key: 'apptRescheduled', cls: 'warning' },
					'in_progress':  { key: 'apptInProgress',  cls: 'info' },
					'completed':    { key: 'apptCompleted',   cls: 'primary' },
					'no_show':      { key: 'apptNoShow',       cls: 'danger' }
				};
				var s = statusMap[cellData];
				if(!s){ return ''; }
				return '<span class="label label-' + s.cls + '">' + T9n.get(s.key) + '</span>';
			}
		}]
	}
});

Template.reportAppointments.onCreated(function () {});

Template.reportAppointments.onRendered(function () {
	//$(document).ready(function(){});
});

Template.reportAppointments.onDestroyed(function () {});
