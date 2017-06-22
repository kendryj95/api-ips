const libphonenumber = require('libphonenumber-js')

module.exports = (req, res, next) => {

	if (req.body.telephone) {
		let phone = ''

		if (req.ips_session && req.ips_session.purchase) phone = req.ips_session.purchase.client.telephone
		else if (req.body.purchase) phone = req.body.purchase.client.telephone
		else {
			return res.status(400).render('error', {
				title: 'Número de teléno no es válido',
				error: {
					status: 400,
					error_code: 52,
					details: [
						{
							issue: 'El número de telefono provisto no es válido.'
						}
					]
				}
			})
		}

		if (!libphonenumber.isValidNumber(phone)) {
			return res.status(400).render('error', {
				title: 'Número de teléno no es válido',
				error: {
					status: 400,
					error_code: 52,
					details: [
						{
							issue: 'El número de telefono provisto no es válido.'
						}
					]
				}
			})
		}

		next()
	} else {
		res.status(400).render('error', { 
			title: 'No se ha proveído un número de telefono',
			error: {
				status: 400,
				error_code: 51,
				details: [
					{
						issue: 'No se ha proveído un número de teléfono válido.'
					}
				]
			}
		})
	}
}