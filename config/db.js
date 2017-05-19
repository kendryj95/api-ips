var mysql = require('mysql')

var con_insignia = mysql.createConnection({
	host: '138.186.176.49',
	port: '3306',
	user: 'carmen.soto',
	password: '$q9WnZMVLj',
	database: 'sms'
})

var con_anron = mysql.createConnection({
	host: '138.186.176.49',
	port: '3306',
	user: 'anrononl_anron',
	password: 'XjUm456',
	database: 'anrononl_ao'
})

module.exports = {
	insignia: con_insignia,
	anron: con_anron
}