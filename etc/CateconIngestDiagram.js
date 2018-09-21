var AWS = require('aws-sdk');

const REGION = 'us-west-1';
const COGNITOREGION = 'us-west-2';
const DIAGRAMBUCKETNAME = 'catecon-diagrams';
const DIAGRAMTABLE = 'Catecon-users';
const RECENTDIAGRAMTABLE = 'Catecon-recent';
const IDENTITYPOOLID = 'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf';
const TOPIC_ARN = 'arn:aws:sns:us-west-1:395668725886:Catecon';

const credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId:IDENTITYPOOLID});

AWS.config.update(
{
    region: COGNITOREGION,
    credentials
});

const S3 = new AWS.S3({apiVersion: '2006-03-01'});

exports.handler = (event, context, callback) =>
{
    const dgrm = event.diagram;
    const username = 'username' in event ? event.username : 'stdFOO';
    if (dgrm.username !== username)
    {
        const message = `Error:  User ${username} is not the owner of ${dgrm.name}.  ${dgrm.username} is.`;
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
    const Key = `${dgrm.codomain}/${dgrm.user}/${dgrm.name}.json`;
    const Body = JSON.stringify(dgrm);
    bucket.putObject(
    {
       Bucket:  DIAGRAMBUCKETNAME,
       ContentType: 'json',
       Key,
       Body,
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
            TableName:  DIAGRAMTABLE,
            Item:
            {
                username:   {S:username},
                subkey:     {S:dgrm.name},
                entryDate:  {N:dgrm.entryDate.toString()},
                description:    {S:dgrm.description},
                fancyName:  {S:dgrm.html !== '' ? dgrm.html : dgrm.basename},
            },
        };
        db.putItem(params, function(err, data)
        {
            if (err)
            {
                console.log("Error", err, data);
                return;
            }
            AWS.config.update({region: REGION, credentials});
            const msg =
            {
                Message:    JSON.stringify({username, name:dgrm.name, entryDate:dgrm.entryDate, cat:dgrm.codomain}),
                TopicArn:   TOPIC_ARN
            };
            var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(msg).promise();
            publishTextPromise.then(  function(data)
            {
                console.log(`Message ${msg.Message} sent to the topic ${msg.TopicArn}`);
                console.log("MessageID is " + data.MessageId);
                const params =
                {
                    TableName:  RECENTDIAGRAMTABLE,
                    Item:
                    {
                        name:       {S:dgrm.name},
                        entryDate:  {N:dgrm.entryDate.toString()},
                        username:   {S:username},
                        description:{S:dgrm.description},
                        fancyName:  {S:dgrm.html !== '' ? dgrm.html : dgrm.basename},
                    },
                };
                db.putItem(params, function(err, data)
                {
                    if (err)
                    {
                        console.log("Error", err, data);
                        return;
                    }
                    console.log(RECENTDIAGRAMTABLE, 'putItem succeeded', err, data);
                    callback(err, data);
                });
            }).catch(function(err)
            {
                console.error(err, err.stack);
            });
        });
    });
};