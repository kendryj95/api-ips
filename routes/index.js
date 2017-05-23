var express = require('express')
var router = express.Router()

//router.post('/v1/paypal/payment/new/creditcard', require('./creditcard').paypal)

router.post('/token', require('./tokens').new)

router.post('/sales', require('./sales').new)

router.post('/sales/pay/creditcard', require('./sales').pay.creditcard)

module.exports = router