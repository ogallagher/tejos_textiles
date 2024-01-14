/*

sessionserver.js
Owen Gallagher
28 April 2020

*/

//dependencies
const fs = require('fs')

//local libraries
const enums = require('./enums.js')

//config
const LOCAL_STORAGE_PATH = 'efs'
const SESSIONS_PATH = `${LOCAL_STORAGE_PATH}/sessions/`			//sessions are stored in this directory, accessed from root directory
const ACTIVATIONS_PATH = `${LOCAL_STORAGE_PATH}/activations/`		//activations are stored in this directory
const SESSION_TTL = enums.time.WEEK				//session expiration
const SESSION_CLEANER_DELAY = enums.time.WEEK	//session cleaner runs once per __
const SESSION_SAVER_DELAY = enums.time.HOUR		//session saver runs once per __
const SESSION_CACHE_MAX = 15					//max number of session objects in session_cache

//global vars
const SUCCESS =					10
const STATUS_NO_SESSION =		1
const STATUS_EXPIRE =			2
const STATUS_CREATE_ERR =		3
const STATUS_ENDPOINT_ERR =		4
const STATUS_LOGIN_WRONG = 		5
const STATUS_DB_ERR =			6
const STATUS_DELETE_ERR =		7
const STATUS_FAST =				8
const STATUS_ACTIVATION =		9
const STATUS_XSS_ERR =			11
const STATUS_NO_PLAY =			12
const STATUS_RESET =			13 //session is only to be used to reset an account password
const STATUS_NO_ACTIVATION =	14

exports.SUCCESS =				SUCCESS
exports.STATUS_NO_SESSION =		STATUS_NO_SESSION
exports.STATUS_EXPIRE =			STATUS_EXPIRE
exports.STATUS_CREATE_ERR =		STATUS_CREATE_ERR
exports.STATUS_ENDPOINT_ERR =	STATUS_ENDPOINT_ERR
exports.STATUS_LOGIN_WRONG =	STATUS_LOGIN_WRONG
exports.STATUS_DB_ERR =			STATUS_DB_ERR
exports.STATUS_DELETE_ERR = 	STATUS_DELETE_ERR
exports.STATUS_FAST =			STATUS_FAST
exports.STATUS_ACTIVATION =		STATUS_ACTIVATION
exports.STATUS_XSS_ERR =		STATUS_XSS_ERR
exports.STATUS_NO_PLAY =		STATUS_NO_PLAY
exports.STATUS_RESET =			STATUS_RESET
exports.STATUS_NO_ACTIVATION =	STATUS_NO_ACTIVATION

const ENDPOINT_CREATE = 'create'
const ENDPOINT_VALIDATE = 'validate'
const ENDPOINT_DELETE = 'delete'
const ENDPOINT_DB = 'db' //user wants to access database, but is doing an action that requires authentication
const ENDPOINT_REQUEST_ACTIVATE = 'request_activate'
const ENDPOINT_ACTIVATE = 'activate'
const ENDPOINT_SAVE_PLAY = 'save_play'
const ENDPOINT_RESUME_PLAY = 'resume_play'
const ENDPOINT_RESET_PASSWORD ='reset_password'

exports.ENDPOINT_CREATE = ENDPOINT_CREATE
exports.ENDPOINT_VALIDATE = ENDPOINT_VALIDATE
exports.ENDPOINT_DELETE = ENDPOINT_DELETE
exports.ENDPOINT_DB = ENDPOINT_DB
exports.ENDPOINT_REQUEST_ACTIVATE = ENDPOINT_REQUEST_ACTIVATE
exports.ENDPOINT_ACTIVATE = ENDPOINT_ACTIVATE
exports.ENDPOINT_SAVE_PLAY = ENDPOINT_SAVE_PLAY
exports.ENDPOINT_RESUME_PLAY = ENDPOINT_RESUME_PLAY
exports.ENDPOINT_RESET_PASSWORD = ENDPOINT_RESET_PASSWORD

//private vars
const AUTH_ATTEMPT_MAX = 5
const ACTIVATION_CODE_LEN = 6
const NUM_MIN = 48								//0
const NUM_MAX = 57								//9
const UPPER_MIN = 65							//A
const UPPER_MAX = 90							//Z
const LOWER_MIN = 97							//a
const LOWER_MAX = 122							//z
const NUM_UPPER_GAP = UPPER_MIN-NUM_MAX
const UPPER_LOWER_GAP = LOWER_MIN-UPPER_MAX
const ACTIVATION_CODE_MIN = NUM_MIN
const ACTIVATION_CODE_RANGE = (NUM_MAX-NUM_MIN) + (UPPER_MAX-UPPER_MIN) + (LOWER_MAX-LOWER_MIN) - NUM_UPPER_GAP - UPPER_LOWER_GAP

