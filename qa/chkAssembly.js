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

function check(diagram, obj, sig, name)
{
	let assembler = new Cat.Assembler(diagram);
	let object = diagram.getElement(obj);
	if (!object)
	{
		console.log('*** Cannot find object to assemble');
		return false;
	}
	let morphism = assembler.assemble(null, object);
	if (morphism === null)
	{
		console.log('*** No morphism assembled', object.name);
		return false;
	}
	if (morphism.signature !== sig)
	{
		console.log('*** Assembly failed', object.name, 'good sig', sig, 'bad sig', morphism.signature);
		return false;
	}
	if (morphism.name !== name)
	{
		console.log('*** Assembly failed', object.name, 'good name', name, 'bad name', morphism.name);
		return false;
	}
	console.log('Passed', object.name, morphism.signature);
	return true;
}

// TODO move to ./qa/tests/assembly.json
const tests =
[
	{
		object:		'o_1',
		sig:		'084ece9c2cceab443cda9158ade79c8c12830e9e278fefed050207dad4b4d4d6',
		name:		'hdole/assembly/Cm{Cm{Fa{hdole/floats/F64:hdole/floats/F64_0,#1_-1}aF,Pm{Id{hdole/floats/F64}dI,hdole/floats/fone64}mP}mC,hdole/floats/fsub64}mC',
	},
	{
		object:		'o_6',
		sig:		'2aa146ba6af1ffd4713947c2a67cda5d13351c50714183af4d70cdd2ba68a8be',
		name:		'hdole/assembly/Cm{Cm{Fa{S:S_,S_0}aF,Pm{test,Id{S}dI}mP}mC,Cm{Di{Po{CPo{#1,#1}oPC,S}oP-L}iD,CPm{Cm{Fa{Po{#1,S}oP:S_1}aF,Fa{S:S_1}aF}mC,Cm{Fa{Po{#1,S}oP:S_1}aF,Cm{Fa{S:S_1}aF,Cm{update,while}mC}mC}mC}mPC,CFa{S:S_,S_}aFC}mC}mC',
	},
	{
		object:		'o_13',
		sig:		'5dc163761e18cd9bf27c699a04a84c8e0cce4acdc1b1c0059f655bba64650160',
		name:		'hdole/assembly/Cm{Cm{Fa{hdole/floats/F64:hdole/floats/F64_,hdole/floats/F64_0}aF,Pm{hdole/floats/feq0_64,Id{hdole/floats/F64}dI}mP}mC,Cm{Di{Po{CPo{#1,#1}oPC,hdole/floats/F64}oP-L}iD,CPm{Cm{Fa{Po{#1,hdole/floats/F64}oP:hdole/floats/F64_1}aF,Cm{Fa{hdole/floats/F64:hdole/floats/F64_1}aF,Cm{Cm{Fa{hdole/floats/F64:hdole/floats/F64_,hdole/floats/F64_0}aF,Pm{Cm{hdole/floats/fdecr64,fact}mC,Id{hdole/floats/F64}dI}mP}mC,Cm{Cm{Fa{Po{hdole/floats/F64,hdole/floats/F64}oP:hdole/floats/F64_0,hdole/floats/F64_1}aF,Pm{Cm{hdole/floats/fdecr64,fact}mC,Id{hdole/floats/F64}dI}mP}mC,Cm{Fa{Po{hdole/floats/F64,hdole/floats/F64}oP:hdole/floats/F64_1,hdole/floats/F64_0}aF,hdole/floats/fmult64}mC}mC}mC}mC}mC,Cm{Fa{Po{#1,hdole/floats/F64}oP:hdole/floats/F64_1}aF,Fa{hdole/floats/F64:#1_-1}aF,hdole/floats/fone64}mC}mPC,CFa{hdole/floats/F64:hdole/floats/F64_,hdole/floats/F64_}aFC}mC}mC',
	},
	{
		object:		'o_52',
		sig:		'acdff222cef78e6079273a7d2d484d6542db3cd1a6769831a34c213b2f22e298',
		name:		'hdole/assembly/Cm{test,Id{CPo{#1,#1}oPC}dI}mC'
	},
	{
		object:		'o_44',
		sig:		'e7bf95aab974a63f3cd4a1818f61f9db227afe1342cb97696d17e4fe2b8720b8',
		name:		'hdole/assembly/Cm{Cm{Fa{S:S_,S_0}aF,Pm{test,Id{S}dI}mP}mC,Cm{Di{Po{CPo{#1,#1}oPC,S}oP-L}iD,CPm{Cm{Fa{Po{#1,S}oP:S_1}aF,Fa{S:S_1}aF}mC,Cm{Fa{Po{#1,S}oP:S_1}aF,Fa{S:S_1}aF}mC}mPC,CFa{S:S_,S_}aFC}mC}mC',
	},
];

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
				diagram.domain.forEachObject(obj => check(diagram, obj, '', ''));
//				const errcnt = tests.map(test => check(diagram, test.object, test.sig, test.name)).filter(r => !r).length;
//				console.log('Assembly test finished with', errcnt, 'errors');
//				gotError = errcnt > 0;
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
