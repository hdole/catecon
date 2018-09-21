const REGION = 'us-west-1';
const AWS = require('aws-sdk');
AWS.config.update({region:REGION});

exports.handler = (event, context, callback) => {
    // TODO implement
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!')
    };
    console.log('CateconDiagramUpdate event', event);
    console.log('CateconDiagramUpdate context', context);
    const sourceBucket = event.Records[0].s3.bucket.name;
    const sourceKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    
    const username = event.userName;
    const attrs = event.userAttributes;
    
    if (attrs['cognito:user_status'] !== 'CONFIRMED' || attrs.email_verified !== 'true')
        return callback(null, 'Status is not confirmed');
    
    const email = attrs.email;

    const db = new AWS.DynamoDB({region:REGION});
    const params =
    {
//        Key:    {'username': {N: 'hdole'}},
        TableName:  'catecon-diagrams',
//        ProjectionExpression:   'diagrams',
        Item:{username, email},
    };

    db.putItem(params, function(err, data)
    {
        if (err)
            console.log("Error", err, data);
        else
            console.log("Success", err, data);
    });
    callback(null, response);
};