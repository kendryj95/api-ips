const nodemailer = require('nodemailer')
const hbs        = require('nodemailer-express-handlebars')
const Q          = require('q')

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
	pool: true,
	host: 'insignia.com.ve',
	port: 465,
	secure: true, // use TLS
	auth: {
		user: 'notificaciones@insignia.com.ve',
		pass: 'qwe123#'
	},
	tls: {
		rejectUnauthorized:false
	}
})

//attach the plugin to the nodemailer transporter
const config = {
	viewEngine: {
		extname: '.hbs',
		layoutsDir: 'views/email/',
		defaultLayout : 'template',
		partialsDir : 'views/email/partials/'
	},
	viewPath: 'views/email/',
	extName: '.hbs'
}

transporter.use('compile', hbs(config))

function newMail (data) {
	const deferred = Q.defer()

	if (!data && typeof data !== 'object' && !data.to && !data.subject && !data.template && !data.context)
		return deferred.reject('Data del email es inexistente o incompleta')

	let to          = data.to
	let subject     = data.subject
	let template    = data.template
	let context     = data.context
	let attachments = data.attachments ? data.attachments : []

	let mailOptions = {
		from: '"Insignia Payment Solutions" <notificaciones@insignia.com.ve>',
		to,
		subject,
		template,
		context,
		attachments
	}

	transporter.sendMail(mailOptions, (error, success) => {
		if (error) {
			deferred.reject(error)
		} else {
			deferred.resolve(success)
		}
	})

	return deferred.promise
}

module.exports = {
	new: newMail
}