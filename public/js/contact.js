/*
contribute.js
Owen Gallagher
11 october 2019
*/

let loading
let loading_thread
let username

window.onload = function() {
	force_https()
	
	$('.toast').toast({
		autohide: false
	})
	
	loading = $('#loading')
	username = 'unknown'
	
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
			from.prop('placeholder','nobody@nowhere.com').val(null)
			$(this).html('Identified')
		}
		else {
			from.prop('placeholder','someone@somewhere.com')
			$(this).html('Anonymous')
		}
	})
	
	//enable send
	$('#send').click(function() {
		let from = $('#email').val()
		if (!from) {
			//anonymous message
			from = '"Anonymous" contact@textilesjournal.org'
		}
		else {
			from = '"' + username + '" ' + from
		}
		
		let subject = $('#subject').val()
		let message = $('#message').val()
		
		let sending = true
		if (!subject) {
			//must have subject
			$('#subject').addClass('is-invalid')
			sending = false
		}
		if (!message) {
			//must have message
			$('#message').addClass('is-invalid')
			sending = false
		}
		
		if (sending) {
			//send message
			$('.form-control').removeClass('is-invalid')
			
			console.log('sending message from ' + from)
			
			load(true)
			$.post({
				url: '/email',
				data: {
					from: from,
					subject: subject,
					message: message
				},
				success: function(res) {
					load(false)
					
					if (res.error) {
						contact_on_failure(res.error)
					}
					else {
						contact_on_success()
					}
				},
				error: function(err) {
					load(false)
					
					contact_on_failure(err.responseText)
				}
			})
		}
	})
}

function contact_on_login(account_info) {
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account_info)
	username = account_info.username
}

function contact_on_failure(error) {
	$('#send_result_message')
	.html('Send failed! It appears the connection was lost.')
	.removeClass(['text-olive-dark','border-olive-dark'])
	.addClass(['text-raspberry','border-raspberry'])
	
	$('#send_result')
	.show()
	.toast('show')
}

function contact_on_success() {
	$('#send_result_message')
	.html('Message sent successfully! Thank you for contacting us.')
	.removeClass(['text-raspberry','border-raspberry'])
	.addClass(['text-olive-dark','border-olive-dark'])
	
	$('#send_result')
	.show()
	.toast('show')
}

function load(is_loading) {
	if (is_loading) {
		loading.show()
	
		let i = 0
		loading_thread = setInterval(function() {
			loading.css('transform', 'rotate(' + i + 'deg)')
			i -= 5
		}, 25)
	}
	else {
		loading.hide()
		clearInterval(loading_thread)
	}
}