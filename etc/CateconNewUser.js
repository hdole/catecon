const REGION = 'us-west-2';
const QueueUrl = 'https://sqs.us-west-2.amazonaws.com/395668725886/CateconNewUserQueue';

const AWS = require('aws-sdk');
AWS.config.update({region:REGION});

exports.handler = (event, context, callback) => {
    const username = 'userName' in event ? event.userName : 'stdFOO';
    const attrs = event.request.userAttributes;
    if (attrs['cognito:user_status'] !== 'CONFIRMED' || attrs.email_verified !== 'true')
        return callback(null, 'Status is not confirmed');
    const email = attrs.email;
    const db = new AWS.DynamoDB({region:REGION});
    const now = Date.now();
    const params =
    {
        TableName:  'Catecon-users',
        Item:
        {
            username:   {S:username},
            subkey:     {S:'H-REGISTRATION'},
            email:      {S:email},
            entryDate:  {N:now.toString()},
        },
    };
    console.log('params\n',params)
    db.putItem(params, function(err, data)
    {
        if (err)
            console.log("Error", err, data);
        else
            console.log("Success", err, data);
        const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
        const info =
        {
            MessageBody: JSON.stringify(params),
            QueueUrl
        };
        sqs.sendMessage(info, function(err, data)
        {
            if (err)
            {
                console.log('Error',err);
                return;
            }
            console.log("Success", data.MessageId);
            callback(null, event);
        });
    });
};