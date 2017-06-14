const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH');
const endpointSecret = 'whsec_xYs0SeWzkkyUaxSOGwSTJ0BwOgChY7F1'

module.exports = (req, res) => {
	var payload = request.rawBody;
	var sigHeader = request.headers['stripe-signature'];
	var event;

	try {
		// Comprobar que la petición provenga de stripe
		event = stripe.webhooks.constructEvent(payload, sigHeader, endpointSecret)

		if (req.body) {
			const webhook = req.body

			switch (webhook.data.object.type) {
				case 'bitcoin':
					require('./bitcoin')(webhook, `${req.protocol}://${req.get('host')}`)
				break

				case 'card':
					require('./card')(webhook)
				break
				
				default:
					switch (webhook.type) {
						case 'charge.succeeded':
							require('./succeeded')(webhook)
						break

						case 'charge.failed':
							require('./failed')(webhook)
						break

						default:
							console.log('===================================')
							console.log(webhook)
							console.log('===================================')
						break
					}

				break
			}

			res.sendStatus(200)
		} else 
			// Si no se ha enviado el cuerpo devolvemos error 400 (bad request)
			res.sendStatus(400)

	} catch (e) {
		// Invalid payload or signature
		return response.sendStatus(400)
	}

}