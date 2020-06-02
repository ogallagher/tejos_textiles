/*
dbserver.js
Owen Gallagher
26 july 2019

Exposes a connected mysql server to tejos//textiles clients via http.
*/

const fs = require('fs')
const mysql = require('mysql')

const enums = require('../enums')

const cacheserver = require('./cacheserver')

const PATH_DB_API = 'db/db_api.json'		 //accessed from server.js = from root dir
const PATH_DB_SCHEME = 'db/db_scheme.json'

const DB_TEJOS = 'db_revistatejos'
const DB_TEXTILES = 'db_textilesjournal'

var db //database connection object
var api //database api, for hiding actual sql from the client

exports.init = function(site) {	
	//get database connection credentials
	let config = null
	
	if (process.env.DATABASE_URL) {
		config = {
			url: process.env.DATABASE_URL, //url = mysql://user:password@host:3306/db
			user: null,
			pass: null,
			host: null,
			db: null,
			name: null
		} 
		
		let fields = config.url.split(/:|@/) //array = mysql //user password host 3306/db
		config.user = fields[1].substring(2)
		config.pass = fields[2]
		config.host = fields[3]
		config.db = fields[4].split('/')[1]
		
		if (site == enums.site.TEXTILES) {
			config.name = 'textilesdb'
		}
		else if (site == enums.site.TEJOS){
			config.name = 'tejosdb'
		}		
	}
	else {
		console.log('error: database credentials environment variables not found')
	}
	
	//connect to database
	if (config != null) {
		console.log('connecting to ' + config.name)
		
		//create connections pool
		db = mysql.createPool({
			host: config.host,
			user: config.user,
			password: config.pass,
			database: config.db,
			waitForConnections: true
		})
		
		//test a connection
		db.getConnection(function(err, connection) {
			if (err) {
				console.log('error: failed to connect to ' + config.host)
				console.log(err)
			}
			else {
				console.log('database connected')
				connection.release()
			}
		})
	}
	
	//init db api
	fs.readFile(PATH_DB_API, function(err,data) {
		if (err) {
			console.log('error: read from db api file failed: ' + err)
		}
		else {
			//read api file
			api = JSON.parse(data)
		}
	})
	
	//init cache server
	cacheserver.init()
		.then(function() {
			console.log('cache server initialized')
		})
		.catch(function() {
			console.log('error: cache server failed')
		})
}

