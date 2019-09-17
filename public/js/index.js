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
		one.removeClass('has-text-grey-lighter').addClass('has-text-warning');
	}).mouseleave(function() {
		stars.removeClass('has-text-warning').addClass('has-text-grey-lighter');
	});
	
	two.mouseenter(function() {
		one.removeClass('has-text-grey-lighter').addClass('has-text-warning');
		two.removeClass('has-text-grey-lighter').addClass('has-text-warning');
	}).mouseleave(function() {
		stars.removeClass('has-text-warning').addClass('has-text-grey-lighter');
	});
	
	three.mouseenter(function() {
		one.removeClass('has-text-grey-lighter').addClass('has-text-warning');
		two.removeClass('has-text-grey-lighter').addClass('has-text-warning');
		three.removeClass('has-text-grey-lighter').addClass('has-text-warning');
	}).mouseleave(function() {
		stars.removeClass('has-text-warning').addClass('has-text-grey-lighter');
	});
	
	four.mouseenter(function() {
		one.removeClass('has-text-grey-lighter').addClass('has-text-warning');
		two.removeClass('has-text-grey-lighter').addClass('has-text-warning');
		three.removeClass('has-text-grey-lighter').addClass('has-text-warning');
		four.removeClass('has-text-grey-lighter').addClass('has-text-warning');
	}).mouseleave(function() {
		stars.removeClass('has-text-warning').addClass('has-text-grey-lighter');
	});
	
	five.mouseenter(function() {
		stars.removeClass('has-text-grey-lighter').addClass('has-text-warning');
	}).mouseleave(function() {
		stars.removeClass('has-text-warning').addClass('has-text-grey-lighter');
	});
}