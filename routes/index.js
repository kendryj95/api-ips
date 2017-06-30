const express                      = require('express')
const router                       = express.Router()
const paypal                       = require('paypal-rest-sdk')
const querystring                  = require('querystring')

const sales                        = require('./sales')
const result                       = require('./result')
const validatePhoneNumber          = require('../middlewares/validatePhoneNumber')

router.post('/token', require('./tokens').new)

router.route('/v1/sales', [ validatePhoneNumber ]).post(sales.new).get(sales.new)

router.post('/v1/sales/pay/creditcard', sales.pay.creditcard)

router.post('/v1/sales/pay/paypal', sales.pay.paypal.prepare)

router.post('/v1/sales/pay/stripe/creditcard', sales.pay.stripe.creditcard)

router.post('/v1/sales/pay/stripe/bitcoin/prepare', sales.pay.stripe.bitcoin.prepare)

router.get('/sales/pay/stripe/bitcoin/execute', sales.pay.stripe.bitcoin.execute)

router.get('/sales/proceed/paypal/success', sales.pay.paypal.execute)

router.get('/sales/proceed/paypal/cancel', result.showCancel)

router.get('/sales/success', result.showSuccess)

router.post('/stripe/webhook', require('../payments/stripe/webhook/'))

router.post('/paypal/webhook', require('../payments/paypal/webhook/'))

router.get('/enviroment', (re, res) => {
	const enviroment = process.env.enviroment

	if (enviroment) {
		var env = null

		switch (enviroment) {
			case 'PRODUCTION':
				env = { env: enviroment }
			break
			case 'DEVELOPMENT':
				env = { env: enviroment }
			break
		}

		res.status(200).json(env)
	} else {
		res.status(500).json({
			error: 'No se ha establecido un entorno de ejecucion (PRODUCTION o DEVELOPMENT)'
		})
	}
})

module.exports = router