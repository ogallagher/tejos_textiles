/*
contribute.js
Owen Gallagher
11 october 2019
*/

window.onload = function() {
	force_https()
	
	html_imports('navbar', '#import_navbar', function() {
		navbar_onload('contact')
	})
	
	html_imports('footer','#import_footer')
}