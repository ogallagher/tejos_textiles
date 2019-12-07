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

const imports_dir = 'components/'
const imports = ['navbar','footer','textile_row','textile_thumbnail'];

function html_imports(name,dest) {
	var component = imports.find(function(c) {
		return c == name
	});
	
	if (component) {
		$.get({
			url: imports_dir + component + '.html', 
			success: function(component) {
				if (typeof dest == 'string') {
					$(dest).append(component)
				}
				else {
					dest(component)
				}
			}, 
			error: function(err) {
				console.log(err)
			},
			dataType: 'html'
		});
	}
}