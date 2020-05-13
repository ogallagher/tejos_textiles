/*

cacheserver.js
Owen Gallagher
9 december 2019

Works in tandem with the SQL server, supporting a subset of db data from a cache for quicker fetching of frequently retrieved data.
*/

const memjs = require('memjs')

let config = {
	host: null,
	user: null,
	pass: null
}

let cache
let saved_key

exports.init = function() {
	return new Promise(function(resolve,reject) {
		//get config from heroku env vars
		if (process.env.MEMCACHEDCLOUD_SERVERS) {
			config.host = process.env.MEMCACHEDCLOUD_SERVERS
			config.user = process.env.MEMCACHEDCLOUD_USERNAME
			config.pass = process.env.MEMCACHEDCLOUD_PASSWORD
			
			cache = memjs.Client.create(config.host, {
				username: config.user,
				password: config.pass
			})
		
			if (cache) {
				exports.set('test_key', 'test_value', function(err) {
					if (err) {
						console.log('error: cache server failed to set test_key')
						console.log(err)
						cache = null
						reject()
					}
					else {
						resolve()
					}
				})
			}
			else {
				console.log('error: cache server connection failed')
				reject()
			}
		}
		else {
			reject()
		}
	})
}

exports.set = function(key,value,callback) {
	if (key && cache) {
		cache.set(key,value, {
			expires: 600
		}, function(err) {
			if (callback) {
				callback(err)
			}
			else if (err) {
				console.log('error: cache server could not add entry for ' + key)
				console.log(err)
			}
			else {
				console.log('cache server added entry for ' + key)
			}
		})
	}
	else {
		console.log('error: cache server could not set ' + key + ',' + value)
	}
}

exports.get = function(key) {
	return new Promise(function(resolve,reject) {
		if (cache) {
			if (key) {
				cache.get(key, function(err, value) {
					if (err || !value) {
						reject('cache server did not find an entry for ' + key)
					}
					else {
						resolve(value)
					}
				})
			}
			else {
				reject('error: cache server cannot get null key')
			}
		}
		else {
			reject('error: cache server never connected')
		}
	})
}

/*
If we know that we will want to set a new entry soon, but will not know the key when the value is found.
Remember the key, then update with the value.
*/
exports.save_key = function(key) {
	saved_key = key
}

/*
Used in tandem with save_key(). Calls set with the saved key.
Also unsets saved_key, so entry cannot be updated twice without resaving the key.
*/
exports.set_saved = function(value) {
	if (saved_key) {
		exports.set(saved_key, value)
		saved_key = null
	}
}
