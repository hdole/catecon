var AWS = require('aws-sdk');

const REGION = 'us-west-1';
const COGNITOREGION = 'us-west-2';
const DIAGRAMBUCKETNAME = 'catecon-diagrams';
const IDENTITYPOOLID = 'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf';

AWS.config.update(
{
    region: COGNITOREGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:IDENTITYPOOLID}),
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
    const URL = `https://s3-${REGION}.amazonaws.com/${DIAGRAMBUCKETNAME}`;
    const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: DIAGRAMBUCKETNAME}});
    const Key = `${cat.name}/${cat.name}.json`;
    bucket.putObject(
    {
       Bucket:  DIAGRAMBUCKETNAME,
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
        const db = new AWS.DynamoDB({region:REGION});
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