const paypal       = require('../../../config/setup').paypal
const querystring  = require('querystring')
const Q            = require('q')
const db           = require('../../../config/db')
const path         = require('path')

function getPagos(con, paymentId) {
	const deferred = Q.defer()

	con.query(
		{
			sql     : `SELECT p.id_pago AS id, p.sms_id, p.sms_sc, p.sms_contenido, p.id_producto_insignia AS id_producto, p.redirect_url, p.consumidor_email, p.consumidor_telefono FROM insignia_payments_solutions.pagos p WHERE p.estado_pago = \'esperando_confirmacion\' AND p.id_api_call = '${paymentId}'`,
			timeout : 60000
		},
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
			} else deferred.resolve(results)
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
			} else deferred.resolve(result)
		}
	)

	return deferred.promise
}

function getIdusuarioConsumidor(connection, email_consumidor){
	const deferred = Q.defer()

	connection.query(
			{
				sql: `SELECT u.idusuario_ips FROM insignia_payments_solutions.usuario_ips u INNER JOIN insignia_payments_solutions.pagos p ON p.consumidor_email = u.email WHERE p.consumidor_email = '${email_consumidor}' LIMIT 1`,
				timeout: 60000
			},
			(error, results, fields) => {
				if (error) {
					console.log('Error en la consulta a pagos para el idusuario_ips: ', error)
					deferred.reject({
						title: 'ERROR',
						error: {
							'status': 500,
							'details': [
							{
								issue: 'Error para obtener la consulta en base de datos.'
							}
							],
							'error_code': 28,
							'error': error
						}
					})
				} else deferred.resolve(results)
			}
		)

	return deferred.promise

}

function insertOnNotifications(connection, payment, data){
	const deferred = Q.defer()
	let estadoNotification = (payment.transactions[0].related_resources[0].sale.state == 'completed' && payment.state == 'approved') ? 2 : 5;
	let asuntoNotification = (payment.transactions[0].related_resources[0].sale.state == 'completed' && payment.state == 'approved') ? 'Su compra fue aprobada satisfactoriamente' : 'Su compra ha sido rechazada';

	Q.all([
		db.getConnection(db.connection.ips)
	]).spread( con_ips => {
		const connection = {ips: con_ips}

		getIdusuarioConsumidor(connection.ips, data.email).then(idUsuarioIps => {
				connection.ips.query(
					{
						sql: `INSERT INTO insignia_payments_solutions.notificaciones (id_compra,idusuario_ips, asunto, mensaje, fecha, hora, estado) VALUES (?,?,?,?, CURDATE(), CURTIME(), ?)`,
						timeout: 60000
					},
					[
						payment.transactions[0].related_resources[0].sale.id,
						idUsuarioIps[0].idusuario_ips,
						asuntoNotification,
						'Haga click en el ticket para disfrutar de su contenido',
						estadoNotification
					],
					(error, result) => {
						if (error) {
							console.log('Error al insertar en notificaciones: ', error)
							deferred.reject({
								title: 'ERROR',
								error: {
									'status': 500,
									'details': [
										{
											issue: 'Error al insertar en la base de datos ips.'
										}
									],
									'error_code': 29,
									'error': error
								}
							})
						} else deferred.resolve(result)
					}
				)
			}).catch(err => {
				console.log(err)
				deferred.reject(err)
			})
	}).catch(err => {
		console.log(err)
		deferred.reject(err)
})

	return deferred.promise
}

