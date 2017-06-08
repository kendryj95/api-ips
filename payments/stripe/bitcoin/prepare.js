const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q = require('q')
const querystring = require('querystring')
const db = require('../../../config/db')
//const async = require('async')

function preparePayment (data) {
	const deferred = Q.defer()

	stripe.sources.create({
		type: 'bitcoin',
		amount: parseInt(String(data.purchase.total).replace('.','')),
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
					message: 'Ha ocurrido un error al procesar su pago.',
					response: err
				}
			})
		} else {

			savePaymentOnIPS(data, source)
			.then((text) => {
				deferred.resolve(source)
			})
			.catch(error => {
				deferred.reject(error)
			})


		}
	})

	return deferred.promise
}

function savePaymentOnIPS (data, source) {
	const deferred = Q.defer()

	let savePerOne = o => {
		return new Promise((resolve, reject) => {
			let query = `INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, payer_info_email, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES ('elbeta', 6, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
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

			db.connection.ips.query(query, params, (err, result) => {
				if (err) {
					return reject(err)
				} else {
					return resolve(result)
				}
			})
		})
	}

	for (var i = data.purchase.products.length - 1; i >= 0; i--) {
		const o = data.purchase.products[i]

		let has_error = false
		
		savePerOne(o).then(r => {
			console.log(r)
		}, err => {
			has_error = true
			deferred.reject(err)
		})

		if (has_error)
			break
		else 
			deferred.resolve('beta')
	}

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
		.then(result => {
			let params = querystring.stringify({ monedero: result.bitcoin.uri, source: result.id, address: result.receiver.address })
			res.redirect(`/sales/pay/stripe/bitcoin/process?${params}`)
		})
		.catch(error => {
			res.status(error.error.status).render('error', error)
		})

	} else {
		res.status(400).render('error', {
			'title': 'Error en la petición',
			'error': {
				'error_status': 42,
				'status': 400,
				'message': 'Su petición esta incompleta o inexistente.'
			}
		})
	}
}