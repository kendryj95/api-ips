const email = require('./email')
const sms   = require('./sms')
const Q     = require('q')

function createNotification (emailData, smsData) {
	const deferred = Q.defer()

	Q.allSettled([
		email.new(emailData),
		sms.new(smsData)
	]).spread((emailResponse, smsResponse) => {
		deferred.resolve({ email: emailResponse, sms: smsResponse })
	}).catch(err => deferred.reject(err))

	return deferred.promise
}

module.exports = {
	new: createNotification
}