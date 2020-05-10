const XSS_REPLACEMENTS = {
	'&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
}

function string_utils_xss_escape(string) {
	return string.replace(/[&<>]/g, function(xss_char) {
		return XSS_REPLACEMENTS[xss_char] || xss_char
	})
}