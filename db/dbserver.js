/*
dbserver.js
Owen Gallagher
26 july 2019

Exposes a connected mysql server to tejos//textiles clients via http.
*/

const fs = require('fs');
const mysql = require('mysql');

const enums = require('../enums');

const PATH_DB_CONFIG = 'db/db_config.json'; //accessed from server.js = from root dir
const PATH_DB_API = 'db/db_api.json';

const DB_TEJOS = 'db_revistatejos';
const DB_TEXTILES = 'db_textilesjournal';

var db; //database connection object
var scheme; //database scheme object
var api; //database api, for hiding actual sql from the client

exports.init = function(site) {	
	fs.readFile(PATH_DB_CONFIG, function(err,data) {
		if (err) {
			console.log('error: read from db config file failed: ' + err);
		}
		else {
			//read config file
			var config = JSON.parse(data);
			
			//store scheme
			scheme = config.db;
			
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
	
	fs.readFile(PATH_DB_API, function(err,data) {
		if (err) {
			console.log('error: read from db api file failed: ' + err);
		}
		else {
			//read api file
			api = JSON.parse(data);
		}
	});
};

exports.get_query = function(endpoint, args) {
	var entry = api[endpoint];
	var params = entry.params; //array of parameters to be replaced in query
	var query = entry.query; //sql query to be assembled
	
	for (var i=0; i<params.length; i++) {
		query = query.replace(params[i],args[i]);
	}
	console.log('endpoint(' + endpoint + ') --> query(' + query + ')'); //TODO remove this
	
	return new Promise(function(resolve,reject) {
		if (query != null && query.length != 0) {
			resolve(query);
		}
		else {
			reject('no query for endpoint');
		}
	});
};

exports.send_query = function(sql,callback) {
	db.query(sql, function(err,res) {
		callback(err,res); //return error if defined, and response results
	});
};

