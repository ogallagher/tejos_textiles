/*
index.js
Owen Gallagher
26 july 2019
*/

let featured_puzzle

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
	var rating = $('#featured_rating')
	var stars = rating.children()
	var one = $('#featured_rating_1')
	var two = $('#featured_rating_2')
	var three = $('#featured_rating_3')
	var four = $('#featured_rating_4')
	var five = $('#featured_rating_5')
	var r = 0
	
	//select stars from one until the one under the cursor
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
	
	//TODO update db tables with new rating
	rating.click(function(event) {
		alert('TODO rating = ' + Math.floor(r+1))
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