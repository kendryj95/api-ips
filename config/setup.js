const paypal = require('paypal-rest-sdk')
const stripe = 'sk_test_Hk47JU23LNp1hB0UtgCnGMNH'

paypal.configure({
	'mode'          : 'sandbox',
	'client_id'     : 'AYdVxAu3gwaTAcv4qU07-KjHNGS8EnwUEJL0IUxZFz1KWmKZMLeuppa18ddkfq7ZMgigwqVm4_BJOnM5',
	'client_secret' : 'ENg97Je9d0uQwaqHfnppKIla4-jIpYTgXqL29ZzmhVmU-k0loX3ewsQ7d6a5_VO-Do9sWGeMeKNx1V8J'
})

module.exports = { paypal, stripe }