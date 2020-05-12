/*

textile.js
Owen Gallagher
1 May 2020

Main entrypoint for textile.html

*/

let account
let puzzle
let user_rating

window.onload = function() {
	force_https()
	
	textile_load_puzzle(function() {
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
		
		textile_puzzle_on_complete()
	})
}

function textile_on_login(account_info) {
	account = account_info
	
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account)
	
	if (account) {
		console.log('index: account set to ' + account.username)
		
		//update featured puzzle rating to reflect this account's opinion
		if (puzzle) {
			dbclient_fetch_user_rating(account.username, puzzle.id, function(data) {
				if (data) {
					user_rating = data.rating
					$('#featured_rating').mouseleave()
				}
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
				console.log('got fragments:')
				console.log(fragments)
				
				html_imports('work_tile', function(tile_str) {
					let fragments_list = $('#fragments_list')
					let authors_list = $('#featured_authors').html('')
					let author_button_str = '<a class="btn btn-outline-secondary rounded-0" href="#"></a>'
					
					for (let fragment of fragments) {
						//load author
						authors_list.append(
							$(author_button_str)
							.prop('href','account.html?username=' + fragment.author)
							.html(fragment.author)
						)
						
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
						.append('<br><a class="font-content" href="account.html?username=' + fragment.author + '#contributions">view original</a>') //link to original
						
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
							role="button" onclick="window.location.href=\'account.html?username=' + fragment.author + '\';">' + 
							fragment.author + 
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
				dbclient_rate(account.username, featured_puzzle.id, star_count, function(rated) {
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
function textile_puzzle_on_complete() {
	console.log('puzzle completed!')
	
	//show win screen
	$('#win_screen').show()
	
	//show fragments; shows literature contained in the puzzle
	$('#fragments_header').show()
	$('#fragments_list').collapse()
	
	//if not logged in, store play cookie and toast to login to save progress
	
	//update db.plays submit username,puzzle,duration
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