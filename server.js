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

//serve the website from public/
app.use(express.static('public'));

app.listen(app.get('port'), function() {
	console.log('tejos//textiles server is running at <host>:' + app.get('port'));
	
	console.log('connecting to database...');
	dbserver.init(SITE);
});

app.route('/db')
	.get(function (req,res) {
		var sql = req.query.sql; //sql query
		
		console.log('GET db data fetch: ' + sql);
		
		dbserver.fetch(sql, function(err,data) {
			if (err) {
				console.log('error in db data fetch: ' + err);
				res.json({error: 'fetch error'});
			}
			else {
				res.json(data);
			}
		});
	})
	.post(function (req,res) {
		var sql = req.body.sql; //sql query
		
		console.log('POST db data push: ' + JSON.stringify(sql));
		
		dbserver.push(sql, function(err) {
			if (err) {
				console.log('error in db push: ' + err);
				res.json({error: 'push error'});
			}
			else {
				res.json({success: 'push success'});
			}
		})
	});