let session_cache		//see issue https://github.com/ogallagher/tejos_textiles/issues/14 for more info
let session_cleaner
let session_saver

/*

A session object is flexible, allowing for new properties to be added. At most, it will
have the following structure:

{
	login: <timestamp of latest login>,
	partial_plays: [
		{
			puzzle_id: <id of puzzle that was partially played>,
			duration: <play time so far>,
			completes: <ordered array of booleans corresponding to each shape's (in)complete status>
		}
	],
	reset: <password reset code; if set, this session is only valid to reset the account, not to access it>
}

An activation object will have the following structure:

{
	username: <username>,
	code: <code>
}

*/


//global methods
exports.init = function() {
	// create local storage dir
	if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
		fs.mkdirSync(LOCAL_STORAGE_PATH)
		console.log('created local storage directory at ' + LOCAL_STORAGE_PATH)
	}
	
	//create sessions dir
	if (!fs.existsSync(SESSIONS_PATH)) {
	    fs.mkdirSync(SESSIONS_PATH)
		console.log('created sessions directory at ' + SESSIONS_PATH)
	}
	else {
		console.log('found existing sessions directory at ' + SESSIONS_PATH)
		
		//remove expired sessions
		clean_sessions()
	}
	
	//create activations dir
	if (!fs.existsSync(ACTIVATIONS_PATH)) {
		fs.mkdirSync(ACTIVATIONS_PATH)
		console.log('created activations directory at ' + ACTIVATIONS_PATH)
	}
	else {
		console.log('found existing activations directory at ' + ACTIVATIONS_PATH)
	}
	
	//set up session cleaner
	session_cleaner = setInterval(clean_sessions, SESSION_CLEANER_DELAY)
	
	//set up session saver
	session_saver = setInterval(save_sessions, SESSION_SAVER_DELAY)
	
	session_cache = []
}

