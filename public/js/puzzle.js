/*

puzzle.js
Owen Gallagher
25 july 2019

uses paperjs, a graphics library that uses the HTML canvas element as its
graphics context.

*/

//puzzles
let featuredPuzzle

//interaction
let selectedShape = null
let doubleClick = new paper.Point()

//configuration
const PUZZLE_DPI = 200
const PUZZLE_Z_MIN = 0.5

//Puzzle class
function Puzzle(dbdata) {
	this.id = dbdata.id
	this.title = dbdata.title
	this.date = dbdata.date
	this.rating = dbdata.rating //TODO debug this
	
	this.paper = new paper.PaperScope()
	
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
	
	this.scale = 2; //TODO include scale in dbdata
	this.pan = new paper.Point()
	this.zoom = 1
	this.dragBegin = new paper.Point()
	this.anchor = new paper.Point()
	
	this.startTime = null
	this.solveTime = 0
	this.enabled = true
	this.onComplete = function(){} //callback for when the puzzle is completed
}

Puzzle.prototype.updateGraphics = function() {
	let v = this.paper.view
	
	if (featuredPuzzle == this) {
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

Puzzle.prototype.feature = function(ftitle,fdate,fcanvas,frating,fcontainer) {
	//update metadata fields
	ftitle.html(this.title)
	
	let date = this.date.substring(0,this.date.indexOf('T'))
	fdate.html(date)
	
	//enable this paperscope
	paper = this.paper
	
	//attach to featured canvas
	this.paper.setup(fcanvas)
	this.resize(fcontainer)
	let v0 = paper.view
	
	//feature
	if (featuredPuzzle != null && featuredPuzzle.paper.view != null) {
		featuredPuzzle.paper.view.remove() //unselect other
	}
 	featuredPuzzle = this; //select this
	
	//add graphic elements	
	this.foreground = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height)
	this.foregroundCaps = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height)
	this.background = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height)
	let self = this
	
	//event handlers
	paper.view.onMouseDown = function(event) {
		let mouse = event.point
		let miss = true;
	
		if (self.enabled) {
			for (let shape of self.shapes) {
				if (shape.contains(mouse)) {
					miss = false
					shape.throwAnchor()
					selectedShape = shape
					break
				}
			}
		}
		
		self.dragBegin = mouse
		self.anchor = self.pan
	
		doubleClick = mouse
	}
	paper.view.onMouseUp = function(event) {
		if (self.enabled) {
			if (selectedShape != null) {
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
		
			selectedShape = null
		}
	}
	paper.view.onMouseDrag = function(event) {
		var mouse = event.point.subtract(self.dragBegin).divide(self.zoom);
		
		if (selectedShape == null || !self.enabled) {
			self.pan = self.anchor.add(mouse)
			self.updateGraphics()
		}
		else {
			selectedShape.dragTo(mouse)
		}
		
		//begin solve timer
		if (self.enabled && self.startTime == null) {
			self.startTime = new Date()
		}
	}
	paper.view.onDoubleClick = function(event) {
		let m = event.point;
		
		if (m.equals(doubleClick)) {
			let z1 = self.zoom;
			
			if (self.zoom == PUZZLE_Z_MIN) {
				self.zoom = 1
			}
			else {
				self.zoom = PUZZLE_Z_MIN
			}
	
			let x = m.subtract(m.divide(z1).multiply(self.zoom))
			self.pan = self.pan.add(x);
	
			self.updateGraphics()
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
					for (var i=0; i<shapesOut.length; i++) {
						let shape = new Shape(shapesOut[i],shapesIn[i],self)
		
						self.shapes.push(shape)
		
						holeClips.addChild(shape.hole)
						capClips.addChild(shape.cap)
					}
	
					var holes = new paper.Group(holeClips, self.background, self.text)
					holes.clipped = true
					var caps = new paper.Group(capClips, self.foregroundCaps)
					caps.clipped = true;
	
					self.updateGraphics();
	
					console.log('finished loading graphics for ' + self.title)
					resolve()
				}
				else {
					console.log('error loading ' + self.title + ': shapes_outline.length != shapes_inline.length')
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
	this.solveTime = new Date().getTime() - this.startTime.getTime()
	
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
}