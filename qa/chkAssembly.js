// (C) 2022 Harry Dole
// Catecon:  The Categorical Console
//
require('dotenv').config();

const path = require('path');

const fs = require('fs');

const encoding = require('encoding');
const util = require( 'util' );

const D2 = require('../' + path.join(process.env.HTTP_DIR, 'js', 'D2.js'));
const Cat = require('../' + path.join(process.env.HTTP_DIR, 'js', 'Cat.js'));

let gotError = false;

Cat.R.default.debug = false;
Cat.R.cloudURL = null;		// do not connect to cloud server

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';

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

const testResults = {};
const badResults = {};

function check(diagram, obj, sig)
{
	let assembler = new Cat.Assembler(diagram);
	let object = diagram.getElement(obj);
	if (!object)
	{
		console.log('*** Cannot find object to assemble');
		return false;
	}
	let result = true;
	try
	{
		if (!Cat.R.Actions.morphismAssembly.hasForm(diagram, [obj]))
		{
			console.log('*** Warning: object does not match form', obj.name);
			return false;
		}
		let morphism = assembler.assemble(null, object);
		if (!morphism)
		{
			console.log('*** No morphism assembled', object.name);
			result = false;
		}
		else if (morphism.signature !== sig)
		{
			console.log('*** Assembly failed', object.name, 'good sig', sig, 'bad sig', morphism.signature);
			result = false;
		}
		if (result)
			testResults[object.basename] = {object:object.basename, signature:morphism.signature};
		else
			badResults[object.basename] = {object:object.basename, signature:morphism ? morphism.signature : ''};
		result && console.log('Passed', object.name, morphism.signature);
	}
	catch(x)
	{
		console.log('*** EXCEPTION', x);
		return false;
	}
	return result;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
try
{
	let writeResults = process.argv.includes('-w');
	const testdataFilename = './qa/tests/assembly.json';
	let testdata = {};
	if (fs.existsSync(testdataFilename))
	{
		const testdataFile = fs.readFileSync('./qa/tests/assembly.json');
		if (testdata)
			testdata = JSON.parse(testdataFile);
	}
	else
		console.log('WARNING:  Test data not found at ./qa/tests/assembly.json');
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
					console.log('loading', name);
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
			Cat.R.loadDiagram('hdole/assembly', diagram =>
			{
				console.log('Begin assembly tests');
				let errcnt = 0;
				diagram.domain.forEachObject(obj =>
				{
					const test = obj.basename in testdata ? testdata[obj.basename] : {object:obj, signature:''};
					!check(diagram, obj, test.signature) && errcnt++;
				});
				if (writeResults)
				{
					const ndx = process.argv.indexOf('-s');
					let sig = ndx > -1 && process.argv.length > ndx + 1 ? process.argv[ndx + 1] : null;
					if (sig)
					{
						console.log('*** Update tests with signature', sig);
						for (let obj in badResults)
						{
							const data = badResults[obj];
							if (data.signature === sig)
							{
								testResults[obj] = data;
								console.log('***** Updated tests results for', obj);
							}
						}
					}
					console.log('*** Writing test results to', testdataFilename);
					fs.writeFileSync(testdataFilename, JSON.stringify(testResults, null, 2));
				}
				console.log('*** Assembly test finished with', errcnt, 'errors');
				gotError = errcnt > 0;
			});
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
