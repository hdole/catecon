const {module, test} = QUnit;

function cleanup()
{
	const locals = ['categories', 'diagramas', 'hdole/Basics.json', 'hdole/floats.json', 'hdole/hdole.json', 'hdole/HTML.json', 'hdole/Integers.json', 'hdole/Logic.json',
		'hdole/Narithmetics.json', 'hdole/Strings.json'];
	locals.map(file => localStorage.removeItem(file));
}

cleanup();

const StartOfRun = new Date();

module('Basics');

QUnit.config.reorder = false;
QUnit.config.hidepassed = true;

// overrides
Cat.R.sync = false;
Cat.D.url = window.URL || window.webkitURL || window;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Support Functions
//
function checkInfo(info, cmpInfo)
{
	return info.name === cmpInfo.name && info.basename === cmpInfo.basename && info.properName === cmpInfo.properName && info.description === cmpInfo.description &&
			info.timestamp === cmpInfo.timestamp && info.user === cmpInfo.user && info.references.length === cmpInfo.references.length &&
			info.references.reduce((r, ref, i) => r && ref === cmpInfo.references[i], true);
}

function checkArgs(assert, obj, args)
{
	for(const arg in args)
		if (args.hasOwnProperty(arg))
			assert.ok(obj[arg] === args[arg], `${obj.name} ${arg} is ok`);
}

function checkMorphism(assert, diagram, args, morphism, domain, codomain, sig)
{
	const basename = args.basename;
	assert.equal(morphism.basename, basename, `${basename}: morphism basename ok`);
	const name = `${diagram.name}/${basename}`;
	assert.equal(morphism.name, name, `${basename}: morphism name ok`);
	if ('properName' in args)
		assert.equal(morphism.properName, args.properName, `${basename}: morphism properName ok`);
	else
		assert.equal(morphism.properName, basename, `${basename}: morphism properName ok`);
	if ('description' in args)
		assert.equal(morphism.description, args.description, `${basename}: morphism description ok`);
	assert.equal(morphism.domain, domain, `${basename}: morphism domain ok`);
	assert.equal(morphism.codomain, codomain, `${basename}: morphism codomain ok`);
	assert.equal(morphism.diagram, diagram, `${basename}: morphism belongs to diagram`);
	assert.equal(morphism.category, PFS, `${basename}: morphism belongs to category`);
	assert.ok(diagram.getElement(basename), `Can find morphism by basename`);
	assert.ok(diagram.getElement(name), `Can find morphism by name`);
	assert.ok(!morphism.dual, `${basename}: morphism is not dual`);
	if ('refcnt' in args)
		assert.equal(morphism.refcnt, args.refcnt, `${basename}: morphism has no references`);
	else
		assert.equal(morphism.refcnt, 0, `${basename}: morphism has no references`);
	assert.ok(!('svg' in morphism), `${basename}: morphism does not have svg`);
	assert.equal(morphism._sig, sig, `${basename}: morphism signature ok`);
}

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
	assert.dom(`#${args.id}_name`).exists('Index svg_name is ok').hasText('properName' in args ? args.properName : args.to.properName, 'Index properName text is ok').
		hasAttribute('text-anchor', args.textAnchor, 'Index text-anchor is ok').
		hasAttribute('x', args.txy.x, 'Index name text x coord is ok').hasAttribute('y', args.txy.y, 'Index name text y coord is ok');
}

