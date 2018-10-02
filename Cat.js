// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
'use strict';


(function(exports)
{
if (typeof require !== 'undefined')
{
	var AWS = null;
	var ACI = null;
	var CatFns = null;
	var sjcl = null;
	AWS = require('aws-sdk');
	if (typeof AmazonCognitoIdentity === 'undefined')
		ACI = require('amazon-cognito-identity-js');
	sjcl = require('./sjcl.js');
	CatFns = require('./CatFns.js');
}
else
{
	var CatFns = window.CatFns;
	var AWS = window.AWS;
	var sjcl = window.sjcl;
}

var $Cat = null;	// Cat of cats

const eps = 0.0000001;
function inbetween(a, b, c)
{
	return (a - eps <= b && b <= c + eps) || (c - eps <= b && b <= a + eps);
}
function inside(a, b, c)
{
	return inbetween(a.x, b.x, c.x) && inbetween(a.y, b.y, c.y);
}
function segmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4)
{
	const deltaX12 = x1 - x2;
	const deltaX34 = x3 - x4;
	const deltaY12 = y1 - y2;
	const deltaY34 = y3 - y4;
	const x1y2 = x1 * y2;
	const x2y1 = x2 * y1;
	const x3y4 = x3 * y4;
	const x4y3 = x4 * y3;
	const deltaX1Y1_X2Y1 = x1y2 - x2y1;
	const deltaX3Y4_X4Y3 = x3y4 - x4y3;
	const denom = deltaX12 * deltaY34 - deltaY12 * deltaX34;
	const x = (deltaX1Y1_X2Y1 * deltaX34 - deltaX12 * deltaX3Y4_X4Y3) / denom;
	const y = (deltaX1Y1_X2Y1 * deltaY34 - deltaY12 * deltaX3Y4_X4Y3) / denom;
	if (denom === 0.0)
		return false;
	if (!(inbetween(x2, x, x1) && inbetween(y2, y, y1) && inbetween(x3, x, x4) && inbetween(y3, y, y4)))
		return false;
	return {x, y};
}
function dist2(v, w)
{
	const dx = v.x - w.x;
	const dy = v.y - w.y;
	return dx * dx + dy * dy;
}
function segmentDistance(p, v, w)
{
	const l2 = dist2(v, w);
	if (l2 === 0)
		return D2.dist(p, v);
	let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	t = Math.max(0, Math.min(1, t));
	return D2.dist(p, {x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y)});
}
function getCat()
{
	return $Cat ? $Cat.getObject(Cat.selected.category) : null;
}

class D2
{
	static add(v, w)
	{
		return {x:v.x + w.x, y:v.y + w.y};
	}
	static length(v)
	{
		return Math.sqrt(v.x * v.x + v.y * v.y);
	}
	static norm(v)
	{
		const length = D2.length(v);
		return {x:v.x / length, y:v.y / length};
	}
	static scale(a, v)
	{
		return {x:v.x*a, y:v.y*a};
	}
	static subtract(v, w)
	{
		return {x:v.x - w.x, y:v.y - w.y};
	}
	static normal(v)
	{
		return {x:-v.y, y:v.x};
	}
	static round(v)
	{
		return {x:Math.round(v.x), y:Math.round(v.y)};
	}
	static multiply(mtrx, vctr)
	{
		const r =
		{
			x:mtrx[0][0] * vctr.x + mtrx[0][1] * vctr.y,
			y:mtrx[1][0] * vctr.x + mtrx[1][1] * vctr.y
		};
		return r;
	}
	static dist(v, w)
	{
		return Math.sqrt(dist2(v, w));
	}
}

class H
{
	static ok(a)
	{
		return !(typeof a === 'undefined') && a !== '' && a !== null;
	}
	static x(tag, h, c, i, t, x)
	{
		return `<${tag}${H.ok(c) ? ` class="${c}"` : ''}${H.ok(i) ? ` id="${i}"` : ''}${H.ok(t) ? ` title="${t}"` : ''}${H.ok(x) ? ` ${x}` : ''}>${h}</${tag}>`;
	}
	static a	(h, c, i, t, x)	{return H.x('a', h, c, i, t, x); }
	static br	()				{return '<br/>'; }
	static button	(h, c, i, t, x)	{return H.x('button', h, c, i, t, x); }
	static div	(h, c, i, t, x)	{return H.x('div', h, c, i, t, x); }
	static form	(h, c, i, t, x)	{return H.x('form', h, c, i, t, x); }
	static h1	(h, c, i, t, x)	{return H.x('h1', h, c, i, t, x); }
	static h2	(h, c, i, t, x)	{return H.x('h2', h, c, i, t, x); }
	static h3	(h, c, i, t, x)	{return H.x('h3', h, c, i, t, x); }
	static h4	(h, c, i, t, x)	{return H.x('h4', h, c, i, t, x); }
	static h5	(h, c, i, t, x)	{return H.x('h5', h, c, i, t, x); }
	static hr	()				{return '<hr/>'; }
	static input(h, c, i, t, x) {return `<input id="${i}" class="${c}" type="${t}" value="${h}" placeholder="${x.ph}" ${'x' in x ? x.x : ''}/>`; }
	static p	(h, c, i, t, x)	{return H.x('p', h, c, i, t, x); }
	static pre	(h, c, i, t, x)	{return H.x('pre', h, c, i, t, x); }
	static small(h, c, i, t, x)	{return H.x('small', h, c, i, t, x); }
	static span	(h, c, i, t, x)	{return H.x('span', h, c, i, t, x); }
	static sub	(h, c, i, t, x)	{return H.x('sub', h, c, i, t, x); }
	static table(h, c, i, t, x)	{return H.x('table', h, c, i, t, x); }
	static td	(h, c, i, t, x)	{return H.x('td', h, c, i, t, x); }
	static textarea	(h, c, i, t, x)	{return H.x('textarea', h, c, i, t, x); }
	static th	(h, c, i, t, x)	{return H.x('th', h, c, i, t, x); }
	static tr	(h, c, i, t, x)	{return H.x('tr', h, c, i, t, x); }
	static del(elt) {elt.parentElement.removeChild(elt);}
	static move(elt, toId) {document.getElementById(toId).appendChild(elt); }
	static toggle(elt, here, there) {elt.parentNode.id === here ? H.move(elt, there) : H.move(elt, here); }
}

class operator
{
	constructor(args)
	{
		this.sym = args.sym;
		this.symCode = args.symCode;
		this.nameCode = args.nameCode;
	}
	toName(tokens)
	{
		return tokens.join(this.nameCode);
	}
	toCode(tokens)
	{
		return tokens.map(t => `(${t})`).join(this.symCode);
	}
	toHtml(tokens)
	{
		return tokens.join(this.sym);
	}
}

const isGUI = typeof window === 'object';
if (isGUI)
	(function(d)
	{
		var a = d.createElement('script');
		a.type = 'text/javascript';
		a.async = true;
		a.id = 'amazon-login-sdk';
		a.src = 'https://api-cdn.amazon.com/sdk/login1.js?v=3';
		d.getElementById('navbar').appendChild(a);
	})(document);

