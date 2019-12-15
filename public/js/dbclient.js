/*
dbclient.js
Owen Gallagher
26 july 2019

Handles connection and queries to the database by communicating with server.js 
via HTTP requests.
*/

function dbclient_fetch_puzzles(callback) {	
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

function dbclient_fetch_puzzle_paths(id,callback) {
	console.log('fetching paths for puzzle[' + id + ']...')
	
	var req = {
		endpoint: 'fetch_puzzle_paths',
		args: [id]
	}
	
	$.get('/db', req, function(data) {
		console.log('fetched paths for ' + data.length + ' puzzle(s) from db')
		
		callback(data[0])
	})
}

//TODO this is just a placeholder until collections are actually implemented
function dbclient_fetch_collection(collection,callback) {
	console.log('fetching collection ' + collection + '...')
	
	var req = {
		endpoint: 'fetch_collection_' + collection,
		args: []
	}
	
	callback([
		{title: 'one',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'two',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'three',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'four',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'five',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'six',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'seven',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'eight',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'nine',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: 'ten',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}}
	])
}

function dbclient_fetch_search(terms,callback) {
	console.log('searching for ' + terms.join())
	
	var req = {
		endpoint: 'search_puzzles',
		args: []
	}
	
	let where = ''
	
	//compile compound where clause
	terms.forEach(function(term) {
		where += 'title like \'%' + term + '%\' or '
	})
	
	//remove last or
	req.args.push(where.replace(/\s*or\s*$/,''))
	
	$.get('/db', req, function(data) {
		console.log('fetched ' + data.length + ' puzzles from db')
		
		thread(function() {
			callback(data)
		})
	})
}