/*

puzzle.js
Owen Gallagher
25 july 2019

uses paperjs, a graphics library that uses the HTML canvas element as its
graphics context.

*/

// puzzles
let featuredPuzzle

// interaction
let selectedShape = null
/* TODO why is doubleClick not an instance member of Puzzle? can it be combined w dragBegin? */
let doubleClick = new paper.Point()

// configuration
const PUZZLE_DPI = 200
const PUZZLE_Z_MIN = 0.5
// max delay in ms between consecutive clicks to count as double
const PUZZLE_DOUBLE_CLICK_DELAY = 500

//Puzzle class
function Puzzle(dbdata) {
	if (dbdata) {
		this.id = dbdata.id
		this.title = dbdata.title
		this.date = dbdata.date
		this.rating = dbdata.rating
		this.difficulty = dbdata.difficulty
		this.plays = dbdata.plays
	
		this.forecolor = dbdata.forecolor.data
		this.backcolor = dbdata.backcolor.data
		this.textcolor = dbdata.textcolor.data
	
		this.foreground
		this.foregroundCaps
		this.background
		this.text
		this.textP = new paper.Point()
		this.textS = new paper.Point()
		this.shapes = [];
	
		this.scale = dbdata.scale //initial scale applied to puzzle on load
		this.z_min = dbdata.z_min //how far out the user can zoom
		this.pan = new paper.Point()
		this.zoom = 1
		this.dragBegin = new paper.Point()
		this.anchor = new paper.Point()
		this.timeoutSingleClick = null
		this.partialPlay = null
		
		// date when begun
		this.startTime = null
		// play duration
		this.solveTime = 0
		// date when last paused
		this.pauseTime = null
		// loaded partial play duration
		this.resumeTime = 0
		this.enabled = true
	}
	
	this.paper = new paper.PaperScope()
	this.onStart = function(){}		// callback for when the puzzle begins (startTime is set)
	this.onComplete = function(){}	// callback for when the puzzle is completed
	this.onLoad = function(){}		// callback for when featured (loaded/graphics ready)
	this.onClick = function(){}		// callback for click/tap (press and release in same location)
}

// instance methods
Puzzle.prototype.updateGraphics = function() {
	let v = this.paper.view
	
	//both featured and fully loaded from db
	if (featuredPuzzle == this && this.text) {
		this.background.bounds.size = v.size
		this.foreground.bounds.size = v.size
		this.foregroundCaps.bounds.size = v.size
		
		this.text.bounds.size.set(this.textS.multiply(this.zoom))
		this.text.position.set(this.textP.add(this.pan).multiply(this.zoom))
		
		for (let shape of this.shapes) {
			shape.move()
		}
	}
}

