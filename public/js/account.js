/*
account.js
Owen Gallagher
9 december 2019
*/

window.onload = function() {
	//check cookies
	console.log('TODO check cookies for account/session info')
	
	//get account info
	dbclient_onload.then(function() {
		console.log('TODO get account info')
	})
	
	html_imports('navbar','#import_navbar')
	html_imports('footer','#import_footer')
}
