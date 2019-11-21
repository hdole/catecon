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
        ExpressionAttributeNames: {'#ts':'timestamp'},
        ExpressionAttributeValues:
        {
            ':u':   {S: username},
            ':sk':  {S: 'D@'}
        },
        ProjectionExpression:   'subkey, #ts, properName, description'
    };
    db.query(params, function(err, data)
    {
        if (err)
            console.log("Error", err, data);
        else
            console.log("Success", err, JSON.stringify(data));
        const serverDiagrams = {};
        data.Items.map(d => serverDiagrams[d[0]] = {timestamp:d[1], properName:d[2], description:d[3]});
        callback(err, data);
    });
};