function checkSelected(assert, element)
{
	const id = element.elementId();
	if (Cat.DiagramMorphism.IsA(element))
	{
		assert.dom('#' + id).exists('DiagramMorphism <g> exists');
		assert.dom('#' + id + '_path2').doesNotHaveClass('selected', 'Selected morphism path2 does not show select class');
		assert.dom('#' + id + '_path').hasClass('selected', 'Selected morphism path has select class');
		assert.dom('#' + id + '_name').hasClass('selected', 'Selected morphism name has select class');
		assert.ok(diagram.selected.includes(element), 'Selected morphism is in the diagram selected array');
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Tests
//
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

test('SaveLocalDiagramList', assert =>
{
	Cat.R.LocalDiagrams.set(testDiagramInfo.name, testDiagramInfo);
	Cat.R.SaveLocalDiagramList();
	Cat.R.LocalDiagrams.delete(testDiagramInfo.name);
	diagrams = JSON.parse(localStorage.getItem('diagrams'));
	assert.equal(diagrams.length, 1, 'One diagram info saved');
	const args = Cat.U.Clone(testDiagramInfo);
	delete args.references;
	checkArgs(assert, diagrams[0], args);
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
	const didit = assert.async();
	Cat.R.cloud.load(function()
	{
		assert.dom('#cloud-amazon').hasAttribute('src', "https://sdk.amazonaws.com/js/aws-sdk-2.306.0.min.js", 'Src is ok').hasAttribute('type', "text/javascript", 'type is ok');
		didit();
	});
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

test('Download catalog', assert =>
{
	const didit = assert.async();
	const lookforit = function()
	{
		const catalog = Cat.R.catalog;
		assert.ok(catalog.size > 0, 'Downloaded catalog');
		assert.ok(catalog.has('hdole/Integers'), 'hdole/Integers ok');
		assert.ok(catalog.has('hdole/Logic'), 'hdole/Logic ok');
		assert.ok(catalog.has('Anon/Home'), 'Anon/Home ok');
		assert.ok(catalog.has('hdole/Narithmetics'), 'Anon/Narithmetics ok');
		assert.ok(catalog.has('hdole/floats'), 'hdole/floats ok');
		assert.ok(catalog.has('hdole/Basics'), 'hdole/Basics ok');
		assert.ok(catalog.has('hdole/Strings'), 'hdole/Strings ok');
		assert.ok(catalog.has('hdole/HTML'), 'hdole/HTML ok');
		didit();
	};
	assert.equal(Cat.R.catalog.size, 0, 'Cat.R.catalog size empty at start');
	Cat.R.FetchCatalog(lookforit);
});

test('Check catalog', assert =>
{
	const didit = assert.async();
	fetch(Cat.R.cloud.getURL() + '/catalog.json').then(function(response)
	{
		if (response.ok)
		{
			response.json().then(function(data)
			{
				data.diagrams.map(d => assert.equal(JSON.stringify(d), JSON.stringify(Cat.R.catalog.get(d.name), `online catalog entry matches: ${d.name}`)));
				const catSection = document.getElementById('diagram-catalog-section');
				assert.dom(catSection).hasTagName('div', 'Diagram catalog section ok').hasClass('section', 'Diagram catalog section has sectioni clsss');
				const catalogElt = catSection.querySelector('.catalog');
				const timestamps = [];
				const names = [];
				assert.equal(catalogElt.children.length, data.diagrams.length, 'Diagram catalog section count ok');
				let entry = catalogElt.firstChild;
				while(entry)
				{
					timestamps.push(Number.parseInt(entry.dataset.timestamp));
					const name = entry.dataset.name;
					names.push(name);
					const nameId = Cat.U.SafeId(name);
					assert.ok(name, 'Entry has name in dataset');
					const id = `diagram-catalog-section-${nameId}`;
					assert.dom(entry).hasTagName('div', 'Diagram catalog section entry is a div').hasClass('grabbable', 'Entry has class grabbable').
						hasAttribute('id', id, 'Entry id is ok').hasAttribute('draggable', "true", 'Entry is draggable');
					assert.equal(typeof entry.ondragstart, 'function', 'Entry has ondragstart function');
					const img = entry.querySelector('img');
					assert.dom(img).hasAttribute('width', "200", 'Entry img width ok').hasAttribute('height', '150', 'Entry img height ok').
						hasAttribute('id', 'img-el_' + nameId, 'Entry img id ok');
					entry = entry.nextSibling;
				}
				for (let i=0; i<timestamps.length -1; ++i)
				{
					const ok = timestamps[i] > timestamps[i+1];
					assert.ok(ok, `Timestamp order ${names[i]} vs ${names[i+1]} ok`);
				}
				didit();
			});
		}
	});
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
	assert.ok(diagram.timestamp > StartOfRun, 'Diagram timestamp ok');
	assert.ok(diagram.timestamp <= Date.now(), 'Diagram timestamp ok');
	assert.equal(diagram.refcnt, 0, 'Diagram refrence count ok');
	assert.equal(diagram.codomain, PFS, 'Diagram codomain ok');
	assert.ok(Cat.IndexCategory.IsA(diagram.domain), 'Diagram domain ok');
	assert.equal(diagram.domain.name, diagram.name + '_Index', 'Diagram domain name ok');
	assert.equal(diagram._sig, "1647952c5a96c4a8239bcf9afb5ff95000c6f4fa27ff902ff24dac41d21fea89", 'Diagram signature is ok');
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
		window.removeEventListener('Object', lookforit);
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
		assert.ok(true);
		didit();
	});
});

test('Download HTML diagram', assert =>
{
	const didit = assert.async();
	Cat.R.DownloadDiagram('hdole/HTML', function()
	{
		assert.ok(true);
		const basics = JSON.parse(localStorage.getItem('hdole/Basics.json'));
		assert.ok(basics.elements.filter(elt => elt.name === 'hdole/Basics/#0').length === 1, '#0 ok');
		assert.ok(basics.elements.filter(elt => elt.name === 'hdole/Basics/#1').length === 1, '#1 ok');
		// hide the html diagram
		Cat.R.diagram.hide();
		didit();
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
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Move toolbar', 'Toolbar has move');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create identity morphism', 'Toolbar has identity');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create named element', 'Toolbar has named element');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Select a morphism listed from a common domain', 'Toolbar has place from domain');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Select a morphism listed from a common codomain', 'Toolbar has place from codomain');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Copy an element', 'Toolbar has copy');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create factor morphism', 'Toolbar has create factor');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create factor morphism', 'Toolbar has create factor');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Attempt to assemble a morphism from a node in your diagram', 'Toolbar has assemble');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Give help for an item', 'Toolbar has help');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Close', 'Toolbar has close');
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
	checkSelected(assert, m1);

	const buttons = [...document.querySelectorAll('#toolbar-header .button')];
	let ndx = 0;
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Move toolbar', 'Toolbar has move');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create named element', 'Toolbar has named element');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Detach a morphism\'s domain', 'Toolbar has domain detach');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Copy an element', 'Toolbar has copy');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Curry a morphism', 'Toolbar has curry');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Flip the name', 'Toolbar has flip name');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Show morphism graph', 'Toolbar has assemble');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Delete objects, morphisms or text', 'Toolbar has help');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Give help for an item', 'Toolbar has help');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Close', 'Toolbar has close');

	diagram.makeSelected(null);
	assert.dom('#' + m1.elementId()).doesNotHaveClass('selected', 'Deselected morphism does not have select class');
	assert.equal(diagram.selected.length, 0, 'Diagram selected set is empty');
	assert.dom('#' + m1.elementId() + '_path').doesNotHaveClass('selected', 'Selected morphism path does not have select class');
	assert.dom('#' + m1.elementId() + '_name').doesNotHaveClass('selected', 'Selected morphism name does not have select class');
});

