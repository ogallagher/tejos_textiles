/*
index.js
Owen Gallagher
26 July 2019
*/

let featured_puzzle
let account //see sessionclient:Account class
let user_rating

window.onload = function() {
	force_https()
	
	//fetch puzzles from db and insert into page
	dbclient_fetch_puzzles(index_puzzles_onload)
	
	//enable bootstrap tooltips
	$('[data-toggle="tooltip"]').tooltip({
		placement: 'auto',
		delay: {
			show: 250,
			hide: 100
		}
	})
	
	//enable toasts
	$('.toast').toast({
		delay: 4000
	})
	
	//enable featured card widgets
	index_featured_authors()
	index_featured_date()
	index_featured_stars()
	
	//import navbar and footer
	html_imports('navbar','#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload()
			
			//assign login callbacks
			login_on_login = index_on_login
			login_on_logout = index_on_logout
		
			//load account
			sessionclient_get_account(index_on_login)
		})
	})
	html_imports('footer','#import_footer')
	
	//import win screen
	html_imports('win_screen', function(win_screen_str) {
		//win screen template
		$('#featured_container').append($(win_screen_str))
		
		//close button
		$('#win_screen_close').click(function() {
			//close win screen
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
		if (featured_puzzle) {
			featured_puzzle.enable()
		}
		
		//hide play-again button
		$(this).hide()
	})
}

function index_on_login(account_info) {
	account = account_info
	
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account)
	
	if (account) {
		console.log('index: account set to ' + account.username)
		
		if (featured_puzzle) {			
			//chain fetches to prevent issues with the sessionserver reading+writing a session at the same time
			//update featured puzzle rating to reflect this account's opinion
			dbclient_fetch_user_rating(account.username, featured_puzzle.id, function(data) {
				if (data) {
					user_rating = data.rating
					$('#featured_rating').mouseleave()
				}
				
				//add tags for account play stats: number of plays, fastest solve
				dbclient_fetch_user_plays(account.username, featured_puzzle.id, function(data) {
					if (data) {
						//add new user stats
						let featured_tags = $('#featured_tags')
						html_imports('featured_tag', function(jtemplate) {
							//plays tag
							let jstring = jtemplate
											.replace('?key?', account.username + ' plays')
											.replace('?value?', data.times)
							let jtag = $(jstring)
							.attr('data-tag-type','user-stats')
							.prop('id','user_plays')
							featured_tags.append(jtag)
							
							//fastest solve
							if (data.fastest) {
								jstring = jtemplate
											.replace('?key?', account.username + ' fastest solve')
											.replace('?value?', (data.fastest / 1000) + 's')
								jtag = $(jstring)
								.attr('data-tag-type','user-stats')
								.prop('id','user_fastest')
								
								featured_tags.append(jtag)
							}
						})
					}
				})
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

function index_on_logout() {
	account = null
	user_rating = null
	$('#featured_rating').mouseleave()
	
	//remove user stats tags
	$('.featured-tag[data-tag-type="user-stats"]').remove()
}

//when a puzzle is loaded from dbclient, add it to the document and make it interactive
function index_puzzles_onload(dbdata) {
	//bind puzzles to list
	let domlist = $('#puzzles_list')
	
	//load textile template
	html_imports('textile_row', function(jstring) {
		//load puzzle data from db and add puzzles
		let first = true
		for (let p of dbdata) {
			let puzzle = new Puzzle(p) //see puzzle.js
			puzzle.onComplete = index_puzzle_on_complete //handle puzzle completion
			
			let jpuzzle = $(jstring)
			
			jpuzzle.find('.textile-row-card')
			.attr('id',puzzle.id)
			.click(function() {
				window.location.href = 'textile.html?puzzle_id=' + puzzle.id
			})
			
			jpuzzle.find('.textile-row-title').html(puzzle.title)
			
			domlist.append(jpuzzle) //add to list
			
			if (first) {
				//feature most recent puzzle
				featured_puzzle = puzzle
				first = false
			}
		}
		
		//load featured puzzle
		let ftitle = $('#featured_title')
		let fdate = $('#featured_date')
		let fcanvas = $('#featured_puzzle')[0]
		let frating = $('#featured_rating')
		let fcontainer = $('#featured_container')[0]
		
		if (featured_puzzle) {
			featured_puzzle.feature(ftitle,fdate,fcanvas,frating,fcontainer)
				.then(function() {
					$('#featured_placeholder').remove()
					$('#featured_url').attr('href','textile.html?puzzle_id=' + featured_puzzle.id)
					console.log('feature success')
				})
				.catch(function() {
					console.log('feature failed')
				})		
			
			window.onresize = function() {
				featured_puzzle.resize(fcontainer)
			}
		}
		
		//load authors and fragments
		dbclient_fetch_puzzle_fragments(featured_puzzle.id, function(fragments) {		
			html_imports('work_tile', function(tile_str) {
				let fragments_list = $('#fragments_list')
				let authors_list = $('#featured_authors').html('')
				let author_button_str = '<a class="btn btn-outline-secondary" href="#"></a>'
				let author_names = []
			
				for (let fragment of fragments) {
					//load author
					let author = fragment.author
					if (!author_names.includes(author)) {
						authors_list.append(
							$(author_button_str)
							.prop('href','account.html?username=' + author)
							.html(fragment.author)
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
					
					//date
					tile.find('.work-tile-date').html(string_utils_date(fragment.date))
					
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
				
					//text collapse
					tile.find('.work-tile-card-body')
					.attr('data-target','#' + tile_id + '_text_collapse')
				
					tile.find('.work-tile-text-collapse')
					.prop('id', tile_id + '_text_collapse')
					
					//text
					if (!fragment.fragment) {
						//complete fragment; load full text on request
						tile.find('.work-tile-text')
						.html(
							'<button class="btn text-bold-hover col font-content-md" \
							onclick="index_load_work_text(' + fragment.work_id + ',\'#' + tile_id + ' .work-tile-text\');">\
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

//handle interaction with featured star buttons
function index_featured_stars() {
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
		}
	})
	
	let login_toast = $('#rate_login_toast')
	let enable_toast = $('#rate_enable_toast')
	
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
				enable_toast.toast('show')
			}
		}
		else {
			login_toast.toast('show')
		}
	})
}

//TODO handle interaction with featured author buttons
function index_featured_authors() {
	var authors = $('#featured_authors').children()
	
	authors.click(function(event) {
		var author = $(this).html().trim()
		
		console.log(author + ' clicked')
	})
}

//TODO handle interaction with date
function index_featured_date() {
	var date_button = $('#featured_date')
	
	date_button.click(function(event) {
		var date = date_button.html()
		
		console.log(date + ' clicked')
	})
}

//TODO handle puzzle completion
function index_puzzle_on_complete(puzzle) {
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
				let user_plays = $('#user_plays .featured-tag-value')
				user_plays.html(parseInt(user_plays.html()) + 1)
				
				//fastest solve
				let user_fastest = $('#user_fastest .featured-tag-value')
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

function index_load_work_text(work_id, dest_selector) {
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