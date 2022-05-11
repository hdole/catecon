// (C) 2021 Harry Dole, All Rights Reserved
// Catecon:  The Categorical Console
//
require('dotenv').config();

const path = require('path');

const fs = require('fs');

const encoding = require('encoding');
const util = require( 'util' );

const D2 = require('./' + path.join(process.env.HTTP_DIR, 'js', 'D2.js'));
const Cat = require('./' + path.join(process.env.HTTP_DIR, 'js', 'Cat.js'));

Cat.R.default.debug = false;
Cat.R.cloudURL = null;		// do not connect to cloud server

Cat.R.URL = process.env.CAT_URL;
Cat.R.local = process.env.CAT_LOCAL === 'true';

function saveDiagramJson(name, diagramString)
{
	const dgrmFile = path.join(process.env.HTTP_DIR, 'diagram', name + '.json');
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
				diagramJson.set(diagInfo.name, diagInfo);
			});
			const name = process.argv[2];
			//
			// load diagrams in reverse dependency order
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
			};
			[...diagramJson.keys()].map(loader);
			const diagram = diagrams.get(name);
			if (!diagram)
				throw 'no diagram';
			const basename = process.argv[3];
			if (!Cat.U.isValidBasename(basename))
				throw 'bad old basename';
			const nuBasename = process.argv[4];
			if (!Cat.U.isValidBasename(nuBasename))
				throw 'bad new basename';
			if (basename === nuBasename)
				throw 'names cannot be the same';
			const elt = diagram.getElement(basename);
			if (!elt)
				throw 'no element found for basename';
			if (diagram.getElement(nuBasename))
				throw 'new basename cannot be previously existing';
			const candidates = new Set();
			candidates.add(diagram.name);
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
						candidates.add(nm);
						scanning.push(nm);
					}
				});
			}
			console.log(candidates);
			const eltArgs = elt.json();
			eltArgs.basename = nuBasename;
			const nuElt = diagram.get(eltArgs.prototype, eltArgs);
			console.log('nuElt', nuElt.name);
			//
			// find all the elements that use the specified element
			//
			const elements = new Set();
			candidates.forEach(scan =>
			{
				const d = diagrams.get(scan);
				d.getAll().forEach(scan => scan.uses(elt) && elements.add(scan));
			});
			const modDiagrams = new Set();
			elements.forEach(e => modDiagrams.add(e.diagram));
			console.log('Diagrams to be modified:');
			modDiagrams.forEach(d => console.log(d.name));
			const jsons = new Map();
			elements.forEach(e => jsons.set(e.name, e.json()));

			const name2elt = new Map();
			diagrams.forEach(dgrm => dgrm.getAll().forEach(e => name2elt.set(e.name, e)));

			const indices = new Map();
			diagrams.forEach(dgrm =>
			{
				dgrm.domain.elements.forEach(ndx =>
				{
					if ('to' in ndx && elements.has(ndx.to))
					{
						if (!indices.has(ndx.to))
							indices.set(ndx.to, []);
						const ndxs = indices.get(ndx.to);
						ndxs.push(ndx);
						if (ndx instanceof Cat.IndexObject)
							ndx.setObject(null)
						else if (ndx instanceof Cat.IndexMorphism)
							ndx.setMorphism(null);
					}
				});
				dgrm.purge();
			});

			//
			// look for bad reference counts
			//
			[...elements].filter(e => e.refcnt !== 0).map(e =>
			{
				const users = e.diagram.getUsingElements(e);
				console.log(e.name, users.map(i => i.name));
			});
			console.log('bad refcnts', [...elements].filter(e => e.refcnt !== 0).length);
			//
			// for element using the specified one create a new one using the replacement
			//
			// TODO Definition, DefinitionInstance, Theorem
			//
			const built = new Map();
			built.set(elt.name, nuElt);
			const build = (ctx, name) =>
			{
				let thisElt = name2elt.get(name);
				thisElt = thisElt ? thisElt : name2elt.get(ctx.name + '/' + name);		// try global name
				if (jsons.has(name))
				{
					const json = jsons.get(name);
					const dgrm = diagrams.get(json.diagram);
					if (built.has(name))
						return built.get(name);
					let nu = null;
					if ('morphisms' in json)
						json.morphisms = json.morphisms.map(m => build(dgrm, m));
					else if ('objects' in json)
						json.objects = json.objects.map(o => build(dgrm, o));
					else if (json.prototype === 'Morphism' && 'recursor' in json)
					{
						const rec = json.recursor;
						delete json.recursor;
						nu = new Cat[json.prototype](dgrm, json);
						built.set(name, nu);
						const recursor = build(dgrm, rec);
						nu.setRecursor(recursor);
					}
					else if (json.prototype === 'LambdaMorphism')
						json.preCurry = build(dgrm, preCurry);
					else if (json.prototype === 'NamedObject' || json.prototype === 'NamedMorphism')
						json.source = build(dgrm, json.source);
					nu = nu ? nu : new Cat[json.prototype](dgrm, json);
					built.set(name, nu);
					return nu;
				}
				return thisElt;
			};
			jsons.forEach((json, name) =>
			{
				const dgrm = diagrams.get(json.diagram);
				build(dgrm, json.name);
			});
			console.log('Elements to be modified:');
			elements.forEach(e => console.log(e.name, '::', built.get(e.name).name));
			diagrams.forEach(dgrm =>
			{
				dgrm.domain.elements.forEach(ndx =>
				{
					if ('to' in ndx && built.has(ndx.to))
					{
						ndx.to = built.get(ndx.to);
						ndx.to.decrRefcnt();
					}
				});
			});
			//
			// update index elements
			//
			indices.forEach((ary, e) => ary.map(ndx =>
			{
				if (ndx instanceof IndexObject)
					ndx.setObject(built.get(e.name));
				else if (ndx instanceof IndexMorphism)
					ndx.setMorphism(built.get(e.name));
			}));
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
