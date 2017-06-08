const express = require('express')
const router = express.Router()
const paypal = require('paypal-rest-sdk')
const querystring = require('querystring')

const sales = require('./sales')
const result = require('./result')

router.post('/token', require('./tokens').new)

router.post('/v1/sales', sales.new)

router.post('/v1/sales/pay/creditcard', sales.pay.creditcard)

router.post('/v1/sales/pay/paypal', sales.pay.paypal.prepare)

router.post('/v1/sales/pay/stripe/creditcard', sales.pay.stripe.creditcard)

router.post('/v1/sales/pay/stripe/bitcoin/prepare', sales.pay.stripe.bitcoin.prepare)

router.get('/sales/pay/stripe/bitcoin/process', sales.pay.stripe.bitcoin.process)

router.get('/sales/proceed/paypal/success', sales.pay.paypal.execute)

router.get('/sales/proceed/paypal/cancel', result.showCancel)

router.get('/sales/success', result.showSuccess)

router.all('/stripe/webhooks', function(req, res){

	console.log('==========================================================')
	console.log('S T R I P E   W E B   H O O K')
	console.log('==========================================================')

	if (req.body) {
		const webhook = req.body

		console.log(webhook.type)
		console.log(webhook.data.type)

		if (webhook.type === 'source.chargeable' && webhook.data.type === 'bitcoin') {
			console.log('chargeable')
		}
	}
})

module.exports = router