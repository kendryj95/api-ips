const libphonenumber = require('libphonenumber-js')
const Q              = require('q')
const db             = require('../../config/db')

// Enviroment const
const cliente     = 1
const tipo_evento = 2909
const status      = 0

function insertNewSmsOnDb (data) {
	const deferred = Q.defer()

	console.log('MENSAJE DESPUES', data)

	db.connection.insignia_alarmas.query(
		{
			sql: `INSERT INTO outgoing (id, destinatario, mensaje, fecha_in, hora_in, tipo_evento, cliente, operadora, status) VALUES (DEFAULT, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, ?)`,
			timeout: 6000
		},
		[
			data.destinatario,
			data.text,
			tipo_evento,
			cliente,
			data.operadoraId,
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

	getOperadoras().then(operadoras => {
		var mensaje = {
			phone        : getTelephoneInfo(data.phone).phone,
			destinatario : String(getTelephoneInfo(data.phone).phone).substr(3),
			operadoraId  : '',
			text         : data.message
		}

		for (let operadora of operadoras) {
			let prefijo = mensaje.phone.substr(0,3)

			if (operadora.prefijo === prefijo) {
				mensaje.operadoraId = operadora.id
				break
			} else
				mensaje.operadoraId = -99
		}

		if (mensaje.operadoraId && mensaje.operadoraId !== -99) {
			console.log('MENSAJE ANTES', mensaje)
			// Insertar en tabla outgoing dentro db insignia_alarmas
			insertNewSmsOnDb(mensaje).then(result => {
				deferred.resolve('Se ha procesado exitosamente el sms')
			}).catch(err => deferred.reject(err))

		} else deferred.reject({ error: 'El prefijo no pertenece a una operadora valida' })
	})

	return deferred.promise
}

module.exports = {
	new: newSms
}