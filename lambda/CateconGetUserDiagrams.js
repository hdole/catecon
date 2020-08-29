// (C) 2018 Harry Dole
INACTIVE
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
    const user = event.user;
    const db = new AWS.DynamoDB({region:C.REGION});
    const params =
    {
        TableName:				C.DIAGRAM_TABLE,
//        KeyConditionExpression: 'username = :u AND begins_with(subkey, :sk)',
        KeyConditionExpression: 'begins_with(#nm, :nm)',
        ExpressionAttributeNames:
		{
			'#ts':'timestamp',
			'#nm':'name',
//			'#u':'user',
			'#refs':'references'
		},
        ExpressionAttributeValues:
        {
            ':nm':   {S: `${user}/`},
//            ':sk':  {S: 'D-'},
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
