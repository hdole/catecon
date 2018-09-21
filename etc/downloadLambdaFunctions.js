const AWS = require('aws-sdk');
const https = require('https');
// const zlib = require('zlib');
const fs = require('fs');
const cp = require('child_process');

// const x = zlib.createDeflate();
// const x = zlib.createInflate();			incorrect header check
// const x = zlib.createGzip();			bad output
// const x = zlib.createGunzip();			// incorrect header check
// const x = zlib.createInflateRaw();
// const x = zlib.createUnzip();		// incorrect header check

AWS.config.loadFromPath('/home/hdole/.aws/config.json');

const lambda = new AWS.Lambda();

lambda.listFunctions( {}, function(err, data)
{
	if (err)
	{
		console.log('Error',err);
		return;
	}
	const functions = data.Functions.map(f => f.FunctionName);
//	const Functions = [];
//	Functions[0] = functions[0];
console.log('names',functions);
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
				/*
				const is = fs.createReadStream(zipName).on('error', console.log);
				const os = fs.createWriteStream(jsName).on('error', console.log);
				is.pipe(x).pipe(os);
				*/
			});
		}).on('error', (e) =>
		{
			console.log('Error in download',e);
		});
	}))).then(data => {});

});
