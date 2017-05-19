var express = require('express')
var router = express.Router()

router.get('*', function(req, res){
	res.status(404).send("ERROR 404: The webpage that you are looking for was not found.");
})

router.post('/paypal/payment/new/creditcard', require('./creditcard').paypal)

module.exports = router