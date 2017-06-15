const paypal      = require('paypal-rest-sdk')
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

	paypal.payment.create(create_payment_json, (error, payment) => {
		if (error) {
			deferred.reject({
				title: 'ERROR',
				error: {
					'status': error.httpStatusCode,
					'message': 'Something has happened, please try again later.',
					'error_code': 22,
					'error': error
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
				payment.transactions.forEach(function(transaction) {

					transaction.item_list.items.forEach(function(item, index) {

						// Save item transaction on ips db
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
							function(err, result) {
								if (err) {
									deferred.reject({
										title: 'ERROR',
										error: {
											'status': 500,
											'message': 'Database error',
											'error_code': 25,
											'error': err
										}
									})
								}
							}
						)
					})
				})

				deferred.resolve({
					'status': '201',
					'message': 'Pre procesamiento del pago hecho correctamente.',
					'approval_url': links['approval_url'].href,
					'payment': payment
				})

			} else {
				deferred.reject({
					title: 'ERROR',
					error: {
						'status': 500,
						'message': 'Ha ocurrido un error al procesar la solicitud, porfavor intente de nuevo más tarde.',
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

		const purchase = JSON.parse(req.body.purchase)
		const redirect_url = req.body.redirect_url
		const base_url = `${req.protocol}://${req.get('host')}`

		// Información de contacto
		const client = {
			email: req.body.email,
			telephone: req.body.telephone
		}

		// Get token decoded
		const token = handleToken.getTokenDecoded(req.body.token)
		if (token.error) {
			res.status(400).render('error', {
				title: 'ERROR',
				error: {
					'status': 500, 
					'message': 'Something went wrong, please try again later.',
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
			}).catch(error => {
				res.render(error.status).render('error', error)
			})

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