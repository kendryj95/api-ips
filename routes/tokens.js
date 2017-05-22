module.exports = {
	new: function(req, res) {
		const password = req.headers['x-password']
		const data_cliente = req.body.data_cliente

		if (password && data_cliente) {
			

			if (password == require('./config/secret').new_tokens) {

				function expiresIn(numDays) {
					let dateObj = new Date()
					return dateObj.setDate(dateObj.getDate() + numDays)
				}

				const new_token = require('jwt-simple').encode({
					exp: expiresIn(100),
					cliente: {
						id: data_cliente.name + "@" + data_cliente.sc + "_" + new Date().getTime(),
						nombre: data_cliente.name,
						origen: data_cliente.sc,
						sc: data_cliente.sc
					}
				}, require('./config/secret').main)

				res.status(201).json({
					"status": 201,
					"message": "New token successfully created!",
					"token": new_token
				})

			} else {
				res.status(403).json({
					"status": 403,
					"message": "Wrong password",
					"error_code": 5
				})
			}

		} else {
			let message
			let code

			if (!password) {
				message = 'No password provided'
				code = 6
			} else if (data_cliente) {
				message = 'No user data provided'
				code = 5
			} else {
				message = 'No password or user data provided'
				code = 4
			}

			res.status(400).json({
				"status": 400,
				"message": message,
				"error_code": code
			})
		}
	}
}