$(window).on('load', function() { // makes sure the whole site is loaded 
	$('.loader').fadeOut(); // will first fade out the loading animation 
	$('#preloader').delay(350).fadeOut('slow'); // will fade out the white DIV that covers the website. 
	$('body').delay(350).css({'overflow':'visible'});
})

function irse(){

	window.setTimeout(function(){
		window.location.href = 'http://localhost/insignia/ips';
	}, 02000); // dos segundos

	return
}

$(document).foundation();
//Foundation.Abide.defaults.patterns['expiration_date'] = /^([2-9]{1}?[0-9]{3,}?\/(0[1-9]{1}?|1[0-2]{1}?))$/;

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

	$(document).on('invalid.zf.abide', function(ev,el) {
		alert('Por favor complete el formulario correctamente.');
	});

	$('#stripe_form_bitcoin').submit(function(e){
		e.preventDefault();
		
		$('#stripe_form_bitcoin').on('formvalid.zf.abide', function(ev,frm) {

			$('#stripe_form_bitcoin button[type="submit"]').text('Cargando...').attr('disabled','disabled');

			var $btc_email        = $('#bitcoin_owner_email').val(),
					$email_consumidor = $('#email').val(),
					$phone_consumidor = $('#telephone').val(),
					$purchase         = $('#btc_purchase').val(),
					$redirect_url     = $('#btc_redirect_url').val(),
					$token            = $('#btc_token').val();

			$.post('/v1/sales/pay/stripe/bitcoin/prepare', {
				purchase: $purchase,
				token: $token,
				redirect_url: $redirect_url,
				email: $email_consumidor,
				telephone: $phone_consumidor,
				bitcoin_owner_email: $btc_email
			}).done(function(data){
				$('#btc_price').text(parseInt(data.res.bitcoin.amount)/100000000);
				$('#btc_address').text(data.res.bitcoin.address);
				$('#btc_email_client').text(data.client.email),
				$('#btc_wallet').attr('href', data.res.bitcoin.uri);
				$('#bitcoin_result').foundation('open');

				$('#stripe_form_bitcoin button[type="submit"]').text('Procesar pago con stripe').removeAttr('disabled');
			}).fail(function(xhr, status, error){
				console.log(error);
				console.log(status);
				console.log(xhr);
				alert(error);
					
				$('#stripe_form_bitcoin button[type="submit"]').text('Procesar pago con stripe').removeAttr('disabled');
			});

		});

	});

});