// (C) 2020 Harry Dole
// Catecon:  The Categorical Console
//
'use strict';

const Boot = function(fn)
{
	const user = 'hdole';
	const side = Cat.D.Grid(new Cat.D2(0, 4 * Cat.D.default.layoutGrid));
	const pfs = Cat.R.$CAT.getElement('PFS');
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
	Cat.R.Autoplace(basics,
	{
		description:	'This diagram contains initial and terminal objects\nas well as objects for interacting with the real world.\nIn other words, device drivers',
		prototype:		'DiagramText',
		user,
	}, args.xy);
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const zero = Cat.InitialObject.Get(basics);	// creates if need be
	const one = Cat.TerminalObject.Get(basics);	// creates if need be
	Cat.R.PlaceObject(args, zero);
	Cat.R.PlaceObject(args, one);
	const tty = Cat.R.MakeObject(args, 'TTY', 'FiniteObject', 'TTY', 'The TTY object interacts with serial devices').to;
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
	Cat.R.Autoplace(logic,
	{
		description:	'This diagram contains typical logic objects and morphisms',
		prototype:		'DiagramText',
		user,
		properName:		'&Omega;',
	}, args.xy);
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const two = Cat.ProductObject.Get(logic, [one, one], true);
	const omega = new Cat.NamedObject(logic, {basename:'Omega', properName:'&Omega;', source:two});
	const omega2twoId = logic.placeMorphism(null, omega.idFrom, args.xy, args.xy.add(Cat.D.default.stdArrow), false);
	args.rowCount++;
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const id2 = new Cat.DiagramMorphism(logic, {to:omega.idTo, domain:omega2twoId.codomain, codomain:omega2twoId.domain});
	logic.addSVG(id2);
	const omegaPair = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of 2\'s', {objects:[omega, omega]}).to;
