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
//Cat.D.default.autohideTimer = Number.MAX_VALUE;
Cat.D.default.autohideTimer = 10000000;

const halfFontHeight = Cat.D.default.font.height / 2;
const grid = Cat.D.default.arrow.length;
const descriptionText = 'This is a test and only a test';

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

function checkMorphism(assert, diagram, args)
{
	const morphism = args.morphism;
	const basename = args.basename;
	const domain = args.domain;
	const codomain = args.codomain;
	const sig = args.sig;
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
	if ('instanceof' in args)
		assert.ok(morphism instanceof args.instanceof);
	if ('dual' in args)
		assert.equal(morphism.dual, args.dual);
	if ('factors' in args)
		assert.deepEqual(morphism.factors, args.factors);
	if ('morphisms' in args)
	{
		assert.equal(morphism.morphisms.length, args.morphisms.length);
		morphism.morphisms.map((m, i) => assert.equal(m.name, args.morphisms[i].name));
	}
}

// args: from, domain, codomain, name, basename, sig, start, end, d, txy
function checkIndexMorphism(assert, diagram, args)
{
	const from = args.from;
	assert.ok(from instanceof Cat.DiagramMorphism, 'Index morphism is a DiagramMorphism');
	assert.equal(from.angle, args.angle, 'Index morphism angle is ok');
	assert.equal(from.domain, args.domain, 'Index morphism domain is ok');
	assert.equal(from.codomain, args.codomain, 'Index morphism codomain is ok');
	assert.equal(from.start.x, args.start.x, 'Index morphism start.x is ok');
	assert.equal(from.start.y, args.start.y, 'Index morphism start.y is ok');
	assert.equal(from.end.x, args.end.x, 'Index morphism end.x is ok');
	assert.equal(from.end.y, args.end.y, 'Index morphism end.y is ok');
	assert.ok(!from.flipName, 'Index morphism flipName is ok');
	const homSetIndex = 'homSetIndex' in args ? args.homSetIndex : -1;
	assert.equal(from.homSetIndex, homSetIndex, 'Index morphism hom set index is ok');
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
	const properName = procit('properName' in args ? args.properName : args.to.properName);
	assert.dom(`#${args.id}_name`).exists('Index svg_name is ok').hasText(properName, 'Index properName text is ok').
		hasAttribute('text-anchor', args.textAnchor, 'Index text-anchor is ok').
		hasAttribute('x', args.txy.x, 'Index name text x coord is ok').hasAttribute('y', args.txy.y, 'Index name text y coord is ok');
}

function checkSelected(assert, element)
{
	assert.ok(diagram.selected.includes(element), `${element.basename} Selected element is in the diagram selected array`);
	const id = '#' + element.elementId();
	if (element instanceof Cat.DiagramMorphism)
	{
		assert.dom(id).exists(`${element.basename} DiagramMorphism <g> exists`);
		assert.dom(id + '_path2').doesNotHaveClass('selected', `${element.basename} Selected morphism path2 does not show select class`);
		assert.dom(id + '_path').hasClass('selected', `${element.basename} Selected morphism path has select class`);
		assert.dom(id + '_name').hasClass('selected', `${element.basename} Selected morphism name has select class`);
	}
	else if (element instanceof Cat.DiagramObject)
	{
		assert.dom(id).hasTagName('text', `${element.basename} text tag ok`).
			hasAttribute('text-anchor', 'middle', `${element.basename} text-anchor ok`).
			hasAttribute('x', element.x.toString(), `${element.basename} x ok`).
			hasAttribute('y', (element.y + halfFontHeight).toString(), `${element.basename} y ok`).
			hasClass('object', `${element.basename} object class ok`).
			hasClass('grabbable', `${element.basename} grabbable class ok`).
			hasClass('selected', `${element.basename} selected class ok`).
			hasText(Cat.H3.span(element.to.properName).innerText, `${element.basename} Proper name ok`);
	}
	else if (element instanceof Cat.DiagramText)
	{
		assert.dom(id).hasTagName('g', `${element.basename} text tag ok`).
			hasAttribute('text-anchor', 'left', `${element.basename} text-anchor ok`).
			hasAttribute('transform', `translate(${element.x} ${element.y})`, `${element.basename} g translate ok`).
			hasClass('diagramText', `${element.basename} diagramText class ok`).
			hasClass('grabbable', `${element.basename} grabbable class ok`).
			hasClass('selected', `${element.basename} selected class ok`).
			hasText(Cat.H3.span(element.description).innerText, 'description ok');
	}
}

function checkNotSelected(assert, element)
{
	assert.ok(!diagram.selected.includes(element), 'Selected element is not in the diagram selected array');
	const id = '#' + element.elementId();
	if (element instanceof Cat.DiagramMorphism)
	{
		assert.dom(id).exists('DiagramMorphism <g> exists');
		assert.dom(id + '_path2').doesNotHaveClass('selected', 'Selected morphism path2 does not have select class');
		assert.dom(id + '_path').doesNotHaveClass('selected', 'Selected morphism path does not have select class');
		assert.dom(id + '_name').doesNotHaveClass('selected', 'Selected morphism name does not have select class');
	}
	else if (element instanceof Cat.DiagramObject)
	{
		assert.dom(id).hasTagName('text', 'text tag ok').
			hasAttribute('text-anchor', 'middle', 'text-anchor ok').
			hasAttribute('x', element.x.toString(), 'x ok').
			hasAttribute('y', (element.y + halfFontHeight).toString(), 'y ok').
			hasClass('object', 'object class ok').hasClass('grabbable', 'grabbable class ok').doesNotHaveClass('selected', 'not selected class ok').
			hasText(Cat.H3.span(element.to.properName).innerText, 'Proper name ok');
	}
	else if (element instanceof Cat.DiagramText)
	{
		assert.dom(id).hasTagName('g', 'text g tag ok').
			hasAttribute('text-anchor', 'left', 'text-anchor ok').
			hasAttribute('transform', `translate(${element.x} ${element.y})`, 'g translate ok').
			hasClass('diagramText', 'diagramText class ok').hasClass('grabbable', 'grabbable class ok').doesNotHaveClass('selected', 'not selected class ok').
			hasText(Cat.H3.span(element.description).innerText, 'description ok');
	}
}

function checkToolbarStart(assert)
{
	const toolbar = document.getElementById('toolbar');
	assert.dom(toolbar).hasTagName('div').hasClass('toolbar').hasStyle({display:'block'});
	const toolbarHeader = document.getElementById('toolbar-header');
	assert.dom(toolbarHeader).hasTagName('div').hasClass('buttonBarLeft');
	const toolbarHelp = document.getElementById('toolbar-help');
	assert.dom(toolbarHelp).hasTagName('div');
	assert.equal(toolbarHelp.children.length, 0, 'Toolbar help no children ok');
	const toolbarError = document.getElementById('toolbar-error');
	assert.dom(toolbarError).hasTagName('div');
	assert.equal(toolbarError.children.length, 0, 'Toolbar error no children ok');
}

function getButtonClick(domElt)
{
	const svg = domElt.firstChild;
	const pushBtn = svg.lastChild;
	return pushBtn.onclick;
}

function getToolbarButtons()
{
	return [...document.querySelectorAll('#toolbar-header .button')];
}

function checkToolbarButtons(assert, names)
{
	const btns = getToolbarButtons();
	names.map((name, i) => assert.equal(btns[i].dataset.name, name, `Button name ${name} ok`));
}

function getToolbarButton(name)
{
	return getToolbarButtons().filter(b => b.dataset.name === name)[0];
}

function checkButton(assert, btn, name, title)
{
	assert.dom(btn).hasTagName('span').hasClass('button', `Button ${name} class ok`).hasAttribute('title', title, 'Title ok').hasStyle({'vertical-align':'middle'});
	assert.equal(btn.dataset.name, name, 'Name ok');
	const svg = btn.firstElementChild;
	assert.dom(svg).hasTagName('svg', 'Svg ok');
	const bbox = svg.getBBox();
	assert.equal(bbox.x, 0, `${name} x ok`);
	assert.equal(bbox.y, 0, `${name} y ok`);
	assert.equal(bbox.width, 320, `${name} width ok`);
	assert.equal(bbox.height, 320, `${name} height ok`);
	const rect = svg.lastElementChild;
	assert.dom(rect).hasTagName('rect', 'Button rect ok').hasClass('btn', 'Button rect class ok').
		hasAttribute('x', '0', 'X ok').hasAttribute('y', '0', 'Y ok').hasAttribute('width', '320', 'X ok').hasAttribute('height', '320', 'X ok');
	assert.equal(typeof rect.onclick, 'function', 'Button onclick ok');
}

function selectObject(assert, name)
{
	const obj = diagram.getElement('tester/test/o_8');
	diagram.makeSelected(obj);
	checkSelected(assert, obj);
	assert.ok(obj instanceof Cat.DiagramObject, 'DiagramObject ok');
	checkObject(assert, name);
	return obj;
}

function checkObject(assert, name)
{
	const elt = diagram.getElement(name);
	const domElt = document.getElementById(elt.elementId());
	assert.dom(domElt).hasTagName('text', 'text tag ok');
	assert.equal(elt.svg, domElt, 'elements equal');
	assert.equal(elt.x, domElt.getAttribute('x'), 'x offset ok');
	assert.equal(elt.y, Number.parseInt(domElt.getAttribute('y')) - halfFontHeight, 'y offset ok');
	assert.ok(elt.to.refcnt > 0, 'reference count ok');
	return elt;
}

function procit(text)
{
	return Cat.H3.span(text).innerText;
}

function simMouseEvent(elt, type, args)
{
	const nuArgs = Cat.U.Clone(args);
	if (!('bubbles' in args))
		nuArgs.bubbles = true;
	const event = new MouseEvent(type, nuArgs);
	elt.dispatchEvent(event);
}

function simMouseClick(elt, args)
{
	simMouseEvent(elt, 'mousedown', {clientX:950, clientY:400});
	simMouseEvent(elt, 'mouseup', {clientX:950, clientY:400});
}

function simKeyboardEvent(elt, type, args)
{
	const nuArgs = Cat.U.Clone(args);
	if (!('bubbles' in args))
		nuArgs.bubbles = true;
	const event = new KeyboardEvent(type, nuArgs);
	elt.dispatchEvent(event);
}

function checkIsolatedMorphism(assert, m)
{
	assert.equal(m.domain.domains.size, 1, `Morphism ${m.name} domain domains size ok`);
	assert.equal(m.domain.codomains.size, 0, `Morphism ${m.name} domain domains size ok`);
	assert.equal(m.codomain.domains.size, 0, `Morphism ${m.name} domain domains size ok`);
	assert.equal(m.codomain.codomains.size, 1, `Morphism ${m.name} domain domains size ok`);
}

function checkConnector(assert, obj)
{
	assert.equal(obj.domains.size, 1, `connector ${obj.name} domains size ok`);
	assert.equal(obj.codomains.size, 1, `connector ${obj.name} codomains size ok`);
}

function clickDragRelease(assert, element, start, target)
{
	const isIndex = Cat.U.IsIndexElement(element);
	const svg = isIndex ? element.svg : element;
	simMouseEvent(svg, 'mousemove', start);
	simMouseEvent(svg, 'mouseenter', start);
	simMouseEvent(svg, 'mousedown', start);
	isIndex && checkSelected(assert, element);
	simMouseEvent(svg, 'mousemove', target);
	simMouseEvent(svg, 'mouseup', target);
	if (isIndex)
	{
		assert.equal(element.x, target.clientX, 'dragged x ok');
		assert.equal(element.y, target.clientY, 'dragged y ok');
	}
	simMouseEvent(svg, 'mouseleave', target);
}

function selectElement(assert, element)
{
	const coords = {clientX:element.x, clientY:element.y};
	simMouseEvent(element.svg, 'mousedown', coords);
	simMouseEvent(element.svg, 'mouseup', coords);
	checkSelected(assert, element);
}

