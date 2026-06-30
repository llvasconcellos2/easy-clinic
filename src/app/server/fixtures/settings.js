if (Settings.find().count() === 0) {
	// Single clinic-wide settings document: working hours, appointment slot
	// duration (minutes) and default value (BRL), and the printed address.
	Settings.insert({
		workHoursStart: '05:00',
		workHoursEnd: '23:00',
		slotDuration: 30,
		appointmentValue: 250,
		address: '<p>Av Rio Branco, 547 - sala 705</p><p>Centro - Florianópolis - SC</p>'
	});
}
