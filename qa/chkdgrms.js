// (C) 2022 Harry Dole, All Rights Reserved
// Catecon:  The Categorical Console
//
require('dotenv').config();

const path = require('path');

const fs = require('fs');

const encoding = require('encoding');
const util = require( 'util' );

const D2 = require('./' + path.join(process.env.HTTP_DIR, 'js', 'D2.js'));
const Cat = require('./' + path.join(process.env.HTTP_DIR, 'js', 'Cat.js'));

let gotError = false;

Cat.R.default.debug = false;
Cat.R.cloudURL = null;		// do not connect to cloud server

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';

function saveDiagram(diagram)
{
	console.log('saving diagram', diagram.name);
	diagram.timestamp = diagram.timestamp + 1;
	const diagramString = JSON.stringify(diagram.json(), null, 2);
	const dgrmFile = path.join(process.env.HTTP_DIR, 'diagram', diagram.name + '.jsonX');
	fs.mkdirSync(path.dirname(dgrmFile), {recursive:true});
	const dgrmFD = fs.openSync(dgrmFile, 'w');
	fs.writeSync(dgrmFD, diagramString, 0, diagramString.length +1);
	fs.closeSync(dgrmFD);
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
try
{
	Cat.R.initialize(_ =>
	{
		try
		{
			// load diagrams from local storage
			const dir = path.join(process.env.CAT_DIR, process.env.HTTP_DIR, 'diagram');
			const fsDiagrams = findDiagramJsons(dir);
			const diagramJson = new Map();
			fsDiagrams.map(f =>
			{
				const data = fs.readFileSync(f);
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
				diagramJson.set(diagInfo.name, diagInfo);
			});
			const name = process.argv[2];
			const loaded = new Set();
			const diagrams = new Map();
			const loader = name =>
			{
				try
				{
					const args = diagramJson.get(name);
					if (loaded.has(args.name))
						return;
					loaded.add(args.name);
					if (!('name' in args))
					{
						console.log('no references', args);
						return;
					}
					args.references.map(ref => loader(ref));
					const userDiagram = Cat.R.getUserDiagram(args.user);
					console.log('\n**************** checking', name);
					const d = new Cat[args.prototype](userDiagram, args);
					d.postProcess();
					d.check();
					diagrams.set(d.name, d);
				}
				catch(error)
				{
					console.log(error);
				}
			};
			[...diagramJson.keys()].map(loader);
		}
		catch(x)
		{
			console.error(x);
		}
	});
}
catch(error)
{
	console.error(error);
}

process.exit(gotError ? 1 : 0);
