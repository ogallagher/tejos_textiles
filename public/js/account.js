/*
account.js
Owen Gallagher
9 december 2019
*/

let account

window.onload = function() {
	//TODO check cookies
	console.log('TODO check cookies for account/session info')
	
	if (account == null) {
		account_get_account() //basic account information
	}
	
	account_get_stats() //activity and records
	
	//load navbar and footer components
	html_imports('navbar', '#import_navbar', function() {
		navbar_onload('account')
	})
	html_imports('footer','#import_footer')
}

function account_get_account() {
	console.log('TODO get account info')
	
	account = {
		username: 'tbd',
		email: 'tbd',
		links: [],
		subscription: 'tbd',
		bio: 'tbd',
		photo: 'tbd'
	}
}

function account_get_stats() {
	console.log('TODO get latest activity')
	
	console.log('TODO get all existent records for the user; fastest completion per puzzle')
}

function account_puzzle_on_complete() {
	console.log('TODO check if logged in')
	
	//TODO if so, update account statistics given new puzzle completion
	
	//TODO else, prompt the user to log in or register
}
