const libphonenumber = require('libphonenumber-js')
const Q              = require('q')
const db             = require('../../config/db')

// Enviroment const
const status           = 2
const application_name = 'IPS_NOTIFICACIONES'

function getTelephoneInfo (number) {
	return libphonenumber.parse(number)
}

function getOperadoras (con) {
	const deferred = Q.defer()

	con.query(
		{
			sql: `SELECT id_operadora_bcp AS id, prefijo FROM operadoras_relacion WHERE alfanumerico = 0`,
			timeout: 6000
		},
		(err, result) => {
			err ? deferred.reject(err) : deferred.resolve(result)
		}
	)

	return deferred.promise
}

function newVeSMS (con, data) {
	return new Promise((resolve, reject) => {
		con.query(
			{
				sql     : `INSERT INTO outgoing_premium (destinatario, mensaje, fecha_in, hora_in, tipo_evento, cliente, operadora, status, id_promo) VALUES (?, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?)`,
				timeout : 60000
			},
			[
				data.destinatario,
				data.message,
				data.id_evento,
				data.id_cliente,
				data.operadoraId,
				status,
				data.id_promo
			],
			(err, result) => {
				if (err) reject(err)
				else resolve(result)
			}
		)
	})
}

function updatePromocionesPremium (con, id_promo) {
	return new Promise((resolve, reject) => {
		con.query(
			{
				sql     : `UPDATE promociones_premium SET estado = ? WHERE id_promo = ?`,
				timeout : 60000
			},
			[
				2,
				id_promo
			],
			(err, result) => {
				if (err) reject(err)
				else if (result.affectedRows < 1) reject({ error: 'No se encontraron promociones que modificar.' })
				else resolve(result)
			}
		)
	})
}

function getPromocionActiva (con) {
	return new Promise((resolve, reject) => {
		con.query(
			{
				sql     : `SELECT id_promo AS promo, id_cliente AS cliente, id_evento AS evento FROM notificaciones_promo np WHERE np.valor_aplicacion = ?`,
				timeout : 60000
			},
			[
				application_name
			],
			(err, result) => {
				if (err) reject(err)
				else if (result.length < 1) reject({ err: 'No se ha encontrado promocion activa relacionada con la aplicacion.' })
				else resolve(result[0])
			}
		)
	})
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

	const phoneInfo = getTelephoneInfo(data.phone)

	if (phoneInfo.country === 'VE') {
		db.getConnection(db.connection.insignia_masivo_premium).then(con => {
			getOperadoras(con).then(operadoras => {
				let mensaje = {
					phone        : phoneInfo.phone,
					destinatario : String(phoneInfo.phone).substr(3),
					operadoraId  : '',
					message      : data.message
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
					getPromocionActiva(con).then(info => {
						mensaje.id_evento  = info.evento
						mensaje.id_cliente = info.cliente
						mensaje.id_promo   = info.promo

						Q.all([
							newVeSMS(con, mensaje),
							updatePromocionesPremium(con, mensaje.id_promo)
						]).spread((response, resultUpdate) => {
							con.release()
							deferred.resolve(response)
						}).catch(err => deferred.reject(err))

					}).catch(err => deferred.reject(err))
				} else deferred.reject({ error: 'El prefijo no pertenece a una operadora valida' })
			}).catch(err => deferred.reject(err))
		}).catch(err => deferred.reject(err))
	} else {
		console.log('NUMERO DE TELEFONO INTERNACIONAL', phoneInfo)
	}

	return deferred.promise
}

module.exports = {
	new: newSms
}