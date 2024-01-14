/*

sessionclient.js
Owen Gallagher
29 April 2020

dependencies:
	jquery (for http requests)
	cookies

*/

//config
const SESSION_ID_LEN = 8
const SESSION_ID_CHAR_MIN = 33	//!
const SESSION_ID_CHAR_MAX = 126 //~
const SESSION_ID_CHAR_RANGE = SESSION_ID_CHAR_MAX - SESSION_ID_CHAR_MIN //includes punctuation and alphanumeric chars

const SESSION_COOKIE_KEY = 'session_id'
const USERNAME_COOKIE_KEY = 'username'
const PLAYS_COOKIE_KEY = 'plays'
const RECOVERY_COOKIE_KEY = 'is_password_reset_session'

const URL_SESSIONS = '/sessions'
const ENDPOINT_CREATE = 'create'
const ENDPOINT_VALIDATE = 'validate'
const ENDPOINT_DELETE = 'delete'
const ENDPOINT_DB = 'db'
const ENDPOINT_REQUEST_ACTIVATE = 'request_activate'
const ENDPOINT_ACTIVATE = 'activate'
const ENDPOINT_SAVE_PLAY = 'save_play'
const ENDPOINT_RESUME_PLAY = 'resume_play'
const ENDPOINT_RESET_PASSWORD ='reset_password'

function Account(session,username) {
	this.session = session		//session cookie
	this.username = username
	this.email
	this.links = []
	this.subscribed = false
	this.bio = ''
	this.photo
	this.enabled = false
	this.admin = false
}

//methods
function sessionclient_get_account(callback) {
	//check for session cookie (indicates previous login)
	let session = cookies_get(SESSION_COOKIE_KEY)
	let username = cookies_get(USERNAME_COOKIE_KEY)
	
	if (session && username) {
		if (cookies_get(RECOVERY_COOKIE_KEY)) {
			//the current session is for password reset; the client did not log in
			console.log('found password reset session cookie')
			callback(null)
		}
		else {
			//check if expired
			sessionclient_validate(session,username)
			.then(function(account_summary) {
				//session is valid; return account info
				let account = new Account(session, username)
				account.enabled = account_summary.enabled
				account.admin = account_summary.admin
			
				callback(account)
			})
			.catch(function(err) {
				if (err == 'reset') {
					//session is for password reset; the client did not log in
					cookies_set(RECOVERY_COOKIE_KEY,'1')
					console.log('session is for password reset; updating cookies')
				}
				else {
					//session is invalid/expired; clean cookies
					cookies_delete(SESSION_COOKIE_KEY)
					cookies_delete(USERNAME_COOKIE_KEY)
					console.log('session expired')
				}
				callback(null)
			})
		}
	}
	else {
		console.log('no session cookie found')
		callback(null)
	}
}

function sessionclient_create(username,password,email,subscribed) {
	let id = sessionclient_generate_session_id()
	
	let args = [username,password,id]
	if (email) {
		//register
		args.push(email)
		args.push(subscribed)
	}
	//else, log in
	
	return new Promise(function(resolve,reject) {
		$.post({
			url: URL_SESSIONS,
			data: {
				endpoint: ENDPOINT_CREATE,
				args: args
			},
			success: function(data) {
				if (data.error) {
					console.log('session creation failed: ' + data.error)
					reject(data.error)
				}
				else {
					console.log('session ' + id + ' created successfully')
					cookies_set(SESSION_COOKIE_KEY, id)
					cookies_set(USERNAME_COOKIE_KEY, username)
					
					let account_info = data.success
					
					let account = new Account(id, username)
					
					if (account_info.register) {
						//register info from sessionserver
						account.enabled = false
						account.email = account_info.email
						account.subscribed = account_info.subscribed
					}
					else {
						//login info from dbserver
						account.enabled = account_info.enabled.data[0]
						account.admin = account_info.admin.data[0]
						//subscription and email are also returned on login, but are ignored
					}
					
					resolve(account)
				}
			},
			error: function(err) {
				console.log('session creation failed: ' + err.responseText)
				reject(err.responseText)
			}
		})
	})
}

