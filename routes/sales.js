const countries = require('../enviroments/countries')

module.exports = {
	new: function(req, res) {

		if (req.body.purchase && req.body.redirect_url) {

			let purchase = JSON.parse(req.body.purchase)
			let redirect_url = req.body.redirect_url
			let token = req.body.token

			res.render('new', {
				title: 'New sale',
				return_url: redirect_url,
				purchase,
				countries,
				token,
				helpers: {
					subtotal: function(){
						let dis
						if (isNaN(this.discount)) {
							dis = 0.0
						} else {
							dis = this.discount
						}

						return (this.price * this.quantity) - dis
					},
					before_discount: function(){
						return (this.price * this.quantity)
					}
				}
			})

		} else {
			res.status(400).json({
				"status": 400,
				"message": "Cuerpo de la peticion incompleto o inexistente."
			})
		}
	},

	pay: {
		creditcard: require('../payments/creditcard').paypal,
		paypal: {
			prepare: require('../payments/paypal').prepare,
			execute: require('../payments/paypal').execute
		}
	}
}