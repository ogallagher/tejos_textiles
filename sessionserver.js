/*

sessionserver.js
Owen Gallagher
28 April 2020

*/

const fs = require('fs')

//config
const SESSION_TTL = 1000*60*60*24*7		// sessions expire in 1 week, specified in ms
const SESSIONS_PATH = './sessions/'		// sessions are stored in this directory

//global vars
const sessionserver_SUCCESS =			0
const sessionserver_STATUS_NO_SESSION =	1
const sessionserver_STATUS_EXPIRE =		2
const sessionserver_STATUS_CREATE_ERR =	3

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

exports.get_session = function(id) {
	let session_file = SESSIONS_PATH + id
	
	fs.readFile(session_file, function(err,data) {
		if (err) {
			//session does not exist
			return sessionserver_STATUS_NO_SESSION
		}
		else {
			let session = JSON.parse(data)
						
			if (expired(session)) {
				//session expired; delete session and notify
				delete_session(id, function(err) {
					if (err) {
						console.log(err)
					}
				})
				
				return sessionserver_STATUS_EXPIRE
			}
			else {
				//session exists and is still valid; update timestamp and return session info
				update_session(id, session, function(err) {
					if (err) {
						console.log(err)
					}
				})
							
				return session
			}
		}
	})
}

//assumes that the user has already been authenticated successfully
exports.create_session = function(session) {
	session.login = new Date().getTime()
	
	fs.writeFile(SESSIONS_PATH + id, JSON.stringify(session), function(err) {
		if (err) {
			return sessionserver_STATUS_CREATE_ERR
		}
		else {
			return sessionserver_SUCCESS
		}
	})
}

//local methods
function clean_sessions() {
	//delete all expired sessions
	fs.readdir(SESSIONS_PATH, function(err,files) {
		if (err) {
			console.log('error: could not list files in ' + SESSIONS_PATH)
		}
		else {
			files.forEach(function(file_name,index) {
				//read session to check if expired
				fs.readFile(file_name, function(err,data) {
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
	
	fs.writeFile('sessions/' + id, JSON.stringify(data_new), function(err) {
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

function expired(session) {
	return (new Date().getTime() - session.login > SESSION_TTL)
}