exports.handle_request = function(endpoint, args, dbserver) {
	//variables for all switch cases
	let session_id
	let username
	let password
	let db_endpoint
	let db_args
	
	return new Promise(function(resolve,reject) {
		switch (endpoint) {
			case ENDPOINT_VALIDATE:
				session_id = args[0]
				username = args[1]
				console.log('validating session ' + session_id + ' for ' + username)
				
				get_session(session_id)
				.then(function(session) {
					if (session_id.reset) {
						//session is given to client to reset user's password; they are not logged in
						reject(STATUS_RESET)
					}
					else {
						//return account summary for login
						dbserver
						.get_query('fetch_user', [username])
						.then(function(action) {
							dbserver.send_query(action.sql, function(err, res) {
								if (err) {
									console.log(err)
									reject(STATUS_DB_ERR)
								}
								else {
									resolve(res[0])
								}
							})
						})
						.catch(function(err) {
							console.log('error: failed to fetch user summary')
							reject(STATUS_DB_ERR)
						})
					}
				})
				.catch(function(error_code) {
					reject(error_code)
				})
				break
			
			case ENDPOINT_CREATE:
				//authenticate user
				username = args[0]
				password = args[1]
				session_id = args[2]
				
				if (args[3]) {
					console.log('registering account for user ' + username)
					
					let email = args[3]
					let subscribed = args[4]
					
					dbserver
					.get_query('register', [username,password,email,subscribed])
					.then(function(action) {
						dbserver.send_query(action.sql, function(err, res) {
							if (err) {
								console.log(err)
								reject(STATUS_CREATE_ERR)
							}
							else {
								resolve({
									register: true,
									username: username,
									email: email,
									subscribed: subscribed
								})
							}
						})
					})
					.catch(function(err) {
						reject(STATUS_CREATE_ERR)
					})
				}
				else {
					console.log('logging in user ' + username)
					
					dbserver
					.get_query('login', [username,password])
					.then(function(action) {
						dbserver.send_query(action.sql, function(err, res) {
							if (err) {
								console.log(err)
								reject(STATUS_CREATE_ERR)
							}
							else {
								let results = res[0][0].result
							
								if (results == 'success') {
									//create session
									create_session(session_id)
										.then(function(session) {
											console.log('login success')
										
											//return account summary
											dbserver
												.get_query('fetch_user', [username])
												.then(function(action) {
													dbserver.send_query(action.sql, function(err, res) {
														if (err) {
															console.log(err)
															reject(STATUS_DB_ERR)
														}
														else {
															console.log('got user summary')
															/*
															server.js will take care of delegation for creating activation code (sessionserver) 
															and sending activation request to client email (emailserver)
															*/															
															resolve(res[0])
														}
													})
												})
												.catch(function(err) {
													console.log('error: failed to fetch user summary')
													reject(STATUS_DB_ERR)
												})
										})
										.catch(function() {
											console.log('error: session write failed')
											reject(STATUS_CREATE_ERR)
										})
								}
								else {
									console.log('login failed')
									reject(STATUS_LOGIN_WRONG)
								}
							}
						})
					})
					.catch(function(err) {
						reject(STATUS_CREATE_ERR)
					})
				}
			
				break
					
			case ENDPOINT_DB:
				session_id = args[0]
				db_endpoint = args[1]
				db_args = []
				for (let i=2; i < args.length; i++) {
					db_args.push(args[i])
				}
				console.log('checking credential ' + session_id + ' for db --> ' + db_endpoint)
				
				get_session(session_id)
				.then(function(session) {
					//pass request through to dbserver
					dbserver.get_query(db_endpoint, db_args)
					.then(function(action) {
						if (action.sql) {
							dbserver.send_query(action.sql, function(err, res) {
								if (err) {
									console.log(err)
									reject(STATUS_DB_ERR)
								}
								else {
									resolve(res)
								}
							})
						}
						else {
							if (action == 'xss') {
								reject(STATUS_XSS_ERR)
							}
						}
					})
					.catch(function(err) {
						console.log(`debug db query not created for ${db_endpoint}: ${err}\n${err.stack}`)
					
						if (err == 'empty') {
							resolve(SUCCESS)
						}
						else {
							reject(STATUS_DB_ERR)
						}
					})
				})
				.catch(function(error_code) {
					reject(error_code)
				})
					
				break
			
			case ENDPOINT_DELETE:
				session_id = args //not args[0] for... reasons
				
				delete_session(session_id, function(err) {
					if (err) {
						console.log(err)
						reject(STATUS_DELETE_ERR)
					}
					else {
						resolve(session_id)
					}
				})
				reject(STATUS_NO_SESSION)
				break
				
			case ENDPOINT_REQUEST_ACTIVATE:
				//send new activation code to user
				username = args //not args[0] because there's only one arg and... post body parser reasons
				console.log('request activate user ' + username)
				
				//get associated email
				dbserver
				.get_query('fetch_user', [username])
				.then(function(action) {
					dbserver.send_query(action.sql, function(err, res) {
						if (err || !res) {
							console.log(err)
							console.log(res)
							reject(STATUS_DB_ERR)
						}
						else {
							if (Array.isArray(res)) {
								res = res[0]
							}
							let email = res.email
							let subscribed = res.subscription[0] == 1
														
							//caller will request activation and send email
							resolve({
								username: username,
								email: email,
								subscribed: subscribed
							})
						}
					})
				})
				break
				
			case ENDPOINT_ACTIVATE:
				//args[0] session id ignored
				username = args[1]
				
				console.log('attempting to activate account ' + username)
				
				get_activation(username)
				.then(function(activation) {
					if (activation.code) {
						if (activation.code == args[2]) {
							console.log(username + ' activation successful!')
							
							//delete activation file
							delete_activation(username)
							
							//update database
							dbserver.get_query('activate', [username])
							.then(function(action) {
								dbserver.send_query(action.sql, function(err) {
									if (err) {
										console.log(err)
										reject(STATUS_DB_ERR)
									}
									else {
										resolve(true)
									}
								})
							})
							.catch(function(err) {
								console.log('error: failed to get db-->activate query')
								reject(STATUS_DB_ERR)
							})
						}
						else {
							console.log('suspicious: incorrect activation code for ' + username)
							reject(STATUS_ACTIVATION)
						}
					}
					else {
						console.log('no code found for username; sending new one')
						//no code found; count as expired code
						reject(STATUS_EXPIRE)
					}
				})
				.catch(function(error_code) {
					//server will take care of creating new session with new code and email
					console.log('no activation request found; sending new activation code')
					reject(STATUS_NO_ACTIVATION)
				})
				
				break
					
			case ENDPOINT_RESET_PASSWORD:
				session_id = args[0]
				username = args[1]
				password_new = args[3]
				
				if (password_new) {
					//finish password reset; validate code and reset password
					code = args[2]
					get_session(session_id)
					.then(function(session) {
						if (session.reset) {
							if (session.reset == code) {
								//password reset code is correct; reset password
								dbserver
								.get_query('reset_password',[username,password_new])
								.then(function(action) {
									dbserver.send_query(action.sql, function(err) {
										if (err) {
											console.log(err)
											reject(STATUS_DB_ERR)
										}
										else {
											//password reset success; remote reset code from session and resolve
											session.reset = null
											resolve()
										}
									})
								})
							}
							else {
								//reset code incorrect
								reject(STATUS_LOGIN_WRONG)
							}
						}
						else {
							//password reset code not found
							reject(STATUS_RESET)
						}
					})
					.catch(function(error_code) {
						//session not found; must have expired
						reject(STATUS_EXPIRE)
					})
				}
				else {
					//request password reset; create code and send email
					reset_code = create_code()
					
					create_session(session_id, reset_code)
					.then(function(session) {
						console.log('[' + session_id + '].reset = ' + reset_code)
						resolve(reset_code)
						//email send handled in server, calling emailserver
					})
					.catch(function(err) {
						console.log('failed to create session ' + session_id + ': ' + err)
						reject(STATUS_CREATE_ERR)
					})
				}
				
				break
					
			case ENDPOINT_SAVE_PLAY:
				session_id = args[0]
				let play = {
					puzzle_id: parseInt(args[1]),
					duration: parseInt(args[2]),
					completes: args[3]
				}
				
				console.log('saving partial play to ' + session_id)
				get_session(session_id)
					.then(function(session) {
						if (!session.partial_plays) {
							session.partial_plays = []
						}
						else {
							//remove existing partial plays for the same puzzle
							for (let p=0; p < session.partial_plays.length; p++) {
								if (session.partial_plays[p].puzzle_id == play.puzzle_id) {
									session.partial_plays.splice(p,1)
									p--
								}
							}
						}
						
						//save partial play to session
						session.partial_plays.push(play)
						resolve(true)
					})
					.catch(function(error_code) {
						//no session found to which to store play
						reject(STATUS_NO_SESSION)
					})
					
				break
					
			case ENDPOINT_RESUME_PLAY:
				session_id = args[0]
				let puzzle_id = args[1]
				
				get_session(session_id)
				.then(function(session) {
					if (session.partial_plays) {
						let pi
						let play = session.partial_plays.find(function(p, i) {
							if (p.puzzle_id == puzzle_id) {
								pi = i
								return true
							}
							else {
								return false
							}
						})
						
						if (play) {
							//remove partial play
							session.partial_plays.splice(pi,1)
							
							//return result
							console.log('retrieved partial play for ' + session_id)
							resolve(play)
						}
						else {
							reject(STATUS_NO_PLAY)
						}
					}
					else {
						reject(STATUS_NO_PLAY)
					}
				})
				.catch(function(error_code) {
					reject(STATUS_NO_SESSION)
				})
				
				break
				
			default:
				console.log('error: invalid session endpoint ' + endpoint)
				reject(STATUS_ENDPOINT_ERR)
		}
	})
}

