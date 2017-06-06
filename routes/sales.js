const countries = require('../enviroments/countries')
const db = require('../config/db')
const mail = require('../enviroments/email')

module.exports = {
	new: (req, res) => {
		if (req.body.purchase && req.body.redirect_url) {

			let purchase = JSON.parse(req.body.purchase)
			let redirect_url = req.body.redirect_url
			let token = req.body.token

			db.pool.ips.query(
				'SELECT mp.descripcion, mp.status FROM metodos_de_pago mp',
				(err, results, fields) => {
					if (err) {
						res.render('error', {
							title: 'ERROR', 
							error: {
								'status': 500,
								'message': 'Some errrors',
								'error_code': 32,
								'error': err
							}
						})
					} else {
						let metodos_de_pago = []

						results.forEach(element => {
							if (element.status != 0) {
								if (element.descripcion === 'PAYPAL_CREDITCARD') {
									metodos_de_pago.push({
										key_name: element.descripcion.trim().toLowerCase(),
										name: 'Tarjeta de credito',
										descripcion: element.descripcion,
										estado: element.status,
										form: function() {
											return element.descripcion.trim().toLowerCase() + '_form'
										}
									})	
								} else {
									metodos_de_pago.push({
										key_name: element.descripcion.trim().toLowerCase(),
										name: element.descripcion.replace('_', ' ').toUpperCase(),
										descripcion: element.descripcion,
										estado: element.status,
										form: function() {
											return element.descripcion.trim().toLowerCase() + '_form'
										}
									})
								}
							}
						})

						res.render('new', {
							title: 'New sale',
							return_url: redirect_url,
							purchase,
							countries,
							token,
							metodos_de_pago
						})
					}
				}
			)

		} else {
			res.status(400).json({
				"status": 400,
				"message": "Cuerpo de la peticion incompleto o inexistente."
			})
		}
	},
	pay: {
		creditcard: require('../payments/creditcard').paypal,
		paypal: {
			prepare: require('../payments/paypal').prepare,
			execute: require('../payments/paypal').execute
		},
		stripe: {
			creditcard: require('../payments/stripe/creditcard')
		}
	}
}