const querystring = require('querystring')

function showSuccessPage (req, res) {
	if (req.query || req.query.url || req.query.paymentId || req.query.idCompra) {

		const url = req.query.url
		const params = querystring.stringify({
			paymentId: req.query.paymentId,
			idCompra: req.query.idCompra
		})
		let redirect = ''

		if (String(url).indexOf('?') !== -1) {
			redirect = `${url}&${params}`
		} else {
			redirect = `${url}?${params}`
		}		

		res.status(201).render('success', {
			title: 'Nuevo pago procesado satisfactoriamente',
			redirect_url: redirect,
			noEscape: true
		})

	} else {
		res.redirect('/404')
	}
}

function showCancelPage (req, res) {
	console.log('req.query', req.query)
	res.json({ 'error': 'error' })
}

module.exports = {
	showSuccess: showSuccessPage,
	showCancel: showCancelPage
}