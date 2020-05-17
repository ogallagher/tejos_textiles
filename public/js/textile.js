/*

textile.js
Owen Gallagher
1 May 2020

Main entrypoint for textile.html

*/

let account
let puzzle
let user_rating
let loaded_user_stats
let scroll_lock

window.onload = function() {
	force_https()
	
	textile_load_puzzle(function() {
		if (!loaded_user_stats && account) {
			textile_on_login(account)
		}
	})
	
	//import navbar
	html_imports('navbar','#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			//assign login callback
			login_on_login = textile_on_login
			
			//load account
			sessionclient_get_account(textile_on_login)
		})
	})
	
	//enable bootstrap tooltips
	$('[data-toggle="tooltip"]').tooltip({
		placement: 'auto',
		delay: {
			show: 250,
			hide: 100
		}
	})
	
	//enable featured card widgets
	textile_authors()
	textile_date()
	textile_stars()
	
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
	
	//enable scroll-lock button
	scroll_lock = false
	$('#anchor_scroll').click(function() {
		scroll_lock = !scroll_lock
		
		if (scroll_lock) {
			//scroll to puzzle
			window.location.href = '#featured_container'
			
			//prevent scrolling
			$('body').on('scroll touchmove mousewheel', function(e) {
				e.preventDefault()
			})
			
			//button icon
			$('#anchor_scroll_icon')
			.removeClass('oi-link-broken')
			.addClass('oi-link-intact')
		}
		else {
			//enable scrolling
			$('body').off('scroll touchmove mousewheel')
			
			//button icon
			$('#anchor_scroll_icon')
			.removeClass('oi-link-intact')
			.addClass('oi-link-broken')
		}
	})
}

function textile_on_login(account_info) {
	account = account_info
	
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account)
	
	if (account && !loaded_user_stats) {
		console.log('index: account set to ' + account.username)
		
		//update featured puzzle rating to reflect this account's opinion
		if (puzzle) {
			loaded_user_stats = true
			dbclient_fetch_user_rating(account.username, puzzle.id, function(data) {
				if (data) {
					user_rating = data.rating
					$('#featured_rating').mouseleave()
				}
				
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
							}
							catch (err) {
								console.log(err)
								console.log('account play stats fetch failed; perhaps user logged out?')
							}
						})
					}
				})
			})
		}
	}
}

function textile_load_puzzle(callback) {
	let puzzle_id = url_params_get('puzzle_id')
	
	if (puzzle_id != null) {
		console.log('loading textile ' + puzzle_id)
		
		dbclient_fetch_puzzle(puzzle_id, function(dbdata) {
			$('#title').html(dbdata.title)
			
			let puzzle_title = $('#featured_title')
			let puzzle_date = $('#featured_date')
			let puzzle_canvas = $('#featured_puzzle')[0]
			let puzzle_rating = $('#featured_rating')
			let puzzle_container = $('#featured_container')[0]
			
			//load metadata
			puzzle = new Puzzle(dbdata)
			
			//load graphics
			puzzle.feature(puzzle_title,puzzle_date,puzzle_canvas,puzzle_rating,puzzle_container)
				.then(function() {
					$('#featured_placeholder').remove()
					console.log('feature success')
				})
				.catch(function() {
					console.log('feature failed')
				})
				.finally(function() {
					callback()
				})
			
			window.onresize = function() {
				puzzle.resize(puzzle_container)
			}
			
			//assign completion callback
			puzzle.onComplete = textile_puzzle_on_complete
			
			//load authors and fragments
			dbclient_fetch_puzzle_fragments(puzzle.id, function(fragments) {
				html_imports('work_tile', function(tile_str) {
					let fragments_list = $('#fragments_list')
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
						let tile_id = 'fragment_' + fragment.work_id
						tile.prop('id', tile_id)
						
						//title
						tile.find('.work-tile-title')
						.html(fragment.title)
						.attr('data-target','#' + tile_id + '_license_collapse') //enable expand/collapse
						.removeClass('font-title-xlg').addClass('font-title-lg') //shrink from default font
						
						//license
						tile.find('.work-tile-license-collapse')
						.prop('id', tile_id + '_license_collapse') //enable expand/collapse
						.append('<br><a class="font-content" href="account.html?username=' + author + '#contributions">view original</a>') //link to original
						
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
							.html(fragment.fragment)
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
	}
	else {
		console.log('error: textile not defined')
		//TODO handle undefined textile
	}
}

function textile_authors() {
	
}

function textile_date() {
	
}

function textile_stars() {
	//list of star buttons
	let rating = $('#featured_rating')
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
				dbclient_rate(account.username, puzzle.id, star_count, function(rated) {
					if (rated) {
						user_rating = star_count
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

//TODO handle puzzle completion
function textile_puzzle_on_complete(puzzle) {
	console.log('puzzle completed!')
	
	//show win screen
	$('#solve_time').html(puzzle.solveTime / 1000) //solve time in seconds
	$('#win_screen').show()
	
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