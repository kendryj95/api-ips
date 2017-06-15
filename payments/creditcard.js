const paypal      = require('../config/setup')
const moment      = require('moment')
const Q           = require('q')
const querystring = require('querystring')
const db          = require('../config/db')

function processPay (data, token) {
	const deferred = Q.defer()

	let expire_month = moment(data.payer.cc.cc_expiration_date).format('MM')
	let expire_year = moment(data.payer.cc.cc_expiration_date).format('YYYY')

	const parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/
	const parts = parse_url.exec(data.redirect_url)
	const result_url = parts[1]+':'+parts[2]+parts[3]+'/' 

	const create_payment = {
		'intent': 'sale',
		'payer': {
			'payment_method': 'credit_card',
			'funding_instruments': [
				{
					'credit_card': {
						'type': data.payer.cc.cc_type,
						'number': data.payer.cc.cc_number,
						'expire_month': expire_month,
						'expire_year': expire_year,
						'cvv2': data.payer.cc.cc_cvv,
						'first_name': data.payer.first_name,
						'last_name': data.payer.last_name,
						'billing_address': {
							'line1': data.payer.address,
							'city': data.payer.city,
							'state': data.payer.state,
							'postal_code': data.payer.postal_code,
							'country_code': data.payer.country
						}
					}
				}
			]
		},
		'transactions': [
			{
				'amount': {
					'total': data.purchase.total,
					'currency': data.purchase.currency
				},
				'description': 'IPS_Purchase_TOTAL:'+data.purchase.total+'_FROM:'+result_url+'_PAY_METHOD:PAYPAL_CREDIT_CARD'
			}
		]
	}
					
	paypal.payment.create(create_payment, (err, payment) => {
		if (err) {
			deferred.reject({
				title: 'Ha ocurrido un error al procesar su pago',
				error: {
					'status': err.httpStatusCode,
					'message': 'Lo sentimos, pero ha ocurrido un problema al tratar de procesar su pago con tarjeta de credito, porfavor intente de nuevo más tarde.',
					'error_code': 11,
					'error': err
				}
			})
		} else {
			// Save on database
			data.purchase.products.forEach(o => {
				// Save new sale on Insignia Mobile Communications DB
				const sms = {
					id: token.cliente.id,
					origen: token.cliente.origen,
					sc: token.cliente.sc,
					contenido: `${o.type}_${token.cliente.sc}_${token.cliente.nombre}_${o.description}`,
					estado: 1,
					desp_op: 'PAYPAL_CREDITCARD'
				}

				db.connection.insignia.query(
					{
						sql: 'INSERT INTO smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?)',
						timeout: 60000
					},
					[
						sms.id,
						sms.origen,
						sms.sc,
						sms.contenido,
						sms.estado,
						sms.desp_op,
						o.id
					],
					(error, result) => {
						if (error) {
							deferred.reject({
								'status': 500,
								'message': 'Error al procesar solicitud en mysql en base de datos sms.', 
								'error_code': 15,
								'error': error
							})
						}
					}
				)

				// Save transaction on ips db
				db.connection.ips.query(
					'INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, payer_info_email, id_compra, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, 2, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
					[
						payment.transactions[0].related_resources[0].sale.state,
						payment.state,
						data.purchase.currency,
						o.price,
						o.quantity,
						`PAYPAL_CREDITCARD_${data.payer.first_name.toUpperCase()}_${data.payer.last_name.toUpperCase()}`,
						payment.transactions[0].related_resources[0].sale.id,
						payment.id,
						o.id,
						sms.id,
						sms.sc,
						sms.contenido,
						data.redirect_url,
						data.client.email,
						data.client.telephone
					],
					(error, result) => {
						if (error) {
							deferred.reject({
								'status': 500,
								'message': 'Error al procesar solicitud en mysql.', 
								'error_code': 17,
								'error': error
							})
						}
					}
				)
			})


			// Enviar notificación por email y sms
			const mail = {
				to: data.client.email,
				subject: 'Nuevo pago procesado satisfactoriamente',
				template: 'new_pay',
				context: {
					email: data.client.email,
				},
				callback: (error, info) => {
					if (error) 
						console.log(error)
					else 
						console.log('Message %s sent: %s', info.messageId, info.response)
				}
			}
			require('../enviroments/notifications/new')(mail)

			// Show success page
			let params = querystring.stringify({ 
				url: data.redirect_url, 
				paymentId: payment.transactions[0].related_resources[0].sale.id ,
				idCompra: payment.transactions[0].related_resources[0].sale.id
			})

			deferred.resolve({
				'title': '',
				'message': '',
				'approval_url': `/sales/success?${params}`
			})
			
		}
	})

	return deferred.promise
}

module.exports = {
	paypal: function(req, res) {
		const base_url = `${req.protocol}://${req.get('host')}`

		if (req.body && req.body.purchase && req.body.redirect_url) {
			const data = {
				purchase: JSON.parse(req.body.purchase),
				payer: {
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
				},
				redirect_url: req.body.redirect_url,
				client: {
					email: req.body.email,
					telephone: req.body.telephone
				}
			}

			const token_encoded = req.body.token
			const token = require('../enviroments/token').getTokenDecoded(token_encoded)
			if (token.error) {
				res.status(500).render('error', {
					title: 'ERROR',
					error: {
						'status': 500,
						'message': 'Ha ocurrido un error al tratar de decondificar el token de autentificación.',
						'error_code': 10,
						'error': token.error
					}
				})
			} else {

				processPay(data, token)
					.then(data => {
						res.redirect(data.approval_url)
					})
					.catch(error => {
						res.status(error.status).render('error', error)
					})

			}

		} else {
			res.status(400).render('error', {
				title: 'ERROR',
				error: {
					'status': 400,
					'message': 'El cuerpo de la petición no existe, intente de nuevo.',
					'error_code': 13
				}
			})
		}
	}
}