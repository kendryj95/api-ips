const Q             = require('q')
const db            = require('../../../config/db')
const notifications = require('../../../enviroments/notifications/')

function getConnectionDB (pool) {
	return new Promise((resolve, reject) => {
		pool.getConnection((err, con) => err ? reject(err) : resolve(con))
	})
}

function updatePago (con, data) {
	return new Promise((resolve, reject) => {
		con.query(
			'UPDATE pagos SET estado_pago = ? WHERE id_api_call = ?',
			[
				data.status,
				data.id_api_call
			],
			(err, result) => {
				err ? reject(err) : resolve(result)
			}
		)
	})
}

function getEmailPhone (con, id_api_call) {
	return new Promise((resolve, reject) => {
		con.query(
			{
				sql: 'SELECT p.consumidor_email AS email, p.consumidor_telefono AS phone FROM pagos p WHERE id_api_call = ?',
				timeout: 900		
			},
			[
				id_api_call
			],
			(err, result) => {
				err ? reject(err) : resolve(result)
			}
		)
	})
}

function handleDB (id_api_call, status, estado_compra = 'esperando_confirmacion') {
	const deferred = Q.defer()

	getConnectionDB(db.connection.ips).then(con => {

		Q.all([
			updatePago(con, { status, id_api_call }),
			getEmailPhone(con, id_api_call)
		]).spread((update, client) => {

			console.log('UPDATE RESULT', update)
			const email = {
				to: client.email,
				subject: 'Nuevo pago con bitcoin',
				template: 'stripe/bitcoin/chargeable',
				context: {
					email: client.email,
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
				phone: client.phone,
				message: `Nuevo pago con bitcoins creado, porfavor conforme su pago siguiendo los pasos enviados a su direccion de correo electrónico`
			}

			notifications.new(email, sms).then(response => {
				console.log('EMAIL ENVIADO', response.email)
				console.log('SMS ENVIADO', response.sms)
			}).catch(err => console.log(err))

			deferred.resolve({ client })

		}).catch(err => deferred.reject(err))

		con.release()
	}).catch(err => deferred.reject(err))

	return deferred.promise
}

module.exports = (webhook) => {
	switch (webhook.type) {
		case 'source.chargeable': 
			//handleChargeable(webhook)
		break
		case 'source.canceled':
			//handleCanceled(webhook)
		break
		case 'source.consumed':
			//handleConsumed(webhook)
		break
		default:
			console.log(webhook.type)
		break
	}
}