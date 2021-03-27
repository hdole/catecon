// (C) 2018-2021 Harry Dole, All Rights Reserved
// Catecon:  The Categorical Console
//
require('dotenv').config();

const path = require('path');
const createError = require('http-errors');

const express = require('express');

const app = express();

// view engine setup
app.set('views', path.join(process.env.CAT_DIR, 'views'));
app.set('view engine', 'pug');

app.use(express.urlencoded({extended:true}));
app.use(express.json({limit:process.env.HTTP_UPLOAD_LIMIT}));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const diagramRouter = require('./routes/diagram');
app.use('/', diagramRouter);

const cors = require('cors');
app.use(cors());

const helmet = require('helmet');
app.use(helmet());

const bodyParser = require('body-parser');

const cognito = require('amazon-cognito-identity-js');		// aws user support
const url = require('url');
const fs = require('fs');
const repl = require('repl');
const encoding = require('encoding');
const util = require( 'util' );
const mysql = require( 'mysql' );
const {VM} = require('vm2');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

const D2 = require('./public/js/D2.js');
const Cat = require('./public/js/Cat.js');
const jsAction = require('./public/js/javascript.js');

Cat.R.default.debug = false;
Cat.R.cloudURL = process.env.CAT_CLOUD;

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';
//
// rotate access log files
//
const accessLogStream = rfs.createStream('access.log', {interval:'1d', path:process.env.CAT_SRVR_LOG, size:process.env.CAT_SRVR_LOG_SIZE});
if (process.env.NODE_ENV !== 'production')
	app.use(morgan('dev'));
app.use(morgan('combined', {stream:accessLogStream}));
//
// error setup
//
Error.stackTraceLimit = 30;
//
// user info cache
//
const userInfo = new Map();
function hasPermission(name, priv)
{
	const user = userInfo.get(name);
	if (user)
		return user.permissions.split(' ').includes(priv);
	return false;
}
//
// mysql connection arguments
//
const mysqlArgs =
{
	host:				process.env.MYSQL_HOST,
	port:				process.env.MYSQL_PORT,
	user:				process.env.MYSQL_USER,
	password:			process.env.MYSQL_PASSWORD,
	multipleStatements:	true,
};

let dbcon = null;		// mysql server connection
let dbconSync = null;	// mysql server synchronous connection

function currentTime()
{
	return new Date().toString();
}

function log(...args)
{
	console.log(currentTime(), ...args);
}

function reqlog(req, ...args)
{
	console.log(req.connection.remoteAddress, currentTime(), ...args);
}

function makeDbconSync(mysqlArgs)	// allows synchronous calls
{
	log('Connecting to mysql server');
	dbcon = mysql.createConnection(mysqlArgs);
	global.dbcon = dbcon;
	dbconSync =
	{
		query(sql, args) { return util.promisify(dbcon.query).call(dbcon, sql, args); },
		close() { return util.promisify(dbcon.end ).call(dbcon); },
	};
}

function mysqlKeepAlive()
{
	makeDbconSync(mysqlArgs);
	dbcon.connect(err =>
	{
		if (err)
		{
			log('Error on connection to mysql server', err);
			setTimeout(mysqlKeepAlive, 2000);
		}
	});
	dbcon.on('error', err =>
	{
		log('Error from mysql server:', err);
		if (err.code === 'PROTOCOL_CONNECTION_LOST')
			mysqlKeepAlive();
		else
			throw err;
	});
}

function saveHTMLjs()
{
	Cat.R.SelectDiagram('hdole/HTML', diagram =>
	{
		const js = Cat.R.Actions.javascript.generateDiagram(diagram);
		fs.writeFile('js/HTML.js', js, err => {if (err) throw err;});
		res.end('ok');
	});
}

function getDiagramInfo(diagram)
{
	return {
		name:			diagram.name,
		basename:		diagram.basename,
		description	:	diagram.description,
		properName:		diagram.properName,
		timestamp:		diagram.timestamp,
		user:			diagram.user,
		references:		diagram.references,
	};
}

