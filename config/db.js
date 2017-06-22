const mysql    = require('mysql')
const Q        = require('q')

const user     = 'carmen.soto'
const password = '$q9WnZMVLj'
const host     = '138.186.176.49'
const port     = '3306'

function createPoolConnection (database) {
	return mysql.createPool({
		connectionLimit : 10,
		host,
		user,
		password,
		database
	})
}

function createConnection (database) {
	return mysql.createConnection({
		host,
		user,
		password,
		database
	})
}

const con_insignia = createConnection('sms')

const con_ips = createConnection('insignia_payments_solutions')

const con_insignia_pool = createPoolConnection('sms')

const con_ips_pool = createPoolConnection('insignia_payments_solutions')

const con_insignia_alarmas_pool = createPoolConnection('insignia_alarmas')

const con_insignia_masivo_premium_pool = createPoolConnection('insignia_masivo_premium')

// SMS IN
con_insignia_pool.on('enqueue', () => {
	console.log('INSIGNIA DB: Waiting for an available mysql slot.')
}).on('release', connection => {
	console.log('INSIGNIA DB: MySQL Connection %d released', connection.threadId);
})

// INSIGNIA PAYMENT SOLUTIONS
con_ips_pool.on('enqueue', () => {
	console.log('IPS DB: Waiting for an available mysql slot.')
}).on('release', connection => {
	console.log('IPS DB: MySQL Connection %d released', connection.threadId);
})

// INSIGNIA ALARMAS
con_insignia_alarmas_pool.on('enqueue', () => {
	console.log('IPS DB: Waiting for an available mysql slot.')
}).on('release', connection => {
	console.log('IPS DB: MySQL Connection %d released', connection.threadId);
})

// INSIGNIA MASIVO PREMIUM
con_insignia_masivo_premium_pool.on('enqueue',() => {
	console.log('IPS DB: Waiting for an available mysql slot.')
}).on('release', connection => {
	console.log('IPS DB: MySQL Connection %d released', connection.threadId);
})

function getConnectionPromisifed (pool) {
	return () => {
		return new Promise((resolve, reject) => {
			pool.getConnection((err, con) => {
				if (err) reject(err)
				else {
					console.log(`MySQL Connection ${con.threadId} created`)
					resolve(con)
				}
			})
		})
	}
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
		ips: getConnectionPromisifed(con_ips_pool),
		insignia: getConnectionPromisifed(con_insignia_pool),
		insignia_alarmas: getConnectionPromisifed(con_insignia_alarmas_pool),
		insignia_masivo_premium: getConnectionPromisifed(con_insignia_masivo_premium_pool)
	}
}