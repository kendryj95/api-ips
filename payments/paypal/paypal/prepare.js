const paypal      = require('../../../config/setup').paypal
const Q           = require('q')
const db          = require('../../../config/db')
const handleToken = require('../../../enviroments/token')

function createPaymentJSON (purchase, base_url, redirect_url) {
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
		intent: 'sale',
		payer: {
			payment_method: 'paypal'
		},
		redirect_urls: {
			return_url: 	`${base_url}/sales/proceed/paypal/success`,
			cancel_url: `${base_url}/sales/proceed/paypal/cancel`
		},
		transactions: [
			{
				item_list: {
					items: items
				},
				amount: {
					currency: purchase.currency,
					total: purchase.total
				},
				description: `IPS_Purchase_TOTAL:${purchase.total}_FROM:${redirect_url}_PAY_METHOD:PAYPAL`
			}
		]
	}

	return create_payment_json
}

function createPaypalPayment (data) {
	const deferred = Q.defer()

	paypal.payment.create(createPaymentJSON(data.purchase, data.base_url, data.redirect_url), (err, payment) => {
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
		} else deferred.resolve(payment)
	})

	return deferred.promise
}

function insertNewPaymentOnIPS (connection, data) {
	const deferred = Q.defer()

	connection.query(
		{
			sql     : `INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			timeout : 60000
		},
		[
			1, 
			data.payment.state, 
			'esperando_confirmacion', 
			data.item.currency, 
			data.item.price,
			data.item.quantity,
			data.payment.id, 
			data.item.sku, 
			data.token.cliente.id+'_'+Date.now(), 
			data.token.cliente.sc,
			`${data.purchase.products[data.index].type}_${data.token.cliente.sc}_${data.token.cliente.nombre}_${data.purchase.products[data.index].description}`,
			data.redirect_url,
			data.client.email,
			data.client.telephone
		],
		(err, result) => {
			if (err) {
				deferred.reject({
					title: 'ERROR',
					error: {
						status: 500,
						details: [
							{
								issue: 'Error al insertar en base de datos.'
							}
						],
						error_code: 25,
						error: err
					}
				})
			} else deferred.resolve(result)
		}
	)

	return deferred.promise
}

function saveOnIPS (payment, data) {
	const deferred = Q.defer()

	let pagos = []

	db.connection.ips.getConnection((err, connection) => {
		if (err) return deferred.reject(err)

		payment.transactions.forEach(transaction => {
			transaction.item_list.items.forEach((item, index) => {
				// Save item transaction on ips db
				pagos.push(
					insertNewPaymentOnIPS(connection, {
						item,
						payment,
						index,
						purchase: data.purchase,
						client: data.client,
						token: data.token,
						redirect_url: data.redirect_url
					})
				)
			})
		})

		Q.all(pagos).then(result => {					
			deferred.resolve(result)
		}).catch(err => deferred.reject(err))

		connection.release()
	})

	return deferred.promise
}

function processPayment (base_url, purchase, redirect_url, client, token) {
	const deferred = Q.defer()

	let purchaseData = { base_url, purchase, redirect_url }

	createPaypalPayment(purchaseData).then(payment => {
		const links = {}		

		// Handle links
		payment.links.forEach(linkObj => {
			links[linkObj.rel] = {
				href: linkObj.href,
				method: linkObj.method
			}
		})

		const onApproval = (client, token, redirect_url, purchase, links, payment) => {
			saveOnIPS(payment, { client, token, redirect_url, purchase })
			return deferred.resolve({
				status: '201',
				message: 'Pre procesamiento del pago hecho correctamente.',
				approval_url: links['approval_url'].href,
				payment: payment
			})
		}

		const onUnapproval = () => {
			return deferred.reject({
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

		// If redirect url present, redirect user
		return links.hasOwnProperty('approval_url') ? onApproval(client, token, redirect_url, purchase, links, payment) : onUnapproval()

	}).then(result => {
		deferred.resolve(result)
	}).catch(err => deferred.reject(err)).done()

	return deferred.promise
}

module.exports = function(req, res, next) {
	if (req.body.token && req.body.purchase && req.body.redirect_url) {
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

			processPayment(base_url, purchase, redirect_url, client, token).then(data => {
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