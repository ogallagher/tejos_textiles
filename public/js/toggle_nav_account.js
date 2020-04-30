/*

toggle_nav_account.js
Owen Gallagher
30 April 2020

If the user is logged in, the account nav button links to the account.html page.
If the user is anonymous, the account nav button opens a modal component for handling login/register.

*/

function toggle_nav_account(anonymous) {
	let account_button = $('#nav_account')
	
	if (anonymous) {
		account_button.attr('href','#')
		account_button.click(function(event) {
			$('#login_modal').modal('show')
		})
	}
	else {
		account_button.attr('href','account.html')
	}
}