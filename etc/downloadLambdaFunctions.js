// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const https = require('https');
const fs = require('fs');
const cp = require('child_process');

AWS.config.loadFromPath('/home/hdole/.aws/config.json');

let lambda = new AWS.Lambda();
// let lambda = new AWS.Lambda({region:'us-west-2'});

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
				cp.exec(`zcat -d ${zipName} > ${jsName}`);
			});
		}).on('error', (e) =>
		{
			console.log('Error in download',e);
		});
	}))).then(data => {});
}

lambda.listFunctions({}, lambdaHandler);
