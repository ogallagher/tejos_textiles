/*
activate.js
Owen Gallagher
8 May 2020
*/

let activation_code_input
let result_output
let url_code

window.onload = function() {
	force_https()
	
	//attempt to read activation code from url params
	url_code = url_params_get('code')
	
	activation_code_input = $('#activation_code')
	result_output = $('#result').hide()
	
	$('#activate').click(function() {
		let activation_code = activation_code_input.val()
		
		if (activation_code != '') {
			sessionclient_activate(activation_code)
				.then(function() {
					//activation success; redirect to account page
					activation_code_input.val('Success! Redirecting to account page...')
					activation_code_input.prop('disabled',true)
					activation_code_input.addClass('text-raspberry')
					$('#activate').prop('disabled',true)
					
					setTimeout(function() {
						window.location.href = 'account.html'
					}, 2000)
				})
				.catch(function(err) {
					//reset form input
					activation_code_input.val('')
					
					console.log('activation error: ' + err)
					if (err == 'expired') {
						//session not found/expired; activation code expired
						activation_code_input.prop('placeholder','That activation code has expired.')
						result_output.html('Sorry for the inconvenience; the server will send you a new activation code via email momentarily.').show()
					}
					else {
						//activation code incorrect
						activation_code_input.prop('placeholder','That activation code was not correct.')
						result_output.hide()
					}
				})
		}
		else {
			alert('No code given')
		}
	})
	
	//import navbar and footer
	html_imports('navbar','#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload('account')
			
			//assign login callbacks
			login_on_login = activate_on_login
			
			//load account
			sessionclient_get_account(activate_on_login)
		})
	})
	html_imports('footer','#import_footer')
}

function activate_on_login(account) {
	result_output.hide()
	
	if (account) {
		if (account.enabled) {
			$('#activate').prop('disabled',true)
			
			activation_code_input.prop('disabled',true)
			activation_code_input.val('Your account is already activated!')
			activation_code_input.addClass('text-raspberry')
			
			setTimeout(function() {
				window.location.href = 'account.html'
			}, 2000)
		}
		else {
			//session cookie is valid; enable activation code entry
			console.log('activation form enabled')
			
			if (url_code) {
				//code provided in activation link; autofill and submit
				activation_code_input.val(url_code)
				$('#activate').click()
			}
		}
	}
	else {
		//session cookie expired or was not found; log in and request new activation code via email
		console.log('log in for new activation code')
		$('#login_title').html('Log in to activate your account.')
		$('#login_modal').modal('show')
	}
}