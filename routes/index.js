const express = require('express')
const router = express.Router()
const paypal = require('paypal-rest-sdk')
const querystring = require('querystring')

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

router.get('/sales/success', (req, res) => {

	if (req.query || req.query.url || req.query.paymentId) {

		const url = req.query.url
		const paymentId = req.query.paymentId

		const redirect = `${url}?paymentId=${paymentId}`

		res.status(201).render('success', {
			title: 'New payment was successfully approved',
			redirect_url: redirect,
			noEscape: true
		})

	} else {
		res.redirect('/page-not-found')
	}
})

module.exports = router