const {module, test} = QUnit;

const StartOfRun = new Date();

module('Basics');

QUnit.config.reorder = false;
QUnit.config.hidepassed = true;

// overrides
Cat.R.sync = false;
Cat.D.url = window.URL || window.webkitURL || window;

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

let {category, debug, diagram} = Cat.R.default;

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

test('Initialize cloud', assert =>
{
	Cat.R.InitCloud();
	assert.ok(Cat.R.cloud, 'Cloud exists');
	assert.dom('#cloud-amazon').hasAttribute('src', "https://sdk.amazonaws.com/js/aws-sdk-2.306.0.min.js").hasAttribute('type', "text/javascript");
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

test('Login event', assert =>
{
	const R = Cat.R;
	R.user.name = 'tester';
	R.user.email = 'tester@example.com';
	R.user.status = 'logged-in';
	R.loadingDiagram = 'fake';
	R.EmitLoginEvent();
	delete R.loadingDiagram;
	assert.equal(Cat.D.loginPanel.userNameElt.innerText, R.user.name, 'User name ok');
	assert.equal(Cat.D.loginPanel.userEmailElt.innerText, R.user.email, 'User email ok');
	//	 TODO emit login event
});

diagram = null;
test('Create test diagram', assert =>
{
	args = {basename:'test', codomain:PFS, user:'tester', description:'This is a test and only a test'};
	diagram = new Cat.Diagram(Cat.R.$CAT, args);
	assert.ok(Cat.Diagram.IsA(diagram), 'New diagram exists');
});

module('Diagram test');

test('Start diagram graphics', assert =>
{
	diagram.makeSVG();
	const svg = document.getElementById(diagram.elementId('root'));
	assert.ok(svg, 'Diagram SVG exists');
	assert.ok(svg.classList.contains('hidden'), 'Diagram SVG is hidden');
	diagram.show();
	assert.ok(!svg.classList.contains('hidden'), 'Diagram SVG is visible');
	assert.ok(svg.style.display === 'block', 'Diagram SVG style.display is block');
	const svgTran = document.getElementById(diagram.elementId() + '-T');
	assert.ok(svgTran, 'SVG transform group exists');
	assert.equal(diagram.svgTranslate, svgTran, 'Diagram translate element is ok');
	assert.dom('#' + diagram.elementId() + '-base').exists('SVG base group exists');
});

test('Cat.R.EmitCATEvent default', assert =>
{
	Cat.R.diagram = diagram;
	Cat.R.EmitCATEvent('default', diagram);
	assert.equal(document.getElementById('category-navbar').innerHTML, 'ℙ𝔽𝕊', 'Navbar category name ok');
	console.log('diagram-navbar', document.getElementById('diagram-navbar').innerText);
	assert.dom('#diagram-navbar').hasText(`${diagram.basename} by ${diagram.user}`, 'Navbar diagram name and user ok');
	assert.dom('#diagram-category').hasText('ℙ𝔽𝕊', 'Diagram panel category name ok');
	assert.dom('#diagram-properName').hasText(diagram.properName, 'Diagram panel properName ok');
	assert.dom('#diagram-description').hasText(diagram.description, 'Diagram panel description ok');
	assert.dom('#diagram-user').hasText(diagram.user, 'Diagram panel user ok');
	assert.dom('#img-el_tester--test').exists('Image for diagram exists').hasTagName('img', 'Diagram panel image is an img');
	assert.dom('#diagram-timestamp').hasText(new Date(diagram.timestamp).toLocaleString(), 'Diagram panel timestamp ok');
	const catalog = document.querySelector('#diagram-reference-section .catalog');
	assert.equal(catalog.children.length, 0, 'Diagram panel reference catalog is empty');
	assert.ok(catalog, 'Diagram panel reference catalog exists');
	assert.dom('#diagram-info').hasText('Not on cloud', 'Diagram info ok');
	const it = document.querySelector('#diagram-user-section .catalog #img-el_tester--test');
	assert.dom('#diagram-user-section .catalog #img-el_tester--test').exists('Image for diagram exists').hasTagName('img', 'Diagram panel user section image is an img');
});

test('Create PFS object', assert =>
{
	const args = {basename:'t0', properName:'T0', description:'this is a test'};
	const lookforit = function(e)
	{
		assert.equal(e.detail.command, 'new', 'New object event occurred');
		checkArgs(assert, e.detail.element, args);
	};
	window.addEventListener('Object', lookforit);
	const obj = new Cat.CatObject(diagram, args);
	window.removeEventListener('Object', lookforit);
	assert.ok(obj, 'Create test object ok');
	let didit = false;
	try { const obj2 = new Cat.CatObject(diagram, args); }
	catch(x) { didit = true; }
	assert.ok(didit, 'Cannot create object with same basename');
	checkArgs(assert, obj, args);
	assert.ok(!('svg' in obj), 'Object does not have svg');
	assert.equal(obj._sig, "869a4e90a5d64c453fe80ae1cfe0d9b05535150a561477734f63ea128f7e89b0", 'Object signature ok');
});

test('Fetch element', assert =>
{
	const obj1 = diagram.getElement('t0');
	assert.ok(obj1, 'diagram getElement by basename ok');
	const obj2 = diagram.getElement('tester/test/t0');
	assert.ok(obj2, 'diagram getElement by name ok');
	assert.equal(obj1, obj2, 'Element fetched by name and basename are equal');
});

test('Create second object', assert =>
{
	const args = {basename:'t1', properName:'T1', description:'this is another test'};
	const obj = new Cat.CatObject(diagram, args);
	assert.ok(obj, 'Second object exists');
	checkArgs(assert, obj, args);
});

test('Set view', assert =>
{
	const x = 0;
	const y = 0;
	const scale = 1;
	const log = false;
	diagram.setView(x, y, scale, log);
	assert.equal(diagram.viewport.x, x, 'Diagram viewport x ok');
	assert.equal(diagram.viewport.y, y, 'Diagram viewport y ok');
	assert.equal(diagram.viewport.scale, scale, 'Diagram viewport scale ok');
	assert.equal(diagram.svgTranslate.getAttribute('transform'), `translate(${x} ${y}) scale(${scale} ${scale})`);
});

test('Create index object', assert =>
{
	const to = diagram.getElement('t0');
	const grid = Cat.D.default.arrow.length;
	const xy = {x:grid, y:grid};
	const args = {to, xy};
	const from = new Cat.DiagramObject(diagram, args);
	assert.ok(from, 'Index object exists');
	assert.equal(from.to, to, 'Target object assigned');
	assert.equal(from.x, xy.x, 'X coordinate ok');
	assert.equal(from.y, xy.y, 'Y coordinate ok');
	const svg = document.getElementById('el_tester--test--o_0');
	assert.ok(svg, 'Index object svg exists');
	assert.equal(svg.innerHTML, from.to.properName, 'Proper name is displayed');
	assert.equal(svg.getAttribute('text-anchor'), 'middle', 'Text anchor is middle');
	assert.equal(svg.getAttribute('x'), grid, 'Text x location ok');
	assert.equal(svg.getAttribute('y'), grid + Cat.D.default.font.height/2, 'Text y location ok');
	assert.dom('#el_tester--test--o_0').hasClass('object', 'Svg has object class').hasClass('grabbable', 'Svg has grabbable class');
	assert.equal(svg.dataset.name, 'tester/test/o_0', 'Dataset name ok');
	assert.equal(svg.dataset.type, 'object', 'Dataset object ok');
});

const dgrmJson = 'tester/test.json';

test('Diagram.placeObject', assert =>
{
	const to = diagram.getElement('t1');
	const grid = Cat.D.default.arrow.length;
	const xy = {x:2 * grid, y:grid};
	localStorage.removeItem(dgrmJson);	// just in case
	const from = diagram.placeObject(null, to, xy, false);	// do not test saving or selection here
	assert.equal(from.to, to, 'Target object correctly assigned');
	assert.equal(from.x, xy.x, 'Index object x value ok');
	assert.equal(from.y, xy.y, 'Index object y value ok');
});

function checkMorphism(assert, diagram, args, morphism, domain, codomain, sig)
{
	assert.equal(morphism.basename, args.basename, `${args.basename}: morphism basename ok`);
	const name = `${diagram.name}/${args.basename}`;
	assert.equal(morphism.name, name, `${args.basename}: morphism name ok`);
	if ('properName' in args)
		assert.equal(morphism.properName, args.properName, `${args.basename}: morphism properName ok`);
	else
		assert.equal(morphism.properName, args.basename, `${args.basename}: morphism properName ok`);
	if ('description' in args)
		assert.equal(morphism.description, args.description, `${args.basename}: morphism description ok`);
	assert.equal(morphism.domain, domain, `${args.basename}: morphism domain ok`);
	assert.equal(morphism.codomain, codomain, `${args.basename}: morphism codomain ok`);
	assert.equal(morphism.diagram, diagram, `${args.basename}: morphism belongs to diagram`);
	assert.equal(morphism.category, PFS, `${args.basename}: morphism belongs to category`);
	assert.ok(diagram.getElement(args.basename), `Can find morphism by basename`);
	assert.ok(diagram.getElement(name), `Can find morphism by name`);
	assert.ok(!morphism.dual, `${args.basename}: morphism is not dual`);
	assert.equal(morphism.refcnt, 0, `${args.basename}: morphism has no references`);
	assert.ok(!('svg' in morphism), `${args.basename}: morphism does not have svg`);
	assert.equal(morphism._sig, sig, `${args.basename}: morphism signature ok`);
}

test('New morphism', assert =>
{
	const domain = diagram.getElement('t0');
	const codomain = diagram.getElement('t1');
	assert.ok(domain, 'Found domain');
	assert.ok(codomain, 'Found codomain');
	const args = {basename:'m0', domain:'t0', codomain:'t1', properName:'M1', description:'this is a test morphism'};
	const morphism = new Cat.Morphism(diagram, args);
	checkMorphism(assert, diagram, args, morphism, domain, codomain, "7666bafec59943f203906de61b0c5bff2c41e97505e3bfeed2ada533b795788a");
});

// args: from, domain, codomain, name, basename, sig, start, end, d, txy
function checkIndexMorphism(assert, diagram, args)
{
	const from = args.from;
	assert.ok(Cat.DiagramMorphism.IsA(from), 'Index morphism is a DiagramMorphism');
	assert.equal(from.angle, args.angle, 'Index morphism angle is ok');
	assert.equal(from.domain, args.domain, 'Index morphism domain is ok');
	assert.equal(from.codomain, args.codomain, 'Index morphism codomain is ok');
	assert.equal(from.start.x, args.start.x, 'Index morphism start.x is ok');
	assert.equal(from.start.y, args.start.y, 'Index morphism start.y is ok');
	assert.equal(from.end.x, args.end.x, 'Index morphism end.x is ok');
	assert.equal(from.end.y, args.end.y, 'Index morphism end.y is ok');
	assert.ok(!from.flipName, 'Index morphism flipName is ok');
	assert.equal(from.homSetIndex, -1, 'Index morphism hom set index is ok');
	assert.ok(from.svg, 'Index morphism svg exists');
	assert.ok(from.svg_name, 'Index morphism svg_name exists');
	assert.ok(from.svg_path, 'Index morphism svg_path exists');
	assert.ok(from.svg_path2, 'Index morphism svg_path2 exists');
	assert.equal(from.to, args.to, 'Index morphism target morphism is ok');
	assert.equal(from.basename, args.basename, 'Index morphism basename is ok');
	assert.equal(from.category, diagram.domain, 'Index category is ok');
	assert.equal(from.description, '', 'Index morphism description is ok');
	assert.equal(from.diagram, diagram, 'Index morphism diagram is ok');
	assert.ok(!from.dual, 'Index morphism is not dual');
	assert.equal(from.name, args.name, 'Index morphism name is ok');
	assert.equal(from.properName, from.basename, 'Index is not dual');
	assert.equal(from.refcnt, 1, 'Index refcnt is ok');
	assert.equal(from._sig, args.sig, 'Index signature is ok');
	assert.equal(from.svg, document.getElementById(args.id), 'Index svg is ok');
	assert.equal(from.svg_path, document.getElementById(`${args.id}_path`), 'Index path is ok');
	assert.equal(from.svg_path.dataset.name, args.name, 'Index path dataset name ok');
	assert.equal(from.svg_path.dataset.type, 'morphism', 'Index path dataset type ok');
	assert.dom(`#${from.elementId()}_path`).exists('Index path id is ok').hasClass('morphism', 'Svg has morphism class').hasClass('grabbable', 'Svg has grabbable class').
		hasAttribute('d', args.d, 'Index path d attribute ok').
		hasAttribute('marker-end', 'url(#arrowhead)', 'Index path marker-end attribute ok');
	assert.dom(`#${args.id}_path2`).exists('Index path2 id is ok');
	assert.equal(from.svg_path2, document.getElementById(`${args.id}_path2`), 'Index path2 is ok');
	assert.equal(from.svg_path2.dataset.name, args.name, 'Index path2 dataset name ok');
	assert.equal(from.svg_path2.dataset.type, 'morphism', 'Index path2 dataset type ok');
	assert.dom('#'+from.elementId() + '_path2').hasClass('grabme', 'Svg has grabme class').hasClass('grabbable', 'Svg has grabbable class').
		hasAttribute('d', args.d, 'Index path2 d attribute is ok');
	assert.equal(from.svg_name.dataset.name, args.name, 'Index path2 dataset name ok');
	assert.equal(from.svg_name.dataset.type, 'morphism', 'Index path2 dataset type ok');
	assert.dom(`#${args.id}_name`).exists('Index svg_name is ok').hasText(args.to.properName, 'Index properName text is ok').
		hasAttribute('text-anchor', args.textAnchor, 'Index text-anchor is ok').
		hasAttribute('x', args.txy.x, 'Index name text x coord is ok').hasAttribute('y', args.txy.y, 'Index name text y coord is ok');
}

test('Diagram.placeMorphism', assert =>
{
	const to = diagram.getElement('m0');
	assert.ok(Cat.Morphism.IsA(to), 'Found morphism');
	const domain = diagram.getElement('tester/test/o_0');
	const codomain = diagram.getElement('tester/test/o_1');
	const name = 'tester/test/m_0';
	const from = diagram.placeMorphism(null, to, domain, codomain, false, false);
	const id = 'el_tester--test--m_0';
	const grid = Cat.D.default.arrow.length;
	checkIndexMorphism(assert, diagram, {angle: 0, from, to, id, domain, codomain, name, basename:'m_0',
		sig:"0452fb6b1f9e40040141caaa361bafbb2aa47457f1525d637db26e57c0b42935", textAnchor:'middle',
		start:{x:229, y:grid}, end:{x:371, y:grid}, d:'M229,200 L371,200', txy:{x:"300", y:"188"}});
});

test('Create identity', assert =>
{
	const t0 = diagram.getElement('t0');
	const t1 = diagram.getElement('t1');
	const id = diagram.id(t0);
	assert.ok(Cat.Identity.IsA(id), 't0 id exists');
	checkMorphism(assert, diagram, {name:"tester/test/Id{tester/test/t0}dI", basename:"Id{tester/test/t0}dI", properName:'id'}, id, t0, t0,
		"ab519276ce681a5ffc0dfba60cbc8e9ab39fda63792225d75e145dc0dd642bda");
});

test('Diagram.placeMorphismByObject', assert =>
{
	const t0 = diagram.getElement('t0');
	assert.ok(Cat.CatObject.IsA(t0), 't0 is an object');
	const t1 = diagram.getElement('t1');
	assert.ok(Cat.CatObject.IsA(t1), 't1 is an object');
	const t0id = diagram.id(t0);
	const t1id = diagram.id(t1);
	const t0ndxName = 'tester/test/o_0';
	const t1ndxName = 'tester/test/o_1';
	const t2ndxName = 'tester/test/o_3';	// 2 was gen'd above
	const t0ndx = diagram.getElement(t0ndxName);
	const t1ndx = diagram.getElement(t1ndxName);
	let from = diagram.placeMorphismByObject(null, 'domain', t1ndxName, t1id.name, false);		// false arg#5 no test of save here
	assert.ok(Cat.DiagramMorphism.IsA(from), 'Placed morphism exists');
	const grid = Cat.D.default.arrow.length;
	checkIndexMorphism(assert, diagram, {angle: 0, from, to:t1id, id:'el_tester--test--m_1', domain:t1ndx, codomain:from.codomain, name:'tester/test/m_1', basename:'m_1',
		sig:"0d9763429ff9d15181a18daceebebac1f644b9d29ac0ad995d68280e5005b4b3", textAnchor:'middle',
		start:{x:429, y:grid}, end:{x:571, y:grid}, d:'M429,200 L571,200', txy:{x:"500", y:"188"}});

	from = diagram.placeMorphismByObject(null, 'codomain', t0ndxName, t0id.name, false);		// false arg#5 no test of save here
	assert.ok(Cat.DiagramMorphism.IsA(from), 'Placed morphism from codomain exists');
	const t2ndx = diagram.getElement(t2ndxName);
	assert.ok(t2ndx, 'Placed object for domain exists');
	checkIndexMorphism(assert, diagram, {angle: 0, from, to:t0id, id:'el_tester--test--m_2', domain:t2ndx, codomain:from.codomain, name:'tester/test/m_2', basename:'m_2',
		sig:"0c7a44e7f5fd910099f339555ee14bfe8c53e733f7b6af5c0271c310588fa058", textAnchor:'middle',
		start:{x:29, y:grid}, end:{x:171, y:grid}, d:'M29,200 L171,200', txy:{x:"100", y:"188"}});

	from = diagram.placeMorphismByObject(null, 'domain', t1ndxName, t1id.name, false);		// false arg#5 no test of save here
	assert.ok(Cat.DiagramMorphism.IsA(from), 'Placed morphism from center domain exists');
	const o4ndxName = 'tester/test/o_4';
	const o4ndx = diagram.getElement(o4ndxName);
	assert.ok(o4ndx, 'Placed object for codomain exists');
	checkIndexMorphism(assert, diagram, {angle:1.5707963267948966, from, to:t1id, id:'el_tester--test--m_3', domain:t1ndx, codomain:from.codomain, name:'tester/test/m_3',
		basename:'m_3', sig:"9631654edf972fb7f7513e4b7c4fab171f7e6aaaacdf3ad62ed31c5da632fc30", textAnchor:'start',
		start:{x:400, y:grid + 24}, end:{x:2 * grid, y:374}, d:'M400,224 L400,374', txy:{x:"412", y:"299"}});
});

test('Download Catalog', assert =>
{
	const didit = assert.async();
	Cat.R.FetchCatalog(function()
	{
		didit();
		assert.ok(true);
	});
});

test('Download HTML diagram', assert =>
{
	const didit = assert.async();
	Cat.R.DownloadDiagram('hdole/HTML', function()
	{
		didit();
		assert.ok(true);
	});
});

test('R.SelectDiagram', assert =>
{
	Cat.D.url = window.URL || window.webkitURL || window;
	Cat.R.diagram = null;
	Cat.R.SelectDiagram(diagram.name);
	assert.equal(Cat.R.diagram, diagram, 'Test diagram is the default diagram');
});

test('Diagram.makeSelected object', assert =>
{
	const o2 = diagram.getElement('tester/test/o_2');
	let sawit = false;
	const diditHappen = function(e)
	{
		assert.equal(e.detail.diagram, diagram, 'Select event diagram ok');
		assert.equal(e.detail.command, 'select', 'Select event diagram ok');
		assert.equal(e.detail.element, o2, 'Selected object matches');
		window.removeEventListener('Object', diditHappen);
		sawit = true;
	};
	window.addEventListener('Object', diditHappen);
	assert.equal(diagram.selected.length, 0, 'Diagram empty selected length ok');
	diagram.makeSelected(o2);
	assert.ok(sawit, 'Object select event occurred');
	assert.equal(diagram.selected.length, 1, 'Diagram selected length ok');
	const elt = document.getElementById(o2.elementId());
	assert.equal(elt.dataset.type, 'object', 'Selected object is an object');
	assert.dom('#' + o2.elementId()).hasClass('selected', 'Selected object has select class');
	assert.ok(diagram.selected.includes(o2), 'Selected object is the diagram selected array');
	const buttons = [...document.querySelectorAll('#toolbar-header .button')];
	let ndx = 0;
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Move toolbar', 'Toolbar has move').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create identity morphism', 'Toolbar has identity').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create named element', 'Toolbar has named element').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Select a morphism listed from a common domain', 'Toolbar has place from domain').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Select a morphism listed from a common codomain', 'Toolbar has place from codomain').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Copy an element', 'Toolbar has copy').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create factor morphism', 'Toolbar has create factor').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create factor morphism', 'Toolbar has create factor').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Attempt to assemble a morphism from a node in your diagram', 'Toolbar has assemble').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Give help for an item', 'Toolbar has help').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Close', 'Toolbar has close').hasProperty('mousedown');
	diagram.makeSelected(null);
	assert.dom('#' + o2.elementId()).doesNotHaveClass('selected', 'Deselected object does not have select class');
	assert.equal(diagram.selected.length, 0, 'Diagram selected set is empty');
});

