/*
contribute.js
Owen Gallagher
11 october 2019
*/

const DESCRIPTION_MAX = 255 //max char count for a work description
const TITLE_MAX = 127 //max char count for a work title

window.onload = function() {
	force_https()
	
	html_imports('navbar', '#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload('contribute')
			
			//assign login callbacks
			login_on_login = contribute_on_login
			login_on_logout = contribute_on_logout
			
			//log in
			sessionclient_get_account(contribute_on_login)
		})
	})
	
	$('.form-check-copyright')
	.click(function() {
		close_unchecked($(this).attr('id'))
		$(this).addClass('text-copper').addClass('font-weight-bold')
		$('#focus_me').select()
	})
	
	$('#login_required').toast({
		autohide: false
	})
	
	html_imports('footer','#import_footer')
}

function contribute_on_login(account_info) {
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account_info)
	
	if (account_info) {
		//enable contribution form
		$('.work-input').prop('disabled',false)
		
		//hide login required message
		$('#login_required').toast('hide')
	}
	else {
		contribute_on_logout()
	}
}

function contribute_on_logout() {
	//disable contribution form
	$('.work-input').prop('disabled',true)
	
	//show login required message
	$('#login_required').show().toast('show')
}

/*
ties details.open to input.checked
*/
function close_unchecked(details_id) {
	$('details:not(' + details_id + ').form-check-copyright')
	.prop('open',false)
	.removeClass('text-copper')
	.removeClass('font-weight-bold')
}
