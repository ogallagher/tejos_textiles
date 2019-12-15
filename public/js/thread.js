/*
thread.js
Owen Gallagher
14 December 2019
*/

/*
This just creates a new background thread to run code in the background and not interfere with
the main interface thread. This is implemented using a web worker dedicated to the given
function f.

data = input data to clone and manipulate
work_url = url to code that's executed in the thread
callback = handle output data

*/
function thread(data,work_url,callback) {
	if (window.Worker) {
		let worker = new Worker(work_url)
		
		worker.onmessage = function(event) {
			callback(event.data)
		}
		
		worker.postMessage(data)
	}
	else {
		console.log('workers not supported in your browser')
	}
}