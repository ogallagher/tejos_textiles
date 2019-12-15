/*
account.js
Owen Gallagher
9 december 2019
*/

window.onload = function() {
	//check cookies
	console.log('TODO check cookies for account/session info')
	
	//get account info
	console.log('TODO get account info')
	
	//load navbar and footer components
	html_imports('navbar', '#import_navbar', function() {
		show_nav_page('account')
	})
	html_imports('footer','#import_footer')
}
