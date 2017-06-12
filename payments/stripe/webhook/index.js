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
				console.log(webhook)
			break
		}

		res.sendStatus(200)
	}
}