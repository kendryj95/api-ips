const paypal      = require('../../config/setup')
const querystring = require('querystring')
const Q           = require('q')
const db          = require('../../config/db')
const email       = require('../../enviroments/email')
const path        = require('path')

function getPagos(con, paymentId) {
	const deferred = Q.defer()

	con.query(
		'SELECT p.id_pago AS id, p.sms_id, p.sms_sc, p.sms_contenido, p.id_producto_insignia AS id_producto, p.redirect_url, p.consumidor_email, p.consumidor_telefono FROM insignia_payments_solutions.pagos p WHERE p.estado_pago = \'esperando_confirmacion\' AND p.id_api_call = \''+paymentId+'\'',
		(error, results, fields) => {
			if (error) {
				deferred.reject({
					title: 'ERROR',
					error: {
						'status': 500,
						'details': [
							{
								issue: 'Error insertando en base de datos.'
							}
						],
						'error_code': 28,
						'error': error
					}
				})
			} else {
				deferred.resolve(results)
			}
		}
	)

	return deferred.promise
}

function insertIntoSmsinInsignia (con, data) {
	const deferred = Q.defer()

	con.query(
		{
			sql: 'INSERT INTO sms.smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, 1, CURDATE(), CURTIME(), ?, ?)',
			timeout: 60000
		},
		[
			data.sms.id,
			data.sms.origen,
			data.sms.sc,
			data.sms.contenido,
			'PAYPAL',
			data.id_producto
		],
		(err, result) => {
			if (err) {
				deferred.reject({
					title: 'ERROR',
					error: {
						'status': 500,
						'details': [
							{
								issue: 'Error tratando de insertar en base de datos.'
							}
						],
						'error_code': 31,
						'error': err
					}
				})
			} else {
				deferred.resolve(result)
			}
		}
	)

	return deferred.promise
}

function updateIntoPagoIps (con, payment, data) {
	const deferred = Q.defer()

	con.query(
		{
			sql: 'UPDATE pagos SET estado_compra = ?, estado_pago = ?, payer_info_email = ?, id_compra = ? WHERE id_pago = ?',	
			tiemeout: 60000
		},
		[
			payment.transactions[0].related_resources[0].sale.state,
			payment.state,
			payment.payer.payer_info.email,
			payment.transactions[0].related_resources[0].sale.id,
			data.id
		],
		(err, result) => {
			if (err) {
				deferred.reject({
					title: 'ERROR',
					error: {
						'status': 500,
						'details': [
							{
								issue: 'Error al actualizar la base de datos ips.'
							}
						],
						'error_code': 29,
						'error': err
					}
				})
			} else {
				deferred.resolve(result)
			}
		}
	)

	return deferred.promise
}

function getConnectionIps () {
	const deferred = Q.defer()

	db.promise.ips().then(con => deferred.resolve(con)).catch(err => deferred.reject(err))

	return deferred.promise
}

function getConnectionInsignia () {
	const deferred = Q.defer()

	db.promise.insignia().then(con => deferred.resolve(con)).catch(err => deferred.reject(err))

	return deferred.promise
}

function saveOnDatabase (payment, paymentId) {
	const deferred = Q.defer()

	Q.all([
		getConnectionIps(),
		getConnectionInsignia()
	]).spread((con_ips, con_insignia) => {


		getPagos(con_ips, paymentId).then(results => {

			let updatePagoIps       = []
			let insertSmsinInsignia = []

			for (let pago of results) {
				const data = {
					id: pago.id,
					id_producto: pago.id_producto,
					sms: {
						id: pago.sms_id,
						sc: pago.sms_sc,
						origen: pago.sms_sc,
						contenido: pago.sms_contenido
					}
				}

				// UPDATE EN BASE DE DATOS DE INSIGNIA PAYMENTS SOLUTIONS
				updatePagoIps.push(updateIntoPagoIps(con_ips, payment, data))

				// INSERT EN BASE DE DATOS DE INSIGNIA (SMSIN)
				insertSmsinInsignia.push(insertIntoSmsinInsignia(con_insignia, data))
			}

			Q.all([
				Q.all(updatePagoIps),
				Q.all(insertSmsinInsignia)
			]).spread((ips, insignia) => {
					
				deferred.resolve({
					'status': 200,
					'message': 'Pago procesado staisfactoriamente.',
					'notification_email': results[0].consumidor_email,
					'natifications_phone': results[0].consumidor_telefono,
					'url': results[0].redirect_url,
					'idCompra': payment.transactions[0].related_resources[0].sale.id
				})

			}).catch(err => deferred.reject(err)).done()

		}).catch(err => deferred.reject(err))

		// Cerrar conexiones
		con_ips.release()
		con_insignia.release()

	}).catch(err => {
		deferred.reject({
			title: 'Error en conexion a base de datos',
			error: {
				'status': 500,
				'details': [
					{
						issue: 'Error estableciendo conexión a la base de datos.'
					}
				],
				'error_code': 37,
				'error': err
			}
		})
	})

	return deferred.promise
}

function handleNotificationsByEmail (data) {
	const deferred = Q.defer()

	email.newAsync(data.to, data.subject, data.template, data.context, data.attachments).then(info => {
		deferred.resolve(`Message ${info.messageId} sent: ${info.response}`)
	}).catch(err => deferred.reject(err))

	return deferred.promise
}

function executePayment (paymentId, payerId) {
	const deferred = Q.defer()

	paypal.payment.execute(paymentId, payerId, (err, payment) => {
		if(err) {
			deferred.reject('error', {
				title: 'Ha ocurrido un problema', 
				error: {
					'status': 500,
					'details': [
						{
							issue: err.response.message
						}
					],
					'error_code': 26,
					'error': err
				}
			})
		} else
			deferred.resolve(payment)
	})

	return deferred.promise
}

module.exports = function(req, res) {
	const paymentId = req.query.paymentId
	const payerId = { 
		payer_id: req.query.PayerID 
	}

	executePayment(paymentId, payerId).then(payment => {

		if (payment.state == 'approved') {
		
			saveOnDatabase(payment, paymentId).then(data => {

				// REDIRECCIONAR A SUCCESS
				const url = req.protocol + '://' +req.get('host') + '/sales/success?' + querystring.stringify({ url: data.url, paymentId: paymentId, idCompra: data.idCompra })
				
				res.redirect(url)

				// Enviar una notificación por email y sms
				handleNotificationsByEmail({
					to: data.notification_email,
					id_api_call,
					subject: 'Nuevo pago procesado satisfactoriamente',
					template: 'payment_succeeded',
					attachments: [{
						filename: 'logo.png',
						path: path.resolve('public/images/logo.png'),
						cid: 'logoinsignia'
					}],
					context: {
						email: data.notification_email,
					}
				}).then(r => console.log('MENSAJE ENVIADO SATISFACTORIAMENTE', r))
					.catch(err => console.log('ERROR AL ENVIAR MENSAJE', err))

			}).catch(err => res.status(err.error.status).render('error', err))
		
		} else {
			res.status(500).render('error', {
				title: 'ERROR',
				error: {
					'status': 500,
					'details': [
						{
							issue: 'El pago no fue aprovado.'
						}
					],
					'error_code': 27,
					'error': payment
				}
			})
		}

	}).catch(err => res.status(err.error.status).render('error', err))
}