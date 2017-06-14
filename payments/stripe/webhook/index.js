module.exports = (req, res) => {
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
	} else {
		// Si no se ha enviado el cuerpo devolvemos error 400 (bad request)
		res.sendStatus(400)
	}
}