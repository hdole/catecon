// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
require('dotenv').config();

const express = require('express');
const server = express();

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

function makeDbconSync(mysqlArgs)	// allows synchronous calls
{
	dbcon = mysql.createConnection(mysqlArgs);
	dbconSync =
	{
		query(sql, args) { return util.promisify(dbcon.query).call(dbcon, sql, args); },
		close() { return util.promisify(dbcon.end ).call(dbcon); },
	};
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
			console.log(`no update ${name} @ ${new Date(timestamp)}`);
		else
			console.log(`update ${name} local version newer @ ${new Date(localTimestamp)} vs cloud ${new Date(timestamp)}`);
	}
	else
		sql = 'INSERT into diagrams (name, basename, user, description, properName, refs, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)';
	if (sql)
	{
		console.log(`update ${name} @ ${new Date(timestamp)}`);
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
					console.log(`download ${name}`);
					// diagram.json
					fetch(`${cloudDiagramURL}/${name}.json`).then(response => response.text().then(diagramString => saveDiagramJson(name, diagramString)));
					// diagram.png
					fetch(`${cloudDiagramURL}/${name}.png`).then(response => response.buffer()).then(pngBfr => saveDiagramPng(name, pngBfr));
				}
			}
			catch(err)
			{
				console.log(err);
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
		makeDbconSync(mysqlArgs);

		server.use(express.static(process.env.HTTP_DIR));
		server.use(express.urlencoded({extended:true}));
		server.use(express.json());
		server.use('/UpdateCatalog', (req, res, next) =>
		{
			console.log('UpdateCatalog');
			updateCatalog();
		});

		server.use('/DiagramSearch', async (req, res, next) =>
		{
			console.log('DiagramSearch', req.query.search);
			const search = dbcon.escape(`%${req.query.search}%`);
			const sql = `SELECT * FROM diagrams WHERE name LIKE ${search} OR properName LIKE ${search}`;
			dbcon.query(sql, (err, result) =>
			{
				if (err) throw err;
				res.end(JSON.stringify(result));
			});
		});

		server.use('/DiagramIngest', async (req, res, next) =>
		{
			console.log('DiagramIngest', req.body.diagram.name);
			const {diagram, user, png} = req.body;
			const name = diagram.name;
			if (await updateDiagramInfo(diagram))
			{
				saveDiagramJson(name, JSON.stringify(diagram));
				saveDiagramPng(name, png);
			}
			res.end('ok');
		});

		server.use('/Cat', (req, res) =>
		{
			console.log('/Cat', {query:req.query});
			const name = req.query.diagram;
			Cat.R.SelectDiagram(name, _ =>
			{
				const diagram = Cat.R.$CAT.getElement(name);
				let response = '{}';
				if (diagram)
				{
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
				}
				else
					response = `{"Error":"Diagram not found: ${req.query.diagram}"}`;
				res.end(response);
			});
		});

//await dbconSync.query('TRUNCATE diagrams');
		updateCatalog(_ =>
		{
			Cat.R.Initialize();
			console.log('ready to serve');
			server.listen(process.env.HTTP_PORT);
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
	console.log({error});
}