function getButtonClick(domElt)
{
	const svg = domElt.firstChild;
	const pushBtn = svg.lastChild;
	return pushBtn.onclick;
}

test('Compose three morphisms', assert =>
{
	const m2 = diagram.getElement('tester/test/m_2');
	diagram.makeSelected(m2);
	assert.equal(diagram.selected.length, 1, 'Only one element selected');
	checkSelected(assert, m2);
	const m0 = diagram.getElement('tester/test/m_0');
	diagram.addSelected(m0);
	assert.equal(diagram.selected.length, 2, 'Two elements selected');
	checkSelected(assert, m0);
	const m3 = diagram.getElement('tester/test/m_3');
	diagram.addSelected(m3);
	assert.equal(diagram.selected.length, 3, 'Two elements selected');
	checkSelected(assert, m3);

	const buttons = [...document.querySelectorAll('#toolbar-header .button')];
	let ndx = 0;
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Move toolbar', 'Toolbar has move');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create composite', 'Toolbar has move');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create product of two or more objects or morphisms', 'Toolbar has move');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Create coproduct of two or more objects or morphisms', 'Toolbar has move');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Show morphism graph', 'Toolbar has assemble');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Delete objects, morphisms or text', 'Toolbar has help');
	assert.dom(buttons[ndx++]).hasAttribute('title', 'Close', 'Toolbar has close');

	// click the composite button
	const didit = assert.async();
	let m4 = null;
	const lookforit = function(e)
	{
		const args = e.data;
		if (args.command === 'Info' || args.command === 'Load' || args.command === 'LoadEquivalences')
			return;
		assert.equal(args.command, 'CheckEquivalence', 'Equivalences for composite were loaded');
		assert.equal(args.diagram, diagram.name, 'CheckEquivalence has correct diagram');
		assert.ok(args.isEqual, 'CheckEquivalence is equal');
		assert.equal(args.cell, "a65c3dda8c4de792efae970001a5de43187f12681d47f42b8a3ddd6315d458c2", 'Message has correct cell');
		const cell = diagram.domain.cells.get(args.cell);
		assert.ok(Cat.Cell.IsA(cell), 'Cell is ok');
		assert.equal(cell.commutes, "composite", 'Cell commutes is composite');
		assert.equal(cell.properName, "&#8797;", 'Cell name is ok');
		assert.equal(cell.signature, "a65c3dda8c4de792efae970001a5de43187f12681d47f42b8a3ddd6315d458c2", 'Cell has correct signature');
		assert.equal(cell.refcnt, 0, 'Cell has no reference count');
		assert.equal(cell.to, null, 'Cell has no to');
		assert.equal(cell.description, '', 'Cell has no description');
		assert.equal(cell.diagram, diagram, 'Cell has correct diagram');
		assert.equal(cell.name, 'tester/test/r_0', 'Cell height ok');
		assert.equal(cell.height, 24, 'Cell height ok');
		assert.equal(cell.width, 0, 'Cell width ok');
		assert.equal(cell.x, 267, 'Cell x ok');
		assert.equal(cell.y, 267, 'Cell y ok');
		assert.equal(cell.left.length, 3, 'Cell left leg length ok');
		assert.equal(cell.right.length, 1, 'Cell right leg length ok');
		cell.left.map((m, i) => assert.equal(m, m4.morphisms[i], `Cell left leg matches for index ${i}`));
		assert.equal(cell.right[0], m4, 'Cell right leg ok');
		const svg = cell.svg;
		assert.ok(svg, 'Cell svg exists');
		assert.dom(svg).hasTagName('text', 'Svg is text').hasAttribute('text-anchor', 'middle', 'Cell text-anchor ok').hasClass('cellTxt', 'Cell class ok').
			hasText('≝', 'Cell text ok').doesNotHaveClass('badGlow', 'Cell does not have badGlow').
			hasAttribute('x', cell.x.toString(), 'Cell text x ok').hasAttribute('y', cell.y.toString(), 'Cell text y ok');
		assert.equal(svg.dataset.type, 'assertion', 'Svg dataset type ok');
		assert.equal(svg.dataset.name, 'tester/test/r_0', 'Svg dataset name ok');
		// cleanup
		Cat.R.workers.equality.removeEventListener('message', lookforit);
		didit();
	};
	Cat.R.workers.equality.addEventListener('message', lookforit);
	const compBtn = buttons[1];
	const clicker = getButtonClick(compBtn);
	const domain = m2.domain;
	const codomain = m3.codomain;
	clicker();		// create composite
	m4 = diagram.getElement('tester/test/m_4');
	assert.ok(Cat.DiagramComposite.IsA(m4), 'DiagramComposite exists');
	assert.ok(Cat.Composite.IsA(m4.to), 'Composite exists');
	m4.morphisms.map((m, i) => assert.equal(m.to, m4.to.morphisms[i], `Component morphism ${i} ok`));
	m4.morphisms.map((m, i) => assert.equal(m.refcnt, 2, `Component morphism ${i} refcnt ok`));
	checkSelected(assert, m4, 'DiagramComposite is selected');
	assert.equal(diagram.selected.length, 1, 'Only one element selected');
	const to = m4.to;
	assert.ok(Cat.Composite.IsA(to), 'Composite ok');
	checkMorphism(assert, diagram,
		{
			basename:		"Cm{tester/test/Id{tester/test/t0}dI,tester/test/m0,tester/test/Id{tester/test/t1}dI}mC",
			properName:		"id&#8728;M1&#8728;id",
			refcnt:			1,
		},
		to, domain.to, codomain.to, "447d19ec2a011a55cbd8e5ff415102d5ca903e3ccf7f27b2394f65876cb72e30");
	checkIndexMorphism(assert, diagram, {angle: 0.4636476090008061, from:m4, to, id:m4.elementId(), domain, codomain, name:'tester/test/m_4', basename:'m_4',
		properName:'id∘M1∘id',
		sig:"10ddaa9e14eb0c3e9181a988312d7f379f12befa14f17dda5d19d721ccc15900", textAnchor:'start',
		start:{x:29, y:214}, end:{x:371, y:386}, d:'M29,214 L371,386', txy:{x:"205", y:"289"}});
});

