const express = require('express')
const app = express()

let base_url = '/vendor'

app.use(base_url+'/foundation', express.static(__dirname + '/node_modules/foundation-sites/dist'))
app.use(base_url+'/jquery', express.static(__dirname + '/node_modules/jquery/dist'))

module.exports = app;