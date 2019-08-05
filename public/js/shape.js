/*
shape.js

Owen Gallagher
3 august 2019
*/

function Shape(hole,cap) {
	this.hole = new paper.Path(hole);
	
	this.cap = null;
	this.hasCap = false;
	if (cap != 'null') {
		this.cap = new paper.CompoundPath(cap);
		this.hasCap = true;
	}
	
	this.holeAnchor;
	this.capAnchor;
	this.anchor;
}

Shape.prototype.transform = function(matrix) {
	this.hole.transform(matrix);
	if (this.hasCap) {
		this.cap.transform(matrix);
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

Shape.prototype.throwAnchor = function(point) {
	this.anchor = point;
	
	this.holeAnchor = this.hole.position;
	if (this.hasCap) {
		this.capAnchor = this.cap.position;
	}
}

Shape.prototype.dragTo = function(point) {
	var delta = point.subtract(this.anchor);
	
	this.hole.position = this.holeAnchor.add(delta);
	if (this.hasCap) {
		this.cap.position = this.capAnchor.add(delta);
	}
}