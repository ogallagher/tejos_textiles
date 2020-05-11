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