const Cat =
{
	autosave:		false,
	bootstrap:		false,
	catalog:		{},
	clear:			false,
	debug:			true,
	diagrams:		{},
	initialized:	false,
	nameEx:			RegExp('^[a-zA-Z_-]+[@a-zA-Z0-9_-]*$'),
	localDiagrams:	{},
	secret:			'8b1ff7749bda89c084bba7fa1b7e9015e952bb455100fbe518c86f71c7f3592c',
	sep:			'@',
	serverDiagrams:	{},
	statusXY:		{x:0, y:0},
	user:			{name:'Anon', email:'', status:'unauthorized'},	// TODO fix after bootstrap removed
	userNameEx:		RegExp('^[a-zA-Z_-]+[a-zA-Z0-9_]*$'),
	mouse:			{down:{x:0, y:0}, xy:{x:0, y:0}},
	url:			'',
	getError(err)
	{
		return typeof err === 'string' ? err : err.message;
	},
	recordError(err)
	{
		let txt = Cat.getError(err);
		console.log('Error: ', txt, err);
		debugger;
		if (isGUI)
		{
			if (typeof err === 'object' && 'stack' in err && err.stack != '')
				txt += H.br() + H.small('Stack Trace') + H.pre(err.stack);
			document.getElementById('error-out').innerHTML += '<br/>' + txt;
			Cat.display.panel.open('tty');
			Cat.display.accordion.open('errorOutPnl');
		}
		else
			process.exit(1);
	},
	status(e, msg)
	{
		const s = Cat.display.statusbar;
		if (msg === null || msg === '')
		{
			s.style.display = 'none';
			return;
		}
		s.innerHTML = H.div(msg);
		const bbox = e.target.getBoundingClientRect();
		s.style.left = `${e.clientX + 10}px`;
		s.style.top = `${e.clientY}px`;
		s.style.opacity = 1;
		s.style.display = 'block';
		Cat.statusXY = {x:e.clientX, y:e.clientY};
		document.getElementById('tty-out').innerHTML += msg + "\n";
	},
	barycenter(ary)
	{
		let elts = {};
		for(let i=0; i<ary.length; ++i)
		{
			const elt = ary[i];
			switch(elt.class)
			{
			case 'element':
			case 'object':
				if (!(elt.cid in elts))
					elts[elt.cid] = elt;
				break;
			case 'morphism':
				if (!(elt.domain.cid in elts))
					elts[elt.domain.cid] = elt.domain;
				if (!(elt.codomain.cid in elts))
					elts[elt.codomain.cid] = elt.codomain;
				break;
			}
		}
		let xy = {x:0, y:0};
		let cnt = 0;
		for(let i in elts)
		{
			++cnt;
			xy = D2.add(xy, elts[i]);
		}
		xy = D2.scale(1.0/cnt, xy);
		return xy;
	},
	addDiagram(cat, dgrm)
	{
		if (!(dgrm.name in Cat.diagrams))
			Cat.diagrams[dgrm.name] = dgrm;
		else
			throw `Diagram name ${dgrm.name} already exists.`;
		Cat.addToLocalDiagramList(dgrm);
	},
	hasDiagram(dgrmName)
	{
		return Cat.hasLocalDiagram(dgrmName) || dgrmName in Cat.diagrams || dgrmName in Cat.serverDiagrams;
	},
	getDiagram(dgrmName, checkLocal = true)
	{
		if (typeof dgrmName === 'undefined' || dgrmName === '')
			dgrmName = Cat.selected.diagram;
		let dgrm = null;
		if (dgrmName in Cat.diagrams)
			return Cat.diagrams[dgrmName];
		if (checkLocal && Cat.hasLocalDiagram(dgrmName))
		{
			dgrm = diagram.fromLocalStorage(dgrmName);
			if (!(name in Cat.diagrams))
				Cat.diagrams[dgrmName] = dgrm;
		}
		return dgrm;
	},
	hasLocalDiagram(dgrmName)
	{
		return dgrmName in Cat.localDiagrams;
	},
	getLocalDiagramList()
	{
		Cat.localDiagrams = JSON.parse(localStorage.getItem('Cat.diagrams.local'));
		if (Cat.localDiagrams === null)
			Cat.localDiagrams = {};
		// TODO debug, clean-up, remove, eventually
		for (let d in Cat.localDiagrams)
			if (!localStorage.getItem(diagram.storageName(d)))
			{
				if (Cat.debug)
					console.log('getLocalDiagramList deleting',d);
				delete Cat.localDiagrams[d];
				Cat.saveLocalDiagramList();
			}
	},
	saveLocalDiagramList()
	{
		isGUI && localStorage.setItem('Cat.diagrams.local', JSON.stringify(Cat.localDiagrams));
	},
	addToLocalDiagramList(dgrm)
	{
		if (dgrm.name in Cat.localDiagrams)
			return;
		Cat.localDiagrams[dgrm.name] = {name:dgrm.name, fancyName:dgrm.getText(), timestamp:dgrm.timestamp, description:dgrm.description, username:dgrm.username};
		Cat.saveLocalDiagramList();
	},
	removeFromLocalDiagramList(dgrmName)
	{
		if (Cat.hasLocalDiagram(dgrmName))
		{
			delete Cat.localDiagrams[dgrmName];
			Cat.saveLocalDiagramList();
		}
	},
	sha256(msg)
	{
		const bitArray = sjcl.hash.sha256.hash(msg);
		return sjcl.codec.hex.fromBits(bitArray);
	},
	deleteLocalDiagram(dgrmName)
	{
		try
		{
			isGUI && localStorage.removeItem(diagram.storageName(dgrmName));
			if (dgrmName in Cat.diagrams)
			{
				const dgrm = Cat.diagrams[dgrmName];
				if (dgrm !== null)
				{
					dgrm.refcnt = 1;// FORCE DELETE
					dgrm.decrRefcnt();
					delete Cat.diagrams[dgrmName];
					if (Cat.debug)
						console.log('delete local diagram', dgrmName);
				}
			}
			Cat.removeFromLocalDiagramList(dgrmName);
		}
		catch(e)
		{
			Cat.recordError(e);
		}
	},
	clearLocalStorage()
	{
		//
		// Danger!
		//
		localStorage.clear();
		if ($Cat !== null)
			Cat.getDiagram().deleteAll();
		Cat.localDiagrams = {};
	},
	clone(o)
	{
		if (null === o || 'object' !== typeof o || o instanceof element)
			return o;
		let c = o.constructor();
		for(const a in o)
			if (o.hasOwnProperty(a))
				c[a] = Cat.clone(o[a]);
		return c;
	},
	download(href, filename)
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
	},
	downloadString(string, type, filename)
	{
		const blob = new Blob([string], {type:`application/${type}`});
		Cat.download(Cat.url.createObjectURL(blob), filename);
	},
	getArg(args, key, dflt)
	{
		return key in args ? args[key] : dflt;
	},
	htmlEntitySafe(str)
	{
		return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	},
	htmlSafe(str)
	{
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	},
	textify(preface, elements, reverse = false)
	{
		let txt = `${preface} `;
		if (reverse)
			elements = elements.slice().reverse();
		for (let i=0; i<elements.length; ++i)
		{
			if (i === elements.length -1)
				txt += ' and ';
			else if (i !== 0)
				txt += ', ';
			txt += elements[i].getText();
		}
		return txt + '.';
	},
	initializeCT(fn)
	{
		$Cat = new category(
		{
			name:	'Cat',
			code:	'Cat',
			html:	'&#x2102;&#x1D552;&#x1D565;',
			description:	'Category of small categories',
			isCartesian:	true,
			isClosed:		true,
			hasProducts:	true,
			hasCoproducts:	true,
		});
		PFS = new category(
		{
			name:	'PFS',
			code:	'PFS',
			html:	'&#8473;&#120125;&#120138;',
			description:	'Category of partial finite sets',
			isCartesian:	true,
			isClosed:		true,
			allObjectsFinite:		true,
			hasProducts:	true,
			hasCoproducts:	true,
			referenceDiagrams:	[`D${Cat.sep}PFS${Cat.sep}std${Cat.sep}basics`, `D${Cat.sep}PFS${Cat.sep}std${Cat.sep}FOL`, `D${Cat.sep}PFS${Cat.sep}std${Cat.sep}arithmetics`, `D${Cat.sep}PFS${Cat.sep}std${Cat.sep}strings`,
				`D${Cat.sep}PFS${Cat.sep}std${Cat.sep}console`, `D${Cat.sep}PFS${Cat.sep}std${Cat.sep}threeD`],
		});
		Graph = new category(
		{
			name:				'Graph',
			code:				'Graph',
			html:				'&#120126;',
			description:		'Graph category',
			isCartesian:		true,
			isClosed:			true,
			allObjectsFinite:	true,
			hasProducts:		true,
			hasCoproducts:		true,
			referenceDiagrams:	[],
		});
		new transform(
		{
			name:		'id-PFS',
			transform:	'identity',
			domain:		'PFS',
			codomain:	'PFS',
			html:		'Identity',
			description:'Identity morphism on an object',
		});
		new transform(
		{
			name:	'diagonal-PFS',
			html:	'&#x0394;',
			code:	'',
			transform:	'diagonal',
			domain:	'PFS',
			codomain:	'PFS',
			description:'Diagonal morphism on an object',
		});
		new transform(
		{
			name:	'terminal-PFS',
			html:	'&#8594;1',
			code:	'',
			transform:	'terminal',
			domain:	'PFS',
			codomain:	'PFS',
			description:'Unique morphism to terminal object',
		});
		new transform(
		{
			name:	'equals-PFS',
			html:	'=',
			code:	'',
			transform:	'equals',
			domain:	'PFS',
			codomain:	'PFS',
			description:'Test for equality on an object',
			testFunction:	function(dgrm, obj)
			{
				return obj.isSquared();
			},
		});
		new transform(
		{
			name:	'eval-PFS',
			html:	'e',
			code:	'',
			transform:	'apply',
			domain:	'PFS',
			codomain:	'PFS',
			description:'Evaluate morphism with arguments',
			testFunction:	function(dgrm, obj)
			{
				return dgrm.canEvaluate(obj);
			},
		});
		new functor(
		{
			name:		'Graph',
			html:		'&#1d5d8;',
			code:		'Graph',
			functor:	'graph',
			domain:		'PFS',
			codomain:	'Graph',
			description:'Gives the graph of a morphism',
		});
		isGUI && this.fetchCategories(fn);	// TODO check for local TODO refresh flag
	},
	getLocalStorageCategoryName()
	{
		let catName = localStorage.getItem(`Cat.selected.category ${Cat.user.name}`);
		catName = catName === null ? 'PFS' : catName;
		return catName;
	},
	setLocalStorageDefaultCategory()
	{
		localStorage.setItem(`Cat.selected.category ${Cat.user.name}`, Cat.selected.category);
	},
	getLocalStorageDiagramName()
	{
		return localStorage.getItem(`Cat.selected.diagram ${Cat.user.name} ${cat}`);
	},
	setLocalStorageDiagramName()
	{
		localStorage.setItem(`Cat.selected.diagram ${Cat.user.name} ${Cat.selected.category}`, Cat.selected.diagram);
	},
	initialize()
	{
		try
		{
			Cat.url = isGUI ? (window.URL || window.webkitURL || window) : null;
			if (Cat.clear || (isGUI && window.location.search.substr(1) === 'clear'))
			{
				console.log('clearing local storage');
				this.clearLocalStorage();
			}
			if (isGUI)
			{
				Cat.autosave = true;
				Cat.getLocalDiagramList();
				Cat.display.initialize();
			}
			Cat.initializeCT(function()
			{
				Cat.selected.selectCategoryDiagram(Cat.getLocalStorageCategoryName(), function()
				{
					Cat.initialized = true;
					Cat.selected.updateDiagramDisplay(Cat.selected.diagram);
				});
			});
			Cat.Amazon.initialize();
			isGUI && Cat.display.setNavbarBackground();
			isGUI && Cat.updatePanels();
		}
		catch(e)
		{
			Cat.recordError(e);
		}
	},
	updatePanels()
	{
		Cat.display.panel.panelNames['left'].map(pnl => Cat.display[pnl].setPanelContent());
		Cat.display.panel.panelNames['right'].map(pnl => Cat.display[pnl].setPanelContent());
	},
	fetchCategories(fn = null)
	{
		fetch(Cat.Amazon.URL() + '/categories.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					data.map(cat =>
					{
						if (!$Cat.hasObject(cat.name))
						{
							const cat = new category({name:cat.name, code:cat.code, html:cat.html, description:cat.description, cid:cat.cid});
							Cat.catalog[cat] = {};
						}
					});
					if (fn)
						fn(data);
				});
			else
				Cat.recordError('Categories request failed.', response);
		});
	},
	getCategoryUsers(cat, fn = null)
	{
		fetch(Cat.Amazon.URL(cat) + `/users.json`).then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					cat.users = data;
					if (fn != null)
						fn(data);
				});
			else
				Cat.recordError(`Cannot get list of diagrams for category ${cat}`);
		});
	},
	deleteDiagram(cat, dgrmName)
	{
		fetch(`catecon.php?action=deleteDiagram&cat=${Cat.htmlSafe(cat)}&name=${Cat.htmlSafe(dgrmName)}`).then(function(response)
		{
			if (response.ok)
				response.json().then(function(r)
				{
//						if (r.ok === 'true')
//							Cat.display.downloadCatalogTable(cat);	// TODO
				});
			else
				console.log('deleteDiagram request failed',cat,dgrmName);
		});
	},
	default:
	{
		category:	'',
		diagram:	'',
		button:		{tiny:0.4, small:0.66, large:1.0},
		panel:		{width:	230},
		dragDelay:	100,	// ms
		font:		{height:24},
		arrow:		{length:150, height:20, margin:16, spacer:1.0, lineDash:[], strokeStyle:'#000', lineWidth:2},
		composite:	'&#8797;',	// is defined as
		fuse:
		{
			fillStyle:	'#3f3a',
			lineDash:	[],
			lineWidth:	2,
			margin:		2,
		},
		layoutGrid:	15,
		scale:		{base:1.05, limit:{min:0.05, max:20}},
		scale3D:	1,
		toolbar:	{x:25, y:50},
	},
	basetypes:
	{
		parens:
		{
			left: {sym:'(', symCode:'(', nameCode:'--P-'},
			right: {sym:')', symCode:')', nameCode:'-P--'},
		},
		comma: {sym:',', symCode:',', nameCode:'-c-'},
		objects:
		{
			Null:
			{
				html:			'&#8709;',
				token:			'Null',
				description:	'empty set',
				editable:		false,
			},
			One:
			{
				html:			'1',
				token:			'One',
				description:	'one point set',
				editable:		false,
			},
			Omega:
			{
				html:			'&#937;',
				token:			'Omega',
				description:	'truth values',
				data:			['false', 'true'],
				editable:		true,
				regexp:	'false|true|0|1',
				order:	true,
				$(str)
				{
					switch(str)
					{
						case 'true':
						case '1':
							return true;
					}
					return false;
				},
				random(min, max)
				{
					min = 0;
					max = 1;
					return Math.round(Math.random()) === 1;
				}
			},
			F:
			{
				html:			'&#x1d53d;',
				token:			'F',
				description:	'floating point numbers',
				regexp:			'^[-\\+]?[0-9]+[.]?[0-9]*([eE][-\\+]?[0-9]\\+)?$',
				editable:	true,
				$(string)
				{
					const f = Number.parseFloat(string);
					if (Number.isNaN(f))
						throw `Not a floating point number: ${string}`;
					return f;
				},
				random(min, max)
				{
					return Math.random() * (max - min) + min;
				}
			},
			Z:
			{
				html:			'&#x2124;',
				token:			'Z',
				description:	'integers',
				regexp:			'^(\\+|-)?\\d*',
				editable:		true,
				$(string)
				{
					const i = Number.parseInt(string);
					if (Number.isNaN(i))
						throw `Not an integer: ${string}`;
					return i;
				},
				random(min, max)
				{
					return Math.floor(Math.random() * (max - min + 1)) + min;
				}
			},
			N:
			{
				html:			'&#x2115;',
				token:			'N',
				description:	'natural numbers',
				regexp:			'\\d',
				editable:		true,
				$(string)
				{
					const i = Number.parseInt(string);
					if (Number.isNaN(i) || i < 0)
						throw `Not a natural number: ${string}`;
					return i;
				},
				random(min, max)
				{
					return Math.floor(Math.random() * (max - min + 1)) + min;
				}
			},
			R:
			{
				html:			'&#x211d;',
				token:			'R',
				description:	'real numbers',
				editable:		false,
			},
			C:
			{
				html:			'&#x2102;',
				token:			'C',
				description:	'complex numbers',
				editable:		false,
			},
			I:
			{
				html:			'&#x211d;',
				token:			'I',
				description:	'constant',
				description:	'The object which is the identity for the product',
				editable:		false,
			},
			Str:
			{
				html:			'Str',
				token:			'Str',
				description:	'strings',
				editable:		true,
				$(string) {return string;}
			},
		},
		operators:
		{
			compose:	// new operator({sym:'&#8728;', symCode:'.', nameCode:'-o-', reverse:true}),
			{
				sym:'&#8728;',
				symCode:'.',
				nameCode:'-o-',
				toName(tokens)
				{
					let name = '';
					for (let i=0; i<tokens.length -1; ++i)
					{
						let t = tokens[i];
						if (i !== 0)
						{
							t = `${t}${this.nameCode}${name}`;
							name = Cat.parens(t, Cat.basetypes.parens.left.nameCode, Cat.basetypes.parens.right.nameCode, false);
						}
						else
							name = t;
					}
					return tokens[tokens.length -1] + this.nameCode + name;
				},
				toCode(tokens)
				{
					// TODO parens
					return tokens.slice().reverse().join(this.symCode);
				},
				toHtml(tokens)
				{
					return tokens.slice().reverse().join(this.sym);
				},
			},
			coproduct:	new operator({sym:'+', symCode:'+', nameCode:'-C-',}),
			product:	new operator({sym:'&#215;', symCode:'*', nameCode:'-X-',}),
			sequence:	new operator({sym:',', symCode:',',}),
			hom:
			{
				html:	'[%1, %2]',
				code:	'[%1,%2]',
				name:	'--B-%1--%2-B--',
				toName(tokens)
				{
					return this.name.replace('%1', tokens[0]).replace('%2', tokens[1]);
				},
				toCode(a, b)
				{
					return this.code.replace('%1', a).replace('%2', b);
				},
			},
		},
		quantifiers:
		{
			universal:	'&#8704;',
			exists:		'&#8707;',
			existsNot:	'&#8708;',
		},
	},
	submap:
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
	subscript(...subs)
	{
		let sub = '';
		for (let i=0; i<subs.length; ++i)
		{
			let s = subs[i].toString();
			sub += s.replace(/[0-9]/g, function (m)
			{
				return Cat.submap[m];
			});
		}
		return sub;
	},
	selected:
	{
		category:	'',
		diagram:	'',
		selectCategory(catName, fn)
		{
			Cat.selected.category = catName;
			Cat.setLocalStorageDefaultCategory();
			Cat.selected.diagram = null;
			const nbCat = document.getElementById('navbar_category');
			const cat = $Cat.getObject(catName);
			nbCat.innerHTML = cat.getText();
			nbCat.title = Cat.cap(cat.description);
			category.fetchReferenceDiagrams(cat, fn);
		},
		selectCategoryDiagram(cat, fn)
		{
			this.selectCategory(cat, function()
			{
				let name = localStorage.getItem(`Cat.selected.diagram ${Cat.user.name} ${cat}`);
				name = name === null ? diagram.genName(cat, Cat.user.name, 'Draft') : name;
				let dgrm = Cat.getDiagram(name);
				if (dgrm === null && diagram.fromLocalStorage(name) === null)
				{
					dgrm = new diagram({name, codomain:cat, code:name, html:'Draft', description:'Scratch diagram', user:Cat.user.name});
					dgrm.saveToLocalStorage();
				}
				Cat.selected.selectDiagram(name);
				if (fn)
					fn();
				Cat.updatePanels();
				Cat.setLocalStorageDiagramName();
			});
		},
		selectDiagram(name, update = true)
		{
			Cat.display.deactivateToolbar();
			const cat = getCat();
			function setup(name)
			{
				Cat.selected.diagram = name;
				Cat.setLocalStorageDiagramName();
				if (update)
					Cat.selected.updateDiagramDisplay(name);
			}
			if (Cat.hasDiagram(name))
				setup(name);
			else
				// TODO turn on/off busy cursor
				diagram.fetchDiagram(name, setup);
		},
		updateDiagramDisplay(name)
		{
			if (!Cat.initialized)
				return;
			Cat.display.object.setPanelContent();
			Cat.display.morphism.setPanelContent();
			Cat.display.element.setPanelContent();
			Cat.display.diagram.update();
			const dgrm = Cat.getDiagram();
			Cat.display.diagramSVG.innerHTML = Cat.display.svg.basics + dgrm.makeAllSVG();
			Cat.display.diagram.setToolbar(dgrm);
			dgrm.update(null, 'diagram', null, true, false);
			dgrm.updateMorphisms();
		},
	},
	display:
	{
		shiftKey:	false,
		drag:		false,
		fuseObject:	null,
		gridding:	false,
		mouseDown:	false,
		mouseover:	null,
		dragStart:	{x:0, y:0},
		topSVG:		null,
		diagramSVG:	null,
		svgPngWidth:	1024,
		svgPngHeight:	768,
		tool:		'select',	// select|pan
		statusbar:	null,
		id:			0,
		width()
		{
			return window.innerWidth;
		},
		height()
		{
			return window.innerHeight;
		},
		resize()
		{
			const dgrm = $Cat !== null ? Cat.getDiagram() : null;
			const scale = dgrm !== null ? dgrm.viewport.scale : 1.0;
			const w = scale > 1.0 ? Math.max(window.innerWidth, window.innerWidth / scale) : window.innerWidth / scale;
			const h = scale > 1.0 ? Math.max(window.innerHeight, window.innerHeight / scale) : window.innerHeight / scale;
			this.topSVG.setAttribute('width', w);
			this.topSVG.setAttribute('height', h);
			this.uiSVG.setAttribute('width', w);
			this.uiSVG.setAttribute('height', h);
		},
		initialize()
		{
			this.setNavbarHtml();
			this.diagramSVG = document.getElementById('diagramSVG');
			this.topSVG = document.getElementById('topSVG');
			this.topSVG.addEventListener('mousemove', this.mousemove, true);
			this.topSVG.addEventListener('mousedown', this.mousedown, true);
			this.topSVG.addEventListener('mouseup', this.mouseup, true);
			this.statusbar = document.getElementById('statusbar');
			this.uiSVG = document.getElementById('uiSVG');
			this.uiSVG.style.left = '0px';
			this.uiSVG.style.top = '0px';
			this.resize();
			this.addEventListeners();
			this.tty.setPanelContent();	// for early errors
			Cat.updatePanels();
		},
		mousedown(e)
		{
			Cat.display.mouseDown = true;
			Cat.mouse.down = {x:e.clientX, y:e.clientY};
			const dgrm = Cat.getDiagram();
			Cat.display.callbacks.map(f => f());
			Cat.display.callbacks = [];
			const pnt = dgrm.mousePosition(e);
			if (Cat.display.mouseover)
			{
				if (!dgrm.isSelected(Cat.display.mouseover) && !Cat.display.shiftKey)
					dgrm.deselectAll();
			}
			else
				dgrm.deselectAll();
			if (e.which === 2)
				Cat.display.tool = 'pan';
			if (Cat.display.tool === 'pan')
			{
				if (!Cat.display.drag)
				{
					dgrm.viewport.orig = Cat.clone(dgrm.viewport);
					if ('orig' in dgrm.viewport.orig)
						delete dgrm.viewport.orig.orig;
					Cat.display.dragStart = pnt;
					Cat.display.drag = true;
				}
			}
		},
		mousemove(e)
		{
			Cat.mouse.xy = {x:e.clientX, y:e.clientY};
			try
			{
				Cat.display.shiftKey = e.shiftKey;
				let dgrm = Cat.getDiagram();
				if (!dgrm)
					return;
				const pnt = dgrm.mousePosition(e);
				if (Cat.display.drag)
				{
					Cat.display.deactivateToolbar();
					if (!dgrm.readonly && e.ctrlKey && dgrm.selected.length == 1 && Cat.display.fuseObject === null)
					{
						let from = dgrm.getSelected();
						Cat.display.mouseover = dgrm.findElement(pnt, from.name);
						const isolated = from.refcnt === 1;
						if (from.class === 'object')
						{
							const to = dgrm.mapObject(from);
							Cat.display.fuseObject = new diagramObject(dgrm.domain, {diagram:dgrm, xy:pnt});
							Cat.display.fuseObject.incrRefcnt();
							dgrm.deselectAll();
							const fromMorph = new diagramMorphism(dgrm.domain, {diagram:dgrm, domain:from.name, codomain:Cat.display.fuseObject.name});
							const id = dgrm.getIdentityMorphism(to.name);
							fromMorph.incrRefcnt();
							dgrm.setMorphism(fromMorph, id);
							Cat.display.fuseObject.addSVG();
							fromMorph.addSVG();
							fromMorph.update();
							from = Cat.display.fuseObject;
							dgrm.addSelected(e, Cat.display.fuseObject);
							from.setXY(pnt);
							dgrm.saveToLocalStorage();
							dgrm.checkFusible(pnt);
						}
						else if (from.class === 'morphism')
						{
							dgrm.deselectAll();
							const dom = new diagramObject(dgrm.domain, {diagram:dgrm, xy:from.domain});
							dom.incrRefcnt();
							const cod = new diagramObject(dgrm.domain, {diagram:dgrm, xy:from.codomain});
							cod.incrRefcnt();
							const fromCopy = new diagramMorphism(dgrm.domain, {diagram:dgrm, domain:dom, codomain:cod});
							fromCopy.incrRefcnt();
							dgrm.setMorphism(fromCopy, from.to);
							fromCopy.update();
							dom.addSVG();
							cod.addSVG();
							fromCopy.addSVG();
							dgrm.addSelected(e, fromCopy);
							dgrm.saveToLocalStorage();
							Cat.display.fuseObject = fromCopy;
							dgrm.checkFusible(pnt);
						}
					}
					else
					{
						const skip = dgrm.getSelected();
						Cat.display.mouseover = dgrm.findElement(pnt, skip ? skip.name : '');
						switch(Cat.display.tool)
						{
						case 'select':
							if (!dgrm.readonly)
							{
								dgrm.updateDragObjects(pnt);
								dgrm.checkFusible(pnt);
							}
							break;
						case 'pan':
							const loc = dgrm.userToDiagramCoords(Cat.mouse.xy, true);
							const delta = D2.scale(dgrm.viewport.orig.scale, D2.subtract(loc, Cat.display.dragStart));
							dgrm.viewport.x = dgrm.viewport.orig.x + delta.x;
							dgrm.viewport.y = dgrm.viewport.orig.y + delta.y;
							dgrm.setView();
							break;
						}
					}
				}
				else if (Cat.display.mouseDown === true)
				{
					Cat.display.mouseover = dgrm.findElement(pnt);
					const x = Math.min(Cat.mouse.xy.x, Cat.mouse.down.x);
					const y = Math.min(Cat.mouse.xy.y, Cat.mouse.down.y);
					const w = Math.abs(Cat.mouse.xy.x - Cat.mouse.down.x);
					const h = Math.abs(Cat.mouse.xy.y - Cat.mouse.down.y);
					const svg = document.getElementById('selectRect');
					if (svg)
					{
						svg.setAttribute('x', x);
						svg.setAttribute('y', y);
						svg.setAttribute('width', w);
						svg.setAttribute('height', h);
					}
					else
					{
						const s = `<rect id="selectRect" x="${x}" y="${y}" width="${w}" height="${h}">`;
						Cat.display.uiSVG.innerHTML += s;
					}
				}
				else
				{
					Cat.display.mouseover = dgrm.findElement(pnt);
					const svg = document.getElementById('selectRect');
					if (svg)
						svg.parentNode.removeChild(svg);
				}
			}
			catch(e)
			{
				Cat.recordError(e);
			}
		},
		mouseup(e)
		{
			Cat.display.mouseDown = false;
			if (e.which === 2)
			{
				Cat.display.tool = 'select';
				Cat.display.drag = false;
				return;
			}
			try
			{
				let dgrm = Cat.getDiagram();
				let pnt = dgrm.mousePosition(e);
				if (Cat.display.drag)
				{
					if (dgrm.selected.length === 1)
					{
						let dragObject = dgrm.getSelected();
						let targetObject = dragObject.isEquivalent(Cat.display.mouseover) ? null : Cat.display.mouseover;
						if (targetObject !== null)
						{
							if (dragObject.class === 'object' && targetObject.class === 'object')
							{
								if (dgrm.isIsolated(dragObject) && dgrm.isIsolated(targetObject))
								{
									const code = Cat.basetypes.operators.product.toCode([targetObject.to.code, dragObject.to.code]);
									const to = dgrm.newObject({code});
									dgrm.setObject(targetObject, to);
									dgrm.deselectAll(false);
									targetObject.removeSVG();
									targetObject.addSVG();
									dgrm.addSelected(e, targetObject);
									dragObject.decrRefcnt();
								}
								else if(dgrm.canFuseObjects(dragObject, targetObject))
								{
									dgrm.deselectAll();
									let morphs = dgrm.getObjectMorphisms(dragObject);
									if (morphs.cods.length > 0)
									{
										let from = morphs.cods[0];
										if (morphs.cods.length === 1 && morphs.doms.length === 0 && from.to.function === 'identity' && !from.to.domain.isInitial)
										{
											const cod = dgrm.mapObject(dragObject);
											const toTargetObject = dgrm.mapObject(targetObject);
											if (cod.code !== toTargetObject.code)
											{
												if (toTargetObject.isTerminal)
												{
													const to = $Cat.getTransform(`terminal-${dgrm.codomain.name}`).$(dgrm, from.to.domain);
													from.removeSVG();
													dgrm.setMorphism(from, to);
													from.addSVG();
												}
												else
												{
													const to = Cat.getDiagram().newDataMorphism(cod, toTargetObject);
													from.removeSVG();
													dgrm.setMorphism(from, to);
													from.addSVG();
												}
											}
											from.codomain = targetObject;
											targetObject.incrRefcnt();
											dragObject.decrRefcnt();
										}
									}
									for(const [from, to] of dgrm.morphisms)
									{
										// TODO
										if (from.domain.isEquivalent(dragObject))
										{
											from.domain.decrRefcnt();
											from.domain = targetObject;
											Cat.display.mergeObjectsRefCnt(dgrm, dragObject, targetObject);
										}
										else if (from.codomain.isEquivalent(dragObject))
										{
											from.codomain.decrRefcnt();
											from.codomain = targetObject;
											Cat.display.mergeObjectsRefCnt(dgrm, dragObject, targetObject);
										}
									}
									dragObject.decrRefcnt();
									dgrm.update(e, '', null, true);
								}
							}
							else if (dgrm.codomain.hasProducts && dragObject.class === 'morphism' && targetObject.class === 'morphism' && dgrm.isIsolated(dragObject) && dgrm.isIsolated(targetObject))
							{
								dgrm.deselectAll();
								const dragMorphTo = dgrm.mapMorphism(dragObject);
								const targetMorphTo = dgrm.mapMorphism(targetObject);
								const morphisms = [targetMorphTo, dragMorphTo];
								const form = productMorphism.form(dgrm, morphisms);
								let newTo = dgrm.getMorphism(element.codename(dgrm, dgrm.codomain.parseMorphism(form.code)));
								if (newTo === null)
									newTo = new productMorphism(dgrm, {morphisms:[targetMorphTo, dragMorphTo]});
								newTo.incrRefcnt();
								dgrm.placeMorphism(e, newTo, targetObject.domain, targetObject.codomain);
								dragObject.decrRefcnt();
								targetObject.decrRefcnt();
								targetObject.update();
							}
						}
					}
					if (!dgrm.readonly)
						dgrm.saveToLocalStorage();
				}
				else
					dgrm.addWindowSelect(e);
				Cat.display.fuseObject = null;
			}
			catch(x)
			{
				Cat.recordError(x);
			}
			Cat.display.drag = false;
		},
		mergeObjectsRefCnt(dgrm, dragObject, targetObject)
		{
			dragObject.decrRefcnt();
			targetObject.incrRefcnt();
			const to = dgrm.mapObject(targetObject);
			to.incrRefcnt();
		},
		drop(e)
		{
			try
			{
				e.preventDefault();
				Cat.display.drag = false;
				let cat = getCat();
				let dgrm = Cat.getDiagram();
				if (dgrm.readonly)
				{
					Cat.status(e, 'Diagram is not editable!');
					return;
				}
				const pnt = dgrm.mousePosition(e);
				const dropText = e.dataTransfer.getData('text');
				if (dropText.length === 0)
					return;
				const tokens = dropText.split(' ');
				const type = tokens[0];
				const name = tokens[1];
				let from = null;
				let to = null;
				switch(type)
				{
				case 'object':
					from = new diagramObject(dgrm.domain, {diagram:dgrm, xy:pnt});
					from.incrRefcnt();
					to = dgrm.getObject(name);
					dgrm.setObject(from, to);
					break;
				case 'morphism':
					to = dgrm.getMorphism(name);
					if (to === null)
						throw `Morphism ${name} does not exist in category ${cat.getText()}`;
					const dom = new diagramObject(dgrm.domain, {diagram:dgrm, name:dgrm.domain.getAnon(), xy:pnt});
					dom.incrRefcnt();
					const codLen = Cat.textWidth(to.domain.getText())/2;
					const domLen = Cat.textWidth(to.codomain.getText())/2;
					const namLen = Cat.textWidth(to.getText());
					const cod = new diagramObject(dgrm.domain, {diagram:dgrm, xy:{x:pnt.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4), y:pnt.y}});
					cod.incrRefcnt();
					from = new diagramMorphism(dgrm.domain, {diagram:dgrm, domain:dom.name, codomain:cod.name});
					from.incrRefcnt();
					dgrm.setMorphism(from, to);
					from.update();
					dom.addSVG();
					cod.addSVG();
					break;
				}
				from.addSVG();
				dgrm.update(e, type, from);
			}
			catch(err)
			{
				Cat.recordError(err);
			}
		},
		panel:
		{
			panelNames:
			{
				left:	['object', 'morphism', 'category', 'diagram', 'functor', 'transform', 'element'],
				right:	['data', 'help', 'settings', 'login', 'tty', 'threeD'],
			},
			closeAll(side)
			{
				for(let i=0; i < this.panelNames[side].length; ++i)
					this.close(this.panelNames[side][i]);
			},
			collapse(pnl, right)
			{
				document.getElementById(`${pnl}-sidenav`).style.width = Cat.default.panel.width + 'px';
				document.getElementById(`${pnl}-expandBtn`).innerHTML = Cat.display.getButton(right ? 'chevronLeft' : 'chevronRight', `Cat.display.panel.expand('${pnl}', ${right})`, 'Collapse');
			},
			expand(pnl, right)
			{
				if ('expand' in Cat.display[pnl])
					Cat.display[pnl].expand();
				else
				{
					document.getElementById(`${pnl}-sidenav`).style.width = 'auto';
					document.getElementById(`${pnl}-expandBtn`).innerHTML = Cat.display.getButton(right ? 'chevronRight' : 'chevronLeft', `Cat.display.panel.collapse('${pnl}', ${right})`, 'Expand');
				}
			},
			open(pnl)
			{
				this.closeAll(Cat.display.panel.panelNames.left.indexOf(pnl) >= 0 ? 'left' : 'right');
				document.getElementById(`${pnl}-sidenav`).style.width = Cat.default.panel.width + 'px';
			},
			close(pnl)
			{
				if (Array.isArray(pnl))
					pnl.map(p => document.getElementById(`${p}-sidenav`).style.width = '0');
				else
					document.getElementById(`${pnl}-sidenav`).style.width = '0';
			},
			toggle(pnl)
			{
				const w = document.getElementById(`${pnl}-sidenav`).style.width;
				if (w === 'auto' || Number.parseInt(w, 10) > 0)
					this.close(pnl);
				else
					this.open(pnl);
			},
		},
		accordion:
		{
			toggle(btn, pnlId)
			{
				btn.classList.toggle('active');
				const elt = document.getElementById(pnlId);
				elt.style.display = elt.style.display === 'block' ? 'none' : 'block';
			},
			open(pnlId)
			{
				const elt = document.getElementById(pnlId);
				elt.style.display = 'block';
			},
			close(pnlId)
			{
				const elt = document.getElementById(pnlId);
				elt.style.display = 'none';
			},
		},
		accordionPanelDyn(header, action, panelId, title = '', buttonId = '')
		{
			return H.button(header, 'sidenavAccordion', buttonId, title, `onclick="${action};Cat.display.accordion.toggle(this, \'${panelId}')"`) +
					H.div('', 'accordionPnl', panelId);
		},
		category:
		{
			setPanelContent()
			{
				const cat = getCat();
				if (cat !== null)
				{
					let html = H.table(H.tr(Cat.display.closeBtnCell('category', false)), 'buttonBarRight');
					html += H.h3('Categories') + H.div('', '', 'categoryTbl') + this.newCategoryPnl();
					document.getElementById('category-sidenav').innerHTML = html;
				}
			},
			setCategoryTable()
			{
				let cats = [];
				for(const [catName, cat] of $Cat.objects)
					if (catName.substr(0, 2) !== `D${Cat.sep}`)
						cats.push(cat);
				const tbl = H.table(cats.map(c => H.tr(H.td(`<a onclick="Cat.selected.selectCategoryDiagram('${c.name}')">${c.getText()}</a>`), 'sidenavRow')).join(''));
				document.getElementById('categoryTbl').innerHTML = tbl;
			},
			newCategoryPnl()
			{
				let html = H.button('New Category', 'sidenavAccordion', '', 'New Category', `onclick="Cat.display.accordion.toggle(this, \'newCategoryPnl\')"`) +
							H.div(H.table(H.tr(H.td(Cat.display.input('', 'categoryName', 'Name')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'categoryCode', 'Code')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'categoryHtml', 'HTML Entities')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'categoryDescription', 'Description')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'isMonoidal', '', '', 'in100', 'checkbox') + '<label for="isMonoidal">Monoidal?</label>', 'left'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'isBraided', '', '', 'in100', 'checkbox') + '<label for="isBraided">Braided?</label>', 'left'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'isClosed', '', '', 'in100', 'checkbox') + '<label for="isClosed">Closed?</label>', 'left'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'isSymmetric', '', '', 'in100', 'checkbox') + '<label for="isSymmetric">Symmetric?</label>', 'left'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'isCompact', '', '', 'in100', 'checkbox') + '<label for="isCompact">Compact?</label>', 'left'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'isCartesian', '', '', 'in100', 'checkbox') + '<label for="isCartesian">Cartesian?</label>', 'left'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'allObjectsFinite', '', '', 'in100', 'checkbox') + '<label for="allObjectsFinite">Finite objects?</label>', 'left'), 'sidenavRow'),
										'sidenav') +
									H.span(Cat.display.getButton('edit', 'Cat.display.category.new()', 'Create new category for this diagram')) +
									H.span('', 'parseError', 'categoryError'), 'accordionPnl', 'newCategoryPnl');
				return html;
			},
			new()
			{
				try
				{
					document.getElementById('categoryError').innerHTML = '';
					const name = document.getElementById('categoryName').value;
					if (name === '')
						throw 'Object name must be specified.';
					if (!RegExp(Cat.userNameEx).test(name))
						throw 'Invalid category name.';
					let code = document.getElementById('categoryCode').value;
					code = code === '' ? name : code;
					const dgrm = Cat.getDiagram();
					dgrm.newObject({name, code, html:document.getElementById('categoryHtml').value, description:document.getElementById('categoryDescription').value });
				}
				catch(err)
				{
					document.getElementById('categoryError').innerHTML = 'Error: ' + Cat.getError(err);
				}
			},
		},
		threeD:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('threeD', false) +
										Cat.display.expandPanelBtn('threeD', true) +
									H.td(Cat.display.getButton('delete', 'Cat.display.threeD.initialize()', 'Clear display'), 'buttonBar') +
									H.td(Cat.display.getButton('threeD_left', `Cat.display.threeD.view('left')`, 'Left'), 'buttonBar') +
									H.td(Cat.display.getButton('threeD_top', `Cat.display.threeD.view('top')`, 'Top'), 'buttonBar') +
									H.td(Cat.display.getButton('threeD_back', `Cat.display.threeD.view('back')`, 'Back'), 'buttonBar') +
									H.td(Cat.display.getButton('threeD_right', `Cat.display.threeD.view('right')`, 'Right'), 'buttonBar') +
									H.td(Cat.display.getButton('threeD_bottom', `Cat.display.threeD.view('bottom')`, 'Bottom'), 'buttonBar') +
									H.td(Cat.display.getButton('threeD_front', `Cat.display.threeD.view('front')`, 'Front'), 'buttonBar')
									), 'buttonBarLeft') +
								H.div('', '', 'threeDiv');
				const threeD = document.getElementById('threeD-sidenav');
				threeD.innerHTML = html;
				this.threeDiv = document.getElementById('threeDiv');
				this.initialize();
				this.animate();
			},
			mouse:	typeof THREE === 'object' ? new THREE.Vector2() : null,
			camera:	null,
			scene:	null,
			raycaster:	null,
			renderer:	null,
			threeDiv:	null,
			controls:	null,
			bbox:		null,
			axesHelperSize:	1000,
			max:		10000,
			horizon:	100000,
			initialize()
			{
				try
				{
					Cat.display.threeD.bbox = {min:{x:Number.POSITIVE_INFINITY, y:Number.POSITIVE_INFINITY, z:Number.POSITIVE_INFINITY}, max:{x:Number.NEGATIVE_INFINITY, y:Number.NEGATIVE_INFINITY, z:Number.NEGATIVE_INFINITY}};
					this.camera = new THREE.PerspectiveCamera(70, this.threeDiv.innerWidth / this.threeDiv.innerHeight, 1, 2 * this.horizon);
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
//					this.scene.fog.color.copy(uniforms.bottomColor.value);
					const skyGeo = new THREE.SphereBufferGeometry( this.horizon, 32, 15 );
//					skyGeo.renderDepth = this.horizon;
//					const skyGeo = new THREE.SphereBufferGeometry(5000, 32, 15 );
					const skyMat = new THREE.ShaderMaterial({vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
					const sky = new THREE.Mesh(skyGeo, skyMat);
					this.scene.add(sky );
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
					if (this.threeDiv.children.length > 0)
						this.threeDiv.removeChild(this.threeDiv.children[0]);
					this.threeDiv.appendChild(this.renderer.domElement);
					this.renderer.gammaInput = true;
					this.renderer.gammaOutput = true;
					this.renderer.shadowMap.enabled = true;
					this.view('front');
				}
				catch(e)
				{
					Cat.recordError(e);
				}
			},
			animate()
			{
				const threeD = Cat.display.threeD;
				Cat.display.threeD.resizeCanvas();
				requestAnimationFrame(threeD.animate);
				threeD.renderer.setViewport(0, 0, threeD.threeDiv.clientWidth, threeD.threeDiv.clientHeight);
				threeD.renderer.render(threeD.scene, threeD.camera);
			},
			constrain(w)
			{
				return w < - this.max ? -this.max : (w > this.max ? this.max : w);
			},
			view(dir)
			{
				let bbox = Cat.clone(this.bbox);
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
			},
			expand()
			{
				document.getElementById('threeD-sidenav').style.width = '100%';
				document.getElementById('threeD-expandBtn').innerHTML = Cat.display.getButton('chevronRight', `Cat.display.panel.collapse('threeD', true)`, 'Expand');
				this.resizeCanvas();
			},
			resizeCanvas()
			{
				const canvas = this.renderer.domElement;
				let width = canvas.clientWidth;
				let height = canvas.clientHeight;
				if (width !== 0 && height !== 0 && (canvas.width !== width || canvas.height !== height))
				{
					this.renderer.setSize(width, height, false);
					this.camera.aspect = width / height;
					this.camera.updateProjectionMatrix();
				}
			},
		},
		tty:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('tty', false) + Cat.display.expandPanelBtn('tty', true)), 'buttonBarLeft') +
							H.h3('TTY') +
							H.button('Output', 'sidenavAccordion', '', 'TTY output from some composite', `onclick="Cat.display.accordion.toggle(this, \'ttyOutPnl\')"`) +
							H.div(
								H.table(H.tr(
									H.td(Cat.display.getButton('delete', `document.getElementById('tty-out').innerHTML = ''`, 'Clear output'), 'buttonBar') +
									H.td(Cat.display.getButton('download', `Cat.downloadString(document.getElementById('tty-out').innerHTML, 'text', 'console.log')`, 'Download tty log'), 'buttonBar')), 'buttonBarLeft') +
								H.pre('', 'tty', 'tty-out'), 'accordionPnl', 'ttyOutPnl') +
							H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="Cat.display.accordion.toggle(this, \'errorOutPnl\')"`) +
							H.div(H.table(H.tr(H.td(Cat.display.getButton('delete', `document.getElementById('error-out').innerHTML = ''`, 'Clear errors'))), 'buttonBarLeft') +
								H.span('', 'tty', 'error-out'), 'accordionPnl', 'errorOutPnl');
				document.getElementById('tty-sidenav').innerHTML = html;
			},
		},
		data:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('data', false) +
										Cat.display.expandPanelBtn('data', true) +
										H.td(Cat.display.getButton('delete', `Cat.getDiagram().gui(evt, this, 'clearDataMorphism')`, 'Clear all data'))), 'buttonBarLeft');
				let dgrm = Cat.getDiagram();
				if (dgrm !== null)
				{
					if (dgrm.selected.length === 1 && dgrm.getSelected().class === 'morphism')
					{
						let from = dgrm.getSelected();
						const to = from.to;
						let tbl = '';
						if (to.subClass === 'dataMorphism')
						{
							to.updateRecursor();
							html += H.h3(to.getText(), '', 'dataPanelTitle');
							if (to.recursor !== null)
								html += H.small(`Recursor morphism is ${to.recursor.getText()}`);
							if (dataMorphism.checkEditableObject(dgrm, to.domain))
							{
								html += H.button('Add Data', 'sidenavAccordion', '', 'Add entries to this map', `onclick="Cat.display.accordion.toggle(this, \'dataInputPnl\')"`);
								const irx = to.domain.hasRegexp() ? `pattern="${to.domain.getRegexp()}"`: '';
								const inputForm = Cat.display.input('', 'inputTerm', to.domain.getText(), irx);
								const outputForm = element.inputCode(dgrm, to.codomain.expr);
								tbl = H.tr(H.td('Domain')) +
										H.tr(H.td(inputForm)) +
										H.tr(H.td('Codomain')) +
										H.tr(H.td(outputForm));
								html += H.div(H.table(tbl) + Cat.display.getButton('edit', `Cat.display.data.handler('${from.name}')`, 'Edit data'), 'accordionPnl', 'dataInputPnl');
								if (dgrm.codomain.isNumeric(to.codomain))
								{
									html += H.button('Add Range', 'sidenavAccordion', '', 'Add a range of entries to this map', `onclick="Cat.display.accordion.toggle(this, \'rangeInputPnl\')"`);
									tbl =	H.tr(H.td('Domain Start'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'startTerm', to.domain.getText(), irx)), 'sidenavRow') +
											H.tr(H.td('Range Count'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'rangeTerm', Cat.basetypes.objects.N.html, Cat.basetypes.objects.N.regexp)), 'sidenavRow') +
											H.tr(H.td('Codomain Start Values'), 'sidenavRow') +
											H.tr(H.td(element.inputCode(dgrm, to.codomain.expr, true, {uid:0, idp:'strt'})), 'sidenavRow');
									html += H.div(H.table(tbl) + Cat.display.getButton('edit', `Cat.display.data.handler('${from.name}', 'range')`, 'Edit data'), 'accordionPnl', 'rangeInputPnl');
									const minForm = element.inputCode(dgrm, to.codomain.expr, true, {uid:0, idp:'min'});
									const maxForm = element.inputCode(dgrm, to.codomain.expr, true, {uid:0, idp:'max'});
									html += H.button('Add Random Range', 'sidenavAccordion', '', 'Add random entries to this map', `onclick="Cat.display.accordion.toggle(this, \'randomDataInputPnl\')"`) +
											H.div(
												H.table(
													H.tr(H.td('Domain Start Value'), 'sidenavRow') +
													H.tr(H.td(Cat.display.input('', 'inputStartIdx', 'Start ' + to.domain.getText(), irx, '')), 'sidenavRow') +
													H.tr(H.td(Cat.display.input('', 'inputEndIdx', 'End ' + to.domain.getText(), irx, '')), 'sidenavRow') +
													H.tr(H.td('Codomain'), 'sidenavRow') +
													H.tr(H.td(H.small('Minimum value')), 'sidenavRow') +
													H.tr(H.td(minForm), 'sidenavRow') +
													H.tr(H.td(H.small('Maximum value')), 'sidenavRow') +
													H.tr(H.td(maxForm), 'sidenavRow')) +
											Cat.display.getButton('edit', `Cat.display.data.handler('${from.name}', 'random')`, 'Create random range'), 'accordionPnl', 'randomDataInputPnl');
								}
								html += H.div('', 'parseError', 'editError');
							}
							html += H.button('Current Data', 'sidenavAccordion', 'dataPnlBtn', 'Current data in this morphism', `onclick="Cat.display.accordion.toggle(this, \'dataPnl\')"`);
							tbl = H.tr(H.th(to.domain.getText()) + H.th(to.codomain.getText()));
							for(let i in to.data)
							{
								let d = to.data[i];
								if (d === null)
									continue;
	// TODO change to toolbar on row select
								tbl += H.tr(H.td(i) + H.td(d));
							}
							html += H.div(H.table(tbl), 'accordionPnl', 'dataPnl');
						}
					}
					document.getElementById('data-sidenav').innerHTML = html;
					const dpb = document.getElementById('dataPnlBtn');
					if (dpb !== null)
						Cat.display.accordion.toggle(dpb, 'dataPnl');
				}
			},
			handler(nm, style = 'one')
			{
				try
				{
					const dgrm = Cat.getDiagram();
					const m = dgrm.mapMorphismByName(nm);
					switch(style)
					{
					case 'one':
						m.addData();
						break;
					case 'range':
						m.addRange();
						break;
					case 'random':
						m.addRandomData();
						break;
					}
					Cat.display.data.setPanelContent();
					dgrm.saveToLocalStorage();
				}
				catch(err)
				{
					document.getElementById('editError').innerHTML = 'Error: ' + Cat.getError(err);
				}
			}
		},
		diagram:
		{
			setPanelContent()
			{
				const dgrm = Cat.getDiagram();
				const dt = new Date(dgrm ? dgrm.timestamp : 0);
				const cat = getCat();
				let html =	H.div('', '', 'diagramInfoDiv') +
							H.div('', '', 'diagramPanelToolbar') +
							H.h3(H.span('Diagram')) +
							H.h4(H.span(dgrm ? dgrm.getText() : '', '', 'dgrmHtmlElt') + H.span('', '', 'dgrmHtmlEditBtn')) +
							H.p(H.span(dgrm ? Cat.cap(dgrm.description) : '', 'description', 'dgrmDescElt', 'Description') + H.span('', '', 'dgrmDescriptionEditBtn')) +
							H.table(H.tr(H.td(H.p(dgrm ? ('user' in dgrm ? dgrm.user : ('username' in dgrm ? dgrm.username : '')) : ''), 'author') + H.td(H.p(dt.toLocaleString()), 'date'))) +
							H.button('References', 'sidenavAccordion', '', 'Diagrams referenced by this diagram', 'onclick="Cat.display.accordion.toggle(this, \'referenceDiagrams\')"') +
							H.div(H.div('', 'accordionPnl', 'referenceDiagrams')) +
							this.newDiagramPnl() +
							(cat !== null ? H.button(`${Cat.user.name}`, 'sidenavAccordion', '', 'User diagrams', 'onclick="Cat.display.accordion.toggle(this, \'userDiagramDisplay\')"') : '') +
							H.div(	H.small('User diagrams') +
							H.div('', '', 'userDiagrams'), 'accordionPnl', 'userDiagramDisplay') +
							H.button('Recent', 'sidenavAccordion', '', 'Recent diagrams from Catecon', 'onclick="Cat.display.accordion.toggle(this, \'recentDiagrams\');Cat.display.diagram.setRecentDiagramTable()"') +
							H.div(H.div('', 'accordionPnl', 'recentDiagrams')) +
							H.button('Catalog', 'sidenavAccordion', '', 'Catalog of available diagrams', 'onclick="Cat.display.accordion.toggle(this, \'catalogDiagrams\');Cat.display.diagram.setCatalogDiagramTable()"') +
							H.div(H.div('', 'accordionPnl', 'catalogDiagrams'));
				document.getElementById('diagram-sidenav').innerHTML = html;
				this.update();
			},
			update()
			{
				const dgrm = Cat.getDiagram();
				if (dgrm !== null)
				{
					this.updateDecorations(dgrm);
// TODO fix					document.getElementById('dgrmHtmlEditBtn').innerHTML = dgrm.readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('dgrmHtmlElt', 'html')`, 'Retitle', Cat.default.button.tiny);
// TODO fix					document.getElementById('dgrmDescriptionEditBtn').innerHTML =
						dgrm.readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('dgrmDescElt', 'description')`, 'Edit description', Cat.default.button.tiny);
					Cat.display.diagram.setUserDiagramTable();
					Cat.display.diagram.setReferencesDiagramTable();
					Cat.display.diagram.setToolbar(dgrm);
				}
			},
			deleteTerm(ndx)
			{
				try
				{
					Cat.getDiagram().deleteTerm(ndx);
					document.getElementById('termTable').innerHTML = this.termTable();
				}
				catch(e)
				{
					Cat.recordError(e);
				}
			},
			newTerm()
			{
				try
				{
					document.getElementById('diagramTermError').innerHTML = '';
					const objCode = document.getElementById('termObjectCode').value;
					const eltCode = document.getElementById('termElementCode').value;
					const desc = document.getElementById('termDescription').value;
					if (objCode === '' || eltCode === '')
						throw 'Code must be specified.';
					let dgrm = Cat.getDiagram();
					new term({diagram:dgrm, code:objCode, eltCode:eltCode, description:desc});
					document.getElementById('termTable').innerHTML = this.termTable();
					dgrm.update();
				}
				catch(x)
				{
					document.getElementById('diagramTermError').innerHTML = 'Error: ' + Cat.getError(err);
				}
			},
			termTable()
			{
				let html = H.span('Terms used by this diagram.', 'smallPrint');
				let dgrm = Cat.getDiagram();
				if (dgrm)
					for(let i=0; i<dgrm.terms.length; ++i)
					{
						let term = dgrm.terms[i];
						html += H.tr(	H.td(Cat.display.getButton('delete', `Cat.display.diagram.deleteTerm(${i});`, 'Delete term')) +
										H.td(Cat.basetypes.quantifiers[term.quantifier]) +
										H.td(H.span(term.member.getText()), 'grabbable', '', '', `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${term.name}')"`) +
										H.td('&#8712;') +
										H.td(term.getText()) +
										H.td(Cat.cap(term.description) !== '' ? Cat.display.getButton('help', '', Cat.cap(term.description)) : ''));
					}
				return H.table(H.tr(H.th('&nbsp;') + H.th('&nbsp;') + H.th('Element') + H.th('&nbsp;') + H.th('Term') + H.th('&nbsp;'), 'sidenavRow') + html);
			},
			newDiagramPnl()
			{
				let html =	H.button('New', 'sidenavAccordion', '', 'New Diagram', `onclick="Cat.display.accordion.toggle(this, \'newDiagramPnl\')"`) +
							H.div(
									H.small('The chosen name must have no spaces and must be unique among the diagrams you have in this category.') +
									H.table(	H.tr(H.td(Cat.display.input('', 'diagramName', 'Name')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'diagramHtml', 'HTML Entities')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'newDiagramDescription', 'Description')), 'sidenavRow'), 'sidenav') +
									H.span(Cat.display.getButton('edit', 'Cat.display.diagram.new()', 'Create new diagram')) +
									H.span('', 'parseError', 'diagramError'), 'accordionPnl', 'newDiagramPnl');
				return html;
			},
			new()
			{
				try
				{
					document.getElementById('diagramError').innerHTML = '';
					const nameElt = document.getElementById('diagramName');
					const name = nameElt.value;
					let codomain = getCat().name;
					const fullname = diagram.nameCheck(codomain, Cat.user.name, name);
					// TODO make it <> safe
					const htmlElt = document.getElementById('diagramHtml');
					const html = htmlElt.value;
					const descriptionElt = document.getElementById('newDiagramDescription');
					const description = descriptionElt.value;
					const dgrm = new diagram({name:fullname, codomain, html:document.getElementById('diagramHtml').value, description:document.getElementById('newDiagramDescription').value, user:Cat.user.name});
					nameElt.value = '';
					htmlElt.value = '';
					descriptionElt.value = '';
					dgrm.saveToLocalStorage();
					Cat.selected.selectDiagram(fullname);
					Cat.display.accordion.close('newDiagramPnl');
					Cat.display.panel.close('diagram');
					this.setUserDiagramTable();
					this.setReferencesDiagramTable();
					dgrm.update();
				}
				catch(e)
				{
					document.getElementById('diagramError').innerHTML = 'Error: ' + (typeof e === 'string' ? e : Cat.getError(e));
				}
			},
			updateDecorations(dgrm)
			{
				const nbDgrm = document.getElementById('navbar_diagram');
				nbDgrm.innerHTML = `${dgrm.getText()} by ${dgrm.username}`;
				nbDgrm.title = Cat.cap(dgrm.description);
				document.getElementById('dgrmHtmlElt').innerHTML = dgrm.getText();
				document.getElementById('dgrmDescElt').innerHTML = nbDgrm.title;
			},
			getDiagramInfo(obj)
			{
				if (typeof obj === 'string')
				{
					const serverInfo = obj in Cat.serverDiagrams ? Cat.serverDiagrams[obj] : null;
					const localInfo = obj in Cat.localDiagrams ? Cat.localDiagrams[obj] : null;
					const serverTime = serverInfo ? serverInfo.timestamp : 0;
					const localTime = localInfo ? localInfo.timestamp : 0;
					const info =
					{
						description:	localInfo ? localInfo.description : (serverInfo ? serverInfo.description : ''),
						username:		localInfo ? ('user' in localInfo ? localInfo.user : localInfo.username) : (serverInfo ? ('user' in serverInfo ? serverInfo.user : serverInfo.username) : ''),
						name:			obj,
						fancyName:		localInfo ? ('html' in localInfo ? localInfo.html : localInfo.fancyName) : (serverInfo ? ('html' in serverInfo ? serverInfo.html : serverInfo.fancyName) : ''),
						timestamp:		localInfo ? localInfo.timestamp : (serverInfo ? serverInfo.timestamp : ''),
					};
					return info;
				}
				const info =
				{
					description:	obj.description,
					username:		obj.username,
					name:			obj.name,
					fancyName:		obj.getText(),
					timestamp:		obj.timestamp,
				};
				return info;
			},
			diagramRow(info, tb = null)
			{
				const dt = new Date(info.timestamp);
				const tokens = info.name.split('@');
				const url = Cat.Amazon.URL(tokens[1], info.username, info.name + '.png');
				const tbTbl = H.table(H.tr( (tb ? tb : '') +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButtonJSON(`Cat.getDiagram('${info.name}').downloadJSON()`, Cat.default.button.small), 'buttonBar', '', 'Download diagram JSON') : '' ) +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButtonJS(`Cat.getDiagram('${info.name}').downloadJS()`, Cat.default.button.small), 'buttonBar', '', 'Download diagram ecmascript') : '' ) +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButtonPNG(`Cat.getDiagram('${info.name}').downloadPNG()`, Cat.default.button.small), 'buttonBar', '', 'Download diagram PNG') : '' )),
					'buttonBarLeft');
				const tbl = H.table(
//									H.tr(H.td(tbTbl, '', '', '', 'colspan="2"')) +
									H.tr(H.td(H.h5(info.fancyName), '', '', '', 'colspan="2"')) +
									H.tr(H.td(`<img src="${url}" id="img_${info.name}" width="200" height="150"/>`, 'white', '', '', 'colspan="2"')) +
									H.tr(H.td(info.description, 'description', '', '', 'colspan="2"')) +
									H.tr(H.td(info.username, 'author') + H.td(dt.toLocaleString(), 'date')));
				return H.tr(H.td(tbTbl)) + H.tr(H.td(`<a onclick="Cat.selected.selectDiagram('${info.name}')">` + tbl + '</a>'), 'sidenavRow');
			},
			setUserDiagramTable()
			{
				const dgrm = Cat.getDiagram();
				if (dgrm === null)
					return;
				const dgrms = {};
				for (const d in Cat.localDiagrams)
				{
					const dgrm = Cat.localDiagrams[d];
					if (dgrm.username === Cat.user.name)
						dgrms[d] = true;
				}
				Object.keys(Cat.serverDiagrams).map(d => dgrms[d] = true);
				let html = Object.keys(dgrms).map(d =>
				{
					const refBtn = !(dgrm.name == d || dgrm.hasReference(d)) ? H.td(Cat.display.getButton('reference', `Cat.getDiagram().addReferenceDiagram(evt, '${d}')`, 'Add reference diagram'), 'buttonBar') : '';
					return this.diagramRow(this.getDiagramInfo(d), refBtn);
				}).join('');
				document.getElementById('userDiagrams').innerHTML = H.table(html);
			},
			setReferencesDiagramTable()
			{
				const dgrm = Cat.getDiagram();
				if (dgrm === null)
					return;
				const refcnts = dgrm.getReferenceCounts();
				let html = H.small('References for this diagram') + dgrm.references.map(d =>
				{
					const del = refcnts[d.name] === 1 ? H.td(Cat.display.getButton('delete', `Cat.getDiagram().removeReferenceDiagram(evt,'${d.name}')`, 'Remove reference'), 'buttonBar') : '';
					return this.diagramRow(this.getDiagramInfo(d), del);
				}).join('');
				document.getElementById('referenceDiagrams').innerHTML = H.table(html);
			},
			setRecentDiagramTable()
			{
				if (!('recentDiagrams' in Cat))
					fetch(Cat.Amazon.URL() + '/recent.json').then(function(response)
					{
						if (response.ok)
							response.json().then(function(data)
							{
								Cat.recentDiagrams = data.diagrams;
								let html = data.diagrams.map(d => Cat.display.diagram.diagramRow(d)).join('');
								const dt = new Date(data.timestamp);
								document.getElementById('recentDiagrams').innerHTML = H.span(`Last updated ${dt.toLocaleString()}`, 'smallPrint') + H.table(html);
							});
					});
			},
			setCatalogDiagramTable()
			{
				if (!('catalogDiagrams' in Cat))
					fetch(Cat.Amazon.URL() + '/catalog.json').then(function(response)
					{
						if (response.ok)
							response.json().then(function(data)
							{
								Cat.catalogDiagrams = data.diagrams;
								let html = data.diagrams.map(d => Cat.display.diagram.diagramRow(d)).join('');
								const dt = new Date(data.timestamp);
								document.getElementById('catalogDiagrams').innerHTML = H.span(`Last updated ${dt.toLocaleString()}`, 'smallPrint') + H.table(html);
							});
					});
			},
			setToolbar(dgrm)
			{
				const html = H.table(H.tr(
							(dgrm && dgrm.readonly ? '' : H.td(Cat.display.getButton('delete', "Cat.getDiagram().clear(evt)", 'Erase diagram!'), 'buttonBar')) +
							(dgrm && Cat.user.name === dgrm.username ? H.td(Cat.display.getButton('upload', 'Cat.getDiagram().upload(evt)', 'Upload', Cat.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '') +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButtonJSON('Cat.getDiagram().downloadJSON()', Cat.default.button.small), 'buttonBar') : '' ) +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButtonJS('Cat.getDiagram().downloadJS()', Cat.default.button.small), 'buttonBar') : '' ) +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButtonPNG('Cat.getDiagram().downloadPNG()', Cat.default.button.small), 'buttonBar') : '' ) +
							Cat.display.expandPanelBtn('diagram', false) +
							Cat.display.closeBtnCell('diagram', true)), 'buttonBarRight');
				document.getElementById('diagramPanelToolbar').innerHTML = html;
			},
		},
		functor:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('functor', false)), 'buttonBarRight');
				html += H.h3('Functors');
				let morphs = [];
				if ($Cat)
					for(const [key, mor] of $Cat.morphisms)
						morphs.push(mor);
				html += H.table(Cat.display.morphismTableRows(morphs, `onclick=""`));
				document.getElementById('functor-sidenav').innerHTML = html;
			},
		},
		help:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('help', false) +
										Cat.display.expandPanelBtn('help', true)), 'buttonBarLeft');
				html += H.h3('Catecon') +
					H.h4('The Categorical Console')	+
					H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Interactive actions', `onclick="Cat.display.accordion.toggle(this, \'catActionHelpPnl\')"`) +
					H.div(	H.h4('Mouse Actions') +
							H.h5('Select With Mouse') +
								H.p('Select an object or a morphism with the mouse.  If the diagram is editable, you can drag by selecting and keeping the mouse down, then dragging, then releasing the mouse.') +
							H.h5('Region Select With Mouse') +
								H.p('Click the mouse button, then drag without releasing to cover some elements, and then release to select those elements.') +
							H.h5('Multi-Select With Shift Click') +
								H.p('Shift click to add another element to the select list') +
							H.h5('Control Drag') +
								H.p('Click with the mouse on an object with the Ctrl key down and then drag to create an identity morphism for that object.') +
								H.p('Doing the same with a morphism makes a copy of the morphism.') +
								H.p('Use the mouse wheel to zoom in and out.') +
							H.h4('Key Actions') +
							H.h5('Delete') +
								H.p('Selected objects or morphisms are deleted.  Some elements cannot be deleted if they are referred to by another element.') +
							H.h5('Spacebar') +
								H.p('Press the spacebar and then with the mouse click-drag-release on the diagram to pan the view.') +
							H.h5('Home') +
								H.p('Return to your cateapsis, the height of your categoricalness in this diagram, or sometimes known as the home view.') +
							H.h5('d') +
								H.p('Toggle the diagram panel.') +
							H.h5('F') +
								H.span('[Shift-f]', 'italic') + H.p('Place the floating point number object if it exists.') +
							H.h5('h') +
								H.p('Toggle the help panel.') +
							H.h5('l') +
								H.p('Toggle the login panel.') +
							H.h5('m') +
								H.p('Toggle the morphism panel.') +
							H.h5('N') +
								H.span('[Shift-n]', 'italic') + H.p('Place the natural number object if it exists.') +
							H.h5('o') +
								H.p('Toggle the object panel.') +
							H.h5('O') +
								H.span('[Shift-o]', 'italic') + H.p('Place the sub-object classifier object if it exists.') +
							H.h5('s') +
								H.p('Toggle the settings panel.') +
							H.h5('S') +
								H.span('[Shift-s]', 'italic') + H.p('Place the string object if it exists.') +
							H.h5('y') +
								H.p('Toggle the tty panel.') +
							H.h5('Z') +
								H.span('[Shift-z]', 'italic') + H.p('Place the integers object if it exists.') +
							H.h5('3') +
								H.p('Toggle the 3D panel.')
							, 'accordionPnl', 'catActionHelpPnl') +
					H.button('Category Theory', 'sidenavAccordion', 'catHelpPnlBtn', 'References to Category Theory', `onclick="Cat.display.accordion.toggle(this, \'catHelpPnl\')"`) +
					H.div(H.p(H.a('Categories For The Working Mathematician', '', '', '', 'href="https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician" target="_blank"')), 'accordionPnl', 'catHelpPnl') +
					H.button('References', 'sidenavAccordion', 'referencesPnlBtn', '', `onclick="Cat.display.accordion.toggle(this, \'referencesPnl\')"`) +
					H.div(	H.p(H.a('Intro To Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/09/16/cat-prog/"')) +
							H.p(H.a('V Is For Vortex - More Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"')), 'accordionPnl', 'referencesPnl') +
					H.button('The Math License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="Cat.display.accordion.toggle(this, \'licensePnl\')"`) +
					H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
							H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
							H.p('Inelegant or unreferenced diagrams are removed.'), 'accordionPnl', 'licensePnl') +
					H.button('Credits', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Cat.display.accordion.toggle(this, \'creditsPnl\')"`) +
					H.div(	H.a('Saunder Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
							H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'accordionPnl', 'creditsPnl') +
					H.button('Third Party Software', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Cat.display.accordion.toggle(this, \'thirdPartySoftwarePnl\')"`) +
					H.div(H.p('Parser: peg.js') +
							H.p('Crypto: sjcl.js') +
							H.p('3D: three.js'), 'accordionPnl', 'thirdPartySoftwarePnl');
				document.getElementById('help-sidenav').innerHTML = html;
			}
		},
		login:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('login', false)), 'buttonBarLeft') +
					H.h3('Login') +
					H.div('User: ' + H.span(Cat.user.name, 'smallBold')) +
					H.div('Email: ' + H.span(Cat.user.email, 'smallBold')) +
					(!Cat.Amazon.loggedIn ? '' : H.button('Logout', '', '', 'Logout of the current session', `onclick="Cat.Amazon.logout()"`)) +
					H.button('Reset password', '', '', 'Reset your password', `onclick="Cat.Display.login.showResetForm()"`) +
					H.div('', 'passwordResetForm');
				if (Cat.user.status !== 'logged-in' && Cat.user.status !== 'registered')
					html += H.h3('Login') +
							H.table(	H.tr(H.td('User name')) +
										H.tr(H.td(H.input('', '', 'loginUserName', 'text', {ph:'Name'}))) +
										H.tr(H.td('Password')) +
										H.tr(H.td(H.input('', '', 'loginPassword', 'password', {ph:'********', x:'onclick=Cat.Amazon.login()'}))) +
										H.tr(H.td(H.button('Login', '', '', '', 'onclick=Cat.Amazon.login()'))));
				if (Cat.user.status === 'unauthorized')
					html += H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="Cat.display.accordion.toggle(this, \'signupPnl\')"`) +
							H.div( H.table(H.tr(H.td('User name')) +
										H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
										H.tr(H.td('Email')) +
										H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
										Cat.display.login.passwordForm() +
//										H.tr(H.td('Secret Key for Access')) +
//										H.tr(H.td(H.input('', '', 'signupSecret', 'text', {ph:'????????'}))) +
//										H.tr(H.td('Password')) +
//										H.tr(H.td(H.input('', '', 'signupUserPassword', 'password', {ph:'Password'}))) +
//										H.tr(H.td('Confirm password')) +
//										H.tr(H.td(H.input('', '', 'signupUserPasswordConfirm', 'password', {ph:'Confirm'}))) +
										H.tr(H.td(H.button('Sign up', '', '', '', 'onclick=Cat.Amazon.signup()')))), 'accordionPnl', 'signupPnl');
				if (Cat.user.status === 'registered')
					html += H.h3('Confirmation Code') +
							H.span('The confirmation code is sent by email to the specified address above.') +
							H.table(	H.tr(H.td('Confirmation code')) +
										H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code'}))) +
										H.tr(H.td(H.button('Submit Confirmation Code', '', '', '', 'onclick=Cat.Amazon.confirm()'))));
				document.getElementById('login-sidenav').innerHTML = html;
			},
			passwordForm(sfx = '')
			{
				return H.tr(H.td('Secret Key for Access')) +
						H.tr(H.td(H.input('', '', `${sfx}SignupSecret`, 'text', {ph:'????????'}))) +
						H.tr(H.td('Password')) +
						H.tr(H.td(H.input('', '', `${sfx}SignupUserPassword`, 'password', {ph:'Password'}))) +
						H.tr(H.td('Confirm password')) +
						H.tr(H.td(H.input('', '', `${sfx}SignupUserPasswordConfirm`, 'password', {ph:'Confirm'})));
			},
			showResetForm()
			{
				document.getElementById('passwordResetForm').innerHTML = H.table(Cat.display.login.passwordForm('reset') +
					H.tr(H.td(H.button('Reset password', '', '', '', 'onclick=Cat.Amazon.resetPassword()'))));
			},
		},
		morphism:
		{
			drag(e, morphismName)
			{
				Cat.display.deactivateToolbar();
				e.dataTransfer.setData('text/plain', 'morphism ' + morphismName);
			},
			setPanelContent()
			{
				let dgrm = Cat.getDiagram();
				if (dgrm !== null)
				{
					let html = H.table(H.tr(Cat.display.expandPanelBtn('morphism', false) + Cat.display.closeBtnCell('morphism', true)), 'buttonBarRight') +
								H.h3('Morphisms') +
								dgrm.setupDiagramElementPnl('_MorPnl', 'updateMorphismTableRows') +
								H.h4('References') +
								dgrm.references.map(r => r.setupDiagramElementPnl('_MorPnl', 'updateMorphismTableRows')).join('');
					document.getElementById('morphism-sidenav').innerHTML = html;
				}
			},
			update()
			{
				let dgrm = Cat.getDiagram();
				dgrm.updateMorphismTableRows(`${dgrm.name}_MorPnl`);
			},
		},
		object:
		{
			drag(e, name)
			{
				Cat.display.deactivateToolbar();
				e.dataTransfer.setData('text/plain', 'object ' + name);
			},
			setPanelContent()
			{
				let dgrm = Cat.getDiagram();
				if (dgrm !== null)
				{
					let html = H.table(H.tr(Cat.display.expandPanelBtn('object', false) + Cat.display.closeBtnCell('object', true)), 'buttonBarRight') +
								H.h3('Objects') +
								this.newObjectPnl() +
								dgrm.setupDiagramElementPnl('_ObjPnl', 'updateObjectTableRows') +
								H.h4('References') +
								dgrm.references.map(r => r.setupDiagramElementPnl('_ObjPnl', 'updateObjectTableRows')).join('');
					document.getElementById('object-sidenav').innerHTML = html;
				}
			},
			new(e)
			{
				try
				{
					document.getElementById('objectError').innerHTML = '';
					const nameElt = document.getElementById('objectName');
					const name = nameElt.value;
					if (name !== '' && !RegExp(Cat.userNameEx).test(name))
							throw 'Invalid object name.';
					const dgrm = Cat.getDiagram();
					if (dgrm.getObject(name))
						throw `Object with name ${name} already exists.`;
					nameElt.value = '';
					const codeElt = document.getElementById('objectCode');
					let code = codeElt.value;
					codeElt.value = '';
					code = code === '' ? name : code;
					const htmlElt = document.getElementById('objectHtml');
					const html = htmlElt.value;
					htmlElt.value = '';
					const descriptionElt = document.getElementById('objectDescription');
					const description = descriptionElt.value;
					descriptionElt.value = '';
					const to = dgrm.newObject({name, code, html, description});
					dgrm.placeObject(e, to);
				}
				catch(e)
				{
					document.getElementById('objectError').innerHTML = 'Error: ' + Cat.getError(e);
				}
			},
			newObjectPnl()
			{
				let html = H.button('New Object', 'sidenavAccordion', '', 'New Object', `onclick="Cat.display.accordion.toggle(this, \'newObjectPnl\')"`) +
							H.div( H.table(H.tr(H.td(Cat.display.input('', 'objectName', 'Name')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'objectCode', 'Code')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'objectHtml', 'HTML Entities')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'objectDescription', 'Description')), 'sidenavRow')) +
									H.span(Cat.display.getButton('edit', 'Cat.display.object.new(evt)', 'Create new object for this diagram')) +
									H.span('', 'parseError', 'objectError'), 'accordionPnl', 'newObjectPnl');
				return html;
			},
			update()
			{
				let dgrm = Cat.getDiagram();
				dgrm.updateObjectTableRows(`${dgrm.name}_ObjPnl`);
			},
		},
		settings:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('settings', false)), 'buttonBarLeft');
				html += H.h3('Settings') +
					H.table(
						H.tr(H.td(`<input type="checkbox" ${Cat.display.gridding ? 'checked' : ''} onchange="Cat.display.gridding = !Cat.display.gridding">`) + H.td('Gridding'))
					);
				document.getElementById('settings-sidenav').innerHTML = html;
			}
		},
		transform:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('transform', false)), 'buttonBarRight');
				html += H.h3('Transforms');
				let morphs = [];
				if ($Cat)
					for(const [key, trn] of $Cat.transforms)
						morphs.push(trn);
				html += H.table(Cat.display.morphismTableRows(morphs, `onclick=""`));
				document.getElementById('transform-sidenav').innerHTML = html;
			},
		},
		element:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('element', false) +
										H.td(Cat.display.expandPanelBtn('element', false))
										), 'buttonBarRight');
				html += H.h3('Text') + this.newElementPnl();
				html += H.button('Text', 'sidenavAccordion', '', 'New Text', `onclick="Cat.display.accordion.toggle(this, \'elementPnl\')"`) +
					H.div('', 'accordionPnl', 'elementPnl');
				document.getElementById('element-sidenav').innerHTML = html;
				this.update();
				Cat.display.accordion.open('elementPnl');
			},
			newElementPnl()
			{
				const dgrm = Cat.getDiagram();
				let html = '';
				if (dgrm && !dgrm.readonly)
				{
					html = H.button('New Text', 'sidenavAccordion', '', 'New Text', `onclick="Cat.display.accordion.toggle(this, \'newElementPnl\')"`) +
								H.div(	H.table(H.tr(H.td(H.textarea('', 'elementHtml', 'elementHtml')), 'sidenavRow')) +
										H.span(Cat.display.getButton('edit', 'Cat.display.element.new(evt)', 'Create new text for this diagram')) +
										H.span('', 'parseError', 'elementError'), 'accordionPnl', 'newElementPnl');
				}
				return html;
			},
			new(e)
			{
				try
				{
					document.getElementById('elementError').innerHTML = '';
					const dgrm = Cat.getDiagram();
					const mdl = {x:Cat.display.width()/2, y:Cat.display.height()/2};
					const xy = D2.subtract(dgrm.userToDiagramCoords(mdl), dgrm.viewport);
					const hElt = document.getElementById('elementHtml');
					const txt = new element(dgrm.domain, {name:`Text${dgrm.textId++}`, diagram:dgrm, html:hElt.value, xy});
					hElt.value = '';
					dgrm.texts.push(txt);
					dgrm.placeElement(e, txt);
					this.update();
					Cat.display.accordion.open('elementPnl');
				}
				catch(e)
				{
					document.getElementById('objectError').innerHTML = 'Error: ' + Cat.getError(e);
				}
			},
			update()
			{
				const dgrm = Cat.getDiagram();
				if (dgrm)
					document.getElementById('elementPnl').innerHTML = H.table(dgrm.texts.map((t, i) =>
						H.tr(	H.td(H.table(H.tr(H.td(Cat.display.getButton('delete', `Cat.display.element.delete(${i})`, 'Delete text'))), 'buttonBarLeft')) +
								H.td(H.span(Cat.htmlSafe(t.html), 'tty', `text_${i}`) +
									(this.readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().getElement('${t.name}').editText('text_${i}', 'html')`, 'Edit', Cat.default.button.tiny)), 'left'), 'sidenavRow')
							).join(''));
			},
			delete(i)
			{
				const dgrm = Cat.getDiagram();
				dgrm.texts[i].decrRefcnt();
				this.update();
				dgrm.update();
			},
		},
		activateToolbar(e)
		{
			let dgrm = Cat.getDiagram();
			if (dgrm.selected.length === 0)
				return;
			let tb = document.getElementById('toolbar');
			tb.style.opacity = 1;
			tb.style.display = 'block';
			let xy = 'clientX' in e ? {x:e.clientX, y:e.clientY} : Cat.mouse.xy;
			let xyOffset = true;
			if (dgrm.selected.length === 1)
			{
				const elt = dgrm.getSelected();
				tb.innerHTML = dgrm.toolbar(elt);
			}
			else if (dgrm.selected.length > 1)
			{
				let html = H.td(Cat.display.getButton('close', 'Cat.display.deactivateToolbar()', 'Close'), 'buttonBar');
				let type = dgrm.selected[0].class;
				dgrm.selected.reduce((sameType, s) => type === s.class && sameType, true);
				if (type === 'morphism')
				{
					const form = dgrm.domain.hasForm(dgrm.selected);
					const htmlLength = html.length;
					if (form.composite)
						html += H.td(this.getButton('compose', `Cat.getDiagram().gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
					if (form.sink)
					{
						if (dgrm.codomain.isCartesian)
							html += H.td(this.getButton('pullback', `Cat.getDiagram().gui(evt, this, 'pullback')`, 'Pullback'), 'buttonBar');
						if (dgrm.codomain.hasCoproducts)
							html += H.td(this.getButton('coproductAssembly', `Cat.getDiagram().gui(evt, this, 'coproductAssembly')`, 'Coproduct assembly'), 'buttonBar');
					}
					if (form.source)
					{
						if (dgrm.codomain.hasCoproducts)
							html += H.td(this.getButton('pushout', `Cat.getDiagram().gui(evt, this, 'pushout')`, 'Pushout'), 'buttonBar');
						if (dgrm.codomain.isCartesian)
							html += H.td(this.getButton('productAssembly', `Cat.getDiagram().gui(evt, this, 'productAssembly')`, 'Product assembly'), 'buttonBar');
					}
					if (form.distinct && dgrm.codomain.isCartesian)
						html += H.td(this.getButton('product', `Cat.getDiagram().gui(evt, this, 'product')`, 'Product'), 'buttonBar');
					if (html.length !== htmlLength)
						xyOffset = false;
					if (dgrm.selectedCanRecurse())
						html += H.td(this.getButton('recursion', `Cat.getDiagram().gui(evt, this, 'recursion')`, 'Recursion'), 'buttonBar');
				}
				else if (type === 'object')
				{
					if (dgrm.codomain.isCartesian)
						html += H.td(this.getButton('product', `Cat.getDiagram().gui(evt, this, 'product')`, 'Product'), 'buttonBar');
				}
				tb.innerHTML = H.table(H.tr(html), 'buttonBarLeft');
			}
			const rect = Cat.display.topSVG.getBoundingClientRect();
			let left = rect.left + xy.x + (xyOffset ? Cat.default.toolbar.x : 0);
			left = left >= 0 ? left : 0;
			left = (left + tb.clientWidth) >= window.innerWidth ? window.innerWidth - tb.clientWidth : left;
			tb.style.left = `${left}px`;
			let top = rect.top + xy.y - (xyOffset ? Cat.default.toolbar.y : 0);
			top = top >= 0 ? top : 0;
			top = (top + tb.clientHeight) >= window.innerHeight ? window.innerHeight - tb.clientHeight : top;
			tb.style.top = `${top}px`;
		},
		deactivateToolbar()
		{
			document.getElementById('toolbar').style.display = 'none';
		},
		closeBtnCell(typeName)
		{
			return H.td(this.getButton('close', `Cat.display.panel.toggle('${typeName}')`, 'Close'), 'buttonBar');
		},
		expandPanelBtn(panelName, right)
		{
//			return H.td(H.div(this.getButton(right ? 'chevronLeft' : 'chevronRight', `Cat.display.panel.expand('${panelName}', ${right})`, 'Expand'), '', `${panelName}-expandBtn`), 'buttonBar');
			return H.td(this.getButton(right ? 'chevronLeft' : 'chevronRight', `Cat.display.panel.expand('${panelName}', ${right})`, 'Expand'), 'buttonBar', `${panelName}-expandBtn`);
		},
		clickDeleteBtn(id, fn)
		{
			try
			{
				const delBtn = document.getElementById(`delBtn${id}`);
				if ('hit' in delBtn)
				{
					delBtn.parentNode.replaceChild(delBtn.cloneNode(true), delBtn);
					if (fn in window)
						window[fn]();
				}
				else
				{
					delBtn.hit = true;
					Cat.display.callbacks.push(function()
					{
						var elm = delBtn;
						var newElm = elm.cloneNode(true);
					});
				}
			}
			catch(e)
			{
				Cat.recordError(e);
			}
		},
		deleteBtn(fn, title)
		{
			const uid = ++Cat.display.id;
			const html = H.span(
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg id="svg${uid}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="0.32in" height="0.32in" version="1.1" viewBox="0 0 320 320" xmlns:xlink="http://www.w3.org/1999/xlink">
	<rect id="delBtn${uid}" x="0" y="0" width="320" height="320" fill="white">
		<animate attributeName="fill" values="white;yellow" dur="0.25s" begin="anim${uid}.begin" fill="freeze"/>
	</rect>
	<g>
		${this.svg.buttons['delete']}
		<rect class="btn" x="0" y="0" width="320" height="320" onclick="Cat.display.clickDeleteBtn(${uid}, '${fn}')"/>
		<animateTransform id="anim${uid}" attributename="transform" type="rotate" from="0 160 160" to="360 160 160" begin="click" dur="0.25s" fill="freeze"/>
	</g>
</svg>`, '', '', title);
			return H.td(H.div(html), 'buttonBar');
		},
		svg:
		{
			basics:
`<defs>
	<filter id="softGlow" height="300%" width="300%">
		<feMorphology operator="dilate" radius="2" in="SourceAlpha" result="thicken" />
		<feGaussianBlur in="thicken" stdDeviation="2" result="blurred" />
		<feFlood flood-color="rgb(192,192,192)" result="glowColor" />
		<feComposite in="glowColor" in2="blurred" operator="in" result="softGlow_colored" />
		<feMerge>
			<feMergeNode in="softGlow_colored"/>
			<feMergeNode in="SourceGraphic"/>
		</feMerge>
	</filter>
	<radialGradient id="radgrad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
		<stop offset="0%" style="stop-color:rgb(0,0,0);stop-opacity:1"/>
		<stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0"/>
	</radialGradient>
	<radialGradient id="radgrad2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
		<stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0"/>
		<stop offset="25%" style="stop-color:rgb(0,0,0);stop-opacity:1"/>
		<stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0"/>
	</radialGradient>
	<radialGradient id="radgrad3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
		<stop offset="0%" style="stop-color:rgb(63,63,63);stop-opacity:1"/>
		<stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0"/>
	</radialGradient>
	<g id="threeD_base">
		<line class="arrow0" x1="120" y1="180" x2="280" y2="180" marker-end="url(#arrowhead)"/>
		<line class="arrow0" x1="120" y1="180" x2="120" y2="40" marker-end="url(#arrowhead)"/>
		<line class="arrow0" x1="120" y1="180" x2="40" y2="280" marker-end="url(#arrowhead)"/>
	</g>
</defs>
<marker id="arrowhead" viewBox="6 12 60 90" refX="50" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
	<path class="svgstr3" d="M10 20 L60 50 L10 80"/>
</marker>
<marker id="arrowheadRev" viewBox="6 12 60 90" refX="15" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
	<path class="svgstr3" d="M60 20 L10 50 L60 80"/>
</marker>
`,
			buttons:
			{
				cateapsis:
`<circle cx="160" cy="60" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M40,280 40,160 110,90" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M280,280 280,160 210,90" marker-end="url(#arrowhead)"/>`,
				category:
`<line class="arrow0" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
				compose:
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
				chevronLeft:
`<path class="svgfilNone svgstr1" d="M120,40 80,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 160,160 200,280"/>`,
				chevronRight:
`<path class="svgfilNone svgstr1" d="M120,40 160,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 240,160 200,280"/>`,
				close:
`<line class="arrow0 str0" x1="40" y1="40" x2="280" y2= "280" />
<line class="arrow0 str0" x1="280" y1="40" x2="40" y2= "280" />`,
				coproductAssembly:
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,
				delete:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="230" marker-end="url(#arrowhead)"/>
<path class="svgfilNone svgstr1" d="M90,190 A120,50 0 1,0 230,190"/>`,
				detachDomain:
`<circle cx="40" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="100" cy="200" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="140" y1="200" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,
				detachCodomain:
`<circle cx="220" cy="200" r="60" fill="url(#radgrad1)"/>
<circle cx="280" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="40" y1="160" x2="180" y2="200" marker-end="url(#arrowhead)"/>`,
				diagram:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
				download:
//<circle cx="160" cy="240" r="80" fill="url(#radgrad1)"/>
`<line class="arrow0" x1="160" y1="40" x2="160" y2="160" marker-end="url(#arrowhead)"/>`,
				edit:
`<path class="svgstr4" d="M280 40 160 280 80 240" marker-end="url(#arrowhead)"/>`,
				eval:
`<circle cx="80" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="80" r="60" fill="url(#radgrad1)"/>
<polyline class="svgstr3" points="50,40 30,40 30,120 50,120"/>
<polyline class="svgstr3" points="190,40 210,40 210,120 190,120"/>
<circle cx="260" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="280" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="160" y1="140" x2="160" y2="220" marker-end="url(#arrowhead)"/>`,
				folderOpen:
`<polyline class="svgfil2" points="90,240 230,160 90,80"/>`,
				fromHere:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,
				toHere:
`<circle cx="260" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="30" y1="160" x2="200" y2="160" marker-end="url(#arrowhead)"/>`,
				functor:
`<line class="arrow0" x1="40" y1="40" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>`,
				help:
`<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,120 C100,40 280,40 210,120 S170,170 160,200"/>`,
				lambda2:
`<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="120" y1="120" x2="40" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="200" y1="200" x2="280" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="200" x2="40" y2="280" marker-end="url(#arrowhead)"/>`,
				lambda:
`<circle cx="120" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="200" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="120" cy="240" r="60" fill="url(#radgrad1)"/>
<circle cx="200" cy="240" r="60" fill="url(#radgrad1)"/>
<polyline class="svgstr3" points="80,200 60,200 60,280 100,280"/>
<polyline class="svgstr3" points="240,200 260,200 260,280 240,280"/>
<line class="arrow0" x1="160" y1="100" x2="160" y2="200" marker-end="url(#arrowhead)"/>`,
				login:
`<polyline class="svgstr4" points="160,60 160,200 70,280 70,40 250,40 250,280"/>`,
				morphism:
`<marker id="arrowhead" viewBox="6 12 60 90" refX="50" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
	<path class="svgstr3" d="M10 20 L60 50 L10 80"/>
</marker>
<marker id="arrowheadRev" viewBox="6 12 60 90" refX="15" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
	<path class="svgstr3" d="M60 20 L10 50 L60 80"/>
</marker>
<line class="arrow0" x1="60" y1="160" x2="260" y2="160" marker-end="url(#arrowhead)"/>`,
				name:
`<line class="arrow0" x1="80" y1="80" x2="240" y2="80" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="160" y1="80" x2="160" y2="240" marker-end="url(#arrowhead)"/>
<path class="svgstr3" d="M80,40 L240,40 A40,40 0 0 1 280,80 L280,240 A40,40 0 0 1 240,280 L80,280 A40,40 0 0 1 40,240 L40,80 A40,40 0 0 1 80,40"/>`,
				new:
`<circle class="svgfil4" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
				object:
`<circle cx="160" cy="160" r="140" fill="url(#radgrad1)"/>`,
				product:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
				productAssembly:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="80" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="60" y1="80" x2="120" y2="260" marker-end="url(#arrowhead)"/>`,
				project:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="110" y1="120" x2="240" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="200" x2="240" y2="280" marker-end="url(#arrowhead)"/>`,
				pullback:
`<path class="svgstr4" d="M60,120 120,120 120,60"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
				pushout:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M200,260 200,200 260,200"/>`,
				recursion:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow3" x1="40" y1="120" x2="240" y2="120" marker-end="url(#arrowhead)"/>
<line class="arrow6" x1="40" y1="180" x2="200" y2="180" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="240" x2="160" y2="240" marker-end="url(#arrowhead)"/>`,
				reference:
//<line class="arrow9" x1="120" y1="100" x2="260" y2="100" marker-end="url(#arrowhead)"/>
//<line class="arrow9" x1="100" y1="120" x2="100" y2="260" marker-end="url(#arrowhead)"/>
`<line class="arrow9" x1="120" y1="100" x2="260" y2="100"/>
<line class="arrow9" x1="100" y1="120" x2="100" y2="260"/>
<line class="arrow9" x1="120" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="120" x2="280" y2="250" marker-end="url(#arrowhead)"/>

<line class="arrow0" x1="60" y1="40" x2="200" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="200" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="220" x2="190" y2="220" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="220" y1="60" x2="220" y2="190" marker-end="url(#arrowhead)"/>`,
				run:
`<line class="arrow0" x1="20" y1="160" x2="100" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="160" x2="200" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="220" y1="160" x2="300" y2="160" marker-end="url(#arrowhead)"/>`,
				save:
`<path class="svgstr3" d="M149.72 93.72l0 -72.67 20 0 0 72.67 -20 0zm4.8 12.98l10.39 -6.74 -10.39 0 31.69 -48.89 10.4 6.74 -31.7 48.89 -10.39 0zm0 0l10.39 0 -5.2 8.02 -5.2 -8.02zm-26.52 -52.26l5.2 -3.37 31.72 48.89 -10.39 6.74 -31.72 -48.89 5.2 -3.37z"/>
<path class="svgstr3" d="M200 115c52.41,3.81 80,17.39 80,32.09 0,17.95 -53.72,32.5 -120,32.5 -66.28,0 -120,-14.55 -120,-32.5 0,-14.89 26.7,-28.44 80,-32.09"/>
<path class="svgstr3" d="M280 147.09l-20 112.91c-2.53,14.31 -48.59,35 -100,35 -51.41,0 -97.47,-20.68 -100,-35l-20 -112.91"/>`,
				settings:
`<line class="arrow0" x1="40" y1="160" x2="280" y2="160" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="160" y1="40" x2="160" y2="280" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="60" x2="240" y2="260" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="260" x2="240" y2="60" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<circle class="svgfil4" cx="160" cy="160" r="60"/>
<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>`,
				string:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="200"/>
<path class="svgstr4" d="M60,120 C120,120 120,200 60,200"/>
<path class="svgstr4" d="M260,40 C200,40 200,120 260,120"/>
<line class="arrow0" x1="60" y1="260" x2="260" y2="260"/>`,
				text:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="160" y1="280" x2="160" y2="60"/>`,
				threeD:
`<line class="arrow0" x1="120" y1="180" x2="280" y2="180" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="180" x2="120" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="180" x2="40" y2="280" marker-end="url(#arrowhead)"/>`,
				threeD_bottom:
`<polygon class="svgfil1" points="120,180 280,180 200,280 40,280"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
				threeD_front:
`<polygon class="svgfil1" points="40,120 200,120 200,280 40,280"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
				threeD_back:
`<polygon class="svgfil1" points="120,40 280,40 280,180 120,180"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
				threeD_top:
`<polygon class="svgfil1" points="120,40 280,40 200,140 40,140"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
				threeD_left:
`<polygon class="svgfil1" points="120,20 120,180 40,280 40,120"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
				threeD_right:
`<polygon class="svgfil1" points="280,20 280,180 200,280 200,120"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
				transform:
`<circle cx="47" cy="155" r="60" fill="url(#radgrad1)"/>
<path class="svgfil0" d="M228.03 165l-127.89 0 0 -20 127.89 0 0 20zm12.98 -4.8l-6.74 -10.39 0 10.39 -48.89 -31.69 6.74 -10.4 48.89 31.7 0 10.39zm0 0l0 -10.39 8.02 5.2 -8.02 5.2zm-52.26 26.52l-3.37 -5.2 48.89 -31.72 6.74 10.39 -48.89 31.72 -3.37 -5.2z"/>
<path class="svgfil0" d="M260 273.03l0 -243.03 20 0 0 243.03 -20 0zm4.8 12.98l10.39 -6.74 -10.39 0 31.69 -48.89 10.4 6.74 -31.7 48.89 -10.39 0zm0 0l10.39 0 -5.2 8.02 -5.2 -8.02zm-26.52 -52.26l5.2 -3.37 31.72 48.89 -10.39 6.74 -31.72 -48.89 5.2 -3.37z"/>`,
				tty:
`<path class="svgstrThinGray" d="M70,40 240,40 240,280 70,280 70,40"/>
<line class="svgstr3" x1="90" y1="80" x2="220" y2="80"/>
<line class="svgstr3" x1="90" y1="120" x2="200" y2="120"/>
<line class="svgstr3" x1="90" y1="160" x2="160" y2="160"/>
<line class="svgstr3" x1="90" y1="200" x2="120" y2="200"/>`,
				upload:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="160" y1="280" x2="160" y2="160" marker-end="url(#arrowhead)"/>`,
			},
			header(scale, bgColor = '#ffffff')
			{
				const v = 0.32 * (typeof scale !== 'undefined' ? scale : 1.0);
				const html = `
<svg xmlns="http://www.w3.org/2000/svg" width="${v}in" height="${v}in" version="1.1" viewBox="0 0 320 320">
<rect x="0" y="0" width="320" height="320" style="fill:${bgColor}"/>`;
				return html;
			},
			button(onclick)
			{
				return `<rect class="btn" x="0" y="0" width="320" height="320" onclick="${onclick}"/>`;
			},
		},
		id:	0,	// unique id's
		downloadButtonJSON(onclick, scale = Cat.default.button.small)
		{
			const html = this.svg.header(scale) +
				this.svg.buttons.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">JSON</text>
${this.svg.button(onclick)}
</svg>`;
			return html;
		},
		downloadButtonJS(onclick, scale = Cat.default.button.small)
		{
			const html = this.svg.header(scale) +
				this.svg.buttons.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">JS</text>
${this.svg.button(onclick)}
</svg>`;
			return html;
		},
		downloadButtonPNG(onclick, scale = Cat.default.button.small)
		{
			const html = this.svg.header(scale) + this.svg.buttons.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">PNG</text>
${this.svg.button(onclick)}
</svg>`;
			return html;
		},
		getButton(buttonName, onclick, title, scale = Cat.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
		{
			let btn = this.svg.buttons[buttonName];
			if (id !== null)
				btn = `<g id="${id}">${btn}</g>`;
			return H.span(this.svg.header(scale, bgColor) + btn + (addNew ? this.svg.buttons.new : '') + this.svg.button(onclick) + '</svg>', '', id, title);
		},
		setNavbarHtml()
		{
			let left = H.td(H.div(this.getButton('category', "Cat.display.panel.toggle('category')", 'Categories', Cat.default.button.large))) +
				H.td(H.div(this.getButton('diagram', "Cat.display.panel.toggle('diagram')", 'Diagrams', Cat.default.button.large))) +
				H.td(H.div(this.getButton('object', "Cat.display.panel.toggle('object')", 'Objects', Cat.default.button.large))) +
				H.td(H.div(this.getButton('morphism', "Cat.display.panel.toggle('morphism')", 'Morphisms', Cat.default.button.large))) +
				H.td(H.div(this.getButton('functor', "Cat.display.panel.toggle('functor')", 'Functors', Cat.default.button.large))) +
				H.td(H.div(this.getButton('transform', "Cat.display.panel.toggle('transform')", 'Transforms', Cat.default.button.large))) +
				H.td(H.div(this.getButton('text', "Cat.display.panel.toggle('element')", 'Text', Cat.default.button.large)));
			let right =
				H.td(H.div(this.getButton('cateapsis', "Cat.getDiagram().home()", 'Catecon', Cat.default.button.large))) +
				H.td(H.div(this.getButton('string', "Cat.getDiagram().showStrings(evt)", 'Graph', Cat.default.button.large))) +
				H.td(H.div(this.getButton('threeD', "Cat.display.panel.toggle('threeD');Cat.display.threeD.resizeCanvas()", '3D view', Cat.default.button.large))) +
				H.td(H.div(this.getButton('tty', "Cat.display.panel.toggle('tty')", 'Console', Cat.default.button.large))) +
				H.td(H.div(this.getButton('help', "Cat.display.panel.toggle('help')", 'Help', Cat.default.button.large))) +
				H.td(H.div(this.getButton('login', "Cat.display.panel.toggle('login')", 'Login', Cat.default.button.large))) +
				H.td(H.div(this.getButton('settings', "Cat.display.panel.toggle('settings')", 'Settings', Cat.default.button.large)));
			let navbar = H.table(H.tr(	H.td(H.table(H.tr(left), 'buttonBar'), 'w20', '', '', 'align="left"') +
										H.td(H.span('', 'navbar-inset', 'navbar_category'), 'w20') +
										H.td(H.span('Catecon', 'title'), 'w20') +
										H.td(H.span('', 'navbar-inset', 'navbar_diagram'), 'w20') +
										H.td(H.table(H.tr(right), 'buttonBar', '', '', 'align="right"'), 'w20')), 'navbarTbl');
			document.getElementById('navbar').innerHTML = navbar;
		},
		input(val, id, ph, x='', cls='in100', type='text')
		{
			return H.input(val, cls, id, type, {ph});
		},
		morphismTableRows(morphisms, action = null, drag = true)
		{
			let html = '';
			let found = {};
			for(let i=0; i<morphisms.length; ++i)
			{
				let m = morphisms[i];
				if (m.name in found)
					continue;
				found[m.name] = true;
				const act = action !== null ? action.replace(/%1/g, m.name) : '';
				html += H.tr(H.td(m.getText()) + H.td(m.domain.getText()) + H.td('&rarr;') + H.td(m.codomain.getText()),
						`${drag ? 'grabbable ' : ''}sidenavRow`, '', Cat.cap(m.description), drag ? `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${m.name}')" ${act}` : act);
			}
			return html;
		},
		setCursor()
		{
			switch(Cat.display.tool)
			{
			case 'select':
				this.topSVG.style.cursor = 'default';
				break;
			case 'pan':
				this.topSVG.style.cursor = 'all-scroll';
				break;
			}
		},
		callbacks:	[],
		elementId()
		{
			return `elt_${Cat.display.id++}`;
		},
		addEventListeners()
		{
			document.addEventListener('mousemove', function(e)
			{
				const s = Cat.display.statusbar;
				if (s.style.display === 'block' && D2.dist(Cat.statusXY, {x:e.clientX, y:e.clientY}) > 50)
					s.style.display = 'none';
			});
			document.addEventListener('dragover', function(e)
			{
				e.preventDefault();
			}, false);
			document.addEventListener('drop', function(e)
			{
				e.preventDefault();
			}, true);
			document.addEventListener('keydown', function(e)
			{
				if (e.target === document.body)
				{
					switch(e.keyCode)
					{
					case 32:	// 'space'
						Cat.display.tool = 'pan';
						break;
					case 36:	// 'home'
						Cat.getDiagram().home();
						break;
					}
					Cat.display.shiftKey = e.shiftKey;
					Cat.display.setCursor();
				}
			});
			document.addEventListener('keyup', function(e)
			{
				if (e.target === document.body)
				{
					const dgrm = Cat.getDiagram();
					if (!dgrm)
						return;
					const xy = dgrm.userToDiagramCoords(Cat.mouse.xy);
					Cat.display.shiftKey = e.shiftKey;
					const placeSquare = false;
					switch(e.keyCode)
					{
					case 32:	// 'space'
						Cat.display.tool = 'select';
						Cat.display.drag = false;
						break;
					case 46:	// delete
						dgrm.removeSelected();
						break;
					case 49:	// 1
						dgrm.placeObject(e, dgrm.getObjectByCode('One'), xy);
						break;
					case 51:	// 3
						Cat.display.panel.toggle('threeD');
						break;
					case 67:	// c
						if (!e.shiftKey)
							Cat.display.panel.toggle('category');
						break;
					case 68:	// d
						if (!e.shiftKey)
							Cat.display.panel.toggle('diagram');
						break;
					case 70:	// F
						if (e.shiftKey)
							dgrm.placeObject(e, dgrm.getObjectByCode(placeSquare ? 'F*F' : 'F'), xy);
						break;
					case 72:	// H
						Cat.display.panel.toggle('help');
						break;
					case 76:	// l
						Cat.display.panel.toggle('login');
						break;
					case 77:	// M
						Cat.display.panel.toggle('morphism');
						break;
					case 78:	// N
						if (e.shiftKey)
							dgrm.placeObject(e, dgrm.getObjectByCode(placeSquare ? 'N*N' : 'N'), xy);
						break;
					case 79:	// O
						if (e.shiftKey)
							dgrm.placeObject(e, dgrm.getObjectByCode(placeSquare ? 'Omega*Omega' : 'Omega'), xy);
						else
							Cat.display.panel.toggle('object');
						break;
					case 83:	// S
						if (e.shiftKey)
							dgrm.placeObject(e, dgrm.getObjectByCode(placeSquare ? 'Str*Str' : 'Str'), xy);
						else
							Cat.display.panel.toggle('settings');
						break;
					case 84:	// T
						if (e.shiftKey)
						{
							const txt = new element(dgrm.domain, {name:`Text${dgrm.textId++}`, diagram:dgrm, html:'Lorem ipsum cateconium', xy});
							dgrm.texts.push(txt);
							dgrm.placeElement(e, txt);
						}
						else
							Cat.display.panel.toggle('element');
						break;
					case 89:	// y
						if (!e.shiftKey)
							Cat.display.panel.toggle('tty');
						break;
					case 90:	// Z
						dgrm.placeObject(e, dgrm.getObjectByCode(placeSquare ? 'Z*Z' : 'Z'), xy);
						break;
					}
					Cat.display.setCursor();
				}
			});
			document.addEventListener('wheel', function(e)
			{
				if (e.target.id === 'topSVG')
				{
					Cat.display.deactivateToolbar();
					let mouseInc = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
					const dgrm = Cat.getDiagram();
					let inc = Math.log(dgrm.viewport.scale)/Math.log(Cat.default.scale.base) + mouseInc;
					let nuScale = Cat.default.scale.base ** inc;
					nuScale = nuScale < Cat.default.scale.limit.min ? Cat.default.scale.limit.min : nuScale;
					nuScale = nuScale > Cat.default.scale.limit.max ? Cat.default.scale.limit.max : nuScale;
					dgrm.viewport.scale = nuScale;
					let pnt = {x:e.clientX, y:e.clientY};
					const dx = mouseInc * (1.0 - 1.0 / Cat.default.scale.base) * (pnt.x - dgrm.viewport.x);
					const dy = mouseInc * (1.0 - 1.0 / Cat.default.scale.base) * (pnt.y - dgrm.viewport.y);
					const s = Cat.default.scale.base;
					dgrm.viewport.x = dgrm.viewport.x - dx;
					dgrm.viewport.y = dgrm.viewport.y - dy;
					dgrm.setView();
				}
			}, false);
		},
		setNavbarBackground()
		{
			let c = '#CCC';
			switch(Cat.user.status)
			{
				case 'registered':
					c = '#A33';
					break;
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
			document.getElementById('navbar').style.background = c;
		},
	},
	jsonAssoc(assoc)
	{
		let data = [];
		Object.keys(assoc).forEach(function(key)
		{
			data.push(assoc[key].json());
		});
		return data;
	},
	jsonMap(map)
	{
		let data = {};
		for(const [key, val] of map)
			data[key] = val.json();
		return data;
	},
	getAngle(deltaX, deltaY)
	{
		let angle = 0;
		if (deltaX != 0)
		{
			angle = Math.atan(deltaY/deltaX);
			if (deltaX < 0.0)
				angle += Math.PI;
		}
		else
			angle = deltaY > 0 ? Math.PI/2 : - Math.PI/2;
		if (angle < 0)
			angle += 2 * Math.PI;
		return angle % (2 * Math.PI);
	},
	parens(h, left, right, first)
	{
		return (!first ? left : '') + h + (!first ? right : '');
	},
	cap(str)
	{
		return str.replace(/(^|\s)\S/, l => l.toUpperCase());
	},
	capWords(str)
	{
		return str.replace(/(^|\s)\S/g, l => l.toUpperCase());
	},
	loCap(str)
	{
		return str.replace(/(^|\s)\S/, l => l.toLowerCase());
	},
	isExtendedName(name)
	{
		return name.indexOf(Cat.sep) > -1;
	},
	arrayEquals(a, b)
	{
		if (Array.isArray(a))
		{
			if (Array.isArray(b))
			{
				if (a.length !== b.length)
					return false;
				for (let i=0; i<a.length; ++i)
					if (!Cat.arrayEquals(a[i], b[i]))
						return false;
				return true;
			}
		}
		return a === b;
	},
	arraySet(a, f, v)
	{
		if (f in a)
			a[f].push(v)
		else
			a[f] = [v];
	},
	arrayInclude(a, f, v)
	{
		if (f in a && a[f].indexOf(v) === -1)
			a[f].push(v)
		else
			a[f] = [v];
	},
	textWidth(txt)
	{
		if (isGUI)
		{
			let svg = `<text text-anchor="middle" class="object" x="0" y="0" id="testTextWidthElt">${txt}</text>`;
			Cat.display.uiSVG.innerHTML = svg;
			const txtElt = document.getElementById('testTextWidthElt');
			const w = txtElt.parentNode.getBBox().width;
			Cat.display.uiSVG.innerHTML = '';
			return w;
		}
		return 10;
	},
	Amazon:
	{
		accessToken:		null,
		clientId:			'amzn1.application-oa2-client.2edcbc327dfe4a2081e53a155ab21e77',
		cognitoRegion:		'us-west-2',
		user:				null,
		region:				'us-west-1',
		diagramBucketName:	'catecon-diagrams',
		diagramBucket:		null,
		userPoolId:			'us-west-2_HKN5CKGDz',
		userPool:			null,
		loginInfo:			{IdentityPoolId:	'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf'},
		URL(cat, user, basename)
		{
			let url = `https://s3-${this.region}.amazonaws.com/${this.diagramBucketName}`;
			if (typeof cat === 'undefined')
				return url;
			url += `/${cat}`;
			if (typeof user === 'undefined')
				return url;
			url += `/${user}`;
			if (typeof basename === 'undefined')
				return url;
			return `${url}/${basename}`;
		},
		loggedIn:			false,
		initialize()
		{
			AWS.config.update(
			{
				region:			this.region,
				credentials:	new AWS.CognitoIdentityCredentials(this.loginInfo),
			});
			this.registerCognito();
		},
		updateServiceObjects()
		{
			this.diagramBucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: this.diagramBucketName}});
			this.lambda = new AWS.Lambda({region: Cat.Amazon.region, apiVersion: '2015-03-31'});
		},
		saveCategory(cat)
		{
			const key = `${cat.name}/${cat.name}.json`;
			this.diagramBucket.putObject(
			{
				Bucket:			this.diagramBucketName,
				ContentType:	'json',
				Key:			key,
				Body:			JSON.stringify(cat.json()),
				ACL:			'public-read',
			}, function(err, data)
			{
				if (err)
				{
					Cat.recordError(`Cannot save category: ${err.message}`);
					return;
				}
				if (Cat.debug)
					console.log('saved category', cat.name);
			});
		},
		saveDiagram(dgrm)	// for bootstrapping
		{
			const key = `${dgrm.codomain.name}/${dgrm.username}/${dgrm.name}.json`;
			this.diagramBucket.putObject(
			{
				Bucket:			this.diagramBucketName,
				ContentType:	'json',
				Key:			key,
				Body:			JSON.stringify(dgrm.json()),
				ACL:			'public-read',
			}, function(err, data)
			{
				if (err)
				{
					Cat.recordError(`Cannot save diagram: ${err.message}`);
					return;
				}
				if (Cat.debug)
					console.log('saved diagram',dgrm.name);
			});
		},
		addLoginsCreds(providerName, token)
		{
			creds.params.Logins = creds.params.Logins || {};
			creds.params.Logins[providerName] = token;
			creds.expired = true;
		},
		registerCognito()
		{
			const poolInfo =
			{
				UserPoolId:	this.userPoolId,
				ClientId:	'fjclc9b9lpc83tmkm8b152pin',
			};
			AWS.config.region = this.cognitoRegion;
			if (ACI)
				this.userPool = new ACI.CognitoUserPool(poolInfo);
			else
				this.userPool = new AmazonCognitoIdentity.CognitoUserPool(poolInfo);
			Cat.Amazon.user = this.userPool.getCurrentUser();
			if (Cat.Amazon.user)
			{
				Cat.Amazon.user.getSession(function(err, session)
				{
					if (err)
					{
						alert(err.message);
						return;
					}
					AWS.config.credentials = new AWS.CognitoIdentityCredentials(Cat.Amazon.loginInfo);
					Cat.Amazon.accessToken = session.getAccessToken().getJwtToken();
					if (Cat.debug)
						console.log('registerCognito session validity', session, session.isValid());
					const idPro = new AWS.CognitoIdentityServiceProvider();
					idPro.getUser({AccessToken:Cat.Amazon.accessToken}, function(err, data)
					{
						if (err)
						{
							console.log('getUser error',err);
							return;
						}
						Cat.Amazon.loggedIn = true;
						Cat.user.name = data.Username;
						Cat.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
						Cat.user.status = 'logged-in';
						Cat.display.setNavbarBackground();
						Cat.display.login.setPanelContent();
						diagram.cateconGetUserDiagrams(function(dgrms)
						{
							console.log('user diagrams on server',dgrms);
						});
						Cat.selected.selectCategoryDiagram(Cat.getLocalStorageCategoryName(), function()
						{
							Cat.selected.updateDiagramDisplay(Cat.selected.diagram);
						});
					});
				});
				this.updateServiceObjects();
			}
			else
			{
				AWS.config.credentials = new AWS.CognitoIdentityCredentials(this.loginInfo);
				AWS.config.credentials.get();
				this.updateServiceObjects();
			}
		},
		signup()
		{
			const userName = document.getElementById('signupUserName').value;
			const email = document.getElementById('signupUserEmail').value;
			const secret = document.getElementById('SignupSecret').value;
			if (Cat.secret !== Cat.sha256(secret))
			{
				alert('Your secret is not good enough');
				return;
			}
			const password = document.getElementById('SignupUserPassword').value;
			const confirmPassword = document.getElementById('SignupUserPasswordConfirm').value;
			if (password !== confirmPassword)
			{
				alert('Please confirm your password properly by making sure the password and confirmation are the same.');
				return;
			}
			let cognitoUser = null;
			const attributes =
			[
				new AmazonCognitoIdentity.CognitoUserAttribute({Name:'email', Value:email}),
			];
			this.userPool.signUp(userName, password, attributes, null, function(err, result)
			{
				if (err)
				{
					alert(err.message);
					return;
				}
				Cat.Amazon.user = result.user;
				Cat.user.name = userName;
				Cat.user.email = email;
				Cat.user.status = 'registered';
				Cat.display.setNavbarBackground();
				Cat.display.login.setPanelContent();
				if (Cat.debug)
					console.log('user name is ' + Cat.Amazon.user.getUsername());
			});
		},
		resetPassword()
		{
			const userName = document.getElementById('signupUserName').value;
			const email = document.getElementById('signupUserEmail').value;
			const secret = document.getElementById('SignupSecret').value;
			if (Cat.secret !== Cat.sha256(secret))
			{
				alert('Your secret is not good enough');
				return;
			}
			const password = document.getElementById('resetSignupUserPassword').value;
			const confirmPassword = document.getElementById('resetSignupUserPasswordConfirm').value;
			if (password !== confirmPassword)
			{
				alert('Please confirm your password properly by making sure the password and confirmation are the same.');
				return;
			}
			let cognitoUser = null;
			const attributes =
			[
				new AmazonCognitoIdentity.CognitoUserAttribute({Name:'email', Value:email}),
			];
			// TODO how to reset cognito?
			this.userPool.signUp(userName, password, attributes, null, function(err, result)
			{
				if (err)
				{
					alert(err.message);
					return;
				}
				Cat.Amazon.user = result.user;
				Cat.user.name = userName;
				Cat.user.email = email;
				Cat.user.status = 'registered';
				Cat.display.setNavbarBackground();
				Cat.display.login.setPanelContent();
				if (Cat.debug)
					console.log('user name is ' + Cat.Amazon.user.getUsername());
			});
		},
		confirm()
		{
			const code = document.getElementById('confirmationCode').value;
			Cat.Amazon.user.confirmRegistration(code, true, function(err, result)
			{
				if (err)
				{
					alert(err.message);
					return;
				}
				Cat.user.status = 'confirmed';
				Cat.display.setNavbarBackground();
				Cat.display.login.setPanelContent();
			});
		},
		login()
		{
			const userName = document.getElementById('loginUserName').value;
			const password = document.getElementById('loginPassword').value;
			const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({Username:userName, Password:password});
			const userData = {Username:userName, Pool:Cat.Amazon.userPool};
			Cat.Amazon.user = new AmazonCognitoIdentity.CognitoUser(userData);
			Cat.Amazon.user.authenticateUser(authenticationDetails,
			{
				onSuccess:function(result)
				{
					Cat.Amazon.accessToken = result.getAccessToken().getJwtToken();
					Cat.Amazon.loggedIn = true;
					Cat.user.status = 'logged-in';
					const idPro = new AWS.CognitoIdentityServiceProvider();
					idPro.getUser({AccessToken:Cat.Amazon.accessToken}, function(err, data)
					{
						if (err)
						{
							console.log('getUser error',err);
							return;
						}
						Cat.user.name = data.Username;
						Cat.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
						Cat.display.setNavbarBackground();
						Cat.display.login.setPanelContent();
						Cat.display.morphism.setPanelContent();
						Cat.display.panel.toggle('login');
						Cat.selected.selectCategoryDiagram(Cat.getLocalStorageCategoryName(), function()
						{
							Cat.selected.updateDiagramDisplay(Cat.selected.diagram);
						});
						Cat.setLocalStorageDefaultCategory();
						Cat.setLocalStorageDiagramName();
						diagram.cateconGetUserDiagrams(function(dgrms)
						{
							console.log('user diagrams on server',dgrms);
						});
					});
				},
				onFailure:function(err)
				{
					alert(err.message);
				},
				mfaRequired:function(codeDeliveryDetails)
				{
					let verificationCode = '';
					Cat.Amazon.user.sendMFACode(verificationCode, this);
				},
			});
		},
		logout()
		{
			Cat.Amazon.user.signOut();
			Cat.Amazon.loggedIn = false;
			Cat.user.status = 'unauthorized';
			Cat.user.name = 'Anon';
			Cat.user.email = '';
			Cat.user.status = 'unauthorized';
			Cat.display.setNavbarBackground();
//			Cat.display.login.setPanelContent();
			Cat.updatePanels();
		},
		async fetchDiagram(name)
		{
			const tokens = name.split(Cat.sep);
			const catName = tokens[1];
			const user = tokens[2];
			const url = this.URL(catName, user, name + '.json');
			const json = await (await fetch(url)).json();
			return json;
		},
		ingestCategoryLambda(e, cat, fn)
		{
			const params =
			{
				FunctionName:	'CateconIngestCategory',
				InvocationType:	'RequestResponse',
				LogType:		'None',
				Payload:		JSON.stringify(
								{
									category:cat.json(),
									username:Cat.user.name,
								}),
			};
			const handler = function(error, data)
			{
				if (error)
				{
					Cat.recordError(error);
					return;
				}
				const result = JSON.parse(data.Payload);
				if (fn)
					fn(e, result);
			};
			Cat.Amazon.lambda.invoke(params, handler);
		},
		ingestDiagramLambda(e, dgrm, fn)
		{
			Cat.svg2canvas(Cat.display.topSVG, this.name, function(url, filename)
			{
				const params =
				{
					FunctionName:	'CateconIngestDiagram',
					InvocationType:	'RequestResponse',
					LogType:		'None',
					Payload:		JSON.stringify(
									{
										diagram:dgrm.json(),
										username:Cat.user.name,
										png:url,
									}),
				};
				const handler = function(error, data)
				{
					if (error)
					{
						Cat.recordError(error);
						return;
					}
					const result = JSON.parse(data.Payload);
					if (fn)
						fn(error, result);
				};
				Cat.Amazon.lambda.invoke(params, handler);
			});
		},
		fetchDiagramJsons(diagrams, fn, jsons = [], refs = {})
		{
			let someDiagrams = diagrams.filter(d => typeof d === 'string' && Cat.getDiagram(d) === null);
			if (someDiagrams.length > 0)
				Promise.all(someDiagrams.map(d => Cat.Amazon.fetchDiagram(d))).then(fetchedJsons =>
				{
					jsons.push(...fetchedJsons);
					fetchedJsons.map(j => {refs[j.name] = true; return true;});
					const nextRound = [];
					for (let i=0; i<fetchedJsons.length; ++i)
						nextRound.push(...fetchedJsons[i].references.filter(r => !(r in refs) && nextRound.indexOf(r) < 0));
					if (nextRound.length > 0)
						Cat.Amazon.fetchDiagramJsons(nextRound, fn, jsons, refs);
					else if (fn)
						fn(jsons);
				});
			else if (fn)
				fn([]);
		},
	},
	svgContainers:	['svg', 'g'],
	svgStyles:
	{
		path:	['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
		text:	['fill', 'font', 'margin', 'stroke'],
	},
	copyStyles(dest, src)
	{
		for (var cd = 0; cd < dest.childNodes.length; cd++)
		{
			var dstChild = dest.childNodes[cd];
			if (Cat.svgContainers.indexOf(dstChild.tagName) != -1)
			{
				Cat.copyStyles(dstChild, src.childNodes[cd]);
				continue;
			}
			const srcChild = src.childNodes[cd];
			if ('data' in srcChild)
				continue;
			var srcStyle = window.getComputedStyle(srcChild);
			if (srcStyle == "undefined" || srcStyle == null)
				continue;
			let style = '';
			if (dstChild.tagName in Cat.svgStyles)
			{
				const styles = Cat.svgStyles[dstChild.tagName];
				for (let i = 0; i<styles.length; i++)
					style += `${Cat.svgStyles[dstChild.tagName][i]}:${srcStyle.getPropertyValue(styles[i])};`;
			}
			dstChild.setAttribute('style', style);
		}
	},
	svg2canvas(svg, name, fn)
	{
		const copy = svg.cloneNode(true);
		Cat.copyStyles(copy, svg);
		const canvas = document.createElement('canvas');
		const bbox = svg.getBBox();
		canvas.width = Cat.display.svgPngWidth;
		canvas.height = Cat.display.svgPngHeight;
		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, Cat.display.width(), Cat.display.height());
		const data = (new XMLSerializer()).serializeToString(copy);
		const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
		const url = Cat.url.createObjectURL(svgBlob);
		const img = new Image();
		img.onload = function()
		{
			ctx.drawImage(img, 0, 0);
			Cat.url.revokeObjectURL(url);
//			const cargo = (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) ? navigator.msSaveOrOpenBlob(canvas.msToBlob(), filename) : canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
			const cargo = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
			const dgrmImg = document.getElementById(`img_${name}`);
			if (dgrmImg)
				dgrmImg.src = cargo;
			if (fn)
				fn(cargo, `${name}.png`);
	// TODO?		document.removeChild(canvas);
		};
		img.src = url;
	},
};