test('Diagram.addReference', assert =>
{
	const refName = 'hdole/Integers';
	diagram.addReference(refName);
	assert.ok(diagram.references.size > 0, 'There are referenced diagrams');
	const integers = Cat.R.$CAT.getElement(refName);
	assert.ok(Cat.Diagram.IsA(integers), 'Integers diagram found');
	assert.equal(integers.refcnt, 2, 'Integers refcnt ok');
	assert.ok(diagram.references.has(refName), 'Diagram references has integers');
	assert.ok(diagram.allReferences.has('hdole/Integers'), 'Diagram allReferences has Integers');
	assert.ok(diagram.allReferences.has('hdole/Narithmetics'), 'Diagram allReferences has Narithmetics');
	assert.ok(diagram.allReferences.has('hdole/Logic'), 'Diagram allReferences has Logic');
	assert.ok(diagram.allReferences.has('hdole/Basics'), 'Diagram allReferences has Basics');
	assert.equal(diagram.allReferences.size, 4, 'Diagram allReference count ok');
	// object panel
	assert.ok(Cat.D.objectPanel, 'Object panel exists');
	assert.ok(Cat.D.objectPanel.referenceSection.catalog.children.length > 0, 'Object panel reference section populated');
	assert.equal(Cat.D.objectPanel.referenceSection.type, 'Object');
	// morphism panel
	assert.ok(Cat.D.objectPanel, 'Morphism panel exists');
	assert.ok(Cat.D.morphismPanel.referenceSection.catalog.children.length > 0, 'Morphism panel reference section populated');
	assert.equal(Cat.D.morphismPanel.referenceSection.type, 'Morphism');
});

