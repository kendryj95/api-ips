const paypal = require('paypal-rest-sdk')
const mercadopago = require("mercadopago")
const stripe = 'sk_test_tiSsqbggNf43GNkK49vVrTfR'

//CREDENCIALES DE PRODUCCIÓN
/*paypal.configure({
	'mode'          : 'live',
	'client_id'     : 'AQDW_HcZMnc4CxqN4F8BIeVMX5bEC1DeGX-v8tb8KP6mTzdtza-xRvaD4wylJPM--gnZk4Js7Oj6JJOw',
	'client_secret' : 'EMhktjPKkNQhJNQo7A0mziujZcHY-HjBzNxfx_hlCGAl_zuAeFVqnlR7QU2oYywWZllITH2HxAE0nyf4'
})*/


// CREDENCIALES DE SANDBOX
/*paypal.configure({
	'mode'          : 'live',
	'client_id'     : 'AeZYNNQ3sjoXRyO6lCfSUHmMYEBgL9fUN1b0_7-Ts6cXZ4VwvsoP_cyfQX-vJVPmWXNAYufS0Zce6DKL',
	'client_secret' : 'ELBJZoXKpZix2eNz_K3Km0NjVvtgfpjgnQ1wUhP_k-xiy2FN1MfqUnllhM6fjtuAi3552LZKKzH9GzAX'
})*/

// CREDENCIALES DE SANDBOX
/*paypal.configure({
	'mode'          : 'sandbox',
	'client_id'     : 'AYdVxAu3gwaTAcv4qU07-KjHNGS8EnwUEJL0IUxZFz1KWmKZMLeuppa18ddkfq7ZMgigwqVm4_BJOnM5',
	'client_secret' : 'ENg97Je9d0uQwaqHfnppKIla4-jIpYTgXqL29ZzmhVmU-k0loX3ewsQ7d6a5_VO-Do9sWGeMeKNx1V8J'
})*/

paypal.configure({
	'mode'          : 'sandbox',
	'client_id'     : 'ASKPFVO7LvoZSRbGPr5wk2jj6CpO6rm2ynY8XUpzYB5niyyTeLqqcb-7ArN9OqIUcgfTD8IfcDjHcuUV',
	'client_secret' : 'EEVAJ2R_qmfIvkSCawle3dAI73zkkhgzmDba020PWaZvKZSd8Gd5o34i7a0GJhZdElxMnF4NJbsLkmdK'
})

module.exports = { paypal, stripe, mercadopago }