var express = require('express')
var router = express.Router()
const paypal = require('paypal-rest-sdk')

const sales = require('./sales')

router.post('/token', require('./tokens').new)

router.post('/v1/sales', sales.new)

router.post('/v1/sales/pay/creditcard', sales.pay.creditcard)

router.post('/v1/sales/pay/paypal', sales.pay.paypal.prepare)

router.get('/sales/proceed/paypal/success', sales.pay.paypal.execute)

router.get('/sales/proceed/paypal/cancel', function(req, res){
	console.log("req.query", req.query)
	res.json({ "error": "error" })
})

module.exports = router