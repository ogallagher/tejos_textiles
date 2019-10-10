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
	var stars = $('#featured_rating').children();
	var one = $('#featured_rating_1');
	var two = $('#featured_rating_2');
	var three = $('#featured_rating_3');
	var four = $('#featured_rating_4');
	var five = $('#featured_rating_5');
	
	one.mouseenter(function() {
		one.removeClass('text-gray').addClass('text-warning');
	}).mouseleave(function() {
		stars.removeClass('text-warning').addClass('text-gray');
	});
	
	two.mouseenter(function() {
		one.removeClass('text-gray').addClass('text-warning');
		two.removeClass('text-gray').addClass('text-warning');
	}).mouseleave(function() {
		stars.removeClass('text-warning').addClass('text-gray');
	});
	
	three.mouseenter(function() {
		one.removeClass('text-gray').addClass('text-warning');
		two.removeClass('text-gray').addClass('text-warning');
		three.removeClass('text-gray').addClass('text-warning');
	}).mouseleave(function() {
		stars.removeClass('text-warning').addClass('text-gray');
	});
	
	four.mouseenter(function() {
		one.removeClass('text-gray').addClass('text-warning');
		two.removeClass('text-gray').addClass('text-warning');
		three.removeClass('text-gray').addClass('text-warning');
		four.removeClass('text-gray').addClass('text-warning');
	}).mouseleave(function() {
		stars.removeClass('text-warning').addClass('text-gray');
	});
	
	five.mouseenter(function() {
		stars.removeClass('text-gray').addClass('text-warning');
	}).mouseleave(function() {
		stars.removeClass('text-warning').addClass('text-gray');
	});
}