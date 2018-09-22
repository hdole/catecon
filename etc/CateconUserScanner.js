const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update({region:C.REGION});

exports.handler = (event, context, callback) =>
{
    const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
    
    const info =
    {
        AttributeNames: ['SentTimeStamp'],
        MaxNumberOfMessages:    10,
        MessageAttributeNames:  ['All'],
        QueueUrl:				C.NEW_USER_QUEUE
    };
    sqs.receiveMessage(info, function(err, data)
    {
        if (err)
        {
            console.log('Error',err);
            return;
        }
        console.log('Catecon User Scanner message count', 'Messages' in data ? data.Messages.length : 0);
        let Message = '';
        if ('Messages' in data)
        {
            for (let i=0; i<data.Messages.length; ++i)
            {
                const m = JSON.parse(data.Messages[i].Body);
                const d = new Date(Number.parseInt(m.Item.entryDate.N, 10)).toLocaleString();
                Message += `Username ${m.Item.username.S} email ${m.Item.email.S} registered at ${d}\n`;
            }
        }
        else
            Message = '';
        const msg =
        {
            Message,
            TopicArn:	C.NEW_USER_QUEUE
        };
        if (Message !== '')
        {
            var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(msg).promise();
            publishTextPromise.then(  function(data)
            {
                console.log(`Message [${msg.Message}] sent to the topic ${msg.TopicArn}`);
                console.log("MessageID is " + data.MessageId);
            }).catch(function(err)
            {
                console.error(err, err.stack);
            });
            if ('Messages' in data && data.Messages.length > 0)
            {
                const Entries = data.Messages.map((m, i) => { return {Id: i.toString(), ReceiptHandle: m.ReceiptHandle}});
                for (let i=0; i<data.Messages.length; ++i)
                {
                    var delInfo = {QueueUrl: C.NEW_USER_QUEUE, Entries};
                    console.log('About to delete messages');
                    sqs.deleteMessageBatch(delInfo, function(err, data)
                    {
                        if (err)
                        {
                            console.log('Error in deleteMessageBatch', err);
                            return;
                        }
                        console.log('Success in deleteMessageBatch', data);
                        callback(err, data);
                    });
                }
            }
        }
        else
            callback(err, 'No activity');
    });
};
