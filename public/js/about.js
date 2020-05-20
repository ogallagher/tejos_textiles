/*
contribute.js
Owen Gallagher
15 October 2019
*/

window.onload = function() {
	force_https()
	
	//import navbar
	html_imports('navbar', '#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload('about')
			
			//assign login callbacks
			login_on_login = about_on_login
		
			//load account
			sessionclient_get_account(about_on_login)
		})
	})
	
	//import footer
	html_imports('footer','#import_footer')
}

function about_on_login(account_info) {
	navbar_toggle_account(account_info)
}
