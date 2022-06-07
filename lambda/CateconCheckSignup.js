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
	
	const bad = new Set(["about","abuse","access","account","accounts","activate","address","admin","administration","administrator","adult","advertising","affiliate","affiliates","analytics","android","anonymous","apple","arabic ","archive",
		"archives","authentication","avatar","awadhi ","azerbaijani ","backup","banner","banners","bengali ","bhojpuri ","billing","blogs","board","burmese ","business","cache","cadastro","calendar","campaign","cancel",
		"careers","changelog","checkout","chinese ","client","cliente","codereview","comercial","compare","compras","config","configuration","connect","contact","contest","create","dashboard","delete","design","designer",
		"devel","direct_messages","directory","documentation","domain","download","downloads","dutch ","ecommerce","editor","email","employment","english ","enterprise","facebook","farsi ","favorite","favorites","feedback","feeds",
		"files","fleet","fleets","follow","followers","following","forum","forums","french ","friend","friends","gadget","gadgets","games","german ","github","google","group","groups","guest",
		"gujarati ","hakka ","hausa ","hindi ","homepage","hosting","hostmaster","hostname","httpd","https","ideas","image","images","imulus","index","indice","information","intranet","invitations","invite",
		"iphone","italian ","japanese ","javanese ","javascript","jinyu ","kannada ","knowledgebase","korean ","language","languages","list-request","lists","login","logout","mail1","mail2","mail3","mail4","mail5",
		"mailer","mailing","maithili ","malayalam ","manager","mandarin ","marathi ","marketing","master","media","message","messenger","microblog","microblogs","min-nan ","mobile","movie","movies","music","musicas",
		"mysql","named","network","newsletter","nickname","notes","noticias","oauth","oauth_clients","offers","online","openid","operator","order","orders","organizations","oriya ","pager","pages","panel",
		"panjabi ","password","photo","photoalbum","photos","plans","plugin","plugins","polish ","popular","portuguese ","postfix","postmaster","posts","privacy","profile","project","projects","promo","public",
		"python","random","recruitment","register","registration","remove","replies","romanian ","russian ","sales","sample","samples","script","scripts","search","secure","security","serbo-croatian ","service","sessions",
		"setting","settings","setup","signin","signup","sindhi","sitemap","sites","soporte","spanish ","ssladmin","ssladministrator","sslwebmaster","stacks","stage","staging","start","static","stats","status",
		"store","stores","stories","styleguide","subdomain","subscribe","subscriptions","sunda ","suporte","support","support-details","supportdetails","sysadmin","sysadministrator","system","tablet","tablets","tamil ","tasks","telnet",
		"telugu ","terms","test1","test2","test3","teste","tests","thai ","theme","themes","tools","translations","trends","turkish ","twitter","ukrainian ","unfollow","unsubscribe","update","upload",
		"urdu ","usage","usenet","username","usuario","vendas","video","videos","vietnamese ","visitor","weather","webmail","webmaster","website","websites","widget","widgets","workshop","xiang ","yoruba ",
		"yourdomain","yourname","yoursite","yourusername"]);


	if (bad.has(user.toLowerCase()))
	{
		callback(new Error('User name not allowed'), e);
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


