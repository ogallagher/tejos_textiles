/*

login.js
Owen Gallagher
30 April 2020

Main entrypoint for login.html component

*/

const PASSWORD_MIN = 8
const PASSWORD_MAX = 64

let login = true

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
				$('#login_modal').modal('hide')
				console.log('logging into account ' + username)
				sessionclient_login(username,password)
			}
			else if (validate_email()) {
				let email = $('#email_input').val()
				let subscribed = $('#subscribe_check').prop('checked')
			
				$('#login_modal').modal('hide')
				console.log('creating new account ' + username)
			}
		}
	})
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

//validate email
const regex_email = /.+@.+\..+/
function validate_email() {
	let input = $('#email_input')
	let email = input.val()
	
	if (email && email.match(regex_email)) {
		input.removeClass('is-invalid').addClass('is-valid')
		return true
	}
	else {
		input.removeClass('is-valid').addClass('is-invalid')
		return false
	}
}