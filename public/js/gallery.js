/*
gallery.js
Owen Gallagher
6 December 2019
*/

const THUMBNAIL_WIDTH = 200
const TOP_RATED_COUNT = 15
const EDITORS_CHOICE_COUNT = 15
const TOP_PLAYED_COUNT = 15

let scroll_view_size = 5
let jwindow

let top_rated_container
let jtops
let top_rated_scroll

let choice_container
let jchoices
let choice_scroll

let top_played_container
let jpops
let top_played_scroll

let search_input, search_button

let puzzle_list //dom container with puzzles
let puzzles		//Puzzle array
let jpuzzle_str //html template for textile_row component

window.onload = function() {
	force_https()
	
	//load navbar
	html_imports('navbar', '#import_navbar', function() {
		//import login modal
		html_imports('login','#import_login', function() {
			navbar_onload('gallery')
			
			//assign login callbacks
			login_on_login = gallery_on_login
		
			//load account
			sessionclient_get_account(gallery_on_login)
		})
	})
	
	//load footer
	html_imports('footer', '#import_footer')

	//load the textile thumbnail component html string, and pass it through load_collections
	html_imports('textile_thumbnail',load_collections)
	
	search_input = $('#search_input')
	//activate a search when the ENTER key is typed
	search_input.on('keyup', function (e) {
        if (e.which === 13) { //13 = newline
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            search_gallery();
        }
    });
	
	search_button = $('#search_button')
	//enable the search button
	search_button.click(search_gallery)
	
	//enable orderby button
	$('#orderby_menu').children().click(function() {
		let col = $(this).html().toLowerCase()
		
		//update label to show orderby choice
		$('#orderby').html(col)
		
		//do sort
		order_gallery(col)
	})
	
	puzzle_list = $('#puzzle_list')
	puzzles = []
	
	//load textile_row component
	html_imports('textile_row', function(jstring) {
		jpuzzle_str = jstring
		
		//get all puzzles
		dbclient_fetch_puzzles(load_search_results)
	})
	
	//manually handle collection flexbox behavior at different screen breakpoints
	jwindow = $(window).resize(on_window_resize)
	
	//update scroll_view_size
	if (jwindow.width() < 555) {
		scroll_view_size = 3
	}
	else if (jwindow.width() < 700) {
		scroll_view_size = 4
	}
	else {
		scroll_view_size = 5
	}
}

function gallery_on_login(account_info) {
	//toggle nav account button as account page link or login form
	navbar_toggle_account(account_info)
}

function load_collections(thumbnail) {
	let star = '<span class="oi oi-star text-warning"></span>'
	
	dbclient_fetch_collection(COLLECTION_TOP_RATED, TOP_RATED_COUNT, function(tops) {
		let coll_top_rated = $('#collection_top_rated')
		top_rated_container = $('#top_rated')
		top_rated_scroll = 0
		
		let tops_n = tops.length
		jtops = []
		
		tops.forEach(function(rtop) {
			let jtop = $(thumbnail)
			.attr('data-puzzle-id',rtop.id)
			
			jtop.find('.textile-thumbnail-title').html(rtop.title)
			
			jtop.find('.textile-thumbnail-date').html(string_utils_date(rtop.date))
			
			let stars = ''
			for (let i=0; i<rtop.rating; i++) {
				stars += star
			}
			jtop.find('.textile-thumbnail-rating').html(stars)
			
			jtops.push(jtop)
		})
		
		coll_top_rated.find('.scroll-left').click(function() {
			top_rated_scroll = circular_offset(top_rated_scroll, -scroll_view_size, tops_n)
			update_collection(top_rated_container, jtops, top_rated_scroll)
		})

		coll_top_rated.find('.scroll-right').click(function() {
			top_rated_scroll = circular_offset(top_rated_scroll, scroll_view_size, tops_n)
			update_collection(top_rated_container, jtops, top_rated_scroll)
		})

		update_collection(top_rated_container, jtops, top_rated_scroll)
	})
	
	dbclient_fetch_collection(COLLECTION_EDITORS_CHOICE, EDITORS_CHOICE_COUNT, function(choices) {
		let coll_choice = $('#collection_editors_choice')
		choice_container = $('#editors_choice')
		choice_scroll = 0
		
		let choices_n = choices.length
		jchoices = []
		
		choices.forEach(function(choice) {
			let jchoice = $(thumbnail)
			.attr('data-puzzle-id',choice.id)
			
			jchoice.find('.textile-thumbnail-title').html(choice.title)
			
			jchoice.find('.textile-thumbnail-date').html(string_utils_date(choice.date))
			
			let stars = ''
			for (let i=0; i<choice.rating; i++) {
				stars += star
			}
			jchoice.find('.textile-thumbnail-rating').html(stars)
			
			jchoices.push(jchoice)
		})
		
		coll_choice.find('.scroll-left').click(function() {
			choice_scroll = circular_offset(choice_scroll, -scroll_view_size, choices_n)
			update_collection(choice_container, jchoices, choice_scroll)
		})
		
		coll_choice.find('.scroll-right').click(function() {
			choice_scroll = circular_offset(choice_scroll, scroll_view_size, choices_n)
			update_collection(choice_container, jchoices, choice_scroll)
		})
		
		update_collection(choice_container, jchoices, choice_scroll)
	})
	
	dbclient_fetch_collection(COLLECTION_TOP_PLAYED, TOP_PLAYED_COUNT, function(pops) {
		let coll_pops = $('#collection_top_played')
		top_played_container = $('#top_played')
		top_played_scroll = 0
		
		let pops_n = pops.length
		jpops = []
		
		pops.forEach(function(pop) {
			let jpop = $(thumbnail)
			.attr('data-puzzle-id',pop.id)
			
			jpop.find('.textile-thumbnail-title').html(pop.title)
			
			jpop.find('.textile-thumbnail-date').html(string_utils_date(pop.date))
			
			let stars = ''
			for (let i=0; i<pop.rating; i++) {
				stars += star
			}
			jpop.find('.textile-thumbnail-rating').html(stars)
			
			jpops.push(jpop)
		})
		
		coll_pops.find('.scroll-left').click(function() {
			top_played_scroll = circular_offset(top_played_scroll, -scroll_view_size, pops_n)
			update_collection(top_played_container, jpops, top_played_scroll)
		})
		
		coll_pops.find('.scroll-right').click(function() {
			top_played_scroll = circular_offset(top_played_scroll, scroll_view_size, pops_n)
			update_collection(top_played_container, jpops, top_played_scroll)
		})
		
		update_collection(top_played_container, jpops, top_played_scroll)
	})
}

