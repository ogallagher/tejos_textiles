/*
index.js
Owen Gallagher
26 july 2019
*/

let featured_puzzle

window.onload = function() {
	dbclient_onload.then(function() {
		dbclient_fetch_puzzles(puzzles_onload)
	})
	
	index_featured_authors()
	index_featured_date()
	index_featured_stars()
	
	html_imports('navbar','#import_navbar')
	html_imports('footer','#import_footer')
}

function puzzles_onload(dbdata) {
	//bind puzzles to list
	let domlist = $('#puzzles_list')
	
	//load textile template
	html_imports('textile_index', function(jstring) {
		//load puzzle data from db and add puzzles
		let puzzle,jpuzzle
		
		dbdata.forEach(function (p) {
			puzzle = new Puzzle(p)
			
			jpuzzle = $(jstring)
			jpuzzle.find('.textile-index-card').attr('id',puzzle.id)
			jpuzzle.find('.textile-index-title').html(puzzle.title)
			
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
		
			window.onresize = function() {
				console.log(fcontainer)
				featured_puzzle.resize(fcontainer)
			}
		}
	})
}

//handle interaction with featured star buttons
function index_featured_stars() {
	//list of star buttons
	var rating = $('#featured_rating')
	var stars = rating.children()
	var one = $('#featured_rating_1')
	var two = $('#featured_rating_2')
	var three = $('#featured_rating_3')
	var four = $('#featured_rating_4')
	var five = $('#featured_rating_5')
	var r = 0
	
	rating.mousemove(function(event) {
		var offset = one.offset()
		var x = event.pageX - offset.left
		
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
	})
	
	rating.click(function(event) {
		alert('rating = ' + Math.floor(r+1))
	})
}

//handle interaction with featured author buttons
function index_featured_authors() {
	var authors = $('#featured_authors').children()
	
	authors.click(function(event) {
		var author = $(this).html().trim()
		
		$(this).html(author + ' *')
	})
}

function index_featured_date() {
	var date_button = $('#featured_date')
	
	date_button.click(function(event) {
		var date = date_button.html()
		
		date_button.html(date + '-*')
	})
}