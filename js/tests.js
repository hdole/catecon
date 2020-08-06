const {module, test} = QUnit;

module('Basics');

QUnit.config.reorder = false;

Cat.R.sync = false;

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

const testDiagramName = 'hdole/UnitTest';

const nuDefaults = {category:'hdole/UnitTest', debug:true, diagram:testDiagramName};

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

let diagrams = '';
const testDiagramInfo =
{
	name:			testDiagramName,
	basename:		'UnitTest',
	description	:	'test description',
	properName:		'test proper name',
	timestamp:		38,
	user:			'tester',
	references:		['unitTestRef'],
};

function checkInfo(info, cmpInfo)
{
	return info.name === cmpInfo.name && info.basename === cmpInfo.basename && info.properName === cmpInfo.properName && info.description === cmpInfo.description &&
			info.timestamp === cmpInfo.timestamp && info.user === cmpInfo.user && info.references.length === cmpInfo.references.length &&
			info.references.reduce((r, ref, i) => r && ref === cmpInfo.references[i], true);
}

test('AddEventListeners', assert =>
{
	Cat.R.AddEventListeners();
	assert.ok(true, 'AddEventListeners ok');
});

test('SetupWorkers', assert =>
{
	Cat.R.SetupWorkers();
	assert.ok(true, 'SetupWorkers ok');
});

//const oldDiagrams = localStorage.getItem('diagrams');
test('SaveLocalDiagramList', assert =>
{
//	const oldDiagrams = localStorage.getItem('diagrams');
	Cat.R.LocalDiagrams.set(testDiagramInfo.name, testDiagramInfo);
	Cat.R.SaveLocalDiagramList();
	Cat.R.LocalDiagrams.delete(testDiagramInfo.name);
	diagrams = JSON.parse(localStorage.getItem('diagrams'));
	assert.ok(diagrams.length === 1 && checkInfo(diagrams[0], testDiagramInfo), 'SaveLocalDiagramList');
//	delete Cat.R.LocalDiagrams[testDiagram.name];
//	Cat.R.SaveLocalDiagramList();
//	const temp = '[{"name":"hdole/Basics","basename":"Basics","description":"Basic objects for interacting with the real world","properName":"Basics","timestamp":1596154106901,"user":"hdole","references":[]},{"name":"hdole/Logic","basename":"Logic","description":"Basic logic functions","properName":"&Omega; Logic","timestamp":1596154106917,"user":"hdole","references":["hdole/Basics"]},{"name":"hdole/Narithmetics","basename":"Narithmetics","description":"Arithmetic functions for natural numbers","properName":"&Nopf; Arithmetic","timestamp":1596154106947,"user":"hdole","references":["hdole/Logic"]},{"name":"hdole/Integers","basename":"Integers","description":"Arithmetic functions for integers","properName":"&Zopf; Arithmetic","timestamp":1596154107006,"user":"hdole","references":["hdole/Narithmetics"]},{"name":"hdole/floats","basename":"floats","description":"Floating point artihmetic functions","properName":"&Fopf; Arithmetic","timestamp":1596154107048,"user":"hdole","references":["hdole/Integers"]},{"name":"hdole/Strings","basename":"Strings","description":"functions for strings","properName":"Strings","timestamp":1596154107140,"user":"hdole","references":["hdole/floats"]},{"name":"hdole/HTML","basename":"HTML","description":"Basic HTML input and output","properName":"HTML","timestamp":1596154116710,"user":"hdole","references":["hdole/Strings"]},{"name":"Anon/Home","basename":"Home","description":"Anonymous user home","properName":"Home","timestamp":1592864363055,"user":"Anon","references":["hdole/HTML"]},{"name":"Anon/Anon","basename":"Anon","description":"Anon diagrams","properName":"Anon","timestamp":1596492289203,"user":"Anon","references":[]},{"name":"hdole/Home","basename":"Home","description":"User home diagram","properName":"Home","timestamp":1596576950712,"user":"hdole","references":["hdole/HTML"]},{"name":"hdole/hdole","basename":"hdole","description":"hdole diagrams","properName":"hdole","timestamp":1596599918517,"user":"hdole","references":[]}]';
});

module('Initialization');