const foo = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of too-toos\'s', {objects:[omegaPair, omegaPair]}).to;
const goo = Cat.FactorMorphism.Codomain(logic, foo, [[0, 0], [0, 1], [1, 0], [1, 1]], false, [[0, 0], [0, 1], [0, 2], [1]]);
//debugger;

	const mTrue = Cat.R.MakeMorphism(args, 'true', 'Morphism', '&#8868;', 'The truth value known as true', one, omega, {js:'return true;'}).to;
	const mFalse = Cat.R.MakeMorphism(args, 'false', 'Morphism', '&perp;', 'The truth value known as false', one, omega, {js:'return false;'}).to;
	const logicNot = Cat.R.MakeMorphism(args, 'not', 'Morphism', '&not;', 'The negation of a logic value', omega, omega, {js:'return !args;'}).to;
	const logicAnd = Cat.R.MakeMorphism(args, 'and', 'Morphism', '&and;', 'The logical and of two logic values', omegaPair, omega, {js:'return args[0] && args[1];'}).to;
	const logicOr = Cat.R.MakeMorphism(args, 'or', 'Morphism', '&or;', 'The logical or of two logic values', omegaPair, omega, {js:'return args[0] || args[1];'}).to;
	Cat.R.DiagramReferences(user, logic, args.xy);
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
	Cat.R.Autoplace(Narith,
	{
		description:	'Basic morphisms for natural numbers are given here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const N = Cat.R.MakeObject(args, 'N', 'CatObject', '<tspan class="bold">&Nopf;</tspan>', 'The natural numbers').to;
	const Nzero = Cat.R.MakeMorphism(args, 'zero', 'Morphism', '0', 'The first interesting natural number', one, N, {js:'return 0;'}).to;
	const None = Cat.R.MakeMorphism(args, 'one', 'Morphism', '1', 'The natural number one', one, N, {js:'return 1;'}).to;
	const Ninfinity = Cat.R.MakeMorphism(args, 'infinity', 'Morphism', '&infin;', 'The maximum safe natural number', one, N, {js:'return Number.MAX_SAFE_INTEGER;'}).to;
	const Npair = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of natural numbers', {objects:[N, N]}).to;
	const Nadd = Cat.R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two natural numbers', Npair, N, {js:'return args[0] + args[1];'}).to;
	const Nmult = Cat.R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two natural numbers', Npair, N, {js:'return args[0] * args[1];'}).to;
	const Nsucc = Cat.R.MakeMorphism(args, 'successor', 'Morphism', 'succ', 'The successor function for the natural numbers', N, N, {js:'return args + 1;'}).to;
	const Ndecr = Cat.R.MakeMorphism(args, 'decrement', 'Morphism', 'decr', 'The decrement function for the natural numbers', N, N, {js:'return args > 0 ? args - 1 : 0;'}).to;
	const Nless = Cat.R.MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first natural number less than the second', Npair, omega, {js:'return args[0] < args[1];'}).to;
	const NlessEq = Cat.R.MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first natural number less than or equal to the second', Npair, omega, {js:'return args[0] <= args[1];'}).to;
	const Nequals = Cat.R.MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two natural numbers for equality', Npair, omega, {js:'return args[0] === args[1];'}).to;
	Cat.R.DiagramReferences(user, Narith, args.xy);
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
	Cat.R.Autoplace(integers,
	{
		description:	'Basic morphisms for the integers are given here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const Z = Cat.R.MakeObject(args, 'Z', 'CatObject', '<tspan class="bold">&Zopf;</tspan>', 'The integers').to;
	const N2Z = Cat.R.MakeMorphism(args, 'N2Z', 'Morphism', '&sub;', 'every natural number is an integer', N, Z, {js:'return args;'}).to;
	const Zabs = Cat.R.MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of an integer is a natural number', Z, N, {js:'return Math.abs(args);'}).to;
	const Zzero = Cat.R.MakeMorphism(args, 'zero', 'Morphism', '&lsquo;0&rsquo;', 'The integer zero', one, Z, {js:'return 0;'}).to;
	const ZminusOne = Cat.R.MakeMorphism(args, 'minusOne', 'Morphism', '&lsquo;-1&rsquo;', 'The first interesting integer: minus one', one, Z, {js:'return -1;'}).to;
	const Zpair = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of integers', {objects:[Z, Z]}).to;
	const Zadd = Cat.R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two integers', Zpair, Z, {js:'return args[0] + args[1];'}).to;
	const Zsubtract = Cat.R.MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two integers', Zpair, Z, {js:'return args[0] - args[1];'}).to;
	const Zmult = Cat.R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two integers', Zpair, Z, {js:'return args[0] * args[1];'}).to;
	const ZplusOne = Cat.R.MakeObject(args, '', 'ProductObject', '', 'An integer or an exception', {objects:[Z, one]}, {dual:true}).to;
	const Zdiv = Cat.R.MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two integers or an exception', Zpair, ZplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args[1] === 0)
	return [1, 0];
return [0, args[0] / args[1]];
}
`			},
	}).to;
	const Zsucc = Cat.R.MakeMorphism(args, 'successor', 'Morphism', 'succ', 'The successor function for the integers', Z, Z, {js:'return args + 1;'});
	const Zmodulus = Cat.R.MakeMorphism(args, 'modulus', 'Morphism', '%', 'The modulus of two integers or an exception', Zpair, ZplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args[1] === 0)
	return [1, 0];
return [0, args[0] % args[1]];
}
`			},
	});
	const Zless = Cat.R.MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first given integer number less than the second', Zpair, omega, {js:'return args[0] < args[1];'});
	const ZlessEq = Cat.R.MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first integer less than or equal to the second', Zpair, omega, {js:'return args[0] <= args[1];'});
	const Zequals = Cat.R.MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two integers for equality', Zpair, omega, {js:'return args[0] === args[1];'});
	Cat.R.DiagramReferences(user, integers, args.xy);
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
	Cat.R.Autoplace(floats,
	{
		description:	'Basic floating point morphisms are given here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const F = Cat.R.MakeObject(args, 'F', 'CatObject', '&Fopf;', 'Floating point numbers').to;
	const Fzero = Cat.R.MakeMorphism(args, 'zero', 'Morphism', '0.0', 'The floating point zero', one, F, {js:'return 0.0;'}).to;
	const Fe = Cat.R.MakeMorphism(args, 'e', 'Morphism', 'e', 'Euler\'s constant', one, F, {js:'return Math.E;'}).to;
	const Frandom = Cat.R.MakeMorphism(args, 'random', 'Morphism', '?', 'a random number between 0.0 and 1.0', one, F, {js:'return Math.random();'}).to;
	const Fnl10 = Cat.R.MakeMorphism(args, 'pi', 'Morphism', '&pi;', 'ratio of a circle\'s circumference to its diameter', one, F, {js:'return Math.PI;'}).to;
	const Z2F = Cat.R.MakeMorphism(args, 'Z2F', 'Morphism', '&sub;', 'every integer is (sort of) a floating point number', Z, F, {js:'return args;'}).to;
	const Fabs = Cat.R.MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of a floating point number', F, F, {js:'return Math.abs(args);'}).to;
	const Fpair = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of floating point numbers', {objects:[F, F]}).to;
	const Fadd = Cat.R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two floating point numbers', Fpair, F, {js:'return args[0] + args[1];'}).to;
	const Fsubtract = Cat.R.MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two floating point numbers', Fpair, F, {js:'return args[0] - args[1];'}).to;
	const Fmult = Cat.R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two floating point numbers', Fpair, F, {js:'return args[0] * args[1];'}).to;
	const FplusOne = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A floating point number or an exception', {objects:[F, one]}, {dual:true}).to;
	const Fdiv = Cat.R.MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two floating point numbers or an exception', Fpair, FplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args[1] === 0)
	return [1, 0];
return [0, args[0] / args[1]];
}
`			},
	}).to;
	const Fmodulus = Cat.R.MakeMorphism(args, 'modulus', 'Morphism', '%', 'The modulus of two floating point numbers or an exception', Fpair, FplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args[1] === 0)
	return [1, 0];
return [0, args[0] % args[1]];
}
`			},
	}).to;
	const Fless = Cat.R.MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first given floating point number less than the second', Fpair, omega, {js:'return args[0] < args[1];'}).to;
	const FlessEq = Cat.R.MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first floating point number less than or equal to the second', Fpair, omega, {js:'return args[0] <= args[1];'}).to;
	const Fequals = Cat.R.MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two floating point numbers for equality', Fpair, omega, {js:'return args[0] === args[1];'}).to;
	const ceil = Cat.R.MakeMorphism(args, 'ceil', 'Morphism', 'ceil', 'The smallest integer greater than or equal to a given floating point number', F, Z, {js:'return Math.ceil(args);'}).to;
	const round = Cat.R.MakeMorphism(args, 'round', 'Morphism', 'round', 'The nearest integer to a given floating point number', F, Z, {js:'return Math.round(args);'}).to;
	const floor = Cat.R.MakeMorphism(args, 'floor', 'Morphism', 'floor', 'The greatest integer smaller than or equal to a given floating point number', F, Z, {js:'return Math.floor(args);'}).to;
	const truncate = Cat.R.MakeMorphism(args, 'truncate', 'Morphism', 'trunc', 'The integer portion of a floating point number', F, Z, {js:'return Math.trunc(args);'}).to;
	const log = Cat.R.MakeMorphism(args, 'log', 'Morphism', 'log', 'the natural logarithm of a given floating point number or an exception', F, FplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args <= 0.0)
	return [1, 0];
