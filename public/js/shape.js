/*
shape.js

Owen Gallagher
3 august 2019
*/

//configuration
SHAPE_COMPLETION_MAX_DIST = 10 //how far a shape can be from its finish point to be considered correctly placed

//shape class
function Shape(hole,cap,puzzle) {
	this.puzzle = puzzle
	
	this.hole = new paper.Path(hole)
	this.hole.scale(puzzle.scale)
	this.holeP = this.hole.position.multiply(puzzle.scale)	//current position
	this.holeS = this.hole.bounds.size						//current size
	
	this.isComplete = false
	
	this.cap = null	
	this.hasCap = false
	if (cap != 'null') {
		this.cap = new paper.CompoundPath(cap)
		this.cap.scale(puzzle.scale)
		this.capP = this.cap.position.multiply(puzzle.scale)
		this.capS = this.cap.bounds.size
		this.hasCap = true
	}
	
	this.holeAnchor
	this.capAnchor
	this.anchor
	
	this.randomize(puzzle)
}

Shape.prototype.randomize = function(puzzle) {
	//randomize user drag
	let bounds = puzzle.paper.view.bounds
	
	this.drag = new paper.Point(
		(Math.random() * bounds.width) + bounds.x - this.holeP.x, 
		(Math.random() * bounds.height) + bounds.y - this.holeP.y
	)
	
	//set isComplete
	this.isComplete = false
}

Shape.prototype.move = function() {
	let z = this.puzzle.zoom
	let p = this.puzzle.pan
	
	this.hole.bounds.size.set(this.holeS.multiply(z))
	this.hole.position.set(this.holeP.add(this.drag).add(p).multiply(z))
	if (this.hasCap) {
		this.cap.bounds.size.set(this.capS.multiply(z))
		this.cap.position.set(this.capP.add(this.drag).add(p).multiply(z))
	}
}

Shape.prototype.contains = function(point) {
	if (this.hole.contains(point)) {
		if (this.hasCap && this.cap.contains(point)) {
			return false
		}
		else {
			return true
		}
	}
}

Shape.prototype.throwAnchor = function() {
	this.anchor = this.drag
}

Shape.prototype.dragTo = function(point) {
	this.drag = this.anchor.add(point)
	this.move()
	this.complete()
}

Shape.prototype.complete = function() {
	if (this.drag.length < SHAPE_COMPLETION_MAX_DIST) {
		this.drag.set(0,0)
		this.move()
		this.isComplete = true
	}
}