test('SetupCore', assert =>
{
	Cat.R.SetupCore();
	const CAT = Cat.R.CAT;
	assert.ok(Cat.Category.IsA(CAT), 'CAT is a category');
	assert.ok(CAT.name === 'sys/CAT', 'CAT name ok');
	assert.ok(CAT.basename === 'CAT', 'CAT basename ok');
	assert.ok(CAT.user === 	'sys', 'CAT user ok');
	assert.ok(CAT.properName === 'CAT', 'CAT proper name ok');
	assert.ok(CAT.description === 'top category', 'CAT description ok');
	const $CAT = Cat.R.$CAT;
	assert.ok(Cat.Diagram.IsA($CAT), '$CAT is a diagram');
	assert.ok($CAT.codomain === CAT, '$CAT codomain is CAT');
	assert.ok($CAT.basename === '$CAT', '$CAT basename is ok');
	assert.ok($CAT.properName === '$CAT', '$CAT properName is ok');
	assert.ok($CAT.description === 'top level diagram', '$CAT description is ok');
	assert.ok($CAT.user === 'sys', '$CAT user is ok');
	const _Cat = Cat.R.Cat;
	assert.ok(Cat.Category.IsA(_Cat), 'Cat is a category');
	assert.ok(_Cat.basename ===	'Cat', 'Cat basename is ok');
	assert.ok(_Cat.category ===	CAT, 'Cat category is ok');
	assert.ok(_Cat.description === 'category of smaller categories', 'Cat basename is ok');
	assert.ok(_Cat.properName === 'ℂ𝕒𝕥', 'Cat basename is ok');
	assert.ok(_Cat.user === 'sys', 'Cat basename is ok');
	const Actions = Cat.R.$CAT.getElement('Actions');
	assert.ok(Actions.basename === 'Actions', 'Actions basename is ok');
	assert.ok(Actions.properName === 'Actions', 'Actions properName is ok');
	assert.ok(Actions.description === 'discrete category of currently loaded actions', 'Actions description is ok');
	assert.ok(Actions.user === 'sys', 'Actions user is ok');
	const $Actions = Cat.R.$CAT.getElement('$Actions');
	assert.ok(Cat.Diagram.IsA($Actions), '$Actions is a diagram');
	assert.ok($Actions.basename === '$Actions', '$Actions basename is ok');
	assert.ok($Actions.codomain === Actions, '$Actions codomain is ok');
	assert.ok($Actions.properName === 'Actions', '$Actions properName is ok');
	assert.ok($Actions.description === 'diagram of currently loaded actions', '$Actions description is ok');
	assert.ok($Actions.user === 'sys', '$Actions user is ok');
});

function checkArgs(assert, obj, args)
{
	for(const arg in args)
		if (args.hasOwnProperty(arg))
			assert.ok(obj[arg] === args[arg], `${obj.name} ${arg} is ok`);
}
test('SetupActions', assert =>
{
	Cat.R.SetupActions();
	const $CAT = Cat.R.$CAT;
	const Actions = $CAT.getElement('Actions');
	const categoryDiagram = $CAT.getElement('category');
	assert.ok(Cat.Diagram.IsA(categoryDiagram), 'category diagram is a diagram');
	let args = {basename:'category', name:'category', codomain:Actions, description:'diagram for a category', user:'sys'};
	checkArgs(assert, categoryDiagram, args);
	const categoryActions = ["identity", "graph", "name", "composite", "detachDomain", "detachCodomain", "homRight", "homLeft", "homset", "delete", "copy", "flipName", "help",
		"javascript", "cpp", "run", "alignHorizontal", "alignVertical", "assert"];
	categoryActions.map(action => assert.ok(Cat.Action.IsA(categoryDiagram.getElement(action)), `Category actions ${action} exists`));

	const productDiagram = $CAT.getElement('product');
	const productActions = ["product", "productEdit", "project", "pullback", "productAssembly", "morphismAssembly"];
	productActions.map(action => assert.ok(Cat.Action.IsA(productDiagram.getElement(action)), `Product actions ${action} exists`));

	const coproductDiagram = $CAT.getElement('coproduct');
	const coproductActions = ["coproduct", "coproductEdit", "inject", "pushout", "coproductAssembly", "finiteObject", "recursion"];
	coproductActions.map(action => assert.ok(Cat.Action.IsA(coproductDiagram.getElement(action)), `Coproduct actions ${action} exists`));

	const homDiagram = $CAT.getElement('hom');
	const homActions = ["hom", "evaluate", "lambda"];
	homActions.map(action => assert.ok(Cat.Action.IsA(homDiagram.getElement(action)), `Hom actions ${action} exists`));

	const distributeDiagram = $CAT.getElement('distribute');
	const distributeActions = ["distribute"];
	distributeActions.map(action => assert.ok(Cat.Action.IsA(distributeDiagram.getElement(action)), `Distribute actions ${action} exists`));

	const _Cat = Cat.R.Cat;
	const CatActionDiagrams = ['category', 'product', 'coproduct', 'hom', 'distribute'];
	CatActionDiagrams.map(diagram => assert.ok(_Cat.actionDiagrams.has(diagram), `Cat has action diagram ${diagram}`));
	assert.equal(CatActionDiagrams.length, _Cat.actionDiagrams.size, 'Cat.actionDiagrams has correct size');
});

let PFS = null;

test('PFS', assert =>
{
	Cat.R.SetupPFS();
	PFS = Cat.R.$CAT.getElement('PFS');
	checkArgs(assert, PFS, {basename:'PFS', user:'hdole', properName:'&Popf;&Fopf;&Sopf;'});
	const actions = ['category', 'product', 'coproduct', 'hom', 'distribute'];
	actions.map(action => assert.ok(PFS.actionDiagrams.has(action), `PFS has category ${action}`));
});

