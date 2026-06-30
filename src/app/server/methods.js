Meteor.methods({
	updateUser: function (userId, newPassword, data) {
		if(Roles.userIsInRole(Meteor.userId(), 'super-admin')) {
			if (userId){
				var user = Meteor.users.findOne({_id: userId});
				if((user.emails[0].address === 'leo.lima.web@gmail.com') && 
					(Meteor.userId() != userId)){
					throw new Meteor.Error(TAPi18n.__('common_access-denied'), TAPi18n.__('common_access-denied-message'));
				}
				Meteor.users.update(userId, {$set: data});
				if (newPassword) {
					Accounts.setPassword(userId, newPassword);
				}
				Roles.setUserRoles(userId, []);
				Roles.addUsersToRoles(userId, ['default', data['profile.group']]);
				if(data["isSuperAdmin"]){
					Roles.addUsersToRoles(userId, ['super-admin']);
				}
			}
			else {
				 var userId = Accounts.createUser({
					email : data['emails.0.address'],
					password : newPassword,
					profile  : {
						firstName: data['profile.firstName'],
						lastName: data['profile.lastName'],
						group: data['profile.group'],
						language: data['profile.language']
					},
				});
				Roles.addUsersToRoles(userId, ['default', data['profile.group']]);
				if(data["isSuperAdmin"]){
					Roles.addUsersToRoles(userId, ['super-admin']);
				}
				Meteor.users.update(userId, {$set: {
					isUserEnabled: data["isUserEnabled"],
					isSuperAdmin: data["isSuperAdmin"]
				}});
				Accounts.sendEnrollmentEmail(userId);
			}
		}
		else {
			throw new Meteor.Error(TAPi18n.__('common_access-denied'), TAPi18n.__('common_access-denied-message'));
		}
		return TAPi18n.__('common_save-success');
	},
	doctorSpecialtyHours: function (userId, data) {
		if(!Roles.userIsInRole(Meteor.userId(), 'super-admin')) {
			throw new Meteor.Error(TAPi18n.__('common_access-denied'), TAPi18n.__('common_access-denied-message'));
			return;
		}
		if (userId) {
			Meteor.users.update(userId, {$set: data});
		}
		return TAPi18n.__('common_save-success');
	},
	testPatientImport: function(data) {
		check(data, Array);
		var errors = [];
		for ( let i = 0; i < data.length; i++ ) {
			let item   = data[ i ];
			try {
				ImportPatients.insert(item);
			}
			catch(e){
				if(e.sanitizedError) {
					errors[i] = {details: e.sanitizedError.details, message: e.message};
				}
				else {
					throw error;
				}
			}
		}
		ImportPatients.remove({});
		return errors;
	},
	patientImport: function(data) {
		check(data, Array);
		for ( let i = 0; i < data.length; i++ ) {
			let item   = data[ i ];
			try{
				if(item['picture']) {
					var picture = item['picture'];
					if(item['picture'].indexOf('mime64:/') != -1) {
						picture = picture.replace('mime64:/', '');
					}
					item['picture'] = null;
					var patient = Patients.insert(item);
					Patients.addPicture(picture, patient);
				}
				else {
					Patients.insert(item);
				}
			}
			catch(e) {
				console.log(e.message);
			}
		}
		return TAPi18n.__('common_save-success');
	},
	doMapReduce: function(patientId){
		var map = function () {
			emit(this.date, this);
		};

		var reduce = function (key, value) {
			var records = [];
			for(var i = 0; i < value.length; i++ ){
				records.push(value[i].record);
			}
			return {
				date: value.date, 
				patientId: value.patientId, 
				records: records
			};
		};

		var rawPatientRecords = PatientRecords.rawCollection();

		var syncMapReduce = Meteor.wrapAsync(rawPatientRecords.mapReduce, rawPatientRecords);

		var CollectionName = syncMapReduce(map, reduce, {
			out : {inline: 1},
		 	sort : {date : 1}
		});

		// db.getCollection('patient-records').mapReduce(function(){
		// 	emit(this.date, this);
		// }, function(key, value){
		// 	var records = [];
		// 	for(var i = 0; i < value.length; i++ ){
		// 		records.push(value[i].record);
		// 	}
		// 	return {date: value.date, patientId: value.patientId, records: records};
		// }, {
		// 	out : {inline: 1} ,
		// 	//query : {type : 2} , 
		// 	sort : {date : 1}
		// });

		return CollectionName;
	},
	searchExamCatalog: function (term, gender, ageMonths) {
		check(term, String);
		if (term.length > 64) {
			return [];
		}
		// escape regex metacharacters so the user term is matched literally
		// (prevents NoSQL regex injection / catastrophic-backtracking ReDoS).
		// An empty term yields an empty regex that matches every exam, so the
		// pipeline returns the top entries by usageCount (popular suggestions).
		var safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		var age = (typeof ageMonths === 'number') ? ageMonths : -1;
		var raw = ExamCatalog.rawCollection();
		var aggregate = Meteor.wrapAsync(raw.aggregate, raw);
		var pipeline = [
			{ $match: { name: { $regex: safeTerm, $options: 'i' } } },
			{ $project: {
				name: 1,
				unit: 1,
				usageCount: 1,
				applicableRules: {
					$filter: {
						input: { $ifNull: ['$referenceRules', []] },
						as: 'rule',
						cond: {
							$and: [
								{ $or: [
									{ $eq: ['$$rule.gender', 'todos'] },
									{ $eq: ['$$rule.gender', gender] }
								]},
								{ $or: [
									{ $eq: [{ $ifNull: ['$$rule.ageMin', null] }, null] },
									{ $lte: ['$$rule.ageMin', age] }
								]},
								{ $or: [
									{ $eq: [{ $ifNull: ['$$rule.ageMax', null] }, null] },
									{ $gte: ['$$rule.ageMax', age] }
								]}
							]
						}
					}
				}
			}},
			{ $sort: { usageCount: -1 } },
			{ $limit: 5 }
		];
		return aggregate(pipeline, {}) || [];
	},
	savePatientExam: function (patientId, doc) {
		check(patientId, String);
		check(doc, Object);
		if (!Roles.userIsInRole(Meteor.userId(), ['medical_doctor', 'super-admin'])) {
			throw new Meteor.Error(TAPi18n.__('common_access-denied'), TAPi18n.__('common_access-denied-message'));
		}

		var results = doc.results || [];

		// persist the exam set with the reference text used INLINE, so later
		// edits to the global catalog never rewrite this patient's history
		PatientExams.insert({
			patientId: patientId,
			laboratory: doc.laboratory || '',
			datePerformed: doc.datePerformed ? new Date(doc.datePerformed) : new Date(),
			results: results.map(function (r) {
				return {
					examName: r.examName,
					value: (typeof r.value === 'undefined' || r.value === null) ? '' : String(r.value),
					referenceUsed: r.referenceUsed || '',
					unit: r.unit || '',
					isAltered: !!r.isAltered
				};
			})
		});

		// let the catalog learn: bump usage, keep the unit fresh, and when the
		// doctor typed a brand-new exam (or a manual reference for one that has
		// no rules yet) capture a parsed reference rule for future autocomplete
		results.forEach(function (r) {
			if (!r.examName) {
				return;
			}
			var existing = ExamCatalog.findOne({ name: r.examName });
			if (existing) {
				var mod = { $inc: { usageCount: 1 } };
				if (r.unit) {
					mod.$set = { unit: r.unit };
				}
				ExamCatalog.update(existing._id, mod);
				var hasRules = existing.referenceRules && existing.referenceRules.length > 0;
				if (!r.matched && r.referenceUsed && !hasRules) {
					ExamCatalog.update(existing._id, { $push: { referenceRules: parseReferenceText(r.referenceUsed) } });
				}
			} else {
				var newDoc = { name: r.examName, unit: r.unit || '', usageCount: 1, referenceRules: [] };
				if (r.referenceUsed) {
					newDoc.referenceRules = [parseReferenceText(r.referenceUsed)];
				}
				ExamCatalog.insert(newDoc);
			}
		});

		return TAPi18n.__('common_save-success');
	}
});

// Turn a free-text reference ("13 - 17", "até 200", "> 30") into a catalog
// reference rule (spec section 4.1). Two numbers -> min/max; one number ->
// keyword scan decides whether it is a ceiling (max) or a floor (min).
parseReferenceText = function (text) {
	var rule = { gender: 'todos', displayText: text || '' };
	if (!text) {
		return rule;
	}
	var matches = text.match(/\d+(?:[.,]\d+)?/g) || [];
	var nums = matches.map(function (n) { return parseFloat(n.replace(',', '.')); });
	if (nums.length >= 2) {
		rule.min = Math.min(nums[0], nums[1]);
		rule.max = Math.max(nums[0], nums[1]);
	} else if (nums.length === 1) {
		var lower = text.toLowerCase();
		if (/[<≤]|menor|at[eé]|inferior|abaixo/.test(lower)) {
			rule.max = nums[0];
		} else if (/[>≥]|maior|superior|acima|m[ií]nimo/.test(lower)) {
			rule.min = nums[0];
		} else {
			rule.max = nums[0];
		}
	}
	return rule;
};