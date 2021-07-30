// (C) 2018-2021 Harry Dole
// Catecon:  The Categorical Console
//
// Events:
//		Application
//			start		app is up and running
// 		Assertion
// 			new			an assertion was created
// 			delete
// 			select
// 		CAT
// 			catalogAdd	an entry got added to the catalog
// 			default		diagram is now the default diagram for viewing
// 			download	diagram came from server
// 			load		diagram now available for viewing, but may have no view yet
// 			new			new diagram exists
// 			png
// 			unload		diagram unloaded from session
// 			upload		diagram sent to server
// 		Diagram
// 			addReference
// 			delete		delete diagram
// 			loadCells	determine cell commutativity
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
// Coordinate frames:
//		User:		mouse {clientX, clientY}
//		Session:	A session is placed in user space with {x, y, scale}
//		Diagram:	A diagram is placed in a session with {x, y, scale}
//		Cat.D.userToSessionCoords
//		Cat.D.sessionToUserCoords
//		diagram.userToDiagramCoords
//		diagram.diagramToSessionCoords
//		diagram.sessionToDiagramCoords

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
	global.D2 = require('./D2.js');
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
	// return subscript character for a number or comma
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
		m.forEach((d, i) => data.push(doKeys ? [i, d] : d));
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
	// remove CambelBack
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
		btns.forEach(b =>
		{
			const idx = JSON.parse(`[${b.dataset.indices}]`);
			factors.push(idx.length === 1 && idx[0] === -1 ? idx[0] : idx);
		});
		return factors;
	}
	static SetInputFilter(textbox, inputFilter)
	{
		["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(e =>
		{
			textbox.oldValue = "";
			textbox.addEventListener(e, _ =>
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
			console.error(`no data to convert: ${obj.name}`);
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
	static InitializeData(diagram, obj, data)	// hom elements have to be converted from strings to their objects
	{
		let ret = null;
		switch(obj.constructor.name)
		{
			case 'ProductObject':
				if (this.dual)
					ret = [data[0], U.InitializeData(diagram, obj.objects[data[0]], data[1])];
				else
					ret = obj.objects.map((o, i) => U.InitializeData(diagram, o, data[i]));
				break;
			case 'HomObject':
				ret = diagram.getElement(data);
				if (ret)
					ret.incrRefcnt();
				else
					D.RecordError(`No data for ${obj.properName}`);
				break;
			default:
				ret = data;
				break;
		}
		return ret;
	}
	static RefcntSorter(a, b) { return a.refcnt > b.refcnt ? -1 : b.refcnt < a.refcnt ? 1 : 0; }		// high to low
	static TimestampSorter(a, b) { return a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0; }
	static NameSorter(a, b) { return a.name > b.name ? 1 : a.name < b.name ? -1 : 0; }		// a to z
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
	static pushFactor(factor, ndx)
	{
		const nu = factor.slice();
		if (typeof ndx === 'number')
			nu.push(ndx);
		else
			nu.push(...ndx);
		return nu;
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
	static isValidBasename(str)
	{
		return U.basenameEx.test(str) || U.finiteEx.test(str);
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
		// equality engine
		const worker = new Worker((isGUI ? '' : './public') + '/js/workerEquality.js');
		worker.onmessage = msg =>
		{
			const args = msg.data;
			switch(args.command)
			{
				case 'CheckEquivalence':
					const diagram = R.$CAT.getElement(args.diagram);
					const cell = diagram.domain.cells.get(args.cell);
					if (!cell)
						return;	// TODO bad cell request
					cell.removeSVG();
					const assertion = diagram.getAssertion(cell.signature);
					if (assertion)
						assertion.setCell(cell);
					let type = '';
					if (args.isEqual === 'unknown')
						type = diagram.domain.hiddenCells.has(args.cell) ? 'hidden' : 'unknown';
					else if (args.isEqual === true)
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
					else
						type = 'notequal';
					cell.setCommutes(type);
					const objs = cell.getObjects();
					if (!cell.svg)
						diagram.addSVG(cell);
					cell.update();
					break;
				case 'start':
				case 'LoadDiagrams':
				case 'LoadItem':
				case 'RemoveEquivalences':
				case 'Info':
					break;
				default:
					console.error('bad message', args.command);
					break;
			}
		};
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
			url = ".";
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
			D.topSVG.onmouseup = e => D.topSVG.removeEventListener('mousemove', sessionMove);
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
	// build categorical actions
	static SetupActions()
	{
		// function to register a diagram's actions
		const setup = diagram => isGUI && diagram.elements.forEach(action => {R.Actions[action.basename] = action;});
		const diagramDiagram = new Diagram(R.$CAT, {basename:'diagram', codomain:'Actions', description:'actions for a diagram', user:'sys'});
		let action = new IdentityAction(diagramDiagram);
		new GraphAction(diagramDiagram);
		new SwapAction(diagramDiagram);
		new AssemblyMorphismAction(diagramDiagram);
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
		const pfsDiagram = new Diagram(R.$CAT, {basename:'pfs', codomain:'Actions', description:'diagram for PFS actions', user:'sys'});
		const pfs = new Category(R.$CAT,
		{
			basename:'PFS',
			user:'hdole',
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
	static Initialize(fn = null)
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
			if (R.default.debug)
			{
				D.diagramSVG.appendChild(H3.path({stroke:'red', d:"M-1000 0 L1000 0"}));
				D.diagramSVG.appendChild(H3.path({stroke:'red', d:"M0 -1000 L0 1000"}));
			}
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
		R.FetchCatalog( _ =>
		{
			R.SetupCore();
			R.SetupActions();
			R.SetupPFS();
			isGUI && D.Initialize();		// initialize GUI
			R.cloud = new Amazon();
			R.cloud.initialize();
			R.sync = true;
			const loader = _ =>
			{
				R.diagram = null;
				if (isGUI)
				{
					switch(D.session.mode)
					{
						case 'catalog':
							D.catalog.show();
							D.catalog.html();
							break;
						case 'diagram':
							D.catalog.show(false);
							break;
					}
				}
				R.initialized = true;
				isGUI && D.session.diagrams.filter(d => R.catalog.has(d)).map(d => R.DownloadDiagram(d, _ =>
				{
					const diagram = R.$CAT.getElement(d);
					diagram.makeSVG();
					diagram.setPlacement(diagram.getPlacement(), false);
				}));
				if (isGUI)
				{
					R.LoadScript('js/javascript.js');
					R.LoadScript('js/cpp.js');
					R.LoadScript('js/mysql.js');
				}
				fn && fn();
			};
			if (R.params.has('boot'))
				R.LoadScript(window.location.origin + '/js/boot.js', function() { Boot(loader); });
			else
				loader();
			D.EmitApplicationEvent('start');
		});
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
		const info = R.catalog.get(diagram.name);
		info.localTimestamp = diagram.timestamp;
	}
	static HasLocal(name)
	{
		return U.readfile(`${name}.json`) !== null;
	}
	static ReadLocal(name, clear = false)
	{
		let sync = R.sync;
		R.sync = false;
		const data = U.readfile(`${name}.json`);
		if (data)
		{
			const args = JSON.parse(data);
			const userDiagram = R.GetUserDiagram(args.user);
			if (clear)	// debugging feature
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
			D.EmitCATEvent('load', diagram);
			R.sync = sync;
			const errors = diagram.check();
if (errors.length > 0) debugger;
			return diagram;
		}
		R.sync = sync;
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
						R.diagram.setPlacementByBBox(bbox);
						const center = R.diagram.diagramToSessionCoords(D.Center(R.diagram));
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
	static isLocalNewer(name)
	{
		const info = R.catalog.get(name);
		return info && info.cloudTimestamp < info.localTimestamp;
	}
	static isCloudNewer(name)
	{
		const info = R.catalog.get(name);
		return info && info.cloudTimestamp > info.localTimestamp;
	}
	static async DownloadDiagram(name, fn = null, e = null)
	{
		let diagram = null;
		const cloudDiagrams = [...R.GetReferences(name)].reverse().filter(d => R.LocalTimestamp(d) === 0);
// TODO fix this issue
if (cloudDiagrams.filter(cd => typeof cd === 'object').length > 0) debugger;
		if (cloudDiagrams.length > 0)
		{
			const downloads = cloudDiagrams.map(d => R.getDiagramURL(d + '.json'));
			let diagrams = [];
			const downloader = async _ =>
			{
				const promises = downloads.map(url => fetch(url));
				const responses = await Promise.all(promises);
				const jsons = await Promise.all(responses.map(async res => await res.ok ? res.json() : {}));
				diagrams = jsons.map(json =>
				{
					const diagram = new Diagram(R.GetUserDiagram(json.user), json);
					D.EmitCATEvent('download', diagram);
					D.EmitCATEvent('load', diagram);
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
		fn && fn(e);
		return diagram;
	}
	//
	// primary means of displaying a diagram
	//
	static async SelectDiagram(name, action = null)
	{
		if (isGUI)
		{
			D.session.mode = 'diagram';
			if (R.diagram)
			{
				R.diagram.name !== name && R.diagram.svgRoot.querySelector('.diagramBackground').classList.remove('defaultGlow');
				D.default.fullscreen && D.diagramSVG.lastElementChild.dataset.name !== name && D.diagramSVG.classList.add('hidden');
			}
		}
		if (R.diagram && R.diagram.name === name)
		{
			D.EmitCATEvent('default', R.diagram, action);
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
				D.EmitCATEvent('default', null);
				return;
			}
			didit = true;
		}
		if (!diagram)
			throw 'no such diagram';
		R.diagram = diagram;
		if (isGUI && R.diagram)
		{
			R.diagram.makeSVG();
			R.diagram.svgRoot.querySelector('.diagramBackground').classList.add('defaultGlow');
		}
		D.NotBusy();
		D.EmitCATEvent('default', diagram, action);
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
		const info = R.catalog.get(name);
		refs.add(name);
		info && info.references.map(r => R.GetReferences(r, refs));
		return refs;
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
		info.localTimestamp = diagram.timestamp;
		const catInfo = R.catalog.get(diagram.name);
		info.cloudTimestamp = catInfo ? catInfo.cloudTimestamp : 0;
		R.catalog.set(diagram.name, info);
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
			svg && svg.remove();
			R.diagram.decrRefcnt();
			R.SelectDiagram(name);
		});
	}
	static LoadItem(diagram, item, leftLeg, rightLeg, equal = true)
	{
		const leftSigs = leftLeg.map(m => m.signature);
		const rightSigs = rightLeg.map(m => m.signature);
		R.loadSigs(diagram, item, leftSigs, rightSigs, equal);
	}
	static loadSigs(diagram, item, leftSigs, rightSigs, equal = true)
	{
		R.workers.equality.postMessage({command:'LoadItem', diagram:diagram.name, item:item.name, leftLeg:leftSigs, rightLeg:rightSigs, equal});
	}
	static RemoveEquivalences(diagram, ...items)
	{
		R.workers.equality.postMessage({command:'RemoveEquivalences', diagram:diagram.name, items});
	}
	static LoadDiagramEquivalences(diagram)
	{
		R.workers.equality.postMessage({command:'LoadDiagrams', diagrams:[...[...diagram.allReferences.keys()].reverse(), diagram.name]});
	}
	static LoadScript(url, fn = null)
	{
		const script = H3.script();
		script.type = 'text/javascript';
		script.async = true;
		script.src = url;
		fn && script.addEventListener('load', fn);
		document.body.appendChild(script);
	}
	static FetchCatalog(fn)
	{
		const process = (data, fn) =>
		{
			if (isGUI)
				R.cloudURL = data.cloudURL;
			const diagrams = data.diagrams;
			diagrams.map(d =>
			{
				d.localTimestamp = R.LocalTimestamp(d.name);
				d.references = JSON.parse(d.refs);
				delete d.refs;
				R.catalog.set(d.name, d);
				D.EmitCATEvent('catalogAdd', d);
			});
			fn();
		};
		(isGUI || R.cloudURL) && fetch(R.getURL('catalog')).then(response =>
		{
			if (response.ok)
				response.json().then(data => process(data, fn));
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
			const diagram = R.$CAT.getElement(name);
			R.authFetch(R.getURL('delete'), {diagram:name}).then(res =>
			{
				if (!res.ok)
				{
					D.RecordError(res.statusText);
					return;
				}
				const diagram = R.$CAT.getElement(name);
				if (diagram)
					diagram.decrRefcnt();
				else
					R.catalog.delete(name);
			}).catch(err => D.RecordError(err));
		}
	}
	static GetDiagramInfo(name)
	{
		const diagram = name !== 'sys/$CAT' ? R.$CAT.getElement(name) : R.$CAT;
		const info = {name};
		info.basename = diagram.basename;
		info.properName = diagram.properName;
		info.user = diagram.user;
		info.timestamp = diagram.timestamp;
		info.refcnt = diagram.refcnt;
		info.description = diagram.description;
		info.codomain = diagram.codomain.name;
		info.references = [...diagram.references.values()];
		return info;
	}
	static SaveDefaults()
	{
		U.writefile('defaults.json', JSON.stringify({R:R.default, D:D.default}));
	}
	static ReadDefaults()	// assume run only one per loading
	{
		R.factoryDefaults = U.Clone(R.default);
		D.factoryDefaults = U.Clone(D.default);
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
	static getURL(suffix, local = true)
	{
		let url = '';
		if (isGUI)
			url = local ? R.URL : R.cloudURL;
		else
			url = R.cloudURL;
		if (suffix)
			url += '/' + suffix;
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
		const args = {method:'POST', body:bodyStr, headers};
		return fetch(url, args);
	}
	static updateRefcnts()
	{
		const headers = {'Content-Type':'application/json;charset=utf-8', token:R.user.token};
		fetch(R.getURL('refcnts'), {method:'POST', body:JSON.stringify({user:R.user.name}), headers}).then(response => response.json()).then(
		{
		}).catch(err => D.RecordError(err));
	}
	static rewriteDiagrams()
	{
		const headers = {'Content-Type':'application/json;charset=utf-8', token:R.user.token};
		fetch(R.getURL('rewrite'), {method:'POST', body:JSON.stringify({user:R.user.name}), headers}).then(response =>
		{
			if (response.ok)
				response.json().then(json => D.statusbar.show(null, json.join('\n')));
			else
				throw 'error rewriting diagrams: ' + response.statusText;
		}).catch(err => D.RecordError(err));
	}
	static upload(e, diagram, local, fn)
	{
		if (R.user.status !== 'logged-in')
			return;
		const body = {diagram:diagram instanceof Diagram ? diagram.json() : diagram, user:R.user.name};
		body.png = D.GetPng(diagram.name);
		console.log('uploading', diagram.name);
		if (local)
			return R.authFetch(R.getURL('upload', local), body).then(res => fn(res)).catch(err => D.RecordError(err));
		// keep local server up to date after update to cloud
		return R.authFetch(R.getURL('upload', false), body).then(res => R.upload(e, diagram, true, fn)).catch(err => D.RecordError(err));
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
		D.EmitDiagramEvent(diagram, 'removeReference', name);
		D.statusbar.show(e, `${diagram.properName} reference removed`);
		diagram.log({command:'removeReference', name});
		diagram.antilog({command:'addReference', name});
	}
	static createDiagram(codomain, base, proper, desc)
	{
		const basename = U.HtmlSafe(base);
		if (!U.isValidBasename(basename))
			return 'Invalid basename';
		const userDiagram = R.GetUserDiagram(R.user.name);
		if (userDiagram.elements.has(basename))
			return 'diagram already exists';
		const name = `${R.user.name}/${basename}`;
		if (R.catalog.has(name))
			return 'diagram already exists';
		const properName = U.HtmlSafe(proper);
		const description = U.HtmlSafe(desc);
		const diagram = new Diagram(userDiagram, {basename, codomain, properName, description, user:R.user.name});
		R.SetDiagramInfo(diagram);
		diagram.makeSVG();
		diagram.home();
		return diagram;
	}
	static uploadJSON(e, json)
	{
		if (json.user !== R.user.name && !R.user.isAdmin())
		{
			isGUI && D.statusbar.show(e, `User ${json.user} is not the logged in user ${R.user.name}`);
			return;
		}
		if (!R.CanDeleteDiagram(json.name))
		{
			isGUI && D.statusbar.show(e, `Cannot delete diagram ${json.name}`);
			return;
		}
		if (R.catalog.has(json.name))
		{
			const old = R.$CAT.getElement(json.name);
			// TODO reload diagrams that were referencing this one
			if (old)
				while(old.refcnt >= 0)
					old.decrRefcnt();
		}
		D.EmitViewEvent('diagram', null);	// needed if R.diagram = diagram since old.decrRefcnt() puts it into catalog view
		const diagram = new Diagram(R.GetUserDiagram(R.user.name), json);
		R.SaveLocal(diagram);
		diagram.savePng(e);
		D.EmitCATEvent('new', diagram);
		R.SelectDiagram(diagram.name);
		D.toolbar.clearError();
		R.upload(null, json, true, _ => {});
		D.statusbar.show(e, `Diagram ${diagram.name} loaded from local JSON file`);
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
	cloud:				{value:null,		writable:true},		// the authentication cloud we're using
	cloudURL:			{value:null,		writable:true},		// the server we upload to
	URL:				{value:isGUI ? document.location.origin : '',		writable:false},		// the server we upload to
	default:
	{
		value:
		{
			category:		'hdole/PFS',
			debug:			false,
			showEvents:		false,
		},
		writable:	true,
	},
	diagram:			{value:null,		writable:true},		// current diagram
	initialized:		{value:false,		writable:true},		// Have we finished the boot sequence and initialized properly?
	languages:			{value:new Map(),	writable:false},
	local:				{value:null,		writable:true},		// local server, if it exists
	params:				{value:null,		writable:true},		// URL parameters
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
	}
	initialize()
	{
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
				idPro.getUser({AccessToken:this.accessToken}, (err, data) =>
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
						D.EmitLoginEvent();
					}).catch(err => D.RecordError(err));
				});
			});
		}
		else
		{
			window.AWS.config.credentials = new window.AWS.CognitoIdentityCredentials(this.loginInfo);
			window.AWS.config.credentials.get();
			D.EmitLoginEvent();
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
			D.EmitLoginEvent();
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
			D.EmitLoginEvent();
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
					R.cloud.registerCognito();
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
					D.EmitLoginEvent();
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
		D.EmitLoginEvent();
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
		window.addEventListener('Login', _ => this.updateByUserStatus());
		window.addEventListener('Registration', _ => this.updateByUserStatus());
		window.addEventListener('CAT', e => D.navbar.eventUpdate(e));
		window.addEventListener('Autohide', e =>
		{
			if (D.session.mode === 'catalog')	// no autohide in catalog view
				return;
			const args = e.detail;
			if (args.command === 'hide')
				this.element.style.height = "0px";
			else
				this.element.style.height = "32px";
		});
		window.addEventListener('View', e => this.eventUpdate(e));
	}
	eventUpdate(e)
	{
		switch (e.detail.command)
		{
			case 'default':
				this.updateByUserStatus();
				break;
			case 'load':
				if (isGUI && e.detail.diagram)
				{
					const diagram = e.detail.diagram;
					const viewport = U.readfile(`${diagram.name}-viewport.json`);
					if (viewport)
						D.viewports.set(diagram.name, JSON.parse(viewport));
				}
				break;
			case 'catalog':
				this.updateByUserStatus();
				break;
			case 'catalogAdd':
				const name = e.detail.diagram.name;
				const viewport = D.readViewport(name);
				viewport && D.viewports.set(name, viewport);
				break;
		}
		this.update();
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
		if (R.diagram && D.session.mode === 'diagram')
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
		if (D.session.mode === 'diagram')
		{
			left.push(D.getIcon('loginPanelToggle', 'login', _ => Cat.D.loginPanel.toggle(), 'Login', sz));
			left.push(D.getIcon('helpPanelToggle', 'help', _ => Cat.D.helpPanel.toggle(), 'Help', sz));
			left.push(D.getIcon('settingsPanelToggle', 'settings', _ => Cat.D.settingsPanel.toggle(), 'Settings', sz));
			left.push(D.getIcon('ttyPanelToggle', 'tty', _ => Cat.D.ttyPanel.toggle(), 'Console', sz));
			left.push(D.getIcon('threeDPanelToggle', 'threeD', _ => Cat.D.threeDPanel.toggle(), '3D view', sz));
		}
		else
		{
			left.push(D.getIcon('loginPanelToggle', 'login', _ => Cat.D.loginPanel.toggle(), 'Login', sz));
			left.push(D.getIcon('helpPanelToggle', 'help', _ => Cat.D.helpPanel.toggle(), 'Help', sz));
			left.push(D.getIcon('settingsPanelToggle', 'settings', _ => Cat.D.settingsPanel.toggle(), 'Settings', sz));
		}
		// TODO
		if (false)	// view all icons, sorta
		{
			const icons = document.getElementById('CatIcons');
			let icon = icons.firstChild;
			do
			{
				if (icon.nodeName === 'symbol')
				{
					const name = icon.id.substr(5);
					left.push(D.getIcon(name, name, _ => {}, `btn-${name}`, sz));
				}
			} while((icon = icon.nextSibling));
		}
		const width = left.length * 32;
		const divs = [	H3.div('.navbar-float',
							H3.table('.w100', H3.tr(
								H3.td(H3.table(H3.tr(H3.td('.buttonBarLeft.navbar-tools', left))), {style:`width:${width}px`}),
								H3.td('##diagram-navbar.navtxt-', {title:'Current diagram'})))),
						H3.div('.navbar-float.navtxt-text.navtxt-link', 'Catecon', {onclick:_ => D.EmitViewEvent('catalog', D.catalog.view)}),
						H3.div(H3.span('##category-navbar'), '.navbar-float.navtxt-text', {title:'Current category scope'})];
		D.RemoveChildren(this.element);
		divs.map(div => this.element.appendChild(div));
		this.categoryElt = document.getElementById('category-navbar');
		this.diagramElt = document.getElementById('diagram-navbar');
		this.updateByUserStatus();
	}
}

class Toolbar
{
	constructor()
	{
		Object.defineProperties(this,
		{
			'buttons':		{value:	null,										writable: true},
			'closed':		{value:	false,										writable: true},
			'diagram':		{value: null,										writable: true},
			'element':		{value: document.getElementById('toolbar'),			writable: false},
			'error':		{value: document.getElementById('toolbar-error'),	writable: false},
			'header':		{value: document.getElementById('toolbar-header'),	writable: false},
			'help':			{value: document.getElementById('toolbar-help'),	writable: false},
			'mode':			{value: null,										writable: true},
			'mouseCoords':	{value: null,										writable: true},
			'sections':		{value: ['search', 'new'],							writable: false},
		});
		this.element.onmouseenter = _ => D.mouse.onGUI = this;
		this.element.onmouseleave = _ => D.mouse.onGUI = null;
		window.addEventListener('Diagram', e =>
		{
			switch(e.detail.command)
			{
				case 'load':
					this.resetMouseCoords();
					break;
				case 'select':
					if (this.element.classList.contains('hidden') || R.diagram.selected.length > 0)
						this.show(e);
					else
						this.hide();
					break;
			}
		});
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
	show(e)
	{
		this.error.innerHTML = '';
		const diagram = R.diagram;
		let xy = U.Clone(D.mouse.down);
		if (diagram)
			this.mouseCoords = diagram.userToDiagramCoords(xy);
		const element = this.element;
		D.RemoveChildren(this.help);
		D.RemoveChildren(this.error);
		this.reveal();
		const moveBtn = D.getIcon('moveToolbar', 'move', '', 'Move toolbar', D.default.button.small, 'toolbar-drag-handle');
		let delta = null;
		moveBtn.onmousedown = e =>	// start to move toolbar
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
			diagram.selected.length > 0 ? this.showSelectedElementsToolbar(diagram, btns) : this.showDiagramToolbar(diagram, btns);
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
		actions.map(action => !action.hidden() && action.hasForm(diagram, diagram.selected) &&
				btns.push(D.getIcon(action.basename, action.basename, e => Cat.R.diagram['html' in action ? 'actionHtml' : 'activate'](e, action.basename), action.description)));
		btns.push(D.getIcon('view', 'view', e => Cat.R.diagram.viewElements(...R.diagram.selected), 'Home'));
		this.buttons = H3.td(btns);
		this.header.appendChild(H3.table(H3.tr(this.buttons, H3.td(this.getCloseToolbarBtn(), '.right')), '.w100'));
	}
	showDiagramToolbar(diagram, btns)
	{
		D.RemoveChildren(this.header);
		const setActive = (e, mod, fn) =>
		{
			D.setActiveIcon(e.target);
			this.mode = mod;
			fn(e);
		};
		btns.push(D.getIcon('diagram', 'diagram', e => setActive(e, 'diagram', ee => Cat.D.elementTool.Diagram.html(ee)), 'Diagrams'));
		btns.push(D.getIcon('object', 'object', e => setActive(e, 'object', ee =>Cat.D.elementTool.Object.html(ee)), 'Objects'));
		btns.push(D.getIcon('morphism', 'morphism', e => setActive(e, 'morphism', ee =>Cat.D.elementTool.Morphism.html(ee)), 'Morphisms'));
		btns.push(D.getIcon('cell', 'cell', e => setActive(e, 'cell', ee => Cat.D.elementTool.Assert.html(ee)), 'Assertions'));
		btns.push(D.getIcon('text', 'text', e => setActive(e, 'text', ee => Cat.D.elementTool.Text.html(ee)), 'Text'));
		btns.push(D.getIcon('help', 'help', e => setActive(e, 'help', ee => R.Actions.help.html(e, diagram, [diagram]), 'Show help')));
		btns.push(D.getIcon('graph', 'graph', _ => Cat.R.diagram.showGraphs(), 'Show graphs in diagram'));
		btns.push(D.getIcon('home', 'home', e => Cat.D.keyboardDown.Home(e), 'Home'));
		this.buttons = H3.td(btns);
		this.header.appendChild(H3.table(H3.tr(this.buttons, H3.td(this.getCloseToolbarBtn(), '.right')), '.w100'));
	}
	showSessionToolbar(btns)
	{
		D.RemoveChildren(this.header);
		btns.push(D.getIcon('diagram', 'diagram', _ => Cat.D.elementTool.Diagram.html(), 'Diagram'));
		this.buttons = H3.td(btns);
		this.header.appendChild(H3.table(H3.tr(this.buttons, H3.td(this.getCloseToolbarBtn(), '.right')), '.w100'));
	}
	getCloseToolbarBtn(btns)
	{
		return D.getIcon('closeToolbar', 'close', _ => Cat.D.toolbar.hide(), 'Close');
	}
	clearError()
	{
		D.RemoveChildren(this.error);
		this.error.classList.add('hidden');
		this.error.innerHTML = '';
	}
	showError(x)
	{
		this.clearError();
		this.error.classList.remove('hidden');
		this.error.classList.add('error');
		this.error.innerHTML = 'Error ' + U.GetError(x);
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
	isVisible()
	{
		return !this.element.classList.contains('hidden');
	}
	hasActiveInputs()
	{
		return this.element.querySelector('input') !== null;
	}
	deactivateButtons()
	{
		const btns = this.buttons.querySelectorAll('span.icon');
		btns.forEach(btn => btn.querySelector('.btn').classList.remove('icon-active'));
	}
}

class ElementTool
{
	constructor(type, headline, sections)
	{
		Object.defineProperties(this,
		{
			type:				{value: type,						writable: false},
			sections:			{value: sections,					writable: false},
			headline:			{value: headline,					writable: false},
			filter:				{value: '',							writable: true},
			diagramOnly:		{value: false,						writable: true},
			hasDiagramOnlyButton:		{value: true,				writable: true},
			searchArgs:			{value: {userOnly: false, recentOnly: false, referenceOnly: false, sorter:U.NameSorter},	writable: false},
			textSortIcon:		{value: D.getIcon('text', 'text', e => this.setTextSorter(e), 'Sort by name'),				writable: false},
			buttonSize:			{value: D.default.button.small,		writable: true},
			headerId:			{value: 'help-header',				writable: true},
			searchFilterId:		{value: `${type}-search-filter`,		writable: true},
			searchSorterId:		{value: `${type}-search-sorter`,		writable: true},
		});
		D.ReplayCommands.set(`tool${type}`, this);
	}
	getSearchBar()
	{
		const onkeyup = e =>
		{
			this.filter = document.getElementById(`${this.type}-search-value`).value;
			this.search();
		};
		return H3.table(	'##search-tools',
							H3.tr(	H3.th('Search', {colspan:3})),
							H3.tr(	H3.td('Filter by', '.tinyPrint.center.italic'),
									H3.td(),
									H3.td('Sort by', '.tinyPrint.center.italic')),
							H3.tr(	H3.td(`##${this.type}-search-filter`),
									H3.td(H3.input(`##${this.type}-search-value.in100`, {title:'Search', type:'search', placeholder:'Contains...', onkeyup, onsearch:onkeyup})),
									H3.td(`##${this.type}-search-sorter`)));
	}
	setSearchBar()
	{
		const searchFilter = document.getElementById(this.searchFilterId);
		D.RemoveChildren(searchFilter);
		this.hasDiagramOnlyButton && searchFilter.appendChild(D.getIcon('diagram', 'diagram', e => this.toggleDiagramFilter(e), 'Search in diagram'));
		const searchSorter = document.getElementById(this.searchSorterId);
		D.RemoveChildren(searchSorter);
		searchSorter.appendChild(this.textSortIcon);
		searchSorter.appendChild(D.getIcon('reference', 'reference', e => this.setRefcntSorter(e), 'Sort by reference count'));
		this.resetFilter();
	}
	showSection(section)
	{
		D.setActiveIcon(D.toolbar.help.querySelector(`#${this.type}-${section}-icon`));
		this.sections.map(s =>
		{
			const elt = D.toolbar.help.querySelector(`#${this.type}-${s}`);
			elt && elt.classList.add('hidden');
		});
		const s = D.toolbar.help.querySelector(`#${this.type}-${section}`);
		s && s.classList.remove('hidden');
	}
	html(e)
	{
		const help = D.toolbar.help;
		D.RemoveChildren(help);
		this.reset();
		this.setupToolbar();
		help.appendChild(H3.div('##' + this.headerId));
		this.sections.includes('new') && this.addNewSection();
		const matchTable = H3.table({id:`${this.type}-matching-table`}, '.matching-table');
		if (this.sections.includes('search'))
		{
			help.appendChild(	H3.div(`##${this.type}-search.w100.hidden`,
										this.getSearchBar(),
										H3.div(`##${this.type}-search-results.tool-search-results`, matchTable)));
			this.resetFilter();
			this.showSection('search');
			this.setSearchBar();
		}
		this.search();
	}
	toggleDiagramFilter(e)
	{
		this.diagramOnly = !this.diagramOnly;
		if (this.diagramOnly)
			D.setActiveIcon(e.target, false);
		else
			D.setUnactiveIcon(e.target);
		this.search();
	}
	setTextSorter(e)
	{
		this.searchArgs.sorter = U.NameSorter;
		D.setActiveIcon(e.target);
		this.search();
	}
	setRefcntSorter(e)
	{
		this.searchArgs.sorter = U.RefcntSorter;
		D.setActiveIcon(e.target);
		this.search();
	}
	addNewSection()		// fitb
	{}
	reset()				// fitb
	{}
	getRows(tbl, elements)	// or replace
	{
		elements.map(elt => tbl.appendChild(elt.getHtmlRow()));
	}
	resetFilter()
	{
		this.filter = '';
		this.diagramOnly = false;
		this.searchArgs.sorter = U.NameSorter;
		D.setActiveIcon(this.textSortIcon);
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args, false);
	}
	setupToolbar()
	{
		const toolbar = D.toolbar;
		const toolbar2 = [];
		const tType = U.Decap(this.type);
		const elementBtn = D.getIcon(tType, tType, e => this.showSection('search'), this.type, D.default.button.small, `${this.type}-search-icon`);
		toolbar2.push(elementBtn);
		R.diagram.isEditable() && toolbar2.push(D.getIcon('new', 'edit', _ => this.showSection('new'), 'New', D.default.button.small, `${this.type}-new-icon`));
		this.toolbar2 = H3.div(toolbar2, `##${this.type}-toolbar2`);
		toolbar.help.appendChild(this.toolbar2);
	}
	clearSearch()
	{
		D.toolbar.clearError();
		const tbl = document.getElementById(`${this.type}-matching-table`);
		tbl && D.RemoveChildren(tbl);
	}
	search()
	{
		this.sections.includes('search') && this.clearSearch();
		const tbl = document.getElementById(`${this.type}-matching-table`);
		this.getRows(tbl, this.getMatchingElements());
	}
}

class TextTool extends ElementTool
{
	constructor(type, headline)
	{
		super('Text', headline, ['new', 'search']);
		this.hasDiagramOnlyButton = false;
		Object.defineProperties(this,
		{
			descriptionElt:		{value: null,		writable: true},
			error:				{value: null,		writable: true},
		});
		D.ReplayCommands.set(`new${this.type}`, this);
	}
	addNewSection()
	{
		const action = e => this.create(e);
		const rows = [];
		this.descriptionElt = H3.textarea('##new-description.in100', {title:'Description', placeholder:'Description', onkeydown:e => e.stopPropagation()});
		rows.push(H3.tr(H3.td(H3.span('.smallPrint.italic', 'Enter new text below or click directly on the diagram'), H3.br(), this.descriptionElt, D.getIcon(action.name, 'edit', action, 'Edit description'))));
		const elts = [H3.hr(), H3.h5(this.headline)];
		elts.push(H3.table(rows));
		D.toolbar.help.appendChild(H3.div(elts, `##${this.type}-new.hidden`));
	}
	getRows(tbl, texts)
	{
		texts.map(txt =>
		{
			const txtHtml = txt.getHtmlRep();
			if (txt.isEditable())
			{
				const id = txt.elementId();
				txtHtml.addEventListener('dblclick', e => Cat.R.diagram.editElementText(e, txt, id, 'description'));
				const onfocusout = e =>
				{
					txtHtml.firstChild.contentEditable = false;
					const description = e.target.innerText;
					if (description && description !== txt.description)
						R.diagram.commitElementText(e, txt.name, e.target, 'description');
					D.closeActiveTextEdit();
				};
				txtHtml.addEventListener('focusout', onfocusout);
				txtHtml.appendChild(D.getIcon('delete', 'delete', _ => Cat.R.Actions.delete.action(txt.name, Cat.R.diagram, [txt]), 'Delete text'));
			}
			txtHtml.appendChild(D.getIcon('viewText', 'view', e => R.diagram.viewElements(txt)));
			txtHtml.classList.add('element');
			tbl.appendChild(H3.tr(H3.td(txtHtml)));
		});
	}
	getMatchingElements()
	{
		const texts = R.diagram.getTexts().filter(txt => txt.description.includes(this.filter));
		return texts;
	}
	reset()
	{
		super.reset();
		this.descriptionElt && (this.descriptionElt.value = '');
	}
	create(e)
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
				this.reset();
			}
		}
		catch(x)
		{
			D.toolbar.showError(x);
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
				throw 'text name already exists';
			const description = args.description;
			from = diagram.placeText(args.text, args.xy);
			diagram.makeSelected(from);
			return from;
		}
		catch(x)
		{
			D.toolbar.showError(x);
		}
	}
}

class BPD			// basename, proper name, description
{
	constructor()
	{
		Object.defineProperties(this,
		{
			basenameElt:		{value: null, writable: true},
			properNameElt:		{value: null, writable: true},
			descriptionElt:		{value: null, writable: true},
		});
	}
	getNewSection(diagram, id, action, headline)
	{
		const rows = [];
		this.basenameElt = H3.input('##new-basename', {placeholder:'Base name', title:'Base name', onkeyup:e => D.inputBasenameSearch(e, diagram, action)});
		rows.push(H3.tr(H3.td(this.basenameElt)));
		this.properNameElt = H3.input('##new-properName', {placeholder:'Proper name', title:'Proper name', onkeydown:e => Cat.D.OnEnter(e, action)});
		rows.push(H3.tr(H3.td(this.properNameElt)));
		this.descriptionElt = H3.input('##new-description.in100', {title:'Description', placeholder:'Description', onkeydown:e => Cat.D.OnEnter(e, action)});
		rows.push(H3.tr(H3.td(this.descriptionElt)));
		const elts = [H3.h5(headline)];
		elts.push(H3.table(rows));
		elts.push(H3.span(D.getIcon(action.name, 'edit', action, headline)));
		return H3.div(elts, `##${id}`);
	}
	reset()
	{
		this.basenameElt && (this.basenameElt.value = '');
		this.properNameElt && (this.properNameElt.value = '');
		this.descriptionElt && (this.descriptionElt.value = '');
	}
	getArgs()
	{
		const basename = U.HtmlSafe(this.basenameElt.value);
		if (!U.isValidBasename(basename))
			throw 'Invalid basename';
		const args =
		{
			basename,
			properName:		U.HtmlEntitySafe(this.properNameElt.value),
			description:	U.HtmlEntitySafe(this.descriptionElt.value),
		};
		return args;
	}
}

class ObjectTool extends ElementTool
{
	constructor(headline)
	{
		super('Object', headline, ['new', 'search']);
		this.bpd = new BPD();
		D.ReplayCommands.set('newObject', this);
	}
	addNewSection()
	{
		D.toolbar.help.appendChild(this.bpd.getNewSection(R.diagram, 'Object-new', e => this.create(e), this.headline));
	}
	getMatchingElements()
	{
		return R.diagram.getObjects().filter(o => o.name.includes(this.filter) && ((this.diagramOnly && o.diagram === R.diagram) || !this.diagramOnly));
	}
	create(e)
	{
		try
		{
			const args = this.bpd.getArgs();
			args.xy = D.toolbar.mouseCoords;	// use last mouse location
			const from = this.doit(e, R.diagram, args);
			this.bpd.reset();
			args.command = 'toolObject';
			R.diagram.log(args);
			R.diagram.antilog({command:'delete', elements:[from.name]});
		}
		catch(x)
		{
			D.toolbar.showError(x);
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
			const to = new CatObject(diagram, args);
			from = diagram.placeObject(to, args.xy, save);
			diagram.makeSelected(from);
			return from;
		}
		catch(x)
		{
			D.toolbar.showError(x);
		}
	}
}

class MorphismTool extends ElementTool
{
	constructor(headline)
	{
		super('Morphism', headline, ['new', 'search']);
		Object.defineProperties(this,
		{
			domainElt:			{value: null,										writable: true},
			codomainElt:		{value: null,										writable: true},
			bpd:				{value: new BPD(),									writable: false},
		});
		D.ReplayCommands.set('newMorphism', this);
	}
	addNewSection()
	{
		const newSection = this.bpd.getNewSection(R.diagram, 'Morphism-new', e => this.create(e), this.headline);
		D.toolbar.help.appendChild(newSection);
		const table = newSection.querySelector('table');
		const objects = R.diagram.getObjects();
		this.domainElt = H3.select('##new-domain.w100');
		this.domainElt.appendChild(H3.option('Domain', {value:'', selected:true, disabled:true}));
		objects.map(o => this.domainElt.appendChild(H3.option(o.properName, {value:o.name})));
		this.codomainElt = H3.select('##new-codomain.w100');
		this.codomainElt.appendChild(H3.option('Codomain', {value:'', selected:true, disabled:true}));
		objects.map(o => this.codomainElt.appendChild(H3.option(o.properName, {value:o.name})));
		table.appendChild(H3.tr(H3.td(this.domainElt)));
		table.appendChild(H3.tr(H3.td(this.codomainElt)));
	}
	getMatchingElements()
	{
		const morphisms = R.diagram.getMorphisms().filter(m => m.name.includes(this.filter) && ((this.diagramOnly && m.diagram === R.diagram) || !this.diagramOnly));
		const sigs = new Map();
		morphisms.map(m =>
		{
			if (!sigs.has(m.signature))
				sigs.set(m.signature, m);
		});
		const remaining = [...sigs.values()];
		remaining.sort(U.RefcntSorter);
		return remaining;
	}
	create(e)
	{
		try
		{
			const args = this.bpd.getArgs();
			const diagram = R.diagram;
			args.domain = diagram.codomain.getElement(this.domainElt.value);
			if (args.domain === '')
				throw 'specify domain';
			args.codomain = diagram.codomain.getElement(this.codomainElt.value);
			if (args.codomain === '')
				throw 'specify codomain';
			args.xyDom = D.toolbar.mouseCoords;	// use original location
			const from = this.doit(e, diagram, args);
			if (from)
			{
				this.bpd.reset();
				diagram.log(
				{
					command:	'toolMorphism',
					domain:		args.domain.name,
					codomain:	args.codomain.name,
					basename:	args.basename,
					properName:	args.properName,
					description:args.description,
					xyDom:		from.domain.getXY(),
					xyCod:		from.codomain.getXY(),
				});
				R.diagram.antilog({command:'delete', elements:[from.name]});
			}
		}
		catch(x)
		{
			D.toolbar.showError(x);
			return null;
		}
	}
	doit(e, diagram, args, select = true)
	{
		try
		{
			if (!diagram.isEditable())
				throw 'diagram is read only';
			let from = null;
			if ('to' in args)
			{
				const to = diagram.getElement(args.to);
				if (to)
				{
					const xyDom = 'xyDom' in args ? args.xyDom : D.mouse.diagramPosition(diagram);
					const xyCod = 'xyCod' in args ? args.xyCod : null;
					from = diagram.placeMorphism(to, xyDom, xyCod, select);
				}
				else
					throw 'no matching target morphism';
			}
			else
			{
				const basename = args.basename;
				if (basename === '')
					throw 'needs basename';
				const name = Element.Codename(diagram, {basename});
				if (diagram.getElement(name))
					throw 'name already exists';
				const to = new Morphism(diagram, args);
				to.loadItem();
				from = diagram.placeMorphism(to, args.xyDom, args.xyCod, select);
			}
			return from;
		}
		catch(x)
		{
			D.toolbar.showError(x);
		}
	}
}

class DiagramTool extends ElementTool
{
	constructor(type, headline)
	{
		super(type, headline, ['new', 'search', 'upload-json']);
		Object.defineProperties(this,
		{
			bpd:				{value: new BPD(),	writable: false},
			domainElt:			{value: null,		writable: true},
			codomainElt:		{value: null,		writable: true},
		});
		this.hasDiagramOnlyButton = false;
	}
	getButtons(info, exclude = '')
	{
		const nobuts = new Set(exclude.split(' '));
		const buttons = [];
		const btnSize = D.default.button.small;
		const name = info.name;
		const diagram = R.$CAT.getElement(name);
		if (diagram)
		{
			if (R.user.status === 'logged-in' && R.cloud && info.user === R.user.name)
			{
				if (!nobuts.has('upload') && R.isLocalNewer(diagram.name))
				{
					const btn = D.getIcon('upload', 'upload', e => diagram.upload(e, false), 'Upload to cloud ' + R.cloudURL, btnSize, false, 'diagramUploadBtn');
					buttons.push(btn);
				}
				if (!nobuts.has('download') && R.isCloudNewer(diagram.name))
					buttons.push(D.getIcon('downcloud', 'downcloud', e => diagram.download(e, false), 'Download from cloud ' + R.cloudURL, btnSize, false));
			}
			if (!nobuts.has('download'))
			{
				if (info.category === 'hdole/PFS')
				{
					buttons.push(D.getIcon('js', 'download-js', e => diagram.downloadJS(e), 'Download Javascript', btnSize));
					buttons.push(D.getIcon('cpp', 'download-cpp', e => diagram.downloadCPP(e), 'Download C++', btnSize));
				}
				buttons.push(D.getIcon('json', 'download-json', e => diagram.downloadJSON(e), 'Download JSON', btnSize));
				buttons.push(D.getIcon('png', 'download-png', e => window.open(`diagram/${name}.png`, btnSize,
					`height=${D.snapshotHeight}, width=${D.snapshotWidth}, toolbar=0, location=0, status=0, scrollbars=0, resizeable=0`), 'View PNG'));
			}
		}
		if (!nobuts.has('view') && (!R.diagram || name !== R.diagram.name))
			buttons.push(D.getIcon('view', 'view', e => R.SelectDiagram(name, 'home'), 'View diagram', btnSize));
		const refcnt = diagram ? diagram.refcnt : info ? info.refcnt : 0;
		if (!nobuts.has('delete') && refcnt === 0 && info.user === R.user.name)
		{
			const btn = D.getIcon('delete', 'delete', e => Cat.R.DeleteDiagram(e, info.name), 'Delete diagram');
			btn.querySelector('rect.btn').style.fill = 'red';
			buttons.push(btn);
		}
		if (R.diagram && !nobuts.has('ref') && name !== R.diagram.name)
		{
			if (R.diagram.references.has(name))
			{
				if (R.diagram.canRemoveReference(name))
				{
					const btn = D.getIcon('reference', 'reference', e =>
					{
						R.RemoveReference(e, name);
						this.search();
					}, 'Remove reference', btnSize);
					btn.querySelector('rect.btn').style.fill = 'red';
					buttons.push(btn);
				}
			}
			else if (R.catalog.has(diagram) && name !== R.diagram.name && !diagram.allReferences.has(name))
			{
				const addRef = (e, name) =>
				{
					R.DownloadDiagram(name, ev =>
					{
						try
						{
							R.AddReference(ev, name);
							this.search();
						}
						catch(x)
						{
							D.toolbar.showError(x);
						}
					}, e);
				};
				buttons.push(D.getIcon('reference', 'reference', e => addRef(e, name), 'Add reference', btnSize));
			}
		}
		if ((!R.diagram || name !== R.diagram.name) && !nobuts.has('close') && D.viewports.has(name))
		{
			const closeFn = nm =>
			{
				const diagram = R.$CAT.getElement(nm);
				if (diagram)
				{
					diagram.close();
					this.search();
				}
			};
			buttons.push(D.getIcon('close', 'close', e => closeFn(name), 'Close diagram', btnSize));
		}
		return buttons;
	}
	setSearchBar()
	{
		super.setSearchBar();
		const searchFilter = document.getElementById(this.searchFilterId);
		searchFilter.appendChild(D.getIcon('user', 'user', e => this.toggleUserFilter(e), `Restrict to ${R.user.name}`));
		R.diagram && searchFilter.appendChild(D.getIcon('reference', 'reference', e => this.toggleReferenceFilter(e), 'Restrict to this diagram\'s references'));
		const searchSorter = document.getElementById(this.searchSorterId);
		searchSorter.appendChild(D.getIcon('clock', 'clock', e => this.setSaveSorter(e), 'Sort by last save time'));
	}
	html(e)
	{
		super.html(e);
		const diagram = R.diagram;
		const toolbar2 = D.toolbar.element.querySelector('div #Diagram-toolbar2');
		toolbar2.appendChild(D.getIcon('upload-json', 'upload-json', _ => this.showSection('upload-json'), 'Upload', D.default.button.small, `${this.type}-upload-json-icon`));
		const jsonUploadSection = H3.div('##Diagram-upload-json.hidden',
			H3.h4('Upload Diagram JSON'),
			H3.label('Select JSON file to upload as diagram:', {for:'upload-json'}),
			H3.br(),
			H3.input('##upload-json', {type:'file', accept:'.json', onchange:e => D.uploadJSON(e)}));
		toolbar2.parentNode.insertBefore(jsonUploadSection, toolbar2.nextSibling);
		this.setSearchBar();
	}
	setSaveSorter(e)
	{
		this.searchArgs.sorter = U.TimestampSorter;
		D.setActiveIcon(e.target);
		this.search();
	}
	toggleUserFilter(e)
	{
		this.searchArgs.userOnly = !this.searchArgs.userOnly;
		D.toggleIcon(e.target, this.searchArgs.userOnly);
		this.search();
	}
	toggleReferenceFilter(e)
	{
		this.searchArgs.referenceOnly = !this.searchArgs.referenceOnly;
		D.toggleIcon(e.target, this.searchArgs.referenceOnly);
		this.search();
	}
	addNewSection()
	{
		const newSection = this.bpd.getNewSection(R.$CAT, 'Diagram-new', e => this.create(e), this.headline);
		newSection.appendChild(D.getIcon('copy', 'copy', e => this.copy(e), 'Copy diagram'));
		const action = e => this.create(e);
		this.bpd.basenameElt.onkeydown = e => Cat.D.OnEnter(e, action);
		this.bpd.properNameElt.onkeydown = e => Cat.D.OnEnter(e, action);
		this.bpd.descriptionElt.onkeydown = e => Cat.D.OnEnter(e, action);
		this.codomainElt = H3.select('##new-codomain.w100');
		for (const [name, e] of R.$CAT.elements)
			if (e instanceof Category && !(e instanceof IndexCategory) && e.user !== 'sys')
				this.codomainElt.appendChild(H3.option(e.properName, {value:e.name}));
		this.codomainElt.appendChild(H3.option(R.Cat.properName, {value:R.Cat.name}));
		const tbl = newSection.querySelector('table');
		tbl.appendChild(H3.tr(H3.td(this.codomainElt)));
		const elts = [newSection, H3.hr()];
		D.toolbar.help.appendChild(newSection);
	}
	getMatchingElements()
	{
		const diagrams = [];
		R.catalog.forEach((info, name) => info.user !== 'sys' && name.includes(this.filter) &&
			info.basename !== info.user &&
			((this.searchArgs.userOnly && info.user === R.user.name) || !this.searchArgs.userOnly) &&
			((this.searchArgs.referenceOnly && R.diagram.references.has(name)) || !this.searchArgs.referenceOnly) &&
			diagrams.push(info));
		diagrams.sort(this.searchArgs.sorter);
		return diagrams;
	}
	reset()
	{
		this.bpd.reset();
	}
	resetFilter()
	{
		super.resetFilter();
		this.searchArgs.userOnly = false;
		this.searchArgs.referenceOnly = false;
	}
	create(e)
	{
		const args = this.bpd.getArgs();
		const diagram = R.createDiagram(this.codomainElt.value, args.basename, args.properName, args.description);
		if (typeof diagram === 'string')
			D.toolbar.showError(diagram);
		else
		{
			this.bpd.reset();
			D.EmitCATEvent('new', diagram);
			R.SelectDiagram(diagram.name);
		}
	}
	copy(e)
	{
		const args = this.bpd.getArgs();
		try
		{
			const diagram = R.diagram.copy(args.basename, args.properName, args.description);
			if (typeof diagram === 'string')
				D.toolbar.showError(diagram);		// did not work
			else
			{
				R.SaveLocal(diagram);
				diagram.savePng(e);
				this.bpd.reset();
				D.EmitCATEvent('new', diagram);
				R.SelectDiagram(diagram.name);
				D.toolbar.clearError();
			}
		}
		catch(x)
		{
			D.toolbar.showError(x);
		}
	}
	doit(e, diagram, args, save = true)
	{
		try
		{
			if (!diagram.isEditable())
				throw 'diagram is read only';
			const basename = args.basename;
			const name = Element.Codename(diagram, {basename});
			if (diagram.getElement(name))
				throw 'name already exists';
			const properName = args.properName;
			const description = args.description;
		}
		catch(x)
		{
			D.toolbar.showError(x);
		}
	}
	getRows(tbl, elements)
	{
		const fn = elt =>
		{
			const name = elt.name;
			const buttons = this.getButtons(elt, 'download');
			const html = D.getDiagramHtml(elt);
			html.classList.add('element');
			const tools = H3.span('.tool-entry-actions');
			html.appendChild(tools);
			buttons.map(btn => tools.appendChild(btn));
			tbl.appendChild(H3.tr(H3.td(html)));
		};
		elements.map(elt => fn(elt));
	}
}

class CellTool extends ElementTool
{
	constructor(type, headline)
	{
		super('Assert', headline, ['search']);
		this.hasDiagramOnlyButton = false;
		Object.defineProperties(this,
		{
			descriptionElt:		{value: null,		writable: true},
			error:				{value: null,		writable: true},
		});
		D.ReplayCommands.set(`new${this.type}`, this);
	}
	addNewSection()
	{
		D.toolbar.help.appendChild(H3.div(`##${this.type}-new.hidden`));
	}
	getRows(tbl, cells)
	{
		cells.map(cell => tbl.appendChild(cell.getHtmlRow()));
	}
	getMatchingElements()
	{
		return [...R.diagram.domain.cells.values()];
	}
	reset()
	{
		super.reset();
		this.descriptionElt && (this.descriptionElt.value = '');
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
		this.element.addEventListener('mouseenter', e => this.hide());
	}
	_prep(msg)
	{
		this.message = U.HtmlEntitySafe(msg);
		this.timerOut && clearInterval(this.timerOut);
		this.timerIn && clearInterval(this.timerIn);
		msg === '' && this.hide();
	}
	_post(e, msg, level = 0)
	{
		const elt = this.element;
		elt.innerHTML = msg;
		if (e && 'clientX' in e)
			this.xy = new D2(e.clientX, e.clientY);
		else
			this.xy = D.mouse.clientPosition();
		this.xy = D2.Add(this.xy, new D2(20, -60));
		elt.style.left = `${this.xy.x}px`;
		elt.style.top = `${this.xy.y}px`;
		elt.style.display = 'block';
		this.hide();
		const bbox = elt.getBoundingClientRect();
		const delta = bbox.left + bbox.width - window.innerWidth;
		if (delta > 0)	// shift back to onscreen
			elt.style.left = Math.max(0, bbox.left - delta) + 'px';
		switch (level)
		{
			case 1:
				document.getElementById('tty-out').innerHTML += this.message + "\n";
				break;
			case 2:
				D.RecordError(this.message);
				break;
		}
	}
	show(e, msg, level = 0)
	{
		this._prep(msg);
		if (msg !== '')
		{
			this.timerIn = setTimeout(_ => this.element.classList.remove('hidden'), D.default.statusbar.timein);
			this.timerOut = setTimeout(_ => this.hide(), D.default.statusbar.timeout);
			this._post(e, msg, level);
		}
	}
	hide() { this.element.classList.add('hidden'); }
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
		D.parenWidth =		D.textWidth('(');
		D.commaWidth =		D.textWidth(',&nbsp;'),
		D.bracketWidth =	D.textWidth('[');
		D.screenPan =		D.getScreenPan();
		const delta =		Math.min(D.Width(), D.Height()) * D.default.pan.scale;
		D.Panel = 			Panel;
		D.panels =			new Panels();
		D.Panels =			Panels;
		D.helpPanel =		new HelpPanel();
		D.HelpPanel =		HelpPanel;
		D.loginPanel =		new LoginPanel();
		D.LoginPanel =		LoginPanel;
		D.settingsPanel =	new SettingsPanel();
		D.SettingsPanel =	SettingsPanel;
		D.threeDPanel =		new ThreeDPanel();
		D.ThreeDPanel =		ThreeDPanel;
		D.ttyPanel =		new TtyPanel();
		D.TtyPanel =		TtyPanel;
		//
		D.elementTool =
		{
			Diagram:	new DiagramTool('Diagram', 'Create a new diagram'),
			Object:		new ObjectTool('Create a new object in this diagram'),
			Morphism:	new MorphismTool('Create a new morphism in this diagram'),
			Text:		new TextTool('Create new text in this diagram'),
			Assert:		new CellTool('Create new assertion in this diagram'),
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
		const scale = diagram !== null ? diagram.getPlacement().scale : 1.0;
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
		if (!R.sync || diagram.user === diagram.basename)
			return;
		D.CancelAutosave();
		diagram.updateTimestamp();
		const timestamp = diagram.timestamp;
		D.autosaveTimer = setTimeout(_ =>
		{
			if (timestamp === diagram.timestamp)
			{
				R.SaveLocal(diagram);
				if (R.local && !D.textEditActive())
					diagram.upload();
			}
		}, D.default.autosaveTimer);
	}
	static GetAreaSelectCoords(e)
	{
		const xy = {x:e.clientX, y:e.clientY};
		const x = Math.min(xy.x, D.mouse.down.x);
		const y = Math.min(xy.y, D.mouse.down.y);
		const width = Math.abs(xy.x - D.mouse.down.x);
		const height = Math.abs(xy.y - D.mouse.down.y);
		return {x, y, width, height};
	}
	static DrawSelectRect(e)
	{
		const areaSelect = D.GetAreaSelectCoords(e);
		const svg = document.getElementById('selectRect');
		if (svg)
		{
			svg.setAttribute('x', areaSelect.x);
			svg.setAttribute('y', areaSelect.y);
			svg.setAttribute('width', areaSelect.width);
			svg.setAttribute('height', areaSelect.height);
		}
		else
			D.topSVG.appendChild(H3.rect({id:'selectRect', x:areaSelect.x, y:areaSelect.y, width:areaSelect.width, height:areaSelect.height}));
	}
	static DeleteSelectRectangle()
	{
		const svg = document.getElementById('selectRect');
		svg && svg.remove();
	}
	static Mousedown(e)
	{
		D.mouse.saveClientPosition(e);
		if (e.target.id === 'foreign-text')
			return true;
		if (e.button === 0)
		{
			D.mouseIsDown = true;
			D.mouse.down = new D2(e.clientX, e.clientY - D.topSVG.parentElement.offsetTop);	// client coords
			const diagram = R.diagram;
			if (diagram)
			{
				const pnt = diagram.mouseDiagramPosition(e);
				if (D.mouseover)
					!diagram.selected.includes(D.mouseover) && !D.shiftKey && diagram.deselectAll(e);
				else
					diagram.deselectAll(e);
				D.dragStart = D.mouse.sessionPosition();
				if (D.getTool() === 'pan' || !D.drag)
					D.drag = true;
			}
		}
		else if (e.button === 1)
			D.startMousePan(e);
	}
	static Mousemove(e)
	{
		D.mouse.saveClientPosition(e);
		try
		{
			const diagram = R.diagram;
			if (!diagram)
				return;
			D.drag = D.mouseIsDown && diagram.selected.length > 0 && (e.movementX !== 0 || e.movementY !== 0);
			const xy = diagram.mouseDiagramPosition(e);
			xy.width = 2;
			xy.height = 2;
			if (D.default.fullscreen)
			{
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
							if (D.getTool() === 'select')
							{
								let fusible = false;
								diagram.updateDragObjects(e.shiftKey);
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
								else if (D.mouseover && D.mouseOver !== from && D.mouseover.constructor.name === from.constructor.name)
									from.updateGlow(true, from.isFusible(D.mouseover) ? 'glow' : 'badGlow');
								else if (!fusible)	// no glow
									from.updateGlow(false, '');
							}
						}
						else if (D.mouse.delta().nonZero() && D.getTool() === 'select')
							diagram.updateDragObjects(e.shiftKey);
						D.DeleteSelectRectangle();
						D.mouseover = oldMouseover;
					}
					else
						diagram.updateFusible(e);
				}
				else if (D.getTool() === 'pan')
				{
					D.panHandler(e);
					D.DeleteSelectRectangle();
				}
				else if (D.mouseIsDown && !D.drag && (e.movementX !== 0 || e.movementY !== 0))
					D.DrawSelectRect(e);
			}
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
			if (e.which === 2)
			{
				D.setTool('select');
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
									D.EmitCellEvent(diagram, 'check');
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
						if (e instanceof DiagramMorphism)
						{
							elts.set(e.domain.name, e.domain.getXY());
							elts.set(e.codomain.name, e.codomain.getXY());
							!orig.has(e.domain) && orig.set(e.domain, e.domain.orig);
							!orig.has(e.codomain) && orig.set(e.codomain, e.codomain.orig);
							movables.add(e.domain);
							movables.add(e.codomain);
						}
						else if (e instanceof Cell)
							e.getObjects().map(o => movables.add(o));
						else if (!(e instanceof Cell))
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
						movables.forEach(elt => D.EmitElementEvent(diagram, 'move', elt));
						D.EmitDiagramEvent(diagram, 'move', '');
					}
				}
				else if (!D.mouseover)
					diagram.areaSelect(e);
			}
			catch(x)
			{
				D.RecordError(x);
			}
			D.drag = false;
		}
		else if (e.button === 1)
			D.stopMousePan();
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
				R.DownloadDiagram(name, ev => R.AddReference(ev, name), e);
			else
			{
				let from = null;
				if (elt instanceof CatObject)
				{
					from = diagram.placeObject(elt, xy);
					diagram.log({command:'copy', source:elt.name, xy});
				}
				else if (elt instanceof Morphism)
				{
					from = diagram.placeMorphism(elt, xy, null, true);
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
		const args = {title, 'data-name':`button-${name}`};
		if (id)
			args.id = id;
		return H3.span('.icon', H3.svg(		{viewbox:"0 0 320 320", width:`${inches}in`, height:`${inches}in`},
											H3.animateTransform({attributeName:"transform", type:"rotate", from:"360 0 0", to:"0 0 0", dur:"0.5s", repeatCount, begin:"indefinite"}),
											H3.rect('.icon-background', {x:"0", y:"0", width:"32", height:"32", onclick}),
											H3.use({href:`#icon-${buttonName}`}),
											H3.rect('.btn', {x:"0", y:"0", width:"32", height:"32", onclick})), args);
	}
	static setActiveIcon(elt, radio = true)
	{
		if (!elt)
			return;
		const icon = D.findAncestor('SPAN', elt);
		if (icon.parentNode)
		{
			let btn = icon.parentNode.firstChild;
			if (radio)
				while(btn)
				{
					D.setUnactiveIcon(btn);
					btn = btn.nextSibling;
				}
		}
		icon.querySelector('.btn').classList.add('icon-active');
	}
	static setUnactiveIcon(elt)
	{
		const icon = D.findAncestor('SPAN', elt);
		icon.querySelector('.btn').classList.remove('icon-active');
	}
	static setCursor()
	{
		switch(D.getTool())
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
		const diagram = R.$CAT.getElement(e.target.dataset.name);
		const zoomDgrm = diagram && !D.default.fullscreen &&
						(e.target.dataset.type === 'diagram' || e.target.dataset.type === 'object' || e.target.dataset.type === 'morphism' || e.target.dataset.type === 'cell' || e.target.constructor.name === 'SVGTextElement');
		const viewport = zoomDgrm ? diagram.getPlacement() : D.session.viewport;
		const vpScale = viewport.scale;
		let inc = Math.log(vpScale)/Math.log(D.default.scale.base) + scalar;
		let scale = D.default.scale.base ** inc;
		let userPnt = null;
		if ('clientX' in e)
			userPnt = {x:e.clientX, y:e.clientY};
		else
			userPnt = {x:D.Width()/2, y:D.Height()/2};
		const pnt = Cat.D.default.fullscreen ? D.mouse.sessionPosition() : D.userToSessionCoords(userPnt);
		let x = pnt.x;
		let y = pnt.y;
		if (zoomDgrm)
		{
			x = x - (scale / vpScale) * (x - viewport.x);
			y = y - (scale / vpScale) * (y - viewport.y);
			diagram.setPlacement({x, y, scale});
		}
		else
		{
			const ratio = scale / vpScale;
			x = userPnt.x + ratio * (viewport.x - userPnt.x);
			y = userPnt.y + ratio * (viewport.y - userPnt.y);
			D.diagramSVG.classList.remove('trans');
			D.setSessionViewport({x, y, scale});
			D.diagramSVG.classList.add('trans');
		}
	}
	static getKeyName(e)
	{
		let name = e.ctrlKey && e.key !== 'Control' ? 'Control' : '';
		name += e.shiftKey && e.key !== 'Shift' ? 'Shift' : '';
		name += e.altKey && e.key !== 'Alt' ? 'Alt' : '';
		name += e.code;
		return name;
	}
	static AddEventListeners()
	{
		window.addEventListener('resize', e =>
		{
			D.Resize();
			R.diagram && R.diagram.updateBackground();
		});
		window.addEventListener('Assertion', e =>
		{
			if (!R.sync)
				return;
			const args = e.detail;
			switch(args.command)
			{
				case 'delete':
					R.diagram.loadCells();
					R.diagram.domain.checkCells();
					D.Autosave(args.diagram);
					break;
				case 'new':
				case 'update':
					D.Autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('Morphism', e =>
		{
			if (!R.sync)
				return;
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'delete':
					diagram.domain.findCells(diagram);
					diagram.domain.checkCells();
					D.Autosave(diagram);
					break;
				case 'detach':
					if (args.element instanceof DiagramMorphism)
						args.element.homsetIndex = 0;
					// fall through
				case 'new':
					if (args.element instanceof DiagramMorphism)
					{
						isGUI && diagram.updateBackground();
						diagram.domain.findCells(diagram);
						diagram.domain.checkCells();
						D.Autosave(diagram);
					}
					else
						args.element.loadItem();
					break;
				case 'update':
					if ('update' in args.element)
					{
						args.element.update();
						diagram.domain.updateCells(args.element);
						isGUI && diagram.updateBackground();
					}
					D.Autosave(diagram);
					break;
			}
		});
		window.addEventListener('Object', e =>
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
					args.diagram.domain.findCells(diagram);
					diagram.domain.checkCells();
					D.Autosave(args.diagram);
					break;
				case 'delete':
				case 'new':
				case 'update':
				case 'move':
					if (args.element instanceof DiagramObject)
					{
						isGUI && args.diagram.updateBackground();
						D.Autosave(args.diagram);
					}
					break;
			}
		});
		window.addEventListener('Text', e =>
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
		window.addEventListener('Diagram', e =>
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
						diagram.loadCells();
						diagram.domain.checkCells();
						D.Autosave(diagram);
						break;
					case 'update':
						D.Autosave(diagram);
						break;
					case 'loadCells':
						diagram.loadCells();
						break;
				}
			D.Autohide(e);
		});
		window.addEventListener('Cell', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'check':
					diagram.domain.checkCells();
					break;
				case 'hide':
				case 'show':
					D.Autosave(diagram);
					break;
			}
		});
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'load':
					diagram.purge();
					diagram.loadCells();
					break;
				case 'default':
					if (diagram)
					{
						R.LoadDiagramEquivalences(diagram);
						diagram.domain.checkCells();
					}
					if (isGUI)
					{
						let saveSession = true;
						if (diagram)
						{
							D.session.default = diagram.name;
							diagram.makeSVG();
							D.diagramSVG.appendChild(diagram.svgRoot);
							const placement = diagram.getPlacement();
							D.diagramSVG.classList.remove('trans');
							diagram.setPlacement(placement, false);
							if ('action' in args)
							{
								if (args.action === 'home')
									diagram.home();
								else if (D.default.fullscreen)
								{
									const viewport = diagram.getViewport();
									if (viewport)
										D.setSessionViewport(viewport);
									else
										diagram.home();
								}
								saveSession = false;
							}
							D.diagramSVG.classList.add('trans');
							D.GlowBadObjects(diagram);
						}
						else
							D.session.default = null;
						saveSession && D.EmitViewEvent('diagram', diagram);
					}
					break;
				case 'download':
					R.SaveLocal(diagram);
					break;
				case 'close':
				case 'delete':
					D.viewports.delete(diagram);
					D.placements.delete(diagram);
					D.saveSession();
					D.statusbar.show(e, `Diagram ${diagram} ${args.command}`);
					break;
				case 'new':
					D.Autosave(diagram);
					break;
			}
		});
		window.addEventListener('Diagram', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'delete':
					D.viewports.delete(diagram.name);
					D.placements.delete(diagram.name);
					D.saveSession();
					D.statusbar.show(e, `Diagram ${diagram.name} ${args.command}`);
					break;
			}
		});
		window.addEventListener('Login', e =>
		{
			if (D.session.mode === 'diagram')
			{
				const name = R.params.get('diagram');
				if (!R.diagram || R.diagram.name !== name)
				R.SelectDiagram(name);
			}
			if (R.user.status !== 'logged-in')
				return;
			R.authFetch(R.getURL('userInfo'), {}).then(res => res.json()).then(json =>
			{
				R.user.cloud = json;
				R.user.cloud.permissions = 'permissions' in json ? R.user.cloud.permissions.split(' ') : [];
			});
		});
		window.onresize = D.Resize;
		window.addEventListener('mousemove', D.Autohide);
		window.addEventListener('mousedown', D.Autohide);
		window.addEventListener('keydown', D.Autohide);
		window.addEventListener('Assertion', D.UpdateDisplay);
		window.addEventListener('Morphism', D.UpdateMorphismDisplay);
		window.addEventListener('Object', D.UpdateObjectDisplay);
		window.addEventListener('Text', D.UpdateTextDisplay);
		window.addEventListener('mousemove', D.Mousemove);
		D.topSVG.addEventListener('mousedown', D.Mousedown, true);
		D.topSVG.addEventListener('mouseup', D.Mouseup, true);
		D.topSVG.addEventListener('drop', D.Drop, true);
		D.topSVG.addEventListener('mousemove', e =>
		{
			if (D.statusbar.element.style.display === 'block' && D2.Dist(D.statusbar.xy, {x:e.clientX, y:e.clientY}) > D.default.statusbar.hideDistance)
				D.statusbar.hide();
		});
		D.topSVG.ondragover = e => e.preventDefault();
		D.topSVG.addEventListener('drop', e => e.preventDefault(), true);
		window.addEventListener('keydown', e =>
		{
			if (D.session.mode === 'diagram' && (!D.toolbar.hasActiveInputs() || D.getKeyName(e) === 'Escape'))
			{
				const name = D.getKeyName(e);
				name in D.keyboardDown && D.keyboardDown[name](e);
			}
		});
		window.onkeyup = e =>
		{
			if (D.session.mode === 'diagram')
			{
				D.setCursor();
				const name = D.getKeyName(e);
				name in D.keyboardUp && D.keyboardUp[name](e);
			}
		};
		document.onwheel = e =>
		{
			let node = e.target;
			while(node)		// no wheeling on the toolbar
			{
				if (node.id === 'toolbar')
					return;
				node = node.parentNode;
			}
			if (D.session.mode === 'diagram')
			{
				const dirX = Math.max(-1, Math.min(1, e.wheelDeltaX));
				const dirY = Math.max(-1, Math.min(1, e.wheelDeltaY));
				if (e.shiftKey)
				{
					D.toolbar.hide();
					D.Zoom(e, dirY);
				}
				else
				{
					let compass = '';
					if (dirY !== 0)
						compass = dirY < 0 ? 'down' : 'up';
					else
						compass = dirX < 0 ? 'right' : 'left';
					D.panHandler(e, compass);
				}
			}
			else if (D.session.mode === 'catalog' && e.shiftKey)
			{
				D.catalog.onwheel(e);
				e.stopPropagation();
			}
		};
		window.addEventListener('View', e =>
		{
			const args = e.detail;
			const command = args.command;
			const diagram = args.diagram;
			if (command === 'diagram')
			{
				D.topSVG.classList.remove('hidden');
				if (diagram)
				{
					if (diagram.user === 'sys')
						diagram.autoplace();
					D.diagramSVG.classList.remove('hidden');
					diagram.updateBackground();
					diagram.show();
					D.diagramSVG.appendChild(diagram.svgRoot);		// make top-most viewable diagram
					D.default.fullscreen && diagram.saveViewport(D.session.viewport);
					D.saveSession();
				}
			}
			else if (command === 'catalog')
			{
				R.initialized && D.saveSession();
				D.topSVG.classList.add('hidden');
				D.catalog.show();
			}
		});
		window.addEventListener('Application', e =>
		{
			const args = e.detail;
			switch (args.command)
			{
				case 'start':
					D.NotBusy();
					D.forEachDiagramSVG(d => d.show());
					D.setFullscreen(D.default.fullscreen);
					break;
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
			const text = H3.text({class:cls, x:"100", y:"100", 'text-anchor':'middle'}, safeTxt);
			D.uiSVG.appendChild(text);
			const width = text.getBBox().width;
			D.uiSVG.removeChild(text);
			D.textSize.set(safeTxt, width);
			return width;
		}
		return 10;
	}
	static Grid(x, majorGrid = false)
	{
		const grid = majorGrid ? D.gridSize() : D.default.layoutGrid;
		switch (typeof x)
		{
		case 'number':
			return D.gridding ? grid * Math.round(x / grid) : x;
		case 'object':
			return new D2(D.Grid(x.x, majorGrid), D.Grid(x.y, majorGrid));
		}
	}
	static limit(s)
	{
		return s.length > D.textDisplayLimit ? s.slice(0, D.textDisplayLimit) + '...' : s;
	}
	static RecordError(err)
	{
		const errTxt = U.GetError(err);
		if (isGUI)
		{
			const elements = [H3.br(), H3.span(errTxt)];
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
		const svg = diagram.svgBase;
		const copy = svg.cloneNode(true);
		const top = H3.svg();
		const markers = ['arrowhead', 'arrowheadRev'];
		markers.map(mrk => top.appendChild(document.getElementById(mrk).cloneNode(true)));
		top.appendChild(copy);
		D.copyStyles(copy, svg);
		const width = D.snapshotWidth;
		const height = D.snapshotHeight;
		const wRat = window.innerWidth / width;
		const hRat = window.innerHeight / height;
		const rat = hRat < wRat ? wRat : hRat;
		const p = diagram.getPlacement();
		const vp = diagram.getViewport();
		const x = (p.x * vp.scale + vp.x) / rat;
		const y = (p.y * vp.scale + vp.y) / rat;
		const s = vp.scale * p.scale / rat;
		copy.setAttribute('transform', `translate(${x} ${y}) scale(${s} ${s})`);
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
		{
			that ? fn.call(that, e) : fn(e);
			return true;
		}
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
		const a = H3.a({download:filename, href, target:'_blank'});
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
				const copy = diagram.placeObject(o.to, oxy, false);
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
					const to = elt.to;
					const flipName = elt.attributes.get('flipName');
					copy = new DiagramMorphism(diagram, {domain, codomain, to, attributes:[['flipName', true]]});
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
			if (d && typeof d === 'object')
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
				const bx = D2.Add(o.svg.getBBox(), o.getXY());
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
		if (!('alt' in nuArgs))
			nuArgs.alt = 'Image not available';
		return H3.img('.imageBackground', nuArgs);
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
		const stdGrid = D.default.arrow.length;
		const xy = new D2({x:bbox.x, y:bbox.y + bbox.height + stdGrid}).grid(stdGrid);
		const indexObjects = objects.map((o, i) =>
		{
			const ndxObj = diagram.placeObject(o, xy, false);
			if (i !== objects.length -2)
				xy.x += i < composite.length -1 ? D.GetArrowLength(composite[i]) : stdGrid;
			else
				xy.y += stdGrid;
			return ndxObj;
		});
		diagram.deselectAll();
		composite.map((m, i) => diagram.addSelected(diagram.placeMorphism(m, indexObjects[i], indexObjects[i+1], false)));
		const indexComp = diagram.placeMorphism(comp, indexObjects[0], indexObjects[indexObjects.length -1], false);
		indexComp.attributes.set('flipName', true);
		indexComp.update();
		diagram.addSelected(indexComp);
		return indexObjects;
	}
	static GetArrowLength(m)
	{
		const stdGrid = Cat.D.gridSize();
		let delta = stdGrid;
		const tw = m.textWidth();
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
						D.EmitElementEvent(diagram, 'move', elt);
					}
				}
				D.EmitDiagramEvent(diagram, 'move');
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
					const from = diagram.placeObject(args.to, args.xy, false);
					const morphs = new Set();
					domains.map(m => {m.setDomain(from); morphs.add(m);});
					codomains.map(m => {m.setCodomain(from); morphs.add(m);});
					const elements = [...diagram.domain.elements.values()];
					elements.pop();		// remove 'from' from end of stack
					let minNdx = Number.MAX_VALUE;
					morphs.forEach(function(m) { minNdx = Math.min(minNdx, elements.indexOf(m)); });
					elements.splice(minNdx, 0, from);	// put from to be before the morphisms
					diagram.domain.replaceElements(elements);
					D.EmitObjectEvent(diagram, 'fuse', from, {target});
					D.EmitCellEvent(diagram, 'check');
				}
			}
		};
		D.ReplayCommands.set('fuse', replayFuse);
		const replayText =
		{
			replay(e, diagram, args)
			{
				const xy = new D2(args.xy);
				diagram.placeText(args.text, xy);
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
				diagram.setPlacement(args);
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
			D.toolbar.hide();
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
			R.busyBtn.remove();
			delete R.busyBtn;
		}
	}
	static saveSession()
	{
		D.session.diagrams.length = 0;
		D.forEachDiagramSVG(d => D.session.diagrams.push(d.name));
		U.writefile('session.json', JSON.stringify(D.session));
	}
	static readSession()
	{
		const str = U.readfile('session.json');
		if (str)
		{
			D.session = JSON.parse(str);
			const viewport = D.session.viewport;
			if (isNaN(viewport.x))
				viewport.x = 0;
			if (isNaN(viewport.y))
				viewport.y = 0;
			if (isNaN(viewport.scale) || viewport.scale <= 0)
				viewport.scale = 1;
		}
		else
			D.session = {mode:'catalog', default:null, diagrams:[], viewport:{x:0, y:0, scale:1}};
		D.setSessionViewport(D.session.viewport);
	}
	static forEachDiagramSVG(fn)
	{
		let dgrmSvg = D.diagramSVG.firstChild;
		if (dgrmSvg)
			do
			{
				if (dgrmSvg.constructor.name === 'SVGGElement' && 'name' in dgrmSvg.dataset)
				{
					const dgrm = R.$CAT.getElement(dgrmSvg.dataset.name);
					dgrm && fn(dgrm, dgrmSvg);
				}
			}
			while((dgrmSvg = dgrmSvg.nextSibling));
	}
	static setSessionViewport(viewport)
	{
		D.session.viewport.x = viewport.x;
		D.session.viewport.y = viewport.y;
		const oldScale = D.session.viewport.scale;
		D.session.viewport.scale = viewport.scale;
		if (oldScale > viewport.scale)		// due to transition effect on diagramSVG
			R.diagram && R.diagram.updateBackground();
		D.diagramSVG.setAttribute('transform', `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale} ${viewport.scale})`);
		R.diagram && D.EmitViewEvent(D.session.mode, R.diagram);
	}
	static getViewportByBBox(bbox)	// bbox in session coordinates
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
		return {x, y, scale};
	}
	static setSessionViewportByBBox(bbox)
	{
		D.setSessionViewport(D.getViewportByBBox(bbox));
	}
	static userToSessionCoords(xy)
	{
		const viewport = D.session.viewport;
		const scale = 1.0 / viewport.scale;
		if (isNaN(viewport.x) || isNaN(scale))
			throw 'NaN in coords';
		const d2 = new D2(	scale * (xy.x - viewport.x),
							scale * (xy.y - viewport.y));
		if ('width' in xy && xy.width > 0)
		{
			d2.width = scale * xy.width;
			d2.height = scale * xy.height;
		}
		if (false)
			this.svgTranslate.appendChild(H3.circle('.ball', {cx:d2.x, cy:d2.y, r:5, fill:'red'}));
		return d2;
	}
	static sessionToUserCoords(xy)
	{
		const viewport = D.session.viewport;
		const scale = viewport.scale;
		if (isNaN(viewport.x) || isNaN(scale))
			throw 'NaN in coords';
		let d2 = new D2(	scale * xy.x + viewport.x,
							scale * xy.y + viewport.y);
		if ('width' in xy)
		{
			d2.width = xy.width * scale;
			d2.height = xy.height * scale;
		}
		return d2;
	}
	static getScreenPan()
	{
		return Math.min(D.Width(), D.Height()) * D.default.pan.scale;
	}
	static panHandler(e, dir)
	{
		if (D.textEditActive())
			return;
		let offset = null;
		const scale = 1 / D.session.viewport.scale;
		if (typeof dir === 'string')
			switch(dir)
			{
				case 'up':
					offset = new D2(0, D.screenPan);
					break;
				case 'down':
					offset = new D2(0, -D.screenPan);
					break;
				case 'left':
					offset = new D2(D.screenPan, 0);
					break;
				case 'right':
					offset = new D2(-D.screenPan, 0);
					break;
			}
		else if (dir instanceof D2)
			offset = new D2(dir.x * D.screenPan, dir.y * D.screenPan);
		else
			offset = new D2(e.movementX, e.movementY);
		offset = offset.scale(scale);
		if (D.default.fullscreen)
		{
			if(R.diagram)
			{
				const placement = R.diagram.getPlacement();
				R.diagram.setPlacement({x:placement.x + offset.x, y:placement.y + offset.y, scale:placement.scale});
			}
			e.currentTarget !== document && e.preventDefault();
		}
		else	// pan session
		{
			const viewport = D.session.viewport;
			D.setSessionViewport({x:viewport.x + viewport.scale * offset.x, y:viewport.y + viewport.scale * offset.y, scale:viewport.scale});
		}
	}
	static readViewport(name)
	{
		const str = U.readfile(`${name}-viewport.json`);
		return str ? JSON.parse(str) : null;
	}
	static textEditActive()
	{
		return D.editElement !== null;
	}
	static closeActiveTextEdit()
	{
		if (D.textEditActive())
		{
			D.editElement.contentEditable = false;
			D.editElement = null;
		}
	}
	static setFullscreen(full, emit = true)
	{
		D.default.fullscreen = full;
		R.SaveDefaults();
		if (emit)
		{
			const diagrams = D.session.diagrams.map(diagram => R.CAT.getElement(diagram)).filter(d => d);
			if (full && R.diagram)
				R.diagram.updateBackground();
			else
			{
				diagrams.map(diagram => diagram.updateBackground());
				const bkgnd = document.getElementById('diagram-background');
				bkgnd && bkgnd.remove();
			}
		}
	}
	static getTool()
	{
		return D.tool[D.tool.length -1];
	}
	static popTool()
	{
		D.tool.pop();
	}
	static pushTool(tool)
	{
		D.tool.push(tool);
	}
	static setTool(tool)
	{
		D.tool.length = 0;
		D.pushTool(tool);
	}
	static findAncestor(tag, elt)
	{
		let found = elt;
		let nxt = elt;
		while(nxt && nxt.tagName !== tag)
		{
			nxt = nxt.parentNode;
			if (nxt)
				found = nxt;
		}
		return found;
	}
	static getDiagramHtml(info)
	{
		const items = [];
		items.push(H3.span('.smallBold', info.properName !== '' & info.properName !== info.basename ? info.properName : info.basename));
		info.description !== '' && items.push(H3.span('.diagramRowDescription', info.description));
		items.push(H3.br(), H3.span(info.name, '.tinyPrint'));
		items.push(H3.span(info.codomain instanceof Category ? info.codomain.name : info.codomain, '.smallPrint'));
		items.push(H3.span(new Date(info.timestamp).toLocaleString(), '.smallPrint'));
		return H3.div(items);
	}
	static toggleIcon(icon, bool)
	{
		if (bool)
			D.setActiveIcon(icon, false);
		else
			D.setUnactiveIcon(icon);
	}
	static inputBasenameSearch(e, diagram, action, base = null)
	{
		if (D.OnEnter(e, action))
			return;
		const basename = 'value' in e.target ? e.target.value : e.target.innerText;	// input elements vs other tags
		const name = `${diagram.name}/${basename}`;
		let elt = diagram.getElement(name);
		if (elt && elt === base)
			return;
		if (elt === undefined)
			elt = diagram.codomain.elements.get(name);
		if (e.target.contentEditable)
		{
			e.target.style.backgroundColor = elt ? 'red' : '';
			e.target.style.color = elt ? 'white' : '';
		}
		else
			elt ? e.target.classList.add('error') : e.target.classList.remove('error');
	}
	static startMousePan(e)
	{
		D.getTool() !== 'pan' && D.pushTool('pan');
		D.drag = false;
		D.setCursor();
		e.preventDefault();
		D.toolbar.hide();
	}
	static stopMousePan()
	{
		D.getTool() === 'pan' && D.popTool();
	}
	static resetDefaults()
	{
		U.removefile('defaults.json');
		R.default = U.Clone(R.factoryDefaults);
		D.default = U.Clone(D.factoryDefaults);
		D.statusbar.show(null, 'Defaults reset to original values');
		isGUI && D.panels.panels.settings.update();
	}
	static gridSize()
	{
		return D.default.majorGridMult * D.default.layoutGrid;
	}
	static EmitViewEvent(command, diagram = null)
	{
		if (!isGUI)
			return;
		D.session.mode = command;
		R.default.showEvents && console.log('emit View event', {command});
		return window.dispatchEvent(new CustomEvent('View', {detail:	{command, diagram}, bubbles:true, cancelable:true}));
	}
	static EmitApplicationEvent(command)
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit APPLICATION event', command);
		return window.dispatchEvent(new CustomEvent('Application', {detail:	{command}, bubbles:true, cancelable:true}));
	}
	static EmitLoginEvent()
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit LOGIN event', R.user.name, R.user.status);
		return window.dispatchEvent(new CustomEvent('Login', {detail:	{command:R.user.status, name:R.user.name}, bubbles:true, cancelable:true}));
	}
	static EmitCATEvent(command, diagram, action = null)	// like diagram was loaded
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit CAT event', {command, diagram, action});
		return window.dispatchEvent(new CustomEvent('CAT', {detail:	{command, diagram, action}, bubbles:true, cancelable:true}));
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
		if (!isGUI || diagram.svgRoot === null)
			return;
		R.default.showEvents && console.log('emit MORPHISM event', {command, name:element.name});
		const detail = {diagram, command, element};
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
			D.EmitObjectEvent(diagram, command, elt);
		else if (elt instanceof Morphism)
			D.EmitMorphismEvent(diagram, command, elt);
		else if (elt instanceof DiagramText)
			D.EmitTextEvent(diagram, command, elt);
		else if (elt instanceof Assertion)
			D.EmitAssertionEvent(diagram, command, elt);
	}
	static EmitCellEvent(diagram, command, cell = null)	// like something happened to a cell
	{
		if (!isGUI)
			return;
		R.default.showEvents && console.log('emit CELL event', {diagram, command, name});
		return window.dispatchEvent(new CustomEvent('Cell', {detail:	{diagram, command, cell}, bubbles:true, cancelable:true}));
	}
	static uploadJSON(e)
	{
		const files = e.target.files;
		const proc = txt => R.uploadJSON(e, JSON.parse(txt));
		for (let i=0; i<files.length; ++i)
		{
			const file = files[i];
//			file.text().then(txt => R.uploadJSON(e, JSON.parse(txt)));
			file.text().then(proc);
		}
	}
}
Object.defineProperties(D,
{
	bracketWidth:	{value: 0,			writable: true},
	catalog:		{value: null,		writable: true},
	category:		{value: null,		writable: true},
	commaWidth:		{value: 0,			writable: true},
	copyDiagram:	{value:	null,		writable: true},
	ctrlKey:		{value: false,		writable: true},
	cellMap:		{value:
						{
							assertion:		'&#10609;',
							computed:		'&#10226;',
							composite:		'&#8797;',
							hidden:			'&#9676;',
							notequal:		'&#8800;',
							named:			'&#8797;',
							unknown:		'&#8799;',
						},				writable: false},
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
			autohideTimer:	60000,	// ms
			autosaveTimer:	2000,	// ms
			button:		{tiny:0.4, small:0.66, large:1.0},
			diagram:
			{
				imageScale:		1.0,
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
			majorGridMult:	10,
			margin:			5,
			pan:			{scale:	0.05},
			panel:			{width:	230},
			scale:			{base:1.05},
			scale3D:		1,
			stdOffset:		new D2(50, 50),
			stdArrow:		new D2(200, 0),
			stdArrowDown:	new D2(0, 200),
			statusbar:		{
								timein:			100,	// ms
								timeout:		5000,	// ms
								hideDistance:	50,		// px
							},
			title:			{height:76, weight:'bold'},
			toolbar:		{x:15, y:70},
		},
		writable:		true,
	},
	diagramPNGs:	{value: new Map(),	writable: true},	// a map of the loaded diagram png's
	diagramSVG:		{value: null,		writable: true},	// the svg g element containing the session transform
	directions:		{value: [new D2(0, -1), new D2(-1, -1), new D2(-1, 0), new D2(-1, 1), new D2(0, 1), new D2(1, 1), new D2(1, 0), new D2(1, -1)]},
	drag:			{value: false,		writable: true},
	dragStart:		{value: new D2(),	writable: true},
	// the svg text element being editted
	editElement:	{value: null,		writable: true},
	elementTool:	{value: null,		writable: true},
	gridding:		{value: true,		writable: true},
	helpPanel:		{value: null,		writable: true},
	id:				{value: 0,			writable: true},
	keyboardDown:			// keyup actions
	{
		value:
		{
			Minus(e) { D.Zoom(D.mouse.clientEvent(), -2);},
			Equal(e) { D.Zoom(D.mouse.clientEvent(), 2);},
//			AltHome(e)		BROWSER RESERVED
			ControlHome(e)
			{
				if (R.diagram && D.session.mode === 'diagram')
				{
					D.setFullscreen(true);
					R.diagram.home();
				}
			},
			Home(e)
			{
				const diagram = R.diagram;
				if (D.default.fullscreen && diagram)
					diagram.home();
				else
				{
					const bbox = new D2();
					D.forEachDiagramSVG(d => !d.svgRoot.classList.contains('hidden') && bbox.merge(d.svgRoot.getBBox()));
					D.setSessionViewportByBBox(bbox);
				}
				e.preventDefault();
			},
			ArrowUp(e)
			{
				if (R.diagram.selected.length === 0)
					D.panHandler(e, 'up');
				else
					R.diagram.moveElements({x:0, y:-D.gridSize()}, ...R.diagram.selected);
			},
			ArrowDown(e)
			{
				if (R.diagram.selected.length === 0)
					D.panHandler(e, 'down');
				else
					R.diagram.moveElements({x:0, y:D.gridSize()}, ...R.diagram.selected);
			},
			ArrowLeft(e)
			{
				if (R.diagram.selected.length === 0)
					D.panHandler(e, 'left');
				else
					R.diagram.moveElements({x:-D.gridSize(), y:0}, ...R.diagram.selected);
			},
			ArrowRight(e)
			{
				if (R.diagram.selected.length === 0)
					D.panHandler(e, 'right');
				else
					R.diagram.moveElements({x:D.gridSize(), y:0}, ...R.diagram.selected);
			},
			ControlLeft(e) { D.ctrlKey = true; },
			ControlRight(e) { D.ctrlKey = true; },
			Digit1(e)
			{
				if (R.diagram && e.target === document.body)
				{
					const diagram = R.diagram;
					if (diagram.selected.length === 1)
					{
						const elt = diagram.getSelected();
						if (elt instanceof DiagramObject)
						{
							const morphism = R.diagram.fctr(elt.to, [-1]);
							diagram.placeMorphismByObject(e, 'domain', elt, morphism);
							return;
						}
					}
					const one = diagram.get('FiniteObject', {size:1});
					diagram.placeObject(one, D.mouse.diagramPosition(diagram));
				}
			},
			Digit2(e)
			{
				if (R.diagram && e.target === document.body)
				{
					const diagram = R.diagram;
					const one = diagram.get('FiniteObject', {size:1});
					const two = diagram.coprod(one, one);
					diagram.placeObject(two, D.mouse.diagramPosition(diagram));
				}
			},
			Delete(e)
			{
				R.diagram && !D.textEditActive() && R.diagram.activate(e, 'delete');
			},
			ShiftDelete(e)
			{
				if (R.diagram && !D.textEditActive())
				{
					R.diagram.activate(e, 'delete');
					if (R.diagram.selected.length > 0)
						R.diagram.activate(e, 'delete');
				}
			},
//			ControlShiftKeyDelete(e)		BROWSER RESERVED: Open the window for clearing browser history
			Escape(e)
			{
				if (D.textEditActive())
					D.closeActiveTextEdit();
				else if (D.session.mode === 'catalog' && R.diagram)
					D.EmitViewEvent('diagram', R.diagram);
				else if (D.session.mode === 'diagram')
				{
					let isOpen = false;
					Object.values(D.panels.panels).forEach(pnl => isOpen = isOpen || (pnl.elt.style.width !== '0px' && pnl.elt.style.width !== ''));
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
					R.diagram && D.setFullscreen(!D.default.fullscreen);
				}
				D.DeleteSelectRectangle();
				// TODO abort drag element
			},
			KeyA(e)
			{
				D.toolbar.show();
				Cat.D.elementTool.Assert.html(e);
			},
			ShiftKeyA(e)
			{
				D.toolbar.show();
				Cat.D.elementTool.Assert.html(e);
				e.preventDefault();
			},
			ControlKeyA(e)
			{
				R.diagram.selectAll();
				e.preventDefault();
			},
			KeyC(e)
			{
				if (R.Actions.copy.hasForm(R.diagram, R.diagram.selected))
					R.Actions.copy.action(e, R.diagram, R.diagram.selected);
			},
			ControlKeyC(e)
			{
				D.pasteBuffer = R.diagram.selected.slice();
				D.copyDiagram = R.diagram;
				const xy = D.mouse.clientPosition();
				D.statusbar.show({clientX:xy.x, clientY:xy.y}, 'Copied to paste buffer');
			},
			KeyD(e)
			{
				D.toolbar.show();
				D.elementTool.Diagram.html(e);
			},
			ShiftKeyD(e)
			{
				D.toolbar.show();
				D.elementTool.Diagram.html(e);
//				D.toolbar.showSection('diagram', 'new');
				D.elementTool.Diagram.showSection('new');
			},
//			ControlKeyD(e)		BROWSER RESERVED: bookmark current page
			KeyE(e)
			{
				if (R.Actions.composite.hasForm(R.diagram, R.diagram.selected))
					R.Actions.composite.action(e, R.diagram, R.diagram.selected);
			},
//			ControlKeyF(e)		BROWSER RESERVED: search on page
			KeyG(e)
			{
				Cat.R.diagram.showGraphs();
				e.preventDefault();
			},
//			ControlKeyG(e)		BROWSER RESERVED: find next match
//			ShiftControlKeyG(e)	BROWSER RESERVED: find previous match
			KeyH(e)
			{
				if (R.Actions.homset.hasForm(R.diagram, R.diagram.selected))
				{
					D.toolbar.show();
					R.diagram.actionHtml(e, 'homset');
					D.toolbar.help.querySelector('#new-basename').focus();
					e.preventDefault();
				}
			},
			ShiftKeyH(e)
			{
				if (R.Actions.hom.hasForm(R.diagram, R.diagram.selected))
					R.Actions.hom.action(e, R.diagram, R.diagram.selected);
			},
//			ControlKeyH(e)		BROWSER RESERVED: open browsing history
			KeyI(e)
			{
				if (R.Actions.identity.hasForm(R.diagram, R.diagram.selected))
					R.Actions.identity.action(e, R.diagram, R.diagram.selected[0]);
			},
//			ControlKeyJ(e)		BROWSER RESERVED: open download history
//			ControlKeyK(e)		BROWSER RESERVED: focus on search box
			KeyL(e)
			{
				if (R.Actions.lambda.hasForm(R.diagram, R.diagram.selected))
					R.Actions.lambda.html(e, R.diagram, R.diagram.selected);
			},
//			ControlKeyL(e)		BROWSER RESERVED: focus on address bok
			ControlKeyL(e)
			{
				D.ttyPanel.open();
				D.ttyPanel.logSection.open();
				e.preventDefault();
			},
			KeyM(e)
			{
				D.toolbar.show();
				D.elementTool.Morphism.html(e);
			},
			ShiftKeyM(e)
			{
				D.toolbar.show();
				D.elementTool.Morphism.html(e);
//				D.toolbar.showSection('Morphism', 'new');
				D.elementTool.Morphism.showSection('new');
				D.toolbar.help.querySelector('#new-basename').focus();
				e.preventDefault();
			},
//			ControlKeyN(e)		BROWSER RESERVED: open a new browser window
			KeyO(e)
			{
				D.toolbar.show();
				Cat.D.elementTool.Object.html(e);
			},
			ShiftKeyO(e)
			{
				D.toolbar.show();
				Cat.D.elementTool.Object.html(e);
				D.elementTool.Object.showSection('new');
				D.toolbar.help.querySelector('#new-basename').focus();
				e.preventDefault();
			},
//			ControlKeyO(e)		BROWSER RESERVED: open local page
			KeyP(e)
			{
				if (R.Actions.productAssembly.hasForm(R.diagram, R.diagram.selected))
					R.Actions.productAssembly.action(e, R.diagram, R.diagram.selected);
				else if (R.Actions.product.hasForm(R.diagram, R.diagram.selected))
					R.Actions.product.action(e, R.diagram, R.diagram.selected);
				else if (R.Actions.project.hasForm(R.diagram, R.diagram.selected))
					R.diagram.actionHtml(e, 'project');
			},
			ShiftKeyP(e)
			{
				if (R.Actions.coproductAssembly.hasForm(R.diagram, R.diagram.selected))
					R.Actions.coproductAssembly.action(e, R.diagram, R.diagram.selected);
				else if (R.Actions.coproduct.hasForm(R.diagram, R.diagram.selected))
					R.Actions.coproduct.action(e, R.diagram, R.diagram.selected);
				else if (R.Actions.inject.hasForm(R.diagram, R.diagram.selected))
					R.diagram.actionHtml(e, 'inject');
			},
//			ControlKeyP(e)		BROWSER RESERVED: print page
			KeyQ(e)
			{
				if (R.Actions.help.hasForm(R.diagram, R.diagram.selected))
					R.Actions.help.html(e, R.diagram, R.diagram.selected);
			},
			KeyR(e)
			{
				if (R.Actions.assyMorphism.hasForm(R.diagram, R.diagram.selected))
					R.Actions.assyMorphism.action(e, R.diagram, R.diagram.selected);
			},
//			ControlKeyS(e)		BROWSER RESERVED: save page
			KeyT(e)
			{
				D.toolbar.show();
				D.elementTool.Text.html(e);
			},
			ShiftKeyT(e)
			{
				D.toolbar.show();
				D.elementTool.Text.html(e);
//				D.toolbar.showSection('Text', 'new');
				D.elementTool.Text.showSection('new');
				D.toolbar.help.querySelector('#new-description').focus();
				e.preventDefault();
			},
//			ControlKeyT(e)		BROWSER RESERVED: open a new tab
//			ControlShiftKeyT(e)	BROWSER RESERVED: reopen last closed tab
//			ControlKeyU(e)		BROWSER RESERVED: open current page source code
			KeyV(e)
			{
				R.diagram.selected.length > 0 && R.diagram.viewElements(...R.diagram.selected);
			},
			ControlKeyV(e)	{	D.Paste(e);	},
//			ControlKeyW(e)	 BROWSER RESERVED
			KeyY(e)
			{
				if (R.Actions.morphismAssembly.hasForm(R.diagram, R.diagram.selected))
				{
					D.toolbar.show();
					R.diagram.actionHtml(e, 'morphismAssembly');
				}
			},
			ShiftKeyY(e)
			{
				if (R.Actions.morphismAssembly.hasForm(R.diagram, R.diagram.selected))
				{
					D.toolbar.show();
					R.diagram.actionHtml(e, 'morphismAssembly');
					R.Actions.morphismAssembly.action(e, R.diagram, R.diagram.selected);
				}
			},
			ControlKeyZ(e)
			{
				Cat.R.diagram.undo(e);
				e.preventDefault();
			},
			Numpad1(e) { D.panHandler(e, new D2(1, -1)); },
			Numpad2(e) { D.panHandler(e, new D2(0, -1)); },
			Numpad3(e) { D.panHandler(e, new D2(-1, -1)); },
			Numpad4(e) { D.panHandler(e, new D2(1, 0)); },
			Numpad5(e) {},
			Numpad6(e) { D.panHandler(e, new D2(-1, 0)); },
			Numpad7(e) { D.panHandler(e, new D2(1, 1)); },
			Numpad8(e) { D.panHandler(e, new D2(0, 1)); },
			Numpad9(e) { D.panHandler(e, new D2(-1, 1)); },
			PageUp(e)
			{
				if (!Cat.D.default.fullscreen && Cat.R.diagram)
				{
					const svg = Cat.R.diagram.svgRoot;
					const nxt = svg.nextSibling;
					nxt && svg.parentNode.insertBefore(nxt, svg);
				}
			},
			PageDown(e)
			{
				if (!Cat.D.default.fullscreen && Cat.R.diagram)
				{
					const svg = Cat.R.diagram.svgRoot;
					const before = svg.previousSibling;
					before && svg.parentNode.insertBefore(svg, before);
				}
			},
			Space(e)
			{
				D.toolbar.hide();
				D.startMousePan(e);
			},
			ShiftLeft(e) { D.shiftKey = true; },
			ShiftRight(e) { D.shiftKey = true; },
//			ControlTab(e)	 BROWSER RESERVED
//			ControlShiftTab(e)	 BROWSER RESERVED
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
				D.stopMousePan();
			},
		},
		writable:	true,
	},
	lastViewedDiagrams:	{value: new Map(),	writable: true},
	loginPanel:			{value: null,		writable: true},
	mouse:
	{
		value:
		{
			down:		new D2(isGUI ? window.innerWidth/2 : 500, isGUI ? window.innerHeight/2 : 500),
			onPanel:	false,			// is the mouse not on the main gui?
			xy:			[new D2()],		// in session coordinates
			clientPosition()			// return client coords
			{
				return this.xy[this.xy.length -1];
			},
			clientEvent()
			{
				const xy = D.mouse.clientPosition();
				return {clientX:xy.x, clientY:xy.y, target:{dataset:R.diagram.name}};
			},
			sessionPosition()			// return session coords
			{
				return D.userToSessionCoords(this.clientPosition());
			},
			diagramPosition(diagram)	// return diagram coords
			{
				return diagram.userToDiagramCoords(D.mouse.clientPosition());
			},
			saveClientPosition(e)
			{
				const xy = this.xy;
				const clientY = e.clientY - D.topSVG.parentElement.offsetTop;
				if (xy.length > 0 && xy[xy.length -1].x === e.clientX && xy[xy.length -1].y === clientY)
					return;
				xy.push(new D2(e.clientX, clientY));
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
	mouseIsDown:	{value: false,		writable: true},	// is the mouse key down? the onmousedown attr is not connected to mousedown or mouseup
	mouseover:		{value: null,		writable: true},
	navbar:			{value: null,		writable: true},
	openPanels:		{value: [],			writable: true},
	Panel:			{value: null,		writable: true},
	panels:			{value: null,		writable: true},
	pasteBuffer:	{value: [],			writable: true},
	ReplayCommands:	{value:	new Map(),	writable: false},
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
			ellipse:['fill', 'margin', 'stroke', 'stroke-width', 'rx', 'ry'],
			path:	['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
			text:	['fill', 'font', 'margin', 'stroke'],
		},
		writable:	false,
	},
	textDisplayLimit:	{value: 60,			writable: true},
	textSize:		{value:	new Map(),	writable: false},
	threeDPanel:	{value: null,		writable: true},
	tool:			{value: ['select'],	writable: true},
	toolbar:		{value: isGUI ? new Toolbar() : null,							writable: false},
	topSVG:			{value: isGUI ? document.getElementById('topSVG') : null,		writable: false},
	ttyPanel:		{value: null,													writable: true},
	uiSVG:			{value: isGUI ? document.getElementById('uiSVG') : null,		writable: false},
	// where a diagram is placed in the session
	placements:		{value: new Map(),												writable: false},
	version:		{value: 1,														writable: false},
	// the last viewport on a diagram in the session
	viewports:		{value: new Map(),												writable: false},
	session:		{value: null,													writable: true},
	xmlns:			{value: 'http://www.w3.org/2000/svg',							writable: false},
});

