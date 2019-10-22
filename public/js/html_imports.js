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

const imports_dir = 'components/';
const imports = [
	{
		name: 'navbar',
		url: 'navbar.html'
	},
	{
		name: 'footer',
		url: 'footer.html'
	}
];

function html_imports(name,dest) {
	var component = imports.find(function(c) {
		return c.name == name;
	});
	
	if (component) {
		$.get({
			url: imports_dir + component.url, 
			success: function(component) {
				$('#' + dest).html(component);
			}, 
			error: function(err) {
				console.log(err);
			},
			dataType: 'html'
		});
	}
}