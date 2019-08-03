/*
index.js
Owen Gallagher
26 july 2019
*/

window.onload = function() {
	dbclient_onload.then(function() {
		var cols = dbclient_db.puzzles;
		var projection = [
			cols.id,
			cols.title,
			cols.date,
			cols.forecolor,
			cols.backcolor,
			cols.textcolor,
			cols.preview
		];
		
		dbclient_fetchPuzzles(projection,puzzle_onload);
	});
}

window.onresize = function() {
	puzzle_onresize();
}