/*

sessionclient.js
Owen Gallagher
29 April 2020

dependencies:
	jquery (for http requests)
	cookies

*/

//config
const SESSION_ID_LEN = 10
const SESSION_ID_CHAR_MIN = 65
const SESSION_ID_CHAR_MAX = 90
const SESSION_ID_CHAR_RANGE = SESSION_ID_CHAR_MAX - SESSION_ID_CHAR_MIN

const SESSION_COOKIE_KEY = 'session_id'
const USERNAME_COOKIE_KEY = 'username'

const URL_SESSIONS = '/sessions'
const ENDPOINT_CREATE = 'create'
const ENDPOINT_VALIDATE = 'validate'
const ENDPOINT_DELETE = 'delete'

function Account(session,username) {
	this.session = session		//session cookie
	this.username = username
	this.email
	this.links = []
	this.subscription = false
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

function sessionclient_create(username,password) {
	let id = new Date().getTime()
	for (let i=0; i<SESSION_ID_LEN; i++) {
		id += String.fromCharCode(Math.floor(Math.random() * SESSION_ID_CHAR_RANGE) + SESSION_ID_CHAR_MIN)
	}
	
	return new Promise(function(resolve,reject) {
		$.post({
			url: URL_SESSIONS,
			data: {
				endpoint: ENDPOINT_CREATE,
				args: [
					username,
					password,
					id
				]
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
					account.enabled = account_info.enabled.data[0]
					account.admin = account_info.admin.data[0]
					
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
						enabled: account_summary.enabled.data[0],
						admin: account_summary.admin.data[0]
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
	return new Promise(function(resolve,reject) {
		$.post({
			url: URL_DELETE,
			data: {
				id: id
			},
			success: function(data) {
				cookies_delete(SESSION_COOKIE_KEY)
				cookies_delete(USERNAME_COOKIE_KEY)
				console.log('session deleted from server and cookies')
				
				resolve()
			},
			error: function(err) {
				console.log('session delete failed: ' + err.responseJSON.message)
				
				reject()
			}
		})
	})
}