class element
{
	constructor(cat, args)
	{
		this.refcnt = 0;
		this.class = 'element';
		this.name = Cat.getArg(args, 'name', '');
		if (this.name != '' && !Cat.nameEx.test(this.name))
			throw `Element name ${this.name} is not allowed.`;
		this.html = Cat.getArg(args, 'html', '');
		this.code = Cat.getArg(args, 'code', '');
		this.Description = Cat.getArg(args, 'description', '');
		this.category = cat;
		this.diagram = 'diagram' in args ? (typeof args.diagram === 'object' ? args.diagram : Cat.getDiagram(args.diagram)) : null;
		if ('xy' in args)
		{
			this.x = Math.round(args.xy.x);
			this.y = Math.round(args.xy.y);
		}
		if ('x' in args)
		{
			this.x = Math.round(args.x);
			this.y = Math.round(args.y);
		}
		if ('cid' in args && args.cid.indexOf(',') === -1)	// TODO get rid of indexOf
			this.cid = args.cid;
		else
		{
			// TODO replace with signatures
			if (isGUI)
			{
				const ary = new Uint8Array(16);
				window.crypto.getRandomValues(ary);
				let cid = '';
				for (let i=0; i<16; ++i)
					cid += ary[i].toString(16);
				this.cid = cid;
			}
//			else
//				this.cid = null;	// TODO remove
		}
		this.readonly = Cat.getArg(args, 'readonly', false);
	}
	incrRefcnt()
	{
		++this.refcnt;
	}
	decrRefcnt()
	{
		if (Cat.debug)
			console.log('element.decrRefcnt',this.category.name,this.name,this.refcnt);
		--this.refcnt;
		if (this.refcnt <= 0)
		{
			if (Cat.debug)
				console.log('element.decrRefcnt delete',this.category.name,this.name);
			if (this.class === 'element')
				this.diagram.texts.splice(this.diagram.texts.indexOf(this), 1);
			isGUI && this.removeSVG();
		}
	}
	getText()
	{
		return this.html === '' ? this.name : this.html;
	}
	json()
	{
		const r =
		{
			category:			this.category.name,
			class:				'class' in this ? this.class : '',
			code:				this.code,
			description:		this.Description,
			diagram:			this.diagram === null ? null : this.diagram.name,
			cid:				this.cid,
			mode:				this.mode,
			name:				this.name,
			subClass:			'subClass' in this ? this.subClass : '',
			html:				this.html,
			readonly:			this.readonly,
		};
		if ('x' in this)
		{
			r.x = this.x;
			r.y = this.y;
		}
		return r;
	}
	get description()
	{
// TODO hmm, doing this makes <span></span>'s appear
//		return Cat.htmlEntitySafe(this.Description);
		return this.Description;
	}
	stringify()
	{
		return JSON.stringify(this.json());
	}
	isEquivalent(obj)
	{
		return obj ? this.cid === obj.cid : false;
	}
	isDeletable()
	{
		return this.refcnt <= 1;
	}
	setXY(xy)
	{
		const d = Cat.default.layoutGrid;
		this.x = Cat.display.gridding ? d * Math.round(xy.x / d) : xy.x;
		this.y = Cat.display.gridding ? d * Math.round(xy.y / d) : xy.y;
	}
	downloadJSON()
	{
		Cat.downloadString(this.stringify(), 'json', `${this.name}.json`);
	}
	static expandExpression(dgrm, expr, tokenFn, seqFn, exprFn, typeFn, first, that = null)
	{
		if ('op' in expr && ('sequence' === expr.op || 'product' === expr.op || 'coproduct' === expr.op || 'compose' === expr.op))
			return seqFn(dgrm, expr, first, that);
		else if ('token' in expr)
			return tokenFn(dgrm, expr, first, that);
		else if ('lhs' in expr)
			return exprFn(dgrm, expr, first, that);
		else if ('arg' in expr)
			return typeFn(dgrm, expr, first, that);
		return null;
	}
	static codename(dgrm, expr, first = true, extended = false)
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first)
			{
				let obj = null;
				if (dgrm.subClass === 'diagram')
					obj = extended ? dgrm.getObjectByExpr(expr) : dgrm.getObject(expr.token, extended);
				else
					obj = extended ? dgrm.getObjectByExpr(expr) : dgrm.getObject(expr.token, null, extended);
				if (obj)
				{
					if ('token' in obj.expr)
						return obj.expr.token;
				}
				else if ('token' in expr)
					return expr.token;
				return element.codename(dgrm, obj.expr, first, extended);
			},
			function(dgrm, expr, first)
			{
				const op = Cat.basetypes.operators[expr.op];
				const codenames = expr.data.map(d => element.codename(dgrm, d, false, extended));
				return Cat.parens(op.toName(codenames), Cat.basetypes.parens.left.nameCode, Cat.basetypes.parens.right.nameCode, first);
			},
			function(dgrm, expr, first)
			{
				const lCode = element.codename(dgrm, expr.lhs, true, extended);
				const rCode = element.codename(dgrm, expr.rhs, true, extended);
				const op = Cat.basetypes.operators[expr.op];
				return op.toName([lCode, rCode]);
			},
			function(){},
			first);
	}
	static getCode(dgrm, expr, first = true, full = false)
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, full)
			{
				if (!full)
					return expr.token;
				const obj = dgrm.getObjectByExpr(expr);
				if (obj)
				{
					if ('token' in obj.expr)
						return expr.token;
				}
				else
					return expr.token;
				return element.getCode(dgrm, obj.expr, false, full);
			},
			function(dgrm, expr, first, full)
			{
				const op = Cat.basetypes.operators[expr.op];
				const codes = expr.data.map(d => element.getCode(dgrm, d, false, full));
				return Cat.parens(codes.join(Cat.basetypes.operators.product.symCode), Cat.basetypes.parens.left.symCode, Cat.basetypes.parens.right.symCode, first, full);
			},
			function(dgrm, expr, first, full)
			{
				const leftCodeName = element.codename(dgrm, expr.lhs);
				const lCode = element.getCode(dgrm, expr.lhs, false, full);
				const rCode = element.getCode(dgrm, expr.rhs, false, full);
				const rightCodeName = element.codename(dgrm, expr.rhs);
				const op = Cat.basetypes.operators[expr.op];
				let code = op.code;
				return op.toCode(lCode, rCode);
			},
			function(){},
			first, full);
	}
	static getParenthesized(elt)
	{
		const useParens = (elt.html.indexOf(Cat.basetypes.operators.coproduct.sym) > -1) || (elt.html.indexOf(Cat.basetypes.operators.product.sym) > -1);	// TODO replace
		return useParens ? `(${elt.html})` : elt.html;
	}
	static html(dgrm, expr, first, data)	// data: class, position
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				expr.position = data.position;
				if (expr.token in Cat.basetypes.objects)
				{
					const html = Cat.basetypes.objects[expr.token].html;
					expr.width = Cat.textWidth(html);
					return html;
				}
				const elt = data.class === 'object' ? dgrm.getObject(expr.token) : dgrm.getMorphism(expr.token);
				if (elt !== null)
				{
					const html = element.getParenthesized(elt);
					expr.width = Cat.textWidth(html);
					return html;
				}
				expr.width = isGUI ? Cat.textWidth(expr.token) : 0;
				return expr.token;
			},
			function(dgrm, expr, first, data)
			{
				expr.position = data.position;
				const op = Cat.basetypes.operators[expr.op];
				const symWidth = Cat.textWidth(op.sym);	// TODO move
				const parenWidth = Cat.textWidth('(');	// TODO move
				let html = '';
				let position = data.position;
				if (!first)
				{
					position += parenWidth;
					html += '(';
				}
				const tokens = expr.data.map((d, i) =>
				{
					const html = element.html(dgrm, d, false, {class:data.class, position});
					position += d.width;
					if (i !== expr.data.length -1)
						position += symWidth;
					return html;
				});
				html += op.toHtml(tokens);
				if (!first)
				{
					position += parenWidth;
					html += ')';
				}
				expr.width = position - data.position;
				data.position = position;
				return html;
			},
			function(dgrm, expr, first, data)
			{
				expr.position = data.position;
				const bracketWidth = Cat.textWidth('[');	// TODO move
				const spaceWidth = Cat.textWidth(' ');	// TODO move
				const commaWidth = Cat.textWidth(', ');	// TODO move
				let position = data.position;
				let html = '[';
				position += bracketWidth;
				const op = Cat.basetypes.operators[expr.op];
				html += element.html(dgrm, expr.lhs, false, {class:data.class, position});
				html += ', ';
				position += expr.lhs.width + commaWidth + spaceWidth;
				html += element.html(dgrm, expr.rhs, false, {class:data.class, position});
				position += expr.rhs.width + bracketWidth;
				html += ']';
				expr.width = position - data.position;
				data.position = position;
				return html;
			},
			function(){},
			first, data);
	}
	static inputCode(dgrm, expr, first=true, uid={uid:0, idp:'data'})
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, uid)
			{
				if (expr.token in Cat.basetypes.objects)
				{
					++uid.uid;
					const obj = Cat.basetypes.objects[expr.token];
					const rx = 'regexp' in obj ? `pattern="${obj.regexp}"`: '';
					return Cat.display.input('', `${uid.idp}_${uid.uid}`, obj.html, rx, '');
				}
				if (dgrm.codomain.allObjectsFinite)
				{
					const obj = dgrm.getObjectByExpr(expr);
					if ('token' in obj.expr)
						return expr.token;
					return element.inputCode(dgrm, obj.expr, false, uid);
				}
				return null;
			},
			function(dgrm, expr, first, uid)
			{
				const op = Cat.basetypes.operators[expr.op];
				const codes = expr.data.map(d => {uid.uid; return element.inputCode(dgrm, d, false, uid)});
				return Cat.parens(codes.join(op.sym), '(', ')', first);
			},
			function(dgrm, expr, first, uid)
			{
				if (expr.op === 'hom')
				{
					const domain = dgrm.getObjectByExpr(expr.lhs);
					const codomain = dgrm.getObjectByExpr(expr.rhs);
					const homKey = category.homKey(domain, codomain);
					const homset = dgrm.getHomSet(domain, codomain);
					++uid.uid;
					const id = `${uid.idp}_${uid.uid}`;
					const th = H.tr(H.td(element.html(dgrm, expr, first, {class:'object', position:0}), '', '', '', `colspan='4'`));
					return H.table(th + Cat.display.morphismTableRows(homset, `data-name="%1" onclick="Cat.getDiagram().toggleTableMorphism(event, '${id}', '%1')"`, false), 'toolbarTbl', id);
				}
			},
			function(){},
			first, uid);
	}
	static fromExpression(dgrm, expr, first = true, uid={uid:0, idp:'data'})
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, uid)
			{
				if (expr.token in Cat.basetypes.objects)
				{
					++uid.uid;
					const obj = Cat.basetypes.objects[expr.token];
					const val = document.getElementById(`${uid.idp}_${uid.uid}`).value;
					if ('regexp' in obj)
					{
						const rx = RegExp(obj.regexp);
						if (!rx.test(val))
							throw `Input term ${val} is invalid.`;
					}
					return obj.$(val);
				}
				if (dgrm.codomain.allObjectsFinite)
				{
					const obj = dgrm.getObjectByExpr(expr);
					if ('token' in obj.expr)
					{
						++uid.uid;
						const val = document.getElementById(`${uid.idp}_${uid.uid}`).value;
						const rx = RegExp(obj.regexp);
						if (!rx.test(val))
							throw `Input term ${val} is invalid.`;
						return obj.$(val);
					}
					return element.fromExpression(dgrm, obj.expr, false, uid);
				}
			},
			function(dgrm, expr, first, uid)
			{
				switch(expr.op)
				{
				case 'product':
					const op = Cat.basetypes.operators[expr.op];
					return expr.data.map(x => element.fromExpression(dgrm, x, false, uid));
				case 'coproduct':
					// TODO
					return;
				}
			},
			function(dgrm, expr, first, uid)
			{
				switch(expr.op)
				{
				case 'hom':
					++uid.uid;
					const row = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
					const name = row[0].dataset.name;
					return name;
				}
			},
			function(){},
			first, uid);
	}
	static isRunnable(dgrm, expr, first = true)
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first)
			{
				const dm = dgrm.getMorphism(expr.token);
				switch (dm.function)
				{
				case 'data':
				case 'One':
					return true;
				case 'compose':
					return dm.isRunnable();
				case 'productAssembly':
					return dm.morphisms.reduce((isRunnable, factor) => element.isRunnable(dgrm, factor.expr, false) && isRunnable, true);
				}
				return false;
			},
			function(dgrm, expr, first)
			{
				switch(expr.op)
				{
				case 'compose':
					return element.isRunnable(dgrm, expr.data[0], false);
				case 'product':
				case 'coproduct':
					let r = true;
					for(let i=0; i<expr.data.length; ++i)
						r &= element.isRunnable(dgrm, expr.data[i], false);
					return r;
				}
			},
			function(dgrm, expr, first)
			{
				return element.isRunnable(dgrm, expr.lhs, false) && element.isRunnable(dgrm, expr.rhs, false);
			},
			function(){},
			first);
	}
	static initialObject(dgrm, expr, first = true)
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first)
			{
				if (expr.token === 'One')
					return 0;
				throw 'No implementation';
			},
			function(dgrm, expr, first)
			{
				return expr.data.map((d, i) => element.initialObject(dgrm, expr.data[i], false));
			},
			function(dgrm, expr, first)	// binary
			{
			},
			function(){},
			first);
	}
	static getFactorBtnCode(dgrm, expr, first, data)	// data = {id, fname, root, action, index, [x]}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				const obj = dgrm.getObjectByExpr(expr);
				if ('token' in obj.expr)
					return H.button(obj.getText() + H.sub(data.index.join()), '', Cat.display.elementId(), '',
						`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().addFactor('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`);
				return element.getFactorBtnCode(dgrm, obj.expr, false, data);
			},
			function(dgrm, expr, first, data)
			{
				const op = Cat.basetypes.operators[expr.op];
				let html = '';
				for(let i=0; i<expr.data.length; ++i)
				{
					let subIndex = data.index.slice();
					subIndex.push(i);
					html += H.td(element.getFactorBtnCode(dgrm, expr.data[i], false, {fname:data.fname, root:data.root, index:subIndex, id:data.id, x:data.x, action:data.action}));
				}
				return H.table(H.tr(H.td(H.button(dgrm.getObjectByExpr(expr).getText() + H.sub(data.index.join()), '', Cat.display.elementId(), '',
							`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().addFactor('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`),
									'sidenav', '', '', `colspan="${expr.data.length}"`)) +
							H.tr(html));
			},
			function(dgrm, expr, first, data)
			{
				return H.button(dgrm.getObjectByExpr(expr).getText() + H.sub(data.index.join()), '', Cat.display.elementId(), '',
						`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().addFactor('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`);
			},
			function(){},
			first, data);
	}
	static makeRangeData(dgrm, expr, first, data)	// data = {i, start, dm}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				return data.start + data.i;
			},
			function(dgrm, expr, first, data)
			{
				const op = Cat.basetypes.operators[expr.op];
				return expr.data.map((x, i) => element.makeRangeData(dgrm, x, false, {i:data.i, start:data.start[i], dm:data.dm}));
			},
			function(dgrm, expr, first, data)
			{
				return null;
			},
			function(){},
			first, data);
	}
	static makeRandomData(dgrm, expr, first, data)	// data = {min, max, dm}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				const obj = dgrm.getObjectByExpr(expr);
				if ('token' in obj.expr)
					return data.dm.makeRandomValue(obj.expr, data.min, data.max);
				return element.makeRandomData(dgrm, obj.expr, false, data);
			},
			function(dgrm, expr, first, data)
			{
				return expr.data.map((x, i) => element.makeRandomData(dgrm, x, false, {min:data.min[i], max:data.max[i], dm:data.dm}));
			},
			function(dgrm, expr, first, data)
			{
				return null;
			},
			function(){},
			first, data);
	}
	static getExprFactor(expr, indices)
	{
		if (indices.length === 1 && indices[0] === -1)	// terminal object
			return null;
		let fctr = expr;
		for (let i=0; i<indices.length; ++i)
		{
			const j = indices[i];
			if ('data' in fctr)
				fctr = fctr.data[j];
			else if ('lhs' in fctr)
				fctr = j === 0 ? fctr.lhs : fctr.rhs;
		}
		return fctr;
	}
	static signature(cat, expr, first, data)	// data =
	{
		return element.expandExpression(cat, expr,
				/*
			function(cat, expr, first, data)
			{
				let obj = 'token' in expr ? cat.getObject(expr.token) : cat.getObjectByExpr(expr);
				if (obj)
					return obj.cid;
				throw 'bad expression for object signature';
			},
			*/
			function(dgrm, expr, first)
			{
				let obj = null;
				if (dgrm.subClass === 'diagram')
					obj = dgrm.getObject(expr.token, true);
				else
					obj = dgrm.getObjectByExpr(expr);
				if (obj)
				{
					if ('token' in obj.expr)
						return obj.cid;
					else
						return element.signature(dgrm, obj.expr, first, extended);
				}
				else if ('token' in expr)
					return obj.cid;
				throw 'no signature for expression';
			},
			function(cat, expr, first, data)
			{
				// TODO assumes associative due to sort()
				return Cat.sha256(expr.data.map((x, i) => element.signature(cat, x, false, null)).sort().join(''));
			},
			function(cat, expr, first, data)
			{
				return Cat.sha256(element.signature(cat, expr.lhs, false, null) + element.signature(cat, expr.rhs, false, null));
			},
			function(){},
			first, data);
	}
	static hasDiagramElement(dgrm, expr, first, data)	// data = null
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				return dgrm.isExprInDiagram(expr, dgrm);
			},
			function(dgrm, expr, first, data)
			{
				if (dgrm.isExprInDiagram(expr, dgrm))
					return true;
				return expr.data.reduce((v, f) => v || element.hasDiagramElement(dgrm, f, false, data));
			},
			function(dgrm, expr, first, data)
			{
				if (dgrm.isExprInDiagram(expr, dgrm))
					return true;
				return element.hasDiagramElement(dgrm, expr.lhs, false, data) || element.hasDiagramElement(dgrm, expr.rhs, false, data);
			},
			function(){},
			first, data);
	}
	makeSVG(group = true)
	{
		if ('x' in this)	// TODO make text class subclass element
		{
			if (this.html.indexOf('\n') > -1)
			{
				let lines = this.html.split('\n').map(t => `<tspan x="0" dy="1.2em">${t}</tspan>`);
				let html = group ? `<g id="${this.elementId()}" transform="translate(${this.x} ${this.y + Cat.default.font.height/2})">` : '';
				html +=
`<text data-type="element" data-name="${this.name}" x="0" y="0" text-anchor="left" class="${this.class} grabbable" onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'element')"> ${lines.join('')} </text>`;
				html += group ? '</g>' : '';
				return html;
			}
			else
			{
				if (isNaN(this.x) || isNaN(this.y))
					throw 'Nan!';
				return `<text data-type="element" data-name="${this.name}" text-anchor="middle" class="${this.class} grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + Cat.default.font.height/2}"
					onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'element')">${this.html}</text>`;
			}
		}
	}
	svg(sfx = '')
	{
		return document.getElementById(this.elementId() + (sfx !== '' ? sfx : ``));
	}
	removeSVG()
	{
		const svg = this.svg();
		if (svg !== null)
		{
			svg.innerHTML = '';
			svg.parentNode.removeChild(svg);
		}
	}
	elementId()
	{
		return `obj_${this.name}`;
	}
	update()
	{}
	updatePosition(xy)
	{
		this.setXY(D2.round(xy));
		const svg = this.svg();
		if (svg.hasAttribute('transform'))
			svg.setAttribute('transform', `translate(${xy.x} ${xy.y})`);
		else
		{
			svg.setAttribute('x', this.x);
			svg.setAttribute('y', this.y + ('h' in this ? this.h/2 : 0));
		}
	}
	showSelected(state = true)
	{
		this.svg().classList[state ? 'add' : 'remove']('selected');
	}
	editText(id, attr)
	{
		const h = document.getElementById(id);
		if (!this.readonly)
		{
			if (h.contentEditable === 'true')
			{
				Cat.getDiagram().updateElementAttribute(this, null, attr, h.innerText);
				h.contentEditable = false;
				this.update();
			}
			else
			{
				h.contentEditable = true;
				h.focus();
			}
		}
	}
	addSVG()
	{
		if (this.class === 'morphism')
			this.update();
		Cat.display.diagramSVG.innerHTML += typeof this === 'string' ? this : this.makeSVG();
	}
	isSquared()
	{
		if ('data' in this.expr && this.expr.data.length === 2 && this.expr.op === 'product')
		{
			const codes = this.expr.data.map(d => element.getCode(this.diagram, d, true, true));
			return codes[0] === codes[1];
		}
		return false;
	}
}

