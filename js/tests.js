const {module, test} = QUnit;

function cleanup()
{
	const locals = ['categories', 'diagramas', 'hdole/Basics.json', 'hdole/floats.json', 'hdole/hdole.json', 'hdole/HTML.json', 'hdole/Integers.json', 'hdole/Logic.json',
		'hdole/Narithmetics.json', 'hdole/Strings.json'];
	locals.map(file => localStorage.removeItem(file));
}

cleanup();

const StartOfRun = new Date();	// use for timestamp comparison checks that come afterwards

module('Basics');

QUnit.config.hidepassed = true;
QUnit.config.maxDepth = 10;
QUnit.dump.maxDepth = 10;

// overrides
Cat.R.sync = false;
Cat.D.url = window.URL || window.webkitURL || window;
Cat.D.default.autohideTimer = 10000000;
Cat.D.mouse.down = new Cat.D2(100, 100);
Cat.D.default.statusbar.timein = 0;

const halfFontHeight = Cat.D.default.font.height / 2;
const grid = Cat.D.default.arrow.length;
const descriptionText = 'This is a test and only a test';
let testname = '';

QUnit.testDone( details =>
{
	if (details.failed > 0)
		QUnit.config.queue.length = 0;
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Support Functions
//

function checkArgs(assert, obj, args)
{
	for(const arg in args)
		if (args.hasOwnProperty(arg))
			assert.ok(obj[arg] === args[arg], `${obj.name} ${arg} is ok`);
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

function getToolbarButton(name)
{
	return Cat.D.toolbar.element.querySelector(`[data-name="${name}"]`);
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

function procit(text)
{
	return Cat.H3.span(text).innerText;
}

function simMouseEvent(elt, type, args)
{
	const nuArgs = Cat.U.ObjClone(args);
	if ('x' in args)
	{
		const clientXY = getCoords(args);
		nuArgs.clientX = clientXY.clientX;
		nuArgs.clientY = clientXY.clientY;
	}
	if (!('bubbles' in args))
		nuArgs.bubbles = true;
	nuArgs.clientY += Cat.D.topSVG.parentElement.offsetTop;
	const e = new MouseEvent(type, nuArgs);
	elt.dispatchEvent(e);
}

function simMouseClick(elt, args)
{
	simMouseEvent(elt, 'mousedown', args);
	simMouseEvent(elt, 'mouseup', args);
}

function simMouseClick2(elt, args)
{
	simMouseEvent(Cat.D.topSVG, 'mousemove', args);
	simMouseEvent(elt, 'mouseenter', args);
	simMouseEvent(elt, 'mousedown', args);
	simMouseEvent(Cat.D.topSVG, 'mousedown', args);
	simMouseEvent(elt, 'mouseup', args);
	simMouseEvent(Cat.D.topSVG, 'mouseup', args);
	simMouseEvent(elt, 'mouseleave', args);
}

function simKeyboardEvent(elt, type, args)
{
	const nuArgs = Cat.U.ObjClone(args);
	if (!('bubbles' in args))
		nuArgs.bubbles = true;
	const event = new KeyboardEvent(type, nuArgs);
	elt.dispatchEvent(event);
}

function simKeyboardClick(elt, args = {})
{
	const nuArgs = Cat.U.Clone(args);
	if (!('code' in nuArgs))
		nuArgs.code = nuArgs.key;
	simKeyboardEvent(elt, 'keydown', nuArgs);
	simKeyboardEvent(elt, 'keyup', nuArgs);
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

function selectElement(element)
{
	simMouseEvent(element.svg, 'mousedown', element);
	simMouseEvent(element.svg, 'mouseup', element);
}

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

function getRepresentation(elt)
{
	if (elt instanceof HTMLElement || elt instanceof SVGElement || elt instanceof Text)
	{
		const rep = {constructor:elt.constructor.name};
		if ('tagName' in elt)
			rep.tagName = elt.tagName;
		if ('classList' in elt && elt.classList.length > 0)
			rep.classList = [...elt.classList];
		if ('attributes' in elt)
		{
			const attrs = [...elt.attributes];
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
		}
		if (rep.tagName === 'INPUT')
			rep.value = elt.value;
		if (elt.constructor.name === 'Text')
			rep.text = elt.textContent;
		const listeners = [];
		const events = ['click', 'focus', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseup'];
		events.map(name =>
		{
			const handler = `on${name}`;
			if (elt[handler])
				listeners.push([handler, elt[handler].toString()]);
		});
		if (listeners.length > 0)
			rep.listeners = listeners;
		if (elt.childNodes.length > 0)
		{
			rep.childNodes = [];
			[...elt.childNodes].map(c => rep.childNodes.push(getRepresentation(c)));
		}
		return rep;
	}
	else if ('json' in elt)
	{
		const rep = elt.json();
		// extras
		if ('refcnt' in elt)
			rep.refcnt = elt.refcnt;
		if (elt instanceof Cat.DiagramObject)
		{
			rep.domains = [...elt.domains].map(dom => dom.name);
			rep.codomains = [...elt.codomains].map(cod => cod.name);
		}
		return rep;
	}
	else
		return Cat.U.ObjClone(elt);
}

function compareCatRepresentation(assert, teststep, elt, rep)
{
	assert.deepEqual(elt, rep, `${teststep} ${elt.name}`);
}

function compareDomRepresentation(assert, teststep, domElt, rep)
{
	const testname = assert.test.testName;
	const key = getKey(testname, teststep);
	if (!rep)
	{
		assert.ok(false, `${key}:missing rep`);
		return;
	}
	for (const name in rep)
		if (rep.hasOwnProperty(name))
		{
			switch(name)
			{
				case 'childNodes':
				case 'key':
					break;
				case 'classList':
					assert.deepEqual(domElt.classList, rep.classList, `${key}: ${name}`);
					break;
				case 'listeners':
					assert.deepEqual(domElt.listeners, rep.listeners, `${key}: ${name}`);
					break;
				default:
					assert.equal(domElt[name], rep[name], `${key}: ${name}: ${domElt[name]}`);
					break;
			}
		}
	assert.equal(	'childNodes' in domElt ? domElt.childNodes.length : 0,
					'childNodes' in rep ? rep.childNodes.length : 0, `${key}: number of childNodes`);
	if ('childNodes' in rep  || 'childNodes' in domElt)
	{
		if (!domElt.childNodes || !rep.childNodes)
			assert.ok(false, `${key}: one has no children`);
		else
		{
			assert.equal(domElt.childNodes.length, rep.childNodes.length, `${key}: child length ok`);
			if (domElt.childNodes.length === rep.childNodes.length)
				rep.childNodes.map((c, i) => compareDomRepresentation(assert, teststep, domElt.childNodes[i], c));
		}
	}
}

function getKey(testname, teststep)
{
	return `${testname}-${teststep}`;
}

async function downloadElements()
{
	let result;
	const promise = new Promise((resolve, reject) =>
	{
		const tx = infoDB.transaction(['elements'], 'readonly');
		tx.oncomplete = _ => resolve(result);
		tx.onerror = event => reject(event.target.error);
		const store = tx.objectStore('elements');
		let req;
		req = store.getAll();
		req.onsuccess = _ => result = req.result;
	});
	try
	{
		result = await promise;
		Cat.D.DownloadString(JSON.stringify(result), 'json', 'testInfoElements.json');
	}
	catch(error)
	{
		console.trace(error);
	}
	return result;
}

function getKeyCount(key)
{
	return new Promise((resolve, reject) =>
	{
		let result;
		const tx = infoDB.transaction(['elements'], 'readonly');
		tx.oncomplete = _ => resolve(result);
		tx.onerror = e => {console.trace('error', e.target.error);reject(e.target.error);};
		const store = tx.objectStore('elements');
		const req = store.count(IDBKeyRange.only(key));
		req.onsuccess = _ => result = req.result;
	});
}

function putResult(testname, teststep, rep)
{
	return new Promise((resolve, reject) =>
	{
		let result;
		const tx = infoDB.transaction(['elements'], 'readwrite');
		tx.oncomplete = _ => resolve(result);
		tx.onerror = event => reject(event.target.error);
		const store = tx.objectStore('elements');
		const key = getKey(testname, teststep);
		rep.key = key;
		let req = store.put(rep);
		req.onsuccess = _ => result = req.result;
	});
}

function getResult(key)
{
	return new Promise((resolve, reject) =>
	{
		let result;
		const tx = infoDB.transaction(['elements'], 'readonly');
		tx.oncomplete = _ => resolve(result);
		tx.onerror = e => reject(e.target.error);
		const store = tx.objectStore('elements');
		const req = store.get(key);
		req.onsuccess = _ => result = req.result;
	});
}

const storedItems = new Set();

function checkStore(assert, teststep, elt, didit = assert.async())
{
	if (elt === undefined)
		throw 'cannot check undefined';
	const testname = assert.test.testName;
	const key = getKey(testname, teststep);
	if (storedItems.has(key))
		throw 'two keys with the same name';
	storedItems.add(key);
	const nuRep = getRepresentation(elt);
	nuRep.key = key;
	// is it in the store?
	getKeyCount(key).then(count => count === 0 && putResult(testname, teststep, nuRep)).
	then(_ => getResult(key)).
	then(rep =>
	{
		if (elt instanceof HTMLElement || elt instanceof SVGElement || elt instanceof Text)
			compareDomRepresentation(assert, teststep, nuRep, rep);
		else
			compareCatRepresentation(assert, teststep, nuRep, rep);
		didit && didit();
	});
}

function clickDragRelease(assert, element, start, target, checkSelectRect = false)
{
	const isIndex = Cat.U.IsIndexElement(element);
	const svg = isIndex ? element.svg : element;
	simMouseEvent(svg, 'mousemove', start);
	simMouseEvent(svg, 'mouseenter', start);
	checkSelectRect && assert.ok(!document.getElementById('selectRect'), 'no select rect');
	simMouseEvent(svg, 'mousedown', start);
	simMouseEvent(svg, 'mousemove', target);
	checkSelectRect && checkStore(assert, 'select rect', document.getElementById('selectRect'));
	simMouseEvent(svg, 'mouseup', target);
	simMouseEvent(svg, 'mouseleave', target);
}

function getCoords(ndxElt)
{
	const winXY = diagram.diagramToUserCoords(ndxElt).round();
	return {clientX:winXY.x, clientY:winXY.y};
}

function getEltCoords(elt)
{
	const bbox = elt.getBoundingClientRect();
	const winXY = diagram.diagramToUserCoords(bbox);
	return {clientX:winXY.x, clientY:winXY.y};
}

function select(elt, shiftKey = false)
{
	const evnt = getEltCoords(elt.svg);
	evnt.shiftKey = shiftKey;
	elt.svg.onmousedown(evnt);
}

function clickButton(btn)
{
	clicker = getButtonClick(btn);
	clicker(getEltCoords(btn));
}

function clickToolbarButton(name)
{
	clickButton(getToolbarButton(name));
}

function getLastElement()
{
	return [...diagram.domain.elements].pop()[1];	// last element created
}

function getMorphismXY(morph)
{
	const x = morph.svg_name.getAttribute('x');
	const y = morph.svg_name.getAttribute('y');
	return {x, y};
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Tests
//
//
module('D2');

test(' basics', assert =>
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
	const zerooneD2 = new D2(0, 1);
	assert.ok(!onezeroD2.equals(zerooneD2), 'not equals ok');
	assert.ok(new D2(4.1, 5.9).trunc().equals({x:4, y:5}));
	console.log(new D2(-4.1, -5.9).trunc().equals({x:4, y:5}));
	assert.ok(new D2(-4.1, -5.9).trunc().equals({x:-4, y:-5}));
	assert.ok(new D2(-0.9, 0.9).trunc().equals({x:0, y:0}));
});

test('contains', assert =>
{
	const D2 = Cat.D2;
	const r0011 = new D2({x:0, y:0, width:100, height:100});
	const r0022 = new D2({x:0, y:0, width:200, height:200});
	const r1122 = new D2({x:100, y:100, width:100, height:100});
	const r1124 = new D2({x:100, y:100, width:100, height:400});
	const r1021 = new D2({x:100, y:0, width:100, height:100});
	const r0033 = new D2({x:0, y:0, width:200, height:200});
	const r1133 = new D2({x:100, y:100, width:200, height:200});
	assert.ok(!r0011.contains(r0022));
	assert.ok(!r0011.contains(r1122));
	assert.ok(r0022.contains(r0011));
	assert.ok(r0022.contains(r1122));
	assert.ok(r1124.contains(r1122));
	assert.ok(!r1124.contains(r0022));
	assert.ok(!r1124.contains(r1021));
	assert.ok(!r1133.contains(r0022));
	assert.ok(!r0022.contains(r1133));
	assert.ok(r1133.contains(r1122));
	assert.ok(r0033.contains(r1122));
	assert.ok(!r0033.contains(r1124));
});

module('Base');

testname = 'base classes exist';
test(testname, assert =>
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

module('U utility');

test('array equality', assert =>
{
	assert.ok(Cat.U.ArrayEquals([], []), 'empty arrays ok');
	assert.ok(Cat.U.ArrayEquals(['foo'], ['foo']), 'arrays with a string ok');
	assert.ok(!Cat.U.ArrayEquals(['foo'], []));
	assert.ok(!Cat.U.ArrayEquals([], ['foo']));
	assert.ok(!Cat.U.ArrayEquals([3], ['foo']));
	assert.ok(Cat.U.ArrayEquals([3], [3]));
	assert.ok(Cat.U.ArrayEquals([1, 2, 3], [1, 2, 3]));
	assert.ok(!Cat.U.ArrayEquals([1, 2, 3], [1, 2]));
	assert.ok(!Cat.U.ArrayEquals([1, 2], [1, 2, 3]));
	assert.ok(Cat.U.ArrayEquals([[[3]]], [[[3]]]));
	assert.ok(Cat.U.ArrayEquals([1, [2, 3]], [1, [2, 3]]));
	assert.ok(Cat.U.ArrayEquals([1, [2, 3], [4, 5]], [1, [2, 3], [4, 5]]));
	assert.ok(!Cat.U.ArrayEquals([], null));
	assert.ok(!Cat.U.ArrayEquals([1, [2, 3], [4, 5]], [1, [2, -1], [4, 5]]));
});

//********************************************
// Sequential GUI testing begins here
QUnit.config.reorder = false;
//********************************************

module('startup');

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
	Cat.D.AddEventListeners();
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
	const args = Cat.U.ObjClone(testDiagramInfo);
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
	assert.ok(_Cat.user === 'sys', 'Cat user name is ok');
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
	assert.equal(diagram.signature, "1647952c5a96c4a8239bcf9afb5ff95000c6f4fa27ff902ff24dac41d21fea89", 'Diagram signature is ok');
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
	checkStore(assert, 'navbar', Cat.D.navbar);
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
	// TODO put back in:	try { const obj2 = new Cat.CatObject(diagram, args); }
	// TODO					catch(x) { didit = true; }
	// TODO					assert.ok(didit, 'Cannot create object with same basename');
	checkArgs(assert, obj, args);
	assert.ok(!('svg' in obj), 'Object does not have svg');
	assert.equal(obj.signature, "869a4e90a5d64c453fe80ae1cfe0d9b05535150a561477734f63ea128f7e89b0", 'Object signature ok');
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
	simMouseEvent(diagram.svgRoot, 'mousedown', {clientX:100, clientY:200});
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
	checkStore(assert, 'new morphism ok', morphism);
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
	checkStore(assert, 'placed morphism ok', from);
	checkStore(assert, 'placed morphism graphics ok', from.svg);
});

test('Create identity', assert =>
{
	const t0 = diagram.getElement('t0');
	const morphism = diagram.id(t0);
	checkStore(assert, 'identity ok', morphism);
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
	checkStore(assert, 'placed morphism by object ok', from);
	checkStore(assert, 'placed morphism by object graphics ok', from.svg);
	checkStore(assert, 'placed domain', from.domain);
	checkStore(assert, 'placed codomain', from.codomain);
	// placeMorphismByObject
	from = diagram.placeMorphismByObject(null, 'codomain', t0ndxName, t0id.name, false);		// false arg#5 no test of save here
	checkStore(assert, 'placed 2nd morphism by object ok', from);
	checkStore(assert, 'placed 2nd morphism by object graphics ok', from.svg);
	const t2ndx = diagram.getElement(t2ndxName);
	checkStore(assert, 'placed object for domain', t2ndx);
	// placeMorphismByObject
	from = diagram.placeMorphismByObject(null, 'domain', t1ndxName, t1id.name, false);		// false arg#5 no test of save here
	checkStore(assert, 'placed 3rd morphism by object ok', from);
	checkStore(assert, 'placed 3rd morphism by object graphics ok', from.svg);
	checkStore(assert, 'placed 3rd domain', from.domain);
	checkStore(assert, 'placed 3rd codomain', from.codomain);
	const o4 = diagram.getElement('tester/test/o_4');
	checkStore(assert, 'placed object for codomain', o4);
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
	const toolbar = Cat.D.toolbar.element;
	checkStore(assert, 'toolbar 1', toolbar);
	// select
	diagram.makeSelected(o2);
	checkSelected(assert, o2);
	checkStore(assert, 'toolbar 2', toolbar);
	assert.ok(sawit, 'Object select event occurred');
	assert.equal(diagram.selected.length, 1, 'Diagram selected length ok');
	const o2elt = document.getElementById(o2.elementId());
	checkStore(assert, 'object selected', o2elt);
	checkStore(assert, 'toolbar 3', toolbar);
	// deselect
	diagram.makeSelected(null);
	checkStore(assert, 'toolbar 4', toolbar);
	assert.equal(diagram.selected.length, 0, 'Diagram selected set is empty');
	checkStore(assert, 'object not selected', o2elt);
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
	const toolbar = Cat.D.toolbar.element;
	checkStore(assert, 'toolbar 1', toolbar);
	assert.ok(sawit, 'Morphism select event occurred');
	assert.equal(diagram.selected.length, 1, 'Diagram selected length ok');
	checkSelected(assert, m1);
	checkStore(assert, 'toolbar 1.5', toolbar);
	diagram.makeSelected(null);
	checkStore(assert, 'toolbar 2', toolbar);
	checkStore(assert, 'morphism not selected', m1.svg);
});

test('Compose three morphisms', assert =>
{
	const m2 = diagram.getElement('tester/test/m_2');
	// select
	diagram.makeSelected(m2);
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
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
	checkStore(assert, 'toolbar', Cat.D.toolbar.element);
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
		assert.equal(cell.name, 'tester/test/c_0', 'cell name ok');
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
		assert.equal(svg.dataset.name, 'tester/test/c_0', 'Svg dataset name ok');
		// cleanup
		Cat.R.workers.equality.removeEventListener('message', lookforit);
		didit();
	};
	Cat.R.workers.equality.addEventListener('message', lookforit);
	const morphisms = diagram.selected.map(e => e.to);
	const domain = m2.domain;
	const codomain = m3.codomain;
	// click
	clickToolbarButton('composite');
	m4 = diagram.getElement('tester/test/m_4');
	assert.ok(m4 instanceof Cat.DiagramComposite, 'DiagramComposite exists');
	assert.ok(m4.to instanceof Cat.Composite, 'Composite exists');
	m4.morphisms.map((m, i) => assert.equal(m.to, m4.to.morphisms[i], `Component morphism ${i} ok`));
	m4.morphisms.map((m, i) => assert.equal(m.refcnt, 2, `Component morphism ${i} refcnt ok`));
	checkSelected(assert, m4, 'DiagramComposite is selected');
	assert.equal(diagram.selected.length, 1, 'Only one element selected');
	const to = m4.to;
	assert.ok(to instanceof Cat.Composite, 'Composite ok');
	checkStore(assert, 'composite', to);
	checkStore(assert, 'index composite', m4);
	checkStore(assert, 'index composite graphics', m4.svg);
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
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
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
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
	checkSelected(assert, morphism);
	const btns = getToolbarButtons();
	const runBtns = btns.filter(btn => btn.dataset.name === 'run');
	assert.equal(runBtns.length, 1, 'One run button in toolbar');
	const runBtn = runBtns[0];
	// click
	runBtn.firstChild.lastChild.onclick();
	const in0 = document.getElementById("fctr--hdole--Integers--Z-0");
	assert.dom(in0).hasTagName('input', 'Input 0 ok');
	const in1 = document.getElementById("fctr--hdole--Integers--Z-1");
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
	checkStore(assert, 'evaluation ' + indexName, Cat.D.toolbar.element);
	checkStore(assert, 'evaluation from' + indexName, from);
	checkStore(assert, 'evaluation from svg' + indexName, from.svg);
	// click
	clickToolbarButton('run');
	const in0 = document.getElementById("fctr--hdole--Integers--Z-0");
	assert.dom(in0).hasTagName('input', 'Input 0 ok');
	const in1 = document.getElementById("fctr--hdole--Integers--Z-1");
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
	checkStore(assert, 'toolbar', Cat.D.toolbar.element);
	// click
	clickToolbarButton('run');
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
	assert.dom(input).hasTagName('input').hasValue('7', 'Codomain value ok').hasAttribute('type', 'number', 'Input type ok').hasAttribute('id', 'fctr-0-hdole--Integers--Z-', 'Id ok').
		hasAttribute('placeHolder', 'Integer', 'Placeholder ok');
	const edit = row.children[2].firstElementChild;
	checkStore(assert, 'edit button', edit);
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
	const o8 = diagram.getElement('tester/test/o_8');
	diagram.makeSelected(o8);
	checkStore(assert, 'place object', o8);
	checkStore(assert, 'place object to', o8.to);
	const id = o8.elementId();
	const o8elt = document.getElementById(id);
	const delBtn = getToolbarButton('delete');
	checkStore(assert, 'delete button', delBtn);
	const oldDomCnt = diagram.domain.elements.size;
	getButtonClick(delBtn)();
	assert.equal(oldDomCnt -1, diagram.domain.elements.size, 'Domain index category decreased by one');
	assert.equal(undefined, document.getElementById(id), 'element with id is gone');
	checkStore(assert, 'target refcnt decreased', o8.to);
});

test('Composite', assert =>
{
	const ZxZ = diagram.getElement("hdole/Integers/Po{hdole/Integers/Z,hdole/Integers/Z}oP");
	assert.ok(ZxZ instanceof Cat.CatObject);
	const xy = {x:2 * grid, y:3 * grid};
	const from = diagram.placeObject(null, ZxZ, xy);	// do not test saving or selection here
	checkStore(assert, 'place object', from);
	checkStore(assert, 'place object to', from.to);
	// select
	diagram.makeSelected(from);
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
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
	checkStore(assert, 'toolbar 2', Cat.D.toolbar.element);
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
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
	const btn = getToolbarButton('homset');
	getButtonClick(btn)();
	const help = Cat.D.toolbar.help;
	const tbl = document.getElementById('help-homset-morphism-table');
	assert.dom(tbl).hasTagName('table', 'homset table ok');
	const rows = tbl.querySelectorAll('tr.sidenavRow');
	assert.equal(rows.length, 2, 'two results ok');
	rows[0].onclick();
	checkStore(assert, 'toolbar 2', Cat.D.toolbar.element);
	const from = diagram.getElement('tester/test/m_11');
	checkSelected(assert, from);
	checkStore(assert, 'm11', from);
	checkStore(assert, 'm11 graphics', from.svg);
	m4 = diagram.getElement('tester/test/m_4');
	checkStore(assert, 'homset', m4);
	checkStore(assert, 'homset graphics', m4.svg);
});

test('index object check', assert =>
{
	['tester/test/o_1', 'tester/test/o_2', 'tester/test/o_3', 'tester/test/o_4', 'tester/test/o_5'].map(nam => checkStore(assert, nam, diagram.getElement(nam)));
});

test('move object', assert =>
{
	const o11 = diagram.getElement('tester/test/o_11');
	simMouseEvent(o11.svg, 'mousedown', {clientX:o11.x, clientY:o11.y});
	assert.ok(Cat.D.mouseIsDown, 'mouse is down');
	const pos = Cat.D.mouse.clientPosition();
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
	checkStore(assert, 'm12', m4);
	checkStore(assert, 'm12 graphics', m4.svg);
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
	simMouseEvent(o1.svg, 'mouseenter', {x:o1.x, y:o1.y});
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
	// click ident
	clickToolbarButton('identity');
	const o15 = diagram.getElement('tester/test/o_15');
	diagram.makeSelected(o15);
	clickToolbarButton('identity');
	const o16 = diagram.getElement('tester/test/o_16');
	diagram.makeSelected(o16);
	clickToolbarButton('identity');
	const m13 = diagram.getElement('tester/test/m_13');
	const m14 = diagram.getElement('tester/test/m_14');
	const m15 = diagram.getElement('tester/test/m_15');
	assert.ok(m14, 'm14 ok');
	diagram.makeSelected(m14);
	checkConnector(assert, m14.domain);
	checkConnector(assert, m14.codomain);
	// click detach codomain
	clickToolbarButton('detachCodomain');
	checkConnector(assert, m14.domain);
	assert.equal(m14.codomain.domains.size, 0, 'm14 codomain domains size ok');
	assert.equal(m14.codomain.codomains.size, 1, 'm14 codomain codomains size ok');
	// click detach domain
	clickToolbarButton('detachDomain');
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
	simMouseEvent(o19.svg, 'mousemove', o19);
	simMouseEvent(o19.svg, 'mouseenter', o19);
	simMouseEvent(o19.svg, 'mousedown', o19);
	simMouseEvent(o15.svg, 'mouseenter', o15);
	simMouseEvent(o19.svg, 'mousemove', o15);
	assert.equal(o19.x, o15.x, 'moved x ok');
	assert.equal(o19.y, o15.y, 'moved x ok');
	assert.dom(o19.svg).hasClass('emphasis', 'drop emphasis ok').hasClass('fuseObject', 'drop fuseObject class ok').hasClass('glow', 'drop glow class ok');
	simMouseEvent(o19.svg, 'mouseup', o15);
	simMouseEvent(o15.svg, 'mouseleave', o15);
	// o19 is gone
	assert.equal(o19.refcnt, 0, 'o_19 deleted ok');
	assert.equal(o19.svg.parentNode, null, 'o_19.svg parent node is null');
	checkConnector(assert, o15);
	// fuse codomain
	simMouseEvent(o18.svg, 'mousemove', o18);
	simMouseEvent(o18.svg, 'mouseenter', o18);
	simMouseEvent(o18.svg, 'mousedown', o18);
	simMouseEvent(o16.svg, 'mouseenter', o16);
	simMouseEvent(o18.svg, 'mousemove', o16);
	assert.equal(o18.x, o16.x, 'moved x ok');
	assert.equal(o18.y, o16.y, 'moved x ok');
	assert.dom(o16.svg).hasClass('emphasis', 'target emphasis ok');
	assert.dom(o18.svg).hasClass('emphasis', 'drop emphasis ok').hasClass('fuseObject', 'drop fuseObject class ok').hasClass('glow', 'drop glow class ok');
	simMouseEvent(o18.svg, 'mouseup', o16);
	simMouseEvent(o16.svg, 'mouseleave', o16);
	// o18 is gone
	assert.equal(o18.refcnt, 0, 'o_18 deleted ok');
	assert.equal(o18.svg.parentNode, null, 'o_18.svg parent node is null');
	checkConnector(assert, o16);
});

test('toolbar nothing selected', assert =>
{
	const toolbar = Cat.D.toolbar;
	// click on nothing
	simMouseClick(diagram.svgRoot, {x:3 * grid, y:2 * grid});
	assert.ok(toolbar.element.classList.contains('hidden'), 'toolbar hidden');
	simMouseClick(diagram.svgRoot, {x:3 * grid, y:2 * grid});
	assert.ok(!toolbar.element.classList.contains('hidden'), 'toolbar showing');
	assert.equal(diagram.selected.length, 0, 'Nothing selected ok');
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
	diagram.domain.elements.forEach(elt => checkNotSelected(assert, elt));
});

test('ControlKeyA select everything', assert =>
{
	// controlKeyA
	simKeyboardClick(document.body, {ctrlKey:true, code:'KeyA', key:'a'});
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
	simMouseClick(diagram.svgRoot, {x:3 * grid, y:2 * grid});
	assert.equal(diagram.selected.length, 0, 'nothing selected ok');
	// click text button
	clickToolbarButton('newText');
	const help = Cat.D.toolbar.help;
	assert.dom(help.firstChild).hasTagName('div', 'div tag ok');
	assert.dom(help.firstChild.firstChild).hasTagName('h5', 'h5 tag ok');
	const desc = document.getElementById('new-description');
	assert.dom(desc).hasTagName('input').hasValue('', 'no value ok').hasClass('in100', 'class in100 ok').hasProperty('title', 'Description', 'title ok').
		hasProperty('placeholder', 'Description', 'placeholder ok');
	assert.equal(document.activeElement, desc, 'description focus ok');
	desc.value = descriptionText;
	// Enter
	simKeyboardClick(desc, {code:'Enter', key:'Enter'});
	const t0 = diagram.getElement('tester/test/t_0');
	assert.ok(t0 instanceof Cat.DiagramText, 'DiagramText ok');
	assert.equal(t0.x, Cat.D.toolbar.mouseCoords.x, 'text x match toolbar mouseCoords x ok');
	checkStore(assert, 'object selected', t0);
	const textG = document.getElementById(t0.elementId());
	assert.equal(t0.svg, textG, 'svg equality');
	const texts = [...textG.querySelectorAll('text')];
	assert.equal(texts.length, 1, 'one text ok');
	let text = texts[0];
	assert.dom(text).hasAttribute('text-anchor', 'left', 'text-anchor ok').hasClass('diagramText', 'class diagramText ok').hasClass('grabbable', 'class grabbable ok').
		hasText(t0.description).hasStyle({'font-size':'24px', 'font-weight':'400'}, 'text style ok');
	// deselect text:  shift click
	simMouseEvent(diagram.svgRoot, 'mousedown', {shiftKey:true, clientX:3 * grid, clientY:2 * grid});
	checkStore(assert, 'not selected', t0);
	assert.equal(diagram.selected.length, 0, 'nothing selected ok');
});

test('DiagramText move', assert =>
{
	const t0 = diagram.getElement('tester/test/t_0');
	const target = {clientX:2 * grid, clientY:3.5 * grid};
	clickDragRelease(assert, t0, {clientX:t0.x, clientY:t0.y}, target);
	checkStore(assert, 'text selected', t0);
});

test('DiagramText change height/weight', assert =>
{
	const help = Cat.D.toolbar.help;
	const t0 = diagram.getElement('tester/test/t_0');
	// click to get toolbar
	selectElement(t0);
	checkStore(assert, 'text selected', t0);
	// click help on toolbar
	clickToolbarButton('help');
	checkStore(assert, 'first help', help);
	// click description edit button
	let editBtn = help.querySelector('span.button');
	assert.equal(editBtn.dataset.name, 'EditElementText');
	clickButton(editBtn);
	const descElt = help.querySelector('description.tty');
	assert.equal(document.activeElement, descElt);
	const replacement = 'And now for something completely different';
	descElt.innerText = replacement;
	// click edit button
	clickButton(editBtn);
	checkStore(assert, 'second help', help);
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
	// click copy
	clickToolbarButton('copy');
	const t1 = diagram.getElement('tester/test/t_1');
	assert.ok(t1 instanceof Cat.DiagramText);
	assert.equal(t1.description, t0.description);
	assert.equal(t1.height, t0.height);
	assert.equal(t1.weight, t0.weight);
	// click delete btn
	clickToolbarButton('delete');
	assert.equal(t1.svg.parentNode, null);
	assert.equal(diagram.selected.length, 0);
});

module('Diagram Panel');

test('toolbar new diagram', assert =>
{
	simMouseClick(diagram.svgRoot, {x:3 * grid, y:2 * grid});
	clickToolbarButton('newDiagram');
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
	checkStore(assert, 'create diagram button', doit);
	clickButton(doit);
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
	checkStore(assert, 'navbar updated', navbar);
});

test('ctrl-D open panel', assert =>
{
	simKeyboardClick(document.body, {ctrlKey:true, code:'KeyD', key:'d'});
	const panel = document.getElementById('diagram-sidenav');
	assert.dom(panel).hasTagName('div').hasClass('sidenavPnl').hasClass('sidenavLeftPnl').isNotVisible();	// TODO should become visible
	const dgrmPnlTB = document.getElementById('diagramPanelToolbar');
	checkStore(assert, 'toolbar', dgrmPnlTB);
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
	clickButton(btns[btns.length -1]);
});

module('window select');

test('select three morphisms', assert =>
{
	clickDragRelease(assert, diagram.svgRoot, {x:0.5 * grid, y:4.5 * grid}, {x:4.5 * grid, y:3.75 * grid}, true);
	assert.equal(diagram.selected.length, 7);
	const elts = ["tester/test/o_14", "tester/test/o_15", "tester/test/m_13", "tester/test/o_16", "tester/test/o_17", "tester/test/m_15", "tester/test/m_14"];
	elts.map(e => checkSelected(assert, diagram.getElement(e)));
	checkStore(assert, 'toolbar 1', Cat.D.toolbar.element);
	// click delete button
	const svgs = elts.map(e => diagram.getElement(e).svg);
	clickToolbarButton('delete');
	assert.equal(diagram.selected.length, 0);
	elts.map(elt => assert.ok(!diagram.getElement(elt), elt));
	svgs.map(svg => assert.ok(!svg.parentNode));
});

module('object drag and drop on object');

test('drag create product object', assert =>
{
	const o5 = diagram.getElement('tester/test/o_5');
	simMouseClick(o5.svg, {x:4 * grid, y:1 * grid});
	assert.equal(diagram.selected.length, 1);
	// click toolbar copy button and move copy
	clickToolbarButton('copy');
	checkNotSelected(assert, o5);
	const o14 = diagram.getElement('tester/test/o_14');
	checkSelected(assert, o14);
	clickDragRelease(assert, o14, {x:o14.svg.getAttribute('x'), y:o14.svg.getAttribute('y') - halfFontHeight}, {x:1 * grid, y:4 * grid});
	// make a copy and move it
	simMouseClick(o14.svg, o14);
	clickToolbarButton('copy');
	const o15 = diagram.getElement('tester/test/o_15');
	clickDragRelease(assert, o15, {x:o15.svg.getAttribute('x'), y:o15.svg.getAttribute('y') - halfFontHeight}, {x:2 * grid, y:4 * grid});
	// make another copy and move it
	simMouseClick(o15.svg, o15);
	clickToolbarButton('copy');
	const o16 = diagram.getElement('tester/test/o_16');
	// drag o16 to o15 and release to make a product
	const start = {x:o16.svg.getAttribute('x'), y:o16.svg.getAttribute('y') - halfFontHeight};
	const target = {x:o15.x, y:o15.y};
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
	simMouseClick(o17.svg, o17);
	checkSelected(assert, o17);
	checkStore(assert, 'toolbar', Cat.D.toolbar.element);
	clickToolbarButton('project');
});

test('project help display', assert =>
{
	const help = Cat.D.toolbar.help;
	checkStore(assert, 'first display', help);
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
	checkStore(assert, 'm4', m4);
	checkStore(assert, 'm4 graphics', m4.svg);
	checkStore(assert, 'm4 domain', m4.domain);
	checkStore(assert, 'm4 codomain', m4.codomain);
});

test('delete o14 to clear screen', assert =>
{
	const o14 = diagram.getElement('tester/test/o_14');
	simMouseEvent(o14.svg, 'mousedown', o14);
	simMouseEvent(o14.svg, 'mouseup', o14);
	checkSelected(assert, o14);
	clickToolbarButton('delete');
	assert.equal(o14.svg.parentNode, null);
	assert.equal(o14.refcnt, 0);
});

test('create factor morphism', assert =>
{
	const help = Cat.D.toolbar.help;
	const o17 = diagram.getElement('tester/test/o_17');
	clickOnElement(assert, o17);
	checkSelected(assert, o17);
	clickToolbarButton('project');
	checkStore(assert, 'project help', help);
	const codDiv = document.getElementById('project-codomain');
	checkStore(assert, 'project-codomain', codDiv);
	const btns = [...help.querySelectorAll("button")];
	// click for terminal
	btns[1].onclick();
	const doitBtn = codDiv.firstChild;
	checkButton(assert, doitBtn, 'project', 'Create morphism');
	// codomain terminal button
	const codTermBtn = doitBtn.nextSibling;
	checkStore(assert, 'codomain terminal button', codTermBtn);
	// click to place entire domain in codomain
	btns[2].onclick();
	const codDomBtn = codTermBtn.nextSibling;
	checkStore(assert, 'codomain domain button', codDomBtn);
	// click second ZxZ button
	const ZxZbtn = btns[6];
	checkStore(assert, 'ZxZ btn', ZxZbtn);
	ZxZbtn.onclick();
	const codZxZbtn = codDomBtn.nextSibling;
	checkStore(assert, 'cod ZxZ btn', codZxZbtn);
	// click 3rd Z button
	const Zbtn = btns[7];
	checkStore(assert, 'Z btn', Zbtn);
	Zbtn.onclick();
	const codZbtn = codZxZbtn.nextSibling;
	checkStore(assert, 'cod Z btn', codZbtn);
	// check codomain div
	checkStore(assert, 'codomain div', codDiv);
	// remove from codomain div
	codZbtn.onclick();
	assert.equal(codZbtn.parentNode, null, 'no parent');
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
	clickButton(doitBtn);
	assert.equal(help.children.length, 0);
	// check factor morphism
	const m14 = diagram.getElement('tester/test/m_14');
	checkStore(assert, 'factor index morphism ok', m14);
	checkStore(assert, 'factor index morphism graphics ok', m14.svg);
});

testname = 'evaluate factor morphism';
test(testname, assert =>
{
	let teststep = 0;
	let testkey = '';
	const help = Cat.D.toolbar.help;
	const m14 = diagram.getElement('tester/test/m_14');
	assert.equal(help.children.length, 0);
	clickToolbarButton('run');
	checkStore(assert, 'help initial display', help);
	// set inputs to 0, 1, 2, 3
	inputs = [...help.querySelectorAll('input')];
	inputs.map((input, i) => input.value = i);
	clickButton(help.querySelector('span.button'));
	const didit = assert.async();
	Cat.R.Actions.run.postResultFun = function()
	{
		const teststep = 'help with data';
		checkStore(assert, teststep, help, didit);
	};
});

module('data morphism');

test('create', assert =>
{
	const help = Cat.D.toolbar.help;
	const btn = help.querySelector('#run-createDataBtn span.button');
	clickButton(btn);
	const morphism = diagram.getSelected();
	let teststep = 'selected data morphism svg';
	checkStore(assert, teststep, morphism.svg);
	// click on run
	clickToolbarButton('run');
	teststep = 'data morphism display';
	checkStore(assert, teststep, help);
	// enter 38 for the first value
	help.querySelector('#fctr-0-hdole--Integers--Z-1-c-0-c-0').value = 38;
	clickButton(help.querySelector('span.button'));
	checkStore(assert, 'changed data', morphism.to);
	// close toolbar
	const closeBtn = Cat.D.toolbar.element.querySelector('[data-name="closeToolbar"]');
	clickButton(closeBtn);
	assert.dom(Cat.D.toolbar.element).hasClass('hidden', 'toolbar is hidden');
});

module('search');

test('search in diagram', assert =>
{
	const help = Cat.D.toolbar.help;
	// click on nothing
	simMouseClick(diagram.svgRoot, {x:2 * grid, y:3 * grid});
	const searchBtn = Cat.D.toolbar.element.querySelector('[data-name="toolbarShowSearch"]');
	assert.ok(searchBtn, 'found search button');
	clickButton(searchBtn);
	checkStore(assert, 'toolbar search', help);
	// input "id"
	const input = help.querySelector('#toolbar-diagram-search');
	// input has focus
	assert.equal(document.activeElement, input, 'input focus ok');
	// search for "id"
	input.value = 'id';
	// key click: Enter
	simKeyboardClick(input, {key:'Enter'});
	checkStore(assert, 'toolbar search found', help);
	// play with something found
	const divs = [...help.querySelectorAll('div')];
	const m4 = diagram.getElement('tester/test/m_4');
	const preBox = new Cat.D2(m4.svg.getBoundingClientRect());
	const div = divs[3];	// 2nd found item
	// enter div
	simMouseEvent(div, 'mouseenter', {clientX:0, clientY:0});
	checkStore(assert, 'morphism emphasis', m4);
	// leave div
	simMouseEvent(div, 'mouseleave', {clientX:0, clientY:0});
	checkStore(assert, 'morphism emphasis 2', m4);
	// zoomin
	diagram.svgTranslate.classList.remove('trans025s');		// no QA for animations
	div.onclick();
	const postBox = new Cat.D2(m4.svg.getBoundingClientRect());
	assert.ok(preBox.area() < postBox.area(), 'zoomed in');
});

module('graph');

test('graph factor morphism', assert =>
{
	const m14 = diagram.getElement('tester/test/m_14');
	// zoom to selected
	diagram.makeSelected(m14);
	simKeyboardClick(document.body, {key:'Home'});
	// make graph
	clickToolbarButton('graph');
	checkStore(assert, 'gen graph', m14.svg);
	checkStore(assert, 'morphism.graph', m14.graph);
});

test('flip morphism name', assert =>
{
	const m14 = diagram.getElement('tester/test/m_14');		// already selected
	clickToolbarButton('flipName');
	checkStore(assert, 'flip m14', m14.svg_name);
});

test('product object flatten', assert =>
{
	const help = Cat.D.toolbar.help;
	const o14 = diagram.getElement('tester/test/o_14');
	o14.svg.onmouseenter({clientX:950, clientY:400});
	checkStore(assert, 'status bar', Cat.D.statusbar.element);
	select(o14);
	// project help
	clickToolbarButton('project');
	// flatten
	const flattenBtn = help.querySelector('button');
	flattenBtn.onclick();
	const m16 = diagram.getSelected();
	checkStore(assert, 'flatten ndx', m16);
	checkStore(assert, 'flatten morph', m16.to);
	checkStore(assert, 'flatten morph ndx codomain', m16.codomain);
	checkStore(assert, 'flatten morph codomain', m16.to.codomain);
	// graph
	clickToolbarButton('graph');
	checkStore(assert, 'flatten graph', m16.graph);
	// select m14
	const m14 = diagram.getElement('tester/test/m_14');
	select(m14);
	// add m16 to the selection
	select(m16, true);
	assert.equal(diagram.selected.length, 2, 'two selected');
	assert.ok(diagram.selected.includes(m14), 'm14 selected');
	assert.ok(diagram.selected.includes(m16), 'm16 selected');
	// composite
	clickToolbarButton('composite');
	const m17 = diagram.getSelected();
	assert.equal(diagram.selected.length, 1, 'one selected');
	assert.ok(diagram.selected.includes(m17), 'm17 selected');
	checkStore(assert, 'composite ndx', m17);
	checkStore(assert, 'composite morph', m17.to);
	clickToolbarButton('graph');
	checkStore(assert, 'composite graph', m17.graph);
});

test('control-drag object for identity', assert =>
{
	const o8 = diagram.getElement('tester/test/o_8');
	const o8coords = getCoords(o8);
	o8coords.ctrlKey = true;
	const targetCoords = getCoords({x:1 * grid, y:3 * grid});
	targetCoords.ctrlKey = true;
	// ctrl-drag to get identity
	clickDragRelease(assert, o8, o8coords, targetCoords);
	const dragObj = diagram.getSelected();
	checkStore(assert, 'drag object finish', dragObj);
	const identity = [...dragObj.codomains][0];	// should only be one morphism attached
	checkStore(assert, 'drag identity', identity);
	assert.ok(identity.to instanceof Cat.Identity, 'morphism is identity');
	assert.equal(identity.to.codomain.name, identity.to.domain.name, 'domain and codomain ok');
});

module('wheel');

function wheelInOutCheck(assert, context, args)
{
	// wheel in
	const vu1 = new Cat.D2(diagram.svgRoot.getBBox());
	Cat.D.topSVG.dispatchEvent(new WheelEvent('wheel', args));
	const vu2 = new Cat.D2(diagram.svgRoot.getBBox());
	assert.ok(vu2.contains(vu1), `${context} wheel in`);
	// wheel out
	args.wheelDelta = - args.wheelDelta;
	Cat.D.topSVG.dispatchEvent(new WheelEvent('wheel', args));
	const vu3 = new Cat.D2(diagram.svgRoot.getBBox());
	assert.ok(vu2.contains(vu3), `${context} wheel out`);
}

test('diagram wheel', assert =>
{
	simMouseEvent(diagram.svgRoot, 'mousemove', {clientX:0 * grid, clientY:3 * grid});
	const args = {
		bubbles:		true,
		target:			diagram.svgRoot,
		wheelDelta:		180,
		clientX:		0,
		clientY:		3 * grid,
	};
	wheelInOutCheck(assert, 'diagram.svgRoot', args);
	// wheel on object
	const o8 = diagram.getElement('tester/test/o_8');
	args.target = o8.svg;
	wheelInOutCheck(assert, 'object.svg', args);
	// wheel on morphism
	const m18 = diagram.getElement('tester/test/m_18');
	args.target = m18.svg;
	wheelInOutCheck(assert, 'morphism.svg', args);
});

module('home key');

test('full view', assert =>
{
	// select nothing
	simMouseClick(diagram.svgRoot, {x:0 * grid, y:3 * grid});
	simKeyboardClick(document.body, {key:'Home'});
	const homeVu = new Cat.D2(diagram.svgRoot.getBBox());
	diagram.domain.elements.forEach(elt => assert.ok(homeVu.contains(diagram.diagramToUserCoords(elt.svg.getBBox())), `home view contains ${elt.basename}`));
});

module('named elements');

test('named object', assert =>
{
	const help = Cat.D.toolbar.help;
	const o19 = diagram.getElement('tester/test/o_19');
	selectElement(o19);
	clickToolbarButton('name');
	checkStore(assert, 'named object toolbar 1', help);
	// fill form
	const inputBasename = help.querySelector('#named-element-new-basename');
	inputBasename.value = 'ZxZ';
	const inputProperName = help.querySelector('#named-element-new-properName');
	inputProperName.value = 'ZXZ';
	const inputDescription = help.querySelector('#named-element-new-description');
	inputDescription.value = 'A pair of Z\'s';
	const btn = help.querySelector('[data-name="namedElement"]');
	assert.ok(btn);
	clickButton(btn);
	checkStore(assert, 'named object toolbar 2', Cat.D.toolbar.element);
	const idTo = diagram.getSelected();
	checkStore(assert, 'named object idTo index', idTo);
	checkStore(assert, 'named object idTo ', idTo.to);
	const idFrom = diagram.getElement('tester/test/m_20');
	checkStore(assert, 'named object idFrom index', idFrom);
	checkStore(assert, 'named object idFrom ', idFrom.to);
	checkStore(assert, 'named object index', idFrom.codomain);
	checkStore(assert, 'named object', idFrom.codomain.to);
	clickToolbarButton('help');
	checkStore(assert, 'named object help', help);
});

test('named morphism', assert =>
{
	const help = Cat.D.toolbar.help;
	const source = diagram.getElement('tester/test/m_12');
	simMouseEvent(diagram.svgRoot, 'mousemove', source.svg_name.getBoundingClientRect());
	source.svg.onmousedown(new MouseEvent('mousedown'));
	clickToolbarButton('name');
	checkStore(assert, 'named morphism help 1', help);
	// fill form
	const inputBasename = help.querySelector('#named-element-new-basename');
	inputBasename.value = 'comp';
	const inputProperName = help.querySelector('#named-element-new-properName');
	inputProperName.value = 'COMP';
	const inputDescription = help.querySelector('#named-element-new-description');
	inputDescription.value = 'A composite';
	const btn = help.querySelector('[data-name="namedElement"]');
	assert.ok(btn);
	clickButton(btn);
	checkStore(assert, 'named morphism toolbar', Cat.D.toolbar.element);
	const named = diagram.getSelected();
	checkStore(assert, 'named morphism named index', named);
	checkStore(assert, 'named morphism named ', named.to);
	checkStore(assert, 'named morphism index source ', source);
	clickToolbarButton('help');
	checkStore(assert, 'named morphism help 2', help);
	// get javascript source
	const jsBtn = help.querySelector('[data-name="javascript"]');
	clickButton(jsBtn);
	checkStore(assert, 'javascript code', help);
	// get c++ source
	clickToolbarButton('help');
	const cppBtn = help.querySelector('[data-name="cpp"]');
	clickButton(cppBtn);
	checkStore(assert, 'cpp code', help);
	clickToolbarButton('closeToolbar');
});


module('delete all');

test('control A', assert =>
{
	// controlKeyA
	simKeyboardClick(document.body, {ctrlKey:true, code:'KeyA', key:'a'});
	simKeyboardClick(document.body, {key:'Delete'});
	assert.equal(diagram.svgBase.childElementCount, 0, 'everything deleted');
});

module('lambda');

test('element morphism', assert =>
{
	diagram.setView(0, 0, 1);
	const help = Cat.D.toolbar.help;
	const txt = diagram.placeText(null, {x: 2 * grid, y: 0.5 * grid}, assert.test.testName);
	const Z = diagram.getElement('hdole/Integers/Z');
	const ZxZ = diagram.prod(Z, Z);
	const coords = {x: 1 * grid, y: 1 * grid};
	simMouseClick2(Cat.D.topSVG, coords);
	const from = diagram.placeObject(null, ZxZ, coords);
	// get identity on ZxZ
	clickToolbarButton('identity');
	const source = getLastElement();
	simMouseClick2(source.svg, getMorphismXY(source));
	clickToolbarButton('lambda');
	checkStore(assert, 'lambda morphism help', help);
	// make element morphism
	const eltMorphBtn = help.querySelector('#lambda-element-morphism');
	eltMorphBtn.onclick();
	const eltMorph = getLastElement();
	assert.equal(diagram.getSelected(), eltMorph, 'selected last element');
	const domain = eltMorph.to.domain;
	const codomain = eltMorph.to.codomain;
	assert.ok(domain.isTerminal(), 'domain is terminal');
	assert.ok(codomain instanceof Cat.HomObject, 'codomain is hom');
	assert.equal(codomain.objects[0].name, source.to.domain.name, 'source domain is hom domain');
	assert.equal(codomain.objects[1].name, source.to.codomain.name, 'source codomain is hom codomain');
	checkStore(assert, 'element morphism index', eltMorph);
	checkStore(assert, 'element morphism', eltMorph.to);
	// click graph for element morphism
	clickToolbarButton('graph');
	checkStore(assert, 'element morphism graph', eltMorph.graph);
	// click lambda for element morphism
	clickToolbarButton('lambda');
	checkStore(assert, 'element morphism lambda help', help);
	const z0 = help.querySelector('#lambda-codomain').querySelector('button');
	let evnt = new MouseEvent('click', getEltCoords(z0));
	z0.dispatchEvent(evnt);
	const z1 = help.querySelector('#lambda-codomain').querySelector('button');
	evnt = new MouseEvent('click', getEltCoords(z0));
	z1.dispatchEvent(evnt);
	checkStore(assert, 'both Zs back in domain', help);
	const doit = help.querySelector('[data-name="lambda"]');
	clickButton(doit);
	clickToolbarButton('graph');
	const convertedBack = getLastElement();
	checkStore(assert, 'converted back index', convertedBack);
	checkStore(assert, 'converted back', convertedBack.to);
	checkStore(assert, 'converted back graph', convertedBack.graph);
	checkStore(assert, 'converted back toolbar', Cat.D.toolbar.element);
	clickToolbarButton('run');
	checkEvaluation(assert, convertedBack.name, 3, 4, "[3,4]");
	checkStore(assert, 'eval of lambda lambda', help.querySelector('#run-display'));
});

test('double hom lambda', assert =>
{
	const help = Cat.D.toolbar.help;
	clickToolbarButton('lambda');
	checkStore(assert, 'double hom lambda help', help);
	let btns = help.querySelectorAll('#lambda-domain button');
	btns[0].onclick({currentTarget:btns[0]});
	btns[1].onclick({currentTarget:btns[1]});
	btns = help.querySelectorAll('#lambda-codomain button');
	btns[1].onclick({currentTarget:btns[1]});
	checkStore(assert, '* -> [Z, [Z, ZxZ]]', help);
	const doit = help.querySelector('[data-name="lambda"]');
	clickButton(doit);
	const lambda = getLastElement();
	checkStore(assert, 'double hom lambda index', lambda);
	checkStore(assert, 'double hom lambda', lambda.to);
	checkStore(assert, 'double hom lambda toolbar', Cat.D.toolbar.element);
	clickToolbarButton('graph');
	checkStore(assert, 'double hom lambda graph', lambda.graph);
});
