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
	let url_params = window.location.search.substring(1) //ignore initial question mark
	let puzzle_id
	
	if (url_params.indexOf('&') != -1) {
		url_params = url_params.split('&')
		
		for (let i=0; i<url_params.length && puzzle_id !== undefined; i++) {
			let entry = url_params[i].split('=')
		
			if (entry[0] == 'puzzle_id') {
				puzzle_id = entry[1]
			}
		}
	}
	else {
		let entry = url_params.split('=')
		
		if (entry[0] == 'puzzle_id') {
			puzzle_id = entry[1]
		}
	}
	
	if (puzzle_id !== undefined) {
		console.log('loading textile ' + puzzle_id)
		
		dbclient_fetch_puzzle(puzzle_id, function(dbdata) {
			$('#title').html(dbdata.title)
			
			let puzzle_title = $('#featured_title')
			let puzzle_date = $('#featured_date')
			let puzzle_canvas = $('#featured_puzzle')[0]
			let puzzle_author = $('#featured_author')
			let puzzle_rating = $('#featured_rating')
			let puzzle_container = $('#featured_container')[0]
			
			//load metadata
			puzzle = new Puzzle(dbdata)
			
			//load graphics
			puzzle.feature(puzzle_title,puzzle_date,puzzle_canvas,puzzle_author,puzzle_rating,puzzle_container)
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