/*
server.js
Owen Gallagher
25 july 2019
*/

try {
	const express = require('express')
	const app = express()

	//handle POST request data with bodyparser
	const bodyparser = require('body-parser')
	app.use(bodyparser.json())
	app.use(bodyparser.urlencoded({extended: false}))
	
	const enums = require('./enums')
	const dbserver = require('./db/dbserver')
	const sessionserver = require('./sessionserver')
	
	const SITE = enums.site.TEXTILES; //select database to connect to

	app.set('port', (process.env.PORT || 5000))

	//enable cross-origin requests for same origin html imports
	const cors = require('cors')
	const origins = [
		'https://localhost:5000', 					//for local testing
		'https://textilesjournal.herokuapp.com',	//english site url
		'https://revistatejos.herokuapp.com'		//spanish site url
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

	app.listen(app.get('port'), function() {
		console.log('tejos//textiles server is running at <host>:' + app.get('port'))
	
		console.log('connecting to database...')
		dbserver.init(SITE)
	
		console.log('enabling sessions...')
		sessionserver.init()
	})

	function handle_db(endpoint,args,res) {
		console.log('db: ' + endpoint + ' [' + args + ']')
	
		dbserver
			.get_query(endpoint, args)
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
			});
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
			let args = req.body.args
			
			sessionserver.handle_request(endpoint, args)
				.then(function(data) {
					res.json({success: data})
				})
				.catch(function(err) {
					if (err == sessionserver_STATUS_CREATE_ERR) {
						res.json({error: 'create'})
					}
					else if (err == sessionserver_STATUS_NO_SESSION) {
						res.json({error: 'null'})
					}
					else if (err == sessionserver_STATUS_EXPIRE) {
						res.json({error: 'expired'})
					}
				})
		})
}
catch (err) {
	console.log('Error: please run the `npm install` command to get needed node modules first')
	process.exit(1)
}