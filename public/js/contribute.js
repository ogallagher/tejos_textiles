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
	
	//control license list
	$('.form-check-copyright')
	.click(function() {
		close_unchecked($(this).attr('id'))
		$(this).addClass('text-copper').addClass('font-weight-bold')
		$('#focus_me').select()
	})
	
	$('.toast').toast({
		autohide: false
	})
	
	//enable submission
	$('#submit').click(function() {
		let title = $('#title').val()
		let content = $('#content').val()
		let description = $('#description').val()
		
		if (title && content) {
			if (title.length > TITLE_MAX) {
				$('#limit_exceeded_message')
				.html('Title length ' + title.length + ' exceeds max of ' + TITLE_MAX + ' characters.')
				
				$('#limit_exceeded')
				.show()
				.toast('show')
			}
			else if (description && description.length > DESCRIPTION_MAX) {
				$('#limit_exceeded_message')
				.html('Description length ' + description.length + ' exceeds max of ' + DESCRIPTION_MAX + ' characters.')
				
				$('#limit_exceeded')
				.show()
				.toast('show')
			}
			else {
				//title, content, description are all valid; submit to db
				let license = $('.form-check-copyright[open]').attr('id').replace('_details','').replace(/_/g,'-')
				let author
				if ($('#credit_username').prop('checked')) {
					author = cookies_get(USERNAME_COOKIE_KEY)
				}
				else {
					author = 'anonymous'
				}
				
				dbclient_contribute(author, string_utils_xss_escape(title), string_utils_xss_escape(content), string_utils_xss_escape(description), license, function(err) {
					let contribution_result_message = $('#contribution_result_message')
					
					if (err) {
						//TODO handle contribution failure
						contribution_result_message.html('Contribution failed :/')
					}
					else {
						contribution_result_message.html('Contribution successful!')
					}
					
					$('#contribution_result').show().toast('show')
				})
			}
		}
		else {
			$('#title_content_required').show().toast('show')
		}
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
