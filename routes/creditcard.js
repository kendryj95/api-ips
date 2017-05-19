var paypal = require('paypal-rest-sdk')

module.exports = {
	paypal: function(req, res) {
		require('../config/setup')

		var create_payment

		if (!req.body || !req.body.purchase || !req.body.creditcard) {
			res.status(400).json({ "status": 400, "error": "Credit card data or purcharse info not provided" })
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
			res.status(400).json({ "status": 400, "error": "Credit card data or purcharse info not provided" })
			console.log(e)
			return
		}

		paypal.payment.create(create_payment, function(err, payment){
			if (err) {
				res.status(err.httpStatusCode).json(err)
				console.log(err)
				return
			}

			require('../db/payment').new_save(purchase, credit_card, payment)
			res.status(payment.httpStatusCode).json(payment)
		})
	}
}