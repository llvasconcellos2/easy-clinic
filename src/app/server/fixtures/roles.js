if (Meteor.roles.find().count() === 0) {
	// Base roles used by alanning:roles. `default` is granted to every user,
	// `medical_doctor` is the doctor profile group, and `super-admin` gates the
	// privileged operations in server/methods.js. The users fixture also grants
	// these via Roles.addUsersToRoles; seeding them here keeps the role list
	// populated even before any user exists.
	var roles = ['default', 'medical_doctor', 'super-admin'];

	_.each(roles, function (name) {
		Roles.createRole(name);
	});
}
