const crypto = require('crypto')
const cipher = crypto.createCipher('aes192', require('../config/secret').main)
const decipher = crypto.createDecipher('aes192', require('../config/secret').main)

function encrypt (string) {
	let encrypted = cipher.update(string)
	encrypted += cipher.final('hex')
	return encrypted
}

function decrypt (string) {
	let decrypted = decipher.update(string, 'hex', 'utf8')
	decrypted += decipher.final('utf8')
	return decrypted
}

module.exports = {
	encrypt,
	decrypt
}