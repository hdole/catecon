//
// Return the most recent diagrams.
//
var AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update(
{
    region:         C.COGNITO_REGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
});

function convert(data)
{
    const d =
    {
        name:       data.name.S,
        description:data.description.S,
        entryDate:  Number.parseInt(data.entryDate.N, 10),
        fancyName:  data.fancyName.S,
        username:   data.username.S
    };
    return d;
}

exports.handler = (event, context, callback) =>
{
    const db = new AWS.DynamoDB({region:C.REGION});
    const params =
    {
        TableName:  C.RECENT_DIAGRAM_TABLE,
        ExpressionAttributeNames: { "#nm":"name"},
        ProjectionExpression:   '#nm, username, entryDate, fancyName, description'
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
        const URL = `https://s3-${C.REGION}.amazonaws.com/${C.DIAGRAM_BUCKET_NAME}`;
        const Body = JSON.stringify(Object.values(dgrms));
        const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: C.DIAGRAM_BUCKET_NAME}});
        bucket.putObject(
        {
           Bucket:  C.DIAGRAM_BUCKET_NAME,
           ContentType: 'json',
           Key: 'recent.json',
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
