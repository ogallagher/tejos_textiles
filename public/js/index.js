/*
index.js
Owen Gallagher
26 july 2019
*/

window.onload = function() {
	dbclient_onload.then(function() {
		dbclient_fetchPuzzles(puzzle_onload);
	});
	
	index_featuredStars();
	
	html_imports_onload();
}

window.onresize = function() {
	puzzle_onresize();
}

//handle interaction with featured star buttons
function index_featuredStars() {
	//list of star buttons
	var rating = $('#featured_rating');
	var stars = rating.children();
	var one = $('#featured_rating_1');
	var two = $('#featured_rating_2');
	var three = $('#featured_rating_3');
	var four = $('#featured_rating_4');
	var five = $('#featured_rating_5');
	
	rating.mousemove(function(event) {
		var offset = one.offset();
		var x = event.pageX - offset.left;
		
		var r = x / $(this).width();
		
		stars.removeClass('text-warning').addClass('text-gray');
		
		one.removeClass('text-gray').addClass('text-warning');
		if (r > 1/5) {
			two.removeClass('text-gray').addClass('text-warning');
		}
		if (r > 2/5) {
			three.removeClass('text-gray').addClass('text-warning');
		}
		if (r > 3/5) {
			four.removeClass('text-gray').addClass('text-warning');
		}
		if (r > 4/5) {
			five.removeClass('text-gray').addClass('text-warning');
		}
	});
	
	rating.mouseleave(function() {
		stars.removeClass('text-warning').addClass('text-gray');
	});
}