/*
// TODO needs $CAT
test('ReadLocalDiagramList', assert =>
{
	Cat.R.ReadLocalDiagramList();
	assert.ok(checkInfo(testDiagram, Cat.R.Diagrams.get(testDiagram.name)), 'R.diagrams registered info found');
	assert.ok(checkInfo(testDiagram, Cat.R.LocalDiagrams.get(testDiagram.name)), 'R.LocalDiagrams registered info found');
	// restore state
	localStorage.setItem('diagrams', oldDiagrams);
});

test('ReadLocalCategoryList', assert =>
	Cat.R.ReadLocalCategoryList();
	assert.ok(checkInfo(testDiagram, Cat.R.Diagrams.get(testDiagram.name)), 'R.diagrams registered info found');
	assert.ok(checkInfo(testDiagram, Cat.R.LocalDiagrams.get(testDiagram.name)), 'R.LocalDiagrams registered info found');

	{
		const categories = JSON.parse(localStorage.getItem('categories'));
		if (categories)
			categories.map(d => R.Categories.set(d.name, d));
	}
});
*/


test('Diaplay initalization', assert =>
{
	Cat.D.Initialize();
	const D = Cat.D;
	assert.ok(D.Navbar.prototype.isPrototypeOf(D.navbar), 'Navbar exists');
	assert.ok(D.parenWidth > 0, 'Paren width positive');
	assert.ok(D.commaWidth > 0, 'Comma width positive');
	assert.ok(D.bracketWidth > 0, 'Bracket width positive');
	assert.ok(D.diagramSVG === document.getElementById('diagramSVG'), 'diagramSVG exists');
	assert.ok(D.Panels.prototype.isPrototypeOf(D.panels), 'Panels exists');
	assert.ok(D.CategoryPanel.prototype.isPrototypeOf(D.categoryPanel), 'categoryPanel exists');
	assert.ok(D.DiagramPanel.prototype.isPrototypeOf(D.diagramPanel), 'diagramPanel exists');
	assert.ok(D.HelpPanel.prototype.isPrototypeOf(D.helpPanel), 'helpPanel exists');
	assert.ok(D.LoginPanel.prototype.isPrototypeOf(D.loginPanel), 'loginPanel exists');
	assert.ok(D.MorphismPanel.prototype.isPrototypeOf(D.morphismPanel), 'morphismPanel exists');
	assert.ok(D.SettingsPanel.prototype.isPrototypeOf(D.settingsPanel), 'settingsPanel exists');
	assert.ok(D.TextPanel.prototype.isPrototypeOf(D.textPanel), 'textPanel exists');
	assert.ok(D.ThreeDPanel.prototype.isPrototypeOf(D.threeDPanel), 'threeDPanel exists');
	assert.ok(D.TtyPanel.prototype.isPrototypeOf(D.ttyPanel), 'ttyPanel exists');

	assert.ok(D.NewElement.prototype.isPrototypeOf(D.newElement.Diagram), 'newElement Diagram exists');
	assert.ok(D.NewElement.prototype.isPrototypeOf(D.newElement.Object), 'newElement Object exists');
	assert.ok(D.NewElement.prototype.isPrototypeOf(D.newElement.Morphism), 'newElement Morphism exists');
	assert.ok(D.NewElement.prototype.isPrototypeOf(D.newElement.Text), 'newElement Text exists');
});

test('Setup replay', assert =>
{
	Cat.R.SetupReplay();
	const replayCommands = ["identity", "name", "composite", "detachDomain", "detachCodomain", "homRight", "homLeft", "homset", "newMorphism", "delete", "copy", "flipName",
		"alignHorizontal", "alignVertical", "assert", "product", "productEdit", "project", "pullback", "productAssembly", "morphismAssembly", "coproduct", "coproductEdit",
		"inject", "pushout", "coproductAssembly", "hom", "lambda", "newDiagram", "newObject", "newText", "drop", "move", "fuse", "text", "editText", "view", "paste",
		"addReference", "removeReference"];
	replayCommands.map(cmd => assert.ok(Cat.R.ReplayCommands.has(cmd), `Replay command ${cmd} exists`));
	assert.equal(replayCommands.length, Cat.R.ReplayCommands.size, 'ReplayCommands has the right size');
});

test('Bogus login', assert =>
{
	const R = Cat.R;
	R.user.name = 'tester';
	R.user.email = 'tester@example.com';
	R.user.status = 'logged-in';
	R.loadingDiagram = 'fake';
	R.EmitLoginEvent();
	delete R.loadingDiagram;
	assert.equal(Cat.D.loginPanel.userNameElt.innerText, R.user.name, 'User name is correct');
	assert.equal(Cat.D.loginPanel.userEmailElt.innerText, R.user.email, 'User email is correct');
});

let testDiagram = null;
test('Create test diagram', assert =>
{
	args = {basename:'test', codomain:PFS, user:'tester'};
	testDiagram = new Cat.Diagram(Cat.R.$CAT, args);
	assert.ok(Cat.Diagram.IsA(testDiagram), 'testDiagram exists');
});

module('Diagram test');

test('SelectDiagram', assert =>
{
	Cat.D.url = window.URL || window.webkitURL || window;
	Cat.R.SelectDiagram(testDiagram);
	assert.equal(Cat.R.diagram, testDiagram, 'Test diagram is the default diagram');
});
