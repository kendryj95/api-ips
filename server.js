const express = require('express')
const paypal = require('paypal-rest-sdk')
const bodyParser = require('body-parser')
const exphbs = require('express-handlebars')
const cors = require('cors')

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// enabling cors
app.use(cors())

// configure handlebars as view engine
app.engine('handlebars', exphbs({ 
	defaultLayout: 'main',
	helpers: {
		json: function(json){
			return JSON.stringify(json)
		}
	}
}))
app.set('view engine', 'handlebars')

// set vendor static files
let base_url = '/vendor'
app.use('/public', express.static(__dirname + '/public'))
app.use(base_url+'/foundation', express.static(__dirname + '/node_modules/foundation-sites/dist'))
app.use(base_url+'/jquery', express.static(__dirname + '/node_modules/jquery/dist'))
app.use(base_url+'/what-input', express.static(__dirname + '/node_modules/what-input/dist'))
app.use(base_url+'/pikaday', express.static(__dirname + '/node_modules/pikaday'))
app.use(base_url+'/moment', express.static(__dirname + '/node_modules/moment/min'))

app.all('/*', function(req, res, next) {
	// show date and time
	console.log(new Date().toLocaleTimeString())

  if (req.method == 'OPTIONS') {
    res.status(200).end()
  } else {
    next()
  }
})

app.all('/v1/*', [require('./middlewares/validateRequest')])

app.use('/', require('./routes/'))

app.use((req, res, next) => {
	let err = new Error('Not found')
	err.status = 400
	next(err)
})

app.set('port', process.env.PORT || 3030)

const server = app.listen(app.get('port'), function(){
	console.log('payment gateway listening at port '+ server.address().port)
})