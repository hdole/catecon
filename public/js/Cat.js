// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
// Events:
// 		Assertion
// 			new			an assertion was created
// 			delete
// 			select
// 		CAT
// 			catalogAdd	an entry got added to the catalog
// 			default		diagram is now the default diagram for viewing
// 			delete		delete diagram
// 			download	diagram came from server
// 			load		diagram now available for viewing, but may have no view yet
// 			new			new diagram exists
// 			png
// 			upload		diagram sent to server
// 		Diagram
// 			addReference
// 			makeCells	determine cell commutativity
// 			move
// 			removeReference
// 			select
// 			showInternals
// 			view		view changed
// 		Login
// 		Object
// 			delete
// 			fuse
// 			move
// 			new
// 			select
// 			update
// 		Morphism
// 			detach
// 			new
// 			delete
// 			select
// 			update
// 		Text
// 			delete
// 			move
// 			new
// 			select
// 			update
//		View
//			catalog
//			diagram
//

(function()
{
'use strict';

var sjcl;

const isGUI = typeof window === 'object';

if (!isGUI)
{
	var ACI = null;
	sjcl = require('./sjcl.js');
	global.fs = require('fs');
	global.fetch = require('node-fetch');
	const {Worker, isMainThread, parentPort, workerData} = require('worker_threads');
	global.Worker = Worker;
//	require('./H3.js');	// TODO oy?
	global.D2 = require('./D2.js');	// TODO oy?
}
else
	sjcl = window.sjcl;

if (isGUI)
{
	(function(d)
	{
		const a = H3.script();
		a.type = 'text/javascript';
		a.async = true;
		a.id = 'amazon-login-sdk';
		a.src = 'https://api-cdn.amazon.com/sdk/login1.js?v=3';
		d.querySelector('body').appendChild(a);
	})(document);
}

class U
{
	static getUserSecret(s)
	{
		return U.Sig(`TURKEYINTHESTRAW${s}THEWORLDWONDERS`);
	}
	static GetError(err)
	{
		return typeof err === 'string' ? err : `${err.name}: ${err.message}`;
	}
	static ObjClone(o)
	{
		if (typeof o === 'object')
		{
			if (Array.isArray(o))
				return o.map(a => U.Clone(a));
			else if (Map.prototype.isPrototypeOf(o))
				return new Map(o);
			else
			{
				let c = {};
				for(const a in o)
					if (o.hasOwnProperty(a))
						c[a] = U.Clone(o[a]);
				return c;
			}
		}
		return o;
	}
	static Clone(o)
	{
		if (null === o || o instanceof Element || (typeof Blob === 'object' && o instanceof Blob))
			return o;
		return U.ObjClone(o);
	}
	static GetArg(args, key, dflt)
	{
		return key in args ? args[key] : dflt;
	}
	static HtmlEntitySafe(str)
	{
		return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	}
	static HtmlSafe(str)
	{
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	}
	static subscript(...subs)
	{
		let sub = '';
		function submap(m)
		{
			return U.submap[m];
		}
		for (let i=0; i<subs.length; ++i)
		{
			let s = subs[i].toString();
			sub += s.replace(/[0-9]/g, submap).replace(/,/g, '&#806');	// combining comma below
		}
		return sub;
	}
	static JsonMap(m, doKeys = true)
	{
		let data = [];
		m.forEach(function(d, i) { data.push(doKeys ? [i, d] : d); });
		return data;
	}
	static jsonArray(map)
	{
		let data = [];
		for(const [key, val] of map)
			data.push(val.json());
		return data;
	}
	static Cap(str)
	{
		return str.replace(/(^|\s)\S/, l => l.toUpperCase());
	}
	static Decap(str)
	{
		return str.replace(/(^|\s)\S/, l => l.toLowerCase());
	}
	static DePunctuate(str)
	{
		return str.replace(/[.;:!?]$/, l => '');
	}
	static DeCamel(s)
	{
		return s.replace(/([A-Z])([A-Z])([a-z])|([a-z])([A-Z])/g, '$1$4 $2$3$5').replace(/(^|\s)\S/g, l => l.toLowerCase());
	}
	static Formal(s)
	{
		return U.Cap(U.DePunctuate(s)) + '.';
	}
	static arraySet(a, f, v)
	{
		if (f in a)
			a[f].push(v);
		else
			a[f] = [v];
	}
	static arrayInclude(a, f, v)
	{
		if (f in a && !a[f].includes(v))
			a[f].push(v);
		else
			a[f] = [v];
	}
	static ArrayMerge(a, b)
	{
		b.map(v => !a.includes(v) ? a.push(v) : null);
	}
	static ArrayEquals(a, b)
	{
		if (a === b)
			return true;
		if (!Array.isArray(a) || !Array.isArray(b))
			return false;
		if (a.length !== b.length)
			return false;
		return a.reduce((r, suba, i) => r && U.ArrayEquals(suba, b[i]), true);
	}
	static GetFactorsById(id)
	{
		const btns = document.getElementById(id).querySelectorAll('button');
		let factors = [];
		btns.forEach(function(b)
		{
			const idx = JSON.parse(`[${b.dataset.indices}]`);
			factors.push(idx.length === 1 && idx[0] === -1 ? idx[0] : idx);
		});
		return factors;
	}
	static SetInputFilter(textbox, inputFilter)
	{
		["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(e)
		{
			textbox.oldValue = "";
			textbox.addEventListener(e, function()
			{
				if (inputFilter(this.value))
				{
					this.oldValue = this.value;
					this.oldSelectionStart = this.selectionStart;
					this.oldSelectionEnd = this.selectionEnd;
				}
				else if (this.hasOwnProperty("oldValue"))
				{
					this.value = this.oldValue;
					this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
				}
			});
		});
	}
	static Token(e)
	{
		const s = typeof e === 'string' ? e : e.name;
		const r = s.replace(/\//g, '_').replace(/{/g, '_Br_').replace(/}/g, '_rB_').replace(/,/g, '_c_').replace(/:/g, '_').replace(/#/g, '_n_')
			.replace(/\[/g, '_br_')
			.replace(/-/g, '_minus_')
			.replace(/\]/g, '_rb_');
		return r;
	}
	static a2s(a, lb = '[', jn = ',', rb = ']')	// array to string
	{
		if (Array.isArray(a))
			return lb + a.map(e => U.a2s(e)).join(jn) + rb;
		return a !== undefined ? a.toString() : '';
	}
	static safe(a)
	{
		return U.HtmlSafe(U.a2s(a));
	}
	static Sig(s)
	{
		return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(typeof s === 'string' ? s : JSON.stringify(s)));
	}
	static SigArray(elts)
	{
		if (elts.length === 0)
			return 0;
		else if (elts.length === 1)
			return elts[0];	// no sig change for array of length 1
		return U.Sig(elts.map(e => Array.isArray(e) ? U.SigArray(e) : e).join());
	}
	static SigEqu(a, b)
	{
		return a === b;
	}
	static SafeId(id)
	{
		return id.replace(/\//g, '--').replace(/{/g, '---').replace(/}/g, '---').replace(/,/g, '-c-').replace(/#/g, '-sh-').replace(/\$/g, '-dl-');
	}
	static Tab(s)
	{
		return s.replace(/^./gm, '\t$&');
	}
	static IsNumeric(obj)
	{
		return obj instanceof ProductObject && obj.dual && obj.objects.reduce((r, oi) => r && oi.getBase().isTerminal(), true);	// convert to numeric?
	}
	static ConvertData(obj, data)	// hom elements have to be converted from objects to their name
	{
		if (data === undefined || data === null)
		{
			console.error('no data to convert');
			return;
		}
		let ret = null;
		switch(obj.constructor.name)
		{
			case 'CatObject':
			case 'FiniteObject':
				ret = data;
				break;
			case 'ProductObject':
				if (obj.dual)
					ret = U.IsNumeric(obj) ? data : [data[0], U.ConvertData(obj.objects[data[0]], data[1])];
				else
					ret = obj.objects.map((o, i) => U.ConvertData(o, data[i]));
				break;
			case 'HomObject':
				ret = data.name;
				break;
			case 'NamedObject':
				ret = U.ConvertData(obj.base, data);
				break;
		}
		return ret;
	}
	static InitializeData(diagram, obj, data)	// hom elements have to be converted from objects to their objects
	{
		let ret = null;
		switch(obj.constructor.name)
		{
			case 'ProductObject':
				if (this.dual)
					ret = [data[0], U.InitializeData(diagram, obj.objects[data[0]], data[1])];
				else
					ret = obj.objects.map(o => U.InitializeData(diagram, o, data[i]));
				break;
			case 'HomObject':
				ret = diagram.getElement(data);
				break;
			default:
				ret = data;
				break;
		}
		return ret;
	}
	static EscapeRegExp(str)
	{
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}
	static RefcntSorter(a, b) { return a.refcnt > b.refcnt ? -1 : b.refcnt < a.refcnt ? 1 : 0; }
	static IsIndexElement(elt)
	{
		return elt instanceof DiagramObject || elt instanceof DiagramMorphism || elt instanceof DiagramComposite || elt instanceof Assertion || elt instanceof DiagramText;
	}
	static HasFactor(factors, someFactor)
	{
		for(let i=0; i<factors.length; ++i)
			if (U.ArrayEquals(someFactor, factors[i]))
				return i;
		return -1;
	}
	static readfile(filename)
	{
		if (isGUI)
			return localStorage.getItem(filename);
		else
		{
			const serverFile = 'public/diagram/' + filename;
			if (fs.existsSync(serverFile))
				return fs.readFileSync(serverFile);
		}
		return null;
	}
	static writefile(filename, data)
	{
		isGUI ?  localStorage.setItem(filename, data) : fs.writeFileSync('public/diagram/' + filename, data);
	}
	static removefile(filename)
	{
		isGUI ? localStorage.removeItem(filename) : fs.unlink('diagram/' + filename);
	}
	static bezier(cp0, cp1, cp2, cp3, t)
	{
		const p0 = cp0.scale((1 - t)**3);
		const p1 = cp1.scale(3 * t * (1 - t)**2);
		const p2 = cp2.scale(3 * (1 - t) * t**2);
		const p3 = cp3.scale(t**3);
		return p0.add(p1).add(p2).add(p3);
	}
	// TODO what about dedist?
	static prettifyCommand(cmd)
	{
		const fn = function(v)
		{
			let line = '';
			if (v === null)
				line += 'null';
			else if (Array.isArray(v))
			{
				line += '[';
				v.map((w, i) =>
				{
					line += fn(w);
					if (i < v.length -1)
						line += ', ';
				});
				line += ']';
			}
			else if (v instanceof Date)
				line += v.toString();
			else if (v instanceof Map)
			{
				line += '{';
				const size = v.size;
				let i = 0;
				v.forEach(function(p, k)
				{
					line += `${k}:${fn(p)}`;
					if (i < size -1)
						line += ', ';
					++i;
				});
				line += '}';
			}
			else if (typeof v === 'object')
			{
				line += '{';
				const keys = Object.keys(v);
				keys.map((k, i) =>
				{
					line += `${k}:${fn(v[k])}`;
					if (i < keys.length -1)
						line += ', ';
				});
				line += '}';
			}
			else
				line += v;
			return line;
		};
		const args = U.Clone(cmd);
		let line = args.command + ' ';
		delete args.command;
		const keys = Object.keys(args);
		keys.map((k, i) =>
		{
			line += `${k}:${fn(cmd[k])}`;
			if (i < keys.length -1)
				line += ' ';
		});
		return line;
	}
}
Object.defineProperties(U,
{
	basenameEx:		{value:RegExp('^[a-zA-Z_$]+[a-zA-Z0-9_$\/]*$'),	writable:false},
	finiteEx:		{value:RegExp('^#[0-9]+[0-9]*$'),				writable:false},
	/*
	keys:			{value:new Set(
	[
		'Unidentified', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Minus', 'Equal', 'Backspace',
		'Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyBracketLeft', 'KeyBracketRight', 'Enter',
		'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Backquote', 'ShiftLeft', 'Backslash',
		'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight',
		'NumpadMultiply', 'CapsLock',
		'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
		'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
		'NumpadAdd', 'NumpadSubtract', 'NumpadDecimal', 'NumpadEqual', 'NumpadEnter', 'NumpadDivide',
		'ScrollLock', 'PrintScreen', 'IntlBackslash', 'NumLock',
		'ControlRight', 'ControlLeft', 'AltRight', 'AltLeft',
		'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
		'Home', 'End', 'PageUp', 'PageDown', 'Insert',
	]), writble:false},
	*/
	secret:			{value:'0afd575e4ad6d1b5076a20bf53fcc9d2b110d3f0aa7f64a66f4eee36ec8d201f',	writable:false},
	submap:
	{
		value:
		{
			'0': '&#x2080;',
			'1': '&#x2081;',
			'2': '&#x2082;',
			'3': '&#x2083;',
			'4': '&#x2084;',
			'5': '&#x2085;',
			'6': '&#x2086;',
			'7': '&#x2087;',
			'8': '&#x2088;',
			'9': '&#x2089;',
		},
		writable:	false,
	},
});

// Runtime
class R
{
	static SetupWorkers()
	{
		const worker = new Worker((isGUI ? '' : './public') + '/js/workerEquality.js');
		function onmessage(msg)
		{
			const args = msg.data;
			switch(args.command)
			{
				case 'CheckEquivalence':
					const diagram = R.$CAT.getElement(args.diagram);
					const cell = diagram.domain.cells.get(args.cell);
					if (!cell)
						return;
					const assertion = diagram.getAssertion(cell.signature);
					assertion && assertion.setCell(cell);
					let type = 'unknown';
					if (args.isEqual)
					{
						if (assertion)
							type = 'assertion';
						else if (DiagramComposite.CellIsComposite(cell))
							type = 'composite';
						else if (cell.isNamedMorphism())
							type = 'named';
						else
							type = 'computed';
					}
					cell.setCommutes(type);
					const objs = cell.getObjects();
					if (!cell.svg)
						diagram.addSVG(cell);
					cell.update();
					break;
				case 'start':
				case 'Load':
				case 'LoadEquivalences':
				case 'RemoveEquivalences':
				case 'Info':
					break;
				default:
					console.error('bad message', args.command);
					break;
			}
		}
		worker.onmessage = onmessage;
		R.workers.equality = worker;
		let url = '';
		if (isGUI)
		{
			const tokens = window.location.pathname.split('/');
			tokens.pop();
			while(tokens[tokens.length -1] === 'diagram' || tokens[tokens.length -1] === '')
				tokens.pop();
			url = window.location.origin + tokens.join('/');
		}
		else
		{
			url = ".";
		}
		worker.postMessage({command:'start', url});
	}
	static SetupCore()
	{
		const CATargs =
		{
			basename:		'CAT',
			user:			'sys',
			properName:		'CAT',
			description:	'top category',
		};
		R.CAT = new Category(null, CATargs);
		const $CATargs =
		{
			codomain:		R.CAT,
			basename:		'$CAT',
			properName:		'$CAT',
			description:	'top level diagram',
			user:			'sys',
		};
		R.UserDiagram = new Map();
		if (isGUI)
		{
			let delta = null;
			const sessionMove = e =>
			{
				D.toolbar.hide();
				if (!R.diagram)
				{
					const viewport = {x:e.clientX - delta.x, y:e.clientY - delta.y, scale:D.session.viewport.scale};
					D.session.viewport = viewport;
					D.diagramSVG.setAttribute('transform', `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale} ${viewport.scale})`);
					return true;
				}
				return false;
			};
			const cursorOnDiagram = e =>
			{
				let findCursor = false;
				D.forEachDiagramSVG(d =>
				{
					if (!d.svgRoot.classList.contains('hidden'))
					{
						const bbox = new D2(d.svgRoot.getBBox());
						if (bbox.pointInside({x:e.clientX - D.session.viewport.x, y:e.clientY - D.session.viewport.y}))
							findCursor = true;
					}
				});
				if (!findCursor)
					R.SelectDiagram(null);
			};
//			D.topSVG.addEventListener('mousemove', cursorOnDiagram);
			D.topSVG.onmouseup = e =>
			{
				D.topSVG.removeEventListener('mousemove', sessionMove);
			};
			D.topSVG.onmousedown = e =>
			{
				if (!R.diagram)
				{
					const click = new D2(e.clientX, e.clientY);
					delta = click.subtract(D.session.viewport);
					D.topSVG.addEventListener('mousemove', sessionMove);
					e.preventDefault();
					return true;
				}
				return false;
			};
		}
		R.$CAT = new Diagram(null, $CATargs);
		R.UserDiagram.set('sys', R.$CAT);
		R.Cat = new Category(R.$CAT,
		{
			basename:		'Cat',
			category:		R.CAT,
			description:	'category of smaller categories',
			properName:		'ℂ𝕒𝕥',
			user:			'sys',
		});
		R.sys.Actions = new Category(R.$CAT,
		{
			basename:		'Actions',
			properName:		'Actions',
			description:	'discrete category of currently loaded actions',
			user:			'sys',
		});
	}
	static SetupActions()
	{
		const setup = diagram =>
		{
			if (isGUI)
			{
//				diagram.autoplace();
//				diagram.makeSVG();
//				diagram.domain.elements.forEach(elt => diagram.addSVG(elt));
				diagram.elements.forEach(action => {R.Actions[action.basename] = action;});
			}
		};
		const diagramDiagram = new Diagram(R.$CAT, {basename:'diagram', codomain:'Actions', description:'actions for a diagram', user:'sys'});
		let action = new IdentityAction(diagramDiagram);
		new GraphAction(diagramDiagram);
		new NameAction(diagramDiagram);
		new CompositeAction(diagramDiagram);
		new DetachDomainAction(diagramDiagram);
		new DetachDomainAction(diagramDiagram, true);
		new HomObjectAction(diagramDiagram);
		new HomObjectAction(diagramDiagram, true);
		new HomsetAction(diagramDiagram, true);
		new DeleteAction(diagramDiagram);
		new CopyAction(diagramDiagram);
		new FlipNameAction(diagramDiagram);
		new HelpAction(diagramDiagram);
		new RunAction(diagramDiagram);
		new AlignHorizontalAction(diagramDiagram);
		new AlignVerticalAction(diagramDiagram);
		new AssertionAction(diagramDiagram);
		setup(diagramDiagram);
		const productDiagram = new Diagram(R.$CAT, {basename:'product', codomain:'Actions', description:'diagram for product actions', user:'sys'});
		new ProductAction(productDiagram);
		new ProductEditAction(productDiagram);
		new ProjectAction(productDiagram);
		new PullbackAction(productDiagram);
		new ProductAssemblyAction(productDiagram);
		new MorphismAssemblyAction(productDiagram);
		setup(productDiagram);
		const coproductDiagram = new Diagram(R.$CAT, {basename:'coproduct', codomain:'Actions', description:'diagram for coproduct actions', user:'sys'});
		new ProductAction(coproductDiagram, true);
		new ProductEditAction(coproductDiagram, true);
		new ProjectAction(coproductDiagram, true);
		new PullbackAction(coproductDiagram, true);
		new ProductAssemblyAction(coproductDiagram, true);
		new FiniteObjectAction(coproductDiagram);
		new RecursionAction(coproductDiagram);
		setup(coproductDiagram);
		const homDiagram = new Diagram(R.$CAT, {basename:'hom', codomain:'Actions', description:'diagram for hom actions', user:'sys'});
		new HomAction(homDiagram);
		new EvaluateAction(homDiagram);
		new LambdaMorphismAction(homDiagram);
		setup(homDiagram);
		const distributeDiagram = new Diagram(R.$CAT, {basename:'distribute', codomain:'Actions', description:'diagram for distribution actions', user:'sys'});
		new DistributeAction(distributeDiagram);
		setup(distributeDiagram);
		const tensorDiagram = new Diagram(R.$CAT, {basename:'tensor', codomain:'Actions', description:'diagram for tensor actions', user:'sys'});
		new TensorAction(tensorDiagram);
		setup(tensorDiagram);
		R.Cat.addActions('diagram');
		R.Cat.addActions('product');
		R.Cat.addActions('coproduct');
		R.Cat.addActions('hom');
		R.Cat.addActions('distribute');
		R.sys.Actions.addActions('diagram');
	}
	static SetupPFS()
	{
		const user = 'hdole';
		const pfs = new Category(R.$CAT,
		{
			basename:'PFS',
			user,
			properName:'&Popf;&Fopf;&Sopf;',
			actionDiagrams:	['diagram', 'product', 'coproduct', 'hom', 'distribute'],
		});
	}
	static InitTestProcedure()
	{
		const head = document.getElementsByTagName('HEAD')[0];
		const link = H3.link({rel:'stylesheet', href:"https://code.jquery.com/qunit/qunit-2.10.1.css", type:'text/css'});
		head.appendChild(link);
		const body = document.getElementsByTagName('BODY')[0];
		body.prepend(H3.div({id:"qunit-fixture"}));
		body.prepend(H3.div({id:"qunit"}));
		const dbName = 'testInfo';
		window.infoDB = null;
		let refStore = null;
		let transaction = null;
		const request = indexedDB.open(dbName);
		request.onerror = e => alert('error');
		request.onsuccess = e =>
		{
			infoDB = e.target.result;
			transaction = infoDB.transaction(['elements'], 'readwrite');
			transaction.complete = function(e) {};
			transaction.onerror = e => alert('refStore error');
			refStore = transaction.objectStore('elements');
		};
		request.onupgradeneeded = e =>
		{
			console.log('upgrading database');
			infoDB = e.target.result;
			refStore = infoDB.createObjectStore('elements', {keyPath:'key'});
			refStore.transaction.complete = function(e){};
		};
		R.LoadScript("https://code.jquery.com/qunit/qunit-2.10.1.js", _ =>
			R.LoadScript("https://unpkg.com/qunit-dom/dist/qunit-dom.js", _ =>
				R.LoadScript(window.location.origin + window.location.pathname + 'js/tests.js', function(){})));
	}
	static Initialize()
	{
		R.sync = false;
		R.params = isGUI ? (new URL(document.location)).searchParams : new Map();	// TODO node.js
		if (isGUI)
			R.local = document.location.hostname === 'localhost';
		if (R.params.has('test'))
		{
			R.InitTestProcedure();
			return;
		}
		if (isGUI)
		{
			D.diagramSVG = document.getElementById('diagramSVG');
			isGUI && D.readSession();
			D.catalog = new Catalog();
		}
		if (R.params.has('d'))	// check for short form
			R.params.set('diagram', R.params.get('d'));
		else if (R.params.has('diagram'))
			D.session.mode = 'diagram';
		else if (isGUI && D.session.mode === 'diagram' && D.session.default)
			R.params.set('diagram', D.session.default);		// set default diagram
		isGUI && D.catalog.show(D.session.mode === 'catalog');
		D.Busy();
		R.ReadDefaults();
		R.SetupWorkers();
		D.url = isGUI ? (window.URL || window.webkitURL || window) : null;
		R.cloud = new Amazon();
		R.SetupCore();
		R.SetupActions();
		R.SetupPFS();
		isGUI && D.Initialize();		// initialize GUI
		R.sync = true;
		const loader = function()
		{ 
			R.diagram = null;
			if (isGUI)
			{
				switch(D.session.mode)
				{
					case 'catalog':
						D.catalog.show();
						D.catalog.search();
						break;
					case 'diagram':
						D.catalog.show(false);
//						let diagramName = R.params.get('diagram');
//						if (diagramName)
//							R.default.diagram = diagramName;
						break;
				}
			}
			R.initialized = true;
			isGUI && D.session.diagrams.map(d => R.DownloadDiagram(d, diagram =>
			{
				diagram.makeSVG();
				diagram.setViewport(diagram.getViewport());
			}));
			if (R.user.name === 'Anon')
				R.EmitLoginEvent();	// Anon login
		};
		const bootLoader = _ =>
		{
			if (R.params.has('boot'))
				R.LoadScript(window.location.origin + '/js/boot.js', function() { Boot(loader); });
			else
				loader();
		};
		R.FetchCatalog(bootLoader);
	}
	static GetUserDiagram(user)		// the user's diagram of their diagrams
	{
		let d = R.UserDiagram.get(user);
		if (d)
			return d;
		const $CATargs =
		{
			codomain:		R.CAT,
			basename:		user,
			description:	`${user} diagrams`,
			user,
		};
		d = new Diagram(null, $CATargs);
		R.UserDiagram.set(user, d);
		return d;
	}
	static SaveLocal(diagram)
	{
		U.writefile(`${diagram.name}.json`, diagram.stringify());
	}
	static HasLocal(name)
	{
		return U.readfile(`${name}.json`) !== null;
	}
	static ReadLocal(name, clear = false)
	{
		R.sync = false;
		const data = U.readfile(`${name}.json`);
		if (data)
		{
			const args = JSON.parse(data);
			const userDiagram = R.GetUserDiagram(args.user);
			if (clear)
			{
				args.elements = [];
				args.domainElements = [];
				args.timestamp = Date.now();
			}
			const localLog = isGUI ? U.readfile(`${name}.log`) : null;
			if (localLog)
				args.log = JSON.parse(localLog);
			const diagram = new Diagram(userDiagram, args);
			const png = U.readfile(`${diagram.name}.png`);
			if (png)
				D.diagramPNGs.set(diagram.name, png);
			R.SetDiagramInfo(diagram);
			if (isGUI)
			{
				const viewport = U.readfile(`${diagram.name}-viewport.json`);
				if (viewport)
					D.viewports.set(diagram.name, JSON.parse(viewport));
			}
			R.sync = true;
			R.EmitCATEvent('load', diagram);
			return diagram;
		}
		R.sync = true;
		return null;
	}
	static DisplayMorphismInput(morphismName)
	{
		if (morphismName)
		{
			const m = R.diagram.getElement(morphismName);
			if (m)
			{
				if (R.Actions.javascript.canFormat(m))
				{
					let foundIt = null;
					for (const [name, e] of R.diagram.domain.elements)
					{
						if (e.to.basename === morphismName)
						{
							foundIt = e;
							break;
						}
					}
					if (foundIt)
					{
						const bbox = foundIt.getBBox();
						R.diagram.setViewportByBBox(bbox);
						const center = R.diagram.diagramToUserCoords(D.Center(R.diagram));
						center.y = center.y / 4;
						R.diagram.addSelected(foundIt);
						const e = {clientX:center.x, clientY:center.y};
						R.Actions.run.html(e, R.diagram, [foundIt]);
					}
				}
				else
					D.RecordError('Morphism in URL could not be formatted.');
			}
			else
				D.RecordError('Morphism in URL could not be loaded.');
		}
	}
	static LocalTimestamp(name)
	{
		const filename = `${name}.json`;
		const data = U.readfile(filename);
		return data ? JSON.parse(data).timestamp : 0;
	}
	static isCloudNewer(name)
	{
		const cloudInfo = R.catalog.get(name);
		const localTimestamp = R.LocalTimestamp(name);
		return cloudInfo && cloudInfo.timestamp > localTimestamp;
	}
	static async DownloadDiagram(name, fn = null)
	{
		let diagram = null;
		const cloudDiagrams = [...R.GetReferences(name)].reverse().filter(d => R.isCloudNewer(d));
		if (cloudDiagrams.length > 0)
		{
			const downloads = cloudDiagrams.map(d => R.getDiagramURL(d + '.json'));
			let diagrams = [];
			const downloader = async _ =>
			{
				const promises = downloads.map(url => fetch(url));
				const responses = await Promise.all(promises);
				const jsons = await Promise.all(responses.map(async res => await res.json()));
				diagrams = jsons.map(json =>
				{
					const diagram = new Diagram(R.GetUserDiagram(json.user), json);
					R.EmitCATEvent('download', diagram);
					R.EmitCATEvent('load', diagram);
					return diagram;
				});
			};
			await downloader();
			diagram = diagrams[diagrams.length -1];
		}
		else if (R.CanLoad(name))
			diagram = R.LoadDiagram(name);		// immediate loading
		else
			return null;
		fn && fn(diagram);
		return diagram;
	}
	//
	// primary means of displaying a diagram
	//
	static async SelectDiagram(name)
	{
		if (isGUI)
		{
			D.session.mode = 'diagram';
			R.diagram && R.diagram.svgRoot.querySelector('.diagramBackground').classList.remove('defaultGlow');
		}
		if (R.diagram && R.diagram.name === name)
		{
			R.EmitCATEvent('default', R.diagram);
			return;
		}
		if (isGUI && name)
			D.Busy();
		R.default.debug && console.log('SelectDiagram', name);
		R.diagram = null;
		let diagram = name !== 'sys/$CAT' ? R.$CAT.getElement(name) : R.$CAT;		// already loaded?
		let didit = false;
		if (!diagram)
		{
			if (name)
				diagram = await R.DownloadDiagram(name);
			if (!diagram)
			{
				D.NotBusy();
				R.EmitCATEvent('default', null);
				return;
			}
			didit = true;
		}
		if (!diagram)
			throw 'no such diagram';
		if (isGUI)
		{
			diagram.makeSVG();
			D.default.fullscreen && D.diagramSVG.appendChild(diagram.svgRoot);
			/* TODO
			D.forEachDiagramSVG(diagram => diagram.svgRoot.classList.remove('glow'));
			diagram.svgRoot.querySelector('#' + diagram.elementId('background')).classList.add('glow');
					lnkElt.setAttribute('filter', vertical ? '' : 'url(#softGlow)');
					*/
		}
		R.diagram = diagram;
		isGUI && R.diagram && R.diagram.svgRoot.querySelector('.diagramBackground').classList.add('defaultGlow');
		D.NotBusy();
		R.EmitCATEvent('default', diagram);
	}
	static GetCategory(name)
	{
		if (name === 'sys/CAT')
			return R.CAT;
		else if (name === 'sys/Cat')
			return R.Cat;
		return R.CAT ? R.CAT.getElement(name) : null;
	}
	static GetReferences(name, refs = new Set())
	{
		if (refs.has(name))
			return refs;
		const info = R.Diagrams.get(name);
		refs.add(name);
		if (info && 'references' in info)	// TODO remove if clause
			info.references.map(r => R.GetReferences(r, refs));
		return refs;
	}
	static GetDiagram(name, fn)		// only does local loading
	{
		let dgrm = R.$CAT.getElement(name);	// already loaded?
		if (!dgrm)
		{
			if (R.CanLoad(name))
			{
				dgrm = R.ReadLocal(name);
				fn(dgrm);
				return true;
			}
		}
		else
		{
			fn && fn(dgrm);
			return true;
		}
		return false;
	}
	static CanLoad(name)
	{
		return [...R.GetReferences(name)].reverse().reduce((r, d) => r && (R.HasLocalDiagram(d) || R.$CAT.getElement(d)) !== undefined, true);
	}
	static LoadDiagram(name)	// assumes all reference diagrams are loaded or local and so is immediate
	{
		function setup(ref)
		{
			let diagram = R.$CAT.getElement(ref);
			if (!diagram)
			{
				diagram = R.ReadLocal(ref);
			}
		}
		[...R.GetReferences(name)].reverse().map(ref => setup(ref));
		return R.$CAT.getElement(name);
	}
	static SetDiagramInfo(diagram)
	{
		const info = Diagram.GetInfo(diagram);
		info.localTimestamp = R.LocalTimestamp(diagram.name);
		R.Diagrams.set(diagram.name, info);
	}
	static GetCategoriesInfo()
	{
		const info = new Map();
		R.$CAT.codomain.elements.forEach(o =>
		{
			if (o instanceof Category && !(o instanceof IndexCategory))
				info.set(o.name, o.info());
		});
		return info;
	}
	static ReloadDiagramFromServer()
	{
		const name = R.diagram.name;
		const svg = R.diagram.svgRoot;
		// TODO replace fetchDiagram()
		R.cloud && R.cloud.fetchDiagram(name, false).then(data =>
		{
			R.diagram.clear();
			U.writefile(`${name}.json`, JSON.stringify(data));
			svg && svg.parentNode.removeChild(svg);
			R.diagram.decrRefcnt();
			R.SelectDiagram(name);
		});
	}
	static LoadEquivalences(diagram, item, leftLeg, rightLeg)
	{
		const leftSigs = leftLeg.map(m => m.signature);
		const rightSigs = rightLeg.map(m => m.signature);
		R.LoadEquivalentSigs(diagram, item, leftSigs, rightSigs);
	}
	static LoadEquivalentSigs(diagram, item, leftSigs, rightSigs)
	{
		R.workers.equality.postMessage({command:'LoadEquivalences', diagram:diagram.name, item:item.name, leftLeg:leftSigs, rightLeg:rightSigs});
	}
	static RemoveEquivalences(diagram, ...items)
	{
		R.workers.equality.postMessage({command:'RemoveEquivalences', diagram:diagram.name, items});
	}
	static LoadDiagramEquivalences(diagram)
	{
		R.workers.equality.postMessage({command:'Load', diagrams:[...[...diagram.allReferences.keys()].reverse(), diagram.name]});
	}
	static EmitViewEvent(command, diagram = null)
	{
		if (!isGUI)
			return;
		D.session.mode = command;
		R.default.showEvents && console.log('emit View event', {command});
		return window.dispatchEvent(new CustomEvent('View', {detail:	{command, diagram}, bubbles:true, cancelable:true}));
	}
	static EmitLoginEvent()
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit LOGIN event', R.user.name, R.user.status);
		return window.dispatchEvent(new CustomEvent('Login', {detail:	{command:R.user.status, name:R.user.name}, bubbles:true, cancelable:true}));
	}
	static EmitCATEvent(command, diagram)	// like diagram was loaded
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit CAT event', {command, diagram});
		return window.dispatchEvent(new CustomEvent('CAT', {detail:	{command, diagram}, bubbles:true, cancelable:true}));
	}
	static EmitDiagramEvent(diagram, command, name = '')	// like something happened in a diagram
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit DIAGRAM event', {diagram, command, name});
		return window.dispatchEvent(new CustomEvent('Diagram', {detail:	{diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static EmitObjectEvent(diagram, command, element, extra = {})	// like an object changed
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit OBJECT event', {command, name:element.name});
		const detail = { diagram, command, element, };
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		const args = {detail, bubbles:true, cancelable:true};
		return window.dispatchEvent(new CustomEvent('Object', args));
	}
	static EmitMorphismEvent(diagram, command, element, extra = {})
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit MORPHISM event', {command, name:element.name});
		const detail = { diagram, command, element, };
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		const args = {detail, bubbles:true, cancelable:true};
		return window.dispatchEvent(new CustomEvent('Morphism', args));
	}
	static EmitAssertionEvent(diagram, command, element)
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit ASSERTION event', {command, name:element.name});
		return window.dispatchEvent(new CustomEvent('Assertion', {detail:	{diagram, command, element}, bubbles:true, cancelable:true}));
	}
	static EmitTextEvent(diagram, command, element)
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit TEXT event', {command, name:element.name});
		return window.dispatchEvent(new CustomEvent('Text', {detail:	{diagram, command, element}, bubbles:true, cancelable:true}));
	}
	static EmitElementEvent(diagram, command, elt)
	{
		if (elt instanceof CatObject)
			R.EmitObjectEvent(diagram, command, elt);
		else if (elt instanceof Morphism)
			R.EmitMorphismEvent(diagram, command, elt);
		else if (elt instanceof DiagramText)
			R.EmitTextEvent(diagram, command, elt);
		else if (elt instanceof Assertion)
			R.EmitAssertionEvent(diagram, command, elt);
	}
	static LoadScript(url, fn)
	{
		const script = H3.script();
		script.type = 'text/javascript';
		script.async = true;
		script.src = url;
		script.addEventListener('load', fn);
		document.body.appendChild(script);
	}
	static FetchCatalog(fn)
	{
		const process = (data, fn) =>
		{
			data.diagrams.map(d =>
			{
				d.localTimestamp = R.LocalTimestamp(d.name);
				R.catalog.set(d.name, d);
				if (!R.Diagrams.has(d.name))
					R.SetDiagramInfo(d);
				R.EmitCATEvent('catalogAdd', d);
			});
			fn();
		};
		const url = R.getDiagramURL('catalog.json');
		R.cloud && fetch(url).then(response =>
		{
			if (response.ok)
				response.json().then(data =>
				{
					process(data, fn);
				});
			else
				console.error('error downloading catalog', url, response.statusText);
		});
	}
	static CanDeleteDiagram(d)
	{
		// were we given a diagram or the name of a diagram?
		let diagram = d instanceof Diagram ? d : R.$CAT.getElement(d.name);
		// is the diagram in the catalog of diagrams?
		diagram = diagram ? diagram : d in R.catalog ? R.catalog[d] : null;
		return diagram ? R.diagram && ('refcnt' in diagram ? diagram.refcnt === 0 : true) : true;
	}
	static DeleteDiagram(e, name)
	{
		if (R.CanDeleteDiagram(name) && (isGUI ? confirm(`Are you sure you want to delete diagram ${name}?`) : true))
		{
			R.authFetch(R.getURL('delete'), {diagram:name}, res =>
			{
				if (!res.ok)
				{
					D.RecordError(res.statusText);
					return;
				}
				const diagram = R.$CAT.getElement(name);
				diagram && diagram.decrRefcnt();
				R.Diagrams.delete(name);		// all local diagrams
				delete R.catalog[name];
				if (R.diagram === diagram)
				{
					R.diagram === null;
					R.EmitViewEvent('catalog');
				}
				['.json', '.png', '.log'].map(ext => U.removefile(`${name}${ext}`));		// remove local files
				R.EmitCATEvent('delete', diagram.name);
			}).catch(err => D.RecordError(err));
		}
	}
	static GetDiagramInfo(name)
	{
		const diagram = name !== 'sys/$CAT' ? R.$CAT.getElement(name) : R.$CAT;
		return diagram ? diagram : R.catalog.get(name);
	}
	static SaveDefaults()
	{
		U.writefile('defaults.json', JSON.stringify({R:R.default, D:D.default}));
	}
	static ReadDefaults()
	{
		const file = 'defaults.json';
		let contents = null;
		if (isGUI)
			contents = U.readfile(file);
		else
		{
			if (fs.existsSync(file))
				content = fs.readFile(file);
		}
		const defaults = contents ? JSON.parse(contents) : null;
		if (defaults)
		{
			Object.keys(defaults.R).map(k => R.default[k] = defaults.R[k]);		// merge the R defaults
			isGUI && Object.keys(defaults.D).map(k => D.default[k] = defaults.D[k]);		// merge the D defaults
		}
	}
	static login(e)
	{
		Cat.R.cloud.login(e, ok => ok);
	}
	static CanFormat(elt)
	{
		return elt instanceof Morphism && (elt.isIterable() || R.Actions.javascript.canFormat(elt));
	}
	static HasLocalDiagram(name)
	{
		return !!U.readfile(`${name}.json`);
	}
	static DiagramSearch(search, fn)
	{
		fetch(R.getURL(`search?search=${search}`)).then(response => response.json()).then(diagrams => fn(diagrams));
	}
	static getURL(suffix)
	{
		// local servers do not usually do https, or need to
		let url = `${R.local ? 'http' : 'https'}://${isGUI ? document.location.host : R.default.sifu}/`;
		if (suffix)
			url += suffix;
		return url;
	}
	static getDiagramURL(suffix)
	{
		return R.getURL(`diagram/${suffix}`);
	}
	static downloadDiagramData(name, cache, fn, timestamp)
	{
		return fetch(R.getDiagramURL(name + '.json'), {cache: cache ? 'default' : 'reload'}).then(response => response.json()).then(json =>
		{
			if (json.timestamp < timestamp)
			{
				alert(`Warning! timestamp discrepancy ${json.timestamp} vs ${timestamp}`);
				json.timestamp = timestamp;
			}
			U.writefile(`${json.name}.json`, JSON.stringify(json));
			R.SetDiagramInfo(json);
			fn && fn(json);
		});
	}
	static authFetch(url, body)
	{
		body.user = R.user.name;
		const bodyStr = JSON.stringify(body);
		const headers = {'Content-Type':'application/json;charset=utf-8', token:R.user.token};
		return fetch(url, {method:'POST', body:bodyStr, headers});
	}
	static updateRefcnts()
	{
		const headers = {'Content-Type':'application/json;charset=utf-8', token:R.user.token};
		fetch(R.getURL('refcnts'), {method:'POST', body:JSON.stringify({user:R.user.name}), headers}).then(response => response.json()).then(
		{
		}).catch(err => D.RecordError(err));
	}
	static upload(e, diagram, doPng, fn)
	{
		if (R.user.status !== 'logged-in')
			return;
		const body = {diagram:diagram instanceof Diagram ? diagram.json() : diagram, user:R.user.name};
		if (doPng)
			body.png = D.GetPng(diagram.name);
		const prom = R.authFetch(R.getURL('upload'), body).then(res => fn(res)).catch(err => D.RecordError(err));
		R.EmitCATEvent('upload', diagram.name);
		return prom;
	}
	static uploadDiagram(e, name)
	{
		let diagram = R.$CAT.getElement(name);
		if (!diagram)
			diagram = JSON.parse(U.readfile(`${name}.json`));
		if (diagram)
			R.upload(e, diagram, true, _ => _);
	}
	static AddReference(e, name)
	{
		const ref = R.$CAT.getElement(name);
		if (!ref)
			throw 'no diagram';
		const diagram = R.diagram;
		diagram.addReference(name);
		R.catalog.get(name).refcnt++;
		D.statusbar.show(e, `Diagram ${ref.properName} now referenced`);
		diagram.log({command:'addReference', name});
		diagram.antilog({command:'removeReference', name});
	}
	static RemoveReference(e, name)
	{
		const diagram = R.diagram;
		const ref = R.$CAT.getElement(name);
		if (!ref)
			throw 'no reference diagram';
		diagram.removeReference(name);
		R.catalog.get(name).refcnt--;
		R.EmitDiagramEvent(diagram, 'removeReference', name);
		D.statusbar.show(e, `${diagram.properName} reference removed`);
		diagram.log({command:'removeReference', name});
		diagram.antilog({command:'addReference', name});
	}
}
Object.defineProperties(R,
{
	Actions:			{value:{},			writable:false},	// loaded actions
	autosave:			{value:false,		writable:true},		// is autosave turned on for diagrams?
	Cat:				{value:null,		writable:true},
	CAT:				{value:null,		writable:true},		// working nat trans
	catalog:			{value:new Map(),	writable:true},
	Categories:			{value:new Map(),	writable:false},	// available categories
	clear:				{value:false,		writable:true},
	cloud:				{value:null,		writable:true},		// cloud we're using
	default:
	{
		value:
		{
			category:		'hdole/PFS',
//			diagram:		'',
			debug:			true,
			showEvents:		true,
			sifu:			'catecon.net',
		},
		writable:	true,
	},
	diagram:			{value:null,		writable:true},		// current diagram
	Diagrams:			{value:new Map(),	writable:false},	// available diagrams
	initialized:		{value:false,		writable:true},		// Have we finished the boot sequence and initialized properly?
	languages:			{value:new Map(),	writable:false},
	local:				{value:null,		writable:true},		// local server, if it exists
	params:				{value:null,		writable:true},		// URL parameters
	ServerDiagrams:		{value:new Map(),	writable:false},
	sync:				{value:false,		writable:true},		// when to turn on sync of gui and local storage
	sys:				{value:{},			writable:false},	// system diagrams
	user:
	{
		value:
		{
			name:	'Anon',
			email:	'anon@example.com',
			status:	'unauthorized',
			cloud:	null,
			isAdmin:	_ => R.user.cloud && R.user.cloud.permissions.includes('admin'),
		},
		writable:true
	},	// TODO fix after bootstrap removed	writable:true,
	workers:			{value:{},		writable: false},
});

class Cloud		// fitb
{
	constructor() {}
	diagramSearch(search, fn) {}
	initialize() {}
	load() {}
	login() {}
}

class Amazon extends Cloud
{
	constructor()
	{
		super();
		Object.defineProperties(this,
		{
			'clientId':			{value: 'amzn1.application-oa2-client.2edcbc327dfe4a2081e53a155ab21e77',		writable: false},
			'cognitoRegion':	{value:	'us-west-2',															writable: false},
			'loginInfo':		{value:	{IdentityPoolId:	'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf'},	writable: false},
			'diagramBucketName':{value:	'catecon-diagrams',														writable: false},
			'region':			{value:	'us-west-1',															writable: false},
			'userPoolId':		{value:	'us-west-2_HKN5CKGDz',													writable: false},
			'accessToken':		{value: null,																	writable: true},
			'user':				{value:	null,																	writable: true},
			'userPool':			{value:	null,																	writable: true},
		});
		if (isGUI && window.AWS)
		{
			window.AWS.config.update(
			{
				region:			this.region,
				credentials:	new window.AWS.CognitoIdentityCredentials(this.loginInfo),
			});
			this.registerCognito();
		}
	}
	registerCognito()
	{
		const poolInfo =
		{
			UserPoolId:	this.userPoolId,
			ClientId:	'fjclc9b9lpc83tmkm8b152pin',
		};
		window.AWS.config.region = this.cognitoRegion;
		if (ACI)
		{
			this.userPool = new ACI.CognitoUserPool(poolInfo);
			this.user = this.userPool.getCurrentUser();
		}
		else if (AmazonCognitoIdentity)
		{
			this.userPool = new AmazonCognitoIdentity.CognitoUserPool(poolInfo);
			this.user = this.userPool.getCurrentUser();
		}
		if (this.user)
		{
			this.user.getSession((err, session) =>
			{
				if (err)
				{
					alert(err.message);
					return;
				}
				R.user.token = session.getIdToken().getJwtToken();
				window.AWS.config.credentials = new window.AWS.CognitoIdentityCredentials(this.loginInfo);
				this.accessToken = session.getAccessToken().getJwtToken();
				const idPro = new window.AWS.CognitoIdentityServiceProvider();
				idPro.getUser({AccessToken:this.accessToken}, function(err, data)
				{
					if (err)
					{
						console.error('getUser error', err);
						return;
					}
					R.user.name = data.Username;
					R.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
					R.user.status = 'logged-in';
					R.authFetch(R.getURL('userInfo'), {}).then(res =>
					{
						if (!res.ok)
						{
							D.RecordError('cannot fetch user info');
							throw 'cannot fetch';
						}
						return res.json();
					}).then(json =>
					{
						R.user.cloud = json;
						R.user.cloud.permissions = R.user.cloud.permissions.split(' ');
						R.EmitLoginEvent();
					}).catch(err => D.RecordError(err));
				});
			});
		}
		else
		{
			window.AWS.config.credentials = new window.AWS.CognitoIdentityCredentials(this.loginInfo);
			window.AWS.config.credentials.get();
		}
	}
	signup()
	{
		const userName = U.HtmlSafe(document.getElementById('signupUserName').value);
		const email = U.HtmlSafe(document.getElementById('signupUserEmail').value);
		if (U.secret !== U.getUserSecret(U.HtmlSafe(document.getElementById('SignupSecret').value)))
		{
			alert('Your secret is not good enough');
			return;
		}
		const password = document.getElementById('SignupUserPassword').value;
		const confirmPassword = document.getElementById('SignupUserPasswordConfirm').value;
		if (password !== confirmPassword)
		{
			alert('The passwords do not match.');
			return;
		}
		if (password === '')
		{
			alert('Improve your password');
			return;
		}
		const attributes =
		[
			new AmazonCognitoIdentity.CognitoUserAttribute({Name:'email', Value:email}),
		];
		this.userPool.signUp(userName, password, attributes, null, (err, result) =>
		{
			if (err)
				return alert(err.message);
			this.user = result.user;
			R.user.name = userName;
			R.user.email = email;
			R.user.status = 'registered';
			R.EmitLoginEvent();
		});
		event.preventDefault();
	}
	resetPassword(e)	// start the process; a code is sent to the user
	{
		const idPro = new window.AWS.CognitoIdentityServiceProvider();
		idPro.forgotPassword({ClientId:'fjclc9b9lpc83tmkm8b152pin', Username:R.user.name}, function(err, data)
		{
			if (err)
				console.error(err);
			else
				console.log(data);
		});
		e.preventDefault();
	}
	confirm(e)
	{
		const code = document.getElementById('confirmationCode').value;
		this.user.confirmRegistration(code, true, function(err, result)
		{
			if (err)
				return alert(err.message);
			R.user.status = 'confirmed';
			R.EmitLoginEvent();
		});
		e.preventDefault();
	}
	updatePassword(e)
	{
		const code = document.getElementById('confirmationCode').value;
		const password = document.getElementById('login-new-password').value;
		this.user.confirmPassword(code, password,
		{
			onFailure:function(err)
			{
				alert(err);
			},
			onSuccess:function()
			{
				// TODO are we logged in now?
				R.user.status === 'logged-in';
			},
		});
		e.preventDefault();
	}
	login(e, fn)
	{
		try
		{
			const userName = U.HtmlSafe(document.getElementById('login-user-name').value);
//			const password = D.loginPanel.passwordElt.value;
			const password = U.HtmlSafe(document.getElementById('login-password').value);
			const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({Username:userName, Password:password});
			const userData = {Username:userName, Pool:this.userPool};
			this.user = new AmazonCognitoIdentity.CognitoUser(userData);
			R.user.name = userName;
			R.user.email = '';
			e.preventDefault();
			this.user.authenticateUser(authenticationDetails,
			{
				onSuccess:function(result)
				{
					this.accessToken = result.getAccessToken().getJwtToken();
					R.user.status = 'logged-in';
					const idPro = new window.AWS.CognitoIdentityServiceProvider();
					idPro.getUser({AccessToken:this.accessToken}, function(err, data)
					{
						if (err)
						{
							console.log('getUser error',err);
							return;
						}
						R.user.name = data.Username;
						R.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
						R.EmitLoginEvent();
					});
					fn(true);
				},
				onFailure:function(err)
				{
					switch(err.code)
					{
						case 'UserNotConfirmedException':
							R.user.status = 'registered';
							break;
						case 'PasswordResetRequiredException':
							R.user.status = 'reset';
							break;
						default:
							R.user.status = 'unauthorized';
							break;
					}
					R.EmitLoginEvent();
					fn(false);
					alert(err.message);
				},
				mfaRequired:function(codeDeliveryDetails)
				{
					let verificationCode = '';
					this.user.sendMFACode(verificationCode, this);
				},
			});
		}
		catch(x)
		{
			D.loginPanel.errorElt.innerHTML = U.HtmlEntitySafe(x.message);
		}
	}
	logout()
	{
		this.user.signOut();
		R.user.status = 'unauthorized';
		R.user.name = 'Anon';
		R.user.email = '';
		R.EmitLoginEvent();
	}
	diagramSearch(search, fn)
	{
		const params =
		{
			FunctionName:	'CateconDiagramSearch',
			InvocationType:	'RequestResponse',
			LogType:		'None',
			Payload:		JSON.stringify({search}),
		};
		const handler = function(error, data)
		{
			if (error)
			{
				D.RecordError(error);
				fn([]);
				return;
			}
			const result = JSON.parse(data.Payload);
			fn(result);
		};
		this.lambda.invoke(params, handler);
	}
}

class Navbar
{
	constructor()
	{
		this.element = document.getElementById('navbar');
		this.categoryElt = null;
		this.diagramElt = null;
		this.update();
		this.element.onmouseenter = _ => D.mouse.onGUI = this;
		this.element.onmouseleave = _ => D.mouse.onGUI = null;
		this.diagramPopup = document.getElementById('diagram-popup');
		this.diagramPopup.onmouseenter = _ => D.mouse.onGUI = this;
		this.diagramPopup.onmouseleave = _ => D.mouse.onGUI = null;
		window.addEventListener('Login', Navbar.UpdateByUserStatus);
		window.addEventListener('Registration', Navbar.UpdateByUserStatus);
		window.addEventListener('CAT', e => e.detail.command === 'default' && D.navbar.updateByCatDefaultEvent());
		window.addEventListener('Autohide', e =>
		{
			if (D.session.mode === 'catalog')	// no autohide in catalog view
				return;
			const args = e.detail;
			if (args.command === 'hide')
			{
				this.element.style.height = "0px";
				D.RemoveChildren(this.diagramPopup);
			}
			else
				this.element.style.height = "32px";
		});
		window.addEventListener('View', _ => this.update());
	}
	updateByCatDefaultEvent()
	{
		this.updateByUserStatus();
		this.updateLastViewedDiagrams();
	}
	updateByUserStatus()
	{
		let c = '#CCC';
		switch(R.user.status)
		{
			case 'registered':
				c = '#A33';
				break;
			case 'reset':
			case 'confirmed':
				c = '#0A0';
				break;
			case 'unauthorized':
				c = '#CCC';
				break;
			case 'logged-in':
				c = '#333';
				break;
		}
		this.element.style.background = c;
		if (R.diagram)
		{
			this.categoryElt.innerHTML = U.HtmlEntitySafe(R.diagram.codomain.properName);
			D.RemoveChildren(this.diagramElt);
			this.diagramElt.appendChild(H3.span(R.diagram.properName, H3.span('.italic', ' by ', R.diagram.user)));
		}
		else
		{
			D.RemoveChildren(this.diagramElt);
			D.RemoveChildren(this.categoryElt);
		}
	}
	update()
	{
		const sz = D.default.button.large;
		let left = [];
		let right = [];
		if (D.session.mode === 'diagram')
		{
			left.push(D.getIcon('diagramPanelToggle', 'diagram', _ => Cat.D.diagramPanel.toggle(), 'Diagrams', sz));
			left.push(D.getIcon('categoryPanelToggle', 'category', _ => Cat.D.categoryPanel.toggle(), 'Categories', sz));
			left.push(D.getIcon('objectPanelToggle', 'object', _ => Cat.D.objectPanel.toggle(), 'Objects', sz));
			left.push(D.getIcon('morphismPanelToggle', 'morphism', _ => Cat.D.morphismPanel.toggle(), 'Morphisms', sz));
			left.push(D.getIcon('textPanelToggle', 'text', _ => Cat.D.textPanel.toggle(), 'Text', sz));
//			left.push(D.getIcon('showGraphs', 'string', _ => Cat.R.diagram.showGraphs, 'Graph', sz));
			right.push(D.getIcon('cateapsis', 'cateapsis', _ => Cat.R.diagram && Cat.R.diagram.home(), 'Home', sz));
			right.push(D.getIcon('threeDPanelToggle', 'threeD', _ => Cat.D.threeDPanel.toggle(), '3D view', sz));
			right.push(D.getIcon('ttyPanelToggle', 'tty', _ => Cat.D.ttyPanel.toggle(), 'Console', sz));
			right.push(D.getIcon('helpPanelToggle', 'help', _ => Cat.D.helpPanel.toggle(), 'Help', sz));
			right.push(D.getIcon('loginPanelToggle', 'login', _ => Cat.D.loginPanel.toggle(), 'Login', sz));
			right.push(D.getIcon('settingsPanelToggle', 'settings', _ => Cat.D.settingsPanel.toggle(), 'Settings', sz));
		}
		else
		{
			right.push(D.getIcon('helpPanelToggle', 'help', _ => Cat.D.helpPanel.toggle(), 'Help', sz));
			right.push(D.getIcon('loginPanelToggle', 'login', _ => Cat.D.loginPanel.toggle(), 'Login', sz));
			right.push(D.getIcon('settingsPanelToggle', 'settings', _ => Cat.D.settingsPanel.toggle(), 'Settings', sz));
		}
		const divs = [	H3.div('.navbar-float.navbar-tools.buttonBarLeft', left),
						H3.div(H3.span('##category-navbar.navbar-text'), '.navbar-float.navbar-inset', {title:'Current category scope'}),
						H3.div('Catecon', {onclick:_ => R.EmitViewEvent('catalog', D.catalog.view)}, '.title.navbar-float.navbar-inset'),
						H3.div(H3.span('##diagram-navbar.navbar-text'), '.navbar-float.navbar-inset', {title:'Current diagram', onclick:_ => this.diagramPopup.classList.toggle('hidden')}),
						H3.div('.navbar-float.navbar-tools.buttonBarRight', right)];
		D.RemoveChildren(this.element);
		divs.map(div => this.element.appendChild(div));
		this.categoryElt = document.getElementById('category-navbar');
		this.diagramElt = document.getElementById('diagram-navbar');
		this.updateByUserStatus();
	}
	updateLastViewedDiagrams()
	{
		const diagrams = [...D.viewports];
		// sort by most recent first
		const result = diagrams.sort((a, b) => a[1].timestamp > b[1].timestamp ? -1 : a[1].timestamp < b[1].timestamp ? 1 : 0);
		result.length = 20;
		const rows = diagrams.map(info => H3.tr(H3.td(H3.span(info[0]), '.left.popupBtn', {onclick:_ => R.SelectDiagram(info[0])})));
		const popupElt = H3.div(H3.span('Recent diagrams', '.italic.smallPrint'), H3.table(rows), '.popupElt', {onmouseleave:e => this.diagramPopup.classList.toggle('hidden')});
		D.RemoveChildren(this.diagramPopup);
		this.diagramPopup.appendChild(popupElt);
	}
}

class Toolbar
{
	constructor()
	{
		Object.defineProperties(this,
		{
			'closed':		{value:	false,										writable: true},
			'diagram':		{value: null,										writable: true},
			'element':		{value: document.getElementById('toolbar'),			writable: false},
			'error':		{value: document.getElementById('toolbar-error'),	writable: false},
			'header':		{value: document.getElementById('toolbar-header'),	writable: false},
			'help':			{value: document.getElementById('toolbar-help'),	writable: false},
			'mouseCoords':	{value: null,										writable: true},
		});
		this.element.onmouseenter = _ => D.mouse.onGUI = this;
		this.element.onmouseleave = _ => D.mouse.onGUI = null;
		window.addEventListener('Diagram', e => e.detail.command === 'select' && D.toolbar.show(e));
		function hideToolbar(e)
		{
			const args = e.detail;
			const element = args.element;
			if (!args.diagram || args.diagram !== R.diagram || !U.IsIndexElement(element))
				D.toolbar.hide();
			else if (args.command === 'select')
				D.toolbar.show(e);
		}
		window.addEventListener('Diagram', e => e.detail.command === 'load' && D.toolbar.resetMouseCoords());
		window.addEventListener('Object', hideToolbar);
		window.addEventListener('Morphism', hideToolbar);
		window.addEventListener('Text', hideToolbar);
		window.addEventListener('Assertion', hideToolbar);
		window.addEventListener('mouseenter', e => D.mouse.saveClientPosition(e));
		window.addEventListener('Autohide', e =>
		{
			if (e.detail.command === 'hide')
				this.element.classList.add('hidden');
			else if (!this.closed)
				this.element.classList.remove('hidden');
		});
		window.addEventListener('Login', e => this.hide());
		window.addEventListener('View', e => e.detail.command === 'catalog' ? this.hide() : null);
		window.addEventListener('CAT', hideToolbar);
	}
	resetMouseCoords()
	{
		this.mouseCoords = D.Center(R.diagram);
	}
	hide()
	{
		this.element.classList.add('hidden');
		this.closed = true;
	}
	reveal()
	{
		this.element.classList.remove('hidden');
		this.closed = false;
	}
	show(e, toggle = true)
	{
		this.error.innerHTML = '';
		const diagram = R.diagram;
//		if (!diagram)
//			return;
		let xy = U.Clone(D.mouse.down);
		if (diagram)
			this.mouseCoords = diagram.userToDiagramCoords(xy);
		else
		{
		// TODO this.mouseCoords = D.session.userToDiagramCoords(xy);
		}
		const element = this.element;
		if (element.classList.contains('hidden') || (diagram && diagram.selected.length > 0))
			this.reveal();
		else
		{
			this.hide();
			if (toggle)
				return;
		}
		D.RemoveChildren(this.help);
//		D.RemoveChildren(this.header);
		D.RemoveChildren(this.error);
		element.style.display = 'block';
		const moveBtn = D.getIcon('moveToolbar', 'move', '', 'Move toolbar', D.default.button.small, 'toolbar-drag-handle');
		let delta = null;
		moveBtn.onmousedown = e =>
		{
			const click = new D2(e.clientX, e.clientY);
			const tb = Cat.D.toolbar.element;
			const tbLoc = new D2(tb.offsetLeft, tb.offsetTop);
			delta = click.subtract(tbLoc);
			document.addEventListener('mousemove', onMouseMove);
			e.preventDefault();
		};
		const onMouseMove = e =>
		{
			element.style.left = `${e.clientX - delta.x}px`;
			element.style.top = `${e.clientY - delta.y}px`;
			return true;
		};
		moveBtn.onmouseup = e => document.removeEventListener('mousemove', onMouseMove);
		const btns = [moveBtn];
		if (diagram)
		{
			if (diagram.selected.length > 0)
				this.showSelectedElementsToolbar(diagram, btns);
			else
				this.showDiagramToolbar(diagram, btns);
		}
		else
			this.showSessionToolbar(btns);
		// adjust toolbar location relative to mouse
		const toolbox = element.getBoundingClientRect();
		xy.y = xy.y + D.default.margin + 20;
		element.style.left = `${xy.x - toolbox.width/2}px`;
		element.style.top = `${xy.y}px`;
		this.automove(diagram);
		D.drag = false;
	}
	showSelectedElementsToolbar(diagram, btns)
	{
		D.RemoveChildren(this.header);
		let actions = [...diagram.codomain.actions.values()];
		actions.sort((a, b) => a.priority < b.priority ? -1 : b.priority > a.priority ? 1 : 0);
		actions.map(action =>
		{
			if (!action.hidden() && action.hasForm(diagram, diagram.selected))
				btns.push(D.getIcon(action.basename, action.basename, e => Cat.R.diagram['html' in action ? 'actionHtml' : 'activate'](e, action.basename), action.description));
		});
		this.addCloseToolbarBtn(btns);
		btns.map(btn => this.header.appendChild(btn));
	}
	showDiagramToolbar(diagram, btns)
	{
		D.RemoveChildren(this.header);
		btns.push(D.getIcon('newDiagram', 'diagram', _ => Cat.D.elementTool.Diagram.html(), 'Diagram'));
		if (diagram.isEditable())
		{
			btns.push(D.getIcon('newObject', 'object', e => Cat.D.elementTool.Object.html(e), 'Object'));
			btns.push(D.getIcon('newMorphism', 'morphism', e => Cat.D.elementTool.Morphism.html(e), 'Morphism'));
			btns.push(D.getIcon('newText', 'text', e => Cat.D.elementTool.Text.html(e), 'Text'));
		}
		btns.push(D.getIcon('graph', 'graph', _ => Cat.R.diagram.showGraphs(), 'Show graphs in diagram'));
		btns.push(D.getIcon('toolbarShowSearch', 'search', _ => Cat.D.toolbar.showSearch(), 'Search in a diagram', D.default.button.small, 'toolbar-diagram-search-button', 'toolbar-diagram-search-button-ani'));
		this.addCloseToolbarBtn(btns);
		btns.map(btn => this.header.appendChild(btn));
	}
	showSessionToolbar(btns)
	{
		D.RemoveChildren(this.header);
		btns.push(D.getIcon('newDiagram', 'diagram', _ => Cat.D.elementTool.Diagram.html(), 'Diagram'));
		this.addCloseToolbarBtn(btns);
		btns.map(btn => this.header.appendChild(btn));
	}
	addCloseToolbarBtn(btns)
	{
		btns.push(D.getIcon('closeToolbar', 'close', _ => Cat.D.toolbar.hide(), 'Close'));
	}
	showSearch()
	{
		const onkeydown = e => Cat.D.OnEnter(e, e => Cat.D.toolbar.search(e));
		D.RemoveChildren(this.help);
		const input = H3.input('##toolbar-diagram-search.in100', {title:'Search', placeholder:'Find...', onkeydown, size:8});
		const btns = [];
		btns.push(D.getIcon('toolbarSearch', 'search', _ => Cat.D.toolbar.search(), 'Search for elements'));
		this.help.appendChild(H3.div(input, btns));
		this.help.appendChild(H3.div({id:'toolbar-search-items'}));
		input.focus();
	}
	search(e)
	{
		const searchItems = document.getElementById('toolbar-search-items');
		const searchInput = document.getElementById('toolbar-diagram-search');
		D.RemoveChildren(searchItems);
		const elts = R.diagram.search(searchInput.value);
		const rows = elts.map(elt =>
		{
			switch(elt.constructor.name)
			{
				case 'CatObject':
				case 'NamedObject':
				case 'Morphism':
				case 'NamedMorphism':
					break;
				default:
					return;
			}
			const help = elt.getHtmlRep();
			const btns = [];
			let text = '';
			if (U.IsIndexElement(elt))
				btns.push(D.getIcon('viewElement', 'view', _ => R.diagram.viewElements(elt), 'View element'));
			if (elt instanceof DiagramObject || elt instanceof DiagramMorphism)
			{
				btns.push(D.getIcon('placeElement', 'edit', e => R.diagram.placeMorphism(e, elt.to), 'Place element'));
				text = elt.getHtmlRep();
			}
			else
			{
				btns.push(D.getIcon('placeElement', 'edit', e => R.diagram.placeMorphism(e, elt), 'Place element'));
				text = elt.getHtmlRep();
			}
			const row = H3.tr(H3.td(btns), H3.td(text, '.left'));
			if (U.IsIndexElement(elt))
			{
				row.addEventListener('mouseenter', e => Cat.R.diagram.emphasis(elt.name, true));
				row.addEventListener('mouseleave', e => Cat.R.diagram.emphasis(elt.name, false));
			}
			return row;
		});
		searchItems.appendChild(H3.table(rows));
	}
	clearError()
	{
		D.RemoveChildren(this.error); }
	showError(msg)
	{
		this.clearError();
		this.error.appendChild(H3.span(msg, '.error'));
	}
	automove(diagram)		// vertically displace the toolbar to avoid selected items
	{
		if (!diagram)
			return;
		const selected = diagram.selected;
		const toolBbox = new D2(this.element.getBoundingClientRect());
		selected.map(obj =>
		{
			if (obj instanceof DiagramObject)
			{
				const selBbox = R.diagram.diagramToUserCoords(obj.svg.getBBox());
				if (D2.Overlap(toolBbox, selBbox))
					this.element.style.top = `${selBbox.y + selBbox.height}px`;
			}
		});
	}
}

class StatusBar
{
	constructor()
	{
		Object.defineProperties(this,
		{
			'element':		{value: document.getElementById('statusbar'),	writable: false},
			'message':		{value: '',										writable: true},
			'timerIn':		{value: null,									writable: true},
			'timerOut':		{value: null,									writable: true},
			'xy':			{value: null,									writable: true},
		});
	}
	_prep(msg)
	{
		this.message = U.HtmlEntitySafe(msg);
		if (this.timerOut)
			clearInterval(this.timerOut);
		if (this.timerIn)
			clearInterval(this.timerIn);
		if (msg === '')
		{
			this.hide();
			return;	// nothing to show later
		}
	}
	_post(e, msg, record)
	{
		const elt = this.element;
		elt.innerHTML = msg;
		let x, y;
		if (typeof e === 'object')
		{
			x = e ? e.clientX : 100;
			y = e ? e.clientY : 100;
			elt.style.left = `${x + 10}px`;
			elt.style.top = `${y - 30}px`;
			elt.style.display = 'block';
			this.xy = {x, y};
			this.hide();
		}
		else
		{
			x = window.innerWidth/2;
			y = window.innerHeight/2;
		}
		const bbox = elt.getBoundingClientRect();
		const delta = bbox.left + bbox.width - window.innerWidth;
		if (delta > 0)	// shift back to onscreen
			elt.style.left = Math.min(0, bbox.left - delta);
		if (record)
			document.getElementById('tty-out').innerHTML += this.message + "\n";
	}
	show(e, msg, record = false)
	{
		this._prep(msg);
		this.timerIn = setTimeout(_ =>
		{
			this.element.classList.remove('hidden');
			if (!D.toolbar.element.classList.contains('hidden'))
			{
				const toolbox = D.toolbar.element.getBoundingClientRect();
				const statusbox = this.element.getBoundingClientRect();
				if (D2.Overlap(toolbox, statusbox))
					this.element.style.top = `${toolbox.top + toolbox.height + D.default.font.height}px`;
			}
		}, D.default.statusbar.timein); 
		this.timerOut = setTimeout(_ => this.hide(), D.default.statusbar.timeout); 
		this._post(e, msg, record);
	}
	alert(e, msg, record = false)
	{
		this._prep(msg);
		this.thithis.classList.remove('hidden');
		this._post(e, msg, record);
	}
	hide() { this.element.classList.add('hidden'); }
}

class ElementTool
{
	constructor(type, headline, suppress = false)
	{
		Object.defineProperties(this,
		{
			type:				{value: type,										writable: false},
			headline:			{value: headline,									writable: false},
			suppress:			{value: suppress,									writable: false},
			filter:				{value: '',											writable: true},
			basenameElt:		{value: null,										writable: true},
			properNameElt:		{value: null,										writable: true},
			descriptionElt:		{value: null,										writable: true},
			domainElt:			{value: null,										writable: true},
			codomainElt:		{value: null,										writable: true},
			error:				{value: null,										writable: true},
		});
		D.ReplayCommands.set(`new${this.type}`, this);
	}
	html(e)
	{
		const help = D.toolbar.help;
		D.RemoveChildren(help);
		const toolbar2 = [];
		// create new element
		R.diagram.isEditable() && toolbar2.push(H3.span(D.getIcon('new', 'edit', _ => help.querySelector('#help-new').classList.toggle('hidden'), 'New')));
		// search for an elment
		toolbar2.push(H3.span(D.getIcon('search', 'search', _ => help.querySelector('#help-search').classList.toggle('hidden'), 'Search')));
		toolbar2.push(H3.span(D.getIcon('reference', 'reference', _ => this.showReferences(), 'References')));
//		const isUsers = R.diagram && (R.user.name === R.diagram.user || R.user.isAdmin());
		if (this.type === 'Diagram')
		{
			if (R.user.status === 'logged-in' && R.cloud && R.diagram && R.diagram.isEditable())
				toolbar2.push(D.getIcon('diagramUpload', 'upload', e => R.diagram.upload(e), 'Upload to cloud', D.default.button.small, false, 'diagramUploadBtn'));
			toolbar2.push(D.getIcon('download', 'download2', e => D.toolbar.help.querySelector('#help-download').classList.toggle('hidden'), 'Download stuff', D.default.button.small));
		}
		help.appendChild(H3.div(toolbar2, '##help-toolbar2.buttonBarLeft'));
		const downloadToolbar = [];
		switch(this.type)
		{
			case 'Object':
			case 'Morphism':
				break;
			case 'Diagram':
				downloadToolbar.push(D.DownloadButton('JSON', e => Cat.R.diagram.downloadJSON(e), 'Download JSON'));
				downloadToolbar.push(D.DownloadButton('JS', e => Cat.R.diagram.downloadJS(e), 'Download Javascript'));
				downloadToolbar.push(D.DownloadButton('C++', e => Cat.R.diagram.downloadCPP(e), 'Download C++'));
				downloadToolbar.push(D.DownloadButton('PNG', e => Cat.R.diagram.downloadPNG(e), 'Download PNG'));
				break;
		}
		downloadToolbar.length > 0 && help.appendChild(H3.div(downloadToolbar, '##help-download.hidden'));
		help.appendChild(H3.h4(this.type));
		if (this.type === 'Diagram' && R.diagram)
		{
			help.appendChild(H3.div(
//							H3.h4(H3.span(R.diagram.basename), H3.span('##diagram-basename-edit')),
							H3.h4(H3.span(R.diagram.codomain.properName)),
							H3.h4(H3.span(R.diagram.properName), H3.span('##diagram-properName-edit')),
//							H3.table(H3.tr(H3.td('##diagram-image.center.imageBackground'))),
							H3.table(H3.tr(H3.td(D.GetImageElement(R.diagram.name)))),
							H3.p(H3.span(R.diagram.description, {title:'Description'}), H3.span({id:'diagram-description-edit'})),
							H3.table(H3.tr(	H3.td(H3.span('By '), H3.span(R.diagram.user), '.smallPrint.italic'),
											H3.td(H3.span(new Date(R.diagram.timestamp).toLocaleString()), H3.br(), H3.span('##diagram-info'), '.smallPrint.italic')))));
		;
		}
//		const focus = this.addNewSection();
		this.addNewSection();
		const onkeyup = e =>
		{
			this.filter = document.getElementById('help-element-search').value;
			const tbl = document.getElementById('help-matching-table');
			D.RemoveChildren(tbl);
			this.getMatchingRows(tbl);
//			rows.map(r => tbl.appendChild(r));
		};
		help.appendChild(H3.div('##help-search.hidden', H3.hr(), H3.span('Search in category', '.italic'), H3.br(), H3.input('##help-element-search.in100', {title:'Search', placeholder:'Name contains...', onkeyup })));
		help.appendChild(H3.div('##help-references.hidden'));
//		if (this.type !== 'Diagram')
//		{
		help.appendChild(H3.hr());
//			help.appendChild(H3.small('Click to place', '.italic'));
//			const existingRows = this.getMatchingRows(tbl);
		help.appendChild(H3.table({id:'help-matching-table', style:'margin:4px;'}));
//		}
//		else
//		{
//			help.appendChild(H3.hr());
//			help.appendChild(H3.div(H3.button('View references', '.textButton', {onclick:e => D.catalog.reference()}), '.center'));
//		}
//		if (focus)
//		{
//			focus.focus();
//			focus.select();
//		}
	}
	addNewSection()
	{
		const help = D.toolbar.help;
//		let focus = null;
		const action = e =>
		{
			switch(this.type)
			{
				case 'Category':
					break;
				case 'Object':
					this.createObject(e);
					break;
				case 'Morphism':
					this.createMorphism(e);
					break;
				case 'Text':
					this.createText(e);
					break;
				case 'Diagram':
					this.createDiagram(e);
					break;
			}
		};
		const rows = [];
		switch(this.type)
		{
			case 'Object':
			case 'Morphism':
			case 'Diagram':
				rows.push(H3.tr(H3.td(this.basenameElt = H3.input('##new-basename', {placeholder:'Base name', title:'Base name'}))));
				rows.push(H3.tr(H3.td(this.properNameElt = H3.input('##new-properName', {placeholder:'Proper name', title:'Proper name'}))));
//				focus = this.basenameElt;
				break;
		}
		this.descriptionElt = H3.input('##new-description.in100', {title:'Description', placeholder:'Description', onkeydown:e => Cat.D.OnEnter(e, action)});
		rows.push(H3.tr(H3.td(this.descriptionElt)));
//		let canSearch = false;
		switch(this.type)
		{
			case 'Morphism':
//				canSearch = true;
				const objects = R.diagram.getObjects();
				if (!this.suppress)
				{
					this.domainElt = H3.select('##new-domain.w100');
					this.domainElt.appendChild(H3.option('Domain'));
					objects.map(o => this.domainElt.appendChild(H3.option(o.properName, {value:o.name})));
					this.codomainElt = H3.select('##new-codomain.w100');
					this.codomainElt.appendChild(H3.option('Codomain'));
					objects.map(o => this.codomainElt.appendChild(H3.option(o.properName, {value:o.name})));
					rows.push(H3.tr(H3.td(this.domainElt)));
					rows.push(H3.tr(H3.td(this.codomainElt)));
				}
				else
				{
					this.domainElt = {value:''};
					this.codomainElt = {value:''};
				}
				break;
			case 'Diagram':
				this.codomainElt = H3.select('##new-codomain.w100');
				for (const [name, e] of R.$CAT.elements)
					if (e instanceof Category && !(e instanceof IndexCategory) && e.user !== 'sys')
						this.codomainElt.appendChild(H3.option(e.properName, {value:e.name}));
				this.codomainElt.appendChild(H3.option(R.Cat.properName, {value:R.Cat.name}));
				rows.push(H3.tr(H3.td(this.codomainElt), '.sidenavRow'));
				break;
			case 'Object':
//				canSearch = true;
				break;
			case 'Text':
//				focus = this.descriptionElt;
				break;
		}
		const elts = [H3.hr(), H3.h5(this.headline)];
		elts.push(H3.table(rows));
		elts.push(H3.span(D.getIcon(action.name, 'edit', action, this.headline)));
		elts.push(this.error = H3.span('##new-error.error'));
		help.appendChild(H3.div(elts, '##help-new.hidden'));
//		return focus;
	}
	getMatchingRows(tbl)
	{
		switch(this.type)
		{
			case 'Morphism':
				if (!this.suppress)
				{
					let morphisms = R.diagram.getMorphisms().filter(m => m.properName.includes(this.filter) || m.basenameIncludes(this.filter));
					morphisms.sort(U.RefcntSorter);
					morphisms.map(m => tbl.appendChild(H3.tr(H3.td(m.getHtmlRep()), '.panelElt')));
				}
				else
				{
					this.domainElt = {value:''};
					this.codomainElt = {value:''};
				}
				break;
			case 'Object':
			{
				const objects = R.diagram.getObjects().filter(o => o.properName.includes(this.filter) || o.basenameIncludes(this.filter));
				objects.sort(U.RefcntSorter);
				objects.map(o => tbl.appendChild(H3.tr(H3.td(o.getHtmlRep()), '.panelElt')));
				break;
			}
			case 'Diagram':
			{
//				const diagrams = R.diagram.getObjects().filter(o => o.properName.includes(this.filter) || o.basenameIncludes(this.filter));
				const diagrams = [];
				R.Diagrams.forEach((info, name) => name.includes(this.filter) && diagrams.push(info));
				diagrams.sort(U.RefcntSorter);
				diagrams.map(d => tbl.appendChild(H3.tr(H3.td(d.name))));
				break;
			}
		}
	}
	update()
	{
		this.error.innerHTML = '';
		this.basenameElt && (this.basenameElt.value = '');
		this.properNameElt && (this.properNameElt.value = '');
		this.descriptionElt.value = '';
		this.error.style.padding = '0px';
		this.filter = '';
	}
	createDiagram(e)
	{
		try
		{
			const basename = U.HtmlSafe(this.basenameElt.value);
			if (!U.basenameEx.test(basename))
				throw 'Invalid basename';
			const userDiagram = R.GetUserDiagram(R.user.name);
			if (userDiagram.elements.has(basename))
				throw 'diagram already exists';
			const name = `${R.user.name}/${basename}`;
			if (R.Diagrams.has(name))
				throw 'diagram already exists';
			const diagram = new Diagram(userDiagram,
			{
				basename,
				codomain:		this.codomainElt.value,
				properName:		U.HtmlEntitySafe(this.properNameElt.value),
				description:	U.HtmlEntitySafe(this.descriptionElt.value),
				user:			R.user.name,
			});
			R.SetDiagramInfo(diagram);
			diagram.makeSVG();
			diagram.home();
			this.update();
			R.EmitCATEvent('new', diagram);
			R.SelectDiagram(diagram.name);
		}
		catch(x)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	createObject(e)
	{
		try
		{
			const basename = U.HtmlSafe(this.basenameElt.value);
			if (!U.basenameEx.test(basename))
				throw 'Invalid basename';
			const args =
			{
				basename,
				properName:		U.HtmlSafe(D.elementTool.Object.properNameElt.value),
				description:	U.HtmlSafe(D.elementTool.Object.descriptionElt.value),
			};
			args.xy = D.toolbar.mouseCoords;	// use original location
			const from = D.elementTool.Object.doit(e, R.diagram, args);
			D.elementTool.Object.update();
			args.command = 'newObject';
			R.diagram.log(args);
			R.diagram.antilog({command:'delete', elements:[from.name]});
		}
		catch(x)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	createMorphism(e)
	{
		try
		{
			const basename = U.HtmlSafe(this.basenameElt.value);
			if (!U.basenameEx.test(basename))
				throw 'Invalid basename';
			const diagram = R.diagram;
			const args =
			{
				basename,
				properName:		U.HtmlSafe(this.properNameElt.value),
				description:	U.HtmlSafe(this.descriptionElt.value),
				domain:			diagram.codomain.getElement(this.domainElt.value),
				codomain:		diagram.codomain.getElement(this.codomainElt.value),
			};
			args.xyDom = D.toolbar.mouseCoords;	// use original location
			const from = this.doit(e, diagram, args);
			if (from)
			{
				this.update();
				diagram.log(
				{
					command:'newMorphism',
					domain:args.domain.name,
					codomain:args.codomain.name,
					basename:args.basename,
					properName:args.properName,
					description:args.description,
					xyDom:from.domain.getXY(),
					xyCod:from.codomain.getXY(),
				});
				R.diagram.antilog({command:'delete', elements:[from.name]});
			}
		}
		catch(x)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(x);
			return null;
		}
	}
	createText(e)
	{
		try
		{
			const diagram = R.diagram;
			if (!diagram.isEditable())
				throw 'Diagram is not editable';	// TODO should disable instead
			const xy = D.toolbar.mouseCoords;	// use original location
			const text = U.HtmlEntitySafe(this.descriptionElt.value);
			const args = { xy, text };
			const from = this.doit(e, diagram, args);
			if (from)
			{
				diagram.log({command:'text', xy, text});
				diagram.antilog({command:'delete', elements:[from.name]});
				this.update();
			}
		}
		catch(x)
		{
			this.error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	doit(e, diagram, args, save = true)
	{
		try
		{
			let from = null;
			if (!diagram.isEditable())
				throw 'diagram is read only';
			const basename = args.basename;
			const name = Element.Codename(diagram, {basename});
			if (diagram.getElement(name))
				throw 'name already exists';
			const properName = args.properName;
			const description = args.description;
			switch (this.type)
			{
				case 'Object':
				{
					const to = new CatObject(diagram, args);
					from = diagram.placeObject(e, to, args.xy, save);
					break;
				}
				case 'Morphism':
				{
					const to = new Morphism(diagram, args);
					to.loadEquivalences();
					if (this.suppress)
						from = new DiagramMorphism(diagram, {to, domain:this.domain, codomain:this.codomain});
					else
						from = diagram.placeMorphism(e, to, args.xyDom, args.xyCod, save, false);
					R.EmitDiagramEvent(diagram, 'makeCells');
					break;
				}
				case 'Text':
				{
					from = diagram.placeText(e, args.xy, args.text);
					this.update();
					break;
				}
			}
			diagram.makeSelected(from);
			return from;
		}
		catch(x)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args, false);
	}
	showReferences()
	{
		const refElt = D.toolbar.help.querySelector('#help-references');
		if (refElt.classList.contains('hidden'))
		{
			refElt.classList.remove('hidden');
			D.RemoveChildren(refElt);
			refElt.appendChild(H3.hr());
			refElt.appendChild(H3.h5('References'));
			const tbl = H3.table();
			R.diagram.references.forEach(d => tbl.appendChild(H3.tr(H3.td(d.properName))));
			refElt.appendChild(tbl);
		}
		else
			refElt.classList.add('hidden');
	}
}

// Display
class D
{
	static Initialize()
	{
		D.navbar =			new Navbar();
		D.Navbar =			Navbar;
		D.uiSVG.style.left = '0px';
		D.uiSVG.style.top = '0px';
		D.AddEventListeners();
		D.parenWidth = D.textWidth('(');
		D.commaWidth = D.textWidth(',&nbsp;'),
		D.bracketWidth = D.textWidth('[');
		D.ElementTool =		ElementTool;
		D.screenPan = D.getScreenPan();
		const delta = Math.min(D.Width(), D.Height()) * D.default.pan.scale;
		D.Panel = 			Panel;
		D.panels =			new Panels();
		D.Panels =			Panels;
		D.categoryPanel =	new CategoryPanel();
		D.CategoryPanel =	CategoryPanel;
		D.diagramPanel =	new DiagramPanel();
		D.DiagramPanel =	DiagramPanel;
		D.helpPanel =		new HelpPanel();
		D.HelpPanel =		HelpPanel;
		D.loginPanel =		new LoginPanel();
		D.LoginPanel =		LoginPanel;
		D.morphismPanel =	new MorphismPanel();
		D.MorphismPanel =	MorphismPanel;
		D.objectPanel =		new ObjectPanel();
		D.ObjectPanel =		ObjectPanel;
		D.settingsPanel =	new SettingsPanel();
		D.SettingsPanel =	SettingsPanel;
		D.textPanel =		new TextPanel();
		D.TextPanel =		TextPanel;
		D.threeDPanel =		new ThreeDPanel();
		D.ThreeDPanel =		ThreeDPanel;
		D.ttyPanel =		new TtyPanel();
		D.TtyPanel =		TtyPanel;
		//
		D.elementTool =
		{
			Diagram:	new ElementTool('Diagram', 'Create a new diagram'),
			Object:		new ElementTool('Object', 'Create a new object in this diagram'),
			Morphism:	new ElementTool('Morphism', 'Create a new morphism in this diagram'),
			Text:		new ElementTool('Text', 'Create new text in this diagram'),
		},
		D.Resize();
		D.Autohide();
		D.SetupReplay();
	}
	static UpdateDisplay(e)
	{
		const args = e.detail;
		if (!args.diagram || args.diagram !== R.diagram)
			return;
		switch(args.command)
		{
			case 'delete':
				args.diagram.selected = args.diagram.selected.filter((r, elt) => elt.name !== args.element.name);
				if (args.element instanceof DiagramObject)
					D.GlowBadObjects(args.diagram);
				break;
			case 'new':
			case 'move':
				if (args.element instanceof DiagramObject)
					D.GlowBadObjects(args.diagram);
				break;
		}
	}
	static Resize()
	{
		const diagram = R.diagram;
		const scale = diagram !== null ? diagram.getViewport().scale : 1.0;
		const width = scale > 1.0 ? Math.max(window.innerWidth, window.innerWidth / scale) : window.innerWidth / scale;
		const height = scale > 1.0 ? Math.max(window.innerHeight, window.innerHeight / scale) : window.innerHeight / scale;
		if (D.topSVG)
		{
			D.topSVG.setAttribute('width', width);
			D.topSVG.setAttribute('height', height);
			D.uiSVG.setAttribute('width', width);
			D.uiSVG.setAttribute('height', height);
		}
		D.panels.resize();
		D.screenPan = D.getScreenPan();
	}
	static CancelAutohide()
	{
		if (D.autohideTimer)
			clearInterval(D.autohideTimer);
	}
	static Autohide()
	{
		window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'show'}}));
		D.CancelAutohide();
		D.setCursor();
		D.autohideTimer = setTimeout(_ =>
		{
			if (D.mouse.onGUI)
				return;
			if (R.default.debug)
				return;
			D.topSVG.style.cursor = 'none';
			if (!window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'hide'}})))	// cancelled!
				window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'show'}}));
		}, D.default.autohideTimer);
	}
	static CancelAutosave()
	{
		if (D.autosaveTimer)
			clearInterval(D.autosaveTimer);
	}
	static Autosave(diagram)
	{
		if (!R.sync)
			return;
		D.CancelAutosave();
		const timestamp = Date.now();
		diagram.timestamp = timestamp;
		D.autosaveTimer = setTimeout(e =>
		{
			if (timestamp === diagram.timestamp)
			{
				R.SaveLocal(diagram);
				if (R.local)
					R.upload(e, diagram, false, _ => {});
			}
		}, D.default.autosaveTimer);
	}
	static Mousedown(e)
	{
		D.mouse.saveClientPosition(e);
		if (e.button === 0)
		{
			D.mouseIsDown = true;
			D.mouse.down = new D2(e.clientX, e.clientY - D.topSVG.parentElement.offsetTop);	// client coords
			const diagram = R.diagram;
//			if (!diagram)
//				return;
			if (diagram)
			{
				const pnt = diagram.mouseDiagramPosition(e);
				if (D.mouseover)
				{
					if (!diagram.selected.includes(D.mouseover) && !D.shiftKey)
						diagram.deselectAll(e);
				}
				else
					diagram.deselectAll(e);
				D.dragStart = D.mouse.clientPosition();
				if (D.tool === 'pan' || !D.drag)
					D.drag = true;
			}
			else
				D.toolbar.show(e, true);
		}
		else if (e.button === 1)
			D.keyboardDown.Space(e);
	}
	static GetAreaSelectCoords()
	{
		const xy = D.mouse.clientPosition();
		const x = Math.min(xy.x, D.mouse.down.x);
		const y = Math.min(xy.y, D.mouse.down.y);
		const width = Math.abs(xy.x - D.mouse.down.x);
		const height = Math.abs(xy.y - D.mouse.down.y);
		return {x, y, width, height};
	}
	static DrawSelectRect()
	{
		const areaSelect = D.GetAreaSelectCoords();
		const svg = document.getElementById('selectRect');
		if (svg)
		{
			svg.setAttribute('x', areaSelect.x);
			svg.setAttribute('y', areaSelect.y);
			svg.setAttribute('width', areaSelect.width);
			svg.setAttribute('height', areaSelect.height);
		}
		else
			D.uiSVG.appendChild(H3.rect({id:'selectRect', x:areaSelect.x, y:areaSelect.y, width:areaSelect.width, height:areaSelect.height}));
	}
	static DeleteSelectRectangle()
	{
		const svg = document.getElementById('selectRect');
		if (svg)
			svg.parentNode.removeChild(svg);
	}
	static Mousemove(e)
	{
		D.mouse.saveClientPosition(e);
		try
		{
			const diagram = R.diagram;
//			if (diagram && !D.checkMouseOverDiagram(e))
//			if (!D.checkMouseOverDiagram(e))
//				R.SelectDiagram(null);
			if (!diagram)
				return;
			D.drag = D.mouseIsDown && diagram.selected.length > 0;
			const xy = diagram.mouseDiagramPosition(e);
			xy.width = 2;
			xy.height = 2;
			if (D.drag && diagram.isEditable())
			{
				if (diagram.selected.length > 0)
				{
					const from = diagram.getSelected();
					const oldMouseover = D.mouseover;
					if (from === D.mouseover)
						D.mouseover = null;
					const isMorphism = from instanceof Morphism;
					if (diagram.selected.length === 1)		// check for fusing
					{
						if (e.ctrlKey && !D.dragClone)
						{
							const isolated = from.refcnt === 1;
							if (from instanceof DiagramObject)		// ctrl-drag identity
							{
								diagram.activate(e, 'identity');
								const id = diagram.getSelected();
								id.codomain.update(xy);
								diagram.makeSelected(id.codomain);	// restore from identity action
								D.dragClone = true;
							}
							else if (isMorphism)	// ctrl-drag morphism copy
							{
								diagram.activate(e, 'copy', {offset: new D2()});
								D.dragClone = true;
							}
						}
						else
						{
							if (D.tool === 'select')
							{
								let fusible = false;
								diagram.updateDragObjects(e);
								fusible = diagram.updateFusible(e);
								let msg = '';
								if (D.mouseover && diagram.selected.length === 1)
								{
									if (diagram.isIsolated(from) && diagram.isIsolated(D.mouseover) &&
											((D.mouseover instanceof Morphism && from instanceof Morphism) ||
											(D.mouseover instanceof CatObject && from instanceof CatObject))) // check for creating products, coproducts, homs
									{
										if (e.shiftKey && R.Actions.coproduct)
											msg = 'Coproduct';
										else if (e.altKey && R.Actions.hom)
											msg = 'Hom';
										else if (R.Actions.product)
											msg = 'Product';
									}
								}
								if (msg !== '')
								{
									D.statusbar.show(e, msg);
									from.updateGlow(true, 'glow');
								}
								else if (D.mouseover && D.mouseOver !== from)
									from.updateGlow(true, from.isFusible(D.mouseover) ? 'glow' : 'badGlow');
								else if (!fusible)	// no glow
									from.updateGlow(false, '');
							}
						}
					}
					else if (D.mouse.delta().nonZero())
					{
						const from = diagram.getSelected();
						if (D.tool === 'select')
							diagram.updateDragObjects(e);
					}
					D.DeleteSelectRectangle();
					D.mouseover = oldMouseover;
				}
				else
					diagram.updateFusible(e);
				D.toolbar.hide();
			}
//			else if (D.mouseIsDown && !D.drag)
//				D.DrawSelectRect();
//			else if (D.tool === 'pan')
//				D.DeleteSelectRectangle();
			else
				D.DeleteSelectRectangle();
		}
		catch(x)
		{
			D.RecordError(x);
		}
	}
	static Mouseup(e)
	{
		if (e.button === 0)
		{
			D.DeleteSelectRectangle();
			if (!R.diagram)
				return;		// not initialized yet
			D.mouseIsDown = false;
			D.dragClone = false;
			if (e.which === 2)
			{
				D.tool = 'select';
				D.drag = false;
				return;
			}
			try
			{
				const diagram = R.diagram;
				const cat = diagram.codomain;
				const pnt = diagram.mouseDiagramPosition(e);
				if (D.drag)
				{
					D.drag = false;
					if (diagram.selected.length === 1 && D.mouseover)
					{
						const from = diagram.getSelected();
						const target = from.name === D.mouseover.name ? null : D.mouseover;	// do not target yourself
						if (target)
						{
							if (diagram.isIsolated(from) && diagram.isIsolated(target))
							{
								const ary = [target, from];
								const actions = diagram.codomain.actions;
								let a = actions.has('product') ? actions.get('product') : null;
								if (e.shiftKey && actions.has('coproduct'))
									a = actions.get('coproduct');
								if (e.altKey && actions.has('hom'))
									a = actions.get('hom');
								if (a && a.hasForm(diagram, ary))
								{
									diagram.drop(e, a, from, target);
									diagram.deselectAll(e);
								}
							}
							else if (from instanceof DiagramObject && target instanceof DiagramObject)
							{
								if(from.isFusible(target))
								{
									const domains = [];
									from.domains.forEach(m => domains.push(m.name));
									const codomains = [];
									from.codomains.forEach(m => m.domain !== m.codomain && codomains.push(m.name));
									diagram.fuse(e, from, target);
									diagram.log({command:'fuse', from:from.name, target:target.name});
									diagram.antilog({command:'fuse', to:from.to, xy:{x:from.orig.x, y:from.orig.y}, domains, codomains, target});
									R.EmitDiagramEvent(diagram, 'makeCells');
								}
							}
						}
						if (!(from instanceof DiagramText))
							from.updateGlow(false, '');
					}
					const elts = new Map();
					const orig = new Map();
					const movables = new Set();
					diagram.selected.map(e =>
					{
						if (e instanceof Assertion)
							return;
						if (e instanceof DiagramMorphism)
						{
							elts.set(e.domain.name, e.domain.getXY());
							elts.set(e.codomain.name, e.codomain.getXY());
							!orig.has(e.domain) && orig.set(e.domain, e.domain.orig);
							!orig.has(e.codomain) && orig.set(e.codomain, e.codomain.orig);
							movables.add(e.domain);
							movables.add(e.codomain);
						}
						else
						{
							!orig.has(e) && orig.set(e, {x:e.orig.x, y:e.orig.y});
							elts.set(e.name, e.getXY());
							movables.add(e);
						}
						e.finishMove();
					});
					const elements = [...elts];
					const originals = [...orig];
					if (elements.length > 0)
					{
						diagram.log({command: 'move', elements});
						diagram.antilog({command: 'move', elements:originals});
						movables.forEach(elt => R.EmitElementEvent(diagram, 'move', elt));
						R.EmitDiagramEvent(diagram, 'move', '');
					}
				}
//				else if (!D.mouseover)
//					diagram.areaSelect(e);
			}
			catch(x)
			{
				D.RecordError(x);
			}
			D.drag = false;
		}
		else if (e.button === 1)
			D.keyboardUp.Space(e);
	}
	static Drop(e)	// from panel dragging
	{
		const diagram = R.diagram;
		if (!diagram.isEditable())
		{
			D.statusbar.show(e, 'Diagram is not editable');
			return;
		}
		try
		{
			e.preventDefault();
			D.drag = false;
			const xy = diagram.mouseDiagramPosition(e);
			const name = e.dataTransfer.getData('text');
			if (name.length === 0)
				return;
			let elt = diagram.getElement(name);
			if (!elt)
				R.DownloadDiagram(name, e => R.AddReference(e, name));
			else
			{
				let from = null;
				if (elt instanceof CatObject)
				{
					from = diagram.placeObject(e, elt, xy);
					diagram.log({command:'copy', source:elt.name, xy});
				}
				else if (elt instanceof Morphism)
				{
					from = diagram.placeMorphism(e, elt, xy, null, true, false);
					diagram.log({command:'copy', source:elt.name, xy:from.domain.getXY(), xyCod:from.codomain.getXY()});
				}
				from && diagram.antilog({command:'delete', elements:[from.name]});
			}
		}
		catch(err)
		{
			D.RecordError(err);
		}
	}
	static getIcon(name, buttonName, onclick, title, scale = D.default.button.small, id = null, aniId = null, repeatCount = "1")
	{
		const inches = 0.32 * scale;
		return H3.span('.button', H3.svg(	{viewbox:"0 0 320 320", width:`${inches}in`, height:`${inches}in`},
											H3.rect('.icon', {x:"0", y:"0", width:"32", height:"32", onclick}),
											H3.use({href:`#icon-${buttonName}`}),
											H3.rect('.btn', {x:"0", y:"0", width:"32", height:"32", onclick})), {title, id});
	}
	static DownloadButton(txt, onclick, title, scale = D.default.button.small)
	{
		const btn = D.getIcon(txt, 'download', onclick, title, scale);
		btn.querySelector('svg').appendChild(H3.text({'text-anchor':'middle', x:12, y:18, style:'font-size:8px;stroke:#000;'}, txt));
		return btn;
	}
	static setCursor()
	{
		switch(D.tool)
		{
		case 'select':
			D.topSVG.style.cursor = 'default';
			break;
		case 'pan':
			D.topSVG.style.cursor = 'all-scroll';
			break;
		}
	}
	static elementId()
	{
		return `elt_${D.id++}`;
	}
	static Zoom(e, scalar)
	{
		scalar = 2 * scalar;
		const diagram = R.diagram;
		const vp = diagram.getViewport();
		const upScale = vp.scale;
		let inc = Math.log(upScale)/Math.log(D.default.scale.base) + scalar;
		let scale = D.default.scale.base ** inc;
		scale = scale < D.default.scale.limit.min ? D.default.scale.limit.min : scale;
		scale = scale > D.default.scale.limit.max ? D.default.scale.limit.max : scale;
		const pnt = D.mouse.clientPosition();
		const x = pnt.x - (scale / upScale) * (pnt.x - vp.x);
		const y = pnt.y - (scale / upScale) * (pnt.y - vp.y);
		diagram.setViewport({x, y, scale});
	}
	static getKeyName(e)
	{
		let name = e.ctrlKey && e.key !== 'Control' ? 'Control' : '';
		name += e.shiftKey && e.key !== 'Shift' ? 'Shift' : '';
		name += e.altKey && e.key !== 'Alt' ? 'Alt' : '';
		name += e.code;
		return name;
	}
	static jsHtmlLoader(e)
	{
		const args = e.detail;
		const diagram = args.diagram;
		if (args.command === 'load' && diagram.name === 'hdole/HTML')
		{
			R.Actions.javascript.loadHTML();
			window.removeEventListener('CAT', D.jsHtmlLoader);
		}
	}
	static AddEventListeners()
	{
		window.addEventListener('Assertion', function(e)
		{
			if (!R.sync)
				return;
			const args = e.detail;
			switch(args.command)
			{
				case 'delete':
					R.diagram.makeCells();
					D.Autosave(args.diagram);
					break;
				case 'new':
				case 'update':
					D.Autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('Morphism', function(e)
		{
			if (!R.sync)
				return;
			const args = e.detail;
			switch(args.command)
			{
				case 'delete':
					D.Autosave(args.diagram);
					break;
				case 'detach':
				case 'new':
					isGUI && args.diagram.updateBackground();
					D.Autosave(args.diagram);
					break;
				case 'update':
					args.element.update();
					R.diagram.domain.updateCells(args.element);
					isGUI && args.diagram.updateBackground();
					D.Autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('Object', function(e)
		{
			if (!R.sync)
				return;
			const args = e.detail;
			const diagram = args.diagram;
			if (!diagram || diagram !== R.diagram)
				return;
			switch(args.command)
			{
				case 'fuse':
					D.Autosave(args.diagram);
					break;
				case 'delete':
				case 'new':
				case 'update':
				case 'move':
					isGUI && args.diagram.updateBackground();
					D.Autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('Text', function(e)
		{
			if (!R.sync)
				return;
			const args = e.detail;
			switch(args.command)
			{
				case 'delete':
				case 'new':
				case 'update':
				case 'move':
					isGUI && args.diagram.updateBackground();
					D.Autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('Diagram', function(e)
		{
			if (!R.sync)
				return;
			const args = e.detail;
			const diagram = args.diagram;
			if (diagram)
				switch(args.command)
				{
					case 'addReference':
					case 'removeReference':
						R.LoadDiagramEquivalences(diagram);
						diagram.makeCells();
						D.Autosave(args.diagram);
						break;
					case 'update':
						D.Autosave(args.diagram);
						break;
					case 'makeCells':
						diagram.makeCells();
						break;
				}
			D.Autohide(e);
		});
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'load':
					R.LoadDiagramEquivalences(diagram);
					diagram.makeCells();
					break;
				case 'default':
					if (isGUI)
					{
						if (diagram)
						{
							D.session.default = diagram.name;
							if (!diagram.svgRoot)
								diagram.makeSVG();
							D.diagramSVG.appendChild(diagram.svgRoot);
							const viewport = diagram.getViewport();
							viewport.visible = true;
							diagram.setViewport(viewport);
							D.GlowBadObjects(diagram);
							diagram.svgTranslate.classList.add('trans025s');
						}
						else
							D.session.default = null;
						D.saveSession();
					}
					if (diagram)
					{
						R.LoadDiagramEquivalences(diagram);
						diagram.makeCells();
//						if (R.initialized)
//						{
//							R.default.diagram = diagram.name;
//							R.SaveDefaults();
//						}
						isGUI && R.EmitViewEvent('diagram', diagram);
					}
					break;
				case 'download':
					R.SaveLocal(diagram);
					break;
			}
		});
		window.addEventListener('Login', e =>
		{
//			if (D.session.mode === 'diagram' && R.params.has('diagram'))
			if (D.session.mode === 'diagram')
				R.SelectDiagram(R.params.get('diagram'));
			if (R.user.status !== 'logged-in')
				return;
			R.authFetch(R.getURL('userInfo'), {}).then(res => res.json()).then(json =>
			{
				R.user.cloud = json;
				R.user.cloud.permissions = R.user.cloud.permissions.split(' ');
			});
		});
		window.onresize = D.Resize;
		window.addEventListener('mousemove', D.Autohide);
		window.addEventListener('mousedown', D.Autohide);
		window.addEventListener('keydown', D.Autohide);
		window.addEventListener('CAT', e =>
		{
			D.jsHtmlLoader(e);
		});
		window.addEventListener('Assertion', D.UpdateDisplay);
		window.addEventListener('Morphism', D.UpdateMorphismDisplay);
		window.addEventListener('Object', D.UpdateObjectDisplay);
		window.addEventListener('Text', D.UpdateTextDisplay);
//		D.topSVG.onmousemove = D.Mousemove;
		D.topSVG.addEventListener('mousemove', D.Mousemove);
		D.topSVG.addEventListener('mousedown', D.Mousedown, true);
		D.topSVG.addEventListener('mouseup', D.Mouseup, true);
		D.topSVG.addEventListener('drop', D.Drop, true);
		document.addEventListener('mousemove', function(e)
		{
			if (D.statusbar.element.style.display === 'block' && D2.Dist(D.statusbar.xy, {x:e.clientX, y:e.clientY}) > 50)
				D.statusbar.hide();
		});
		document.ondragover = e => e.preventDefault();
		document.addEventListener('drop', e => e.preventDefault(), true);
		document.body.onkeydown = e =>
		{
			const name = D.getKeyName(e);
			name in D.keyboardDown && D.keyboardDown[name](e);
		};
		document.body.onkeyup = e =>
		{
			D.setCursor();
			const name = D.getKeyName(e);
			name in D.keyboardUp && D.keyboardUp[name](e);
		};
		document.onwheel = e =>
		{
			if (!R.diagram)
				return;
			if (e.target.id === R.diagram.elementId('background') || e.target.dataset.type === 'object' || e.target.dataset.type === 'morphism' || e.target.constructor.name === 'SVGTextElement')
			{
				D.toolbar.hide();
				R.diagram.svgTranslate.classList.remove('trans025s');
				D.Zoom(e, Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY))));
				R.diagram.svgTranslate.classList.add('trans025s');
			}
		};
		window.addEventListener('View', e =>
		{
			const args = e.detail;
			const command = args.command;
			const diagram = args.diagram;
			if (command === 'diagram')
			{
				D.forEachDiagramSVG(diagram => diagram.updateBackground());
				if (diagram)
				{
					if (diagram.user === 'sys')
						diagram.autoplace();
					diagram.show();
//					diagram.savePng();
					diagram.show();
					D.diagramSVG.appendChild(diagram.svgRoot);
				}
			}
		});
	}
	static textWidth(txt, cls = 'object')
	{
		if (isGUI)
		{
			const safeTxt = U.HtmlEntitySafe(txt);
			if (D.textSize.has(safeTxt))
				return D.textSize.get(safeTxt);
			let text = H3.text({class:cls, x:"0", y:"0", 'text-anchor':'middle'}, safeTxt);
			D.uiSVG.appendChild(text);
			const width = text.getBBox().width;
			D.uiSVG.removeChild(text);
			D.textSize.set(safeTxt, width);
			return width;
		}
		return 10;
	}
	static Grid(x)
	{
		const grid = (event && event.shiftKey && !event.ctrlKey) ? D.default.majorGridMult * D.default.layoutGrid : D.default.layoutGrid;
		switch (typeof x)
		{
		case 'number':
			return D.gridding ? grid * Math.round(x / grid) : x;
		case 'object':
			return new D2(D.Grid(x.x), D.Grid(x.y));
		}
	}
	static limit(s)
	{
		return s.length > D.textDisplayLimit ? s.slice(0, D.textDisplayLimit) + '...' : s;
	}
	static RecordError(err)
	{
		const errTxt = U.GetError(err);
		const elements = [H3.br(), H3.span(errTxt)];
		if (isGUI)
		{
			if (R.default.debug)
				debugger;
			console.trace(errTxt);
			if (typeof err === 'object' && 'stack' in err && err.stack !== '')
				elements.push(H3.br(), H3.small('Stack Trace'), H3.pre(err.stack));
			elements.map(elt => D.ttyPanel.error.appendChild(elt));
			D.ttyPanel.open();
			Panel.SectionOpen('tty-error-section');
		}
		else
		{
			console.trace(err);
			throw err;
		}
	}
	static UpdateMorphismDisplay(e)		// event handler
	{
		D.UpdateDisplay(e);
		const args = e.detail;
		const {command, diagram, dual, element, old} = args;
		const {domain, codomain} = element;
		switch(command)
		{
			case 'new':
				if (element instanceof DiagramMorphism)
					element.update();
				break;
		}
	}
	static UpdateObjectDisplay(e)		// event handler
	{
		const args = e.detail;
		const diagram = args.diagram;
		if (!diagram)
			return;
		const element = args.element;
		switch(args.command)
		{
			case 'fuse':	// scan all 1-connected objects to refresh
				const homObjs = new Set();
				function addCod(m) { homObjs.add(m.codomain); }
				function addDom(m) { homObjs.add(m.domain); }
				element.domains.forEach(addCod);
				element.codomains.forEach(addDom);
				if ('target' in args)
				{
					const target = args.target;
					homObjs.clear();
					target.domains.forEach(addCod);
					target.codomains.forEach(addDom);
				}
				break;
			case 'move':
				element.finishMove();
				if (element instanceof DiagramObject)
					element.update();
				break;
			case 'update':
			case 'new':
				if (element instanceof DiagramObject)
					element.update();
				break;
		}
		D.UpdateDisplay(e);
	}
	static UpdateTextDisplay(e)		// event handler
	{
		D.UpdateDisplay(e);
		const args = e.detail;
		const {diagram, element} = args;
		if (!diagram)
			return;
		switch(args.command)
		{
			case 'move':
				element.finishMove();
				element.update();
				break;
			case 'update':
			case 'new':
				element.update();
				break;
		}
	}
	static copyStyles(dest, src)
	{
		for (var cd = 0; cd < dest.childNodes.length; cd++)
		{
			var dstChild = dest.childNodes[cd];
			if (D.svgContainers.includes(dstChild.tagName))
			{
				D.copyStyles(dstChild, src.childNodes[cd]);
				continue;
			}
			const srcChild = src.childNodes[cd];
			if ('data' in srcChild)
				continue;
			var srcStyle = window.getComputedStyle(srcChild);
			if (srcStyle === "undefined" || srcStyle === null)
				continue;
			let style = '';
			if (dstChild.tagName in D.svgStyles)
			{
				const styles = D.svgStyles[dstChild.tagName];
				for (let i = 0; i<styles.length; i++)
					style += `${D.svgStyles[dstChild.tagName][i]}:${srcStyle.getPropertyValue(styles[i])};`;
			}
			dstChild.setAttribute('style', style);
		}
	}
	static Svg2canvas(diagram, fn)
	{
		if (!diagram.svgRoot)
			return;
		const svg = diagram.svgRoot;
		const copy = svg.cloneNode(true);
		const top = H3.svg();
		top.appendChild(copy);
		D.copyStyles(copy, svg);
		const bkgnd = copy.querySelector(`#${diagram.elementId('background')}`);
		bkgnd.parentNode.removeChild(bkgnd);
		const width = D.snapshotWidth;
		const height = D.snapshotHeight;
		const sRat = height / width;
		const vRat = window.innerHeight / window.innerWidth;
		const wRat = window.innerWidth / width;
		const hRat = window.innerHeight / height;
		const rat = hRat < wRat ? wRat : hRat;
		copy.setAttribute('transform', `scale(${1/rat})`);
		const topData = (new XMLSerializer()).serializeToString(top);
		const svgBlob = new Blob([topData], {type: "image/svg+xml;charset=utf-8"});
		const url = D.url.createObjectURL(svgBlob);
		const img = new Image(width, height);
		img.onload = function()
		{
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, width, height);
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, width, height);
			ctx.drawImage(img, 0, 0);
			D.url.revokeObjectURL(url);
			if (fn)
			{
				const cargo = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
				fn(cargo, `${diagram.name}.png`);
			}
		};
		img.crossOrigin = "";
		img.src = url;
	}
	static OnEnter(e, fn, that = null)
	{
		if (e.key === 'Enter')
			that ? fn.call(that, e) : fn(e);
		e.stopPropagation();
	}
	static Width()
	{
		return isGUI ? window.innerWidth : 1024;
	}
	static Height()
	{
		return isGUI ? window.innerHeight : 768;
	}
	static GetObjects(ary)
	{
		const elts = new Set();
		for(let i=0; i < ary.length; ++i)
		{
			const elt = ary[i];
			if ((elt instanceof DiagramObject || elt instanceof DiagramText) && !(elt.name in elts))
				elts.add(elt);
			else if (elt instanceof DiagramMorphism)
			{
				if (elt.bezier)
					elts.add(D.Barycenter([elt.bezier.cp1, elt.bezier.cp2]));
				else
				{
					elts.add(elt.domain);
					elts.add(elt.codomain);
				}
			}
			else if (elt instanceof D2)
				elts.add(elt);
		}
		return elts;
	}
	static Barycenter(ary)
	{
		const elts = D.GetObjects(ary);
		const xy = new D2();
		elts.forEach(pnt => xy.increment(pnt));
		return xy.scale(1.0/elts.size);
	}
	static BaryHull(ary)
	{
		return D.Barycenter(D2.Hull([...D.GetObjects(ary)]));
	}
	static testAndFireAction(e, name, ary)
	{
		const diagram = R.diagram;
		const a = diagram.codomain.getElement(name);
		a && a.hasForm(diagram, ary) && a.action(e, diagram);
	}
	static HtmlRow3(m, handler)
	{
		return H3.tr([	H3.td(m.properName),
						H3.td(m.domain.properName),
						H3.td('&rarr;'),
						H3.td(m.codomain.properName)], '.sidenavRow', {title:U.HtmlSafe(U.Formal(m.description)), 'data-name':m.name}, handler);
	}
	static Center(diagram)
	{
		return D.Grid(diagram.userToDiagramCoords({x:D.Grid(D.Width()/2), y:D.Grid(D.Height()/2)}));
	}
	static DragElement(e, name)
	{
		D.toolbar.hide();
		e.dataTransfer.setData('text/plain', name);
	}
	static Download(href, filename)
	{
		var evt = new MouseEvent("click",
		{
			view: window,
			bubbles: false,
			cancelable: true
		});
		const a = document.createElement('a');
		a.setAttribute("download", filename);
		a.setAttribute("href", href);
		a.setAttribute("target", '_blank');
		a.dispatchEvent(evt);
	}
	static DownloadString(string, type, filename)
	{
		const blob = new Blob([string], {type:`application/${type}`});
		D.Download(D.url.createObjectURL(blob), filename);
	}
	static ShowInput(name, id, factor)
	{
		const o = R.diagram.getElement(name);
		const sel = document.getElementById(id);
		const ndx = Number.parseInt(sel.value);
		const f = Array.isArray(factor) ? [...factor, ndx] : [factor, ndx];
		const divId = `dv_${o.objects[ndx].name} ${f.toString()}`;
		const elt = document.getElementById(divId);
		if (elt)
		{
			for (let i=0; i<elt.parentNode.children.length; ++i)
				elt.parentNode.children[i].classList.add('nodisplay');
			elt.classList.remove('nodisplay');
		}
	}
	static Mouseover(e, from, on)
	{
		from.diagram.emphasis(from.name, on);
		let msg = '';
		if (on && !(from instanceof DiagramText))
		{
			msg = from.to.description;
			if (R.default.debug && 'assyGraph' in from)
				msg = msg + `  <br>Has info: ${from.assyGraph.hasTag('info')}`;
			D.statusbar.show(e, msg);
		}
		else
			clearInterval(D.statusbar.timerIn);
	}
	static Paste(e)
	{
		if (!D.copyDiagram)
			return;
		const diagram = R.diagram;
		const mouse = D.mouse.diagramPosition(diagram);
		const refs = diagram.getAllReferenceDiagrams();
		if (!refs.has(D.copyDiagram.name) && diagram !== D.copyDiagram)
		{
			D.statusbar.show(e, `Diagram ${D.copyDiagram.properName} is not referenced by this diagram`);
			return;
		}
		const copies = D.DoPaste(e, mouse, D.pasteBuffer);
		diagram.deselectAll(e);
		copies.map(e => diagram.addSelected(e));
		diagram.log({command:'paste', elements:D.pasteBuffer.map(e => e.name), xy:{x:mouse.x, y:mouse.y}});
		diagram.antilog({command:'delete', elements:copies.map(e => e.name)});
	}
	static DoPaste(e, xy, elements, save = true)
	{
		const diagram = R.diagram;
		const base = D.Barycenter(elements);
		const pasteMap = new Map();
		const txy = xy;
		const pasteObject = function(o)
		{
			if (!pasteMap.has(o))
			{
				const oxy = D.Grid(D2.Add(txy, D2.Subtract(o.getXY(), base)));
				const copy = diagram.placeObject(e, o.to, oxy, false);
				pasteMap.set(o, copy);
				return copy;
			}
			return pasteMap.get(o);
		};
		const pasteElement = function(elt)
		{
			let copy = null;
			switch(elt.constructor.name)
			{
				case 'Assertion':
					break;
				case 'DiagramComposite':
				case 'DiagramMorphism':
					const domain = pasteObject(elt.domain);
					const codomain = pasteObject(elt.codomain);
					const {to, flipName} = elt;
					copy = new DiagramMorphism(diagram, {domain, codomain, to, flipName});
					break;
				case 'DiagramObject':
				case 'DiagramPullback':
					copy = pasteObject(elt);
					copy.update();
					break;
				case 'DiagramText':
					const txy = D2.Add(xy, D2.Subtract(elt.getXY(), base));
					copy = new DiagramText(diagram, {xy:txy, description:elt.description});
					break;
			}
			return copy;
		};
		const copies = elements.map(e => pasteElement(e));
		return copies;
	}
	static SetClass(cls, on, ...elts)
	{
		if (on)
			elts.map((e, i) => e.classList.add(cls));
		else
			elts.map((e, i) => e.classList.remove(cls));
	}
	static del(elt) {elt.parentElement.removeChild(elt);}
	static RemoveChildren(elt)
	{
		while(elt.firstChild)
			elt.removeChild(elt.firstChild);
	}
	static Pretty(obj, elt, indent = 0)
	{
		const tab = '&nbsp;&nbsp;';
		Object.keys(obj).forEach(function(i)
		{
			const d = obj[i];
			if (typeof d === 'object')
			{
				elt.appendChild(H3.p(`${tab.repeat(indent)}${i}:`));
				return D.Pretty(d, elt, indent + 1);
			}
			const prefix = tab.repeat(indent);
			elt.appendChild(H3.p(`${prefix}${U.DeCamel(i)}: ${d}`));
		});
	}
	static ArrowDirection()
	{
		const a = D.default.arrow;
		return new D2(a.length * a.dir.x, a.length * a.dir.y);
	}
	static GlowBadObjects(diagram)
	{
		const objects = [];
		diagram.domain.forEachObject(function(o, k)
		{
			if (o.svg)
			{
				o.svg.classList.remove('badGlow');
				const bx = o.svg.getBBox();
				objects.push(bx);
				for (let i=0; i<objects.length -1; ++i)
					if (D2.Overlap(objects[i], bx))
						o.svg.classList.add('badGlow');
			}
		});
	}
	static GetArc(cx, cy, r, startAngle, endAngle)
	{
		const start = D2.Polar(cx, cy, r, startAngle);
		const end = D2.Polar(cx, cy, r, endAngle);
		const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
	}
	static GetPng(name)
	{
		let png = D.diagramPNGs.get(name);
		if (!png)
		{
			png = U.readfile(`${name}.png`);
			if (png)
				D.diagramPNGs.set(name, png);
		}
		return png;
	}
	static GetImageElement(name, args = {})
	{
		const nuArgs = U.Clone(args);
		nuArgs.src = D.GetPng(name);
		nuArgs.id = U.SafeId(`img-el_${name}`);
		if (!nuArgs.src && R.cloud)
			nuArgs.src = R.getDiagramURL(name + '.png');
		if (!('width' in nuArgs))
			nuArgs.width = 200;
		if (!('height' in nuArgs))
			nuArgs.height = 150;
		if (!('alt' in nuArgs))
			nuArgs.alt = 'Image not available';
		return H3.img('.imageBackground', nuArgs);
	}
	static GetSvgImageElement3(name)
	{
		const href = R.getDiagramURL(name + '.png');
		const imgId = U.SafeId(`image-el_${name}`);
		return H3.image({href, id:imgId, alt:"Not loaded", width:"300", height:"225"});
	}
	static PlaceComposite(e, diagram, comp)
	{
		const morphisms = comp instanceof Composite ? comp.morphisms : [comp];
		const objects = [morphisms[0].domain];
		const composite = [];
		function compScan(m)
		{
			if (m instanceof Composite)
				m.morphisms.map(sm => compScan(sm));
			else
			{
				objects.push(m.codomain);
				composite.push(m);
			}
		}
		morphisms.map(m => compScan(m));
		const bbox = diagram.svgBase.getBBox();
		const stdGrid = D.default.majorGridMult * D.default.layoutGrid;
		const xy = new D2({x:bbox.x + bbox.width + stdGrid, y:bbox.y}).grid(stdGrid);
		const indexObjects = objects.map((o, i) =>
		{
			const ndxObj = diagram.placeObject(e, o, xy, false);
			if (i !== objects.length -2)
				xy.y += stdGrid;
			else
				xy.x += stdGrid;
			return ndxObj;
		});
		composite.map((m, i) => diagram.placeMorphism(e, m, indexObjects[i], indexObjects[i+1]));
		diagram.placeMorphism(e, diagram.comp(...morphisms), indexObjects[0], indexObjects[indexObjects.length -1]);
	}
	static GetArrowLength(m)
	{
		const stdGrid = Cat.D.default.majorGridMult * Cat.D.default.layoutGrid;
		let delta = stdGrid;
		const tw = m.textwidth();
		while (delta < tw)
			delta += stdGrid;
		return delta;
	}
	static SetupReplay()
	{
		const replayDrop =
		{
			replay(e, diagram, args)
			{
				const from = diagram.getElement(args.from);
				const target = diagram.getElement(args.target);
				const action = R.Actions[args.action];
				diagram.drop(e, action, from, target);
			}
		};
		D.ReplayCommands.set('drop', replayDrop);
		const replayMove =
		{
			replay(e, diagram, args)
			{
				const elements = args.elements;
				for (let i=0; i<elements.length; ++i)
				{
					const elt = diagram.getElement(elements[i][0]);
					if (elt)
					{
						const xy = elements[i][1];
						elt.setXY(xy);
						R.EmitElementEvent(diagram, 'move', elt);
					}
				}
				R.EmitDiagramEvent(diagram, 'move');
			},
		};
		D.ReplayCommands.set('move', replayMove);
		const replayFuse =
		{
			replay(e, diagram, args)
			{
				const target = diagram.getElement(args.target);
				if ('from' in args)
				{
					const from = diagram.getElement(args.from);
					diagram.fuse(e, from, target, false);
				}
				else	// undo
				{
					const domains = diagram.getElements(args.domains);
					const codomains = diagram.getElements(args.codomains);
					const from = diagram.placeObject(e, args.to, args.xy, false);
					const morphs = new Set();
					domains.map(m => {m.setDomain(from); morphs.add(m);});
					codomains.map(m => {m.setCodomain(from); morphs.add(m);});
					const elements = [...diagram.domain.elements.values()];
					elements.pop();		// remove 'from' from end of stack
					let minNdx = Number.MAX_VALUE;
					morphs.forEach(function(m) { minNdx = Math.min(minNdx, elements.indexOf(m)); });
					elements.splice(minNdx, 0, from);	// put from to be before the morphisms
					diagram.domain.replaceElements(elements);
					R.EmitObjectEvent(diagram, 'fuse', from, {target});
					R.EmitDiagramEvent(diagram, 'makeCells');
				}
			}
		};
		D.ReplayCommands.set('fuse', replayFuse);
		const replayText =
		{
			replay(e, diagram, args)
			{
				const xy = new D2(args.xy);
				diagram.placeText(e, xy, args.text);
			}
		};
		D.ReplayCommands.set('text', replayText);
		const replayEditText =
		{
			replay(e, diagram, args)
			{
				const t = diagram.getElement(args.name);
				t.editText(e, args.attribute, args.value, false);		// TODO avoid saving
			}
		};
		D.ReplayCommands.set('editText', replayEditText);
		const replayView =
		{
			replay(e, diagram, args)
			{
				diagram.setViewport(args);
			}
		};
		D.ReplayCommands.set('view', replayView);
		const replayPaste =
		{
			replay(e, diagram, args)
			{
				D.DoPaste(e, args.xy, diagram.getElements(args.elements));
			}
		};
		D.ReplayCommands.set('paste', replayPaste);
		const replayAddReference =
		{
			replay(e, diagram, args)
			{
				R.AddReference(e, args.name);		// TODO async
			}
		};
		D.ReplayCommands.set('addReference', replayAddReference);
		const replayRemoveReference =
		{
			replay(e, diagram, args)
			{
				R.RemoveReference(e, args.name);
			}
		};
		D.ReplayCommands.set('removeReference', replayRemoveReference);
	}
	static Busy()
	{
		if (isGUI && !('busyBtn' in R))
		{
			const svg = document.getElementById('topSVG');
			const cx = window.innerWidth/2 - 160;
			const cy = window.innerHeight/2 - 160;
			const btn = H3.g(H3.g(H3.animateTransform({attributeName:"transform", type:"rotate", from:"360 160 160", to:"0 160 160", dur:"1s", repeatCount:'indefinite'}),
									H3.path({class:"svgfilNone svgstr1", d:D.GetArc(160, 160, 100, 45, 360), 'marker-end':'url(#arrowhead)'})), {transform:`translate(${cx}, ${cy})`});
			R.busyBtn = btn;
			svg.appendChild(btn);
		}
	}
	static NotBusy()
	{
		if (isGUI && 'busyBtn' in R)
		{
			R.busyBtn.parentNode.removeChild(R.busyBtn);
			delete R.busyBtn;
		}
	}
	static saveSession()
	{
		D.session.diagrams.length = 0;
		D.forEachDiagramSVG(d => !d.svgRoot.classList.contains('hidden') && D.session.diagrams.push(d.name));
		U.writefile('session.json', JSON.stringify(D.session));
	}
	static readSession()
	{
		const str = U.readfile('session.json');
		if (str)
			D.session = JSON.parse(str);
		else
			D.session = {mode:'catalog', default:null, diagrams:[], viewport:{x:0, y:0, scale:1}};
		D.setViewport(D.session.viewport);
	}
	static forEachDiagramSVG(fn)
	{
		let dgrmSvg = D.diagramSVG.firstChild;
		do
		{
			const dgrm = R.$CAT.getElement(dgrmSvg.dataset.name);
			dgrm && fn(dgrm, dgrmSvg);
		}
		while((dgrmSvg = dgrmSvg.nextSibling));
	}
	static setViewport(viewport)
	{
		D.session.viewport.x = viewport.x;
		D.session.viewport.y = viewport.y;
		D.session.viewport.scale = viewport.scale;
		R.initialized && D.saveSession();
		D.diagramSVG.setAttribute('transform', `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale} ${viewport.scale})`);
	}
	static getScreenPan()
	{
		return Math.min(D.Width(), D.Height()) * D.default.pan.scale;
	}
	static panHandler(e, dir)
	{
		let offset;
		switch(dir)
		{
			case 'up':
				offset = new D2(0, - D.screenPan);
				break;
			case 'down':
				offset = new D2(0, D.screenPan);
				break;
			case 'left':
				offset = new D2(-D.screenPan, 0);
				break;
			case 'right':
				offset = new D2(D.screenPan, 0);
				break;
		}
		if (D.default.fullscreen)
		{
			if(R.diagram)
			{
				const viewport = R.diagram.getViewport();
				R.diagram.setViewport({x:viewport.x + offset.x, y:viewport.y + offset.y, scale:viewport.scale});
			}
			e.preventDefault();
		}
		else	// pan session
		{
			const viewport = D.session.viewport;
			D.setViewport({x:viewport.x + offset.x, y:viewport.y + offset.y, scale:viewport.scale});
		}
	}
	static getViewportByBBox(bbox)
	{
		if (bbox.width === 0)
			bbox.width = D.Width();
		const margin = D.navbar.element.getBoundingClientRect().height;
		const dw = D.Width() - 2 * D.default.panel.width - 2 * margin;
		const dh = D.Height() - 4 * margin;
		const xRatio = bbox.width / dw;
		const yRatio = bbox.height / dh;
		const scale = 1.0/Math.max(xRatio, yRatio);
		let x = - bbox.x * scale + D.default.panel.width + margin;
		let y = - bbox.y * scale + 2 * margin;
		if (xRatio > yRatio)
			y += dh/2 - scale * bbox.height/2;
		else
			x += dw/2 - scale * bbox.width/2;
		return {x:x - D.session.viewport.x, y:y - D.session.viewport.y, scale};
	}
	static userToSvgCoords(xy)
	{
		return new D2(xy).subtract(D.session.viewport).scale(1/D.session.viewport.scale);
//		return new D2(xy).subtract(D.session.viewport).scale(D.session.viewport.scale);
//		return new D2(xy).scale(D.session.viewport.scale).subtract(D.session.viewport);
//		return new D2(xy).scale(1/D.session.viewport.scale).subtract(D.session.viewport);
	}
	static svgToUserCoords(xy)
	{
//		return new D2(xy).add(D.session.viewport).scale(D.session.viewport.scale);
		return new D2(xy).scale(1/D.session.viewport.scale).add(D.session.viewport);
	}
	static checkMouseOverDiagram(e)
	{
//		const xy = new D2(e.clientX, e.clientY).subtract(D.session.viewport).scale(1/D.session.viewport.scale);
		const xy = D.userToSvgCoords({x:e.clientX, y:e.clientY});
		let diagram = null;
		D.forEachDiagramSVG(d =>
		{
			if (!d.svgRoot.classList.contains('hidden'))
			{
				const box = new D2(d.svgRoot.getBBox());
if (d.basename === 'nat/add') console.log({xy, box}, box.x < xy.x, xy.x < box.x + box.width, box.y < xy.y, xy.y < box.y + box.height, box.y, xy.y);
				if (box.pointInside(xy))
					diagram = d;
			}
		});
console.log('*****', diagram !== null);
		return diagram;
	}
}
Object.defineProperties(D,
{
	bracketWidth:	{value: 0,			writable: true},
	catalog:		{value: null,		writable: true},
	category:		{value: null,		writable: true},
	categoryPanel:	{value: null,		writable: true},
	commaWidth:		{value: 0,			writable: true},
	copyDiagram:	{value:	null,		writable: true},
	ctrlKey:		{value: false,		writable: true},
	default:
	{
		value:
		{
			arrow:
			{
				length:	200,
				margin:	16,
				dir:	{x:0, y:1},
			},
			autohideTimer:	10000,	// ms
			autosaveTimer:	2000,	// ms
			button:		{tiny:0.4, small:0.66, large:1.0},
			cell:		{
							unknown:		'&#8799;',
							composite:		'&#8797;',
							assertion:		'&#10609;',
							computed:		'&#10226;',
							named:			'&#8797;',
						},
			diagram:
			{
				imageWidth:		300,
				imageHeight:	225,
				margin:			20,
			},
			font:			{height:24},
			fullscreen:		true,
			fuse:
			{
				fillStyle:	'#3f3a',
				lineDash:	[],
				lineWidth:	2,
				margin:		2,
			},
			layoutGrid:		10,
			majorGridMult:	20,
			margin:			5,
			pan:			{scale:	0.05},
			panel:			{width:	230},
			scale:			{base:1.05, limit:{min:0.05, max:20}},
			scale3D:		1,
			stdOffset:		new D2(50, 50),
			stdArrow:		new D2(200, 0),
			stdArrowDown:	new D2(0, 200),
			statusbar:		{timein: 200, timeout: 4000},	// ms
			toolbar:		{x:15, y:70},
		},
		writable:		false,
	},
	diagramPanel:	{value: null,		writable: true},
	diagramPNGs:	{value: new Map(),	writable: true},
	diagramSVG:		{value: null,		writable: true},
	directions:		{value: [new D2(0, -1), new D2(-1, -1), new D2(-1, 0), new D2(-1, 1), new D2(0, 1), new D2(1, 1), new D2(1, 0), new D2(1, -1)]},
	drag:			{value: false,		writable: true},
	dragClone:		{value: false,		writable: true},
	dragStart:		{value: new D2(),	writable: true},
	gridding:		{value: true,		writable: true},
	helpPanel:		{value: null,		writable: true},
	id:				{value: 0,			writable: true},
	keyboardDown:			// keyup actions
	{
		value:
		{
			Minus(e) { D.Zoom(e, -2);},
			Equal(e) { D.Zoom(e, 2);},
			ControlHome(e)
			{
				D.setViewport({x:0, y:0, scale:1});
			},
			Home(e)
			{
				const diagram = R.diagram;
				if (D.default.fullscreen && diagram)
				{
					diagram.selected.length > 0 ? diagram.viewElements(...diagram.selected) : diagram.home();
				}
				else
				{
					const bbox = new D2();
					D.forEachDiagramSVG(d => !d.svgRoot.classList.contains('hidden') && bbox.merge(d.svgRoot.getBBox()));
					D.setViewport(D.getViewportByBBox(bbox));
				}
				e.preventDefault();
			},
			ArrowUp(e)
			{
				D.panHandler(e, 'up');
				/*
				const diagram = R.diagram;
				if (D.default.fullscreen && R.diagram)
				{
					const viewport = diagram.getViewport();
					diagram.setViewport({x:viewport.x, y:viewport.y + D.screenPan, scale:viewport.scale});
					e.preventDefault();
				}
				*/
			},
			ArrowDown(e)
			{
				D.panHandler(e, 'down');
				/*
				if (D.default.fullscreen && R.diagram)
				{
					const diagram = R.diagram;
					const viewport = diagram.getViewport();
					diagram.setViewport({x:viewport.x, y:viewport.y - D.screenPan, scale:viewport.scale});
					e.preventDefault();
				}
				*/
			},
			ArrowLeft(e)
			{
				D.panHandler(e, 'left');
				/*
				if (D.default.fullscreen && R.diagram)
				{
					const diagram = R.diagram;
					const viewport = diagram.getViewport();
					diagram.setViewport({x:viewport.x + D.screenPan, y:viewport.y, scale:viewport.scale});
					e.preventDefault();
				}
				*/
			},
			ArrowRight(e)
			{
				D.panHandler(e, 'right');
				/*
				if (D.default.fullscreen && R.diagram)
				{
					const diagram = R.diagram;
					const viewport = diagram.getViewport();
					diagram.setViewport({x:viewport.x - D.screenPan, y:viewport.y, scale:viewport.scale});
					e.preventDefault();
				}
				*/
			},
			Slash(e)
			{
				if (e.target instanceof HTMLBodyElement)
				{
					D.toolbar.show(e, false);
					D.toolbar.showSearch();
					e.preventDefault();
				}
			},
			Space(e)
			{
				/*
				R.diagram && R.diagram.svgTranslate.classList.remove('trans025s');
				D.tool = 'pan';
				D.drag = false;
				D.setCursor();
				e.preventDefault();
				*/
			},
			ControlLeft(e) { D.ctrlKey = true; },
			ControlRight(e) { D.ctrlKey = true; },
			ControlKeyA(e)
			{
				R.diagram.selectAll();
				e.preventDefault();
			},
			ControlShiftKeyA(e)
			{
				D.diagramPanel.open();
				D.diagramPanel.assertionSection.open();
				e.preventDefault();
			},
			ControlKeyC(e)
			{
				D.pasteBuffer = R.diagram.selected.slice();
				D.copyDiagram = R.diagram;
				const xy = D.mouse.clientPosition();
				D.statusbar.show({clientX:xy.x, clientY:xy.y}, 'Copied to paste buffer');
			},
			ControlKeyD(e)
			{
				D.diagramPanel.open();
				e.preventDefault();
			},
			ControlKeyF(e)
			{
				D.toolbar.show(e, false);
				D.toolbar.showSearch();
				e.preventDefault();
			},
			ControlKeyG(e)
			{
				Cat.R.diagram.showGraphs();
				e.preventDefault();
			},
			ControlKeyZ(e)
			{
				Cat.R.diagram.undo(e);
				e.preventDefault();
			},
			ControlShiftKeyH(e)
			{
				R.SelectDiagram(`${R.user.name}/Home`);
				e.preventDefault();
			},
			ControlKeyL(e)
			{
				D.ttyPanel.open();
				D.ttyPanel.logSection.open();
				e.preventDefault();
			},
			ControlKeyM(e)
			{
				D.morphismPanel.open();
				e.preventDefault();
			},
			ControlKeyO(e)
			{
				D.objectPanel.open();
				e.preventDefault();
			},
			ControlKeyU(e)
			{
				D.diagramPanel.open();
				e.preventDefault();
			},
			ControlKeyV(e)	{	D.Paste(e);	},
			Digit1(e)
			{
				if (R.diagram && e.target === document.body)
				{
					const diagram = R.diagram;
					const terminal = diagram.get('FiniteObject', {size:1});
					diagram.placeObject(e, terminal, D.mouse.diagramPosition(diagram));
				}
			},
			ControlDigit3(e) { D.threeDPanel.toggle(); },
			Delete(e)
			{
				R.diagram && R.diagram.activate(e, 'delete');
			},
			Escape(e)
			{
				if (D.session.mode === 'catalog' && R.diagram)
				{
					R.EmitViewEvent('diagram', R.diagram);
//					D.forEachDiagramSVG(diagram => R.EmitDiagramEvent(diagram, 'view', 'contain'));
				}
				else if (D.session.mode === 'diagram')
				{
					let isOpen = false;
					Object.values(D.panels.panels).forEach(pnl => isOpen = isOpen || (pnl.elt.style.width != '0px' && pnl.elt.style.width !== ''));
					if (isOpen)
					{
						D.panels.closeAll();
						return;
					}
					if (!D.toolbar.element.classList.contains('hidden'))
					{
						D.toolbar.hide();
						return;
					}
					if (R.diagram)
					{
						D.default.fullscreen = !D.default.fullscreen;
						R.SaveDefaults();
						R.EmitViewEvent('diagram', R.diagram);
					}
				}
				D.DeleteSelectRectangle();
				// TODO abort drag element
			},
			ControlKeyT(e)
			{
				const diagram = R.diagram;
				diagram.deselectAll(e);
				const text = 'Lorem ipsum cateconium';
				const xy = D.Grid(D.mouse.diagramPosition(diagram));
				const t = diagram.placeText(e, xy, text);
				diagram.log({command:'text', xy:xy.getXY(), text});
				diagram.antilog({command:'delete', elements:[t.name]});
			},
			ShiftLeft(e) { D.shiftKey = true; },
			ShiftRight(e) { D.shiftKey = true; },
		},
		writable:	true,
	},
	keyboardUp:
	{
		value:
		{
			ControlLeft(e)
			{
				D.ctrlKey = false;
			},
			ControlRight(e)
			{
				D.ctrlKey = false;
			},
			ShiftLeft(e)
			{
				D.shiftKey = false;
			},
			ShiftRight(e)
			{
				D.shiftKey = false;
			},
			Space(e)
			{
				/*
				R.diagram && R.diagram.svgTranslate.classList.add('trans025s');
				D.tool = 'select';
				D.setCursor();
				*/
			},
		},
		writable:	true,
	},
	lastViewedDiagrams:	{value: new Map(),	writable: true},
	loginPanel:			{value: null,		writable: true},
	markers:
	{
		value:
		{
			arrow:		isGUI ? H3.marker('##arrowhead',
							{viewBox:"6 12 60 90", refX:"50", refY:"50", markerUnits:"strokeWidth", markerWidth:"6", markerHeight:"5", orient:"auto"}, H3.path('.svgstr3', {d:"M10 20 L60 50 L10 80"})) : null,
			arrowRev:	isGUI ? H3.marker('##arrowheadRev',
							{viewBox:"6 12 60 90", refX:"15", refY:"50", markerUnits:"strokeWidth", markerWidth:"6", markerHeight:"5", orient:"auto"}, H3.path('.svgstr3', {d:"M60 20 L10 50 L60 80"})) : null,
		},
		writeable:	false,
	},
	morphismPanel:	{value: null,		writable: true},
	mouse:
	{
		value:
		{
			down:		new D2(isGUI ? window.innerWidth/2 : 500, isGUI ? window.innerHeight/2 : 500),
			onPanel:	false,
			xy:			[new D2()],
			clientPosition()
			{
				return this.xy[this.xy.length -1];
			},
			diagramPosition(diagram)
			{
				return diagram.userToDiagramCoords(D.mouse.clientPosition());
			},
			saveClientPosition(e)
			{
				const xy = this.xy;
				const clientY = e.clientY - D.topSVG.parentElement.offsetTop;
				if (xy.length > 0 && xy[xy.length -1].x === e.clientX && xy[xy.length -1].y === clientY)
					return;
				xy.push(new D2(e.clientX - D.session.viewport.x, clientY - D.session.viewport.y));
				if (xy.length > 2)
					xy.shift();
			},
			delta()
			{
				return this.xy.length > 1 ? this.xy[1].subtract(this.xy[0]) : new D2();
			},
		},
		writable: true,
	},
	mouseIsDown:{value: false,		writable: true},	// is the mouse key down? the onmousedown attr is not connected to mousedown or mouseup
	mouseover:		{value: null,		writable: true},
	navbar:			{value: null,		writable: true},
	elementTool:	{value: null,		writable: true},
	objectPanel:	{value: null,		writable: true},
	openPanels:		{value: [],			writable: true},
	Panel:			{value: null,		writable: true},
	panels:			{value: null,		writable: true},
	pasteBuffer:	{value: [],			writable: true},
	ReplayCommands:	{value:	new Map(),	writable:false},
	screenPan:		{value: 0,			writable: true},
	settingsPanel:	{value: null,		writable: true},
	shiftKey:		{value: false,		writable: true},
	showUploadArea:	{value: false,		writable: true},
	snapshotWidth:	{value: 1024,		writable: true},
	snapshotHeight:	{value: 768,		writable: true},
	statusbar:		{value: isGUI ? new StatusBar(): null,	writable: false},
	svgContainers:	{value: ['svg', 'g'],	writable: false},
	svgStyles:	
	{
		value:
		{
			path:	['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
			text:	['fill', 'font', 'margin', 'stroke'],
		},
		writable:	false,
	},
	textDisplayLimit:	{value: 60,			writable: true},
	textPanel:		{value: null,		writable: true},
	textSize:		{value:	new Map(),	writable: false},
	threeDPanel:	{value: null,		writable: true},
	tool:			{value: 'select',	writable: true},
	toolbar:		{value: isGUI ? new Toolbar() : null,							writable: false},
	topSVG:			{value: isGUI ? document.getElementById('topSVG') : null,		writable: false},
	ttyPanel:		{value: null,													writable: true},
	uiSVG:			{value: isGUI ? document.getElementById('uiSVG') : null,		writable: false},
	viewports:		{value: new Map(),												writable: false},
	session:		{value: null,													writable: true},
	xmlns:			{value: 'http://www.w3.org/2000/svg',							writable: false},
});

class Catalog
{
	constructor()
	{
		this.catalog = document.getElementById('catalog');
		this.modeTool = H3.td('.left', {width:'33%'});
		this.closeBtn = H3.td('.right', {width:'33%'});
		this.title = H3.h1('.catalog.center');
		this.catalog.appendChild(H3.table(H3.tr(this.modeTool, H3.td(this.title, {width:'33%'}), this.closeBtn), '##modeToolbar'));
		this.searchInput = H3.input('##catalog-search.in100', {title:'Search for a diagram by name', placeholder:'Diagram name contains...', onkeydown:e => Cat.D.OnEnter(e, _ => this.doLookup())});
		this.searchBtn = D.getIcon('search-btn', 'search', _ => this.doLookup(), 'Search for diagrams');
		this.searchBtn.onkeydown = Cat.D.OnEnter(event, e => D.catalog.search());
		const tools = [this.searchInput, this.searchBtn];
		this.catalog.appendChild(H3.div('.center', H3.span('.shadow', tools)));		// show the toolbar
		this.view = 'search';
		this.catalogInfo = H3.div('##catalog-info');		// info about the state of the displayed items
		this.catalog.appendChild(this.catalogInfo);
		this.catalogDisplay = H3.div('##catalog-display.catalog');		// the actual catalog display
		this.catalog.appendChild(this.catalogDisplay);
		this.imageWidth = D.default.diagram.imageWidth;					// size of the png's shown in the catalog
		this.imageHeight = D.default.diagram.imageHeight;
		this.diagrams = null;
		this.glowMap = new Map();
		window.addEventListener('Login', e => D.catalog.update());
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'delete':
					const img = Cat.D.catalog.catalog.querySelector(`[data-name="${args.name}"]`);
					if (img)
						img.parentNode.removeChild(img);
				break;
				case 'upload':
					if (this.view === 'search')
					{
						const img = this.catalogDisplay.querySelector(`img[data-name="${args.command}"]`);
						img && ['greenGlow', 'warningGlow'].map(glow => img.classList.remove(glow));
					}
					break;
				case 'default':
					if (this.view === 'reference')
						this.reference();
					break;
			}
		});
		window.addEventListener('View', e =>
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'diagram':
					this.show(false);
					break;
				case 'catalog':
					if (this.diagrams === null)
						this.search();
					this.show();
					break;
			}
		});
	}
	clear()
	{
		D.RemoveChildren(this.catalogInfo);
		D.RemoveChildren(this.modeTool);
		D.RemoveChildren(this.closeBtn);
		this.clearCatalogDisplay();
	}
	clearCatalogDisplay()
	{
		D.RemoveChildren(this.catalogDisplay);
	}
	imageToolbar(info)
	{
		const buttons = [D.getIcon('viewImage', 'view', e => window.open(`diagram/${info.name}.png`, null, 'height=768, width=1024, toolbar=0, location=0, status=0, scrollbars=0, resizeable=0'), 'Big image')];
		if (info.localTimestamp > info.timestamp && R.user.status === 'logged-in' && R.cloud && R.user.name === info.user)
			buttons.push(D.getIcon('diagramUpload', 'upload', e => Cat.R.uploadDiagram(e, info.name), `Upload diagram to ${R.local ? 'local server' : 'cloud'}`));
		if (info.refcnt === 0)
		{
			const btn = D.getIcon('deleteDiagram', 'delete', e => Cat.R.DeleteDiagram(e, info.name), 'Delete diagram');
			buttons.push(btn);
			btn.querySelector('rect.btn').style.fill = 'red';
		}
		if (R.diagram && R.diagram.isEditable() && R.diagram.references.has(info.name) && R.diagram.canRemoveReference(info.name))
		{
			const btn = D.getIcon('removeReference', 'delete', e =>
			{
				Cat.R.RemoveReference(e, info.name);
				const oldDiv = this.catalog.querySelector(`[data-name="${info.name}"]`);
				const newDiv = this.display(info);
				oldDiv.parentNode.replaceChild(newDiv, oldDiv);
				R.EmitDiagramEvent(R.diagram, 'removeReference');
			}, 'Remove reference diagram');
			btn.querySelector('rect.btn').style.fill = 'yellow';
			buttons.push(btn);
		}
		const toolbar = H3.table(buttons.map(btn => H3.tr(H3.td(btn))), '.hidden.shadow.smallTable', {style:'position:absolute; top:0px; right:6px; transition:0.3s;'});
		toolbar.onmouseenter = e => {toolbar.classList.remove('hidden');};
		toolbar.onmouseleave = e => {toolbar.classList.add('hidden');};
		if (this.view === 'reference')
		{
			if (!R.diagram.allReferences.has(info.name))
				toolbar.appendChild(H3.tr(H3.td(D.getIcon('referenceDiagram', 'edit', e => R.DownloadDiagram(info.name, _ =>
				{
					R.AddReference(e, info.name);
					const oldDiv = this.catalog.querySelector(`[data-name="${info.name}"]`);
					const newDiv = this.display(info);
					oldDiv.parentNode.replaceChild(newDiv, oldDiv);
					R.EmitDiagramEvent(R.diagram, 'addReference');
				}), `Add reference diagram to ${R.diagram.name}`))));
		}
		toolbar.style.position = 'absolute';
		return toolbar;
	}
	display(info)
	{
		const args =
		{
			width:			this.imageWidth,
			height:			this.imageHeight,
			onclick:		_ => Cat.R.SelectDiagram(info.name),
			style:			'cursor:pointer; transition:0.5s; height:auto width:100%',
			title:			info.description,
			'data-name':	info.name,
		};
		const img = D.GetImageElement(info.name, args);
		img.onclick = _ => Cat.R.SelectDiagram(info.name);
		if (this.glowMap.has(info.name))
			img.classList.add(this.glowMap.get(info.name));
		const toolbar = this.imageToolbar(info);
		const imgDiv = H3.div({style:'position:relative;'}, img, toolbar);
		if (this.view !== 'reference')
		{
			img.onmouseenter = e => toolbar.classList.remove('hidden');
			img.onmouseleave = e => toolbar.classList.add('hidden');
		}
		else	// reference view
		{
			img.onmouseenter = e =>
			{
				R.Diagrams.get(e.target.dataset.name).references.map(refName => this.catalog.querySelector(`img[data-name="${refName}"]`).classList.add('glow'));
				toolbar.classList.remove('hidden');
			};
			img.onmouseleave = e =>
			{
				R.Diagrams.get(e.target.dataset.name).references.map(refName => this.catalog.querySelector(`img[data-name="${refName}"]`).classList.remove('glow'));
				toolbar.classList.add('hidden');
			};
		}
		const div = H3.div('.catalogEntry', {'data-name':info.name},
			H3.table(
			[
				H3.tr(H3.td('.imageBackground', {colspan:2}, imgDiv)),
				H3.tr(H3.td({description:info.description, colspan:2})),
				H3.tr([	H3.td(info.name, '.author'),
						H3.td(new Date(info.timestamp).toLocaleString() + `, Refs: ${info.refcnt ? info.refcnt : '?'}`, '.date')], '.diagramSlot')
			], '.smallTable'));
		div.style.margin = "20px 0px 0px 0px";
		this.catalogDisplay.appendChild(div);
		return div;
	}
	askCloud(getVal = true)
	{
		switch(this.view)
		{
			case 'search':
				if (getVal)
				{
					const search = this.searchInput.value;
					fetch(`/search?search=${encodeURIComponent(search)}`).then(response => response.json()).then(diagrams => {this.diagrams = diagrams; this.update();});
				}
				break;
			case 'references':
				const refs = new Set(R.diagram.getAllReferenceDiagrams().keys());
				fetch(`/search?search=${encodeURIComponent(search)}`).then(response => response.json()).then(diagrams => {this.diagrams = diagrams; this.update();});
				break;
		}
		D.Busy();
	}
	localSearch(val)
	{
		this.diagrams = [];
		R.Diagrams.forEach((info, name) => name.includes(val) && this.diagrams.push(info));
	}
	doLookup()
	{
		this.localSearch(this.searchInput.value);
		if (this.view === 'search')
			this.outOfDateGlow();
		else
			this.referenceGlow();
		this.update();
	}
	search()
	{
		this.clear();
		this.view = 'search';
		this.title.innerHTML = `Search for: ${encodeURIComponent(this.searchInput.value)}`;
		this.doLookup();
		R.EmitViewEvent('catalog');
	}
	reference()
	{
		this.clear();
		this.view = 'reference';
		this.title.innerHTML = `References for ${U.HtmlSafe(R.diagram.name)}`;
		this.doLookup();
		R.EmitViewEvent('catalog');
	}
	outOfDateGlow()
	{
		D.RemoveChildren(this.catalogInfo);
		this.glowMap = new Map();
		const status = {hasWarningGlow:false, hasGreenGlow:false};
		this.diagrams.forEach(info =>
		{
			if (info.localTimestamp > 0)
			{
				if (info.localTimestamp > info.timestamp)
				{
					this.glowMap.set(info.name, 'greenGlow');
					status.hasGreenGlow = true;
				}
				if (info.localTimestamp < info.timestamp)
				{
					this.glowMap.set(info.name, 'warningGlow');
					status.hasWarningGlow = true;
				}
			}
		});
		if (status.hasWarningGlow)
			this.catalogInfo.appendChild(H3.div([	H3.span('Local diagram is ', H3.span('older', '.warningGlow'), ' than cloud', '.display'),
													H3.button(`Download all newer diagrams from ${R.local ? 'local server' : 'cloud'}.`, '.textButton', {onclick:_ => this.downloadNewer()})]));
		if (status.hasGreenGlow)
		{
			const div = H3.div(H3.span('Local diagram is ', H3.span('newer', '.greenGlow'), ' than cloud', '.display'));
			if (R.user.status === 'logged-in')
				div.appendChild(H3.button(`Upload all newer diagrams to ${R.local ? 'local server' : 'cloud'}.`, '.textButton', {onclick:_ => this.uploadNewer()}));
			this.catalogInfo.appendChild(div);
		}
		if (!status.hasWarningGlow && !status.hasGreenGlow)
			this.catalogInfo.appendChild(H3.p(`All diagrams synced to ${R.local ? 'local server' : 'cloud'}.`, '.center'));
	}
	referenceGlow()
	{
		D.RemoveChildren(this.catalogInfo);
		const status = {hasWarningGlow:false, hasGreenGlow:false};
		const refs = R.diagram.references;
		this.diagrams.forEach(info =>
		{
			const name = info.name;
			if (refs.has(name))
				this.glowMap.set(name, 'greenGlow');
			else if (R.diagram.allReferences.has(name))
				this.glowMap.set(name, 'warningGlow');
		});
		this.catalogInfo.appendChild(H3.div(H3.span('Directly referenced ', H3.span('diagrams', '.greenGlow'), '&nbsp;&nbsp;&nbsp;&nbsp;Indirectly referenced ', H3.span('diagrams', '.warningGlow'), '.display')));
		R.EmitViewEvent('catalog');
	}
	show(visible = true)
	{
		this.catalog.style.display = visible ? 'block' : 'none';
	}
	async downloadNewer()
	{
		const items = this.catalogDisplay.querySelectorAll('.warningGlow');
		const promises = [];
		items.forEach(elt =>
		{
			const name = elt.dataset.name;
			promises.push(R.downloadDiagramData(name, false, null, Number.parseInt(elt.dataset.timestamp)));
		});
		await Promise.all(promises);
		this.askCloud();
	}
	async uploadNewer()
	{
		const items = this.catalogDisplay.querySelectorAll('.greenGlow');
		const promises = [];
		items.forEach(elt =>
		{
			const name = elt.dataset.name;
			const data = U.readfile(`${name}.json`);
			const json = JSON.parse(data);
			if (json.user !== R.user.name)
				return;
			promises.push(R.upload(null, json, false, _ => {}));
		});
		await Promise.all(promises);
		this.askCloud();
	}
	update()
	{
		if (!this.diagrams)
			return;
		D.NotBusy();
		this.clearCatalogDisplay();
		if (R.diagram)
		{
			D.RemoveChildren(this.modeTool);
			if (this.view === 'search')
				this.modeTool.appendChild(H3.button(`Glow references for ${R.diagram.name}.`, '.textButton', {onclick:_ => this.reference()}));
			else
				this.modeTool.appendChild(H3.button('Glow out of date diagrams', '.textButton', {onclick:_ => this.search()}));
		}
		this.diagrams.map(diagram => this.filter(diagram) && this.display(diagram));
		if (R.diagram)
			this.closeBtn.appendChild(D.getIcon('closeCatalog', 'close', e => R.EmitViewEvent('diagram', R.diagram), 'Close catalog'));
	}
	filter(diagram)
	{
		if (diagram.user === 'sys')
			return false;
		return true;
	}
}

class Panels
{
	constructor()
	{
		this.panels = {};
		window.addEventListener('Autohide', function(e)
		{
			const panels = D.panels.panels;
			if (D.panels.checkPanels())
			{
				e.preventDefault();		// cancel!
				return;
			}
			if (e.detail.command === 'hide')
			{
				for (const name in panels)
					if (panels.hasOwnProperty(name))
						panels[name].elt.style.width = '0';
			}
			else
				for (const name in panels)
					if (panels.hasOwnProperty(name))
					{
						const pnl = panels[name];
						pnl.state === 'open' ? pnl.open() : (pnl.state === 'expand' ? pnl.expand() : null);
					}
		});
		window.addEventListener('View', e => e.detail.command === 'catalog' ? D.panels.closeAll(null) : null);
	}
	closeAll(refPnl)
	{
		for (const [name, panel] of Object.entries(this.panels))
		{
			if (panel === refPnl)
				continue;
			if (!refPnl)
				panel.close();
			else if (refPnl.elt.style.width === '100%' || panel.right === refPnl.right)	// close on same side
				panel.close();
		}
	}
	resize()
	{
		for (const [name, panel] of Object.entries(this.panels))
			panel.resize();
	}
	checkPanels()
	{
		if (D.mouse.onPanel)
			return true;
		for (const name in D.panels.panels)
			if (D.panels.panels[name].state === 'expand')
				return true;
		return false;
	}
}

class Section
{
	constructor(title, parent, id, tip)
	{
		this.elt = document.createElement('button');
		this.elt.innerHTML = U.HtmlEntitySafe(title);
		this.elt.title = tip;
		this.elt.section = this;
		this.elt.onclick = function() {this.section.toggle();};
		this.elt.classList.add('sidenavAccordion');
		parent.appendChild(this.elt);
		this.section = document.createElement('div');
		this.section.id = id;
		this.section.classList.add('section');
		parent.appendChild(this.section);
		this.close();
	}
	getId(name)
	{
		return U.SafeId(`${this.section.id}-${name}`);
	}
	toggle()
	{
		this.elt.classList.toggle('active');
		if (this.section.style.display === 'block')
			this.section.style.display = 'none';
		else
		{
			this.section.style.display = 'block';
		}
	}
	open()
	{
		this.elt.classList.add('active');
		this.section.style.display = 'block';
	}
	close()
	{
		this.elt.classList.remove('active');
		this.section.style.display = 'none';
	}
	update()		// fitb
	{
		return true;
	}
}

class Panel
{
	constructor(name, right = false, width = D.default.panel.width)
	{
		this.name = name;
		this.width = width;
		this.right = right;
		this.elt = document.getElementById(`${this.name}-sidenav`);
		this.elt.onmouseenter = e =>
		{
			D.mouse.onPanel = true;
			D.mouse.onGUI = this;
		};
		this.elt.onmouseleave = e =>
		{
			D.mouse.onPanel = false;
			D.mouse.onGUI = null;
		};
		D.panels.panels[this.name] = this;
		this.state = 'closed';
	}
	initialize()
	{
		this.expandBtnElt = document.getElementById(`${this.name}-expandBtn`);
	}
	collapse()
	{
		this.elt.style.width = this.width + 'px';
		D.RemoveChildren(this.expandBtnElt);
		this.expandBtnElt.appendChild(D.getIcon('panelCollapse', this.right ? 'chevronLeft' : 'chevronRight', e => this.expand(), 'Collapse'));
		this.state = 'open';
	}
	closeBtnCell()
	{
		return D.getIcon('panelClose', 'close', e => this.close(), 'Close');
	}
	expand(exp = 'auto')
	{
		this.elt.style.width = exp;
		D.panels.closeAll(this);
		D.RemoveChildren(this.expandBtnElt);
		this.expandBtnElt.appendChild(D.getIcon('panelExpand', this.right ? 'chevronRight' : 'chevronLeft', e => this.collapse(), 'Expand'));
		D.toolbar.hide();
		this.state = 'expand';
	}
	open()
	{
		this.elt.style.width = this.width + 'px';
		this.state = 'open';
		D.panels.closeAll(this);
	}
	close()
	{
		this.elt.style.width = '0';
		this.state = 'closed';
	}
	toggle()
	{
		const width = this.elt.style.width;
		if (width === 'auto' || Number.parseInt(width, 10) > 0)
			this.close();
		else
			this.open();
	}
	resize()
	{
		this.elt.style.height = `${window.innerHeight - 32}px`;
	}
	expandPanelBtn()
	{
		return D.getIcon('panelExpand', this.right ? 'chevronLeft' : 'chevronRight', e => this.expand(), 'Expand', undefined, `${this.name}-expandBtn`);
	}
	update()	// fitb
	{}
	static SectionToggle(e, btn, pnlId)
	{
		e.preventDefault();
		btn.classList.toggle('active');
		const elt = document.getElementById(pnlId);
		elt.style.display = elt.style.display === 'block' ? 'none' : 'block';
	}
	static SectionOpen(pnlId)
	{
		const elt = document.getElementById(pnlId);
		elt.style.display = 'block';
	}
	static SectionClose(pnlId)
	{
		const elt = document.getElementById(pnlId);
		elt.style.display = 'none';
	}
}

/* 	TODO nneds work
class NewCategorySection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'category-new-section', 'Create new category');
		const categoryActions = [];
		R.$CAT.getElement('category').elements.forEach(function(a) { categoryActions.push(U.DeCamel(a.properName)); });
		const productActions = [];
		R.$CAT.getElement('product').elements.forEach(function(a) { productActions.push(U.DeCamel(a.properName)); });
		const coproductActions = [];
		R.$CAT.getElement('coproduct').elements.forEach(function(a) { coproductActions.push(U.DeCamel(a.properName)); });
		const homActions = [];
		R.$CAT.getElement('hom').elements.forEach(function(a) { homActions.push(U.DeCamel(a.properName)); });
		this.section.innerHTML = H.table(
				H.tr(H.td(D.Input('', 'category-new-basename', 'Name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-properName', 'Proper name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-description', 'Description')), 'sidenavRow') +
				H.tr(H.td(H.span('All categories have these actions: ', 'smallBold') + H.span(categoryActions.join(', ')), 'left')) +
				H.tr(H.td('Select additional actions:', 'left smallBold')) +
				H.tr(H.td(
					D.Input('', 'category-new-hasProducts', '', '', 'in100', 'checkbox') + '<label for="category-new-hasProducts">Products</label>' + H.br() +
					H.span('Actions: ', 'smallBold') + H.span(productActions.join(', ')), 'left'),
					'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-hasCoproducts', '', '', 'in100', 'checkbox') + '<label for="category-new-hasCoproducts">Coproducts</label>' + H.br() +
					H.span('Actions: ', 'smallBold') + H.span(coproductActions.join(', ')), 'left'), 'sidenavRow') +
				H.tr(H.td(H.span('Selecting both products and coproducts adds actions for finite objects and data', 'smallPrint'), 'left')) +
				H.tr(H.td(D.Input('', 'category-new-isClosed', '', '', 'in100', 'checkbox') + '<label for="category-new-isClosed">Closed</label>' + H.br() +
					H.span('Actions: ', 'smallBold') + H.span(homActions.join(', ')), 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-monoid', '', '', 'in100', 'checkbox') + '<label for="category-new-monoid">Monoid</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-naturalNumbers', '', '', 'in100', 'checkbox') + '<label for="category-new-naturalNumbers">Natural numbers</label>', 'left'), 'sidenavRow'), 'sidenav') +
			H.span(D.GetButton('edit', 'Cat.D.categoryPanel.Create()', 'Create new category')) + H.br() +
			H.span('', 'error', 'category-new-error');
		this.error = document.getElementById('category-new-error');
		this.basenameElt = document.getElementById('category-new-basename');
		this.properNameElt = document.getElementById('category-new-properName');
		this.descriptionElt = document.getElementById('category-new-description');
		this.hasProductsElt = document.getElementById('category-new-hasProducts');
		this.hasCoproductsElt = document.getElementById('category-new-hasCoproducts');
		this.hasHomElt = document.getElementById('category-new-isClosed');
	}
	update()
	{
		if (super.update())
		{
			this.error.innerHTML = '';
			this.basenameElt.value = '';
			this.properNameElt.value = '';
			this.descriptionElt.value = '';
			this.error.style.padding = '0px';
			this.hasProductsElt.checked = false;
			this.hasCoproductsElt.checked = false;
			this.hasHomElt.checked = false;
		}
	}
	create(e)
	{
		try
		{
			const basename = U.HtmlSafe(this.basenameElt.value);
			const name = Element.Codename(R.$CAT, {basename});
			if (R.$CAT.getElement(name))
				throw 'Category already exists';
			const category = new Category(R.$CAT,
			{
				basename:		U.HtmlSafe(this.basenameElt.value),
				category:		R.CAT,
				description:	U.HtmlEntitySafe(this.descriptionElt.value),
				properName:		U.HtmlEntitySafe(this.properNameElt.value),
				user:			R.user.name,
			});
			if (this.hasProductsElt.checked)
				category.addActions('product');
			if (this.hasCoproductsElt.checked)
				category.addActions('coproduct');
			if (this.hasHomElt.checked)
				category.addActions('hom');
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
}
*/

class CategorySection extends Section
{
	constructor(title, parent, id, tip, updateFn = function(diagram){return '';}, filterFn = function(diagram){return true;})
	{
		super(title, parent, id, tip);
		this.diagrams = null;
		this.updateFn = updateFn;
		this.filterFn = filterFn;
	}
	setCategories(categories)
	{
		this.categories = categories;
		this.update();
	}
	update()
	{
		if (this.categories && super.update())
		{
			let rows = '';
			this.categories.forEach(category => this.filterFn(category) && rows.push(this.categoryRow(category, this.updateFn(category))));
			this.section.appendChild(H3.table(rows));
		}
	}
	categoryRow(category, tb = '')
	{
	}
}

class CategoryPanel extends Panel
{
	constructor()
	{
		super('category');
		const elements = [
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn(), '.buttonBarRight'))),
			H3.h3('Category'),
			H3.h4(H3.tag('basename'), H3.span('##category-basename-edit')),
			H3.h4(H3.tag('proper-name'), H3.span('##category-properName-edit')),
			H3.p(H3.tag('description'), H3.span('##category-description-edit')),
			H3.p(H3.span('Actions: ', '.smallBold'), H3.span('##category-actions.left')),
			H3.p('User: ', H3.span('##category-user'), '.description')];
		elements.map(elt => this.elt.appendChild(elt));
		this.categorySection = new CategorySection('Categories', this.elt, 'category-all-section', 'All available categories');
		this.basenamelt = document.getElementById('category-basename');
		this.properNameElt = this.elt.querySelector('proper-name');
		this.properNameEditElt = document.getElementById('category-properName-edit');
		this.descriptionElt = this.elt.querySelector('description');
		this.descriptionEditElt = document.getElementById('category-description-edit');
		this.actionsElt = document.getElementById('category-actions');
		this.userElt = document.getElementById('category-user');
		this.category = null;
		this.initialize();
		window.addEventListener('CAT', e => e.detail.command === 'default' && this.update());
	}
	update()
	{
// TODO?		this.newCategorySection.update();
		this.categorySection.update();
		if (R.diagram && this.category !== R.diagram.codomain)
		{
			this.category = R.diagram.codomain;
			this.properNameElt.innerHTML = this.category.properName;
			this.descriptionElt.innerHTML = this.category.description;
			this.userElt.innerHTML = this.category.user;
			const isEditable = this.category.isEditable();
			D.RemoveChildren(this.properNameEditElt);
			D.RemoveChildren(this.descriptionEditElt);
				// TODO editElementText cannot work
			if (isEditable)
			{
				this.properNameEditElt.appendChild(D.getIcon('editProperName', 'edit', e => Cat.R.$CAT.editElementText(e, category.name, category.elementId(), 'proper-name'), 'Edit', D.default.button.tiny));
				this.descriptionEditElt.appendChild(D.getIcon('editDescription', e => Cat.R.$CAT.editElementText(e, category.name, category.elementId(), 'description'), 'Edit', D.default.button.tiny));
			}
			const actions = [];
			this.category.actions.forEach(function(a) { actions.push(U.DeCamel(a.properName)); });
			this.actionsElt.innerHTML = actions.join(', ');
		}
	}
}

class ThreeDPanel extends Panel
{
	constructor()
	{
		super('threeD', true);
		this.mouse =	typeof THREE === 'object' ? new THREE.Vector2() : null;
		this.camera =	null;
		this.scene =	null;
		this.raycaster =	null;
		this.renderer =	null;
		this.controls =	null;
		this.bbox =		null;
		this.axesHelperSize =	1000;
		this.max =		10000;
		this.horizon =	100000;
		this.elt.appendChild(H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn(), 
									D.getIcon('threeDClear', 'delete', e => Cat.D.threeDPanel.initialize(), 'Clear display'), 
									D.getIcon('threeDLeft', 'threeD_left', e => Cat.D.threeDPanel.view('left'), 'Left'), 
									D.getIcon('threeDtop', 'threeD_top', e => Cat.D.threeDPanel.view('top'), 'Top'), 
									D.getIcon('threeDback', 'threeD_back', e => Cat.D.threeDPanel.view('back'), 'Back'), 
									D.getIcon('threeDright', 'threeD_right', e => Cat.D.threeDPanel.view('right'), 'Right'), 
									D.getIcon('threeDbotom', 'threeD_bottom', e => Cat.D.threeDPanel.view('bottom'), 'Bottom'), 
									D.getIcon('threeDfront', 'threeD_front', e => Cat.D.threeDPanel.view('front'), 'Front'), '.buttonBarLeft'))));
		this.elt.appendChild(H3.div('##threeDiv'));
		this.display = document.getElementById('threeDiv');
		this.initialized = false;
	}
	initialize()
	{
		super.initialize();
		try
		{
			let url = window.location.origin + window.location.pathname;
			const index = url.indexOf('index.html');
			if (index !== -1)
				url = url.substring(0, index);
			R.LoadScript(url + '/js/three.min.js', _ =>
			{
				R.LoadScript(url + '/js/OrbitControls.js', _ =>
				{
					this.shapeGeometry = new THREE.BoxBufferGeometry(D.default.scale3D, D.default.scale3D, D.default.scale3D);
					this.bbox =
					{
						min:{x:Number.POSITIVE_INFINITY, y:Number.POSITIVE_INFINITY, z:Number.POSITIVE_INFINITY},
						max:{x:Number.NEGATIVE_INFINITY, y:Number.NEGATIVE_INFINITY, z:Number.NEGATIVE_INFINITY}
					};
					const properties = window.getComputedStyle(this.display, null);
					let width = parseInt(properties.width, 10);
					width = width === 0 ? D.default.panel.width : width;
					const height = parseInt(properties.height, 10);
					this.camera = new THREE.PerspectiveCamera(70, width / height, 1, 2 * this.horizon);
					this.scene = new THREE.Scene();
					this.scene.background = new THREE.Color().setHSL(0.6, 0, 1);
					const horizon = 100000;
					const fogDistance = this.horizon/2;
					this.scene.fog = new THREE.Fog(this.scene.background, 1, fogDistance);
					const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
					hemiLight.color.setHSL(0.6, 1, 0.6);
					hemiLight.groundColor.setHSL(0.095, 1, 0.74);
					hemiLight.position.set(0, 50, 0);
					this.scene.add(hemiLight);
					const groundGeo = new THREE.PlaneBufferGeometry(this.horizon, this.horizon );
					const groundMat = new THREE.MeshPhongMaterial({color: 0xffffff, specular: 0x050505});
					groundMat.color.set(0xf0e68c);
					const ground = new THREE.Mesh(groundGeo, groundMat);
					ground.rotation.x = -Math.PI/2;
					this.scene.add(ground);
					ground.receiveShadow = true;
					const vertexShader = document.getElementById('vertexShader').textContent;
					const fragmentShader = document.getElementById('fragmentShader').textContent;
					const uniforms = {
						topColor:	 {value: new THREE.Color(0x0077ff ) },
						bottomColor: {value: new THREE.Color(0xffffff ) },
						offset:		 {value: 33 },
						exponent:	 {value: 0.6 }
					};
					uniforms.topColor.value.copy(hemiLight.color);
					const skyGeo = new THREE.SphereBufferGeometry( this.horizon, 32, 15 );
					const skyMat = new THREE.ShaderMaterial({vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
					const sky = new THREE.Mesh(skyGeo, skyMat);
					this.scene.add(sky);
					let light = new THREE.DirectionalLight(0xffffff, 1);
					light.position.set(-1, 1, -1).normalize();
					light.position.multiplyScalar(30);
					this.scene.add(light);
					this.scene.add(new THREE.AxesHelper(this.axesHelperSize));
					this.raycaster = new THREE.Raycaster();
					this.renderer = new THREE.WebGLRenderer({antialias:true});
					this.renderer.setPixelRatio(window.devicePixelRatio);
					this.resizeCanvas();
					this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
					if (this.display.children.length > 0)
						this.display.removeChild(this.display.children[0]);
					this.display.appendChild(this.renderer.domElement);
					this.renderer.gammaInput = true;
					this.renderer.gammaOutput = true;
					this.renderer.shadowMap.enabled = true;
					this.view('front');
					this.animate();
					this.initialized = true;
				});
			});
		}
		catch(e)
		{
			D.RecordError(e);
		}
	}
	reset()
	{
			const properties = window.getComputedStyle(this.display, null);
			this.camera = new THREE.PerspectiveCamera(70, properties.width / properties.height, 1, 2 * this.horizon);
			this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
	}
	animate()		// cannot use 'this'
	{
		if (D.threeDPanel)	// bootstrap issue
		{
			D.threeDPanel.resizeCanvas();
			requestAnimationFrame(D.threeDPanel.animate);
			D.threeDPanel.renderer.setViewport(0, 0, D.threeDPanel.display.clientWidth, D.threeDPanel.display.clientHeight);
			D.threeDPanel.renderer.render(D.threeDPanel.scene, D.threeDPanel.camera);
		}
	}
	constrain(w)
	{
		return w < - this.max ? -this.max : (w > this.max ? this.max : w);
	}
	view(dir)
	{
		let bbox = U.Clone(this.bbox);
		if (bbox.min.x === Number.POSITIVE_INFINITY)
			bbox = {min:{x:0, y:0, z:0}, max:{x:this.axesHelperSize, y:this.axesHelperSize, z:this.axesHelperSize}};
		bbox.min.x = this.constrain(bbox.min.x);
		bbox.min.y = this.constrain(bbox.min.y);
		bbox.min.z = this.constrain(bbox.min.z);
		bbox.max.x = this.constrain(bbox.max.x);
		bbox.max.y = this.constrain(bbox.max.y);
		bbox.max.z = this.constrain(bbox.max.z);
		const midX = (bbox.max.x + bbox.min.x) / 2;
		const midY = (bbox.max.y + bbox.min.y) / 2;
		const midZ = (bbox.max.z + bbox.min.z) / 2;
		let dx = bbox.max.x - bbox.min.x;
		let dy = bbox.max.y - bbox.min.y;
		let dz = bbox.max.z - bbox.min.z;
		const max = Math.max(dx, dy, dz);
		switch(dir)
		{
		case 'top':
			this.camera.position.set(midX, max + bbox.max.y, midZ);
			break;
		case 'left':
			this.camera.position.set(midX, midY, bbox.min.z - max);
			break;
		case 'back':
			this.camera.position.set(max + bbox.max.x, midY, midZ);
			break;
		case 'right':
			this.camera.position.set(midX, midY, max + bbox.max.z);
			break;
		case 'bottom':
			this.camera.position.set(midX, bbox.min.y - max, midZ);
			break;
		case 'front':
			this.camera.position.set(bbox.min.x - max, midY, midZ);
			break;
		}
		this.controls.target = new THREE.Vector3(midX, midY, midZ);
		this.camera.updateProjectionMatrix();
		this.controls.update();
	}
	expand()
	{
		if (!this.initialized)
			this.initialize();
		this.elt.style.width = '100%';
		D.RemoveChildren(this.expandBtnElt);
		this.expandBtnElt.appendChild(D.getIcon('threeDPanelCollapse', 'chevronRight', e => this.collapse(true), 'Expand'));
		this.resizeCanvas();
	}
	open()
	{
		if (!this.initialized)
			this.initialize();
		super.open();
	}
	toggle()
	{
		if (!this.initialized)
			this.initialize();
		super.toggle();
	}
	resizeCanvas()
	{
		const canvas = this.renderer.domElement;
		const properties = window.getComputedStyle(this.display, null);
		let width = parseInt(properties.width, 10);
		width = width === 0 ? D.default.panel.width : width;
		const height = parseInt(properties.height, 10);
		if (width !== 0 && height !== 0 && (canvas.width !== width || canvas.height !== height))
		{
			this.renderer.setSize(width, height, false);
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
		}
	}
	updateBBox(x, y = 0, z = 0)
	{
		const min = this.bbox.min;
		const max = this.bbox.max;
		min.x = Math.min(min.x, x);
		max.x = Math.max(max.x, x);
		min.y = Math.min(min.y, y);
		max.y = Math.max(max.y, y);
		min.z = Math.min(min.z, z);
		max.z = Math.max(max.z, z);
	}
	Ato3D(f)
	{
		const cube = new THREE.Mesh(this.shapeGeometry, new THREE.MeshLambertMaterial({color:Math.random() * 0xffffff}));
		cube.position.z = D.default.scale3D * f;
		this.updateBBox(cube.position.z);
		this.scene.add(cube);
	}
	AxAto3D(ff)
	{
		const cube = new THREE.Mesh(this.shapeGeometry, new THREE.MeshLambertMaterial({color:Math.random() * 0xffffff}));
		cube.position.z = D.default.scale3D * ff[0];
		cube.position.x = D.default.scale3D * ff[1];
		this.updateBBox(cube.position.z, cube.position.x);
		this.scene.add(cube);
	}
	AxAxAto3D(fff)
	{
		const cube = new THREE.Mesh(this.shapeGeometry, new THREE.MeshLambertMaterial({color:Math.random() * 0xffffff}));
		cube.position.x = D.default.scale3D * fff[0];
		cube.position.y = D.default.scale3D * fff[1];
		cube.position.z = D.default.scale3D * fff[2];
		this.updateBBox(cube.position.z, cube.position.x, cube.position.y);
		this.scene.add(cube);
	}
	AxAxAx2toLine(fff2)
	{
		const geo = new THREE.Geometry();
		const from = fff[0];
		const to = fff[1];
		geo.vertices.push(new THREE.Vector3(from[0], from[1], from[2]));
		geo.vertices.push(new THREE.Vector3(to[0], to[1], to[2]));
		const material = new THREE.LineBasicMaterial({color:Math.random() * 0xffffff});
		const line = new THREE.Line(geo, material);
		this.scene.add(line);
		this.updateBBox(from[0], from[1], from[2]);
		this.updateBBox(to[0], to[1], to[2]);
	}
	AxAxAToQuadraticBezierCurve3(fff)
	{
		const from = fff[0];
		const mid = fff[1];
		const to = fff[2];
		const curve = new THREE.QuadraticBezierCurve3(	new THREE.Vector3(from[0], from[1], from[2]),
														new THREE.Vector3(mid[0], mid[1], mid[2]),
														new THREE.Vector3(to[0], to[1], to[2]));
		const points = curve.getPoints(10);
		const geo = new THREE.BufferGeometry().setFromPoints(points);
		const material = new THREE.LineBasicMaterial({color:Math.random() * 0xffffff});
		this.scene.add(new THREE.Line(geo, material));
		this.updateBBox(from[0], from[1], from[2]);
		this.updateBBox(mid[0], mid[1], mid[2]);
		this.updateBBox(to[0], to[1], to[2]);
	}
}

class LogSection extends Section
{
	constructor(parent)
	{
		super('Log', parent, 'tty-log-section', 'Diagram log');
		this.diagram = null;
		this.logElt = null;
		const div = H3.div(H3.table(H3.tr(H3.td('.buttonBarLeft', D.getIcon('logClear', 'delete', _ => Cat.R.diagram.clearLog(), 'Clear log'),
												D.DownloadButton('LOG', _ => Cat.R.diagram.downloadLog(), 'Download log')))), H3.hr());
		this.section.appendChild(div);
		window.addEventListener('CAT', e => e.detail.command === 'default' && this.update());
	}
	setElements(elements)
	{
		this.elements = elements;
		this.update();
	}
	update()
	{
		if (super.update())
		{
			if (this.diagram && this.diagram !== R.diagram)
			{
				this.diagram = R.diagram;
				this.logElt && this.section.removeChild(this.logElt);
				this.logElt = document.createElement('div');
				this.section.appendChild(this.logElt);
				R.diagram._log.map(c => this.log(c));
			}
		}
	}
	cleanLogDisplay()
	{
		const elts = this.logElt.children;
		for (let i=0; i<elts.length; ++i)
			elts[i].classList.remove('playedCmd', 'playedBadCmd');
	}
	log(args)
	{
		const elt = document.createElement('p');
		this.logElt && this.logElt.appendChild(H3.p(U.prettifyCommand(args)));
	}
	antilog(args)	// TODO
	{
		const elt = document.createElement('p');
		this.logElt.appendChild(H3.p(U.prettifyCommand(args)));
	}
	replayCommand(e, ndx)
	{
		const elt = this.logElt.children[ndx];
		elt.classList.remove('playedCmd', 'playedBadCmd');
		try
		{
			const cmd = R.diagram._log[ndx];
			R.diagram.replayCommand(e, cmd);
			elt.classList.add('playedCmd');
			return true;
		}
		catch(x)
		{
			elt.classList.add('playedBadCmd');
			D.statusbar.show(e, x);
			return false;
		}
	}
	replayLog(e)
	{
		this.cleanLogDisplay();
		const diagram = R.diagram;
		diagram.clear(false);
		let msg = 'Replay complete';
		try
		{
			diagram._log.map((cmd, i) =>
			{
				if (!this.replayCommand(e, i))
					throw '';	// abort
			});
		}
		catch(x)
		{
			msg = 'Replay aborted';
		}
		D.statusbar.show(e, msg);
	}
	removeLogCommand(e, ndx)
	{
		R.diagram._log.splice(ndx, 1);
		this.diagram = null;	// force update of log section
		this.update();
		this.diagram.saveLog();
	}
}

class TtyPanel extends Panel
{
	constructor()
	{
		super('tty', true);
		const elements = [
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn())), '.buttonBarLeft'),
			H3.h3('TTY'),
			H3.button('Output', '.sidenavAccordion', {title:'TTY output from some composite', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'tty-out-section')}),
			H3.div(H3.table(H3.tr(H3.td(	D.getIcon('ttyClear', 'delete', _ => D.RemoveChildren(this.out), 'Clear output'),
											D.DownloadButton('LOG', e => Cat.D.DownloadString(this.out.innerHTML, 'text', 'console.log'), 'Download tty log file'), '.buttonBarLeft'))),
				H3.pre('##tty-out.tty'), '##tty-out-section.section'),
			H3.button('Errors', '.sidenavAccordion', {title:'Errors from some action', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'tty-error-section')}),
			H3.div(H3.table(H3.tr(H3.td(	D.getIcon('ttyErrorClear', 'delete', _ => D.RemoveChildren(this.error)),
											D.DownloadButton('ERR', e => Cat.D.DownloadString(this.error.innerHTML, 'text', 'console.err'), 'Download error log file'), '.buttonBarLeft'))),
				H3.span('##tty-error-out.tty'), '##tty-error-section.section')];
		elements.map(elt => this.elt.appendChild(elt));
		this.initialize();
		this.out = document.getElementById('tty-out');
		this.error = document.getElementById('tty-error-out');
		this.logSection = new LogSection(this.elt);
	}
	toOutput(s)
	{
		this.out.innerHTML += U.HtmlSafe(s) + '\n';
	}
}

class DiagramSection extends Section
{
	constructor(title, parent, id, tip)
	{
		super(title, parent, id, tip);
		Object.defineProperties(this,
		{
			header:						{value:H3.span(),		writable: false},
			catalog:					{value:H3.div(),		writable: false},
			diagrams:					{value:[],				writable: false},
			sortBy:						{value:'',				writable: true},
		});
		this.catalog.classList.add('catalog');
		this.section.appendChild(this.header);
		this.section.appendChild(this.catalog);
	}
	add(diagram, btns = [])
	{
		const id = this.getId(U.SafeId(diagram.name));
		if (document.getElementById(id))
			return;
		this.diagrams.push(diagram);
		const user = 'user' in diagram ? diagram.user : diagram.username;
		const dt = new Date(diagram.timestamp);
		const toolbar = [...btns];
		const elt = H3.div('.grabbable', {id, 'data-timestamp':diagram.timestamp, 'data-name':diagram.name},
			H3.table(	H3.tr( H3.td(H3.h4(diagram.properName)), H3.td(toolbar, '.right'),),
						H3.tr(H3.td('.imageBackground', {colspan:2}, H3.a({onclick:_ => {Cat.D.diagramPanel.collapse(); Cat.R.SelectDiagram(diagram.name);}}, D.GetImageElement(diagram.name)))),
						H3.tr(H3.td({description:U.HtmlEntitySafe(diagram.description), colspan:2})),
						H3.tr(H3.td(diagram.name, '.author'), H3.td(dt.toLocaleString(), '.date'), '.diagramSlot')), {draggable:true, ondragstart:e => Cat.D.DragElement(e, diagram.name)});
		switch(this.sortBy)
		{
			case 'timestamp':
				const diagramNodes = this.catalog.childNodes;
				let didIt = false;
				const timestamp = diagram.timestamp;
				if (diagramNodes.length > 0)
				{
					for (let i=0; i<diagramNodes.length; ++i)
					{
						const node = diagramNodes[i];
						const nodeTime = Number.parseInt(node.dataset.timestamp);
						didIt = timestamp >= nodeTime;
						if (didIt)
						{
							this.catalog.insertBefore(elt, node);
							break;
						}
					}
					!didIt && this.catalog.appendChild(elt);
				}
				else
					this.catalog.appendChild(elt);
				break;
			default:
				this.catalog.appendChild(elt);
				break;
		}
	}
	remove(name)
	{
		const elt = document.getElementById(this.getId(name));
		elt && elt.parentNode.removeChild(elt);
		let ndx = -1;
		for (let i=0; i<this.diagrams.length; ++i)
			if (this.diagrams.name === name)
			{
				ndx = i;
				break;
			}
		if (ndx > -1)
			this.diagrams.splice(ndx, 1);
	}
	refresh()
	{
		const diagrams = this.diagrams.slice();
		diagrams.map(d =>
		{
			this.remove(d.name);
			this.add(d);
		});
	}
	clear()
	{
		while(this.catalog.firstChild)
			this.catalog.removeChild(this.catalog.firstChild);
	}
}

class AssertionSection extends Section
{
	constructor(parent)
	{
		super('Assertions', parent, 'assertions-section', 'Assertions in this diagram');
		window.addEventListener('Assertion', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'new':
				case 'load':
					D.diagramPanel.assertionSection.addAssertion(diagram, args.element);
					break;
				case 'delete':
					break;
			}
		});
		const refresh = e => R.diagram && R.diagram === e.detail.diagram && this.refresh(R.diagram);
		window.addEventListener('Login', e => R.diagram && this.refresh(R.diagram));
		window.addEventListener('CAT', refresh);
		window.addEventListener('Assertion', refresh);
		this.assertions = H3.div('.catalog');
		this.section.appendChild(this.assertions);
	}
	addAssertion(diagram, assertion)
	{
		if (diagram !== R.diagram)
			return;
		const canEdit = diagram.isEditable();
		const delBtn = H3.span(canEdit ? D.getIcon('assertionDelete', 'delete', _ => this.deleteAssertion(assertion.name), 'Delete assertion') : '');
		const viewBtn = H3.span(D.getIcon('assertionView', 'view', _ => Cat.R.diagram.viewElements(assertion.name), 'View assertion'));
		const desc = H3.span(assertion.description, `##a_${assertion.name}`) +
					(canEdit ? D.getIcon('assertionEdit', 'edit', e => Cat.R.diagram.editElementText(e, assertion.name, `a_${assertion.name}`, 'description'), 'Edit') : '');
		const div = H3.div(`##assertion ${assertion.name}.right`, viewBtn, delBtn,
					H3.table(	H3.tr(H3.td(H3.table(assertion.left.map(m => H3.tr(H3.td(m.to.properName))))),
										H3.td(H3.table(assertion.right.map(m => H3.tr(H3.td(m.to.properName)))))), '.panelElt'));
		const sig = assertion.signature;
		div.onmouseenter = _ => Cat.R.diagram.emphasis(sig, true);
		div.onmouseleave = _ => Cat.R.diagram.emphasis(sig, false);
		div.onmousedown = e => Cat.R.diagram.selectElement(e, assertion.name);
		this.assertions.appendChild(div);
	}
	refresh(diagram)
	{
		D.RemoveChildren(this.assertions);
		diagram.assertions.forEach(a => this.addAssertion(diagram, a));
	}
	deleteAssertion(name)
	{
		const a = R.diagram.assertions.get(name);
		a && a.decrRefcnt();
	}
}

class DiagramPanel extends Panel
{
	constructor()
	{
		super('diagram');
		const top = [H3.table(H3.tr(H3.td('##diagramPanelToolbar.buttonBarRight'))),
							H3.h3(H3.span('Diagram')),
							H3.h4(H3.span('##diagram-basename'), H3.span('##diagram-basename-edit')),
							H3.h4(H3.span('##diagram-category')),
							H3.h4([H3.span('##diagram-properName'), H3.span('##diagram-properName-edit')]),
							H3.table(H3.tr(H3.td('##diagram-image.center.imageBackground'))),
							H3.p([H3.span('##diagram-description.description', {title:'Description'}), H3.span({id:'diagram-description-edit'})]),
							H3.table(H3.tr(	H3.td(H3.span('By '), H3.span('##diagram-user'), '.smallPrint.italic'),
											H3.td(H3.span('##diagram-timestamp'), H3.br(), H3.span('##diagram-info'), '.smallPrint.italic'))),
							H3.br()];
		top.map(elt => this.elt.appendChild(elt));
		this.assertionSection = new AssertionSection(this.elt);
		this.initialize();
		Object.defineProperties(this,
		{
			diagram:					{value: R.diagram,											writable: true},
			categoryElt:				{value:document.getElementById('diagram-category'),			writable: false},
			basenameElt:				{value:document.getElementById('diagram-basename'),			writable: false},
			properNameElt:				{value:document.getElementById('diagram-properName'),		writable: false},
			properNameEditElt:			{value:document.getElementById('diagram-properName-edit'),	writable: false},
			descriptionElt:				{value:document.getElementById('diagram-description'),		writable: false},
			descriptionEditElt:			{value:document.getElementById('diagram-description-edit'),	writable: false},
			diagramPanelToolbarElt:		{value:document.getElementById('diagramPanelToolbar'),		writable: false},
			timestampElt:				{value:document.getElementById('diagram-timestamp'),		writable: false},
			userElt:					{value:document.getElementById('diagram-user'),				writable: false},
			infoElt:					{value:document.getElementById('diagram-info'),				writable: false},
			imageElt:					{value:document.getElementById('diagram-image'),			writable: false},
			user:						{value: R.user.name,										writable: true},
		});
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			if (!args.diagram)
				return;
			const diagram = R.GetDiagramInfo(args.diagram.name);
			if (!diagram)
				return;
			switch(args.command)
			{
				case 'default':
					D.RemoveChildren(this.categoryElt);
					this.categoryElt.appendChild(H3.span(diagram.codomain.properName));
					this.update(e);
					this.setToolbar(diagram);
					break;
				case 'png':
					const png = D.diagramPNGs.get(diagram.name);
					const images = [...document.querySelectorAll(`#img-${diagram.elementId()}`)];
					images.map(img => img.src = png);
					break;
				case 'upload':
					this.update(e, false);
					break;
			}
		});
		window.addEventListener('Login', function(e) { D.diagramPanel.update(e); });
		window.addEventListener('Object', function(e) { D.diagramPanel.updateInfo(e); });
		window.addEventListener('Morphism', function(e) { D.diagramPanel.updateInfo(e); });
		window.addEventListener('Text', function(e) { D.diagramPanel.updateInfo(e); });
		window.addEventListener('Assertion', function(e) { D.diagramPanel.updateInfo(e); });
	}
	setToolbar(diagram)
	{
		if (!diagram)
			return;
		const isUsers = diagram && (R.user.name === diagram.user || R.user.isAdmin());
		const uploadBtn = (R.user.status === 'logged-in' && R.cloud && isUsers) ? D.getIcon('diagramUpload', 'upload', e => diagram.upload(e), 'Upload to cloud', D.default.button.small, false, 'diagramUploadBtn') : '';
		const deleteBtn = R.CanDeleteDiagram(diagram) ?
			D.getIcon('diagramDelete', 'delete', e => Cat.R.DeleteDiagram(e, diagram.name), 'Delete diagram', D.default.button.small, false, 'diagram-delete-btn') : '';
		let downcloudBtn = null;
		if (R.diagram.refcnt <= 0 && R.cloud && R.ServerDiagrams.has(diagram.name))
		{
			const data = R.catalog.get(diagram.name);
			if (diagram.timestamp !== data.timestamp)
			{
				const date = new Date(data.timestamp);
				const tip = R.ServerDiagrams.get(diagram.name).timestamp > diagram.timestamp ? `Download newer version from cloud: ${date.toLocaleString()}` :
					'Download older version from cloud';
				downcloudBtn = D.getIcon('diagramReload', 'downcloud', e => Cat.R.ReloadDiagramFromServer(), tip, D.default.button.small, false, 'diagramDowncloudBtn');
			}
		}
		const elements = [(isUsers ? H3.span(DiagramPanel.GetLockBtn(diagram), '.lockBtn') : null),
					deleteBtn,
					downcloudBtn,
					uploadBtn,
					D.DownloadButton('JSON', e => Cat.R.diagram.downloadJSON(e), 'Download JSON'),
					D.DownloadButton('JS', e => Cat.R.diagram.downloadJS(e), 'Download Javascript'),
					D.DownloadButton('C++', e => Cat.R.diagram.downloadCPP(e), 'Download C++'),
					D.DownloadButton('PNG', e => Cat.R.diagram.downloadPNG(e), 'Download PNG'),
					this.expandPanelBtn(),
					this.closeBtnCell()];
		D.RemoveChildren(this.diagramPanelToolbarElt);
		elements.map(elt => elt && this.diagramPanelToolbarElt.appendChild(elt));
		this.diagramPanelToolbarElt.style.position = 'sticky';
		this.initialize();
	}
	expand()
	{
		super.expand("100%");
	}
	update(e, all = true)
	{
		const diagram = R.diagram;
		if (!diagram)
			return;
		this.descriptionElt.innerHTML = U.HtmlEntitySafe(diagram.description);
		this.properNameElt.innerHTML = diagram.properName;
		this.userElt.innerHTML = diagram.user;
		D.RemoveChildren(this.properNameEditElt);
		D.RemoveChildren(this.descriptionEditElt);
		if (diagram.isEditable())
		{
			this.properNameEditElt.appendChild(D.getIcon('editProperName', 'edit', e => Cat.R.$CAT.editElementText(e, diagram.name, diagram.elementId(), 'proper-name'), 'Edit', D.default.button.tiny));
			this.descriptionEditElt.appendChild(D.getIcon('editDescription', 'edit', e => Cat.R.$CAT.editElementText(e, diagram.name, diagram.elementId(), 'description'), 'Edit', D.default.button.tiny));
		}
		D.RemoveChildren(this.imageElt);
		this.imageElt.appendChild(D.GetImageElement(diagram.name));
		this.setToolbar(diagram);
		this.updateInfo(e);
	}
	updateInfo(e)
	{
		const args = e.detail;
		const diagram = args.diagram;
		if (!diagram || diagram !== R.diagram)
			return;
		D.RemoveChildren(this.infoElt);
		const dt = new Date(diagram.timestamp);
		this.timestampElt.innerHTML = dt.toLocaleString();
		if (R.catalog.has(diagram.name))
		{
			const info = R.catalog.get(diagram.name);
			if (diagram.timestamp < info.timestamp)
				this.infoElt.appendChild(H3.span('Cloud has newer version of diagram', '.warning'));
			else if (diagram.timestamp === info.timestamp)
				this.infoElt.appendChild(H3.span('Synced with cloud', '.warning'));
			else if (diagram.timestamp > info.timestamp)
				this.infoElt.appendChild(H3.span('Newer than cloud', '.warning'));
		}
		else
			this.infoElt.appendChild(H3.span('Not on cloud'));
	}
	static GetLockBtn(diagram)
	{
		const lockable = diagram.readonly ? 'unlock' : 'lock';
		return D.getIcon('lock', lockable, e => Cat.R.diagram[lockable](e), U.Cap(lockable));
	}
	static UpdateLockBtn(diagram)
	{
		if (diagram && R.user.name === diagram.user)
			document.getElementById('lockBtn').innerHTML = DiagramPanel.GetLockBtn(diagram);
	}
}

class HelpPanel extends Panel
{
	constructor()
	{
		super('help', true);
		const date = '04/11/2020 00:00:01 AM';
		const elements = [
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn(), '.buttonBarLeft'))),
			H3.h3('Catecon'),
			H3.h4('The Categorical Console'),
			H3.p(H3.small('Level 1', '.smallCaps.italic'), '.txtCenter'),
			H3.p(H3.small(`Deployed ${date}`, '.smallCaps'), '.txtCenter'),
			H3.br(),
			H3.button('Help', '##catActionPnlBtn.sidenavAccordion', {title:'Help for mouse and key actions', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'catActionHelpPnl')}),
			H3.div(	H3.h4('Mouse Actions'),
						H3.h5('Select'),
							H3.p('Select an object or a morphism with the mouse by left-clicking on the element.  Previously selected objects are unselected.'),
						H3.h5('Region Select'),
							H3.p('Click the mouse button, then drag without releasing to cover some elements, and then release to select those elements.'),
						H3.h5('Multi-Select With Shift Click'),
							H3.p('Shift left mouse click to add another element to the select list'),
						H3.h5('Control Drag'),
							H3.p('Left click with the mouse on an object with the Ctrl key down and then drag to create an identity morphism for that object.'),
							H3.p('Doing the same with a morphism makes a copy of the morphism.'),
						H3.h5('Mouse Wheel'),
							H3.p('Use the mouse wheel to zoom in and out.'),
						H3.h5('Middle Mouse Button'),
							H3.p('Click and drag to pan the diagram view.'),
					H3.h4('Key Actions'),
						H3.h5('Arrow Keys'),
							H3.p('Pan the diagram view in the indicated direction.'),
						H3.h5('Delete'),
							H3.p('Selected objects or morphisms are deleted.  Some elements cannot be deleted if they are referred to by another element.'),
						H3.h5('Escape'),
							H3.p('Dismiss toolbar and side panels.'),
						H3.h5('Spacebar'),
							H3.p('Press the spacebar and move the mouse to pan the view.'),
						H3.h5('Home'),
							H3.p('Return to the home view.'),
						H3.h5('Control-A'),
							H3.p('Select all elements.'),
						H3.h5('Control-C'),
							H3.p('Copy elements into the paste buffer.'),
						H3.h5('Ccontrol-D'),
							H3.p('Open the diagram panel.'),
						H3.h5('Control-L'),
							H3.p('Open output panel.'),
						H3.h5('Control-M'),
							H3.p('Open morphism panel.'),
						H3.h5('Control-O'),
							H3.p('Open object panel.'),
						H3.h5('Control-V'),
							H3.p('Paste elements from the paste buffer.'),
						H3.h5('Control-Z'),
							H3.p('Undo the last edit action.'), '##catActionHelpPnl.section'),
			H3.button('Category Theory', '##catHelpPnlBtn.sidenavAccordion', {title:'References', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'catHelpPnl')}),
			H3.div(	H3.small('All of mathematics is divided into one part: Category Theory', ''),
					H3.h4('References'),
					H3.p(H3.a('"Categories For The Working Mathematician"', '.italic', {href:"https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician", target:"_blank"})), '##catHelpPnl.section'),
			H3.button('Articles', '##referencesPnlBTn.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'referencesPnl')}),
			H3.div(	H3.p(H3.a('Intro To Categorical Programming', {href:"https://harrydole.com/wp/2017/09/16/cat-prog/"})),
					H3.p(H3.a('V Is For Vortex - More Categorical Programming', {href:"https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"})), '##referencesPnl.section'),
			H3.button('Terms and Conditions', '##TermsPnlBtn.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'TermsPnl')}),
			H3.div(	H3.p('No hate.'), '##TermsPnl.section'),
			H3.button('License', '##licensePnlBtn.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'licensePnl')}),
			H3.div(	H3.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.'),
					H3.p('Upload a diagram to Catecon and others there are expected to make full use of it.'),
					H3.p('Inelegant or unreferenced diagrams are removed.  See T&amp;C\'s'), '##licensePnl.section'),
			H3.button('Credits', '##creditaPnlBtn.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'creditsPnl')}),
			H3.div(	H3.a('Saunders Mac Lane', {href:"https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"}),
					H3.a('Harry Dole', {href:"https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"}), '##creditsPnl.section'),
			H3.button('Third Party Software', '##third-party.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'thirdPartySoftwarePnl')}),
			H3.div( H3.a('3D', {href:"https://threejs.org/"}),
					H3.a('Crypto', {href:"https://bitwiseshiftleft.github.io/sjcl/"}), '##thirdPartySoftwarePnl.section'),
			H3.hr(),
			H3.small('&copy;2018-2020 Harry Dole'),
			H3.br(),
			H3.small('harry@harrydole.com', '.italic')];
		elements.map(elt => this.elt.appendChild(elt));
		this.initialize();
	}
}

class LoginPanel extends Panel
{
	constructor()
	{
		super('login', true);
		this.userNameElt = H3.span('##user-name.smallBold');
		this.userEmailElt = H3.span('##user-email.smallBold');
		this.permissionsElt = H3.span('##login-permission.smallBold');
		this.loginInfoElt = H3.div('##login-info');
		this.errorElt = H3.span('##login-error.error');
		this.elt.appendChild(H3.div(	H3.table(H3.tr(H3.td(this.closeBtnCell(), '.buttonBarLeft'))),
										H3.h3('User'),
										H3.table(	H3.tr(H3.td('User:'), H3.td(this.userNameElt)),
													H3.tr(H3.td('Email:'), H3.td(this.userEmailElt)),
													H3.tr(H3.td('Permissions:'), H3.td(this.permissionsElt))),
										this.loginInfoElt,
										this.errorElt));
		this.initialize();
		window.addEventListener('Login', e =>
		{
			this.update();
			if (e.detail.command === 'logged-in')
				this.close();
		});
		window.addEventListener('Registered', _ => this.update());
		window.addEventListener('load', _ => this.update());
	}
	getLoginForm()
	{
		return H3.form(H3.table(H3.tr(H3.td('User name')),
								H3.tr(H3.td(H3.input('##login-user-name', {title:'Text', placeholder:'Name', autocomplete:"username"}))),
								H3.tr(H3.td(H3.label('Password', {for:'login-password'}))),
								H3.tr(H3.td(H3.input('##login-password.password', {type:'password', placeholder:'********'}))),
								H3.tr(H3.td(H3.button('Login', {onclick:e => Cat.R.login(e)})))));
	}
	update()
	{
		this.userNameElt.innerHTML = R.user.name;
		this.userEmailElt.innerHTML = R.user.email;
		D.RemoveChildren(this.loginInfoElt);
		D.RemoveChildren(this.errorElt);
		D.RemoveChildren(this.permissionsElt);
		if (R.user.cloud)
			this.permissionsElt.innerText = R.user.cloud.permissions.join(', ');
		const getLogoutButton = _ => H3.button('Log Out', {onclick:_ => Cat.R.cloud.logout()});
		const getResetButton = _ =>  H3.button('Reset password', {onclick:e => Cat.R.cloud.resetPassword(e)});
		function getConfirmationInput(endRows)
		{
			return H3.form(	H3.h3('Confirmation Code'),
							H3.span('The confirmation code is sent by email to the specified address above.'),
							H3.table(	H3.tr(H3.td('Confirmation code')),
										H3.tr(H3.td(H3.input('##confirmationCode', {type:'text', placeholder:'six digit code', onkeydown:e => Cat.D.OnEnter(e, Cat.R.cloud.confirm, Cat.R.cloud)}))),
							endRows));
		}
		switch(R.user.status)
		{
			case 'logged-in':
				this.loginInfoElt.appendChild(H3.table(H3.tr(H3.td(getLogoutButton()), H3.td(getResetButton()))));
				break;
			case 'unauthorized':
				this.loginInfoElt.appendChild(this.getLoginForm());
				const form = H3.form(	H3.button('Signup', '.sidenavAccordion', {title:'Signup for the Categorical Console', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'signupPnl')}),
										H3.div( H3.table(	H3.tr(H3.td('User name')),
															H3.tr(H3.td(H3.input('##signupUserName', {type:'text', placeholder:'No spaces'}))),
															H3.tr(H3.td('Email')),
															H3.tr(H3.td(H3.input('##signupUserEmail', {type:'text', placeholder:'Email'}))),
													LoginPanel.PasswordForm(Cat.R.cloud.signup),
													H3.tr(H3.td(H3.button('Sign up', {onclick:_ => Cat.R.cloud.signup()})))), '##signupPnl.section'));
				break;
			case 'registered':
				this.loginInfoElt.appendChild(getConfirmationInput(H3.tr(H3.td(H3.button('Submit Confirmation Code', {onclick:e => Cat.R.cloud.confirm(e)})))));
				this.loginInfoElt.appendChild(getLogoutButton());
				break;
			case 'reset':
				this.loginInfoElt.appendChild(getConfirmationInput(	H3.tr(H3.td(H3.input('##login-new-password', {type:'password', placeholder:'Password', autocomplete:"new-password"}))),
																	H3.tr(H3.td(H3.button('Submit new password', {onclick:e => Cat.R.cloud.updatePassword(e)})))));
				this.loginInfoElt.appendChild(getLogoutButton());
				break;
			default:
				this.loginInfoElt.appendChild(getLoginForm());
				break;
		}
	}
	toggle()
	{
		super.toggle();
		this.update();
	}
	static PasswordForm(onkeydown)
	{
		return H3.tr(H3.td('Categorical Access Key')),
				H3.tr(H3.td(H3.input(`##SignupSecret`, {type:'text', placeholder:'????????', autocomplete:"none"}))),
				H3.tr(H3.td('Password')),
				H3.tr(H3.td(H3.input(`##SignupUserPassword`, {type:'password', placeholder:'Password', autocomplete:"new-password"}))),
				H3.tr(H3.td('Confirm password')),
				H3.tr(H3.td(H3.input(`##SignupUserPasswordConfirm`, {type:'password', placeholder:'Confirm', autocomplete:"confirm-password", onkeydown:e => Cat.D.OnEnter(e, onkeydown, Cat.R.cloud)})));
	}
}

class ElementSection extends Section
{
	constructor(title, parent, id, tip, type)
	{
		super(title, parent, id, tip);
		Object.defineProperties(this,
		{
			catalog:					{value:H3.div(),	writable: false},
			type:						{value:type,		writable: false},	// 'Object', 'Morphism'
		});
		this.catalog.classList.add('catalog');
		this.section.appendChild(this.catalog);
	}
	add(elt)
	{
		const diagram = elt.diagram;
		let id = diagram.elementId(this.constructor.name);
		let diagramElt = document.getElementById(id);
		if (!diagramElt)	// add diagram header?
		{
			diagramElt = H3.div({id}, H3.h3(diagram.name));
			this.catalog.appendChild(diagramElt);
		}
		id = elt.elementId(this.constructor.name);
		let domElt = document.getElementById(id);
		if (domElt)
			domElt.parentNode.removeChild(domElt);
		domElt = elt.getHtmlRep(this.constructor.name);
		domElt && this.catalog.appendChild(domElt);
	}
	update(diagram, name)
	{
		let elt = diagram.getElement(name);	// not the .to
		elt = 'to' in elt ? elt.to : elt;
		const id = elt.elementId(this.constructor.name);		// element id
		if (!(elt instanceof DiagramText))
		{
			const properNameElt = document.querySelector(`#${id} proper-name`);
			if (properNameElt)
				properNameElt.innerHTML = U.HtmlEntitySafe(elt.properName);
		}
		const descElt = document.querySelector(`#${id} description`);
		if (descElt)
			descElt.innerHTML = U.HtmlEntitySafe(elt.description);
	}
	remove(name)
	{
		const id = Element.SafeName(name);
		const elt = document.getElementById(this.getId(id));
		elt && elt.parentNode.removeChild(elt);
	}
	expand()
	{
		super.expand("100%");
	}
}

class DiagramElementSection extends ElementSection
{
	constructor(title, parent, id, tip, type)
	{
		super(title, parent, id, tip, type);
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			if (!args.diagram)
				return;
			const diagram = R.GetDiagramInfo(args.diagram.name);
			if (args.command === 'default')
			{
				D.RemoveChildren(this.catalog);
				this.refresh();
			}
		});
		window.addEventListener('Login', e => this.refresh());
		window.addEventListener(this.type, e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (!diagram || diagram !== R.diagram)
				return;
			let element = args.element;
			if (!element)
				return;
			const to = element instanceof DiagramMorphism || element instanceof DiagramObject ? element.to : element;
			switch(args.command)
			{
				case 'new':
					!(element instanceof DiagramMorphism || element instanceof DiagramObject) && this.add(to);
					break;
				case 'delete':
					to.refcnt === 1 && this.remove(to.name);
					break;
				case 'update':
					this.update(diagram, element.name);
					break;
			}
		});
	}
	refresh()
	{
		if (!R.diagram)
			return;
		switch(this.type)
		{
			case 'Object':
				R.diagram.forEachObject(o => this.add(o));
				break;
			case 'Morphism':
				R.diagram.forEachMorphism(m => this.add(m));
				break;
			case 'Text':
				R.diagram.forEachText(t => this.add(t));
				break;
		}
	}
}

class ReferenceElementSection extends ElementSection
{
	constructor(title, parent, id, tip, type)
	{
		super(title, parent, id, tip, type);
		const addRefs = diagram =>
		{
			diagram && diagram.allReferences.forEach((cnt, name) =>
			{
				const ref = R.$CAT.getElement(name);
				ref[this.type === 'Object' ? 'forEachObject' : 'forEachMorphism'](o => this.add(o));
			});
		};
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'default':
					D.RemoveChildren(this.catalog);
					addRefs(args.diagram);
					break;
			}
		});
		window.addEventListener('Diagram', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch (args.command)
			{
				case 'addReference':
					addRefs(diagram);
					break;
				case 'removeReference':
					this.remove(args.name);
					diagram[this.type === 'Object' ? 'forEachObject' : 'forEachMorphism'](o => this.remove(o));
					break;
			}
		});
	}
}

class ElementPanel extends Panel
{
	constructor(name, title, iterator)
	{
		super(name);
		this.elt.appendChild(H3.div(H3.table(H3.tr(H3.td(this.expandPanelBtn(), this.closeBtnCell(), '.buttonBarRight'))), H3.h3(title)));
		this.showSearch();
		this.objectSection = new DiagramElementSection('Diagram', this.elt, `diagram-${name}`, `${title} in this diagram`, title);
		this.referenceSection = new ReferenceElementSection('References', this.elt, `diagram-reference-${name}`, `${title} referenced from this diagram`, title);
		this.initialize();
		this.iterator = iterator;
	}
	expand()
	{
		super.expand("100%");
	}
	showSearch()
	{
		const thatSearch = e => this.search(e);
		function onkeydown(e) { Cat.D.OnEnter(event, thatSearch); }
		this.searchInput = H3.input(`##element-panel-${this.name}-diagram-search.in100`, {title:'Search', placeholder:'Search', onkeydown, size:8});
		const btn = D.getIcon(`${name}Search`, 'edit', thatSearch, 'Search in a diagram');
		this.elt.appendChild(H3.div(H3.span('Find in category:', '.smallPrint.italic'), this.searchInput, btn));
		this.searchItems = H3.div(`##element-panel-${this.name}-search-items.catalog`);
		this.elt.appendChild(this.searchItems);
	}
	search(e)
	{
		D.RemoveChildren(this.searchItems);
		R.diagram.codomain[this.iterator](o =>
		{
			const rx = new RegExp(this.searchInput.value, 'gi');
			rx.exec(o.basename.toString()) && this.searchItems.appendChild(o.getHtmlRep(this.constructor.name));
		});
	}
}

class ObjectPanel extends ElementPanel
{
	constructor()
	{
		super('object', 'Object', 'forEachObject');
	}
}

class MorphismPanel extends ElementPanel
{
	constructor()
	{
		super('morphism', 'Morphism', 'forEachMorphism');
	}
}

class SettingsPanel extends Panel
{
	constructor()
	{
		super('settings', true);
		const debugChkbox = H3.input({type:"checkbox", onchange:e => {Cat.R.default.debug = !Cat.R.default.debug; Cat.R.SaveDefaults();}});
		if (R.default.debug)
			debugChkbox.checked = true;
		const gridChkbox = H3.input({type:"checkbox", onchange:e => {Cat.D.gridding = !D.gridding; R.SaveDefaults();}});
		if (D.gridding)
			gridChkbox.checked = true;
		const showEventsChkbox = H3.input({type:"checkbox", onchange:e => {Cat.R.default.showEvents = !Cat.R.default.showEvents; Cat.R.SaveDefaults();}});
		if (R.default.showEvents)
			showEventsChkbox.checked = true;
		const settings = [	H3.tr(	H3.td(gridChkbox),
									H3.td('Snap objects to a grid.', '.left'), '.sidenavRow'),
							H3.tr(	H3.td(debugChkbox),
									H3.td('Debug', '.left'), '.sidenavRow'),
							H3.tr(	H3.td(showEventsChkbox),
									H3.td('Show events on console', '.left'), '.sidenavRow')];
		const elts =
		[
			H3.table(H3.tr(H3.td(this.closeBtnCell(), '.buttonBarLeft'))),
			H3.button('Settings', '##catActionPnlBtn.sidenavAccordion', {title:'Help for mouse and key actions', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'settings-actions')}),
			H3.div(H3.table('##settings-table', settings), '##settings-actions.section'),
			H3.button('Defaults', '##catActionPnlBtn.sidenavAccordion', {title:'Help for mouse and key actions', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'settings-defaults')}),
			H3.div('##settings-defaults.section'),
			H3.button('Equality Info', '##catActionPnlBtn.sidenavAccordion', {title:'Help for mouse and key actions', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'settings-equality')}),
			H3.div('##settings-equality.section')
		];
		elts.map(elt => this.elt.appendChild(elt));

		this.initialize();
		this.equalityElt = document.getElementById('settings-equality');
		R.workers.equality.addEventListener('message', msg =>
		{
			if (msg.data.command === 'Info')
			{
				const elt = this.equalityElt;
				D.RemoveChildren(elt);
				const data = U.Clone(msg.data);
				delete data.command;
				delete data.delta;
				D.Pretty(data, elt);
			}
			else if (msg.data.command === 'Load')
				R.workers.equality.postMessage({command:'Info'});
		});
		this.defaultsElt = document.getElementById('settings-defaults');
		D.Pretty(D.default, this.defaultsElt);
		window.addEventListener('Login', _ => this.update());
	}
	update()
	{
		if (R.user.cloud && R.user.cloud.permissions.includes('admin'))
		{
			const tbl = this.elt.querySelector('#settings-table');
			tbl.appendChild(H3.tr(	H3.td(H3.button('Update Reference Counts', '.textButton', {onclick:_ => Cat.R.updateRefcnts()}), {colspan:2})));
			tbl.appendChild(H3.tr(	H3.td(H3.button('Update catalog.json by database', '.textButton', {onclick:_ => R.authFetch(R.getURL('updateCatalogFromDatabase'), {}).then()}), {colspan:2})));
		}
	}
}

class TextPanel extends Panel
{
	constructor()
	{
		super('text');
		this.elt.appendChild(H3.div(H3.table(H3.tr(H3.td(this.expandPanelBtn(), this.closeBtnCell(), '.buttonBarRight'))), H3.h3('Text')));
		this.textSection = new DiagramElementSection('Text', this.elt, 'diagram-text', 'Text in this diagram', 'Text');
		this.initialize();
	}
	expand()
	{
		super.expand("100%");
	}
}

class Element
{
	constructor(diagram, args)
	{
		let name = '';
		if ('name' in args)
			name = args.name;
		const basename = args.basename;
		if (!basename || basename === '')
			throw 'invalid base name';
		if (name === '')
			name = Element.Codename(diagram, {basename});
		if ('category' in args)
			Object.defineProperty(this, 'category', {value: R.GetCategory(args.category),	writable: false});
		else
			Object.defineProperty(this, 'category', {value:diagram.codomain,	writable: false});
		const dual = U.GetArg(args, 'dual', false);
		const properName = ('properName' in args && args.properName !== '') ? args.properName : 'basename' in args ? args.basename : name;
		Object.defineProperties(this,
		{
			basename:		{value: basename,										writable: true},
			description:	{value: 'description' in args ? args.description : '',	writable: true},
			diagram:		{value: diagram,										writable: true},	// is true for bootstrapping
			dual:			{value:	dual,											writable: false},
			name:			{value: name,											writable: true},
			properName:		{value: U.HtmlEntitySafe(properName),					writable: true},
			refcnt:			{value: 0,												writable: true},
		});
		if ('code' in args)
			Object.defineProperty(this, 'code', {value:args.code,	writable:false});
		this.signature = this.getElementSignature();
	}
	editText(e, attribute, value)
	{
		let old = this[attribute];
		if (attribute === 'basename')	// also changes name and properName
		{
			if (!U.basenameEx.test(value))
				throw 'invalid name';
			if (this.diagram.elements.has(value) && this !== this.diagram.elements.get(value))
				throw 'base name already taken';
		}
		this[attribute] = U.HtmlEntitySafe(value);
		if (attribute === 'basename')
		{
			this.name = Element.Codename(this.diagram, {basename:this.basename});
			this.properName = this.properName === old ? this.basename : this.properName;	// update if the old proper name was its basename
			this.signature = this.getElementSignature();
			this.diagram.updateProperName(this);	// TODO change to event processing
			this.diagram.reconstituteElements();
		}
		else if (attribute === 'properName')
			this.diagram.updateProperName(this);
		return old;
	}
	help()
	{
		let baseBtn = '';
		let descBtn = '';
		let pNameBtn = '';
		const id = this.elementId();
		if (this.isEditable() && this.diagram.isEditable())
		{
			switch(this.constructor.name)	// the others have auto-generated names
			{
				case 'CatObject':
				case 'Morphism':
				case 'FiniteObject':
				case 'Category':
				case 'NamedObject':
				case 'NamedMorphism':
					const tny = Cat.D.default.button.tiny;
					baseBtn = this.refcnt <= 1 ? D.getIcon('elt-edit-basename', 'edit', e => Cat.R.diagram.editElementText(e, this.name, id, 'basename'), 'Edit', tny) : '';
					descBtn = D.getIcon('elt-edit-description', 'edit', e => Cat.R.diagram.editElementText(e, this.name, id, 'description'), 'Edit', tny);
					pNameBtn = this.canChangeProperName() ? D.getIcon('elt-edit-propername', 'edit', e => Cat.R.diagram.editElementText(e, this.name, id, 'properName'), 'Edit', tny) : '';
					break;
			}
		}
		return H3.table(H3.tr(H3.th(H3.tag('proper-name', this.properName), pNameBtn, '.center', {colspan:2})),
						H3.tr(H3.td('Base name:', '.left'), H3.td(H3.tag('basename', this.basename), baseBtn, '.left')),
						H3.tr(H3.td('Description:', '.left'), H3.td(H3.tag('description', this.description), descBtn, '.left')),
						H3.tr(H3.td('Type:', '.left'), H3.td(U.Cap(U.DeCamel(this.constructor.name)), '.left')),
						H3.tr(H3.td('Category:', '.left'), H3.td(this.diagram ? this.category.properName : '', '.left')),
						H3.tr(H3.td('Diagram:', '.left'), H3.td(this.diagram ? this.diagram.properName : '', '.left')),
						H3.tr(H3.td('User:', '.left'), H3.td(this.diagram ? this.diagram.user : '', '.left')), {id});
	}
	isEditable()
	{
		return R.diagram && this.diagram && (R.diagram.name === this.diagram.name || R.diagram.name === this.name) && ('readonly' in this ? !this.readonly : true) &&
					(this.diagram.user === R.user.name || R.user.isAdmin());
	}
	isIterable()
	{
		return false;		// fitb
	}
	getElementSignature()
	{
		const preSig = U.Sig(this.name);
		return 'code' in this ? U.SigArray([preSig, U.Sig(this.code)]) : preSig;
	}
	incrRefcnt()
	{
		++this.refcnt;
	}
	decrRefcnt()
	{
		--this.refcnt;
	}
	json()
	{
		const a = {};
		a.description =	this.description;
		if ('basename' in this)
			a.basename =	this.basename;
		if ('name' in this)
			a.name =	this.name;
		a.prototype =	this.constructor.name;
		a.properName =	this.properName;
		if ('category' in this && this.category)
			a.category = this.category.name;
		if ('diagram' in this && this.diagram)
			a.diagram =	this.diagram.name;
		if (this.dual)
			a.dual = true;
		if ('code' in this)
			a.code = U.Clone(this.code);
		return a;
	}
	info()
	{
		const a =
		{
			basename:	this.basename,
			name:		this.name,
			prototype:	this.prototype,
			description:	this.descripiton,
			properName:	this.properName,
		};
		if ('readonly' in this)
			a.readonly = this.readonly;
		if (this.category)
			a.category = this.category.name;
		if (this.diagram)
			a.diagram = this.diagram.name;
		return a;
	}
	stringify()
	{
		return JSON.stringify(this.json());
	}
	isEquivalent(elt)
	{
		return elt ? U.SigEqu(this.signature, elt.signature) : false;
	}
	isDeletable()
	{
		return this.refcnt <= 1;
	}
	canChangeProperName()
	{
		return true;
	}
	needsParens()		// Most elements do not need parenthesis, but products and coproducts do.
	{
		return false;
	}
	removeSVG()
	{
		if (this.svg && this.svg.parentNode)
			this.svg.parentNode.removeChild(this.svg);
	}
	elementId(prefix = '')
	{
		return Element.SafeName((prefix === '' ? '' : prefix + '-') + this.name);
	}
	usesDiagram(diagram)
	{
		return this.diagram && this.diagram.name === diagram.name;
	}
	updateGlow(state, glow)
	{
		if (this.svg)
		{
			this.svg.classList.remove(...['glow', 'badGlow']);
			if (state)
				this.svg.classList.add(...[glow]);
		}
	}
	canSave()
	{
		return true;
	}
	getDecoration()		// for commutative cells
	{
		return '&#10226;';
	}
	show(on = true)
	{
		this.svg.classList[on ? 'remove' : 'add']('hidden');
	}
	getSeq()
	{
		let seq = 0;
		const elts = this.diagram.domain.elements;
		for (const [name, e] of elts)
		{
			if (e === this)
				return seq;
			seq++;
		}
		return -1;
	}
	emphasis(on)					{ D.SetClass('emphasis', on, this.svg); }
	find(elt, index = [])			{ return elt === this ? index : []; }
	basic()							{ return 'base' in this ? this.base : this; }
	getBase()						{ return this; }
	basenameIncludes(val)			{ return this.basename.includes(val); }
	static Basename(diagram, args)	{ return args.basename; }
	static Codename(diagram, args)	{ return diagram ? `${diagram.name}/${args.basename}` : args.basename; }
	static Process(diagram, args)	{ return 'prototype' in args ? new Cat[args.prototype](diagram, args) : null; }
	static SafeName(name)			{ return U.SafeId(`el_${name}`); }
}

class Graph
{
	constructor(diagram, args = {})
	{
		this.diagram = diagram;
		this.tags = [];
		if ('position' in args)
			this.position = args.position;
		if ('width' in args)
			this.width = args.width;
		this.graphs = 'graphs' in args ? args.graphs.slice() : [];
		this.tags = 'tags' in args ? args.tags.slice() : [];
		this.links = 'links' in args ? args.links.slice() : [];
		this.visited = new Set('visited' in args ? args.visited.slice() : []);
	}
	json()
	{
		const a = {};
		a.diagram = this.diagram.name;
		a.tags = this.tags.slice();
		a.position = U.Clone(this.position);
		a.width = this.width;
		a.graphs = this.graphs.map(g => g.json());
		a.links = this.links.slice();
		a.visited = [...this.visited];
		return a;
	}
	isLeaf()
	{
		return this.graphs.length === 0;
	}
	getIndices(indices)		// indices may be truncated by name objects; return it
	{
		if (this.graphs.length === 0)
			return this;
		if (indices.length === 1 && indices[0].length === 0)
			return this;
		let fctr = this;
		let nuIndices = [];
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return nuIndices.push(null);	// object is terminal object One
			if (fctr.graphs.length > 0)
			{
				nuIndices.push(k);
				fctr = fctr.graphs[k];
			}
			else
				return nuIndices;
		}
		return nuIndices;
	}
	getFactor(indices)
	{
		if (indices.length === 1 && indices[0] === -1)
			return null;
		if (this.graphs.length === 0)
			return this;
		if (indices.length === 1 && indices[0].length === 0)
			return this;
		let fctr = this;
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return null;	// object is terminal object One
			if (fctr.graphs.length > 0)
				fctr = fctr.graphs[k];
			else
				throw 'bad index for factor';
		}
		return fctr;
	}
	tagGraph(tag)
	{
		this.addTag(tag);
		this.graphs.map(g => g.tagGraph(tag));
	}
	traceLinks(top, ndx = [])
	{
		if (this.isLeaf())		// links are at the leaves of the graph
		{
			const links = this.links.slice();
			this.visited = new Set();
			const nuLinks = [];
			while(links.length > 0)
			{
				const lnk = links.pop();
				if (ndx.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
					continue;
				if (this.visited.has(lnk.toString()))
					continue;
				const g = top.getFactor(lnk);
				for (let j=0; j<g.links.length; ++j)
				{
					const glnk = g.links[j];
					if (this.visited.has(glnk.toString()))
						continue;
					if (ndx.reduce((isEqual, lvl, i) => lvl === glnk[i] && isEqual, true))	// ignore links back to where we came from
						continue;
					nuLinks.push(glnk);
					links.push(glnk);
				}
				U.ArrayMerge(this.tags, g.tags);
				this.visited.add(lnk.toString());
			}
			if (ndx.length === 1 && (ndx[0] === 0 || ndx[0] === top.graphs.length -1))
				this.links = nuLinks.filter(lnk => lnk[0] === 0 || lnk[0] === top.graphs.length -1);
			else
				U.ArrayMerge(this.links, nuLinks);
		}
		else
		{
			this.graphs.map((g, i) =>
			{
				const ndxi = ndx.slice();
				ndxi.push(i);
				g.traceLinks(top, ndxi);
			});
		}
	}
	mergeGraphs(data) // data: {from, base, inbound, outbound}
	{
		if (data.from.isLeaf())
		{
			const links = data.from.links.map(lnk =>
			{
				let nuLnk = data.base.reduce((isSelfLink, f, i) => isSelfLink && f === lnk[i], true) ? data.inbound.slice() : data.outbound.slice();
				nuLnk.push(...lnk.slice(data.base.length));
				return nuLnk;
			});
			U.ArrayMerge(this.links, links);
			U.ArrayMerge(this.tags, data.from.tags);
		}
		else
			this.graphs.map((g, i) => g.mergeGraphs({from:data.from.graphs[i], base:data.base, inbound:data.inbound, outbound:data.outbound}));
	}
	bindGraph(data)	// data: {cod, index, tag, domRoot, codRoot, offset, dual}
	{
		if (this.isLeaf())
		{
			const domRoot = data.domRoot.slice();
			const codRoot = data.codRoot.slice();
			U.arraySet(this, 'links', codRoot);
			U.arraySet(data.cod, 'links', domRoot);
			if ('tags' in data)
			{
				U.arrayInclude(this, 'tags', data.tag);
				U.arrayInclude(data.cod, 'tags', data.tag);
			}
		}
		else this.graphs.map((g, i) =>
		{
			const args = U.Clone(data);
			const index = data.index.slice();
			index.push(i + data.offset);
			args.index = index;
			args.cod = data.cod.graphs[i];
			args.domRoot.push(i);
			args.codRoot.push(i);
			g.bindGraph(args);
		});
	}
	copyGraph(data)	// data {map, src}
	{
		if (this.isLeaf())
		{
			if (!data.src.isLeaf())
				throw 'graphs not iso';
			this.tags = data.src.tags.slice();
			for (let i=0; i<data.src.links.length; ++i)
			{
				const lnk = data.src.links[i];
				for (let j=0; j<data.map.length; ++j)	// search for this link in the link map
				{
					const pair = data.map[j];
					const fromLnk = pair[0];
					if (fromLnk.reduce((isEqual, ml, i) => ml === lnk[i] && isEqual, true))
					{
						const lnkClip = lnk.slice(fromLnk.length);
						const nuLnk = pair[1].slice();
						nuLnk.push(...lnkClip);
						this.links.push(nuLnk);
						break;
					}
				}
			}
		}
		else this.graphs.map((g, i) =>
		{
			g.copyGraph({src:data.src.graphs[i], map:data.map});
		});
	}
	updateXY(xy)
	{
		this.xy = new D2({x: xy.x + this.position + this.width/2, y: xy.y});
		if (this.graphs.length === 0)
			xy = this.xy;
		else
			this.graphs.map(g => g.updateXY(xy));
	}
	makeSVG(node, data, first = true)	// data {index, root, dom:name, cod:name, visited, elementId}
	{
		const diagram = this.diagram;
		if (this.isLeaf() && this.links.length > 0)
		{
			let colorIndex = Number.MAX_VALUE;
			const srcKey = DiagramMorphism.LinkColorKey(data.index, data.dom, data.cod);
			if (!('colorIndex' in this))
			{
				if (!(srcKey in diagram.link2colorIndex))
					diagram.link2colorIndex[srcKey] = diagram.colorIndex++;
				colorIndex = diagram.link2colorIndex[srcKey];
			}
			else
				colorIndex = this.colorIndex;
			//
			// look for a new color
			//
			while(colorIndex in diagram.colorIndex2colorIndex)
				colorIndex = diagram.colorIndex2colorIndex[colorIndex];
			let path = null;
			const fs = this.tags.sort().join();
			const showStatusBar = function(e){ Cat.D.statusbar.show(event, fs); };
			for (let i=0; i<this.links.length; ++i)
			{
				const lnk = this.links[i];
				const nuLnk = data.root.getIndices(lnk);
				const visitedStr = nuLnk.toString();
				const idxStr = data.index.toString();
				if (data.visited.includes(visitedStr + ' ' + idxStr))
					continue;
				const {coords, vertical} = this.svgLinkUpdate(nuLnk, data);
				const linkId = DiagramMorphism.LinkId(data, lnk);
				const lnkKey = DiagramMorphism.LinkColorKey(lnk, data.dom, data.cod);
				if (lnkKey in diagram.link2colorIndex)
				{
					let linkColorIndex = diagram.link2colorIndex[lnkKey];
					while (linkColorIndex in diagram.colorIndex2colorIndex)
						linkColorIndex = diagram.colorIndex2colorIndex[linkColorIndex];
					if (linkColorIndex < colorIndex)
					{
						diagram.colorIndex2colorIndex[colorIndex] = linkColorIndex;
						colorIndex = linkColorIndex;
						while(colorIndex in diagram.colorIndex2colorIndex)
							colorIndex = diagram.colorIndex2colorIndex[colorIndex];
						diagram.link2colorIndex[srcKey] = colorIndex;
					}
					else if (linkColorIndex > colorIndex)
					{
						diagram.link2colorIndex[lnkKey] = colorIndex;
						diagram.colorIndex2colorIndex[linkColorIndex] = colorIndex;
					}
				}
				else
					diagram.link2colorIndex[lnkKey] = colorIndex;
				let color = '';
				if (colorIndex in diagram.colorIndex2color)
					color = diagram.colorIndex2color[colorIndex];
				else
				{
					color = DiagramMorphism.ColorWheel(data);
					diagram.colorIndex2color[colorIndex] = color;
				}
				data.visited.push(idxStr + ' ' + visitedStr);
				data.visited.push(visitedStr + ' ' + idxStr);
				const filter = vertical ? '' : 'url(#softGlow)';
				const path = H3.path('.string', {'data-link':`${visitedStr} ${idxStr}`, id:linkId, style:`stroke:#${color}AA`, d:coords, filter, onmouseover:showStatusBar});
				node.appendChild(path);
			}
		}
		let svg = this.graphs.map((g, i) =>
		{
			data.index.push(i);
			g.makeSVG(node, data, false);
			data.index.pop();
		});
	}
	getSVG(node, id, data)
	{
		const name = this.name;
		const sig = this.signature;
		const g = document.createElementNS(D.xmlns, 'g');
		g.onmouseenter = e => Cat.R.diagram.emphasis(sig, true);
		g.onmouseleave = e => Cat.R.diagram.emphasis(sig, false);
		g.onmousedown = e => Cat.R.diagram.selectElement(event, sig);
		node.appendChild(g);
		g.setAttributeNS(null, 'id', id);
		this.svg = g;
		this.makeSVG(g, data);
	}
	svgLinkUpdate(lnk, data)	// data {root, dom:{x,y}, cod:{x,y}}
	{
		const f = data.root.getFactor(lnk);
		const cod = f.xy;
		const dx = cod.x - this.xy.x;
		const dy = cod.y - this.xy.y;
		const adx = Math.abs(dx);
		const ady = Math.abs(dy);
		const normal = dy === 0 ? ((this.xy.y - this.xy.y) > 0 ? new D2({x:0, y:-1}) : new D2({x:0, y:1})) : cod.subtract(this.xy).normal().normalize();
		const h = (adx - ady) / (1.0 * adx);
		const v = normal.scale(cod.dist(this.xy) * h / 4.0);
		const cp1 = v.add(this.xy).trunc();		// more stable in testing than round()
		const cp2 = v.add(cod).trunc();
		return {coords:adx < ady ? `M${this.xy.x},${this.xy.y} L${cod.x},${cod.y}` : `M${this.xy.x},${this.xy.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`,
			vertical:dx === 0};
	}
	updateGraph(data)	// data {index, graph, dom:name, cod:name, visited, elementId}
	{
		const diagram = this.diagram;
		if (this.isLeaf() && this.links.length > 0)
		{
			const srcKey = DiagramMorphism.LinkColorKey(data.index, data.dom, data.cod);
			let colorIndex = diagram.link2colorIndex[srcKey];
			while(colorIndex in diagram.colorIndex2colorIndex)
				colorIndex = diagram.colorIndex2colorIndex[colorIndex];
			for (let i=0; i<this.links.length; ++i)
			{
				const lnk = this.links[i];
				const lnkStr = lnk.toString();	// TODO use U.a2s?
				const lnkKey = DiagramMorphism.LinkColorKey(lnk, data.dom, data.cod);
				let linkColorIndex = diagram.link2colorIndex[lnkKey];
				while(linkColorIndex in diagram.colorIndex2colorIndex)
					linkColorIndex = diagram.colorIndex2colorIndex[linkColorIndex];
				if (linkColorIndex < colorIndex)
				{
					diagram.colorIndex2colorIndex[colorIndex] = linkColorIndex;
					colorIndex = linkColorIndex;
					while(colorIndex in diagram.colorIndex2colorIndex)
						colorIndex = diagram.colorIndex2colorIndex[colorIndex];
					diagram.link2colorIndex[srcKey] = colorIndex;
				}
				else if (linkColorIndex > colorIndex)
				{
					diagram.link2colorIndex[lnkKey] = colorIndex;
					diagram.colorIndex2colorIndex[linkColorIndex] = colorIndex;
				}
				const color = diagram.colorIndex2color[colorIndex];
				const idxStr = data.index.toString();	// TODO use U.a2s?
				if (data.visited.includes(lnkStr + ' ' + idxStr))
					continue;
				const {coords, vertical} = this.svgLinkUpdate(lnk, data);
				const linkId = DiagramMorphism.LinkId(data, lnk);
				const lnkElt = document.getElementById(linkId);
				if (lnkElt)
				{
					lnkElt.setAttribute('d', coords);
					lnkElt.setAttribute('style', `stroke:#${color}AA`);
					lnkElt.setAttribute('filter', vertical ? '' : 'url(#softGlow)');
				}
				data.visited.push(idxStr + ' ' + lnkStr);
			}
		}
		else
		{
			this.graphs.map((g, i) =>
			{
				data.index.push(i);
				g.updateGraph(data);
				data.index.pop();
			});
		}
	}
	scan(fn, fctr = [])		// only on leaves
	{
		if (this.graphs.length === 0)
			return fn(this, fctr);
		else
			return this.graphs.map((g, i) =>
			{
				const nuFctr = fctr.slice();
				nuFctr.push(i);
				g.scan(fn, nuFctr);
			});
	}
	deepScan(fn, fctr = [])		// on all nodes
	{
		fn(this, fctr);
		this.scan(fn, fctr);
		this.graphs.map((g, i) =>
		{
			const nuFctr = fctr.slice();
			nuFctr.push(i);
			g.deepScan(fn, nuFctr);
		});
	}
	hasTag(tag)
	{
		return this.graphs.length === 0 ? this.tags.includes(tag) : this.graphs.reduce((r, g) => r && g.hasTag(tag), true);
	}
	noTag(tag)
	{
		let hasTag = false;
		this.scan((g, ndx) => hasTag = hasTag || g.hasTag(tag));
		return !hasTag;
	}
	addTag(tag)
	{
		if (this.graphs.length === 0)
		{
			if (!this.hasTag(tag))
			{
				this.tags.push(tag);
				return true;
			}
			return false;
		}
		else
		{
			let result = false;
			this.graphs.map(g => result = g.addTag(tag) || result);
			return result;
		}
	}
	newGraph(ndx)
	{
		if (this.getFactor(ndx))
			throw 'graph already there';
		let g = this;
		let scan = ndx.slice();
		while(scan.length > 0)
		{
			const k = scan.shift();
			if (g.graphs[k] === undefined)
				g.graphs[k] = new Graph(diagram);
			g = graphs[k];
		}
		return g;
	}
	reduceLinks(ndx)	// for sequence graphs
	{
		if (this.isLeaf())
		{
			const nuLinks = new Set();
			for (let i=0; i<this.links.length; ++i)
			{
				const lnk = this.links[i];
				if (lnk[0] === 0 || lnk[0] === ndx)
					nuLinks.add(lnk);
			}
			this.links = [...nuLinks];
		}
		else this.graphs.map((g, i) => g.reduceLinks(ndx));
	}
	// utility function to determine if this graph or one of its subgraphs is covered.
	_hasSomeCoverage()
	{
		return this.isLeaf() ? 'covered' in this : this.graphs.reduce((r, g) => r || g._hasSomeCoverage(), false);
	}
	// utility function to determine if this graph or all of its subgraphs are covered.
	_isCovered()
	{
		if ('covered' in this)
		{
			delete this.covered;
			return true;
		}
		return this.graphs.reduce((r, g) => r && g._isCovered(), true);
	}
	// utility function to remove the covered attribute
	_removeCovered()
	{
		delete this.covered;
		this.graphs.map(g => g._removeCovered());
	}
	doIndicesCover(indices)
	{
		// tag subgraphs with covered per index, but return false if errors occurred
		const consistent = indices.reduce((r, ndx) =>
		{
			if (r)
			{
				if (U.ArrayEquals(ndx, [-2]))	// skip
					return true;
				const factor = this.getFactor(ndx);
				if (factor._hasSomeCoverage())	// if already covered then cannot cover further up
					return false;
				const ndxCpy = ndx.slice();
				let i = null;
				while((i = ndxCpy.pop()))
					if ('covered' in this.getFactor(i))
						return false;		// an ancestor is covered
				factor.covered = true;
				return true;
			}
			return false;
		}, true);
		if (consistent)
		{
			const isCovered = this._isCovered();
			this._removeCovered();
			return isCovered;
		}
		return false;
	}
}

class CatObject extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		diagram && (!('addElement' in args) || args.addElement) && diagram.addElement(this);
		this.constructor.name === 'CatObject' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Category:'), H3.td(this.category.properName)));
		return help;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		this.refcnt <= 0 && this.category && this.category.deleteElement(this);
	}
	getFactor(factor)	// With no further structure the ony factor we could possibly return is the object itself.
	{
		return this;
	}
	getGraph(data = {position:0})
	{
		const width = D.textWidth(this.properName);
		const position = data.position;
		data.position += width;
		return new Graph(this.diagram, {position, width});
	}
	getFactorProperName(indices)
	{
		return this.properName;
	}
	isTerminal() { return false; }		// fitb
	isInitial() { return false; }
	getSize() { return Number.MAX_VALUE; }
	getHtmlRep(idPrefix, config = {addbase:true})
	{
		const id = this.elementId(idPrefix);
		const onclick = 'onclick' in config ? config.onclick : e => Cat.R.diagram.placeObject(e, this.name, D.mouse.diagramPosition(R.diagram));
		const ondragstart = 'ondrag' in config ? config.ondrag : e => Cat.D.DragElement(e, this.name);
		const draggable = 'draggable' in config ? config.draggable : 'false';
		const items = [];
		if ('addbase' in config && config.addbase)
			items.push(H3.span(this.basename, '.bold'));
		if (this.properName !== '' & this.properName !== this.basename)
			items.push(H3.span(this.properName, '.smallPrint'));
		return H3.div('.panelElt.grabbable.sidenavRow', {id, draggable, ondragstart, onclick, title:this.description}, items);
	}
	static FromName(diagram, name)
	{
		const tokens = name.split('/');
		const basename = tokens.pop();
		return new CatObject(diagram, {basename});
	}
}

class FiniteObject extends CatObject	// finite, explicit size or not
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		if (('basename' in nuArgs && nuArgs.basename === '') || !('basename' in nuArgs))
			nuArgs.basename = 'size' in nuArgs ? '#' + Number.parseInt(nuArgs.size).toString() : diagram.getAnon('#');
		if ('size' in nuArgs && !('properName' in nuArgs))
		{
			if (nuArgs.size === 0)
				nuArgs.properName = '&empty;';
			else if (nuArgs.size === 1)
				nuArgs.properName = '&#10034;';
			else
				nuArgs.properName = FiniteObject.ProperName(diagram, nuArgs.basename, nuArgs.size);
		}
		if (!('name' in nuArgs))
			nuArgs.name = FiniteObject.Codename(diagram, {basename:nuArgs.basename, size:'size' in nuArgs ? nuArgs.size : ''});
		super(diagram, nuArgs);
		if ('size' in nuArgs && nuArgs.size !== '')
			Object.defineProperty(this, 'size', {value:	Number.parseInt(nuArgs.size), writable:	false});
		if ('size' in this)		// signature is the sig of the coproduct of 1's/Show
			this.signature = U.Sig(this.size.toString());
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Finite object'), H3.td('size' in this ? 'size: ' + this.size.toString() : 'indeterminate size')));
		return help;
	}
	json()
	{
		const d = super.json();
		if ('size' in this)
			d.size = Number.parseInt(this.size);
		return d;
	}
	getSize() { return 'size' in this ? this.size : super.getSize(); }
	isIterable() { return 'size' in this && this.size < Number.MAX_VALUE; }
	isTerminal() { return this.size === 1; }
	isInitial() { return this.size === 0; }
	static Basename(diagram, args)
	{
		const basename = 'basename' in args ? args.basename : '';
		const size = 'size' in args ? args.size : '';
		return basename === '' ? (size === '' ? basename : `${basename}#${Number.parseInt(size)}`) : basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:FiniteObject.Basename(diagram, args)});
	}
	static ProperName(diagram, basename, size)
	{
		if (size && size !== '')
		{
			if (size === 0)
				return '&empty;';
			else if (size === 1)
				return '&#10034;';
			return size.toString();
		}
		return basename;
	}
}

class MultiObject extends CatObject
{
	constructor(diagram, args)
	{
		if (args.objects.length <= 1)
			throw 'not enough objects';
		const nuArgs = U.Clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'objects', {value:	nuArgs.objects.map(o => this.diagram.getElement(o)), writable:	false});
		this.objects.map(o => o.incrRefcnt());
		this.signature = U.SigArray([U.Sig((this.dual ? 'Co' : '') + this.constructor.name), ...this.objects.map(o => o.signature)]);
	}
	help(hdr)
	{
		const help = super.help();
		help.appendChild(hdr);
		this.objects.map(o => help.appendChild(H3.tr(H3.td(o.getHtmlRep()))));
		return help;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.objects.map(o => o.decrRefcnt());
	}
	json()
	{
		const a = super.json();
		a.objects = this.objects.map(o => o.name);
		delete a.properName;
		return a;
	}
	getFactor(factor)
	{
		if (Array.isArray(factor))
		{
			if (factor.length > 0)
			{
				if (factor[0] === -1)
					return this.diagram.get('FiniteObject', {size:this.dual ? 0 : 1});
				return this.objects[factor[0]].getFactor(factor.slice(1));
			}
			return this;
		}
		return this.objects[factor];
	}
	getFactorName(factor)
	{
		return this.getFactor(factor).name;
	}
	getFactorProperName(indices)
	{
		const f = this.getFactor(indices);
		return `${f.properName}${U.subscript(indices)}`;
	}
	needsParens()
	{
		return true;
	}
	getGraph(tag, data, parenWidth, sepWidth, first = true, nuRoot = false)	// data: {position: 0}
	{
		const doit = !first && this.needsParens();
		const pw = doit ? parenWidth : 0;
		const position = data.position;
		data.position += pw;
		const cap = this.objects.length - 1;
		const graphs = this.objects.map((o, i) =>
			{
				const g = o.getGraph(data, nuRoot);
				if (this.resetPosition())
					data.position = 0;
				else if (i < cap)
					data.position += sepWidth;
				return g;
			});
		data.position += pw;
		const width = data.position - position;
		return new Graph(this.diagram, {position, width, graphs});
	}
	resetPosition()
	{
		return false;
	}
	canChangeProperName()
	{
		return false;
	}
	isIterable()	// Default is for a MultiObject to be iterable if all its morphisms are iterable.
	{
		return this.objects.reduce((r, o) => r && o.isIterable(), true);
	}
	basenameIncludes(val)
	{
		for (let i=0; i<this.objects.length; ++i)
			if (this.objects[i].basenameIncludes(val))
				return true;
		return false;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static ProperName(sep, objects, reverse = false)
	{
		const obs = reverse ? objects.slice().reverse() : objects;
		return obs.map(o => Array.isArray(o) ? MultiObject.ProperName(sep, o, reverse) : o.needsParens() ? `(${o.properName})` : o.properName).join(sep);
	}
	static GetObjects(diagram, objects)
	{
		return objects.map(o =>
		{
			const ob = diagram.getElement(o);
			if (!ob)
				throw `cannot get object ${o}`;
			return ob;
		});
	}
}

class ProductObject extends MultiObject
{
	constructor(diagram, args)
	{
		const dual = U.GetArg(args, 'dual', false);
		const nuArgs = U.Clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = ProductObject.Basename(diagram, {objects:nuArgs.objects, dual});
		nuArgs.properName = ProductObject.ProperName(nuArgs.objects, dual);
		nuArgs.description = `The ${dual ? 'coproduct' : 'product'} of the objects ${nuArgs.objects.map(o => o.properName).join(', ')}.`;
		super(diagram, nuArgs);
		this.constructor.name === 'ProductObject' && R.EmitElementEvent(diagram, 'new', this);
		this.signature = ProductObject.Signature(diagram, this.objects, this.dual);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td(this.dual ? 'Coproduct' : 'Product')));
	}
	getFactor(factor)
	{
		if (factor === -1)
			return this.diagram.get('FiniteObject', {size:this.dual ? 0 : 1});
		return super.getFactor(factor);
	}
	getGraph(data = {position:0}, first = true)
	{
		if ('dual' in data && this.dual !== data.dual)
			return new Graph(this.diagram);
		return super.getGraph(this.constructor.name, data, D.textWidth('('), D.textWidth(this.dual ? '&plus;' : '&times;'), first);
	}
	allSame()
	{
		const obj = this.objects[0];
		for (let i=1; i<this.objects.length; ++i)
			if (!obj.isEquivalent(this.objects[i]))
				return false;
		return true;
	}
	find(obj, index = [])
	{
		const fctrs = [];
		this.objects.map((o, i) =>
		{
			const ndx = index.slice();
			ndx.push(i);
			if (obj.name === o.name)	// by name not by equivalence
			{
				fctrs.push(ndx);
			}
			else
			{
				const base = o instanceof NamedObject ? o.base : o;
				if (base instanceof ProductObject && base.dual === this.dual)		// continue the search hierarchically
				{
					const subFctrs = base.find(obj, ndx);
					subFctrs.length > 0 && fctrs.push(...subFctrs);
				}
			}
		});
		return fctrs;
	}
	getSize()
	{
		return this.objects.reduce((r, o) => this.dual ? r + o.getSize() : r * o.getSize(), this.dual ? 0 : 1);
	}
	[Symbol.iterator]()
	{
		const that = this;
		if (this.dual)
		{
			let ndx = 0;
			let iter = this.objects[0][Symbol.iterator]();
			return {
				next()
				{
					const nxt = iter.next();
					if (nxt.done && ndx < that.objects.length -1)
					{
						iter = that.objects[++ndx][Symbol.iterator]();
						return iter.next();
					}
					else
						return {value:undefined, done:true};
				}
			};
		}
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		return `${c}Po{${args.objects.map(o => typeof o === 'string' ? o : o.name).join(',')}}oP${c}`;
	}
	static Codename(diagram, args)
	{
		const objects = diagram.getElements(args.objects);
		const dual = 'dual' in args ? args.dual : false;
		if (!objects || objects.length === 0)
			return dual ? '#0' : '#1';
		if (objects.length === 1)
			return typeof objects[0] === 'object' ? objects[0].name : objects[0];
		return Element.Codename(diagram, {basename:ProductObject.Basename(diagram, {objects, dual})});
	}
	static ProperName(objects, dual = false)
	{
		return MultiObject.ProperName(dual ? '&plus;' : '&times;', objects);
	}
	static CanFlatten(obj)
	{
		return obj instanceof ProductObject && obj.objects.reduce((r, o) => r || (o instanceof ProductObject && o.dual === obj.dual), false);
	}
	static Signature(diagram, objects, dual = false)
	{
		return U.SigArray([dual, ...objects.map(o => o.signature)]);
	}
	static Get(diagram, args)
	{
		if ('objects' in args && args.objects.length === 0)
		{
			const size = ('dual' in args && args.dual) ? 0 : 1;
			return diagram.get('FiniteObject', {size});
		}
		const sig = ProductObject.Signature(diagram, args.objects, args.dual);
		let found = null;
		diagram.codomain.elements.forEach(elt =>
		{
			if (sig === elt.signature)
				found = elt;
		});
		return found;
	}
}

class PullbackObject extends ProductObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.dual = U.GetArg(args, 'dual', false);
		nuArgs.morphisms = 'morphisms' in args ? diagram.getElements(args.morphisms) : diagram.getElements(args.morphisms);
		nuArgs.objects = nuArgs.morphisms.map(m => m.domain);
		nuArgs.basename = PullbackObject.Basename(diagram, {morphisms:nuArgs.morphisms});
		nuArgs.properName = PullbackObject.ProperName(nuArgs.morphisms);
		nuArgs.name = PullbackObject.Codename(diagram, {morphisms:nuArgs.morphisms});
		super(diagram, nuArgs);
		this.morphisms = nuArgs.morphisms;
		this.morphisms.map(m => m.incrRefcnt());
		if ('cone' in nuArgs)
			this.cone = nuArgs.cone;
		else
		{
			const cone = [];
			this.morphisms.map((m, i) =>
			{
				const pbm = diagram.get('FactorMorphism', {domain:this, factors:[i], dual:this.dual});
				cone.push(pbm.name);
			});
			this.cone = cone;
		}
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:', H3.td('Pullback object'))));
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.morphisms.map(m => m.decrRefcnt());
		}
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.morphisms = this.morphisms.map(m => m.name);
		a.cone = this.cone;
		return a;
	}
	needsParens()
	{
		return true;
	}
	canChangeProperName()
	{
		return false;
	}
	loadEquivalences()
	{
		for (let i=1; i<this.cone.length; ++i)
		{
			const base = [this.diagram.getElement(this.cone[0]), this.morphisms[0]];
			const leg = [this.diagram.getElement(this.cone[i]), this.morphisms[i]];
			R.LoadEquivalences(this.diagram, this, base, leg);
		}
	}
	getDecoration()
	{
		return '&#8991;';
	}
	static Basename(diagram, args)
	{
		return `Pb{${args.morphisms.map(m => m.name).join(',')}}bP`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:PullbackObject.Basename(diagram, args)});
	}
	static ProperName(morphisms, dual = false)
	{
		return morphisms.map(m => m.domain.needsParens() ? `(${m.domain.properName})` : m.domain.properName).join(dual ? '&plus' : '&times;') + '/' +
			morphisms[0].codomain.properName;
	}
}

class HomObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = HomObject.Basename(diagram, {objects:nuArgs.objects});
		nuArgs.properName = HomObject.ProperName(nuArgs.objects);
		nuArgs.description = `The homset from ${nuArgs.objects[0].properName} to ${nuArgs.objects[1].properName}`;
		super(diagram, nuArgs);
		this.signature = HomObject.Signature(diagram, nuArgs.objects);
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type'), H3.td('Hom')));
	}
	homDomain()
	{
		return this.objects[0];
	}
	homCodomain()
	{
		return this.objects[1];
	}
	getFactorProperName(indices)
	{
		const f = this.getFactor(indices);
		return `${f.properName}${U.subscript(indices)}`;
	}
	getGraph(data = {position:0})
	{
		data.position += D.bracketWidth;
		const g = super.getGraph(this.constructor.name, data, 0, D.commaWidth, false, true);
		data.position += D.bracketWidth;
		return g;
	}
	needsParens()
	{
		return false;
	}
	baseHomDom()
	{
		let obj = this.objects[1];
		while (obj instanceof HomObject)
			obj = obj.homDomain();
		return obj;
	}
	static Basename(diagram, args)
	{
		return `Ho{${args.objects.map(o => o.name).join(',')}}oH`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:HomObject.Basename(diagram, args)});
	}
	static ProperName(objects)
	{
		return `[${objects[0].properName}, ${objects[1].properName}]`;
	}
	static Signature(diagram, objects)
	{
		return U.SigArray([2, ...objects.map(o => o.signature)]);
	}
}

class DiagramCore
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		const xy = U.GetArg(args, 'xy', new D2());
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,													writable:	false},
			name:			{value: nuArgs.name,												writable:	false},
			refcnt:			{value: 0,															writable:	true},
			x:				{value:	xy.x,														writable:	true},
			y:				{value:	xy.y,														writable:	true},
			width:			{value:	U.GetArg(nuArgs, 'width', 0),								writable:	true},
			height:			{value:	U.GetArg(nuArgs, 'height', D.default.font.height),			writable:	true},
			description:	{value:	U.GetArg(nuArgs, 'description', 'Lorem ipsum categoricum'), writable:	true},
		});
	}
	incrRefcnt()
	{
		this.refcnt++;
	}
	decrRefcnt()
	{
		this.refcnt--;
		this.refcnt <= 0 && this.svg !== null && this.svg.parentNode.removeChild(this.svg);
	}
	setXY(xy, grid = true)
	{
		this.x = grid ? D.Grid(xy.x) : xy.x;
		this.y = grid ? D.Grid(xy.y) : xy.y;
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	json()
	{
		const a =
		{
			name:		this.name,
			description:this.description,
			height:		this.height,
			xy:			this.getXY(),
			width:		this.width,
			prototype:	this.constructor.name,
		};
		return a;
	}
	showSelected(state = true)
	{
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	elementId()
	{
		return U.SafeId(`${this.constructor.name}_${this.name}`);
	}
	getDecoration()		// for commutative cells
	{
		return '&#10226;';
	}
	isDeletable()
	{
		return true;
	}
	isEquivalent(t)
	{
		return t && this.name === t.name;
	}
	update(xy = null)
	{
		this.setXY(xy ? xy : this.getXY());
		if (this.svg && this.svg.hasAttribute('x'))
		{
			this.svg.setAttribute('x', this.x);
			this.svg.setAttribute('y', this.y);
		}
	}
	isFusible()	// fitb
	{
		return false;
	}
	updateFusible(e)	// fitb
	{}
	updateGlow(state, glow)	// same as Element
	{
		this.svg && this.svg.classList.remove(...['glow', 'badGlow']);
		if (state)
			this.svg.classList.add(...[glow]);
	}
	emphasis(on)
	{
		D.SetClass('emphasis', on, this.svg);
	}
}

class DiagramText extends Element
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.basename = U.GetArg(nuArgs, 'basename', diagram.getAnon('t'));
		super(diagram, nuArgs);
		const xy = U.GetArg(nuArgs, 'xy', new D2());
		Object.defineProperties(this,
		{
			x:				{value:	xy.x,												writable:	true},
			y:				{value:	xy.y,												writable:	true},
			height:			{value:	U.GetArg(nuArgs, 'height', D.default.font.height),	writable:	true},
			weight:			{value:	U.GetArg(nuArgs, 'weight', 'normal'),				writable:	true},
		});
		this.refcnt = 1;
		diagram && diagram.addElement(this);
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const canEdit = this.isEditable() && this.diagram.isEditable();
		const id = this.elementId();
		const div = H3.div({id}, H3.tag('description', this.description, '##descriptionElt.tty'));
		if (canEdit)
		{
			div.appendChild(D.getIcon('EditElementText', 'edit', e => Cat.R.diagram.editElementText(e, this.name, id, 'description'), 'Commit editing', D.default.button.tiny));
			const selectWeight = H3.select({onchange:e => Cat.DiagramText.UpdateWeight(this.name, e.target.value), value:this.weight},
				['normal', 'bold', 'lighter', 'bolder'].map(w =>
				{
					const args = {value:w};
					if (w === this.weight)
						args.selected = 'selected';
					return H3.option(args, w);
				}));
			const inId = 'toolbar-help-text-height';
			const inputArgs = {type:"number", onchange:e => Cat.DiagramText.UpdateHeight(this.name, e.target.value), min:3, max:500, width:8, value:this.height};
			div.appendChild(H3.table(
				H3.tr(H3.td('Text height:'), H3.td(H3.input(`##${inId}.in100`, inputArgs, '.sidenavRow')),
				H3.tr(H3.td('Text weight:'), H3.td(selectWeight), '.sidenavRow'))));
		}
		return H3.tr(H3.td(div, {colspan:2}));
	}
	editText(e, attribute, value)	// only valid for attr == 'description'
	{
		const old = this.description;
		this.description = U.HtmlEntitySafe(value);
		this.svgText.innerHTML = this.tspan(U.HtmlEntitySafe(value));
		return old;
	}
	tspan()
	{
		return this.description.includes('\n') ? this.description.split('\n').map((t, i) => `<tspan text-anchor="left" x="0"${i > 0 ? ' dy="1.2em"' : ''}>${t}</tspan>`).join('') :
			this.description;
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const svgText = H3.text('.grabbable', {'text-anchor':'left', style:`font-size:${this.height}px; font-weight:${this.weight}`});
		const svg = H3.g('.diagramText.grabbable', {'data-type':'text', 'data-name':name, 'text-anchor':'left', id:this.elementId(),
			transform:`translate(${this.x} ${this.y + D.default.font.height/2})`}, svgText);
		svg.onmousedown = e => this.diagram.selectElement(e, name);
		svg.onmouseenter = e => Cat.D.Mouseover(e, this, true);
		svg.onmouseleave = e => Cat.D.Mouseover(e, this, false);
		node.appendChild(svg);
		this.svg = svg;
		this.svgText = svgText;
		svgText.innerHTML = this.tspan();
	}
	finishMove()
	{
		if (!this.orig || (this.x !== this.orig.x || this.y !== this.orig.y))
		{
			this.orig = this.getXY();
			return true;
		}
		return false;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.svg !== null && this.svg.parentNode.removeChild(this.svg);
			this.category && this.diagram.domain.deleteElement(this);
		}
	}
	setXY(xy, grid = true)
	{
		this.x = grid ? D.Grid(xy.x) : xy.x;
		this.y = grid ? D.Grid(xy.y) : xy.y;
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	json()
	{
		const a = super.json();
		a.xy = this.getXY();
		a.height = this.height;
		if (this.weight !== 'normal')
			a.weight = this.weight;
		return a;
	}
	showSelected(state = true)
	{
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	isDeletable()
	{
		return true;
	}
	isEquivalent(t)
	{
		return t && this.name === t.name;
	}
	update(xy = null)
	{
		this.setXY(xy ? xy : this.getXY());
		!this.svg && this.diagram.addSVG(this);
		if (this.svg)
		{
			this.svg.setAttribute('transform', `translate(${this.x} ${this.y + D.default.font.height/2})`);
			this.svgText.style.fontSize = `${this.height}px`;
			this.svgText.style.fontWeight = this.weight;
		}
	}
	isFusible()
	{
		return false;
	}
	updateFusible(e)
	{}
	getBBox()
	{
		const box = this.svg.getBBox();
		box.x += this.x;
		box.y += this.y;
		return box;
	}
	emphasis(on)
	{
		D.SetClass('emphasis', on, this.svgText);
	}
	getHtmlRep(idPrefix, config = {})
	{
		const div = H3.div();
		const id = this.elementId(idPrefix);
		const canEdit = R.diagram.isEditable();
		const delBtn = canEdit ? H3.span(D.getIcon('delete', 'delete', _ => Cat.R.Actions.delete.action(this.name, Cat.R.diagram, [this]), 'Delete text')) : null;	// TODO
		const editBtn = canEdit ? H3.span(D.getIcon('editDescription', 'edit', e => Cat.R.diagram.editElementText(e, this.name, id, 'description'), 'Edit')) : null;
		const inDiv = H3.div(H3.tag('description', this.description, {onmousedown: _ => Cat.R.diagram.viewElements(this)}), '.panelElt', {title:'Click to view'}, {id});
		editBtn && inDiv.appendChild(editBtn);
		div.appendChild(inDiv);
		div.onmouseenter = _ => Cat.R.diagram.emphasis(this.name, true);
		div.onmouseleave = _ => Cat.R.diagram.emphasis(this.name, false);
		return div;
	}
	static UpdateHeight(name, height)
	{
		const text = R.diagram.getElement(name);
		text.height = height;
		text.update();
		R.EmitTextEvent(R.diagram, 'update', text);
	}
	static UpdateWeight(name, weight)
	{
		const text = R.diagram.getElement(name);
		text.weight = weight;
		text.update();
		R.EmitTextEvent(R.diagram, 'update', text);
	}
}

class TensorObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = TensorObject.Basename(diagram, {objects:nuArgs.objects});
		nuArgs.properName = TensorObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td('Tensor')));
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.textWidth('('), D.textWidth('&otimes;'), first);
	}
	static Basename(diagram, args)
	{
		return `Po{${args.objects.map(o => o.name).join(',')}}oP`;
	}
	static Codename(diagram, args)
	{
		const objects = args.objects;
		if (!objects || objects.length === 0)
			return 'I';
		if (objects.length === 1)
			return typeof objects[0] === 'object' ? objects[0].name : objects[0];
		return Element.Codename(diagram, {basename:TensorObject.Basename(diagram, args)});
	}
	static ProperName(objects)
	{
		return MultiObject.ProperName('&otimes;', objects);
	}
	static CanFlatten(obj)
	{
		return obj instanceof TensorObject && obj.objects.reduce((r, o) => r || o instanceof TensorObject, false);
	}
}

class DiagramObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.basename = U.GetArg(args, 'basename', diagram.getAnon('o'));
		nuArgs.category = diagram.domain;
		if ('to' in args)
		{
			let to = diagram.getElement(args.to);
			if (!to)
				throw `no to! ${args.to}`;
			nuArgs.to = to;
		}
		super(diagram, nuArgs);
		this.incrRefcnt();
		const xy = U.GetArg(nuArgs, 'xy', new D2());
		Object.defineProperties(this,
		{
			x:			{value:	xy.x,												writable:	true},
			y:			{value:	xy.y,												writable:	true},
			orig:		{value:	{x:xy.x, y:xy.y},									writable:	true},
			width:		{value:	U.GetArg(nuArgs, 'width', 0),						writable:	true},
			height:		{value:	U.GetArg(nuArgs, 'height', D.default.font.height),	writable:	true},
			to:			{value:	null,												writable:	true},
			nodes:		{value:	new Set(),											writable:	false},
			domains:	{value:	new Set(),											writable:	false},
			codomains:	{value:	new Set(),											writable:	false},
			svg:		{value: null,												writable:	true},
		});
		this.setObject(nuArgs.to);
		this.constructor.name === 'DiagramObject' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return this.to.help();
	}
	json()
	{
		let a = super.json();
		a.to = this.to ? this.to.name : null;
		a.height = this.height;
		a.xy = this.getXY();
		a.width = this.width;
		return a;
	}
	setObject(to)
	{
		if (to === this.to)
			return;
		if (this.to && this.to !== to)
			this.to.decrRefcnt();
		to.incrRefcnt();
		this.to = to;
		this.width = D.textWidth(to.properName);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.to.decrRefcnt();
			this.removeSVG();
		}
		super.decrRefcnt();
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	setXY(xy)
	{
		this.x = D.Grid(xy.x);
		this.y = D.Grid(xy.y);
	}
	getBBox()
	{
		return this.svg.getBBox();
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const svg = H3.text({draggable:true});
		svg.onmouseenter = e => Cat.D.Mouseover(e, this, true);
		svg.onmouseleave = e => Cat.D.Mouseover(e, this, false);
		svg.onmousedown = e => R.diagram && R.diagram.selectElement(e, name);
		node.appendChild(svg);
		this.svg = svg;
		svg.setAttributeNS(null, 'data-type', 'object');
		svg.setAttributeNS(null, 'data-name', this.name);
		svg.setAttributeNS(null, 'text-anchor', 'middle');
		svg.setAttributeNS(null, 'class', 'object grabbable');
		svg.setAttributeNS(null, 'id', this.elementId());
		svg.setAttributeNS(null, 'x', this.x);
		svg.setAttributeNS(null, 'y', this.y + D.default.font.height/2);	// TODO should be this.height?
		svg.innerHTML = this.to.properName;
	}
	update(xy = null)
	{
		xy && this.setXY(xy);
		if (!this.svg)
			this.diagram.addSVG(this);
		const svg = this.svg;
		if (svg && svg.hasAttribute('x'))
		{
			svg.setAttribute('x', this.x);
			svg.setAttribute('y', this.y + ('height' in this ? this.height/2 : 0));
		}
		this.nodes.forEach(n => n.update());
		this.domains.forEach(o => o.update());
		this.codomains.forEach(o => o.update());
	}
	showSelected(state = true)
	{
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
		if ('dragAlternates' in this && !state)
		{
			this.dragAlternates.diagMorphisms.map(m => m.decrRefcnt());
			delete this.dragAlternatives;
		}
	}
	isIdentityFusible()
	{
		let isId = false;
		if (this.domains.size === 0 && this.codomains.size === 1)
		{
			const m = [...this.codomains][0].to;
			isId = Identity.IsIdentity(m);
		}
		return isId;
	}
	isFusible(o)
	{
		if (!o || this === 0)
			return false;
		return o instanceof DiagramObject && (this.to.isEquivalent(o.to) || this.isIdentityFusible());
	}
	updateFusible(e, on)
	{
		const s = this.svg;
		if (on)
		{
			s.classList.add(...['fuseObject']);
			s.classList.remove(...['selected', 'grabbable', 'object']);
			D.statusbar.show(e, 'Fuse');
			this.updateGlow(true, 'glow');
		}
		else
		{
			s.classList.add(...['selected', 'grabbable', 'object']);
			s.classList.remove(...['fuseObject']);
			D.statusbar.show(e, '');
			this.updateGlow(false, '');
		}
	}
	finishMove()
	{
		if (!this.orig || (this.x !== this.orig.x || this.y !== this.orig.y))
		{
			this.orig = this.getXY();
			return true;
		}
		return false;
	}
	isIsolated()
	{
		return this.domains.size === 0 && this.codomains.size === 0;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return this.to.getHtmlRep(idPrefix, nuConfig);
	}
}

class DiagramPullback extends DiagramObject
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.morphisms = args.morphisms.map(m =>
		{
			const mo = diagram.getElement(m);
			mo.incrRefcnt();
			return mo;
		});
		const object = this.morphisms[0].codomain;		// all have the same codomain
		if ('cone' in args)
			this.cone = args.cone;
		else
			this.cone = this.morphisms.map((m, index) =>
			{
				const to = diagram.get('FactorMorphism', {domain:this.to, factors:[index], dual:this.dual});
				const from = new DiagramMorphism(diagram, {to, anon:'pb', domain:this, codomain:this.morphisms[index].domain});
				return from.name;
			});
		R.EmitElementEvent(diagram, 'new', this);
	}
	json()
	{
		let a = super.json();
		a.morphisms = this.morphisms.map(m => m.name);
		a.cone = this.cone;
		return a;
	}
	getObjects()
	{
		const objs = new Set();
		objs.add(this);
		this.morphisms && this.morphisms.map(m =>
		{
			objs.add(m.domain);
			objs.add(m.codomain);
		});
		return [...objs];
	}
}

class Assertion extends Element
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		const left = nuArgs.left.map(m => diagram.getElement(m));
		const right = nuArgs.right.map(m => diagram.getElement(m));
		let idx = 0;
		let name = `a_0`;
		if (!('basename' in nuArgs))
		{
			while(diagram.assertions.has(Element.Codename(diagram, {basename:`a_${idx++}`})));
			nuArgs.basename = `a_${--idx}`;
		}
		super(diagram, nuArgs);
		left.map(m => m.incrRefcnt());
		right.map(m => m.incrRefcnt());
		if (!('description' in nuArgs))
			this.description = `The assertion that the composite of morphisms ${left.map(m => m.to.properName).join()} equals that of ${right.map(m => m.to.properName).join()}.`;
		Object.defineProperties(this,
		{
			cell:			{value: null, writable: true},
			left:			{value: left, writable: false},
			right:			{value: right, writable: false},
			svg:			{value: null, writable: true},
		});
		this.signature = Cell.Signature(left, right);
		this.incrRefcnt();		// nothing refers to them, to increment
		diagram.assertions.set(this.name, this);
		this.loadEquivalences();
		diagram.addElement(this);
		R.EmitElementEvent(diagram, 'new', this);
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.left.map(m => m.decrRefcnt());
			this.right.map(m => m.decrRefcnt());
			this.diagram.domain.deleteElement(this);
			this.removeEquivalence();
			this.diagram.assertions.delete(this.name);
			R.EmitAssertionEvent(this.diagram, 'delete', this);
		}
	}
	json()
	{
		const a = super.json();
		a.left = this.left.map(m => m.name);
		a.right = this.right.map(m => m.name);
		return a;
	}
	getSVG(node)
	{
		this.cell && this.cell.getSVG(node);
	}
	showSelected(state = true)
	{
		if (!this.svg)
		{
			console.error('assertion svg missing');
			return;
		}
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	canSave()
	{
		return true;
	}
	loadEquivalences()
	{
		R.LoadEquivalences(this.diagram, this, this.left.map(m => m.to), this.right.map(m => m.to));
	}
	removeEquivalence()
	{
		R.RemoveEquivalences(this.diagram, this.name);
		R.LoadDiagramEquivalences(this.diagram);
	}
	isFusible()
	{
		return false;
	}
	updateFusible()
	{}
	finishMove()
	{}
	setCell(cell)
	{
		cell.removeSVG();
		this.diagram.addSVG(cell);
		this.cell = cell;
		this.svg = cell.svg;
	}
	getXY()
	{
		return this.cell.getXY();
	}
	getBBox()
	{
		return this.cell.getBBox();
	}
	static GetLegs(ary)
	{
		const legs = [[], []];
		if (!ary.reduce((r, m) => r && m instanceof DiagramMorphism, true))
			return legs;		// not all morphisms
		let domain = ary[0].domain;
		let leg = 0;
		for (let i=0; i<ary.length; ++i)
		{
			const m = ary[i];
			if (m.domain !== domain)
			{
				if (leg > 0) // oops not a diagram cell: too many legs
					break;
				leg = 1;
			}
			domain = m.codomain;
			legs[leg].push(m);
		}
		return legs;
	}
	static HasForm(diagram, left, right)
	{
		const length0 = left.length;
		const length1 = right.length;
		if (length0 === 0 || length1 === 0)
			return false;	// bad legs
		const sig = Cell.Signature(left, right);
		const cell = diagram.domain.cells.get(sig);
		return cell && !cell.comuutes && left[0].domain === right[0].domain && left[length0 -1].codomain === right[length1 -1].codomain;	// legs have same domain and codomain
	}
}

class Action extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.category = diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'priority', {value:U.GetArg(args, 'priority', 0),	writable:	false});
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td('Action')));
	}
	action(e, diagram, ary) {}	// fitb
	hasForm(diagram, ary) {return false;}	// fitb
	hidden() { return false; }		// fitb
}

class CompositeAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create composite',
			basename:		'composite',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		const from = this.doit(e, diagram, morphisms);
		diagram.log({command:'composite', morphisms:names});
		diagram.antilog({command:'delete', elements:[from.name]});
		diagram.makeSelected(from);
	}
	doit(e, diagram, morphisms)
	{
		const to = diagram.get('Composite', {morphisms:morphisms.map(m => m.to)});
		const from = new DiagramComposite(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms), morphisms});
		R.EmitDiagramEvent(diagram, 'makeCells');
		return from;
	}
	replay(e, diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		this.doit(null, diagram, morphisms);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length > 1 && ary.reduce((hasIt, r) => hasIt && r instanceof DiagramMorphism, true))
		{
			let cod = ary[0].codomain;
			for(let i=1; i<ary.length; ++i)
			{
				const m = ary[i];
				if (m.domain.name !== cod.name)
					return false;
				cod = m.codomain;
			}
			return true;
		}
		return false;
	}
	static Reduce(leg)
	{
		if (leg.length === 1 && leg[0] instanceof Composite)
			return leg[0].morphisms;
		return null;
	}
}

class IdentityAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create identity morphism',
			basename:		'identity',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const domain = ary[0];
		const m = this.doit(e, diagram, domain);
		diagram.log({command:'identity', domain:domain.name});
		diagram.antilog({command:'delete', elements:[m.name]});
	}
	doit(e, diagram, domain, save = true)
	{
		const id = diagram.get('Identity', {domain:domain.to});
		return diagram.placeMorphismByObject(e, 'domain', domain, id, save);
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, diagram.getElement(args.domain), false);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramObject;
	}
	static Reduce(leg)		// remove identities
	{
		const nuLeg = leg.filter(m => !(m instanceof Identity) && m.domain.name === m.codomain.name);
		return nuLeg.length < leg.legnth ? nuLeg : null;
	}
}

class NameAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create named element',
			basename:		'name',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		try
		{
			const sourceNdx = ary[0];
			const args =
			{
				command:		this.name,
				sourceNdx,
				basename:		U.HtmlSafe(			document.getElementById('named-element-new-basename').value.trim()),
				properName:		U.HtmlEntitySafe(	document.getElementById('named-element-new-properName').value.trim()),
				description:	U.HtmlEntitySafe(	document.getElementById('named-element-new-description').value),
			};
			const ndxNamed = this.doit(e, diagram, args);
			const named = ndxNamed.to;
			args.sourceNdx = sourceNdx.name;
			diagram.log(args);
			const elements = sourceNdx instanceof CatObject ? [named.idFrom.name, named.idTo.name, named.name] : [named.name];
			diagram.antilog({command:'delete', elements});
		}
		catch(x)
		{
			const error = document.getElementById('named-element-new-error');
			error.style.padding = '4px';
			error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	doit(e, diagram, args)
	{
		const sourceNdx = args.sourceNdx;
		args.source = sourceNdx.to;
		if (sourceNdx instanceof CatObject)
		{
			const nid = new NamedObject(diagram, args);
			const idToNdx = diagram.placeMorphismByObject(e, 'domain', sourceNdx, nid.idTo);
			const idFromNdx = new DiagramMorphism(diagram, {to:nid.idFrom, domain:idToNdx.codomain, codomain:sourceNdx});
			return idToNdx.codomain;
		}
		else if (sourceNdx instanceof Morphism)
		{
			const nuArgs = U.Clone(args);
			nuArgs.domain = sourceNdx.domain.to;
			nuArgs.codomain = sourceNdx.codomain.to;
			const to = new NamedMorphism(diagram, nuArgs);
			const nuFrom = new DiagramMorphism(diagram, {to, domain:sourceNdx.domain, codomain:sourceNdx.codomain});
			sourceNdx.update();
			diagram.makeSelected(nuFrom);
			R.EmitDiagramEvent(diagram, 'makeCells');
			return nuFrom;
		}
	}
	replay(e, diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.source = diagram.getElement(args.source);
		this.doit(e, diagram, nuArgs);
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		/*
		let html =
			H.h5('Create Named Element') +
			H.table(H.tr(H.td(D.Input('', 'named-element-new-basename', 'Base name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'named-element-new-properName', 'Proper name')
						), 'sidenavRow') +
					H.tr(H.td(H.input('', 'in100', 'named-element-new-description', 'text',
										{ph: 'Description'})), 'sidenavRow')
			) +
			H.span(D.GetButton('namedElement', 'edit', `Cat.R.Actions.name.create(event)`, 'Create named element')) +
			H.span('', 'error', 'named-element-new-error');
		D.toolbar.help.innerHTML = html;
			*/
		D.RemoveChildren(D.toolbar.help);
		const elements = [
			H3.h5('Create Named Element'),
			H3.table(H3.tr(H3.td(H3.Input('##named-element-new-basename', {placeholder:'Base name'})), '.sidenavRow'),
					H3.tr(H3.td(H3.Input('##named-element-new-properName', {placeholder:'Proper name'})), '.sidenavRow'),
					H3.tr(H3.td(H3.input('##named-element-new-description.in100', {type:'text', placeholder:'Description'})), '.sidenavRow')),
			D.getIcon('namedElement', 'edit', e => this.create(e), 'Create named element'),
			H3.span('##named-element-new-error.error')];
		elements.map(elt => D.toolbar.help.appendChild(elt));
	}
	create(e)
	{
		this.action(e, R.diagram, R.diagram.selected);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && (ary[0] instanceof DiagramMorphism || ary[0] instanceof DiagramObject);
	}
	static Reduce(leg)
	{
		return null;
	}
}

class CopyAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Copy an element',
			basename:		'copy',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		let elt = null;
		let args = {};
		if (from instanceof DiagramMorphism)
		{
			let dom = new D2(from.domain.getXY()).add(D.default.stdOffset);
			let cod = new D2(from.codomain.getXY()).add(D.default.stdOffset);
			args = {command: 'copy', source:from.to, xy:dom, xyCod:cod};
		}
		else if (from instanceof DiagramObject)
		{
			const xy = new D2(from.getXY()).add(D.default.stdOffset);
			args = {command: 'copy', source:from.to, xy};
		}
		else if (from instanceof DiagramText)
		{
			const xy = new D2(from.getXY()).add(D.default.stdOffset);
			args = {command: 'copy', source:from.description, xy, height:from.height, weight:from.weight};
		}
		elt = this.doit(e, diagram, args);
		R.EmitDiagramEvent(diagram, 'makeCells');
		diagram.log(args);
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, args)
	{
		const source = args.source;
		if (source instanceof Morphism)
			return diagram.placeMorphism(e, source, args.xy, args.xyCod, args.save);
		else if (source instanceof CatObject)
			return diagram.placeObject(e, source, args.xy, args.save);
		else if (typeof source === 'string')
			return diagram.placeText(e, args.xy, source, args.height, args.weight);
	}
	replay(e, diagram, args)
	{
		const source = diagram.getElement(args.source);
		this.doit(e, diagram, args);
	}
	hasForm(diagram, ary)	// one element
	{
		if (diagram.isEditable() && ary.length === 1)
		{
			const elt = ary[0];
			if (elt instanceof Assertion)
				return false;
			return true;
		}
	}
}

class FlipNameAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Flip the name',
			basename:		'flipName',
			priority:		89,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		this.doit(e, diagram, from);
		diagram.log({command:'flipName', from:from.name});
		diagram.antilog({command:'flipName', from:from.name});
		R.EmitElementEvent(diagram, 'update', from);
	}
	doit(e, diagram, from)
	{
		from.flipName = !from.flipName;
		from.update();
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, diagram.getElement(args.from));
	}
	hasForm(diagram, ary)	// one element
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramMorphism;
	}
	hidden() { return true; }
}

class ProductAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Create ${dual ? 'co' : ''}product of two or more objects or morphisms`,
			basename:		dual ? 'coproduct' : 'product',
			dual,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, morphisms, log = true)
	{
		const names = morphisms.map(m => m.name);
		const elt = this.doit(e, diagram, morphisms);
		log && diagram.log({command:this.name, elements:names});
		log && diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, elements)
	{
		const elt = elements[0];
		if (elt instanceof DiagramMorphism)
		{
			const morphisms = elements.map(m => m.to);
			const to = diagram.get('ProductMorphism', {morphisms, dual:this.dual});
//			return diagram.placeMorphism(e, to, D.Barycenter(elements), elt.domain.getXY(), elt.codomain.getXY());
			return diagram.placeMorphism(e, to, elt.domain.getXY(), elt.codomain.getXY());
		}
		else if (elt instanceof DiagramObject)
		{
			const objects = elements.map(o => o.to);
			const to = diagram.get('ProductObject', {objects, dual:this.dual});
			return diagram.placeObject(e, to, elt);
		}
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	hasForm(diagram, ary)
	{
		if (ary.length < 2)
			return false;
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && v instanceof DiagramObject, true) ||
			ary.reduce((hasIt, v) => hasIt && v instanceof DiagramMorphism, true));
	}
}

class ProductEditAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Edit a ${dual ? 'co' : ''}product`,
			basename:		dual ? 'coproductEdit' : 'productEdit',
			dual,
		};
		super(diagram, args);
		this.table = null;
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	html(e, diagram, ary)
	{
		D.RemoveChildren(D.toolbar.help);
		const elt = ary[0].to;
		let top = null;
		if (elt instanceof ProductObject)
		{
			const used = new Set();
			diagram.codomain.forEachMorphism(m =>
			{
				if (m instanceof FactorMorphism && m.dual === this.dual)
				{
					let base = m[this.dual ? 'codomain' : 'domain'];
					if (base instanceof NamedObject)
						base = base.base;
					m.factors.map(fctr => elt.objects.includes(base.objects[fctr]) && used.add(base.objects[fctr]));
				}
			});
			this.table = H3.table(
			[
				...elt.objects.map((o, i) =>
				{
					const style = {style:'width:12px'};
					const row = [
						H3.td(style),
						H3.td(style),
						H3.td(!used.has(o) ? D.getIcon(this.name, 'delete', e => Cat.R.Actions[this.name].remove(e, this), 'Remove', D.default.button.tiny) : '&nbsp;', style),
						H3.td(o.properName),
					];
					return H3.tr(row, {'data-ndx':i, 'data-name':o.name});
				}),
				this.getObjectSelectorRow(diagram),
			]);
			top = H3.div([	H3.h4(`Edit a ${this.dual ? 'Cop' : 'P'}roduct`),
							this.table,
							D.getIcon(this.name, 'edit', e => Cat.R.Actions[this.name].action(e, Cat.R.diagram, elt.name), 'Commit editing', D.default.button.tiny)]);
			this.updateTable();
		}
		D.toolbar.help.appendChild(top);
	}
	updateRow(row)
	{
		const cnt = this.table.children.length;
		const up = row.children[0];
		const down = row.children[1];
		const i = row.rowIndex;
		i === 0 && up.children.length > 0 && D.RemoveChildren(row.children[0].children);
		i > 0 && up.children.length === 0 && up.appendChild(D.getIcon(this.name, 'up', e => Cat.R.Actions[this.name].up(e, this), 'Move down', D.default.button.tiny));
		i < cnt -1 && down.children.length === 0 && down.appendChild(D.getIcon(this.name, 'down', e => Cat.R.Actions[this.name].down(e, this), 'Move down', D.default.button.tiny));
	}
	updateTable()
	{
		let row = this.table.firstElementChild;
		do
		{
			this.updateRow(row);
		}
		while((row = row.nextSibling));
	}
	getObjectSelectorRow(diagram)
	{
		const newFactor = _ =>
		{
			if (this.options.selectedIndex !== 0)
			{
				const editor = Cat.R.Actions[this.name];
				editor.table.appendChild(editor.getObjectSelectorRow(diagram));
				editor.updateTable();
			}
		};
		return H3.tr([H3.td(''), H3.td(''), H3.td(''), H3.td(diagram.getObjectSelector('new-factor', 'Add object', newFactor))]);
	}
	getTableRow(elt)
	{
		while(elt.parentNode.constructor.name !== 'HTMLTableElement')
			elt = elt.parentNode;
		return elt;
	}
	up(e, elt)
	{
		const ndx = this.getTableRow(elt).rowIndex;
		this.table.insertBefore(this.table.rows[ndx], this.table.rows[ndx -1]);
		this.updateTable();
	}
	down(e, elt)
	{
		const ndx = this.getTableRow(elt).rowIndex;
		this.table.insertBefore(this.table.rows[ndx +1], this.table.rows[ndx]);
		this.updateTable();
	}
	remove(e, elt)
	{
		this.table.removeChild(this.getTableRow(elt));
		this.updateTable();
	}
	action(e, diagram, objName, log = true)
	{
		const factors = [];
		const rows = this.table.rows;
		const sz = rows.length;
		const elt = diagram.getElement(objName);
		const objects = [];
		let ndx = 0;
		for (let i=0; i<sz; ++i)
		{
			const row = rows[i];
			if (row.children[3].children.length === 0)
			{
				objects.push(diagram.getElement(row.dataset.name));
				factors[Number.parseInt(row.dataset.ndx)] = ndx;
			}
			else	// new object
			{
				const val = row.children[3].children[0].value;
				if (val !== 'Add object')
				{
					objects.push(diagram.getElement(val));
					ndx++;
				}
			}
		}
		this.doit(e, diagram, elt, factors);
		log && diagram.log({command:this.name, old:elt.name, factors});
		// 	TODO antilog
	}
	doit(e, diagram, oldProd, factors)
	{
		const elt = elements[0];
		const nuProd = diagram[this.dual ? 'coprod' : 'prod'](...objects);
		if (elt instanceof DiagramMorphism)
		{
			// TODO
		}
		else if (elt instanceof DiagramObject)
		{
			const objMap = new Map();
			diagram.elements.forEach(function(elt)
			{
				let base = elt;
				if (elt === oldProd)
				{
					const oldIndexes = diagram.domain.find(elt);
					const nuIndexes = oldIndexes.map(o => new DiagramObject(diagram, {to:nuProd, xy:o.getXY()}));
					nuIndexes.map((ndx, i) => objMap.set(oldIndexes[i], ndx));
				}
				else if (elt instanceof NamedObject && elt.source === elt)
				{
					const nuNo = new NamedObject(diagram, {basename:elt.basename, source:nuProd});
					const oldIndexes = diagram.domain.find(elt);
				}
				else if (elt instanceof Morphism)
				{
					const src = this.dual ? elt.codomain : elt.domain;
					if ((elt instanceof FactorMorphism && src === oldProd) || (src instanceof NamedObject && src.base === oldProd))
					{
						const nuFactors = [];
						for (let i=0; i<elt.factors.length; ++i)
						{
							const oldFctr = elt.factors[i];
							factors.map(nuFctr =>
							{
								if (Array.isArray(oldFctr) && oldFctr[0] === nuFctr)		// is a sub-factor?
								{
									const repFctr = [nuFctr];
									if (oldFctr.length > nuFctr.length)
										repFctr.push(...oldFctr.slice(nuFctr.length, oldFctr.length));
									nuFactors.push(repFctr);
								}
								else
									nuFactors.push(nuFctr);
							});
						}
						const nuFctrMorph = diagram.fctr(nuProd, nuFactors);
						const oldIndexes = diagram.domain.find(elt);
						oldIndexes.map(ndx =>
						{
							const domain = nuProd.dual ? objMap(elt.domain) : ndx.domain;
							const codomain = nuProd.dual ? ndx.codomain : objMap(elt.codomain);
							new DiagramMorphism(diagram, {to:nuFctrMorph, domain, codomain});
						});
					}
				}
			});
		}
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);	// TODO
	}
	hasForm(diagram, ary)
	{
		return ary.length === 1 && ary[0].isEditable() && ary[0].to instanceof ProductObject && ary[0].to.dual === this.dual;
	}
}

class PullbackAction extends Action
{
	constructor(diagram, dual)
	{
		const basename = dual ? 'pushout' : 'pullback';
		const args =
		{
			description:	`Create a ${dual ? 'pushout' : 'pullback'} of two or more morphisms with a common ${dual ? 'domain' : 'codomain'}`,
			basename,
			dual,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		const pg = this.doit(e, diagram, morphisms);
		diagram.log({command:this.name, morphisms:names});
		// 	TODO antilog
		diagram.deselectAll(e);
		diagram.addSelected(pb);
	}
	doit(e, diagram, source)
	{
		const morphisms = source.map(m => m.to);
		const to = diagram.get('PullbackObject', {morphisms, dual:this.dual});
		const bary = D.Barycenter(morphisms.map(m => m.domain));
		const sink = this.dual ? morphisms[0].domain : morphisms[0].codomain;
		const xy = bary.add(bary.subtract(sink));
		const pb = new DiagramPullback(diagram, {xy, to, morphisms:source, dual:this.dual});
		R.EmitDiagramEvent(diagram, 'makeCells');
		return pb;
	}
	replay(e, diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		this.doit(e, diagram, morphisms);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && this.dual ? Category.IsSource(ary) : Category.IsSink(ary);
	}
}

class ProductAssemblyAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Create a ${dual ? 'co' : ''}product assembly of two or more morphisms with a common ${dual ? 'co' : ''}domain`,
			basename:		`${dual ? 'co' : ''}productAssembly`,
			dual,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		const elt = this.doit(e, diagram, morphisms);
		diagram.log({command:this.name, morphisms:names});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, diagramMorphisms)
	{
		const morphisms = diagramMorphisms.map(m => m.to);
		const m = diagram.get('ProductAssembly', {morphisms, dual:this.dual});
		return diagram.placeMorphismByObject(e, 'domain', diagramMorphisms[0].domain, m);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && this.dual ? Category.IsSink(ary) : Category.IsSource(ary);
	}
}

class MorphismAssemblyAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Attempt to assemble a morphism from a node in your diagram',
			basename:		'morphismAssembly',
			priority:		10,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	html(e, diagram, ary)
	{
		D.RemoveChildren(D.toolbar.help);
		const issues = diagram.assemble(e, ary[0]);
		const rows = issues.map(isu => H3.tr([H3.td(isu.message), H3.td(H3.button(isu.element.to.properName,
			{
				onmouseenter:	`Cat.R.diagram.emphasis('${isu.element.name}', true)`,
				onmouseleave:	`Cat.R.diagram.emphasis('${isu.element.name}', false)`,
				onclick: 		`Cat.R.diagram.viewElements('${isu.element.name}')`,
			}))]));
		D.toolbar.help.appendChild(issues.length > 0 ? H3.table(rows) : H3.span('No issues were detected'));
	}
	action(e, diagram, ary)
	{
		const source = ary[0];
		const elt = this.doit(e, diagram, source);
		diagram.log({command:this.name, source:source.name});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, source)
	{
		return diagram.assemble(e, source);
	}
	hasForm(diagram, ary)
	{
		return ary.length === 1 && ary[0].isEditable() && ary[0] instanceof DiagramObject;
	}
}

class HomAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a hom object or morphism from two such items',
						basename:		'hom'};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, elements)
	{
		const names = elements.map(m => m.name);
		const elt = this.doit(e, diagram, elements);
		diagram.log({command:this.name, elements:names});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, elements)
	{
		const xy = D.Barycenter(elements);
		if (elements[0] instanceof DiagramObject)
			return diagram.placeObject(e, diagram.get('HomObject', {objects:elements.map(o => o.to)}), xy);
		else if (elements[0] instanceof DiagramMorphism)
			return diagram.placeMorphism(e, diagram.get('HomMorphism', {morphisms:elements.map(m => m.to)}), xy);
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	hasForm(diagram, ary)	// two objects or morphisms
	{
		return diagram.isEditable() && ary.length === 2 && (ary.reduce((hasIt, v) => hasIt && v instanceof DiagramObject, true) ||
			ary.reduce((hasIt, v) => hasIt && v instanceof DiagramMorphism, true));
	}
}

class HomObjectAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Select a morphism listed from a common ${dual ? 'co' : ''}domain`,
			dual,
			basename:		dual ? 'homLeft' : 'homRight',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const domain = ary[0];
		const morphism = ary[1];
		const elt = this.doit(e, diagram, domain, morphism);
		diagram.log({command:this.name, domain:domain, morphism:morphism});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	html(e, diagram, ary)
	{
		if (ary.length === 1)
		{
			const from = ary[0];
			let rows = [];
			const to = from.to;
			diagram.codomain.forEachMorphism(m =>
			{
				const obj = this.dual ? m.codomain : m.domain;
				if (m instanceof Morphism && to.isEquivalent(obj) && to.properName === obj.properName && (m.diagram.name === diagram.name || diagram.allReferences.has(m.diagram.name)))
					rows.push(D.HtmlRow3(m, {onclick:e => Cat.R.Actions[this.basename].action(e, Cat.R.diagram, [from.name, m.name])}));
			});
			const help = D.toolbar.help;
			D.RemoveChildren(help);
			help.appendChild(H3.small(`Morphisms ${this.dual ? 'to' : 'from'} ${to.properName}`, '.italic'));
			help.appendChild(H3.table(rows));
		}
	}
	doit(e, diagram, domain, morphism, save = true)
	{
		return Cat.R.diagram.placeMorphismByObject(event, this.dual ? 'codomain' : 'domain', domain, morphism, save);
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args.domain, args.morphism, false);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramObject;
	}
	place(e, diagram, name, domName, codName)
	{
		const to = diagram.getElement(name);
		const domain = diagram.getElement(domName);
		const codomain = diagram.getElement(codName);
		const nuFrom = new DiagramMorphism(diagram, {to, domain, codomain});
	}
}

class HomsetAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	'Select a morphism listed from a common domain and codomain',
			basename:		'homset',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
		this.newMorphism = new ElementTool('Morphism', '', true);
	}
	action(e, diagram, morphism, domain, codomain)
	{
		const from = this.doit(e, diagram, morphism, domain, codomain);
		diagram.log({command:this.name, domain, morphism, codomain});
		diagram.antilog({command:'delete', elements:[from.name]});
	}
	html(e, diagram, ary)
	{
		const domain = ary[0].to;
		const codomain = ary[1].to;
		this.newMorphism.domain = ary[0];
		this.newMorphism.codomain = ary[1];
		diagram.addFactorMorphisms(domain, codomain);
		this.newMorphism.html();
		this.newMorphism.domainElt.value = domain.name;
		this.newMorphism.codomainElt.value = codomain.name;
		const homset = diagram.codomain.getHomset(domain, codomain);
		const rows = homset.map(m => D.HtmlRow3(m, {onclick:function(){Cat.R.Actions.homset.action(event, Cat.R.diagram, m.name, ary[0].name, ary[1].name); }}));
		D.toolbar.help.appendChild(H3.h4('Place Morphism'));
		D.toolbar.help.appendChild(H3.table(rows, {id:'help-homset-morphism-table'}));
	}
	doit(e, diagram, morphism, domName, codName, save = true)
	{
		const to = diagram.getElement(morphism);
		const domain = diagram.getElement(domName);
		const codomain = diagram.getElement(codName);
		const nuFrom = new DiagramMorphism(diagram, {to, domain, codomain});
		diagram.makeSelected(nuFrom);
		R.EmitDiagramEvent(diagram, 'makeCells');
		return nuFrom;
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args.morphism, args.domain, args.codomain, false);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 2 && ary[0] instanceof DiagramObject && ary[1] instanceof DiagramObject;
	}
}

class DetachDomainAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			basename:		dual ? 'detachCodomain' : 'detachDomain',
			description:	`Detach a morphism's ${dual ? 'co' : ''}domain`,
			dual,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];	// morphism
		const target = this.dual ? from.codomain.name : from.domain.name;
		const obj = this.doit(e, diagram, from);
		diagram.log({command:this.name, from:from.name});
		diagram.antilog({command:'fuse', from:obj.name, target});
		diagram.makeSelected(from);
	}
	doit(e, diagram, from)
	{
		const old = this.dual ? from.codomain : from.domain;
		const obj = diagram.domain.detachDomain(from, {x:old.x + D.default.toolbar.x, y:old.y + D.default.toolbar.y }, this.dual);
		R.EmitMorphismEvent(diagram, 'detach', from, {dual:this.dual, old});
		from.update();
		R.EmitDiagramEvent(diagram, 'makeCells');
		return obj;
	}
	replay(e, diagram, args)
	{
		const from = diagram.getElement(args.from);
		this.doit(e, diagram, from);
	}
	hasForm(diagram, ary)	// one morphism with connected domain but not a def of something
	{
		if (diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramMorphism && !(ary[0] instanceof DiagramComposite) && ary[0].refcnt === 1)
		{
			const from = ary[0];
			let soFar = from.isDeletable() && this.dual ? from.codomain.domains.size + from.codomain.codomains.size > 1 :
													from.domain.domains.size + from.domain.codomains.size > 1;
			if (soFar)
				return ![...from.domain.nodes].reduce((r, cell) => r || ([...cell.left, ...cell.right].includes(from) && diagram.getAssertion(cell.signature)), false);
			return soFar;
		}
		return false;
	}
}

class DeleteAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Delete elements',
						basename:		'delete',
						priority:		98};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const names = ary.map(m => m.name);
		const elements = ary.map(elt => elt instanceof Cell ? diagram.getAssertion(elt.signature) : elt);		// convert cells to assertions
		diagram.deselectAll();
		const notDeleted = this.doit(e,diagram, elements);
		notDeleted.map(elt => diagram.addSelected(elt));	// reselect items that were not deleted
		diagram.log({command:'delete', elements:names});
		const commands = elements.map(from =>
		{
			if (from instanceof DiagramMorphism)
				return {command:'copy', source:from.to, xy:from.domain.getXY(), xyCod:from.codomain.getXY()};
			else if (from instanceof DiagramObject)
				return {command:'copy', source:from.to, xy:from.getXY()};
			else if (from instanceof DiagramText)
				return {command:'copy', source:from.description, xy:from.getXY()};
		});
		diagram.antilog({command:'multiple', commands});
	}
	doit(e, diagram, items)
	{
		const sorted = diagram.sortByCreationOrder(items).reverse();
		const notDeleted = [];
		let hasMorphism = false;
		sorted.map(elt =>
		{
			hasMorphism = hasMorphism || elt instanceof DiagramMorphism;
			if (elt.refcnt === 1)
			{
				elt.decrRefcnt();
				elt instanceof Morphism && diagram.domain.removeMorphism(elt);
			}
			else if (elt.refcnt > 1)
				notDeleted.push(elt);
		});
		if (notDeleted.length > 0)
			D.statusbar.show(e, 'Cannot delete an element due to it being used elsewhere');
		if (hasMorphism)
			R.EmitDiagramEvent(diagram, 'makeCells');
		return notDeleted;
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	hasForm(diagram, ary)	// all are deletable
	{
		if (!diagram.isEditable())
			return false;
		if (ary.length === 1 && ary[0].refcnt > 1)
			return false;
		return true;
	}
}

class ProjectAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			basename:		dual ? 'inject' : 'project',
			description:	`Create ${dual ? 'co' : ''}factor morphism`,
			dual,
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, elements)
	{
		const from = elements[0];
		const factors = U.GetFactorsById(this.dual ? 'inject-domain' : 'project-codomain');
		const elt = this.doit(e, diagram, from, factors);
		diagram.log({command:this.name, object:from.name, factors});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, from, factors)
	{
		let m = null;
		const args = {factors, dual:this.dual};
		args[this.dual ? 'codomain' : 'domain'] = from.to;
		m = diagram.get('FactorMorphism', args);
		return diagram.placeMorphismByObject(e, this.dual ? 'codomain' : 'domain', from, m);
	}
	replay(e, diagram, args)
	{
		const object = diagram.getElement(args.object);
		this.doit(e, diagram, object, args.factors);
	}
	hasForm(diagram, ary)	// one product object
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramObject;
	}
	html(e, diagram, ary)
	{
		const to = ary[0].to;
		const canFlatten = ProductObject.CanFlatten(to);
		const id = this.dual ? 'inject-domain' : 'project-codomain';
		const obj = this.dual ? 'domain' : 'codomain';
		/*
		const html = H.h4(`Create ${this.dual ? 'Cof' : 'F'}actor Morphism`) +
					(canFlatten ?
						H.div(H.span('Remove parenthesis', 'little') +
							H.button(`Flatten ${this.dual ? 'Coproduct' : 'Product'}`, '', '', '',
								`onclick="Cat.R.Actions.${this.dual ? 'inject' : 'project'}.flatten(event, Cat.R.diagram, Cat.R.diagram.getSelected())"`)) : '') +
					H.h5(`${this.dual ? 'Codomain' : 'Domain'} Factors`) +
					H.small(`Click to place in ${obj}`) +
					H.button(this.dual ? '0' : '*', '', Cat.R.diagram.elementId(), `Add ${this.dual ? 'initial' : 'terminal'} object`,
						`onclick="Cat.R.Actions.${this.dual ? 'inject' : 'project'}.addFactor('${to.name}', -1)"`) +
					ProjectAction.FactorButton(obj, to, to, [], this.dual) +
					H.h5(`${this.dual ? 'Domain' : 'Codomain'} Factors`) + H.br() +
					H.span(`Click objects to remove from ${obj}`, 'smallPrint.italic') +
					H.div('', '', id);
		D.toolbar.help.innerHTML = html;
		*/
		D.RemoveChildren(D.toolbar.help);
		const elements = [H3.h4(`Create ${this.dual ? 'Cof' : 'F'}actor Morphism`),
					(canFlatten ?
						H3.div(H3.span('Remove parenthesis', '.little'),
							H3.button(`Flatten ${this.dual ? 'Coproduct' : 'Product'}`, {onclick:e => this.flatten(e, diagram, diagram.getSelected())})) : null),
					H3.h5(`${this.dual ? 'Codomain' : 'Domain'} Factors`),
					H3.small(`Click to place in ${obj}`),
					H3.button(this.dual ? '0' : '*', {id:diagram.elementId(), title:`Add ${this.dual ? 'initial' : 'terminal'} object`, onclick:e => this.addFactor(to.name, -1)}),
					ProjectAction.FactorButton(obj, to, to, [], this.dual),
					H3.h5(`${this.dual ? 'Domain' : 'Codomain'} Factors`),
					H3.br(),
					H3.span(`Click objects to remove from ${obj}`, '.smallPrint.italic'),
					H3.div({id})];
		elements.map(elt => elt && D.toolbar.help.appendChild(elt));
		this.codomainDiv = document.getElementById(id);
	}
	addFactor(root, ...indices)
	{
		if (this.codomainDiv.childElementCount === 0)
		{
			D.RemoveChildren(this.codomainDiv);
			this.codomainDiv.appendChild(D.getIcon(this.dual ? 'inject' : 'project', 'edit', e => this.action(e, Cat.R.diagram, Cat.R.diagram.selected), 'Create morphism'));
		}
		const object = R.diagram.getElement(root);
		const isTerminal = indices.length === 1 && indices[0] === -1;
		const factor =  isTerminal ? R.diagram.getTerminal(this.dual) : object.getFactor(indices);
		const sub = isTerminal ? '' : indices.join();
		const btn = H3.button(factor.properName, {'data-indices':indices.toString(), onclick:e => Cat.D.del(e.target)});
		sub !== '' && btn.appendChild(H3.sub(sub));
		this.codomainDiv.appendChild(btn);
	}
	flatten(e, diagram, from)
	{
		const to = from.to;
		const factors = [];
		const searchObjects = to.objects.map((ob, i) => [ob, [i]]);
		while (searchObjects.length > 0)
		{
			const d = searchObjects.shift();
			const ob = d[0];
			const f = d[1];
			if (ob instanceof ProductObject && ob.dual === this.dual)
			{
				const nextSearch = ob.objects.map((obo, i) => [obo, [...f, i]]);
				searchObjects.unshift(...nextSearch);
			}
			else
				factors.push(f);
		}
		const m = diagram.get('FactorMorphism', {domain:to, factors, dual:this.dual});
		diagram.placeMorphismByObject(e, this.dual ? 'codomain' : 'domain', from, m);
	}
	static ObjectFactorButton(dir, root, object, index, dual)
	{
		const subscript = index.length > 0 ? H3.sub(index.join()) : null;
		return H3.table(H3.tr(H3.td(H3.button(object.properName, subscript, {id:Cat.R.diagram.elementId('project'), title:'Place object',
			'data-indices':index.toString(), onclick:e => Cat.R.Actions[dual ? 'inject' : 'project'].addFactor(root.name, index.toString())}))));
	}
	static ProductObjectFactorButton(dir, root, object, index, dual)
	{
		const header = H3.tr(H3.td(ProjectAction.ObjectFactorButton(dir, root, object, index, dual)), '.sidename');
		const cells = [];
		object.objects.map((o, i) =>
		{
			const subIndex = index.slice();
			subIndex.push(i);
			cells.push(H3.td(ProjectAction.FactorButton(dir, root, o, subIndex, dual)));
		});
		return H3.table(header, H3.tr(H3.td(H3.table(H3.tr(cells))), '.sidename'));
	}
	static FactorButton(dir, root, object, index, dual)
	{
		return (object instanceof ProductObject && object.dual === dual) ? ProjectAction.ProductObjectFactorButton(dir, root, object, index, dual) :
			ProjectAction.ObjectFactorButton(dir, root, object, index, dual);
	}
}

class LambdaMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Curry a morphism',
						basename:		'lambda'};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const domFactors = U.GetFactorsById('lambda-domain');
		const homFactors = U.GetFactorsById('lambda-codomain');
		try
		{
			const elt = this.doit(e, diagram, from, domFactors, homFactors);
			diagram.log({command:'lambda', from:from.name, domFactors, homFactors});
			diagram.antilog({command:'delete', elements:[elt.name]});
		}
		catch(x)
		{
			D.toolbar.showError(x);
		}
	}
	doit(e, diagram, from, domFactors, homFactors)
	{
		const m = diagram.get('LambdaMorphism', {preCurry:from.to, domFactors, homFactors});
		return this.placeMorphism(e, from, m);
	}
	replay(e, diagram, args)
	{
		from = diagram.getElement(args.from);
		this.doit(e, diagram, from, args.domFactors, args.homFactors);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramMorphism)
		{
			const m = ary[0].to;
			if (m.domain.isTerminal() && !(m.codomain instanceof HomObject))
				return false;
			return true;
		}
		return false;
	}
	html(e, diagram, ary)
	{
		const domain = ary[0].domain.to;
		const codomain = ary[0].codomain.to;
		let obj = codomain;
		let homCod = [];
		let id = 0;
		while (obj instanceof HomObject)
		{
			obj = obj.homDomain();
			homCod.push(...this.getButtons(obj, {dir:1, fromId:'lambda-codomain', toId:'lambda-domain'}));
		}
		homCod.length > 0 && homCod.pop();		// remove trailing '[' button
		const html = [];
		if (!domain.isTerminal())
		{
			html.push(	H3.h4('Create Element Morphism'),
						H3.button(`&#10034;&rarr;[${domain.properName}, ${codomain.properName}]`, {id:'lambda-element-morphism', onclick: e => Cat.R.Actions.lambda.createElementMorphism(e, Cat.R.diagram.getSelected())}),
						H3.hr());
		}
		html.push(	H3.h4('Curry Morphism'),
					H3.h5('Domain'),
					H3.small('Click to move to codomain:'),
					H3.span(this.getButtons(domain, {dir:0, fromId:'lambda-domain', toId:'lambda-codomain'}), {id:'lambda-domain'}),
					H3.h5('Codomain'),
					H3.small('Click to move to codomain: ['),
					H3.span(...homCod, {id:'lambda-codomain'}),
					H3.span(`, ${codomain instanceof HomObject ? codomain.baseHomDom().properName : codomain.properName}]`),
					H3.span(D.getIcon('lambda', 'edit', e => Cat.R.Actions.lambda.action(e, Cat.R.diagram, Cat.R.diagram.selected), 'Create lambda morphism')));
		html.map(elt => D.toolbar.help.appendChild(elt));
		this.domainElt = document.getElementById('lambda-domain');
		this.codomainElt = document.getElementById('lambda-codomain');
	}
	getButtons(object, data)
	{
		let html = [];
		const homBtn = H3.button('&times;', {title:'Convert to hom', 'data-indices':"-1", onclick:e => Cat.R.Actions.lambda.toggleOp(e.currentTarget)});
		const codSide = data.dir === 1 && 'objects' in object;
		const index = data.dir === 0 ? '0' : '1, 0';
		if ('objects' in object)
			object.objects.map((o, i) =>
			{
				html.push(H3.button(o.properName, H3.sub(i.toString()), {id:D.elementId(), 'data-indices':`${index}, ${i}`, onclick:e => Cat.R.Actions.lambda.moveFactor(e.currentTarget)}));
				codSide && i < object.objects.length - 1 && html.push(homBtn);
			});
		else if (!object.isTerminal())
			html.push(H3.button(object.properName, {id:D.elementId(), 'data-indices':`${index}, 0`, onclick:e => Cat.R.Actions.lambda.moveFactor(e.currentTarget)}));
		if (codSide)
			html.push(H3.button('[', {title:'Convert to product', 'data-indices':"-2", onclick:e => Cat.R.Actions.lambda.toggleOp(e.currentTarget)}));
		return html;
	}
	moveFactor(elt)
	{
		if (elt.parentNode.id === 'lambda-domain')
		{
			if (this.codomainElt.children.length > 0)
			{
				var b = document.createElement('button');
				b.setAttribute('data-indices', -1);
				b.setAttribute('onclick', "Cat.R.Actions.lambda.toggleOp(this)");
				b.setAttribute('title', 'Convert to hom');
				b.innerHTML = '&times;';
				this.codomainElt.appendChild(b);
			}
			this.codomainElt.appendChild(elt);
		}
		else
		{
			if (elt.nextSibling)
				elt.parentNode.removeChild(elt.nextSibling);
			else if (elt.previousSibling)
				elt.parentNode.removeChild(elt.previousSibling);
			this.domainElt.appendChild(elt);
		}
	}
	toggleOp(elt)
	{
		if (elt.dataset.indices === "-1")
		{
			elt.dataset.indices = -2;
			elt.innerText = '[';
			elt.setAttribute('title', 'Convert to product');
		}
		else
		{
			elt.dataset.indices = -1;
			elt.innerHTML = '&times;';
			elt.setAttribute('title', 'Convert to hom');
		}
	}
	placeMorphism(e, adjacent, morphism)
	{
		const xyDom = new D2(adjacent.domain.getXY());
		const xyCod = new D2(adjacent.codomain.getXY());
		const delta = xyCod.subtract(xyDom).normal().normalize().scale(D.default.arrow.length);
		return diagram.placeMorphism(e, morphism, xyDom.add(delta), xyCod.add(delta), true, false);
	}
	createElementMorphism(e, from)
	{
		const factors = [[]];
		const m = diagram.get('LambdaMorphism', {preCurry:from.to, domFactors:[], homFactors:[[0]]});
		return this.placeMorphism(e, from, m);
	}
}

class HelpAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Give help for an item',
						basename:		'help',
						priority:		99};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary) {}
	hasForm(diagram, ary)	// one element
	{
		return ary.length === 1;
	}
	html(e, diagram, ary)
	{
		const help = D.toolbar.help;
		D.RemoveChildren(help);
		const from = ary[0];
		const js = R.Actions.javascript;
		const cpp = R.Actions.cpp;
		let toolbar2 = [];
		R.languages.forEach(lang => lang.hasForm(diagram, ary) && toolbar2.push(D.getIcon(lang.basename, lang.basename, e => Cat.R.Actions[lang.basename].html(e, Cat.R.diagram, Cat.R.diagram.selected), lang.description)));
		if (toolbar2.length > 0)
			help.appendChild(H3.div(toolbar2, '##help-toolbar2.buttonBarLeft'));
		D.toolbar.help.appendChild(H3.div(from.help(), '##help-body'));
	}
}

class LanguageAction extends Action
{
//	constructor(diagram, language, ext)
	constructor(diagram, args)
	{
//		const args =
//		{
//			description:	`Morphism\'s ${language} code`,
//			basename:		language,
//		};
		super(diagram, args);
		Object.defineProperties(this,
		{
			genDiagram:		{value:	null,		writable:	true},
			currentDiagram:	{value:	null,		writable:	true},
			htmlReady:		{value:	false,		writable:	true},
			ext:			{value:	args.ext,		writable:	false},
//			basename:		{value:	basename,	writable:	false},
		});
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = from.to;
		if (m.constructor.name === 'CatObject' || m.constructor.name === 'Morphism')	// only edit basic elements and not derived ones
		{
			if (!('code' in m))
				m.code = {};
			m.code[this.ext] = document.getElementById(`element-${this.ext}`).innerText;
			R.EmitElementEvent(diagram, 'update', from);
		}
	}
	hasForm(diagram, ary)
	{
		return ary.length === 1 && (ary[0] instanceof CatObject || ary[0] instanceof Morphism);
	}
	isEditable(m)
	{
		return m.isEditable() &&
			((m.constructor.name === 'Morphism' && !m.domain.isInitial() && !m.codomain.isTerminal() && !m.codomain.isInitial()) || m.constructor.name === 'CatObject');
	}
	html(e, diagram, ary)
	{
		const elt = ary[0].to;
		let div = H3.div();
		const help = D.toolbar.help;
		const body = help.querySelector('#help-body');
		D.RemoveChildren(body);
		if (elt.constructor.name === 'Morphism' || elt.constructor.name === 'CatObject')
		{
			const old = this.currentDiagram;
			this.currentDiagram = elt.diagram;
			const rows =	[H3.tr([H3.td('Namespace', '.smallPrint.italic.left'), H3.td(this.getNamespace(diagram), '.smallBold.left')]),
							H3.tr([H3.td('Type', '.smallPrint.italic.left'), H3.td(this.getType(elt), '.smallBold.left')])];
			if (elt instanceof Morphism)
				rows.push( H3.tr([H3.td('Domain', '.smallPrint.italic.left'), H3.td(this.getType(elt.domain), '.smallBold.left')]),
							H3.tr([H3.td('Codomain', '.smallPrint.italic.left'), H3.td(this.getType(elt.codomain), '.smallBold.left')]));
			this.currentDiagram = old;
			div.appendChild(H3.table(rows, {width:'auto'}));
			this.getEditHtml(div, elt);
		}
		else
		{
			this.genDiagram = diagram;
			this.currentDiagram = null;
			div.appendChild(H3.p(this.generate(elt), `##element-${this.ext}.code`));
		}
		body.appendChild(div);
	}
	getEditHtml(div, elt)	// handler when the language is just a string
	{
		let code = 'code' in elt ? (this.hasCode(elt) ? elt.code[this.ext] : '') : '';
		if (code === '')
			code = this.template(elt);
		const id = `element-${this.ext}`;
		div.appendChild(H3.div(code, '.code.padding', {id, onkeydown:e => e.stopPropagation()}));
		if (this.isEditable(elt))
			div.appendChild(D.getIcon(this.name, 'edit', e => Cat.R.Actions[this.basename].setCode(e, id, this.ext), 'Edit code', D.default.button.tiny));
		return div;
	}
	hasCode(elt)
	{
		return 'code' in elt && this.ext in elt.code;
	}
	getCode(element)
	{
		return ('code' in element && this.ext in element.code) ? element.code[this.ext] : '';
	}
	setCode(e, id, type)
	{
		const elt = document.getElementById(id);
		if (R.diagram.isEditable() && elt.contentEditable === 'true' && elt.textContent !== '')
		{
			elt.contentEditable = false;
			R.diagram.activate(e, type);
		}
		else
		{
			elt.contentEditable = true;
			elt.focus();
		}
	}
	generateDiagram(diagram)
	{
		const generated = new Set();
		generated.add('');	// no exec
		this.currentDiagram = null;
		this.genDiagram = diagram;
		let code = `// Catecon Diagram ${diagram.name} @ ${Date.now()}`;
		diagram.elements.forEach(elt =>
		{
			if (elt instanceof Morphism || elt instanceof CatObject)
				code += this.generate(elt, generated);
		});
		return code;
	}
	getNamespace(diagram) { return U.Token(diagram.name); }
	generate(m, generated = new Set())	{}
	evaluate(e, diagram, name, fn) {}
	evaluateMorphism(e, diagram, name, fn) {}
	download(e, diagram)
	{
		if (diagram.codomain.actions.has(this.name))
		{
			const code = this.generateDiagram(diagram);
			const start = Date.now();
			const blob = new Blob([code], {type:`application/${this.ext}`});
			const url = D.url.createObjectURL(blob);
			D.Download(url, `${diagram.basename}.${this.ext}`);
			const delta = Date.now() - start;
			D.statusbar.show(e, `Diagram ${name} ${this.name} generated<br/>&#9201;${delta}ms`, true);
		}
	}
	instantiate(element)
	{
		let code = this.getCode(element).replace(/%Type/g, this.getType(element)).replace(/%Namespace/gm, this.getNamespace(element.diagram));
		if (element instanceof Morphism)
			code = code.replace(/%Dom/g, this.getType(element.domain)).replace(/%Cod/g, this.getType(element.codomain));
		return code;
	}
	hidden() { return true; }
}

class RunAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Run morphism',
						basename:		'run' };
		super(diagram, args);
		if (!isGUI)
			return;
		Object.defineProperties(this,
		{
			data:			{value:	new Map(),	writable:	true},
			js:				{value:	null,		writable:	true},
			postResultFun:	{value:	null,		writable:	true},
			workers:		{value:	[],			writable:	false},
		});
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const js = R.Actions.javascript;
		const addDataBtn = D.getIcon('addInput', 'edit', e => this.addInput(), 'Add data');
		const {properName, description} = to;
		const elements = [H3.h3(properName)];
		description !== '' && elements.push(H3.p(description, '.smallPrint.italic'));
		let canMakeData = true;
		const source = to instanceof NamedObject ? to.base : to;
		if (from instanceof DiagramObject)
		{
			if (js.canFormat(source))
				elements.push(H3.span({innerHTML:js.getInputHtml(source)}), addDataBtn);
		}
		else	// morphism
		{
			const {domain, codomain} = to;
			if (to.constructor.name === 'Morphism' && domain instanceof FiniteObject && !js.hasCode(to))
			{
				/*
				 * TODO?
				if ('size' in domain && domain.size > 0)
				{
					for (let i=0; i<domain.size; ++i)
						html += js.getInputHtml(codomain, null, i.toString());
				}
				else	// indeterminate size
				{
					html += js.getInputHtml(codomain);
					html += D.GetButton('addData', 'add', `Cat.R.Actions.run.addDataInput(event, Cat.R.diagram, '${to.name}')`, 'Add data input');
				}
				*/
			}
			if (R.CanFormat(to) && ('data' in to))
			{
				const sz = domain.getSize();
				const rows = [	H3.tr(H3.td(H3.small('Domain')), H3.td(H3.small('Codomain')), H3.td()),
								H3.tr(	H3.td(domain.properName + (domain.getBase() !== domain ? ` [${domain.getBase().properName}]` : ''), '.smallBold'),
										H3.td(codomain.properName + (codomain.getBase() !== codomain ? ` [${codomain.getBase().properName}]` : ''), '.smallBold'), H.td())];
				const dataRow = function(d,i)
				{
					if (d !== null)
					{
						const editDataBtn = D.getIcon('editData', 'edit', e => this.editData(e, i), 'Set data');
						rows.push(H3.tr(H3.td(i), H3.td(d), H3.td(editDataBtn), '.sidenavRow'));
					}
				};
				this.data = new Map(to.data);
				if (sz < Number.MAX_VALUE)
				{
					for (let i=0; i<sz; ++i)
					{
						const value = to.data.has(i) ? to.data.get(i) : null;
						const input = js.getInputHtml(codomain, value, i, [], i);
						dataRow(input, i);
					}
					// TODO domain not numeric
					elements.push(H3.h5('Data in Morphism'));
					elements.push(H.table(rows));
					canMakeData = false;
				}
				else
				{
					elements.push(H3.h5('Add Data To Morphism'));
					rows.push(H3.tr(H3.td(H3.span({innerHTML:js.getInputHtml(domain, null, 'dom')})), H3.td(H3.span({innerHTML:js.getInputHtml(codomain, null, 'cod')})), H3.td(addDataBtn)));
					elements.push(H3.table(rows));
					canMakeData = false;
					if ('data' in to && to.data.size > 0)
					{
						elements.push(H3.h5('Data in Morphism'));
						let rows = '';
						to.data.forEach(dataRow);
						elements.push(H3.table(rows));
					}
					else
						elements.push(H3.small('No data'));
				}
			}
			else if (to.isIterable())
				elements.push(D.getIcon('evaluate', 'edit', e => this.evaluateMorphism(e, Cat.R.diagram, to.name, this.postResults), 'Evaluate morphism'));
			else		// try to evaluate an input
				elements.push(H3.h5('Evaluate the Morphism'), H3.span({innerHTML:js.getInputHtml(domain)}), D.getIcon('run', 'edit', e => this.evaluate(e, Cat.R.diagram, to.name, this.postResult), 'Evaluate inputs'));
		}
		if (canMakeData)
		{
			const createDataBtn = H3.div(D.getIcon('createData', 'table', e => this.createData(e, Cat.R.diagram, from.name), 'Create data morphism'), '##run-createDataBtn', {display:'none'});
			elements.push(H3.div('##run-display'), createDataBtn);
			elements.map(elt => D.toolbar.help.appendChild(elt));
			const btn = document.getElementById('run-createDataBtn');
			const watcher = (mutationsList, observer) =>
			{
				for(const m of mutationsList)
					btn.style.display = m.target.children.length > 1 ? 'block' : 'none';
				if (this.postResultFun)
				{
					this.postResultFun();
					this.postResultFun = null;
				}
			};
			const observer = new MutationObserver(watcher);
			const childList = true;
			observer.observe(document.getElementById('run-display'), {childList});
		}
		else
		{
			elements.push(H3.div('##run-display'));
			elements.map(elt => elt && D.toolbar.help.appendChild(elt));
		}
		this.display = document.getElementById('run-display');
		this.data = new Map();
	}
	postResult(result)
	{
		const that = R.Actions.run;
		const morphism = R.diagram.getSelected();
		const domInfo = JSON.stringify(U.ConvertData(morphism.domain.to, result[0]));
		const codInfo = JSON.stringify(U.ConvertData(morphism.codomain.to, result[1]));
		const div = H3.div([H3.span(domInfo), H3.span('&rarr;'), H3.span(codInfo)]);
		if (that.display.children.length === 0)
			that.display.appendChild(H3.h3('Data'));
		that.display.appendChild(div);
		that.data.set(result[0], result[1]);
	}
	postResults(result)
	{
		const that = R.Actions.run;
		result.forEach(function(v, i) { that.postResult([i, v]); });
	}
	addInput()
	{
		const to = R.diagram.getSelected().to;
		let dom = null;
		let cod = null;
		const d = H3.div();
		if (to instanceof CatObject)
		{
			dom = this.data.size;
			cod = this.js.getInputValue(to instanceof NamedObject ? to.getBase() : to);
			d.innerHTML = U.HtmlSafe(U.a2s(cod));
			this.data.set(dom, cod);
		}
		else if (R.CanFormat(to))
		{
			const {domain, codomain} = this.setInputValue(to);
			d.innerHTML = this.htmlInputValue(domain, codomain);
		}
		this.display.appendChild(d);
	}
	htmlInputValue(domain, codomain)
	{
		return U.safe(domain) + '&rarr;' + U.safe(codomain);
	}
	setInputValue(m)
	{
		const domain = this.js.getInputValue(m.domain, 'dom');
		const codomain = this.js.getInputValue(m.codomain, 'cod');
		m.data.set(domain, codomain);
		return {domain, codomain};
	}
	createData(e, diagram, eltName)
	{
		try
		{
			D.toolbar.clearError();
			if (this.data.size > 0)
			{
				const selected = diagram.getElement(eltName);
				const domain = diagram.get('FiniteObject', {size:this.data.size});
				const {to, name} = selected instanceof DiagramObject ? selected : selected.codomain;
				const data = [...this.data].map((datum, i) => [i, datum[1]]);
				const dm = new Morphism(diagram, {basename:diagram.getAnon('data'), domain, codomain:to, data});
				diagram.placeMorphismByObject(e, 'codomain', name, dm.name);
			}
		}
		catch(x)
		{
			D.toolbar.showError('Error: ' + U.GetError(x));
		}
	}
	editData(e, i)
	{
		const morphism = R.diagram.getSelected();
		const val = this.js.getInputValue(morphism.to.codomain, i);
		morphism.to.data.set(i, val);
		R.EmitMorphismEvent(R.diagram, 'update', morphism);
		D.statusbar.show(e, `Data for morphism ${morphism.to.properName} saved`, false);
	}
	hasForm(diagram, ary)
	{
		if (!this.js)
			this.js = R.Actions.javascript;
		if (ary.length === 1 && 'to' in ary[0])
		{
			const {to} = ary[0];
			if (R.CanFormat(to))
				return true;
			if (to instanceof CatObject)
				return this.js.canFormat(to);
		}
		return false;
	}
}

class FiniteObjectAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Convert to or edit a finite discrete object',
						basename:		'finiteObject',
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const txt = this.sizeElt.value.trim();
		const size = txt.length > 0 ? Number.parseInt(txt) : null;
		this.sizeElt.classList.remove('error');
		if (size < 0 || isNaN(size))
		{
			this.sizeElt.classList.add('error');
			return;
		}
		const finObj = this.doit(e, diagram, from, size);
		diagram.log({command:'finiteObject', from:from.name, size});
		// TODO undo; may need new action
		this.html(e, diagram, ary);
		R.EmitElementEvent(diagram, 'update', finObj);
	}
	doit(e, diagram, from, size)
	{
		const to = from.to;
		if (to.constructor.name === 'CatObject' && to.refcnt === 1)
		{
			diagram.codomain.deleteElement(to);
			const args = {basename:to.basename, category:diagram.codomain, properName:to.properName};
			if (size !== null)
				args.size = size;
			const newTo = new FiniteObject(diagram, args);
			from.to = null;
			from.setObject(newTo);
		}
		return from;
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const elements = [H3.h4('Finite Object')];
		elements.push(to.constructor.name === 'CatObject' ? H3.span('Convert generic object to a finite object.', '.smallPrint.italic') : H3.span('Finite object', '.smallPrint.italic'),
						H3.table(H3.tr(H3.td(D.Input('size' in to ? to.size : '', 'finite-new-size', 'Size')), '.sidenavRow')),
						H3.span('Leave size blank to indicate finite of unknown size', '.smallPrint.italic'), 
						D.getIcon('finiteObject', 'edit', e => this.action(e, Cat.R.diagram, Cat.R.diagram.selected), 'Finite object', D.default.button.tiny));
		elements.map(elt => elt && D.toolbar.help.appendChild(elt));
		this.sizeElt = document.getElementById('finite-new-size');
		U.SetInputFilter(this.sizeElt, function(v)
		{
			return /^\d*$/.test(v);	//digits
		});
	}
	replay(e, diagram, args)
	{
		from = diagram.getElement(args.from);
		this.doit(e, diagram, from, args.size);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1)
		{
			const from = ary[0];
			if (from.to && diagram.elements.has(from.to.basename) && from.to.refcnt === 1)		// isolated in this diagram
			{
				if (from.to.constructor.name === 'CatObject')
					return  true;
				return from.to instanceof FiniteObject;
			}
		}
		return false;
	}
}

class EvaluateAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create an evaluation morphism',
			basename:		'evaluate',
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = diagram.get('Evaluation', {domain:from.to});
		diagram.placeMorphismByObject(e, 'domain', from, m.name);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramObject && Evaluation.CanEvaluate(ary[0].to);
	}
}

class DistributeAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Distribute a product over a coproduct',
			basename:		'distribute',
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const elt = this.doit(e, diagram, from);
		diagram.log({command:'distribute', from:from.name});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, from)
	{
		let m = null;
		if (Distribute.HasForm(diagram, ary))
			m = diagram.get('Distribute', {domain:from.to});
		if (Dedistribute.HasForm(diagram, ary))
			m = diagram.get('Dedistribute', {domain:from.to});
		return diagram.placeMorphismByObject(e, 'domain', from, m.name);
	}
	hasForm(diagram, ary)	// one object
	{
		return Distribute.HasForm(diagram, ary) || Dedistribute.HasForm(diagram, ary);
	}
}

class AlignHorizontalAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Align elements horizontally',
			basename:		'alignHorizontal',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const elements = this.getItems(ary);
		const orig = elements.map(o => [o.name, o.getXY()]);
		this.doit(e, diagram, elements);
		diagram.log({command:'alignHorizontal', elements:elements.map(i => i.name)});
		diagram.antilog({command:'move', elements:orig});
	}
	doit(e, diagram, items)
	{
		const elements = this.getItems(items);
		const xy = D.Grid(elements[0].getXY());		// basepoint
		elements.map(i =>
		{
			i.setXY({x:i.x, y:xy.y});
			R.EmitElementEvent(diagram, 'move', i);
		});
		diagram.updateMorphisms();
		R.EmitDiagramEvent(diagram, 'move');	// finished
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	getItems(ary)
	{
		return ary.filter(s => s instanceof DiagramObject || s instanceof DiagramText);
	}
	hasForm(diagram, ary)	// one object
	{
		const items = this.getItems(ary);
		const length = items.length;
		const midX = items.map(i => i.x).reduce((r, x) => r + x, 0)/length;
		const varX = items.map(i => Math.abs(i.x - midX)).reduce((r, x) => r + x, 0)/length;
		const midY = items.map(i => i.y).reduce((r, y) => r + y, 0)/length;
		const varY = items.map(i => Math.abs(i.y - midY)).reduce((r, y) => r + y, 0)/length;
		return length > 1 && varX > varY && varY > 0;
	}
}

class AlignVerticalAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Align elements vertically',
			basename:		'alignVertical',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const elements = this.getItems(ary);
		const orig = elements.map(o => [o.name, o.getXY()]);
		this.doit(e, diagram, elements);
		diagram.log({command:this.name, elements:elements.map(i => i.name)});
		diagram.antilog({command:'move', elements:orig});
	}
	doit(e, diagram, items, save = true)
	{
		const elements = this.getItems(items);
		const xy = elements[0].getXY();
		elements.shift();
		elements.map(i =>
		{
			i.setXY({x:xy.x, y:i.y});
			R.EmitElementEvent(diagram, 'move', i);
		});
		diagram.updateMorphisms();
		R.EmitDiagramEvent(diagram, 'move');
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements, false);
	}
	getItems(ary)
	{
		return ary.filter(s => s instanceof DiagramObject || s instanceof DiagramText);
	}
	hasForm(diagram, ary)	// one object
	{
		const items = this.getItems(ary);
		const length = items.length;
		const midX = items.map(i => i.x).reduce((r, x) => r + x, 0)/length;
		const varX = items.map(i => Math.abs(i.x - midX)).reduce((r, x) => r + x, 0)/length;
		const midY = items.map(i => i.y).reduce((r, y) => r + y, 0)/length;
		const varY = items.map(i => Math.abs(i.y - midY)).reduce((r, y) => r + y, 0)/length;
		return length > 1 && varX < varY && varX > 0;
	}
}

class TensorAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a tensor product of two or more objects or morphisms',
			basename:		'tensor',
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const elt = ary[0];
		if (elt instanceof DiagramMorphism)
		{
			const morphisms = ary.map(m => m.to);
			const to = diagram.get('TensorMorphism', {morphisms});
			diagram.placeMorphism(e, to, D.Barycenter(ary));
		}
		else if (elt instanceof DiagramObject)
		{
			const objects = ary.map(o => o.to);
			const to = diagram.get('TensorObject', {objects});
			diagram.placeObject(e, to, elt);
		}
	}
	hasForm(diagram, ary)
	{
		if (ary.length < 2)
			return false;
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && v instanceof DiagramObject, true) ||
			ary.reduce((hasIt, v) => hasIt && v instanceof DiagramMorphism, true));
	}
}

class AssertionAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Assert that two legs of a diagram commute.',
			basename:		'assert',
		};
		super(diagram, args);
		if (!isGUI)
			return;
		D.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const legs = Assertion.GetLegs(ary);
		const left = legs[0];
		const right = legs[1];
		const a = this.doit(e, diagram, left, right);
		diagram.log({command:this.name, left:left.map(m => m.name), right:right.map(m => m.name)});
		diagram.antilog({command:'delete', elements:[a.name]});
		diagram.selectElement(e, a);
	}
	doit(e, diagram, left, right, save = true)
	{
		if (!this.hasForm(diagram, [...left, ...right]))
			throw 'cannot form assertion';
		const cell = diagram.domain.getCell(left, right);
		const a = diagram.addAssertion(left, right);
		cell.removeSVG();	// graphics come back later after equality engine runs
		const dom = left[0].domain;
		let nodes = new Set(dom.nodes);
		left.map(m =>
		{
			const codCells = m.codomain.nodes;
			nodes = new Set([...nodes].filter(c => codCells.has(c)));
		});
		right.map(m =>
		{
			const codCells = m.codomain.nodes;
			nodes = new Set([...nodes].filter(c => codCells.has(c)));
		});
		R.EmitDiagramEvent(diagram, 'makeCells');
		return a;
	}
	replay(e, diagram, args)
	{
		const left = diagram.getElements(args.left);
		const right = diagram.getElements(args.right);
		this.doit(e, diagram, left, right, false);
	}
	hasForm(diagram, ary)
	{
		const legs = Assertion.GetLegs(ary);
		if (Assertion.HasForm(diagram, legs[0], legs[1]))	// no dupes
		{
			let foundIt = false;
			const sig = Cell.Signature(legs[0], legs[1]);
			const cell = diagram.domain.cells.get(sig);
			if (cell.commutes !== 'unknown' || DiagramComposite.CellIsComposite(cell))
				return false;
			return diagram.getAssertion(sig) === null;
		}
		return false;
	}
}

class RecursionAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Set the recursor for a recursive morphism.',
			basename:		'recursion',
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const recursor = ary[0].to;
		const form = ary[1].to;
		recursor.setRecursor(form);
		D.statusbar.show(e, `Data morphism ${recursor.properName} is now recursive with morphism ${form.properName}`);
		R.EmitElementEvent(diagram, 'update', ary[0]);
	}
	hasForm(diagram, ary)
	{
		return Morphism.HasRecursiveForm(ary);
	}
}

class GraphAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Show morphism graph',
						basename:		'graph',
						priority:		97,
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		ary.map(m => diagram.showGraph(m));
		diagram.log({command:this.name, morphisms:ary.map(m => m.name)});
		diagram.antilog({command:this.name, morphisms:ary.map(m => m.name)});
	}
	hasForm(diagram, ary)
	{
		return ary.length >= 1 && ary.reduce((r, m) => r && m instanceof DiagramMorphism, true);	// all morphisms
	}
}

class Category extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : `${nuArgs.user}/${nuArgs.basename}`;
		nuArgs.category = diagram && 'codomain' in diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			elements:		{value:	new Map(),	writable:	false},
			actions:		{value:	new Map(),	writable:	false},
			actionDiagrams:	{value:	new Set('actionDiagrams' in nuArgs ? nuArgs.actionDiagrams : []),	writable:	false},
			user:			{value:args.user,	writable:false},
		});
		if (R.$CAT)
		{
			this.addActions('category');
			if ('actionDiagrams' in nuArgs)
				nuArgs.actionDiagrams.map(a => this.addActions(a));
		}
		'elements' in nuArgs && this.process(diagram, nuArgs.elements);
		this.constructor.name === 'Category' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Category'), H3.td(`${this.elements.size} elements and ${this.actions.size} actions.`)));
		return help;
	}
	info()
	{
		const a = super.info();
		a.actionDiagrams = new Array(this.actionDiagrams.values());
		return a;
	}
	getCategorySignature()
	{
		let s = '';
		for (const [key, e] of this.elements)
			s += e.signature;
		return U.Sig(`${this.constructor.name} ${this.name} ${s}`);
	}
	process(diagram, data)
	{
		try
		{
			R.sync = false;
			let errMsg = '';
			data.map((args, ndx) =>
			{
				if (!args || !('prototype' in args))
					return;
				try
				{
					let elt = diagram.get(args.prototype, args);
				}
				catch(x)
				{
					errMsg += x + '\n';
				}
			});
			if (errMsg !== '')
				D.RecordError(errMsg);
		}
		catch(x)
		{
			D.RecordError(x);
		}
		R.sync = true;
	}
	json()
	{
		const a = super.json();
		a.elements = U.jsonArray(this.elements);
		a.actionDiagrams = new Array(this.actionDiagrams.values());
		return a;
	}
	getElement(name)
	{
		if (typeof name === 'string')
			return this.elements.get(name);
		return name;
	}
	deleteElement(elt, emit = true)
	{
		this.elements.delete(elt.name);
		if (elt.diagram)
		{
			elt.diagram.elements.delete(elt.basename);
			if (!(elt instanceof DiagramMorphism) && !(elt instanceof DiagramObject))
				R.RemoveEquivalences(elt.diagram, elt.name);
			emit && R.EmitElementEvent(elt.diagram, 'delete', elt);
		}
	}
	addActions(name)
	{
		const ad = R.$CAT.getElement(name);
		if (ad)
		{
			ad.elements.forEach(function(a)
			{
				this.actions.set(a.basename, a);
				'initialize' in a && a.initialize(this);
			}, this);
			this.actionDiagrams.add(name);
		}
	}
	forEachObject(fn)
	{
		this.elements.forEach(function(e)
		{
			e instanceof CatObject && fn(e);
		}, this);
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(function(e)
		{
			if (e instanceof Morphism)
				fn(e);
		}, this);
	}
	clear()
	{
		Array.from(this.elements).reverse().map((a, i) => a[1].refcnt > 0 ? a[1].decrRefcnt() : null);
		this.elements.clear();
	}
	getHomset(domain, codomain)
	{
		const homset = [];
		this.forEachMorphism(function(m) { m.domain === domain && m.codomain === codomain && homset.push(m); });
		return homset;
	}
	replaceElements(elements)
	{
		this.elements.clear();
		elements.map(elt => this.elements.set(elt.name, elt));
	}
	reconstituteElements()
	{
		const elements = [...this.elements.values()];
		this.replaceElements(elements);
	}
	static IsSink(ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		if (!ary.reduce((r, m) => r && m instanceof DiagramMorphism, true))	// all morphisms
			return false;
		const codomain = ary[0].codomain.name;
		for(let i=1; i<ary.length; ++i)
		{
			if (ary[i].codomain.name !== codomain)
				return false;
		}
		return true;
	}
	static IsSource(ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		if (!ary.reduce((r, m) => r && m instanceof DiagramMorphism, true))	// all morphisms
			return false;
		const domain = ary[0].domain.name;
		for(let i=1; i<ary.length; ++i)
		{
			if (ary[i].domain.name !== domain)
				return false;
		}
		return true;
	}
}

class Morphism extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		const domain = this.diagram ? this.diagram.getElement(args.domain) : args.domain;
		if (!domain)
			throw 'no domain for morphism';
		const codomain = this.diagram ? this.diagram.getElement(args.codomain) : args.codomain;
		if (!codomain)
			throw `no codomain for morphism ${args.codomain}`;
		Object.defineProperties(this,
		{
			domain:		{value: domain,		writable: true,	enumerable: true},
			codomain:	{value: codomain,	writable: true,	enumerable: true},
		});
		if ('data' in args)
		{
			const data = args.data;
			if (Array.isArray(data))
			{
				if (data.length > 0)
				{
					if (Array.isArray(data[0]) || Map.prototype.isPrototypeOf(data))
						this.data = new Map(data);
					else
						this.data = new Map(data.map((d, i) => [i, d]));
				}
				else
					this.data = new Map();
			}
			else if (Map.prototype.isPrototypeOf(args.data))
				this.data = new Map(args.data);
			this[Symbol.iterator] = function() { return this.data.values(); };
		}
		if ('recursor' in args)
			this.setRecursor(args.recursor);
		this.domain.incrRefcnt();
		this.codomain.incrRefcnt();
		let sigs = [this.signature];
		if ('data' in this)
			this.data.forEach(function(d, i) { sigs.push(U.SigArray([U.Sig(i.toString()), U.Sig(d ? d.toString() : 'null')])); });
		if ('recursor' in this && typeof this.recursor !== 'string')
			sigs.push(this.recursor.sig);
		if (sigs.length > 1)
			this.signature = U.SigArray(sigs);
		diagram && (!('addElement' in args) || args.addElement) && diagram.addElement(this);
		this.constructor.name === 'Morphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	setDomain(dom)
	{
		if (dom === this.domain)
			return;
		if (this.domain)
			this.domain.decrRefcnt();
		dom.incrRefcnt();
		this.domain = dom;
	}
	setCodomain(cod)
	{
		if (cod === this.codomain)
			return;
		if (this.codomain)
			this.codomain.decrRefcnt();
		cod.incrRefcnt();
		this.codomain = cod;
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Domain:'), H3.td(this.domain.properName)));
		help.appendChild(H3.tr(H3.td('Codomain:'), H3.td(this.codomain.properName)));
		return help;
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.domain.decrRefcnt();
			this.codomain.decrRefcnt();
			this.category && this.category.deleteElement(this);
		}
		super.decrRefcnt();
	}
	json()
	{
		const a = super.json();
		a.domain = this.domain.name;
		a.codomain = this.codomain.name;
		if (this.dual)
			a.dual = true;
		if ('data' in this)
		{
			const saved = new Map();
			const codomain = this.codomain;
			this.data.forEach(function(d, k)
			{
				saved.set(k, U.ConvertData(codomain, d));
			});
			a.data = U.JsonMap(saved);
		}
		if ('recursor' in this)
			a.recursor = this.recursor.name;
		return a;
	}
	isIterable()
	{
		return this.domain.isIterable();
	}
	hasMorphism(mor, start = true)		// True if the given morphism is used in the construction of this morphism somehow or identical to it
	{
		return this.isEquivalent(mor);
	}
	getGraph(data = {position:0})
	{
		const codData = U.Clone(data);
		const domGraph = this.domain.getGraph(data);
		const codGraph = this.codomain.getGraph(codData);
		return new Graph(this.diagram, {position:data.position, width:0, graphs:[domGraph, codGraph]});
	}
	hasInverse()
	{
		return false;	// fitb
	}
	getInverse()
	{
		return null;	// fitb
	}
	loadEquivalences()	// don't call in Morphism constructor since signature may change
	{
		const diagram = this.diagram;
		const sig = this.signature;
		R.LoadEquivalences(diagram, this, [this], [this]);
		const domIdSig = Identity.Signature(diagram, this.domain);
		R.LoadEquivalentSigs(diagram, this, [sig], [domIdSig, sig]);
		const codIdSig = Identity.Signature(diagram, this.codomain);
		R.LoadEquivalentSigs(diagram, this, [sig], [sig, codIdSig]);
		if (this.diagram.codomain.actions.has('product'))
		{
			const domTermSig = FactorMorphism.Signature(diagram, this.domain);
			const codTermSig = FactorMorphism.Signature(diagram, this.codomain);
			R.LoadEquivalentSigs(diagram, this, [domTermSig], [sig, codTermSig]);
		}
		if (this.diagram.codomain.actions.has('coproduct'))
			R.LoadEquivalentSigs(diagram, this, [FactorMorphism.Signature(diagram, this.domain)], [sig, FactorMorphism.Signature(diagram, this.codomain)]);
	}
	textwidth()
	{
		return D.textWidth(this.domain.properName)/2 + D.textWidth(this.properName, 'morphism') + D.textWidth(this.codomain.properName)/2 + D.textWidth('&emsp;');
	}
	getHtmlRep(idPrefix, config = {addbase:true})
	{
		const id = this.elementId(idPrefix);
		const onclick = 'onclick' in config ? config.onclick : e => Cat.R.diagram.placeMorphism(event, this.name, null, null, true, false);
		const ondragstart = 'ondrag' in config ? config.ondrag : e => Cat.D.DragElement(event, this.name);
		const draggable = 'draggable' in config ? config.draggable : 'false';
		const items = [];
		if ('addbase' in config && config.addbase)
			items.push(H3.span(this.basename, '.smallBold'));
		if (this.properName !== '' & this.properName !== this.basename)
			items.push(H3.span(this.properName, '.smallPrint'));
		items.push(H3.span('&nbsp;:&nbsp;' + this.domain.properName + '&rarr;' + this.codomain.properName));
		const div = H3.div('.panelElt.grabbable.sidenavRow', {id, draggable, ondragstart, onclick, title:this.description}, items);
		return div;
	}
	setRecursor(r)
	{
		const rcrs = typeof r === 'string' ? this.diagram.codomain.getElement(r) : r;
		if (rcrs)
		{
			if (!rcrs.hasMorphism(this))
				throw `The recursive morphism does not refer to itself so no recursion.`;
			Object.defineProperty(this, 'recursor', {value:rcrs,	writable:false});
			this.recursor.incrRefcnt();
		}
		else	// have to set it later
			this.recursor = r;
		if (typeof r !== 'string')
			this.signature = this.getDataSignature();
	}
	clear()
	{
		if ('data' in this)
			// TODO manage reference counts in hom morphisms
			this.data = new Map();
	}
	static HasRecursiveForm(ary)	// TODO move
	{
		if (ary.length === 2)
		{
			const r = ary[0];
			const f = ary[1];
			if (r instanceof DiagramMorphism && f instanceof DiagramMorphism)
				return f.to.hasMorphism(r.to);
		}
		return false;
	}
	static IsIdentity(morph)
	{
		if (morph instanceof MultiMorphism)
			return morph.morphisms.reduce((r, m) => r && Identity.IsIdentity(m), true);
		return morph instanceof Identity;
	}
}

class Identity extends Morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.Clone(args);
		const domain = diagram ? diagram.getElement(args.domain) : args.domain;
		nuArgs.domain = domain;
		if ('codomain' in args && args.codomain)
			nuArgs.codomain = diagram ? diagram.getElement(args.codomain) : args.codomain;
		else
			nuArgs.codomain = nuArgs.domain;
		nuArgs.basename = Identity.Basename(diagram, {domain:nuArgs.domain, codomain:nuArgs.codomain});
		nuArgs.properName = 'properName' in nuArgs ? U.HtmlEntitySafe(nuArgs.properName) : Identity.ProperName(nuArgs.domain, nuArgs.codomain);
		super(diagram, nuArgs);
		this.signature = Identity.Signature(diagram, this.domain);
		this.constructor.name === 'Identity' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Identity')));
		return help;
	}
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.graphs[0].bindGraph({cod:g.graphs[1], index:[], domRoot:[0], codRoot:[1], offset:0, tag:this.constructor.name});
		g.tagGraph(this.constructor.name);
		return g;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static Basename(diagram, args)
	{
		const domain = args.domain;
		const codomain = 'codomain' in args ? args.codomain : null;
		let basename = '';
		if (domain && codomain && domain.name !== codomain.name)
			basename = `Id{${domain.name},${codomain.name}}dI`;
		else if (domain)
			basename = `Id{${domain.name}}dI`;
		else if (codomain)
			basename = `Id{${codomain.name}}dI`;
		return basename;
	}
	static Codename(diagram, args)
	{
		let domain = args.domain;
		const codomain = 'codomain' in args ? args.codomain : null;
		let obj = domain;
		let nobj = codomain;
		if (codomain)
		{
			if (codomain instanceof NamedObject)
			{
				nobj = codomain;
				obj = domain;
			}
			else
			{
				nobj = domain;
				obj = codomain;
			}
		}
		let codename = null;
		const fn = function(obj)
		{
			return obj.objects.map(o => Identity.Codename(diagram, {domain:o}));
		};
		if (obj instanceof ProductObject)
			codename = ProductMorphism.Codename(diagram, {morphisms:fn(obj), dual:domain.dual});
		else if (obj instanceof HomObject)
			codename = HomMorphism.Codename(diagram, {morphisms:fn(obj)});
		if (!codomain && codename)
			return codename;
		const basename = codomain ? Identity.Basename(diagram, {domain, codomain}) : Identity.Basename(diagram, {domain});
		return Element.Codename(diagram, {basename});
	}
	static ProperName(domain, codomain = null)
	{
		return 'id';
	}
	static Signature(diagram, obj)
	{
		if (obj instanceof ProductObject)
			return ProductMorphism.Signature(obj.objects.map(o => Identity.Signature(diagram, o)), obj.dual);
		else if (obj instanceof HomObject)
			return HomMorphism.Signature(obj.objects);
		return U.Sig(Identity.Codename(diagram, {domain:obj}));
	}
	static LoadEquivalences(diagram, obj, dual)
	{
		if (obj instanceof ProductObject)
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = ProductMorphism.Signature(subs, this.dual);
			R.LoadEquivalentSigs(diagram, this, [this.signature], [op]);
		}
		else if (obj instanceof HomObject)
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = HomMorphism.Signature(subs);
			R.LoadEquivalentSigs(diagram, this, [this], [op]);
		}
	}
	static Get(diagram, args)
	{
		const nuArgs = U.Clone(args);
		let domain = diagram.getElement(args.domain);
		if (!domain)	// TODO emergency repair
			domain = CatObject.FromName(diagram, args.domain);
		nuArgs.domain = domain;
		let codomain = 'codomain' in args ? diagram.getElement(args.codomain) : domain;
		if (!codomain)
			codomain = CatObject.FromName(diagram, args.codomain);
		nuArgs.codomain = codomain;
		nuArgs.name = Identity.Codename(diagram, nuArgs);
		const m = diagram.getElement(nuArgs.name);
		if (!codomain)
		{
			if (domain instanceof ProductObject)
				return diagram.get('ProductMorphism', {morphisms:domain.objects.map(o => diagram.get('Identity', {domain:o})), dual:domain.dual});
			else if (domain instanceof HomObject)
				return diagram.get('HomMorphism', {morphisms:domain.objects.map(o => diagram.get('Identity', {domain:o}))});
		}
		return m ? m : new Identity(diagram, nuArgs);
	}
}

class NamedObject extends CatObject	// name of an object
{
	constructor (diagram, args)
	{
		const nuArgs = U.Clone(args);
		const source = diagram.getElement(args.source);
		nuArgs.dual = source.dual;
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.base = this.getBase();
		this.signature = this.base.signature;
		this.source.incrRefcnt();
		this.idFrom = diagram.get('Identity', {properName:'&#8797;', domain:this, codomain:this.source});
		this.idTo = diagram.get('Identity', {properName:'&#8797;', domain:this.source, codomain:this});
		this.idFrom.incrRefcnt();
		this.idTo.incrRefcnt();
		this.refcnt = 0;	// id's increased it so set it back
		this.constructor.name === 'NamedObject' && R.EmitElementEvent(diagram, 'new', this);
	}
	json()
	{
		const a = super.json();
		a.source = this.source.name;
		return a;
	}
	incrRefcnt()
	{
		super.incrRefcnt();
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.source.decrRefcnt();
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Named object of:'), H3.td(this.source.properName)));
		return help;
	}
	getBase()
	{
		if ('base' in this)
			return this.base;
		let source = this.source;
		while(source instanceof NamedObject)
			source = source.source;
		this.base = source;
		return source;
	}
	getFactor(factor)
	{
		return factor.length > 0 ? this.base.getFactor(factor) : this;
	}
	getFactorProperName(indices)
	{
		return this.base.getFactorProperName(indices);
	}
	find(obj, index = [])
	{
		if (obj.name === this.name)
			return index;
		if (this.source instanceof ProductObject)
			return this.source.find(obj, index);
		return [];
	}
	isEquivalent(obj)
	{
		return this.name === obj.name;
	}
	getGraph(data = {position:0})
	{
		const grph = this.diagram.flattenObject(this.base).getGraph();
		const w = D.textWidth(this.properName);
		grph.deepScan(function(g, ndx)
		{
			g.position = data.position;
		});
		data.position += w;
		grph.width = w;
		return grph;
	}
	getSize()
	{
		return this.base.getSize();
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
}

class NamedMorphism extends Morphism	// name of a morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.Clone(args);
		const source = diagram.getElement(nuArgs.source);
		nuArgs.category = diagram.codomain;
		nuArgs.domain = source.domain;
		nuArgs.codomain = source.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.base = this.getBase();
		this.signature = this.base.signature;
		this.source.incrRefcnt();
		if (this.constructor.name === 'NamedMorphism')
			this.signature = this.source.sig;
		this.loadEquivalences();
		this.constructor.name === 'NamedMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	json()
	{
		const a = super.json();
		a.source = this.source.name;
		return a;
	}
	incrRefcnt()
	{
		super.incrRefcnt();
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.source && this.source.decrRefcnt();
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Named morphism of:'), H3.td(this.source.properName)));
		return help;
	}
	loadEquivalences()	// don't call in Morphism constructor since signature may change
	{
		super.loadEquivalences();
		R.LoadEquivalences(this.diagram, this, [this], [this.base]);
	}
	getGraph(data = {position:0})
	{
		const oldData = U.Clone(data);
		const graph = super.getGraph(data);
		const srcGraph = this.base.getGraph(oldData);
		graph.graphs[0].copyGraph({src:srcGraph.graphs[0], map:[[[1], [1]]]});
		graph.graphs[1].copyGraph({src:srcGraph.graphs[1], map:[[[0], [0]]]});
		return graph;
	}
	getBase()
	{
		let source = this.source;
		while(source instanceof NamedObject)
			source = source.source;
		return source;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
}

class DiagramMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.index = true;
		nuArgs.basename = U.GetArg(args, 'basename', diagram.getAnon('m'));
		nuArgs.category = diagram.domain;
		const to = diagram.getElement(nuArgs.to);
		if (!to)
			throw 'no morphism to attach to index';
		const domain = diagram.getElement(nuArgs.domain);
		const codomain = diagram.getElement(nuArgs.codomain);
		if (domain.to !== to.domain)
			'index morphism domain mismatched to target morphism';
		if (codomain.to !== to.codomain)
			'index morphism codomain mismatched to target morphism';
		super(diagram, nuArgs);
		this.setMorphism(to);
		this.incrRefcnt();
		this.diagram.domain.addMorphism(this);
		Object.defineProperties(this,
		{
			bezier:		{value: null,	writable: true,	enumerable: true},
			flipName:	{value: U.GetArg(args, 'flipName', false),	writable: true,	enumerable: true},
			homsetIndex:{value: this.setHomsetIndex(args, 'homsetIndex'),	writable: true,	enumerable: true},
			svg_path:	{value: null,	writable: true,	enumerable: true},
			svg_path2:	{value: null,	writable: true,	enumerable: true},
			svg_name:	{value: null,	writable: true,	enumerable: true},
		});
		this.constructor.name === 'DiagramMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	setHomsetIndex(args)
	{
		if ('homsetIndex' in args)
			return args.homsetIndex;
		else
			return this.diagram.domain.getHomset(this.domain, this.codomain).length - 1;
	}
	setDomain(dom)
	{
		this.domain.domains.delete(this);
		const cat = this.diagram.domain;
		cat.removeMorphism(this);
		super.setDomain(dom);
		cat.addMorphism(this);
	}
	setCodomain(cod)
	{
		this.codomain.codomains.delete(this);
		const cat = this.diagram.domain;
		cat.removeMorphism(this);
		super.setCodomain(cod);
		cat.addMorphism(this);
	}
	help()
	{
		const help = this.to.help();
		if (this.isEditable())
		{
			const inputArgs = {type:"number", onchange:e => this.updateHomsetIndex(Number.parseInt(e.target.value)), min:0, max:10, width:2, value:this.homsetIndex};
			help.appendChild(H3.tr(H3.td('Homset Index'), H3.td(H3.input('.in100', inputArgs))));
		}
		return help;
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			if (this.to)
			{
				this.to.decrRefcnt();
				this.removeSVG();
			}
			this.domain.domains.delete(this);
			this.codomain.codomains.delete(this);
		}
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			if (this.diagram && this.diagram.isIsolated(this.domain) && (this.domain.to.isTerminal() || this.domain.to.refcnt > 1))
				this.domain.decrRefcnt();
			if (this.diagram && this.diagram.isIsolated(this.codomain) && (this.codomain.to.isTerminal() || this.codomain.to.refcnt > 1))
				this.codomain.decrRefcnt();
		}
	}
	json()
	{
		try
		{
			let mor = super.json();
			mor.flipName = this.flipName;
			mor.homsetIndex = this.homsetIndex;
			mor.to = this.to.name;
			return mor;
		}
		catch(x)
		{
			D.RecordError(x);
			return {};
		}
	}
	setMorphism(to)
	{
		if ('to' in this && this.to)
		{
			if (this.to.isEquivalent(to))
				return;
			this.to.decrRefcnt();
		}
		to.incrRefcnt();
		this.to = to;
		return true;
	}
	getNameOffset()
	{
		let pt1 = null;
		let pt2 = null;
		let mid = null;
		if (this.bezier)
		{
			pt1 = this.bezier.cp1;
			pt2 = this.bezier.cp2;
			const scale = 0.125;
			const c0 = this.start.scale(scale);
			const c1 = pt1.scale(3 * scale);
			const c2 = pt2.scale(3 * scale);
			const c3 = this.end.scale(scale);
			mid = U.bezier(this.start, this.bezier.cp1, this.bezier.cp2, this.end, 0.5);
		}
		else
		{
			pt1 = this.start;
			pt2 = this.end;
			mid = pt1.add(pt2).scale(0.5);
		}
		const normal = D2.Subtract(pt2, pt1).normal().scale(this.flipName ? 1 : -1).normalize();
		const adj = (normal.y < 0 && this.bezier) ? 0.5 : 0.0;
		const r = normal.scale((normal.y > 0 ? 1 + normal.y/2 : adj + 0.5) * D.default.font.height).add(mid);
		if (isNaN(r.x) || isNaN(r.y))
			return new D2();
		return D2.Round(r);
	}
	getSVG(node)
	{
		this.predraw();
		const off = this.getNameOffset();
		if (isNaN(off.x) || isNaN(off.y))
			throw 'bad name offset';
		const coords = this.bezier ? 
				`M${this.start.x},${this.start.y} C${this.bezier.cp1.x},${this.bezier.cp1.y} ${this.bezier.cp2.x},${this.bezier.cp2.y} ${this.end.x},${this.end.y}`
			:
				`M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}`;
		const id = this.elementId();
		const g = H3.g();
		const name = this.name;
		g.onmouseenter = e => Cat.D.Mouseover(e, this, true);
		g.onmouseleave = e => Cat.D.Mouseover(e, this, false);
		g.onmousedown = e => Cat.R.diagram.selectElement(e, name);
		node.appendChild(g);
		this.svg = g;
		g.setAttributeNS(null, 'id', id);
		this.svg_path2 = H3.path({'data-type':'morphism', 'data-name':this.name, class:'grabme grabbable', id:`${id}_path2`, d:coords});
		g.appendChild(this.svg_path2);
		this.svg_path = H3.path({'data-type':'morphism', 'data-name':this.name, class:'morphism grabbable', id:`${id}_path`, d:coords, 'marker-end':'url(#arrowhead)'});
		g.appendChild(this.svg_path);
		this.svg_name = H3.text('.morphTxt', {'data-type':'morphism', 'data-name':this.name, id:`${id}_name`, x:off.x, y:off.y + D.default.font.height/2,
			ondblclick:e => Cat.R.Actions.flipName.action(e, this.diagram, [this])},
			this.to.properName);
		this.diagram.autoplaceSvg(this.svg_name, off, this.name);
		g.appendChild(this.svg_name);
		this.updateDecorations();
	}
	showSelected(state = true)
	{
		this.svg_path.classList[state ? 'add' : 'remove']('selected');
		this.svg_name.classList[state ? 'add' : 'remove']('selected');
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);	// move front or back depending on state
	}
	updateFusible(e, on)
	{
		const path = this.svg_path;
		const name = this.svg_name;
		if (on)
		{
			D.statusbar.show(e, 'Fuse');
			path.classList.add(...['selected', 'grabbable', 'morphism', 'fuseMorphism']);
			path.classList.remove(...['selected', 'grabbable', 'morphism', 'fuseMorphism']);
			path.classList.add(...['fuseMorphism']);
			path.classList.remove(...['selected', 'grabbable', 'morphism']);
			name.classList.add(...['fuseMorphism']);
			name.classList.remove(...['morphTxt', 'selected', 'grabbable']);
			this.updateGlow(true, 'glow');
		}
		else
		{
			D.statusbar.show(e, '');
			path.classList.add(...['selected', 'grabbable', 'morphism']);
			path.classList.remove(...['fuseMorphism']);
			name.classList.add(...['morphTxt', 'selected', 'grabbable']);
			name.classList.remove(...['fuseMorphism']);
			this.updateGlow(false, '');
		}
	}
	updateDecorations()
	{
		const off = this.getNameOffset();
		if (isNaN(off.x) || isNaN(off.y))
			throw 'NaN';
		const svg = this.svg_name;
		svg.setAttribute('x', off.x);
		svg.setAttribute('y', off.y);
		const bbox = svg.getBBox();
		const pntTop = this.intersect(bbox, 'top');
		const pntBtm = this.intersect(bbox, 'bottom');
		const pntLft = this.intersect(bbox, 'left');
		const pntRgt = this.intersect(bbox, 'right');
		let anchor = 'middle';
		if (pntTop || pntBtm || pntLft || pntRgt)	// intersection
		{
			if (this.start.x < this.end.x)
			{
				if (this.start.y < this.end.y)
					anchor = this.flipName ? 'end' : 'start';
				else
					anchor = this.flipName ? 'start' : 'end';
			}
			else
			{
				if (this.start.y < this.end.y)
					anchor = this.flipName ? 'end' : 'start';
				else
					anchor = this.flipName ? 'start' : 'end';
			}
		}
		else
		{
			const angle = this.angle;
			const bnd = Math.PI/12;
			if (angle > Math.PI + bnd && angle < 2 * Math.PI - bnd)
				anchor = this.flipName ? 'start' : 'end';
			else if (angle > bnd && angle < Math.PI - bnd)
				anchor = this.flipName ? 'end' : 'start';
		}
		svg.setAttribute('text-anchor', anchor);
	}
	getBBox()
	{
		return D2.Merge(this.domain.getBBox(), this.codomain.getBBox(), this.svg_name.getBBox());
	}
	predraw()
	{
		const domBBox = D2.Expand(this.domain.svg.getBBox(), D.default.margin);
		const codBBox = D2.Expand(this.codomain.svg.getBBox(), D.default.margin);
		const delta = D2.Subtract(this.codomain, this.domain);
		let start = null;
		let end = null;
		if (delta.x === 0)
		{
			if (delta.y > 0)
			{
				start = this.intersect(domBBox, 'bottom');
				end = this.intersect(codBBox, 'top');
			}
			else
			{
				start = this.intersect(domBBox, 'top');
				end = this.intersect(codBBox, 'bottom');
			}
		}
		else if (delta.y === 0)
		{
			if (delta.x > 0)
			{
				start = this.intersect(domBBox, 'right');
				end = this.intersect(codBBox, 'left');
			}
			else
			{
				start = this.intersect(domBBox, 'left');
				end = this.intersect(codBBox, 'right');
			}
		}
		else
		{
			start = this.closest(domBBox, this.codomain);
			end = this.closest(codBBox, this.domain);
		}
		start = start ? start.round() : new D2(this.domain.x, this.domain.y);
		end = end ? end.round() : new D2(this.codomain.x, this.codomain.y);
		this.angle = delta.angle();
		this.start = start;
		this.end = end;
		this.adjustByHomset();
		return end !== false;
	}
	adjustByHomset()
	{
		let ndx = this.homsetIndex;
		if (ndx >= 1)
		{
			ndx--;
			const midpoint = {x:(this.start.x + this.end.x)/2, y:(this.start.y + this.end.y)/2};
			const normal = this.end.subtract(this.start).normal().normalize();
			const halfNdx = ndx/2;
			const band = Math.trunc(halfNdx);
			const alt = ndx % 2;
			const sign = alt > 0 ? -1 : 1;
			const scale = 4;
			const offset = normal.scale(scale * D.default.font.height * (band + 1) * sign);
			const w = normal.scale(10 * (1 + (halfNdx)) * sign);
			this.start = this.start.add(w).round();
			this.end = this.end.add(w).round();
			let cp1 = offset.add(this.start.add(midpoint).scale(0.5)).round();
			let cp2 = offset.add(this.end.add(midpoint).scale(0.5)).round();
			this.bezier = {cp1, cp2, index:ndx, offset};
		}
		else
			this.bezier = null;
	}
	update()
	{
		if (this.graph)
		{
			let xy = new D2({x:this.domain.x - this.domain.width/2, y:this.domain.y}).round();
			this.graph.graphs[0].updateXY(xy);	// set locations inside domain
			xy = new D2({x:this.codomain.x - this.codomain.width/2, y:this.codomain.y}).round();
			this.graph.graphs[1].updateXY(xy);	// set locations inside codomain
		}
		this.predraw();
		!this.svg && this.diagram.addSVG(this);
		const svg = this.svg_path;
		const start = this.start;
		const end = this.end;
		if (svg !== null && start.x !== undefined)
		{
			let coords = '';
			if (this.bezier)
				coords = `M${start.x},${start.y} C${this.bezier.cp1.x},${this.bezier.cp1.y} ${this.bezier.cp2.x},${this.bezier.cp2.y} ${end.x},${end.y}`;
			else
				coords = `M${start.x},${start.y} L${end.x},${end.y}`;
			svg.setAttribute('d', coords);
			this.svg_path2.setAttribute('d', coords);
			this.updateDecorations();
		}
		if ('graph' in this)
			this.graph.updateGraph({root:this.graph, index:[], dom:this.domain.name, cod:this.codomain.name, visited:[], elementId:this.elementId()});
	}
	intersect(bbox, side, m = D.default.arrow.margin)
	{
		let pnt = new D2();
		const x = bbox.x - m/2;
		const y = bbox.y;
		const width = bbox.width + m;
		const height = bbox.height;
		switch(side)
		{
		case 'top':
			pnt = D2.SegmentIntersect(x, y, x + width, y, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
			break;
		case 'bottom':
			pnt = D2.SegmentIntersect(x, y + height, x + width, y + height, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
			break;
		case 'left':
			pnt = D2.SegmentIntersect(x, y, x, y + height, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
			break;
		case 'right':
			pnt = D2.SegmentIntersect(x + width, y, x + width, y + height, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
			break;
		}
		return pnt;
	}
	closest(bbox, pnt)
	{
		const pntTop = this.intersect(bbox, 'top');
		const pntBtm = this.intersect(bbox, 'bottom');
		const pntLft = this.intersect(bbox, 'left');
		const pntRgt = this.intersect(bbox, 'right');
		let r = {x:Number.MAX_VALUE, y:Number.MAX_VALUE};
		if (pntTop)
			r = D2.UpdatePoint(pntTop, r, pnt);
		if (pntBtm)
			r = D2.UpdatePoint(pntBtm, r, pnt);
		if (pntLft)
			r = D2.UpdatePoint(pntLft, r, pnt);
		if (pntRgt)
			r = D2.UpdatePoint(pntRgt, r, pnt);
		if (r.x === Number.MAX_VALUE)
			r = new D2({x:pnt.x, y:pnt.y});
		return r;
	}
	isFusible(m)
	{
		return false;
	}
	removeGraph()
	{
		if ('graph' in this)
		{
			this.graph.svg.parentNode.removeChild(this.graph.svg);
			delete this.graph;
		}
	}
	makeGraph()
	{
		this.graph = this.to.getGraph();
	}
	showGraph()
	{
		if (!('graph' in this && 'svg' in this.graph))
		{
			this.makeGraph();
			const dom = this.domain;
			const cod = this.codomain;
			let xy = new D2({x:dom.x - dom.width/2, y:dom.y}).round();
			this.graph.graphs[0].updateXY(xy);	// set locations inside domain
			xy = new D2({x:cod.x - cod.width/2, y:cod.y}).round();
			this.graph.graphs[1].updateXY(xy);	// set locations inside codomain
			const id = this.graphId();
			this.graph.getSVG(this.svg, id,
							{index:[], root:this.graph, dom:dom.name, cod:cod.name, visited:[], elementId:this.elementId(), color:Math.round(12 * Number.parseInt(this.signature.substring(0, 6), 16)/0xFFFFFF)});
		}
		else
			this.graph.svg.classList.remove('hidden');
	}
	graphId()
	{
		return `graph_${this.elementId()}`;
	}
	isGraphHidden()
	{
		const svg = this.graph ? this.graph.svg : null;
		return svg ? svg.classList.contains('hidden') : true;
	}
	finishMove()
	{
		const dom = this.domain.finishMove();
		const cod = this.codomain.finishMove();
		return dom || cod;
	}
	getXY()
	{
		return D.Barycenter([this.domain.getXY(), this.codomain.getXY()]);
	}
	emphasis(on)
	{
		super.emphasis(on);
		D.SetClass('emphasis', on, this.svg_path, this.svg_name);
	}
	isEndo()
	{
		return this.domain === this.codomain;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return this.to.getHtmlRep(idPrefix, nuConfig);
	}
	updateHomsetIndex(ndx)
	{
		if (this.homsetIndex !== ndx)
		{
			this.homsetIndex = ndx;
			R.EmitMorphismEvent(this.diagram, 'update', this);
		}
	}
	static LinkId(data, lnk)
	{
		return `link_${data.elementId}_${data.index.join('_')}:${lnk.join('_')}`;
	}
	static LinkColorKey(lnk, dom, cod)
	{
		return `${lnk[0] === 0 ? dom : cod} ${lnk.slice(1).toString()}`;	// TODO use U.a2s?
	}
	static ColorWheel(data)
	{
		const tran = ['ff', 'ff', 'ff', 'ff', 'ff', '90', '00', '00', '00', '00', '00', '90'];
		const cnt = tran.length;
		data.color = (data.color + 5) % cnt;
		return `${tran[(data.color + 2) % cnt]}${tran[(data.color + 10) % cnt]}${tran[(data.color + 6) % cnt]}`;
	}
}

class Cell extends DiagramCore
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.name = `${diagram.name}/c_${diagram.domain.cells.size}`;
		super(diagram, nuArgs);
		this.properName = U.GetArg(nuArgs, 'properName', '');
		Object.defineProperties(this,
		{
			'cells':		{value:new Map(),		writable: false},
			left:			{value:nuArgs.left,		writable:true},
			right:			{value:nuArgs.right,	writable:true},
			to:				{value:null,			writable:true},
			commutes:		{value:'unknown',		writable:true},
			signature:		{value:Cell.Signature(nuArgs.left, nuArgs.right),	writable:false},
		});
		this.description = '';
	}
	setCommutes(com)
	{
		this.commutes = com;
		this.properName = D.default.cell[com];
		this.setGlow();
	}
	setGlow()
	{
		this.svg && this.svg.setAttributeNS(null, 'class', this.commutes === 'unknown' ? 'badCell' : 'cellTxt');
	}
	register()
	{
		this.getObjects().map(o => o.nodes.add(this));
	}
	deregister()
	{
		this.getObjects().map(o => o.nodes.delete(this));
		this.diagram.domain.cells.delete(this.signature);
		this.removeSVG();
	}
	getXY()
	{
		const r = D.BaryHull([...this.left, ...this.right]).round();
		if (isNaN(r.x) || isNaN(r.y))
			return new D2();
		r.y += D.default.font.height/2;
		return r;
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const sig = this.signature;
		const svg = H3.text({'data-type':'assertion', 'data-name':this.name, 'text-anchor':'middle', 'x':this.x, 'y':this.y + D.default.font.height/2}, this.properName);
		svg.onmouseenter = _ => Cat.R.diagram.emphasis(sig, true);
		svg.onmouseleave = _ => Cat.R.diagram.emphasis(sig, false);
		svg.onmousedown = e => Cat.R.diagram.selectElement(e, sig);
		node.appendChild(svg);
		this.svg = svg;
		this.setGlow();
	}
	removeSVG()
	{
		this.svg && this.svg.parentNode && this.svg.parentNode.removeChild(this.svg);
	}
	update()
	{
		const xy = this.getXY();
		if (isNaN(xy.x) || isNaN(xy.y))
			throw 'NaN!';
		this.x = xy.x;
		this.y = xy.y;
		if (this.svg)
		{
			this.svg.innerHTML = this.properName;
			this.diagram.autoplaceSvg(this.svg, xy, this.name);
		}
	}
	getObjects()
	{
		const morphs = [...this.left, ...this.right];
		const objs = new Set();
		morphs.map(m =>
		{
			objs.add(m.domain);
			objs.add(m.codomain);
		});
		return [...objs];
	}
	isSimple()
	{
		const left = new Set(this.left);
		if (left.size !== this.left.length)	// no repeat morphisms
			return false;
		const right = new Set(this.right);
		if (right.size !== this.right.length)	// no repeat morphisms
			return false;
		const checkObjects = function(leg)		// no shared objects on leg
		{
			const objs = new Set([leg[0].domain, ...leg.map(m => m.codomain)]);
			return objs.size === leg.length + 1;
		};
		if (!checkObjects(this.left) || !checkObjects(this.right))
			return false;
		const objects = new Set([this.left[0], ...this.left.map(m => m.codomain), ...this.right.map(m => m.codomain)]);
		if (objects.size !== this.left.length + this.right.length)	// no sharing objects between legs
			return false;
		return true;
	}
	isNamedMorphism()
	{
		if (this.left.length === 1 && this.right.length === 1)
		{
			const m = this.left[0];
			const n = this.right[0];
			const cmp = (a, b) => a.to instanceof NamedMorphism && a.to.source === b.to;
			return cmp(m, n) || cmp(n, m);
		}
		return false;
	}
	finishMove()
	{
		this.getObjects().map(o => o.finishMove());
	}
	emphasis(on)
	{
		super.emphasis(on);
		this.left.map(m => m.emphasis(on));
		this.right.map(m => m.emphasis(on));
	}
	getBBox()
	{
		return D2.Merge(...[...this.left, ...this.right].map(a => a.getBBox()));
	}
	static Signature(left, right)
	{
		const leftLeg = U.SigArray(left.map(m => m.signature));
		const rightLeg = U.SigArray(right.map(m => m.signature));
		return U.SigArray([leftLeg, rightLeg]);
	}
	static Get(diagram, left, right)
	{
		const sig = Cell.Signature(left, right);
		let cell = null;
		if (diagram.domain.cells.has(sig))
			cell = diagram.domain.cells.get(sig);
		else
			cell = new Cell(diagram, {left, right, properName:''});
		diagram.domain.cells.set(sig, cell);
		return cell;
	}
	static CommonLink(left, right)
	{
		return left.filter(m => right.includes(m));
	}
	static HasSubCell(cells, left, right)
	{
		const legHasObject = function(leg, obj)
		{
			return leg.reduce((r, m) => r || m.codomain === obj, false);
		};
		const cellCheck = function(cell, left, right)
		{
			let leftCommon = Cell.CommonLink(cell.left, left);
			let rightCommon = Cell.CommonLink(cell.right, right);
			if (leftCommon.length > 0 && rightCommon.length > 0)
				return true;
			leftCommon = Cell.CommonLink(cell.left, right);
			rightCommon = Cell.CommonLink(cell.right, left);
			return leftCommon.length > 0 && rightCommon.length > 0;
		};
		let result = false;
		cells.forEach(cell => result = result || cellCheck(cell, left, right));
		return result;
	}
}

class DiagramComposite extends DiagramMorphism
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.morphisms = args.morphisms.map(m => diagram.domain.getElement(m));
		this.morphisms.map((m, i) => { m.incrRefcnt(); });
		this.constructor.name === 'DiagramComposite' && R.EmitElementEvent(diagram, 'new', this);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.domain.nodes.delete(this);
			this.morphisms.map((m, i) =>
			{
				m && m.codomain.nodes.delete(this);
				m && m.decrRefcnt();
			});
		}
		super.decrRefcnt();
	}
	json()
	{
		const mor = super.json();
		mor.morphisms = this.morphisms.map(m => m.name);
		return mor;
	}
	isDeletable()
	{
		return super.isDeletable() && this.to.refcnt === 1;
	}
	static CellIsComposite(cell)
	{
		function fn(left, right)
		{
			if (left.length === 1 && left[0] instanceof DiagramComposite)
			{
				const morphisms = left[0].morphisms;
				if (morphisms.length === right.length)
					return morphisms.reduce((r, m, i) => r && m === right[i], true);
			}
			return false;
		}
		return fn(cell.left, cell.right) || fn(cell.right, cell.left);
	}
}

class IndexCategory extends Category
{
	constructor(diagram, args)
	{
		super(diagram, args);
		Object.defineProperties(this,
		{
			'cells':		{value:new Map(), writable: false},
		});
		this.constructor.name === 'IndexCategory' && R.EmitElementEvent(diagram, 'new', this);
	}
	process(diagram, data)
	{
		super.process(diagram, data);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Index Category')));
		return help;
	}
	clear()
	{
		super.clear();
		this.cells.forEach(c => c.deregister());
	}
	getHomset(domain, codomain)
	{
		const homset = new Set();
		domain.domains.forEach(m => m.codomain === codomain ? homset.add(m) : null);
		codomain.codomains.forEach(m => m.domain === domain ? homset.add(m) : null);
		return [...homset];
	}
	addMorphism(m)
	{
		m.domain.domains.add(m);
		m.codomain.codomains.add(m);
	}
	removeMorphism(m)
	{
		m.domain.domains.delete(m);
		m.codomain.codomains.delete(m);
	}
	detachDomain(from, xy, dual)
	{
		const obj = dual ? from.codomain : from.domain;
		const to = obj.to;
		const detachedObj = new DiagramObject(from.diagram, {to, xy});
		if (dual)
			from.setCodomain(detachedObj);
		else
			from.setDomain(detachedObj);
		this.elements.set(from.name, from);	// reset the order in the map
		const badCells = new Set();
		obj.nodes.forEach(cell => cell instanceof Cell && ((cell.left.includes(from)) || (cell.right.includes(from))) && badCells.add(cell));
		badCells.forEach(cell => cell.deregister());
		return detachedObj;
	}
	getCell(left, right)
	{
		const sig = Cell.Signature(left, right);
		return this.cells.get(sig);
	}
	makeCells(diagram)
	{
		this.cells.forEach(cell => cell.deregister());
		this.forEachObject(o =>
		{
			if (o.domains.size > 1)
			{
				const paths = [];
				o.domains.forEach(m => paths.push([m]));
				const legs = [];
				const visited = new Map();	// object to leg that gets there
				let cells = [];
				while(paths.length > 0)	// find maximal length legs from each starting arrow
				{
					const leg = paths.shift();
					const cod = leg[leg.length -1].codomain;
					if (visited.has(cod))
					{
						const alts = visited.get(cod);
						for (let i=0; i<alts.length; ++i)
						{
							const alt = alts[i];
							if (Cell.HasSubCell(this.cells, leg, alt))
							{
								const badCells = new Set();
								cells.map(cell => (Cell.CommonLink(cell.left, alt).length > 0 || Cell.CommonLink(cell.right, alt).length > 0) && badCells.add(cell));
								if (badCells.size > 0)
								{
									const nuCells = new Set(cells);
									nuCells.delete(...badCells);
									cells = [...nuCells];
								}
							}
							else
							{
								const cell = Cell.Get(diagram, leg, alt);
								if (cell.isSimple())
									cells.push(cell);
								else
									cell.deregister();
							}
						}
						alts.push(leg);
					}
					else
						visited.set(cod, [leg.slice()]);
					if (cod.codomains.size > 1)			// potential full leg
						legs.push(leg);
					cod.domains.forEach(function(m)
					{
						if (!leg.includes(m))
						{
							const nuLeg = leg.slice();
							nuLeg.push(m);
							paths.push(nuLeg);
						}
					});	// TODO circularity test
				}
			}
		});
		this.cells.forEach(function(cell, sig)
		{
			cell.register();
			const left = cell.left;
			const right = cell.right;
			const firstLeft = left[0];
			R.workers.equality.postMessage(
				{
					command:'CheckEquivalence',
					diagram:diagram.name,
					cell:cell.signature,
					leftLeg:left.map(m => m.to.signature),
					rightLeg:right.map(m => m.to.signature)
				});
		});
	}
	find(elt)
	{
		const fnd = [];
		this.elements.forEach(from => from.to === elt && fnd.push(from));
		return fnd;
	}
	updateCells(morphism)
	{
		this.cells.forEach(cell =>
		{
			if (cell.left.includes(morphism) || cell.right.includes(morphism))
				cell.update();
		});
	}
	static HomKey(domain, codomain)
	{
		return `${domain instanceof CatObject ? domain.name : domain} ${codomain instanceof CatObject ? codomain.name : codomain}`;
	}
}

class MultiMorphism extends Morphism
{
	constructor(diagram, args)
	{
		if (args.morphisms.length <= 1)
			throw 'not enough morphisms';
		const nuArgs = U.Clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		const morphisms = diagram.getElements(nuArgs.morphisms);
		Object.defineProperty(this, 'morphisms', {value:morphisms, writable:true}); 	// TODO back to false
		this.morphisms.map(m => m.incrRefcnt());
		if (this.constructor.name !== 'Composite')
			this.signature = U.SigArray([U.Sig(this.constructor.name), ...this.morphisms.map(m => m.signature)]);
		else
			this.signature = U.SigArray(this.morphisms.map(m => m.signature));
	}
	help(hdr)
	{
		const help = super.help();
		help.appendChild(hdr);
		this.morphisms.map(m => help.appendChild(H3.tr(H3.td({colspan:2}, m.getHtmlRep()))));
		return help;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.morphisms.map(m => m.decrRefcnt());
	}
	json(a = {})
	{
		a = super.json(a);
		delete a.properName;
		if (!('morphisms' in a))
			a.morphisms = this.morphisms.map(r => r.name);
		return a;
	}
	hasMorphism(mor, start = true)
	{
		if (!start && this.isEquivalent(mor))		// if looking for a recursive function, this and mor may be the same from the start
			return true;
		for (let i=0; i<this.morphisms.length; ++i)
			if (this.morphisms[i].hasMorphism(mor, false))
				return true;
		return false;
	}
	isIterable()	// Default is for a MultiMorphism to be iterable if all its morphisms are iterable.
	{
		return this.morphisms.reduce((r, m) => r && m.isIterable(), true);
	}
	needsParens()
	{
		return true;
	}
	usesDiagram(diagram)
	{
		for (let i=0; i<this.morphisms.length; ++i)
			if (this.morphisms[i].usesDiagram(diagram))
				return true;
		return false;
	}
	canChangeProperName()
	{
		return false;
	}
	basenameIncludes(val)
	{
		for (let i=0; i<this.morphisms.length; ++i)
			if (this.morphisms[i].basenameIncludes(val))
				return true;
		return false;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
}

class Composite extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		const nuArgs = U.Clone(args);
		nuArgs.basename = Composite.Basename(diagram, {morphisms});
		nuArgs.domain = Composite.Domain(morphisms);
		nuArgs.codomain = Composite.Codomain(morphisms);
		nuArgs.morphisms = morphisms;
		for(let i=0; i<morphisms.length -1; ++i)
			if (!morphisms[i].codomain.isEquivalent(morphisms[i+1].domain))
			{
				console.error(`composite morphism codomain/domain mismatch at ${i}: ${morphisms[i].codomain.name} vs ${morphisms[i+1].domain.name}`);
				throw 'domain and codomain are not the same';
			}
		nuArgs.properName = Composite.ProperName(morphisms);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.constructor.name === 'Composite' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Composite')));
		return help;
	}
	isIterable()		// A composite is considered iterable if the first morphism is iterable.
	{
		return this.morphisms[0].isIterable();
	}
	getDecoration()
	{
		return D.default.composite;
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		const graphs = this.morphisms.map(m => m.getGraph());
		const objects = this.morphisms.map(m => m.domain);
		objects.push(this.morphisms[this.morphisms.length -1].codomain);
		const sequence = this.diagram.get('ProductObject', {objects});
		// bare graph to hang links on
		const seqGraph = sequence.getGraph();
		// merge the individual graphs into the sequence graph
		graphs.map((g, i) =>
		{
			seqGraph.graphs[i].mergeGraphs({from:g.graphs[0], base:[0], inbound:[i], outbound:[i+1]});
			seqGraph.graphs[i+1].mergeGraphs({from:g.graphs[1], base:[1], inbound:[i+1], outbound:[i]});
		});
		// trace the links through the sequence graph
		seqGraph.traceLinks(seqGraph);
		const cnt = this.morphisms.length;
		// remove duplicates
		seqGraph.graphs[0].reduceLinks(cnt);
		seqGraph.graphs[cnt].reduceLinks(cnt);
		// copy ends for final anser
		graph.graphs[0].copyGraph({src:seqGraph.graphs[0], map:[[[cnt], [1]]]});
		graph.graphs[1].copyGraph({src:seqGraph.graphs[cnt], map:[[[0], [0]]]});
		return graph;
	}
	getFirstMorphism()
	{
		const m = this.morphisms[0];
		if (m instanceof Composite)
			return m.getFirstMorphism();
		return m;
	}
	loadEquivalences()
	{
		super.loadEquivalences();
		R.LoadEquivalences(this.diagram, this, [this], this.morphisms);
	}
	static Basename(diagram, args)
	{
		return `Cm{${args.morphisms.map(m => m.name).join(',')}}mC`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Composite.Basename(diagram, args)});
	}
	static Domain(morphisms)
	{
		return morphisms[0].domain;
	}
	static Codomain(morphisms)
	{
		return morphisms[morphisms.length - 1].codomain;
	}
	static ProperName(morphisms)
	{
		return MultiObject.ProperName('&#8728;', morphisms, true);	// TODO wrong redro, reverse it
	}
}

class ProductMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		const nuArgs = U.Clone(args);
		const dual = U.GetArg(args, 'dual', false);
		nuArgs.basename = ProductMorphism.Basename(diagram, {morphisms, dual});
		nuArgs.domain = ProductMorphism.Domain(diagram, morphisms, dual);
		nuArgs.codomain = ProductMorphism.Codomain(diagram, morphisms, dual);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = ProductMorphism.ProperName(morphisms, dual);
		super(diagram, nuArgs);
		this.signature = ProductMorphism.Signature(this.morphisms.map(m => m.signature), dual);
		this.constructor.name === 'ProductMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	json()
	{
		const a = super.json();
		if (this.dual)
			a.dual = true;
		return a;
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td(this.dual ? 'Coproduct' : 'Product')));
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		this.morphisms.map((m, i) =>
		{
			const g = m.getGraph(data);
			graph.graphs[0].graphs[i].copyGraph({src:g.graphs[0], map:[[[1], [1, i]]]});
			graph.graphs[1].graphs[i].copyGraph({src:g.graphs[1], map:[[[0], [0, i]]]});
		});
		graph.tagGraph(this.dual ? 'Coproduct' : ' Product');
		return graph;
	}
	loadEquivalences()
	{
		super.loadEquivalences();
		this.morphisms.map((m, i) =>
		{
			const pDom = FactorMorphism.Signature(this.diagram, this.domain, [i], this.dual);
			const pCod = FactorMorphism.Signature(this.diagram, this.codomain, [i], this.dual);
			if (this.dual)
				R.LoadEquivalences(this.diagram, this, [this, pCod], [pDom, m]);
			else
				R.LoadEquivalences(this.diagram, this, [pCod, this], [m, pDom]);
		});
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		if (args.morphisms[0] instanceof Morphism)
			return `${c}Pm{${args.morphisms.map(m => m.name).join(',')}}mP${c}`;
		else
			return `${c}Pm{${args.morphisms.join(',')}}mP${c}`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:ProductMorphism.Basename(diagram, args)});
	}
	static Domain(diagram, morphs, dual = false)
	{
		return diagram.get('ProductObject', {objects:morphs.map(m => m.domain), dual});
	}
	static Codomain(diagram, morphs, dual = false)
	{
		return diagram.get('ProductObject', {objects:morphs.map(m => m.codomain), dual});
	}
	static ProperName(morphisms, dual = false)
	{
		return MultiObject.ProperName(dual ? '&plus;' : '&times;', morphisms);
	}
	static Signature(morphSigs, dual = false)
	{
		const sigs = [dual];
		morphSigs.map((s, i) => sigs.push(s, i));
		return U.SigArray(sigs);
	}
}

class ProductAssembly extends MultiMorphism
{
	constructor(diagram, args)
	{
		const dual = U.GetArg(args, 'dual', false);
		const nuArgs = U.Clone(args);
		nuArgs.morphisms = diagram.getElements(args.morphisms);
		nuArgs.domain = ProductAssembly.Domain(diagram, nuArgs.morphisms, dual);
		nuArgs.codomain = ProductAssembly.Codomain(diagram, nuArgs.morphisms, dual);
		nuArgs.basename = ProductAssembly.Basename(diagram, {morphisms:nuArgs.morphisms, dual});
		nuArgs.properName = ProductAssembly.ProperName(nuArgs.morphisms, dual);
		super(diagram, nuArgs);
		this.constructor.name === 'ProductAssembly' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td(`${this.dual ? 'Co' : 'P'}roduct assembly`)));
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		this.morphisms.map((m, i) =>
		{
			const g = m.getGraph(data);
			graph.graphs[0].copyGraph({src:g.graphs[0], map:[[[1], [1, i]]]});
			graph.graphs[1].graphs[i].copyGraph({src:g.graphs[1], map:[[[0], [0]]]});
		});
		return graph;
	}
	loadEquivalences()
	{
		super.loadEquivalences();
		this.morphisms.map((m, i) =>
		{
			const pCod = this.diagram.get('FactorMorphism', {domain:this.codomain, factors:[i], dual:this.dual});
			R.LoadEquivalences(this.diagram, this, [m], this.dual ? [this, pCod] : [pCod, this]);
		});
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		return `${c}Pa{${args.morphisms.map(m => m.name).join(',')}}aP${c}`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:ProductAssembly.Basename(diagram, args)});
	}
	static Domain(diagram, morphisms, dual)
	{
		return morphisms[0].domain;
	}
	static Codomain(diagram, morphisms, dual)
	{
		return diagram.get('ProductObject', {objects:morphisms.map(m => m.codomain)});
	}
	static ProperName(morphisms, dual)
	{
		return `${dual ? '&Sigma;' : '&Pi;'}<${morphisms.map(m => m.properName).join(',')}>`;
	}
}

class FactorMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const dual = U.GetArg(args, 'dual', false);
		const nuArgs = U.Clone(args);
		nuArgs.cofactors = U.GetArg(args, 'cofactors', null);
		if (dual)
		{
			nuArgs.codomain = diagram.getElement(args.codomain);
			nuArgs.domain = FactorMorphism.Codomain(diagram, nuArgs.codomain, nuArgs.factors, dual, nuArgs.coFactors);
		}
		else
		{
			nuArgs.domain = diagram.getElement(args.domain);
			nuArgs.codomain = FactorMorphism.Codomain(diagram, nuArgs.domain, nuArgs.factors, dual, nuArgs.coFactors);
		}
		const bargs = {factors:nuArgs.factors, dual, cofactors:nuArgs.cofactors};
		if (dual)
			bargs.codomain = nuArgs.codomain;
		else
			bargs.domain = nuArgs.domain;
		nuArgs.basename = FactorMorphism.Basename(diagram, bargs);
		nuArgs.properName = FactorMorphism.ProperName(diagram, dual ? nuArgs.codomain : nuArgs.domain, nuArgs.factors, dual, nuArgs.cofactors);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.factors = nuArgs.factors;
		this.signature = FactorMorphism.Signature(this.diagram, nuArgs.domain, nuArgs.factors, dual, nuArgs.cofactors);
		this.constructor.name === 'FactorMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td(`${this.dual ? 'Cofactor' : 'Factor'} morphism: ${this.factors}`)));
		return help;
	}
	json()
	{
		const a = super.json();
		delete a.properName;	// will regenerate
		a.factors = this.factors.slice();
		if (this.cofactors)
			a.cofactors = this.cofactors.slice();
		return a;
	}
	canChangeProperName()
	{
		return false;
	}
	getGraph(data = {position:0}, first = true)
	{
		const graph = super.getGraph(data, first);
		const factorGraph = graph.graphs[this.dual ? 0 : 1];
		if (this.cofactors)
		{
			// TODO
		}
		else
		{
			let offset = 0;
			this.factors.map((index, i) =>
			{
				const ndx = Array.isArray(index) ? index.slice() : [index];
				let cod = null;
				let domRoot = null;
				let coNdx = null;
				let codRoot = null;
				if (this.dual)
				{
					const codomain = graph.graphs[1];
					const factor = codomain.getFactor(ndx);
					if (factor === null)
					{
						++offset;
						return;
					}
					cod = this.factors.length === 1 ? factorGraph : factorGraph.getFactor([i]);
					domRoot = ndx.slice();
					domRoot.unshift(1);
					codRoot = this.factors.length > 1 ? [0, i] : [0];
					factor.bindGraph({cod, index:[], tag:this.constructor.name, domRoot, codRoot, offset});
				}
				else
				{
					const domain = graph.graphs[0];
					const factor = domain.getFactor(ndx);
					if (factor === null)
					{
						++offset;
						return;
					}
					cod = this.factors.length === 1 ? factorGraph : factorGraph.getFactor([i]);
					domRoot = ndx.slice();
					domRoot.unshift(0);
					codRoot = this.factors.length > 1 ? [1, i] : [1];
					factor.bindGraph({cod, index:[], tag:this.constructor.name, domRoot, codRoot, offset});	// TODO dual name
				}
			});
			graph.tagGraph(this.dual ? 'Cofactor' : 'Factor');
		}
		return graph;
	}
	loadEquivalences()
	{
		super.loadEquivalences();
		if (this.cofactors)
		{
			// TODO
		}
		else if (this.factors.length > 1)
		{
			this.factors.map((f, i) =>
			{
				// TODO
				const args = {factors:[[i]], dual:this.dual};
				const baseArgs = {factors:[this.factors[i]], dual:this.dual};
				if (this.dual)
				{
					args.codomain = this.domain;
					baseArgs.codomain = this.codomain;
				}
				else
				{
					args.domain = this.codomain;
					baseArgs.domain = this.domain;
				}
				const fm = this.diagram.get('FactorMorphism', args);
				const base = this.diagram.get('FactorMorphism', baseArgs);
				R.LoadEquivalences(this.diagram, this, [base], [fm, this]);
				if (!this.dual && this.domain.isTerminal() && this.codomain.isTerminal())
					R.LoadEquivalences(this.diagram, this, [base], [fm, this]);
			});
		}
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static Basename(diagram, args)
	{
		const factors = args.factors;
		if (factors.length === 0 || (factors.length === 1 && factors[0].length === 0))
			return Identity.Basename(diagram, args);
		const dual = 'dual' in args ? args.dual : false;
		const cofactors = 'cofactors' in args ? args.cofactors : null;
		const c = this.dual ? 'C' : '';
		const obj = diagram.getElement(dual ? args.codomain : args.domain);
		let basename = `${c}Fa{${obj.name},`;
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = obj.getFactor(indices);
			if (f.isTerminal())	// TODO dual object
				basename += this.dual ? '#0' : '#1';
			else
				basename += f.name;
			basename += `_${indices.toString()}`;
			if (i !== factors.length -1)
				basename += ',';
		}
		if (cofactors)
			basename += `__${cofactors.toString()}`;
		basename += `}aF${c}`;
		return basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:FactorMorphism.Basename(diagram, args)});
	}
	static Codomain(diagram, domain, factors, dual, cofactors = null)
	{
		if (cofactors)
		{
			const refs = factors.map(f => domain.getFactor(f));
			const objects = [];
			for (let i=0; i<cofactors.length; ++i)
			{
				const cof = cofactors[i].slice();
				let level = objects;
				while (cof.length > 0)
				{
					const ndx = cof[0];
					const isLast = cof.length === 1;
					if (level[ndx] === undefined)
					{
						level[ndx] = isLast ? refs[i] : [];
						level = level[ndx];
					}
					else if (isLast)
						level[ndx] = refs[i];
					else
						level = level[ndx];
					cof.shift();
				}
			}
			return diagram.get('ProductObject', {objects, dual});
		}
		else
			return factors.length > 1 ? diagram.get('ProductObject', {objects:factors.map(f =>
				f === -1 ? diagram.getTerminal(dual) : domain.getFactor(f)
			), dual}) : (factors[0] === -1 ? diagram.getTerminal(dual) : domain.getFactor(factors[0]));
	}
	static ProperName(diagram, domain, factors, dual, cofactors = null)
	{
		return `&lt;${factors.map(f => f === -1 ? diagram.getTerminal(dual).properName : domain.getFactorProperName(f)).join(',')}&gt;`;	// TODO cofactors
	}
	static Signature(diagram, domain, factors = [-1], dual = false, cofactors = null)	// default to terminal morphism
	{
		if (!dual && domain.isTerminal())
			return Identity.Signature(diagram, diagram.getTerminal(dual));
		const sigs = [dual];
		if (!cofactors)
			factors.map(f => sigs.push(Identity.Signature(diagram, f === -1 ? diagram.getTerminal(this.dual) : domain.getFactor(f)), f));
		else
			throw 'TODO';
		return U.SigArray(sigs);
	}
}

class LambdaMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const preCurry = typeof args.preCurry === 'string' ? diagram.codomain.getElement(args.preCurry) : args.preCurry;
		const nuArgs = U.Clone(args);
		nuArgs.domain = LambdaMorphism.Domain(diagram, preCurry, args.domFactors);
		nuArgs.codomain = LambdaMorphism.Codomain(diagram, preCurry, args.homFactors);
		nuArgs.category = diagram.codomain;
		nuArgs.basename = LambdaMorphism.Basename(diagram, {preCurry, domFactors:args.domFactors, homFactors:args.homFactors});
		nuArgs.homFactors = args.homFactors.map(hf => Array.isArray(hf) ? hf : [hf]);	// TODO remove bandage
		let obj = nuArgs.codomain;
		while (obj instanceof HomObject)
			obj = obj.homDomain();
		obj.covered = true;		// right-most obj in hom codomain does not change
		const graph = new Graph(diagram, {graphs:[preCurry.domain.getGraph(), preCurry.codomain.getGraph()]});
		if (!graph.doIndicesCover([...nuArgs.domFactors, ...nuArgs.homFactors]))
			throw 'inadequate factor coverage for lambda';
		if (!nuArgs.homFactors.reduce((r, f) => r && !U.HasFactor(nuArgs.domFactors, f), true) &&
				!nuArgs.domFactors.reduce((r, f) => r && !U.HasFactor(nuArgs.homFactors, f), true))	// do not share links
			throw 'dom and hom factors overlap';
		super(diagram, nuArgs);
		this.properName = LambdaMorphism.ProperName(preCurry, nuArgs.domFactors, nuArgs.homFactors);
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = nuArgs.homFactors;
		this.signature = this.getLambdaSignature();
		this.constructor.name === 'LambdaMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Lambda')));
		help.appendChild(H3.tr(H3.td('Pre-Curry:'), H3.td(this.preCurry.properName)));
		help.appendChild(H3.tr(H3.td('Domain Factors:'), H3.td(this.domFactors)));
		help.appendChild(H3.tr(H3.td('Codomain Factors:'), H3.td(this.homFactors)));
		return help;
	}
	getLambdaSignature()
	{
		return U.SigArray([this.signature, this.preCurry.signature, U.Sig(JSON.stringify(this.domFactors)), U.Sig(JSON.stringify(this.homFactors))]);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.preCurry = this.preCurry.name;
		a.domFactors = this.domFactors;
		a.homFactors = this.homFactors;
		return a;
	}
	loadEquivalences(diagram)
	{
		super.loadEquivalences(diagram);
		// TODO
	}
	canChangeProperName()
	{
		return false;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.preCurry.decrRefcnt();
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);		// bare graph to start
		const preCurryGraph = this.preCurry.getGraph(data);
		const domFactors = this.domFactors.filter(f => f !== -1);
		const factorMap = domFactors.map((f, i) => [f, [0, i]]);
		if (domFactors.length === 1)
		{
			const f = factorMap[0];
			factorMap[0] = [f[0], [f[1][1]]];
		}
		const dom = graph.graphs[0];
		const cod = graph.graphs[1];
		const codIsHom = this.codomain instanceof HomObject;
		const homDom = codIsHom ? cod.graphs[0] : new Graph(this.diagram);
		const homMap = [];
		let base = [1, 0];
		const homFactors = this.homFactors;
		let k = 0;
		const codFactor = [1, 1];
		if (homFactors.length === 1 && U.ArrayEquals(homFactors[0], [0]))	// check for entire domain
			homMap[0] = [homFactors[0], [1, 0]];
		else
			homFactors.map((f, i) =>
			{
				if (i < homFactors.length -1 && U.ArrayEquals(homFactors[i+1], [-2]))
				{
					homMap.push([f, base.slice()]);
					k = 0;
				}
				else if (U.ArrayEquals(f, [-2]))
				{
					base[base.length -1] = 1;	// switch to hom cod
					codFactor.push(1);
					k = 0;
				}
				else
				{
					if (k === 0)
						base.push(k++);
					else
					{
						base.pop();
						base.push(k++);
					}
					homMap.push([f, base.slice()]);
				}
			});
		factorMap.push(...homMap);
		factorMap.push([[1], codIsHom ? codFactor : []]);
		let obj = this.preCurry.codomain;
		let preCurryHomCodGraph = preCurryGraph.graphs[1];
		while (obj instanceof HomObject)
		{
			preCurryHomCodGraph = preCurryHomCodGraph.graphs[1];
			obj = obj.objects[1];
		}
		// copy hom codomain links
		obj = this.codomain;
		let homCod = graph.graphs[1];
		while (obj instanceof HomObject)
		{
			homCod = homCod.graphs[1];
			obj = obj.objects[1];
		}
		homCod.copyGraph({map:factorMap, src:preCurryHomCodGraph});
		// copy dom factor links
		const domGraph = graph.graphs[0];
		domFactors.map((ndx, i) =>
		{
			const src = preCurryGraph.getFactor(ndx);
			domGraph.graphs[i].copyGraph({map:factorMap, src});
		});
		// copy hom factor links
		if (homFactors.length === 1 && U.ArrayEquals(homFactors[0], [0]))	// check for entire domain
		{
			const src = preCurryGraph.getFactor(homFactors[0]);
			const target = cod.graphs[0];
			target.copyGraph({map:factorMap, src});
		}
		else
		{
			base = [1];
			k = 0;
			homFactors.map((ndx, i) =>
			{
				if (i < homFactors.length -1 && U.ArrayEquals(homFactors[i+1], [-2]))
				{
					const src = preCurryGraph.getFactor(ndx);
					base.push(0);
					const target = graph.getFactor(base);
					base.pop();
					target.copyGraph({map:factorMap, src});
					k = 0;
				}
				else if (U.ArrayEquals(ndx, [-2]))
				{
					base.push(1);
					k = 0;
				}
				else
				{
					if (k === 0)
						base.push(k++);
					else
					{
						base.pop();
						base.push(k++);
					}
					const src = preCurryGraph.getFactor(ndx);
					const target = graph.getFactor(base);
					target.copyGraph({map:factorMap, src});
				}
			});
		}
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static Basename(diagram, args)
	{
		const preCur = diagram.codomain.getElement(args.preCurry);
		return `Lm{${preCur.name}:${U.a2s(args.domFactors)}:${U.a2s(args.homFactors)}}mL`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:LambdaMorphism.Basename(diagram, args)});
	}
	static Domain(diagram, preCurry, factors)
	{
		const seq = diagram.get('ProductObject', {objects:[preCurry.domain, preCurry.codomain]});
		const dom = diagram.get('ProductObject', {objects:factors.map(f => seq.getFactor(f))});
		seq.decrRefcnt();
		return dom;
	}
	static Codomain(diagram, preCurry, factors)
	{
		const seq = diagram.get('ProductObject', {objects:[preCurry.domain, preCurry.codomain]});
		const isCodHom = preCurry.codomain instanceof HomObject;
		let codomain = isCodHom ? preCurry.codomain.baseHomDom() : preCurry.codomain;
		const fctrs = factors.slice();
		let objects = [];
		let isProd = true;
		while(fctrs.length > 0)
		{
			const f = fctrs.pop();
			if (U.ArrayEquals(f, [-2]))	// form hom level
			{
				codomain = diagram.hom(diagram.prod(...objects), codomain);
				objects = [];
				isProd = false;
			}
			else if (U.ArrayEquals(f, [-1]))	// add to products at this level
				isProd = true;
			else
				objects.push(seq.getFactor(f));
		}
		if (objects.length > 0)
			codomain = diagram.get('HomObject', {objects: [diagram.get('ProductObject', {objects}), codomain]});
		seq.decrRefcnt();
		return codomain;
	}
	static ProperName(preCurry, domFactors, homFactors)
	{
		if (domFactors.length === 0 && homFactors.length === 1)
		{
			const f = homFactors[0];
			if (Array.isArray(f) && f.length === 2 && f[0] === 0 && f[1] === 0)
				return `&lsquo;${preCurry.properName}&rsquo;`;
		}
		const df = domFactors.map(f =>
		{
			if (Array.isArray(f))
			{
				const g = f.slice();
				g.shift();
				return g.length > 0 ? `[${g.toString()}]` : '';
			}
			return f.toString();	// for -1
		}).join();
		let hf = '';
		homFactors.map(f =>
		{
			if (U.ArrayEquals(f, [-2]))
				hf += '/';
			else
			{
				const g = f.slice();
				g.shift();
				hf += g.length > 0 ? `[${g.toString()}]` : '';
			}
		}).join();
		return `&lambda;&lt;${preCurry.properName}${df}${df !== '' || hf !== '' ? '::' : ''}${hf}&gt;`;
	}
}

class HomMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		if (morphisms.length !== 2)
			throw 'not exactly two morphisms';
		const nuArgs = U.Clone(args);
		nuArgs.basename = HomMorphism.Basename(diagram, {morphisms});
		nuArgs.domain = HomMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = HomMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = HomMorphism.ProperName(morphisms);
		nuArgs.description = `The hom morphism formed from ${nuArgs.morphisms[0].properName} and ${nuArgs.morphisms[1].properName}`;
		super(diagram, nuArgs);
		this.constructor.name === 'HomMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td('Hom')));
	}
	needsParens()
	{
		return false;
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		this.morphisms.map((m, i) =>
		{
			const g = m.getGraph(data);
			graph.graphs[0].graphs[i].copyGraph({src:g.graphs[i === 0 ? 1 : 0], map:[[[i === 0 ? 0 : 1], [1, i]]]});
			graph.graphs[1].graphs[i].copyGraph({src:g.graphs[i === 0 ? 0 : 1], map:[[[i === 0 ? 1 : 0], [0, i]]]});
		});
		return graph;
	}
	static Basename(diagram, args)
	{
		return `Ho{${args.morphisms.map(m => m.name).join(',')}}oH`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:HomMorphism.Basename(diagram, args)});
	}
	static Domain(diagram, morphisms)
	{
		return diagram.get('HomObject', {objects:[morphisms[0].codomain, morphisms[1].domain]});
	}
	static Codomain(diagram, morphisms)
	{
		return diagram.get('HomObject', {objects:[morphisms[0].domain, morphisms[1].codomain]});
	}
	static ProperName(morphisms)
	{
		return `[${morphisms[0].properName}, ${morphisms[1].properName}]`;
	}
	static Signature(sigs)
	{
		return U.SigArray([3, ...sigs]);
	}
}

class Evaluation extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		if (!Evaluation.CanEvaluate(nuArgs.domain))
			throw 'object for evaluation domain cannot be evaluated';
		nuArgs.basename = Evaluation.Basename(diagram, {domain:nuArgs.domain});
		nuArgs.codomain = nuArgs.domain.objects[0].objects[1];
		nuArgs.properName = Evaluation.ProperName(nuArgs.domain);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.constructor.name === 'Evaluation' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Evaluation')));
		return help;
	}
	$(args)
	{
		if (typeof args[0] === 'string')
			args[0] = this.diagram.getElement(args[0]);
		return args[0].$([args[1]]);
	}
	getGraph()
	{
		const graph = super.getGraph();
		const domain = graph.graphs[0];
		const domHom = domain.graphs[0];
		const codomain = graph.graphs[1];
		domain.graphs[1].bindGraph({cod:domHom.graphs[0],	index:[], domRoot:[0, 1],	codRoot:[0, 0, 0],	offset:0});
		domHom.graphs[1].bindGraph({cod:codomain, 			index:[], domRoot:[0, 0, 1], codRoot:[1],		offset:0});
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static CanEvaluate(object)
	{
		return object instanceof ProductObject &&
			object.objects.length === 2 &&
			object.objects[0] instanceof HomObject &&
			object.objects[0].objects[0].isEquivalent(object.objects[1]);
	}
	static Basename(diagram, args)
	{
		return `Ev{${args.domain.name}}vE`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Evaluation.Basename(diagram, args)});
	}
	static ProperName(object)
	{
		return 'e';
	}
}

class Distribute extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = Distribute.Codomain(diagram, nuArgs.domain);
		nuArgs.basename = Distribute.Basename(diagram, nuArgs);
		nuArgs.properName = Distribute.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'side', {value: nuArgs.side, writable: false});
		this.constructor.name === 'Distribute' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Distribute')));
		return help;
	}
	hasInverse()
	{
		return true;
	}
	getInverse()
	{
		return this.diagram.get('Dedistribute', {domain:this.codomain, side:this.side});
	}
	json()
	{
		const a = super.json();
		a.side = this.side;
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static Basename(diagram, args)
	{
		return `Di{${args.domain.name}}-${args.side}iD`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Distribute.Basename(diagram, args)});
	}
	static Get(diagram, args)
	{
		const name = Distribute.Codename(diagram, args);
		const m = diagram.getElement(name);
		return m ? m : new Distribute(diagram, args);
	}
	static HasForm(diagram, ary)	// TODO what about side?
	{
		if (ary.length === 1 && ary[0] instanceof DiagramObject)
		{
			const from = ary[0];
			const to = from.to;
			if (to instanceof ProductObject && !to.dual && to.objects[1] instanceof ProductObject && to.objects[1].dual)
				return true;
		}
		return false;
	}
	static ProperName()
	{
		return 'dist';	// TODO what about side?
	}
	static Codomain(diagram, object)
	{
		const leftie = this.side === 'left';
		const topOp = object.dual ? 'coprod' : 'prod';
		const botOp = object.dual ? 'prod' : 'coprod';
		const a = object.objects[leftie ? 0 : 1];
		const objects = object.objects[leftie ? 1 : 0].objects.map(o => diagram[topOp](leftie ? a : o, leftie ? o : a));
		return diagram[botOp](...objects);
	}
}

class Dedistribute extends Morphism	// TODO what about side?
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = Dedistribute.Codomain(diagram, nuArgs.domain);
		nuArgs.basename = Distribute.Basename(diagram, {domain:nuArgs.domain});
		nuArgs.properName = Distribute.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.constructor.name === 'Dedistribute' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Dedistribute')));
		return help;
	}
	hasInverse()
	{
		return true;
	}
	getInverse()
	{
		return this.diagram.get('Distribute', {domain:this.codomain});
	}
	getHtmlRep(idPrefix, config = {})
	{
		const nuConfig = U.Clone(config);
		nuConfig.addbase = false;
		return super.getHtmlRep(idPrefix, nuConfig);
	}
	static Basename(diagram, args)
	{
		return `De{${args.domain.name}}eD`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Dedistribute.Basename(diagram, args)});
	}
	static Get(diagram, args)
	{
		const name = Dedistribute.Codename(diagram, {domain:args.domain});
		const m = diagram.getElement(name);
		return m ? m : new Dedistribute(diagram, args);
	}
	static HasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1 && ary[0] instanceof DiagramObject)
		{
			const from = ary[0];
			const to = from.to;
			if (to instanceof ProductObject && to.dual && to.objects[0] instanceof ProductObject && !to.objects[0].dual)
			{
				const obj0 = to.objects[0].objects[0];
				return to.objects.reduce((doit, o) => doit && o instanceof ProductObject && !o.dual && obj0.isEquivalent(o.objects[0]), true);
			}
		}
		return false;
	}
	static ProperName()
	{
		return 'dist';
	}
	static Codomain(diagram, object)
	{
		const a = object.objects[0].objects[0];	// take the first summand's product's left hand side
		const objects = object.objects.map(o => o.objects[1]);
		const sum = diagram.get('ProductObject', {objects, dual:true});
		return diagram.get('ProductObject', {objects:[a, sum]});
	}
}

class Functor extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		if (typeof nuArgs.domain === 'string')
			nuArgs.domain = diagram.getElement(args.domain);
		if (typeof nuArgs.codomain === 'string')
			nuArgs.codomain = diagram.getElement(args.codomain);
		super(diagram, nuArgs);
		this.constructor.name === 'Functor' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Functor')));
		return help;
	}
}

class Diagram extends Functor
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.category = U.GetArg(args, 'category', (diagram && 'codomain' in diagram) ? diagram.codomain : null);
		if (!(nuArgs.codomain instanceof Category))
			nuArgs.codomain = diagram ? diagram.getElement(nuArgs.codomain) : R.Cat;
		const indexName = `${nuArgs.basename}_Index`;
		nuArgs.domain = new IndexCategory(diagram, {basename:indexName, description:`index category for diagram ${nuArgs.name}`, user:nuArgs.user});
		super(diagram, nuArgs);
		const _log = 'log' in nuArgs ? nuArgs.log : [];
		const _antilog = 'antilog' in nuArgs ? nuArgs.antilog : [];
		Object.defineProperties(this,
		{
			assertions:					{value:new Map(),	writable:false},
			colorIndex2colorIndex:		{value:{},			writable:true},
			colorIndex2color:			{value:{},			writable:true},
			colorIndex:					{value:0,			writable:true},
			elements:					{value:new Map(),	writable:false},
			link2colorIndex:			{value:{},			writable:true},
			_log:						{value:_log,		writable:true},
			_antilog:					{value:_antilog,	writable:true},
			readonly:					{value: 'readonly' in nuArgs ? nuArgs.readonly : false,		writable: true},
			references:					{value:new Map(),	writable:false},
			allReferences:				{value:new Map(),	writable:true},
			selected:					{value:[],			writable:true},
			svgRoot:					{value:null,		writable:true},
			svgBase:					{value:null,		writable:true},
			timestamp:					{value:U.GetArg(args, 'timestamp', Date.now()),	writable:true},
			user:						{value:args.user,	writable:false},
			viewport:					{value:{x:0, y:0, scale:1.0, width:D.Width(), height:D.Height(), visible:false},	writable:true},
		});
		if ('references' in args)
			args.references.map(r => this.addReference(r, false));
		R.sync = true;
		if ('viewport' in nuArgs)
		{
			this.viewport = nuArgs.viewport;
			if (!('width' in nuArgs))
			{
				this.viewport.width = D.Width();
				this.viewport.height = D.Height();
				this.viewport.visible = false;
			}
		}
		if ('elements' in nuArgs)
			this.codomain.process(this, nuArgs.elements, this.elements);
		if ('domainElements' in nuArgs)
		{
			if (R.initialized)
				this.makeSVG();
			this.domain.process(this, nuArgs.domainElements);
		}
		R.SetDiagramInfo(this);
		this.postProcess();
		diagram && this.constructor.name === 'Diagram' && R.EmitCATEvent(diagram, 'new', this);
	}
	addElement(elt)
	{
		const isIndex = U.IsIndexElement(elt);
		const cat = isIndex ? this.domain : this.codomain;
		if (cat.elements.has(elt.name))
		{
			console.log('duplicate name', elt.name);
			throw `Element with given name already exists in category ${elt.name}`;
		}
		if (this.elements.has(elt.basename))
			throw `Element with given basename already exists in diagram`;
		if (!isIndex)
			this.elements.set(elt.basename, elt);
		cat.elements.set(elt.name, elt);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Diagram')));
		return help;
	}
	json()
	{
		const a = super.json();
		if ('viewport' in this)
			a.viewport = this.viewport;
		a.references = [...this.references.keys()];
		a.domainElements = [...this.domain.elements.values()].filter(e => ((e.to && e.to.canSave()) || (!('to' in e)))).map(e => e.json());
		a.elements = [...this.elements.values()].filter(e => e.canSave() && e.refcnt > 0).map(e => e.json());
		a.readonly = this.readonly;
		a.user = this.user;
		a.timestamp = this.timestamp;
		return a;
	}
	getAnon(s)
	{
		let id = 0;
		while(true)
		{
			const basename = `${s}_${id++}`;
			const name = `${this.name}/${basename}`;
			if (!this.elements.has(basename) && !this.domain.elements.has(name))
				return basename;
		}
	}
	getViewport(orig = false)
	{
		if (orig)
			return this.viewport;
		let viewport = D.viewports.get(this.name);
		if (!viewport)
		{
			const str = U.readfile(`${this.name}-viewport.json`);
			if (str)
			{
				viewport = JSON.parse(str);
				D.viewports.set(this.name, viewport);
				return viewport;
			}
		}
		return viewport ? U.Clone(viewport) : {x:0, y:0, scale:1, visible:false};
	}
	setViewport(args)
	{
		const x = Math.round(args.x);
		const y = Math.round(args.y);
		const scale = args.scale;
		const visible = 'visible' in args ? args.visible : true;
		if (visible)
			this.svgRoot.classList.remove('hidden');
		else
			this.svgRoot.classList.add('hidden');
		this.svgTranslate.setAttribute('transform', `translate(${x} ${y}) scale(${scale} ${scale})`);
		const viewport = {x, y, scale, visible, timestamp:Date.now()};
		U.writefile(`${this.name}-viewport.json`, JSON.stringify(viewport));
		D.viewports.set(this.name, viewport);
		this.updateBackground();
		R.EmitDiagramEvent(this, 'view');
	}
	setViewportByBBox(bbox, log = true)
	{
		/*
		if (bbox.width === 0)
			bbox.width = D.Width();
		const margin = D.navbar.element.getBoundingClientRect().height;
		const dw = D.Width() - 2 * D.default.panel.width - 2 * margin;
		const dh = D.Height() - 4 * margin;
		const xRatio = bbox.width / dw;
		const yRatio = bbox.height / dh;
		const scale = 1.0/Math.max(xRatio, yRatio);
		let x = - bbox.x * scale + D.default.panel.width + margin;
		let y = - bbox.y * scale + 2 * margin;
		if (xRatio > yRatio)
			y += dh/2 - scale * bbox.height/2;
		else
			x += dw/2 - scale * bbox.width/2;
		this.setViewport({x, y, scale});
			*/
		this.setViewport(D.getViewportByBBox(bbox));
	}
	home(log = true)
	{
		const bbox = new D2(this.svgBase.getBBox());
		this.setViewportByBBox(bbox, log);
	}
	getObject(name)
	{
		if (name instanceof Element)
			return name;
		let object = this.codomain.getElement(name);
		if (object)
			return object;
		return this.domain.getElement(name);
	}
	addSVG(element)
	{
		if (this.svgBase)
			element.getSVG(this.svgBase);
	}
	actionHtml(e, name, args = {})
	{
		D.RemoveChildren(D.toolbar.help);
		D.toolbar.clearError();
		const action = this.codomain.actions.get(name);
		if (action && action.hasForm(R.diagram, this.selected))
			action.html(e, R.diagram, this.selected, args);
	}
	activate(e, name, args)
	{
		try
		{
			const action = this.codomain.actions.get(name);
			if (action && action.hasForm(R.diagram, this.selected))
				args ? action.action(e, this, this.selected, args) : action.action(e, this, this.selected);
		}
		catch(x)
		{
			D.RecordError(x);
		}
	}
	mouseDiagramPosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY - D.topSVG.parentElement.offsetTop});
	}
	deselectAll(e)
	{
		this.makeSelected(null);
	}
	deselect(e)
	{
		const ndx = this.selected.indexOf(e);
		ndx > -1 && this.selected.splice(ndx, 1);
		e.showSelected(false);
	}
	selectAll()
	{
		this.deselectAll();
		this.domain.elements.forEach(e => this.addSelected(e));
		this.assertions.forEach(e =>this.addSelected(e));
	}
	selectElement(e, name)
	{
		const elt = this.getElement(name);
		if (elt)
		{
			D.dragStart = D.mouse.clientPosition();
			if (!this.selected.includes(elt))
			{
				if (e.shiftKey)
					this.addSelected(elt);
				else
					this.makeSelected(elt);
			}
			else if (e.shiftKey)
				this.deselect(elt);
			else
				D.toolbar.show();
			if (elt instanceof DiagramObject)
				elt.orig = {x:elt.x, y:elt.y};
		}
		else if (this.domain.cells.has(name))
		{
			const cell = this.domain.cells.get(name);
			const a = this.getAssertion(cell.signature);
			if (a)
				this.addSelected(a);
			else
			{
				cell.left.map(m => this.addSelected(m));
				cell.right.map(m => this.addSelected(m));
			}
		}
		else
			this.deselectAll(e);	// error?
	}
	makeSelected(elt)
	{
		if (this.selected.length > 0)
		{
			this.selected.map(elt =>
			{
				elt.showSelected(false);
				R.EmitDiagramEvent(this, 'deselect', elt);
			});
			this.selected.length = 0;
		}
		R.EmitDiagramEvent(this, 'select', '');
		if (elt)
			this.addSelected(elt);
	}
	addSelected(elt)
	{
		elt.showSelected();
		if (!this.selected.includes(elt))	// not already selected
		{
			this.selected.push(elt);
			if (elt instanceof DiagramObject || elt instanceof DiagramText)
				elt.finishMove();
			else if (elt instanceof DiagramMorphism)
			{
				elt.domain.finishMove();
				elt.codomain.finishMove();
			}
		}
		R.EmitElementEvent(this, 'select', elt);
	}
	areaSelect(e)
	{
		const p = this.userToDiagramCoords(D.GetAreaSelectCoords());
		const q = new D2(p.x + p.width, p.y + p.height);
		let selected = [];
		this.domain.elements.forEach(function(elt)
		{
			if (elt instanceof DiagramMorphism && D2.Inside(p, elt.domain, q) && D2.Inside(p, elt.codomain, q))
				selected.push(elt);
			else if (D2.Inside(p, elt, q))
				selected.push(elt);
		}, this);
		selected.map(elt => this.addSelected(elt));
	}
	getAssertion(sig)
	{
		for (const [n, a] of this.assertions)
			if (sig === a.signature)
				return a;
		return null;
	}
	updateDragObjects(e)
	{
		const delta = D.mouse.clientPosition().subtract(D.dragStart);
		const viewport = this.getViewport();
		delta.x = delta.x / viewport.scale;
		delta.y = delta.y / viewport.scale;
		const dragObjects = new Set();
		this.selected.map(elt =>
		{
			if (elt instanceof DiagramMorphism)
			{
				dragObjects.add(elt.domain);
				dragObjects.add(elt.codomain);
			}
			else if (elt instanceof DiagramObject || elt instanceof DiagramText)
				dragObjects.add(elt);
			else if (elt instanceof Cell)
				elt.getObjects().map(o => dragObjects.add(o));
		});
		const updated = new Set();
		function updateMorphism(m)
		{
			if (!updated.has(m))
			{
				m.update();
				updated.add(m);
			}
		}
		dragObjects.forEach(function(o)
		{
			o.update(delta.add(o.orig));
			if (o instanceof DiagramObject)
			{
				o.domains.forEach(updateMorphism);
				o.codomains.forEach(updateMorphism);
			}
		});
		this.updateBackground();
	}
	placeText(e, xy, description, height = '24', weight = 'normal')
	{
		const txt = new DiagramText(this, {description, xy, height, weight});
		const bbox = new D2(txt.svg.getBBox());
		let offbox = new D2(bbox);
		while (this.hasOverlap(offbox, txt.name))
			offbox = offbox.add(D.default.stdOffset);
		txt.update(new D2(xy).add(offbox.subtract(bbox)));
		R.diagram && this.makeSelected(txt);
		return txt;
	}
	placeObject(e, to, xyIn, save = true)
	{
		const xy = xyIn ? new D2(D.Grid(xyIn)) : D.Center(this);
		const from = new DiagramObject(this, {xy, to});
		if (save)
			this.makeSelected(from);
		R.EmitElementEvent(this, 'new', from);
		return from;
	}
	placeMorphism(e, to, xyDom = null, xyCod = null, select = true, doOffset = true)
	{
		if (typeof to === 'string')
			to = this.getElement(to);
		let xyD = null;
		let domain = null;
		if (xyDom instanceof DiagramObject)
		{
			if (xyDom.to !== to.domain)
				throw 'index object target does not match morphism domain';
			xyD = new D2(xyDom);
			domain = xyDom;
		}
		else
		{
			xyD = xyDom ? new D2(D.Grid(xyDom)) : D.toolbar.mouseCoords ? D.toolbar.mouseCoords : D.Center(R.diagram);	// use original location
			if (doOffset)
				xyD = xyD.add(D.default.stdOffset);
			domain = new DiagramObject(this, {to:to.domain, xy:xyD});
		}
		let xyC = null;
		let codomain = null;
		if (xyCod instanceof DiagramObject)
		{
			if (xyCod.to !== to.codomain)
				throw 'index object target does not match morphism codomain';
			codomain = xyCod;
			doOffset = false;
		}
		else if (typeof xyCod === 'object' && xyCod !== null)
		{
			let xy = new D2(xyCod);
			if (doOffset)
				xy = xy.add(D.default.stdOffset);
			codomain = new DiagramObject(this, {to:to.codomain, xy});
		}
		else
		{
			const ad = D.ArrowDirection();
			const tw = to.textwidth();
			let xy = new D2({x:xyD.x + Math.min(ad.x, tw), y:xyD.y + ad.y});
			if (doOffset)
				xy = xy.add(D.default.stdOffset);
			codomain = new DiagramObject(this, {to:to.codomain, xy});
		}
		xyC = new D2(codomain.getXY());
		const from = new DiagramMorphism(this, {to, domain, codomain});
		if (select)
			this.makeSelected(from);
		return from;
	}
	placeMorphismByObject(e, dir, objectName, morphismName, select = true, xy = null)
	{
		try
		{
			const to = this.getElement(morphismName);
			const fromObj = this.domain.getElement(objectName);
			const toObj = fromObj.to;
//TODO?		if (to[dir].name !== toObj.name)	// by name, not equivalence
			if (!to[dir].isEquivalent(toObj))
				throw `Source and target do not have same signature: ${to[dir].properName} vs ${toObj.properName}`;
			const angles = [];
			fromObj.domains.forEach(m => angles.push(D2.Angle(fromObj, m.codomain)));
			fromObj.codomains.forEach(m => angles.push(D2.Angle(fromObj, m.domain)));
			const arrowLength = Cat.D.GetArrowLength(to);
			if (!xy)
			{
				if (angles.length > 0)
				{
					angles.sort();
					let gap = 0;
					let angle = angles.length > 0 ? angles[0] : D.ArrowDirection().angle();
					let lastAngle = angles[0];
					for(let i=1; i<angles.length; ++i)
					{
						const delta = angles[i] - lastAngle;
						if (delta > gap)
						{
							gap = delta;
							angle = lastAngle + gap/2;
						}
						lastAngle = angles[i];
					}
					if (angles.length > 1)
					{
						const delta = 2 * Math.PI - (angles[angles.length-1] - angles[0]);
						if (delta > gap)
							angle = lastAngle + (delta === 0 ? 2 * Math.PI : delta)/2;
					}
					else
						angle = (angle + Math.PI) % (2 * Math.PI);
					const cosAngle = Math.cos(angle);
					const sinAngle = Math.sin(angle);
					const length = Math.max(D.default.arrow.length, Math.abs(cosAngle * arrowLength));
					xy = D.Grid(D2.Scale(length, {x:cosAngle, y:sinAngle}).add(fromObj));
				}
				else
				{
					const offset = new D2(D.default.stdArrow).scale(arrowLength / D.default.arrow.length);
					xy = new D2(fromObj).add(offset);
				}
			}
			const newElt = new DiagramObject(this, {xy, to: dir === 'domain' ? to.codomain : to.domain});
			const {domainElt, codomainElt} = dir === 'domain' ? {domainElt:fromObj, codomainElt:newElt} : {domainElt:newElt, codomainElt:fromObj};
			const from = new DiagramMorphism(this, {to, domain:domainElt, codomain:codomainElt});
			if (select)
				this.makeSelected(from);
			return from;
		}
		catch(x)
		{
			D.RecordError(x);
		}
	}
	updateFusible(e)
	{
		let fusible = false;
		if (this.selected.length === 1)
		{
			const elt = this.getSelected();
			elt.updateFusible(e, elt.isFusible(D.mouseover));
		}
		return fusible;
	}
	hasOverlap(box, except = '')
	{
		const elts = this.svgBase.querySelectorAll('.object, .diagramText, .morphTxt, .cellTxt, path');
		let r = null;
		for (let i=0; i<elts.length; ++i)
		{
			const e = elts[i];
			if (e.dataset.name === except)
				continue;
			let compBox = e.getBBox();
			if (e.classList.contains('diagramText'))
			{
				const txt = this.getElement(e.dataset.name);
				compBox.x += txt.x;
				compBox.y += txt.y;
			}
			else if (e instanceof SVGPathElement)
			{
				const morphism = this.getElement(e.dataset.name);
				if (!this.bezier && D2.lineBoxIntersect(morphism.start, morphism.end, box))
					return true;
			}
			else if (D2.Overlap(box, new D2(compBox)))
				return true;
		}
		return false;
	}
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	makeSVG()
	{
		if (!this.svgRoot)
		{
			this.svgRoot = H3.g({id:this.elementId('root'), 'data-name':this.name});
			const bkgnd = H3.rect(`##${this.elementId('background')}.diagramBackground`, {x:0, y:0, width:D.Width(), height:D.Height()});
			bkgnd.onmouseenter = e =>
			{
				if (R.diagram != this)
					R.SelectDiagram(this);
			};
			bkgnd.onmouseleave = e =>
			{
				if (D.default.fullscreen)
					return;
//				if (!e.toElement)
//					R.SelectDiagram(null);
//				else
				if (e.toElement)
				{
					let elt = e.toElement;
					let notOurs = true;
					let diagram = null;
					while(elt && 'id' in elt && elt.id !== 'topSVG')
					{
						// if the name is not one of our elements, or not our own name, then we were left behind
						if ('name' in elt.dataset)
						{
							const name = elt.dataset.name;
							const isOwnElt = this.domain.elements.has(name);
							if (isOwnElt || name === this.name)
							{
								notOurs = false;
								break;
							}
							if (R.$CAT.codomain.elements.has(name))
							{
								diagram = name;
								break;
							}
						}
						else if (elt.id === 'navbar' || elt.id === 'toolbar')
						{
							notOurs = false;
							break;
						}
						elt = elt.parentElement;
					}
					diagram && notOurs && R.SelectDiagram(diagram);
				}
			};
			let delta = null;
			const onMouseMove = e =>
			{
				this.setViewport({x:e.clientX - delta.x, y:e.clientY - delta.y, scale:this.getViewport().scale});
				D.toolbar.hide();
			};
			bkgnd.onmouseup = e =>
			{
				document.removeEventListener('mousemove', onMouseMove);
				bkgnd.nextSibling.classList.add('trans025s');
			};
			bkgnd.onmousedown = e =>
			{
				// move the diagram
				// TODO area select
				const click = new D2(e.clientX, e.clientY);
				const viewport = this.getViewport();
				delta = click.subtract(viewport);
				document.addEventListener('mousemove', onMouseMove);
				bkgnd.nextSibling.classList.remove('trans025s');
				e.preventDefault();
			};
			this.svgRoot.appendChild(bkgnd);
			D.diagramSVG.appendChild(this.svgRoot);
			this.svgBase = H3.g({id:`${this.elementId()}-base`});
			this.svgTranslate = H3.g({id:this.elementId('T')}, this.svgBase);
			this.svgRoot.appendChild(this.svgTranslate);
			this.svgRoot.classList.add('hidden');
			this.domain.elements.forEach(elt => this.addSVG(elt));
		}
		this.domain.cells.forEach(d => this.addSVG(d));
	}
	upload(e)
	{
		if (R.cloud && ((this.user === R.user.name && R.user.status === 'logged-in') || R.user.isAdmin()))
		{
			const start = Date.now();
			const btn = document.getElementById('diagramUploadBtn');
			if (e && btn)	// start button animation
			{
				btn.setAttribute('repeatCount', 'indefinite');
				btn.beginElement();
			}
			R.upload(e, this, true, res =>
			{
				btn && btn.setAttribute('repeatCount', 1);
				if (!res.ok)
				{
					D.RecordError(res.statusText);
					return;
				}
				R.default.debug && console.log('uploaded', this.name);
				R.catalog.set(this.name, R.GetDiagramInfo(this));
				R.ServerDiagrams.set(this.name, this);
				const delta = Date.now() - start;
				if (e)
				{
					D.statusbar.show(e, 'Uploaded diagram', true);
					console.log('diagram uploaded ms:', delta);
					R.EmitCATEvent('upload', this.name);
				}
			});
		}
		else
			D.RecordError('You need to be logged in to upload your work.');
	}
	userToDiagramCoords(xy)
	{
		const viewport = this.getViewport();
		const s = 1.0 / viewport.scale;
		if (isNaN(viewport.x) || isNaN(s))
			throw 'NaN in coords';
//		const d2 = new D2(	s * (xy.x - viewport.x + D.session.viewport.x),
//							s * (xy.y - viewport.y + D.session.viewport.y));
		const d2 = new D2(	s * (xy.x - viewport.x),
							s * (xy.y - viewport.y));
		if ('width' in xy)
		{
			d2.width = s * xy.width;
			d2.height = s * xy.height;
		}
		return d2;
	}
	diagramToUserCoords(xy)
	{
		const viewport = this.getViewport();
		const s = viewport.scale;
		const userXy = new D2(xy).scale(s).add(viewport);
//		return new D2(xy).scale(s).add(viewport).subtract(D.session.viewport);
		return new D2(xy).scale(s).add(viewport);
	}
	replaceElements(elements)
	{
		this.elements.clear();
		elements.map(elt => this.elements.set(elt.basename, elt));
		this.codomain.reconstituteElements();
	}
	reconstituteElements()
	{
		const elements = [...this.elements.values()];
		this.replaceElements(elements);
	}
	editElementText(e, name, id, attribute)
	{
		D.toolbar.clearError();
		try
		{
			const qry = `#${id} ${attribute === 'properName' ? 'proper-name' : attribute}`;
			const txtbox = document.querySelector(qry);
			let value = null;
			if (this.isEditable() && txtbox.contentEditable === 'true' && txtbox.textContent !== '')
			{
				txtbox.contentEditable = false;
				const elt = this.getElement(name);
				value = txtbox.innerText.trimRight();	// cannot get rid of newlines on the end in a text box
				const old = elt.editText(e, attribute, value);
				this.log({command:'editText', name, attribute, value});		// use old name
				this.antilog({command:'editText', name:elt.name, attribute, value:old});	// use new name
				e && e instanceof Event && e.stopPropagation();
				if (!(elt instanceof DiagramText))
					this.updateProperName(elt);
				R.EmitElementEvent(this, 'update', elt);
			}
			else
			{
				txtbox.contentEditable = true;
				txtbox.focus();
				txtbox.onkeydown = e => e.stopPropagation();
			}
			return value;
		}
		catch(x)
		{
			D.toolbar.showError(U.HtmlEntitySafe(`Error: ${x}`));
		}
	}
	updateMorphisms()
	{
		this.domain.forEachMorphism(m => m.update());
	}
	isIsolated(elt)
	{
		let r = false;
		if (elt instanceof DiagramObject)
			r = elt.refcnt === 1;
		else if (elt instanceof DiagramMorphism)
			r = elt.domain.domains.size === 1 && elt.domain.codomains.size === 0 && elt.codomain.domains.size === 0 && elt.codomain.codomains.size === 1;
		return r;
	}
	selectedCanRecurse()
	{
		let r = false;
		if (this.selected.length === 2)
		{
			const sel0 = this.selected[0].to;
			const sel1 = this.selected[1].to;
			if (sel0 instanceof DiagramMorphism && sel1 instanceof DiagramMorphism)
			{
				const domain = sel0.domain;
				r = sel0.domain.isEquivalent(sel1.domain) &&
					sel0.codomain.isEquivalent(sel1.codomain) &&
					sel1 instanceof Composite &&
					sel1.getElement(sel0);
				const N = this.getElement('N');
				if (r && N)
				{
					if (sel0.domain.isEquivalent(N))
						return true;
					r = domain instanceof ProductObject &&
						domain.objects.length === 3 &&
						N.isEquivalent(domain.objects[0]);
					if (r)
					{
						const factor1 = domain.objects[1];
						const factor2 = domain.objects[2];
						r = factor1 instanceof HomObject &&
							factor2.isEquivalent(factor1.objects[0]) &&
							factor2.isEquivalent(factor1.objects[1]);
					}
				}
			}
		}
		return r;
	}
	getElement(name)
	{
		let elt = this.domain.getElement(name);
		if (elt)
			return elt;
		if (this.elements.has(name))
			return this.elements.get(name);
		if (this.codomain.elements.has(name))
			return this.codomain.getElement(name);
		return this.domain.getElement(name);
	}
	getElements(ary)
	{
		return ary.map(e => this.getElement(e)).filter(e => e !== undefined);
	}
	hasIndexedElement(name)
	{
		let result = false;
		this.domain.elements.forEach(elt => {if ('to' in elt && elt.to.name === name) result = true;});
		return result;
	}
	forEachObject(fn)
	{
		this.elements.forEach(e => e instanceof CatObject && fn(e));
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(e => e instanceof Morphism && fn(e));
	}
	forEachText(fn)
	{
		this.domain.elements.forEach(e => e instanceof DiagramText && fn(e));
	}
	showGraph(m)
	{
		m.isGraphHidden() ? m.showGraph() : m.removeGraph();
	}
	showGraphs()
	{
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
		let exist = false;
		this.domain.forEachMorphism(m => exist = exist || ('graph' in m && m.graph.svg && !m.graph.svg.classList.contains('hidden')));
		this.domain.forEachMorphism(m => exist ? m.removeGraph() : m.showGraph());
	}
	downloadJSON(e)
	{
		D.DownloadString(this.stringify(), 'json', `${this.name}.json`);
	}
	downloadJS(e)
	{
		return this.codomain.actions.get('javascript').download(e, this);
	}
	downloadCPP(e)
	{
		return this.codomain.actions.get('cpp').download(e, this);
	}
	downloadPNG()
	{
		D.Download(D.diagramPNGs.get(this.name), `${this.name}.png`);
	}
	downloadLog(e)
	{
		D.DownloadString(JSON.stringify(this._log), 'log', `${this.name}.json`);
	}
	getAllReferenceDiagrams(refs = new Map())
	{
		this.references.forEach(function(r)
		{
			if (refs.has(r.name))
				refs.set(r.name, 1 + refs[r.name]);
			else
				refs.set(r.name, 1);
			r.getAllReferenceDiagrams(refs);
		});
		return refs;
	}
	canRemoveReference(name)
	{
		const ref = R.CAT.getElement(name);		// TODO fix this
		for(const [name, e] of this.elements)
		{
			if (e.usesDiagram(ref))
				return false;
		}
		return true;
	}
	removeReference(name)
	{
		if (R.diagram.canRemoveReference(name))
		{
			const r = this.references.get(name);
			if (r)
			{
				this.references.delete(r.name);
				this.allReferences = this.getAllReferenceDiagrams();
				R.SetDiagramInfo(this);
			}
		}
	}
	addReference(elt, emit = true)	// immediate, no background fn
	{
		const name = elt instanceof Diagram ? elt.name : elt;
		if (name === this.name)
			throw 'Do not reference yourself';
		const diagram = R.LoadDiagram(name);
		if (!diagram)
			throw 'cannot load diagram';
		if (diagram.codomain.name !== this.codomain.name)
			throw 'diagram category does not match';
		if (this.allReferences.has(diagram.name))
			throw `Diagram ${diagram.name} is already referenced `;
		if (diagram.allReferences.has(this.name))
			throw `Diagram ${diagram.name} already references this one`;
		this.references.set(name, diagram);
		diagram.incrRefcnt();
		this.allReferences = this.getAllReferenceDiagrams();
		emit && R.EmitDiagramEvent(this, 'addReference', diagram.name);
	}
	unlock(e)
	{
		if (this.user === R.user.name)
		{
			this.readonly = false;
			D.DiagramPanel.UpdateLockBtn(this);
		}
		this.log({command:'unlock'});
		R.EmitCATEvent('update', this);
	}
	lock(e)
	{
		if (this.user === R.user.name)
		{
			this.readonly = true;
			D.DiagramPanel.UpdateLockBtn(this);
		}
		this.log({command:'lock'});
		R.EmitCATEvent('update', this);
	}
	clear(save = true)
	{
		this.deselectAll();
		Array.from(this.assertions).reverse().map(a =>
		{
			const assertion = a[1];
			assertion.decrRefcnt();
		});
		this.domain.clear();
		Array.from(this.elements).reverse().map(a => a[1].decrRefcnt());
		save && R.SaveLocal(this);		// TODO replace with event?
	}
	getObjects()
	{
		const objects = new Set();
		this.forEachObject(o => objects.add(o));
		this.allReferences.forEach(function(cnt, name)
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachObject(o => objects.add(o));
		});
		return [...objects];
	}
	getMorphisms()
	{
		const morphisms = new Set();
		this.forEachMorphism(m => morphisms.add(m));
		this.allReferences.forEach(function(cnt, name)
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachMorphism(m => morphisms.add(m));
		});
		return [...morphisms];
	}
	addAssertion(left, right)
	{
		return this.get('Assertion', {left, right});
	}
	makeCells()
	{
		this.domain.makeCells(this);
	}
	emphasis(c, on)
	{
		const elt = this.getElement(c);
		D.mouseover = on ? elt : null;
		if (elt && (elt instanceof DiagramMorphism || elt instanceof DiagramObject || elt instanceof DiagramText))
			elt.emphasis(on);
		else if (this.domain.cells.has(c))
			this.domain.cells.get(c).emphasis(on);
		if (!on && this.selected.length === 1 && 'dragAlternates' in this.selected[0])
			this.removeDragAlternates();
	}
	removeDragAlternates()
	{
		const obj = this.selected[0];
		obj.dragAlternates.diagMorphisms.map(m => m.decrRefcnt());
	}
	flattenObject(obj)
	{
		let flat = obj;
		switch(obj.constructor.name)
		{
			case 'NamedObject':
				flat = this.flattenObject(obj.base);
				break;
			case 'ProductObject':
				const flats = obj.objects.map(o => this.flattenObject(o));
				flat = obj.dual ? this.coprod(...flats) : this.prod(...flats);
				break;
			case 'HomObject':
				flat = this.hom(...obj.objects.map(o => this.flattenObject(o)));
				break;
		}
		return flat;
	}
	decompose(leg)
	{
		const doit = m =>
		{
			switch(m.constructor.name)
			{
				case 'Composite':
					m.morphisms.map(sm => morphs.push(...this.decompose(sm)));
					break;
				case 'NamedMorphism':
					morphs.push(...this.decompose(m.source));
					break;
				default:
					morphs.push(m);
					break;
			}
		};
		const morphs = [];
		if (Array.isArray(leg))
			leg.map(m => doit(m));
		else
			doit(leg);
		return morphs;
	}
	get(prototype, args)
	{
		const proto = Cat[prototype];
		if (typeof proto === 'undefined')
			throw 'prototype not found';
		let name = proto.Basename(this, args);
		let elt = this.getElement(name);
		if (elt)
			return elt;
		name = proto.Codename(this, args);
		elt = this.getElement(name);
		if (!elt && 'Get' in proto)
			elt = proto.Get(this, args);
		if (!elt)
		{
			elt = new Cat[prototype](this, args);
			if (prototype === 'Category' && 'Actions' in R && 'actions' in args)	// bootstrap issue
				args.actions.map(a => elt.actions.set(a, R.Actions[a]));
		}
		if (!(elt instanceof DiagramMorphism) && 'loadEquivalences' in elt)
			elt.loadEquivalences();
		return elt;
	}
	id(domain)
	{
		return this.get('Identity', {domain});
	}
	comp(...morphisms)
	{
		return morphisms.length > 1 ? this.get('Composite', {morphisms}) : morphisms[0];
	}
	prod(...elements)
	{
		return elements.length > 1 ? (elements[0] instanceof CatObject ? this.get('ProductObject', {objects:elements}) : this.get('ProductMorphism', {morphisms:elements})) :
			elements[0];
	}
	coprod(...elements)
	{
		return elements.length > 1 ?
			(elements[0] instanceof CatObject ? this.get('ProductObject', {objects:elements, dual:true}) : this.get('ProductMorphism', {morphisms:elements, dual:true})) :
			elements[0];
	}
	fctr(obj, factors)
	{
		const dual = obj.dual;
		const args = {dual, factors};
		args[dual ? 'codomain' : 'domain'] = obj;
		return this.get('FactorMorphism', args);
	}
	assy(...morphisms)
	{
		return morphisms.length > 1 ? this.get('ProductAssembly', {morphisms, dual:false}) : morphisms[0];
	}
	coassy(...morphisms)
	{
		return morphisms.length > 1 ? this.get('ProductAssembly', {morphisms, dual:true}) : morphisms[0];
	}
	hom(...elements)
	{
		return elements[0] instanceof CatObject ? this.get('HomObject', {objects:elements}) : this.get('HomMorphism', {morphisms:elements});
	}
	eval(dom, codomain)
	{
		const hom = this.hom(dom, codomain);
		const domain = this.prod(hom, dom);
		return this.get('Evaluation', {domain, codomain});
	}
	dist(domain, side)
	{
		return this.get('Distribute', {domain, side});
	}
	log(cmd)
	{
		cmd.date = new Date();
		this._log.push(cmd);
		cmd.diagram = this;
		D.ttyPanel.logSection.log(cmd);
		this.saveLog();
	}
	antilog(cmd)
	{
		cmd.date = new Date();
		this._antilog.push(cmd);
	}
	saveLog()
	{
		U.writefile(`${this.name}.log`, JSON.stringify(this._log));
	}
	drop(e, action, from, target, log = true)
	{
		this.deselectAll(e);
		target.show(false);
		const fromName = from.name;
		const targetName = target.name;
		action.action(e, this, [target, from], false);
		target.decrRefcnt();	// do not decrement earlier than this
		from.decrRefcnt();
		log && this.log({command:'drop', action:action.name, from:fromName, target:targetName});
	}
	fuse(e, from, target, save = true)
	{
		const isEquiv = from.to.isEquivalent(target.to);
		const identFuse = from.isIdentityFusible() && !isEquiv;
		if (isEquiv && from.getSeq() < target.getSeq())	// keep oldest object
		{
			const f = from;
			from = target;
			target = f;
			target.update(from.getXY());
			target.finishMove();
		}
		this.selected.map(s => s.updateFusible(e, false));
		this.deselectAll(e);
		if (identFuse)
		{
			const m = [...from.codomains][0];
			m.setCodomain(target);
			const oldTo = m.to;
			const basename = this.getAnon('morph');
			const name = Element.Codename(this, {basename});
			m.setMorphism(new Morphism(this, {basename, domain:m.to.domain, codomain:target.to}));
			m.to.loadEquivalences();
			oldTo.decrRefcnt();
			m.svg_name.innerHTML = m.to.properName;
			m.update();
			this.makeSelected(m);
			this.actionHtml(e, 'help');
			this.editElementText(e, m.name, m.to.elementId(), 'basename');
		}
		else
		{
			[...from.domains].map(m =>
			{
				m.setDomain(target);
				m.update();
			});
			[...from.codomains].map(m =>
			{
				m.setCodomain(target);
				m.update();
			});
		}
		from.decrRefcnt();
		R.EmitObjectEvent(this, 'fuse', target);
		return target;
	}
	replay(e, cmd)
	{
		if (D.ReplayCommands.has(cmd.command))
		{
			const obj = D.ReplayCommands.get(cmd.command);
			obj.replay(e, R.diagram, cmd);
			R.default.debug && console.log('replay', cmd);
		}
		else if (cmd.command === 'multiple')	// replay multiple commands like for undo
			cmd.commands.map(c => this.replay(e, c));
	}
	replayCommand(e, ndx)
	{
		let cmd = null;
		if (typeof ndx === 'object')
			cmd = ndx;
		else
			cmd = this._log[ndx];
		this.replay(e, cmd);
	}
	clearLog(e)
	{
		this._log.length = 0;
		this.saveLog();
		D.ttyPanel.logSection.diagram = null;
		D.ttyPanel.logSection.update();
	}
	updateProperName(to)	// TODO change to event 'update'
	{
		this.domain.elements.forEach(from =>
		{
			if (from.to === to)
			{
				if ('svg_name' in from)
					from.svg_name.innerHTML = to.properName;
				else if (to instanceof CatObject)
				{
					from.svg.innerHTML = to.properName;
					from.domains.forEach(o => o.update());
					from.codomains.forEach(o => o.update());
				}
				else
					from.svg.innerHTML = to.properName;
			}
		});
	}
	logViewCommand()
	{
		const log = this._log;
		if (log.length > 0 && log[log.length -1].command === 'view')	// replace last view command?
			D.ttyPanel.logSection.removeLogCommand(null, log.length -1);
		const viewport = this.getViewport();
		this.log({command:'view', x:Math.round(viewport.x), y:Math.round(viewport.y), scale:Math.round(10000.0 * viewport.scale)/10000.0});
	}
	getTerminal(dual = false)
	{
		return this.get('FiniteObject', {size:dual ? 0 : 1});
	}
	viewElements(...elts)
	{
		const elements = this.getElements(elts);
		if (elements.length > 0)
		{
			const bbox = D2.Merge(...elements.map(a => a.getBBox()));
			this.setViewportByBBox(bbox);
		}
	}
	addFactorMorphisms(domain, codomain)
	{
		const dom = domain.getBase();
		const cod = codomain.getBase();
		if (dom instanceof ProductObject && !dom.dual)
			domain.find(codomain).map((f, i) => this.fctr(domain, [f]));
		if (codomain instanceof ProductObject && codomain.dual)
			codomain.find(domain).map((f, i) => this.fctr(domain, [f]));
	}
	getObjectSelector(id, text, change)
	{
		const options = [H3.option(text)];
		const objects = this.getObjects().reverse();
		this.allReferences.forEach((cnt, ref) => objects.push(...R.$CAT.getElement(ref).getObjects().reverse()));
		options.push(...objects.map(o => H3.option(o.properName, {value:o.name})));
		const sel = H3.select('.w100', {id}, options);
		sel.addEventListener('change', change);
		return sel;
	}
	assemble(e, base)
	{
		let scanning = [base];
		const scanned = new Set();
		const diagram = this;
		const morphismSet = new Set();
		const issues = [];
		const factorMorphisms = [];
		const references = new Set();		// factor, identity, or terminal morphisms used as references
		const sources = new Set();
		const propagated = new Set();
		let objects = new Set();
		const balls = [...document.querySelectorAll('.ball')];
		balls.map(ball => ball.parentNode.removeChild(ball));
		//
		// establish connected graph and issues therein
		//
		const isConveyance = function(m)
		{
			const morph = m instanceof DiagramMorphism ? m.to.basic() : m.basic();
			return morph instanceof Identity || morph instanceof FactorMorphism;
		};
		const isProjection = function(m)
		{
			const morph = m instanceof DiagramMorphism ? m.to.basic() : m.basic();
			return morph instanceof Identity || (morph instanceof FactorMorphism && !morph.dual);
		};
		const isInjection = function(m)
		{
			const morph = m instanceof DiagramMorphism ? m.to.basic() : m.basic();
			return morph instanceof Identity || (morph instanceof FactorMorphism && morph.dual);
		};
		while(scanning.length > 0)	// find loops or homsets > 1
		{
			const domain = scanning.pop();
			objects.add(domain);
			[...domain.codomains].filter(domin => !isConveyance(domin.to)).length === 0 && sources.add(domain);
			const scan = scanning;		// jshint
			domain.domains.forEach(function(m)
			{
				morphismSet.add(m);
				isConveyance(m) && references.add(m);		// candidate reference
				m.makeGraph();
				if (m.isEndo())		// in the index cat, not the target cat
				{
					m.svg.classList.add('badGlow');
					issues.push({message:'Circularity cannot be scanned', morphism:m});
					return;
				}
				if (scanned.has(m.codomain) && !isConveyance(m.to) && m.to.dual)
				{
					m.svg.classList.add('badGlow');
					issues.push({message:`Codomain ${m.codomain} has already been scanned`, element:m});
					return;		// do not continue on issue
				}
				!scanned.has(m.codomain) && scan.push(m.codomain) && scanned.add(m.codomain);
			});
			const scanMorphismDomains = function(m)
			{
				morphismSet.add(m);
				!scanned.has(m.domain) && scan.push(m.domain) && scanned.add(m.domain);
			};
			domain.codomains.forEach(scanMorphismDomains);
		}
		if (morphismSet.size === 0)
			issues.push({message:'No morphisms', element:base});
		if (issues.length > 0)
			return issues;

		objects = [...objects];

		const morphisms = [...morphismSet];
		morphisms.map(m => !isConveyance(m.to) && sources.delete(m.codomain)); // remove sources that are outputs
		//
		// create graph for each object in the connected diagram
		//
		const getBarGraph = function(dm)
		{
			const domGraph = dm.domain.assyGraph;
			const codGraph = dm.codomain.assyGraph;
			const barGraph = new Graph(this);
			barGraph.graphs.push(domGraph);
			barGraph.graphs.push(codGraph);
			return barGraph;
		};
		objects.map(o => o.assyGraph = o.to.getGraph());

		//
		// merge tags from morphism graphs to object graphs
		//
		objects.map(o =>
		{
			const graph = o.assyGraph;
			let morGraph = null;
			function tagger(g, fctr) { morGraph.getFactor(fctr).tags.map(t => g.addTag(t)); }
			o.domains.forEach(function(m)
			{
				morGraph = m.graph.graphs[0];
				graph.scan(tagger);
			});
			o.codomains.forEach(function(m)
			{
				morGraph = m.graph.graphs[1];
				graph.scan(tagger);
			});
		});

		//
		// propagate info for all non-factor morphisms in the connected diagram
		//
		function addTag(dm, graph, tag, ndx)
		{
			const fctr = graph.getFactor(ndx);
			if (fctr.hasTag(tag) && ndx[0] !== 0)
			{
				if (!fctr.hasTag('Cofactor'))	// cofactor morphs can fold info
				{
					console.error('cofactors not supported');
					issues.push({message:`object has too much ${tag}`, element:dm.codomain});
					return;
				}
			}
			else
				fctr.addTag(tag);
		}
		const propTag = function(dm, m, mGraph, barGraph, tag, fn)
		{
			propagated.add(dm);
			if (m instanceof MultiMorphism)	// break it down
				m.morphisms.map((subm, i) => propTag(dm, subm, mGraph.graphs[i], barGraph, tag, fn));
			else if (isConveyance(m))		// copy tag on input links
				mGraph.graphs[0].scan(function(g, ndx) { g.links.map(lnk => fn(dm, barGraph, tag, lnk)); }, [0]);
			else		// tag all pins
				mGraph.graphs[1].scan(function(g, ndx) { fn(dm, barGraph, tag, ndx); }, [1]);
		};
		const tag = 'info';
		const tagInfo = function(dm)
		{
			propTag(dm, dm.to, dm.graph, getBarGraph(dm), tag, addTag);
		};
		scanning = [...sources];
		scanned.clear();
		while(scanning.length > 0)
		{
			const src = scanning.pop();
			const scan = scanning;
			const scanDomainsTagInfo = function(m)
			{
				const to = m.to;
				if (to instanceof FactorMorphism && !to.dual)
					return;
				if (isProjection(to))
					return;
				tagInfo(m);
				!scanned.has(m.codomain) && scan.push(m.codomain) && scanned.add(m.codomain);
			};
			src.domains.forEach(scanDomainsTagInfo);
		}

		//
		// look for inputs; they have no info; there will be too many at first
		//
		let inputSet = new Set();
		let isIt = true;
		objects.map(o => o.assyGraph.noTag(tag) && inputSet.add(o));
		let radius = 100;
		let fill = '#F007';
		function addBall(o)
		{
			if (o instanceof DiagramObject)
			{
				o.svg.parentNode.insertBefore(H3.circle('.ball', {cx:o.x, cy:o.y, r:radius, fill}), o.svg);
			}
			else if (o instanceof DiagramMorphism)
			{
				const xy = o.getNameOffset();
				o.svg_name.parentNode.insertBefore(H3.circle('.ball', {cx:xy.x, cy:xy.y, r:radius, fill}), o.svg_name);
			}
		}

		scanning = [...references];
		const backLinkTag = function(m, morGraph, barGraph, tag)
		{
			propagated.add(m);
			let didAdd = false;
			morGraph.graphs[1].scan(function(g, ndx)
			{
				g.links.map(lnk =>
				{
					const src = barGraph.getFactor(ndx);
					const fctr = barGraph.getFactor(lnk);
					if (fctr && src.hasTag(tag))
						didAdd = fctr.addTag(tag) || didAdd;
				});
			}, [1]);
			return didAdd;
		};
		while(scanning.length > 0)
		{
			const fm = scanning.pop();
			const morGraph = fm.graph;
			const barGraph = getBarGraph(fm);
			if (barGraph.graphs[1].hasTag(tag))
			{
				const scan = scanning;		// jshint
				const pushConveyance = function(morph) { isConveyance(morph.to) && scan.push(morph); };
				if (backLinkTag(fm, morGraph, barGraph, tag))
					fm.domain.codomains.forEach(pushConveyance);
			}
		}

		//
		// some inputs are factors of others; winnow
		//
		scanning = [...inputSet];
		while(scanning.length > 0)
		{
			const obj = scanning.pop();
			const graph = obj.assyGraph;
			if (graph.hasTag(tag))
				inputs.delete(obj);
			const scan = scanning;		// jshint
			const inputReducer = function(m)
			{
				if (m.to instanceof FactorMorphism)
				{
					inputs.delete(m.codomain);
					scan.push(m.codomain);
				}
			};
			obj.domains.forEach(inputReducer);
		}
		inputs = [...inputs];
		//
		// now tag the inputs with info
		//
		inputs.forEach(function(i)
		{
			i.assyGraph.addTag(tag);
		});
		//
		// do last info propagation for outputs
		//
		const setTag = function(dm, graph, tag, ndx)
		{
			const fctr = graph.getFactor(ndx);
			return fctr.addTag(tag);
		};
		scanning = inputs.slice();
		scanned.clear();
		while(scanning.length > 0)
		{
			const input = scanning.pop();
			const hasTag = input.assyGraph.hasTag(tag);
			const scan = scanning;		// jshint
			const inputs2 = inputs;		// jshint
			const domScanner = function(dm)
			{
				if (isProjection(dm))
				{
					if (dm.codomain.assyGraph.hasTag(tag))
					{
						const ndx = inputs2.indexOf(input);
						ndx > -1 && inputs2.splice(ndx, 1);
					}
				}
				else if (!scanned.has(dm.codomain))
				{
					propTag(dm, dm.to, dm.graph, getBarGraph(dm), tag, setTag);
					!scan.includes(dm.codomain) && scan.push(dm.codomain);
				}
			};
			input.domains.forEach(domScanner);
			const codScanner = function(dm)
			{
				if (isConveyance(dm.to) && !propagated.has(dm))
				{
					if (!propagated.has(dm))
					{
						backLinkTag(dm, dm.graph, getBarGraph(dm), tag);
						!scan.includes(dm.domain) && scan.push(dm.domain);
					}
					else
						references.delete(dm);
				}
			};
			input.codomains.forEach(codScanner);
			scanned.add(input);
		}
		// propagate tags from inputs
		inputs.map(i => issues.push({message:'Input', element:i}));

		inputs.map(i =>
		{
			i.domains.forEach(function(m)
			{
				isConveyance(m) && references.delete(m);
				propTag(m, m.to, m.graph, getBarGraph(m), tag, setTag);
			});
		});
		// look for outputs; they have info and no non-info factor morphisms
		const outputs = [];
		function scannerNo(g, ndx) { isIt = isIt && !g.hasTag('info'); }
		function scannerYes(g, ndx) { isIt = isIt && g.hasTag('info'); }
		objects.map(obj =>
		{
			isIt = true;
			obj.domains.forEach(function(m)
			{
				if (isProjection(m.to) && references.has(m))
				{
					m.codomain.assyGraph.scan(scannerYes);
					return;
				}
				isIt = false;
			});
			obj.codomains.forEach(function(m)
			{
				if (isConveyance(m.to))
				{
					if (m.to.dual)		// coproduct
						isIt = isIt && !sources.has(m.domain);
					else
					{
						isIt = isIt && !references.has(m);
					}
					return;
				}
			});
			if (isIt)
			{
				outputs.push(obj);
				issues.push({message:'Output', element:obj});
			}
		});
		sources.forEach(function(s)
		{
			if ([...s.domains, ...s.codomains].reduce((r, m) => r && isConveyance(m), true))
				sources.delete(s);
		});

		const homers = new Set();
		references.forEach(function(r)
		{
			const domain = r.domain.to.basic();
			const codomain = r.codomain.to.basic();
			if (domain.isTerminal() && !codomain.isTerminal())
				homers.add(r.codomain);
		});

fill = '#F009';
radius = 50;
inputs.forEach(addBall);

fill = '#00F3';
references.forEach(addBall);

fill = '#F0F3';
radius = 20;
sources.forEach(addBall);

fill = '#00FA';
radius = 10;
objects.map(o => o.assyGraph.hasTag(tag) && addBall(o));

fill = '#0FF3';
radius = 20;
homers.forEach(addBall);

fill = '#0F0A';
radius = 30;
outputs.map(o => addBall(o));

fill = '#0F03';
radius = 30;

		const composites = new Map();	// sources+inputs to array of morphisms to compose

		function followComposite(cmp, m)
		{
			const cod = m.codomain;
			if (homers.has(cod))
				return cod;
			const morphs = [...cod.domains].filter(m => !references.has(m));
			if (morphs.length > 0)
			{
				const next = morphs[0];
				cmp.push(next);
addBall(next);
				return followComposite(cmp, next);
			}
			else
				return cod;
		}
		function startComposites(obj)
		{
			const comps = [];
			composites.set(obj, comps);
			obj.domains.forEach(m =>
			{
				if (!references.has(m))
				{
addBall(m);
					const cmp = [m];
					comps.push(cmp);
					const cod = followComposite(cmp, m);
					scanning.push(cod);
				}
			});
		}
		scanning = [...inputs, ...sources];
		while(scanning.length > 0)
		{
			const obj = scanning.pop();
			startComposites(obj);
		}
		const referenceToIndex = new Map();
		function getReferences(o)
		{
			return [...o.codomains].filter(m => references.has(m));
		}
		const ref2ndx = new Map();
		function getDomainAssemblyFactors(domain, ndx)
		{
			let indices = [...domain.domains].filter(m => !m.to.codomain.isTerminal() && references.has(m) && isProjection(m)).map(ref => ref2ndx.get(ref));
			for(let i=0; i<indices.length; ++i)
			{
				const index = indices[i];
				const nuIndex = ndx.slice();
				index.length > 0 && nuIndex.push(...index);
				indices[i] = nuIndex;
			}
			return indices;
		}
		//
		// for a given index object and working domain in the target category, start assembling a morphism from a given index
		//
		function formMorphism(domain, currentDomain, ndx = [])
		{
			// downstream objects that refer to this index object need to find our index
			[...domain.codomains].map(m => references.has(m) && isProjection(m.to) && ref2ndx.set(m, ndx));
			//
			// if the index object has projection references, then we need a pre-assembly factor morphism
			//
			const upRefs = getDomainAssemblyFactors(domain, ndx);
			const preFactor = upRefs.length > 0 ? diagram.fctr(currentDomain, upRefs) : diagram.id(currentDomain);
			//
			// if our domain is an output, then we're done
			//
			const outputNdx = outputs.indexOf(domain);
			if (outputNdx > -1)
			{
				outputs.splice(outputNdx, 1);
				return preFactor;
			}
			//
			// we get outbound morphisms from the domain from the composites shown in the directed graph,
			// or from the domain being a coproduct assembly of elements
			//
			// first the outbound composites from the domain
			//
			const morphisms = composites.get(domain).map(comp =>
			{
				const last = comp.length -1;
				const morphs = comp.map(m =>m.to);
				//
				// if we have a pre-assembly factor, add it to the composite's start
				//
				!(preFactor instanceof Identity) && morphs.unshift(preFactor);
				//
				// codomain index object
				//
				const cod = comp[last].codomain;
				//
				// does the index codomain object have elements?
				//
				if ([...cod.codomains].reduce((r, m) => r || (references.has(m) && isInjection(m) && m.domain.to.isTerminal()), false))
				{
					//
					// replace last morphism in composite with an assembly
					//
					const lastMorph = morphs[last];
					morphs[last] = diagram.assy(lastMorph, diagram.id(lastMorph.domain));
				}
				//
				// continue scanning on the index composite's codomain
				//
				const index = ndx.slice();
				index.pop();
				scanning.push({domain:cod, currentDomain, index});
				//
				// get the composite so far
				//
				return diagram.comp(...morphs);
			});
			//
			// sum up the coproduct elements
			//
			const eltRefs = [...domain.codomains].filter(m => references.has(m) && isInjection(m) && m.domain.to.isTerminal());
			if (eltRefs.length > 0)
			{
				const homMorphs = [];
				const homers = [];	// the coproduct forming the chosen morphisms
				const productAssemblies = [];
				const data = new Map();
				//
				// each element creates its own morphism;
				// that morphism will need its own factor morphism to set it up for evaluation;
				// thus each morphism has the current domain as its own domain;
				// the codomain is something else
				//
				const eltMorphisms = eltRefs.map((eltRef, i) =>
				{
					//
					// get the morphisms attached to each element
					//
					const homMorphs = [...eltRef.domain.codomains].map(m =>
					{
						return formMorphism(m.domain, currentDomain, ndx);
					});
					const homMorph = diagram.assy(...homMorphs);
					const homset = diagram.hom(currentDomain, homMorph.codomain);
					//
					// which homset in the coproduct of homsets is it?
					//
					let homNdx = -1;
					for (let j=0; j<homers.length; ++j)
					{
						const hom = homers[j];
						if (hom.isEquivalent(homset))
						{
							homNdx = j;
							break;
						}
					}
					if (homNdx < 0)
					{
						homNdx = homers.length;
						homers.push(homset);
					}
					//
					// record selection of this hom
					//
					const r = eltRef.to.getBase();
					let elt = null;
					if (r instanceof FactorMorphism)
					{
						const f = r.factors[0];
						if (f.length > 1)
							issues.push({message:'Factor is too deep', morphism:r});
						elt = r.factors[0][0];
					}
					else if (r instanceof Morphism && 'data' in r)
						elt = r.data[0];
					data.set(elt, homMorph);
				});
				const codomain = diagram.coprod(...homers);
				const dataMorph = new Morphism(diagram, {basename:diagram.getAnon('select'), domain:domain.to, codomain, data});
				const id = diagram.id(currentDomain);
				const steps = [];
				steps.push(diagram.prod(dataMorph, id));
				//
				// needs distribution of the state over the various homsets?
				//
				homers.length > 1 && steps.push(diagram.dist(diagram.prod(codomain, currentDomain), 'right'));
				//
				// get the evaluation maps
				//
				steps.push(diagram.coprod(...homers.map(hom => diagram.eval(currentDomain, hom.objects[1]))));
				const doit = diagram.comp(...steps);
				morphisms.push(doit);
			}
			return diagram.assy(...morphisms);
		}
		scanning = inputs.map((input, i) => {return {domain:input, currentDomain:input.to, index:inputs.length === 1 ? [] : [i]};});
		const components = [];
		while(scanning.length > 0)
		{
			const args = scanning.shift();
			const morphism = formMorphism(args.domain, args.currentDomain, args.index);
console.log('formMorphism', {morphism});
//			diagram.placeMorphism(e, morphism);
//			D.PlaceComposite(e, diagram, morphism);
			!(morphism instanceof Identity) && components.push(morphism);
		}
		D.PlaceComposite(e, diagram, diagram.comp(...components));
		return issues;
	}
	sortByCreationOrder(ary)
	{
		const indexing = new Map();
		let ndx = 0;
		this.domain.elements.forEach(function(elt) { indexing.set(elt, ndx++); });
		return ary.sort(function(a, b) { return indexing.get(a) < indexing.get(b) ? -1 : indexing.get(b) > indexing.get(a) ? 1 : 0; });
	}
	undo(e)
	{
		if (this._antilog.length > 0)
		{
			this.deselectAll();
			this.replay(e, this._antilog.pop());
			D.toolbar.hide();
		}
	}
	hide()
	{
		this.svgRoot.classList.add('hidden');
	}
	show()
	{
		this.svgRoot.classList.remove('hidden');
	}
	postProcess()
	{
		this.domain.elements.forEach(elt => 'postload' in elt && elt.postload());
		this.forEachMorphism(m =>
		{
			if ('recursor' in m && typeof m.recursor === 'string')	// set recursive function as it is defined after m is
				m.setRecursor(m.recursor);
			'data' in m && m.data.forEach(function(d, i) { m.data.set(i, U.InitializeData(this, m.codomain, d)); });
		});
	}
	replaceElement(to, nuTo, preserve = true)
	{
		if (!this.elements.has(to))
		{
			D.RecordError('Diagram does not have element');
			return;
		}
		this.codomain.elements.delete(nuTo.name);
		this.elements.delete(nuTo.basename);
		if (preserve)
		{
			nuTo.name = to.name;
			nuTo.basename = to.basename;
			nuTo.properName = to.properName;
		}
		// TODO reset attached index morphism signatures
		const elements = [...this.elements.values()];
		const idx = elements.indexOf(to);
		elements[idx] = nuTo;
		for (let i=idx + 1; i<elements.length; ++i)
		{
			const elt = elements[i];
			if ('replace' in elt)
				elt.replace(to, nuTo);
		}
	}
	replaceIndexObject(from, nuFrom)
	{
		[...from.domains].map(m =>
		{
			m.setDomain(nuFrom);
			m.update();
		});
		[...from.codomains].map(m =>
		{
			m.setCodomain(nuFrom);
			m.update();
		});
		this.domain.elements.delete(nuFrom.name);
		nuFrom.name = from.name;
		nuFrom.basename = from.basename;
		nuFrom.properName = from.properName;
		nuFrom.height = from.height;
		nuFrom.width = from.width;
		from.nodes.forEach(n => nuFrom.nodes.add(n));
		// TODO reset attached index morphism signatures
		const elements = [...this.domain.elements.values()];
		const idx = elements.indexOf(from);
		if (idx > -1)
		{
			elements[idx] = nuFrom;
			this.domain.replaceElements(elements);
		}
		else
			D.RecordError('index object not found for replacement');
	}
	search(str)
	{
		const rx = new RegExp(str, 'gi');
		const results = [];
		// search index category
		this.domain.elements.forEach(elt => ('to' in elt ? rx.test(elt.to.basename) : rx.test(elt.description) ) && results.push(elt));
		const indexed = new Set(results.filter(r => 'to' in r).map(r => r.to));
		this.codomain.elements.forEach(elt => rx.test(elt.basename) && !indexed.has(elt) && results.push(elt));
		return results;
	}
	autoplace()
	{
		R.sync = false;
		const oldArrowDir = D.default.arrow.dir;
		D.default.arrow.dir = {x:1, y:0};
		const indexed = new Set();
		const locations = [];
		const grid = D.default.layoutGrid * D.default.majorGridMult;
		let hasTitle = false;
		let tx = 1 * grid;
		let ty = 1 * grid;
		this.forEachText(txt =>
		{
			if (txt.x === tx && txt.y === ty)
				hasTitle = true;
		});
		if (!hasTitle)
		{
			new DiagramText(this, {xy:{x:tx, y:ty}, height:grid/2, weight:'bold', description:this.basename});
			if (this.description !== '')
				new DiagramText(this, {xy:{x:tx, y:ty + grid/4}, height:grid/8, weight:'normal', description:this.description});
		}
		this.domain.elements.forEach(elt =>
		{
			if (elt instanceof DiagramObject)
			{
				indexed.add(elt.to);
				if (elt.x === 0 && elt.y % grid === 0)
					locations.push(elt.y);
			}
			else if (elt instanceof DiagramMorphism)
				indexed.add(elt.to);
		});
		locations.sort();
		const unindexed = [];
		this.elements.forEach(elt => (elt instanceof CatObject || elt instanceof Morphism) && !indexed.has(elt) && unindexed.push(elt));
		let x = grid;
		let y = 2* grid;
		unindexed.map(elt =>
		{
			locations.map(loc =>
			{
				if (loc === elt.y)
					y += grid;
			});
			if (elt instanceof CatObject)
			{
				this.placeObject(null, elt, {x, y}, false);
				if (elt.description !== '')
					new DiagramText(this, {xy:{x, y:y + grid/4}, height:grid/10, weight:'normal', description:elt.description});
			}
			else if (elt instanceof Morphism)
			{
				const tw = elt.textwidth();
				let delta = grid;
				while (delta < tw)
					delta += grid;
				const cod = {x:x + delta, y};
				this.placeMorphism(null, elt, {x, y}, cod, false, false);
				if (elt.description !== '')
					new DiagramText(this, {xy:{x:x, y:y + grid/4}, height:grid/10, weight:'normal', description:elt.description});
			}
			y += grid;
		});
		R.sync = true;
		D.default.arrow.dir = oldArrowDir;
	}
	autoplaceSvg(svg, xy, name)
	{
		svg.setAttribute('x', xy.x);
		svg.setAttribute('y', xy.y);
		const bbox = new D2(svg.getBBox());
		svg.classList.add('hidden');
		let nubox = new D2(bbox);
		nubox.x -= 20;
		nubox.width += 20;
		let elt = null;
		let ndx = 0;
		const scl = 4;
		let offset = new D2();
		while(this.hasOverlap(nubox, name))
		{
			nubox = new D2(bbox);
			nubox.x -= 20;
			nubox.width += 20;
			const dir = D.directions[ndx % 8];
			offset = dir.scale(scl * Math.trunc((8 + ndx)/8));
			nubox = nubox.add(offset);
			ndx++;
		}
		svg.setAttribute('x', xy.x + offset.x);
		svg.setAttribute('y', xy.y + offset.y);
		svg.classList.remove('hidden');
	}
	isEditable()
	{
		return ('readonly' in this ? !this.readonly : true) && (this.user === R.user.name || R.user.isAdmin());
	}
	updateBackground()
	{
		if (this.svgRoot)
		{
			const bkgnd = document.getElementById(this.elementId('background'));
			if (D.default.fullscreen)
			{
				bkgnd.setAttribute('x', `${-D.session.viewport.x}px`);
				bkgnd.setAttribute('y', `${-D.session.viewport.y}px`);
				bkgnd.setAttribute('width', `${D.Width()}px`);
				bkgnd.setAttribute('height', `${D.Height()}px`);
			}
			else
			{
				const group = this.svgRoot.querySelector('#' + this.elementId('T'));
				const bbox = group.getBBox();
				const viewport = this.getViewport();
				const scale = viewport.scale;
				bkgnd.setAttribute('x', `${scale * bbox.x + viewport.x - D.default.diagram.margin}px`);
				bkgnd.setAttribute('y', `${scale * bbox.y + viewport.y - D.default.diagram.margin}px`);
				bkgnd.setAttribute('width', `${scale * bbox.width + 2 * D.default.diagram.margin}px`);
				bkgnd.setAttribute('height', `${scale * bbox.height + 2 * D.default.diagram.margin}px`);
			}
		}
	}
	savePng()
	{
		D.Svg2canvas(this, (png, pngName) =>
		{
			D.diagramPNGs.set(this.name, png);
			U.writefile(`${this.name}.png`, png);
			R.EmitCATEvent('png', this);
		});
	}
	static Codename(args)
	{
		return `${args.user}/${args.basename}`;
	}
	static GetInfo(diagram)
	{
		if (diagram instanceof Diagram)
		{
			let refs = [];
			diagram.references.forEach(r => refs.push(typeof r === 'string' ? r : r.name));
			return {
				name:			diagram.name,
				basename:		diagram.basename,
				category:		diagram.codomain.name,
				description	:	diagram.description,
				properName:		diagram.properName,
				timestamp:		diagram.timestamp,
				user:			diagram.user,
				references:		refs,
			};
		}
		return diagram;
	}
}

const Cat =
{
	Amazon,
	D2,
	R,
	D,
	U,
	Action,
	Assertion,
	Category,
	CatObject,
	Cell,
	Composite,
	Dedistribute,
	Diagram,
	DiagramComposite,
	DiagramMorphism,
	DiagramObject,
	DiagramPullback,
	DiagramText,
	Distribute,
	Element,
	Evaluation,
	FactorMorphism,
	FiniteObject,
	HomObject,
	HomMorphism,
	Identity,
	IndexCategory,
	LambdaMorphism,
	LanguageAction,
	Morphism,
	MultiMorphism,
	NamedObject,
	NamedMorphism,
	ProductObject,
	ProductMorphism,
	ProductAssembly,
	PullbackObject,
	TensorObject,
};

if (isGUI)
{
	window.Cat = Cat;
	window.addEventListener('load', _ => R.Initialize());
}
else
	Object.keys(Cat).forEach(cls => exports[cls] = Cat[cls]);
})();
