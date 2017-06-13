const Q = require('q')
const db = require('../../../config/db')
const email = require('../../../enviroments/email')

function handleDB (id_api_call, status, estado_compra = 'esperando_confirmacion') {
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