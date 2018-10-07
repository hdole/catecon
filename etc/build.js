#!/usr/bin/env node
// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const fs = require('fs');
const proc = require('child_process');

AWS.config.loadFromPath('/home/hdole/.aws/config.json');

let lambdas = [
				'CateconBootstrap',
				'CateconCatalog',
				'CateconDiagramUpdate',
				'CateconDownloadJS',
				'CateconGetUserDiagrams',
				'CateconIngestCategory',
				'CateconIngestDiagram',
				'CateconRecentDiagrams',
				'CateconCT',

//				'CateconNewUser',
//				'CateconUserScanner',
			];

const root = '/mnt/f/xampp/htdocs/catecon2/Catecon-web';
const nodeModules = '/mnt/f/xampp/htdocs/node_modules';
const lambdaRoot = `${root}/lambda`;

const dependencies =
{
	CateconBootstrap:			['Cat.js', 'CatFns.js', 'sha256.js', 'sjcl.js', 'peg-0.10.0.min.js', 'amazon-cognito-identity.min.js', 'AWSconstants.js'],
	CateconCatalog:				['AWSconstants.js'],
	CateconGetUserDiagrams:		['AWSconstants.js'],
	CateconIngestDiagram:		['AWSconstants.js'],
	CateconRecentDiagrams:		['AWSconstants.js'],
	CateconCT:					['AWSconstants.js'],
};

const locations =
{
	'AWSconstants.js':	`${root}/lambda`,
	'Cat.js':			`${root}`,
	'CatFns.js':		`${root}`,
	'sha256.js':		`${root}`,
	'sjcl.js':			`${root}`,
	'peg-0.10.0.min.js':	`${root}`,
	'amazon-cognito-identity.min.js':	`${nodeModules}/amazon-cognito-identity-js/dist`,
};

const buildDir = 'build';

if (!fs.existsSync(buildDir))
	fs.mkdirSync(buildDir);
process.chdir(buildDir);

let updateLambdas = lambdas;

if (process.argv.length > 2)
{
	updateLambdas = [];
	for (let i=2; i<process.argv.length; ++i)
	{
		const arg = process.argv[i];
		if (lambdas.indexOf(arg) >= 0)
			updateLambdas.push(arg);
	}
}

updateLambdas.map(f =>
{
	console.log(`Diagram ${f} uploading...`);
	let deps = [];
	let copyDeps = '';
	if (f in dependencies)
	{
		deps = dependencies[f];
		copyDeps = deps.map(d => `cp -p ${locations[d]}/${d} .`).join(';\n');
	}
	const script =
`${copyDeps}
cp ${lambdaRoot}/${f}.js index.js
zip ${f}.zip index.js ${deps.join(' ')}
rm index.js
aws lambda update-function-code --function-name ${f} --zip-file fileb://./${f}.zip
`;

	proc.execSync(script); //.on('exit', function(code, signal) {console.log(`${f} uploaded with status ${code}`)});
});
