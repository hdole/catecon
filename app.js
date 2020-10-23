// (C) 2018-2020 Harry Dole, All Rights Reserved
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

const Cat = require('./public/js/Cat.js');
const jsAction = require('./public/js/javascript.js');

Cat.R.default.debug = false;

const cloudDiagramURL = process.env.CAT_DIAGRAM_URL;
const catalogFile = 'catalog.json';
//
// rotate access log files
//
const accessLogStream = rfs.createStream('access.log', {interval:'1d', path:process.env.CAT_SRVR_LOG, size:process.env.CAT_SRVR_LOG_SIZE});
app.use(morgan('dev'));
app.use(morgan('combined', {stream:accessLogStream}));
//
// user info cache
//
const userInfo = new Map();
//
// diagram info cache
//
const diagramInfo = new Map();
//
// mysql connection arguments
//
const mysqlArgs =
{
	host:		process.env.MYSQL_HOST,
	port:		process.env.MYSQL_PORT,
	user:		process.env.MYSQL_USER,
	password:	process.env.MYSQL_PASSWORD,
	multipleStatements:	true,
};

let dbcon = null;	// mysql server connection
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
		log('Error from mysql server', err);
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

function fetchCatalog(followup)
{
	fetch(`${cloudDiagramURL}/${catalogFile}`).then(response => response.text().then(catalogString => followup(JSON.parse(catalogString))));
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

async function updateDiagramInfo(diagram)
{
	const name = diagram.name;
	const hasItSql = `SELECT timestamp FROM diagrams WHERE name = '${name}'`;
	const timestamp = diagram.timestamp ? diagram.timestamp : Date.now();
	const assign = 'name = ?, basename = ?, user = ?, description = ?, properName = ?, refs = ?, timestamp = ?';
	const hasIt = await dbconSync.query(hasItSql);
	let sql = null;
	if (hasIt.length > 0)
	{
		const localTimestamp = hasIt[0].timestamp;
		if (timestamp > localTimestamp)
			sql = `UPDATE diagrams SET ${assign} WHERE name = ${dbcon.escape(name)}`;
		else if (timestamp === localTimestamp)
			console.log(`\tno update ${name} @ ${new Date(timestamp)}`);
		else
			console.log(`\tlocal version newer ${name} @ ${new Date(localTimestamp)} vs cloud @ ${new Date(timestamp)}`);
	}
	else
		sql = 'INSERT into diagrams (name, basename, user, description, properName, refs, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)';
	if (sql)
	{
		console.log(`\tupdate ${name} @ ${new Date(timestamp)}`);
		const result = await dbconSync.query(sql, [name, diagram.basename, diagram.user, diagram.description, diagram.properName, JSON.stringify(diagram.references), timestamp]);
	}
	return sql !== null;
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

async function updateCatalog(fn = null)
{
	log('UpdateCatalog');
	fetchCatalog(async cloudCatalog =>
	{
		const cloudDiagrams = cloudCatalog.diagrams;
		for (let i=0; i<cloudDiagrams.length; ++i)
		{
			const d = cloudDiagrams[i];
			try
			{
				const name = d.name;
				if (await updateDiagramInfo(d) || !fs.existsSync(`public/diagram/${name}.json`))
				{
					log(`download ${name}`);
					// diagram.json
					fetch(`${cloudDiagramURL}/${name}.json`).then(response => response.text().then(diagramString => saveDiagramJson(name, diagramString))).catch(error => console.log({cloudDiagramURL, error}));
					// diagram.png
					fetch(`${cloudDiagramURL}/${name}.png`).then(response => response.buffer()).then(pngBfr => saveDiagramPng(name, pngBfr)).catch(error => console.log({cloudDiagramURL, error}));
				}
			}
			catch(err)
			{
				log(err);
			}
		}
		const sql = `SELECT * FROM diagrams`;
		const rows = await dbconSync.query(sql);
		rows.map(row =>
		{
			row.references = JSON.parse(row.refs);
			delete row.refs;
		});
		const payload = JSON.stringify({timestamp:Date.now(), diagrams:rows});
		fs.writeFileSync(path.join(process.env.CAT_DIR, process.env.HTTP_DIR, 'diagram', catalogFile), payload, err => {if (err) throw err;});
		fn && fn();
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

async function determineRefcnts()
{
	await dbcon.query('SELECT name,refs FROM Catecon.diagrams', (err, result) =>
	{
		if (err) throw err;
		const refcnts = new Map();
		result.forEach(row =>
		{
			const name = row.name;
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
	const decjwt = jwt.decode(token, {complete:true});
	if (typeof decjwt === 'undefined')
	{
		res.status(401).end('Error:  no jwt');
		return;
	}
	if (decjwt.payload.aud !== process.env.AWS_APP_ID)
	{
		res.status(401).end('Error:  bad app id');
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
						updateCatalog(_ => Cat.R.Initialize());
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
					updateCatalog(_ => Cat.R.Initialize());
				});
			}
		});

		app.use(express.static(path.join(process.env.CAT_DIR, 'public')));

		app.use(function(req, res, next)
		{
			res.setHeader("Content-Security-Policy", "script-src 'self' blob: 'unsafe-inline' https://api-cdn.amazon.com https://sdk.amazonaws.com https://code.jquery.com https://unpkg.com");
			return next();
		});

		app.use(express.static(process.env.HTTP_DIR));
		app.use('/UpdateCatalog', (req, res, next) =>
		{
			updateCatalog();
		});

		app.use('/search', async (req, res, next) =>
		{
			log('search', req.query.search);
			const search = dbcon.escape(`%${req.query.search}%`);
			const sql = `SELECT * FROM diagrams WHERE name LIKE ${search} OR properName LIKE ${search} ORDER BY timestamp DESC LIMIT ${process.env.CAT_SEARCH_LIMIT}`;
			dbcon.query(sql, (err, result) =>
			{
				if (err) throw err;
				res.end(JSON.stringify(result));
			});
		});

		app.use('/json', (req, res) =>
		{
			const name = req.query.diagram;
			Cat.R.SelectDiagram(name, diagram =>
			{
				let response = 'not found';
				if (diagram)
				{
					let element = null;
					if ('element' in req.query)
					{
						element = diagram.getElement(req.query.element);
						if (!element)
						{
							res.status(404).send(`element not found ${req.query.element}`);
							return;
						}
						res.send(JSON.stringify(element.json()));
					}
					else
						res.send(JSON.stringify(diagram.json()));
				}
				else
				{
					res.status(404).send(`diagram not found: ${req.query.diagram}`);
					return;
				}
			});
		});

		app.use('/js', (req, res) =>
		{
			reqlog(req, '/js', {query:req.query});
			const name = req.query.diagram;
			Cat.R.SelectDiagram(name, diagram =>
			{
				if (diagram)
				{
					let element = null;
					if ('element' in req.query)
					{
						element = diagram.getElement(req.query.element);
						if (!element)
						{
							res.status(404).send(`element not found ${req.query.element}`);
							return;
						}
						res.send(Cat.R.Actions.javascript.generate(element));
					}
					else
						res.send(Cat.R.Actions.javascript.generateDiagram(diagram));
				}
				else
				{
					res.status(404).send(`diagram not found: ${req.query.diagram}`);
					return;
				}
			});
		});

		app.use('/recent', (req, res) =>
		{
			dbcon.query(`SELECT * FROM diagrams ORDER BY timestamp DESC LIMIT ${process.env.CAT_SEARCH_LIMIT};`, (err, result) =>
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
					next();
				});
			}
		});

		app.use('/upload', async (req, res) =>
		{
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
			// diagram user must be save as validated user
			//
			if (req.body.user !== diagram.user)
				return res.status(401).send('diagram owner not the validated user');
			// diagram name must be first of diagram name
			if (diagram.name.split('/')[0] !== req.body.user)
				return res.status(401).send('diagram user and name mismatch').end();
			const name = diagram.name;
			function finalProcessing()
			{
				saveDiagramJson(name, JSON.stringify(diagram));
				if (png)
					saveDiagramPng(name, png);
			}
			const updateSql = `UPDATE diagrams SET name = ?, basename = ?, user = ?, description = ?, properName = ?, refs = ?, timestamp = ? WHERE name = ${dbcon.escape(name)}`;
			//
			// check cache
			//
			if (diagramInfo.has(name))
			{
				const info = diagramInfo.get(name);
				if (info.timestamp < diagram.timestamp || Cat.R.LocalTimestamp(name) < info.timestamp)
				{
					diagramInfo.set(name, info);
					dbcon.query(updateSql, [name, diagram.basename, diagram.user, diagram.description, diagram.properName, JSON.stringify(diagram.references), diagram.timestamp], (err, result) =>
					{
						if (err)
						{
							res.status(500).send('cannot update diagram info').end();
							return;
						}
						finalProcessing();
						res.status(200).end();
					});
				}
				if (png)
					saveDiagramPng(name, png);
				res.status(200).end();
				return;
			}
			//
			// check for new diagram; if so validate user diagram count
			//
			const sql = `SELECT * FROM Catecon.diagrams WHERE name = '${name}';`;
			dbcon.query(sql, (err, result) =>
			{
				if (err)
				{
					res.status(500).end();
					return;
				}
				if (result.length > 0)
				{
					const timestamp = result[0].timestamp;
					if (timestamp < diagram.timestamp)
					{
						const info = getDiagramInfo(diagram);
						diagramInfo.set(name, info);
						dbcon.query(updateSql, [name, diagram.basename, diagram.user, diagram.description, diagram.properName, JSON.stringify(diagram.references), diagram.timestamp], (err, result) =>
						{
							if (err)
							{
								res.status(500).send('cannot update diagram info').end();
								return;
							}
							finalProcessing();
							res.status(200).end();
						});
					}
					else
						res.status(200).end();
					if (png)
						saveDiagramPng(name, png);
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
					//
					const sql = 'INSERT into diagrams (name, basename, user, description, properName, refs, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)';
					dbcon.query(sql, [name, diagram.basename, diagram.user, diagram.description, diagram.properName, JSON.stringify(diagram.references), diagram.timestamp], (err, result) =>
					{
						if (err)
						{
							res.status(500).send('cannot insert new diagram').end();
							return;
						}
						diagramInfo.set(name, info);
						user.diagramCount++;
						finalProcessing();
						res.status(200).end();
					});
				}
			});
		});

		app.use('/delete', async (req, res) =>
		{
console.log('/delete', req.body);
			const name = req.body.diagram;
			dbcon.query(`SELECT user,refcnt FROM diagrams WHERE name=${dbcon.escape(name)};`, (err, result) =>
			{
				if (err)
				{
					console.log({err});
					res.status(500).send(err).end();
					return;
				}
				if (result.length === 0)
				{
					console.log('diagram not found');
					res.status(400).send('diagram not found').end();
					return;
				}
				if (req.user !== result[0].user)
				{
					console.log('user not owner');
					res.status(401).send('user not owner').end();
					return;
				}
				if (result[0].refcnt > 0)
				{
					console.log('diagram is referenced');
					res.status(400).send('diagram is referenced').end();
					return;
				}
				diagramInfo.delete(name);
				dbcon.query('DELETE FROM diagrams WHERE name=?', [name], (err, result) =>
				{
					if (err)
					{
						console.log({err});
						res.status(500).send(err).end();
						return;
					}
					res.status(200).end();
				});
			});
		});

		/*
		app.use('/mysql', (req, res) =>
		{
			const query = req.query;
			reqlog(req, '/mysql', {query});
			const diagramName = query.diagram;
			const command = query.command;
			const table = query.table;
			const columns = JSON.parse(query.columns);
			let sql = '';
			const typeMap = new Map([['Z', 'bigint(20) NOT NULL'],
									['str', 'mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL']]);
			function columnDef(m)
			{
				return `\n\t\`${m.basename}\` ${typeMap.get(m.codomain.basename)}`;
			}
			function indexDef(m, colData)
			{
				return colData.includes('index') ? `\nINDEX(${m.basename}${m.codomain.name === 'hdole/Strings/str' ? '(64)' : ''})` : '';
			}
			Cat.R.SelectDiagram(diagramName, diagram =>
			{
				const morphisms = columns.map(col => diagram.getElement(col[0]).to);
				const database = Cat.U.Token(diagramName);
				switch(command)
				{
					case 'create':
						let dbres = dbconSync.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8 COLLATE utf8_bin`);
						sql = `CREATE TABLE ${database}.${table} (`;
						sql += morphisms.map((m, i) => columnDef(m)).join();
						const indexMorphisms = morphisms.filter((m, i) => columns[i][1].includes('index'));
						if (indexMorphisms.length > 0)
							sql += ',' + indexMorphisms.map((m, i) => indexDef(m, columns[i][1])).filter(s => s !== '').join();
						sql += ') ENGINE=InnoDB DEFAULT CHARSET=utf8;';
						break;
					case 'alter':
						sql = morphisms.map((m, i) =>
						{
							const colInfo = columns[i][1];
							if (colInfo.includes('add'))
								sql += `ALTER TABLE ${table} ADD ${m.basename} ${columnDef(m)} ${indexDef(m, i)};\n`;
							else if (colInfo.includes('modify'))
								sql += `ALTER TABLE ${table} MODIFY ${m_basename} ${columnDef(m)} ${indexDef(m, i)};\n`;
							else if (colInfo.includes('drop'))
								sql += `ALTER TABLE ${table} DROP COLUMN ${m_basename};\n`;
						}).join();
						break;
				}
				dbcon.query(sql, (err, result) =>
				{
					if (err)
					{
						res.status(500).end();
						log('mysql error:', err);
					}
					else
						res.status(200).end();
				});
			});
		});
		*/

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
