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

router.get('/sales/pay/stripe/bitcoin/execute', sales.pay.stripe.bitcoin.execute)

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

		console.log(webhook.data)

	}

})

/*
{ 
	id: 'evt_1ARn9QIN4Xtac0jNqZHObC2f',
	object: 'event',
	api_version: '2017-06-05',
	created: 1496776536,
	data: { 
		object: { 
			id: 'src_1ARn9QIN4Xtac0jNweOnkisC',
			object: 'source',
			amount: null,
			client_secret: 'src_client_secret_dvd6g4rNtT1wpiWaZ1gcdnXG',
			created: 1496776536,
			currency: null,
			flow: 'none',
			livemode: false,
			metadata: {},
			owner: [Object],
			status: 'chargeable',
			type: 'card',
			usage: 'reusable',
			card: [Object] 
		} 
	},
	livemode: false,
	pending_webhooks: 1,
	request: { 
		id: 'req_AnNvidYIzQPaj3', 
		idempotency_key: null 
	},
	type: 'source.chargeable' 
}*/

module.exports = router