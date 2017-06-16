const querystring = require('querystring')
const crypto      = require('../enviroments/crypto')
const db          = require('../config/db')
const Q           = require('q')

function updateOnDb (con, payment) {
	const deferred = Q.defer()

	con.query(
		{
			sql: `UPDATE pagos SET estado_compra = ?, estado_pago = ? WHERE id_api_call = ?`,
			timeout: 60000
		},
		[
			payment.estado_compra,
			payment.estado_pago,
			payment.id_api_call
		],
		(err, result) => {
			if (err)
				deferred.reject(err)
			else{
				if (result.affectedRows > 0)
					deferred.resolve(result)
				else
					deferred.reject({ error: 'No se han encontrdo pagos que actualizar' })
			}
		}
	)

	return deferred.promise
}

function db_record (payment) {
	const deferred = Q.defer()

	db.promise.ips().then(con => {
		
		updateOnDb(con, { estado_compra: 'error_pago', estado_pago: 'canceled', id_api_call: payment.id }).then(res => {
			deferred.resolve(res)
		}).catch(err => {
			deferred.reject(err)
		})

		con.release()
	}).catch(err => {
		deferred.reject(err)
	})

	return deferred.promise
}

function showSuccessPage (req, res) {
	if (req.query || req.query.url || req.query.paymentId || req.query.idCompra) {

		const url    = req.query.url
		const params = querystring.stringify({
			paymentId: req.query.paymentId,
			idCompra: req.query.idCompra
		})
		let redirect = ''

		if (String(url).indexOf('?') !== -1) {
			redirect = `${url}&${params}`
		} else {
			redirect = `${url}?${params}`
		}

		// Eliminamos toda session de la compra
		req.ips_session.reset()

		// Mostramos pagina de exito
		res.status(201).render('success', {
			title: 'Nuevo pago procesado satisfactoriamente',
			redirect_url: redirect,
			noEscape: true
		})

	} else {
		res.redirect('/404')
	}
}

function showCancelPage (req, res) {
	const user_info = req.ips_session.user_info
	const purchase  = req.ips_session.purchase
	const payment   = req.ips_session.payment

	db_record(payment).then(result => {
		console.log('RESULTADO DE ACTUALIZACION DE BASE DE DATOS', result)
		res.render('cancel', {
			title: 'Solicitud de pago fallida',
			token: purchase.token,
			client: {
				name: require('../enviroments/token').getTokenDecoded(purchase.token).cliente.nombre,
				origin: user_info.origin
			},
			payment: {
				id: payment.id
			}
		})
	}).catch(err => {
		console.log('ERROR AL GUARDAR EN DB', err)
		res.render('error', err)
	})
}

module.exports = {
	showSuccess: showSuccessPage,
	showCancel: showCancelPage
}