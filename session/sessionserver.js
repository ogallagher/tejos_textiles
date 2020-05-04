/*

sessionserver.js
Owen Gallagher
28 April 2020

*/

const fs = require('fs')

//config
const SESSION_TTL = 1000*60*60*24*7		// sessions expire in 1 week, specified in ms
const SESSIONS_PATH = 'session/sessions/'		// sessions are stored in this directory, accessed from root directory

//global vars
const SUCCESS =				0
const STATUS_NO_SESSION =	1
const STATUS_EXPIRE =		2
const STATUS_CREATE_ERR =	3
const STATUS_ENDPOINT_ERR =	4
const STATUS_LOGIN_WRONG = 	5
const STATUS_DB_ERR =		6
const STATUS_DELETE_ERR =	7

exports.SUCCESS =				SUCCESS
exports.STATUS_NO_SESSION =		STATUS_NO_SESSION
exports.STATUS_EXPIRE =			STATUS_EXPIRE
exports.STATUS_CREATE_ERR =		STATUS_CREATE_ERR
exports.STATUS_ENDPOINT_ERR =	STATUS_ENDPOINT_ERR
exports.STATUS_LOGIN_WRONG =	STATUS_LOGIN_WRONG
exports.STATUS_DB_ERR =			STATUS_DB_ERR
exports.STATUS_DELETE_ERR = 	STATUS_DELETE_ERR

//private vars
const ENDPOINT_CREATE = 'create'
const ENDPOINT_VALIDATE = 'validate'
const ENDPOINT_DELETE = 'delete'
const ENDPOINT_DB = 'db' //user wants to access database, but is doing an action that requires authentication

//global methods
exports.init = function() {
	//create sessions dir
	if (!fs.existsSync(SESSIONS_PATH)) {
	    fs.mkdirSync(SESSIONS_PATH);
		console.log('created sessions directory at ' + SESSIONS_PATH)
	}
	else {
		console.log('found existing sessions directory at ' + SESSIONS_PATH)
		
		//remove expired sessions
		clean_sessions()
	}	
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
					.catch(function(error_core) {
						reject(error_code)
					})
				break
			
			case ENDPOINT_DELETE:
				//TODO support session deletion on logout
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

function get_session(id) {
	let session_file = SESSIONS_PATH + id
	
	return new Promise(function(resolve,reject) {
		fs.readFile(session_file, function(err,data) {
			if (err) {
				//session does not exist
				reject(STATUS_NO_SESSION)
			}
			else {
				let session = JSON.parse(data)
						
				if (expired(session)) {
					//session expired; delete session and notify to reauthenticate
					delete_session(id, function(err) {
						if (err) {
							console.log(err)
						}
					})
				
					reject(STATUS_EXPIRE)
				}
				else {
					//session exists and is still valid; update timestamp and return session info
					update_session(id, session, function(err) {
						if (err) {
							console.log(err)
						}
					})
					
					resolve(session)
				}
			}
		})
	})
}

function create_session(session_id) {
	let session = {
		login: new Date().getTime()
	}
	
	return new Promise(function(resolve,reject) {
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
			
			if (callback != null) {
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

//local methods
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
						let session = JSON.parse(data)
						
						if (expired(session)) {
							fs.unlink(file_name, function(err) {
								if (err) {
									console.log('error: failed to remove expired session ' + file_name)
								}
								else {
									console.log('removed expired session ' + file_name)
								}
							})
						}
					}
				})
			})
		}
	})
}

function update_session(id,data_old,callback) {
	let data_new = data_old
	data_new.login = new Date().getTime()
	
	fs.writeFile(SESSIONS_PATH + id, JSON.stringify(data_new), function(err) {
		if (err) {
			let message = 'error: could not update login for session ' + id
			
			if (callback != null) {
				callback(message)
			}
			else {
				console.log(message)
			}
		}
		else {
			console.log('updated session_' + id + '.login = ' + data_new.login)
		}
	})
}

function expired(session) {
	return (new Date().getTime() - session.login > SESSION_TTL)
}