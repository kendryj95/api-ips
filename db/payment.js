const insignia_db = require('../config/db').insignia
const anron_db = require('../config/db').anron

module.exports = {
	new_save: function(purchase, credit_card, payment_response) {

		const encrypted_token = (req.body && req.body.access_token) || (req.body && req.query.access_token) || req.headers['x-access-token']
		const token = getTokenData(encrypted_token)

		if (token.error) {
			console.log(token.error)
			return
		}

		purchase.products.forEach(o => {
			const data = {
				id_sms: `${token.cliente.id}@${token.cliente.origen}${Date.now()}`,
				origen: token.cliente.origen,
				sc: `${token.cliente.sc}`,
				contenido: `${purchase.description}_${o.name}`,
				estado_in: 1,
				data_arrive: new Date().toISOString().slice(0, 10),
				time_arrive: new Date().toISOString().slice(11, 19),
				desp_op: `PAYPAL_CREDITCARD`,
				id_producto: o.id,
				respuesta: `Nuevo contenido adquirido satisfactoriamente: ${o.name}`,
				estado_out: 1,
				date_envio: new Date().toISOString().slice(0, 10),
				time_envio: new Date().toISOString().slice(11, 19)
			}

			insignia_db.query('INSERT INTO sms.smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [data.id_sms, data.origen, data.sc, data.contenido, data.estado_in, data.data_arrive, data.time_arrive, data.desp_op, data.id_producto], (err, result) => {
				if (err) {
					console.log(err)
					return
				}
			})

			insignia_db.query('INSERT INTO sms.sms_inout (id_sms, sc, respuesta, data_arrive, time_arrive, date_envio, time_envio, desp_op, id_producto, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [data.id_sms, data.sc, data.respuesta, data.data_arrive, data.time_arrive, data.date_envio, data.time_envio, data.desp_op, data.id_producto, data.estado_out], (err, result) => {
				if (err) {
					console.log(err)
					return
				}
			})

			anron_db.query('', [], (err, result) => {
				if (err) {
					console.log(err)
					return
				}
			})
		})

	}
}

function getTokenData(token) {
	try {
		const decoded = require('jwt-simple').decode(token, require('../config/secret').main)
		return decoded
	} catch(e) {
		return {
			error: e
		}
	}
}