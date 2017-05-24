const paypal = require('paypal-rest-sdk')

module.exports = {
	prepare: function(req, res) {
		const base_url = 'http://localhost:3030'

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

				let items = []

				purchase.products.forEach( o => {
					items.push({
						"name": o.name,
						"sku": o.key_name,
						"price": o.price,
						"currency": purchase.currency,
						"quantity": o.quantity
					})
				});

				const create_payment_json = {
					"intent": "sale",
					"payer": {
						"payment_method": "paypal"
					},
					"redirect_urls": {
						"return_url": 	base_url + "/sales/proceed/paypal/success",
						"cancel_url": base_url + "/sales/proceed/paypal/cancel"
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
						"description": "IPS purchase. TOTAL:"+purchase.total+"_FROM:"+redirect_url+"_PAY_METHOD:PAYPAL"
					}]
				}

				paypal.payment.create(create_payment_json, function (error, payment) {
					if (error) {
						res.json({ 
							"status": error.httpStatusCode,
							"message": "Something has happened, please try again later.",
							"error": error 
						})
						return
					} else {
						const links = {}

						// Handle links
						payment.links.forEach(function(linkObj){
							links[linkObj.rel] = {
								href: linkObj.href,
								method: linkObj.method
							}
						})

						// If redirect url present, redirect user
						if (links.hasOwnProperty('approval_url')) {
							// redirect
							res.redirect(links['approval_url'].href)
						} else {
							console.error('no redirect URI present')
						}
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
	},
	execute: function(req, res){
		require('../config/setup')

		const paymentId = req.query.paymentId
		const payerId = { payer_id: req.query.PayerID }

		paypal.payment.execute(paymentId, payerId, function(error, payment){
		  if(error){
		    console.error(JSON.stringify(error))
		  } else {

		  	res.json(payment)

		    if (payment.state == 'approved'){
		      console.log('payment completed successfully')
		    } else {
		      console.log('payment not successful')
		    }
		  }
		})
	}
}