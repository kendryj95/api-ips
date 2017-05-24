const paypal = require('paypal-rest-sdk')

module.exports = function(req, res) {
	const base_url = 'http://localhost:3030/v1/sales'

	if (req.body.token && req.body.purchase && req.body.redirect_url) {
		
		// paypal configuration
		require('../config/setup')

		const purchase = JSON.parse(req.body.purchase)
		const redirect_url = req.body.redirect_url

		const encoded_token = req.body.token
		const token = require('../enviroments/token').getTokenDecoded(encoded_token)
		if (token.error) {
			res.status(500).json({
				"status": 500, "message":
				"Something went wrong, please try again later.",
				"error_code": 10 
			})
			return
		}

		try {

			const create_payment_json = {
				"intent": "sale",
				"payer": {
					"payment_method": "paypal"
				},
				"redirect_urls": {
					"return_url": "https://google.com",
					"cancel_url": "https://facebook.com"
				},
				"transactions": [{
					"item_list": {
						"items": [{
							"name": "item",
							"sku": "item",
							"price": "1.00",
							"currency": "USD",
							"quantity": 1
						}]
					},
					"amount": {
						"currency": "USD",
						"total": "1.00"
					},
					"description": "This is the payment description."
				}]
			}

			paypal.payment.create(create_payment_json, function (error, payment) {
				if (error) {
					throw error
				} else {
					console.log("Create Payment Response")
					console.log(payment)
					res.json(payment)
				}
			})

		} catch (e) {
			res.status(400).json({ "status": 400, "error": "Credit card data or purchase info not provided", "error_code": 7, "original_error": e })
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