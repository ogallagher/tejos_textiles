/*

emailserver.js
Owen Gallagher
2 May 2020

*/

//libraries
const fs = require('fs')
const nodemailer = require('nodemailer')

//global constants
const emailserver_EMAIL_REGISTER		= 0
const emailserver_EMAIL_NEW_PUZZLE		= 1
const emailserver_EMAIL_CONTRIBUTION	= 2
const emailserver_EMAIL_CUSTOM			= 3
const emailserver_EMAIL_PASSWORD_RESET	= 4

exports.EMAIL_REGISTER = emailserver_EMAIL_REGISTER
exports.EMAIL_NEW_PUZZLE = emailserver_EMAIL_NEW_PUZZLE
exports.EMAIL_CONTRIBUTION = emailserver_EMAIL_CONTRIBUTION
exports.EMAIL_CUSTOM = emailserver_EMAIL_CUSTOM
exports.EMAIL_PASSWORD_RESET = emailserver_EMAIL_PASSWORD_RESET

const TJ_EMAIL = 'contact@textilesjournal.org'
exports.TJ_EMAIL = process.env.EMAIL

//local constants
const PATH_EMAIL_TEMPLATES = 'email/email_templates/'

const PATH_EMAIL_REGISTER = PATH_EMAIL_TEMPLATES + 'register'
const PATH_EMAIL_NEW_PUZZLE = PATH_EMAIL_TEMPLATES + 'new_puzzle'
const PATH_EMAIL_CONTRIBUTION = PATH_EMAIL_TEMPLATES + 'contribution'
const PATH_EMAIL_CUSTOM = PATH_EMAIL_TEMPLATES + 'custom'
const PATH_EMAIL_PASSWORD_RESET = PATH_EMAIL_TEMPLATES + 'password_reset'

const PATH_EMAIL_CSS = PATH_EMAIL_TEMPLATES + 'email_style.css'
const EMAIL_CSS_PLACEHOLDER = '<!--?email_style.css?-->'
const EMAIL_USERNAME_PLACEHOLDER = /\?username\?/g
const EMAIL_SUBSCRIBED_PLACEHOLDER = /\?subscribed\?/g
const EMAIL_ACTIVATION_CODE_PLACEHOLDER = /\?activation_code\?/g
const EMAIL_RESET_CODE_PLACEHOLDER = /\?reset_code\?/g

//local vars
let defaults
let templates
let css = ''
let mailer

//global methods
exports.init = function() {
	return new Promise(function(resolve,reject) {
		//load email templates			
		console.log('creating email templates')
		
		//load email template stylesheet
		fs.readFile(PATH_EMAIL_CSS, function(err,data) {
			if (err) {
				console.log('error: read from email css file failed: ' + err)
				reject()
			}
			else {
				css = data.toString().replace(/\s+/g,' ')
				
				templates = {}
				
				//register
				templates.register = {}
				fs.readFile(PATH_EMAIL_REGISTER + '.html', function(err,data) {
					if (err) {
						console.log('error: read from register html template failed: ' + err)
						reject()
					}
					else {
						templates.register.html = data.toString()
						.replace(/\s+/g,' ')
						.replace(EMAIL_CSS_PLACEHOLDER, '<style>' + css + '</style>')
					}
				})
				fs.readFile(PATH_EMAIL_REGISTER + '.txt', function(err, data) {
					if (err) {
						console.log('error: read from register txt template failed: ' + err)
						reject()
					}
					else {
						templates.register.text = data.toString()
					}
				})
				
				//new puzzle
				
				//contribution
				
				//password reset
				templates.password_reset = {}
				fs.readFile(PATH_EMAIL_PASSWORD_RESET + '.html', function(err,data) {
					if (err) {
						console.log('error: read from password reset html template failed: ' + err)
						reject()
					}
					else {
						templates.password_reset.html = data.toString()
						.replace(/\s+/g,' ')
						.replace(EMAIL_CSS_PLACEHOLDER, '<style>' + css + '</style>')
					}
				})
				fs.readFile(PATH_EMAIL_PASSWORD_RESET + '.txt', function(err,data) {
					if (err) {
						console.log('error: read from password reset txt template failed: ' + err)
						reject()
					}
					else {
						templates.password_reset.text = data.toString()
					}
				})
			}
		})
		
		//email config
		console.log('getting email credentials and configuring')
		if (process.env.EMAIL) {
			try {
				//email credentials
				mailer = nodemailer.createTransport({
					host: 'smtp.gmail.com',
					secure: true,
					port: 465,
					auth: {
						type: 'OAuth2',
						user: TJ_EMAIL,
						serviceClient: process.env.GSUITE_APP_ID,
						privateKey: process.env.GSUITE_PRIVATE_KEY
					}
				})
				
				mailer.verify(function(err, success) {
					if (err) {
						console.log(err)
						reject()
					}
					else {
						console.log('email connection verified: ' + success)
						
						//email defaults
						defaults = { 
							from: '"Textiles Journal" ' + TJ_EMAIL
						}
						console.log('sending email as ' + defaults.from)
						
						resolve()
					}
				})
			}
			catch (err) {
				console.log(err)
				reject()
			}
		}
		else {
			console.log('error: email credentials not found in env variables')
			reject()
		}
	})
}

