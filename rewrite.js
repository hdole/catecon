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
	const dgrmFile = path.join(process.env.HTTP_DIR, 'diagram', diagram.name + '.json');
	fs.mkdirSync(path.dirname(dgrmFile), {recursive:true});
	const dgrmFD = fs.openSync(dgrmFile, 'w');
	fs.writeSync(dgrmFD, diagramString, 0, diagramString.length +1);
	fs.closeSync(dgrmFD);
}

function findDiagramJsons(dir)
{
	if (!fs.existsSync(dir))
	{
		console.log('missing directory', dir);
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
	if (process.argv.length !== 3)
	{
		console.log(process.argv[0], 'Usage: filename');
		process.exit(1);
	}
	const input = fs.readFileSync(process.argv[2], {encoding:'utf8', flag:'r'}).split('\n');
	Cat.R.initialize(_ =>
	{
		try
		{
			//
			// find and read diagrams from local storage
			//
			const dir = path.join(process.env.CAT_DIR, process.env.HTTP_DIR, 'diagram');
			const fsDiagrams = findDiagramJsons(dir);
			const diagramJson = new Map();
			fsDiagrams.map(f =>
			{
				const data = fs.readFileSync(f);
				if (!data)
				{
					console.log('ERROR: cannot read diageram file', f, error);
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
			//
			// load diagrams in dependency order
			//
			const loaded = new Set();
			const diagrams = new Map();
			const loader = name =>
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
				const d = new Cat[args.prototype](userDiagram, args);
				d.postProcess();
				diagrams.set(d.name, d);
				d.purge();
			};
			[...diagramJson.keys()].map(loader);
			const modDiagrams = new Set();
			const didit = new Set();
			const processOne = (name, basename, nuBasename) =>
			{
				if (basename === nuBasename)
					throw 'names cannot be the same';
				const diagram = diagrams.get(name);
				if (!diagram)
					throw 'no diagram';
				const isBare = !basename.includes('{');
				if (isBare)
				{
					if (!Cat.U.isValidBasename(basename))
						throw 'bad old basename';
					if (!Cat.U.isValidBasename(nuBasename))
						throw 'bad new basename';
				}
				else
					if (!nuBasename.includes('{'))
						throw 'new basename is not complex';
				const elt = diagram.getElement(basename);
				if (!elt)
				{
					console.log('no element found for basename', basename);
					return;
				}
				if (diagram.getElement(nuBasename))
					throw 'new basename cannot be previously existing';
				const uniq = name + basename + nuBasename;
				if (didit.has(uniq))
					return;
				didit.add(uniq);
				console.log('*** Processing', name, basename, nuBasename);
				const candidateDiagrams = new Set();
				candidateDiagrams.add(name);
				const scanning = [name];
				const scanned = new Set();
				while(scanning.length > 0)
				{
					const scan = scanning.pop();
					if (scanned.has(scan))
						continue;
					scanned.add(scan);
					const diag = diagrams.get(scan);
					diagrams.forEach((d, nm) =>
					{
						if (d.allReferences.has(scan))
						{
							candidateDiagrams.add(nm);
							scanning.push(nm);
						}
					});
				}
				//
				// find all the elements that use the specified element
				//
				const elements = new Set();
				candidateDiagrams.forEach(scan =>
				{
					const d = diagrams.get(scan);
					d.getAll().forEach(scan => scan.uses(elt) && elements.add(scan));
				});
				elt.setName(nuBasename);
				elements.forEach(e =>
				{
					e.setName();
					modDiagrams.add(e.diagram);
				});
			}
			let name = null;
			let basename = null;
			let nuBasename = null;
			Cat.R.basemode = false;
			input.map(ln =>
			{
				const line = ln.trim();
				if (line === '')
					return;
				const tokens = line.split(' ').filter(t => t != '');		// split and remove extra spaces
				if (tokens.length === 1)
				{
					name = tokens[0];
					return;
				}
				else if (tokens.length === 2)
				{
					basename = tokens[0];
					nuBasename = tokens[1];
				}
				else
					throw 'bad input line' + line;
				processOne(name, basename, nuBasename);
			});
return;
			modDiagrams.forEach(dgrm => saveDiagram(dgrm));
		}
		catch(x)
		{
			console.log(x);
		}
	});
}
catch(error)
{
	console.log(error);
}

process.exit(gotError ? 1 : 0);
