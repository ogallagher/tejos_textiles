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
		/*
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
		*/
		
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
		switch (type) {
			case emailserver_EMAIL_REGISTER:
				out += 'registration'
				
				break
			
			case emailserver_EMAIL_NEW_PUZZLE:
				out += 'new textile'
			
				break
			
			case emailserver_EMAIL_CONTRIBUTION:
				out += 'curation confirmation'
			
				break
			
			case emailserver_EMAIL_CUSTOM:
				out += 'custom'
			
				break
			
			default:
				out += 'cannot send email of unknown type'
				break
		}
		out += ' email to ' + dest_email;
		console.log(out)
		
		let message = {
			to: dest_email,
			subject: "Hello There", // Subject line
			text: "Hello world?", // plain text body
			html: "<html><strong>Hello world?</strong></html>" // html body
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
	})
}