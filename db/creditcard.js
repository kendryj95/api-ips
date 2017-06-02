const db = require('../config/db')

module.exports = {
	new: function(token, purchase, fullName, consumidor_email, consumidor_telefono, payment_response, pay_type, redirect_url) {
		// Resultado de la petición
		let response = {}

		console.log(payment_response)

		try {
			purchase.products.forEach(o => {
				// Save new sale on Insignia Mobile Communications
				const data = {
					id_sms: token.cliente.id,
					origen: token.cliente.origen,
					sc: token.cliente.sc,
					contenido: `${o.type}_${token.cliente.sc}_${token.cliente.nombre}_${o.description}`,
					estado: 1,
					desp_op: pay_type
				}

				db.connection.insignia.query(
					{
						sql: 'INSERT INTO smsin (id_sms, origen, sc, contenido, estado, data_arrive, time_arrive, desp_op, id_producto) VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?)',
						timeout: 60000
					},
					[
						data.id_sms,
						data.origen,
						data.sc,
						data.contenido,
						data.estado,
						data.desp_op,
						o.id
					],
					(error, result) => {
						if (error) {
							response = {
								"status": 500,
								"message": "Error al procesar solicitud en mysql.", 
								"error_code": 15,
								"error": error
							}
						}
					}
				)

				// Save transaction on ips db
				db.connection.ips.query(
					'INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, payer_info_email, id_compra, id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, 2, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
					[
						payment_response.transactions[0].related_resources[0].sale.state,
						payment_response.state,
						purchase.currency,
						o.price,
						'PAYPAL_CREDITCARD_' + fullName,
						payment_response.transactions[0].related_resources[0].sale.id,
						payment_response.id,
						o.id,
						data.id_sms,
						data.sc,
						data.contenido,
						redirect_url,
						consumidor_email,
						consumidor_telefono
					],
					(error, result) => {
						if (error) {
							console.log(error)
							response = {
								"status": 500,
								"message": "Error al procesar solicitud en mysql.", 
								"error_code": 17,
								"error": error
							}
						} else {
							console.log(result)
						}
					}
				)

			})
		} catch(e) {
			response = {
				"status": 500,
				"message": "Error desconocido", 
				"error_code": 18,
				"error": e
			}
		}
		return response
	}
}