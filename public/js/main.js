$(window).on('load', function() { // makes sure the whole site is loaded 
	$('#status').fadeOut(); // will first fade out the loading animation 
	$('#preloader').delay(350).fadeOut('slow'); // will fade out the white DIV that covers the website. 
	$('body').delay(350).css({'overflow':'visible'});
})

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


$(function(){

	// Stripe credit card
	$('#stripe_form_creditcard').on('submit', function(e){
		e.preventDefault();

		console.log('Hola');

	});
});