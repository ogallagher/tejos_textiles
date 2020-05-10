/*
img_utils.js
Owen Gallagher
9 May 2020
*/

//resize html image data url and convert to base64 string
function img_utils_prep_file(data_url, max_width, callback) {
	//read image data
	let reader = new FileReader()
	
	reader.onloadend = function() {
		if (reader.result) {
		    //compress image into max_width x max_width square
		    let image = new Image()
		    image.src = reader.result
		
		    //wait for image to load
		    image.onload = function () {
		        let w = image.width
		        let h = image.height
		        let canvas = document.createElement('canvas')
				let k = 1
		        if (w > h) {
					k = max_width/w       
		        }
		        else {
					k = max_width/h
		        }
	            w *= k
				h *= k
		        canvas.width = w
		        canvas.height = h
				
		        //draw centered to canvas
		        canvas.getContext('2d').drawImage(image, 0, 0, w, h)
			
		        //convert back to data url
		        callback(canvas.toDataURL())
		    }
		}
		else {
			callback(null)
		}
	}
	
	reader.readAsDataURL(data_url);
}

//convert db photo blob to data url
function img_utils_prep_blob(photo, callback) {
    callback(new TextDecoder('utf-8').decode(new Uint8Array(photo)));
}