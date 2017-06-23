const Q            = require('q')
const db           = require('../../../config/db')
const email        = require('../../../enviroments/email')
const notification = require('../../../enviroments/notifications/')
const path         = require('path')

function getClientDataFromPayment (id_api_call) {
	return new Promise((resolve, reject) => {
		db.connection.ips.query(
			{
				sql     : 'SELECT p.consumidor_email AS email, p.consumidor_telefono AS phone FROM pagos p WHERE id_api_call = ?',
				timeout : 6000
			},
			[
				id_api_call
			],
			(err, result) => {
				if (err) reject(err)
				else resolve(result)
			}
		)
	})
}

function updateUpdatePayment (id_api_call, estado_pago, estado_compra) {
	return new Promise((resolve, reject) => {
		db.connection.ips.query(
			{
				sql     : 'UPDATE pagos SET estado_pago = ?, estado_compra = ? WHERE id_api_call = ?',
				timeout : 6000
			},
			[
				estado_pago,
				estado_compra,
				id_api_call
			],
			(err, result) => {
				if (err) reject(err)
				else resolve(result)
			}
		)
	})
}

function handleDB (id_api_call, status, estado_compra = 'esperando_pago') {
	const deferred = Q.defer()

	Q.all([
		getClientDataFromPayment(id_api_call),
		updateUpdatePayment(id_api_call, status, estado_compra)
	]).spread((client, resultUpdate) => {
		console.log('RESULTADO DEL UPDATE', resultUpdate)
		deferred.resolve({
			client: {
				email: results[0].email,
				phone: results[0].phone
			}
		})
	}).catch(err => deferred.reject(err))

	Promise.resolve().then(() => {
		return getClientDataFromPayment(id_api_call)
	}).then(client => {
		return 
	})

	return deferred.promise
}

function handleNotificationsByEmail (data) {
	const deferred = Q.defer()

	email.newAsync(data.to, data.subject, data.template, data.context, data.attachments).then(info => {
		deferred.resolve(`Message ${info.messageId} sent: ${info.response}`)
	}).catch(err => {
		deferred.reject(err)
	})

	return deferred.promise
}

function handleChargeable (webhook, url) {
	const status      = 'chargeable',
				id_api_call = webhook.data.object.id

	handleDB(id_api_call, status).then(result => {

		const email = {
			to: result.client.email,
			subject: 'Nuevo pago con bitcoin',
			template: 'stripe/bitcoin/chargeable',
			context: {
				email: result.client.email,
				url: `${url}/sales/pay/stripe/bitcoin/execute?id_api_call=${id_api_call}`,
				amount: (parseInt(webhook.data.object.bitcoin.amount) / 100000000),
				id_api_call
			},
			attachments: [{
				filename: 'logo.png',
				path: path.resolve('public/images/logo.png'),
				cid: 'logoinsignia'
			}]
		}

		const sms = {
			phone: result.client.phone,
			message: `Nuevo pago con bitcoins creado, porfavor conforme su pago siguiendo los pasos enviados a su direccion de correo electrónico`
		}

		//handleNotificationsByEmail(email).then(r => console.log(r)).catch(err => console.log(err))

		notification.new(email, sms).then(response => {
			console.log('EMAIL ENVIADO', response.email)
			console.log('SMS ENVIADO', response.sms)
		}).catch(err => console.log(err))

	}).catch(err => {
		console.log(err)
	})
}

function handleCanceled (webhook) {
	const status        = 'canceled',
				id_api_call   = webhook.data.object.id,
				estado_compra = 'error_pago'

	handleDB(id_api_call, status, estado_compra).then(result => {

		const email = {
			to: result.client.email,
			subject: 'Tiempo para conformar pago expirado',
			template: 'stripe/bitcoin/canceled',
			context: {
				email: result.client.email,
				id_api_call
			},
			attachments: [{
				filename: 'logo.png',
				path: path.resolve('public/images/logo.png'),
				cid: 'logoinsignia'
			}]
		}

		const sms = {
			phone: result.client.phone,
			message: `El tiempo para conforma su pago con id ${id_api_call} ha expirado, porfavor intente de nuevo.`
		}

		//handleNotificationsByEmail(email).then(r => console.log(r)).catch(err => console.log(err))

		notification.new(email, sms).then(response => {
			console.log('EMAIL ENVIADO', response.email)
			console.log('SMS ENVIADO', response.sms)
		}).catch(err => console.log(err))

	}).catch(error => {
		console.log(error)
	})
}

function handleConsumed (webhook) {
	const status        = 'approved',
				id_api_call   = webhook.data.object.id,
				estado_compra = 'completed'

	handleDB(id_api_call, status, estado_compra).then(result => {
		console.log(result)
	}).catch(error => {
		console.log(error)
	})
}

module.exports = (webhook, url) => {
	switch (webhook.type) {
		case 'source.chargeable': 
			handleChargeable(webhook, url)
		break
		case 'source.canceled':
			handleCanceled(webhook)
		break
		case 'source.consumed':
			handleConsumed(webhook)
		break
		default:
			console.log(webhook.type)
		break
	}
}