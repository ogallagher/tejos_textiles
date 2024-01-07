/*
server.js
Owen Gallagher
25 july 2019
*/

try {
	if (require('dotenv').config().error) {
		throw 'environment variables not loaded from .env'
	}
	else {
		console.log('environment variables loaded from .env')
	}
	
	// logging
	const temp_logger = require('temp_js_logger')
	temp_logger.config({
		level: 'debug',
		with_timestamp: true,
		name: 'server',
		with_lineno: true,
		parse_level_prefix: true,
		with_level: true,
		with_always_level_name: false,
		with_cli_colors: true,
		log_to_file: true
	})
	.then(temp_logger.imports_promise)
	.then(() => {
		main(temp_logger)
	})
}
catch (err) {
	console.log(
		`error make sure you run the (npm install) command to get needed node modules first\n${err.stack}`
	)
	process.exit(1)
}

function main(temp_logger) {
	//web server
	const express = require('express')
	const app = express()
	
	//compression
	const brotli_compress = require('brotli/compress') //use brotli to compress large cacheserver entries
	
	app.use(require('compression')({
		level: 5 //from 0 (fastest) to 9 (smallest)
	})) //use gzip/deflate to compress HTTP request responses
	
	//handle POST request data with bodyparser
	const bodyparser = require('body-parser')
	app.use(bodyparser.json())
	app.use(bodyparser.urlencoded({
		extended: false,
		limit: '50mb'
	}))
	
	//local libraries
	const enums = require('./enums')
	const dbserver = require('./db/dbserver')
	const sessionserver = require('./sessionserver')
	const emailserver = require('./email/emailserver')
	
	const SITE = enums.site.TEXTILES; //select database to connect to
	
	app.set('port', process.env.PORT)
	
	//enable cross-origin requests for same origin html imports
	const cors = require('cors')
	const origins = [
		'https://localhost', 						//local testing (same device)
		'http://localhost',							//local testing (same device; http)
		'https://textilesjournal.org',				//english site domain
		'http://textilesjournal.org',				//english site domain (http)
		'https://www.textilesjournal.org',			//english site subdomain (www)
		'http://www.textilesjournal.org'			//english site subdomain (www; http)
	]
	
	app.use(cors({
		origin: function(origin,callback) {
			if (origin != null && origins.indexOf(origin) == -1) {
				return callback(new Error('CORS for origin ' + origin + ' is not allowed access.'), false)
			}
			else {
				return callback(null,true)
			}
		}
	}))
	
	//serve the website from public/
	app.use(express.static('public'))
	
	function on_start() {
		let site_name = 'textiles'
		if (SITE == enums.site.TEJOS) {
			site_name = 'tejos'
		}
		console.log('info ' + site_name + ' server is running at <host>:' + app.get('port'))

		console.log('info connecting to database')
		dbserver.init(SITE)

		console.log('info enabling sessions')
		sessionserver.init()
	
		console.log('info enabling email notifications')
		emailserver
			.init()
			.then(function() {
				console.log('info email server initialized')
			})
			.catch(function() {
				console.log('error email server failed')
			})
	}
	
	if (app.get('port') == 443) {
		//https server
		const fs = require('fs')
		const PATH_HTTPS = process.env.PATH_HTTPS
		
		try {
			require('https').createServer({
			  key: fs.readFileSync(PATH_HTTPS + 'privkey.pem'),
			  cert: fs.readFileSync(PATH_HTTPS + 'cert.pem'),
			  ca: fs.readFileSync(PATH_HTTPS + 'fullchain.pem')
			}, app)
			.listen(app.get('port'), on_start)
		}
		catch (err) {
			console.log(`error https server needs root permissions to run\n${err.stack}`)
		}
	}
	else {
		//http server
		app.listen(app.get('port'), on_start)
	}

	function handle_db(endpoint,args,res) {
		dbserver
			.get_query(endpoint, args, true)
			.then(function(action) {
			    if (action.cached) {
			    	res.json(action.cached)
			    }
			    else if (action.sql) {
			  		dbserver.send_query(action.sql, function(err,data) {
			  			if (err) {
			  				console.log('error error in db data fetch: ' + err)
			  				res.json({error: 'fetch error'})
			  			}
			  			else {
			  				res.json(data)
			  			}
			  		})
			    }
				else {
					res.json({error: action})
				}
			})
			.catch(function(problem) {
				console.log('error error in conversion from endpoint to sql: ' + problem)
				res.json({error: 'endpoint error'})
			})
	}
	
	//expose database
	app
	.route('/db')
	.get(function (req,res) {
		let endpoint = req.query.endpoint //db api endpoint
		let args = req.query.args //inputs for compiled sql string
		
		handle_db(endpoint,args,res)
	})
	.post(function (req,res) {
		let endpoint = req.body.endpoint //db api endpoint
		let args = req.body.args //inputs for compiled sql string
	
		handle_db(endpoint,args,res)
	})
	
	//expose sessions
	app
	.route('/sessions')
	.post(function (req,res) {
		let endpoint = req.body.endpoint
		let args = req.body['args[]']
		
		sessionserver.handle_request(endpoint, args, dbserver)
			.then(function(data) {
				if ((endpoint == sessionserver.ENDPOINT_CREATE && data.register) || 
					endpoint == sessionserver.ENDPOINT_REQUEST_ACTIVATE) {
					console.log('info requesting activation')
					//args = [username, password, session_id, email, subscribed]
					//create activation code
					sessionserver
					.request_activate(data.username)
					.then(function(activation_code) {
						res.json({success: data})
						
						//send registration/activation email
						emailserver.email(data.email, emailserver.EMAIL_REGISTER, {
							username: data.username,
							subscribed: data.subscribed,
							activation_code: activation_code
						})
					})
					.catch(function() {
						res.json({error: 'activation'})
					})
				}
				else if (endpoint == sessionserver.ENDPOINT_RESET_PASSWORD) {
					if (!args[3]) {
						//new password not provided; requesting reset, not completing reset
						let reset_code = data
						
						//send password reset email
						emailserver.email(args[2], emailserver.EMAIL_PASSWORD_RESET, {
							username: args[1],
							reset_code: reset_code
						})
					}
					
					res.json({success: true})
				}
				else {
					res.json({success: data})
				}
			})
			.catch(function(err) {
				/*
				Session server status codes are used internally, but converted to strings when passed to
				the client.
				*/
				if (err == sessionserver.STATUS_CREATE_ERR) {
					res.json({error: 'create'})
				}
				else if (err == sessionserver.STATUS_NO_SESSION) {
					res.json({error: 'null'})
				}
				else if (err == sessionserver.STATUS_EXPIRE || err == sessionserver.STATUS_NO_ACTIVATION) {
					if (endpoint == sessionserver.ENDPOINT_ACTIVATE) {
						//args = [session_id, username, activation_code]
						//get dest email
						let username = args[1]
						dbserver.get_query('fetch_user',[username])
							.then(function(action) {
								dbserver.send_query(action.sql, function(err, data) {
									if (err) {
										console.log('error user ' + username + ' not found in db')
									}
									else {
										let account_info = data[0]
										let dest_email = account_info.email
										let subscribed = (account_info.subscription[0] == 1)
										
										//send new activation code
										sessionserver
											.request_activate(username)
											.then(function(activation_code) {
												//send new activation email
												emailserver.email(dest_email, emailserver.EMAIL_REGISTER, {
													username: username,
													subscribed: subscribed,
													activation_code: activation_code
												})
											})
											.catch(function() {
												console.log('error unable to create new activation code for ' + username)
											})
									}
								})
							})
							.catch(function(err) {
								console.log('error unable to find db --> fetch_user')
							})
					}
					
					res.json({error: 'expired'})
				}
				else if (err == sessionserver.STATUS_LOGIN_WRONG) {
					res.json({error: 'login'})
				}
				else if (err == sessionserver.STATUS_DB_ERR) {
					res.json({error: 'db'})
				}
				else if (err == sessionserver.STATUS_DELETE_ERR) {
					res.json({error: 'delete'})
				}
				else if (err == sessionserver.STATUS_ACTIVATION) {
					res.json({error: 'activation'})
				}
				else if (err == sessionserver.STATUS_XSS_ERR) {
					res.json({error: 'xss'})
				}
				else if (err == sessionserver.STATUS_NO_PLAY) {
					res.json({error: 'no_play'})
				}
				else if (err == sessionserver.STATUS_RESET) {
					res.json({error: 'reset'})
				}
				else {
					res.json({error: 'endpoint'})
					console.log(err)
				}
			})
	})
	
	app
	.route('/email')
	.post(function(req,res) {
		emailserver
		.email(emailserver.TJ_EMAIL, emailserver.EMAIL_CUSTOM, req.body)
		.then(function(err) {
			if (err) {
				res.json({error: 'email'})
			}
			else {
				res.json({success: 'email'})
			}
		})
	})
	
	//for enabling https by getting ssl cert from certbot
	app.get('/.well-known/acme-challenge/:content', function(req,res) {
		res.send(process.env.CERTBOT_DOMAIN_AUTH)
	})
}
