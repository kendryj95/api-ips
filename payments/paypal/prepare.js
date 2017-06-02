const paypal = require('paypal-rest-sdk')
const db = require('../../config/db')
const handleToken = require('../../enviroments/token')

module.exports = function(req, res, next) {
	const base_url = 'http://192.168.1.46:3030'

	if (req.body.token && req.body.purchase && req.body.redirect_url) {
		// paypal configuration
		require('../../config/setup')

		const purchase = JSON.parse(req.body.purchase)
		const redirect_url = req.body.redirect_url

		// Información de contacto
		const consumidor_email = req.body.email
		const consumidor_telefono = req.body.telephone

		// Get token decoded
		const token = handleToken.getTokenDecoded(req.body.token)
		if (token.error) {
			res.status(400).render('error', {
				title: 'ERROR',
				error: {
					"status": 500, 
					"message": "Something went wrong, please try again later.",
					"error_code": 19,
					"error": token.error
				}
			})
		} else {

			try {

				let items = []

				purchase.products.forEach( o => {
					items.push({
						"name": o.name,
						"sku": o.id,
						"price": o.price,
						"currency": purchase.currency,
						"quantity": o.quantity,
					})
				})

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
							"items": items
						},
						"amount": {
							"currency": purchase.currency,
							"total": purchase.total
						},
						"description": "IPS purchase. TOTAL:"+purchase.total+"_FROM:"+redirect_url+"_PAY_METHOD:PAYPAL"
					}]
				}

				paypal.payment.create(create_payment_json, function (error, payment) {
					if (error) {
						res.status(error.httpStatusCode).render('error', {
							title: "ERROR",
							error: {
								"status": error.httpStatusCode,
								"message": "Something has happened, please try again later.",
								"error_code": 22,
								"error": error
							}
						})
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
							let query_result = {}

							payment.transactions.forEach(function(transaction) {

								transaction.item_list.items.forEach(function(item, index) {

									// Save item transaction on ips db
									db.connection.ips.query(
										'INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
										[ 
											1, 
											payment.state, 
											'esperando_confirmacion', 
											item.currency, 
											item.price, 
											payment.id, 
											item.sku, 
											token.cliente.id+'_'+Date.now(), 
											token.cliente.sc, 
											purchase.products[index].type+'_'+token.cliente.sc+'_'+token.cliente.nombre+'_'+purchase.products[index].description,
											redirect_url,
											consumidor_email,
											consumidor_telefono
										],
										function(err, result) {
											if (err) {
												query_error = {
													title: "ERROR",
													error: {
														"status": 500,
														"message": "Database error",
														"error_code": 25,
														"error": err
													}
												}
											}
										}
									)
								})
							})

							// if got an error render error page
							if (query_result.error) {
								res.status(query_result.error.status).render('error', query_result)
							} else {
								// if everything is ok redirect to paypal link
								res.redirect(links['approval_url'].href)
							}

							} else {
							res.status(500).render('error', {
								title: "ERROR",
								error: {
									"status": 500,
									"message": "Something bad has happened, please try again later.",
									"error_code": 23
								}
							})
						}
					}
				})

			} catch (e) {
				res.status(400).render('error', {
					title: 'ERROR',
					error: {
						"status": 400,
						"message": "Purchase info not provided",
						"error_code": 21,
						"error": e
					}
				})
			}
		}

	} else {
		res.status(400).render('error', {
			title: 'ERROR',
			error: {
				"status": 400,
				"message": "Request body does not exist.",
				"error_code": 20
			}
		})
	}
}