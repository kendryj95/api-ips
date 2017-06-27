const stripe      = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q           = require('q')
const querystring = require('querystring')
const db          = require('../../config/db')

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
					'details': [
						{
							issue: 'Stripe no ha podido crear su pago.'
						}
					],
					'error_code': 35,
					'error': err
				} 
			})
		} else {
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
							'details': [
								{
									issue: 'Stripe no ha podido procesar su pago'
								},
								{
									issue: err.raw.message
								}
							],
							'error_code': 36,
							'error': err
						} 
					})
				} else {
					// Crear parametros para la url
					let params = querystring.stringify({ 
						url: data.redirect_url, 
						paymentId: source.id,
						idCompra: charge.id
					})
					let approval_url = `/sales/success?${params}`

					deferred.resolve({ charge, source, approval_url })
				}			

			})
		}					
	})

	return deferred.promise
}

function saveOnDB (data, charge, source) {
	const deferred = Q.defer()

	db.getConnection(db.connection.ips).then(con => {
		let products = []

		data.purchase.products.forEach(o => {
			products.push(new Promise((resolve, reject) => {
				con.query(
					`INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, payer_info_email, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, 4, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						'created',
						'waiting',
						data.purchase.currency,
						o.price,
						o.quantity,
						data.client.email,
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
							reject({
								title: 'ERROR',
									error: {
										'status': 500,
										'details': [
											{
												issue: 'No se ha podido insertar el pago en la base de datos.'
											}
										],
										'error_code': 39,
										'error': err
									}
							})
						} else resolve(result)
					}
				)
			}))
		})

		Q.all(products).then(result => deferred.resolve(result)).catch(err => deferred.reject(err))

		con.release()
	}).catch(err => {
		deferred.reject({
			title: 'Error tratando de conectar a la base de datos',
			error: {
				'status': 500,
				'details': [
					{
						issue: 'Error tratando de conectar a la base de datos.'
					}
				],
				'error_code': 38,
				'error': err
			}
		})
	})

	return deferred.promise
}

module.exports = (req, res) => {
	if (req.body.purchase && req.body.token && req.body.redirect_url && req.body.email && req.body.telephone && req.body.stripe_cc_edate && req.body.stripe_cc_number && req.body.stripe_cc_cvv && req.body.stripe_cc_zip) {

		const exp_month    = String(req.body.stripe_cc_edate).split('/')[1],
					exp_year     = String(req.body.stripe_cc_edate).split('/')[0],
					purchase     = JSON.parse(req.body.purchase),
					token        = require('../../enviroments/token').getTokenDecoded(req.body.token),
					redirect_url = String(req.body.redirect_url),
					client       = { email: String(req.body.email), telephone: String(req.body.telephone) }

		const cc_data = {
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

		processPayment(cc_data).then(data => {
			// Guardar registro en db IPS
			saveOnDB(cc_data, data.charge, data.source)
			//Redireccionar pagina de success
			res.redirect(data.approval_url)
		})
		.catch(error => res.status(error.error.status).render('error', error))
	} else {
		res.status(400).render('error', {
			title: 'No se ha realizado la petición correctamente',
			error: {
				'status': 400,
				'details': [
					{
						issue: 'No se ha recibido el cuerpo de la petición, intente de nuevo mas tarde de forma correcta.'
					}
				],
				'error_code': 34
			}
		})
	}
}