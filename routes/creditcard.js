var paypal = require('paypal-rest-sdk')

module.exports = {
	paypal: function(req, res) {
		require('../config/setup')

		var create_payment

		const encrypted_token = (req.body && req.body.access_token) || (req.body && req.query.access_token) || req.headers['x-access-token']
		const token = getTokenData(encrypted_token)

		if (token.error) {
			console.log(token.error)
			res.status(500).json({ "status": 500, "message": "Something went wrong, please try again later.", "error_code": 10 })
			return
		}

		if (!(req.body && req.body.purchase) || !(req.body && req.body.creditcard)) {
			res.status(400).json({ "status": 400, "error": "Credit card data or purcharse info not provided", "error_code": 9 })
			return
		}

		var credit_card = req.body.creditcard
		var purchase = req.body.purchase

		try {
			create_payment = {
		    "intent": "sale",
		    "payer": {
		      "payment_method": "credit_card",
		      "funding_instruments": [{
		        "credit_card": {
		          "type": credit_card.type,
		          "number": credit_card.number,
		          "expire_month": credit_card.expire_month,
		          "expire_year": credit_card.expire_year,
		          "cvv2": credit_card.cvv,
		          "first_name": credit_card.first_name,
		          "last_name": credit_card.last_name,
		          "billing_address": {
		            "line1": credit_card.billing_address.line1,
		            "city": credit_card.billing_address.city,
		            "state": credit_card.billing_address.state,
		            "postal_code": credit_card.billing_address.postal_code,
		            "country_code": credit_card.billing_address.country_code
		          }
		        }
		      }]
		    },
		    "transactions": [{
		      "amount": {
		        "total": purchase.total,
		        "currency": purchase.currency
		      },
		      "description": purchase.description
		    }]
			};

		} catch(e) {
			res.status(400).json({ "status": 400, "error": "Credit card data or purcharse info not provided", "error_code": 7 })
			console.log(e)
			return
		}

		paypal.payment.create(create_payment, function(err, payment){
			if (err) {
				res.status(err.httpStatusCode).json({ "paypal_error": err, "error_code": 8 })
				console.log(err)
				return
			}

			require('../db/payment').new_save(token, purchase, credit_card, payment)
			res.status(payment.httpStatusCode).json(payment)
		})
	}
}


function getTokenData(token) {
	try {
		const decoded = require('jwt-simple').decode(token, require('../config/secret').main)
		return decoded
	} catch(e) {
		return {
			error: e
		}
	}
}