exports.request_activate = function(username) {
	//create activation code
	let activation_code = create_code()
	
	return new Promise(function(resolve,reject) {
		//create activation with new code
		create_activation(username, activation_code)
		.then(function(activation) {
			console.log('' + username + '\'s code = ' + activation.code)
			resolve(activation_code)
		})
		.catch(function(err) {
			console.log('failed to create session ' + session_id + ': ' + err)
			reject(STATUS_CREATE_ERR)
		})
	})
}

//used to create activation and password reset codes
function create_code() {
	let code = ''
	
	for (let i=0; i < ACTIVATION_CODE_LEN; i++) {
		let char = Math.floor(Math.random() * ACTIVATION_CODE_RANGE) + ACTIVATION_CODE_MIN
		
		if (char > NUM_MAX) {
			char += NUM_UPPER_GAP
			
			if (char > UPPER_MAX) {
				//lowercase
				char += UPPER_LOWER_GAP
			}
			//else, uppercase
		}
		//else, number
		code += String.fromCharCode(char)
	}
	
	return code
}

//local methods
function get_session(id) {
	return new Promise(function(resolve,reject) {
		//check session_cache
		let cached = false
		for (let i=session_cache.length-1; i>=0; i--) {
			if (session_cache[i].id == id) {
				let session = session_cache[i]
				
				if (expired(session.data)) {
					delete_session(id) //remove session file
					session_cache.splice(i,1) //remove from cache
					reject(STATUS_EXPIRE)
				}
				else {
					session.data.login = new Date().getTime() //update session
					resolve(session.data)
				}
				
				cached = true
				break
			}
		}
		
		if (!cached) {
			//check session file
			let session_file = SESSIONS_PATH + id
			fs.readFile(session_file, function(err,data) {
				if (err) {
					//session does not exist
					reject(STATUS_NO_SESSION)
				}
				else {
					try {
						let session = JSON.parse(data)
						
						if (expired(session)) {
							//session expired; delete session and notify to reauthenticate
							delete_session(id)
							reject(STATUS_EXPIRE)
						}
						else {
							//session exists and is still valid; update timestamp
							update_session(id, session)
						
							//cache session
							cache_session(id, session)
						
							//return session info
							resolve(session)
						}
					}
					catch(err) {
						reject(STATUS_FAST)
					}
				}
			})
		}
	})
}

