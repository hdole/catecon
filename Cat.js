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
	var sjcl = null;
	var zlib = null;
	AWS = require('aws-sdk');
	// TODO how to do this for AWS Lambda?
//	if (typeof AmazonCognitoIdentity === 'undefined')
//		ACI = require('amazon-cognito-identity-js');
	sjcl = require('./sjcl.js');
	zlib = require('./zlib_and_gzip.min.js');
	var crypto = require('crypto');
}
else
{
	var AWS = window.AWS;
	var sjcl = window.sjcl;
	var zlib = window.zlib;
}

//
// Built-in categories and diagrams
//
let $Cat = null;		// working Cat of cats
let $CatDgrm = null;	// working diagram of categories and functors
let $Cat2 = null;		// working nat trans
let $Cat2Dgrm = null;	// working diagram of functors and natural transformations
let $PFS = null;
let $Graph = null;

//
// 2-D vector support
//
function D2()
{
	this.x = 0;
	this.y = 0;
}
D2.prototype.eps = 0.0000001;
D2.prototype.add(v, w)
{
	return {x:v.x + w.x, y:v.y + w.y};
}
D2.prototype.inner(v)
{
	return v.x * v.x + v.y * v.y;
}
D2.prototype.length(v)
{
	return Math.sqrt(D2.inner(v));
}
D2.prototype.norm(v)
{
	const length = D2.length(v);
	return {x:v.x / length, y:v.y / length};
}
D2.prototype.scale(a, v)
{
	return {x:v.x*a, y:v.y*a};
}
D2.prototype.subtract(v, w)
{
	return {x:v.x - w.x, y:v.y - w.y};
}
D2.prototype.normal(v)
{
	return {x:-v.y, y:v.x};
}
D2.prototype.round(v)
{
	return {x:Math.round(v.x), y:Math.round(v.y)};
}
D2.prototype.multiply(mtrx, vctr)
{
	const r =
	{
		x:mtrx[0][0] * vctr.x + mtrx[0][1] * vctr.y,
		y:mtrx[1][0] * vctr.x + mtrx[1][1] * vctr.y
	};
	return r;
}
D2.prototype.dist2(v, w)
{
	return D2.inner(D2.subtract(v, w));
}
D2.prototype.dist(v, w)
{
	return Math.sqrt(D2.dist2(v, w));
}
D2.prototype.segmentDistance(p, v, w)
{
	const l2 = D2.dist2(v, w);
	if (l2 === 0)
		return D2.dist(p, v);
	let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	t = Math.max(0, Math.min(1, t));
	return D2.dist(p, {x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y)});
}
D2.prototype.updatePoint(p, c, basePoint)
{
	return D2.dist2(c, basePoint) < D2.dist2(p, basePoint) ? c : p;
}
D2.prototype.inbetween(a, b, c)
{
	return (a - D2.eps <= b && b <= c + D2.eps) || (c - D2.eps <= b && b <= a + D2.eps);
}
D2.prototype.inside(a, b, c)
{
	return D2.inbetween(a.x, b.x, c.x) && D2.inbetween(a.y, b.y, c.y);
}
D2.prototype.segmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4)
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
	if (!(D2.inbetween(x2, x, x1) && D2.inbetween(y2, y, y1) && D2.inbetween(x3, x, x4) && D2.inbetween(y3, y, y4)))
		return false;
	return {x, y};
}

//
// HTML support
//
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
	catalog:		{},
	clear:			false,
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
	basenameEx:		RegExp('^[a-zA-Z_]+[@a-zA-Z0-9_-]*[a-zA-Z]$'),
	opEx:			RegExp('^..{'),
	localDiagrams:	{},
	secret:			'0afd575e4ad6d1b5076a20bf53fcc9d2b110d3f0aa7f64a66f4eee36ec8d201f',
	serverDiagrams:	{},
	user:			{name:'Anon', email:'', status:'unauthorized'},	// TODO fix after bootstrap removed
	userNameEx:		RegExp('^[a-zA-Z_-]+[a-zA-Z0-9_]*$'),
	uploadLimit:	1000000,
	url:			'',
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
	{
		if (Cat.secret !== Cat.getUserSecret(document.getElementById('cookieSecret').value))
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
	addDiagram(dgrm)
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
	//
	// Looks in the current list of loaded diagrams to find the requested one.
	// Does no dynamic loading from local cache or remote server.
	//
	getDiagram(dgrmName, checkLocal = true)
	{
		//
		// if we are not given a diagram name then use the currently used diagram name
		//
		if (typeof dgrmName === 'undefined' || dgrmName === '')
			dgrmName = Cat.selected.diagram;
		let dgrm = null;
		//
		// do we have it loaded?
		//
		if (dgrmName in Cat.diagrams)
			return Cat.diagrams[dgrmName];
		/* TODO move?
		if (checkLocal && Cat.hasLocalDiagram(dgrmName))
		{
			dgrm = diagram.readLocal(dgrmName);
			if (!(name in Cat.diagrams))
				Cat.diagrams[dgrmName] = dgrm;
		}
		*/
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
		Cat.localDiagrams[dgrm.name] = {name:dgrm.name, properName:dgrm.properName, timestamp:dgrm.timestamp, description:dgrm.description, user:dgrm.user};
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
			display.recordError(e);
		}
	},
	/*
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
	*/
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
			basename:		'Cat',
			properName:		'&#x2102;&#x1D552;&#x1D565;',
			description:	'Category of small categories',
		});
		$Cat2 = new Category(
		{
			basename:		'Cat2',
			properName:		'&#x2102;&#x1D552;&#x1D565;&#120794',
			description:	'Two category',
			objects:		$Cat.morphisms,
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
		localStorage.setItem(`Cat.selected.category ${Cat.user.name}`, display.category);
	},
	getLocalStorageDiagramName(cat)
	{
		return localStorage.getItem(`Cat.selected.diagram ${Cat.user.name} ${cat}`);
	},
	setLocalStorageDiagramName()
	{
		localStorage.setItem(`Cat.selected.diagram ${Cat.user.name} ${display.category}`, Cat.selected.diagram);
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
				display.initialize();
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
			isGUI && display.setNavbarBackground();
			isGUI && Panels.update();
			if (!isGUI)
			{
				exports.Amazon =				Cat.Amazon;
				exports.default =				Cat.default;
				exports.deleteLocalDiagram =	Cat.deleteLocalDiagram;
				exports.diagrams =				Cat.diagrams;
				exports.sep =					'-',
				exports.user =					Cat.user;
				exports.$Cat =					$Cat;
				exports.$PFS =					$PFS;
				exports.$Graph =				$Graph;
				exports.Diagram =				Diagram;
				exports.Element =				Element;
				exports.CatObject =				CatObject;
				exports.Morphism =				Morphism;
				exports.StringMorphism =		StringMorphism;
			}
			else
			{
				window.Cat			= Cat;
				Cat.element			= element;
				Cat.morphism		= morphism;
				Cat.StringMorphism	= StringMorphism;
				Cat.H				= H;
			}
		}
		catch(e)
		{
			display.recordError(e);
		}
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
						if (!$Cat.getObject(cat.basename))
						{
							const nuCat = new Category({basename:cat.basename, properName:cat.properName, description:cat.description, signature:cat.signature});
							Cat.catalog[nuCat] = {};
						}
					});
					if (fn)
						fn(data);
				});
			else
				display.recordError('Categories request failed.', response);
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
				display.recordError(`Cannot get list of diagrams for category ${cat}`);
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
	/*
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
//				name = name === null ? diagram.Codename({category:cat.name, user:Cat.user.name, basename:'Draft'}) : name;
				let dgrm = Cat.getDiagram(name);
				if (dgrm && diagram.readLocal(name) === null)
				{
					dgrm = new Diagram({name, codomain:cat, properName:'Draft', description:'Scratch diagram', user:Cat.user.name});
					dgrm.saveLocal();
				}
				Cat.selected.selectDiagram(name);
				if (fn)
					fn();
				Panels.update();
				Cat.setLocalStorageDiagramName();
			});
		},
		selectDiagram(name, update = true)
		{
			display.deactivateToolbar();
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
			diagramPanel.update();
			objectPanel.update();
			morphismPanel.update();
			elementPanel.update();
			const dgrm = Cat.getDiagram();
			display.diagramSVG.innerHTML = dgrm.makeAllSVG();
			diagramPanel.setToolbar(dgrm);
			dgrm.update(null, 'diagram', null, true, false);
			dgrm.updateMorphisms();
		},
	},
	*/
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
	parens(h, doit)
	{
		return doit ? `(${h})` : h;
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
		return name.indexOf('-') > -1;
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
	//
	// merge array b to a
	//
	arrayMerge(a, b)
	{
		b.map(v => a.indexOf(v) === -1 ? a.push(v) : null);
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
					display.recordError(`Cannot save category: ${err.message}`);
					return;
				}
				if (Cat.debug)
					console.log('saved category', cat.name);
			});
		},
		saveDiagram(dgrm)	// for bootstrapping
		{
			const key = `${dgrm.codomain.name}/${dgrm.user}/${dgrm.name}.json`;
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
					display.recordError(`Cannot save diagram: ${err.message}`);
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
						display.setNavbarBackground();
						loginPanel.update();
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
				display.setNavbarBackground();
				loginPanel.update();
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
				display.setNavbarBackground();
				loginPanel.update();
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
				display.setNavbarBackground();
				loginPanel.update();
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
						display.setNavbarBackground();
						loginPanel.update();
						morphismPanel.update();
						loginPanel.toggle();
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
			display.setNavbarBackground();
			Panels.update();
		},
		async fetchDiagram(name)
		{
			const tokens = name.split('-');
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
								display.recordError(error);
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
									user:Cat.user.name,
								}),
			};
			const handler = function(error, data)
			{
				if (error)
				{
					display.recordError(error);
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
				display.status(e, 'CANNOT UPLOAD!<br/>Diagram too large!');
				return;
			}
			Cat.svg2canvas(display.topSVG, dgrm.name, function(url, filename)
			{
				const params =
				{
					FunctionName:	'CateconIngestDiagram',
					InvocationType:	'RequestResponse',
					LogType:		'None',
					Payload:		JSON.stringify({diagram:dgrmJson, user:Cat.user.name, png:url}),
				};
				const handler = function(error, data)
				{
					if (error)
					{
						display.recordError(error);
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
				Payload:		JSON.stringify({user:Cat.user.name}),
			};
			Cat.Amazon.lambda.invoke(params, function(error, data)
			{
				if (error)
				{
					display.recordError(error);
					return;
				}
				const payload = JSON.parse(data.Payload);
				payload.Items.map(i => Cat.serverDiagrams[i.subkey.S] = {timestamp:Number.parseInt(i.timestamp.N), description:i.description.S, properName:i.properName.S});
				diagramPanel.setUserDiagramTable();
				if (fn)
					fn(payload.Items);
			});
		},
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
	dual(cat)
	{
		// TODO
	},
	//
	// Extracts a graph by indices from a graph.
	//
	getFactor(g, ...indices)
	{
		let fctr = Cat.clone(g);
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return null;	// object is terminal object One
			if ('data' in fctr)
				fctr = fctr.data[k];
		}
		return fctr;
	},
};	// Cat

//
// Display
//
function Display()
{
	this.bracketWidth =	0;
	this.callbacks =	[];
	this.category =		null;
	this.commaWidth =	0;
	this.diagram =		null;
	this.diagramSVG =	null;
	this.drag =			false;
	this.dragStart =	new D2;
	this.fuseObject =	null;
	this.gridding =		true;
	this.id =			0;
	this.mouse =		{down:new D2, xy:new D2};
	this.mouseDown =	false;
	this.mouseover =	null;
	this.navbarElt =	null;
	this.shiftKey =		false;
	this.showRefcnts =	true;
	this.showUploadArea =	false;
	this.snapWidth =	1024;
	this.snapHeight =	768;
	this.statusbarElt = null;
	this.statusXY =		new D2;
	this.tool =			'select';	// select|pan
	this.textDisplayLimit =	60,
	this.topSVG =		null;
	this.uiSVG =		null;
	this.upSVG =		null;
	this.svgContainers =	['svg', 'g'];
	this.svgStyles =
	{
		path:	['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
		text:	['fill', 'font', 'margin', 'stroke'],
	};
	this.svg =
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
	};
}
Display.prototype.resize()
{
	const dgrm = $Cat !== null ? Cat.getDiagram() : null;
	const scale = dgrm !== null ? dgrm.viewport.scale : 1.0;
	const width = scale > 1.0 ? Math.max(window.innerWidth, window.innerWidth / scale) : window.innerWidth / scale;
	const height = scale > 1.0 ? Math.max(window.innerHeight, window.innerHeight / scale) : window.innerHeight / scale;
	if ('topSVG' in this && this.topSVG)
	{
		this.topSVG.setAttribute('width', width);
		this.topSVG.setAttribute('height', height);
		this.uiSVG.setAttribute('width', width);
		this.uiSVG.setAttribute('height', height);
		this.upSVG.setAttribute('width', width);
		this.upSVG.setAttribute('height', height);
	}
}
Display.prototype.initialize()
{
	this.setNavbarHtml();
	this.topSVG.addEventListener('mousemove', this.mousemove, true);
	this.topSVG.addEventListener('mousedown', this.mousedown, true);
	this.topSVG.addEventListener('mouseup', this.mouseup, true);
	this.uiSVG.style.left = '0px';
	this.uiSVG.style.top = '0px';
	this.upSVG.style.left = '0px';
	this.upSVG.style.top = '0px';
	this.resize();
	this.upSVG.style.display = this.showUploadArea ? 'block' : 'none';
	this.addEventListeners();
	this.parenWidth = display.textWidth('(');
	this.commaWidth = display.textWidth(', ');
	this.bracketWidth = display.textWidth('[');
	this.diagramSVG =	document.getElementById('diagramSVG');
	this.topSVG =		document.getElementById('topSVG');
	this.uiSVG =		document.getElementById('uiSVG');
	this.upSVG =		document.getElementById('upSVG');
	this.navbarElt =	document.getElementById('navbar');
	this.statusbarElt = document.getElementById('statusbar');
	Panels.update();
}
Display.prototype.mousedown(e)
{
	this.mouseDown = true;
	this.mouse.down = {x:e.clientX, y:e.clientY};
	const dgrm = Cat.getDiagram();
	this.callbacks.map(f => f());
	this.callbacks = [];
	const pnt = dgrm.mousePosition(e);
	if (this.mouseover)
	{
		if (!dgrm.isSelected(this.mouseover) && !this.shiftKey)
			dgrm.deselectAll();
	}
	else
		dgrm.deselectAll();
	if (e.which === 2)
		this.tool = 'pan';
	if (this.tool === 'pan')
	{
		if (!this.drag)
		{
			dgrm.viewport.orig = Cat.clone(dgrm.viewport);
			if ('orig' in dgrm.viewport.orig)
				delete dgrm.viewport.orig.orig;
			this.dragStart = pnt;
			this.drag = true;
		}
	}
}
Display.prototype.mousemove(e)
{
	this.mouse.xy = {x:e.clientX, y:e.clientY};
	try
	{
		this.shiftKey = e.shiftKey;
		let dgrm = Cat.getDiagram();
		if (!dgrm)
			return;
		const xy = dgrm.mousePosition(e);
		if (this.drag)
		{
			this.deactivateToolbar();
			if (!dgrm.readonly && e.ctrlKey && dgrm.selected.length == 1 && this.fuseObject === null)
			{
				let from = dgrm.getSelected();
				this.mouseover = dgrm.findElement(xy, from.name);
				const isolated = from.refcnt === 1;
				if (DiagramObject.isPrototypeOf(from))
				{
					const to = from.to;
					this.fuseObject = new DiagramObject(dgrm, {xy});
					dgrm.deselectAll();
					const id = Identity.Get(dgrm, to);
					const fromMorph = new DiagramMorphism(dgrm, {to:id, domain:from.name, codomain:this.fuseObject.name});
					fromMorph.incrRefcnt();
					this.fuseObject.addSVG();
					fromMorph.addSVG();
					fromMorph.update();
					from = this.fuseObject;
					dgrm.addSelected(e, this.fuseObject);
					from.setXY(xy);
					dgrm.saveLocal();
					dgrm.checkFusible(xy);
				}
				else if (DiagramMorphism.isPrototypeOf(from))
				{
					dgrm.deselectAll();
					const domain = new DiagramObject(dgrm, {xy:from.domain.getXY()});
					const codomain = new DiagramObject(dgrm, {xy:from.codomain.getXY()});
					const fromCopy = new DiagramMorphism(dgrm, {to, domain, codomain});
					fromCopy.incrRefcnt();
					fromCopy.update();
					domain.addSVG();
					codomain.addSVG();
					fromCopy.addSVG();
					dgrm.addSelected(e, fromCopy);
					dgrm.saveLocal();
					this.fuseObject = fromCopy;
					dgrm.checkFusible(xy);
				}
			}
			else
			{
				const skip = dgrm.getSelected();
				this.mouseover = dgrm.findElement(xy, skip ? skip.name : '');
				switch(this.tool)
				{
				case 'select':
					if (!dgrm.readonly)
					{
						dgrm.updateDragObjects(xy);
						dgrm.checkFusible(xy);
					}
					break;
				case 'pan':
					const loc = dgrm.userToDiagramCoords(this.mouse.xy, true);
					const delta = D2.scale(dgrm.viewport.orig.scale, D2.subtract(loc, this.dragStart));
					dgrm.viewport.x = dgrm.viewport.orig.x + delta.x;
					dgrm.viewport.y = dgrm.viewport.orig.y + delta.y;
					dgrm.setView();
					break;
				}
			}
		}
		else if (this.mouseDown === true)
		{
			this.mouseover = dgrm.findElement(xy);
			const x = Math.min(this.mouse.xy.x, this.mouse.down.x);
			const y = Math.min(this.mouse.xy.y, this.mouse.down.y);
			const width = Math.abs(this.mouse.xy.x - this.mouse.down.x);
			const height = Math.abs(this.mouse.xy.y - this.mouse.down.y);
			const svg = document.getElementById('selectRect');
			if (svg)
			{
				svg.setAttribute('x', x);
				svg.setAttribute('y', y);
				svg.setAttribute('width', width);
				svg.setAttribute('height', height);
			}
			else
			{
				const s = `<rect id="selectRect" x="${x}" y="${y}" width="${width}" height="${height}">`;
				this.uiSVG.innerHTML += s;
			}
		}
		else
		{
			this.mouseover = dgrm.findElement(xy);
			const svg = document.getElementById('selectRect');
			if (svg)
				svg.parentNode.removeChild(svg);
		}
	}
	catch(e)
	{
		display.recordError(e);
	}
}
Display.prototype.mouseup(e)
{
	this.mouseDown = false;
	if (e.which === 2)
	{
		this.tool = 'select';
		this.drag = false;
		return;
	}
	try
	{
		const dgrm = Cat.getDiagram();
		const cat = dgrm.codomain;
		let pnt = dgrm.mousePosition(e);
		if (this.drag)
		{
			if (dgrm.selected.length === 1)
			{
				let dragObject = dgrm.getSelected();
				let targetObject = dragObject.isEquivalent(this.mouseover) ? null : this.mouseover;
				if (targetObject !== null)
				{
					if (DiagramObject.isPrototypeOf(dragObject) && DiagramObject.isPrototypeOf(targetObject))
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
									Display.MergeObjectsRefCnt(dgrm, dragObject, targetObject);
								}
								else if (from.codomain.isEquivalent(dragObject))
								{
									from.codomain.decrRefcnt();
									from.codomain = targetObject;
									Display.MergeObjectsRefCnt(dgrm, dragObject, targetObject);
								}
							}
							dragObject.decrRefcnt();
							dgrm.update(e, null, true);
						}
					}
					//
					// TODO * is monoidal
					//
					else if (dgrm.codomain.hasProducts &&
						DiagramMorphism.isPrototypeOf(dragObject) &&
						DiagramMorphism.isPrototypeOf(targetObject) &&
						dgrm.isIsolated(dragObject) &&
						dgrm.isIsolated(targetObject))
					{
						dgrm.deselectAll();
						const dragMorphTo = dragObject.to;
						const targetMorphTo = targetObject.to;
						const morphisms = [targetMorphTo, dragMorphTo];
						const newTo = ProductMorphism.Get(dgrm, morphisms);
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
		this.fuseObject = null;
	}
	catch(x)
	{
		display.recordError(x);
	}
	this.drag = false;
}
Display.prototype.drop(e)
{
	try
	{
		e.preventDefault();
		this.drag = false;
		let cat = this.getCat();
		let dgrm = Cat.getDiagram();
		if (dgrm.readonly)
		{
			display.status(e, 'Diagram is not editable!');
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
			to = dgrm.getObject(name);
			from = new DiagramObject(dgrm, {xy, to});
			break;
		case 'morphism':
			to = dgrm.getMorphism(name);
			if (to === null)
				throw `Morphism ${name} does not exist in category ${cat.properName}`;
			const domain = new DiagramObject(dgrm, {xy});
			const codLen = display.textWidth(to.domain.properName)/2;
			const domLen = display.textWidth(to.codomain.properName)/2;
			const namLen = display.textWidth(to.properName);
			const codomain = new DiagramObject(dgrm,
				{
					xy:
					{
						x:pnt.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4),
						y:pnt.y
					}
				});
			from = new DiagramMorphism(dgrm, {to, domain, codomain});
			from.incrRefcnt();	// TODO ???
			from.update();
			domain.addSVG();
			codomain.addSVG();
			break;
		}
		from.addSVG();
		dgrm.update(e, from);
	}
	catch(err)
	{
		display.recordError(err);
	}
}
Display.prototype.deactivateToolbar()
{
	this.toolbar.style.display = 'none';
}
Display.prototype.closeBtnCell(typeName)
{
	return H.td(this.getButton('close', `${typeName}Panel.close()`, 'Close'), 'buttonBar');
}
Display.prototype.expandPanelBtn(panelName, right)
{
	return H.td(this.getButton(right ? 'chevronLeft' : 'chevronRight', `${panelName}.expand()`, 'Expand'), 'buttonBar', `${panelName}-expandBtn`);
}
Display.prototype.clickDeleteBtn(id, fn)
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
			this.callbacks.push(function()
			{
				var elm = delBtn;
				var newElm = elm.cloneNode(true);
			});
		}
	}
	catch(e)
	{
		display.recordError(e);
	}
}
Display.prototype.deleteBtn(fn, title)
{
	const uid = ++this.id;
	const html = H.span(
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg id="svg${uid}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="0.32in" height="0.32in" version="1.1" viewBox="0 0 320 320" xmlns:xlink="http://www.w3.org/1999/xlink">
<rect id="delBtn${uid}" x="0" y="0" width="320" height="320" fill="white">
<animate attributeName="fill" values="white;yellow" dur="0.25s" begin="anim${uid}.begin" fill="freeze"/>
</rect>
<g>
${this.svg.delete}
<rect class="btn" x="0" y="0" width="320" height="320" onclick="display.clickDeleteBtn(${uid}, '${fn}')"/>
<animateTransform id="anim${uid}" attributename="transform" type="rotate" from="0 160 160" to="360 160 160" begin="click" dur="0.25s" fill="freeze"/>
</g>
</svg>`, '', '', title);
	return H.td(H.div(html), 'buttonBar');
}
Display.prototype.downloadButton(txt, onclick, title, scale = Cat.default.button.small)
{
	const html = H.span(Display.SvgHeeader(scale) + this.svg.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">${txt}</text>
${Display.Button(onclick)}
</svg>`, '', '', title);
	return html;
}
Display.prototype.getButton(buttonName, onclick, title, scale = Cat.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
{
	let btn = this.svg[buttonName];
	if (id !== null)
		btn = `<g id="${id}">${btn}</g>`;
	return H.span(Display.SvgHeader(scale, bgColor) + btn + (addNew ? this.svg.new : '') + Display.Button(onclick) + '</svg>', '', id, title);
}
Display.prototype.setNavbarHtml()
{
	const left = H.td(H.div(this.getButton('category', "categoryPanel.toggle()", 'Categories', Cat.default.button.large))) +
		H.td(H.div(this.getButton('diagram', "diagramPanel.toggle()", 'Diagrams', Cat.default.button.large))) +
		H.td(H.div(this.getButton('object', "objectPanel.toggle()", 'Objects', Cat.default.button.large))) +
		H.td(H.div(this.getButton('morphism', "morphismPanel.toggle()", 'Morphisms', Cat.default.button.large))) +
		H.td(H.div(this.getButton('functor', "functorPanel.toggle()", 'Functors', Cat.default.button.large))) +
		H.td(H.div(this.getButton('transform', "transformPanel.toggle()", 'Transforms', Cat.default.button.large))) +
		H.td(H.div(this.getButton('text', "elementPanel.toggle()", 'Text', Cat.default.button.large)));
	const right =
		H.td(H.div(this.getButton('cateapsis', "Cat.getDiagram().home()", 'Cateapsis', Cat.default.button.large))) +
		H.td(H.div(this.getButton('string', "Cat.getDiagram().showStrings(evt)", 'Graph', Cat.default.button.large))) +
		H.td(H.div(this.getButton('threeD', "threeDpanel.toggle();threeDPanel.resizeCanvas()", '3D view', Cat.default.button.large))) +
		H.td(H.div(this.getButton('tty', "ttyPanel.toggle()", 'Console', Cat.default.button.large))) +
		H.td(H.div(this.getButton('help', "helpPanel.toggle()", 'Help', Cat.default.button.large))) +
		H.td(H.div(this.getButton('login', "loginPanel.toggle()", 'Login', Cat.default.button.large))) +
		H.td(H.div(this.getButton('settings', "settingsPanel.toggle()", 'Settings', Cat.default.button.large))) +
		H.td('&nbsp;&nbsp;&nbsp;');
	let navbar = H.table(H.tr(	H.td(H.table(H.tr(left), 'buttonBar'), 'w20', '', '', 'align="left"') +
								H.td(H.span('', 'navbar-inset', 'categroy-navbar'), 'w20') +
								H.td(H.span('Catecon', 'title'), 'w20') +
								H.td(H.span('', 'navbar-inset', 'diagram-navbar'), 'w20') +
								H.td(H.table(H.tr(right), 'buttonBar', '', '', 'align="right"'), 'w20')), 'navbarTbl');
	this.navbarElt.innerHTML = navbar;
}
Display.prototype.setCursor()
{
	switch(this.tool)
	{
	case 'select':
		this.topSVG.style.cursor = 'default';
		break;
	case 'pan':
		this.topSVG.style.cursor = 'all-scroll';
		break;
	}
}
Display.prototype.elementId()
{
	return `elt_${this.id++}`;
}
Display.prototype.addEventListeners()
{
	document.addEventListener('mousemove', function(e)
	{
		if (this.statusbarElt.style.display === 'block' && D2.dist(display.statusXY, {x:e.clientX, y:e.clientY}) > 50)
			this.statusbarElt.style.display = 'none';
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
				display.tool = 'pan';
				break;
			case 36:	// 'home'
				Cat.getDiagram().home();
				break;
			}
			display.shiftKey = e.shiftKey;
			display.setCursor();
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
			const xy = dgrm.userToDiagramCoords(this.mouse.xy);
			display.shiftKey = e.shiftKey;
			const plain = !(e.shiftKey || e.ctrlKey || e.altKey);
			const plainShift = e.shiftKey && !(e.ctrlKey || e.altKey);
			switch(e.keyCode)
			{
			case 32:	// 'space'
				if (plain)
				{
					display.tool = 'select';
					display.drag = false;
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
					threeDPanel.toggle();
				break;
			case 67:	// c
				if (plainShift)
					categoryPanel.toggle();
				break;
			case 68:	// d
				if (plainShift)
					diagramPanel.toggle();
				break;
			case 72:	// h
				if (plainShift)
					helpPanel.toggle();
				break;
			case 76:	// l
				if (plainShift)
					loginPanel.toggle();
				break;
			case 77:	// m
				if (plainShift)
					morphismPanel.toggle();
				break;
			case 79:	// O
				if (plain)
					objectdPanel.toggle();
				break;
			case 83:	// S
				if (plain)
					settingsPanel.toggle();
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
					dgrm.placeObject(e, dgrm.getObject('D'), xy);
				break;
			case 70:	// f
				if (plain && !dgrm.readonly)
					dgrm.placeObject(e, dgrm.getObject('F'), xy);
				break;
			case 83:	// S
				if (plainShift && !dgrm.readonly)
					dgrm.placeObject(e, dgrm.getObject('Str'), xy);
				break;
			case 79:	// O
				if (plainShift && !dgrm.readonly && 'subobjectClassifer' in cat)
					dgrm.placeObject(e, cat.subobjectClassifer, xy);
				break;
			case 84:	// T
				if (plainShift && !dgrm.readonly)
				{
					const txt = new DiagramElement(dgrm, {name:`Text${dgrm.textId++}`, diagram:dgrm, properName:'Lorem ipsum cateconium', xy});
					dgrm.elements.push(txt);
					dgrm.placeElement(e, txt);
				}
				else if (plain)
					elementPanel.toggle();
				break;
			case 89:	// y
				if (plainShift)
					ttyPanel.toggle();
				break;
			}
			display.setCursor();
		}
	});
	document.addEventListener('wheel', function(e)
	{
		if (e.target.id === 'topSVG')
		{
			display.deactivateToolbar();
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
}
Display.prototype.setNavbarBackground()
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
	this.navbarElt.style.background = c;
}
Display.prototype.textWidth(txt)
{
	if (isGUI)
	{
		let svg = `<text text-anchor="middle" class="object" x="0" y="0" id="testTextWidthElt">${txt}</text>`;
		this.uiSVG.innerHTML = svg;
		const txtElt = document.getElementById('testTextWidthElt');
		const width = txtElt.parentNode.getBBox().width;
		this.uiSVG.innerHTML = '';
		return width;
	}
	return 10;
}
Display.prototype.status(e, msg)
{
	const s = this.statusbarElt;
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
		this.statusXY = {x:e.clientX, y:e.clientY};
	}
	else
		display.recordError(msg);
	document.getElementById('tty-out').innerHTML += msg + "\n";
}
Display.prototype.grid(x)
{
	const d = Cat.default.layoutGrid;
	switch (typeof x)
	{
	case 'number':
		return this.gridding ? d * Math.round(x / d) : x;
	case 'object':
		return {x:this.grid(x.x), y:this.grid(x.y)};
	}
}
Display.prototype.limit(s)
{
	return s.length > this.textDisplayLimit ? s.slice(0, this.textDisplayLimit) + '...' : s;
}
// TODO move to Display
Display.prototype.intro()
{
	let btns = '';
	for (const b in this.svg.Buttons)
		btns += display.getButton(b);
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
//						H.table(btns.map(row => H.tr(row.map(b => H.td(display.getButton(b))).join(''))).join(''), 'buttonBar center') +
					H.table(H.tr(H.td(btns)), 'buttonBar center') +
					H.span('', '', 'introPngs') + '<br/>' +
					H.table(H.tr(H.td(H.small('&copy;2018-2019 Harry Dole'), 'left') + H.td(H.small('harry@harrydole.com', 'italic'), 'right')), '', 'footbar')
				, 'txtCenter');
	return html;
}
Display.prototype.recordError(err)
{
	let txt = Cat.getError(err);
	console.log('Error: ', txt);
	if (isGUI)
	{
		if (typeof err === 'object' && 'stack' in err && err.stack != '')
			txt += H.br() + H.small('Stack Trace') + H.pre(err.stack);
		ttyPanel.errorElt.innerHTML += '<br/>' + txt;
		ttyPanel.open();
		ttyPanel.AccordionOpen('errorOutPnl');
	}
	else
		process.exit(1);
}
Display.protoytpe.getCat()
{
	return $Cat ? $Cat.getObject(this.category) : null;
}
Display.prototype.selectCategory(catName, fn)
{
	this.category = catName;
	this.setLocalStorageDefaultCategory();
	this.diagram = null;
	const nbCat = document.getElementById('navbar_category');
	const cat = $Cat.getObject(catName);
	nbCat.innerHTML = cat.properName;
	nbCat.title = Cat.cap(cat.description);
	Category.FetchReferenceDiagrams(cat, fn);
}
Display.prototype.selectCategoryDiagram(cat, fn)
{
	this.selectCategory(cat, function()
	{
		let name = Cat.getLocalStorageDiagramName(cat);
//				name = name === null ? diagram.Codename({category:cat.name, user:Cat.user.name, basename:'Draft'}) : name;
		let dgrm = Cat.getDiagram(name);
		if (dgrm && Diagram.ReadLocal(name) === null)
		{
			dgrm = new Diagram({basename:'Draft', codomain:cat, properName:'Draft', description:'Scratch diagram', user:Cat.user.name});
			dgrm.saveLocal();
		}
		this.selectDiagram(name);
		if (fn)
			fn();
		Panels.update();
		Cat.setLocalStorageDiagramName();
	});
}
Display.prototype.selectDiagram(name, update = true)
{
	display.deactivateToolbar();
	const cat = this.getCat();
	function setup(name)
	{
		Cat.selected.diagram = name;
		Cat.setLocalStorageDiagramName();
		if (update)
			this.updateDiagramDisplay(name);
	}
	if (Cat.hasDiagram(name))
		setup(name);
	else
		// TODO turn on/off busy cursor
		Diagram.FetchDiagram(name, setup);
}
Display.prototype.updateDiagramDisplay(name)
{
	if (!Cat.initialized)
		return;
	diagramPanel.update();
	objectPanel.update();
	morphismPanel.update();
	elementPanel.update();
	const dgrm = Cat.getDiagram();
	display.diagramSVG.innerHTML = dgrm.makeAllSVG();
	diagramPanel.setToolbar(dgrm);
	dgrm.update(null, null, true, false);
	dgrm.updateMorphisms();
}
Display.prototype.copyStyles(dest, src)
{
	for (var cd = 0; cd < dest.childNodes.length; cd++)
	{
		var dstChild = dest.childNodes[cd];
		if (this.svgContainers.indexOf(dstChild.tagName) != -1)
		{
			this.copyStyles(dstChild, src.childNodes[cd]);
			continue;
		}
		const srcChild = src.childNodes[cd];
		if ('data' in srcChild)
			continue;
		var srcStyle = window.getComputedStyle(srcChild);
		if (srcStyle == "undefined" || srcStyle == null)
			continue;
		let style = '';
		if (dstChild.tagName in this.svgStyles)
		{
			const styles = this.svgStyles[dstChild.tagName];
			for (let i = 0; i<styles.length; i++)
				style += `${this.svgStyles[dstChild.tagName][i]}:${srcStyle.getPropertyValue(styles[i])};`;
		}
		dstChild.setAttribute('style', style);
	}
}
Display.prototype.svg2canvas(svg, name, fn)
{
	const copy = svg.cloneNode(true);
	this.copyStyles(copy, svg);
	const canvas = document.createElement('canvas');
	const bbox = svg.getBBox();
	canvas.width = display.snapWidth;
	canvas.height = display.snapHeight;
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
}
//
// Display static methods
//
Diaplay.prototype.OnEnter(e, fn)
{
	if (e.key === 'Enter')
		fn(e);
}
Display.prototype.Width()
{
	return isGUI ? window.innerWidth : 1024;
}
Display.prototype.Height()
{
	return isGUI ? window.innerHeight : 768;
}
Display.prototype.SvgHeader(scale, bgColor = '#ffffff')
{
	const v = 0.32 * (typeof scale !== 'undefined' ? scale : 1.0);
	const html =
`<svg xmlns="http://www.w3.org/2000/svg" width="${v}in" height="${v}in" version="1.1" viewBox="0 0 320 320">
<rect x="0" y="0" width="320" height="320" style="fill:${bgColor}"/>`;
	return html;
}
Display.prototype.Button(onclick)
{
	return `<rect class="btn" x="0" y="0" width="320" height="320" onclick="${onclick}"/>`;
}
Display.prototype.MergeObjectsRefCnt(dgrm, dragObject, targetObject)
{
	dragObject.decrRefcnt();
	targetObject.incrRefcnt();
	targetObject.to.incrRefcnt();
}
Display.prototype.Input(val, id, ph, x='', cls='in100', type='text')
{
	return H.input(val, cls, id, type, {ph});
}
Display.prototype.MorphismTableRows(morphisms, action = null, drag = true)
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
				`${drag ? 'grabbable ' : ''}sidenavRow`, '', Cat.cap(m.description), drag ? `draggable="true" ondragstart="morphismPanel.drag(event, '${m.name}')" ${act}` : act);
	}
	return html;
}
Display.prototype.Barycenter(ary)
{
	let elts = {};
	for(let i=0; i < ary.length; ++i)
	{
		const elt = ary[i];
		if (DiagramObject.isPrototypeOf(elt) || DiagramElement.isPrototypeOf(elt))
			if (!(elt.name in elts))
				elts[elt.name] = elt;
		else if (DiagramMorphism.isPrototypeOf(elt))
		{
			if (!(elt.domain.name in elts))
				elts[elt.domain.name] = elt.domain;
			if (!(elt.codomain.name in elts))
				elts[elt.codomain.name] = elt.codomain;
		}
	}
	let xy = new D2;
	let cnt = 0;
	for(let i in elts)
	{
		++cnt;
		xy = D2.add(xy, elts[i]);
	}
	xy = D2.scale(1.0/cnt, xy);
	return xy;
},

