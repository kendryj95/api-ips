const querystring = require('querystring')
const crypto      = require('../enviroments/crypto')
const db          = require('../config/db')
const Q           = require('q')

function updateOnDb (payment) {
	const deferred = Q.defer()

	db.connection.ips.query(
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

function showSuccessPage (req, res) {
	if (req.query || req.query.url || req.query.paymentId || req.query.idCompra) {

		const url    = req.query.url
		const params = querystring.stringify({
			paymentId: req.query.paymentId,
			idCompra: req.query.idCompra,
			tkn: req.query.tkn
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

function db_record (payment) {
	const deferred = Q.defer()
		
	updateOnDb({ estado_compra: 'error_pago', estado_pago: 'canceled', id_api_call: payment.id }).then(res => {
		deferred.resolve(res)
	}).catch(err => {
		deferred.reject(err)
	})

	return deferred.promise
}


function showSuccessmpPage(req, res) {// MERCADO PAGO SUCCESS

	let purchase  = ''
	let token=''
	let url_return= "http://localhost/Insignia/IPS/"
	let client=''
	let state = req.query.collection_status // EL .query es para agarrar la variable que esta en la url(get).. es muy diferente a params.. 
	let idp  = req.query.preference_id
	let id_collec=req.query.collection_id
	if (req.ips_session.purchase && state=="approved") {
		purchase= req.ips_session.purchase.purchase
		token= require('../enviroments/token').getTokenDecoded(req.ips_session.purchase.token)//token ya listo.. ya esta decodificado

	// lo planeado para node mysql
	var data ={
		purchase,
		idp,
		id_collec,
		token,
		url_return,
		client:{
			email:purchase.client.email,
			telephone:purchase.client.telephone
		},
		state
	}
	//para enviar a php para generar la factura
	var datamp ={
		id_mp:idp,
		id_collec,
		estado:state,
		token,
		url_return,
		client:{
			email:purchase.client.email,
			telephone:purchase.client.telephone
		}
	}

	purchase.products.forEach( pro => { 
		db.connection.ips.query("INSERT INTO pagos (id_pago, id_metodo_pago, fecha_pago, hora_pago, estado_compra, estado_pago, moneda, monto, cantidad, id_compra,id_api_call, id_producto_insignia, sms_id, sms_sc, sms_contenido, redirect_url, consumidor_email, consumidor_telefono) VALUES (DEFAULT, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
			1, 
			'completed', 
			data.state, 
			data.purchase.currency, 
			parseInt(pro.price),
			pro.quantity,
			data.id_collec,
			data.idp, //id_mp
			pro.id, // id del producto
			data.token.cliente.id, 
			data.token.cliente.sc,
			`unde_${data.token.cliente.sc}_${data.token.cliente.nombre}_${pro.description}`,
			data.url_return,
			data.client.email,
			data.client.telephone
		],
		function(error,result) {
        if (error) {
            console.log("Error=>",error.message);
        } else {
            console.log('success registradooo',result);

        }
    });
		
	});
	req.ips_session.reset()//reseteo la sesion para q no hagan locuras los clientes una vez guardado la info de la db
     res.render('successmp', {
				title: 'Nuevo pago procesado satisfactoriamente',
				factura:purchase,
				datamp
			})	
	}else{
		res.redirect("/404");
	}
}




function showCancelPage (req, res) {
	const user_info = req.ips_session.user_info
	const purchase  = req.ips_session.purchase
	const payment   = req.ips_session.payment

	db_record(payment).then(result => {
		console.log('RESULTADO DE ACTUALIZACION DE BASE DE DATOS', result)
		req.ips_session.reset()
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
	showCancel: showCancelPage,
	showSuccessMp: showSuccessmpPage
}