exports.email = function(dest_email, type, args) {
	return new Promise(function(resolve) {
		let out = 'sending '
		let from = defaults.from
		let subject = ''
		let text = ''
		let html = ''
		let go = true
		
		switch (type) {
			case emailserver_EMAIL_REGISTER:
				out += 'registration'
				subject = 'Account registration'
				text = templates.register.text
					.replace(EMAIL_USERNAME_PLACEHOLDER, args.username)
					.replace(EMAIL_SUBSCRIBED_PLACEHOLDER, args.subscribed)
					.replace(EMAIL_ACTIVATION_CODE_PLACEHOLDER, args.activation_code)
				html = templates.register.html
					.replace(EMAIL_USERNAME_PLACEHOLDER, args.username)
					.replace(EMAIL_SUBSCRIBED_PLACEHOLDER, args.subscribed)
					.replace(EMAIL_ACTIVATION_CODE_PLACEHOLDER, args.activation_code)
				break
			
			case emailserver_EMAIL_NEW_PUZZLE:
				out += 'new textile'
				subject = 'We published a new textile: ' + args.textile
			
				break
			
			case emailserver_EMAIL_CONTRIBUTION:
				out += 'contribution use'
				subject = 'Your work ' + args.work + ' was used in our newest textile!'
			
				break
			
			case emailserver_EMAIL_CUSTOM:
				out += 'custom'
				from = args.from
				subject = args.subject
				text = args.message + '\n\n' + from
				html = undefined
				console.log(args)
				
				break
				
			case emailserver_EMAIL_PASSWORD_RESET:
				out += 'password reset'
				subject = 'Password reset requested'
				
				text = templates.password_reset.text
					.replace(EMAIL_USERNAME_PLACEHOLDER, args.username)
					.replace(EMAIL_RESET_CODE_PLACEHOLDER, args.reset_code)
				html = templates.password_reset.html
					.replace(EMAIL_USERNAME_PLACEHOLDER, args.username)
					.replace(EMAIL_RESET_CODE_PLACEHOLDER, args.reset_code)
				
				break
			
			default:
				out += 'cannot send email of unknown type'
				go = false
				break
		}
		out += ' email to ' + dest_email + ' from ' + from;
		
		if (go) {
			let message = {
				to: '"' + args.username + '" ' + dest_email,
				subject: subject,
				text: text,
				html: html,
				from: from
			}
			
			mailer
			.sendMail(message)
			.then(function(info) {
				if (info) {
					console.log('message sent successfully, status: ' + info.response)
				}
				else {
					console.log('message sent successfully')
				}
				resolve()
			})
			.catch(function(err) {
				console.log('error: message send failed: ' + err)
				if (err.response) {
					console.log(err.response.body)
				}
			})
		}
	})
}