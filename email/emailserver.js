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

exports.emailserver_EMAIL_REGISTER = emailserver_EMAIL_REGISTER
exports.emailserver_EMAIL_NEW_PUZZLE = emailserver_EMAIL_NEW_PUZZLE
exports.emailserver_EMAIL_CONTRIBUTION = emailserver_EMAIL_CONTRIBUTION
exports.emailserver_EMAIL_CUSTOM = emailserver_EMAIL_CUSTOM

//local constants
const PATH_EMAIL_TEMPLATES = 'email/email_templates.json'

//local vars
let account
let options
let sender
let templates
let defaults

//global methods
exports.init = function() {
	return new Promise(function(resolve,reject) {
		//load email templates			
		console.log('creating email templates')
		fs.readFile(PATH_EMAIL_TEMPLATES, function(err,data) {
			if (err) {
				console.log('error: read from email templates file failed: ' + err)
				reject()
			}
			else {
				//read api file
				try {
					templates = JSON.parse(data)
				}
				catch (err_json) {
					console.log('error: read from email templates file failed: ' + err_json)
					reject()
				}
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

exports.email = function(dest_email, type, content) {
	return new Promise(function(resolve) {
		switch (type) {
			case emailserver_EMAIL_REGISTER:
				console.log('sending registration email to ' + username)
			
				break
			
			case emailserver_EMAIL_NEW_PUZZLE:
				console.log('sending new textile email to ' + username)
			
				break
			
			case emailserver_EMAIL_CONTRIBUTION:
				console.log('sending curation confirmation email to ' + username)
			
				break
			
			case emailserver_EMAIL_CUSTOM:
				console.log('sending custom email to ' + username)
			
				break
			
			default:
				console.log('error: cannot send email of unknown type')
				break
		}
		
		let message = {
			to: dest_email,
			subject: "Hello There", // Subject line
			text: "Hello world?", // plain text body
			html: "<b>Hello world?</b>" // html body
		}
		
		transporter.sendMail(message, function(err) {
			if (err, info) {
				console.log('message send failed: ' + err)
			}
			else {
				console.log('message ' + info.messageId + ' sent')
				resolve()
			}
		})
	})
}