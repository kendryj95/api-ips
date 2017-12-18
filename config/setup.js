const paypal = require('paypal-rest-sdk')
const stripe = 'sk_test_Hk47JU23LNp1hB0UtgCnGMNH'

//CREDENCIALES DE PRODUCCIÓN
paypal.configure({
	'mode'          : 'live',
	'client_id'     : 'AQDW_HcZMnc4CxqN4F8BIeVMX5bEC1DeGX-v8tb8KP6mTzdtza-xRvaD4wylJPM--gnZk4Js7Oj6JJOw',
	'client_secret' : 'EMhktjPKkNQhJNQo7A0mziujZcHY-HjBzNxfx_hlCGAl_zuAeFVqnlR7QU2oYywWZllITH2HxAE0nyf4'
})

// CREDENCIALES DE SANDBOX
/*paypal.configure({
	'mode'          : 'sandbox',
	'client_id'     : 'AYdVxAu3gwaTAcv4qU07-KjHNGS8EnwUEJL0IUxZFz1KWmKZMLeuppa18ddkfq7ZMgigwqVm4_BJOnM5',
	'client_secret' : 'ENg97Je9d0uQwaqHfnppKIla4-jIpYTgXqL29ZzmhVmU-k0loX3ewsQ7d6a5_VO-Do9sWGeMeKNx1V8J'
})*/

module.exports = { paypal, stripe }