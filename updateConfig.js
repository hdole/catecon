// (C) 2022 Harry Dole, All Rights Reserved
// Catecon:  The Categorical Console
//
require('dotenv').config();

const path = require('path');

const fs = require('fs');

const encoding = require('encoding');
const util = require( 'util' );

const D2 = require('./' + path.join(process.env.HTTP_DIR, 'js', 'D2.js'));
const Cat = require('./' + path.join(process.env.HTTP_DIR, 'js', 'Cat.js'));

let gotError = false;

Cat.R.default.debug = false;
Cat.R.cloudURL = null;		// do not connect to cloud server

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';

const config = {version: 0, timestamp:0};

function saveConfig()
{
	console.log('saving config');
	const file = path.join(process.env.HTTP_DIR, 'config.json');
	if (fs.existsSync(file))
	{
		const data = fs.readFileSync(file);
		config = JSON.parse(data);
	}
	config.version = config.version + 1;
	console.log('new version', config.version);
	config.timestamp = Date.now();
	const fd = fs.openSync(file, 'w');
	const json = JSON.stringify(config);
	fs.writeSync(fd, json, 0, json.length +1);
	fs.closeSync(fd);
}


saveConfig();
