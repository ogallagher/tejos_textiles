/*
account.js
Owen Gallagher
9 december 2019
*/

let account

window.onload = function() {
	force_https()
	
	//load navbar and footer components
	html_imports('navbar', '#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload()
			
			//assign login callbacks
			login_on_login = account_on_login
			login_on_logout = account_on_logout
			
			//load account
			sessionclient_get_account(account_on_login)
		})
	})
	html_imports('footer','#import_footer')
	
	$('#warning_toast').toast({
		autohide: false
	})
	$('#delete_account').click(function() {
		$('#warning_toast_container').show()
		$('#warning_toast').show().toast('show')
	})
	$('#warning_toast_close').click(function() {
		$('#warning_toast_container').hide()
	})
}

function account_on_login(account_info) {
	if (account_info) {
		//toggle nav account button as account page link or login form
		navbar_toggle_account(account_info)
		
		//get account details
		console.log('getting account details for ' + account_info.username)
		sessionclient_get_account_details()
			.then(function(account_details) {
				account = account_details
				
				if (account) {
					account_on_details()
				}
			})
			.catch(function(err) {
				//this shouldn't really be possible since we just confirmed the session and username
				console.log('error: details fetch: ' + err)
				login_on_logout()
			})
	}
	else {
		console.log('error: no account info')
	}
}

function account_on_logout() {
	console.log('TODO account on logout')
	account = null
}

function account_on_details() {
	//fill account page with db information
	$('#username').html(account.username)
	
	$('#name').hide()
	
	$('#phone').hide()
	
	$('#email').html(account.email).attr('href','mailto:' + account.email)
	
	if (account.links) {
		html_imports('link_row', function(jstring) {
			let links = $('#import_links')
			
			for (let link of account.links) {
				let jlink = $(jstring)
				jlink.find('.link-name').html(link.name)
				jlink.find('.link-link').html(link.link).attr('href',link.link)
				
				links.append(jlink)
			}
		})
	}
}

function account_puzzle_on_complete() {
	console.log('TODO check if logged in')
	
	//TODO if so, update account statistics given new puzzle completion
	
	//TODO else, prompt the user to log in or register
}
