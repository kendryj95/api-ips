const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')

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

module.exports = {
	new: newMail
}