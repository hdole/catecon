// (C) 2018-2022 Harry Dole, All Rights Reserved
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

const cognito = require('amazon-cognito-identity-js');		// aws user support
const url = require('url');
const fs = require('fs');
const util = require( 'util' );
const mysql = require( 'mysql' );
const {VM} = require('vm2');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

const D2 = require('./' + path.join(process.env.HTTP_DIR, 'js', 'D2.js'));
const Cat = require('./' + path.join(process.env.HTTP_DIR, 'js', 'Cat.js'));

Cat.R.default.debug = false;
Cat.R.cloudURL = process.env.CAT_PARENT;

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';

const issues = new Set();
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
// HTTP status codes
//
const HTTP =
{
	OK:						200,
	BAD_REQUEST:			400,
	UNAUTHORIZED:			401,
	INTERNAL_ERROR:			500,
	INSUFFICIENT_STORAGE:	507,
};
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
	console.log('Starting mysql connection:', Date(Date.now()).toLocaleString());
	makeDbconSync(mysqlArgs);
	dbcon.connect(error =>
	{
		if (error)
		{
			log('Error on connection to mysql server', error);
			setTimeout(mysqlKeepAlive, 2000);
		}
	});
	dbcon.on('error', error =>
	{
		log('Error from mysql server:', error);
		if (error.code === 'PROTOCOL_CONNECTION_LOST')
			mysqlKeepAlive();
		else
			throw error;
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
	const dgrmFile = path.join(process.env.HTTP_DIR, 'diagram', name + '.json');
	fs.mkdirSync(path.dirname(dgrmFile), {recursive:true});
	const dgrmFD = fs.openSync(dgrmFile, 'w');
	fs.writeSync(dgrmFD, diagramString, 0, diagramString.length +1);
	fs.closeSync(dgrmFD);
}

function saveDiagramPng(name, inbuf)
{
	const buf = typeof inbuf === 'string' ? new Buffer.from(inbuf.replace(/^data:image\/octet-stream;base64,/,""), 'base64') : inbuf;
	if (buf.length > process.env.HTTP_PNG_LIMIT * 1024)
		throw `PNG file too large: ${name} ${buf.length}`;
	const pngFile = path.join(process.env.HTTP_DIR, 'diagram', name + '.png');
	fs.mkdir(path.dirname(pngFile), {recursive:true}, _ => fs.open(pngFile, 'w', (error, pngFD) =>
	{
		if (error) throw error;
		fs.write(pngFD, buf, 0, buf.length, (error, bytes, data) =>
		{
			if (error) throw error;
			fs.close(pngFD, error => { if (error) throw error; });
		});
	}));
}

function saveDiagramJavascript(name)
{
	Cat.Runtime.SelectDiagram(name, null, diagram =>
	{
		const js = Cat.R.Actions.javascript.generateDiagram(diagram);
		if (js)
		{
			const jsFile = path.join(process.env.HTTP_DIR, 'js', name + '.js');
			fs.mkdirSync(path.dirname(jsFile), {recursive:true});
			fs.writeFile(jsFile, js, error => {if (error) throw error;});
		}
	});
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
	await dbcon.query('SELECT name,refs FROM Catecon.diagrams', (error, result) =>
	{
		if (error) throw error;
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
				const cnt = 1 + refcnts.get(ref);
				refcnts.set(ref, 1 + refcnts.get(ref));
				if (Cat.R.catalog.has(ref))
					Cat.R.catalog.get(ref).refcnt = cnt;
				else
					console.error('ERROR: catalog missing reference diagram', ref);
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
	console.log('fetch JWK', url);
	fetch(url).then(response =>
	{
		if (response.ok)
		{
			console.log('JWK received');
			response.json().then(json => {JWK = json;});
		}
		else
			console.error('ERROR in fetchJWK: ', response.statusText);
	}).catch(err => console.error('ERROR in fetchJWK: ', err));
}
fetchJWK();

mysqlKeepAlive(mysqlArgs);

function validate(req, res, fn)
{
	const token = req.get('token') || (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
	if (typeof token === 'undefined')
	{
		res.status(HTTP.UNAUTHORIZED).end('Error:  no token');
		return;
	}
	Cat.R.user.token = token;
	const decjwt = jwt.decode(token, {complete:true});
	if (typeof decjwt === 'undefined' || decjwt === null)
	{
		console.log('*** no user jwt');
		res.status(HTTP.UNAUTHORIZED).end('Error: no jwt');
		return;
	}
	if (decjwt.payload.aud !== process.env.AWS_APP_ID)
	{
		console.log(decjwt.payload.aud, process.env.AWS_APP_ID);
		res.status(HTTP.UNAUTHORIZED).end({'Error':'bad app id'});
		return;
	}
	const idURL = `https://cognito-idp.${process.env.AWS_USER_COG_REGION}.amazonaws.com/${process.env.AWS_USER_IDENTITY_POOL}`;
	if (decjwt.payload.iss !== idURL)
	{
		console.log('*** bad identity pool');
		res.status(HTTP.UNAUTHORIZED).end('Error:  bad identity pool');
		return false;
	}
	if (JWK === null)
	{
		res.status(HTTP.UNAUTHORIZED).end('Error:  no JWK');
		return;
	}
	const key = JWK.keys.find(k => k.kid === decjwt.header.kid);
	if (typeof key === 'undefined')
	{
		res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:'No key'}).end();
		return;
	}
	const pem = jwkToPem(key);
	jwt.verify(token, pem, fn);
}

function updateDiagramTable(name, info, fn, cloudTimestamp, update = true)
{
	if (info.user === 'sys' || name === info.user + '/' + info.user)	// do not track system or user/user diagrams
		return;
	if (!('category' in info))	// TODO remove
		info.category = 'CAT';
	if (!('prototype' in info))	// TODO remove
		info.prototype = 'Diagram';
	if (!('codomain' in info))	// TODO remove
		info.codomain = 'Cat';
	const term = `EXISTS(SELECT name FROM Catecon.diagrams WHERE name = '${name}')`;
	const sql = 'SELECT ' + term;
	dbcon.query(sql, (error, result) =>
	{
		if (error)
		{
			console.error('ERROR', error);
			return;
		}
		const update = result[0][term];
		const updateSql = (update ? 'UPDATE ' : 'INSERT INTO ') + 'Catecon.diagrams SET name = ?, basename = ?, user = ?, description = ?, properName = ?, refs = ?, timestamp = ?, codomain = ?, refcnt = ?, cloudTimestamp = ?, category = ?, prototype = ?' +
							(update ? ' WHERE name = ?' : '');
		const args = [name, info.basename, info.user, info.description, info.properName, JSON.stringify(info.references), info.timestamp, info.codomain, 'refcnt' in info ? info.refcnt : 0, cloudTimestamp, info.category, info.prototype, name];
		dbcon.query(updateSql, args, fn);
	});
}

function updateSQLDiagramsByCatalog()
{
	console.log('Updating SQL diagrams by catalog');
	// make local server match cloud
	dbcon.query('SELECT * FROM Catecon.diagrams', (error, diagrams) =>
	{
		if (error) throw error;
		const remaining = new Set(Cat.R.catalog.keys());
		const localDiagrams = new Set(diagrams.map(info => info.name));
		diagrams.map(info =>
		{
			info.isLocal = false;
			if (Cat.R.canUploadUser(info.user))
			{
				const cloudInfo = Cat.R.catalog.get(info.name);
				if (cloudInfo && cloudInfo.timestamp > info.timestamp)		// cloud is newer
					updateDiagramTable(info.name, cloudInfo, (error, result) => error && console.log({error}), cloudInfo.cloudTimestamp);
			}
			remaining.delete(info.name);
		});
		remaining.forEach(name =>
		{
			const info = Cat.R.catalog.get(name);
			Cat.R.canUploadUser(info.user) && updateDiagramTable(name, info, (error, result) => error && console.log({error}), info.cloudTimestamp, localDiagrams.has(name));
		});
	});
}

function downloadIssues()
{
	dbcon.query('SELECT diagram FROM Catecon.issues', (error, diagrams) =>
	{
		if (error) throw error;
		diagrams.map(info => issues.add(info.diagram));
	});
}

function findDiagramJsons(dir)
{
	if (!fs.existsSync(dir))
	{
		console.error('missing directory', dir);
		return;
	}
	const files = fs.readdirSync(dir);
	const diagrams = files.filter(f => fs.lstatSync(path.join(dir, f)).isFile() && path.extname(f) === '.json').map(f => path.join(dir, f));
	const subdirs = files.filter(f => fs.lstatSync(path.join(dir, f)).isDirectory());
	subdirs.map(subdir => diagrams.push(...findDiagramJsons(`${dir}/${subdir}`)));
	return diagrams;
}

	//			const sqlExists = `SELECT EXISTS(SELECT diagram,basename FROM Catecon.issues WHERE diagram = '${diagram.name}' AND basename = '${elt.basename}');`;
	//			dbcon.query(sqlExists, [diagram.user, diagram.name, elt.basename, elt.description, diagram.timestamp], (error, result) =>
function uploadBugs(diagram)
{
	const sqlExists = `SELECT diagram,basename FROM Catecon.issues WHERE diagram = '${diagram.name}';`;
	dbcon.query(sqlExists, (error, result) =>
	{
		const issues = new Set();
		result.map(r => issues.add(r.basename));
		const elements = diagram.domainInfo.elements;
		for (const elt of elements)
		{
			if (elt.prototype === 'IndexText' && elt.description.match(/^BUG:/))
			{
				const foundit = issues.has(elt.basename);
				foundit && issues.delete(elt.basename);
				const updateSql = (foundit ? 'UPDATE ' : 'INSERT INTO ') + 'Catecon.issues SET diagram = ?, basename = ?, user = ?, description = ?, timestamp = ? ' + (foundit ? ' WHERE diagram = ? AND basename = ?' : '');
				const args = [diagram.name, elt.basename, diagram.user, elt.description, diagram.timestamp, diagram.name, elt.basename];
				dbcon.query(updateSql, args, (error, result) =>
				{
					if (error)
					{
						console.log({error});
						res.status(HTTP.INTERNAL_ERROR).send({error, message:'cannot save issue'}).end();
						return;
					}
				});
			}
		}
		issues.forEach(issue =>
		{
			dbcon.query('DELETE FROM Catecon.issues WHERE diagram=? AND basename=?', [diagram.name, issue], (error, result) =>
			{
			});
		});
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
		dbcon.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'Catecon';", (error, result) =>
		{
			if (error)
			{
				console.log('info schema error', {error});
				process.exit();
			}
			if (result.length === 0)
			{
				console.error('ERROR:  Catecon database does not exist in the mysql database.\nPlease use install.sh.');
				process.exit();
			}
			dbcon.query('SELECT * FROM Catecon.diagrams', (error, result) =>
			{
				if (error)
				{
					console.error('mysql initialization for Catecon', {error});
					process.exit();
				}
				console.log('initialize Cat runtime');
				// main runtime initialization
				Cat.R.initialize(_ =>
				{
					// initialize server
					console.log('Catecon runtime initialized');
					console.log('update SQL diagrams by catalog');
					updateSQLDiagramsByCatalog();
					downloadIssues();
					result.map(r =>
					{
						if (!Cat.R.catalog.has(r.name))
						{
							r.references = JSON.parse(r.refs);
							Cat.R.catalog.set(r.name, r);
						}
					});
					// load diagrams from local storage
					const dir = path.join(process.env.CAT_DIR, process.env.HTTP_DIR, 'diagram');
					const fsDiagrams = findDiagramJsons(dir);
					fsDiagrams.map(f =>
					{
						const data = fs.readFileSync(f);
						console.log('load local diagram:', f);
						if (!data)
						{
							console.error('ERROR: cannot read diageram file', f, error);
							return;
						}
						const diagInfo = JSON.parse(data);
						const info = Cat.Diagram.GetInfo(diagInfo);
						const inCloud = Cat.R.catalog.has(info.name);
						let cloudTimestamp = inCloud ? Cat.R.catalog.get(info.name).cloudTimestamp : 0;
						cloudTimestamp = cloudTimestamp ? cloudTimestamp: 0;
						!inCloud && Cat.R.catalog.set(info.name, info);
						Cat.R.catalog.get(info.name).isLocal = true;
						updateDiagramTable(info.name, info, _ => {}, cloudTimestamp, inCloud);
					});
					console.log('load javascript.js');
					require('./' + path.join(process.env.HTTP_DIR, 'js', 'javascript.js'));
					determineRefcnts();
					console.log('server started', new Date().toLocaleString());
				});
			});
		});

		app.use(express.static(path.join(process.env.CAT_DIR, process.env.HTTP_DIR)));

		app.use('/catalog', (req, res) =>
		{
			try
			{
				dbcon.query('SELECT * FROM Catecon.diagrams', (error, diagrams) =>
				{
					if (error) throw error;
					res.end(JSON.stringify({cloudURL:Cat.R.local ? Cat.R.cloudURL : Cat.R.URL, diagrams}));
				});
			}
			catch(error)
			{
				console.error('****** cannot fetch catalog');
				res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
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
				Cat.R.fetchCatalog(_ => updateSQLDiagramsByCatalog());
				res.status(HTTP.OK).end();
			}
			catch(error)
			{
				res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
			}
		});

		app.use(express.static(process.env.HTTP_DIR));

		app.use('/search', async (req, res, next) =>
		{
			log('search', req.query.search);
			const search = dbcon.escape(`%${req.query.search}%`);
			const sql = `SELECT * FROM Catecon.diagrams WHERE name LIKE ${search} OR properName LIKE ${search} ORDER BY timestamp DESC LIMIT ${process.env.CAT_SEARCH_LIMIT}`;
			dbcon.query(sql, (error, result) =>
			{
				if (error) throw error;
				res.end(JSON.stringify(result));
			});
		});

		app.use('/recent', (req, res) =>
		{
			dbcon.query(`SELECT * FROM Catecon.diagrams ORDER BY timestamp DESC LIMIT ${process.env.CAT_SEARCH_LIMIT};`, (error, result) =>
			{
				if (error) throw error;
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
				validate(req, res, (error, decoded) =>
				{
					if (error)
					{
						console.log('*** cannot validate', req.user);
						return res.status(HTTP.UNAUTHORIZED).json({ok:false, statusText:error});
					}
					req.user = decoded['cognito:username'];
					if (req.body.user !== req.user)
					{
						console.log('*** user mismatch', req.user, req.body.user);
						return res.status(HTTP.UNAUTHORIZED).json({ok:false, statusText:'user mismatch'});
					}
					const user = req.body.user;
					if (!userInfo.has(user))
					{
						const sql = `SELECT * FROM Catecon.users WHERE name = '${user}';`;
						dbcon.query(sql, (error, result) =>
						{
							if (error)
							{
								res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
								log('user info error', {error});
								return;
							}
							const userData = result[0];
							if (!userData)
							{
								console.error('ERROR: no user', user);
								next();
								return;
							}
							//
							// get number of diagrams user currently has
							//
							const sql = 'SELECT COUNT (*) FROM Catecon.diagrams WHERE user = ?;';
							dbcon.query(sql, [req.body.user], (error, result) =>
							{
								if (error)
								{
									log('select error', {error});
									res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
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
			dbcon.query('SELECT * FROM Catecon.users WHERE name=?;', [req.user], (error, result) =>
			{
				if (error)
				{
					log('select user error', {error});
					res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
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
			try
			{
				console.log('/upload', req.body.diagram.name);
				//
				// check for good request
				//
				if (!('body' in req) || !('diagram' in req.body) || !('name' in req.body.diagram))
				{
					reqlog(req, 'upload: bad request', req.body);
					res.status(HTTP.UNAUTHORIZED).json({ok:false, statusText:'missing info in body'}).end();
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
					{
						console.log('*** unauthorized req.body.user', req.body.user, 'diagram.user', diagram.user);
						return res.status(HTTP.UNAUTHORIZED).json({ok:false, statusText:'diagram owner not the validated user'});
					}
					// diagram name must be first of diagram name
					if (diagram.name.split('/')[0] !== req.body.user)
					{
						console.log('*** name mismatch req.body.user', req.body.user, 'diagram.user', diagram.user);
						return res.status(HTTP.UNAUTHORIZED).send({message:'diagram user and name mismatch'}).end();
					}
				}
				const name = diagram.name;
				if (!('properName' in diagram))
					diagram.properName = diagram.name;
				function finalProcessing()
				{
					saveDiagramJson(name, JSON.stringify(diagram, null, 2));
					if (png)
						saveDiagramPng(name, png);
					uploadBugs(diagram);
				}
				const info = Cat.R.catalog.get(name);
				const oldrefs = info ? Cat.U.clone(info.references) : [];
				Cat.R.catalog.set(name, Cat.Diagram.GetInfo(diagram));
				updateDiagramTable(name, diagram, (error, result) =>
				{
					if (error)
					{
						console.log({error});
						res.status(HTTP.INTERNAL_ERROR).send({message:'cannot update diagram info'}).end();
						return;
					}
					try
					{
						finalProcessing();
						updateRefcnts(oldrefs, diagram.references);
						res.status(HTTP.OK).end();
					}
					catch(x)
					{
						res.status(HTTP.INSUFFICIENT_STORAGE).end();
					}
				}, info ? info.cloudTimestamp : 0);
				if (png)
					saveDiagramPng(name, png);
				res.status(HTTP.OK).end();
			}
			catch(x)
			{
				console.log('something happened', x);
				res.status(HTTP.INSUFFICIENT_STORAGE).end();
			}
		});

		app.use('/delete', (req, res) =>
		{
			const name = req.body.diagram;
			if (name.includes('..'))
			{
				console.log('/delete bad name', name);
				res.status(HTTP.BAD_REQUEST).send({message:'bad name'}).end();
				return;
			}
			Cat.R.catalog.delete(name);
			dbcon.query(`SELECT user,refcnt FROM Catecon.diagrams WHERE name=${dbcon.escape(name)};`, (error, result) =>
			{
				if (error)
				{
					console.log({error});
					res.status(HTTP.INTERNAL_ERROR).send({error, message:'Cannot select user'}).end();
					return;
				}
				if (result.length > 0)		// found it
				{
					if (req.user !== result[0].user)
					{
						console.log('*** user not owner', req.user, result[0].user);
						res.status(HTTP.UNAUTHORIZED).send({message:'user not owner'}).end();
						return;
					}
					if (result[0].refcnt > 0)
					{
						console.log('diagram is referenced', result[0].refcnt);
						res.status(HTTP.BAD_REQUEST).send({message:'diagram is referenced'}).end();
						return;
					}
					dbcon.query('DELETE FROM Catecon.diagrams WHERE name=?', [name], (error, result) =>
					{
						if (error)
						{
							console.log({error});
							res.status(HTTP.INTERNAL_ERROR).send({error, message:'Cannot delete diagram from DB'}).end();
							return;
						}
						console.log('deleted from database', name);
						const dgrmFile = path.join(process.env.HTTP_DIR, 'diagram', name);
						fs.unlink(`${dgrmFile}.json`, error => {});
						fs.unlink(`${dgrmFile}.png`, error => {});
						res.status(HTTP.OK).end();
					});
				}
				else
					res.status(HTTP.OK).end();
			});
		});

		app.use('/refcnts', (req, res) =>
		{
			try
			{
				determineRefcnts();
			}
			catch(error)
			{
				res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
			}
			res.status(HTTP.OK).end();
		});

		app.use('/rewrite', (req, res) =>
		{
			let diagrams = [];
			if (hasPermission(req.body.user, 'admin'))
			{
				try
				{
					diagrams = [...Cat.R.catalog.values()].filter(info => info.user !== 'sys' && Cat.R.canLoad(info.name) && !Cat.R.$CAT.elements.has(info.name) && info.isLocal);
					const loaded = new Set();
					const loadit = info =>
					{
						const refs = Cat.R.getReferences(info.name);
						refs.delete(info.name);
						[...refs].reverse().map(ref => !loaded.has(info.name) && loadit(Cat.R.catalog.get(ref)));
						if (!loaded.has(info.name))
						{
							loaded.add(info.name);
							const diagram = Cat.R.$CAT.getElement(info.name);
							if (!diagram)
							{
								Cat.R.loadDiagram(info.name, diagram =>
								{
									if (diagram)
									{
										console.log('read diagram', diagram.name);
										loaded.add(info.name);
										Cat.R.saveDiagram(diagram);
									}
									else
										console.log('error: cannot read diagram', info.name);
								});
							}
						}
					};
					diagrams.map(info => loadit(info));
				}
				catch(error)
				{
					res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
					return;
				}
			}
			res.status(HTTP.OK).json(diagrams.map(d => d.name)).end();
		});

		app.use('/saveJavascript', (req, res) =>
		{
			if (hasPermission(req.body.user, 'admin'))
			{
				const name = req.body.diagram;
				try
				{
					saveDiagramJavascript(name);
					res.status(HTTP.OK).end();
				}
				catch(error)
				{
					res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:error}).end();
					return;
				}
			}
			else
			{
				console.error(`ERROR: user does not have permission: ${req.body.user} ${name}`);
				res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:`user does not have permission for diagram: ${req.body.user}`}).end();
			}
		});
		//
		// generate bug report
		//
		app.use('/bugs', (req, res) =>
		{
			if (!Cat.R.CAT)
			{
				res.status(HTTP.INTERNAL_ERROR).json({ok:false, statusText:'not ready for request'});
				return;
			}
			// diagram = ?, basename = ?, user = ?, description = ?, timestamp = ?
			dbcon.query('SELECT * FROM Catecon.issues ORDER BY timestamp;', (error, result) =>
			{
				if (error) throw error;
				const height = 24;
				const deltaY = new D2({x:0, y:1.2 * height});
				const deltaX = new D2({x:200, y:0});
				let bugd = Cat.R.$CAT.getElement('dyn/bugs');
				bugd && bugd.decrRefcnt();
				bugd = new Cat.Diagram(Cat.R.$CAT, {basename:'bugs', user:'dyn', category:Cat.R.CAT, codomain:'zf/Set', properName:'Bugs'});
				let xy = new D2();
				new Cat.IndexText(bugd, {xy, description:'Bugs', height:400, weight:'bold'});
				xy = xy.add({x:0, y:200});
				new Cat.IndexText(bugd, {xy, description:Cat.U.localtime(bugd.timestamp), height:20, weight:'bold'});
				xy = xy.add(deltaY);
				let timestamp = 0;
				result.forEach(row =>
				{
					xy = xy.add(deltaY);
					let roxy = new D2(xy);
					let ts = Cat.U.localtime(row.timestamp);
					timestamp = Math.max(timestamp, row.timestamp);
					new Cat.IndexText(bugd, {xy:roxy, description:ts, height, weight:'normal'});
					roxy = roxy.add(deltaX.scale(1.2));
					new Cat.IndexText(bugd, {xy:roxy, description:row.user, height, weight:'normal'});
					roxy = roxy.add(deltaX);
					new Cat.IndexText(bugd, {xy:roxy, description:`<diagram name="${row.diagram}" select="${row.basename}" action="zoom">${row.diagram}</diagram>`, height, weight:'normal'});
					xy = xy.add(deltaY);
					new Cat.IndexText(bugd, {xy, description:row.description, height, weight:'normal'});
					xy = xy.add(deltaY);
				});
				bugd.timestamp = timestamp;		// time of last bug
				const out = JSON.stringify(bugd.json(), null, 2);
				saveDiagramJson('dyn/bugs', out);
				updateDiagramTable(bugd.name, Cat.Diagram.GetInfo(bugd), (error, result) => error && console.error({error}), bugd.timestamp);
				res.end(out);
			});
		});

		// catch 404 and forward to error handler
		app.use(function(req, res, next)
		{
			next(createError(404));
		});

		// error handler
		app.use(function(error, req, res, next)
		{
			console.log('error handler', {error});
			// set locals, only providing error in development
			res.locals.message = error.message;
			res.locals.error = req.app.get('env') === 'development' ? error : {};
			// render the error page
			res.status(error.status || HTTP.INTERNAL_ERROR);
			res.render('error');
		});

	}
	catch(error)
	{
		console.error(error);
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
