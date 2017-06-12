const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const Q = require('q')

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
		 partialsDir : 'views/partials/'
 },
 viewPath: 'views/email/',
 extName: '.hbs'
}
transporter.use('compile', hbs(config))

function newMail (to, subject, template, context, callback) {
	let mailOptions = {
		from: '"Insignia Payment Solutions" <notificaciones@insignia.com.ve>',
		to,
		subject,
		template,
		context
	}

	if (template === 'new_pay') {
		mailOptions.attachments = [
			{
				filename: 'logo.png',
				href: 'http://imgur.com/qHMk01i',
				cid: 'notificaciones@insignia.com.ve'
			}
		]
	}

	transporter.sendMail(mailOptions, callback)
}

function newMailAsync (to, subject, template, context, attachments = {}) {
	const deferred = Q.defer()

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
	new: newMail,
	newAsync: newMailAsync
}