/*

force_https.js
Owen Gallagher
7 May 2020

*/

const FORCE_HTTPS = false

/*
taken from https://stackoverflow.com/a/4723302/10200417
*/
function force_https() {
	if (FORCE_HTTPS) {
		let protocol = window.location.protocol
		
		if (protocol !== 'https:') {
			//replace location protocol to reload the page using encrypted traffic
			window.location.replace('https:' + window.location.href.substring(window.location.protocol.length));
		}
	}
}