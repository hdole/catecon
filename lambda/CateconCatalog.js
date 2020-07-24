// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
// Return the most recent diagrams.
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update(
{
	region:		 C.COGNITO_REGION,
	credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
});

//
// TODO DUPLICATE create util.js
//
function convert(data)
{
	const d =
	{
		name:			data.name.S,
		description:	data.description.S,
		timestamp:		Number.parseInt(data.timestamp.N, 10),
		properName:		data.properName.S,
		user:			data.user.S,
		basename:		data.basename.S,
		references:		data.references.L.map(s => s.S),
	};
	return d;
}

exports.handler = (event, context, callback) =>
{
	const db = new AWS.DynamoDB({region:C.REGION});
	const params =
	{
		TableName:					C.DIAGRAM_TABLE,
		ExpressionAttributeNames:	{'#n':'name', '#u':'user', '#ts':'timestamp', '#r':'references'},
//		ExpressionAttributeNames:	{'#u':'user', '#ts':'timestamp', '#r':'references'},
		ProjectionExpression:		'#n, #u, #ts, basename, properName, description, #r'
	};
	db.scan(params, function(err, data)
	{
		if (err)
		{
			console.log("Error", err, data);
			return;
		}
		const dgrms = {};
		for (let i=0; i<data.Items.length; ++i)
		{
			const itm = data.Items[i];
			if (!('description' in itm))
				continue;
			const d = convert(itm);
			if (d.name in dgrms)
			{
				if (d.timestamp > dgrms[d.name].timestamp)
					dgrms[d.name] = d;
			}
			else
				dgrms[d.name] = d;
		}
		const S3 = new AWS.S3({apiVersion: '2006-03-01'});
		const URL = `https://s3-${C.REGION}.amazonaws.com/${C.DIAGRAM_BUCKET_NAME}`;
		const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: C.DIAGRAM_BUCKET_NAME}});
		const Key = 'catalog.json';
		const timestamp = Date.now();
		const Body = JSON.stringify({timestamp, diagrams:Object.values(dgrms)});
		bucket.putObject(
		{
			Bucket:	C.DIAGRAM_BUCKET_NAME,
			ContentType: 'json',
			Key,
			Body,
			ACL:	 	'public-read',
		}, function(err, data)
		{
			if (err)
			{
				console.log('Error',err);
				return;
			}
			callback(err, 'ok');
		});
	});
};
