/*
contribute.js
Owen Gallagher
11 october 2019
*/

window.onload = function() {
	force_https()
	
	//import navbar
	html_imports('navbar', '#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload('contact')
		
			//assign login callback
			login_on_login = contact_on_login
		
			//load account
			sessionclient_get_account(contact_on_login)
		})
	})
	
	//import footer
	html_imports('footer','#import_footer')
	
	//enable anonymous button
	$('#from_anonymous').click(function() {
		let from = $('#email')
		let anonymous = !from.prop('disabled')
		from.prop('disabled',anonymous)
		
		if (anonymous) {
			from.prop('placeholder','nobody@nowhere.com')
			$(this).html('Identified')
		}
		else {
			from.prop('placeholder','someone@somewhere.com')
			$(this).html('Anonymous')
		}
	})
}

function contact_on_login(account_info) {
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account_info)
	
	if (account_info) {
		//can't use account email without getting more info from db
		$('#email').prop('placeholder', account_info.username + '@somewhere.com')
	}
}

function contact_on_logout() {
	
}