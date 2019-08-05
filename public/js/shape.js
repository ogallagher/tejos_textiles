/*
shape.js

Owen Gallagher
3 august 2019
*/

function Shape(hole,cap) {
	this.hole = new paper.Path(hole);
	
	this.cap;
	if (cap == 'null') {
		this.cap = null;
	}
	else {
		this.cap = new paper.CompoundPath(cap);
	}
}

Shape.prototype.transform = function(matrix) {
	this.hole.transform(matrix);
	
	if (this.cap != null) {
		this.cap.transform(matrix);
	}
}