// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

const credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID});

AWS.config.update(
{
	region:		C.COGNITO_REGION,
	credentials
});

const S3 = new AWS.S3({apiVersion: '2006-03-01'});

exports.handler = (event, context, callback) =>
{
	const diagram = event.diagram;
	const user = 'user' in event ? event.user : 'hfdole';
	if (diagram.user !== user)
	{
		const message = `Error:  User ${user} is not the owner of ${diagram.name}.  ${diagram.user} is.`;
		console.log(message);
		callback(message, null);
		return;
	}
	const Body = JSON.stringify(diagram);
	if (Body.length > 1000000)
	{
		const message = 'Error:  Diagram is too large to load';
		console.log(message);
		callback(message, null);
		return;
	}
	const URL = `https://s3-${C.REGION}.amazonaws.com/${C.DIAGRAM_BUCKET_NAME}`;
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
	bucket.putObject(s3params, function(err, data)
	{
		if (err)
		{
			console.log('Error',err);
			return;
		}
		const s3params =
		{
			Bucket:				C.DIAGRAM_BUCKET_NAME,
			ContentType:		'image/png',
			ContentEncoding:	'base64',
			Key:				name + '.png',
			Body:				new Buffer.from(event.png.replace(/^data:image\/octet-stream;base64,/,""), 'base64'),
			ACL:				'public-read',
		};
		const Item =
		{
			basename:		diagram.basename,
			name,
//			subkey:			'D-' + name,
			timestamp:		diagram.timestamp,
			user,
//			username:		user,
			description:	'description' in diagram ? diagram.description : '',
			properName:		'properName' in diagram ? diagram.properName : diagram.basename,
			references:		diagram.references,
		};
		const params =
		{
			TableName:  C.DIAGRAM_TABLE,
			Item,
		};
		bucket.putObject(s3params, function(err, data)
		{
			if (err)
			{
				console.log('Error',err);
				return;
			}
			AWS.config.update({region:C.REGION});
			const db = new AWS.DynamoDB.DocumentClient();
			db.put(params, function(err, data)
			{
				if (err)
				{
					console.log("Error", err, data);
					return;
				}
				AWS.config.update({region:C.REGION, credentials});
				const msg =
				{
					Message:	JSON.stringify({user, name, timestamp:diagram.timestamp, cat:diagram.codomain}),
					TopicArn:	C.CATECON_TOPIC
				};
				const publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(msg).promise();
				publishTextPromise.then(  function(data)
				{
					console.log(`Message ${msg.Message} sent to the topic ${msg.TopicArn}`);
					console.log("MessageID is " + data.MessageId);
					delete Item.subkey;
					const params =
					{
						TableName:  C.RECENT_DIAGRAM_TABLE,
						Item,
					};
					db.put(params, function(err, data)
					{
						if (err)
						{
							console.log("Error", err, data);
							return;
						}
						console.log(C.RECENT_DIAGRAM_TABLE, 'putItem succeeded', err, data);
						callback(err, data);
					});
				}).catch(function(err)
				{
					console.error(err, err.stack);
				});
			});
		});
	});
};
