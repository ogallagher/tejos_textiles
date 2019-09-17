/*
index.js
Owen Gallagher
26 july 2019
*/

window.onload = function() {
	dbclient_onload.then(function() {
		dbclient_fetchPuzzles(puzzle_onload);
	});
}

window.onresize = function() {
	puzzle_onresize();
}