exports.get_query = function(endpoint, args, is_external) {
	return new Promise(function(resolve,reject) {
		let cached = try_cache(endpoint, args)
		
		if (cached) {
			resolve({cached: cached})
		}
		else {
			let entry = api[endpoint]
			
			if (entry) {
				if (!is_external || entry.external) {
					//allow query if it's internal, or if external queries are allowed for this endpoint
					let params = entry.params //array of parameters to be replaced in query
					let query = entry.query //sql query to be assembled
					
					if (entry.special) {
						//double check against JS injection (XSS)
						let approved = true
						for (let arg of args) {
							let matches = arg.match(/[<>]/)
							if (matches) {
								approved = false
								console.log('suspicious: blocked possible xss attempt with db query arg: ')
								console.log(matches)
								reject('xss')
							}
						}
						
						if (approved) {
							//handle endpoints with special implementations
							if (endpoint == 'fetch_puzzles') {
								for (let i=0; i<params.length; i++) {
									let arg = args[i]
									if (isNaN(args[i])) {
										//is string, escaped
										arg = db.escape(arg)
									}
									//else, is number, directly inserted
							
									query = query.replace(params[i], arg)
								}
							
								let admin = args[0]
								if (admin == false || admin == 'false') {
									//is not admin, hide puzzles where puzzle.testing=1
									query = query.replace('?where?','where testing=0')
								}
								else {
									query = query.replace('?where?','')
								}
							}
							else if (endpoint == 'search_puzzles') {
								if (args) {
									//build where clause from compound regexp with relevant columns
									let columns = ['title','date']
									let regexps = []
								
									for (let column of columns) {
										//col regexp '.*((term_1)|(term_2)|...).*'
										let regexp = column + " regexp '.*("
								
										let terms = []
										for (let term of args) {
											terms.push('(' + term + ')')
										}
								
										regexp += terms.join('|') + ").*'"
										regexps.push(regexp)
									}
							
									query = query.replace('?regexps?', regexps.join(' or '))
								}
								else {
									//blank search; return all puzzles
									query = api['fetch_puzzles'].query
								}
							}
							else if (endpoint == 'search_all') {
								let regex = "'.*("
								
								let terms = []
								for (let term of args) {
									terms.push('(' + term + ')')
								}
								
								regex += terms.join('|') + ").*'"
								
								query = query.replace('?terms?', regex)
							}
							else if (endpoint == 'update_user') {
								//args = [username, photo, bio, links]
								let changes = []
								let go = false
							
								if (args[1]) {
									//update photo
									changes.push('photo=' + db.escape(args[1]))
									go = true
								}
								if (args[2]) {
									//update bio
									changes.push('bio=' + db.escape(args[2]))
									go = true
								}
								if (args[3]) {
									//update links
									changes.push('links=' + db.escape(args[3]))
									go = true
								}
								if (args[4] != null) { //can be true, false, or null/undefined
									//update subscribed
									let subscribed = 0
									if (args[4]) {
										subscribed = 1
									}
									changes.push('subscription=' + subscribed)
									go = true
								}
								changes = changes.join(',')
							
								if (go) {
									query = query.replace('?changes?', changes).replace('?username?', db.escape(args[0]))
								}
								else {
									reject('empty')
								}
							}
							else if (endpoint == 'update_works') {
								//args = [username, works]
								let works = JSON.parse(args[1])
								query = ''
								
								for (let work of works) {
									if (work.deleted) {
										//delete work
										query += 'delete from works where id=' + work.id + ';'
									}
									else {
										//update work
										let subquery = 'update works set '
								
										subquery += 'title=' + db.escape(work.title) + ','
										subquery += 'description=' + db.escape(work.description) + ','
										subquery += '`text`=' + db.escape(work.content)
								
										query += subquery + ' where id=' + work.id + ';'
									}
								}
							}
						}
					}
					else {
						let approved = true
						
						//handle general endpoints by inserting escaped params into the query directly
						for (let i=0; i<params.length && approved; i++) {
							let arg = args[i]
							if (isNaN(args[i])) {
								//is string, escaped
								arg = db.escape(arg)
							}
							//else, is number, directly inserted
							
							//double check against JS injection (XSS)
							let matches = arg.match(/[<>]/)
							if (matches) {
								approved = false
								console.log('suspicious: blocked possible xss attempt with db query arg: ')
								console.log(matches)
								reject('xss')
							}
							else {
								//arg appears safe; approved for query
								query = query.replace(params[i], arg)
							}
						}
					}
					
					//console.log(endpoint + ' --> ' + query) //TODO remove this
					resolve({sql: query})
				}
				else {
					console.log('suspicious: blocked external attempt to access endpoint ' + endpoint)
					reject('no query for endpoint')
				}
			}
			else {
				reject('no query for endpoint')
			}
		}
	})
}

exports.send_query = function(sql,callback) {
	db.getConnection(function(err, conn) {
		if (err) {
			//connection failed
			callback(err,null)
		}
		else {
			conn.query(sql, function(err,res) {
				//release connection when no longer needed
				conn.release()
				
				//return error if defined, and response results
				callback(err,res)
				
				//try to cache result
				cacheserver.set_saved(res)
			})
		}
	})
}

function try_cache(endpoint, args) {
	let key = null
	
	//check if endpoint is cache supported
	switch (endpoint) {
		case 'fetch_puzzles':
			key = 'puzzles'
			break
				
		case 'fetch_puzzle_paths':
			key = 'paths_' + args[0] //paths_<puzzle_id>
			break
			
		case 'fetch_collection_top_rated':
			key = 'collection_top_rated'
			break
			
		case 'fetch_collection_editors_choice':
			key = 'collection_editors_choice'
			break
			
		case 'fetch_collection_top_played':
			key = 'collection_top_played'
			break
			
		default:
			return undefined //endpoint not supported; skip cache
			break
	}
	
	if (key) {
		cacheserver
			.get(key)
			.then(function(val) {
				//got value; return
				return val
			})
			.catch(function(err) {
				//no value found; remember key to add to cache
				cacheserver.save_key(key)
				return undefined
			})
	}
}
