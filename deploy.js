#!/usr/bin/env node
// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const fs = require('fs');
const proc = require('child_process');

AWS.config.loadFromPath('/home/hdole/.aws/config.json');

let lambda = new AWS.Lambda();

let files = [	
			 'Cat.js',
			 'OrbitControls.js',
			 'catecon.css',
//			 'category.ico',
			 'sha256.js',
			 'three.min.js',
			 'CatFns.js',
			 'catecon.html',
			 'peg-0.10.0.min.js',
			 'sjcl.js',
			];

const timestamps = {};

const tsFilename = '.timestamps.json';
//
// get current timestamps
//
files.map(f => timestamps[f] = fs.statSync(f).mtime.getTime());
//
// get last deployment state
//
fs.readFile(tsFilename, 'utf8', function tsReadFileCB(err, data)
{
	if (err)
	{
		console.log('Error: ', err);
		return;
	}
	const deployed = JSON.parse(data);
	const deployMe = files.filter(f => timestamps[f] > deployed[f]).join(' ');
	if (deployMe !== '')
	{
		process.stdout.write(`Deploying ${deployMe}...\n`);
		const cmd = `scp -i ~/hdole-norcal.pem ${deployMe} ec2-user@ec2-52-8-231-154.us-west-1.compute.amazonaws.com:/var/www/html/catecon`;
		process.stdout.write(`${cmd}\n`);
		proc.execSync(cmd);
		fs.writeFileSync('.timestamps.json', JSON.stringify(timestamps), 'utf8');
	}
	else
		process.stdout.write('Nothing to deploy.\n');
});

