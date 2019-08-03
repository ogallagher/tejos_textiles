/*
dbclient.js
Owen Gallagher
26 july 2019

Handles connection and queries to the database by communicating with server.js 
via HTTP requests.
*/

const DB_CONFIG_PATH = '/json/db_config.json';
var dbclient_db;
const SQL_PROJECT = '<project>';
const SQL_TABLE = '<table>';

var dbclient_onload = new Promise(function(resolve,reject) {
	console.log('loading db configuration...');
	
	$.getJSON(DB_CONFIG_PATH, function(data) {
		console.log('db configuration loaded! ' + JSON.stringify(data));
		
		dbclient_db = data;
		resolve();
	});
});

function dbclient_fetchPuzzles(projection,callback) {
	var sql = 'select ' + projection.join() + ' from puzzles';
	
	console.log('fetching: ' + sql + '...');
	
	$.get('/db', {sql: sql}, function(data) {
		console.log('fetched ' + data.length + ' puzzles from db');
		
		callback(data);
	});
}