Puzzle.prototype.feature = function(ftitle,fdate,fcanvas,fcontainer) {
	// update metadata fields
	ftitle.html(this.title)
	
	fdate
	.html(string_utils_date(this.date))
	.prop('href', 'gallery.html?date=' + this.date.substring(0,this.date.indexOf('T')))
	
	// enable this paperscope
	paper = this.paper
	
	// unfeature previously featured
	if (featuredPuzzle != null && featuredPuzzle.paper.view != null) {
		featuredPuzzle.paper.view.remove() //unselect other
	}
	
	//attach this to featured canvas
	this.paper.setup(fcanvas)
	this.resize(fcontainer)
	let v0 = paper.view
	
	// select this as new featured puzzle
 	featuredPuzzle = this
	
	// add graphic elements	
	this.foreground = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height)
	this.foregroundCaps = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height)
	this.background = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height)
	let self = this
	
	// event handlers
	paper.view.onMouseDown = function(event) {
		let m = event.point
		
		if (self.enabled) {
			for (let shape of self.shapes) {
				if (shape.contains(m) && !shape.isComplete) {
					shape.throwAnchor()
					selectedShape = shape
					break
				}
			}
		}
		
		self.dragBegin = m
		self.anchor = self.pan
	}
	
	paper.view.onMouseUp = function(event) {
		let m = event.point
		
		// double click
		if (m.equals(doubleClick)) {
			// clear single click timeout
			clearTimeout(self.timeoutSingleClick)
			
			// erase double click location
			doubleClick = new paper.Point()
			
			let z1 = self.zoom
		
			if (self.zoom == PUZZLE_Z_MIN) {
				self.zoom = 1
			}
			else {
				self.zoom = PUZZLE_Z_MIN
			}

			let x = m.subtract(m.divide(z1).multiply(self.zoom))
			self.pan = self.pan.add(x)

			self.updateGraphics()
		}
		else {
			// save potential double click location
			doubleClick = m
			self.timeoutSingleClick = setTimeout(
				function() {
					// erase double click location
					doubleClick = new paper.Point()
					
					// single click
					if (m.equals(self.dragBegin)) {
						// click/tap in place
						self.onClick(self)
					}
				},
				PUZZLE_DOUBLE_CLICK_DELAY
			)
			
			// end drag?
			if (self.enabled && selectedShape != null) {				
				//shapes dragged, check for puzzle completion
				let complete = true
				for (let shape of self.shapes) {
					if (!shape.isComplete) {
						complete = false
					}
				}
		
				if (complete) {
					self.complete()
				}
			}
		}
	
		selectedShape = null
	}
	
	/* TODO disable doubleClick point on drag? */
	paper.view.onMouseDrag = function(event) {
		var mouse = event.point.subtract(self.dragBegin).divide(self.zoom);
		
		if (selectedShape == null || !self.enabled) {
			self.pan = self.anchor.add(mouse)
			self.updateGraphics()
		}
		else {
			selectedShape.dragTo(mouse)
		}
		
		// begin solve timer
		if (self.enabled && self.startTime == null) {
			self.startTime = new Date()
			self.onStart()
		}
	}
	
	return new Promise(function(resolve,reject) {
		dbclient_fetch_puzzle_paths(self.id, function(data) {
			if (data) {
				//foreground solid
				var fc = self.forecolor
				self.foreground.fillColor = new paper.Color(fc[0],fc[1],fc[2])
				self.foregroundCaps.fillColor = self.foreground.fillColor;

				//background solid
				var bc = self.backcolor
				self.background.fillColor = new paper.Color(bc[0],bc[1],bc[2]);

				//background text
				var textVector = new paper.CompoundPath(data.text)
				textVector.scale(self.scale)
				textVector.position = textVector.position.multiply(self.scale)
				var tc = self.textcolor
				textVector.fillColor = new paper.Color(tc[0],tc[1],tc[2])
		
				self.text = textVector.rasterize(PUZZLE_DPI)
				self.textP = self.text.position
				self.textS = self.text.bounds.size

				textVector.remove()
				textVector = null
				
				self.shapes = []
				var shapesOut = data.shapes_outline.split(';;')
				var shapesIn = data.shapes_inline.split(';;')
				
				if (shapesOut.length == shapesIn.length) {
					var holeClips = new paper.Group()
					var capClips = new paper.Group()
					for (var i=0; i < shapesOut.length; i++) {
						let shape = new Shape(shapesOut[i],shapesIn[i],self)
		
						self.shapes.push(shape)
		
						holeClips.addChild(shape.hole)
						capClips.addChild(shape.cap)
					}
	
					var holes = new paper.Group(holeClips, self.background, self.text)
					holes.clipped = true
					var caps = new paper.Group(capClips, self.foregroundCaps)
					caps.clipped = true
	
					self.updateGraphics()
	
					console.log('finished loading graphics for ' + self.title)
					self.onLoad()
					resolve()
				}
				else {
					console.log('error loading ' + self.title + ': outlines.length ' + shapesOut.length + ' != inlines.length ' + shapesIn.length)
					reject()
				}
			}
		})
	})
}

Puzzle.prototype.resize = function(container) {	
	//resize canvas via paper
	this.paper.view.setViewSize(container.clientWidth,container.clientHeight);
	
	this.updateGraphics()
}

Puzzle.prototype.complete = function() {
	//calculate solve time (ms)
	this.solveTime = new Date().getTime() - this.startTime.getTime() + this.resumeTime
	
	//disable interaction
	this.enabled = false
	this.startTime = null
	
	//use callback to do other things in the global context
	this.onComplete(this)
}

Puzzle.prototype.enable = function() {
	this.enabled = true
	
	//reset shapes
	for (let shape of this.shapes) {
		shape.randomize(this)
	}
	
	this.updateGraphics()
}

