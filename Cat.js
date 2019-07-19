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

/*
class operator
{
	constructor(args)
	{
		this.sym = args.sym;
		this.symCode = args.symCode;
		this.nameCode = args.nameCode;
	}
}
*/

//
// Global to determine if we are running in a browser window or not
//
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
	//
	// is autosave turned on for diagrams?
	//
	autosave:		false,
	bracketWidth:	0,
	catalog:		{},
	clear:			false,
	commaWidth:		0,
	//
	// Are we in debug mode to print messages on the console?
	//
	debug:			true,
	//
	// diagrams that we have loaded
	//
	diagrams:		{},
	//
	// Have we finished the boot sequence and initialized properly?
	//
	initialized:	false,
	//
	// regular expression for for validating basic names
	//
	nameEx:			RegExp('^[a-zA-Z_-]+[@a-zA-Z0-9_-]*$'),
	localDiagrams:	{},
	parenWidth:		0;
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
			if (CatObject.isPrototypeOf(elt) || DiagramText.isPrototypeOf(elt))
				if (!(elt.name in elts))
					elts[elt.name] = elt;
			else if (Morphism.isPrototypeOf(elt))
			{
				if (!(elt.domain.name in elts))
					elts[elt.domain.name] = elt.domain;
				if (!(elt.codomain.name in elts))
					elts[elt.codomain.name] = elt.codomain;
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
			if (!localStorage.getItem(Diagram.StorageName(d)))
			{
				if (Cat.debug)
					console.log('getLocalDiagramList deleting', d);
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
		Cat.localDiagrams[dgrm.name] = {name:dgrm.name, properName:dgrm.properName, timestamp:dgrm.timestamp, description:dgrm.description, username:dgrm.username};
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
			isGUI && localStorage.removeItem(Diagram.StorageName(dgrmName));
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
	/*
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
			txt += elements[i].properName;
		}
		return txt + '.';
	},
	*/
	initializeCT(fn)
	{
		$Cat = new Category(
		{
			name:			'Cat',
			properName:		'&#x2102;&#x1D552;&#x1D565;',
			description:	'Category of small categories',
		});
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
			Cat.parenWidth = Cat.textWidth('(');
			Cat.bracketWidth = Cat.textWidth('[');
			Cat.commaWidth = Cat.textWidth(', ');
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
							const nuCat = new Category({name:cat.name, properName:cat.properName, description:cat.description, signature:cat.signature});
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
			nbCat.innerHTML = cat.properName;
			nbCat.title = Cat.cap(cat.description);
			category.fetchReferenceDiagrams(cat, fn);
		},
		selectCategoryDiagram(cat, fn)
		{
			this.selectCategory(cat, function()
			{
				let name = Cat.getLocalStorageDiagramName(cat);
				name = name === null ? diagram.Codename({category:cat.name, user:Cat.user.name, basename:'Draft'}) : name;
				let dgrm = Cat.getDiagram(name);
				if (dgrm === null && diagram.readLocal(name) === null)
				{
					dgrm = new Diagram({name, codomain:cat, properName:'Draft', description:'Scratch diagram', user:Cat.user.name});
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
				const xy = dgrm.mousePosition(e);
				if (Cat.display.drag)
				{
					Cat.display.deactivateToolbar();
					if (!dgrm.readonly && e.ctrlKey && dgrm.selected.length == 1 && Cat.display.fuseObject === null)
					{
						let from = dgrm.getSelected();
						Cat.display.mouseover = dgrm.findElement(xy, from.name);
						const isolated = from.refcnt === 1;
						if (CatObject.isPrototypeOf(from.to))
						{
							const to = from.to;
							Cat.display.fuseObject = new DiagramObject(dgrm, {xy});
							dgrm.deselectAll();
							const fromMorph = new DiagramMorphism(dgrm.domain, {diagram:dgrm, domain:from.name, codomain:Cat.display.fuseObject.name});
							const id = Identity.Get(dgrm.codomain, to);
							fromMorph.incrRefcnt();
							dgrm.setMorphism(fromMorph, id);
							Cat.display.fuseObject.addSVG();
							fromMorph.addSVG();
							fromMorph.update();
							from = Cat.display.fuseObject;
							dgrm.addSelected(e, Cat.display.fuseObject);
							from.setXY(xy);
							dgrm.saveLocal();
							dgrm.checkFusible(xy);
						}
						else if (Morphism.isPrototypeOf(from.to))
						{
							dgrm.deselectAll();
							const domain = new DiagramObject(dgrm, {xy:from.domain.getXY()});
							const codomain = new DiagramObject(dgrm, {xy:from.codomain.getXY()});
							const fromCopy = new DiagramMorphism(dgrm, {domain, codomain});
							fromCopy.incrRefcnt();
							dgrm.setMorphism(fromCopy, from.to);
							fromCopy.update();
							domain.addSVG();
							codomain.addSVG();
							fromCopy.addSVG();
							dgrm.addSelected(e, fromCopy);
							dgrm.saveLocal();
							Cat.display.fuseObject = fromCopy;
							dgrm.checkFusible(xy);
						}
					}
					else
					{
						const skip = dgrm.getSelected();
						Cat.display.mouseover = dgrm.findElement(xy, skip ? skip.name : '');
						switch(Cat.display.tool)
						{
						case 'select':
							if (!dgrm.readonly)
							{
								dgrm.updateDragObjects(xy);
								dgrm.checkFusible(xy);
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
					Cat.display.mouseover = dgrm.findElement(xy);
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
					Cat.display.mouseover = dgrm.findElement(xy);
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
							if (CatObject.isPrototypeOf(dragObject.to) && CatObject.isPrototypeOf(targetObject.to))
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
//									dgrm.setObject(targetObject, to);
									targetObject.setObject(to);
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
										if (morphs.cods.length === 1 && morphs.doms.length === 0 && Identity.isPrototypeOf(from.to) && !from.to.domain.isInitial)
										{
											const cod = dragObject.to;
											const toTargetObject = targetObject.to;
											if (cod.signature !== toTargetObject.signature)
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
							else if (dgrm.codomain.hasProducts && Morphism.isPrototypeOf(dragObject.to) && Morphism.isPrototypeOf(targetObject.to) && dgrm.isIsolated(dragObject) && dgrm.isIsolated(targetObject))
							{
								dgrm.deselectAll();
								const dragMorphTo = dragObject.to;
								const targetMorphTo = targetObject.to;
								const morphisms = [targetMorphTo, dragMorphTo];
								const newTo = ProductMorphism.Get(dgrm.codomain, morphisms);
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
				const xy = dgrm.mousePosition(e);
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
					from = new DiagramObject(dgrm, {xy});
					to = dgrm.getObject(name);
					from.setObject(to);
					break;
				case 'morphism':
					to = dgrm.getMorphism(name);
					if (to === null)
						throw `Morphism ${name} does not exist in category ${cat.properName}`;
					const domain = new DiagramObject(dgrm, {xy});
					const codLen = Cat.textWidth(to.domain.properName)/2;
					const domLen = Cat.textWidth(to.codomain.properName)/2;
					const namLen = Cat.textWidth(to.properName);
					const codomain = new DiagramObject(dgrm,
						{
							xy:
							{
								x:pnt.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4),
								y:pnt.y
							}
						});
					from = new DiagramMorphism(dgrm, {domain, codomain});
					from.incrRefcnt();	// TODO ???
					dgrm.setMorphism(from, to);
					from.update();
					domain.addSVG();
					codomain.addSVG();
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
				const tbl = H.table(cats.map(c => H.tr(H.td(`<a onclick="Cat.selected.selectCategoryDiagram('${c.name}')">${c.properName}</a>`), 'sidenavRow')).join(''));
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
					new Category($Cat, {name, properName:document.getElementById('categoryHtml').value, description:document.getElementById('categoryDescription').value});
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
					if (dgrm.selected.length === 1 && Morphism.isPrototypeOf(dgrm.getSelected().to))
					{
						let from = dgrm.getSelected();
						const to = from.to;
						let tbl = '';
						if (DataMorphism.isPrototypeOf(to))
						{
							to.updateRecursor();
							html += H.h3(to.properName, '', 'dataPanelTitle');
							if (to.recursor !== null)
								html += H.small(`Recursor morphism is ${to.recursor.properName}`);
							if (to.domain.isEditable())
							{
								html += H.button('Add Data', 'sidenavAccordion', '', 'Add entries to this map', `onclick="Cat.display.accordion.toggle(this, \'dataInputPnl\')"`);
								const irx = 'regexp' in to.domain ? `pattern="${to.regexp}"`: '';
								const inputForm = Cat.display.input('', 'inputTerm', to.domain.properName, irx);
								const outputForm = to.codomain.toHTML();
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
											H.tr(H.td(Cat.display.input('', 'startTerm', to.domain.text, irx)), 'sidenavRow') +
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
													H.tr(H.td(Cat.display.input('', 'inputStartIdx', 'Start ' + to.domain.text, irx, '')), 'sidenavRow') +
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
													H.tr(H.td(Cat.display.input('', 'urlStartIdx', 'Start ' + to.domain.text, irx, '')), 'sidenavRow') +
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
							tbl = H.tr(H.th(to.domain.properName) + H.th(to.codomain.properName));
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
				let html = H.tr((editable ? H.th('') : '') + H.th('Type') + H.th('Start') + H.th('') + H.th(m.codomain.properName));
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
							H.h4(H.span(dgrm ? dgrm.properName : '', '', 'dgrmHtmlElt') + H.span('', '', 'dgrmHtmlEditBtn')) +
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
					const dgrm = new Diagram({name:fullname, codomain, properName:document.getElementById('diagramHtml').value, description:document.getElementById('newDiagramDescription').value, user:Cat.user.name});
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
				nbDgrm.innerHTML = `${dgrm.properName} ${H.span('by '+dgrm.username, 'italic')}`;
				nbDgrm.title = Cat.cap(dgrm.description);
				document.getElementById('dgrmHtmlElt').innerHTML = dgrm.properName;
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
						properName:		localInfo ? ('html' in localInfo ? localInfo.properName : localInfo.properName) : (serverInfo ? ('html' in serverInfo ? serverInfo.properName : serverInfo.properName) : ''),
						timestamp:		localInfo ? localInfo.timestamp : (serverInfo ? serverInfo.timestamp : ''),
					};
					return info;
				}
				const info =
				{
					description:	obj.description,
					username:		obj.username,
					name:			obj.name,
					properName:		obj.properName,
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
									H.tr(H.td(H.h5(info.properName), '', '', '', 'colspan="2"')) +
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
										return `<img class="intro" src="${Cat.Amazon.URL(tokens[1], d.username, d.name)}.png" width="300" height="225" title="${d.properName} by ${d.user}: ${d.description}"/>`;
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
					const txt = new DiagramText(dgrm, {name:`Text${dgrm.textId++}`, diagram:dgrm, properName:hElt.value, xy});
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
									(this.readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().getElement('${t.name}').editText('text_${i}', 'properName')`, 'Edit', Cat.default.button.tiny)), 'left'), 'sidenavRow')
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
			const elt = dgrm.getSelected();
			if (dgrm.selected.length === 1)
				tb.innerHTML = dgrm.toolbar(elt);
			else if (dgrm.selected.length > 1)
			{
				let html = H.td(Cat.display.getButton('close', 'Cat.display.deactivateToolbar()', 'Close'), 'buttonBar');
//				let type = dgrm.selected[0].class;
				if (Morphism.isPrototypeOf(elt))
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
				else if (CatObject.isPrototypeOf(elt))
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
				html += H.tr(H.td(m.properName) + H.td(m.domain.properName) + H.td('&rarr;') + H.td(m.codomain.properName),
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
							const txt = new DiagramText(dgrm, {name:`Text${dgrm.textId++}`, diagram:dgrm, properName:'Lorem ipsum cateconium', xy});
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
						Cat.Amazon.getUserDiagramsFromServer(function(dgrms)
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
						Cat.Amazon.getUserDiagramsFromServer(function(dgrms)
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
		getUserDiagramsFromServer(fn)
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
				payload.Items.map(i => Cat.serverDiagrams[i.subkey.S] = {timestamp:Number.parseInt(i.timestamp.N), description:i.description.S, properName:i.properName.S});
				Cat.display.diagram.setUserDiagramTable();
				if (fn)
					fn(payload.Items);
			});
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
				const dgrm = new Diagram(j);
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
};	// Cat

class expression
{
	constructor(args)
	{
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
		Cat.arrayInclude(this, 'functions', data.prototype.name);
		Cat.arrayInclude(data.cod, 'functions', data.prototype.name);
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
	/*
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
	*/
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
			const f = data.getFactor(lnk);
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
		const f = data.getFactor(factorLink);
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

//
// Element
//
// The name of an element has the form:  category::user::diagram::basename
// The category is the target category of the diagram, say Set.
// The basename is unique within the diagram's domain or codomain working categories.
// Referencing is done by name, not by basename.
// Basenames for the domain 'graph' category of the diagram start with a special character '@'.
//
// $Cat is the magic global variable for the working Cat
//
function Element(cat, args)
{
	//
	// Every element belongs to a category, except CAT ...
	//
	if (cat && !Category.isPrototypeOf(cat))
		throw 'Not a category';
	else if ($Cat === null && args.name === 'Cat')	// bootstrap
		cat = this;
	//
	// If we're chaining/polymorphing, then don't redefine our category
	//
	if (!('category' in this))
		Object.defineProperty(this, 'category', {value: cat, enumerable: true});
	//
	// Nothing refers to an element with a reference count of zero.
	//
	this.refcnt = 0;
	//
	// Many elements belong to a diagram.
	//
	if ('diagram' in args)
		this.diagram = String.isPrototypeOf(args.diagram) ? Cat.getDiagram(args.diagram) : (Diagram.isPrototypeOf(args.diagram) ? args.diagram : null);
	//
	// a user owns this element?
	//
	if (!('user' in this) && 'user' in args)
		Object.defineProperty(this, 'user', {value: args.user, enumerable: true});
	//
	// see if the owning category will take the basename
	//
	if (Cat.nameEx.test(args.basename))
		Object.defineProperty(this, 'basename', {value: args.basename, enumerable: true});
	else
		throw "Invalid base name";
	//
	// set the name of this element
	//
	this.name = Element.Codename(cat.name, 'diagram' in this ? this.diagram.name : '', 'user' in this ? this.user : '', this.basename);
	//
	// Subcats have duplicate names, that of the master cat.
	//
	if (!('subobject' in args) && !this.category.validateName(this.name))
		throw `Name ${this.name} is already taken.`;
	if (!('properName' in this)
		this.properName = Cat.getArg(args, 'properName', '');
	if (this.properName === '')
		this.properName = this.basename;
	if (!('description' in this)
		this.description = Cat.getArg(args, 'description', '');
	if (!('signature' in this) && 'signature' in args)	// signature confirmation comes later after the object is built
		Object.defineProperty(this, 'signature', {value: s, enumerable: true});
	if (!('readonly' in this))
		this.readonly = Cat.getArg(args, 'readonly', false);
}
//
// override as needed
//
Element.prototype.computeSignature = function(sig = '')
{
	return Cat.sha256(`${sig}${Cat.sep}${this.prototype.name}${Cat.sep}${this.name}`);
}
Element.prototype.setSignature(sig = null)
{
	const s = this.computeSignature(sig);
	if ('signature' in this && this.signature !== s)
		throw `bad signature ${s} != ${this.signature}`;
	else
		Object.defineProperty(this, 'signature', {value: s, enumerable: true});
}
//
// increment the reference count
//
Eleemnt.prototype.incrRefcnt()
{
	++this.refcnt;
}
//
// decrement the reference count
//
// Memory management comes in the derived objects and morphisms, not here.
//
Eleemnt.prototype.decrRefcnt()
{
	if (Cat.debug)
		console.log('element.decrRefcnt', this.name, this.refcnt);
	--this.refcnt;
}
//
// Set an argument in an associative array but not overwriting a previously set value.
//
Element.prototype.setArg(a, k, v)
{
	if (k in a)
		return;
	a.k = v;
}
Element.prototype.json(a = {})
{
	a.category =	Element.setArg(a, 'category', this.category.name);
	a.description =	Element.setArg(a, 'description', this.description);
	a.signature =	Element.setArg(a, 'signature', this.signature);
	a.basename =	Element.setArg(a, 'basename', this.name);
	a.prototype =	Element.setArg(a, 'prototype', this.prototype.name);
	a.properName =	Element.setArg(a, 'properName', this.properName);
	a.readonly =	Element.setArg(a, 'readonly', this.readonly);
	if ('diagram' in this && this.diagram !== null)
		a.diagram =	Element.setArg(a, 'diagram', this.diagram);
	return a;
}
//
// Return a string representing the element.  Reconstitute it with process().
//
Element.prototype.stringify()
{
	return JSON.stringify(this.json());
}
//
// If two objects have the same signature then they are the same.
//
Element.prototype.isEquivalent(obj)
{
	return obj ? this.signature === obj.signature : false;
}
//
// isDeleteable means that the reference count is 0 or 1.  In other words, already being at zero means
// nothing else is referring to the object and so it can already be deleted.  For 1, that means if you
// decrement the reference count as expected, then it can be deleted.
//
Element.prototype.isDeletable()
{
	return this.refcnt <= 1;
}
//
// Element static methods
//
Element.prototype.Codename(catName, dgrmName, userName, basename)
{
	return `${catName}${Cat.sep}${dgrmName}${Cat.sep}${userName}${Cat.sep}${basename}`;
}

//
// CatObject
//
// A CatObject is an Element.
// Have to call this CatObject since Object is a javascript reserved keyword.
//
function CatObject(cat, args)
{
	Element.call(this, cat, args);
	this.category.addObject(this);
}
CatObject.prototype.decrRefcnt()
{
	super.decrRefcnt();
	if (this.refcnt <= 0)
	{
		if (Cat.debug)
			console.log('CatObject.decrRefcnt delete',this.category.name,this.name);
		this.category.objects.delete(this.name);
	}
}
CatObject.prototype.help()
{
	return H.p(`Object ${this.properName} in category ${this.category.properName}`);
}
//
// With no further info the ony factor we could possibly return is the object itself.
//
CatObject.prototype.getFactor(factor)
{
	return this;
}
//
// Return true if the object has an editor for a web page
//
CatObject.prototype.isEditable()
{
	return false;	// override as needed
}
//
// If possible, read the value of the object from the document's HTML.
//
CatObject.prototype.fromHTML(first = true, {uid:0, id:'data'})
{}
//
// Generally objects may be graphable in a string graph, but usually not initial or terminal objects (depending).
//
CatObject.prototype.isGraphable()
{
	return true;
}
CatObject.prototype.formPort(data = {position:0, w:0}, first = true)
{
	const w = Cat.textWidth(this.properName);
	return
	{
		position:	w + data.position,
		prototype:	this.prototype.name,
		w,
	};
}
//
// CatObject static methods
//
CatObject.process(cat, args, dgrm)
{
	try
	{
		let r = null;
		switch(args.prototype)
		{
		case 'CatObject':
			r = new CatObject(cat, args);	// TODO should not happen?
			break;
		case 'NamedObject':
			r = new NamedObject(cat, args);
			break;
		case 'ProductObject':
			r = new ProductObject(cat, args);
			break;
		case 'CoproductObject':
			r = new CoproductObject(cat, args);
			break;
		case 'HomObject':
			r = new HomObject(cat, args);
			break;
		case 'DiagramObject':
			const nuArgs = Cat.clone(args);
			nuArgs.diagram = dgrm;
			r = new DiagramObject(dgrm, nuArgs);
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
CatObject.prototype.tagGraph(graph, tag, first = true)
{
	if (!('functions' in graph))
		graph.tags = [tag];
	else if (graph.tags.indexOf(tag) === -1)
		graph.tags.push(tag);
	if (!('links' in graph))
		graph.links = [];
}

function NamedObject(cat, args)
{
	CatObject.call(this, cat, args);
	this.setSignature();
}
//
// NamedObject static methods
//
NamedObject.prototype.Codename(cat, args)
{
	// TODO
}

//
// MultiObject
//
// an object comprised of a list of other objects
//
function MultiObject(cat, args)
{
	CatObject.call(this, cat, args);
	this.objects = args.objects.map(o => cat.getObject(o));
	this.objects.map(o => o.incrRefcnt());
}
MultiObject.prototype.signature(sig = null)
{
	return Cat.sha256(`${sig}${this.category.name}${Cat.sep}${this.prototype.name} ${objects.map(o => o.signature()).join()}`);
}
MultiObject.prototype.decrRefcnt()
{
	if (this.refcnt === 0)
		this.objects.map(o => o.decrRefcnt());
	super.decrRefcnt();
}
MultiObject.prototype.json()
{
	let obj = super.json();
	obj.objects = this.objects.map(o => o.name);
	return obj;
}
MultiObject.prototype.getFactor(factor)
{
	return factor.length > 0 ? this.objects[factor[0]].getFactor(factor.slice(1)) : this;
}
MultiObject.prototype.getFactorName(factor)
{
	return factor.length > 0 ? this.objects[factor[0]].getFactorName(factor.slice(1)) : this.name;
}
MultiObject.prototype.getFactorProperName(indices, first = true, data = {})
{
	this.position = data.position;	// TODO ???
	const f = this.getFactor(indices);
	const fn = `<tspan>${f.properName}</tspan>${Cat.subscript(indices)}`;
	return first ? fn : `(${fn})`;
}
//
// Return true if the object has an editor for a web page.
// Generally a MultiObject is editable if all the pieces are editable.
//
MultiObject.prototype.isEditable()
{
	return this.objects.reduce((o, r) => r &= o.isEditable(), true);
}
//
// Multi-objects are not graphable.  The bits inside them can be.
//
MultiObject.prototype.isGraphable()
{
	return false;
}
MultiObject.formPort(data = {position:0, w:0}, first = true)
{
	let d = Cat.clone(data);
	if (!first)
		d.w = d.w + Cat.parenWidth;
	d.ports = this.objects.map(o => d = Cat.clone(o.formPort(d, false)));
	d.prototype = this.prototype.name;
	const lastPort = d.ports[d.ports.length -1];
	if (!first)
		d.w = d.w + Cat.parenWidth;
	d.w = d.position + d.w;
	d.position = data.position;
	return d;
}
MultiObject.prototype.tagGraph(graph, tag, first = true)
{
	this.objects.map((e, i) => e.tagGraph(graph.ports[i], false));
}
//
// MultiObject static methods
//
MultiObject.prototype.ProperName(s, objects, first = true, data = {})
{
	let n = '';
//	const symWidth = Cat.textWidth(s);
//	let doPos = 'position' in data;
//	if (doPos)
//		this.position = data.position;
	if (!first)
	{
		n += '(';
//		if (doPos)
//			data.position += Cat.parenWidth;
	}
	let n = objects.map(o => o.ProperName(false, data)).join(s);
	if (!first)
	{
		n += ')';
//		if (doPos)
//			data.position += Cat.parenWidth;
	}
}

//
// ProductObject
//
function ProductObject(cat, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.name = ProductObject.Codename(args.objects);
	nuArgs.properName = 'properName' in args ? args.properName : ProductObject.ProperName(args.objects);
	MultiObject.call(this, cat, nuArgs);
	this.size = this.objects.reduce((sz, o) => sz += o.size, 0);
	this.setSignature();
}
ProductObject.prototype.fromHTML(first = true, {uid:0, id:'data'})
{
	return this.objects.map(x => x.fromInput(false, uid));
}
ProductObject.prototype.toHTML(first=true, uid={uid:0, idp:'data'})
{
	const codes = this.objects.map(d => {uid.uid; return d.toHTML(false, uid)});
	return Cat.parens(codes.join(op.sym), '(', ')', first);
}
ProductObject.prototype.factorButton(data)
{
	let html = H.tr(this.getFactorButton(xobj, '', data, 'addFactor', 'Add factor'), 'sidename');
	let tbl = '';
	switch(expr.op)
	{
	case 'product':
			//
			// TODO fix
			//
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
	return html + H.tr(H.td(H.table(H.tr(tbl))), 'sidename');
}
//
// ProductObject static methods
//
ProductObject.prototype.Codename(objs)
{
	return objs.map(o => typeof o === 'string' ? o : o.name).join('-X-');
}
ProductObject.prototype.Get(cat, objects)
{
	const name = ProductObject.Codename(objects);
	let obj = cat.getObject(name);
	return obj === null ? new ProductObject(cat, {objects}) : obj;
}
ProductObject.prototype.ProperName(objects, first = true, data = {})
{
	return super.ProperName('&times;', objects, first, data);
}

//
// CoproductObject
//
function CoproductObject(cat, args)
{
	MultiObject.call(this, cat, args);
	this.size = 1 + this.objects.reduce((sz, o) => sz = Math.max(o.size, sz), 0);
	this.name = this.name === '' ? CoproductObject.Codename() : this.name;
	this.properName = this.properName === '' ? CoproductObject.ProperName(cat, morphisms) : this.properName;
	this.setSignature();
}
//
// CoproductObject static methods
//
CoproductObject.prototoype.Codename(objects)
{
	return objects.map(o => typeof o === 'string' ? o : o.name).join('-X-');
}
CoproductObject.prototoype.Get(cat, objects)
{
	const name = CoproductObject.Codename(objects);
	let obj = cat.getObject(name);
	return obj === null ? new CoproductObject(cat, {objects}) : obj;
}
CoproductObject.prototoype.ProperName(first = true, data = {})
{
	return super.ProperName('&plus;', first, data);
}
CoproductObject.prototype.fromHTML(first = true, {uid:0, id:'data'})
{
	return {};	// TODO
}

function HomObject(cat, args)
{
	Multiobject.call(this, cat, args);
	this.size = 1;
	this.name = this.name === '' ? homObject.Codename(this.objects) : this.name;
	this.properName = this.properName === '' ? homObject.ProperName(cat, this.objects) : this.properName;
	this.setSignature();
}
HomObject.prototype.toHTML(first=true, uid={uid:0, idp:'data'})
{
	const domain = this.objects[0]
	const codomain = this.objects[1];
	const homKey = Category.HomKey(domain, codomain);
	const homset = this.diagram.getHomSet(domain, codomain);
	++uid.uid;
	const id = `${uid.idp}_${uid.uid}`;
	const th = H.tr(H.td(this.ProperName(first, {position:0}), '', '', '', `colspan='4'`));
	return H.table(th + Cat.display.morphismTableRows(homset, `data-name="%1" onclick="Cat.getDiagram().toggleTableMorphism(event, '${id}', '%1')"`, false), 'toolbarTbl', id);
}
homDomain(elt)
{
	return this.objects[0];
}
HomObject.prototype.getFactorProperName(indices, first = true, data = {})
{
	this.position = data.position;	// TODO ???
	const f = this.getFactor(indices);
	return `<tspan>${f.properName}</tspan>${Cat.subscript(indices)}`;
}
//
// HomObject static methods
//
HomObject.prototype.Codename(objects)
{
	return `-H--${objects.map(o => typeof o === 'string' ? o : o.name).join('-c-')}--H-`;
}
HomObject.prototype.Get(cat, objects)
{
	const name = HomObject.Codename(objects);
	let obj = cat.getObject(name);
	return obj === null ? new HomObject(cat, {objects}) : obj;
}
HomObject.prototype.ProperName(objects, first = true, data = {})
{
//	let doPos = 'position' in data;
//	if (doPos)
//	{
//		this.position = data.position;
//		data.position += Cat.bracketWidth;
//	}
	let nm = '[';
	nm += objects[0].ProperName(true, data);
	nm += ', ';
//	if (doPos)
//		data.position += Cat.commaWidth;
	nm += objects[1].ProperName(true, data);
//	if (doPos)
//		data.position += Cat.bracketWidth;
	return nm;
}
HomObject.prototype.FromInput(first = true, uid={uid:9, idp:'data'})
{
	++uid.uid;
	const morphism = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
	// TODO
}

//
// DiagramElement
//
// a text element placed on the diagram.
//
function DiagramElement(dgrm, args)
{
	if (!Diagram.isPrototypeOf(dgrm))
		throw 'Not a diagram';
	const nuArgs = Cat.clone(args);
	nuArgs.diagram = dgrm;
	nuArgs.name = Cat.getArg(args, 'name', cat.getAnon());
	Element.call(dgrm.domain, nuArgs);
	this.diagram = dgrm;
}
DiagramElement.prototype.decrRefcnt()
{
	super.decrRefcnt();
	//
	// remove from tracking diagram
	//
	if (this.refcnt <= 0)
		this.diagram.texts.splice(this.diagram.texts.indexOf(this), 1);
}
DiagramElement.prototype.setXY(xy)
{
	this.x = Cat.grid(xy.x);
	this.y = Cat.grid(xy.y);
}
DiagramElement.prototype.getXY()
{
	return 'x' in this ? {x:this.x, y:this.y} : null;
}
DiagramElement.prototype.json()
{
	let a = super.json();
	a.h = this.h;
	a.x = this.x;
	a.y = this.y;
	a.w = this.w;
	return a;
}
DiagramElement.prototype.setXY(xy)
{
	this.x = Cat.grid(xy.x);
	this.y = Cat.grid(xy.y);
}
DiagramElement.prototype.update()	// FITB
{}
DiagramElement.prototype.isGraphable()
{
	return false;
}

//
// DiagramText
//
function DiagramText(dgrm, args)
{
	DiagramElement.call(dgrm, args)
	this.h = Cat.getArg(args, 'h', Cat.default.font.height);
	this.xy = Cat.getArg(args, 'xy', {x:0, y:0});
	this.w = Cat.getArg(args, 'w', 0);
}
DiagramText.prototype.json()
{
	let a = super.json();
	a.h = this.h;
	a.xy = {x:this.x, y:this.y};
	a.w = this.w;
	return a;
}
DiagramText.prototype.editText(id, attr)
{
	const h = document.getElementById(id);
	if (!this.diagram.readonly && !this.readonly)
	{
		if (h.contentEditable === 'true')
		{
			this.diagram.updateElementAttribute(this, null, attr, h.innerText);
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

//
// DiagramObject
//
// This is the object for the source category in a diagram.
// It points to the object in the target category of the diagram.
//
function DiagramObject(dgrm, args)
{
	CatObject.call(this, args);
	DiagramElement.call(this, args);
	//
	// the object in the target category that this object maps to, if any
	//
	if ('to' in args)
		this.to = dgrm.codomain.getObject(args.to);
	//
	// dimensional aspects of the diagram source object
	//
	this.h = Cat.getArg(args, 'h', Cat.default.font.height);
	this.xy = Cat.getArg(args, 'xy', {x:0, y:0});
	this.w = Cat.getArg(args, 'w', 0);
}
DiagramObject.prototype.json()
{
	let a = super.json();
	a.h = this.h;
	a.xy = {x:this.x, y:this.y};
	a.w = this.w;
	a.to = this.to ? this.to.name : null;
	return a;
}
//
// Set the object in the diagram's category that this diagram object points to.
//
DiagramObject.prototype.setObject(to)
{
	to.incrRefcnt();
	this.to = to;
	this.w = Cat.textWidth(to.properName);
}
DiagramObject.prototype.decrRefcnt()
{
	if (this.refcnt <= 0)
	{
		this.to.decrRefcnt();
		if (this.to.refcnt === 0)
			this.to.decrRefcnt();
		this.removeSVG();
	}
	super.decrRefcnt();
}
DiagramObject.prototype.makeSVG()
{
	if (isNaN(this.x) || isNaN(this.y))
		throw 'Nan!';
	return `<text data-type="object" data-name="${this.name}" text-anchor="middle" class="object grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + Cat.default.font.height/2}"
		onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'object')">${this.to.properName}</text>`;
}
DiagramObject.prototype.getBBox()
{
	return {x:this.x - this.w/2, y:this.y + this.h/2 - Cat.default.font.height, w:this.w, h:this.h};
}
DiagramObject.prototype.help()
{
	return H.p(`Diagram object ${this.properName} in category ${this.category.properName} supporting diagram ${this.diagram.properName}`);
}
DiagramObject.prototype.svg(sfx = '')
{
	return document.getElementById(this.elementId() + (sfx !== '' ? sfx : ''));
}
DiagramObject.prototype.removeSVG()
{
	const svg = this.svg();
	if (svg !== null)
	{
		svg.innerHTML = '';
		svg.parentNode.removeChild(svg);
	}
}
DiagramObject.prototype.elementId()
{
	return `dobj_${this.name}`;
}
DiagramObject.prototype.updatePosition(xy)
{
	//
	// round to pixel location
	//
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
DiagramObject.prototype.showSelected(state = true)
{
	this.svg().classList[state ? 'add' : 'remove']('selected');
}
DiagramObject.prototype.addSVG()
{
	Cat.display.diagramSVG.innerHTML += typeof this === 'string' ? this : this.makeSVG();
}
//
// Basically we just don't graph objects in the diagram's source category.
//
DiagramObject.prototype.isGraphable()
{
	return false;
}

//
// Category
//
function Category(args)
{
	CatObject.call(this, $Cat, args);
	this.referenceDiagrams = Cat.getArg(args, 'referenceDiagrams', []);
	this.references = this.referenceDiagrams.map(r => Cat.getDiagram(r));
	if ('subobject' in args)
		this.subobject = $Cat.getObject(args.subobject);
	//
	// for graph categories that share the same objects as the source category
	//
	this.objects = 'objects' in args ? args.objects : new Map();
	this.morphisms = new Map();
	if ($Cat === null)	// boot sequence
	{
		$Cat = this;
		$Cat.addObject($Cat);
	}
	this.process(this.diagram, args);
}
Category.prototype.signature()
{
	let s = '';
	for ([key, o] of this.objects)
		s += o.sig;
	for ([key, m] of this.morphisms)
		s += m.sig;
	return Cat.sha256(`Cat ${this.name} ${this.prototype.name} ${s});
}
Category.prototype.clear()
{
	this.objects.clear();
	this.morphisms.clear();
	this.texts = [];
}
Category.prototype.process(dgrm, args)
{
	let errMsg = '';
	if ('objects' in args)
		Object.keys(args.objects).forEach(function(key)
		{
			if (!this.hasObject(key))
			{
				try
				{
					const obj = CatObject.process(this, args.objects[key], dgrm);
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
	//
	// for our recursive methods, setup the their recursors now that all morphisms are loaded and the searches can be satisfied
	//
	for(const [key, m] of this.morphisms)
		if (Recursive.isPrototypeOf(m) && typeof m.recursor === 'string')
			m.setRecursor(m.recursor);
}
Category.prototype.json(a = {})
{
	a = super.json(a);
	let objects = [];
	if (!('objects' in a))
	{
		if (this.name === 'Cat')	// no infinite recursion on Cat
		{
			for(const [key, obj] of this.objects)
			{
				if (obj.name === 'Cat')
					return;
				objects.push(obj);
			}
			a.objects = Cat.jsonAssoc(objects);
		}
		else
			a.objects = Cat.jsonMap(this.objects);
	}
	if (!('morphisms' in a))
		a.morphisms = Cat.jsonMap(this.morphisms);
	if (!('subobject' in a) && 'subobject' in this)
		a.subobject = this.subobject.name;
	if (!('referenceDiagrams' in a))
		a.referenceDiagrams = this.referenceDiagrams.map(d => typeof d === 'string' ? d : d.name);
	return cat;
}
Category.prototype.hasObject(name)
{
	//
	// search reference diagrams as well
	//
	return this.references.find(r => r.codomain.hasObject(name)) !== null || this.objects.has(name);
}
Category.prototype.getObject(name)
{
	let obj = null;
	if (String.isPrototypeOf(name))
	{
		obj = this.references.find(ref => ref.codomain.getObject(name));
		if (obj === null)
			obj = this.objects.has(name) ? this.objects.get(name) : null;
	}
	return obj;
}
Category.prototype.addObject(obj)
{
	if (this.hasObject(obj.name))
		throw `Object name ${obj.name} already exists in category ${this.name}`;
	this.objects.set(obj.name, obj);
}
Category.prototype.hasMorphism(name)
{
	return this.references.find(r => r.codomain.hasMorphism(name)) !== null || this.morphisms.has(name);
}
Category.prototype.getMorphism(name)
{
	let m = null;
	if (String.isPrototypeOf(name))
	{
		m = this.references.find(ref => ref.codomain.getMorphism(name));
		if (m === null)
			m = this.morphisms.has(name) ? this.morphisms.get(name) : null;
	}
	return m;
}
Category.prototype.addMorphism(m)
{
	if (this.hasMorphism(m.name))
		throw `Morphism name ${m.name} already exists in category ${this.name}`;
	this.morphisms.set(m.name, m);
}
/*
Category.prototype.hasTransform(nm)
{
	return this.transforms.has(nm);
}
Category.prototype.getTransform(name)
{
	return this.transforms.has(name) ? this.transforms.get(name) : null;
}
Category.prototype.addTransform(trn)
{
	if (this.transforms.has(trn.name))
		throw `Transform name ${trn.name} already exists in category ${this.properName}`;
	this.transforms.set(trn.name, trn);
}
Category.prototype.pullback(ary)
{
	let r = {object:null, morphs:[]};
	if (this.hasForm(ary).sink)
	{
		// TODO
	}
	return r;
}
*/
Category.prototype.getAnon(s = 'Anon')
{
	while(true)
	{
		const name = `${s}_${Cat.random()}`;
		if (!this.hasObject(name) && !this.hasMorphism(name))
			return name;
	}
}
Category.prototype.addHom(m)
{
	const key = Category.HomKey(m.domain, m.codomain);
	if (!this.homSets.has(key))
		this.homSets.set(key, []);
	const a = this.homSets.get(key);
	a.push(m);
	const dualKey = Category.HomKey(m.codomain, m.domain);
	const dualLength = this.homSets.has(dualKey) ? this.homSets.get(dualKey).length -1 : 0;
	m.homSetIndex = a.length -1 + dualLength;
}
Category.prototype.addHomSets(homSets, obj2morphs)
{
	for(const [key, m] of this.morphisms)
	{
		delete m.bezier;
		this.addHom(m);
		category.addHomDir(obj2morphs, m, 'dom');
		category.addHomDir(obj2morphs, m, 'cod');
	}
}
Category.prototype.makeHomSets()
{
	this.homSets = new Map();
	this.obj2morphs = new Map();
	this.addHomSets(this.homSets, this.obj2morphs);
}
Category.prototype.help()
{
	return H.p(`Category ${this.properName}.`);
}
Category.prototype.addFactorMorphism(domain, factors)
{
	let m = FactorMorphism.Get(this, domain, factors);
	m.incrRefcnt();
	return m;
}
Category.prototype.toolbarMorphism(form)
{
	let td = '';
	if (form.composite)
		td += H.td(Cat.display.getButton('compose', `Cat.getDiagram().gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
	return td;
}
validateName(name)
{
	return name !== '' && !(this.hasObject(name) || this.hasMorphism(name));
}
//
// Category static methods
//
Category.prototype.FetchReferenceDiagrams(cat, fn)
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
Category.prototype.AddHomDir(obj2morphs, m, dir)
{
	const key = dir === 'dom' ? m.domain : m.codomain;
	if (!obj2morphs.has(key))
		obj2morphs.set(key, {dom:[], cod:[]});
	const ms = obj2morphs.get(key);
	ms[dir].push(m);
}
//
// Determine the form of the selected morphisms:  source, sink, composite, distinct
//
Category.prototype.HasForm(ary)
{
	let bad = {composite: false, source: false, sink: false, distinct: false};
	if (ary.length < 2)
		return bad;
	const elt = ary[0];
	if (!Morphism.isPrototypeOf(elt))
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
// TODO which category owns this?
Category.prototype.Run(m, dgrm)
{
	let dm = m.morphisms[0];
	if (!DataMorphism.isPrototypeOf(dm))
		throw 'Needs a data morphism first in the composite to run';
	//
	// there is no output morphism for the codomains tty and threeD
	//
	let dataOut = (m.codomain.basename !== 'tty' && m.codomain.basename !== 'threeD') ? dgrm.newDataMorphism(m.domain, m.codomain) : null;
	//
	// we can run from a data mophism
	//
	for (let i in dm.data)
	{
		let d = m.$(i);
		if (dataOut !== null)
			dataOut.data[i] = d;
	}
	return dataOut;
}
Category.prototype.HomKey(domain, codomain)
{
	return `${domain.name} ${codomain.name}`;
}

// TODO currently unused
function StringObject(cat, args)
{
	CatObject.call(this, cat, args);
	this.graph = args.object.graph();
}

//
// Morphism
//
function Morphism(cat, args)
{
	Element.call(this, cat, args);
	let obj = typeof args.domain === 'string' ? cat.getObject(args.domain) : args.domain;
	if (obj === null)
		throw `Domain ${args.domain} does not exist in category ${cat.properName}`;
	Object.defineProperty(this, 'domain', {value: obj, enumerable: true});
	this.domain.incrRefcnt();
	obj = typeof args.codomain === 'string' ? cat.getObject(args.codomain) : args.codomain;
	if (obj === null)
		throw `Codomain ${args.codomain} does not exist in category ${cat.properName}`;
	Object.defineProperty(this, 'codomain', {value: obj, enumerable: true});
	this.codomain.incrRefcnt();
//	if ((this.diagram !== null && !this.diagram.validateAvailableMorphism(this.name)) || cat.hasMorphism(this.name))
	if ((cat.validateName(this.name)) || cat.hasMorphism(this.name))
		throw `Morphism name ${this.name} is already taken.`;
	cat.addMorphism(this);
}
Morphism.prototype.decrRefcnt()
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
Morphism.prototype.json(a = {})
{
	a = super.json(a);
	a.domain = this.domain.name;
	a.codomain = this.codomain.name;
	return a;
}
//
// Is this morphism iterable?  Generically return false.
//
Morphism.prototype.isIterable()	// FITB
{
	return false;
}
//
// True if the given morphism is used in the construction of this morphism somehow.
// Generically return false.
//
Morphism.prototype.hasMorphism(mor, start = true)
{
	return false;
}
Morphism.prototype.help()
{
	return H.p(`Morphism ${this.properName}`) + (this.description !== '' ? H.p(this.description) : '');
}
Morphism.prototype.graph()
{
	return new StringMorphism(this);
}
Morphism.prototype.$(args)
{
}
Morphism.prototype.factorButton(txt, data, action, title)
{
	return H.td(H.button(this.properName + txt, '', Cat.display.elementId(), title,
			`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`));
}
//
// static Morphism methods
//
Morphism.prototype.process(cat, args)
{
	let m = null;
	try
	{
		switch(args.prototype)
		{
		case 'Identity':
			m = new Identity(cat, args);
			break;
		case 'DiagramMorphism':
			m = new DiagramMorphism(cat, args);
			break;
		case 'Composite':
			m = new Composite(cat, args);
			break;
		case 'DataMorphism':
			m = new DataMorphism(cat, args);
			break;
		case 'CoproductMorphism':
			m = new CoproductMorphism(cat, args);
			break;
		case 'CoproductAssembly':
			m = new CoproductAssemblyMorphism(cat, args);
			break;
		case 'ProductMorphism':
			m = new ProductMorphism(cat, args);
			break;
		case 'ProductAssembly':
			m = new ProductAssemblyMorphism(cat, args);
			break;
		case 'FactorMorphism':
			m = new FactorMorphism(cat, args);
			break;
		case 'LambdaMorphism':
			m = new LambdaMorphism(cat, args);
			break;
		default:
			m = new Morphism(cat, args);
			break;
		}
	}
	catch(e)
	{
		Cat.recordError(e);
	}
	return m;
}

//
// Identity morphism
//
function Identity(cat, args)
{
	const nuArgs = Cat.clone(args);
	const domain = cat.getObject(args.domain);
	if (!('name' in this))
		nuArgs.name = Identity.Codename(domain);
	if (!('properName' in this) && !)
		nuArgs.properName = Identity.ProperName(domain);
	Morphism.call(this, cat, nuArgs);
	this.setSignature();
}
//
// Identity static functions
//
Identity.prototype.Codename(domain)
{
	return `Id-${domain.name}`;
}
Identity.prototype.Get(cat, dom)
{
	const domain = typeof dom === 'string' ? cat.getObject(dom) : dom;
	const name = Identity.Codename(domain);
	const m = cat.getMorphism(name);
	return m === null ? new Identity(cat, {domain}) : m;
}
Identity.prototype.bindGraph(s, data)
{
//		stringMorphism.bindGraph(this.diagram, this.graph.data[0], true, {cod:this.graph.data[1], link:[], function:'identity', domRoot:[0], codRoot:[1], offset:0});
	s.bindGraph(true, {cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
	s.tagGraph(s.graph, 'identity');
}
//
// Identity static methods
//
Identity.prototype.ProperName(domain)
{
	return `1(${domain.properName})`;
}

//
// DiagramMorphism
//
// Supports the placement and drawing of a morphism in a diagram.
//
function DiagramMorphism(cat, args)
{
	const nuArgs = Cat.clone(args);
	if (!('name' in this))
		nuArgs.name = cat.getAnon('dgrm');
	Morphism.call(this, cat, nuArgs);
	this.diagram = typeof args.diagram === 'string' ? Cat.getDiagram(args.diagram) : args.diagram;
	//
	// graphical attributes
	//
	this.start = Cat.getArg(args, 'start', {x:0, y:0});
	this.end = Cat.getArg(args, 'end', {x:100, y:0});
	this.angle = Cat.getArg(args, 'angle', 0.0);
	this.flipName = Cat.getArg(args, 'flipName', false);
	//
	// the object in the target category that this object maps to, if any
	//
	const target = Category.isPrototypeOf(args.target) ? args.target : $Cat.getObject(args.target);
	this.to = target.getMorphism(args.to);
}
DiagramMorphism.prototype.decrRefcnt()
{
	super.decrRefcnt();
	if (this.refcnt <= 0 && this.to)
	{
		this.to.decrRefcnt();
		//
		// As we are about to be deleted, then release our holds on the domain and/or codomain
		//
		if (this.domain.isDeletable())
			this.domain.decrRefcnt();
		if (this.codomain.isDeletable())
			this.codomain.decrRefcnt();
	}
}
DiagramMorphism.prototype.json()
{
	let mor = super.json();
	if ('start' in this)
	{
		mor.start = this.start;
		mor.end = this.end;
		mor.angle = this.angle;
	}
	mor.flipName = this.flipName;
	return mor;
}
DiagramMorphism.prototype.getNameOffset()
{
	let mid = 'bezier' in this ? this.bezier.cp2 : D2.scale(0.5, D2.add(this.start, this.end));
	let normal = D2.norm(D2.scale(this.flipName ? -1 : 1, D2.normal(D2.subtract(this.codomain, this.domain))));
	if (normal.y > 0.0)
		normal.y *= 0.5;
	return D2.add(mid, D2.scale(-Cat.default.font.height, normal));
}
DiagramMorphism.prototype.makeSVG()
{
	const off = this.getNameOffset();
	let svg = `
<g id="${this.elementId()}">
<path data-type="morphism" data-name="${this.name}" class="${this.to.prototype.name !== 'unknown' ? 'morphism' : 'unknownMorph'} grabbable" id="${this.elementId()}_path" d="M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}"
onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')" marker-end="url(#arrowhead)"/>
<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_name'}" x="${off.x}" y="${off.y}"
onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')">${this.to.properName}</text>`;
	if (Composite.isPrototypeOf(this.to))
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
DiagramMorphism.prototype.elementId()
{
	return `mor_${this.name}`;
}
DiagramMorphism.prototype.showSelected(state = true)
{
	this.svg('_path').classList[state ? 'add' : 'remove']('selected');
	this.svg('_name').classList[state ? 'add' : 'remove']('selected');
	const svg = this.svg('_comp');
	if (svg)
		svg.classList[state ? 'add' : 'remove']('selected');
}
DiagramMorphism.prototype.showFusible(state = true)
{
	this.showSelected(!state);
	this.svg('_path').classList[!state ? 'add' : 'remove']('grabbable','morphism');
	this.svg('_path').classList[state ? 'add' : 'remove']('fusible');
	this.svg('_name').classList[state ? 'add' : 'remove']('fusible');
}
DiagramMorphism.prototype.updateDecorations()
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
	if (Composite.isPrototypeOf(this.to))
	{
		const compSvg = this.svg('_comp');
		const xy = Cat.barycenter(this.morphisms);
		if (isNaN(xy.x) || isNaN(xy.y))
			throw 'NaN!';
		compSvg.setAttribute('x', xy.x);
		compSvg.setAttribute('y', xy.y);
	}
}
DiagramMorphism.prototype.getBBox()
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
DiagramMorphism.prototype.predraw()
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
DiagramMorphism.prototype.adjustByHomSet()
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
DiagramMorphism.prototype.update()
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
		stringMorphism.update(this);
}
DiagramMorphism.prototype.help()
{
	return H.p(`Diagram morphism ${this.properName} in category ${this.category.properName} in diagram ${this.diagram.properName}`);
}

//
// MultiMorphism
//
// a morphism comprised of other morphisms
//
function MultiMorphism(cat, args)
{
	Morphism.call(this, cat, args);
	this.morphisms = multiMorphism.SetupMorphisms(cat, args.morphisms);
	this.morphisms.map(m => m.incrRefCnt());
}
MultiMorphism.prototype.signature(sig = null)
{
	return Cat.sha256(`${sig}${this.category.name} ${this.prototype.name} ${morphisms.map(m => m.signature()).join()}`);
}
MultiMorphism.prototype.decrRefcnt()
{
	if (this.refcnt === 0)
		this.morphisms.map(m => m.decrRefcnt());
	super.decrRefcnt();
}
MultiMorphism.prototype.json(a = {})
{
	a = super.json(a);
	if (!('morphisms' in a))
		a.morphisms = this.morphisms.map(r => r.name);
	return a;
}
MultiMorphism.prototype.hasMorphism(mor, start = true)
{
	//
	// if looking for a recursive function, this and mor may be the same from the start
	//
	if (!start && this.isEquivalent(mor))
		return true;
	for (let i=0; i<this.morphisms.length; ++i)
		if (this.morphisms[i].hasMorphism(mor, false))
			return true;
	return false;
}
//
// Default mode is for all morphisms to be iterable.
//
MultiMorphism.prototype.isIterable()
{
	return this.morphisms.reduce((m, r) => r &= m.isIterable(), true);
}
//
// MultiMorphism static methods
//
MultiMorphism.prototype.SetupMorphisms(cat, morphs)
{
	return args.morphisms.map(m => (typeof m === 'string' ? cat.getMorphism(m) : m));
}

//
// Composite
//
function Composite(cat, args)
{
	const morphisms = multiMorphism.SetupMorphisms(cat, args.morphisms);
	const nuArgs = Cat.clone(args);
	nuArgs.name = Composite.Codename();
	nuArgs.domain = Composite.Domain(cat, morphisms);
	nuArgs.codomain = composite.Codomain(cat, morphisms);
	nuArgs.morphisms = morphisms;
	nuArgs.properName = 'properName' in args ? args.properName : Composite.ProperName(cat, morphisms);
	MultiMorphism.call(this, cat, args);
}
//
// A composite is considered iterable if the first morphism is iterable.
//
Composite.prototype.isIterable()
{
	return this.morphisms[0].isIterable();
}
Composite.prototype.help()
{
	return H.p(`Category ${this.category.properName}`);
}
Composite.prototype.graph(graphCat)
{
	const graphs = this.morphisms.map(m => m.graph(graphCat));
//		const expr = m.category.parseObject(graphs.map(m => m.domain.code).join() + ',' + graphs[graphs.length -1].codomain.code);
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
//
// Composite static methods
//
Composite.prototype.Codename(morphisms)
{
	return morphisms(m => m.Codename(extended, false)).join('-o-');
}
Composite.prototype.Domain(cat, morphisms)
{
	return morphisms[0].domain;
}
Composite.prototype.Codomain(cat, morphisms)
{
	return morphisms[morphisms.length - 1].codomain;
}
Composite.prototype.Get(cat, morphisms)
{
	const name = Composite.Codename(morphisms);
	const m = cat.getMorphism(name);
	return m === null ? new Composite(cat, {morphisms}) : m;
}
Composite.prototype.ProperName(cat, morphisms)
{
	return morphisms.map(m => m.properName).join('&#8728;');
}

//
// ProductMorphism
//
function ProductMorphism(cat, args)
{
	const morphisms = multiMorphism.SetupMorphisms(cat, args.morphisms);
	const nuArgs = Cat.clone(args);
	nuArgs.name = ProductMorphism.Codename(morphisms);
	nuArgs.domain = ProductMorphsim.Domain(cat, morphisms);
	nuArgs.codomain = ProductMorphsim.Codomain(cat, morphisms);
	nuArgs.morphisms = morphisms;
	nuArgs.properName = 'properName' in args ? args.properName : ProductMorphism.ProperName(morphisms);
	MultiMorphism.call(this, cat, nuArgs);
}
help()
{
	return H.p(`Category ${this.category.properName}`);
}
//
// ProductMorphism static methods
//
ProductMorphism.prototype.Codename(morphs)
{
	return morphs(m => m.Codename(extended, false)).join('-X-');
}
ProductMorphism.prototype.Domain(cat, morphs)
{
	return ProductObject.Get(cat, morphs.map(m => m.domain));
}
ProductMorphism.prototype.Codomain(cat, morphs)
{
	return ProductObject.Get(cat, morphs.map(m => m.codomain));
}
ProductMorphism.prototype.Get(cat, morphisms)
{
	const name = ProductMorphism.Codename(morphisms);
	const m = cat.getMorphism(name);
	return m === null ? new ProductMorphism(cat, {morphisms}) : m;
}
ProductMorphism.prototype.ProperName(morphisms)
{
	return ProductObject.ProperName(morphisms);
}

//
// CoproductMorphism
//
CoproductMorphism(cat, args)
{
	let nuArgs = Cat.clone(args);
	nuArgs.morphisms = MultiMorphism.SetupMorphisms(cat, args.morphisms);
	nuAargs.name = 'name' in args ? args.name : CoproductMorphism.Codename(morphisms);
	nuArgs.domain = CoproductMorphism.Domain(cat, morphisms);
	nuArgs.codomain = CoproductMorphism.Codomain(cat, morphisms);
	nuAargs.properName = 'properName' in args ? args.properName : CoproductMorphism.ProperName(cat, morphisms);
	MultiMorphism.call(this, cat, nuArgs);
}
CoproductMorphism.prototype.help()
{
	return H.p(`Category ${this.category.properName}`) + this.diagram.elementHelpMorphTbl(this.morphisms);
}
//
// CoproductMorphism static methods
//
CoproductMorphism.prototype.Codename(morphs)
{
	return morphs(m => m.Codename(extended, false)).join('-C-');
}
CoproductMorphism.prototype.Domain(cat, morphs)
{
	return coproductObject.Get(cat, morphs.map(m => m.domain));
}
CoproductMorphism.prototype.Codomain(morphs)
{
	return coproductObject.Get(cat, morphs.map(m => m.codomain));
}
CoproductMorphism.prototype.Get(cat, morphisms)
{
	const name = CoproductMorphism.Codename(morphisms);
	const m = cat.getMorphism(name);
	return m === null ? new CoproductMorphism(cat, {morphisms}) : m;
}
CoproductMorphism.prototype.ProperName(morphisms)
{
	return CoproductObject.ProperName(morphisms);
}

function ProductAssembly(cat, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.morphisms = MultiMorphism.SetupMorphisms(args.morphisms);
	nuArgs.domain = ProductAssemblyMorphism.Domain(cat, nuArgs.morphisms);
	nuArgs.codomain = ProductAssemblyMorphism.Codomain(cat, nuArgs.morphisms);
	nuArgs.name = 'name' in args ? args.name : ProductAssembly.Codename(nuArgs.morhisms);
	MultiMorphism.call(this, cat, nuArgs);
	this.properName = this.properName === '' ? productAssemblyMorphism.ProperName(cat, morphisms) : this.properName;
}
ProductAssembly.prototype.help()
{
	return H.h4('Product Assembly Morphism') +
		H.p(`Category ${this.category.properName}`) +
		this.diagram.elementHelpMorphTbl(this.morphisms);
}
//
// ProductAssembly static methods
//
ProductAssembly.prototype.Codename(morphisms)
{
	return `-A--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--A-`;
}
ProductAssembly.prototype.Domain(cat, morphisms)
{
	return morphisms[0].domain;
}
ProductAssembly.prototype.Codomain(cat, morphisms)
{
	return ProductObject.Get(cat, morphisms.map(m => m.codomain));
}
ProductAssembly.prototype.Get(cat, morphisms)
{
	const name = ProductAssemblyMorphism.Codename(morphisms);
	const m = cat.getMorphism(name);
	return m === null ? new ProductAssemblyMorphism(cat, {morphisms}) : m;
}
ProductAssembly.prototype.ProperName(morphisms)
{
	return `<${morphisms.map(m => m.codomain.properName).join(',')}>`;
}

//
// CoproductAssembly
//
function CoproductAssembly(cat, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.morphisms = multiMorphism.setupMorphisms(args.morphisms);
	nuArgs.name = 'name' in args ? args.name : CoproductAssembly.Codename();
	nuArgs.domain = CoproductAssemblyMorphism.Domain(cat, morphisms);
	nuArgs.codomain = CoproductAssemblyMorphism.Codomain(cat, morphisms);
	nuArgs.properName = 'properName' in args ? args.properName : CoproductAssembly.ProperName(cat, morphisms);
	MultiMorphism.call(this, cat, nuArgs);
}
json()
{
	let mor = super.json();
	mor.morphisms = this.morphisms.map(r => r.name);
	return mor;
}
help()
{
	return H.p(`Category ${this.category.properName}`) + this.diagram.elementHelpMorphTbl(this.morphisms);
}
//
// CoproductAssembly static methods
//
CoproductAssembly.prototype.Codename(morphisms)
{
	return `-CA--${morphisms.map(m => m.name).join(Cat.basetypes.comma.nameCode)}--AC-`;
}
CoproductAssembly.prototype.Domain(cat, morphisms)
{
	return CoproductObject.Get(cat, morphisms.map(m => m.domain));
}
CoproductAssembly.prototype.Codomain(cat, morphisms)
{
	return morphisms[0].codomain;
}
CoproductAssembly.prototype.Get(cat, morphisms)
{
	const name = CoproductAssemblyMorphism.Codename(morphisms);
	const m = cat.getMorphism(name);
	return m === null ? new CoproductAssemblyMorphism(cat, {morphisms}) : m;
}
CoproductAssembly.prototype.ProperName(morphisms)
{
	return `(${morphisms.map(m => m.properName).join(',')})`;
}

//
// FactorMorphism
//
function FactorMorphism(cat, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.name = 'name' in args ? args.name : FactorMorphism.Codename(domain, factors);
	nuArgs.codomain = FactorMorphism.Codomain(cat, args.domain, args.factors);
	nuArgs.properName = 'properName' in args ? args.properName : FactorMorphism.ProperName(domain, factors);
	MultiMorphism.call(this, cat, nuArgs);
	this.factors = args.factors;
}
FactorMorphism.prototype.signature()
{
	return Cat.sha256(`${this.category.name} ${this.prototype.name} ${factors.map(f => f.join('-')).join(':')}`);
}
FactorMorphism.prototype.json()
{
	let mor = super.json();
	mor.factors = this.factors;
	return mor;
}
FactorMorphism.prototype.help()
{
	return H.p(`Category ${this.category.properName}`) + H.table(H.tr(H.th('Indices')) + this.factors.map(f => H.tr(H.td(f.toString()))).join(''));
}
FactorMorphism.prototype.bindGraph(s, data)
{
//	const domExpr = this.graph.data[0];
//	const codExpr = this.graph.data[1];
	const dom = s.graph.data[0];
	const cod = s.graph.data[1];
	let offset = 0;
	m.factors.map((r, i) =>
	{
		const d = dom.getFactor(r);
		if (d === null)
		{
			++offset;
			return;
		}
		const cod = m.factors.length === 1 ? cod : cod.getFactor([i]);
		const domRoot = r.slice();
		domRoot.unshift(0);
//			stringMorphism.bindGraph(this.diagram, dom, true, {cod, link:[], function:'factor', domRoot, codRoot:m.factors.length > 1 ? [1, i] : [1], offset});
		dom.bindGraph(true, {cod, link:[], function:'factor', domRoot, codRoot:m.factors.length > 1 ? [1, i] : [1], offset});
	});
	s.tagGraph(s.graph, 'factor');
}
//
// FactorMorphism static methods
//
FactorMorphism.prototype.Codename(domain, factors)
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
FactorMorphism.prototype.Domain(domain, factors)
{
	return domain;
}
FactorMorphism.prototype.Codomain(cat, domain, factors)
{
	return ProductObject.Get(cat, factors.map(f => domain.getFactor(f)));
}
FactorMorphism.prototype.Get(cat, domain, factors)
{
	const name = FactorMorphism.Codename(domain, factors);
	const m = cat.getMorphism(name);
	return m === null ? new FactorMorphism(cat, {domain, factors}) : m;
}
FactorMorphism.prototype.ProperName(domain, factors)
{
	return `&lt;${factors.map(f => domain.getFactorProperName(f)).join(',')}&gt;`;
}

//
// DataMorphism
//
function DataMorphism(cat, args)
{
	const dom = cat.getObject(args.domain);
	if (dom.name !== 'N' or dom.name !== 'One')
		throw 'Domain is not N or 1`;
	const cod = cat.getObject(args.codomain);
	if (!cod.isEditable())
		throw `Codoamin ${cod.properName} is not editable`;
	Morphism.call(this, cat, args);
	this.data = Cat.getArg(args, 'data', {});
	this.limit = Cat.getArg(args. 'limit', Number.MAX_SAFE_INTEGER);
}
DataMorphism.prototype.signature(sig)
{
	return Cat.sha256(`${sig}${this.category.name} ${this.prototype.name} ${data.join(':')}`);
}
DataMorphism.prototype.decrRefcnt()
{
	super.decrRefcnt();
	if (this.refcnt <= 0 && this.recursor)
		this.recursor.decrRefcnt();
}
DataMorphism.prototype.json()
{
	let mor = super.json();
	mor.data = this.data;
	return mor;
}
DataMorphism.prototype.addData(e)
{
	const i = Math.min(this.limit, document.getElementById('inputTerm').value);
	this.data[i] = this.codomain.fromHTML();
}
DataMorphism.prototype.clear()
{
	this.data = [];
}
DataMorphism.prototype.help()
{
	let html = '';
	return H.p(`Data morphism ${this.properName}`) + html;
}
//
// DataMorphism static methods
//

//
// recursive
//
function Recursive(cat, args)
{
	DataMorphism.call(this, cat, args);
	this.setRecursor(args.recursor);
	this.setSignature();
}
Recursive.prototype.signature()
{
	return Cat.sha256(super.signature() + (typeof this.recursor === 'string' ? this.recursor : this.recursor.name));
}
Recursive.prototype.decrRefcnt()
{
	if (this.refcnt <= 0 && this.recursor)
		this.recursor.decrRefcnt();
	super.decrRefcnt();
}
Recursive.prototype.json()
{
	let mor = super.json();
	mor.recursor = Morphism.isPrototypeOf(this.recursor) ? this.recursor.name : this.recursor;
	return mor;
}
Recursive.prototype.setRecursor(r)
{
	const rcrs = typeof r === 'string' ? this.category.getMorphism(r) : r;
	if (Morphism.isPrototypeOf(this.recursor))
		this.recursor.decrRefcnt();
	if (rcrs !== null)
	{
		if (!rcrs.hasMorphism(this))
			throw `The recursive morphism ${this.properName} does not refer to itself so no recursion.`;
		this.recursor = rcrs;
		this.recursor.incrRefcnt();
	}
	else
		this.recursor = r;
}
Recursive.prototype.updateRecursor()
{
	if (typeof this.recursor === 'string')
	{
		const r = this.category.getMorphism(this.recursor);
		if (typeof r === 'object')
			this.recursor = r;
	}
}
Recursive.prototype.help()
{
	return H.p(`Recursion morphism: ${typeof this.recursor === 'object' ? this.recursor.properName : this.recursor}`);
}

//
// LambdaMorphism
//
LambdaMorphism(cat, args)
{
	const preCurry = typeof args.preCurry === 'object' ? args.preCurry : cat.getMorphism(args.preCurry);
	let nuArgs = Cat.clone(args);
	nuArgs.domain = LambdaMorphism.Domain(cat, preCurry, arg.domFactors);
	nuArgs.codomain = LambdaMorphism.Codomain(cat, preCurry, arg.homFactors);
	super(cat, nuArgs);
	this.name = 'name' in args ? args.name : LambdaMorphism.Codename(cat, preCurry, args.domFactors, args.homFactors);
	this.properName = this.properName === '' ? LambdaMorphism.ProperName(cat, preCurry, args.domFactors, args.homFactors) : this.properName;
	this.preCurry = preCurry;
	this.preCurry.incrRefcnt();
	this.domFactors = args.domFactors;
	this.homFactors = args.homFactors;
	const domPermutation = args.domFactors.map(f => f[1]);
	const homPermutation = args.homFactors.map(f => f[1]);
	const centralDomain = ProductObject.get(cat, [this.codomain.objects[0], this.domain]);
	this.factors = cat.addFactorMorphism(centralDomain, [homPermutation, domPermutation]);
	this.description = 'description' in args ? args.description : `The currying of the morphism ${this.preCurry.properName} by the factors ${this.homFactors.toString()}`;
	this.setSignature();
}
LambdaMorphism.prototype.signature()
{
	return Cat.sha256(`${this.category.name} ${this.preCurry.sig} ${this.domFactors.map(f => f.join('-')).join(':')} ${this.homFactors.map(f => f.join('-')).join(':')}`);
}
LambdaMorphism.prototype.json()
{
	let mor = super.json();
	mor.preCurry = this.preCurry.name;
	mor.domFactors = this.domFactors;
	mor.homFactors = this.homFactors;
	return mor;
}
LambdaMorphism.prototype.decrRefcnt()
{
	super.decrRefcnt();
	if (this.refcnt <= 0)
		this.preCurry.decrRefcnt();
}
LambdaMorphism.prototype.help()
{
	return H.p(`Lambda morphism of ${this.preCurry.properName} in category ${this.category.properName}`);
}
//
// LambdaMorphism static methods
//
LambdaMorphism.prototype.Codename(cat, preCurry, domFactors, homFactors)
{
	const preCur = typeof preCurry === 'string' ? cat.getMorphism(preCurry) : preCurry;
	const hom = homObject.get(cat, [preCurry.domain, preCurry.codomain]);
	return `-L--${preCur.name}-c--${ProductObject.Codename(domFactors.map(f => hom.getFactorName(f)))}--${ProductObject.Codename(codFactors.map(f => hom.getFactorName(f)))}--L-';
}
LambdaMorphism.prototype.Domain(cat, preCurry, factors)
{
	return ProductObject.Get(cat, factors.map(f => preCurry.domain.getFactor(f)));
}
LambdaMorphism.prototype.Codomain(cat, preCurry, factors)
{
	const codDom = ProductObject.Get(cat, factors.map(f => preCurry.domain.getFactor(f)));
	return HomObject.Get(cat, [codDom, preCurry.codomain]);
}
LambdaMorphism.prototype.Get(cat, preCurry, domFactors, homFactors)
{
	const name = LambdaMorphism.Codename(cat, preCurry, domFactors, homFactors);
	const m = cat.getMorphism(name);
	return m === null ? new LambdaMorphism(cat, {preCurry, domFactors, homFactors}) : m;
}
LambdaMorphism.prototype.ProperName(preCurry, domFactors, homFactors)
{
	return `&lambda;.${preCurry.properName}&lt;${domFactors}:${homFactors}`;
}

//
// StringMorphism
//
function StringMorphism(diagram, src)
{
	Morphism.call(this, diagram.graphCat, {domain:src.domain, codomain:src.codomain, name:src.name, diagram});
	this.source = src;
	const sequence = ProductObject.Get(diagram.codomain, {objects: [src.domain, src.codomain]});
	this.graph = sequence.formPort();	// a graph is like a net list between the ports
//	this.tagGraph(true, src.prototype.name);
	src.tagGraph(this.graph);
}
StringMorphism.prototype.tagGraphFunction(func)
{
	this.graph.tagGraph(func);
}
StringMorphism.prototype.mergeMorphismGraphs(morph, dual = false)
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
StringMorphism.prototype.makeParallelGraph(morphisms)
{
	const dom = this.graph.data[0];
	const cod = this.graph.data[1];
	const graphs = morphisms.map(m => stringMorphism.getGraph(m));
	graphs.map((g, i) =>
	{
		dom.data[i] = Cat.clone(g.graph.data[0]);
		cod.data[i] = Cat.clone(g.graph.data[1]);
		StringMorphism.componentGraph(this.diagram, dom.data[i], true, i);
		StringMorphism.componentGraph(this.diagram, cod.data[i], true, i);
	});
}
StringMorphism.prototype.makeIdentityGraph()
{
//		stringMorphism.bindGraph(this.diagram, this.graph.data[0], true, {cod:this.graph.data[1], link:[], function:'identity', domRoot:[0], codRoot:[1], offset:0});
	this.graph.data[0].bindGraph(true, {cod:this.graph.data[1], link:[], function:'identity', domRoot:[0], codRoot:[1], offset:0});
	this.tagGraphFunction('identity');
}
StringMorphism.prototype.makeDiagonalGraph()
{
	const dom = this.graph.data[0];
	const cod = this.graph.data[1];
//		stringMorphism.bindGraph(this.diagram, dom, true, {cod:cod.data[0], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 0], offset:0});
//		stringMorphism.bindGraph(this.diagram, dom, true, {cod:cod.data[1], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 1], offset:0});
	dom.bindGraph(true, {cod:cod.data[0], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 0], offset:0});
	dom.bindGraph(true, {cod:cod.data[1], link:[], function:'diagonal', domRoot:[0], codRoot:[1, 1], offset:0});
	this.tagGraphFunction('diagonal');
}
StringMorphism.prototype.makeEvalGraph()
{
	const dom = this.graph.data[0];
	const domHom = dom.data[0];
	const cod = this.graph.data[1];
	dom.data[1].bindGraph(true, {cod:domHom.lhs, link:[], function:'eval', domRoot:[0, 1], codRoot:[0, 0, 0], offset:0});
	domHom.rhs.bindGraph(true, {cod, link:[], function:'eval', domRoot:[0, 0, 1], codRoot:[1], offset:0});
	this.tagGraphFunction('eval');
}
StringMorphism.prototype.makeCompositeGraph(m)
{
	const graphCat = m.diagram.graphCat;
	const graphs = m.morphisms.map(cm => stringMorphism.getGraph(cm));
//		const expr = m.category.parseObject(graphs.map(m => m.domain.code).join() + ',' + graphs[graphs.length -1].codomain.code);
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
StringMorphism.prototype.makeProductAssemblyGraph(m)
{
	this.mergeMorphismGraphs(m);
	this.tagGraphFunction('productAssembly');
}
StringMorphism.prototype.makeCoproductAssemblyGraph(m)
{
	this.mergeMorphismGraphs(m, true);
	this.tagGraphFunction('coproductAssembly');
}
StringMorphism.prototype.makeLambdaGraph(m)
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
	m.domFactors.map((f, i) => ('data' in dom ? dom.data[i] : dom).copyGraph(true, {map, expr:preCurryGraph.graph.getFactor(f)}));
	m.homFactors.map((f, i) => ('data' in homDom ? homDom.data[i] : homDom).copyGraph(true, {map, expr:preCurryGraph.graph.getFactor(f)}));
	homCod.copyGraph(true, {map, expr:preCurryGraph.graph.data[1]});
	this.tagGraphFunction('lambda');
}
StringMorphism.prototype.makeProductGraph(m)
{
	this.makeParallelGraph(m.morphisms)
	this.tagGraphFunction('product');
}
StringMorphism.prototype.makeCoproductGraph(m)
{
	this.makeParallelGraph(m.morphisms)
	this.tagGraphFunction('coproduct');
}
StringMorphism.prototype.makeRecurseGraph(m)
{
	return stringMorphism.graph(this.diagram, m.recursor);
}
StringMorphism.prototype.help()
{
	return H.p(`Category ${this.category.properName}`);
}
StringMorphism.prototype.SvgLinkUpdate(dom, lnk, data)	// data {graph, dom:{x,y}, cod:{x,y}}
{
	const isDomLink = lnk[0] === 0;
	const f = data.graph.getFactor(lnk);
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
StringMorphism.prototype.LinkId(data, lnk)
{
	return `link_${data.elementId}_${data.index.join('_')}:${lnk.join('_')}`;
}
StringMorphism.prototype.LinkColorKey(lnk, dom, cod)
{
	return `${lnk[0] === 0 ? dom : cod} ${lnk.slice(1).toString()}`;
}
StringMorphism.prototype.ColorWheel(data)
{
	const tran = ['ff', 'ff', 'ff', 'ff', 'ff', '90', '00', '00', '00', '00', '00', '90'];
	const cnt = tran.length;
	data.color = (data.color + 5) % cnt;
	return `${tran[(data.color + 2) % cnt]}${tran[(data.color + 10) % cnt]}${tran[(data.color + 6) % cnt]}`;
}
StringMorphism.prototype.GraphSVG(dgrm, expr, first, data)	// data {index, graph, dom:{x,y, name}, cod:{x,y, name}, visited, elementId}
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
StringMorphism.prototype.UpdateSVG(dgrm, expr, first, data)	// data {index, graph, dom:{x,y}, cod:{x,y}, visited, elementId}
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
StringMorphism.prototype.Update(dgrm, from)
{
	const id = StringMorphism.graphId(from);
	const graphFunctor = $Cat.getMorphism('Graph');
	const sm = graphFunctor.$(dgrm, from.to);
	from.stringMorphism = sm;
	const dom = {x:from.domain.x - from.to.domain.expr.width/2, y:from.domain.y, name:from.domain.name};
	const cod = {x:from.codomain.x - from.to.codomain.expr.width/2, y:from.codomain.y, name:from.codomain.name};
	StringMorphism.updateSVG(dgrm, sm.graph, true, {index:[], graph:sm.graph, dom, cod, visited:[], elementId:from.elementId()});
}
StringMorphism.prototype.RemoveStringSvg(from)
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
//
// bindGraph
//
// Create a string link between this and the data.cod.
//
StringMorphism.bindGraph(first, data)	// data: {cod, link, function, domRoot, codRoot, offset}
{
	if (!this.isGraphable())
		return;
	const domRoot = data.domRoot.slice();
	const codRoot = data.codRoot.slice();
	domRoot.push(...data.link);
	codRoot.push(...data.link);
	Cat.arraySet(this, 'links', codRoot);
	Cat.arraySet(data.cod, 'links', domRoot);
	Cat.arrayInclude(this, 'functions', this.prototype.name);
	Cat.arrayInclude(data.cod, 'functions', this.prototype.name);
}
//
// StringGraph static methods
//
StringMorphism.Get(graphCat, m)
{
	if (graphCat.hasMorphism(m.name))
		return graphCat.getMorphism(m.name);
	return StringMorphism.makeGraph(graphCat, m);
}
StringMorphism.prototype.GraphId(m)
{
	return `graph_${m.elementId()}`;
}

//
// MonoidalCategory
//
function MonoidalCategory(args)
{
Category.call(args);
this.monoidal =
{
	functor:	args.monoidalFunction;
	associator:	args.associator;
	leftUnitor:	args.leftUnitor;
	rightUnitor:args.rightUnitor;
};
}

function BraidedMonoidalCategory(args)
{
	this.braid = brd;
}

function ClosedMonoidalCategory(args)
{
	MonoidalCategory.call(this, args);
	this.homFunctor = args.homFunctor;
}

function ClosedBraidedCategory(cat, clsdMon, args)
{
	//
	// 'this' will be 'closed'
	//
	ClosedMonoidalCategory.call(this, args);
	//
	// this.braided diamond inheritance, such as it is
	//
	this.braided = Object.create();
	this.braided.prototype = this.prototype;
	BraidedMonoidalCategory.call(this.braided, args);
}

function SymmetricMonoidalCategory(cat, fun, assoc, lu, ru, brd)
{
}

function SymetricClosedMonoidalCategory(cat, fun, assoc, lu, ru, brd, hom)
{
	this.hom = hom;
}

function CartesianMonoidalCategory(cat, fun, assoc, lu, ru, prodFun)
{
	this.monoidalCategory = monCat;
	this.productFunctor = prodFun;
}

function Diagram(args)
{
	let nuArgs = Cat.clone(args);
	let domain = null;
	//
	// the diagram's name is the target category's name, the user name, and the name provided by the uer
	//
	nuArgs.name = Diagram.Codename(args);
	if (!$Cat.hasObject(name))
		domain = new Category('domainData' in args ? args.domainData : {name});
	else
		throw `Diagram domain category ${name} already exists.`;
	nuArgs.domain = domain;
	//
	// new diagrams always target new sub-categories
	//
	nuArgs.codomain = new Category({name:args.codomain, subobject:args.codomain});
	Morphism.call(this, $Cat, nuArgs);
	this.basename = args.name;
	//
	// diagrams can have references to other diagrams
	//
	if ('references' in args)
		this.references = args.references.length > 0 ? args.references.map(ref => Cat.getDiagram(ref)) : [];
	else
		this.references = [...this.codomain.referenceDiagrams];
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
	//
	// the currently selected objects and morphisms in the GUI
	//
	this.selected = [];
	//
	// where are we viewing the diagram
	//
	this.viewport = Cat.getArg(args, 'viewport', {x:0, y:0, scale:1, width:Cat.display.width(), height:Cat.display.height()});
	if (isGUI && this.viewport.width === 0)
	{
		this.viewport.width = window.innerWidth;
		this.viewport.height = window.innerHeight;
		this.viewport.scale = 1;
	}
//	this.terms = [];
//	if ('terms' in args)
//		args.terms.map(t => new term(this, t));
	this.timestamp = Cat.getArg(args, 'timestamp', Date.now());
	Cat.addDiagram(this.codomain.name, this);
	this.texts = 'texts' in args ? args.texts.map(d => new DiagramText(this, d)) : [];
//	this.texts.map(t => t.diagram = this);
	//
	// load the codomain data so we get its objects and morphisms
	//
	if ('codomainData' in args)
		this.codomain.Process(this, args.codomainData);
	this.textId = Cat.getArg(args, 'textId', 0);
	//
	// the graph category for the string morphisms
	//
	this.graphCat = new Category({name:'Graph', subobject:'Graph', objects:this.codomain.objects});
	this.colorIndex2colorIndex = {};
	this.colorIndex2color = {};
	this.link2colorIndex = {};
	this.colorIndex = 0;
}
Diagram.prototype.json()
{
	let d = super.json();
	d.basename =	this.basename;
	d.viewport =	this.viewport;
	d.domainData =	this.domain.json();
	d.codomainData =this.codomain.json();
	d.references =	this.references.map(r => r.name);
//	d.terms =		this.terms.map(t => t.json());
	d.isStandard =	this.isStandard;
	d.texts =		this.texts.map(t => t.json());
	d.textId =		this.textId;
	d.timestamp =	this.timestamp;
	return d;
}
Diagram.prototype.gui(e, elt, fn)
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
/*
Diagram.prototype.setObject(from, to)
{
	to.incrRefcnt();
	from.to = to;
	from.w = Cat.textWidth(to.properName);
}
*/
Diagram.prototype.setMorphism(from, to)
{
	from.to = to;
	to.incrRefcnt();
	from.domain.setObject(to.domain);
	from.codomain.setObject(to.codomain);
	this.makeHomSets();
}
Diagram.prototype.saveLocal()
{
	if (Cat.debug)
		console.log('save to local storage', Diagram.StorageName(this.name));
	this.timestamp = Date.now();
	const data = this.stringify();
	localStorage.setItem(Diagram.StorageName(this.name), data);
}
Diagram.prototype.setView()
{
	Cat.display.diagramSVG.setAttribute('transform', `translate(${this.viewport.x}, ${this.viewport.y})scale(${this.viewport.scale})`);
}
Diagram.prototype.update(e, pnl = '', sel = null, hom = false, save = true)
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
Diagram.prototype.clear(e)
{
	if (this.readonly)
		return;
	Cat.display.deactivateToolbar();
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
Diagram.prototype.addSelected(e, eltOrig, clear = false, cls = 'object')
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
	if (CatObject.isPrototypeOf(elt))
		elt.orig = {x:elt.x, y:elt.y};
	else
	{
		elt.domain.orig = {x:elt.domain.x, y:elt.domain.y};
		elt.codomain.orig = {x:elt.codomain.x, y:elt.codomain.y};
		if (elt.prototype.name === 'DataMorphism' && elt.name !== document.getElementById('dataPanelTitle').innerHTML)
			Cat.display.panel.close('data');
	}
	Cat.display.activateToolbar(e);
}
Diagram.prototype.removeSelected(e)
{
	if (this.readonly)
		return;
	const selected = this.selected.slice();
	this.deselectAll();
	let updateObjects = false;
	let updateMorphisms = false;
	let updateTexts = false;
	for(let i=0; i<selected.length; ++i)
	{
		let s = selected[i];
		if (s.isDeletable())
			s.decrRefcnt();
		if (CatObject.isPrototypeOf(s))
			updateOjects = true;
		else if (Morphism.isPrototypeOf(s))
			updateMorphisms = true;
		else if (DiagramText.isPrototypeOf(s))
			updateTexts = true;
	}
	this.update(null, '', null, true);
	if (updateObjects)
		Cat.display.objects.update();
	if (updateMorphisms)
		Cat.display.morphisms.update();
	if (updateTexts)
		Cat.display.texts.update();
}
Diagram.prototype.pickElement(e, name, cls)
{
	let elt = null;
	switch(cls)
	{
		case 'text':
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
		if (CatObject.isPrototypeOf(elt)
			elt.orig = {x:elt.x, y:elt.y};
	}
	else if (!Cat.display.shiftKey)
		this.deselectAll();
}
Diagram.prototype.isSelected(elt)
{
	for(let i=0; i<this.selected.length; ++i)
		if (elt.name === this.selected[i].name)
			return true;
	return false;
}
Diagram.prototype.editSelected(e)
{
	const from = this.getSelected();
	if (this.readonly)
		throw 'Diagram is readonly.';
	if (!this.isMorphismEditable(from))
		throw `Morphism ${from.to.properName} is not editable.`;
	if (DataMorphism.isPrototypeOf(from.to))
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
Diagram.prototype.deleteAll()
{
	this.deselectAll();
	this.domain.clear();
	this.codomain.clear();
	if ('homSets' in this.domain)
		this.domain.homSets.clear();
}
Diagram.prototype.isMorphismEditable(from)
{
	return DataMorphism.isPrototypeOf(from.to) ||
		(Identity.isPrototypeOf(from.to) && from.refcnt === 1 && !from.to.domain.isInitial && !from.to.codomain.isTerminal && from.to.domain.isEditable());
}
Diagram.prototype.toolbar(from)
{
	const del = !this.readonly && from.isDeletable();
	let btns = H.td(Cat.display.getButton('close', 'Cat.display.deactivateToolbar()', 'Close'), 'buttonBar') +
				(del ? H.td(Cat.display.getButton('delete', `Cat.getDiagram().gui(evt, this, 'removeSelected')`, 'Delete'), 'buttonBar') : '');
	if (!this.readonly)
	{
		if (Morphism.isPrototypeOf(from.to))
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
			else if (Composite.isPrototypeOf(from.to) && from.to.isIterable())
				btns += (!this.readonly ? H.td(Cat.display.getButton('run', `Cat.getDiagram().gui(evt, this, 'run')`, 'Evaluate'), 'buttonBar') : '');
			if (this.codomain.isClosed && (('op' in from.to.domain.expr && from.to.domain.expr.op === 'product') || ('op' in from.to.codomain.expr && from.to.codomain.expr.op === 'hom')))		// TODO moved
				btns += H.td(Cat.display.getButton('lambda', `Cat.getDiagram().gui(evt, this, 'lambdaForm')`, 'Curry'), 'buttonBar');
			btns += H.td(Cat.display.getButton('string', `Cat.getDiagram().gui(evt, this, 'displayString')`, 'String'), 'buttonBar');
		}
		else if (CatObject.isPrototypeOf(from.to)
			btns += H.td(Cat.display.getButton('copy', `Cat.getDiagram().copyObject(evt)`, 'Copy object'), 'buttonBar') +
					H.td(Cat.display.getButton('toHere', `Cat.getDiagram().toolbarHandler('codomain', 'toolbarTip')`, 'Morphisms to here'), 'buttonBar') +
					H.td(Cat.display.getButton('fromHere', `Cat.getDiagram().toolbarHandler('domain', 'toolbarTip')`, 'Morphisms from here'), 'buttonBar') +
					H.td(Cat.display.getButton('project', `Cat.getDiagram().gui(evt, this, 'factorBtnCode')`, 'Factor morphism'), 'buttonBar') +		// TODO moved
					(this.hasDualSubExpr(from.to.expr) ? H.td(Cat.display.getButton('distribute', `Cat.getDiagram().gui(evt, this, 'distribute')`, 'Distribute terms'), 'buttonBar') : '');	// TODO whereto?
	}
	btns += Morphism.isPrototypeOf(from.to) ? H.td(Cat.display.getButton('symmetry', `Cat.getDiagram().gui(evt, this, 'flipName')`, 'Flip text'), 'buttonBar') : '';
	btns += H.td(Cat.display.getButton('help', `Cat.getDiagram().gui(evt, this, 'elementHelp')`, 'Description'), 'buttonBar');
	let html = H.table(H.tr(btns), 'buttonBarLeft') + H.br();
	html += H.div('', '', 'toolbarTip');
	return html;
}
Diagram.prototype.toolbarHandler(dir, id)
{
	if (this.selected.length !== 1)
		return;
	const from = this.getSelected();
	if (CatObject.isPrototypeOf(from.to))
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
Diagram.protype.distribute(e)
{
	const from = this.getSelected();
	const text = from.to.properName;
	let html = H.h4('Distribute') +
				H.h5(`Domain Factors`) +
				H.small('Click to place in codomain') +
					H.button('1', '', Cat.display.elementId(), 'Add terminal object',
					`onclick="Cat.getDiagram().addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
				this.getFactorButtonCode(from.to, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
				H.h5('Codomain Factors') + H.br() +
				H.small('Click to remove from codomain') +
				H.div('', '', 'codomainDiv');
	document.getElementById('toolbarTip').innerHTML = html;
}
// Diagram.prototype.getFactorButton(obj, txt, data, action, title)
// {
//		return H.td(H.button(obj.text + txt, '', Cat.display.elementId(), title,
//			`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`));
// }
Diagram.prototype.getFactorButtonCode(obj, data)	//	data: {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:''}
{
	let expand = '';
	let html = obj.factorButton(data);
	return H.table(html + (expand !== '' ? H.tr(expand) : ''), 'sidenav', '', '');
}
factorBtnCode()
{
	const from = this.getSelected();
	const expr = from.to.expr;
	const text = from.to.properName;
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
Diagram.prototype.lambdaMorphism(e)	// TODO moved
{
	const from = this.getSelected();
	let domFactors = diagram.getFactorsByDomCodId('domainDiv');
	let homFactors = diagram.getFactorsByDomCodId('codomainDiv');
	const m = LambdaMorphism.Get(this.codomain, {preCurry:from.to, domFactors, homFactors});
	const v = D2.subtract(from.codomain, from.domain);
	const normV = D2.norm(D2.normal(v));
	const xyDom = D2.add(from.domain, D2.scale(Cat.default.arrow.length, normV));
	const xyCod = D2.add(from.codomain, D2.scale(Cat.default.arrow.length, normV));
	this.placeMorphism(e, m, xyDom, xyCod);
}
Diagram.prototype.displayString(event, from)
{
	this.showString(this.getSelected());
}
Diagram.prototype.showString(from)
{
	const id = StringMorphism.graphId(from);
	if (StringMorphism.removeStringSvg(from))
		return;
	const graphFunctor = $Cat.getMorphism('Graph');
	const sm = graphFunctor.$(this, from.to);
	from.stringMorphism = sm;
	const dom = {x:from.domain.x - from.to.domain.expr.width/2, y:from.domain.y, name:from.domain.name};
	const cod = {x:from.codomain.x - from.to.codomain.expr.width/2, y:from.codomain.y, name:from.codomain.name};
	const svg = `<g id="${id}">${stringMorphism.graphSVG(this, sm.graph, true, {index:[], graph:sm.graph, dom, cod, visited:[], elementId:from.elementId(), color:Math.floor(Math.random()*12)})}</g>`;
	Cat.display.diagramSVG.innerHTML += svg;
}
Diagram.prototype.getSubFactorBtnCode(expr, data)
{
	let html = '';
	if ('data' in expr)
		for(let i=0; i<expr.data.length; ++i)
			html += H.button(this.getObject(expr.data[i]).properName + H.sub(i), '', Cat.display.elementId(), '', `data-factor="${data.dir} ${i}" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
	else
		html += H.button(this.getObject(expr).properName, '', Cat.display.elementId(), '', `data-factor="${data.dir} -1" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
	return html;
}
Diagram.prototype.lambdaForm(event, elt)
{
	const from = this.getSelected();
	this.lambdaBtnForm(from.to.domain.expr, from.to.codomain.expr, from.to.domain.name);
}
Diagram.prototype.lambdaBtnForm(domExpr, codExpr, root)
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
Diagram.prototype.activateNamedElementForm(e)
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
Diagram.prototype.createNamedIdentity(e)
{
	try
	{
		if (this.readonly)
			throw 'Diagram is read only';
		const from = this.getSelected();
		if (CatObject.isPrototypeOf(from.to))
		{
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
			let toNI = new NamedObject(this.codomain, {name, html, description});
			const iso = new Identity(this.codomain, {domain:toNI, codomain:from.to, description:`Named identity from ${toNI.properName} to ${from.to.properName}`});
			const iso2 = new Identity(this.codomain, {domain:from.to, codomain:toNI, description:`Named identity from ${from.to.properName} to ${toNI.properName}`});
			this.deselectAll();
			const isoFrom = this.objectPlaceMorphism(e, 'codomain', from.name, iso.name)
			const iso2From = new DiagramMorphism(this.domain, {diagram:this, domain:isoFrom.codomain.name, codomain:isoFrom.domain.name});
			this.setMorphism(iso2From, iso2);
			iso2From.addSVG();
			Cat.display.deactivateToolbar();
			this.makeHomSets();
			this.saveLocal();
		}
		else
			throw 'Not implemented';
	}
	catch(e)
	{
		document.getElementById('namedElementError').innerHTML = 'Error: ' + Cat.getError(e);
	}
}
Diagram.prototype.flipName()
{
	const from = this.getSelected();
	from.flipName = !from.flipName;
	from.update();
	this.saveLocal();
}
Diagram.prototype.elementHelp()
{
	const from = this.getSelected();
	const readonly = from.diagram.readonly;
	let html = '';
	const create = (!readonly && from.to && from.to.isComplex()) ? Cat.display.getButton('edit', `Cat.getDiagram().activateNamedElementForm(evt)`, 'Create named identity', Cat.default.button.tiny) : '';
	if (from.to)
		html = H.h4(H.span(from.to.properName, '', 'htmlElt') + create) +
						H.p(H.span(Cat.cap(from.to.description), '', 'descriptionElt')) +
						H.p(H.span(Cat.limit(from.to.name), '', 'nameElt', from.to.name)) +
						H.div('', 'error', 'namedElementError') +
				from.to.help();
	else
		html = H.p(H.span(from.properName, 'tty', 'htmlElt') +
						(readonly ? '' : Cat.display.getButton('edit', `Cat.getDiagram().editElementText('htmlElt', 'html')`, 'Edit text', Cat.default.button.tiny)));
	document.getElementById('toolbarTip').innerHTML = html;
}
Diagram.prototype.elementHelpMorphTbl(morphs)
{
	return H.table(H.tr(H.th('Morphisms')) + morphs.map(m => H.tr(H.td(m.properName, 'left'))).join(''));
}
Diagram.prototype.getTransforms(dir, obj = null)
{
	let transforms = [];
	const catName = this.codomain.name;
	for(const [tName, t] of $Cat.transforms)
		t[dir].name === catName && ((obj && 'testFunction' in t) ? t.testFunction(this, obj) : true) && transforms.push(t);
	return transforms;
}
Diagram.prototype.updateDragObjects(p)
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
			homset.dom.map(m => m.update());
			homset.cod.map(m => m.update());
		}
	}, this);
}
Diagram.prototype.placeElement(e, elt)
{
	elt.addSVG();
	this.update(e, elt.class, elt);
}
Diagram.prototype.placeObject(e, to, xy)
{
	let from = null;
	if (typeof xy === 'undefined')
	{
		
		const xy = Cat.grid(this.userToDiagramCoords({x:Cat.grid(Cat.display.width()/2), y:Cat.grid(Cat.display.height()/2)}));
		from = new DiagramObject(this, {xy});
	}
	else
		from = new DiagramObject(this, {xy:Cat.grid(xy)});
	from.setObject(to);
	this.placeElement(e, from);
	return from;
}
Diagram.prototype.placeMorphism(e, to, xyDom, xyCod)
{
	const domain = new DiagramObject(this, {xy:Cat.grid(xyDom)});
	const codomain = new DiagramObject(this, {xy:Cat.grid(xyCod)});
	const from = new DiagramMorphism(this, {domain:domain.name, codomain:codomain.name});
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
Diagram.prototype.objectPlaceMorphism(e, dir, objName, morphName)
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
		const tw = Math.abs(cosAngle) * Cat.textWidth(to.codomain.properName);
		const xy = Cat.grid({x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)});
		let domainElt = null;
		let codomainElt = null;
		const newElt = new DiagramObject(this, {xy});
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
		const from = new DiagramMorphism({domain:domainElt.name, codomain:codomainElt.name});
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
Diagram.prototype.placeTransformMorphism(e, tranName, dir, name)
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
Diagram.prototype.getAttachedObjects(dir)		// dir == 'domain'|'codomain'
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
Diagram.prototype.product(e)
{
	let from = null;
	if (this.selected[0].class === 'morphism')
	{
		const morphisms = this.selected.map(m => m.to);
		const form = productMorphism.get(this.codomain, morphisms);
		let m = this.getMorphism(form.name);
		if (m === null)
			m = new ProductMorphism(this, {morphisms});
		m.incrRefcnt();
		from = this.trackMorphism(this.mousePosition(e), m);
	}
	else if (this.selected[0].class === 'object')
	{
		from = new DiagramObject(this, {xy:Cat.barycenter(this.selected)});
		const to = ProductObject.Get(this.codomain, this.getSelectedObjects());
		from.setObject(to);
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
Diagram.prototype.coproduct(e)
{
	let from = null;
	if (this.selected[0].class === 'morphism')
	{
		const morphisms = this.selected.map(m => m.to);
		const form = coproductMorphism.form(this, morphisms);		// ***
		let m = this.getMorphism(form.name);
		if (m === null)
			m = new CoproductMorphism(this, {morphisms});		// ***
		m.incrRefcnt();
		from = this.trackMorphism(this.mousePosition(e), m);
	}
	else if (this.selected[0].class === 'object')
	{
		from = new DiagramObject(this, {xy:Cat.barycenter(this.selected)});
		const to = CoproductObject.Get(this.codomain, this.getSelectedObjects());
		from.setObject(to);
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
Diagram.prototype.trackMorphism(xy, to, src = null)
{
	let domain = null;
	let codomain = null;
	if (src)
	{
		domain = new DiagramObject(this, {xy:src.domain.getXY()});
		codomain = new DiagramObject(this, {xy:src.codomain.getXY()});
	}
	else
	{
		domain = new DiagramObject(this, {xy});
		const codLen = Cat.textWidth(to.domain.properName)/2;
		const domLen = Cat.textWidth(to.codomain.properName)/2;
		const namLen = Cat.textWidth(to.properName);
		codomain = new DiagramObject(this,
			{
				xy:
				{
					x:xy.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4),
					y:xy.y
				}
			});
	}
	const from = new DiagramMorphism(this.domain, {diagram:this, domain, codomain});
	from.incrRefcnt();
	this.setMorphism(from, to);
	from.update();
	domain.addSVG();
	codomain.addSVG();
	from.addSVG();
	return from;
}
Diagram.prototype.productAssembly(e)
{
	const m = ProductAssembly.Get(this.codomain, this.getSeletectedMorphisms());
	this.objectPlaceMorphism(e, 'domain', m.domain.name, m.name);
}
Diagram.prototype.coproductAssembly(e)
{
	const m = CoproductAssembly.Get(this.codomain, this.getSeletectedMorphisms());
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
			b = morphs.cods.length === 1 && morphs.doms.length === 0 && Identity.isPrototypeOf(to);
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
	const from = new DiagramMorphism(this.domain, {diagram:this, domain:this.selected[0].domain.name, codomain:this.selected[this.selected.length -1].codomain.name, morphisms:this.selected});
	const to = Composite.Get(this.codomain, this.getSelectedMorphisms());
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
			const fromResult = new DiagramMorphism(this.domain, {diagram:this, domain:from.domain.name, codomain:from.codomain.name});
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
/*
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
	div.innerHTML += H.button(this.getObject(expr).properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="Cat.H.del(this);${action}"`);
}
*/
addFactor(id, fname, root, action, ...indices)
{
	let div = document.getElementById(id);
	if (div.innerHTML === '')
		div.innerHTML = H.span(Cat.display.getButton('edit', `Cat.getDiagram().${fname}(evt)`, 'Create morphism'));
	//
	// start with the first element and go down from there
	//
	let obj = this.getObject(root);
	obj = obj.getFactor(indices);
	let sub = indices.join();
	div.innerHTML += H.button(obj.properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="Cat.H.del(this);${action}"`);
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
		m = new FactorMorphism(this, {domain:domain.name, factors});
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
newDataMorphism(dom, cod)
{
	const name = this.codomain.getAnon('Data');
	return new DataMorphism(this.codomain, {name, properName:name.slice(0, 9) + '&hellip;', diagram:this.name, domain:dom.name, codomain:cod.name});
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
	/*
	for (const [k, obj] of this.objects)
		if (!(obj.name in found))
		{
			objects.push(obj);
			found[obj.name] = true;
		}
		*/
	document.getElementById(`${this.name}_ObjPnl`).innerHTML = H.table(objects.map(o => H.tr(
		(Cat.display.showRefcnts ? H.td(o.refcnt) : '') +
						H.td(o.refcnt === 0 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeObject(evt, '${o.name}')`, 'Delete object') : '', 'buttonBar') +
						H.td(o.properName),
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
						H.td(m.properName) +
						H.td(m.domain.properName) +
						H.td('&rarr;') +
						H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${m.name}')"`);
	}
	for (const [k, m] of this.codomain.morphisms)
	{
		if (m.name in found)
			continue;
		found[m.name] = true;
		html += H.tr(	(Cat.display.showRefcnts ? H.td(m.refcnt) : '') +
						H.td(m.refcnt <= 0 && !this.readonly ? Cat.display.getButton('delete', `Cat.getDiagram('${this.name}').removeCodomainMorphism(evt, '${m.name}');`, 'Delete dangling codomain morphism') :
							'', 'buttonBar') +
						H.td(m.properName) +
						H.td(m.domain.properName) +
						H.td('&rarr;') +
						H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="Cat.display.morphism.drag(event, '${m.name}')"`);
	}
	document.getElementById(`${this.name}_MorPnl`).innerHTML = H.table(html);
}
makeAllSVG()
{
	let svg = '';
	/*
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
		*/
	for (const [name, o] of this.domain.objects)
		try
		{
			svg += o.makeSVG();
		}
		catch(e)
		{
			Cat.recordError(e);
		}
	for (const [name, m] of this.domain.morphisms)
		try
		{
			svg += m.makeSVG();
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
	return Cat.display.accordionPanelDyn(this.properName, `Cat.getDiagram('${this.properName}').${updateFnName}('${pnlName}')`, pnlName);
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
		const detachedObj = new DiagramObject(this,
			{
				xy:
				{
					x:obj.x + Cat.default.toolbar.x,
					y:obj.y + Cat.default.toolbar.y
				}
			});
		obj.decrRefcnt();
		from[dir] = detachedObj;
		detachedObj.setObject(from.to[dir]);
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
Diagram.prototype.clearDataMorphism()
{
	const from = this.getSelected();
	if (DataMorphism.isPrototypeOf(from.to))
	{
		from.to.clear();
		this.saveLocal();
	}
}
updateMorphisms()
{
//	for(const [from, to] of this.morphisms)
//		from.update(this);
	for(const [name, from] of this.domain.morphisms)
		from.update();
}
Diagram.prototype.isIsolated(elt)
{
	let r = false;
	if (CatObject.isPrototypeOf(elt))
		r = elt.refcnt === 1;
	else if (Morphism.isPrototypeOf(elt))
	{
		const domMorphs = this.domain.obj2morphs.get(elt.domain);
		const codMorphs = this.domain.obj2morphs.get(elt.codomain);
		r = domMorphs.dom.length === 1 && domMorphs.cod.length === 0 && codMorphs.dom.length === 0 && codMorphs.cod.length === 1;
	}
	return r;
}
/*
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
			return homDomain.name === factors[1].name;
	}
	return false;
}
*/
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
				DataMorphism.isPrototypeOf(sel0) &&
				Composite.isPrototypeOf(sel1) &&
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
		Cat.status(e, `Recursor for ${sel0.properName} has been set`);
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
Diagram.prototype.getElement(name)
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
Diagram.prototype.showStrings(e)
{
	this.colorIndex2colorIndex = {};
	this.colorIndex2color = {};
	this.link2colorIndex = {};
	this.colorIndex = 0;
	let exist = false;
	for(const [name, from] of this.domain.morphisms)
		exist = stringMorphism.removeStringSvg(from) || exist;
	if (exist)
		return;
	for(const [name, from] of this.domain.morphisms)
		this.showString(from);
	this.update(e, '', null, false, false);
}
Diagram.prototype.getHomSet(dom, cod)
{
	let morphs = [];
	for(const [name, from] of this.domain.morphisms)
	{
		if ((from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
			morphs.push(from);
	}
	this.references.map(r =>
	{
		for(const [name, from] of r.morphisms)
		{
			if ((from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
				morphs.push(from);
		}
	});
	return morphs;
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
Diagram.prototype.getTextElement(name)
{
	return this.texts[this.texts.indexOf(name)];
}
Diagram.prototype.downloadJS(e)
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
Diagram.prototype.downloadPNG()
{
	Cat.svg2canvas(Cat.display.topSVG, this.name, Cat.download);
}
Diagram.prototype.baseURL(ext = '.json')
{
	return `${this.user}/${this.basename}${ext}`;
}
Diagram.prototype.getReferenceCounts(refs = {})
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
Diagram.prototype.canRemoveReferenceDiagram(name)
{
	const ref = Cat.getDiagram(name);
	// TODO wrong algorithm
	for(const [name, elt] of ref.domain.objects)
		if (element.hasDiagramElement(dgrm, elt, true, null))
			return false;
	for(const [name, elt] of ref.domain.morphisms)
		if (element.hasDiagramElement(dgrm, elt, true, null))
			return false;
	return true;
}
Diagram.prototype.removeReferenceDiagram(e, name)	// TODO
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
Diagram.prototype.addReferenceDiagram(e, name, silent = true)
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
Diagram.prototype.hasReference(name)
{
	return this.references.filter(d => d.name === name).length > 0;
}
Diagram.prototype.unlock(e)
{
	this.readonly = false;
	Cat.display.diagram.updateLockBtn(this);
}
Diagram.prototype.lock(e)
{
	this.readonly = true;
	Cat.display.diagram.updateLockBtn(this);
}
Diagram.prototype.copyObject(e)
{
	const from = this.getSelected();
	const xy = D2.add(from, D2.scale(Cat.default.arrow.length/2, {x:1, y:1}));
	this.placeObject(e, from.to, xy);
}
Diagram.prototype.help()
{
	return H.p(`Diagram ${this.properName} in category ${this.category.properName}`);
}
//
// Diagrama static methods
//
Diagram.prototype.Codename(args);
{
	const catName = typeof args.category === 'string' ? args.category : category.name;
	return `D${Cat.sep}${catName}${Cat.sep}${args.user}${Cat.sep}${args.basename}`;
}
Diagram.prototype.FetchDiagram(dgrmName, fn)
{
	Cat.Amazon.fetchDiagramJsons([dgrmName], function(jsons)
	{
		jsons.reverse().map(j =>
		{
			const dgrm = new Diagram(j);
			dgrm.saveLocal();
		});
		if (fn)
			fn(dgrmName);
	});
}
Diagram.prototype.ReadLocal(dgrmName)
{
	const data = localStorage.getItem(Diagram.StorageName(dgrmName));
	let dgrm = null;
	if (data !== null)
		dgrm = new Diagram(JSON.parse(data));
	if (Cat.debug)
		console.log('readLocal',dgrmName,dgrm);
	return dgrm;
}
Diagram.prototype.StorageName(dgrmName)
{
	return `Cat.diagram ${dgrmName}`;
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


})(typeof exports === 'undefined' ? this['Cat'] = this.Cat : exports);
