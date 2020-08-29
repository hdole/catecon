// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
// Return diagrams matching a search string.
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');

AWS.config.update(
{
	region:		 	C.COGNITO_REGION,
	credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
});

//
// TODO DUPLICATE create util.js
//
function convert(data)
{
	const d =
	{
		name:			data.name.S,
		description:	data.description.S,
		timestamp:		Number.parseInt(data.timestamp.N, 10),
		properName:		data.properName.S,
		user:			data.user.S,
		basename:		data.basename.S,
		references:		data.references.L.map(s => s.S),
	};
	return d;
}

exports.handler = (event, context, callback) =>
{
    const search = event.search;
	console.log('search term', search);
	const db = new AWS.DynamoDB({region:C.REGION});
	const params =
	{
		TableName:					C.DIAGRAM_TABLE,
		ExpressionAttributeNames:	{'#n':'name'},
		ExpressionAttributeValues:	{':s':	{S:search}},
		FilterExpression:			'contains(#n, :s)',
	};
	db.scan(params, function(err, data)
	{
		if (err)
		{
			console.log("Error", err, data);
			return;
		}
		const diagrams = [];
		for (let i=0; i<data.Items.length; ++i)
		{
			const itm = data.Items[i];
			const d = convert(itm);
			diagrams.push(d);
		}
		callback(err, diagrams);
	});
};
