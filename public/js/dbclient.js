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

function dbclient_fetch_collection(collection,callback) {
	console.log('fetching collection ' + collection + '...')
	
	var req = {
		endpoint: 'fetch_collection_' + collection,
		args: []
	}
	
	callback([
		{title: '1',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '2',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '3',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '4',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '5',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '6',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '7',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '8',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '9',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}},
		{title: '10',forecolor:{data:null},backcolor:{data:null},textcolor:{data:null}}
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
		
		callback(data)
	})
}