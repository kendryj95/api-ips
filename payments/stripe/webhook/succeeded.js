const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')
const path = require('path')

function updatePaymentToCompleted (payment, id_api_call) {
	const deferred = Q.defer()

	db.connection.ips.query(
		`UPDATE pagos SET estado_compra = ?, estado_pago = ?, id_compra = ? WHERE id_api_call = ?`,
		[
			payment.estado_compra,
			payment.estado_pago,
			payment.id,
			id_api_call
		],
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

function sendEmailNotification (data) {
	const deferred = Q.defer()

	db.connection.ips.query(
		`SELECT p.consumidor_email AS email FROM pagos p WHERE id_api_call = ?`,
		[ data.id_api_call ],
		(err, result) => {
			if (err) {
				deferred.reject(err)
			} else {
				console.log(result)
				
				let recipient = ''

				if (result.length > 1) {
					recipient = result[0].email	
				} else {
					recipient = result.email
				}

				console.log(recipient)

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

module.exports = webhook => {

	let payment = {
		estado_pago: 'approved',
		estado_compra: 'completed',
		id: webhook.data.object.id
	}
	let id_api_call = webhook.data.object.source.id

	updatePaymentToCompleted(payment, id_api_call).then(result => {
		
		let data = {
			id_api_call,
			subject: 'Nuevo pago satisfactorio',
			template: 'payment_succeeded',
			attachments: [{
				filename: 'logo.png',
				path: path.resolve('public/images/logo.png'),
				cid: 'logoinsignia'
			}]
		}

		sendEmailNotification(data).then(r => {
			console.log(r)
		}).catch(err => {
			console.log(err)
		})

	}).catch(err => {
		console.log(err)
	})

}