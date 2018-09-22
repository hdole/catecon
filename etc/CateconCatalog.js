//
// Return the most recent diagrams.
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update(
{
    region:         C.COGNITO_REGION,
    credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
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
    const db = new AWS.DynamoDB({region:C.REGION});
    const params =
    {
        TableName:  C.DIAGRAM_TABLE,
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
        const URL = `https://s3-${C.REGION}.amazonaws.com/${C.DIAGRAM_BUCKET_NAME}`;
        const bucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: C.DIAGRAM_BUCKET_NAME}});
        const Key = 'catalog.json';
        const Body = JSON.stringify(Object.values(dgrms));
        bucket.putObject(
        {
           Bucket:  C.DIAGRAM_BUCKET_NAME,
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
