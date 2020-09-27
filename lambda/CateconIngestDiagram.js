// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');
//const zlib = require('zlib');

const credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID});

AWS.config.update(
{
	region:		C.COGNITO_REGION,
	credentials
});

const S3 = new AWS.S3({apiVersion: '2006-03-01'});

exports.handler = (event, context, callback) =>
{
//	const bodyBuffer = Buffer.from(event.body, 'base64');
//	zlib.gunzip(bodyBuffer, (error, bodyStr) =>
//	{
//		if (error)
//			return callback(error);
//		const body = JSON.parse(bodyStr);
		const user = event.user;
		const diagram = event.diagram;
		const png = event.png;
		const diagramString = JSON.stringify(diagram);
//		zlib.gzip(diagramString, (error, buffer) =>
//		{
			const Body = JSON.stringify(diagram);
			if (Body.length > 1000000)
				return callback('Error:  Diagram is too large to load');
			if (diagram.user !== user)
				return callback(`Error:  User ${user} is not the owner of ${diagram.name}.  ${diagram.user} is.`);
			const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: C.DIAGRAM_BUCKET_NAME}});
			const name = `${user}/${diagram.basename}`;
			const Key = `${name}.json`;
			const s3params =
			{
				Bucket:  		C.DIAGRAM_BUCKET_NAME,
				ContentType:	'json',
				Key,
				Body,
				ACL:	 		'public-read',
			};
			// save diagram.json
			bucket.putObject(s3params, (err, data) =>
			{
				if (err)
					return callback(err);
				const s3params =
				{
					Bucket:				C.DIAGRAM_BUCKET_NAME,
					ContentType:		'image/png',
					ContentEncoding:	'base64',
					Key:				name + '.png',
					Body:				new Buffer.from(png.replace(/^data:image\/octet-stream;base64,/,""), 'base64'),
					ACL:				'public-read',
				};
				// save diagram png
				bucket.putObject(s3params, (err, data) =>
				{
					if (err)
						return callback(err);
					AWS.config.update({region:C.REGION});
					const db = new AWS.DynamoDB.DocumentClient();
					const Item =
					{
						basename:		diagram.basename,
						name,
						timestamp,
						user,
						description:	'description' in diagram ? diagram.description : '',
						properName:		'properName' in diagram ? diagram.properName : diagram.basename,
						references:		diagram.references,
					};
					const params =
					{
						TableName:  C.DIAGRAM_TABLE,
						Item,
					};
					// save diagram info to db
					db.put(params, (err, data) =>
					{
						if (err)
							return callback(err);
						const params =
						{
							TableName:  C.RECENT_DIAGRAM_TABLE,
							Item,
						};
						// save to recent diagram table
						db.put(params, function(err, data)
						{
							if (err)
								return callback(err);
							console.log(C.RECENT_DIAGRAM_TABLE, 'putItem succeeded', diagram.name);
							callback(null, {status:"Success"});
						});
					});
				});
			});
//		});
//	});
};
