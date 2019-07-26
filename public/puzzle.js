/*
puzzle.js
Owen Gallagher
25 july 2019
*/

var puzzles = [];

function onload() {
	console.log('initializing puzzles...')
	
	var canvases = document.getElementsByClassName('puzzle');
	var puzzle = null;
	for (var i=0; i<canvases.length; i++) {
		puzzle = new Puzzle(i,canvases[i]);
		puzzle.init(i);
		puzzles.push(puzzle);
	}
}

function Puzzle(id,canvas) {
	this.id = id;
	this.canvas = canvas;
	this.paper = new paper.PaperScope();
	this.paper.setup(canvas);
	this.mouse = new paper.Point();
}

Puzzle.prototype.init = function() {
	paper = this.paper; //add elements to this paper context
	
    var halfW = this.canvas.width/2;
    var halfH = this.canvas.height/2;
	this.mouse = new paper.Point(halfW,halfH);

    var circle = new paper.Shape.Circle(new paper.Point(halfW,halfH), 10);
    circle.fillColor = 'white';
    circle.strokeColor = '#000000cc';
	
	var self = this;
    this.paper.view.onFrame = function(event) {
        circle.position = circle.position.add((self.mouse.subtract(circle.position)).multiply(0.1));
    };
	this.paper.view.onMouseMove = function(event) {
		self.mouse = event.point;
	}
}

export {onload};