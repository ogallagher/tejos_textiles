const XSS_REPLACEMENTS = {
	'&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
}

const TAG_REPLACEMENTS = {
	'\n': '<br>'
}

function string_utils_xss_escape(string) {
	return string.replace(/[&<>]/g, function(xss_char) {
		return XSS_REPLACEMENTS[xss_char] || xss_char
	})
}

function string_utils_tagify(string) {
	return string.replace(/[\n]/g, function(char) {
		return TAG_REPLACEMENTS[char] || char
	})
}

function string_utils_url(string) {
	//insert protocol
	if (string.indexOf('http://') == -1 && string.indexOf('https://') == -1) {
		string = 'https://' + string
	}
	
	return string
}

//TODO make bimodal for en/es
function string_utils_date(string) {
	let date = new Date(string)
	
	//day
	string = date.getDate() + ' '
	
	//month [0-11]
	switch (date.getMonth()) {
		case 0:
			string += 'Jan '
			break
			
		case 1:
			string += 'Feb '
			break
			
		case 2:
			string += 'Mar '
			break
			
		case 3:
			string += 'Apr '
			break
			
		case 4:
			string += 'May '
			break
			
		case 5:
			string += 'Jun '
			break
			
		case 6:
			string += 'Jul '
			break
			
		case 7:
			string += 'Aug '
			break
			
		case 8:
			string += 'Sept '
			break
			
		case 9:
			string += 'Oct '
			break
			
		case 10:
			string += 'Nov '
			break
			
		case 11:
			string += 'Dec '
			break
	}
	
	//year
	string += date.getFullYear()
	
	return string
}