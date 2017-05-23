const jwt = require('jwt-simple')

module.exports = {
	getTokenDecoded: function(token) {
		try {
			const decoded = jwt.decode(token, require('../config/secret').main)
			return decoded
		} catch(e) {
			return {
				error: e
			}
		}
	}
}