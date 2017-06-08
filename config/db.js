const mysql = require('mysql')
const Promise = require('bluebird')

Promise.promisifyAll(mysql)
Promise.promisifyAll(require("mysql/lib/Connection").prototype)
Promise.promisifyAll(require("mysql/lib/Pool").prototype)

const con_insignia = mysql.createConnection({
	host: '138.186.176.49',
	port: '3306',
	user: 'carmen.soto',
	password: '$q9WnZMVLj',
	database: 'sms'
})

const con_ips = mysql.createConnection({
	host: '138.186.176.49',
	port: '3306',
	user: 'carmen.soto',
	password: '$q9WnZMVLj',
	database: 'insignia_payments_solutions'
})

const con_insignia_pool = mysql.createPool({
	connectionLimit : 10,
	host: '138.186.176.49',
	port: '3306',
	user: 'carmen.soto',
	password: '$q9WnZMVLj',
	database: 'sms'
})

const con_ips_pool = mysql.createPool({
	connectionLimit : 10,
	host: '138.186.176.49',
	port: '3306',
	user: 'carmen.soto',
	password: '$q9WnZMVLj',
	database: 'insignia_payments_solutions'
})

con_insignia_pool.on('enqueue', function(){
	console.log('INSIGNIA DB: Waiting for an available mysql slot.')
})

con_insignia_pool.on('release', function (connection) {
	console.log('INSIGNIA DB: MySQL Connection %d released', connection.threadId);
})

con_ips_pool.on('enqueue', function(){
	console.log('IPS DB: Waiting for an available mysql slot.')
})

con_ips_pool.on('release', function (connection) {
	console.log('IPS DB: MySQL Connection %d released', connection.threadId);
})

function getConnectionIpsPromisifed () {
	return con_ips_pool.getConnectionAsync().disposer(connection => {
		connection.release()
	})
}

module.exports = {
	pool: {
		insignia: con_insignia_pool,
		ips: con_ips_pool
	},
	connection: {
		insignia: con_insignia,
		ips: con_ips
	},
	promise: {
		ips: getConnectionIpsPromisifed
	}
}