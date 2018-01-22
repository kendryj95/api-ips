const countries        = require('../enviroments/countries')
const db               = require('../config/db')
var MP = require ("mercadopago"); // requiero la libreria mercado pago..
var config = require ("../config");

function getMetodosDePagos () {
	return new Promise((resolve, reject) => {
		db.connection.ips.query(
			{
				sql     : 'SELECT status, descripcion FROM metodos_de_pago',
				timeout : 6000
			},
			(err, result) => {
				if (err) reject(err)
				else resolve(result)
			}
		)
	})
}

module.exports = (req, res) => {
	let purchase     = ''
	let redirect_url = ''
	let token        = ''

	req.ips_session.reset()

	if (req.ips_session && req.ips_session.user_info && req.ips_session.purchase) {

		purchase     = req.ips_session.purchase.purchase
		redirect_url = req.ips_session.purchase.redirect_url
		token        = req.ips_session.purchase.token

	} else if (req.body.purchase && req.body.redirect_url) {

		// Inicializamos la info de la compra
		purchase     = JSON.parse(req.body.purchase) //aqui recibio el json pasado del lo del yii
		redirect_url = req.body.redirect_url
		token        = req.body.token

		// Guardar info del cliente en ips_session encriptadas
		const userInfo = {
			ip          : req.ip,
			isReqFresh  : req.fresh,
			isReqStale  : req.stale,
			isXhrFilled : req.xhr,
			origin      : `${req.protocol}://${req.hostname}/`,
			reqDate     : parseInt(require('moment')().format('x'))
		}
		req.ips_session.user_info = userInfo

		// Guardamos info de la compra actual en ips_session encriptadas
		req.ips_session.purchase = { purchase, redirect_url, token }
	} else {
		return res.status(400).render('error', {
			title : 'Ha ocurrido un error tratando de crear un nuevo pago',
			error : {
				status: 400,
				details: [
				{
					issue: 'No hay información acerca de la compra.'
				}
				],
				error_code: 50
			}
		})
	}
	// MERCADOPAGO
	var mp = new MP (config.client_id, config.client_secret);

	let items=[]

	purchase.products.forEach( pro => { 
		items.push({
			"id": pro.id,
			"title": pro.name,
			"quantity": pro.quantity,
			"description": pro.description,
			"currency_id": purchase.currency,
			"unit_price":parseInt(pro.price)
		})
	});
    
    var preference = {

			"items": items,

			"back_urls": {
			"success": "http://localhost:3030/sales/successmp",
			"failure": "http://www.youtube.com",// cuando hay una falla o cuando clipkean en "volver a mi sitio"
			"pending": "http://www.insignia.com.ve"
            },
			"auto_return": "approved"
        };

    

	if (purchase && redirect_url, token) {
		// Obtener metodos de pago desde db
		getMetodosDePagos().then(metodos => {
			let metodos_de_pago = []

		 	metodos.forEach(metodo => {
		 		if (metodo.status != 0) {
		 			if (metodo.descripcion === 'PAYPAL_CREDITCARD') {
		 				metodos_de_pago.push({
		 					key_name: metodo.descripcion.trim().toLowerCase(),
		 					name: 'Tarjeta de credito',
		 					descripcion: metodo.descripcion,
		 					estado: metodo.status,
		 					form: () => {
		 						return `${metodo.descripcion.trim().toLowerCase()}_form`
		 					}
		 				})	
		 			} else {
		 				metodos_de_pago.push({
		 					key_name: metodo.descripcion.trim().toLowerCase(),
		 					name: metodo.descripcion.replace('_', ' ').toUpperCase(),
		 					descripcion: metodo.descripcion,
		 					estado: metodo.status,
		 					form: () => {
		 						return `${metodo.descripcion.trim().toLowerCase()}_form`
		 					}
		 				})
		 			}
		 		}
		 	})


		 	mp.createPreference(preference, function (err, data){//mercadopago ejecuto la funcion
        
        	if (err) {
            res.send (err);
        	} else if(purchase.currency=="VEF"||"ARS"||"BRL"||"MXN"||"COP"||"PEN"||"CLP"){
        		
            res.render('new', {"preference": data,
        						return_url: redirect_url,
								purchase,
								countries,
								token,
								metodos_de_pago});
            console.log(JSON.stringify (data, null, 4));
        	}
        	if (data.status==201) {
        		console.log("PREFERENCIA CREADAAAAAAAAAAAA")
        	}

    		});
        
 
		 	if (purchase.currency=="USD") {
		 		res.render('new',{
        						return_url: redirect_url,
								purchase,
								countries,
								token,
								metodos_de_pago});
		 	}

			
		}).catch(err => {
			console.error('ERROR', err)
			if (err instanceof Error) {
				switch (err.code) {
					case 'ETIMEDOUT':
						console.log('TIMEOUT', err)
						res.redirect(request.get('referer'))
					break
					default:
						res.status(400).json({ 'code': 1000, 'message': err })
					break
				}
			} else {
				console.log('ERROR DESCONOCIDO', err)
				setTimeout(() => {
					res.redirect(request.get('referer'))
				}, 15)
			}
		})
	}
}