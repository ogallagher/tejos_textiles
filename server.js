/*
server.js
Owen Gallagher
25 july 2019
*/

try {
	if (require('dotenv').config().error) {
		console.log('environment variables not loaded from .env; assuming production mode')
	}
	else {
		console.log('environment variables loaded from .env; assuming testing mode')
	}
	
	//web server
	const express = require('express')
	const app = express()

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
	const sessionserver = require('./session/sessionserver')
	const emailserver = require('./email/emailserver')
	
	const SITE = enums.site.TEXTILES; //select database to connect to
	
	app.set('port', (process.env.PORT || 5000))

	//enable cross-origin requests for same origin html imports
	const cors = require('cors')
	const origins = [
		'https://localhost', 						//local testing (same device)
		'https://192.168.0.24',						//local testing (different devices)
		'https://textilesjournal.herokuapp.com',	//english site heroku
		'https://revistatejos.herokuapp.com',		//spanish site heroku
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
		console.log(site_name + ' server is running at <host>:' + app.get('port'))

		console.log('connecting to database...')
		dbserver.init(SITE)

		console.log('enabling sessions...')
		sessionserver.init()
	
		console.log('enabling email notifications...')
		emailserver
			.init()
			.then(function() {
				console.log('email server initialized')
			})
			.catch(function() {
				console.log('error: email server failed')
			})
	}
	
	if (app.get('port') == 443) {
		//https server
		const fs = require('fs')
		const PATH_HTTPS = './secrets/https_config/'
		
		try {
			require('https').createServer({
			  key: fs.readFileSync(PATH_HTTPS + 'privkey.pem'),
			  cert: fs.readFileSync(PATH_HTTPS + 'cert.pem'),
			  ca: fs.readFileSync(PATH_HTTPS + 'fullchain.pem')
			}, app).listen(app.get('port'), on_start)
		}
		catch (err) {
			console.log(err)
			console.log('error: https server needs root permissions to run')
		}
	}
	else {
		//http server
		app.listen(app.get('port'), on_start)
	}

	function handle_db(endpoint,args,res) {
		console.log('db: ' + endpoint + ' [' + args + ']')
		
		dbserver
			.get_query(endpoint, args, true)
			.then(function(action) {
			    if (action.cached) {
			    	res.json(action.cached)
			    }
			    else if (action.sql) {
			  		dbserver.send_query(action.sql, function(err,data) {
			  			if (err) {
			  				console.log('error in db data fetch: ' + err)
			  				res.json({error: 'fetch error'})
			  			}
			  			else {
			  				res.json(data)
			  			}
			  		});
			    }
			})
			.catch(function(problem) {
				console.log('error in conversion from endpoint to sql: ' + problem)
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
		});
	
	//expose sessions
	app
		.route('/sessions')
		.post(function (req,res) {
			let endpoint = req.body.endpoint
			let args = req.body['args[]']
			
			sessionserver.handle_request(endpoint, args, dbserver)
				.then(function(data) {
					if (endpoint == sessionserver.ENDPOINT_CREATE && args[3]) {
						console.log('requesting activation')
						//args = [username, password, session_id, email, subscribed]
						//create activation code
						sessionserver
							.request_activate(args[2])
							.then(function(activation_code) {
								res.json({success: data})
								
								//send registration/activation email
								emailserver.email(args[3], emailserver.EMAIL_REGISTER, {
									username: args[0],
									subscribed: args[4],
									activation_code: activation_code
								})
							})
							.catch(function() {
								res.json({error: 'activation'})
							})
					}
					else {
						res.json({success: data})
					}
				})
				.catch(function(err) {
					if (err == sessionserver.STATUS_CREATE_ERR) {
						res.json({error: 'create'})
					}
					else if (err == sessionserver.STATUS_NO_SESSION) {
						res.json({error: 'null'})
					}
					else if (err == sessionserver.STATUS_EXPIRE) {
						if (endpoint == sessionserver.ENDPOINT_ACTIVATE) {
							//args = [session_id, username, activation_code]
							//get dest email
							let username = args[1]
							dbserver.get_query('fetch_user',[username])
								.then(function(action) {
									dbserver.send_query(action.sql, function(err, data) {
										if (err) {
											console.log('error: user ' + username + ' not found in db')
										}
										else {
											let account_info = data[0]
											let dest_email = account_info.email
											let subscribed = (account_info.subscription[0] == 1)
											
											//send new activation code
											sessionserver
												.request_activate(args[0])
												.then(function(activation_code) {
													//send new activation email
													emailserver.email(dest_email, emailserver.EMAIL_REGISTER, {
														username: username,
														subscribed: subscribed,
														activation_code: activation_code
													})
												})
												.catch(function() {
													console.log('error: unable to create new activation code for ' + username)
												})
										}
									})
								})
								.catch(function(err) {
									console.log('error: unable to find db --> fetch_user')
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
					else if (err = sessionserver.STATUS_DELETE_ERR) {
						res.json({error: 'delete'})
					}
					else if (err == sessionserver.STATUS_ACTIVATION) {
						res.json({error: 'activation'})
					}
					else {
						res.json({error: 'endpoint'})
					}
				})
		})
	
	//for enabling https by getting ssl cert from certbot
	app.get('/.well-known/acme-challenge/:content', function(req,res) {
		res.send('eRNduXySI3Bb1fpaQFU7t1ODNhI0roKeVeOjTuz3-p8.APhvbwl_rvMO2TUKMJgyqQ38kvH7k3s1WZYGORvtTbM')
	})
}
catch (err) {
	console.log(err)
	console.log('Error: please run the `npm install` command to get needed node modules first')
	process.exit(1)
}