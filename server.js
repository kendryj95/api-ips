const express    = require('express')
const paypal     = require('paypal-rest-sdk')
const bodyParser = require('body-parser')
const exphbs     = require('express-handlebars')
const cors       = require('cors')
const morgan     = require('morgan')
const log4js     = require('log4js')
const sessions   = require('client-sessions')

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// enabling cors
app.use(cors())

// Enabling sessions
app.use(sessions({
	cookieName: 'ips_session',
	secret: require('./config/secret').main,
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
}))

// configure handlebars as view engine
app.engine('handlebars', exphbs({ 
	defaultLayout: 'main',
	helpers: {
		json: function(json){
			return JSON.stringify(json)
		},
		subtotal: function(currency, price, quantity){
			return require('./enviroments/formatter').money((quantity * price), currency)
		},
		money: function(currency, price){
			return require('./enviroments/formatter').money(price, currency)
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

// Debug 
app.use(morgan('combined', {
	'stream': {
		write: function(str) { log4js.getLogger().debug(str); }
	}
}))

app.all('/*', [require('./middlewares/refuseOptionsMethod')])

app.all('/v1/*', [require('./middlewares/validateRequest')])

app.use('/', require('./routes/'))

app.get('*', require('./static/404'))

app.set('port', process.env.PORT || 3030)

const server = app.listen(app.get('port'), function(){
	console.log('payment gateway listening at port '+ server.address().port)
})