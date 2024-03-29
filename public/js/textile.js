/*

textile.js
Owen Gallagher
1 May 2020

Main entrypoint for textile.html

*/

const IS_MOBILE = is_mobile()

let account
let puzzle
let user_rating
let loaded_user_stats
let scroll_lock = false

window.onload = function() {
	if (force_https) {
		force_https()
	}
	
	textile_load_puzzle()
	
	//import navbar
	html_imports('navbar','#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload()
			
			//assign login callback
			login_on_login = textile_on_login
			login_on_logout = textile_on_logout
			
			//load account
			sessionclient_get_account(textile_on_login)
		})
	})
	
	// import and enable puzzle instructions
	html_imports('help','#import_puzzle_help')
	$('#help_button').click(function() {
		$('#help_modal').modal('show')
	})
	
	//enable interaction with rating stars
	textile_stars()
	
	//enable interaction with difficulty range
	$('#featured_difficulty').mouseup(function() {
		if (puzzle) { 
			let updated = false
			
			if (account) {
				if (account.enabled) {
					updated = true
					
					dbclient_measure_difficulty(account.username, puzzle.id, $(this).val(), function(avg_difficulty) {
						if (avg_difficulty) {
							puzzle.difficulty = avg_difficulty
						}
						else {
							alert('Error: difficulty measure failed!')
						}
					})
				}
				else {
					$('#rate_enable_toast').toast('show')
				}
			}
			else {
				$('#rate_login_toast').toast('show')
			}
			
			if (!updated) {
				$(this).val(Math.round(puzzle.difficulty))
			}
		}
	})
	
	//import footer
	html_imports('footer','#import_footer')
	
	//import win screen
	html_imports('win_screen', function(win_screen_str) {
		//win screen template
		$('#featured_container').append($(win_screen_str))
		
		//close button
		$('#win_screen_close').click(function() {
			$('#win_screen').fadeOut(1000)
		})
		
		//login-to-record-play toast
		$('#login_play_toast').toast({
			autohide: false
		})
	})
	
	// import pause screen
	html_imports('pause_screen', function(pause_screen_str) {
		$('#featured_container').append($(pause_screen_str))
		$('#pause_screen_close').click(function() {
			$('#pause_screen').hide()
			puzzle.resume(puzzle.partialPlay)
			
			if (IS_MOBILE) {
				// hide title bar
				$('#title_bar').hide()
				
				// scroll lock puzzle
				textile_scroll_lock_puzzle(true)
			}
		})
	})
	
	//enable play-again button
	$('#featured_again').click(function() {
		//hide win screen
		$('#win_screen').hide()
		
		//enable puzzle for replay
		if (puzzle) {
			puzzle.enable()
		}
		
		//hide play-again button
		$(this).hide()
	})
	
	//enable save button
	$('#save').click(function() {
		//save partial play before leaving
		if (account && puzzle.startTime) {
			console.log('saving partial play')
			sessionclient_partial_play(puzzle.pause())
			.then(function(saved) {
				if (saved) {
					$('#save_toast_message').html('Saved successfully')
					$('#save_toast').toast('show')
				}
				else {
					$('#save_toast_message').html('No progress to save.')
					$('#save_toast').toast('show')
				}
			})
			.catch(function() {
				$('#save_toast_message').html('An error occurred!')
				$('#save_toast').toast('show')
			})
		}
		else {
			console.log('not logged in or puzzle not begun; nothing to save')
			$('#save_toast_message').html('Account required to save progress')
			$('#save_toast').toast('show')
		}
	})
	$('#save_toast').toast({
		delay: 2500
	})
	
	// scroll-lock button
	if (IS_MOBILE) {
		$('#anchor_scroll').hide()
	}
	else {
		$('#anchor_scroll').click(function() {
			textile_scroll_lock_puzzle(!scroll_lock)
		})
	}
}

function textile_scroll_lock_puzzle(lock) {
	if (lock) {
		//scroll to puzzle
		window.location.href = '#featured_container'
	
		//prevent scrolling
		$('body')
		.on('scroll touchmove mousewheel', function(e) {
			e.preventDefault()
		})
		.css('overflow','hidden')
	
		//button icon
		$('#anchor_scroll_icon')
		.removeClass('oi-link-broken')
		.addClass('oi-link-intact')
	}
	else {
		//enable scrolling
		$('body')
		.off('scroll touchmove mousewheel')
		.css('overflow','auto')
	
		//button icon
		$('#anchor_scroll_icon')
		.removeClass('oi-link-intact')
		.addClass('oi-link-broken')
	}
	
	scroll_lock = lock
}

