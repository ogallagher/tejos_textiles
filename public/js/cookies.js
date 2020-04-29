/*

cookies.js
Owen Gallagher
29 April 2020

*/

//config
const COOKIE_EXPIRATION = 24 * 60 * 60 * 1000

//cookies expire in 1 day
exports.set = function(key,val) {
    var date = new Date();
    date.setTime(date.getTime() + COOKIE_EXPIRATION);
    document.cookie = key + '=' + val + '; expires=' + date.toUTCString() + '; path=/';
}

exports.get = function(key) {
    var key_eq = key + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(key_eq) == 0) {
            return c.substring(key_eq.length, c.length);
        }
    }
    //no cookie found
    return null;
}

exports.delete = function(key) {
    document.cookie = key + '=; expires=-1; path=/';
}

exports.update = function(key,val) {
    if (val != null) {
        cookie_set(key,val);
		return val;
    }
    else {
        return cookie_get(key);
    }
}
