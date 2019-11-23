// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
// Return the diagrams that belong to the event's user.
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update(
{
    region:         C.COGNITO_REGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
});

exports.handler = (event, context, callback) =>
{
    const username = event.user;
    const db = new AWS.DynamoDB({region:C.REGION});
    const params =
    {
        TableName:				C.DIAGRAM_TABLE,
        KeyConditionExpression: 'username = :u AND begins_with(subkey, :sk)',
        ExpressionAttributeNames:
		{
			'#ts':'timestamp',
			'#nm':'name',
			'#refs':'references'
		},
        ExpressionAttributeValues:
        {
            ':u':   {S: username},
            ':sk':  {S: 'D-'},
        },
        ProjectionExpression:   '#nm, #ts, properName, description, basename, #refs'
    };
    db.query(params, function(err, data)
    {
        if (err)
            console.log("Error", err, data);
        else
            console.log("Success", err, JSON.stringify(data));
        const serverDiagrams = {};
        callback(err, data);
    });
};
