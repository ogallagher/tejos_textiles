/*
gallery.js
Owen Gallagher
6 December 2019
*/

const THUMBNAIL_WIDTH = 200
const TOP_RATED_COUNT = 15
const EDITORS_PICKS_COUNT = 15
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

let puzzle_list

window.onload = function() {
	//load navbar
	html_imports('navbar', '#import_navbar', function() {
		navbar_onload('gallery')
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
	
	let orderby = $('#orderby')
	let orderby_options = $('#orderby_menu').children()
	//update the orderby label to match the selected option
	orderby_options.click(function() {
		orderby.html($(this).html().toLowerCase())
	})
	
	puzzle_list = $('#puzzle_list')
	
	//get all puzzles
	dbclient_fetch_puzzles(load_search_results)
	
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

function load_collections(thumbnail) {
	dbclient_fetch_collection(COLLECTION_TOP_RATED, TOP_RATED_COUNT, function(tops) {
		let coll_top_rated = $('#collection_top_rated')
		top_rated_container = $('#top_rated')
		top_rated_scroll = 0
		
		let tops_n = tops.length
		jtops = []
		
		tops.forEach(function(top) {
			let ptop = new Puzzle(top)
			let jtop = $(thumbnail)
			
			jtop.find('.textile-thumbnail-title').html(ptop.title)
			
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
	
	//TODO test editor's choice when puzzle.featured exists
	/*
	dbclient_fetch_collection(COLLECTION_EDITORS_CHOICE, EDITORS_PICKS_COUNT, function(choices) {
		let coll_choice = $('#collection_editors_choice')
		choice_container = $('#editors_choice')
		choice_scroll = 0
		
		let choices_n = choices.length
		jchoices = []
		
		choices.forEach(function(choice) {
			let pchoice = new Puzzle(choice)
			let jchoice = $(thumbnail)
			
			jchoice.find('.textile-thumbnail-title').html(pchoice.title)
			
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
	*/
	
	dbclient_fetch_collection(COLLECTION_TOP_PLAYED, TOP_PLAYED_COUNT, function(pops) {
		let coll_pops = $('#collection_top_played')
		top_played_container = $('#top_played')
		top_played_scroll = 0
		
		let pops_n = pops.length
		jpops = []
		
		pops.forEach(function(pop) {
			let ppop = new Puzzle(pop)
			let jpop = $(thumbnail)
			
			jpop.find('.textile-thumbnail-title').html(ppop.title)
			
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
		//update_collection(choice_container,jchoices,choice_scroll) TODO test choice once puzzle.featured is added to db
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

//TODO select the puzzle on click
function puzzle_thumb_click(clicked) {
	console.log('TODO select puzzle on click')
}

function search_gallery() {
    var search_val = search_input.val().toString().toLowerCase();
    console.log('searching gallery for ' + search_val);
	
    //clear old results
	$('#puzzle_list').empty()
	
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
	//import textile_row template
	html_imports('textile_row', function(jstring) {
	    //show search results
		let puzzle, jpuzzle
		results.forEach(function(pstring) {
			puzzle = new Puzzle(pstring)
			
			jpuzzle = $(jstring)
			jpuzzle.find('.textile-row-card').attr('id',puzzle.title)
			jpuzzle.find('.textile-row-title').html(puzzle.title)
			
			puzzle_list.append(jpuzzle.clone())
		})
	})
}
