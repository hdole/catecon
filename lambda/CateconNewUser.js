// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

//AWS.config.update({region:C.REGION});

const credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID});

AWS.config.update(
{
	region:		C.COGNITO_REGION,
	credentials
});

exports.handler = (event, context, callback) =>
{
	const user = 'userName' in event ? event.userName : 'stdFOO';
	const attrs = event.request.userAttributes;
//	if (attrs['cognito:user_status'] !== 'CONFIRMED' || attrs.email_verified !== 'true')
	if (attrs['cognito:user_status'] !== 'CONFIRMED')
		return callback(null, 'Status is not confirmed');
	const email = attrs.email;
	const db = new AWS.DynamoDB({region:C.REGION});
	const now = Date.now();
	const params =
	{
		TableName:	C.DIAGRAM_TABLE,
		Item:
		{
			username:	{S:user},
			subkey:	 	{S:'REGISTRATION'},
			email:		{S:email},
			timestamp:	{N:now.toString()},
		},
	};
	db.putItem(params, function(err, data)
	{
		const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
		const info =
		{
			MessageBody: JSON.stringify(params),
			QueueUrl:		C.NEW_USER_QUEUE
		};
		sqs.sendMessage(info, function(err, data)
		{
			if (err)
			{
				console.log('Error',err);
				return;
			}
			callback(null, event);
		});
	});
	const S3 = new AWS.S3({apiVersion: '2006-03-01'});
	const URL = `https://s3-${C.REGION}.amazonaws.com/${C.DIAGRAM_BUCKET_NAME}`;
	const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: C.DIAGRAM_BUCKET_NAME}});
	const anonKey = 'Anon/Home.json';
	const userKey = `${user}/Home.json`;
	console.log('check for file existence');
	bucket.getObject({Bucket:C.DIAGRAM_BUCKET_NAME, Key:userKey}, function(err, data)
	{
		if (err)	// file does not exist so create it
		{
			console.log('file does not exist');
			bucket.getObject({Bucket:C.DIAGRAM_BUCKET_NAME, Key:anonKey}, function(err, data)
			{
				if (err)
				{
					console.log('Error',err);
					return;
				}
				const diagram = JSON.parse(data.Body.toString('utf-8'));
				diagram.description = `User ${user} home diagram`;
				diagram.name = `${user}/Home`;
				diagram.diagram = `${user}/${user}`;
				diagram.domain = `${user}/Home_Index`;
				diagram.timestamp = now;
				diagram.user = user;
				diagram.domainElements.map(elt =>
				{
					elt.diagram = diagram.name;
					elt.name = elt.name.replace(/^Anon/g, user);
				});
				const Body = JSON.stringify(diagram);
				bucket.putObject(
				{
					Bucket:			C.DIAGRAM_BUCKET_NAME,
					ContentType:	'json',
					Key:			userKey,
					Body,
					ACL:			'public-read',
				}, function(err, data)
				{
					if (err)
					{
						console.log('Error',err);
						return;
					}
					callback(err, 'ok');
					console.log('file written');
				});
				callback(err, 'ok');
			});
			const CopySource = `${C.DIAGRAM_BUCKET_NAME}/Anon/Home.png`;
			console.log({CopySource});
//			bucket.copyObject({CopySource, Key: `${C.DIAGRAM_BUCKET_NAME}/${user}/Home.png`}, function(err, data)
			bucket.copyObject(
			{
				CopySource,
				Key:		`${user}/Home.png`,
				ACL:		'public-read',
			}, function(err, data)
			{
				console.log(err ? err : data);
			});
		}
		else
			console.log('file already exists!', userKey);
		callback(err, 'ok');	// not nn error since there is a home diagram
	});
	AWS.config.update({region:C.REGION, credentials});
	const msg =
	{
		Message:	`New user ${user} ${email} ${new Date(now).toString()}`,
		TopicArn:	C.CATECON_TOPIC
	};
	var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(msg).promise();
	publishTextPromise.then(function(data)
	{
	});
};
