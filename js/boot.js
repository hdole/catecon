// (C) 2020 Harry Dole
// Catecon:  The Categorical Console
//
'use strict';

const Boot = function(fn)
{
	function CheckColumn(args)
	{
		if ('rowCount' in args && args.rowCount >= args.rows)
		{
			const bbox = args.diagram.svgRoot.getBBox();
			if (bbox.width === 0)	// TODO issue with firefox
			{
				bbox.width = 600;
				bbox.x = args.xy.x;
			}
			args.xy = Cat.D.Grid(new Cat.D2(bbox.x + bbox.width + 160, 300 + 8 * 16));
			args.rowCount = 0;
		}
	}
	function Autoplace(diagram, args, xy)
	{
		let index = null;
		if (args.prototype === 'DiagramText')
		{
			const nuArgs = Cat.U.Clone(args);
			nuArgs.xy = xy;
			index = new Cat.DiagramText(diagram, nuArgs);
			diagram.addSVG(index);
		}
		else if (Cat.CatObject.IsA(args))
			index = diagram.placeObject(null, args, xy, false);
		else
		{
			const to = Cat.Element.Process(diagram, args);
			if (Cat.Morphism.IsA(to))
			{
				index = diagram.placeMorphism(null, to, xy, xy.add(D.default.stdArrow), false);
				if ('js' in args)
					to.code = {javascript:Cat.JavascriptAction.Header(to) + '\t' + args.js + Cat.JavascriptAction.Tail(to)};
				else if ('code' in args)
					to.code.javascript = args.code.javascript.replace(/%1/g, Cat.U.Token(to));
			}
			else if (Cat.CatObject.IsA(to))
				index = diagram.placeObject(null, to, xy, false);
		}
		if ('rowCount' in args)
		{
			args.rowCount++;
			xy.y += 16 * Cat.D.default.layoutGrid;
		}
		return index;
	}
	function DiagramReferences(user, diagram, xy)
	{
		const names = [];
		diagram.references.forEach(function(d){names.push(d.properName);});
		Autoplace(diagram,
		{
			description:	'References: ' + names.join(),
			prototype:		'DiagramText',
			user,
		}, xy);
	}
	function PlaceSideText(args, text)
	{
		Autoplace(args.diagram,
		{
			description:	Cat.U.Formal(text),
			prototype:		'DiagramText',
		}, args.xy.add(args.side));
	}
	function PlaceObject(args, o)
	{
		CheckColumn(args);
		PlaceSideText(args, o.description);
		const i = args.diagram.placeObject(null, o, args.xy, false);
		args.rowCount++;
		args.xy.y += 16 * Cat.D.default.layoutGrid;
		return i;
	}
	function MakeObject(args, basename, prototype, properName, description, moreArgs = {})
	{
		CheckColumn(args);
		const nuArgs = Cat.U.Clone(args);
		nuArgs.xy = new Cat.D2(args.xy);
		for (const n in moreArgs)
			nuArgs[n] = moreArgs[n];
		nuArgs.description = description;
		nuArgs.prototype = prototype;
		nuArgs.basename = basename;
		if (properName !== '')
			nuArgs.properName = properName;
		const e = Autoplace(args.diagram, nuArgs, nuArgs.xy);
		PlaceSideText(args, description);
		args.xy = new Cat.D2(nuArgs.xy);
		args.rowCount = nuArgs.rowCount;
		return e;
	}
	function PlaceMorphism(args, m)
	{
		CheckColumn(args);
		PlaceSideText(args, m.description);
		const i = args.diagram.placeMorphism(null, m, args.xy, args.xy.add(Cat.D.default.stdArrow), false);
		args.xy = new Cat.D2(args.xy);
		args.rowCount++;
		args.xy.y += 16 * Cat.D.default.layoutGrid;
		return i;
	}
	function NewMorphism(args, basename, prototype, properName, description, domain, codomain, moreArgs)
	{
		const nuArgs = Cat.U.Clone(args);
		nuArgs.xy = new Cat.D2(args.xy);
		for (const n in moreArgs)
			nuArgs[n] = moreArgs[n];
		nuArgs.description = description;
		nuArgs.basename = basename;
		nuArgs.prototype = prototype;
		if (properName !== '')
			nuArgs.properName = properName;
		nuArgs.domain = domain;
		nuArgs.codomain = codomain;
		const to = Cat.Element.Process(args.diagram, nuArgs);
		if (Object.keys(args).length > 0)
			to.code = {};
		if ('js' in args)
			to.code.javascript = args.js.replace(/%1/g, Cat.U.Token(to));
		if ('cpp' in args)
			to.code.cpp = args.cpp.replace(/%1/g, Cat.U.Token(to)).replace(/%2/g, Cat.U.Token(to.domain)).replace(/%3/g, Cat.U.Token(to.codomain));
		return to;
	}
	function placeMorphismByObject(args, basename, prototype, properName, description, domain, codomain, moreArgs, dir, object)
	{
		const to = NewMorphism(args, basename, prototype, properName, description, domain, codomain, moreArgs);
		return args.diagram.placeMorphismByObject(null, dir, object, to, false);
	}
	function MakeMorphism(args, basename, prototype, properName, description, domain, codomain, moreArgs = {})
	{
		/*
		const nuArgs = Cat.U.Clone(args);
		nuArgs.xy = new Cat.D2(args.xy);
		for (const n in moreArgs)
			nuArgs[n] = moreArgs[n];
		nuArgs.description = description;
		nuArgs.basename = basename;
		nuArgs.prototype = prototype;
		if (properName !== '')
			nuArgs.properName = properName;
		nuArgs.domain = domain;
		nuArgs.codomain = codomain;
		*/
		const to = NewMorphism(args, basename, prototype, properName, description, domain, codomain, moreArgs);
		/*
		const to = Cat.Element.Process(args.diagram, nuArgs);
//		if ('js' in nuArgs)
//			to.code = {javascript:Cat.JavascriptAction.Header(to) + '\t' + nuArgs.js + Cat.JavascriptAction.Tail(to)};
		if (Object.keys(nuArgs).length > 0)
			to.code = {};
		if ('js' in nuArgs)
			to.code.javascript = nuArgs.js.replace(/%1/g, Cat.U.Token(to));
		if ('cpp' in nuArgs)
			to.code.cpp = nuArgs.cpp.replace(/%1/g, Cat.U.Token(to)).replace(/%2/g, Cat.U.Token(to.domain)).replace(/%3/g, Cat.U.Token(to.codomain));
			*/
		const e = PlaceMorphism(args, to);
		args.xy = new Cat.D2(args.xy);
		args.rowCount = args.rowCount;
		return e;
	}
	const user = 'hdole';
	const side = Cat.D.Grid(new Cat.D2(0, 4 * Cat.D.default.layoutGrid));
	const pfs = Cat.R.CAT.getElement('hdole/PFS');
	let userDiagram = Cat.R.GetUserDiagram(user);
	const args =
	{
		user,
		xy:			new Cat.D2(300,300),
		side,
		rows:		8,
		rowCount:	0,
	};
	//
	// basics
	//
	const basics = new Cat.Diagram(userDiagram,
	{
		codomain:		pfs,
		basename:		'Basics',
		properName:		'Basics',
		description:	'Basic objects for interacting with the real world',
		user,
	});
	args.diagram = basics;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	basics.makeSvg(false);
	Cat.R.AddDiagram(basics);
	Autoplace(basics,
	{
		description:	'This diagram contains initial and terminal objects\nas well as objects for interacting with the real world.\nIn other words, device drivers',
		prototype:		'DiagramText',
		user,
	}, args.xy);
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const zero = basics.get('InitialObject', {});
	const one = basics.get('TerminalObject', {});
	PlaceObject(args, zero);
	PlaceObject(args, one);
	const tty = MakeObject(args, 'TTY', 'FiniteObject', 'TTY', 'The TTY object interacts with serial devices').to;
	Cat.D.ShowDiagram(basics);
	basics.home(false);
	basics.update();
	//
	// logic
	//
	const logic = new Cat.Diagram(userDiagram,
	{
		codomain:		pfs,
		basename:		'Logic',
		properName:		'&Omega; Logic',
		description:	'Basic logic functions',
		references:		[basics],
		user,
	});
	args.diagram = logic;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	logic.makeSvg(false);
	Cat.R.AddDiagram(logic);
	Autoplace(logic,
	{
		description:	'This diagram contains typical logic objects and morphisms',
		prototype:		'DiagramText',
		user,
		properName:		'&Omega;',
	}, args.xy);
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const two = logic.get('ProductObject', {objects:[one, one], dual:true});
	const omega = new Cat.NamedObject(logic, {basename:'Omega', properName:'&Omega;', source:two});
	const omega2twoId = logic.placeMorphism(null, omega.idFrom, args.xy, args.xy.add(Cat.D.default.stdArrow), false);
	args.rowCount++;
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const id2 = new Cat.DiagramMorphism(logic, {to:omega.idTo, domain:omega2twoId.codomain, codomain:omega2twoId.domain});
	logic.addSVG(id2);
	const omegaPair = MakeObject(args, '', 'ProductObject', '', 'A pair of 2\'s', {objects:[omega, omega]}).to;
	const mTrue = MakeMorphism(args, 'true', 'Morphism', '&#8868;', 'The truth value known as true', one, omega,
	{
		js:'function %1(args)\n{\n	return true;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = true;\n}\n',
	}).to;
	const mFalse = MakeMorphism(args, 'false', 'Morphism', '&perp;', 'The truth value known as false', one, omega,
	{
		js:'function %1(args)\n{\n	return false;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = false;\n}\n',
	}).to;
	const logicNot = MakeMorphism(args, 'not', 'Morphism', '&not;', 'The negation of a logic value', omega, omega,
	{
		js:'function %1(args)\n{\n	return !args;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = !args;\n}\n',
	}).to;
	const logicAnd = MakeMorphism(args, 'and', 'Morphism', '&and;', 'The logical and of two logic values', omegaPair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] && args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] && args[1];\n}\n',
	}).to;
	const logicOr = MakeMorphism(args, 'or', 'Morphism', '&or;', 'The logical or of two logic values', omegaPair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] || args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] || args[1];\n}\n',
	}).to;
	DiagramReferences(user, logic, args.xy);
	Cat.D.ShowDiagram(logic);
	logic.home(false);
	logic.update();
	//
	// N arithemtic
	//
	const Narith = new Cat.Diagram(userDiagram,
	{
		description:	'Arithmetic functions for natural numbers',
		codomain:		pfs,
		basename:		'Narithmetics',
		properName:		'&Nopf; Arithmetic',
		references:		[logic],
		user,
	});
	args.diagram = Narith;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	Narith.makeSvg(false);
	Cat.R.AddDiagram(Narith);
	Autoplace(Narith,
	{
		description:	'Basic morphisms for natural numbers are given here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const N = MakeObject(args, 'N', 'CatObject', '&Nopf;', 'The natural numbers').to;
	const NplusOne = MakeObject(args, '', 'ProductObject', '', 'A natural number or an exception', {objects:[N, one], dual:true}).to;
	const Nzero = MakeMorphism(args, 'zero', 'Morphism', '0', 'The first interesting natural number', one, N,
	{
		js:'function %1(args)\n{\n	return 0;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = 0;\n}\n',
	}).to;
	const None = MakeMorphism(args, 'one', 'Morphism', '1', 'The natural number one', one, N,
	{
		js:'function %1(args)\n{\n	return 1;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = 1;\n}\n',
	}).to;
	const Ninfinity = MakeMorphism(args, 'infinity', 'Morphism', '&infin;', 'The maximum safe natural number', one, N,
	{
		js:'function %1(args)\n{\n	return Number.MAX_SAFE_INTEGER;\n}\n',
		cpp: 'include <climits>\n\nvoid %1(const %2 & args, %3 & out)\n{\n	out = ULONG_MAX;\n}\n',
	}).to;
	const Npair = MakeObject(args, '', 'ProductObject', '', 'A pair of natural numbers', {objects:[N, N]}).to;
	const Nadd = MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two natural numbers', Npair, N,
	{
		js:'function %1(args)\n{\n	return args[0] + args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] + args[1];\n}\n',
	}).to;
	const Nmult = MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two natural numbers', Npair, N,
	{
		js:'function %1(args)\n{\n	return args[0] * args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] * args[1];\n}\n',
	}).to;
	const Nsucc = MakeMorphism(args, 'successor', 'Morphism', 'succ', 'The successor function for the natural numbers', N, N,
	{
		js:'function %1(args)\n{\n	return args + 1;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args + 1;\n}\n',
	}).to;
	const Ndecr = MakeMorphism(args, 'decrement', 'Morphism', 'decr', 'The decrement function for the natural numbers', N, N,
	{
		js:'function %1(args)\n{\n	return args > 0 ? args - 1 : 0;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args > 0 ? args - 1 : 0;\n}\n',
	}).to;
	const Nless = MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first natural number less than the second', Npair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] < args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] < args[1];\n}\n',
	}).to;
	const NlessEq = MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first natural number less than or equal to the second', Npair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] <= args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] <= args[1];\n}\n',
	}).to;
	const Nequals = MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two natural numbers for equality', Npair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] === args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] == args[1];\n}\n',
	}).to;
	DiagramReferences(user, Narith, args.xy);
	Cat.D.ShowDiagram(Narith);
	Narith.home(false);
	Narith.update();
	//
	// integers
	//
	const integers = new Cat.Diagram(userDiagram,
	{
		description:	'Arithmetic functions for integers',
		codomain:		pfs,
		basename:		'Integers',
		properName:		'&Zopf; Arithmetic',
		references:		[Narith],
		user,
	});
	args.diagram = integers;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	integers.makeSvg(false);
	Cat.R.AddDiagram(integers);
	Autoplace(integers,
	{
		description:	'Basic morphisms for the integers are given here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const Z = MakeObject(args, 'Z', 'CatObject', '&Zopf;', 'The integers').to;
	const N2Z = MakeMorphism(args, 'N2Z', 'Morphism', '&sub;', 'every natural number is an integer', N, Z,
	{
		js:'function %1(args)\n{\n	return args;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = (long)args;\n}\n',
	}).to;
	const Zabs = MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of an integer is a natural number', Z, N,
	{
		js:'function %1(args)\n{\n	return Math.abs(args);\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args >= 0 ? args ; -args;\n}\n',
	}).to;
	const Zzero = MakeMorphism(args, 'zero', 'Morphism', '&lsquo;0&rsquo;', 'The integer zero', one, Z,
	{
		js:'function %1(args)\n{\n	return 0;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = 0;\n}\n',
	}).to;
	const ZminusOne = MakeMorphism(args, 'minusOne', 'Morphism', '&lsquo;-1&rsquo;', 'The first interesting integer: minus one', one, Z,
	{
		js:'function %1(args)\n{\n	return -1;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = -1;\n}\n',
	}).to;
	const Zpair = MakeObject(args, '', 'ProductObject', '', 'A pair of integers', {objects:[Z, Z]}).to;
	const Zadd = MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two integers', Zpair, Z,
	{
		js:'function %1(args)\n{\n	return args[0] + args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] + args[1];\n}\n',
	}).to;
	const Zsubtract = MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two integers', Zpair, Z,
	{
		js:'function %1(args)\n{\n	return args[0] - args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] - args[1];\n}\n',
	}).to;
	const Zmult = MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two integers', Zpair, Z,
	{
		js:'function %1(args)\n{\n	return args[0] * args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] * args[1];\n}\n',
	}).to;
	const ZplusOne = MakeObject(args, '', 'ProductObject', '', 'An integer or an exception', {objects:[Z, one]}, {dual:true}).to;
	const Zdiv = MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two integers or an exception', Zpair, ZplusOne,
	{
		js:
`function %1(args)
{
if (args[1] === 0)
	return [1, 0];
return [0, args[0] / args[1]];
}
`,
	}).to;
	const Zsucc = MakeMorphism(args, 'successor', 'Morphism', 'succ', 'The successor function for the integers', Z, Z,
	{
		js:'function %1(args)\n{\n	return args + 1;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args + 1;\n}\n',
	});
	const Zmodulus = MakeMorphism(args, 'modulus', 'Morphism', '%', 'The modulus of two integers or an exception', Zpair, ZplusOne,
	{
		js:
`function %1(args)
{
if (args[1] === 0)
	return [1, 0];
return [0, args[0] % args[1]];
}
`,
	});
	const Zless = MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first given integer number less than the second', Zpair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] < args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] < args[1];\n}\n',
	});
	const ZlessEq = MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first integer less than or equal to the second', Zpair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] <= args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] <= args[1];\n}\n',
	});
	const Zequals = MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two integers for equality', Zpair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] === args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] == args[1];\n}\n',
	});
	DiagramReferences(user, integers, args.xy);
	Cat.D.ShowDiagram(integers);
	integers.home(false);
	integers.update();
	//
	// floating point
	//
	const floats = new Cat.Diagram(userDiagram,
	{
		description:	'Floating point artihmetic functions',
		codomain:		pfs,
		basename:		'floats',
		properName:		'&Fopf; Arithmetic',
		references:		[integers],
		user,
	});
	args.diagram = floats;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	floats.makeSvg(false);
	Cat.R.AddDiagram(floats);
	Autoplace(floats,
	{
		description:	'Basic floating point morphisms are given here',
		prototype:		'DiagramText',
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const F = MakeObject(args, 'F', 'CatObject', '&Fopf;', 'Floating point numbers').to;
	const Fzero = MakeMorphism(args, 'zero', 'Morphism', '0.0', 'The floating point zero', one, F,
	{
		js:'function %1(args)\n{\n	return 0.0;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = 0.0d;\n}\n',
	}).to;
	const Fe = MakeMorphism(args, 'e', 'Morphism', 'e', 'Euler\'s constant', one, F,
	{
		js:'function %1(args)\n{\n	return Math.E;\n}\n',
		cpp: '#include <numbers>\n\nvoid %1(const %2 & args, %3 & out)\n{\n	out = std::numbers:e_v;\n}\n',
	}).to;
	const Frandom = MakeMorphism(args, 'random', 'Morphism', '?', 'a random number between 0.0 and 1.0', one, F,
	{
		js:'function %1(args)\n{\n	return Math.random();\n}\n',
		cpp:
`
#include <random>

std::random_device %1_dev;
std::mt19937 %1_rng(%1_dev);
std::uniform_int_distribution<std::mt19937::result_type> %1_dist;
void %1(const %2 & args, %3 & out)
{
	out = %1_dist(%1_rng);
}
`,
	}).to;
	const Fnl10 = MakeMorphism(args, 'pi', 'Morphism', '&pi;', 'ratio of a circle\'s circumference to its diameter', one, F,
	{
		js:'function %1(args)\n{\n	return Math.PI;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = std::numbers::pi_v;\n}\n',
	}).to;
	const Z2F = MakeMorphism(args, 'Z2F', 'Morphism', '&sub;', 'every integer is (sort of) a floating point number', Z, F,
	{
		js:'function %1(args)\n{\n	return args;\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = (double)args;\n}\n',
	}).to;
	const Fabs = MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of a floating point number', F, F,
	{
		js:'function %1(args)\n{\n	return Math.abs(args);\n}\n',
		cpp: '#include <math.h>\n\nvoid %1(const %2 & args, %3 & out)\n{\n	out = fabs(args);\n}\n',
	}).to;
	const Fpair = MakeObject(args, '', 'ProductObject', '', 'A pair of floating point numbers', {objects:[F, F]}).to;
	const Fadd = MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two floating point numbers', Fpair, F,
	{
		js:'function %1(args)\n{\n	return args[0] + args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] + args[1];\n}\n',
	}).to;
	const Fsubtract = MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two floating point numbers', Fpair, F,
	{
		js:'function %1(args)\n{\n	return args[0] - args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] - args[1];\n}\n',
	}).to;
	const Fmult = MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two floating point numbers', Fpair, F,
	{
		js:'function %1(args)\n{\n	return args[0] * args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] * args[1];\n}\n',
	}).to;
	const FplusOne = MakeObject(args, '', 'ProductObject', '', 'A floating point number or an exception', {objects:[F, one]}, {dual:true}).to;
	const Fdiv = MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two floating point numbers or an exception', Fpair, FplusOne,
	{
		js:
`function %1(args)
{
	if (args[1] === 0)
		return [1, 0];
	return [0, args[0] / args[1]];
}
`,
	}).to;
	const Fmodulus = MakeMorphism(args, 'modulus', 'Morphism', '%', 'The modulus of two floating point numbers or an exception', Fpair, FplusOne,
	{
		js:
`function %1(args)
{
	if (args[1] === 0)
		return [1, 0];
	return [0, args[0] % args[1]];
}
`,
	}).to;
	const Fless = MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first given floating point number less than the second', Fpair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] < args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] < args[1];\n}\n',
	}).to;
	const FlessEq = MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first floating point number less than or equal to the second', Fpair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] <= args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] <= args[1];\n}\n',
	}).to;
	const Fequals = MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two floating point numbers for equality', Fpair, omega,
	{
		js:'function %1(args)\n{\n	return args[0] === args[1];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = args[0] == args[1];\n}\n',
	}).to;
	const ceil = MakeMorphism(args, 'ceil', 'Morphism', 'ceil', 'The smallest integer greater than or equal to a given floating point number', F, Z,
	{
		js:'function %1(args)\n{\n	return Math.ceil(args);\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = ceil(args);\n}\n',
	}).to;
	const round = MakeMorphism(args, 'round', 'Morphism', 'round', 'The nearest integer to a given floating point number', F, Z,
	{
		js:'function %1(args)\n{\n	return Math.round(args);\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = round(args);\n}\n',
	}).to;
	const floor = MakeMorphism(args, 'floor', 'Morphism', 'floor', 'The greatest integer smaller than or equal to a given floating point number', F, Z,
	{
		js:'function %1(args)\n{\n	return Math.floor(args);\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = floor(args);\n}\n',
	}).to;
	const truncate = MakeMorphism(args, 'truncate', 'Morphism', 'trunc', 'The integer portion of a floating point number', F, Z,
	{
		js:'function %1(args)\n{\n	return Math.trunc(args);\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	out = trunc(args);\n}\n',
	}).to;
	const log = MakeMorphism(args, 'log', 'Morphism', 'log', 'the natural logarithm of a given floating point number or an exception', F, FplusOne,
	{
		js:
`function %1(args)
{
if (args <= 0.0)
	return [1, 0];
return [0, Math.log(args)];
}
`
	}).to;
	const Fpow = MakeMorphism(args, 'pow', 'Morphism', 'x&#x02b8;', 'raise the first number to the second number as exponent or an exception', Fpair, FplusOne,
	{
		js:
`function %1(args)
{
if (args[0] === 0 && args[1] === 0)
	return [1, 0];
return [0, Math.pow(args[0], args[1])];
}
`
	}).to;
	const Flist = MakeObject(args, '', 'HomObject', '', 'A list of floating point numbers', {objects:[N, F]}).to;
	const Fmax = MakeMorphism(args, 'max', 'Morphism', 'max', 'The maximum floating point number of the given list', Flist, F,
	{
		js:'function %1(args)\n{\n	return Math.max(...args);\n}\n',
		cpp:
`
void %1(const %2 & args, %3 & out)
{
	auto i = out;
	out = *std::max_element(args);
}
`,
	}).to;
	const Fmin = MakeMorphism(args, 'min', 'Morphism', 'min', 'The minimum floating point number of the given list', Flist, F,
	{
		js:'function %1(args)\n{\n	return Math.min(...args);\n}\n',
		cpp:
`
void %1(const %2 & args, %3 & out)
{
	auto i = out;
	out = *std::min_element(args);
}
`,
	}).to;
	DiagramReferences(user, floats, args.xy);
	Cat.D.ShowDiagram(floats);
	floats.home(false);
	floats.update();
	//
	// complex numbers
	//
	const complex = new Cat.Diagram(userDiagram,
	{
		description:	'complex artihmetic functions',
		codomain:		pfs,
		basename:		'complex',
		properName:		'&Copf; Arithmetic',
		references:		[floats],
		user,
	});
	args.diagram = complex;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	complex.makeSvg(false);
	Cat.R.AddDiagram(complex);
	Autoplace(complex,
	{
		description:	'A complex number is a pair of floating point numbers.',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const C = new Cat.NamedObject(complex, {basename:'C', properName:'&Copf;', source:Fpair});
	const C2Fpair = complex.placeMorphism(null, C.idFrom, args.xy, args.xy.add(Cat.D.default.stdArrow), false);
	args.rowCount++;
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const Cid2 = new Cat.DiagramMorphism(complex, {to:C.idTo, domain:C2Fpair.codomain, codomain:C2Fpair.domain});
	const Czero = MakeMorphism(args, 'zero', 'Morphism', '0.0', 'The complex number zero', one, C,
	{
		js:'function %1(args)\n{\n	return 0.0;\n}\n',
		cpp:
`
#include <complex>
#include <cmath>

typedef std::complex<double> complexDbl;

void %1(const %2 & args, %3 & out)
{
	out = std::complex(0.0);
}
`,
	}).to;
	const Ce = MakeMorphism(args, 'e', 'Morphism', 'e', 'Euler\'s constant', one, C,
	{
		js:'function %1(args)\n{\n	return [Math.E, 0];\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = std::complex(std::numbers::e_v);
}
`,
	}).to;
	const Creal = MakeMorphism(args, 'real', 'Morphism', 'real', 'the real part of a complex numbers', C, F,
	{
		js:'function %1(args)\n{\n	return args[0];\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args.real();
}
`,
	}).to;
	const Cimag = MakeMorphism(args, 'imag', 'Morphism', 'imag', 'the imaginary part of a complex numbers', C, F,
	{
		js:'function %1(args)\n{\n	return args[1];\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args.imag();
}
`,
	}).to;
	const F2C = MakeMorphism(args, 'F2C', 'Morphism', '&sub;', 'every floating point number is a complex number', F, C,
	{
		js:'function %1(args)\n{\n	return [args, 0];\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = std::complex(args);
}
`,
	}).to;
	const conjugate = MakeMorphism(args, 'conjugate', 'Morphism', '&dagger;', 'conjugate of a complex number', C, C,
	{
		js:'function %1(args)\n{\n	return [args[0], -args[1]];\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args.conj();
}
`,
	}).to;
	const Cabs = MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of a complex number', C, F,
	{
		js:'function %1(args)\n{\n	return Math.sqrt(args[0] * args[0] + args[1] * args[1]);\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args.abs();
}
`,
	}).to;
	const Cpair = MakeObject(args, '', 'ProductObject', '', 'A pair of complex numbers', {objects:[C, C]}).to;
	const Cadd = MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two complex numbers', Cpair, C,
	{
		js:'function %1(args)\n{\n	return [args[0][0] + args[1][0], args[0][1] + args[1][1]];\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args[0] + args[1];
}
`,
	}).to;
	const Csubtract = MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two complex numbers', Cpair, C,
	{
		js:'function %1(args)\n{\n	return [args[0][0] - args[1][0], args[0][1] - args[1][1]];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args[0] - args[1];
}
`,
	}).to;
	const Cmult = MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two complex numbers', Cpair, C,
	{
		js:'function %1(args)\n{\n	return [args[0][0] * args[1][0] - args[0][1] * args[1][1], args[0][0] * args[1][1] + args[0][1] * args[1][0]];\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args[0] * args[1];
}
`,
	}).to;
	const CplusOne = MakeObject(args, '', 'ProductObject', '', 'A complex number or an exception', {objects:[C, one]}, {dual:true}).to;
	const Cdiv = MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two complex numbers or an exception', Cpair, CplusOne,
	{
		js:
`function %1(args)
{
const x = args[1][0];
const y = args[1][1];
const n = x * x + y * y;
if (n === 0.0)
	return [1, [0, 0]];		// exception
return [0, [(args[0][0] * x + args[0][1] * y) / n, (args[0][0] * y - args[0][1] * x) / n]];
}
`,
		cpp:
`void %1(const %2 & args, %3 & out)
{
	if (args[1] != 0)
	{
		out[0] = 0;
		out[1] = args[0] / args[1];
	}
	e;se
	{
		out[0] = 1;
		out[1] = 1;
	}
}
`,
	}).to;
	const Cpow = MakeMorphism(args, 'pow', 'Morphism', 'x&#x02b8;', 'raise the first number to the second number as exponent or an exception', Cpair, CplusOne,
	{
		js:
`function %1(args)
{
if (args[0] === 0 && args[1] === 0)
	return [1, 0];
return [0, Math.pow(args[0], args[1])];
}
`
	}).to;
	const Clist = MakeObject(args, '', 'HomObject', '', 'A list of complex numbers', {objects:[N, C]}).to;
	DiagramReferences(user, complex, args.xy);
	Cat.D.ShowDiagram(complex);
	complex.home(false);
	complex.update();

	//
	// Strings
	//
	const strings = new Cat.Diagram(userDiagram,
	{
		description:	'functions for strings',
		codomain:		pfs,
		basename:		'Strings',
		properName:		'Strings',
		references:		[floats],
		user,
	});
	args.diagram = strings;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	strings.makeSvg(false);
	Cat.R.AddDiagram(strings);
	Autoplace(strings,
	{
		description:	'Basic morphisms for strings are given here as well as\nvarious conversion functions from and to basic types',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const str = MakeObject(args, 'str', 'CatObject', 'Str', 'the space of all strings').to;
	const strPair = MakeObject(args, '', 'ProductObject', '', 'A pair of strings', {objects:[str, str]}).to;
	const strPlusOne = MakeObject(args, '', 'ProductObject', '', 'A string or an exception', {objects:[str, one], dual:true}).to;
	const emptyString = new Cat.DataMorphism(strings, {domain:one, codomain:str, data:[[0, '']]});
	PlaceMorphism(args, emptyString);
	const strLength = MakeMorphism(args, 'length', 'Morphism', '#', 'length of a string', str, N,
	{
		js:'function %1(args)\n{\n	return args.length;\n}\n',
		cpp:
`
#include <string>

