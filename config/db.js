const mysql    = require('mysql')

let env = process.env.ENV === 'PROD' ? process.env.ENV : 'DEV'

const testDbCredentials = {
	user     : 'moises.marquina',
	password : 'QzSgay2j',
	host     : '192.168.1.117',
	port     : '3306'
}

function createPoolConnection (credentials, database) {
	return mysql.createPool({
		host            : credentials.host,
		user            : credentials.user,
		port            : credentials.port,
		password        : credentials.password,
		database        : database,
		connectionLimit : 100,
		acquireTimeout  : 30000
	})
}

function getConnection (pool) {
	return new Promise((resolve, reject) => {
		pool.getConnection((err, connection) => {
			err ? reject(err) : resolve(connection)
		})
	})
}

const connections = [
	{
		db   : 'sms',
		pool : createPoolConnection(testDbCredentials, 'sms')
	},
	{
		db   : 'ips',
		pool : createPoolConnection(testDbCredentials, 'insignia_payments_solutions_mm')
	},
	{
		db   : 'insignia_alarmas',
		pool : createPoolConnection(testDbCredentials, 'insignia_alarmas')
	},
	{
		db   : 'insignia_masivo_premium',
		pool : createPoolConnection(testDbCredentials, 'insignia_masivo_premium')
	}
]

let toExport = {}

for (let connection of connections) {
	toExport[connection.db] = connection.pool
}

module.exports = {
	connection: toExport,
	getConnection
}