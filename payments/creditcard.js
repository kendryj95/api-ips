const paypal = require('paypal-rest-sdk')
const moment = require('moment')

module.exports = {
	paypal: function(req, res) {
		const base_url = 'http://localhost:3030/v1/sales'

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
			const consumidor_email = req.body.email
			const consumidor_telefono = req.body.telephone
			const fullName = payer.first_name.toUpperCase() + '_' + payer.last_name.toUpperCase()

			const token = require('../enviroments/token').getTokenDecoded(token_encoded)

			if (token.error) {
				console.log(token.error)
				res.status(500).render('error', {
					title: "ERROR",
					error: {
						"status": 500, "message":
						"Something went wrong, please try again later.",
						"error_code": 10,
						"error": token.error
					}
				})
			} else {

				try {

					let expire_month = moment(payer.cc.cc_expiration_date).format('MM')
					let expire_year = moment(payer.cc.cc_expiration_date).format('YYYY')

					const parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/
					const parts = parse_url.exec( redirect_url )
					const result_url = parts[1]+':'+parts[2]+parts[3]+'/' 

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
							"description": "IPS purchase. TOTAL:"+purchase.total+"_FROM:"+result_url+"_PAY_METHOD:PAYPAL_CREDIT_CARD"
						}]
					}
					
					paypal.payment.create(create_payment, function(err, payment){
						if (err) {
							console.log(err)
							res.status(err.httpStatusCode).render('error', {
								title: 'There was an error processing your payment',
								error: {
									"status": err.httpStatusCode,
									"message": "Paypal error",
									"error_code": 11,
									"error": err
								}
							})
						} else {
							// Save on database
							const data_base_response = require('../db/creditcard').new(token, purchase, fullName, consumidor_email, consumidor_telefono, payment, 'PAYPAL_CREDITCARD', redirect_url)

							if (data_base_response.error) {
								res.render('error', {
									title: "There was an error while trying to execute your payment",
									error: data_base_response
								})
							} else {
								// Enviar notificación por email y sms
								const mail = {
									to: consumidor_email,
									subject: 'Nuevo pago procesado satisfactoriamente',
									template: 'new_pay',
									context: {
										email: consumidor_email,
									},
									callback: (error, info) => {
										if (error) 
											console.log(error)
										else 
											console.log('Message %s sent: %s', info.messageId, info.response)
										return
									}
								}
								require('../enviroments/notifications/new')(mail)

								// Show success page
								let url = require('../enviroments/url').buildUrl('/sales/success', { 
									url: redirect_url, 
									paymentId: payment.transactions[0].related_resources[0].sale.id 
								})
								res.redirect(url)
							}
						}
					})

				} catch (e) {
					res.status(400).render('error', {
						title: "ERROR",
						error: {
							"status": 400,
							"message": "Credit card or purchase info not provided",
							"error_code": 12,
							"error": e
						}
					})
					console.log(e)
					return
				}

			}

		} else {
			res.status(400).render('error', {
				title: "ERROR",
				error: {
					"status": 400,
					"message": "Request body does not exist.",
					"error_code": 13
				}
			})
		}
	}
}