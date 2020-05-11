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

function dbclient_fetch_user(username, callback) {
	console.log('fetching user ' + username)
	
	let req = {
		endpoint: 'fetch_user_details',
		args: [username]
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(res) {
			if (res.error) {
				callback(null)
			}
			else {
				let account_details = res[0]
				
				let account = new Account(null, username)
				account.enabled = (account_details.enabled.data[0] == 1)
				account.admin = (account_details.admin.data[0] == 1)
				account.bio = account_details.bio
				account.email = account_details.email
			
				account.links = []
				if (account_details.links) {
					let link_entries = account_details.links.split(',')
					for (let link_entry of link_entries) {
						let key_value = link_entry.split('=')
						account.links.push({
							name: key_value[0],
							link: key_value[1]
						})
					}
				}
			
				account.photo = account_details.photo
				account.subscribed = (account_details.subscription.data[0] == 1)
			
				callback(account)
			}
		},
		error: function(err) {
			callback(null)
		}
	})
}

function dbclient_fetch_works(username, callback) {
	console.log('fetching works by ' + username)
	
	let req = {
		endpoint: 'fetch_works',
		args: [username]
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: works fetch failed: ' + data.error)
				callback(null)
			}
			else {
				console.log(data)
				callback(data)
			}
		},
		error: function(err) {
			console.log('error: works fetch failed: ' + err.responseText)
			callback(null)
		}
	})
}

function dbclient_update_user(username, edits, callback) {
	console.log('updating user ' + username)
	
	let links = undefined
	if (edits.links) {
		links = []
		for (let link of edits.links) {
			links.push(link.name + '=' + link.link) //apple=apple.com,banana=banana.net,...,zebra=zebra.gov
		}
		links = links.join(',')
	}
	
	sessionclient_db_request('update_user', [username, edits.photo, edits.bio, links])
		.then(function(data) {
			if (data.error) {
				console.log('user update failed: ' + data.error)
				callback(data.error)
			}
			else {
				callback({success: data})
			}
		})
		.catch(function(err) {
			console.log('user update failed: ' + err.responseText)
			callback('http')
		})
}

function dbclient_contribute(author, title, content, description, license, callback) {
	console.log('contributing work ' + title)
	
	let date = new Date().toISOString()			//yyyy-mm-ddThh:mm:ss.dddZ
	date = date.substring(0, date.indexOf('T'))	//yyyy-mm-dd
	
	sessionclient_db_request('contribute', [author, title, content, description, date, license])
		.then(function(res) {
			callback()
		})
		.catch(function(err) {
			console.log('contribution failed: ' + err)
			callback(err) //login | http | db
		})
}