Puzzle.prototype.pause = function(save_completes) {
	save_completes = (save_completes === undefined) ? true : save_completes
	
	if (this.startTime != null) {
		// save time when last paused
		this.pauseTime = new Date()
		console.log(`debug puzzle saved at ${this.pauseTime}`)
		
		// return data for partial completion
		let partial_play = {
			puzzle_id: this.id,
			duration: this.pauseTime.getTime() - this.startTime.getTime() + this.resumeTime,
			completes: '' //char flags for completed shapes
		}
		
		if (save_completes) {
			let flags = ''
			for (let shape of this.shapes) {
				if (shape.isComplete) {
					flags += '1'
				}
				else {
					flags += '0'
				}
			}
			partial_play.completes = flags
		}
	
		this.partialPlay = partial_play
		return partial_play
	}
	else {
		console.log('warning puzzle not paused because not yet begun')
	}
}

Puzzle.prototype.resume = function(partial_play) {
	partial_play = (partial_play === undefined) ? this.partialPlay : partial_play
	
	if (partial_play != null) {
		// reset start time
		this.startTime = new Date()
		console.log(`info puzzle resumed at ${this.startTime}`)
	
		// load data from partial completion
		this.resumeTime += partial_play.duration //load time so far
	
		//load shapes
		let completes = partial_play.completes
		let shape = null
		console.log(partial_play)
		for (let i=0; i < completes.length; i++) {
			if (completes[i] == '1') {
				shape = this.shapes[i]
				shape.drag = new paper.Point(0,0)
				shape.complete()
			}
		}
	}
	else {
		console.log('warning no partial play to resume')
	}
}

//static methods
//reverse order (higher dates first)
Puzzle.compare_date = function(a,b) {
	let a_val = new Date(a.date)
	let b_val = new Date(b.date)
	
	let diff = a_val - b_val
	if (diff < 0) {
		return 1
	}
	else if (diff > 0) {
		return -1
	}
	else {
		return 0
	}
}

Puzzle.compare_title = function(a,b) {
	let a_val = a.title.toLowerCase()
	let b_val = b.title.toLowerCase()

	return  a_val.localeCompare(b_val)
}

//reverse order (higher rating first)
Puzzle.compare_rating = function(a,b) {
	let a_val = parseFloat(a.rating)
	let b_val = parseFloat(b.rating)
	
	return b_val-a_val
}

//reverse order (higher popularity first)
Puzzle.compare_popularity = function(a,b) {
	let a_val = parseInt(a.plays)
	let b_val = parseInt(b.plays)
	
	return b_val-a_val
}

//forward order (easiest first)
Puzzle.compare_difficulty_asc = function(a,b) {
	let a_val = parseFloat(a.difficulty)
	let b_val = parseFloat(b.difficulty)
	
	return a_val-b_val
}

//reverse order (hardest first)
Puzzle.compare_difficulty_desc = function(a,b) {
	let a_val = parseFloat(a.difficulty)
	let b_val = parseFloat(b.difficulty)
	
	return b_val-a_val
}

Puzzle.clone = function(clone) {
	let puzzle = new Puzzle()
	
	puzzle.id = clone.id
	puzzle.title = clone.title
	puzzle.date = clone.date
	puzzle.rating = clone.rating
	puzzle.difficulty = clone.difficulty
	puzzle.plays = clone.plays

	puzzle.forecolor = clone.forecolor
	puzzle.backcolor = clone.backcolor
	puzzle.textcolor = clone.textcolor

	puzzle.foreground = clone.foreground
	puzzle.foregroundCaps = clone.foregroundCaps
	puzzle.background = clone.background
	puzzle.text = clone.text
	puzzle.textP = clone.textP
	puzzle.textS = clone.textS
	
	puzzle.shapes = []
	for (let shape of clone.shapes) {
		puzzle.shapes.push(Shape.clone(shape))
	}
	
	puzzle.scale = clone.scale
	puzzle.z_min = clone.z_min
	puzzle.pan = clone.pan
	puzzle.zoom = clone.zoom
	puzzle.dragBegin = new paper.Point()
	puzzle.anchor = new paper.Point()
	
	puzzle.startTime = clone.startTime
	puzzle.solveTime = clone.solveTime
	puzzle.enabled = true
	
	return puzzle
}

Puzzle.serialize = function(puzzle) {	
	return JSON.stringify(Puzzle.clone(puzzle))
}

Puzzle.deserialize = function(string) {
	let puzzle = JSON.parse(string)
	
	for (let shape of puzzle.shapes) {
		shape.puzzle = puzzle
	}
	
	return puzzle
}