function on_window_resize() {
	let new_size = 5
	
	if (jwindow.width() < 555) {
		new_size = 3
	}
	else if (jwindow.width() < 700) {
		new_size = 4
	}
	
	if (new_size != scroll_view_size) {
		scroll_view_size = new_size
		
		update_collection(top_rated_container,jtops,top_rated_scroll)
		update_collection(choice_container,jchoices,choice_scroll)
		update_collection(top_played_container,jpops,top_played_scroll)
	}
}

//scroll the collection horizontally
function update_collection(container, collection, base) {
	container.empty()
	let collection_n = collection.length
	
	for (let i=0; i<scroll_view_size; i++) {
		container.append(collection[base])
		
		base = circular_offset(base, 1, collection_n)
	}
}

//my implementation of circular indexes in the collection lists
function circular_offset(base, offset, max) {
	let wrap = scroll_view_size
	if (max > scroll_view_size) {
		wrap = max
	}
	
	base += offset
	
	if (base >= wrap) {
		base = base - wrap
	}
	if (base < 0) {
		base = base + wrap
	}
	
	return base
}

function search_gallery() {
    var search_val = search_input.val().toString().toLowerCase();
    console.log('searching gallery for ' + search_val);
	
    if (search_val != '') {
        var search_vals = search_val.split(/[\s,]+/);
		
        //send search query
		dbclient_fetch_search(search_vals, load_search_results)
    }
	else {
		//get all puzzles
		dbclient_fetch_puzzles(load_search_results)
	}
}

function load_search_results(results) {
	//clear puzzles array
	puzzles = []
	
    //clear old results
	puzzle_list.empty()
	
    //show search results
	results.forEach(function(pstring) {
		let puzzle = new Puzzle(pstring)
		puzzles.push(puzzle)
		
		let jpuzzle = $(jpuzzle_str)
		
		jpuzzle.find('.textile-row-card')
		.attr('data-puzzle-id',puzzle.id)
		.attr('data-target', '#puzzle_details_' + puzzle.id)
		
		jpuzzle.find('.textile-row-title').html(puzzle.title)
		
		jpuzzle.find('.textile-row-details')
		.prop('id', 'puzzle_details_' + puzzle.id)
		
		jpuzzle.find('.textile-row-date')
		.html(string_utils_date(puzzle.date))
		
		jpuzzle.find('.textile-row-rating')
		.html(puzzle.rating)
		
		jpuzzle.find('.textile-row-plays')
		.html(puzzle.plays)
		
		jpuzzle.find('.textile-row-play')
		.prop('href', 'textile.html?puzzle_id=' + puzzle.id)
		
		puzzle_list.append(jpuzzle)
	})
}

function order_gallery(sort_col) {
	//sort puzzles
	switch (sort_col) {
		case 'date':
			puzzles = puzzles.sort(Puzzle.compare_date)
			break
			
		case 'title':
			puzzles = puzzles.sort(Puzzle.compare_title)
			break
			
		case 'rating':
			puzzles = puzzles.sort(Puzzle.compare_rating)
			break
			
		case 'popularity':
			puzzles = puzzles.sort(Puzzle.compare_popularity)
			break
			
		default:
			console.log('error: cannot sort on column ' + sort_col)
			break
	}
	
    //clear old results
	puzzle_list.empty()
	
	//update puzzles list
	for (let puzzle of puzzles) {
		let jpuzzle = $(jpuzzle_str)
		
		jpuzzle.find('.textile-row-card')
		.attr('data-puzzle-id',puzzle.id)
		.attr('data-target', '#puzzle_details_' + puzzle.id)
		
		jpuzzle.find('.textile-row-title').html(puzzle.title)
		
		jpuzzle.find('.textile-row-details')
		.prop('id', 'puzzle_details_' + puzzle.id)
		
		jpuzzle.find('.textile-row-date')
		.html(string_utils_date(puzzle.date))
		
		jpuzzle.find('.textile-row-rating')
		.html(puzzle.rating)
		
		jpuzzle.find('.textile-row-plays')
		.html(puzzle.plays)
		
		jpuzzle.find('.textile-row-play')
		.prop('href', 'textile.html?puzzle_id=' + puzzle.id)
		
		puzzle_list.append(jpuzzle)
	}
}

function puzzle_thumb_mouseenter(self) {
	self.find('.textile-thumbnail-details').show()
}

function puzzle_thumb_mouseleave(self) {
	self.find('.textile-thumbnail-details').hide()
}

function puzzle_thumb_click(self) {
	let puzzle_id = self.attr('data-puzzle-id')
	window.location.href = 'textile.html?puzzle_id=' + puzzle_id
}
