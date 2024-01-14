/*
dbclient.js
Owen Gallagher
26 July 2019

Handles connection and queries to the database by communicating with server.js 
via HTTP requests.
*/

const COLLECTION_TOP_RATED = 1
const COLLECTION_TOP_PLAYED = 2
const COLLECTION_EDITORS_CHOICE = 3

function dbclient_fetch_update(item_table, item_id) {
	if ((typeof item_id) !== 'string') {
		// item id provided as keys and values. convert to string
		let item_id_entries = []
		for (let [key, val] of Object.entries(item_id)) {
			item_id_entries.push(`${key}=${val}`)
		}
		item_id = item_id_entries.join(',')
	}
	console.log(`fetching update for ${item_table}[${item_id}]`)
	
	let req = {
		endpoint: 'fetch_update',
		args: [item_table, item_id],
		version: new Date().getTime()
	}
	
	return new Promise(function(res, rej) {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.length > 0) {
					// return first and only row containing last update/version for the requested item
					let last_update = data[0].last_update
					if (last_update !== undefined) {
						console.log(`debug fetched ${item_id} version ${last_update}`)
						res(last_update)
					}
					else {
						console.log(`warning did not find key last_update in ${data[0]}. return default zero`)
						res(0)
					}
				}
				else {
					// item does not yet exist; return default version zero
					res(0)
				}
			},
			error: function(err) {
				console.log(`error update fetch failed: ` + err.responseText)
				rej(null)
			}
		})
	})
}

