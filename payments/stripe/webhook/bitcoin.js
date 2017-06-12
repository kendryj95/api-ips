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
					sql: 'SELECT p.consumidor_email AS email, p.consumidor_telefono AS phone FROM pagos p WHERE id_api_call = ?',
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
									id_api_call
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
									email: results[0].email,
									phone: results[0].phone
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
				id_api_call = webhook.data.object.id

	handleDB(id_api_call, status).then(result => {

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

function handleCanceled (webhook) {
	const status      = 'canceled',
				id_api_call = webhook.data.object.id

	handleDB(id_api_call, status).then(result => {

		const email = {
			to: result.client.email,
			subject: 'canceled payment bitcoin webhook',
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

	}).catch(error => {
		console.log(error)
	})
}

function handleConsumed (webhook) {
	const status      = 'consumed',
				id_api_call = webhook.data.object.id

	handleDB(id_api_call, status).then(result => {

		const email = {
			to: result.client.email,
			subject: 'consumed payment bitcoin webhook',
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

	}).catch(error => {
		console.log(error)
	})
}


module.exports = webhook => {
	switch (webhook.type) {
		case 'source.chargeable': 
			handleChargeable(webhook)
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