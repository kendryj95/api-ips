const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')
const path = require('path')

function updatePaymentToCompleted (con, payment, id_api_call) {
	const deferred = Q.defer()

	con.query(
		`UPDATE pagos SET estado_compra = ?, estado_pago = ?, id_compra = ? WHERE id_api_call = ?`,
		[
			payment.estado_compra,
			payment.estado_pago,
			payment.id,
			id_api_call
		],
		(err, result) => {
			if (err)	deferred.reject(err)
			else {
				console.log('RESULTADO DEL UPDATE: ', result)

				if (result.affectedRows > 0)
					deferred.resolve(result)
				else
					deferred.reject({ error: `No existe ningun pago asociado al id_api_call: ${id_api_call}` })
			}
		}
	)

	return deferred.promise
}

function sendEmailNotification (con, data) {
	const deferred = Q.defer()

	con.query(
		`SELECT p.consumidor_email AS email FROM pagos p WHERE id_api_call = ?`,
		[ data.id_api_call ],
		(err, result) => {
			if (err) {
				deferred.reject(err)
			} else {
				console.log(result)

				let recipient = result[0].email
				
				email.newAsync(recipient, data.subject, data.template, { email: recipient }, data.attachments).then(info => {
					deferred.resolve(`Message ${info.messageId} sent: ${info.response}`)
				}).catch(err => {
					deferred.reject(err)
				})
			}
		}
	)

	return deferred.promise
}

function getIpsData (con, id_api_call) {
	const deferred = Q.defer()

	con.query(
		`SELECT * FROM pagos p WHERE id_api_call = ?`,
		[ id_api_call ],
		(err, result) => {
			if (err) {
				deferred.reject(err)
			} else {
				deferred.resolve(result)
			}
		}
	)	

	return deferred.promise
}

function getMetodosDePago (con) {
	const deferred = Q.defer()

	con.query(
		`SELECT * FROM metodos_de_pago`,
		(err, result) => {
			if (err) {
				deferred.reject(err)
			} else {
				let metodos = []
				result.forEach(r => {
					metodos.push({ id: r.id_metodo_de_pago, desp_op: r.descripcion })
				})
				deferred.resolve(metodos)
			}
		}
	)

	return deferred.promise
}

function saveOnSMSINdb (id_api_call) {
	const deferred = Q.defer()

	Q.all([
		db.promise.ips(),
		db.promise.insignia()
	]).spread((con_ips, con_insignia) => {

		// Obtener los pagos con id_api_call especifico y metodos de pago
		Q.all([
			getIpsData(con_ips, id_api_call),
			getMetodosDePago(con_ips)
		]).spread((data, metodos) => {

			let products = []

			data.forEach(o => {
			
				let desp_op = ''

				metodos.forEach(metodo => {
					if (o.id_metodo_pago === metodo.id)
						desp_op = metodo.desp_op
				})

				products.push(new Promise((resolve, reject) => {
					con_insignia.query(
						`INSERT INTO smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?)`,
						[
							o.sms_id,
							o.sms_sc,
							o.sms_sc,
							o.sms_contenido,
							1,
							desp_op,
							o.id_producto_insignia
						],
						(err, result) => {
							if (err) 
								reject(err)
							else
								resolve(result)
						}
					)
				}))
			})

			Q.all(products).then(res => deferred.resolve(res)).catch(err => deferred.reject(err))

		}).catch(err => deferred.reject(err)).done()

		// Cerrar conexiones
		con_insignia.release()
		con_ips.release()

	}).catch(err => deferred.reject(err)).done()

	return deferred.promise
}

module.exports = webhook => {
	let payment = {
		estado_pago: 'approved',
		estado_compra: 'completed',
		id: webhook.data.object.id
	}
	let id_api_call = webhook.data.object.source.id

	db.promise.ips().then(con => {

		let data = {
			id_api_call,
			subject: 'Nuevo pago procesado satisfactoriamente',
			template: 'payment_succeeded',
			attachments: [{
				filename: 'logo.png',
				path: path.resolve('public/images/logo.png'),
				cid: 'logoinsignia'
			}]
		}

		/*
		 * Guardar pago en SMSIN
		 * Hacer update a pago en ips
		 * Enviar notificacion por email
		 */
		Q.all([
			updatePaymentToCompleted(con, payment, id_api_call),
			saveOnSMSINdb(id_api_call),
			sendEmailNotification(con, data)
		]).spread((updateResultIps, insertResultInsignia, sendEmailNotificationResult) => {

			console.log('PAGO ACTUALIZADO EN IPS', updateResultIps)
			console.log('PAGO GUARDADO EN SMSIN', insertResultInsignia)
			console.log('EMAIL ENVIADO', sendEmailNotificationResult)

		}).catch(err => console.log(err)).done()

		// Cerrar conexion con IPS DB
		con.release()

	}).catch(err => console.log(err))
}