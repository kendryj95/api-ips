const jwt = require('jwt-simple')

module.exports = function (req, res, next) {
	// Get token through http headers
	const token = (req.body && req.body.token) || (req.body && req.query.token) || req.headers['x-access-token']

	if (token && typeof(token) !== 'undefined') {
		try {
			const decoded = jwt.decode(token, require('../config/secret').main)

			if (decoded.exp <= Date.now()) {
				res.status(400).json({
					"status": 400,
					"message": "Token expired",
					"error_code": 2
				})
			} else {
				next()
			}

		} catch(e) {
			res.status(500).json({
				"status": 500,
				"message": "Something went wrong, please try again later.",
				"error": e,
				"error_code": 3
			})
		}

	} else {
		res.status(401).json({
			"status": 401,
			"message": "Unexisting or invalid token.",
			"error_code": 1,
			"request.body": req.body
		})
		return
	}

}