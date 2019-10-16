/*
index.js
Owen Gallagher
26 july 2019
*/

window.onload = function() {
	dbclient_onload.then(function() {
		dbclient_fetchPuzzles(puzzle_onload);
	});
	
	index_featured_authors();
	index_featured_date();
	index_featured_stars();
	
	html_imports_onload();
}

window.onresize = function() {
	puzzle_onresize();
}

//handle interaction with featured star buttons
function index_featured_stars() {
	//list of star buttons
	var rating = $('#featured_rating');
	var stars = rating.children();
	var one = $('#featured_rating_1');
	var two = $('#featured_rating_2');
	var three = $('#featured_rating_3');
	var four = $('#featured_rating_4');
	var five = $('#featured_rating_5');
	var r = 0;
	
	rating.mousemove(function(event) {
		var offset = one.offset();
		var x = event.pageX - offset.left;
		
		r = (x / $(this).width()) * 5;
		
		stars.removeClass('text-warning').addClass('text-gray');
		
		one.removeClass('text-gray').addClass('text-warning');
		if (r > 1) {
			two.removeClass('text-gray').addClass('text-warning');
		}
		if (r > 2) {
			three.removeClass('text-gray').addClass('text-warning');
		}
		if (r > 3) {
			four.removeClass('text-gray').addClass('text-warning');
		}
		if (r > 4) {
			five.removeClass('text-gray').addClass('text-warning');
		}
	});
	
	rating.mouseleave(function() {
		r = 0;
		stars.removeClass('text-warning').addClass('text-gray');
	});
	
	rating.click(function(event) {
		alert('rating = ' + Math.floor(r+1));
	})
}

//handle interaction with featured author buttons
function index_featured_authors() {
	var authors = $('#featured_authors').children();
	
	authors.click(function(event) {
		var author = $(this).html().trim();
		
		$(this).html(author + ' *');
	});
}

function index_featured_date() {
	var date_button = $('#featured_date');
	
	date_button.click(function(event) {
		var date = date_button.html();
		
		date_button.html(date + '-*');
	});
}