//
// Panels
//
function Panels()
{
	this.panels = {};
}
Panels.prototype.closeAll(side)
{
	for (const [name, panel] of this.panels)
	{
		if (side === '')
			panel.close();
		else if (side === 'right')
		{
			if (panel.right)
				panel.close();
		}
		else if (!panel.right)
			panel.close();
	}
}
Panels.prototype.update()
{
	for (const [name, panel] of this.panels)
		panel.update();
}

panels = new Panels();

function Panel(name, right = false, width = Cat.default.panel.width)
{
	this.name = name;
	this.width = width;
	this.right = right;
	this.elt = document.getElementById(`${this.name}-sidenav`);
	this.expandBtnElt = document.getElementById(`${this.name}-expandBtn`);
	panels.panels[this.name] = this;;
}
Panel.prototype.collapse()
{
	this.elt.style.width = this.width + 'px';
	this.expandBtnElt.innerHTML = display.getButton(this.right ? 'chevronLeft' : 'chevronRight', `${this.name}.expand()`, 'Collapse');
}
Panel.prototype.expand()
{
	this.elt.style.width = 'auto';
	this.expandBtnElt.innerHTML = display.getButton(this.right ? 'chevronRight' : 'chevronLeft', `${this.name}.collapse()`, 'Expand');
}
Panel.prototype.open()
{
	this.elt.style.width = this.width + 'px';
}
Panel.prototype.close()
{
	this.elt.style.width = '0';
}
Panel.prototype.toggle()
{
	const width = this.elt.style.width;
	if (width === 'auto' || Number.parseInt(width, 10) > 0)
		this.close();
	else
		this.open();
}
//
// Panel static methods
//
Panel.prototype.AccordionToggle(btn, pnlId)
{
	btn.classList.toggle('active');
	const elt = document.getElementById(pnlId);
	elt.style.display = elt.style.display === 'block' ? 'none' : 'block';
}
Panel.prototype.AccordionOpen(pnlId)
{
	const elt = document.getElementById(pnlId);
	elt.style.display = 'block';
}
Panel.prototype.AccordionClose(pnlId)
{
	const elt = document.getElementById(pnlId);
	elt.style.display = 'none';
}
Panel.prototype.AccordionPanelDyn(header, action, panelId, title = '', buttonId = '')
{
	return H.button(header, 'sidenavAccordion', buttonId, title, `onclick="${action};Panel.AccordionToggle(this, \'${panelId}\')"`) +
			H.div('', 'accordionPnl', panelId);
}

//
// CategoryPanel is a Panel on the left
//
function CategoryPanel()
{
	Panel.call(this, 'category');
	this.elt.innerHTML =
		H.table(H.tr(display.closeBtnCell('category', false)), 'buttonBarRight') +
		H.h3('Categories') + H.div('', '', 'categoryTbl') +
		H.button('New Category', 'sidenavAccordion', '', 'New Category', `onclick="Panel.AccordionToggle(this, \'categoryPanel.create()\')"`) +
		H.div(H.table(
			H.tr(H.td(Display.Input('', 'categoryName', 'Name')), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'categoryProperName', 'HTML Entities')), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'categoryDescription', 'Description')), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'isMonoidal', '', '', 'in100', 'checkbox') + '<label for="isMonoidal">Monoidal?</label>', 'left'), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'isBraided', '', '', 'in100', 'checkbox') + '<label for="isBraided">Braided?</label>', 'left'), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'isClosed', '', '', 'in100', 'checkbox') + '<label for="isClosed">Closed?</label>', 'left'), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'isSymmetric', '', '', 'in100', 'checkbox') + '<label for="isSymmetric">Symmetric?</label>', 'left'), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'isCompact', '', '', 'in100', 'checkbox') + '<label for="isCompact">Compact?</label>', 'left'), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'isCartesian', '', '', 'in100', 'checkbox') + '<label for="isCartesian">Cartesian?</label>', 'left'), 'sidenavRow') +
			H.tr(H.td(Display.Input('', 'allObjectsFinite', '', '', 'in100', 'checkbox') + '<label for="allObjectsFinite">Finite objects?</label>', 'left'), 'sidenavRow'),
				'sidenav') +
		H.span(display.getButton('edit', 'CategoryPanel.Create()', 'Create new category')) + H.br() +
		H.span('', 'error', 'categoryError'), 'accordionPnl', 'newCategoryPnl');
	this.tableElt = document.getElementById('categoryTbl');
	this.errorElt = document.getElementById('categoryError');
	this.basenameElt = document.getElementById('categoryBasename');
	this.properNameElt = document.getElementById('categoryProperName');
	this.descriptionElt = document.getElementById('categoryDescription');
}
CategoryPanel.prototype.update()
{
	this.categoryTbl.innerHTML = H.table(cats.map(c => H.tr(H.td(`<a onclick="Cat.selected.selectCategoryDiagram('${c.name}')">${c.properName}</a>`), 'sidenavRow')).join(''));
}
CategoryPanel.prototype.create()
{
	try
	{
		this.errorElt.innerHTML = '';
		const basename = this.basenameElt.value;
		if (basename === '')
			throw 'Category name must be specified.';
		if (!RegExp(Cat.nameEx).test(basename))
			throw 'Invalid category name.';
		new Category($Cat, {basename, properName:this.properNameElt.value, description:this.descriptionElt.value});
	}
	catch(err)
	{
		this.errorElt.innerHTML = 'Error: ' + Cat.getError(err);
	}
}
const categoryPanel = new CategoryPanel();

//
// ThreeDPanel is a Panel on the right
//
function ThreeDPanel()
{
	Panel.call(this, 'threeD', true);
	this.mouse =	typeof THREE === 'object' ? new THREE.Vector2() : null,
	this.camera =	null,
	this.scene =	null,
	this.raycaster =	null,
	this.renderer =	null,
	this.threeDiv =	null,
	this.controls =	null,
	this.bbox =		null,
	this.axesHelperSize =	1000,
	this.max =		10000,
	this.horizon =	100000,
	this.elt.innerHTML = H.table(H.tr(display.closeBtnCell('threeD', false) +
							display.expandPanelBtn('threeD', true) +
						H.td(display.getButton('delete', 'threeD.initialize()', 'Clear display'), 'buttonBar') +
						H.td(display.getButton('threeD_left', `display.threeD.view('left')`, 'Left'), 'buttonBar') +
						H.td(display.getButton('threeD_top', `display.threeD.view('top')`, 'Top'), 'buttonBar') +
						H.td(display.getButton('threeD_back', `display.threeD.view('back')`, 'Back'), 'buttonBar') +
						H.td(display.getButton('threeD_right', `display.threeD.view('right')`, 'Right'), 'buttonBar') +
						H.td(display.getButton('threeD_bottom', `display.threeD.view('bottom')`, 'Bottom'), 'buttonBar') +
						H.td(display.getButton('threeD_front', `display.threeD.view('front')`, 'Front'), 'buttonBar')
						), 'buttonBarLeft') +
					H.div('', '', 'threeDiv');
	this.threeDiv = document.getElementById('threeDiv');
	this.initialize();
	this.animate();
}
ThreeDPanel.prototype.initialize()
{
	try
	{
		display.threeD.bbox =
		{
			min:{x:Number.POSITIVE_INFINITY, y:Number.POSITIVE_INFINITY, z:Number.POSITIVE_INFINITY},
			max:{x:Number.NEGATIVE_INFINITY, y:Number.NEGATIVE_INFINITY, z:Number.NEGATIVE_INFINITY}
		};
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
		display.recordError(e);
	}
}
ThreeDPanel.prototype.animate()
{
	this.resizeCanvas();
	requestAnimationFrame(this.animate);
	this.renderer.setViewport(0, 0, this.threeDiv.clientWidth, this.threeDiv.clientHeight);
	this.renderer.render(this.scene, this.camera);
}
ThreeDPanel.prototype.constrain(w)
{
	return w < - this.max ? -this.max : (w > this.max ? this.max : w);
}
ThreeDPanel.prototype.view(dir)
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
}
ThreeDPanel.prototype.expand()
{
	this.elt.style.width = '100%';
	this.expandBtnElt.innerHTML = display.getButton('chevronRight', `threeDPanel.collapse(true)`, 'Expand');
	this.resizeCanvas();
}
ThreeDPanel.prototype.resizeCanvas()
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
}
const threeDPanel = new ThreeDPanel();

