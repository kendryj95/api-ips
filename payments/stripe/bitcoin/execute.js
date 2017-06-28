const stripe          = require('stripe')(require('../../../config/setup').stripe)
const Q               = require('q')
const querystring     = require('querystring')
const db              = require('../../../config/db')
const idStripeBitcoin = 6

function getPaypementsRecord (con, id_api_call) {
	return new Promise((resolve, reject) => {
		con.query(
			`SELECT * FROM pagos p WHERE p.id_api_call = ? AND id_metodo_pago = ?`,
			[ id_api_call, idStripeBitcoin ],
			(err, result) => {
				if (err) reject(err)
				else result.length > 0 ? resolve(result) : reject({ error: 'No se han encontrado resultados en la base de datos.' })
			}
		)
	})
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

		db.getConnection(db.connection.ips).then(con => {
			getPaypementsRecord(con, id_api_call).then(result => {
				let amount = 0.0

				result.forEach(o => {
					amount += (parseFloat(o.monto) * parseInt(o.cantidad))
				})

				if (amount >= 1.00)
					amount = amount.toFixed(2)

				newCharge({ amount, currency: result[0].moneda }, id_api_call).then(data => {

					// Redireccionar a pagina de exito
					let query = querystring.stringify({
						url: result[0].redirect_url,
						paymentId: id_api_call,
						idCompra: data.id
					})

					res.redirect(`/sales/success?${query}`)

				}).catch(error => {
					res.render('error', {
						title: 'No se ha podido procesar su pago',
						error: {
							status: 400,
							details: [
								{
									issue: 'Stripe no ha podido procesar su pago.'
								}
							],
							error_status: 47,
							error	
						}
					})
				})
			}).catch(err => res.json(err))

			// Cerrar conexion a db
			con.release()
		}).catch(err => {
			res.status(500).render('error', {
				title: 'No se ha podido procesar su pago',
				error: {
					status: 500,
					details: [
						{
							issue: 'No se ha podido realizar la conexion con la base de datos.'
						}
					],
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
				details: [
					{
						issue: 'No se ha realizado correctamente la petición.'
					}
				],
				error_status: 45
			}
		})
	}
}