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

const URL_SESSIONS = '/sessions'
const ENDPOINT_CREATE = 'create'
const ENDPOINT_VALIDATE = 'validate'
const ENDPOINT_DELETE = 'delete'
const ENDPOINT_DB = 'db'
const ENDPOINT_ACTIVATE = 'activate'

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
				//session is invalid/expired; clean cookies
				cookies_delete(SESSION_COOKIE_KEY)
				cookies_delete(USERNAME_COOKIE_KEY)
				console.log('session expired')
				callback(null)
			})
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
				
					resolve()
				},
				error: function(err) {
					console.log('session delete failed: ' + err.responseJSON.message)
				}
			})
		}
		else {
			cookies_delete(USERNAME_COOKIE_KEY)
		}
	})
}

/*
some database actions require passing through the session server for authentication against the session_id
before the db can be accessed
*/
function sessionclient_db_request(db_endpoint, db_args) {
	return new Promise(function(resolve,reject) {
		let session_id = cookies_get(SESSION_COOKIE_KEY)
	
		if (session_id) {
			let args = [session_id, db_endpoint]
			for (let db_arg of db_args) {
				args.push(db_arg)
			}
			
			$.post({
				url: URL_SESSIONS,
				data: {
					endpoint: ENDPOINT_DB,
					args: args
				},
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

function sessionclient_update_account(edits) {
	console.log('TODO submit account update')
	console.log(edits)
}

//returns a timestamp concatenated with a randomly generated 8-char string
function sessionclient_generate_session_id() {
	let session_id = new Date().getTime()
	
	for (let i=0; i<SESSION_ID_LEN; i++) {
		let char = String.fromCharCode(Math.floor(Math.random() * SESSION_ID_CHAR_RANGE) + SESSION_ID_CHAR_MIN)
		
		if (char != '/' && char != '\\') {
			//char is valid; is not a path delimiter
			session_id += char
		}
	}
	
	return session_id
}