void %1(const %2 & args, %3 & out)
{
	out = args.length;
}`,
	}).to;
	const strAppend = MakeMorphism(args, 'append', 'Morphism', '&bull;', 'append two strings', strPair, str,
	{
		js:'function %1(args)\n{\n	return args[0].concat(args[1]);\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args[0] + args[1];
}`,
	}).to;
	const strIncludes = MakeMorphism(args, 'includes', 'Morphism', 'includes', 'is the first string included in the second', strPair, omega,
	{
		js:'function %1(args)\n{\n	return args[1].includes(args[0]);\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = args[0].find(args[1]) != std::string::npos;
}`,
	}).to;
	const strIndexOf = MakeMorphism(args, 'indexOf', 'Morphism', '@', 'where in the first string is the second', strPair, NplusOne,
	{
		js:
`
function %1(args)
{
	const i = args[0].indexOf(args[1]);
	return i > -1 ? [0, i] : [1, 1]
}
`,
		cpp:
`void %1(const %2 & args, %3 & out)
{
	auto i = args[0].find(args[1]);
	if (i != std::string::npos)
	{
		out.idx = 0;
		out.value = i;
	}
	else
	{
		out.idx = 1;
		out.value = true;
	}
}
`,
	}).to;
	const strList = MakeObject(args, '', 'HomObject', '', 'A list of strings', {objects:[N, str]}).to;
	const strListStr = new Cat.ProductObject(strings, {objects:[strList, str]});
	const strJoin = MakeMorphism(args, 'join', 'Morphism', 'join', 'join a list of strings into a single string with another string as the conjunction', strListStr, str,
	{
		js:'// function %1(args)\n{\n	TODO\n}\n',
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	// TODO
}
`,
	}).to;
	const strN = new Cat.ProductObject(strings, {objects:[str, N]});
	const strCharAt = MakeMorphism(args, 'charAt', 'Morphism', '@', 'the n\'th character in the string', strN, str,
	{
		js:'function %1(args)\n{\n	return args[0].charAt(args[1]);\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = std::string(args[0][args[1]]);
}
`,
	}).to;
	const FromN2str = MakeMorphism(args, 'N2str', 'Morphism', '&lsquo;&rsquo;', 'convert a natural number to a string', N, str,
	{
		js:'function %1(args)\n{\n	return args.toString();\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = std::to_string(args);
}
`,
	});
	const N2str = FromN2str.to;
