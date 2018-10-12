// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update({region:C.REGION});

exports.handler = (event, context, callback) =>
{
	const db = new AWS.DynamoDB({region:C.REGION});
	const now = Date.now();
	const params =
	{
		TableName:	C.CT_TABLE,
		Item:
		{
			IP:			{S:event.IP},
			timestamp:	{N:now.toString()},
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
			MessageBody:	JSON.stringify(params),
			QueueUrl:		C.NEW_USER_QUEUE
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