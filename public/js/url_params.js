/*
url_params.js
Owen Gallagher
9 May 2020
*/

let url_query = window.location.search.substring(1) //ignore initial question mark
let url_params = {}

if (url_query.indexOf('&') != -1) {
	url_query = url_query.split('&')
	
	for (let i=0; i<url_query.length; i++) {
		let entry = url_query[i].split('=')
		
		url_params[entry[0]] = entry[1]
	}
}
else {
	let entry = url_query.split('=')
	
	url_params[entry[0]] = decodeURIComponent(entry[1])
}

function url_params_get(key) {
	return url_params[key]
}