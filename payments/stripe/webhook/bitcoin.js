const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')

function handleDB (data) {
	const deferred = Q.defer()

	db.pool.ips.getConnection((err, con) => {
		if (err) {
			deferred.reject(err)
		} else {

			con.query(
				{
					sql: '',
					timeout: 900		
				},
				[
				],
				(err, results) => {
					if (err) {
						deferred.reject(err)
					} else {
						results.forEach(o => {



						})
					}
				}
			)

		}
	})

	return deferred.promise
}

function handleNotifications (data) {
	const deferred = Q.defer()

	email.newAsync(data.mail.to, data.mail.subject, data.mail.template, data.mail.context).then(info => {
		deferred.resolve(`Message ${info.messageId} sent: ${info.response}`)
	}).catch(err => {
		deferred.reject(err)
	})

	return deferred.promise
}

function handleChargeable (data) {
	console.log(data.object.id)
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