function saveOnDatabase (payment, paymentId, base_url) {
	const deferred = Q.defer()

	Q.all([
		db.getConnection(db.connection.ips),
		db.getConnection(db.connection.sms)
	]).spread((con_ips, con_sms) => {
		const connection = { ips: con_ips, sms: con_sms }

		getPagos(connection.ips, paymentId).then(pagos => {

			let updatePagosOnIPS = []
			let insertSmsinOnSMS = []
			let insertIntoNotifications = []

			for (let pago of pagos) {
				const data = {
					id: pago.id,
					id_producto: pago.id_producto,
					sms: {
						id: pago.sms_id,
						sc: pago.sms_sc,
						origen: pago.sms_sc,
						contenido: pago.sms_contenido
					},
					email: pago.consumidor_email
				}

				// UPDATE EN BASE DE DATOS INSIGNIA_PAYMENTS_SOLUTIONS
				updatePagosOnIPS.push(updateIntoPagoIps(connection.ips, payment, data))

				// INSERT EN BASE DE DATOS SMSIN
				insertSmsinOnSMS.push(insertIntoSmsinInsignia(connection.sms, data))

				insertIntoNotifications.push(insertOnNotifications(connection.ips, payment, data))
			}

			Q.all([
				Q.all(updatePagosOnIPS),
				Q.all(insertSmsinOnSMS),
				Q.all(insertIntoNotifications)
			]).spread((ips, sms) => {
					
				deferred.resolve({
					status: 200,
					message: 'Pago procesado staisfactoriamente.',
					client: {
						email: pagos[0].consumidor_email,
						phone: pagos[0].consumidor_telefono
					},
					url: pagos[0].redirect_url,
					idCompra: payment.transactions[0].related_resources[0].sale.id
				})

			}).catch(err => deferred.reject(err))

		}).catch(err => deferred.reject(err))

		// Regresar connection al pool
		connection.ips.release()
		connection.sms.release()

	}).catch(err => {
		console.log('ERROR 37', err)
		deferred.reject({
			title: 'Error en conexion a base de datos',
			error: {
				status: 500,
				details: [
				{
					issue: 'Error estableciendo conexión a la base de datos.'
				}
				],
				error_code: 37,
				error: err
			}
		})
	})

	return deferred.promise
}

function executePayment (paymentId, payerId) {
	const deferred = Q.defer()

	paypal.payment.execute(paymentId, payerId, (err, payment) => {
		if(err) {
			console.log(err)
			updateOnFail(paymentId, 'errores', 'pago_no_aprovado').then(res => console.log('BD ACTUALIZADA')).catch(err => console.error('ERROR', err))
			deferred.reject({
				title: 'Ha ocurrido un problema', 
				error: {
					status: 500,
					details: [
						{
							issue: err.response.message
						}
					],
					error_code: 26,
					error: err
				}
			})
		} else deferred.resolve(payment)
	})

	return deferred.promise
}

function updateOnFail (paymentId, estado_pago, estado_compra = 'error_pago') {
	const deferred = Q.defer()

	db.connection.ips.query(
		{
			sql: 'UPDATE pagos SET estado_pago = ?, estado_compra = ? WHERE id_api_call = ?',	
			tiemeout: 60000
		},
		[
			estado_pago,
			estado_compra,
			paymentId
		],
		(err, result) => {
			err ? deferred.reject(err) : deferred.resolve(result)
		}
	)

	return deferred.promise
}

module.exports = function(req, res) {
	const paymentId = req.query.paymentId
	const payerId = { 
		payer_id: req.query.PayerID 
	}
	const base_url = `${req.protocol}://${req.get('host')}`

	let execute = (payerId, paymentId, base_url) => {
		return new Promise((resolve, reject) => {
			
		})
	}

	executePayment(paymentId, payerId).then(payment => {
		if (payment.state === 'approved') {
			saveOnDatabase(payment, paymentId).then(response => {
				console.log('DB SAVE RESULT', response)
				const url = `${base_url}/sales/success?${querystring.stringify({ url: response.url, paymentId: paymentId, idCompra: response.idCompra })}`
				res.redirect(url)
			}).catch(err => console.error('ERROR', err))
		} else {
			updateOnFail(paymentId, 'no_aprovado').then(res => console.log('BD ACTUALIZADA')).catch(err => console.error('ERROR', err))
			res.status(400).render('error', {
				title: 'Su pago no pudo ser procesado', 
				error: {
					status: 400,
					details: [
						{
							issue: `El pago no ha sido aprovado. (Estado del pago: ${payment.state})`
						}
					],
					error_code: 26,
					error: err
				}
			})
		}

	}).catch(err => {
		res.status(400).render('error', err)
	}).done(() => {
		console.log('EJECUCION DEL PAGO FINALIZADA')
	})
}