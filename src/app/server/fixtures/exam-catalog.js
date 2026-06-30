if (ExamCatalog.find().count() === 0) {
	// A small seed of common exams with adult reference rules (ages in MONTHS).
	// Doctors grow this catalog organically as they enter results.
	var exams = [
		{ name: 'Hemoglobina', unit: 'g/dL', referenceRules: [
			{ gender: 'M', ageMin: 192, ageMax: 1200, min: 13, max: 17, displayText: '13 - 17 g/dL' },
			{ gender: 'F', ageMin: 192, ageMax: 1200, min: 12, max: 16, displayText: '12 - 16 g/dL' }
		]},
		{ name: 'Hematócrito', unit: '%', referenceRules: [
			{ gender: 'M', ageMin: 192, ageMax: 1200, min: 40, max: 52, displayText: '40 - 52 %' },
			{ gender: 'F', ageMin: 192, ageMax: 1200, min: 36, max: 48, displayText: '36 - 48 %' }
		]},
		{ name: 'Leucócitos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 4000, max: 11000, displayText: '4.000 - 11.000 /mm³' }
		]},
		{ name: 'Plaquetas', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 150000, max: 450000, displayText: '150.000 - 450.000 /mm³' }
		]},
		{ name: 'Glicose (jejum)', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 70, max: 99, displayText: '70 - 99 mg/dL' }
		]},
		{ name: 'Colesterol Total', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 190, displayText: '< 190 mg/dL' }
		]},
		{ name: 'HDL', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 40, displayText: '> 40 mg/dL' }
		]},
		{ name: 'LDL', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 130, displayText: '< 130 mg/dL' }
		]},
		{ name: 'Triglicerídeos', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 150, displayText: '< 150 mg/dL' }
		]},
		{ name: 'Ureia', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 15, max: 40, displayText: '15 - 40 mg/dL' }
		]},
		{ name: 'Creatinina', unit: 'mg/dL', referenceRules: [
			{ gender: 'M', min: 0.7, max: 1.3, displayText: '0,7 - 1,3 mg/dL' },
			{ gender: 'F', min: 0.6, max: 1.1, displayText: '0,6 - 1,1 mg/dL' }
		]},
		{ name: 'TSH', unit: 'µUI/mL', referenceRules: [
			{ gender: 'todos', min: 0.4, max: 4.5, displayText: '0,4 - 4,5 µUI/mL' }
		]},
		{ name: 'T4 Livre', unit: 'ng/dL', referenceRules: [
			{ gender: 'todos', min: 0.7, max: 1.8, displayText: '0,7 - 1,8 ng/dL' }
		]},
		{ name: 'TGO (AST)', unit: 'U/L', referenceRules: [
			{ gender: 'todos', max: 40, displayText: '< 40 U/L' }
		]},
		{ name: 'TGP (ALT)', unit: 'U/L', referenceRules: [
			{ gender: 'todos', max: 41, displayText: '< 41 U/L' }
		]}
	];

	_.each(exams, function (doc) {
		doc.usageCount = 0;
		ExamCatalog.insert(doc);
	});
}
