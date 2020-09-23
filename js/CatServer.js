require('dotenv').config();

const connect = require('connect');

const Cat = require('./Cat.js');

console.log('ready');
var server = connect().use((req, res, next) =>
{
	var url_parts = url.parse(req.url, true);
	const query = url_parts.query;

	if (req.method == 'GET')
	{
		switch (url_parts.pathname)
		{
			case '/somepath':
			// do something
			res.end();
			break;
		}
	}
})
.listen(1337);
