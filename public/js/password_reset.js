/*
password_reset.js
Owen Gallagher
8 Aug 2020
*/

let reset_code_input
let result_output

window.onload = function() {
	force_https()
	
	reset_code_input = $('#reset_code')
	result_output = $('#result')//.hide()
	
	//load username from cookies
	let username = cookies_get(USERNAME_COOKIE_KEY)
	if (username) {
		$('#username').prop('placeholder', username)
		
		$('#reset_password').click(function() {
			let reset_code = reset_code_input.val()
			let new_password = $('#new_password').val()
		
			if (reset_code != '' && new_password != '') {
				sessionclient_reset_password(username,reset_code,new_password)
				.then(function() {
					/*
					The account password was updated successfully and the serverside session has 
					been updated. Proceed by logging in and redirecting to the account page.
					*/
					password_reset_on_login()
				})
				.catch(function(err) {
					console.log('password reset failed: ' + err)
					
					if (err == 'session' || err == 'expired') {
						//session expired or cookie was lost
						alert('Sorry for the inconvenience, but your reset code has expired.')
					}
					else if (err == 'http' || err == 'db' || err == 'endpoint') {
						//server error
						alert('Password reset failed due to a server error :/')
					}
					else if (err == 'reset') {
						//session server does not recognize session as having requested a password reset
						alert('Oops– your session is not associated with a password reset request. Perhaps try again?')
					}
					else if (err == 'login') {
						//incorrect reset code
						alert('The provided reset code ' + reset_code + ' was incorrect.')
					}
				})
			}
			else {
				alert('Reset code or new password not provided')
			}
		})
	}
	else {
		//username cookie not found
		$('#username').prop('placeholder', 'Username cookie not found for password reset')
		
		result_output
			.html('Did you request a password reset using this browser? You may need to request the password reset again; sorry for the inconvenience.')
			.show()
		
		$('#reset_password').prop('disabled',true)
	}
	
	html_imports('navbar','#import_navbar', function() {
		//import login modal
		html_imports('login', '#import_login', function() {
			//enable navbar buttons
			navbar_onload()
			
			//enable login
			navbar_toggle_account()
			
			//assign login callbacks
			login_on_login = password_reset_on_login
		})
	})
}

function password_reset_on_login(account) {
	//switch from password reset session to login session
	cookies_delete(RECOVERY_COOKIE_KEY)
	
	//on successful login, redirect to account page
	result_output.html('Login successful; redirecting to account page').show()
	reset_code_input.prop('disabled', true)
	$('#new_password').prop('disabled', true)
	$('#reset_password').prop('disabled', true)
	
	setTimeout(function() {
		window.location.href = 'account.html'
	}, 2000)
}