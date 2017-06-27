const libphonenumber = require('libphonenumber-js')
const Q              = require('q')
const db             = require('../../config/db')

// Enviroment const
const cliente     = 1
const tipo_evento = 2909
const status      = 0

function insertNewSmsOnDb (con, data) {
	const deferred = Q.defer()

	db.connection.insignia_alarmas.query(
		{
			sql: `INSERT INTO outgoing (id, destinatario, mensaje, fecha_in, hora_in, tipo_evento, cliente, operadora, status) VALUES (DEFAULT, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, ?)`,
			timeout: 6000
		},
		[
			data.destinatario,
			data.mensaje,
			tipo_evento,
			cliente,
			data.operadora,
			status
		],
		(err, result) => {
			err ? deferred.reject(err) : deferred.resolve(result)
		}
	)

	return deferred.promise
}

function getTelephoneInfo (number) {
	return libphonenumber.parse(number)
}

function getOperadoras () {
	const deferred = Q.defer()

	db.connection.insignia_masivo_premium.query(
		{
			sql: `SELECT id_operadora_bcp AS id, prefijo, alfanumerico FROM operadoras_relacion`,
			timeout: 6000
		},
		(err, result) => {
			err ? deferred.reject(err) : deferred.resolve(result)
		}
	)

	return deferred.promise
}

function text_truncate (str, length, ending) {
	length = length == null ?  158  : length
	ending = ending == null ? '...' : ending

	return str.length > length ? str.substring(0, length - ending.length) + ending : str
}

function newSms (data) {
	const deferred = Q.defer()

	if (typeof data !== 'object' && !data && !data.phone && data.message)
		return deferred.reject('Data del mensaje es inexistente o incompleta')

	console.log('DATA', data)

	getOperadoras().then(operadoras => {
		let phone        = getTelephoneInfo(data.phone).phone
		let destinatario = String(phone).substr(3)
		let operadora_id = ''

		for (let operadora of operadoras) {
			let prefijo = phone.substr(0,3)

			if (operadora.prefijo === prefijo) {
				operadora_id = operadora.id
				break
			} else
				operadora_id = -99
		}

		if (operadora_id && operadora_id !== -99) {
			let sms = {
				destinatario,
				mensaje: text_truncate(data.message),
				operadora: operadora_id
			}

			// Insertar en tabla outgoing dentro db insignia_alarmas
			insertNewSmsOnDb(sms).then(result => {
				deferred.resolve('Se ha procesado exitosamente el sms')
			}).catch(err => deferred.reject(err))

		} else deferred.reject({ error: 'El prefijo no pertenece a una operadora valida' })
	})

	return deferred.promise
}

module.exports = {
	new: newSms
}