module.exports = {
	new: require('../static/new_sale'),
	pay: {
		creditcard: require('../payments/paypal/creditcard/'),
		paypal: {
			prepare: require('../payments/paypal/paypal/prepare'),
			execute: require('../payments/paypal/paypal/execute')
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