const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q = require('q')
const querystring = require('querystring')
const db = require('../../config/db')

function processPayment (data) {
	const deferred = Q.defer()

	stripe.sources.create({
		type: 'card',
		card: {
			number: data.card.number,
			cvc: data.card.cvv,
			exp_month: data.card.exp_month,
			exp_year: data.card.exp_year
		},
		owner: {
			address: {
				postal_code: data.card.owner.address.postal_code
			}
		}
	}, (err, source) => {
		if (err) {
			deferred.reject({ 
				'title': 'No se ha podido procesar el pago con éxito', 
				'error': {
					'status': 500,
					'message': 'Stripe no ha podido procesar su pago de manera satisfactoria, porfavor intente de nuevo más tarde.',
					'error_code': 35,
					'error': err
				} 
			})
		}
					
		stripe.charges.create({
			amount: String(data.purchase.total).replace('.',''),
			currency: data.purchase.currency.toLowerCase(),
			description: 'test',
			source: source.id
		}, (err, charge) => {
			if (err) {
				deferred.reject({
					'title': 'No se ha podido procesar el pago con éxito', 
					'error': {
						'status': 500,
						'message': 'Stripe no ha podido procesar su pago de manera satisfactoria, porfavor intente de nuevo más tarde.',
						'error_code': 36,
						'error': err
					} 
				})
			}

			// Crear parametros para la url
			let params = querystring.stringify({ 
				url: data.redirect_url, 
				paymentId: source.id,
				idCompra: charge.id
			})
			let approval_url = `/sales/success?${params}`

			saveOnDB(data, charge, source).then(d => {
				deferred.resolve({ charge, source, approval_url })
			}).catch(err => {
				deferred.reject(err)
			})

		})
	})

	return deferred.promise
}

function saveOnDB (data, source, charge) {
	const deferred = Q.defer()

	db.pool.ips.getConnection((err, con) => {
		if (err) {
			defer.reject({
				title: 'ERROR',
				error: {
					'status': 500,
					'message': 'Ha ocurrido un error tratando de recuperar la conexion a la base de datos',
					'error_code': 38,
					'error': err
				}
			})
		}

		data.purchase.products.forEach(o => {
			con.query(
				{
					sql: 'INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, payer_info_email, id_compra, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, 4, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
					timeout: 3000
				},
				[
					'completed',
					'approved',
					data.purchase.currency,
					o.price,
					o.quantity,
					data.client.email,
					charge.id,
					source.id,
					o.id,
					data.token.cliente.id,
					data.token.cliente.sc,
					`${o.type}_${data.token.cliente.sc}_${data.token.cliente.nombre}_${o.description}`,
					data.redirect_url,
					data.client.email,
					data.client.telephone
				],
				(err, result) => {
					if (err) {
						defer.reject({
						title: 'ERROR',
							error: {
								'status': 500,
								'message': 'Ha ocurrido un error tratando de manipular la base de datos',
								'error_code': 39,
								'error': err
							}
					})
					}
				}
			)
		})

		con.release()
	})

	db.pool.insignia.getConnection((err, con) => {
		if (err) deferred.reject({
			title: 'ERROR',
			error: {
				'status': 500,
				'message': 'Ha ocurrido un error tratando de recuperar la conexion a la base de datos',
				'error_code': 40,
				'error': err
			}
		})

		data.purchase.products.forEach(o => {
			con.query(
				{
					sql: 'INSERT INTO smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?)',
					timeout: 3000
				},
				[
					data.token.cliente.id,
					data.token.cliente.origen,
					data.token.cliente.sc,
					`${o.type}_${data.token.cliente.sc}_${data.token.cliente.nombre}_${o.description}`,
					1,
					'STRIPE_CREDITCARD',
					o.id
				],
				(err, result) => {
					if (err) deferred.reject({
						title: 'ERROR',
						error: {
							'status': 500,
							'message': 'Ha ocurrido un error tratando de manipular la base de datos',
							'error_code': 41,
							'error': err
						}
					})
				}
			)
		})
		con.release()
	})

	deferred.resolve({
		status: 201,
		message: 'Se ha procesado el pago correctamente.'
	})	

	return deferred.promise
}

module.exports = function (req, res) {
	if (req.body) {

		const exp_month = String(req.body.stripe_cc_edate).split('/')[1],
					exp_year = String(req.body.stripe_cc_edate).split('/')[0],
					purchase = JSON.parse(req.body.purchase),
					token = require('../../enviroments/token').getTokenDecoded(req.body.token),
					redirect_url = String(req.body.redirect_url),
					client = { email: String(req.body.email), telephone: String(req.body.telephone) }

		const data = {
			card: {
				number: req.body.stripe_cc_number,
				cvv: req.body.stripe_cc_cvv,
				exp_month,
				exp_year,
				owner: {
					address: {
						postal_code: req.body.stripe_cc_zip
					}
				}
			},
			purchase,
			token,
			redirect_url,
			client
		}

		processPayment(data)
		.then(data => {
			// Enviar notificación por email
			let mail = {
				to: client.email,
				subject: 'Nuevo pago procesado satisfactoriamente',
				template: 'new_pay',
				context: {
					email: client.email,
				},
				callback: (error, info) => {
					if (error) 
						console.log(error)
					else 
						console.log('Message %s sent: %s', info.messageId, info.response)
				}
			}
			require('../../enviroments/notifications/new')(mail)

			//Redireccionar pagina de success
			res.redirect(data.approval_url)
		})
		.catch(error => {
			res.status(error.error.status).render('error', error)
		})

	} else {
		res.status(400).render('error', {
			title: 'No se ha realizado la petición correctamente',
			error: {
				'status': 400,
				'message': 'No se ha recibido el cuerpo de la petición, intente de nuevo mas tarde de forma correcta.',
				'error_code': 34
			}
		})
	}
}