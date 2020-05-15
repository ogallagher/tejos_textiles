/*

navbar.js
Owen Gallagher
4 May 2020

*/

function navbar_onload(page) {
	if (page) {
		//disable page nav button
		let navbtn = $('#nav_' + page)
		
		if (navbtn) {
			navbtn.removeClass('btn-outline-dark')
			navbtn.addClass('btn-dark').addClass('disabled')
		}
	}
	
	$('#nav_account_profile').click(function(event) {
		window.location.href = 'account.html'
	})
	
	$('#nav_account_logout').click(function(event) {
		let session_id = cookies_get(SESSION_COOKIE_KEY)
		
		if (session_id) {
			sessionclient_logout(session_id)
				.then(function() {
					//session deleted from server and client cookies; ready to re-enable login
					navbar_toggle_account(null)
				
					//pass execution to page to clean up evidence of user info
					login_on_logout()
				})
		}
		else {
			//same as above, but session in the case that the session has already deleted (manually deleting cookies, deleting account, etc)
			navbar_toggle_account(null)
			login_on_logout()
		}
	})
}

/*
If the user is logged in, the account nav button links to the account.html page.
If the user is anonymous, the account nav button opens a modal component for handling login/register.
*/

function navbar_toggle_account(account) {
	let account_button = $('#nav_account')
	
	if (account == null) {
		console.log('enable login')
		
		//enable login/register form
		account_button.click(function(event) {
			$('#login_modal').modal('show')
		})
		
		//clear button name to ACCOUNT
		account_button.html('ACCOUNT')
		
		//disable account actions dropdown
		$('#nav_account_dropdown').addClass('d-none')
	}
	else {
		console.log('disable login')
		
		//disable login/register form
		account_button.unbind('click')
				
		//customize button name
		account_button.html(account.username)
		
		//enable account actions dropdown
		$('#nav_account_dropdown').removeClass('d-none')
	}
}