function dbclient_fetch_puzzles(admin, callback) {
	console.log('fetching puzzles...');
	
	if (admin == null) {
		admin = false
	}
	
	let req = {
		endpoint: 'fetch_puzzles',
		args: [admin]
	}
	
	$.get({
		url: '/db', 
		data: req, 
		success: function(data) {
			console.log('fetched ' + data.length + ' puzzles from db')
			
			callback(data)
		},
		error: function(err) {
			console.log(`error puzzles fetch failed: ` + err.responseText)
		}
	})
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
	console.log('fetching puzzle ' + id)
	
	let req = {
		endpoint: 'fetch_puzzle',
		args: [id]
	}
	
	dbclient_fetch_update('puzzles', {
		puzzle_id: id
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`debug unable to fetch version of puzzle ${id}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('error: failed to fetch puzzle: ' + err.responseText)
					callback()
				}
				else {
					callback(data[0])
				}
			},
			error: function(err) {
				console.log('error: failed to fetch puzzle: ' + err.responseText)
				callback()
			}
		})
	})
}

//TODO this is just a placeholder until collections are actually implemented
function dbclient_fetch_collection(collection, count, callback) {
	console.log('fetching collection ' + collection + '...')
	
	let req = {
		endpoint: '',
		args: [count]
	}
	
	switch (collection) {
		case COLLECTION_TOP_RATED:
			req.endpoint = 'fetch_collection_top_rated'
			break
			
		case COLLECTION_TOP_PLAYED:
			req.endpoint = 'fetch_collection_top_played'
			break
			
		case COLLECTION_EDITORS_CHOICE:
			req.endpoint = 'fetch_collection_editors_choice'
			break
			
		default:
			console.log('error: unknown collection type ' + collection)
			callback()
			return
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: collection fetch failed: ' + data.error)
				callback()
			}
			else {
				callback(data)
			}
		},
		error: function(err) {
			console.log('error: server connection failed for ' + req.endpoint + ': ' + err)
			callback()
		}
	})
}

function dbclient_fetch_search(terms,callback) {
	console.log('searching for ' + terms.join())
	
	let req = {
		endpoint: 'search_puzzles',
		args: terms
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: puzzle search failed: ' + data.error)
				callback(false)
			}
			else {
				console.log('fetched ' + data.length + ' puzzles from db')
				callback(data)
			}
		}
	})
}

function dbclient_site_search(terms,callback) {
	console.log('searching site for ' + terms.join())
	
	let req = {
		endpoint: 'search_all',
		args: terms
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: site search failed: ' + data.error)
				callback(false)
			}
			else {
				console.log('site search success')
				callback(data[0])
			}
		},
		error: function(err) {
			console.log('error: site search failed: ' + err.responseText)
			callback(false)
		}
	})
}

function dbclient_user_exists(username,callback) {
	console.log('checking if username ' + username + ' is taken')
	
	let req = {
		endpoint: 'user_exists',
		args: [username]
	}
	
	dbclient_fetch_update('people', {
		username: username
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`debug unable to fetch version of user ${username}; result may be from browser cache`)
		}
	)
	.finally(() => {
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
	})
}

function dbclient_email_exists(email,callback) {
	console.log('checking if email ' + email + ' is taken')
	
	let req = {
		endpoint: 'email_exists',
		args: [email]
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('error: email check failed: ' + data.error)
				callback(false)
			}
			else {
				callback(data[0].taken)
			}
		},
		error: function(err) {
			console.log('error: email check failed: ' + err.responseText)
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
				callback(data[0][0].avg_rating)
			}
			else {
				callback(false)
			}
		})
		.catch(function(err) {
			console.log('puzzle rating failed: ' + err)
			callback(false)
		})
}

function dbclient_fetch_user_rating(username, puzzle_id, callback) {
	console.log('fetching ' + username + '\'s rating of ' + puzzle_id)
	
	dbclient_fetch_update('ratings', {
		username: username,
		puzzle_id: puzzle_id
	})
	.then(
		(last_update) => {
			return last_update
		},
		() => {
			console.log(`debug unable to fetch version of rating ${username}-${puzzle_id}; result may be from browser cache`)
			return undefined
		}
	)
	.finally((version) => {
		sessionclient_db_request('fetch_rating', [username,puzzle_id], version)
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
			console.log('rating fetch failed: ' + err)
			callback(null)
		})
	})
}

//rate puzzle difficulty on a scale from 1=easy to 10=hard
function dbclient_measure_difficulty(username, puzzle_id, difficulty, callback) {
	console.log('measuring puzzle ' + puzzle_id + ' difficulty as ' + difficulty)
	
	sessionclient_db_request('measure_difficulty', [username,puzzle_id,difficulty])
		.then(function(data) {
			let result = data[0][0].result
			
			if (result == 'success') {
				callback(data[0][0].avg_difficulty)
			}
			else {
				callback(false)
			}
		})
		.catch(function(err) {
			console.log('puzzle difficulty measure failed: ' + err)
			callback(false)
		})
}

function dbclient_fetch_user_difficulty(username, puzzle_id, callback) {
	console.log('fetching ' + username + '\'s difficulty measure of ' + puzzle_id)
	
	dbclient_fetch_update('difficulties', {
		username: username,
		puzzle_id: puzzle_id
	})
	.then(
		(last_update) => {
			return last_update
		},
		() => {
			console.log(`debug unable to fetch version of difficulty ${username}-${puzzle_id}; result may be from browser cache`)
			return undefined
		}
	)
	.finally((version) => {
		sessionclient_db_request('fetch_difficulty', [username,puzzle_id], version)
		.then(function(data) {
			if (data.error) {
				console.log('difficulty fetch failed: ' + data.error)
				callback(null)
			}
			else {
				callback(data[0])
			}
		})
		.catch(function(err) {
			console.log('difficulty fetch failed: ' + err)
			callback(null)
		})
	})
}

function dbclient_fetch_user_plays(username,puzzle_id,callback) {
	console.log('fetching ' + username + '\'s play data of ' + puzzle_id)
	
	dbclient_fetch_update('plays', {
		username: username,
		puzzle_id: puzzle_id
	})
	.then(
		(last_update) => {
			return last_update
		},
		() => {
			console.log(`debug unable to fetch version of plays ${username}-${puzzle_id}; result may be from browser cache`)
			return undefined
		}
	)
	.finally((version) => {
		sessionclient_db_request('fetch_user_plays', [username,puzzle_id], version)
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
			console.log('user plays fetch failed: ' + err)
			callback(null)
		})
	})
}

function dbclient_fetch_user(username, callback) {
	console.log('fetching user ' + username)
	
	let req = {
		endpoint: 'fetch_user_details',
		args: [username]
	}
	
	// fetch version for last update of this user
	dbclient_fetch_update('people', {
		username: username
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`debug unable to fetch version of user ${username}; result may be from browser cache`)
		}
	)
	.finally(() => {
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
					account.deleted = (account_details.deleted.data[0] == 1)
					account.anonymous = (account_details.anonymous.data[0] == 1)
				
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
	})
}

function dbclient_fetch_user_activity(username, callback) {
	console.log('fetching activity for ' + username)
	
	let req = {
		endpoint: 'fetch_user_activity',
		args: [username]
	}
	
	Promise.all([
		// plays version
		dbclient_fetch_update('plays', {username: username}),
		// ratings version
		dbclient_fetch_update('ratings', {username: username}),
		// difficulties version
		dbclient_fetch_update('difficulties', {username: username}),
		// works version
		dbclient_fetch_update('works', {username: username})
	])
	.then(
		(last_update_versions) => {
			// create composite version for activity request
			req.version = last_update_versions.join('-')
		},
		() => {
			console.log(`debug unable to fetch composite version of user activity ${username}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('error: activity fetch failed: ' + data.error)
					callback(null)
				}
				else {
					callback(data[0])
				}
			},
			error: function(err) {
				console.log('error: activity fetch failed: ' + err.responseText)
				callback(null)
			}
		})
	})
}

