const paypal      = require('../../config/setup')
const Q           = require('q')
const db          = require('../../config/db')
const handleToken = require('../../enviroments/token')

function processPay (base_url, purchase, redirect_url, client, token) {
	const deferred = Q.defer()

	let items = []

	purchase.products.forEach( o => {
		items.push({
			'name': o.name,
			'sku': o.id,
			'price': o.price,
			'currency': purchase.currency,
			'quantity': o.quantity,
		})
	})

	const create_payment_json = {
		'intent': 'sale',
		'payer': {
			'payment_method': 'paypal'
		},
		'redirect_urls': {
			'return_url': 	`${base_url}/sales/proceed/paypal/success`,
			'cancel_url': `${base_url}/sales/proceed/paypal/cancel`
		},
		'transactions': [
			{
				'item_list': {
					'items': items
				},
				'amount': {
					'currency': purchase.currency,
					'total': purchase.total
				},
				'description': `IPS_Purchase_TOTAL:${purchase.total}_FROM:${redirect_url}_PAY_METHOD:PAYPAL`
			}
		]
	}

	paypal.payment.create(create_payment_json, (err, payment) => {
		if (err) {
			deferred.reject({
				title: 'ERROR',
				error: {
					'status': error.httpStatusCode,
					'details': err.response.details,
					'error_code': 22,
					'error': err
				}
			})
		} else {
			const links = {}

			// Handle links
			payment.links.forEach(linkObj => {
				links[linkObj.rel] = {
					href: linkObj.href,
					method: linkObj.method
				}
			})

			// If redirect url present, redirect user
			if (links.hasOwnProperty('approval_url')) {

				let pagos = []

				payment.transactions.forEach(transaction => {

					transaction.item_list.items.forEach((item, index) => {

						// Save item transaction on ips db
						pagos.push(new Promise((resolve, reject) => {

							db.connection.ips.query(
								'INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
								[ 
									1, 
									payment.state, 
									'esperando_confirmacion', 
									item.currency, 
									item.price,
									item.quantity,
									payment.id, 
									item.sku, 
									token.cliente.id+'_'+Date.now(), 
									token.cliente.sc,
									`${purchase.products[index].type}_${token.cliente.sc}_${token.cliente.nombre}_${purchase.products[index].description}`,
									redirect_url,
									client.email,
									client.telephone
								],
								(err, result) => {
									if (err) {
										reject({
											title: 'ERROR',
											error: {
												'status': 500,
												'details': [
													{
														issue: 'Error al insertar en base de datos.'
													}
												],
												'error_code': 25,
												'error': err
											}
										})
									} else
										resolve(result)
								}
							)

						}))
					})

				})

				Q.all(pagos).then(result => {
				
					deferred.resolve({
						'status': '201',
						'message': 'Pre procesamiento del pago hecho correctamente.',
						'approval_url': links['approval_url'].href,
						'payment': payment
					})

				}).catch(err => deferred.reject(err))

			} else {
				deferred.reject({
					title: 'ERROR',
					error: {
						'status': 500,
						'details': [
							{
								issue: 'No se encontró link de redirección a paypal.'
							}
						],
						'error_code': 23
					}
				})
			}
		}
	})

	return deferred.promise
}

module.exports = function(req, res, next) {
	if (req.body.token && req.body.purchase && req.body.redirect_url) {
		// paypal configuration
		require('../../config/setup')

		const purchase     = JSON.parse(req.body.purchase)
		const redirect_url = req.body.redirect_url
		const base_url     = `${req.protocol}://${req.get('host')}`

		// Información de contacto
		const client = {
			email     : req.body.email,
			telephone : req.body.telephone
		}

		// Get token decoded
		const token = handleToken.getTokenDecoded(req.body.token)
		if (token.error) {
			res.status(400).render('error', {
				title: 'Ha ocurrido un problema',
				error: {
					'status': 500, 
					'details': [
						{
							issue: 'No se ha podido decodificar el token de autenticación.'
						}
					],
					'error_code': 19,
					'error': token.error
				}
			})
		} else {

			processPay(base_url, purchase, redirect_url, client, token).then(data => {
				// Agregamos el resultado de la peticion de compra a la ips_session
				req.ips_session.payment = data.payment
				
				// Redireccionamos a paypal para procesar el pago
				res.redirect(data.approval_url)
			}).catch(error => res.render(error.status).render('error', error))

		}

	} else {
		res.status(400).render('error', {
			title: 'Ha ocurrido un problema',
			error: {
				'status': 400,
				'details': [
					{
						issue: 'Cuerpo de la petición es inexistente o está incompleto.'
					}
				],
				'error_code': 20
			}
		})
	}
}