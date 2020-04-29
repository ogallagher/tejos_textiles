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

const URL_CREATE = '/create_session'
const URL_VALIDATE = '/validate_session'
const URL_DELETE = '/delete_session'

//methods
function sessionclient_create(callback) {
	let id = new Date().getTime()
	for (let i=0; i<SESSION_ID_LEN; i++) {
		id += String.fromCharCode(Math.floor(Math.random() * SESSION_ID_CHAR_RANGE) + SESSION_ID_CHAR_MIN)
	}
	
	$.get({
		url: URL_CREATE,
		data: {
			id: id
		},
		success: function() {
			console.log('session ' + id + ' created')
			cookie_set('session_id',id)
			
			callback()
		},
		error: function(err) {
			console.log('session creation failed:' + err.message)
		}
	})
}

function sessionclient_validate() {
	return new Promise(function(resolve,reject) {
		$.get({
			url: URL_VALIDATE,
			data: {
				id: cookie_get('session_id')
			},
			success: function(data) {
				let session = JSON.parse(data)
				
				console.log('session valid: last login = ' + session.login)
				
				resolve(session)
			},
			error: function(err) {
				console.log('session validation failed: ' + err.responseJSON.message)
				
				reject(err.responseJSON.message)
			}
		})
	})
}

function sessionclient_logout() {
	$.get({
		url: URL_DELETE,
		data: {
			id: cookie_get(SESSION_COOKIE_KEY)
		},
		success: function(data) {
			cookie_delete(SESSION_COOKIE_KEY)
			cookie_delete(USERNAME_COOKIE_KEY)
			console.log('session deleted from server and cookies')
		},
		error: function(err) {
			console.log('session delete failed: ' + err.responseJSON.message)
		}
	})
}
