// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const fs = require('fs');
const proc = require('child_process');

AWS.config.loadFromPath('/home/hdole/.aws/config.json');

let lambda = new AWS.Lambda();
// let lambda = new AWS.Lambda({region:'us-west-2'});

let lambdas = ['CateconBootstrap',
				'CateconCatalog',
				'CateconDiagramUpdate',
				'CateconDownloadJS',
				'CateconGetUserDiagrams',
				'CateconIngestCategory',
				'CateconIngestDiagram',
				'CateconNewUser',
				'CateconRecentDiagrams',
				'CateconUserScanner',
			];

lambdas.map(f =>
{
	proc.exec(`cp ${f}.js index.js`);
	proc.exec(`zip ${f}.zip index.js AWSconstants.js`);
	proc.exec('rm index.js');
	proc.exec(`aws lambda update-function-code --function-name ${f} --zip-file fileb://./${f}.zip`);
});
