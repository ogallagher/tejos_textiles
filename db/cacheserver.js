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

exports.init = function(callback) {
	//get config from heroku env vars
	if (process.env.MEMCACHEDCLOUD_SERVERS) {
		config.host = process.env.MEMCACHEDCLOUD_SERVERS
		config.user = process.env.MEMCACHEDCLOUD_USERNAME
		config.pass = process.env.MEMCACHEDCLOUD_PASSWORD
	}
	else {
		config.host = 'memcached-12580.c10.us-east-1-3.ec2.cloud.redislabs.com:12580'	//TODO remove this
		config.user = 'memcached-app140929017'
		config.pass = '2R5u4FsY7FhnlzqVWCdRZKleFXI7IySj'
	}
	
	cache = memjs.Client.create(config.host, {
		username: config.user,
		password: config.pass
	})
	
	if (cache) {
		callback()
	}
	else {
		console.log('error: cache server initialization failed')
	}
}

exports.set = function(key,value) {
	if (key) {
		cache.set(key,value, {
			expires: 600
		}, function(err) {
			if (err) {
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