test('Diagram.makeSelected morphism', assert =>
{
	const m1 = diagram.getElement('tester/test/m_1');
	let sawit = false;
	const diditHappen = function(e)
	{
		assert.equal(e.detail.diagram, diagram, 'Select event diagram ok');
		assert.equal(e.detail.command, 'select', 'Select event diagram ok');
		assert.equal(e.detail.element, m1, 'Selected morphism matches');
		window.removeEventListener('Morphism', diditHappen);
		sawit = true;
	};
	window.addEventListener('Morphism', diditHappen);
	assert.equal(diagram.selected.length, 0, 'Diagram empty selected length ok');
	diagram.makeSelected(m1);
	assert.ok(sawit, 'Morphism select event occurred');
	assert.equal(diagram.selected.length, 1, 'Diagram selected length ok');
	const elt = document.getElementById(m1.elementId());
	assert.dom('#' + m1.elementId() + '_path2').doesNotHaveClass('selected', 'Selected morphism path2 does not show select class');
	assert.dom('#' + m1.elementId() + '_path').hasClass('selected', 'Selected morphism path has select class');
	assert.dom('#' + m1.elementId() + '_name').hasClass('selected', 'Selected morphism name has select class');
	assert.ok(diagram.selected.includes(m1), 'Selected morphism is the diagram selected array');

	const buttons = [...document.querySelectorAll('#toolbar-header .button')];
	let ndx = 0;
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Move toolbar', 'Toolbar has move').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create named element', 'Toolbar has named element').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Detach a morphism\'s domain', 'Toolbar has domain detach').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Copy an element', 'Toolbar has copy').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Curry a morphism', 'Toolbar has curry').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Flip the name', 'Toolbar has flip name').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Show morphism graph', 'Toolbar has assemble').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Delete objects, morphisms or text', 'Toolbar has help').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Give help for an item', 'Toolbar has help').hasProperty('mousedown');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Close', 'Toolbar has close').hasProperty('mousedown');
	diagram.makeSelected(null);
	assert.dom('#' + m1.elementId()).doesNotHaveClass('selected', 'Deselected morphism does not have select class');
	assert.equal(diagram.selected.length, 0, 'Diagram selected set is empty');
	assert.dom('#' + m1.elementId() + '_path').doesNotHaveClass('selected', 'Selected morphism path does not have select class');
	assert.dom('#' + m1.elementId() + '_name').doesNotHaveClass('selected', 'Selected morphism name does not have select class');
});
