const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')
const path = require('path')

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
			if (err) {
				deferred.reject(err)
			} else {
				console.log('RESULTADO DEL UPDATE', result)
				deferred.resolve(result)
			}
		}
	)

	return deferred.promise
}

function sendEmailNotification (con, id_api_call, email) {
	const deferred = Q.defer()

	con.query(
		`SELECT p.consumidor_email AS email, p.id_api_call AS id_api_call FROM pagos p WHERE id_api_call = ?`,
		[ id_api_call ],
		(err, result) => {
			if (err) {
				deferred.reject(err)
			} else {
				if (result.length > 0) {
					let recipient = result[0].email
					let id_api_call = result[0].id_api_call
					email.newAsync(recipient, email.subject, email.template, { email: recipient, id_api_call: result[0].id_api_call }, email.attachments).then(info => {
						deferred.resolve(`Message ${info.messageId} sent: ${info.response}`)
					}).catch(err => {
						deferred.reject(err)
					})
				} else 
					deferred.reject({ error: `No existe ningun pago asociado al id_api_call: ${id_api_call}` })
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

	db.promise.ips().then(con => {

		updatePaymentStatus(con, payment, id_api_call).then(res => {

			// Info de email
			let email = {
				subject: 'Solicitud de pago fallida',
				template: 'payment_failed',
				attachments: [{
					filename: 'logo.png',
					path: path.resolve('public/images/logo.png'),
					cid: 'logoinsignia'					
				}]
			}

			// Enviar email de notificacion
			sendEmailNotification(con, id_api_call, email).then(r => {
				console.log('MENSAJE ENVIADO', r)
			}).catch(err => {
				console.log('ERROR AL ENVIAR MENSAJE', err)
			})

		}).catch(err => {
			console.log('ERROR AL ACTUALIZAR EN DB', err)
		})

		// Cerrar conexion a db
		con.release()
	}).catch(err => {
		console.log('ERROR AL CONECTAR CON DB', err)
	})
}