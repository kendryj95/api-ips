var express = require('express')
var router = express.Router()

router.post('/v1/paypal/payment/new/creditcard', require('./creditcard').paypal)

router.post('/token', require('./tokens').new)

module.exports = router