function sessionclient_validate(id,username) {
	return new Promise(function(resolve,reject) {
		$.post({
			url: URL_SESSIONS,
			data: {
				endpoint: ENDPOINT_VALIDATE,
				args: [
					id,
					username
				]
			},
			success: function(data) {
				if (data.success) {
					let account_summary = data.success
					
					resolve({
						enabled: (account_summary.enabled.data[0] == 1),
						admin: (account_summary.admin.data[0] == 1)
					})
				}
				else {
					console.log('session validation failed: ' + data.error)
					reject(data.error)
				}
			},
			error: function(err) {
				console.log('session validation failed: ' + err.responseJSON.message)
				
				reject(err.responseJSON.message)
			}
		})
	})
}

function sessionclient_logout(id) {
	return new Promise(function(resolve) {
		if (id) {
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_DELETE,
					args: [
						id
					]
				},
				success: function(data) {
					cookies_delete(SESSION_COOKIE_KEY)
					cookies_delete(USERNAME_COOKIE_KEY)
					console.log('session deleted from server and cookies')
					
					if (resolve) {
						resolve()
					}
				},
				error: function(err) {
					console.log('session delete failed: ' + err.responseJSON.message)
				}
			})
		}
		else {
			cookies_delete(USERNAME_COOKIE_KEY)
			
			if (resolve) {
				resolve()
			}
		}
	})
}

function sessionclient_partial_play(play) {
	let session_id = cookies_get(SESSION_COOKIE_KEY)
	
	return new Promise(function(resolve, reject) {
		if (session_id) {
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_SAVE_PLAY,
					args: [
						session_id,
						play.puzzle_id,
						play.duration,
						play.completes
					]
				},
				success: function(res) {
					if (res.error) {
						console.log('partial play not saved: ' + res.error)
						reject() //error
					}
					else {
						console.log('partial play successfully saved to session')
						resolve(true) //did save
					}
				},
				error: function(err) {
					console.log('partial play not saved: ' + err.responseJSON.message)
					reject() //error
				}
			})
		}
		else {
			resolve(false) //did not save, no errors
		}	
	})
}

function sessionclient_resume_partial_play(puzzle_id) {
	let session_id = cookies_get(SESSION_COOKIE_KEY)
	
	return new Promise(function(resolve) {
		if (session_id) {
			console.log('resuming partial play of ' + puzzle_id)
			
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_RESUME_PLAY,
					args: [
						session_id,
						puzzle_id
					]
				},
				success: function(data) {
					if (data.error) {
						console.log('partial play not recovered: ' + data.error)
					}
					else {
						resolve(data.success)
					}
				},
				error: function(err) {
					console.log('partial play not recovered: ' + err.responseJSON.message)
				}
			})
		}
	})
}

/**
 * Some database actions require passing through the session server for authentication against the session_id 
 * before the db can be accessed.
 * 
 * @param {string} db_endpoint Database API endpoint name.
 * @param {string[]} db_args List of arguments, ordered according to the db endpoint.
 * @param {string?} version Optional request version.
 */ 
function sessionclient_db_request(db_endpoint, db_args, version) {
	return new Promise(function(resolve,reject) {
		let session_id = cookies_get(SESSION_COOKIE_KEY)
	
		if (session_id) {
			let args = [session_id, db_endpoint]
			for (let db_arg of db_args) {
				args.push(db_arg)
			}
			
			let data = {
				endpoint: ENDPOINT_DB,
				args: args
			}
			if (version !== undefined) {
				data.version = version
			}
			
			$.post({
				url: URL_SESSIONS,
				data: data,
				success: function(data) {
					if (data.success) {
						resolve(data.success)
					}
					else {
						if (data.error == 'null' || data.error == 'expired') {
							//no valid session found for this user on the server; login again
							cookies_delete(SESSION_COOKIE_KEY)
							cookies_delete(USERNAME_COOKIE_KEY)
							reject('login')
						}
						else {
							reject(data.error)
						}
					}
				},
				error: function(err) {
					reject('http')
				}
			})
		}
		else {
			reject('login')
		}
	})
}

