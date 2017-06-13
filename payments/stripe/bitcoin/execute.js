const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q = require('q')
const querystring = require('querystring')
const db = require('../../../config/db')

function getPaypementsRecord (id_api_call) {
	const deferred = Q.defer()

	db.connection.ips.query(
		`SELECT * FROM pagos p WHERE p.id_api_call = ?`,
		[ id_api_call ],
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

function newCharge (payment, id_api_call) {
	const deferred = Q.defer()

	stripe.charges.create({
		amount: String(payment.amount).replace('.',''),
		currency: String(payment.currency).toLowerCase(),
		source: id_api_call
	}, (err, charge) => {
		if (err) {
			deferred.reject(err)
		} else {
			deferred.resolve(charge)
		}
	})

	return deferred.promise
}

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

module.exports = (req, res) => {
	if (req.query.id_api_call) {
		const id_api_call = req.query.id_api_call

		getPaypementsRecord(id_api_call).then(result => {
			let amount = 0.0

			result.forEach(o => {
				amount += (parseFloat(o.monto) * parseInt(o.cantidad))
			})

			if (amount >= 1.00)
				amount = amount.toFixed(2)

			newCharge({ amount, currency: result[0].moneda }, id_api_call).then(data => {
				console.log('antes de actualizar')
				updatePaymentToCompleted({
					estado_compra: 'completed',
					estado_pago: 'approved',
					id: data.id
				}, id_api_call).then(res => {

					// Redireccionar a pagina de exito
					/*let query = querystring.stringify({
						url: result[0].redirect_url,
						paymentId: id_api_call,
						idCompra: data.id
					})

					console.log(query)

					res.redirect(`/sales/success?${query}`)*/

					res.json({message: 'beta'})

				}).catch(error => {
					res.json(error)
					/*res.status(500).render('error', {
						title: 'No se ha podido completar su pago',
						error: {
							status: 500,
							message: 'No se ha podido actualizar su pago en la base de datos.',
							error_status: 48,
							error
						}
					})*/
				})


			}).catch(error => {
				res.render('error', {
					title: 'No se ha podido procesar su pago',
					error: {
						status: 400,
						message: 'La pasarela stripe ha devuelto un error.',
						error_status: 47,
						error	
					}
				})
			})

		}).catch(error => {
			res.status(500).render('error', {
				title: 'No se ha podido procesar su pago',
				error: {
					status: 500,
					message: 'No se ha podido realizar la conexion con la base de datos.',
					error_status: 46,
					error: error
				}
			})
		})

	} else {
		res.render('error', {
			title: 'Ha ocurrido un problema',
			error: {
				status: 400,
				message: 'No se ha realizado correctamente la petición.',
				error_status: 45
			}
		})
	}
}