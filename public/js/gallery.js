/*
gallery.js
Owen Gallagher
6 December 2019
*/

const thumbnail_width = 200
let scroll_view_size = 4

let top_rated_container
let jtops = []
let top_rated_scroll

window.onload = function() {
	html_imports('navbar', 'import_navbar')
	html_imports('footer', 'import_footer')

	load_collections()
	
	let jwindow = $(window)
	jwindow.resize(function() {
		let new_size = 4
		
		if (jwindow.width() < 555) {
			new_size = 3
		}
		
		if (new_size != scroll_view_size) {
			scroll_view_size = new_size
			
			update_collection(top_rated_container,jtops,top_rated_scroll)
		}
	})
}

function load_collections() {
	let coll_top_rated = $('#collection_top_rated')
	top_rated_container = $('#top_rated')
	top_rated_scroll = 0

	//TODO replace with db data
	let tops = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
	let tops_n = tops.length
	jtops = []
	tops.forEach(function(top) {
		//TODO replace with interactive puzzle thumbnails
		jtops.push($('<div class="bg-secondary-hover bg-primary-nohover text-light mx-1 clickable" style="width: 200px; height: 150px" onclick="puzzle_thumb_click($(this))">' + top + '</div>'))
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
	base += offset

	if (base >= max) {
		base = base - max
	}
	if (base < 0) {
		base = base + max
	}

	return base
}

function puzzle_thumb_click(clicked) {
	console.log(clicked.html())
}
