module.exports = (req, res) => {

	if (req.body) {
		const webhook = req.body

		switch (webhook.data.object.type) {
			case 'bitcoin':
				require('./bitcoin')(webhook, req, res)
			break
			
			default:
				console.log(webhook)
			break
		}
	}
}