function saveDiagramJson(name, diagramString)
{
	const dgrmFile = `public/diagram/${name}.json`;
	fs.mkdirSync(path.dirname(dgrmFile), {recursive:true});
	const dgrmFD = fs.openSync(dgrmFile, 'w');
	fs.writeSync(dgrmFD, diagramString, 0, diagramString.length +1);
	fs.closeSync(dgrmFD);
}

function saveDiagramPng(name, inbuf)
{
	const buf = typeof inbuf === 'string' ? new Buffer.from(inbuf.replace(/^data:image\/octet-stream;base64,/,""), 'base64') : inbuf;
	if (buf.length > 128 * 1024)
		throw 'PNG file too large';
	const pngFile = `public/diagram/${name}.png`;
	fs.mkdir(path.dirname(pngFile), {recursive:true}, _ => fs.open(pngFile, 'w', (err, pngFD) =>
	{
		if (err) throw err;
		fs.write(pngFD, buf, 0, buf.length, (err, bytes, data) =>
		{
			if (err) throw err;
			fs.close(pngFD, err => { if (err) throw err; });
		});
	}));
}

function evaluateMorphism(diagram, morphism, args)
{
	const jsName = Cat.U.Token(morphism);
	const isIterable = morphism.isIterable();
	const iterInvoke = morphism instanceof Cat.Composite ? `${Cat.U.Token(morphism.getFirstMorphism())}_Iterator(${jsName})` : `${Cat.U.Token(morphism.domain)}_Iterator(${jsName})`;
	const code =
`// Catecon javascript code generator ${Date()}

const args = ${args};

${Cat.R.Actions.javascript.generate(morphism)}

${jsName}(${args});
`;
	const vm = new VM();
	return vm.run(code);
}

//
// Update the reference count field for each diagram in our database.
//
async function determineRefcnts()
{
	await dbcon.query('SELECT name,refs FROM Catecon.diagrams', (err, result) =>
	{
		if (err) throw err;
		const refcnts = new Map();
		result.forEach(row =>
		{
			const name = row.name;
			if (!refcnts.has(name))
				refcnts.set(name, 0);
			const refs = JSON.parse(row.refs);
			refs.map(ref =>
			{
				if (!refcnts.has(ref))
					refcnts.set(ref, 0);
				refcnts.set(ref, 1 + refcnts.get(ref));
			});
		});
		refcnts.forEach((cnt, ref) => dbcon.query(`UPDATE Catecon.diagrams SET refcnt=${cnt} WHERE name='${ref}';`));
	});
}

