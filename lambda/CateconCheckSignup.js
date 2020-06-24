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

exports.handler = (event, context, callback) =>
{
	const db = new AWS.DynamoDB({region:C.REGION});
	const params =
	{
		TableName:					C.DIAGRAM_TABLE,
//		ExpressionAttributeNames:	{'#ts':'timestamp', '#r':'references'},
		ProjectionExpression:		'subkey',
		ExpressionAttributeValues:	{':str':{'S':'H-'}},
		KeyConditionExpression:		'begins_with(subkey, :str)',
//		Select:						'COUNT',
	};
	db.query(params, function(err, data)
	{
		if (err)
		{
			console.log("Error", err, data);
			return;
		}

		console.log('count', data);
	});
};
