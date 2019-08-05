/*
shape.js

Owen Gallagher
3 august 2019
*/

function Shape(hole,cap) {
	this.hole = new paper.Path(hole);
	this.holeP = this.hole.position;
	
	this.cap = null;	
	this.hasCap = false;
	if (cap != 'null') {
		this.cap = new paper.CompoundPath(cap);
		this.capP = this.cap.position;
		this.hasCap = true;
	}
	
	this.holeAnchor;
	this.capAnchor;
	this.anchor;
	this.pan = new paper.Point();
	this.drag = new paper.Point();
}

Shape.prototype.move = function() {
	this.hole.position = this.holeP.add(this.drag).add(this.pan);
	if (this.hasCap) {
		this.cap.position = this.capP.add(this.drag).add(this.pan);
	}
}

Shape.prototype.contains = function(point) {
	if (this.hole.contains(point)) {
		if (this.hasCap && this.cap.contains(point)) {
			return false;
		}
		else {
			return true;
		}
	}
}

Shape.prototype.throwAnchor = function() {
	this.anchor = this.drag;
}

Shape.prototype.dragTo = function(point) {
	this.drag = this.anchor.add(point);
	this.move();
}

Shape.prototype.panTo = function(point) {
	this.pan = point;
	this.move();
}