return [0, Math.log(args)];
}
`
		},
	}).to;
	const Fpow = Cat.R.MakeMorphism(args, 'pow', 'Morphism', 'x&#x02b8;', 'raise the first number to the second number as exponent or an exception', Fpair, FplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args[0] === 0 && args[1] === 0)
	return [1, 0];
return [0, Math.pow(args[0], args[1])];
}
`
		},
	}).to;
	const Flist = Cat.R.MakeObject(args, '', 'HomObject', '', 'A list of floating point numbers', {objects:[N, F]}).to;
	const Fmax = Cat.R.MakeMorphism(args, 'max', 'Morphism', 'max', 'The maximum floating point number of the given list', Flist, F, {js:'return Math.max(...args);'}).to;
	const Fmin = Cat.R.MakeMorphism(args, 'min', 'Morphism', 'min', 'The minimum floating point number of the given list', Flist, F, {js:'return Math.min(...args);'}).to;
	Cat.R.DiagramReferences(user, floats, args.xy);
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
	Cat.R.Autoplace(complex,
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
	const Czero = Cat.R.MakeMorphism(args, 'zero', 'Morphism', '0.0', 'The complex number zero', one, C, {js:'return 0.0;'}).to;
	const Ce = Cat.R.MakeMorphism(args, 'e', 'Morphism', 'e', 'Euler\'s constant', one, C, {js:'return [Math.E, 0];'}).to;
	const Creal = Cat.R.MakeMorphism(args, 'real', 'Morphism', 'real', 'the real part of a complex numbers', C, F, {js:'return args[0];'}).to;
	const Cimag = Cat.R.MakeMorphism(args, 'imag', 'Morphism', 'imag', 'the imaginary part of a complex numbers', C, F, {js:'return args[1];'}).to;
	const F2C = Cat.R.MakeMorphism(args, 'F2C', 'Morphism', '&sub;', 'every floating point number is a complex number', F, C, {js:'return [args, 0];'}).to;
	const conjugate = Cat.R.MakeMorphism(args, 'conjugate', 'Morphism', '&dagger;', 'conjugate of a complex number', C, C, {js:'return [args[0], -args[1]];'}).to;
	const Cabs = Cat.R.MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of a complex number', C, F, {js:'return Math.sqrt(args[0] * args[0] + args[1] * args[1]);'}).to;
	const Cpair = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of complex numbers', {objects:[C, C]}).to;
	const Cadd = Cat.R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two complex numbers', Cpair, C, {js:'return [args[0][0] + args[1][0], args[0][1] + args[1][1]];'}).to;
	const Csubtract = Cat.R.MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two complex numbers', Cpair, C, {js:'return [args[0][0] - args[1][0], args[0][1] - args[1][1]];'}).to;
	const Cmult = Cat.R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two complex numbers', Cpair, C,
		{js:'return [args[0][0] * args[1][0] - args[0][1] * args[1][1], args[0][0] * args[1][1] + args[0][1] * args[1][0]];'}).to;
	const CplusOne = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A complex number or an exception', {objects:[C, one]}, {dual:true}).to;
	const Cdiv = Cat.R.MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two complex numbers or an exception', Cpair, CplusOne,
	{
		code:			{javascript:
`function %1(args)
{
const x = args[1][0];
const y = args[1][1];
const n = x * x + y * y;
if (n === 0.0)
	return [1, [0, 0]];		// exception
return [0, [(args[0][0] * x + args[0][1] * y) / n, (args[0][0] * y - args[0][1] * x) / n]];
}
`			},
	}).to;
	const Cpow = Cat.R.MakeMorphism(args, 'pow', 'Morphism', 'x&#x02b8;', 'raise the first number to the second number as exponent or an exception', Cpair, CplusOne,
	{
		code:			{javascript:
`function %1(args)
{
if (args[0] === 0 && args[1] === 0)
	return [1, 0];
return [0, Math.pow(args[0], args[1])];
}
`
		},
	}).to;
	const Clist = Cat.R.MakeObject(args, '', 'HomObject', '', 'A list of complex numbers', {objects:[N, C]}).to;
	Cat.R.DiagramReferences(user, complex, args.xy);
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
	Cat.R.Autoplace(strings,
	{
		description:	'Basic morphisms for strings are given here as well as\nvarious conversion functions from and to basic types',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const str = Cat.R.MakeObject(args, 'str', 'CatObject', 'Str', 'the space of all strings').to;
	const strPair = Cat.R.MakeObject(args, '', 'ProductObject', '', 'A pair of strings', {objects:[str, str]}).to;
	const emptyString = new Cat.DataMorphism(strings, {domain:one, codomain:str, data:[[0, '']]});
	Cat.R.PlaceMorphism(args, emptyString);
	const strLength = Cat.R.MakeMorphism(args, 'length', 'Morphism', '#', 'length of a string', str, N, {js:'return args.length;'}).to;
	const strAppend = Cat.R.MakeMorphism(args, 'append', 'Morphism', '&bull;', 'append two strings', strPair, str, {js:'return args[0].concat(args[1]);'}).to;
	const strIncludes = Cat.R.MakeMorphism(args, 'includes', 'Morphism', 'includes', 'is the first string included in the second', strPair, omega, {js:'return args[1].includes(args[0]);'}).to;
	const strIndexOf = Cat.R.MakeMorphism(args, 'indexOf', 'Morphism', '@', 'where in the first string is the second', strPair, Z, {js:'return args[0].indexOf(args[1]);'}).to;
	const strList = Cat.R.MakeObject(args, '', 'HomObject', '', 'A list of strings', {objects:[N, str]}).to;
	const strListStr = new Cat.ProductObject(strings, {objects:[strList, str]});
	const strJoin = Cat.R.MakeMorphism(args, 'join', 'Morphism', 'join', 'join a list of strings into a single string with another string as the conjunction', strListStr, str, {js:'// TODO'}).to;
	const strN = new Cat.ProductObject(strings, {objects:[str, N]});
	const strCharAt = Cat.R.MakeMorphism(args, 'charAt', 'Morphism', '@', 'the n\'th character in the string', strN, str, {js:'return args[0].charAt(args[1]);'}).to;
	const N2str = Cat.R.MakeMorphism(args, 'N2str', 'Morphism', '&lsquo;&rsquo;', 'convert a natural number to a string', N, str, {js:'return args.toString();'}).to;
	const Z2str = Cat.R.MakeMorphism(args, 'Z2str', 'Morphism', '&lsquo;&rsquo;', 'convert an integer to a string', Z, str, {js:'return args.toString();'}).to;
	const F2str = Cat.R.MakeMorphism(args, 'F2str', 'Morphism', '&lsquo;&rsquo;', 'convert a floating point number to a string', F, str, {js:'return args.toString();'}).to;
	const str2tty = Cat.R.MakeMorphism(args, 'str2tty', 'Morphism', '&#120451;&#120451;&#120456;', 'emit the string to the TTY', str, tty,
	{
		code:			{javascript:
`
function %1(args)
{
postMessage(['str2tty', args]);
}
`			},
	}).to;
	Cat.R.DiagramReferences(user, strings, args.xy);
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
	Cat.R.Autoplace(htmlDiagram,
	{
		description:	'Various HTML input and output morphisms are found here',
		prototype:		'DiagramText',
		user,
		properName:		'&Omega;',
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const html = Cat.R.MakeObject(args, 'HTML', 'FiniteObject', 'HTML', 'The HTML object intereacts with web devices').to;
	const html2N = Cat.R.MakeMorphism(args, 'html2N', 'Morphism', 'input', 'read a natural number from an HTML input tag', html, N,
		{js:
`const v = document.getElementById(args).value;
if (v === '')
	throw 'no input';
const r = Number.parseInt(v);
return r;
`,
		}).to;
	const html2Z = Cat.R.MakeMorphism(args, 'html2Z', 'Morphism', 'input', 'read an integer from an HTML input tag', html, Z,
		{js:`return Number.parseInt(document.getElementById(args).value);`}).to;
	const html2F = Cat.R.MakeMorphism(args, 'html2F', 'Morphism', 'input', 'read a floating point number from an HTML input tag', html, F,
		{js:`return Number.parseFloat(document.getElementById(args).value);`}).to;
	const html2Str = Cat.R.MakeMorphism(args, 'html2Str', 'Morphism', 'input', 'read a string from an HTML input tag', html, str,
		{js:`return document.getElementById(args).value;`}).to;
	const html2omega = Cat.R.MakeMorphism(args, 'html2omega', 'Morphism', 'input', 'HTML input for truth values', html, two).to;
	const N_html2str = Cat.LambdaMorphism.Get(args.diagram, html2Str, [], [0]);
	Cat.R.PlaceMorphism(args, N_html2str);
	const strXN_html2str = Cat.ProductObject.Get(args.diagram, [str, N_html2str.codomain]);
	const html2line = Cat.R.MakeMorphism(args, 'html2line', 'Morphism', 'line', 'Input a line of text from HTML', html, strXN_html2str,
		{js:`return ['<input type="text" id="' + args + '" value="" placeholder="Text"/>', ${Cat.U.JsName(N_html2str)}]`}).to;
	const N_html2N = Cat.LambdaMorphism.Get(args.diagram, html2N, [], [0]);
	Cat.R.PlaceMorphism(args, N_html2N);
	const strXN_html2N = Cat.ProductObject.Get(args.diagram, [str, N_html2N.codomain]);
	const html2Nat = Cat.R.MakeMorphism(args, 'html2Nat', 'Morphism', '&Nopf;', 'Input a natural number from HTML', html, strXN_html2N,
		{js:`return ['<input type="number" min="0" id="' + args + '" placeholder="Natural number"/>', ${Cat.U.JsName(N_html2N)}];`}).to;
	const N_html2Z = Cat.LambdaMorphism.Get(args.diagram, html2Z, [], [0]);
	Cat.R.PlaceMorphism(args, N_html2Z);
	const strXN_html2Z = Cat.ProductObject.Get(args.diagram, [str, N_html2Z.codomain]);
	const html2Int = Cat.R.MakeMorphism(args, 'html2Int', 'Morphism', '&Zopf;', 'Input an integer from HTML', html, strXN_html2Z,
		{js:`return ['<input type="number" id="' + args + '" value="0" placeholder="Integer"/>', ${Cat.U.JsName(N_html2Z)}];`}).to;
	const N_html2F = Cat.LambdaMorphism.Get(args.diagram, html2F, [], [0]);
	Cat.R.PlaceMorphism(args, N_html2F);
	const strXN_html2F = Cat.ProductObject.Get(args.diagram, [str, N_html2F.codomain]);
	const html2Float = Cat.R.MakeMorphism(args, 'html2Float', 'Morphism', '&Fopf;', 'Input a floating point number from the HTML input tag', html, strXN_html2F,
		{js:`return ['<input type="number" id="' + args + '" placeholder="Float"/>', ${Cat.U.JsName(N_html2F)}];`}).to;
	Cat.R.DiagramReferences(user, htmlDiagram, args.xy);
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
	Cat.R.Autoplace(threeD,
	{
		description:	'Various 3-D morphisms are found here',
		prototype:		'DiagramText',
		user,
	}, args.xy);
args.xy.y += 16 * Cat.D.default.layoutGrid;
	const d3 = Cat.R.MakeObject(args, 'threeD', 'FiniteObject', '3D', 'The 3D object interacts with graphic devices').to;
	const f2d3 = Cat.R.MakeMorphism(args, 'f2d3', 'Morphism', '1D', 'visualize a number in 3D', F, d3,
	{
		code:	{javascript:
`
function %1(args)
{
postMessage(['f2d3', args]);
}
`
		},
	});
	const ff2d3 = Cat.R.MakeMorphism(args, 'ff2d3', 'Morphism', '2D', 'visualize a pair of numbers in 3D', Fpair, d3,
	{
		code:	{javascript:
`
function %1(args)
{
postMessage(['ff2d3', args]);
}
`
		},
	});
	const Ftrip = Cat.ProductObject.Get(threeD, [F, F, F]);
	const f3 = new Cat.NamedObject(threeD, {basename:'F3', properName:'&Fopf;&sup3', source:Ftrip});
	const f3toFtrip = threeD.placeMorphism(threeD, f3.idFrom, args.xy, args.xy.add(Cat.D.default.stdArrow), false);
	args.rowCount++;
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const ftripTof3 = new Cat.DiagramMorphism(threeD, {to:f3.idTo, domain:f3toFtrip.codomain, codomain:f3toFtrip.domain});
//	threeD.addSVG(ftripTof3);
	const fff2d3 = Cat.R.MakeMorphism(args, 'fff2d3', 'Morphism', '3D', 'visualize a triplet of numbers in 3D', f3, d3,
	{
		code:	{javascript:
`
function %1(args)
{
postMessage(['fff2d3', args]);
}
`
		},
	});
	const Ftrip2 = Cat.ProductObject.Get(threeD, [f3, f3]);
	const fff2toline = Cat.R.MakeMorphism(args, 'fff2toLine', 'Morphism', 'Line', 'visualize two points as a line in 3D', Ftrip2, d3,
	{
		code:	{javascript:
`
function %1(args)
{
postMessage(['fff2toLine', args]);
}
`
		},
	});
	const Ftrip3 = Cat.ProductObject.Get(threeD, [f3, f3, f3]);
	const AxAxAToQuadraticBezierCurve3= Cat.R.MakeMorphism(args, 'fff2toQB3', 'Morphism', '1D', 'visualize three points as a Bezier curbe in 3D', Ftrip3, d3,
	{
		code:	{javascript:
`
function %1(args)
{
postMessage(['fff2toQB3', args]);
}
`
		},
	});
	Cat.R.DiagramReferences(user, threeD, args.xy);
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
	Cat.R.Autoplace(qGates,
	{
		description:	'Basic quantum gates are given here.',
		prototype:		'DiagramText',
		user,
	}, args.xy);
	args.xy.y += 16 * Cat.D.default.layoutGrid;
	const qubit = Cat.R.MakeObject(args, 'q', 'CatObject', '&Qopf;', 'The quantum qubit').to;
	const qPair = Cat.R.MakeObject(args, '', 'TensorObject', '', 'A pair of qubits', {objects:[qubit, qubit]}).to;
	const qId = Cat.R.MakeMorphism(args, 'id', 'Identity', 'id', 'identity', qubit, qubit,
	{
		code:	{javascript:
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
		},
	});
	const basis0 = Cat.R.MakeMorphism(args, 'basis0', 'Morphism', '&VerticalBar;0&RightAngleBracket;', 'the 0 basis vector', one, qubit,
	{
		code:	{javascript:
`
function %1(args)
{
return [1, [0, 0]];
}
`
		},
	});
	const pauliX = Cat.R.MakeMorphism(args, 'X', 'Morphism', 'X', 'Pauli-X gate', qubit, qubit,
	{
		code:	{javascript:
`
%1_matrix = [	[[0, 0],	[1, 0]],
			[[1, 0],	[0, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
		},
	});
	const pauliY = Cat.R.MakeMorphism(args, 'Y', 'Morphism', 'Y', 'Pauli-Y gate', qubit, qubit,
	{
		code:	{javascript:
`
%1_matrix = [	[[0, 0],	[0, -1]],
			[[0, 1],	[0, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
		},
	});
	const pauliZ = Cat.R.MakeMorphism(args, 'Z', 'Morphism', 'Z', 'Pauli-Z gate', qubit, qubit,
	{
		code:	{javascript:
`
%1_matrix = [	[[1, 0],	[0, 0]],
			[[0, 0],	[-1, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
		},
	});
	const hademard = Cat.R.MakeMorphism(args, 'H', 'Morphism', 'H', 'hademard gate', qubit, qubit,
	{
		code:	{javascript:
`
%1_matrix = [	[[oSqrt2, 0],	[oSqrt2, 0]],
			[[oSqrt2, 0],	[-oSqrt2, 0]]];
function %1(args)
{
return matrix_multiply(%1_matrix, args);
}
`
		},
	});
	Cat.D.ShowDiagram(qGates);
	qGates.home(false);
	qGates.update();
	Cat.D.ShowDiagram(null);
	fn && Cat.R.Actions.javascript.loadHTML(fn);
}
