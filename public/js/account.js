/*
account.js
Owen Gallagher
9 december 2019
*/

let account
let editing = false
let editable
let edits = {}
let edit_links_rows = 0
let works = []
let works_start = 0
let works_end = 0

const ACCOUNT_PHOTO_SIZE = 460 //somewhat arbitrary, based on github profile photo size
const WORKS_BATCH_START = 4 //how many works are loaded initially
const WORKS_BATCH_SIZE = 8 //how many works to load each time more are requested

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
	
	//toast options
	$('#warning_toast').toast({
		autohide: false
	})
	$('#edit_toast').toast({
		delay: 2000,
		autohide: true
	})
	$('#delete_account').click(function() {
		$('#warning_toast_container').show()
		$('#warning_toast').show().toast('show')
	})
	$('#warning_toast_close').click(function() {
		$('#warning_toast_container').hide()
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
	
	//edit controls
	let edit_account = $('#edit_account')
	let save_account = $('#save_account')
	editable = $('.editable')
	
	edit_account.click(function() {
		editing = true
		edit_account.hide()
		save_account.show()
		
		//enable account edit forms
		editable.attr('data-editing',true)
		
		//disable links
		$('.link-link')
		.addClass('disabled')
		.prop('data-href', $(this).prop('href'))
		.prop('href','#')
		.prop('target','_self')
	})
	
	//push edits
	save_account.click(function() {
		editing = false
		save_account.hide()
		edit_account.show()
		
		//disable account edit forms
		editable.attr('data-editing',false)
		
		//enable links
		$('.link-link')
		.removeClass('disabled')
		.prop('href', $(this).attr('data-href'))
		.prop('target','_blank')
		
		//send updates to server
		if (account) {
			let clear_edits = false
			let message = $('#edit_toast_message').empty()
			
			dbclient_update_user(account.username, edits, function(result) {
				//show result
				if (result.success == 10) {
					//10 = sessionserver.SUCCESS
					message.html(message.html() + 'No account changes. ')
				}
				else if (result.success) {
					message.html(message.html() + 'Account update successful. ')
				}
				else {
					console.log('user update result: ' + result)
					message.html(message.html() + 'Error: failed to update your account info on the server. Check browser logs for details. ')
				}
				$('#edit_toast').toast('show')
				
				//clear edits object
				if (clear_edits) {
					edits = {}
				}
				else {
					clear_edits = true
				}
			})
			
			if (edits.works && edits.works.length != 0) {
				let edited_works = edits.works
				dbclient_update_works(account.username, edited_works, function(result) {
					//show result
					if (result.success) {
						message.html(message.html() + 'Contributions update successful. ')
						
						for (let work of edited_works) {
							if (work.deleted) {
								$('#work_' + work.id).find('.work-tile-title').html('(deleted)')
							}
							else {
								$('#work_' + work.id).find('.work-tile-title').html(work.title)
							}
						}
					}
					else {
						console.log('works update result: ' + result)
					}
					$('#edit_toast').toast('show')
					
					//clear edits object
					if (clear_edits) {
						edits = {}
					}
					else {
						clear_edits = true
					}
				})
			}
		}
		else {
			//suspicious; maybe didn't log in and forced edits to be enabled
			alert('An error occurred updating this account. Did you log in?')
		}
	})
	
	editable.click(account_edit)
	
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
	
	//commit contact card edits
	$('#edit_contact_card_submit').click(function() {
		//reload photo
		if (edits.photo) {
			$('#photo').prop('src', edits.photo)
		}
		
		//subscribed edits
		edits.subscribed = $('#edit_subscribed').prop('checked')
		
		//reload subscribed
		let text = 'no'
		if (edits.subscribed) {
			text = 'yes'
		}
		$('#subscribed').html(text)
	})
	
	//bio edits
	$('#edit_bio_submit').click(function() {
		let bio = $('#edit_bio_input').val()
		
		if (bio) {
			edits.bio = string_utils_xss_escape(bio)
			console.log('bio change ready for commit')
			
			//reload bio
			$('#bio').html(string_utils_tagify(edits.bio))
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
			let link_url = string_utils_url(jlink.find('.edit-link-row-url').val())
			
			if (link_name && link_url) {
				edits.links.push({
					name: link_name,
					link: link_url
				})
			}
		}
		
		console.log('links change is ready for commit')
		
		//reload links
		html_imports('link_row', function(jstring) {
			let dest = $('#import_links').html('')
			
			for (let link of edits.links) {
				let jlink = $(jstring)
				
				jlink.find('.link-name')
				.html(link.name)
				
				jlink.find('.link-link')
				.html(link.link)
				.addClass('disabled')
				.prop('data-href', link.link)
				.prop('href','#')
				
				dest.append(jlink)
			}
		})
	})
	
	//work edits
	$('#edit_work_submit').click(function() {
		if (!edits.works) {
			edits.works = []
		}
		
		let work = {
			id: parseInt($(this).attr('data-work-id'))
		}
		
		let deleted = $('#edit_work_delete').prop('checked')
		let title = $('#edit_work_title').val()
		let description = $('#edit_work_description').val()
		let content = $('#edit_work_content').val()
		
		if (deleted) {
			work.deleted = true
		}
		else {
			if (title) {
				work.title = string_utils_xss_escape(title)
			}
			if (description) {
				work.description = string_utils_xss_escape(description)
			}
			if (content) {
				work.content = string_utils_xss_escape(content)
			}
		}
		
		edits.works.push(work)
		
		//reload work
		let edited = $('#work_' + work.id)
		edited.find('.work-tile-title').html(title + ' (pending...)')
		edited.find('.work-tile-description').html(string_utils_tagify(description))
		edited.find('.work-tile-text').html(string_utils_tagify(content))
	})
}

function account_on_login(account_info) {
	//can be null
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
			
			//account_disable_edits called once more details are supplied
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
		
		//get account activity
		html_imports('activity', function(activity_row) {
			let activity_container = $('#history').empty().append('<h3 class="text-dark text-capitalize">History</h3>')
			
			dbclient_fetch_user_activity(username, function(activities) {
				if (activities) {
					for (let activity of activities) {
						/*
						{
							activity:	play | rate | difficulty | author,
							target:		puzzle_id | work_id,
							details:	play_duration,puzzle_title | rating,puzzle_title | difficulty,puzzle_title | work_title
						}
						*/
						let jactivity = $(activity_row)
						.attr('data-target',activity.target)
						
						let key = jactivity.find('.activity-key')
						let value = jactivity.find('.activity-value')
						let type = activity.activity
						if (type == 'play' || type == 'rate' || type == 'difficulty') {
							let details = activity.details.split(',')
							
							key.html(details[1])
							
							switch(type) {
								case 'play':
									value.html(Math.round(details[0] / 60000) + ' min')
									break
									
								case 'rate':
									value.html('rating ' + details[0])
									break
									
								case 'difficulty':
									value.html('difficulty ' + details[0])
									break
							}
						}
						else if (type == 'author') {
							key.html(activity.details)
							value.html('contribution')
						}
						
						activity_container.append(jactivity)
					}
					
					$('#activity').show()
				}
				else {
					console.log('error: activity fetch failed')
					//TODO handle error
				}
			})
		})
	}
}

