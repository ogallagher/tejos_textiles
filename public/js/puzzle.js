/*
puzzle.js
Owen Gallagher
25 july 2019
*/

//pointers to html dom elements
var featuredCanvas;
var featuredTitle;
var featuredAuthor;
var featuredDate;
var featuredRating;
var domlist;

//puzzles
var featuredPuzzle;
var puzzles = [];

//html templates
const PATTERN_ID = '?id?';
const PATTERN_TITLE = '?title?';
const PUZZLE_ITEM_HTML= '<div class=\"box has-text-centered\" id=' + PATTERN_ID + '><p>' + PATTERN_TITLE + '</p></div>';

//Puzzle class
function Puzzle(dbdata) {
	this.id = dbdata.id;
	this.title = dbdata.title;
	this.author = dbdata.author;
	this.date = dbdata.date;
	
	this.paper = new paper.PaperScope();
	this.mouse = new paper.Point();
	
	this.forecolor;
	this.backcolor;
	this.textcolor;
	this.parseColors(dbdata.forecolor,dbdata.backcolor,dbdata.textcolor);
}

Puzzle.prototype.parseColors = function(fore,back,text) {
	//TODO parse colors
}

Puzzle.prototype.parsePaths = new Promise(function(resolve,reject) {	
	//pull paths from db
	dbclient_fetchPuzzlePaths(this.id, function(data) {
		resolve(data.text,data.shapes_outline,data.shapes_inline);
	});
});

Puzzle.prototype.feature = function() {
	//update metadata fields
	featuredTitle.html(this.title);
	
	featuredAuthor.html(this.Author);
	
	var date = this.date.substring(0,this.date.indexOf('T'));
	featuredDate.html(date);
	
	//attach to featuredCanvas
	this.paper.setup(featuredCanvas);
	paper = this.paper; 
	this.resize();
	
	//add graphic elements
	var center = paper.view.center;
	this.mouse = center;
	
	this.parsePaths.then(function(text,outline,inline) {
		//TODO create paths from text, outlines and inlines
		console.log('loading graphic elements for puzzle ' + this.title + '...');
	});

    var circle = new paper.Shape.Circle(center, 10);
    circle.fillColor = 'white';
    circle.strokeColor = '#000000cc';
	
	//event handlers
	var self = this;
    this.paper.view.onFrame = function(event) {
        circle.position = circle.position.add((self.mouse.subtract(circle.position)).multiply(0.1));
    }
	this.paper.view.onMouseMove = function(event) {
		self.mouse = event.point;
	}
	
	//feature
	if (featuredPuzzle != null && featuredPuzzle.view != null) {
		featuredPuzzle.view.remove(); //unselect other
	}
 	featuredPuzzle = this; //select this
}

Puzzle.prototype.resize = function() {	
	//resize canvas via paper
	var container = featuredCanvas.parentElement;
	var w = container.clientWidth;
	var h = container.clientHeight;
	this.paper.view.setViewSize(w,h);
}

Puzzle.prototype.domAppend = function() {
	var puzzleItem = PUZZLE_ITEM_HTML
									.replace(PATTERN_TITLE,this.title)
									.replace(PATTERN_ID,this.id); //load html source
	
	puzzleItem = $(puzzleItem); //create dom element
	
	domlist.append(puzzleItem); //add to list
}

//exposed puzzle methods
function puzzle_onload(dbdata) {
	//bind puzzles to list
	domlist = $('#puzzles_list');
	
	//load puzzle data from db and add puzzles
	var p,puzzle;
	for (p of dbdata) {
		puzzle = new Puzzle(p);
		puzzles.push(puzzle);
		puzzle.domAppend();
	}
	
	//feature the most recent puzzle
	featuredTitle = $('#featured_title');
	featuredAuthor = $('#featured_author');
	featuredDate = $('#featured_date');
	featuredRating = $('#featured_rating');
	featuredCanvas = $('#featured_puzzle')[0];
	
	var n = puzzles.length;
	if (n != 0) {
		puzzles[n-1].feature();
	}
}

function puzzle_onresize() {
	featuredPuzzle.resize();
}