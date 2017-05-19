var express = require('express')
var paypal = require('paypal-rest-sdk')
var bodyParser = require('body-parser')

var app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

console.log(new Date().toLocaleTimeString())

app.all('*', function(req, res, next) {
	// CORS headers
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	// Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Password')

  if (req.method == 'OPTIONS') {
    res.status(200).end()
  } else {
    next()
  }
})

app.post('/token', function(req, res){
	const password = req.headers['x-password']
	const data_cliente = req.body.data_cliente

	if (password || data_cliente) {
		console.log(data_cliente)

		if (password == require('./config/secret').new_tokens) {

			function expiresIn(numDays) {
			  let dateObj = new Date()
			  return dateObj.setDate(dateObj.getDate() + numDays)
			}

			const new_token = require('jwt-simple').encode({
				exp: expiresIn(100),
				cliente: {
					id: data_cliente.id,
					origen: data_cliente.plataforma,
					sc: data_cliente.sc
				}
			}, require('./config/secret').main)

			res.status(201).json({
				"status": 201,
				"message": "New token successfully created!",
				"token": new_token
			})

		} else {
			res.status(403).json({
				"status": 403,
				"message": "Wrong password",
				"error_code": 5
			})
		}

	} else {
		let message
		let code

		if (!password) {
			message = 'No password provided'
			code = 6
		} else if (data_cliente) {
			message = 'No user data provided'
			code = 5
		} else {
			message = 'No password or user data provided'
			code = 4
		}

		res.status(400).json({
			"status": 400,
			"message": message,
			"error_code": code
		})
	}
})

app.all('/secure/*', [require('./middlewares/validateRequest')])

app.use('/secure/', require('./routes/'))

app.listen(3030, function(){
	console.log('payment gateway listening at port 3030')
})