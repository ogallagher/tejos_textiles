/*

Owen Gallagher
9 Oct 2019
Web Programming

html_imports.js

DEPENDENCIES
jquery

DESCRIPTION
Imports elements defined in other pages

*/

const imports = [
	{
		url: 'components/navbar.html',
		dest: 'import_navbar'
	}
];

function html_import(importer) {
	$.get({
		url: importer.url, 
		success: function(component) {
			$('#' + importer.dest).html(component);
		}, 
		error: function(err) {
			console.log(err);
		},
		dataType: 'html'
	});
}

function html_imports_onload() {
	imports.forEach(html_import);
}