//
// TtyPanel is a Panel on the right
//
function TtyPanel()
{
	Panel.call(this, 'tty', true);
	this.elt.innerHTML =
		H.table(H.tr(display.closeBtnCell('tty', false) + display.expandPanelBtn('tty', true)), 'buttonBarLeft') +
		H.h3('TTY') +
		H.button('Output', 'sidenavAccordion', '', 'TTY output from some composite', `onclick="Panel.AccordionToggle(this, \'ttyOutPnl\')"`) +
		H.div(
			H.table(H.tr(
				H.td(display.getButton('delete', `tty.ttyOut.innerHTML = ''`, 'Clear output'), 'buttonBar') +
				H.td(display.downloadButton('LOG', `Cat.downloadString(tty.out.innerHTML, 'text', 'console.log')`, 'Download tty log file'), 'buttonBar')), 'buttonBarLeft') +
			H.pre('', 'tty', 'tty-out'), 'accordionPnl', 'ttyOutPnl') +
		H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="Panel.AccordionToggle(this, \'errorOutPnl\')"`) +
		H.div(H.table(H.tr(
				H.td(display.getButton('delete', `tty.out.innerHTML = ''`, 'Clear errors')) +
				H.td(display.downloadButton('ERR', `Cat.downloadString(tty.error.innerHTML, 'text', 'console.err')`, 'Download error log file'), 'buttonBar')), 'buttonBarLeft') +
			H.span('', 'tty', 'tty-error-out'), 'accordionPnl', 'errorOutPnl');
	this.out = document.getElementById('tty-out');
	this.errorElt = document.getElementById('tty-error-out');
}
const ttyPanel = new TtyPanel();

//
// DataPanel is a Panel on the right
//
function DataPanel()
{
	Panel.call(this, 'data', true);
	this.elt.innerHTML =
		H.table(
			H.tr(	display.closeBtnCell('data', false) +
					display.expandPanelBtn('data', true) +
					H.td(display.getButton('delete', `Cat.getDiagram().gui(evt, this, 'clearDataMorphism')`, 'Clear all data'))), 'buttonBarLeft') +
		H.div('', '', 'data-view');
	this.dataView = document.getElementById('data-view');
}
DataPanel.prototype.update()
{
	this.dataView.innerHTML = '';
	let dgrm = Cat.getDiagram();
	if (dgrm !== null)
	{
		if (dgrm.selected.length === 1 && DiagramMorphism.isPrototypeOf(dgrm.getSelected()))
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
					html += H.button('Add Data', 'sidenavAccordion', '', 'Add entries to this map', `onclick="Panel.AccordionToggle(this, \'dataInputPnl\')"`);
					const irx = 'regexp' in to.domain ? `pattern="${to.regexp}"`: '';
					const inputForm = Display.Input('', 'inputTerm', to.domain.properName, irx);
					const outputForm = to.codomain.toHTML();
					tbl =	H.tr(H.td('Domain')) +
							H.tr(H.td(inputForm)) +
							H.tr(H.td('Codomain')) +
							H.tr(H.td(outputForm));
					html += H.div(H.table(tbl) + display.getButton('edit', `dataPanel.handler(evt, '${from.name}')`, 'Edit data'), 'accordionPnl', 'dataInputPnl');
					html += H.div('', 'error', 'editError');
				}
				html += H.button('Current Data', 'sidenavAccordion', 'dataPnlBtn', 'Current data in this morphism', `onclick="Panel.AccordionToggle(this, \'dataPnl\')"`) +
						H.small('To determine the value of an index, first the data values are consulted then the data ranges.');
				tbl = H.tr(H.th(to.domain.properName) + H.th(to.codomain.properName));
				//
				// display all our data
				//
				for(let i in to.data)
				{
					let d = to.data[i];
					if (d === null)
						continue;
					tbl += H.tr(H.td(i) + H.td(d));
				}
				html += H.div(H.h5('Values') + H.table(tbl));
				this.dataView.innerHTML = html;
			}
		}
		const dpb = document.getElementById('dataPnlBtn');
		if (dpb !== null)
			Panel.AccordionToggle(dpb, 'dataPnl');
	}
}
DataPanel.prototype.handler(e, nm)
{
	try
	{
		const dgrm = Cat.getDiagram();
		const m = dgrm.domain.getMorphism(nm).to;
		m.addData(e);
		this.update();
		dgrm.saveLocal();
	}
	catch(err)
	{
		document.getElementById('editError').innerHTML = 'Error: ' + Cat.getError(err);
	}
}
const dataPanel = new DataPanel();

//
// DiagramPanel is a Panel on the left
//
function DiagramPanel()
{
	Panel.call(this, 'diagram');
	this.elt.innerHTML =
		H.div('', '', 'diagramInfoDiv') +
		H.div('', '', 'diagramPanelToolbar') +
		H.h3(H.span('Diagram')) +
		H.h4(H.span('', '', 'diagram-properName') + H.span('', '', 'diagram-properName-edit')) +
		H.p(H.span('', 'description', 'diagram-description', 'Description') + H.span('', '', 'diagram-description-edit')) +
		H.table(H.tr(H.td(H.p(''), 'diagram-user') + H.td(H.p(), 'diagram-timestamp'))) +
		H.button('References', 'sidenavAccordion', '', 'Diagrams referenced by this diagram', 'onclick="Panel.AccordionToggle(this, \'referenceDiagrams\')"') +
		H.div(H.div('', 'accordionPnl', 'referenceDiagrams')) +
		H.button('New', 'sidenavAccordion', '', 'New Diagram', `onclick="Panel.AccordionToggle(this, \'newDiagramPnl\')"`) +
		H.div(
			H.small('The chosen name must have no spaces and must be unique among the diagrams you have in this category.') +
			H.table(
				H.tr(H.td(Display.Input('', 'diagram-basename-new', 'Basename')), 'sidenavRow') +
				H.tr(H.td(Display.Input('', 'diagram-properName-new', 'Proper Name')), 'sidenavRow') +
				H.tr(H.td(Display.Input('', 'diagram-description-new', 'Description')), 'sidenavRow'), 'sidenav') +
			H.span(display.getButton('edit', 'diagramPanel.create()', 'Create new diagram')) +
			H.span('', 'error', 'diagram-error'), 'accordionPnl', 'newDiagramPnl');
		H.button(`${Cat.user.name}`, 'sidenavAccordion', '', 'User diagrams', 'onclick="Panel.AccordionToggle(this, \'userDiagramDisplay\')"') +
		H.div(	H.small('User diagrams') +
				H.div('', '', 'userDiagrams'), 'accordionPnl', 'userDiagramDisplay') +
		H.button('Recent', 'sidenavAccordion', '', 'Recent diagrams from Catecon', 'onclick="Panel.AccordionToggle(this, \'recentDiagrams\');DiagramPanel.FetchRecentDiagrams()"') +
		H.div(H.div('', 'accordionPnl', 'recentDiagrams')) +
		H.button('Catalog', 'sidenavAccordion', '', 'Catalog of available diagrams', 'onclick="Panel.AccordionToggle(this, \'catalogDiagrams\');Display.FetchCatalogDiagramTable()"') +
		H.div(H.div('', 'accordionPnl', 'catalogDiagrams'));
	this.baseameElt = document.getElementById('diagram-baseame');
	this.properNameElt = document.getElementById('diagram-properName');
	this.properNameEditElt = document.getElementById('diagram-properName-edit');
	this.descriptionElt = document.getElementById('diagram-description');
	this.descriptionEditElt = document.getElementById('diagram-description-edit');
	this.userElt = document.getElementById('diagram-user');
	this.timestampElt = document.getElementById('diagram-timestamp');
	this.errorElt = document.getElementById('diagram-error');
	this.navbar = document.getElementById('diagram-navbar');
	this.diagramPanelToolbarElt = document.getElementById('diagramPanelToolbar');
	this.referenceDiagramsElt = document.getElementById('referenceDiagrams');
}
DiagramPanel.prototype.update()
{
	const dgrm = Cat.getDiagram();
	if (dgrm !== null)
	{
		const dt = new Date(dgrm.timestamp);
		this.navbar.innerHTML = `${dgrm.properName} ${H.span('by '+dgrm.user, 'italic')}`;
		this.navbar.title = Cat.cap(dgrm.description);
		this.properNameElt.innerHTML = dgrm.properName;
		this.descriptionElt.innerHTML = dgrm.description;
		this.userElt.innerHTML = dgrm.user;
		this.properNameEditElt.innerHTML = dgrm.readonly ? '' :
			display.getButton('edit', `Cat.getDiagram().editElementText('dgrmHtmlElt', 'html')`, 'Retitle', Cat.default.button.tiny);
		this.descriptionEditElt.innerHTML = dgrm.readonly ? '' :
			display.getButton('edit', `Cat.getDiagram().editElementText('dgrmDescElt', 'description')`, 'Edit description', Cat.default.button.tiny);
		diagramPanel.setUserDiagramTable();
		display.diagram.setReferencesDiagramTable();
		diagramPanel.setToolbar(dgrm);
	}
}
DiagramPanel.prototype.create()
{
	try
	{
		this.errorElt.innerHTML = '';
		const basename = this.basenameElt.value;
		let codomain = display.getCat().name;
		const fullname = diagram.nameCheck(codomain, Cat.user.name, basename);
		// TODO make it <> safe
		const dgrm = new Diagram({basename, codomain, properName:this.properNameElt.value, description:this.descriptionElt.value, user:Cat.user.name});
		dgrm.saveLocal();
		//
		// select the new diagram
		//
		Cat.selected.selectDiagram(dgrm.name);
		Panel.AccordionClose('newDiagramPnl');
		this.close();
		diagramPanel.setUserDiagramTable();
		this.setReferencesDiagramTable();
		this.update();
	}
	catch(e)
	{
		this.errorElt.innerHTML = 'Error: ' + Cat.getError(e);
	}
}
DiagramPanel.prototype.setReferencesDiagramTable()
{
	const dgrm = Cat.getDiagram();
	if (dgrm === null)
		return;
	const refcnts = dgrm.getReferenceCounts();
	let html = H.small('References for this diagram') + dgrm.references.map(d =>
	{
		const del = refcnts[d.name] === 1 ? H.td(display.getButton('delete', `Cat.getDiagram().removeReferenceDiagram(evt,'${d.name}')`, 'Remove reference'), 'buttonBar') : '';
		return DiagramPanel.DiagramRow(DiagramPanel.GetDiagramInfo(d), del);
	}).join('');
	this.referenceDiagramsElt.innerHTML = H.table(html);
}
DiagramPanel.prototype.setToolbar(dgrm)
{
	const nonAnon = Cat.user.name !== 'Anon';
	const isUsers = dgrm && (Cat.user.name === dgrm.user);
	const html = H.table(H.tr(
				(isUsers ? H.td(DiagramPanel.getEraseBtn(dgrm), 'buttonBar', 'eraseBtn') : '') +
				(isUsers ? H.td(diagramPanel.getLockBtn(dgrm), 'buttonBar', 'lockBtn') : '') +
				(nonAnon && isUsers ? H.td(display.getButton('upload', 'Cat.getDiagram().upload(evt)', 'Upload', Cat.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '') +
				(nonAnon ? H.td(display.downloadButton('JSON', 'Cat.getDiagram().downloadJSON(evt)', 'Download JSON'), 'buttonBar') : '' ) +
				(nonAnon ? H.td(display.downloadButton('JS', 'Cat.getDiagram().downloadJS(evt)', 'Download Ecmascript'), 'buttonBar') : '' ) +
				(nonAnon ? H.td(display.downloadButton('PNG', 'Cat.getDiagram().downloadPNG(evt)', 'Download PNG'), 'buttonBar') : '' ) +
				display.expandPanelBtn('diagram', false) +
				display.closeBtnCell('diagram', true)), 'buttonBarRight');
	this.diagramPanelToolbarElt.innerHTML = html;
}
DiagramPanel.prototype.setUserDiagramTable()
{
	const dgrm = Cat.getDiagram();
	if (dgrm === null)
		return;
	const dgrms = {};
	for (const d in Cat.localDiagrams)
	{
		const dgrm = Cat.localDiagrams[d];
		if (dgrm.user === Cat.user.name)
			dgrms[d] = true;
	}
	Object.keys(Cat.serverDiagrams).map(d => dgrms[d] = dgrm.user === Cat.user.name);
	let html = Object.keys(dgrms).map(d =>
	{
		const refBtn = !(dgrm.name == d || dgrm.hasReference(d)) ? H.td(this.getButton('reference', `Cat.getDiagram().addReferenceDiagram(evt, '${d}')`, 'Add reference diagram'), 'buttonBar') : '';
		return DiagramPanel.DiagramRow(DiagramPanel.GetDiagramInfo(d), refBtn);
	}).join('');
	document.getElementById('userDiagrams').innerHTML = H.table(html);
}
//
// DiagramPanel static methods
//
// TODO move to Cat
//
DiagramPanel.prototype.GetDiagramInfo(dgrm)
{
	if (Diagram.isPrototypeOf(dgrm))
	{
		const info =
		{
			basename:		dgrm.basename,
			category:		dgrm.codomain.basename,
			user:			dgrm.user,
			properName:		dgrm.properName,
			description:	dgrm.description,
			timestamp:		dgrm.timestamp,
		};
		return info;
	}
	else
	{
		const serverInfo = dgrm in Cat.serverDiagrams ? Cat.serverDiagrams[dgrm] : false;
		const localInfo = dgrm in Cat.localDiagrams ? Cat.localDiagrams[dgrm] : false;
		const serverTime = serverInfo ? serverInfo.timestamp : 0;
		const localTime = localInfo ? localInfo.timestamp : 0;
//		const info = Elememt.NameTokens(dgrm);
		info.timestamp = localInfo ? localInfo.timestamp : (serverInfo ? serverInfo.timestamp : ''),
		return info;
	}
}
DiagramPanel.prototype.DiagramRow(dgrm, tb = null)
{
	const dt = new Date(dgrm.timestamp);
	const url = Cat.Amazon.URL(dgrm.codomain.basename, dgrm.user, dgrm.basename + '.png');
	const tbTbl =
		H.table(
			H.tr( (tb ? tb : '') +
				(Cat.user.name !== 'Anon' ? H.td(display.downloadButton('JSON', `Cat.getDiagram('${dgrm.name}').downloadJSON(evt)`, 'Download JSON'), 'buttonBar', '', 'Download diagram JSON') : '' ) +
				(Cat.user.name !== 'Anon' ? H.td(display.downloadButton('JS', `Cat.getDiagram('${dgrm.name}').downloadJS(evt)`, 'Download Ecmascript'), 'buttonBar', '', 'Download diagram ecmascript') : '' ) +
				(Cat.user.name !== 'Anon' ? H.td(display.downloadButton('PNG', `Cat.getDiagram('${dgrm.name}').downloadPNG(evt)`, 'Download PNG'), 'buttonBar', '', 'Download diagram PNG') : '' )),
			'buttonBarLeft');
	const tbl =
		H.table(
			H.tr(H.td(H.h5(dgrm.properName), '', '', '', 'colspan="2"')) +
			H.tr(H.td(`<img src="${url}" id="img_${dgrm.name}" width="200" height="150"/>`, 'white', '', '', 'colspan="2"')) +
			H.tr(H.td(dgrm.description, 'description', '', '', 'colspan="2"')) +
			H.tr(H.td(dgrm.user, 'author') + H.td(dt.toLocaleString(), 'date')));
	return H.tr(H.td(tbTbl)) + H.tr(H.td(`<a onclick="Cat.selected.selectDiagram('${dgrm.name}')">` + tbl + '</a>'), 'sidenavRow');
}
DiagramPanel.prototype.FetchCatalogDiagramTable()
{
	if (!('catalogDiagrams' in Cat))
		fetch(Cat.Amazon.URL() + '/catalog.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					Cat.catalogDiagrams = data.diagrams;
					let html = data.diagrams.map(d => DiagramPanel.DiagramRow(d)).join('');
					const dt = new Date(data.timestamp);
					document.getElementById('catalogDiagrams').innerHTML = H.span(`Last updated ${dt.toLocaleString()}`, 'smallPrint') + H.table(html);
				});
		});
}
DiagramPanel.prototype.GetLockBtn(dgrm)
{
	const lockable = dgrm.readonly ? 'unlock' : 'lock';
	return this.getButton(lockable, `Cat.getDiagram().${lockable}(evt)`, Cat.cap(lockable));
}
DiagramPanel.prototype.getEraseBtn(dgrm)
{
	return dgrm.readonly ? '' : this.getButton('delete', "Cat.getDiagram().clear(evt)", 'Erase diagram!', Cat.default.button.small, false, 'eraseBtn');
}
DiagramPanel.prototype.updateLockBtn(dgrm)
{
	if (dgrm && Cat.user.name === dgrm.user)
	{
		document.getElementById('lockBtn').innerHTML = diagramPanel.getLockBtn(dgrm);
		const eb = document.getElementById('eraseBtn');
		if (eb)
			eb.innerHTML = DiagramPanel.getEraseBtn(dgrm);
	}
}
DiagramPanel.prototype.setupDiagramElementPnl(dgrm, pnl, updateFnName)
{
	const pnlName = dgrm.name + pnl;
//	return Panel.AccordionPanelDyn(dgrm.properName, `Cat.getDiagram('${this.properName}').${updateFnName}('${pnlName}')`, pnlName);
	return Panel.AccordionPanelDyn(dgrm.properName, `${updateFnName}(Cat.getDiagram('${dgrm.name}'))`, pnlName);
}
//
// DiagramPanel static methods
//
DiagramPanel.prototype.FetchRecentDiagrams()
{
	if ('recentDiagrams' in Cat)
		return;
	fetch(Cat.Amazon.URL() + '/recent.json').then(function(response)
	{
		if (response.ok)
			response.json().then(function(data)
			{
				Cat.recentDiagrams = data.diagrams;
				let html = data.diagrams.map(d => DiagramPanel.DiagramRow(d)).join('');
				const dt = new Date(data.timestamp);
				const recentDiagrams = document.getElementById('recentDiagrams');
				if (recentDiagrams)
					recentDiagrams.innerHTML = H.span(`Last updated ${dt.toLocaleString()}`, 'smallPrint') + H.table(html);
				const introPngs = document.getElementById('introPngs');
				if (introPngs)
					introPngs.innerHTML = data.diagrams.map(d =>
					{
						const tokens = d.name.split('@');
						return `<img class="intro" src="${Cat.Amazon.URL(tokens[1], d.user, d.name)}.png" width="300" height="225" title="${d.properName} by ${d.user}: ${d.description}"/>`;
					}).join('');
			});
	});
}
const diagramPanel = new DiagramPanel();

//
// HelpPanel is a Panel on the right
//
function HelpPanel()
{
	Panel.call(this, 'help', right)
	this.elt.innerHTML =
		H.table(H.tr(display.closeBtnCell('help', false) + display.expandPanelBtn('help', true)), 'buttonBarLeft') +
		H.h3('Catecon') +
		H.h4('The Categorical Console')	+
		H.h5('Extreme Alpha Version') +
		H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Interactive actions', `onclick="Panel.AccordionToggle(this, \'catActionHelpPnl\')"`) +
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
		H.button('Category Theory', 'sidenavAccordion', 'catHelpPnlBtn', 'References to Category Theory', `onclick="Panel.AccordionToggle(this, \'catHelpPnl\')"`) +
		H.div(H.p(H.a('Categories For The Working Mathematician', '', '', '', 'href="https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician" target="_blank"')), 'accordionPnl', 'catHelpPnl') +
		H.button('References', 'sidenavAccordion', 'referencesPnlBtn', '', `onclick="Panel.AccordionToggle(this, \'referencesPnl\')"`) +
		H.div(	H.p(H.a('Intro To Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/09/16/cat-prog/"')) +
				H.p(H.a('V Is For Vortex - More Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"')), 'accordionPnl', 'referencesPnl') +
		H.button('The Math License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="Panel.AccordionToggle(this, \'licensePnl\')"`) +
		H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
				H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
				H.p('Inelegant or unreferenced diagrams are removed.'), 'accordionPnl', 'licensePnl') +
		H.button('Credits', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Panel.AccordionToggle(this, \'creditsPnl\')"`) +
		H.div(	H.a('Saunders Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
				H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'accordionPnl', 'creditsPnl') +
		H.button('Third Party Software', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Panel.AccordionToggle(this, \'thirdPartySoftwarePnl\')"`) +
		H.div(
					H.a('3D', '', '', '', 'href="https://threejs.org/"') +
					H.a('Compressors', '', '', '', 'href="https://github.com/imaya/zlib.js"') +
					H.a('Crypto', '', '', '', 'href="http://bitwiseshiftleft.github.io/sjcl/"') +
			, 'accordionPnl', 'thirdPartySoftwarePnl') +
		H.hr() +
		H.small('&copy;2018-2019 Harry Dole') + H.br() +
		H.small('harry@harrydole.com', 'italic');
}
const helpPanel = new HelpPanel();

//
// LoginPanel is a panel of the right
//
function LoginPanel()
{
	Panel.call(this. 'login', true);
	this.elt.innerHTML =
		H.table(H.tr(display.closeBtnCell('login', false)), 'buttonBarLeft') +
		H.h3('User Information') +
		H.table(
			H.tr(H.td('User:') + H.td(H.span('', 'smallBold', 'login-user-name'))) +
			H.tr(H.td('Email:') + H.td(H.span('', 'smallBold', 'login-user-email')))) +
		H.div('', '', 'login-info');
	this.loginInfoElt = document.getElementById('login-info');
	this.passwordResetFormElt = document.getElementById('login-password-reset');
	this.userNameElt = document.getElementById('login-user-name');
	this.userEmailElt = document.getElementById('login-user-email');
}
LoginPanel.update()
{
	this.userNameElt.innerHTML = Cat.user.name;
	this.userEmailElt.innerHTML = Cat.user.email;
	this.loginInfoElt.innerHTML = '';
	let html = '';
	if (Cat.user.status !== 'logged-in' && Cat.user.status !== 'registered')
		html += H.table(	H.tr(H.td('User name')) +
							H.tr(H.td(H.input('', '', 'loginUserName', 'text', {ph:'Name'}))) +
							H.tr(H.td('Password')) +
							H.tr(H.td(H.input('', '', 'loginPassword', 'password', {ph:'********', x:'onkeydown="Display.OnEnter(event, Cat.Amazon.login)"'}))) +
							H.tr(H.td(H.button('Login', '', '', '', 'onclick=Cat.Amazon.login()'))));
	if (Cat.user.status === 'unauthorized')
		html += H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="Panel.AccordionToggle(this, \'signupPnl\')"`) +
				H.div( H.table(H.tr(H.td('User name')) +
							H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
							H.tr(H.td('Email')) +
							H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
							LoginPanel.PasswordForm() +
							H.tr(H.td(H.button('Sign up', '', '', '', 'onclick=Cat.Amazon.signup()')))), 'accordionPnl', 'signupPnl');
	if (Cat.user.status === 'registered')
		html += H.h3('Confirmation Code') +
				H.span('The confirmation code is sent by email to the specified address above.') +
				H.table(	H.tr(H.td('Confirmation code')) +
							H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code', x:'onkeydown="Display.OnEnter(event, Cat.Amazon.confirm)"'}))) +
							H.tr(H.td(H.button('Submit Confirmation Code', '', '', '', 'onclick=Cat.Amazon.confirm()'))));
	this.loginInfoElt.innerHTML = html;
}
// TODO not used
LoginPanel.prototype.showResetForm()
{
	this.passwordResetFormElt.innerHTML =
		H.table(
			LoginPanel.PasswordForm('reset') +
			H.tr(H.td(H.button('Reset password', '', '', '', 'onclick=Cat.Amazon.resetPassword()'))));
}
//
// LoginPanel static methods
//
LoginPanel.prototype.PasswordForm(sfx = '')
{
	return H.tr(H.td('Secret Key for Access')) +
			H.tr(H.td(H.input('', '', `${sfx}SignupSecret`, 'text', {ph:'????????'}))) +
			H.tr(H.td('Password')) +
			H.tr(H.td(H.input('', '', `${sfx}SignupUserPassword`, 'password', {ph:'Password'}))) +
			H.tr(H.td('Confirm password')) +
			H.tr(H.td(H.input('', '', `${sfx}SignupUserPasswordConfirm`, 'password', {ph:'Confirm'})));
}
const loginPanal = new LoginPanel();

//
// MorphismPanel is a panel on the left
//
function MorphismPanel()
{
	Panel.call(this, 'morphism');
	this.elt.innerHTML =
		H.table(H.tr(display.expandPanelBtn('morphism', false) + display.closeBtnCell('morphism', true)), 'buttonBarRight') +
		H.h3('Morphisms') +
		H.div('', '', 'morphisms-pnl');
		H.h4('References') +
		H.div('', '', 'references-morphisms-pnl');
	this.morphismPnlElt = document.getElementById('morphisms-pnl');
	this.referencesPnlElt = document.getElementById('references-morphisms-pnl');
}
MorphismPanel.prototype.update()
{
	const dgrm = Cat.getDiagram();
	this.morphismPnlElt.innerHTML = '';
	this.referencesPnlElt.innerHTML = '';
	if (dgrm)
	{
		this.morphismPnlElt.innerHTML = DiagramPanel.setupDiagramElementPnl(dgrm, '_MorPnl', 'MorphismPanel.updateRows') +
		this.referencesPnlElt.innerHTML = DiagramPanel.references.map(r => DiagramPanel.setupDiagramElementPnl(r, '_MorPnl', 'MorphismPanel.updateRows')).join('');
	}
}
//
// MorphismPanel static methods
//
MorphismPanel.prototype.drag(e, morphismName)
{
	display.deactivateToolbar();
	e.dataTransfer.setData('text/plain', 'morphism ' + morphismName);
}
MorphismPanel.prototype.updateRows(dgrm)
{
	let html = '';
	const found = {};
	const morphisms = [];
	for (const [k, m] of dgrm.morphisms)
	{
		if (m.name in found)
			continue;
		found[m.name] = true;
		html += H.tr(	(display.showRefcnts ? H.td(m.refcnt) : '') +
						H.td(m.refcnt <= 0 && !dgrm.readonly ?
							display.getButton('delete', `Cat.getDiagram('${dgrm.name}').removeMorphism(evt, '${k.name}')`, 'Delete morphism') : '', 'buttonBar') +
						H.td(m.properName) +
						H.td(m.domain.properName) +
						H.td('&rarr;') +
						H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="MorphismPanel.drag(event, '${m.name}')"`);
	}
	for (const [k, m] of dgrm.codomain.morphisms)
	{
		if (m.name in found)
			continue;
		found[m.name] = true;
		html += H.tr(	(display.showRefcnts ? H.td(m.refcnt) : '') +
						H.td(m.refcnt <= 0 && !dgrm.readonly ?
							display.getButton('delete', `Cat.getDiagram('${dgrm.name}').removeCodomainMorphism(evt, '${m.name}');`, 'Delete dangling codomain morphism') :
								'', 'buttonBar') +
						H.td(m.properName) +
						H.td(m.domain.properName) +
						H.td('&rarr;') +
						H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="morphismPanel.drag(event, '${m.name}')"`);
	}
	document.getElementById(`${dgrm.name}_MorPnl`).innerHTML = H.table(html);
}
morphismPanel = new MorphismPanel();

//
// ObjectPanel is a panel on the left
//
function ObjectPanel()
{
	Panel.call(this, 'objects');
	this.elt.innerHTML =
		H.table(H.tr(display.expandPanelBtn('object', false) + display.closeBtnCell('object', true)), 'buttonBarRight') +
		H.h3('Objects') +
		H.div('', '', 'object-new-pnl') +
		H.div('', '', 'objects-pnl') +
		H.h4('References') +
		H.div('', '', 'references-objects-pnl');
	this.objectNewPnlElt = document.getElementById('ojbect-new-pnl');
	this.objectsPnlElt = document.getElementById('objects-pnl');
	this.referencesPnlElt = document.getElementById('references-objects-pnl');
}
ObjectPanel.prototype.update()
{
	const dgrm = Cat.getDiagram();
	this.objectNewPnl.innerHTML = '';
	this.objectsPnl.innerHTML = '';
	this.referencesPnlElt.innerHTML = '';
	if (dgrm)
	{
		if (!dgrm.readonly)
		{
			this.objectNewPnlElt.innerHTML =
				H.h4('New Object') +
				H.div(
					H.table(
						H.tr(H.td(H.small('The following tokens may be used to form an object depending on your category: One, Omega, N, Z, F, ...'), 'left'), 'sidenavRow') +
						H.tr(H.td(H.small('Usual operators are *, +, []'), 'left'), 'sidenavRow') +
						H.tr(H.td(H.small('Example: <span class="code">[N,N*N]</span> as the hom set from N to the product N*N'), 'left'), 'sidenavRow') +
						H.tr(H.td(Display.Input('', 'objectCode', 'Code')), 'sidenavRow') +
						H.tr(H.td(Display.Input('', 'objectDescription', 'Description')), 'sidenavRow')
					) +
					H.span(display.getButton('edit', 'objectPanel.create(evt)', 'Create new object for this diagram')) +
					H.span('', 'error', 'objectError'));
		}
		this.objectsPnlElt.innerHTML = DiagramPanel.setupDiagramElementPnl(dgrm, '_ObjPnl', 'ObjectPanel.updateRows') +
		this.referencesPnlElt.innerHTML = dgrm.references.map(r => DiagramPanel.setupDiagramElementPnl(r, '_ObjPnl', 'ObjectPanel.updateRows')).join('');
		dgrm.updateObjectTableRows();
	}
}
ObjectPanel.prototype.drag(e, name)
{
	display.deactivateToolbar();
	e.dataTransfer.setData('text/plain', 'object ' + name);
}
ObjectPanel.updateRows(dgrm)
{
	let found = {};
	let objects = [];
	for (const [k, object] of dgrm.codomain.objects)
		if (!(object.name in found))
		{
			objects.push(object);
			found[object.name] = true;
		}
	document.getElementById(`${dgrm.name}_ObjPnl`).innerHTML = H.table(objects.map(o => H.tr(
		(display.showRefcnts ? H.td(o.refcnt) : '') +
			H.td(o.refcnt === 0 && !dgrm.readonly ?
				display.getButton('delete', `Cat.getDiagram('${dgrm.name}').removeCodomainObject(evt, '${o.name}')`, 'Delete object') : '', 'buttonBar') +
			H.td(o.properName),
			'grabbable sidenavRow', '', Cat.cap(o.description), `draggable="true" ondragstart="objectPanel.drag(event, '${o.name}')"`)).join(''));
}
const objectPanel = new ObjectPanel();

//
// SettingsPanel is a panel on the right
//
function SettingsPanel()
{
	Panel.call(this, 'settings', true);
	this.elt.innerHTML =
		H.table(H.tr(display.closeBtnCell('settings', false)), 'buttonBarLeft') +
		H.h3('Settings') +
		H.table(
			H.tr(H.td(`<input type="checkbox" ${display.gridding ? 'checked' : ''} onchange="display.gridding = !display.gridding">`) + H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
			H.tr(	H.td(`<input type="checkbox" ${display.showRefcnts ? 'checked' : ''} onchange="SettingsPanel.ToggleShowRefcnts()">`) +
					H.td('Show reference counts for objects and morphisms in their respective panels.', 'left'), 'sidenavRow') +
			H.tr(	H.td(`<input type="checkbox" ${display.showUploadArea ? 'checked' : ''} onchange="SettingsPanel.ToggleShowUploadArea()">`) +
					H.td('Show upload area for diagram snapshots.', 'left'), 'sidenavRow') +
			H.tr(	H.td(`<input type="checkbox" ${Cat.debug ? 'checked' : ''} onchange="Cat.debug = !Cat.debug">`) +
					H.td('Debug', 'left'), 'sidenavRow')
		);
}
//
// SettingsPanel static methods
//
SettingsPanel.prototype.ToggleShowRefcnts()
{
	display.showRefcnts = !display.showRefcnts;
	const dgrm = Cat.getDiagram();
	if (dgrm)
	{
		dgrm.updateObjectTableRows();
		dgrm.references.map(r => r.updateObjectTableRows());
		MorphismPanel.updateRows(dgrm);
		dgrm.references.map(r => MorphismPanel.updateRows(r));
	}
}
// TODO move
SettingsPanel.prototype.ToggleShowUploadArea()
{
	display.showUploadArea = !display.showUploadArea;
	display.upSVG.style.display = display.showUploadArea ? 'block' : 'none';
}
const settingsPanel = new SettingsPanel();

//
// ElementPanel is a Panel on the left
//
function ElementPanel()
{
	Panel.call(this, 'element');
	this.elt.innerHTML =
		H.table(
			H.tr(display.closeBtnCell('element', false) + H.td(display.expandPanelBtn('element', false))), 'buttonBarRight') +
			H.h3('Text') +
			H.div('', '', 'element-new-pnl') +
				H.h4('New Text') +
				H.div(
					H.span('Create new text.', 'small') +
					H.table(H.tr(H.td(H.textarea('', 'elementHtml', 'element-properName')), 'sidenavRow')) +
					H.span(display.getButton('edit', 'elementPanel.create(evt)', 'Create new text for this diagram')) +
				H.span('', 'error', 'element-error'), '', 'element-new-pnl') +
//???			H.button('Text', 'sidenavAccordion', '', 'New Text', `onclick="Panel.AccordionToggle(this, \'elementPnl\')"`) +
			H.div('', 'accordionPnl', 'element-pnl');
	this.AccordionOpen('element-pnl');
	this.pnlElt = document.getElementById('element-pnl');
	this.newPnlElt = document.getElementById('element-new-pnl');
	this.newPnlElt.style.display = 'none';
	this.errorElt = document.getElementById('element-error');
	this.properNameElt = document.getElementById('element-properName');
}
ElementPanel.create(e)
{
	try
	{
		this.elementErrorElt.innerHTML = '';
		const dgrm = Cat.getDiagram();
		const mdl = {x:Display.Width()/2, y:Display.Height()/2};
		const xy = D2.subtract(dgrm.userToDiagramCoords(mdl), dgrm.viewport);
		const txt = new DiagramElement(dgrm, {name:`Text${dgrm.textId++}`, diagram:dgrm, properName:this.properNameElt.value, xy});
		this.properNameElt.value = '';
		dgrm.elements.push(txt);
		dgrm.placeElement(e, txt);
		this.update();
		Panel.AccordionOpen('element-pnl');
	}
	catch(e)
	{
		document.getElementById('objectError').innerHTML = 'Error: ' + Cat.getError(e);
	}
}
ElementPanel.prototype.update()
{
	const dgrm = Cat.getDiagram();
	this.elmentNewPnlElt.style.display = dgrm && !dgrm.readonly ? 'block' : 'none';
	this.elementPnlElt.innerHTML =
		H.table(
			dgrm.elements.map((t, i) =>
				H.tr(	H.td(H.table(H.tr(H.td(display.getButton('delete', `elementPanel.delete(${i})`, 'Delete text'))), 'buttonBarLeft')) +
						H.td(H.span(Cat.htmlSafe(t.properName), 'tty', `text_${i}`) +
							(dgrm.readonly ? '' :
								display.getButton('edit', `Cat.getDiagram().getElement('${t.name}').editText('text_${i}', 'properName')`, 'Edit', Cat.default.button.tiny)),
									'left'), 'sidenavRow')
			).join('')
		);
	}
}
ElementPanel.prototype.Delete(i)
{
	const dgrm = Cat.getDiagram();
	if (dgrm && i in dgrm.elements)
	{
		dgrm.elements[i].decrRefcnt();
		this.update();
		dgrm.update();
	}
}
const elementPanel = new ElementPanel();

//
// Element is the root class for Catecon objects and morphisms
//
// The category is the target category of the diagram, say Set.
// The basename is unique within the diagram's domain or codomain working categories.
// Referencing is done by name, not by basename.
// Basenames for the domain 'graph' category of the diagram start with a special character '@'.
//
// $Cat is the magic global variable for the working Cat
//
function Element(dgrm, args)
{
	//
	// Every element belongs to a diagram, except CAT ...
	//
	const diagram = Cat.getDiagram(dgrm);
	if (!diagram)
		throw 'Not a diagram';
	else if ($Cat === null && args.name === 'Cat')	// bootstrap
		diagram = this;
	//
	// If we're chaining/polymorphing, then don't redefine our category
	//
	if (!('diagram' in this))
		Object.defineProperty(this, 'diagram', {value: diagram, enumerable: true});
	if (!('origin' in this))
		Object.defineProperty(this, 'origin', {value: (args.origin === '' || args.origin === 'codomain') ? 'codomain' : 'domain', enumerable: true});
	Object.defineProperty(this, 'category',
		{
			get()
			{
				this.diagram[this.origin];
			}
		});
	//
	// Nothing refers to an element with a reference count of zero.
	//
	this.refcnt = 0;
	//
	// a user owns this element?
	//
	Object.defineProperty(this, 'user', {value: diagram.user, enumerable: true});
	if (Cat.nameEx.test(args.basename))
		Object.defineProperty(this, 'basename', {value: args.basename, enumerable: true});
	else
		throw "Invalid base name";
	//
	// set the name of this element
	//
	this.name = this.origin === 'codomain' ? Element.Codename(diagram, this.basename) : ('name' in args ? args.name : this.diagram.domain.getAnon('grph'));
	//
	// Subcats have duplicate names, that of the master cat.
	//
	// TODO subobject
	//
	if (!('subobject' in args) && !this.category.validateName(this.name))
		throw `Name ${this.name} is already taken.`;
	if (!('properName' in this))
		this.properName = Cat.getArg(args, 'properName', this.basename);
	if (!('description' in this))
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
	return Cat.sha256(`${sig}-${this.prototype.name}-${this.name}`);
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
		console.log('Element.decrRefcnt', this.name, this.refcnt);
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
// FITB
//
Element.prototype.js(dgrmVarName = 'dgrm')
{
	return `		new ${this.prototype.name}(${dgrmVarName}), ${this.stringify()};\n`;
}
//
// Return a string representing the element.  Reconstitute it with process().
//
Element.prototype.stringify()
{
	return JSON.stringify(this.json());
}
//
// If two elements have the same signature then they are the same.
//
Element.prototype.isEquivalent(elt)
{
	return elt ? this.signature === elt.signature : false;
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
// Most elements do not need parenthesis, but products and coproducts do.
//
Element.prototype.needsParens()
{
	return false;
}
Element.prototype.moreHelp()
{
	return '';
}
// TODO move to Diagram?
Element.prototype.help()
{
	const readonly = this.diagram.readonly;
	const create = (!readonly && this.isComplex()) ? display.getButton('edit', `Cat.getDiagram().activateNamedElementForm(evt)`, 'Create named identity', Cat.default.button.tiny) : '';
	const html =	H.h4(H.span(this.properName, '', 'properNameElt') + create) +
					H.p(H.span(Cat.cap(this.description), '', 'descriptionElt')) +
					H.p(H.span(Cat.limit(this.basename), '', 'basenameElt', this.name)) +
					H.p(`Prototype ${this.prototype.name}`) +
					this.moreHelp() +
					H.p(`Category ${this.category.properName}`) +
					H.p(`Diagram ${this.diagram.properName}`) +
					H.div('', 'error', 'namedElementError');
//	else
//		html = H.p(H.span(from.properName, 'tty', 'properNameElt') +
//					(readonly ? '' : display.getButton('edit', `Cat.getDiagram().editElementText('properNameElt', 'properName')`, 'Edit proper name', Cat.default.button.tiny)));
	this.toolbarTipElt.innerHTML = html;
}
//
// Element static methods
//
Element.prototype.Codename(diagram, basename)
{
	return `:${diagram.codomain.name}:Ob{${diagram.user}:${diagram.basename + (basename !== '' ? ':' + basename : ''}bO`;
}

//
// Graph is for graphing string morphisms.
//
function Graph(tag, position, width, graphs = [])
{
	this.tags = [tag];
	this.position = position;
	this.width = width;
	this.graphs = graphs;
	this.links = [];
	this.visited = [];
}
Graph.prototype.isLeaf()
{
	return this.graphs.length === 0;
}
Graph.prototype.getFactor(...indices)
{
	let fctr = this;
	for (let i=0; i<indices.length; ++i)
	{
		const k = indices[i];
		if (k === -1)
			return null;	// object is terminal object One
		fctr = fctr.graphs[k];
	}
	return fctr;
}
Graph.prototype.tagGraph(tag)
{
	if (this.tags.indexOf(tag) === -1)
		graph.tags.push(tag);
	this.graphs.map(g => g.tagGraph(tag));
}
Graph.componentGraph(graph, index)
{
	if (this.isLeaf())
		this.links.map(lnk => lnk.splice(1, 0, index));
	else
		this.graphs.map((g, i) => g.componentGraph(graph.graphs[i], index));
}
Graph.prototype.traceLinks(link = [])
{
	if (this.isLeaf())
	{
		//
		// copy our links
		//
		const links = this.links.slice();
		//
		// clear which links have been visited
		//
		this.visited = [];
		//
		// for each link...
		//
		while(links.length > 0)
		{
			const lnk = links.pop();
			//
			// have we seen this link before?
			//
			if (this.visited.indexOf(lnk) > -1)
				continue;
			//
			// get the graph that the link specifies
			//
			const g = this.getFactor(lnk);
			//
			// if a link in g has not been seen in our links,
			// and the link's root is not the graph's what?  TODO
			//
			g.links.map(k => (links.indexOf(k) === -1 && k[0] !== link[0]) ? links.push(k) : null);
			Cat.arrayMerge(this.tags, g.tags);
			if (link.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
				continue;
			//
			// remember that we've been here
			//
			if (this.visited.indexOf(lnk) === -1)
				this.visited.push(lnk);
		}
	}
	else
	{
		this.graphs.map((g, i) =>
		{
			const lnk = link.slice();
			//
			// add a level to the link
			//
			lnk.push(i);
			g.traceLinks(lnk);
		});
	}
}
//
// builds string graphs from other graphs
//
Graph.prototype.mergeGraphs(data) // data: {from, base, inbound, outbound}
{
	if (data.from.isLeaf())
	{
		//
		// adjust the lnks to merge
		//
		const links = data.from.links.map(lnk =>
		{
			let nuLnk = data.base.reduce((isSelfLink, f, i) => isSelfLink && f === lnk[i], true) ? data.inbound.slice() : data.outbound.slice();
			nuLnk.push(...lnk.slice(data.base.length));
			return nuLnk;
		});
		//
		// merge the links to our links
		//
		Cat.arrayMerge(this.links, links);
		//
		// merge the tags to our tags
		//
		Cat.arrayMerge(this.tags, data.from.tags);
	}
	else
		this.graphs.map((g, i) => g.mergeGraphs({from:data.from.graphs[i], base:data.base, inbound:data.inbound, outbound:data.outbound}));
}
Graph.prototype.bindGraph(data)	// data: {cod, link, tag, domRoot, codRoot, offset}
{
	if (this.isLeaf())
	{
		const domRoot = data.domRoot.slice();
		const codRoot = data.codRoot.slice();
		domRoot.push(...data.link);
		codRoot.push(...data.link);
		Cat.arraySet(this, 'links', codRoot);
		Cat.arraySet(data.cod, 'links', domRoot);
		Cat.arrayInclude(this, 'tags', data.tag);
		Cat.arrayInclude(data.cod, 'tags', data.tag);
	}
	else this.graphs.map((g, i) =>
	{
		//
		// add a level to our link
		//
		const subIndex = data.link.slice();
		subIndex.push(i + data.offset);
		const args = Cat.clone(data);
		args.link = subIndex;
		args.cod = data.cod.graphs[i + data.offset];
		g.bindGraph(args);
	});
}
//
// Copy out of the composite's sequence object to the final two object sequence giving the omposite's graph
//
// data.cnt is the number of morphisms
//
Graph.prototype.copyDomCodLinks(seqGraph, data)	// data {cnt, link}
{
	const factorLink = data.link.slice();
	if (this.isLeaf())
	{
		//
		// reset the link to get info from the composite's sequence graph
		//
		if (factorLink[0] === 1)
			factorLink[0] = data.cnt;
		//
		// get our factor of interest
		//
		const f = seqGraph.getFactor(factorLink);
		//
		// for all the links we have visited in the factor...
		//
		for (let i=0; i<f.visited.length; ++i)
		{
			//
			// copy the link
			//
			const lnk = f.visited[i].slice();
			//
			// if not the beginning or end, skip it
			//
			if (lnk[0] > 0 && lnk[0] < data.cnt)
				continue;
			//
			// reset the link back to the final two object sequence
			//
			if (lnk[0] === data.cnt)
				lnk[0] = 1;
			//
			// remember the link
			//
			if (this.links.indexOf(lnk) === -1)	// TODO needed?
				this.links.push(lnk);
		}
		f.tags.map(r => this.tags.indexOf(r) === -1 ? this.tags.push(r) : null);
	}
	else this.graphs.map((g, i) =>
	{
		let link = data.link.slice();
		//
		// add our location to the link
		//
		link.push(i);
		g.copyDomCodLinks(seqGraph, {link, cnt:data.cnt});
	});
}
//
// copyGraph
//
// Support for lambda morphisms
//
Graph.prototype.copyGraph(data)	// data {map, src}
{
	if (this.isLeaf())
	{
		//
		// copy the tags from the source
		//
		this.tags = data.src.tags.slice();
		//
		// for every source link...
		//
		for (let i=0; i<data.src.links.length; ++i)
		{
			const lnk = data.src.links[i];
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
	else this.graphs.map((e, i) =>
	{
		e.copyGraph({src:data.src.graphs[i], map:data.map});
	});
}
Graph.prototype.svg(dgrm, data, first = true)	// data {index, dom:{x,y, name}, cod:{x,y, name}, visited, elementId}
{
	if (this.isLeaf())
	{
		const dom = {x:Math.round(this.position + (this.width/2.0) + (data.index[0] === 0 ? data.dom.x : data.cod.x)), y:data.index[0] === 0 ? data.dom.y : data.cod.y};
		let colorIndex = Number.MAX_VALUE;
		const srcKey = StringMorphism.linkColorKey(data.index, data.dom.name, data.cod.name);
		if (!('colorIndex' in this))
		{
			if (!(srcKey in dgrm.link2colorIndex))
				dgrm.link2colorIndex[srcKey] = dgrm.colorIndex++;
			colorIndex = dgrm.link2colorIndex[srcKey];
		}
		else
			colorIndex = this.colorIndex;
		while(colorIndex in dgrm.colorIndex2colorIndex)
			colorIndex = dgrm.colorIndex2colorIndex[colorIndex];
		for (let i=0; i<this.links.length; ++i)
		{
			const lnk = this.links[i];
			const lnkStr = lnk.toString();
			const idxStr = data.index.toString();
			if (data.visited.indexOf(lnkStr + ' ' + idxStr) >= 0)
				continue;
			const d = StringMorphism.svgLinkUpdate(dom, lnk, data);
			const fs = this.tags.sort().join();
			const linkId = StringMorphism.linkId(data, lnk);
			const lnkKey = StringMorphism.linkColorKey(lnk, data.dom.name, data.cod.name);
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
				color = StringMorphism.colorWheel(data);
				dgrm.colorIndex2color[colorIndex] = color;
			}
			data.visited.push(idxStr + ' ' + lnkStr);
			data.visited.push(lnkStr + ' ' + idxStr);
			return `<path data-link="${lnkStr} ${idxStr}" class="string" style="stroke:#${color}AA" id="${linkId}" d="${d}" filter="url(#softGlow)" onmouseover="display.status(evt, '${fs}')"/>\n`;
		}
		return svg;
	}
	return this.graphs.reduce((svg, g, i) =>
	{
		data.index.push(i);
		svg += g.svg(dgrm, data, false);
		data.index.pop();
		return svg;
	}, '');
}

//
// CatObject is an Element
//
// A CatObject is an Element.
// Have to call this CatObject since Object is a javascript reserved keyword.
//
function CatObject(diagram, args)
{
	Element.call(this, diagram, args);
	this.category.addObject(this);
	//
	// the default size for an object is one
	//
	this.prototype.size = 1;
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
//
// With no further structure the ony factor we could possibly return is the object itself.
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
CatObject.prototype.getGraph(data = {position:0})
{
	const width = display.textWidth(this.properName);
	const position = data.position;
	data.position += width;
	return new Graph(this.prototype.name, position, width);
}
//
// data: {fname, root, index, id, action, op}
// e.g., {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}
//
CatObject.prototype.factorButton(properName, data)
{
	return H.table(H.tr(H.td(H.button(properName + data.txt, '', display.elementId(), data.title,
		`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`))));
}
//
// CatObject static methods
//
CatObject.Process(diagram, args)
{
	return new Cat[args.prototype](args);
}

/*
//
// InitialObject is a CatObject
//
function InitialObject(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.name = '0';
	nuArgs.properName = '0';
	CatObject.call(this, diagram, args);
	this.prototype.size = 0;
}
//
// InitialObject static methods
//
InitialObject.prototype.Get(diagram, objects)
{
	const object = diagram.getObject('0');
	return object === null ? new InitialObject(diagram) : object;
}
*/

//
// DiscreteObject is a CatObject
//
// args: size
//
function DiscreteObject(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.properName = DiscreteObject.ProperName(nuArgs.size);
	nuArgs.name = DiscreteObject.Codename(diagram, nuArgs.size);
	CatObject.call(this, diagram, nuArgs);
	this.prototype.size = nuArgs.size;
}
//
// DiscreteObject static methods
//
DiscreteObject.prototype.Codename(diagram, size)
{
	return `${diagram.codomain.name}:${size}`;
}
DiscreteObject.prototype.ProperName(diagram, size)
{
	return size.toString();
}
DiscreteObject.prototype.Get(diagram, size)
{
	const object = diagram.getObject(DiscreteObject.Codename(size));
	return object ? object : new InitialObject(diagram, {size});
}

//
// MultiObject is an CatObject
//
// An object comprised of a list of other objects.  Really expects to be used by derived classes only.
//
function MultiObject(diagram, args)
{
	CatObject.call(this, diagram, args);
	this.objects = args.objects.map(o => this.diagram.getObject(o));
	this.objects.map(o => o.incrRefcnt());
	this.seperatorWidth = display.textWidth(', ');
}
MultiObject.prototype.signature(sig = '')
{
	return Cat.sha256(`${sig}${this.category.name}:${this.prototype.name} ${objects.map(o => o.signature()).join()}`);
}
MultiObject.prototype.decrRefcnt()
{
	//
	// if at zero, then we're going away so release our holds on our comprising objects
	//
	if (this.refcnt <= 0)
		this.objects.map(o => o.decrRefcnt());
	super.decrRefcnt();
}
MultiObject.prototype.json()
{
	const object = super.json();
	object.objects = this.objects.map(o => o.name);
	return object;
}
MultiObject.prototype.getFactor(factor)
{
	return factor.length > 0 ? this.objects[factor[0]].getFactor(factor.slice(1)) : this;
}
MultiObject.prototype.getFactorName(factor)
{
	return this.getFactor(factor).name;
}
MultiObject.prototype.getFactorProperName(indices)
{
	const f = this.getFactor(indices);
	return `<tspan>${f.properName}</tspan>${Cat.subscript(indices)}`;
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
MultiObject.getGraph(tag, data, parenWidth, sepWidth, first = true)	// data: {position: 0}
{
	let width = 0;
	const doit = !first && this.needsParens();
	if (doit)
		width += parenWidth;
	const position = data.position;
	data.position += width;
	const graphs = this.objects.map(o =>
		{
			const g = o.getGraph(data, false);
			//
			// for sequence and plotting strings
			//
			if (this.resetPosition())
				data.position = 0;
			else
				data.position += sepWidth + g.width;
			return g;
		});
	width = data.position - position;
	if (doit)
		width += parenWidth;
	const graph = new Graph(tag, position, width, graphs);
	return graph;
}
//
// Used for graphing string morphisms.  Basically only sequence objects return true.
//
MultiObject.prototype.resetPosition()
{
	return false;
}
MultiObject.prototype.moreHelp()
{
	return H.table(H.tr(H.th('Objects', '', '', '', 'colspan=2')) + this.objects.map(o => H.tr(H.td(o.diagram.properName) + H.td(o.properName, 'left'))).join(''));
}
//
// Return my button plus my objects' buttons.
//
MultiObject.prototype.factorButton(data)
{
	let html = H.tr(this.factorButton(data), 'sidename');
	let tbl = '';
	this.objects.map((o, i) =>
	{
		const subIndex = data.index.slice();
		subIndex.push(i);
		const d = Cat.clone(data);
		d.index = subIndex;
		tbl += H.td(o.factorButton(d);
	});
	return html + H.tr(H.td(H.table(H.tr(tbl))), 'sidename');
}
//
// MultiObject static methods
//
MultiObject.prototype.ProperName(sep, objects)
{
	let n = '';
	const doit = this.needsParens();
	if (doit)
		n += '(';
	let n = objects.map(o => o.properName).join(sep);
	if (doit)
		n += ')';
}
MultiObject.prototype.getObjects(diagram, objects)
{
	return args.objects.map(o => diagram.getObject(o));
}

//
// ProductObject is a MultiObject
//
function ProductObject(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.objects = MultiObject.getObjects(diagram, args.objects);
	nuArgs.name = ProductObject.Codename(diagram, nuArgs.objects);
	nuArgs.properName = 'properName' in args ? args.properName : ProductObject.ProperName(nuArgs.objects);
	MultiObject.call(this, diagram, nuArgs);
	this.prototype.size = this.objects.reduce((sz, o) => sz += o.size, 0);	// sum of all sub-sizes
	this.prototype.seperatorWidth = display.textWidth('&times');	// in pixels
	this.setSignature();
}
ProductObject.prototype.fromHTML(first = true, {uid:0, id:'data'})
{
	return this.objects.map(o => o.FromInput(false, uid));
}
ProductObject.prototype.toHTML(first=true, uid={uid:0, idp:'data'})
{
	// TODO
//	const codes = this.objects.map(d => {uid.uid; return d.toHTML(false, uid)});
//	return Cat.parens(codes.join(op.sym), '(', ')', first);
}
ProductObject.getGraph(data = {position:0}, first = true)
{
	return super.getGraph(this.prototype.name, data, display.textWidth('('), display.textWidth('&times;'), first);
}
ProductObject.prototype.needsParens()
{
	return true;
}
//
// ProductObject static methods
//
ProductObject.prototype.Codename(diagram, objects)
{
	return `:${this.codomain.name}:Po{${objects.map(o => o.name).join(',')}}oP`;
}
ProductObject.prototype.Get(diagram, objects)
{
	const name = ProductObject.Codename(diagram, objects);
	const object = diagram.getObject(name);		// no products in the diagram domain cats
	return object === null ? new ProductObject(diagram, {objects}) : object;
}
ProductObject.prototype.ProperName(objects)
{
	return super.ProperName('&times;', objects);
}

//
// Sequence is a ProductObject
//
// This is only for graphing string morphisms.
//
function Sequence(diagram, args)
{
	ProductObject.call(this, diagram, args);
}
Sequence.prototype.resetPosition()
{
	return true;
}
//
// Sequence static methods
//
Sequence.prototype.Codename(diagram, objects)
{
	return `:${diagram.codomain.name}:So{${objects.map(o => o.name).join(',')}}oS`;
}
Sequence.prototype.Get(diagram, objects)
{
	const name = Sequence.Codename(diagram, objects);
	const object = diagram.getObject(name);
	return object === null ? new Sequence(diagram, {objects}) : object;
}

//
// CoproductObject is a MultiObject
//
function CoproductObject(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.objects = MultiObject.getObjects(diagram, args.objects);
	nuArgs.name = CoproductObject.Codename(diagram, nuArgs.objects);
	nuArgs.properName = 'properName' in args ? args.properName : CoproductObject.ProperName(nuArgs.objects);
	MultiObject.call(this, diagram, nuArgs);
	this.prototype.size = 1 + this.objects.reduce((sz, o) => sz = Math.max(o.size, sz), 0);
	this.prototype.seperatorWidth = display.textWidth('&times');
	this.setSignature();
}
CoproductObject.getGraph(data = {position:0}, first = true)
{
	return super.getGraph(this.prototype.name, data, display.parenWidth, display.textWidth('&plus;'), first);
}
CoproductObject.prototype.needsParens()
{
	return true;
}
//
// CoproductObject static methods
//
CoproductObject.prototoype.Codename(diagram, objects)
{
	return Element.Codename(diagram, `Co-${objects.map(o => o.name).join(','))}-oC`;
}
CoproductObject.prototoype.Get(diagram, objects)
{
	const name = CoproductObject.Codename(this.diagram, objects);
	let object = diagram.getObject(name);
	return object === null ? new CoproductObject(diagram, {objects}) : object;
}
CoproductObject.prototoype.ProperName(objects)
{
	return super.ProperName('&plus;', objects);
}
CoproductObject.prototype.fromHTML(first = true, {uid:0, id:'data'})
{
	return {};	// TODO
}

//
// HomObject is a MultiObject
//
function HomObject(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.objects = MultiObject.getObjects(diagram, args.objects);
	nuArgs.name = HomObject.Codename(diagram, nuArgs.objects);
	nuArgs.name = HomObject.Codename(diagram, nuArgs.objects);
	nuArgs.properName = args.properName === '' ? HomObject.ProperName(nuArgs.objects) : args.properName;
	Multiobject.call(this, diagram, nuArgs);
	this.prototype.size = 1;
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
	const th = H.tr(H.td(HomObject.ProperName(this.objects), '', '', '', `colspan='4'`));
	return H.table(th + Display.MorphismTableRows(homset, `data-name="%1" onclick="Cat.getDiagram().toggleTableMorphism(event, '${id}', '%1')"`, false), 'toolbarTbl', id);
}
homDomain()
{
	return this.objects[0];
}
homCodomain()
{
	return this.objects[1];
}
HomObject.prototype.getFactorProperName(indices)
{
//	this.position = data.position;	// TODO ???
	const f = this.getFactor(indices);
	return `<tspan>${f.properName}</tspan>${Cat.subscript(indices)}`;
}
HomObject.getGraph(data = {position:0}, first = true)
{
	return super.getGraph(this.prototype.name, data, display.bracketWidth, display.commaWidth, first)
}
//
// HomObject static methods
//
HomObject.prototype.Codename(diagram, objects)
{
	return `:${this.codomain.name}:Ho{${objects.map(o => o.name).join(',')}}oH`;
}
HomObject.prototype.Get(diagram, objects)
{
	const name = HomObject.Codename(diagram, objects);
	const object = diagram.getObject(name);
	return object === null ? new HomObject(diagram, {objects}) : object;
}
HomObject.prototype.ProperName(objects)
{
	return `[${objects[0].properName}, ${objects[1].properName}]`;
}
HomObject.prototype.FromInput(first = true, uid={uid:9, idp:'data'})
{
	++uid.uid;
	const morphism = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
	// TODO
}

//
// IntialObject
//
function InitialObject(diagram)
{
	CatObject.call(this, diagram, {basename:'Initial', properName:'0'});
	this.prototype.size = 0;
}

//
// Terminal Object
//
function TerminalObject(diagram)
{
	CatObject.call(this, diagram, {basename:'Initial', properName:'0'});
	this.prototype.size = 0;
}

//
// DiagramElement is an Element
//
// a text element placed on the diagram.
//
function DiagramElement(diagram, args)
{
	if (!Diagram.isPrototypeOf(diagram))
		throw 'Not a diagram';
	const nuArgs = Cat.clone(args);
	nuArgs.name = Cat.getArg(args, 'name', diagram.domain.getAnon());
	nuArgs.origin = 'domain';
	Element.call(this, diagram, nuArgs);
	const xy = Cat.getArg(args, 'xy', new D2);
	this.x = xy.x;
	this.y = xy.y;
	this.width = Cat.getArg(args, 'width', 0);
	this.height = Cat.getArg(args, 'height', Cat.default.font.height);
}
DiagramElement.prototype.setXY(xy)
{
	this.x = display.grid(xy.x);
	this.y = display.grid(xy.y);
}
DiagramElement.prototype.getXY()
{
	return {x:this.x, y:this.y};
}
DiagramElement.prototype.json()
{
	let a = super.json();
	a.height = this.height;
	a.xy = this.getXY();
	a.width = this.width;
	return a;
}
DiagramElement.prototype.update()	// FITB
{}
DiagramElement.prototype.isGraphable()
{
	return false;
}
DiagramElement.prototype.editText(id, attr)
{
	const h = document.getElementById(id);
	if (!this.diagram.readonly && !this.readonly)
	{
		if (h.contentEditable === 'true')
		{
			this.diagram.updateElementAttribute(this, attr, h.innerText);
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
// DiagramObject is a DiagramElement
//
// This is the object for the source category in a diagram.
// It points to the object in the target category of the diagram.
//
function DiagramObject(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.name = 'name' in nuArgs ? diagram.domain.getAnon('dgrmO');
	CatObject.call(this, diagram, args);
	DiagramElement.call(this, diagram, this);
	//
	// the object in the target category that this object maps to, if any
	//
	if ('to' in args)
		this.setObject(diagram.getObject(args.to));
}
DiagramObject.prototype.json()
{
	let a = super.json();
	a.to = this.to ? this.to.name : null;
	return a;
}
//
// Set the object in the diagram's category that this diagram object points to.
//
DiagramObject.prototype.setObject(to)
{
	if (this.to)
	{
		if (this.to.isEquivalent(to))
			return;
		this.to.decrRefcnt();
	}
	to.incrRefcnt();
	this.to = to;
	this.width = display.textWidth(to.properName);
}
DiagramObject.prototype.decrRefcnt()
{
	if (this.refcnt <= 0)
	{
		this.to.decrRefcnt();
		//
		// if the target is no longer referred to, then decrement again to remove it
		//
		if (this.to.refcnt === 0)
			this.to.decrRefcnt();
		this.removeSVG();
	}
	super.decrRefcnt();
}
DiagramObject.prototype.makeSVG()
{
	if (isNaN(this.x) || isNaN(this.y))
		throw `nan in ${this.name}`;
	return `<text data-type="object" data-name="${this.name}" text-anchor="middle" class="object grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + Cat.default.font.height/2}"
		onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'object')">${this.to.properName}</text>`;
}
DiagramObject.prototype.getBBox()
{
	return {x:this.x - this.width/2, y:this.y + this.height/2 - Cat.default.font.height, width:this.width, height:this.height};
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
	return `do_${this.name}`;
}
DiagramObject.prototype.updatePosition(xy)
{
	//
	// round to pixel location
	//
	this.setXY(D2.round(xy));
	const svg = this.svg();
	if (svg.hasAttribute('transform'))
		svg.setAttribute('transform', `translate(${display.grid(this.x)} ${display.grid(this.y)})`);
	else
	{
		if (svg.hasAttribute('x'))
		{
			svg.setAttribute('x', this.x);
			svg.setAttribute('y', this.y + ('height' in this ? this.height/2 : 0));
		}
	}
}
DiagramObject.prototype.showSelected(state = true)
{
	this.svg().classList[state ? 'add' : 'remove']('selected');
}
DiagramObject.prototype.addSVG()
{
	display.diagramSVG.innerHTML += typeof this === 'string' ? this : this.makeSVG();
}
//
// Basically we just don't graph objects in the diagram's source category.
//
DiagramObject.prototype.isGraphable()
{
	return false;
}

//
// Category is a CatObject
//
function Category(args)
{
	CatObject.call(this, $Cat, args);	// TODO $Cat should be a diagram object
	if ('subobject' in args)
		this.subobject = $Cat.getObject(args.subobject);
	//
	// for graph categories that share the same objects as the source category
	//
	this.objects = 'objects' in args ? args.objects : new Map();
	this.morphisms = new Map();
	//
	// part of the boot sequence
	//
	if ($Cat === null)
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
		s += o.signature;
	for ([key, m] of this.morphisms)
		s += m.signature;
	return Cat.sha256(`Cat ${this.name} ${this.prototype.name} ${s});
}
//
// Reconstitute this category from its saved contents.
//
Category.prototype.process(args)
{
	let errMsg = '';
	if ('objects' in args)
		Object.keys(args.objects).forEach(function(key)
		{
			if (!this.getObject(key))
			{
				try
				{
					CatObject.Process(this.diagram, args.objects[key]);
				}
				catch(x)
				{
					errMsg += x;
				}
			}
			else
				throw 'object already exists';
		}, this);
	if ('morphisms' in args)
		Object.keys(args.morphisms).forEach(function(key)
		{
			if (!this.getMorphism(key))
			{
				try
				{
					const m = Morphism.Process(this.diagram, args.morphisms[key]);
				}
				catch(x)
				{
					errMsg += x;
				}
			}
			else
				throw 'morphism already exists';
		}, this);
	if (errMsg != '')
		display.recordError(errMsg);
	//
	// for our recursive morphisms, setup the their recursors now that all morphisms are loaded and the searches can be satisfied
	//
	for(const [key, m] of this.morphisms)
		if (Recursive.isPrototypeOf(m) && String.isPrototypeOf(m.recursor))
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
			for(const [key, object] of this.objects)
			{
				if (object.name === 'Cat')
					return;
				objects.push(object);
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
Category.prototype.js()
{
	const js =
`
	const cat = new Category(
		{
			basename:	'${this.basename}.,
			properName:	'${this.properName}',	// TODO make safe
			description:	'${this.description}',	// TODO make safe
			subobject:	'${this.subobject}',
		});
`;
	for (const [name, o] in this.objects)
		js += `		const ${name} = ${o.js()}`;
	for (const [name, m] in this.morphisms)
		js += `		const ${name} = ${m.js()}`;
	return js;
}
Category.prototype.getObject(name)
{
	//
	// if it is already an object, return it
	//
	if (Element.isPrototypeOf(name))
		// TODO check for correct category?
		return name;
	/*
	//
	// if it is an operator name, then it must be for this category
	//
	if (Cat.opEx(name))
		return this.objects.get(name);
	//
	// it is a complex name, so break it down
	//
	const attrs = Element.NameTokens(name);
	//
	// if the names do not match who we are, then we cannot find it
	//
	if (attrs.category !== this.basename || attrs.diagram !== this.diagram.basename || attrs.user !== this.diagram.user)
		return null;
		*/
	//
	// see what we got
	//
	return this.objects.get(name);
}
Category.prototype.addObject(object)
{
	if (this.objects.has(object.name))
		throw `Object with name ${object.name} already exists in category ${this.name}`;
	this.objects.set(object.name, object);
}
Category.prototype.getMorphism(name)
{
	//
	// if it is already an object, return it
	//
	if (Morphism.isPrototypeOf(name))
		return name;
	/*
	//
	// if it is an operator name, then it must be for this category
	//
	if (Cat.opEx(name))
		return this.morphisms.get(name);
	//
	// it is a complex name, so break it down
	//
	const attrs = Element.NameTokens(name);
	//
	// if the names do not match who we are, then we cannot find it
	//
	if (attrs.category !== this.basename || attrs.diagram !== this.diagram.basename || attrs.user !== this.diagram.user)
		return null;
	*/
	//
	// see what we got
	//
	return this.morphisms.get(name);
}
Category.prototype.addMorphism(m)
{
	if (this.morphisms.has(m.name))
		throw `Morphism with name ${m.name} already exists in category ${this.name}`;
	this.morphisms.set(m.name, m);
}
Category.prototype.basenameIsUsed(name)
{
	return this.getObject(name) || this.getMorphism(name);
}
Category.prototype.getAnon(s = 'Anon')
{
	while(true)
	{
		const name = `${s}_${Cat.random()}`;
		if (!this.basenameIsUsed(name))
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
Category.prototype.addFactorMorphism(domain, factors)
{
	let m = FactorMorphism.Get(this, domain, factors);
	m.incrRefcnt();
	return m;
}
// TODO move?
Category.prototype.toolbarMorphism(form)
{
	let td = '';
	if (form.composite)
		td += H.td(display.getButton('compose', `Cat.getDiagram().gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
	return td;
}
Category.prototype.validateName(name)
{
	return name !== '' && !this.basenameIsUsed(name) && Cat.nameEx.test(name);
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
	if (!DiagramMorphism.isPrototypeOf(elt))
		return bad;
	const dom = elt.domain;
	const cod = elt.codomain;
	let compositeCod = elt.codomain;
	let good = {composite:true, source:true, sink:true, distinct: true};
	let foundObjects = {};
	for(let i=1; i<ary.length; ++i)
	{
		const elt = ary[i];
		if (!DiagramMorphism.isPrototypeOf(elt))
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
Category.prototype.Run(m, diagram)
{
	let dm = m.morphisms[0];
	if (!DataMorphism.isPrototypeOf(dm))
		throw 'Needs a data morphism first in the composite to run';
	//
	// there is no output morphism for the codomains tty and threeD
	//
	let dataOut = (m.codomain.basename !== 'tty' && m.codomain.basename !== 'threeD') ? diagram.newDataMorphism(m.domain, m.codomain) : null;
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
function StringObject(diagram, args)
{
	CatObject.call(this, diagram, args);
	this.graph = args.object.graph();
}

//
// Morphism is an Element
//
function Morphism(diagram, args)
{
	Element.call(this, diagram, args);
	const domain = this.diagram.getObject(args.domain);
	if (domain === null)
		throw 'domain does not exist';
	Object.defineProperty(this, 'domain', {value: domain, enumerable: true});
	const codomain this.diagram.getObject(args.codomain);
	if (codomain === null)
		throw 'codomain does not exist';
	Object.defineProperty(this, 'codomain', {value: codomain, enumerable: true});
	//
	// this can fail so do the increments afterwards
	//
	this.category.addMorphism(this);
	this.codomain.incrRefcnt();
	this.domain.incrRefcnt();
}
Morphism.prototype.decrRefcnt()
{
	if (this.refcnt <= 0)
	{
		this.domain.decrRefcnt();
		this.codomain.decrRefcnt();
		this.category.morphisms.delete(this.name);
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
Morphism.prototype.$(args)
{
	throw 'unknown action in morphism';
}
//
// A generic morphism has an empty graph constructe from its domain and codomain.
//
Morphism.prototype.getGraph(data = {position:0})
{
	return Sequence.Get(this.diagram, [this.domain, this.codomain]).getGraph(data);
}
//
// static Morphism methods
//
Morphism.prototype.Process(diagram, args)
{
	return new window[args.prototype](args);
}

//
// Identity is a Morphism
//
function Identity(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	nuArgs.codomain = diagram.getObject('codomain' in nuArgs ? nuArgs.codomain : nuArgs.domain);
	nuArgs.name = Identity.Codename(diagram, nuArgs.domain, nuArgs.codomain);
	nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : Identity.ProperName(nuArgs.domain, nuArgs.codomain));
	Morphism.call(this, diagram, nuArgs);
}
Identity.prototype.getGraph(data = {position:0})
{
	const g = super.getGraph(data);
	g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
	g.tagGraph(this.prototype.name);
	return g;
}
Identity.prototype.$(args)
{
	return args;
}
//
// Identity static methods
//
Identity.prototype.Codename(diagram, domain, codomain = null)
{
	const basename = (codomain && domain.name !== codomain.name) ? `Id{${domain.name},${codomain.name}}dI` : `Id{${domain.name}}dI`;
	return `:${diagram.codomain.name}:${basename}`;
}
Identity.prototype.Get(diagram, dom, cod = null)
{
	const domain = diagram.getObject(dom);
	let codomain = null;
	if (cod)
		codomain = diagram.getObject(cod);
	const name = Identity.Codename(diagram, domain, codomain);
	const m = diagram.getMorphism(name);
	return m === null ? new Identity(diagram, codomain ? {domain, codomain}) : m;
}
Identity.prototype.ProperName(domain, codomain = null)
{
//	return (codomain && domain.name !== codomain.name) ? `Id<${domain.properName}, ${codomain.properName}>` : `Id<${domain.properName}>`;
	return 'id';
}

//
// DiagramMorphism is a Morphism
//
// Supports the placement and drawing of a morphism in a diagram.
// This is *not* a DiagramElement as this is suspended between two such.
//
function DiagramMorphism(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.name = 'name' in nuArgs ? nuArgs.name : diagram.domain.getAnon('dgrmM');
	Morphism.call(this, diagram, nuArgs);
	//
	// graphical attributes
	//
	this.start = Cat.getArg(args, 'start', new D2);
	this.end = Cat.getArg(args, 'end', {x:150, y:0});	// TODO make default
	this.angle = Cat.getArg(args, 'angle', 0.0);
	this.flipName = Cat.getArg(args, 'flipName', false);
	if ('morphisms' in nuArgs)
		this.morphisms = nuArgs.morphisms.map(m => diagram.domain.getMorphism(m));
	//
	// the morphism in the target category that this morphism maps to, if any
	//
	this.setMorphism(this.diagram.getMorphism(nuArgs.to));
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
	mor.start = this.start;
	mor.end = this.end;
	mor.angle = this.angle;
	mor.flipName = this.flipName;
	mor.to = this.to.name;
	if ('morphisms' in this)
		mor.morphisms = this.morphisms.map(m => m.name);
	return mor;
}
DiagramMorphism.prototype.setMorphism(to)
{
	if (this.to)
	{
		if (this.to.isEquivalent(to))
			return;
		this.to.decrRefcnt();
	}
	to.incrRefcnt();
	this.domain.setObject(to.domain);
	this.codomain.setObject(to.codomain);
	this.to = to;
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
	let svg =
`<g id="${this.elementId()}">
<path data-type="morphism" data-name="${this.name}" class="${this.to.prototype.name !== 'unknown' ? 'morphism' : 'unknownMorph'} grabbable" id="${this.elementId()}_path" d="M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}"
onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')" marker-end="url(#arrowhead)"/>
<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_name'}" x="${off.x}" y="${off.y}"
onmousedown="Cat.getDiagram().pickElement(evt, '${this.name}', 'morphism')">${this.to.properName}</text>`;
	if (Composite.isPrototypeOf(this.to))
	{
		const xy = Display.Barycenter(this.morphisms);
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
	return `mor_${this.name.replace(/{}:/, '_')}`;
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
		const xy = Display.Barycenter(this.morphisms);
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
		width:	Math.abs(this.start.x - this.end.x),
		height:	Math.abs(this.start.y - this.end.y),
	};
	if (r.width === 0.0)
	{
		r.width = fontHeight = Cat.default.font.height;
		r.x += r.width/2;
	}
	else if (r.height === 0.0)
	{
		r.height = r.width;
		r.y -= r.width/2;
	}
	return r;
}
DiagramMorphism.prototype.predraw()
{
	const domBBox = this.domain.getBBox();
	const codBBox = this.codomain.getBBox();
	const deltaX = this.codomain.x - this.domain.x;
	const deltaY = this.codomain.y - this.domain.y;
	let start = new D2;
	let end = new D2;
	if (deltaX === 0)
	{
		if (deltaY > 0)
		{
			start = D2.round(this.intersect(domBBox, 'bottom'));
			end = D2.round(this.intersect(codBBox, 'top'));
		}
		else
		{
			start = D2.round(this.intersect(domBBox, 'top'));
			end = D2.round(this.intersect(codBBox, 'bottom'));
		}
	}
	else if (deltaY === 0)
	{
		if (deltaX > 0)
		{
			start = D2.round(this.intersect(domBBox, 'right'));
			end = D2.round(this.intersect(codBBox, 'left'));
		}
		else
		{
			start = D2.round(this.intersect(domBBox, 'left'));
			end = D2.round(this.intersect(codBBox, 'right'));
		}
	}
	else
	{
		start = D2.round(this.closest(domBBox, this.codomain));
		end = D2.round(this.closest(codBBox, this.domain));
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
	if (document.getElementById(StringMorphism.GraphId(this)))
		StringMorphism.update(this);
}
DiagramMorphism.prototype.intersect(bbox, side, m = Cat.default.arrow.margin)
{
	let pnt = new D2;
	const x = bbox.x - m;
	const y = bbox.y - m;
	const width = bbox.width + 2 * m;
	const height = bbox.height + 2 * m;
	switch(side)
	{
	case 'top':
		pnt = D2.segmentIntersect(	x, y, x + width, y, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
		break;
	case 'bottom':
		pnt = D2.segmentIntersect(	x, y + height, x + width, y + height, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
		break;
	case 'left':
		pnt = D2.segmentIntersect(	x, y, x, y + height, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
		break;
	case 'right':
		pnt = D2.segmentIntersect(	x + width, y, x + width, y + height, this.domain.x, this.domain.y, this.codomain.x, this.codomain.y);
		break;
	}
	return pnt;
}
DiagramMorphism.prototype.closest(bbox, pnt)
{
	const pntTop = this.intersect(bbox, 'top');
	const pntBtm = this.intersect(bbox, 'bottom');
	const pntLft = this.intersect(bbox, 'left');
	const pntRgt = this.intersect(bbox, 'right');
	let r = {x:Number.MAX_VALUE, y:Number.MAX_VALUE};
	if (pntTop != false)
		r = D2.updatePoint(pntTop, r, pnt);
	if (pntBtm != false)
		r = D2.updatePoint(pntBtm, r, pnt);
	if (pntLft != false)
		r = D2.updatePoint(pntLft, r, pnt);
	if (pntRgt != false)
		r = D2.updatePoint(pntRgt, r, pnt);
	if (r.x === Number.MAX_VALUE)
		r = {x:pnt.x, y:pnt.y};
	return r;
}

//
// IndexCategory is a Category
//
function IndexCategory(args)
{
	Category.call(this, args);
}
IndexCategory.prototype.js()
{
}

//
// MultiMorphism is a Morphism
//
// a morphism comprised of other morphisms
//
function MultiMorphism(diagram, args)
{
	Morphism.call(this, diagram, args);
	this.morphisms = multiMorphism.SetupMorphisms(diagram, args.morphisms);
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
// Default is for a MultiMorphism to be iterable if all its morphisms are iterable.
//
MultiMorphism.prototype.isIterable()
{
	return this.morphisms.reduce((m, r) => r &= m.isIterable(), true);
}
MultiMorphism.prototype.moreHelp()
{
	return H.table(H.tr(H.th('Morphisms', '', '', '', 'colspan=2')) + this.morphisms.map(m => H.tr(H.td(m.diagram.properName) + H.td(m.properName, 'left'))).join(''));
}
MultiMorphism.prototype.mergeMorphismGraphs(dual = false)
{
	const graph = this.getGraph();
	const graphs = this.morphisms.map(m => m.getGraph());
	const domNdx = dual ? 1 : 0;
	const codNdx = dual ? 0 : 1;
	const dom = graphs[domNdx];
	const cod = graphs[codNdx];
	//
	// for all our comprising graphs...
	//
	graphs.map((g, i) =>
	{
		this.graph.graphs[domNdx].mergeGraphs({from:g.graphs[domNdx], base:[domNdx], inbound:[], outbound:[codNdx, i]});
		const gCod = g.graphs[codNdx];
		const tCod = graphs[codNdx];
		const thisGraph = tCod.isLeaf() ? tCod : tCod.graphs[i];
		thisGraph.mergeGraphs({from:gCod, base:[codNdx, i], inbound:[codNdx, i], outbound:[]});
		cod.graphs[i] = Cat.clone(g.graphs[dual ? 0 : 1]);
		cod.componentGraph(cod.graphs[i], i);
	});
	return graph;
}
//
// MultiMorphism static methods
//
MultiMorphism.prototype.SetupMorphisms(diagram, morphs)
{
	return args.morphisms.map(m => (typeof m === 'string' ? diagram.codomain.getMorphism(m) : m));
}

//
// Composite is a Morphism
//
function Composite(diagram, args)
{
	const morphisms = multiMorphism.SetupMorphisms(diagram, args.morphisms);
	const nuArgs = Cat.clone(args);
	nuArgs.name = Composite.Codename(diagram, morphisms);
	nuArgs.domain = Composite.Domain(diagram, morphisms);
	nuArgs.codomain = composite.Codomain(diagram, morphisms);
	nuArgs.morphisms = morphisms;
	nuArgs.properName = 'properName' in args ? args.properName : Composite.ProperName(morphisms);
	MultiMorphism.call(this, diagram, args);
}
Composite.prototype.$(args)
{
	return this.morphisms.reduce((d, m) => d ? m.$(d) : null, args);
}
//
// A composite is considered iterable if the first morphism is iterable.
//
Composite.prototype.isIterable()
{
	return this.morphisms[0].isIterable();
}
Composite.prototype.getGraph(data = {position:0})
{
	const graph = super.getGraph(data);
	//
	// get the graphs of the comprising morphisms.
	//
	const graphs = this.morphisms.map(m => m.getGraph());
	//
	// Next build a sequence of all the domains and last coodmain.
	// Note that the number of items in the sequence is one greater than the number of morphisms.
	//
	const objects = this.morphisms.map(m => m.domain);
	objects.push(this.morphisms[this.morphisms.length -1].codomain);
	const sequence = Sequence.get(diagram, objects);
	//
	// get the sequence's graph
	//
	const seqGraph = sequence.getGraph();
	//
	// Copy the links from the comprising morphisms to the sequence.
	//
	graphs.map((g, i) =>
	{
		seqGraph.graphs[i].mergeGraphs({from:g.graphs[0], base:[0], inbound:[i], outbound:[i+1]});
		seqGraph.graphs[i+1].mergeGraphs({from:g.graphs[1], base:[1], inbound:[i+1], outbound:[i]});
	});
	//
	// Trace the links in the sequence.
	//
	seqGraph.traceLinks();
	//
	// Copy the links of the initial domain and final codomain to the returned graph.
	//
	graph.copyDomCodLinks(seqGraph, {cnt:this.morphisms.length, link:[]});
	return graph;
}
//
// Composite static methods
//
Composite.prototype.Codename(diagram, morphisms)
{
	return `:${diagram.codomain.name}:Cm{${morphisms(m => m.name).join(',')}}mC`;
}
Composite.prototype.Domain(diagram, morphisms)
{
	return morphisms[0].domain;
}
Composite.prototype.Codomain(diagram, morphisms)
{
	return morphisms[morphisms.length - 1].codomain;
}
Composite.prototype.Get(diagram, morphisms)
{
	const name = Composite.Codename(diagram, morphisms);
	const m = diagram.getMorphism(name);
	return m === null ? new Composite(diagram, {morphisms}) : m;
}
Composite.prototype.ProperName(morphisms)
{
	return morphisms.map(m => m.properName).join('&#8728;');
}

//
// ProductMorphism is a Morphism
//
function ProductMorphism(diagram, args)
{
	const morphisms = multiMorphism.SetupMorphisms(diagram, args.morphisms);
	const nuArgs = Cat.clone(args);
	nuArgs.name = ProductMorphism.Codename(diagram, morphisms);
	nuArgs.domain = ProductMorphsim.Domain(diagram, morphisms);
	nuArgs.codomain = ProductMorphsim.Codomain(diagram, morphisms);
	nuArgs.morphisms = morphisms;
	nuArgs.properName = 'properName' in args ? args.properName : ProductMorphism.ProperName(morphisms);
	MultiMorphism.call(this, diagram, nuArgs);
}
Product.prototype.$(args)
{
	return this.morphisms.map((m, i) => m.$(args[i]));
}
//
// ProductMorphism static methods
//
ProductMorphism.prototype.Codename(diagram, morphisms)
{
	return `:${this.codomain.name}:Pm{${morphisms(m => m.name).join(',')}}mP`;
}
ProductMorphism.prototype.Domain(diagram, morphs)
{
	return ProductObject.Get(diagram, morphs.map(m => m.domain));
}
ProductMorphism.prototype.Codomain(diagram, morphs)
{
	return ProductObject.Get(diagram, morphs.map(m => m.codomain));
}
ProductMorphism.prototype.Get(diagram, morphisms)
{
	const name = ProductMorphism.Codename(diagram, morphisms);
	const m = diagram.getMorphism(name);
	return m === null ? new ProductMorphism(diagram, {morphisms}) : m;
}
ProductMorphism.prototype.ProperName(morphisms)
{
	return ProductObject.ProperName(morphisms);
}

//
// CoproductMorphism is a Morphism
//
CoproductMorphism(diagram, args)
{
	let nuArgs = Cat.clone(args);
	nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
	nuAargs.name = 'name' in args ? args.name : CoproductMorphism.Codename(diagram, morphisms);
	nuArgs.domain = CoproductMorphism.Domain(diagram, morphisms);
	nuArgs.codomain = CoproductMorphism.Codomain(diagram, morphisms);
	nuAargs.properName = 'properName' in args ? args.properName : CoproductMorphism.ProperName(morphisms);
	MultiMorphism.call(this, diagram, nuArgs);
}
CoproductMorphism.prototype.$(args)
{
	return [args[0], this.morphisms[args[0]].$(args[1])];
}
//
// CoproductMorphism static methods
//
CoproductMorphism.prototype.Codename(diagram, morphs)
{
	return `${this.codomain.name}:Cm{${morphs(m => m.name).join(',')}}mC`;
}
CoproductMorphism.prototype.Domain(diagram, morphs)
{
	return coproductObject.Get(diagram, morphs.map(m => m.domain));
}
CoproductMorphism.prototype.Codomain(morphs)
{
	return coproductObject.Get(diagram, morphs.map(m => m.codomain));
}
CoproductMorphism.prototype.Get(diagram, morphisms)
{
	const name = CoproductMorphism.Codename(diagram, morphisms);
	const m = diagram.getMorphism(name);
	return m === null ? new CoproductMorphism(diagram, {morphisms}) : m;
}
CoproductMorphism.prototype.ProperName(morphisms)
{
	return CoproductObject.ProperName(morphisms);
}

//
// ProductAssembly is a MultiMorphism
//
function ProductAssembly(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
	nuArgs.domain = ProductAssemblyMorphism.Domain(diagram, nuArgs.morphisms);
	nuArgs.codomain = ProductAssemblyMorphism.Codomain(diagram, nuArgs.morphisms);
	nuArgs.name = ProductAssembly.Codename(diagram, nuArgs.morhisms);
	nuArgs.properName = 'properName' in args ? args.properName : ProductAssembly.ProperName(nuArgs.morphisms);
	MultiMorphism.call(this, diagram, nuArgs);
}
ProductAssembly.prototype.$(args)
{
	return this.morphisms.map(m => m.$(args));
}
ProductAssembly.prototype.getGraph(data = {position:0})
{
	return this.mergeMorphismGraphs(graph);
}
//
// ProductAssembly static methods
//
ProductAssembly.prototype.Codename(diagram, morphisms)
{
	return `${this.codomain.name}:Pa{${morphisms.map(m => m.name).join(',')}}aP`;
}
ProductAssembly.prototype.Domain(diagram, morphisms)
{
	return morphisms[0].domain;
}
ProductAssembly.prototype.Codomain(diagram, morphisms)
{
	return ProductObject.Get(diagram, morphisms.map(m => m.codomain));
}
ProductAssembly.prototype.Get(diagram, morphisms)
{
	const name = ProductAssemblyMorphism.Codename(diagram, morphisms);
	const m = diagram.getMorphism(name);
	return m === null ? new ProductAssemblyMorphism(diagram, {morphisms}) : m;
}
ProductAssembly.prototype.ProperName(morphisms)
{
	return `Pa{${morphisms.map(m => m.codomain.properName).join(',')}}`;
}

//
// CoproductAssembly is a Morphism
//
function CoproductAssembly(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
	nuArgs.name = CoproductAssembly.Codename(diagram, nuArgs.morphisms);
	nuArgs.domain = CoproductAssemblyMorphism.Domain(diagram, nuArgs.morphisms);
	nuArgs.codomain = CoproductAssemblyMorphism.Codomain(diagram, nuArgs.morphisms);
	nuArgs.properName = 'properName' in args ? args.properName : CoproductAssembly.ProperName(nuArgs.morphisms);
	MultiMorphism.call(this, diagram, nuArgs);
}
CoproductAssembly.prototype.getGraph(data = {position:0})
{
	return this.mergeMorphismGraphs(graph)
}
//
// CoproductAssembly static methods
//
CoproductAssembly.prototype.Codename(diagram, morphisms)
{
	return `:${this.codomain.name}:Ca{${morphisms.map(m => m.name).join(',')}}aC`);
}
CoproductAssembly.prototype.Domain(diagram, morphisms)
{
	return CoproductObject.Get(diagram, morphisms.map(m => m.domain));
}
CoproductAssembly.prototype.Codomain(diagram, morphisms)
{
	return morphisms[0].codomain;
}
CoproductAssembly.prototype.Get(diagram, morphisms)
{
	const name = CoproductAssemblyMorphism.Codename(diagram, morphisms);
	const m = diagram.getMorphism(name);
	return m === null ? new CoproductAssemblyMorphism(diagram, {morphisms}) : m;
}
CoproductAssembly.prototype.ProperName(morphisms)
{
	return `(${morphisms.map(m => m.properName).join(',')})`;
}

//
// FactorMorphism is a Morphism
//
function FactorMorphism(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.name = 'name' in args ? args.name : FactorMorphism.Codename(domain, factors);
	nuArgs.domain = diagram.getObject(args.domain);
	nuArgs.codomain = FactorMorphism.Codomain(diagram, nuArgs.domain, nuArgs.factors);
	nuArgs.properName = FactorMorphism.ProperName(nuArgs.domain, nuArgs.factors);
	Morphism.call(this, diagram, nuArgs);
	this.factors = nuArgs.factors;
}
FactorMorphism.prototype.$(args)
{
	const r = this.factors.map(f => f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
	return r.length === 1 ? r[0], r;
}
FactorMorphism.prototype.signature()
{
	return Cat.sha256(`${this.category.name} ${this.prototype.name} ${factors.map(f => f.join('-')).join(':')}`);
}
FactorMorphism.prototype.json()
{
	const a = super.json();
	a.factors = this.factors;
	return a;
}
FactorMorphism.prototype.getGraph(data)
{
	const graph = super.getGraph(data, first);
	const domain = graph.graphs[0];
	const codomain = graph.graphs[1];
	let offset = 0;
	this.factors.map((r, i) =>
	{
		const d = domain.getFactor(r);
		if (d === null)
		{
			++offset;
			return;
		}
		const codomain = this.factors.length === 1 ? codomain : codomain.getFactor([i]);
		const domRoot = r.slice();
		domRoot.unshift(0);
		domain.bindGraph(true, {cod:codomain, link:[], tag:'factor', domRoot, codRoot:m.factors.length > 1 ? [1, i] : [1], offset});
	});
	graph.tagGraph(this.prototype.name);
	return graph;
}
//
// FactorMorphism static methods
//
FactorMorphism.prototype.Codename(domain, factors)
{
	let name = `:${this.codomain.name}:Fa{${domain.name},`;
	for (let i=0; i<factors.length; ++i)
	{
		const indices = factors[i];
		const f = domain.getFactor(indices);
		if (f.name !== 'One')
			name += f.name + ',' + indices.join(',');
		else
			name += f.name;
		if (i !== factors.length -1)
			name += ',';
	}
	name += '}aF';
	return name;
}
FactorMorphism.prototype.Codomain(diagram, domain, factors)
{
	return ProductObject.Get(diagram, factors.map(f => domain.getFactor(f)));
}
FactorMorphism.prototype.Get(diagram, domain, factors)
{
	const name = FactorMorphism.Codename(domain, factors);
	const m = diagram.getMorphism(name);
	return m === null ? new FactorMorphism(diagram, {domain, factors}) : m;
}
FactorMorphism.prototype.ProperName(domain, factors)
{
	return `&lt;${factors.map(f => domain.getFactorProperName(f)).join(',')}&gt;`;
}

//
// DiagonalMorphism is a Morphism
//
function DiagonalMorphism(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	nuArgs.count = Cat.getArg(args, 'count', 2);
	if (count < 2)
		throw 'count is not two or greater';
	const objects = [];
	nuArgs.codomain = DiagonalMorphism.Codomain(diagram, objects.fill(nuArgs.domain, 0, nuArgs.count));
	nuArgs.name DiagonalMorphism.Codename(nuArgs.domain, nuArgs.count);
	Morphism.call(this, diagram, nuArgs);
	this.count = nuArgs.count;
}
DiagonalMorphism.prototype.$(args)
{
	const d = [];
	return d.fill(args, 0, this.count);
}
DiagonalMorphism.prototype.getGraph(data = {position:0})
{
	const graph = super.getGraph(data, first);
	const domain = graph.graphs[0];
	const codomain = graph.graphs[1];
	codomain.map((g, i) => domain.bindGraph({cod:g, link:[], domRoot:[0], codRoot:[1, i], offset:0}));
	graph.tagGraph(this.prototype.name);
	return graph;
}
//
// DiagonalMorphsm static methods
//
DiagonalMorphism.prototype.Codename(domain, count)
{
	return `:${this.codomain.name}:Dm{${domain.name}:${count}}mD`;
}
DiagonalMorphism.prototype.Codomain(diagram, object, count)
{
	const objects = [];
	return ProductObject.Get(diagram, objects.fill(object, 0, count);
}
DiagonalMorphism.prototype.Get(diagram, domain, count)
{
	if (count < 2)
		throw 'Count is less than 2';
	const name = DiagonalMorphism.Codename(domain);
	const m = diagram.getMorphism(name);
	return m === null ? new DiagonalMorphism(diagram, {domain, count}) : m;
}
DiagonalMorphism.prototype.ProperName(domain, factors)
{
	return `&delta;&lt;${this.domain.properName}:${this.count}&gt;`;
}

//
// FoldMorphism is a Morphism
//
function FoldMorphism(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.codomain = diagram.getObject(args.codomain);
	nuArgs.count = Cat.getArg(args, 'count', 2);
	if (count < 2)
		throw 'count is not two or greater';
	const objects = [];
	nuArgs.domain = FoldMorphism.Domain(diagram, objects.fill(nuArgs.codomain, 0, nuArgs.count));
	nuArgs.name FoldMorphism.Codename(nuArgs.domain, nuArgs.count);
	Morphism.call(this, diagram, nuArgs);
	this.count = nuArgs.count;
}
FoldMorphism.prototype.$(args)
{
	return args[1];
}/
// FoldMorphsm static methods
//
FoldMorphism.prototype.Codename(domain, count)
{
	return `:${this.codomain.name}:Fm{${domain.name}:${count}}mF`;
}
FoldMorphism.prototype.Domain(diagram, object, count)
{
	const objects = [];
	nuArgs.domain = CoproductObject.Get(diagram, objects.fill(object, 0, count));
}
FoldMorphism.prototype.Get(diagram, domain, count)
{
	if (count < 2)
		throw 'count is not two or greater';
	const name = FoldMorphism.Codename(domain, count);
	const m = diagram.getMorphism(name);
	return m === null ? new FoldMorphism(diagram, {codomain, count}) : m;
}
FoldMorphism.prototype.ProperName(domain, factors)
{
	return `&nabla;&lt;${this.domain.properName}:${this.count}&gt;`;
}

//
// DataMorphism is a Morphism
//
// These do not live in the diagram source categories.
//
function DataMorphism(diagram, args)
{
	const dom = this.getObject(args.domain);
	if (dom.name !== 'N' or dom.name !== 'One')
		throw 'Domain is not N or 1`;
	const cod = this.getObject(args.codomain);
	if (!cod.isEditable())
		throw `Codoamin ${cod.properName} is not editable`;
	Morphism.call(this, diagram, args);
	this.data = Cat.getArg(args, 'data', {});
	this.limit = Cat.getArg(args. 'limit', Number.MAX_SAFE_INTEGER);
}
DataMorphisms.prototype.$(args)
{
	return args in this.data ? this.data[args];
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
//
// DataMorphism static methods
//

//
// Recursive is a DataMorphism
//
function Recursive(diagram, args)
{
	DataMorphism.call(this, diagram, args);
	this.setRecursor(args.recursor);
	this.setSignature();
}
Recursive.prototype.$()
{
	this.updateRecursor();	// TODO still needed?
	if (args in this.data)
		return this.data[args];
	if (Object.keys(this.data).length === 0)
	{
		if (args[0] === 0)
			return args[2];
		if (args[1] === 1)
			return eval([args[1], args[2])
	}
	if (this.recursor)
		return this.recursor.$(args);
	return null;
}
Recursive.prototype.getGraph(data = {position:0})
{
	// TODO
	return StringMorphism.graph(this.diagram, this.recursor);
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

//
// LambdaMorphism is a Morphism
//
function LambdaMorphism(diagram, args)
{
	const preCurry = Morphism.isPrototypeOf(args.preCurry) ? args.preCurry : diagram.codomain.getMorphism(args.preCurry);
	let nuArgs = Cat.clone(args);
	nuArgs.domain = LambdaMorphism.Domain(diagram, preCurry, arg.domFactors);
	nuArgs.codomain = LambdaMorphism.Codomain(diagram, preCurry, arg.homFactors);
	nuArgs.description = 'description' in args ? args.description : `The currying of the morphism ${this.preCurry.properName} by the factors ${this.homFactors.toString()}`;
	Morphism.call(this, diagram, nuArgs);
	this.name = 'name' in args ? args.name : LambdaMorphism.Codename(diagram, preCurry, args.domFactors, args.homFactors);
	this.properName = this.properName === '' ? LambdaMorphism.ProperName(preCurry, args.domFactors, args.homFactors) : this.properName;
	this.preCurry = preCurry;
	this.preCurry.incrRefcnt();
	this.domFactors = args.domFactors;
	this.homFactors = args.homFactors;
	const domPermutation = args.domFactors.map(f => f[1]);
	const homPermutation = args.homFactors.map(f => f[1]);
	const centralDomain = ProductObject.Get(this.diagram, [this.codomain.objects[0], this.domain]);
	this.factors = this.diagram.codomain.addFactorMorphism(centralDomain, [homPermutation, domPermutation]);
	this.setSignature();
}
LambdaMorphism.prototype.$(args)
{
	return {$:function(b)
				{
					const those = this.that.factors.$([this.args, b]);
					return this.that.preCurry.$(those);
				},
				args,
				that:this
			};
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
LambdaMorphism.prototype.getGraph(data = {position:0})
{
	const graph = super.getGraph(data);
	const preCurryGraph = this.preCurry.getGraph(data);
	const map = this.domFactors.map((f, i) => [f, [0, i]]);
	if (this.domFactors.length === 1)
	{
		const f = map[0];
		map[0] = [f[0], [f[1][1]]];
	}
	const dom = graph.graphs[0];
	const cod = graph.graphs[1];
	const homDom = cod.graphs[0];
	const homCod = cod.graphs[1];
	const homMap = this.homFactors.map((f, i) => [f, [1, 0, i]]);
	if (this.homFactors.length === 1)
	{
		const f = homMap[0];
		homMap[0] = [f[0], [1, 0]];
	}
	map.push(...homMap);
	map.push([[1], [1, 1]]);
	this.domFactors.map((f, i) => (dom.isLeaf() ? dom : dom.data[i]).copyGraph({map, src:preCurryGraph.getFactor(f)}));
	this.homFactors.map((f, i) => (homDom.isLeaf() ? homDom : homDom.data[i]).copyGraph({map, src:preCurryGraph.getFactor(f)}));
	homCod.copyGraph({map, src:preCurryGraph.graph.data[1]});
	graph.tagGraph(this.prototype.name);
	return graph;
}
//
// LambdaMorphism static methods
//
LambdaMorphism.prototype.Codename(diagram, preCurry, domFactors, homFactors)
{
	const preCur = diagram.codomain.getMorphism(preCurry);
	const hom = HomObject.Get(diagram, [preCurry.domain, preCurry.codomain]);
	return `:${this.codomain.name}:Lm{${preCur.name},${ProductObject.Codename(domFactors.map(f => hom.getFactorName(f)))},${ProductObject.Codename(codFactors.map(f => hom.getFactorName(f)))}}mL';
}
LambdaMorphism.prototype.Domain(diagram, preCurry, factors)
{
	return ProductObject.Get(diagram, factors.map(f => preCurry.domain.getFactor(f)));
}
LambdaMorphism.prototype.Codomain(diagram, preCurry, factors)
{
	const codDom = ProductObject.Get(diagram, factors.map(f => preCurry.domain.getFactor(f)));
	return HomObject.Get(diagram, [codDom, preCurry.codomain]);
}
LambdaMorphism.prototype.Get(diagram, preCurry, domFactors, homFactors)
{
	const name = LambdaMorphism.Codename(diagram, preCurry, domFactors, homFactors);
	const m = diagram.getMorphism(name);
	return m === null ? new LambdaMorphism(diagram, {preCurry, domFactors, homFactors}) : m;
}
LambdaMorphism.prototype.ProperName(preCurry, domFactors, homFactors)
{
	return `&lambda;.${preCurry.properName}&lt;${domFactors}:${homFactors}`;
}

//
// StringMorphism is a Morphism
//
function StringMorphism(diagram, src)
{
	Morphism.call(this, diagram, {origin:graph, domain:src.domain, codomain:src.codomain, name:src.name, diagram});
	this.source = src;
//	this.sequence = Sequence.Get(diagram, {[src.domain, src.codomain]});
	this.graph = src.getGraph();	// a graph is like a net list between the ports
}
StringMorphism.prototype.SvgLinkUpdate(dom, lnk, data)	// data {graph, dom:{x,y}, cod:{x,y}}
{
	const isDomLink = lnk[0] === 0;
	const f = Cat.getFactor(data.graph, lnk);
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
StringMorphism.prototype.UpdateSVG(dgrm, expr, first, data)	// data {index, graph, dom:{x,y}, cod:{x,y}, visited, elementId}
{
	return element.expandExpression(dgrm, expr,
		function(dgrm, expr, first, data)
		{
			if (!StringMorphism.isGraphable(expr))
				return;
			const dom = {x:Math.round(expr.position + (expr.width/2.0) + (data.index[0] === 0 ? data.dom.x : data.cod.x)), y:data.index[0] === 0 ? data.dom.y : data.cod.y};
			const color = Math.round(Math.random() * 0xffffff).toString(16);
			const srcKey = StringMorphism.linkColorKey(data.index, data.dom.name, data.cod.name);
			let colorIndex = dgrm.link2colorIndex[srcKey];
			while(colorIndex in dgrm.colorIndex2colorIndex)
				colorIndex = dgrm.colorIndex2colorIndex[colorIndex];
			for (let i=0; i<expr.links.length; ++i)
			{
				const lnk = expr.links[i];
				const lnkStr = lnk.toString();
				const lnkKey = StringMorphism.linkColorKey(lnk, data.dom.name, data.cod.name);
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
				const d = StringMorphism.svgLinkUpdate(dom, lnk, data);
				const linkId = StringMorphism.linkId(data, lnk);
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
				StringMorphism.updateSVG(dgrm, e, false, data);
				data.index.pop();
			}, '');
		},
		function(dgrm, expr, first, data)
		{
			data.index.push(0);
			StringMorphism.updateSVG(dgrm, expr.lhs, false, data);
			data.index.pop();
			data.index.push(1);
			StringMorphism.updateSVG(dgrm, expr.rhs, false, data);
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
	const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
	const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
	StringMorphism.updateSVG(dgrm, sm.graph, true, {index:[], graph:sm.graph, dom, cod, visited:[], elementId:from.elementId()});
}
StringMorphism.prototype.RemoveStringSvg(from)
{
	const id = StringMorphism.GraphId(from);
	const svgElt = document.getElementById(id);
	if (svgElt !== null)
	{
		svgElt.remove();
		return true;
	}
	return false;
}
//
// StringMorphism static methods
//
StringMorphism.Get(graphCat, m)
{
	const s = graphCat.getMorphism(m.name);
	if (s)
		return s;
	return StringMorphism.makeGraph(graphCat, m);
}
StringMorphism.prototype.GraphId(m)
{
	return `graph_${m.elementId()}`;
}

//
// Evaluation is a Morphism
//
function Evaluation(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	if (!Evaluation.CanEvaluate(nuArgs.domain))
		throw 'object for evaluation domain cannot be evaluated';
	nuArgs.name = Evaluation.Codename(diagram, nuArgs.domain);
	nuArgs.codoamin = nuArgs.domain.objects[0].objects[1];
	nuArgs.properName = Evaluation.ProperName(nuArgs.domain);
	Morphism.call(this, diagram, nuArgs);
}
Evaluation.prototype.$(args)
{
	if (typeof args[0] === 'string')
		args[0] = this.diagram.getMorphism(args[0]);
	return args[0].$([args[1]]);
}
Evaluation.prototype.getGraph()
{
	const graph = super.getGraph();
	const domain = graph.graphs[0];
	const domHom = domain.graphs[0];
	const codomain = graph.graphs[1];
	domain.graphs[1].bindGraph({cod:domHom.graphs[0], link:[], domRoot:[0, 1], codRoot:[0, 0, 0], offset:0});
	domHom.graphs[1].bindGraph(true, {cod:codomain, link:[], function:'eval', domRoot:[0, 0, 1], codRoot:[1], offset:0});
	this.tagGraph(this.prototype.name);
	return graph;
}
Evaluation.prototype.$(args)
{
	return args[0].$([args[1]]);
}
//
// Evaluation static methods
//
// Check that the object is of the form [A, B] x A
//
Evaluation.prototype.CanEvaluate(object)
{
	return
		ProductObject.isPrototypeOf(object) &&
		object.objects.length === 2 &&
		HomObject.isPrototypeOf(object.objects[0]) &&
		object.objects[0].objects[0].isEquivalent(object.objects[1]);
}
Evaluation.prototype.Codename(diagram, object)
{
	return `:${diagram.codomain.name}:Ev{${object.name}}vE`;
}
Evaluation.prototype.ProperName(diagram, object)
{
	return `Ev&lt;${object.properName}&gt;`;
}
Evaluation.prototype.Get(diagram, domain)
{
	const name = Evaluation.Codename(diagram, domain);
	const m = diagram.getMorphism(name);
	return m === null ? new Evaluation(diagram, {domain}) : m;
}

//
// InitialMorphism is a Morphism
//
function InitialMorphism(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.codomain = diagram.getObject(args.codomain);
	nuArgs.domain = diagram.getObject('0');
	if (!nuArgs.domain)
		throw 'no initial object';
	nuArgs.name = InitialMorphism.Codename(diagram, nuArgs.codomain);
	nuArgs.properName = 'properName' in args ? args.properName : InitialMorphism.ProperName());
	Morphism.call(this, diagram, nuArgs);
}
//
// InitialMorphism static methods
//
InitialMorphism.prototype.Codename(diagram, domain, codomain = null)
{
	return `:${diagram.codomain.name}:In{${basename}}nI`;
}
InitialMorphism.prototype.Get(diagram, codomain)
{
	const name = InitialMorphism.Codename(diagram, codomain);
	const m = diagram.getMorphism(name);
	return m === null ? new InitialMorphism(diagram, {codomain}) : m;
}
InitialMorphism.prototype.ProperName()
{
	return '0';
}

//
// MonoidalCategory is a Category
//
function MonoidalCategory(args)
{
	Category.call(this, args);
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

//
// Functor is a Morphism
//
// Generally expect diagram to be CatDgrm.
//
function Functor(diagram, args)
{
	const domain = diagram.getObject(args.domain);
	if (!Category.isPrototypeOf(domain))
		throw 'functor domain is not a category';
	const codomain diagram.getObject(args.codomain);
	if (!Category.isPrototypeOf(codomain))
		throw 'functor codomain is not a category';
	Morphism.call(this, diagram, args);
}
//
// FITB
//
// Note that only morphisms need to be mapped to properly define the functor.
// If you want to map an object, map its identity and take its domain.
//
Functor.prototype.$(args)
{
	throw `functor ${this.name} is not defined`;
}

//
// IdentityFunctor is an Identity and a Functor
//
function IdentityFunctor(diagram, args)
{
	Identity.call(this, diagram, args);
	Functor.call(this, diagram, this);
}
IdentityFunctor.prototype.$(args)
{
	return args;
}

//
// NProductFunctor is a Functor
//
function NProductFunctor(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	const objects = [];
	nuArgs.codomain = ProductObject.Get(diagram, objects.fill(nuArgs.domain, 0, args.count));
	nuArgs.count = Cat.getArg(args, 'count', 2);
	if (count < 2)
		throw 'invalid count';
	nuArgs.name = NProductFunctor.Codename(diagram, nuArgs.domain, nuArgs.count)
	nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : NProductFunctor.ProperName(diagram, nuArgs.domain, nuArgs.count)
	Functor.call(this, $CatDgrm, nuArgs);
	this.count = args.count;
}
NProductFunctor.prototype.$(args)
{
	return ProductMorphism.Get(this.diagram, morphisms.fill(args[0], 0, this.count));
}
//
// DiagonalMorphism static methods
//
NProductFunctor.prototype.Codename(diagram, domain, count)
{
	return `:${diagram.codomain.name}:Nf{${domain.name}:${count}}fN`;
}
NProductFunctor.prototype.ProperName(domain, count)
{
	return `&Pi;&lt;${domain.properName}:${count}&gt;>`;
}
NProductFunctor.prototype.Get(diagram, domain, count)
{
	const f = diagram.getMorphism(NProductFunctor.Codename(diagram, domain, count));
	return f ? f : new NProductFunctor(diagram, {domain, count});
}

//
// Diagram is a Functor
//
function Diagram(args)
{
	let nuArgs = Cat.clone(args);
	let domain = null;
	//
	// the diagram's name is the target category's name, the user name, and the name provided by the user
	//
	const basename = Element.Codename(args)'
	trackingName = `${args.codomain}:${args.user}:${args.basename}`;
	if ($Cat.getMorphism(trackingName))
		throw `Diagram domain category ${name} already exists.`;
	const domain = new IndexCategory('domainData' in args ? args.domainData : {name});
	nuArgs.name = Diagram.Codename(args);
	nuArgs.domain = domain;
	//
	// new diagrams always target new sub-categories
	//
	nuArgs.codomain = new Category({basename:args.codomain, subobject:args.codomain});
	Functor.call(this, $Cat, nuArgs);	// TODO $Cat should be a diagram
	//
	// diagrams can have references to other diagrams
	//
	if ('references' in args)
		this.references = args.references.length > 0 ? args.references.map(ref => Cat.getDiagram(ref)) : [];
	else
		this.references = [];
	this.makeHomSets();
	this.updateElements();
	//
	// the currently selected objects and morphisms in the GUI
	//
	this.selected = [];
	//
	// where are we viewing the diagram
	//
	this.viewport = Cat.getArg(args, 'viewport', {x:0, y:0, scale:1, width:Display.Width(), height:Display.Height()});
	if (isGUI && this.viewport.width === 0)
	{
		this.viewport.width = window.innerWidth;
		this.viewport.height = window.innerHeight;
		this.viewport.scale = 1;
	}
	this.timestamp = Cat.getArg(args, 'timestamp', Date.now());
	Cat.addDiagram(this.codomain.name, this);
	this.elements = 'elements' in args ? args.elements.map(d => new DiagramElement(this, d)) : [];
	//
	// load the codomain data so we get its objects and morphisms
	//
	if ('codomainData' in args)
		this.codomain.Process(this, args.codomainData);
	this.textId = Cat.getArg(args, 'textId', 0);
	//
	// the graph category for the string morphisms
	//
	this.graphCat = new Category({basename:'Graph', subobject:'Graph', objects:this.codomain.objects});
	this.colorIndex2colorIndex = {};
	this.colorIndex2color = {};
	this.link2colorIndex = {};
	this.colorIndex = 0;
	this.toolbarElt = document.getElementById('toolbar');
	this.toolbarTipElt = document.getElementById('toolbarTip');
}
Diagram.prototype.info()
{
	let d = super.json();
	d.viewport =	this.viewport;
	d.references =	this.references.map(r => r.name);
	d.textId =		this.textId;
	d.timestamp =	this.timestamp;
	return d;
}
Diagram.prototype.json()
{
	let d = this.info();
	d.domainData =	this.domain.json();
	d.codomainData =this.codomain.json();
	d.elements =	this.elements.map(t => t.json());
	return d;
}
Diagram.prototype.object(object)
{
	if (!DiagramObject.isPrototypeOf(object))
		throw `object ${object.name} is not a DiagramObject`;
	return object.to;
}
Diagram.prototype.morphism(morphism)
{
	if (!DiagramMorphism.isPrototypeOf(morphism))
		throw `morphism ${morphism.name} is not a DiagramObject`;
	return morphism.to;
}
//
// Retrieve an object from the diagram's target category.
//
Diagram.prototype.getObject(name)
{
	//
	// if it is already an element, return it
	//
	if (Element.isPrototypeOf(name))
		return name;
	//
	// if it is an operator name, then it must be for this diagram's category
	//
	if (Cat.opEx(name))
		return this.codomain.getObject(name);
	//
	// search the reference diagrams
	//
	for (let i=0; i<this.references.length; ++i)
	{
		const object = this.references[i].getObject(name);
		if (object)
			return object;
	}
	//
	// last chance try the diagram's domain graph category
	//
	return this.domain.getObject(name);
}
Diagram.prototype.getMorphism(name)
{
	//
	// if it is already an object, return it
	//
	if (Morphism.isPrototypeOf(name))
		return name;
	//
	// if it is an operator name, then it must be for this diagram's category
	//
	if (Cat.opEx(name))
		return this.codomain.getMorphism(name);
	//
	// search the reference diagrams
	//
	for (let i=0; i<this.references.length; ++i)
	{
		const object = this.references[i].getMorphism(name);
		if (object)
			return object;
	}
	//
	// last chance try the diagram's domain graph category
	//
	return this.domain.getMorphism(name);
}
Diagram.prototype.gui(e, elt, fn)
{
	try
	{
		this[fn](e, elt);
	}
	catch(x)
	{
		display.recordError(x);
	}
}
Diagram.prototype.saveLocal()
{
	if (Cat.debug)
		console.log('save to local storage', Diagram.StorageName(this.name));
	this.timestamp = Date.now();
	localStorage.setItem(Diagram.StorageName(this.name), this.stringify());
}
Diagram.prototype.setView()
{
	display.diagramSVG.setAttribute('transform', `translate(${this.viewport.x}, ${this.viewport.y})scale(${this.viewport.scale})`);
}
Diagram.prototype.update(e, sel = null, hom = false, save = true)
{
	this.setView();
	if (e && sel)
		this.addSelected(e, sel, true);
	if (hom)
		this.makeHomSets();
	this.updateMorphisms();
	if (save && Cat.autosave)
		this.saveLocal();
	if (DiagramObject.isPrototypeOf(sel))
		objectPanel.update();
	else if (DiagramMorphism.isPrototypeOf(sel))
		morphismPanel.update();
	else if (DiagramElement.isPrototypeOf(sel))
		elementPanel.update();
}
/*
Diagram.prototype.clear(e)
{
	if (this.readonly)
		return;
	Cat.display.deactivateToolbar();
	this.domain.clear();
	this.codomain.clear();
	this.selected = [];
	this.makeHomSets();
	this.elements = [];
	Cat.display.diagramSVG.innerHTML = Cat.getDiagram().makeAllSVG();
	Cat.updatePanels();
	if ('orig' in this.viewport)
		delete this.viewport.orig;
	this.update(e);
}
*/
Diagram.prototype.addSelected(e, elt, clear = false)
{
	if (clear)
		this.deselectAll(false);
	if (elt === null)
		return;
	elt.showSelected();
	if (this.selected.indexOf(elt) >= 0)
	{
		this.activateToolbar(e);
		return;
	}
	this.selected.push(elt);
	if (DiagramObject.isPrototypeOf(elt))	// TODO what about morphisms as objects in 2Cat?
		elt.orig = {x:elt.x, y:elt.y};
	else
	{
		elt.domain.orig = {x:elt.domain.x, y:elt.domain.y};
		elt.codomain.orig = {x:elt.codomain.x, y:elt.codomain.y};
		if (DataMorphism.isPrototypeOf(elt) && elt.name !== document.getElementById('dataPanelTitle').innerHTML)
			dataPanel.close();
	}
	this.activateToolbar(e);
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
		//
		// do not just arbitrarily decrement the reference count
		//
		if (s.isDeletable())
			s.decrRefcnt();
		if (DiagramObject.isPrototypeOf(s))	// TODO what about morphisms as objects in 2Cat?
			updateOjects = true;
		else if (DiagramMorphism.isPrototypeOf(s))
			updateMorphisms = true;
		else if (DiagramElement.isPrototypeOf(s))
			updateTexts = true;
	}
	this.update(null, null, updateMorphisms, true);
	if (updateObjects)
		objectPanel.update();
	if (updateMorphisms)
		morphismPanel.update();
	if (updateTexts)
		elementPanel.update();
}
Diagram.prototype.pickElement(e, name, cls)
{
	let elt = null;
	switch(cls)
	{
		case 'text':
			const elts = this.elements.filter(t => t.name === name);
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
			if (display.mouseDown)
				display.drag = true;
		}, Cat.default.dragDelay);
		display.dragStart = this.mousePosition(e);
		if (!this.isSelected(elt))
			this.addSelected(e, elt, !display.shiftKey);
		else
			this.activateToolbar(e);
		if (DiagramObject.isPrototypeOf(elt)
			elt.orig = {x:elt.x, y:elt.y};
	}
	else if (!display.shiftKey)
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
		const to = this.newDataMorphism(from.to.domain, from.to.codomain);
		this.setMorphism(from, to);
		this.updateElementAttribute(from, 'properName', to.properName);
		this.update(e, from, true);
	}
	dataPanel.update();
	dataPanel.open();
}
Diagram.prototype.deleteAll()
{
	this.deselectAll();
	this.domain.clear();	// TODO
	this.codomain.clear();	// TODO
	if ('homSets' in this.domain)
		this.domain.homSets.clear();
}
Diagram.prototype.isMorphismEditable(from)
{
	return !this.readonly &&
		(DataMorphism.isPrototypeOf(from.to) ||
		(Identity.isPrototypeOf(from.to) && from.refcnt === 1 && !from.to.domain.isInitial && !from.to.codomain.isTerminal && from.to.domain.isEditable()));
}
Diagram.prototype.toolbar(from)
{
	const del = !this.readonly && from.isDeletable();
	let btns = H.td(display.getButton('close', 'display.deactivateToolbar()', 'Close'), 'buttonBar') +
				(del ? H.td(display.getButton('delete', `Cat.getDiagram().gui(evt, this, 'removeSelected')`, 'Delete'), 'buttonBar') : '');
	if (!this.readonly)
	{
		if (DiagramMorphism.isPrototypeOf(from))
		{
			const domMorphs = this.domain.obj2morphs.get(from.domain);
			if (del && domMorphs.dom.length + domMorphs.cod.length > 1)
				btns += H.td(display.getButton('detachDomain', `Cat.getDiagram().guiDetach(evt, 'domain')`, 'Detach domain'), 'buttonBar');
			const codMorphs = this.domain.obj2morphs.get(from.codomain);
			if (del && codMorphs.dom.length + codMorphs.cod.length > 1)
				btns += H.td(display.getButton('detachCodomain', `Cat.getDiagram().guiDetach(evt, 'codomain')`, 'Detach codomain'), 'buttonBar');
			const isEditable = this.isMorphismEditable(from);
			if (isEditable)
				btns += H.td(display.getButton('edit', `Cat.getDiagram().gui(evt, this, 'editSelected')`, 'Edit data'), 'buttonBar');
			else if (Composite.isPrototypeOf(from.to) && from.to.isIterable())
				btns += (!this.readonly ? H.td(display.getButton('run', `Cat.getDiagram().gui(evt, this, 'run')`, 'Evaluate'), 'buttonBar') : '');
			if (this.codomain.isClosed && (ProductObject.isPrototypeOf(domain) || HomObject.isPrototypeOf(codomain)))
				btns += H.td(display.getButton('lambda', `Cat.getDiagram().gui(evt, this, 'lambdaForm')`, 'Curry'), 'buttonBar');
			btns += H.td(display.getButton('string', `Cat.getDiagram().gui(evt, this, 'displayString')`, 'String'), 'buttonBar');
		}
		else if (DiagramObject.isPrototypeOf(from)
			btns += H.td(display.getButton('copy', `Cat.getDiagram().copyObject(evt)`, 'Copy object'), 'buttonBar') +
					H.td(display.getButton('toHere', `Cat.getDiagram().toolbarHandler('codomain', 'toolbarTip')`, 'Morphisms to here'), 'buttonBar') +
					H.td(display.getButton('fromHere', `Cat.getDiagram().toolbarHandler('domain', 'toolbarTip')`, 'Morphisms from here'), 'buttonBar') +
					H.td(display.getButton('project', `Cat.getDiagram().gui(evt, this, 'Diagram.factorBtnCode')`, 'Factor morphism'), 'buttonBar');
//					(this.hasDualSubExpr(from.to.expr) ? H.td(display.getButton('distribute', `Cat.getDiagram().gui(evt, this, 'distribute')`, 'Distribute terms'), 'buttonBar') : '');	// TODO whereto?
	}
	btns += DiagramMorphism.isPrototypeOf(from) ? H.td(display.getButton('symmetry', `Cat.getDiagram().gui(evt, this, 'flipName')`, 'Flip text'), 'buttonBar') : '';
	btns += H.td(display.getButton('help', `Cat.getDiagram().gui(evt, this, 'elementHelp')`, 'Description'), 'buttonBar');
	let html = H.table(H.tr(btns), 'buttonBarLeft') + H.br();
	return html;
}
Diagram.prototype.toolbarHandler(dir, id)
{
	if (this.selected.length !== 1)
		return;
	const from = this.getSelected();
	if (DiagramObject.isPrototypeOf(from))
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
		html += H.table(Display.MorphismTableRows(morphs, `onclick="Cat.getDiagram().objectPlaceMorphism(event, '${dir}', '${from.name}', '%1')"`), 'toolbarTbl');
		morphs = this.getTransforms(dir, from.to);
		html += H.small('Transforms:');
		html += H.table(Display.MorphismTableRows(morphs, `onclick="Cat.getDiagram().placeTransformMorphism(event, '%1', '${dir}', '${from.name}')"`), 'toolbarTbl');
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
					H.button('1', '', display.elementId(), 'Add terminal object',
					`onclick="Cat.getDiagram().addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
				this.getFactorButtonCode(from.to, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
				H.h5('Codomain Factors') + H.br() +
				H.small('Click to remove from codomain') +
				H.div('', '', 'codomainDiv');
	this.toolbarTipElt.innerHTML = html;
}
// Diagram.prototype.getFactorButton(obj, txt, data, action, title)
// {
//		return H.td(H.button(obj.text + txt, '', display.elementId(), title,
//			`data-indices="${data.index.toString()}" onclick="Cat.getDiagram().${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`));
// }
Diagram.prototype.factorBtnCode()
{
	const from = this.getSelected();
	const to = from.to;
	let html = H.h4('Create Factor Morphism') +
				H.h5('Domain Factors') +
				H.small('Click to place in codomain') +
					H.button('1', '', display.elementId(), 'Add terminal object',
					`onclick="Cat.getDiagram().addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
				to.factorButton({fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
				H.h5('Codomain Factors') + H.br() +
				H.small('Click to remove from codomain') +
				H.div('', '', 'codomainDiv');
	this.toolbarTipElt.innerHTML = html;
}
Diagram.prototype.lambdaMorphism(e)	// TODO moved
{
	const from = this.getSelected();
	let domFactors = diagram.getFactorsByDomCodId('domainDiv');
	let homFactors = diagram.getFactorsByDomCodId('codomainDiv');
	const m = LambdaMorphism.Get(this, {preCurry:from.to, domFactors, homFactors});
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
	const id = StringMorphism.GraphId(from);
	if (StringMorphism.RemoveStringSvg(from))
		return;
	const graphFunctor = $Cat.getMorphism('Graph');
	const sm = graphFunctor.$(this, from.to);
	const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
	const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
	const svg = `<g id="${id}">${sm.graph.svg(this, {index:[], dom, cod, visited:[], elementId:from.elementId(), color:Math.floor(Math.random()*12)})}</g>`;
	display.diagramSVG.innerHTML += svg;
}
Diagram.prototype.getSubFactorBtnCode(object, data)
{
	let html = '';
	/*
	if ('data' in expr)
		for(let i=0; i<expr.data.length; ++i)
			html += H.button(this.getObject(expr.data[i]).properName + H.sub(i), '', display.elementId(), '', `data-factor="${data.dir} ${i}" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
	else
		html += H.button(this.getObject(expr).properName, '', display.elementId(), '', `data-factor="${data.dir} -1" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
		*/
	return html;
}
Diagram.prototype.lambdaForm(event, elt)
{
	const from = this.getSelected();
	this.lambdaBtnForm(from.to.domain, from.to.codomain, from.to.domain.name);
}
Diagram.prototype.lambdaBtnForm(domain, codomain, root)
{
	const html =
		H.h4('Curry A &otimes; B -> [C, D]') +
		H.h5('Domain Factors: A &otimes; B') +
		H.small('Click to move to C') +
		H.div(domain.getSubFactorBtnCode({dir:	0, fromId:'domainDiv', toId:'codomainDiv'}), '', 'domainDiv') +
		H.h5('Codomain Factors: C') +
		(HomObject.isPrototypeOf(codomain) ?
			H.small('Merge to codomain hom') + display.getButton('codhom', `Cat.getDiagram().toggleCodHom()`, 'Merge codomain hom', Cat.default.button.tiny) + H.br() : '') +
		H.small('Click to move to A &otimes; B') +
		// TODO this factorButton arguments are not correct
		H.div(HomObject.isPrototypeOf(codomain) ? codomain.homDomain().factorButton({dir:1, fromId:'codomainDiv', toId:'domainDiv'}) : '', '', 'codomainDiv') +
		H.span(display.getButton('edit', `Cat.getDiagram().gui(evt, this, 'lambdaMorphism')`, 'Curry morphism'));
	this.toolbarTipElt.innerHTML = html;
}
Diagram.prototype.activateNamedElementForm(e)
{
	const basenameElt = document.getElementById('basenameElt');
	if (basenameElt.contentEditable === 'true' && basenameElt.textContent !== '' && !this.readonly)
		this.createNamedIdentity(e);
	else
	{
		basenameElt.contentEditable = true;
		document.getElementById('descriptionElt').contentEditable = true;
		const properNameElt = document.getElementById('properNameElt');
		properNameElt.contentEditable = true;
		properNameElt.focus();
	}
}
Diagram.prototype.createNamedIdentity(e)
{
	try
	{
		if (this.readonly)
			throw 'diagram is read only';
		const from = this.getSelected();
		if (DiagramObject.isPrototypeOf(from))
		{
			document.getElementById('namedElementError').innerHTML = '';
			//
			// basename
			//
			const basenameElt = document.getElementById('basenameElt');
			const basename = basenameElt.innerText;
			if (!Cat.userNameEx.test(basename))
				throw 'Invalid object basename';
			const object = this.codomain.getObjectd(Element.Codename(this, basename));
			if (object)
				throw `object with basename ${basename} already exists in diagram ${this.properName}`;
			//
			// properName
			//
			const properNameElt = document.getElementById('properNameElt');
			const properName = Cat.htmlEntitySafe(properNameElt.innerText);
			//
			// description
			//
			const descriptionElt = document.getElementById('descriptionElt');
			const description = Cat.htmlEntitySafe(descriptionElt.innerText);
			let toNI = new CatObject(this, {basename, description, properName});
			const iso = new Identity(this, {domain:toNI, codomain:from.to, description:`Named identity from ${toNI.properName} to ${from.to.properName}`});
			const iso2 = new Identity(this, {domain:from.to, codomain:toNI, description:`Named identity from ${from.to.properName} to ${toNI.properName}`});
			this.deselectAll();
			const isoFrom = this.objectPlaceMorphism(e, 'codomain', from.name, iso.name)
			const iso2From = new DiagramMorphism(this, {to:iso2, domain:isoFrom.codomain.name, codomain:isoFrom.domain.name});
			iso2From.addSVG();
			display.deactivateToolbar();
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
//
// Draw the morphism's proper name on the other side of the morphism.
//
Diagram.prototype.flipName()
{
	const from = this.getSelected();
	if (DiagramMorphism.isPrototypeOf(from))
	{
		from.flipName = !from.flipName;
		from.update();
		this.saveLocal();
	}
}
//
// Show the help page for the selected element.
//
Diagram.prototype.elementHelp()
{
	const from = this.getSelected();
	const readonly = from.diagram.readonly;
	let html = '';
	const create = (!readonly && from.to && from.to.isComplex()) ? display.getButton('edit', `Cat.getDiagram().activateNamedElementForm(evt)`, 'Create named identity', Cat.default.button.tiny) : '';
	if (from.to)
		html = H.h4(H.span(from.to.properName, '', 'properNameElt') + create) +
						H.p(H.span(Cat.cap(from.to.description), '', 'descriptionElt')) +
						H.p(H.span(Cat.limit(from.to.basename), '', 'basenameElt', from.to.name)) +
						H.p(`Prototype ${from.to.prototype.name}`) +
						H.p(`Category ${from.to.category.properName}`) +
						H.div('', 'error', 'namedElementError');
	else
		html = H.p(H.span(from.properName, 'tty', 'properNameElt') +
					(readonly ? '' : display.getButton('edit', `Cat.getDiagram().editElementText('properNameElt', 'properName')`, 'Edit proper name', Cat.default.button.tiny)));
	this.toolbarTipElt.innerHTML = html;
}
Diagram.prototype.elementHelpMorphTbl(morphisms)
{
	return H.table(H.tr(H.th('Morphisms')) + morphisms.map(m => H.tr(H.td(m.properName, 'left'))).join(''));
}
// TODO
Diagram.prototype.getTransforms(dir, object = null)
{
	let transforms = [];
	const catName = this.codomain.name;
	for(const [tName, t] of $Cat2.morphisms)
		t[dir].name === catName && ((object && 'testFunction' in t) ? t.testFunction(this, object) : true) && transforms.push(t);
	return transforms;
}
Diagram.prototype.updateDragObjects(p)
{
	const delta = D2.subtract(p, display.dragStart);
	let dragObjects = {};
	for(let i=0; i < this.selected.length; ++i)
	{
		const elt = this.selected[i];
		if (DiagramMorphism.isPrototypeOf(elt))
		{
			dragObjects[elt.domain.name] = elt.domain;
			dragObjects[elt.codomain.name] = elt.codomain;
		}
		else
			dragObjects[elt.name] = elt;
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
	this.update(e, elt);
}
Diagram.prototype.placeObject(e, to, xy)
{
	let from = null;
	if (typeof xy === 'undefined')
	{
		
		const xy = display.grid(this.userToDiagramCoords({x:display.grid(Display.Width()/2), y:display.grid(Display.Height()/2)}));
		from = new DiagramObject(this, {xy, to});
	}
	else
		from = new DiagramObject(this, {xy:display.grid(xy), to});
	this.placeElement(e, from);
	return from;
}
Diagram.prototype.placeMorphism(e, to, xyDom, xyCod)
{
	const domain = new DiagramObject(this, {xy:display.grid(xyDom)});
	const codomain = new DiagramObject(this, {xy:display.grid(xyCod)});
	const from = new DiagramMorphism(this, {to, domain, codomain});
	from.incrRefcnt();
	if (isGUI)
	{
		domain.addSVG();
		codomain.addSVG();
		from.update();
		from.addSVG();
		this.update(e, from, true, true);
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
		const tw = Math.abs(cosAngle) * display.textWidth(to.codomain.properName);
		const xy = display.grid({x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)});
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
		const from = new DiagramMorphism({to, domain:domainElt.name, codomain:codomainElt.name});
		from.incrRefcnt();
		newElt.addSVG();
		from.addSVG();
		this.update(e, from);
		return from;
	}
	catch(x)
	{
		display.recordError(x);
	}
}
Diagram.prototype.placeTransformMorphism(e, tranName, dir, name)
{
	try
	{
		const object = this.domain.getObject(name).to;
		const trn = $Cat.getTransform(tranName);
		const m = trn.$(this, object);
		this.objectPlaceMorphism(e, dir, name, m.name);
	}
	catch(x)
	{
		display.recordError(x);
	}
}
Diagram.prototype.getAttachedObjects(dir)		// dir == 'domain'|'codomain'
{
	let objs = [];
	for(let i=0; i<this.selected; ++i)
	{
		const elt = this.selected[i];
		if (DiagramMorphism.isPrototypeOf(elt))
			objs.push(elt[dir]);
	}
	return objs;
}
Diagram.prototype.product(e)
{
	let from = null;
	const elt = this.getSelected();
	if (DiagramMorphism.isPrototypeOf(elt))
	{
		const morphisms = this.getSelectedMorphisms();
		const toMorphs = morphisms.map(m => m.to);
		const form = ProductMorphism.get(this.codomain, toMorphs);
		let to = this.getMorphism(form.name);
		if (m === null)
			to = new ProductMorphism(this, {morphisms:toMorphs});
		to.incrRefcnt();
		from = this.trackMorphism(this.mousePosition(e), m);
		if (!e.shiftKey)
			morphisms.map(m => this.isIsolated(m) ? m.decrRefcnt() : null);
	}
	else if (DiagramObject.isPrototypeOf(elt))
	{
		const objects = this.getSelectedObjects());
		const toObjects = objects.map(o => o.to);
		const to = ProductObject.Get(this, toObjects);
		if (to === null)
			from = new DiagramObject(this, {xy:Display.Barycenter(this.selected), to});
		from.addSVG();
		if (!e.shiftKey)
			objects.map(o => this.isIsolated(o) ? o.decrRefcnt() : null);
	}
	this.addSelected(e, from, true);
	this.update(e, from);
}
Diagram.prototype.coproduct(e)
{
	let from = null;
	const elt = this.getSelected();
	if (DiagramMorphism.isPrototypeOf(elt))
	{
		const morphisms = this.getSelectedMorphisms();
		const toMorphs = morphisms.map(m => m.to);
		const form = CoproductMorphism.get(this.codomain, toMorphs);
		let to = this.getMorphism(form.name);
		if (m === null)
			to = new CoproductMorphism(this, {morphisms:toMorphs});
		to.incrRefcnt();
		from = this.trackMorphism(this.mousePosition(e), m);
		if (!e.shiftKey)
			morphisms.map(m => this.isIsolated(m) ? m.decrRefcnt() : null);
	}
	else if (DiagramObject.isPrototypeOf(elt))
	{
		const objects = this.getSelectedObjects());
		const toObjects = objects.map(o => o.to);
		const to = CoproductObject.Get(this, toObjects);
		if (to === null)
			from = new DiagramObject(this, {xy:Display.Barycenter(this.selected), to});
		from.addSVG();
		if (!e.shiftKey)
			objects.map(o => this.isIsolated(o) ? o.decrRefcnt() : null);
	}
	this.addSelected(e, from, true);
	this.update(e, from);
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
		const codLen = display.textWidth(to.domain.properName)/2;
		const domLen = display.textWidth(to.codomain.properName)/2;
		const namLen = display.textWidth(to.properName);
		codomain = new DiagramObject(this,
		{
			xy:
			{
				x:xy.x + Math.max(Cat.default.arrow.length, domLen + namLen + codLen + Cat.default.arrow.length/4),
				y:xy.y
			}
		});
	}
	const from = new DiagramMorphism(this, {domain, codomain, to});
	from.incrRefcnt();
	from.update();
	domain.addSVG();
	codomain.addSVG();
	from.addSVG();
	return from;
}
Diagram.prototype.productAssembly(e)
{
	const m = ProductAssembly.Get(this, this.getSeletectedMorphisms());
	this.objectPlaceMorphism(e, 'domain', m.domain.name, m.name);
}
Diagram.prototype.coproductAssembly(e)
{
	const m = CoproductAssembly.Get(this, this.getSeletectedMorphisms());
	this.objectPlaceMorphism(e, 'codomain', m.codomain.name, m.name);
}
Diagram.prototype.deselectAll(toolbarOff = true)
{
	dataPanel.close();
	if (toolbarOff)
		display.deactivateToolbar();
	this.selected.map(elt => elt.showSelected(false));
	this.selected = [];
}
Diagram.prototype.getObjectMorphisms(object)
{
	const doms = [];
	const cods = [];
	for(const [from, to] of this.morphisms)
	{
		if (from.domain.isEquivalent(object))
			doms.push(from);
		if (from.codomain.isEquivalent(object))
			cods.push(from);
	}
	return {doms:doms, cods:cods};
}
Diagram.prototype.checkFusible(pnt)
{
	if (this.selected.length === 1)
	{
		let elt = this.getSelected();
		let melt = elt.isEquivalent(display.mouseover) ? null : display.mouseover;
		if (DiagramObject.isPrototypeOf(elt))
		{
			if (DiagramObject.isPrototypeOf(melt))
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
		else if (DiagramMorphism.isPrototypeOf(elt))
			elt.showFusible(DiagramMorphism.isPrototypeOf(melt) && this.canProductMorphisms(elt, melt));
	}
}
//
// Find an element in the diagram at a given location.
//
Diagram.prototype.findElement(pnt, except = '')
{
	let elt = null;
	//
	// search the diagram's objects for a hit
	//
	display.topSVG.querySelectorAll('.object').forEach(function(o)
	{
		if (o.dataset.name === except)
			return;
		const bbox = o.getBBox();
		const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
		if (D2.inside(bbox, pnt, upperRight))
			elt = this.domain.getObject(o.dataset.name);
	}, this);
	//
	// if no hit start searching the morphism text label
	//
	if (elt === null)
		display.topSVG.querySelectorAll('.morphTxt').forEach(function(o)
		{
			if (o.dataset.name === except)
				return;
			const bbox = o.getBBox();
			const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
			if (D2.inside(bbox, pnt, upperRight))
				elt = this.domain.getMorphism(o.dataset.name);
		}, this);
	//
	// if no hit search the morphism arrows
	//
	if (elt === null)
	{
		display.topSVG.querySelectorAll('.morphism').forEach(function(m)
		{
			if (m.dataset.name === except)
				return;
			const bbox = m.getBBox();
			const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
			if (D2.segmentDistance(pnt, bbox, upperRight) < 5)
				elt = this.domain.getMorphism(m.dataset.name);
		}, this);
	}
	//
	// if no hit search the element text
	//
	if (elt === null)
	{
		display.topSVG.querySelectorAll('.element').forEach(function(t)
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
			if (D2.inside(bbox, pnt, upperRight))
				elt = this.domain.getElement(t.dataset.name);
		}, this);
	}
	return elt;
}
Diagram.prototype.canFuseObjects(dragFrom, targetFrom)
{
	if (DiagramObject.isPrototypeOf(dragFrom))
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
Diagram.protype.canProductMorphisms(v, w)
{
	// TODO
//	return this.codomain.hasProducts && v.class === 'morphism' && w.class === 'morphism' && this.isIsolated(v) && this.isIsolated(w);
	return true;
}
Diagram.protoype.getSelected()
{
	return this.selected.length > 0 ? this.selected[0] : null;
}
Diagram.protoype.getSelectedObjects()
{
	return this.selected.filter(s => DiagramObject.isPrototypeOf(s));
}
Diagram.prototype.getSelectedMorphisms()
{
	return this.selected.filter(s => DiagramMorphism.isPrototypeOf(s));
}
Diagram.prototype.compose(e)
{
	const morphisms = this.getSelectedMorphisms();
	const to = Composite.Get(this, morphisms.map(m => m.to));
//	const from = new DiagramMorphism(this, {to, domain:this.selected[0].domain, codomain:this.selected[this.selected.length -1].codomain});
	const from = new DiagramMorphism(this, {to, domain:Composite.Domain(this.selected), codomain:Composite.Codomain(this.selected)});
	from.morphisms = morphisms;
	from.addSVG();
	this.update(e, from, true);
}
Diagram.prototype.run(e)
{
	const from = this.getSelected();
	const isThreeD = from.to.codomain.name === 'threeD';
	const isTty = from.to.codomain.name === 'tty';
	if (Morphism.isProtypeOf(from) && from.to.isIterable())
	{
		const start = Date.now();
		if (isThreeD)
		{
			threeDPanel.open();
			threeDPanel.resizeCanvas();
		}
		const toResult = this.codomain.run(from.to, this);
		if (isThreeD)
			threeDPanel.view('front');
		if (toResult !== null)
		{
			const fromResult = new DiagramMorphism(this, {to, domain:from.domain, codomain:from.codomain});
			fromResult.incrRefcnt();
			fromResult.addSVG();
			this.addSelected(e, fromResult, true);
		}
		if (isTty)
		{
			ttyPanel.open();
			ttyPanel.AccordionOpen('ttyOutPnl');
		}
		const delta = Date.now() - start;
		display.status(e, `<br/>Elapsed ${delta}ms`);
	}
	display.drag = false;
}
Diagram.prototype.makeHomSets()
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
		div.innerHTML = H.span(display.getButton('edit', `Cat.getDiagram().${fname}(evt)`, 'Create morphism'));
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
Diagram.prototype.addFactor(id, fname, root, action, ...indices)
{
	let div = document.getElementById(id);
	if (div.innerHTML === '')
		div.innerHTML = H.span(display.getButton('edit', `Cat.getDiagram().${fname}(evt)`, 'Create morphism'));
	//
	// start with the first element and go down from there
	//
	let object = this.getObject(root);
	object = object.getFactor(indices);
	let sub = indices.join();
	div.innerHTML += H.button(object.properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="Cat.H.del(this);${action}"`);
}
Diagram.prototype.selectedFactorMorphism(e)		// TODO moved
{
	const m = this.codomain.addFactorMorphism(this.getSelected().to, diagram.getFactorsById('codomainDiv'));
	this.objectPlaceMorphism(e, 'domain', this.getSelected().name, m.name)
}
Diagram.prototype.newDataMorphism(dom, cod)
{
	const name = this.codomain.getAnon('Data');
	return new DataMorphism(this.codomain, {name, properName:name.slice(0, 9) + '&hellip;', diagram:this.name, domain:dom.name, codomain:cod.name});
}
Diagram.prototype.makeAllSVG()
{
	let svg = '';
	for (const [name, o] of this.domain.objects)
		try
		{
			svg += o.makeSVG();
		}
		catch(e)
		{
			display.recordError(e);
		}
	for (const [name, m] of this.domain.morphisms)
		try
		{
			svg += m.makeSVG();
		}
		catch(e)
		{
			display.recordError(e);
		}
	svg += this.elements.map(t => t.makeSVG());
	return svg;
}
Diagram.prototype.upload(e, fn = null)
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
			display.status(e, `Uploaded diagram.<br/>Elapsed ${delta}ms`);
		});
	}
	else
		display.recordError('You need to be logged in to upload your work.');
}
Diagram.prototype.guiDetach(e, dir)
{
	try
	{
		const from = this.getSelected();
		const object = from[dir];
		const detachedObj = new DiagramObject(this,
			{
				xy:
				{
					x:object.x + Cat.default.toolbar.x,
					y:object.y + Cat.default.toolbar.y
				}
			});
		object.decrRefcnt();
		from[dir] = detachedObj;
		detachedObj.setObject(from.to[dir]);
		detachedObj.incrRefcnt();
		detachedObj.addSVG();
		from.update();
		this.update(e, null, true)
		display.deactivateToolbar();
		this.activateToolbar(e);
	}
	catch(x)
	{
		display.recordError(x);
	}
}
Diagram.prototype.userToDiagramCoords(xy, orig = false)
{
	const pos = display.topSVG.getBoundingClientRect();
	const s = 1.0 / this.viewport.scale;
	return {x:s * (xy.x - pos.left - (orig ? this.viewport.orig.x : this.viewport.x)), y:s * (xy.y - pos.top - (orig ? this.viewport.orig.y : this.viewport.y))};
}
Diagram.prototype.diagramToUserCoords(xy)
{
	const pos = display.topSVG.getBoundingClientRect();
	const s = this.viewport.scale;
	return {x:s * xy.x + pos.left + this.viewport.x, y:s * xy.y + pos.top + this.viewport.y};
}
Diagram.prototype.mousePosition(e)
{
	return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
}
Diagram.prototype.home()
{
	display.deactivateToolbar();
	this.viewport.x = 0;
	this.viewport.y = 0;
	this.viewport.scale = 1;
	this.setView();
	this.saveLocal();
}
Diagram.prototype.updateElementAttribute(from, attr, val)
{
	const isMorphism = DiagramMorphism.isPrototypeOf(from);
	if (DiagramObject.isPrototypeOf(from) || isMorphism)
	{
		if (from.to)
		{
			from.to[attr] = val;
			if (attr === 'properName')
			{
				let svg = isMorphism ? from.svg('_name') : from.svg();
				if (svg)
					svg.innerHTML = from.to[attr];
			}
		}
	}
	else
	{
		from[attr] = val;
		const svg = from.svg();
		if (attr === 'html')
			svg.outerHTML = from.makeSVG();
		elementPanel.update();
	}
}
Diagram.prototype.editElementText(id, attr)
{
	const h = document.getElementById(id);
	if (!this.readonly && h.contentEditable === 'true' && h.textContent !== '')
	{
		const from = this.getSelected();
		h.contentEditable = false;
		this.updateElementAttribute(from, attr, Cat.htmlEntitySafe(h.innerText));
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
	for(const [name, from] of this.domain.morphisms)
		from.update();
}
Diagram.prototype.isIsolated(elt)
{
	let r = false;
	if (DiagramObject.isPrototypeOf(elt))
		r = elt.refcnt === 1;
	else if (DiagramMorphism.isPrototypeOf(elt))
	{
		const domMorphs = this.domain.obj2morphs.get(elt.domain);
		const codMorphs = this.domain.obj2morphs.get(elt.codomain);
		r = domMorphs.dom.length === 1 && domMorphs.cod.length === 0 && codMorphs.dom.length === 0 && codMorphs.cod.length === 1;
	}
	return r;
}
Diagram.prototype.selectedCanRecurse()
{
	let r = false;
	if (this.selected.length == 2)
	{
		const sel0 = this.selected[0].to;
		const sel1 = this.selected[1].to;
		if (DiagramMorphism.isPrototypeOf(sel0) && DiagramMorphism.isPrototypeOf(sel1))
		{
			const domain = sel0.domain;
			r = sel0.domain.isEquivalent(sel1.domain) &&
				sel0.codomain.isEquivalent(sel1.codomain) &&
				DataMorphism.isPrototypeOf(sel0) &&
				Composite.isPrototypeOf(sel1) &&
				sel1.getMorphism(sel0);
			//
			// find the natural numbers object
			//
			const N = this.getObject('N');
			if (r && N)
			{
				if (sel0.domain.isEquivalent(N))
					return true;
				r = ProductObject.isPrototypeOf(domain) &&
					domain.objects.length === 3 &&
					N.isEquivalent(domain.objects[0]);
				if (r)
				{
					const factor1 = domain.objects[1];
					const factor2 = domain.objects[2];
					r = HomObject.isPrototypeOf(factor1) &&
						factor2.isEquivalent(factor1.objects[0]) &&
						factor2.isEquivalent(factor1.objects[1]);
				}
			}
		}
	}
	return r;
}
Diagram.prototype.recursion(e)
{
	if (this.selectedCanRecurse())
	{
		const sel0 = this.selected[0].to;
		const sel1 = this.selected[1].to;
		sel0.setRecursor(sel1);
		this.saveLocal();
		display.status(e, `Recursor for ${sel0.properName} has been set`);
	}
}
//
// TODO remove?
//
removeCodomainObject(e, name)
{
	const o = this.codomain.getObject(name);
	if (o !== null)
	{
//		while(o.refcnt>=0)
		o.decrRefcnt();
		this.updateObjectTableRows();
		this.update(e);
		this.saveLocal();
	}
}
Diagram.prototype.removeMorphism(e, name)
{
	const m = this.domain.getMorphism(name);
	if (m !== null)
	{
		m.decrRefcnt();
		MorphismTable.updateRows(this);
		this.update(e);
		this.saveLocal();
	}
}
//
// TODO remove?
//
Diagram.prototype.removeCodomainMorphism(e, name)
{
	const m = this.codomain.getMorphism(name);
	if (m !== null)
	{
		m.decrRefcnt();
		MorphismTable.updateRows(this);
		this.update(e);
		this.saveLocal();
	}
}
//
// Get an element from the diagram's domain graph category.
//
Diagram.prototype.getElement(name)
{
	//
	// look for a text element
	//
	let elt = this.elements.filter(t => t.name === name);
	if (elt)
		return elt[0];
	//
	// try for an object
	//
	elt = this.domain.getObject(name);
	if (elt)
		return elt;
	//
	// lastly got for a morphism
	//
	return this.domain.getMorphism(name);
}
Diagram.prototype.toggleTableMorphism(e, id, name)
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
		exist = StringMorphism.RemoveStringSvg(from) || exist;
	if (exist)
		return;
	for(const [name, from] of this.domain.morphisms)
		this.showString(from);
	this.update(e, null, false, false);
}
Diagram.prototype.getHomSet(dom, cod)
{
	const morphs = [];
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
Diagram.prototype.addWindowSelect(e)
{
	const p = this.userToDiagramCoords(display.mouse.down);
	const q = this.userToDiagramCoords(display.mouse.xy);
	this.elements.map(t =>
	{
		if (D2.inside(p, t, q))
			this.addSelected(e, t);
	});
	this.domain.objects.forEach(function(o)
	{
		if (D2.inside(p, o, q))
			this.addSelected(e, o);
	}, this);
	this.domain.morphisms.forEach(function(m)
	{
		if (D2.inside(p, m.domain, q) && D2.inside(p, m.codomain, q))
			this.addSelected(e, m);
	}, this);
}
Diagram.prototype.getTextElement(name)
{
	return this.elements[this.elements.indexOf(name)];
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
			display.recordError(error);
			return;
		}
		const blob = new Blob([JSON.parse(data.Payload)], {type:'application/json'});
		const url = Cat.url.createObjectURL(blob);
		Cat.download(url, `${name}.js`);
		const delta = Date.now() - start;
		display.status(e, `Diagram ${name} Ecmascript generated<br/>Elapsed ${delta}ms`);
	});
}
Diagram.prototype.downloadPNG()
{
	Cat.svg2canvas(display.topSVG, this.name, Cat.download);
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
				display.status(`Reference diagram ${name} removed`);
				break;
			}
	}
	else
		display.status(`Reference diagram ${name} cannot be removed since references to it still exist`);
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
			display.status(`Reference diagram ${name} is now referenced.`);
		}
	}
	else
		if (!silent)
			display.status(`Reference diagram ${name} is already referenced.`);
}
Diagram.prototype.hasReference(name)
{
	return this.references.filter(d => d.name === name).length > 0;
}
Diagram.prototype.unlock(e)
{
	this.readonly = false;
	diagramPanel.updateLockBtn(this);
}
Diagram.prototype.lock(e)
{
	this.readonly = true;
	diagramPanel.updateLockBtn(this);
}
Diagram.prototype.copyObject(e)
{
	const from = this.getSelected();
	const xy = D2.add(from, D2.scale(Cat.default.arrow.length/2, {x:1, y:1}));
	this.placeObject(e, from.to, xy);
}
Diagram.prototype.getMorphismGraph(m)
{
	if (this.graphCat.getMorphism(m.name))
		return this.graphCat.getMorphism(m.name);
	const sm = StringMorphism.graph(this, m);
	return sm;
}
Diagram.prototype.activateToolbar(e)
{
	if (this.selected.length === 0)
		return;
	this.toolbar.style.opacity = 1;
	this.toolbar.style.display = 'block';
	const xy = 'clientX' in e ? {x:e.clientX, y:e.clientY} : display.mouse.xy;
	let xyOffset = true;
	const elt = this.getSelected();
	if (this.selected.length === 1)
		this.toolbar.innerHTML = this.toolbar(elt);
	else
	{
		let html = H.td(display.getButton('close', 'display.deactivateToolbar()', 'Close'), 'buttonBar');
		if (DiagramMorphism.isPrototypeOf(elt))
		{
			const form = Category.HasForm(this.selected);
			const htmlLength = html.length;
			if (form.composite)		// moved
				html += H.td(this.getButton('compose', `Cat.getDiagram().gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
			if (form.sink)
			{
//				if (this.codomain.isCartesian)		// TODO moved
					html += H.td(this.getButton('pullback', `Cat.getDiagram().gui(evt, this, 'pullback')`, 'Pullback'), 'buttonBar');
//				if (this.codomain.hasCoproducts)
					html += H.td(this.getButton('coproductAssembly', `Cat.getDiagram().gui(evt, this, 'coproductAssembly')`, 'Coproduct assembly'), 'buttonBar');
			}
			if (form.source)
			{
//				if (this.codomain.hasCoproducts)
					html += H.td(this.getButton('pushout', `Cat.getDiagram().gui(evt, this, 'pushout')`, 'Pushout'), 'buttonBar');
//				if (this.codomain.isCartesian)		// TODO moved
					html += H.td(this.getButton('productAssembly', `Cat.getDiagram().gui(evt, this, 'productAssembly')`, 'Product assembly'), 'buttonBar');
			}
			if (form.distinct && this.codomain.isCartesian)		// TODO moved
				html += H.td(this.getButton('product', `Cat.getDiagram().gui(evt, this, 'product')`, 'Product'), 'buttonBar');
			if (form.distinct && this.codomain.hasCoproducts)
				html += H.td(this.getButton('coproduct', `Cat.getDiagram().gui(evt, this, 'coproduct')`, 'Coproduct'), 'buttonBar');
			if (html.length !== htmlLength)
				xyOffset = false;
			if (this.selectedCanRecurse())
				html += H.td(this.getButton('recursion', `Cat.getDiagram().gui(evt, this, 'recursion')`, 'Recursion'), 'buttonBar');
		}
		else if (DiagramObject.isPrototypeOf(elt))
		{
//			if (this.codomain.isCartesian)		// TODO moved
				html += H.td(this.getButton('product', `Cat.getDiagram().gui(evt, this, 'product')`, 'Product'), 'buttonBar');
//			if (this.codomain.hasCoproducts)
				html += H.td(this.getButton('coproduct', `Cat.getDiagram().gui(evt, this, 'coproduct')`, 'Coproduct'), 'buttonBar');
		}
		this.toolbar.innerHTML = H.table(H.tr(html), 'buttonBarLeft');
	}
	const rect = display.topSVG.getBoundingClientRect();
	let left = rect.left + xy.x + (xyOffset ? Cat.default.toolbar.x : 0);
	left = left >= 0 ? left : 0;
	left = (left + this.toolbar.clientWidth) >= window.innerWidth ? window.innerWidth - this.toolbar.clientWidth : left;
	this.toolbar.style.left = `${left}px`;
	let top = rect.top + xy.y - (xyOffset ? Cat.default.toolbar.y : 0);
	top = top >= 0 ? top : 0;
	top = (top + this.toolbar.clientHeight) >= window.innerHeight ? window.innerHeight - this.toolbar.clientHeight : top;
	this.toolbar.style.top = `${top}px`;
}
Diagram.prototype.$(args)
{
	return args[0].to;
}
//
// Diagrama static methods
//
Diagram.prototype.Codename(args);
{
	return Element.Codename(this, '');
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
Diagram.prototype.getFactorsById(id)
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
Diagram.prototype.getFactorsByDomCodId(id)
{
	const btns = document.getElementById(id).querySelectorAll("button");
	let factors = [];
	btns.forEach(function(b)
	{
		factors.push(b.dataset.factor.split(' ').map(f => Number.parseInt(f)));
	});
	return factors;
}

//
// Transform is a Morphism
//
function Transform(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = this.diagram.getObject(args.domain);
	if (!Functor.isPrototypeOf(nuArgs.domain))
		throw `transform domain is not a functor`;
	nuArgs.codomain this.diagram.getObject(args.codomain);
	if (!Functor.isPrototypeOf(nuArgs.codomain))
		throw `transform codomain is not a functor`;
	Morphism.call(this, $Cat2Dgrm, nuArgs);
}
Transform.prototype.$(args)
{
	throw `Unknown action in transform ${this.name}`;
}

//
// IdentityTransform is a Transform and an Identity
//
function IdentityTransform(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	nuArgs.name = IdentityTransform.ProperName(nuArgs.domain);
	Identity.call(this, diagram, args);
	Transform.call(this, diagram, this);
}
//
// args[0] === diagram
// args[1] === domain
// return identity of object
//
IdentityTransform.prototype.$(args)
{
	const diagram = args[0];
	if (!Diagram.isPrototypeOf(diagram))
		throw 'not a diagram';
	return Identity.prototype.Get(diagram, {domain:args[1]});
}
//
// IdentityTransform static methods
//
IdentityTransform.prototype.Codename(domain)
{
	return `:$Cat2:It{${domain.name}}tI`;
}
IdentityTransform.prototype.ProperName(domain)
{
	return `Id&lt;${domain.properName}&gt;`;
}

//
// DiagonalTransform is a Transform
//
// domain: id:cat-->cat
// codomain: delta:cat-->cat object->object x object, mor->mor x mor
//
function DiagonalTransform(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	nuArgs.count = Cat.getArg(nuArgs, 'count', 2);
	nuArgs.name = DiagonalTransform.Codename(nuArgs.domain, nuArgs.count);
	nuArgs.properName = DiagonalTransform.Codename(nuArgs.domain, nuArgs.count);
	Transform.call(this, diagram, nuArgs);
	this.count = nuArgs.count;
}
//
// args[0] === diagram
// args[1] === domain
// args[2] === count
// return diagonal of object
//
DiagonalTransform.prototype.$(args)
{
	return DiagonalMorphism.prototype.Get(args[0], {domain:args[1], count:args[2]});
}
//
// DiagonalTransform static methods
//
DiagonalTransform.prototype.Codename(domain, count)
{
	return `:$Cat2:Dt{${domain.name}:${count}}tD`;
}
DiagonalTransform.prototype.ProperName(domain, count)
{
	return `&delta;&lt;${domain.properName}:${count}&gt;`;
}

//
// FoldTransform is a Transform
//
function FoldTransform(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	nuArgs.count = Cat.getArg(nuArgs, 'count', 2);
	nuArgs.name = FoldTransform.Codename(nuArgs.domain, nuArgs.count);
	nuArgs.properName = FoldTransform.ProperName(nuArgs.domain, nuArgs.count);
	Transform.call(this, diagram, nuArgs);
	this.count = nuArgs.count;
}
//
// args[0] === diagram
// args[1] === domain
// args[2] === count
// return fold of object
//
FoldTransform.prototype.$(args)
{
	return FoldMorphism.prototype.Get(args[0], {domain:args[1], count:args[2]});
}
//
// FoldTransform static methods
//
FoldTransform.prototype.Codename(domain, count)
{
	return `:$Cat2:Ft{${domain.name}:${count}}tF`;
}
FoldTransform.prototype.ProperName(domain, count)
{
	return `&nabla;&lt;${domain.properName}:${count}&gt;`;
}

//
// EvaluationTransform is a Transform
//
function EvaluationTransform(diagram, args)
{
	const nuArgs = Cat.clone(args);
	nuArgs.domain = diagram.getObject(args.domain);
	if (!Evaluation.CanEvaluate(nuArgs.domain))
		throw 'domain cannot be evaluated';
	nuArgs.name = EvaluationTransform.Codename(nuArgs.domain, nuArgs.count);
	nuArgs.properName = EvaluationTransform.ProperName(nuArgs.domain);
	Transform.call(this, diagram, nuArgs);
}
//
// args[0] === diagram
// args[1] === domain
//
EvaluationTransform.prototype.$(args)
{
	return Evaluation.Get(args[0], {domain:args[1]});
}
//
// EvaluationTransform static methods
//
EvaluationTransform.prototype.Codename(domain)
{
	return `:$Cat2:Et{${domain.name}}tE`;
}
EvaluationTransform.prototype.ProperName(domain)
{
	return `Eval;&lt;${domain.properName}&gt;`;
}

if (isGUI)
{
	//
	// show the intro if user has not accepted cookies
	//
	if (!Cat.hasAcceptedCookies())
	{
		document.getElementById('intro').innerHTML = display.intro();
		DiagramPanel.FetchRecentDiagrams();
		window.Cat			= Cat;
		return;
	}
}

Cat.initialize();	// boot-up

//
// category = [objects, morphisms, id map, domain map, codomain map, compositor, assoc array]
//

const bootCategories =
[
	['CAT0', 'CAT1', null, null, null, null, {name:'CAT'}],
	[Cat.Objects, Cat.Morphisms, null, null, null, null, {name:'Cat'}],
];

//
// Morphism = [category, domain object, codomain object, assoc array]
//
const Morphisms = new map();


})(typeof exports === 'undefined' ? this['Cat'] = this.Cat : exports);
