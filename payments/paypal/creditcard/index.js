const paypal      = require('../../../config/setup')
const Q           = require('q')
const querystring = require('querystring')
const db          = require('../../../config/db')
const tokenHelper = require('../../../enviroments/token')

function processPay (data, token) {
	const deferred = Q.defer()

	let expire_year  = parseInt(String(data.payer.cc.cc_expiration_date).split('/')[0])
	let expire_month = parseInt((String(data.payer.cc.cc_expiration_date).split('/')[1]))

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
				'description': 'IPS_Purchase_TOTAL:'+data.purchase.total+'_FROM:'+result_url+'_PAY_METHOD:PAYPAL_CREDITCARD'
			}
		]
	}
					
	paypal.payment.create(create_payment, (err, payment) => {
		if (err) {
			deferred.reject({
				title: 'Ha ocurrido un error al procesar su pago',
				error: {
					'status': err.httpStatusCode,
					'details': err.response.details,
					'error_code': 11,
					'error': err
				}
			})
		} else {

			getDbConnection().then(r => {
				let ipsSaves      = []
				let insigniaSaves = []

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

					ipsSaves.push(saveOnIPSDb(r.con.ips, payment, data, o, sms))
					insigniaSaves.push(saveOnInsigniaDb(r.con.smsin, sms, o))
				})

				Q.all([
					Q.all(ipsSaves),
					Q.all(insigniaSaves)
				]).spread((ips, smsin) => {

					console.log('IPS INSERT CREDITCARD PAYPAL', ips)
					console.log('SMSIN INSERT CREDITCARD PAYPAL', smsin)

					// Show success page
					let params = querystring.stringify({ 
						url: data.redirect_url, 
						paymentId: payment.transactions[0].related_resources[0].sale.id ,
						idCompra: payment.transactions[0].related_resources[0].sale.id
					})

					deferred.resolve({
						id_api_call: payment.id,
						approval_url: `/sales/success?${params}`
					})

				}).catch(err => deferred.reject(err)).done()

				// Cerrar conexiones
				r.con.ips.release()
				r.con.smsin.release()

			}).catch(err => deferred.reject(err)).done()
			
		}
	})

	return deferred.promise
}

function saveOnInsigniaDb (con, sms, o) {
	const deferred = Q.defer()

	con.query(
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
				console.log('ERROR EN SMSIN CREDITCARD PAYPAL', error)
				deferred.reject({
					status: 500,
					details: [
						{
							issue: 'Error al procesar solicitud en mysql en base de datos sms.'
						}
					], 
					error_code: 15,
					error: error
				})
			} else
				deferred.resolve(result)
		}
	)

	return deferred.promise
}

function saveOnIPSDb (con, payment, data, o, sms) {
	const deferred = Q.defer()

	// Save transaction on ips db
	con.query(
		'INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, payer_info_email, id_compra, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, 2, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
					status: 500,
					details: [
						{
							issue: 'Error al procesar solicitud en mysql.'
						}
					], 
					error_code: 17,
					error: error
				})
			} else deferred.resolve(result)
		}
	)

	return deferred.promise
}

function getDbConnection () {
	const deferred = Q.defer()

	let getConnections = (pool) => {
		return new Promise((resolve, reject) => {
			pool.getConnection((err, con) => {
				err ? reject(err) : resolve(con)
			})
		})
	}

	Q.all([
		getConnections(db.connection.ips),
		getConnections(db.connection.sms)
	]).spread((ips, smsin) => deferred.resolve({ con: { ips, smsin } })).catch(err => deferred.reject(err)).done()

	return deferred.promise
}

module.exports = (req, res) => {
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
		const token = tokenHelper.getTokenDecoded(token_encoded)
		if (token.error) {
			res.status(500).render('error', {
				title: 'Ha ocurrido un problema',
				error: {
					status: 500,
					details: [
						{
							issue: 'Error al tratar de decodificar el token de autentificación.'
						}
					],
					error_code: 10,
					error: token.error
				}
			})
		} else {

			processPay(data, token).then(data => {
				res.redirect(data.approval_url)
			}).catch(error => {
				let err = {}
				err.error.error_code = error.error.error_code
				err.error.status     = error.error.status
				err.title            = error.title
				if (err.error.error.response) {
					switch (err.error.error.response.name) {
						case 'UNKNOWN_ERROR':
							err.error.details = [
								{ issue: 'Ha ocurrido un error desconocido, porfavor intente de nuevo.' }
							]
						break
						default:
							err = error
							err.error.details = [
								{ issue: 'Ha ocurrido un error desconocido, porfavor intente de nuevo.' }
							]
						break
					}
				}
				res.status(500).render('error', err)
			})

		}

	} else {
		res.status(400).render('error', {
			title: 'Ha ocurrido un problema',
			error: {
				status: 400,
				details: [
					{
						issue: 'El cuerpo de la petición no existe.'
					}
				],
				error_code: 13
			}
		})
	}
}