function dbclient_fetch_user_records(username, callback) {
	console.log('fetching records for ' + username)
	
	let req = {
		endpoint: 'fetch_user_records',
		args: [username]
	}
	
	dbclient_fetch_update('plays', {
		username: username
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`unable to fetch version of plays ${username}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('error: records fetch failed: ' + data.error)
					callback(null)
				}
				else {
					callback(data[0])
				}
			},
			error: function(err) {
				console.log('error: records fetch failed: ' + err.responseText)
				callback(null)
			}
		})
	})
}

function dbclient_fetch_works(username, callback) {
	console.log('fetching works by ' + username)
	
	let req = {
		endpoint: 'fetch_works',
		args: [username]
	}
	
	dbclient_fetch_update('works', {
		username: username
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`unable to fetch version of works ${username}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('error: works fetch failed: ' + data.error)
					callback(null)
				}
				else {
					callback(data)
				}
			},
			error: function(err) {
				console.log('error: works fetch failed: ' + err.responseText)
				callback(null)
			}
		})
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
	
	sessionclient_db_request('update_user', [username, edits.photo, edits.bio, links, edits.subscribed])
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
			console.log('user update failed: ' + err)
			callback('http')
		})
}

function dbclient_update_works(username, works, callback) {
	console.log('updating ' + works.length + ' works by ' + username)
	
	sessionclient_db_request('update_works', [username, JSON.stringify(works)])
		.then(function(res) {
			if (res.error) {
				console.log('works update failed: ' + res.error)
				callback(res.error)
			}
			else {
				callback({success: res})
			}
		})
		.catch(function(err) {
			console.log('works update failed: ' + err)
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

function dbclient_fetch_work_fragments(work_id, callback) {
	console.log('fetching fragments for work ' + work_id)
	
	let req = {
		endpoint: 'fetch_work_fragments',
		args: [work_id]
	}
	
	dbclient_fetch_update('fragments', {
		work_id: work_id
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`debug unable to fetch version of work fragments ${work_id}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('fragments fetch failed: ' + data.error)
					callback(null)
				}
				else {
					callback(data)
				}
			},
			error: function(err) {
				console.log('fragments fetch failed: ' + err.responseText)
				callback(null)
			}
		})
	})
}

function dbclient_fetch_puzzle_fragments(puzzle_id, callback) {
	console.log('fetching fragments for puzzle ' + puzzle_id)
	
	let req = {
		endpoint: 'fetch_puzzle_fragments',
		args: [puzzle_id]
	}
	
	dbclient_fetch_update('fragments', {
		puzzle_id: puzzle_id
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`debug unable to fetch version of puzzle fragments ${puzzle_id}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('fragments fetch failed: ' + data.error)
					callback(null)
				}
				else {
					callback(data)
				}
			},
			error: function(err) {
				console.log('fragments fetch failed: ' + err.responseText)
				callback(null)
			}
		})
	})
}

function dbclient_fetch_work_text(work_id, callback) {
	console.log('fetching text for work ' + work_id)
	
	let req = {
		endpoint: 'fetch_work_text',
		args: [work_id]
	}
	
	dbclient_fetch_update('works', {
		id: work_id
	})
	.then(
		(last_update) => {
			req.version = last_update
		},
		() => {
			console.log(`unable to fetch version of works ${work_id}; result may be from browser cache`)
		}
	)
	.finally(() => {
		$.get({
			url: '/db',
			data: req,
			success: function(data) {
				if (data.error) {
					console.log('work text fetch failed: ' + data.error)
					callback(null)
				}
				else {
					callback(data)
				}
			},
			error: function(err) {
				console.log('work text fetch failed: ' + err.responseText)
				callback(null)
			}
		})
	})
}

function dbclient_play(username, puzzle_id, duration, callback) {
	console.log('submitting ' + username + ' played ' + puzzle_id)
	
	sessionclient_db_request('play', [username, puzzle_id, duration])
		.then(function(res) {
			if (res.error) {
				console.log('play submission to db failed: ' + res.error)
				callback(res.error)
			}
			else {
				console.log('play success')
				callback()
			}
		})
		.catch(function(err) {
			console.log('play submission to db failed: ' + err)
			callback(err)
		})
}

function dbclient_match_email(username, email, callback) {
	console.log('checking ' + username + ' associated email against ' + email)
	
	let req = {
		endpoint: 'match_email',
		args: [username, email]
	}
	
	$.get({
		url: '/db',
		data: req,
		success: function(data) {
			if (data.error) {
				console.log('email match failed: ' + data.error)
				callback(null)
			}
			else {
				callback(data.length) //positive is array with 1=1, negative is empty array
			}
		},
		error: function(err) {
			console.log('email match failed: ' + err.responseText)
			callback(null)
		}
	})
}