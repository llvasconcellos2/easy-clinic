if (ExamCatalog.find().count() === 0) {
	// Curated catalog of common Brazilian outpatient lab exams with adult
	// reference ranges (and pediatric age bands where childhood differs).
	// Ages are stored in MONTHS so the gender+age matching engine can use them.
	// Reference values are typical adult intervals; doctors refine per lab/method
	// via the Settings CRUD, and the catalog also learns from manual entries.
	// displayText is pt-BR (decimal comma, "." thousands separator).
	var exams = [

		// ----- Hemograma -----
		{ name: 'Hemácias', unit: 'milhões/mm³', referenceRules: [
			{ gender: 'M', min: 4.5, max: 6.1, displayText: '4,5 - 6,1 milhões/mm³' },
			{ gender: 'F', min: 4.0, max: 5.4, displayText: '4,0 - 5,4 milhões/mm³' }
		]},
		{ name: 'Hemoglobina', unit: 'g/dL', referenceRules: [
			{ gender: 'todos', ageMin: 0, ageMax: 1, min: 13.5, max: 19.5, displayText: 'RN: 13,5 - 19,5 g/dL' },
			{ gender: 'todos', ageMin: 1, ageMax: 6, min: 9.5, max: 13.5, displayText: '1-6 meses: 9,5 - 13,5 g/dL' },
			{ gender: 'todos', ageMin: 6, ageMax: 24, min: 10.5, max: 13.5, displayText: '6-24 meses: 10,5 - 13,5 g/dL' },
			{ gender: 'todos', ageMin: 24, ageMax: 144, min: 11.5, max: 15.5, displayText: '2-12 anos: 11,5 - 15,5 g/dL' },
			{ gender: 'M', ageMin: 144, ageMax: 1500, min: 13.0, max: 17.0, displayText: '13,0 - 17,0 g/dL' },
			{ gender: 'F', ageMin: 144, ageMax: 1500, min: 12.0, max: 16.0, displayText: '12,0 - 16,0 g/dL' }
		]},
		{ name: 'Hematócrito', unit: '%', referenceRules: [
			{ gender: 'todos', ageMin: 0, ageMax: 1, min: 42, max: 60, displayText: 'RN: 42 - 60 %' },
			{ gender: 'todos', ageMin: 1, ageMax: 24, min: 29, max: 41, displayText: '1-24 meses: 29 - 41 %' },
			{ gender: 'todos', ageMin: 24, ageMax: 144, min: 34, max: 46, displayText: '2-12 anos: 34 - 46 %' },
			{ gender: 'M', ageMin: 144, ageMax: 1500, min: 40, max: 52, displayText: '40 - 52 %' },
			{ gender: 'F', ageMin: 144, ageMax: 1500, min: 36, max: 48, displayText: '36 - 48 %' }
		]},
		{ name: 'VCM', unit: 'fL', referenceRules: [
			{ gender: 'todos', min: 80, max: 100, displayText: '80 - 100 fL' }
		]},
		{ name: 'HCM', unit: 'pg', referenceRules: [
			{ gender: 'todos', min: 27, max: 32, displayText: '27 - 32 pg' }
		]},
		{ name: 'CHCM', unit: 'g/dL', referenceRules: [
			{ gender: 'todos', min: 32, max: 36, displayText: '32 - 36 g/dL' }
		]},
		{ name: 'RDW', unit: '%', referenceRules: [
			{ gender: 'todos', min: 11.5, max: 14.5, displayText: '11,5 - 14,5 %' }
		]},
		{ name: 'Leucócitos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', ageMin: 0, ageMax: 1, min: 9000, max: 30000, displayText: 'RN: 9.000 - 30.000 /mm³' },
			{ gender: 'todos', ageMin: 1, ageMax: 12, min: 6000, max: 17500, displayText: '1-12 meses: 6.000 - 17.500 /mm³' },
			{ gender: 'todos', ageMin: 12, ageMax: 144, min: 5000, max: 15000, displayText: '1-12 anos: 5.000 - 15.000 /mm³' },
			{ gender: 'todos', ageMin: 144, ageMax: 1500, min: 4000, max: 11000, displayText: '4.000 - 11.000 /mm³' }
		]},
		{ name: 'Neutrófilos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 1700, max: 7000, displayText: '1.700 - 7.000 /mm³' }
		]},
		{ name: 'Bastonetes', unit: '/mm³', referenceRules: [
			{ gender: 'todos', max: 840, displayText: 'até 840 /mm³' }
		]},
		{ name: 'Eosinófilos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 50, max: 500, displayText: '50 - 500 /mm³' }
		]},
		{ name: 'Basófilos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', max: 100, displayText: 'até 100 /mm³' }
		]},
		{ name: 'Linfócitos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 1000, max: 4000, displayText: '1.000 - 4.000 /mm³' }
		]},
		{ name: 'Monócitos', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 200, max: 1000, displayText: '200 - 1.000 /mm³' }
		]},
		{ name: 'Plaquetas', unit: '/mm³', referenceRules: [
			{ gender: 'todos', min: 150000, max: 450000, displayText: '150.000 - 450.000 /mm³' }
		]},
		{ name: 'VHS', unit: 'mm/h', referenceRules: [
			{ gender: 'M', max: 15, displayText: 'até 15 mm/h' },
			{ gender: 'F', max: 20, displayText: 'até 20 mm/h' }
		]},

		// ----- Glicemia / metabólico -----
		{ name: 'Glicose (jejum)', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 70, max: 99, displayText: '70 - 99 mg/dL' }
		]},
		{ name: 'Hemoglobina Glicada (HbA1c)', unit: '%', referenceRules: [
			{ gender: 'todos', max: 5.7, displayText: '< 5,7 %' }
		]},
		{ name: 'Insulina (jejum)', unit: 'µUI/mL', referenceRules: [
			{ gender: 'todos', min: 2.6, max: 24.9, displayText: '2,6 - 24,9 µUI/mL' }
		]},
		{ name: 'Frutosamina', unit: 'µmol/L', referenceRules: [
			{ gender: 'todos', min: 205, max: 285, displayText: '205 - 285 µmol/L' }
		]},

		// ----- Perfil lipídico -----
		{ name: 'Colesterol Total', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 190, displayText: '< 190 mg/dL' }
		]},
		{ name: 'HDL', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 40, displayText: '> 40 mg/dL' }
		]},
		{ name: 'LDL', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 130, displayText: '< 130 mg/dL' }
		]},
		{ name: 'VLDL', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 30, displayText: '< 30 mg/dL' }
		]},
		{ name: 'Triglicerídeos', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 150, displayText: '< 150 mg/dL' }
		]},
		{ name: 'Colesterol Não-HDL', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 160, displayText: '< 160 mg/dL' }
		]},

		// ----- Função renal -----
		{ name: 'Ureia', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 15, max: 40, displayText: '15 - 40 mg/dL' }
		]},
		{ name: 'Creatinina', unit: 'mg/dL', referenceRules: [
			{ gender: 'M', min: 0.7, max: 1.3, displayText: '0,7 - 1,3 mg/dL' },
			{ gender: 'F', min: 0.6, max: 1.1, displayText: '0,6 - 1,1 mg/dL' }
		]},
		{ name: 'Ácido Úrico', unit: 'mg/dL', referenceRules: [
			{ gender: 'M', min: 3.4, max: 7.0, displayText: '3,4 - 7,0 mg/dL' },
			{ gender: 'F', min: 2.4, max: 6.0, displayText: '2,4 - 6,0 mg/dL' }
		]},
		{ name: 'Microalbuminúria', unit: 'mg/24h', referenceRules: [
			{ gender: 'todos', max: 30, displayText: '< 30 mg/24h' }
		]},
		{ name: 'Cistatina C', unit: 'mg/L', referenceRules: [
			{ gender: 'todos', min: 0.5, max: 1.0, displayText: '0,5 - 1,0 mg/L' }
		]},

		// ----- Função hepática -----
		{ name: 'AST (TGO)', unit: 'U/L', referenceRules: [
			{ gender: 'todos', max: 40, displayText: '< 40 U/L' }
		]},
		{ name: 'ALT (TGP)', unit: 'U/L', referenceRules: [
			{ gender: 'todos', max: 41, displayText: '< 41 U/L' }
		]},
		{ name: 'Gama-GT', unit: 'U/L', referenceRules: [
			{ gender: 'M', min: 10, max: 71, displayText: '10 - 71 U/L' },
			{ gender: 'F', min: 6, max: 42, displayText: '6 - 42 U/L' }
		]},
		{ name: 'Fosfatase Alcalina', unit: 'U/L', referenceRules: [
			{ gender: 'todos', ageMin: 0, ageMax: 144, min: 100, max: 400, displayText: 'Criança: 100 - 400 U/L' },
			{ gender: 'todos', ageMin: 144, ageMax: 1500, min: 40, max: 129, displayText: 'Adulto: 40 - 129 U/L' }
		]},
		{ name: 'Bilirrubina Total', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 0.2, max: 1.2, displayText: '0,2 - 1,2 mg/dL' }
		]},
		{ name: 'Bilirrubina Direta', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', max: 0.3, displayText: '< 0,3 mg/dL' }
		]},
		{ name: 'Bilirrubina Indireta', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 0.1, max: 0.8, displayText: '0,1 - 0,8 mg/dL' }
		]},
		{ name: 'Albumina', unit: 'g/dL', referenceRules: [
			{ gender: 'todos', min: 3.5, max: 5.2, displayText: '3,5 - 5,2 g/dL' }
		]},
		{ name: 'Proteínas Totais', unit: 'g/dL', referenceRules: [
			{ gender: 'todos', min: 6.0, max: 8.0, displayText: '6,0 - 8,0 g/dL' }
		]},
		{ name: 'Globulinas', unit: 'g/dL', referenceRules: [
			{ gender: 'todos', min: 2.0, max: 4.0, displayText: '2,0 - 4,0 g/dL' }
		]},
		{ name: 'LDH', unit: 'U/L', referenceRules: [
			{ gender: 'todos', min: 120, max: 246, displayText: '120 - 246 U/L' }
		]},
		{ name: 'Amilase', unit: 'U/L', referenceRules: [
			{ gender: 'todos', min: 28, max: 100, displayText: '28 - 100 U/L' }
		]},
		{ name: 'Lipase', unit: 'U/L', referenceRules: [
			{ gender: 'todos', min: 13, max: 60, displayText: '13 - 60 U/L' }
		]},

		// ----- Eletrólitos / minerais -----
		{ name: 'Sódio', unit: 'mEq/L', referenceRules: [
			{ gender: 'todos', min: 135, max: 145, displayText: '135 - 145 mEq/L' }
		]},
		{ name: 'Potássio', unit: 'mEq/L', referenceRules: [
			{ gender: 'todos', min: 3.5, max: 5.1, displayText: '3,5 - 5,1 mEq/L' }
		]},
		{ name: 'Cloro', unit: 'mEq/L', referenceRules: [
			{ gender: 'todos', min: 98, max: 107, displayText: '98 - 107 mEq/L' }
		]},
		{ name: 'Cálcio Total', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 8.6, max: 10.2, displayText: '8,6 - 10,2 mg/dL' }
		]},
		{ name: 'Cálcio Iônico', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 4.6, max: 5.3, displayText: '4,6 - 5,3 mg/dL' }
		]},
		{ name: 'Fósforo', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', ageMin: 0, ageMax: 144, min: 4.0, max: 7.0, displayText: 'Criança: 4,0 - 7,0 mg/dL' },
			{ gender: 'todos', ageMin: 144, ageMax: 1500, min: 2.5, max: 4.5, displayText: 'Adulto: 2,5 - 4,5 mg/dL' }
		]},
		{ name: 'Magnésio', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 1.6, max: 2.6, displayText: '1,6 - 2,6 mg/dL' }
		]},
		{ name: 'Ferro Sérico', unit: 'µg/dL', referenceRules: [
			{ gender: 'M', min: 65, max: 175, displayText: '65 - 175 µg/dL' },
			{ gender: 'F', min: 50, max: 170, displayText: '50 - 170 µg/dL' }
		]},
		{ name: 'Ferritina', unit: 'ng/mL', referenceRules: [
			{ gender: 'M', min: 30, max: 400, displayText: '30 - 400 ng/mL' },
			{ gender: 'F', min: 13, max: 150, displayText: '13 - 150 ng/mL' }
		]},
		{ name: 'Transferrina', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 200, max: 360, displayText: '200 - 360 mg/dL' }
		]},
		{ name: 'Saturação de Transferrina', unit: '%', referenceRules: [
			{ gender: 'todos', min: 20, max: 50, displayText: '20 - 50 %' }
		]},
		{ name: 'Zinco', unit: 'µg/dL', referenceRules: [
			{ gender: 'todos', min: 70, max: 120, displayText: '70 - 120 µg/dL' }
		]},
		{ name: 'Cobre', unit: 'µg/dL', referenceRules: [
			{ gender: 'todos', min: 70, max: 140, displayText: '70 - 140 µg/dL' }
		]},

		// ----- Tireoide -----
		{ name: 'TSH', unit: 'µUI/mL', referenceRules: [
			{ gender: 'todos', min: 0.4, max: 4.5, displayText: '0,4 - 4,5 µUI/mL' }
		]},
		{ name: 'T4 Livre', unit: 'ng/dL', referenceRules: [
			{ gender: 'todos', min: 0.7, max: 1.8, displayText: '0,7 - 1,8 ng/dL' }
		]},
		{ name: 'T4 Total', unit: 'µg/dL', referenceRules: [
			{ gender: 'todos', min: 4.5, max: 12.0, displayText: '4,5 - 12,0 µg/dL' }
		]},
		{ name: 'T3 Total', unit: 'ng/dL', referenceRules: [
			{ gender: 'todos', min: 80, max: 200, displayText: '80 - 200 ng/dL' }
		]},
		{ name: 'T3 Livre', unit: 'pg/mL', referenceRules: [
			{ gender: 'todos', min: 2.3, max: 4.2, displayText: '2,3 - 4,2 pg/mL' }
		]},
		{ name: 'Anti-TPO', unit: 'UI/mL', referenceRules: [
			{ gender: 'todos', max: 34, displayText: '< 34 UI/mL' }
		]},
		{ name: 'Anti-Tireoglobulina', unit: 'UI/mL', referenceRules: [
			{ gender: 'todos', max: 115, displayText: '< 115 UI/mL' }
		]},

		// ----- Hormônios (faixa adulta; valores variam conforme fase/idade) -----
		{ name: 'FSH', unit: 'mUI/mL', referenceRules: [
			{ gender: 'M', min: 1.5, max: 12.4, displayText: '1,5 - 12,4 mUI/mL' },
			{ gender: 'F', min: 1.7, max: 134.8, displayText: 'Varia conforme fase do ciclo (1,7 - 134,8 mUI/mL)' }
		]},
		{ name: 'LH', unit: 'mUI/mL', referenceRules: [
			{ gender: 'M', min: 1.7, max: 8.6, displayText: '1,7 - 8,6 mUI/mL' },
			{ gender: 'F', min: 2.4, max: 56.6, displayText: 'Varia conforme fase do ciclo (2,4 - 56,6 mUI/mL)' }
		]},
		{ name: 'Estradiol', unit: 'pg/mL', referenceRules: [
			{ gender: 'M', min: 11, max: 44, displayText: '11 - 44 pg/mL' },
			{ gender: 'F', min: 12, max: 440, displayText: 'Varia conforme fase do ciclo (12 - 440 pg/mL)' }
		]},
		{ name: 'Progesterona', unit: 'ng/mL', referenceRules: [
			{ gender: 'M', min: 0.1, max: 0.8, displayText: '0,1 - 0,8 ng/mL' },
			{ gender: 'F', min: 0.1, max: 25.0, displayText: 'Varia conforme fase do ciclo (0,1 - 25 ng/mL)' }
		]},
		{ name: 'Prolactina', unit: 'ng/mL', referenceRules: [
			{ gender: 'M', min: 4.0, max: 15.2, displayText: '4,0 - 15,2 ng/mL' },
			{ gender: 'F', min: 4.8, max: 23.3, displayText: '4,8 - 23,3 ng/mL' }
		]},
		{ name: 'Testosterona Total', unit: 'ng/dL', referenceRules: [
			{ gender: 'M', min: 240, max: 870, displayText: '240 - 870 ng/dL' },
			{ gender: 'F', min: 14, max: 76, displayText: '14 - 76 ng/dL' }
		]},
		{ name: 'Testosterona Livre', unit: 'pg/mL', referenceRules: [
			{ gender: 'M', min: 50, max: 210, displayText: '50 - 210 pg/mL' },
			{ gender: 'F', min: 1.0, max: 8.5, displayText: '1,0 - 8,5 pg/mL' }
		]},
		{ name: 'SHBG', unit: 'nmol/L', referenceRules: [
			{ gender: 'M', min: 10, max: 57, displayText: '10 - 57 nmol/L' },
			{ gender: 'F', min: 18, max: 114, displayText: '18 - 114 nmol/L' }
		]},
		{ name: 'DHEA-S', unit: 'µg/dL', referenceRules: [
			{ gender: 'M', min: 80, max: 560, displayText: 'Varia conforme idade (80 - 560 µg/dL)' },
			{ gender: 'F', min: 35, max: 430, displayText: 'Varia conforme idade (35 - 430 µg/dL)' }
		]},
		{ name: 'Cortisol', unit: 'µg/dL', referenceRules: [
			{ gender: 'todos', min: 6.2, max: 19.4, displayText: 'Manhã: 6,2 - 19,4 µg/dL' }
		]},
		{ name: 'Paratormônio (PTH)', unit: 'pg/mL', referenceRules: [
			{ gender: 'todos', min: 15, max: 65, displayText: '15 - 65 pg/mL' }
		]},
		{ name: 'Beta-HCG', unit: 'mUI/mL', referenceRules: [
			{ gender: 'todos', max: 5, displayText: 'Não grávida: < 5 mUI/mL' }
		]},
		{ name: 'IGF-1', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', min: 90, max: 360, displayText: 'Varia conforme idade (90 - 360 ng/mL)' }
		]},

		// ----- Vitaminas -----
		{ name: 'Vitamina D (25-OH)', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', min: 30, max: 100, displayText: 'Suficiência: 30 - 100 ng/mL' }
		]},
		{ name: 'Vitamina B12', unit: 'pg/mL', referenceRules: [
			{ gender: 'todos', min: 200, max: 900, displayText: '200 - 900 pg/mL' }
		]},
		{ name: 'Ácido Fólico', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', min: 3.0, max: 17.0, displayText: '3,0 - 17,0 ng/mL' }
		]},

		// ----- Inflamatórios / cardíacos -----
		{ name: 'Proteína C Reativa', unit: 'mg/L', referenceRules: [
			{ gender: 'todos', max: 5, displayText: '< 5 mg/L' }
		]},
		{ name: 'PCR ultrassensível', unit: 'mg/L', referenceRules: [
			{ gender: 'todos', max: 1.0, displayText: 'Baixo risco: < 1,0 mg/L' }
		]},
		{ name: 'Fator Reumatoide', unit: 'UI/mL', referenceRules: [
			{ gender: 'todos', max: 14, displayText: '< 14 UI/mL' }
		]},
		{ name: 'ASLO', unit: 'UI/mL', referenceRules: [
			{ gender: 'todos', max: 200, displayText: '< 200 UI/mL' }
		]},
		{ name: 'CK (CPK)', unit: 'U/L', referenceRules: [
			{ gender: 'M', min: 39, max: 308, displayText: '39 - 308 U/L' },
			{ gender: 'F', min: 26, max: 192, displayText: '26 - 192 U/L' }
		]},
		{ name: 'CK-MB', unit: 'U/L', referenceRules: [
			{ gender: 'todos', max: 25, displayText: '< 25 U/L' }
		]},
		{ name: 'Homocisteína', unit: 'µmol/L', referenceRules: [
			{ gender: 'todos', min: 5, max: 15, displayText: '5 - 15 µmol/L' }
		]},
		{ name: 'Troponina', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', max: 0.04, displayText: '< 0,04 ng/mL' }
		]},

		// ----- Marcadores tumorais -----
		{ name: 'PSA Total', unit: 'ng/mL', referenceRules: [
			{ gender: 'M', ageMin: 0, ageMax: 600, max: 2.5, displayText: '< 50 anos: < 2,5 ng/mL' },
			{ gender: 'M', ageMin: 600, ageMax: 720, max: 3.5, displayText: '50-60 anos: < 3,5 ng/mL' },
			{ gender: 'M', ageMin: 720, ageMax: 840, max: 4.5, displayText: '60-70 anos: < 4,5 ng/mL' },
			{ gender: 'M', ageMin: 840, ageMax: 1500, max: 6.5, displayText: '> 70 anos: < 6,5 ng/mL' }
		]},
		{ name: 'PSA Livre', unit: 'ng/mL', referenceRules: [
			{ gender: 'M', displayText: 'Interpretar pela relação livre/total' }
		]},
		{ name: 'Relação PSA Livre/Total', unit: '%', referenceRules: [
			{ gender: 'M', min: 25, displayText: '> 25 % (menor risco)' }
		]},
		{ name: 'CA 125', unit: 'U/mL', referenceRules: [
			{ gender: 'todos', max: 35, displayText: '< 35 U/mL' }
		]},
		{ name: 'CA 19-9', unit: 'U/mL', referenceRules: [
			{ gender: 'todos', max: 37, displayText: '< 37 U/mL' }
		]},
		{ name: 'CA 15-3', unit: 'U/mL', referenceRules: [
			{ gender: 'todos', max: 31.3, displayText: '< 31,3 U/mL' }
		]},
		{ name: 'CEA', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', max: 5.0, displayText: 'Não fumante: < 5,0 ng/mL' }
		]},
		{ name: 'Alfafetoproteína', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', max: 10, displayText: '< 10 ng/mL' }
		]},

		// ----- Coagulação -----
		{ name: 'TP (INR)', unit: 'INR', referenceRules: [
			{ gender: 'todos', min: 0.9, max: 1.2, displayText: 'INR: 0,9 - 1,2' }
		]},
		{ name: 'TTPA', unit: 's', referenceRules: [
			{ gender: 'todos', min: 25, max: 37, displayText: '25 - 37 s' }
		]},
		{ name: 'Fibrinogênio', unit: 'mg/dL', referenceRules: [
			{ gender: 'todos', min: 200, max: 400, displayText: '200 - 400 mg/dL' }
		]},
		{ name: 'D-dímero', unit: 'ng/mL', referenceRules: [
			{ gender: 'todos', max: 500, displayText: '< 500 ng/mL' }
		]},

		// ----- Sorologias (qualitativo) -----
		{ name: 'Anti-HIV', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'HBsAg', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'Anti-HBs', unit: 'mUI/mL', referenceRules: [{ gender: 'todos', min: 10, displayText: 'Imune: > 10 mUI/mL' }] },
		{ name: 'Anti-HBc', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'Anti-HCV', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'VDRL', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'FTA-ABS', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'Anti-HAV IgM', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'Anti-HAV IgG', referenceRules: [{ gender: 'todos', displayText: 'Não reagente / Reagente (imune)' }] },
		{ name: 'Toxoplasmose IgM', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'Toxoplasmose IgG', referenceRules: [{ gender: 'todos', displayText: 'Não reagente / Reagente (imune)' }] },
		{ name: 'Rubéola IgM', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'Rubéola IgG', referenceRules: [{ gender: 'todos', displayText: 'Não reagente / Reagente (imune)' }] },
		{ name: 'CMV IgM', referenceRules: [{ gender: 'todos', displayText: 'Não reagente' }] },
		{ name: 'CMV IgG', referenceRules: [{ gender: 'todos', displayText: 'Não reagente / Reagente (imune)' }] },

		// ----- Urina / fezes / culturas (qualitativo) -----
		{ name: 'EAS (Urina Tipo I)', referenceRules: [{ gender: 'todos', displayText: 'Elementos anormais ausentes' }] },
		{ name: 'Urocultura', referenceRules: [{ gender: 'todos', displayText: 'Negativa (< 100.000 UFC/mL)' }] },
		{ name: 'Proteinúria 24h', unit: 'mg/24h', referenceRules: [{ gender: 'todos', max: 150, displayText: '< 150 mg/24h' }] },
		{ name: 'Parasitológico de Fezes (EPF)', referenceRules: [{ gender: 'todos', displayText: 'Ausência de parasitas' }] },
		{ name: 'Sangue Oculto nas Fezes', referenceRules: [{ gender: 'todos', displayText: 'Negativo' }] },
		{ name: 'Coprocultura', referenceRules: [{ gender: 'todos', displayText: 'Negativa / Flora normal' }] },

		// ----- Monitorização de fármacos / toxicologia -----
		{ name: 'Lítio', unit: 'mEq/L', referenceRules: [
			{ gender: 'todos', min: 0.6, max: 1.2, displayText: 'Terapêutico: 0,6 - 1,2 mEq/L' }
		]},
		{ name: 'Ácido Valproico', unit: 'µg/mL', referenceRules: [
			{ gender: 'todos', min: 50, max: 100, displayText: 'Terapêutico: 50 - 100 µg/mL' }
		]},
		{ name: 'Carbamazepina', unit: 'µg/mL', referenceRules: [
			{ gender: 'todos', min: 4, max: 12, displayText: 'Terapêutico: 4 - 12 µg/mL' }
		]},
		{ name: 'Chumbo (sangue)', unit: 'µg/dL', referenceRules: [
			{ gender: 'todos', max: 10, displayText: '< 10 µg/dL' }
		]}

	];

	_.each(exams, function (doc) {
		doc.usageCount = 0;
		ExamCatalog.insert(doc);
	});
}
