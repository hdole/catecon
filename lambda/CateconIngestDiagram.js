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
	const dgrm = event.diagram;
	const username = 'username' in event ? event.username : 'stdFOO';
	if (dgrm.username !== username)
	{
		const message = `Error:  User ${username} is not the owner of ${dgrm.name}.  ${dgrm.username} is.`;
		console.log(message);
		callback(message, null);
		return;
	}	
	// TODO: name check
	// TODO: category check
	// TODO: diagram name check
	//
	const URL = `https://s3-${C.REGION}.amazonaws.com/${C.DIAGRAM_BUCKET_NAME}`;
	const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: C.DIAGRAM_BUCKET_NAME}});
	const Key = `${dgrm.codomain}/${dgrm.username}/${dgrm.name}.json`;
	const Body = JSON.stringify(dgrm);
	const s3params =
	{
		Bucket:  C.DIAGRAM_BUCKET_NAME,
		ContentType: 'json',
		Key,
		Body,
		ACL:	 'public-read',
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
			Key:				`${dgrm.codomain}/${dgrm.username}/${dgrm.name}.png`,
			Body:				new Buffer(event.png.replace(/^data:image\/octet-stream;base64,/,""), 'base64'),
			ACL:				'public-read',
		};
		bucket.putObject(s3params, function(err, data)
		{
			if (err)
			{
				console.log('Error',err);
				return;
			}

			const db = new AWS.DynamoDB({region:C.REGION});
			const description = dgrm.description !== '' ? dgrm.description : 'no description';
			const params =
			{
				TableName:  C.DIAGRAM_TABLE,
				Item:
				{
					username:	{S:username},
					subkey:	 {S:dgrm.name},
					timestamp:  {N:dgrm.timestamp.toString()},
	//				description:	{S:dgrm.description !== '' ? dgrm.description : 'no description'},
					description:	{S:description},
					fancyName:  {S:dgrm.html !== '' ? dgrm.html : dgrm.basename},
				},
			};
			db.putItem(params, function(err, data)
			{
				if (err)
				{
					console.log("Error", err, data);
					return;
				}
				AWS.config.update({region:C.REGION, credentials});
				const msg =
				{
					Message:	JSON.stringify({username, name:dgrm.name, timestamp:dgrm.timestamp, cat:dgrm.codomain}),
					TopicArn:	C.CATECON_TOPIC
				};
				var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(msg).promise();
				publishTextPromise.then(  function(data)
				{
					console.log(`Message ${msg.Message} sent to the topic ${msg.TopicArn}`);
					console.log("MessageID is " + data.MessageId);
					const params =
					{
						TableName:  C.RECENT_DIAGRAM_TABLE,
						Item:
						{
							name:		{S:dgrm.name},
							timestamp:  {N:dgrm.timestamp.toString()},
							username:	{S:username},
							description:	{S:description},
							fancyName:  {S:dgrm.html !== '' ? dgrm.html : dgrm.basename},
						},
					};
					db.putItem(params, function(err, data)
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
