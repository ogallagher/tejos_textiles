/*
shape.js

Owen Gallagher
3 august 2019
*/

function Shape(hole,cap,scale) {
	this.hole = new paper.Path(hole);
	this.hole.scale(scale);
	this.holeP = this.hole.position.multiply(scale);
	this.holeS = this.hole.bounds.size;
	
	this.cap = null;	
	this.hasCap = false;
	if (cap != 'null') {
		this.cap = new paper.CompoundPath(cap);
		this.cap.scale(scale);
		this.capP = this.cap.position.multiply(scale);
		this.capS = this.cap.bounds.size;
		this.hasCap = true;
	}
	
	this.holeAnchor;
	this.capAnchor;
	this.anchor;
	this.pan = new paper.Point();
	this.zoom = 1;
	this.drag = new paper.Point();
}

Shape.prototype.move = function() {
	this.hole.bounds.size.set(this.holeS.multiply(this.zoom));
	this.hole.position.set(this.holeP.add(this.drag).add(this.pan).multiply(this.zoom));
	if (this.hasCap) {
		this.cap.bounds.size.set(this.capS.multiply(this.zoom));
		this.cap.position.set(this.capP.add(this.drag).add(this.pan).multiply(this.zoom));
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

Shape.prototype.cameraTo = function(pan,zoom) {
	this.pan = pan;
	this.zoom = zoom;
	this.move();
}