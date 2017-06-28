const Q     = require('q')
const db    = require('../../../config/db')
const email = require('../../../enviroments/email')
const path  = require('path')

function updatePaymentStatus (con, payment, id_api_call) {
	const deferred = Q.defer()

	con.query(
		`UPDATE pagos SET estado_compra = ?, estado_pago = ? WHERE id_api_call = ?`,
		[
			payment.estado_compra,
			payment.estado_pago,
			id_api_call
		],
		(err, result) => {
			if (err)
				deferred.reject(err)
			else {
				console.log('RESULTADO DEL UPDATE', result)

				if (result.affectedRows > 0)
					deferred.resolve(result)
				else
					deferred.reject({ error: `No existe ningun pago asociado al id_api_call: ${id_api_call}` })
			}
		}
	)

	return deferred.promise
}

function sendNotification (con, id_api_call) {
	const deferred = Q.defer()

	con.query(
		`SELECT p.consumidor_email AS email, p.consumidor_telefono AS phone FROM pagos p WHERE id_api_call = ?`,
		[ id_api_call ],
		(err, result) => {
			if (err) {
				deferred.reject(err)
			} else {
				let recipient = {
					email: result[0].email,
					phone: result[0].phone
				}

				const email = {
					to: recipient.email,
					subject: 'Solicitud de pago fallida',
					template: 'payment_failed',
					context: {
						email: recipient.email,
						id_api_call
					},
					attachments: [{
						filename: 'logo.png',
						path: path.resolve('public/images/logo.png'),
						cid: 'logoinsignia'
					}]
				}

				const sms = {
					phone: recipient.phone,
					message: `Ha ocurrido un error al procesar su pago con id ${id_api_call}, porfavor intente de nuevo.`
				}

				notifications.new(email, sms).then(response => deferred.resolve(response)).catch(err => deferred.reject(err))
			}
		}
	)

	return deferred.promise
}

module.exports = webhook => {
	const payment = {
		estado_pago: 'failed',
		estado_compra: 'error_pago'
	}
	const id_api_call = webhook.data.object.source.id

	db.getConnection(db.promise.ips).then(con => {

		updatePaymentStatus(con, payment, id_api_call).then(res => {

			sendNotification(con, id_api_call).then(response => {
				console.log('EMAIL ENVIADO', response.email)
				console.log('SMS ENVIADO', response.sms)
			}).catch(err => console.log('ERROR AL PROCESAR NOTIFICACION', err))

		}).catch(err => console.log('ERROR AL ACTUALIZAR EN DB', err))

		// Cerrar conexion a db
		con.release()
	}).catch(err => console.log('ERROR AL CONECTAR CON DB', err))
}