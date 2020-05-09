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
const imports = [
	'navbar',
	'footer',
	'textile_row',
	'textile_thumbnail',
	'login',
	'featured_tag',
	'link_row'
];

/*

This uses javascript and my CORS-enabled server to import components from the components folder into
a given page location.

Args:
	name = component name
	dest = either the jquery selector for destination elements to which to append, or a callback to handle the component string
	callback = either undefined or a method to execute on completion

*/
function html_imports(name,dest,callback) {
	//return the element from imports[] where the element string matches name
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
				
				if (callback) {
					callback()
				}
			}, 
			error: function(err) {
				console.log(err)
			},
			dataType: 'html'
		});
	}
}