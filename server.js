/*
server.js
Owen Gallagher
25 july 2019
*/

const express = require('express');
const app = express();

//handle POST request data with bodyparser
const bodyparser = require('body-parser');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));

const enums = require('./enums');
const dbserver = require('./db/dbserver');

const SITE = enums.site.TEXTILES; //select database to connect to

app.set('port', (process.env.PORT || 5000));

//enable cross-origin requests for same origin html imports
const cors = require('cors');
const origins = [
	'https://localhost:5000', 					//for local testing
	'https://textilesjournal.herokuapp.com',	//english site url
	'https://revistatejos.herokuapp.com'		//spanish site url
];
app.use(cors({
	origin: function(origin,callback) {
		if (origin != null && origins.indexOf(origin) == -1) {
			return callback(new Error('CORS for origin ' + origin + ' is not allowed access.'), false);
		}
		else {
			return callback(null,true);
		}
	}
}));

//serve the website from public/
app.use(express.static('public'));

app.listen(app.get('port'), function() {
	console.log('tejos//textiles server is running at <host>:' + app.get('port'));
	
	console.log('connecting to database...');
	dbserver.init(SITE);
});

//expose database
app.route('/db')
	.get(function (req,res) {
		var endpoint = req.query.endpoint; //db api endpoint
		var args = req.query.args; //inputs for compiled sql string
		
		console.log('GET db data fetch: ' + endpoint + ' [' + args + ']');
		
		dbserver.getQuery(endpoint, args).then(function(sql) {
			dbserver.fetch(sql, function(err,data) {
				if (err) {
					console.log('error in db data fetch: ' + err);
					res.json({error: 'fetch error'});
				}
				else {
					res.json(data);
				}
			});
		}).catch(function(problem) {
			console.log('error in conversion from endpoint to sql: ' + problem);
		});
	})
	.post(function (req,res) {
		var endpoint = req.body.endpoint; //db api endpoint
		var args = req.body.args; //inputs for compiled sql string
		
		console.log('POST db data push: ' + endpoint + ' [' + args + ']');
		
		dbserver.getQuery(endpoint, args).then(function(sql) {
			dbserver.push(sql, function(err) {
				if (err) {
					console.log('error in db push: ' + err);
					res.json({error: 'push error'});
				}
				else {
					res.json({success: 'push success'});
				}
			});
		}).catch(function(problem) {
			console.log('error in conversion from endpoint to sql: ' + problem);
		});
	});