test('Place referenced morphism', assert =>
{
	const to = diagram.getElement("hdole/Integers/add");
	assert.ok(to, 'Found integer addition');
	const grid = Cat.D.default.arrow.length;
	const domain = {x:4 * grid, y:grid};
	const codomain = {x:5 * grid, y:grid};
	const from = diagram.placeMorphism(null, to, domain, codomain, false, false);
	assert.ok(Cat.DiagramMorphism.IsA(from), 'DiagramMorphism exists');
	diagram.makeSelected(from);
	checkSelected(assert, from);
	const btns = [...document.querySelectorAll('#toolbar-header .button')];
	const runBtns = btns.filter(btn => btn.dataset.name === 'run');
	assert.equal(runBtns.length, 1, 'Got one run button from toolbar');
	const runBtn = runBtns[0];
	runBtn.firstChild.lastChild.onclick();
	const in0 = document.getElementById(" hdole/Integers/Z 0");
	assert.dom(in0).hasTagName('input', 'Input 0 ok');
	const in1 = document.getElementById(" hdole/Integers/Z 1");
	assert.dom(in1).hasTagName('input', 'Input 1 ok');
	in0.value = 3;
	in1.value = 4;
	const evalBtn = Cat.D.toolbar.help.querySelector('.btn');
	assert.dom(evalBtn).hasTagName('rect', 'Evaluate button ok');
	assert.equal(evalBtn.onclick.toString(), "function onclick(evt) {\nCat.R.Actions.javascript.evaluate(event, Cat.R.diagram, 'hdole/Integers/add', Cat.R.Actions.run.postResult)\n}",
		'Eval button onclick ok');
	const didit = assert.async();
	const handler = function(result)
	{
		Cat.R.Actions.run.postResult(result);
		const dataDiv = document.getElementById('run-display');
		assert.dom(dataDiv).hasTagName('div', 'Data div ok');
		const dataDivs = [...dataDiv.querySelectorAll('div')];
		assert.equal(dataDivs.length, 1, 'One data div ok');
		const spans = [...dataDivs[0].querySelectorAll('span')];
		assert.equal(spans[0].innerText, '3,4', 'Input ok');
		assert.equal(spans[2].innerText, '7', 'Output ok');
		didit();
	};
	Cat.R.Actions.javascript.evaluate(event, Cat.R.diagram, 'hdole/Integers/add', handler);
	/*
	evalBtn.onclick();
	*/
});
