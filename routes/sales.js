module.exports = {
	new: require('./new_sale'),
	pay: {
		creditcard: require('../payments/creditcard').paypal,
		paypal: {
			prepare: require('../payments/paypal').prepare,
			execute: require('../payments/paypal').execute
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