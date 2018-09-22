// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
'use strict';

function bootstrap()
{
	let xyDom = {x: 300, y:Cat.default.font.height};
	let xyCod = {x: 600, y:Cat.default.font.height};
	//
	// basics
	//
	Cat.deleteLocalDiagram('D-PFS-std-basics');
	const basics = new diagram({name:'D-PFS-std-basics', codomain:'PFS', html:'Basics', description:'', readonly:true, isStandard:true, references:[], user:'std'});
	const basicObjects =
		[{diagram:basics, code:'Null', html:'&#x2205', description:'empty set', isInitial:true, isFinite:0},
		{diagram:basics, code:'One', html:'1', description:'Terminal object, or one point set', isTerminal:true, isFinite:1}];
	basicObjects.map(objectData => new object(basics.codomain, objectData));
	const basicMorphisms = [{name:'Null2one', diagram:'D-PFS-std-basics', domain:'Null', codomain:'One', function:'null', 	html:'&#x2203!', description:'null to one'}];
	basics.placeMultipleMorphisms(basicMorphisms);
	//
	// first order logic
	//
	Cat.deleteLocalDiagram('D-PFS-std-FOL');
	const fol = new diagram({name:'D-PFS-std-FOL', codomain:'PFS', html:'First Order Logic', references:['D-PFS-std-basics'], readonly:true, isStandard:true, user:'std'});
	const folObjects = [{diagram:'D-PFS-std-FOL', code:'Omega', html:'&#x03a9', description:'sub-object classifier', isFinite:2},
						{code:'Omega*Omega'}];
	folObjects.map(objectData => new object(fol.codomain, objectData));
	const folMorphisms = [	{name:'False', diagram:'D-PFS-std-FOL', domain:'One', codomain:'Omega', function:'false', html:'&#x22a5', description:'false'},
							{name:'True', diagram:'D-PFS-std-FOL', domain:'One', codomain:'Omega', function:'true', 	html:'&#x22a4', description:'true'},
							{name:'not', diagram:'D-PFS-std-FOL', domain:'Omega', codomain:'Omega', function:'not', html:'&#x00ac', description:'not'},
							{name:'and', diagram:'D-PFS-std-FOL', domain:'Omega*Omega', codomain:'Omega', function:'and', html:'&#x2227', description:'logical and'},
							{name:'or', diagram:'D-PFS-std-FOL', domain:'Omega*Omega', codomain:'Omega', function:'or', html:'&#x2228', description:'logical or'}];
	fol.placeMultipleMorphisms(folMorphisms);
	//
	// arithmetic operations
	//
	Cat.deleteLocalDiagram('D-PFS-std-arithmetics');
	const arithmetics = new diagram({name:'D-PFS-std-arithmetics', codomain:'PFS', html:'Arithmetics', description:'Artithmetic operations on natural numbers, integers, and floating point numbers.',
				references:['D-PFS-std-basics', 'D-PFS-std-FOL'], readonly:true, isStandard:true, user:'std'});
	xyDom = {x: 300, y:Cat.default.font.height};
	xyCod = {x: 600, y:Cat.default.font.height};

	let arithObjects = [
		{diagram:arithmetics, code:'N', html:'&#x2115', description:'Natural numbers', isFinite:'n'},
		{diagram:arithmetics, code:'Z', html:'&#x2124', description:'Integers', isFinite:'n'},
		{diagram:arithmetics, code:'F', html:'&#120125;', description:'Floating point numbers', isFinite:'n'},
		{diagram:arithmetics, code:'N*N'},
		{diagram:arithmetics, code:'Z*Z'},
		{diagram:arithmetics, code:'F*F'},
		{diagram:arithmetics, code:'N+One', description:'A natural number or an exception'},
		{diagram:arithmetics, code:'F+One', description:'A floating point number or an exception'},
	];

	arithObjects.map(objectData => new object(arithmetics.codomain, objectData));

	const arithMorphData = [
		{name:'Nzero', diagram:arithmetics, domain:'One', codomain:'N', function:'natZero', html:`'0'`, description:'The natural number zero' },
		{name:'None', diagram:arithmetics, domain:'One', codomain:'N', function:'natOne', html:`'1'`, description:'The natural number one' },
		{name:'Nplus', diagram:arithmetics, domain:'N*N', codomain:'N', function:'natAdd', html:'+', description:'Addition of natural numbers' },
		{name:'Nsucc', diagram:arithmetics, domain:'N', codomain:'N', function:'natSucc', html:'++', description:'Increment natural numbers' },
		{name:'Npred', diagram:arithmetics, domain:'N', codomain:'N', function:'natPred', html:'--', description:'Decrement natural numbers where zero goes to zero' },
		{name:'Nmult', diagram:arithmetics, domain:'N*N', codomain:'N', 	function:'natMult', html:'*', description:'Multiplication of natural numbers'},
		{name:'Ncomp', diagram:arithmetics, domain:'N*N', codomain:'Omega', function:'natStrict', html:'<', description:'Strict order of natural numbers'},
		{name:'NcompEq', diagram:arithmetics, domain:'N*N', codomain:'Omega', function:'natOrder', html:'&#x2264', description:'Order of natural numbers with equality'},
		{name:'Zplus', diagram:arithmetics, domain:'Z*Z', codomain:'Z', 	function:'intAdd', html:'+', description:'Integer addition'},
		{name:'Zsub', 	diagram:arithmetics, domain:'Z*Z', codomain:'Z', 	function:'intSub', html:'-', description:'Integer subtraction'},
		{name:'Zmult', diagram:arithmetics, domain:'Z*Z', codomain:'Z', 	function:'intMult', html:'*', description:'Integer multiplication'},
		{name:'Zcomp', diagram:arithmetics, domain:'Z*Z', codomain:'Omega', function:'intStrict', html:'<', description:'Strict order of integers'},
		{name:'ZcompEq', diagram:arithmetics, domain:'Z*Z', codomain:'Omega', function:'intOrder', html:'&#x2264', description:'Strict order of integers with equality'},
		{name:'Zmod', 	diagram:arithmetics, domain:'Z*Z', codomain:'Z', 	function:'intModulo', html:'%', description:'Modulo'},
		{name:'Fplus', diagram:arithmetics, domain:'F*F', codomain:'F', 	function:'floatAdd', html:'+', description:'Floating point addition'},
		{name:'Fsub', 	diagram:arithmetics, domain:'F*F', codomain:'F', 	function:'floatSub', html:'-', description:'Floating point subtraction'},
		{name:'Fmult', diagram:arithmetics, domain:'F*F', codomain:'F', 	function:'floatMult', html:'*', description:'Floating point multiplication'},
		{name:'Fdiv', diagram:arithmetics, domain:'F*F', codomain:'F+One', 	function:'floatDiv', html:'/', description:'Floating point division'},
		{name:'Fcomp', diagram:arithmetics, domain:'F*F', codomain:'Omega', function:'floatStrict', html:'<', description:'Strict order of floats'},
		{name:'FcompEq', diagram:arithmetics, domain:'F*F', codomain:'Omega', function:'floatOrder', html:'&#x2264', description:'Strict order of floats with equality'},
		{name:'N2Z', diagram:arithmetics, domain:'N', codomain:'Z', function:'nat2int', html:'&#x21aa', description:'Embed natural numbers into integers'},
		{name:'Z2F', diagram:arithmetics, domain:'Z', codomain:'F', function:'int2float', html:'&#x21aa', description:'Embed integers into floats'}];
	arithmetics.placeMultipleMorphisms(arithMorphData);

	Cat.deleteLocalDiagram('D-PFS-std-strings');
	const strings = new diagram({name:'D-PFS-std-strings', codomain:'PFS', html:'Strings', description:'Operations on strings.', references:['D-PFS-std-arithmetics'], readonly:true, isStandard:true, user:'std'});
	const stringObjects = [
		{diagram:strings, code:'Str', html:'Str', description:'The space of finite strings'},
		{diagram:strings, code:'Str*Str'}];
	stringObjects.map(objectData => new object(strings.codomain, objectData));
	const stringMorphisms =
		[
			{diagram:strings, name:'append', domain:'Str*Str', codomain:'Str', function:'strAppend', html:'+', description:'Append two strings'},
			{diagram:strings, name:'strlen', domain:'Str', codomain:'N', function:'strLength', html:'#', description:'Length of a string'},
			{diagram:strings, name:'NtoStr', domain:'N', codomain:'Str', function:'nat2str', html:'&#x5316', description:'Convert natural numbers to a string'},
			{diagram:strings, name:'ZtoStr', domain:'Z', codomain:'Str', function:'int2str', html:'&#x5316', description:'Convert integers to a string'},
			{diagram:strings, name:'FtoStr', domain:'F', codomain:'Str', function:'float2str', html:'&#x5316', description:'Convert floating point numbers to a string'},
			{diagram:strings, name:'OmegaToStr', domain:'Omega', codomain:'Str', function:'omega2str', html:'&#x5316', description:'Convert truth values to a string'},
		];
	strings.placeMultipleMorphisms(stringMorphisms);
	//
	// console
	//
	Cat.deleteLocalDiagram('D-PFS-std-console');
	const console = new diagram({name:'D-PFS-std-console', codomain:'PFS', html:'Console', description:'Print to the console\'s tty.', references:['D-PFS-std-strings'], readonly:true, isStandard:true, user:'std'});
	const consoleObjects = [{diagram:console, code:'tty', html:'tty', description:'Write-only console'}];
	consoleObjects.map(objectData => new object(console.codomain, objectData));
	const consoleMorphisms = [{name:'print', diagram:console, domain:'Str', codomain:'tty', function:'ttyOut', html:'&#128438;', description:'Print to tty'}];
	console.placeMultipleMorphisms(consoleMorphisms);
	//
	// threeD
	//
	Cat.deleteLocalDiagram('D-PFS-std-threeD');
	const threeD = new diagram({name:'D-PFS-std-threeD', codomain:'PFS', html:'3D', description:'Print to three dimensions.', references:['D-PFS-std-arithmetics', 'D-PFS-std-strings'], readonly:true, isStandard:true, user:'std'});
	const threeDObjects = [{diagram:threeD, code:'threeD', html:'3D', description:'Rendering in 3D'},
							{diagram:threeD, code:'N*N*N'},
							{diagram:threeD, code:'Z*Z*Z'},
							{diagram:threeD, code:'F*F*F'},
							{diagram:threeD, name:'point', html:'Point', description:'3D point', code:'F*F*F'},
							{diagram:threeD, code:'point*point'},
							{diagram:threeD, code:'point*point*point'},
//							{diagram:threeD, name:'Red', code:'Red', html:'Red', description:'The color red'},
//							{diagram:threeD, name:'Green', code:'Green', html:'Green', description:'The color green'},
//							{diagram:threeD, name:'Blue', code:'Blue', html:'Blue', description:'The color blue'},
							{diagram:threeD, code:'N*N*N', html:'RGB'},	// TODO should be bytes
							{diagram:threeD, name:'color', code:'N*N*N', html:'Color', description:'Full color spectrum'},
						];
	threeDObjects.map(objectData => new object(threeD.codomain, objectData));
	const threeDMorphisms = [
								{name:'Nto3D', diagram:threeD, domain:'N', codomain:'threeD', function:'Ato3D', html:'&#128438;Points', description:'Plot a natural number in 3D with a random color.'},
								{name:'NxNto3D', diagram:threeD, domain:'N*N', codomain:'threeD', function:'AxAto3D', html:'&#128438;Points', description:'Plot a pair of natural numbers in 3D with a random color.'},
								{name:'NxNxNto3D', diagram:threeD, domain:'N*N*N', codomain:'threeD', function:'AxAxAto3D', html:'&#128438;Points', description:'Plot a triple of natural numbers in 3D with a random color.'},
								{name:'Zto3D', diagram:threeD, domain:'Z', codomain:'threeD', function:'Ato3D', html:'&#128438;Points', description:'Plot an integer in 3D with a random color.'},
								{name:'ZxZto3D', diagram:threeD, domain:'Z*Z', codomain:'threeD', function:'AxAto3D', html:'&#128438;Points', description:'Plot a pair of integers in 3D with a random color.'},
								{name:'ZxZxZto3D', diagram:threeD, domain:'Z*Z*Z', codomain:'threeD', function:'AxAxAto3D', html:'&#128438;Points', description:'Plot a triple of integers in 3D with a random color.'},
								{name:'Fto3D', diagram:threeD, domain:'F', codomain:'threeD', function:'Ato3D', html:'&#128438;Points', description:'Plot a floating point number in 3D with a random color.'},
								{name:'FxFto3D', diagram:threeD, domain:'F*F', codomain:'threeD', function:'AxAto3D', html:'&#128438;Points', description:'Plot a pair of floating point numbers in 3D with a random color.'},
								{name:'FxFxFto3D', diagram:threeD, domain:'F*F*F', codomain:'threeD', function:'AxAxAto3D', html:'&#128438;Points', description:'Plot a triple of floating point numbers in 3D with a random color.'},
								{name:'FxFxFx2toLine', diagram:threeD, domain:'point*point', codomain:'threeD', function:'AxAxAx2toLine', html:'&#128438;Lines', description:'Plot a line segment in 3D with a random color.'},
								{name:'FxFxFx2toQuadraticBezierCurve3', diagram:threeD, domain:'point*point*point', codomain:'threeD', function:'AxAxAToQuadraticBezierCurve3', html:'&#128438;Beziers', description:'Plot a 3D Bezier curve with a random color.'},
								{name:'Str2Color', diagram:threeD, domain:'Str', codomain:'color', function:'AxAxAToQuadraticBezierCurve3', html:'Str2Color', description:'Convert string to color.'},
							];
	threeD.placeMultipleMorphisms(threeDMorphisms);
	Cat.Amazon.saveDiagram(Cat.diagrams['D-PFS-std-basics']);
	Cat.Amazon.saveDiagram(Cat.diagrams['D-PFS-std-FOL']);
	Cat.Amazon.saveDiagram(Cat.diagrams['D-PFS-std-strings']);
	Cat.Amazon.saveDiagram(Cat.diagrams['D-PFS-std-arithmetics']);
	Cat.Amazon.saveDiagram(Cat.diagrams['D-PFS-std-console']);
	Cat.Amazon.saveDiagram(Cat.diagrams['D-PFS-std-threeD']);
//	Cat.Amazon.saveDiagram(Cat.diagrams.D-PFS-anon-Draft);
}

bootstrap();
