// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
require('dotenv').config();

const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

const helmet = require('helmet');
app.use(helmet());

const CognitoExpress = require('cognito-express');
const url = require('url');
const path = require('path');
const fs = require('fs');
const repl = require('repl');
const encoding = require('encoding');
const util = require( 'util' );
const mysql = require( 'mysql' );
const {VM} = require('vm2');
const Cat = require('./Cat.js');

Cat.R.default.debug = false;

const cloudDiagramURL = process.env.CAT_CLOUD_DIAGRAM_URL;
const catalogFile = 'catalog.json';

const mysqlArgs =
{
	host:		process.env.MYSQL_HOST,
	user:		process.env.MYSQL_USER,
	password:	process.env.MYSQL_PASSWORD,
	database:	process.env.MYSQL_DB,
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
	dbconSync =
	{
		query(sql, args) { return util.promisify(dbcon.query).call(dbcon, sql, args); },
		close() { return util.promisify(dbcon.end ).call(dbcon); },
	};
	log('mysql server connection established');
}

function mysqlKeepAlive()
{
	makeDbconSync(mysqlArgs);
	dbcon.connect(err =>
	{
		if (err)
		{
			log('Error on connection to mysql server');
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
console.log('got hdole/HTML', diagram);
		const js = Cat.R.Actions.javascript.generateDiagram(diagram);
		fs.writeFile('js/HTML.js', js, err => {if (err) throw err;});
		res.end('ok');
	});
}

function fetchCatalog(followup)
{
	fetch(`${cloudDiagramURL}/${catalogFile}`).then(response => response.text().then(catalogString => followup(JSON.parse(catalogString))));
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
	const dgrmFile = `diagrams/${name}.json`;
	fs.mkdirSync(path.dirname(dgrmFile), {recursive:true});
	const dgrmFD = fs.openSync(dgrmFile, 'w');
	fs.writeSync(dgrmFD, diagramString, 0, diagramString.length +1);
	fs.closeSync(dgrmFD);
}

function saveDiagramPng(name, pngBfr)
{
	const pngFile = `diagrams/${name}.png`;
	fs.mkdirSync(path.dirname(pngFile), {recursive:true});
	const pngFD = fs.openSync(pngFile, 'w');
	fs.writeSync(pngFD, pngBfr, 0, pngBfr.length);
	fs.closeSync(pngFD);
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
				if (await updateDiagramInfo(d))
				{
					const name = d.name;
					log(`download ${name}`);
					// diagram.json
					fetch(`${cloudDiagramURL}/${name}.json`).then(response => response.text().then(diagramString => saveDiagramJson(name, diagramString)));
					// diagram.png
					fetch(`${cloudDiagramURL}/${name}.png`).then(response => response.buffer()).then(pngBfr => saveDiagramPng(name, pngBfr));
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
		fs.writeFileSync('diagrams/' + catalogFile, payload, err => {if (err) throw err;});
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

async function serve()
{
	try
	{
		mysqlKeepAlive(mysqlArgs);

		app.use(function(req, res, next)
		{
			res.setHeader("Content-Security-Policy", "script-src 'self' blob: 'unsafe-inline' https://api-cdn.amazon.com https://sdk.amazonaws.com https://code.jquery.com https://unpkg.com");
			return next();
		});

		app.use(express.static(process.env.HTTP_DIR));
		app.use(express.urlencoded({extended:true}));
		app.use(express.json());
		app.use('/UpdateCatalog', (req, res, next) =>
		{
			updateCatalog();
		});

		app.use('/DiagramSearch', async (req, res, next) =>
		{
			log('DiagramSearch', req.query.search);
			const search = dbcon.escape(`%${req.query.search}%`);
			const sql = `SELECT * FROM diagrams WHERE name LIKE ${search} OR properName LIKE ${search}`;
			dbcon.query(sql, (err, result) =>
			{
				if (err) throw err;
				res.end(JSON.stringify(result));
			});
		});

		app.use('/json', (req, res) =>
		{
			console.log(req.connection.remoteAddress, currentTime(), '/json', {query:req.query});
			const name = req.query.diagram;
			Cat.R.SelectDiagram(name, diagram =>
			{
				let response = 'not found';
				if (diagram)
				{
					/*
					if ('morphism' in req.query)
					{
						const morphism = diagram.getElement(req.query.morphism);
						if (morphism && morphism instanceof Cat.Morphism)
						{
							if ('args' in req.query)
								response = JSON.stringify(evaluateMorphism(diagram, morphism, req.query.args));
							else
								response = JSON.stringify(morphism.json());
						}
						else
							response = `{"Error":"Morphism not found: ${req.query.morphism}"}`;
					}
					else if ('object' in req.query)
					{
						const object = diagram.getElement(req.query.object);
						if (object && object instanceof Cat.CatObject)
							response = JSON.stringify(object.json());
						else
							response = `{"Error":"Object not found: ${req.query.object}"}`;
					}
					else
						response = JSON.stringify(diagram.json());
						*/
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
				console.log(process.memoryUsage());
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
				console.log(process.memoryUsage());
			});
		});

//await dbconSync.query('TRUNCATE diagrams');
		updateCatalog(_ =>
		{
			Cat.R.Initialize();
			log('ready to serve');
			const server = app.listen(process.env.HTTP_PORT, _ => log(`listening on port ${process.env.HTTP_PORT}`));
console.log(process.memoryUsage());
		});

//		const authRoute = express.Router();
//		app.use('/DiagramIngest', authRoute);

		const cogExpress = new CognitoExpress(
		{
			region:				process.env.CAT_USER_COG_REGION,
			cognitoUserPoolId:	process.env.CAT_USER_IDENTITY_POOL,
			tokenUse:			'access',
			tokenExpiration:	36 * 100 * 1000,
		});

		app.use((req, res, next) =>
		{
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
			res.header('Access-Control-Allow-Credentials', 'true');
			res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
			if (req.method !== 'OPTIONS')
			{
				const accessToken = req.headers['authorization'];
				if (!accessToken)
					return res.status(401).send('Error:  access token missing from header');
				cogExpress.validate(accessToken, (err, response) =>
				{
					if (err)
						return res.status(401).send(err);
					else
						next();
				});
			}
		});

		app.use('/DiagramIngest', async (req, res, next) =>
		{
			if (!('body' in req) || !('diagram' in req.body) || !('name' in req.body.diagram))
			{
				reqlog(req, 'DiagramIngest: bad request', req.body);
				res.status(401).send('missing info in body');
				return;
			}
			reqlog(req, 'DiagramIngest', req.body.diagram.name);
			const {diagram, user, png} = req.body;
			const name = diagram.name;
			if (await updateDiagramInfo(diagram))
			{
				saveDiagramJson(name, JSON.stringify(diagram));
				saveDiagramPng(name, png);
			}
			res.end('ok');
			console.log(process.memoryUsage());
		});

		app.use('/mysql', (req, res) =>
		{
			const query = req.query;
			reqlog(req, '/mysql', {query});
			const diagramName = query.diagram;
			const command = query.command;
			Cat.R.SelectDiagram(diagramName, diagram =>
			{
				const database = Cat.U.Token(diagramName);
				switch(command)
				{
					case 'tableSetup':
					let dbres = dbconSync.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8 COLLATE utf8_bin`);
					if ('table' in query)
					{
						const table = query.table;
						let sql = `CREATE TABLE ${database}.${table}`;
						sql += '(id int(11) NOT NULL, ';
						const morphisms = JSON.parse(query.morphisms).map(m => [diagram.getElement(m[0]).to, m[1]]);
						const typeMap = new Map([['Z', 'bigint(20) NOT NULL'],
												['str', 'mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL']]);
						sql += morphisms.map((m, i) => ` \`${m[0].basename}\` ${typeMap.get(m[0].codomain.basename)}`).join();
						sql += ') ENGINE=InnoDB DEFAULT CHARSET=utf8;';
						dbcon.query(sql, result => res.end('ok')).catch(err => res.end(err)); 
					}
				}
			});
		});

		app.use('/UpdateHTMLjs', (req, res) =>
		{
			reqlog(req, 'UpdateHTMLjs');
			saveHTMLjs();
		});
	}
	catch(err)
	{
		console.error(err);
	}
}

try
{
	serve();
}
catch(error)
{
	log({error});
}