function create_session(session_id, reset_code) {
	let session = {
		login: new Date().getTime()
	}
	if (reset_code) {
		session.reset = reset_code
	}
	
	return new Promise(function(resolve,reject) {
		//create session file
		fs.writeFile(SESSIONS_PATH + session_id, JSON.stringify(session), function(err) {
			if (err) {
				console.log(err)
				reject()
			}
			else {
				resolve(session)
			}
		})
	})
}

function cache_session(id, session) {
	//add to session_cache, don't exceed SESSION_CACHE_MAX
	let cached = session_cache.find(function(si) {
		return si.id == id
	})
	if (!cached) {
		//append
		session_cache.push({
			id: id,
			data: session
		})
		
		while (session_cache.length > SESSION_CACHE_MAX) {
			session_cache.shift() //removes first (oldest) element
		}
	}
	else {
		//replace
		cached.data = session	
	}
}

function delete_session(id,callback) {
	fs.unlink(SESSIONS_PATH + id, function(err) {
		if (err) {
			let message = 'error: session for ' + id + ' failed to be deleted'
			
			if (callback) {
				callback(message)
			}
			else {
				console.log(message)
			}
		}
		else {
			console.log('session ' + id + ' deleted')
			
			if (callback != null) {
				callback()
			}
		}
	})
}

function update_session(id,data_old,callback) {
	let data_new = data_old
	data_new.login = new Date().getTime()
	
	fs.writeFile(SESSIONS_PATH + id, JSON.stringify(data_new), function(err) {
		if (err) {
			let message = 'error: could not update login for session ' + id
			
			if (callback) {
				callback(message)
			}
			else {
				console.log(message)
			}
		}
		else {
			console.log('updated session ' + id + '.login = ' + data_new.login)
		}
	})
}

function clean_sessions() {
	console.log('cleaning sessions')
	//delete all expired sessions
	fs.readdir(SESSIONS_PATH, function(err,files) {
		if (err) {
			console.log('error: could not list files in ' + SESSIONS_PATH)
		}
		else {
			files.forEach(function(file_name,index) {
				//read session to check if expired
				fs.readFile(SESSIONS_PATH + file_name, function(err,data) {
					if (err) {
						console.log('error: could not check expiration of ' + file_name)
					}
					else {
						try {
							let session = JSON.parse(data)
						
							if (expired(session)) {
								fs.unlink(SESSIONS_PATH + file_name, function(err) {
									if (err) {
										console.log('error: failed to remove expired session ' + file_name)
									}
									else {
										console.log('removed expired session ' + file_name)
									}
								})
							}
						}
						catch (err) {
							console.log('skipping candidate session file ' + file_name)
						}
					}
				})
			})
		}
	})
}

function save_sessions() {
	session_cache.forEach(function(session,index) {
		update_session(session.id, session.data)
	})
}

function expired(session) {
	return (new Date().getTime() - session.login > SESSION_TTL)
}

function create_activation(username, code) {
	let activation = {
		username: username,
		code: code
	}
	
	return new Promise(function(resolve,reject) {
		//create session file
		fs.writeFile(ACTIVATIONS_PATH + username, JSON.stringify(activation), function(err) {
			if (err) {
				console.log(err)
				reject()
			}
			else {
				resolve(activation)
			}
		})
	})
}

function get_activation(username) {
	let activation_file = ACTIVATIONS_PATH + username
	
	return new Promise(function(resolve,reject) {
		fs.readFile(activation_file, function(err,data) {
			if (err) {
				//activation does not exist
				reject(STATUS_NO_ACTIVATION)
			}
			else {
				//return activation info
				resolve(JSON.parse(data))
			}
		})
	})
}

function delete_activation(username) {
	fs.unlink(ACTIVATIONS_PATH + username, function(err) {
		if (err) {
			console.log('error: activation for ' + username + ' failed to be deleted')
		}
		else {
			console.log('activation for ' + username + ' deleted')
		}
	})
}