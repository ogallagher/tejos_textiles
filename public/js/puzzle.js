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

//interaction
var selectedShape = null;
var doubleClick = new paper.Point();

//html templates
const PATTERN_ID = '?id?';
const PATTERN_TITLE = '?title?';
const PUZZLE_ITEM_HTML = '<div class=\"d-flex\"><div class=\"card mx-1 mt-1 w-100 text-center\" id=' + PATTERN_ID + '><div class=\"card-body\"><p class=\"card-text font-title-md text-uppercase\">' + PATTERN_TITLE + '</p></div></div></div>';

//configuration
const PUZZLE_DPI = 200;
const PUZZLE_Z_MIN = 0.5;

//Puzzle class
function Puzzle(dbdata) {
	this.id = dbdata.id;
	this.title = dbdata.title;
	this.author = dbdata.author;
	this.date = dbdata.date;
	
	this.paper = new paper.PaperScope();
	
	this.forecolor = dbdata.forecolor.data;
	this.backcolor = dbdata.backcolor.data;
	this.textcolor = dbdata.textcolor.data;
	
	this.foreground;
	this.foregroundCaps;
	this.background;
	this.text;
	this.textP = new paper.Point();
	this.textS = new paper.Point();
	this.shapes = [];
	
	this.scale = 2; //TODO include scale in dbdata
	this.pan = new paper.Point();
	this.zoom = 1;
	this.dragBegin = new paper.Point();
	this.anchor = new paper.Point();
}

Puzzle.prototype.updateGraphics = function() {
	var v = this.paper.view;
	
	if (featuredPuzzle == this) {
		this.background.bounds.size = v.size;
		this.foreground.bounds.size = v.size;
		this.foregroundCaps.bounds.size = v.size;
		
		this.text.bounds.size.set(this.textS.multiply(this.zoom));
		this.text.position.set(this.textP.add(this.pan).multiply(this.zoom));
	
		for (shape of this.shapes) {
			shape.move();
		}
	}
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
	var v0 = paper.view;
	
	//feature
	if (featuredPuzzle != null && featuredPuzzle.paper.view != null) {
		featuredPuzzle.paper.view.remove(); //unselect other
	}
 	featuredPuzzle = this; //select this
	
	//add graphic elements
	this.foreground = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height);
	this.foregroundCaps = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height);
	this.background = new paper.Path.Rectangle(0,0,v0.size.width,v0.size.height);
	var self = this;
	dbclient_fetchPuzzlePaths(this.id, function(data) {	
		//foreground solid
		var fc = self.forecolor;
		self.foreground.fillColor = new paper.Color(fc[0],fc[1],fc[2]);
		self.foregroundCaps.fillColor = self.foreground.fillColor;
		
		//background solid
		var bc = self.backcolor;
		self.background.fillColor = new paper.Color(bc[0],bc[1],bc[2]);
		
		//background text
		var textVector = new paper.CompoundPath(data.text);
		textVector.scale(self.scale);
		textVector.position = textVector.position.multiply(self.scale);
		var tc = self.textcolor;
		textVector.fillColor = new paper.Color(tc[0],tc[1],tc[2]);
		
		self.text = textVector.rasterize(PUZZLE_DPI);
		self.textP = self.text.position;
		self.textS = self.text.bounds.size;
		
		textVector.remove();
		textVector = null;
		
		self.shapes = [];
		var shapesOut = data.shapes_outline.split(';;');
		var shapesIn = data.shapes_inline.split(';;');
		
		if (shapesOut.length == shapesIn.length) {
			var holeClips = new paper.Group();
			var capClips = new paper.Group();
			var shape;
			for (var i=0; i<shapesOut.length; i++) {
				shape = new Shape(shapesOut[i],shapesIn[i],self);
				
				self.shapes.push(shape);
				
				holeClips.addChild(shape.hole);
				capClips.addChild(shape.cap);
			}
			
			var holes = new paper.Group(holeClips, self.background, self.text);
			holes.clipped = true;
			var caps = new paper.Group(capClips, self.foregroundCaps);
			caps.clipped = true;
			
			self.updateGraphics();
			
			console.log('finished loading graphics for ' + self.title);
		}
		else {
			console.log('error loading ' + self.title + ': shapes_outline.length != shapes_inline.length');
		}
	});
	
	//event handlers
	paper.view.onMouseDown = function(event) {	
		var mouse = event.point;
		var miss = true;
		
		for (shape of self.shapes) {
			if (shape.contains(mouse)) {
				miss = false;
				shape.throwAnchor();
				selectedShape = shape;
				break;
			}
		}
		
		self.dragBegin = mouse;
		self.anchor = self.pan;
		
		doubleClick = mouse;
	}
	paper.view.onMouseUp = function(event) {
		selectedShape = null;
	}
	paper.view.onMouseDrag = function(event) {
		var mouse = event.point.subtract(self.dragBegin).divide(self.zoom);
		
		if (selectedShape == null) {
			self.pan = self.anchor.add(mouse);
			self.updateGraphics();
		}
		else {
			selectedShape.dragTo(mouse);
		}
	}
	paper.view.onDoubleClick = function(event) {
		var m = event.point;
		
		if (m.equals(doubleClick)) {
			var z1 = self.zoom;
				
			if (self.zoom == PUZZLE_Z_MIN) {
				self.zoom = 1;
			}
			else {
				self.zoom = PUZZLE_Z_MIN;
			}
		
			var x = m.subtract(m.divide(z1).multiply(self.zoom));
			self.pan = self.pan.add(x);
		
			self.updateGraphics();
		}
	}
}

Puzzle.prototype.resize = function() {	
	//resize canvas via paper
	var container = featuredCanvas.parentElement;
	var w = container.clientWidth;
	var h = container.clientHeight;
	this.paper.view.setViewSize(w,h);
	
	this.updateGraphics();
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