function checkDiagramTextHelp(assert, textElt, height, weight)
{
	const help = Cat.D.toolbar.help;
	assert.equal(help.children.length, 1, 'text help has one child');
	const helpDiv = help.firstChild;
	assert.dom(helpDiv).hasTagName('div').hasAttribute('id', textElt.elementId());
	const descElt = helpDiv.firstChild;
	assert.dom(descElt).hasTagName('description').hasClass('tty').hasAttribute('id', 'descriptionElt').hasText(textElt.description);
	let editBtn = descElt.nextSibling;
	assert.dom(editBtn).hasTagName('span').hasAttribute('title', 'Commit editing').hasClass('button').hasStyle({'vertical-align':'middle'});
	const table = editBtn.nextSibling;
	assert.dom(table).hasTagName('table');
	const rows = [...table.querySelectorAll('tr')];
	rows.map(r => assert.dom(r).hasClass('sidenavRow'));
	let tds = rows[0].querySelectorAll('td');
	assert.dom(tds[0]).hasText('Text height:');
	const input = tds[1].firstChild;
	assert.dom(input).hasTagName('input').hasClass('in100').hasAttribute('id', 'toolbar-help-text-height').hasAttribute('type', 'number').hasAttribute('min', '3').
		hasAttribute('max', '500').hasAttribute('width', '8').hasValue(height);
	tds = rows[1].querySelectorAll('td');
	assert.dom(tds[0]).hasText('Text weight:');
	const select = tds[1].firstChild;
	assert.dom(select).hasTagName('select').hasValue(weight);
}

/*
function simKeyclick(element, code, control = false;)
{
	simKeyboardEvent(element, 'keydown', {code, key:code});
	simKeyboardEvent(element, 'keyup', {code, key:code});
}
*/

function checkDiagramPanelEntry(assert, section, element, dgrm)
{
	const nameId = Cat.U.SafeId(dgrm.name);
	const id = `diagram-${section}-section-${nameId}`;
	assert.dom(element).hasTagName('div').hasClass('grabbable').hasAttribute('id', id).hasAttribute('draggable', "true");
	assert.equal(element.dataset.name, dgrm.name);
	assert.ok(Number.parseInt(element.dataset.timestamp) <= dgrm.timestamp);	// TODO???
	assert.equal(typeof element.ondragstart, 'function');
	// table
	const rows = element.querySelectorAll('tr');
	assert.dom(rows[0].firstChild.firstChild).hasTagName('h4').hasText(dgrm.properName);
	// td
	const td = rows[1].firstChild;
	assert.dom(td).hasTagName('td').hasClass('white').hasAttribute('colspan', '2');
	// a
	const aLink = td.firstChild;
	assert.dom(aLink).hasTagName('a');
	assert.equal(aLink.onclick.toString(), `function onclick(event) {\nCat.D.diagramPanel.collapse();Cat.R.SelectDiagram('${dgrm.name}')\n}`);
	// image
	const img = element.querySelector('img');
	assert.equal(img.parentNode, aLink);
	assert.dom(img).hasAttribute('width', "200").hasAttribute('height', '150').hasAttribute('id', 'img-el_' + nameId);
}

function clickOnElement(assert, elt)
{
	assert.ok(elt instanceof Cat.Element);
	xy = {clientX:elt.x, clientY:elt.y};
	simMouseEvent(elt.svg, 'mouseenter', xy);
	simMouseEvent(elt.svg, 'mousedown', xy);
	simMouseEvent(elt.svg, 'mouseup', xy);
	simMouseEvent(elt.svg, 'mouseleave', xy);
}

function getRepresentation(domElt)
{
	const rep = {tagName:domElt.tagName};
	const attrs = [...domElt.attributes];
	if (domElt.classList.length > 0)
		rep.classList = [...domElt.classList];
	attrs.map(attr =>
	{
		switch(attr.nodeName)
		{
			case 'class':
				break;		// skip these
			default:
				rep[attr.nodeName] = attr.nodeValue;
				break;
		}
	});
	if (domElt.children.length === 0 && domElt.innerText !== '')
		rep.innerText = domElt.innerText;
	if (rep.tagName === 'INPUT')
		rep.value = domElt.value;
//	rep.listeners = [];
//	const events = ['click', 'focus', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseup'];
//	events.map(name =>
//	{
//		const handler = `on${name}`;
//		if (domElt[handler])
//			rep.listeners.push([handler, domElt[handler].toString()]);
//	});
	if (domElt.children.length > 0)
	{
		rep.children = [];
		[...domElt.children].map(c => rep.children.push(getRepresentation(c)));
	}
	return rep;
}

function compareRepresentation(assert, domElt, rep)
{
	for (const name in rep)
		if (rep.hasOwnProperty(name))
		{
			switch(name)
			{
				case 'children':
					break;
				default:
					assert.equal(domElt[name], rep[name]);
					break;
			}
		}
	/*
	assert.equal(domElt.tagName, rep.tagName);
	if ('innerText' in rep)
		assert.equal(domElt,innerText, rep.innerText);
	else
		assert.equal(domElt,innerText, 'innerText' in rep ? rep.innerText : '');
	assert.equal(domElt.children.length, 'children' in rep ? rep.children.length : 0);
	assert.equal(domElt.attributes.length, rep.attributes.length);
	rep.attributes.map(attr => assert.equal(domElt[attr],
	*/
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Tests
//

test ('D2 basics', assert =>
{
	const D2 = Cat.D2;
	const zeroD2 = new D2();
	const zeroD2_00 = new D2(0, 0);
	const zeroD2__00 = new D2({x:0, y:0});
	const zeroD2_D2 = new D2(zeroD2);
	assert.ok(zeroD2.equals(zeroD2_00), 'Default constructed equals explicit construction by values');
	assert.ok(zeroD2.equals(zeroD2__00), 'Default constructed equals explicit construction by object');
	assert.ok(zeroD2.equals(zeroD2_D2), 'Default constructed equals explicit construction by D2 object');
	const onezeroD2 = new D2(1, 0);
	assert.ok(!onezeroD2.equals(zeroD2), 'not equals ok');
});

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

test('setup workers', assert =>
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
	assert.ok(CAT instanceof Cat.Category, 'CAT is a category');
	assert.ok(CAT.name === 'sys/CAT', 'CAT name ok');
	assert.ok(CAT.basename === 'CAT', 'CAT basename ok');
	assert.ok(CAT.user === 	'sys', 'CAT user ok');
	assert.ok(CAT.properName === 'CAT', 'CAT proper name ok');
	assert.ok(CAT.description === 'top category', 'CAT description ok');
	const $CAT = Cat.R.$CAT;
	assert.ok($CAT instanceof Cat.Diagram, '$CAT is a diagram');
	assert.ok($CAT.codomain === CAT, '$CAT codomain is CAT');
	assert.ok($CAT.basename === '$CAT', '$CAT basename is ok');
	assert.ok($CAT.properName === '$CAT', '$CAT properName is ok');
	assert.ok($CAT.description === 'top level diagram', '$CAT description is ok');
	assert.ok($CAT.user === 'sys', '$CAT user is ok');
	const _Cat = Cat.R.Cat;
	assert.ok(_Cat instanceof Cat.Category, 'Cat is a category');
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
	assert.ok($Actions instanceof Cat.Diagram, '$Actions is a diagram');
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
	assert.ok(categoryDiagram instanceof Cat.Diagram, 'category diagram is a diagram');
	let args = {basename:'category', name:'sys/category', codomain:Actions, description:'diagram for a category', user:'sys'};
	checkArgs(assert, categoryDiagram, args);
	const categoryActions = ["identity", "graph", "name", "composite", "detachDomain", "detachCodomain", "homRight", "homLeft", "homset", "delete", "copy", "flipName", "help",
		"javascript", "cpp", "run", "alignHorizontal", "alignVertical", "assert"];
	categoryActions.map(action => assert.ok(categoryDiagram.getElement(action) instanceof Cat.Action, `Category actions ${action} exists`));

	const productDiagram = $CAT.getElement('product');
	const productActions = ["product", "productEdit", "project", "pullback", "productAssembly", "morphismAssembly"];
	productActions.map(action => assert.ok(productDiagram.getElement(action) instanceof Cat.Action, `Product actions ${action} exists`));

	const coproductDiagram = $CAT.getElement('coproduct');
	const coproductActions = ["coproduct", "coproductEdit", "inject", "pushout", "coproductAssembly", "finiteObject", "recursion"];
	coproductActions.map(action => assert.ok(coproductDiagram.getElement(action) instanceof Cat.Action, `Coproduct actions ${action} exists`));

	const homDiagram = $CAT.getElement('hom');
	const homActions = ["hom", "evaluate", "lambda"];
	homActions.map(action => assert.ok(homDiagram.getElement(action) instanceof Cat.Action, `Hom actions ${action} exists`));

	const distributeDiagram = $CAT.getElement('distribute');
	const distributeActions = ["distribute"];
	distributeActions.map(action => assert.ok(distributeDiagram.getElement(action) instanceof Cat.Action, `Distribute actions ${action} exists`));

	const _Cat = Cat.R.Cat;
	const CatActionDiagrams = ['category', 'product', 'coproduct', 'hom', 'distribute'];
	CatActionDiagrams.map(diagram => assert.ok(_Cat.actionDiagrams.has(diagram), `Cat has action diagram ${diagram}`));
	assert.equal(CatActionDiagrams.length, _Cat.actionDiagrams.size, 'Cat.actionDiagrams has correct size');
});

let PFS = null;

test('PFS actions', assert =>
{
	Cat.R.SetupPFS();
	PFS = Cat.R.$CAT.getElement('PFS');
	checkArgs(assert, PFS, {basename:'PFS', user:'hdole', properName:'&Popf;&Fopf;&Sopf;'});
	const actions = ['category', 'product', 'coproduct', 'hom', 'distribute'];
	actions.map(action => assert.ok(PFS.actionDiagrams.has(action), `PFS has category ${action}`));
});