class object extends element
{
	constructor(cat, args)
	{
		super(cat, args);
		this.class = 'object';
		this.subClass = 'object';
		this.isTerminal = Cat.getArg(args, 'isTerminal', false);
		this.isInitial = Cat.getArg(args, 'isInitial', false);
		this.isFinite = Cat.getArg(args, 'isFinite', false) || (cat !== null ? (cat.allObjectsFinite ? 'n' : false) : false);
		if (this.code in Cat.basetypes.objects)
			this.basetype = Cat.basetypes.objects[this.code];
		if (cat !== null)
		{
			this.category = cat;
			this.code = this.code !== '' ? this.code : this.name;
			this.expr = cat.parseObject(this.code);
			this.code = element.getCode(cat, this.expr, true, true);
			if (this.name === '')
				this.name = element.codename(this.diagram === null ? this.category : this.diagram, this.expr);
			if (this.html === '')
				this.html = element.html(this.diagram === null ? this.category : this.diagram, this.expr, true, {class:'object', position:0});
			else
				element.html(this.diagram === null ? this.category : this.diagram, this.expr, true, {class:'object', position:0});
			this.h = Cat.getArg(args, 'h', Cat.default.font.height);
			if (!('subobject' in args))
			{
				if ((this.diagram !== null && !this.diagram.validateAvailableObject(this.name)) || cat.hasObject(this.name))
					throw `Object name ${this.name} is already taken.`;
				cat.addObject(this);
			}
		}
		else if ($Cat === null && this.name === 'Cat')	// bootstrap
			this.category = this;
		if (this.diagram !== null)
		{
			let obj = this.category.getObjectByExpr(this.expr);
			if (obj === null && this.diagram !== null)
				obj = this.diagram.getObjectByExpr(this.expr);
			if (obj !== null && !obj.isEquivalent(this))
			{
				const expr = obj.expr;
				if ('token' in expr)
				{
					if ('isFinite' in obj)
						this.isFinite = obj.isFinite;
				}
				else if ('op' in expr)
				{
					let isFinite = false;
					if ('data' in expr)
						isFinite = expr.data.reduce((isFinite, factor) => ('isFinite' in this.diagram.getObjectByExpr(factor)) && isFinite, true);
					else if ('lhs' in expr)
						isFinite = 'isFinite' in this.diagram.getObjectByExpr(expr.lhs) && 'isFinite' in this.diagram.getObjectByExpr(expr.rhs);
					if (isFinite)
						this.isFinite = 'n';	// TODO
				}
				else if ('lhs' in expr)
				{
					const lhs = this.diagram.getObjectByExpr(expr.op.lhs);
					const rhs = this.diagram.getObjectByExpr(expr.op.rhs);
					if (('isFinite' in lhs) && lhs.isFinite !== null && ('isFinite' in rhs) && rhs.isFinite !== null)
						this.isFinite = 'n';	// TODO
				}
			}
		}
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			if (Cat.debug)
				console.log('object.decrRefcnt delete',this.category.name,this.name);
			if (!('subobject' in this))
				this.category.objects.delete(this.name);
		}
	}
	isBaseType()
	{
		return 'basetype' in this;
	}
	hasRegexp()
	{
		return this.isBaseType() && 'regexp' in this.basetype;
	}
	getRegexp()
	{
		return ('basetype' in this && 'regexp' in this.basetype) ? this.basetype.regexp : '';
	}
	static process(cat, data, dgrm)
	{
		try
		{
			let r = null;
			switch(data.subClass)
			{
			case 'object':
				r = new object(cat, data);
				break;
			case 'diagramObject':
				const info = Cat.clone(data);
				info.digram = dgrm;
				r = new diagramObject(cat, info);
				break;
			default:
				break;
			}
			if (r)
				r.incrRefcnt();
			return r;
		}
		catch(e)
		{
			Cat.recordError(e);
		}
		return null;
	}
}

