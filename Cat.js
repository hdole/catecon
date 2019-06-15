// (C) 2018-2019 Harry Dole
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
	var zlib = null;
	AWS = require('aws-sdk');
	// TODO how to do this for AWS Lambda?
//	if (typeof AmazonCognitoIdentity === 'undefined')
//		ACI = require('amazon-cognito-identity-js');
	sjcl = require('./sjcl.js');
	CatFns = require('./CatFns.js');
	zlib = require('./zlib_and_gzip.min.js');
	var crypto = require('crypto');
}
else
{
	var CatFns = window.CatFns;
	var AWS = window.AWS;
	var sjcl = window.sjcl;
	var zlib = window.zlib;
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
	static input(h, c, i, t, x) {return `<input id="${i}" class="${c}" type="${t}" value="${h}" placeholder="${x.ph}" ${'x' in x ? x.x : ''}/>`;}
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
	secret:			'0afd575e4ad6d1b5076a20bf53fcc9d2b110d3f0aa7f64a66f4eee36ec8d201f',
	sep:			'-',
	serverDiagrams:	{},
	statusXY:		{x:0, y:0},
	user:			{name:'Anon', email:'', status:'unauthorized'},	// TODO fix after bootstrap removed
	userNameEx:		RegExp('^[a-zA-Z_-]+[a-zA-Z0-9_]*$'),
	mouse:			{down:{x:0, y:0}, xy:{x:0, y:0}},
	textDisplayLimit:	60,
	uploadLimit:	1000000,
	url:			'',
	intro()
	{
		let btns = '';
		for (const b in Cat.display.svg.buttons)
			btns += Cat.display.getButton(b);
		let html = H.h1('Catecon') +
					H.div(
						H.small('The Categorical Console', 'italic underline bold') + H.br() +
						H.small('Shareable Executable Diagrams') +
						H.table(H.tr(H.td(H.a('Blog', 'intro', '', '', 'href="https://harrydole.com/wp/tag/catecon/"'))), 'center') +
						H.h4('Extreme Alpha Edition') +
						H.small('Breaks and you lose all your stuff', 'italic txtCenter') + H.br() +
						H.h4('Catecon Uses Cookies') +
						H.small('Your diagrams and those of others downloaded are stored as cookies as well as authentication tokens and user preferences.', 'italic') +
						H.p('Accept cookies by entering the categorical access code below:', 'txtCenter') +
						H.table((!!window.chrome ?
									H.tr(H.td(H.input('', '', 'cookieSecret', 'text', {ph:'????????', x:'size="6"'}))) +
									H.tr(H.td(H.button('OK', '', '', '', 'onclick=Cat.cookieAccept()'))) :
									H.tr(H.td(H.h4('Use Chrome to access', 'error')))), 'center') +
//						H.table(btns.map(row => H.tr(row.map(b => H.td(Cat.display.getButton(b))).join(''))).join(''), 'buttonBar center') +
						H.table(H.tr(H.td(btns)), 'buttonBar center') +
						H.span('', '', 'introPngs') + '<br/>' +
						H.table(H.tr(H.td(H.small('&copy;2018-2019 Harry Dole'), 'left') + H.td(H.small('harry@harrydole.com', 'italic'), 'right')), '', 'footbar')
					, 'txtCenter');
		return html;
	},
	random()
	{
		const ary = new Uint8Array(16);
		isGUI ? window.crypto.getRandomValues(ary) : crypto.randomFillSync(ary);
		let cid = '';
		for (let i=0; i<16; ++i)
			cid += ary[i].toString(16);
		return Cat.sha256(cid);
	},
	getUserSecret(s)
	{
		return Cat.sha256(`TURKEYINTHESTRAW${s}THEWORLDWONDERS`);
	},
	cookieAccept()
	{ if (Cat.secret !== Cat.getUserSecret(document.getElementById('cookieSecret').value))
		{
			alert('Your secret is not good enough');
			return;
		}
		localStorage.setItem('CateconCookiesAccepted', JSON.stringify(Date.now()));
		const intro = document.getElementById('intro');
		intro.parentNode.removeChild(intro);
		Cat.initialize();	// boot-up
		Cat.Amazon.onCT();
	},
	hasAcceptedCookies()
	{
		return isGUI && localStorage.getItem('CateconCookiesAccepted') !== null;
	},
	getError(err)
	{
		return typeof err === 'string' ? err : err.message;
	},
	recordError(err)
	{
		let txt = Cat.getError(err);
		console.log('Error: ', txt);
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
		if (typeof e === 'object')
		{
			s.style.left = `${e.clientX + 10}px`;
			s.style.top = `${e.clientY}px`;
			s.style.opacity = 1;
			s.style.display = 'block';
			Cat.statusXY = {x:e.clientX, y:e.clientY};
		}
		else
			Cat.recordError(msg);
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
				if (!(elt.name in elts))
					elts[elt.name] = elt;
				break;
			case 'morphism':
				if (!(elt.domain.name in elts))
					elts[elt.domain.name] = elt.domain;
				if (!(elt.codomain.name in elts))
					elts[elt.codomain.name] = elt.codomain;
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
		return Cat.hasLocalDiagram(dgrmName) || dgrmName in Cat.diagrams;
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
			dgrm = diagram.readLocal(dgrmName);
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
		if (!isGUI)
			return {};
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
		isGUI && localStorage.clear();
		if ($Cat !== null)
			Cat.getDiagram().deleteAll();
		Cat.localDiagrams = {};
	},
	clone(o)
	{
		if (null === o || 'object' !== typeof o || o instanceof element || o instanceof Blob)
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
		/*
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
		new transform(
		{
			name:	'fold-PFS',
			html:	'&nabla;',
			code:	'',
			transform:	'fold',
			domain:	'PFS',
			codomain:	'PFS',
			description:'Fold morphism on an object',
			testFunction:	function(dgrm, obj)
			{
				return obj.isSquared('coproduct');
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
		*/
// TODO restore		isGUI && this.fetchCategories(fn);	// TODO check for local TODO refresh flag
		fn();
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
	getLocalStorageDiagramName(cat)
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
			if (Cat.hasAcceptedCookies())
			{
				const intro = document.getElementById('intro')
				if (intro)
					intro.parentNode.removeChild(intro);
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
							const nuCat = new category({name:cat.name, code:cat.code, html:cat.properName, description:cat.description, sig:cat.sig});
							Cat.catalog[nuCat] = {};
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
		alert('Not implemented!');
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
		/*
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
				editable:		true,
				default:		null,
				$(string)
				{
					let f = Number.parseFloat(string);
					if (Number.isNaN(f))
						if (string === '')
							f = this.default;
						else
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
				default:		null,
				$(string)
				{
					let i = Number.parseInt(string);
					if (Number.isNaN(i))
						if (string === '')
							i = this.default;
						else
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
				default:		null,
				$(string)
				{
					let i = Number.parseInt(string);
					if (Number.isNaN(i) || i < 0)
						if (string === '')
							i = this.default;
						else
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
		*/
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
				let name = Cat.getLocalStorageDiagramName(cat);
				name = name === null ? diagram.genName(cat, Cat.user.name, 'Draft') : name;
				let dgrm = Cat.getDiagram(name);
				if (dgrm === null && diagram.readLocal(name) === null)
				{
					dgrm = new diagram({name, codomain:cat, code:name, html:'Draft', description:'Scratch diagram', user:Cat.user.name});
					dgrm.saveLocal();
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
			Cat.display.diagramSVG.innerHTML = dgrm.makeAllSVG();
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
		gridding:	true,
		mouseDown:	false,
		mouseover:	null,
		dragStart:	{x:0, y:0},
		topSVG:		null,
		diagramSVG:	null,
		showRefcnts:	true,
		showUploadArea:	false,
		snapWidth:	1024,
		snapHeight:	768,
		tool:		'select',	// select|pan
		statusbar:	null,
		id:			0,
		onEnter(e, fn)
		{
			if (e.key === 'Enter')
				fn(e);
		},
		width()
		{
			return isGUI ? window.innerWidth : 1024;
		},
		height()
		{
			return isGUI ? window.innerHeight : 768;
		},
		resize()
		{
			const dgrm = $Cat !== null ? Cat.getDiagram() : null;
			const scale = dgrm !== null ? dgrm.viewport.scale : 1.0;
			const w = scale > 1.0 ? Math.max(window.innerWidth, window.innerWidth / scale) : window.innerWidth / scale;
			const h = scale > 1.0 ? Math.max(window.innerHeight, window.innerHeight / scale) : window.innerHeight / scale;
			if ('topSVG' in this && this.topSVG)
			{
				this.topSVG.setAttribute('width', w);
				this.topSVG.setAttribute('height', h);
				this.uiSVG.setAttribute('width', w);
				this.uiSVG.setAttribute('height', h);
				this.upSVG.setAttribute('width', w);
				this.upSVG.setAttribute('height', h);
			}
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
			this.upSVG = document.getElementById('upSVG');
			this.upSVG.style.left = '0px';
			this.upSVG.style.top = '0px';
			this.resize();
			this.upSVG.style.display = Cat.display.showUploadArea ? 'block' : 'none';
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
							const to = from.to;
							Cat.display.fuseObject = new diagramObject(dgrm.domain, {diagram:dgrm, xy:pnt});
							dgrm.deselectAll();
							const fromMorph = new diagramMorphism(dgrm.domain, {diagram:dgrm, domain:from.name, codomain:Cat.display.fuseObject.name});
//							const id = dgrm.getIdentityMorphism(to.name);
							const id = identity.get(dgrm.codomain, to);
							fromMorph.incrRefcnt();
							dgrm.setMorphism(fromMorph, id);
							Cat.display.fuseObject.addSVG();
							fromMorph.addSVG();
							fromMorph.update();
							from = Cat.display.fuseObject;
							dgrm.addSelected(e, Cat.display.fuseObject);
							from.setXY(pnt);
							dgrm.saveLocal();
							dgrm.checkFusible(pnt);
						}
						else if (from.class === 'morphism')
						{
							dgrm.deselectAll();
							const dom = new diagramObject(dgrm.domain, {diagram:dgrm, xy:from.domain});
							const cod = new diagramObject(dgrm.domain, {diagram:dgrm, xy:from.codomain});
							const fromCopy = new diagramMorphism(dgrm.domain, {diagram:dgrm, domain:dom, codomain:cod});
							fromCopy.incrRefcnt();
							dgrm.setMorphism(fromCopy, from.to);
							fromCopy.update();
							dom.addSVG();
							cod.addSVG();
							fromCopy.addSVG();
							dgrm.addSelected(e, fromCopy);
							dgrm.saveLocal();
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
				const dgrm = Cat.getDiagram();
				const cat = dgrm.codomain;
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
									//
									// product
									//
									// TODO add coproduct, hom
									//
									let to = null;
									if (e.shiftKey && cat.coproducts)
										to = coproductObject.get(dgrm.codomain, [targetObject.to, dragObject.to]);
									else if (e.altKey && cat.closed)
										to = homObject.get(dgrm.codomain, [dragObject.to, targetObject.to]);
									else if (cat.cartesian)
										to = productObject.get(dgrm.codomain, [targetObject.to, dragObject.to]);
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
										if (morphs.cods.length === 1 && morphs.doms.length === 0 && from.to.subClass === 'identity' && !from.to.domain.isInitial)
										{
											const cod = dragObject.to;
											const toTargetObject = targetObject.to;
											if (cod.code !== toTargetObject.code)
											{
												//
												// TODO cat has terminal object
												//
												if (toTargetObject.isTerminal)
												{
													const to = $Cat.getTransform(`terminal-${dgrm.codomain.name}`).$(dgrm, from.to.domain);
													from.removeSVG();
													dgrm.setMorphism(from, to);
													from.addSVG();
												}
												//
												// TODO ability to convert identity to some morphism?
												//
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
									//
									// graph merge
									//
									for(const [from, to] of dgrm.morphisms)
									{
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
							//
							// TODO * is monoidal
							//
							else if (dgrm.codomain.hasProducts && dragObject.class === 'morphism' && targetObject.class === 'morphism' && dgrm.isIsolated(dragObject) && dgrm.isIsolated(targetObject))
							{
								dgrm.deselectAll();
								const dragMorphTo = dragObject.to;
								const targetMorphTo = targetObject.to;
								const morphisms = [targetMorphTo, dragMorphTo];
								const newTo = productMorphism.get(dgrm.codomain, morphisms);
								newTo.incrRefcnt();
								dgrm.placeMorphism(e, newTo, targetObject.domain, targetObject.codomain);
								dragObject.decrRefcnt();
								targetObject.decrRefcnt();
								targetObject.update();
							}
						}
					}
					if (!dgrm.readonly)
						dgrm.saveLocal();
				}
				else if (e.ctrlKey)
				{
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
			targetObject.to.incrRefcnt();
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
					to = dgrm.getObject(name);
					dgrm.setObject(from, to);
					break;
				case 'morphism':
					to = dgrm.getMorphism(name);
					if (to === null)
						throw `Morphism ${name} does not exist in category ${cat.getText()}`;
					const dom = new diagramObject(dgrm.domain, {diagram:dgrm, name:dgrm.domain.getAnon(), xy:pnt});
					const codLen = Cat.textWidth(to.domain.getText())/2;
					const domLen = Cat.textWidth(to.codomain.getText())/2;
					const namLen = Cat.textWidth(to.getText());
					const cod = new diagramObject(dgrm.domain, {diagram:dgrm, xy:{x:pnt.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4), y:pnt.y}});
					from = new diagramMorphism(dgrm.domain, {diagram:dgrm, domain:dom.name, codomain:cod.name});
					from.incrRefcnt();	// TODO ???
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
									H.span(Cat.display.getButton('edit', 'Cat.display.category.new()', 'Create new category')) + H.br() +
									H.span('', 'error', 'categoryError'), 'accordionPnl', 'newCategoryPnl');
				return html;
			},
			new()
			{
				try
				{
					document.getElementById('categoryError').innerHTML = '';
					const name = document.getElementById('categoryName').value;
					if (name === '')
						throw 'Category name must be specified.';
					if (!RegExp(Cat.userNameEx).test(name))
						throw 'Invalid category name.';
					let code = document.getElementById('categoryCode').value;
					code = code === '' ? name : code;
					new category($Cat, {name, code, html:document.getElementById('categoryHtml').value, description:document.getElementById('categoryDescription').value});
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
									H.td(Cat.display.downloadButton('LOG', `Cat.downloadString(document.getElementById('tty-out').innerHTML, 'text', 'console.log')`, 'Download tty log file'), 'buttonBar')), 'buttonBarLeft') +
								H.pre('', 'tty', 'tty-out'), 'accordionPnl', 'ttyOutPnl') +
							H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="Cat.display.accordion.toggle(this, \'errorOutPnl\')"`) +
							H.div(H.table(H.tr(
									H.td(Cat.display.getButton('delete', `document.getElementById('error-out').innerHTML = ''`, 'Clear errors')) +
									H.td(Cat.display.downloadButton('ERR', `Cat.downloadString(document.getElementById('error-out').innerHTML, 'text', 'console.err')`, 'Download error log file'), 'buttonBar')), 'buttonBarLeft') +
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
								const irx = 'regexp' in to.domain ? `pattern="${to.regexp}"`: '';
								const inputForm = Cat.display.input('', 'inputTerm', to.domain.getText(), irx);
								const outputForm = to.codomain.expr.inputCode();
								tbl = H.tr(H.td('Domain')) +
										H.tr(H.td(inputForm)) +
										H.tr(H.td('Codomain')) +
										H.tr(H.td(outputForm));
								html += H.div(H.table(tbl) + Cat.display.getButton('edit', `Cat.display.data.handler(evt, '${from.name}')`, 'Edit data'), 'accordionPnl', 'dataInputPnl');
								/*
								if (dgrm.codomain.isNumeric(to.codomain))
								{
									html += H.button('Add Range', 'sidenavAccordion', '', 'Add a range of entries to this map', `onclick="Cat.display.accordion.toggle(this, \'rangeInputPnl\')"`);
									tbl =	H.tr(H.td('Domain Start'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'startTerm', to.domain.getText(), irx)), 'sidenavRow') +
											H.tr(H.td('Range Count'), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'rangeTerm', Cat.basetypes.objects.N.properName, Cat.basetypes.objects.N.regexp)), 'sidenavRow') +
											H.tr(H.td('Codomain Start Values'), 'sidenavRow') +
											H.tr(H.td(to.codomain.expr.inputCode(true, {uid:0, idp:'strt'})), 'sidenavRow');
									html += H.div(H.table(tbl) + Cat.display.getButton('edit', `Cat.display.data.handler(evt, '${from.name}', 'range')`, 'Edit data'), 'accordionPnl', 'rangeInputPnl');
									const minForm = to.codomain.expr.inputCode(true, {uid:0, idp:'min'});
									const maxForm = to.codomain.expr.inputCode(true, {uid:0, idp:'max'});
									html += H.button('Add Random Range', 'sidenavAccordion', '', 'Add random entries to this map', `onclick="Cat.display.accordion.toggle(this, \'randomDataInputPnl\')"`) +
											H.div(
												H.table(
													H.tr(H.td('Domain Start Index'), 'sidenavRow') +
													H.tr(H.td(Cat.display.input('', 'inputStartIdx', 'Start ' + to.domain.getText(), irx, '')), 'sidenavRow') +
													H.tr(H.td(Cat.display.input('', 'randomCount', 'Count', irx, '')), 'sidenavRow') +
													H.tr(H.td('Codomain'), 'sidenavRow') +
													H.tr(H.td(H.small('Minimum value')), 'sidenavRow') +
													H.tr(H.td(minForm), 'sidenavRow') +
													H.tr(H.td(H.small('Maximum value')), 'sidenavRow') +
													H.tr(H.td(maxForm), 'sidenavRow')) +
											Cat.display.getButton('edit', `Cat.display.data.handler(evt, '${from.name}', 'random')`, 'Create random range'), 'accordionPnl', 'randomDataInputPnl');
									html += H.button('Add URL', 'sidenavAccordion', '', 'Add data from URL', `onclick="Cat.display.accordion.toggle(this, \'urlInputPnl\')"`) +
											H.div(
												H.small('Provide a link to a data file') +
												H.table(
													H.tr(H.td('Domain Start Index'), 'sidenavRow') +
													H.tr(H.td(Cat.display.input('', 'urlStartIdx', 'Start ' + to.domain.getText(), irx, '')), 'sidenavRow') +
													H.tr(H.td('Data URL'), 'sidenavRow') +
													H.tr(H.td(Cat.display.input('', 'urlInput', 'URL', irx, '')), 'sidenavRow') +
													H.tr(H.td('File Type'), 'sidenavRow') +
													H.tr(H.td( '<input type="radio" name="urlType" id="urlCSV" checked value="csv"/><label for="urlCSV">CSV</label>' +
																'<input type="radio" name="urlType" id="urlCSVgz" value="csv.gz"/><label for="urlCSVjz">CSV.gz</label>' +
																'<input type="radio" name="urlType" id="urlJSON" value="json"/><label for="urlJSON">JSON</label>'
															), 'sidenavRow')) +
											Cat.display.getButton('edit', `Cat.display.data.handler(evt, '${from.name}', 'url')`, 'Create URL range'), 'accordionPnl', 'urlInputPnl');
								}
								*/
								html += H.div('', 'error', 'editError');
							}
							html += H.button('Current Data', 'sidenavAccordion', 'dataPnlBtn', 'Current data in this morphism', `onclick="Cat.display.accordion.toggle(this, \'dataPnl\')"`) +
									H.small('To determine the value of an index, first the data values are consulted then the data ranges.');
							tbl = H.tr(H.th(to.domain.getText()) + H.th(to.codomain.getText()));
							for(let i in to.data)
							{
								let d = to.data[i];
								if (d === null)
									continue;
								tbl += H.tr(H.td(i) + H.td(d));
							}
							html += H.div(
										H.h5('Values') +
								// TODO needs to work for clearing data
										H.table(tbl) +
										H.h5('Ranges') +
										H.small('The list of ranges is consulted in sequence for a range containing the given index.  When found the range is evaluated and returned for that index.') +
										H.div('', '', 'dataRanges'), 'accordionPnl', 'dataPnl');
							document.getElementById('data-sidenav').innerHTML = html;
							Cat.display.data.updateDataRanges(from.to);
						}
					}
					const dpb = document.getElementById('dataPnlBtn');
					if (dpb !== null)
						Cat.display.accordion.toggle(dpb, 'dataPnl');
				}
			},
			handler(e, nm, style = 'one')
			{
				try
				{
					const dgrm = Cat.getDiagram();
					const m = dgrm.domain.getMorphism(nm).to;
					switch(style)
					{
					case 'one':
						m.addData(e);
						break;
					case 'range':
						m.addRange(e);
						break;
					case 'random':
						m.addRandomData(e);
						break;
					case 'url':
						m.addDataURL(e);
						break;
					}
					Cat.display.data.setPanelContent();
					dgrm.saveLocal();
				}
				catch(err)
				{
					document.getElementById('editError').innerHTML = 'Error: ' + Cat.getError(err);
				}
			},
			updateDataRanges(m)
			{
				if (!isGUI)
					return;
				const dgrm = Cat.getDiagram();
				const editable = !dgrm.readonly;
				let html = H.tr((editable ? H.th('') : '') + H.th('Type') + H.th('Start') + H.th('') + H.th(m.codomain.getText()));
				for (let i=0; i<m.ranges.length; ++i)
				{
					const r = m.ranges[i];
					const del = editable ? H.td(Cat.display.getButton('delete', `Cat.display.data.deleteRange(evt, '${m.name}', ${i})`, 'Remove range')) : '';
					switch(r.type)
					{
					case 'range':
						html += H.tr(del + H.td(r.type) + H.td(r.startIndex) + H.td(r.count) + H.td(r.startValue));
						break;
					case 'random':
						html += H.tr(del + H.td(r.type) + H.td(r.startIndex) + H.td(r.count) + H.td(`${r.min.toString()} &le; ${r.max.toString()}`));
						break;
					case 'url':
						html += H.tr(del + H.td(r.type) + H.td(r.startIndex) + H.td(r.url, '', '', '', 'colspan="2"'));
						break;
					}
				}
				const dataRangesElt = document.getElementById('dataRanges');
				dataRangesElt.innerHTML = H.table(html);
			},
			deleteRange(e, nm, idx)
			{
				const dgrm = Cat.getDiagram();
				const m = dgrm.codomain.getMorphism(nm);
				m.ranges.splice(idx, 1);
				Cat.display.data.updateDataRanges(m);
				dgrm.saveLocal();
			},
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
							H.button('Recent', 'sidenavAccordion', '', 'Recent diagrams from Catecon', 'onclick="Cat.display.accordion.toggle(this, \'recentDiagrams\');Cat.display.diagram.fetchRecentDiagrams()"') +
							H.div(H.div('', 'accordionPnl', 'recentDiagrams')) +
							H.button('Catalog', 'sidenavAccordion', '', 'Catalog of available diagrams', 'onclick="Cat.display.accordion.toggle(this, \'catalogDiagrams\');Cat.display.diagram.fetchCatalogDiagramTable()"') +
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
//						dgrm.readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('dgrmDescElt', 'description')`, 'Edit description', Cat.default.button.tiny);
					Cat.display.diagram.setUserDiagramTable();
					Cat.display.diagram.setReferencesDiagramTable();
					Cat.display.diagram.setToolbar(dgrm);
				}
			},
			newDiagramPnl()
			{
				let html =	H.button('New', 'sidenavAccordion', '', 'New Diagram', `onclick="Cat.display.accordion.toggle(this, \'newDiagramPnl\')"`) +
							H.div(
									H.small('The chosen name must have no spaces and must be unique among the diagrams you have in this category.') +
									H.table(H.tr(H.td(Cat.display.input('', 'diagramName', 'Name')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'diagramHtml', 'HTML Entities')), 'sidenavRow') +
											H.tr(H.td(Cat.display.input('', 'newDiagramDescription', 'Description')), 'sidenavRow'), 'sidenav') +
									H.span(Cat.display.getButton('edit', 'Cat.display.diagram.new()', 'Create new diagram')) +
									H.span('', 'error', 'diagramError'), 'accordionPnl', 'newDiagramPnl');
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
					dgrm.saveLocal();
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
				nbDgrm.innerHTML = `${dgrm.getText()} ${H.span('by '+dgrm.username, 'italic')}`;
				nbDgrm.title = Cat.cap(dgrm.description);
				document.getElementById('dgrmHtmlElt').innerHTML = dgrm.getText();
				document.getElementById('dgrmDescElt').innerHTML = nbDgrm.title;
			},
			getDiagramInfo(obj)
			{
				if (typeof obj === 'string')
				{
					const serverInfo = obj in Cat.serverDiagrams ? Cat.serverDiagrams[obj] : false;
					const localInfo = obj in Cat.localDiagrams ? Cat.localDiagrams[obj] : false;
					const serverTime = serverInfo ? serverInfo.timestamp : 0;
					const localTime = localInfo ? localInfo.timestamp : 0;
					const tokens = obj.split(Cat.sep);
					const info =
					{
						description:	localInfo ? localInfo.description : (serverInfo ? serverInfo.description : ''),
						username:		tokens[2],
						name:			obj,
						fancyName:		localInfo ? ('html' in localInfo ? localInfo.properName : localInfo.fancyName) : (serverInfo ? ('html' in serverInfo ? serverInfo.properName : serverInfo.fancyName) : ''),
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
				const tokens = info.name.split(Cat.sep);
				const url = Cat.Amazon.URL(tokens[1], info.username, info.name + '.png');
				const tbTbl = H.table(H.tr( (tb ? tb : '') +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButton('JSON', `Cat.getDiagram('${info.name}').downloadJSON(evt)`, 'Download JSON'), 'buttonBar', '', 'Download diagram JSON') : '' ) +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButton('JS', `Cat.getDiagram('${info.name}').downloadJS(evt)`, 'Download Ecmascript'), 'buttonBar', '', 'Download diagram ecmascript') : '' ) +
							(Cat.user.name !== 'Anon' ? H.td(Cat.display.downloadButton('PNG', `Cat.getDiagram('${info.name}').downloadPNG(evt)`, 'Download PNG'), 'buttonBar', '', 'Download diagram PNG') : '' )),
					'buttonBarLeft');
				const tbl = H.table(
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
				Object.keys(Cat.serverDiagrams).map(d => dgrms[d] = dgrm.username === Cat.user.name);
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
			fetchRecentDiagrams()
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
								const recentDiagrams = document.getElementById('recentDiagrams');
								if (recentDiagrams)
									recentDiagrams.innerHTML = H.span(`Last updated ${dt.toLocaleString()}`, 'smallPrint') + H.table(html);
								const introPngs = document.getElementById('introPngs');
								if (introPngs)
									introPngs.innerHTML = data.diagrams.map(d =>
									{
										const tokens = d.name.split('@');
										return `<img class="intro" src="${Cat.Amazon.URL(tokens[1], d.username, d.name)}.png" width="300" height="225" title="${d.fancyName} by ${d.username}: ${d.description}"/>`;
									}).join('');
							});
					});
			},
			fetchCatalogDiagramTable()
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
			getLockBtn(dgrm)
			{
				const lockable = dgrm.readonly ? 'unlock' : 'lock';
				return Cat.display.getButton(lockable, `Cat.getDiagram().${lockable}(evt)`, Cat.cap(lockable));
			},
			getEraseBtn(dgrm)
			{
				return dgrm.readonly ? '' : Cat.display.getButton('delete', "Cat.getDiagram().clear(evt)", 'Erase diagram!', Cat.default.button.small, false, 'eraseBtn');
			},
			updateLockBtn(dgrm)
			{
				if (dgrm && Cat.user.name === dgrm.username)
				{
					document.getElementById('lockBtn').innerHTML = this.getLockBtn(dgrm);
					const eb = document.getElementById('eraseBtn');
					if (eb)
						eb.innerHTML = this.getEraseBtn(dgrm);
				}
			},
			setToolbar(dgrm)
			{
				const nonAnon = Cat.user.name !== 'Anon';
				const isUsers = dgrm && (Cat.user.name === dgrm.username);
				const html = H.table(H.tr(
							(isUsers ? H.td(this.getEraseBtn(dgrm), 'buttonBar', 'eraseBtn') : '') +
							(isUsers ? H.td(this.getLockBtn(dgrm), 'buttonBar', 'lockBtn') : '') +
							(nonAnon && isUsers ? H.td(Cat.display.getButton('upload', 'Cat.getDiagram().upload(evt)', 'Upload', Cat.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '') +
							(nonAnon ? H.td(Cat.display.downloadButton('JSON', 'Cat.getDiagram().downloadJSON(evt)', 'Download JSON'), 'buttonBar') : '' ) +
							(nonAnon ? H.td(Cat.display.downloadButton('JS', 'Cat.getDiagram().downloadJS(evt)', 'Download Ecmascript'), 'buttonBar') : '' ) +
							(nonAnon ? H.td(Cat.display.downloadButton('PNG', 'Cat.getDiagram().downloadPNG(evt)', 'Download PNG'), 'buttonBar') : '' ) +
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
					H.h5('Extreme Alpha Version') +
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
					H.div(	H.a('Saunders Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
							H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'accordionPnl', 'creditsPnl') +
					H.button('Third Party Software', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Cat.display.accordion.toggle(this, \'thirdPartySoftwarePnl\')"`) +
					H.div(
								H.a('3D', '', '', '', 'href="https://threejs.org/"') +
								H.a('Compressors', '', '', '', 'href="https://github.com/imaya/zlib.js"') +
								H.a('Crypto', '', '', '', 'href="http://bitwiseshiftleft.github.io/sjcl/"') +
						, 'accordionPnl', 'thirdPartySoftwarePnl') +
					H.hr() +
					H.small('&copy;2018-2019 Harry Dole') + H.br() +
					H.small('harry@harrydole.com', 'italic');
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
//					(Cat.user.name !== 'Anon' ? H.button('Reset password', '', '', 'Reset your password', `onclick="Cat.Display.login.showResetForm()"`) : '') +
					H.div('', 'passwordResetForm');
				if (Cat.user.status !== 'logged-in' && Cat.user.status !== 'registered')
					html += H.table(	H.tr(H.td('User name')) +
										H.tr(H.td(H.input('', '', 'loginUserName', 'text', {ph:'Name'}))) +
										H.tr(H.td('Password')) +
										H.tr(H.td(H.input('', '', 'loginPassword', 'password', {ph:'********', x:'onkeydown="Cat.display.onEnter(event, Cat.Amazon.login)"'}))) +
										H.tr(H.td(H.button('Login', '', '', '', 'onclick=Cat.Amazon.login()'))));
				if (Cat.user.status === 'unauthorized')
					html += H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="Cat.display.accordion.toggle(this, \'signupPnl\')"`) +
							H.div( H.table(H.tr(H.td('User name')) +
										H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
										H.tr(H.td('Email')) +
										H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
										Cat.display.login.passwordForm() +
										H.tr(H.td(H.button('Sign up', '', '', '', 'onclick=Cat.Amazon.signup()')))), 'accordionPnl', 'signupPnl');
				if (Cat.user.status === 'registered')
					html += H.h3('Confirmation Code') +
							H.span('The confirmation code is sent by email to the specified address above.') +
							H.table(	H.tr(H.td('Confirmation code')) +
										H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code', x:'onkeydown="Cat.display.onEnter(event, Cat.Amazon.confirm)"'}))) +
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
		morphism:		// TODO move to class morphism?
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
					const functions = Object.keys(CatFns.function).sort().map(f => `<option value="${f}">${f}</option>`).join('');
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
				dgrm.updateMorphismTableRows();
			},
		},
		object:		// TODO move to class object?
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
								dgrm.setupDiagramElementPnl('_ObjPnl', 'updateObjectTableRows') +
								H.h4('References') +
								dgrm.references.map(r => r.setupDiagramElementPnl('_ObjPnl', 'updateObjectTableRows')).join('');
					document.getElementById('object-sidenav').innerHTML = html;
				}
			},
			update()
			{
				let dgrm = Cat.getDiagram();
				dgrm.updateObjectTableRows();
			},
		},
		settings:
		{
			setPanelContent()
			{
				let html = H.table(H.tr(Cat.display.closeBtnCell('settings', false)), 'buttonBarLeft');
				html += H.h3('Settings') +
					H.table(
						H.tr(H.td(`<input type="checkbox" ${Cat.display.gridding ? 'checked' : ''} onchange="Cat.display.gridding = !Cat.display.gridding">`) + H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
						H.tr(	H.td(`<input type="checkbox" ${Cat.display.showRefcnts ? 'checked' : ''} onchange="Cat.display.settings.toggleShowRefcnts()">`) +
								H.td('Show reference counts for objects and morphisms in their respective panels.', 'left'), 'sidenavRow') +
						H.tr(	H.td(`<input type="checkbox" ${Cat.display.showUploadArea ? 'checked' : ''} onchange="Cat.display.settings.toggleShowUploadArea()">`) +
								H.td('Show upload area for diagram snapshots.', 'left'), 'sidenavRow') +
						H.tr(	H.td(`<input type="checkbox" ${Cat.debug ? 'checked' : ''} onchange="Cat.debug = !Cat.debug">`) +
								H.td('Debug', 'left'), 'sidenavRow')
					);
				document.getElementById('settings-sidenav').innerHTML = html;
			},
			toggleShowRefcnts()
			{
				Cat.display.showRefcnts = !Cat.display.showRefcnts;
				const dgrm = Cat.getDiagram();
				dgrm.updateObjectTableRows();
				dgrm.references.map(r => r.updateObjectTableRows());
				dgrm.updateMorphismTableRows();
				dgrm.references.map(r => r.updateMorphismTableRows());
			},
			toggleShowUploadArea()
			{
				Cat.display.showUploadArea = !Cat.display.showUploadArea;
				Cat.display.upSVG.style.display = Cat.display.showUploadArea ? 'block' : 'none';
			},
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
		element:		// TODO move to class element?
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
					html = H.h4('New Text') +
								H.div(	H.span('Create a new text element.', 'small') +
										H.table(H.tr(H.td(H.textarea('', 'elementHtml', 'elementHtml')), 'sidenavRow')) +
										H.span(Cat.display.getButton('edit', 'Cat.display.element.new(evt)', 'Create new text for this diagram')) +
										H.span('', 'error', 'elementError'));
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
								H.td(H.span(Cat.htmlSafe(t.properName), 'tty', `text_${i}`) +
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
		},	// element
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
					if (form.composite)		// moved
						html += H.td(this.getButton('compose', `Cat.getDiagram().gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
					if (form.sink)
					{
						if (dgrm.codomain.isCartesian)		// TODO moved
							html += H.td(this.getButton('pullback', `Cat.getDiagram().gui(evt, this, 'pullback')`, 'Pullback'), 'buttonBar');
						if (dgrm.codomain.hasCoproducts)
							html += H.td(this.getButton('coproductAssembly', `Cat.getDiagram().gui(evt, this, 'coproductAssembly')`, 'Coproduct assembly'), 'buttonBar');
					}
					if (form.source)
					{
						if (dgrm.codomain.hasCoproducts)
							html += H.td(this.getButton('pushout', `Cat.getDiagram().gui(evt, this, 'pushout')`, 'Pushout'), 'buttonBar');
						if (dgrm.codomain.isCartesian)		// TODO moved
							html += H.td(this.getButton('productAssembly', `Cat.getDiagram().gui(evt, this, 'productAssembly')`, 'Product assembly'), 'buttonBar');
					}
					if (form.distinct && dgrm.codomain.isCartesian)		// TODO moved
						html += H.td(this.getButton('product', `Cat.getDiagram().gui(evt, this, 'product')`, 'Product'), 'buttonBar');
					if (form.distinct && dgrm.codomain.hasCoproducts)
						html += H.td(this.getButton('coproduct', `Cat.getDiagram().gui(evt, this, 'coproduct')`, 'Coproduct'), 'buttonBar');
					if (html.length !== htmlLength)
						xyOffset = false;
					if (dgrm.selectedCanRecurse())
						html += H.td(this.getButton('recursion', `Cat.getDiagram().gui(evt, this, 'recursion')`, 'Recursion'), 'buttonBar');
				}
				else if (type === 'object')
				{
					if (dgrm.codomain.isCartesian)		// TODO moved
						html += H.td(this.getButton('product', `Cat.getDiagram().gui(evt, this, 'product')`, 'Product'), 'buttonBar');
					if (dgrm.codomain.hasCoproducts)
						html += H.td(this.getButton('coproduct', `Cat.getDiagram().gui(evt, this, 'coproduct')`, 'Coproduct'), 'buttonBar');
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
			buttons:
			{
				alignObjectHorizontal:
`<circle cx="80" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="240" cy="160" r="80" fill="url(#radgrad1)"/>
<line class="arrow6" x1="0" y1="160" x2="320" y2="160" marker-end="url(#arrowhead)"/>`,
				alignObjectVertical:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="240" r="80" fill="url(#radgrad1)"/>
<line class="arrow6" x1="160" y1="0" x2="160" y2="320" marker-end="url(#arrowhead)"/>`,
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
				coproduct:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="160" y1="80" x2="160" y2="240"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160"/>`,
				coproductAssembly:
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,
				copy:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
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
				distribute:
`<circle class="svgstr4" cx="80" cy="80" r="60"/>
<line class="arrow0" x1="38" y1="38" x2="122" y2="122"/>
<line class="arrow0" x1="38" y1="122" x2="122" y2="38"/>
<circle class="svgstr4" cx="240" cy="80" r="60"/>
<line class="arrow0" x1="240" y1="40" x2="240" y2="140"/>
<line class="arrow0" x1="180" y1="80" x2="300" y2="80"/>
<circle class="svgstr4" cx="80" cy="240" r="60"/>
<line class="arrow0" x1="80" y1="180" x2="80" y2="300"/>
<line class="arrow0" x1="20" y1="240" x2="140" y2="240"/>
<circle class="svgstr4" cx="240" cy="240" r="60"/>
<line class="arrow0" x1="198" y1="198" x2="282" y2="282"/>
<line class="arrow0" x1="282" y1="198" x2="198" y2="282"/>`,
				download:
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
				homFactor:
`<circle cx="80" cy="240" r="100" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad2)"/>
<circle cx="240" cy="160" r="80" fill="url(#radgrad2)"/>
<circle cx="240" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="120" y1="120" x2="40" y2="40" marker-end="url(#arrowhead)"/>`,
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
	/*
				new:
`<circle class="svgfil4" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
*/
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
				symmetry:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="280"/>
<line class="arrow0" x1="80" y1="120" x2="80" y2="220"/>
<line class="arrow0" x1="240" y1="120" x2="240" y2="220"/>
<line class="arrow0" x1="40" y1="120" x2="120" y2="120"/>
<line class="arrow0" x1="200" y1="120" x2="280" y2="120"/>`,
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
// <path class="svgfil0" d="M228.03 165l-127.89 0 0 -20 127.89 0 0 20zm12.98 -4.8l-6.74 -10.39 0 10.39 -48.89 -31.69 6.74 -10.4 48.89 31.7 0 10.39zm0 0l0 -10.39 8.02 5.2 -8.02 5.2zm-52.26 26.52l-3.37 -5.2 48.89 -31.72 6.74 10.39 -48.89 31.72 -3.37 -5.2z"/>
// <path class="svgfil0" d="M260 273.03l0 -243.03 20 0 0 243.03 -20 0zm4.8 12.98l10.39 -6.74 -10.39 0 31.69 -48.89 10.4 6.74 -31.7 48.89 -10.39 0zm0 0l10.39 0 -5.2 8.02 -5.2 -8.02zm-26.52 -52.26l5.2 -3.37 31.72 48.89 -10.39 6.74 -31.72 -48.89 5.2 -3.37z"/>`,
`<circle cx="50" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="100" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>`,
				tty:
`<path class="svgstrThinGray" d="M70,40 240,40 240,280 70,280 70,40"/>
<line class="svgstr3" x1="90" y1="80" x2="220" y2="80"/>
<line class="svgstr3" x1="90" y1="120" x2="200" y2="120"/>
<line class="svgstr3" x1="90" y1="160" x2="160" y2="160"/>
<line class="svgstr3" x1="90" y1="200" x2="120" y2="200"/>`,
				lock:
`<rect class="svgfil5" x="20" y="20" width="280" height="280"/>
<line class="arrow0" x1="60" y1="60" x2="260" y2="260" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="260" x2="260" y2="60" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<circle class="svgfil4" cx="160" cy="160" r="40"/>`,
				unlock:
`
<line class="arrow0" x1="40" y1="40" x2="280" y2="280" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="280" x2="280" y2="40" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<rect class="svgfil5" x="120" y="120" width="80" height="80"/>
`,
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
		downloadButton(txt, onclick, title, scale = Cat.default.button.small)
		{
			const html = H.span(this.svg.header(scale) + this.svg.buttons.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">${txt}</text>
${this.svg.button(onclick)}
</svg>`, '', '', title);
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
				H.td(H.div(this.getButton('cateapsis', "Cat.getDiagram().home()", 'Cateapsis', Cat.default.button.large))) +
				H.td(H.div(this.getButton('string', "Cat.getDiagram().showStrings(evt)", 'Graph', Cat.default.button.large))) +
				H.td(H.div(this.getButton('threeD', "Cat.display.panel.toggle('threeD');Cat.display.threeD.resizeCanvas()", '3D view', Cat.default.button.large))) +
				H.td(H.div(this.getButton('tty', "Cat.display.panel.toggle('tty')", 'Console', Cat.default.button.large))) +
				H.td(H.div(this.getButton('help', "Cat.display.panel.toggle('help')", 'Help', Cat.default.button.large))) +
				H.td(H.div(this.getButton('login', "Cat.display.panel.toggle('login')", 'Login', Cat.default.button.large))) +
				H.td(H.div(this.getButton('settings', "Cat.display.panel.toggle('settings')", 'Settings', Cat.default.button.large))) +
				H.td('&nbsp;&nbsp;&nbsp;');
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
					const cat = dgrm.codomain;
					const xy = dgrm.userToDiagramCoords(Cat.mouse.xy);
					Cat.display.shiftKey = e.shiftKey;
					const plain = !(e.shiftKey || e.ctrlKey || e.altKey);
					const plainShift = e.shiftKey && !(e.ctrlKey || e.altKey);
					switch(e.keyCode)
					{
					case 32:	// 'space'
						if (plain)
						{
							Cat.display.tool = 'select';
							Cat.display.drag = false;
						}
						break;
					case 46:	// delete
						if (plain && !dgrm.readonly)
							dgrm.removeSelected();
						break;

					case 49:	// 1
						if (plain && !dgrm.readonly && 'terminalObject' in cat)
							dgrm.placeObject(e, cat.terminalObject, xy);
						break;

					//
					// toggle panels
					//
					case 51:	// 3
						if (plain)
							Cat.display.panel.toggle('threeD');
						break;
					case 67:	// c
						if (plainShift)
							Cat.display.panel.toggle('category');
						break;
					case 68:	// d
						if (plainShift)
							Cat.display.panel.toggle('diagram');
						break;
					case 72:	// h
						if (plainShift)
							Cat.display.panel.toggle('help');
						break;
					case 76:	// l
						if (plainShift)
							Cat.display.panel.toggle('login');
						break;
					case 77:	// m
						if (plainShift)
							Cat.display.panel.toggle('morphism');
						break;
					case 79:	// O
						if (plain)
							Cat.display.panel.toggle('object');
						break;
					case 83:	// S
						if (plain)
							Cat.display.panel.toggle('settings');
						break;

					//
					//
					case 78:	// N
						if (plain && !dgrm.readonly && 'enumerator' in cat)
							dgrm.placeObject(e, cat.enumerator, xy);
						break;

					case 90:	// Z
						if (plain && !dgrm.readonly && 'integers' in cat)
							dgrm.placeObject(e, cat.integers, xy);
						break;

							//
							// TODO move to PFS
							//
					case 68:	// d
						if (plain && !dgrm.readonly)
							dgrm.placeObject(e, cat.getObject('D'), xy);
						break;
					case 70:	// f
						if (plain && !dgrm.readonly)
							dgrm.placeObject(e, cat.getObject('F'), xy);
						break;
					case 83:	// S
						if (plainShift && !dgrm.readonly)
							dgrm.placeObject(e, cat.getObject('Str'), xy);
						break;

					case 79:	// O
						if (plainShift && !dgrm.readonly && 'subobjectClassifer' in cat)
							dgrm.placeObject(e, cat.subobjectClassifer, xy);
						break;


					case 84:	// T
						if (plainShift && !dgrm.readonly)
						{
							const txt = new element(dgrm.domain, {name:`Text${dgrm.textId++}`, diagram:dgrm, html:'Lorem ipsum cateconium', xy});
							dgrm.texts.push(txt);
							dgrm.placeElement(e, txt);
						}
						else if (plain)
							Cat.display.panel.toggle('element');
						break;
					case 89:	// y
						if (plainShift)
							Cat.display.panel.toggle('tty');
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
			isGUI && this.registerCognito();
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
							if (Cat.debug)
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
			if (Cat.secret !== Cat.getUserSecret(document.getElementById('SignupSecret').value))
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
			if (Cat.secret !== Cat.getUserSecret(document.getElementById('SignupSecret').value))
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
			Cat.selected.selectCategoryDiagram(Cat.getLocalStorageCategoryName(), function()
			{
				Cat.selected.updateDiagramDisplay(Cat.selected.diagram);
			});
			Cat.display.setNavbarBackground();
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
		onCT()
		{
			fetch('https://api.ipify.org').then(function(response)
			{
				if (response.ok)
					response.text().then(function(ip)
					{
						const params =
						{
							FunctionName:	'CateconCT',
							InvocationType:	'RequestResponse',
							LogType:		'None',
							Payload:		JSON.stringify({IP:ip})
						};
						const handler = function(error, data)
						{
							if (error)
							{
								Cat.recordError(error);
								return;
							}
						};
						Cat.Amazon.lambda.invoke(params, handler);
					});
			});
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
			const dgrmJson = dgrm.json();
			const dgrmPayload = JSON.stringify(dgrmJson);
			if (dgrmPayload.length > Cat.uploadLimit)
			{
				Cat.status(e, 'CANNOT UPLOAD!<br/>Diagram too large!');
				return;
			}
			Cat.svg2canvas(Cat.display.topSVG, dgrm.name, function(url, filename)
			{
				const params =
				{
					FunctionName:	'CateconIngestDiagram',
					InvocationType:	'RequestResponse',
					LogType:		'None',
					Payload:		JSON.stringify({diagram:dgrmJson, username:Cat.user.name, png:url}),
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
					const filteredRound = nextRound.filter(d => typeof d === 'string' && Cat.getDiagram(d) === null);
					if (filteredRound.length > 0)
						Cat.Amazon.fetchDiagramJsons(filteredRound, null, jsons, refs);
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
		canvas.width = Cat.display.snapWidth;
		canvas.height = Cat.display.snapHeight;
		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const data = (new XMLSerializer()).serializeToString(copy);
		const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
		const url = Cat.url.createObjectURL(svgBlob);
		const img = new Image();
		img.onload = function()
		{
			ctx.drawImage(img, 0, 0);
			Cat.url.revokeObjectURL(url);
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
	grid(x)
	{
		const d = Cat.default.layoutGrid;
		switch (typeof x)
		{
		case 'number':
			return Cat.display.gridding ? d * Math.round(x / d) : x;
		case 'object':
			return {x:Cat.grid(x.x), y:Cat.grid(x.y)};
		}
	},
	fetchDiagrams(dgrms, refs, fn)
	{
		Cat.Amazon.fetchDiagramJsons(dgrms, function(jsons)
		{
			jsons.map(j =>
			{
				const dgrm = new diagram(j);
				dgrm.saveLocal();
			});
			if (fn)
				fn(jsons);
			return jsons;
		}, [], refs);
	},
	limit(s)
	{
		return s.length > Cat.textDisplayLimit ? s.slice(0, Cat.textDisplayLimit) + '...' : s;
	},
	dual(cat)
	{
		// TODO
	},
};

class expression
{
	constructor(args)
	{
		this.diagram = null;
		if ('token' in args)
			this.token = args.token;
	}
	/*
	//
	// inputCode
	//
	inputCode(first=true, uid={uid:0, idp:'data'})
	{
		return this.expandExpression('inputCode', first, uid);
	}
	inputCode_token(first, uid)
	{
		if (this.token in Cat.basetypes.objects)
		{
			++uid.uid;
			const obj = Cat.basetypes.objects[this.token];
			const rx = 'regexp' in obj ? `pattern="${obj.regexp}"`: '';
			return Cat.display.input('', `${uid.idp}_${uid.uid}`, obj.properName, rx, '');
		}
		if (this.diagram.codomain.allObjectsFinite)
		{
			const obj = this.getObject(true);
			if ('token' in obj.expr)
				return this.token;
			return obj.expr.inputCode(false, uid);
		}
		return null;
	}
	inputCode_op(first, uid)
	{
		const op = Cat.basetypes.operators[this.op];
		const codes = this.data.map(d => {uid.uid; return d.inputCode(false, uid)});
		return Cat.parens(codes.join(op.sym), '(', ')', first);
	}
	inputCode_bracket(first, uid)
	{
		if (this.op === 'hom')
		{
			const domain = this.lhs.getObject();
			const codomain = this.rhs.getObject();
			const homKey = category.homKey(domain, codomain);
			const homset = this.diagram.getHomSet(domain, codomain);
			++uid.uid;
			const id = `${uid.idp}_${uid.uid}`;
			const th = H.tr(H.td(this.ProperName(first, {position:0}), '', '', '', `colspan='4'`));
			return H.table(th + Cat.display.morphismTableRows(homset, `data-name="%1" onclick="Cat.getDiagram().toggleTableMorphism(event, '${id}', '%1')"`, false), 'toolbarTbl', id);
		}
	}
	*/
	//
	// fromExpression
	//
	fromExpression(first = true, uid={uid:0, idp:'data'})
	{
		return this.expandExpression('fromExpression', first, uid)
	}
	fromExpression_token(first, uid)
	{
		if (this.token in Cat.basetypes.objects)
		{
			++uid.uid;
			const obj = Cat.basetypes.objects[this.token];
			const val = document.getElementById(`${uid.idp}_${uid.uid}`).value;
			if ('regexp' in obj)
			{
				const rx = RegExp(obj.regexp);
				if (!rx.test(val))
					throw `Input term ${val} is invalid.`;
			}
			return obj.$(val);
		}
		if (this.diagram.codomain.allObjectsFinite)
		{
			const obj = this.getObject(true);
			if ('token' in obj.expr)
			{
				++uid.uid;
				const val = document.getElementById(`${uid.idp}_${uid.uid}`).value;
				const rx = RegExp(obj.regexp);
				if (!rx.test(val))
					throw `Input term ${val} is invalid.`;
				return obj.$(val);
			}
			return obj.expr.fromExpression(false, uid);
		}
	}
	fromExpression_op(first, uid)
	{
		return this.data.map(x => x.fromExpression(false, uid));
	}
	fromExpression_bracket(first, uid)
	{
		++uid.uid;
		const row = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
		const name = row[0].dataset.name;
		return name;
	}
	/*
	//
	// isRunnable
	//
	isRunnable(first = true)
	{
		return this.expandExpression('isRunnable', first);
	}
	isRunnable_token(first)
	{
		const dm = this.diagram.getMorphism(this.token);
		switch (dm.function)
		{
		case 'data':
		case 'One':
			return true;
		case 'compose':
			return dm.isRunnable();
		case 'productAssembly':
			return dm.morphisms.reduce((isRunnable, factor) => factor.expr.isRunnable(false) && isRunnable, true);
		}
		return false;
	}
	isRunnable_op(first)
	{
		switch(this.op)
		{
		case 'compose':
			return this.data[0].isRunnable(false);
		case 'product':
		case 'coproduct':
			let r = true;
			for(let i=0; i<this.data.length; ++i)
				r &= this.data[i].isRunnable(false);
			return r;
		}
	}
	isRunnable_bracket(first)
	{
		return this.lhs.isRunnable(false) && this.rhs.isRunnable(false);
	}
	*/
	//
	// initialObject
	//
	initialObject(first = true)
	{
		return this.expandExpression('initialObject', first);
	}
	initialObject_token(first)
	{
		if (this.token === 'One')
			return 0;
		throw 'No implementation';
	}
	initialObject_op(first)
	{
		return this.data.map(d => d.initialObject(false));
	}
	initialObject_bracket(first)	// binary
	{
	}
	/*
	//
	// makeRangeData
	//
	makeRangeData(first, data)	// data = {idx, startIndex, startValue}
	{
		return this.expandExpression('makeRangeData', data);
	}
	makeRangeData_token(first, data)
	{
		return data.idx - data.startIndex + data.startValue;
	}
	makeRangeData_op(first, data)
	{
		return this.data.map((x, i) => x.makeRangeData(false, {idx:data.idx, startIndex:data.startIndex, startValue:data.startValue[i]}));
	}
	makeRangeData_bracket(first, data)
	{
		return null;
	}
	//
	// makeRandomData
	//
	makeRandomData(first, data)	// data = {min, max, dm}
	{
		return this.expandExpression('makeRandomData', first, data);
	}
	makeRandomData_token(first, data)
	{
		return dataMorphism.getRandomValue(this, data.min, data.max); // TODO Absorb?
	}
	makeRandomData_op(first, data)
	{
		return this.data.map((x, i) => x.makeRandomData(false, {min:data.min[i], max:data.max[i], dm:data.dm}));
	}
	makeRandomData_bracket(first, data)
	{
		return null;
	}
	*/
	//
	// makeUrlData
	//
	makeUrlData(first, data)
	{
		return this.expandExpression('makeUrlData', first, data);
	}
	makeUrlData_token(first, data)
	{
		return data;
	}
	makeUrlData_op(first, data)
	{
		return this.data.map((x, i) => x.makeUrlData(false, data[i]));
	}
	makeUrlData_bracket(first, data)
	{
		return null;
	}
	isGraphable()
	{
		return 'token' in this && !(this.token === 'One' || expr.this === 'Null');
	}
	//
	// bindGraph
	//
	bindGraph(first, data)	// data: {cod, link, function, domRoot, codRoot, offset}
	{
		return this.expandExpression('bindGraph', first, data);
	}
	bindGraph_token(first, data)
	{
		if (!stringMorphism.isGraphable(expr))
			return;
		const domRoot = data.domRoot.slice();
		const codRoot = data.codRoot.slice();
		domRoot.push(...data.link);
		codRoot.push(...data.link);
		Cat.arraySet(this, 'links', codRoot);
		Cat.arraySet(data.cod, 'links', domRoot);
		Cat.arrayInclude(this, 'functions', data.function);
		Cat.arrayInclude(data.cod, 'functions', data.function);
	}
	bindGraph_op(first, data)
	{
		for(let i=0; i<this.data.length; ++i)
		{
			let subIndex = data.link.slice();
			subIndex.push(i + data.offset);
			const e = this.data[i];
			const args = Cat.clone(data);
			args.link = subIndex;
			if ('data' in data.cod)
				args.cod = data.cod.data[i + data.offset];
			this.bindGraph(false, args);
		}
	}
	bindGraph_bracket(first, data)
	{
		const lhsNdx = data.link.slice();
		lhsNdx.push(0);
		const rhsNdx = data.link.slice();
		rhsNdx.push(1);
		const args = Cat.clone(data);
		args.link = lhsNdx;
		args.cod = data.cod.lhs;
		this.lhs.bindGraph(false, args);
		args.link = rhsNdx;
		args.cod = data.cod.rhs;
		this.rhs.bindGraph(false, args);
	}
	//
	// mergeGraphs
	//
	mergeGraphs(first, data)	// data: {from, base, inbound, outbound}
	{
		return this.expandExpression('mergeGraphs', first, data);
	}
	mergeGraphs_token(first, data)
	{
		if (!stringMorphism.isGraphable(this))
			return;
		if ('links' in data.from)
		{
			const links = data.from.links.map(lnk =>
			{
				let nuLnk = data.base.reduce((isSelfLink, f, i) => isSelfLink && f === lnk[i], true) ? data.inbound.slice() : data.outbound.slice();
				nuLnk.push(...lnk.slice(data.base.length));
				return nuLnk;
			});
			if (!('links' in this))
				this.links = links;
			else links.map(lnk => this.links.indexOf(lnk) === -1 ? this.links.push(lnk) : null);
		}
		if (!('functions' in this))
			this.functions = [];
		if ('functions' in data.from)
			data.from.functions.map(f => this.functions.indexOf(f) === -1 ? this.functions.push(f) : null);
	}
	mergeGraphs_op(first, data)
	{
		this.data.map((d, i) =>
		{
			const from = 'data' in data.from ? data.from.data[i] : data.from;
			d.mergeGraphs(false, {from, base:data.base, inbound:data.inbound, outbound:data.outbound});
		});
	}
	mergeGraphs_bracket(first, data)
	{
		this.lhs.mergeGraphs(false, {from:data.from.lhs, base:data.base, inbound:data.inbound, outbound:data.outbound});
		this.rhs.mergeGraphs(false, {from:data.from.rhs, base:data.base, inbound:data.inbound, outbound:data.outbound});
	}
	//
	// tagGraph
	//
	tagGraph(first, data)	// data: function name
	{
		return this.expandExpression('tagGraph', first, data);
	}
	tagGraph_token(first, data)
	{
		if (!this.isGraphable())
			return;
		if (!('functions' in this))
			this.functions = [data];
		else if (this.functions.indexOf(data) === -1)
			this.functions.push(data);
		if (!('links' in this))
			this.links = [];
	}
	tagGraph_op(first, data)
	{
		this.data.map(e => e.tagGraph(false, data));
	}
	tagGraph_bracket(first, data)
	{
		this.lhs.tagGraph(false, data);
		this.rhs.tagGraph(false, data);
	}
	//
	// componentGraph
	//
	componentGraph(first, data)
	{
		return this.expandExpression('componentGraph', first, data);
	}
	componentGraph_token(first, data)
	{
		if ('links' in this)
			this.links.map(lnk => lnk.splice(1, 0, data));
	}
	componentGraph_op(first, data)
	{
		this.data.map(e => e.componentGraph(false, data));
	}
	componentGraph_bracket(first, data)
	{
		expr.lhs.componentGraph(false, data);
		expr.rhs.componentGraph(false, data);
	}
	//
	// traceLinks
	//
	traceLinks(first, data)	// data {index, expr}
	{
		return this.expandExpression('traceLinks', first, data);
	}
	traceLinks_token(first, data)
	{
		if (!this.isGraphable())
			return;
		const links = this.links.slice();
		this.visited = [];
		while(links.length > 0)
		{
			const lnk = links.pop();
			if (this.visited.indexOf(lnk) > -1)
				continue;
			const f = data.expr.getExprFactor(lnk);
			if ('links' in f)
				f.links.map(k => (links.indexOf(k) === -1 && k[0] !== data.index[0]) ? links.push(k) : null);
			f.functions.map(r => this.functions.indexOf(r) === -1 ? this.functions.push(r) : null);
			if (data.index.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
				continue;
			if (this.visited.indexOf(lnk) === -1)
				this.visited.push(lnk);
		}
	}
	traceLinks_op(first, data)
	{
		this.data.map((e, i) =>
		{
			let index = data.index.slice();
			index.push(i);
			e.traceLinks(false, {expr:data.expr, index});
		});
	}
	traceLinks_bracket(first, data)
	{
		let lIndex = data.index.slice();
		lIndex.push(0);
		stringMorphism.traceLinks(dgrm, this.lhs, false, {expr:data.expr, index:lIndex});
		let rIndex = data.index.slice();
		rIndex.push(1);
		stringMorphism.traceLinks(dgrm, this.rhs, false, {expr:data.expr, index:rIndex});
	}
	//
	// copyDomCodLinks
	//
	copyDomCodLinks(first, data)	// data {cnt, expr, index}
	{
		return element.expandExpression('copyDomCodLinks', first, data);
	}
	copyDomCodLinks_token(first, data)
	{
		if (!this.isGraphable())
			return;
		const factorLink = data.index.slice();
		if (factorLink[0] === 1)
			factorLink[0] = data.cnt;
		const f = data.expr.getExprFactor(factorLink);
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
			if (this.links.indexOf(lnk) === -1)	// TODO needed?
				this.links.push(lnk);
		}
		f.functions.map(r => this.functions.indexOf(r) === -1 ? this.functions.push(r) : null);
	}
	copyDomCodLinks_op(first, data)
	{
		this.data.map((e, i) =>
		{
			let index = data.index.slice();
			index.push(i);
			this.data[i].copyDomCodLinks(false, {expr:data.expr, index, cnt:data.cnt});
		});
	}
	copyDomCodLinks_bracket(first, data)
	{
		let lIndex = data.index.slice();
		lIndex.push(0);
		expr.lhs.copyDomCodLinks(false, {expr:data.expr, index:lIndex, cnt:data.cnt});
		let rIndex = data.index.slice();
		rIndex.push(1);
		expr.rhs.copyDomCodLinks(false, {expr:data.expr, index:rIndex, cnt:data.cnt});
	}
	//
	// copyGraph
	//
	copyGraph(first, data)	// data {map, expr}
	{
		return this.expandExpression('copyGraph', first, data);
	}
	copyGraph_token(first, data)
	{
		if (!this.isGraphable())
			return;
		this.functions = data.expr.functions.slice();
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
					this.links.push(toLnk);
				}
			}
		}
	}
	copyGraph_op(first, data)
	{
		this.data.map((e, i) =>
		{
			this.data[i].copyGraph(false, {expr:data.expr.data[i], map:data.map});
		});
	}
	copyGraph_bracket(first, data)
	{
		lIndex.push(0);
		this.lhs.copyGraph(false, {expr:data.expr.lhs, map:data.map});
		rIndex.push(1);
		this.rhs.copyGraph(false, {expr:data.expr.rhs, map:data.map});
	}
}

class element
{
	constructor(cat, args)
	{
		this.refcnt = 0;
		this.class = 'element';
		this.name = Cat.getArg(args, 'name', '');
		if (this.name !== '' && !Cat.nameEx.test(this.name))
			throw `Element name ${this.name} is not allowed.`;
		if ('properName' in args)
			this.properName = args.properName;
		this.Description = Cat.getArg(args, 'description', '');
		this.category = cat;
		this.diagram = 'diagram' in args ? (typeof args.diagram === 'object' ? args.diagram : Cat.getDiagram(args.diagram)) : null;
		if ('sig' in args)	// signature confirmation comes later after the object is built
			this.sig = args.sig;
		this.readonly = Cat.getArg(args, 'readonly', false);
	}
	signature()
	{
		return Cat.sha256(`${this.category.name} ${this.subClass} ${this.name}`);
	}
	setSignature()
	{
		const s = this.signature();
		if ('sig' in this && this.sig !== s)
			// TODO throw?
			console.log(`bad signature ${s} != ${this.sig}`);
		this.sig = s;
	}
	incrRefcnt()
	{
		++this.refcnt;
	}
	decrRefcnt()
	{
		if (Cat.debug)
			console.log('element.decrRefcnt', this.category.name, this.name, this.refcnt);
		--this.refcnt;
		if (this.refcnt <= 0)
		{
			if (Cat.debug)
				console.log('element.decrRefcnt delete', this.category.name, this.name);
			if (this.class === 'element')
				this.diagram.texts.splice(this.diagram.texts.indexOf(this), 1);
			isGUI && this.removeSVG();
		}
	}
	getText()
	{
		return this.properName === '' ? this.name : this.properName;
	}
	json()
	{
		const r =
		{
			category:			this.category.name,
			class:				'class' in this ? this.class : '',
			description:		this.Description,
//			diagram:			this.diagram === null ? null : this.diagram.name,
			sig:				this.sig,
			name:				this.name,
			subClass:			'subClass' in this ? this.subClass : '',
			properName:			this.properName,
			readonly:			this.readonly,
		};
		if ('diagram' in this && this.diagram !== null)
			r.diagram = this.diagram.name;
		/*
		if ('x' in this)
		{
			r.x = this.x;
			r.y = this.y;
		}
		*/
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
		return obj ? this.sig === obj.sig : false;
	}
	isDeletable()
	{
		return this.refcnt <= 1;
	}
	setXY(xy)
	{
		this.x = Cat.grid(xy.x);
		this.y = Cat.grid(xy.y);
	}
	downloadJSON()
	{
		Cat.downloadString(this.stringify(), 'json', `${this.name}.json`);
	}
	makeSVG(group = true)
	{
		if ('x' in this)	// TODO make text class subClass element
		{
			if (this.properName.indexOf('\n') > -1)
			{
				let lines = this.properName.split('\n').map(t => `<tspan x="0" dy="1.2em">${t}</tspan>`);
				let html = group ? `<g id="${this.elementId()}" transform="translate(${Cat.grid(this.x)} ${Cat.grid(this.y + Cat.default.font.height/2)})">` : '';
				html += `<text data-type="element" data-name="${this.name}" x="0" y="0" text-anchor="left" class="${this.class} grabbable" onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'element')"> ${lines.join('')} </text>`;
				html += group ? '</g>' : '';
				return html;
			}
			else
			{
				if (isNaN(this.x) || isNaN(this.y))
					throw 'Nan!';
				return `<text data-type="element" data-name="${this.name}" text-anchor="middle" class="${this.class} grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + Cat.default.font.height/2}"
					onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'element')">${this.properName}</text>`;
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
			svg.setAttribute('transform', `translate(${Cat.grid(this.x)} ${Cat.grid(this.y)})`);
		else
		{
			if (svg.hasAttribute('x'))
			{
				svg.setAttribute('x', this.x);
				svg.setAttribute('y', this.y + ('h' in this ? this.h/2 : 0));
			}
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
}	// element

class object extends element
{
	constructor(cat, args)
	{
		super(cat, args);
		this.class = 'object';
		this.subClass = 'object';
		if (cat !== null)
		{
			this.category = cat;
			// TODO diagram object only?
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
	static process(cat, data, dgrm)
	{
		try
		{
			let r = null;
			switch(data.subClass)
			{
			case 'object':
				r = new object(cat, data);	// TODO should not happen?
				break;
			case 'namedObject':
				r = new namedObject(cat, data);
				break;
			case 'productObject':
				r = new productObject(cat, data);
				break;
			case 'coproductObject':
				r = new coproductObject(cat, data);
				break;
			case 'homObject':
				r = new homObject(cat, data);
				break;
			case 'diagramObject':
				const info = Cat.clone(data);
				info.diagram = dgrm;
				r = new diagramObject(cat, info);
				break;
			default:
				break;
			}
			return r;
		}
		catch(e)
		{
			Cat.recordError(e);
		}
		return null;
	}
	help()
	{
		return H.p(`Object ${this.getText()} in category ${this.category.getText()}`);
	}
	isSquaredProduct()
	{
		return this.subClass === 'productObject' && this.objects.length === 2;
	}
	isSquaredCoproduct()
	{
		return this.subClass === 'coproductObject' && this.objects.length === 2;
	}
	getFactor(factor)
	{
		return this;
	}
	inputCode(first=true, uid={uid:0, idp:'data'})
	{
		if ('regexp' in this)
		{
			++uid.uid;
			return Cat.display.input('', `${uid.idp}_${uid.uid}`, obj.properName, `pattern="${this.regexp}"`, '');
		}
		return null;
	}
	fromInput(first = true, uid={uid:0, idp:'data'})
	{
		if (this.token in Cat.basetypes.objects)
		{
			++uid.uid;
			const val = document.getElementById(`${uid.idp}_${uid.uid}`).value;
			const rx = RegExp(this.regexp);
			if (!rx.test(val))
				throw `Input term ${val} is invalid.`;
			return this.$(val);
		}
	}
}	// object

class namedObject(cat, args) extends object
{
	constructor(cat, args)
	{
		super(cat, args);
		this.subClass = 'namedObject';
		this.setSignature();
	}
}

class multiObject extends object
{
	constructor(cat, args)
	{
		super(cat, args);
		this.objects = args.objects.map(o => (typeof o === 'string' ? cat.getObject(o) : o));
		this.objects.map(o => o.incrRefcnt());
	}
	signature()
	{
		return Cat.sha256(`${this.category.name} ${this.subClass} ${objects.map(o => o.signature()).join()}`);
	}
	decrRefcnt()
	{
		if (this.refcnt === 0)
			this.objects.map(o => o.decrRefcnt());
		super.decrRefcnt();
	}
	json()
	{
		let obj = super.json();
		obj.objects = this.objects.map(o => o.name);
		return obj;
	}
	getFactor(factor)
	{
		return factor.length > 0 ? objects[factor[0]].getFactor(factor.slice(1)) : this;
	}
	getFactorName(factor)
	{
		return factor.length > 0 ? objects[factor[0]].getFactorName(factor.slice(1)) : this.name;
	}
	getFactorProperName(indices, first = true, data = {})
	{
		this.position = data.position;
		const f = this.getFactor(indices);
		const fn = `<tspan>${f.getText()}</tspan>${Cat.subscript(indices)}`;
		return (first || this.subClass !== 'homObject') ? fn : `(${fn})`;
	}
	ProperName(s, first = true, data = {})
	{
		let n = '';
		const symWidth = Cat.textWidth(s);
	const parenWidth = Cat.textWidth('(');	// TODO move
		let doPos = 'position' in data;
		if (doPos)
			this.position = data.position;
		if (!first)
		{
			n += '(';
			if (doPos)
				data.position += parenWidth;
		}
		let n = this.objects.map(o => o.ProperName(false, data)).join(s);
		if (!first)
		{
			n += ')';
			if (doPos)
				data.position += parenWidth;
		}
	}
}

class productObject extends multiObject
{
	static codename(objs)
	{
		return objs.map(o => typeof o === 'string' ? o : o.name).join('-X-');
	}
	static get(cat, objects)
	{
		const name = productObject.codename(objects);
		let obj = cat.getObject(name);
		return obj === null ? new productObject(cat, {objects}) : obj;
	}
	constructor(cat, args)
	{
		super(cat, args);
		this.subClass = 'productObject';
		this.size = this.objects.reduce((sz, o) => sz += o.size, 0);
		this.name = this.name === '' ? productObject.codename() : this.name;
		this.properName = this.properName === '' ? this.ProperName(cat, this.objects) : this.properName;
		this.setSignature();
	}
	ProperName(first = true, data = {})
	{
		return super.ProperName('&times;', first, data);
	}
	inputCode(first=true, uid={uid:0, idp:'data'})
	{
		const codes = this.objects.map(d => {uid.uid; return d.inputCode(false, uid)});
		return Cat.parens(codes.join(op.sym), '(', ')', first);
	}
	fromInput(first = true, uid={uid:0, idp:'data'})
	{
		return this.objects.map(x => x.fromInput(false, uid));
	}
}

class coproductObject extends multiObject
{
	static codename(objects)
	{
		return objects.map(o => typeof o === 'string' ? o : o.name).join('-X-');
	}
	static get(cat, objects)
	{
		const name = coproductObject.codename(objects);
		let obj = cat.getObject(name);
		return obj === null ? new coproductObject(cat, {objects}) : obj;
	}
	constructor(cat, args)
	{
		super(cat, args);
		this.subClass = 'coproductObject';
		this.size = 1 + this.objects.reduce((sz, o) => sz = Math.max(o.size, sz), 0);
		this.name = this.name === '' ? coproductObject.codename() : this.name;
		this.properName = this.properName === '' ? coproductObject.ProperName(cat, morphisms) : this.properName;
		this.setSignature();
	}
	ProperName(first = true, data = {})
	{
		return super.ProperName('&plus;', first, data);
	}
	inputCode(first=true, uid={uid:0, idp:'data'})
	{
		// TODO
		//
		// const codes = this.objects.map(d => {uid.uid; return d.inputCode(false, uid)});
		// return Cat.parens(codes.join(op.sym), '(', ')', first);
	}
	fromInput(first = true, uid={uid:0, idp:'data'})
	{
		// TODO
	}
}

class homObject extends multiObject
{
	static codename(objects)
	{
		return `-H--${objects.map(o => typeof o === 'string' ? o : o.name).join('-c-')}--H-`;
	}
	static get(cat, objects)
	{
		const name = homObject.codename(objects);
		let obj = cat.getObject(name);
		return obj === null ? new homObject(cat, {objects}) : obj;
	}
	constructor(cat, args)
	{
		super(cat, args);
		this.subClass = 'homObject';
		this.size = 1;
		this.name = this.name === '' ? homObject.codename(this.objects) : this.name;
		this.properName = this.properName === '' ? homObject.ProperName(cat, this.objects) : this.properName;
		this.setSignature();
	}
	ProperName(first = true, data = {})
	{
		let doPos = 'position' in data;
	const bw = Cat.textWidth('[');	// TODO move
	const cw = Cat.textWidth(', ');	// TODO move
		if (doPos)
		{
			this.position = data.position;
			data.position += bw;
		}
		let nm = '[';
		nm += this.objects[0].ProperName(true, data);
		nm += ', ';
		if (doPos)
			data.position += cw;
		nm += this.objects[1].ProperName(true, data);
		if (doPos)
			data.position += bw;
		return nm;
	}
	inputCode(first=true, uid={uid:0, idp:'data'})
	{
		const domain = this.objects[0]
		const codomain = this.objects[1];
		const homKey = category.homKey(domain, codomain);
		const homset = this.diagram.getHomSet(domain, codomain);
		++uid.uid;
		const id = `${uid.idp}_${uid.uid}`;
		const th = H.tr(H.td(this.ProperName(first, {position:0}), '', '', '', `colspan='4'`));
		return H.table(th + Cat.display.morphismTableRows(homset, `data-name="%1" onclick="Cat.getDiagram().toggleTableMorphism(event, '${id}', '%1')"`, false), 'toolbarTbl', id);
	}
	fromInput(first = true, uid={uid:9, idp:'data'})
	{
		++uid.uid;
		const morphism = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
		// TODO
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
	}
	decrRefcnt()
	{
		if (this.refcnt <= 0)
		{
			this.to.decrRefcnt();
			if (this.to.refcnt === 0)
				this.to.decrRefcnt();
			this.diagram.objects.delete(this);
		}
		super.decrRefcnt();
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
	help()
	{
		return H.p(`Diagram object ${this.getText()} in category ${this.category.getText()}`);
	}
}

class category extends object
{
	static toolbarMorphism(form)
	{
		let td = '';
		if (form.composite)
			td += H.td(Cat.display.getButton('compose', `Cat.getDiagram().gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
		return td;
	}
	constructor(args)
	{
		super($Cat, args);
		this.subClass = 'category';
		const attrs = ['hasProducts', 'hasCoproducts', 'isClosed', 'isCartesian', 'allObjectsFinite'];
		attrs.map(a => this[a] = Cat.getArg(args, a, false));
		this.referenceDiagrams = Cat.getArg(args, 'referenceDiagrams', []);
		this.references = this.referenceDiagrams.map(r => Cat.getDiagram(r));
		if ('subobject' in args)
		{
			const mainCat = $Cat.getObject(args.subobject);
			attrs.map(a => this[a] = mainCat[a]);
			this.subobject = args.subobject;
		}
		this.objects = new Map();
		this.morphisms = new Map();
		this.transforms = new Map();
		this.username = Cat.getArg(args, 'user', Cat.user.name);
		if ($Cat === null)	// undefined at initialization
		{
			$Cat = this;
			$Cat.addObject($Cat);
			$Cat.token = 'Cat';
		}
		this.process(this.diagram, args);
	}
	signature()
	{
		let s = '';
		for ([key, o] of this.object)
			s += o.sig;
		for ([key, m] of this.morphisms)
			s += m.sig;
		return Cat.sha256(`Cat ${this.name} ${this.subClass} ${s});
	}
	clear()
	{
		this.objects.clear();
		this.morphisms.clear();
		this.transforms.clear();
		this.texts = [];
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
		return this.references.find(r => r.codomain.hasObject(name)) !== null || this.objects.has(name);
	}
	getObject(name, checkRefs=true)
	{
		let obj = null;
		if (typeof name === 'string')
		{
			if (checkRefs)
			{
				obj = this.references.find(ref => ref.codomain.getObject(name, true));
				if (obj !== null)
					return obj;
			}
			obj = this.objects.has(name) ? this.objects.get(name) : null;
		}
		return obj;
	}
	addObject(obj)
	{
		if (this.hasObject(obj.name))
			throw `Object name ${obj.name} already exists in category ${this.name}`;
		this.objects.set(obj.name, obj);
	}
	hasMorphism(name)
	{
		return this.references.find(r => r.codomain.hasMorphism(name)) !== null || this.morphisms.has(name);
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
			r.morphs = ary.map(a => new morphism(this, {domain:r.object.name, codomain:a.codomain.name}));
			// TODO
		}
		return r;
	}
	getAnon(s = 'Anon')
	{
		while(true)
		{
			const name = `${s}_${Cat.random()}`;
			if (!this.hasObject(name) && !this.hasMorphism(name))
				return name;
		}
	}
	run(m, dgrm)
	{
		let data = m.morphisms[0];
		let dataOut = (m.codomain.name !== 'tty' && m.codomain.name !== 'threeD') ? dgrm.newDataMorphism(m.domain, m.codomain) : null;
		const elts = data.function === 'data' ? data.data : {0:data.$(element.initialObject(dgrm, m.domain))};
		for (let i in elts)
		{
			let d = m.$(i);
			if (dataOut !== null)
				dataOut.data[i] = d;
		}
		if (data.function === 'data')
			data.ranges.map(r =>
			{
				switch(r.type)
				{
				case 'range':
					for (let i=r.startIndex; i<r.startIndex + r.count; ++i)
						if (!(i in dataOut.data))
							dataOut.data[i] = m.$(i);
					break;
				case 'random':
					for (let i=r.startIndex; i<r.startIndex + r.count; ++i)
						if (!(i in dataOut.data))
							dataOut.data[i] = m.$(i);
					break;
				case 'url':
					for (let i=r.startIndex; i<r.startIndex + r.data.length; ++i)
						if (!(i in dataOut.data))
							dataOut.data[i] = m.$(i);
					break;
				}
			});
		else if (m.domain.code === 'One')
			dataOut.data[0] = m.$();
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
	static fetchReferenceDiagrams(cat, fn)
	{
		const dgrms = cat.referenceDiagrams.filter(d => !Cat.getDiagram(d));
		const refs = {};
		for (const d in Cat.diagrams)
			refs[d] = true;
		if (dgrms.length > 0)
			Cat.fetchDiagrams(dgrms, refs, fn);
		else if (fn)
			fn([]);
	}
	help()
	{
		return H.p(`Category ${this.getText()}.`);
	}
	addFactorMorphism(domain, factors)
	{
		let m = factorMorphism.get(this, domain, factors);
		m.incrRefcnt();
		return m;
	}
}	// category

class morphism extends element
{
 	constructor(cat, args, level)
	{
		super(cat, args);
		this.class = 'morphism';
		this.subClass = 'morphism';
		this.Domain = typeof args.domain === 'string' ? cat.getObject(args.domain, this.diagram) : args.domain;
		if (this.Domain === null)
			throw `Domain ${args.domain} does not exist in category ${cat.getText()}`;
		this.Domain.incrRefcnt();
		this.Codomain = typeof args.codomain === 'string' ? cat.getObject(args.codomain, this.diagram) : args.codomain;
		if (this.Codomain === null)
			throw `Codomain ${args.codomain} does not exist in category ${cat.getText()}`;
		this.Codomain.incrRefcnt();
		this.category = cat;
		this.arrowType = 'standard';	// TODO mono, epi, ...
		if ((this.diagram !== null && !this.diagram.validateAvailableMorphism(this.name)) || cat.hasMorphism(this.name))
			throw `Morphism name ${this.name} is already taken.`;
		if ('functor' in args)
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
		this.setSignature();
	}
	get domain()
	{
		return Domain;
	}
	get codomain()
	{
		return Codomain;
	}
	decrRefcnt()
	{
		if (this.refcnt <= 0)
		{
			this.domain.decrRefcnt();
			this.codomain.decrRefcnt();
			this.category.morphisms.delete(this.name);
			if ('stringMorphism' in this)
			{
				this.stringMorphism.decrRefcnt();
				stringMorphism.removeStringSvg(this);
			}
		}
		super.decrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.domain =	this.domain.name;
		mor.codomain =	this.codomain.name;
		return mor;
	}
	isIterable()	// FITB
	{
		return false;
	}
	static process(cat, dgrm, data)
	{
		let m = null;
		try
		{
			switch(data.subClass)
			{
			case 'identity':
				m = new identity(cat, data);
				break;
			case 'diagramMorphism':
				const info = Cat.clone(data);
				info.diagram = dgrm;
				m = new diagramMorphism(cat, info);
				break;
			case 'composite':
				m = new composite(cat, data);
				break;
			case 'dataMorphism':
				m = new dataMorphism(cat, data);
				break;
			case 'coproductMorphism':
				m = new coproductMorphism(cat, data);
				break;
			case 'coproductAssemblyMorphism':
				m = new coproductAssemblyMorphism(cat, data);
				break;
			case 'productMorphism':
				m = new productMorphism(cat, data);
				break;
			case 'productAssemblyMorphism':
				m = new productAssemblyMorphism(cat, data);
				break;
			case 'factorMorphism':
				m = new factorMorphism(cat, data);
				break;
			case 'lambdaMorphism':
				m = new lambdaMorphism(cat, data);
				break;
			default:
				m = new morphism(cat, data);
				break;
			}
		}
		catch(e)
		{
			Cat.recordError(e);
		}
		return m;
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
	help()
	{
		return H.p(`Category ${this.category.getText()}`);
	}
}	// morphism

class identity extends morphism
{
	static codename(domain)
	{
		return `Id-${domain.name}`;
	}
	static get(cat, dom)
	{
		const domain = typeof dom === 'string' ? cat.getObject(dom) : dom;
		const name = identity.codename(domain);
		const m = cat.getMorphism(name);
		return m === null ? new identity(cat, domain) : m;
	}
	static ProperName(cat, domain)
	{
		return `1(${domain.getText()})`;
	}
	constructor(cat, args)
	{
		super(cat, args);
		this.subClass = 'identity';
		this.setSignature();
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
		this.flipName = Cat.getArg(args, 'flipName', false);
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
		mor.flipName = this.flipName;
		return mor;
	}
	getNameOffset()
	{
		let mid = 'bezier' in this ? this.bezier.cp2 : D2.scale(0.5, D2.add(this.start, this.end));
		let normal = D2.norm(D2.scale(this.flipName ? -1 : 1, D2.normal(D2.subtract(this.codomain, this.domain))));
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
			anchor = this.flipName ? 'start' : 'end';
		else if (angle > bnd && angle < Math.PI - bnd)
			anchor = this.flipName ? 'end' : 'start';
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
	help()
	{
		return H.p(`Diagram morphism ${this.getText()} in category ${this.category.getText()}`);
	}
}	// diagramMorphism

class multiMorphism extends morphism
{
	static setupMorphisms(cat, morphs)
	{
		return args.morphisms.map(m => (typeof m === 'string' ? cat.getMorphism(m) : m));
	}
	constructor(cat, args)
	{
		super(cat, args);
		this.morphisms = multiMorphism.setupMorphisms(cat, args.morphisms);
		this.morphisms.map(m => m.incrRefCnt());
	}
	signature()
	{
		return Cat.sha256(`${this.category.name} ${this.subClass} ${morphisms.map(m => m.signature()).join()}`);
	}
	decrRefcnt()
	{
		if (this.refcnt === 0)
			this.morphisms.map(m => m.decrRefcnt());
		super.decrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
}

class composite extends multiMorphism
{
	static codename(morphisms)
	{
		return morphisms(m => m.codename(extended, false)).join('-o-');
	}
	static domain(morphisms)
	{
		return morphisms[0].domain;
	}
	static codomain(morphisms)
	{
		return morphisms[morphisms.length - 1].codomain;
	}
	static get(cat, morphisms)
	{
		const name = composite.codename(morphisms);
		const m = cat.getMorphism(name);
		return m === null ? new composite(cat, {morphisms}) : m;
	}
	static ProperName(cat, morphisms)
	{
		return morphisms.map(m => m.getText()).join('&#8728;');
	}
 	constructor(cat, args, level)
	{
		const morphisms = multiMorphism.setupMorphisms(cat, args.morphisms);
		const nuArgs = Cat.clone(args);
		nuArgs.domain = composite.domain(cat, morphisms);
		nuArgs.codomain = composite.codomain(cat, morphisms);
		super(cat, args);
		this.subClass = 'composite';
		this.name = this.name === '' ? composite.codename() : this.name;
		this.properName = this.properName === '' ? composite.ProperName(cat, morphisms) : this.properName;
	}
	isIterable()
	{
		return this.morphisms[0].isIterable();
	}
	help()
	{
		return H.h4('Composite') +
			H.p(`Category ${this.category.getText()}`);
	}
}

class productMorphism extends multiMorphism
{
	static codename(morphs)
	{
		return morphs(m => m.codename(extended, false)).join('-X-');
	}
	static domain(cat, morphs)
	{
		return productObject.get(cat, morphs.map(m => m.domain));
	}
	static codomain(morphs)
	{
		return productObject.get(cat, morphs.map(m => m.codomain));
	}
	static get(cat, morphisms)
	{
		const name = productMorphism.codename(morphisms);
		const m = cat.getMorphism(name);
		return m === null ? new productMorphism(cat, {morphisms}) : m;
	}
	static ProperName(cat, morphisms)
	{
		return morphisms.map(m => m.getText()).join('&times;');
	}
	constructor(cat, args)
	{
		const morphisms = multiMorphism.setupMorphisms(cat, args.morphisms);
		const nuArgs = Cat.clone(args);
		nuArgs.domain = productMorphism.domain(cat, morphisms);
		nuArgs.codomain = productMorphism.codomain(cat, morphisms);
		super(cat, nuArgs);
		this.subClass = 'productMorphism';
		this.name = this.name === '' ? productMorphism.codename() : this.name;
		this.properName = this.properName === '' ? productMorphism.ProperName(cat, morphisms) : this.properName;
	}
	help()
	{
		return H.h4('Product Morphism') +
			H.p(`Category ${this.category.getText()}`) +
			this.diagram.elementHelpMorphTbl(this.morphisms);
	}
	isIterable()
	{
		return this.morphisms.reduce((m, r) => r &= m.isIterable(), true);
	}
}

class coproductMorphism extends multiMorphism
{
	static codename(morphs)
	{
		return morphs(m => m.codename(extended, false)).join('-C-');
	}
	static domain(cat, morphs)
	{
		return coproductObject.get(cat, morphs.map(m => m.domain));
	}
	static codomain(morphs)
	{
		return coproductObject.get(cat, morphs.map(m => m.codomain));
	}
	static get(cat, morphisms)
	{
		const name = coproductMorphism.codename(morphisms);
		const m = cat.getMorphism(name);
		return m === null ? new coproductMorphism(cat, {morphisms}) : m;
	}
	static ProperName(cat, morphisms)
	{
		return morphisms.map(m => m.getText()).join('&plus;');
	}
	constructor(cat, args)
	{
		const morphisms = multiMorphism.setupMorphisms(cat, args.morphisms);
		let nuArgs = Cat.clone(args);
		nuArgs.domain = coproductMorphism.domain(cat, morphisms);
		nuArgs.codomain = coproductMorphism.codomain(cat, morphisms);
		super(cat, nuArgs);
		this.subClass = 'coproductMorphism';
		this.name = this.name === '' ? coproductMorphism.codename() : this.name;
		this.properName = this.properName === '' ? coproductMorphism.ProperName(cat, morphisms) : this.properName;
	}
	help()
	{
		return H.h4('Coproduct Morphism') +
			H.p(`Category ${this.category.getText()}`) +
			this.diagram.elementHelpMorphTbl(this.morphisms);
	}
	isIterable()
	{
		return this.morphisms.reduce((m, r) => r &= m.isIterable(), true);
	}
}

class productAssemblyMorphism extends multiMorphism
{
	static codename(morphisms)
	{
		return `-A--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--A-`;
	}
	static domain(cat, morphisms)
	{
		return morphisms[0].domain;
	}
	static codomain(morphisms)
	{
		return productObject.get(cat, morphisms.map(m => m.codomain));
	}
	static get(cat, morphisms)
	{
		const name = productAssemblyMorphism.codename(morphisms);
		const m = cat.getMorphism(name);
		return m === null ? new productAssemblyMorphism(cat, {morphisms}) : m;
	}
	static ProperName(cat, morphisms)
	{
		return `<${morphisms.map(m => m.codomain.getText()).join(',')}>`;
	}
	constructor(cat, args)
	{
		const morphisms = multiMorphism.setupMorphisms(args.morphisms);
		const nuArgs = Cat.clone(args);
		nuArgs.domain = coproductAssemblyMorphism.domain(cat, morphisms);
		nuArgs.codomain = coproductAssemblyMorphism.codomain(cat, morphisms);
		nuArgs.codomain = codomain;
		super(cat, nuArgs);
		this.subClass = 'productAssemblyMorphism';
		this.name = this.name === '' ? productAssemblyMorphism.codename() : this.name;
		this.properName = this.properName === '' ? productAssemblyMorphism.ProperName(cat, morphisms) : this.properName;
	}
	help()
	{
		return H.h4('Product Assembly Morphism') +
			H.p(`Category ${this.category.getText()}`) +
			this.diagram.elementHelpMorphTbl(this.morphisms);
	}
}

class coproductAssemblyMorphism extends multiMorphism
{
	static codename(morphisms)
	{
		return `-C--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--C-`;
	}
	static domain(cat, morphisms)
	{
		return coproductObject.get(cat, morphisms.map(m => m.domain));
	}
	static codomain(morphisms)
	{
		return morphisms[0].codomain;
	}
	static get(cat, morphisms)
	{
		const name = coproductAssemblyMorphism.codename(morphisms);
		const m = cat.getMorphism(name);
		return m === null ? new coproductAssemblyMorphism(cat, {morphisms}) : m;
	}
	static ProperName(cat, morphisms)
	{
		return `(${morphisms.map(m => m.getText()).join(',')})`;
	}
	constructor(cat, args)
	{
		const morphisms = multiMorphism.setupMorphisms(args.morphisms);
		const nuArgs = Cat.clone(args);
		nuArgs.domain = coproductAssemblyMorphism.domain(cat, morphisms);
		nuArgs.codomain = coproductAssemblyMorphism.codomain(cat, morphisms);
		super(cat, nuArgs);
		this.subClass = 'coproductAssemblyMorphism';
		this.name = this.name === '' ? coproductAssemblyMorphism.codename() : this.name;
		this.properName = this.properName === '' ? coproductAssemblyMorphism.ProperName(cat, morphisms) : this.properName;
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(r => r.name);
		return mor;
	}
	static codename(extended = false, first = true)
	{
		return `-CA--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--AC-`;
	}
	help()
	{
		return H.h4('Coproduct Assembly Morphism') +
			H.p(`Category ${this.category.getText()}`) +
			this.diagram.elementHelpMorphTbl(this.morphisms);
	}
}

class factorMorphism extends morphism
{
	static codename(cat, domain, factors)
	{
		let name = `-R--D--${domain.name}--D-`;
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = domain.getFactor(indices);
			if (f.name !== 'One')
				name += f.name + '-' + indices.join('-');
			else
				name += f.name;
			if (i !== factors.length -1)
				name += '-c-';
		}
		name += '--R-';
		return name;
	}
	static domain(cat, domain, factors)
	{
		return domain;
	}
	static codomain(cat, domain, factors)
	{
		return productObject.get(cat, factors.map(f => domain.getFactor(f)));
	}
	static get(cat, domain, factors)
	{
		const name = factorMorphism.codename(domain, factors);
		const m = cat.getMorphism(name);
		return m === null ? new factorMorphism(cat, {domain, factors}) : m;
	}
	static ProperName(cat, domain, factors)
	{
		return `&lt;${factors.map(f => domain.getFactorProperName(f)).join(',')}&gt;`;
	}
	constructor(cat, args)
	{
		let nuArgs = Cat.clone(args);
		nuArgs.codomain = factorMorphism.codomain(cat, args.domain, args.factors);
		super(cat, nuArgs);
		this.subClass = 'factorMorphism';
		this.name = 'name' in args ? args.name : factorMorphism.codename(cat, domain, factors);
		this.properName = this.properName === '' ? factorMorphism.ProperName(cat, domain, factors) : this.properName;
		this.factors = args.factors;
	}
	signature()
	{
		return Cat.sha256(`${this.category.name} ${this.subClass} ${factors.map(f => f.join('-')).join(':')}`);
	}
	json()
	{
		let mor = super.json();
		mor.factors = this.factors;
		return mor;
	}
	help()
	{
		return H.h4('Factor Morphism') +
			H.p(`Category ${this.category.getText()}`) +
			H.table(H.tr(H.th('Indices')) +
					this.factors.map(f => H.tr(H.td(f.toString()))).join(''));
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
		this.fetchData(null);	// no event
	}
	signature()
	{
		return Cat.sha256(`${this.category.name} ${this.subClass} ${data.join(':')}`);
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
		return mor;
	}
	static checkEditableObject(dgrm, obj)
	{
		return 'token' in dgrm.getObject(obj.expr).expr;
	}
	upperLimit()
	{
		return this.domain.isFinite === 'n' ? Number.MAX_SAFE_INTEGER : this.domain.isFinite;
	}
	addData(e)
	{
		const i = Math.min(this.upperLimit(), document.getElementById('inputTerm').value);
		const elt = this.codomain.fromExpression(true, {uid:0, idp:'data'});
		this.data[i] = elt;
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
		this.ranges = [];
	}
	hasSelfMorph()
	{
		const obj = dgrm.codomain.getObject(this.domain);
		if ('token' in obj && obj.token in Cat.basetypes.objects && obj.token === 'N')
			for(const [m1, m2] of this.diagram.morphisms)
				if (m2.subClass === 'composite' && ms.hasMorphism(this))
					return true;
		return false;
	}
	help()
	{
		const title = 'Data Morphism';
		let html = '';
		if ('recursor' in this && this.recursor !== null)
		{
			title = 'Recursion';
			html = this.diagram.elementHelpMorphTbl(this.recursor.morphisms);
		}
		if (this.ranges.length > 0)
			html += H.table(H.tr(H.th('Ranges')) +
				this.ranges.map(r =>
				{
					let row = '';
					switch(r.type)
					{
					case 'range':
						row = `Contiguous range from ${r.startIndex} for ${r.count} indices starting at value ${r.startValue.toString()}`;
						break;
					case 'random':
						row = `Random range from ${r.startIndex} for ${r.count} indices with min ${r.min.toString()} and max ${r.max.toString()}`;
						break;
					case 'url':
						row = `URL range from ${r.startIndex} for ${r.count} indices from ${r.url}`;
						break;
					}
					return H.tr(H.td(row));
				}).join(''));
		return H.h4(title) +
			H.p(`Category ${this.category.getText()}`) +
			html;
	}
}	// dataMorphism

class recursive extends dataMorphism
{
 	constructor(cat, args)
	{
		super(cat, args);
		this.subClass = 'recursive';
		this.setRecursor(args.recursor);
		this.setSignature();
	}
	signature()
	{
		return Cat.sha256(super.signature() + (typeof this.recursor === 'string' ? this.recursor : this.recursor.name));
	}
	decrRefcnt()
	{
		if (this.refcnt <= 0 && this.recursor)
			this.recursor.decrRefcnt();
		super.decrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.recursor = typeof this.recursor === 'object' ? this.recursor.name : this.recursor;
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
				throw `The data morphism ${this.getText()} does not refer to itself so no recursion.`;
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
	help()
	{
		return H.h4('Recursive Morphism') +
			H.p(`Category ${this.category.getText()}`) +
			H.p(`Recursion morphism: ${typeof this.recursor === 'object' ? this.recursor.getText() : this.recursor}`) +
			html;
	}
}	// recursive

class lambdaMorphism extends morphism
{
	static codename(cat, preCurry, domFactors, homFactors)
	{
		const preCur = typeof preCurry === 'string' ? cat.getMorphism(preCurry) : preCurry;
		const hom = homObject.get(cat, [preCurry.domain, preCurry.codomain]);
		return `-L--${preCur.name}-c--${productObject.codename(domFactors.map(f => hom.getFactorName(f)))}--${productObject.codename(codFactors.map(f => hom.getFactorName(f)))}--L-';
	}
	static domain(cat, preCurry, factors)
	{
		return productObject.get(cat, factors.map(f => preCurry.domain.getFactor(f)));
	}
	static codomain(cat, preCurry, factors)
	{
		const codDom = productObject.get(cat, factors.map(f => preCurry.domain.getFactor(f)));
		return homObject.get(cat, [codDom, preCurry.codomain]);
	}
	static get(cat, preCurry, domFactors, homFactors)
	{
		const name = lambdaMorphism.codename(cat, preCurry, domFactors, homFactors);
		const m = cat.getMorphism(name);
		return m === null ? new lambdaMorphism(cat, {preCurry, domFactors, homFactors}) : m;
	}
	static properName(cat, preCurry, domFactors, homFactors)
	{
		return `&lambda;.${preCurry.getText()}&lt;${domFactors}:${homFactors}`;
	}
	constructor(cat, args)
	{
		const preCurry = typeof args.preCurry === 'object' ? args.preCurry : cat.getMorphism(args.preCurry);
		let nuArgs = Cat.clone(args);
		nuArgs.domain = lambdaMorphism.domain(cat, preCurry, arg.domFactors);
		nuArgs.codomain = lambdaMorphism.codomain(cat, preCurry, arg.homFactors);
		super(cat, nuArgs);
		this.subClass = 'lambdaMorphism';
		this.name = 'name' in args ? args.name : lambdaMorphism.codename(cat, preCurry, args.domFactors, args.homFactors);
		this.properName = this.properName === '' ? lambdaMorphism.ProperName(cat, preCurry, args.domFactors, args.homFactors) : this.properName;
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = args.homFactors;
		const domPermutation = args.domFactors.map(f => f[1]);
		const homPermutation = args.homFactors.map(f => f[1]);
		const centralDomain = productObject.get(cat, [this.codomain.objects[0], this.domain]);
		this.factors = cat.addFactorMorphism(centralDomain, [homPermutation, domPermutation]);
		this.Description = 'description' in args ? args.description : `The currying of the morphism ${this.preCurry.getText()} by the factors ${this.homFactors.toString()}`;
		this.setSignature();
	}
	signature()
	{
		return Cat.sha256(`${this.category.name} ${this.preCurry.sig} ${this.domFactors.map(f => f.join('-')).join(':')} ${this.homFactors.map(f => f.join('-')).join(':')}`);
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
	help()
	{
		return H.h4('Lambda Morphism') +
			H.p(`Lambda morphism of ${this.preCurry.getText()} in category ${this.category.getText()}`);
	}
}	// lambdaMorphism

class stringMorphism extends morphism
{
	constructor(cat, m)
	{
		super(cat.graphCat, {domain:m.domain, codomain:m.codomain, name:m.name, diagram:null});
//		this.graph = m.domCodExpr();
		//		TODO This needs to be a copy;
		this.graph = homObject.get(cat, [preCurry.domain, preCurry.codomain]);
		if ('function' in m)
			this.graph.tagGraph(true, m.function);
	}
	tagGraphFunction(func)
	{
		this.graph.tagGraph(true, func);
	}
	mergeMorphismGraphs(morph, dual = false)
	{
		const graphs = morph.morphisms.map(m => stringMorphism.getGraph(m));
		graphs.map((g, i) =>
		{
			const dom = dual ? 1 : 0;
			const cod = dual ? 0 : 1;
			this.graph.data[dom].mergeGraphs(true, {from:g.graph.data[dom], base:[dom], inbound:[], outbound:[cod, i]});
			const gCod = g.graph.data[cod];
			const tCod = this.graph.data[cod];
			const thisGraph = 'data' in tCod ? tCod.data[i] : tCod;
			thisGraph.mergeGraphs(true, {from:gCod, base:[cod, i], inbound:[cod, i], outbound:[]});
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
//		stringMorphism.bindGraph(this.diagram, this.graph.data[0], true, {cod:this.graph.data[1], link:[], function:'identity', domRoot:[0], codRoot:[1], offset:0});
		this.graph.data[0].bindGraph(true, {cod:this.graph.data[1], link:[], function:'identity', domRoot:[0], codRoot:[1], offset:0});
		this.tagGraphFunction('identity');
	}
	makeDiagonalGraph()
	{
		const dom = this.graph.data[0];
		const cod = this.graph.data[1];
//		stringMorphism.bindGraph(this.diagram, dom, true, {cod:cod.data[0], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 0], offset:0});
//		stringMorphism.bindGraph(this.diagram, dom, true, {cod:cod.data[1], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 1], offset:0});
		dom.bindGraph(true, {cod:cod.data[0], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 0], offset:0});
		dom.bindGraph(true, {cod:cod.data[1], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 1], offset:0});
		this.tagGraphFunction('diagonal');
	}
	makeEvalGraph()
	{
		const dom = this.graph.data[0];
		const domHom = dom.data[0];
		const cod = this.graph.data[1];
		dom.data[1].bindGraph(true, {cod:domHom.lhs, link:[], function:'eval', domRoot:[0, 1], codRoot:[0, 0, 0], offset:0});
		domHom.rhs.bindGraph(true, {cod, link:[], function:'eval', domRoot:[0, 0, 1], codRoot:[1], offset:0});
		this.tagGraphFunction('eval');
	}
	makeCompositeGraph(m)
	{
		const graphCat = m.diagram.graphCat;
		const graphs = m.morphisms.map(cm => stringMorphism.getGraph(cm));
		const expr = m.category.parseObject(graphs.map(m => m.domain.code).join() + ',' + graphs[graphs.length -1].codomain.code);
		graphs.map((g, i) =>
		{
//			stringMorphism.mergeGraphs(this.diagram, expr.data[i], true, {from:g.graph.data[0], base:[0], inbound:[i], outbound:[i+1]});
//			stringMorphism.mergeGraphs(this.diagram, expr.data[i+1], true, {from:g.graph.data[1], base:[1], inbound:[i+1], outbound:[i]});
			expr.data[i].mergeGraphs(true, {from:g.graph.data[0], base:[0], inbound:[i], outbound:[i+1]});
			expr.data[i+1].mergeGraphs(true, {from:g.graph.data[1], base:[1], inbound:[i+1], outbound:[i]});
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
		let offset = 0;
		m.factors.map((r, i) =>
		{
			const dom = domExpr.getExprFactor(r);
			if (dom === null)
			{
				++offset;
				return;
			}
			const cod = m.factors.length === 1 ? codExpr : codExpr.getExprFactor([i]);
			const domRoot = r.slice();
			domRoot.unshift(0);
//			stringMorphism.bindGraph(this.diagram, dom, true, {cod, link:[], function:'factor', domRoot, codRoot:m.factors.length > 1 ? [1, i] : [1], offset});
			dom.bindGraph(true, {cod, link:[], function:'factor', domRoot, codRoot:m.factors.length > 1 ? [1, i] : [1], offset});
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
		const homDom = cod.objects[0];
		const homCod = cod.objects[1];
		const homMap = m.homFactors.map((f, i) => [f, [1, 0, i]]);
		if (m.homFactors.length === 1)
		{
			const f = homMap[0];
			homMap[0] = [f[0], [1, 0]];
		}
		map.push(...homMap);
		map.push([[1], [1, 1]]);
		m.domFactors.map((f, i) => ('data' in dom ? dom.data[i] : dom).copyGraph(true, {map, expr:preCurryGraph.graph.getExprFactor(f)}));
		m.homFactors.map((f, i) => ('data' in homDom ? homDom.data[i] : homDom).copyGraph(true, {map, expr:preCurryGraph.graph.getExprFactor(f)}));
		homCod.copyGraph(true, {map, expr:preCurryGraph.graph.data[1]});
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
		g.graph.data[0].properName(true, {position:0});
		g.graph.data[1].properName(true, {position:0});
		return g;
	}
	static svgLinkUpdate(dom, lnk, data)	// data {graph, dom:{x,y}, cod:{x,y}}
	{
		const isDomLink = lnk[0] === 0;
		const f = data.graph.getExprFactor(lnk);
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
	static colorWheel(data)
	{
		const tran = ['ff', 'ff', 'ff', 'ff', 'ff', '90', '00', '00', '00', '00', '00', '90'];
		const cnt = tran.length;
		data.color = (data.color + 5) % cnt;
		return `${tran[(data.color + 2) % cnt]}${tran[(data.color + 10) % cnt]}${tran[(data.color + 6) % cnt]}`;
	}
	static graphSVG(dgrm, expr, first, data)	// data {index, graph, dom:{x,y, name}, cod:{x,y, name}, visited, elementId}
	{
		return element.expandExpression(dgrm, expr,
			function(dgrm, expr, first, data)
			{
				if (!stringMorphism.isGraphable(expr))
					return;
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
						color = stringMorphism.colorWheel(data);
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
				let svg = stringMorphism.graphSVG(dgrm, expr.objects[0], false, data);
				data.index.pop();
				data.index.push(1);
				svg += stringMorphism.graphSVG(dgrm, expr.objects[1], false, data);
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
				if (!stringMorphism.isGraphable(expr))
					return;
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
	help()
	{
		return H.h4('String morphism') +
			H.p(`Category ${this.category.getText()}`);
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
	help()
	{
		return H.h4('Functor') +
			H.p(`Category ${this.category.getText()}`);
	}
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
	help()
	{
		return H.h4('Transform') +
				H.p(`Category ${this.category.getText()}`);
	}
}

/*
class oppositeMorphism extends morphism
{
	constructor(m)
	{
		super(cat, args);
		this.name = `Dual-${m-name}`;
		this.dual = m;
	}
	get domain()
	{
		return dual.codomain;
	}
	get codomain()
	{
		return dual.domain;
	}
}

class oppositeCategory extends category
{
	constructor(args)
	{
		super(args);
		this.dual = typeof 'args.dual' === 'string' ? $Cat.getObject(args.dual) : args.dual;
	}
	getMorphism(name)
	{
		const m = this.dual.getMorphism(name);
		return dm;
	}
}
*/


class tensor extends functor
{
	constructor(args)
	{
		const nuArgs = Cat.clone(args);
		const cat = typeof args.category === 'string' ? $Cat.getObject(args.category) : args.category;
		nuArgs.domain = productObject.get($Cat, [cat, cat]);
		nuArgs.codomain = cat;
		super($Cat, args);
		this.unit = cat.getObject(args.unit);
		this.associator = args.associator;	// ((A x B) x C =~> A x (B x C)
		this.leftUnitor = args.leftUnitor;	// (1 x A) =~> A
		this.rightUnitor = args.rightUnitor;	// (A x 1) =~> A
		this.braiding = args.braiding;		// A x B =~> B x A
		this.hom = args.hom					// A, B --> [A, B]
		this.diagrams = args.diagrams;		// monoidal, braided, closed, symmetric, cartesian
		this.op = '&otimes;';
	}
	toolbarObject(objs)
	{
		let td = '';
		td += H.td(Cat.display.getButton('tensor', `Cat.getDiagram().gui(evt, this, 'tensor.product')`, 'Tensor product of objects'), 'buttonBar');
		return td;
	}
	toolbarMorphism(form)
	{
		let td = '';
		if (form.distinct)
			td += H.td(this.getButton('tensor', `Cat.getDiagram().gui(evt, this, 'tensor.product')`, 'Tensor product of morphisms'), 'buttonBar');
		return td;
	}
}

class productFunctor extends tensor
{
	toolbarObject(objs)
	{
		let td = '';
		td += H.td(Cat.display.getButton('product', `Cat.getDiagram().gui(evt, this, 'productFunctor.product')`, 'Product of objects'), 'buttonBar');
		td += H.td(Cat.display.getButton('project', `Cat.getDiagram().gui(evt, this, 'productFunctor.factorBtns')`, 'Factor morphism'), 'buttonBar');
		return td;
	}
	toolbarMorphism(form)
	{
		let td = '';
		if (form.distinct)
			td += H.td(Cat.display.getButton('product', `Cat.getDiagram().gui(evt, this, 'productFunctor.product')`, 'Product of morphisms'), 'buttonBar');
		if (form.sink)
			td += H.td(Cat.display.getButton('pullback', `Cat.getDiagram().gui(evt, this, 'productFunctor.pullback')`, 'Pullback'), 'buttonBar');
		if (from.source)
			td += H.td(Cat.display.getButton('productAssembly', `Cat.getDiagram().gui(evt, this, 'productFunctor.productAssembly')`, 'Product assembly'), 'buttonBar');
		return td;
	}
	static productAssembly(e)
	{
		const dgrm = Cat.getDiagram();
		const m = productAssembly.get(dgrm.codomain, dgrm.getSelectedMorphisms());
		dgrm.objectPlaceMorphism(e, 'domain', m.domain.name, m.name);
	}
	static factorBtns(dgrm)
	{
		const from = dgrm.getSelected();
		const expr = from.to.expr;
		const text = from.to.getText();
		let html = H.h4('Create Factor Morphism') +
					H.h5('Domain Factors') +
					H.small('Click to place in codomain') +
						H.button('1', '', Cat.display.elementId(), 'Add terminal object',
						`onclick="Cat.getDiagram().addFactor('codomainDiv', 'productFunctor.selectedFactorMorphism', 'One', '', -1)"`) +
					dgrm.getFactorButtonCode(from.to, expr, {fname:'productFunctor.selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		document.getElementById('toolbarTip').innerHTML = html;
	}
	static selectedFactorMorphism(e)
	{
		const dgrm = Cat.getDiagram();
		const m = dgrm.codomain.addFactorMorphism(dgrm.getSelected().to, diagram.getFactorsById('codomainDiv'));
		dgrm.objectPlaceMorphism(e, 'domain', dgrm.getSelected().name, m.name)
	}
	static dropIsolatedProduct(dgrm, targetObject, dragObject)
	{
		const to = productObject.get(dgrm.codomain, [targetObject, dragObject]);
	}
	constructor(cat, args)
	{
		super(cat, args);
		this.op = '&times;';
	}
}

class coproductFunctor extends tensor
{
	constructor(cat, args)
	{
		super(cat, args);
		this.op = '&plus;';
	}
}

class homFunctor extends functor
{
	static objectToolbar(obj)
	{
		let td = '';
		if (obj.subClass === 'productObject' || obj.subClass === 'homObject')
			td += H.td(Cat.display.getButton('lambda', `Cat.getDiagram().gui(evt, this, 'homFunctor.lambdaForm')`, 'Curry'), 'buttonBar');
		return td;
	}
	static lambdaForm(event, elt)
	{
		const dgrm = Cat.getDiagram();
		const to = dgrm.getSelected().to;
		const codIsHom = to.codomain.subClass === 'homObject';
		let html = H.h4('Curry A &otimes; B -> [C, D]') +
			H.h5('Domain Factors: A &otimes; B') +
			H.small('Click to move to C') +
			H.div(dgrm.getSubFactorBtnCode( to.domain, {dir: 0, fromId:'domainDiv', toId:'codomainDiv'}), '', 'domainDiv') +
			H.h5('Codomain Factors: C') +
			(codIsHom ? H.small('Merge to codomain hom') + Cat.display.getButton('codhom', `Cat.getDiagram().toggleCodHom()`, 'Merge codomain hom', Cat.default.button.tiny) + H.br() : '') +
			H.small('Click to move to A &otimes; B') +
			H.div(codIsHom ?  dgrm.getSubFactorBtnCode( dgrm.codmain.objects[0], {dir:1, fromId:'codomainDiv', toId:'domainDiv'}) : '', '', 'codomainDiv') +
			H.span(Cat.display.getButton('edit', `Cat.getDiagram().gui(evt, this, 'homFunctor.lambdaMorphism')`, 'Curry morphism'));
		document.getElementById('toolbarTip').innerHTML = html;
	}
	static lambdaMorphism(e)
	{
		const dgrm = Cat.getDiagram();
		const from = dgrm.getSelected();
		let domFactors = diagram.getFactorsByDomCodId('domainDiv');
		let homFactors = diagram.getFactorsByDomCodId('codomainDiv');
		const m = lambdaMorphism.get(dgrm.codomain, {preCurry:from.to, domFactors, homFactors});
		const v = D2.subtract(from.codomain, from.domain);
		const normV = D2.norm(D2.normal(v));
		const xyDom = D2.add(from.domain, D2.scale(Cat.default.arrow.length, normV));
		const xyCod = D2.add(from.codomain, D2.scale(Cat.default.arrow.length, normV));
		dgrm.placeMorphism(e, m, xyDom, xyCod);
	}
	constructor()
	{
		const nuArgs = Cat.clone(args);
		const cat = typeof args.category === 'string' ? $Cat.getObject(args.category) : args.category;
		nuArgs.domain = homObject.get($Cat, [cat, cat]);	// TODO oppiness built in?
		nuArgs.codomain = cat;
		super($Cat, args);
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
		/*
		const refHashes = this.references.map(r =>
		{
			if (typeof r !== 'string')
				r.incrRefcnt();
			return r.sha256;
		});
		*/
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
		this.viewport = Cat.getArg(args, 'viewport', {x:0, y:0, scale:1, width:Cat.display.width(), height:Cat.display.height()});
		if (isGUI && this.viewport.width === 0)
		{
			this.viewport.width = window.innerWidth;
			this.viewport.height = window.innerHeight;
			this.viewport.scale = 1;
		}
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
			this.codomain.process(this, args.codomainData);
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
//		this.sha256 = Cat.sha256(args);
	}
	static fetchDiagram(dgrmName, fn)
	{
		Cat.Amazon.fetchDiagramJsons([dgrmName], function(jsons)
		{
			jsons.reverse().map(j =>
			{
				const dgrm = new diagram(j);
				dgrm.saveLocal();
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
		// TODO need different test; remove hasDiagram
		if (namexTst && (Cat.hasDiagram(name) || name in Cat.serverDiagrams))
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
			if (!from.to)
			{
				console.log(`diagram.cleanse [2] ${this.name} ${from.getText()}`);
				this.domain.morphisms.delete(n);
				found = true;
			}
		}
		if (found)
		{
			this.makeHomSets();
			this.saveLocal();
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
	saveLocal()
	{
		if (Cat.debug)
			console.log('save to local storage', diagram.storageName(this.name));
		this.timestamp = Date.now();
		const data = this.stringify();
		localStorage.setItem(diagram.storageName(this.name), data);
	}
	static readLocal(dgrmName)
	{
		const data = localStorage.getItem(diagram.storageName(dgrmName));
		let dgrm = null;
		if (data !== null)
			dgrm = new diagram(JSON.parse(data));
		if (Cat.debug)
			console.log('readLocal',dgrmName,dgrm);
		if (dgrm)
			dgrm.repair();
		return dgrm;
	}
	repair()
	{
		let repair = false;
		for (const [name, obj] of this.domain.objects)
			if (!this.objects.has(obj))
			{
				console.log(`${this.name}: bad domain object ${obj.name}`);
				this.domain.objects.delete(obj.name);
				repair = true;
			}
		return repair;
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
			this.saveLocal();
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
		Cat.display.diagramSVG.innerHTML = Cat.getDiagram().makeAllSVG();
		Cat.updatePanels();
		if ('orig' in this.viewport)
			delete this.viewport.orig;
		this.update(e);
	}
	addSelected(e, eltOrig, clear = false, cls = 'object')
	{
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
			if (elt.name === this.selected[i].name)
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
			this.updateElementAttribute(from, newTo, 'html', newTo.properName);
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
					else if (from.to.function === 'compose' && from.to.isIterable())
						btns += (!this.readonly ? H.td(Cat.display.getButton('run', `Cat.getDiagram().gui(evt, this, 'run')`, 'Evaluate'), 'buttonBar') : '');
					if (this.codomain.isClosed && (('op' in from.to.domain.expr && from.to.domain.expr.op === 'product') || ('op' in from.to.codomain.expr && from.to.codomain.expr.op === 'hom')))		// TODO moved
						btns += H.td(Cat.display.getButton('lambda', `Cat.getDiagram().gui(evt, this, 'lambdaForm')`, 'Curry'), 'buttonBar');
					btns += H.td(Cat.display.getButton('string', `Cat.getDiagram().gui(evt, this, 'displayString')`, 'String'), 'buttonBar');
				}
				else if (!this.readonly)
					btns += H.td(Cat.display.getButton('copy', `Cat.getDiagram().copyObject(evt)`, 'Copy object'), 'buttonBar') +
							H.td(Cat.display.getButton('toHere', `Cat.getDiagram().toolbarHandler('codomain', 'toolbarTip')`, 'Morphisms to here'), 'buttonBar') +
							H.td(Cat.display.getButton('fromHere', `Cat.getDiagram().toolbarHandler('domain', 'toolbarTip')`, 'Morphisms from here'), 'buttonBar') +
							H.td(Cat.display.getButton('project', `Cat.getDiagram().gui(evt, this, 'factorBtnCode')`, 'Factor morphism'), 'buttonBar') +		// TODO moved
							(this.hasDualSubExpr(from.to.expr) ? H.td(Cat.display.getButton('distribute', `Cat.getDiagram().gui(evt, this, 'distribute')`, 'Distribute terms'), 'buttonBar') : '');	// TODO whereto?
			}
		}
		btns += from.class === 'morphism' ? H.td(Cat.display.getButton('symmetry', `Cat.getDiagram().gui(evt, this, 'flipName')`, 'Flip text'), 'buttonBar') : '';
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
				if (from.to.name === m[dir].name || from.to.name === m[dir].name)
					morphs.push(m);
			}
			this.references.map(r =>
			{
				for(const [key, m] of r.morphisms)
				{
					if (from.to.name === m[dir].name)
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
	distribute(e)
	{
		const from = this.getSelected();
		const expr = from.to.expr;
		const text = from.to.getText();
		let html = H.h4('Distribute') +
					H.h5(`Domain Factors`) +
					H.small('Click to place in codomain') +
						H.button('1', '', Cat.display.elementId(), 'Add terminal object',
						`onclick="Cat.getDiagram().addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					this.getFactorButtonCode(from.to, expr, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		document.getElementById('toolbarTip').innerHTML = html;
	}
	getFactorButton(obj, txt, data, action, title)
	{
		return H.td(H.button(obj.getText() + txt, '', Cat.display.elementId(), title,
				`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`));
	}
	getFactorButtonCode(obj, expr, data)	//	data: {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:''}
	{
		let html = '';
		let expand = '';
		const xobj = this.getObject(expr);
		if ('token' in expr)
		{
			const txt = xobj.getText();
			html = this.getFactorButton(xobj, H.sub(data.index.join()), data, 'addFactor', 'Add factor');
			if (!('token' in xobj.expr) && data.op === xobj.expr.op)
				expand = this.getFactorButton(xobj, '', data, 'expandFactor', 'Expand factor');
		}
		else
		{
			html = H.tr(this.getFactorButton(xobj, '', data, 'addFactor', 'Add factor'), 'sidename');
			let tbl = '';
			switch(expr.op)
			{
			case 'product':
				for(let i=0; i<expr.data.length; ++i)
				{
					let subIndex = data.index.slice();
					subIndex.push(i);
					const subx = expr.data[i];
					const obj = 'token' in subx ? this.getObject(subx.token) : this.getObject(subx);
					tbl += H.td(this.getFactorButtonCode(obj, subx, {fname:data.fname, root:data.root, index:subIndex, id:data.id, x:data.x, action:data.action, op:data.op}));
				}
				break;
			}
			html = html + H.tr(H.td(H.table(H.tr(tbl))), 'sidename');
		}
		return H.table(html + (expand !== '' ? H.tr(expand) : ''), 'sidenav', '', '');
	}
	factorBtnCode()
	{
		const from = this.getSelected();
		const expr = from.to.expr;
		const text = from.to.getText();
		let html = H.h4('Create Factor Morphism') +
					H.h5('Domain Factors') +
					H.small('Click to place in codomain') +
						H.button('1', '', Cat.display.elementId(), 'Add terminal object',
						`onclick="Cat.getDiagram().addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					this.getFactorButtonCode(from.to, expr, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		document.getElementById('toolbarTip').innerHTML = html;
	}
	lambdaMorphism(e)	// TODO moved
	{
		const from = this.getSelected();
		let domFactors = diagram.getFactorsByDomCodId('domainDiv');
		let homFactors = diagram.getFactorsByDomCodId('codomainDiv');
		const m = lambdaMorphism.get(this.codomain, {preCurry:from.to, domFactors, homFactors});
		const v = D2.subtract(from.codomain, from.domain);
		const normV = D2.norm(D2.normal(v));
		const xyDom = D2.add(from.domain, D2.scale(Cat.default.arrow.length, normV));
		const xyCod = D2.add(from.codomain, D2.scale(Cat.default.arrow.length, normV));
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
		const svg = `<g id="${id}">${stringMorphism.graphSVG(this, sm.graph, true, {index:[], graph:sm.graph, dom, cod, visited:[], elementId:from.elementId(), color:Math.floor(Math.random()*12)})}</g>`;
		Cat.display.diagramSVG.innerHTML += svg;
	}
	getSubFactorBtnCode(expr, data)
	{
		let html = '';
		if ('data' in expr)
			for(let i=0; i<expr.data.length; ++i)
				html += H.button(this.getObject(expr.data[i]).getText() + H.sub(i), '', Cat.display.elementId(), '', `data-factor="${data.dir} ${i}" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
		else
			html += H.button(this.getObject(expr).getText(), '', Cat.display.elementId(), '', `data-factor="${data.dir} -1" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
		return html;
	}
	lambdaForm(event, elt)
	{
		const from = this.getSelected();
		this.lambdaBtnForm(from.to.domain.expr, from.to.codomain.expr, from.to.domain.name);
	}
	lambdaBtnForm(domExpr, codExpr, root)
	{
		const codIsHom = 'op' in codExpr && codExpr.op === 'hom';
		let html = H.h4('Curry A &otimes; B -> [C, D]') +
			H.h5('Domain Factors: A &otimes; B') +
			H.small('Click to move to C') +
			H.div(this.getSubFactorBtnCode( domExpr, {dir:	0, fromId:'domainDiv', toId:'codomainDiv'}),
				'', 'domainDiv') +
			H.h5('Codomain Factors: C') +
			(codIsHom ? H.small('Merge to codomain hom') + Cat.display.getButton('codhom', `Cat.getDiagram().toggleCodHom()`, 'Merge codomain hom', Cat.default.button.tiny) + H.br() : '') +
			H.small('Click to move to A &otimes; B') +
			H.div(('op' in codExpr && codExpr.op === 'hom') ?
					this.getSubFactorBtnCode( codExpr.lhs, {dir:1, fromId:'codomainDiv', toId:'domainDiv'})
				: '', '', 'codomainDiv') +
			H.span(Cat.display.getButton('edit', `Cat.getDiagram().gui(evt, this, 'lambdaMorphism')`, 'Curry morphism'));
		document.getElementById('toolbarTip').innerHTML = html;
	}
	activateNamedElementForm(e)
	{
		const nameElt = document.getElementById('nameElt');
		if (nameElt.contentEditable === 'true' && nameElt.textContent !== '' && !this.readonly)
			this.createNamedIdentity(e);
		else
		{
			nameElt.contentEditable = true;
			document.getElementById('descriptionElt').contentEditable = true;
			const htmlElt = document.getElementById('htmlElt');
			htmlElt.contentEditable = true;
			htmlElt.focus();
		}
	}
	createNamedIdentity(e)
	{
		try
		{
			if (this.readonly)
				throw 'Diagram is read only';
			const from = this.getSelected();
			if (from.class === 'morphism')	// TODO
				throw 'Not implemented';
			document.getElementById('namedElementError').innerHTML = '';
			const nameElt = document.getElementById('nameElt');
			const name = nameElt.innerText;
			const htmlElt = document.getElementById('htmlElt');
			const html = Cat.htmlEntitySafe(htmlElt.innerText);
			const descriptionElt = document.getElementById('descriptionElt');
			const description = Cat.htmlEntitySafe(descriptionElt.innerText);
			if (name !== '' && !RegExp(Cat.userNameEx).test(name))
					throw 'Invalid object name.';
			if (this.getObject(name))
				throw `Object with name ${name} already exists.`;
			let toNI = new namedObject(this.codomain, {name, html, description});
			const iso = new identity(this.codomain, {domain:toNI, codomain:from.to, description:`Named identity from ${toNI.getText()} to ${from.to.getText()}`});
			const iso2 = new identity(this.codomain, {domain:from.to, codomain:toNI, description:`Named identity from ${from.to.getText()} to ${toNI.getText()}`});
			this.deselectAll();
			const isoFrom = this.objectPlaceMorphism(e, 'codomain', from.name, iso.name)
			const iso2From = new diagramMorphism(this.domain, {diagram:this, domain:isoFrom.codomain.name, codomain:isoFrom.domain.name});
			this.setMorphism(iso2From, iso2);
			iso2From.addSVG();
			Cat.display.deactivateToolbar();
			this.makeHomSets();
			this.saveLocal();
		}
		catch(e)
		{
			document.getElementById('namedElementError').innerHTML = 'Error: ' + Cat.getError(e);
		}
	}
	flipName()
	{
		const from = this.getSelected();
		from.flipName = !from.flipName;
		from.update(this);
		this.saveLocal();
	}
	elementHelp()
	{
		const from = this.getSelected();
		const readonly = from.diagram.readonly;
		let html = '';
		const create = (!readonly && from.to && from.to.isComplex()) ? Cat.display.getButton('edit', `Cat.getDiagram().activateNamedElementForm(evt)`, 'Create named identity', Cat.default.button.tiny) : '';
		if (from.to)
			html = H.h4(H.span(from.to.getText(), '', 'htmlElt') + create) +
							H.p(H.span(Cat.cap(from.to.description), '', 'descriptionElt')) +
							H.p(H.span(Cat.limit(from.to.name), '', 'nameElt', from.to.name)) +
							H.div('', 'error', 'namedElementError') +
					from.to.help();
		else
			html = H.p(H.span(from.properName, 'tty', 'htmlElt') +
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
					dragObjects[elt.domain.name] = elt.domain;
					dragObjects[elt.codomain.name] = elt.codomain;
					break;
				case 'element':
				case 'object':
					dragObjects[elt.name] = elt;
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
			
			const xy = Cat.grid(this.userToDiagramCoords({x:Cat.grid(Cat.display.width()/2), y:Cat.grid(Cat.display.height()/2)}));
			srcObj = new diagramObject(this.domain, {diagram:this, xy});
		}
		else
			srcObj = new diagramObject(this.domain, {diagram:this, xy:Cat.grid(xy)});
		this.setObject(srcObj, obj);
		this.placeElement(e, srcObj);
		return srcObj;
	}
	placeMorphism(e, to, xyDom, xyCod)
	{
		const domain = new diagramObject(this.domain, {diagram:this, xy:Cat.grid(xyDom)});
		const codomain = new diagramObject(this.domain, {diagram:this, xy:Cat.grid(xyCod)});
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
			const toObj = fromObj.to;
			if (to[dir].name !== toObj.name)
				throw `Source and target do not have same code: ${to[dir].name} vs ${toObj.name}`;
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
			return from;
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
			const obj = this.domain.getObject(name).to;
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
			const form = productMorphism.get(this.codomain, morphisms);
			let m = this.getMorphism(form.name);
			if (m === null)
				m = new productMorphism(this, {morphisms});
			m.incrRefcnt();
			from = this.trackMorphism(this.mousePosition(e), m);
		}
		else if (this.selected[0].class === 'object')
		{
			const xy = Cat.barycenter(this.selected);
			from = new diagramObject(this.domain, {diagram:this, xy});
			const to = productObject.get(this.codomain, this.getSelectedObjects());
			this.setObject(from, to);
			from.addSVG();
		}
		if (from)
		{
			const selected = this.selected.slice();
			this.addSelected(e, from, true);
			if (!e.shiftKey)
				selected.map(o => this.isIsolated(o) ? o.decrRefcnt() : null);
			this.update(e, this.selected[0].class);
		}
	}
	coproduct(e)
	{
		let from = null;
		if (this.selected[0].class === 'morphism')
		{
			const morphisms = this.selected.map(m => m.to);
			const form = coproductMorphism.form(this, morphisms);		// ***
			let m = this.getMorphism(form.name);
			if (m === null)
				m = new coproductMorphism(this, {morphisms});		// ***
			m.incrRefcnt();
			from = this.trackMorphism(this.mousePosition(e), m);
		}
		else if (this.selected[0].class === 'object')
		{
			const xy = Cat.barycenter(this.selected);
			from = new diagramObject(this.domain, {diagram:this, xy});
			const to = coproductObject.get(this.codomain, this.getSelectedObjects());
			this.setObject(from, to);
			from.addSVG();
		}
		if (from)
		{
			const selected = this.selected.slice();
			this.addSelected(e, from, true);
			if (!e.shiftKey)
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
		const m = productAssembly.get(this.codomain, this.getSeletectedMorphisms());
		this.objectPlaceMorphism(e, 'domain', m.domain.name, m.name);
	}
	coproductAssembly(e)
	{
		const m = coproductAssembly.get(this.codomain, this.getSeletectedMorphisms());
		this.objectPlaceMorphism(e, 'codomain', m.codomain.name, m.name);
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
		const texts = Cat.display.topSVG.querySelectorAll('.element');
		if (elt === null)
			texts.forEach(function(t)
			{
				if (t.dataset.name === except)
					return;
				let bbox = t.getBBox();
				if ('childNodes' in t && t.childNodes.length > 0)	// for newlines
				{
					const transform = t.parentNode.transform.baseVal.getItem(0);
					if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE)
					{
						bbox.x = transform.matrix.e;
						bbox.y = transform.matrix.f;
					}
				}
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (inside(bbox, pnt, upperRight))
					elt = this.getElement(t.dataset.name);
			}, this);
		return elt;
	}
	canFuseObjects(dragFrom, targetFrom)
	{
		if (dragFrom.class === 'object')
		{
			const dragTo = dragFrom.to;
			const targetTo = targetFrom.to;
			if ((dragTo.isInitial && !targetTo.isInitial) || (!dragTo.isInitial && targetTo.isInitial))
				return false;
			const morphs = this.getObjectMorphisms(dragFrom);
			if (morphs.doms.length === 0 && morphs.cods.length === 0)
				return true;
			const a = dragTo.name === targetTo.name && !dragFrom.isEquivalent(targetFrom);
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
	getSelectedObjects()
	{
		return this.selected.filter(s => s.class === 'object').map(o => o.to);
	}
	getSelectedMorphisms()
	{
		return this.selected.filter(s => s.class === 'morphism').map(m => m.to);
	}
	compose(e)
	{
		const from = new diagramMorphism(this.domain, {diagram:this, domain:this.selected[0].domain.name, codomain:this.selected[this.selected.length -1].codomain.name, morphisms:this.selected});
		const to = composite.get(this.codomain, this.getSelectedMorphisms());
		this.setMorphism(from, to);
		from.addSVG();
		this.update(e, 'morphism', from, true);
	}
	run(e)
	{
		const from = this.getSelected();
		const isThreeD = from.to.codomain.name === 'threeD';
		const isTty = from.to.codomain.name === 'tty';
		if (from.class === 'morphism' && from.to.isIterable())
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
				continue;
			expr = expr.data[k];
		}
		div.innerHTML += H.button(this.getObject(expr).getText() + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="Cat.H.del(this);${action}"`);
	}
	static getFactorsById(id)
	{
		const btns = document.getElementById(id).querySelectorAll('button');
		let factors = [];
		btns.forEach(function(b)
		{
			const idx = JSON.parse(`[${b.dataset.indices}]`);
			factors.push(idx);
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
	/*
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
	*/
	selectedFactorMorphism(e)		// TODO moved
	{
		const m = this.codomain.addFactorMorphism(this.getSelected().to, diagram.getFactorsById('codomainDiv'));
		this.objectPlaceMorphism(e, 'domain', this.getSelected().name, m.name)
	}
	validateAvailableObject(name)
	{
		return name !== '' && !this.codomain.hasObject(name);
	}
	validateAvailableMorphism(name)
	{
		return name !== '' && !this.codomain.hasMorphism(name);
	}
	/*
	getIdentityMorphism(objName)
	{
		return this.codomain.hasMorphism(objName) ? this.codomain.getMorphism(objName) : $Cat.getTransform(`id-${this.codomain.name}`).$(this, this.getObject(objName));
	}
	*/
	newDataMorphism(dom, cod)
	{
		const name = this.codomain.getAnon('Data');
		return new dataMorphism(this.codomain, {name, html:name.slice(0, 9) + '&hellip;', diagram:this.name, domain:dom.name, codomain:cod.name});
	}
	updateObjectTableRows()
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
		document.getElementById(`${this.name}_ObjPnl`).innerHTML = H.table(objects.map(o => H.tr(
			(Cat.display.showRefcnts ? H.td(o.refcnt) : '') +
							H.td(o.refcnt === 0 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeObject(evt, '${o.name}')`, 'Delete object') : '', 'buttonBar') +
							H.td(o.getText()),
							'grabbable sidenavRow', '', Cat.cap(o.description), `draggable="true" ondragstart="Cat.display.object.drag(event, '${o.name}')"`)).join(''));
	}
	updateMorphismTableRows()
	{
		let html = '';
		let found = {}
		let morphisms = [];
		for (const [k, m] of this.morphisms)
		{
			if (m.name in found)
				continue;
			found[m.name] = true;
			html += H.tr(	(Cat.display.showRefcnts ? H.td(m.refcnt) : '') +
							H.td(m.refcnt <= 0 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeMorphism(evt, '${k.name}')`, 'Delete morphism') : '', 'buttonBar') +
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
			html += H.tr(	(Cat.display.showRefcnts ? H.td(m.refcnt) : '') +
							H.td(m.refcnt <= 0 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeCodomainMorphism(evt, '${m.name}');`, 'Delete dangling codomain morphism') :
								'', 'buttonBar') +
							H.td(m.getText()) +
							H.td(m.domain.getText()) +
							H.td('&rarr;') +
							H.td(m.codomain.getText()), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${m.name}')"`);
		}
		document.getElementById(`${this.name}_MorPnl`).innerHTML = H.table(html);
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
			obj.decrRefcnt();
			from[dir] = detachedObj;
			this.setObject(detachedObj, from.to[dir]);
			detachedObj.incrRefcnt();
			detachedObj.addSVG();
			from.update(this);
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
		this.saveLocal();
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
				if (attr === 'html')
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
			h.contentEditable = false;
			this.updateElementAttribute(from, from.to, attr, Cat.htmlEntitySafe(h.innerText));
			this.elementHelp();
			from.showSelected();
			this.saveLocal();
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
			if ('range' in from.to)
				document.getElementById('dataRanges').innerHTML = '';
			from.to.clear();
			this.saveLocal();
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
		let obj = this.getObject(elt.expr);
		return ('op' in obj.expr && obj.expr.op === 'hom') ? this.getObject(obj.expr.lhs) : null;
	}
	getHomCodomain(elt)	// used in CatFn.js
	{
		let obj = this.getObject(elt.expr);
		return ('op' in obj.expr && obj.expr.op === 'hom') ? this.getObject(obj.expr.rhs) : null;
	}
	getProductFactors(elt)
	{
		let obj = this.getObject(elt.expr);
		let factors = [];
		factors = 'op' in obj.expr && obj.expr.op === 'product' && obj.expr.data.map(x => this.getObject(x));
		return factors;
	}
	canEvaluate(elt)
	{
		if (!this.codomain.isClosed)
			return false;
		let obj = this.getObject(elt.expr);
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
			const sel0 = this.selected[0].to;
			const sel1 = this.selected[1].to;
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
						N.isEquivalent(this.getObject(domain.expr.data[0]));
					if (r)
					{
						const factor1 = this.getObject(domain.expr.data[1]);
						const factor2 = this.getObject(domain.expr.data[2]);
						r = factor1.expr.op === 'hom' &&
							factor2.isEquivalent(this.getObject(factor1.expr.lhs)) &&
							factor2.isEquivalent(this.getObject(factor1.expr.rhs));
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
			this.saveLocal();
			Cat.status(e, `Recursor for ${sel0.getText()} has been set`);
		}
	}
	removeObject(e, name)
	{
		const o = this.codomain.getObject(name);
		if (o !== null)
		{
			while(o.refcnt>=0)
				o.decrRefcnt();
			this.updateObjectTableRows();
			this.update(e);
			this.saveLocal();
		}
	}
	removeMorphism(e, name)
	{
		const m = this.domain.getMorphism(name);
		if (m !== null)
		{
			m.decrRefcnt();
			this.updateMorphismTableRows();
			this.update(e);
			this.saveLocal();
		}
	}
	removeCodomainMorphism(e, name)
	{
		const m = this.codomain.getMorphism(name);
		if (m !== null)
		{
			m.decrRefcnt();
			this.updateMorphismTableRows();
			this.update(e);
			this.saveLocal();
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
		return this.parseObject(code).codename();
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
	downloadJS(e)
	{
		const start = Date.now();
		const diagrams = Object.keys(this.getReferenceCounts()).map(r => Cat.getDiagram(r).json());
		diagrams.push(this.json());
		const params =
		{
			FunctionName:	'CateconDownloadJS',
			InvocationType:	'RequestResponse',
			LogType:		'None',
			Payload:		JSON.stringify({diagrams})
		};
		const name = this.name;
		Cat.Amazon.lambda.invoke(params, function(error, data)
		{
			if (error)
			{
				Cat.recordError(error);
				return;
			}
			const blob = new Blob([JSON.parse(data.Payload)], {type:'application/json'});
			const url = Cat.url.createObjectURL(blob);
			Cat.download(url, `${name}.js`);
			const delta = Date.now() - start;
			Cat.status(e, `Diagram ${name} Ecmascript generated<br/>Elapsed ${delta}ms`);
		});
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
	removeReferenceDiagram(e, name)	// TODO
	{
		if (this.canRemoveReferenceDiagram(name))
		{
			for (let i=0; i<this.references.length; ++i)
				if (this.references[i].name === name)
				{
					this.references.splice(idx, 1);		// TODO idx
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
		return this.references.filter(d => d.name === name).length > 0;
	}
	unlock(e)
	{
		this.readonly = false;
		Cat.display.diagram.updateLockBtn(this);
	}
	lock(e)
	{
		this.readonly = true;
		Cat.display.diagram.updateLockBtn(this);
	}
	copyObject(e)
	{
		const from = this.getSelected();
		const xy = D2.add(from, D2.scale(Cat.default.arrow.length/2, {x:1, y:1}));
		this.placeObject(e, from.to, xy);
	}
	help()
	{
		return H.p(`Diagram ${this.getText()} in category ${this.category.getText()}`);
	}
	parseObject(code)
	{
		const obj = this.codomain.parseObject(code);
		obj.diagram = this;
		return obj;
	}
}

let PFS = null;
let Graph = null;

if (isGUI)
{
	if (!Cat.hasAcceptedCookies())
	{
		document.getElementById('intro').innerHTML = Cat.intro();
		Cat.display.diagram.fetchRecentDiagrams();
		window.Cat			= Cat;
		return;
	}
}

Cat.initialize();	// boot-up

//
// category = [objects, morphisms, id map, domain map, codomain map, compositor, assoc array]
//

const bootCategories = [
	['CAT0', 'CAT1', null, null, null, null, {name:'CAT'}],
	[Cat.Objects, Cat.Morphisms, null, null, null, null, {name:'Cat'}],
];

//
// Morphism = [category, domain object, codomain object, assoc array]
//
const Morphisms = new map();

const bootMorphisms = [
	['CAT', '1', 'CAT0', {name:'Cat'}],
];

})(typeof exports === 'undefined' ? this['Cat'] = this.Cat : exports);