test('Initialize cloud', assert =>
{
	Cat.R.NewCloud();
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

test('Check panels', assert =>
{
	assert.ok(Cat.D.Panels, 'Panels object ok');
	assert.ok(Cat.D.categoryPanel, 'Category panel ok');
	assert.ok(Cat.D.objectPanel, 'Object panel ok');
	assert.ok(Cat.D.morphismPanel, 'Morphism panel ok');
	assert.ok(Cat.D.diagramPanel, 'Diagram panel ok');
	assert.ok(Cat.D.helpPanel, 'Help panel ok');
	assert.ok(Cat.D.loginPanel, 'Login panel ok');
	assert.ok(Cat.D.settingsPanel, 'Settings panel ok');
	assert.ok(Cat.D.textPanel, 'Text panel ok');
	assert.ok(Cat.D.threeDPanel, 'ThreeD panel ok');
	assert.ok(Cat.D.ttyPanel, 'Tty panel ok');
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

/*
test('Download Catalog', assert =>
{
	const didit = assert.async();
	Cat.R.FetchCatalog(function()
	{
		assert.ok(true);
		didit();
	});
});
*/

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
	assert.ok(diagram instanceof Cat.Diagram, 'New diagram exists');
	assert.ok(diagram.timestamp > StartOfRun, 'Diagram timestamp ok');
	assert.ok(diagram.timestamp <= Date.now(), 'Diagram timestamp ok');
	assert.equal(diagram.refcnt, 0, 'Diagram refrence count ok');
	assert.equal(diagram.codomain, PFS, 'Diagram codomain ok');
	assert.ok(diagram.domain instanceof Cat.IndexCategory, 'Diagram domain ok');
	assert.equal(diagram.domain.name, diagram.name + '_Index', 'Diagram domain name ok');
	assert.equal(diagram._sig, "1647952c5a96c4a8239bcf9afb5ff95000c6f4fa27ff902ff24dac41d21fea89", 'Diagram signature is ok');
});

module('Diagram');

test('Check graphics', assert =>
{
	const svg = document.getElementById(diagram.elementId('root'));
	assert.dom(svg).hasTagName('g', 'Diagram g tag ok').hasClass('hidden', 'Diagram is hidden');
	assert.equal('', svg.style.display, 'Diagram g style.display ok');
	diagram.show();
	assert.ok(!svg.classList.contains('hidden'), 'Diagram SVG is visible');
	const svgTran = document.getElementById(diagram.elementId() + '-T');
	assert.dom(svgTran).hasTagName('g', 'Svg translate g ok');
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

test('Create test object', assert =>
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

test('get element', assert =>
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
	assert.equal(svg.getAttribute('y'), grid + halfFontHeight, 'Text y location ok');
	assert.dom('#el_tester--test--o_0').hasClass('object', 'Svg has object class').hasClass('grabbable', 'Svg has grabbable class');
	assert.equal(svg.dataset.name, 'tester/test/o_0', 'Dataset name ok');
	assert.equal(svg.dataset.type, 'object', 'Dataset object ok');
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

const dgrmJson = 'tester/test.json';

test('Diagram.placeObject', assert =>
{
	const to = diagram.getElement('t1');
	const xy = {x:2 * grid, y:grid};
	localStorage.removeItem(dgrmJson);	// just in case
	const from = diagram.placeObject(null, to, xy);	// do not test saving or selection here
	checkSelected(assert, from);
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
	const args = {basename:'m0', properName:'M1', description:'this is a test morphism', domain, codomain, instanceof:Cat.Morphism,
		sig:"7666bafec59943f203906de61b0c5bff2c41e97505e3bfeed2ada533b795788a"};
	const morphism = new Cat.Morphism(diagram, args);
	args.morphism = morphism;
	checkMorphism(assert, diagram, args);
});

test('Diagram.placeMorphism', assert =>
{
	const to = diagram.getElement('m0');
	assert.ok(to instanceof Cat.Morphism, 'Found morphism');
	const domain = diagram.getElement('tester/test/o_0');
	const codomain = diagram.getElement('tester/test/o_1');
	const name = 'tester/test/m_0';
	const from = diagram.placeMorphism(null, to, domain, codomain, false, false);
	const id = 'el_tester--test--m_0';
	checkIndexMorphism(assert, diagram, {angle: 0, from, to, id, domain, codomain, name, basename:'m_0',
		sig:"0452fb6b1f9e40040141caaa361bafbb2aa47457f1525d637db26e57c0b42935", textAnchor:'middle',
		start:{x:229, y:grid}, end:{x:371, y:grid}, d:'M229,200 L371,200', txy:{x:"300", y:"188"}});
});

test('Create identity', assert =>
{
	const t0 = diagram.getElement('t0');
	const morphism = diagram.id(t0);
//	assert.ok(morphism instanceof Cat.Identity, 't0 id exists');
	checkMorphism(assert, diagram, {name:"tester/test/Id{tester/test/t0}dI", basename:"Id{tester/test/t0}dI", properName:'id', morphism, domain:t0, codomain:t0,
		instanceof:Cat.Identity, sig:"ab519276ce681a5ffc0dfba60cbc8e9ab39fda63792225d75e145dc0dd642bda"});
});

test('Diagram.placeMorphismByObject', assert =>
{
	const t0 = diagram.getElement('t0');
	assert.ok(t0 instanceof Cat.CatObject, 't0 is an object');
	const t1 = diagram.getElement('t1');
	assert.ok(t1 instanceof Cat.CatObject, 't1 is an object');
	const t0id = diagram.id(t0);
	const t1id = diagram.id(t1);
	const t0ndxName = 'tester/test/o_0';
	const t1ndxName = 'tester/test/o_1';
	const t2ndxName = 'tester/test/o_3';	// 2 was gen'd above
	const t0ndx = diagram.getElement(t0ndxName);
	const t1ndx = diagram.getElement(t1ndxName);
	// placeMorphismByObject
	let from = diagram.placeMorphismByObject(null, 'domain', t1ndxName, t1id.name, false);		// false arg#5 no test of save here
	assert.ok(from instanceof Cat.DiagramMorphism, 'Placed morphism exists');
	checkIndexMorphism(assert, diagram, {angle: 0, from, to:t1id, id:'el_tester--test--m_1', domain:t1ndx, codomain:from.codomain, name:'tester/test/m_1', basename:'m_1',
		sig:"0d9763429ff9d15181a18daceebebac1f644b9d29ac0ad995d68280e5005b4b3", textAnchor:'middle',
		start:{x:429, y:grid}, end:{x:571, y:grid}, d:'M429,200 L571,200', txy:{x:"500", y:"188"}});
	assert.equal(from.domain.domains.size, 1, 'domain outbound count ok');
	assert.equal(from.domain.codomains.size, 1, 'domain inbound count ok');
	assert.equal(from.codomain.domains.size, 0, 'codomain outbound count ok');
	assert.equal(from.codomain.codomains.size, 1, 'codomain inbound count ok');
	// placeMorphismByObject
	from = diagram.placeMorphismByObject(null, 'codomain', t0ndxName, t0id.name, false);		// false arg#5 no test of save here
	assert.ok(from instanceof Cat.DiagramMorphism, 'Placed morphism from codomain exists');
	const t2ndx = diagram.getElement(t2ndxName);
	assert.ok(t2ndx, 'Placed object for domain exists');
	checkIndexMorphism(assert, diagram, {angle: 0, from, to:t0id, id:'el_tester--test--m_2', domain:t2ndx, codomain:from.codomain, name:'tester/test/m_2', basename:'m_2',
		sig:"0c7a44e7f5fd910099f339555ee14bfe8c53e733f7b6af5c0271c310588fa058", textAnchor:'middle',
		start:{x:29, y:grid}, end:{x:171, y:grid}, d:'M29,200 L171,200', txy:{x:"100", y:"188"}});
	// placeMorphismByObject
	from = diagram.placeMorphismByObject(null, 'domain', t1ndxName, t1id.name, false);		// false arg#5 no test of save here
	assert.ok(from instanceof Cat.DiagramMorphism, 'Placed morphism from center domain exists');
	assert.equal(from.domain.domains.size, 2, 'domain outbound count ok');
	assert.equal(from.domain.codomains.size, 1, 'domain inbound count ok');
	assert.equal(from.codomain.domains.size, 0, 'codomain outbound count ok');
	assert.equal(from.codomain.codomains.size, 1, 'codomain inbound count ok');
	const o4ndxName = 'tester/test/o_4';
	const o4ndx = diagram.getElement(o4ndxName);
	assert.ok(o4ndx, 'Placed object for codomain exists');
	checkIndexMorphism(assert, diagram, {angle:1.5707963267948966, from, to:t1id, id:'el_tester--test--m_3', domain:t1ndx, codomain:from.codomain, name:'tester/test/m_3',
		basename:'m_3', sig:"9631654edf972fb7f7513e4b7c4fab171f7e6aaaacdf3ad62ed31c5da632fc30", textAnchor:'start',
		start:{x:400, y:grid + 24}, end:{x:2 * grid, y:374}, d:'M400,224 L400,374', txy:{x:"412", y:"299"}});
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
	diagram.makeSelected();
	assert.equal(diagram.selected.length, 0, 'Diagram empty selected length ok');
	checkToolbarStart(assert);
	// select
	diagram.makeSelected(o2);
	checkSelected(assert, o2);
	checkToolbarStart(assert);
	assert.ok(sawit, 'Object select event occurred');
	assert.equal(diagram.selected.length, 1, 'Diagram selected length ok');
	const o2elt = document.getElementById(o2.elementId());
	assert.equal(o2elt.dataset.type, 'object', 'Selected object is an object');
	assert.dom('#' + o2.elementId()).hasClass('selected', 'Selected object has select class');
	assert.ok(diagram.selected.includes(o2), 'Selected object is the diagram selected array');
	checkToolbarButtons(assert, ['moveToolbar', 'identity', 'name', 'homRight', 'homLeft', 'copy', 'project', 'inject', 'morphismAssembly', 'help', 'closeToolbar']);
	checkToolbarStart(assert);
	// deselect
	diagram.makeSelected(null);
	checkToolbarStart(assert);
	assert.dom(o2elt).doesNotHaveClass('selected', 'Deselected object does not have select class');
	assert.equal(diagram.selected.length, 0, 'Diagram selected set is empty');
	assert.dom(o2elt).doesNotHaveClass('selected', 'object style not selected');
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
	checkToolbarStart(assert);
	assert.ok(sawit, 'Morphism select event occurred');
	assert.equal(diagram.selected.length, 1, 'Diagram selected length ok');
	checkSelected(assert, m1);
	checkToolbarButtons(assert, ['moveToolbar', 'name', 'detachDomain', 'copy', 'lambda', 'flipName', 'graph', 'delete', 'help', 'closeToolbar']);
	diagram.makeSelected(null);
	checkToolbarStart(assert);
	assert.dom('#' + m1.elementId()).doesNotHaveClass('selected', 'Deselected morphism does not have select class');
	assert.equal(diagram.selected.length, 0, 'Diagram selected set is empty');
	assert.dom('#' + m1.elementId() + '_path').doesNotHaveClass('selected', 'Selected morphism path does not have select class');
	assert.dom('#' + m1.elementId() + '_name').doesNotHaveClass('selected', 'Selected morphism name does not have select class');
});

test('Compose three morphisms', assert =>
{
	const m2 = diagram.getElement('tester/test/m_2');
	// select
	diagram.makeSelected(m2);
	checkToolbarStart(assert);
	assert.equal(diagram.selected.length, 1, 'Only one element selected');
	checkSelected(assert, m2);
	const m0 = diagram.getElement('tester/test/m_0');
	// add select
	diagram.addSelected(m0);
	assert.equal(diagram.selected.length, 2, 'Two elements selected');
	checkSelected(assert, m0);
	const m3 = diagram.getElement('tester/test/m_3');
	// add select
	diagram.addSelected(m3);
	assert.equal(diagram.selected.length, 3, 'Two elements selected');
	checkSelected(assert, m3);
	checkToolbarButtons(assert, ['moveToolbar', 'composite', 'product', 'coproduct', 'graph', 'delete', 'closeToolbar']);
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
		assert.ok(cell instanceof Cat.Cell, 'Cell is ok');
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
	const morphisms = diagram.selected.map(e => e.to);
	const compBtn = getToolbarButtons()[1];
	const clicker = getButtonClick(compBtn);
	const domain = m2.domain;
	const codomain = m3.codomain;
	// click
	clicker();
	m4 = diagram.getElement('tester/test/m_4');
	assert.ok(m4 instanceof Cat.DiagramComposite, 'DiagramComposite exists');
	assert.ok(m4.to instanceof Cat.Composite, 'Composite exists');
	m4.morphisms.map((m, i) => assert.equal(m.to, m4.to.morphisms[i], `Component morphism ${i} ok`));
	m4.morphisms.map((m, i) => assert.equal(m.refcnt, 2, `Component morphism ${i} refcnt ok`));
	checkSelected(assert, m4, 'DiagramComposite is selected');
	assert.equal(diagram.selected.length, 1, 'Only one element selected');
	const to = m4.to;
	assert.ok(to instanceof Cat.Composite, 'Composite ok');
	checkMorphism(assert, diagram, {basename:"Cm{tester/test/Id{tester/test/t0}dI,tester/test/m0,tester/test/Id{tester/test/t1}dI}mC",
			properName:"id&#8728;M1&#8728;id", refcnt:1, instanceof:Cat.Composite, morphisms,
			morphism:to, domain:domain.to, codomain:codomain.to, sig:"447d19ec2a011a55cbd8e5ff415102d5ca903e3ccf7f27b2394f65876cb72e30"});
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
	assert.ok(integers instanceof Cat.Diagram, 'Integers diagram found');
	assert.equal(integers.refcnt, 2, 'Integers refcnt ok');
	assert.ok(diagram.references.has(refName), 'Diagram references has integers');
	assert.ok(diagram.allReferences.has('hdole/Integers'), 'Diagram allReferences has Integers');
	assert.ok(diagram.allReferences.has('hdole/Narithmetics'), 'Diagram allReferences has Narithmetics');
	assert.ok(diagram.allReferences.has('hdole/Logic'), 'Diagram allReferences has Logic');
	assert.ok(diagram.allReferences.has('hdole/Basics'), 'Diagram allReferences has Basics');
	assert.equal(diagram.allReferences.size, 4, 'Diagram allReference count ok');
	assert.ok(Cat.D.objectPanel.referenceSection.catalog.children.length > 0, 'Object panel reference section populated');
	assert.equal(Cat.D.objectPanel.referenceSection.type, 'Object');
	assert.ok(Cat.D.morphismPanel.referenceSection.catalog.children.length > 0, 'Morphism panel reference section populated');
	assert.equal(Cat.D.morphismPanel.referenceSection.type, 'Morphism');
});

test('Place referenced morphism', assert =>
{
	const to = diagram.getElement("hdole/Integers/add");
	assert.ok(to, 'Found integer addition');
	const domain = {x:4 * grid, y:grid};
	const codomain = {x:5 * grid, y:grid};
	const from = diagram.placeMorphism(null, to, domain, codomain, false, false);
	assert.ok(from instanceof Cat.DiagramMorphism, 'DiagramMorphism exists');
	// select
	diagram.makeSelected(from);
	checkToolbarStart(assert);
	checkSelected(assert, from);
	const btns = getToolbarButtons();
	const btnNames = ['moveToolbar', 'name', 'copy', 'run', 'lambda', 'flipName', 'graph', 'delete', 'help', 'closeToolbar'];
	btnNames.map((name, i) => assert.equal(name, btns[i].dataset.name, `Button ${name} ok`));
});

test('Evaluate selected morphism', assert =>
{
	const morphism = diagram.getElement('tester/test/m_5');
	assert.ok(morphism instanceof Cat.DiagramMorphism, 'Found morphism');
	// select
	diagram.makeSelected(morphism);
	checkToolbarStart(assert);
	checkSelected(assert, morphism);
	const btns = getToolbarButtons();
	const runBtns = btns.filter(btn => btn.dataset.name === 'run');
	assert.equal(runBtns.length, 1, 'One run button in toolbar');
	const runBtn = runBtns[0];
	// click
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
	// simulate click 'run'
	const didit = assert.async();
	const handler = function(result)
	{
		Cat.R.Actions.run.postResult(result);
		const dataDiv = document.getElementById('run-display');
		assert.dom(dataDiv).hasTagName('div', 'Data div ok');
		const dataDivs = [...dataDiv.querySelectorAll('div')];
		assert.equal(dataDivs.length, 1, 'One data div ok');
		const spans = [...dataDivs[0].querySelectorAll('span')];
		assert.equal(spans[0].innerText, '[3,4]', 'Input ok');
		assert.equal(spans[2].innerText, '7', 'Output ok');
		const createDataBtn = document.getElementById('run-createDataBtn');
		assert.dom(createDataBtn).hasTagName('div');
		const btnRect = createDataBtn.querySelector('.btn');
		assert.dom(btnRect).hasTagName('rect', 'Button rect is ok');
		assert.equal(typeof(btnRect.onclick), 'function', 'Button function ok');
		// click
		btnRect.onclick();
		const m6 = diagram.getElement('tester/test/m_6');
		checkSelected(assert, m6);
		assert.ok(m6 instanceof Cat.DiagramMorphism, 'Diagram morphism m6 ok');
		const to = m6.to;
		assert.equal(to.basename, 'data_0', 'Morphism basename ok');
		assert.ok('data' in to, 'Data ok');
		assert.equal(to.data.size, 1, 'Data size ok');
		const data = [...to.data][0];
		assert.equal(data[0], 0, 'Input ok');
		assert.equal(data[1], 7, 'Output ok');
		assert.ok(m6.domain.to.isTerminal(), 'Domain is terminal');
		// test over
		didit();
	};
	Cat.R.Actions.javascript.evaluate(event, Cat.R.diagram, 'hdole/Integers/add', handler);
});

function checkEvaluation(assert, indexName, input0, input1, output)
{
	const from = diagram.getElement(indexName);
	assert.ok(from instanceof Cat.DiagramMorphism, `Found ${indexName}`);
	// select
	diagram.makeSelected(from);
	checkToolbarStart(assert);
	checkSelected(assert, from);
	const run = getToolbarButton('run');
	// click
	getButtonClick(run)();
	const in0 = document.getElementById(" hdole/Integers/Z 0");
	assert.dom(in0).hasTagName('input', 'Input 0 ok');
	const in1 = document.getElementById(" hdole/Integers/Z 1");
	assert.dom(in1).hasTagName('input', 'Input 1 ok');
	in0.value = input0;
	in1.value = input1;
	// simulate click 'run'
	const didit = assert.async();
	const handler = function(result)
	{
		Cat.R.Actions.run.postResult(result);
		const dataDiv = document.getElementById('run-display');
		assert.dom(dataDiv).hasTagName('div', 'Data div ok');
		const dataDivs = [...dataDiv.querySelectorAll('div')];
		assert.equal(dataDivs.length, 1, 'One data div ok');
		const spans = [...dataDivs[0].querySelectorAll('span')];
		assert.equal(spans[0].innerText, `[${input0},${input1}]`, 'Input ok');
		assert.equal(spans[2].innerText, output.toString(), 'Output ok');
		const createDataBtn = document.getElementById('run-createDataBtn');
		assert.dom(createDataBtn).hasTagName('div');
		const btnRect = createDataBtn.querySelector('.btn');
		assert.dom(btnRect).hasTagName('rect', 'Button rect is ok');
		assert.equal(typeof(btnRect.onclick), 'function', 'Button function ok');
		// test over
		didit();
	};
	Cat.R.Actions.javascript.evaluate(event, Cat.R.diagram, from.to.name, handler);
}

test('Check zero output', assert =>
{
	checkEvaluation(assert, 'tester/test/m_5', 0, 0, 0);
});

test('Data morphism', assert =>
{
	const from = diagram.getElement('tester/test/m_6');
	diagram.makeSelected(from);
	checkToolbarButtons(assert, ['moveToolbar', 'name', 'detachCodomain', 'copy', 'run', 'flipName', 'graph', 'delete', 'help', 'closeToolbar']);
	const run = getToolbarButton('run');
	// click
	getButtonClick(run)();
	assert.ok(Cat.D.toolbar.help.children.length > 0, 'Toolbar has something');
	const help = Cat.D.toolbar.help;
	assert.dom(help.firstElementChild).hasTagName('h3').hasText(from.to.properName);
	assert.dom(help.firstElementChild.nextSibling).hasTagName('h5').hasText('Data in Morphism');
	const rows = help.querySelectorAll('tr');
	let row = rows[0];
	assert.equal(row.firstElementChild.firstElementChild.innerText, 'Domain', 'Domain label ok');
	assert.equal(row.firstElementChild.nextSibling.firstElementChild.innerText, 'Codomain', 'Codomain label ok');
	row = rows[1];
	assert.equal(row.firstElementChild.innerText, Cat.H3.span(from.to.domain.properName).innerText, 'Domain name ok');
	assert.equal(row.firstElementChild.nextSibling.innerText, Cat.H3.span(from.to.codomain.properName).innerText, 'Codomain name ok');
	row = rows[2];
	assert.equal(row.firstElementChild.innerText, "0", 'Data index ok');
	const input = row.firstElementChild.nextElementSibling.firstElementChild;
	assert.dom(input).hasTagName('input').hasValue('7', 'Codomain value ok').hasAttribute('type', 'number', 'Input type ok').hasAttribute('id', '0 hdole/Integers/Z ', 'Id ok').
		hasAttribute('placeHolder', 'Integer', 'Placeholder ok');
	const edit = row.children[2].firstElementChild;
	checkButton(assert, edit, 'editData', 'Set data');
});

test('Copy object', assert =>
{
	const o5 = diagram.getElement('tester/test/o_5');
	diagram.makeSelected(o5);
	checkSelected(assert, o5);
	assert.ok(o5 instanceof Cat.DiagramObject, 'DiagramObject ok');
	const oldCount = o5.to.refcnt;
	const copy = getToolbarButton('copy');
	let o8 = diagram.getElement('tester/test/o_8');
	assert.ok(!o8, 'o_8 does not exist');
	getButtonClick(copy)();

	o8 = diagram.getElement('tester/test/o_8');
	const o8elt = document.getElementById(o8.elementId());
	assert.dom(o8elt).hasTagName('text', 'text tag ok');
	assert.equal(o8.svg, o8elt, 'elements equal');

	assert.equal(oldCount + 1, o8.to.refcnt, 'reference count increased by 1');
	assert.equal(o8.domains.size, 0, 'no domain morphisms attached');
	assert.equal(o8.codomains.size, 0, 'no codomain morphisms attached');
	assert.ok(o8.x !== o5.x, 'x offset ok');
	assert.ok(o8.y !== o5.y, 'y offset ok');
});

test('Delete object', assert =>
{
	const o8 = selectObject(assert, 'tester/test/o_8');
	const oldRefcnt = o8.to.refcnt;
	const id = o8.elementId();
	const o8elt = document.getElementById(id);
	const delBtn = getToolbarButton('delete');
	checkButton(assert, delBtn, 'delete', 'Delete elements');
	const oldDomCnt = diagram.domain.elements.size;
	getButtonClick(delBtn)();
	assert.equal(oldDomCnt -1, diagram.domain.elements.size, 'Domain index category decreased by one');
	assert.equal(undefined, document.getElementById(id), 'element with id is gone');
	assert.equal(oldRefcnt -1, o8.to.refcnt, 'target refcnt decreased');
});

test('Composite', assert =>
{
	const ZxZ = diagram.getElement("hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP");
	assert.ok(ZxZ instanceof Cat.CatObject);
	const xy = {x:2 * grid, y:3 * grid};
	const from = diagram.placeObject(null, ZxZ, xy);	// do not test saving or selection here
	checkObject(assert, from.name);
	// select
	diagram.makeSelected(from);
	checkToolbarStart(assert);
	const homRight = getToolbarButton('homRight');
	getButtonClick(homRight)();
	const help = Cat.D.toolbar.help;
	let rows = [...help.querySelectorAll('tr.sidenavRow')];
	const candidates = new Set();
	diagram.codomain.elements.forEach(elt => elt instanceof Cat.Morphism && elt.domain.isEquivalent(ZxZ) && candidates.add(elt.name));
	rows.map(row => candidates.delete(row.dataset.name));
	assert.equal(0, candidates.size, 'Found all morphism candidates from domain');
	rows.map(row =>
	{
		const m = diagram.getElement(row.dataset.name);
		assert.ok(m instanceof Cat.Morphism, 'Morphism ok');
		const cells = [...row.querySelectorAll('td')];
		assert.equal(procit(m.properName), cells[0].innerText, 'morphism properName ok');
		assert.equal(procit(m.domain.properName), cells[1].innerText, 'morphism domain properName ok');
		assert.equal(procit('&rarr;'), cells[2].innerText, 'morphism arrow ok');
		assert.equal(procit(m.codomain.properName), cells[3].innerText, 'morphism codomain properName ok');
	});
	const name = rows[0].dataset.name;
	const to = diagram.getElement(name);
	const oldRefcnt = to.refcnt;
	// click to place m7
	rows[0].onclick();
	const m7 = diagram.getElement('tester/test/m_7');
	assert.ok(m7 instanceof Cat.DiagramMorphism, 'Morphism m_7 ok');
	checkSelected(assert, m7);
	assert.equal(1, m7.domain.domains.size, 'one domain morphs attached');
	assert.equal(0, m7.domain.codomains.size, 'no codomain morphs attached');
	assert.equal(0, m7.codomain.domains.size, 'no domain morphs attached');
	assert.equal(1, m7.codomain.codomains.size, 'one codomain morphs attached');
	assert.equal(name, m7.to.name, 'Placed morphism with correct name');
	assert.equal(oldRefcnt + 1, to.refcnt, 'Reference count increase ok');
	assert.equal(1, m7.refcnt, 'index reference count ok');
	const o9 = diagram.getElement('tester/test/o_9');
	assert.ok(o9 instanceof Cat.DiagramObject, 'o9 is ok');
	// select o9
	diagram.makeSelected(o9);
	checkSelected(assert, o9);
	assert.equal(help.children.length, 0, 'help has no children');
	let homRightBtn = getToolbarButton('homRight');
	// click button
	getButtonClick(homRightBtn)();
	assert.equal(help.children.length, 2, 'help has children');
	rows = help.querySelectorAll('tr.sidenavRow');
	assert.equal(rows[0].dataset.name, 'hdole/Integers/abs', 'abs ok');
	assert.equal(rows[1].dataset.name, 'hdole/Integers/successor', 'succ ok');
	// click button for abs
	rows[0].onclick();
	const o10 = diagram.getElement('tester/test/o_10');
	assert.ok(o10 instanceof Cat.DiagramObject, 'o10 is ok');
	// select
	diagram.makeSelected(o10);
	homRightBtn = getToolbarButton('homRight');
	// click for homRight
	getButtonClick(homRightBtn)();
	const succBtn = help.querySelector('tr.sidenavRow');
	succBtn.onclick();
	// select m7
	diagram.makeSelected(m7);
	const m8 = diagram.getElement('tester/test/m_8');
	assert.ok(m8 instanceof Cat.DiagramMorphism, 'Morphism m_8 ok');
	// add select m8
	diagram.addSelected(m8);
	const m9 = diagram.getElement('tester/test/m_9');
	// add select m9
	diagram.addSelected(m9);
	assert.equal(diagram.selected.length, 3, 'Three elements selected');
	checkToolbarButtons(assert, ['moveToolbar', 'composite', 'product', 'coproduct', 'graph', 'delete', 'closeToolbar']);
	const compBtn = getToolbarButton('composite');
	// click to make composite
	getButtonClick(compBtn)();
	const runBtn = getToolbarButton('run');
	// click to run
	getButtonClick(runBtn)();
	const inputs = help.querySelectorAll('input');
	inputs[0].value = 3;
	inputs[1].value = -4;
	const doitBtn = help.querySelector('span.button');
	// evaluate by hand
	checkEvaluation(assert, 'tester/test/m_10', 3, -4, 2);
});

test('homset', assert =>
{
	const o3 = diagram.getElement('tester/test/o_3');
	const o4 = diagram.getElement('tester/test/o_4');
	diagram.makeSelected(o3);
	diagram.addSelected(o4);
	checkToolbarButtons(assert, ['moveToolbar', 'homset', 'alignHorizontal', 'product', 'coproduct', 'hom', 'delete', 'closeToolbar']);
	const btn = getToolbarButton('homset');
	getButtonClick(btn)();
	const help = Cat.D.toolbar.help;
	const tbl = document.getElementById('help-homset-morphism-table');
	assert.dom(tbl).hasTagName('table', 'homset table ok');
	const rows = tbl.querySelectorAll('tr.sidenavRow');
	assert.equal(rows.length, 2, 'two results ok');
	rows[0].onclick();
	checkToolbarButtons(assert, ['moveToolbar', 'name', 'detachDomain', 'detachCodomain', 'copy', 'lambda', 'flipName', 'graph', 'delete', 'help', 'closeToolbar']);
	const from = diagram.getElement('tester/test/m_11');
	checkSelected(assert, from);
	checkIndexMorphism(assert, diagram, {angle:0.4636476090008061, from, to:from.to, id:from.elementId(), domain:o3, codomain:o4, name:'tester/test/m_11', basename:'m_11',
		sig:"e2f54153b01165b8b5b6e065bff431a23dddce30a6083161ac8467f3adc3683e", textAnchor:'start',
		start:{x:36, y:201}, end:{x:378, y:373}, d:'M36,201 C140,208 311,294 378,373', txy:{x:"236", y:"230"}, homSetIndex:1});
	m4 = diagram.getElement('tester/test/m_4');
	checkIndexMorphism(assert, diagram, {angle:0.4636476090008061, from:m4, to:m4.to, id:m4.elementId(), domain:o3, codomain:o4, name:'tester/test/m_4', basename:'m_4',
		sig:"10ddaa9e14eb0c3e9181a988312d7f379f12befa14f17dda5d19d721ccc15900", textAnchor:'start',
		start:{x:25, y:223}, end:{x:367, y:395}, d:'M25,223 C91,304 262,390 367,395', txy:{x:"187", y:"326"}, homSetIndex:0});
});

test('move object', assert =>
{
	const o11 = diagram.getElement('tester/test/o_11');
	simMouseEvent(o11.svg, 'mousedown', {clientX:o11.x, clientY:o11.y});
	assert.ok(Cat.D.mouseIsDown, 'mouse is down');
	const pos = Cat.D.mouse.position();
	const nux = 4 * grid;
	const nuy = 2 * grid;
	assert.equal(pos.x, o11.x, 'mouse x ok');
	assert.equal(pos.y, o11.y, 'mouse y ok');
	assert.ok(Cat.D.dragStart, 'D.dragStart ok');
	simMouseEvent(o11.svg, 'mousemove', {clientX:nux, clientY:nuy});
	assert.equal(nux, o11.x, 'mouse x ok');
	assert.equal(nuy, o11.y, 'mouse y ok');
	simMouseEvent(o11.svg, 'mouseup', {clientX:nux, clientY:nuy});
	assert.equal(nux, o11.x, 'final x ok');
	assert.equal(nuy, o11.y, 'final y ok');
	assert.equal(o11.x, o11.svg.getAttribute('x'), 'moved x ok');
	assert.equal(o11.y + halfFontHeight, o11.svg.getAttribute('y'), 'moved y ok');
});

test('homLeft action', assert =>
{
	const to = diagram.getElement('hdole/Narithmetics/N');
	const xy = {x:5 * grid, y:2 * grid};
	const from = diagram.placeObject(null, to, xy);	// do not test saving or selection here
	// click for homLeft
	const homLeftBtn = getToolbarButton('homLeft');
	getButtonClick(homLeftBtn)();
	const help = Cat.D.toolbar.help;
	const rows = [...help.querySelectorAll('tr.sidenavRow')];
	assert.equal(rows.length, 10, 'row length ok');
	rows[9].onclick();
	const m12 = diagram.getElement('tester/test/m_12');
	const o13 = diagram.getElement('tester/test/o_13');
	checkIndexMorphism(assert, diagram, {angle:Math.PI, from:m12, to:m12.to, id:m12.elementId(), domain:o13, codomain:from, name:m12.name, basename:m12.basename,
		sig:"7a7846247bf9e6d17db475423e80734c1d80cad6fd179e09f39053a55ea20842", textAnchor:'middle',
		start:{x:1158, y:400}, end:{x:1024, y:400}, d:'M1158,400 L1024,400', txy:{x:"1091", y:"436"}});
});

test('click nowhere', assert =>
{
	assert.equal(diagram.selected.length, 1, 'selected one ok');
	simMouseEvent(diagram.svgRoot, 'mousedown', {clientX:950, clientY:400});
	assert.equal(diagram.selected.length, 0, 'selected none ok');
	simMouseEvent(diagram.svgRoot, 'mouseup', {clientX:950, clientY:400});
	assert.equal(diagram.selected.length, 0, 'selected none ok');
});

test('check emphasis', assert =>
{
	// object emphasis
	const o1 = diagram.getElement('tester/test/o_1');
	diagram.makeSelected(null);
	assert.equal(diagram.selected.length, 0, 'selected none ok');
	simMouseEvent(o1.svg, 'mouseenter', {clientX:o1.x, clientY:o1.y});
	assert.dom(o1.svg).hasClass('emphasis', 'object emphasis ok');
	simMouseEvent(o1.svg, 'mouseleave', {clientX:o1.x, clientY:o1.y});
	assert.dom(o1.svg).doesNotHaveClass('emphasis', 'object emphasis removed ok');
	// morphism emphasis
	const m1 = diagram.getElement('tester/test/m_1');
	const args = {clientX:Number.parseInt(m1.svg_name.getAttribute('x')), clientY:Number.parseInt(m1.svg_name.getAttribute('y'))};
	simMouseEvent(m1.svg_name, 'mouseenter', args);
	assert.dom(m1.svg).hasClass('emphasis', 'morphism top g emphasis ok');
	assert.dom(m1.svg_path2).doesNotHaveClass('emphasis', 'morphism path2 no emphasis ok');
	assert.dom(m1.svg_path).hasClass('emphasis', 'morphism path emphasis ok');
	assert.dom(m1.svg_name).hasClass('emphasis', 'morphism name emphasis ok');
	simMouseEvent(m1.svg_name, 'mouseleave', args);
	assert.dom(m1.svg).doesNotHaveClass('emphasis', 'morphism top g emphasis ok');
	assert.dom(m1.svg_path2).doesNotHaveClass('emphasis', 'morphism path2 no emphasis ok');
	assert.dom(m1.svg_path).doesNotHaveClass('emphasis', 'morphism path emphasis ok');
	assert.dom(m1.svg_name).doesNotHaveClass('emphasis', 'morphism name emphasis ok');
});

test('detach domain and codomain', assert =>
{
	const t0 = diagram.getElement('t0');
	const xy = {x:1 * grid, y:4 * grid};
	const from = diagram.placeObject(null, t0, xy);
	let btn = getToolbarButton('identity');
	// click ident
	getButtonClick(btn)();
	const o15 = diagram.getElement('tester/test/o_15');
	diagram.makeSelected(o15);
	btn = getToolbarButton('identity');
	getButtonClick(btn)();
	const o16 = diagram.getElement('tester/test/o_16');
	diagram.makeSelected(o16);
	btn = getToolbarButton('identity');
	getButtonClick(btn)();
	const m13 = diagram.getElement('tester/test/m_13');
	const m14 = diagram.getElement('tester/test/m_14');
	const m15 = diagram.getElement('tester/test/m_15');
	assert.ok(m14, 'm14 ok');
	diagram.makeSelected(m14);
	checkConnector(assert, m14.domain);
	checkConnector(assert, m14.codomain);
	// click detach codomain
	getButtonClick(getToolbarButton('detachCodomain'))();
	checkConnector(assert, m14.domain);
	assert.equal(m14.codomain.domains.size, 0, 'm14 codomain domains size ok');
	assert.equal(m14.codomain.codomains.size, 1, 'm14 codomain codomains size ok');
	// click detach domain
	getButtonClick(getToolbarButton('detachDomain'))();
	checkIsolatedMorphism(assert, m13);
	checkIsolatedMorphism(assert, m14);
	checkIsolatedMorphism(assert, m15);
});

test('fuse domain and codomain', assert =>
{
	const o15 = diagram.getElement('tester/test/o_15');
	const o16 = diagram.getElement('tester/test/o_16');
	const o18 = diagram.getElement('tester/test/o_18');	// codomain
	const o19 = diagram.getElement('tester/test/o_19');	// domain
	// fuse domain
	simMouseEvent(o19.svg, 'mousemove', {clientX:o19.x, clientY:o19.y});
	simMouseEvent(o19.svg, 'mouseenter', {clientX:o19.x, clientY:o19.y});
	simMouseEvent(o19.svg, 'mousedown', {clientX:o19.x, clientY:o19.y});
	simMouseEvent(o15.svg, 'mouseenter', {clientX:o15.x, clientY:o15.y});
	simMouseEvent(o19.svg, 'mousemove', {clientX:o15.x, clientY:o15.y});
	assert.equal(o19.x, o15.x, 'moved x ok');
	assert.equal(o19.y, o15.y, 'moved x ok');
//	assert.dom(o15.svg).hasClass('emphasis', 'target emphasis ok');
	assert.dom(o19.svg).hasClass('emphasis', 'drop emphasis ok').hasClass('fuseObject', 'drop fuseObject class ok').hasClass('glow', 'drop glow class ok');
	simMouseEvent(o19.svg, 'mouseup', {clientX:o15.x, clientY:o15.y});
	simMouseEvent(o15.svg, 'mouseleave', {clientX:o15.x, clientY:o15.y});
	// o19 is gone
	assert.equal(o19.refcnt, 0, 'o_19 deleted ok');
	assert.equal(o19.svg.parentNode, null, 'o_19.svg parent node is null');
	checkConnector(assert, o15);
	// fuse codomain
	simMouseEvent(o18.svg, 'mousemove', {clientX:o18.x, clientY:o18.y});
	simMouseEvent(o18.svg, 'mouseenter', {clientX:o18.x, clientY:o18.y});
	simMouseEvent(o18.svg, 'mousedown', {clientX:o18.x, clientY:o18.y});
	simMouseEvent(o16.svg, 'mouseenter', {clientX:o16.x, clientY:o16.y});
	simMouseEvent(o18.svg, 'mousemove', {clientX:o16.x, clientY:o16.y});
	assert.equal(o18.x, o16.x, 'moved x ok');
	assert.equal(o18.y, o16.y, 'moved x ok');
	assert.dom(o16.svg).hasClass('emphasis', 'target emphasis ok');
	assert.dom(o18.svg).hasClass('emphasis', 'drop emphasis ok').hasClass('fuseObject', 'drop fuseObject class ok').hasClass('glow', 'drop glow class ok');
	simMouseEvent(o18.svg, 'mouseup', {clientX:o16.x, clientY:o16.y});
	simMouseEvent(o16.svg, 'mouseleave', {clientX:o16.x, clientY:o16.y});
	// o18 is gone
	assert.equal(o18.refcnt, 0, 'o_18 deleted ok');
	assert.equal(o18.svg.parentNode, null, 'o_18.svg parent node is null');
	checkConnector(assert, o16);
});

test('toolbar nothing selected', assert =>
{
	// click on nothing
	simMouseEvent(diagram.svgRoot, 'mousedown', {clientX:3 * grid, clientY:2 * grid});
	simMouseEvent(diagram.svgRoot, 'mouseup', {clientX:3 * grid, clientY:2 * grid});
	assert.equal(diagram.selected.length, 0, 'Nothing selected ok');
	checkToolbarButtons(assert, ['moveToolbar', 'newDiagram', 'newObject', 'newMorphism', 'newText', 'toolbarShowSearch', 'closeToolbar']);
	diagram.domain.elements.forEach(elt => checkNotSelected(assert, elt));
});

test('ControlKeyA select everything', assert =>
{
	// controlKeyA
	simKeyboardEvent(document.body, 'keydown', {ctrlKey:true, code:'KeyA', key:'a'});
	simKeyboardEvent(document.body, 'keyup', {ctrlKey:true, code:'KeyA', key:'a'});
	diagram.domain.elements.forEach(elt => checkSelected(assert, elt));
	// click on nothing
	simMouseEvent(diagram.svgRoot, 'mousedown', {clientX:3 * grid, clientY:2 * grid});
	simMouseEvent(diagram.svgRoot, 'mouseup', {clientX:3 * grid, clientY:2 * grid});
	diagram.domain.elements.forEach(elt => checkNotSelected(assert, elt));
});

module('DiagramText');

test('DiagramText toolbar new text', assert =>
{
	// click on nothing
	const textCoords = {clientX:3 * grid, clientY:2 * grid};
	simMouseEvent(diagram.svgRoot, 'mousedown', textCoords);
	simMouseEvent(diagram.svgRoot, 'mouseup', textCoords);
	assert.equal(diagram.selected.length, 0, 'nothing selected ok');
	const textBtn = getToolbarButton('newText');
	// click text button
	getButtonClick(textBtn)();
	const help = Cat.D.toolbar.help;
	assert.dom(help.firstChild).hasTagName('div', 'div tag ok');
	assert.dom(help.firstChild.firstChild).hasTagName('h5', 'h5 tag ok');
	const desc = document.getElementById('new-description');
	assert.dom(desc).hasTagName('input').hasValue('', 'no value ok').hasClass('in100', 'class in100 ok').hasProperty('title', 'Description', 'title ok').
		hasProperty('placeholder', 'Description', 'placeholder ok');
	assert.equal(document.activeElement, desc, 'description focus ok');
	desc.value = descriptionText;
	simKeyboardEvent(desc, 'keydown', {code:'Enter', key:'Enter'});
	simKeyboardEvent(desc, 'keyup', {code:'Enter', key:'Enter'});
	const t0 = diagram.getElement('tester/test/t_0');
	assert.ok(t0 instanceof Cat.DiagramText, 'DiagramText ok');
	assert.equal(t0.x, Cat.D.toolbar.mouseCoords.x, 'text x match toolbar mouseCoords x ok');
	assert.equal(t0.y, Cat.D.toolbar.mouseCoords.y, 'text x match toolbar mouseCoords y ok');
	checkSelected(assert, t0);
	const textG = document.getElementById(t0.elementId());
	assert.equal(t0.svg, textG, 'svg equality');
	const texts = [...textG.querySelectorAll('text')];
	assert.equal(texts.length, 1, 'one text ok');
	let text = texts[0];
	assert.dom(text).hasAttribute('text-anchor', 'left', 'text-anchor ok').hasClass('diagramText', 'class diagramText ok').hasClass('grabbable', 'class grabbable ok').
		hasText(t0.description).hasStyle({'font-size':'24px', 'font-weight':'400'}, 'text style ok');
	// deselect text:  shift click
	simMouseEvent(diagram.svgRoot, 'mousedown', {shiftKey:true, clientX:3 * grid, clientY:2 * grid});
	checkNotSelected(assert, t0);
	assert.equal(diagram.selected.length, 0, 'nothing selected ok');
});

test('DiagramText move', assert =>
{
	const t0 = diagram.getElement('tester/test/t_0');
	const target = {clientX:2 * grid, clientY:3.5 * grid};
	clickDragRelease(assert, t0, {clientX:t0.x, clientY:t0.y}, target);
	checkSelected(assert, t0);
});

test('DiagramText change height/weight', assert =>
{
	const help = Cat.D.toolbar.help;
	const t0 = diagram.getElement('tester/test/t_0');
	// click to get toolbar
	selectElement(assert, t0);
	// click help on toolbar
	getButtonClick(getToolbarButton('help'))();
	checkDiagramTextHelp(assert, t0, '24', 'normal');
	// click description edit button
	let editBtn = help.querySelector('span.button');
	assert.equal(editBtn.dataset.name, 'EditElementText');
	getButtonClick(editBtn)();
	const descElt = help.querySelector('description.tty');
	assert.equal(document.activeElement, descElt);
	const replacement = 'And now for something completely different';
	descElt.innerText = replacement;
	// click edit button
	getButtonClick(editBtn)();
	checkDiagramTextHelp(assert, t0, '24', 'normal');
	const nuText = t0.svg.querySelector('text');
	assert.dom(nuText).hasText(replacement);
	// change text height
	const heightElt = help.querySelector('input.in100');
	heightElt.value = '32';
	heightElt.onchange();
	assert.dom(nuText).hasStyle({'font-size':'32px', 'font-weight':'400'});		// 'normal' maps to '400' in weight
	const selectElt = help.querySelector('select');
	assert.equal(typeof selectElt.onchange, 'function');
	assert.dom(selectElt).hasValue('normal');
	selectElt.value = 'bold';
	selectElt.onchange();
	assert.dom(nuText).hasStyle({'font-size':'32px', 'font-weight':'700'});		// 'bold' maps to '700' in weight
});

test('copy and delete it', assert =>
{
	const help = Cat.D.toolbar.help;
	const t0 = diagram.getElement('tester/test/t_0');
	const copyBtn = getToolbarButton('copy');
	// click copy
	getButtonClick(copyBtn)();
	const t1 = diagram.getElement('tester/test/t_1');
	assert.ok(t1 instanceof Cat.DiagramText);
	assert.equal(t1.description, t0.description);
	assert.equal(t1.height, t0.height);
	assert.equal(t1.weight, t0.weight);
	// click delete btn
	const delBtn = getToolbarButton('delete');
	getButtonClick(delBtn)();
	assert.equal(t1.svg.parentNode, null);
	assert.equal(diagram.selected.length, 0);
});

module('Diagram Panel');

test('toolbar new diagram', assert =>
{
	simMouseClick(diagram.svgRoot, {clientX:3 * grid, clientY:2 * grid});
	const nuDgrmBtn = getToolbarButton('newDiagram');
	assert.dom(nuDgrmBtn).hasTagName('span');
	getButtonClick(nuDgrmBtn)();
	const help = Cat.D.toolbar.help;
	const div = help.firstChild;
	assert.dom(div).hasTagName('div');
	assert.dom(div.firstChild).hasTagName('h5').hasText('Create a new diagram');
	const rows = [...div.querySelectorAll('tr')];
	rows.map(r => assert.dom(r).hasClass('sidenavRow'));
	assert.equal(rows.length, 4);
	const basenameElt = rows[0].querySelector('input');
	const properNameElt = rows[1].querySelector('input');
	const descElt = rows[2].querySelector('input');
	const codomainElt = rows[3].querySelector('select');
	assert.dom(basenameElt).hasAttribute('id', 'new-basename').hasAttribute('title', 'Base name').hasAttribute('placeholder', 'Base name').hasValue('');
	assert.dom(properNameElt).hasAttribute('id', 'new-properName').hasAttribute('title', 'Proper name').hasAttribute('placeholder', 'Proper name').hasValue('');
	assert.dom(descElt).hasClass('in100').hasAttribute('id', 'new-description').hasAttribute('title', 'Description').  hasAttribute('placeholder', 'Description').hasValue('');
	assert.dom(codomainElt).hasClass('w100').hasAttribute('id', 'new-codomain').hasValue('hdole/PFS');
	basenameElt.value = 'test2';
	properNameElt.value = 'TEST2';
	descElt.value = 'second test diagram';
	const doit = help.querySelector('span.button');
	assert.equal(doit.dataset.name, 'action');
	checkButton(assert, doit, 'action', 'Create a new diagram');
	getButtonClick(doit)();
	const diagramSVG = document.getElementById('diagramSVG');
	const nuDiagram = Cat.R.$CAT.getElement('tester/test2');
	assert.ok(nuDiagram instanceof Cat.Diagram);
	const cnt = diagramSVG.children.length;
	for (let i=0; i<cnt -2; ++i)
		assert.dom(diagramSVG.children[i]).hasTagName('g').hasClass('hidden');
	const last = diagramSVG.children[cnt -1];
	assert.dom(last).doesNotHaveClass('hidden');
	const id = nuDiagram.elementId();
	assert.dom(last.firstChild).hasTagName('g').hasAttribute('id', id + '-T').hasAttribute('transform', /^translate\(.*\) scale\(.*\)$/);
	assert.dom(last.firstChild.firstChild).hasTagName('g').hasAttribute('id', id + '-base');
	assert.equal(last.firstChild.firstChild.children.length, 0);
	// navbar diagram name
	const navbar = document.getElementById('diagram-navbar');
	assert.equal(navbar.firstChild.nodeValue, 'TEST2');
	assert.dom(navbar.firstChild.nextSibling).hasTagName('span').hasClass('italic').hasText('by tester');
});

test('ctrl-D open panel', assert =>
{
	simKeyboardEvent(document.body, 'keydown', {ctrlKey:true, code:'KeyD', key:'d'});
	simKeyboardEvent(document.body, 'keyup', {ctrlKey:true, code:'KeyD', key:'d'});
	const panel = document.getElementById('diagram-sidenav');
	assert.dom(panel).hasTagName('div').hasClass('sidenavPnl').hasClass('sidenavLeftPnl').isNotVisible();	// TODO should become visible
	const dgrmPnlTB = document.getElementById('diagramPanelToolbar');
	const btns = dgrmPnlTB.querySelectorAll('span.button');
	let ndx = 0;
	checkButton(assert, btns[ndx++], 'lock', 'Lock');
	checkButton(assert, btns[ndx++], 'diagramUpload', 'Upload to cloud');
	checkButton(assert, btns[ndx++], 'download-JSON', 'Download JSON');
	checkButton(assert, btns[ndx++], 'download-JS', 'Download Javascript');
	checkButton(assert, btns[ndx++], 'download-C++', 'Download C++');
	checkButton(assert, btns[ndx++], 'download-PNG', 'Download PNG');
	checkButton(assert, btns[ndx++], 'panelExpand', 'Expand');
	checkButton(assert, btns[ndx++], 'panelClose', 'Close');
});

test('user section', assert =>
{
	const userSection = document.getElementById('diagram-user-section');
	assert.dom(userSection).hasTagName('div').hasClass('section').hasStyle({display:'none'});
	assert.equal(userSection.children.length, 2);
	assert.dom(userSection.firstChild).hasTagName('span');
	assert.equal(userSection.firstChild.children.length, 0);
	const userBtn = userSection.previousSibling;
	assert.dom(userSection).hasTagName('div').hasClass('section').hasStyle({display:'none'});
	assert.equal(userSection.children.length, 2);
	userBtn.onclick();
	assert.dom(userSection).hasStyle({display:'block'});
	const catalog = userSection.querySelector('div.catalog');
	assert.equal(catalog.children.length, 2);
	const nuDiagram = Cat.R.$CAT.getElement('tester/test2');
	let qry = `#diagram-user-section-${Cat.U.SafeId(nuDiagram.name)}`;
	const test2entry = catalog.querySelector(qry);
	checkDiagramPanelEntry(assert, 'user', test2entry, nuDiagram);
});

test('click on picture', assert =>
{
	qry = `#diagram-user-section-${Cat.U.SafeId(diagram.name)}`;
	const catalog = Cat.D.diagramPanel.userDiagramSection.catalog;
	const testEntry = catalog.querySelector(qry);
	checkDiagramPanelEntry(assert, 'user', testEntry, diagram);
	testEntry.querySelector('a').onclick();
	const nuDiagram = Cat.R.$CAT.getElement('tester/test2');
	assert.dom(nuDiagram.svgRoot).hasClass('hidden');
	assert.dom(diagram.svgRoot).doesNotHaveClass('hidden');
	// close diagram panel
	const dgrmPnlTB = document.getElementById('diagramPanelToolbar');
	const btns = dgrmPnlTB.querySelectorAll('span.button');
	getButtonClick(btns[btns.length -1])();
});

module('window select');

test('select three morphisms', assert =>
{
	clickDragRelease(assert, diagram.svgRoot, {clientX:0.5 * grid, clientY:4.5 * grid}, {clientX:4.5 * grid, clientY:3.75 * grid});
	assert.equal(diagram.selected.length, 7);
	const elts = ["tester/test/o_14", "tester/test/o_15", "tester/test/m_13", "tester/test/o_16", "tester/test/o_17", "tester/test/m_15", "tester/test/m_14"];
	elts.map(e => checkSelected(assert, diagram.getElement(e)));
	checkToolbarButtons(assert, ['moveToolbar', 'delete', 'closeToolbar']);
	// click delete button
	const svgs = elts.map(e => diagram.getElement(e).svg);
	const delBtn = getToolbarButton('delete');
	getButtonClick(delBtn)();
	assert.equal(diagram.selected.length, 0);
	elts.map(elt => assert.ok(!diagram.getElement(elt), elt));
	svgs.map(svg => assert.ok(!svg.parentNode));
});

module('object drag and drop on object');

test('drag create product object', assert =>
{
	const o5 = diagram.getElement('tester/test/o_5');
	simMouseClick(o5.svg, {clientX:4 * grid, clientY:1 * grid});
	assert.equal(diagram.selected.length, 1);
	// click toolbar copy button and move copy
	let copyBtn = getToolbarButton('copy');
	getButtonClick(copyBtn)();
	checkNotSelected(assert, o5);
	const o14 = diagram.getElement('tester/test/o_14');
	checkSelected(assert, o14);
	clickDragRelease(assert, o14, {clientX:o14.svg.getAttribute('x'), clientY:o14.svg.getAttribute('y') - halfFontHeight}, {clientX:1 * grid, clientY:4 * grid});
	// make a copy and move it
	simMouseClick(o14.svg, {clientX:o14.x, clientY:o14.y});
	getButtonClick(getToolbarButton('copy'))();
	const o15 = diagram.getElement('tester/test/o_15');
	clickDragRelease(assert, o15, {clientX:o15.svg.getAttribute('x'), clientY:o15.svg.getAttribute('y') - halfFontHeight}, {clientX:2 * grid, clientY:4 * grid});
	// make another copy and move it
	simMouseClick(o15.svg, {clientX:o15.x, clientY:o15.y});
	getButtonClick(getToolbarButton('copy'))();
	const o16 = diagram.getElement('tester/test/o_16');
	// drag o16 to o15 and release to make a product
	const start = {clientX:o16.svg.getAttribute('x'), clientY:o16.svg.getAttribute('y') - halfFontHeight};
	const target = {clientX:o15.x, clientY:o15.y};
	simMouseEvent(o16.svg, 'mousemove', start);
	simMouseEvent(o16.svg, 'mouseenter', start);
	simMouseEvent(o16.svg, 'mousedown', start);
	checkSelected(assert, o16);
	simMouseEvent(o16.svg, 'mousemove', target);
	simMouseEvent(o16.svg, 'mouseleave', target);
	simMouseEvent(o15.svg, 'mouseenter', target);
	simMouseEvent(o15.svg, 'mousemove', target);
	assert.dom(o15.svg).hasClass('object').hasClass('grabbable').hasClass('emphasis').doesNotHaveClass('glow').doesNotHaveClass('badGlow').doesNotHaveClass('fuseObject');
	assert.dom(o16.svg).doesNotHaveClass('object').doesNotHaveClass('grabbable').doesNotHaveClass('emphasis').hasClass('glow').hasClass('fuseObject');
	simMouseEvent(o16.svg, 'mouseup', target);
	assert.equal(o16.refcnt, 0);
	assert.equal(o16.svg.parentNode, null);
	const o17 = diagram.getElement('tester/test/o_17');
	checkNotSelected(assert, o17);
	assert.ok(o17.to instanceof Cat.ProductObject);
	assert.equal(o17.to.objects.length, 2);
	assert.equal(o17.to.objects[0].name, o14.to.name);
	assert.equal(o17.to.objects[1].name, o14.to.name);
});

module('factor morphism');

test('toolbar project button', assert =>
{
	const o17 = diagram.getElement('tester/test/o_17');
	simMouseEvent(o17.svg, 'mousedown', {clientX:o17.x, clientY:o17.y});
	simMouseEvent(o17.svg, 'mouseup', {clientX:o17.x, clientY:o17.y});
	checkSelected(assert, o17);
	checkToolbarButtons(assert,
		['moveToolbar', 'identity', 'name', 'homRight', 'homLeft', 'copy', 'run', 'productEdit', 'project', 'inject', 'morphismAssembly', 'delete', 'help', 'closeToolbar']);
	getButtonClick(getToolbarButton('project'))();
});

test('project help display', assert =>
{
	const help = Cat.D.toolbar.help;
	assert.dom(help.firstChild).hasTagName('h4').hasText('Create Factor Morphism');
	const rmvPrnDiv = help.firstChild.nextSibling;
	assert.dom(rmvPrnDiv).hasTagName('div');
	assert.dom(rmvPrnDiv.firstChild).hasTagName('span').hasClass('little').hasText('Remove parenthesis');
	const flattenBtn = rmvPrnDiv.firstChild.nextSibling;
	assert.dom(flattenBtn).hasTagName('button').hasText('Flatten Product');
	assert.equal(typeof flattenBtn.onclick, 'function');
	const h5 = rmvPrnDiv.nextSibling;
	assert.dom(h5).hasTagName('h5').hasText('Domain Factors');
	const small = h5.nextSibling;
	assert.dom(small).hasTagName('small').hasText('Click to place in codomain');
	const terminalBtn = small.nextSibling;
	assert.dom(terminalBtn).hasTagName('button').hasAttribute('id', diagram.elementId()).hasAttribute('title', 'Add terminal object');
	assert.equal(typeof terminalBtn.onclick, 'function');
	const table = terminalBtn.nextSibling;
	assert.dom(table).hasTagName('table');
	const btns = table.querySelectorAll("button[id^='el_project']");
	function checkButton(assert, btn, indices)
	{
		assert.dom(btn).hasAttribute('title', 'Place object');
		assert.equal(btn.dataset.indices, indices.toString());
		assert.equal(typeof btn.onclick, 'function');
	}

	let ndx = 0;

	const fctr = btns[ndx++];
	checkButton(assert, fctr, []);
	assert.equal(fctr.innerText, '(ℤ×ℤ)×(ℤ×ℤ)');

	const fctr0 = btns[ndx++];
	checkButton(assert, fctr0, [0]);
	assert.equal(fctr0.innerHTML, 'ℤ×ℤ<sub>0</sub>');

	const fctr00 = btns[ndx++];
	checkButton(assert, fctr00, [0,0]);
	assert.equal(fctr00.innerHTML, 'ℤ<sub>0,0</sub>');

	const fctr01 = btns[ndx++];
	checkButton(assert, fctr01, [0, 1]);
	assert.equal(fctr01.innerHTML, 'ℤ<sub>0,1</sub>');

	const fctr1 = btns[ndx++];
	checkButton(assert, fctr1, [1]);
	assert.equal(fctr1.innerHTML, 'ℤ×ℤ<sub>1</sub>');

	const fctr10 = btns[ndx++];
	checkButton(assert, fctr10, [1, 0]);
	assert.equal(fctr10.innerHTML, 'ℤ<sub>1,0</sub>');

	const fctr11 = btns[ndx++];
	checkButton(assert, fctr11, [1, 1]);
	assert.equal(fctr11.innerHTML, 'ℤ<sub>1,1</sub>');

	const nxtH5 = table.nextSibling;
	assert.dom(nxtH5).hasTagName('h5').hasText('Codomain Factors');

	const br = nxtH5.nextSibling;
	assert.dom(br).hasTagName('br');

	const span = br.nextSibling;
	assert.dom(span).hasTagName('span').hasClass('smallPrint').hasText('Click objects to remove from codomain');

	const div = span.nextSibling;
	assert.dom(div).hasTagName('div').hasAttribute('id', 'project-codomain');
	assert.equal(div.children.length, 0);
});

test('flatten morphism', assert =>
{
	const help = Cat.D.toolbar.help;
	const btns = help.querySelectorAll("button");
	// press flatten button
	const flatten = btns[0];
	flatten.onclick();
	assert.equal(help.children.length, 0, 'toolbar cleared');
	const m13 = diagram.getElement('tester/test/m_13');
	checkSelected(assert, m13);
	checkIndexMorphism(assert, diagram, {angle: 0, from:m13, to:m13.to, id:"el_tester--test--m_13", domain:m13.domain, codomain:m13.codomain,
		name:'tester/test/m_13', basename:'m_13',
		sig:"dfd7e6bc7944e8efbb466068e60c7b7ad3e55461979d5c996c025dc3bfb5570b", textAnchor:'middle',
		start:{x:499, y:4 * grid}, end:{x:720, y:4 * grid}, d:'M499,800 L720,800', txy:{x:"610", y:"788"}});
	const to = m13.to;
	assert.ok(to instanceof Cat.FactorMorphism);
	assert.equal(to._sig, "e6957092f35646a4ac772764b831df93d1165d7e147cb5093e84e7b4ec801df8");
	const o17 = diagram.getElement('tester/test/o_17');
	assert.ok(to.domain, o17);
	assert.equal(to.category.name, 'hdole/PFS');
	assert.equal(to.basename, "Fa{tester/test/Po{hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP}oP,hdole/Integers/Z_0,0,hdole/Integers/Z_0,1,hdole/Integers/Z_1,0,hdole/Integers/Z_1,1}aF");
	assert.deepEqual(to.factors, [[0, 0], [0, 1], [1, 0], [1, 1]]);
	assert.equal(to.dual, false);
	assert.equal(to.refcnt, 1);
	assert.equal(to.properName, "&lt;&Zopf;&#x2080;,&#x2080;,&Zopf;&#x2080;,&#x2081;,&Zopf;&#x2081;,&#x2080;,&Zopf;&#x2081;,&#x2081;&gt;");
	assert.equal(to.description, '');
	assert.equal(to.diagram.name, 'tester/test');
	assert.ok(to.codomain instanceof Cat.ProductObject);
	assert.equal(to.codomain.objects.length, 4);
	to.codomain.objects.map(o => assert.equal(o.name, 'hdole/Integers/Z'));
	assert.equal(to.codomain.name, "tester/test/Po{hdole/Integers/Z,hdole/Integers/Z,hdole/Integers/Z,hdole/Integers/Z}oP");
	assert.equal(to.codomain.properName, "&Zopf;&times;&Zopf;&times;&Zopf;&times;&Zopf;");
	assert.equal(to.codomain.dual, false);
});

test('delete o14 to clear screen', assert =>
{
	const o14 = diagram.getElement('tester/test/o_14');
	simMouseEvent(o14.svg, 'mousedown', {clientX:o14.x, clientY:o14.y});
	simMouseEvent(o14.svg, 'mouseup', {clientX:o14.x, clientY:o14.y});
	checkSelected(assert, o14);
	getButtonClick(getToolbarButton('delete'))();
	assert.equal(o14.svg.parentNode, null);
	assert.equal(o14.refcnt, 0);
});

test('create factor morphism', assert =>
{
	const help = Cat.D.toolbar.help;
	const o17 = diagram.getElement('tester/test/o_17');
	clickOnElement(assert, o17);
	checkSelected(assert, o17);
	getButtonClick(getToolbarButton('project'))();
	const codDiv = document.getElementById('project-codomain');
	assert.dom(codDiv).hasTagName('div');
	assert.equal(codDiv.children.length, 0);
	const btns = [...help.querySelectorAll("button")];
	assert.equal(btns.length, 9);
	// click for terminal
	btns[1].onclick();
	const doitBtn = codDiv.firstChild;
	checkButton(assert, doitBtn, 'project', 'Create morphism');
	function checkProjectButton(assert, btn, text, indices)
	{
		assert.dom(btn).hasTagName('button');
		assert.equal(btn.innerHTML, text);
		assert.equal(btn.dataset.indices, indices);
		assert.equal(typeof btn.onclick, 'function');
	}
	// codomain terminal button
	const codTermBtn = doitBtn.nextSibling;
	checkProjectButton(assert, codTermBtn, '✲', '-1');
	// click to place entire domain in codomain
	btns[2].onclick();
	const codDomBtn = codTermBtn.nextSibling;
	checkProjectButton(assert, codDomBtn, '(ℤ×ℤ)×(ℤ×ℤ)', '');
	// click second ZxZ button
	const ZxZbtn = btns[6];
	checkProjectButton(assert, ZxZbtn, 'ℤ×ℤ<sub>1</sub>', '1');
	ZxZbtn.onclick();
	const codZxZbtn = codDomBtn.nextSibling;
	checkProjectButton(assert, codZxZbtn, 'ℤ×ℤ<sub>1</sub>', '1');
	// click 3rd Z button
	const Zbtn = btns[7];
	checkProjectButton(assert, Zbtn, 'ℤ<sub>1,0</sub>', '1,0');
	Zbtn.onclick();
	const codZbtn = codZxZbtn.nextSibling;
	checkProjectButton(assert, codZbtn, 'ℤ<sub>1,0</sub>', '1,0');
	// check codomain div
	assert.equal(codDiv.children.length, 5);
	// remove from codomain div
	codZbtn.onclick();
	assert.equal(codZbtn.parentNode, null);
	assert.equal(codDiv.children.length, 4);
	codZxZbtn.onclick();
	assert.equal(codZxZbtn.parentNode, null);
	assert.equal(codDiv.children.length, 3);
	codDomBtn.onclick();
	assert.equal(codDomBtn.parentNode, null);
	assert.equal(codDiv.children.length, 2);
	codTermBtn.onclick();
	assert.equal(codTermBtn.parentNode, null);
	assert.equal(codDiv.children.length, 1);
	// put the object back into the codomain
	btns[1].onclick();
	btns[2].onclick();
	btns[6].onclick();
	btns[7].onclick();
	assert.equal(codDiv.children.length, 5);
	getButtonClick(doitBtn)();
	assert.equal(help.children.length, 0);
	// check factor morphism
	const m14 = diagram.getElement('tester/test/m_14');
	checkIndexMorphism(assert, diagram, {angle:Math.PI, from:m14, to:m14.to, id:"el_tester--test--m_14", domain:o17, codomain:m14.codomain,
		name:'tester/test/m_14', basename:'m_14',
		sig:"8e38d902279fb92842aba71bdc0213ff06a5df738f6d07db3e58873c9df54306", textAnchor:'middle',
		start:{x:301, y:4 * grid}, end:{x:-1, y:4 * grid}, d:'M301,800 L-1,800', txy:{x:"150", y:"836"}});
	checkMorphism(assert, diagram, {basename:"Fa{tester/test/Po{hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP}oP,#1_-1,tester/test/Po{hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP}oP_,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP_1,hdole/Integers/Z_1,0}aF",
			properName:"&lt;&#10034;,(&Zopf;&times;&Zopf;)&times;(&Zopf;&times;&Zopf;),&Zopf;&times;&Zopf;&#x2081;,&Zopf;&#x2081;,&#x2080;&gt;",
			refcnt:1, instanceof:Cat.FactorMorphism, factors:[-1, [], [1], [1, 0]], dual:false,
			morphism:m14.to, domain:o17.to, codomain:m14.codomain.to, sig:"e0d579f6b9c3311e84f4c14d6c6d53a627b5c37629c8bf9bcdd6e6fba63ae4c3"});
});

test('evaluate the factor morphism', assert =>
{
	const help = Cat.D.toolbar.help;
	const m14 = diagram.getElement('tester/test/m_14');
	assert.equal(help.children.length, 0);
	getButtonClick(getToolbarButton('run'))();
	const h3 = help.firstChild;
	assert.dom(h3).hasTagName('h3').hasText('<✲,(ℤ×ℤ)×(ℤ×ℤ),ℤ×ℤ₁,ℤ₁,₀>');
	const h5 = h3.nextSibling;
	assert.dom(h5).hasTagName('h5').hasText('Evaluate the Morphism');
	let node = h5.nextSibling;
	const inputs = [];
	assert.ok(node instanceof Text);
	assert.equal(node.nodeValue, '(');
	node = node.nextSibling;
	assert.dom(node).hasTagName('input').hasAttribute('id', ' hdole/Integers/Z 0,0').hasAttribute('placeHolder', 'Integer');
	inputs.push(node);
	node = node.nextSibling;
	assert.equal(node.nodeValue, ',');
	node = node.nextSibling;
	assert.dom(node).hasTagName('input').hasAttribute('id', ' hdole/Integers/Z 0,1').hasAttribute('placeHolder', 'Integer');
	inputs.push(node);
	node = node.nextSibling;
	assert.equal(node.nodeValue, '),(');
	node = node.nextSibling;
	assert.dom(node).hasTagName('input').hasAttribute('id', ' hdole/Integers/Z 1,0').hasAttribute('placeHolder', 'Integer');
	inputs.push(node);
	node = node.nextSibling;
	assert.equal(node.nodeValue, ',');
	node = node.nextSibling;
	assert.dom(node).hasTagName('input').hasAttribute('id', ' hdole/Integers/Z 1,1').hasAttribute('placeHolder', 'Integer');
	inputs.push(node);
	node = node.nextSibling;
	assert.equal(node.nodeValue, ')');
	const runBtn = node.nextSibling;
	checkButton(assert, runBtn, 'run', 'Evaluate inputs');
	const display = runBtn.nextSibling;
	assert.equal(display.children.length, 0);
	assert.dom(display).hasTagName('div');
	const createDataDiv = display.nextSibling;
	assert.dom(createDataDiv).hasTagName('div').hasAttribute('id', 'run-createDataBtn').hasStyle({display:'none'});
	const createDataBtn = createDataDiv.firstChild;
	// set inputs to 0, 1, 2, 3
	inputs.map((input, i) => input.value = i);
	getButtonClick(runBtn)();
	const didit = assert.async();
	Cat.R.Actions.run.postResultFun = function()
	{
		checkButton(assert, createDataBtn, 'createData', 'Create data morphism');
		const dataDiv = display.firstChild.nextSibling;
		assert.dom(createDataDiv).hasStyle({display:'block'});
		assert.dom(display.firstChild).hasTagName('h3').hasText('Data');
		assert.dom(dataDiv).hasTagName('div');
		assert.dom(dataDiv.firstChild).hasTagName('span').hasText('[[0,1],[2,3]]');
		assert.dom(dataDiv.firstChild.nextSibling).hasTagName('span').hasText('→');
		assert.dom(dataDiv.firstChild.nextSibling.nextSibling).hasTagName('span').hasText('[0,[[0,1],[2,3]],[2,3],2]');
		didit();
		const repHelp = JSON.parse(`{"tagName":"DIV","id":"toolbar-help","children":[{"tagName":"H3","innerText":"<✲,(ℤ×ℤ)×(ℤ×ℤ),ℤ×ℤ₁,ℤ₁,₀>"},{"tagName":"H5","innerText":"Evaluate the Morphism"},{"tagName":"INPUT","type":"number","id":" hdole/Integers/Z 0,0","placeholder":"Integer","value":"0"},{"tagName":"INPUT","type":"number","id":" hdole/Integers/Z 0,1","placeholder":"Integer","value":"1"},{"tagName":"INPUT","type":"number","id":" hdole/Integers/Z 1,0","placeholder":"Integer","value":"2"},{"tagName":"INPUT","type":"number","id":" hdole/Integers/Z 1,1","placeholder":"Integer","value":"3"},{"tagName":"SPAN","classList":["button"],"title":"Evaluate inputs","data-name":"run","children":[{"tagName":"svg","xmlns":"http://www.w3.org/2000/svg","width":"0.21120000000000003in","height":"0.21120000000000003in","version":"1.1","viewBox":"0 0 320 320","children":[{"tagName":"rect","x":"0","y":"0","width":"320","height":"320","style":"fill:#ffffff"},{"tagName":"path","classList":["svgstr4"],"d":"M280 40 160 280 80 240","marker-end":"url(#arrowhead)"},{"tagName":"rect","classList":["btn"],"x":"0","y":"0","width":"320","height":"320","onclick":"Cat.R.Actions.javascript.evaluate(event, Cat.R.diagram, 'tester/test/Fa{tester/test/Po{hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP}oP,#1_-1,tester/test/Po{hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP}oP_,hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP_1,hdole/Integers/Z_1,0}aF', Cat.R.Actions.run.postResult)"}]}]},{"tagName":"DIV","id":"run-display","children":[{"tagName":"H3","innerText":"Data"},{"tagName":"DIV","children":[{"tagName":"SPAN","innerText":"[[0,1],[2,3]]"},{"tagName":"SPAN","innerText":"→"},{"tagName":"SPAN","innerText":"[0,[[0,1],[2,3]],[2,3],2]"}]}]},{"tagName":"DIV","id":"run-createDataBtn","style":"","children":[{"tagName":"SPAN","classList":["button"],"title":"Create data morphism","data-name":"createData","children":[{"tagName":"svg","xmlns":"http://www.w3.org/2000/svg","width":"0.21120000000000003in","height":"0.21120000000000003in","version":"1.1","viewBox":"0 0 320 320","children":[{"tagName":"rect","x":"0","y":"0","width":"320","height":"320","style":"fill:#ffffff"},{"tagName":"circle","cx":"80","cy":"80","r":"60","fill":"url(#radgrad2)"},{"tagName":"circle","cx":"80","cy":"160","r":"60","fill":"url(#radgrad1)"},{"tagName":"circle","cx":"80","cy":"240","r":"60","fill":"url(#radgrad2)"},{"tagName":"circle","cx":"160","cy":"80","r":"60","fill":"url(#radgrad1)"},{"tagName":"circle","cx":"160","cy":"160","r":"60","fill":"url(#radgrad1)"},{"tagName":"circle","cx":"160","cy":"240","r":"60","fill":"url(#radgrad1)"},{"tagName":"circle","cx":"240","cy":"80","r":"60","fill":"url(#radgrad2)"},{"tagName":"circle","cx":"240","cy":"160","r":"60","fill":"url(#radgrad1)"},{"tagName":"circle","cx":"240","cy":"240","r":"60","fill":"url(#radgrad2)"},{"tagName":"rect","classList":["btn"],"x":"0","y":"0","width":"320","height":"320","onclick":"Cat.R.Actions.run.createData(event, Cat.R.diagram, 'tester/test/m_14')"}]}]}]}]}`);
		compareRepresentation(assert, help, repHelp);
	};
});