function textile_on_login(account_info) {
	loaded_user_stats = false
	account = account_info
	
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account)
	
	if (account && !loaded_user_stats) {
		console.log('index: account set to ' + account.username)
		
		if (puzzle) {
			loaded_user_stats = true
			
			//update featured puzzle rating to reflect this account's opinion
			dbclient_fetch_user_rating(account.username, puzzle.id, function(data) {
				if (data) {
					user_rating = data.rating
					$('#featured_rating').mouseleave()
				}
			})
			
			//update difficulty to reflect this account's opinion
			dbclient_fetch_user_difficulty(account.username, puzzle.id, function(data) {
				if (data) {
					$('#featured_difficulty_key').html(account.username + ' difficulty measure')
					$('#featured_difficulty').val(data.difficulty)
				}
			})
			
			//add tags for account play stats: number of plays, fastest solve
			dbclient_fetch_user_plays(account.username, puzzle.id, function(data) {
				if (data) {
					//add new user stats
					let textile_tags = $('#textile_tags')
					html_imports('textile_tag', function(jtemplate) {
						try {
							//plays tag
							let jstring = jtemplate
											.replace('?key?', account.username + ' plays')
											.replace('?value?', data.times)
							let jtag = $(jstring)
							.attr('data-tag-type','user-stats')
							.prop('id','user_plays')
							textile_tags.append(jtag)
							
							//fastest solve
							if (data.fastest) {
								jstring = jtemplate
											.replace('?key?', account.username + ' fastest solve')
											.replace('?value?', (data.fastest / 1000) + 's')
								jtag = $(jstring)
								.attr('data-tag-type','user-stats')
								.prop('id','user_fastest')
						
								textile_tags.append(jtag)
							}
							
							//show contributions
							$('#fragments_header').show()
						}
						catch (err) {
							console.log(err)
							console.log('account play stats fetch failed; perhaps user logged out?')
						}
					})
				}
			})
		}
		
		//recover anonymous user stats from cookies
		let cookie_plays = cookies_get(PLAYS_COOKIE_KEY)
		if (cookie_plays) {
			let plays = cookie_plays.split(';')
			
			for (let play of plays) {
				let entry = play.split(',')
				
				dbclient_play(account.username, entry[0], entry[1], function(err) {
					if (err) {
						//TODO handle error
					}
					else {
						//TODO update user stats
						
						//delete plays cookie
						cookies_delete(PLAYS_COOKIE_KEY)
					}
				})
			}
		}
	}
}

function textile_on_logout() {
	account = null
	user_rating = null
	$('#featured_rating').mouseleave()
	$('#featured_difficulty_key').html('difficulty')
	$('#featured_difficulty').val(Math.round(puzzle.difficulty))
	
	//remove user stats tags
	$('.textile-tag[data-tag-type="user-stats"]').remove()
}