function account_on_logout() {
	console.log('TODO account on logout')
	account = null
	account_disable_edits()
}

function account_on_details(details) {
	if (details.deleted) {
		//hide delete section
		$('#delete_account').hide()
		$('#warning_toast_container').hide()
		
		//hide most sections
		$('#contact_container').hide()
		$('#username').html(details.username)
		$('#bio').html('This account was deleted.')
		$('#activity').hide()
		$('#import_links').hide()
		$('#contributions').hide()
		
		//disable edits
		account_disable_edits()
		
		if (account && account.username == details.username) {
			//enable account recovery
			$('#recover_account')
			.show()
			.click(function() {
				//account session cookies may have been deleted post account deletion
				sessionclient_get_account(function(account_info) {
					if (account_info) {
						sessionclient_recover(account.username)
						.then(function() {
							//reload page
							window.location.reload()
						})
						.catch(function(err) {
							//TODO handle err
						})
					}
					else {
						$('#login_modal').modal('show')
					}
				})
			})
		}
	}
	else {
		//fill account page with account information
		$('#username').html(details.username)
		
		if (details.anonymous) {
			//this account was created by site admins to share work published elsewhere by an author that doesn't have a TJ account
			//hide contact card
			$('#contact_container').hide()
			
			//hide links
			$('#links').hide()
			
			//show bio
			$('#bio').html('This account was generated to share an author\'s work published elsewhere.')
		}
		else {
			//typical account
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
	
			if (details.photo) {
				img_utils_prep_blob(details.photo.data, function (data_url) {
					$('#photo').prop('src', data_url)
				})
			}
			
			if (details.bio) {
				$('#bio').html(string_utils_tagify(details.bio))
			}
			else {
				$('#bio').html('No bio information provided.')
			}
			
			if (details.links) {
				html_imports('link_row', function(jstring) {
					let links = $('#import_links').html('')
				
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
			
			//TODO load account activity
		}
	
		//load contributions
		dbclient_fetch_works(details.username, function(works_info) {
			works = []
			works_end = WORKS_BATCH_START
		
			if (works_info !== null) { //could be [] or [...]
				console.log('got ' + works_info.length + ' contributions by ' + details.username)
				works = works_info
			
				account_more_works()
			}
			else {
				//TODO handle error
				console.log('failed to load contributions for ' + details.username)
			}
		})
		
		//enable more-contributions button
		$('#more_contributions').click(account_more_works)
		
		if (account && account.username == details.username) {
			//prep edit fields for own account
			$('#edit_email').val(account.email)
			
			$('#edit_bio_input').val(account.bio)
		
			html_imports('edit_link_row', function(jstring) {
				let links = $('#edit_links_list')
			
				if (account.links.length != 0) {
					for (let link of details.links) {
						let jlink = $(jstring)
						jlink.find('.edit-link-row-name').val(link.name)
						jlink.find('.edit-link-row-url').val(link.link)
				
						links.append(jlink)
					}
				}
			})
			
			if (account.subscribed) {
				$('#subscribed').html('yes')
				$('#edit_subscribed').prop('checked',true)
			}
			else {
				$('#subscribed').html('no')
				$('#edit_subscribed').prop('checked',false)
			}
			
			//enable account deletion
			$('#confirm_delete_account').click(account_delete)
		}
		else {
			//disable edits
			account_disable_edits()
		}
	}
}

function account_enable_edits() {
	editing = false
	edits = {}
	
	//show edit-account button
	$('#edit_account').show()
	
	//show subscription
	$('#subscription').show()
}

function account_disable_edits() {
	$('.editable').click(null).attr('data-editing',false)
	editing = false
	$('#edit_account').hide()
	$('#save_account').hide()
	$('#delete_account').hide()
	$('#recover_account').hide()
	$('#subscription').hide()
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
		else if (src.match(/work_\d+/)) {
			if ($(this).attr('data-fixed')) {
				//used in textile; cannot modify
				alert('This work has already been included in a textile and can no longer be modified.\n\nIf you wish, you can submit a new version under a new title. You can even upload it with the same title as the previous version.')
			}
			else {
				$('#edit_work_submit').attr('data-work-id', src.replace('work_',''))
				
				let title = $(this).find('.work-tile-title').html()
				$('#edit_work_title_old').html(title)
				$('#edit_work_title').val(title)
				
				let description = $(this).find('.work-tile-description').html()
				$('#edit_work_description')
				.val(string_utils_xss_unescape(string_utils_detagify(description)))
				
				let content = $(this).find('.work-tile-text').html()
				$('#edit_work_content')
				.val(string_utils_xss_unescape(string_utils_detagify(content)))
				
				$('#edit_work').modal('show')
			}
		}
		else {
			console.log('TODO enable edits for ' + src)
		}
	}
}

function account_more_works() {
	if (works.length > 0) {
		let works_list = $('#import_works')
		
		html_imports('work_tile', function(jwork_string) {
			html_imports('work_tag', function(jtag_string) {
				console.log('more works: ' + works_start + ' to ' + works_end)
				for (let i=works_start; i<works.length && i<works_end; i++) {
					let jwork = $(jwork_string)
					let work = works[i]
					
					//card
					jwork.find('.work-tile-card')
					.prop('id', 'work_' + work.id)
					.click(account_edit)
					
					//title
					jwork.find('.work-tile-title')
					.html(work.title)
					.attr('data-target', '#work_' + work.id + '_license')
					
					//header collapse
					jwork.find('.work-tile-license-collapse').prop('id', 'work_' + work.id + '_license')
				
					//date
					jwork.find('.work-tile-date').html(string_utils_date(work.date))
				
					//license
					let license
					let license_url
					switch (work.license) {
						case 'cc-0':
							license = 'Public Domain'
							license_url = 'https://creativecommons.org/licenses/zero/1.0'
							break
					
						case 'cc-by':
							license = 'Creative Commons BY'
							license_url = 'https://creativecommons.org/licenses/by/4.0'
							break
					
						case 'cc-by-sa':
							license = 'Creative Commons BY-SA'
							license_url = 'https://creativecommons.org/licenses/by-sa/4.0'
							break
					
						case 'cc-by-nd':
							license = 'Creative Commons BY-ND'
							license_url = 'https://creativecommons.org/licenses/by-nd/4.0'
							break
					
						case 'cc-by-nc':
							license = 'Creative Commons BY-NC'
							license_url = 'https://creativecommons.org/licenses/by-nc/4.0'
							break
					
						case 'cc-by-nc-sa':
							license = 'Creative Commons BY-NC-SA'
							license_url = 'https://creativecommons.org/licenses/by-nc-sa/4.0'
							break
					
						case 'cc-by-nc-nd':
							license = 'Creative Commons BY-NC-ND'
							license_url = 'https://creativecommons.org/licenses/by-nc-nd/4.0'
							break
					
						default:
							license = work.license
							license_url = '#'
							break
					}
					jwork.find('.work-tile-license')
					.html(license)
					.prop('href',license_url)
				
					//description
					if (work.description) {
						jwork.find('.work-tile-description').html(string_utils_tagify(work.description))
					}
					else {
						jwork.find('.work-tile-description').html('No description provided')
					}
				
					//text
					jwork.find('.work-tile-text')
					.html(string_utils_tagify(work.text))
					
					//text collapse
					jwork.find('.work-tile-card-body')
					.attr('data-target', '#work_' + work.id + '_text')
				
					jwork.find('.work-tile-text-collapse')
					.prop('id', 'work_' + work.id + '_text')
				
					works_list.append(jwork)
				
					//load puzzle appearances
					let fragments_list = jwork.find('.work-tile-fragments')
					dbclient_fetch_work_fragments(work.id, function(fragments) {
						if (fragments.length != 0) {
							//mark as fixed; once used in a textile it cannot be modified...
							jwork.find('.work-tile-card')
							.attr('data-fixed',true)
							
							//clear fragments container
							fragments_list.html('')
						
							//add fragments/puzzle appearances
							for (let fragment of fragments) {
								let jtag = $(jtag_string)
								jtag.find('.work-tag-value')
								.html(fragment.puzzle_title)
								.prop('href','textile.html?puzzle_id=' + fragment.puzzle_id)
							
								fragments_list.append(jtag)
							}
						}
						//else, default fragments container displays message for no fragments
					})
					
					works_start++
				}
				
				//update editable array
				editable = $('.editable')
				
				if (works_end >= works.length) {
					//no more; hide more contributions button
					$('#more_contributions').hide()
				}
				else {
					//ready for more
					works_end += WORKS_BATCH_SIZE
				}
			})
		})
	}
	else {
		//none; hide contributions section
		$('#contributions').hide()
	}
}

function account_delete() {
	if (account) {
		sessionclient_delete(account.username)
		.then(function() {
			//TODO handle success
			console.log('account deletion successful')
			
			//update local values
			account.deleted = true
			account_on_details(account)
		})
		.catch(function(err) {
			//TODO handle error
		})
	}
	else {
		console.log('error: not logged into any account that should be deleted?')
	}
}
