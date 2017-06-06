const paypal = require('paypal-rest-sdk')
const querystring = require('querystring')
const Q = require('q')
const db = require('../../config/db')

function saveOnDatabase (payment, paymentId) {
	const deferred = Q.defer()

	db.pool.ips.getConnection((err, con) => {
		con.query(
			'SELECT p.id_pago AS id, p.sms_id, p.sms_sc, p.sms_contenido, p.id_producto_insignia AS id_producto, p.redirect_url, p.consumidor_email, p.consumidor_telefono FROM insignia_payments_solutions.pagos p WHERE p.estado_pago = \'esperando_confirmacion\' AND p.id_api_call = \''+paymentId+'\'',
			(error, results, fields) => {
				if (error) {
					deferred.reject({
						title: 'ERROR',
						error: {
							'status': 500,
							'message': 'Error whil trying retriving data from database.',
							'error_code': 28,
							'error': error
						}
					})
				}

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
										'message': 'Error al actualizar la base de datos ips.',
										'error_code': 29,
										'error': err
									}
								})
							}
						}
					)

					// INSERT EN BASE DE DATOS DE INSIGNIA (SMSIN)
					db.connection.insignia.query(
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
										'message': 'Error while trying insert on database',
										'error_code': 31,
										'error': err
									}
								})
							}
						}
					)
				}

				deferred.resolve({
					'status': 200,
					'message': 'Pago procesado staisfactoriamente.',
					'notification_email': results[0].consumidor_email,
					'natifications_phone': results[0].consumidor_telefono,
					'url': results[0].redirect_url,
					'idCompra': payment.transactions[0].related_resources[0].sale.id
				})

				con.release()
			}
		)
	})

	return deferred.promise
}

module.exports = function(req, res) {
	try {
		require('../../config/setup')
	
		const paymentId = req.query.paymentId
		const payerId = { 
			payer_id: req.query.PayerID 
		}

		paypal.payment.execute(paymentId, payerId, function(error, payment){
			if(error){
				res.status(500).render('error', {
					title: 'ERROR', 
					error: {
						"status": 500,
						"message": "Paypal error",
						"error_code": 26,
						"error": error
					}
				})
			} else {
				let response_paypal = {}

				if (payment.state == 'approved') {

					saveOnDatabase(payment, paymentId)
					.then(data => {
						const url = req.protocol + '://' +req.get('host') + '/sales/success?' + querystring.stringify({ 
							url: data.url,
							paymentId: paymentId,
							idCompra: data.idCompra
						})
						res.redirect(url)

						// Enviar una notificación por email y sms
						const mail = {
							to: data.notification_email,
							subject: 'Nuevo pago procesado satisfactoriamente',
							template: 'new_pay',
							context: {
								email: data.notification_email,
							}, 
							callback: (error, info) => {
								if (error)
									console.log(error)
								else 
									console.log('Message %s sent: %s', info.messageId, info.response)
							}
						}
						require('../../enviroments/notifications/new')(mail)
					})
					.catch(error => {
						res.status(error.error.status).render('error', error)
					})

				} else {
					response_paypal = {
						title: "ERROR",
						error: {
							"status": 500,
							"message": "Payment was not approved.",
							"error_code": 27,
							"error": payment
						}
					}
				}
			}
		})
	} catch(e) {
		res.status(500).render('error', {
			title: 'error',
			error: {
				'status': 500,
				'message': 'Error desconocido',
				'error_code': 34,
				'error': e
			}
		})
	}
}