function sessionclient_activate(activation_code) {
	return new Promise(function(resolve,reject) {
		let session_id = cookies_get(SESSION_COOKIE_KEY)
		let username = cookies_get(USERNAME_COOKIE_KEY)
		
		if (session_id && username) {
			let args = [session_id, username, activation_code]
			
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_ACTIVATE,
					args: args
				},
				success: function(data) {
					if (data.success) {
						resolve()
					}
					else {
						reject(data.error)
					}
				},
				error: function(err) {
					reject('http')
				}
			})
		}
		else {
			reject('session')
		}
	})
}

function sessionclient_request_activate() {
	let session_id = cookies_get(SESSION_COOKIE_KEY)
	let username = cookies_get(USERNAME_COOKIE_KEY)
	
	return new Promise(function(resolve,reject) {
		if (session_id && username) {
			let args = [username]
			
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_REQUEST_ACTIVATE,
					args: args
				},
				success: function(data) {
					if (data.success) {
						resolve()
					}
					else {
						reject(data.error)
					}
				}
			})
		}
		else {
			reject('session')
		}
	})
}

function sessionclient_delete(username) {
	return new Promise(function(resolve,reject) {
		//mark person in db as deleted
		sessionclient_db_request('delete_user', [username])
		.then(function(res) {
			//delete cookies
			cookies_delete(SESSION_COOKIE_KEY)
			cookies_delete(USERNAME_COOKIE_KEY)
			resolve()
		})
		.catch(function(err) {
			console.log('account deletion failed: ' + err)
			reject(err)
		})
	})
}

function sessionclient_recover(username) {
	return new Promise(function(resolve,reject) {
		//mark person in db as not deleted
		sessionclient_db_request('recover_user', [username])
		.then(function(res) {
			resolve()
		})
		.catch(function(err) {
			console.log('account recovery failed: ' + err)
			reject(err)
		})
	})
}

function sessionclient_request_reset(username, email) {
	return new Promise(function(resolve,reject) {
		session_id = cookies_get(SESSION_COOKIE_KEY)
		
		function request_reset_logged_out() {
			/*
			Create session for account and "log in", storing the reset code 
			server-side. This session will only be valid to complete the 
			password reset, and not to access any of this account's data.
			*/
			session_id = sessionclient_generate_session_id()
			
			//add reset session to cookies
			cookies_set(SESSION_COOKIE_KEY, session_id)
			cookies_set(USERNAME_COOKIE_KEY, username)
			cookies_set(RECOVERY_COOKIE_KEY, '1')
			
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_RESET_PASSWORD,
					args: [session_id, username, email]
				},
				success: function(result) {
					if (result.success) {
						resolve()
					}
					else {
						reject(result.error)
					}
				},
				error: function(err) {
					reject('http')
				}
			})
		}
		
		if (session_id) {
			//log out of current session
			sessionclient_logout(session_id)
			.then(request_reset_logged_out)
		}
		else {
			request_reset_logged_out()
		}
	})
}

//update the account's password in the database
function sessionclient_reset_password(username, reset_code, password) {
	let session_id = cookies_get(SESSION_COOKIE_KEY)
	
	return new Promise(function(resolve,reject) {
		if (session_id) {
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_RESET_PASSWORD,
					args: [session_id, username, reset_code, password]
				},
				success: function(data) {
					if (data.success) {
						resolve()
					}
					else {
						reject(data.error)
					}
				},
				error: function(err) {
					reject('http')
				}
			})
		}
		else {
			reject('session')
		}
	})
}

//returns a timestamp concatenated with a randomly generated 8-char string
function sessionclient_generate_session_id() {
	let session_id = new Date().getTime()
	
	for (let i=0; i < SESSION_ID_LEN; i++) {
		let char = String.fromCharCode(Math.floor(Math.random() * SESSION_ID_CHAR_RANGE) + SESSION_ID_CHAR_MIN)
		
		if (char != '/') {
			//non-path delim chars
			if (/[\\`'"<>{}$#&;=\[\]|]/.test(char)) {
				//escape special chars
				char = '\\' + char
			}
			
			session_id += char
		}
	}
	
	return session_id
}
