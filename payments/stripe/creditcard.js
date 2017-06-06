const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q = require('q')
const moment = require('moment')
const db = require('../../config/db')

function processPayment (data) {
	const deferred = Q.defer()

	stripe.sources.create({
		type: 'card',
		card: {
			number: data.card.number,
			cvc: data.card.cvv,
			exp_month: data.card.exp_month,
			exp_year: data.card.exp_year
		},
		owner: {
			address: {
				postal_code: data.card.owner.address.postal_code
			}
		}
	}, (err, source) => {
		if (err) {
			deferred.reject({ 
				'title': 'No se ha podido procesar el pago con éxito', 
				'error': {
					'status': 500,
					'message': 'Stripe no ha podido procesar su pago de manera satisfactoria, porfavor intente de nuevo más tarde.',
					'error_code': 35,
					'error': err
				} 
			})
		}

		stripe.charges.create({
			amount: String(data.purchase.total).replace('.',''),
			currency: data.purchase.currency.toLowerCase(),
			source: source.id
		}, (err, charge) => {
			if (err) {
				deferred.reject({ 
					'title': 'No se ha podido procesar el pago con éxito', 
					'error': {
						'status': 500,
						'message': 'Stripe no ha podido procesar su pago de manera satisfactoria, porfavor intente de nuevo más tarde.',
						'error_code': 36,
						'error': err
					} 
				})
			}

			deferred.resolve({ charge, source })
		})
	})

	//Save on ips db


	//Save on sms db


	return deferred.promise
}

module.exports = function (req, res) {
	if (req.body) {

		const exp_month = moment(req.body.stripe_cc_edate).format('MM'),
					exp_year = moment(req.body.stripe_cc_edate).format('YYYY'),
					purchase = JSON.parse(req.body.purchase)

		const data = {
			card: {
				number: req.body.stripe_cc_number,
				cvv: req.body.stripe_cc_cvv,
				exp_month,
				exp_year,
				owner: {
					address: {
						postal_code: req.body.stripe_cc_zip
					}
				}
			},
			purchase
		}

		processPayment(data)
			.then(data => {
				res.json(data)
			})
			.catch(error => {
				res.status(error.error.status).render('error', error)
			})

	} else {
		res.status(400).render('error', {
			title: 'No se ha realizado la petición correctamente',
			error: {
				'status': 400,
				'message': 'No se ha recibido el cuerpo de la petición, intente de nuevo mas tarde de forma correcta.',
				'error_code': 34
			}
		})
	}
}