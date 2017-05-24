const insignia_db = require('../config/db').insignia
const ips_db = require('../config/db').ips

module.exports = {
	new_save: function(token, purchase, payer, payment_response, pay_type) {

		try {
			purchase.products.forEach(o => {
				// Save new sale on Insignia Mobile Communications
				insignia_db.query('SELECT p.id_producto AS id_producto FROM sms.producto p WHERE p.desc_producto = ?', [o.key_name], (error, results, fields) => {
					if (error) {
						console.log(error)
						return
					}

					const id_producto = results[0].id_producto

					const data = {
						id_sms: token.cliente.id,
						origen: token.cliente.origen,
						sc: token.cliente.sc,
						contenido: `${o.type}_${token.cliente.sc}_${token.cliente.nombre}_${o.description}`,
						estado: 1,
						desp_op: pay_type,
						id_producto
					}

					insignia_db.query('INSERT INTO smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?)', [data.id_sms, data.origen, data.sc, data.contenido, data.estado, data.desp_op, data.id_producto], (err, result) => {
						if (err) {
							console.log(err)
							return
						}

						console.log(result)
					})
				})

				/*
				// Save new sale in insignia payment solutions database
				ips_db.query('', [], (err, result) => {
					if (err) {
						console.log(err)
						return
					}
				})*/
			})

		} catch(e) {
			console.log(e)
			return
		}
	}
}