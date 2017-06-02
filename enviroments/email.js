const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
	pool: true,
	host: 'mail.insigniamobile.com.ve',
	port: 587,
	secure: false, // use TLS
	auth: {
		user: 'notificaciones@insigniamobile.com.ve',
		pass: 'qwe123'
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
		from: '"Insignia Payment Solutions" <notificaciones@insigniamobile.com.ve>',
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
				cid: 'notificaciones@insigniamobile.com.ve'
			}
		]
	}

	transporter.sendMail(mailOptions, callback)
}

module.exports = {
	new: newMail
}