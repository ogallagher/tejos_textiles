/*
dbclient.js
Owen Gallagher
26 july 2019

Handles connection and queries to the database by communicating with server.js 
via HTTP requests.
*/

function dbclient_fetchPuzzles(callback) {
	console.log('fetching: select * from puzzles...');
	
	var sql = 'select * from puzzles';
	
	$.get('/db', {sql: sql}, function(data) {
		console.log('fetched ' data.length + 'puzzles from db');
		
		callback(data);
	});
}