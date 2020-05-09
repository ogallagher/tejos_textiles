/*

emailserver.js
Owen Gallagher
2 May 2020

*/

//libraries
const nodemailer = require('nodemailer')
const fs = require('fs')

//global constants
const emailserver_EMAIL_REGISTER		= 0
const emailserver_EMAIL_NEW_PUZZLE		= 1
const emailserver_EMAIL_CONTRIBUTION	= 2
const emailserver_EMAIL_CUSTOM			= 3

exports.EMAIL_REGISTER = emailserver_EMAIL_REGISTER
exports.EMAIL_NEW_PUZZLE = emailserver_EMAIL_NEW_PUZZLE
exports.EMAIL_CONTRIBUTION = emailserver_EMAIL_CONTRIBUTION
exports.EMAIL_CUSTOM = emailserver_EMAIL_CUSTOM

//local constants
const PATH_EMAIL_TEMPLATES = 'email/email_templates/'

const PATH_EMAIL_REGISTER = PATH_EMAIL_TEMPLATES + 'register'
const PATH_EMAIL_NEW_PUZZLE = PATH_EMAIL_TEMPLATES + 'new_puzzle'
const PATH_EMAIL_CONTRIBUTION = PATH_EMAIL_TEMPLATES + 'contribution'
const PATH_EMAIL_CUSTOM = PATH_EMAIL_TEMPLATES + 'custom'

const PATH_EMAIL_CSS = PATH_EMAIL_TEMPLATES + 'email_style.css'
const EMAIL_CSS_PLACEHOLDER = '<!--?email_style.css?-->'
const EMAIL_USERNAME_PLACEHOLDER = /\?username\?/g
const EMAIL_SUBSCRIBED_PLACEHOLDER = /\?subscribed\?/g
const EMAIL_ACTIVATION_CODE_PLACEHOLDER = /\?activation_code\?/g

//local vars
let account
let options
let sender
let templates
let css = ''
let defaults

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
			}
		})
		
		nodemailer.createTestAccount()
			.then(function(credentials) {
				//TODO get email credentials from environment variables
				console.log('getting email options and credentials')
				account = credentials
				
				//load connection options
				options = {
					pool: true,					//pool connections together
					host: 'smtp.ethereal.email',
					port: 587,
					auth: {
						user: account.user,		//see https://nodemailer.com/smtp/#authentication for how to set up oath2 with user and token properly
						pass: account.pass
					}
				}
				
				//load defaults
				defaults = {
					from: {
						name: 'Textiles Journal',
						address: 'contact@textilesjournal.org'
					}
				}
				
				//create connection
				sender = nodemailer.createTransport(options,defaults)
				resolve()
			})
			.catch(function(err) {
				console.log('failed to initialize email account: ' + err)
				reject()
			})
	})
}

exports.email = function(dest_email, type, args) {
	return new Promise(function(resolve) {
		let out = 'sending '
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
				subject = args.subject
			
				break
			
			default:
				out += 'cannot send email of unknown type'
				go = false
				break
		}
		out += ' email to ' + dest_email;
		console.log(out)
		
		if (go) {
			let message = {
				to: dest_email,
				subject: subject,
				text: text,
				html: html
			}
		
			sender.sendMail(message, function(err, info) {
				if (err) {
					console.log('message send failed: ' + err)
				}
				else {
					console.log('message sent, viewable at:\n' + nodemailer.getTestMessageUrl(info))
					resolve()
				}
			})
		}
	})
}