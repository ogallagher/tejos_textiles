/*
index.js
Owen Gallagher
26 july 2019
*/

let featured_puzzle
let account //see sessionclient:Account class
let user_rating

window.onload = function() {
	//fetch puzzles from db and insert into page
	dbclient_fetch_puzzles(puzzles_onload)
	
	//enable featured card widgets
	index_featured_authors()
	index_featured_date()
	index_featured_stars()
	
	//import navbar and footer
	html_imports('navbar','#import_navbar')
	html_imports('footer','#import_footer')
	
	//import login modal
	html_imports('login','#import_login', function() {
		//assign login callback
		login_on_login = index_on_login
		
		//load account
		sessionclient_get_account(index_on_login)
	})
}

function index_on_login(account_info) {
	account = account_info
	
	//toggle nav account button as account page link or login form
	toggle_nav_account((account == null))
	
	if (account) {
		console.log('index: account set to ' + account.username)
		
		//update featured puzzle rating to reflect this account's opinion
		if (featured_puzzle) {
			dbclient_fetch_user_rating(account.username, featured_puzzle.id, function(data) {
				if (data) {
					user_rating = data.rating
					$('#featured_rating').mouseleave()
				}
			})
		}
	}
}

//when a puzzle is loaded from dbclient, add it to the document and make it interactive
function puzzles_onload(dbdata) {
	//bind puzzles to list
	let domlist = $('#puzzles_list')
	
	//load textile template
	html_imports('textile_row', function(jstring) {
		//load puzzle data from db and add puzzles
		let puzzle,jpuzzle
		
		dbdata.forEach(function (p) {
			puzzle = new Puzzle(p) //see puzzle.js
			puzzle.onComplete = index_puzzle_on_complete //handle puzzle completion
			
			jpuzzle = $(jstring)
			jpuzzle.find('.textile-row-card').attr('id',puzzle.id)
			jpuzzle.find('.textile-row-title').html(puzzle.title)
			
			domlist.append(jpuzzle) //add to list
		})
		
		//feature the most recent puzzle
		let ftitle = $('#featured_title')
		let fdate = $('#featured_date')
		let fcanvas = $('#featured_puzzle')[0]
		let fauthor = $('#featured_author')
		let frating = $('#featured_rating')
		let fcontainer = $('#featured_container')[0]
		
		if (puzzle) {
			featured_puzzle = puzzle
			
			featured_puzzle.feature(ftitle,fdate,fcanvas,fauthor,frating,fcontainer)
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
	})
}

//handle interaction with featured star buttons
function index_featured_stars() {
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
	
	//if not logged in, store play cookie and toast to login to save progress
	
	//update db.plays submit username,puzzle,duration
	
	//load fragment reader; shows literature contained in the puzzle
}