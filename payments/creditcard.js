const paypal = require('paypal-rest-sdk')
const moment = require('moment')

module.exports = {
	paypal: function(req, res) {

		if (req.body && req.body.purchase && req.body.redirect_url) {
			require('../config/setup')

			const purchase = JSON.parse(req.body.purchase)
			const payer = {
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				address: req.body.address,
				city: req.body.city,
				state: req.body.state,
				postal_code: req.body.postal_code,
				country: req.body.country,
				cc: {
					cc_type: req.body.cc_type,
					cc_number: req.body.cc_number,
					cc_expiration_date: req.body.cc_expiration_date,
					cc_cvv: req.body.cc_cvv
				}
			}
			const redirect_url = req.body.redirect_url
			const token_encoded = req.body.token

			const token = require('../enviroments/token').getTokenDecoded(token_encoded)
			if (token.error) {
				res.status(500).json({
					"status": 500, "message":
					"Something went wrong, please try again later.",
					"error_code": 10 
				})
				return
			}

			try {

				let expire_month = moment(payer.cc.cc_expiration_date).format('MM')
				let expire_year = moment(payer.cc.cc_expiration_date).format('YYYY')

				const create_payment = {
					"intent": "sale",
					"payer": {
						"payment_method": "credit_card",
						"funding_instruments": [{
							"credit_card": {
								"type": payer.cc.cc_type,
								"number": payer.cc.cc_number,
								"expire_month": expire_month,
								"expire_year": expire_year,
								"cvv2": payer.cc.cc_cvv,
								"first_name": payer.first_name,
								"last_name": payer.last_name,
								"billing_address": {
									"line1": payer.address,
									"city": payer.city,
									"state": payer.state,
									"postal_code": payer.postal_code,
									"country_code": payer.country
								}
							}
						}]
					},
					"transactions": [{
						"amount": {
							"total": purchase.total,
							"currency": purchase.currency
						},
						"description": "IPS purchase. TOTAL:"+purchase.total+"_FROM:"+redirect_url+"_PAY_METHOD:PAYPAL_CREDIT_CARD"
					}]
				}
				
				paypal.payment.create(create_payment, function(err, payment){
					if (err) {
						res.status(err.httpStatusCode).json({ "paypal_error": err, "error_code": 8 })
						console.log(err)
						return
					}

					require('../db/payment').new_save(token, purchase, payer, payment)
					res.status(payment.httpStatusCode).json(payment)
				})

			} catch (e) {
				res.status(400).json({ "status": 400, "error": "Credit card data or purcharse info not provided", "error_code": 7, "original_error": e })
				console.log(e)
				return
			}

		} else {
			res.status(400).json({
				"status": 400,
				"message": "Request body does not exist."
			})
		}
	}
}