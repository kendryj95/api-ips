const paypal       	= require('../../../config/setup').paypal
const querystring  	= require('querystring')
const Q            	= require('q')
const db           	= require('../../../config/db')
const path         	= require('path')
const notifications = require('../../../enviroments/notifications/')
const formatter = require('../../../enviroments/formatter')
const handleToken = require('../../../enviroments/token')

var saldo = 0

function getPagos(con, paymentId) {
	const deferred = Q.defer()

	con.query(
		{
			sql     : `SELECT p.id_pago AS id, p.sms_id, p.sms_sc, p.monto AS amount, p.sms_contenido, p.id_producto_insignia AS id_producto, p.redirect_url, p.consumidor_email, p.consumidor_telefono FROM insignia_payments_solutions.pagos p WHERE p.estado_pago = \'esperando_confirmacion\' AND p.id_api_call = '${paymentId}'`,
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

function insertSaldoIPS(connection, email, saldo, token){
	const deferred = Q.defer()

	if (saldo > 0) {
		Q.all([
			db.getConnection(db.connection.ips)
		]).spread( con_ips => {
			const connection = {ips: con_ips}

			getIdusuarioConsumidor(connection.ips, email).then(idUsuarioIps => {
				connection.ips.query(
					{
						sql: `UPDATE saldos_usuarios_ips SET saldo_ips=?, token=?, consumido=? WHERE id_usuario=?`,
						timeout: 60000
					},
					[
						saldo,
						token,
						0,
						idUsuarioIps[0].idusuario_ips
					],
					(error, result) => {
						if (error) {
							console.log('Error al insertar en saldos_usuarios_ips: ', error)
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

	}
		return deferred.promise

}

function insertOnNotifications(connection, payment, email){
	const deferred = Q.defer()
	let estadoNotification = (payment.transactions[0].related_resources[0].sale.state == 'completed' && payment.state == 'approved') ? 2 : 5;
	let asuntoNotification = (payment.transactions[0].related_resources[0].sale.state == 'completed' && payment.state == 'approved') ? 'Su compra fue aprobada satisfactoriamente' : 'Su compra ha sido rechazada';

	Q.all([
		db.getConnection(db.connection.ips)
	]).spread( con_ips => {
		const connection = {ips: con_ips}

		getIdusuarioConsumidor(connection.ips, email).then(idUsuarioIps => {
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
	let token = null

	Q.all([
		db.getConnection(db.connection.ips),
		db.getConnection(db.connection.sms)
	]).spread((con_ips, con_sms) => {
		const connection = { ips: con_ips, sms: con_sms }

		getPagos(connection.ips, paymentId).then(pagos => {

			let updatePagosOnIPS = []
			let insertSmsinOnSMS = []

			console.log(pagos)

			for (let pago of pagos) {
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

				// UPDATE EN BASE DE DATOS INSIGNIA_PAYMENTS_SOLUTIONS
				updatePagosOnIPS.push(updateIntoPagoIps(connection.ips, payment, data))

				// INSERT EN BASE DE DATOS SMSIN
				insertSmsinOnSMS.push(insertIntoSmsinInsignia(connection.sms, data))

				if (pago.sms_contenido.indexOf("saldo") != -1) { // si el contenido es de tipo saldo
						if (token == null) {
							token = handleToken.getTokenEncoded()
						}
						saldo += parseInt(formatter.numberFormat(pago.amount)) //acumular todo el saldo comprado
				}

			}

			console.log("hola ",pagos)

			Q.all([
				Q.all(updatePagosOnIPS),
				Q.all(insertSmsinOnSMS),
				Q.all(insertOnNotifications(connection.ips, payment, pagos[0].consumidor_email)),
				Q.all(insertSaldoIPS(connection.ips, pagos[0].consumidor_email, saldo, token))
			]).spread((ips, sms, not, saldo) => {

				console.log("INSERT SALDO===>", saldo)
					
				deferred.resolve({
					status: 200,
					message: 'Pago procesado satisfactoriamente.',
					client: {
						email: pagos[0].consumidor_email,
						phone: pagos[0].consumidor_telefono
					},
					url: pagos[0].redirect_url,
					idCompra: payment.transactions[0].related_resources[0].sale.id,
					tkn: token
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
	console.log("paymentId:",paymentId,"payerId",payerId)
	paypal.payment.execute(paymentId, payerId, (err, payment) => {
		if(err) {
			console.log("ERROR AL CONSULTAR ==> ",err)
			updateOnFail(paymentId, 'errores', 'pago_no_aprovado').then(res => console.log('BD ACTUALIZADA')).catch(err => console.error('ERROR', err))
			deferred.reject({
				title: 'Ha ocurrido un problema', 
				error: {
					status: 500,
					details: [
						{
							issue: typeof(err.response) != "undefined" ? err.response.message : "Problema de conexión"
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
	//const base_url = `${req.protocol}://${req.get('x-forwarded-host')}` // base url cuando la app está alojada a un servidor con su DNS (o dominio), de lo contrario usar la de abajo y comentar ésta.
	const base_url = `${req.protocol}://${req.get('host')}`


	let execute = (payerId, paymentId, base_url) => {
		return new Promise((resolve, reject) => {
			
		})
	}

	executePayment(paymentId, payerId).then(payment => {
		console.log("executePayment ==> payment", payment)
		console.log("TIPO DE DATOS payment.state", typeof(payment.state))
		if (payment.state === 'approved') {
			saveOnDatabase(payment, paymentId).then(response => {
				console.log('DB SAVE RESULT', response)
				const url = `${base_url}/sales/success?${querystring.stringify({ url: response.url, paymentId: paymentId, idCompra: response.idCompra, tkn: response.tkn })}`
				res.redirect(url)
			}).catch(err => console.error('ERROR', err))
		} else {
			updateOnFail(paymentId, 'no_aprovado').then(res => console.log('BD ACTUALIZADA')).catch(err => console.error('ERROR', err))
			
			// Eliminamos toda session de la compra
			req.ips_session.reset()

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
		console.log("executePayment ==> err", err)
		console.log("executePayment ==> err.error.details", err.error.details)
		console.log("executePayment ==> err.error.error.response", err.error.error.response)
		// Eliminamos toda session de la compra
		req.ips_session.reset()
		res.status(400).render('error', err)
	}).done(() => {
		console.log('EJECUCION DEL PAGO FINALIZADA')
	})
}