class diagramObject extends object
{
	constructor(cat, args)
	{
		const nuArgs = Cat.clone(args);
		nuArgs.diagram = 'diagram' in args && typeof args.diagram === 'object' ? args.diagram: null;
		nuArgs.name = Cat.getArg(args, 'name', cat.getAnon());
		super(cat, nuArgs);
		this.subClass = 'diagramObject';
	}
	incrRefcnt()	// TODO for debug; remove
	{
		super.incrRefcnt();
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.to.decrRefcnt();
			this.diagram.objects.delete(this);
		}
	}
	json()
	{
		let obj = super.json();
		if ('x' in this)
		{
			obj.x = this.x;
			obj.y = this.y;
		}
		obj.w = this.w;
		obj.h = this.h;
		return obj;
	}
	makeSVG()
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw 'Nan!';
		return `<text data-type="object" data-name="${this.name}" text-anchor="middle" class="object grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + Cat.default.font.height/2}"
			onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'object')">${this.to.getText()}</text>`;
	}
	getBBox()
	{
		return {x:this.x - this.w/2, y:this.y + this.h/2 - Cat.default.font.height, w:this.w, h:this.h};
	}
}

class category extends object
{
	constructor(args)
	{
		super($Cat, args);
		this.subClass = 'category';
		const attrs = ['hasProducts', 'hasCoproducts', 'isClosed', 'isCartesian', 'allObjectsFinite'];
		attrs.map(a => this[a] = Cat.getArg(args, a, false));
		this.parser = {};
		this.referenceDiagrams = Cat.getArg(args, 'referenceDiagrams', []);
		if ('subobject' in args)
		{
			const mainCat = $Cat.getObject(args.subobject);
			this.parsers = mainCat.parsers;
			attrs.map(a => this[a] = mainCat[a]);
			this.subobject = args.subobject;
		}
		else
			this.parsers = [this.makeParser('object'), this.makeParser('morphism')];
		try
		{
			this.parser.object = peg.generate(this.parsers[0]);
			this.parser.morphism = peg.generate(this.parsers[1]);
		}
		catch(e)
		{
			Cat.recordError(e);
		}
		this.objects = new Map();
		this.morphisms = new Map();
		this.transforms = new Map();
		this.username = Cat.getArg(args, 'user', Cat.user.name);
		if ($Cat === null)	// undefined at initialization
		{
			$Cat = this;
			$Cat.addObject($Cat);
			$Cat.expr = this.parseObject(args.code);
		}
		this.anonCount = 0;
		this.process(this.diagram, args);
	}
	clear()
	{
		this.objects.clear();
		this.morphisms.clear();
		this.transforms.clear();
		this.texts = [];
		this.anonCount =0;
	}
	process(dgrm, args)
	{
		let errMsg = '';
		if ('objects' in args)
			Object.keys(args.objects).forEach(function(key)
			{
				if (!this.hasObject(key))
				{
					try
					{
						const obj = object.process(this, args.objects[key], dgrm);
					}
					catch(x)
					{
						errMsg += x;
					}
				}
			}, this);
		if ('morphisms' in args)
			Object.keys(args.morphisms).forEach(function(key)
			{
				if (!this.hasMorphism(key))
				{
					try
					{
						const m = morphism.process(this, dgrm, args.morphisms[key]);
					}
					catch(x)
					{
						errMsg += x;
					}
				}
			}, this);
		if (errMsg != '')
			Cat.recordError(errMsg);
		for(const [key, m] of this.morphisms)
			if (m.subClass === 'dataMorphism')
				if ('recursor' in m && m.recursor !== null && typeof m.recursor === 'string')
					m.setRecursor(m.recursor);
	}
	json()
	{
		let cat = super.json();
		cat.hasProducts = this.hasProducts;
		cat.hasCoproducts = this.hasCoproducts;
		cat.isClosed = this.isClosed;
		cat.isCartesian = this.isCartesian;
		let objects = [];
		if (this.name === 'Cat')	// no infinite recursion on Cat
		{
			for(const [key, obj] of this.objects)
			{
				if (obj.name === 'Cat')
					return;
				objects.push(obj);
			}
			cat.objects = Cat.jsonAssoc(objects);
		}
		else
			cat.objects = Cat.jsonMap(this.objects);
		cat.morphisms = Cat.jsonMap(this.morphisms);
		cat.transforms = Cat.jsonMap(this.transforms);
		if ('subobject' in this)
			cat.subobject = this.subobject.name;
		cat.referenceDiagrams = this.referenceDiagrams.map(d => typeof d === 'string' ? d : d.name);
		cat.username = this.username;
		return cat;
	}
	hasObject(name)
	{
		return this.objects.has(name);
	}
	getObject(name, dgrm = null, extended=true)
	{
		if (name === null || name === '')
			return null;
		let obj = null;
		if (dgrm !== null)
		{
			dgrm = typeof dgrm === 'string' ? Cat.getDiagram(dgrm) : dgrm;
			if (dgrm !== null)
				obj = dgrm.getObject(name, extended);
			if (obj !== null)
				return obj;
		}
		obj = this.objects.has(name) ? this.objects.get(name) : null;
		if (obj !== null)
			return obj;
		if (extended)
		{
			let prsd = this.parseObject(name);
			let codeName = element.codename(this, prsd);
			obj = this.getObject(codeName, dgrm, false);
			if (obj !== null)
				return obj;
		}
		return null;
	}
	addObject(obj)
	{
		if (this.hasObject(obj.name))
			throw `Object name ${obj.name} already exists in category ${this.name}`;
		this.objects.set(obj.name, obj);
	}
	getObjectByArgs(name, args)
	{
		return this.getObject(name, 'diagram' in args ? args.diagram : null, true);
	}
	getObjectByExpr(expr)
	{
		return this.getObject(element.codename(this, expr));
	}
	hasMorphism(mName)
	{
		return this.morphisms.has(mName);
	}
	getMorphism(name, dgrmName = null)
	{
		let m = this.hasMorphism(name) ? this.morphisms.get(name) : null;
		if (m === null && dgrmName !== null)
		{
			const dgrm = typeof dgrmName === 'string' ? Cat.getDiagram(dgrmName) : dgrmName;
			if (dgrm !== null)
				m = dgrm.getMorphism(name);
		}
		return m;
	}
	addMorphism(m)
	{
		if (this.hasMorphism(m.name))
			throw `Morphism name ${m.name} already exists in category ${this.name}`;
		this.morphisms.set(m.name, m);
	}
	hasTransform(nm)
	{
		return this.transforms.has(nm);
	}
	getTransform(name)
	{
		return this.transforms.has(name) ? this.transforms.get(name) : null;
	}
	addTransform(trn)
	{
		if (this.transforms.has(trn.name))
			throw `Transform name ${trn.name} already exists in category ${this.getText()}`;
		this.transforms.set(trn.name, trn);
	}
	hasForm(ary)
	{
		let bad = {composite: false, source: false, sink: false, distinct: false};
		if (ary.length < 2)
			return bad;
		const elt = ary[0];
		if (elt.class !== 'morphism')
			return bad;
		const dom = elt.domain;
		const cod = elt.codomain;
		let compositeCod = elt.codomain;
		let good = {composite:true, source:true, sink:true, distinct: true};
		let foundObjects = {};
		for(let i=1; i<ary.length; ++i)
		{
			const elt = ary[i];
			if (elt.class !== 'morphism')
				return bad;
			good.source =	!elt.domain.isEquivalent(dom) ? false : good.source;
			good.sink =		!elt.codomain.isEquivalent(cod) ? false : good.sink;
			good.composite= !elt.domain.isEquivalent(compositeCod) ? false : good.composite;
			good.distinct = good.distinct && !(elt.domain in foundObjects) && !(elt.codomain in foundObjects);
			compositeCod = elt.codomain;
		}
		return good;
	}
	pullback(ary)
	{
		let r = {object:null, morphs:[]};
		if (this.hasForm(ary).sink)
		{
			r.object = new diagramObject(this, {diagram:this});
			r.object.incrRefcnt();
			r.morphs = ary.map(a => new morphism(this, {domain:r.object.name, codomain:a.codomain.name}));
			// TODO
		}
		return r;
	}
	getAnon(s = 'Anon')
	{
		while(true)
		{
			const name = `${s}${this.anonCount++}`;
			if (!this.hasObject(name) && !this.hasMorphism(name))
				return name;
		}
	}
	parseObject(code)
	{
		try
		{
			return this.parser.object.parse(code);
		}
		catch(e)
		{
			Cat.recordError(`Cannot parse object code: ${code}<br/>Message: ${Cat.getError(e)}`);
		}
	}
	parseMorphism(code)
	{
		try
		{
			return this.parser.morphism.parse(code);
		}
		catch(e)
		{
			Cat.recordError(`Cannot parse morphism code: ${code}<br/>Message: ${Cat.getError(e)}`);
		}
	}
	run(m, dgrm)
	{
		let data = m.morphisms[0];
		let dataOut = (m.codomain.name !== 'tty' && m.codomain.name !== 'threeD') ? dgrm.newDataMorphism(m.domain, m.codomain) : null;
		const elts = data.function === 'data' ? data.data : {0:data.$(element.initialObject(dgrm, m.domain.expr))};
		for(let i in elts)
		{
			let d = m.$(i);
			if (dataOut !== null)
				dataOut.data[i] = d;
		}
		return dataOut;
	}
	static homKey(domain, codomain)
	{
		return `${domain.name} ${codomain.name}`;
	}
	addHom(m)
	{
		const key = category.homKey(m.domain, m.codomain);
		if (!this.homSets.has(key))
			this.homSets.set(key, []);
		const a = this.homSets.get(key);
		a.push(m);
		const dualKey = category.homKey(m.codomain, m.domain);
		const dualLength = this.homSets.has(dualKey) ? this.homSets.get(dualKey).length -1 : 0;
		m.homSetIndex = a.length -1 + dualLength;
	}
	static addHomDir(obj2morphs, m, dir)
	{
		const key = dir === 'dom' ? m.domain : m.codomain;
		if (!obj2morphs.has(key))
			obj2morphs.set(key, {dom:[], cod:[]});
		const ms = obj2morphs.get(key);
		ms[dir].push(m);
	}
	addHomSets(homSets, obj2morphs)
	{
		for(const [key, m] of this.morphisms)
		{
			delete m.bezier;
			this.addHom(m);
			category.addHomDir(obj2morphs, m, 'dom');
			category.addHomDir(obj2morphs, m, 'cod');
		}
	}
	makeHomSets()
	{
		this.homSets = new Map();
		this.obj2morphs = new Map();
		this.addHomSets(this.homSets, this.obj2morphs);
	}
	makeParser(cls)
	{
		let p = `
start = Expression
Expression =
  sequence
`;
		p += this.isClosed ? this.getHom() : '';
		p += this.isCartesian ? '/ product\n' : '';
		p += this.hasCoproducts ? '/ coproduct\n' : '';
		p += `/ '(' expression:Expression ')'\n`;
		if (cls === 'object')
		{
			const terms = ['sequence', 'product', 'coproduct', 'Primary'];
			for (let i=0; i<terms.length -1; ++i)
				p += this.getOperatorParser(terms[i], terms[i+1]);
		}
		else
		{
			const terms = ['sequence', 'compose', 'product', 'coproduct', 'Primary'];
			for (let i=0; i<terms.length -1; ++i)
				p += this.getOperatorParser(terms[i], terms[i+1]);
		}
		p += this.getParserEnd('*+');
		return p;
	}
	getOperatorParser(op1, op2)
	{
		return `${op1} = head:${op2} _ tail:(_ '${Cat.basetypes.operators[op1].symCode}' _ ${op2})+
{
	let r = [head];
	for (let i=0; i<tail.length; ++i)
		r.push(tail[i][3]);
	return {op:'${op1}', data:${op1 === 'compose' ? 'r.reverse()' : 'r'}};
}
/ ${op2}
`
	}
	getHom()
	{
		return `Hom = lhs:Primary _ ',' _ rhs:Expression
{
	return {'lhs':lhs, 'op':'hom', 'rhs':rhs};
}
/ Primary
`;
	}
	getParserEnd(ops)		//?? TODO Drop operators?
	{
		let p = `
Provisioning = '{' _ x:Expression _ '}'
{
	return {'provision:':x};
}
Operator "operators" = arg:NameToken ':' op:[${ops}]*
{
	return {'arg':arg, 'operators':op};
}
/ NameToken
Primary = '(' expression:Expression ')'
{
	return expression;
}`;
	p += this.isClosed ? `
/ '[' _ expression:Hom _ ']'
{
	return expression;
}
` : '';
	p += `/ '{' _ Provisioning _ '}'
/ Operator
/ NameToken
NameToken = nameChar+
{
	return {token:text()};
}
nameChar = [@a-zA-Z0-9$_-]
_ "optional white space" = ws*
ws "white space" = [ \t\\r\\n]+
	`;
		return p;
	}
	isNumeric(obj)
	{
		switch(obj.code)
		{
		case 'N':
		case 'Z':
		case 'F':
			return true;
		}
		return true; // TODO everything cannot be numeric
	}
	static fetchReferenceDiagrams(cat, fn)
	{
		const dgrms = cat.referenceDiagrams.filter(d => !Cat.getDiagram(d));
		const refs = {};
		for (const d in Cat.diagrams)
			refs[d] = true;
		if (dgrms.length > 0)
			Cat.Amazon.fetchDiagramJsons(dgrms, function(jsons)
			{
				jsons.map(j =>
				{
					const dgrm = new diagram(j);
					dgrm.saveToLocalStorage();
				});
				if (fn)
					fn(jsons);
				return jsons;
			}, [], refs);
		else if (fn)
			fn([]);
	}
	rename(nuName)	// only for diagram's domain category
	{
		const olName = this.name;
		this.name = nuName;
		this.code = nuName;
		this.html = nuName;
		this.expr.token = nuName; // TODO recompute width
	}
}

class morphism extends element
{
 	constructor(cat, args, level)
	{
		super(cat, args);
		this.class = 'morphism';
		this.subClass = 'morphism';
		this.domain = typeof args.domain === 'string' ? cat.getObject(args.domain, this.diagram) : args.domain;
		if (this.domain === null)
			throw `Domain ${args.domain} does not exist in category ${cat.getText()}`;
		this.domain.incrRefcnt();
		this.codomain = typeof args.codomain === 'string' ? cat.getObject(args.codomain, this.diagram) : args.codomain;
		if (this.codomain === null)
			throw `Codomain ${args.codomain} does not exist in category ${cat.getText()}`;
		this.codomain.incrRefcnt();
		this.category = cat;
		this.arrowType = 'standard';	// TODO mono, epi, ...
		this.code = this.code !== '' ? this.code : this.name;
		try
		{
			this.expr = cat.parseMorphism(this.code);
			if (this.name === '')
				this.name = element.codename(this.diagram === null ? this.category : this.diagram, this.expr);
		}
		catch(e)
		{
			throw `Cannot parse code [${this.code}]: ${Cat.getError(e)}`;
		}
		if ((this.diagram !== null && !this.diagram.validateAvailableMorphism(this.name)) || cat.hasMorphism(this.name))
			throw `Morphism name ${this.name} is already taken.`;
		if (this.html === '' && this.code !== '')
			this.html = element.html(this.diagram === null ? this.category : this.diagram, this.expr, true, {class:'morphism', position:0});
		if ('function' in args)
			this.setFunction(args.function);
		else if ('functor' in args)
		{
			if (args.functor in CatFns.functor)
			{
				this.functor = args.functor;
				this.$ = CatFns.functor[args.functor];
			}
			else
				throw `Transform not available: ${Cat.htmlSafe(args.transform)}`;
		}
		else if ('transform' in args)
		{
			if (args.transform in CatFns.transform)
			{
				this.transform = args.transform;
				this.$ = CatFns.transform[args.transform];
			}
			else
				throw `Transform not available: ${Cat.htmlSafe(args.transform)}`;
		}
		if (typeof level === 'undefined')
			cat.addMorphism(this);
		else if (level === 'transform')
			cat.addTransform(this);
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.domain.decrRefcnt();
			this.codomain.decrRefcnt();
			if (Cat.debug)
				console.log('morphism.decrRefcnt delete',this.category.name,this.name);
			this.category.morphisms.delete(this.name);
			if ('stringMorphism' in this)
			{
				this.stringMorphism.decrRefcnt();
				stringMorphism.removeStringSvg(this);
			}
		}
	}
	incrRefcnt()	// TODO debug only
	{
		super.incrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.domain =	this.domain.name;
		mor.codomain =	this.codomain.name;
		mor.function =	this.function;
		return mor;
	}
	js(close = true)
	{
		let code =
`		// ${this.html}
		this.morphisms.set('${this.name}',
		{
			name:	'${this.name}',
			$:		CatFns.function['${this.function}'],
`;
		if ('morphisms' in this)
			code +=
`			morphisms:[${this.morphisms.map(m => "this.getMorphism('" + m.name + "')").join()}],
`;
		if (close)
			code += '		});\n';
		if ('recursor' in this)
			code +=
`			updateRecursor:	function()
			{
				if (typeof this.recursor === 'string')
					this.recursor = Cat.getDiagram().getMorphism(this.recursor);
			},
`;
		return code;
	}
	isRunnable()
	{
		return this.diagram !== null ? element.isRunnable(this.diagram, this.expr, true) : false;
	}
	setFunction(fn)
	{
		if (fn in CatFns.function)
		{
			this.function = fn;
			this.$ = CatFns.function[fn];
		}
		else
		{
			this.function = 'unknown';
			this.$ = CatFns.function.unknown;
		}
	}
	static process(cat, dgrm, data)
	{
		try
		{
			switch(data.subClass)
			{
			case 'diagramMorphism':
				const info = Cat.clone(data);
				info.diagram = dgrm;
				return new diagramMorphism(cat, info);
				break;
			case 'composite':
				return new composite(cat, data);
				break;
			case 'dataMorphism':
				return new dataMorphism(cat, data);
				break;
			case 'coproductMorphism':
				return new coproductMorphism(dgrm, data);
				break;
			case 'coproductAssemblyMorphism':
				return new coproductAssemblyMorphism(dgrm, data);
				break;
			case 'productMorphism':
				return new productMorphism(dgrm, data);
				break;
			case 'productAssemblyMorphism':
				return new productAssemblyMorphism(dgrm, data);
				break;
			case 'factorMorphism':
				return new factorMorphism(dgrm, data);
				break;
			case 'curryMorphism':
				return new curryMorphism(dgrm, data);
				break;
			default:
				return new morphism(cat, data);
				break;
			}
		}
		catch(e)
		{
			Cat.recordError(e);
		}
	}
	hasMorphism(mor, start = true)
	{
		if (!start && this.isEquivalent(mor))
			return true;
		if ('morphisms' in this)
			for (let i=0; i<this.morphisms.length; ++i)
				if (this.morphisms[i].hasMorphism(mor, false))
					return true;
		return false;
	}
	domCodExpr()
	{
		return $Cat.parseObject(`${this.domain.code},${this.codomain.code}`);
	}
}

class diagramMorphism extends morphism
{
	constructor(cat, args)
	{
		const nuArgs = Cat.clone(args);
		nuArgs.diagram = 'diagram' in args && typeof args.diagram === 'object' ? args.diagram: null;
		nuArgs.name = Cat.getArg(args, 'name', cat.getAnon());
		super(cat, nuArgs);
		this.to = null;
		this.subClass = 'diagramMorphism';
		this.start = Cat.getArg(args, 'start', {x:0, y:0});
		this.end = Cat.getArg(args, 'end', {x:100, y:0});
		this.angle = Cat.getArg(args, 'angle', 0.0);
		if ('morphisms' in args)
		{
			this.morphisms = args.morphisms.map(m => typeof m === 'string' ? this.category.getMorphism(m) : m);
			this.morphisms.map(m => m.incrRefcnt());
		}
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0 && this.to)
		{
			this.to.decrRefcnt();
			this.diagram.morphisms.delete(this);
			if (this.domain.refcnt === 1)
				this.domain.decrRefcnt();
			if (this.codomain.refcnt === 1)
				this.codomain.decrRefcnt();
			if ('morphisms' in this)
				this.morphisms.map(m => m.decrRefcnt());
		}
	}
	json()
	{
		let mor = super.json();
		if ('start' in this)
		{
			mor.start = this.start;
			mor.end = this.end;
			mor.angle = this.angle;
		}
		if ('morphisms' in this)
			mor.morphisms = this.morphisms.map(m => m.name);
		return mor;
	}
	getNameOffset()
	{
		let mid = 'bezier' in this ? this.bezier.cp2 : D2.scale(0.5, D2.add(this.start, this.end));
		let normal = D2.norm(D2.normal(D2.subtract(this.codomain, this.domain)));
		if (normal.y > 0.0)
			normal.y *= 0.5;
		return D2.add(mid, D2.scale(-Cat.default.font.height, normal));
	}
	makeSVG()
	{
		const off = this.getNameOffset();
		let svg = `
<g id="${this.elementId()}">
<path data-type="morphism" data-name="${this.name}" class="${this.to.function !== 'unknown' ? 'morphism' : 'unknownMorph'} grabbable" id="${this.elementId()}_path" d="M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}"
onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')" marker-end="url(#arrowhead)"/>
<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_name'}" x="${off.x}" y="${off.y}"
	onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')">${this.to.getText()}</text>`;
		if (this.to.subClass === 'composite' && 'morphisms' in this)
		{
			const xy = Cat.barycenter(this.morphisms);
			if (isNaN(xy.x) || isNaN(xy.y))
				throw 'Nan!';
			svg += `<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_comp'}" x="${xy.x}" y="${xy.y}"
	onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')">${Cat.default.composite}</text></g>`;
		}
		svg += '</g>';
		return svg;
	}
	elementId()
	{
		return `mor_${this.name}`;
	}
	showSelected(state = true)
	{
		this.svg('_path').classList[state ? 'add' : 'remove']('selected');
		this.svg('_name').classList[state ? 'add' : 'remove']('selected');
		const svg = this.svg('_comp');
		if (svg)
			svg.classList[state ? 'add' : 'remove']('selected');
	}
	showFusible(state = true)
	{
		this.showSelected(!state);
		this.svg('_path').classList[!state ? 'add' : 'remove']('grabbable','morphism');
		this.svg('_path').classList[state ? 'add' : 'remove']('fusible');
		this.svg('_name').classList[state ? 'add' : 'remove']('fusible');
	}
	updateDecorations()
	{
		const off = this.getNameOffset();
		const svg = this.svg('_name');
		svg.setAttribute('x', off.x);
		svg.setAttribute('y', off.y);
		let anchor = 'middle';
		const angle = this.angle;
		const bnd = Math.PI/12;
		if (angle > Math.PI + bnd && angle < 2 * Math.PI - bnd)
			anchor = 'end';
		else if (angle > bnd && angle < Math.PI - bnd)
			anchor = 'start';
		svg.setAttribute('text-anchor', anchor);
		if (this.to.subClass === 'composite' && 'morphisms' in this)
		{
			const compSvg = this.svg('_comp');
			const xy = Cat.barycenter(this.morphisms);
			if (isNaN(xy.x) || isNaN(xy.y))
				throw 'NaN!';
			compSvg.setAttribute('x', xy.x);
			compSvg.setAttribute('y', xy.y);
		}
	}
	getBBox()
	{
		let r =
		{
			x:	Math.min(this.start.x + ('bezier' in this ? this.bezier.offset.x : 0), this.end.x),
			y:	Math.min(this.start.y + ('bezier' in this ? this.bezier.offset.y : 0), this.end.y),
			w:	Math.abs(this.start.x - this.end.x),
			h:	Math.abs(this.start.y - this.end.y),
		};
		if (r.w === 0.0)
		{
			r.w = fontHeight = Cat.default.font.height;
			r.x += r.w/2;
		}
		else if (r.h === 0.0)
		{
			r.h = r.w;
			r.y -= r.w/2;
		}
		return r;
	}
	predraw()
	{
		const domBBox = this.domain.getBBox();
		const codBBox = this.codomain.getBBox();
		const deltaX = this.codomain.x - this.domain.x;
		const deltaY = this.codomain.y - this.domain.y;
		let start = {x:0, y:0};
		let end = {x:0, y:0};
		if (deltaX === 0)
		{
			if (deltaY > 0)
			{
				start = D2.round(diagram.intersect(this, domBBox, 'bottom'));
				end = D2.round(diagram.intersect(this, codBBox, 'top'));
			}
			else
			{
				start = D2.round(diagram.intersect(this, domBBox, 'top'));
				end = D2.round(diagram.intersect(this, codBBox, 'bottom'));
			}
		}
		else if (deltaY === 0)
		{
			if (deltaX > 0)
			{
				start = D2.round(diagram.intersect(this, domBBox, 'right'));
				end = D2.round(diagram.intersect(this, codBBox, 'left'));
			}
			else
			{
				start = D2.round(diagram.intersect(this, domBBox, 'left'));
				end = D2.round(diagram.intersect(this, codBBox, 'right'));
			}
		}
		else
		{
			start = D2.round(diagram.closest(this, domBBox, this.codomain));
			end = D2.round(diagram.closest(this, codBBox, this.domain));
		}
		this.angle = Cat.getAngle(deltaX, deltaY);
		this.start = start;
		this.end = end;
		this.adjustByHomSet();
		return end !== false;
	}
	adjustByHomSet()
	{
		const i = this.homSetIndex;
		if (i > 0)
		{
			const midpoint = {x:(this.start.x + this.end.x)/2, y:(this.start.y + this.end.y)/2};
			const normal = D2.norm(D2.normal(D2.subtract(this.end, this.start)));
			const band = Math.trunc(i/2);
			let v = D2.scale(2 * Cat.default.font.height * (band+1), normal);
			v = i % 2 > 0 ? D2.scale(-1, v) : v;
			const w = D2.scale(10 * ((i % 2) + 1) * (i % 2 ? -1 : 1), normal);
			this.start = D2.round(D2.add(w, this.start));
			this.end = D2.round(D2.add(w, this.end));
			let cp1 = D2.round(D2.add(v, midpoint));
			let cp2 = D2.round(D2.add(v, midpoint));
			this.bezier = {cp1, cp2, index:i, offset:v};
		}
		else
			delete this.bezier;
	}
	update(dgrm)
	{
		this.predraw();
		const svg = this.svg('_path');
		if (svg !== null && typeof this.start.x !== 'undefined')
		{
			if ('bezier' in this)
				svg.setAttribute('d', `M${this.start.x},${this.start.y} C${this.bezier.cp1.x},${this.bezier.cp1.y} ${this.bezier.cp2.x},${this.bezier.cp2.y} ${this.end.x},${this.end.y}`);
			else
				svg.setAttribute('d', `M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}`);
			this.updateDecorations();
		}
		if (document.getElementById(stringMorphism.graphId(this)))
			stringMorphism.update(dgrm, this);
	}
}

