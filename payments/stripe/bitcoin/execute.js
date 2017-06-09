
module.exports = (req, res) => {
	
	res.render('bitcoin', {
		title: 'Pago de bitcoin con stripe',
		data: {
			monedero: req.query.monedero,
			source: req.query.source,
			address: req.query.address,
			email: req.query.email_buyer
		},
		layout: 'info'
	})
}