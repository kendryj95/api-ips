const stripe      = require('stripe')(require('../../../config/setup').stripe)
const Q           = require('q')
const querystring = require('querystring')
const db          = require('../../../config/db')

function preparePayment (data) {
	const deferred = Q.defer()

	stripe.sources.create({
		type: 'bitcoin',
		amount: parseInt(String(parseFloat(data.purchase.total).toFixed(2)).replace('.','')),
		currency: String(data.purchase.currency).toLowerCase(),
		owner: {
			email: data.owner.email
		}
	}, (err, source) => {
		if (err) {
			deferred.reject({
				title: 'No se ha posido realizar la solicitud',
				error: {
					status: 500,
					error_code: 43,
					details: [
						{
							issue: 'Error al crear pago.'
						}
					],
					response: err
				}
			})
		} else {
			console.log(source)

			db.getConnection(db.connection.ips).then(con => {

				savePaymentOnIPS(con, data, source).then(text => deferred.resolve(source)).catch(error => deferred.reject(error))

				con.release()
			}).catch(err => deferred.reject(err))


		}
	})

	return deferred.promise
}

function savePaymentOnIPS (con, data, source) {
	const deferred = Q.defer()

	let savePerOne = o => {
		return new Promise((resolve, reject) => {
			let query = `INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, payer_info_email, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, 6, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
			let params = [
				'esperando_pago',
				source.status,
				data.purchase.currency,
				o.price, 
				o.quantity, 
				source.owner.email, 
				source.id, 
				o.id, 
				data.token.cliente.id, 
				data.token.cliente.sc, 
				`${o.type}_${data.token.cliente.sc}_${data.token.cliente.nombre}_${o.description}`, 
				data.redirect_url, 
				data.client.email, 
				data.client.telephone
			]

			con.query(query, params, (err, result) => {
				if (err) {
					return reject(err)
				} else {
					return resolve(result)
				}
			})
		})
	}

	let perOne = []

	for (var i = data.purchase.products.length - 1; i >= 0; i--) {
		const o = data.purchase.products[i]
		perOne.push(savePerOne(o))
	}

	Q.all(perOne).then(result => deferred.resolve(result)).catch(error => deferred.reject(error))

	return deferred.promise
}

module.exports = (req, res) => {
	if (req.body.purchase && req.body.token && req.body.redirect_url && req.body.email && req.body.telephone && req.body.bitcoin_owner_email) {

		const data = {
			purchase: JSON.parse(req.body.purchase),
			token: require('../../../enviroments/token').getTokenDecoded(req.body.token),
			redirect_url: req.body.redirect_url,
			client: {
				email: req.body.email,
				telephone: req.body.telephone
			},
			owner: {
				email: req.body.bitcoin_owner_email
			}
		}

		preparePayment(data)
		.then(result => res.json({ res: result, client: data.client }))
		.catch(error => res.status(error.error.status).json(error))

	} else {
		res.status(400).json({
			title: 'Error en la petición',
			error: {
				error_status: 42,
				status: 400,
				details: [
					{
						issue: 'Su petición esta incompleta o inexistente.'
					}
				]
			}
		})
	}
}