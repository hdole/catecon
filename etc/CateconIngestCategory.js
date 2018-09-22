// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update(
{
    region:			C.COGNITO_REGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
});

const S3 = new AWS.S3({apiVersion: '2006-03-01'});

exports.handler = (event, context, callback) =>
{
    const cat = event.diagram;
    const username = event.username;
    if (cat.user !== username)
    {
        const message = `Error:  User ${username} is not the owner of ${cat.name}.  ${cat.user} is.`;
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
    const Key = `${cat.name}/${cat.name}.json`;
    bucket.putObject(
    {
       Bucket:  C.DIAGRAM_BUCKET_NAME,
       ContentType: 'json',
       Key,
       Body:    JSON.stringify(cat),
       ACL:     'public-read',
    }, function(err, data)
    {
        if (err)
        {
            console.log('Error',err);
            return;
        }
        const db = new AWS.DynamoDB({region:C.REGION});
        const params =
        {
            TableName:  'Catecon-categories',
            Item:
            {
                username:   {S:username},
                subkey:     {S:cat.name},
                entryDate:  {N:cat.entryDate.toString()},
                description:{S:cat.description},
                fancyName:  {S:cat.html !== '' ? cat.html : cat.name},
            },
        };
        db.putItem(params, function(err, data)
        {
            if (err)
                console.log("Error", err, data);
            else
                console.log("Success", err, data);
            callback(err, data);
        });

    });
};