class composite extends morphism
{
 	constructor(cat, args, level)
	{
		if (args.morphisms.length <= 1)
			throw 'Not enough morphisms to compose.';
		let nuArgs = Cat.clone(args);
		const morphisms = args.morphisms.map(m => (typeof m === 'string' ? cat.getMorphism(m, args.diagram) : m));
		for (let i=0; i<morphisms.length; ++i)
			if (morphisms[i] === null)
				throw `Cannot find morphism ${args.morphisms[i]}`;
		nuArgs.code = Cat.basetypes.operators.compose.toCode(morphisms.map(m => m.name));
		nuArgs.function = 'compose';
		super(cat, nuArgs);
		this.subClass = 'composite';
		this.morphisms = morphisms;
		this.morphisms.map(m => m.incrRefcnt());
		this.html = this.html === '' ? element.html(this.diagram === null ? cat : this.diagram, this.expr, true, {class:'morphism', position:0}) : this.html;
		if (!('description' in args))
			this.Description = Cat.textify('The composite of ', this.morphisms, true);
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.morphisms.map(m => m.decrRefcnt());
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
	isRunnable()
	{
		return element.isRunnable(this.diagram, this.morphisms[0].expr);
	}
}

class dataMorphism extends morphism
{
 	constructor(cat, args)
	{
		const dgrm = Cat.getDiagram(args.diagram);
		const dom = dgrm.getObject(args.domain);
		let nuArgs = Cat.clone(args);
		if (nuArgs.function !== 'recurse')
			nuArgs.function = 'data';
		super(cat, nuArgs);
		this.subClass = 'dataMorphism';
		this.data = Cat.getArg(args, 'data', {});
		if (!(('isFinite' in this.domain) && this.domain.isFinite))
			throw 'Data domain is not finite.';
		if (this.isFinite === 0)
			throw 'Data domain is initial object.';
		if ('recursor' in args)
			this.setRecursor(args.recursor);
		else
			this.recursor = null;
		this.ranges = Cat.getArg(args, 'ranges', []);
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0 && this.recursor)
			this.recursor.decrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.data = this.data;
		if (this.recursor !== null)
			mor.recursor = typeof this.recursor === 'object' ? this.recursor.name : this.recursor;
		mor.ranges = this.ranges;
		return mor;
	}
	setRecursor(r)
	{
		const rcrs = typeof r === 'string' ? this.category.getMorphism(r) : r;
		if ('recursor' in this && this.recursor !== null && typeof this.recursor !== 'string')
			this.recursor.decrRefcnt();
		if (rcrs !== null)
		{
			if (!rcrs.hasMorphism(this))
				throw `The data morphism ${this.html} does not refer to itself so no recursion.`;
			this.recursor = rcrs;
			this.recursor.incrRefcnt();
			this.setFunction('recurse');
		}
		else
			this.recursor = r;
	}
	updateRecursor()
	{
		if (typeof this.recursor === 'string')
		{
			const r = this.category.getMorphism(this.recursor);
			if (typeof r === 'object')
				this.recursor = r;
		}
	}
	static checkEditableObject(dgrm, obj)
	{
		return 'token' in dgrm.getObjectByExpr(obj.expr).expr;
	}
	static checkEditable(dgrm, x)
	{
		const expr = dgrm.getObjectByExpr(x).expr;
		if ('token' in expr && expr.token in Cat.basetypes.objects)
			return Cat.basetypes.objects[expr.token].editable;
		else if ('op' in expr && expr.op == 'product')
		{
			for (let i=0; i<expr.data.length; ++i)
				if (!dataMorphism.checkEditable(dgrm, expr.data[i]))
					return false;
		}
		return true;
	}
	upperLimit()
	{
		return this.domain.isFinite === 'n' ? Number.MAX_SAFE_INTEGER : this.domain.isFinite;
	}
	addData()
	{
		const i = Math.min(this.upperLimit(), document.getElementById('inputTerm').value);
		const elt = element.fromExpression(this.diagram, this.codomain.expr, true, {uid:0, idp:'data'});
		this.data[i] = elt;
	}
	addRange()
	{
		const startIndex = Math.min(this.upperLimit(), Number.parseInt(document.getElementById('startTerm').value));
		const count = Math.min(this.upperLimit(), Number.parseInt(document.getElementById('rangeTerm').value));
		// TODO convert to this.ranges
		const startValue = element.fromExpression(this.diagram, this.codomain.expr, true, {uid:0, idp:'strt'});
		for (let i=0; i<count; ++i)
			this.data[startIndex + i] = element.makeRangeData(this.diagram, this.codomain.expr, true, {i, start:startValue, dm:this});
		this.ranges.push({startIndex, count, startValue});
	}
	makeRandomValue(expr, min, max)
	{
		// TODO fix 'N'
		// TODO what to do for 'Str'?
		return expr.token in Cat.basetypes.objects ? Cat.basetypes.objects[expr.token].random(min,max) : Cat.basetypes.objects['N'].random(min,max);
	}
	addRandomData()
	{
		const inputStartIdx = Math.min(this.upperLimit(), Number.parseInt(document.getElementById('inputStartIdx').value));
		const inputEndIdx = Math.min(this.upperLimit(), Number.parseInt(document.getElementById('inputEndIdx').value));
		const min = element.fromExpression(this.diagram, this.codomain.expr, true, {uid:0, idp:'min'});
		const max = element.fromExpression(this.diagram, this.codomain.expr, true, {uid:0, idp:'max'});
		for (let i=inputStartIdx; i <= inputEndIdx; ++i)
			this.data[i] = element.makeRandomData(this.diagram, this.codomain.expr, true, {min, max, dm:this});
	}
	deleteData(term)
	{
		delete this.data[term];
		Cat.getDiagram().update(null, 'data');
	}
	editData(term)
	{
		Cat.getDiagram().update(null, 'data');
	}
	clear()
	{
		this.data = [];
	}
	hasSelfMorph()
	{
		const expr = dgrm.getObjectByExpr(this.domain).expr;
		if ('token' in expr && expr.token in Cat.basetypes.objects && expr.token === 'N')
			for(const [m1, m2] of this.diagram.morphisms)
				if (m2.subClass === 'composite' && ms.hasMorphism(this))
					return true;
		return false;
	}
	js()
	{
		let code = super.js(false);
		code +=
`
			data:${JSON.stringify(this.data)},
`;
		if (this.recursor !== null)
			code += `
			recursor:'${typeof this.recursor === 'string' ? this.recursor : this.recursor.name}',
`;
		code += '		});\n';
		return code;
	}
}

class productAssemblyMorphism extends morphism
{
	constructor(dgrm, args)
	{
		if (args.morphisms.length < 2)
			throw 'Product assembly morphisms need two or more elements.';
		const morphisms = args.morphisms.map(m => dgrm.getMorphism(m));
		const d = productAssemblyMorphism.form(morphisms);
		let codomain = dgrm.getObjectByCode(d.code);
		if (codomain === null)
			codomain = dgrm.newObject({code:d.code});
		let nuArgs = Cat.clone(args);
		nuArgs.codomain = codomain.name;
		nuArgs.name = d.name;
		nuArgs.diagram = dgrm.name;
		nuArgs.function = 'productAssembly';
		super(dgrm.codomain, nuArgs);
		this.subClass = 'productAssemblyMorphism';
		this.morphisms = morphisms;
		this.morphisms.map(m => m.incrRefcnt());
		this.html = d.html;
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
	static form(morphisms)
	{
		return {name:	`-A--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--A-`,
				html:	`(${morphisms.map(m => m.getText()).join(',')})`,
				code:	morphisms.map(m => Cat.parens(m.codomain.code, Cat.basetypes.parens.left.symCode, Cat.basetypes.parens.right.symCode, false)).join(Cat.basetypes.operators.product.symCode)};
	}
}

class coproductAssemblyMorphism extends morphism
{
	constructor(dgrm, args)
	{
		if (args.morphisms.length < 2)
			throw 'Coproduct assembly morphisms need two or more elements.';
		const morphisms = args.morphisms.map(m => dgrm.getMorphism(m));
		const d = coproductAssemblyMorphism.form(morphisms);
		let domain = dgrm.getObjectByCode(d.code);
		if (domain === null)
			domain = dgrm.newObject({code:d.code});
		let nuArgs = Cat.clone(args);
		nuArgs.domain = domain.name;
		nuArgs.name = d.name;
		nuArgs.diagram = dgrm.name;
		nuArgs.function = 'coproductAssembly';
		super(dgrm.codomain, nuArgs);
		this.subClass = 'coproductAssemblyMorphism';
		this.morphisms = morphisms;
		this.morphisms.map(m => m.incrRefcnt());
		this.html = d.html;
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
	static form(morphisms)
	{
		return {name:	`-A--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--A-`,
				html:	`(${morphisms.map(m => m.getText()).join(',')})`,
				code:	morphisms.map(m => m.domain.code).join(Cat.basetypes.operators.coproduct.symCode)};	// TODO parens?
	}
}

class factorMorphism extends morphism
{
	constructor(dgrm, args)
	{
		const d = factorMorphism.form(dgrm, typeof args.domain === 'object' ? args.domain : dgrm.getObject(args.domain), args.factors);
		let codomain = dgrm.getObjectByCode(d.code);
		if (codomain === null)
			codomain = dgrm.newObject({code:d.code});
		let nuArgs = Cat.clone(args);
		nuArgs.name = d.name;
		nuArgs.codomain = codomain.name;
		nuArgs.diagram = dgrm.name;
		nuArgs.function = 'factor';
		super(dgrm.codomain, nuArgs);
		this.subClass = 'factorMorphism';
		this.factors = args.factors;
		this.html = 'html' in args ? args.html : d.html;
	}
	json()
	{
		let mor = super.json();
		mor.factors = this.factors;
		return mor;
	}
	static form(dgrm, domain, factors)
	{
		let fctrs = [];
		let name = '-R--';
		let html = '&lt;';
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = dgrm.getFactor(domain, ...indices);
			fctrs.push(`(${f.code})`);
			if (f.name !== 'One')
			{
				name += f.name + '-' + indices.join('-');
				html += `<tspan>${f.getText()}</tspan>` + Cat.subscript(...indices);
			}
			else
			{
				name += f.name;
				html += `<tspan>${f.getText()}</tspan>`;
			}
			if (i !== factors.length -1)
			{
				name += Cat.basetypes.comma.nameCode;
				html += Cat.basetypes.comma.sym;
			}
		}
		html += '&gt;';
		name += '--R-';
		return {name, html, code:fctrs.join(Cat.basetypes.operators.product.symCode)};	/// TODO code
	}
	js(className)
	{
		let code = super.js(className, false);
		code +=
`			factors:${JSON.stringify(this.factors)},
		});
`
		return code;
	}
}

class curryMorphism extends morphism
{
	constructor(dgrm, args)
	{
		const preCurry = typeof args.preCurry === 'object' ? args.preCurry : dgrm.getMorphism(args.preCurry);
		const data = curryMorphism.form(dgrm, preCurry, args.domFactors, args.homFactors, args.includeCodDom);
		let nuArgs = Cat.clone(args);
		nuArgs.name = data.name;
		nuArgs.domain = dgrm.getObjectByCode(data.domCode);
		nuArgs.codomain = dgrm.newObject({code:`[${data.homCode},${preCurry.codomain.code}]`});
		nuArgs.diagram = dgrm;
		nuArgs.function = 'lambda';
		super(dgrm.codomain, nuArgs);
		this.subClass = 'curryMorphism';
		this.html = 'html' in args ? args.html : data.html;
		this.preCurry = data.preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = data.domFactors;
		this.homFactors = data.homFactors;
		const domPermutation = data.domFactors.map(f => f[1]);
		const homPermutation = data.homFactors.map(f => f[1]);
		const centralDomain = dgrm.newObject({code:`${data.homCode}*${data.domCode}`});
		this.factors = dgrm.addFactorMorphism(centralDomain, [homPermutation, domPermutation]);
		this.Description = 'description' in args ? args.description : `The currying of the morphism ${this.preCurry.getText()} by the factors ${this.homFactors.toString()}`;
	}
	json()
	{
		let mor = super.json();
		mor.preCurry = this.preCurry.name;
		mor.domFactors = this.domFactors;
		mor.homFactors = this.homFactors;
		return mor;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.preCurry.decrRefcnt();
	}
	static factorName(dgrm, fctr, dom, cod)
	{
		const idx = fctr[1];
		return fctr[0] === 0 ? `-Do-${dgrm.getFactor(dom, idx).name}-${idx}` : `-Co-${dgrm.getFactor(cod, idx).name}-${idx}`;
	}
	static getFactorsName(dgrm, factors, expr, data)
	{
		for (let i=0; i<factors.length; ++i)
		{
			const f = factors[i];
			const fx = element.getExprFactor(expr, f);
			const fo = dgrm.getObjectByExpr(fx);
			data.name += fo.name;
			data.html += `<tspan>${fo.getText()}</tspan>` + Cat.subscript(f[1]);
			if (i !== factors.length -1)
			{
				data.name += Cat.basetypes.comma.nameCode;
				data.html += Cat.basetypes.comma.sym;
			}
		}
	}
	static form(dgrm, preCurry, domFactors, homFactors, includeCodDom = true)
	{
		let fctrs = [];
		const dom = preCurry.domain;
		const cod = preCurry.codomain;
		const data = {name:`-L--${preCurry.name}${Cat.basetypes.comma.nameCode}--`, html:`&#955;.${preCurry.getText()}&lt;`};
		const expr = preCurry.domCodExpr();
		curryMorphism.getFactorsName(dgrm, domFactors, expr, data);
		data.name += '--';
		data.html += ':';
		curryMorphism.getFactorsName(dgrm, homFactors, expr, data);
		data.html += '&gt;';
		data.name += '--C-';
		data.domCode = domFactors.map(f => element.getCode(dgrm, element.getExprFactor(expr, f))).join(Cat.basetypes.operators.product.symCode);
		data.homCode = homFactors.map(f => element.getCode(dgrm, element.getExprFactor(expr, f))).join(Cat.basetypes.operators.product.symCode);
		data.preCurry = preCurry;
		data.domFactors = domFactors.map(f => [f[0], f[1]]);
		data.homFactors = homFactors.map(f => [f[0], f[1]]);
		return data;
	}
	js(className)
	{
		let code =
`//			domFactors:${JSON.stringify(this.domFactors)},
//			homFactors:${JSON.stringify(this.homFactors)},
			factors:${JSON.stringify(this.factors)},
			preCurry:${this.preCurry.name},
		};
`
		return code;
	}
}

class productMorphism extends morphism
{
	constructor(dgrm, args)
	{
		if (args.morphisms.length < 2)
			throw 'Product morphisms need two or more elements.';
		const morphisms = args.morphisms.map(m => (typeof m === 'string' ? dgrm.getMorphism(m) : m));
		const data = productMorphism.form(dgrm, morphisms);
		const domain = dgrm.newObject({code:morphisms.map(m =>
		{
			return Cat.parens(m.domain.code, Cat.basetypes.parens.left.symCode, Cat.basetypes.parens.right.symCode, false);
		}).join(Cat.basetypes.operators.product.symCode)});
		const codomain = dgrm.newObject({code:morphisms.map(m =>
		{
			return Cat.parens(m.codomain.code, Cat.basetypes.parens.left.symCode, Cat.basetypes.parens.right.symCode, false);
		}).join(Cat.basetypes.operators.product.symCode)});
		let nuArgs = Cat.clone(args);
		nuArgs.domain = domain;
		nuArgs.codomain = codomain;
		nuArgs.diagram = dgrm;
		nuArgs.function = 'product';
		nuArgs.code = data.code;
		super(dgrm.codomain, nuArgs);
		this.subClass = 'productMorphism';
		this.morphisms = morphisms;
		this.morphisms.map(m => m.incrRefcnt());
		if (!('description' in args))
			this.Description = Cat.textify('Product of', morphisms);
		this.html = 'html' in args ? args.html : data.html;
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
	static form(dgrm, morphisms)
	{
		const code = '(' + morphisms.map(m => m.name).join(')*(') + ')';
		const expr = dgrm.codomain.parseObject(code);
		return {
			html:element.html(dgrm, expr, true, {class:'morphism', position:0}),	// data: class, position
			code:element.getCode(dgrm, expr, true, true),
			name:element.codename(dgrm, expr),
		};
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.morphisms.map(m => m.decrRefcnt());
	}
}

class coproductMorphism extends morphism
{
	constructor(dgrm, args)
	{
		if (args.morphisms.length < 2)
			throw 'Coproduct morphisms need two or more elements.';
		const morphisms = args.morphisms.map(m => (typeof m === 'string' ? dgrm.getMorphism(m) : m));
		const domain = dgrm.newObject({code:morphisms.map(m =>
		{
			m.domain.incrRefcnt();
			return m.domain.name;
		}).join(Cat.basetypes.operators.coproduct.symCode)});
		const codomain = dgrm.newObject({code:morphisms.map(m =>
		{
			m.codomain.incrRefcnt();
			return m.codomain.name;
		}).join(Cat.basetypes.operators.coproduct.symCode)});
		let nuArgs = Cat.clone(args);
		nuArgs.domain = domain;
		nuArgs.codomain = codomain;
		nuArgs.diagram = dgrm;
		nuArgs.function = 'coproduct';
		nuArgs.code = morphisms.map(m => m.name).join(Cat.basetypes.operators.coproduct.symCode);
		super(dgrm.codomain, nuArgs);
		this.subClass = 'coproductMorphism';
		this.morphisms = morphisms;
		this.morphisms.map(m => m.incrRefcnt());
		if (!('description' in args))
			this.Description = Cat.textify('Coproduct of', morphisms);
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
	static form(morphisms)
	{
		return {name:	`-p--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--p-`,
				html:	`(${morphisms.map(m => m.getText()).join(',')})`,
				code:	morphisms.map(m => m.codomain.name).join(Cat.basetypes.operators.product.symCode)};	/// TODO code
	}
}

class stringMorphism extends morphism
{
	constructor(dgrm, m)
	{
		super(dgrm.graphCat, {domain:m.domain, codomain:m.codomain, name:m.name, diagram:null});
		this.diagram = dgrm;
		this.graph = m.domCodExpr();
		if ('function' in m)
			stringMorphism.tagGraph(this.diagram, this.graph, true, m.function);
	}
	static bindGraph(dgrm, expr, first, data)	// data: {cod, link, function, domRoot, codRoot}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				const domRoot = data.domRoot.slice();
				const codRoot = data.codRoot.slice();
				domRoot.push(...data.link);
				codRoot.push(...data.link);
				Cat.arraySet(expr, 'links', codRoot);
				Cat.arraySet(data.cod, 'links', domRoot);
				Cat.arrayInclude(expr, 'functions', data.function);
				Cat.arrayInclude(data.cod, 'functions', data.function);
			},
			function(dgrm, expr, first, data)
			{
				for(let i=0; i<expr.data.length; ++i)
				{
					let subIndex = data.link.slice();
					subIndex.push(i);
					const e = expr.data[i];
					const args = Cat.clone(data);
					args.link = subIndex;
					args.cod = data.cod.data[i];
					stringMorphism.bindGraph(dgrm, e, false, args);
				}
			},
			function(dgrm, expr, first, data)
			{
				const lhsNdx = data.link.slice();
				lhsNdx.push(0);
				const rhsNdx = data.link.slice();
				rhsNdx.push(1);
				const args = Cat.clone(data);
				args.link = lhsNdx;
				args.cod = data.cod.lhs;
				stringMorphism.bindGraph(dgrm, expr.lhs, false, args);
				args.link = rhsNdx;
				args.cod = data.cod.rhs;
				stringMorphism.bindGraph(dgrm, expr.rhs, false, args);
			},
			function(){},
			first, data);
	}
	static mergeGraphs(dgrm, expr, first, data)	// data: {from, base, inbound, outbound}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				if ('links' in data.from)
				{
					const links = data.from.links.map(lnk =>
					{
						let nuLnk = data.base.reduce((isSelfLink, f, i) => isSelfLink && f === lnk[i], true) ? data.inbound.slice() : data.outbound.slice();
						nuLnk.push(...lnk.slice(data.base.length));
						return nuLnk;
					});
					if (!('links' in expr))
						expr.links = links;
					else links.map(lnk => expr.links.indexOf(lnk) === -1 ? expr.links.push(lnk) : null);
				}
				if (!('functions' in expr))
					expr.functions = [];
				if ('functions' in data.from)
					data.from.functions.map(f => expr.functions.indexOf(f) === -1 ? expr.functions.push(f) : null);
			},
			function(dgrm, expr, first, data)
			{
				expr.data.map((d, i) =>
				{
					const from = 'data' in data.from ? data.from.data[i] : data.from;
					stringMorphism.mergeGraphs(dgrm, d, false, {from, base:data.base, inbound:data.inbound, outbound:data.outbound});
				});
			},
			function(dgrm, expr, first, data)
			{
				stringMorphism.mergeGraphs(dgrm, expr.lhs, false, {from:data.from.lhs, base:data.base, inbound:data.inbound, outbound:data.outbound});
				stringMorphism.mergeGraphs(dgrm, expr.rhs, false, {from:data.from.rhs, base:data.base, inbound:data.inbound, outbound:data.outbound});
			},
			function(){},
			first, data);
	}
	static tagGraph(dgrm, expr, first, data)	// data: function name
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				if (!('functions' in expr))
					expr.functions = [data];
				else if (expr.functions.indexOf(data) === -1)
					expr.functions.push(data);
				if (!('links' in expr))
					expr.links = [];
			},
			function(dgrm, expr, first, data)
			{
				expr.data.map((e, i) => stringMorphism.tagGraph(dgrm, expr.data[i], false, data));
			},
			function(dgrm, expr, first, data)
			{
				stringMorphism.tagGraph(dgrm, expr.lhs, false, data);
				stringMorphism.tagGraph(dgrm, expr.rhs, false, data);
			},
			function(){},
			first, data);
	}
	static componentGraph(dgrm, expr, first, data)
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				if ('links' in expr)
					expr.links.map(lnk => lnk.splice(1, 0, data));
			},
			function(dgrm, expr, first, data)
			{
				expr.data.map((e, i) => stringMorphism.componentGraph(dgrm, expr.data[i], false, data));
			},
			function(dgrm, expr, first, data)
			{
				stringMorphism.componentGraph(dgrm, expr.lhs, false, data);
				stringMorphism.componentGraph(dgrm, expr.rhs, false, data);
			},
			function(){},
			first, data);
	}
	static traceLinks(dgrm, expr, first, data)	// data {index, expr}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				const links = expr.links.slice();
				expr.visited = [];
				while(links.length > 0)
				{
					const lnk = links.pop();
					if (expr.visited.indexOf(lnk) > -1)
						continue;
					const f = element.getExprFactor(data.expr, lnk);
					if ('links' in f)
						f.links.map(k => (links.indexOf(k) === -1 && k[0] !== data.index[0]) ? links.push(k) : null);
					f.functions.map(r => expr.functions.indexOf(r) === -1 ? expr.functions.push(r) : null);
					if (data.index.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
						continue;
					if (expr.visited.indexOf(lnk) === -1)
						expr.visited.push(lnk);
				}
			},
			function(dgrm, expr, first, data)
			{
				expr.data.map((e, i) =>
				{
					let index = data.index.slice();
					index.push(i);
					stringMorphism.traceLinks(dgrm, expr.data[i], false, {expr:data.expr, index});
				});
			},
			function(dgrm, expr, first, data)
			{
				let lIndex = data.index.slice();
				lIndex.push(0);
				stringMorphism.traceLinks(dgrm, expr.lhs, false, {expr:data.expr, index:lIndex});
				let rIndex = data.index.slice();
				rIndex.push(1);
				stringMorphism.traceLinks(dgrm, expr.rhs, false, {expr:data.expr, index:rIndex});
			},
			function(){},
			first, data);
	}
	static copyDomCodLinks(dgrm, expr, first, data)	// data {cnt, expr, index}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				const factorLink = data.index.slice();
				if (factorLink[0] === 1)
					factorLink[0] = data.cnt;
				const f = element.getExprFactor(data.expr, factorLink);
				const v = f.visited;
				if (typeof v === 'undefined')
					throw 'Not visited';
				for (let i=0; i<v.length; ++i)
				{
					const lnk = v[i].slice();
					if (lnk[0] > 0 && lnk[0] < data.cnt)
						continue;
					if (lnk[0] === data.cnt)
						lnk[0] = 1;
					if (expr.links.indexOf(lnk) === -1)	// TODO needed?
						expr.links.push(lnk);
				}
				f.functions.map(r => expr.functions.indexOf(r) === -1 ? expr.functions.push(r) : null);
			},
			function(dgrm, expr, first, data)
			{
				expr.data.map((e, i) =>
				{
					let index = data.index.slice();
					index.push(i);
					stringMorphism.copyDomCodLinks(dgrm, expr.data[i], false, {expr:data.expr, index, cnt:data.cnt});
				});
			},
			function(dgrm, expr, first, data)
			{
				let lIndex = data.index.slice();
				lIndex.push(0);
				stringMorphism.copyDomCodLinks(dgrm, expr.lhs, false, {expr:data.expr, index:lIndex, cnt:data.cnt});
				let rIndex = data.index.slice();
				rIndex.push(1);
				stringMorphism.copyDomCodLinks(dgrm, expr.rhs, false, {expr:data.expr, index:rIndex, cnt:data.cnt});
			},
			function(){},
			first, data);
	}
	static copyGraph(dgrm, expr, first, data)	// data {map, expr}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				expr.functions = data.expr.functions.slice();
				for (let i=0; i<data.expr.links.length; ++i)
				{
					const lnk = data.expr.links[i];
					for (let j=0; j<data.map.length; ++j)
					{
						const pair = data.map[j];
						const fromLnk = pair[0];
						const toLnk = pair[1].slice();
						if (fromLnk.reduce((isEqual, ml, i) => ml === lnk[i] && isEqual, true))
						{
							const lnkClip = lnk.slice(fromLnk.length);
							toLnk.push(...lnkClip);
							expr.links.push(toLnk);
						}
					}
				}
			},
			function(dgrm, expr, first, data)
			{
				expr.data.map((e, i) =>
				{
					stringMorphism.copyGraph(dgrm, expr.data[i], false, {expr:data.expr.data[i], map:data.map});
				});
			},
			function(dgrm, expr, first, data)
			{
				lIndex.push(0);
				stringMorphism.copyGraph(dgrm, expr.lhs, false, {expr:data.expr.lhs, map:data.map});
				rIndex.push(1);
				stringMorphism.copyGraph(dgrm, expr.rhs, false, {expr:data.expr.rhs, map:data.map});
			},
			function(){},
			first, data);
	}
	tagGraphFunction(func)
	{
		stringMorphism.tagGraph(this.diagram, this.graph, true, func);
	}
	mergeMorphismGraphs(morph, dual = false)
	{
		const graphs = morph.morphisms.map(m => stringMorphism.getGraph(m));
		graphs.map((g, i) =>
		{
			const dom = dual ? 1 : 0;
			const cod = dual ? 0 : 1;
			stringMorphism.mergeGraphs(this.diagram, this.graph.data[dom], true, {from:g.graph.data[dom], base:[dom], inbound:[], outbound:[cod, i]});
			const gCod = g.graph.data[cod];
			const tCod = this.graph.data[cod];
			const thisGraph = 'data' in tCod ? tCod.data[i] : tCod;
			stringMorphism.mergeGraphs(this.diagram, thisGraph, true, {from:gCod, base:[cod, i], inbound:[cod, i], outbound:[]});
		});
		const cod = this.graph.data[1];
		graphs.map((g, i) =>
		{
			cod.data[i] = Cat.clone(g.graph.data[dual ? 0 : 1]);
//??			stringMorphism.componentGraph(this.diagram, cod.data[i], true, i);
		});
	}
	makeParallelGraph(morphisms)
	{
		const dom = this.graph.data[0];
		const cod = this.graph.data[1];
		const graphs = morphisms.map(m => stringMorphism.getGraph(m));
		graphs.map((g, i) =>
		{
			dom.data[i] = Cat.clone(g.graph.data[0]);
			cod.data[i] = Cat.clone(g.graph.data[1]);
			stringMorphism.componentGraph(this.diagram, dom.data[i], true, i);
			stringMorphism.componentGraph(this.diagram, cod.data[i], true, i);
		});
	}
	static getGraph(m)
	{
		if (m.diagram.graphCat.hasMorphism(m.name))
			return m.diagram.graphCat.getMorphism(m.name);
		return stringMorphism.graph(m.diagram, m);
	}
	makeIdentityGraph()
	{
		stringMorphism.bindGraph(this.diagram, this.graph.data[0], true, {cod:this.graph.data[1], link:[], function:'identity', domRoot:[0], codRoot:[1]});
		this.tagGraphFunction('identity');
	}
	makeDiagonalGraph()
	{
		const dom = this.graph.data[0];
		const cod = this.graph.data[1];
		stringMorphism.bindGraph(this.diagram, dom, true, {cod:cod.data[0], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 0]});
		stringMorphism.bindGraph(this.diagram, dom, true, {cod:cod.data[1], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 1]});
		this.tagGraphFunction('diagonal');
	}
	makeEvalGraph()
	{
		const dom = this.graph.data[0];
		const domHom = dom.data[0];
		const cod = this.graph.data[1];
		stringMorphism.bindGraph(this.diagram, dom.data[1], true, {cod:domHom.lhs, link:[], function:'eval', domRoot:[0, 1], codRoot:[0, 0, 0]});
		stringMorphism.bindGraph(this.diagram, domHom.rhs, true, {cod, link:[], function:'eval', domRoot:[0, 0, 1], codRoot:[1]});
		this.tagGraphFunction('eval');
	}
	makeCompositeGraph(m)
	{
		const graphCat = m.diagram.graphCat;
		const graphs = m.morphisms.map(cm => stringMorphism.getGraph(cm));
		const expr = m.category.parseObject(graphs.map(m => m.domain.code).join() + ',' + graphs[graphs.length -1].codomain.code);
		graphs.map((g, i) =>
		{
			stringMorphism.mergeGraphs(this.diagram, expr.data[i], true, {from:g.graph.data[0], base:[0], inbound:[i], outbound:[i+1]});
			stringMorphism.mergeGraphs(this.diagram, expr.data[i+1], true, {from:g.graph.data[1], base:[1], inbound:[i+1], outbound:[i]});
		});
		stringMorphism.traceLinks(this.diagram, expr, true, {expr, index:[]});
		stringMorphism.copyDomCodLinks(this.diagram, this.graph, true, {cnt:m.morphisms.length, expr, index:[]});
	}
	makeProductAssemblyGraph(m)
	{
		this.mergeMorphismGraphs(m);
		this.tagGraphFunction('productAssembly');
	}
	makeCoproductAssemblyGraph(m)
	{
		this.mergeMorphismGraphs(m, true);
		this.tagGraphFunction('coproductAssembly');
	}
	makeFactorGraph(m)
	{
		const domExpr = this.graph.data[0];
		const codExpr = this.graph.data[1];
		m.factors.map((r, i) =>
		{
			const dom = element.getExprFactor(domExpr, r);
			if (dom === null)
				return;
			const cod = 'data' in codExpr ? element.getExprFactor(codExpr, [i]) : codExpr;
			const domRoot = r.slice();
			domRoot.unshift(0);
			const codRoot = 'data' in codExpr ? [1, i] : [1];
			stringMorphism.bindGraph(this.diagram, dom, true, {cod, link:[], function:'factor', domRoot, codRoot});
		});
		this.tagGraphFunction('factor');
	}
	makeLambdaGraph(m)
	{
		const preCurryGraph = stringMorphism.getGraph(m.preCurry);
		const map = m.domFactors.map((f, i) => [f, [0, i]]);
		if (m.domFactors.length === 1)
		{
			const f = map[0];
			map[0] = [f[0], [f[1][1]]];
		}
		const dom = this.graph.data[0];
		const cod = this.graph.data[1];
		const homDom = cod.lhs;
		const homCod = cod.rhs;
		const homMap = m.homFactors.map((f, i) => [f, [1, 0, i]]);
		if (m.homFactors.length === 1)
		{
			const f = homMap[0];
			homMap[0] = [f[0], [1, 0]];
		}
		map.push(...homMap);
		map.push([[1], [1, 1]]);
		m.domFactors.map((f, i) => stringMorphism.copyGraph(m.diagram, 'data' in dom ? dom.data[i] : dom, true, {map, expr:element.getExprFactor(preCurryGraph.graph, f)}));
		m.homFactors.map((f, i) => stringMorphism.copyGraph(m.diagram, 'data' in homDom ? homDom.data[i] : homDom, true, {map, expr:element.getExprFactor(preCurryGraph.graph, f)}));
		stringMorphism.copyGraph(m.diagram, homCod, true, {map, expr:preCurryGraph.graph.data[1]});
		this.tagGraphFunction('lambda');
	}
	makeProductGraph(m)
	{
		this.makeParallelGraph(m.morphisms)
		this.tagGraphFunction('product');
	}
	makeCoproductGraph(m)
	{
		this.makeParallelGraph(m.morphisms)
		this.tagGraphFunction('coproduct');
	}
	makeRecurseGraph(m)
	{
		return stringMorphism.graph(this.diagram, m.recursor);
	}
	static graph(dgrm, m)
	{
		if (dgrm.graphCat.hasMorphism(m.name))
		{
			const g = dgrm.graphCat.getMorphism(m.name);
			g.incrRefcnt();
			return g;
		}
		let g = new stringMorphism(dgrm, m);
		switch(m.function)
		{
		case 'identity':
			g.makeIdentityGraph();
			break;
		case 'diagonal':
			g.makeDiagonalGraph();
			break;
		case 'eval':
			g.makeEvalGraph();
			break;
		case 'compose':
			g.makeCompositeGraph(m);
			break;
		case 'productAssembly':
			g.makeProductAssemblyGraph(m);
			break;
		case 'coproductAssembly':
			g.makeCoproductAssemblyGraph(m);
			break;
		case 'factor':
			g.makeFactorGraph(m);
			break;
		case 'lambda':
			g.makeLambdaGraph(m);
			break;
		case 'product':
			g.makeProductGraph(m);
			break;
		case 'coproduct':
			g.makeCoproductGraph(m);
			break;
		case 'recurse':
			g = g.makeRecurseGraph(m);
			break;
		}
		element.html(dgrm, g.graph.data[0], true, {class:'object', position:0});
		element.html(dgrm, g.graph.data[1], true, {class:'object', position:0});
		return g;
	}
	static svgLinkUpdate(dom, lnk, data)	// data {graph, dom:{x,y}, cod:{x,y}}
	{
		const isDomLink = lnk[0] === 0;
		const f = element.getExprFactor(data.graph, lnk);
		const cod = {x:Math.round(f.position + (f.width/2.0) + (isDomLink ? data.dom.x : data.cod.x)), y:isDomLink ? data.dom.y : data.cod.y};
		const dx = cod.x - dom.x;
		const dy = cod.y - dom.y;
		const adx = Math.abs(dx);
		const ady = Math.abs(dy);
		const normal = dy === 0 ? ((data.cod.y - data.dom.y) > 0 ? {x:0, y:-1} : {x:0, y:1}) : D2.norm(D2.normal(D2.subtract(cod, dom)));
		const h = (adx - ady) / (1.0 * adx);
		const v = D2.scale(D2.dist(dom, cod) * h / 4.0, normal);
		let cp1 = D2.round(D2.add(v, dom));
		let cp2 = D2.round(D2.add(v, cod));
		return adx < ady ? `M${dom.x},${dom.y} L${cod.x},${cod.y}` : `M${dom.x},${dom.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`;
	}
	static linkId(data, lnk)
	{
		return `link_${data.elementId}_${data.index.join('_')}:${lnk.join('_')}`;
	}
	static linkColorKey(lnk, dom, cod)
	{
		return `${lnk[0] === 0 ? dom : cod} ${lnk.slice(1).toString()}`;
	}
	static graphSVG(dgrm, expr, first, data)	// data {index, graph, dom:{x,y, name}, cod:{x,y, name}, visited, elementId}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				let svg = '';
				const dom = {x:Math.round(expr.position + (expr.width/2.0) + (data.index[0] === 0 ? data.dom.x : data.cod.x)), y:data.index[0] === 0 ? data.dom.y : data.cod.y};
				let colorIndex = Number.MAX_VALUE;
				const srcKey = stringMorphism.linkColorKey(data.index, data.dom.name, data.cod.name);
				if (!('colorIndex' in expr))
				{
					if (!(srcKey in dgrm.link2colorIndex))
						dgrm.link2colorIndex[srcKey] = dgrm.colorIndex++;
					colorIndex = dgrm.link2colorIndex[srcKey];
				}
				else
					colorIndex = expr.colorIndex;
				while(colorIndex in dgrm.colorIndex2colorIndex)
					colorIndex = dgrm.colorIndex2colorIndex[colorIndex];
				for (let i=0; i<expr.links.length; ++i)
				{
					const lnk = expr.links[i];
					const lnkStr = lnk.toString();
					const idxStr = data.index.toString();
					if (data.visited.indexOf(lnkStr + ' ' + idxStr) >= 0)
						continue;
					const d = stringMorphism.svgLinkUpdate(dom, lnk, data);
					const fs = expr.functions.sort().join();
					const linkId = stringMorphism.linkId(data, lnk);
					const lnkKey = stringMorphism.linkColorKey(lnk, data.dom.name, data.cod.name);
					if (lnkKey in dgrm.link2colorIndex)
					{
						let linkColorIndex = dgrm.link2colorIndex[lnkKey];
						while (linkColorIndex in dgrm.colorIndex2colorIndex)
							linkColorIndex = dgrm.colorIndex2colorIndex[linkColorIndex];
						if (linkColorIndex < colorIndex)
						{
							dgrm.colorIndex2colorIndex[colorIndex] = linkColorIndex;
							colorIndex = linkColorIndex;
							while(colorIndex in dgrm.colorIndex2colorIndex)
								colorIndex = dgrm.colorIndex2colorIndex[colorIndex];
							dgrm.link2colorIndex[srcKey] = colorIndex;
						}
						else if (linkColorIndex > colorIndex)
						{
							dgrm.link2colorIndex[lnkKey] = colorIndex;
							dgrm.colorIndex2colorIndex[linkColorIndex] = colorIndex;
						}
					}
					else
						dgrm.link2colorIndex[lnkKey] = colorIndex;
					let color = '';
					if (colorIndex in dgrm.colorIndex2color)
						color = dgrm.colorIndex2color[colorIndex];
					else
					{
						color = Math.round(Math.random() * 0xffffff).toString(16);
						dgrm.colorIndex2color[colorIndex] = color;
					}
					svg += `<path data-link="${lnkStr} ${idxStr}" class="string" style="stroke:#${color}AA" id="${linkId}" d="${d}" filter="url(#softGlow)" onmouseover="Cat.status(evt, '${fs}')"/>\n`;
					data.visited.push(idxStr + ' ' + lnkStr);
					data.visited.push(lnkStr + ' ' + idxStr);
				}
				return svg;
			},
			function(dgrm, expr, first, data)
			{
				return expr.data.reduce((svg, e, i) =>
				{
					data.index.push(i);
					svg += stringMorphism.graphSVG(dgrm, e, false, data);
					data.index.pop();
					return svg;
				}, '');
			},
			function(dgrm, expr, first, data)
			{
				data.index.push(0);
				let svg = stringMorphism.graphSVG(dgrm, expr.lhs, false, data);
				data.index.pop();
				data.index.push(1);
				svg += stringMorphism.graphSVG(dgrm, expr.rhs, false, data);
				data.index.pop();
				return svg;
			},
			function(){},
			first, data);
	}
	static updateSVG(dgrm, expr, first, data)	// data {index, graph, dom:{x,y}, cod:{x,y}, visited, elementId}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				const dom = {x:Math.round(expr.position + (expr.width/2.0) + (data.index[0] === 0 ? data.dom.x : data.cod.x)), y:data.index[0] === 0 ? data.dom.y : data.cod.y};
				const color = Math.round(Math.random() * 0xffffff).toString(16);
				const srcKey = stringMorphism.linkColorKey(data.index, data.dom.name, data.cod.name);
				let colorIndex = dgrm.link2colorIndex[srcKey];
				while(colorIndex in dgrm.colorIndex2colorIndex)
					colorIndex = dgrm.colorIndex2colorIndex[colorIndex];
				for (let i=0; i<expr.links.length; ++i)
				{
					const lnk = expr.links[i];
					const lnkStr = lnk.toString();
					const lnkKey = stringMorphism.linkColorKey(lnk, data.dom.name, data.cod.name);
					let linkColorIndex = dgrm.link2colorIndex[lnkKey];
					while(linkColorIndex in dgrm.colorIndex2colorIndex)
						linkColorIndex = dgrm.colorIndex2colorIndex[linkColorIndex];
					if (linkColorIndex < colorIndex)
					{
						dgrm.colorIndex2colorIndex[colorIndex] = linkColorIndex;
						colorIndex = linkColorIndex;
						while(colorIndex in dgrm.colorIndex2colorIndex)
							colorIndex = dgrm.colorIndex2colorIndex[colorIndex];
						dgrm.link2colorIndex[srcKey] = colorIndex;
					}
					else if (linkColorIndex > colorIndex)
					{
						dgrm.link2colorIndex[lnkKey] = colorIndex;
						dgrm.colorIndex2colorIndex[linkColorIndex] = colorIndex;
					}

					const color = dgrm.colorIndex2color[colorIndex];
					const idxStr = data.index.toString();
					if (data.visited.indexOf(lnkStr + ' ' + idxStr) >= 0)
						continue;
					const d = stringMorphism.svgLinkUpdate(dom, lnk, data);
					const linkId = stringMorphism.linkId(data, lnk);
					const lnkElt = document.getElementById(linkId);
					lnkElt.setAttribute('d', d);
					lnkElt.setAttribute('style', `stroke:#${color}AA`);
					data.visited.push(idxStr + ' ' + lnkStr);
				}
			},
			function(dgrm, expr, first, data)
			{
				return expr.data.map((e, i) =>
				{
					data.index.push(i);
					stringMorphism.updateSVG(dgrm, e, false, data);
					data.index.pop();
				}, '');
			},
			function(dgrm, expr, first, data)
			{
				data.index.push(0);
				stringMorphism.updateSVG(dgrm, expr.lhs, false, data);
				data.index.pop();
				data.index.push(1);
				stringMorphism.updateSVG(dgrm, expr.rhs, false, data);
				data.index.pop();
			},
			function(){},
			first, data);
	}
	static graphId(m)
	{
		return `graph_${m.elementId()}`;
	}
	static update(dgrm, from)
	{
		const id = stringMorphism.graphId(from);
		const graphFunctor = $Cat.getMorphism('Graph');
		const sm = graphFunctor.$(dgrm, from.to);
		from.stringMorphism = sm;
		const dom = {x:from.domain.x - from.to.domain.expr.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.to.codomain.expr.width/2, y:from.codomain.y, name:from.codomain.name};
		stringMorphism.updateSVG(dgrm, sm.graph, true, {index:[], graph:sm.graph, dom, cod, visited:[], elementId:from.elementId()});
	}
	static removeStringSvg(from)
	{
		const id = stringMorphism.graphId(from);
		const svgElt = document.getElementById(id);
		if (svgElt !== null)
		{
			svgElt.remove();
			return true;
		}
		return false;
	}
}

