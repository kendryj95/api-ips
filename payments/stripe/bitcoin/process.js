
module.exports = (req, res) => {
	res.render('bitcoin', {
		title: 'bitcoin',
		monedero: req.query.monedero,
		source: req.query.source,
		address: req.query.address
	})
}