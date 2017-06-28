const paypal        = require('../../../config/setup').paypal
const db            = require('../../../config/db')
const notifications = require('../../../enviroments/notifications/')
const Q             = require('q')
const path          = require('path')
const webhookId     = '3D285340XL1687508'

function newNotification (notification, id_api_call) {
	const deferred = Q.defer()
	let   newEmail    = null

	let getPayData = id_api_call => {
		return new Promise((resolve, reject) => {
			db.connection.ips.query(
				'SELECT p.consumidor_email AS email, p.consumidor_telefono AS phone FROM pagos p WHERE p.id_api_call = ?',
				[ id_api_call ],
				(err, result) => {
					if (err) reject(err)
					else result.length > 0 ? resolve(result[0]) : reject({ error: 'No se ha encontrado un pago con el id elegido.' })
				}
			)
		})
	}

	switch (notification.type) {
		case 'success':
			newEmail = {
				subject: `Nuevo pago procesado satisfactoriamente (${id_api_call})`,
				template: 'payment_succeeded'
			}
		break
		case 'denied':
			newEmail = {
				subject: `Nuevo pago fallido (${id_api_call})`,
				template: 'payment_failed'
			}
		break
		case 'pending':
			console.log('NO NOTIFICATION FOR PENDING EVENT [PAYPAL]')
		break
		case 'refunded':
			console.log('NO NOTIFICATION FOR REFUNDED EVENT [PAYPAL]')
		break
		case 'reversed':
			console.log('NO NOTIFICATION FOR REVERSED EVENT [PAYPAL]')
		break
	}

	if (newEmail != null) {
		getPayData(id_api_call).then(recipient => {
			const email = {
				to: recipient.email,
				subject: newEmail.subject,
				template: newEmail.template,
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
				phone   : recipient.phone,
				message : `Su pago con id ${id_api_call} ha sido procesado satisfactoriamente.`
			}

			notifications.new(email, sms).then(response => deferred.resolve(response)).catch(err => deferred.reject(err))

		}).catch(err => deferred.reject(err))
	} else {
		deferred.reject({ error: 'No se ha especificado el tipo de notificación.' })
	}

	return deferred.promise
}

module.exports = (req, res) => {
	const eventBody  = req.body
	const headers    = {
    'paypal-auth-algo'         : 'SHA256withRSA',
    'paypal-cert-url'          : req.headers['paypal-cert-url'],
    'paypal-transmission-id'   : req.headers['paypal-transmission-id'],
    'paypal-transmission-sig'  : req.headers['paypal-transmission-sig'],
    'paypal-transmission-time' : req.headers['paypal-transmission-time']
	}

	paypal.notification.webhookEvent.verify(headers, eventBody, webhookId, (err, res) => {
		if (err) console.error('ERROR VALIDACION DE NOTIFICACION', err)
		else if (res.verification_status === 'SUCCESS') {

			const payment = eventBody.resource

			switch (eventBody.event_type) {
				case 'PAYMENT.SALE.COMPLETED':
					console.log('PAYMENT.SALE.COMPLETED')
					newNotification({ type: 'success' }, payment.parent_payment).then(response => {
						console.log(`SMS ENVIADO   : id ${response.sms.insertId}`)
						console.log(`EMAIL ENVIADO : to ${response.email.envelope.to[0]} by ${response.email.messageId}`)
					}).catch(err => console.error(`${eventBody.event_type}_ERROR`, err))
				break

				case 'PAYMENT.SALE.DENIED':
					console.log('PAYMENT.SALE.DENIED')
					newNotification({ type: 'denied' }, payment.parent_payment).then(response => {
						console.log(`SMS ENVIADO   : id ${response.sms.insertId}`)
						console.log(`EMAIL ENVIADO : to ${response.email.envelope.to[0]} by ${response.email.messageId}`)
					}).catch(err => console.error(`${eventBody.event_type}_ERROR`, err))
				break		

				case 'PAYMENT.SALE.PENDING':
					console.log('PAYMENT.SALE.PENDING')
					newNotification({ type: 'pending' }, payment.parent_payment).then(response => {
						console.log(`SMS ENVIADO   : id ${response.sms.insertId}`)
						console.log(`EMAIL ENVIADO : to ${response.email.envelope.to[0]} by ${response.email.messageId}`)
					}).catch(err => console.error(`${eventBody.event_type}_ERROR`, err))
				break

				case 'PAYMENT.SALE.REFUNDED':
					console.log('PAYMENT.SALE.REFUNDED')
					newNotification({ type: 'refunded' }, payment.parent_payment).then(response => {
						console.log(`SMS ENVIADO   : id ${response.sms.insertId}`)
						console.log(`EMAIL ENVIADO : to ${response.email.envelope.to[0]} by ${response.email.messageId}`)
					}).catch(err => console.error(`${eventBody.event_type}_ERROR`, err))
				break

				case 'PAYMENT.SALE.REVERSED':
					console.log('PAYMENT.SALE.REVERSED')
					newNotification({ type: 'reversed' }, payment.parent_payment).then(response => {
						console.log(`SMS ENVIADO   : id ${response.sms.insertId}`)
						console.log(`EMAIL ENVIADO : to ${response.email.envelope.to[0]} by ${response.email.messageId}`)
					}).catch(err => console.error(`${eventBody.event_type}_ERROR`, err))
				break

				default:
					console.log('UNDIFINED EVENT TYPE')
				break
			}

		} else console.error('ERROR VERIFICATION STATUS', res)
	})

	res.sendStatus(200)
}