class functor extends morphism
{
	constructor(args)
	{
		super($Cat, args);
		this.subClass = 'functor';
	}
	mapObject(obj)
	{}	// FITB
	mapMorphism(m)
	{}	// FITB
}

class transform extends morphism
{
	constructor(args)
	{
		super($Cat, args, 'transform');
		this.subClass = 'transform';
		if ('testFunction' in args)
			this.testFunction = args.testFunction;
	}
	json()
	{
		let t = super.json();
		return t;
	}
}

class term extends object
{
	constructor(args)
	{
		super($Cat, args);
		this.subClass = 'term';
		this.quantifier = 'universal';	// TODO existential
		this.member = new object(this.diagram.codomain,
		{
			diagram:	this.diagram,
			name:		$Cat.getAnon('Term'),
			code:		args.eltCode,
		});
		// TODO checks: member names must be unique per diagram; member names do not appear in the types(?); member names must not be reserved names
		this.diagram.addTerm(this);
	}
	json()
	{
		let trm = super.json();
		trm.eltCode = this.member.code;
		trm.member = this.member.json();
		trm.quantifier = this.quantifier;
		return trm;
	}
}

class diagram extends functor
{
	constructor(args)
	{
		let nuArgs = Cat.clone(args);
		let domain = null;
		const isExtendedName = Cat.isExtendedName(args.name);
		const name = !isExtendedName ? diagram.nameCheck(args.codomain, 'username' in args ? args.username : Cat.user.name, args.name, false) : args.name;
		if (!$Cat.hasObject(name))
			domain = new category('domainData' in args ? args.domainData : {name});
		else
			throw `Diagram domain category ${name} already exists.`;
		nuArgs.domain = domain;
		nuArgs.codomain = new category({name:args.codomain, subobject:args.codomain});
		super(nuArgs);
		this.name = name;
		if (isExtendedName)
		{
			const tokens = args.name.split(Cat.sep);
			this.basename = tokens[tokens.length -1];
		}
		else
			this.basename = args.name;
		this.username = Cat.getArg(args, 'username', Cat.user.name);
		this.readonly = this.readonly || (Cat.user.name !== this.username);
		this.isStandard = Cat.getArg(args, 'isStandard', false);
		const mainCat = $Cat.getObject(args.codomain);
		if (this.isStandard)
			mainCat.referenceDiagrams[mainCat.referenceDiagrams.indexOf(this.name)] = this;
		if ('references' in args)
			this.references = args.references.length > 0 ? args.references.map(ref => Cat.getDiagram(ref)) : [];
		else
			this.references = [...$Cat.getObject(this.codomain.name).referenceDiagrams];
		const refHashes = this.references.map(r =>
		{
			if (typeof r !== 'string')
				r.incrRefcnt();
			return r.sha256;
		});
		// TODO referenceHashes ????
		if ('referenceHashes' in args)
		{
			const argHashes = args.referenceHashes;
			for (let i=0; i<refHashes.length; ++i)
				if (argHashes[i] !== refHashes[i])
					console.log(`Warning: Diagram ${this.name} reference diagram ${this.references[i].name} has saved hash ${argHashes[i]} not the same as its internal hash ${refHashes[i]}`);
		}
		else
			this.referenceHashes = refHashes;
		this.makeHomSets();
		this.updateElements();
		this.subClass = 'diagram';
		this.selected = [];
		this.viewport = Cat.getArg(args, 'viewport', {x:0, y:0, scale:1, width:window.innerWidth, height:window.innerHeight});
		if (isGUI && this.viewport.width === 0)
		{
			this.viewport.width = window.innerWidth;
			this.viewport.height = window.innerHeight;
			this.viewport.scale = 1;
		}
//		this.viewport = isGUI ? Cat.getArg(args, 'viewport', {x:0, y:0, scale:1, width:window.innerWidth, height:window.innerHeight}) : {x:0, y:0, width:0, height:0};
		this.terms = [];
		if ('terms' in args)
			args.terms.map(t => new term(this, t));
		this.objects = new Map();
		this.morphisms = new Map();
		this.timestamp = Cat.getArg(args, 'timestamp', Date.now());
		Cat.addDiagram(this.codomain.name, this);
		this.texts = 'texts' in args ? args.texts.map(d => new element(this.domain, d)) : [];
		this.texts.map(t => t.diagram = this);
		if ('codomainData' in args)
		{
			this.codomain.process(this, args.codomainData);
			this.codomain.objects.forEach(function(o) {o.refcnt = 1;});
		}
		if ('objectMap' in args)
			for(let i=0; i<args.objectMap.length; ++i)
			{
				const a = args.objectMap[i];
				try
				{
					const a0 = this.domain.getObject(a[0]);
					if (a0.refcnt === 0)	// TODO ???
						a0.incrRefcnt();
					const a1 = this.getObject(a[1], this);
					if (a1 !== null)
						this.setObject(a0, a1);
					else
						console.log('diagram.constructor bypasses object in domain due to being unmapped',a[0],' to ',a[1]);
				}
				catch(e)
				{
					Cat.recordError(e);
				}
			}
		if ('morphismMap' in args)
			for(let i=0; i<args.morphismMap.length; ++i)
			{
				const a = args.morphismMap[i];
				try
				{
					const from = this.domain.getMorphism(a[0]);
					const to = this.getMorphism(a[1]);
					this.setMorphism(from, to);
					from.incrRefcnt();
				}
				catch(e)
				{
					Cat.recordError(e);
				}
			}
		this.textId = Cat.getArg(args, 'textId', 0);
		this.graphCat = new category({name:'Graph', subobject:'Graph'});
		this.cleanse();
		this.sha256 = Cat.sha256(args);
	}
	static fetchDiagram(dgrmName, fn)
	{
		Cat.Amazon.fetchDiagramJsons([dgrmName], function(jsons)
		{
			jsons.reverse().map(j =>
			{
				const dgrm = new diagram(j);
				dgrm.saveToLocalStorage();
			});
			if (fn)
				fn(dgrmName);
		});
	}
	static genName(catName, userName, baseName)
	{
		return `D${Cat.sep}${catName}${Cat.sep}${userName}${Cat.sep}${baseName}`;
	}
	static nameCheck(catName, userName, basename, regexTst = true, namexTst = true)
	{
		if (basename === '')
			throw 'Diagram name must be specified.';
		// TODO check server for uniqueness
		let name = '';
		if (!Cat.isExtendedName(basename))
		{
			if (regexTst && !RegExp(Cat.userNameEx).test(basename))
				throw 'Invalid diagram name.';
			name = diagram.genName(catName, userName, basename);
		}
		else
			name = basename;
		if (namexTst && Cat.hasDiagram(name))
			throw `Diagram name ${name} already used. Pick another.`;
		return name;
	}
	json()
	{
		let d = super.json();
		d.basename = this.basename;
		d.objectMap = [];
		for(const [o1, o2] of this.objects)
			if (o2 !== null)
				d.objectMap.push([o1.name, o2.name]);
		d.morphismMap = [];
		for(const [m1, m2] of this.morphisms)
			d.morphismMap.push([m1.name, m2.name]);
		d.viewport =	this.viewport;
		d.domainData = this.domain.json();
		d.codomainData = this.codomain.json();
		d.references = this.references.map(r => r.name);
		d.terms = this.terms.map(t => t.json());
		d.username = this.username;
		d.isStandard = this.isStandard;
		d.texts = this.texts.map(t => t.json());
		d.textId = this.textId;
		d.timestamp = this.timestamp;
		return d;
	}
	cleanse()
	{
		let found = false;
		for (const [from, to] of this.morphisms)
		{
			if (!to)
			{
				console.log(`diagram.cleanse ${this.name} ${from.getText()}`);
				this.morphisms.delete(from);
				found = true;
			}
		}
		for (const [n, from] of this.domain.morphisms)
		{
			const to = this.mapMorphism(from);
			if (!to)
			{
				console.log(`diagram.cleanse [2] ${this.name} ${from.getText()}`);
				this.domain.morphisms.delete(n);
				found = true;
			}
		}
		if (found)
		{
			this.makeHomSets();
			this.saveToLocalStorage();
		}
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
	}
	gui(e, elt, fn)
	{
		try
		{
			this[fn](e, elt);
		}
		catch(x)
		{
			Cat.recordError(x);
		}
	}
	updateFn(map)
	{
		for (const [name, elt] of map)
			elt.diagram = this;
	}
	updateElements()
	{
		this.updateFn(this.domain.objects);
		this.updateFn(this.domain.morphisms);
		this.updateFn(this.codomain.objects);
		this.updateFn(this.codomain.morphisms);
	}
	mapObject(obj)
	{
		if (typeof obj === 'object')
			return this.objects.get(obj);
		else
			return this.objects.get(this.domain.getObject(obj));
	}
	mapMorphism(m)
	{
		return this.morphisms.get(m);
	}
	mapMorphismByName(nm)
	{
		return this.mapMorphism(this.domain.getMorphism(nm));
	}
	mapElement(elt)
	{
		switch(elt.class)
		{
		case 'element':
			return this.getTextElement
			break;
		case 'object':
			return this.mapObject(elt);
			break;
		case 'morphism':
			return this.mapMorphism(elt);
			break;
		}
		return null;
	}
	setObject(from, to)
	{
		to.incrRefcnt();
		this.objects.set(from, to);
		from.to = to;
		from.w = Cat.textWidth(to.getText());
	}
	setMorphism(from, to)
	{
		to.incrRefcnt();
		this.setObject(from.domain, to.domain);
		this.setObject(from.codomain, to.codomain);
		this.makeHomSets();
		from.to = to;
		return this.morphisms.set(from, to);
	}
	saveToLocalStorage()
	{
		if (Cat.debug)
			console.log('save to local storage', diagram.storageName(this.name));
		this.timestamp = Date.now();
		const data = this.stringify();
		localStorage.setItem(diagram.storageName(this.name), data);
	}
	static fromLocalStorage(dgrmName)
	{
		const data = localStorage.getItem(diagram.storageName(dgrmName));
		let dgrm = null;
		if (data !== null)
			dgrm = new diagram(JSON.parse(data));
		if (Cat.debug)
			console.log('fromLocalStorage',dgrmName,dgrm);
		return dgrm;
	}
	static storageName(dgrmName)
	{
		return `Cat.diagram ${dgrmName}`;
	}
	setView()
	{
		Cat.display.diagramSVG.setAttribute('transform', `translate(${this.viewport.x}, ${this.viewport.y})scale(${this.viewport.scale})`);
	}
	update(e, pnl = '', sel = null, hom = false, save = true)
	{
		this.setView();
		if (e && sel)
			this.addSelected(e, sel, true);
		if (hom)
			this.makeHomSets();
		this.updateMorphisms();
		if (save && Cat.autosave)
			this.saveToLocalStorage();
		if (pnl !== '')
		{
			const p = Cat.display[pnl];
			if ('update' in p)
				p.update();
			else
				p.setPanelContent();
		}
	}
	clear(e)
	{
		if (this.readonly)
			return;
		Cat.display.deactivateToolbar();
		this.objects.clear();
		this.morphisms.clear();
		this.domain.clear();
		this.codomain.clear();
		this.terms = [];
		this.selected = [];
		this.makeHomSets();
		this.texts = [];
		Cat.display.diagramSVG.innerHTML = Cat.display.svg.basics + Cat.getDiagram().makeAllSVG();
		Cat.updatePanels();
		if ('orig' in this.viewport)
			delete this.viewport.orig;
		this.update(e);
	}
	addSelected(e, eltOrig, clear = false, cls = 'object')
	{
		if (Cat.debug)
			console.log('addSelected',eltOrig, this.mapElement(eltOrig));
		let elt = eltOrig;
		if (clear)
			this.deselectAll(false);
		if (elt === null)
			return;
		if (typeof elt === 'string')
			switch(elt)
			{
				case 'element':
					break;
				case 'object':
					elt = Cat.getDiagram().domain.getObject(elt);
					break;
				case 'morphism':
					elt = Cat.getDiagram().domain.getMorphism(elt);
					break;
			}
		elt.showSelected();
		if (this.selected.indexOf(elt) >= 0)
		{
			Cat.display.activateToolbar(e);
			return;
		}
		this.selected.push(elt);
		switch(elt.class)
		{
		case 'element':
		case 'object':
			elt.orig = {x:elt.x, y:elt.y};
			break;
		case 'morphism':
			elt.domain.orig = {x:elt.domain.x, y:elt.domain.y};
			elt.codomain.orig = {x:elt.codomain.x, y:elt.codomain.y};
			if (elt.function === 'data' && elt.name !== document.getElementById('dataPanelTitle').innerHTML)
				Cat.display.panel.close('data');
			break;
		}
		Cat.display.activateToolbar(e);
	}
	removeSelected(e)
	{
		if (this.readonly)
			return;
		const selected = this.selected.slice();
		this.deselectAll();
		let found = {};
		for(let i=0; i<selected.length; ++i)
		{
			let s = selected[i];
			if (s.isDeletable())
				s.decrRefcnt();
			found[s.class] = true;
		}
		this.update(null, '', null, true);
		Object.keys(found).map(cls => Cat.display[cls].update());
	}
	pickElement(e, name, cls)
	{
		let elt = null;
		switch(cls)
		{
			case 'element':
				const elts = this.texts.filter(t => t.name === name);
				elt = elts.length >= 1 ? elts[0] : null;
				break;
			case 'object':
				elt = this.domain.getObject(name);
				break;
			case 'morphism':
				elt = this.domain.getMorphism(name);
				break;
		}
		if (elt !== null)
		{
			window.setTimeout(function()
			{
				if (Cat.display.mouseDown)
					Cat.display.drag = true;
			}, Cat.default.dragDelay);
			Cat.display.dragStart = this.mousePosition(e);
			if (!this.isSelected(elt))
				this.addSelected(e, elt, !Cat.display.shiftKey);
			else
				Cat.display.activateToolbar(e);
			if (elt.class === 'object')
				elt.orig = {x:elt.x, y:elt.y};
		}
		else if (!Cat.display.shiftKey)
			this.deselectAll();
	}
	isSelected(elt)
	{
		for(let i=0; i<this.selected.length; ++i)
			if (elt.cid === this.selected[i].cid)
				return true;
		return false;
	}
	editSelected(e)
	{
		const from = this.getSelected();
		if (this.readonly)
			throw 'Diagram is readonly.';
		if (!this.isMorphismEditable(from))
			throw `Morphism ${from.to.getText()} is not editable.`;
		if (from.to.subClass !== 'dataMorphism')
		{
			const newTo = this.newDataMorphism(from.to.domain, from.to.codomain);
			from.to.decrRefcnt();
			this.setMorphism(from, newTo);
			this.updateElementAttribute(from, newTo, 'html', newTo.html);
			this.update(e, '', from, true);
		}
		Cat.display.data.setPanelContent();
		Cat.display.panel.open('data');
	}
	deleteAll()
	{
		this.deselectAll();
		this.objects.clear();
		this.morphisms.clear();
		if ('homSets' in this.domain)
			this.domain.homSets.clear();
	}
	isMorphismEditable(from)
	{
		return from.to.function === 'data' ||
			from.to.function === 'recurse' ||
			(from.to.function === 'identity' && from.refcnt === 1 && !from.to.domain.isInitial && !from.to.codomain.isTerminal && dataMorphism.checkEditableObject(this, from.to.domain));
	}
	toolbar(from)
	{
		const del = !this.readonly && from.isDeletable();
		let btns = H.td(Cat.display.getButton('close', 'Cat.display.deactivateToolbar()', 'Close'), 'buttonBar') +
					(del ? H.td(Cat.display.getButton('delete', `Cat.getDiagram().gui(evt, this, 'removeSelected')`, 'Delete'), 'buttonBar') : '');
		if (from.class !== 'element')
		{
			if (!this.readonly)
			{
				if (from.class === 'morphism')
				{
					const domMorphs = this.domain.obj2morphs.get(from.domain);
					if (del && domMorphs.dom.length + domMorphs.cod.length > 1)
						btns += H.td(Cat.display.getButton('detachDomain', `Cat.getDiagram().guiDetach(evt, 'domain')`, 'Detach domain'), 'buttonBar');
					const codMorphs = this.domain.obj2morphs.get(from.codomain);
					if (del && codMorphs.dom.length + codMorphs.cod.length > 1)
						btns += H.td(Cat.display.getButton('detachCodomain', `Cat.getDiagram().guiDetach(evt, 'codomain')`, 'Detach codomain'), 'buttonBar');
					const isEditable = this.isMorphismEditable(from);
					if (isEditable)
						btns += H.td(Cat.display.getButton('edit', `Cat.getDiagram().gui(evt, this, 'editSelected')`, 'Edit data'), 'buttonBar');
					else if (from.to.function === 'compose' && this.isRunnable(from))
						btns += (!this.readonly ? H.td(Cat.display.getButton('run', `Cat.getDiagram().gui(evt, this, 'run')`, 'Evaluate'), 'buttonBar') : '');
					if (this.codomain.isClosed && (('op' in from.to.domain.expr && from.to.domain.expr.op === 'product') || ('op' in from.to.codomain.expr && from.to.codomain.expr.op === 'hom')))
						btns += H.td(Cat.display.getButton('lambda', `Cat.getDiagram().gui(evt, this, 'curryForm')`, 'Curry'), 'buttonBar');
					btns += H.td(Cat.display.getButton('string', `Cat.getDiagram().gui(evt, this, 'displayString')`, 'String'), 'buttonBar');
				}
				else if (!this.readonly)
					btns += H.td(Cat.display.getButton('toHere', `Cat.getDiagram().toolbarHandler('codomain', 'toolbarTip')`, 'Morphisms to here'), 'buttonBar') +
							H.td(Cat.display.getButton('fromHere', `Cat.getDiagram().toolbarHandler('domain', 'toolbarTip')`, 'Morphisms from here'), 'buttonBar') +
							H.td(Cat.display.getButton('project', `Cat.getDiagram().gui(evt, this, 'factorBtnCode')`, 'Factor morphism'), 'buttonBar');
			}
		}
		btns += H.td(Cat.display.getButton('help', `Cat.getDiagram().gui(evt, this, 'elementHelp')`, 'Description'), 'buttonBar');
		let html = H.table(H.tr(btns), 'buttonBarLeft') + H.br();
		html += H.div('', '', 'toolbarTip');
		return html;
	}
	toolbarHandler(dir, id)
	{
		if (this.selected.length !== 1)
			return;
		const from = this.getSelected();
		if (from.class === 'object')
		{
			let morphs = [];
			for(const [key, m] of this.codomain.morphisms)
			{
				if (from.to.name === m[dir].name || from.to.code === m[dir].code)
					morphs.push(m);
			}
			this.references.map(r =>
			{
				for(const [key, m] of r.morphisms)
				{
					if (from.to.code === m[dir].code)
						morphs.push(m);
				}
			});
			let html = H.small('Basic:');
			html += H.table(Cat.display.morphismTableRows(morphs, `onclick="Cat.getDiagram().objectPlaceMorphism(event, '${dir}', '${from.name}', '%1')"`), 'toolbarTbl');
			morphs = this.getTransforms(dir, from.to);
			html += H.small('Transforms:');
			html += H.table(Cat.display.morphismTableRows(morphs, `onclick="Cat.getDiagram().placeTransformMorphism(event, '%1', '${dir}', '${from.name}')"`), 'toolbarTbl');
			document.getElementById(id).innerHTML = html;
		}
	}
	factorBtnCode()
	{
		const from = this.getSelected();
		let html = H.h4('Create Factor Morphism') +
					H.h5('Domain Factors') +
					H.small('Click to place in codomain') +
						H.button('1', '', Cat.display.elementId(), 'Terminal object',
						`onclick="Cat.getDiagram().addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					element.getFactorBtnCode(this, from.to.expr, true, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:''}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		document.getElementById('toolbarTip').innerHTML = html;
	}
	curryMorphism(e)
	{
		const s = this.getSelected();
		let domFactors = diagram.getFactorsByDomCodId('domainDiv');
		let homFactors = diagram.getFactorsByDomCodId('codomainDiv');
		let data = curryMorphism.form(this, s.to, domFactors, homFactors);
		let m = this.getMorphism(data.name);
		if (m === null)
			m = new curryMorphism(this, data);
		const v = D2.subtract(s.codomain, s.domain);
		const normV = D2.norm(D2.normal(v));
		const xyDom = D2.add(s.domain, D2.scale(Cat.default.arrow.length, normV));
		const xyCod = D2.add(s.codomain, D2.scale(Cat.default.arrow.length, normV));
		this.placeMorphism(e, m, xyDom, xyCod);
	}
	displayString(event, from)
	{
		this.showString(this.getSelected());
	}
	showString(from)
	{
		const id = stringMorphism.graphId(from);
		if (stringMorphism.removeStringSvg(from))
			return;
		const graphFunctor = $Cat.getMorphism('Graph');
		const sm = graphFunctor.$(this, from.to);
		from.stringMorphism = sm;
		const dom = {x:from.domain.x - from.to.domain.expr.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.to.codomain.expr.width/2, y:from.codomain.y, name:from.codomain.name};
		const svg = `<g id="${id}">${stringMorphism.graphSVG(this, sm.graph, true, {index:[], graph:sm.graph, dom, cod, visited:[], elementId:from.elementId()})}</g>`;
		Cat.display.diagramSVG.innerHTML += svg;
	}
	getSubFactorBtnCode(expr, data)
	{
		let html = '';
		if ('data' in expr)
			for(let i=0; i<expr.data.length; ++i)
				html += H.button(this.getObjectByExpr(expr.data[i]).getText() + H.sub(i), '', Cat.display.elementId(), '', `data-factor="${data.dir} ${i}" onclick="H.toggle(this, '${data.fromId}', '${data.toId}')"`);
		else
			html += H.button(this.getObjectByExpr(expr).getText(), '', Cat.display.elementId(), '', `data-factor="${data.dir} -1" onclick="H.toggle(this, '${data.fromId}', '${data.toId}')"`);
		return html;
	}
	curryForm(event, elt)
	{
		const from = this.getSelected();
		this.lambdaBtnForm(from.to.domain.expr, from.to.codomain.expr, from.to.domain.name);
	}
	lambdaBtnForm(domExpr, codExpr, root)
	{
		const codIsHom = 'op' in codExpr && codExpr.op === 'hom';
		let html = H.h4('Curry A &#8855 B -> [C, D]') +
			H.h5('Domain Factors: A &#8855 B') +
			H.small('Click to move to C') +
			H.div(this.getSubFactorBtnCode( domExpr, {dir:	0, fromId:'domainDiv', toId:'codomainDiv'}),
				'', 'domainDiv') +
			H.h5('Codomain Factors: C') +
			(codIsHom ? H.small('Merge to codomain hom') + Cat.display.getButton('codhom', `Cat.getDiagram().toggleCodHom()`, 'Merge codomain hom', Cat.default.button.tiny) + H.br() : '') +
			H.small('Click to move to A &#8855 B') +
			H.div(('op' in codExpr && codExpr.op === 'hom') ?
					this.getSubFactorBtnCode( codExpr.lhs, {dir:1, fromId:'codomainDiv', toId:'domainDiv'})
				: '', '', 'codomainDiv') +
			H.span(Cat.display.getButton('edit', `Cat.getDiagram().gui(evt, this, 'curryMorphism')`, 'Curry morphism'));
		document.getElementById('toolbarTip').innerHTML = html;
	}
	elementHelp()
	{
		const from = this.getSelected();
		const readonly = from.diagram.readonly;
		let html = '';
		if (from.to)
		{
			html = H.h4(H.span(from.to.getText(), '', 'htmlElt') +
							(readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('htmlElt', 'html')`, 'Rename', Cat.default.button.tiny))) +
							H.p(H.span(Cat.cap(from.to.description), '', 'descriptionElt') +
							(readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('descriptionElt', 'Description')`, 'Edit description', Cat.default.button.tiny)));
			let title = '';
			switch(from.to.subClass)
			{
			case 'composite':
				title = 'Composition';
				break;
			case 'productAssemblyMorphism':
				title = 'Product Assembly';
				break;
			case 'coproductAssemblyMorphism':
				title = 'Coproduct Assembly';
				break;
			case 'productMorphism':
				title = 'Product';
				break;
			case 'coproductMorphism':
				title = 'Coproduct';
				break;
			}
			if ('recursor' in from.to && from.to.recursor !== null)
			{
				title = 'Recursion';
				from.to.updateRecursor();
				html += this.elementHelpMorphTbl(from.to.recursor.morphisms);
			}
			if (title != '')
				html += H.h4(title);
			if ('morphisms' in from.to)
				html += this.elementHelpMorphTbl(from.to.morphisms);
			html += !from.to.diagram.isEquivalent(this) ? H.small(`From diagram: ${from.to.diagram.getText()}`) : '';
		}
		else
			html = H.p(H.span(from.html, 'tty', 'htmlElt') +
							(readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('htmlElt', 'html')`, 'Edit text', Cat.default.button.tiny)));
		document.getElementById('toolbarTip').innerHTML = html;
	}
	elementHelpMorphTbl(morphs)
	{
		return H.table(H.tr(H.th('Morphisms')) + morphs.map(m => H.tr(H.td(m.getText(), 'left'))).join(''));
	}
	getTransforms(dir, obj = null)
	{
		let transforms = [];
		const catName = this.codomain.name;
		for(const [tName, t] of $Cat.transforms)
			t[dir].name === catName && ((obj && 'testFunction' in t) ? t.testFunction(this, obj) : true) && transforms.push(t);
		return transforms;
	}
	updateDragObjects(p)
	{
		const delta = D2.subtract(p, Cat.display.dragStart);
		let dragObjects = {};
		for(let i=0; i < this.selected.length; ++i)
		{
			const elt = this.selected[i];
			switch(elt.class)
			{
				case 'morphism':
					dragObjects[elt.domain.cid] = elt.domain;
					dragObjects[elt.codomain.cid] = elt.codomain;
					break;
				case 'element':
				case 'object':
					dragObjects[elt.cid] = elt;
					break;
			}
		}
		Object.keys(dragObjects).forEach(function(i)
		{
			const elt = dragObjects[i];
			if ('orig' in elt)
				elt.updatePosition(D2.add(delta, elt.orig));
			const homset = this.domain.obj2morphs.get(elt);
			if (typeof homset !== 'undefined')
			{
				homset.dom.map(m => m.update(this));
				homset.cod.map(m => m.update(this));
			}
		}, this);
	}
	placeElement(e, elt)
	{
		elt.addSVG();
		this.update(e, elt.class, elt);
	}
	placeObject(e, obj, xy)
	{
		let srcObj = null;
		if (typeof xy === 'undefined')
		{
			
			const xy = this.userToDiagramCoords({x:Cat.display.width()/2, y:Cat.display.height()/2});
			srcObj = new diagramObject(this.domain, {diagram:this, xy});
		}
		else
			srcObj = new diagramObject(this.domain, {diagram:this, xy});
		srcObj.incrRefcnt();
		this.setObject(srcObj, obj);
		this.placeElement(e, srcObj);
	}
	placeMorphism(e, to, xyDom, xyCod)
	{
		const domain = new diagramObject(this.domain, {diagram:this, xy:xyDom});
		domain.incrRefcnt();
		const codomain = new diagramObject(this.domain, {diagram:this, xy:xyCod});
		codomain.incrRefcnt();
		const from = new diagramMorphism(this.domain, {diagram:this, domain:domain.name, codomain:codomain.name});
		from.incrRefcnt();
		this.setMorphism(from, to);
		if (isGUI)
		{
			domain.addSVG();
			codomain.addSVG();
			from.update();
			from.addSVG();
			this.update(e, '', from, true, true);
		}
	}
	objectPlaceMorphism(e, dir, objName, morphName)
	{
		try
		{
			const to = this.getMorphism(morphName);
			const fromObj = this.domain.getObject(objName);
			const toObj = this.mapObject(fromObj);
			if (to[dir].code !== toObj.code)
				throw `Source and target do not have same code: ${to[dir].code} vs ${toObj.code}`;
			let angles = [];
			for(const [from, tox] of this.morphisms)
				if (fromObj.isEquivalent(from.domain))
					angles.push(Cat.getAngle(from.codomain.x - fromObj.x, from.codomain.y - fromObj.y));
				else if (fromObj.isEquivalent(from.codomain))
					angles.push(Cat.getAngle(from.domain.x - fromObj.x, from.domain.y - fromObj.y));
			angles.sort();
			let gap = 0;
			const al = Cat.default.arrow.length;
			let angle = angles.length > 0 ? angles[0] : 0;
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
			const delta = 2 * Math.PI - (angles[angles.length-1] - angles[0]);
			if (delta > gap)
				angle = lastAngle + (delta === 0 ? 2 * Math.PI : delta)/2;
			const cosAngle = Math.cos(angle);
			const tw = Math.abs(cosAngle) * Cat.textWidth(to.codomain.getText());
			const xy = {x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)};
			let domainElt = null;
			let codomainElt = null;
			const newElt = new diagramObject(this.domain, {diagram:this, xy});
			newElt.incrRefcnt();
			if (dir === 'domain')
			{
				domainElt = fromObj;
				codomainElt = newElt;
			}
			else
			{
				domainElt = newElt;
				codomainElt = fromObj;
			}
			const from = new diagramMorphism(this.domain, {diagram:this, domain:domainElt.name, codomain:codomainElt.name});
			from.incrRefcnt();
			this.setMorphism(from, to);
			newElt.addSVG();
			from.addSVG();
			this.update(e, '', from);
		}
		catch(x)
		{
			Cat.recordError(x);
		}
	}
	placeTransformMorphism(e, tranName, dir, name)
	{
		try
		{
			const obj = this.mapObject(this.domain.getObject(name));
			const trn = $Cat.getTransform(tranName);
			const m = trn.$(this, obj);
			this.objectPlaceMorphism(e, dir, name, m.name);
		}
		catch(x)
		{
			Cat.recordError(x);
		}
	}
	getAttachedObjects(dir)		// dir == 'domain'|'codomain'
	{
		let objs = [];
		for(let i=0; i<this.selected; ++i)
		{
			const elt = this.selected[i];
			if (elt.class === 'morphism')
				objs.push(elt[dir]);
		}
		return objs;
	}
	product(e)
	{
		let from = null;
		if (this.selected[0].class === 'morphism')
		{
			const morphisms = this.selected.map(m => m.to);
			const form = productMorphism.form(this, morphisms);
			let m = this.getMorphism(form.name);
			if (m === null)
				m = new productMorphism(this, {morphisms});
			m.incrRefcnt();
			from = this.trackMorphism(this.mousePosition(e), m);
		}
		else if (this.selected[0].class === 'object')
		{
			const xy = Cat.barycenter(this.selected);
			const codes = this.selected.map(obj => this.mapObject(obj).code);
			const code = Cat.basetypes.operators.product.toCode(codes);
			from = new diagramObject(this.domain, {diagram:this, xy});
			from.incrRefcnt();
			const to = this.newObject({code});
			this.setObject(from, to);
			from.addSVG();
		}
		if (from)
		{
			const selected = this.selected.slice();
			this.addSelected(e, from, true);
			selected.map(o => this.isIsolated(o) ? o.decrRefcnt() : null);
			this.update(e, this.selected[0].class);
		}
	}
	trackMorphism(pnt, to, src = null)
	{
		let domain = null;
		let codomain = null;
		if (src)
		{
			domain = new diagramObject(this.domain, {diagram:this, xy:src.domain});
			codomain = new diagramObject(this.domain, {diagram:this, xy:src.codomain});
		}
		else
		{
			domain = new diagramObject(this.domain, {diagram:this, xy:pnt});
			const codLen = Cat.textWidth(to.domain.getText())/2;
			const domLen = Cat.textWidth(to.codomain.getText())/2;
			const namLen = Cat.textWidth(to.getText());
			codomain = new diagramObject(this.domain, {diagram:this, xy:{x:pnt.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4), y:pnt.y}});
		}
		domain.incrRefcnt();
		codomain.incrRefcnt();
		const from = new diagramMorphism(this.domain, {diagram:this, domain, codomain});
		from.incrRefcnt();
		this.setMorphism(from, to);
		from.update();
		domain.addSVG();
		codomain.addSVG();
		from.addSVG();
		return from;
	}
	productAssembly(e)
	{
		const code = this.selected.map(m => m.to.codomain.name).join(Cat.basetypes.operators.product.symCode);
		let codomain = this.getObjectByCode(code);
		if (codomain === null)
			codomain = this.newObject({code});
		const args = {domain:this.mapObject(this.getSelected().domain).name, morphisms:this.selected.map(m => m.to.name)};
		const data = productAssemblyMorphism.form(args.morphisms.map(m => this.getMorphism(m)));
		let m = this.getMorphism(data.name);
		if (m === null)
			m = new productAssemblyMorphism(this, args);
		m.incrRefcnt();
		const name = this.getSelected().domain.name;
		this.removeSelected();
		this.objectPlaceMorphism(e, 'domain', name, m.name);
	}
	coproductAssembly(e)
	{
		const code = this.selected.map(m => m.to.domain.name).join(Cat.basetypes.operators.coproduct.symCode);
		let domain = this.getObjectByCode(code);
		if (domain === null)
			domain = this.newObject({code});
		const args = {codomain:this.mapObject(this.getSelected().codomain).name, morphisms:this.selected.map(m => m.to.name)};
		const data = coproductAssemblyMorphism.form(args.morphisms.map(m => this.getMorphism(m)));
		let m = this.getMorphism(data.name);
		if (m === null)
			m = new coproductAssemblyMorphism(this, args);
		m.incrRefcnt();
		const name = this.getSelected().codomain.name;
		this.removeSelected();
		this.objectPlaceMorphism(e, 'codomain', name, m.name);
	}
	pullback(e)
	{
		if (this.codomain.hasForm(this.selected).sink)
		{
			const cod = this.getSelected().codomain;
			const domPb = this.domain.pullback(this.selected);
			const codMorphs = this.selected.map(m => m.to);
			const bxy = Cat.barycenter(this.getAttachedObjects('codomain'));
			const xy = D2.scale(2, D2.subtract(bxy, cod));
//??			const dom = new object(this, morphs[0].domain, xy);
//??			for(let i=0; i<morphs.length; ++i)
//??				new morphism(this, morphs[i], dom, morphs[i].domain);
			this.addSelected(e, dm, true);
		}
	}
	deselectAll(toolbarOff = true)
	{
		Cat.display.panel.close('data');
		if (toolbarOff)
			Cat.display.deactivateToolbar();
		this.selected.map(elt => elt.showSelected(false));
		this.selected = [];
	}
	getObjectMorphisms(obj)
	{
		let doms = [];
		let cods = [];
		for(const [fromMorph, toMorph] of this.morphisms)
		{
			if (fromMorph.domain.isEquivalent(obj))
				doms.push(fromMorph);
			if (fromMorph.codomain.isEquivalent(obj))
				cods.push(fromMorph);
		}
		return {doms:doms, cods:cods};
	}
	checkFusible(pnt)
	{
		if (this.selected.length == 1)
		{
			let elt = this.getSelected();
			let melt = elt.isEquivalent(Cat.display.mouseover) ? null : Cat.display.mouseover;
			if (elt.class === 'object')
			{
				if (melt != null && melt.class === 'object')
				{
					if (this.canFuseObjects(elt, melt))
					{
						elt.svg().classList.remove('selected');
						elt.svg().classList.add('fusible');
					}
				}
				else
				{
					elt.svg().classList.remove('fusible');
					elt.svg().classList.add('selected');
				}
			}
			else if (elt.class === 'morphism')
			{
				if (melt != null && melt.class === 'morphism' && this.canProductMorphisms(elt, melt))
					elt.showFusible(true);
				else
					elt.showFusible(false);
			}
		}
	}
	findElement(pnt, except = '')
	{
		let elt = null;
		Cat.display.topSVG.querySelectorAll('.object').forEach(function(o)
		{
			if (o.dataset.name === except)
				return;
			const bbox = o.getBBox();
			const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
			if (inside(bbox, pnt, upperRight))
				elt = this.domain.getObject(o.dataset.name);
		}, this);
		if (elt === null)
			Cat.display.topSVG.querySelectorAll('.morphTxt').forEach(function(o)
			{
				if (o.dataset.name === except)
					return;
				const bbox = o.getBBox();
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (inside(bbox, pnt, upperRight))
					elt = this.domain.getMorphism(o.dataset.name);
			}, this);
		const morphisms = Cat.display.topSVG.querySelectorAll('.morphism');
		if (elt === null)
			morphisms.forEach(function(m)
			{
				if (m.dataset.name === except)
					return;
				const bbox = m.getBBox();
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (segmentDistance(pnt, bbox, upperRight) < 5)
					elt = this.domain.getMorphism(m.dataset.name);
			}, this);
		return elt;
	}
	canFuseObjects(dragFrom, targetFrom)
	{
		if (dragFrom.class === 'object')
		{
			const dragTo = this.mapObject(dragFrom);
			const targetTo = this.mapObject(targetFrom);
			if ((dragTo.isInitial && !targetTo.isInitial) || (!dragTo.isInitial && targetTo.isInitial))
				return false;
			const morphs = this.getObjectMorphisms(dragFrom);
			if (morphs.doms.length === 0 && morphs.cods.length === 0)
				return true;
			const a = dragTo.code === targetTo.code && !dragFrom.isEquivalent(targetFrom);
			let b = false;
			if (morphs.cods.length > 0)
			{
				const to = morphs.cods[0].to;
				b = morphs.cods.length === 1 && morphs.doms.length === 0 && to.function === 'identity';
			}
			return a||b;
		}
		return false;
	}
	canProductMorphisms(v, w)
	{
		return this.codomain.hasProducts && v.class === 'morphism' && w.class === 'morphism' && this.isIsolated(v) && this.isIsolated(w);
	}
	static intersect(mor, bbox, side, m = Cat.default.arrow.margin)
	{
		let pnt = {x:0, y:0};
		const x = bbox.x - m;
		const y = bbox.y - m;
		const w = bbox.w + 2 * m;
		const h = bbox.h + 2 * m;
		switch(side)
		{
		case 'top':
			pnt = segmentIntersect(	x, y, x + w, y, mor.domain.x, mor.domain.y, mor.codomain.x, mor.codomain.y);
			break;
		case 'bottom':
			pnt = segmentIntersect(	x, y + h, x + w, y + h, mor.domain.x, mor.domain.y, mor.codomain.x, mor.codomain.y);
			break;
		case 'left':
			pnt = segmentIntersect(	x, y, x, y + h, mor.domain.x, mor.domain.y, mor.codomain.x, mor.codomain.y);
			break;
		case 'right':
			pnt = segmentIntersect(	x + w, y, x + w, y + h, mor.domain.x, mor.domain.y, mor.codomain.x, mor.codomain.y);
			break;
		}
		return pnt;
	}
	static updatePoint(p, c, basePoint)
	{
		return dist2(c, basePoint) < dist2(p, basePoint) ? c : p;
	}
	static closest(mor, bbox, pnt)
	{
		const pntTop = diagram.intersect(mor, bbox, 'top');
		const pntBtm = diagram.intersect(mor, bbox, 'bottom');
		const pntLft = diagram.intersect(mor, bbox, 'left');
		const pntRgt = diagram.intersect(mor, bbox, 'right');
		let r = {x:Number.MAX_VALUE, y:Number.MAX_VALUE};
		if (pntTop != false)
			r = diagram.updatePoint(pntTop, r, pnt);
		if (pntBtm != false)
			r = diagram.updatePoint(pntBtm, r, pnt);
		if (pntLft != false)
			r = diagram.updatePoint(pntLft, r, pnt);
		if (pntRgt != false)
			r = diagram.updatePoint(pntRgt, r, pnt);
		if (r.x === Number.MAX_VALUE)
			r = {x:pnt.x, y:pnt.y};
		return r;
	}
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	compose(e)
	{
		const morphisms = this.selected.map(m => m.to);
		const morphNames = morphisms.map(m => m.name);
		const compositeName = Cat.basetypes.operators.compose.toName(morphNames);
		let to = null;
		if (!this.hasMorphism(compositeName))
			to = new composite(this.codomain, {diagram:this, codomain:morphisms[morphisms.length -1].codomain.name, domain:morphisms[0].domain.name, morphisms});
		else
			to = this.getMorphism(compositeName);
		const domain = this.selected[0].domain;
		const codomain = this.selected[this.selected.length -1].codomain;
		const from = new diagramMorphism(this.domain, {diagram:this, domain:this.selected[0].domain.name, codomain:this.selected[this.selected.length -1].codomain.name, morphisms:this.selected});
		from.incrRefcnt();
		this.setMorphism(from, to);
		from.addSVG();
		this.update(e, 'morphism', from, true);
	}
	addTerm(t)
	{
		this.terms.push(t);	// TODO lots of validation
	}
	deleteTerm(ndx)
	{
		this.terms.splice(ndx, 1);
	}
	run(e)
	{
		const from = this.getSelected();
		const isThreeD = from.to.codomain.name === 'threeD';
		const isTty = from.to.codomain.name === 'tty';
		if (from.class === 'morphism' && this.isRunnable(from))
		{
			const start = Date.now();
			if (isThreeD)
			{
				Cat.display.panel.open('threeD');
				Cat.display.threeD.resizeCanvas();
			}
			const toResult = this.codomain.run(from.to, this);
			if (isThreeD)
				Cat.display.threeD.view('front');
			if (toResult !== null)
			{
				const fromResult = new diagramMorphism(this.domain, {diagram:this, domain:from.domain.name, codomain:from.codomain.name});
				fromResult.incrRefcnt();
				this.setMorphism(fromResult, toResult);
				fromResult.addSVG();
				this.addSelected(e, fromResult, true);
			}
			if (isTty)
			{
				Cat.display.panel.open('tty');
				Cat.display.accordion.open('ttyOutPnl');
			}
			const delta = Date.now() - start;
			Cat.status(e, `<br/>Elapsed ${delta}ms`);
		}
		Cat.display.drag = false;
	}
	isRunnable(m)
	{
		return m.to.isRunnable();
	}
	makeHomSets()
	{
		this.domain.makeHomSets();
		this.codomain.makeHomSets();
		this.references.map(r =>
		{
			r.domain.addHomSets(this.domain.homSets, this.domain.obj2morphs);
			r.codomain.addHomSets(this.codomain.homSets, this.codomain.obj2morphs);
		});
	}
	addFactor(id, fname, root, action, ...indices)
	{
		let div = document.getElementById(id);
		if (div.innerHTML === '')
			div.innerHTML = H.span(Cat.display.getButton('edit', `Cat.getDiagram().${fname}(evt)`, 'Create morphism'));
		let expr = this.getObject(root).expr;
		let sub = indices.join();
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
			{
				expr = this.getObject('One').expr;
				sub = '';
				break;
			}
			if ('token' in expr)
				expr = this.getObjectByExpr(expr).expr;
			expr = expr.data[k];
		}
		div.innerHTML += H.button(this.getObjectByExpr(expr).getText() + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="Cat.H.del(this);${action}"`);
	}
	static getFactorsById(id)
	{
		const btns = document.getElementById(id).querySelectorAll('button');
		let factors = [];
		btns.forEach(function(b)
		{
			factors.push(JSON.parse(`[${b.dataset.indices}]`));
		});
		if (factors.length === 0)
			throw 'No factors for factor morphism.';
		return factors;
	}
	static getFactorsByDomCodId(id)
	{
		const btns = document.getElementById(id).querySelectorAll("button");
		let factors = [];
		btns.forEach(function(b)
		{
			factors.push(b.dataset.factor.split(' ').map(f => Number.parseInt(f)));
		});
		return factors;
	}
	addFactorMorphism(domain, factors)
	{
		let d = factorMorphism.form(this, domain, factors);
		let m = this.getMorphism(d.name);
		if (m === null)
			m = new factorMorphism(this, {domain:domain.name, factors});
		else
			m.incrRefcnt();
		return m;
	}
	selectedFactorMorphism(e)
	{
		const m = this.addFactorMorphism(this.mapObject(this.getSelected()), diagram.getFactorsById('codomainDiv'));
		this.objectPlaceMorphism(e, 'domain', this.getSelected().name, m.name)
	}
	js(foundDiagram = {})
	{
		let js = '';
		for (let i=0; i<this.references.length; ++i)
		{
			const r = this.references[i];
			if (r.name in foundDiagram)
				continue;
			js += r.js(foundDiagram);
			foundDiagram[r.name] = true;
		}
		const jsName = this.name.replace('-', '_');
		js +=
`
class ${jsName} extends diagram
{
	constructor()
	{
		super();
		this.name = '${jsName}';
		this.cid = '${this.cid}';
		this.references = [${this.references.map(r => 'diagrams.' + r.name).join()}];
`;
		let foundMorphism = {};
		for(const [name, mor] of this.codomain.morphisms)
			if (!(mor.name in foundMorphism))
			{
				js += mor.js();
				foundMorphism[mor.name] = true;
			}
		js +=
`	}
}
`;
		return js;
	}
	placeMultipleMorphisms(morphs)
	{
		let xyDom = {x: 300, y:4 * Cat.default.font.height};
		let xyCod = {x: 600, y:4 * Cat.default.font.height};
		morphs.map(morphData =>
		{
			const args = Cat.clone(morphData);
			args.diagram = this.name;
			return morphism.process(this.codomain, this, args);
		}).
		map(m =>
		{
			this.placeMorphism(null, m, xyDom, xyCod);
			xyDom.y += 4 * Cat.default.font.height;
			xyCod.y += 4 * Cat.default.font.height;
			return null;
		});
	}
	hasObject(name)
	{
		if (this.codomain.hasObject(name))
			return true;
		for (let i=0; i<this.references.length; ++i)
			if (this.references[i].hasObject(name))
				return true;
		return false;
	}
	getObject(name, extended=true)
	{
		let obj = this.codomain.getObject(name, null, extended);
		if (obj === null)
			for (let i=0; i<this.references.length; ++i)
			{
				let r = this.references[i];
				obj = r.getObject(name, null, extended);
				if (obj !== null)
					return obj;
			}
		return obj;
	}
	getMorphism(name)
	{
		let m = null;
		for (let i=0; i<this.references.length; ++i)
		{
			m = this.references[i].getMorphism(name);
			if (m !== null)
				return m;
		}
		return this.codomain.getMorphism(name);
	}
	hasMorphism(name)
	{
		for (let i=0; i<this.references.length; ++i)
			if (this.references[i].hasMorphism(name))
				return true;
		if (this.codomain.hasMorphism(name))
			return true;
		return false;
	}
	getObjectByExpr(expr, extended = false)
	{
		const codename = element.codename(this, expr, true, extended);
		let obj = this.getObject(codename);
		if (obj === null)
			obj = this.newObject({code:element.getCode(this, expr, true, extended)});
		return obj;
	}
	getFactor(obj, ...indices)
	{
		let fctr = obj.expr;
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return this.getObject('One');
			if ('data' in fctr)
				fctr = fctr.data[k];
			else
			{
				const obj = this.getObjectByExpr(fctr);
				fctr = obj.expr.data[k];
			}
		}
		return this.getObjectByExpr(fctr);
	}
	getObjectByCode(code)
	{
		return this.getObject(element.codename(this, this.codomain.parseObject(code)));
	}
	newObject(args)
	{
		const goodName = 'name' in args && args.name !== null && args.name !== '';
		if (goodName)
		{
			const obj = this.getObject(args.name);
			if (obj !== null)
				return obj;
		}
		if ('code' in args)
		{
			const obj = this.getObjectByCode(args.code);
			if (obj !== null)
			{
				if (goodName)
				{
					// TODO this has *got* to go
					if (obj.name === args.name)
						return obj;
				}
				else
					return obj;
			}
		}
		const nuArgs = Cat.clone(args);
		nuArgs.diagram = this;
		const obj = new object(this.codomain, nuArgs);
		const codename = element.codename(this, obj.expr);
		return obj;
	}
	validateAvailableObject(name)
	{
		return name !== '' && !this.hasObject(name);
	}
	validateAvailableMorphism(name)
	{
		return name !== '' && !this.hasMorphism(name);
	}
	getIdentityMorphism(objName)
	{
		return this.hasMorphism(objName) ? this.getMorphism(objName) : $Cat.getTransform(`id-${this.codomain.name}`).$(this, this.getObject(objName));
	}
	newDataMorphism(dom, cod)
	{
		return new dataMorphism(this.codomain, {name:this.codomain.getAnon('Data'), diagram:this.name, domain:dom.name, codomain:cod.name});
	}
	updateObjectTableRows(pnlName)
	{
		let found = {};
		let objects = [];
		for (const [k, obj] of this.codomain.objects)
			if (!(obj.name in found))
			{
				objects.push(obj);
				found[obj.name] = true;
			}
		for (const [k, obj] of this.objects)
			if (!(obj.name in found))
			{
				objects.push(obj);
				found[obj.name] = true;
			}
		document.getElementById(pnlName).innerHTML = H.table(objects.map(o => H.tr(H.td(o.getText()), 'grabbable sidenavRow', '', Cat.cap(o.description),
						`draggable="true" ondragstart="Cat.display.object.drag(event, '${o.name}')"`)).join(''));
	}
	updateMorphismTableRows(pnlName)
	{
		let html = '';
		let found = {}
		let morphisms = [];
		for (const [k, m] of this.morphisms)
		{
			if (m.name in found)
				continue;
			found[m.name] = true;
			html += H.tr(
							H.td(m.refcnt === 1 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeMorphism(evt, '${k.name}')`, 'Delete morphism') : '', 'buttonBar') +
							H.td(m.getText()) +
							H.td(m.domain.getText()) +
							H.td('&rarr;') +
							H.td(m.codomain.getText()), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${m.name}')"`);
		}
		for (const [k, m] of this.codomain.morphisms)
		{
			if (m.name in found)
				continue;
			found[m.name] = true;
			html += H.tr(
							H.td(m.refcnt === 1 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeCodomainMorphism(evt, '${m.name}');`, 'Delete dangling codomain morphism') :
								'', 'buttonBar') +
							H.td(m.getText()) +
							H.td(m.domain.getText()) +
							H.td('&rarr;') +
							H.td(m.codomain.getText()), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${m.name}')"`);
		}
		document.getElementById(pnlName).innerHTML = H.table(html);
	}
	makeAllSVG()
	{
		let svg = '';
		for (const [o1, o2] of this.objects)
			try
			{
				svg += o1.makeSVG();
			}
			catch(e)
			{
				Cat.recordError(e);
			}
		for (const [from, m2] of this.morphisms)
			try
			{
				svg += from.makeSVG();
			}
			catch(e)
			{
				Cat.recordError(e);
			}
		svg += this.texts.map(t => t.makeSVG());
		return svg;
	}
	setupDiagramElementPnl(pnl, updateFnName)
	{
		let pnlName = this.name + pnl;
		return Cat.display.accordionPanelDyn(this.getText(), `Cat.getDiagram('${this.name}').${updateFnName}('${pnlName}')`, pnlName);
	}
	upload(e, fn = null)
	{
		if (Cat.user.status === 'logged-in')
		{
			document.getElementById('diagramUploadBtn').classList.add('vanish');
			const start = Date.now();
			Cat.Amazon.ingestDiagramLambda(e, this, function(err, data)
			{
				if (err)
					alert(err.message);
				const delta = Date.now() - start;
				Cat.status(e, `Uploaded diagram.<br/>Elapsed ${delta}ms`);
			});
		}
		else
			Cat.recordError('You need to be logged in to upload your work.');
	}
	guiDetach(e, dir)
	{
		try
		{
			const from = this.getSelected();
			const obj = from[dir];
			const detachedObj = new diagramObject(this.domain, {diagram:this, xy:{x:obj.x + Cat.default.toolbar.x, y:obj.y + Cat.default.toolbar.y}});
			detachedObj.incrRefcnt();
			obj.decrRefcnt();
			from[dir] = detachedObj;
			this.setObject(detachedObj, from.to[dir]);
			detachedObj.incrRefcnt();
			detachedObj.addSVG();
			from.update();
			this.update(e, '', null, true)
			Cat.display.deactivateToolbar();
			Cat.display.activateToolbar(e);
		}
		catch(x)
		{
			Cat.recordError(x);
		}
	}
	userToDiagramCoords(xy, orig = false)
	{
		const pos = Cat.display.topSVG.getBoundingClientRect();
		const s = 1.0 / this.viewport.scale;
		return {x:s * (xy.x - pos.left - (orig ? this.viewport.orig.x : this.viewport.x)), y:s * (xy.y - pos.top - (orig ? this.viewport.orig.y : this.viewport.y))};
	}
	diagramToUserCoords(xy)
	{
		const pos = Cat.display.topSVG.getBoundingClientRect();
		const s = this.viewport.scale;
		return {x:s * xy.x + pos.left + this.viewport.x, y:s * xy.y + pos.top + this.viewport.y};
	}
	mousePosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
	}
	home()
	{
		Cat.display.deactivateToolbar();
		this.viewport.x = 0;
		this.viewport.y = 0;
		this.viewport.scale = 1;
		this.setView();
		this.saveToLocalStorage();
	}
	updateElementAttribute(from, to, attr, val)
	{
		switch(from.class)
		{
		case 'element':
			from[attr] = val;
			const svg = from.svg();
			if (attr === 'html')
				svg.outerHTML = from.makeSVG();
			Cat.display.element.update();	// TODO where else could this go?
			break;
		case 'object':
		case 'morphism':
			if (to)
			{
				to[attr] = val;
				if (attr === 'name')
				{
					let svg = from.class === 'morphism' ? from.svg('_name') : from.svg();
					if (svg)
						svg.innerHTML = to[attr];
				}
			}
			break;
		}
	}
	editElementText(id, attr)
	{
		const h = document.getElementById(id);
		if (h.contentEditable === 'true' && h.textContent !== '' && !this.readonly)
		{
			const from = this.getSelected();
			const to = this.mapElement(from);
			h.contentEditable = false;
			this.updateElementAttribute(from, to, attr, h.innerText);
			this.elementHelp();
			from.showSelected();
			this.saveToLocalStorage();
		}
		else
		{
			h.contentEditable = true;
			h.focus();
		}
	}
	clearDataMorphism()
	{
		const from = this.getSelected();
		if (from.to.subClass === 'dataMorphism')
		{
			document.getElementById('dataPnl').innerHTML = '';
			from.to.clear();
			this.saveToLocalStorage();
		}
	}
	updateMorphisms()
	{
		for(const [from, to] of this.morphisms)
			from.update(this);
	}
	isIsolated(elt)
	{
		let r = false;
		if (elt.class === 'object')
			r = elt.refcnt === 1;
		else if (elt.class === 'morphism')
		{
			const domMorphs = this.domain.obj2morphs.get(elt.domain);
			const codMorphs = this.domain.obj2morphs.get(elt.codomain);
			r = domMorphs.dom.length === 1 && domMorphs.cod.length === 0 && codMorphs.dom.length === 0 && codMorphs.cod.length === 1;
		}
		return r;
	}
	getHomDomain(elt)
	{
		let obj = this.getObjectByExpr(elt.expr);
		return ('op' in obj.expr && obj.expr.op === 'hom') ? this.getObjectByExpr(obj.expr.lhs) : null;
	}
	getHomCodomain(elt)	// used in CatFn.js
	{
		let obj = this.getObjectByExpr(elt.expr);
		return ('op' in obj.expr && obj.expr.op === 'hom') ? this.getObjectByExpr(obj.expr.rhs) : null;
	}
	getProductFactors(elt)
	{
		let obj = this.getObjectByExpr(elt.expr);
		let factors = [];
		factors = 'op' in obj.expr && obj.expr.op === 'product' && obj.expr.data.map(x => this.getObjectByExpr(x));
		return factors;
	}
	canEvaluate(elt)
	{
		if (!this.codomain.isClosed)
			return false;
		let obj = this.getObjectByExpr(elt.expr);
		let factors = this.getProductFactors(obj);
		if (factors !== null && factors.length == 2)
		{
			const homDomain = this.getHomDomain(factors[0]);
			if (homDomain !== null)
				return homDomain.code === factors[1].code;	// TODO === code or isEquivalent?
		}
		return false;
	}
	selectedCanRecurse()
	{
		let r = false;
		if (this.selected.length == 2)
		{
			const sel0 = this.mapElement(this.selected[0]);
			const sel1 = this.mapElement(this.selected[1]);
			if (sel0 && sel1 && sel0.class === 'morphism' && sel1.class === 'morphism')
			{
				const domain = sel0.domain;
				r = sel0.domain.isEquivalent(sel1.domain) &&
					sel0.codomain.isEquivalent(sel1.codomain) &&
					sel0.subClass === 'dataMorphism' &&
					sel1.subClass === 'composite' &&
					sel1.hasMorphism(sel0);
				const N = this.getObject('N');
				if (r && N)
				{
					if (sel0.domain.isEquivalent(N))
						return true;
					r = 'op' in domain.expr &&
						domain.expr.op === 'product' &&
						domain.expr.data.length === 3 &&
						N.isEquivalent(this.getObjectByExpr(domain.expr.data[0]));
					if (r)
					{
						const factor1 = this.getObjectByExpr(domain.expr.data[1]);
						const factor2 = this.getObjectByExpr(domain.expr.data[2]);
						r = factor1.expr.op === 'hom' &&
							factor2.isEquivalent(this.getObjectByExpr(factor1.expr.lhs)) &&
							factor2.isEquivalent(this.getObjectByExpr(factor1.expr.rhs));
					}
				}
			}
		}
		return r;
	}
	recursion(e)
	{
		if (this.selectedCanRecurse())
		{
			const sel0 = this.selected[0].to;
			const sel1 = this.selected[1].to;
			sel0.setRecursor(sel1);
			this.saveToLocalStorage();
			Cat.status(e, `Recursor for ${sel0.getText()} has been set`);
		}
	}
	removeMorphism(e, name)
	{
		const m = this.domain.getMorphism(name);
		if (m !== null)
		{
			m.decrRefcnt();
			this.updateMorphismTableRows(`${this.name}_MorPnl`);
			this.update(e);
			this.saveToLocalStorage();
		}
	}
	removeCodomainMorphism(e, name)
	{
		const m = this.codomain.getMorphism(name);
		if (m !== null)
		{
			m.decrRefcnt();
			this.updateMorphismTableRows(`${this.name}_MorPnl`);
			this.update(e);
			this.saveToLocalStorage();
		}
	}
	getElement(name)
	{
		try
		{
			let elt = this.texts.filter(t => t.name === name);
			if (elt)
				return elt[0];
			elt = this.domain.getObject(name);
			if (elt)
				return elt;
			elt = this.domain.getMorphism(name);
			return elt;
		}
		catch(e)
		{
			Cat.recordError(e);
		}
	}
	toggleTableMorphism(e, id, name)
	{
		const elt = document.getElementById(id);
		const trs = elt.querySelectorAll('tr');
		for (let i=0; i< trs.length; ++i)
		{
			const tr = trs[i];
			if (tr !== e.currentTarget)
				tr.classList.remove('selRow');
		}
		e.currentTarget.classList.toggle('selRow');
		e.currentTarget.classList.toggle('sidenavRow');
	}
	showStrings(e)
	{
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
		let exist = false;
		for(const [from, to] of this.morphisms)
			exist = stringMorphism.removeStringSvg(from) || exist;
		if (exist)
			return;
		for(const [from, to] of this.morphisms)
			this.showString(from);
		this.update(e, '', null, false, false);
	}
	getHomSet(dom, cod)
	{
		let morphs = [];
		for(const [key, m] of this.morphisms)
		{
			if ((m.domain.name === dom.name || m.domain.code === dom.code) && (m.codomain.name === cod.name || m.codomain.code === cod.code))
				morphs.push(m);
		}
		this.references.map(r =>
		{
			for(const [key, m] of r.morphisms)
			{
				if ((m.domain.name === dom.name || m.domain.code === dom.code) && (m.codomain.name === cod.name || m.codomain.code === cod.code))
					morphs.push(m);
			}
		});
		return morphs;
	}
	getProductName(obj)
	{
		const code = `(${obj.code})*(${obj.code})`;
		return element.codename(this, this.codomain.parseObject(code));
	}
	addWindowSelect(e)
	{
		const p = this.userToDiagramCoords(Cat.mouse.down);
		const q = this.userToDiagramCoords(Cat.mouse.xy);
		this.texts.map(t =>
		{
			if (inside(p, t, q))
				this.addSelected(e, t);
		});
		this.domain.objects.forEach(function(o)
		{
			if (inside(p, o, q))
				this.addSelected(e, o);
		}, this);
		this.domain.morphisms.forEach(function(m)
		{
			if (inside(p, m.domain, q) && inside(p, m.codomain, q))
				this.addSelected(e, m);
		}, this);
	}
	getTextElement(name)
	{
		return this.texts[this.texts.indexOf(name)];
	}
	static functionBody(type, name, functions)
	{
		let funText = functions[name].toString();
		funText = funText.replace(new RegExp(name), 'function');
		return `CatFns.${type}['${name}'] = ${funText};\n`;
	}
	downloadJS()
	{
		let js =
`//
// Catelitical version of ${this.user}'s diagram ${this.basename} for Ecmascript
//
// Date: ${Date()}
// CID:  ${this.cid}
//
const CatFns = {function:{}, functor:{}, transform:{}, util:{}};

`;
		Object.keys(CatFns.function).forEach(function(name)
		{
			if (name === 'ttyOut')
				js += `CatFns.function['ttyOut'] = function(args)\n\t\t{\n\t\t\tconsole.log(args);\n\t\t\treturn null;\n\t\t};`;
			else
				js += diagram.functionBody('function', name, CatFns.function);
		});
		Object.keys(CatFns.util).forEach(function(name)
		{
			js += diagram.functionBody('util', name, CatFns.util);
		});
		js = js.replace(/\r/g, '');
		js +=
`
class diagram
{
	constructor()
	{
		this.morphisms = new Map();
		this.references = [];
	}
	getMorphism(name)
	{
		let m = null;
		for (let i=0; i<this.references.length; ++i)
		{
			const r = this.references[i];
			m = r.getMorphism(name);
			if (m)
				return m;
		}
		return this.morphisms.has(name) ? this.morphisms.get(name) : null;
	}
}
`;
		let found = {};
		js += this.js(found);
		found[this.name] = true;
		js += 'const diagrams = {};\n';
		Object.keys(found).forEach(function(d)
		{
			js += `diagrams['${d}'] = \tnew ${d}();\n`;
		});
		js += `
function getDiagram()
{
	return diagrams.${this.name};
}
`;
		const blob = new Blob([js], {type:'application/json'});
		const url = Cat.url.createObjectURL(blob);
		Cat.download(url, `${this.name}.js`);
	}
	downloadPNG()
	{
		Cat.svg2canvas(Cat.display.topSVG, this.name, Cat.download);
	}
	baseURL(ext = '.json')
	{
		return `${this.username}/${this.basename}${ext}`;
	}
	static cateconGetUserDiagrams(fn)
	{
		const params =
		{
			FunctionName:	'CateconGetUserDiagrams',
			InvocationType:	'RequestResponse',
			LogType:		'None',
			Payload:		JSON.stringify({username:Cat.user.name}),
		};
		Cat.Amazon.lambda.invoke(params, function(error, data)
		{
			if (error)
			{
				Cat.recordError(error);
				return;
			}
			const payload = JSON.parse(data.Payload);
			payload.Items.map(i => Cat.serverDiagrams[i.subkey.S] = {timestamp:Number.parseInt(i.timestamp.N), description:i.description.S, fancyName:i.fancyName.S});
			Cat.display.diagram.setUserDiagramTable();
			if (fn)
				fn(payload.Items);
		});
	}
	getReferenceCounts(refs = {})
	{
		this.references.map(r =>
		{
			if (r.name in refs)
				refs[r.name] = 1 + refs[r.name];
			else
				refs[r.name] = 1;
			r.getReferenceCounts(refs);
		});
		return refs;
	}
	isExprInDiagram(expr, dgrm)
	{
		const obj = this.getObjectByExpr(expr);
		return obj.diagram.name === dgrm;
	}
	canRemoveReferenceDiagram(name)
	{
		const ref = Cat.getDiagram(name);
		for(const [name, elt] of this.objects)
			if (element.hasDiagramElement(dgrm, elt.expr, true, null))
				return false;
		for(const [name, elt] of this.morphisms)
			if (element.hasDiagramElement(dgrm, elt.expr, true, null))
				return false;
		return true;
	}
	removeReferenceDiagram(e, name)
	{
		if (this.canRemoveReferenceDiagram(name))
		{
			for (let i=0; i<this.references.length; ++i)
				if (this.references[i].name === name)
				{
					this.references.splice(idx, 1);
					this.setReferencesDiagramTable()
					Cat.status(`Reference diagram ${name} removed`);
					break;
				}
		}
		else
			Cat.status(`Reference diagram ${name} cannot be removed since references to it still exist`);
	}
	addReferenceDiagram(e, name, silent = true)
	{
		const dgrm = Cat.getDiagram(name);
		const idx = this.references.indexOf(dgrm);
		if (idx >= 0)
		{
			const refs = {};
			const dgrms = dgrm.getReferenceCounts(refs);
			Objects.keys(dgrms).map(r => this.addReferenceDiagram(e, r.name, true));
			this.references.unshift(dgrm);
			if (!silent)
			{
				this.setReferencesDiagramTable()
				Cat.status(`Reference diagram ${name} is now referenced.`);
			}
		}
		else
			if (!silent)
				Cat.status(`Reference diagram ${name} is already referenced.`);
	}
	hasReference(name)
	{
//		return this.references.indexOf(Cat.getDiagram(name)) > -1;
		return this.references.filter(d => d.name === name).length > 0;
	}
}

let PFS = null;
let Graph = null;

Cat.initialize();	// boot-up

if (!isGUI)
{
	exports.Amazon =				Cat.Amazon;
	exports.default =				Cat.default;
	exports.deleteLocalDiagram =	Cat.deleteLocalDiagram;
	exports.diagrams =				Cat.diagrams;
	exports.sep =					Cat.sep;
	exports.user =					Cat.user;
	exports.$Cat =					$Cat;
	exports.PFS =					PFS;
	exports.Graph =					Graph;

	exports.diagram =				diagram;
	exports.element =				element;
	exports.object =				object;
	exports.morphism =				morphism;
	exports.stringMorphism =		stringMorphism;
}
else
{
	window.Cat			= Cat;
	Cat.element			= element;
	Cat.morphism		= morphism;
	Cat.stringMorphism	= stringMorphism;
	Cat.H				= H;
}
})(typeof exports === 'undefined' ? this['Cat'] = this.Cat : exports);