//	const str2N = MakeMorphism(args, 'str2N', 'Morphism', '&lsquo;&rsquo;', 'convert a string to a natural number', str, NplusOne,
	const str2N = placeMorphismByObject(args, 'str2N', 'Morphism', '&lsquo;&rsquo;', 'convert a string to a natural number', str, NplusOne,
	{
		js:
`
function %1(args)
{
	return args.toString();
}
`,
		cpp:
`void %1(const %2 & args, %3 & out)
{
	try
	{
		out.value = std::stoul(args);
		out.idx = 0;
	}
	catch(x)
	{
		out.idx = 1;
		out.value = true;
	}
}
`,
	}, 'domain', FromN2str.codomain);

	const FromZ2str = MakeMorphism(args, 'Z2str', 'Morphism', '&lsquo;&rsquo;', 'convert an integer to a string', Z, str,
	{
		js:'function %1(args)\n{\n	return args.toString();\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = std::to_string(args);
}
`,
	});
	const Z2str = FromZ2str.to;

	const str2Z = placeMorphismByObject(args, 'str2Z', 'Morphism', '&lsquo;&rsquo;', 'convert a string to an integer', str, ZplusOne,
	{
		js:
`
function %1(args)
{
	return args.toString();
}
`,
		cpp:
`void %1(const %2 & args, %3 & out)
{
	try
	{
		out.value = std::stol(args);
		out.idx = 0;
	}
	catch(x)
	{
		out.idx = 1;
		out.value = true;
	}
}
`,
	}, 'domain', FromZ2str.codomain);

	const F2str = MakeMorphism(args, 'F2str', 'Morphism', '&lsquo;&rsquo;', 'convert a floating point number to a string', F, str,
	{
		js:'function %1(args)\n{\n	return args.toString();\n}\n',
		cpp:
`void %1(const %2 & args, %3 & out)
{
	out = std::to_string(args);
}
`,
	}).to;
	const str2tty = MakeMorphism(args, 'str2tty', 'Morphism', '&#120451;&#120451;&#120456;', 'emit the string to the TTY', str, tty,
	{
		js:
`
function %1(args)
{
	postMessage(['str2tty', args]);
}
`,
	}).to;
	DiagramReferences(user, strings, args.xy);
	Cat.D.ShowDiagram(strings);
	strings.home(false);
	strings.update();
	//
	// htmlDiagram
	//
	const htmlDiagram = new Cat.Diagram(userDiagram,
	{
		codomain:		pfs,
		basename:		'HTML',
		properName:		'HTML',
		description:	'Basic HTML input and output',
		references:		[strings],
		user,
	});
	args.diagram = htmlDiagram;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	htmlDiagram.makeSvg(false);
	Cat.R.AddDiagram(htmlDiagram);
	Autoplace(htmlDiagram,
	{
		description:	'Various HTML input and output morphisms are found here',
		prototype:		'DiagramText',
		user,
		properName:		'&Omega;',
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const html = MakeObject(args, 'HTML', 'FiniteObject', 'HTML', 'The HTML object intereacts with web devices').to;
	const html2N = MakeMorphism(args, 'html2N', 'Morphism', 'input', 'read a natural number from an HTML input tag', html, N,
	
	{
		js:
`
function %1(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	return r;
}
`,
		
	}).to;
	const html2Z = MakeMorphism(args, 'html2Z', 'Morphism', 'input', 'read an integer from an HTML input tag', html, Z,
	
	{
		js:`function %1(args)\n{\n	return Number.parseInt(document.getElementById(args).value);\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
	const html2F = MakeMorphism(args, 'html2F', 'Morphism', 'input', 'read a floating point number from an HTML input tag', html, F,
	
	{
		js:`function %1(args)\n{\n	return Number.parseFloat(document.getElementById(args).value);\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
	const html2Str = MakeMorphism(args, 'html2Str', 'Morphism', 'input', 'read a string from an HTML input tag', html, str,
	
	{
		js:`function %1(args)\n{\n	return document.getElementById(args).value;\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
//TODO	const html2omega = MakeMorphism(args, 'html2omega', 'Morphism', 'input', 'HTML input for truth values', html, two).to;
	const N_html2str = htmlDiagram.get('LambdaMorphism', {preCurry:html2Str, domFactors:[], homFactors:[0]});
	PlaceMorphism(args, N_html2str);
	const strXN_html2str = htmlDiagram.get('ProductObject', {objects:[str, N_html2str.codomain]});
	const html2line = MakeMorphism(args, 'html2line', 'Morphism', 'line', 'Input a line of text from HTML', html, strXN_html2str,
	
	{
		js:`function %1(args)\n{\n	return ['<input type="text" id="' + args + '" value="" placeholder="Text"/>', ${Cat.U.Token(N_html2str)}]\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
	const N_html2N = htmlDiagram.get('LambdaMorphism', {preCurry:html2N, domFactors:[], homFactors:[0]});
	PlaceMorphism(args, N_html2N);
	const strXN_html2N = htmlDiagram.get('ProductObject', {objects:[str, N_html2N.codomain]});
	const html2Nat = MakeMorphism(args, 'html2Nat', 'Morphism', '&Nopf;', 'Input a natural number from HTML', html, strXN_html2N,
	
	{
		js:`function %1(args)\n{\n	return ['<input type="number" min="0" id="' + args + '" placeholder="Natural number"/>', ${Cat.U.Token(N_html2N)}];\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
	const N_html2Z = htmlDiagram.get('LambdaMorphism', {preCurry:html2Z, domFactors:[], homFactors:[0]});
	PlaceMorphism(args, N_html2Z);
	const strXN_html2Z = htmlDiagram.get('ProductObject', {objects:[str, N_html2Z.codomain]});
	const html2Int = MakeMorphism(args, 'html2Int', 'Morphism', '&Zopf;', 'Input an integer from HTML', html, strXN_html2Z,
	
	{
		js:`function %1(args)\n{\n	return ['<input type="number" id="' + args + '" value="0" placeholder="Integer"/>', ${Cat.U.Token(N_html2Z)}];\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
	const N_html2F = htmlDiagram.get('LambdaMorphism', {preCurry:html2F, domFactors:[], homFactors:[0]});
	PlaceMorphism(args, N_html2F);
	const strXN_html2F = htmlDiagram.get('ProductObject', {objects:[str, N_html2F.codomain]});
	const html2Float = MakeMorphism(args, 'html2Float', 'Morphism', '&Fopf;', 'Input a floating point number from the HTML input tag', html, strXN_html2F,
	
	{
		js:`function %1(args)\n{\n	return ['<input type="number" id="' + args + '" placeholder="Float"/>', ${Cat.U.Token(N_html2F)}];\n}\n`,
		cpp: 'void %1(const %2 & args, %3 & out)\n{\n	\n}\n',
	}).to;
	DiagramReferences(user, htmlDiagram, args.xy);
	Cat.D.ShowDiagram(htmlDiagram);
	htmlDiagram.home(false);
	htmlDiagram.update();
	//
	// 3D diagram
	//
	const threeD = new Cat.Diagram(userDiagram,
	{
		codomain:		pfs,
		basename:		'threeD',
		properName:		'3D',
		description:	'Three dimensional object and morphisms',
		references:		[strings],
		user,
	});
	args.diagram = threeD;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	threeD.makeSvg(false);
	Cat.R.AddDiagram(threeD);
	Autoplace(threeD,
	{
		description:	'Various 3-D morphisms are found here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const d3 = MakeObject(args, 'threeD', 'FiniteObject', '3D', 'The 3D object interacts with graphic devices').to;
	const f2d3 = MakeMorphism(args, 'f2d3', 'Morphism', '1D', 'visualize a number in 3D', F, d3,
	{
		js:
`
function %1(args)
{
	postMessage(['f2d3', args]);
}
`
	});
	const ff2d3 = MakeMorphism(args, 'ff2d3', 'Morphism', '2D', 'visualize a pair of numbers in 3D', Fpair, d3,
	{
		js:
`
function %1(args)
{
	postMessage(['ff2d3', args]);
}
`
	});
	const Ftrip = threeD.get('ProductObject', {objects:[F, F, F]});
	const f3 = new Cat.NamedObject(threeD, {basename:'F3', properName:'&Fopf;&sup3', source:Ftrip});
	const f3toFtrip = threeD.placeMorphism(null, f3.idFrom, args.xy, args.xy.add(Cat.D.default.stdArrow), false);
	args.rowCount++;
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const ftripTof3 = new Cat.DiagramMorphism(threeD, {to:f3.idTo, domain:f3toFtrip.codomain, codomain:f3toFtrip.domain});
	const fff2d3 = MakeMorphism(args, 'fff2d3', 'Morphism', '3D', 'visualize a triplet of numbers in 3D', f3, d3,
	{
		js:
`
function %1(args)
{
postMessage(['fff2d3', args]);
}
`
	});
	const Ftrip2 = threeD.get('ProductObject', {objects:[f3, f3]});
	const fff2toline = MakeMorphism(args, 'fff2toLine', 'Morphism', 'Line', 'visualize two points as a line in 3D', Ftrip2, d3,
	{
		js:
`
function %1(args)
{
postMessage(['fff2toLine', args]);
}
`
	});
	const Ftrip3 = threeD.get('ProductObject', {objects:[f3, f3, f3]});
	const AxAxAToQuadraticBezierCurve3= MakeMorphism(args, 'fff2toQB3', 'Morphism', '1D', 'visualize three points as a Bezier curbe in 3D', Ftrip3, d3,
	{
		js:
`
function %1(args)
{
postMessage(['fff2toQB3', args]);
}
`
	});
	DiagramReferences(user, threeD, args.xy);
	Cat.D.ShowDiagram(threeD);
	threeD.home(false);
	threeD.update();
	/*
	//
	// quantum cat
	//
	const qCat = new Category(R.$CAT,
		{
			basename:'Qu',
			user,
			properName:'&Qopf;&uopf;',
			actionDiagrams:	['tensor'],
		});
		*/
	//
	// quantum gates
	//
	const qGates = new Cat.Diagram(userDiagram,
	{
		codomain:		pfs,
		basename:		'gates',
		properName:		'Gates',
		description:	'Quantum gates',
		user,
	});
	args.diagram = qGates;
	args.rowCount = 0;
	args.xy = new Cat.D2(300, 300);
	qGates.makeSvg(false);
	Cat.R.AddDiagram(qGates);
	Autoplace(qGates,
	{
		description:	'Basic quantum gates are given here.',
		prototype:		'DiagramText',
		user,
	}, args.xy);
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const qubit = MakeObject(args, 'q', 'CatObject', '&Qopf;', 'The quantum qubit').to;
	const qPair = MakeObject(args, '', 'TensorObject', '', 'A pair of qubits', {objects:[qubit, qubit]}).to;
	const qId = MakeMorphism(args, 'id', 'Identity', 'id', 'identity', qubit, qubit,
	{
		js:
`
const oSqrt2 = 1/Math.SQRT2;
function matrix_multiply(m1, m2)
{
let result = [];
for (let i=0; i<m1.length; i++)
{
	result[i] = [];
	for (let j=0; j<m2[0].length; j++)
	{
		let sum = 0;
		for (let k=0; k<m1[0].length; k++)
			sum += m1[i][k] * m2[k][j];
		result[i][j] = sum;
	}
}
return result;
}
%1_matrix = [	[[1, 0], [0, 0]],
			[[0, 0], [1, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
	});
	const basis0 = MakeMorphism(args, 'basis0', 'Morphism', '&VerticalBar;0&RightAngleBracket;', 'the 0 basis vector', one, qubit,
	{
		js:
`
function %1(args)
{
return [1, [0, 0]];
}
`
	});
	const pauliX = MakeMorphism(args, 'X', 'Morphism', 'X', 'Pauli-X gate', qubit, qubit,
	{
		js:
`
%1_matrix = [	[[0, 0],	[1, 0]],
			[[1, 0],	[0, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
	});
	const pauliY = MakeMorphism(args, 'Y', 'Morphism', 'Y', 'Pauli-Y gate', qubit, qubit,
	{
		js:
`
%1_matrix = [	[[0, 0],	[0, -1]],
			[[0, 1],	[0, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
	});
	const pauliZ = MakeMorphism(args, 'Z', 'Morphism', 'Z', 'Pauli-Z gate', qubit, qubit,
	{
		js:
`
%1_matrix = [	[[1, 0],	[0, 0]],
			[[0, 0],	[-1, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
	});
	const hademard = MakeMorphism(args, 'H', 'Morphism', 'H', 'hademard gate', qubit, qubit,
	{
		js:
`
%1_matrix = [	[[oSqrt2, 0],	[oSqrt2, 0]],
			[[oSqrt2, 0],	[-oSqrt2, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
	});
	Cat.D.ShowDiagram(qGates);
	qGates.home(false);
	qGates.update();
	Cat.D.ShowDiagram(qGates);
	fn && Cat.R.Actions.javascript.loadHTML(fn);

	window.addEventListener('Login', function(e)
	{
		const diagrams = [basics, logic, Narith, integers, floats, complex, strings, htmlDiagram, threeD, qGates];
//		diagrams.map(d => d.upload(null));
	});
}
