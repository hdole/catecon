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
		Select:						'COUNT',
	};
	const e = event;
	db.scan(params, function(err, data)
	{
		if (err)
		{
			console.log("Error", err, data);
			return;
		}
		console.log('count', data, e);

		e.response.autoConfirmUser = data.Count <= C.USERCOUNT;

		console.log('autoConfirmUser', e.response.autoConfirmUser);
		callback(null, e);
	});
};
