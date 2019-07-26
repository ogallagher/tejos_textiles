const express = require('express');
const app = express();

const enums = requre('enums');
const dbserver = require('dbserver');

const SITE = enums.site.TEXTILES;

var dbconnected = false;

app.set('port', (process.env.PORT || 5000));
app.use(express.static('public'));

app.listen(app.get('port'), function() {
	console.log('Tejos//Textiles server is running at localhost:' + app.get('port'));
	
	console.log('connecting to database...');
	dbconnected = dbserver.init(SITE);
	if (dbconnected) {
		console.log('database connected!');
	}
})

