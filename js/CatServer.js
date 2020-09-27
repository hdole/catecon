// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
require('dotenv').config();

const express = require('express');
const server = express();

const url = require('url');
const mysql = require('mysql');
const path = require('path');
const fs = require('fs');
//const aws = require('aws-sdk');

const Cat = require('./Cat.js');

const cloudURL = process.env.CAT_CLOUD_URL;

const mysqlArgs =
{
	host:		process.env.MYSQL_HOST,
	user:		process.env.MYSQL_USER,
	password:	process.env.MYSQL_PASSWORD,
	database:	process.env.MYSQL_DB,
};

const dbcon = mysql.createConnection(mysqlArgs);

dbcon.connect(err =>
{
	if (err) throw err;
	console.log("MySQL connected!");
});

server.use(express.static(process.env.HTTP_DIR));
server.use(express.urlencoded({extended:true}));
server.use(express.json());

function fetchCatalog(followup = null)
{
	fetch(`${cloudURL}/catalog.json`).then(response => response.text().then(catalogString =>
	{
		const catFile = fs.openSync('diagrams/catalog.json', 'w');
		fs.writeSync(catFile, catalogString, 0, catalogString.length +1);
		fs.closeSync(catFile);
		followup && followup(JSON.parse(catalogString));
	}));
}

function updateDiagramInfo(diagram, fn)
{
	const name = diagram.name;
	const hasIt = `SELECT timestamp FROM diagrams WHERE name = '${name}'`;
	dbcon.query(hasIt, (err, result) =>
	{
		if (err) throw err;
		let sql = null;
		const timestamp = diagram.timestamp ? diagram.timestamp : Date.now();
		const assign = 'name = ?, basename = ?, user = ?, description = ?, properName = ?, refs = ?, timestamp = ?';
		if (result.length > 0)
		{
			if (timestamp > result[0].timestamp)
				sql = `UPDATE diagrams SET ${assign} WHERE name = ${dbcon.escape(name)}`;
			else
				console.log(`${name} no action`, timestamp, result[0].timestamp);
		}
		else
			sql = 'INSERT into diagrams (name, basename, user, description, properName, refs, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)';
		if (sql)
		{
			console.log(`update ${name} @ ${timestamp}`);
			dbcon.query(sql, [name, diagram.basename, diagram.user, diagram.description, diagram.properName, JSON.stringify(diagram.references), timestamp], (err, result) =>
			{
				if (err) throw err;
				fn();
			});
		}
	});
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

server.use('/DownloadCatalog', (req, res, next) =>
{
	console.log('DownloadCatalog');
	// catalog.json
	fetchCatalog(catalog =>
	{
		const diagrams = catalog.diagrams;
		diagrams.map(d =>
		{
			try
			{
				/*
				const hasIt = `SELECT timestamp FROM diagrams WHERE name = '${d.name}'`;
				dbcon.query(hasIt, (err, result) =>
				{
					if (err) throw err;
					let sql = null;
					const assign = 'name = ?, basename = ?, user = ?, description = ?, properName = ?, refs = ?, timestamp = ?';
					if (result.length > 0)
					{
						if (d.timestamp > result[0].timestamp)
							sql = `UPDATE diagrams SET ${assign} WHERE name = ${dbcon.escape(d.name)}`;
						else
							console.log(`${d.name} no action`);
					}
					else
						sql = 'INSERT into diagrams (name, basename, user, description, properName, refs, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)';
					if (sql)
					{
						dbcon.query(sql, [d.name, d.basename, d.user, d.description, d.properName, JSON.stringify(d.references), d.timestamp], (err, result) =>
						{
							if (err) throw err;
							*/
				updateDiagramInfo(d, _ =>
				{
					console.log(`download ${d.name}`);
					// diagram.json
					fetch(`${cloudURL}/${d.name}.json`).then(response => response.text().then(diagramString =>
					{
						/*
						const dgrmFile = `diagrams/${d.name}.json`;
						fs.mkdirSync(path.dirname(dgrmFile), {recursive:true});
						const dgrmFD = fs.openSync(dgrmFile, 'w');
						fs.writeSync(dgrmFD, diagramString, 0, diagramString.length +1);
						fs.closeSync(dgrmFD);
						*/
						saveDiagramJson(d.name, diagramString);
					}));
					// diagram.png
					fetch(`${cloudURL}/${d.name}.png`).then(response => response.buffer()).then(pngBfr =>
					{
						/*
						const pngFile = `diagrams/${d.name}.png`;
						fs.mkdirSync(path.dirname(pngFile), {recursive:true});
						const pngFD = fs.openSync(pngFile, 'w');
						fs.writeSync(pngFD, pngBfr, 0, pngBfr.length);
						fs.closeSync(pngFD);
						*/
						saveDiagramPng(d.name, pngBfr);
					});
				});
			}
			catch(err)
			{
				console.log(err);
			}
		});
		res.end('ok');
	});
});

server.use('/DiagramSearch', (req, res, next) =>
{
	console.log('DiagramSearch', req.query.diagram);
	const search = dbcon.escape(`%${req.query.diagram}%`);
	const sql = `SELECT * FROM diagrams WHERE name LIKE ${search} OR properName LIKE ${search}`;
	dbcon.query(sql, (err, result) =>
	{
		if (err) throw err;
		res.end(JSON.stringify(result));
	});
});

server.use('/DiagramIngest', (req, res, next) =>
{
	console.log('DiagramIngest', req.body.diagram.name);
	const {diagram, user, png} = req.body;
	const name = diagram.name;
	const hasIt = `SELECT timestamp FROM diagrams WHERE name = '${name}'`;
	dbcon.query(hasIt, (err, result) =>
	{
		updateDiagramInfo(diagram, _ =>
		{
			saveDiagramJson(name, JSON.stringify(diagram));
			saveDiagramPng(name, png);
		});
	});
	res.end('ok');
});

console.log('ready');

server.listen(process.env.HTTP_PORT);
