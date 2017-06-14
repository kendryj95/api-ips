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
		res.sendStatus(400)
	}
}