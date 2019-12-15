/*

*/

/*

event:
	0 - paper
	1 - data.text
	2 - self

*/
onmessage = function(event) {
	let paper = event.data[0]
	let text = event.data[1]
	let self = event.data[2]
	
	let textVector = new paper.CompoundPath(text)
	textVector.scale(self.scale)
	textVector.position = textVector.position.multiply(self.scale)
	
	let tc = self.textcolor
	textVector.fillColor = new paper.Color(tc[0],tc[1],tc[2])
	
	console.log('rasterizing text vector...')
	self.text = textVector.rasterize(PUZZLE_DPI)
	self.textP = self.text.position
	self.textS = self.text.bounds.size

	textVector.remove()
	textVector = null
	
	postMessage()
}