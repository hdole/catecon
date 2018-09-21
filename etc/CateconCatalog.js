//
// Return the most recent diagrams.
//
var AWS = require('aws-sdk');

const REGION = 'us-west-1';
const COGNITOREGION = 'us-west-2';
const IDENTITYPOOLID = 'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf';
const DIAGRAMTABLE = 'Catecon-users';
const RECENTDIAGRAMTABLE = 'Catecon-recent';
const DIAGRAMBUCKETNAME = 'catecon-diagrams';

AWS.config.update(
{
    region:         COGNITOREGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:IDENTITYPOOLID}),
});

//
// TODO DUPLICATE create util.js
//
function convert(data)
{
    const d =
    {
        name:       data.subkey.S,
        description:data.description.S,
        entryDate:  Number.parseInt(data.entryDate.N, 10),
        fancyName:  data.fancyName.S,
        username:   data.username.S
    };
    return d;
}

exports.handler = (event, context, callback) =>
{
    const db = new AWS.DynamoDB({region:REGION});
    const params =
    {
        TableName:  DIAGRAMTABLE,
        ProjectionExpression:   'username, subkey, entryDate, fancyName, description'
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
            const d = convert(data.Items[i]);
            if (d.name in dgrms)
            {
                if (d.entryDate > dgrms[d.name].entryDate)
                    dgrms[d.name] = d;
            }
            else
                dgrms[d.name] = d;
        }
        const S3 = new AWS.S3({apiVersion: '2006-03-01'});
        const URL = `https://s3-${REGION}.amazonaws.com/${DIAGRAMBUCKETNAME}`;
        const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: DIAGRAMBUCKETNAME}});
        const Key = 'catalog.json';
        const Body = JSON.stringify(Object.values(dgrms));
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
            callback(err, 'ok');
        });
    });
};