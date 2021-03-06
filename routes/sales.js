module.exports = {
	new: require('../static/new_sale'),
	pay: {
		creditcard: require('../payments/paypal/creditcard/'),
		paypal: {
			prepare: require('../payments/paypal/paypal/prepare'), // aqui estan cayendo los parametros de purchase 
			execute: require('../payments/paypal/paypal/execute')
		},
		mercadopago: {
			//prepare: require('../payments/mercadopago/checkout-buttons/basic-preference/button') // aqui estan cayendo los parametros de purchase 
			//execute: require('../payments/mercado/mercadopago/execute')
			controladorr: require("../payments/mercadopago/contr")
		},
		stripe: {
			creditcard: require('../payments/stripe/creditcard'),
			bitcoin: {
				prepare: require('../payments/stripe/bitcoin/prepare'),
				execute: require('../payments/stripe/bitcoin/execute')
			}
		}
	}
}
