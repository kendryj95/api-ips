const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q = require('q')
//const querystring = require('querystring')
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

module.exports = (req, res) => {
	if (req.query.id_api_call) {
		const id_api_call = req.query.id_api_call

		getPaypementsRecord(id_api_call).then(result => {
			let amount = 0.0

			result.forEach(o => {
				amount += (parseFloat(o.monto) * parseInt(o.cantidad))
			})

			console.log(amount)

			if (amount >= 1.00)
				amount = amount.toFixed(2)

			newCharge({ amount, currency: result[0].moneda }, id_api_call).then(data => {
				res.json(data)
			}).catch(error => {
				res.render('error', {
					title: 'Stripe error',
					error: {
						status: 500,
						message: 'Error al procesar consulta en la base de datos.',
						error_status: 47,
						error	
					}
				})
			})

		}).catch(error => {
			console.log(error)
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
	
	/*res.render('bitcoin', {
		title: 'Pago de bitcoin con stripe',
		data: {
			monedero: req.query.monedero,
			source: req.query.source,
			address: req.query.address,
			email: req.query.email_buyer
		},
		layout: 'info'
	})*/
}