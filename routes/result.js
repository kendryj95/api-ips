const querystring = require('querystring')
const _ = require('lodash')

function showSuccessPage (req, res) {
	if (req.query || req.query.url || req.query.paymentId) {
		const url = req.query.url
		const paymentId = req.query.paymentId

		let redirect = ''
		let params = querystring.parse(url)

		console.log(params)

		if (_.isEmpty(params)) {
			redirect = `${url}?paymentId=${paymentId}`
		} else {
			redirect = `${url}&paymentId=${paymentId}`
		}		

		res.status(201).render('success', {
			title: 'New payment was successfully approved',
			redirect_url: redirect,
			noEscape: true
		})

	} else {
		res.redirect('/page-not-found')
	}
}

function showCancelPage (req, res) {
	console.log("req.query", req.query)
	res.json({ "error": "error" })
}

module.exports = {
	showSuccess: showSuccessPage,
	showCancel: showCancelPage
}