function textile_load_puzzle() {
	let puzzle_id = url_params_get('puzzle_id')
	
	if (puzzle_id != null) {
		//load puzzle from db
		console.log('loading textile ' + puzzle_id + ' from db')
		dbclient_fetch_puzzle(puzzle_id, function(dbdata) {
			//set page title
			$('#title').html(dbdata.title)
			
			//init puzzle object
			puzzle = new Puzzle(dbdata)
			
			//resume from partial play
			puzzle.onLoad = function() {
				sessionclient_resume_partial_play(puzzle.id)
				.then(function(data) {
					if (data) {
						console.log('resuming play')
						puzzle.resume(data)
					}
				})
			}
	
			//load metadata
			let puzzle_title = $('#featured_title')
			let puzzle_date = $('#featured_date')
			let puzzle_canvas = $('#featured_puzzle')[0]
			let puzzle_container = $('#featured_container')[0]

			//load graphics
			puzzle.feature(puzzle_title,puzzle_date,puzzle_canvas,puzzle_container)
			.then(function() {
				$('#featured_placeholder').remove()
				console.log('feature success')
			})
			.catch(function() {
				console.log('feature failed')
			})

			window.onresize = function() {
				puzzle.resize(puzzle_container)
			}

			if (!loaded_user_stats && account) {
				textile_on_login(account)
			}
			else {
				//update average rating and difficulty
				$('#featured_rating').mouseleave()
	
				$('#featured_difficulty_key').html('difficulty')
				$('#featured_difficulty').val(Math.round(puzzle.difficulty))
			}
			
			// assign start callback
			puzzle.onStart = function() {
				//show save button
				$('#save').show()
			}
			
			// handle completion puzzle complete
			puzzle.onComplete = textile_puzzle_on_complete
			
			// handle puzzle click/tap
			puzzle.onClick = textile_puzzle_on_click
			if (IS_MOBILE) {
				// load initially as paused
				puzzle.onClick(puzzle)
			}
			
			//load authors and fragments
			dbclient_fetch_puzzle_fragments(puzzle.id, function(fragments) {
				html_imports('work_tile', function(tile_str) {
					let fragments_list = $('#fragments_list').empty()
					let authors_list = $('#featured_authors').html('')
					let author_button_str = '<a class="btn btn-outline-secondary rounded-0" href="#"></a>'
					let author_names = []
		
					for (let fragment of fragments) {
						//load author
						let author = fragment.author
						if (!author_names.includes(author)) {
							authors_list.append(
								$(author_button_str)
								.prop('href','account.html?username=' + author)
								.html(author)
							)
				
							author_names.push(author)
						}
			
						//load fragment
						let tile = $(tile_str)
			
						//id
						let tile_id = 'fragment_' + fragment.id
						tile.prop('id', tile_id)
			
						//title
						tile.find('.work-tile-title')
						.html(fragment.title)
						.attr('data-target','#' + tile_id + '_license_collapse') //enable expand/collapse
			
						//date
						tile.find('.work-tile-date').html(string_utils_date(fragment.date))
			
						//license
						tile.find('.work-tile-license-collapse')
						.prop('id', tile_id + '_license_collapse') //enable expand/collapse
						.append('<br><a class="font-content" href="account.html?username=' + author + '#contributions" target="_blank">view original</a>') //link to original
			
						let license
						let license_url
						switch (fragment.license) {
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
						tile.find('.work-tile-license')
						.html(license)
						.prop('href', license_url)
	
						//text
						tile.find('.work-tile-card-body')
						.attr('data-target','#' + tile_id + '_text_collapse')
			
						tile.find('.work-tile-text-collapse')
						.prop('id', tile_id + '_text_collapse')
			
						if (!fragment.fragment) {
							//complete fragment; load full text on request
							tile.find('.work-tile-text')
							.html(
								'<button class="btn text-bold-hover col font-content-md" \
								onclick="textile_load_work_text(' + fragment.work_id + ',\'#' + tile_id + ' .work-tile-text\');">\
								Load full text\
								</button>'
							)
		
							tile.find('.work-tile-text-collapse').removeClass('collapse')
						}
						else {
							tile.find('.work-tile-text')
							.html(string_utils_tagify(fragment.fragment))
						}
			
						//description
						if (fragment.description) {
							tile.find('.work-tile-description').html(string_utils_tagify(fragment.description))
						}
						else {
							tile.find('.work-tile-description').html('No description provided')
						}
			
						//author
						tile.find('.work-tile-fragments').html(
							'<div class="col">\
							<button class="btn text-raspberry-hover text-bold-hover text-dark-nohover col" \
							role="button" onclick="window.location.href=\'account.html?username=' + author + '\';">' + 
							author + 
							'</button>\
							</div>'
						)

						fragments_list.append(tile)
					}
				})
			})
		})
		
		//enable activate link in rate_enable_toast
		$('#request_activate').click(function() {
			sessionclient_request_activate()
			.then(function() {
				alert('Success! A new activation link was sent to your email address.')
			})
			.catch(function(err) {
				if (err == 'session') {
					alert('You need to log into an account before you can activate it')
				}
				else if (err == 'db') {
					alert('Error: failed to fetch account email from database')
				}
			})
		})
	}
	else {
		alert('error: textile not defined')
	}
}

function textile_stars() {
	//list of star buttons
	let rating = $('#featured_rating')
	let rating_key = $('#featured_rating_key')
	let stars = rating.children()
	let one = $('#featured_rating_1')
	let two = $('#featured_rating_2')
	let three = $('#featured_rating_3')
	let four = $('#featured_rating_4')
	let five = $('#featured_rating_5')
	let r = 0
	
	//select stars from one until the one under the cursor
	rating.mousemove(function(event) {
		let offset = one.offset()
		let x = event.pageX - offset.left
		
		r = (x / $(this).width()) * 5
		
		stars.removeClass('text-warning').addClass('text-gray')
		
		one.removeClass('text-gray').addClass('text-warning')
		if (r > 1) {
			two.removeClass('text-gray').addClass('text-warning')
		}
		if (r > 2) {
			three.removeClass('text-gray').addClass('text-warning')
		}
		if (r > 3) {
			four.removeClass('text-gray').addClass('text-warning')
		}
		if (r > 4) {
			five.removeClass('text-gray').addClass('text-warning')
		}
	})
	
	rating.mouseleave(function() {
		r = 0
		
		stars.removeClass('text-warning').addClass('text-gray')
		
		if (user_rating) {
			rating_key.html(account.username + ' rating')
			one.removeClass('text-gray').addClass('text-warning')
			if (user_rating > 1) {
				two.removeClass('text-gray').addClass('text-warning')
			}
			if (user_rating > 2) {
				three.removeClass('text-gray').addClass('text-warning')
			}
			if (user_rating > 3) {
				four.removeClass('text-gray').addClass('text-warning')
			}
			if (user_rating > 4) {
				five.removeClass('text-gray').addClass('text-warning')
			}
		}
		else {
			rating_key.html('rating')
			
			if (puzzle) {
				//display average rating
				let avg_rating = Math.round(puzzle.rating)
			
				one.removeClass('text-gray').addClass('text-warning')
				if (avg_rating > 1) {
					two.removeClass('text-gray').addClass('text-warning')
				}
				if (avg_rating > 2) {
					three.removeClass('text-gray').addClass('text-warning')
				}
				if (avg_rating > 3) {
					four.removeClass('text-gray').addClass('text-warning')
				}
				if (avg_rating > 4) {
					five.removeClass('text-gray').addClass('text-warning')
				}
			}
		}
	})
	
	//TODO update db tables with new rating
	let login_toast = $('#rate_login_toast').toast({
		delay: 4000
	})
	let enable_toast = $('#rate_enable_toast').toast({
		delay: 4000
	})
	
	rating.click(function(event) {
		let star_count = Math.floor(r+1)
		
		if (account) {
			if (account.enabled) {
				dbclient_rate(account.username, puzzle.id, star_count, function(avg_rating) {
					if (avg_rating) {
						user_rating = star_count
						puzzle.rating = avg_rating
					}
					else {
						alert('Error: rating failed!')
					}
				})
			}
			else {
				//TODO toast to verify account to rate
				enable_toast.toast('show')
			}
		}
		else {
			login_toast.toast('show')
		}
	})
}

function textile_puzzle_on_complete(puzzle) {
	console.log('puzzle completed!')
	
	//show win screen
	$('#solve_time').html(puzzle.solveTime / 1000) //solve time in seconds
	$('#win_screen').show()
	
	//hide save button
	$('#save').hide()
	
	//show again button
	$('#featured_again').show()
	
	//show fragments; shows literature contained in the puzzle
	$('#fragments_header').show()
	$('#fragments_list').collapse()
	
	if (account) {
		//update db.plays submit username,puzzle,duration
		dbclient_play(account.username, puzzle.id, puzzle.solveTime, function(err) {
			if (err) {
				//TODO handle error; create a retry button so play is not lost
				alert('Error: unable to save play data to server!\nTODO: retry play push to db')
			}
			else {
				//update user stats
				//num plays
				let user_plays = $('#user_plays .textile-tag-value')
				user_plays.html(parseInt(user_plays.html()) + 1)
				
				//fastest solve
				let user_fastest = $('#user_fastest .textile-tag-value')
				let previous = parseFloat(user_fastest.html())
				
				if (puzzle.solveTime < previous * 1000) {
					user_fastest.html(puzzle.solveTime / 1000)
				}
			}
		})
	}
	else {
		//if not logged in, store play cookie and toast to login to save progress
		$('#login_play_toast_container').show()
		$('#login_play_toast').toast('show')
		
		let cookie_plays = cookies_get(PLAYS_COOKIE_KEY) //puzzle,duration;puzzle,duration;...
		if (cookie_plays) {
			cookie_plays += ';'
		}
		else {
			cookie_plays = ''
		}
		
		cookies_set(PLAYS_COOKIE_KEY, cookie_plays + puzzle.id + ',' + puzzle.solveTime)
	}
}

function textile_puzzle_on_click(puzzle) {
	console.log('info puzzle paused')
	puzzle.pause(false)
	
	// show pause screen
	$('#pause_screen').show()
	
	if (IS_MOBILE) {
		// show title bar
		$('#title_bar').show()
		
		// scroll unlock
		textile_scroll_lock_puzzle(false)
	}
}

function textile_load_work_text(work_id, dest_selector) {
	let dest = $(dest_selector)
	
	if (!dest.prop('data-text-loaded')) {
		dbclient_fetch_work_text(work_id, function(work_text) {
			let text
			if (work_text) {
				text = string_utils_tagify(work_text[0].text)
			}
			else {
				text = 'Error: failed to fetch work content from the database!'
			}
		
			dest
			.html(text)
			.attr('data-text-loaded',true)
		})
	}
}