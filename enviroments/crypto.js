const encrypter = require('object-encrypter')
const engine = encrypter(require('../config/secret').main, { ttl: true })

module.exports = engine