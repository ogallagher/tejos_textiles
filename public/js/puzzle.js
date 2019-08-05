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
	
	this.forecolor = dbdata.forecolor.data;
	this.backcolor = dbdata.backcolor.data;
	this.textcolor = dbdata.textcolor.data;
	
	this.resizeGraphics = function(){}; //defined in this.feature()
}

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
	var v0 = this.paper.view;
	
	//add graphic elements
	this.mouse = v0.center;
	
	var self = this;
	dbclient_fetchPuzzlePaths(this.id, function(data) {	
		//foreground solid
		var foreground = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height);
		var fc = self.forecolor;
		foreground.fillColor = new paper.Color(fc[0],fc[1],fc[2]);
		
		var foregroundCaps = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height);
		foregroundCaps.fillColor = foreground.fillColor;
		
		//background solid
		var background = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height);
		var bc = self.backcolor;
		console.log('backcolor: ' + JSON.stringify(bc));
		background.fillColor = new paper.Color(bc[0],bc[1],bc[2]);
		
		//background text
		var text = new paper.CompoundPath(data.text);
		var tc = self.textcolor;
		text.fillColor = new paper.Color(tc[0],tc[1],tc[2]);
		text.applyMatrix = false;
		
		var shapesOut = data.shapes_outline.split(';;');
		var shapesIn = data.shapes_inline.split(';;');
		var shapes = [];
		
		//define graphics transform
		self.resizeGraphics = function() {
			var v = self.paper.view;
			
			var M = new paper.Matrix();
			var bounds = text.bounds;
			var center = bounds.center;
			var size = bounds.size;
			var sw = v.size.width / size.width;
			var sh = v.size.height / size.height;
			var s;
			if (sw < sh) {
				s = sw;
			}
			else {
				s = sh;
			}
			
			M = M.scale(s);
			M = M.translate(v.center.subtract(center));
			
			foreground.bounds.size = v.size;
			foregroundCaps.bounds.size = v.size;
			text.transform(M);
			for (shape of shapes) {
				shape.transform(M);
			}
		};
		
		//
		if (shapesOut.length == shapesIn.length) {
			var holeClips = new paper.Group();
			var capClips = new paper.Group();
			var shape;
			for (var i=0; i<shapesOut.length; i++) {
				shape = new Shape(shapesOut[i],shapesIn[i]);
				
				shapes.push(shape);
				
				holeClips.addChild(shape.hole);
				capClips.addChild(shape.cap);
			}
			
			var holes = new paper.Group(holeClips, background, text);
			holes.clipped = true;
			var caps = new paper.Group(capClips, foregroundCaps);
			caps.clipped = true;
			
			self.resizeGraphics();
			console.log('finished loading graphics for ' + self.title);
		}
		else {
			console.log('error loading ' + this.title + ': shapes_outline.length != shapes_inline.length');
		}
		
		//element event handlers
	});
	
	//global event handlers
	this.paper.view.onMouseMove = function(event) {
		self.mouse = event.point;
		//TODO
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
	
	this.resizeGraphics();
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