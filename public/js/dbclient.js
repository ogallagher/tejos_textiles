/*
dbclient.js
Owen Gallagher
26 july 2019

Handles connection and queries to the database by communicating with server.js 
via HTTP requests.
*/

var dbclient_onload = new Promise(function(resolve,reject) {
	console.log('loading db configuration...');
	console.log('db configuration loaded!');
	
	resolve();
});

function dbclient_fetchPuzzles(callback) {	
	console.log('fetching puzzles...');
	
	var req = {
		endpoint: 'fetch_puzzles',
		args: []
	};
	
	$.get('/db', req, function(data) {
		console.log('fetched ' + data.length + ' puzzles from db');
		
		callback(data);
	});
}

function dbclient_fetchPuzzlePaths(id,callback) {
	console.log('fetching paths for puzzle[' + id + ']...');
	
	var req = {
		endpoint: 'fetch_puzzle_paths',
		args: [id]
	};
	
	$.get('/db', req, function(data) {
		console.log('fetched ' + data.length + ' puzzles from db');
		
		callback(data[0]);
	});
}