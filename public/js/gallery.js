/*
gallery.js
Owen Gallagher
6 December 2019
*/

const thumbnail_width = 200
let scroll_view_size = 4

let top_rated_container
let jtops
let top_rated_scroll

let choice_container
let jchoices
let choice_scroll

let search_input, search_button

window.onload = function() {
	html_imports('navbar', '#import_navbar')
	html_imports('footer', '#import_footer')

	html_imports('textile_thumbnail',load_collections)
	
	search_input = $('#search_input')
	search_input.on('keyup', function (e) {
        if (e.which === 13) { //13 = newline
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            search_gallery();
        }
    });
	
	search_button = $('#search_button')
	search_button.click(search_gallery)
	
	let orderby_options = $('#orderby_menu').children()
	orderby_options.click(function() {
		console.log($(this).html())
	})
	
	let jwindow = $(window)
	jwindow.resize(function() {
		let new_size = 4
		
		if (jwindow.width() < 555) {
			new_size = 3
		}
		
		if (new_size != scroll_view_size) {
			scroll_view_size = new_size
			
			update_collection(top_rated_container,jtops,top_rated_scroll)
			update_collection(choice_container,jchoices,choice_scroll)
		}
	})
}

function load_collections(thumbnail) {
	dbclient_onload.then(function() {
		dbclient_fetch_collection('top_rated', function(tops) {
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
		
		dbclient_fetch_collection('editors_choice', function(choices) {
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
	})
}

function update_collection(container, collection, base) {
	container.empty()
	let collection_n = collection.length
	
	for (let i=0; i<scroll_view_size; i++) {
		container.append(collection[base])
		
		base = circular_offset(base, 1, collection_n)
	}
}

function circular_offset(base, offset, max) {
	if (max > scroll_view_size) {
		base += offset
	
		if (base >= max) {
			base = base - max
		}
		if (base < 0) {
			base = base + max
		}
	}
	
	return base
}

function puzzle_thumb_click(clicked) {
	console.log(clicked.html())
}

function search_gallery() {
    var search_val = search_input.val().toString().toLowerCase();
    console.log('searching gallery for ' + search_val);
	
    if (search_val != '') {
        var search_vals = search_val.split(/[\s,]+/);
		
        //clear old results
		
        //search products
		
        //show search results
    }
}