function updateRefcnts(oldrefs, newrefs)
{
	const plusOne = [];
	const minusOne = [];
	oldrefs.map(ref => !newrefs.includes(ref) && minusOne.push(ref));
	newrefs.map(ref => !oldrefs.includes(ref) && plusOne.push(ref));
	plusOne.map(name =>
	{
		const diagram = Cat.R.catalog.get(name);
		if (diagram)
			diagram.refcnt++;
		else
			console.trace('updateRefcnts: diagram catalog does not contain', name);
		dbcon.query('UPDATE Catecon.diagrams SET refcnt=refcnt + 1 WHERE name=?;', [name]);
	});
	minusOne.map(name =>
	{
		Cat.R.catalog.get(name).refcnt--;
		dbcon.query('UPDATE Catecon.diagrams SET refcnt=refcnt - 1 WHERE name=?;', [name]);
	});
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// get our application keys
//
let JWK = null;
function fetchJWK()
{
	const url = `https://cognito-idp.${process.env.AWS_USER_COG_REGION}.amazonaws.com/${process.env.AWS_USER_IDENTITY_POOL}/.well-known/jwks.json`;
	fetch(url).then(res => res.json()).then(json => {JWK = json;});
}
fetchJWK();

mysqlKeepAlive(mysqlArgs);

function validate(req, res, fn)
{
	const token = req.get('token') || (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
	if (typeof token === 'undefined')
	{
		res.status(401).end('Error:  no token');
		return;
	}
	Cat.R.user.token = token;
	const decjwt = jwt.decode(token, {complete:true});
	if (typeof decjwt === 'undefined' || decjwt === null)
	{
		res.status(401).end({'Error':'no jwt'});
		return;
	}
	if (decjwt.payload.aud !== process.env.AWS_APP_ID)
	{
		console.log(decjwt.payload.aud, process.env.AWS_APP_ID);
		res.status(401).end({'Error':'bad app id'});
		return;
	}
	const idURL = `https://cognito-idp.${process.env.AWS_USER_COG_REGION}.amazonaws.com/${process.env.AWS_USER_IDENTITY_POOL}`;
	if (decjwt.payload.iss !== idURL)
	{
		res.status(401).end('Error:  bad identity pool');
		return false;
	}
	const key = JWK.keys.find(k => k.kid === decjwt.header.kid);
	if (typeof key === 'undefined')
	{
		res.status(500).end('Error:  no key');
		return;
	}
	const pem = jwkToPem(key);
	jwt.verify(token, pem, fn);
}

function updateDiagramTable(name, info, fn)
{
	if (info.user === 'sys')
		return;
	const updateSql = 'UPDATE Catecon.diagrams SET name = ?, basename = ?, user = ?, description = ?, properName = ?, refs = ?, timestamp = ?, codomain = ?, refcnt = ?, cloudTimestamp = ? WHERE name = ?';
	const args = [name, info.basename, info.user, info.description, info.properName, JSON.stringify(info.references), info.timestamp, info.codomain, info.refcnt, info.timestamp, name];
	console.log('updating diagram table', args);
	dbcon.query(updateSql, args, fn);
}

function updateSQLDiagramsByCatalog()
{
	// make local server match cloud
	dbcon.query('SELECT * FROM Catecon.diagrams', (err, diagrams) =>
	{
		if (err) throw err;
		const remaining = new Set(Cat.R.catalog.keys());
		diagrams.map(info =>
		{
			if (info.user !== 'sys')
			{
				const cloudInfo = Cat.R.catalog.get(info.name);
				if (cloudInfo && cloudInfo.timestamp > info.timestamp)		// cloud is newer
					updateDiagramTable(info.name, cloudInfo, (err, result) => err && console.log({err}));
			}
			remaining.delete(info.name);
		});
		remaining.forEach(name => updateDiagramTable(name, Cat.R.catalog.get(name), (err, result) => err && console.log({err})));
	});
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Server main
//
async function serve()
{
	try
	{
		dbcon.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'Catecon';", (err, result) =>
		{
			if (err)
			{
				console.log('info schema error', {err});
				process.exit();
			}
			if (result.length === 0)
			{
				fs.readFile('sql/Catecon.sql', (err, data) =>
				{
					if (err)
					{
						console.log('readFile error', {err});
						process.exit();
					}
					dbcon.query(data.toString(), (err, result) =>
					{
						if (err)
						{
							console.log('mysql intialization for Catecon', {err});
							process.exit();
						}
						Cat.R.Initialize();
					});
				});
			}
			else
			{
				dbcon.query("USE `Catecon`;", (err, result) =>
				{
					if (err)
					{
						console.log('mysql intialization for Catecon', {err});
						process.exit();
					}
					Cat.R.Initialize(_ => updateSQLDiagramsByCatalog());
				});
			}
		});

		app.use(express.static(path.join(process.env.CAT_DIR, 'public')));

		app.use('/catalog', (req, res) =>
		{
			try
			{
				dbcon.query('SELECT * FROM Catecon.diagrams', (err, diagrams) =>
				{
					if (err) throw err;
					res.end(JSON.stringify({cloudURL:Cat.R.local ? Cat.R.cloudURL : Cat.R.URL, diagrams}));
				});
			}
			catch(err)
			{
				res.status(500).send(err).end();
			}
		});

		app.use(function(req, res, next)
		{
			res.setHeader("Content-Security-Policy", "script-src 'self' blob: 'unsafe-inline' https://api-cdn.amazon.com https://sdk.amazonaws.com https://code.jquery.com https://unpkg.com");
			return next();
		});

		Cat.R.local && app.use('/updateCatalog', (req, res) =>
		{
			try
			{
				log('/updateCatalog', req.user);
				Cat.R.FetchCatalog(_ => updateSQLDiagramsByCatalog());
				res.status(200).end();
			}
			catch(err)
			{
				res.status(500).send(err).end();
			}
		});

		app.use(express.static(process.env.HTTP_DIR));

		app.use('/search', async (req, res, next) =>
		{
			log('search', req.query.search);
			const search = dbcon.escape(`%${req.query.search}%`);
			const sql = `SELECT * FROM Catecon.diagrams WHERE name LIKE ${search} OR properName LIKE ${search} ORDER BY timestamp DESC LIMIT ${process.env.CAT_SEARCH_LIMIT}`;
			dbcon.query(sql, (err, result) =>
			{
				if (err) throw err;
				res.end(JSON.stringify(result));
			});
		});

		app.use('/recent', (req, res) =>
		{
			dbcon.query(`SELECT * FROM Catecon.diagrams ORDER BY timestamp DESC LIMIT ${process.env.CAT_SEARCH_LIMIT};`, (err, result) =>
			{
				if (err) throw err;
				res.end(JSON.stringify(result));
			});
		});
		//
		// report memory usage
		//
		app.use('/_vm', (req, res) =>
		{
			res.end(JSON.stringify(process.memoryUsage()));
		});

		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		//
		// AUTHORIZATION REQUIRED
		//

		app.use((req, res, next) =>
		{
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
			res.header('Access-Control-Allow-Credentials', 'true');
			res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
			if (req.method !== 'OPTIONS')
			{
				validate(req, res, (err, decoded) =>
				{
					if (err)
						return res.status(401).send(err);
					req.user = decoded['cognito:username'];
					if (req.body.user !== req.user)
						return res.status(401).send('user mismatch').end();
					const user = req.body.user;
					if (!userInfo.has(user))
					{
						const sql = `SELECT * FROM Catecon.users WHERE name = '${user}';`;
						dbcon.query(sql, (err, result) =>
						{
							if (err)
							{
								res.status(500).end();
								log('user info error', {err});
								return;
							}
							const userData = result[0];
							//
							// get number of diagrams user currently has
							//
							const sql = 'SELECT COUNT (*) FROM Catecon.diagrams WHERE user = ?;';
							dbcon.query(sql, [req.body.user], (err, result) =>
							{
								if (err)
								{
									log('select error', {err});
									res.status(500).end();
									return;
								}
								userData.diagramCount = result[0]['COUNT (*)'];
								userInfo.set(user, userData);
								next();
							});
						});
					}
					else
						next();
				});
			}
		});

		//
		// get user info
		//
		app.post('/userInfo', (req, res) =>
		{
			dbcon.query('SELECT * FROM Catecon.users WHERE name=?;', [req.user], (err, result) =>
			{
				if (err)
				{
					log('select user error', {err});
					res.status(500).end();
					return;
				}
				res.json(result[0]).end();
			});
		});

		//
		// upload a diagram to this server
		//
		app.use('/upload', (req, res) =>
		{
			console.log('/upload');
			//
			// check for good request
			//
			if (!('body' in req) || !('diagram' in req.body) || !('name' in req.body.diagram))
			{
				reqlog(req, 'upload: bad request', req.body);
				res.status(401).send('missing info in body').end();
				return;
			}
			reqlog(req, 'upload', req.body.diagram.name);
			const {diagram, user, png} = req.body;
			//
			// diagram user must be same as validated user or have admin privileges
			//
			if (!hasPermission(req.body.user, 'admin'))
			{
				if (req.body.user !== diagram.user)
					return res.status(401).send('diagram owner not the validated user');
				// diagram name must be first of diagram name
				if (diagram.name.split('/')[0] !== req.body.user)
					return res.status(401).send('diagram user and name mismatch').end();
			}
			const name = diagram.name;
			function finalProcessing()
			{
				saveDiagramJson(name, JSON.stringify(diagram));
				if (png)
					saveDiagramPng(name, png);
			}
			//
			// check cache
			//
			if (Cat.R.catalog.has(name))
			{
				const info = Cat.R.catalog.get(name);
				if (info.timestamp < diagram.timestamp || Cat.R.LocalTimestamp(name) < info.timestamp)
				{
					const oldrefs = Cat.U.Clone(info.references);
					Cat.R.catalog.set(name, diagram);
					updateDiagramTable(name, diagram, (err, result) =>
					{
						if (err)
						{
							console.log({err});
							res.status(500).send('cannot update diagram info').end();
							return;
						}
						finalProcessing();
						updateRefcnts(oldrefs, diagram.references);
						res.status(200).end();
					});
				}
				if (png)
					saveDiagramPng(name, png);
				res.status(200).end();
				return;
			}
			else
			{
				const user = userInfo.get(req.body.user);
				//
				// max number of diagrams for user?
				//
				if (user.diagramCount >= process.env.CAT_DIAGRAM_USER_LIMIT)
				{
					res.status(507).end('too many diagrams');
					return;
				}
				//
				// new diagram to system
				// no need to set refcnt; it must be 0
				//
				const sql = 'INSERT into Catecon.diagrams (name, basename, user, description, properName, refs, timestamp, codomain) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
				dbcon.query(sql, [name, diagram.basename, diagram.user, diagram.description, diagram.properName, JSON.stringify(diagram.references), diagram.timestamp, diagram.codomain], (err, result) =>
				{
					if (err)
					{
						console.log({err});
						res.status(500).send('cannot insert new diagram').end();
						return;
					}
					const info = Cat.Diagram.GetInfo(diagram);
					info.refcnt = 0;
					updateRefcnts([], info.references);
					//
					// user owns one more
					//
					user.diagramCount++;
					finalProcessing();
					res.status(200).end();
				});
			}
		});

		app.use('/delete', (req, res) =>
		{
			const name = req.body.diagram;
			if (name.includes('..'))
			{
				console.log('/delete bad name', name);
				res.status(400).send('bad name').end();
				return;
			}
			dbcon.query(`SELECT user,refcnt FROM Catecon.diagrams WHERE name=${dbcon.escape(name)};`, (err, result) =>
			{
				if (err)
				{
					console.log({err});
					res.status(500).send(err).end();
					return;
				}
				if (result.length === 0)
				{
					console.log('diagram not found', name);
					res.status(400).send('diagram not found').end();
					return;
				}
				if (req.user !== result[0].user)
				{
					console.log('user not owner', req.user, result[0].user);
					res.status(401).send('user not owner').end();
					return;
				}
				if (result[0].refcnt > 0)
				{
					console.log('diagram is referenced', result[0].refcnt);
					res.status(400).send('diagram is referenced').end();
					return;
				}
				dbcon.query('DELETE FROM diagrams WHERE name=?', [name], (err, result) =>
				{
					if (err)
					{
						console.log({err});
						res.status(500).send(err).end();
						return;
					}
					console.log('deleted from database', name);
					const dgrmFile = `public/diagram/${name}`;
					fs.unlink(`${dgrmFile}.json`, err => {});
					fs.unlink(`${dgrmFile}.png`, err => {});
					res.status(200).end();
				});
			});
		});

		app.use('/UpdateHTMLjs', (req, res) =>
		{
			reqlog(req, 'UpdateHTMLjs');
			saveHTMLjs();
		});

		app.use('/refcnts', (req, res) =>
		{
			try
			{
				determineRefcnts();
			}
			catch(err)
			{
				res.status(500).send(err).end();
			}
			res.send({}).end();
		});

		// catch 404 and forward to error handler
		app.use(function(req, res, next)
		{
			next(createError(404));
		});

		// error handler
		app.use(function(err, req, res, next)
		{
			console.log('error handler', {err});
			// set locals, only providing error in development
			res.locals.message = err.message;
			res.locals.error = req.app.get('env') === 'development' ? err : {};
			// render the error page
			res.status(err.status || 500);
			res.render('error');
		});

	}
	catch(err)
	{
		console.error(err);
	}
}	// end serve

try
{
	serve();
}
catch(error)
{
	log({error});
}
finally
{
}

module.exports = app;
