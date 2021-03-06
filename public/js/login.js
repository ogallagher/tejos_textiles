/*

login.js
Owen Gallagher
30 April 2020

Main entrypoint for login.html component

*/

const PASSWORD_MIN = 8
const PASSWORD_MAX = 64

let login = true
let login_on_login	//callback that passes execution to page on login
let login_on_logout	//callback that passes execution to page on logout

$('#username_input').focusout(function(e) {
	validate_username()
})
$('#password_input').focusout(function(e) {
	validate_password()
})
$('#email_input').focusout(function(e) {
	validate_email()
})

//toggle login/register buttons
function toggle_login_register(button) {
	if (button == 'login') {
		login = true
		$('#login_button').removeClass('btn-light').addClass('btn-dark')
		$('#register_button').removeClass('btn-dark').addClass('btn-light')
		$('#login_title').show()
		$('#register_title').hide()
		$('#email_group').hide()
		$('#subscribe_group').hide()
	}
	else {
		login = false
		$('#register_button').removeClass('btn-light').addClass('btn-dark')
		$('#login_button').removeClass('btn-dark').addClass('btn-light')
		$('#register_title').show()
		$('#login_title').hide()
		$('#email_group').show()
		$('#subscribe_group').show()
	}
}

//submit form
function submit_login_register() {
	validate_username().then(function() {
		if (validate_password()) {
			let username = $('#username_input').val()
			let password = $('#password_input').val()
			
			if (login) {
				console.log('logging into account ' + username)
				login_register(username,password)
			}
			else {
				validate_email().then(function() {
					let email = $('#email_input').val()
					let subscribed = $('#subscribe_check').prop('checked')
				
					console.log('creating new account ' + username)
					login_register(username,password,email,subscribed)
				})
			}
		}
	})
}

/*
Sends session create request to server, which authenticates and then
creates a session file. When the session client receives a success
response, the session and username cookies are created and an account
object is created.
*/
function login_register(username, password, email, subscribed) {
	sessionclient_create(username, password, email, subscribed)
		.then(function(account) {
			//hide and reset login form
			$('#login_failed').hide()
			$('#login_modal').modal('hide')
			
			if (login_on_login) {
				login_on_login(account)
			}
		})
		.catch(function(reason) {
			if (reason == 'login') {
				//incorrect credentials
				$('#login_failed').show()
				clear_login_form()
			}
			else {
				//server error
				console.log(reason)
				alert('Login failed due to a server error!')
			}
		})
}

function clear_login_form() {
	$('#username_input').val('').removeClass('is-valid').removeClass('is-invalid')
	$('#password_input').val('').removeClass('is-valid').removeClass('is-invalid')
}

//validate username
function validate_username() {
	let input = $('#username_input')
	let username = input.val()
	
	return new Promise(function(resolve) {
		if (username) {
			if (login) {
				input.removeClass('is-invalid').addClass('is-valid')
				resolve()
			}
			else {
				//check if username taken
				dbclient_user_exists(username, function(taken) {
					if (taken) {
						input.removeClass('is-valid').addClass('is-invalid')
					}
					else {
						input.removeClass('is-invalid').addClass('is-valid')
						resolve()
					}
				})
			}
		}
		else {
			input.removeClass('is-valid').addClass('is-invalid')
		}
	})
}

//validate password
function validate_password() {
	let input = $('#password_input')
	let password = input.val()
	
	if (password && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX) {
		input.removeClass('is-invalid').addClass('is-valid')
		return true
	}
	else {
		input.removeClass('is-valid').addClass('is-invalid')
		return false
	}
}

//validate email (valid against regex and unique)
const regex_email = /.+@.+\..+/
function validate_email() {
	let input = $('#email_input')
	let email = input.val().toLowerCase()
	
	return new Promise(function(resolve) {
		//check regex pattern
		if (email && email.match(regex_email)) {
			//check if email taken
			dbclient_email_exists(email, function(taken) {
				if (taken){
					$('#email_feedback').html('There\'s already an account registered with that email. Try logging in?')
					input.removeClass('is-valid').addClass('is-invalid')
				}
				else {
					input.removeClass('is-invalid').addClass('is-valid')
					resolve()
				}
			})
		}
		else {
			$('#email_feedback').html('Please input a valid email address.')
			input.removeClass('is-valid').addClass('is-invalid')
		}
	})
}

//password reset button
function login_reset_password() {
	//get username for account
	let username = $('#username_input').val()
	if (!username || username.length == 0) {
		username = prompt('Please provide the username for the account you wish to recover.')
	}
	
	if (username && username.length != 0) {
		//confirm account exists and get email
		dbclient_user_exists(username, function(taken) {
			if (taken) {
				//get email for account
				let email = $('#email_input').val()
				if (!email || email.length == 0) {
					email = prompt('Please provide the account\'s associated email address.')
				}
				
				if (email && email.match(regex_email)) {
					//confirm that email matches
					dbclient_match_email(username, email, function(email_match) {
						if (email_match) {
							console.log('email match success')
							
							//generate reset code and send email
							sessionclient_request_reset(username, email)
							.then(function() {
								//confirm email was sent
								alert('Success! A password reset email was sent to the following address: ' + email)
							})
							.catch(function(err) {
								//TODO handle reset error
								console.log('reset request failed: ' + err)
							})
						}
						else {
							//email incorrect
							alert('The given email address does not match the one registered for ' + username)
						}
					})
				}
				else {
					//invalid email; abort
					alert('Valid email address not provided; password reset aborted.')
				}
			}
			else {
				//account not found
				alert(username + ' is not associated with any account, so it should be free to register.')
			}
		})
	}
	//else, abort
}