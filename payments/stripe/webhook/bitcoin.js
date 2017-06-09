const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')

function handleDB (id_api_call, status) {
	const deferred = Q.defer()

	db.pool.ips.getConnection((err, con) => {
		if (err) {
			deferred.reject(err)
		} else {

			con.query(
				{
					sql: 'SELECT * FROM pagos WHERE id_api_call = ?',
					timeout: 900		
				},
				[
					id_api_call
				],
				(err, results) => {
					if (err) {
						deferred.reject(err)
					} else {
						let has_error = false
						results.forEach(o => {

							con.query(
								'UPDATE pagos SET estado_pago = ? WHERE id_api_call = ?',
								[
									status,
									id_api_callid
								],
								(err, result) => {
									if (err) {
										has_error = true
										deferred.reject(err)
									}
								}
							)
						})

						if (!has_error) {
							deferred.resolve({
								client: {
									email: results[0].consumidor_email,
									phone: results[0].consumidor_telefono
								}
							})
						}
					}
				}
			)

		}
	})

	return deferred.promise
}

function handleNotificationsByEmail (data) {
	const deferred = Q.defer()

	email.newAsync(data.to, data.subject, data.template, data.context).then(info => {
		deferred.resolve(`Message ${info.messageId} sent: ${info.response}`)
	}).catch(err => {
		deferred.reject(err)
	})

	return deferred.promise
}

function handleChargeable (webhook) {
	const status      = 'chargeable',
				id_api_call = data.webhook.data.object.id

	handleDB(id_api_callid, status).then(result => {

		const email = {
			to: result.client.email,
			subject: 'test webhook',
			template: 'new_pay',
			context: {
				email: result.client.email
			}
		}

		handleNotificationsByEmail(email).then(r => {

			console.log(r)

		}).catch(err => {
			console.log(err)
		})

	}).catch(err => {
		console.log(err)
	})
}

module.exports = webhook => {
	switch (webhook.type) {
		case 'source.chargeable': 
			handleChargeable(webhook)
		break
		default:
			console.log(webhook.type)
		break
	}
}