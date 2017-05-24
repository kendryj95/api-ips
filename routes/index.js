var express = require('express')
var router = express.Router()

const sales = require('./sales')

//router.post('/v1/paypal/payment/new/creditcard', require('./creditcard').paypal)

router.post('/token', require('./tokens').new)

router.post('/v1/sales', sales.new)

router.post('/v1/sales/pay/creditcard', sales.pay.creditcard)

router.post('/v1/sales/pay/paypal', sales.pay.paypal)

module.exports = router