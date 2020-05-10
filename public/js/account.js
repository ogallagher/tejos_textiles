/*
account.js
Owen Gallagher
9 december 2019
*/

let account
let editing = false
let edits = {}
let edit_links_rows = 0

const ACCOUNT_PHOTO_SIZE = 460 //somewhat arbitrary, based on github profile photo size

window.onload = function() {
	force_https()
	
	//enable bootstrap tooltips
	$('[data-toggle="tooltip"]').tooltip({
		placement: 'auto',
		delay: {
			show: 500,
			hide: 100
		}
	})
	
	//load navbar and footer components
	html_imports('navbar', '#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload()
			
			//assign login callbacks
			login_on_login = account_on_login
			login_on_logout = account_on_logout
			
			//log in
			sessionclient_get_account(account_on_login)
		})
	})
	html_imports('footer','#import_footer')
	
	$('#warning_toast').toast({
		autohide: false
	})
	$('#delete_account').click(function() {
		$('#warning_toast_container').show()
		$('#warning_toast').show().toast('show')
	})
	$('#warning_toast_close').click(function() {
		$('#warning_toast_container').hide()
	})
}

function account_on_login(account_info) {
	account = account_info
	
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account)
	
	let visiting_account = url_params_get('username')
	let username
	
	if (account) {
		if (!visiting_account || visiting_account == account.username) {
			//enable own account edits
			username = account_info.username
			account_enable_edits()
		}
		else {
			//load foreign account edits
			username = visiting_account
		}
	}
	else if (!visiting_account) {
		//not signed in; prompt login to view and edit own info
		$('#login_modal').modal('show')
	}
	else {
		//load foreign account edits without logging in
		username = visiting_account
	}
	
	if (username) {
		//get account details
		dbclient_fetch_user(username, function(account_details) {
			if (account_details) {
				if (account && account_details.username == account.username) {
					//update account since its mine
					account = account_details
				}
			
				account_on_details(account_details)
			}
			else {
				console.log('error: user fetch failed')
				alert('Server error: unable to fetch details for user ' + username + '.\nRedirecting to home page...')
				setTimeout(function() {
					window.location.href = 'index.html'
				}, 2000)
			}
		})
	}
}

function account_on_logout() {
	console.log('TODO account on logout')
	account = null
	account_disable_edits()
}

function account_on_details(details) {
	//fill account page with account information
	$('#username').html(details.username)
	
	if (details.name) {
		//TODO include name?
		$('#name').hide()
	}
	else {
		$('#name').hide()
	}
	
	if (details.phone) {
		//TODO include phone?
		$('#phone').hide()
	}
	else {
		$('#phone').hide()
	}
	
	$('#email').html(details.email).prop('href','mailto:' + details.email)
	
	if (details.bio) {
		$('#bio').html(details.bio.replace(/\n/g,'<br>'))
	}
	else {
		$('#bio').html('No bio information provided.')
	}
	
	if (details.links) {
		html_imports('link_row', function(jstring) {
			let links = $('#import_links')
			
			if (details.links.length == 0) {
				links.html('No links provided.')
			}
			else {
				for (let link of details.links) {
					let jlink = $(jstring)
					jlink.find('.link-name').html(link.name)
					jlink.find('.link-link').html(link.link).prop('href',link.link)
				
					links.append(jlink)
				}
			}
		})
	}
	
	//load contributions
	dbclient_fetch_works(details.username, function(works) {
		if (works !== null) {
			console.log('got contributions for ' + details.username)
			console.log(works)
		}
		else {
			console.log('failed to load contributions for ' + details.username)
		}
	})
	
	//enable more-contributions button
	$('#more_contributions').click(function() {
		//TODO enable more contributions
		$('#contributions').hide()
	})
	
	if (account.username == details.username) {
		$('#edit_email').val(account.email)
		$('#edit_bio').val(account.bio)
	}
}

function account_enable_edits() {
	editing = false
	edits = {}
	
	let edit_account = $('#edit_account')
	let save_account = $('#save_account')
	let editable = $('.editable')
	
	editable.click(account_edit)
	
	edit_account
	.show()
	.click(function() {
		editing = true
		edit_account.hide()
		save_account.show()
		
		//enable account edit forms
		editable.attr('data-editing',true)
	})
	
	save_account.click(function() {
		editing = false
		save_account.hide()
		edit_account.show()
		
		//disable account edit forms
		editable.attr('data-editing',false)
		
		//send updates to server
		dbclient_update_user(account.username, edits, function(err) {
			if (err) {
				alert('Error: failed to update your account info on the server. Check browser logs for details.')
			}
			else {
				alert('Account update successful')
				
				//apply edits
				if (edits.photo) {
					img_utils_load_photo(edits.photo, function(data_url) {
						$('#photo').attr('src',data_url)
					})
				}
				if (edits.bio) {
					$('#bio').html(edits.bio.replace(/\n/g,'<br>'))
				}
				if (edits.links) {
					html_imports('link_row', function(jstring) {
						let dest = $('#import_links').html('')
						
						for (let link of edits.links) {
							let jlink = $(link)
							jlink.find('.link-name').html(link.name)
							jlink.find('.link-link').html(link.link).prop('href',link.link)
							
							dest.append(jlink)
						}
					})
				}
			}
		})
	})
	
	//photo edits
	$('#edit_photo').change(function(event) {
		let f = event.target
		
		if (f.files && f.files[0]) {
			img_utils_prep_file(f.files[0], ACCOUNT_PHOTO_SIZE, function(photo) {
				if (photo) {
					//register photo change for submission
					$(f).removeClass('invalid')
					edits.photo = photo
					console.log('photo change is ready for commit')
				}
				else {
					console.log('error uploading photo file')
					$(f).addClass('invalid')
				}
			})
		}
	})
	
	//bio edits
	$('#edit_bio_submit').click(function() {
		let bio = $('#edit_bio_input').val()
		
		if (bio) {
			edits.bio = bio
			console.log('bio change ready for commit')
		}
	})
	
	//link edits
	$('#add_link').click(function() {
		html_imports('edit_link_row', function(jstring) {
			let row_id = edit_links_rows++
			let jlink = $(jstring).attr('data-row',row_id)
			
			jlink.find('.edit-link-row-delete').click(function() {
				$('.edit-link-row[data-row="' + row_id + '"]').remove()
			})
			
			$('#edit_links_list').append(jlink)
		})
	})
	$('#edit_links_submit').click(function() {
		let jlinks = $('.edit-link-row')
		
		edits.links = []
		for (let link of jlinks) {
			let jlink = $(link)
			let link_name = jlink.find('.edit-link-row-name').val()
			let link_url = jlink.find('.edit-link-row-url').val()
			
			if (link_name && link_url) {
				edits.links.push({
					name: link_name,
					link: link_url
				})
			}
		}
		
		console.log('links change is ready for commit')
	})
}

function account_disable_edits() {
	$('.editable').click(null).attr('data-editing',false)
	editing = false
	$('#edit_account').hide()
	$('#save_account').hide()
}

function account_edit() {
	if ($(this).attr('data-editing') == 'true') {
		let src = $(this).prop('id')
		
		if (src == 'contact_photo') {
			$('#edit_contact_card').modal('show')
		}
		else if (src == 'bio') {
			$('#edit_bio').modal('show')
		}
		else if (src == 'links') {
			$('#edit_links').modal('show')
		}
		else {
			console.log('TODO enable edits for ' + src)
		}
	}
	else {
		console.log('not enabled')
	}
}
