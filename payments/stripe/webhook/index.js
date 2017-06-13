module.exports = (req, res) => {

	if (req.body) {
		const webhook = req.body

		console.log('==============================')
		console.log('webhook')
		console.log(webhook)
		console.log('==============================')

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
					console.log(webhook)
					break
				}

			break
		}

		res.sendStatus(200)
	}
}