const stripe = require('stripe')('sk_test_Hk47JU23LNp1hB0UtgCnGMNH')
const Q = require('q')

function stripePay (req, res) {
	console.log('Hello world')
}

module.exports = stripePay