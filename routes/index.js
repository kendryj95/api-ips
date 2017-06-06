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

router.get('/sales/proceed/paypal/success', sales.pay.paypal.execute)

router.get('/sales/proceed/paypal/cancel', result.showCancel)

router.get('/sales/success', result.showSuccess)

router.all('/stripe/webhooks', function(req, res){
	console.log(req.body)
})

module.exports = router