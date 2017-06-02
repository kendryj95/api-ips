$(document).foundation();
Foundation.Abide.defaults.patterns['expiration_date'] = /^([2-9]{1}?[0-9]{3,}?\/(0[1-9]{1}?|1[0-2]{1}?))$/;

var datesInputs = document.getElementsByClassName('cc_expiration_date');
for (var i = datesInputs.length - 1; i >= 0; i--) {
	var picker = new Pikaday({
		field: datesInputs[i],
		format: 'YYYY/MM',
		minDate: moment().toDate(),
		maxDate: moment().add(5, 'years').toDate()
	});
}