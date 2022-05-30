// (C) 2018-2022 Harry Dole
// Catecon:  The Categorical Console
//
//

const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');
const mysql = require('mysql')

AWS.config.update(
{
	region:		 C.COGNITO_REGION,
	credentials:	new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID}),
});

const pool = mysql.createPool(
{
	host:		C.MYSQL_HOST,
	user:		C.MYSQL_USER,
	password:	C.MYSQL_PASSWORD,
	database:	C.MYSQL_DATABASE,
});

exports.handler =  (e, context, callback) =>
{
	context.callbackWaitsForEmptyEventLoop = false;
	e.response.autoConfirmUser = false;
	const attrs = e.request.userAttributes;
	const secret = attrs['custom:secret'];
	const user = e.userName;
	if (user.length < 5)
	{
		callback(new Error('User name must be five or more characters'), e);
		return;
	}
	pool.getConnection((err, conn) =>
	{
		conn.query(`SELECT * FROM tokens WHERE secret='${secret}';`, (err, results, fields) =>
		{
			if (err)
			{
				callback(err);
				return;
			}
			if (results.length === 0)
			{
				conn.release();
				console.log('secret not found', secret);
				callback(new Error('Your categorical secret is not good enough'), e);
				return;
			}
			if (results[0].user === null && results[0].consumed === null)
			{
				const sql = `UPDATE tokens set user='${user}',consumed='${Date.now()}' WHERE secret='${secret}';`;
				conn.query(sql, (err, results, fields) =>
				{
					if (err)
					{
						conn.release();
						console.log('error updating database', err, user, secret, sql);
						callback(new Error('Cannot update database for new user'), e);
						return;
					}
					conn.release();
					callback(null, e);
				});
			}
			else
			{
				conn.release();
				console.log('secret already used', secret);
				callback(new Error('Your categorical secret is already used'), e);
				return;
			}
		});
	});
};


