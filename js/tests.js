const {module, test} = QUnit;

module('Basics');

test('base classes exist', assert =>
{
	const CatClasses =
	[
		'D2',
		'R',
		'D',
		'U',
		'H',
		'Assertion',
		'Category',
		'CatObject',
		'CppAction',
		'Composite',
		'Dedistribute',
		'Diagram',
		'DiagramComposite',
		'DiagramMorphism',
		'DiagramObject',
		'DiagramPullback',
		'DiagramText',
		'Distribute',
		'Element',
		'Evaluation',
		'FactorMorphism',
		'FiniteObject',
		'HomObject',
		'HomMorphism',
		'Identity',
		'IndexCategory',
		'JavascriptAction',
		'LambdaMorphism',
		'Morphism',
		'NamedObject',
		'NamedMorphism',
		'ProductObject',
		'ProductMorphism',
		'ProductAssembly',
		'PullbackObject',
		'TensorObject',
	];
	CatClasses.map(d => assert.equal(typeof(Cat[d]), 'function', d));
});

test('Busy graphics', assert =>
{
	Cat.R.Busy();
	assert.equal(typeof(Cat.R.busyBtn), 'object', 'Busy graphics exist');
});

test('No Busy graphics', assert =>
{
	Cat.R.NotBusy();
	assert.equal(typeof(Cat.R.busyBtn), 'undefined', 'Busy graphics gone');
});

const testDiagram = 'hdole/UnitTest';

const nuDefaults = {category:'hdole/UnitTest', debug:true, diagram:testDiagram};

const {category, debug, diagram} = Cat.R.default;

test('Save defaults', assert =>
{
	Cat.R.default.diagram =	nuDefaults.diagram;
	Cat.R.default.debug = nuDefaults.debug;
	Cat.R.default.category = nuDefaults.category;
	Cat.R.SaveDefaults();
	const defaults = JSON.parse(localStorage.getItem('defaults.json'));
	let didIt = true;
	for(const d in nuDefaults)
		if (defaults.hasOwnProperty(d))
			didIt = didIt && nuDefaults[d] === Cat.R.default[d];
	assert.ok(didIt, 'Save defaults');
	Cat.R.default.diagram =	diagram;
	Cat.R.default.debug = debug;
	Cat.R.default.category = category;
});

test('Read defaults', assert =>
{
	Cat.R.ReadDefaults();
	let didIt = true;
	for(const d in nuDefaults)
		if (nuDefaults.hasOwnProperty(d))
			didIt = didIt && nuDefaults[d] === Cat.R.default[d];
	assert.ok(didIt, 'Save defaults');
	Cat.R.default.diagram =	diagram;
	Cat.R.default.debug = debug;
	Cat.R.default.category = category;
	localStorage.removeItem('defaults.json');
});

test('SaveLocalDiagramList', assert =>
{
	const oldDiagrams = localStorage.getItem('diagrams');
	Cat.R.LocalDiagrams.set(testDiagram, {name:testDiagram});
	Cat.R.SaveLocalDiagramList();
	const diagrams = JSON.parse(localStorage.getItem('diagrams'));
	assert.equal(diagrams[0].name, testDiagram, 'SaveLocalDiagramList');
	// restore state
	delete Cat.R.LocalDiagrams[testDiagram];
	Cat.R.SaveLocalDiagramList();
//	const temp = '[{"name":"hdole/Basics","basename":"Basics","description":"Basic objects for interacting with the real world","properName":"Basics","timestamp":1596154106901,"user":"hdole","references":[]},{"name":"hdole/Logic","basename":"Logic","description":"Basic logic functions","properName":"&Omega; Logic","timestamp":1596154106917,"user":"hdole","references":["hdole/Basics"]},{"name":"hdole/Narithmetics","basename":"Narithmetics","description":"Arithmetic functions for natural numbers","properName":"&Nopf; Arithmetic","timestamp":1596154106947,"user":"hdole","references":["hdole/Logic"]},{"name":"hdole/Integers","basename":"Integers","description":"Arithmetic functions for integers","properName":"&Zopf; Arithmetic","timestamp":1596154107006,"user":"hdole","references":["hdole/Narithmetics"]},{"name":"hdole/floats","basename":"floats","description":"Floating point artihmetic functions","properName":"&Fopf; Arithmetic","timestamp":1596154107048,"user":"hdole","references":["hdole/Integers"]},{"name":"hdole/Strings","basename":"Strings","description":"functions for strings","properName":"Strings","timestamp":1596154107140,"user":"hdole","references":["hdole/floats"]},{"name":"hdole/HTML","basename":"HTML","description":"Basic HTML input and output","properName":"HTML","timestamp":1596154116710,"user":"hdole","references":["hdole/Strings"]},{"name":"Anon/Home","basename":"Home","description":"Anonymous user home","properName":"Home","timestamp":1592864363055,"user":"Anon","references":["hdole/HTML"]},{"name":"Anon/Anon","basename":"Anon","description":"Anon diagrams","properName":"Anon","timestamp":1596492289203,"user":"Anon","references":[]},{"name":"hdole/Home","basename":"Home","description":"User home diagram","properName":"Home","timestamp":1596576950712,"user":"hdole","references":["hdole/HTML"]},{"name":"hdole/hdole","basename":"hdole","description":"hdole diagrams","properName":"hdole","timestamp":1596599918517,"user":"hdole","references":[]}]';
	localStorage.setItem('diagrams', oldDiagrams);
});
