/*

sessionserver.js
Owen Gallagher
28 April 2020

*/

//dependencies
const fs = require('fs')

//local libraries
const enums = require('../enums.js')

//config
const SESSIONS_PATH = 'session/sessions/'		//sessions are stored in this directory, accessed from root directory
const SESSION_TTL = enums.time.WEEK				//session expiration
const SESSION_CLEANER_DELAY = enums.time.WEEK	//session cleaner runs once per __
const SESSION_SAVER_DELAY = enums.time.HOUR		//session saver runs once per __
const SESSION_CACHE_MAX = 15					//max number of session objects in session_cache

//global vars
const SUCCESS =				0
const STATUS_NO_SESSION =	1
const STATUS_EXPIRE =		2
const STATUS_CREATE_ERR =	3
const STATUS_ENDPOINT_ERR =	4
const STATUS_LOGIN_WRONG = 	5
const STATUS_DB_ERR =		6
const STATUS_DELETE_ERR =	7
const STATUS_FAST =			8

exports.SUCCESS =				SUCCESS
exports.STATUS_NO_SESSION =		STATUS_NO_SESSION
exports.STATUS_EXPIRE =			STATUS_EXPIRE
exports.STATUS_CREATE_ERR =		STATUS_CREATE_ERR
exports.STATUS_ENDPOINT_ERR =	STATUS_ENDPOINT_ERR
exports.STATUS_LOGIN_WRONG =	STATUS_LOGIN_WRONG
exports.STATUS_DB_ERR =			STATUS_DB_ERR
exports.STATUS_DELETE_ERR = 	STATUS_DELETE_ERR
exports.STATUS_FAST =			STATUS_FAST

const ENDPOINT_CREATE = 'create'
const ENDPOINT_VALIDATE = 'validate'
const ENDPOINT_DELETE = 'delete'
const ENDPOINT_DB = 'db' //user wants to access database, but is doing an action that requires authentication

exports.ENDPOINT_CREATE = ENDPOINT_CREATE
exports.ENDPOINT_VALIDATE = ENDPOINT_VALIDATE
exports.ENDPOINT_DELETE = ENDPOINT_DELETE
exports.ENDPOINT_DB = ENDPOINT_DB

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

//global methods
exports.init = function() {
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
				for (let i=2; i<args.length; i++) {
					db_args.push(args[i])
				}
				
				console.log('checking credential ' + session_id + ' for db --> ' + db_endpoint)
				
				get_session(session_id)
					.then(function(session) {
						//pass request through to dbserver
						dbserver.get_query(db_endpoint, db_args)
							.then(function(action) {
								dbserver.send_query(action.sql, function(err, res) {
									if (err) {
										console.log(err)
										reject(STATUS_DB_ERR)
									}
									else {
										resolve(res)
									}
								})
							})
							.catch(function(err) {
								console.log(err.responseText)
								reject(STATUS_DB_ERR)
							})
					})
					.catch(function(error_code) {
						reject(error_code)
					})
					
				break
			
			case ENDPOINT_DELETE:
				session_id = args[0]
				
				console.log('deleting session')
				
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
				
			default:
				console.log('error: invalid session endpoint ' + endpoint)
				reject(STATUS_ENDPOINT_ERR)
		}
	})
}

exports.request_activate = function(session_id) {
	//create activation code
	let activation_code = ''
	for (let i=0; i<ACTIVATION_CODE_LEN; i++) {
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
		activation_code += String.fromCharCode(char)
	}
	
	return new Promise(function(resolve,reject) {
		//create session with new activation code
		create_session(session_id, activation_code)
			.then(function(session) {
				console.log('[' + session_id + '].code = ' + session.code)
				resolve(activation_code)
			})
			.catch(function(err) {
				console.log('failed to create session ' + session_id + ': ' + err)
				reject(STATUS_CREATE_ERR)
			})
	})
}

//local methods
function get_session(id) {
	return new Promise(function(resolve,reject) {
		//check session_cache
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
			}
		}
		
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
						
						//add to session_cache, don't exceed SESSION_CACHE_MAX
						session_cache.push({
							id: id,
							data: session
						})
						while (session_cache.length > SESSION_CACHE_MAX) {
							session_cache.shift() //removes first (oldest) element
						}
						
						//return session info
						resolve(session)
					}
				}
				catch(err) {
					reject(STATUS_FAST)
				}
			}
		})
	})
}

function create_session(session_id, activation_code) {
	let session = {
		login: new Date().getTime()
	}
	if (activation_code) {
		session.code = activation_code
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

function delete_session(id,callback) {
	fs.unlink(SESSION_PATH + id, function(err) {
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