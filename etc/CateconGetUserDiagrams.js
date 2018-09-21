//
// Return the diagrams that belong to the event's user.
//
var AWS = require('aws-sdk');

const REGION = 'us-west-1';
const COGNITOREGION = 'us-west-2';
const IDENTITYPOOLID = 'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf';

AWS.config.update(
{
    region:         COGNITOREGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:IDENTITYPOOLID}),
});

exports.handler = (event, context, callback) =>
{
    const username = event.username;
    const db = new AWS.DynamoDB({region:REGION});
    const params =
    {
        TableName:  'Catecon-users',
        KeyConditionExpression: 'username = :u AND begins_with(subkey, :sk)',
        ExpressionAttributeValues:
        {
            ':u':   {S: username},
            ':sk':  {S: 'D-'}
        },
        ProjectionExpression:   'subkey, entryDate, fancyName, description'
    };
    db.query(params, function(err, data)
    {
        if (err)
            console.log("Error", err, data);
        else
            console.log("Success", err, JSON.stringify(data));
        const serverDiagrams = {};
        data.Items.map(d => serverDiagrams[d[0]] = {entryDate:d[1], fancyName:d[2], description:d[3]})
        callback(err, data);
    });
};