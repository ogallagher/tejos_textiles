/*
dbserver.js
Owen Gallagher
26 july 2019

Exposes a connected mysql server to tejos//textiles clients via http.
*/

const fs = require('fs');
const mysql = require('mysql');

const enums = require('./enums');

const PATH_DB_CONFIG = './db_config.json';
const DB_TEJOS = 'db_revistatejos';
const DB_TEXTILES = 'db_textilesjournal';

exports.init = function(site) {	
	fs.readFile(PATH_DB_CONFIG, function(err,data) {
		if (err) {
			console.log('error: read from db config file failed');
		}
		else {
			//read config file
			var config = JSON.parse(data);
			
			//select database
			switch (site) {
				case enums.site.TEXTILES:
					config = config[DB_TEXTILES];
					break;
				
				case enums.site.TEJOS:
					config = config[DB_TEJOS];
					break;
					
				default:
					config = null;
					console.log('error: requested database for site ' + site + ' not found in ' + PATH_DB_CONFIG);
					break;
			}
			
			//connect to database
			if (config != null) {
				console.log('connecting to ' + config.name + '...');
				
				db = mysql.createConnection({
					host: config.host,
					user: config.user,
					password: config.pass,
					database: config.db
				});
				
				db.connect(function(err) {
					if (err) {
						console.log('error: failed to connect to ' + config.host);
						console.log(err);
					}
					else {
						console.log('database connected!');
					}
				});
			}
		}
	});
}