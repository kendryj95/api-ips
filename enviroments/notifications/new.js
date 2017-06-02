const mail = require('../email')

function newSMS () {}

function newMail (to, subject, template, context, callback) {
	mail.new(to, subject, template, context, callback)
}

module.exports = function(mail) {
	newMail(mail.to, mail.subject, mail.template, mail.context, mail.callback)
	//newSMS()
}