/*

cacheserver.js
Owen Gallagher
9 december 2019

Works in tandem with the SQL server, supporting a subset of db data from a cache for quicker fetching of frequently retrieved data.
*/

//external libs
const memjs = require('memjs')
const enums = require('../enums')
const brotli_compress = require('brotli/compress')
const brotli_decompress = require('brotli/decompress')

//internal consts
const expirations = {
	puzzles: enums.time.DAY / 1000,
	paths_x: enums.time.YEAR / 1000,
	collection_top_rated: enums.time.DAY / 1000,
	collection_editors_choice: enums.time.WEEK / 1000,
	collection_top_played: enums.time.DAY / 1000
}

//internal vars
let config = {
	host: null,
	user: null,
	pass: null
}

let brotli_config = {
	mode: 1,
	quality: 8
}

let cache
let saved_key

//external methods
exports.init = function() {
	return new Promise(function(resolve,reject) {
		//get config from heroku env vars
		if (process.env.MEMCACHED_SERVER) {
			config.host = process.env.MEMCACHED_SERVER
			
			cache = memjs.Client.create(config.host, {
				keepAlive: true
			})
			
			if (cache) {
				exports.set('test_key', 'test_value', 600, function(err) {
					if (err) {
						console.log('error cache server failed to set test_key')
						console.log(err)
						cache.quit()
						cache = null
						reject()
					}
					else {
						resolve()
					}
				})
			}
			else {
				console.log('error cache server connection failed')
				reject()
			}
		}
		else {
			reject()
		}
	})
}

exports.set = function(key,value,expiry,callback) {
	if (key && cache && value) {
		cache.set(key, value, {
			expires: expiry //seconds after which the cache entry expires
		}, 
		function(err) {
			if (callback) {
				callback(err)
			}
			else if (err) {
				console.log('error cache server could not add entry for ' + key)
				console.log(err)
			}
			else {
				console.log('debug cache server set ' + key)
			}
		})
	}
	else {
		console.log('error cache server could not set ' + key + ',' + value)
	}
}

exports.get = function(key) {
	return new Promise(function(resolve,reject) {
		if (cache) {
			if (key) {
				cache.get(key, function(err, value) {
					if (err || !value) {
						reject('cache server found no entry for ' + key)
					}
					else {
						if (key.match(/paths_.+/)) {
							//decompress large puzzle paths entry
							value = JSON.parse(Buffer.from(brotli_decompress(value)).toString('utf-8'))
						}
						
						resolve(value)
					}
				})
			}
			else {
				reject('error cache server cannot get null key')
			}
		}
		else {
			reject('error cache server never connected')
		}
	})
}

/*
If we know that we will want to set a new entry soon, but will not know the key when the value is found.
Remember the key, then update with the value.
*/
exports.save_key = function(key) {
	if (cache) {
		saved_key = key
	}
}

/*
Used in tandem with save_key(). Calls set with the saved key.
Also unsets saved_key, so entry cannot be updated twice without resaving the key.
*/
exports.set_saved = function(value,callback) {
	if (saved_key && cache) {
		let expiry =  10 * enums.time.MINUTE / 1000
		
		if (saved_key == 'puzzles') {
			expiry = expirations.puzzles
		}
		else if (saved_key.match(/paths_.+/)) {
			expiry = expirations.paths_x
			
			//compress large puzzle paths string memcached entry size limit = 1MB
			value = brotli_compress(Buffer.from(JSON.stringify(value),'utf-8'), brotli_config)
		}
		else if (saved_key == 'collection_top_rated') {
			expiry = expirations.collection_top_rated
		}
		else if (saved_key == 'collection_editors_choice') {
			expiry = expirations.collection_editors_choice
		}
		else if (saved_key == 'collection_top_played') {
			expiry = expirations.collection_top_played
		}
		
		exports.set(saved_key, value, expiry, callback)
		saved_key = null
	}
}
