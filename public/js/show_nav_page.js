/*
show_nav_page.js
Owen Gallagher
14 december 2019
*/

/*

This highlights the given page's link in the navbar by making it a solid background 
and not clickable.

*/
function show_nav_page(page) {
	let navbtn = $('#nav_' + page)
	
	navbtn.removeClass('btn-outline-dark')
	navbtn.addClass('btn-dark').addClass('disabled')
}