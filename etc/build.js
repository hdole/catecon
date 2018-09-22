// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const https = require('https');
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

/*
function lambdaHandler(err, data)
{
	if (err)
	{
		console.log('Error',err);
		return;
	}
	const functions = data.Functions.map(f => f.FunctionName);
	console.log(functions);
	Promise.all(functions.map(FunctionName => lambda.getFunction({FunctionName}, function(err, data)
	{
		if (err)
		{
			console.log('Error', err, err.stack);
			return;
		}
		const jsName = `${FunctionName}.js`;
		const zipName = `${jsName}.zip`;
		const zipFile = fs.createWriteStream(zipName);
		https.get(data.Code.Location, (response) =>
		{
			response.pipe(zipFile);
			zipFile.on('finish', function(response)
			{
				zipFile.close();
				proc.exec(`zcat -d ${zipName} > ${jsName}`);
			});
		}).on('error', (e) =>
		{
			console.log('Error in download',e);
		});
	}))).then(data => {});
}

lambda.listFunctions({}, lambdaHandler);
*/
