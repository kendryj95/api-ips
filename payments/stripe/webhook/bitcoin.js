const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')
const path = require('path')

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
						let updates = []

						results.forEach(o => {
							updates.push(new Promise((resolve, reject) => {
								con.query(
									'UPDATE pagos SET estado_pago = ? WHERE id_api_call = ?',
									[
										status,
										id_api_call
									],
									(err, result) => {
										if (err) {
											reject(err)
										} else {
											resolve(result)
										}
									}
								)
							}))							
						})

						Q.all(updates).then(result => {
							console.log('===================================')
							console.log(results)
							console.log('===================================')

							deferred.resolve({
								client: {
									email: results[0].email,
									phone: results[0].phone
								}
							})
						}).catch(error => {
							deferred.reject(error)
						})
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

		console.log(webhook)

		const email = {
			to: result.client.email,
			subject: 'Nuevo pago con bitcoin',
			template: 'chargeable_bitcoin',
			context: {
				email: result.client.email,
				url: `/sales/pay/stripe/bitcoin/execute?id_api_call=${id_api_call}`,
				amount: (parseInt(webhook.data.bitcoin.amount) / 100000000)
			},
			attachments: [{
				filename: 'logo.png',
				path: path.resolve('public/images/logo.png'),
				cid: 'beta@beta.com'
			}]
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

module.exports = (webhook) => {
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