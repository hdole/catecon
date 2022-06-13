// (C) 2022 Harry Dole, All Rights Reserved
// Catecon:  The Categorical Console
//
require('dotenv').config();

const path = require('path');

const fs = require('fs');

const encoding = require('encoding');

const util = require( 'util' );

const { exec } = require('child_process');

const D2 = require('./' + path.join(process.env.HTTP_DIR, 'js', 'D2.js'));
const Cat = require('./' + path.join(process.env.HTTP_DIR, 'js', 'Cat.js'));

let gotError = false;

Cat.R.default.debug = false;
Cat.R.cloudURL = null;		// do not connect to cloud server

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';

let config = {version: 0, timestamp:0, commit:''};
let commit = '';

function saveConfig()
{
	console.log('saving config', config.commit);
	const file = path.join(process.env.HTTP_DIR, 'config.json');
	if (fs.existsSync(file))
	{
		const data = fs.readFileSync(file);
		config = JSON.parse(data);
	}
	config.version = config.version + 1;
	config.timestamp = Date.now();
	if (config.commit !== commit)
	{
		console.log('new version', config.version);
		config.commit = commit;
		const fd = fs.openSync(file, 'w');
		const json = JSON.stringify(config);
		fs.writeSync(fd, json, 0, json.length +1);
		fs.closeSync(fd);
	}
	else
		console.log('no change');
}

function update()
{
	console.log('updating from git');
	exec('git pull', (error, stdout, stderr) =>
	{
		console.log('pulled from git', stdout, stderr);
		exec('git log -1', (error, stdout, stderr) =>
		{
			const lines = stdout.split('\n');
			const tokens = lines[0].split(' ');
			commit = tokens[1];
			saveConfig();
		});
	});

}

update();
