// (C) 2018-2022 Harry Dole
// Catecon:  The Categorical Console
//
// Custom Events:															Emitters
//		Application															-
//			start		app is up and running								[R.initialize]
//			commutivity	toggle cell commutivity								[D.toggleShowCommutivity]
//		Autohide		parts of the GUI are to disapear					-
//			show															[D.autohide]
//			hide															[D.autohide]
// 		CAT																	-
//			close		remove diagram from session							[DiagramTool.getButtons, Diagram.close]
// 			default		diagram is now the default diagram for viewing		[R.SelectDiagram]
//			delete		diagram is deleted
// 			load		diagram now available for viewing, but may have no view yet		[R.readLocal]
// 			new			new diagram exists									[DiagramTool.create, .new, D.uploadJSON, CatalogTool.createDiagram]
// 			unload		diagram unloaded from session
// 			upload		diagram sent to server								[Diagram.upload]
// 		Category
// 			new																[CategoryTool]
// 		Cell															-
// 			new			an cell was created									[Cell.constructor]
// 			delete															[Cell.deregister]
//			check															[D.mouseup, doit: CompositeAction, NameAction, FlipNameAction, PullbackAction, HomSetAction, DetachDomainAction, DeleteAction, setupReplay]
//			commutivity														[worker.onmessage]
// 		Diagram																-
// 			addReference													[Diagram.addReference]
//			category	set default category
//			deselect														[Diagram.deselect]
// 			loadCells	determine cell commutativity
// 			removeReference													[R.removeReference]
// 			select															[Diagram.addSelected, Diagram.makeSelected]
// 			showInternals
// 			view		view changed
// 		Login																[Amazon.registerCognito, .signup, .confirm, .login, .logout]
// 		Object																-
// 			delete
// 			fuse															[Diagram.fuse]
// 			move															[D.mouseup, AlignHorizontalAction.doit, AlignVerticalAction.doit, Diagram.moveElements]
// 			new																[constructors: CatObject, FiniteObject, ProductObject, PullbackObject, HomObject, TensorObject, IndexObject];
// 			update															[LanguageAction.action, FiniteObjectAction.doit]
// 		Morphism															-
// 			detach		detach index morphism domain or codomain			[DetachDomainAction.doit]
// 			new																[Assembly.assemble]
// 			delete
// 			update															[LanguageAction.action, RunAction.editData]
// 		Text																-
// 			delete
// 			move															[D.mouseup, Diagram.moveElements]
// 			new																[constructors: IndexText]
// 			update		change weight, height, ...							[IndexText.updateWeight, .updateHeight]
// 		PNG
// 			new
//		View																-
//			catalog															[Navbar.catalogView, CatalogTool.search .toggle]
//			diagram		view a diagram										[D.eventListener 'CAT','default'; keyboard events, D.zoom, D.replay, D.panHandler, D.uploadJSON, Diagram.viewElements, Diagram.panToElements]
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
{
	sjcl = window.sjcl;
	(function(d)		// load AWS login code
	{
		const a = H3.script();
		a.type = 'text/javascript';
		a.async = true;
		a.id = 'amazon-login-sdk';
		a.src = 'https://api-cdn.amazon.com/sdk/login1.js?v=3';
		d.querySelector('body').appendChild(a);
	})(document);
}

class U		// utilities
{
	static getUserSecret(s)
	{
		return U.sig(`TURKEYINTHESTRAW${s}THEWORLDWONDERS`);
	}
	static getError(err)
	{
		return typeof err === 'string' ? err : `${err.name}: ${err.message}`;
	}
	static clone(o)
	{
		if (null === o || o instanceof Element || (typeof o === 'object' && typeof Blob === 'object' && o instanceof Blob))		// Blob not used in node.js
			return o;
		if (typeof o === 'object')
		{
			if (Array.isArray(o))
				return o.map(a => U.clone(a));
			else if (Map.prototype.isPrototypeOf(o))
				return new Map(o);
			else if (Set.prototype.isPrototypeOf(o))
				return new Set(o);
			else
			{
				let c = {};
				for(const a in o)
					if (o.hasOwnProperty(a))
						c[a] = U.clone(o[a]);
				return c;
			}
		}
		return o;
	}
	static getArg(args, key, dflt)
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
	static jsonMap(m, doKeys = true)
	{
		let data = [];
		m.forEach((v, k) => data.push(doKeys ? [k, v] : v));
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
	static dePunctuate(str)
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
		return U.Cap(U.dePunctuate(s)) + '.';
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
	static arrayEquals(a, b)
	{
		if (a === b)
			return true;
		if (!Array.isArray(a) || !Array.isArray(b))
			return false;
		if (a.length !== b.length)
			return false;
		return a.reduce((r, suba, i) => r && U.arrayEquals(suba, b[i]), true);
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
			.replace(/-/g, '_m_')
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
	static sig(s)
	{
		return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(typeof s === 'string' ? s : JSON.stringify(s)));
	}
	static SigArray(elts)
	{
		if (elts.length === 0)
			return 0;
		else if (elts.length === 1 && typeof elts[0] === 'string')
			return elts[0];	// no sig change for array of length 1
		return U.sig(elts.map(e => Array.isArray(e) ? U.SigArray(e) : e).join());
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
	static isNumeric(obj)
	{
		return obj instanceof ProductObject && obj.dual && obj.objects.reduce((r, oi) => r && oi.getBase().isTerminal(), true);	// convert to numeric?
	}
	static convertData(obj, data)	// hom elements have to be converted from objects to their name
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
					ret = U.isNumeric(obj) ? data : [data[0], U.convertData(obj.objects[data[0]], data[1])];
				else
					ret = obj.objects.map((o, i) => U.convertData(o, data[i]));
				break;
			case 'HomObject':
				ret = data.name;
				break;
			case 'NamedObject':
				ret = U.convertData(obj.base, data);
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
					R.recordError(`No data for ${obj.properName}`);
				break;
			default:
				ret = data;
				break;
		}
		return ret;
	}
	static refcntSorter(a, b) { return a.refcnt > b.refcnt ? -1 : b.refcnt < a.refcnt ? 1 : 0; }		// high to low
	static TimestampSorter(a, b) { return a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0; }
	static NameSorter(a, b) { return a.name > b.name ? 1 : a.name < b.name ? -1 : 0; }		// a to z
	static isIndexItem(elt)
	{
		return elt instanceof IndexObject || elt instanceof IndexText || Arrow.isArrow(elt);
	}
	static HasFactor(factors, someFactor)
	{
		for(let i=0; i<factors.length; ++i)
			if (U.arrayEquals(someFactor, factors[i]))
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
		if (D)		// web browser
			return localStorage.getItem(filename);
		else		// node
		{
			const serverFile = 'public/diagram/' + filename;
			if (fs.existsSync(serverFile))
				return fs.readFileSync(serverFile);
		}
		return null;
	}
	static writefile(filename, data)
	{
		if (D)
		{
			try
			{
				localStorage.setItem(filename, data);
			}
			catch(x)
			{
				R.recordError(x);
			}
		}
		else
			fs.writeFileSync('public/diagram/' + filename, data);
	}
	static removefile(filename)
	{
		D ? localStorage.removeItem(filename) : fs.unlink('diagram/' + filename, _ => {});
	}
	static readTempfile(filename)
	{
		return sessionStorage.getItem(filename);
	}
	static writeTempfile(filename, data)
	{
		sessionStorage.setItem(filename, data);
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
		const args = U.clone(cmd);
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
	static limit(str, lim = 100)
	{
		return str.length < lim ? str : str.substr(0, lim) + '...';
	}
	static dataSig(data)
	{
		return U.SigArray([...data]);
	}
	static localtime(timestamp)
	{
		return new Date(timestamp).toLocaleString();
	}
}
Object.defineProperties(U,
{
	basenameEx:		{value:RegExp('^[a-zA-Z_$]+[a-zA-Z0-9_$\/]*$'),	writable:false},
	finiteEx:		{value:RegExp('^#[0-9]+[0-9]*$'),				writable:false},
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

const _factorial = [1, 1, 2, 6];
class Bezier
{
	constructor(points)
	{
		this.points = points.map(pnt => new D2(pnt));
	}
	degree()
	{
		return this.points.length -1;
	}
	C(u)
	{
		const degree = this.degree();
		return this.points.map((cpnt, i) => cpnt.scale(this.B(degree, i, u))).reduce((r, bpnt) => r.add(bpnt), new D2());
	}
	B(n, i, u)
	{
		return (_factorial[n] / (_factorial[i] * _factorial[n - i])) * Math.pow(u, i) * Math.pow(1 - u, n - i);
	}
	derivative()
	{
		const points = [];
		const degree = this.points.length -1;
		for (let i=0; i<degree; i++)
			points.push(this.points[i+1].sub(this.points[i]).scale(degree));
		return new Bezier(points);
	}
}

class Runtime
{
	constructor()
	{
		Object.defineProperties(this,
		{
			Actions:			{value:{},			writable:false},	// loaded actions
			Cat:				{value:null,		writable:true},
			CAT:				{value:null,		writable:true},		// working nat trans
			$CAT:				{value:null,		writable:true},
			catalog:			{value:new Map(),	writable:true},
			category:			{value:null,		writable:true},		// current category, typically R.diagram.category
			categories:			{value:new Map(),	writable:false},	// available categories
			cloud:				{value:null,		writable:true},		// the authentication cloud we're using
			cloudURL:			{value:null,		writable:true},		// the server we upload to
			URL:				{value:isGUI ? document.location.origin : '',		writable:false},		// the server we upload to
			default:
			{
				value:
				{
					category:		'em/Cat',
					debug:			0,
					showEvents:		false,
				},
				writable:	true,
			},
			diagram:			{value:null,		writable:true},		// current diagram
			factoryDefaults:	{value:null,		writable:true},
			initialized:		{value:false,		writable:true},		// Have we finished the boot sequence and initialized properly?
			languages:			{value:new Map(),	writable:false},
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
					isAdmin:	_ => this.user.cloud && this.user.cloud.permissions.includes('admin') !== null,
					canUpload:	_ => this.user.status === 'logged-in',
				},
				writable:true
			},
			userDiagram:		{value:new Map(),	writable:false},
			workers:			{value:{},			writable:false},
		});
	}
	setupWorkers()
	{
		// equator engine
		const worker = new Worker((D ? '' : './public') + '/js/equator.js');
		worker.onmessage = msg =>		// process return messages from the worker
		{
			const args = msg.data;
			switch(args.command)
			{
				case 'CheckEquivalence':
					const diagram = this.$CAT.getElement(args.diagram);
					const cell = diagram.getCell(args.cell);
					if (!cell)
						return;	// TODO bad cell request
					let type = '';
					let item = null;
					if (args.item)
						item = diagram.getElement(args.item);
					if (args.equal === 1)
					{
						if (cell.commutes === 'equals')
							type = 'equals';
						else if (cell.cellIsComposite())
							type = 'composite';
						else if (cell.isNamedMorphism())
							type = 'named';
						else if (cell.assertion && cell.assertion === 'equals')
							type = 'assertion';
						else if (item instanceof PullbackObject)
							type = item.dual ? 'pushout' : 'pullback';
						else
							type = 'computed';
					}
					else if (args.equal === 0)
						type = 'unknown';
					else
						type = 'notEqual';
					cell.setCommutes(type);
					D && D.emitCellEvent(diagram, 'commutivity', cell);
					const objs = cell.getObjects();
					if (!cell.svg)
						diagram.addSVG(cell);
					cell.update();
					break;
				case 'start':
				case 'LoadDiagrams':
				case 'loadEquality':
				case 'LoadIdentity':
				case 'RemoveEquivalences':
				case 'Info':
					break;
				default:
					console.error('bad message', args.command);
					break;
			}
		};
		this.workers.equator = worker;
		let url = '';
		if (D)
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
	setupCore()
	{
		const CATargs =
		{
			basename:		'CAT',
			user:			'em',
			properName:		'CAT',
			description:	'category of categories',
		};
		this.CAT = new Category(null, CATargs);
		this.CAT.newObject = (diagram, basename) =>
		{
			const name = `${diagram.name}/${basename}`;
			let cat = this.CAT.getElement(name);
			cat = cat ? cat : new Category(diagram, {name, basename});
			this.CAT.elements.set(cat.name, cat);
			return cat;
		};
		const $CATargs =
		{
			codomain:		this.CAT,
			basename:		'$CAT',
			properName:		'$CAT',
			description:	'top level diagram',
			user:			'em',
		};
		this.$CAT = new Diagram(null, $CATargs);
		this.$CAT.sync = false;
		this.userDiagram.set('em', this.$CAT);
		this.Cat = new Category(this.$CAT,
		{
			basename:		'Cat',
			category:		this.CAT,
			description:	'category of smaller categories',
			properName:		'ℂ𝕒𝕥',
			user:			'em',
		});
		const $CatArgs =
		{
			codomain:		this.Cat,
			basename:		'$Cat',
			properName:		'$Cat',
			description:	'Cat diagram',
			user:			'em',
		};
		this.$Cat = new Diagram(null, $CatArgs);
		this.Cat.newObject = (diagram, basename) =>
		{
			const name = `${diagram.name}/${basename}`;
			let cat = this.Cat.getElement(name);
			cat = cat ? cat : new Category(diagram, {name, basename});
			this.Cat.elements.set(cat.name, cat);
			return cat;
		};
		this.sys.Actions = new Category(this.$CAT,
		{
			basename:		'Actions',
			properName:		'Actions',
			description:	'category of currently loaded actions',
		});
	}
	// build categorical actions
	setupActions()
	{
		// function to register a diagram's actions
		const setup = diagram => D && diagram.elements.forEach(action => {this.Actions[action.basename] = action;});
		const actionDiagram = new Diagram(this.$CAT, {basename:'actions', codomain:'Actions', description:'actions for a diagram', user:'ctx'});
		R.setDiagramInfo(actionDiagram, true, false);
		this.actionDiagram = actionDiagram;
		actionDiagram.sync = false;
		let action = new IdentityAction(actionDiagram);
		new GraphAction(actionDiagram);
		new SwapAction(actionDiagram);
		new ReferenceMorphismAction(actionDiagram);
		new NameAction(actionDiagram);
		new CompositeAction(actionDiagram);
		new DetachDomainAction(actionDiagram);
		new DetachDomainAction(actionDiagram, true);
		new HomObjectAction(actionDiagram);
		new HomObjectAction(actionDiagram, true);
		new HomsetAction(actionDiagram, true);
		new DeleteAction(actionDiagram);
		new FlipNameAction(actionDiagram);
		new HelpAction(actionDiagram);
		new RunAction(actionDiagram);
		new AlignHorizontalAction(actionDiagram);
		new AlignVerticalAction(actionDiagram);
		new RecursionAction(actionDiagram);
		new DefinitionAction(actionDiagram);
		new TheoremAction(actionDiagram);
		new TerminalAction(actionDiagram);
		new ElementOfAction(actionDiagram);
		new ElementInAction(actionDiagram);
		new ZoomAction(actionDiagram);
		new ProductAction(actionDiagram);
		new ProjectAction(actionDiagram);
		new PullbackAction(actionDiagram, false);
		new ProductAssemblyAction(actionDiagram);
		new PullbackAssemblyAction(actionDiagram);
		new MorphismAssemblyAction(actionDiagram);
		new ProductAction(actionDiagram, true);
		new ProjectAction(actionDiagram, true);
		new PullbackAction(actionDiagram, true);
		new ProductAssemblyAction(actionDiagram, true);
		new PullbackAssemblyAction(actionDiagram, true);
		new FiniteObjectAction(actionDiagram);
		new HomAction(actionDiagram);
		new EvaluateAction(actionDiagram);
		new LambdaMorphismAction(actionDiagram);
		new DistributeAction(actionDiagram);
		new TensorAction(actionDiagram);
		setup(actionDiagram);
	}
	setupSet()
	{
		const set = new Category(this.$CAT, {basename:'Set', user:'zf', category:R.CAT, properName:'&Sopf;&eopf;&topf;'});
	}
	initialize(fn = null)
	{
		const start = Date.now();
		this.factoryDefaults = U.clone(this.default);
		this.setupWorkers();
		this.fetchCatalog( _ =>
		{
			this.setupCore();
			this.setupActions();
			this.setupSet();
			D && D.initialize();		// initialize GUI
			this.cloud = new Amazon();
			this.cloud.initialize();
			this.sync = true;
			this.initialized = true;
			D && D.emitApplicationEvent('start');
			fn && fn();
			const end = Date.now();
			R.debug(1) && console.log(`R initialization ${end - start}ms`);
		});
	}
	getUserDiagram(user)		// the user's diagram of their diagrams
	{
		let d = this.userDiagram.get(user);
		if (d)
			return d;
		const $CATargs =
		{
			codomain:		this.CAT,
			basename:		user,
			description:	`${user} diagrams`,
			user,
		};
		d = new Diagram(null, $CATargs);
		d.sync = false;
		this.userDiagram.set(user, d);
		return d;
	}
	saveDiagram(diagram, fn = null)
	{
		console.log('save diagram', diagram.name);
		if (D)
		{
			const tx = D.store.transaction(['diagrams'], 'readwrite');
			const info = this.catalog.get(diagram.name);		// get info here in case diagram disapears
			tx.oncomplete = e =>
			{
				info.localTimestamp = diagram.timestamp;
				info.isLocal = true;
				fn && fn(e);
			};
			tx.onerror = e => R.recordError(e);
			const diagramStore = tx.objectStore('diagrams');
			diagramStore.put(diagram instanceof Diagram ? diagram.json() : diagram);
		}
		else
		{
			U.writefile(`${diagram.name}.json`, diagram instanceof Diagram ? diagram.stringify() : diagram);
			const info = this.catalog.get(diagram.name);
			info.localTimestamp = diagram.timestamp;
		}
	}
	async readPNG(name, fn = null)
	{
		const tx = D.store.transaction('PNGs');
		tx.onerror = e => R.recordError(e);
		const pngStore = tx.objectStore('PNGs');
		const pngRep = pngStore.get(name);
		pngRep.onsuccess = e =>
		{
			if (e.target.result)
			{
				const png = e.target.result.png;
				D.diagramPNGs.set(name, png);
				fn && fn(png);
				D.emitPNGEvent('load', name, png);		// TODO keep?
			}
			else
				fn && fn(null);
		};
	}
	async readDiagram(name, fn = null)
	{
		if (D)
		{
			const preload = [...R.getReferences(name)].reverse().filter(ref => ref !== name && !this.$CAT.getElement(ref));
			if (preload.length > 0)
				await Promise.all(preload.reverse().filter(ref => this.loadDiagram(ref)));
			const setup = _ => new Promise((resolve, reject) =>
			{
				let diagram = null;
				const tx = D.store.transaction(['diagrams', 'PNGs']);
				tx.oncomplete = _ => resolve(diagram);
				tx.onerror = e => reject(e.target.error);
				const dgrmStore = tx.objectStore('diagrams');
				const reqDiagram = dgrmStore.get(name);
				reqDiagram.onsuccess = e =>
				{
					diagram = R.$CAT.getElement(name);
					if (diagram)		// maybe it got loaded asynchronously
					{
						fn && fn(name);
						return;
					}
					const sync = this.sync;
					this.sync = false;
					if (e.target.result)
					{
						const args = e.target.result;
						const localLog = U.readTempfile(`${name}.log`);
						if (localLog)
							args.log = JSON.parse(localLog);
						const userDiagram = this.getUserDiagram(args.user);
						diagram = new Cat[args.prototype](userDiagram, args);
						diagram.check();
						R.debug(1) && console.log('readDiagram loaded diagram', args.name);
						D.emitCATEvent('load', diagram);
					}
					else
					{
						R.recordError('readDiatgram, diagram not found ' + name);
						return;
					}
					this.sync = sync;
				};
				const pngStore = tx.objectStore('PNGs');
				const reqPng = pngStore.get(name);
				reqPng.onsuccess = e =>
				{
					if (e.target.result)
					{
						D.diagramPNGs.set(name, e.target.result.png);
						D.emitPNGEvent('load', name, e.target.result.png);
					}
				};
			});
			await setup();
			fn && fn(name);
		}
		else
		{
			let sync = this.sync;
			this.sync = false;
			const data = U.readfile(`${name}.json`);
			if (data)
			{
				try
				{
					const args = JSON.parse(data);
					const userDiagram = this.getUserDiagram(args.user);
					const diagram = new Cat[args.prototype](userDiagram, args);
					const png = U.readfile(`${diagram.name}.png`);
					this.sync = sync;
					diagram.check();
					fn && fn(name);
				}
				catch(x)
				{
					R.recordError(x);
				}
			}
			this.sync = sync;
		}
	}
	displayMorphismInput(morphismName)
	{
		if (morphismName)
		{
			const m = this.diagram.getElement(morphismName);
			if (m)
			{
				if (this.Actions.javascript.canFormat(m))
				{
					let foundIt = null;
					for (const [name, e] of this.diagram.domain.elements)
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
						this.diagram.setPlacementByBBox(bbox);
						const center = this.diagram.diagramToSessionCoords(D.center(this.diagram));
						center.y = center.y / 4;
						this.diagram.addSelected(foundIt);
						const e = {clientX:center.x, clientY:center.y};
						this.Actions.run.html(e, this.diagram, [foundIt]);
					}
				}
				else
					R.recordError('Morphism in URL could not be formatted.');
			}
			else
				R.recordError('Morphism in URL could not be loaded.');
		}
	}
	isLocalNewer(name)
	{
		const info = this.catalog.get(name);
		return info && info.cloudTimestamp < info.localTimestamp;
	}
	isCloudNewer(name)
	{
		const info = this.catalog.get(name);
		return info && info.cloudTimestamp > info.localTimestamp;
	}
	static async DownloadDiagram(name, fn = null, e = null)
	{
		const cloudDiagrams = [...R.getReferences(name)].reverse().filter(d => R.catalog.has(d) && !R.catalog.get(d).isLocal);
		if (cloudDiagrams.length > 0)
		{
			const downloads = cloudDiagrams.map(d => R.getDiagramURL(d + '.json'));
			let diagrams = [];
			const downloader = async _ =>
			{
				const promises = downloads.map((url, i) => fetch(url).then(res =>
				{
					if (!res.ok)
					{
						R.recordError(`Cannot download ${url}`);
						R.recordError('Removed from session');
						D.session.remove(cloudDiagrams[i]);
						D.session.save();
					}
					return res;
				}).catch(err => R.recordError(err)));
				const responses = await Promise.all(promises);
				const jsons = (await Promise.all(responses.map(async res => await res.ok ? res.json() : null))).filter(j => j);
				const doSave = json =>
				{
					R.saveDiagram(json, _ =>
					{
						if (jsons.length > 0)
							doSave(jsons.shift());
						else if (R.canLoad(name))
							R.loadDiagram(name, fn);
					});
				};
				jsons.length > 0 && doSave(jsons[0]);
			};
			await downloader();
		}
		else if (R.canLoad(name))
		{
			console.log('loadDiagram', name);
			await R.loadDiagram(name, fn);
		}
	}
	static async SelectDiagram(name, eventAction = null, fn = null)		// primary means of displaying a diagram
	{
		try
		{
			if (typeof name === 'string' && !R.catalog.has(name))
				throw `Diagram not in catalog: ${name}`;
			if (D)
			{
				D.session.mode = 'diagram';
				if (R.diagram)
				{
					if ( R.diagram.name !== name)
					{
						const bkgnd = R.diagram.svgRoot.querySelector('.diagramBackground').classList.remove('defaultGlow');
						bkgnd && bkgnd.classList.remove('defaultGlow');
					}
					D.default.fullscreen && D.diagramSVG.lastElementChild.dataset.name !== name && D.diagramSVG.classList.add('hidden');
				}
			}
			if (R.diagram && R.diagram.name === name)	// already selected
			{
				D && D.emitCATEvent('default', R.diagram, eventAction);
				fn && fn(R.diagram);
				return;
			}
			R.debug(1) && console.log('SelectDiagram', name);
			R.diagram = null;
			let diagram = name instanceof Diagram ? name : name !== 'sys/$CAT' ? R.$CAT.getElement(name) : R.$CAT;		// already loaded?
			const doit = _ =>
			{
				R.diagram = diagram;
				D && D.emitCATEvent('default', diagram, eventAction);
				fn && fn(diagram);
			};
			if (!diagram)
			{
				this.DownloadDiagram(name, _ =>
				{
					diagram = R.$CAT.getElement(name);
					if (!diagram)	// did not find it
						return;
					doit();
				});
			}
			else
				doit();
		}
		catch(x)
		{
			D.statusbar.show(null, x, 2);
			D.emitCATEvent('default', null);
		}
	}
	getCategory(name)
	{
		if (name instanceof Category)
			return name;
		if (name === 'em/CAT')
			return this.CAT;
		else if (name === 'em/Cat')
			return this.Cat;
		return this.CAT ? this.CAT.getElement(name) : null;
	}
	getReferences(name, refs = new Set())
	{
		const info = this.catalog.get(name);
		refs.add(name);
		info.references.map(r => refs.add(r));
		info.references.map(r => this.getReferences(r, refs));
		return refs;
	}
	canLoad(name)
	{
		const notLoaded = [...this.getReferences(name)].reverse().filter(ref => !this.$CAT.getElement(ref));
		if (notLoaded.length > 0)
			return notLoaded.reduce((r, ref) => r && this.catalog.has(ref) && this.catalog.get(ref).isLocal, true);
		return true;
	}
	load(name)
	{
		const refs = [...this.getReferences(name)];
		const all = refs.filter(dgrm => this.$CAT.getElement(dgrm));
		if (all.length === refs.length)
			return this.$CAT.getElement(name);
	}
	async loadDiagram(name, fn)
	{
		const refs = [...this.getReferences(name)].reverse();
		for (let i=0; i<refs.length; ++i)
		{
			const ref = refs[i];
			await this.loadOne(ref);
		}
		const diagram = this.$CAT.getElement(name);
		if (!diagram)
			throw 'no diagram';
		fn && fn(diagram);
		return diagram;
	}
	async loadOne(name)
	{
		const diagram = this.$CAT.getElement(name);
		if (diagram)
			return diagram;
		return await this.readDiagram(name, _ => R.debug(1) && console.log('loadOne', name));
	}
	setDiagramInfo(diagram, makeLocal = false, writeCatalog = true)
	{
		const info = Diagram.GetInfo(diagram);
		info.localTimestamp = diagram.timestamp;
		const catInfo = this.catalog.get(diagram.name);
		if (catInfo)
		{
			info.isLocal = 'isLocal' in catInfo? catInfo.isLocal : false;
			info.cloudTimestamp = catInfo.cloudTimestamp;
		}
		else
			info.cloudTimestamp = 0;
		if (makeLocal)
			info.isLocal = true;
		this.catalog.set(diagram.name, info);
		writeCatalog && this.writeCatalog();
	}
	loadIdentity(diagram, item)
	{
		item instanceof Identity && this.workers.equator.postMessage({command:'LoadIdentity', diagram:diagram.name, item:item.name, signature:item.signature});
	}
	loadEquality(diagram, item, leftLeg, rightLeg, equal = true)
	{
		const leftSigs = [];
		leftLeg.map(m => m instanceof Composite ? m.getSignatures().map(sig => leftSigs.push(sig)) : leftSigs.push(m.signature));
		const rightSigs = [];
		rightLeg.map(m => m instanceof Composite ? m.getSignatures().map(sig => rightSigs.push(sig)) : rightSigs.push(m.signature));
		this.loadSigs(diagram, item, leftSigs, rightSigs, equal);
	}
	loadSigs(diagram, item, leftLeg, rightLeg, equal = true)
	{
		if (U.arrayEquals(leftLeg, rightLeg))
			return;
		this.workers.equator.postMessage({command:'loadEquality', diagram:diagram.name, item:item.name, leftLeg, rightLeg, equal});
	}
	removeEquivalences(diagram, ...items)
	{
		this.workers.equator.postMessage({command:'RemoveEquivalences', diagram:diagram.name, items});
	}
	loadDiagramEquivalences(diagram)
	{
		console.log('Load diagram equivalences', [...[...diagram.allReferences.keys()].reverse(), diagram.name]);
		this.workers.equator.postMessage({command:'LoadDiagrams', diagrams:[...[...diagram.allReferences.keys()].reverse(), diagram.name]});
	}
	fetchCatalog(fn)
	{
		const process = data =>
		{
			R.debug(1) && console.log('processing catalog data');
			if (D)
				this.cloudURL = data.cloudURL;
			data.diagrams.map(d =>
			{
				const info = Diagram.GetInfo(d);
				info.references = JSON.parse(d.refs);
				delete info.refs;
				info.isLocal = false;
				this.setDiagramInfo(info, false, false);		// don't write local catalog.json yet
			});
			const localCatalog = this.readCatalog();
			if (D)		// now locally stored diagrams in the indexedDB
			{
				if (localCatalog)
				{
					R.catalog = new Map(localCatalog);
					fn();
				}
				else
				{
					const store = D.store.transaction('diagrams').objectStore('diagrams');
					store.openCursor().onsuccess = e =>
					{
						const cursor = e.target.result;
						if (cursor)
						{
							const diagram = cursor.value;
							R.debug(1) && console.log('cataloging local diagram ' + diagram.name);
							const info = this.catalog.get(diagram.name);
							if (info)
							{
								if (0 < diagram.timestamp && diagram.timestamp < info.timestamp)	// override with cloud info
								{
									R.debug(1) && console.log('downloading newer diagram from server', info.name, 'local:', U.localtime(diagram.timestamp), 'remote:', U.localtime(info.timestamp));
									this.downloadDiagramData(info.name, false, Number.parseInt(info.timestamp));		// TODO may be sync problem
								}
								else
								{
									const nuInfo = Diagram.GetInfo(diagram);
									nuInfo.timestamp = info.timestamp;
									nuInfo.isLocal = true;
									this.setDiagramInfo(nuInfo, true);
								}
							}
							cursor.continue();
						}
						else
						{
							[...this.catalog.values()].map(info =>
							{
								if (!('isLocal' in info))
									info.local = false;
							});
							this.writeCatalog();
							fn();
						}
					};
				}
			}
			else
				fn();
		};
		if (D || this.cloudURL)
		{
			R.debug(1) && console.log('fetch catalog from server');
			const url = this.getURL('catalog');
			fetch(url).then(response =>
			{
				R.debug(1) && console.log('diagram catalog response received');
				if (response.ok)
					response.json().then(data => process(data));
				else
					console.error('error downloading catalog', url, response.statusText);
			}).catch(err => R.recordError(err));
		}
		else
			fn();
	}
	writeCatalog()
	{
		U.writefile('catalog.json', JSON.stringify(U.jsonMap(this.catalog)));
	}
	readCatalog()
	{
		const str = U.readfile('catalog.json');
		return str ? JSON.parse(str) : null;
	}
	canDeleteDiagram(d)
	{
		// were we given a diagram or the name of a diagram?
		let diagram = null;
		if (d instanceof Diagram)
			diagram = d;
		else if (typeof d === 'string')
			diagram = this.$CAT.getElement(d);
		else
			diagram = this.$CAT.getElement(d.name);
		// is the diagram in the catalog of diagrams?
		diagram = diagram ? diagram : this.catalog.has(d) ? this.catalog.get(d) : null;
		if (diagram && 'refcnt' in diagram)
			return diagram.refcnt === 0;
		return false;
	}
	deleteDiagram(e, name)
	{
		if (this.canDeleteDiagram(name) && (D ? confirm(`Are you sure you want to delete diagram ${name}?`) : true))
		{
			const diagram = this.$CAT.getElement(name);
			const sync = diagram.sync;
			this.authFetch(this.getURL('delete'), {diagram:name}).then(res =>
			{
				const diagram = this.$CAT.getElement(name);
				if (!res.ok)
				{
					R.recordError(res.statusText);
					if (diagram)
						diagram.sync = sync;
					return;
				}
				if (diagram)
				{
					diagram.decrRefcnt();
					diagram.sync = sync;
				}
				else
					this.catalog.delete(name);
			}).catch(err =>
			{
				diagram.sync = sync;
				R.recordError(err);
			});
		}
	}
	getDiagramInfo(name)
	{
		let diagram = name !== 'sys/$CAT' ? this.CAT.getElement(name) : this.$CAT;
		if (!diagram)
			diagram = this.sys.Actions.getElement(name);
		return Diagram.GetInfo(diagram);
	}
	canFormat(elt)
	{
		return elt.constructor.name === 'Morphism' && (elt.isIterable() || this.Actions.javascript.canFormat(elt));
	}
	diagramSearch(search, fn)
	{
		fetch(this.getURL(`search?search=${search}`)).then(response => response.json()).then(diagrams => fn(diagrams)).catch(err => R.recordError(err));
	}
	getURL(suffix, local = true)
	{
		let url = '';
		if (D)
			url = local ? this.URL : this.cloudURL;
		else
			url = this.cloudURL;
		if (suffix)
			url += '/' + suffix;
		return url;
	}
	getDiagramURL(suffix)
	{
		return this.getURL(`diagram/${suffix}`);
	}
	downloadDiagramData(name, cache, timestamp)
	{
		return fetch(this.getDiagramURL(name + '.json'), {cache: cache ? 'default' : 'reload'}).then(response => response.json()).then(json =>
		{
			if (json.timestamp < timestamp)
			{
				alert(`Warning! timestamp discrepancy ${json.timestamp} vs ${timestamp}`);
				json.timestamp = timestamp;
			}
			R.saveDiagram(json, e => R.debug(1) && console.log('doanloadDiagramData', json.name));
		});
	}
	authFetch(url, body)
	{
		body.user = this.user.name;
		const bodyStr = JSON.stringify(body);
		const headers = {'Content-Type':'application/json;charset=utf-8', token:this.user.token};
		const args = {method:'POST', body:bodyStr, headers};
		return fetch(url, args).catch(err => R.recordError(err));
	}
	updateRefcnts()		// admin action
	{
		const headers = {'Content-Type':'application/json;charset=utf-8', token:this.user.token};
		fetch(this.getURL('refcnts'), {method:'POST', body:JSON.stringify({user:this.user.name}), headers}).then(response => response.json()).then({}).catch(err => R.recordError(err));
	}
	rewriteDiagrams()		// admin action
	{
		const headers = {'Content-Type':'application/json;charset=utf-8', token:this.user.token};
		fetch(this.getURL('rewrite'), {method:'POST', body:JSON.stringify({user:this.user.name}), headers}).then(response =>
		{
			if (response.ok)
				response.json().then(json => D.statusbar.show(null, json.join('\n')));
			else
				throw 'error rewriting diagrams: ' + response.statusText;
		}).catch(err => R.recordError(err));
	}
	updateBugReport()		// admin action
	{
		const headers = {'Content-Type':'application/json;charset=utf-8', token:this.user.token};
		fetch(this.getURL('bugs'), {method:'POST', body:JSON.stringify({user:this.user.name}), headers}).then(response =>
		{
			if (response.ok)
			{
				response.json().then(json =>
				{
					R.saveDiagram(json);
					const bugd = R.$CAT.getElement('dyn/bugs');
					if (bugd)
					{
						bugd.svgRoot && bugd.svgRoot.remove();		// remove graphics
						const isDefault = R.diagram === bugd;
						bugd.decrRefcnt();	// remove diagram
						this.setDiagramInfo(json);
						if (D)
						{
							if (isDefault)
							{
								D.session.mode = 'catalog';
								D.emitViewEvent('catalog');
							}
						}
					}
					else
						this.setDiagramInfo(json);
					D && D.statusbar.show(null, 'Bug report updated on server');
				});
			}
			else
				throw 'error creating bug report: ' + response.statusText;
		}).catch(err => R.recordError(err));
	}
	upload(e, diagram, local, fn)
	{
		if (!this.user.canUpload())
			return;
		const body = {diagram:diagram instanceof Diagram ? diagram.json() : diagram, user:this.user.name};
		const png = D.diagramPNGs.get(diagram.name);
		if (png)
			body.png = png;
		R.debug(1) && console.log('uploading', diagram.name);
		if (local)
			return this.authFetch(this.getURL('upload', local), body).then(res => fn(res)).catch(err => R.recordError(err));
		// keep local server up to date after update to cloud
		return this.authFetch(this.getURL('upload', false), body).then(res => this.upload(e, diagram, true, fn)).catch(err => R.recordError(err));
	}
	addReference(e, name, fn = null)
	{
		const diagram = this.diagram;
		diagram.addReference(name, dgrm =>
		{
			D.statusbar.show(e, `Diagram ${dgrm.properName} now referenced`);
			diagram.log({command:'addReference', name});
			diagram.antilog({command:'removeReference', name});
			fn && fn(name);
		});
	}
	removeReference(e, name)
	{
		const diagram = this.diagram;
		const ref = this.$CAT.getElement(name);
		if (!ref)
			throw 'no reference diagram';
		diagram.removeReference(name);
		this.catalog.get(name).refcnt--;
		D.emitDiagramEvent(diagram, 'removeReference', ref);
		D.statusbar.show(e, `${diagram.properName} reference removed`);
		diagram.log({command:'removeReference', name});
		diagram.antilog({command:'addReference', name});
	}
	createDiagram(codomain, base, proper, desc)
	{
		const basename = U.HtmlSafe(base);
		if (!U.isValidBasename(basename))
			return 'Invalid basename';
		const userDiagram = this.getUserDiagram(this.user.name);
		if (userDiagram.elements.has(basename))
			return 'diagram already exists';
		const name = `${this.user.name}/${basename}`;
		if (this.catalog.has(name))
			return 'diagram already exists';
		const properName = U.HtmlSafe(proper);
		const description = U.HtmlSafe(desc);
		const diagram = new Diagram(userDiagram, {basename, codomain, properName, description, user:this.user.name});
		this.setDiagramInfo(diagram);
		return diagram;
	}
	isNamed(elt)
	{
		return elt instanceof NamedObject || elt instanceof NamedMorphism;
	}
	sameForm(ref, test, eltMap = new Map())
	{
		if (!((ref instanceof CatObject && test instanceof CatObject) || (ref instanceof Morphism && test instanceof Morphism)))
			return false;
		if (test instanceof CatObject)
		{
			if (ref.constructor.name === 'CatObject')
			{
				if (eltMap.has(ref))
				{
					if (test !== eltMap.get(ref))
						return false;
				}
				else
					eltMap.set(ref, test);
				return true;
			}
			if (ref instanceof MultiObject && test instanceof MultiObject && ref.objects.length === test.objects.length && ref.dual === test.dual)
				return ref.objects.reduce((r, o, i) => r && this.sameForm(o, test.objects[i], eltMap), true);
			if (ref.constructor.name === 'FiniteObject')
			{
				if ('size' in ref)
					return 'size' in test ? (ref.size === test.size) : false;
				return 'size' in ref ? false : true;
			}
		}
		else if (test instanceof Morphism)
		{
			if (this.sameForm(ref.domain, test.domain, eltMap) && this.sameForm(ref.codomain, test.codomain, eltMap))
			{
					if (eltMap.has(ref))
						return test !== eltMap.get(ref);
					eltMap.set(ref, test);
					return true;
			}
		}
		return false;
	}
	checkEquivalence(cell, handler = null)
	{
		if (handler)
		{
			if (!cellToCallbacks.has(cell.name))
				cellToCallbacks.set(cell.name, []);
			const handlers = cellToCallbacks.get(cell.name);
			handlers.push(handler);
		}
		this.workers.equator.postMessage(
		{
			command:'CheckEquivalence',
			diagram:cell.diagram.name,
			cell:cell.name,
			leftLeg:cell.left.map(m => m.to.signature),
			rightLeg:cell.right.map(m => m.to.signature)
		});
	}
	canUploadUser(name)
	{
		return name !== 'sys' && name !== 'zf';
	}
	isReady()
	{
		return this.initialized && this.Actions.javascript !== undefined && this.Actions.cpp !== undefined;
	}
	recordError(err)
	{
		const errTxt = U.getError(err);
		if (D)
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
	localTimestamp(name)		// for server only, not web browser
	{
		const data = U.readfile(`${name}.json`);
		return data ? JSON.parse(data).timestamp : 0;
	}
	getAvailableCategories()
	{
		const cats = [];
		for (const [name, e] of R.$CAT.elements)
			if (e instanceof Category && !(e instanceof IndexCategory))
				cats.push(e);
		return cats;
	}
	isSysUser(user)
	{
		return user.length < 5;
	}
	setCategory(cat)
	{
		R.category = cat;
	}
	debug(level)
	{
		return level <= R.default.debug;
	}
}

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
		if (D && window.AWS)
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
							throw 'cannot fetch user info';
						return res.json();
					}).then(json =>
					{
						R.user.cloud = json;
						R.user.cloud.permissions = 'permissions' in json ? R.user.cloud.permissions.split(' ') : [];
						D.emitLoginEvent();
					}).catch(err => R.recordError(err));
				});
			});
		}
		else
		{
			window.AWS.config.credentials = new window.AWS.CognitoIdentityCredentials(this.loginInfo);
			window.AWS.config.credentials.get();
			D.emitLoginEvent();
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
			D.emitLoginEvent();
		});
		event.preventDefault();
	}
	resetPassword(e)	// start the process; a code is sent to the user
	{
		const idPro = new window.AWS.CognitoIdentityServiceProvider();
		idPro.forgotPassword({ClientId:'fjclc9b9lpc83tmkm8b152pin', Username:R.user.name}, (err, data) =>
		{
			if (err)
				console.error(err);
			else
				console.error(data);
		});
		e.preventDefault();
	}
	confirm(e)
	{
		const code = document.getElementById('confirmationCode').value;
		this.user.confirmRegistration(code, true, (err, result) =>
		{
			if (err)
				return alert(err.message);
			R.user.status = 'confirmed';
			D.emitLoginEvent();
		});
		e.preventDefault();
	}
	updatePassword(e)
	{
		const code = document.getElementById('confirmationCode').value;
		const password = document.getElementById('login-new-password').value;
		this.user.confirmPassword(code, password,
		{
			onFailure:err => alert(err),
			onSuccess:_ =>
			{
				// TODO are we logged in now?
				R.user.status = 'logged-in';
			},
		});
		e.preventDefault();
	}
	login(e)
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
				onSuccess:result => R.cloud.registerCognito(),
				onFailure:err =>
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
					D.emitLoginEvent();
					alert(err.message);
				},
				mfaRequired:codeDeliveryDetails =>
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
		D.emitLoginEvent();
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
		const handler = (error, data) =>
		{
			if (error)
			{
				R.recordError(error);
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
		const divs = [	H3.div('.navbar-float', H3.div('.buttonBarLeft.navbar-tools.stdBackground')),
						H3.div('##diagram-navbar.navbar-float.navtxt-text', {title:'Current diagram'}),
						H3.div('.navbar-float.navtxt-text.navtxt-link', 'Catecon', {onclick:e => D.clickOrHelp(e, 'hdole/Catecon', this.catalogView)}),
						H3.div('##category-navbar.navtxt-text.navbar-float', {title:'Current category'}),
						H3.div('.navbar-float', H3.div('.buttonBarRight.navbar-tools.stdBackground'))];
		divs.map(div => this.element.appendChild(div));
		this.categoryElt = document.getElementById('category-navbar');
		this.diagramElt = document.getElementById('diagram-navbar');
		this.element.onmouseenter = _ => D.mouse.onGUI = this;
		this.element.onmouseleave = _ => D.mouse.onGUI = null;
		window.addEventListener('Login', _ => this.update());
		window.addEventListener('Registration', _ => this.updateByUserStatus());
		window.addEventListener('CAT', e => e.detail.command === 'default' && D.navbar.update(e));
		window.addEventListener('Diagram', e =>
		{
			switch(e.detail.command)
			{
				case 'category':
					this.updateCategory(e);
					break;
				case 'select':
					this.updateCategory(e);
					this.updateStatusTools();
					break;
			}
		});
		window.addEventListener('View', e =>
		{
			if (e.detail.command === 'catalog')
			{
				const toolbar = this.element.querySelector('.buttonBarRight');
				toolbar && D.removeChildren(toolbar);
			}
		});
		window.addEventListener('Autohide', e =>
		{
			if (D.session.mode === 'catalog')	// no autohide in catalog view
				return;
			const args = e.detail;
			if (args.command === 'hide')
				this.element.style.height = "0px";
			else
				this.element.style.height = `${D.default.icon}px`;
		});
		window.addEventListener('View', e => this.update(e));
		window.addEventListener('Application', e => this.update(e));
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
	}
	catalogView()
	{
		D.catalog.mode = 'search';
		D.catalog.search();
		D.emitViewEvent('catalog', 'search');
	}
	updateCategory()
	{
		let name = '';
		if (R.category && D.session.mode === 'diagram')
			name = U.HtmlEntitySafe(R.category.properName);
		this.categoryElt.innerHTML = name;
	}
	updateStatusTools()
	{
		if (D.session.mode === 'diagram' && R.diagram && R.diagram.isEditable())
		{
			toolbar = this.element.querySelector('.buttonBarRight');
			D.removeChildren(toolbar);
			const buttons = [];
			const scale = D.default.button.large;
			const mode = D.inputMode;
			const objCnt = R.diagram.selected.filter(elt => elt instanceof IndexObject).length;
			const morphCnt = R.diagram.selected.filter(elt => elt instanceof IndexMorphism).length;
			const textCnt = R.diagram.selected.filter(elt => elt instanceof IndexText).length;
			const cellCnt = R.diagram.selected.filter(elt => elt instanceof Cell).length;
			const doit = (cnt, name) => cnt > 0 && buttons.push(D.getIconCounter(name, name, cnt, e => e, {title:`${U.Cap(name)} count`, id:`${name}-counter`, scale:scale/2}));
			doit(objCnt, 'object');
			doit(morphCnt, 'morphism');
			doit(textCnt, 'text');
			doit(cellCnt, 'cell');
			buttons.push(D.getIcon(mode, mode, e => D.advanceInputMode(), {title:'Advance mode', id:'navbar-mode-advance', scale}));
			buttons.map(btn => toolbar.appendChild(btn));
			toolbar.style.width = `${buttons.length * 32}px`;
		}
	}
	update()
	{
		const scale = D.default.button.large;
		let left = [];
		left.push(D.getIcon('loginPanelToggle', 'login', _ => Cat.D.loginPanel.toggle(), {title:'Login', scale, help:'hdole/user'}));
		left.push(D.getIcon('helpPanelToggle', 'help', _ => Cat.D.helpPanel.toggle(), {title:'Help', scale, help:'hdole/help'}));
		left.push(D.getIcon('settingsPanelToggle', 'settings', _ => Cat.D.settingsPanel.toggle(), {title:'Settings', scale}));
		left.push(D.getIcon('ttyPanelToggle', 'tty', _ => Cat.D.ttyPanel.toggle(), {title:'Console', scale}));
		if (D.session.mode === 'diagram')
			left.push(D.getIcon('threeDPanelToggle', 'threeD', _ => Cat.D.threeDPanel.toggle(), {title:'3D view', scale, help:'hdole/threeD'}));
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
					left.push(D.getIcon(name, name, _ => {}, {title:`btn-${name}`, scale}));
				}
			} while((icon = icon.nextSibling));
		}
		const width = left.length * D.default.icon;
		let toolbar = this.element.querySelector('.buttonBarLeft');
		D.removeChildren(toolbar);
		toolbar.style.width = `${width}px`;
		left.map(btn => toolbar.appendChild(btn));
		const info = R.diagram ? Diagram.GetInfo(R.diagram) : R.catalog.get(D.session.getCurrentDiagram());
		if (info)
		{
			this.updateCategory();
			D.removeChildren(this.diagramElt);
			this.diagramElt.appendChild(H3.span('.navtxt-link', info.properName === info.name ? info.basename : info.properName, {onclick:e => Runtime.SelectDiagram(info.name, 'default'), title:`View diagram ${info.name}`}));
			this.diagramElt.appendChild(H3.span('.italic', ' by ', info.user));
		}
		else
		{
			D.removeChildren(this.diagramElt);
			D.removeChildren(this.categoryElt);
		}
		this.updateByUserStatus();
		this.updateStatusTools();
	}
}

class Toolbar
{
	constructor()
	{
		Object.defineProperties(this,
		{
			'body':			{value:	null,										writable: true},
			'diagram':		{value: null,										writable: true},
			'buttons':		{value:	null,										writable: true},
			'closed':		{value:	false,										writable: true},
			'element':		{value: document.getElementById('toolbar'),			writable: false},
			'error':		{value: document.getElementById('toolbar-error'),	writable: false},
			'header':		{value: document.getElementById('toolbar-header'),	writable: false},
			'help':			{value: document.getElementById('toolbar-help'),	writable: false},
			'mode':			{value: null,										writable: true},
			'mouseCoords':	{value: null,										writable: true},
			'otherActions':	{value: [],											writable: false},
			'sections':		{value: ['search', 'new'],							writable: false},
			'table':		{value:	null,										writable: true},
			'tools':		{value:	null,										writable: true},
		});
		this.element.onmouseenter = _ => D.mouse.onGUI = this;
		this.element.onmouseleave = _ => D.mouse.onGUI = null;
		window.addEventListener('Diagram', e =>
		{
			if ((this.element.classList.contains('hidden') || R.diagram.selected.length > 0) && e.detail.command === 'select')
				this.show(e);
			else
				this.hide();
		});
		window.addEventListener('mouseenter', e => D.mouse.saveClientPosition(e));
		window.addEventListener('Autohide', e =>
		{
			if (e.detail.command === 'hide')
				this.element.classList.add('hidden');
			else if (!this.closed)
				this.element.classList.remove('hidden');
		});
		window.addEventListener('Login', e => !D.params.has('select') && this.hide());
		window.addEventListener('View', e => e.detail.command === 'catalog' ? this.hide() : null);
		window.addEventListener('CAT', e => e.detail.command === 'new' || e.detail.command === 'default' ? this.hide() : null);
		this.body = H3.div('##help-body');
		this.help.appendChild(this.body);
		this.table = H3.table('##help-table.w100');
		this.help.appendChild(this.table);
		const watcher = (mutationsList, observer) =>
		{
			const min = [...this.tools.querySelectorAll('svg')].length * 32;
			let width = min;
			for(const m of mutationsList)
			{
				for(const n of m.addedNodes)
				{
					if (n instanceof Element || n instanceof HTMLElement)
					{
						const style = window.getComputedStyle(n);
						const eltWidth = n.scrollWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight) +
							parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
							parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
						width = Math.max(width, eltWidth, min);
					}
					else if (n instanceof Text)
					{
						const textWidth = D.textWidth(n);
						width = Math.max(width, textWidth, min);
					}
				}
			}
			this.adjustPosition();
		};
		const bodyObserver = new MutationObserver(watcher);
		bodyObserver.observe(this.body, {childList:true, subtree:true});
		const tableObserver = new MutationObserver(watcher);
		tableObserver.observe(this.table, {childList:true, subtree:true});
	}
	clearBody()
	{
		D.removeChildren(this.body);
	}
	clearError()
	{
		D.removeChildren(this.error);
		this.error.classList.add('hidden');
		this.error.innerHTML = '';
	}
	appendError(x)
	{
		this.error.classList.remove('hidden');
		if (x instanceof HTMLElement)
			this.error.appendChild(x);
		else if (typeof x === 'string')
			this.error.appendChild(H3.div(x));
		else
			this.error.innerHTML = 'Error ' + U.getError(x);
	}
	showError(x)
	{
		this.clearError();
		this.appendError(x);
	}
	clearHeader()
	{
		D.removeChildren(this.header);
	}
	clearTable()
	{
		D.removeChildren(this.table);
	}
	clear()
	{
		this.clearTable();
		this.clearBody();
		this.clearError();
		this.element.style.right = 'unset';
		this.element.style.bottom = 'unset';
		this.element.style.width = 'auto';
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
	resetPosition()
	{
		this.element.style.top = 'unset';
		this.element.style.left = 'unset';
		this.element.style.right = 'unset';
		this.element.style.bottom = 'unset';
	}
	updateTop()
	{
		let xy = U.clone(D.mouse.down);
		if (R.diagram)
			this.mouseCoords = R.diagram.userToDiagramCoords(xy);
		const toolbox = this.element.getBoundingClientRect();
		xy.x = xy.x - toolbox.width/2;
		this.element.style.left = xy.x + toolbox.width < D.width() ? `${xy.x}px` : `${D.mouse.down.x - toolbox.width - 4 * D.default.margin}px`;
		this.element.style.top = xy.y + toolbox.height < D.height() ? `${xy.y}px` : `${D.mouse.down.y - toolbox.height - 4 * D.default.margin}px`;
	}
	automove(diagram)		// vertically or horizontally displace the toolbar to avoid selected items
	{
		if (!diagram)
			return;
		const selected = diagram.selected;
		const toolBbox = new D2(this.element.getBoundingClientRect());
		const oldBox = diagram.userToDiagramCoords(this.element.getBoundingClientRect());
		const nuBox = diagram.diagramToUserCoords(diagram.autoplaceSvg(oldBox, '', oldBox.height, 4, this.mouseCoords));
		const wid = D.width();
		const hgt = D.height();
		if (nuBox.x < 0)
			nuBox.x = 0;
		if (nuBox.y < D.default.icon)		// take the navbar into account
			nuBox.y = D.default.icon;
		if (nuBox.x + nuBox.width > wid)
			nuBox.x = wid - nuBox.width;
		if (nuBox.y + nuBox.height > hgt)
			nuBox.y = hgt - nuBox.height;
		this.element.style.left = `${nuBox.x}px`;
		this.element.style.top = `${nuBox.y}px`;
	}
	show(e)
	{
		this.resetPosition();
		const diagram = R.diagram;
		const element = this.element;
		this.clear();
		this.reveal();
		const moveBtn = D.getIcon('moveToolbar', 'move', '', {title:'Move toolbar', id:'toolbar-drag-handle'});
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
		if (D.default.fullscreen && diagram)
			diagram.selected.length > 0 ? this.showSelectedElementsToolbar(diagram, btns) : this.showDiagramToolbar(diagram, btns);
		else
			this.showSessionToolbar(btns);
		this.updateTop();
		this.automove(diagram);
	}
	addButtons(buttons)
	{
		this.buttons = H3.td(buttons, '.buttonBarLeft.stdBackground');
		const closeBtn = H3.table(H3.tr(H3.td(this.getCloseToolbarBtn())), '.buttonBarRight.stdBackground');
		this.tools = H3.table(H3.tr(this.buttons, H3.td(closeBtn)), '.toolbar-buttons');
		this.header.appendChild(this.tools);
		this.buttons.setAttribute('width', `${buttons.reduce((r, btn) => r + btn.getBoundingClientRect().width, 0)}px`);
	}
	showSelectedElementsToolbar(diagram, btns)
	{
		this.clearHeader();
		let actions = R.actionDiagram.getObjects().filter(a => a.priority >= 0);
		actions.sort((a, b) => a.priority < b.priority ? -1 : b.priority > a.priority ? 1 : 0);
		this.otherActions.length = 0;
		actions.map(action =>
		{
			if (!action.hidden() && action.hasForm(diagram, diagram.selected))
			{
				const icn = document.querySelector(`#icon-${U.SafeId(action.basename)}`);
				if (icn)
					btns.push(D.getIcon(action.basename, action.basename, e => Cat.R.diagram[action.actionOnly ? 'activate' : 'actionHtml'](e, action.basename), {title:action.description}));
				else
					this.otherActions.push(action);
			}
		});
		this.otherActions.length > 0 && btns.push(D.getIcon('others', 'action', e => Cat.D.toolbar.showOtherActions(e), {title:'Show other actions'}));
		this.addButtons(btns);
	}
	showDiagramToolbar(diagram, btns)
	{
		this.clearHeader();
		const setActive = (e, mod, fn) =>
		{
			const toolbar2 = this.element.querySelector('#help-toolbar2');
			if (toolbar2)
			{
				D.removeChildren(toolbar2.querySelector('.buttonBarLeft span'));
				D.removeChildren(toolbar2.querySelector('.buttonBarRight span'));
			}
			D.setActiveIcon(e.target);
			this.mode = mod;
			fn(e);
		};
		btns.push(D.getIcon('category', 'category', e => setActive(e, 'diagram', ee => Cat.D.elementTool.Category.html(ee)), {title:'Categories', help:'hdole/category'}));
		btns.push(D.getIcon('diagram', 'diagram', e => setActive(e, 'diagram', ee => Cat.D.elementTool.Diagram.html(ee)), {title:'Diagrams', help:'hdole/diagram'}));
		btns.push(D.getIcon('object', 'object', e => setActive(e, 'object', ee =>Cat.D.elementTool.Object.html(ee)), {title:'Objects', help:'hdole/object'}));
		btns.push(D.getIcon('morphism', 'morphism', e => setActive(e, 'morphism', ee =>Cat.D.elementTool.Morphism.html(ee)), {title:'Morphisms', help:'hdole/morphism'}));
		diagram.domain.cells.size > 0 && btns.push(D.getIcon('cell', 'cell', e => setActive(e, 'cell', ee => Cat.D.elementTool.Cell.html(ee)), {title:'Cells'}));
		btns.push(D.getIcon('text', 'text', e => setActive(e, 'text', ee => Cat.D.elementTool.Text.html(ee)), {title:'Text'}));
		R.diagram.getDefinitions().length > 0 && btns.push(D.getIcon('definition', 'definition', e => setActive(e, 'definition', ee => Cat.D.elementTool.Definition.html(ee)), {title:'Definitions'}));
		btns.push(D.getIcon('graph', 'graph', _ => Cat.R.diagram.showGraphs(), {title:'Show graphs in diagram'}));
		btns.push(D.getIcon('home', 'home', e => Cat.D.keyboardDown.Home(e), {title:'Home'}));
		btns.push(D.getIcon('help', 'help', e => setActive(e, 'help', ee => R.Actions.help.html(e, diagram, [diagram]), {title:'Show help'})));
		this.addButtons(btns);
	}
	showSessionToolbar(btns)
	{
		this.clearHeader();
		btns.push(D.getIcon('diagram', 'diagram', _ => Cat.D.elementTool.Diagram.html(), {title:'Diagram'}));
		this.addButtons(btns);
	}
	getCloseToolbarBtn(btns)
	{
		return D.getIcon('closeToolbar', 'close', _ => Cat.D.toolbar.hide(), {title:'Close'});
	}
	isVisible()
	{
		return !this.element.classList.contains('hidden');
	}
	deactivateButtons()
	{
		const btns = this.buttons.querySelectorAll('span.icon');
		btns.forEach(btn => btn.querySelector('.btn').classList.remove('icon-active'));
	}
	adjustPosition()
	{
		const screenHeight = D.height();
		const bottom = this.element.offsetHeight + this.element.offsetTop;
		if (bottom > screenHeight)
		{
			const top = Math.max(D.default.icon, this.element.offsetTop - bottom + screenHeight - 4 * D.default.margin);
			this.element.style.top = `${top}px`;
			if (this.element.scrollHeight > screenHeight)
				this.element.style.bottom = `${D.default.icon}px`;
		}
	}
	showOtherActions(e)
	{
		this.clear();
		D.setActiveIcon(e.target);
		this.otherActions.map(action => this.table.appendChild(H3.tr(H3.td(H3.button(action.basename, {onclick:e => Cat.R.diagram[action.actionOnly ? 'activate' : 'actionHtml'](e, action.basename), title:action.description})))));
	}
}

class SearchTool
{
	constructor(type)
	{
		Object.defineProperties(this,
		{
			type:				{value: type,						writable: false},
			hasDiagramOnlyButton:		{value: true,				writable: true},
			searchArgs:			{value: {
											diagramOnly: false,
											userOnly: false,
											sessionOnly: false,
											actionOnly: false,
											referenceOnly: false,
											sorter:U.NameSorter,
										},	writable: false},
			buttonSize:			{value: D ? D.default.button.small : 0,		writable: true},
			searchFilterId:		{value: `${type}-search-filter`,	writable: true},
			searchSorterId:		{value: `${type}-search-sorter`,	writable: true},
		});
		D && D.replayCommands.set(`tool${type}`, this);
	}
	getSearchBar()
	{
		const onkeyup = e => this.search();
		return H3.div(H3.h3('Search'), H3.table(	`##${this.type}-search-tools`,
							H3.tr(	H3.td('Filter by', '.tinyPrint.center.italic'),
									H3.td(),
									H3.td('Sort by', '.tinyPrint.center.italic')),
							H3.tr(	H3.td(`##${this.type}-search-filter`),
									H3.td(H3.input(`##${this.type}-search-value.in100.ifocus`, {title:'Search', type:'search', placeholder:'Contains...', onkeyup, onsearch:onkeyup})),
									H3.td(`##${this.type}-search-sorter`))));
	}
	setSearchBar()
	{
		const searchFilter = document.getElementById(this.searchFilterId);
		D.removeChildren(searchFilter);
		this.hasDiagramOnlyButton && searchFilter.appendChild(D.getIcon('diagram', 'diagram', e => this.toggleDiagramFilter(e), {title:'Search in diagram'}));
		const searchSorter = document.getElementById(this.searchSorterId);
		D.removeChildren(searchSorter);
		searchSorter.appendChild(D.getIcon('text', 'text', e => this.setTextSorter(e), {title:'Sort by name', id:`${this.constructor.name}-text-icon`}));
		searchSorter.appendChild(D.getIcon('reference', 'reference', e => this.setRefcntSorter(e), {title:'Sort by reference count'}));
	}
	html(e)
	{
		this.reset();
		const matchTable = H3.table({id:`${this.type}-matching-table`}, '.matching-table');
		const div = H3.div(matchTable);
		div.style.maxHeight = `${0.75 * D.height()}px`;
		D.toolbar.table.appendChild(H3.tr(`##${this.type}-search.w100`, H3.td(this.getSearchBar(), div, `##${this.type}-search-results.tool-search-results`)));
		this.setSearchBar();
		this.search();
	}
	toggleDiagramFilter(e)
	{
		this.searchArgs.diagramOnly = !this.searchArgs.diagramOnly;
		if (this.searchArgs.diagramOnly)
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
	reset()				// fitb
	{}
	getMatchingElements()	// fitb
	{}
	getRows(tbl, elements)	// or replace
	{
		elements.map(elt =>
		{
			const row = elt.getHtmlRow();
			elt.addButtons(row);
			tbl.appendChild(row);
		});
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args, false);
	}
	clearSearch()
	{
		D.toolbar.clearError();
		const tbl = document.getElementById(`${this.type}-matching-table`);
		tbl && D.removeChildren(tbl);
	}
	search()
	{
		this.clearSearch();
		const tbl = document.getElementById(`${this.type}-matching-table`);
		this.getRows(tbl, this.filter(this.getMatchingElements()));
	}
	filter(elements)
	{
		const args = this.searchArgs;
		return elements.filter(info =>	((args.userOnly && info.user === R.user.name) || !args.userOnly) &&
										((args.referenceOnly && R.diagram.references.has(info.name)) || !args.referenceOnly) &&
										((args.sessionOnly && D.session.diagrams.has(info.name)) || !args.sessionOnly) &&
										((args.diagramOnly && info.diagram === R.diagram) || !this.searchArgs.diagramOnly));
	}
}

class ElementTool
{
	constructor(type, toolbar, headline, sections)
	{
		Object.defineProperties(this,
		{
			type:				{value: type,						writable: false},
			toolbar:			{value: toolbar,					writable: false},
			sections:			{value: sections,					writable: false},
			currentSection:		{value: 'search',					writable: true},
			headline:			{value: headline,					writable: false},
			hasDiagramOnlyButton:		{value: true,				writable: true},
			searchArgs:			{value: {
											diagramOnly: false,
											userOnly: false,
											sessionOnly: false,
											actionOnly: false,
											referenceOnly: false,
											sorter:U.NameSorter,
										},	writable: false},
			buttonSize:			{value: D.default.button.small,		writable: true},
			searchFilterId:		{value: `${type}-search-filter`,	writable: true},
			searchSorterId:		{value: `${type}-search-sorter`,	writable: true},
		});
		D.replayCommands.set(`tool${type}`, this);
	}
	getSearchBar()
	{
		const onkeyup = e => this.search();
		return H3.div(H3.h3('Search'), H3.table(	`##${this.type}-search-tools`,
							H3.tr(	H3.td('Filter by', '.tinyPrint.center.italic'),
									H3.td(),
									H3.td('Sort by', '.tinyPrint.center.italic')),
							H3.tr(	H3.td(`##${this.type}-search-filter`),
									H3.td(H3.input(`##${this.type}-search-value.in100.ifocus`, {title:'Search', type:'search', placeholder:'Contains...', onkeyup, onsearch:onkeyup})),
									H3.td(`##${this.type}-search-sorter`))));
	}
	setSearchBar()
	{
		const searchFilter = document.getElementById(this.searchFilterId);
		D.removeChildren(searchFilter);
		this.hasDiagramOnlyButton && searchFilter.appendChild(D.getIcon('diagram', 'diagram', e => this.toggleDiagramFilter(e), {title:'Search in diagram'}));
		const searchSorter = document.getElementById(this.searchSorterId);
		D.removeChildren(searchSorter);
		searchSorter.appendChild(D.getIcon('text', 'text', e => this.setTextSorter(e), {title:'Sort by name', id:`${this.constructor.name}-text-icon`}));
		searchSorter.appendChild(D.getIcon('reference', 'reference', e => this.setRefcntSorter(e), {title:'Sort by reference count'}));
	}
	showSection(section)
	{
		this.currentSection = section;
		D.setActiveIcon(document.getElementById(`${this.type}-${section}-icon`));
		this.sections.map(s =>
		{
			const elt = document.getElementById(`${this.type}-${s}`);
			elt && elt.classList.add('hidden');
		});
		const s = document.getElementById(`${this.type}-${section}`);
		if (s)
		{
			s.classList.remove('hidden');
			const focus = s.querySelector('.ifocus');
			focus && focus.focus();
		}
		D.toolbar.adjustPosition();
	}
	html(e)
	{
		D.toolbar.clear();
		this.reset();
		this.setupToolbar();
		this.sections.includes('new') && this.addNewSection();
		const matchTable = H3.table({id:`${this.type}-matching-table`}, '.matching-table');
		if (this.sections.includes('search'))
		{
			const div = H3.div(matchTable);
			div.style.maxHeight = `${0.75 * D.height()}px`;
			D.toolbar.table.appendChild(H3.tr(`##${this.type}-search.w100.hidden`, H3.td(this.getSearchBar(), div, `##${this.type}-search-results.tool-search-results`)));
			this.setSearchBar();
			this.search();
			this.showSection('search');
		}
	}
	toggleDiagramFilter(e)
	{
		this.searchArgs.diagramOnly = !this.searchArgs.diagramOnly;
		if (this.searchArgs.diagramOnly)
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
	getMatchingElements()	// fitb
	{}
	getRows(tbl, elements)	// or replace
	{
		elements.map(elt =>
		{
			const row = elt.getHtmlRow();
			elt.addButtons(row);
			tbl.appendChild(row);
		});
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args, false);
	}
	setupToolbar()
	{
		if (this.sections.length > 1)
		{
			const toolbar = D.toolbar;
			const toolbar2 = [];
			const tType = U.Decap(this.type);
			const elementBtn = D.getIcon(tType, tType, e => this.showSection('search'), {title:this.type, id:`${this.type}-search-icon`});
			toolbar2.push(elementBtn);
			R.diagram.isEditable() && toolbar2.push(D.getIcon('new', 'edit', _ => this.showSection('new'), {title:'New', id:`${this.type}-new-icon`}));
			this.toolbar2 = H3.tr(H3.td(toolbar2, '##help-toolbar2', {colspan:2}));
			toolbar.table.appendChild(this.toolbar2);
		}
	}
	clearSearch()
	{
		D.toolbar.clearError();
		const tbl = document.getElementById(`${this.type}-matching-table`);
		tbl && D.removeChildren(tbl);
	}
	search()
	{
		this.clearSearch();
		const tbl = document.getElementById(`${this.type}-matching-table`);
		this.getRows(tbl, this.filter(this.getMatchingElements()));
	}
	filter(elements)
	{
		const args = this.searchArgs;
		return elements.filter(info =>	((args.userOnly && info.user === R.user.name) || !args.userOnly) &&
										((args.referenceOnly && R.diagram.references.has(info.name)) || !args.referenceOnly) &&
										((args.sessionOnly && D.session.diagrams.has(info.name)) || !args.sessionOnly) &&
										((args.diagramOnly && info.diagram === R.diagram) || !this.searchArgs.diagramOnly));
	}
}

class TextTool extends ElementTool
{
	constructor(type, headline)
	{
		super('Text', D.toolbar.help, headline, ['new', 'search']);
		this.hasDiagramOnlyButton = false;
		Object.defineProperties(this,
		{
			descriptionElt:		{value: null,		writable: true},
			error:				{value: null,		writable: true},
		});
		D.replayCommands.set(`new${this.type}`, this);
	}
	addNewSection()
	{
		const action = e => this.create(e);
		const rows = [];
		this.descriptionElt = H3.textarea('##new-description.in100.ifocus', {title:'Description', placeholder:'Description', onkeydown:e => e.stopPropagation()});
		rows.push(H3.tr(H3.td(H3.span('.smallPrint.italic', 'Enter new text below or click directly on the diagram'), H3.br(), this.descriptionElt, D.getIcon(action.name, 'edit', action, {title:'Edit description'}))));
		const elts = [H3.hr(), H3.h5(this.headline)];
		elts.push(H3.table(rows));
		D.toolbar.table.appendChild(H3.tr(H3.td(elts, `##${this.type}-new.hidden`)));
	}
	getRows(tbl, texts)
	{
		texts.map(txt =>
		{
			const txtHtml = txt.getHtmlRep();
			const btns = [];
			if (txt.isEditable())
			{
				const id = txt.elementId();
				txtHtml.addEventListener('dblclick', e => this.isEditable() && Cat.R.diagram.editElementText(e, txt, id, 'description'));		// defer editable check
				const onfocusout = e =>
				{
					txtHtml.firstChild.contentEditable = false;
					const description = e.target.innerText;
					if (description && description !== txt.description)
						R.diagram.commitElementText(e, txt.name, e.target, 'description');
					D.closeActiveTextEdit();
				};
				txtHtml.addEventListener('focusout', onfocusout);
				btns.push(D.getIcon('delete', 'delete', _ => Cat.R.Actions.delete.action(txt.name, Cat.R.diagram, [txt]), {title:'Delete text'}));
			}
			btns.push(D.getIcon('viewText', 'view', e => R.Actions.zoom.action(e, R.diagram, [txt])));
			txtHtml.appendChild(H3.span('.tool-entry-actions', btns));
			txtHtml.classList.add('element');
			tbl.appendChild(H3.tr(H3.td(txtHtml)));
		});
	}
	getMatchingElements()
	{
		const filter = document.getElementById(`${this.type}-search-value`).value;
		const texts = R.diagram.getTexts().filter(txt => txt.description.includes(filter));
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
			if (!diagram.isEditable())
				throw 'diagram is read only';
			return diagram.placeText(args.text, args.xy);
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
		this.basenameElt = H3.input('##new-basename.ifocus', {placeholder:'Base name', title:'Base name', onkeyup:e => D.inputBasenameSearch(e, diagram, action)});
		rows.push(H3.tr(H3.td(this.basenameElt)));
		this.properNameElt = H3.input('##new-properName', {placeholder:'Proper name', title:'Proper name', onkeydown:e => Cat.D.onEnter(e, action)});
		rows.push(H3.tr(H3.td(this.properNameElt)));
		this.descriptionElt = H3.input('##new-description.in100', {title:'Description', placeholder:'Description', onkeydown:e => Cat.D.onEnter(e, action)});
		rows.push(H3.tr(H3.td(this.descriptionElt)));
		const elts = [H3.h5(headline)];
		elts.push(H3.table(rows));
		elts.push(D.getIcon(action.name, 'edit', action, {title:headline}));
		return H3.tr(H3.td(elts, {colspan:2}), `##${id}`);
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
		super('Object', D.toolbar.help, headline, ['new', 'search']);
		this.bpd = new BPD();
		D.replayCommands.set('newObject', this);
	}
	addNewSection()
	{
		D.toolbar.table.appendChild(this.bpd.getNewSection(R.diagram, 'Object-new', e => this.create(e), this.headline));
	}
	getMatchingElements()
	{
		const filter = document.getElementById(`${this.type}-search-value`).value;
		const objects = R.diagram.getObjects().filter(o => o.name.includes(filter) && ((this.searchArgs.diagramOnly && o.diagram === R.diagram) || !this.searchArgs.diagramOnly));
		return objects.sort(this.searchArgs.sorter);
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
		super('Morphism', D.toolbar.help, headline, ['new', 'search']);
		Object.defineProperties(this,
		{
			domainElt:			{value: null,										writable: true},
			codomainElt:		{value: null,										writable: true},
			bpd:				{value: new BPD(),									writable: false},
		});
		D.replayCommands.set('newMorphism', this);
	}
	addNewSection()
	{
		const newSection = this.bpd.getNewSection(R.diagram, 'Morphism-new', e => this.create(e), this.headline);
		D.toolbar.table.appendChild(newSection);
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
		const filter = document.getElementById(`${this.type}-search-value`).value;
		const morphisms = R.diagram.getMorphisms().filter(m => m.name.includes(filter) && ((this.searchArgs.diagramOnly && m.diagram === R.diagram) || !this.searchArgs.diagramOnly));
		const sigs = new Map();
		morphisms.map(m =>
		{
			if (!sigs.has(m.signature))
				sigs.set(m.signature, m);
		});
		const remaining = [...sigs.values()];
		remaining.sort(this.searchArgs.sorter);
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

class CategoryTool extends ElementTool
{
	constructor(headline)
	{
		super('Category', D.toolbar.help, headline, ['new', 'search']);
		Object.defineProperties(this,
		{
			bpd:			{value: new BPD(),				writable: false},
		});
	}
	addNewSection()
	{
		const newSection = this.bpd.getNewSection(R.diagram, 'Category-new', e => this.create(e), this.headline);
		D.toolbar.table.appendChild(newSection);
		const table = newSection.querySelector('table');
	}
	getMatchingElements()
	{
		const filter = document.getElementById(`${this.type}-search-value`).value;
		return [...R.categories.values()].sort(this.searchArgs.sorter);
	}
	doit(e, diagram, args)
	{
		const cat = new Category();
	}
	create(e)
	{
	}
}

class DiagramTool extends ElementTool
{
	constructor(type, toolbar, headline)
	{
		super(type, toolbar, headline, ['new', 'search', 'upload-json']);
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
		const name = info.name;
		const diagram = R.$CAT.getElement(name);
		if (diagram)
		{
			if (R.user.canUpload() && R.cloud && info.user === R.user.name)
			{
				if (!nobuts.has('upload') && R.isLocalNewer(diagram.name))
					buttons.push(D.getIcon('upload', 'upload', e => diagram.upload(e, false), {title:'Upload to cloud ' + R.cloudURL, aniId:'diagramUploadBtn'}));
				if (!nobuts.has('download') && R.isCloudNewer(diagram.name))
					buttons.push(D.getIcon('downcloud', 'downcloud', e => diagram.download(e, false), {title:'Download from cloud ' + R.cloudURL}));
			}
			if (!nobuts.has('download'))
			{
				if (info.category === 'em/Cat')
				{
					buttons.push(D.getIcon('js', 'download-js', e => diagram.downloadJS(e), {title:'Download Javascript'}));
					buttons.push(D.getIcon('cpp', 'download-cpp', e => diagram.downloadCPP(e), {title:'Download C++'}));
				}
				buttons.push(D.getIcon('json', 'download-json', e => diagram.downloadJSON(e), {title:'Download JSON'}));
				buttons.push(D.getIcon('png', 'download-png', e => window.open(`diagram/${name}.png`, 'Diagram PNG',
					`height=${D.snapshotHeight}, width=${D.snapshotWidth}, toolbar=0, location=0, status=0, scrollbars=0, resizeable=0`), {title:'View PNG'}));
			}
		}
		if (!nobuts.has('view'))
			buttons.push(D.getIcon('view', 'view', e => Runtime.SelectDiagram(name, 'default'), {title:'View diagram'}));
		const refcnt = diagram ? diagram.refcnt : info ? info.refcnt : 0;
		if (!nobuts.has('delete') && refcnt === 0 && info.user === R.user.name && R.canDeleteDiagram(info.name))
		{
			const btn = D.getIcon('delete', 'delete', e => Cat.R.deleteDiagram(e, info.name), {title:'Delete diagram'});
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
						R.removeReference(e, name);
						this.search();
					}, {title:'Remove reference'});
					btn.querySelector('rect.btn').style.fill = 'red';
					buttons.push(btn);
				}
			}
			else if (!R.diagram.allReferences.has(name) && R.catalog.has(name) && name !== R.diagram.name)
			{
				const allRefs = R.getReferences(name);
				if (!allRefs.has(R.diagram.name))
				{
					const addRef = (e, name) =>
					{
						Runtime.DownloadDiagram(name, ev =>
						{
							try		// TODO remove?
							{
								R.addReference(ev, name, _ => this.search());
							}
							catch(x)
							{
								D.toolbar.showError(x);
							}
						}, e);
					};
					buttons.push(D.getIcon('reference', 'reference', e => addRef(e, name), {title:'Add reference'}));
				}
			}
		}
		if ((!R.diagram || name !== R.diagram.name) && !nobuts.has('close') && D.session.diagrams.has(name))
		{
			const closeFn = nm =>
			{
				const diagram = R.$CAT.getElement(nm);
				if (diagram)
					diagram.close();
				else
					D.emitCATEvent('close', nm);
			};
			buttons.push(D.getIcon('close', 'close', e => closeFn(name), {title:'Remove from session'}));
		}
		return buttons;
	}
	setSearchBar(search = true)
	{
		super.setSearchBar();
		const searchFilter = document.getElementById(this.searchFilterId);
		R.diagram && searchFilter.appendChild(D.getIcon('reference', 'reference', e => this.toggleReferenceFilter(e), {title:'Restrict to this diagram\'s references', id:'filter-reference'}));
		searchFilter.appendChild(D.getIcon('session', 'session', e => this.toggleSessionFilter(e), {title:'Show diagrams in user session', id:'filter-session'}));
		searchFilter.appendChild(D.getIcon('login', 'login', e => this.toggleUserFilter(e), {title:'Restrict to user', id:'filter-user'}));
		const searchSorter = document.getElementById(this.searchSorterId);
		const timeIcon = D.getIcon('clock', 'clock', e => this.setTimeSorter(), {title:'Sort by last save time', id:`${this.constructor.name}-time-icon`});
		searchSorter.appendChild(timeIcon);
		this.setTimeSorter(search);
	}
	html(e)
	{
		super.html(e);
		const diagram = R.diagram;
		const toolbar2 = D.toolbar.element.querySelector('#help-toolbar2');
		if (R.user.canUpload())
		{
			toolbar2.appendChild(D.getIcon('upload-json', 'upload-json', _ => this.showSection('upload-json'), {title:'Upload', id:`${this.type}-upload-json-icon`}));
			const form = D.uploadJSONForm();
			toolbar2.appendChild(form);
			form.insertBefore(H3.h4('Upload Diagram JSON'), form.firstChild);
		}
		const searchTable = document.getElementById(`${this.type}-search-tools`);
		this.infoElement = H3.tr(H3.td(`##${this.type}-search-info`));
		searchTable.appendChild(this.infoElement);
	}
	setTimeSorter(search = true)
	{
		this.searchArgs.sorter = U.TimestampSorter;
		D.setActiveIcon(document.getElementById(`${this.constructor.name}-time-icon`));
		search && this.search();
	}
	toggleUserFilter(e)
	{
		this.searchArgs.userOnly = !this.searchArgs.userOnly;
		D.toggleIcon(e.target, this.searchArgs.userOnly);
		if (this.searchArgs.userOnly)
			this.infoElement.appendChild(H3.p('##filter-user-info.smallPrint.center', `Diagrams owned by the user ${R.user.name}.`));
		else
		{
			const elt = document.getElementById('filter-user-info');
			elt && elt.remove();
		}
		this.search();
	}
	toggleReferenceFilter(e)
	{
		this.searchArgs.referenceOnly = !this.searchArgs.referenceOnly;
		D.toggleIcon(e.target, this.searchArgs.referenceOnly);
		if (this.searchArgs.referenceOnly)
			this.infoElement.appendChild(H3.p('##filter-reference-info.smallPrint.center', `Reference diagrams of the diagram ${R.diagram.name}.`));
		else
		{
			const elt = document.getElementById('filter-reference-info');
			elt && elt.remove();
		}
		this.search();
	}
	toggleSessionFilter(e)
	{
		this.searchArgs.sessionOnly = !this.searchArgs.sessionOnly;
		D.toggleIcon(e.target, this.searchArgs.sessionOnly);
		if (!this.searchArgs.sessionOnly)
			this.infoElement.appendChild(H3.p('##filter-session-info.smallPrint.center', 'Session diagrams'));
		else
		{
			const elt = document.getElementById('filter-session-info');
			elt && elt.remove();
		}
		this.search();
	}
	toggleActionFilter(e)
	{
		this.searchArgs.actionOnly = !this.searchArgs.actionOnly;
		D.toggleIcon(e.target, this.searchArgs.actionOnly);
		if (this.searchArgs.actionOnly)
			this.infoElement.appendChild(H3.p('##filter-action-info.smallPrint.center', 'Action diagrams'));
		else
		{
			const elt = document.getElementById('filter-action-info');
			elt && elt.remove();
		}
		this.search();
	}
	addNewSection()
	{
		const newSection = this.bpd.getNewSection(R.$CAT, 'Diagram-new', e => this.create(e), this.headline);
		const copyIt = D.getIcon('copy', 'copy', e => this.copy(e), {title:'Copy diagram'});
		newSection.querySelector('td').appendChild(copyIt);
		const action = e => this.create(e);
		this.bpd.basenameElt.onkeydown = e => Cat.D.onEnter(e, action);
		this.bpd.properNameElt.onkeydown = e => Cat.D.onEnter(e, action);
		this.bpd.descriptionElt.onkeydown = e => Cat.D.onEnter(e, action);
		this.codomainElt = H3.select('##new-codomain.w100');
		const cats = new Set([R.Cat]);
		for (const [name, e] of R.$CAT.elements)
			if (e instanceof Category && !(e instanceof IndexCategory))
				cats.add(e);
		cats.forEach(cat => this.codomainElt.appendChild(H3.option(cat.properName, {value:cat.name})));
		const tbl = newSection.querySelector('table');
		tbl.appendChild(H3.tr(H3.td(this.codomainElt)));
		D.toolbar.table.appendChild(newSection);
	}
	getMatchingElements()
	{
		const diagrams = [];
		const filter = document.getElementById(`${this.type}-search-value`).value;
		R.catalog.forEach((info, name) => R.canUploadUser(info.user) && name.includes(filter) &&
			info.basename !== info.user &&
			diagrams.push(info));
		diagrams.sort(this.searchArgs.sorter);
		return diagrams;
	}
	reset()
	{
		this.bpd.reset();
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
			D.emitCATEvent('new', diagram);
			Runtime.SelectDiagram(diagram.name);
		}
	}
	copy(e)
	{
		try
		{
			const args = this.bpd.getArgs();
			const diagram = R.diagram.copy(args.basename, args.properName, args.description);
			if (typeof diagram === 'string')
				D.toolbar.showError(diagram);		// did not work
			else
			{
				this.bpd.reset();
				D.emitCATEvent('new', diagram);
				Runtime.SelectDiagram(diagram.name);
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

class CatalogTool extends DiagramTool		// GUI only
{
	constructor()
	{
		const toolbar = H3.td('##catalog-toolbar');	// buttons
		super('catalog', toolbar, 'Catalog');
		this.sections.length = 0;
		this.sections.push('search', 'new', 'upload');
		this.catalog = document.getElementById('catalog');
		this.catalog.appendChild(H3.table(H3.tr(this.toolbar)));
		this.mode = 'search';								// what viewing mode are we in?
		this.initialized = false;
		const action = e => this.createDiagram();
		const uploadForm = D.uploadJSONForm();
		uploadForm.classList.remove('hidden');
		const topBar = H3.div(
							H3.div('##catalog-search.hidden', this.getSearchBar()),
							H3.div('##catalog-new.hidden',
								H3.h3('New Diagram'),
								H3.table('##catalog-diagram-new',
									H3.tr(H3.td(	H3.input('##catalog-new-basename.catalog-input.ifocus', {placeholder:'Base name', onkeyup:e => D.inputDiagramBasenameSearch(e, action, R.$CAT)}),
													H3.input('##catalog-new-properName.catalog-input', {placeholder:'Proper name', onkeyup:e => Cat.D.onEnter(e, action)}),
													H3.input('##catalog-new-description.catalog-input', {placeholder:'Description', onkeyup:e => Cat.D.onEnter(e, action)}),
													H3.span('##catalog-select-codomain-span'),
													D.getIcon('edit', 'edit', action)))),
								H3.span('##catalog-new-error')),
							H3.div('##catalog-upload.hidden',
								H3.h3('Upload'),
								uploadForm)
							);
		this.catalog.appendChild(topBar);
		this.infoElement = H3.div(`##${this.type}-tool-info`);		// info about the state of the displayed items; needed since super.html() is not called
		this.catalog.appendChild(this.infoElement);
		this.catalogDisplay = H3.div('##catalog-display');		// the actual catalog display
		this.catalog.appendChild(this.catalogDisplay);
		this.diagrams = [];
		this.imageScaleFactor = 1.1;
		this.searchInput = document.getElementById('catalog-search-value');
		window.addEventListener('CAT', e =>
		{
			let img = null;
			const args = e.detail;
			const diagram = args.diagram;
			let div = null;
			switch(args.command)
			{
				case 'close':
					div = this.catalog.querySelector(`div[data-name="${diagram.name}"]`);
					div && this.searchArgs.sessionOnly && div.remove();		// remove image in catalog search
					break;
				case 'delete':		// delete diagram
					div = this.catalog.querySelector(`div[data-name="${diagram.name}"]`);	// find catalog entry
					div && div.remove();		// remove image in catalog
					this.diagrams = this.diagrams.filter(d => d.name !== diagram.name);
					break;
				case 'upload':
					if (this.mode === 'search')
						this.updateImage(diagram);
					break;
				case 'load':
				case 'new':
					this.diagrams.filter(info => info.name === diagram.name).length > 0 && this.display(diagram);
					break;
			}
		});
		window.addEventListener('View', e =>
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'catalog':
					document.body.style.overflow = '';		// turn on scrollbars
					this.show();
					this.updateDiagramCodomain();
					this.update();
					break;
				case 'diagram':
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
					this.html();
					this.setImageScale();
					this.updateDiagramCodomain();
					this.setSearchBar(false);
					this.diagrams = this.getMatchingElements();
					this.initialized = true;
					this.update();
					this.showSection('search');
					break;
			}
		});
		window.addEventListener('PNG', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch (args.command)
			{
				case 'load':
				case 'new':
					this.diagrams.filter(info => info.name === diagram.name).length > 0 && this.updateImage(diagram);
					break;
			}
		});
	}
	updateDiagramCodomain()
	{
		const codomainElt = H3.select('##catalog-select-codomain');
		const cats = R.getAvailableCategories();
		cats.map(cat => codomainElt.appendChild(H3.option(cat.properName, {value:cat.name})));
		codomainElt.appendChild(H3.option(R.Cat.properName, {value:R.Cat.name}));
		const span = document.getElementById('catalog-select-codomain-span');
		D.removeChildren(span);
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
		const onkeyup = e => this.search();
	}
	getRows(tbl, elements)
	{
		elements.map(diagram => this.display(diagram));
	}
	clear()
	{
		let elt = this.catalogDisplay.firstChild;
		while(elt)
		{
			elt.classList.add('hidden');
			elt = elt.nextSibling;
		}
	}
	setupImg(div, info, img)
	{
		if (this.mode !== 'reference')
		{
			let listener = null;
			img.classList.add('catalog-img');
			img.onmouseenter = evnt =>
			{
				const showToolbar = e =>
				{
					const diagramToolbar = div.querySelector('.verticalTools');
					D.removeChildren(diagramToolbar);
					super.getButtons(info).map(btn => diagramToolbar.appendChild(H3.tr(H3.td(btn))));
					diagramToolbar.style.opacity = 100;
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
				const diagramToolbar = div.querySelector('.verticalTools');
				diagramToolbar.style.opacity = 0;
				window.removeEventListener('CAT', listener);
			};
		}
		else	// reference view
		{
			img.onmouseenter = e =>
			{
				R.catalog.get(e.target.dataset.name).references.map(refName => this.catalog.querySelector(`img[data-name="${refName}"]`).classList.add('glow'));
				diagramToolbar.classList.remove('hidden');
			};
			img.onmouseleave = e =>
			{
				R.catalog.get(e.target.dataset.name).references.map(refName => this.catalog.querySelector(`img[data-name="${refName}"]`).classList.remove('glow'));
				diagramToolbar.classList.add('hidden');
			};
		}
	}
	getDiagramDiv(name)
	{
		return this.catalog.querySelector(`div[data-name="${name}"]`);
	}
	getArgs(name)
	{
		const args =
		{
			onclick:_ =>
			{
				D.setFullscreen(true, false);
				Runtime.SelectDiagram(name, 'defaultView');
			},
			style:			'cursor:pointer; transition:0.5s; height:auto; width:100%',
			'data-name':	name,
		};
		return args;
	}
	updateImage(info)
	{
		const div = this.getDiagramDiv(info.name);
		const img = div.querySelector('img');
		const parent = img.parentNode;
		img && img.remove();
		div.dataset.time = info.timestamp;
		D.getImageElement(info.name, png =>
		{
			this.setupImg(div, info, png);
			parent.appendChild(png);
		}, this.getArgs(info.name));
	}
	display(info)
	{
		let img = null;		// diagram png
		let diagramToolbar = null;
		let div = this.catalog.querySelector(`div[data-name="${info.name}"]`);
		if (div)
		{
			div.classList.remove('hidden');
			this.catalogDisplay.appendChild(div);
			img = div.querySelector('img');
			if (Number.parseInt(div.dataset.time) < info.timestamp)		// regenerate png if timestamp expired
				this.updateImage(info);
		}
		else
		{
			diagramToolbar = H3.table('.verticalTools.stdBackground');
			diagramToolbar.onmouseenter = e => {diagramToolbar.style.opacity = 100;};
			diagramToolbar.onmouseleave = e => {diagramToolbar.style.opacity = 0;};
			const td = H3.td('.stdBackground', {colspan:2});
			div = H3.div('.catalogEntry', {'data-name':info.name, 'data-time':info.timestamp}, H3.table(	H3.tr(td),
																											H3.tr(H3.td(D.getDiagramHtml(info))), '.smallTable'));
			this.catalogDisplay.appendChild(div);
			D.getImageElement(info.name, png =>
			{
				td.appendChild(H3.div({style:'position:relative;'}, png, diagramToolbar), div.firstChild);
				this.setupImg(div, info, png);
			}, this.getArgs(info.name));
		}
	}
	remove(name)
	{
		const elt = this.catalog.querySelector(`div[data-name="${name}"]`);
		elt && elt.remove();
	}
	askCloud(getVal = true)
	{
		switch(this.mode)
		{
			case 'search':
				if (getVal)
				{
					const search = this.searchInput.value;
					fetch(`/search?search=${encodeURIComponent(search)}`).then(response => response.json()).then(diagrams => {this.diagrams = diagrams; this.update();});
				}
				break;
			case 'references':
				fetch(`/search?search=${encodeURIComponent(search)}`).then(response => response.json()).then(diagrams => {this.diagrams = diagrams; this.update();});
				break;
		}
		D.busy();
	}
	referenceSearch()
	{
		this.diagrams = [];
		R.catalog.forEach((info, name) => info.localTimestamp > 0 && this.diagramFilter(info) && this.diagrams.push(info));
	}
	hide()
	{
		this.catalog.classList.add('hidden');
	}
	show(visible = true)
	{
		visible ? this.catalog.classList.remove('hidden') : this.hide();
	}
	getButtons(exclude = [])
	{
		const btns = [	D.getIcon('search', 'search', _ => this.showSection('search'), {title:'Search for diagram', id:'catalog-search-icon'}),
						D.getIcon('new', 'edit', _ => this.showSection('new'), {title:'New diagram', id:'catalog-new-icon'})];
		if (exclude.includes('upload-json'))
			btns.push(D.getIcon('upload', 'upload', _ => this.showSection('upload'), {title:'Upload local diagram', id:'catalog-upload-icon'}));
		else
			btns.push(D.getIcon('upload-json', 'upload-json', _ => this.showSection('upload'), {title:'Upload JSON file for diagram', id:'catalog-upload-icon'}));
		return btns;
	}
	update()
	{
		if (!this.initialized)
			return;
		this.clear();
		this.showSection(this.currentSection);
		const toolbar = D.navbar.element.querySelector('.buttonBarLeft');
		const buttons = D.session.mode === 'catalog' ? this.getButtons() : [];
		const size = '.32in';
		buttons.map(btn =>
		{
			btn.firstChild.style.width = size;
			btn.firstChild.style.height = size;
			toolbar.appendChild(btn);
		});
		toolbar.style.width = `${toolbar.childElementCount * D.default.icon}px`;
		switch(this.mode)
		{
			case 'search':
				const tbl = document.getElementById(`${this.type}-matching-table`);
				this.diagrams && this.getRows(tbl, this.filter(this.diagrams));
				break;
			case 'reference':
				this.diagrams.map(diagram =>
				{
					const filter = document.getElementById(`${this.type}-search-value`).value;
					if (filter !== '')
						this.diagramFilter(diagram) && this.display(diagram);
					else
						this.display(diagram);
				});
				break;
		}
	}
	diagramFilter(diagram)
	{
		return R.canUploadUser(diagram.user);
	}
	onwheel(e)
	{
		const imgs = [...this.catalogDisplay.querySelectorAll('img')];
		const dir = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY)));
		const nuScale = dir === 1 ? this.imageScaleFactor : 1 / this.imageScaleFactor;
		D.default.diagram.imageScale = D.default.diagram.imageScale * nuScale;
		D.default.diagram.imageScale = D.default.diagram.imageScale * nuScale;
		this.setImageScale();
		D.saveDefaults();
	}
	createDiagram()
	{
		const errorElt = document.getElementById('catalog-new-error');
		D.removeChildren(errorElt);
		const basenameElt = document.getElementById('catalog-new-basename');
		const properNameElt = document.getElementById('catalog-new-properName');
		const descriptionElt = document.getElementById('catalog-new-description');
		const codomainElt = document.getElementById('catalog-select-codomain');
		const diagram = R.createDiagram(codomainElt.value, basenameElt.value, properNameElt.value, descriptionElt.value);
		if (diagram instanceof Diagram)
		{
			D.emitCATEvent('new', diagram);
			[basenameElt, properNameElt, descriptionElt].map(elt => elt.value = '');
			diagram.makeSVG();
			diagram.placeText(diagram.properName, {x:0, y:0}, D.default.title.height, D.default.title.weight);
			diagram.description !== '' && diagram.placeText(diagram.description, {x:0, y:D.gridSize()}, D.default.font.height);
			Runtime.SelectDiagram(diagram, 'home');
		}
		else
			errorElt.innerHTML = U.HtmlSafe(diagram);
	}
	search()
	{
		this.diagrams = this.getMatchingElements();
		D.emitViewEvent('catalog', 'search');
	}
	toggleUserFilter(e)
	{
		super.toggleUserFilter(e);
		D.emitViewEvent('catalog', 'search');
	}
	toggleReferenceFilter(e)
	{
		super.toggleReferenceFilter(e);
		D.emitViewEvent('catalog', 'search');
	}
	toggleSessionFilter(e)
	{
		super.toggleSessionFilter(e);
		D.emitViewEvent('catalog', 'search');
	}
}

class CellTool extends ElementTool
{
	constructor(type, headline)
	{
		super('Cell', D.toolbar.help, headline, ['search']);
		this.hasDiagramOnlyButton = false;
		Object.defineProperties(this,
		{
			descriptionElt:		{value: null,		writable: true},
			error:				{value: null,		writable: true},
		});
	}
	addNewSection()
	{
		this.toolbar.appendChild(H3.tr(H3.td((`##${this.type}-new.hidden`))));
	}
	html(e)
	{
		super.html();
		const searchbar = D.toolbar.help.querySelector('#Cell-search-tools');
		searchbar.classList.add('hidden');
		const h3 = D.toolbar.table.querySelector('h3');
		h3.innerHTML = 'Cells';
		const args = {type:"checkbox", onchange:e => D.toggleShowCommutivity(e), id:'check-computed-cells'};
		if (D.default.showCommutivity)
			args.checked = true;
		h3.parentNode.appendChild(H3.span(H3.input(args), H3.span('Show computed cells')));
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

class DefinitionTool extends ElementTool
{
	constructor(type, headline)
	{
		super('Definition', D.toolbar.help, headline, ['search']);
		this.hasDiagramOnlyButton = false;
		Object.defineProperties(this,
		{
			selector:			{value: null,		writable: true},
			error:				{value: null,		writable: true},
			targetCat:				{value: null,		writable: true},
		});
	}
	html(e)
	{
		super.html();
		const searchbar = D.toolbar.help.querySelector('#Definition-search-tools');
		searchbar.classList.add('hidden');
		const h3 = D.toolbar.table.querySelector('h3');
		h3.innerHTML = 'Definitions';
		const cats = R.diagram.getCategories();
		const catSelector = H3.select({onchange:e => {this.targetCat = R.diagram.getElement(e.target.value);}}, [...cats].map(cat =>
		{
			const args = {value:cat.name};
			if (cat === R.category)
				args.selected = true;
			return H3.option(cat.properName, args);
		}));
		const div = H3.div(H3.p('Instantiate definition in category ', catSelector), H3.p('Select a definition to instantiate.'));
		h3.after(div);
		const defs = R.diagram.getDefinitions();
		defs.unshift({action:{basename:'Select a definition'}, name:null});
		this.selector = H3.select({onchange:e => this.showDefinition(e.target.value)}, defs.map(def => H3.option(def.action.basename, {value:def.action.basename})));
		div.after(this.selector);
	}
	getRows(tbl, definitions) {}		// ignore
	getMatchingElements() { return []; }		// ignore
	getInputs(def)
	{
		const elements = def.getSequenceElements();
		const inputs = [];
		elements.forEach(o => inputs.push(document.getElementById(o.elementId('def')).value));
		return inputs;
	}
	showDefinition(actionBasename)
	{
		let node = this.selector.nextSibling;
		while(node)
		{
			node.remove();
			node = this.selector.nextSibling;
		}
		const defs = R.diagram.getDefinitions();
		const def = defs.filter(d => d.action.basename === actionBasename)[0];
		if (def)
		{
			const elements = def.getSequenceElements();
			const rows = [...elements].map(o => H3.tr(H3.td(o.getHtmlRep()), H3.td(H3.input(`##${o.elementId('def')}`))));
			const table = H3.table(rows);
			this.selector.after(table);
			table.after(D.getIcon('edit', 'edit', e => def.instantiate(R.diagram, this.targetCat, this.getInputs(def), D.mouse.diagramPosition(R.diagram))));
		}
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
		this.xy = D2.add(this.xy, new D2(20, -60));
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
				R.recordError(this.message);
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

class Session
{
	constructor()
	{
		Object.defineProperties(this,
		{
			mode:			{value: 'catalog',	writable: true},
			diagrams:		{value: new Map(),	writable: false},
			current:		{value: null,		writable: true},
			viewport:		{value: null,		writable: true},
			stdView:		{value: {viewport:{x:0, y:0, scale:1.0, timestamp:0}, placement:{x:0, y:0, scale:1.0}},	writable: false},
		});
	}
	getStdView()
	{
		return U.clone(this.stdView);
	}
	setCurrentDiagram(diagram)
	{
		this.current = diagram.name;
	}
	getCurrentDiagram()
	{
		return this.current;
	}
	getViewport(name)
	{
		if (this.diagrams.has(name))
			return this.diagrams.get(name).viewport;
		return this.getStdView().viewport;
	}
	setViewport(name, vp)
	{
		if (!this.diagrams.has(name))
			this.diagrams.set(name, this.getStdView());
		const viewport = this.diagrams.get(name).viewport;
		viewport.x = Math.round(vp.x);
		viewport.y = Math.round(vp.y);
		viewport.scale = vp.scale;
	}
	setCurrentViewport(vp = {x:0, y:0, scale:1.0, timestamp:0})
	{
		this.viewport = U.clone(vp);
		if (R.diagram && D.default.fullscreen)
		{
			this.setViewport(R.diagram.name, vp);
			this.current = R.diagram.name;
		}
	}
	save()
	{
		const json =
		{
			mode:		this.mode,
			diagrams:	U.jsonMap(this.diagrams),
			current:	this.current,
			viewport:	this.viewport,
		};
		U.writefile('session.json', JSON.stringify(json));
	}
	read()
	{
		const str = U.readfile('session.json');
		if (str)
		{
			const json = JSON.parse(str);
			this.mode = json.mode;
			json.diagrams.map(data => this.diagrams.set(data[0], data[1]));
			this.current = json.current;
			if (this.mode === 'diagram' && this.current === null)
				this.mode = 'catalog';
			this.viewport = 'viewport' in json ? json.viewport : this.stdView.viewport;
		}
	}
	loadAction(action) { }
	loadDiagrams(fn)
	{
		const diagrams = [...this.diagrams.keys()].filter(dgrm => !(dgrm.user === 'ctx' || dgrm.user === 'sys'));
		const loader = d => Runtime.DownloadDiagram(d, _ => diagrams.length > 0 ? loader(diagrams.shift()) : fn());
		loader(diagrams.shift());
	}
	getCurrentViewport()
	{
		return this.viewport;
	}
	setNoCurrentDiagram()
	{
		this.current = null;
	}
	setPlacement(name, plc)
	{
		if (!this.diagrams.has(name))
			this.diagrams.set(name, this.getStdView());
		const placement = this.diagrams.get(name).placement;
		placement.x = plc.x;
		placement.y = plc.y;
		placement.scale = plc.scale;
	}
	getPlacement(name)
	{
		if (this.diagrams.has(name))
			return this.diagrams.get(name).placement;
		return U.clone(this.getStdView().placement);
	}
	remove(name)
	{
		this.diagrams.delete(name);
		if (name === this.current)
		{
			this.current = null;
			this.mode = 'catalog';
		}
	}
}

class Display
{
	constructor()
	{
		Object.defineProperties(this,
		{
			bracketWidth:	{value: 0,			writable: true},
			commaWidth:		{value: 0,			writable: true},
			parenWidth:		{value: 0,			writable: true},
			catalog:		{value: null,		writable: true},
			category:		{value: null,		writable: true},
			copyDiagram:	{value:	null,		writable: true},
			ctrlKey:		{value: false,		writable: true},
			default:
			{
				value:
				{
					arrow:
					{
						length:	150,		// px
						margin:	16,			// px
						dir:	{x:1, y:0},
					},
					autohideTimer:	60000,	// ms
					autosaveTimer:	500,	// ms
					borderAlert:	2,		// screen widths
					borderMargin:	20,		// px
					borderMinOpacity:	0.15,
					button:		{tiny:0.4, small:0.66, large:1.0},	// inches
					darkmode:		false,
					diagram:
					{
						imageScale:		1.0,
						margin:			20,		// px
					},
					font:			{height:24},
					fullscreen:		true,
					fuse:
					{
						fillStyle:	'#3f3a',
						lineDash:	[],
						lineWidth:	2,		// px
						margin:		2,		// px
					},
					icon:			32,		// px
					layoutGrid:		10,		// px
					lineDeltaY:		1.3,	// em
					majorGridMult:	5,		// times
					margin:			5,		// px
					pan:			{scale:	0.05},
					panel:			{width:	230},		// px
					scale:			{base:1.05},
					scale3D:		1,
					showCommutivity:false,
					stdOffset:		new D2(50, 50),
					stdArrow:		new D2(150, 0),
					statusbar:		{
										timein:			100,	// ms
										timeout:		5000,	// ms
										hideDistance:	50,		// px
									},
					title:			{height:76, weight:'bold'},
					toolbar:		{x:15, y:70},
					viewMargin:		0.1,	// pure
				},
				writable:		true,
			},
			diagramPNGs:	{value: new Map(),	writable: true},	// a map of the loaded diagram png's
			diagramSVG:		{value: null,		writable: true},	// the svg g element containing the session transform
			directions:		{value: [	new D2(0, -1),
										new D2(1, 0),
										new D2(-1, 0),
										new D2(0, 1),
										new D2(-1, -1),
										new D2(-1, 1),
										new D2(1, 1),
										new D2(1, -1)]},
			drag:			{value: false,		writable: true},
			dragStart:		{value: new D2(),	writable: true},
			// the svg text element being editted
			editElement:	{value: null,		writable: true},
			elementTool:	{value: null,		writable: true},
			emphasized:		{value: new Set(),	writable: false},
			factoryDefaults:{value: null,		writable: true},
			gradients:		{value: {radgrad1:null, radgrad2:null},	writable: false},
			graphColors:	{value: [],			writable: false},
			gridding:		{value: true,		writable: true},
			helpPanel:		{value: null,		writable: true},
			id:				{value: 0,			writable: true},
			inputMode:		{value: 'text',		writable: true},
			keyboardDown:			// keyup actions
			{
				value:
				{
					Minus(e) { D.zoom(D.mouse.clientEvent(), -2);},
					Equal(e) { D.zoom(D.mouse.clientEvent(), 2);},
		//			AltHome(e)		BROWSER RESERVED
					Backspace(e)
					{
						const diagrams = [...D.session.diagrams.keys()];
						let ndx = diagrams.indexOf(R.diagram.name);
						if (ndx === 0)
							ndx = diagrams.length -1;
						else
							ndx--;
						Runtime.SelectDiagram(diagrams[ndx]);
						e.preventDefault();
					},
					ShiftBackspace(e)
					{
						const diagrams = [...D.session.diagrams.keys()];
						let ndx = diagrams.indexOf(R.diagram.name);
						if (ndx === diagrams.length -1)
							ndx = 0;
						else
							ndx++;
						Runtime.SelectDiagram(diagrams[ndx]);
						e.preventDefault();
					},
					ControlHome(e)
					{
						if (R.diagram && D.session.mode === 'diagram')
						{
							D.setFullscreen(true);
							R.diagram.homeTop();
							D.emitViewEvent(D.session.mode, R.diagram);
						}
					},
					ControlEnd(e)
					{
						if (R.diagram && D.session.mode === 'diagram')
						{
							D.setFullscreen(true);
							R.diagram.homeEnd();
							D.emitViewEvent(D.session.mode, R.diagram);
						}
					},
					Home(e)
					{
						if (R.diagram && D.session.mode === 'diagram')
						{
							const diagram = R.diagram;
							if (D.default.fullscreen && diagram)
							{
								diagram.home();
								D.emitViewEvent(D.session.mode, R.diagram);
							}
							else
							{
								const bbox = new D2();
								D.forEachDiagramSVG(d => !d.svgRoot.classList.contains('hidden') && bbox.merge(d.svgRoot.getBBox()));
								D.setSessionViewportByBBox(bbox);
								D.emitViewEvent(D.session.mode, R.diagram);
							}
							e.preventDefault();
						}
					},
					ArrowUp(e)
					{
						D.panHandler(e, 'up');
					},
					ShiftArrowUp(e)
					{
						R.diagram.moveElements({x:0, y:-D.gridSize()}, ...R.diagram.selected);
					},
					ControlArrowDown(e)
					{
						if (R.diagram.selected.length === 1)
						{
							const elt = R.diagram.getSelected();
							if (Arrow.isArrow(elt))
							{
								const bzr = elt.attributes.get('bezier');
								elt.attributes.set('bezier', bzr +1);
								D.emitElementEvent(R.diagram, 'update', elt, {bezier:true});
							}
							e.preventDefault();
						}
					},
					ControlArrowUp(e)
					{
						if (R.diagram.selected.length === 1)
						{
							const elt = R.diagram.getSelected();
							if (Arrow.isArrow(elt))
							{
								const bzr = elt.attributes.get('bezier');
								elt.attributes.set('bezier', bzr -1);
								D.emitElementEvent(R.diagram, 'update', elt, {bezier:true});
							}
							e.preventDefault();
						}
					},
					ControlShiftArrowUp(e)
					{
						if (R.diagram.selected.length === 1)
						{
							const elt = R.diagram.getSelected();
							if (Arrow.isArrow(elt))
							{
								const bzr = elt.attributes.get('bezier');
								elt.attributes.set('bezier', bzr + .1);
								D.emitElementEvent(R.diagram, 'update', elt, {bezier:true});
							}
							e.preventDefault();
						}
					},
					ControlShiftArrowDown(e)
					{
						if (R.diagram.selected.length === 1)
						{
							const elt = R.diagram.getSelected();
							if (Arrow.isArrow(elt))
							{
								const bzr = elt.attributes.get('bezier');
								elt.attributes.set('bezier', bzr - .1);
								D.emitElementEvent(R.diagram, 'update', elt, {bezier:true});
							}
							e.preventDefault();
						}
					},
					ArrowDown(e)
					{
						D.panHandler(e, 'down');
					},
					ShiftArrowDown(e)
					{
						R.diagram.moveElements({x:0, y:D.gridSize()}, ...R.diagram.selected);
					},
					ArrowLeft(e)
					{
						D.panHandler(e, 'left');
					},
					ShiftArrowLeft(e)
					{
						R.diagram.moveElements({x:-D.gridSize(), y:0}, ...R.diagram.selected);
					},
					ArrowRight(e)
					{
						D.panHandler(e, 'right');
					},
					ShiftArrowRight(e)
					{
						R.diagram.moveElements({x:D.gridSize(), y:0}, ...R.diagram.selected);
					},
					BracketRight(e)
					{
						if (R.Actions.detachCodomain.hasForm(R.diagram, R.diagram.selected))
							R.Actions.detachCodomain.action(e, R.diagram, R.diagram.selected);
					},
					BracketLeft(e)
					{
						if (R.Actions.detachDomain.hasForm(R.diagram, R.diagram.selected))
							R.Actions.detachDomain.action(e, R.diagram, R.diagram.selected);
					},
					ControlBracketRight(e)
					{
						if (R.diagram.selected.length === 1 && R.diagram.selected[0] instanceof IndexText)
						{
							const text = R.diagram.getSelected();
							text.isEditable() && text.updateHeight(text.height + 4);
							text.showSelected(true);
						}
					},
					ControlBracketLeft(e)
					{
						if (R.diagram.selected.length === 1 && R.diagram.selected[0] instanceof IndexText)
						{
							const text = R.diagram.getSelected();
							text.isEditable() && text.height > 8 && text.updateHeight(text.height - 4);
							text.showSelected(true);
						}
					},
					ControlLeft(e) { D.ctrlKey = true; },
					ControlRight(e) { D.ctrlKey = true; },
					Digit1(e)
					{
						if (R.Actions.terminal.hasForm(R.diagram, R.diagram.selected))
							R.Actions.terminal.action(e, R.diagram, R.diagram.selected);
					},
					Digit2(e)
					{
						if (R.diagram)
						{
							const diagram = R.diagram;
							if (diagram.selected.length === 1)
							{
								const from = diagram.selected[0];
								if ('to' in from)
								{
									const to = from.to;
									const pos = D.mouse.diagramPosition(diagram);
									if (to instanceof CatObject)
										diagram.placeObject(diagram.prod(to, to), pos);
									else if (to instanceof Morphism)
										diagram.placeMorphism(diagram.prod(to, to), pos, null, true);
								}
							}
							else if (diagram.selected.length === 0)
							{
								const one = diagram.get('FiniteObject', {size:1});
								const two = diagram.coprod(one, one);
								diagram.placeObject(two, D.mouse.diagramPosition(diagram));
							}
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
						D.deleteSelectRectangle();
						if (D.textEditActive())
							D.closeActiveTextEdit();
						else if (D.session.mode === 'catalog' && R.diagram)
							D.emitViewEvent('diagram', R.diagram);
						else if (D.session.mode === 'diagram')
						{
							let isOpen = false;
							Object.values(D.panels.panels).forEach(pnl => isOpen = isOpen || (pnl.elt.style.width !== '0px' && pnl.elt.style.width !== ''));
							if (isOpen)
								D.panels.closeAll();
							if (!D.toolbar.element.classList.contains('hidden'))
								D.toolbar.hide();
							else
							{
								D.hideBorderAlerts();
								R.diagram && D.setFullscreen(!D.default.fullscreen);
								if (D.default.fullscreen)
									D.diagramSVG.appendChild(R.diagram.svgRoot);
								else
									D.enterMultiDiagramMode();
							}
						}
						e.preventDefault();
						// TODO abort drag element
					},
					KeyA(e)
					{
						D.toolbar.show();
						D.elementTool.Cell.html(e);
					},
					ShiftKeyA(e)
					{
						D.toolbar.show();
						D.elementTool.Cell.html(e);
						e.preventDefault();
					},
					ControlKeyA(e)
					{
						R.diagram.selectAll();
						e.preventDefault();
					},
					KeyC(e)
					{
						this.ControlKeyC(e);
						this.ControlKeyV(e);
					},
					ControlKeyB(e)
					{
						if (R.diagram.selected.length === 1 && R.diagram.selected[0] instanceof IndexText)
						{
							const text = R.diagram.getSelected();
							if (text.isEditable())
							{
								const weight = text.weight === 'bold' ? 'normal' : 'bold';
								text.updateWeight(weight)
								text.showSelected(true);
							}
						}
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
						e.preventDefault();
					},
					ShiftKeyD(e)
					{
						D.toolbar.show();
						D.elementTool.Diagram.html(e);
						D.elementTool.Diagram.showSection('new');
						e.preventDefault();
					},
		//			ControlKeyD(e)		BROWSER RESERVED: bookmark current page
		//			ControlKeyF(e)		BROWSER RESERVED: search on page
					KeyG(e)
					{
						Cat.R.diagram.activate(e, 'graph');
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
							R.Actions.identity.action(e, R.diagram, R.diagram.selected);
					},
					KeyJ(e)
					{
						if (Cat.R.diagram && Cat.R.diagram.selected.length === 1)
						{
							D.toolbar.show(e);
							R.diagram.actionHtml(e, 'help');
							R.Actions.javascript.html(e, Cat.R.diagram, Cat.R.diagram.selected);
						}
						e.preventDefault();
					},
		//			ControlKeyJ(e)		BROWSER RESERVED: open download history
					KeyK(e)		// compose
					{
						if (R.Actions.composite.hasForm(R.diagram, R.diagram.selected))
							R.Actions.composite.action(e, R.diagram, R.diagram.selected);
					},
		//			ControlKeyK(e)		BROWSER RESERVED: focus on search box
					KeyL(e)		// lambda
					{
						if (R.Actions.lambda.hasForm(R.diagram, R.diagram.selected))
							R.Actions.lambda.html(e, R.diagram, R.diagram.selected);
					},
		//			ControlKeyL(e)		BROWSER RESERVED: focus on address bok
					KeyM(e)		// morphism tool
					{
						D.toolbar.show();
						D.elementTool.Morphism.html(e);
						e.preventDefault();
					},
					ShiftKeyM(e)	// new morphism
					{
						D.toolbar.show();
						D.elementTool.Morphism.html(e);
						D.elementTool.Morphism.showSection('new');
						D.toolbar.help.querySelector('#new-basename').focus();
						e.preventDefault();
					},
		//			ControlKeyN(e)		BROWSER RESERVED: open a new browser window
					KeyO(e)		// object tool
					{
						D.toolbar.show();
						D.elementTool.Object.html(e);
						e.preventDefault();
					},
					ShiftKeyO(e)		// new object
					{
						D.toolbar.show();
						D.elementTool.Object.html(e);
						D.elementTool.Object.showSection('new');
						D.toolbar.help.querySelector('#new-basename').focus();
						e.preventDefault();
					},
		//			ControlKeyO(e)		BROWSER RESERVED: open local page
					KeyP(e)		// product
					{
						if (R.Actions.productAssembly.hasForm(R.diagram, R.diagram.selected))
							R.Actions.productAssembly.action(e, R.diagram, R.diagram.selected);
						else if (R.Actions.product.hasForm(R.diagram, R.diagram.selected))
							R.Actions.product.action(e, R.diagram, R.diagram.selected);
						else if (R.Actions.project.hasForm(R.diagram, R.diagram.selected))
							R.diagram.actionHtml(e, 'project');
					},
					ShiftKeyP(e)		// coproduct
					{
						if (R.Actions.coproductAssembly.hasForm(R.diagram, R.diagram.selected))
							R.Actions.coproductAssembly.action(e, R.diagram, R.diagram.selected);
						else if (R.Actions.coproduct.hasForm(R.diagram, R.diagram.selected))
							R.Actions.coproduct.action(e, R.diagram, R.diagram.selected);
						else if (R.Actions.inject.hasForm(R.diagram, R.diagram.selected))
							R.diagram.actionHtml(e, 'inject');
					},
		//			ControlKeyP(e)		BROWSER RESERVED: print page
					KeyQ(e)		// help
					{
						if (R.Actions.help.hasForm(R.diagram, R.diagram.selected))
							R.Actions.help.html(e, R.diagram, R.diagram.selected);
					},
					ControlKeyQ(e)
					{
						const url = R.getURL(`?diagram=${R.diagram.name}&select=${R.diagram.selected.map(elt => elt instanceof Cell ? `{${elt.basename}}` : elt.basename).join(',')}`);
						navigator.clipboard.writeText(url);
						D.statusbar.show(e, 'Copied ' + url);
					},
					KeyR(e)		// reference
					{
						if (R.Actions.referenceMorphism.hasForm(R.diagram, R.diagram.selected))
							R.Actions.referenceMorphism.action(e, R.diagram, R.diagram.selected);
					},
		//			ControlKeyS(e)		BROWSER RESERVED: save page
					KeyT(e)
					{
						D.toolbar.show();
						D.elementTool.Text.html(e);
						e.preventDefault();
					},
					ShiftKeyT(e)
					{
						D.toolbar.show();
						D.elementTool.Text.html(e);
						D.elementTool.Text.showSection('new');
						D.toolbar.help.querySelector('#new-description').focus();
						e.preventDefault();
					},
		//			ControlKeyT(e)		BROWSER RESERVED: open a new tab
		//			ControlShiftKeyT(e)	BROWSER RESERVED: reopen last closed tab
		//			ControlKeyU(e)		BROWSER RESERVED: open current page source code
					KeyU(e)
					{
						D.toggleShowCommutivity();
					},
					KeyV(e)
					{
						R.diagram.selected.length > 0 && R.diagram.panToElements(...R.diagram.selected);
					},
					ControlKeyV(e)	{	D.paste(e);	},
		//			ControlKeyW(e)	 BROWSER RESERVED
					KeyX(e)
					{
						Cat.R.diagram && D.advanceInputMode();
					},
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
					KeyZ(e)
					{
						R.Actions.zoom.action(e, R.diagram, R.diagram.selected);
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
						if (R.diagram)
						{
							if (!D.default.fullscreen)
							{
								const svg = Cat.R.diagram.svgRoot;
								const nxt = svg.nextSibling;
								nxt && svg.parentNode.insertBefore(nxt, svg);
							}
							else
							{
								D.panHandler(e, 'up', D.height() * 0.8);
							}
						}
					},
					PageDown(e)
					{
						if (R.diagram)
						{
							if (!D.default.fullscreen)
							{
								const svg = Cat.R.diagram.svgRoot;
								const before = svg.previousSibling;
								before && svg.parentNode.insertBefore(svg, before);
							}
							else
								D.panHandler(e, 'down', D.height() * 0.8);
						}
					},
					ShiftSlash(e)
					{
						if (Cat.R.diagram && Cat.R.diagram.selected.length === 1)
						{
							D.toolbar.show(e);
							R.diagram.actionHtml(e, 'help');
						}
						e.preventDefault();
					},
					Space(e)
					{
						D.toolbar.hide();
						D.startMousePan(e);
					},
					ShiftLeft(e) { D.shiftKey = true; },
					ShiftRight(e) { D.shiftKey = true; },
					Tab(e)
					{
						const diagram = Cat.R.diagram;
						if (diagram)
						{
							if (diagram.selected.length === 1)
							{
								const element = diagram.getSelected();
								const items = diagram.getTabItems(element);
								let ndx = items.indexOf(element);
								if (ndx === items.length -1)
									ndx = 0;
								else
									ndx++;
								if (items.length > 0)
								{
									diagram.makeSelected(items[ndx]);
									diagram.panToElements(items[ndx]);
								}
							}
						}
						e.preventDefault();
					},
					ShiftTab(e)
					{
						const diagram = Cat.R.diagram;
						if (diagram && diagram.selected.length === 1)
						{
							const element = diagram.getSelected();
							const items = diagram.getTabItems(element);
							let ndx = items.indexOf(element);
							if (ndx === 0)
								ndx = items.length -1;
							else
								ndx--;
							if (items.length > 0)
							{
								diagram.makeSelected(items[ndx]);
								diagram.panToElements(items[ndx]);
							}
						}
						e.preventDefault();
					},
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
			local:				{value:false,		writable: true},		// local server, if it exists
			lastViewedDiagrams:	{value: new Map(),	writable: true},
			loginPanel:			{value: null,		writable: true},
			mouse:
			{
				value:
				{
					down:		new D2(window.innerWidth/2, window.innerHeight/2),
					onPanel:	false,			// is the mouse not on the main gui?
					xy:			null,			// in session coordinates
					clientPosition()			// return client coords
					{
						return this.xy[this.xy.length -1];
					},
					clientEvent()	// create bogus event
					{
						const xy = this.clientPosition();
						return {clientX:xy.x, clientY:xy.y, target:{dataset:{name:R.diagram.name}}};
					},
					sessionPosition()			// return session coords
					{
						return D.userToSessionCoords(this.clientPosition());
					},
					diagramPosition(diagram)	// return diagram coords
					{
						return diagram.userToDiagramCoords(this.clientPosition());
					},
					saveClientPosition(e)
					{
						const xy = this.xy;
						if (xy)
						{
							const clientY = e.clientY - D.topSVG.parentElement.offsetTop;
							if (xy.length > 0 && xy[xy.length -1].x === e.clientX && xy[xy.length -1].y === clientY)
								return;
							xy.push(new D2(e.clientX, clientY));
							if (xy.length > 2)
								xy.shift();
						}
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
			params:			{value:null,		writable: true},	// URL parameters
			pasteBuffer:	{value: [],			writable: true},
			replayCommands:	{value:	new Map(),	writable: false},
			screenPan:		{value: 0,			writable: true},
			settingsPanel:	{value: null,		writable: true},
			shiftKey:		{value: false,		writable: true},
			showUploadArea:	{value: false,		writable: true},
			snapshotWidth:	{value: 1024,		writable: true},
			snapshotHeight:	{value: 768,		writable: true},
			statusbar:		{value: new StatusBar(),	writable: false},
			store:			{value: null,		writable: true},
			svgContainers:	{value: ['svg', 'g', 'symbol', 'use'],	writable: false},
			svgStyles:		// required to create styles for png files
			{
				value:
				{
					circle:		['fill', 'margin', 'stroke', 'stroke-width', 'rx', 'ry'],
					ellipse:	['fill', 'margin', 'stroke', 'stroke-width', 'rx', 'ry'],
					line:		['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
					path:		['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
					polyline:	['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
					stop:		['stop-color', 'stop-opacity'],
					text:		['fill', 'font', 'margin', 'stroke', 'text-anchor', 'text-decoration'],
				},
				writable:	false,
			},
			textDisplayLimit:	{value: 60,			writable: true},
			textSize:		{value:	new Map(),	writable: false},
			threeDPanel:	{value: null,		writable: true},
			tool:			{value: ['select'],	writable: true},
			toolbar:		{value: new Toolbar(),											writable: false},
			topSVG:			{value: document.getElementById('topSVG'),						writable: false},
			ttyPanel:		{value: null,													writable: true},
			uiSVG:			{value: document.getElementById('uiSVG'),						writable: false},
			version:		{value: 1,														writable: false},
			session:		{value: new Session(),											writable: false},
			xmlns:			{value: 'http://www.w3.org/2000/svg',							writable: false},
		});
		this.initializeStorage();
	}
	initializeStorage()
	{
		const request = indexedDB.open('Catecon');
		request.onerror = e => alert('Error: ' + e);
		request.onsuccess = e => this.store = e.target.result;
		request.onupgradeneeded = e =>
		{
			console.log('upgrading Catecon database');
			this.store = e.target.result;
			const dgrmStore = this.store.createObjectStore('diagrams', {keyPath:'name'});
			dgrmStore.complete = e => console.log('database diagrams upgrade complete');
			const pngStore = this.store.createObjectStore('PNGs', {keyPath:'name'});
			pngStore.complete = e => console.log('database png upgrade complete');
		};
	}
	loadScript(url, fn = null)
	{
		const script = H3.script();
		script.type = 'text/javascript';
		script.async = true;
		script.src = url;
		fn && script.addEventListener('load', fn);
		document.body.appendChild(script);
	}
	initialize()
	{
		this.factoryDefaults = U.clone(this.default);
		this.local = document.location.hostname === 'localhost';
		this.diagramSVG = document.getElementById('diagramSVG');
		this.session.read();
		this.navbar =			new Navbar();
		this.uiSVG.style.left = '0px';
		this.uiSVG.style.top = '0px';
		this.parenWidth =		this.textWidth('(');
		this.commaWidth =		this.textWidth(',&nbsp;'),
		this.bracketWidth =		this.textWidth('[');
		this.screenPan =		this.getScreenPan();
		this.Panel = 			Panel;
		this.panels =		new Panels();
		this.Panels =			Panels;
		this.helpPanel =	new HelpPanel();
		this.HelpPanel =		HelpPanel;
		this.loginPanel =	new LoginPanel();
		this.LoginPanel =		LoginPanel;
		this.settingsPanel =new SettingsPanel();
		this.SettingsPanel =	SettingsPanel;
		this.threeDPanel =	new ThreeDPanel();
		this.ThreeDPanel =		ThreeDPanel;
		this.ttyPanel =		new TtyPanel();
		this.TtyPanel =			TtyPanel;
		if (this.default.debug)
		{
			this.diagramSVG.appendChild(H3.path({stroke:'red', d:"M-1000 0 L1000 0"}));
			this.diagramSVG.appendChild(H3.path({stroke:'red', d:"M0 -1000 L0 1000"}));
		}
		this.uiSVG.setAttribute('width', window.innerWidth);
		this.uiSVG.setAttribute('height', window.innerHeight);
		this.busy();
		this.catalog = new CatalogTool();
		this.catalog.show(this.session.mode === 'catalog');
		this.elementTool =
		{
			Category:	new CategoryTool('Category', this.toolbar.help, 'Create a new category'),
			Diagram:	new DiagramTool('Diagram', this.toolbar.help, 'Create a new diagram'),
			Object:		new ObjectTool('Create a new object in this diagram'),
			Morphism:	new MorphismTool('Create a new morphism in this diagram'),
			Text:		new TextTool('Create new text in this diagram'),
			Definition:	new DefinitionTool('Instantiate a definition in this diagram'),
			Cell:		new CellTool('Modify cell attributes in this diagram'),
		},
		this.readDefaults();
		this.resize();
		this.autohide();
		this.setupReplay();
		this.url = window.URL || window.webkitURL || window;
		this.loadScript('js/javascript.js', _ => R.debug(1) && console.log('javascript loaded'));
		this.loadScript('js/cpp.js');
// TODO?		this.loadScript('js/mysql.js');
		this.params = (new URL(document.location)).searchParams;	// TODO node.js
		if (this.params.has('debug'))
		{
			R.default.debug = Number.parseInt(this.params.get('debug'));
			console.log('debug mode turned on');
		}
		this.local = document.location.hostname === 'localhost';
		if (this.params.has('d'))	// check for short form
		{
			this.params.set('diagram', this.params.get('d'));
			this.session.mode = 'diagram';
		}
		else if (this.params.has('diagram'))
		{
			this.params.set('diagram', this.params.get('diagram'));
			this.session.mode = 'diagram';
		}
		else if (this.session.getCurrentDiagram())
			this.params.set('diagram', this.session.getCurrentDiagram());		// set default diagram
		this.mouse.xy = [new D2(this.width()/2, this.height()/2)];				// in session coordinates
		let delta = null;
		const sessionMove = e =>
		{
			this.toolbar.hide();
			const oldViewport = this.session.getCurrentViewport();
			const viewport = {x:e.clientX - delta.x, y:e.clientY - delta.y, scale:oldViewport.scale};
			this.session.setCurrentViewport(viewport);
			this.diagramSVG.setAttribute('transform', `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale} ${viewport.scale})`);
			return true;
		};
		this.topSVG.setAttribute('width', window.innerWidth);
		this.topSVG.setAttribute('height', window.innerHeight);
		this.topSVG.onmouseup = e => this.topSVG.removeEventListener('mousemove', sessionMove);
		this.topSVG.onmousedown = e =>
		{
			if (!R.diagram)
			{
				const click = new D2(e.clientX, e.clientY);
				delta = click.subtract(this.session.getCurrentViewport());
				this.topSVG.addEventListener('mousemove', sessionMove);
				e.preventDefault();
				return true;
			}
			return false;
		};
		this.gradients.radgrad1 = document.getElementById('radgrad1');		// these gradients use url's
		this.gradients.radgrad2 = document.getElementById('radgrad2');
		this.generateGraphColors();
	}
	saveDefaults()
	{
		U.writefile('defaults.json', JSON.stringify({R:this.default, D:this.default}));
	}
	readDefaults()	// assume run only one per loading
	{
		R.factoryDefaults = U.clone(this.default);
		const file = 'defaults.json';
		let contents = null;
		contents = U.readfile(file);
		const defaults = contents ? JSON.parse(contents) : null;
		if (defaults)
		{
			defaults.R && Object.keys(defaults.R).map(k => R.default[k] = defaults.R[k]);		// merge the R defaults
			defaults.D && Object.keys(defaults.D).map(k => this.default[k] = defaults.D[k]);		// merge the D defaults
			this.setDarkmode(this.default.darkmode);
		}
	}
	updateDisplay(e)
	{
		const args = e.detail;
		if (!args.diagram || args.diagram !== R.diagram)
			return;
		switch(args.command)
		{
			case 'delete':
				args.diagram.selected = args.diagram.selected.filter((r, elt) => elt.name !== args.element.name);
				if (args.element instanceof IndexObject)
					args.diagram.glowBadObjects();
				break;
			case 'new':
			case 'move':
				if (args.element instanceof IndexObject)
					args.diagram.glowBadObjects();
				break;
		}
	}
	resize()
	{
		const diagram = R.diagram;
		const scale = diagram !== null ? this.session.getPlacement(diagram.name).scale : 1.0;
		const width = scale > 1.0 ? Math.max(window.innerWidth, window.innerWidth / scale) : window.innerWidth / scale;
		const height = scale > 1.0 ? Math.max(window.innerHeight, window.innerHeight / scale) : window.innerHeight / scale;
		this.updateBorder();
		if (this.topSVG)
		{
			this.topSVG.setAttribute('width', width);
			this.topSVG.setAttribute('height', height);
			this.uiSVG.setAttribute('width', width);
			this.uiSVG.setAttribute('height', height);
		}
		this.panels.resize();
		this.screenPan = this.getScreenPan();
	}
	cancelAutohide()
	{
		if (this.autohideTimer)
			clearInterval(this.autohideTimer);
	}
	showBorderAlerts()
	{
		this.topSVG.querySelectorAll('.borderAlert').forEach(elt => elt.classList.remove('hidden'));
	}
	hideBorderAlerts()
	{
		this.topSVG.querySelectorAll('.borderAlert').forEach(elt => elt.classList.add('hidden'));
	}
	autohide()
	{
		window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'show'}}));
		this.cancelAutohide();
		this.setCursor();
		this.autohideTimer = setTimeout(_ =>
		{
			if (this.mouse.onGUI)
				return;
			if (R.debug(1))
				return;
			this.topSVG.style.cursor = 'none';
			this.hideBorderAlerts();
			if (!window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'hide'}})))	// cancelled!
				window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'show'}}));
		}, this.default.autohideTimer);
	}
	cancelAutosave()
	{
		if (this.autosaveTimer)
			clearInterval(this.autosaveTimer);
	}
	autosave(diagram)
	{
		if (!diagram.sync || diagram.user === diagram.basename)
			return;
		this.cancelAutosave();
		diagram.updateTimestamp();
		const timestamp = diagram.timestamp;
		this.autosaveTimer = setTimeout(_ =>
		{
			if (timestamp === diagram.timestamp)	// timestamp has not changed in the interim
			{
				diagram.setViewport();
				R.saveDiagram(diagram, e => R.debug(1) && console.log('autosave', diagram.name));
				if (this.local && !this.textEditActive())
					diagram.upload();
			}
		}, this.default.autosaveTimer);
	}
	getAreaSelectCoords(e)
	{
		const xy = {x:e.clientX, y:e.clientY};
		const x = Math.min(xy.x, this.mouse.down.x);
		const y = Math.min(xy.y, this.mouse.down.y);
		const width = Math.abs(xy.x - this.mouse.down.x);
		const height = Math.abs(xy.y - this.mouse.down.y);
		return {x, y, width, height};
	}
	drawSelectRect(e)
	{
		const areaSelect = this.getAreaSelectCoords(e);
		const svg = document.getElementById('selectRect');
		if (svg)
		{
			svg.setAttribute('x', areaSelect.x);
			svg.setAttribute('y', areaSelect.y);
			svg.setAttribute('width', areaSelect.width);
			svg.setAttribute('height', areaSelect.height);
		}
		else
			this.topSVG.appendChild(H3.rect({id:'selectRect', x:areaSelect.x, y:areaSelect.y, width:areaSelect.width, height:areaSelect.height}));
	}
	deleteSelectRectangle()
	{
		const svg = document.getElementById('selectRect');
		svg && svg.remove();
	}
	recordMouseDown(e)
	{
		this.mouseIsDown = true;
		this.mouse.down = new D2(e.clientX, e.clientY - this.topSVG.parentElement.offsetTop);	// client coords
	}
	mousedown(e)
	{
		this.mouse.saveClientPosition(e);
		if (e.target.id === 'foreign-text')
			return true;
		if (e.button === 0)
		{
			this.recordMouseDown(e);
			const diagram = R.diagram;
			if (diagram)
			{
				if (!this.mouseover)
					diagram.deselectAll();
				this.dragStart = this.mouse.sessionPosition();
				if (this.getTool() === 'pan' || !this.drag)
					this.drag = true;
			}
		}
		else if (e.button === 1)
			this.startMousePan(e);
	}
	mousemove(e)
	{
		this.mouse.saveClientPosition(e);
		if (e.movementX === 0 && e.movementY === 0)		// some mouse move events doon't move
			return;
		try
		{
			const diagram = R.diagram;
			if (!diagram || this.session.mode !== 'diagram')
				return;
			this.drag = this.mouseIsDown && diagram.selected.length > 0;
			const xy = diagram.mouseDiagramPosition(e);
			xy.width = 2;
			xy.height = 2;
			if (this.default.fullscreen)
			{
				if (this.drag && diagram.isEditable())
				{
					if (diagram.selected.length > 0)
					{
						const from = diagram.getSelected();
						const oldMouseover = this.mouseover;
						if (from === this.mouseover)
							this.mouseover = null;
						const isMorphism = from instanceof Morphism;
						if (diagram.selected.length === 1)		// check for fusing
						{
							if (this.getTool() === 'select')
							{
								let fusible = false;
								diagram.updateDragObjects(e.shiftKey);
								fusible = diagram.updateFusible(e);
								let msg = '';
								if (this.mouseover && diagram.selected.length === 1)
								{
									if (diagram.isIsolated(from) && diagram.isIsolated(this.mouseover) &&
											((this.mouseover instanceof Morphism && from instanceof Morphism) ||
											(this.mouseover instanceof CatObject && from instanceof CatObject))) // check for creating products, coproducts, homs
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
									this.statusbar.show(e, msg);
									from.updateGlow(true, 'glow');
								}
								else if (this.mouseover && this.mouseOver !== from && this.mouseover.constructor.name === from.constructor.name)
									from.updateGlow(true, from.isFusible(this.mouseover) ? 'glow' : 'badGlow');
								else if (!fusible)	// no glow
									from.updateGlow(false, '');
							}
						}
						else if (this.mouse.delta().nonZero() && this.getTool() === 'select')
							diagram.updateDragObjects(e.shiftKey);
						this.deleteSelectRectangle();
						this.mouseover = oldMouseover;
					}
					else
						diagram.updateFusible(e);
				}
				else if (this.getTool() === 'pan')
				{
					this.panHandler(e);
					this.deleteSelectRectangle();
				}
				else if (this.mouseIsDown && !this.drag && (e.movementX !== 0 || e.movementY !== 0))
					this.drawSelectRect(e);
			}
			else
				this.deleteSelectRectangle();
		}
		catch(x)
		{
			R.recordError(x);
		}
	}
	mouseup(e)
	{
		if (e.button === 0)
		{
			this.deleteSelectRectangle();
			if (!R.diagram)
				return;		// not initialized yet
			this.mouseIsDown = false;
			if (e.which === 2)
			{
				this.setTool('select');
				this.drag = false;
				return;
			}
			try
			{
				const diagram = R.diagram;
				const cat = diagram.codomain;
				const pnt = diagram.mouseDiagramPosition(e);
				if (this.drag)
				{
					if (diagram.selected.length === 1 && this.mouseover)	// check for fusing
					{
						const from = diagram.getSelected();
						const target = from.name === this.mouseover.name ? null : this.mouseover;	// do not target yourself
						if (target)
						{
							if (diagram.isIsolated(from) && diagram.isIsolated(target))
							{
								const ary = [target, from];
								let a = null;
								if (e.shiftKey)
									a = R.actionDiagram.getElement('coproduct');
								else
									a = R.actionDiagram.getElement('product');
								if (e.altKey)
									a = R.actionDiagram.getElement('hom');
								if (a.hasForm(diagram, ary))
								{
									diagram.drop(e, a, from, target);
									diagram.deselectAll();
								}
							}
							else if (from instanceof IndexObject && target instanceof IndexObject)
							{
								if(from.isFusible(target))
								{
									const domains = [];
									from.domains.forEach(m => domains.push(m.name));
									const codomains = [];
									from.codomains.forEach(m => m.domain !== m.codomain && codomains.push(m.name));
									diagram.fuseObjects(e, from, target);
									diagram.log({command:'fuse', from:from.name, target:target.name});
									diagram.antilog({command:'fuse', to:from.to, xy:{x:from.orig.x, y:from.orig.y}, domains, codomains, target});
									target.checkCells();
								}
							}
							else if (from instanceof IndexMorphism && target instanceof IndexMorphism && from.isFusible(target))
							{
								diagram.fuseMorphisms(e, from, target);
								target.checkCells();
							}
						}
						if (!(from instanceof IndexText))
							from.updateGlow(false, '');
					}
					const elts = new Map();
					const orig = new Map();
					const movables = new Set();
					const undoing = obj =>
					{
						if (obj.hasMoved())
						{
							movables.add(obj);
							elts.set(obj.name, obj.getXY());
							!orig.has(obj) && orig.set(obj, obj.orig);
						}
					};
					diagram.selected.map(e =>
					{
						if (e instanceof IndexMorphism)
						{
							undoing(e.domain);
							undoing(e.codomain);
						}
						else if (e instanceof IndexElement)
						{
							if (e.domain instanceof Morphism)
							{
								undoing(e.domain.domain);
								undoing(e.domain.codomain);
							}
							else
								undoing(e.domain);
							undoing(e.codomain);
						}
						else if (e instanceof Cell)
							e.getObjects().map(o => o.hasMoved() && movables.add(o));
						else if (!(e instanceof Cell || e instanceof IndexElement))
							undoing(e);
						e.finishMove();
					});
					const originals = [...orig];
					if (movables.size > 0)
					{
						diagram.log({command: 'move', movables:[...movables]});
						diagram.antilog({command: 'move', movables:originals});
						movables.forEach(elt => this.emitElementEvent(diagram, 'move', elt));
					}
				}
				else if (!this.mouseover)
					diagram.areaSelect(e);
			}
			catch(x)
			{
				R.recordError(x);
			}
			this.drag = false;
		}
		else if (e.button === 1)
			this.stopMousePan();
	}
	drop(e)	// from panel dragging
	{
		const diagram = R.diagram;
		if (!diagram.isEditable())
		{
			this.statusbar.show(e, 'Diagram is not editable');
			return;
		}
		try
		{
			e.preventDefault();
			this.drag = false;
			const xy = diagram.mouseDiagramPosition(e);
			const name = e.dataTransfer.getData('text');
			if (name.length === 0)
				return;
			let elt = diagram.getElement(name);
			if (elt)
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
			R.recordError(err);
		}
	}
	getIcon(name, buttonName, clickme, options = {})	// options = {title, scale, id, repeatCount, help}
	{
		const inches = 0.32 * ('scale' in options ? options.scale : this.default.button.small);
		const args = {'data-name':`button-${name}`};
		if ('title' in options)
			args.title = options.title;
		if ('id' in options)
			args.id = options.id;
		args.repeatCount = 'repeatCount' in options ? options.repeatCount : "1";
		let onclick = null;
		if ('help' in options)
			onclick = e => e.ctrlKey ? Runtime.SelectDiagram(options.help) : clickme(e);
		else
			onclick = clickme;
		return H3.span('.icon', H3.svg(		{viewbox:"0 0 320 320", width:`${inches}in`, height:`${inches}in`},
											H3.animateTransform({attributeName:"transform", type:"rotate", from:"360 0 0", to:"0 0 0", dur:"0.5s", repeatCount:args.repeatCount, begin:"indefinite"}),
											H3.rect('.icon-background', {x:"0", y:"0", width:this.default.icon, height:this.default.icon}),
											H3.use({href:`#icon-${buttonName}`}),
											H3.rect('.btn', {x:"0", y:"0", width:this.default.icon, height:this.default.icon, onclick})), args);
	}
	getIconCounter(name, buttonName, cnt, clickme, options = {})	// options = {title, scale, id, repeatCount, help}
	{
		const inches = 0.32 * ('scale' in options ? options.scale : this.default.button.small);
		const args = {'data-name':`button-${name}`, top:'0px'};
		if ('title' in options)
			args.title = options.title;
		if ('id' in options)
			args.id = options.id;
		args.repeatCount = 'repeatCount' in options ? options.repeatCount : "1";
		let onclick = null;
		if ('help' in options)
			onclick = e => e.ctrlKey ? Runtime.SelectDiagram(options.help) : clickme(e);
		else
			onclick = clickme;
		return H3.span('.icon', H3.svg(		{viewbox:"0 0 32 64", width:`${inches}in`, height:`${2 * inches}in`},
											H3.rect('.icon-background', {x:"0", y:"0", width:this.default.icon, height:this.default.icon}),
											H3.use({href:`#icon-${buttonName}`, y:'-8'}),
											H3.rect('.btn', {x:"0", y:"0", width:this.default.icon, height:this.default.icon, onclick}),
											H3.text('.glow', {'text-anchor':"middle", x:"8", y:"26", style:"font-size:12px;stroke:var(--color-element-bg"}, cnt.toString())), args);
	}
	setActiveIcon(elt, radio = true)
	{
		if (!elt)
			return;
		const icon = elt instanceof HTMLSpanElement ? elt : this.findAncestor('SPAN', elt);
		if (icon.parentNode)
		{
			let btn = icon.parentNode.firstChild;
			if (radio)
				while(btn)
				{
					btn.classList.contains('icon') && this.setUnactiveIcon(btn);
					btn = btn.nextSibling;
				}
		}
		icon.querySelector('.btn').classList.add('icon-active');
	}
	setUnactiveIcon(elt)
	{
		const icon = this.findAncestor('SPAN', elt);
		icon.querySelector('.btn').classList.remove('icon-active');
	}
	setCursor()
	{
		switch(this.getTool())
		{
		case 'select':
			this.topSVG.style.cursor = 'default';
			break;
		case 'pan':
			this.topSVG.style.cursor = 'all-scroll';
			break;
		}
	}
	elementId()
	{
		return `elt_${this.id++}`;
	}
	zoom(e, scalar)
	{
		scalar = 2 * scalar;
		const diagram = 'name' in e.target.dataset ? R.$CAT.getElement(e.target.dataset.name) : null;
		const zoomDgrm = diagram && !this.default.fullscreen &&
						(e.target.dataset.type === 'diagram' || e.target.dataset.type === 'object' || e.target.dataset.type === 'morphism' || e.target.dataset.type === 'cell' || e.target.constructor.name === 'SVGTextElement');
		const viewport = zoomDgrm ? D.session.getPlacement(diagram.name) : this.session.getCurrentViewport();
		const vpScale = viewport.scale;
		let inc = Math.log(vpScale)/Math.log(this.default.scale.base) + scalar;
		let scale = this.default.scale.base ** inc;
		let userPnt = null;
		if ('clientX' in e)
			userPnt = {x:e.clientX, y:e.clientY};
		else
			userPnt = {x:this.width()/2, y:this.height()/2};
		const pnt = this.default.fullscreen ? this.mouse.sessionPosition() : this.userToSessionCoords(userPnt);
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
			this.diagramSVG.classList.remove('trans');
			this.setSessionViewport({x, y, scale});
			this.diagramSVG.classList.add('trans');
			this.emitViewEvent(this.session.mode, R.diagram);
		}
	}
	getKeyName(e)
	{
		let name = e.ctrlKey && e.key !== 'Control' ? 'Control' : '';
		name += e.shiftKey && e.key !== 'Shift' ? 'Shift' : '';
		name += e.altKey && e.key !== 'Alt' ? 'Alt' : '';
		name += e.code;
		return name;
	}
	doAction(diagram, action)
	{
		if (action && action in R.Actions)
		{
			const act = R.Actions[action];
			if (act.hasForm(diagram, diagram.selected))
			{
				const e = new MouseEvent("click", {view: window, bubbles: false, cancelable: true});
				if (!act.actionOnly)
				{
					act.html(e, diagram, diagram.selected);
					const btn = this.params.get('btn');
					if (btn)
					{
						const elt = this.toolbar.element.querySelector(`span[data-name="button-${btn}"].icon rect.btn`);
						if (elt && elt.onclick)
							elt.onclick(e);
					}
				}
				else
					act.action(e, diagram, diagram.selected);
			}
		}
	}
	enterMultiDiagramMode()
	{
		[...this.session.diagrams.keys()].map(d =>
		{
			console.log('session makesvg', d);
			const diagram = R.$CAT.getElement(d);
			if (diagram)
			{
				diagram.makeSVG(d =>
				{
					const placement = this.session.getPlacement(d.name);
					d.setPlacement(placement, false);		// do not emit view event
					d.updateBackground();
					d.show();
				});
			}
			else
				console.log('enterMultiDiagramMode: cannot get diagram', d);
		});
		R.diagram && this.diagramSVG.appendChild(R.diagram.svgRoot);
		this.setSessionViewport(D.session.viewport);
	}
	doParamsSelect(e, diagram)
	{
		if (this.params.has('select'))
		{
			const select = diagram.domain.getElements(this.params.get('select').split(','));
			const action = this.params.get('action');
			if (select.length > 0 || action)
			{
				const doit = _ =>
				{
					if (diagram.ready === 0 && R.isReady())
					{
						select && diagram.makeSelected(...select);
						const action = this.params.get('action');
						if (action && action in R.Actions)
						{
							const act = R.Actions[action];
							if (act.hasForm(diagram, diagram.selected))
							{
								if (!act.actionOnly)
								{
									act.html(e, diagram, diagram.selected);
									const btn = this.params.get('btn');
									if (btn)
									{
										const elt = this.toolbar.element.querySelector(`span[data-name="button-${btn}"].icon rect.btn`);
										if (elt && elt.onclick)
											elt.onclick(new MouseEvent("click", {view: window, bubbles: false, cancelable: true}));
									}
								}
								else
									act.action(e, diagram, diagram.selected);
							}
						}
					}
					else
						setTimeout(doit, 10);	// try again
				};
				doit();
			}
		}
	}
	addEventListeners()
	{
		window.addEventListener('resize', e =>
		{
			this.resize();
			R.diagram && R.diagram.updateBackground();
		});
		window.addEventListener('IndexElement', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			const element = args.element;
			if (element instanceof IndexElement)
			{
				switch(args.command)
				{
					case 'new':
						diagram.addSVG(element);
						this.autosave(diagram);
						break;
					case 'delete':
						this.autosave(diagram);
						break;
					case 'update':
						element.update();
						if ('bezier' in args && args.bezier)
						{
							element.domains.forEach(elt => elt.update());
							element.codomains.forEach(elt => elt.update());
						}
						this.autosave(diagram);
						break;
				}
			}
		});
		window.addEventListener('Morphism', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			const element = args.element;
			if (element instanceof IndexMorphism)
			{
				switch(args.command)
				{
					case 'detach':
						element.attributes.set('bezier', 0);
						break;
					case 'update':
						element.update();
						diagram.domain.updateCells(element);
						if ('bezier' in args && args.bezier)
						{
							element.domains.forEach(elt => elt.update());
							element.codomains.forEach(elt => elt.update());
						}
						break;
					case 'new':
						diagram.domain.loadCells();
						diagram.domain.checkCells();
						break;
				}
				if (element.domain.cells.size > 0 || element.codomain.cells.size > 0)
				{
					diagram.domain.loadCells();
					diagram.domain.checkCells();
				}
				diagram.updateBackground();
			}
			else if (args.command === 'new' && 'loadEquality' in element)
				element.loadEquality();
			switch(args.command)
			{
				case 'delete':
				case 'detach':
				case 'new':
				case 'update':
					this.autosave(element instanceof Diagram ? element : diagram);
					if (U.isIndexItem(element) && diagram.domain.morphismToCells.has(element))
						diagram.domain.morphismToCells.get(element).map(cell => cell.update());
					break;
			}
		});
		window.addEventListener('Object', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (!diagram)
				return;
			const element = args.element;
			if (element instanceof IndexObject)
				diagram.updateBackground();
			let autosav = true;
			switch(args.command)
			{
				case 'fuse':
					const objects = new Set();		// objects to which the target has homsets
					element.domains.forEach(m => objects.add(m.codomain));
					element.codomains.forEach(m => objects.add(m.domain));
					objects.forEach(obj => diagram.domain.uniquifyHomsetIndices(element, obj));
					diagram.domain.loadCells();
					diagram.domain.checkCells();
					break;
				case 'move':
					element.finishMove();
					if (element instanceof IndexObject)
						element.update();
					break;
				case 'delete':
					break;
				case 'update':
				case 'new':
					element instanceof IndexObject && element.update();
					break;
				default:
					autosav = false;
					break;
			}
			this.updateDisplay(e);
			autosav && this.autosave(args.diagram);
		});
		window.addEventListener('Text', e =>
		{
			const args = e.detail;
			args.diagram.updateBackground();
			switch(args.command)
			{
				case 'delete':
				case 'move':
				case 'new':
				case 'update':
					this.autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('Diagram', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (diagram)
				switch(args.command)
				{
					case 'addReference':
					case 'removeReference':
						R.loadDiagramEquivalences(diagram);
						diagram.checkCells();
						diagram.domain.checkCells();
						this.autosave(diagram);
						break;
					case 'deselect':
						args.arg.showSelected(false);
						break;
					case 'select':
						{
							const cats = new Set();
							R.diagram && R.diagram.selected.map(elt => (elt instanceof IndexObject || elt instanceof IndexMorphism) && cats.add(elt.to.category));
							if (cats.size === 1)
								R.setCategory([...cats][0]);
							else if (cats.size > 1)
								R.setCategory(null);		// TODO max cat?
						}
						args.arg && args.arg.showSelected();
						break;
					case 'update':
						this.autosave(diagram);
						break;
				}
			this.autohide(e);
		});
		window.addEventListener('CAT', e =>
		{
			const args = e.detail;
			const diagram = args.diagram;
			const name = diagram.name;
			const action = 'action' in args ? args.action : null;
			switch(args.command)
			{
				case 'load':
					diagram.checkCells();
					break;
				case 'default':		// make it the viewable diagram
					if (diagram)
					{
						this.session.setCurrentDiagram(diagram);
						R.loadDiagramEquivalences(diagram);
						diagram.domain.checkCells();
						diagram.makeSVG();
						const doit = _ =>
						{
							if (diagram.ready === 0 && R.isReady())
							{
								diagram.updateBackground();
								diagram.svgRoot.querySelector('.diagramBackground').classList.add('defaultGlow');
								diagram.glowBadObjects();
							}
							else
								setTimeout(doit, 10);	// try again
						};
						doit();
						this.diagramSVG.appendChild(diagram.svgRoot);
						this.diagramSVG.classList.remove('trans');
						if (!diagram.svgTranslate.attributes.transform)
						{
							const placement = this.session.getPlacement(diagram.name);
							diagram.setPlacement(placement, false, 'default');		// do not emit view event
						}
						this.diagramSVG.classList.add('trans');
						R.setCategory(diagram.codomain);
					}
					else
						this.session.setNoCurrentDiagram();
					this.emitViewEvent('diagram', diagram, action);
					break;
				case 'close':
				case 'delete':
					if (R.diagram === diagram)
					{
						R.diagram = null;
						this.session.setNoCurrentDiagram();
					}
					this.statusbar.show(e, `${U.Cap(args.command)} diagram: ${name}`);
					this.session.remove(name);
					this.session.save();
					if (args.command === 'delete')
					{
						R.catalog.delete(name);
						this.diagramPNGs.delete(name);
					}
					break;
				case 'new':
					this.autosave(diagram);
					R.setDiagramInfo(diagram, true);
					break;
			}
		});
		window.onresize = _ => this.resize();
		window.addEventListener('mousemove', e => this.autohide(e));
		window.addEventListener('mousedown', e => this.autohide(e));
		window.addEventListener('keydown', e => this.autohide(e));
		window.addEventListener('Morphism', e => this.updateMorphismDisplay(e));
		window.addEventListener('Text', e => this.updateTextDisplay(e));
		window.addEventListener('mousemove', e => this.mousemove(e));
		this.topSVG.addEventListener('mousedown', e => this.mousedown(e));
		this.topSVG.addEventListener('mouseup', e => this.mouseup(e));
		this.topSVG.addEventListener('drop', e => this.drop(e), true);
		this.topSVG.addEventListener('mousemove', e => this.statusbar.element.style.display === 'block' && D2.dist(this.statusbar.xy, {x:e.clientX, y:e.clientY}) > this.default.statusbar.hideDistance && this.statusbar.hide());
		this.topSVG.ondragover = e => e.preventDefault();
		this.topSVG.addEventListener('drop', e => e.preventDefault(), true);
		window.addEventListener('keydown', e =>
		{
			const name = this.getKeyName(e);
			if (this.session.mode === 'diagram' && e.target === document.body || name === 'Escape')
				name in this.keyboardDown && this.keyboardDown[name](e);
		});
		window.onkeyup = e =>
		{
			if (this.session.mode === 'diagram')
			{
				this.setCursor();
				const name = this.getKeyName(e);
				name in this.keyboardUp && this.keyboardUp[name](e);
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
			if (this.session.mode === 'diagram' && R.diagram)
			{
				node = e.target;
				let isDiagram = false;
				while(node)
				{
					if (node === this.topSVG)
					{
						isDiagram = true;
						break;
					}
					node = node.parentNode;
				}
				if (isDiagram)
				{
					const dirX = Math.max(-1, Math.min(1, e.wheelDeltaX));
					const dirY = Math.max(-1, Math.min(1, e.wheelDeltaY));
					if (e.shiftKey)
					{
						this.toolbar.hide();
						this.zoom(e, dirY);
					}
					else
					{
						let compass = '';
						if (dirY !== 0)
							compass = dirY < 0 ? 'down' : 'up';
						else
							compass = dirX < 0 ? 'right' : 'left';
						this.panHandler(e, compass);
					}
				}
			}
			else if (this.session.mode === 'catalog' && e.shiftKey)
			{
				this.catalog.onwheel(e);
				e.stopPropagation();
			}
		};
		window.addEventListener('View', e =>
		{
			const args = e.detail;
			const command = args.command;
			const diagram = args.diagram;
			const action = 'action' in args ? args.action : null;
			if (command === 'diagram')
			{
				document.body.style.overflow = 'hidden';
				document.getElementById('diagramView').classList.remove('hidden');
				if (diagram)
				{
					if (diagram.user === 'sys' || diagram.user === 'ctx')		// TODO better autoplace detection
						diagram.autoplace();
					this.diagramSVG.classList.remove('hidden');
					diagram.show();
					this.diagramSVG.appendChild(diagram.svgRoot);		// make top-most viewable diagram
					if (action === 'home')
						diagram.home();
					else if (action === 'defaultView')
					{
						const vp = new D2(diagram.viewport);
						if (vp.x === 0 && vp.y === 0 && vp.height === 0 && vp.width === 0)
							diagram.homeTop();
						else
						{
							const placement = this.session.getPlacement(diagram.name);
							const placePosition = new D2(placement);
							const nuvp = vp.sub(placePosition);
							this.setSessionViewport({x:nuvp.x, y:nuvp.y, scale:placement.scale * diagram.viewport.scale});
						}
					}
					else if (this.default.fullscreen)
						this.setSessionViewport(this.session.getViewport(diagram.name));
					this.session.save();
					diagram.updateBackground();
					this.updateBorder();
				}
			}
			else if (command === 'catalog')
			{
				args.action !== 'startup' && this.session.save();
				document.getElementById('diagramView').classList.add('hidden');
			}
		});
		window.addEventListener('Login', e => R.diagram && D.doParamsSelect(e, R.diagram));
		window.addEventListener('Application', e =>
		{
			const args = e.detail;
			switch (args.command)
			{
				case 'start':
					this.session.loadDiagrams(_ =>
					{
						const name = this.params.get('diagram');
						if (this.session.mode === 'diagram')
						{
							if (name && (!R.diagram || R.diagram.name !== name))
							{
								Runtime.SelectDiagram(name, null, diagram =>
								{
									if (!diagram)
									{
										this.statusbar.show(null, `cannot load diagram ${name}`);
										this.emitViewEvent('catalog');
									}
									this.params.has('select') && this.doParamsSelect(e, diagram);
								});
							}
							if (!D.default.fullscreen)
								D.enterMultiDiagramMode();
						}
						else if (this.session.mode === 'catalog')
							this.emitViewEvent('catalog');
						this.notBusy();
					});
					break;
			}
		});
		window.addEventListener('Category', e =>
		{
			const args = e.detail;
			const category = args.category;
			switch (args.command)
			{
				case 'new':
					R.categories.set(category.name, category);
					break;
			}
		});
		window.addEventListener('Cell', e =>
		{
			const args = e.detail;
			const cell = args.cell;
			const diagram = args.diagram;
			switch (args.command)
			{
				case 'equals':
				case 'notEquals':
					cell.update();
					cell.loadEquality();
					break;
				case 'hide':
				case 'show':
					cell.update();
					D.autosave(diagram);
					break;
				case 'check':
					if (cell)
						cell.check();
					else
						diagram.checkCells();
					break;
				case 'removeAssertion':
					cell.update();
					diagram.domain.checkCells();
					this.autosave(diagram);
					break;
				case 'new':
					cell.update();
					cell.loadEquality();
					break;
				case 'unknown':
					cell.update();
					break;
				case 'update':
					cell.update();
					this.autosave(diagram);
					break;
				case 'commutivity':
					break;
				default:
					throw 'Cell event listener unknown command ' + args.command;
			}
		});
	}
	textWidth(txt, cls = 'object')
	{
		const safeTxt = U.HtmlEntitySafe(txt);
		if (this.textSize.has(safeTxt))
			return this.textSize.get(safeTxt);
		const text = H3.text({class:cls, x:"100", y:"100", 'text-anchor':'middle'}, safeTxt);
		this.uiSVG.appendChild(text);
		const width = text.getBBox().width;
		this.uiSVG.removeChild(text);
		this.textSize.set(safeTxt, width);
		return width;
	}
	grid(x, majorGrid = false)
	{
		const grid = majorGrid ? this.gridSize() : this.default.layoutGrid;
		switch (typeof x)
		{
		case 'number':
			return this.gridding ? grid * Math.round(x / grid) : x;
		case 'object':
			return new D2(this.grid(x.x, majorGrid), this.grid(x.y, majorGrid));
		}
	}
	limit(s)
	{
		return s.length > this.textDisplayLimit ? s.slice(0, this.textDisplayLimit) + '...' : s;
	}
	updateMorphismDisplay(e)		// event handler
	{
		const {command, diagram, dual, element, old} = e.detail;
		if (Cat.R.diagram !== diagram)
			return;
		this.updateDisplay(e);
		const {domain, codomain} = element;
		switch(command)
		{
			case 'new':
				if (element instanceof IndexMorphism)
					element.update();
				break;
		}
	}
	updateTextDisplay(e)		// event handler
	{
		this.updateDisplay(e);
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
	copyStyles(dest, src, wndow = null)
	{
		for (var cd = 0; cd < dest.childNodes.length; cd++)
		{
			var dstChild = dest.childNodes[cd];
			const srcChild = src.childNodes[cd];
			if ('data' in srcChild)
				continue;
			if (srcChild.constructor.name === 'SVGRectElement')		// currently rectangles are only used for decorations
			{
				dstChild.remove();
				continue;
			}
			if (dstChild.tagName === 'use')
			{
				const src = document.querySelector(dstChild.href.animVal);
				if (src)
				{
					const used = src.cloneNode(true);
					this.copyStyles(used, src, wndow);
					dstChild.appendChild(used);
				}
				continue;
			}
			let hidden = false;
			if ('name' in srcChild.dataset)
			{
				const elt = R.diagram.getElement(srcChild.dataset.name);
				if (elt)
				{
					const bbox = R.diagram.diagramToUserCoords(elt.getBBox());
					if (wndow && !D2.overlap(wndow, bbox))
						hidden = true;
				}
			}
			const hasEmphasis = srcChild.classList.contains('emphasis');
			hasEmphasis && srcChild.classList.remove('emphasis');
			const hasSelected = srcChild.classList.contains('selected');
			hasSelected && srcChild.classList.remove('selected');
			var srcStyle = window.getComputedStyle(srcChild);
			if (srcStyle === "undefined" || srcStyle === null)
				continue;
			let style = '';
			if (hidden)
				style = 'opacity:0;';
			else if (dstChild.tagName in this.svgStyles)
			{
				const styles = this.svgStyles[dstChild.tagName];
				for (let i = 0; i<styles.length; i++)
					style += `${styles[i]}:${srcStyle.getPropertyValue(styles[i])};`;
			}
			dstChild.setAttribute('style', style);
			if (this.svgContainers.includes(dstChild.tagName))
				this.copyStyles(dstChild, src.childNodes[cd], wndow);
			hasEmphasis && srcChild.classList.add('emphasis');
			hasSelected && srcChild.classList.add('selected');
		}
	}
	svg2canvas(diagram, fn)
	{
		if (!diagram.svgRoot)
			return;
		const svg = diagram.svgBase;
		const oldMode = this.default.darkmode;
		oldMode && this.setDarkmode(false);
		const copy = svg.cloneNode(true);
		const radgrad1 = this.gradients.radgrad1.cloneNode(true);
		this.copyStyles(radgrad1, this.gradients.radgrad1);
		const radgrad2 = this.gradients.radgrad2.cloneNode(true);
		this.copyStyles(radgrad2, this.gradients.radgrad2);
		const top = H3.svg();
		const markers = ['arrowhead', 'arrowheadRev'];
		markers.map(mrk => top.appendChild(document.getElementById(mrk).cloneNode(true)));
		top.appendChild(radgrad1);
		top.appendChild(radgrad2);
		top.appendChild(copy);
		const ssWidth = this.snapshotWidth;
		const ssHeight = this.snapshotHeight;
		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight;
		const wRat = winWidth / ssWidth;
		const hRat = winHeight / ssHeight;
		const rat = hRat < wRat ? wRat : hRat;
		const p = this.session.getPlacement(diagram.name);
		const vp = this.session.getViewport(diagram.name);
		const x = (p.x * vp.scale + vp.x) / rat;
		const y = (p.y * vp.scale + vp.y) / rat;
		const s = vp.scale * p.scale / rat;
		copy.setAttribute('transform', `translate(${x} ${y}) scale(${s} ${s})`);
		const ssRat = ssHeight / ssWidth;
		const winRat = winHeight / winWidth;
		const width = winWidth * (ssRat < winRat ? winRat / ssRat : 1);
		const height = winHeight * (ssRat > winRat ? ssRat / winRat : 1);
		this.copyStyles(copy, svg, new D2({x:0, y:0, width, height}));
		oldMode && this.setDarkmode(true);
		const topData = (new XMLSerializer()).serializeToString(top);
		const svgBlob = new Blob([topData], {type: "image/svg+xml;charset=utf-8"});
		const url = this.url.createObjectURL(svgBlob);
		const img = new Image(ssWidth, ssHeight);
		img.onload = _ =>
		{
			const canvas = document.createElement('canvas');
			canvas.width = ssWidth;
			canvas.height = ssHeight;
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, ssWidth, ssHeight);
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, ssWidth, ssHeight);
			ctx.drawImage(img, 0, 0);
			this.url.revokeObjectURL(url);
			if (fn)
			{
				const cargo = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
				fn(cargo, `${diagram.name}.png`);
			}
		};
		img.crossOrigin = "";
		img.src = url;
	}
	onEnter(e, fn, that = null)
	{
		if (e.key === 'Enter')
		{
			that ? fn.call(that, e) : fn(e);
			return true;
		}
	}
	width()
	{
		return window.innerWidth;
	}
	height()
	{
		return window.innerHeight;
	}
	getObjects(ary)
	{
		const elts = new Set();
		for(let i=0; i < ary.length; ++i)
		{
			const elt = ary[i];
			if ((elt instanceof IndexObject || elt instanceof IndexText) && !(elt.name in elts))
				elts.add(elt);
			else if (elt instanceof IndexMorphism)
			{
				if (elt.bezier)
					elts.add(elt.bezier.cp1, elt.bezier.cp2);
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
	barycenter(ary)
	{
		const elts = this.getObjects(ary);
		const xy = new D2();
		elts.forEach(pnt => xy.increment(pnt));
		return xy.scale(1.0/elts.size);
	}
	baryHull(ary)		// unused
	{
		return this.barycenter(D2.hull([...this.getObjects(ary)]));
	}
	center(diagram)
	{
		return this.grid(diagram.userToDiagramCoords({x:this.grid(this.width()/2), y:this.grid(this.height()/2)}));
	}
	dragElement(e, name)
	{
		this.toolbar.hide();
		e.dataTransfer.setData('text/plain', name);
	}
	download(href, filename)
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
	downloadString(string, type, filename)
	{
		const blob = new Blob([string], {type:`application/${type}`});
		this.download(this.url.createObjectURL(blob), filename);
	}
	paste(e)
	{
		if (!this.copyDiagram)
			return;
		const diagram = R.diagram;
		const mouse = this.mouse.diagramPosition(diagram);
		const refs = diagram.getAllReferenceDiagrams();
		if (!refs.has(this.copyDiagram.name) && diagram !== this.copyDiagram)
		{
			this.statusbar.show(e, `Diagram ${this.copyDiagram.properName} is not referenced by this diagram`);
			return;
		}
		const copies = this.doPaste(e, mouse, this.pasteBuffer);
		diagram.deselectAll();
		copies.map(e => diagram.addSelected(e));
		diagram.log({command:'paste', elements:this.pasteBuffer.map(e => e.name), xy:{x:mouse.x, y:mouse.y}});
		diagram.antilog({command:'delete', elements:copies.map(e => e.name)});
	}
	doPaste(e, xy, ary, save = true)
	{
		const diagram = R.diagram;
		const elements = ary.filter(elt => U.isIndexItem(elt));
		ary.filter(elt => elt instanceof Cell).map(cell => elements.push(...cell.left, ...cell.right));
		const base = this.barycenter(elements);
		const pasteMap = new Map();
		const txy = xy;
		const copies = [];
		const pasteObject = o =>
		{
			if (!pasteMap.has(o))
			{
				const oxy = this.grid(D2.add(txy, D2.subtract(o.getXY(), base)));
				const copy = diagram.placeObject(o.to, oxy, false);
				pasteMap.set(o, copy);
				copies.push(copy);
			}
			return pasteMap.get(o);
		};
		const pasteMorphism = m =>
		{
			const domain = pasteObject(m.domain);
			const codomain = pasteObject(m.codomain);
			const to = m.to;
			copies.push(new IndexMorphism(diagram, {domain, codomain, to, attributes:m.attributes}));
		};
		const pasteElement = elt =>
		{
			switch(elt.constructor.name)
			{
				case 'IndexMorphism':
					pasteMorphism(elt);
					break;
				case 'IndexObject':
					pasteObject(elt);
					break;
				case 'IndexText':
				case 'IndexCode':
					const txy = D2.add(xy, D2.subtract(elt.getXY(), base));
					const args = elt.json();
					args.xy = txy;
					delete args.basename;
					delete args.name;
					copies.push(new IndexText(diagram, args));
					break;
			}
		};
		elements.map(e => pasteElement(e));
		return copies;
	}
	setClass(cls, on, ...elts)
	{
		if (on)
			elts.map((e, i) => e.classList.add(cls));
		else
			elts.map((e, i) => e.classList.remove(cls));
	}
	del(elt) {elt.parentElement.removeChild(elt);}
	removeChildren(elt)
	{
		while(elt && elt.firstChild)
			elt.removeChild(elt.firstChild);
	}
	pretty(obj, elt, indent = 0)
	{
		const tab = '&nbsp;&nbsp;';
		Object.keys(obj).forEach(i =>
		{
			const d = obj[i];
			if (d && typeof d === 'object')
			{
				elt.appendChild(H3.p(`${tab.repeat(indent)}${i}:`));
				return this.pretty(d, elt, indent + 1);
			}
			const prefix = tab.repeat(indent);
			elt.appendChild(H3.p(`${prefix}${U.DeCamel(i)}: ${d}`));
		});
		return elt;
	}
	arrowDirection()
	{
		const a = this.default.arrow;
		return new D2(a.length * a.dir.x, a.length * a.dir.y);
	}
	getArc(cx, cy, r, startAngle, endAngle)
	{
		const start = D2.polar(cx, cy, r, startAngle);
		const end = D2.polar(cx, cy, r, endAngle);
		const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
	}
	getPng(name, fn)
	{
		let png = this.diagramPNGs.get(name);
		if (!png)
		{
			R.readPNG(name, png =>
			{
				if (png)
					this.diagramPNGs.set(name, png);
				fn(png);
			});
			return;
		}
		fn(png);
	}
	getImageElement(name, fn = null, args = {})
	{
		this.getPng(name, png =>
		{
			const nuArgs = U.clone(args);
			if (png)
				nuArgs.src = png;
			nuArgs.id = U.SafeId(`img-el_${name}`);
			if (!nuArgs.src && R.cloud)
				nuArgs.src = R.getDiagramURL(name + '.png');
			if (!('alt' in nuArgs))
				nuArgs.alt = 'Image not available';
			fn && fn(H3.img('.stdBackground', nuArgs));
		});
	}
	placeComposite(e, diagram, comp)
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
		const stdGrid = this.default.arrow.length;
		const xy = new D2({x:bbox.x, y:bbox.y + bbox.height + stdGrid}).grid(stdGrid);
		const indexObjects = objects.map((o, i) =>
		{
			const ndxObj = diagram.placeObject(o, xy, false);
			if (i < objects.length/2 -1)
				xy.x += i < composite.length -1 ? this.getArrowLength(composite[i]) : stdGrid;
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
	getArrowLength(m)
	{
		const stdGrid = this.gridSize();
		let delta = stdGrid;
		const tw = m.textWidth();
		while (delta < tw)
			delta += stdGrid;
		return delta;
	}
	setupReplay()
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
		this.replayCommands.set('drop', replayDrop);
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
						this.emitDiagramEvent(diagram, 'move', elt);
					}
				}
			},
		};
		this.replayCommands.set('move', replayMove);
		const replayFuseObjects =
		{
			replay(e, diagram, args)
			{
				const target = diagram.getElement(args.target);
				if ('from' in args)
				{
					const from = diagram.getElement(args.from);
					diagram.fuseObjects(e, from, target, false);
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
					morphs.forEach(m => { minNdx = Math.min(minNdx, elements.indexOf(m)); });
					elements.splice(minNdx, 0, from);	// put from to be before the morphisms
					diagram.domain.replaceElements(elements);
					this.emitObjectEvent(diagram, 'fuse', from, {target});
					this.emitCellEvent(diagram, 'check');
				}
			}
		};
		this.replayCommands.set('fuseObject', replayFuseObjects);
		const replayText =
		{
			replay(e, diagram, args)
			{
				const xy = new D2(args.xy);
				diagram.placeText(args.text, xy);
			}
		};
		this.replayCommands.set('text', replayText);
		const replayEditText =
		{
			replay(e, diagram, args)
			{
				const t = diagram.getElement(args.name);
				t.editText(e, args.attribute, args.value, false);		// TODO avoid saving
			}
		};
		this.replayCommands.set('editText', replayEditText);
		const replayView =
		{
			replay(e, diagram, args)
			{
				diagram.setPlacement(args);
			}
		};
		this.replayCommands.set('view', replayView);
		const replayPaste =
		{
			replay(e, diagram, args)
			{
				this.doPaste(e, args.xy, diagram.getElements(args.elements));
			}
		};
		this.replayCommands.set('paste', replayPaste);
		const replayAddReference =
		{
			replay(e, diagram, args)
			{
				R.addReference(e, args.name);		// TODO async
			}
		};
		this.replayCommands.set('addReference', replayAddReference);
		const replayRemoveReference =
		{
			replay(e, diagram, args)
			{
				R.removeReference(e, args.name);
			}
		};
		this.replayCommands.set('removeReference', replayRemoveReference);
	}
	busy(msg = '')
	{
		if ('busyBtn' in R)
			R.busyBtn.remove();
		this.toolbar.hide();
		const svg = document.getElementById('topSVG');
		const size = 160;
		const cx = window.innerWidth/2 - size;
		const cy = window.innerHeight/2 - size;
		const btn = H3.g(H3.g(H3.animateTransform({attributeName:"transform", type:"rotate", from:`360 ${size} ${size}`, to:`0 ${size} ${size}`, dur:"1s", repeatCount:'indefinite'}),
								H3.path({class:"svgfilNone svgstr1", d:this.getArc(size, size, 100, 45, 360), 'marker-end':'url(#arrowhead)'})), {transform:`translate(${cx}, ${cy})`});
		R.busyBtn = btn;
		svg.appendChild(btn);
		if (msg !== '')
			btn.appendChild(H3.text(msg, {x:-size, y:size + window.innerHeight * 0.25, textAnchor:'middle', style:'"Fira Sans",sans-serif;font-size:96px;font-weight:bold'}));
	}
	notBusy()
	{
		if ('busyBtn' in R)
		{
			R.busyBtn.remove();
			delete R.busyBtn;
		}
	}
	forEachDiagramSVG(fn)
	{
		let dgrmSvg = this.diagramSVG.firstChild;
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
	setSessionViewport(viewport)
	{
		const vp = this.session.getViewport(R.diagram.name);
		const oldScale = vp.scale;
		this.session.setCurrentViewport(viewport);
		this.diagramSVG.setAttribute('transform', `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale} ${viewport.scale})`);
	}
	getViewportByBBox(bbox)	// bbox in session coordinates
	{
		if (bbox.width === 0)
			bbox.width = this.width();
		const margin = this.navbar.element.getBoundingClientRect().height;
		const dw = this.width() - 2 * this.default.panel.width - 2 * margin;
		const dh = this.height() - 4 * margin;
		const xRatio = bbox.width / dw;
		const yRatio = bbox.height / dh;
		const scale = 1.0/Math.max(xRatio, yRatio);
		let x = - bbox.x * scale + this.default.panel.width + margin;
		let y = - bbox.y * scale + 2 * margin;
		if (xRatio > yRatio)
			y += dh/2 - scale * bbox.height/2;
		else
			x += dw/2 - scale * bbox.width/2;
		return {x, y, scale};
	}
	getViewportByBBoxTop(bbox)	// bbox in session coordinates
	{
		if (bbox.width === 0)
			bbox.width = this.width();
		const margin = this.navbar.element.getBoundingClientRect().height;
		const dw = this.width() - 2 * this.default.panel.width - 2 * margin;
		const xRatio = bbox.width / dw;
		const scale = 1.0/xRatio;
		let x = - bbox.x * scale + this.default.panel.width + margin;
		x += dw/2 - scale * bbox.width/2;
		const y = - bbox.y * scale + 2 * margin;
		return {x, y, scale};
	}
	getViewportByBBoxBottom(bbox)	// bbox in session coordinates
	{
		if (bbox.width === 0)
			bbox.width = this.width();
		const margin = this.navbar.element.getBoundingClientRect().height;
		const dw = this.width() - 2 * this.default.panel.width - 2 * margin;
		const xRatio = bbox.width / dw;
		const scale = 1.0/xRatio;
		let x = - bbox.x * scale + this.default.panel.width + margin;
		x += dw/2 - scale * bbox.width/2;
		const y = - scale * (bbox.y + bbox.height) + this.height() - 4 * margin;
		return {x, y, scale};
	}
	setSessionViewportByBBox(bbox)
	{
		this.setSessionViewport(this.getViewportByBBox(bbox));
	}
	setSessionViewportByBBoxTop(bbox)
	{
		this.setSessionViewport(this.getViewportByBBoxTop(bbox));
	}
	setSessionViewportByBBoxEnd(bbox)
	{
		this.setSessionViewport(this.getViewportByBBoxBottom(bbox));
	}
	userToSessionCoords(xy, showit = false)
	{
		const viewport = this.session.getCurrentViewport();
		const scale = 1.0 / viewport.scale;
		if (isNaN(viewport.x) || isNaN(scale))
			throw 'NaN in coords';
		const d2 = new D2(	scale * (xy.x - viewport.x),
							scale * (xy.y - viewport.y));
		if ('width' in xy && xy.width > 0)
		{
			d2.width = scale * xy.width;
			d2.height = scale * xy.height;
			if (showit)
				R.diagram.svgTranslate.appendChild(H3.circle('.ball', {cx:d2.x + d2.width, cy:d2.y + d2.height, r:5, fill:'red'}));
		}
		if (showit)
			R.diagram.svgTranslate.appendChild(H3.circle('.ball', {cx:d2.x, cy:d2.y, r:5, fill:'red'}));
		return d2;
	}
	sessionToUserCoords(xy)
	{
		const viewport = this.session.getCurrentViewport();
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
	getScreenPan()
	{
		return Math.min(this.width(), this.height()) * this.default.pan.scale;
	}
	panHandler(e, dir, dist = null)		// dist in pixels
	{
		if (this.textEditActive())
			return;
		let offset = null;
		const viewport = this.session.getCurrentViewport();
		const screenPan = dist ? dist : this.screenPan;
		if (typeof dir === 'string')
			switch(dir)
			{
				case 'up':
					offset = new D2(0, screenPan);
					break;
				case 'down':
					offset = new D2(0, -screenPan);
					break;
				case 'left':
					offset = new D2(screenPan, 0);
					break;
				case 'right':
					offset = new D2(-screenPan, 0);
					break;
			}
		else if (dir instanceof D2)
			offset = new D2(dir.x * screenPan, dir.y * screenPan);
		else
			offset = new D2(e.movementX * viewport.scale, e.movementY * viewport.scale);
		this.setSessionViewport({x:viewport.x + offset.x, y:viewport.y + offset.y, scale:viewport.scale});
		this.emitViewEvent(this.session.mode, R.diagram);
	}
	textEditActive()
	{
		return this.editElement !== null;
	}
	closeActiveTextEdit()
	{
		if (this.textEditActive())
		{
			this.editElement.contentEditable = false;
			this.editElement = null;
		}
	}
	setFullscreen(full, emit = true)
	{
		this.default.fullscreen = full;
		D.saveDefaults();
		if (emit)
		{
			const diagrams = [];
			this.session.diagrams.forEach((val, name) =>
			{
				const diagram = R.CAT.getElement(name);
				diagram && diagrams.push(diagram);
			});
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
	getTool()
	{
		return this.tool[this.tool.length -1];
	}
	popTool()
	{
		this.tool.pop();
	}
	pushTool(tool)
	{
		this.tool.push(tool);
	}
	setTool(tool)
	{
		this.tool.length = 0;
		this.pushTool(tool);
	}
	findAncestor(tag, elt)
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
	getDiagramHtml(info)
	{
		const items = [];
		items.push(H3.span('.smallBold', info.properName !== '' & info.properName !== info.basename ? info.properName : info.basename));
		info.description !== '' && items.push(H3.span('.diagramRowDescription', info.description));
		items.push(H3.br(), H3.span(info.name, '.tinyPrint'));
		items.push(H3.span(info.codomain instanceof Category ? info.codomain.name : info.codomain, '.smallPrint'));
		items.push(H3.span(U.localtime(info.timestamp), '.smallPrint'));
		return H3.div(items);
	}
	toggleIcon(icon, bool)
	{
		if (bool)
			this.setActiveIcon(icon, false);
		else
			this.setUnactiveIcon(icon);
	}
	inputBasenameSearch(e, diagram, action, base = null, suffix = '')
	{
		if (this.onEnter(e, action))
			return;
		const basename = suffix + ('value' in e.target ? e.target.value : e.target.innerText);	// input elements vs other tags
		let name = `${diagram.name}/${basename}`;
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
	inputDiagramBasenameSearch(e, action, base = null)
	{
		if (this.onEnter(e, action))
			return;
		const basename = 'value' in e.target ? e.target.value : e.target.innerText;	// input elements vs other tags
		let name = `${R.user.name}/${basename}`;
		let elt = R.$CAT.getElement(name);
		if (elt && elt === base)
			return;
		if (elt === undefined)
			elt = R.$CAT.codomain.elements.get(name);
		if (e.target.contentEditable)
		{
			e.target.style.backgroundColor = elt ? 'red' : '';
			e.target.style.color = elt ? 'white' : '';
		}
		else
			elt ? e.target.classList.add('error') : e.target.classList.remove('error');
	}
	startMousePan(e)
	{
		this.getTool() !== 'pan' && this.pushTool('pan');
		this.drag = false;
		this.setCursor();
		e.preventDefault();
		this.toolbar.hide();
	}
	stopMousePan()
	{
		this.getTool() === 'pan' && this.popTool();
	}
	resetDefaults()
	{
		U.removefile('defaults.json');
		R.default = U.clone(R.factoryDefaults);
		this.default = U.clone(D.factoryDefaults);
		this.statusbar.show(null, 'Defaults reset to original values');
		this.panels.panels.settings.update();
	}
	gridSize()
	{
		return this.default.majorGridMult * this.default.layoutGrid;
	}
	emitViewEvent(command, diagram = null, action = null)
	{
		this.session.mode = command;
		R.default.showEvents && console.log('emit View event', {command});
		return window.dispatchEvent(new CustomEvent('View', {detail:	{command, diagram, action}, bubbles:true, cancelable:true}));
	}
	emitApplicationEvent(command)
	{
		R.default.showEvents && console.log('emit APPLICATION event', command);
		return window.dispatchEvent(new CustomEvent('Application', {detail:	{command}, bubbles:true, cancelable:true}));
	}
	emitLoginEvent()
	{
		R.default.showEvents && console.log('emit LOGIN event', R.user.name, R.user.status);
		return window.dispatchEvent(new CustomEvent('Login', {detail:	{command:R.user.status, name:R.user.name}, bubbles:true, cancelable:true}));
	}
	emitCATEvent(command, diagram, action = null)
	{
		R.default.showEvents && console.log('emit CAT event', {command, diagram, action});
		return window.dispatchEvent(new CustomEvent('CAT', {detail:	{command, diagram, action}, bubbles:true, cancelable:true}));
	}
	emitCategoryEvent(command, category)
	{
		R.default.showEvents && console.log('emit Category event', {command, category, action});
		return window.dispatchEvent(new CustomEvent('Category', {detail:	{command, category}, bubbles:true, cancelable:true}));
	}
	emitDiagramEvent(diagram, command, arg = '')
	{
		R.default.showEvents && console.log('emit DIAGRAM event', {diagram, command, arg});
		return window.dispatchEvent(new CustomEvent('Diagram', {detail:	{diagram, command, arg}, bubbles:true, cancelable:true}));
	}
	emitObjectEvent(diagram, command, element, extra = {})	// like an object changed
	{
		R.default.showEvents && console.log('emit OBJECT event', {command, name:element.name});
		const detail = { diagram, command, element, };
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		const args = {detail, bubbles:true, cancelable:true};
		return window.dispatchEvent(new CustomEvent('Object', args));
	}
	emitMorphismEvent(diagram, command, element, extra = {})
	{
		if (diagram && !diagram.sync)
			return;
		R.default.showEvents && console.log('emit MORPHISM event', {command, name:element.name});
		const detail = {diagram, command, element};
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		const args = {detail, bubbles:true, cancelable:true};
		return window.dispatchEvent(new CustomEvent('Morphism', args));
	}
	emitTextEvent(diagram, command, element)
	{
		R.default.showEvents && console.log('emit TEXT event', {command, name:element.name});
		return window.dispatchEvent(new CustomEvent('Text', {detail:	{diagram, command, element}, bubbles:true, cancelable:true}));
	}
	emitIndexElementEvent(diagram, command, element, extra = {})
	{
		R.default.showEvents && console.log('emit INDEXELEMENT event', {command, name:element.name});
		const detail = {diagram, command, element};
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		return window.dispatchEvent(new CustomEvent('IndexElement', {detail, bubbles:true, cancelable:true}));
	}
	emitElementEvent(diagram, command, elt, extra)
	{
		if (elt instanceof CatObject)
			this.emitObjectEvent(diagram, command, elt, extra);
		else if (elt instanceof Morphism)
			this.emitMorphismEvent(diagram, command, elt, extra);
		else if (elt instanceof IndexText)
			this.emitTextEvent(diagram, command, elt, extra);
		else if (elt instanceof IndexElement)
			this.emitIndexElementEvent(diagram, command, elt, extra);
	}
	emitCellEvent(diagram, command, cell = null)
	{
		R.default.showEvents && console.log('emit CELL event', {diagram, command, name});
		return window.dispatchEvent(new CustomEvent('Cell', {detail:	{diagram, command, cell}, bubbles:true, cancelable:true}));
	}
	emitPNGEvent(diagram, command, png)
	{
		R.default.showEvents && console.log('emit PNG event', {diagram, command, name});
		return window.dispatchEvent(new CustomEvent('PNG', {detail:	{diagram, command, png}, bubbles:true, cancelable:true}));
	}
	uploadJSON(e)
	{
		const files = e.target.files;
		const json = JSON.parse(txt);
		if (json.user !== this.user.name && !R.user.isAdmin())
		{
			this.statusbar.show(e, `User ${json.user} is not the logged in user ${this.user.name}`);
			return;
		}
		if (!this.canDeleteDiagram(json.name))
		{
			this.statusbar.show(e, `Cannot delete diagram ${json.name}`);
			return;
		}
		if (this.catalog.has(json.name))
		{
			const old = this.$CAT.getElement(json.name);
			// TODO reload diagrams that were referencing this one
			if (old)
				while(old.refcnt >= 0)
					old.decrRefcnt();
		}
		this.emitViewEvent('diagram', null);	// needed if this.diagram = diagram since old.decrRefcnt() puts it into catalog view
		const diagram = new Cat[json.prototype](this.getUserDiagram(this.user.name), json);
		this.saveDiagram(diagram, e => R.debug(1) && console.log('uploadJSON saved', diagram.name));
		diagram.savePng();
		this.emitCATEvent('new', iagram);
		Runtime.SelectDiagram(diagram.name);
		this.toolbar.clearError();
		this.upload(null, json, true, _ => {});
		this.statusbar.show(e, `Diagram ${diagram.name} loaded from local JSON file`);
		for (let i=0; i<files.length; ++i)
		{
			const file = files[i];
			file.text().then(proc);
		}
	}
	uploadJSONForm()
	{
		return H3.div('##Diagram-upload-json.hidden',
			H3.label('Select JSON file to upload as diagram:', {for:'upload-json'}),
			H3.br(),
			H3.input('##upload-json.ifocus', {type:'file', accept:'.json', onchange:e => this.uploadJSON(e)}));
	}
	clickOrHelp(e, name, clickme)
	{
		e.ctrlKey ? Runtime.SelectDiagram(name) : clickme(e);
	}
	updateBorder()
	{
		if (!R.diagram)
			return;
		if (R.diagram.ready !== 0)
			setTimeout(_ => this.updateBorder(), 10);		// wait for it
		else if (this.default.fullscreen)
		{
			const dgrmBbox = R.diagram.svgRoot.getBBox();
			const box = this.sessionToUserCoords(dgrmBbox);
			const wid = this.width();
			const hgt = this.height();
			const topLft = D2.segmentIntersect(0, 0, 0, hgt, box.x, box.y, box.x + box.width, box.y);
			const topRgt = D2.segmentIntersect(wid, 0, wid, hgt, box.x, box.y, box.x + box.width, box.y);
			const botLft = D2.segmentIntersect(0, 0, 0, hgt, box.x, box.y + box.height, box.x + box.width, box.y + box.height);
			const botRgt = D2.segmentIntersect(wid, 0, wid, hgt, box.x, box.y + box.height, box.x + box.width, box.y + box.height);
			const vpLftTop = new D2();
			const vpTopRgt = new D2(wid, 0);
			const vpLftBot = new D2(0, hgt);
			const vpRgtBot = vpLftBot.add(vpTopRgt);
			const boxLftBot = box.add({x:0, y:box.height});
			const boxRgtTop = box.add({x:box.width, y:0});
			const boxRgtBot = boxRgtTop.add({x:box.width, y:box.height});
			const lftDst = topLft ? D2.segmentDistance(topLft, box, boxLftBot) : botLft ? D2.segmentDistance(botLft, box, boxLftBot) : D2.segmentDistance(vpLftTop, box, boxLftBot);
			const rgtDst = topRgt ? D2.segmentDistance(topRgt, boxRgtTop, boxRgtBot) : botRgt ? D2.segmentDistance(botRgt, boxRgtTop, boxRgtBot) : D2.segmentDistance(vpTopRgt, boxRgtTop, boxRgtBot);
			const topDst = topRgt ? D2.segmentDistance(topRgt, box, boxRgtTop) : topLft ? D2.segmentDistance(topLft, box, boxRgtTop) : D2.segmentDistance(vpLftTop, box, boxRgtTop);
			const botDst = botRgt ? D2.segmentDistance(botRgt, boxLftBot, boxRgtBot) : botLft ? D2.segmentDistance(botLft, boxLftBot, boxRgtBot) : D2.segmentDistance(vpLftBot, boxLftBot, boxRgtBot);
			const maxLvl = this.default.borderAlert;
			const opacMag = 0.5;
			const minOpc = this.default.borderMinOpacity;
			let lftOpa = box.x < 0 ? opacMag * Math.min(maxLvl, lftDst / wid) / maxLvl : 0;
			if (lftOpa > 0)
				lftOpa = Math.max(minOpc, lftOpa);
			let rgtOpa = box.x + box.width > wid ? opacMag * Math.min(maxLvl, rgtDst / wid) / maxLvl : 0;
			if (rgtOpa > 0)
				rgtOpa = Math.max(minOpc, rgtOpa);
			let topOpa = box.y < 0 ? opacMag * Math.min(maxLvl, topDst / hgt) / maxLvl : 0;
			if (topOpa > 0)
				topOpa = Math.max(minOpc, topOpa);
			let botOpa = box.y + box.height > hgt ? opacMag * Math.min(maxLvl, botDst / hgt) / maxLvl : 0;
			if (botOpa > 0)
				botOpa = Math.max(minOpc, botOpa);
			const borders = this.topSVG.querySelectorAll('.borderAlert');
			borders.forEach(elt => elt.remove());
			const margin = this.default.borderMargin;
			lftOpa > 0 && this.topSVG.appendChild(H3.rect('.borderAlert.trans', {style:`opacity:${lftOpa}`, x:0, y:0, width:margin, height:hgt, fill:this.default.darkmode ? 'url(#borderLftGradDM)' : 'url(#borderLftGrad)'}));
			rgtOpa > 0 && this.topSVG.appendChild(H3.rect('.borderAlert.trans', {style:`opacity:${rgtOpa}`, x:wid - margin, y:0, width:margin, height:hgt, fill:this.default.darkmode ? 'url(#borderRgtGradDM)' : 'url(#borderRgtGrad)'}));
			topOpa > 0 && this.topSVG.appendChild(H3.rect('.borderAlert.trans', {style:`opacity:${topOpa}`, x:0, y:this.default.icon, width:wid, height:margin, fill:this.default.darkmode ? 'url(#borderTopGradDM)' : 'url(#borderTopGrad)'}));
			botOpa > 0 && this.topSVG.appendChild(H3.rect('.borderAlert.trans', {style:`opacity:${botOpa}`, x:0, y:hgt - margin, width:wid, height:margin, fill:this.default.darkmode ? 'url(#borderBotGradDM)' : 'url(#borderBotGrad)'}));
		}
		else
			this.hideBorderAlerts();
	}
	setDarkmode(mode)
	{
		mode ? document.body.setAttribute('data-theme', 'dark') : document.body.removeAttribute('data-theme');
		this.default.darkmode = mode;
		this.updateBorder();
		D.saveDefaults();
	}
	generateGraphColors()
	{
		for (let intensity=6; intensity < 15; intensity=intensity +3)
		{
			for (let bnd=0; bnd<3; bnd++)
			{
				const color = [intensity, intensity, intensity];
				color[bnd] = 15;
				this.graphColors.push(`#${color[0].toString(16)}${color[1].toString(16)}${color[2].toString(16)}`);
			}
			for (let bnd=0; bnd<3; bnd++)
			{
				const color = [15, 15, 15];
				color[bnd] = intensity;
				this.graphColors.push(`#${color[0].toString(16)}${color[1].toString(16)}${color[2].toString(16)}`);
			}
		}
	}
	deEmphasize()
	{
		this.emphasized.forEach(elt => elt.svg && elt.emphasis(false));
	}
	toggleShowCommutivity(e)
	{
		D.default.showCommutivity = !D.default.showCommutivity;
		D.saveDefaults();
		R.diagram.domain.checkCells();
		D.emitApplicationEvent('commutivity');
	}
	advanceInputMode()
	{
		switch(D.inputMode)
		{
			case 'text':
				D.inputMode = 'object';
				break;
			case 'object':
				D.inputMode = 'morphism';
				break;
			case 'morphism':
				D.inputMode = 'text';
				break;
		}
		D.emitApplicationEvent('inputMode');
	}
	setCategory(cat)
	{
		R.setCategory(cat);
		D.emitDiagramEvent(R.diagram, 'category', cat);
	}
	copyTo(e, str)
	{
		navigator.clipboard.writeText(str);
		D.statusbar.show(e, 'Copied');
	}
	getFactorsById(id)
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
}

class Panels
{
	constructor()
	{
		this.panels = {};
		window.addEventListener('Autohide', e =>
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
			if (!refPnl || refPnl.elt.style.width === '100%' || panel.right === refPnl.right)	// close on same side
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
		this.section.style.display = this.section.style.display === 'block' ? 'none' : 'block';
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
		D.removeChildren(this.expandBtnElt);
		this.expandBtnElt.appendChild(D.getIcon('panelCollapse', this.right ? 'chevronLeft' : 'chevronRight', e => this.expand(), {title:'Collapse'}));
		this.state = 'open';
	}
	closeBtnCell()
	{
		return D.getIcon('panelClose', 'close', e => this.close(), {title:'Close'});
	}
	expand(exp = 'auto')
	{
		this.elt.style.width = exp;
		D.panels.closeAll(this);
		D.removeChildren(this.expandBtnElt);
		this.expandBtnElt.appendChild(D.getIcon('panelExpand', this.right ? 'chevronRight' : 'chevronLeft', e => this.collapse(), {title:'Expand'}));
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
		this.elt.style.height = `${window.innerHeight - D.default.icon}px`;
	}
	expandPanelBtn()
	{
		return D.getIcon('panelExpand', this.right ? 'chevronLeft' : 'chevronRight', e => this.expand(), {title:'Expand', id:`${this.name}-expandBtn`});
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
		this.elt.appendChild(H3.table('.buttonBarRight.stdBackground', H3.tr(H3.td(
			D.getIcon('threeDClear', 'delete', e => Cat.D.threeDPanel.initialize(), {title:'Clear display'}),
			D.getIcon('threeDLeft', 'threeD_left', e => Cat.D.threeDPanel.view('left'), {title:'Left'}),
			D.getIcon('threeDtop', 'threeD_top', e => Cat.D.threeDPanel.view('top'), {title:'Top'}),
			D.getIcon('threeDback', 'threeD_back', e => Cat.D.threeDPanel.view('back'), {title:'Back'}),
			D.getIcon('threeDright', 'threeD_right', e => Cat.D.threeDPanel.view('right'), {title:'Right'}),
			D.getIcon('threeDbotom', 'threeD_bottom', e => Cat.D.threeDPanel.view('bottom'), {title:'Bottom'}),
			D.getIcon('threeDfront', 'threeD_front', e => Cat.D.threeDPanel.view('front'), {title:'Front'}),
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
			D.loadScript(url + '/js/three.min.js', _ =>
			{
				D.loadScript(url + '/js/OrbitControls.js', _ =>
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
			R.recordError(e);
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
		let bbox = U.clone(this.bbox);
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
		D.removeChildren(this.expandBtnElt);
		this.expandBtnElt.appendChild(D.getIcon('threeDPanelCollapse', 'chevronRight', e => this.collapse(true), {title:'Expand'}));
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
		const div = H3.div(H3.table(H3.tr(H3.td('.buttonBarRight.stdBackground', D.getIcon('logClear', 'delete', _ => Cat.R.diagram.clearLog(), {title:'Clear log'}),
												D.getIcon('log', 'download-log', _ => Cat.R.diagram.downloadLog(), {title:'Download log'})))), H3.hr());
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
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn())), '.buttonBarRight.stdBackground'),
			H3.h3('TTY'),
			H3.button('Output', '.sidenavAccordion', {title:'TTY output from some composite', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'tty-out-section')}),
			H3.div(H3.table(H3.tr(H3.td(	D.getIcon('ttyClear', 'delete', _ => D.removeChildren(this.out), {title:'Clear output'}),
											D.getIcon('log', 'download-log', e => Cat.D.downloadString(this.out.innerHTML, 'text', 'console.log'), {title:'Download tty log file'}), '.buttonBarRight.stdBackground'))),
				H3.pre('##tty-out.tty'), '##tty-out-section.section'),
			H3.button('Errors', '.sidenavAccordion', {title:'Errors from some action', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'tty-error-section')}),
			H3.div(H3.table(H3.tr(H3.td(	D.getIcon('ttyErrorClear', 'delete', _ => D.removeChildren(this.error)),
											D.getIcon('error', 'download-error', e => Cat.D.downloadString(this.error.innerHTML, 'text', 'console.err'), {title:'Download error log file'}), '.buttonBarRight.stdBackground'))),
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
		// TODO convert to diagram
		const elements = [
			H3.table(H3.tr(H3.td(this.closeBtnCell(), this.expandPanelBtn())), '.buttonBarRight.stdBackground'),
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
			H3.button('Credits', '##creditaPnlBtn.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'creditsPnl')}),
			H3.div(	H3.a('Saunders Mac Lane', {href:"https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"}),
					H3.a('Harry Dole', {href:"https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"}), '##creditsPnl.section'),
			H3.button('Third Party Software', '##third-party.sidenavAccordion', {onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'thirdPartySoftwarePnl')}),
			H3.div( H3.a('3D', {href:"https://threejs.org/"}),
					H3.a('Crypto', {href:"https://bitwiseshiftleft.github.io/sjcl/"}), '##thirdPartySoftwarePnl.section'),
			H3.hr(),
			H3.small('&copy;2018-2022 Harry Dole'),
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
		this.elt.appendChild(H3.div(	H3.table(H3.tr(H3.td(this.closeBtnCell())), '.buttonBarRight.stdBackground'),
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
								H3.tr(H3.td(H3.button('Login', {onclick:e => Cat.R.cloud.login(e)})))));
	}
	update()
	{
		this.userNameElt.innerHTML = R.user.name;
		this.userEmailElt.innerHTML = R.user.email;
		D.removeChildren(this.loginInfoElt);
		D.removeChildren(this.errorElt);
		D.removeChildren(this.permissionsElt);
		if (R.user.cloud)
			this.permissionsElt.innerText = R.user.cloud.permissions.join(', ');
		const getLogoutButton = _ => H3.button('Log Out', {onclick:_ => Cat.R.cloud.logout()});
		const getResetButton = _ => H3.button('Reset password', {onclick:e => Cat.R.cloud.resetPassword(e)});
		function getConfirmationInput(endRows)
		{
			return H3.form(	H3.h3('Confirmation Code'),
							H3.span('The confirmation code is sent by email to the specified address above.'),
							H3.table(	H3.tr(H3.td('Confirmation code')),
										H3.tr(H3.td(H3.input('##confirmationCode', {type:'text', placeholder:'six digit code', onkeydown:e => Cat.D.onEnter(e, Cat.R.cloud.confirm, Cat.R.cloud)}))),
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
				H3.tr(H3.td(H3.input(`##SignupUserPasswordConfirm`, {type:'password', placeholder:'Confirm', autocomplete:"confirm-password", onkeydown:e => Cat.D.onEnter(e, onkeydown, Cat.R.cloud)})));
	}
}

class SettingsPanel extends Panel
{
	constructor()
	{
		super('settings');
		const debugChkbox = H3.input({type:"checkbox", onchange:e => {Cat.R.default.debug = Cat.R.default.debug > 0 ? 0 : 1; D.saveDefaults();}, id:'check-debug'});
		const gridChkbox = H3.input({type:"checkbox", onchange:e => {Cat.D.gridding = !D.gridding; D.saveDefaults();}});
		if (D.gridding)
			gridChkbox.checked = true;
		const showEventsChkbox = H3.input({type:"checkbox", onchange:e => {Cat.R.default.showEvents = !Cat.R.default.showEvents; D.saveDefaults();}});
		if (R.default.showEvents)
			showEventsChkbox.checked = true;
		const settings = [	H3.tr(	H3.td(gridChkbox),
									H3.td('Snap objects to a grid.', '.left')),
							H3.tr(	H3.td(H3.input({type:"checkbox", onchange:e => D.setDarkmode(e.target.checked), id:'check-darkmode'})),
									H3.td('Dark mode', '.left'))];
		const elts =
		[
			H3.table(H3.tr(H3.td(this.closeBtnCell())), '.buttonBarRight.stdBackground'),
			H3.button('Settings', '##catActionPnlBtn.sidenavAccordion', {title:'Help for mouse and key actions', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'settings-actions')}),
			H3.div(H3.table('##settings-table', settings), '##settings-actions.section'),
			H3.button('Equator', '##catActionPnlBtn.sidenavAccordion', {title:'Help for mouse and key actions', onclick:e => Cat.D.Panel.SectionToggle(e, e.target, 'settings-equator')}),
			H3.div('##settings-equator.section')
		];
		elts.map(elt => this.elt.appendChild(elt));
		this.initialize();
		this.equalityElt = document.getElementById('settings-equator');
		R.workers.equator.addEventListener('message', msg =>
		{
			if (msg.data.command === 'Info')
			{
				const elt = this.equalityElt;
				D.removeChildren(elt);
				const data = U.clone(msg.data);
				delete data.command;
				delete data.delta;
				D.pretty(data, elt);
			}
			else if (msg.data.command === 'LoadDiagrams')
				R.workers.equator.postMessage({command:'Info'});
		});
		window.addEventListener('Login', _ => this.update());
	}
	update()
	{
		document.getElementById('check-darkmode').checked = D.default.darkmode;
		const tbl = this.elt.querySelector('#settings-table');
		tbl.appendChild(H3.tr(H3.td(H3.button('Reset Defaults', '.textButton', {onclick:_ =>
		{
			Cat.D.resetDefaults();
			this.update();
		}}), {colspan:2})));
		if (R.user.cloud && R.user.cloud.permissions.includes('admin'))
		{
			tbl.appendChild(H3.tr(	H3.td(H3.button('Update Reference Counts', '.textButton', {onclick:_ => Cat.R.updateRefcnts()}), {colspan:2})));
			tbl.appendChild(H3.tr(	H3.td(H3.button('Rewrite diagrams', '.textButton', {onclick:_ => Cat.R.rewriteDiagrams()}), {colspan:2})));
			tbl.appendChild(H3.tr(	H3.td(H3.button('Update bug report', '.textButton', {onclick:_ => Cat.R.updateBugReport()}), {colspan:2})));
		}
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
		{
			let category = null;
			if (args.category instanceof Category)
				category = args.category;
			else if (args.category)
			{
				if (diagram)
					category = diagram.getElement(args.category);
				if (!category)
					category = R.getCategory(args.category);
			}
			if (category)
			{
				Object.defineProperty(this, 'category', {value: category,	writable: false});
				if (category.elements.has(name))
					throw `Element with given name ${U.HtmlSafe(name)} already exists in category ${U.HtmlSafe(category.name)}`;
				category.elements.set(name, this);
				category.refcnt++;
			}
		}
		else
			Object.defineProperty(this, 'category', {value:diagram.codomain,	writable: false});
		const dual = U.getArg(args, 'dual', false);
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
			signature:		{value: null,											writable: true},
		});
		if ('code' in args)
			Object.defineProperty(this, 'code', {value:args.code,	writable:false});
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
			this.diagram.updateBasenames(this);
		else if (attribute === 'properName')
			this.diagram.updateProperNames(this);
		return old;
	}
	updateProperName()		// fitb
	{}
	updateBasename()
	{
		this.name = Element.Codename(diagram, {basename:this.basename});
		this.setSignature();
		this.diagram.reconstituteElements();
	}
	help()
	{
		let baseBtn = '';
		let descBtn = '';
		let pNameBtn = '';
		if (this.isEditable() && this.diagram.isEditable())
		{
			const id = 'help-table';
			switch(this.constructor.name)	// the others have auto-generated names
			{
				case 'CatObject':
				case 'Diagram':
				case 'Morphism':
				case 'FiniteObject':
				case 'Category':
				case 'NamedObject':
				case 'NamedMorphism':
					baseBtn = this.refcnt <= 1 ? D.getIcon('elt-edit-basename', 'edit', e => this.diagram.editElementText(e, this, id, 'basename'), {title:'Edit'}) : '';
					descBtn = D.getIcon('elt-edit-description', 'edit', e => this.diagram.editElementText(e, this, id, 'description'), {title:'Edit'});
					pNameBtn = this.canChangeProperName() ? D.getIcon('elt-edit-propername', 'edit', e => this.diagram.editElementText(e, this, id, 'properName'), {title:'Edit'}) : '';
					break;
			}
		}
		[	H3.tr(H3.th(H3.tag('proper-name', this.properName), pNameBtn, {colspan:2})),
			H3.tr(H3.td('Base name:', '.left'), H3.td(H3.tag('basename', this.basename), baseBtn, '.left')),
			H3.tr(H3.td('Description:', '.left'), H3.td(H3.tag('description', this.description), descBtn, '.left')),
			H3.tr(H3.td('Category:', '.left'), H3.td(this.category ? this.category.properName : '', '.left')),
			H3.tr(H3.td('Diagram:', '.left'), H3.td(this.diagram ? this.diagram.properName : '', '.left')),
			H3.tr(H3.td('User:', '.left'), H3.td(this.diagram ? this.diagram.user : '', '.left')),
			H3.tr(H3.td('Ref. count:', '.left'), H3.td(this.diagram ? this.refcnt.toString() : '', '.left')),
			H3.tr(H3.td('Signature:', '.left'), H3.td(this.signature, '.left')),
		].map(row => D.toolbar.table.appendChild(row));
	}
	isEditable()		// can only edit the current diagram
	{
		return this.diagram.isEditable();
	}
	isIterable()
	{
		return false;		// fitb
	}
	// signature is based on name only
	setSignature()			// override as necessary
	{
		this.signature = U.sig(this.name);
	}
	incrRefcnt()
	{
		++this.refcnt;
if (this.name === "hdole/factorial/Cm{factorial,Id{hdole/nat/N64}dI}mC")debugger;
	}
	decrRefcnt()
	{
		this.refcnt > 0 && --this.refcnt;
	}
	json()
	{
		const a = {};
		a.description =	this.description;
		if ('basename' in this)
			a.basename = this.basename;
		if ('name' in this)
			a.name = this.name;
		a.prototype = this.constructor.name;
		if (this.properName !== this.basename)
			a.properName = this.properName;
		if ('category' in this && this.category)
			a.category = this.category.name;
		if ('diagram' in this && this.diagram)
			a.diagram =	this.diagram.name;
		if (this.dual)
			a.dual = true;
		if ('code' in this)
			a.code = U.clone(this.code);
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
		{
			this.svg.remove();
			this.svg = null;
		}
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
	emphasis(on)	// or override as needed
	{
		on ? D.emphasized.add(this) : D.emphasized.delete(this);
	}
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
		return [];
	}
	addButtons(elt)
	{
		const toolbar = elt.querySelector('.toolbar-element');
		this.getButtons().map(btn => toolbar.appendChild(btn));
	}
	getHtmlRow()
	{
		const html = this.getHtmlRep();
		html.classList.add('element');
		const elementToolbar = H3.span('.toolbar-element');
		let actions = {};
		const onmouseenter = e =>
		{
			elementToolbar.style.opacity = 100;
		};
		const onmouseleave = e =>
		{
			elementToolbar.style.opacity = 0;
		};
		actions = {onmouseenter, onmouseleave};
		html.appendChild(elementToolbar);
		return H3.tr(H3.td(html), actions);
	}
	mouseenter(e)
	{
		D.mouseover = this;
		if ((this instanceof IndexObject || this instanceof IndexMorphism) && this.to.description !== '')
			D.statusbar.show(e, this.to.description);
		this.diagram.emphasis(this, true);
	}
	mouseout(e)
	{
		if (D.mouseover === this)
		{
			D.mouseover = null;
			this.diagram.emphasis(this, false);
		}
	}
	mouseover(e)
	{
		D.mouseover = this;
		this.description !== '' && D.statusbar.show(e, this.description);
		this.diagram.emphasis(this, true);
	}
	getFactor(factor)
	{
		return this;
	}
	isBare()
	{
		return !(('attributes' in this) && this.attributes.has('quantifier'));
	}
	isTerminal() { return false; }		// fitb
	static Basename(diagram, args)	{ return args.basename; }
	static Codename(diagram, args)	{ return `${diagram ? diagram.name : 'sys'}/${args.basename}`; }
	static Process(diagram, args)	{ return 'prototype' in args ? new Cat[args.prototype](diagram, args) : null; }
	static SafeName(name)			{ return U.SafeId(`el_${name}`); }
}

class Graph
{
	constructor(element, args = {})
	{
		this.element = element;
		this.tags = [];
		if ('position' in args)
			this.position = args.position;
		if ('width' in args)
			this.width = args.width;
		this.graphs = 'graphs' in args ? args.graphs.slice().map(g => g instanceof Graph ? g : new Graph(element.diagram.getElement(g.element), g)) : [];
		this.tags = 'tags' in args ? args.tags.slice() : [];
		this.links = 'links' in args ? args.links.slice() : [];
		this.visited = new Set('visited' in args ? args.visited.slice() : []);
		if ('name' in args)
			this.name = args.name;
	}
	json()
	{
		const a = {};
		a.element = this.element.name;
		a.tags = this.tags.slice();
		a.position = U.clone(this.position);
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
	hasFactor(indices)
	{
		if (typeof indices === 'number')
			return indices >= 0 && indices < this.graphs.length;
		if (indices.length === 1 && indices[0] === -1)
			return true;
		if (this.graphs.length === 0 && indices.length > 0)
			return false;
		if (this.graphs.length === 0)
			return true;
		if (indices.length === 1 && indices[0].length === 0)
			return true;
		let fctr = this;
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return true;	// object is terminal object One
			if (fctr.graphs.length > 0)
				fctr = fctr.graphs[k];
			else
				return false;
		}
		return true;
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
	check()
	{
		let rslt = true;
		this.scan((g, ndx) =>
		{
			g.links.map(lnk =>
			{
				if (!this.hasFactor(lnk))
				{
					console.error('getFactor bad link at index: ', lnk, ndx);
					rslt = false;
				}
				const linked = this.getFactor(lnk);
				const isLinked = linked.links.reduce((r, olnk) => r || this.getFactor(olnk) === g, false);		// only one link links back
				if (!isLinked)
				{
					console.error('no link back:', ...ndx, ' link:', ...lnk);
					rslt = false;
				}
			});
		});
		return rslt;
	}
	tagGraph(tag)
	{
		this.addTag(tag);
		this.graphs.map(g => g.tagGraph(tag));
	}
	traceLinks(top, ndx = [])		// only used by composites
	{
		if (this.isLeaf())		// links are at the leaves of the graph
		{
			const links = this.links.slice();
			this.visited = new Set();
			const nuLinks = [];
			while(links.length > 0)
			{
				const lnk = links.pop();
				if (U.arrayEquals(ndx, lnk))
					continue;
				if (this.visited.has(lnk.toString()))
					continue;
				const g = top.getFactor(lnk);
				for (let j=0; j<g.links.length; ++j)
				{
					const glnk = g.links[j];
					if (this.visited.has(glnk.toString()))
						continue;
					if (U.arrayEquals(ndx, glnk))	// ignore links back to where we came from
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
	scanCheck(check, process, ndx = [])
	{
		if (check(this, ndx))
			process(this, ndx);
		else
			this.graphs.map((g, i) => g.scanCheck(check, process, U.pushFactor(ndx, i)));
	}
	scanLinks(top, check, process, ndx = [])
	{
		this.scanCheck(check, (g, n) =>
		{
			process(g, n);
			const links = g.links.slice();
			g.visited = new Set();
			while(links.length > 0)		// propagate along links
			{
				const lnk = links.pop();
				if (ndx.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
					continue;
				const f = top.getFactor(lnk);
				if (f.visited.has(lnk.toString()))
					continue;
				process(f, lnk);
				for (let j=0; j<f.links.length; ++j)
				{
					const glnk = f.links[j];
					if (f.visited.has(glnk.toString()))
						continue;
					const lnkFactor = top.getFactor(glnk);
					check(lnkFactor, glnk) && process(lnkFactor, glnk);
				}
				f.visited.add(lnk.toString());
			}
		}, ndx);
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
	bindGraph(data)	// data: {cod, tag, domRoot, codRoot, offset, dual}
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
			const args = U.clone(data);
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
					if (fromLnk.reduce((isEqual, ml, i) => ml === lnk[i] && isEqual, true))		// equal to a certain level
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
	_makeSVG(node, data, first = true)	// data {index, root, dom:name, cod:name, visited, elementId}		// recursive
	{
		const diagram = this.element.diagram;
		if (this.isLeaf() && this.links.length > 0)
		{
			let colorIndex = Number.MAX_VALUE;
			const srcKey = IndexMorphism.LinkColorKey(data.index, data.dom, data.cod);
			if (!('colorIndex' in this))
			{
				if (!(srcKey in diagram.link2colorIndex))
					diagram.link2colorIndex[srcKey] = diagram.colorIndex++;
				colorIndex = diagram.link2colorIndex[srcKey];
			}
			else
				colorIndex = this.colorIndex;
			while(colorIndex in diagram.colorIndex2colorIndex)	// look for new color
				colorIndex = diagram.colorIndex2colorIndex[colorIndex];
			let path = null;
			const onmouseover = e =>
			{
				Cat.D.statusbar.show(e, this.tags.sort().join(', '));
				D.deEmphasize();
			};
			for (let i=0; i<this.links.length; ++i)
			{
				const lnk = this.links[i];
				const nuLnk = data.root.getIndices(lnk);
				const visitedStr = nuLnk.toString();
				const idxStr = data.index.toString();
				if (data.visited.includes(visitedStr + ' ' + idxStr))
					continue;
				const {coords, vertical} = this.svgLinkUpdate(nuLnk, data);
				const linkId = IndexMorphism.LinkId(data, lnk);
				const lnkKey = IndexMorphism.LinkColorKey(lnk, data.dom, data.cod);
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
					color = D.graphColors[5 * colorIndex % D.graphColors.length];
					diagram.colorIndex2color[colorIndex] = color;
				}
				data.visited.push(idxStr + ' ' + visitedStr);
				data.visited.push(visitedStr + ' ' + idxStr);
				const filter = vertical ? '' : 'url(#softGlow)';
				const path = H3.path('.string', {'data-link':`${visitedStr} ${idxStr}`, id:linkId, style:`stroke:${color}A`, d:coords, filter, onmouseover});
				node.appendChild(path);
			}
		}
		let svg = this.graphs.map((g, i) =>
		{
			data.index.push(i);
			g._makeSVG(node, data, false);
			data.index.pop();
		});
	}
	makeSVG(node, id, data)
	{
		const name = this.name;
		const g = H3.g({id});
		node.appendChild(g);
		this.svg = g;
		this._makeSVG(g, data);
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
		let h = (adx - ady) / (1.0 * adx);
		const dist = cod.dist(this.xy);
		if (dist < 100)
			h = 2 * h;
		const v = normal.scale(dist * h / 3.0);
		const cp1 = v.add(this.xy).trunc();		// more stable in testing than round()
		const cp2 = v.add(cod).trunc();
		return {coords:adx < ady ? `M${this.xy.x},${this.xy.y} L${cod.x},${cod.y}` : `M${this.xy.x},${this.xy.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`,
			vertical:dx === 0};
	}
	updateGraph(data)	// data {index, graph, dom:name, cod:name, visited, elementId}
	{
		const diagram = this.element.diagram;
		if (this.isLeaf() && this.links.length > 0)
		{
			const srcKey = IndexMorphism.LinkColorKey(data.index, data.dom, data.cod);
			let colorIndex = diagram.link2colorIndex[srcKey];
			while(colorIndex in diagram.colorIndex2colorIndex)
				colorIndex = diagram.colorIndex2colorIndex[colorIndex];
			for (let i=0; i<this.links.length; ++i)
			{
				const lnk = this.links[i];
				const lnkStr = lnk.toString();	// TODO use U.a2s?
				const lnkKey = IndexMorphism.LinkColorKey(lnk, data.dom, data.cod);
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
				const linkId = IndexMorphism.LinkId(data, lnk);
				const lnkElt = document.getElementById(linkId);
				if (lnkElt)
				{
					lnkElt.setAttribute('d', coords);
					lnkElt.setAttribute('style', `stroke:${color}A`);
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
		if (this.graphs.length === 0)		// run function on leaf
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
		else
			this.graphs.map((g, i) => g.reduceLinks(ndx));
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
				if (U.arrayEquals(ndx, [-2]))	// skip
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
	showLinks(ndx = [])		// debugging tool
	{
		console.log(...ndx, '::', ...this.links);
		this.graphs.map((g, i) => g.showLinks(U.pushFactor(ndx, i)));
	}
	find(term, ndx = [])		// debugging tool
	{
		if (term in this)
			console.log(...ndx, term, this[term]);
		this.graphs.map((g, i) => g.find(term, U.pushFactor(ndx, i)));
	}
	purge()
	{
		const doit = g =>
		{
			g.visited.clear();
			g.links.length = 0;
			g.graphs.map(sg => doit(sg));
		}
		doit(this);
	}
	reverse()
	{
		if (this.graphs.length !== 2)
			throw 'bad graph';
		const graphs = [this.graphs[1], this.graphs[0]];
		const graph = new Graph(this.element, {graphs});
		const doit = g =>
		{
			g.links.map(lnk =>
			{
				if (lnk[0] === 0)
					lnk[0] = 1;
				else if (lnk[0] === 1)
					lnk[0] = 0;
			});
			g.graphs.map(sg => doit(sg));
		};
		doit(graph);
		return graph;
	}
	static sequenceGraph(element, morphismGraphs)
	{
		const graphs = morphismGraphs.map(g => g.graphs[0].element.getGraph());
		graphs.push(morphismGraphs[morphismGraphs.length -1].graphs[1].element.getGraph());
		const graph = new Graph(element, {graphs});
		morphismGraphs.map((g, i) =>					// merge the individual graphs into the sequence graph
		{
			graph.graphs[i].mergeGraphs({from:g.graphs[0], base:[0], inbound:[i], outbound:[i+1]});
			graph.graphs[i+1].mergeGraphs({from:g.graphs[1], base:[1], inbound:[i+1], outbound:[i]});
		});
		graph.check();
		return graph;
	}
	static connectSequence(element, graph, seqGraph)
	{
		seqGraph.traceLinks(seqGraph);
		const cnt = seqGraph.graphs.length -1;
		seqGraph.graphs[0].reduceLinks(cnt);
		seqGraph.graphs[cnt].reduceLinks(cnt);
		graph.graphs[0].copyGraph({src:seqGraph.graphs[0], map:[[[0], [0]], [[cnt], [1]]]});
		graph.graphs[1].copyGraph({src:seqGraph.graphs[cnt], map:[[[0], [0]], [[cnt], [1]]]});
	}
}

class CatObject extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		diagram && (!('addElement' in args) || args.addElement) && diagram.addElement(this);
		if (this.constructor.name === 'CatObject')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	getButtons()
	{
		return [D.getIcon('place-object', 'place', e => R.diagram.placeElement(this, D.mouse.diagramPosition(this.diagram)), {title:'Place object'})];
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.category && this.category.deleteElement(this);
			if (this.diagram)
			{
				this.diagram.elements.delete(this.name);
				this.diagram.elements.delete(this.basename);
			}
		}
	}
	getFactor(factor)	// With no further structure the ony factor we could possibly return is the object itself.
	{
		return this;
	}
	getGraph(data = {position:0})
	{
		const width = D ? D.textWidth(this.properName) : 0;
		const position = data.position;
		data.position += width;
		return new Graph(this, {position, width});
	}
	getFactorProperName(indices)
	{
		return this.properName;
	}
	isInitial() { return false; }
	getSize() { return Number.MAX_VALUE; }
	getHtmlRep()
	{
		const id = this.elementId();
		const items = [];
		items.push( this.properName !== '' && this.properName !== this.basename ? H3.span(this.properName, '.bold') : H3.span(this.basename, '.bold'));
		if (this.description !== '')
			items.push(H3.span(this.description, '.smallPrint.italic'));
		items.push(H3.br(), H3.span(this.name, '.tinyPrint'));
		return H3.div({id}, items);
	}
	uses(obj, start, limitors = new Set())		// True if the given object is used in the construction of this object somehow or identical to it
	{
		if (limitors.has(this))
			return true;
		return this.isEquivalent(obj);
	}
	usecount(obj, start, limitors = new Set())		// True if the given object is used in the construction of this object somehow or identical to it
	{
		if (limitors.has(this))
			return 0;
		return this.isEquivalent(obj) ? 1 : 0;
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
		const nuArgs = U.clone(args);
		if (('basename' in nuArgs && nuArgs.basename === '') || !('basename' in nuArgs))
			nuArgs.basename = 'size' in nuArgs ? '#' + Number.parseInt(nuArgs.size).toString() : diagram.getAnon('#');
		if ('size' in nuArgs && !('properName' in nuArgs))
		{
			if (nuArgs.size === 0)
				nuArgs.properName = '&empty;';
			else if (nuArgs.size === 1)
				nuArgs.properName = '1';
			else
				nuArgs.properName = FiniteObject.ProperName(diagram, nuArgs.basename, nuArgs.size);
		}
		if (!('name' in nuArgs))
			nuArgs.name = FiniteObject.Codename(diagram, {basename:nuArgs.basename, size:'size' in nuArgs ? nuArgs.size : ''});
		super(diagram, nuArgs);
		if ('size' in nuArgs && nuArgs.size !== '')
		{
			Object.defineProperty(this, 'size', {value:	Number.parseInt(nuArgs.size), writable:	false});
			Object.defineProperty(this, 'min', {value:	'min' in nuArgs ? Number.parseInt(nuArgs.min) : 0, writable:	false});
			Object.defineProperty(this, 'max', {value:	'max' in nuArgs ? Number.parseInt(nuArgs.max) : this.size, writable:	false});
		}
		this.setSignature();
		D && D.emitElementEvent(diagram, 'new', this);
	}
	setSignature()
	{
		this.signature = 'size' in this ? U.SigArray([this.size.toString(), this.min.toString(), this.max.toString()]) : super.setSignature();
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Finite object'), H3.td('size' in this ? 'size: ' + this.size.toString() : 'indeterminate size')));
	}
	json()
	{
		const d = super.json();
		if ('size' in this)
		{
			d.size = this.size;
			d.min = this.min;
			d.max = this.max;
		}
		return d;
	}
	getSize() { return 'size' in this ? this.size : super.getSize(); }
	isIterable() { return 'size' in this && this.size < Number.MAX_VALUE; }
	isTerminal() { return this.size === 1; }
	isInitial() { return this.size === 0; }
	isBare()
	{
		return false;
	}
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
				return '1';
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
		const nuArgs = U.clone(args);
		super(diagram, nuArgs);
		Object.defineProperty(this, 'objects', {value:	nuArgs.objects.map(o => this.diagram.getElement(o)), writable:	false});
		this.objects.map(o => o.incrRefcnt());
	}
	help(hdr)
	{
		super.help();
		D.toolbar.table.appendChild(hdr);
		this.objects.map(o => D.toolbar.table.appendChild(H3.tr(H3.td(o.getHtmlRow(), {colspan:2}))));
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.objects.map(o => o.decrRefcnt());
	}
	json(delBasename = true)
	{
		const a = super.json();
		a.objects = this.objects.map(o => o.refName(this.diagram));
		delete a.properName;
		if (delBasename)
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
	getGraph(tag, data, parenWidth, sepWidth, width, first = true)	// data: {position: 0}
	{
		const doit = !first && this.needsParens();
		const pw = doit ? parenWidth : 0;
		width += 2 * pw;
		const position = data.position;
		data.position += pw;
		const cap = this.objects.length - 1;
		const graphs = this.objects.map((o, i) =>
			{
				const g = o.getGraph(data, !this.needsParens());
				if (this.resetPosition())
					data.position = 0;
				else if (i < cap)
					data.position += sepWidth;
				else
					data.position = position + width;	// final position
				return g;
			});
		return new Graph(this, {position, width, graphs});
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
	updateBasename()
	{
		this.objects.map(o => o.updateBasename());
		super.updateBasename();
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
	uses(obj, start = true, limitors = new Set())
	{
		if (limitors.has(this))
			return true;
		if (!start && this.isEquivalent(obj))
			return true;
		for (let i=0; i<this.objects.length; ++i)
			if (this.objects[i].uses(obj, false, limitors))
				return true;
		return false;
	}
	usecount(obj, start = true, limitors = new Set())
	{
		if (limitors.has(this))
			return 0;
		if (!start && this.isEquivalent(obj))
			return 1;
		let cnt = 0;
		for (let i=0; i<this.objects.length; ++i)
			cnt += this.objects[i].usecount(obj, false, limitors);
		return cnt;
	}
	isBare()
	{
		return false;
	}
	static ProperName(sep, objects, reverse = false)
	{
		const obs = reverse ? objects.slice().reverse() : objects;
		return obs.map(o => Array.isArray(o) ? MultiObject.ProperName(sep, o, reverse) : o.needsParens() ? `(${o.properName})` : o.properName).join(sep);
	}
	static GetObjects(diagram, objects, category)
	{
		return objects.map(o =>
		{
			const ob = diagram.getElement(o, category);
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
		const dual = U.getArg(args, 'dual', false);
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects, args.category);
		nuArgs.basename = 'basename' in nuArgs ? nuArgs.basename : ProductObject.Basename(diagram, {objects:nuArgs.objects, dual});
		nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : ProductObject.ProperName(nuArgs.objects, dual);
		super(diagram, nuArgs);
		if (this.constructor.name === 'ProductObject')
		{
			this.setSignature();
			D && ('silent' in args ? !args.silent : true) && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = ProductObject.Signature(this.diagram, this.objects, this.dual);
	}
	json(delBasename = true)
	{
		const a = super.json(delBasename);
		delete a.description;		// TODO remove after all diagrams updated
		return a;
	}
	help()
	{
		super.help(H3.tr(H3.td('Type:'), H3.td(this.dual ? 'Coproduct' : 'Product')));
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
			return new Graph(this);
		if (D)
			return super.getGraph(this.constructor.name, data, D.parenWidth, D.textWidth(this.dual ? '&plus;' : '&times;'), D.textWidth(this.properName), first);
		else
			return super.getGraph(this.constructor.name, data, 0, 0, 0, first);
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
				fctrs.push(ndx);
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
	updateBasename()
	{
		this.basename = ProductObject.Basename(this.diagram, this);
		super.updateBasename();
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
		const base = obj.getBase();
		return base instanceof ProductObject && base.objects.reduce((r, o) => r || (o instanceof ProductObject && o.dual === obj.dual), false);
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
		const nuArgs = U.clone(args);
		nuArgs.dual = U.getArg(args, 'dual', false);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects, args.category);
		nuArgs.basename = PullbackObject.Basename(diagram, {morphisms:nuArgs.morphisms});
		nuArgs.name = PullbackObject.Codename(diagram, {morphisms:nuArgs.morphisms});
		super(diagram, nuArgs);
		this.morphisms = nuArgs.morphisms;
		if (this.morphisms.reduce((r, m) => r && m instanceof Morphism, true))
			this.postload();
		if (this.constructor.name === 'PullbackObject')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = PullbackObject.Signature(this.diagram, this.morphisms, this.dual);
	}
	postload()
	{
		this.morphisms = this.morphisms.map(m =>
		{
			const mo = this.diagram.getElement(m);
			mo.incrRefcnt();
			return mo;
		});
		this.properName = PullbackObject.ProperName(this.morphisms);
		this.setSignature();
		this.loadEquality();
		D && D.emitElementEvent(this.diagram, 'new', this);
	}
	help()
	{
		super.help(H3.tr(H3.td('Type:', H3.td('Pullback object'))));
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		this.refcnt <= 0 && this.morphisms.map(m => m.decrRefcnt());
	}
	json(delBasename = true)
	{
		const a = super.json(delBasename);
		delete a.properName;
		a.morphisms = this.morphisms.map(m => m.refName(this.diagram));
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
	loadEquality()
	{
		const base = this.dual ? [this.morphisms[0], this.diagram.cofctr(this, [0])] : [this.diagram.fctr(this, [0]), this.morphisms[0]];
		for (let i=1; i<this.morphisms.length; ++i)		// for all other legs
		{
			const factor = this.dual ? this.diagram.cofctr(this, [i]) : this.diagram.fctr(this, [i]);
			const leg = this.dual ? [this.morphisms[i], factor] : [factor, this.morphisms[i]];
			R.loadEquality(this.diagram, this, base, leg);
		}
	}
	getDecoration()
	{
		return '&#8991;';
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		return `${c}Pb{${args.morphisms.map(m => typeof m === 'string' ? m : m.refName(diagram)).join(',')}}bP${c}`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:PullbackObject.Basename(diagram, args)});
	}
	static ProperName(morphisms, dual = false)
	{
		return morphisms.filter(m => m).map(m => m.domain.needsParens() ? `(${m.domain.properName})` : m.domain.properName).join(dual ? '&plus' : '&times;') + '/' +
			(morphisms[0] ? morphisms[0].codomain.properName : 'null');
	}
	static Signature(diagram, morphisms, dual = false)
	{
		return U.SigArray([dual, ...morphisms.map(m => typeof m === 'string' ? (m.includes('/') ? m : `${diagram.name}/${m}`) : m.name)]);
	}
}

class HomObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = HomObject.Basename(diagram, {objects:nuArgs.objects});
		nuArgs.properName = HomObject.ProperName(nuArgs.objects);
		nuArgs.description = `The homset from ${nuArgs.objects[0].properName} to ${nuArgs.objects[1].properName}`;
		super(diagram, nuArgs);
		if (this.constructor.name === 'HomObject')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = HomObject.Signature(this.diagram, this.objects);
	}
	help()
	{
		super.help(H3.tr(H3.td('Type'), H3.td('Hom')));
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
		if (D)
		{
			data.position += D.bracketWidth;
			const g = super.getGraph(this.constructor.name, data, 0, D.commaWidth, D.textWidth(this.properName), false);
			data.position -= D.bracketWidth;
			return g;
		}
		else
			return super.getGraph(this.constructor.name, data, 0, 0, 0, false);
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
	updateBasename()
	{
		this.basename = HomObject.Basename(this.diagram, this);
		super.updateBasename();
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

class IndexText extends Element
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.basename = U.getArg(nuArgs, 'basename', diagram.getAnon('t'));
		nuArgs.category = diagram.domain;
		super(diagram, nuArgs);
		const attributes = new Map('attributes' in nuArgs ? nuArgs.attributes : []);
		const xy = U.getArg(nuArgs, 'xy', new D2());
		Object.defineProperties(this,
		{
			attributes:		{value: attributes,											writable:	false},
			svg:			{value:	null,												writable:	true},
			x:				{value:	xy.x,												writable:	true},
			y:				{value:	xy.y,												writable:	true},
			height:			{value:	Number.parseInt(U.getArg(nuArgs, 'height', D ? D.default.font.height : 0)),	writable:	true},
			weight:			{value:	U.getArg(nuArgs, 'weight', 'normal'),				writable:	true},
			textAnchor:		{value: U.getArg(nuArgs, 'textAnchor', 'start'),			writable:	true},
		});
		this.refcnt = 1;		// keep the text
		if (this.constructor.name === 'IndexText')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		const canEdit = this.isEditable() && this.diagram.isEditable();
		const id = this.elementId();
		const div = H3.div({id}, H3.tag('description', this.description, '##descriptionElt.tty'));
		if (canEdit)
		{
			div.appendChild(D.getIcon('EditElementText', 'edit', e => Cat.R.diagram.editElementText(e, this, id, 'description'), {title:'Commit editing', scale:D.default.button.tiny}));
			const selectAnchor = H3.select({onchange:e => this.updateAnchor(e.target.value), value:this.weight},
				['start', 'middle', 'end'].map(w =>
				{
					const args = {value:w};
					if (w === this.textAnchor)
						args.selected = 'selected';
					return H3.option(args, w);
				}));
			const selectWeight = H3.select({onchange:e => this.updateWeight(e.target.value), value:this.weight},
				['normal', 'bold', 'lighter', 'bolder'].map(w =>
				{
					const args = {value:w};
					if (w === this.weight)
						args.selected = 'selected';
					return H3.option(args, w);
				}));
			const inId = 'toolbar-help-text-height';
			const inputArgs = {type:"number", onchange:e => this.updateHeight(e.target.value), min:3, style:'width: 8ch', value:this.height};
			div.appendChild(H3.table(
				H3.tr(H3.td('Anchor:'), H3.td(selectAnchor)),
				H3.tr(H3.td('Height:'), H3.td(H3.input(`##${inId}.in100`, inputArgs))),
				H3.tr(H3.td('Weight:'), H3.td(selectWeight))));
		}
		D.toolbar.table.appendChild(H3.tr(H3.td(div, {colspan:2})));
	}
	editText(e, attribute, value)	// only valid for attr == 'description'
	{
		const old = this.description;
		this.description = value;
		D.removeChildren(this.svg);
		this.tspan();
		return old;
	}
	lineDeltaY()
	{
		return `${D.default.lineDeltaY}em`;
	}
	ssStyle(cls = '')
	{
		const height = cls === '' ? this.height : 30;		// special text editor mode for objects and morphisms
		return `font-size:${height}px; font-weight:${this.weight}`;
	}
	setSvgText()
	{
		this.svgText = H3.text(this.isEditable ? '.grabbable' : null, {'text-anchor':this.textAnchor, style:this.ssStyle(), 'data-name':this.name});
		this.svgText.ondblclick = e => this.isEditable() && this.textEditor();		// defer editable check
		this.svg.appendChild(this.svgText);
	}
	tspan()
	{
		const args =
		{
			onmousedown:e => this.diagram.userSelectElement(e, this.name),
			onmouseenter:e => this.mouseenter(e),
			onmouseout:e => this.mouseout(e)
		};
		this.setSvgText();
		const div = H3.div();
		const wrapTspan = (t, i, x) =>
		{
			return H3.tspan(t === '' ? '&ZeroWidthSpace;' : t, {'text-anchor':"left", x, dy:i > 0 ? this.lineDeltaY() : ''}, args);
		};
		let tspan = null;
		let x = 0;
		const placeText = (tx, i) =>
		{
			tspan = wrapTspan(tx, i, x);
			this.svgText.appendChild(tspan);
			x += tspan.getBBox().width;
		};
		const procText = (txt, i) =>
		{
			x = 0;
			let line = i;
			if (txt === '')
				this.svgText.appendChild(wrapTspan(txt, line, x));		// blank line
			else
			{
				let tx = txt.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ /g, '&nbsp;');		// replace tabs
				while(tx.length > 0)
				{
					const matches = tx.match(/<(?<tag>.*)(\s*.*)>(.*)<\/\k<tag>>/);
					if (matches && matches.length > 0)
					{
						if (matches.index > 0)
						{
							placeText(tx.substring(0, matches.index), line);
							line = 0;		// stay on this line
						}
						if (matches[1] === 'icon')
						{
							const height = this.height;
							const oldOffset = - 0.8 * height;
							const offset = -0.8 * height + D.default.lineDeltaY * i * height;
							const use = H3.use({href:`#icon-${matches[3]}`, width:this.height, height:this.height, x, y:offset});
							use.onmousedown = e => Cat.R.diagram.userSelectElement(e, this);
							this.svg.appendChild(use);
							x += height;
							tx = tx.substring(matches.index + matches[0].length);
						}
						else if (matches[1] === 'diagram')
						{
							placeText(matches[3], line);
							const nameResults = matches[2].match(/\s*name="(.+?)"/);
							const selectResults = matches[2].match(/\s*select="(.+?)"/);
							const actionResults = matches[2].match(/\s*action="(.+?)"/);
							if (nameResults)
							{
								const name = U.HtmlSafe(nameResults[1]);
								if (selectResults && actionResults)
									tspan.onmousedown = _ => Runtime.SelectDiagram(name, null, diagram =>
									{
										const doit = _ =>
										{
											if (diagram.ready === 0 && R.isReady())
											{
												diagram.makeSelected(...selectResults[1].split(','));
												D.doAction(diagram, actionResults[1]);
											}
											else
												setTimeout(doit, 0);	// try again
										};
										doit();
									});
								else if (selectResults)
									tspan.onmousedown = _ => Runtime.SelectDiagram(name, null, diagram => diagram.makeSelected(...selectResults[1].split(',')));
								else
									tspan.onmousedown = _ => Runtime.SelectDiagram(name);
								tspan.onmouseenter = e => D.statusbar.show(e, `Go to ${name}`);
								tspan.classList.add('link');
							}
							tx = tx.substring(matches.index + matches[0].length);
							line = 0;
						}
						else		// not our tag
						{
							placeText(tx.substring(matches.index), line);
							line = 0;
							break;
						}
					}
					else
					{
						placeText(tx, line);
						break;
					}
				}
			}
		};
		this.description.split('\n').map((t, i) => procText(t, i));
	}
	makeSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in makeSVG`;
		const name = this.name;
		const svg = H3.g('.indexText', {'data-type':'text', 'data-name':name, 'text-anchor':'start', id:this.elementId(),
			transform:`translate(${this.x} ${this.y})`});
		node.appendChild(svg);
		this.svg = svg;
		this.tspan();
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
		this.x = D.grid(xy.x, majorGrid);
		this.y = D.grid(xy.y, majorGrid);
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
		if (this.textAnchor !== 'start')
			a.textAnchor = this.textAnchor;
		if (this.attributes.size > 0)
			a.attributes = U.jsonMap(this.attributes);
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
			this.svg.setAttribute('transform', `translate(${this.x} ${this.y})`);
			this.svgText.style.fontSize = `${this.height}px`;
			this.svgText.style.fontWeight = this.weight;
			this.svgText.style.textAnchor = this.textAnchor;
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
		super.emphasis(on);
		this.svg.querySelectorAll('circle, path, text, polyline, rect, use').forEach(elt => D.setClass('emphasis', on, elt));
	}
	getHtmlRep()
	{
		const id = this.elementId();
		const div = H3.div(H3.tag('description', this.description), {id});
		if (this.diagram === R.diagram)
		{
			div.onmouseenter = _ => this.emphasis(true);
			div.onmouseleave = _ => this.emphasis(false);
		}
		return div;
	}
	focusout(e)
	{
		const text = e.target.innerText;
		if (text !== this.description)
			R.diagram.commitElementText(e, this.name, e.target, 'description');
		this.foreign.parentNode && this.foreign.remove();		// do not do this earlier or the textbox gets corrupted
		D.closeActiveTextEdit();
		this.svgText.classList.remove('hidden');
		delete this.foreign;
	};
	textEditor(cls = '')
	{
		D.toolbar.hide();
		D.closeActiveTextEdit();
		const bbox = this.svgText.getBBox();
		this.svgText.classList.add('hidden');
		const div = H3.div('##foreign-text.text-editor', this.description,
		{
			style:`${this.ssStyle(cls)}; line-height:${this.lineDeltaY()}; white-space:pre-wrap; word-wrap:break-word; width:fit-content;`,
			contentEditable:true,
		});
		cls !== '' && div.classList.add(cls);
		const mod = 8;
		this.foreign = H3.foreignObject(div, {width:mod + bbox.width + 'px', height:mod + bbox.height + 'px', y:`-${this.height}px`});
		const onkeydown = e =>
		{
			this.foreign.style.width = (D.default.icon + div.offsetWidth) + 'px';
			this.foreign.style.height = div.offsetHeight + 'px';
			if (e.key === 'Escape')
			{
				D.closeActiveTextEdit();
				this.description !== '' && this.diagram.makeSelected(this);
			}
			e.stopPropagation();
		};
		this.svgText.parentNode.appendChild(this.foreign);
		div.focus();
		div.addEventListener('focusout', e => this.focusout(e));
		this.foreign.addEventListener('keydown', onkeydown);
		this.foreign.addEventListener('keyup', onkeydown);
		this.foreign.addEventListener('mousedown', e => e.stopPropagation());
		this.foreign.addEventListener('mouseup', e => e.stopPropagation());
		D.editElement = div;
	}
	wipeSvg()
	{
		this.svg.remove();
		this.svg = null;
	}
	updateHeight(height)
	{
		this.height = height;
		this.wipeSvg();
		D.emitTextEvent(R.diagram, 'update', this);
	}
	updateAnchor(anchor)
	{
		this.textAnchor = anchor;
		this.wipeSvg();
		D.emitTextEvent(R.diagram, 'update', this);
	}
	updateWeight(weight)
	{
		this.weight = weight;
		this.wipeSvg();
		D.emitTextEvent(R.diagram, 'update', this);
	}
	hasMoved()
	{
		return 'orig' in this && (this.orig.x !== this.x || this.orig.y !== this.y);
	}
}

class IndexCode extends IndexText		// description holds the code
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.ext = args.ext;
		this.element = diagram.getElement(args.element);
		if (this.constructor.name === 'IndexCode')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	json()
	{
		const a = super.json();
		a.ext = this.ext;
		a.element = this.element.refName(this.diagram);
		return a;
	}
	mouseenter(e)
	{
		super.mouseenter(e);
		this.diagram.emphasis(this.diagram.getElement(this.element), true);
	}
	mouseout(e)
	{
		super.mouseout(e);
		this.diagram.emphasis(this.diagram.getElement(this.element), false);
	}
	makeSVG(node)
	{
		super.makeSVG(node);
		this.svg.querySelectorAll('tspan').forEach(tsp => tsp.classList.add('code'));
	}
	focusout(e)
	{
		super.focusout(e);
		this.element.code[this.ext] = this.description;
	}
}

class Definition extends IndexText
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.basename = U.getArg(nuArgs, 'basename', diagram.getAnon('d'));
		super(diagram, nuArgs);
		const sequence = diagram.getElements(nuArgs.sequence);
		if (sequence.filter(elt => !(elt instanceof CatObject) && !(elt instanceof Morphism)).length > 0)
			throw 'bad sequence';
		const action = new UserAction(R.$CAT.getElement('actions'), {definition:this, basename:`${diagram.user}/${nuArgs.defname}`, sequence});
		action.incrRefcnt();
		Object.defineProperties(this,
		{
			action:		{value: action,			writable: false},
			defname:	{value: nuArgs.defname,	writable: false},
			sequence:	{value: sequence,		writable: false},
			blobs:		{value: args.blobs,		writable: true},
			generators:	{value: null,			writable: true},
		});
		if (this.constructor.name === 'Definition')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	postload()
	{
		this.blobs = this.blobs.map(b => b instanceof IndexBlob ? b : new IndexBlob(this.diagram.domain.elements.get(b)));
		this.blobs.map(b => b.forEachElement(elt => elt.incrRefcnt()));
		this.generators = this.getGenMorphisms();
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.action.decrRefcnt();
			this.blobs.map(b => b.forEachElement(elt => elt.decrRefcnt()));
		}
		super.decrRefcnt();
	}
	help()
	{
		super.help()
		D.toolbar.body.appendChild(H3.h3('Definition'));
		D.toolbar.body.appendChild(H3.p(this.defname));
		Definition.show(this.diagram, this.sequence, this.blobs);
	}
	json()
	{
		const a = super.json();
		a.defname = this.defname;
		a.sequence = this.sequence.map(elt => elt.refName(this.diagram));
		a.blobs = this.blobs.map(b => b.seed.name);
		return a;
	}
	getHtmlRep()
	{
		const id = this.elementId();
		const div = H3.div(H3.tag('description', this.defname), {id});
		if (this.diagram === R.diagram)
		{
			div.onmouseenter = e => this.mouseenter(e);
			div.onmouseout = e => this.mouseout(e);
		}
		return div;
	}
	mouseenter(e)
	{
		super.mouseenter(e);
		this.blobs.map(b => b.forEachElement(elt => elt.emphasis(true)));
	}
	mouseout(e)
	{
		super.mouseout(e);
		this.blobs.map(b => b.forEachElement(elt => elt.emphasis(false)));
	}
	makeSVG(node)
	{
		super.makeSVG(node);
		this.svg.querySelectorAll('text').forEach(tsp => tsp.classList.add('definition'));
	}
	getCells()
	{
		const cells = [];
		this.blobs.map(blob => blob.cells.forEach(cell => cell.commutes !== 'pullback' && cell.assertion && cells.push(cell)));
		return cells;
	}
	getSequenceElements()
	{
		const elements = new Set();
		this.sequence.map(elt =>
		{
			if (elt instanceof Morphism)
			{
				elements.add(elt.domain);
				elements.add(elt.codomain);
			}
			elements.add(elt);
		});
		return elements;
	}
	instantiate(diagram, targetCat, inputs, xy)
	{
		if (inputs.filter(inp => inp === '').length > 0)
			return false;
		const elements = [...this.getSequenceElements()];
		if (inputs.length !== elements.length)
			return false;
		const elementMap = new Map();
		elements.map((elt, i) =>
		{
			const input = inputs[i];
			let nuElt = null;
			if (elt instanceof CatObject)
				nuElt = diagram.get('CatObject', {basename:input, category:targetCat});
			else
				nuElt = diagram.get('Morphism', {basename:input, category:targetCat, domain:elementMap.get(elt.domain), codomain:elementMap.get(elt.codomain)});
			elementMap.set(elt, nuElt);
		});
		const sequence = this.sequence.map(elt => elementMap.get(elt));
		const defi = new DefinitionInstance(diagram, {targetCat, sequence, elementMap, definition:this, xy, description:`Instantiation of ${this.defname}`});
		defi.postload();
		diagram.makeSelected(defi);
	}
	getQuantifiersToCells()		// TODO?
	{
		const uni2cells = new Map();
		this.blobs.map(blob => blob.cells.forEach(cell =>
		{
			const procMorph = m =>
			{
				const to = m.to;
				!uni2cells.has(to) && uni2cells.set(to, new Set());
				const mCells = uni2cells.get(to);
				const q = m.getQuantifier();
				q && q === 'forall' && mCells.add(cell);
			};
			cell.left.map(procMorph);
			cell.right.map(procMorph);
		}));
		return uni2cells;
	}
	checkUsage(m)
	{
		for (let i=0; i<this.sequence.length; ++i)
		{
			if (m.uses(this.sequence[i]))
				return true;
		}
		return false;
	}
	getGenMorphisms()		// morphisms that can be generated from the definition
	{
		const scanned = new Set();
		const genMorphisms = new Set();
		const ingestMorphism = m =>
		{
			if (scanned.has(m))
				return;
			scanned.add(m);
			if (m.isBare() && !this.sequence.includes(m))
				return;
			else if (m instanceof NamedMorphism)
				this.checkUsage(m.base) && genMorphisms.add(m);
			else if (m instanceof MultiMorphism)
				m.morphisms.map(sm => ingestMorphism(sm));
			else if ('recursor' in m)
			{
				this.checkUsage(m) && genMorphisms.add(m);
				ingestMorphism(m.recursor);
			}
		}
		this.blobs.forEach(blob => blob.morphisms.forEach(m => ingestMorphism(m.to)));
		return genMorphisms;
	}
	hasAssertions()
	{
		return this.blobs.filter(blob => blob.hasAssertion()).length > 0;
	}
	static getIndexElement(blobs, element)
	{
		for (let i=0; i<blobs.length; ++i)
		{
			const ndx = blobs[i].getIndexElement(element);
			if (ndx)
				return ndx;
		}
		return null;
	}
	static getIndexMap(sequence, blobs)
	{
		const ndxMap = new Map();
		sequence.map(elt => ndxMap.set(elt, Definition.getIndexElement(blobs, elt)));
		return ndxMap;
	}
	static showBlobItem(blob, item)
	{
		const isIndex = U.isIndexItem(item);
		let oldQuant = isIndex ? item.getQuantifier() : null;
		let foundIt = false;
		blob && blob.morphisms.forEach(m =>
		{
			if (m !== item && m.to.isEquivalent(item.to) && m.attributes.has('quantifier'))
			{
				foundIt = true;
				oldQuant = m.getQuantifier();
			}
		});
		const row = item.getHtmlRow();
		const div = row.querySelector('div');
		if (oldQuant)
			div.prepend(H3.span('.quantifier', R.Actions.definition.symbols[oldQuant]));
		const tools = row.querySelector('.toolbar-element');
		if (isIndex)		// add quantifier gui
		{
			const id = item.elementId('quant');
			R.Actions.definition.quantifiers.map(q => tools.appendChild(D.getIcon(`quantifier-${q}`, `quantifier-${q}`, e => R.Actions.definition.action(e, item.diagram, item, q), {title:'Set quantifier', id:`${id}-quantifier-${q}`})));
			D.setActiveIcon(row.querySelector(`#${id}-quantifier-${oldQuant}`), true);
		}
		else if (item instanceof Cell)
		{
			const tools = row.querySelector('#' + item.cellId()).querySelector('.toolbar-element');
			if (item.canDecreaseLevel(blob))
				tools.appendChild(D.getIcon('level-down', 'level-down', e => R.Actions.definition.setLevel(e, item.diagram, item, -1), {title:'Lower expression level'}));
			if (item.canIncreaseLevel(blob))
				tools.appendChild(D.getIcon('level-up', 'level-up', e => R.Actions.definition.setLevel(e, item.diagram, item, 1), {title:'Raise expression level'}));
		}
		D.toolbar.table.appendChild(row);
	}
	static showSetup(diagram, setup, blobs)
	{
		const quants = R.Actions.definition.quantifiers.slice(1);
		const ndxMap = Definition.getIndexMap(setup, blobs);
		setup.map(elt =>
		{
			const row = elt.getHtmlRow();
			const tools = row.querySelector('.toolbar-element');
			const ndx = ndxMap.get(elt);
			if (ndx)
			{
				const id = ndx.elementId('quant');
				quants.map(q => tools.appendChild(D.getIcon(`quantifier-${q}`, `quantifier-${q}`, e => R.Actions.definition.action(e, diagram, ndx, q), {title:'Set quantifier', id:`${id}-quantifier-${q}`})));
			}
			D.toolbar.table.appendChild(row);
		});
	}
	static showBlob(blob, setup)
	{
		const objects = new Set();
		const morphisms = new Set();
		const cells = new Set();
		const genMorphisms = new Set();
		blob.objects.forEach(o => o.to.isBare() && o.getLevel() > 0 && objects.add(o.to));
		const checkUsage = m =>
		{
			for (let i=0; i<setup.length; ++i)
			{
				if (m.uses(setup[i]))
					return true;
			}
			return false;
		}
		const scanned = new Set();
		const ingestMorphism = m =>
		{
			if (scanned.has(m))
				return;
			scanned.add(m);
			if (m.isBare() && !setup.includes(m))
				morphisms.add(m);
			else if (m instanceof MultiMorphism)
				m.morphisms.map(sm => ingestMorphism(sm));
			else if ('recursor' in m)
			{
				checkUsage(m) && genMorphisms.add(m);
				ingestMorphism(m.recursor);
			}
		}
		blob.morphisms.forEach(m => ingestMorphism(m.to));
		blob.cells.forEach(cell => cell.commutes !== 'pullback' && cell.assertion && cells.add(cell));
		let didit = false;
		const doit = elt =>
		{
			Definition.showBlobItem(blob, elt);
			didit = true;
		};
		blob.objects.forEach(o =>
		{
			if (objects.has(o.to))
			{
				doit(o);
				objects.delete(o.to);
			}
		});
		const morphismsAry = [...morphisms];
		blob.morphisms.forEach(m =>
		{
			if (morphisms.has(m.to))
			{
				doit(m);
				morphisms.delete(m.to);
			}
		});
		morphisms.forEach(doit);
		[...cells].sort((a, b) => a.getLevel() < b.getLevel() ? -1 : b.getLevel() > a.getLevel() ? 1 : 0).map(doit);
		didit && D.toolbar.table.appendChild(H3.tr(H3.td(H3.hr())));
		return genMorphisms;
	}
	static show(diagram, setup, blobs)
	{
		Definition.showSetup(diagram, setup, blobs);
		D.toolbar.table.appendChild(H3.tr(H3.td(H3.hr())));
		const genMorphisms = new Set();
		blobs.map(blob => Definition.showBlob(blob, setup).forEach(m => genMorphisms.add(m)));
		if (genMorphisms.size > 0)
		{
			D.toolbar.table.appendChild(H3.tr(H3.td('.center', H3.small('.bold', 'Morphisms that can be generated from the definition:'))));
			genMorphisms.forEach(m => D.toolbar.table.appendChild(m.getHtmlRow()));
		}
		return genMorphisms;
	}
}

class DefinitionInstance extends IndexText		// instantiate a definition in a diagram
{
	constructor(diagram, args)
	{
		super(diagram, args);
		const targetCat = diagram.getCategory(args.targetCat);
		const sequence = diagram.getElements(args.sequence);
		sequence.map(elt => elt.incrRefcnt());
		const definition = diagram.getElement(args.definition);
		Object.defineProperties(this,
		{
			targetCat:		{value: targetCat,					writable: false},
			definition:		{value: definition ? definition : args.definition,			writable: true},
			elementMap:		{value: args.elementMap,			writable: true},
			sequence:		{value: sequence,					writable: false},		// TODO sequence could be derived from elementMap
			listener:		{value: null,						writable: true},		// event listener for more loadEquality
		});
		this.postload = this._postload;		// defer the postload
		if (this.constructor.name === 'DefinitionInstance')		// sig should be stable
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	_postload()
	{
		this.definition = this.diagram.getElement(this.definition);
		this.definition.incrRefcnt();
		if (Array.isArray(this.elementMap))		// convert to Map
		{
			const elementMap = new Map();
			this.elementMap.map(data => elementMap.set(this.definition.diagram.getElement(data[0]), this.diagram.getElement(data[1])));
			this.elementMap = elementMap;
		}
		this.loadEquality();
		this.listener = e =>
		{
			const args = e.detail;
			const element = args.element;
			if (element instanceof Morphism && element.category === this.category && element.diagram === this.diagram && args.command === 'new')
				this.loadEquality();
		};
		D && window.addEventListener('Morphism', this.listener);
		delete this.postload;
	}
	loadEquality()
	{
		const quant2cells = this.definition.getQuantifiersToCells();
		const eltMap = new Map();
		this.definition.sequence.map((src, i) => eltMap.set(src, this.sequence[i]));
		quant2cells.forEach((cells, q) =>
		{
			const domain = this.elementMap.get(q.domain);
			const codomain = this.elementMap.get(q.codomain);
			const candidates = [];
			this.diagram.forEachMorphism(m =>
			{
				(m.domain === domain || m.codomain === codomain) && candidates.push(m);
			});
			cells.forEach(cell => candidates.map(m =>
			{
				const procMorph = morph =>
				{
					if (this.elementMap.has(morph))
						return this.elementMap.get(morph);
					return m;
				};
				const left = cell.left.map(elt => this.elementMap.get(elt.to) || m);
				const right = cell.right.map(elt => this.elementMap.get(elt.to) || m);
				R.loadEquality(this.diagram, this, left, right);
			}));
		});
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.definition.decrRefcnt();
			this.sequence.map(elt => elt.decrRefcnt());
			D && window.removeEventListener('Morphism', this.listener);
		}
		super.decrRefcnt();
	}
	json()
	{
		const a = super.json();
		a.targetCat = this.targetCat.name;
		a.definition = this.definition.name;
		a.sequence = this.sequence.map(elt => elt.name);
		const elementMap = [];
		this.elementMap.forEach((v, k) => elementMap.push([k.name, v.name]));
		a.elementMap = elementMap;
		return a;
	}
	makeSVG(node)
	{
		super.makeSVG(node);
		this.svg.querySelectorAll('text').forEach(tsp => tsp.classList.add('definitionInstance'));
	}
	getSequenceElements()
	{
		const elements = new Set();
		this.sequence.map(elt =>
		{
			if (elt instanceof Morphism)
			{
				elements.add(elt.domain);
				elements.add(elt.codomain);
			}
			elements.add(elt);
		});
		return elements;
	}
	help()
	{
		super.help()
		D.toolbar.body.appendChild(H3.h3('Definition Instance'));
		D.toolbar.body.appendChild(H3.p(`Basename: ${this.basename}`));
		D.toolbar.body.appendChild(H3.p(`Target category: ${this.targetCat.properName}`));
		const defElements = [...this.definition.getSequenceElements()];
		const elements = [...this.getSequenceElements()];
		const xy = D.toolbar.mouseCoords;	// use original location
		const rows = [...elements].map((elt, i) =>
		{
			const rep = elt.getHtmlRep();
			rep.appendChild(D.getIcon('place', 'place', e => R.diagram.placeElement(elt, xy), {title:'Place sequence element'}));
			return H3.tr(H3.td('.element', defElements[i].getHtmlRep()), H3.td('.element', rep));
		});
		rows.map(row => D.toolbar.table.appendChild(row));
	}
}

class Theorem extends IndexText
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.basename = U.getArg(nuArgs, 'basename', diagram.getAnon('th'));
		super(diagram, nuArgs);
		const sequence = diagram.getElements(nuArgs.sequence);
		if (sequence.filter(elt => !(elt instanceof CatObject) && !(elt instanceof Morphism)).length > 0)
			throw 'bad sequence';
		sequence.map(elt => elt.incrRefcnt());
		const source = diagram.getElement(nuArgs.source);
		source.incrRefcnt();
		const target = diagram.getElement(nuArgs.target);
		target.incrRefcnt();
		Object.defineProperties(this,
		{
			source:		{value: source,			writable: false},		// definition instance
			target:		{value: target,			writable: false},		// definition
			sequence:	{value: sequence,		writable: false},
			blobs:		{value: args.blobs,		writable: true},
			cells:		{value: [],				writable: false},
		});
		this._postload();
		if (this.constructor.name === 'Theorem')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	_postload()
	{
		this.blobs = this.blobs.map(b => b instanceof IndexBlob ? b : new IndexBlob(this.diagram.domain.elements.get(b)));
		this.blobs.map(blob => blob.cells.forEach(cell => this.cells.push(cell)));
		this.cells.map(cell => cell.forEachElement(elt => elt.incrRefcnt()));
		this.morphism = new Morphism(R.actionDiagram, {basename:this.basename, domain:this.source.definition.action, codomain:this.target.action, description:this.description});
		this.morphism.proof = this;
		this.morphism.incrRefcnt();
		if (D)
		{
			this.listener = e =>
			{
				const args = e.detail;
				const diagram = args.diagram;
				const cell = args.cell;
				if (args.command === 'commutivity' && diagram === this.diagram)
				{
					this.cells.reduce((r, c) => r || cell.name === c.name, false) && this.update();
				}
			};
			window.addEventListener('Cell', this.listener);
		}
	}
	isValid()
	{
		return this.cells.reduce((r, cell) => r && cell.isEqual(), true);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.source.decrRefcnt();
			this.target.decrRefcnt();
			this.sequence.map(elt => elt.decrRefcnt());
			this.cells.map(cell => cell.forEachElement(elt => elt.decrRefcnt()));
			delete this.morphism.proof;
			this.morphism.decrRefcnt();
			window.removeEventListener('Cell', this.listener);
		}
		super.decrRefcnt();
	}
	help()
	{
		super.help()
		D.toolbar.body.appendChild(H3.h3('Theorem'));
		D.toolbar.body.appendChild(H3.p(`Source ${this.source.defname}`));
		D.toolbar.body.appendChild(H3.p(`Target ${this.target.defname}`));
		this.cells.map(cell => D.toolbar.table.appendChild(H3.tr(H3.td(cell.getHtmlRep()), H3.td(cell.commutes === 'computed' ? '⟲' : '?'))));
	}
	json()
	{
		const a = super.json();
		a.source = this.source.name;
		a.target = this.target.name;
		a.sequence = this.sequence.map(elt => elt.refName(this.diagram));
		a.blobs = this.blobs.map(b => b.seed.name);
		return a;
	}
	mouseenter(e)
	{
		super.mouseenter(e);
		this.cells.map(cell => cell.forEachElement(elt => elt.emphasis(true)));
	}
	mouseout(e)
	{
		super.mouseout(e);
		this.cells.map(cell => cell.forEachElement(elt => elt.emphasis(false)));
	}
	update(xy = null, majorGrid = false)
	{
		super.update(xy, majorGrid);
		const valid = this.isValid();
		this.svg && this.svg.querySelectorAll('text').forEach(tsp => tsp.classList[valid ? 'remove' : 'add']('badGlow'));
	}
	makeSVG(node)
	{
		super.makeSVG(node);
		this.svg.querySelectorAll('text').forEach(tsp => tsp.classList.add('theorem'));
		this.update();
	}
}

class TensorObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = TensorObject.Basename(diagram, {objects:nuArgs.objects});
		nuArgs.properName = TensorObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		D && D.emitElementEvent(diagram, 'new', this);
	}
	help()
	{
		super.help(H3.tr(H3.td('Type:'), H3.td('Tensor')));
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.parenWidth, D.textWidth('&otimes;'), D.textWidth(this.properName), first);
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

class IndexObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.basename = U.getArg(args, 'basename', diagram.getAnon('o'));
		nuArgs.category = diagram.domain;
		if ('to' in args)
		{
			let to = args.to instanceof CatObject ? args.to : diagram.getElement(args.to);
			if (!to && args.to === diagram.codomain.name)
				to = diagram.codomain;
			if (!to)
				throw `no to! ${args.to}`;
			nuArgs.to = to;
		}
		super(diagram, nuArgs);
		this.incrRefcnt();
		const attributes = new Map('attributes' in nuArgs ? nuArgs.attributes : []);
		const xy = U.getArg(nuArgs, 'xy', new D2());
		Object.defineProperties(this,
		{
			attributes:	{value: attributes,	writable: false},
			x:			{value:	xy.x,				writable:	true},
			y:			{value:	xy.y,				writable:	true},
			orig:		{value:	{x:xy.x, y:xy.y},	writable:	true},
			to:			{value:	null,				writable:	true},
			cells:		{value:	new Set(),			writable:	false},
			domains:	{value:	new Set(),			writable:	false},
			codomains:	{value:	new Set(),			writable:	false},
			svg:		{value: null,				writable:	true},
		});
		this.setObject(nuArgs.to);
		if (this.constructor.name === 'IndexObject')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		D.toolbar.table.appendChild(H3.tr(H3.td('Index:', '.italic.small'), H3.td(this.basename, D.getIcon('copyTo', 'copyTo', e => D.copyTo(e, this.basename), {title:'Copy to paste buffer'}), '.italic.small')));
		this.to.help();
	}
	json()
	{
		let a = super.json();
		a.to = this.diagram.elements.has(this.to.basename) ? this.to.basename : this.to.name;
		if (this.attributes.size > 0)
			a.attributes = U.jsonMap(this.attributes);
		a.xy = this.getXY();
		if (a.description === '')
			delete a.description;
		return a;
	}
	setObject(to)
	{
		if (to === this.to)
			return;
		if (this.to && this.to !== to)
			this.to.decrRefcnt();
		to && to.incrRefcnt();
		this.to = to;
	}
	width()
	{
		return D ? D.textWidth(this.to.properName) : 0;
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
		this.x = D.grid(xy.x, majorGrid);
		this.y = D.grid(xy.y, majorGrid);
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
	_getMouseFactor(e)
	{
		this.svg.querySelectorAll('rect').forEach(rect => rect.remove());
		const graph = this.to.getGraph();
		const correction = this.to instanceof PullbackObject ? (D.textWidth(this.to.properName) - graph.width)/2 : 0;
		const xy = this.diagram.userToDiagramCoords({x:e.clientX, y:e.clientY}).subtract(this.getXY()).add({x:correction + graph.width/2, y:0});
		let pos = 0;
		let factor = -1;
		let g = null;
		if (!(this.to instanceof HomObject))
			for (let i=0; i<graph.graphs.length; ++i)
			{
				g = graph.graphs[i];
				if (xy.x >= g.position && xy.x <= g.position + g.width)
				{
					factor = i;
					break;
				}
			}
		return {factor, graph, correction};
	}
	mousemove(e)
	{
		const args = {x:0, y:-D.default.font.height/2, width:0, height:1.25 * D.default.font.height};
		if ('objects' in this.to)
		{
			const result = this._getMouseFactor(e);
			if (result.factor >= 0)
			{
				const g = result.graph.graphs[result.factor];
				args.x = g.position - result.correction - result.graph.width/2;
				args.width += g.width;
			}
			else
			{
				args.width = D.textWidth(this.to.properName);
				args.x = - args.width/2;
			}
		}
		else
		{
			const width = D.textWidth(this.to.properName);
			args.x = - width/2;
			args.width = width;
		}
		const emphRect = this.svg.querySelector('rect.emphasis');
		!emphRect && this.svg.appendChild(H3.rect('.emphasis', args));
	}
	placeProjection(e)		// or injection
	{
		if (this.to instanceof ProductObject)
		{
			const result = this._getMouseFactor(e);
			if (result.factor > -1)
			{
				const morphism = this.to.dual ? R.diagram.cofctr(this.to, [result.factor]) : R.diagram.fctr(this.to, [result.factor]);
				this.diagram.placeMorphismByObject(e, this.to.dual ? 'codomain' : 'domain', this, morphism);
				return;
			}
		}
		this.diagram.placeMorphismByObject(e, e.shiftKey ? 'codomain' : 'domain', this, this.diagram.id(this.to));
	}
	makeSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in makeSVG`;
		const name = this.name;
		const txt = H3.text(this.to.properName, {'text-anchor':'middle', y:D.default.font.height/2, 'data-name':this.name});
		const svg = H3.g(txt, '.grabbable.object', {draggable:true, transform:`translate(${this.x}, ${this.y})`, 'data-type':'object', 'data-name':this.name, 'data-sig':this.to.signature, id:this.elementId()});
		txt.onmouseenter = e => this.mouseenter(e);
		txt.onmouseout = e => this.mouseout(e);
		txt.onmousedown = e => D.default.fullscreen && R.diagram && R.diagram.userSelectElement(e, name);
		txt.onmousemove = e => this.mousemove(e);
		txt.ondblclick = e => this.isEditable() && this.placeProjection(e);		// defer test for editablity to due authentication loading is async
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
		this.cells.forEach(n => n.update());
		this.domains.forEach(m => m.update());
		this.codomains.forEach(m => m.update());
		if (this.svg)
		{
			const txt = this.svg.querySelector('text');
			const quant = this.getQuantifier();
			let properName = this.to.properName;
			if (quant)
			{
				const level = this.getLevel();
				properName = '('.repeat(level) + R.Actions.definition.symbols[quant] + properName + ')'.repeat(level);
			}
			txt.innerHTML = properName;
		}
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
		return o instanceof IndexObject && (this.to.isEquivalent(o.to) || this.isIdentityFusible());
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
	updateProperName()
	{
		const text = this.svg.querySelector('text');
		text.innerHTML = this.to.properName;
	}
	isBare()
	{
		return false;
	}
	hasMoved()
	{
		return 'orig' in this && (this.orig.x !== this.x || this.orig.y !== this.y);
	}
	checkCells()
	{
		this.cells.forEach(cell => D.emitCellEvent(this.diagram, 'check', cell));
	}
	setQuantifier(quant)
	{
		if (quant !== 'none')
		{
			this.attributes.set('quantifier', quant);
			if (!this.attributes.has('level'))
				this.attributes.set('level', 1);		// quantifiers start on level 1
		}
		else
		{
			this.attributes.delete('quantifier');
			this.attributes.delete('level');
		}
	}
	getQuantifier()
	{
		return this.attributes.get('quantifier');
	}
	getLevel()
	{
		return this.attributes.has('level') ? this.attributes.get('level') : 0;
	}
	emphasis(on)
	{
		super.emphasis(on);
		this.svg.querySelectorAll('.emphasis2').forEach(elt => elt.classList.remove('emphasis2'));
		this.svg.classList[on ? 'add' : 'remove']('emphasis');
	}
	getHtmlRep()
	{
		return this.to.getHtmlRep();
	}
}

class Action extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.category = diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			actionOnly:		{value:U.getArg(nuArgs, 'actionOnly', false),	writable:	false},
			priority:		{value:U.getArg(nuArgs, 'priority', 0),			writable:	false},
		});
		this.setSignature();
		D && D.emitElementEvent(diagram, 'new', this);
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Action')));
	}
	action(e, diagram, ary) {}	// fitb
	hasForm(diagram, ary) {return false;}	// fitb
	hidden() { return false; }		// fitb
	html()
	{
		D.toolbar.clear();
	}
}

class CompositeAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create composite',
			basename:		'composite',
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		const from = this.doit(e, diagram, morphisms);
		diagram.log({command:'composite', morphisms:names});
		diagram.antilog({command:'delete', elements:[from.name]});
		diagram.makeSelected(from);
	}
	doit(e, diagram, indexMorphisms)
	{
		const morphisms = indexMorphisms .map(m => m.to);
		const to = diagram.get('Composite', {morphisms});
		return new IndexMorphism(diagram, {to, domain:Composite.Domain(indexMorphisms), codomain:Composite.Codomain(indexMorphisms)});
	}
	replay(e, diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		this.doit(null, diagram, morphisms);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length > 1)
		{
			const leg = Category.getLeg(ary);
			return leg.length === ary.length;
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
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
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexObject;
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
		D && D.replayCommands.set(this.basename, this);
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
			D.toolbar.error.innerHTML = 'Error ' + U.getError(x);
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
			const idFromNdx = new IndexMorphism(diagram, {to:nid.idFrom, domain:idToNdx.codomain, codomain:sourceNdx});
			return idToNdx.codomain;
		}
		else if (sourceNdx instanceof Morphism)
		{
			const nuArgs = U.clone(args);
			nuArgs.domain = sourceNdx.domain.to;
			nuArgs.codomain = sourceNdx.codomain.to;
			const to = new NamedMorphism(diagram, nuArgs);
			const nuFrom = new IndexMorphism(diagram, {to, domain:sourceNdx.domain, codomain:sourceNdx.codomain});
			sourceNdx.update();
			diagram.makeSelected(nuFrom);
			nuFrom.checkCells();
			return nuFrom;
		}
	}
	replay(e, diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.source = diagram.getElement(args.source);
		this.doit(e, diagram, nuArgs);
	}
	html(e, diagram, ary)
	{
		super.html();
		const from = ary[0];
		const action = e => this.create(e);
		const elements = [
			H3.h5('Create Named Element'),
			H3.table(H3.tr(H3.td(H3.input('##named-element-new-basename', {placeholder:'Base name', onkeyup:e => D.inputBasenameSearch(e, diagram, action)}))),
					H3.tr(H3.td(H3.input('##named-element-new-properName', {placeholder:'Proper name'}))),
					H3.tr(H3.td(H3.input('##named-element-new-description.in100', {type:'text', placeholder:'Description'})))),
			D.getIcon('namedElement', 'edit', e => this.create(e), {title:'Create named element'})];
		elements.map(elt => D.toolbar.body.appendChild(elt));
	}
	create(e)
	{
		this.action(e, R.diagram, R.diagram.selected);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && (ary[0] instanceof IndexMorphism || ary[0] instanceof IndexObject);
	}
	static Reduce(leg)
	{
		return null;
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		this.doit(e, diagram, from);
		diagram.log({command:'flipName', from:from.name});
		diagram.antilog({command:'flipName', from:from.name});
	}
	doit(e, diagram, from)
	{
		from.attributes.set('flipName', !from.attributes.get('flipName'));
		from.update();
		D && D.emitElementEvent(diagram, 'update', from);
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, diagram.getElement(args.from));
	}
	hasForm(diagram, ary)	// one element
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexMorphism;
	}
	hidden() { return true; }		// not on the toolbar
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, elements, log = true)
	{
		const names = elements.map(m => m.name);
		const elt = this.doit(e, diagram, elements);
		log && diagram.log({command:this.name, elements:names});
		log && diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, elements)
	{
		const elt = elements[0];
		if (elt instanceof IndexMorphism)
		{
			const morphisms = elements.map(m => m.to);
			const to = diagram.get('ProductMorphism', {morphisms, dual:this.dual});
			return diagram.placeMorphism(to, D.mouse.diagramPosition(diagram));
		}
		else if (elt instanceof IndexObject)
		{
			const objects = elements.map(o => o.to);
			const to = diagram.get('ProductObject', {objects, dual:this.dual});
			const xy = diagram.findEmptySpot(D.mouse.diagramPosition(diagram));
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
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && v instanceof IndexObject, true) ||
			ary.reduce((hasIt, v) => hasIt && v instanceof IndexMorphism, true));
	}
}

class PullbackAction extends Action		// pullback or pushout
{
	constructor(diagram, dual)
	{
		const basename = dual ? 'pushout' : 'pullback';
		const args =
		{
			description:	`Create a ${dual ? 'pushout' : 'pullback'} of two or more morphisms with a common ${dual ? 'domain' : 'codomain'}`,
			basename,
			dual,
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		const category = morphisms[0].category;		// all morphisms must be in the same cat
		const {object, cone} = this.doit(e, diagram, morphisms, category);
		diagram.log({command:this.name, morphisms:names});
		// 	TODO antilog
		diagram.makeSelected(...cone);
	}
	doit(e, diagram, indexMorphisms)
	{
		const legs = Category.getLegs(indexMorphisms);
		const dual = this.dual;
		const baseLegs = legs.map(leg => leg.map(m => m.to));
		const morphisms = baseLegs.map(leg => diagram.comp(...leg));
		const pb = diagram.get('PullbackObject', {morphisms, dual});
		const objects = new Set();
		indexMorphisms.map(m => dual ? objects.add(m.codomain) : objects.add(m.domain));
		const bary = D.barycenter([...objects]);
		const obj = dual ? indexMorphisms[0].domain : indexMorphisms[0].codomain;
		const xy = bary.add(bary.subtract(obj));
		const object = new IndexObject(diagram, {xy, to:pb});
		object.update();
		const cone = [];
		legs.map((leg, i) =>
		{
			const args = {dual, factors:[i]};
			args[dual ? 'codomain' : 'domain'] = object;
			args[dual ? 'domain' : 'codomain'] = leg[dual ? leg.length -1 : 0][dual ? 'codomain' : 'domain'];
			args.to = dual ? this.diagram.cofctr(pb, [i]) : diagram.fctr(pb, [i]);
			cone.push(new IndexMorphism(diagram, args));
		});
		object.checkCells();
		diagram.makeSelected(...cone);
		return {object, cone};
	}
	replay(e, diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		this.doit(e, diagram, morphisms);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Category.isSink(ary, this.dual);
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
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
		const morphisms = Category.getLegs(diagramMorphisms.map(m => m.to)).map(leg => diagram.comp(...leg));
		const m = diagram.get('ProductAssembly', {morphisms, dual:this.dual});
		const obj = this.dual ? diagramMorphisms[0].codomain : diagramMorphisms[0].domain;
		return diagram.placeMorphismByObject(e, this.dual ? 'codomain' : 'domain', obj, m);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Category.isSink(ary, !this.dual);
	}
}

class PullbackAssemblyAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Create a ${dual ? 'pushout' : 'pullback'} assembly of two or more morphisms with a common ${dual ? 'co' : ''}domain`,
			basename:		`${dual ? 'pushout' : 'pullback'}Assembly`,
			dual,
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const pboNdx = ary[ary.length -1];
		const legs = Category.getLegs(ary, pboNdx);
		const left = legs[0];
		const right = legs[1];
		const morphisms = this.getLegs(diagram, left, right, pboNdx).map(leg => diagram.comp(...leg.map(m => m.to)));
		const srcNdx = left[0].domain;		// index object
		const elt = this.doit(e, diagram, morphisms, srcNdx, pboNdx);
		diagram.log({command:this.name, morphisms:morphisms.map(m => m.name)});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, morphisms, srcNdx, pboNdx)
	{
		const args = {morphisms, dual:this.dual};
		if (this.dual)
		{
			args.domain = pboNdx.to;
			args.codomain = srcNdx.to;
		}
		else
		{
			args.domain = srcNdx.to;
			args.codomain = pboNdx.to;
		}
		const assyMorphism = diagram.get('PullbackAssembly', args);
		const obj = this.dual ? morphisms[0].codomain : morphisms[0].domain;
		return diagram.placeMorphism(assyMorphism, this.dual ? pboNdx : srcNdx, this.dual ? srcNdx : pboNdx);
	}
	getLegs(diagram, left, right, pboNdx)
	{
		if (!this.dual)
		{
			let foundIt = false;
			let leftNdx = -1;
			for (let i=left.length-1; i>=0; --i)
			{
				if (pboNdx.to.morphisms[0].isEquivalent(diagram.comp(...left.slice(i).map(m => m.to))))
				{
					foundIt = true;
					leftNdx = i;
					break;
				}
			}
			if (!foundIt)
				return [];
			foundIt = false;
			let rightNdx = -1;
			const redRight = right.filter(m => !Morphism.isIdentity(m.to));
			for (let i=redRight.length-1; i>=0; --i)
			{
				if (pboNdx.to.morphisms[1].isEquivalent(diagram.comp(...redRight.slice(i).map(m => m.to))))
				{
					foundIt = true;
					rightNdx = i;
					break;
				}
			}
			if (!foundIt)
				return [];
			const cellName = Cell.Name(diagram, left, right);
			const cell = diagram.getCell(cellName);
			if (cell && cell.isEqual())
				return [left.slice(0, leftNdx), right.slice(0, rightNdx)];
			else
				return [];
		}
		else
		{
			// TODO dual
			return [];
		}
	}
	hasForm(diagram, ary)
	{
		const pboNdx = ary[ary.length -1];		// last selected element is the pullback object
		if (diagram.isEditable() && pboNdx.to instanceof PullbackObject && pboNdx.to.dual === this.dual)
		{
			const legs = Category.getLegs(ary, pboNdx);
			if (legs.length !== 2)		// only two legs currently supported
				return false;
			const left = legs[0];
			const right = legs[1];
			if (left[0].domain !== right[0].domain)		// beginning must be the same
				return false;
			if (left[left.length -1].codomain !== right[right.length -1].codomain)		// end must be the same
				return false;
			return this.getLegs(diagram, left, right, pboNdx).length > 0;
		}
		return false;
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
		D && D.replayCommands.set(this.basename, this);
		this.assembler = null;
	}
	html(e, diagram, ary)
	{
		super.html();
		const elts = [H3.h4('Assemble Morphism'),
						D.getIcon('assyColor', 'assyColor', e => this.toggle(e, diagram, ary), {title:'Dismiss assembly colors'}),
						D.getIcon('edit', 'edit', e => this.action(e, diagram, ary), {title:'Assemble and place the morphism'})];
		elts.map(elt => D.toolbar.body.appendChild(elt));
	}
	action(e, diagram, ary)
	{
		D.toolbar.clearError();
		const elt = this.doit(e, diagram, ary);
		const rows = this.assembler.issues.map(isu =>
		{
			if ('to' in isu.element)
				return H3.tr(H3.td(isu.message), H3.td(H3.button(isu.element.to.properName,
				{
					onmouseenter:	_ => diagram.emphasis(isu.element, true),
					onmouseleave:	_ => diagram.emphasis(isu.element, false),
					onclick: 		e => R.Actions.zoom.action(e, R.diagram, [isu.element]),
				})));
			else
				return H3.tr(H3.td(isu.message), H3.td(isu.element.properName));
		});
		if (rows.length > 0)
			D.toolbar.showError(H3.table(rows));
		else
			D.statusbar.show(null, 'No issues detected');
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
		if (ary.length === 1 && ary[0].isEditable() && ary[0] instanceof IndexObject)
		{
			if (diagram.blobs.length === 1 && diagram.blobs[0].objects.has(ary[0]) && diagram.blobs[0].morphisms.size > 1 && diagram.blobs[0].quantifiers.size === 0)
				return true;
		}
		return false;
	}
	toggle(e, diagram, ary)
	{
		this.assembler && this.assembler.clearGraphics();
	}
}

class HomAction extends Action
{
	constructor(diagram)
	{
		const args =
		{	description:	'Create a hom object or morphism from two such items',
			basename:		'hom',
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
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
		const xy = D.barycenter(elements);
		if (elements[0] instanceof IndexObject)
			return diagram.placeObject(diagram.get('HomObject', {objects:elements.map(o => o.to)}), xy);
		else if (elements[0] instanceof IndexMorphism)
			return diagram.placeMorphism(diagram.get('HomMorphism', {morphisms:elements.map(m => m.to)}), xy);
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	hasForm(diagram, ary)	// two objects or morphisms
	{
		return diagram.isEditable() && ary.length === 2 && (ary.reduce((hasIt, v) => hasIt && v instanceof IndexObject, true) ||
			ary.reduce((hasIt, v) => hasIt && v instanceof IndexMorphism, true));
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
		Object.defineProperties(this,
		{
			searchTool:		{value:	new SearchTool(this.basename),	writable:	false},
		});
		D && D.replayCommands.set(this.basename, this);
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
		super.html();
		if (ary.length === 1)
		{
			const from = ary[0];
			const to = from.to;
			const diagrams = [...diagram.allReferences.keys()].map(dgrm => R.$CAT.getElement(dgrm));
			D.toolbar.clear();
			this.searchTool.getMatchingElements = _ =>
			{
				const filter = document.getElementById(`${this.searchTool.type}-search-value`).value;
				const morphisms = R.diagram.getMorphisms().filter(m => m.name.includes(filter)
					&& (this.dual ? m.codomain === to : m.domain === to)
					&& ((this.searchTool.searchArgs.diagramOnly && m.diagram === R.diagram) || !this.searchTool.searchArgs.diagramOnly));
				const sigs = new Map();
				morphisms.map(m =>
				{
					if (!sigs.has(m.signature))
						sigs.set(m.signature, m);
				});
				const remaining = [...sigs.values()];
				remaining.sort(this.searchTool.searchArgs.sorter);
				return remaining;
			};
			this.searchTool.getRows = (tbl, elements) =>
			{
				elements.map(elt =>
				{
					const row = elt.getHtmlRow();
					row.onclick = e => Cat.R.Actions[this.basename].action(e, diagram, [from.name, elt.name]);
					row.querySelector('div').classList.add('clickable');
					tbl.appendChild(row);
				});
			}
			D.toolbar.table.appendChild(H3.tr(H3.td(H3.h3(`Place morphisms ${this.dual ? 'to' : 'from'} ${to.properName}`))));
			this.searchTool.html();
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
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexObject;
	}
	place(e, diagram, name, domName, codName)
	{
		const to = diagram.getElement(name);
		const domain = diagram.getElement(domName);
		const codomain = diagram.getElement(codName);
		const nuFrom = new IndexMorphism(diagram, {to, domain, codomain});
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
		D && D.replayCommands.set(this.basename, this);
		Object.defineProperties(this,
		{
			bpd:		{value:	new BPD(),	writable:	false},
			domain:		{value:	null,		writable:	true},
			codomain:	{value:	null,		writable:	true},
			swapped:	{value:	false,		writable:	true},		// whether or not the selected domain and codomain have been swapped
		});
	}
	action(e, diagram, args)
	{
		const from = this.doit(e, diagram, args);
		diagram.log({command:this.name, args});
		diagram.antilog({command:'delete', elements:[from.name]});
	}
	html(e, diagram, ary)
	{
		super.html();
		this.swapped = false;
		const table = D.toolbar.table;
		this.domain = ary[0];
		this.codomain = ary[1];
		table.appendChild(H3.tr(H3.td(H3.h3('Homset'))));
		const icon = this.domain.to !== this.codomain.to ? D.getIcon('swap', 'swap', e => this.swap(), {title:'Swap domain and codomain'}) : null;
		table.appendChild(H3.tr(H3.td('Domain', icon), H3.td('##domain', this.domain.to.properName)));
		table.appendChild(H3.tr(H3.td('Codomain'), H3.td('##codomain', this.codomain.to.properName)), '.w100');
		const newSection = this.bpd.getNewSection(R.diagram, 'Homset-new', e => this.create(e), 'New Morphism');
		table.appendChild(newSection);
		diagram.addFactorMorphisms(this.domain, this.codomain);
		this.addRows(diagram, diagram.codomain.getHomset(this.domain.to, this.codomain.to));
	}
	addRows(diagram, homset)
	{
		const title = D.toolbar.help.querySelector('#help-homset-morphism-title');
		const table = D.toolbar.help.querySelector('#help-homset-morphism-table');
		title && title.remove();
		table && table.remove();
		const rows = homset.map(m =>
		{
			const row = H3.tr(H3.td(H3.div(m.getHtmlRep(), '.element.clickable')));
			row.onclick = e => diagram.placeMorphism(m, this.domain, this.codomain);
			return row;
		});
		if (rows.length > 0)
		{
			D.toolbar.table.appendChild(H3.tr(H3.th('Place existing morphism', '##help-homset-morphism-title', {colspan:2})));
			D.toolbar.table.appendChild(H3.tr(H3.td(H3.table(rows, '##help-homset-morphism-table'), {colspan:2})));
		}
	}
	doit(e, diagram, args)
	{
		const toArgs = {basename:args.basename, properName:args.properName, description:args.description, domain:this.swapped ? args.codomain.to : args.domain.to, codomain:this.swapped ? args.domain.to : args.codomain.to};
		const to = new Morphism(diagram, toArgs);
		const nuFrom = new IndexMorphism(diagram, {to, domain:this.swapped ? this.codomain : this.domain, codomain:this.swapped ? this.domain : this.codomain});
		diagram.makeSelected(nuFrom);
		D.emitCellEvent(diagram, 'check');
		nuFrom.checkCells();
		return nuFrom;
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args.morphism, args.domain, args.codomain, false);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 2 && ary[0] instanceof IndexObject && ary[1] instanceof IndexObject && ary[0].category === ary[1].category;
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
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
		D.emitMorphismEvent(diagram, 'detach', from, {dual:this.dual, old});
		from.update();
		D.emitCellEvent(diagram, 'check');
		return obj;
	}
	replay(e, diagram, args)
	{
		const from = diagram.getElement(args.from);
		this.doit(e, diagram, from);
	}
	hasForm(diagram, ary)	// one morphism with connected domain but not a def of something
	{
		if (diagram.isEditable() && ary.length === 1 && (ary[0] instanceof IndexMorphism || ary[0] instanceof IndexElement) && ary[0].refcnt === 1)
		{
			const from = ary[0];
			let soFar = from.isDeletable() && this.dual ? from.codomain.domains.size + from.codomain.codomains.size > 1 :
													from.domain.domains.size + from.domain.codomains.size > 1;
			if (soFar && 'cells' in from.domain && from.domain.cells.size > 0)
				return ![...from.domain.cells].reduce((r, cell) => r || ([...cell.left, ...cell.right].includes(from) && cell.assertion), false);
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const elements = ary.slice();
		const names = elements.map(m => m.name);
		diagram.deselectAll();
		const notDeleted = this.doit(e,diagram, elements);
		notDeleted.map(elt => diagram.addSelected(elt));	// reselect items that were not deleted
		diagram.log({command:'delete', elements:names});
		const commands = elements.map(from =>
		{
			if (from instanceof IndexMorphism)
				return {command:'copy', source:from.to, xy:from.domain.getXY(), xyCod:from.codomain.getXY()};
			else if (from instanceof IndexObject)
				return {command:'copy', source:from.to, xy:from.getXY()};
			else if (from instanceof IndexText)
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
			hasMorphism = hasMorphism || Arrow.isArrow(elt);
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
			sorted.filter(elt => Arrow.isArrow(elt)).map(m =>
			{
				m.domain.refcnt === 1 && objects.add(m.domain);
				m.codomain.refcnt === 1 && objects.add(m.codomain);
			});
			diagram.makeSelected(...objects);
			D.emitCellEvent(diagram, 'check');
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
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, elements)
	{
		const from = elements[0];
		const factors = D.getFactorsById(this.dual ? 'inject-domain' : 'project-codomain');
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
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexObject;
	}
	html(e, diagram, ary)
	{
		super.html();
		const to = ary[0].to.getBase();
		const canFlatten = ProductObject.CanFlatten(to);
		const id = this.dual ? 'inject-domain' : 'project-codomain';
		const obj = this.dual ? 'domain' : 'codomain';
		D.toolbar.clear();
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
		elements.map(elt => elt && D.toolbar.body.appendChild(elt));
		this.codomainDiv = document.getElementById(id);
	}
	addFactor(root, ...indices)
	{
		if (this.codomainDiv.childElementCount === 0)
		{
			D.removeChildren(this.codomainDiv);
			this.codomainDiv.appendChild(D.getIcon(this.dual ? 'inject' : 'project', 'edit', e => this.action(e, Cat.R.diagram, Cat.R.diagram.selected), {title:'Create morphism'}));
		}
		const object = R.diagram.getElement(root);
		const isTerminal = indices.length === 1 && indices[0] === -1;
		const factor = isTerminal ? R.diagram.getTerminal(this.dual) : object.getFactor(indices);
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
			'data-indices':index.toString(), onclick:e => Cat.R.Actions[dual ? 'inject' : 'project'].addFactor(root.name, ...index)}))));
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
		D && D.replayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const domFactors = D.getFactorsById('lambda-domain');
		const homFactors = D.getFactorsById('lambda-codomain');
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
		if (diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexMorphism)
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
		super.html();
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
					H3.span(D.getIcon('lambda', 'edit', e => Cat.R.Actions.lambda.action(e, Cat.R.diagram, Cat.R.diagram.selected), {title:'Create lambda morphism'})));
		html.map(elt => D.toolbar.body.appendChild(elt));
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
		const xyDom = diagram.findEmptySpot(from.domain.getXY());
		const xyCod = diagram.findEmptySpot(from.codomain.getXY());
		return diagram.placeMorphism(m, xyDom, xyCod);
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
		this.toolbar2 = null;
	}
	action(e, diagram, ary) {}
	hasForm(diagram, ary)	// one element
	{
		return ary.length === 1 && (ary[0] instanceof Cell || U.isIndexItem(ary[0]));
	}
	html(e, diagram, ary)
	{
		super.html();
		const from = ary[0];
		const tools = [];
		if (R.Actions.elementOf.hasForm(diagram, ary))
			tools.push(D.getIcon('elementOf', 'elementOf', e => Cat.R.Actions.elementOf.action(e, Cat.R.diagram, R.diagram.selected), {title:'Show element of'}));
		if (R.Actions.elementIn.hasForm(diagram, ary))
			tools.push(D.getIcon('elementIn', 'elementIn', e => Cat.R.Actions.elementIn.action(e, Cat.R.diagram, R.diagram.selected), {title:'Show element in object'}));
		if (diagram.codomain.name === 'zf/Set')
			R.languages.forEach(lang => lang.hasForm(diagram, ary) && tools.push(D.getIcon(lang.basename, lang.basename, e => Cat.R.Actions[lang.basename].html(e, Cat.R.diagram, Cat.R.diagram.selected), {title:lang.description})));
		this.toolbar2 && this.toolbar2.remove();
		this.toolbar2 = H3.tr(H3.td(H3.table(H3.tr(H3.td(H3.span(tools), '.buttonBarLeft'), H3.td(H3.span(), '.buttonBarRight')), '##help-toolbar2.w100'), {colspan:2}));
		D.toolbar.element.querySelector('.toolbar-buttons').appendChild(this.toolbar2);
		from.help();
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
			D && D.emitElementEvent(diagram, 'update', from);
		}
	}
	hasForm(diagram, ary)
	{
		return (ary.length === 1 && (ary[0] instanceof CatObject || ary[0] instanceof Morphism)) || ary.length === 0;
	}
	canHaveCode(elt)
	{
		return (elt.constructor.name === 'Morphism' && !elt.domain.isInitial() && !elt.codomain.isTerminal() && !elt.codomain.isInitial() && !('recursor' in elt)) || elt instanceof CatObject || elt instanceof Diagram;
	}
	html(e, diagram, ary)
	{
		const toolbar = D.toolbar;
		super.html();
		const elt = ary.length === 1 ? ary[0].to : diagram;
		const id = `element-${this.ext}`;
		if (this.canHaveCode(elt))
		{
			const textarea = H3.textarea('.code.w100',
			{
				id,
				disabled:true,
				onkeydown:e =>
				{
					e.stopPropagation();
					D.cancelAutohide();
					if (e.key === 'Tab')	// insert tab character
					{
						e.preventDefault();
						const target = e.target;
						const start = target.selectionStart;
						target.value = target.value.substring(0, start) + '\t' + target.value.substring(target.selectionEnd);
						target.selectionStart = target.selectionEnd = start +1;
					}
					else if (e.key === 'Enter' && e.ctrlKey)
						this.setCode(e, id, this.basename);
				},
				oninput: e => this.setEditorSize(e.target),
			});
			toolbar.body.appendChild(H3.h5('Inline code'));
			toolbar.body.appendChild(textarea);
			if (elt instanceof Morphism || elt instanceof CatObject || elt instanceof Diagram)
				this.getEditHtml(textarea, elt);
			elt.isEditable() && toolbar.body.appendChild(D.getIcon(this.name, 'edit', e => this.setCode(e, id, this.basename), {title:'Edit code'}));
			const resizeObserver = new ResizeObserver(entries =>
			{
				for (let entry of entries)
				{
					if(entry.contentBoxSize)	// firefox, chrome
					{
						// Firefox implements `contentBoxSize` as a single content rect, rather than an array
						const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
						const width = parseFloat(D.toolbar.element.style.width);
						if (contentBoxSize.inlineSize > width)
							D.toolbar.element.style.width = `${contentBoxSize.inlineSize}px`;
					}
				}
			});
			resizeObserver.observe(textarea);
		}
		if (('code' in elt && this.basename in elt.code) || elt instanceof Diagram || elt instanceof Morphism)
		{
			toolbar.body.appendChild(D.getIcon(this.basename, `download-${this.basename}`, e => this.download(e, elt), {title:`Download ${this.properName}`}));
			const icon = `show-${this.ext}`;
			toolbar.body.appendChild(Cat.D.getIcon(icon, icon, e => Cat.R.diagram.showCode(this.ext), {title:`Show code for ${this.properName}`}));
		}
	}
	setEditorSize(textarea)
	{
		if (textarea.scrollWidth - Math.abs(textarea.scrollLeft) !== textarea.clientWidth)
			textarea.style.width = Math.max(D.toolbar.element.clientWidth - 40, textarea.scrollWidth) + 'px';
		if (textarea.scrollHeight - Math.abs(textarea.scrollTop) !== textarea.clientHeight)
			textarea.style.height = Math.min(D.height()/2, textarea.scrollHeight) + 'px';
	}
	template(elt)		// return something useful if a template is required for an element
	{
		return '';
	}
	getEditHtml(textarea, elt)	// handler when the language is just a string
	{
		textarea.value = 'code' in elt ? (this.hasCode(elt) ? elt.code[this.ext] : '') : this.template(elt);
		this.setEditorSize(textarea);
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
		this.initialize(R.diagram);
		const code = this.generate(elt);
		const blob = new Blob([code], {type:`application/${this.ext}`});
		const url = D.url.createObjectURL(blob);
		D.download(url, `${this.getType(elt)}.${this.ext}`);
	}
	hidden() { return true; }
	initialize()	{}		// fitb
}

class RunAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Run morphism',
						basename:		'run' };
		super(diagram, args);
		Object.defineProperties(this,
		{
			data:			{value:	new Map(),	writable:	true},
			display:		{value: null,		writable:	true},
			js:				{value:	null,		writable:	true},
			postResultFun:	{value:	null,		writable:	true},
			workers:		{value:	[],			writable:	false},
		});
	}
	html(e, diagram, ary)
	{
		super.html();
		const from = ary[0];
		const to = from.to;
		const toolbar = D.toolbar;
		const createDataBtn = H3.div(D.getIcon('createData', 'table', e => this.createData(e, Cat.R.diagram, from.name), {title:'Add data'}), '##run-createDataBtn', {display:'none'});
		this.display = H3.tr(H3.td('##run-display'), H3.td(createDataBtn));
		toolbar.table.appendChild(this.display);
		const {properName, description} = to;
		const elements = [H3.h3(properName)];
		description !== '' && elements.push(H3.p(description, '.smallPrint.italic'));
		let domain = null;
		let codomain = null;
		const source = to instanceof NamedObject ? to.base : to;
		if (from instanceof IndexObject)
			this.js.canFormat(source) && elements.push(this.js.getInputHtml(source), D.getIcon('addInput', 'edit', e => this.addInput(this.display), {title:'Add data'}));
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
					html += D.getButton('addData', 'add', `Cat.R.Actions.run.addDataInput(event, Cat.R.diagram, '${to.name}')`, 'Add data input');
				}
				*/
			}
			if (to.isIterable())
				elements.push(D.getIcon('evaluate', 'edit', e => this.evaluateMorphism(e, Cat.R.diagram, to.name, this.postResults), {title:'Evaluate morphism'}));
			else		// try to evaluate an input
				elements.push(H3.h5('Evaluate the Morphism'), H3.span(this.js.getInputHtml(domain)), D.getIcon('run', 'edit', e => this.js.evaluate(e, Cat.R.diagram, to.name, this.postResult), {title:'Evaluate inputs'}));
		}
		elements.map(elt => elt && D.toolbar.body.appendChild(elt));
		this.data = new Map();
	}
	postResult(result)
	{
		const that = R.Actions.run;
		const morphism = R.diagram.getSelected();
		const domInfo = JSON.stringify(U.convertData(morphism.domain.to, result[0]));
		const codInfo = JSON.stringify(U.convertData(morphism.codomain.to, result[1]));
		const div = H3.div([H3.span(domInfo), H3.span('&rarr;'), H3.span(codInfo)]);
		if (that.display.children.length === 0)
			that.display.appendChild(H3.h3('Data'));
		that.display.appendChild(div);
		that.data.set(result[0], result[1]);
	}
	postResults(result)
	{
		const that = R.Actions.run;
		result.forEach((v, i) => that.postResult([i, v]));
	}
	addInput(root)
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
		else if (R.canFormat(to))
		{
			const {domain, codomain} = this.setEvaluation(to);
			d.innerHTML = this.htmlInputValue(domain, codomain);
		}
		root.appendChild(d);
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
				const {to, name} = selected instanceof IndexObject ? selected : selected.codomain;
				const data = [...this.data].map((datum, i) => [i, datum[1]]);
				const dm = new Morphism(diagram, {basename:diagram.getAnon('data'), domain, codomain:to, data});
				diagram.placeMorphismByObject(e, 'codomain', name, dm.name);
			}
		}
		catch(x)
		{
			D.toolbar.showError('Error: ' + U.getError(x));
		}
	}
	editData(e, i)
	{
		const morphism = R.diagram.getSelected();
		const val = this.js.getInputValue(morphism.to.codomain, i);
		morphism.to.data.set(i, val);
		D.emitMorphismEvent(R.diagram, 'update', morphism);
		D.statusbar.show(e, `Data for morphism ${morphism.to.properName} saved`, false);
	}
	deleteData(e, morphism, data, key)
	{
		morphism.data.delete(key);
		if (morphism.data.size === 0)
			delete morphism.data;
		const row = e.target.parentElement.parentElement.parentElement.parentElement;
		row.parentElement.removeChild(row);
		D.emitMorphismEvent(R.diagram, 'update', morphism);
		D.statusbar.show(e, `Data deleted for morphism ${morphism.properName}`, false);
	}
	hasForm(diagram, ary)
	{
		if (!diagram.isEditable())
			return false;
		if (!this.js)		// initial setup
			this.js = R.Actions.javascript;
		if (ary.length === 1 && 'to' in ary[0])
		{
			const {to} = ary[0];
			if (R.canFormat(to))
				return true;
			if (to instanceof CatObject)
				return this.js.canFormat(to);
			else if (to instanceof Morphism && this.js.canFormat(to.domain))
				return true;
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
		D && D.emitObjectEvent(diagram, 'update', finObj);
		return from;
	}
	html(e, diagram, ary)
	{
		super.html();
		const from = ary[0];
		const to = from.to;
		const elements = [H3.h4('Finite Object')];
		elements.push(to.constructor.name === 'CatObject' ? H3.span('Convert generic object to a finite object.', '.smallPrint.italic') : H3.span('Finite object', '.smallPrint.italic'),
						H3.table(H3.tr(H3.td(H3.input('##finite-new-size.in100', 'size' in to ? to.size : '', {placeholder:'Size'})))),
						H3.span('Leave size blank to indicate finite of unknown size', '.smallPrint.italic'),
						D.getIcon('finiteObject', 'edit', e => this.action(e, Cat.R.diagram, Cat.R.diagram.selected), {title:'Finite object', scale:D.default.button.tiny}));
		elements.map(elt => elt && D.toolbar.body.appendChild(elt));
		this.sizeElt = document.getElementById('finite-new-size');
		U.SetInputFilter(this.sizeElt, v => /^\d*$/.test(v));	//digits
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
					return true;
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
			actionOnly:		true,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = diagram.get('Evaluation', {domain:from.to});
		diagram.placeMorphismByObject(e, 'domain', from, m.name);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexObject && Evaluation.CanEvaluate(ary[0].to);
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
	}
	html(e, diagram, ary)
	{
		super.html();
		const from = ary[0];
		const to = from.to.getBase();
		const objLeft = to.objects[0];
		const objRight = to.objects[1];
		const rightBtn = H3.button(`${objRight.properName} over ${objLeft.properName}`, {title:'Distribute over this object', onclick:e => this.doit(e, diagram, from, true)});
		const leftBtn = H3.button(`${objLeft.properName} over ${objRight.properName}`, {title:'Distribute over this object', onclick:e => this.doit(e, diagram, from, false)});
		const elements = [	H3.h4(`Create Distribution Morphism`),
							H3.div('.center',
								H3.span('.smallBold', to.properName),
								H3.table(H3.tr(H3.th('Left'), H3.th('Right')),
									H3.tr(	H3.td(objRight instanceof ProductObject ? leftBtn : ''),
											H3.td(objLeft instanceof ProductObject ? rightBtn : ''))))];
		elements.map(elt => elt && D.toolbar.body.appendChild(elt));
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const elt = this.doit(e, diagram, from);
		diagram.log({command:'distribute', from:from.name});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, from, side)
	{
		let m = null;
		if (Distribute.HasForm(diagram, [from]))
			m = diagram.get('Distribute', {domain:from.to, side});
		return diagram.placeMorphismByObject(e, 'domain', from, m.name);
	}
	hasForm(diagram, ary)	// one object
	{
		if (!diagram.isEditable())
			return false;
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
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
		const xy = D.grid(elements[0].getXY());		// basepoint
		elements.map(i =>
		{
			i.setXY({x:i.x, y:xy.y});
			D && D.emitElementEvent(diagram, 'move', i);
		});
		diagram.updateMorphisms();
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	getItems(ary)
	{
		return ary.filter(s => s instanceof IndexObject || s instanceof IndexText);
	}
	hasForm(diagram, ary)	// one object
	{
		if (!diagram.isEditable())
			return false;
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
			actionOnly:		true,
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
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
			D && D.emitElementEvent(diagram, 'move', i);
		});
		diagram.updateMorphisms();
		elements.map(elt => D.emitDiagramEvent(diagram, 'move', elt));
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements, false);
	}
	getItems(ary)
	{
		return ary.filter(s => s instanceof IndexObject || s instanceof IndexText);
	}
	hasForm(diagram, ary)	// one object
	{
		if (!diagram.isEditable())
			return false;
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
			actionOnly:		true,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const elt = ary[0];
		if (elt instanceof IndexMorphism)
		{
			const morphisms = ary.map(m => m.to);
			const to = diagram.get('TensorMorphism', {morphisms});
			diagram.placeMorphism(to, D.barycenter(ary));
		}
		else if (elt instanceof IndexObject)
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
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && v instanceof IndexObject, true) ||
			ary.reduce((hasIt, v) => hasIt && v instanceof IndexMorphism, true));
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
			actionOnly:		true,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const recursor = ary[0].to;
		const form = ary[1].to;
		recursor.setRecursor(form);
		D.statusbar.show(e, `Morphism ${recursor.properName} is now recursive with morphism ${form.properName}`);
		D && D.emitElementEvent(diagram, 'update', ary[0]);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Morphism.HasRecursiveForm(ary);
	}
}

class GraphAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Show morphism graph',
			basename:		'graph',
			priority:		95,
			actionOnly:		true,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		if (ary.length === 0)
			diagram.showGraphs();
		else
		{
			ary.map(m => diagram.showGraph(m));
			diagram.log({command:this.name, morphisms:ary.map(m => m.name)});
			diagram.antilog({command:this.name, morphisms:ary.map(m => m.name)});
		}
	}
	hasForm(diagram, ary)
	{
		return ary.length === 0 || ary.length > 0 && ary.reduce((r, m) => r && m instanceof IndexMorphism && !('code' in m.to), true);
	}
}

class SwapAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Swap domain and codomain',
			basename:		'swap',
			priority:		90,
			actionOnly:		true,
		};
		super(diagram, args);
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
		D.emitMorphismEvent(diagram, 'update', from);
		diagram.log({command:this.name, morphism:ary[0].name});
		diagram.antilog({command:this.name, morphism:ary[0].name});
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1)
		{
			const from = ary[0];
			const to = from.to;
			return from instanceof IndexMorphism && from.refcnt === 1 && to.refcnt === 1 && to.constructor.name === 'Morphism' && !('data' in to);
		}
		return false;
	}
}

class ReferenceMorphismAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Set projection or injection as an assembly morphism',
			basename:		'referenceMorphism',
			priority:		80,
			actionOnly:		true,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		ary.map(m =>
		{
			if (!m.attributes.has('referenceMorphism'))
				m.attributes.set('referenceMorphism', false);
			const isreference = !m.attributes.get('referenceMorphism');
			m.attributes.set('referenceMorphism', isreference);
			if ('svg' in m && m.svg)
				D.emitMorphismEvent(diagram, 'update', m);
		});
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexMorphism && (Assembler.isReference(ary[0].to) || Assembler.isCoreference(ary[0].to));
	}
}

class DefinitionAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Form definition',
			basename:		'definition',
		};
		super(diagram, args);
		Object.defineProperties(this,
		{
			quantifiers:	{value:	['none', 'forall', 'exists', 'existsUnique'],	writable:	false},
			symbols:		{value:	{forall:'&#8704;', exists:'&#8707;', existsUnique:'&#8707;!'},	writable:	false},
		});
		D && D.replayCommands.set(this.basename, this);
	}
	setLevel(e, diagram, item, val)
	{
		const lvl = item.getLevel();
		item.setLevel(lvl + val);
		const blob = diagram.getBlob(item);
		blob.updateLevels();
		this.html(e, diagram, [item]);
	}
	getBlobs(diagram, ary)
	{
		const blobs = new Set();
		ary.map(elt => blobs.add(diagram.getBlob(elt)));
		return [...blobs];
	}
	getSequence(blobs)
	{
		const sequence = new Set();
		blobs.map(blob => blob.levels[0].filter(elt => elt instanceof CatObject || elt instanceof Morphism).map(elt => sequence.add(elt)));
		[...sequence].filter(elt => elt instanceof Morphism).map(m =>
		{
			sequence.delete(m.domain);
			sequence.delete(m.codomain);
		});
		blobs.map(blob => blob.quantifiers.forEach(elt => sequence.delete(elt)));
		return [...sequence];
	}
	html(e, diagram, ary)
	{
		super.html();
		const action = e => this.makeDefinition(e, diagram, diagram.selected);
		const body = D.toolbar.body;
		[	H3.h3('Create Definition'),
			H3.label('Basename:', {for:'new-definition'}),
			H3.input('##new-definition.ifocus',
			{
				placeholder:'Definition',
				title:'Definition',
				onkeyup:e => D.inputBasenameSearch(e, R.actionDiagram, e => e.stopPropagation(), null, R.user.name + '/'),
				onkeydown:e => Cat.D.onEnter(e, action),
			}),
			D.getIcon('edit', 'edit', action, {title:'Create definition'}),
			H3.br(),
			H3.small('.italic', `Full name has the form sys/Action/${R.user.name}/basename`),
			H3.br(),
			H3.div('.center', H3.small('.bold', 'Following form the base the definition')),
		].map(elt => body.appendChild(elt));
		const focus = body.querySelector('.ifocus');
		focus && focus.focus();
		const blobs = this.getBlobs(diagram, ary);
		Definition.show(diagram, this.getSequence(blobs), blobs);
	}
	isValid(quantifier)
	{
		return quantifier === null || this.quantifiers.includes(quantifier);
	}
	action(e, diagram, element, quantifier)
	{
		if (!this.isValid(quantifier))
			throw 'invalid quantifier';
		const oldQuant = element.getQuantifier();
		if (this.doit(e, diagram, element, quantifier))
		{
			D.emitElementEvent(diagram, 'update', element);
			diagram.log({command:'quantifier', quantifier});
			diagram.antilog({command:'quantifier', quantifier:oldQuant});
			this.html(e, diagram, [element]);
		}
	}
	doit(e, diagram, index, quantifier)
	{
		const blob = diagram.getBlob(index);
		blob.getInstances(index.to).map(ins => ins.setQuantifier('none'));	// remove all quantifiers on the element
		if (quantifier !== 'none')
		{
			// TODO
			const lvl = blob.levels[index.getLevel()];
			lvl.filter(elt => elt === index.to).map(elt => index.setQuantifier(quantifier));
			blob.updateLevels();
		}
		return true;
	}
	replay(e, diagram, args)
	{
	}
	makeDefinition(e, diagram, ary)
	{
		const blobs = this.getBlobs(diagram, ary);
		const sequence = this.getSequence(blobs);
		const defname = D.toolbar.body.querySelector('#new-definition').value;
		const description = `Definition of ${defname}`;
		const xy = D.toolbar.mouseCoords;	// use original location
		const width = D.textWidth(description);
		const bbox = {x:xy.x - width/2, y:xy.y - D.default.font.height/2, width, height:D.default.font.height};
		const place = diagram.autoplaceSvg(bbox, null, 16);
		const def = diagram.get('Definition', {description, defname, sequence, blobs, xy:{x:place.x, y:place.y}});
		diagram.makeSelected(def);
	}
	hasForm(diagram, ary)
	{
		if (!diagram.isEditable())
			return false;
		if (ary.reduce((r, elt) => r && elt instanceof IndexText, true))
			return false;
		return true;
	}
}

class TheoremAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Form theorem',
			basename:		'theorem',
		};
		super(diagram, args);
		D && D.replayCommands.set(this.basename, this);
		Object.defineProperties(this,
		{
			sequenceMap:	{value:	[],	writable:	false},
		});
	}
	html(e, diagram, ary)
	{
		super.html();
		const action = e => this.action(e, diagram, diagram.selected);
		const source = ary[0];		// def instance
		const target = ary[1];		// def
		this.sequenceMap.length = 0;
		const setSequence = (e, i) =>
		{
			this.sequenceMap[i] = diagram.getElement(D.toolbar.element.querySelector(`#select-${i}`).value);
		};
		const procElt = (elt, i) =>
		{
			const rep = elt.getHtmlRep();
			const select = H3.select(`##select-${i}.w100`, {onchange: e => setSequence(e, i)});
			rep.appendChild(select);
			source.sequence.map(item => item instanceof elt.constructor && select.appendChild(H3.option(item.properName, {value:item.name})));
			return rep;
		};
		const body = D.toolbar.body;
		[	H3.h3('Create Theorem'),
			H3.p(`Source instance: ${source.definition.defname}`),
			H3.p(`Target instance: ${target.defname}`),
			H3.label('Theorem basename:', {for:'new-definition'}),
			H3.input('##new-theorem.ifocus',
				{
					placeholder:'Theorem',
					title:'Theorem',
					onkeyup:e => D.inputBasenameSearch(e, R.actionDiagram, e => e.stopPropagation(), null, R.user.name + '/'),
					onkeydown:e => Cat.D.onEnter(e, action),
				}),
			...target.sequence.map(procElt),
			D.getIcon('edit', 'edit', action, {title:'Create theorem'}),
			H3.br(),
			H3.small('.italic', `Full name has the form sys/Action/${R.user.name}/basename`),
			H3.br(),
			H3.div('.center', H3.small('.bold', 'Following are selected for the theorem')),
		].map(elt => body.appendChild(elt));
		const focus = body.querySelector('.ifocus');
		focus && focus.focus();
	}
	action(e, diagram, ary)
	{
		this.doit(e, diagram, ary);
	}
	doit(e, diagram, ary)
	{
		const source = ary[0];
		const target = ary[1];
		const basename = D.toolbar.body.querySelector('#new-theorem').value;
		const sequence = target.sequence.map((elt, i) => diagram.getElement(D.toolbar.body.querySelector(`#select-${i}`).value));
		const seeds = target.action.action(e, diagram, sequence);
		const blobs = seeds.map(seed => diagram.getBlob(seed));
		const description = `Theorem: ${source.definition.defname} is ${target.defname}`;
		const bbox = diagram.svgRoot.getBBox();
		const xy = new D2({x:bbox.x, y:bbox.y + bbox.height + D.default.arrow.length});
		const theorem = new Theorem(diagram, {basename, source, target, sequence, blobs, description, xy});
		diagram.addSelected(theorem);
		diagram.viewElements(...diagram.selected);
	}
	replay(e, diagram, args)
	{
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 2 && ary[0] instanceof DefinitionInstance && ary[1] instanceof Definition;
	}
}

class TerminalAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a terminal morphism or object',
			basename:		'terminal',
			actionOnly:		true,
			priority:		-1,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const elt = this.doit(e, diagram, ary);
		diagram.log({command:'terminal', from:ary[0].name});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, ary)
	{
		if (ary.length === 1)
		{
			const elt = diagram.getSelected();
			const morphism = R.diagram.fctr(elt.to, [-1]);
			return diagram.placeMorphismByObject(e, 'domain', elt, morphism);
		}
		const one = diagram.get('FiniteObject', {size:1});
		return diagram.placeObject(one, D.mouse.diagramPosition(diagram));
	}
	hasForm(diagram, ary)	// one object or nothing
	{
		if (!diagram.isEditable() || ary.length > 1)
			return false;
		if (ary.length > 0)
		{
			const elt = ary[0];
			return elt instanceof IndexObject && elt.to.category;
		}
		return true;		// nothing selected
	}
}

class ElementOfAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Show an element of an object',
			basename:		'elementOf',
			actionOnly:		true,
			priority:		-1,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		diagram.newElement(e, 'object', elt => this.doit(e, diagram, from, elt));
	}
	doit(e, diagram, from, element)
	{
		return diagram.placeIndexElementOfByObject(e, from, from.to, element);
	}
	hasForm(diagram, ary)	// one object
	{
		if (!diagram.isEditable() || ary.length !== 1)
			return false;
		const elt = ary[0];
		return elt instanceof IndexObject && elt.to instanceof Category;
	}
}

class ElementInAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Show the element in an object',
			basename:		'elementIn',
			actionOnly:		true,
			priority:		-1,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const elt = this.doit(e, diagram, from);
		diagram.log({command:'elementIn', from:from.name});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, from)
	{
		return diagram.placeIndexElementOfByObject(e, from, from.to.category);
	}
	hasForm(diagram, ary)	// one object
	{
		if (!diagram.isEditable() || ary.length !== 1)
			return false;
		const elt = ary[0];
		return elt instanceof IndexObject || elt instanceof IndexMorphism;
	}
}

class ZoomAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Zoom to the selected elements',
			basename:		'zoom',
			actionOnly:		true,
			priority:		97,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		this.doit(e, diagram, ary);
	}
	doit(e, diagram, ary)
	{
		return diagram.viewElements(...ary);
	}
	hasForm(diagram, ary)
	{
		return true;
	}
}

class UserAction extends Action
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		super(diagram, nuArgs);
		const attributes = new Map('attributes' in nuArgs ? nuArgs.attributes : []);
		attributes.set('priority', U.getArg(args, 'priority', 0));
		const definition = diagram.getElement(nuArgs.definition);
		Object.defineProperties(this,
		{
			attributes:	{value:attributes,	writable:	false},
			definition:	{value:definition,	writable:	false},
		});
	}
	html()
	{
		super.html();
		const help = D.toolbar;
		help.body.appendChild(H3.h3(`Action ${U.HtmlEntitySafe(this.basename)}`));
		this.definition.hasAssertions() && help.body.appendChild(H3.span('Generate assertions from definition:', D.getIcon('edit', 'edit', e => this.action(e, R.diagram, R.diagram.selected))));
		const rows = [H3.tr(H3.th('Source'), H3.th('Target'))];
		rows.push(...this.definition.sequence.map((elt, i) => H3.tr(H3.td(elt.getHtmlRep()), H3.td(R.diagram.selected[i].getHtmlRep()))));
		help.table.appendChild(H3.table(rows));
		if (this.definition.generators.size > 0)
		{
			help.table.appendChild(H3.tr(H3.td(H3.hr())));
			this.definition.generators.forEach(m =>
			{
				const row = m.getHtmlRow();
				const toolbar = row.querySelector('.toolbar-element');
				toolbar.appendChild(D.getIcon('place-morphism', 'place', e => this.action(e, R.diagram, R.diagram.selected, m)), {title:'Generate morphism'});
				help.table.appendChild(row);
			});
		}
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Action'), H3.td(this.basename)));
		// TODO
	}
	action(e, diagram, ary, generator = null)
	{
		return this.doit(e, diagram, ary, generator);
	}
	_build(diagram, ref, eltMap)
	{
		if (eltMap.has(ref))
			return eltMap.get(ref);
		let newElt = null;
		if (ref instanceof CatObject)
		{
			if (ref.constructor.name === 'CatObject')
				return eltMap.get(ref);
			if (ref instanceof MultiObject)
			{
				const objects = ref.objects.map(o => this._build(diagram, o, eltMap));
				if (ref instanceof ProductObject)
					newElt = diagram[ref.dual ? 'coprod' : 'prod'](...objects);
				if (ref instanceof HomObject)
					newElt = diagram.hom(...objects);
			}
			else if (ref instanceof FiniteObject)
				newElt = diagram.get('FiniteObject', {size:ref.size});
			else
				switch(ref.constructor.name)
				{
					case 'NamedObject':
					default:
						debugger;
						break;		// TODO
				}
		}
		else if (ref instanceof Morphism)
		{
			if (ref.constructor.name === 'Morphism')
			{
				if (eltMap.has(ref))
					newElt = eltMap.get(ref);
				else
				{
					const domain = eltMap.get(ref.domain);
					const codomain = eltMap.get(ref.codomain);
					const basename = diagram.getAnon(ref.basename);
					newElt = new Morphism(diagram, {basename, domain, codomain, category:domain.category});
					eltMap.set(ref, newElt);
				}
				'recursor' in ref && newElt.setRecursor(this._build(diagram, ref.recursor, eltMap));
			}
			else if (ref instanceof MultiMorphism)
			{
				const morphisms = ref.morphisms.map(m => this._build(diagram, m, eltMap));
				if (ref instanceof Composite)
					newElt = diagram.comp(...morphisms);
				if (ref instanceof ProductMorphism)
					newElt = diagram[ref.dual ? 'coprod' : 'prod'](...morphisms);
				if (ref instanceof HomMorphism)
					newElt = diagram.hom(...morphisms);
				if (ref instanceof ProductAssembly)
					newElt = diagram[ref.dual ? 'coassy' : 'assy'](...morphisms);
				if (ref instanceof PullbackAssembly)
					newElt = diagram[ref.dual ? 'poAssy' : 'pbAssy'](...morphisms);
			}
			else
				switch(ref.constructor.name)
				{
					case 'FactorMorphism':
						newElt = diagram[ref.dual ? 'cofctr' : 'fctr'](this._build(diagram, ref[ref.dual ? 'codomain' : 'domain'], eltMap), ref.factors);
						break;
					case 'Identity':
						newElt = diagram.id(this._build(diagram, ref.domain, eltMap));
						break;
					case 'LambdaMorphism':
						newElt = diagram.lambda(this._build(diagram, ref, eltMap), ref.domFactors, ref.homFactors);
						break;
					case 'Evaluation':
						newElt = diagram.eval(this._build(diagram, ref.domain, eltMap), this._build(diagram, ref.domain.objects[0].objects[1], eltMap));
						break;
					case 'Distribute':
						const domain = this._build(diagram, ref.domain, eltMap);
						newElt = diagram.get('Distribute', {domain, side:ref.side});
						break;
					case 'NamedMorphism':
					case 'Dedistribute':
					default:
						debugger;
						break;	// TODO
				}
		}
		if (newElt === undefined)
			throw `type not handled: ${ref.constructor.name}`;
		eltMap.set(ref, newElt);
		return newElt;
	}
	doit(e, diagram, ary, generator = null)
	{
		const eltMap = new Map();
		this.definition.sequence.map((elt, i) =>
		{
			const to = 'to' in ary[i] ? ary[i].to : ary[i];
			eltMap.set(elt, to);
			if (to instanceof Morphism)
			{
				eltMap.set(elt.domain, to.domain);
				eltMap.set(elt.codomain, to.codomain);
			}
		});
		if (generator)
		{
			const morphism = this._build(diagram, generator, eltMap);
			diagram.placeMorphism(morphism);
		}
		else if (this.hasForm(diagram, ary, eltMap))
		{
			const cells = this.definition.getCells();
			const eltMap = new Map();
			const procMorphism = m => this._build(diagram, m.to, eltMap);
			cells.map(cell => {cell.left.map(procMorphism); cell.right.map(procMorphism);});
			const bbox = diagram.svgRoot.getBBox();
			let baseXY = new D2({x:bbox.x, y:bbox.y + bbox.height + D.default.arrow.length});
			const src2trgt = new Map();
			const seeds = [];
			const procObjects = cell =>
			{
				const objects = new Set();		// find the source objects in the cell
				const legObjects = m =>
				{
					objects.add(m.domain);
					objects.add(m.codomain);
				};
				cell.left.map(legObjects);
				cell.right.map(legObjects);
				const source = new D2({x:Number.POSITIVE_INFINITY, y:Number.POSITIVE_INFINITY});		// basepoint for the source cell
				let bottom = 0;
				objects.forEach(obj =>
				{
					source.x = Math.min(obj.x, source.x);
					source.y = Math.min(obj.y, source.y);
					bottom = Math.max(obj.y, bottom);
				});
				bottom = bottom - source.y;
				objects.forEach(obj =>
				{
					const sourceOffset = new D2(obj.getXY()).subtract(source);
					const xy = baseXY.add(sourceOffset);
					const target = eltMap.get(obj.to);
					src2trgt.set(obj, diagram.placeObject(target, xy, false));
				});
				baseXY = baseXY.add({x:0, y:bottom + D.default.arrow.length});
				seeds.push(src2trgt.get(cell.left[0].domain));
			};
			const morphisms = [];
			const procLeg = leg =>
			{
				leg.map(m =>
				{
					const to = eltMap.get(m.to);
					const domain = src2trgt.get(m.domain);
					const codomain = src2trgt.get(m.codomain);
					morphisms.push(diagram.placeMorphism(to, domain, codomain, false));
				});
			};
			cells.map(cell =>
			{
				procObjects(cell);
				procLeg(cell.left);
				procLeg(cell.right);
			});
			diagram.makeSelected(...morphisms);
			diagram.viewElements(...morphisms);
			return seeds;
		}
		return null;
	}
	hasForm(diagram, ary, eltMap = new Map())
	{
		let allObjects = false;
		let allMorphisms = false;
		let isBinaryOp = false;
		if (this.definition.sequence.length === ary.length && ary.filter(elt => elt instanceof CatObject || elt instanceof Morphism).length === ary.length)
			return this.definition.sequence.reduce((r, ref, i) => r && R.sameForm(ref, 'to' in ary[i] ? ary[i].to : ary[i], eltMap), true);	// do all elements have the same form?
		return false;
	}
	json()
	{
		const a = super.json();
		a.attributes = U.jsonMap(this.attributes);
		a.definition = this.definition.name;
		return a;
	}
}

class Category extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		let name = null;
		if ('name' in nuArgs)
			name = nuArgs.name;
		if (!name)
		{
			if ('user' in nuArgs)
				name = `${nuArgs.user}/${nuArgs.basename}`;
			else if (nuArgs.diagram)
				name = `${nuArgs.diagram}/${nuArgs.basename}`;
			else
				name = nuArgs.basename;
		}
		nuArgs.name = name;
		nuArgs.category = diagram && 'codomain' in diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			elements:		{value:	new Map(),	writable:	false},
			actions:		{value:	new Map(),	writable:	false},
			user:			{value:args.user,	writable:false},
		});
		'elements' in nuArgs && this.process(diagram, nuArgs.elements);
		if (this.constructor.name === 'Category')
		{
			this.setSignature();
			D && D.emitCategoryEvent('new', this);		// do not track index categories
		}
	}
	newObject(diagram, basename)
	{
		if (basename === '1')
			return diagram.getTerminal();
		if (basename === '2')
		{
			const one = diagram.getTerminal();
			return diagram.coprod(one, one);
		}
		if (!U.isValidBasename(basename))
			throw 'bad basename';
		const o = diagram.getElement(basename);
		return o ? o : new CatObject(diagram, {basename});
	}
	newMorphism(e, diagram, basename, dom = null, cod = null)
	{
		if (dom && cod)
		{
			const domain = this.newObject(diagram, dom);
			const codomain = this.newObject(diagram, cod);
			if (domain && codomain)
			{
				const m = diagram.getElement(basename);
				if (m)
				{
					if (m.domain === domain && m.codomain === codomain)
						return m;
					D.statusbar.show(e, 'morphism already exists with different domain or codomain');
				}
				if (!U.isValidBasename(basename))
					D.statusbar.show(e, 'Bad basename');
				return new Morphism(diagram, {basename, domain, codomain, category:domain.category});
			}
		}
		else
		{
			const m = diagram.getElement(basename);
			if (m instanceof Morphism)
				return m;
		}
		return null;
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Category')));
	}
	getCategorySignature()
	{
		let s = '';
		for (const [key, e] of this.elements)
			s += e.signature;
		return U.sig(`${this.constructor.name} ${this.name} ${s}`);
	}
	process(diagram, data)
	{
		const sync = diagram.sync;
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
			diagram.sync = false;
			data.filter((args, ndx) =>
			{
				switch(args.prototype)
				{
					case 'Category':
					case 'CatObject':
					case 'FiniteObject':
					case 'ProductObject':
					case 'HomObject':
					case 'NamedObject':
					case 'IndexObject':
					case 'IndexText':
					case 'IndexCode':
					case 'TensorObject':
					case 'PullbackObject':
						args.category = !('category' in args) ? this : args.category;
						procElt(args, ndx);
						break;
				}
			});
			const definitions = [];
			const theorems = [];
			const definitionInstances = [];
			data.map((args, ndx) =>
			{
				switch(args.prototype)
				{
					case 'Morphism':
					case 'Composite':
					case 'IndexMorphism':
					case 'FactorMorphism':
					case 'Functor':
					case 'Identity':
					case 'NamedMorphism':
					case 'ProductMorphism':
					case 'ProductAssembly':
					case 'PullbackAssembly':
					case 'LambdaMorphism':
					case 'HomMorphism':
					case 'Evaluation':
					case 'Distribute':
					case 'Dedistribute':
					case 'IndexElement':
						args.category = !('category' in args) ? this : args.category;
						procElt(args, ndx);
						break;
					case 'Definition':
						definitions.push(args);
						break;
					case 'DefinitionInstance':
						definitionInstances.push(args);
						break;
					case 'Theorem':
						theorems.push(args);
				}
			});
			definitions.map(procElt);
			definitionInstances.map(procElt);
			theorems.map(procElt);
			if (errMsg !== '')
				R.recordError(errMsg);
		}
		catch(x)
		{
			R.recordError(x);
		}
		diagram.sync = sync;
	}
	json()
	{
		const a = super.json();
		a.elements = U.jsonArray(this.elements);
		a.elements.map(elt => {delete elt.category; delete elt.diagram; delete elt.name;});
		return a;
	}
	getElement(name)
	{
		let element = null;
		if (typeof name === 'string')
			element = this.elements.get(name);
		if (!element && this.indexedDiagram)
			element = this.elements.get(this.indexedDiagram.name + '/' + name);
		if (element)
			return element;
		if (name && name instanceof Object && 'name' in name && this.elements.has(name.name))
			return name;
		return null;
	}
	deleteElement(elt, emit = true)
	{
		this.elements.delete(elt.name);
		this.elements.delete(elt.basename);
		if (elt.diagram)
		{
			elt.diagram.elements.delete(elt.basename);
			elt.diagram.elements.delete(elt.name);
			if (!(elt instanceof IndexMorphism) && !(elt instanceof IndexObject))
				R.removeEquivalences(elt.diagram, elt.name);
			D && emit && D.emitElementEvent(elt.diagram, 'delete', elt);
		}
	}
	forEachObject(fn)
	{
		this.elements.forEach(e => e instanceof CatObject && fn(e));
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(e => e instanceof Morphism && fn(e));
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
	getObjects()
	{
		const objects = [];
		this.forEachObject(o => objects.push(o));
		return objects;
	}
	getMorphisms()
	{
		const morphisms = [];
		this.forEachMorphism(m => morphisms.push(m));
		return morphisms;
	}
	getButtons()
	{
		const buttons = [];
		if (this.isEditable())
		{
			if (this.refcnt === 0)
				buttons.push(D.getIcon('delete', 'delete', e => this.decrRefcnt(), {title:'Delete category'}));
			if (this !== R.diagram.codomain)
				buttons.push(D.getIcon('edit', 'edit', e => D.setCategory(this), {title:'Set default category'}));
		}
		return buttons;
	}
	getHtmlRep()
	{
		const div = super.getHtmlRep();
		div.appendChild(H3.br());
		if (this.category)
		{
			div.appendChild(H3.span('Parent category:', '.tinyPrint'));
			div.appendChild(H3.span(this.category.name));
		}
		return div;
	}
	isEditable()
	{
		return this.refcnt === 0 && this.user === R.user.name || R.user.isAdmin();
	}
	static getLeg(ary)
	{
		if (ary.length < 1 || !(ary[0] instanceof Morphism))
			return [];
		const leg = [ary[0]];
		let last = null;
		for (let i=0; i<ary.length; ++i)
		{
			const elt = ary[i];
			if (elt instanceof Morphism)
			{
				if (last)
				{
					if (last.codomain === elt.domain)
						leg.push(elt);
					else
						return leg;
				}
				last = elt;
			}
			else
				return leg;		// no more leg
		}
		return leg;
	}
	static getLegs(ary)
	{
		let morphs = ary.filter(elt => elt instanceof Morphism);
		const legs = [];
		while(morphs.length > 0)
		{
			const leg = Category.getLeg(morphs);
			legs.push(leg);
			morphs = morphs.slice(leg.length);
		}
		return legs;
	}
	static isSink(ary, dual = false)		// dual for a source
	{
		if (ary.length < 2)		// just don't bother
			return false;
		if (!ary.reduce((r, m) => r && m instanceof IndexMorphism, true))	// all morphisms
			return false;
		const legs = Category.getLegs(ary);
		if (dual)
		{
			const obj = legs[0][0].domain;
			return legs.reduce((r, leg) => r && leg[0].domain === obj, true);		// first is a source
		}
		else
		{
			const firstLeg = legs[0];
			const obj = firstLeg[firstLeg.length -1].codomain;
			return legs.reduce((r, leg) => r && leg[leg.length -1].codomain === obj, true);		// last is a sink
		}
	}
}

class Morphism extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		let domain = null;
		if (args.domain instanceof CatObject)
			domain = args.domain;
		if (!domain)
			domain = diagram.getElement(args.domain, args.category);
		if (!domain)
			throw `no domain ${args.domain} for morphism ${args.basename}`;
		let codomain = null;
		if (args.codomain instanceof CatObject)
			codomain = args.codomain;
		if (!codomain)
			codomain = diagram.getElement(args.codomain, args.category);
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
			this[Symbol.iterator] = _ => this.data.values();
			this.postload = _ =>
			{
if (this.basename === "Cm{factorial,Id{hdole/nat/N64}dI}mC")debugger;
				this.data.forEach((d, i) => this.data.set(i, U.InitializeData(this.diagram, this.codomain, d)));
			};
		}
		if ('recursor' in args)
			this.setRecursor(args.recursor);
		this.domain.incrRefcnt();
		this.codomain.incrRefcnt();
		diagram && (!('addElement' in args) || args.addElement) && diagram.addElement(this);
		if (this.constructor.name === 'Morphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	getButtons()
	{
		return [D.getIcon('place-morphism', 'place', e => R.diagram.placeElement(this, D.mouse.diagramPosition(this.diagram)), {title:'Place morphism'})];
	}
	setSignature()
	{
		if ('data' in this)
			this.signature = U.dataSig(this.data);
		else
			super.setSignature();
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
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.domain.decrRefcnt();
			this.codomain.decrRefcnt();
			this.category && this.category.deleteElement(this);
			if ('recursor' in this)
			{
				const rec = this.recursor;
				delete this.recursor;		// prevent inf recursion
				rec.decrRefcnt();
			}
			if ('data' in this)
			{
				const values = [...this.data.values()];
				for (let i=0; i<values.length; ++i)
				{
					let val = values[i];
					if (typeof val === 'string' && this.codomain.getBase() instanceof HomObject)
						val = this.diagram.getElement(val);
					if (val instanceof Morphism)
						val.decrRefcnt();
				}
			}
		}
		super.decrRefcnt();
	}
	json()
	{
		const a = super.json();
		a.domain = this.domain.refName(this.diagram);
		a.codomain = this.codomain.refName(this.diagram);
		if (this.dual)
			a.dual = true;
		if ('data' in this)
		{
			const saved = new Map();
			const codomain = this.codomain;
			this.data.forEach((d, k) => d && saved.set(k, U.convertData(codomain, d)));		// drop undefined data
			a.data = U.jsonMap(saved);
		}
		if ('recursor' in this && this.recursor)
			a.recursor = this.recursor.name;
		return a;
	}
	isIterable()
	{
		return this.domain.isIterable();
	}
	uses(elt, start = true, limitors = new Set())		// True if the given morphism is used in the construction of this morphism somehow or identical to it
	{
		if (limitors.has(this))
			return false;
		if (elt instanceof CatObject)
			return this.domain.uses(elt, false, limitors) || this.codomain.uses(elt, false, limitors);
		if (this.isEquivalent(elt))
			return true;
		if ('data' in this)
		{
			const values = [...this.data.values()];
			for (let i=0; i<values.length; ++i)
			{
				let val = values[i];
				if (typeof val === 'string' && this.codomain.getBase() instanceof HomObject)
					val = this.diagram.getElement(val);
				if (val instanceof Morphism && val.uses(elt))
					return true;
			}
		}
		else if ('recursor' in this)
		{
			limitors.add(this);		// stop inf loop
			return this.recursor.uses(elt, false, limitors);
		}
		return false;
	}
	usecount(elt, start = true, limitors = new Set())
	{
		if (limitors.has(this))
			return 0;
		if (elt instanceof CatObject)
			return this.domain.usecount(elt, false, limitors) + this.codomain.usecount(elt, false, limitors);
		if (this.isEquivalent(elt))
			return 1;
		let cnt = 0;
		if ('data' in this)
		{
			const values = [...this.data.values()];
			for (let i=0; i<values.length; ++i)
			{
				let val = values[i];
				if (typeof val === 'string' && this.codomain.getBase() instanceof HomObject)
					val = this.diagram.getElement(val);
				if (val instanceof Morphism)
					cnt += val.usecount(elt);
			}
		}
		else if ('recursor' in this)
		{
			limitors.add(this);		// stop inf loop
			cnt += this.recursor.usecount(elt, false, limitors);
		}
		return cnt;
	}
	getGraph(data = {position:0})
	{
		const codData = U.clone(data);
		const domGraph = this.domain.getGraph(data);
		const codGraph = this.codomain.getGraph(codData);
		const graph = new Graph(this, {position:data.position, width:0, graphs:[domGraph, codGraph]});
		graph.check();
		return graph;
	}
	hasInverse()
	{
		return false;	// fitb
	}
	loadEquality()	// don't call in Morphism constructor since signature may change
	{
		const diagram = this.diagram;
		const sig = this.signature;
		R.loadEquality(diagram, this, [this], [this]);
		const domTermSig = FactorMorphism.Signature(diagram, this.domain);
		const codTermSig = FactorMorphism.Signature(diagram, this.codomain);
		R.loadSigs(diagram, this, [domTermSig], [sig, codTermSig]);
		R.loadSigs(diagram, this, [FactorMorphism.Signature(diagram, this.domain)], [sig, FactorMorphism.Signature(diagram, this.codomain)]);
		if ('data' in this)
			this.data.forEach((d, i) =>
			{
				const left = [U.dataSig([0, i]), this.signature];
				const right =[ U.dataSig([0, d]) ];
				R.loadEquality(diagram, this, left, right);
			});
	}
	textWidth()
	{
		return D.textWidth(this.domain.properName)/2 + D.textWidth(this.properName, 'morphTxt') + D.textWidth(this.codomain.properName)/2 + D.textWidth('&emsp;');
	}
	getHtmlRep()
	{
		const id = this.elementId();
		const items = [];
		const txt = this.properName !== '' && this.properName !== this.basename ? this.properName : this.basename;
		items.push(H3.span('.bold', txt + '&nbsp;:&nbsp;' + this.domain.properName + '&rarr;' + this.codomain.properName));
		this.description !== '' && items.push(H3.span('.diagramRowDescription', this.description));
		items.push(H3.br(), H3.span(U.limit(this.name), '.tinyPrint'));
		return H3.div({id}, items);
	}
	setRecursor(r)
	{
		let oldRecursor = null;
		if (this.recursor && this.recursor instanceof Morphism)
		{
			oldRecursor = this.recursor;
			this.recursor = null;
		}
		const rcrs = typeof r === 'string' ? this.diagram.getElement(r) : r;
		if (rcrs)
		{
			if (!rcrs.uses(this))
				throw `The recursive morphism does not refer to itself so no recursion.`;
			this.recursor = rcrs;
			this.recursor.incrRefcnt();
		}
		else	// have to set it later
		{
			this.recursor = r;
			this.postload = _ => this.setRecursor(r);
		}
		this.recursor === null && delete this.recursor;
		oldRecursor && oldRecursor.decrRefcnt();
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
	getArrowRep()
	{
		return `${this.properName} : ${this.domain.properName}&rarr;${this.codomain.properName}`;
	}
	isBare()
	{
		return 'recursor' in this ? false : super.isBare();
	}
	static HasRecursiveForm(ary)	// TODO move
	{
		if (ary.length === 2)
		{
			const r = ary[0];
			const f = ary[1];
			if (r instanceof IndexMorphism && f instanceof IndexMorphism)
				return f.to !== r.to && f.to.uses(r.to);
		}
		return false;
	}
	static isIdentity(morph)
	{
		if (morph instanceof ProductAssembly)
		{
			const objects = morph.dual ? morph.domain.objects : morph.codomain.objects;
			return objects.length === morph.morphisms.length && morph.morphisms.filter((m, i) => m instanceof FactorMorphism && m.factors.length ===1 && i === m.factors[0]).length === objects.length;
		}
		if (morph instanceof MultiMorphism)
			return morph.morphisms.reduce((r, m) => r && Morphism.isIdentity(m), true);
		if (morph instanceof FactorMorphism)
		{
			if (morph.dual)
				return FactorMorphism.isIdentity(morph.factors, 'objects' in morph.codomain ? morph.codomain.objects.length : 1);
			else
				return FactorMorphism.isIdentity(morph.factors, 'objects' in morph.domain.basic() ? morph.domain.basic().objects.length : 1);
		}
		return morph instanceof Identity;
	}
	static getProductFactors(morphism)
	{
		if (morphism instanceof FactorMorphism)
			return U.clone(morphism.factors);
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
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram ? diagram.getElement(args.domain, args.category) : args.domain;
		if ('codomain' in args && args.codomain)
			nuArgs.codomain = diagram ? diagram.getElement(args.codomain) : args.codomain;
		else
			nuArgs.codomain = nuArgs.domain;
		if (nuArgs.codomain && nuArgs.domain === null)
			nuArgs.domain = nuArgs.codomain;
		if (!nuArgs.domain || !nuArgs.codomain)
			throw 'domain issues';
		nuArgs.basename = Identity.Basename(diagram, {domain:nuArgs.domain, codomain:nuArgs.codomain});
		nuArgs.properName = 'properName' in nuArgs ? U.HtmlEntitySafe(nuArgs.properName) : Identity.ProperName(nuArgs.domain, nuArgs.codomain);
		super(diagram, nuArgs);
		if (this.constructor.name === 'Identity')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = Identity.Signature(this.diagram, this.domain);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		delete a.basename;
		delete a.name;
		if (a.codomain === a.domain)
			delete a.codomain;
		return a;
	}
	loadEquality()
	{
		R.loadIdentity(this.diagram, this);
		// identities of the components
		if (this.domain instanceof ProductObject)
		{
			const subs = this.domain.objects.map(o => Identity.Signature(this.diagram, o));
			const op = ProductMorphism.Signature(subs, this.dual);
			R.loadSigs(this.diagram, this, [this.signature], [op]);
		}
		else if (this.domain instanceof HomObject)
		{
			const subs = this.domain.objects.map(o => Identity.Signature(this.diagram, o));
			const op = HomMorphism.Signature(subs);
			R.loadSigs(this.diagram, this, [this], [op]);
		}
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Identity')));
	}
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.graphs[0].bindGraph({cod:g.graphs[1], index:[], domRoot:[0], codRoot:[1], offset:0, tag:this.constructor.name});
		g.tagGraph(this.constructor.name);
		return g;
	}
	isBare()
	{
		return false;
	}
	static Basename(diagram, args)
	{
		const domain = diagram.getElement(args.dual ? args.codomain : args.domain);
		const codomain = 'codomain' in args ? diagram.getElement(args.codomain) : null;
		let basename = '';
		if (domain && codomain && domain !== codomain)
			basename = `Id{${domain.refName(diagram)},${codomain.refName(diagram)}}dI`;
		else if (domain)
			basename = `Id{${typeof domain === 'string' ? domain : domain.refName(diagram)}}dI`;
		else if (codomain)
			basename = `Id{${typeof codomain === 'string' ? codomain : codomain.refName(diagram)}}dI`;
		return basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Identity.Basename(diagram, args)});
	}
	static ProperName(domain, codomain = null)
	{
		return '1';
	}
	static Signature(diagram, obj)
	{
		if (obj instanceof ProductObject)
			return ProductMorphism.Signature(obj.objects.map(o => Identity.Signature(diagram, o)), obj.dual);
		else if (obj instanceof HomObject)
			return HomMorphism.Signature(obj.objects);
		return U.sig(Identity.Codename(diagram, {domain:obj}));
	}
	static Get(diagram, args)
	{
		const nuArgs = U.clone(args);
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
		const nuArgs = U.clone(args);
		const source = diagram.getElement(args.source);
		nuArgs.dual = source.dual;
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.base = this.getBase();
		this.setSignature();
		this.source.incrRefcnt();
		this.idFrom = diagram.get('Identity', {properName:'&#8797;', domain:this, codomain:this.source});
		this.idTo = diagram.get('Identity', {properName:'&#8797;', domain:this.source, codomain:this});
		this.idFrom.incrRefcnt();
		this.idTo.incrRefcnt();
		this.refcnt = 0;	// id's increased it so set it back
		if (this.constructor.name === 'NamedObject')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = this.base.signature;
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
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Named object of:'), H3.td(this.source.properName)));
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
		grph.deepScan((g, ndx) => g.position = data.position);
		data.position += w;
		grph.width = w;
		return grph;
	}
	getSize()
	{
		return this.base.getSize();
	}
	uses(obj, start = true, limitors = new Set())		// True if the given object is used in the construction of this object somehow or identical to it
	{
		if (limitors.has(this))
			return true;
		return this.base.uses(obj, start);
	}
	usecount(obj, start = true, limitors = new Set())		// True if the given object is used in the construction of this object somehow or identical to it
	{
		if (limitors.has(this))
			return 0;
		return this.base.usecount(obj, start);
	}
	isBare()
	{
		return true;
	}
}

class NamedMorphism extends Morphism	// name of a morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		const source = diagram.getElement(nuArgs.source);
		nuArgs.category = diagram.codomain;
		nuArgs.domain = source.domain;
		nuArgs.codomain = source.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.base = this.getBase();
		this.source.incrRefcnt();
		if (this.constructor.name === 'NamedMorphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = this.constructor.name === 'NamedMorphism' ? this.source.signature : this.base.signature;
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
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Named morphism of:'), H3.td(this.source.properName)));
	}
	loadEquality()	// don't call in Morphism constructor since signature may change
	{
		super.loadEquality();
		R.loadEquality(this.diagram, this, [this], [this.source]);
		!this.source.isEquivalent(this.base) && R.loadEquality(this.diagram, this, [this], [this.base]);
	}
	getGraph(data = {position:0})
	{
		const oldData = U.clone(data);
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
	uses(mor, start = true, limitors = new Set())		// True if the given morphism is used in the construction of this morphism somehow or identical to it
	{
		if (limitors.has(this))
			return true;
		if (this.isEquivalent(mor))
			return true;
		return this.base.uses(mor, start);
	}
	usecount(mor, start = true, limitors = new Set())		// True if the given morphism is used in the construction of this morphism somehow or identical to it
	{
		if (limitors.has(this))
			return 0;
		if (this.isEquivalent(mor))
			return 1;
		return this.base.usecount(mor, start);
	}
	isBare()
	{
		return true;
	}
}

const Arrow =
{
	setupArrow(args)
	{
		Object.defineProperties(this,
		{
			bezier:		{value: null,		writable: true},
			svg:		{value: null,		writable: true},
			svg_path:	{value: null,		writable: true},
			svg_path2:	{value: null,		writable: true},
			svg_name:	{value: null,		writable: true},		// optional, e.g., IndexElement
			svg_nameGroup:	{value: null,	writable: true},		// optional, e.g., IndexElement
		});
		if (!this.attributes.has('bezier'))
			this.attributes.set('bezier', 0);
	},
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
		const normal = D2.subtract(pt2, pt1).normal().scale(this.attributes.get('flipName') ? 1 : -1).normalize();
		const adj = (normal.y < 0 && this.bezier) ? 0.5 : 0.0;
		const r = normal.scale((normal.y > 0 ? 1 + normal.y/2 : adj + 0.5) * D.default.font.height).add(mid);
		if (isNaN(r.x) || isNaN(r.y))
			return new D2();
		return D2.round(r);
	},
	adjustByHomset()
	{
		let ndx = this.attributes.get('bezier');
		if (ndx !== 0)
		{
			const midpoint = {x:(this.start.x + this.end.x)/2, y:(this.start.y + this.end.y)/2};
			const scale = 2;
			const offset = this.normal.scale(scale * D.default.font.height * ndx);
			const w = this.normal.scale(10 * ndx);
			this.start = this.start.add(w).round();
			this.end = this.end.add(w).round();
			let cp1 = offset.add(this.start.add(midpoint).scale(0.5)).round();
			let cp2 = offset.add(this.end.add(midpoint).scale(0.5)).round();
			this.bezier = {cp1, cp2, index:ndx, offset};
		}
		else
			this.bezier = null;
	},
	predraw()
	{
		let domBBox = D2.expand(this.domain.svg.getBBox(), D.default.margin);
		const domXY = this.domain.getXY();
		if (!(this.domain instanceof IndexMorphism))
			domBBox = domBBox.add(domXY);
		const codBBox = D2.expand(this.codomain.svg.getBBox(), D.default.margin).add(this.codomain.getXY());
		const delta = D2.subtract(this.codomain, domXY);
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
			start = this.closest(domBBox, this.codomain.getXY());
			end = this.closest(codBBox, this.domain.getXY());
		}
		start = start ? start.round() : new D2(this.domain.x, this.domain.y);
		end = end ? end.round() : new D2(this.codomain.x, this.codomain.y);
		this.angle = delta.angle();
		this.start = start;
		this.end = end;
		this.normal = this.end.subtract(this.start).normal().normalize();
		this.adjustByHomset();
		return end !== false;
	},
	updateDecorations()
	{
		if(this.svg_nameGroup)
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
			if (svg.style.textAnchor !== anchor)
				svg.style.textAnchor = anchor;
		}
	},
	getBasicCoords()
	{
		return this.bezier ?
				`M${this.start.x},${this.start.y} C${this.bezier.cp1.x},${this.bezier.cp1.y} ${this.bezier.cp2.x},${this.bezier.cp2.y} ${this.end.x},${this.end.y}`
			:
				`M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}`;
	},
	updateName()
	{
		if ('to' in this)
		{
			if (this.to.properName === '')
			{
				this.svg_name && this.svg_name.remove();
				this.svg_name = null;
				return;
			}
			let properName = this.to.properName;
			const quant = this.getQuantifier();
			if (quant)
			{
				const level = this.getLevel() -1;
				properName = '('.repeat(level) + R.Actions.definition.symbols[quant] + properName + ')'.repeat(level);
			}
			const args = {'data-type':'morphism', 'data-name':this.name, 'data-to':this.to.name, 'data-sig':this.to.signature, id:`${this.elementId()}_name`,
					onmouseenter:e => this.mouseenter(e), onmouseout:e => this.mouseout(e), onmouseover:e => this.mouseover(e), onmousedown:e => Cat.R.diagram.userSelectElement(e, this.name)};
			args.ondblclick = e => this.isEditable() && Cat.R.Actions.flipName.action(e, this.diagram, [this]);		// defer editable check
			this.svg_name = H3.text('.morphTxt.grabbable', args, properName);
			const width = D.textWidth(properName, 'morphTxt');
			const off = this.getNameOffset();
			if (isNaN(off.x) || isNaN(off.y))
				throw 'bad name offset';
			const bbox = {x:off.x, y:off.y, width, height:D.default.font.height};
			this.svg_nameGroup && this.svg_nameGroup.remove();
			this.svg_nameGroup = H3.g({transform:`translate(${bbox.x}, ${bbox.y + D.default.font.height})`}, this.svg_name);
			this.svg.appendChild(this.svg_nameGroup);
		}
	},
	makeSVG(node)
	{
		this.predraw();
		const coords = this.getBasicCoords();
		const id = this.elementId();
		const g = H3.g({id});
		const name = this.name;
		const onmouseenter = e => this.mouseenter(e);
		const onmouseout = e => this.mouseout(e);
		const onmouseover = e => this.mouseover(e);
		const onmousedown = e => Cat.R.diagram.userSelectElement(e, name);
		node.appendChild(g);
		this.svg = g;
		this.svg_path2 = H3.path('.grabme.grabbable', {'data-type':'morphism', 'data-name':name, class:'grabme grabbable', id:`${id}_path2`, d:coords, onmouseenter, onmouseout, onmouseover, onmousedown});
		g.appendChild(this.svg_path2);
		const cls = this.attributes.has('referenceMorphism') && this.attributes.get('referenceMorphism') ? 'referenceMorphism grabbable' : 'morphism grabbable';
		const to = 'to' in this ? this.to : this;
		this.svg_path = H3.path({'data-type':'morphism', 'data-name':name, 'data-to':to.name, 'data-sig':to.signature, class:cls, id:`${id}_path`, d:coords, onmouseenter, onmouseout, onmouseover, onmousedown});
		g.appendChild(this.svg_path);
		this.update();
	},
	update()
	{
		!this.svg && this.diagram.addSVG(this);
		this.predraw();
		this.updateName();
		if (this.graph)
		{
			let xy = new D2({x:this.domain.x - this.domain.width()/2, y:this.domain.y}).round();
			this.graph.graphs[0].updateXY(xy);	// set locations inside domain
			xy = new D2({x:this.codomain.x - this.codomain.width()/2, y:this.codomain.y}).round();
			this.graph.graphs[1].updateXY(xy);	// set locations inside codomain
		}
		const svg = this.svg_path;
		const start = this.start;
		const end = this.end;
		if (svg !== null && (start.x !== end.x || start.y !== end.y))
		{
			let startNormal = null;
			let endNormal = null;
			let bezier = null;
			let dbzr = null;
			let startTangent = null;
			let endTangent = null;
			if (this.bezier)
			{
				bezier = new Bezier([this.start, this.bezier.cp1, this.bezier.cp2, this.end]);
				dbzr = bezier.derivative();
				startTangent = dbzr.C(0).normalize();
				endTangent = dbzr.C(1).normalize().scale(-1);
			}
			else
			{
				endTangent = this.start.sub(this.end).normalize();
				startTangent = endTangent.scale(-1);
			}
			startNormal = startTangent.normal();
			endNormal = endTangent.normal();
			const barb = D.default.font.height / 4;
			let startCoords = '';
			let bodyCoords = '';
			let endCoords = '';
			// base style
			if (this.attributes.has('start'))
			{
				const width = D.default.font.height/2;
				this.start = this.start.add(startTangent.scale(width/2));
				let largeArc = 0;
				if (D2.innerProduct(startNormal, new D2({x:0, y:1})) > 0)
				{
					startNormal = startNormal.scale(-1);
					largeArc = 0;
				}
				const attr = this.attributes.get('start');
				switch(this.attributes.get('start'))
				{
					case 'includes':
						{
							const xy = startNormal.scale(width).add(this.start).round();
							startCoords = `M${xy.x},${xy.y} A${width/2},${width/2} 0 0 ${largeArc} ${this.start.x},${this.start.y} `;
						}
						break;
					case 'mono':
						{
							const upBarb = this.start.add(startNormal.scale(barb)).add(startTangent.scale(-barb)).round();
							const dwBarb = this.start.add(startNormal.scale(-barb)).add(startTangent.scale(-barb)).round();
							startCoords = `M${upBarb.x},${upBarb.y} L${this.start.x},${this.start.y} M${dwBarb.x},${dwBarb.y} L${this.start.x},${this.start.y}`;
						}
						break;
					default:
						console.error('IndexMorphism.update:  unknown attribute.start value', attr);
						break;
				}
			}
			else if ('getStart' in this)
				startCoords = this.getStart(startTangent, startNormal);
			bodyCoords = this.getBasicCoords();
			// end style
			const upBarb = this.end.add(endNormal.scale(barb)).add(endTangent.scale(barb)).round();
			const dwBarb = this.end.add(endNormal.scale(-barb)).add(endTangent.scale(barb)).round();
			endCoords = ` M${this.end.x},${this.end.y} L${upBarb.x},${upBarb.y} M${this.end.x},${this.end.y} L${dwBarb.x},${dwBarb.y}`;
			if (this.attributes.has('end'))
			{
				const attr = this.attributes.get('end');
				switch(attr)
				{
					case 'epi':
						{
							const off = endTangent.scale(barb);
							const up = upBarb.add(off);
							const dw = dwBarb.add(off);
							const md = this.end.add(off);
							endCoords += ` M${up.x},${up.y} L${md.x},${md.y} M${dw.x},${dw.y} L${md.x},${md.y}`;
						}
						break;
					default:
						console.error('IndexMorphism.update:  unknown attribute.end value', attr);
						break;
				}
			}
			const coords = startCoords + ' ' + bodyCoords + endCoords;
			svg.setAttribute('d', coords);
			this.svg_path2.setAttribute('d', coords);
			this.updateDecorations();
			if (this.attributes.has('referenceMorphism') && this.attributes.get('referenceMorphism'))
			{
				this.svg_path.classList.remove('morphism');
				this.svg_path.classList.add('referenceMorphism');
			}
			else
			{
				this.svg_path.classList.remove('referenceMorphism');
				this.svg_path.classList.add('morphism');
			}
		}
		if ('graph' in this)
			this.graph.updateGraph({root:this.graph, index:[], dom:this.domain.name, cod:this.codomain.name, visited:[], elementId:this.elementId()});
		if (this instanceof IndexMorphism)		// debugging tool
		{
			if (!this.domain.to.isEquivalent(this.to.domain))
				this.domain.svg.classList.add('badGlow');
			if (!this.codomain.to.isEquivalent(this.to.codomain))
				this.codomain.svg.classList.add('badGlow');
		}
	},
	getNameSvgOffset()
	{
		const matrix = this.svg_name.parentElement.transform.baseVal.getItem(0).matrix;
		return new D2(matrix.e, matrix.f);
	},
	showSelected(state = true)
	{
		[this.svg_path, this.svg_name, this.svg].map(svg => svg && svg.classList[state ? 'add' : 'remove']('selected'));
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);	// move front or back depending on state
	},
	getSvgNameBBox()
	{
		return this.getNameSvgOffset().add(this.svg_name.getBBox());
	},
	getBBox()
	{
		const boxes = [this.domain.getBBox(), this.codomain.getBBox()];
		this.svg_name && boxes.push(this.getSvgNameBBox());
		return D2.mergeBoxes(...boxes);
	},
	getXY()
	{
		const bbox = this.getBBox();
		return new D2({x:bbox.x + bbox.width/2, y:bbox.y + bbox.height/2});
	},
	intersect(bbox, side, m = D.default.arrow.margin)
	{
		let pnt = new D2();
		const domXY = this.domain.getXY();
		const x = bbox.x - m/2;
		const y = bbox.y;
		const width = bbox.width + m;
		const height = bbox.height;
		switch(side)
		{
		case 'top':
			pnt = D2.segmentIntersect(x, y, x + width, y, domXY.x, domXY.y, this.codomain.x, this.codomain.y);
			break;
		case 'bottom':
			pnt = D2.segmentIntersect(x, y + height, x + width, y + height, domXY.x, domXY.y, this.codomain.x, this.codomain.y);
			break;
		case 'left':
			pnt = D2.segmentIntersect(x, y, x, y + height, domXY.x, domXY.y, this.codomain.x, this.codomain.y);
			break;
		case 'right':
			pnt = D2.segmentIntersect(x + width, y, x + width, y + height, domXY.x, domXY.y, this.codomain.x, this.codomain.y);
			break;
		}
		return pnt;
	},
	closest(bbox, pnt)
	{
		const pntTop = this.intersect(bbox, 'top');
		const pntBtm = this.intersect(bbox, 'bottom');
		const pntLft = this.intersect(bbox, 'left');
		const pntRgt = this.intersect(bbox, 'right');
		let r = {x:Number.MAX_VALUE, y:Number.MAX_VALUE};
		if (pntTop)
			r = D2.updatePoint(pntTop, r, pnt);
		if (pntBtm)
			r = D2.updatePoint(pntBtm, r, pnt);
		if (pntLft)
			r = D2.updatePoint(pntLft, r, pnt);
		if (pntRgt)
			r = D2.updatePoint(pntRgt, r, pnt);
		if (r.x === Number.MAX_VALUE)
			r = new D2({x:pnt.x, y:pnt.y});
		return r;
	},
	finishMove()
	{
		const dom = this.domain.finishMove();
		const cod = this.codomain.finishMove();
		return dom || cod;
	},
	updateBezier(ndx)
	{
		const crnt = this.attributes.get('bezier');
		if (crnt !== ndx)
		{
			this.attributes.set('bezier', ndx);
			D.emitMorphismEvent(this.diagram, 'update', this);
		}
	},
	emphasis(on)
	{
		on ? D.emphasized.add(this) : D.emphasized.delete(this);
		this.svg_path.classList.remove('emphasis2');
		if (this.svg_name)
		{
			this.svg_name.classList.remove('emphasis2');
			this.svg_nameGroup.classList.remove('emphasis2');
			D.setClass('emphasis', on, this.svg_name);
		}
		D.setClass('emphasis', on, this.svg_path);
		this.svg_nameGroup && D.setClass('emphasis', on, this.svg_nameGroup);
	},
	isArrow(elt)
	{
		return elt instanceof IndexMorphism || elt instanceof IndexElement;
	},
};

class IndexMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.basename = U.getArg(args, 'basename', diagram.getAnon('m'));
		nuArgs.category = diagram.domain;
		const to = diagram.getElement(nuArgs.to);
		if (!to)
			throw 'no morphism to attach to index: ' + nuArgs.to;
		const domain = diagram.domain.getElement(nuArgs.domain);
		const codomain = diagram.domain.getElement(nuArgs.codomain);
		if (!domain.to.isEquivalent(to.domain))
			throw 'index morphism domain mismatched to target morphism';
		if (!codomain.to.isEquivalent(to.codomain))
			throw 'index morphism codomain mismatched to target morphism';
		super(diagram, nuArgs);
		domain.domains.add(this);
		codomain.codomains.add(this);
		this.setMorphism(to);
		this.incrRefcnt();
		this.diagram.domain.addMorphism(this);
		const attributes = new Map('attributes' in nuArgs ? nuArgs.attributes : []);
		Object.defineProperties(this,
		{
			attributes:		{value: attributes,	writable: false},
			domains:		{value: new Set(),	writable: false},
			codomains:		{value: new Set(),	writable: false},
		});
		this.setupArrow(nuArgs);
		if (this.constructor.name === 'IndexMorphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
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
		this.to.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Index:', '.italic.small'), H3.td(this.basename, D.getIcon('copyTo', 'copyTo', e => D.copyTo(e, this.basename), {title:'Copy to paste buffer'}), '.italic.small')));
		const to = this.to;
		let domainElt = null;
		let codomainElt = null;
		const diagram = R.diagram;
		if (this.isEditable() && this.refcnt <= 1 && this.to.refcnt <= 1)
		{
			const objects = this.diagram.getObjects();
			if (this.domain.refcnt === 2)
			{
				const setDomain = (e, dom) => this.setToDomain(diagram.getElement(e.target.value));
				domainElt = H3.select('##new-domain.w100', {onchange: e => setDomain(e, diagram.getElement(e.target.value))});
				domainElt.appendChild(H3.option(to.domain.properName, {value:to.domain.name, selected:true}));
				objects.map(o => o.name !== to.domain.name && domainElt.appendChild(H3.option(o.properName, {value:o.name})));
			}
			if (this.codomain.refcnt === 2)
			{
				const setCodomain = (e, dom) => this.setToCodomain(diagram.getElement(e.target.value));
				codomainElt = H3.select('##new-domain.w100', {onchange: e => setCodomain(e, diagram.getElement(e.target.value))});
				codomainElt.appendChild(H3.option(to.codomain.properName, {value:to.codomain.name, selected:true}));
				objects.map(o => o.name !== to.codomain.name && codomainElt.appendChild(H3.option(o.properName, {value:o.name})));
			}
		}
		if (!domainElt)
			domainElt = to.domain.properName;
		if (!codomainElt)
			codomainElt = to.codomain.properName;
		const table = D.toolbar.table;
		table.appendChild(H3.tr(H3.td('Domain:'), H3.td(domainElt)));
		table.appendChild(H3.tr(H3.td('Codomain:'), H3.td(codomainElt)));
		if ('recursor' in to)
		{
			const deleteRecursor = e =>
			{
				to.setRecursor(null);
				document.getElementById('help-recursor').remove();
			};
			const btn = to.isEditable() ? D.getIcon('delete', 'delete', deleteRecursor, {title:'Delete recursor'}) : '';
			table.appendChild(H3.tr('##help-recursor', H3.td('Recursor:'), H3.td(to.recursor.diagram.name, ':', to.recursor.properName, btn)));
		}
		const infoDisplay = H3.tr(H3.td('##info-display', {colspan:2}));
		if (R.canFormat(to) && !('code' in to) && !('recursor' in to))
		{
			let canMakeData = true;
			const domain = to.domain;
			const codomain = to.codomain;
			const sz = domain.getSize();
			const dataRow = (d,i) =>
			{
				if (d !== null)
				{
	// TODO?					const editDataBtn = D.getIcon('editData', 'edit', e => R.Actions.run.editData(e, i), {title:'Set data'});
	// TODO?					table.appendChild(H3.tr(H3.td(typeof i === 'number' ? i.toString() : i), H3.td(typeof d === 'number' ? d.toString() : d), H3.td(editDataBtn)));
					table.appendChild(H3.tr(H3.td(typeof i === 'number' ? i.toString() : i), H3.td(typeof d === 'number' ? d.toString() : d, D.getIcon('delete', 'delete', e => R.Actions.run.deleteData(e, to, d, i), {title:'Remove data'}))));
				}
			};
			table.appendChild(H3.tr(H3.th('Data in Morphism', {colspan:2})));
			table.appendChild(H3.tr(H3.td(H3.small('Domain')), H3.td(H3.small('Codomain'))));
			table.appendChild(H3.tr(H3.td(domain.properName + (domain.getBase() !== domain ? ` [${domain.getBase().properName}]` : ''), '.smallBold'),
									H3.td(codomain.properName + (codomain.getBase() !== codomain ? ` [${codomain.getBase().properName}]` : ''), '.smallBold')));
			if (sz < Number.MAX_VALUE && 'data' in to)
			{
				for (let i=0; i<sz; ++i)
				{
					const value = to.data.has(i) ? to.data.get(i) : null;
					const input = R.Actions.javascript.getInputHtml(codomain, value, i, [], i);
					dataRow(input, i);
				}
				canMakeData = false;
				// TODO domain not numeric
			}
			else if (to.isEditable())
			{
				const addDataBtn = D.getIcon('addInput', 'edit', e => R.Actions.run.addInput(infoDisplay), {title:'Add data'});
				table.appendChild(H3.tr(H3.td(R.Actions.javascript.getInputHtml(domain, null, 'dom')), H3.td(R.Actions.javascript.getInputHtml(codomain, null, 'cod'), addDataBtn)));
				'data' in to && to.data.forEach(dataRow);
			}
			if (canMakeData)
			{
				const createDataBtn = D.getIcon('createData', 'table', e => to.createData(e, diagram, from.name), {title:'Add data'});
				createDataBtn.style.display = 'none';
				table.appendChild(infoDisplay);
				table.appendChild(H3.tr(H3.td(createDataBtn, {colspan:2})));
				const watcher = (mutationsList, observer) =>
				{
					for(const m of mutationsList)
						createDataBtn.style.display = m.target.children.length > 0 ? 'block' : 'none';
				};
				const observer = new MutationObserver(watcher);
				observer.observe(infoDisplay, {childList:true});
			}
		}
		if (this.isEditable())
		{
			const inputArgs = {type:"number", onchange:e => this.updateBezier(Number.parseFloat(e.target.value)), min:-100, max:100, width:2, value:this.attributes.get('bezier')};
			D.toolbar.table.appendChild(H3.tr(H3.td('Offset factor'), H3.td(H3.input('.in100', inputArgs))));
			D.toolbar.table.appendChild(H3.tr(H3.td('Flip name'), H3.td(H3.input({type:"checkbox", onchange:e => Cat.R.Actions.flipName.action(e, this.diagram, [this])}))));
		}
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
		mor.domain = this.domain.basename;			// override global name to local
		mor.codomain = this.codomain.basename;			// override global name to local
		if (this.attributes.size > 0)
		{
			const keys = new Set(this.attributes.keys());
			if (keys.has('flipName') && !this.attributes.get('flipName'))
				keys.delete('flipName');
			if (keys.has('referenceMorphism') && !this.attributes.get('referenceMorphism'))
				keys.delete('referenceMorphism');
			if (keys.has('bezier') && this.attributes.get('bezier') === 0)
				keys.delete('bezier');
			if (keys.size > 0)
				mor.attributes = [...keys].map(key => [key, this.attributes.get(key)]);
		}
		mor.to = this.diagram.elements.has(this.to.basename) ? this.to.basename : this.to.name;
		if (mor.description === '')
			delete mor.description;
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
		to && to.incrRefcnt();
		this.to = to;
		return true;
	}
	setQuantifier(quant)
	{
		if (quant !== 'none')
		{
			this.attributes.set('quantifier', quant);
			if (!this.attributes.has('level'))
				this.attributes.set('level', 1);		// quantifiers start on level 1
		}
		else
		{
			this.attributes.delete('quantifier');
			this.attributes.delete('level');
		}
	}
	getQuantifier()
	{
		return this.attributes.get('quantifier');
	}
	getLevel()
	{
		return this.attributes.has('level') ? this.attributes.get('level') : 0;
	}
	updateFusible(e, on)
	{
		const path = this.svg_path;
		const name = this.svg_name;
		if (on)
		{
			D.statusbar.show(e, 'Fuse');
			path.classList.add('selected', 'grabbable', 'morphism', 'fuseMorphism');
			path.classList.remove('selected', 'grabbable', 'morphism', 'fuseMorphism');
			path.classList.add('fuseMorphism');
			path.classList.remove('selected', 'grabbable', 'morphism');
			name.classList.add('fuseMorphism');
			name.classList.remove('morphTxt', 'selected', 'grabbable');
			this.updateGlow(true, 'glow');
		}
		else
		{
			D.statusbar.show(e, '');
			path.classList.add('selected', 'grabbable', 'morphism');
			path.classList.remove('fuseMorphism');
			name.classList.add('morphTxt', 'selected', 'grabbable');
			name.classList.remove('fuseMorphism');
			this.updateGlow(false, '');
		}
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
			let xy = new D2({x:dom.x - dom.width()/2, y:dom.y}).round();
			this.graph.graphs[0].updateXY(xy);	// set locations inside domain
			xy = new D2({x:cod.x - cod.width()/2, y:cod.y}).round();
			this.graph.graphs[1].updateXY(xy);	// set locations inside codomain
			const id = this.graphId();
			this.graph.makeSVG(this.svg, id,
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
	isEndo()
	{
		return this.domain === this.codomain;
	}
	getHtmlRep()
	{
		return this.to.getHtmlRep();
	}
	setToDomain(obj, dual = false)
	{
		this.to.setDomain(obj);
		this.domain.setObject(obj);
		this.domain.svg.remove();
		this.domain.svg = null;
		this.domain.update();
		D.emitMorphismEvent(this.diagram, 'update', this);
	}
	setToCodomain(obj)
	{
		this.to.setCodomain(obj);
		this.codomain.setObject(obj);
		this.codomain.svg.remove();
		this.codomain.svg = null;
		this.codomain.update();
		D.emitMorphismEvent(this.diagram, 'update', this);
	}
	isBare()
	{
		return false;
	}
	getCells()
	{
		const cells = new Set(this.domain.cells);
		this.codomain.cells.forEach(cell => cells.add(cell));
		return cells;
	}
	checkCells()
	{
		this.getCells().forEach(cell => D.emitCellEvent(this.diagram, 'check', cell));
	}
	updateProperName()
	{
		this.svg_name.innerHTML = this.to.properName;
	}
	isFusible(m)
	{
		if (!(m && m instanceof IndexMorphism))
			return false;
		return this.to.isEquivalent(m.to);
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

Object.assign(IndexMorphism.prototype, Arrow);		// max Arrow functions into IndexMorphism

class IndexElement extends Element
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.basename = U.getArg(args, 'basename', diagram.getAnon('e'));
		nuArgs.category = diagram.domain;
		const domain = diagram.domain.getElement(nuArgs.domain);
		const codomain = diagram.domain.getElement(nuArgs.codomain);
		if (!IndexElement.hasForm(domain, codomain))
			throw 'bad form';
		if (!(domain instanceof IndexObject || domain instanceof IndexMorphism) && codomain instanceof IndexMorphism)
			throw 'bad domain or codomain';
		super(diagram, nuArgs);
		this.incrRefcnt();
		this.diagram.domain.elements.set(this.name, this);
		const attributes = new Map('attributes' in nuArgs ? nuArgs.attributes : [['bezier', 0]]);
		Object.defineProperties(this,
		{
			attributes:	{value: attributes,	writable: false},
			domain:		{value: domain,		writable: true},
			domains:	{value: new Set(),	writable: false},
			codomain:	{value: codomain,	writable: true},
			codomains:	{value: new Set(),	writable: false},
		});
		domain.incrRefcnt();
		codomain.incrRefcnt();
		domain.domains.add(this);
		codomain.codomains.add(this);
		this.setupArrow(args);
		if (this.constructor.name === 'IndexElement')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		D.toolbar.table.appendChild(H3.tr(H3.td('Index:', '.italic.small'), H3.td(this.basename, D.getIcon('copyTo', 'copyTo', e => D.copyTo(e, this.basename), {title:'Copy to paste buffer'}), '.italic.small')));
		super.help();
		if (this.isEditable())
		{
			const inputArgs = {type:"number", onchange:e => this.updateBezier(Number.parseFloat(e.target.value)), min:-100, max:100, width:2, value:this.attributes.get('bezier')};
			D.toolbar.table.appendChild(H3.tr(H3.td('Offset factor'), H3.td(H3.input('.in100', inputArgs))));
		}
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)	// this is the end
		{
			this.removeSVG();
			this.domain.domains.delete(this);
			this.codomain.codomains.delete(this);
			this.domain.decrRefcnt();
			this.codomain.decrRefcnt();
			this.category && this.category.deleteElement(this);
		}
		super.decrRefcnt();
	}
	json()
	{
		const a = super.json();
		a.domain = this.domain.basename;
		a.codomain = this.codomain.basename;
		a.attributes = U.jsonMap(this.attributes);
		return a;
	}
	getStart(tangent, normal)
	{
		const width = D.default.font.height/3;
		const backTangent = tangent.scale(-1);
		const base = this.start.add(backTangent.scale(-width));
		let largeArc = 1;
		if (D2.innerProduct(normal, new D2({x:0, y:1})) > 0)
		{
			normal = normal.scale(-1);
			largeArc = 0;
		}
		const xy1 = normal.scale(width).add(base);
		const ext = tangent.scale(0.9 * width);
		const xy0 = xy1.add(ext);
		const xy2 = normal.scale(-width).add(base);
		const xy3 = xy2.add(ext);
		const r = D2.dist(xy1, xy2)/2;
		return `M${xy0.x},${xy0.y} L${xy1.x},${xy1.y} A${r},${r} 0 0 ${largeArc} ${xy2.x},${xy2.y} L${xy3.x},${xy3.y}`;
	}
	getLevel()
	{
		return this.attributes.has('level') ? this.attributes.get('level') : 0;
	}
	isFusible(m)
	{
		return false;
	}
	updateFusible()
	{}
	setDomain(dom)
	{
		if (dom === this.domain)
			return;
		this.domain.decrRefcnt();
		this.domain.domains.delete(this);
		dom.incrRefcnt();
		this.domain = dom;
		this.domain.domains.add(this);
	}
	setCodomain(cod)
	{
		if (cod === this.codomain)
			return;
		this.codomain.decrRefcnt();
		this.codomain.codomains.delete(this);
		cod.incrRefcnt();
		this.codomain = cod;
		this.codomain.codomains.add(this);
	}
	static hasForm(domain, codomain)
	{
		if ((domain instanceof IndexObject || domain instanceof IndexMorphism) && codomain instanceof IndexObject)
			return codomain.to.elements.has(domain.to.name);
		return false;
	}
}

Object.assign(IndexElement.prototype, Arrow);

class Cell
{
	constructor(diagram, args)
	{
		const attributes = new Map('attributes' in args ? U.clone(args.attributes) : []);
		Object.defineProperties(this,
		{
			assertion:		{value: null,											writable:true},		// specified by user
			attributes:		{value:	attributes,										writable:true},
			basename:		{value: Cell.Basename(diagram, args.left, args.right),	writable:false},
			commutes:		{value: 'commutes' in args ? args.commutes : 'unknown',	writable:true},		// as determined by the equator engine
			diagram:		{value: diagram,										writable:false},
			hidden:			{value: 'hidden' in args ? args.hidden : false,			writable:true},
			left:			{value: args.left.slice(),								writable:false},		// morphisms, one side of the cell
			name:			{value: Cell.Name(diagram, args.left, args.right),		writable:false},
			right:			{value: args.right.slice(),								writable:false},		// morphisms, other side of the cell
			properName:		{value: '',												writable:true},
			signature:		{value: Cell.Signature(args.left, args.right),			writable:false},
			svg:			{value: null,											writable:true},
			x:				{value:	0,												writable:true},
			y:				{value:	0,												writable:true},
		});
		this.checkLegs();
		this.setProperName();
		D && D.emitCellEvent(this.diagram, 'new', this);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 0)
			this.removeAssertion();
		super.decrRefcnt();
	}
	checkLegs()
	{
		if (!Composite.isComposite(this.left) || !Composite.isComposite(this.right))
			throw 'bad leg';
		return true;
	}
	json()
	{
		const a =
		{
			name:		this.name,
			left:		this.left.map(m => m.basename),
			right:		this.right.map(m => m.basename),
			assertion:	this.assertion,
			hidden:		this.hidden,
		};
		if (this.attributes.size > 0)
			a.attributes = U.jsonMap(this.attributes);
		return a;
	}
	cellId(aux = null)
	{
		return U.SafeId(`Cell_${aux ? aux + '_' : ''}${this.name}`);
	}
	action(e, act)
	{
		switch(act)
		{
			case 'hide':
				this.hide();
				break;
			case 'show':
				this.show();
				break;
			case 'delete':
				this.removeAssertion();
				break;
			case 'equals':
			case 'notEqual':
				this.setAssertion(act);
				break;
			case 'unknown':
				this.assertion = null;
				break;
			default:
				throw 'Cell:  unknown action ' + act;
		}
		R.Actions.help.html(e, this.diagram, [this]);
	}
	getButtons()
	{
		const buttons = [];
		if (this.isEditable())
		{
			if (this.isHidden)
				buttons.push(D.getIcon('delete', 'delete', e => this.action(e, 'show', {title:'Reveal cell'})));
			else
				D.getIcon('hide', 'hide', e => this.action(e, 'hide'), {title:'Hide this cell'});
			if (this.assertion)
				buttons.push(D.getIcon('delete', 'delete', e => this.action(e, 'delete'), {title:'Remove assertion'}));
			else if (this.commutes === 'unknown')
				buttons.push(	D.getIcon('cell', 'cell', e => this.action(e, 'equals'), {title:'Set to equal'}),
								D.getIcon('help', 'help', e => this.action(e, 'unknown'), {title:'Set to unknown'}),
								D.getIcon('notEqual', 'notEqual', e => this.action(e, 'notEqual'), {title:'Set to not equal'}));
		}
		buttons.push(D.getIcon('viewCell', 'view', e => R.Actions.zoom.action(e, R.diagram, [this]), {title:'View cell'}));
		/*R.debug(1) &&*/ buttons.push(D.getIcon('edit', 'edit', e => this.check(), {title:'Check cell'}));
		return buttons;
	}
	isEqual()
	{
		if (this.assertion && this.assertion === 'equals')
			return true;
		switch(this.commutes)
		{
			case 'equals':
			case 'composite':
			case 'named':
			case 'computed':
			case 'pullback':
			case 'pushout':
				return true;
			default:
				return false;
		}
	}
	help()
	{
		const body = D.toolbar.body;
		body.appendChild(H3.h3('Cell'));
		body.appendChild(H3.h4(this.properName));
		body.appendChild(H3.p(H3.span('Commutivity: '), H3.span('.bold', U.Cap(this.commutes))));
		const buttons = this.getButtons();
		D.toolbar.table.appendChild(H3.tr(H3.td('Index:', '.italic.small'), H3.td(this.basename, D.getIcon('copyTo', 'copyTo', e => D.copyTo(e, this.basename), {title:'Copy to paste buffer'}), '.italic.small')));
		body.appendChild(H3.p(buttons));
		body.appendChild(H3.p('.bold', 'Left leg:'));
		this.left.map(m => body.appendChild(H3.span('.element', m.to.getArrowRep(), {onmouseenter:e => m.emphasis(true), onmouseleave:e => m.emphasis(false)})));
		body.appendChild(H3.p('.bold', 'Right leg:'));
		this.right.map(m => body.appendChild(H3.span('.element', m.to.getArrowRep(), {onmouseenter:e => m.emphasis(true), onmouseleave:e => m.emphasis(false)})));
	}
	setGlow()
	{
		if (this.svg)	// TODO?
		{
			this.svg.classList.remove('cellTxt');
			this.svg.classList.remove('badCell');
			this.svg.classList.remove('hiddenCell');
			this.hidden && this.classList.add('hiddenCell');
			let cls = '';
			if (!this.assertion)
			{
				switch(this.commutes)
				{
					case 'unknown':
						cls = 'badCell';
						break;
					default:
						cls = 'cellTxt';
						break;
				}
			}
			else
				cls = 'cellTxt';
			// TOOD assertion contradicts
			cls !== '' && this.svg.classList.add(cls);
		}
	}
	getLevel()
	{
		if (this.attributes.has('level'))
			return this.attributes.get('level');
		return this.getIntrinsicLevel();
	}
	setProperName()
	{
		const properName = this.cellMap();
		const level = this.getLevel();
		this.properName = properName !== '' ? '('.repeat(level) + properName + ')'.repeat(level) : '';
	}
	setAssertion(act)
	{
		switch(act)
		{
			case 'equals':
			case 'notEqual':
			case 'unknown':
				this.assertion = act;
				break;
			default:
				throw 'Not allowed';
		}
		this.setProperName();
		this.left.map(m => m.incrRefcnt());
		this.right.map(m => m.incrRefcnt());
		this.loadEquality();
		D && D.emitCellEvent(this.diagram, act, this);
	}
	getIntrinsicLevel()
	{
		let lvl = 0;
		[...this.left, ...this.right].map(m =>
		{
			lvl = Math.max(lvl, m.getLevel());
			lvl = Math.max(lvl, m.domain.getLevel());
			lvl = Math.max(lvl, m.codomain.getLevel());
		});
		return lvl;
	}
	canDecreaseLevel(blob)
	{
		const inLvl = this.getIntrinsicLevel();
		if (this.attributes.has('level'))
			return inLvl < this.attributes.get('level');
		return false;
	}
	canIncreaseLevel(blob)
	{
		const lvl = this.getLevel();
		const maxLvl = blob.levels.length;
		return lvl < maxLvl && blob.levels[lvl].filter(item => item instanceof Cell).length > 1;
	}
	setLevel(level)
	{
		this.attributes.set('level', level);
		this.setProperName();
		D.emitCellEvent(this.diagram, 'update', this);
	}
	removeAssertion()
	{
		this.removeItem();
		this.assertion = null;
		this.commutes = 'unknown';
		this.left.map(m => m.decrRefcnt());
		this.right.map(m => m.decrRefcnt());
		D.emitCellEvent(this.diagram, 'removeAssertion', this);
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
	register()		// for new cells
	{
		this.getObjects().map(o => o.cells.add(this));
		[...this.left, ...this.right].map(m =>
		{
			if (!(this.diagram.domain.morphismToCells.has(m)))
				this.diagram.domain.morphismToCells.set(m, []);
			const cells = this.diagram.domain.morphismToCells.get(m);
			cells.push(this);
		});
	}
	deregister()		// for cells that no longer exist
	{
		this.getObjects().map(o => o.cells.delete(this));		// remove cell from objects on the cell
		this.diagram.domain.cells.delete(this.name);
		D && this.removeSVG();
	}
	getXY()
	{
		const objects = new Set();
		this.left.map(m => objects.add(m.domain));
		this.left.map(m => objects.add(m.codomain));
		this.right.map(m => objects.add(m.domain));
		this.right.map(m => objects.add(m.codomain));
		const r = D.barycenter([...objects]).round();
		if (isNaN(r.x) || isNaN(r.y))
			return new D2();
		return r;
	}
	onmouseenter(e)
	{
		D.mouseover = this;
		this.emphasis(true);
	}
	onmouseout(e)
	{
		if (D.mouseover === this)
		{
			D.mouseover = null;
			this.emphasis(false);
		}
	}
	onmouseover(e)
	{
		D.mouseover = this;
		this.emphasis(true);
	}
	onmousedown(e)
	{
		Cat.R.diagram.userSelectElement(e, this);
	}
	makeSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in makeSVG`;
		if (this.svg)
			this.svg.remove();
		const name = this.name;
		const svg = H3.text('.grabbable', {id:this.cellId(), 'data-type':'cell', 'data-name':this.name, 'text-anchor':'middle', x:this.x, y:this.y + D.default.font.height/2}, this.properName);
		svg.onmouseenter = e => this.onmouseenter(e);
		svg.onmouseleave = e => this.onmouseout(e);
		svg.onmouseover = e => this.onmouseover(e);
		svg.onmousedown = e => this.onmousedown(e);
		node.appendChild(svg);
		this.svg = svg;
		this.diagram.selected.filter(elt => elt instanceof Cell && elt.name === this.name).map(cell => cell.showSelected());
	}
	removeSVG()
	{
		if (this.diagram.svgRoot)
		{
			this.svg && this.svg.remove();
			this.svg = null;
		}
	}
	update()
	{
		if (this.diagram.ready !== 0)
		{
			if (this.diagram.ready === -1 && !this.diagram.svgRoot)
				return;
			setTimeout(_ => this.update());
			return;
		}
		if (!this.svg)
			this.makeSVG(this.diagram.svgBase);
		this.setProperName();
		this.setGlow();
		const hideit = this.left.reduce((r, m) => r || (m.attributes.has('referenceMorphism') && m.attributes.get('referenceMorphism')), false) ||
							this.right.reduce((r, m) => r || (m.attributes.has('referenceMorphism') && m.attributes.get('referenceMorphism')), false);
		if (hideit)
			this.svg.innerHTML = '';
		else
			this.svg.innerHTML = this.properName;
		if (this.properName !== '')
		{
			const width = D.textWidth(this.properName, 'cellTxt');
			const xy = this.getXY();
			if (isNaN(xy.x) || isNaN(xy.y))
				throw 'NaN!';
			this.x = xy.x + width/2;
			this.y = xy.y;
			const bbox = {x:xy.x - width/2, y:xy.y - D.default.font.height/2, width, height:D.default.font.height};
			const place = this.diagram.autoplaceSvg(bbox, this.name);
			this.svg.setAttribute('x', place.x + width/2);
			this.svg.setAttribute('y', place.y + D.default.font.height);
		}
	}
	isSimple()
	{
		if (!Composite.isComposite(this.left) || !Composite.isComposite(this.right))
			throw 'bad leg';
		const left = new Set(this.left);
		if (left.size !== this.left.length)	// no repeat morphisms
			return false;
		const right = new Set(this.right);
		if (right.size !== this.right.length)	// no repeat morphisms
			return false;
		const checkObjects = leg =>		// no shared objects on leg
		{
			const objs = new Set([leg[0].domain, ...leg.map(m => m.codomain)]);
			return objs.size === leg.length + 1;
		};
		if (!checkObjects(this.left) || !checkObjects(this.right))
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
	getBBox()
	{
		return D2.mergeBoxes(...[...this.left, ...this.right].map(a => a.getBBox()));
	}
	setCommutes(type)
	{
		this.commutes = type;
		if (!this.assertion)
		{
			this.setProperName();
			this.setGlow();
		}
	}
	show()
	{
		this.hidden = false;
		this.svg && this.update();
		D.emitCellEvent(this.diagram, 'show', this);
	}
	hide()
	{
		this.hidden = true;
		this.svg && this.update();
		D.emitCellEvent(this.diagram, 'hide', this);
	}
	getHtmlRep()
	{
		const id = this.cellId();
		const headline = `${this.properName} ${this.assertion ? U.Cap(this.assertion) : U.Cap(this.commutes)}`;
		const items = [H3.h5(headline), H3.br()];
		items.push(H3.span('Left: ', this.left.map(m => m.to.properName).join(', '), '.tinyPrint'));
		items.push(H3.span(' Right: ', this.right.map(m => m.to.properName).join(', '), '.tinyPrint'));
		return H3.div({id}, items);
	}
	getHtmlRow()
	{
		const html = this.getHtmlRep();
		html.classList.add('element');
		const tools = H3.span('.toolbar-element');
		html.appendChild(tools);
		const buttons = this.getButtons();
		buttons.map(btn => tools.appendChild(btn));
		const onmouseenter = e =>
		{
			this.diagram === R.diagram && this.emphasis(true);
			tools.style.opacity = 100;
		};
		const onmouseleave = e =>
		{
			this.diagram === R.diagram && this.emphasis(false);
			tools.style.opacity = 0;
		};
		return H3.tr(H3.td(html), {onclick:e => {}, onmouseenter, onmouseleave});
	}
	isEditable()
	{
		return this.diagram.isEditable();
	}
	isFusible()
	{
		return false;
	}
	updateFusible(e)
	{}
	updateGlow(state, glow)	// same as Element
	{
		!this.svg && this.makeSVG(this.diagram.svgBase);
		this.svg.classList.remove(...['glow', 'badGlow']);
		state && this.svg.classList.add(glow);
	}
	emphasis(on)
	{
		on ? D.emphasized.add(this) : D.emphasized.delete(this);
		!this.svg && this.makeSVG(this.diagram.svgBase);
		D.setClass('emphasis', on, this.svg);
		this.left.map(m => m.emphasis(on));
		this.right.map(m => m.emphasis(on));
	}
	showSelected(state = true)
	{
		!this.svg && this.makeSVG(this.diagram.svgBase);
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	loadEquality()
	{
		if (this.assertion && (this.assertion === 'equals' || this.assertion === 'notEqual'))
			R.loadEquality(this.diagram, this, this.left.map(m => m.to), this.right.map(m => m.to), this.assertion === 'equals');
	}
	removeItem()
	{
		R.removeEquivalences(this.diagram, this.name);
	}
	check(fn = null)
	{
		R.checkEquivalence(this, fn);
	}
	cellMap(type)
	{
		if (this.assertion)
		{
			switch(this.assertion)
			{
				case 'equals':
					return '&#10226;';
				case 'notEqual':
					return '&#8800;';
				case 'unknown':
					return '&#8799;';
				default:
					return '?';
			}
		}
		if (D && D.default.showCommutivity)
		{
			switch(this.commutes)
			{
				case 'equals':
					return '&#10226;';
				case 'computed':
					return '&#10226;';
				case 'composite':
					return '&#8797;';
				case 'hidden':
					return '&#9676;';
				case 'notEqual':
					return '&#8800;';
				case 'named':
					return '&#8797;';
				case 'unknown':
					return '&#8799;';
				case 'pullback':
					return '&#8988;';	// upper left corner
				case 'pushout':
					return '&#8891;';	// bottom right corner
				default:
					return '?';
			}
		}
		else
		{
			switch(this.commutes)
			{
				case 'notEqual':
					return '&#8800;';
				case 'unknown':
					return '&#8799;';
				case 'pullback':
					return '&#8988;';	// upper left corner
				case 'pushout':
					return '&#8891;';	// bottom right corner
				default:
					return '';
			}
		}
	}
	cellIsComposite()
	{
		function fn(left, right)
		{
			if (left.length === 1 && left[0].to instanceof Composite)
			{
				const morphisms = left[0].to.morphisms;
				if (morphisms.length === right.length)
					return morphisms.reduce((r, m, i) => r && m === right[i].to, true);
			}
			return false;
		}
		return fn(this.left, this.right) || fn(this.right, this.left);
	}
	forEachElement(fn)
	{
		this.left.map(m => fn(m));
		this.right.map(m => fn(m));
	}
	static Signature(left, right)
	{
		const leftLeg = [];
		left.map(m => m instanceof Composite ? m.getSignatures().map(sig => leftLeg.push(sig)) : leftLeg.push(m.signature));
		const rightLeg = [];
		right.map(m => m instanceof Composite ? m.getSignatures().map(sig => rightLeg.push(sig)) : rightLeg.push(m.signature));
		return U.SigArray([leftLeg, rightLeg]);
	}
	static Get(diagram, left, right)
	{
		const name = Cell.Name(diagram, left, right);
		let cell = null;
		if (diagram.domain.cells.has(name))
			cell = diagram.domain.cells.get(name);
		else
		{
			cell = new Cell(diagram, {left, right});
			diagram.domain.cells.set(name, cell);
		}
		return cell;
	}
	static CommonLink(left, right)
	{
		return left.filter(m => right.includes(m));
	}
	static HasSubCells(cells, left, right)
	{
		const lefties = new Set(left);
		let blobCount = 0;
		let firstInBlob = true;
		for (let i=0; i<right.length; ++i)
		{
			const m = right[i];
			if (lefties.has(m))
			{
				firstInBlob = true;
			}
			else
			{
				if (firstInBlob)
				{
					firstInBlob = false;
					blobCount++;
				}
			}
		}
		return blobCount > 1;
	}
	static Basename(diagram, leftLeg, rightLeg)
	{
		const left = leftLeg.map(from => from.basename).join();
		const right = rightLeg.map(from => from.basename).join();
		if (left === right)
			throw 'cannot form cell name from equal legs';
		return left < right ? `{${left}},{${right}}` : `{${right}},{${left}}`;		// normalize
	}
	static Name(diagram, leftLeg, rightLeg)
	{
		return diagram.name + '/' + Cell.Basename(diagram, leftLeg, rightLeg);
	}
}

class IndexBlob
{
	constructor(seed)		// index object or morphism
	{
		Object.defineProperties(this,
		{
			'seed':			{value:seed,		writable: false},
			'objects':		{value:new Set(),	writable: false},
			'morphisms':	{value:new Set(),	writable: false},
			'levels':		{value:[],			writable: true},
			'cells':		{value:new Set(),	writable: false},
			'quantifiers':	{value:new Set(),	writable: false},
		});
		const ndxObj = IndexBlob.getObject(seed);
		const scanning = [ndxObj];
		const scanned = new Set();
		while(scanning.length > 0)
		{
			const domain = scanning.pop();
			scanned.add(domain);
			this.objects.add(domain);
			const scan = scanning;		// jshint
			domain.domains.forEach(m =>
			{
				if (this.morphisms.has(m) || m instanceof IndexElement)
					return;
				this.morphisms.add(m);
				// propagate down the arrow
				!scanned.has(m.codomain) && scan.push(m.codomain);
			});
			// propagate back up the arrow
			domain.codomains.forEach(m => !scanned.has(m.domain) && m.domain instanceof IndexObject && scan.push(m.domain));
		}
		this.objects.forEach(o => o.cells.forEach(cell => this.cells.add(cell)));
		this.updateLevels();
	}
	updateLevels()
	{
		const base = [...this.morphisms].filter(m => m.getQuantifier());		// level 0 are the ground terms
		const baseObjects = new Set();
		const baseMorphisms = new Set();
		const scanned = new Set();
		const procElt = elt =>
		{
			if (scanned.has(elt))
				return;
			scanned.add(elt);
			if (elt instanceof MultiObject)
				elt.objects.map(obj => procElt(obj));
			else if (elt instanceof MultiMorphism)
				elt.morphisms.map(m => procElt(m));
			else if (elt instanceof CatObject && elt.isBare())
				baseObjects.add(elt);
			else if (elt instanceof Morphism)
			{
				if (elt.isBare())
				{
					procElt(elt.domain);
					procElt(elt.codomain);
					baseMorphisms.add(elt);
				}
				else if ('recursor' in elt)
					procElt(elt.recursor);
			}
		};
		[...this.morphisms].map(m => m.to).map(procElt);
		this.levels = [[...baseObjects, ...baseMorphisms]];
		this.quantifiers.clear();
		this.morphisms.forEach(m =>
		{
			const quant = m.getQuantifier();
			if (quant)
			{
				this.quantifiers.add(m.to);
				const lvl = m.getLevel();
				if (this.levels[lvl] === undefined)
					this.levels[lvl] = [];
				const onLevel = this.levels[lvl];
				onLevel.push(m.to);
			}
		});
		this.cells.forEach(cell =>
		{
			const lvl = cell.getLevel();
			if (this.levels[lvl] === undefined)
				this.levels[lvl] = [];
			const onLevel = this.levels[lvl];
			onLevel.push(cell);
		});
	}
	getLevel()
	{
		let lvl = 0;
		this.objects.forEach(o => {lvl = Math.max(lvl, o.getLevel());});
		this.morphisms.forEach(m => {lvl = Math.max(lvl, m.getLevel());});
		this.cells.forEach(c => {lvl = Math.max(lvl, c.getLevel());});
		return lvl;
	}
	getQuantifierLevel()
	{
		let lvl = 0;
		this.objects.forEach(o => {lvl = Math.max(lvl, o.getLevel());});
		this.morphisms.forEach(m => {lvl = Math.max(lvl, m.getLevel());});
		this.cells.forEach(c => {lvl = Math.max(lvl, c.getLevel());});
		return lvl;
	}
	hasReference()
	{
		if (!('_hasReference' in this))
		{
			for (let m of this.morphisms)
				if (m.attributes.has('referenceMorphism') && m.attributes.get('referenceMorphism'))
				{
					this._hasReference = true;
					return true;
				}
		}
		else
			return this._hasReference;
		this._hasReference = false;
		return false;
	}
	hasAssertion()
	{
		if (!('_hasAssertion' in this))
		{
			for (let cell of this.cells)
				if (cell.assertion)
				{
					this._hasAssertion = true;
					return true;
				}
		}
		else
			return this._hasAssertion;
		this._hasAssertion = false;
		return false;
	}
	has(...elts)
	{
		return elts.reduce((r, elt) => this.objects.has(elt) || this.morphisms.has(elt), true);
	}
	getInstances(to)
	{
		return [...this[to instanceof CatObject ? 'objects' : 'morphisms']].filter(o => o.to === to);
	}
	forEachElement(doit)
	{
		this.objects.forEach(o => doit(o));
		this.morphisms.forEach(m => doit(m));
	}
	getIndexElement(elt)
	{
		
		const nds = elt instanceof Morphism ? [...this.morphisms].filter(m => m.to === elt) : [...this.objects].filter(o => o.to === elt);
		return nds.length > 0 ? nds[0] : null;
	}
	static getObject(seed)
	{
		if (seed instanceof IndexObject)
			return seed;
		else if (seed instanceof IndexMorphism)
			return seed.domain;
		else if (seed instanceof Cell)
			return seed.left[0].domain;
		else if (seed instanceof IndexElement)
			return seed.domain instanceof IndexMorphism ? seed.domain.domain : seed.domain;
		else
			return seed;
	}
}

class IndexCategory extends Category
{
	constructor(diagram, args)
	{
		super(diagram, args);
		Object.defineProperties(this,
		{
			'cells':			{value:new Map(),	writable: false},
			'indexedDiagram':	{value:null,		writable: true},
			morphismToCells:	{value:new Map(),	writable:false},
		});
		if (this.constructor.name === 'IndexCategory')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Index Category')));
	}
	json()
	{
		const a = super.json();
		a.cells = [...this.cells.values()].filter(cell => cell.assertion !== null || cell.hidden).map(cell => cell.json());
		return a;
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
		const detachedObj = new IndexObject(from.diagram, {to, xy});
		if (dual)
			from.setCodomain(detachedObj);
		else
			from.setDomain(detachedObj);
		this.elements.delete(from.name);	// reset the order in the map
		this.elements.set(from.name, from);
		return detachedObj;
	}
	getCell(name)
	{
		return typeof name === 'string' ? this.cells.get(name) : name instanceof Cell ? name : null;
	}
	loadCells(cellData = null)
	{
		this.morphismToCells.clear();
		const foundCells = new Set();
		this.forEachObject(o =>
		{
			const paths = [];
			o.domains.forEach(m => m instanceof IndexMorphism && paths.push([m]));
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
						if (Cell.HasSubCells(this.cells, leg, alt))
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
							const cell = Cell.Get(this.indexedDiagram, leg, alt);
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
				cod.domains.forEach(m =>
				{
					if (m instanceof IndexMorphism && !leg.includes(m))
					{
						const nuLeg = leg.slice();
						nuLeg.push(m);
						paths.push(nuLeg);
					}
				});	// TODO circularity test
			}
			cells.map(cell =>
			{
				cell.register();
				this.indexedDiagram.svgRoot && cell.update();
				foundCells.add(cell);
			});
		});
		this.cells.forEach(cell => !foundCells.has(cell) && cell.deregister());
		cellData && cellData.map(info =>
		{
			if (this.cells.has(info.name))
			{
				const cell = this.cells.get(info.name);
				cell.setAssertion(info.assertion);
				if (info.hidden)
					cell.hide();
				if ('attributes' in info)
				{
					cell.attributes = new Map(info.attributes);
					D && D.emitCellEvent(this.indexedDiagram, 'update', cell);
				}
			}
			else
				console.error('Missing cell', info.name);
		});
	}
	checkCells()
	{
		this.cells.forEach(cell => cell.check());
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
	uniquifyHomsetIndices(dom, cod)
	{
		const indices = [];
		const homset = this.getHomset(dom, cod);
		homset.map(m =>
		{
			if (indices.includes(m.attributes.get('bezier')))
			{
				m.attributes.set('bezier', Math.max(...indices) + 1);
				m.update();
			}
			indices.push(m.attributes.get('bezier'));
		});
	}
	getElements(ary)
	{
		return ary.map(e => this.getElement(e)).filter(e => e !== undefined && e !== null);
	}
}

class MultiMorphism extends Morphism
{
	constructor(diagram, args)
	{
		if (args.morphisms.length <= 1)
			throw 'not enough morphisms';
		const nuArgs = U.clone(args);
		super(diagram, nuArgs);
		const morphisms = diagram.getElements(nuArgs.morphisms);
		Object.defineProperty(this, 'morphisms', {value:morphisms, writable:true}); 	// TODO back to false
		this.morphisms.map(m => m.incrRefcnt());
	}
	setSignature()
	{
		this.signature = U.SigArray(this.expand().map(m => m.signature));
	}
	help(hdr)
	{
		super.help();
		D.toolbar.table.appendChild(hdr);
		D.toolbar.table.appendChild(H3.tr(H3.th('Morphisms', {colspan:2})));
		this.morphisms.map(m => D.toolbar.table.appendChild(H3.tr(H3.td({colspan:2}, m.getHtmlRow()))));
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.morphisms.map(m => m.decrRefcnt());
	}
	json(delBasename = true)
	{
		const a = super.json();
		delete a.properName;
		if (delBasename)
			delete a.basename;
		if (!('morphisms' in a))
			a.morphisms = this.morphisms.map(r => r.refName(this.diagram));
		return a;
	}
	uses(mor, start = true, limitors = new Set())
	{
		if (limitors.has(this))
			return true;
		if (!start && this.isEquivalent(mor))		// if looking for a recursive function, this and mor may be the same from the start
			return true;
		for (let i=0; i<this.morphisms.length; ++i)
			if (this.morphisms[i].uses(mor, false, limitors))
				return true;
		return false;
	}
	usecount(mor, start = true, limitors = new Set())
	{
		if (limitors.has(this))
			return 0;
		if (!start && this.isEquivalent(mor))		// if looking for a recursive function, this and mor may be the same from the start
			return 1;
		let cnt = 0;
		for (let i=0; i<this.morphisms.length; ++i)
			cnt += this.morphisms[i].usecount(mor, false, limitors);
		return cnt;
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
	updateBasename()
	{
		this.morphisms.map(m => m.updateBasename());
		super.updateBasename();
	}
	isBare()
	{
		return false;
	}
}

class Composite extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		if (morphisms.length !== args.morphisms.length)
			throw 'missing morphisms';
		const nuArgs = U.clone(args);
		nuArgs.basename = Composite.Basename(diagram, {morphisms});
		nuArgs.domain = Composite.Domain(morphisms);
		nuArgs.codomain = Composite.Codomain(morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.category = nuArgs.domain.category;		// must be in the same category
		for(let i=0; i<morphisms.length -1; ++i)
			if (!morphisms[i].codomain.isEquivalent(morphisms[i+1].domain))
			{
				console.error(`composite morphism codomain/domain mismatch at ${i}: ${morphisms[i].codomain.name} vs ${morphisms[i+1].domain.name}`);
				throw `domain and codomain are not the same\n${morphisms[i].codomain.properName}\n${morphisms[i+1].domain.properName} at index ${i}`;
			}
		nuArgs.properName = Composite.ProperName(morphisms);
		super(diagram, nuArgs);
		if (this.constructor.name === 'Composite')
		{
			this.setSignature();
			this.loadEquality();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = U.SigArray(this.expand().map(m => m.signature));
	}
	help()
	{
		super.help(H3.tr(H3.td('Type:'), H3.td('Composite')));
	}
	getDecoration()
	{
		return D.default.composite;
	}
	getCompositeGraph()
	{
		const graphs = this.morphisms.map(m => m.getGraph());
		const objects = this.morphisms.map(m => m.domain);
		objects.push(this.morphisms[this.morphisms.length -1].codomain);
		const sequence = this.diagram.get('ProductObject', {objects, silent:true});
		const graph = sequence.getGraph();		// bare graph to hang links on
		graphs.map((g, i) =>					// merge the individual graphs into the sequence graph
		{
			graph.graphs[i].mergeGraphs({from:g.graphs[0], base:[0], inbound:[i], outbound:[i+1]});
			graph.graphs[i+1].mergeGraphs({from:g.graphs[1], base:[1], inbound:[i+1], outbound:[i]});
		});
		this.morphisms.map((m, i) =>
		{
			graph.graphs[i].dom = m;
			graph.graphs[i+1].cod = m;
		});
		graph.element = this;
		graph.check();
		return graph;
	}
	getGraph(data = {position:0})
	{
		const seqGraph = this.getCompositeGraph();
		seqGraph.traceLinks(seqGraph);
		const cnt = this.morphisms.length;
		seqGraph.graphs[0].reduceLinks(cnt);
		seqGraph.graphs[cnt].reduceLinks(cnt);
		const graph = super.getGraph(data);
		graph.graphs[0].copyGraph({src:seqGraph.graphs[0], map:[[[0], [0]], [[cnt], [1]]]});
		graph.graphs[1].copyGraph({src:seqGraph.graphs[cnt], map:[[[0], [0]], [[cnt], [1]]]});
		return graph;
	}
	loadEquality()
	{
		super.loadEquality();
		R.loadEquality(this.diagram, this, [this], this.morphisms);
	}
	getSignatures(sigs = [])
	{
		this.morphisms.map(m => m instanceof Composite ? m.getSignatures(sigs) : sigs.push(m.signature));
		return sigs;
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
		const nuArgs = U.clone(args);
		const dual = U.getArg(args, 'dual', false);
		nuArgs.basename = ProductMorphism.Basename(diagram, {morphisms, dual});
		nuArgs.domain = ProductMorphism.Domain(diagram, morphisms, dual);
		nuArgs.codomain = ProductMorphism.Codomain(diagram, morphisms, dual);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = ProductMorphism.ProperName(morphisms, dual);
		super(diagram, nuArgs);
		if (this.constructor.name === 'ProductMorphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = ProductMorphism.Signature(this.morphisms.map(m => m.signature), this.dual);
	}
	json(delBasename = true)
	{
		const a = super.json(delBasename);
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
	loadEquality()
	{
		super.loadEquality();
		this.morphisms.map((m, i) =>
		{
			const pDom = FactorMorphism.Signature(this.diagram, this.domain, [i], this.dual);
			const pCod = FactorMorphism.Signature(this.diagram, this.codomain, [i], this.dual);
			if (this.dual)
				R.loadEquality(this.diagram, this, [this, pCod], [pDom, m]);
			else
				R.loadEquality(this.diagram, this, [pCod, this], [m, pDom]);
		});
	}
	updateProperName()
	{
		super.updateProperName();
		this.properName = MultiObject.ProperName(this.dual ? '&plus;' : '&times;', this.morphisms, this.dual);
	}
	updateBasename()
	{
		this.basename = ProductMorphism.Basename(this.diagram, this);
		super.updateBasename();
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
		const dual = U.getArg(args, 'dual', false);
		const nuArgs = U.clone(args);
		nuArgs.morphisms = diagram.getElements(args.morphisms);
		nuArgs.domain = ProductAssembly.Domain(diagram, nuArgs.morphisms, dual);
		nuArgs.codomain = ProductAssembly.Codomain(diagram, nuArgs.morphisms, dual);
		nuArgs.basename = ProductAssembly.Basename(diagram, {morphisms:nuArgs.morphisms, dual});
		nuArgs.properName = ProductAssembly.ProperName(nuArgs.morphisms, dual);
		super(diagram, nuArgs);
		if (this.constructor.name === 'ProductAssembly')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td(`${this.dual ? 'Co' : 'P'}roduct assembly`)));
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		const domNdx = this.dual ? 1 : 0;
		const codNdx = this.dual ? 0 : 1;
		this.morphisms.map((m, i) =>
		{
			const g = m.getGraph(data);
			graph.graphs[domNdx].copyGraph({src:g.graphs[domNdx], map:[[[codNdx], [codNdx, i]]]});
			graph.graphs[codNdx].graphs[i].copyGraph({src:g.graphs[codNdx], map:[[[domNdx], [domNdx]]]});
		});
		return graph;
	}
	loadEquality()
	{
		super.loadEquality();
		this.morphisms.map((m, i) =>
		{
			const args = {factors:[i], dual:this.dual};
			if (this.dual)
				args.codomain = this.codomain;
			else
				args.domain = this.domain;
			const factorMorphism = this.diagram.get('FactorMorphism', args);
			R.loadEquality(this.diagram, this, [m], this.dual ? [this, factorMorphism] : [factorMorphism, this]);
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
		if (dual)
			return diagram.coprod(...morphisms.map(m => m.domain));
		else
			return morphisms[0].domain;
	}
	static Codomain(diagram, morphisms, dual)
	{
		if (dual)
			return morphisms[0].codomain;
		else
			return diagram.prod(...morphisms.map(m => m.codomain));
	}
	static ProperName(morphisms, dual)
	{
		return `${dual ? '&Sigma;' : '&Pi;'}<${morphisms.map(m => m.properName).join(',')}>`;
	}
}

class PullbackAssembly extends MultiMorphism
{
	constructor(diagram, args)
	{
		const dual = U.getArg(args, 'dual', false);
		const nuArgs = U.clone(args);
		const target = dual ? 'domain' : 'codomain';
		const source = dual ? 'codomain' : 'domain';
		nuArgs.morphisms = diagram.getElements(args.morphisms);
		nuArgs.category = nuArgs.morphisms[0].category;		// must be in the same category
		nuArgs[source] = diagram.getElement(args[source], nuArgs.category);
		nuArgs[target] = diagram.getElement(args[target], nuArgs.category);
		if (!(nuArgs[target] instanceof PullbackObject) || dual !== nuArgs[target].dual)
			throw 'bad object definition for pullback/pushout';
		const assyArgs = {morphisms:nuArgs.morphisms, dual};
		if (dual)
			assyArgs.domain = args.domain;
		else
			assyArgs.codomain = args.codomain;
		nuArgs.basename = PullbackAssembly.Basename(diagram, assyArgs);
		nuArgs.properName = PullbackAssembly.ProperName(nuArgs.morphisms, dual);
		super(diagram, nuArgs);
		if (this.constructor.name === 'PullbackAssembly')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	json()
	{
		const a = super.json();
		if (this.dual)
			a.domain = this.domain.refName(this.diagram);
		else
			a.codomain = this.codomain.refName(this.diagram);
		return a;
	}
	help()
	{
		return super.help(H3.tr(H3.td('Type:'), H3.td(`${this.dual ? 'Co' : 'P'}roduct assembly`)));
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		const domNdx = this.dual ? 1 : 0;
		const codNdx = this.dual ? 0 : 1;
		const target = this.dual ? this.domain : this.codomain;
		this.morphisms.map((m, i) =>
		{
			const mGraph = m.getGraph(data);
			const pGraph = this.diagram.fctr(target, [i]).getGraph().reverse();
			const sequence = Graph.sequenceGraph(null, [mGraph, pGraph]);
			Graph.connectSequence(this, graph, sequence);
		});
		return graph;
	}
	loadEquality()
	{
		super.loadEquality();
		const dual = this.dual;
		const diagram = this.diagram;
		this.morphisms.map((m, i) =>
		{
			const args = {factors:[i], dual};
			if (dual)
				args.codomain = this.codomain;
			else
				args.domain = this.domain;
			const domainFactor = diagram.get('FactorMorphism', args);
			if (dual)
				args.codomain = this.domain;
			else
				args.domain = this.codomain;
			const codomainFactor = diagram.get('FactorMorphism', args);
			R.loadEquality(diagram, this, [m], dual ? [domainFactor, this] : [this, codomainFactor]);
		});
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		const objName = dual ? (typeof args.domain === 'string' ? args.domain : args.domain.refName(diagram)) : (typeof args.codomain === 'string' ? args.codomain : args.codomain.refName(diagram));
		const basename = `${c}Pu{${objName},${args.morphisms.map(m => typeof m === 'string' ? m : m.refName(diagram)).join(',')}}uP${c}`;
		return basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:PullbackAssembly.Basename(diagram, args)});
	}
	static Domain(diagram, morphisms, dual)
	{
		if (dual)
			return diagram.coprod(...morphisms.map(m => m.domain));
		else
			return morphisms[0].domain;
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
		const dual = U.getArg(args, 'dual', false);
		const nuArgs = U.clone(args);
		if (dual)
		{
			nuArgs.codomain = diagram.getElement(args.codomain, args.category);
			nuArgs.domain = FactorMorphism.Codomain(diagram, nuArgs.codomain, nuArgs.factors, dual);
		}
		else
		{
			nuArgs.domain = diagram.getElement(args.domain, args.category);
			nuArgs.codomain = FactorMorphism.Codomain(diagram, nuArgs.domain, nuArgs.factors, dual);
		}
		nuArgs.category = nuArgs.domain.category;		// must be in the same category
		const bargs = {factors:nuArgs.factors, dual};
		if (dual)
			bargs.codomain = nuArgs.codomain;
		else
			bargs.domain = nuArgs.domain;
		nuArgs.basename = FactorMorphism.Basename(diagram, bargs);
		nuArgs.properName = FactorMorphism.ProperName(diagram, dual ? nuArgs.codomain : nuArgs.domain, nuArgs.factors, dual);
		super(diagram, nuArgs);
		this.factors = nuArgs.factors;
		if (this.constructor.name === 'FactorMorphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = FactorMorphism.Signature(this.diagram, this.domain, this.factors, this.dual);
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td(`${this.dual ? 'Cofactor' : 'Factor'} morphism: ${this.factors}`)));
	}
	json()
	{
		const a = super.json();
		delete a.basename;		// will regenerate
		delete a.properName;	// will regenerate
		a.factors = this.factors.slice();
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
		let offset = 0;
		const hardFactorLength = this.factors.filter(f => f !== -1).length;
		this.factors.map((fctri, i) =>
		{
			const fctr = Array.isArray(fctri) ? fctri.slice() : [fctri];
			let cod = null;
			let domRoot = null;
			let codRoot = null;
			if (this.dual)
			{
				const codomain = graph.graphs[1];
				const factor = codomain.getFactor(fctr);
				if (factor === null)
				{
					++offset;
					return;
				}
				cod = this.factors.length === 1 ? factorGraph : factorGraph.getFactor([i]);
				domRoot = fctr.slice();
				domRoot.unshift(1);
				codRoot = this.factors.length > 1 ? [0, i] : [0];
				factor.bindGraph({cod, index:[], tag:this.constructor.name, domRoot, codRoot, offset});
			}
			else
			{
				const domain = graph.graphs[0];
				const factor = domain.getFactor(fctr);
				if (factor === null)
				{
					++offset;
					return;
				}
				cod = this.factors.length === 1 ? factorGraph : factorGraph.getFactor([i]);
				domRoot = fctr.slice();
				if ((this.domain instanceof ProductObject && !this.domain.dual && this.domain.objects.length > 1) || fctr.length === 0)
					domRoot.unshift(0);
				else
					domRoot = [0];
				codRoot = this.factors.length > 1 ? [1, i] : [1];
				factor.bindGraph({cod, index:[], tag:this.constructor.name, domRoot, codRoot, offset});
			}
		});
		graph.tagGraph(this.dual ? 'Cofactor' : 'Factor');
		graph.check();
		return graph;
	}
	loadEquality()
	{
		super.loadEquality();
		if (this.factors.length > 1)
			this.factors.map((f, i) =>
			{
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
				const fm = FactorMorphism.Signature(this.diagram, this.dual ? this.domain : this.codomain, [[i]], this.dual);
				const base = FactorMorphism.Signature(this.diagram, this.dual ? this.codomain : this.domain, [this.factors[i]], this.dual);
				R.loadSigs(this.diagram, this, [base], [fm, this.signature])
				if (!this.dual && this.domain.isTerminal() && this.codomain.isTerminal())
					R.loadEquality(this.diagram, this, [base], [fm, this]);
			});
	}
	isBare()
	{
		return false;
	}
	isFold()
	{
		return this.dual && this.factors.length > 0 && this.factors.reduce((r, f) => f.length === 0, true);
	}
	static Basename(diagram, args)
	{
		const factors = args.factors;
		if (factors.length === 0 || (factors.length === 1 && factors[0].length === 0))
			return Identity.Basename(diagram, args);
		const dual = 'dual' in args ? args.dual : false;
		const c = args.dual ? 'C' : '';
		const obj = diagram.getElement(dual ? args.codomain : args.domain, args.category);
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
		basename += `}aF${c}`;
		return basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:FactorMorphism.Basename(diagram, args)});
	}
	static Codomain(diagram, domain, factors, dual)
	{
		return factors.length > 1 ? diagram.get('ProductObject', {objects:factors.map(f =>
			f === -1 ? diagram.getTerminal(dual) : domain.getFactor(f)
		), dual}) : (factors[0] === -1 ? diagram.getTerminal(dual) : domain.getFactor(factors[0]));
	}
	static allFactorsEqual(factors)
	{
		return factors.every((v, i) => U.arrayEquals(v, factors[0]));
	}
	static equalFactors(left, right)
	{
		if (left.length === right.lenght)
			return left.reduce((r, ary, i) => U.arrayEquals(ary, right[i]));
		return false;
	}
	static ProperName(diagram, domain, factors, dual)
	{
		const obj = domain instanceof NamedObject ? domain.source : domain;
		if (FactorMorphism.isIdentity(factors, 'objects' in obj ? obj.objects.length : 1))
			return 'id';
		if (factors.length > 1 && FactorMorphism.allFactorsEqual(factors))
			return (dual ? '&nabla;' : '&Delta;') + (domain.needsParens() ? '(' : '') + domain.properName + (domain.needsParens() ? ')' : '');
		return `${dual ? '&#119894;' : '&#119901;'}${factors.map(f => f === -1 || f.length === 0 ? '' : `&#8202;${U.subscript(f)}`).join(',')}`;
	}
	static Signature(diagram, domain, factors = [-1], dual = false)
	{
		if (!dual && domain.isTerminal())
			return Identity.Signature(diagram, diagram.getTerminal(dual));
		const sigs = [domain.signature, dual];
		factors.map(f => sigs.push(Identity.Signature(diagram, f === -1 ? diagram.getTerminal(this.dual).signature : domain.getFactor(f).signature), f));
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
				if (unique.length > 0 && unique.reduce((r, f) => r || U.arrayEquals(factor, f), false))
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
		return factors.reduce((r, fctr, i) => r && (typeof fctr === 'number' ? i === fctr : i === fctr[0] && fctr.length === 1), true);
	}
}

class LambdaMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const preCurry = typeof args.preCurry === 'string' ? diagram.getElement(args.preCurry, args.category) : args.preCurry;
		const nuArgs = U.clone(args);
		nuArgs.domain = LambdaMorphism.Domain(diagram, preCurry, args.domFactors);
		nuArgs.codomain = LambdaMorphism.Codomain(diagram, preCurry, args.homFactors);
		nuArgs.basename = LambdaMorphism.Basename(diagram, {preCurry, domFactors:args.domFactors, homFactors:args.homFactors});
		nuArgs.homFactors = args.homFactors.map(hf => Array.isArray(hf) ? hf : [hf]);	// TODO remove bandage
		let obj = nuArgs.codomain;
		while (obj instanceof HomObject)
			obj = obj.homDomain();
		obj.covered = true;		// right-most obj in hom codomain does not change
		super(diagram, nuArgs);
		const graph = new Graph(this, {graphs:[preCurry.domain.getGraph(), preCurry.codomain.getGraph()]});
		if (!graph.doIndicesCover([...nuArgs.domFactors, ...nuArgs.homFactors]))
			throw 'inadequate factor coverage for lambda';
		if (!nuArgs.homFactors.reduce((r, f) => r && U.HasFactor(nuArgs.domFactors, f) === -1, true) &&
				!nuArgs.domFactors.reduce((r, f) => r && U.HasFactor(nuArgs.homFactors, f) === -1, true))	// do not share links
			throw 'dom and hom factors overlap';
		this.properName = LambdaMorphism.ProperName(preCurry, nuArgs.domFactors, nuArgs.homFactors);
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = nuArgs.homFactors;
		if (this.constructor.name === 'LambdaMorphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	setSignature()
	{
		this.signature = U.SigArray([this.signature, this.preCurry.signature, U.sig(JSON.stringify(this.domFactors)), U.sig(JSON.stringify(this.homFactors))]);
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Lambda')));
		D.toolbar.table.appendChild(H3.tr(H3.td('Pre-Curry:'), H3.td(this.preCurry.properName)));
		D.toolbar.table.appendChild(H3.tr(H3.td('Domain Factors:'), H3.td(this.domFactors)));
		D.toolbar.table.appendChild(H3.tr(H3.td('Codomain Factors:'), H3.td(this.homFactors)));
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
	loadEquality(diagram)
	{
		super.loadEquality(diagram);
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
		const homDom = codIsHom ? cod.graphs[0] : new Graph(this);
		const homMap = [];
		let base = [1, 0];
		const homFactors = this.homFactors;
		let k = 0;
		// setup map for factors living in the domain of the homset
		const codFactor = [1, 1];
		if (homFactors.length === 1 && U.arrayEquals(homFactors[0], [0]))	// check for entire domain
			homMap[0] = [homFactors[0], [1, 0]];
		else
			homFactors.map((f, i) =>
			{
				if (i < homFactors.length -1 && U.arrayEquals(homFactors[i+1], [-2]))
				{
					homMap.push([f, base.slice()]);
					k = 0;
				}
				else if (U.arrayEquals(f, [-2]))
				{
					base[base.length -1] = 1;	// switch to hom cod
					codFactor.push(1);
					k = 0;
				}
				else
				{
					if (k === 0 && homFactors.length > 1)
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
		let homCod = cod;
		while (obj instanceof HomObject)
		{
			homCod = homCod.graphs[1];
			obj = obj.objects[1];
		}
		homCod.copyGraph({map:factorMap, src:preCurryHomCodGraph});
		// copy dom factor links
		if (domFactors.length === 1)
			dom.copyGraph({map:factorMap, src:preCurryGraph.getFactor(domFactors[0])});
		else
			domFactors.map((ndx, i) =>
				dom.graphs[i].copyGraph({map:factorMap, src:preCurryGraph.getFactor(ndx)})
			);
		// copy hom factor links
		if (homFactors.length === 1 && U.arrayEquals(homFactors[0], [0]))	// check for entire domain
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
				if (i < homFactors.length -1 && U.arrayEquals(homFactors[i+1], [-2]))
				{
					const src = preCurryGraph.getFactor(ndx);
					base.push(0);
					const target = graph.getFactor(base);
					base.pop();
					target.copyGraph({map:factorMap, src});
					k = 0;
				}
				else if (U.arrayEquals(ndx, [-2]))
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
	isBare()
	{
		return false;
	}
	static Basename(diagram, args)
	{
		const preCur = diagram.getElement(args.preCurry, 'category' in args ? args.category : null);
		const basename = `Lm{${preCur.refName(diagram)}:${U.a2s(args.domFactors)}:${U.a2s(args.homFactors)}}mL`;
		return basename;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:LambdaMorphism.Basename(diagram, args)});
	}
	static Domain(diagram, preCurry, factors)
	{
		const dom = diagram.get('ProductObject', {objects:factors.map(f => f[0] === 0 ? preCurry.domain.getFactor(f.slice(1)) : preCurry.codomain.getFactor(f.slice(1)))});
		return dom;
	}
	static Codomain(diagram, preCurry, factors)
	{
		const isCodHom = preCurry.codomain instanceof HomObject;
		let codomain = isCodHom ? preCurry.codomain.baseHomDom() : preCurry.codomain;
		const fctrs = factors.slice();
		let objects = [];
		let isProd = true;
		while(fctrs.length > 0)
		{
			const f = fctrs.pop();
			if (U.arrayEquals(f, [-2]))	// form hom level
			{
				codomain = diagram.hom(diagram.prod(...objects), codomain);
				objects = [];
				isProd = false;
			}
			else if (U.arrayEquals(f, [-1]))	// add to products at this level
				isProd = true;
			else
				objects.push(f[0] === 0 ? preCurry.domain.getFactor(f.slice(1)) : preCurry.codomain.getFactor(f.slice(1)));
		}
		if (objects.length > 0)
			codomain = diagram.get('HomObject', {objects: [diagram.get('ProductObject', {objects}), codomain]});
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
				return g.map(i => U.subscript(i)).join('&#8202');
			}
			return f.toString();	// for -1
		}).join();
		let hf = '';
		homFactors.map(f =>
		{
			if (U.arrayEquals(f, [-2]))
				hf += '/';
			else
			{
				const g = f.slice();
				g.shift();
				hf += g.map(i => U.subscript(i)).join('&#8202');
			}
		}).join();
		return `&lambda;&lt;${preCurry.properName}${df}${df !== '' || hf !== '' ? '&#8331;' : ''}${hf}&gt;`;
	}
}

class HomMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		if (morphisms.length !== 2)
			throw 'not exactly two morphisms';
		const nuArgs = U.clone(args);
		nuArgs.basename = HomMorphism.Basename(diagram, {morphisms});
		nuArgs.domain = HomMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = HomMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = HomMorphism.ProperName(morphisms);
		nuArgs.description = `The hom morphism formed from ${nuArgs.morphisms[0].properName} and ${nuArgs.morphisms[1].properName}`;
		super(diagram, nuArgs);
		if (this.constructor.name === 'HomMorphism')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		super.help(H3.tr(H3.td('Type:'), H3.td('Hom')));
	}
	needsParens()
	{
		return false;
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		const loMap = [[[0], [1, 0]], [[1], [0, 0]]];		// map to rebuild links for contravariant
		const hiMap = [[[0], [0, 1]], [[1], [1, 1]]];		// map to rebuild links for covariant
		const lo = this.morphisms[0].getGraph(data);
		const hi = this.morphisms[1].getGraph(data);
		graph.graphs[0].graphs[0].copyGraph({src:lo.graphs[1], map:loMap});		// codomain of lo
		graph.graphs[1].graphs[0].copyGraph({src:lo.graphs[0], map:loMap});		// domain of lo
		graph.graphs[0].graphs[1].copyGraph({src:hi.graphs[0], map:hiMap});		// domain of hi
		graph.graphs[1].graphs[1].copyGraph({src:hi.graphs[1], map:hiMap});		// codomain of hi
		graph.check();
		return graph;
	}
	isBare()
	{
		return false;
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
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getElement(args.domain, args.category);
		if (!Evaluation.CanEvaluate(nuArgs.domain))
			throw 'object for evaluation domain cannot be evaluated';
		nuArgs.basename = Evaluation.Basename(diagram, {domain:nuArgs.domain});
		nuArgs.codomain = nuArgs.domain.objects[0].objects[1];
		nuArgs.properName = Evaluation.ProperName(nuArgs.domain);
		super(diagram, nuArgs);
		this.constructor.name === 'Evaluation' && this.setSignature();
		D && this.constructor.name === 'Evaluation' && D.emitElementEvent(diagram, 'new', this);
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Evaluation')));
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
		graph.check();
		return graph;
	}
	isBare()
	{
		return false;
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
		const nuArgs = U.clone(args);
		const domain = diagram.getElement(args.domain, args.category);
		nuArgs.domain = domain;
		nuArgs.side = U.getArg(args, 'side', false);
		if (!Distribute.HasForm(diagram, [nuArgs.domain]))
			throw `object does not have correct form for Distribute: ${nuArgs.domain.name}`;
		nuArgs.codomain = Distribute.Codomain(diagram, domain, nuArgs.side);
		nuArgs.basename = Distribute.Basename(diagram, nuArgs);
		nuArgs.properName = Distribute.ProperName();
		super(diagram, nuArgs);
		this.side = nuArgs.side;
		if (this.constructor.name === 'Distribute')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Distribute')));
	}
	hasInverse()
	{
		return true;
	}
	json()
	{
		const a = super.json();
		if (this.side)
			a.side = this.side;
		return a;
	}
	getGraph(data = {position:0}, first = true)
	{
		const side = this.side;
		const graph = super.getGraph(data, first);
		const dtorGraph = graph.graphs[0].graphs[side ? 1 : 0];	// distributor
		const dteeGraph = graph.graphs[0].graphs[side ? 0 : 1];	// distributee
		let offset = 0;
		graph.graphs[1].graphs.map((g, i) =>
		{
			const sideFctr = side ? 1 : 0;
			const opFctr = side ? 0 : 1;
			g.graphs[sideFctr].bindGraph({cod:dtorGraph, index:[1, i, sideFctr], tag:this.constructor.name, domRoot:[1, i, sideFctr], codRoot:[0, sideFctr], offset:offset++});
			g.graphs[opFctr].bindGraph({cod:dteeGraph.graphs[i], index:[1, i, opFctr], tag:this.constructor.name, domRoot:[1, i, opFctr], codRoot:[0, opFctr, i], offset:offset++});
		});
		graph.tagGraph('distribute');
		graph.check();
		return graph;
	}
	isBare()
	{
		return false;
	}
	static Basename(diagram, args)
	{
		const domain = diagram.getElement(args.domain, args.category);
		return `Di{${domain.refName(diagram)}}-${args.side ? 'L' : 'R'}iD`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Distribute.Basename(diagram, args)});
	}
	static Get(diagram, args)
	{
		const name = Distribute.Codename(diagram, args);
		const m = diagram.getElement(name, args.category);
		return m ? m : new Distribute(diagram, args);
	}
	static HasForm(diagram, ary)
	{
		if (ary.length === 1 && ary[0] instanceof CatObject)	// distribute only one object
		{
			const obj = ary[0] instanceof IndexObject ? ary[0].to : ary[0];
			if (obj instanceof ProductObject && !obj.to && obj.objects.length === 2)	// product of two objects
				return obj.objects.reduce((doit, o) => doit || o instanceof ProductObject && o.dual, false);	// some component object is a coproduct
		}
		return false;
	}
	static ProperName()
	{
		return 'dist';
	}
	static Codomain(diagram, object, side)
	{
		const dtor = object.objects[side ? 1 : 0];	// distributor
		const dtee = object.objects[side ? 0 : 1];	// distributee
		return diagram.coprod(...dtee.objects.map(o => diagram.prod(side ? o : dtor, side ? dtor : o)));
	}
}

class Dedistribute extends Morphism	// TODO what about side?
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getElement(args.domain, args.category);
		nuArgs.codomain = Dedistribute.Codomain(diagram, nuArgs.domain);
		nuArgs.basename = Distribute.Basename(diagram, {domain:nuArgs.domain});
		nuArgs.properName = Distribute.ProperName();
		super(diagram, nuArgs);
		if (this.constructor.name === 'Distribute')
		{
			this.setSignature();
			D && D.emitElementEvent(diagram, 'new', this);
		}
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Dedistribute')));
	}
	hasInverse()
	{
		return true;
	}
	isBare()
	{
		return false;
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
		const m = diagram.getElement(name, args.category);
		return m ? m : new Dedistribute(diagram, args);
	}
	static HasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1 && ary[0] instanceof IndexObject)
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

class Functor extends Morphism		// TODO
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		if (typeof nuArgs.domain === 'string')
			nuArgs.domain = diagram.getCategory(args.domain);
		if (typeof nuArgs.codomain === 'string')
			nuArgs.codomain = diagram.getCategory(args.codomain);
		super(diagram, nuArgs);
		D && this.constructor.name === 'Functor' && D.emitElementEvent(diagram, 'new', this);
	}
}

class Diagram extends Functor
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.category = U.getArg(args, 'category', (diagram && 'codomain' in diagram) ? diagram.codomain : null);
		if (!(nuArgs.codomain instanceof Category))
		{
			let codomain = diagram ? diagram.getElement(nuArgs.codomain, args.category) : null;
			if (!codomain)
				codomain = R.getCategory(args.codomain);
			if (!codomain)
				throw 'no cateogry for codomain';
			nuArgs.codomain = codomain;
		}
		const indexName = `${nuArgs.basename}_Index`;
		nuArgs.domain = new IndexCategory(diagram, {basename:indexName, description:`index category for diagram ${nuArgs.name}`, user:nuArgs.user});
		super(diagram, nuArgs);
		nuArgs.domain.indexedDiagram = this;		// TODO remove
		const _log = 'log' in nuArgs ? nuArgs.log : [];
		const _antilog = 'antilog' in nuArgs ? nuArgs.antilog : [];
		Object.defineProperties(this,
		{
			blobs:						{value:[],			writable:true},
			colorIndex2colorIndex:		{value:{},			writable:true},
			colorIndex2color:			{value:{},			writable:true},
			colorIndex:					{value:0,			writable:true},
			elements:					{value:new Map(),	writable:false},
			link2colorIndex:			{value:{},			writable:true},
			_log:						{value:_log,		writable:true},
			_antilog:					{value:_antilog,	writable:true},
			references:					{value:new Map(),	writable:false},
			allReferences:				{value:new Map(),	writable:true},
			ready:						{value:-1,			writable:true},
			selected:					{value:[],			writable:true},
			svgRoot:					{value:null,		writable:true},
			svgBase:					{value:null,		writable:true},
			sync:						{value:false,		writable:true},
			timestamp:					{value:U.getArg(args, 'timestamp', Date.now()),	writable:true},
			user:						{value:args.user,	writable:false},
			version:					{value:U.getArg(args, 'version', 0),			writable:true},
			viewport:					{value:{x:0, y:0, scale:1.0},					writable:true},
		});
		// TODO fix this
		const term = this.getTerminal();
		if ('references' in args)
			args.references.map(r => this.addReference(r, null, false));
		if ('elements' in nuArgs)
			this.codomain.process(this, nuArgs.elements, this.elements);
		if ('viewport' in nuArgs)
			this.viewport = nuArgs.viewport;
		if ('domainInfo' in nuArgs)
		{
			const info = nuArgs.domainInfo;
			this.domain.process(this, info.elements);
			this.domain.loadCells(info.cells);
		}
		else		// TODO remove
		{
			if ('domainElements' in nuArgs)
				this.domain.process(this, nuArgs.domainElements);
			this.domain.loadCells();
		}
		this.setSignature();
		this.postProcess();
		this.sync = true;
	}
	isEditable()
	{
		return !R.isSysUser(this.user) && (this.user === R.user.name || R.user.isAdmin());
	}
	getAll()
	{
		const all = new Set(this.elements.values());
		return all;
	}
	postProcess()
	{
		this.getAll().forEach(elt => 'postload' in elt && elt.postload());
		this.domain.elements.forEach(elt => 'postload' in elt && elt.postload());
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			const name = this.name;
			this.svgRoot && this.svgRoot.remove();
			['.json', '.png'].map(ext => U.removefile(`${name}${ext}`));		// remove local files
			this.elements.forEach(elt => this.codomain.elements.delete(elt.name));
			D && D.emitCATEvent('delete', this);
		}
	}
	addElement(elt)
	{
		const isIndex = U.isIndexItem(elt);
		if (elt.category)
		{
			if (!isIndex && elt.diagram === this)
			{
				if (this.elements.has(elt.basename))
					throw `Element with given basename ${U.HtmlSafe(elt.basename)} already exists in diagram ${this.name}`;
				this.elements.set(elt.basename, elt);
				this.elements.set(elt.name, elt);
			}
			return;
		}
	}
	help()
	{
		super.help();
		D.toolbar.table.appendChild(H3.tr(H3.td('Type:'), H3.td('Diagram')));
		const toolbar2 = D.toolbar.element.querySelector('#help-toolbar2');
		const toolbar2right = toolbar2.querySelector('.buttonBarRight span');
		if (R.user.canUpload() && R.cloud && this.user === R.user.name)
		{
			if (R.isLocalNewer(this.name))
			{
				const btn = D.getIcon('upload', 'upload', e => this.upload(e, false), {title:'Upload to cloud ' + R.cloudURL, aniId:'diagramUploadBtn'});
				toolbar2right.appendChild(btn);
			}
			if (R.isCloudNewer(this.name))
				toolbar2right.appendChild(D.getIcon('downcloud', 'downcloud', e => this.download(e, false), {title:'Download from cloud ' + R.cloudURL}));
		}
		if (this.refcnt === 0 && !R.isSysUser(this.user))
		{
			const btn = D.getIcon('delete', 'delete', e => R.deleteDiagram(e, this.name), {title:'Delete this diagram'});
			btn.querySelector('rect.btn').style.fill = 'red';
			toolbar2right.appendChild(btn);
		}
		toolbar2right.appendChild(D.getIcon('json', 'download-json', e => this.downloadJSON(e), {title:'Download JSON'}));
		toolbar2right.appendChild(D.getIcon('png', 'download-png', e => window.open(`diagram/${this.name}.png`, 'Diagram PNG',
					`height=${D.snapshotHeight}, width=${D.snapshotWidth}, toolbar=0, location=0, status=0, scrollbars=0, resizeable=0`), {title:'View PNG'}));
	}
	purge()
	{
		const sync = this.sync;
		this.sync = false;
		let cnt = 0;
		do
		{
			const elements = new Set(this.elements.values());		// avoid double scan
			cnt = [...elements].filter(e =>
			{
				if (e.canSave())
				{
					if (e.refcnt <= 0)
						return true;
					else if (e instanceof Morphism && 'recursor' in e && e.recursor.usecount(e) === e.refcnt)
						return true;
				}
				return false;
			}).map(e => e.decrRefcnt()).length;
		}
		while(cnt > 0);
		this.domain.elements.forEach(elt => elt instanceof IndexText && elt.description === '' && elt.decrRefcnt());
		this.sync = sync;
	}
	json(delBasename = true)
	{
		const a = super.json();
		a.codomain = this.codomain.name;		// prevent local name from being used
		a.references = [...this.references.keys()];
		this.purge();
		a.domainInfo = this.domain.json();
		a.elements = [];
		const saved = new Set();
		this.elements.forEach((elt, name) =>
		{
			if (elt.canSave())
			{
				if (!saved.has(elt))
				{
					a.elements.push(elt.json(delBasename));
					elt instanceof Category && elt.elements.forEach(elt => saved.add(elt));
					saved.add(elt);
				}
			}
		});
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
		a.user = this.user;
		a.timestamp = this.timestamp;
		a.version = this.version;
		a.viewport = U.clone(this.viewport);
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
	setPlacement(args, emit = true, action = null)
	{
		const x = Math.round(args.x);
		const y = Math.round(args.y);
		const scale = args.scale;
		this.svgTranslate.setAttribute('transform', `translate(${x} ${y}) scale(${scale} ${scale})`);
		const placement = {x, y, scale, timestamp:Date.now()};
		D.session.setPlacement(this.name, placement);
		D && emit && D.emitViewEvent('diagram', this, action);
	}
	setPlacementByBBox(bbox)
	{
		D.session.setPlacement(this.name, D.getViewportByBBox(bbox));
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
	homeTop()
	{
		this.removeGrounds();
		D.setSessionViewportByBBoxTop(this.svgRoot.getBBox());
	}
	homeEnd()
	{
		this.removeGrounds();
		D.setSessionViewportByBBoxEnd(this.svgRoot.getBBox());
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
		this.svgBase && element.makeSVG(this.svgBase);
	}
	actionHtml(e, name, ary = this.selected)
	{
		D.toolbar.deactivateButtons();
		D.toolbar.clearError();
		const toolbar2 = D.toolbar.element.querySelector('#help-toolbar2');
		toolbar2 && toolbar2.remove();
		const action = R.actionDiagram.getElement(name);
		if (action && action.hasForm(R.diagram, ary))
		{
			D.setActiveIcon(e.target, true);
			action.html(e, R.diagram, ary);
			D.toolbar.adjustPosition();
		}
	}
	activate(e, name, args)
	{
		D.toolbar.deactivateButtons();
		try
		{
			const action = R.actionDiagram.getElement(name);
			if (action && action.hasForm(R.diagram, this.selected))
				args ? action.action(e, this, this.selected, args) : action.action(e, this, this.selected);
		}
		catch(x)
		{
			R.recordError(x);
		}
	}
	mouseDiagramPosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY - D.topSVG.parentElement.offsetTop});
	}
	getBlob(name)
	{
		const elt = typeof name === 'string' ? elt = this.domain.elements.get(name) : name;
		if (elt instanceof IndexText)
			return null;
		const obj = Arrow.isArrow(elt) ? elt.domain : elt instanceof Cell ? elt.left[0].domain : elt;
		for (let i=0; i<this.blobs.length; ++i)
		{
			const blob = this.blobs[i];
			if (blob.objects.has(obj))
				return blob;
		}
		return null;
	}
	deselect(...elts)
	{
		elts.map(elt =>
		{
			const ndx = this.selected.indexOf(elt);
			if (ndx > -1)
			{
				this.selected.splice(ndx, 1);
				D.emitDiagramEvent(this, 'deselect', elt);
			}
		});
		if (this.selected.length === 0)
			this.blobs.length = 0;
		const newBlobs = [];
		const currentBlobs = new Set();
		this.selected.map(elt => currentBlobs.add(this.getBlob(elt)));
		for (let i=0; i<this.blobs.length; ++i)
		{
			const blob = this.blobs[i];
			if (currentBlobs.has(blob))
				newBlobs.push(blob);
		}
		this.blobs = newBlobs;
	}
	addSelected(elt)
	{
		if (!this.selected.includes(elt))	// not already selected
		{
			if (elt instanceof IndexObject && this.selected.filter(elt => Arrow.isArrow(elt)).reduce((r, arrow) => r || arrow.domain === elt || arrow.codomain === elt, false))
				return;
			this.selected.push(elt);
			if (elt instanceof IndexObject || elt instanceof IndexText)
				elt.finishMove();
			else if (Arrow.isArrow(elt))
			{
				elt.domain.finishMove();
				elt.codomain.finishMove();
			}
			if (!(elt instanceof IndexText))
			{
				const blob = this.getBlob(elt);
				!blob && this.blobs.push(new IndexBlob(elt));
			}
			this.selected.filter(m => Arrow.isArrow(m)).map(m => this.deselect(m.domain, m.codomain));
			D.emitDiagramEvent(this, 'select', elt);
		}
	}
	deselectAll()
	{
		this.deselect(...this.selected);
		D.emitDiagramEvent(this, 'select', null);
	}
	makeSelected(...elts)
	{
		const elements = this.getElements(elts);
		this.deselectAll();
		if (elements.length > 0)
			elements.map(elt => this.addSelected(elt));
	}
	selectAll()
	{
		const selected = new Set();
		this.domain.elements.forEach(e =>
		{
			if (e instanceof IndexMorphism)
			{
				selected.delete(e.domain);
				selected.delete(e.codomain);
			}
			selected.add(e);
		});
		this.makeSelected(...selected);
	}
	userSelectElement(e, name)
	{
		D.recordMouseDown(e);
		let elt = this.getElement(name);
		if (elt)
		{
			D.dragStart = D.mouse.sessionPosition();
			if (!this.selected.includes(elt))
				e.shiftKey ? this.addSelected(elt) : this.makeSelected(elt);
			else if (e.shiftKey)
				this.deselect(elt);
			else
				D.toolbar.show(e);
			if (elt instanceof IndexObject)
				elt.orig = {x:elt.x, y:elt.y};
		}
		else
			this.deselectAll();	// error?
	}
	areaSelect(e)
	{
		const p = this.userToDiagramCoords(D.getAreaSelectCoords(e));
		const q = new D2(p.x + p.width, p.y + p.height);
		let selected = [];
		this.domain.elements.forEach(elt =>
		{
			if (Arrow.isArrow(elt) && D2.inside(p, elt.domain.getXY(), q) && D2.inside(p, elt.codomain.getXY(), q))
				selected.push(elt);
			else if (D2.inside(p, elt.getXY(), q))
				selected.push(elt);
		});
		this.makeSelected(...selected);
	}
	updateDragObjects(majorGrid)
	{
		D.toolbar.hide();
		D.statusbar.hide();
		let delta = D.mouse.sessionPosition().subtract(D.dragStart);
		const placement = D.session.getPlacement(this.name);
		delta = delta.scale(1.0 / placement.scale);
		const dragObjects = new Set();
		const attachments = new Set();
		this.selected.map(elt =>
		{
			if (Arrow.isArrow(elt))
			{
				if (elt instanceof IndexMorphism)
				{
					dragObjects.add(elt.domain);
					dragObjects.add(elt.codomain);
				}
				else if (elt instanceof IndexElement)
				{
					if (elt.domain instanceof IndexObject)
						dragObjects.add(elt.domain);
					else
					{
						dragObjects.add(elt.domain.domain);
						dragObjects.add(elt.domain.codomain);
					}
					dragObjects.add(elt.codomain);
				}
				elt.domains.forEach(att => attachments.add(att));
				elt.codomains.forEach(att => attachments.add(att));
			}
			else if (elt instanceof IndexObject || elt instanceof IndexText)
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
			if (o instanceof IndexObject)
			{
				o.domains.forEach(updateMorphism);
				o.codomains.forEach(updateMorphism);
			}
		});
		attachments.forEach(att => updateMorphism(att));
		this.updateBackground();
	}
	hasOverlap(box, except = '')
	{
		const elts = this.svgRoot.querySelectorAll('text, .morphism');
		let r = null;
		const debug = R.default.debug;
		for (let i=0; i<elts.length; ++i)		// for since we return
		{
			const svg = elts[i];
			const name = svg.dataset.name;
			if (name === except)
				continue;
			const elt = this.getElement(name);
			if (svg instanceof SVGPathElement)
			{
				if (elt.bezier)
				{
					if (D2.boxBezierIntersection(elt.start, elt.bezier.cp1, elt.bezier.cp2, elt.end, box))
						return true;
				}
				else if (D2.lineBoxIntersect(elt.start, elt.end, box))
					return true;
				continue;
			}
			let compBox = null;
			if (elt instanceof IndexObject)
				compBox = elt.getBBox();
			else if (elt instanceof IndexText)
				compBox = elt.getBBox();
			else if (elt instanceof IndexMorphism)
				compBox = elt.getSvgNameBBox();
			else
				compBox = svg.getBBox();
			if (R.debug(2) && svg instanceof SVGTextElement)
				this.svgBase.appendChild(H3.rect({x:`${compBox.x}px`, y:`${compBox.y}px`, width:`${compBox.width}px`, height:`${compBox.height}px`, fill:'none', stroke:'blue'}));
			if (D2.overlap(box, new D2(compBox)))
				return true;
		}
		return false;
	}
	placeText(description, xy, height = '24', weight = 'normal', select = true)
	{
		const txt = new IndexText(this, {description, xy, height, weight});
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
		const xy = xyIn ? new D2(D.grid(xyIn)) : D.center(this);
		const from = new IndexObject(this, {xy, to});
		select && this.makeSelected(from);
		return from;
	}
	findEmptySpot(xy)
	{
		let gxy = xy;
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
		if (xyDom instanceof IndexObject)
		{
			if (!xyDom.to.isEquivalent(to.domain))
				throw 'index object target does not match morphism domain';
			xyD = new D2(xyDom);
			domain = xyDom;
		}
		else
		{
			xyD = xyDom ? this.findEmptySpot(xyDom) : D.toolbar.mouseCoords ? D.toolbar.mouseCoords : D.center(R.diagram);	// use original location
			domain = new IndexObject(this, {to:to.domain, xy:xyD});
			domain.update();
		}
		let xyC = null;
		let codomain = null;
		if (xyCod instanceof IndexObject)
		{
			if (xyCod.to !== to.codomain)
				throw 'index object target does not match morphism codomain';
			codomain = xyCod;
		}
		else if (typeof xyCod === 'object' && xyCod !== null)
		{
			let xy = new D2(xyCod);
			codomain = new IndexObject(this, {to:to.codomain, xy});
			codomain.update();
		}
		else
		{
			const ad = D.arrowDirection();
			const tw = to.textWidth();
			let xy = new D2({x:xyD.x + Math.max(ad.x, tw), y:xyD.y + ad.y});
			codomain = new IndexObject(this, {to:to.codomain, xy});
			codomain.update();
		}
		xyC = new D2(codomain.getXY());
		const from = new IndexMorphism(this, {to, domain, codomain});
		from.update();
		if (select)
			this.makeSelected(from);
		return from;
	}
	findAngle(from, length)
	{
		if (from instanceof IndexObject)
		{
			let xy = null;
			const angles = [];
			from.domains.forEach(m => angles.push(D2.angle(from, m.codomain)));
			from.codomains.forEach(m => angles.push(D2.angle(from, m.domain)));
			if (angles.length > 0)
			{
				angles.sort();
				let gap = 0;
				let angle = angles.length > 0 ? angles[0] : D.arrowDirection().angle();
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
				const arrLength = Math.max(D.default.arrow.length, Math.abs(cosAngle * length));
				xy = D.grid(D2.scale(arrLength, {x:cosAngle, y:sinAngle}).add(from));
			}
			else
			{
				const offset = new D2(D.default.stdArrow).scale(length / D.default.arrow.length);
				xy = new D2(from).add(offset);
			}
			return xy;
		}
		else if (from instanceof IndexMorphism)
			return from.getXY().add(from.normal.scale(-length));
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
			if (!xy)
				xy = this.findAngle(fromObj, Cat.D.getArrowLength(to));
			const newElt = new IndexObject(this, {xy, to: dir === 'domain' ? to.codomain : to.domain});
			const {domainElt, codomainElt} = dir === 'domain' ? {domainElt:fromObj, codomainElt:newElt} : {domainElt:newElt, codomainElt:fromObj};
			const from = new IndexMorphism(this, {to, domain:domainElt, codomain:codomainElt});
			select && this.makeSelected(from);
			return from;
		}
		catch(x)
		{
			R.recordError(x);
		}
	}
	placeIndexElementOfByObject(e, from, cat, element = null)
	{
		try
		{
			const xy = this.findAngle(from, D.default.arrow.length);
			const item = element instanceof IndexObject ? element : new IndexObject(this, {xy, to:element ? element : cat});
			const ndxElement = new IndexElement(this, {domain: element ? item : from, codomain: element ? from : item});
			this.makeSelected(ndxElement);
			return ndxElement;
		}
		catch(x)
		{
			R.recordError(x);
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
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	makeGrounds()
	{
		const bkgnd = H3.rect(`##${this.elementId('background')}.diagramBackground`, {x:0, y:0, width:D.width(), height:D.height()});
		const f4gnd = H3.rect(`##${this.elementId('foreground')}.diagramForeground`, {x:0, y:0, width:D.width(), height:D.height(), 'data-name':this.name, 'data-type':'diagram'});
		f4gnd.ondblclick = e => R.diagram !== this && Runtime.SelectDiagram(this);
		let origClick = null;	// the original mousedown location in session coords
		let origLoc = null;		// the original diagram location in session coords
		const removeToolbar = e =>
		{
			const elts = document.querySelectorAll('#md-toolbar');
			elts.forEach(elt =>
			{
				let rel = e.relatedTarget;
				let foundIt = false;
				while(rel)
				{
					if (rel.id === 'md-toolbar')
					{
						foundIt = true;
						break;
					}
					rel = rel.parentNode;
				}
				!foundIt && elt.remove();
			});
		};
		const onMouseMove = e =>
		{
			removeToolbar(e);
			const viewport = D.session.getCurrentViewport();
			const locNow = D.userToSessionCoords({x:e.clientX, y:e.clientY}).subtract(origClick).add(origLoc);
			this.setPlacement({x:locNow.x, y:locNow.y, scale:D.session.getPlacement(this.name).scale});	// scale unchanged
			D.toolbar.hide();
		};
		const addToolbar = _ =>
		{
			const sid = `#${this.elementId('md')}`;
			const elt = document.querySelector(sid);
			if (!elt)
			{
				const loc = this.svgRoot.getBBox();
				const upperRightDC = {x:loc.x + loc.width, y:loc.y};
				const upperRightUC = D.sessionToUserCoords(upperRightDC);
				const style = `transition:0.3s; position:absolute; left:${upperRightUC.x -32}px; top:${upperRightUC.y + 5}px`;
				const div = H3.div('##md-toolbar', {style}, D.getIcon('close', 'close', closeIt, {title:'Remove from session'}));
				document.body.appendChild(div);
			}
		};
		f4gnd.onmouseup = e =>
		{
			document.removeEventListener('mousemove', onMouseMove);
			addToolbar(e);
		};
		f4gnd.onmousedown = e =>	// move diagram in session coordinates
		{
			if (!D.default.fullscreen)
			{
				// TODO area select
				origClick = D.userToSessionCoords({x:e.clientX, y:e.clientY});
				origLoc = new D2(D.session.getPlacement(this.name));
				document.addEventListener('mousemove', onMouseMove);
				e.preventDefault();
			}
		};
		const closeIt = e =>
		{
			this.close();
			removeToolbar(e);
			const elt = document.getElementById('md-toolbar');
			elt && elt.remove();
		};
		f4gnd.onmouseenter = e => !D.default.fullscreen && addToolbar();
		f4gnd.onmouseleave = e => removeToolbar(e);
		this.svgRoot.insertBefore(bkgnd, this.svgRoot.firstChild);
		this.svgRoot.appendChild(f4gnd);
	}
	removeGrounds()
	{
		this.svgRoot.querySelector('#' + this.elementId('background')).remove();
		this.svgRoot.querySelector('#' + this.elementId('foreground')).remove();
	}
	makeSVG(fn = null)
	{
		if (!this.svgRoot)
		{
			this.svgRoot = H3.g({id:this.elementId('root'), 'data-name':this.name});
			this.makeGrounds();
			const f4gnd = this.svgRoot.lastElementChild;
			D.diagramSVG.appendChild(this.svgRoot);
			this.svgBase = H3.g({id:`${this.elementId()}-base`});
			this.svgTranslate = H3.g({id:this.elementId('T')}, this.svgBase);
			if (R.debug(1))
			{
				this.svgTranslate.appendChild(H3.path({stroke:'red', d:"M-30 0 L30 0"}));
				this.svgTranslate.appendChild(H3.path({stroke:'red', d:"M0 -30 L0 30"}));
			}
			this.svgRoot.appendChild(this.svgTranslate);
			this.svgRoot.classList.add('hidden');
			this.svgRoot.appendChild(f4gnd);
			this.ready = 0;
			this.domain.elements.forEach(elt =>
			{
				this.ready++;
				setTimeout(_ =>
				{
					this.addSVG(elt);
					this.ready--;
				}, 0);
			});
			this.domain.cells.forEach(elt =>
			{
				this.ready++;
				setTimeout(_ =>
				{
					elt.update();
					this.ready--;
				}, 0);
			});
		}
		if (fn)
		{
			const doit = _ =>
			{
				if (this.ready === 0 && R.isReady())
					fn(this);
				else
					setTimeout(doit, 10);	// try again
			};
			doit();
		}
	}
	upload(e, local = true)
	{
		if (R.cloud && ((this.user === R.user.name && R.user.canUpload()) || R.user.isAdmin()))
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
						R.recordError(res.statusText);
						return;
					}
					R.debug(1) && console.log('uploaded', this.name);
					const info = R.getDiagramInfo(this.name);
					info.cloudTimestamp = info.timestamp;
					R.setDiagramInfo(info, true);
					const delta = Date.now() - start;
					if (e)
					{
						D.statusbar.show(e, 'Uploaded diagram', 1);
						R.debug(1) && console.log('diagram uploaded ms:', delta);
						D.emitCATEvent('upload', this.name);
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
		const placement = D.session.getPlacement(this.name);
		const viewport = D.session.getCurrentViewport();
		const sessScale = 1.0 / viewport.scale;
		const dgrmScale = 1.0 / placement.scale;
		if (isNaN(placement.x) || isNaN(sessScale) || isNaN(dgrmScale))
			throw 'NaN in coords';
		let d2 = new D2(	sessScale * (xy.x - viewport.x),
							sessScale * (xy.y - viewport.y));
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
		const placement = D.session.getPlacement(this.name);
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
		const placement = D.session.getPlacement(this.name);
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
		let value = txtbox.innerText.trimRight();	// cannot get rid of newlines on the end in a text box
		if (attribute === 'properName')
		{
			let nuVal = '';
			let ndx = 0;
			let match = value.match(/:[0-9]+/);		// map ":digits" to subscript digits
			while (match)
			{
				nuVal += value.substring(ndx, match.index);
				nuVal += U.subscript(match[0].substring(1));
				ndx = match.index + match[0].length;
				value = value.substring(ndx);
				match = value.match(/:[0-9]+/);
			}
			value = nuVal + value;
		}
		txtbox.innerHTML = U.HtmlEntitySafe(value);
		const old = elt.editText(e, attribute, value);
		this.log({command:'editText', name, attribute, value});		// use old name
		this.antilog({command:'editText', name:elt.name, attribute, value:old});	// use new name
		e && e instanceof Event && e.stopPropagation();
		if (!(elt instanceof IndexText))
		{
			if (attribute === 'properName')
				this.updateProperNames(elt);
			else if (attribute === 'basename')
				this.updateBasenames(elt);
		}
		if (elt instanceof Diagram)
			D.emitViewEvent(D.session.mode, R.diagram);
		else
			D.emitElementEvent(this, 'update', elt);
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
				if (attribute !== 'description')
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
		if (elt instanceof IndexObject)
			r = elt.refcnt === 1;
		else if (elt instanceof IndexMorphism)
			r = elt.domain.domains.size === 1 && elt.domain.codomains.size === 0 && elt.codomain.domains.size === 0 && elt.codomain.codomains.size === 1;
		return r;
	}
	getElement(name, cat = null)
	{
		if (name instanceof Element)
			return name;
		let elt = null;
		if (cat)
		{
			const category = this.getCategory(cat);
			if (category)
				elt = category.getElement(name);
		}
		if (!elt)
			elt = this.domain.getElement(name);		// does the requested element live in the domain category?
		if (elt)
			return elt;
		if (typeof name === 'string')
		{
			if (this.elements.has(name))
				return this.elements.get(name);
			if (this.codomain.elements.has(name))
			{
				elt = this.codomain.getElement(name);
				if (elt.diagram !== this && this.diagram && this.name !== 'sys/$CAT' && !this.allReferences.has(elt.diagram.name))
					return null;		// cannot access outside of reference diagrams
			}
			const refs = this.allReferences.keys();
			let nxtref = refs.next();
			while(!elt && !nxtref.done)
			{
				const ref = R.$CAT.getElement(nxtref.value);
				if (ref)
					elt = ref.getElement(name);
				nxtref = refs.next();
			}
		}
		else if ('category' in name)
		{
			const cat = this.getCategory(name.category);
			if (cat)
				return cat.getElement(args.name);
		}
		else if (name && 'name' in name)
			return this.getElement(name.name);
		if (!elt)
			elt = this.domain.getCell(name);
		return elt;
	}
	getElements(ary)
	{
		const elements = ary.map(e => this.getElement(e)).filter(e => e);
		ary.filter(e => e instanceof Cell).map(cell => elements.push(...cell.getObjects()));
		if (elements.filter(e => e === undefined || e === null).length > 0)
			throw 'cannot fetch element';
		return ary.map(e => this.getElement(e)).filter(e => e !== undefined && e !== null);
	}
	hasIndexedElement(name)
	{
		let result = false;
		this.domain.elements.forEach(elt => {if ('to' in elt && elt.to.name === name) result = true;});
		return result;
	}
	forEachObject(fn)
	{
		const scanned = new Set();
		this.elements.forEach(e =>
		{
			e instanceof CatObject && !scanned.has(e) && fn(e);
			scanned.add(e);
		});
	}
	forEachMorphism(fn)
	{
		const scanned = new Set();
		this.elements.forEach(e =>
		{
			e instanceof Morphism && !scanned.has(e) && fn(e);
			scanned.add(e);
		});
	}
	forEachText(fn)
	{
		this.domain.elements.forEach(e => e instanceof IndexText && fn(e));
	}
	forEachCode(fn)
	{
		this.domain.elements.forEach(e => e instanceof IndexCode && fn(e));
	}
	forEachDefinition(fn)
	{
		this.domain.elements.forEach(e => e instanceof Definition && fn(e));
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
		D.downloadString(this.stringify(), 'json', `${this.name}.json`);
	}
	downloadJS(e)
	{
		return R.actionDiagram.getElement('javascript').download(e, this);
	}
	downloadCPP(e)
	{
		return R.actionDiagram.getElement('cpp').download(e, this);
	}
	downloadPNG()
	{
		D.download(D.diagramPNGs.get(this.name), `${this.name}.png`);
	}
	downloadLog(e)
	{
		D.downloadString(JSON.stringify(this._log), 'log', `${this.name}.json`);
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
		for (const [nm, one] of this.allReferences)
		{
			if (nm === name)
				continue;
			const dgrm = R.CAT.getElement(nm);
			if (dgrm.allReferences.has(name))
				return true;
		}
		const ref = R.CAT.getElement(name);		// TODO fix this
		for(const [nm, elt] of this.elements)
		{
			if (elt.usesDiagram(ref))
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
				R.setDiagramInfo(this);
			}
		}
	}
	async addReference(elt, fn = null, emit = true)
	{
		const name = elt instanceof Diagram ? elt.name : elt;
		if (name === this.name)
			throw 'Do not reference yourself';
		const setup = _ =>
		{
			const diagram = R.$CAT.getElement(name);
			if (!diagram)
				throw 'cannot load diagram';
			if (this.allReferences.has(diagram.name))
				throw `Diagram ${diagram.name} is already referenced `;
			if (diagram.allReferences.has(this.name))
				throw `Diagram ${diagram.name} already references this one`;
			this.references.set(name, diagram);
			diagram.incrRefcnt();
			this.allReferences = this.getAllReferenceDiagrams();
			emit && D.emitDiagramEvent(this, 'addReference', diagram);
			fn && fn(diagram);
		};
		if (R.load(elt))
			setup();
		else
			R.loadDiagram(name, setup);
	}
	forEachReference(fn)
	{
		const refs = this.allReferences.keys();
		refs.forEach(ref => fn(ref));
	}
	clear(save = true)
	{
		this.deselectAll();
		this.domain.clear();
		Array.from(this.elements).reverse().map(a => a[1].decrRefcnt());
		save && this.saveDiagram(this, e => console.log('diagram.clear', this.name));
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
		this.forEachText(tx => texts.push(tx));
		return texts;
	}
	loadCells()
	{
		this.domain.loadCells();
	}
	checkCells()
	{
		this.domain.cells.forEach(cell => cell.check());
	}
	emphasis(item, on)		// item can be index item or not
	{
		let rtrn = null;
		let elt = 'to' in item ? item.to : this.getElement(item);
		if (elt)
		{
			if (elt instanceof IndexText)
			{
				elt.emphasis(on);
				rtrn = elt.name;
			}
			else if (elt instanceof Cell)
				cell.emphasis(on);
			else
			{
				item.emphasis(on);
				const emphs = [...this.svgRoot.querySelectorAll(`g[data-sig="${elt.signature}"], path[data-sig="${elt.signature}"], text[data-sig="${elt.signature}"]`)];
				if (item instanceof CatObject)
					emphs.map(emph => item.svg !== emph && emph.querySelectorAll('text').forEach(text => text.classList[on ? 'add' : 'remove']('emphasis2')));
				else
					emphs.map(elt => item.svg_path !== elt && item.svg_name !== elt && elt.classList[on ? 'add' : 'remove']('emphasis2'));
				if (emphs.length > 0)
					rtrn = emphs[0].dataset.name;
			}
		}
		if (!on && this.selected.length === 1 && 'dragAlternates' in this.selected[0])
			this.removeDragAlternates();
		return rtrn;
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
			let name = `${this.name}/${proto.Basename(this, args)}`;
			let elt = this.getElement(name);
			if (elt)
				return elt;
			const protoName = proto.Codename(this, args);
			if (name !== protoName)
			{
				elt = this.getElement(protoName);
				if (!elt && 'Get' in proto)
					elt = proto.Get(this, args);
			}
			if (!elt)
			{
				if (prototype === 'Category' && !('diagram' in args))
					args.diagram = this.name;
				if (prototype === 'FactorMorphism' && args.factors.length === 1 && args.factors[0].length === 0)
					elt = new Identity(this, args);
				else
					elt = new Cat[prototype](this, args);
			}
			if (!(elt instanceof IndexMorphism) && 'loadEquality' in elt && !('postload' in elt))
				elt.loadEquality();
			return elt;
		}
		catch(x)
		{
			R.recordError(this.name + ': ' + x);
		}
	}
	opcheck(elts)
	{
		if (elts.filter(elt => elt === undefined || !(elt.diagram.name === this.name || this.allReferences.has(elt.diagram.name)) || U.isIndexItem(elt)).length > 0)
			throw 'elements not in context';
	}
	id(domain)
	{
		this.opcheck([domain]);
		return this.get('Identity', {domain});
	}
	stripIds(...morphisms)
	{
		const nonIds = morphisms.filter(m => !Morphism.isIdentity(m));
		return nonIds.length === 0 ? [morphisms[0]] : nonIds;		// return at least one morphism
	}
	comp(...morphisms)
	{
		this.opcheck(morphisms);
		return morphisms.length > 1 ? this.get('Composite', {morphisms}) : morphisms[0];
	}
	stripComp(...morphisms)
	{
		this.opcheck(morphisms);
		return this.comp(...this.stripIds(...morphisms));
	}
	prod(...elements)
	{
		if (elements.length === 0)
			return this.getTerminal();
		this.opcheck(elements);
		return elements.length > 1 ? (elements[0] instanceof CatObject ? this.get('ProductObject', {objects:elements}) : this.get('ProductMorphism', {morphisms:elements})) :
			elements[0];
	}
	coprod(...elements)
	{
		if (elements.length === 0)
			return this.getTerminal(true);
		this.opcheck(elements);
		return elements.length > 1 ?
			(elements[0] instanceof CatObject ? this.get('ProductObject', {objects:elements, dual:true}) : this.get('ProductMorphism', {morphisms:elements, dual:true})) :
			elements[0];
	}
	fctr(domain, factors)
	{
		this.opcheck([domain]);
		return factors.length > 0 ? this.get('FactorMorphism', {domain, factors, dual:false}) : this.get('Identity', {domain});
	}
	cofctr(obj, factors)
	{
		this.opcheck([obj]);
		const args = {codomain:obj, factors, dual:true};
		return this.get('FactorMorphism', args);
	}
	assy(...morphisms)
	{
		this.opcheck(morphisms);
		if (morphisms.filter(m => m.domain === morphisms[0].domain).length !== morphisms.length)
			throw 'not all domains equal';
		return morphisms.length > 1 ? this.get('ProductAssembly', {morphisms, dual:false}) : morphisms[0];
	}
	coassy(...morphisms)
	{
		this.opcheck(morphisms);
		if (morphisms.filter(m => m.codomain === morphisms[0].codomain).length !== morphisms.length)
			throw 'not all codomains equal';
		return morphisms.length > 1 ? this.get('ProductAssembly', {morphisms, dual:true}) : morphisms[0];
	}
	pbAssy(...morphisms)
	{
		this.opcheck(morphisms);
		return morphisms.length > 1 ? this.get('PullbackAssembly', {morphisms, dual:false}) : morphisms[0];
	}
	poAssy(...morphisms)
	{
		this.opcheck(morphisms);
		return morphisms.length > 1 ? this.get('PullbackAssembly', {morphisms, dual:true}) : morphisms[0];
	}
	hom(...elements)
	{
		this.opcheck(morphisms);
		return elements[0] instanceof CatObject ? this.get('HomObject', {objects:elements}) : this.get('HomMorphism', {morphisms:elements});
	}
	pull(...morphisms)
	{
		this.opcheck(morphisms);
		return morphisms.length > 1 ? this.get('PullbackObject', {morphisms, dual:false}) : morphisms[0];
	}
	push(...morphisms)
	{
		this.opcheck(morphisms);
		return morphisms.length > 1 ? this.get('PullbackObject', {morphisms, dual:true}) : morphisms[0];
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
	lambda(preCurry, domFactors, homFactors)
	{
		return this.get('LambdaMorphism', {preCurry, domFactors, homFactors});
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
		U.writeTempfile(`${this.name}.log`, JSON.stringify(this._log));
	}
	drop(e, action, from, target, log = true)
	{
		this.deselectAll();
		target.show(false);
		const fromName = from.name;
		const targetName = target.name;
		action.action(e, this, [target, from], false);
		target.decrRefcnt();	// do not decrement earlier than this
		from.decrRefcnt();
		log && this.log({command:'drop', action:action.name, from:fromName, target:targetName});
	}
	fuseObjects(e, from, target, save = true)
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
		this.deselectAll();
		if (identFuse)
		{
			const m = [...from.codomains][0];
			m.setCodomain(target);
			const oldTo = m.to;
			const basename = this.getAnon('morph');
			const name = Element.Codename(this, {basename});
			m.setMorphism(new Morphism(this, {basename, domain:m.to.domain, codomain:target.to}));
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
				D.emitElementEvent(R.diagram, 'update', m);
			});
			[...from.codomains].map(m =>
			{
				m.setCodomain(target);
				D.emitElementEvent(R.diagram, 'update', m);
			});
		}
		from.decrRefcnt();
		return target;
	}
	fuseMorphisms(e, from, target, save = true)
	{
		this.fuseObjects(e, from.domain, target.domain, false);
		this.fuseObjects(e, from.codomain, target.codomain, false);
		from.refcnt === 1 && from.decrRefcnt();
		this.makeSelected(target);
	}
	replay(e, cmd)
	{
		if (D.replayCommands.has(cmd.command))
		{
			const obj = D.replayCommands.get(cmd.command);
			obj.replay(e, R.diagram, cmd);
			R.debug(1) && console.log('replay', cmd);
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
	updateProperNames(to)
	{
		this.elements.forEach(elt => elt !== to && elt.uses(to) && elt.updateProperName());
		this.domain.elements.forEach(from => from.to && from.to.uses(to) && from.updateProperName());
	}
	updateBasenames(to)
	{
		if (this.elements.has(to))
		{
			this.elements.forEach(elt => elt !== to && elt.uses(to) && elt.updateBasename());
			this.domain.elements.forEach(from => from.to && from.to.uses(to) && from.updateBasename());
		}
	}
	logViewCommand()
	{
		const log = this._log;
		if (log.length > 0 && log[log.length -1].command === 'view')	// replace last view command?
			D.ttyPanel.logSection.removeLogCommand(null, log.length -1);
		const placement = D.session.getPlacement(this.name);
		this.log({command:'view', x:Math.round(placement.x), y:Math.round(placement.y), scale:Math.round(10000.0 * placement.scale)/10000.0});
	}
	getTerminal(dual = false)
	{
		return this.get('FiniteObject', {size:dual ? 0 : 1});
	}
	collectElements(elts)
	{
		const elements = this.getElements(elts);
		elts.filter(e => e instanceof Cell).map(cell =>
		{
			cell.left.map(m => elements.push(m));
			cell.right.map(m => elements.push(m));
		});
		return elements;
	}
	viewElements(...elts)
	{
		const elements = this.collectElements(elts);
		if (elements.length > 0)
		{
			const bbox = this.diagramToSessionCoords(D2.mergeBoxes(...elements.map(a => a.getBBox())));
			const dist = Math.max(bbox.width, bbox.height) * D.default.viewMargin;
			const vbox = D2.expand(bbox, dist);
			D.setSessionViewportByBBox(vbox);
			D.emitViewEvent('diagram', R.diagram);
		}
	}
	panToElements(...elts)
	{
		const elements = this.collectElements(elts);
		if (elements.length > 0)
		{
			const coords = [];
			elements.map(elt =>
			{
				if (elt instanceof CatObject)
					coords.push(elt.getXY());
				else if (elt instanceof IndexMorphism)
				{
					coords.push(elt.domain.getXY());
					coords.push(elt.codomain.getXY());
				}
				else if (elt instanceof IndexText)
					coords.push(elt.getXY());	// TODO change to bbox center of text
			});
			const bbox = D2.bBox(...coords);
			const eltCenter = new D2(bbox.x + bbox.width/2, bbox.y + bbox.height/2);
			const elementXY = this.diagramToUserCoords(eltCenter);
			const viewport = D.session.getCurrentViewport();
			const vp = new D2(viewport);
			const center = new D2({x:D.width(), y:D.height()}).scale(0.5);
			const eltToCenter = center.subtract(elementXY);
			D.setSessionViewport({x:viewport.x + eltToCenter.x, y:viewport.y + eltToCenter.y, scale:viewport.scale});
			D.emitViewEvent(D.session.mode, R.diagram);
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
		return ary.sort((a, b) => indexing.get(a) < indexing.get(b) ? -1 : indexing.get(b) > indexing.get(a) ? 1 : 0);
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
	autoplace()
	{
		const sync = this.sync;
		this.sync = false;
		const oldArrowDir = D.default.arrow.dir;
		D.default.arrow.dir = {x:1, y:0};
		const indexed = new Set();
		const locations = [];
		const grid = 4 * D.gridSize();
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
			new IndexText(this, {xy:{x:tx, y:ty}, height:grid/2, weight:'bold', description:this.basename});
			if (this.description !== '')
				new IndexText(this, {xy:{x:tx, y:ty + grid/4}, height:grid/8, weight:'normal', description:this.description});
		}
		this.domain.elements.forEach(elt =>
		{
			if (elt instanceof IndexObject || elt instanceof IndexText)
			{
				indexed.add(elt.to);
				if (elt.x === 0 && elt.y % grid === 0)
					locations.push(elt.y);
			}
			else if (Arrow.isArrow(elt))
				indexed.add(elt.to);
		});
		locations.sort();
		const scanned = new Set();
		const unindexed = [];
		this.elements.forEach(elt =>
		{
			if (scanned.has(elt))
				return;
			scanned.add(elt);
			(elt instanceof CatObject || elt instanceof Morphism) && !indexed.has(elt) && unindexed.push(elt);
		});
		let x = grid;
		let y = 2* grid;
		unindexed.map(elt =>
		{
			locations.map(loc =>
			{
				if (loc === elt.y)
					y += grid;
			});
			const height = D.default.font.height;
			if (elt instanceof CatObject)
			{
				this.placeObject(elt, {x, y}, false);
				if (elt instanceof Action)
					new IndexText(this, {xy:{x:x + grid, y:y + height/2}, height, weight:'normal', description:`<icon>${elt.basename}</icon>`});
				if (elt.description !== '')
					new IndexText(this, {xy:{x:x + 1.25 * grid, y:y + height/2}, height, weight:'normal', description:elt.description});
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
					new IndexText(this, {xy:{x:x, y:y + grid/4}, height:D.default.font.height, weight:'normal', description:elt.description});
			}
			y += grid;
		});
		this.sync = sync;
		D.default.arrow.dir = oldArrowDir;
	}
	autoplaceSvg(bbox, name, scale = 4, modulo = 8, mouseLoc = null)
	{
		let nubox = new D2(bbox);
		let elt = null;
		let ndx = 0;
		let offset = new D2();
		let rect = null;
		if (R.debug(2))
		{
			rect = H3.rect({x:`${nubox.x}px`, y:`${nubox.y}px`, width:`${nubox.width}px`, height:`${nubox.height}px`, fill:'none', stroke:'red', 'stroke-width':'0.1px'});
			this.svgBase.appendChild(rect);
		}
		while((mouseLoc && nubox.contains(mouseLoc)) || this.hasOverlap(nubox, name))
		{
			nubox = new D2(bbox);
			const dir = D.directions[ndx % modulo];
			offset = dir.scale(scale * Math.trunc((modulo + ndx)/modulo));
			nubox = nubox.add(offset.getXY());
			if (R.debug(2))
			{
				//R.debug(2) && rect.remove();
				rect = H3.rect({x:`${nubox.x}px`, y:`${nubox.y}px`, width:`${nubox.width}px`, height:`${nubox.height}px`, fill:'none', stroke:'red'});
				this.svgBase.appendChild(rect);
			}
			ndx++;
			if (ndx > 100)	// give up; too complex
				break;
		}
		R.debug(2) && console.log('autoplace ndx', name, ndx);
		return offset.add(bbox);
	}
	newText(e)
	{
		const xy = this.userToDiagramCoords({x:e.clientX, y:e.clientY});
		const oldSync = this.sync;
		this.sync = false;
		const text = new IndexText(this, {xy, description:''});
		text.textEditor();
		this.sync = oldSync;
	}
	newElement(e, type, fn = null)
	{
		const shiftKey = e.shiftKey;
		const xy = this.userToDiagramCoords({x:e.clientX, y:e.clientY});
		xy.y = xy.y + D.default.font.height / 2;
		const oldSync = this.sync;
		this.sync = false;
		const text = new IndexText(this, {xy, description:''});
		text.textEditor(type === 'text' ? '' : 'object');
		const div = document.querySelector('#foreign-text');
		const badColor = e => div.style.backgroundColor = '#cc0';
		const neutralColor = e => div.style.backgroundColor = 'var(--color-bg)';
		const checkToken = (aType, tok) =>
		{
			if (U.isValidBasename(tok))
			{
				const elt = this.getElement(tok);
				if (elt && !(elt instanceof (aType === 'object' ? CatObject : Morphism)))
					return false;
				if (elt === undefined && aType === 'morphism')
					return false;
				return true;
			}
			return false;
		};
		const validateInput = input =>
		{
			const tokens = input.trim().split(' ').filter(tok => tok !== '');
			if (shiftKey && type === 'morphism')
			{
				if (tokens.length === 1)
					return checkToken('object', tokens[0]);
				if (tokens.length === 2)
					return checkToken('object', tokens[0]) && checkToken('base', tokens[1]);
				if (tokens.length === 3)
					return checkToken('object', tokens[0]) && checkToken('base', tokens[1]) && checkToken('object', tokens[2]);
				return false;
			}
			else
			{
				let operator = '';
				let opNdx = -1;
				let elements = Array(tokens.length).fill(null);
				for (let i=0; i<tokens.length; ++i)
				{
					const tok = tokens[i];
					if (tok === '1' || tok === '2')
						elements[i] = tok;
					else if (tok === '*' || tok === '+')
					{
						if (opNdx === i - 1 || i === 0 || i === tokens.length - 1)
							return false;		// two operators in a row not allowed or beginning or end
						if (operator !== '' && operator !== tok)
							return false;		// two operators in a row must be same
						operator = tok;
						opNdx = i;
					}
					else		// must be object
					{
						if (checkToken(type, tok))
							elements[i] = tok;
						else
							return false;
						if (i > 0 && elements[i - 1])
							operator = '';
					}
				}
			}
			return true;
		}
		const chkObject = input =>
		{
			if (validateInput(input))
			{
				neutralColor()
				return true;
			}
			else
			{
				badColor();
				return false;
			}
		};
		const chkMorphism = input =>
		{
			if (validateInput(input))
			{
				neutralColor()
				return true;
			}
			else
			{
				badColor();
				return false;
			}
		}
		const onkeydown = e =>
		{
			if (e.key === 'Enter')
			{
				D.closeActiveTextEdit();
				e.stopPropagation();
				return;
			}
			const input = e.target.innerText.trim();
			if (type === 'object')
				chkObject(input);
			else if (type === 'morphism')
				chkMorphism(input);
		};
		const onfocusout = e =>
		{
if (fn)debugger;	// TODO
			const input = e.target.innerText.trim();
			const tokens = input.split(' ').filter(t => t !== '');
			const last = tokens.length - 1;
			const created = [];
			try
			{
				div.removeEventListener('focusout', onfocusout);	// avoid calling this function again
				let xy = text.getXY();
				xy.y = xy.y - D.default.font.height/2;
				const stdNormal = new D2(D.default.stdArrow).normal();
				if (input !== '')
				{
					if (validateInput(input))
					{
						let operator = '';
						let elements = [];
						const placeObjects = _ =>
						{
							created.push(this.placeObject(this[operator === '*' ? 'prod' : 'coprod'](...elements), xy));
							xy = D2.add(xy, D.default.stdArrow);
							elements.length = 0;
							operator = '';
						};
						const placeMorphisms = _ =>
						{
							created.push(this.placeMorphism(this[operator === '*' ? 'prod' : 'coprod'](...elements), xy));
							xy = D2.add(xy, stdNormal);
							elements.length = 0;
							operator = '';
						};
						if (shiftKey)
						{
							const m = this.codomain.newMorphism(e, this, tokens[1], tokens[0], tokens[2]);
							m && this.placeMorphism(m, xy);
						}
						else
						{
							let ndx = -1;
							tokens.map((tok, i) =>
							{
								if ((tok === '*' || tok === '+') && operator === '')
								{
									operator = tok;
									ndx = -1;
								}
								else
								{
									const elt = type === 'object' ? R.category.newObject(this, tok) : R.diagram.getElement(tok);
									if (ndx > -1 && elements.length > 0)		// admit prior elements with operator
									{
										type === 'object' ? placeObjects() : placeMorphisms();;
										i !== last && elements.push(elt);
										operator = '';
									}
									else
										i !== last && elements.push(elt);
									if (i === last)
									{
										elements.push(elt);
										type === 'object' ? placeObjects() : placeMorphisms();;
									}
									ndx = i;
								}
							});
						}
					}
				}
			}
			catch(x)
			{
				D.statusbar.show(e, x);
			}
			let node = e.target.parentNode;		// remove text editor
			while(node)
			{
				if (node.tagName === 'foreignObject')
				{
					node.remove();
					break;
				}
				node = node.parentNode;
			}
			D.closeActiveTextEdit();
			text.decrRefcnt();
			this.makeSelected(...created);
		};
		div.addEventListener('focusout', onfocusout);
		div.addEventListener('keydown', onkeydown);
		div.addEventListener('keyup', onkeydown);
		this.sync = oldSync;
	}
	newInput(e)
	{
		switch(D.inputMode)
		{
			case 'text':
				this.newText(e);
				break;
			case 'object':
				this.newElement(e, 'object');
				break;
			case 'morphism':
				this.newElement(e, 'morphism');
				break;
		}
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
				const viewport = D.session.getCurrentViewport();
				const scale = 1 / viewport.scale;
				const pnt = D.userToSessionCoords({x:0, y:0});
				const box = D2.expand(new D2({x:pnt.x, y:pnt.y, width:scale * D.width(), height:scale * D.height()}), D.height()/2);
				if (bkgnd)
				{
					bkgnd.setAttribute('x', `${box.x}px`);
					bkgnd.setAttribute('y', `${box.y}px`);
					bkgnd.setAttribute('width', `${box.width}px`);		// 2x for margin due to transitions
					bkgnd.setAttribute('height', `${box.height}px`);
				}
				else
				{
					const args = {id:'diagram-background', 'data-name':this.name, 'data-type':'diagram',
																		x:`${box.x}px`, y:`${box.y}px`, width:`${box.width}px`, height:`${box.height}px`};
					bkgnd = H3.rect('.diagramBackgroundActive', {id:'diagram-background', 'data-name':this.name, 'data-type':'diagram',
																		x:`${box.x}px`, y:`${box.y}px`, width:`${box.width}px`, height:`${box.height}px`});
				}
				bkgnd.ondblclick = e => this.isEditable() && this.newInput(e);		// defer editable check
				this.svgRoot.parentNode.insertBefore(bkgnd, this.svgRoot);
				dgrmBkgnd.classList.add('hidden');
				dgrmF4gnd.classList.add('hidden');
				return;
			}
			else
			{
				dgrmBkgnd.classList.remove('hidden');
				dgrmF4gnd.classList.remove('hidden');
				dgrmF4gnd.classList.add('grabbable');
			}
			const bbox = this.getSessionBBox();
			const placement = D.session.getPlacement(this.name);
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
		!D.textEditActive() && D.svg2canvas(this, (png, pngName) =>
		{
			D.diagramPNGs.set(this.name, png);
			const tx = D.store.transaction(['PNGs'], 'readwrite');
			tx.onsuccess = e => R.debug(1) && console.log('png stored', this.name);
			tx.onerror = e => R.recordError(e);
			const pngStore = tx.objectStore('PNGs');
			pngStore.put({name:this.name, png});
			D.emitPNGEvent(this, 'new', png);
			fn && fn(e);
		});
	}
	updateTimestamp()
	{
		this.timestamp = Date.now();
		const info = R.catalog.get(this.name);
		if (info)
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
// TODO fix recursor copying
	copy(basename, properName, description)
	{
		const user = R.user.name;
		const name = `${user}/${basename}`;
		const change = str => str.replace(this.name + '/', name + '/');
		const json = this.json(false);
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
				case 'Cell':
					// TODO?
					break;
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
				case 'Identity':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.domain);
					break;
				case 'Morphism':
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
				case 'PullbackAssembly':
				case 'HomMorphism':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					elt.morphisms = elt.morphisms.map(m => change(m));
					break;
			}
		});
		json.domainInfo.elements.forEach(elt =>
		{
			elt.name = `${name}/${elt.basename}`;
			elt.diagram = name;
			if ('to' in elt && nameMap.has(elt.to))
				elt.to = nameMap.get(elt.to);
			switch(elt.prototype)
			{
				case 'IndexObject':
				case 'IndexText':
				case 'IndexCode':
					break;
				case 'IndexMorphism':
					elt.domain = change(elt.domain);
					elt.codomain = change(elt.codomain);
					break;
				case 'Cell':
					// TODO
					break;
			}
		});
		const diagram = new Cat[json.prototype](R.getUserDiagram(user), json);
		return diagram;
	}
	moveElements(offset, ...elements)
	{
		if (!this.isEditable())
			return;
		const off = new D2(offset);
		const items = new Set();
		elements.map(elt =>
		{
			if (elt instanceof IndexText || elt instanceof IndexObject)
				items.add(elt);
			else if (elt instanceof IndexMorphism)
			{
				items.add(elt.domain);
				items.add(elt.codomain);
			}
		});
		items.forEach(elt =>
		{
			elt.setXY(off.add(elt.getXY()));
			D.emitElementEvent(this, 'move', elt);
		});
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
				case 'IndexText':
				case 'IndexCode':
				case 'IndexObject':
				case 'IndexMorphism':
					!U.isValidBasename(elt.basename) && errors.push(`Invalid basename: ${U.HtmlEntitySafe(elt.basename)}`);
					break;
			}
		};
		this.domain.elements.forEach(chkBasename);
		this.elements.forEach(chkBasename);
		this.elements.forEach(elt => !refs.has(elt.diagram.name) && errors.push(`Element not in scope: ${U.HtmlEntitySafe(elt.name)}`));
		errors.length > 0 && console.error(`${errors.length} errors found\n` + errors.join('\n'));
		return errors;
	}
	close()
	{
		this.hide();
		if (this.svgRoot)
		{
			this.svgRoot.remove();
			this.svgRoot = null;
			this.svgBase = null;
		}
		D.emitCATEvent('close', this);
	}
	setViewport()
	{
		const placement = D.session.getPlacement(this.name);
		const viewport = D.session.getViewport(this.name);
		const vp = new D2(viewport).add(placement);
		this.viewport = {x:vp.x, y:vp.y, scale:viewport.scale / placement.scale};
	}
	getCell(name)
	{
		return this.domain.getCell(name);
	}
	getTabItems(element)
	{
		let items = [];
		if (element instanceof CatObject)
			items = this.domain.getObjects().filter(itm => itm.to === element.to);
		else if (element instanceof Morphism)
			items = this.domain.getMorphisms().filter(itm => itm.to === element.to);
		else if (element instanceof IndexText)
			items = this.getTexts();
		return items;
	}
	getCategory(cat)
	{
		if (cat instanceof Category)
			return cat;
		let category = this.getElement(cat);
		if (!category)
			category = R.getCategory(cat);
		return category;
	}
	showCode(ext)
	{
		const scanned = new Set();
		this.forEachCode(txt => txt.ext === ext && scanned.add(this.getElement(txt.element)));
		if (scanned.size > 0)
		{
			this.hideCode(ext);
			return;
		}
		[...this.domain.elements.values()].map(elt =>
		{
			if (elt instanceof IndexMorphism && 'code' in elt.to && ext in elt.to.code && !scanned.has(elt.to))
			{
				const foundIt = this.svgRoot.querySelector(`g[data-morphism="${elt.to.name}"]`);
				if (!foundIt)
				{
					const description = elt.to.code[ext];
					let xy = new D2(elt.start);
					const height = 6;
					xy = xy.add({x:0, y:height + D.default.font.height});
					const txt = new IndexCode(this, {description, xy, height, weight:'normal', ext, element:elt.to});
				}
				scanned.add(elt.to);
			}
			else if (elt instanceof IndexObject && 'code' in elt.to && ext in elt.to.code && elt.domains.size === 0 && elt.codomains.size === 0 && !scanned.has(elt.to))
			{
				const foundIt = this.svgRoot.querySelector(`g[data-morphism="${elt.to.name}"]`);
				if (!foundIt)
				{
					const description = elt.to.code[ext];
					let xy = new D2(elt.getXY());
					const height = 6;
					xy = xy.add({x:0, y:height + D.default.font.height});
					const txt = new IndexCode(this, {description, xy, height, weight:'normal', ext, element:elt.to});
				}
				scanned.add(elt.to);
			}
		});
	}
	hideCode(ext)
	{
		this.forEachCode(txt => txt.ext === ext && txt.decrRefcnt());
	}
	getDefinitions()
	{
		const defs = [];
		[...R.getReferences(this.name)].map(ref => R.$CAT.getElement(ref)).map(ref => ref.forEachDefinition(def => defs.push(def)));
		return defs;
	}
	getCategories()
	{
		const cats = new Set();
		this.elements.forEach(o => o instanceof Category && cats.add(o));
		cats.add(this.codomain);
		return cats;
	}
	glowBadObjects()
	{
		const objects = [];
		this.domain.forEachObject((o, k) =>
		{
			if (o.svg)
			{
				o.svg.classList.remove('badGlow');
				const bx = D2.add(o.svg.getBBox(), o.getXY());
				objects.push(bx);
				for (let i=0; i<objects.length -1; ++i)
					if (D2.overlap(objects[i], bx))
						o.svg.classList.add('badGlow');
			}
		});
	}
	getUsingElements(elt)
	{
		const useElts = [];
		this.getAll().forEach(e =>
		{
			let rslt = false;
			if (e instanceof MultiObject)
				rslt = e.objects.filter(o => o === elt).length > 0;
			else if (e instanceof MultiMorphism)
				rslt = e.morphisms.filter(m => m === elt).length > 0;
			else if (e instanceof NamedObject || e instanceof NamedMorphism)
				rslt = e.source === elt;
			else if (e instanceof LambdaMorphism)
				rslt = e.preCurry === elt;
			else if (e.constructor.name === 'Morphism' && 'recursor' in e)
				rslt = e.recursor === elt;
			rslt && useElts.push(e);
		});
		this.domain.elements.forEach(e => 'to' in e && e.to === elt && useElts.push(e));
		return useElts;
	}
	static Codename(args)
	{
		return `${args.user}/${args.basename}`;
	}
	static GetInfo(diagram)
	{
		const info =
		{
				name:			diagram.name,
				basename:		diagram.basename,
				description	:	diagram.description,
				properName:		diagram.properName,
				timestamp:		diagram.timestamp,
				user:			diagram.user,
		};
		if (diagram instanceof Diagram)
		{
			const refs = [];
			diagram.references.forEach(r => refs.push(typeof r === 'string' ? r : r.name));
			info.category = diagram.category ? diagram.category.name : 'CAT';		// TODO simplify
			info.codomain = diagram.codomain.name;
			info.prototype = diagram.constructor.name;
			info.references = refs;
		}
		else
		{
			info.category = diagram.category;
			info.codomain = diagram.codomain;
			info.prototype = diagram.prototype;
			info.references = diagram.references;
		}
		if (!info.category || info.category === 'undefined')	// TODO remove
			info.category = 'CAT';
		if (!info.prototype || info.prototype === 'undefined')	// TODO remove
			info.prototype = 'Diagram';
		return info;
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
		this.injections = new Set();
		this.composites = new Map();	// origins+inputs to array of morphisms to compose
		this.obj2morph = new Map();
		this.processed = new Set();
		this.issues = [];
		this.finished = false;
		this.inCoproduct = false;
		this.clearGraphics();
	}
	clearGraphics()
	{
		[...this.diagram.svgRoot.querySelectorAll('.assyError, .assyFold, .assyCoreference, .assyInput, .assyOutput, .assyReference, .assyOrigin')].map(elt => elt.remove());
	}
	static addBall(title, type, cls, o)
	{
		const onmouseenter = e => D.statusbar.show(e, title);
		if (o instanceof IndexObject)
		{
			const bbox = o.svg.getBBox();
			o.svg.appendChild(H3.ellipse('.ball', {id:type + '-' + o.elementId('asmblr'), class:cls, onmouseenter, rx:bbox.width/2 + D.default.margin}));
		}
		else if (o instanceof IndexMorphism)
		{
			const bbox = o.svg_nameGroup.getBBox();
			o.svg_nameGroup.appendChild(H3.ellipse('.ball', {id:type + '-' + o.elementId('asmblr'), class:cls, onmouseenter, rx:bbox.width/2 + D.default.margin}));
		}
	}
	static isReference(m)
	{
		const morphism = m instanceof IndexMorphism ? m.to.basic() : m.basic();
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
		const morphism = m instanceof IndexMorphism ? m.to.basic() : m.basic();
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
		return [...object.domains].filter(m => this.coreferences.has(m)).length;
	}
	referenceUseCount(object)	// the number of ref's or coref's whose codomain is this object
	{
		return [...object.codomains].filter(m => this.references.has(m)).length;
	}
	useCount(object)	// the number of ref's or coref's whose codomain is this object
	{
		return [...object.codomains].filter(m => this.references.has(m) || this.coreferences.has(m)).length;
	}
	isInput(object)
	{
		if (this.codomainCount(object) === 0)
		{
			const refs = [...object.domains].filter(m => (this.references.has(m) && !Assembler.isTerminalId(m)) || (this.coreferences.has(m) && !Assembler.isTerminalId(m)));
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
		!this.inputs.has(obj) && R.debug(3) && Assembler.addBall('Input', 'input', 'assyInput', obj);
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
		R.debug(3) && Assembler.addBall('Output', 'output', 'assyOutput', obj);
	}
	deleteOutput(obj)
	{
		this.outputs.delete(obj);
		this.deleteEllipse('output', obj);
	}
	addOverloaded(ovr)
	{
		this.overloaded.add(ovr);
		Assembler.addBall('Overload', 'ovr', 'assyOverload', ovr);
	}
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
		!this.origins.has(obj) && R.debug(3) && Assembler.addBall('Origin', 'origin', 'assyOrigin', obj);
		this.origins.add(obj);
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
	getBlob(obj)		// establish connected graph and issues therein, starting at the diagram object obj
	{
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
				if (m.attributes.has('referenceMorphism') && m.attributes.get('referenceMorphism'))
					m.to.dual ? this.coreferences.add(m) : this.references.add(m);
				else if (m.to instanceof FactorMorphism && m.to.dual && m.to.factors.length === 1)
					this.injections.add(m);
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
		const barGraph = new Graph(this);
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
		this.objects.forEach(o => o.assyGraph = o.to.getGraph({position:0}));
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
		return [...obj.domains].filter(m => this.references.has(m));
	}
	getReferencesTo(obj)
	{
		return [...obj.codomains].filter(m => this.references.has(m));
	}
	getCoreferences(obj)
	{
		return [...obj.codomains].filter(m => this.coreferences.has(m));
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
		const domScanner = (dm, input) =>
		{
			if (this.references.has(dm))
			{
				if (dm.codomain.assyGraph.hasTag('info'))
					this.inputs.delete(input);
			}
			if (!scanned.has(dm.codomain))
			{
				this.propTag(dm, dm.to, dm.graph, Assembler.getBarGraph(dm), 'info', true);
				!scanning.includes(dm.codomain) && scanning.push(dm.codomain);
			}
		};
		const codScanner = dm =>
		{
			if (this.references.has(dm))
			{
				if (!this.propagated.has(dm))
				{
					this.backLinkTag(dm, dm.graph, Assembler.getBarGraph(dm), 'info');
					!scanning.includes(dm.domain) && scanning.push(dm.domain);
				}
			}
		};
		while(scanning.length > 0)
		{
			const input = scanning.pop();
			const hasTag = input.assyGraph.hasTag('info');
			input.domains.forEach(o => domScanner(o, input));
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
						// TODO check references going to same pre-fold nodes as they cause duplicate factors but are the same ref
						refs.map(ref => factors.push(...ref.to.factors));
						if (FactorMorphism.isReference(factors))
						{
							// do the factors cover the origin?
							if (!this.diagram.isCovered(src.to, factors, this.issues))
								this.addError('Origin not covered', src);
						}
						else
						{
							this.issues.push('Duplicate factors found');
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
		const morphs = [...cod.domains].filter(m => !this.references.has(m) && !this.injections.has(m));
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
			// don't follow references, coreferences, or injections
			if (!this.references.has(m) && !this.coreferences.has(m) && !this.injections.has(m))
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
	getComposites(domain, codomains)
	{
		return this.composites.has(domain) ? this.composites.get(domain).map((comp, i) =>
		{
			codomains[i] = comp[comp.length -1].codomain;
			return this.diagram.comp(...comp.map(m => m.to));
		}) : [];
	}
	formCoreferences(domObjects, coreferences, cofactors, codObjects)
	{
		const diagram = this.diagram;
		const terminal = diagram.getTerminal();
		const lastInCoproduct = this.inCoproduct;
		this.inCoproduct = true;
		const subs = [];
		coreferences.map((insert, i) =>
		{
			const factorsi = [];
			const fctr = insert.to.factors[0];	// what factor are we hitting in the coproduct?
			cofactors[fctr] = factorsi;
			const iDomObjects = [];
			subs[fctr] = this.formMorphism(insert.domain, iDomObjects, codObjects);
			if (iDomObjects.length > 0)
			{
				iDomObjects.map(o =>
				{
					const ndx = domObjects.indexOf(o);
					if (ndx > -1)
						factorsi.push(ndx);
					else
					{
						domObjects.push(o);
						factorsi.push(domObjects.length -1);
					}
				});
			}
			else
				factorsi[0] = -1;
		});
		return subs;
	}
	isCovered(domain)
	{
		const refs = this.getCoreferences(domain);
		const factors = refs.map(ref => Morphism.isIdentity(ref.to) ? [0] : ref.to.factors).filter(fctr => !(fctr.length === 1 && fctr[0] === -1));
		// TODO bad cover
		return this.diagram.isCovered(domain.to, factors, []);
	}
	// refObjects: index objects referenced
	formReferenceMorphism(ref, refObjects, factors, codObjects)
	{
		const domRefs = this.getReferences(ref.domain);
		const refFactors = domRefs.map(dref => Morphism.isIdentity(dref.to) ? [] : dref.to.factors).filter(fctr => !(fctr.length === 1 && fctr[0] === -1));
		if (this.diagram.isCovered(ref.domain.to, refFactors, []) && domRefs.filter(dref => !this.processed.has(dref.codomain)).length === 0)		// must be covered and processed all referenced index objects
		{
			const fndDomObjects = [];
			const morphism = this.formMorphism(ref.domain, fndDomObjects, codObjects);
			if (morphism)
			{
				domRefs.map(dref => !dref.to.codomain.isTerminal() && refObjects.push(dref.codomain));
				refObjects.push(...fndDomObjects);
				domRefs.map(dref =>
				{
					if (!dref.codomain.to.isTerminal())
					{
						const domndx = refObjects.indexOf(dref.codomain);
						if (domndx > -1)
						{
							if (!Morphism.isIdentity(dref.to))
								factors[dref.to.factors[0]] = domndx;
						}
						else if (dref === ref)
						{
						}
						else
						{
							debugger;
						}
					}
				});
				return morphism;
			}
			else
			{
				domRefs.filter(dref => !dref.codomain.to.isTerminal()).map(dref =>
				{
					refObjects.push(dref.codomain);
				});
				return this.diagram.id(ref.domain.to);
			}
		}
		return null;
	}
	formMorphism(domain, domObjects, codObjects)		// recursive; can return null
	{
console.log('formMorphism', domain.svg, domain.basename);
		if (this.processed.has(domain))
			return null;
		this.processed.add(domain);
		const diagram = this.diagram;
		//
		// REFERENCES TO
		//
		// continue along references that point to the domain
		// these all become part of the final assembly
		//
		const referencesTo = this.getReferencesTo(domain);
		let refToMorphisms = [];
		if (referencesTo.length > 0)
		{
			refToMorphisms = referencesTo.map((ref, i) =>
			{
				const factors = [];
				const refObjects = [];
				const morphism = this.formReferenceMorphism(ref, refObjects, factors, codObjects);
				if (morphism)
				{
					refObjects.map((o, j) =>
					{
						if (o !== domain)
						{
							const ndx = domObjects.indexOf(o);
							if (ndx === -1)
								domObjects.push(o);
						}
					});
					return {morphism, refObjects, factors};
				}
				return null;
			}).filter(item => item);		// remove references that did not generate a morphism
		}
		//
		// COMPOSITES
		//
		//
		// from the given domain we can have composites followed by formMorphisms, or the start of a coproduct cover
		// we have to go through both phases first before we know our domain that includes all the references obtained from both
		//
		// now get the composites followed by their codomains' formMorphisms
		//
		const compCods = [];
		const firstComposites = this.getComposites(domain, compCods);		// compCods are in parallel to first composites
		//
		// Each of the composites has the same codomain, but continuing on from their codomains means adding more references to the final composite domains.
		//
		const assembly = [];
		let isDomainReferenced = false;
		compCods.map((cod, i) =>
		{
			const assemblyI = [];
			assembly[i] = assemblyI;
			const codDomObjects = [];
			const codCodObjects = [];
			const secondMorph = this.formMorphism(cod, codDomObjects, codCodObjects);
			if (secondMorph)
			{
				const factors = [];
				codDomObjects.map((o, j) =>
				{
					if (domain === o)
					{
						factors.push(0);
						isDomainReferenced = true;
					}
					else
					{
						const ndx = domObjects.indexOf(o);
						if (ndx === -1)
						{
							domObjects.push(o);
							factors.push(domObjects.length);		// +1 for the domain object
						}
						else
							factors.push(ndx + 1);		// +1 for the domain object
					}
				});
				codObjects.push(...codCodObjects);
				assemblyI.push([secondMorph, factors]);
			}
			else
				codObjects.push(cod);
		});
		//
		// COVER
		//
		// there can only be one cover per domain
		//
		let cover = [];
		const cofactors = [];
		const coreferences = this.getCoreferences(domain);
		if (coreferences.length > 0)
		{
			const corefactors = [];
			coreferences.map(cor =>
			{
				if (corefactors.filter(cofctr => U.arrayEquals(cofctr, cor.to.factors)).length > 0)		// TODO move to preprocessing
					throw 'Duplicate factors not allowed';
				corefactors.push(cor.to.factors);
			});
			if (corefactors.length !== coreferences.length)
				throw 'bad cover';
			const coverCodObjects = [];
			cover = this.formCoreferences(domObjects, coreferences, cofactors, coverCodObjects);
			if (cover.filter(m => m === null).length > 0)
				throw 'Missinge part of cover';
			const coverCodomainCorefs = coverCodObjects.map(o => [...o.domains].filter(m => m.to instanceof FactorMorphism && m.to.dual && m.to.factors.length === 1)).filter(ary => ary.length > 0).map(ary => ary[0]);
			if (coverCodomainCorefs.length > 0)
			{
				const codomain = coverCodomainCorefs[0].codomain;
				if (coverCodomainCorefs.filter(ref => ref.codomain !== codomain).length > 0)
					throw 'Not a good cover';
				const factors = [];
				coverCodomainCorefs.map(ins =>
				{
					if (factors.filter(cofctr => U.arrayEquals(cofctr, ins.to.factors)).length > 0)		// TODO move to preprocessing
						throw 'Duplicate insertion factors';
				});
				codObjects.push(codomain);		// coproduct terminus object
			}
		}
		//
		// DOMAIN
		//
		// now we know all the objects in our domain
		//
		const domainNdxObjects = [domain, ...domObjects];

		const preFactors = [domainNdxObjects.length === 1 ? [] : (domain.to.isTerminal() ? -1 : 0)];
		const simpDomainObjects = domainNdxObjects.map((o, i) =>
		{
			i > 0 && preFactors.push(o.to.isTerminal() ? -1 : preFactors.length);
			return o.to;
		}).filter(o => !o.isTerminal());
		const simpDomain = simpDomainObjects.length > 0 ? diagram.prod(...simpDomainObjects) : diagram.getTerminal();
		const central = diagram.fctr(simpDomain, preFactors);

		const nuDomain = diagram.prod(...domainNdxObjects.map(o => o.to));
		//
		// PREAMBLES
		//
		// 		references to
		//
		// if an origin or an output we may need to assemble the value
		//
		const finalAssembly = [];		// the returned morphism is an assembly of the morphisms herein
		refToMorphisms.map(data =>
		{
			const factors = [];
			const morphisms = [];
			data.refObjects.map((o, i) =>
			{
				const ndx = domainNdxObjects.indexOf(o);
				factors[data.factors.length === 0 ? 0 : data.factors[i]] = ndx;
				morphisms[i] = this.obj2morph.has(o) ? this.obj2morph.get(o) : diagram.id(o.to);
			});
			const prod = diagram.prod(...morphisms);
			const fctr = diagram.fctr(nuDomain, factors);
			const setupFactors = morphisms.map((m, i) => m.domain.isTerminal() ? -1 : i);
			const setupObjects = morphisms.map(m => m.domain).filter(o => !o.isTerminal());
			const setupDomain = diagram.prod(...setupObjects);
			const setup = diagram.fctr(setupDomain, setupFactors);
			finalAssembly.push(diagram.stripComp(fctr, setup, prod, data.morphism));
		});
		//
		//		composites
		//
		firstComposites.map((comp, i) =>
		{
			const assemblyI = assembly[i];
			const pre = [comp];
			const factors = [domObjects.length === 0 ? [] : 0];
			domObjects.map((o, j) =>
			{
				pre.push(diagram.id(o.to));
				factors.push(factors.length);
			});
			if (isDomainReferenced)
			{
				pre.push(diagram.id(domain.to));
				factors.push(0);
			}
			const premanifold = diagram.stripComp(diagram.fctr(nuDomain, factors), diagram.prod(...pre));
			if (assemblyI.length > 0)
			{
				const assys = assemblyI.map(pair =>
				{
					const secondComp = pair[0];
					const factors = pair[1].map(f => f === 0 ? pre.length -1 : f);
					factors.unshift(0);
					return diagram.stripComp(diagram.fctr(premanifold.codomain, factors), secondComp);
				});
				finalAssembly.push(diagram.comp(premanifold, diagram.assy(...assys)));
			}
			else
				finalAssembly.push(premanifold);
		});
		//
		//		cover
		//
		// the last assembly entry to create is for the cover
		//
		if (cover.length > 0)
		{
			// For distribution, gather the 'extra' terms in domObjects as a single product
			const refObject = this.diagram.prod(...domObjects.map(o => o.to));
			// predist: nuDomain ---> domain x refObject
			const predist = this.diagram.assy(this.diagram.fctr(nuDomain, [0]), this.diagram.fctr(nuDomain, domObjects.map((o, i) => i + 1)));
			const dist = this.diagram.dist(diagram.prod(domain.to, refObject), true);
			const foldObjects = [];
			const foldFactors = [];
			const allCoverCodsEq = cover.reduce((r, m) => r && m.codomain === cover[0].codomain, true);
			const components = dist.codomain.objects.map((o, i) =>
			{
				const prep = diagram.fctr(o, [1]);
				const proj = diagram.fctr(refObject, cofactors[i]);
				const cvri = cover[i];
				let ndx = foldObjects.indexOf(cvri.codomain);
				if (ndx === -1)
				{
					foldObjects.push(cvri.codomain);
					ndx = foldObjects.length -1;
				}
				foldFactors[i] = allCoverCodsEq ? [] : ndx;
				return diagram.stripComp(prep, proj, cvri);
			});
			const coprod = diagram.coprod(...components);
			const folder = diagram.cofctr(diagram.coprod(...foldObjects), foldFactors);
			finalAssembly.push(this.diagram.stripComp(predist, dist, coprod, folder));
		}
		//
		// ASSEMBLY
		//
		// form the assembly of all the pieces for our given domain index object
		//
		if (finalAssembly.length > 0)
		{
			const morphism = diagram.assy(...finalAssembly);
			if (codObjects.length === 1)
				this.obj2morph.set(codObjects[0], morphism);
			return diagram.stripComp(central, morphism);
		}
		return null;
	}
	getBlobMorphism()
	{
		let ndx = 0;
		let scanning = [];
		const inputs = [...this.inputs];
		inputs.map(input => scanning.push({domain:input}));
		const scanInputs = scanning.slice();
		const codObjects = [];
		const inputMorphs = scanInputs.map(i => this.formMorphism(i.domain, [], codObjects)).filter(m => m);
		return inputMorphs.pop();
	}
	// try to form a morphism from a blob
	assemble(e, base)
	{
		try
		{
			//
			// establish connected graph and issues therein
			//
			this.getBlob(base);
			//
			// find origins
			//
			this.findOrigins();
			//
			// merge tags from morphism graphs to object graphs
			//
			this.mergeObjectTags();
			//
			// look for inputs
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
					const compObjs = D.placeComposite(e, this.diagram, morphism);
					R.Actions.zoom.action(e, this.diagram, compObjs);
				}
				else
				{
					const from = this.diagram.placeMorphism(morphism, base.getXY(), null, true);
					const elts = [...this.objects];
					elts.push(from);
					R.Actions.zoom.action(e, this.diagram, elts);
				}
				D.emitCellEvent(this.diagram, 'check');
			}
			else
			{
				D.statusbar.show(e, 'No morphism assembled');
				this.issues.push({message:'No morphism assembled', element:{}});
			}
			this.finished = true;
			return morphism;
		}
		catch(x)
		{
			this.issues.push({message:x, element:{}});
			D.statusbar.show(e, 'An error occurred');
			this.finished = true;
			return null;
		}
	}
}

const R = new Runtime();
const D = isGUI ? new Display() : null;

const Cat =
{
	Action,
	Amazon,
	D,
	Display,
	Category,
	CatObject,
	Cell,
	Composite,
	Dedistribute,
	Definition,
	DefinitionInstance,
	Diagram,
	IndexMorphism,
	IndexObject,
	IndexCode,
	IndexText,
	Distribute,
	Element,
	Evaluation,
	FactorMorphism,
	FiniteObject,
	HomObject,
	HomMorphism,
	Identity,
	IndexCategory,
	IndexElement,
	LambdaMorphism,
	LanguageAction,
	Morphism,
	MultiObject,
	MultiMorphism,
	NamedObject,
	NamedMorphism,
	ProductObject,
	ProductMorphism,
	ProductAssembly,
	PullbackObject,
	PullbackAssembly,
	R,
	Runtime,
	TensorObject,
	Theorem,
	U,
};

if (D)
{
	window.Cat = Cat;
	window.addEventListener('load', _ => R.initialize());
	Cat.D.addEventListeners();
}
else
	Object.keys(Cat).forEach(cls => exports[cls] = Cat[cls]);
})();
