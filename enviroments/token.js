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
	},
	getTokenEncoded: function(){
		try {
			const token = jwt.encode(Math.random(), require('../config/secret').main)
			return token
		} catch(e){
			return {error: e}
		}
	}
}