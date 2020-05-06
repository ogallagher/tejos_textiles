/*
dbclient.js
Owen Gallagher
26 July 2019

Handles connection and queries to the database by communicating with server.js 
via HTTP requests.
*/

function dbclient_fetch_puzzles(callback) {	
	console.log('fetching puzzles...');
	
	let req = {
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
	
	let req = {
		endpoint: 'fetch_puzzle_paths',
		args: [id]
	}
	
	$.get({
		url: '/db', 
		data: req, 
		success: function(data) {
			if (data.error) {
				console.log('paths fetch failed: ' + data.error)
				callback(null)
			}
			else {
				console.log('fetched paths for ' + data.length + ' puzzle(s) from db')
			
				callback(data[0])
			}
		},
		error: function(err) {
			console.log('paths fetch failed: ' + err.responseText)
			callback(null)
		}
	})
}

function dbclient_fetch_puzzle(id, callback) {
	console.log('fetching puzzle[' + id + ']')
	
	let req = {
		endpoint: 'fetch_puzzle',
		args: [id]
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: failed to fetch puzzle: ' + err.responseText)
			}
			else {
				callback(data[0])
			}
		},
		error: function(err) {
			console.log('error: failed to fetch puzzle: ' + err.responseText)
		}
	})
}

//TODO this is just a placeholder until collections are actually implemented
function dbclient_fetch_collection(collection,callback) {
	console.log('fetching collection ' + collection + '...')
	
	let req = {
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
	
	let req = {
		endpoint: 'search_puzzles',
		args: terms
	}
	
	$.get('/db', req, function(data) {
		if (data.error) {
			console.log('error: puzzle search failed: ' + data.error)
			callback(false)
		}
		else {
			console.log('fetched ' + data.length + ' puzzles from db')
			callback(data)
		}
	})
}

function dbclient_user_exists(username,callback) {
	console.log('checking if username ' + username + ' is taken')
	
	let req = {
		endpoint: 'user_exists',
		args: [username]
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: username check failed: ' + data.error)
				callback(false)
			}
			else {
				callback(data[0].taken)
			}
		},
		error: function(err) {
			console.log('error: username check failed: ' + err.responseText)
			callback(false)
		}
	})
}

function dbclient_rate(username,puzzle_id,rating,callback) {
	console.log('rating puzzle ' + puzzle_id + ' as ' + rating)
	
	sessionclient_db_request('rate', [username,puzzle_id,rating])
		.then(function(data) {
			let result = data[0][0].result
			
			if (result == 'success') {
				callback(true)
			}
			else {
				callback(false)
			}
		})
		.catch(function(err) {
			console.log('puzzle rating failed: ' + err) //TODO switch-case on err
			callback(false)
		})
}

function dbclient_fetch_user_rating(username,puzzle_id,callback) {
	console.log('fetching ' + username + '\'s rating of ' + puzzle_id)
	
	sessionclient_db_request('fetch_rating', [username,puzzle_id])
		.then(function(data) {
			if (data.error) {
				console.log('rating fetch failed: ' + data.error)
				callback(null)
			}
			else {
				callback(data[0])
			}
		})
		.catch(function(err) {
			console.log('rating fetch failed: ' + err.responseText)
			callback(null)
		})
}

function dbclient_fetch_user_plays(username,puzzle_id,callback) {
	console.log('fetching ' + username + '\'s play data of ' + puzzle_id)
	
	sessionclient_db_request('fetch_user_plays', [username,puzzle_id])
		.then(function(data) {
			if (data.error) {
				console.log('user plays fetch failed: ' + data.error)
				callback(null)
			}
			else {
				callback(data[0])
			}
		})
		.catch(function(err) {
			console.log('user plays fetch failed: ' + err.responseText)
			callback(null)
		})
}