class Catalog extends DiagramTool
{
	constructor()
	{
		super('catalog', 'Catalog');
		this.catalog = document.getElementById('catalog');
		this.modeTool = H3.td('.left', {width:'33%'});
		this.closeBtn = H3.td('.right', {width:'33%'});
		this.title = H3.h1('.catalog', 'Catalog');
		this.catalog.appendChild(H3.table(H3.tr(this.modeTool, H3.td(this.title, {width:'33%'}), this.closeBtn), '##modeToolbar'));
		this.view = 'search';								// what viewing mode are we in?
		this.catalogInfo = H3.div('##catalog-info');		// info about the state of the displayed items
		this.catalog.appendChild(this.catalogInfo);
		const searchTable = this.getSearchBar();
		searchTable.classList.remove('hidden');
		const action = e => this.createDiagram();
		const inputBasenameSearch = e =>
		{
			if (D.OnEnter(e, action))
				return;
			const elt = R.$CAT.getElement(R.user.name + '/' + e.target.value);
			elt || (e.target.value !== '' && !U.isValidBasename(e.target.value)) ? e.target.classList.add('error') : e.target.classList.remove('error');
		};
		const topBar = H3.table('.w100', H3.tr(H3.td(searchTable), H3.td(
						H3.table('##catalog-diagram-new',
							H3.tr(H3.th('New diagram')),
							H3.tr(H3.td(	H3.input('##catalog-new-basename.catalog-input', {placeholder:'Base name', onkeyup:e => inputBasenameSearch(e)}),
											H3.input('##catalog-new-properName.catalog-input', {placeholder:'Proper name', onkeyup:e => Cat.D.OnEnter(e, action)}),
											H3.input('##catalog-new-description.catalog-input', {placeholder:'Description', onkeyup:e => Cat.D.OnEnter(e, action)}),
											H3.span('##catalog-select-codomain-span'),
											D.getIcon('edit', 'edit', action))),
							H3.tr(H3.td(H3.span('##catalog-new-error')))))));
		this.catalog.appendChild(topBar);
		this.catalogDisplay = H3.div('##catalog-display');		// the actual catalog display
		this.catalog.appendChild(this.catalogDisplay);
		this.diagrams = null;
		this.glowMap = new Map();
		this.imageScaleFactor = 1.1;
		this.setSearchBar();
		window.addEventListener('Login', e => D.catalog.update());
		window.addEventListener('CAT', e =>
		{
			let img = null;
			const args = e.detail;
			let div = null;
			switch(args.command)
			{
				case 'close':
					break;
				case 'delete':		// delete diagram
					R.catalog.delete(args.diagram);
					break;
				case 'upload':
					if (this.view === 'search')
					{
						img = this.catalogDisplay.querySelector(`img[data-name="${args.diagram.name}"]`);
						img && ['greenGlow', 'warningGlow'].map(glow => img.classList.remove(glow));
					}
					break;
				case 'default':
					if (this.view === 'reference')
						this.reference();
					break;
				case 'png':
					div = this.catalogDisplay.querySelector(`div[data-name="${args.diagram.name}"]`);
					div && div.replaceWith(this.display(args.diagram));
					break;
				case 'load':
					if (isGUI && e.detail.diagram)
					{
						// TODO
					}
					break;
			}
		});
		window.addEventListener('View', e =>
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'catalog':
					if (this.diagrams === null)
						this.search();
					this.updateDiagramCodomain();
					this.show();
					break;
				default:
					this.hide();
					break;
			}
		});
		window.addEventListener('Application', e =>
		{
			const args = e.detail;
			switch (args.command)
			{
				case 'start':
					this.setImageScale();
					this.updateDiagramCodomain();
					break;
			}
		});
		window.addEventListener('Diagram', e =>
		{
			const args = e.detail;
			switch (args.command)
			{
				case 'delete':
					const div = this.catalog.querySelector(`div[data-name="${args.diagram.name}"]`);
					div && div.remove();
					break;
			}
		});
	}
	updateDiagramCodomain()
	{
		const codomainElt = H3.select('##catalog-select-codomain');
		for (const [name, e] of R.$CAT.elements)
			if (e instanceof Category && !(e instanceof IndexCategory) && e.user !== 'sys')
				codomainElt.appendChild(H3.option(e.properName, {value:e.name}));
		codomainElt.appendChild(H3.option(R.Cat.properName, {value:R.Cat.name}));
		const span = document.getElementById('catalog-select-codomain-span');
		D.RemoveChildren(span);
		span.appendChild(codomainElt);
	}
	setImageScale()
	{
		this.catalogDisplay.style.gridTemplateColumns = `repeat(auto-fill, minmax(${D.default.diagram.imageScale * 330}px, 1fr))`;
		this.catalogDisplay.style.gridTemplateRows = `repeat(auto-fill, minmax(${D.default.diagram.imageScale * 360}px, 1fr))`;
	}
	html()
	{
		this.reset();
		this.addNewSection();
		const onkeyup = e =>
		{
			this.filter = document.getElementById(`${this.type}-search-filter`).value;
			this.search();
		};
		this.resetFilter();
		this.setSearchBar();
		this.search();
	}
	//
	// methods from DiagramTool
	//
	getRows(tbl, elements)
	{
		elements.map(diagram => this.display(diagram));
	}
	clearSearch()
	{
		D.RemoveChildren(this.catalogDisplay);
	}
	//
	// methods
	//
	clear()
	{
		D.RemoveChildren(this.catalogInfo);
		D.RemoveChildren(this.modeTool);
		D.RemoveChildren(this.closeBtn);
		this.clearSearch();
	}
	display(info)
	{
		const args =
		{
			onclick:_ =>
			{
				D.EmitViewEvent('diagram');
				D.setFullscreen(true, false);
				R.SelectDiagram(info.name, 'view');
			},
			style:			'cursor:pointer; transition:0.5s; height:auto; width:100%',
			'data-name':	info.name,
		};
		const img = D.GetImageElement(info.name, args);
		this.glowMap.has(info.name) && img.classList.add(this.glowMap.get(info.name));
		const toolbar = H3.table('.verticalTools');
		toolbar.onmouseenter = e => {toolbar.style.opacity = 100;};
		toolbar.onmouseleave = e => {toolbar.style.opacity = 0;};
		const imgDiv = H3.div({style:'position:relative;'}, img, toolbar);
		const div = H3.div('.catalogEntry', {'data-name':info.name},
			H3.table(
			[
				H3.tr(H3.td('.imageBackground', {colspan:2}, imgDiv)),
				H3.tr(H3.td(D.getDiagramHtml(info))),
			], '.smallTable'));
		if (this.view !== 'reference')
		{
			let listener = null;
			img.onmouseenter = evnt =>
			{
				const showToolbar = e =>
				{
					D.RemoveChildren(toolbar);
					this.getButtons(info).map(btn => toolbar.appendChild(H3.tr(H3.td(btn))));
					toolbar.style.opacity = 100;
					listener = e =>
					{
						const args = e.detail;
						const diagram = args.diagram;
						switch(args.command)
						{
							case 'upload':
								window.removeEventListener('CAT', listener);
								showToolbar(e);
								break;
						}
					};
					window.addEventListener('CAT', listener);
				};
				showToolbar(evnt);
			};
			img.onmouseleave = e =>
			{
				toolbar.style.opacity = 0;
				window.removeEventListener('CAT', listener);
			};
		}
		else	// reference view
		{
			img.onmouseenter = e =>
			{
				R.catalog.get(e.target.dataset.name).references.map(refName => this.catalog.querySelector(`img[data-name="${refName}"]`).classList.add('glow'));
				toolbar.classList.remove('hidden');
			};
			img.onmouseleave = e =>
			{
				R.catalog.get(e.target.dataset.name).references.map(refName => this.catalog.querySelector(`img[data-name="${refName}"]`).classList.remove('glow'));
				toolbar.classList.add('hidden');
			};
		}
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
		R.catalog.forEach((info, name) => info.localTimestamp > 0 && name.includes(val) && this.diagrams.push(info));
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
	reference()
	{
		this.clear();
		this.view = 'reference';
		this.title.innerHTML = `References for ${U.HtmlSafe(R.diagram.name)}`;
		this.doLookup();
		D.EmitViewEvent('catalog');
	}
	outOfDateGlow()
	{
		D.RemoveChildren(this.catalogInfo);
		this.glowMap = new Map();
		const status = {hasWarningGlow:false, hasGreenGlow:false};
		this.diagrams.forEach(info =>
		{
			if (info.timestamp > 0)
			{
				if (info.timestamp > info.cloudTimestamp)
				{
					this.glowMap.set(info.name, 'greenGlow');
					status.hasGreenGlow = true;
				}
				if (info.timestamp < info.cloudTimestamp)
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
		D.EmitViewEvent('catalog');
	}
	show(visible = true)
	{
		if (visible)
			this.catalog.classList.remove('hidden');
		else
			this.hide();
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
		this.clearSearch();
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
			this.closeBtn.appendChild(D.getIcon('closeCatalog', 'close', e => D.EmitViewEvent('diagram', R.diagram), 'Close catalog'));
		this.setSearchBar();
	}
	filter(diagram)
	{
		if (diagram.user === 'sys')
			return false;
		return true;
	}
	onwheel(e)
	{
		const imgs = [...this.catalogDisplay.querySelectorAll('img')];
		const dir = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY)));
		const nuScale = dir === 1 ? this.imageScaleFactor : 1 / this.imageScaleFactor;
		D.default.diagram.imageScale = D.default.diagram.imageScale * nuScale;
		D.default.diagram.imageScale = D.default.diagram.imageScale * nuScale;
		this.setImageScale();
		R.SaveDefaults();
	}
	hide()
	{
		this.catalog.classList.add('hidden');
	}
	createDiagram()
	{
		const errorElt = document.getElementById('catalog-new-error');
		D.RemoveChildren(errorElt);
		const basenameElt = document.getElementById('catalog-new-basename');
		const properNameElt = document.getElementById('catalog-new-properName');
		const descriptionElt = document.getElementById('catalog-new-description');
		const codomainElt = document.getElementById('catalog-select-codomain');
		const diagram = R.createDiagram(codomainElt.value, basenameElt.value, properNameElt.value, descriptionElt.value);
		if (diagram instanceof Diagram)
		{
			[basenameElt, properNameElt, descriptionElt].map(elt => elt.value = '');
			diagram.setPlacement({x:0, y:-100, scale:0.5});
			diagram.placeText(diagram.properName, {x:0, y:0}, D.default.title.height, D.default.title.weight);
			diagram.description !== '' && diagram.placeText(diagram.description, {x:0, y:D.gridSize()}, D.default.font.height);
			R.SelectDiagram(diagram);
		}
		else
			errorElt.innerHTML = U.HtmlSafe(diagram);
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
		this.elt = H3.button(U.HtmlEntitySafe(title), {title:tip, onclick:e => this.toggle()}, '.sidenavAccordion');
		parent.appendChild(this.elt);
		this.section = H3.div({id}, '.section');
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

class ThreeDPanel extends Panel
{
	constructor()
	{
		super('threeD');
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
		this.elt.appendChild(H3.table('.buttonBarRight', H3.tr(H3.td(
			D.getIcon('threeDClear', 'delete', e => Cat.D.threeDPanel.initialize(), 'Clear display'),
			D.getIcon('threeDLeft', 'threeD_left', e => Cat.D.threeDPanel.view('left'), 'Left'),
			D.getIcon('threeDtop', 'threeD_top', e => Cat.D.threeDPanel.view('top'), 'Top'),
			D.getIcon('threeDback', 'threeD_back', e => Cat.D.threeDPanel.view('back'), 'Back'),
			D.getIcon('threeDright', 'threeD_right', e => Cat.D.threeDPanel.view('right'), 'Right'),
			D.getIcon('threeDbotom', 'threeD_bottom', e => Cat.D.threeDPanel.view('bottom'), 'Bottom'),
			D.getIcon('threeDfront', 'threeD_front', e => Cat.D.threeDPanel.view('front'), 'Front'),
			this.closeBtnCell(),
			this.expandPanelBtn()
		))));
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
		const div = H3.div(H3.table(H3.tr(H3.td('.buttonBarRight', D.getIcon('logClear', 'delete', _ => Cat.R.diagram.clearLog(), 'Clear log'),
												D.getIcon('log', 'download-log', _ => Cat.R.diagram.downloadLog(), 'Download log')))), H3.hr());
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
				this.logElt = H3.div();
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
		this.logElt && this.logElt.appendChild(H3.p(U.prettifyCommand(args)));
	}
	antilog(args)	// TODO
	{
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
		super('tty');
		const elements = [
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn())), '.buttonBarRight'),
			H3.h3('TTY'),
			H3.button('Output', '.sidenavAccordion', {title:'TTY output from some composite', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'tty-out-section')}),
			H3.div(H3.table(H3.tr(H3.td(	D.getIcon('ttyClear', 'delete', _ => D.RemoveChildren(this.out), 'Clear output'),
											D.getIcon('log', 'download-log', e => Cat.D.DownloadString(this.out.innerHTML, 'text', 'console.log'), 'Download tty log file'), '.buttonBarRight'))),
				H3.pre('##tty-out.tty'), '##tty-out-section.section'),
			H3.button('Errors', '.sidenavAccordion', {title:'Errors from some action', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'tty-error-section')}),
			H3.div(H3.table(H3.tr(H3.td(	D.getIcon('ttyErrorClear', 'delete', _ => D.RemoveChildren(this.error)),
											D.getIcon('error', 'download-error', e => Cat.D.DownloadString(this.error.innerHTML, 'text', 'console.err'), 'Download error log file'), '.buttonBarRight'))),
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

class HelpPanel extends Panel
{
	constructor()
	{
		super('help');
		const date = '04/11/2021 00:00:01 AM';
		// TODO move to pdf
		const elements = [
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn())), '.buttonBarRight'),
			H3.h3('Catecon'),
			H3.h4('The Categorical Console'),
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
			H3.small('&copy;2018-2021 Harry Dole'),
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
		super('login');
		this.userNameElt = H3.span('##user-name.smallBold');
		this.userEmailElt = H3.span('##user-email.smallBold');
		this.permissionsElt = H3.span('##login-permission.smallBold');
		this.loginInfoElt = H3.div('##login-info');
		this.errorElt = H3.span('##login-error.error');
		this.elt.appendChild(H3.div(	H3.table(H3.tr(H3.td(this.closeBtnCell())), '.buttonBarRight'),
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

class SettingsPanel extends Panel
{
	constructor()
	{
		super('settings');
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
									H3.td('Snap objects to a grid.', '.left')),
							H3.tr(	H3.td(debugChkbox),
									H3.td('Debug', '.left')),
							H3.tr(	H3.td(showEventsChkbox),
									H3.td('Show events on console', '.left'))];
		const elts =
		[
			H3.table(H3.tr(H3.td(this.closeBtnCell())), '.buttonBarRight'),
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
			else if (msg.data.command === 'LoadDiagrams')
				R.workers.equality.postMessage({command:'Info'});
		});
		window.addEventListener('Login', _ => this.update());
	}
	update()
	{
		if (R.user.cloud && R.user.cloud.permissions.includes('admin'))
		{
			const tbl = this.elt.querySelector('#settings-table');
			tbl.appendChild(H3.tr(	H3.td(H3.button('Update Reference Counts', '.textButton', {onclick:_ => Cat.R.updateRefcnts()}), {colspan:2})));
			tbl.appendChild(H3.tr(	H3.td(H3.button('Rewrite diagrams', '.textButton', {onclick:_ => Cat.R.rewriteDiagrams()}), {colspan:2})));
		}
		this.defaultsElt = document.getElementById('settings-defaults');
		D.RemoveChildren(this.defaultsElt);
		this.defaultsElt.appendChild(H3.button('Reset Defaults', '.textButton', {onclick:_ => Cat.D.resetDefaults()}));
		D.Pretty(D.default, this.defaultsElt);
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
		if (!(this instanceof Diagram) && !(this instanceof Category))
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
		this.signature = this.getSignature();
	}
	editText(e, attribute, value)
	{
		let old = this[attribute];
		if (attribute === 'basename')	// also changes name and properName
		{
			if (!U.isValidBasename(value))
				throw 'invalid name';
			if (this.diagram.elements.has(value) && this !== this.diagram.elements.get(value))
				throw 'base name already taken';
		}
		this[attribute] = U.HtmlEntitySafe(value);
		if (attribute === 'basename')
		{
			this.name = Element.Codename(this.diagram, {basename:this.basename});
			this.signature = this.getSignature();
			this.diagram.reconstituteElements();
		}
		else if (attribute === 'properName')
			this.diagram.updateProperName(this);
		return old;
	}
	updateProperName()
	{}
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
				case 'Diagram':
				case 'Morphism':
				case 'FiniteObject':
				case 'Category':
				case 'NamedObject':
				case 'NamedMorphism':
					const sz = Cat.D.default.button.small;
					baseBtn = this.refcnt <= 1 ? D.getIcon('elt-edit-basename', 'edit', e => Cat.R.diagram.editElementText(e, this, id, 'basename'), 'Edit', sz) : '';
					descBtn = D.getIcon('elt-edit-description', 'edit', e => Cat.R.diagram.editElementText(e, this, id, 'description'), 'Edit', sz);
					pNameBtn = this.canChangeProperName() ? D.getIcon('elt-edit-propername', 'edit', e => Cat.R.diagram.editElementText(e, this, id, 'properName'), 'Edit', sz) : '';
					break;
			}
		}
		return H3.table(H3.tr(H3.th(H3.tag('proper-name', this.properName), pNameBtn, {colspan:2})),
						H3.tr(H3.td('Base name:', '.left'), H3.td(H3.tag('basename', this.basename), baseBtn, '.left')),
						H3.tr(H3.td('Description:', '.left'), H3.td(H3.tag('description', this.description), descBtn, '.left')),
						H3.tr(H3.td('Type:', '.left'), H3.td(U.Cap(U.DeCamel(this.constructor.name)), '.left')),
						H3.tr(H3.td('Category:', '.left'), H3.td(this.diagram ? this.category.properName : '', '.left')),
						H3.tr(H3.td('Diagram:', '.left'), H3.td(this.diagram ? this.diagram.properName : '', '.left')),
						H3.tr(H3.td('User:', '.left'), H3.td(this.diagram ? this.diagram.user : '', '.left')), {id});
	}
	//
	// can only edit the current diagram
	//
	isEditable()
	{
		const writable = 'readonly' in this ? !this.readonly : true;
		if (this instanceof Diagram)
			return writable && (this.user === R.user.name || R.user.isAdmin());
		else
			return R.diagram && this.diagram && (R.diagram.name === this.diagram.name || R.diagram.name === this.name) && writable && (this.diagram.user === R.user.name || R.user.isAdmin());
	}
	isIterable()
	{
		return false;		// fitb
	}
	getSignature()
	{
		return U.Sig(this.name);
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
		if (this.properName !== this.basename)
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
		return JSON.stringify(this.json(), null, 2);
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
			this.svg.remove();
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
			state && this.svg.classList.add(glow);
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
	emphasis(on)					{ D.SetClass('emphasis', on, this.svg.querySelector('text')); }
	find(elt, index = [])			{ return elt === this ? index : []; }
	basic()							{ return 'base' in this ? this.base : this; }
	getBase()						{ return this; }
	basenameIncludes(val)			{ return this.basename.includes(val); }
	refName(diagram, old = false)
	{
		if (old)
			return this.name;
		else
			return this.diagram.name === diagram.name ? this.basename : this.name;
	}
	getButtons()
	{
		const buttons = [];
		return buttons;
	}
	getHtmlRow()
	{
		const html = this.getHtmlRep();
		html.classList.add('element');
		const tools = H3.span('.tool-entry-actions');
		html.appendChild(tools);
		const buttons = this.getButtons();
		buttons.map(btn => tools.appendChild(btn));
		const actions =
		{
			onclick:		e => Cat.R.diagram.placeElement(this, D.mouse.diagramPosition(R.diagram)),
			onmouseenter:	e => R.diagram.emphasis(this, true),
			onmouseleave:	e => R.diagram.emphasis(this, false),
		};
		return H3.tr(H3.td(html, '.clickable'), actions);
	}
	mouseenter(e)
	{
		D.mouseover = this;
		this.description !== '' && D.statusbar.show(e, this.description);
		this.emphasis(true);
	}
	mouseout(e)
	{
		if (D.mouseover === this)
		{
			D.mouseover = null;
			this.emphasis(false);
		}
	}
	mouseover(e)
	{
		D.mouseover = this;
		this.description !== '' && D.statusbar.show(e, this.description);
		this.emphasis(true);
	}
	getFactor(factor)
	{
		return this;
	}
	static Basename(diagram, args)	{ return args.basename; }
	static Codename(diagram, args)	{ return `${diagram ? diagram.name : 'sys'}/${args.basename}`; }
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
		if ('name' in args)
			this.name = args.name;
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
		if (typeof indices === 'number')
			return this.graphs[indices];
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
					U.HasFactor(nuLinks, glnk) === -1 && nuLinks.push(glnk);
					U.HasFactor(links, glnk) === -1 && links.push(glnk);
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
			this.graphs.map((g, i) => g.traceLinks(top, U.pushFactor(ndx, i)));
	}
	funLinks(top, doLeaf, doit, ndx = [])
	{
		if (this.isLeaf() && doLeaf(this, ndx))		// links are at the leaves of the graph
		{
			doit(this, ndx);
			const links = this.links.slice();
			this.visited = new Set();
			while(links.length > 0)
			{
				const lnk = links.pop();
				if (ndx.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
					continue;
				if (this.visited.has(lnk.toString()))
					continue;
				const g = top.getFactor(lnk);
				doit(g, lnk);
				for (let j=0; j<g.links.length; ++j)
				{
					const glnk = g.links[j];
					if (this.visited.has(glnk.toString()))
						continue;
					const lnkFactor = top.getFactor(glnk);
					doLeaf(lnkFactor, glnk) && doit(lnkFactor, glnk);
				}
				this.visited.add(lnk.toString());
			}
		}
		else
			this.graphs.map((g, i) => g.funLinks(top, doLeaf, doit, U.pushFactor(ndx, i)));
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
					color = data.color;
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
		const g = H3.g({id, onmouseenter:e => Cat.R.diagram.emphasis(sig, true), onmouseleave:e => Cat.R.diagram.emphasis(sig, false), onmousedown:e => Cat.R.diagram.userSelectElement(e, sig)});
		node.appendChild(g);
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
		this.constructor.name === 'CatObject' && D.EmitElementEvent(diagram, 'new', this);
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
		return new Graph(this.diagram, {position, width, name:this.name});
	}
	getFactorProperName(indices)
	{
		return this.properName;
	}
	isTerminal() { return false; }		// fitb
	isInitial() { return false; }
	getSize() { return Number.MAX_VALUE; }
	getHtmlRep(idPrefix)
	{
		const id = this.elementId(idPrefix);
		const items = [];
		items.push( this.properName !== '' && this.properName !== this.basename ? H3.span(this.properName, '.bold') : H3.span(this.basename, '.bold'));
		if (this.description !== '')
			items.push(H3.span(this.description, '.smallPrint.italic'));
		items.push(H3.br(), H3.span(this.name, '.tinyPrint'));
		return H3.div({id}, items);
	}
	uses(obj)		// True if the given object is used in the construction of this object somehow or identical to it
	{
		return this.isEquivalent(obj);
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
		D.EmitElementEvent(diagram, 'new', this);
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
		delete a.basename;
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
		return `${f.properName}&#8202;${U.subscript(indices)}`;
	}
	needsParens()
	{
		return true;
	}
	getGraph(tag, data, parenWidth, sepWidth, first = true)	// data: {position: 0}
	{
		const doit = !first && this.needsParens();
		const pw = doit ? parenWidth : 0;
		const position = data.position;
		data.position += pw;
		const cap = this.objects.length - 1;
		const graphs = this.objects.map((o, i) =>
			{
				const g = o.getGraph(data);
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
	updateProperName()
	{
		this.objects.map(o => o.updateProperName());
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
	usesDiagram(diagram)
	{
		for (let i=0; i<this.objects.length; ++i)
			if (this.objects[i].usesDiagram(diagram))
				return true;
		return false;
	}
	uses(obj, start = true)
	{
		if (!start && this.isEquivalent(obj))
			return true;
		for (let i=0; i<this.objects.length; ++i)
			if (this.objects[i].uses(obj, false))
				return true;
		return false;
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
		super(diagram, nuArgs);
		this.constructor.name === 'ProductObject' && D.EmitElementEvent(diagram, 'new', this);
		this.signature = ProductObject.Signature(diagram, this.objects, this.dual);
	}
	json()
	{
		const a = super.json();
		delete a.description;		// TODO remove after all diagrams updated
		return a;
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
		if ('dual' in data && this.dual !== data.dual)	// TODO ????
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
	updateProperName()
	{
		super.updateProperName();
		this.properName = MultiObject.ProperName(this.dual ? '&plus;' : '&times;', this.objects);
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		const basename = `${c}Po{${args.objects.map(o => typeof o === 'string' ? o : o.refName(diagram)).join(',')}}oP${c}`;
		return basename;
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
		return obj.getBase() instanceof ProductObject;
	}
	static Signature(diagram, objects, dual = false)
	{
		return U.SigArray([dual, ...objects.map(o => o.signature)]);
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
		D.EmitElementEvent(diagram, 'new', this);
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
	loadItem()
	{
		for (let i=1; i<this.cone.length; ++i)
		{
			const base = [this.diagram.getElement(this.cone[0]), this.morphisms[0]];
			const leg = [this.diagram.getElement(this.cone[i]), this.morphisms[i]];
			R.LoadItem(this.diagram, this, base, leg);
		}
	}
	getDecoration()
	{
		return '&#8991;';
	}
	static Basename(diagram, args)
	{
		const basename = `Pb{${args.morphisms.map(m => m.refName(diagram)).join(',')}}bP`;
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
		D.EmitElementEvent(diagram, 'new', this);
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
		const g = super.getGraph(this.constructor.name, data, 0, D.commaWidth, false);
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
	updateProperName()
	{
		super.updateProperName();
		this.properName = HomObject.ProperName(this.objects);
	}
	static Basename(diagram, args)
	{
		const basename = `Ho{${args.objects.map(o => typeof o === 'string' ? o : o.refName(diagram)).join(',')}}oH`;
		return basename;
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

class DiagramCore		// only used by class Cell
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
		this.refcnt <= 0 && this.svg !== null && this.svg.remove();
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
		!this.svg && this.getSVG(this.diagram.svgBase);
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
		!this.svg && this.getSVG(this.diagram.svgBase);
		this.svg.classList.remove(...['glow', 'badGlow']);
		state && this.svg.classList.add(glow);
	}
	emphasis(on)
	{
		!this.svg && this.getSVG(this.diagram.svgBase);
		D.SetClass('emphasis', on, this.svg);
	}
	isEditable()
	{
		return R.diagram && this.diagram && R.diagram.name === this.diagram.name && (this.diagram.user === R.user.name || R.user.isAdmin());
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
		D.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		const canEdit = this.isEditable() && this.diagram.isEditable();
		const id = this.elementId();
		const div = H3.div({id}, H3.tag('description', this.description, '##descriptionElt.tty'));
		if (canEdit)
		{
			div.appendChild(D.getIcon('EditElementText', 'edit', e => Cat.R.diagram.editElementText(e, this, id, 'description'), 'Commit editing', D.default.button.tiny));
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
				H3.tr(H3.td('Text height:'), H3.td(H3.input(`##${inId}.in100`, inputArgs)),
				H3.tr(H3.td('Text weight:'), H3.td(selectWeight)))));
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
	lineDeltaY()
	{
		return '1.2em';
	}
	tspan()
	{
		const wrapTspan = (t, i) =>
		{
			return `<tspan text-anchor="left" x="0"${i > 0 ? ' dy='+this.lineDeltaY() : ''}>${t === '' ? '&ZeroWidthSpace;' : t}</tspan>`;
		};
		const procText = (txt, i) =>
		{
			if (txt === '')
				return wrapTspan('&ZeroWidthSpace;', i);
			const tx = txt.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
			return wrapTspan(tx, i);
		};
		return this.description.includes('\n') ? this.description.split('\n').map((t, i) => procText(t, i)).join('') : this.description;
	}
	ssStyle()
	{
		return `font-family:"Fira Sans",sans-serif;font-size:${this.height}px; font-weight:${this.weight}`;
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const svgText = H3.text(this.isEditable ? '.grabbable' : null, {'text-anchor':'left', style:this.ssStyle(), ondblclick:e => this.textEditor()});
		const svg = H3.g('.diagramText', {'data-type':'text', 'data-name':name, 'text-anchor':'left', id:this.elementId(),
			transform:`translate(${this.x} ${this.y + D.default.font.height/2})`}, svgText);
		svg.onmousedown = e => this.diagram.userSelectElement(e, name);
		svg.onmouseenter = e => this.mouseenter(e);
		svg.onmouseout = e => this.mouseout(e);
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
			this.svg !== null && this.svg.remove();
			this.category && this.diagram.domain.deleteElement(this);
		}
	}
	setXY(xy, majorGrid = false)
	{
		this.x = D.Grid(xy.x, majorGrid);
		this.y = D.Grid(xy.y, majorGrid);
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
	update(xy = null, majorGrid = false)
	{
		this.setXY(xy ? xy : this.getXY(), majorGrid);
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
	getHtmlRep(idPrefix)
	{
		const id = this.elementId(idPrefix);
		const div = H3.div(H3.tag('description', this.description), {id});
		div.onmouseenter = _ => Cat.R.diagram.emphasis(this.name, true);
		div.onmouseleave = _ => Cat.R.diagram.emphasis(this.name, false);
		return div;
	}
	textEditor()
	{
		D.toolbar.hide();
		D.closeActiveTextEdit();
		const bbox = this.svgText.getBBox();
		this.svgText.classList.add('hidden');
		const hidden = H3.div(this.description, '.text-editor', {style:`font-size:${this.height}px; font-weight:${this.weight}`});
		hidden.style.visibility = 'visible';
		hidden.style.display = 'none';
		hidden.style.whiteSpace = 'pre-wrap';
		hidden.style.wordWrap = 'break-word';
		document.body.appendChild(hidden);
		const div = H3.div('##foreign-text.text-editor', this.description,
		{
	
			style:`${this.ssStyle()}; line-height:${this.lineDeltaY()}; white-space:pre-wrap; word-wrap: break-word; width: fit-content;`,
			contentEditable:true,
		});
		div.addEventListener('mousedown', e => e.stopPropagation());
		const foreign = H3.foreignObject(div, {width:bbox.width + 'px', height:bbox.height + 'px', y:`-${this.height}px`});
		const onkeydown = e =>
		{
			hidden.innerHTML = div.innerHTML;
			hidden.style.visibility = 'hidden';
			hidden.style.display = 'block';
			hidden.style.width = 'fit-content';
			foreign.style.width = (32 + hidden.offsetWidth) + 'px';
			foreign.style.height = hidden.offsetHeight + 'px';
			if (e.key === 'Escape')
				D.closeActiveTextEdit();
			e.stopPropagation();
		};
		this.svgText.parentNode.appendChild(foreign);
		div.focus();
		const onfocusout = e =>
		{
			const text = e.target.innerText;
			div.removeEventListener('focusout', onfocusout);	// avoid calling this function again
			if (text !== this.description)
				R.diagram.commitElementText(e, this.name, e.target, 'description');
			foreign.parentNode && foreign.remove();		// do not do this earlier or the textbox gets corrupted
			D.closeActiveTextEdit();
			this.svgText.classList.remove('hidden');
			hidden.remove();
		};
		div.addEventListener('focusout', onfocusout);
		div.onfocusout = onfocusout;	// do this to get to the handler
		div.addEventListener('keydown', onkeydown);
		div.addEventListener('keyup', onkeydown);
		D.editElement = div;
	}
	mouseenter(e)
	{
		D.mouseover = this;
		this.emphasis(true);
	}
	static UpdateHeight(name, height)
	{
		const text = R.diagram.getElement(name);
		text.height = height;
		text.update();
		D.EmitTextEvent(R.diagram, 'update', text);
	}
	static UpdateWeight(name, weight)
	{
		const text = R.diagram.getElement(name);
		text.weight = weight;
		text.update();
		D.EmitTextEvent(R.diagram, 'update', text);
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
		D.EmitElementEvent(diagram, 'new', this);
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
		const basename = `Po{${args.objects.map(o => typeof o === 'string' ? o : o.refName(diagram)).join(',')}}oP`;
		return basename;
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
			x:			{value:	xy.x,				writable:	true},
			y:			{value:	xy.y,				writable:	true},
			orig:		{value:	{x:xy.x, y:xy.y},	writable:	true},
			width:		{value:	0,					writable:	true},
			height:		{value:	0,					writable:	true},
			to:			{value:	null,				writable:	true},
			nodes:		{value:	new Set(),			writable:	false},
			domains:	{value:	new Set(),			writable:	false},
			codomains:	{value:	new Set(),			writable:	false},
			svg:		{value: null,				writable:	true},
		});
		this.setObject(nuArgs.to);
		this.constructor.name === 'DiagramObject' && D.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return this.to.help();
	}
	json()
	{
		let a = super.json();
		a.to = this.to ? this.to.name : null;
		a.xy = this.getXY();
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
		this.width = D.textWidth(to.properName);		// TODO width still used?
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
	setXY(xy, majorGrid = false)
	{
		this.x = D.Grid(xy.x, majorGrid);
		this.y = D.Grid(xy.y, majorGrid);
	}
	getBBox()
	{
		const bbox = this.svg.getBBox();
		bbox.x += this.x;
		bbox.y += this.y;
		return bbox;
	}
	mouseout(e)
	{
		super.mouseout(e);
		this.svg.querySelectorAll('rect').forEach(rect => rect.remove());
	}
	getMouseFactor(e)
	{
		this.svg.querySelectorAll('rect').forEach(rect => rect.remove());
		const graph = this.to.getGraph();
		const xy = this.diagram.userToDiagramCoords({x:e.clientX, y:e.clientY}).subtract(this.getXY()).add({x:graph.width/2, y:0});
		let pos = 0;
		let factor = -1;
		let g = null;
		for (let i=0; i<graph.graphs.length; ++i)
		{
			g = graph.graphs[i];
			if (xy.x >= g.position && xy.x <= g.position + g.width)
			{
				factor = i;
				break;
			}
		}
		return {factor, graph};
	}
	mousemove(e)
	{
		const args = {x:0, y:-D.default.font.height/2, width:0, height:1.25 * D.default.font.height};
		if ('objects' in this.to)
		{
			const result = this.getMouseFactor(e);
			if (result.factor >= 0)
			{
				const g = result.graph.graphs[result.factor];
				args.x = g.position - result.graph.width/2;
				args.width = g.width;
			}
			else
			{
				args.x = - result.graph.width/2;
				args.width = result.graph.width;
			}
		}
		else
		{
			const graph = this.to.getGraph();
			args.x = - graph.width/2;
			args.width = graph.width;
		}
		this.svg.appendChild(H3.rect('.emphasis', args));
	}
	placeProjection(e)		// or injection
	{
		if (this.to instanceof ProductObject)
		{
			const result = this.getMouseFactor(e);
			if (result.factor > -1)
			{
				const morphism = this.to.dual ? R.diagram.cofctr(this.to, [result.factor]) : R.diagram.fctr(this.to, [result.factor]);
				this.diagram.placeMorphismByObject(e, this.to.dual ? 'codomain' : 'domain', this, morphism);
				return;
			}
		}
		this.diagram.placeMorphismByObject(e, e.shiftKey ? 'codomain' : 'domain', this, this.diagram.id(this.to));
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const txt = H3.text(this.to.properName, {'text-anchor':'middle', y:D.default.font.height/2});
		const svg = H3.g(txt, '.grabbable.object', {draggable:true, transform:`translate(${this.x}, ${this.y})`, 'data-type':'object', 'data-name':this.name, id:this.elementId()});
		svg.onmouseenter = e => this.mouseenter(e);
		svg.onmouseout = e => this.mouseout(e);
		svg.onmousedown = e => D.default.fullscreen && R.diagram && R.diagram.userSelectElement(e, name);
		svg.onmousemove = e => this.mousemove(e);
		svg.ondblclick = e => this.placeProjection(e);
		node.appendChild(svg);
		this.svg = svg;
	}
	update(xy = null, majorGrid = false)
	{
		xy && this.setXY(xy, majorGrid);
		if (!this.svg)
			this.diagram.addSVG(this);
		const svg = this.svg;
		if (svg && svg.hasAttribute('transform'))
			svg.setAttribute('transform', `translate(${this.x}, ${this.y})`);
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
			isId = Morphism.isIdentity([...this.codomains][0].to);
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
	updateProperName()
	{
		const text = this.svg.querySelector('text');
		text.innerHTML = this.to.properName;
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
		D.EmitElementEvent(diagram, 'new', this);
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
if (typeof args.cell === 'string')		// TODO remove
{
args.signature = args.cell;
delete args.cell;
console.log('fixup in diagram', diagram.name);
}
		const nuArgs = U.Clone(args);
		let idx = 0;
		let name = `a_0`;
		if (!('basename' in nuArgs))
		{
			while(diagram.assertions.has(Element.Codename(diagram, {basename:`a_${idx++}`})));
			nuArgs.basename = `a_${--idx}`;
		}
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			left:			{value: null,								writable:true},
			right:			{value: null,								writable:true},
			cell:			{value: null,								writable:true},
			equal:			{value: U.GetArg(nuArgs, 'equal', true),	writable:false},
			signature:		{value: nuArgs.signature,					writable:true},
		});
		this.incrRefcnt();		// nothing refers to them, so increment
		diagram.assertions.set(this.name, this);
		diagram.addElement(this);
		D.EmitElementEvent(diagram, 'new', this);
	}
	initialize()
	{
		let cell = null;
		if (this.cell instanceof Cell)
			cell = this.cell;
		else
		{
			cell = this.diagram.domain.cells.get(this.signature);
			this.cell = cell;
		}
		if (this.left === null)
		{
			this.left = cell.left;
			this.right = cell.right;
		}
		this.signature = Cell.Signature(this.left, this.right);
		cell.setCommutes('assertion');
		this.signature = cell.signature;
		cell.left.map(m => m.incrRefcnt());
		cell.right.map(m => m.incrRefcnt());
		this.description = `The assertion that the composite of morphisms ${cell.left.map(m => m.to.properName).join()} equals that of ${cell.right.map(m => m.to.properName).join()}.`;
		this.setCell(cell);
		this.loadItem();
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.cell.left.map(m => m.decrRefcnt());
			this.cell.right.map(m => m.decrRefcnt());
			this.cell.assertion = null;
			this.cell.setCommutes('unknown');
			this.diagram.domain.deleteElement(this);
			this.removeItem();
			this.diagram.assertions.delete(this.name);
			D.EmitAssertionEvent(this.diagram, 'delete', this);
		}
	}
	json()
	{
		const a = super.json();
		a.signature = this.signature;
		a.equal = this.equal;
		a.left = this.left.map(m => m.name);
		a.right = this.right.map(m => m.name);
		return a;
	}
	showSelected(state = true)
	{
		if (this.cell.svg)
		{
			this.cell.svg.classList[state ? 'add' : 'remove']('selected');
			this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.cell.svg);
		}
	}
	canSave()
	{
		return true;
	}
	loadItem()
	{
		R.LoadItem(this.diagram, this.cell, this.cell.left.map(m => m.to), this.cell.right.map(m => m.to), this.equal);
	}
	removeItem()
	{
		R.RemoveEquivalences(this.diagram, this.cell.name);
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
		cell.assertion = this;
		this.cell = cell;
		if (isGUI)
		{
			cell.removeSVG();
			this.diagram.svgBase && cell.getSVG(this.diagram.svgBase);
		}
	}
	getXY()
	{
		return this.cell.getXY();
	}
	getBBox()
	{
		return this.cell.getBBox();
	}
	// get the two legs from a given (presumably selected) array
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
		D.EmitCellEvent(diagram, 'check');
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
			D.toolbar.error.classList.add('error');
			D.toolbar.error.innerHTML = 'Error ' + U.GetError(x);
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
			D.EmitCellEvent(diagram, 'check');
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
		D.RemoveChildren(D.toolbar.help);
		const action = e => this.create(e);
		const elements = [
			H3.h5('Create Named Element'),
			H3.table(H3.tr(H3.td(H3.input('##named-element-new-basename', {placeholder:'Base name', onkeyup:e => D.inputBasenameSearch(e, diagram, action)}))),
					H3.tr(H3.td(H3.input('##named-element-new-properName', {placeholder:'Proper name'}))),
					H3.tr(H3.td(H3.input('##named-element-new-description.in100', {type:'text', placeholder:'Description'})))),
			D.getIcon('namedElement', 'edit', e => this.create(e), 'Create named element')];
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
		const elts = ary.slice();
		const copied = elts.map(from =>
		{
			let args = {};
			if (from instanceof DiagramMorphism)
			{
				const domxy = diagram.findEmptySpot(from.domain.getXY());
				const codxy = diagram.findEmptySpot(from.codomain.getXY());
				args = {command: 'copy', source:from.to, domxy, codxy};
			}
			else if (from instanceof DiagramObject)
			{
				const xy = diagram.findEmptySpot(from.getXY());
				args = {command: 'copy', source:from.to, xy};
			}
			else if (from instanceof DiagramText)
			{
				const xy = diagram.findEmptySpot(from.getXY());
				args = {command: 'copy', source:from.description, xy, height:from.height, weight:from.weight};
			}
			const elt = this.doit(e, diagram, args);
			args.source = args.source.name;
			diagram.log(args);
			diagram.antilog({command:'delete', elements:[elt.name]});
			return elt;
		});
		diagram.makeSelected(...copied);
		D.EmitCellEvent(diagram, 'check');
	}
	doit(e, diagram, args)
	{
		const source = args.source;
		if (source instanceof Morphism)
			return diagram.placeMorphism(source, args.domxy, args.codxy, false);
		else if (source instanceof CatObject)
			return diagram.placeObject(source, args.xy, false);
		else if (typeof source === 'string')
			return diagram.placeText(source, args.xy, args.height, args.weight, false);
	}
	replay(e, diagram, args)
	{
		const source = diagram.getElement(args.source);
		this.doit(e, diagram, args);
	}
	hasForm(diagram, ary)	// one element
	{
		return diagram.isEditable() && ary.length > 0 && ary.filter(elt => elt instanceof Cell).length === 0;
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
		D.EmitElementEvent(diagram, 'update', from);
	}
	doit(e, diagram, from)
	{
		from.attributes.set('flipName', !from.attributes.get('flipName'));
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
			return diagram.placeMorphism(to, elt.domain.getXY());
		}
		else if (elt instanceof DiagramObject)
		{
			const objects = elements.map(o => o.to);
			const to = diagram.get('ProductObject', {objects, dual:this.dual});
			const xy = diagram.findEmptySpot(elt.getXY());
			return diagram.placeObject(to, xy);
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
		return ary.length === 1 && ary[0].isEditable() && ary[0].to instanceof ProductObject && ary[0].to.dual === this.dual && ary[0].refcnt === 1;
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
		D.EmitCellEvent(diagram, 'check');
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
		this.assembler = null;
	}
	html(e, diagram, ary)
	{
		const elts = [H3.h4('Assemble Morphism'),
						D.getIcon('assyColor', 'assyColor', e => this.toggle(e, diagram, ary), 'Show or dismiss assembly colors'),
						D.getIcon('edit', 'edit', e => this.action(e, diagram, ary), 'Assemble and place the morphism')];
		elts.map(elt => D.toolbar.help.appendChild(elt));
	}
	action(e, diagram, ary)
	{
		const elt = this.doit(e, diagram, ary);
		const rows = this.assembler.issues.map(isu =>
		{
			if ('to' in isu.element)
				return H3.tr(H3.td(isu.message), H3.td(H3.button(isu.element.to.properName,
				{
					onmouseenter:	`Cat.R.diagram.emphasis('${isu.element.name}', true)`,
					onmouseleave:	`Cat.R.diagram.emphasis('${isu.element.name}', false)`,
					onclick: 		`Cat.R.diagram.viewElements('${isu.element.name}')`,
				})));
			else
				return H3.tr(H3.td(isu.message), H3.td(isu.element.properName));
		});
		D.toolbar.help.appendChild(this.assembler.issues.length > 0 ? H3.table(rows) : H3.span('No issues were detected'));
		diagram.log({command:this.name, source:ary[0].name});
		diagram.antilog({command:'delete', elements:[ary[0].name]});
	}
	doit(e, diagram, ary)
	{
		this.assembler = new Assembler(diagram);
		return this.assembler.assemble(e, ary[0]);
	}
	hasForm(diagram, ary)
	{
		return ary.length === 1 && ary[0].isEditable() && ary[0] instanceof DiagramObject;
	}
	toggle(e, diagram, ary)
	{
		if (this.assembler)
		{
			diagram.svgBase.querySelectorAll('.ball').forEach(elt => elt.remove());
			this.assembler = null;
		}
		else
		{
			// TODO
		}
	}
}

class HomAction extends Action
{
	constructor(diagram)
	{
		const args =
		{	description:	'Create a hom object or morphism from two such items',
			basename:		'hom',
		};
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
			return diagram.placeObject(diagram.get('HomObject', {objects:elements.map(o => o.to)}), xy);
		else if (elements[0] instanceof DiagramMorphism)
			return diagram.placeMorphism(diagram.get('HomMorphism', {morphisms:elements.map(m => m.to)}), xy);
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
				{
					const row = m.getHtmlRow();
					row.onclick = e => Cat.R.Actions[this.basename].action(e, Cat.R.diagram, [from.name, m.name]);		// replace std action
					rows.push(row);
				}
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
		this.bpd = new BPD();
		this.domain = null;
		this.codomain = null;
		this.swapped = false;
	}
	action(e, diagram, args)
	{
		const from = this.doit(e, diagram, args);
		diagram.log({command:this.name, args});
		diagram.antilog({command:'delete', elements:[from.name]});
	}
	html(e, diagram, ary)
	{
		this.swapped = false;
		const help = D.toolbar.help;
		D.RemoveChildren(help);
		this.domain = ary[0];
		this.codomain = ary[1];
		help.appendChild(H3.h3('Homset'));
		const icon = this.domain.to !== this.codomain.to ? D.getIcon('swap', 'swap', e => this.swap(), 'Swap domain and codomain') : null;
		help.appendChild(H3.table(	H3.tr(H3.td('Domain'), H3.td('##domain', this.domain.to.properName), H3.td(icon, {rowspan:2})),
									H3.tr(H3.td('Codomain'), H3.td('##codomain', this.codomain.to.properName)), '.w100'));
		const newSection = this.bpd.getNewSection(R.diagram, 'Homset-new', e => this.create(e), 'New Morphism');
		D.toolbar.help.appendChild(newSection);
		diagram.addFactorMorphisms(this.domain, this.codomain);
		this.addRows(diagram, diagram.codomain.getHomset(this.domain.to, this.codomain.to));
	}
	addRows(diagram, homset)
	{
		const help = D.toolbar.help;
		const title = help.querySelector('#help-homset-morphism-title');
		const table = help.querySelector('#help-homset-morphism-table');
		title && title.remove();
		table && table.remove();
		const rows = homset.map(m =>
		{
			const row = m.getHtmlRow();
			row.onclick = e => diagram.placeMorphism(m, this.domain, this.codomain);
			return row;
		});
		if (rows.length > 0)
		{
			help.appendChild(H3.h5('Place existing morphism', '##help-homset-morphism-title'));
			help.appendChild(H3.table(rows, '##help-homset-morphism-table'));
		}
	}
	doit(e, diagram, args)
	{
		const toArgs = {basename:args.basename, properName:args.properName, description:args.description, domain:this.swapped ? args.codomain.to : args.domain.to, codomain:this.swapped ? args.domain.to : args.codomain.to};
		const to = new Morphism(diagram, toArgs);
		const nuFrom = new DiagramMorphism(diagram, {to, domain:this.swapped ? this.codomain : this.domain, codomain:this.swapped ? this.domain : this.codomain});
		diagram.makeSelected(nuFrom);
		D.EmitCellEvent(diagram, 'check');
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
	create(e)
	{
		const args = this.bpd.getArgs();
		args.domain = this.domain;
		args.codomain = this.codomain;
		this.action(e, R.diagram, args);
	}
	swap(e)
	{
		const dom = D.toolbar.help.querySelector('#domain');
		const cod = D.toolbar.help.querySelector('#codomain');
		const html = dom.innerHTML;
		dom.innerHTML = cod.innerHTML;
		cod.innerHTML = html;
		this.swapped = !this.swapped;
		this.addRows(R.diagram, R.diagram.codomain.getHomset(this.swapped ? this.codomain.to : this.domain.to, this.swapped ? this.domain.to : this.codomain.to));
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
		D.EmitMorphismEvent(diagram, 'detach', from, {dual:this.dual, old});
		from.update();
		D.EmitCellEvent(diagram, 'check');
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
		const args =
		{
			description:	'Delete elements',
			basename:		'delete',
			priority:		98,
		};
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
		{
			const objects = new Set();
			sorted.filter(elt => elt instanceof DiagramMorphism).map(m =>
			{
				m.domain.refcnt === 1 && objects.add(m.domain);
				m.codomain.refcnt === 1 && objects.add(m.codomain);
			});
			diagram.makeSelected(...objects);
			D.EmitCellEvent(diagram, 'check');
		}
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
//		return ary.length > 0 && ary.filter(a => a.refcnt > 1).length === 0 && ary.filter(a => a instanceof Cell).length === 0;


		let form = ary.length > 0;
		const ignore = new Set();
		const proc = m =>
		{
			if (ary.includes(m))
			{
				if (m.refcnt > 2)
					form = false;
				else
					ignore.add(m);
			}
		};
		for (let i=0; i<ary.length; ++i)
		{
			const elt = ary[i];
			if (elt instanceof Cell)
			{
				form = false;
				break;
			}
			if (elt instanceof DiagramComposite)
			{
				/*
				elt.morphisms.map(m =>
				{
					if (ary.includes(m))
					{
						if (m.refcnt > 2)
							form = false;
						else
							ignore.add(m);
					}
				});
				*/
				elt.morphisms.map(proc);
				if (!form)
					break;
			}
		}
		if (form)
			form = ary.filter(elt => !ignore.has(elt) && elt.refcnt > 1).length === 0;
		return form;
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
		const to = ary[0].to.getBase();
		const canFlatten = ProductObject.CanFlatten(to);
		const id = this.dual ? 'inject-domain' : 'project-codomain';
		const obj = this.dual ? 'domain' : 'codomain';
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
		return this.placeMorphism(from, diagram, m);
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
						H3.button(`&#10034;&rarr;[${domain.properName}, ${codomain.properName}]`,
							{id:'lambda-element-morphism', onclick: e => Cat.R.Actions.lambda.createElementMorphism(e, Cat.R.diagram, Cat.R.diagram.getSelected())}),
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
				this.codomainElt.appendChild(H3.button('&times;', {title:'Convert to hom', onclick:e => this.toggleOp(e.target), 'data-indices':-1}));
			this.codomainElt.appendChild(elt);
		}
		else
		{
			if (elt.nextSibling)
				elt.nextSibling.remove();
			else if (elt.previousSibling)
				elt.previousSibling.remove();
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
	placeMorphism(source, diagram, morphism)
	{
		const xyDom = diagram.findEmptySpot(source.domain.getXY());
		const xyCod = diagram.findEmptySpot(source.codomain.getXY());
		return diagram.placeMorphism(morphism, xyDom, xyCod, true);
	}
	createElementMorphism(e, diagram, from)
	{
		const factors = [[]];
		const m = diagram.get('LambdaMorphism', {preCurry:from.to, domFactors:[], homFactors:[[0]]});
		return diagram.placeMorphism(from, diagram, m);
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
		const toolbar2 = [];
		R.languages.forEach(lang => lang.hasForm(diagram, ary) && toolbar2.push(D.getIcon(lang.basename, lang.basename, e => Cat.R.Actions[lang.basename].html(e, Cat.R.diagram, Cat.R.diagram.selected), lang.description)));
		if (toolbar2.length > 0)
			help.appendChild(H3.div(toolbar2, '##help-toolbar2'));
		D.toolbar.help.appendChild(H3.div(from.help(), '##help-body'));
	}
}

class LanguageAction extends Action
{
	constructor(diagram, args)
	{
		super(diagram, args);
		Object.defineProperties(this,
		{
			genDiagram:		{value:	null,		writable:	true},
			currentDiagram:	{value:	null,		writable:	true},
			htmlReady:		{value:	false,		writable:	true},
			ext:			{value:	args.ext,	writable:	false},
		});
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const from = ary.length === 1 ? ary[0] : diagram;
		const m = from instanceof Diagram ? from : from.to;
		if (m instanceof CatObject || m instanceof Morphism)	// only edit basic elements and not derived ones
		{
			if (!('code' in m))
				m.code = {};
			m.code[this.ext] = document.getElementById(`element-${this.ext}`).value;
			D.EmitElementEvent(diagram, 'update', from);
		}
	}
	hasForm(diagram, ary)
	{
		return (ary.length === 1 && (ary[0] instanceof CatObject || ary[0] instanceof Morphism)) || ary.length === 0;
	}
	checkEditable(m)
	{
		return m.isEditable() &&
			((m.constructor.name === 'Morphism' && !m.domain.isInitial() && !m.codomain.isTerminal() && !m.codomain.isInitial()) || m.constructor.name === 'CatObject' || m instanceof Diagram);
	}
	html(e, diagram, ary)
	{
		const elt = ary.length === 1 ? ary[0].to : diagram;
		const div = H3.div();
		const help = D.toolbar.help;
		const body = help.querySelector('#help-body');
		D.RemoveChildren(body);
		body.appendChild(div);
		if (elt instanceof Morphism || elt instanceof CatObject)
			this.getEditHtml(div, elt);
		else
		{
			this.genDiagram = diagram;
			this.currentDiagram = null;
			div.appendChild(H3.p(this.generate(elt), `##element-${this.ext}.code`));
		}
	}
	setEditorSize(textarea)
	{
		if (textarea.scrollWidth - Math.abs(textarea.scrollLeft) !== textarea.clientWidth)
			textarea.style.width = Math.max(D.toolbar.element.clientWidth - 40, textarea.scrollWidth) + 'px';
		if (textarea.scrollHeight - Math.abs(textarea.scrollTop) !== textarea.clientHeight)
			textarea.style.height = Math.min(D.Height()/2, textarea.scrollHeight) + 'px';
	}
	getEditHtml(div, elt)	// handler when the language is just a string
	{
		let code = '';
		if (elt.constructor.name === 'Morphism' || elt instanceof Diagram || elt instanceof CatObject)
			code = 'code' in elt ? (this.hasCode(elt) ? elt.code[this.ext] : '') : '';
		else if (elt instanceof Morphism)
			code = this.generate(R.diagram, elt);
		const id = `element-${this.ext}`;
		const textarea = H3.textarea(code, '.code.w100',
		{
			id,
			disabled:true,
			onkeydown:e =>
			{
				e.stopPropagation();
				D.CancelAutohide();
				if (e.key === 'Tab')	// insert tab character
				{
					e.preventDefault();
					const target = e.target;
					const start = target.selectionStart;
					target.value = target.value.substring(0, start) + '\t' + target.value.substring(target.selectionEnd);
					target.selectionStart = target.selectionEnd = start +1;
				}
			},
			oninput: e => this.setEditorSize(e.target),
		});
		div.appendChild(textarea);
		this.setEditorSize(textarea);
		if (this.checkEditable(elt))
			div.appendChild(D.getIcon(this.name, 'edit', e => this.setCode(e, id, this.ext), 'Edit code'));
		div.appendChild(D.getIcon(this.basename, `download-${this.basename}`, e => this.download(e, elt), `Download ${this.properName}`));
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
		if (R.diagram.isEditable() && elt.disabled === false)
		{
			elt.contentEditable = false;
			elt.disabled = true;
			R.diagram.activate(e, type);
		}
		else
		{
			elt.disabled = false;
			elt.contentEditable = true;
			elt.focus();
		}
	}
	getNamespace(diagram) { return U.Token(diagram.name); }
	generate(m, generated = new Set())	{}
	evaluate(e, diagram, name, fn) {}
	evaluateMorphism(e, diagram, name, fn) {}
	download(e, elt)
	{
		const code = D.toolbar.element.querySelector(`textarea#element-${this.basename}`).value;
		const blob = new Blob([code], {type:`application/${this.ext}`});
		const url = D.url.createObjectURL(blob);
		D.Download(url, `${this.getType(elt)}.${this.ext}`);
	}
	// TODO need version for JS only
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
		const addDataBtn = D.getIcon('addInput', 'edit', e => this.addInput(), 'Add data');
		const {properName, description} = to;
		const elements = [H3.h3(properName)];
		description !== '' && elements.push(H3.p(description, '.smallPrint.italic'));
		let canMakeData = true;
		let domain = null;
		let codomain = null;
		const source = to instanceof NamedObject ? to.base : to;
		if (from instanceof DiagramObject)
		{
			if (this.js.canFormat(source))
				elements.push(H3.span({innerHTML:this.js.getInputHtml(source)}), addDataBtn);
		}
		else	// morphism
		{
			domain = to.domain;
			codomain = to.codomain;
			if (to.constructor.name === 'Morphism' && domain instanceof FiniteObject && !this.js.hasCode(to))
			{
				/*
				 * TODO?
				if ('size' in domain && domain.size > 0)
				{
					for (let i=0; i<domain.size; ++i)
						html += this.js.getInputHtml(codomain, null, i.toString());
				}
				else	// indeterminate size
				{
					html += this.js.getInputHtml(codomain);
					html += D.GetButton('addData', 'add', `Cat.R.Actions.run.addDataInput(event, Cat.R.diagram, '${to.name}')`, 'Add data input');
				}
				*/
			}
			if (R.CanFormat(to))
			{
				const sz = domain.getSize();
				const rows = [	H3.tr(H3.td(H3.small('Domain')), H3.td(H3.small('Codomain')), H3.td()),
								H3.tr(	H3.td(domain.properName + (domain.getBase() !== domain ? ` [${domain.getBase().properName}]` : ''), '.smallBold'),
										H3.td(codomain.properName + (codomain.getBase() !== codomain ? ` [${codomain.getBase().properName}]` : ''), '.smallBold'), H3.td())];
				const dataRow = function(d,i)
				{
					if (d !== null)
					{
						const editDataBtn = D.getIcon('editData', 'edit', e => this.editData(e, i), 'Set data');
						rows.push(H3.tr(H3.td(typeof i === 'number' ? i.toString() : i), H3.td(typeof d === 'number' ? d.toString() : d), H3.td(editDataBtn)));
					}
				};
				this.data = new Map(to.data);
				if (sz < Number.MAX_VALUE)
				{
					for (let i=0; i<sz; ++i)
					{
						const value = to.data.has(i) ? to.data.get(i) : null;
						const input = this.js.getInputHtml(codomain, value, i, [], i);
						dataRow(input, i);
					}
					// TODO domain not numeric
					elements.push(H3.h5('Data in Morphism'));
					elements.push(H3.table(rows));
					canMakeData = false;
				}
				else
				{
					rows.push(H3.tr(H3.td('##runAction-in'), H3.td('##runAction-out'), H3.td(addDataBtn)));
					elements.push(H3.h5('Data in Morphism'));
					'data' in to && to.data.forEach(dataRow);
					elements.push(H3.table(rows));
				}
			}
			else if (to.isIterable())
				elements.push(D.getIcon('evaluate', 'edit', e => this.evaluateMorphism(e, Cat.R.diagram, to.name, this.postResults), 'Evaluate morphism'));
			else		// try to evaluate an input
				elements.push(H3.h5('Evaluate the Morphism'), H3.span({innerHTML:this.js.getInputHtml(domain)}), D.getIcon('run', 'edit', e => this.js.evaluate(e, Cat.R.diagram, to.name, this.postResult), 'Evaluate inputs'));
		}
		if (canMakeData)
		{
			const createDataBtn = H3.div(D.getIcon('createData', 'table', e => this.createData(e, Cat.R.diagram, from.name), 'Add data'), '##run-createDataBtn', {display:'none'});
			elements.push(H3.div('##run-display'), createDataBtn);
			elements.map(elt => D.toolbar.help.appendChild(elt));
			if (domain && codomain)
			{
				document.getElementById('runAction-in').innerHTML = this.js.getInputHtml(domain, null, 'dom');
				document.getElementById('runAction-out').innerHTML = this.js.getInputHtml(codomain, null, 'cod');
			}
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
			const {domain, codomain} = this.setEvaluation(to);
			d.innerHTML = this.htmlInputValue(domain, codomain);
		}
		this.display.appendChild(d);
	}
	htmlInputValue(domain, codomain)
	{
		return U.safe(domain) + '&rarr;' + U.safe(codomain);
	}
	setEvaluation(m)
	{
		if (!('data' in m))
			m.data = new Map();
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
		D.EmitMorphismEvent(R.diagram, 'update', morphism);
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
		D.EmitElementEvent(diagram, 'update', finObj);
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
//						H3.table(H3.tr(H3.td(D.Input('size' in to ? to.size : '', 'finite-new-size', 'Size')))),
						H3.table(H3.tr(H3.td(H3.input('##finite-new-size.in100', 'size' in to ? to.size : '', {placeholder:'Size'})))),
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
			D.EmitElementEvent(diagram, 'move', i);
		});
		diagram.updateMorphisms();
		D.EmitDiagramEvent(diagram, 'move');	// finished
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
			D.EmitElementEvent(diagram, 'move', i);
		});
		diagram.updateMorphisms();
		D.EmitDiagramEvent(diagram, 'move');
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
			diagram.placeMorphism(to, D.Barycenter(ary));
		}
		else if (elt instanceof DiagramObject)
		{
			const objects = ary.map(o => o.to);
			const to = diagram.get('TensorObject', {objects});
			diagram.placeObject(to, elt);
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
		D.statusbar.show(e, `Morphism ${recursor.properName} is now recursive with morphism ${form.properName}`);
		D.EmitElementEvent(diagram, 'update', ary[0]);
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

class SwapAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Swap domain and codomain',
						basename:		'swap',
						priority:		90,
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		from.domain.domains.delete(from);
		from.codomain.codomains.delete(from);
		let obj = from.domain;
		from.domain = from.codomain;
		from.codomain = obj;
		obj = from.to.domain;
		from.to.domain = from.to.codomain;
		from.to.codomain = obj;
		from.domain.domains.add(from);
		from.codomain.codomains.add(from);
		D.EmitMorphismEvent(diagram, 'update', from);
		diagram.log({command:this.name, morphism:ary[0].name});
		diagram.antilog({command:this.name, morphism:ary[0].name});
	}
	hasForm(diagram, ary)
	{
		if (ary.length === 1)
		{
			const from = ary[0];
			return from instanceof DiagramMorphism && from.refcnt === 1 && from.to.refcnt === 1 && from.to.constructor.name === 'Morphism';
		}
		return false;
	}
}

class AssemblyMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Set projection or injection as an assembly morphism',
						basename:		'assyMorphism',
						priority:		80,
		};
		super(diagram, args);
		if (!isGUI)
			return;
	}
	action(e, diagram, ary)
	{
		ary.map(m =>
		{
			if (!m.attributes.has('assyMorphism'))
				m.attributes.set('assyMorphism', false);
			const isAssy = !m.attributes.get('assyMorphism');
			m.attributes.set('assyMorphism', isAssy);
			if ('svg' in m && m.svg)
				D.EmitMorphismEvent(diagram, 'update', m);
		});
	}
	hasForm(diagram, ary)
	{
		return  ary.reduce((r, elt) => r && elt instanceof DiagramMorphism && (Assembler.isReference(elt.to) || Assembler.isCoreference(elt.to)), true);
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
		this.constructor.name === 'Category' && D.EmitElementEvent(diagram, 'new', this);
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
		const sync = R.sync;
		let errMsg = '';
		const procElt = (args, ndx) =>
		{
			if (!args || !('prototype' in args))
				return;
			try
			{
				diagram.get(args.prototype, args);
			}
			catch(x)
			{
				errMsg += x + '\n';
			}
		};
		try
		{
			R.sync = false;
			data.filter((args, ndx) =>
			{
				switch(args.prototype)
				{
					case 'CatObject':
					case 'FiniteObject':
					case 'ProductObject':
					case 'HomObject':
					case 'NamedObject':
					case 'DiagramObject':
					case 'DiagramText':
					case 'TensorObject':
						procElt(args, ndx);
						break;
				}
			});
			data.filter((args, ndx) =>
			{
				switch(args.prototype)
				{
					case 'Morphism':
					case 'DiagramMorphism':
					case 'FactorMorphism':
					case 'Identity':
					case 'NamedMorphism':
					case 'DiagramComposite':
					case 'Composite':
					case 'ProductMorphism':
					case 'ProductAssembly':
					case 'LambdaMorphism':
					case 'HomMorphism':
					case 'Evaluation':
					case 'Distribute':
					case 'Dedistribute':
					case 'Assertion':
						procElt(args, ndx);
						break;
				}
			});
			if (errMsg !== '')
				D.RecordError(errMsg);
		}
		catch(x)
		{
			D.RecordError(x);
		}
		R.sync = sync;
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
			emit && D.EmitElementEvent(elt.diagram, 'delete', elt);
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
		const chkObjs = (a, b) => (a instanceof FiniteObject && b instanceof FiniteObject && a.size === 1 && b.size === 1) || a === b;
		this.forEachMorphism(m => chkObjs(m.domain, domain) && chkObjs(m.codomain, codomain) && homset.push(m));
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
			throw `no codomain ${args.codomain} for morphism ${args.basename}`;
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
		diagram && (!('addElement' in args) || args.addElement) && diagram.addElement(this);
		this.constructor.name === 'Morphism' && D.EmitElementEvent(diagram, 'new', this);
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
	help(from = null)
	{
		const help = super.help();
		let domainElt = null;
		let codomainElt = null;
		if (this.isEditable() && from && from.to.refcnt === 1)
		{
			const objects = R.diagram.getObjects();
			if (from.domain.refcnt === 2)
			{
				domainElt = H3.select('##new-domain.w100', {onchange: e => from.setToDomain(R.diagram.getElement(e.target.value))});
				domainElt.appendChild(H3.option(this.domain.properName, {value:this.domain.properName, selected:true, disabled:false}));
				objects.map(o => o.name !== this.domain.name && domainElt.appendChild(H3.option(o.properName, {value:o.name})));
				help.appendChild(H3.tr(H3.td('Domain:'), H3.td(domainElt)));
			}
			if (from.codomain.refcnt === 2)
			{
				codomainElt = H3.select('##new-codomain.w100', {onchange: e => from.setToCodomain(R.diagram.getElement(e.target.value))});
				codomainElt.appendChild(H3.option(this.codomain.properName, {value:this.codomain.properName, selected:true, disabled:true}));
				objects.map(o => o.name !== this.codomain.name && codomainElt.appendChild(H3.option(o.properName, {value:o.name})));
				help.appendChild(H3.tr(H3.td('Codomain:'), H3.td(codomainElt)));
			}
		}
		if (!domainElt)
			domainElt = this.domain.properName;
		if (!codomainElt)
			codomainElt = this.codomain.properName;
		help.appendChild(H3.tr(H3.td('Domain:'), H3.td(domainElt)));
		help.appendChild(H3.tr(H3.td('Codomain:'), H3.td(codomainElt)));
		if ('recursor' in this)
		{
			const deleteRecursor = e =>
			{
				this.setRecursor(null);
				document.getElementById('help-recursor').remove();
			};
			const btn = this.isEditable() ? D.getIcon('delete', 'delete', deleteRecursor, 'Delete recursor') : '';
			help.appendChild(H3.tr('##help-recursor', H3.td('Recursor:'), H3.td(this.recursor.properName, btn)));
		}
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
			this.data.forEach((d, k) => d && saved.set(k, U.ConvertData(codomain, d)));		// drop undefined data
			a.data = U.JsonMap(saved);
		}
		if ('recursor' in this && this.recursor)
			a.recursor = this.recursor.name;
		return a;
	}
	isIterable()
	{
		return this.domain.isIterable();
	}
	uses(mor, start = true)		// True if the given morphism is used in the construction of this morphism somehow or identical to it
	{
		if (this.isEquivalent(mor))
			return true;
		if ('data' in this)
		{
			const values = [...this.data.values()];
			for (let i=0; i<values.length; ++i)
			{
				let val = values[i];
				if (typeof val === 'string')
					val = this.diagram.getElement(val);
				if (val instanceof Morphism && val.uses(mor))
					return true;
			}
		}
		return false;
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
	loadItem()	// don't call in Morphism constructor since signature may change
	{
		const diagram = this.diagram;
		const sig = this.signature;
		R.LoadItem(diagram, this, [this], [this]);
		const domIdSig = Identity.Signature(diagram, this.domain);
		R.loadSigs(diagram, this, [sig], [domIdSig, sig]);
		const codIdSig = Identity.Signature(diagram, this.codomain);
		R.loadSigs(diagram, this, [sig], [sig, codIdSig]);
		if (this.diagram.codomain.actions.has('product'))
		{
			const domTermSig = FactorMorphism.Signature(diagram, this.domain);
			const codTermSig = FactorMorphism.Signature(diagram, this.codomain);
			R.loadSigs(diagram, this, [domTermSig], [sig, codTermSig]);
		}
		if (this.diagram.codomain.actions.has('coproduct'))
			R.loadSigs(diagram, this, [FactorMorphism.Signature(diagram, this.domain)], [sig, FactorMorphism.Signature(diagram, this.codomain)]);
	}
	textWidth()
	{
		return D.textWidth(this.domain.properName)/2 + D.textWidth(this.properName, 'morphTxt') + D.textWidth(this.codomain.properName)/2 + D.textWidth('&emsp;');
	}
	getHtmlRep(idPrefix)
	{
		const id = this.elementId(idPrefix);
		const items = [];
		items.push(this.properName !== '' & this.properName !== this.basename ? H3.span('.smallBold', this.properName) : H3.span('.smallBold', this.basename));
		items.push(H3.span('&nbsp;:&nbsp;' + this.domain.properName + '&rarr;' + this.codomain.properName));
		this.description !== '' && items.push(H3.span('.diagramRowDescription', this.description));
		items.push(H3.br(), H3.span(this.name, '.tinyPrint'));
		return H3.div({id}, items);
	}
	setRecursor(r)
	{
		if (this.recursor && this.recursor instanceof Morphism)
		{
			this.recursor.decrRefcnt();
			this.recursor = null;
		}
		const rcrs = typeof r === 'string' ? this.diagram.codomain.getElement(r) : r;
		if (rcrs)
		{
			if (!rcrs.uses(this))
				throw `The recursive morphism does not refer to itself so no recursion.`;
			this.recursor = rcrs;
			this.recursor.incrRefcnt();
		}
		else	// have to set it later
			this.recursor = r;
	}
	clear()
	{
		if ('data' in this)
			// TODO manage reference counts in hom morphisms
			this.data = new Map();
	}
	usesDiagram(diagram)
	{
		return super.usesDiagram(diagram) || this.domain.usesDiagram(diagram) || this.codomain.usesDiagram(diagram);
	}
	static HasRecursiveForm(ary)	// TODO move
	{
		if (ary.length === 2)
		{
			const r = ary[0];
			const f = ary[1];
			if (r instanceof DiagramMorphism && f instanceof DiagramMorphism)
				return f.to !== r.to && f.to.uses(r.to);
		}
		return false;
	}
	static isIdentity(morph)
	{
		if (morph instanceof MultiMorphism)
			return morph.morphisms.reduce((r, m) => r && Morphism.isIdentity(m), true);
		if (morph instanceof FactorMorphism)
		{
			if (morph.dual)
				return FactorMorphism.isIdentity(morph.factors, 'objects' in morph.codomain ? morph.codomain.objects.length : 1);
			else
				return FactorMorphism.isIdentity(morph.factors, 'objects' in morph.domain.basic() ? morph.domain.basic().objects.length : 1);
		}
		// TODO factor morphism whose factors form an identity
		return morph instanceof Identity;
	}
	static getProductFactors(morphism)
	{
		if (morphism instanceof FactorMorphism)
			return U.Clone(morphism.factors);
		if (morphism instanceof Identity)
		{
			if (morphism.domain instanceof MultiObject && !morphism.domain.dual)
				return morphism.domain.objects.map((o, i) => i);
		}
		return [];
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
		this.constructor.name === 'Identity' && D.EmitElementEvent(diagram, 'new', this);
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
			basename = `Id{${domain.refName(diagram)},${codomain.refName(diagram)}}dI`;
		else if (domain)
			basename = `Id{${typeof domain === 'string' ? domain : domain.refName(diagram)}}dI`;
		else if (codomain)
			basename = `Id{${typeof codomain === 'string' ? codomain : codomain.refName(diagram)}}dI`;
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
	static LoadItem(diagram, obj, dual)
	{
		if (obj instanceof ProductObject)
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = ProductMorphism.Signature(subs, this.dual);
			R.loadSigs(diagram, this, [this.signature], [op]);
		}
		else if (obj instanceof HomObject)
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = HomMorphism.Signature(subs);
			R.loadSigs(diagram, this, [this], [op]);
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
		this.constructor.name === 'NamedObject' && D.EmitElementEvent(diagram, 'new', this);
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
	getGraph(data = {position:0}, obj2flat = new Map())
	{
		const grph = this.diagram.flattenObject(this.base, obj2flat).getGraph();
		const w = D.textWidth(this.properName);
		grph.deepScan((g, ndx) => g.position = data.position);
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
			this.signature = this.source.signature;
		this.constructor.name === 'NamedMorphism' && D.EmitElementEvent(diagram, 'new', this);
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
	loadItem()	// don't call in Morphism constructor since signature may change
	{
		super.loadItem();
		R.LoadItem(this.diagram, this, [this], [this.base]);
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
			throw 'no morphism to attach to index: ' + nuArgs.to;
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
		const attributes = new Map('attributes' in nuArgs ? nuArgs.attributes : []);
		Object.defineProperties(this,
		{
			attributes:	{value: attributes,	writable: false},
			bezier:		{value: null,		writable: true,	enumerable: true},
			homsetIndex:{value: this.setHomsetIndex(args, 'homsetIndex'),	writable: true,	enumerable: true},
			svg_path:	{value: null,		writable: true,	enumerable: true},
			svg_path2:	{value: null,		writable: true,	enumerable: true},
			svg_name:	{value: null,		writable: true,	enumerable: true},
			svg_nameGroup:	{value: null,	writable: true,	enumerable: true},
		});
		if ('flipName' in nuArgs)	// TODO remove; for reading old files
			this.attributes.set('flipName', nuArgs.flipName);
		if (!this.attributes.has('flipName'))
			this.attributes.set('flipName', false);
		this.constructor.name === 'DiagramMorphism' && D.EmitElementEvent(diagram, 'new', this);
	}
	setHomsetIndex(args)
	{
		if ('homsetIndex' in args)
			return args.homsetIndex;
		else
		{
			const homsetLength = this.diagram.domain.getHomset(this.domain, this.codomain).length;
			const cohomsetLength = this.diagram.domain.getHomset(this.codomain, this.domain).length;
			return (cohomsetLength > 0 ? 1 : 0) + homsetLength - 1;
		}
	}
	setDomain(dom)
	{
		const cat = this.diagram.domain;
		cat.removeMorphism(this);
		super.setDomain(dom);
		cat.addMorphism(this);
	}
	setCodomain(cod)
	{
		const cat = this.diagram.domain;
		cat.removeMorphism(this);
		super.setCodomain(cod);
		cat.addMorphism(this);
	}
	help()
	{
		const help = this.to.help(this);
		if (this.isEditable())
		{
			const inputArgs = {type:"number", onchange:e => this.updateHomsetIndex(Number.parseInt(e.target.value)), min:0, max:100, width:2, value:this.homsetIndex};
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
	}
	json()
	{
		const mor = super.json();
		if (this.attributes.size > 0)
		{
			const keys = new Set(this.attributes.keys());
			if (keys.has('flipName') && !this.attributes.get('flipName'))
				keys.delete('flipName');
			if (keys.has('assyMorphism') && !this.attributes.get('assyMorphism'))
				keys.delete('assyMorphism');
			if (keys.size > 0)
				mor.attributes = [...keys].map(key => [key, this.attributes.get(key)]);
		}
		if (this.homsetIndex !== 0)
			mor.homsetIndex = this.homsetIndex;
		mor.to = this.to.name;
		return mor;
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
		const normal = D2.Subtract(pt2, pt1).normal().scale(this.attributes.get('flipName') ? 1 : -1).normalize();
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
		g.onmouseenter = e => this.mouseenter(e);
		g.onmouseout = e => this.mouseout(e);
		g.onmouseover = e => this.mouseover(e);
		g.onmousedown = e => Cat.R.diagram.userSelectElement(e, name);
		node.appendChild(g);
		this.svg = g;
		g.setAttributeNS(null, 'id', id);
		this.svg_path2 = H3.path('.grabme.grabbable', {'data-type':'morphism', 'data-name':this.name, class:'grabme grabbable', id:`${id}_path2`, d:coords});
		g.appendChild(this.svg_path2);
		const cls = this.attributes.has('assyMorphism') && this.attributes.get('assyMorphism') ? 'assyMorphism grabbable' : 'morphism grabbable';
		this.svg_path = H3.path({'data-type':'morphism', 'data-name':this.name, 'data-to':this.to.name, class:cls, id:`${id}_path`, d:coords, 'marker-end':'url(#arrowhead)'});
		g.appendChild(this.svg_path);
		this.svg_name = H3.text('.morphTxt.grabbable', {'data-type':'morphism', 'data-name':this.name, 'data-to':this.to.name, id:`${id}_name`, ondblclick:e => Cat.R.Actions.flipName.action(e, this.diagram, [this])},
			this.to.properName);
		const width = D.textWidth(this.to.properName, 'morphTxt');
		const bbox = {x:off.x, y:off.y, width, height:D.default.font.height};
		const place = this.diagram.autoplaceSvg(bbox, this.name);
		this.svg_nameGroup = H3.g({transform:`translate(${place.x}, ${place.y + D.default.font.height})`}, this.svg_name);
		g.appendChild(this.svg_nameGroup);
		this.updateDecorations();
	}
	getNameSvgOffset()
	{
		const matrix = this.svg_name.parentElement.transform.baseVal.getItem(0).matrix;
		return new D2(matrix.e, matrix.f);
	}
	showSelected(state = true)
	{
		[this.svg_path, this.svg_name, this.svg].map(svg => svg.classList[state ? 'add' : 'remove']('selected'));
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
		const svg = this.svg_nameGroup;
		svg.setAttribute('transform', `translate (${off.x}, ${off.y})`);
		const bbox = svg.getBBox();
		// odd; sometimes the bbox does not have the x set correctly
		bbox.x = off.x;
		bbox.y = off.y;		// just in case since x is weird
		const pntTop = this.intersect(bbox, 'top');
		const pntBtm = this.intersect(bbox, 'bottom');
		const pntLft = this.intersect(bbox, 'left');
		const pntRgt = this.intersect(bbox, 'right');
		let anchor = 'middle';
		if (pntTop || pntBtm || pntLft || pntRgt)	// intersection
		{
			if (this.domain.y !== this.codomain.y)
			{
				if (this.start.x < this.end.x)
				{
					if (this.start.y < this.end.y)
						anchor = this.attributes.get('flipName') ? 'end' : 'start';
					else
						anchor = this.attributes.get('flipName') ? 'start' : 'end';
				}
				else
				{
					if (this.start.y < this.end.y)
						anchor = this.attributes.get('flipName') ? 'end' : 'start';
					else
						anchor = this.attributes.get('flipName') ? 'start' : 'end';
				}
			}
		}
		else
		{
			const angle = this.angle;
			const bnd = Math.PI/12;
			if (angle > Math.PI + bnd && angle < 2 * Math.PI - bnd)
				anchor = this.attributes.get('flipName') ? 'start' : 'end';
			else if (angle > bnd && angle < Math.PI - bnd)
				anchor = this.attributes.get('flipName') ? 'end' : 'start';
		}
		svg.style.textAnchor = anchor;
	}
	getSvgNameBBox()
	{
		return this.getNameSvgOffset().add(this.svg_name.getBBox());
	}
	getBBox()
	{
		return D2.Merge(this.domain.getBBox(), this.codomain.getBBox(), this.getSvgNameBBox());
	}
	predraw()
	{
		const domBBox = D2.Expand(this.domain.svg.getBBox(), D.default.margin).add(this.domain.getXY());
		const codBBox = D2.Expand(this.codomain.svg.getBBox(), D.default.margin).add(this.codomain.getXY());
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
			const scale = 2;
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
			if (this.attributes.has('assyMorphism') && this.attributes.get('assyMorphism'))
			{
				this.svg_path.classList.remove('morphism');
				this.svg_path.classList.add('assyMorphism');
			}
			else
			{
				this.svg_path.classList.remove('assyMorphism');
				this.svg_path.classList.add('morphism');
			}
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
		if ('graph' in this && 'svg' in this.graph)
		{
			this.graph.svg.remove();
			delete this.graph;
		}
	}
	makeGraph()
	{
		if (!('graph' in this))
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
				{index:[], root:this.graph, dom:dom.name, cod:cod.name, visited:[], elementId:this.elementId(), color:this.signature.substring(0, 6)});
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
		D.SetClass('emphasis', on, this.svg_path);
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
			D.EmitMorphismEvent(this.diagram, 'update', this);
		}
	}
	setToDomain(obj, dual = false)
	{
		this.to.setDomain(obj);
		this.domain.setObject(obj);
		this.domain.svg.remove();
		this.domain.svg = null;
		this.domain.update();
		D.EmitMorphismEvent(this.diagram, 'update', this);
	}
	setToCodomain(obj)
	{
		this.to.setCodomain(obj);
		this.codomain.setObject(obj);
		this.codomain.svg.remove();
		this.codomain.svg = null;
		this.codomain.update();
		D.EmitMorphismEvent(this.diagram, 'update', this);
	}
	updateProperName()
	{
		this.svg_name.innerHTML = this.to.properName;
	}
	static LinkId(data, lnk)
	{
		return `link_${data.elementId}_${data.index.join('_')}:${lnk.join('_')}`;
	}
	static LinkColorKey(lnk, dom, cod)
	{
		return `${lnk[0] === 0 ? dom : cod} ${lnk.slice(1).toString()}`;	// TODO use U.a2s?
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
			assertion:		{value:null,			writable:true},
			hidden:			{value:false,			writable:true},
			left:			{value:nuArgs.left,		writable:true},
			right:			{value:nuArgs.right,	writable:true},
			commutes:		{value:'unknown',		writable:true},
			signature:		{value:Cell.Signature(nuArgs.left, nuArgs.right),	writable:false},
			svg:			{value:null,			writable:true},
		});
		this.description = '';
	}
	action(e, act)
	{
		let assert = null;
		switch(act)
		{
			case 'hidden':
				this.hide();
				break;
			case 'show':
				this.show();
				break;
			case 'remove':
				this.assertion.decrRefcnt();
				break;
			case 'equal':
			case 'notEqual':
				assert = this.diagram.addAssertion(this, act === 'equal' ? true : false);
				const parent = this.svg.parentNode;
				const dom = this.left[0].domain;
				D.EmitCellEvent(this.diagram, 'check');
				break;
		}
		R.Actions.help.html(e, this.diagram, [this]);
		return assert;
	}
	help()
	{
		const rows = [H3.tr(H3.th('Cell'))];
		const buttons = [];
		switch(this.commutes)
		{
			case 'assertion':
			case 'notequal':
				buttons.push(D.getIcon('delete', 'delete', e => this.action(e, 'remove'), 'Remove assertion'));
				break;
			case 'hidden':
				buttons.push(D.getIcon('delete', 'delete', e => this.action(e, 'show'), 'Reveal this cell'));
				break;
			case 'composite':
			case 'named':
			case 'computed':
				break;
			case 'unknown':
				buttons.push(	D.getIcon('cell', 'cell', e => this.action(e, 'equal'), 'Set to equal'),
								D.getIcon('notEqual', 'notEqual', e => this.action(e, 'notEqual'), 'Set to not equal'),
								D.getIcon('hide', 'hide', e => this.action(e, 'hidden'), 'Hide this cell'));
				break;
		}
		rows.push(	
					H3.tr(H3.td(H3.table(H3.tr(H3.td('.left', 'Commutativity:'), H3.td('.right', U.Cap(this.commutes))), '.w100'))),
					H3.tr(H3.td(buttons)),
					H3.tr(H3.th('Left leg:')));
		this.left.map(m => rows.push(m.to.getHtmlRow()));
		rows.push(H3.tr(H3.th('Right leg:')));
		this.right.map(m => rows.push(m.to.getHtmlRow()));
		return H3.table(rows);
	}
	setCommutes(com)
	{
		this.commutes = com;
		this.properName = D.cellMap[com];
		this.setGlow();
	}
	setGlow()
	{
		if (this.svg)	// TODO?
		{
			this.svg.classList.remove('cellTxt');
			this.svg.classList.remove('badCell');
			this.svg.classList.remove('hiddenCell');
			let cls = '';
			switch(this.commutes)
			{
				case 'unknown':
					cls = 'badCell';
					break;
				case 'hidden':
					cls = 'hiddenCell';
					break;
				default:
					cls = 'cellTxt';
			}
			this.svg.classList.add(cls);
		}
	}
	register()
	{
		this.getObjects().map(o => o.nodes.add(this));
	}
	deregister()
	{
		this.getObjects().map(o => o.nodes.delete(this));
		this.diagram.domain.cells.delete(this.signature);
		isGUI && this.removeSVG();
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
		if (this.svg)
			this.svg.remove();
		const name = this.name;
		const sig = this.signature;
		const svg = H3.text('.grabbable', {id:this.elementId('cell'), 'data-type':'cell', 'data-name':this.name, 'text-anchor':'middle', 'x':this.x, 'y':this.y + D.default.font.height/2}, this.properName);
		svg.onmouseenter = _ => Cat.R.diagram.emphasis(sig, true);
		svg.onmouseleave = _ => Cat.R.diagram.emphasis(sig, false);
		svg.onmousedown = e => Cat.R.diagram.userSelectElement(e, sig);
		node.appendChild(svg);
		this.svg = svg;
		this.setGlow();
		this.diagram.selected.filter(elt => elt instanceof Assertion && elt.signature === this.signature).map(assert => assert.showSelected());
	}
	removeSVG()
	{
		if (this.diagram.svgBase)
		{
			const svg = this.diagram.svgBase.querySelector('#' + this.elementId('cell'));
			svg && svg.remove();
			this.svg && this.svg.remove();
			this.svg = null;
		}
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
			const bbox = {x:xy.x, y:xy.y - D.default.font.height, width:D.textWidth(this.properName, 'cellTxt'), height:D.default.font.height};
			if (true)
			{
				const place = this.diagram.autoplaceSvg(bbox, this.name);
				this.svg.setAttribute('x', place.x + bbox.width / 2);
				this.svg.setAttribute('y', place.y + D.default.font.height);
			}
			else
				this.diagram.autoplaceSvg2(this.svg, xy, this.name);
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
		if (!Composite.isComposite(this.left) || !Composite.isComposite(this.right))
			return false;
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
	show()
	{
		this.diagram.domain.hiddenCells.delete(this.signature);
		this.setCommutes('unknown');
		this.svg && this.update();
		D.EmitCellEvent(this.diagram, 'show');
	}
	hide()
	{
		this.diagram.domain.hiddenCells.add(this.signature);
		this.setCommutes('hidden');
		this.svg && this.update();
		D.EmitCellEvent(this.diagram, 'hide');
	}
	getHtmlRep(idPrefix)
	{
		const id = this.elementId(idPrefix);
		const items = [H3.h5(U.Cap(this.commutes)), H3.br()];
		items.push(H3.span('Left: ', this.left.map(m => m.to.properName).join(', '), '.tinyPrint'));
		items.push(H3.span(' Right: ', this.right.map(m => m.to.properName).join(', '), '.tinyPrint'));
		return H3.div({id}, items);
	}
	getButtons()
	{
		const buttons = [];
		if (this.isEditable())
			buttons.push(D.getIcon('delete', 'delete', _ => Cat.R.Actions.delete.action(this.name, Cat.R.diagram, [this]), 'Delete assertion'));
		buttons.push(D.getIcon('viewCell', 'view', e => R.diagram.viewElements(this)));
		return buttons;
	}
	getHtmlRow()
	{
		const html = this.getHtmlRep();
		html.classList.add('element');
		const tools = H3.span('.tool-entry-actions');
		html.appendChild(tools);
		const buttons = this.getButtons();
		buttons.map(btn => tools.appendChild(btn));
		const actions =
		{
			onclick:		e => {},
			onmouseenter:	e => R.diagram.emphasis(this, true),
			onmouseleave:	e => R.diagram.emphasis(this, false),
		};
		return H3.tr(H3.td(html, '.w100'), actions);
	}
	isEditable()
	{
		return super.isEditable() ? this.commutes === 'assertion' : false;
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
		{
			cell = new Cell(diagram, {left, right, properName:''});
			diagram.domain.cells.set(sig, cell);
		}
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
		this.constructor.name === 'DiagramComposite' && D.EmitElementEvent(diagram, 'new', this);
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
			'hiddenCells':	{value:new Set(), writable: false},
		});
		this.constructor.name === 'IndexCategory' && D.EmitElementEvent(diagram, 'new', this);
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
		this.elements.delete(from.name);	// reset the order in the map
		this.elements.set(from.name, from);
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
	findCells(diagram)
	{
		this.cells.forEach(cell => cell.deregister());
		if (!('morphismToCells' in this))
			this.morphismToCells = new Map();
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
		this.cells.forEach((cell, sig) => cell.register());
	}
	loadCells(diagram)
	{
		this.findCells(diagram);
		this.cells.forEach((cell, sig) => cell.register());
	}
	checkCells()
	{
		this.cells.forEach(cell => R.workers.equality.postMessage(
		{
			command:'CheckEquivalence',
			diagram:cell.diagram.name,
			cell:cell.signature,
			leftLeg:cell.left.map(m => m.to.signature),
			rightLeg:cell.right.map(m => m.to.signature)
		}));
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
	forEachAssertion(fn)
	{
		this.elements.forEach(elt => elt instanceof Assertion && fn(elt), this);
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
		this.signature = U.SigArray(this.expand().map(m => m.signature));
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
		delete a.basename;
		if (!('morphisms' in a))
			a.morphisms = this.morphisms.map(r => r.name);	// TODO use local name if possible
		return a;
	}
	uses(mor, start = true)
	{
		if (!start && this.isEquivalent(mor))		// if looking for a recursive function, this and mor may be the same from the start
			return true;
		for (let i=0; i<this.morphisms.length; ++i)
			if (this.morphisms[i].uses(mor, false))
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
	expand(expansion = [])
	{
		const type = this.constructor.name;
		this.morphisms.map(m => m.constructor.name === type && m.dual === this.dual ? m.expand(expansion) : expansion.push(m));
		return expansion;
	}
	updateProperName()
	{
		this.morphisms.map(m => m.updateProperName());
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
				throw `domain and codomain are not the same\n${morphisms[i].codomain.properName}\n${morphisms[i+1].domain.properName}`;
			}
		nuArgs.properName = Composite.ProperName(morphisms);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.constructor.name === 'Composite' && D.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td('Composite')));
	}
	getDecoration()
	{
		return D.default.composite;
	}
	getSequenceGraph()
	{
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
		return seqGraph;
	}
	getGraph(data = {position:0})
	{
		const seqGraph = this.getSequenceGraph();
		seqGraph.traceLinks(seqGraph);
		const cnt = this.morphisms.length;
		seqGraph.graphs[0].reduceLinks(cnt);
		seqGraph.graphs[cnt].reduceLinks(cnt);
		const graph = super.getGraph(data);
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
	loadItem()
	{
		super.loadItem();
		R.LoadItem(this.diagram, this, [this], this.morphisms);
	}
	static Basename(diagram, args)
	{
		const basename = `Cm{${args.morphisms.map(m => typeof m === 'string' ? m : m.refName(diagram)).join(',')}}mC`;
		return basename;
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
	static isComposite(morphisms)
	{
		for(let i=0; i<morphisms.length -1; ++i)
			if (!morphisms[i].codomain.isEquivalent(morphisms[i+1].domain))
				return false;
		return true;
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
		this.constructor.name === 'ProductMorphism' && D.EmitElementEvent(diagram, 'new', this);
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
	loadItem()
	{
		super.loadItem();
		this.morphisms.map((m, i) =>
		{
			const pDom = FactorMorphism.Signature(this.diagram, this.domain, [i], this.dual);
			const pCod = FactorMorphism.Signature(this.diagram, this.codomain, [i], this.dual);
			if (this.dual)
				R.LoadItem(this.diagram, this, [this, pCod], [pDom, m]);
			else
				R.LoadItem(this.diagram, this, [pCod, this], [m, pDom]);
		});
	}
	updateProperName()
	{
		super.updateProperName();
		this.properName = MultiMorphism.ProperName(this.morphisms, this.dual);
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		if (args.morphisms[0] instanceof Morphism)
		{
			const basename = `${c}Pm{${args.morphisms.map(m => m.refName(diagram)).join(',')}}mP${c}`;
			return basename;
		}
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
		this.constructor.name === 'ProductAssembly' && D.EmitElementEvent(diagram, 'new', this);
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
	loadItem()
	{
		super.loadItem();
		this.morphisms.map((m, i) =>
		{
			const pCod = this.diagram.get('FactorMorphism', {domain:this.codomain, factors:[i], dual:this.dual});
			R.LoadItem(this.diagram, this, [m], this.dual ? [this, pCod] : [pCod, this]);
		});
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		const basename = `${c}Pa{${args.morphisms.map(m => typeof m === 'string' ? m : m.refName(diagram)).join(',')}}aP${c}`;
		return basename;
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
		this.constructor.name === 'FactorMorphism' && D.EmitElementEvent(diagram, 'new', this);
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
	loadItem()
	{
		super.loadItem();
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
				R.LoadItem(this.diagram, this, [base], [fm, this]);
				if (!this.dual && this.domain.isTerminal() && this.codomain.isTerminal())
					R.LoadItem(this.diagram, this, [base], [fm, this]);
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
		const c = args.dual ? 'C' : '';
		const obj = diagram.getElement(dual ? args.codomain : args.domain);
		let basename = `${c}Fa{${obj.refName(diagram)},`;
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = obj.getFactor(indices);
			if (f.isTerminal())	// TODO dual object
				basename += this.dual ? '#0' : '#1';
			else
				basename += f.refName(diagram);
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
	static allFactorsEqual(factors)
	{
		return factors.every((v, i) => U.ArrayEquals(v, factors[0]));
	}
	static ProperName(diagram, domain, factors, dual, cofactors = null)
	{
		const obj = domain instanceof NamedObject ? domain.source : domain;
		if (FactorMorphism.isIdentity(factors, 'objects' in obj ? obj.objects.length : 1))
			return 'id';
		if (factors.length > 1 && FactorMorphism.allFactorsEqual(factors))
			return (dual ? '&nabla;' : '&Delta;') + domain.properName;
		return `${dual ? '&#119894;' : '&#119901;'}${factors.map(f => f === -1 || f.length === 0 ? '' : `&#8202;${U.subscript(f)}`).join(',')}`;
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
	static isReference(factors)		// no duplicate factors
	{
		const unique = [];
		if (factors.length > 0)
			for (let i=0; i<factors.length; ++i)
			{
				const factor = factors[i];
				if (factor === -1)
					continue;
				if (factor.length === 0)
					return false;
				if (unique.length > 0 && unique.reduce((r, f) => r || U.ArrayEquals(factor, f), false))
					return false;
				unique.push(factor);
			}
		return true;
	}
	static isIdentity(factors, length)
	{
		if (factors.length !== length)
			return false;
		if (factors.length === 1 && Array.isArray(factors[0]) && factors[0].length === 0)
			return true;
		return factors.reduce((r, fctr, i) => r && typeof fctr === 'number' ? i === fctr : i === fctr[0] && fctr.length === 1, true);
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
		if (!nuArgs.homFactors.reduce((r, f) => r && U.HasFactor(nuArgs.domFactors, f) === -1, true) &&
				!nuArgs.domFactors.reduce((r, f) => r && U.HasFactor(nuArgs.homFactors, f) === -1, true))	// do not share links
			throw 'dom and hom factors overlap';
		super(diagram, nuArgs);
		this.properName = LambdaMorphism.ProperName(preCurry, nuArgs.domFactors, nuArgs.homFactors);
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = nuArgs.homFactors;
		this.signature = this.getLambdaSignature();
		this.constructor.name === 'LambdaMorphism' && D.EmitElementEvent(diagram, 'new', this);
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
	loadItem(diagram)
	{
		super.loadItem(diagram);
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
		const basename = `Lm{${preCur.refName(diagram)}:${U.a2s(args.domFactors)}:${U.a2s(args.homFactors)}}mL`;
		return basename;
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
		this.constructor.name === 'HomMorphism' && D.EmitElementEvent(diagram, 'new', this);
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
		const basename = `Ho{${args.morphisms.map(m => typeof m === 'string' ? m : m.refName(diagram)).join(',')}}oH`;
		return basename;
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
		this.constructor.name === 'Evaluation' && D.EmitElementEvent(diagram, 'new', this);
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
		const basename = `Ev{${typeof args.domain === 'string' ? args.domain : args.domain.refName(diagram)}}vE`;
		return basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Evaluation.Basename(diagram, args)});
	}
	static ProperName(object)
	{
		return '&#119890;';
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
		this.constructor.name === 'Distribute' && D.EmitElementEvent(diagram, 'new', this);
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
		const basename = `Di{${args.domain.refName(diagram)}}-${args.side}iD`;
		return basename;
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
		this.constructor.name === 'Dedistribute' && D.EmitElementEvent(diagram, 'new', this);
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
		const basename = `De{${args.domain.refName(diagram)}}eD`;
		return basename;
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
		this.constructor.name === 'Functor' && D.EmitElementEvent(diagram, 'new', this);
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
			version:					{value:U.GetArg(args, 'version', 0),			writable:true},
//			viewport:					{value:{x:0, y:0, scale:1.0, width:D.Width(), height:D.Height(), visible:false},	writable:true},
		});
		if ('references' in args)
			args.references.map(r => this.addReference(r, false));
		if ('elements' in nuArgs)
			this.codomain.process(this, nuArgs.elements, this.elements);
		if ('domainElements' in nuArgs)
			this.domain.process(this, nuArgs.domainElements);
		R.SetDiagramInfo(this);
		if ('hiddenCells' in nuArgs)
			nuArgs.hiddenCells.map(sig => this.domain.hiddenCells.add(sig));
		this.postProcess();
		diagram && this.constructor.name === 'Diagram' && D.EmitCATEvent('new', diagram, this);
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			const name = this.name;
			R.catalog.delete(name);
			D.diagramPNGs.delete(name);
			if (R.diagram === this)
			{
				R.diagram = null;
				D.session.default = null;
				D.EmitViewEvent('catalog');
			}
			this.svgRoot && this.svgRoot.remove();
			['.json', '.png', '.log', '-viewport.json', '-placement.json'].map(ext => U.removefile(`${name}${ext}`));		// remove local files
			this.elements.forEach(elt => this.codomain.elements.delete(elt.name));
			D.EmitDiagramEvent(this, 'delete', this.name);
		}
	}
	addElement(elt)
	{
		const isIndex = U.IsIndexElement(elt);
		const cat = isIndex ? this.domain : this.codomain;
		if (cat.elements.has(elt.name))
			throw `Element with given name ${U.HtmlSafe(elt.name)} already exists in category ${U.HtmlSafe(cat.name)}`;
		if (this.elements.has(elt.basename))
			throw `Element with given basename ${U.HtmlSafe(elt.basename)} already exists in diagram`;
		!isIndex && this.elements.set(elt.basename, elt);
		cat.elements.set(elt.name, elt);
	}
	help()
	{
		const help = super.help();
		help.appendChild(H3.tr(H3.td('Type:'), H3.td('Diagram')));
		const btnSize = D.default.button.small;
		const toolbar2 = D.toolbar.element.querySelector('div #help-toolbar2');
		if (R.user.status === 'logged-in' && R.cloud && this.user === R.user.name)
		{
			if (R.isLocalNewer(this.name))
			{
				const btn = D.getIcon('upload', 'upload', e => this.upload(e, false), 'Upload to cloud ' + R.cloudURL, btnSize, false, 'diagramUploadBtn');
				toolbar2.appendChild(btn);
			}
			if (R.isCloudNewer(this.name))
				toolbar2.appendChild(D.getIcon('downcloud', 'downcloud', e => this.download(e, false), 'Download from cloud ' + R.cloudURL, btnSize, false));
		}
		toolbar2.appendChild(D.getIcon('json', 'download-json', e => this.downloadJSON(e), 'Download JSON', btnSize));
		toolbar2.appendChild(D.getIcon('png', 'download-png', e => window.open(`diagram/${this.name}.png`, btnSize,
					`height=${D.snapshotHeight}, width=${D.snapshotWidth}, toolbar=0, location=0, status=0, scrollbars=0, resizeable=0`), 'View PNG'));
		return help;
	}
	purge()
	{
		let cnt = 0;
		do
		{
			cnt = [...this.elements.values()].filter(e => e.canSave() && e.refcnt <= 0).map(e => e.decrRefcnt()).length;
		}
		while(cnt > 0);
	}
	json()
	{
		const a = super.json();
		a.references = [...this.references.keys()];
		a.domainElements = [...this.domain.elements.values()].filter(e => ((e.to && e.to.canSave()) || (!('to' in e)))).map(e => e.json());
		a.domainElements.map(elt =>
		{
			delete elt.diagram;
			delete elt.name;
			delete elt.category;
			if (elt.description === '')
				delete elt.description;
		});
		this.purge();
		a.elements = [...this.elements.values()].filter(e => e.canSave()).map(e => e.json());
		const procJson = elt =>
		{
			if (elt.diagram === this.name)
			{
				delete elt.diagram;
				delete elt.name;
			}
			if (elt.category === this.codomain.name)
				delete elt.category;
			if (elt.description === '')
				delete elt.description;
		};
		a.elements.map(procJson);
		a.readonly = this.readonly;
		a.user = this.user;
		a.timestamp = this.timestamp;
		a.version = this.version;
		if (this.domain.hiddenCells.size > 0)
			a.hiddenCells = U.Clone([...this.domain.hiddenCells]);
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
	// in full-screen mode, where were we
	getViewport()
	{
		let viewport = U.Clone(D.viewports.get(this.name));
		if (!viewport)
			viewport = D.readViewport(this.name);
		viewport = viewport ? viewport : {x:0, y:0, scale:1, visible:false};
		D.viewports.set(this.name, viewport);
		return viewport;
	}
	saveViewport(vp)
	{
		const viewport = {x:vp.x, y:vp.y, scale:vp.scale, timestamp:Date.now()};
		U.writefile(`${this.name}-viewport.json`, JSON.stringify(viewport));
		D.viewports.set(this.name, viewport);
	}
	// where the diagram is placed in the current session
	getPlacement()
	{
		let placement = D.placements.get(this.name);
		if (!placement)
		{
			const str = U.readfile(`${this.name}-placement.json`);
			if (str)
			{
				placement = JSON.parse(str);
				D.placements.set(this.name, placement);
				return placement;
			}
			const bbox = this.svgRoot.getBBox();
			return {x:bbox.x, y:bbox.y, scale:1, visible:false};
		}
		return placement ? U.Clone(placement) : {x:0, y:0, scale:1, visible:false};
	}
	setPlacement(args, emit = true)
	{
		const x = Math.round(args.x);
		const y = Math.round(args.y);
		const scale = args.scale;
		this.svgTranslate.setAttribute('transform', `translate(${x} ${y}) scale(${scale} ${scale})`);
		const placement = {x, y, scale, timestamp:Date.now()};
		U.writefile(`${this.name}-placement.json`, JSON.stringify(placement));
		D.placements.set(this.name, placement);
		emit && D.EmitViewEvent('diagram', this);
	}
	setPlacementByBBox(bbox)
	{
		this.setPlacement(D.getViewportByBBox(bbox));
	}
	getSessionBBox()
	{
		const group = this.svgRoot.querySelector('#' + this.elementId('T'));
		return group.getBBox();
	}
	home()
	{
		this.removeGrounds();
		D.setSessionViewportByBBox(this.svgRoot.getBBox());
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
		if (this.svgBase && !(element instanceof Assertion))
			element.getSVG(this.svgBase);
	}
	actionHtml(e, name, args = {})
	{
		D.toolbar.deactivateButtons();
		D.RemoveChildren(D.toolbar.help);
		D.toolbar.clearError();
		const action = this.codomain.actions.get(name);
		if (action && action.hasForm(R.diagram, this.selected))
		{
			D.setActiveIcon(e.target, true);
			action.html(e, R.diagram, this.selected, args);
		}
	}
	activate(e, name, args)
	{
		D.toolbar.deactivateButtons();
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
	deselect(...elts)
	{
		elts.map(elt =>
		{
			const ndx = this.selected.indexOf(elt);
			ndx > -1 && this.selected.splice(ndx, 1);
			elt.showSelected(false);
			D.EmitDiagramEvent(this, 'deselect', elt);
		});
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
			this.selected.filter(m => m instanceof Morphism).map(m => this.deselect(m.domain, m.codomain));
			D.EmitElementEvent(this, 'select', elt);		// TODO?
			D.EmitDiagramEvent(this, 'select', elt);
		}
	}
	makeSelected(...elts)
	{
		if (this.selected.length > 0)
		{
			this.selected.map(elt => elt.showSelected(false));
			this.selected.filter(elt => !this.selected.includes(elt)).map(elt => D.EmitDiagramEvent(this, 'deselect', elt));
			this.selected.length = 0;
		}
		if (elts.length > 0)
			elts.map(elt => this.addSelected(elt));
		else
			D.EmitDiagramEvent(this, 'select', '');
	}
	deselectAll(e)
	{
		this.makeSelected();
	}
	selectAll()
	{
		this.deselectAll();
		this.domain.elements.forEach(e => this.addSelected(e));
		this.assertions.forEach(e =>this.addSelected(e));
	}
	userSelectElement(e, name)
	{
		const elt = this.getElement(name);
		if (elt)
		{
			D.dragStart = D.mouse.sessionPosition();
			if (!this.selected.includes(elt))
				e.shiftKey ? this.addSelected(elt) : this.makeSelected(elt);
			else if (e.shiftKey)
				this.deselect(elt);
			else
				D.toolbar.show(e);
			if (elt instanceof DiagramObject)
				elt.orig = {x:elt.x, y:elt.y};
		}
		else if (this.domain.cells.has(name))
		{
			const cell = this.domain.cells.get(name);
			this.addSelected(cell);
		}
		else
			this.deselectAll(e);	// error?
	}
	areaSelect(e)
	{
		const p = this.userToDiagramCoords(D.GetAreaSelectCoords(e));
		const q = new D2(p.x + p.width, p.y + p.height);
		let selected = [];
		this.domain.elements.forEach(elt =>
		{
			if (elt instanceof DiagramMorphism && D2.Inside(p, elt.domain, q) && D2.Inside(p, elt.codomain, q))
				selected.push(elt);
			else if (D2.Inside(p, elt, q))
				selected.push(elt);
		});
		selected.map(elt => this.addSelected(elt));
	}
	getAssertion(sig)
	{
		for (const [n, a] of this.assertions)
			if (sig === a.signature)
				return a;
		return null;
	}
	updateDragObjects(majorGrid)
	{
		D.toolbar.hide();
		D.statusbar.hide();
		let delta = D.mouse.sessionPosition().subtract(D.dragStart);
		const placement = this.getPlacement();
		delta = delta.scale(1.0 / placement.scale);
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
		dragObjects.forEach(o =>
		{
			o.update(delta.add(o.orig), majorGrid);
			if (o instanceof DiagramObject)
			{
				o.domains.forEach(updateMorphism);
				o.codomains.forEach(updateMorphism);
			}
		});
		this.updateBackground();
	}
	placeText(description, xy, height = '24', weight = 'normal', select = true)
	{
		const txt = new DiagramText(this, {description, xy, height, weight});
		const bbox = new D2(txt.getBBox());
		let offbox = new D2(bbox);
		while (this.hasOverlap(offbox, txt.name))
			offbox = offbox.add(D.default.stdOffset);
		txt.update(new D2(xy).add(offbox.subtract(bbox)));
		if (select && R.diagram)
			this.makeSelected(txt);
		return txt;
	}
	placeObject(to, xyIn, select = true)
	{
		const xy = xyIn ? new D2(D.Grid(xyIn)) : D.Center(this);
		const from = new DiagramObject(this, {xy, to});
		if (select)
			this.makeSelected(from);
		D.EmitElementEvent(this, 'new', from);
		return from;
	}
	findEmptySpot(xy)
	{
		let gxy = D.Grid(xy, true);
		gxy.width = 20;
		gxy.height = 20;
		while(this.hasOverlap(gxy))
			gxy.y += D.gridSize();
		return gxy;
	}
	placeMorphism(to, xyDom = null, xyCod = null, select = true)
	{
		if (typeof to === 'string')
			to = this.getElement(to);
		let xyD = null;
		let domain = null;
		if (xyDom instanceof DiagramObject)
		{
			if (!xyDom.to.isEquivalent(to.domain))
				throw 'index object target does not match morphism domain';
			xyD = new D2(xyDom);
			domain = xyDom;
		}
		else
		{
			xyD = xyDom ? this.findEmptySpot(xyDom) : D.toolbar.mouseCoords ? D.toolbar.mouseCoords : D.Center(R.diagram);	// use original location
			domain = new DiagramObject(this, {to:to.domain, xy:xyD});
		}
		let xyC = null;
		let codomain = null;
		if (xyCod instanceof DiagramObject)
		{
			if (xyCod.to !== to.codomain)
				throw 'index object target does not match morphism codomain';
			codomain = xyCod;
		}
		else if (typeof xyCod === 'object' && xyCod !== null)
		{
			let xy = new D2(xyCod);
			codomain = new DiagramObject(this, {to:to.codomain, xy});
		}
		else
		{
			const ad = D.ArrowDirection();
			const tw = to.textWidth();
			let xy = new D2({x:xyD.x + Math.min(ad.x, tw), y:xyD.y + ad.y});
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
	placeElement(elt, position)
	{
		if (elt instanceof CatObject)
			this.placeObject(elt, position);
		else if (elt instanceof Morphism)
			this.placeMorphism(elt, position, null, true);
		else if (typeof elt === 'string')
			this.placeText(elt, position);
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
		const elts = this.svgBase.querySelectorAll('.object, .diagramText, .morphTxt, .cellTxt, .morphism');
		let r = null;
		for (let i=0; i<elts.length; ++i)
		{
			const svg = elts[i];
			if (svg.dataset.name === except)
				continue;
			const elt = this.getElement(svg.dataset.name);
			if (svg instanceof SVGPathElement)
			{
				if (!elt.bezier && D2.lineBoxIntersect(elt.start, elt.end, box))
						return true;
				continue;
			}
			let compBox = null;
			if (elt instanceof DiagramObject)
				compBox = elt.getBBox();
			else if (elt instanceof DiagramText)
				compBox = elt.getBBox();
			else if (elt instanceof DiagramMorphism)
				compBox = elt.getSvgNameBBox();
			else
				compBox = svg.getBBox();
			if (D2.Overlap(box, new D2(compBox)))
				return true;
		}
		return false;
	}
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	makeGrounds()
	{
		const bkgnd = H3.rect(`##${this.elementId('background')}.diagramBackground`, {x:0, y:0, width:D.Width(), height:D.Height()});
		const f4gnd = H3.rect(`##${this.elementId('foreground')}.diagramForeground`, {x:0, y:0, width:D.Width(), height:D.Height(), 'data-name':this.name, 'data-type':'diagram'});
		f4gnd.ondblclick = e => R.diagram !== this && R.SelectDiagram(this);
		let origClick = null;	// the original mousedown location in session coords
		let origLoc = null;		// the original diagram location in sesssion coords
		const onMouseMove = e =>
		{
			const viewport = D.session.viewport;
			const locNow = D.userToSessionCoords({x:e.clientX, y:e.clientY}).subtract(origClick).add(origLoc);
			this.setPlacement({x:locNow.x, y:locNow.y, scale:this.getPlacement().scale});	// scale unchanged
			D.toolbar.hide();
		};
		f4gnd.onmouseup = e => document.removeEventListener('mousemove', onMouseMove);
		f4gnd.onmousedown = e =>	// move diagram in session coordinates
		{
			if (!D.default.fullscreen)
			{
				// move the diagram
				// TODO area select
				origClick = D.userToSessionCoords({x:e.clientX, y:e.clientY});
				origLoc = new D2(this.getPlacement());
				document.addEventListener('mousemove', onMouseMove);
				e.preventDefault();
			}
		};
		this.svgRoot.insertBefore(bkgnd, this.svgRoot.firstChild);
		this.svgRoot.appendChild(f4gnd);
	}
	removeGrounds()
	{
		this.svgRoot.querySelector('#' + this.elementId('background')).remove();
		this.svgRoot.querySelector('#' + this.elementId('foreground')).remove();
	}
	makeSVG()
	{
		if (!this.svgRoot)
		{
			this.svgRoot = H3.g({id:this.elementId('root'), 'data-name':this.name});
			this.makeGrounds();
			const f4gnd = this.svgRoot.lastElementChild;
			D.diagramSVG.appendChild(this.svgRoot);
			this.svgBase = H3.g({id:`${this.elementId()}-base`});
			this.svgTranslate = H3.g({id:this.elementId('T')}, this.svgBase);
			if (R.default.debug)
			{
				this.svgTranslate.appendChild(H3.path({stroke:'red', d:"M-30 0 L30 0"}));
				this.svgTranslate.appendChild(H3.path({stroke:'red', d:"M0 -30 L0 30"}));
			}
			this.svgRoot.appendChild(this.svgTranslate);
			this.svgRoot.classList.add('hidden');
			this.svgRoot.appendChild(f4gnd);
			this.domain.elements.forEach(elt => this.addSVG(elt));
		}
	}
	upload(e, local = true)
	{
		if (R.cloud && ((this.user === R.user.name && R.user.status === 'logged-in') || R.user.isAdmin()))
		{
			const start = Date.now();
			this.savePng(e, e =>
			{
				let btn = null;
				if (e && 'target' in e)
				{
					btn = e.target.parentNode.querySelector('animateTransform');
					if (btn)	// start button animation
					{
						btn.setAttribute('repeatCount', 'indefinite');
						btn.beginElement();
					}
				}
				R.upload(e, this, local, res =>
				{
					btn && btn.setAttribute('repeatCount', 1);
					if (!res.ok)
					{
						if (res.status === 401)		// Unauthorized
							R.cloud.logout();
						D.RecordError(res.statusText);
						return;
					}
					R.default.debug && console.log('uploaded', this.name);
					const info = R.GetDiagramInfo(this.name);
					info.cloudTimestamp = info.timestamp;
					R.catalog.set(this.name, info);
					const delta = Date.now() - start;
					if (e)
					{
						D.statusbar.show(e, 'Uploaded diagram', 1);
						console.log('diagram uploaded ms:', delta);
						D.EmitCATEvent('upload', this.name);
					}
				});
			});
		}
		else
			D.statusbar.show(e, 'You need to be logged in to upload your work.', 2);
	}
	diagramToUserCoords(xy)
	{
		return D.sessionToUserCoords(this.diagramToSessionCoords(xy));
	}
	userToDiagramCoords(xy)
	{
		const placement = this.getPlacement();
		const sessScale = 1.0 / D.session.viewport.scale;
		const dgrmScale = 1.0 / placement.scale;
		if (isNaN(placement.x) || isNaN(sessScale) || isNaN(dgrmScale))
			throw 'NaN in coords';
		let d2 = new D2(	sessScale * (xy.x - D.session.viewport.x),
							sessScale * (xy.y - D.session.viewport.y));
		d2 = d2.subtract({x:placement.x, y:placement.y}).scale(dgrmScale);
		if ('width' in xy && xy.width > 0)
		{
			const s = sessScale * dgrmScale;
			d2.width = s * xy.width;
			d2.height = s * xy.height;
		}
		if (false)
			this.svgTranslate.appendChild(H3.circle('.ball', {cx:d2.x, cy:d2.y, r:5, fill:'red'}));
		return d2;
	}
	diagramToSessionCoords(xy)
	{
		const placement = this.getPlacement();
		const s = placement.scale;
		const sssn = new D2(xy).scale(s).add(placement);
		if ('width' in xy)
		{
			sssn.width = xy.width * s;
			sssn.height = xy.height * s;
		}
		return sssn;
	}
	sessionToDiagramCoords(xy)
	{
		const placement = this.getPlacement();
		const s = 1.0 / placement.scale;
		if (isNaN(placement.x) || isNaN(placement.y) || isNaN(s))
			throw 'NaN in coords';
		let d2 = new D2(xy);
		d2 = d2.subtract({x:placement.x, y:placement.y}).scale(s);
		if ('width' in xy && xy.width > 0)
		{
			d2.width = s * xy.width;
			d2.height = s * xy.height;
		}
		if (false)
			this.svgTranslate.appendChild(H3.circle('.ball', {cx:d2.x, cy:d2.y, r:5, fill:'red'}));
		return d2;
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
	commitElementText(e, name, txtbox, attribute)
	{
		D.closeActiveTextEdit();
		txtbox.contentEditable = false;
		const elt = this.getElement(name);
		const value = txtbox.innerText.trimRight();	// cannot get rid of newlines on the end in a text box
		txtbox.innerHTML = U.HtmlEntitySafe(value);
		const old = elt.editText(e, attribute, value);
		this.log({command:'editText', name, attribute, value});		// use old name
		this.antilog({command:'editText', name:elt.name, attribute, value:old});	// use new name
		e && e instanceof Event && e.stopPropagation();
		if (!(elt instanceof DiagramText))
			this.updateProperName(elt);
		D.EmitElementEvent(this, 'update', elt);
	}
	editElementText(e, elt, id, attribute)
	{
		D.toolbar.clearError();
		try
		{
			const qry = `#${id} ${attribute === 'properName' ? 'proper-name' : attribute}`;
			const txtbox = document.querySelector(qry);
			if (this.isEditable() && txtbox.contentEditable === 'true' && txtbox.textContent !== '')
				this.commitElementText(e, elt.name, txtbox, attribute);
			else
			{
				txtbox.contentEditable = true;
				txtbox.focus();
				txtbox.onkeydown = e =>
				{
					e.stopPropagation();
					e.key === 'Enter' && this.commitElementText(e, elt.name, txtbox, attribute);
				};
				if (attribute === 'basename')
					txtbox.onkeyup = e => D.inputBasenameSearch(e, this, e => e.stopPropagation(), elt);
				else
					txtbox.onkeyup = e => e.stopPropagation();
			}
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
		!exist && this.domain.forEachMorphism(m => m.update());
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
		this.references.forEach(r =>
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
				this.updateTimestamp();
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
		emit && D.EmitDiagramEvent(this, 'addReference', diagram.name);
	}
	unlock(e)
	{
		if (this.user === R.user.name)
			this.readonly = false;
		this.log({command:'unlock'});
		D.EmitCATEvent('update', this);
	}
	lock(e)
	{
		if (this.user === R.user.name)
			this.readonly = true;
		this.log({command:'lock'});
		D.EmitCATEvent('update', this);
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
	getObjects(all = true)
	{
		const objects = new Set();
		this.forEachObject(o => objects.add(o));
		all && this.allReferences.forEach((cnt, name) =>
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachObject(o => objects.add(o));
		});
		return [...objects];
	}
	getMorphisms(all = true)
	{
		const morphisms = new Set();
		this.forEachMorphism(m => morphisms.add(m));
		all && this.allReferences.forEach((cnt, name) =>
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachMorphism(m => morphisms.add(m));
		});
		return [...morphisms];
	}
	getTexts()
	{
		const texts = [];
		this.forEachText(m => texts.push(m));
		return texts;
	}
	addAssertion(cell, equal)
	{
		const a = this.get('Assertion', {signature:cell.signature, equal});
		a.initialize();
		return a;
	}
	loadCells()
	{
		this.domain.loadCells(this);
	}
	emphasis(c, on)
	{
		const elt = this.getElement(c);
		D.mouseover = on ? elt : null;
		if (elt)
		{
			if (elt instanceof DiagramMorphism || elt instanceof DiagramObject || elt instanceof DiagramText)
				elt.emphasis(on);
			else
			{
				const emphs = [...this.svgRoot.querySelectorAll(`[data-to="${elt.name}"]`)];
				emphs.map(emph => on ? emph.classList.add('emphasis') : emph.classList.remove('emphasis'));
			}
		}
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
	flattenObject(obj, obj2flat = new Map())
	{
		if (obj2flat.has(obj))
			return obj2flat.get(obj);
		let flat = obj;
		switch(obj.constructor.name)
		{
			case 'NamedObject':
				flat = this.flattenObject(obj.base, obj2flat);
				break;
			case 'ProductObject':
				const flats = obj.objects.map(o => this.flattenObject(o, obj2flat));
				flat = obj.dual ? this.coprod(...flats) : this.prod(...flats);
				break;
			case 'HomObject':
				flat = this.hom(...obj.objects.map(o => this.flattenObject(o, obj2flat)));
				break;
		}
		obj2flat.set(obj, flat);
		return flat;
	}
	// is an object covered by the listed factors
	isCovered(obj, factors, issues)
	{
		if (!obj.isTerminal() && factors.length === 1 && factors[0] === -1)		// terminals only cover terminals
			return false;
		const graph = this.flattenObject(obj).getGraph();
		factors.map(fctr => graph.getFactor(fctr).tags.push('covered'));
		let cover = false;
		let good = true;
		let popCover = false;
		const scan = (g, fctr = []) =>
		{
			if (g.tags.includes('covered'))
			{
				if (cover)	// double cover not allowed
				{
					issues.push({message:'Double cover', element:obj.getFactor(fctr)});
					good = false;
				}
				else
				{
					popCover = true;
					cover = true;
				}
			}
			else if (g.isLeaf())		// hit a leaf with no cover
			{
				issues.push({message:'Leaf not covered', element:obj.getFactor(fctr)});
				good = false;
			}
			else
				g.graphs.map((sub, i) =>
				{
					const nuFctr = fctr.slice();
					nuFctr.push(i);
					scan(sub, nuFctr);
				});
			if (popCover)
			{
				cover = false;
				popCover = false;
			}
		};
		scan(graph);
		return good;
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
		try
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
			if (!(elt instanceof DiagramMorphism) && !(elt instanceof Assertion) && 'loadItem' in elt)
				elt.loadItem();
			return elt;
		}
		catch(x)
		{
			D.RecordError(this.name + ': ' + x);
		}
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
		const args = {domain:obj, factors, dual:false};
		return this.get('FactorMorphism', args);
	}
	cofctr(obj, factors)
	{
		const args = {codomain:obj, factors, dual:true};
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
			m.to.loadItem();
			oldTo.decrRefcnt();
			m.svg_name.innerHTML = m.to.properName;
			m.update();
			this.makeSelected(m);
			this.actionHtml(e, 'help');
			this.editElementText(e, m, m.to.elementId(), 'basename');
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
		D.EmitObjectEvent(this, 'fuse', target);
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
		this.elements.forEach(elt => elt !== to && elt.uses(to) && elt.updateProperName(to));
		this.domain.elements.forEach(from => from.to && from.to.uses(to) && from.updateProperName(to));
	}
	logViewCommand()
	{
		const log = this._log;
		if (log.length > 0 && log[log.length -1].command === 'view')	// replace last view command?
			D.ttyPanel.logSection.removeLogCommand(null, log.length -1);
		const placement = this.getPlacement();
		this.log({command:'view', x:Math.round(placement.x), y:Math.round(placement.y), scale:Math.round(10000.0 * placement.scale)/10000.0});
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
			const bbox = this.diagramToSessionCoords(D2.Merge(...elements.map(a => a.getBBox())));
			D.setSessionViewportByBBox(bbox);
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
	sortByCreationOrder(ary)
	{
		const indexing = new Map();
		let ndx = 0;
		this.domain.elements.forEach(elt => indexing.set(elt, ndx++));
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
		this.svgRoot && this.svgRoot.classList.add('hidden');
	}
	show()
	{
		this.svgRoot && this.svgRoot.classList.remove('hidden');
	}
	postProcess()
	{
		this.domain.findCells(this);
		this.domain.elements.forEach(elt => 'postload' in elt && elt.postload());
		this.forEachMorphism(m =>
		{
			'recursor' in m && typeof m.recursor === 'string' && m.setRecursor(m.recursor);
			'data' in m && m.data.forEach((d, i) => m.data.set(i, U.InitializeData(this, m.codomain, d)));
		});
		this.domain.forEachAssertion(a => a.initialize());
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
		const grid = D.gridSize();
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
				this.placeObject(elt, {x, y}, false);
				if (elt.description !== '')
					new DiagramText(this, {xy:{x, y:y + grid/4}, height:grid/10, weight:'normal', description:elt.description});
			}
			else if (elt instanceof Morphism)
			{
				const tw = elt.textWidth();
				let delta = grid;
				while (delta < tw)
					delta += grid;
				const cod = {x:x + delta, y};
				this.placeMorphism(elt, {x, y}, cod, false);
				if (elt.description !== '')
					new DiagramText(this, {xy:{x:x, y:y + grid/4}, height:grid/10, weight:'normal', description:elt.description});
			}
			y += grid;
		});
		R.sync = true;
		D.default.arrow.dir = oldArrowDir;
	}
	autoplaceSvg(bbox, name)
	{
		let nubox = new D2(bbox);
		nubox.x -= D.default.margin;
		nubox.width += D.default.margin;
		let elt = null;
		let ndx = 0;
		const scl = 4;
		let offset = new D2();
		while(this.hasOverlap(nubox, name))
		{
			nubox = new D2(bbox);
			const dir = D.directions[ndx % 8];
			offset = dir.scale(scl * Math.trunc((8 + ndx)/8));
			nubox = nubox.add(offset.getXY());
			ndx++;
		}
		return offset.add(bbox);
	}
	updateBackground()
	{
		if (this.svgRoot)
		{
			let dgrmBkgnd = document.getElementById(this.elementId('background'));
			let bkgnd = document.getElementById('diagram-background');
			if (dgrmBkgnd === null)
			{
				this.makeGrounds();
				dgrmBkgnd = document.getElementById(this.elementId('background'));
			}
			const dgrmF4gnd = document.getElementById(this.elementId('foreground'));
			if (D.default.fullscreen)
			{
				dgrmF4gnd.classList.remove('grabbable');
				const scale = 1 / D.session.viewport.scale;
				const pnt = D.userToSessionCoords({x:0, y:0});
				if (bkgnd)
				{
					bkgnd.setAttribute('x', `${pnt.x}px`);
					bkgnd.setAttribute('y', `${pnt.y}px`);
					bkgnd.setAttribute('width', `${scale * D.Width()}px`);
					bkgnd.setAttribute('height', `${scale * D.Height()}px`);
				}
				else
					bkgnd = H3.rect('.diagramBackgroundActive', {id:'diagram-background', 'data-name':this.name, 'data-type':'diagram',
																		x:`${pnt.x}px`, y:`${pnt.y}px`, width:`${scale * D.Width()}px`, height:`${scale * D.Height()}px`});
				this.svgRoot.parentNode.insertBefore(bkgnd, this.svgRoot);
				dgrmBkgnd.classList.add('hidden');
				dgrmF4gnd.classList.add('hidden');
			}
			else
			{
				dgrmBkgnd.classList.remove('hidden');
				dgrmF4gnd.classList.remove('hidden');
				dgrmF4gnd.classList.add('grabbable');
			}
			const bbox = this.getSessionBBox();
			const placement = this.getPlacement();
			const scale = placement.scale;
			const x = scale * bbox.x + placement.x - D.default.diagram.margin;
			const y = scale * bbox.y + placement.y - D.default.diagram.margin;
			const width = 1.1 * scale * bbox.width + 2 * D.default.diagram.margin;
			const height = 1.1 * scale * bbox.height + 2 * D.default.diagram.margin;
			dgrmBkgnd.setAttribute('x', `${x}px`);
			dgrmBkgnd.setAttribute('y', `${y}px`);
			dgrmBkgnd.setAttribute('width', `${width}px`);
			dgrmBkgnd.setAttribute('height', `${height}px`);
			dgrmF4gnd.setAttribute('x', `${x}px`);
			dgrmF4gnd.setAttribute('y', `${y}px`);
			dgrmF4gnd.setAttribute('width', `${width}px`);
			dgrmF4gnd.setAttribute('height', `${height}px`);
		}
	}
	savePng(e, fn = null)
	{
		!D.textEditActive() && D.Svg2canvas(this, (png, pngName) =>
		{
			D.diagramPNGs.set(this.name, png);
			U.writefile(`${this.name}.png`, png);
			D.EmitCATEvent('png', this);
			fn && fn(e);
		});
	}
	updateTimestamp()
	{
		this.timestamp = Date.now();
		const info = R.catalog.get(this.name);
		info.timestamp = this.timestamp;
	}
	replaceJson(name, json)
	{
		switch(elt.prototype)
		{
			case 'CatObject':
				break;
		}
	}
	copy(basename, properName, description)
	{
		const user = R.user.name;
		const name = `${user}/${basename}`;
		const change = str => str.replace(this.name + '/', name + '/');
		const json = this.json();
		json.name = name;
		json.user = user;
		json.basename = basename;
		json.properName = properName;
		json.description = description;
		json.timestamp = Date.now();
		json.domain = change(json.domain);
		json.diagram = `${user}/${user}`;
		const nameMap = new Map();
		json.elements.forEach(elt =>
		{
			const nuName = `${name}/${elt.basename}`;
			nameMap.set(`${this.name}/${elt.basename}`, nuName);
			elt.name = nuName;
			elt.diagram = name;
			switch(elt.prototype)
			{
				case 'CatObject':
				case 'FiniteObject':
					break;
				case 'ProductObject':
				case 'HomObject':
					elt.objects = elt.objects.map(o => change(o));
					break;
				case 'NamedObject':
					elt.source = change(elt.source);
					break;
				case 'Morphism':
				case 'Identity':
				case 'FactorMorphism':
				case 'LambdaMorphism':
				case 'Evaluation':
				case 'Distribute':
				case 'Dedistribute':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					break;
				case 'NamedMorphism':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					elt.source = change(elt.source);
					break;
				case 'Composite':
				case 'ProductMorphism':
				case 'ProductAssembly':
				case 'HomMorphism':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					elt.morphisms = elt.morphisms.map(m => change(m));
					break;
			}
		});
		json.domainElements.forEach(elt =>
		{
			elt.name = `${name}/${elt.basename}`;
			elt.diagram = name;
			if ('to' in elt && nameMap.has(elt.to))
				elt.to = nameMap.get(elt.to);
			switch(elt.prototype)
			{
				case 'DiagramObject':
				case 'DiagramText':
					break;
				case 'DiagramMorphism':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					break;
				case 'DiagramComposite':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					elt.morphisms = elt.morphisms.map(m => change(m));
					break;
				case 'Assertion':
					elt.left = elt.left.map(m => change(m));
					elt.right = elt.right.map(m => change(m));
					elt.cell = Cell.Signature(elt.left, elt.right);
					break;
			}
		});
		const diagram = new Diagram(R.GetUserDiagram(user), json);
		return diagram;
	}
	moveElements(offset, ...elements)
	{
		const off = new D2(offset);
		const items = new Set();
		elements.map(elt =>
		{
			if (elt instanceof DiagramText || elt instanceof DiagramObject)
				items.add(elt);
			else if (elt instanceof DiagramMorphism)
			{
				items.add(elt.domain);
				items.add(elt.codomain);
			}
		});
		items.forEach(elt =>
		{
			elt.setXY(off.add(elt.getXY()));
			D.EmitElementEvent(this, 'move', elt);
		});
		D.EmitDiagramEvent(this, 'move', '');
	}
	check()
	{
		const errors = [];
		const refs = new Set(this.allReferences.keys());
		refs.add(this.name);
		const chkBasename = elt =>
		{
			switch(elt.prototype)
			{
				case 'CatObject':
				case 'Morphism':
				case 'Assertion':
				case 'DiagramText':
				case 'DiagramObject':
				case 'DiagramMorphism':
					!U.isValidBasename(elt.basename) && errors.push(`Invalid basename: ${U.HtmlEntitySafe(elt.basename)}`);
					break;
			}
		};
		this.domain.elements.forEach(chkBasename);
		this.elements.forEach(chkBasename);
		this.elements.forEach(elt => !refs.has(elt.diagram.name) && errors.push(`Element not in scope: ${U.HtmlEntitySafe(elt.name)}`));
		return errors;
	}
	close()
	{
		this.hide();
		this.svgRoot.remove();
		this.svgRoot = null;
		this.svgBase = null;
		D.EmitCATEvent('close', this.name);
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

class Assembler
{
	constructor(diagram)
	{
		this.diagram = diagram;
		this.objects = new Set();
		this.morphisms = new Set();
		this.origins = new Set();			// objects that are the domains of the composites
		this.references = new Set();		// factor, identity, or terminal morphisms used as references
		this.coreferences = new Set();
		this.overloaded = new Set();
		this.propagated = new Set();
		this.inputs = new Set();
		this.outputs = new Set();
		this.composites = new Map();	// origins+inputs to array of morphisms to compose
//		this.ref2ndx = new Map();
		this.obj2flat = new Map();
		this.processed = new Set();
//		this.folds = new Set();
		this.issues = [];
		this.finished = false;
	}
	reset()
	{
		this.finished = false;
		this.objects.clear();
		this.morphisms.clear();
		this.origins.clear();
		this.references.clear();
		this.coreferences.clear();
		this.overloaded.clear();
		this.propagated.clear();
		this.inputs.clear();
		this.outputs.clear();
		this.composites.clear();
//		this.ref2ndx.clear();
		this.obj2flat.clear();
		this.processed.clear();
//		this.folds.clear();
		this.issues = [];
		this.clearGraphics();
	}
	clearGraphics()
	{
		[...this.diagram.svgRoot.querySelectorAll('.assyError, .assyFold, .assyCoreference, .assyInput, .assyOutput, .assyReference, .assyOrigin')].map(elt => elt.remove());
	}
	static addBall(title, type, cls, o)
	{
		const onmouseenter = e => D.statusbar.show(e, title);
		if (o instanceof DiagramObject)
		{
			const bbox = o.svg.getBBox();
			o.svg.appendChild(H3.ellipse('.ball', {id:type + '-' + o.elementId('asmblr'), class:cls, onmouseenter, rx:bbox.width/2 + D.default.margin}));
		}
		else if (o instanceof DiagramMorphism)
		{
			const bbox = o.svg_nameGroup.getBBox();
			o.svg_nameGroup.appendChild(H3.ellipse('.ball', {id:type + '-' + o.elementId('asmblr'), class:cls, onmouseenter, rx:bbox.width/2 + D.default.margin}));
		}
	}
	static isReference(m)
	{
		const morphism = m instanceof DiagramMorphism ? m.to.basic() : m.basic();
		if (Morphism.isIdentity(morphism))
			return true;
		if (morphism.codomain.isTerminal())
			return true;
		if (morphism instanceof FactorMorphism && !morphism.dual && morphism.domain.basic() instanceof ProductObject && !morphism.domain.dual)
			return FactorMorphism.isReference(morphism.factors);
		return false;
	}
	static isCoreference(m)
	{
		const morphism = m instanceof DiagramMorphism ? m.to.basic() : m.basic();
		if (morphism instanceof FactorMorphism && morphism.dual && morphism.codomain instanceof ProductObject && morphism.codomain.dual)
			return FactorMorphism.isReference(morphism.factors);		// unique factors
		return false;
	}
	static isTerminalId(m)
	{
		return m.domain.isTerminal() && m.codomain.isTerminal();
	}
	deleteEllipse(type, elt)
	{
		const ellipse = this.diagram.svgBase.querySelector(`#${type}-${elt.elementId('asmblr')}`);
		ellipse && ellipse.remove();
	}
	domainCount(object)
	{
		return [...object.domains].filter(m => !(this.references.has(m) || this.coreferences.has(m))).length;
	}
	codomainCount(object)
	{
		return [...object.codomains].filter(m => !(this.references.has(m) || this.coreferences.has(m))).length;
	}
	referenceCount(object)	// the number of references whose domain is the given object
	{
		return [...object.domains].filter(m => this.references.has(m)).length;
	}
	coreferenceCount(object)	// the number of coreferences whose domain is the given object
	{
//		return [...object.domains].filter(m => this.coreferences.has(m)).length;
		return [...object.codomains].filter(m => this.coreferences.has(m)).length;
	}
	useCount(object)	// the number of ref's or coref's whose codomain is this object
	{
		return [...object.codomains].filter(m => this.references.has(m) || this.coreferences.has(m)).length;
	}
	/*
	addFold(fld)
	{
		this.folds.add(fld);
		Assembler.addBall('Fold', 'fold', 'assyFold', fld);
	}
	deleteFold(fld)
	{
		this.folds.delete(fld);
		this.deleteEllipse('fold', fld);
	}
	*/
	isInput(object)
	{
//		let refcnt = 0;
//		object.domains.forEach(m => this.references.has(m) && refcnt++);
//		const refs = [...object.domains].filter(m => this.references.has(m) && (!m.codomain.isTerminal() || m.domain.isTerminal()));
//		return refs.length === 0 && this.codomainCount(object) === 0 && (this.domainCount(object) > 0 || this.coreferenceCount(object) === 0);
		if (this.codomainCount(object) === 0)
		{
			const refs = [...object.domains].filter(m => this.references.has(m) && !Assembler.isTerminalId(m));
			if (refs.length > 0)
				return false;
			// must have a way out
			 if (this.domainCount(object) > 0 || this.coreferenceCount(object) === 0)
				return true;
		}
		return false;
	}
	addInput(obj)
	{
		!this.inputs.has(obj) && Assembler.addBall('Input', 'input', 'assyInput', obj);
		this.inputs.add(obj);
		this.deleteOrigin(obj);
	}
	deleteInput(obj)
	{
		this.inputs.delete(obj);
		this.deleteEllipse('input', obj);
	}
	isOutput(object)
	{
		return this.domainCount(object) === 0 && this.useCount(object) === 0 && (this.codomainCount(object) === 1 || this.referenceCount(object) > 0 || this.coreferenceCount(object) > 0);
	}
	addOutput(obj)
	{
		this.outputs.add(obj);
		Assembler.addBall('Output', 'output', 'assyOutput', obj);
	}
	addOverloaded(ovr)
	{
		this.overloaded.add(ovr);
		Assembler.addBall('Overload', 'ovr', 'assyOverload', ovr);
	}
	/*
	deleteOverloaded(ovr)
	{
		this.overloaded.delete(ovr);
		this.deleteEllipse('ovr', ovr);
	}
	*/
	isOrigin(object)
	{
		const codCnt = this.codomainCount(object);
		const domCnt = this.domainCount(object);
		const refCnt = this.referenceCount(object);
		if (refCnt > 0 && domCnt > 0)	// build a reference and go
			return codCnt === 0;		// an origin cannot be set
		else if (codCnt === 1 && domCnt > 1)
			return true;
		const corCnt = this.coreferenceCount(object);
		const useCnt = this.useCount(object);
		return corCnt === 1 && (domCnt > 0 || useCnt > 0);
	}
	addOrigin(obj)
	{
		if (!this.inputs.has(obj))
		{
			!this.origins.has(obj) && Assembler.addBall('Origin', 'origin', 'assyOrigin', obj);
			this.origins.add(obj);
		}
	}
	deleteOrigin(obj)
	{
		this.origins.delete(obj);
		this.deleteEllipse('origin', obj);
	}
	addError(message, element)
	{
		Assembler.addBall(message, 'error', 'assyError', element);
		this.issues.push({message, element});
	}
	findBlob(obj)		// establish connected graph and issues therein, starting at the diagram object obj
	{
		this.reset();
		const scanning = [obj];
		const scanned = new Set();
		while(scanning.length > 0)	// find loops or homsets > 1
		{
			const domain = scanning.pop();
			scanned.add(domain);
			this.objects.add(domain);
			const scan = scanning;		// jshint
			domain.domains.forEach(m =>
			{
				if (this.morphisms.has(m))
					return;
				this.morphisms.add(m);
				if (m.attributes.has('assyMorphism') && m.attributes.get('assyMorphism'))
					m.to.dual ? this.coreferences.add(m) : this.references.add(m);
				m.makeGraph();
				if (m.isEndo())		// in the index cat, not the target cat
				{
					this.addError('Circularity', m);
					this.issues.push({message:'Circularity cannot be scanned', morphism:m});
					return;
				}
				// propagate down the arrow
				!scanned.has(m.codomain) && scan.push(m.codomain);
			});
			// propagate back up the arrow
			domain.codomains.forEach(m => !scanned.has(m.domain) && scan.push(m.domain));
		}
		this.morphisms.size === 0 && this.issues.push({message:'No morphisms', element:base});
	}
	findOrigins()
	{
		this.objects.forEach(o => this.isOrigin(o) && this.addOrigin(o));
	}
	static getBarGraph(dm)
	{
		const domGraph = dm.domain.assyGraph;
		const codGraph = dm.codomain.assyGraph;
		const barGraph = new Graph(this.diagram);
		barGraph.graphs.push(domGraph);
		barGraph.graphs.push(codGraph);
		return barGraph;
	}
	static mergeTags(o)
	{
		const graph = o.assyGraph;
		let morGraph = null;
		// merge tags from morphism's graph's factor to g
		function tagger(g, fctr) { morGraph.getFactor(fctr).tags.map(t => g.addTag(t)); }
		o.domains.forEach(m =>
		{
			morGraph = m.graph.graphs[0];
			graph.scan(tagger);
		});
		o.codomains.forEach(m =>
		{
			morGraph = m.graph.graphs[1];
			graph.scan(tagger);
		});
	}
	setTag(dm, graph, tag, ndx)
	{
		return graph.getFactor(ndx).addTag(tag);
	}
	//
	// propagate info for all non-factor morphisms in the connected diagram
	//
	addTag(dm, graph, tag, ndx)
	{
		const fctr = graph.getFactor(ndx);
		if (fctr.hasTag(tag) && ndx[0] !== 0)
		{
			if (!fctr.hasTag('Cofactor'))	// cofactor morphs can fold info
				this.addOverloaded(dm);
		}
		else
			fctr.addTag(tag);
	}
	propTag(dm, m, mGraph, barGraph, tag, setFlag)
	{
		this.propagated.add(dm);
		if (m instanceof MultiMorphism)	// break it down
			m.morphisms.map((subm, i) => this.propTag(dm, subm, mGraph.graphs[i], barGraph, tag, setFlag));
		else if (this.references.has(m))		// copy tag on reference links
			mGraph.graphs[0].scan((g, ndx) => g.links.map(lnk => setFlag ? this.setTag(dm, barGraph, tag, lnk) : this.addTag(dm, barGraph, tag, lnk)), [0]);
		else		// tag all pins
			mGraph.graphs[1].scan((g, ndx) => setFlag ? this.setTag(dm, barGraph, tag, ndx) : this.addTag(dm, barGraph, tag, ndx), [1]);
	}
	mergeObjectTags()
	{
		// build flattened graph for each object
		this.objects.forEach(o => o.assyGraph = o.to.getGraph({position:0}, this.obj2flat));
		this.objects.forEach(o => Assembler.mergeTags(o));
		const tagInfo = dm => this.propTag(dm, dm.to, dm.graph, Assembler.getBarGraph(dm), 'info', false);
		const scanning = [...this.origins];
		const scanned = new Set();
		while(scanning.length > 0)
		{
			const src = scanning.pop();
			const scan = scanning;
			src.domains.forEach(m =>
			{
//				// TODO if the product src is covered by projections, then an identity must be propagated
//				if (this.references.has(m) && !this.references.has(m))
				if (this.references.has(m))
					return;
				tagInfo(m);
				!scanned.has(m.codomain) && !scanning.includes(m.codomain) && scan.push(m.codomain) && scanned.add(m.codomain);
			});
			scanned.add(src);
			if (src.to instanceof ProductObject && src.to.dual)
				src.codomains.forEach(m => m.to instanceof FactorMorphism && m.to.dual && m.domain.assyGraph.addTag('info'));
		}
	}
	backLinkTag(m, morGraph, barGraph, tag)
	{
		this.propagated.add(m);
		let didAdd = false;
		morGraph.graphs[1].scan((g, ndx) =>
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
	}
	getReferences(obj)
	{
		const references = [];
		obj.domains.forEach(m => this.references.has(m) && references.push(m));
		return references;
	}
	inputScan()
	{
		this.objects.forEach(o => this.isInput(o) && this.addInput(o));
		this.inputs.forEach(i => i.assyGraph.addTag('info'));
	}
	infoProp()
	{
		const scanning = [...this.inputs];
		const scanned = new Set();
		while(scanning.length > 0)
		{
			const input = scanning.pop();
			const hasTag = input.assyGraph.hasTag('info');
			const scan = scanning;		// jshint
			const inputs2 = this.inputs;		// jshint
			const domScanner = dm =>
			{
				if (this.references.has(dm))
				{
					if (dm.codomain.assyGraph.hasTag('info'))
						inputs2.delete(input);
				}
				if (!scanned.has(dm.codomain))
				{
					this.propTag(dm, dm.to, dm.graph, Assembler.getBarGraph(dm), 'info', true);
					!scan.includes(dm.codomain) && scan.push(dm.codomain);
				}
			};
			input.domains.forEach(domScanner);
			const codScanner = dm =>
			{
				if (this.references.has(dm))
				{
					if (!this.propagated.has(dm))
					{
						this.backLinkTag(dm, dm.graph, Assembler.getBarGraph(dm), 'info');
						!scan.includes(dm.domain) && scan.push(dm.domain);
					}
				}
			};
			input.codomains.forEach(codScanner);
			scanned.add(input);
		}
		// propagate tags from inputs
		this.inputs.forEach(i => i.domains.forEach(m => this.propTag(m, m.to, m.graph, Assembler.getBarGraph(m), 'info', true)));
	}
	outputScan()		// find outputs
	{
		let isIt = true;
		const scannerYes = (g, ndx) => isIt = isIt && g.hasTag('info');
		this.objects.forEach(object => this.isOutput(object) && this.addOutput(object));
	}
	originScan()
	{
		const issueCnt = this.issues.length;
		this.origins.forEach(src =>
		{
			if (!this.inputs.has(src))		// no assembly for inputs
			{
				const refs = [...src.domains].filter(m => this.references.has(m));
				if (refs.length > 0)
				{
					const refIds = refs.filter(ref => Morphism.isIdentity(ref.to));
					if (refIds.length > 1)
					{
						refIds.map(id =>
						{
							this.issues.push({message:'Only one identity allowed to be a reference', element:id});
							this.addError('Only one identity allowed to be a reference', id);
						});
					}
					else if (refIds.length === 0)
					{
						const factors = [];
						refs.map(ref => factors.push(...ref.to.factors));
						if (FactorMorphism.isReference(factors))
						{
							// do the factors cover the origin?
							if (!this.diagram.isCovered(src.to, factors, this.issues))
								this.addError('Origin not covered', src);
						}
						else
						{
							this.issues.push({message:'Factor morphism is not a reference', element:r});
							this.addError('Duplicate factors found', src);
						}
					}	// else the single identity as reference covers everything
				}
			}
		});
		return this.issues.length === issueCnt;
	}
	overloadedScan()
	{
		this.overloaded.forEach(ovr => this.issues.push({message:'object is overloaded', element:ovr.codomain}));
	}
	followComposite(cmp, m)
	{
		const cod = m.codomain;
		if (this.origins.has(cod))
			return cod;
		const morphs = [...cod.domains].filter(m => !this.references.has(m));
		if (morphs.length > 0)
		{
			const next = morphs[0];
			cmp.push(next);
			return this.followComposite(cmp, next);
		}
		else
			return cod;
	}
	startComposites(scanning)
	{
		const obj = scanning.pop();
		const comps = [];
		this.composites.set(obj, comps);
		obj.domains.forEach(m =>
		{
			if (!this.references.has(m) && !this.coreferences.has(m))
			{
				const cmp = [m];
				comps.push(cmp);
				const cod = this.followComposite(cmp, m);
				scanning.push(cod);
			}
		});
	}
	setupComposites()
	{
		const scanning = [...this.inputs, ...this.origins];
		while(scanning.length > 0)
			this.startComposites(scanning);
	}
//	coreferenceScan()
//	{
		/*
		this.coreferences.forEach(cor =>
		{
			if (!this.outputs.has(cor.domain))
			{
				const comps = this.composites.get(cor.domain).filter(cmp => !this.coreferences.has(cmp[cmp.length -1]));
				comps.map(cmp => cmp.length > 0 && this.addFold(cmp[cmp.length -1]));
			}
		});
		this.folds.forEach(fld => this.deleteOverloaded(fld));
		*/
// TODO NEEDED?
//		this.composites.forEach((cmps, obj) => this.composites.set(obj, cmps.filter(cmp => !this.coreferences.has(cmp[0]))));
//	}
	getCompositeMorphisms(scanning, domain, currentDomain, index)
	{
		if (this.composites.has(domain))
		{
			const composites = this.composites.get(domain);
			return composites.length === 0 ? [] : this.composites.get(domain).map(comp =>
			{
				const last = comp.length -1;
				const morphisms = comp.map(m =>m.to);
				// codomain index object
				const codomain = comp[last].codomain;
				if (!this.origins.has(codomain))
				{
					if (codomain.dual && codomain instanceof ProductObject)
					{
						//
						const injections = [...codomain.codomains].filter(m => this.coreferences.has(m));
						injections.map((inj, i) =>
						{
							const fctr = U.pushFactor(index, i);
							this.formMorphism(scanning, inj.domain, inj.domain.to, fctr);
							const references = [...inj.domain.codomains].filter(m => this.references.has(m));
							references.map((ref, j) => this.formMorphism(scanning, ref.domain, ref.domain.to, U.pushFactor(fctr, j)));
						});
					}
					else
					{
						const continuance = this.formMorphism(scanning, codomain, codomain.to, index);
						continuance && morphisms.push(continuance);
					}
				}
				else
				{
					const nuNdx = index.slice();
					nuNdx.pop();
					scanning.unshift({domain:codomain, currentDomain, nuNdx});
				}
				// get the composite so far
				let composite = this.diagram.comp(...morphisms);
				return composite;
			}).filter(m => m);
		}
		else
			return [];
	}
	assembleCoreferences(scanning, coreferences, from, index)
	{
		const diagram = this.diagram;
		const terminal = diagram.getTerminal();
		const domain = from.to;
		if (coreferences.length > 0)
		{
			const dataMorphs = [];
			const homMorphs = [];
			const productAssemblies = [];
			//
			// each element creates its own morphism;
			// that morphism will need its own factor morphism to set it up for evaluation;
			// thus each morphism has the current domain as its own domain;
			// the codomain is something else
			//
			const step1s = [];
			const step2s = [];
			const step3s = [];
			coreferences.map(insert =>
			{
				const fctr = insert.to.factors[0];	// what factor are we hitting in the coproduct?
				// get the morphisms attached to each element
//				const starters = [...insert.domain.codomains].filter(m => !this.coreferences.has(m));
				const starters = [...insert.domain.codomains].filter(m => !this.references.has(m));
				const comps = this.composites.get(insert.domain);
//				starters.concat(this.composites.get(insert.domain));
				comps.map(cmp => starters.push(cmp[0]));
				const homMorphs = starters.map(m => this.formMorphism(scanning, m.domain, m.domain.to, index));
				const homMorph = diagram.prod(...homMorphs);
				step1s[fctr] = diagram.fctr(homMorph.domain, [-1, []]);	// A --> * x A
				const homObj = diagram.hom(homMorph.domain, homMorph.codomain);
				homMorph.incrRefcnt();
				const data = new Map();
				data.set(0, homMorph);	// 0 is the value since the domain is the terminal object
				const dataMorph = new Morphism(diagram, {basename:diagram.getAnon('&sect;'), domain:terminal, codomain:homObj, data});
				dataMorphs[fctr] = dataMorph;
				step2s[fctr] = diagram.prod(dataMorph, diagram.id(homMorph.domain));
				step3s[fctr] = diagram.eval(homMorph.domain, homMorph.codomain);
			});
			// map each coproduct factor A to 1xA
			const step1 = diagram.coprod(...step1s);
			// coproduct of hom-morphs and id's
			const step2 = diagram.coprod(...step2s);
			// get the evaluation maps
			const step3 = diagram.coprod(...step3s);
			// fold the outputs
			let foldFactors = step3.codomain.objects.map(o => step3.codomain.objects.indexOf(o));
			// all factors equal?
			let foldCod = null;
			if (foldFactors.every((v, i) => v === foldFactors[0]))
			{
				foldFactors = foldFactors.map(_ => []);
				foldCod = step3.codomain.objects[0];
			}
			else
			{
				const foldCods = [];
				foldFactors.map(f => f + 1 > foldCods.length && foldCods.push(step3.codomain.objects[f]));
				foldFactors = foldFactors.map(f => [f]);
				foldCod = diagram.coprod(...foldCods);
			}
			const step4 = diagram.cofctr(foldCod, foldFactors);
			return diagram.comp(step1, step2, step3, step4);
		}
	}
	// recursive
	formMorphism(scanning, domain, currentDomain, index = [])
	{
		if (this.processed.has(domain))
			return null;
		//
		// downstream objects that refer to this index object need to find our index
		//
//		[...domain.codomains].map(m => this.references.has(m) && this.ref2ndx.set(m, index));
		//
		// if the domain is an origin then build its preamble
		//
		let preamble = null;
		if (this.origins.has(domain) || this.outputs.has(domain))
		{
			// references attached to the domain
			const refs = [...domain.domains].filter(m => this.references.has(m));
			// all references satisfied?
			if (refs.length === 0)
				this.processed.add(domain);
			else
			{
				// at most one id is allowed as a ref
				const idCnt = refs.filter(r => Morphism.isIdentity(r.to)).length;
				if (idCnt > 1)
				{
					this.issues.push({message:`Too many identities as references (${idCnt})`, element:domain});
					return  null;
				}
				// TODO id's
				const factors = [];
				refs.map(ref => factors.concat(Morphism.getProductFactors(ref.to).filter(f => f !== -1)));
				if (factors.length > 0)
					preamble = !FactorMorphism.isIdentity(factors, 'objects' in domain.to ? domain.to.objects.length : 1) ? this.diagram.fctr(domain.to, factors) : null;
				else
					preamble = this.diagram.id(domain.to);
				this.processed.add(domain);
			}
		}
		//
		// advance scanning
		//
		[...domain.codomains].map((m, i) => this.references.has(m) && scanning.push({domain:m.domain, currentDomain, index}));
		//
		// we get outbound morphisms from the domain from the composites shown in the directed graph,
		// or from the domain being a coproduct assembly of elements
		//
		// first the outbound composites from the domain
		//
		let morphisms = this.getCompositeMorphisms(scanning, domain, currentDomain, index);
		const coreferences = [...domain.codomains].filter(m => this.coreferences.has(m));
		coreferences.length > 0 && morphisms.push(this.assembleCoreferences(scanning, coreferences, domain, index));
		if (preamble && !Morphism.isIdentity(preamble))
			morphisms = morphisms.map(m => this.diagram.comp(preamble, m));
		if (morphisms.length > 0)
			return this.diagram.assy(...morphisms);
		else
			return preamble;
	}
	getBlobMorphism()
	{
		let ndx = 0;
		const scanning = [];
		// ignore inputs that are terminals; the rest form the domain
		[...this.inputs].filter(input => !input.isTerminal()).map(input => scanning.push({domain:input, currentDomain:input.to, index:this.inputs.size === 1 ? [] : [ndx++]}));
		const components = [];
		while(scanning.length > 0)
		{
			const args = scanning.shift();
			const morphism = this.formMorphism(scanning, args.domain, args.currentDomain, args.index);
			morphism && !(morphism instanceof Identity) && components.push(morphism);
		}
		return this.diagram.comp(...components);
	}
	// try to form a morphism from a blob
	assemble(e, base)
	{
		this.reset();
		//
		// establish connected graph and issues therein
		//
		this.findBlob(base);
		//
		// find origins
		//
		this.findOrigins();
		//
		// merge tags from morphism graphs to object graphs
		//
		this.mergeObjectTags();
		//
		// look for inputs; they have no info; there will be too many at first
		//
		this.inputScan();
		//
		// do info propagation for outputs
		//
		this.infoProp();
		//
		// look for outputs; they have info and no non-info factor morphisms
		//
		this.outputScan();
		//
		// scan origins for assembly checks
		//
		if (!this.originScan())
			return;		// errors found
		//
		// setup the composites
		//
		this.setupComposites();
//		this.coreferenceScan();
		//
		// check for overloaded reference objects
		//
		this.overloadedScan();
		//
		// get the blob's morphism
		//
		const morphism = this.getBlobMorphism();
		//
		// place on screen the assemblage of the final composite
		//
		if (morphism)
		{
			if (morphism instanceof Composite)
			{
				const compObjs = D.PlaceComposite(e, this.diagram, morphism);
				this.diagram.viewElements(...this.objects, ...compObjs);
				D.EmitCellEvent(this.diagram, 'check');
			}
			else
			{
				const from = this.diagram.placeMorphism(morphism, base.getXY(), null, true);
				this.diagram.viewElements(...this.objects, from);
			}
		}
		else
		{
			D.statusbar.show(e, 'No morphism assembled');
			this.issues.push({message:'No morphism assembled', element:{}});
		}
		this.finished = true;
		return morphism;
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
