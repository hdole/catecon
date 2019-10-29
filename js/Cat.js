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

class D2
{
	constructor(x = 0, y = 0)
	{
		if (typeof x === 'object')
		{
			this.x = x.x;
			this.y = x.y;
		}
		else
		{
			this.x = x;
			this.y = y;
		}
	}
	add(w)
	{
		return new D2(this.x + w.x, this.y + w.y);
	}
	angle()
	{
		let angle = 0;
		if (this.x != 0)
		{
			angle = Math.atan(this.y/this.x);
			if (this.x < 0.0)
				angle += Math.PI;
		}
		else
			angle = this.y > 0 ? Math.PI/2 : - Math.PI/2;
		if (angle < 0)
			angle += 2 * Math.PI;
		return angle % (2 * Math.PI);
	}
	dist(v)
	{
		return D2.Dist(this, v);
	}
	increment(w)
	{
		this.x += w.x;
		this.y += w.y;
		return this;
	}
	inner()
	{
		return D2.Inner(this);
	}
	length()
	{
		return Math.sqrt(this.inner());
	}
	normal()
	{
		return D2.Normal(this);
	}
	normalize()
	{
		const length = this.length();
		return new D2(this.x / length, this.y / length);
	}
	round()
	{
		return new D2(Math.round(this.x), Math.round(this.y));
	}
	scale(a)
	{
		return D2.Scale(a, this);
	}
	subtract(w)
	{
		return D2.Subtract(this, w);
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	nonZero()
	{
		return this.x !== 0 || this.y !== 0;
	}
	static Add(v, w)
	{
		return new D2(v.x + w.x, v.y + w.y);
	}
	static Inner(v)
	{
		return v.x * v.x + v.y * v.y;
	}
	static Length(v)
	{
		return Math.sqrt(D2.Inner(v));
	}
	static Scale(a, v)
	{
		return new D2(v.x*a, v.y*a);
	}
	static Subtract(v, w)
	{
		return new D2(v.x - w.x, v.y - w.y);
	}
	static Normal(v)
	{
		return new D2(-v.y, v.x);
	}
	/* unused
	static multiply(mtrx, vctr)
	{
		const r =
		{
			x:mtrx[0][0] * vctr.x + mtrx[0][1] * vctr.y,
			y:mtrx[1][0] * vctr.x + mtrx[1][1] * vctr.y
		};
		return r;
	}
	*/
	static Dist2(v, w)
	{
		return D2.Inner(D2.Subtract(v, w));
	}
	static Dist(v, w)
	{
		return Math.sqrt(D2.Dist2(v, w));
	}
	static SegmentDistance(p, v, w)
	{
		const l2 = D2.Dist2(v, w);
		if (l2 === 0)
			return D2.Dist(p, v);
		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		return D2.Dist(p, {x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y)});
	}
	static UpdatePoint(p, c, basePoint)
	{
		return D2.Dist2(c, basePoint) < D2.Dist2(p, basePoint) ? c : p;
	}
	static Inbetween(a, b, c)
	{
		return (a - D2.Eps() <= b && b <= c + D2.Eps()) || (c - D2.Eps() <= b && b <= a + D2.Eps());
	}
	static Inside(a, b, c)
	{
		return D2.Inbetween(a.x, b.x, c.x) && D2.Inbetween(a.y, b.y, c.y);
	}
	static SegmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4)
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
			return null;
		if (!(D2.Inbetween(x2, x, x1) && D2.Inbetween(y2, y, y1) && D2.Inbetween(x3, x, x4) && D2.Inbetween(y3, y, y4)))
			return null;
		return new D2(x, y);
	}
	static Angle(from, to)
	{
		return D2.Subtract(to, from).angle();
	}
	static Eps()
	{
		return(0.0000001);
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
	static label(h, i)			{return `<label for="${i}">${h}</label>`; }
//	static select(h, c, i, t, x) {return H.label(h, i) + H.x('select', '', c, i, t, x); }
	static select(h, c, i, t, x) {return H.x('select', '', c, i, t, x); }
	static option(h, v)			{return H.x('option', h, '', '', '', `value="${v}"`); }
	static del(elt) {elt.parentElement.removeChild(elt);}
	static move(elt, toId) {document.getElementById(toId).appendChild(elt); }
	static toggle(elt, here, there) {elt.parentNode.id === here ? H.move(elt, there) : H.move(elt, here); }
}

const isCloud = false;		// TODO turn on when cloud ready

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

class U		// utility functions
{
	static random()
	{
		const ary = new Uint8Array(16);
		isGUI ? window.crypto.getRandomValues(ary) : crypto.randomFillSync(ary);
		let cid = '';
		for (let i=0; i<16; ++i)
			cid += ary[i].toString(16);
		return U.sha256(cid);
	}
	static getUserSecret(s)
	{
		return U.sha256(`TURKEYINTHESTRAW${s}THEWORLDWONDERS`);
	}
	static GetError(err)
	{
		return typeof err === 'string' ? err : err.message;
	}
	static sha256(msg)
	{
		const bitArray = sjcl.hash.sha256.hash(msg);
		return sjcl.codec.hex.fromBits(bitArray);
	}
	static clone(o)
	{
		if (null === o || o instanceof Element || o instanceof Blob)
			return o;
		else if (typeof o === 'object')
		{
			if (Array.isArray(o))
				return o.map(a => U.clone(a));
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
	static htmlEntitySafe(str)
	{
		return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	}
	static htmlSafe(str)
	{
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	}
	static subscript(...subs)
	{
		let sub = '';
		for (let i=0; i<subs.length; ++i)
		{
			let s = subs[i].toString();
			sub += s.replace(/[0-9]/g, function (m)
			{
				return U.submap[m];
			});
		}
		return sub;
	}
	static JsonMap(m)
	{
		let data = [];
		m.forEach(function(m)
		{
			data.push(m);
		});
		return data;
	}
	static jsonArray(map)
	{
		let data = [];
		for(const [key, val] of map)
			data.push(val.json());
		return data;
	}
	static cap(str)
	{
		return str.replace(/(^|\s)\S/, l => l.toUpperCase());
	}
	static arraySet(a, f, v)
	{
		if (f in a)
			a[f].push(v)
		else
			a[f] = [v];
	}
	static arrayInclude(a, f, v)
	{
		if (f in a && a[f].indexOf(v) === -1)
			a[f].push(v)
		else
			a[f] = [v];
	}
	static ArrayMerge(a, b)
	{
		b.map(v => a.indexOf(v) === -1 ? a.push(v) : null);
	}
	//
	// Extracts a graph by indices from a graph.
	//
	static getFactor(g, ...indices)
	{
		let fctr = U.clone(g);
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return null;	// object is terminal object One
			if ('data' in fctr)
				fctr = fctr.data[k];
		}
		return fctr;
	}
	static StorageName(dgrmName)
	{
		return `Cat.diagram ${dgrmName}`;
	}
	static GetFactorsById(id)
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
	static GetFactorsByDomCodId(id)
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
	static DoubleStruck(elt)
	{
		let r = '';
		const s = elt.value.trim();
		if (s.charAt(0) === '&')
			return;
		for (let i=0; i<s.length; ++i)
			r += `&${s.charAt(i)}opf;`;
//		elt.value = r.replace(/&#(\d+);/g, function(m, d)
		elt.value = r.replace(/&[a-zA-Z]+;/g, function(m, d)
		{
			console.log('double struck', String.fromCharCode(m));
			return String.fromCharCode(d);
		});
	}
	*/
}
Object.defineProperties(U,
{
	basenameEx:		{value:RegExp('^[a-zA-Z_$]+[a-zA-Z0-9_$]*$'),	writable:false},
	//
	// overridable keys
	//
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
//		'ScrollLock', 'PrintScreen', 'IntlBackslash', 'NumLock',
//		'ControlRight', 'ControlLeft', 'AltRight', 'AltLeft',
//		'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
//		'Home', 'End', 'PageUp', 'PageDown', 'Insert',
	]), writble:false},
	recentDiagram:	{value:{},		writable:false},
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
	uploadLimit:	{value:1000000,	writable:false},
});

class R		// runtime
{
	static CookieAccept()
	{
		if (U.secret !== U.getUserSecret(U.htmlSafe(document.getElementById('cookieSecret').value)))
		{
			alert('Your secret is not good enough.');
			return;
		}
		localStorage.setItem('CateconCookiesAccepted', JSON.stringify(Date.now()));
		const intro = document.getElementById('intro');
		intro.parentNode.removeChild(intro);
		R.Initialize();	// boot-up
		R.cloud.onCT();
	}
	// TODO move to D
	static HasAcceptedCookies()
	{
		return isGUI && localStorage.getItem('CateconCookiesAccepted') !== null;
	}
	static Initialize()
	{
console.log('stylesheets',document.styleSheets);
		try
		{
			D.url = isGUI ? (window.URL || window.webkitURL || window) : null;
			if (U.clear || (isGUI && window.location.search.substr(1) === 'clear'))
			{
				console.log('clearing local storage');
				Util.clearLocalStorage();
			}
			if (R.HasAcceptedCookies())
			{
				const intro = document.getElementById('intro')
				if (intro)
					intro.parentNode.removeChild(intro);
			}
			R.cloud = isCloud ? new Amazon() : null;
			if (isGUI)
			{
				U.autosave = true;
				D.ReadLocalDiagramList();
				D.Initialize();
			}
			const CATargs =
			{
				basename:		'CAT',
				name:			'CAT',
				user:			'system',
				properName:		'CAT',
				description:	'top category',
			};
			R.CAT = new Category(null, CATargs);
			const $CATargs =
			{
				codomain:		R.CAT,
				basename:		'$CAT',
				name:			'$CAT',
				properName:		'$CAT',
				description:	'top level diagram',
				user:			'system',
			};
			R.$CAT = new Diagram(null, $CATargs);
			R.Cat = new Category(R.$CAT,
			{
				basename:		'Cat',
				category:		R.CAT,
				name:			'Cat',
				description:	'category of smaller categories',
				properName:		'ℂ𝕒𝕥',
				user:			'system',
			});
			R.$Cat = new Diagram(R.$CAT,
			{
				basename:		'$Cat',
				name:			'$Cat',
				codomain:		'Cat',
				properName:		'&#x2102;&#x1D552;&#x1D565;',
				description:	'diagram of currently loaded smaller categories',
				user:			'system',
			});
			R.Actions = new Category(R.$CAT,
			{
				basename:		'Actions',
				name:			'Actions',
				properName:		'Actions',
				description:	'discrete category of currently loaded actions',
			});
			R.$Actions = new Diagram(R.$CAT,
			{
				basename:		'$Actions',
				name:			'$Actions',
				codomain:		'Actions',
				properName:		'Actions',
				description:	'diagram of currently loaded actions',
				user:			'system',
			});

			new IdentityAction(R.$Actions);
			new NamedIdentityAction(R.$Actions);
			new CompositeAction(R.$Actions);
			new DetachDomainAction(R.$Actions);
			new DetachCodomainAction(R.$Actions);
			new EditMorphismAction(R.$Actions);
			new DeleteAction(R.$Actions);
			new CopyAction(R.$Actions);

			new ProductAction(R.$Actions);
			new ProjectAction(R.$Actions);
			new PullbackAction(R.$Actions);
			new ProductAssemblyAction(R.$Actions);
			new TerminalMorphismAction(R.$Actions);

			new CoproductAction(R.$Actions);
			new PushoutAction(R.$Actions);
			new CoproductAssemblyAction(R.$Actions);
			new InitialMorphismAction(R.$Actions);
			new FiniteObjectAction(R.$Actions);
			new DataAction(R.$Actions);

			new HomAction(R.$Actions);
			new HomLeftAction(R.$Actions);
			new HomRightAction(R.$Actions);
			new LambdaMorphismAction(R.$Actions);

			new JavascriptAction(R.$Actions);
			new RunAction(R.$Actions);

			new HelpAction(R.$Actions);
			function setAction(s, name)
			{
				s.set(name, R.$Actions.getObject(name));
			}
			setAction(R.standardActions, 'identity');
			setAction(R.standardActions, 'namedIdentity');
			setAction(R.standardActions, 'composite');
			setAction(R.standardActions, 'detachDomain');
			setAction(R.standardActions, 'detachCodomain');
			setAction(R.standardActions, 'editMorphism');
			setAction(R.standardActions, 'delete');
			setAction(R.standardActions, 'copy');
			setAction(R.standardActions, 'javascript');
			setAction(R.standardActions, 'run');		// depends on javascript
			setAction(R.standardActions, 'help');

			setAction(R.Cat.actions, 'identity');
			setAction(R.Cat.actions, 'namedIdentity');
			setAction(R.Cat.actions, 'composite');
			setAction(R.Cat.actions, 'detachDomain');
			setAction(R.Cat.actions, 'detachCodomain');
			setAction(R.Cat.actions, 'editMorphism');
			setAction(R.Cat.actions, 'run');
			setAction(R.Cat.actions, 'delete');
			setAction(R.Cat.actions, 'copy');

			setAction(R.Cat.actions, 'product');
			setAction(R.Cat.actions, 'project');
			setAction(R.Cat.actions, 'pullback');
			setAction(R.Cat.actions, 'productAssembly');
			setAction(R.Cat.actions, 'terminalMorphism');

			setAction(R.Cat.actions, 'coproduct');
			setAction(R.Cat.actions, 'pushout');
			setAction(R.Cat.actions, 'coproductAssembly');
			setAction(R.Cat.actions, 'initialMorphism');
			setAction(R.Cat.actions, 'data');
			setAction(R.Cat.actions, 'finiteObject');

			setAction(R.Cat.actions, 'hom');
			setAction(R.Cat.actions, 'homLeft');
			setAction(R.Cat.actions, 'homRight');
			setAction(R.Cat.actions, 'lambdaMorphism');

			setAction(R.Cat.actions, 'javascript');
			setAction(R.Cat.actions, 'help');

			R.Cat.initializeActions();

			isGUI && D.navbar.update();
			R.SelectCategoryDiagram(D.LocalStorageCategoryName(),
				function()
				{
					R.initialized = true;
					D.UpdateDiagramDisplay(R.diagram);
				});
			R.GraphCat = new Category(R.$CAT, {basename:'Graph', user:'system', properName:'𝔾𝕣𝕒'});
			R.cloud && R.cloud.initialize();
			isGUI && D.panels.update();
			if (!isGUI)
			{
				exports.cloud =					R.cloud;
				exports.default =				D.default;
				exports.DeleteLocalDiagram =	R.DeleteLocalDiagram;
				exports.$Cat =					R.$Cat;
				exports.sep =					'-',
				exports.user =					R.user;
				exports.$Cat =					R.$Cat;
//				exports.$PFS =					$PFS;
//				exports.$Graph =				$Graph;
				exports.Diagram =				Diagram;
				exports.Element =				Element;
				exports.CatObject =				CatObject;
				exports.Morphism =				Morphism;
				exports.StringMorphism =		StringMorphism;
			}
			else
			{
				// TODO why?
//				window.Cat			= Cat;
//				Cat.Element			= Element;
//				Cat.Morphism		= Morphism;
//				Cat.StringMorphism	= StringMorphism;
//				Cat.H				= H;
//				window.R			= R;
//				window.D			= D;
			}
		}
		catch(e)
		{
			D.RecordError(e);
		}
	}
// TODO unused
	static fetchCategories(fn = null)
	{
		fetch(R.cloud.getURL() + '/categories.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					data.map(cat =>
					{
						if (!R.$Cat.getObject(cat.name))
						{
							const nuCat = new Category(R.$Cat, {name:cat.name, properName:cat.properName, description:cat.description, signature:cat.signature});
							R.catalog[nuCat] = {};
						}
					});
					if (fn)
						fn(data);
				});
			else
				D.RecordError('Categories request failed.', response);
		});
	}
// TODO unused?
	static fetchDiagrams(dgrms, refs, fn)
	{
		R.cloud.fetchDiagramJsons(dgrms, function(jsons)
		{
			jsons.map(j =>
			{
				const diagram = new Diagram(R.$CAT, j);
				D.SaveLocal(diagram);
			});
			if (fn)
				fn(jsons);
			return jsons;
		}, [], refs);
	}
	//
	// Extracts a graph by indices from a graph.
	//
	static getFactor(g, ...indices)
	{
		let fctr = U.clone(g);
		for (let i=0; i<indices.length; ++i)
		{
			const k = indices[i];
			if (k === -1)
				return null;	// object is terminal object One
			if ('data' in fctr)
				fctr = fctr.data[k];
		}
		return fctr;
	}
// TODO use this?
	/*
	static FetchReferenceDiagrams(cat, fn)
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
	*/
	static SelectCategoryDiagram(categoryName, fn)
	{
		const codomain = categoryName === 'Cat' ? R.Cat : R.Cat.getObject(categoryName);
		R.SelectCategory(codomain, function()
		{
			let diagramName = D.GetLocalStorageDiagramName(codomain.name);
			const defaultArgs = {codomain, basename:'Home', user:R.user.name, description:'User home diagram', properName:'Home'};
			if (diagramName === null)
				diagramName = Diagram.Codename(defaultArgs);
/*
			const diagram = R.$CAT.getMorphism(diagramName);
			if (!diagram && D.ReadLocal(diagramName) === null)
			{
				R.diagram = new Diagram(R.$CAT, defaultArgs);
				D.SaveLocal(diagram);
			}
*/
			R.SelectDiagram(diagramName);
			fn && fn();
			D.panels.update();
			D.navbar.update();
			D.SetDefaultDiagram();
		});
	}
	static SelectDiagram(name, update = true)
	{
		D.HideToolbar();
		function setup(name)
		{
			R.diagramName = name;
			D.SetDefaultDiagram();
			if (update)
				D.UpdateDiagramDisplay(name);
		}
		R.diagram = R.$CAT.getMorphism(name);
		if (!R.diagram)
			R.diagram = D.ReadLocal(name);
		if (!R.diagram)
			// TODO turn on/off busy cursor
			R.FetchDiagram(name, setup);
		else
			setup(name);
	}
	static SelectCategory(category, fn)
	{
		R.category = category;
		R.categoryName = category.name;
		D.setLocalStorageDefaultCategory();
		R.diagram = null;
		if (typeof fn === 'function')
			fn();
	}
	static GetCategory(name)
	{
		if (name === 'CAT')
			return R.CAT;
		else if (name === 'Cat')
			return R.Cat;
		return R.Cat ? R.Cat.getObject(name) : null;
	}
	static FetchDiagram(dgrmName, fn)
	{
		R.cloud && R.cloud.fetchDiagramJsons([dgrmName], function(jsons)
		{
			jsons.reverse().map(j =>
			{
				const diagram = new Diagram(R.$CAT, j);
				D.SaveLocal(diagram);
			});
			if (fn)
				fn(dgrmName);
		});
	}
	static GetReferences(name, refs = new Set)
	{
		if (refs.has(name))
			return refs;
		const info = R.Diagrams.get(name);
		if (!info)
			throw 'no info';
		if ('refs' in info)	// TODO remove if clause
			info.refs.map(r => R.GetReferences(r.name, refs));
		return refs;
	}
	static LoadDiagrams(s)
	{
		s.forEach(function(r)
		{
			let diagram = R.$CAT.getMorphism(name);
			if (diagram)
				return;
			if (isGUI)
				diagram = D.ReadLocal(name);
			// else TODO cloud fetch
		});
	}
	static LoadDiagram(name)	// TODO cloud loading is in background fn
	{
		let diagram = R.$CAT.getMorphism(name);
		if (diagram)
			return diagram;
		R.LoadDiagrams(R.GetReferences(name));
		if (isGUI && !diagram)
			diagram = D.ReadLocal(name);
		// else TODO cloud fetch
		return diagram;
	}
	static SetDiagramInfo(diagram)
	{
		let refs = [];
		diagram.references.forEach(function(r)
		{
			refs.push(r.name);
		});
		R.Diagrams.set(diagram.name,
		{
			name:			diagram.name,
			basename:		diagram.basename,
			description	:	diagram.description,
			properName:		diagram.properName,
			timestamp:		diagram.timestamp,
			user:			diagram.user,
			references:		refs,
		});
	}
	static AddDiagram(diagram)
	{
		R.SetDiagramInfo(diagram);
		D.SaveLocalDiagramList();
	}
}
Object.defineProperties(R,
{
	Cat:				{value:null,	writable:true},
	CAT:				{value:null,	writable:true},		// working nat trans
	Diagrams:			{value:null,	writable:true},		// loaded diagrams
	DiagramObject:		{value:null,	writable:true},		// class DiagramObject
	Actions:			{value:null,	writable:true},		// loaded actions
	Graph:				{value:null,	writable:true},		// loaded string graphs
	categoryName:		{value:'',		writable:true},		// current category's name
	category:			{value:null,	writable:true},		// current category
	standardActions:	{value:new Map,	writable:false},	// the actions all categories have
	diagramName:		{value:'',		writable:true},
	diagram:			{value:null,	writable:true},
	cloud:				{value:null,	writable:true},		// cloud we're using
	autosave:			{value:false,	writable:true},		// is autosave turned on for diagrams?
	catalog:			{value:{},		writable:true},
	clear:				{value:false,	writable:true},
	debug:				{value:true,	writable:true},		// Are we in debug mode to print messages on the console?
	initialized:		{value:false,	writable:true},		// Have we finished the boot sequence and initialized properly?
	Diagrams:			{value:new Map,	writable:false},
	serverDiagrams:		{value:{},		writable:true},
	url:				{value:'',		writable:true},
	user:				{value:{name:'Anon', diagrams:{}, email:'anon@example.com', status:'unauthorized'},	writable:true},	// TODO fix after bootstrap removed	writable:true,
});

// TODO
class Cloud
{
	constructor() {}
	initialize() {}
	login() {}
	save() {}
}

class Amazon extends Cloud
{
	constructor()
	{
		document.body.appendChild(document.createElement('script')).src = "https://sdk.amazonaws.com/js/aws-sdk-2.306.0.min.js";
		document.body.appendChild(document.createElement('script')).src = "/js/amazon-cognito-identity.min.js";
		super();
		Object.defineProperties(this,
		{
			'clientId':			{value: 'amzn1.application-oa2-client.2edcbc327dfe4a2081e53a155ab21e77', writable: false},
			'cognitoRegion':	{value:	'us-west-2', writable: false},
			'loginInfo':		{value:	{IdentityPoolId:	'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf'}, writable: false},
			'diagramBucketName':{value:	'catecon-diagrams', writable: false},
			'region':			{value:	'us-west-1', writable: false},
			'userPoolId':		{value:	'us-west-2_HKN5CKGDz', writable: false},
			'accessToken':		{value: null, writable: true},
			'user':				{value:	null, writable: true},
			'diagramBucket':	{value:	null, writable: true},
			'userPool':			{value:	null, writable: true},
			'loggedIn':			{value:	false, writable: true},
		});
	}
	getURL(cat, user, basename)
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
	}
	initialize()
	{
		AWS.config.update(
		{
			region:			this.region,
			credentials:	new AWS.CognitoIdentityCredentials(this.loginInfo),
		});
		isGUI && this.registerCognito();
	}
	updateServiceObjects()
	{
		this.diagramBucket = new AWS.S3({apiVersion:'2006-03-01', params: {Bucket: this.diagramBucketName}});
		this.lambda = new AWS.Lambda({region: R.cloud.region, apiVersion: '2015-03-31'});
	}
	// TODO unused
	saveCategory(category)
	{
		const key = `${category.name}/${category.name}.json`;
		this.diagramBucket.putObject(
		{
			Bucket:			this.diagramBucketName,
			ContentType:	'json',
			Key:			key,
			Body:			JSON.stringify(category.json()),
			ACL:			'public-read',
		}, function(err, data)
		{
			if (err)
			{
				D.RecordError(`Cannot save category: ${err.message}`);
				return;
			}
			if (R.debug)
				console.log('saved category', category.name);
		});
	}
	// TODO unused
	saveDiagram(diagram)	// for bootstrapping
	{
		const key = `${diagram.codomain.name}/${diagram.user}/${diagram.basename}.json`;
		this.diagramBucket.putObject(
		{
			Bucket:			this.diagramBucketName,
			ContentType:	'json',
			Key:			key,
			Body:			JSON.stringify(diagram.json()),
			ACL:			'public-read',
		}, function(err, data)
		{
			if (err)
			{
				D.RecordError(`Cannot save diagram: ${err.message}`);
				return;
			}
			if (R.debug)
				console.log('saved diagram',diagram.name);
		});
	}
	registerCognito()
	{
		const poolInfo =
		{
			UserPoolId:	this.userPoolId,
			ClientId:	'fjclc9b9lpc83tmkm8b152pin',
		};
		AWS.config.region = this.cognitoRegion;
		/*
		this.user =
		{
			name:	'nobody',
			email:	'nobody@example.com',		// null account
			status:	'unauthorized',
			getSession()
			{
				return null;
			},
		};
		*/
		if (ACI)
		{
			this.userPool = new ACI.CognitoUserPool(poolInfo);
			this.user = this.userPool.getCurrentUser();
		}
		else if (typeof AmazonCognitorIdentity !== 'undefined')
		{
			this.userPool = new AmazonCognitoIdentity.CognitoUserPool(poolInfo);
			this.user = this.userPool.getCurrentUser();
		}
		if (this.user)
		{
			this.user.getSession(function(err, session)
			{
				if (err)
				{
					alert(err.message);
					return;
				}
				AWS.config.credentials = new AWS.CognitoIdentityCredentials(this.loginInfo);
				this.accessToken = session.getAccessToken().getJwtToken();
				if (R.debug)
					console.log('registerCognito session validity', session, session.isValid());
				const idPro = new AWS.CognitoIdentityServiceProvider();
				idPro.getUser({AccessToken:this.accessToken}, function(err, data)
				{
					if (err)
					{
						console.log('getUser error',err);
						return;
					}
					this.loggedIn = true;
					R.user.name = data.Username;
					R.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
					R.user.status = 'logged-in';
					D.navbar.update();
					D.loginPanel.update();
					this.getUserDiagramsFromServer(function(dgrms)
					{
						if (R.debug)
							console.log('user diagrams on server',dgrms);
					});
					R.SelectCategoryDiagram(D.LocalStorageCategoryName(), function()
					{
						D.UpdateDiagramDisplay(R.diagram);
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
	}
	signup()
	{
		const userName = U.htmlSafe(document.getElementById('signupUserName').value);
		const email = U.htmlSafe(document.getElementById('signupUserEmail').value);
		if (U.secret !== U.getUserSecret(U.htmlSafe(document.getElementById('SignupSecret').value)))
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
			this.user = result.user;
			R.user.name = userName;
			R.user.email = email;
			R.user.status = 'registered';
			D.navbar.update();
			D.loginPanel.update();
			if (R.debug)
				console.log('user name is ' + this.user.getUsername());
		});
	}
	resetPassword()
	{
		const userName = U.htmlSafe(document.getElementById('signupUserName').value);
		const email = U.htmlSafe(document.getElementById('signupUserEmail').value);
		const password = document.getElementById('resetSignupUserPassword').value;
		const confirmPassword = document.getElementById('resetSignupUserPasswordConfirm').value;
		if (password !== confirmPassword)
		{
			alert('Please confirm your password properly by making sure the password and confirmation are the same.');
			return;
		}
		const attributes =
		[
			// TODO cloud
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
			this.user = result.user;
			R.user.name = userName;
			R.user.email = email;
			R.user.status = 'registered';
			D.navbar.update();
			D.loginPanel.update();
			if (R.debug)
				console.log('user name is ' + this.user.getUsername());
		});
	}
	confirm()
	{
		const code = document.getElementById('confirmationCode').value;
		this.user.confirmRegistration(code, true, function(err, result)
		{
			if (err)
			{
				alert(err.message);
				return;
			}
			R.user.status = 'confirmed';
			D.navbar.update();
			D.loginPanel.update();
		});
	}
	login()
	{
		const userName = U.htmlSafe(document.getElementById('loginUserName').value);
		const password = document.getElementById('loginPassword').value;
		const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({Username:userName, Password:password});
		const userData = {Username:userName, Pool:this.userPool};
		this.user = new AmazonCognitoIdentity.CognitoUser(userData);
		this.user.authenticateUser(authenticationDetails,
		{
			onSuccess:function(result)
			{
				this.accessToken = result.getAccessToken().getJwtToken();
				this.loggedIn = true;
				R.user.status = 'logged-in';
				const idPro = new AWS.CognitoIdentityServiceProvider();
				idPro.getUser({AccessToken:this.accessToken}, function(err, data)
				{
					if (err)
					{
						console.log('getUser error',err);
						return;
					}
					R.user.name = data.Username;
					R.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
					D.navbar.update();
					D.loginPanel.update();
					D.morphismPanel.update();
					D.loginPanel.toggle();
					R.SelectCategoryDiagram(D.LocalStorageCategoryName(), function()
					{
						D.UpdateDiagramDisplay(R.diagram);
					});
					D.setLocalStorageDefaultCategory();
					D.SetDefaultDiagram();
					this.getUserDiagramsFromServer(function(dgrms)
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
				this.user.sendMFACode(verificationCode, this);
			},
		});
	}
	logout()
	{
		this.user.signOut();
		this.loggedIn = false;
		R.user.status = 'unauthorized';
		R.user.name = 'Anon';
		R.user.email = '';
		R.user.status = 'unauthorized';
		R.SelectCategoryDiagram(D.LocalStorageCategoryName(), function()
		{
			D.UpdateDiagramDisplay(R.diagram);
		});
		D.navbar.update();
		Panels.update();
	}
	async fetchDiagram(name)
	{
		const tokens = name.split('-');
		const catName = tokens[1];
		const user = tokens[2];
		const url = this.getURL(catName, user, name + '.json');
		const json = await (await fetch(url)).json();
		return json;
	}
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
							D.RecordError(error);
							return;
						}
					};
					this.lambda.invoke(params, handler);
				});
		});
	}
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
								user:R.user.name,
							}),
		};
		const handler = function(error, data)
		{
			if (error)
			{
				D.RecordError(error);
				return;
			}
			const result = JSON.parse(data.Payload);
			if (fn)
				fn(e, result);
		};
		this.lambda.invoke(params, handler);
	}
	ingestDiagramLambda(e, dgrm, fn)
	{
		const dgrmJson = dgrm.json();
		const dgrmPayload = JSON.stringify(dgrmJson);
		if (dgrmPayload.length > U.uploadLimit)
		{
			D.Status(e, 'CANNOT UPLOAD!<br/>Diagram too large!');
			return;
		}
		D.Svg2canvas(D.topSVG, dgrm.name, false, function(url, filename)
		{
			const params =
			{
				FunctionName:	'CateconIngestDiagram',
				InvocationType:	'RequestResponse',
				LogType:		'None',
				Payload:		JSON.stringify({diagram:dgrmJson, user:R.user.name, png:url}),
			};
			const handler = function(error, data)
			{
				if (error)
				{
					D.RecordError(error);
					return;
				}
				const result = JSON.parse(data.Payload);
				if (fn)
					fn(error, result);
			};
			this.lambda.invoke(params, handler);
		});
	}
	fetchDiagramJsons(diagrams, fn, jsons = [], refs = {})
	{
		const someDiagrams = diagrams.filter(d => typeof d === 'string' && R.$CAT.getMorphism(d) === null);
		if (isCloud && someDiagrams.length > 0)
			Promise.all(someDiagrams.map(d => this.fetchDiagram(d))).then(fetchedJsons =>
			{
				jsons.push(...fetchedJsons);
				fetchedJsons.map(j => {refs[j.name] = true; return true;});
				const nextRound = [];
				for (let i=0; i<fetchedJsons.length; ++i)
					nextRound.push(...fetchedJsons[i].references.filter(r => !(r in refs) && nextRound.indexOf(r) < 0));
				const filteredRound = nextRound.filter(d => typeof d === 'string' && R.$CAT.getMorphism(d) === null);
				if (filteredRound.length > 0)
					this.fetchDiagramJsons(filteredRound, null, jsons, refs);
				else if (fn)
					fn(jsons);
			});
		else if (fn)
			fn([]);
	}
	getUserDiagramsFromServer(fn)
	{
		const params =
		{
			FunctionName:	'CateconGetUserDiagrams',
			InvocationType:	'RequestResponse',
			LogType:		'None',
			Payload:		JSON.stringify({user:R.user.name}),
		};
		this.lambda.invoke(params, function(error, data)
		{
			if (error)
			{
				D.RecordError(error);
				return;
			}
			const payload = JSON.parse(data.Payload);
			payload.Items.map(i => R.serverDiagrams[i.subkey.S] = {timestamp:Number.parseInt(i.timestamp.N), description:i.description.S, properName:i.properName.S});
			D.diagramPanel.userDiagramsSection.update();
			if (fn)
				fn(payload.Items);
		});
	}
}
R.cloud = isCloud ? new Amazon() : null;

class Navbar
{
	constructor()
	{
		this.element = document.getElementById('navbar');
		this.category = null;
		this.diagram = null;
	}
	update()
	{
		const sz = D.default.button.large;
		const left = H.td(H.div(D.GetButton('category', "D.categoryPanel.toggle()", 'Categories', sz))) +
			H.td(H.div(D.GetButton('diagram', "D.diagramPanel.toggle()", 'Diagrams', sz))) +
			H.td(H.div(D.GetButton('object', "D.objectPanel.toggle()", 'Objects', sz))) +
			H.td(H.div(D.GetButton('morphism', "D.morphismPanel.toggle()", 'Morphisms', sz))) +
			H.td(H.div(D.GetButton('text', "D.textPanel.toggle()", 'Text', sz))) +
			H.td(H.div(D.GetButton('string', "R.diagram.showStrings(evt)", 'Graph', sz)));
		const right =
			H.td(H.div(D.GetButton('cateapsis', "D.Home()", 'Home', sz))) +
			H.td(H.div(D.GetButton('threeD', "D.threeDPanel.toggle()", '3D view', sz))) +
			H.td(H.div(D.GetButton('tty', "D.ttyPanel.toggle()", 'Console', sz))) +
			H.td(H.div(D.GetButton('help', "D.helpPanel.toggle()", 'Help', sz))) +
			H.td(H.div(D.GetButton('login', "D.loginPanel.toggle()", 'Login', sz))) +
			H.td(H.div(D.GetButton('settings', "D.settingsPanel.toggle()", 'Settings', sz))) +
			H.td('&nbsp;&nbsp;&nbsp;');
		const html = H.table(H.tr(	H.td(H.table(H.tr(left), 'buttonBar'), 'w20', '', '', 'align="left"') +
									H.td(H.span('', 'navbar-inset', 'category-navbar'), 'w20') +
									H.td(H.span('Catecon', 'title'), 'w20') +
									H.td(H.span('', 'navbar-inset', 'diagram-navbar'), 'w20') +
									H.td(H.table(H.tr(right), 'buttonBar', '', '', 'align="right"'), 'w20')), 'navbarTbl');
		this.element.innerHTML = html;
		this.category = document.getElementById('category-navbar');
		this.diagram = document.getElementById('diagram-navbar');
		let c = '#CCC';
		switch(R.user.status)
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
		this.element.style.background = c;
		this.category.innerHTML = R.category ? R.category.name : '';
		this.diagram.innerHTML = R.diagram ? `${R.diagram.properName} ${H.span('by '+R.diagram.user, 'italic')}` : '';
		this.diagram.title = R.diagram ? U.cap(R.diagram.description) : '';
	}
}

var ddd = 0;

class D
{
	static Resize()
	{
		const diagram = R.$Cat !== null ? R.diagram : null;
		const scale = diagram !== null ? diagram.viewport.scale : 1.0;
		const width = scale > 1.0 ? Math.max(window.innerWidth, window.innerWidth / scale) : window.innerWidth / scale;
		const height = scale > 1.0 ? Math.max(window.innerHeight, window.innerHeight / scale) : window.innerHeight / scale;
		if (D.topSVG)
		{
			D.topSVG.setAttribute('width', width);
			D.topSVG.setAttribute('height', height);
			D.uiSVG.setAttribute('width', width);
			D.uiSVG.setAttribute('height', height);
			D.upSVG.setAttribute('width', width);
			D.upSVG.setAttribute('height', height);
		}
	}
	static Initialize()
	{
		D.navbar.update();
		D.topSVG.addEventListener('mousemove', D.Mousemove, true);
		D.topSVG.addEventListener('mousedown', D.Mousedown, true);
		D.topSVG.addEventListener('mouseup', D.Mouseup, true);
		D.uiSVG.style.left = '0px';
		D.uiSVG.style.top = '0px';
		D.upSVG.style.left = '0px';
		D.upSVG.style.top = '0px';
		D.Resize();
		D.upSVG.style.display = D.showUploadArea ? 'block' : 'none';
		D.AddEventListeners();
		D.parenWidth = D.textWidth('(');
		D.commaWidth = D.textWidth(', ');
		D.bracketWidth = D.textWidth('[');
		D.diagramSVG =	document.getElementById('diagramSVG');
		D.Panel = 			Panel;
		D.panels =			new Panels();
		D.categoryPanel =	new CategoryPanel();
		D.dataPanel =		new DataPanel();
		D.diagramPanel =	new DiagramPanel();
		D.DiagramPanel =	DiagramPanel;
		D.helpPanel =		new HelpPanel();
		D.loginPanel =		new LoginPanel();
		D.morphismPanel =	new MorphismPanel();
		D.MorphismPanel =	MorphismPanel;
		D.objectPanel =		new ObjectPanel();
		D.ObjectPanel =		ObjectPanel;
		D.settingsPanel =	new SettingsPanel();
		D.SettingsPanel =	SettingsPanel;
		D.textPanel =		new TextPanel();
		D.TextPanel =		TextPanel;
		D.threeDPanel =		new ThreeDPanel();
		D.ttyPanel =		new TtyPanel();
		D.panels.update();
	}
	static Mousedown(e)
	{
		D.mouseIsDown = true;
		D.mouse.save = false;
		D.mouse.down = new D2(e.clientX, e.clientY);
		const diagram = R.diagram;
		D.callbacks.map(f => f());
		D.callbacks = [];
		const pnt = diagram.mousePosition(e);
console.log('mousedown',pnt);
		if (D.mouseover)
		{
console.log('mouseover elt',D.mouseover);
			if (!diagram.isSelected(D.mouseover) && !D.shiftKey)
				diagram.deselectAll();
			else if (D.toolbar.style.display === 'none')
				D.ShowToolbar(e, D.mouseover);
			else
				D.toolbar.style.display = 'none';
		}
		else
			diagram.deselectAll();
		if (e.which === 2)	// middle mouse button
		{
			D.tool = 'pan';
			diagram.initializeView();
		}
		if (D.tool === 'pan')
		{
			if (!D.drag)
			{
				D.dragStart = pnt;
				D.drag = true;
			}
		}
	}
	static Mousemove(e)
	{
		D.mouse.savePosition(e);
		try
		{
			D.shiftKey = e.shiftKey;
			const diagram = R.diagram;
			if (!diagram)
				return;
			const xy = diagram.mousePosition(e);
			if (D.drag)
			{
				if (diagram.selected.length > 0)
				{
					if (!diagram.readonly && diagram.selected.length === 1 && e.ctrlKey && !D.dragClone)
					{
						const from = diagram.getSelected();
						D.mouseover = diagram.findElement(xy, from.name);
						const isolated = from.refcnt === 1;
						if (DiagramObject.prototype.isPrototypeOf(from))		// ctrl-drag identity
						{
							diagram.activate(e, 'identity');
							const id = diagram.getSelected();
							id.codomain.setXY(xy);
							diagram.makeSelected(e, id.codomain);	// restore from identity action
							D.dragClone = true;
//							diagram.updateFusible();
						}
						else if (DiagramMorphism.prototype.isPrototypeOf(from))	// ctrl-drag morphism copy
						{
							diagram.activate(e, 'copy', {offset: new D2});
							D.dragClone = true;
//							diagram.updateFusible();
						}
					}
					else if (D.mouse.delta().nonZero())
					{
						const skip = diagram.getSelected();
						D.mouseover = diagram.findElement(xy, skip ? skip.name : '');
						if (D.tool === 'select')
						{
							if (!diagram.readonly)
							{
								diagram.updateDragObjects();
								let msg = '';
								if (D.mouseover && diagram.selected.length === 1)
								{
									const elt = diagram.getSelected();
									if (diagram.isIsolated(elt) && diagram.isIsolated(D.mouseover) &&
											((Morphism.prototype.isPrototypeOf(D.mouseover) && Morphism.prototype.isPrototypeOf(elt)) ||
											(CatObject.prototype.isPrototypeOf(D.mouseover) && CatObject.prototype.isPrototypeOf(elt))))
									{
//										diagram.updateFusible();
										if (e.shiftKey && R.$Actions.getObject('coproduct'))
											msg = 'Coproduct';
										else if (e.altKey && R.$Actions.getObject('hom'))
											msg = 'Hom';
										else if (R.$Actions.getObject('product'))
											msg = 'Product';
									}
									D.Status(e, msg);
								}
								if (msg !== '')
									D.Status(e, msg);
							}
						}
					}
				}
				else if (diagram.selected.length > 0 && D.mouse.delta().nonZero())		// TODO ???
				{
					const skip = diagram.getSelected();
					D.mouseover = diagram.findElement(xy, skip ? skip.name : '');
					if (D.tool === 'select')
						if (!diagram.readonly)
						{
							diagram.updateDragObjects();
//							diagram.updateFusible();
						}
				}
				diagram.updateFusible();
				D.mouse.save = true;
				D.HideToolbar();
			}
			else if (D.mouseIsDown)
			{
				const xy = D.mouse.position()
				const x = Math.min(xy.x, D.mouse.down.x);
				const y = Math.min(xy.y, D.mouse.down.y);
				const width = Math.abs(xy.x - D.mouse.down.x);
				const height = Math.abs(xy.y - D.mouse.down.y);
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
					D.uiSVG.innerHTML += s;
				}
			}
			else if (D.tool === 'pan')
			{
				const delta = D.mouse.delta().scale(1.0 / diagram.viewport.scale);
				diagram.viewport.x = diagram.viewport.x + delta.x;
				diagram.viewport.y = diagram.viewport.y + delta.y;
				diagram.setView();
			}
			else
			{
				D.mouseover = diagram.findElement(xy);
				const svg = document.getElementById('selectRect');
				if (svg)
					svg.parentNode.removeChild(svg);
			}
		}
		catch(e)
		{
			D.RecordError(e);
		}
	}
	static Mouseup(e)
	{
		D.mouseIsDown = false;
		D.dragClone = false;
		if (D.mouse.save)
		{
			D.SaveLocal(R.diagram);
			D.mouse.save = false;
		}
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
			const pnt = diagram.mousePosition(e);
			if (D.drag)
			{
				D.drag = false;
				let didSomething = false;
				if (diagram.selected.length === 1)
				{
					const dragged = diagram.getSelected();
					const target = dragged.isEquivalent(D.mouseover) ? null : D.mouseover;
					if (target)
					{
						if (diagram.isIsolated(dragged) && diagram.isIsolated(target))
						{
							const ary = [target, dragged];
							const actions = diagram.codomain.actions;
							let a = actions.has('product') ? actions.get('product') : null;
							if (e.shiftKey && actions.has('coproduct'))
								a = actions.get('coproduct');
							if (e.altKey && actions.has('hom'))
								a = actions.get('hom');
							if (a && a.hasForm(e, diagram, ary))
							{
								a.action(e, diagram, ary);
								dragged.decrRefcnt();
								target.decrRefcnt();
								didSomething = true;
							}
						}
						else if (DiagramObject.prototype.isPrototypeOf(dragged) && DiagramObject.prototype.isPrototypeOf(target))
						{
							if(dragged.isFusible(target))
							{
								diagram.deselectAll();
								const morphisms = diagram.getObjectMorphisms(dragged);
									/*
								if (morphisms.codomains.length > 0)
								{
									const from = morphisms.codomains[0];
									// convert identity to terminal
									if (morphisms.codomains.length === 1 && morphisms.domains.length === 0 && Identity.prototype.isPrototypeOf(from.to) && !from.to.domain.isInitial)
									{
										const cod = dragObject.to;
										const toTargetObject = target.to;
//										if (cod.signature !== toTargetObject.signature)
										if (cod.name !== toTargetObject.name)	// TODO signature
										{
											//
											// TODO cat has terminal object
											//
											if (toTargetObject.isTerminal)
											{
												const to = R.Diagrams.getMorphism(`terminal-${diagram.codomain.name}`).$(diagram, from.to.domain);  // TODO fix this
												from.removeSVG();
												diagram.setMorphism(from, to);
												this.addSVG(from);
											}
											//
											// TODO ability to convert identity to some morphism?
											//
											else
											{
												const to = R.diagram.newDataMorphism(cod, toTargetObject);
												from.removeSVG();
												diagram.setMorphism(from, to);
												this.addSVG(from);
											}
										}
										from.codomain = target;
										from.update();
										target.incrRefcnt();
										dragObject.decrRefcnt();
										didSomething = true;
									}
								}
									*/
								for(const [name, m] of diagram.domain.morphisms)
								{
									if (m.domain.isEquivalent(dragged))
									{
										m.domain.decrRefcnt();
										m.domain = target;
										D.MergeObjectsRefCnt(diagram, dragged, target);
									}
									else if (m.codomain.isEquivalent(dragged))
									{
										m.codomain.decrRefcnt();
										m.codomain = target;
										D.MergeObjectsRefCnt(diagram, dragged, target);
									}
									m.update();
								}
								dragged.decrRefcnt();
								diagram.domain.makeHomSets();
								diagram.update();
								didSomething = true;
							}
						}
					}
				}
				if (!diagram.readonly && didSomething)
					D.SaveLocal(diagram);
			}
			else
				diagram.addWindowSelect(e);
		}
		catch(x)
		{
			D.RecordError(x);
		}
		D.drag = false;
	}
	static Drop(e)
	{
		const diagram = R.diagram;
		if (diagram.readonly)
		{
			D.Status(e, 'Diagram is not editable');
			return;
		}
		try
		{
			e.preventDefault();
			D.drag = false;
			const xy = diagram.mousePosition(e);
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
					diagram.placeObject(e, diagram.getObject(name), xy);
					break;
				case 'morphism':
					to = diagram.getMorphism(name);
					diagram.placeMorphism(e, to, xy);
					break;
				case 'diagram':
					D.AddReference(e, name);
					break;
			}
			diagram.update();
		}
		catch(err)
		{
			D.RecordError(err);
		}
	}
	static HideToolbar()
	{
		D.toolbar.classList.add('hidden');
	}
	static ShowToolbar(e, loc)
	{
		D.toolbar.classList.remove('hidden');
		const diagram = R.diagram;
		if (diagram.selected.length === 0)
		{
			D.HideToolbar();
			return;
		}
		D.help.innerHTML = '';
		let header = H.span(D.SvgHeader(D.default.button.small, '#ffffff') + D.svg['move'] + `<rect class="btn" x="0" y="0" width="320" height="320"/></svg>`, '',
			'toolbar-drag-handle');
		if (!R.diagram.readonly)
			diagram.codomain.actions.forEach(function(a, n)
			{
				if (a.hasForm(e, R.diagram, diagram.selected))
					header += D.formButton(a.icon, `R.diagram.${'html' in a ? 'actionHtml' : 'activate'}(evt, '${a.name}')`, a.description);
			});
		header += D.GetButton('close', 'D.HideToolbar()', 'Close');
		D.header.innerHTML = H.table(H.tr(H.td(header)), 'buttonBarLeft');
		D.Drag(D.toolbar, 'toolbar-drag-handle');
		D.toolbar.style.display = 'block';
		const rect = D.topSVG.getBoundingClientRect();
		let bbox =
		{
			left:	rect.width,
			top:	rect.height,
			width:	0,
			height:	0,
		};
		diagram.selected.map(s =>
		{
			const sBbox = s.svg().getBoundingClientRect();
			bbox.left = Math.min(bbox.left, sBbox.left);
			bbox.top = Math.min(bbox.top, sBbox.top);
			bbox.width = Math.max(bbox.width, sBbox.width);
			bbox.height = Math.max(bbox.height, sBbox.height);
		});
		let xy = {x:e.clientX, y:e.clientY};
		if (D2.prototype.isPrototypeOf(loc))
			xy = diagram.diagramToUserCoords(loc);
		else
		{
			let nuTop = xy.y;
			if (xy.y >= bbox.top && xy.y <= bbox.top + bbox.height)
				nuTop = bbox.top - D.toolbar.clientHeight;
			let nuLeft = xy.x;
			if (xy.x >= bbox.left && xy.x <= bbox.left + bbox.width)
				nuLeft = bbox.left + bbox.width;
			if (e.clientY - nuTop > nuLeft - e.clientX)
			{
				xy.x = nuLeft;
				xy.y -= D.toolbar.clientHeight;
			}
			else
				xy.y = nuTop;
		}
		let left = rect.left + xy.x;
		left = left >= 0 ? left : 0;
		left = (left + D.toolbar.clientWidth) >= window.innerWidth ? window.innerWidth - D.toolbar.clientWidth : left;
		D.toolbar.style.left = `${left}px`;
		let top = rect.top + xy.y;
		top = top >= 0 ? top : 0;
		top = (top + D.toolbar.clientHeight) >= window.innerHeight ? window.innerHeight - D.toolbar.clientHeight : top;
		D.toolbar.style.top = `${top}px`;
	}
	/*
	static clickDeleteBtn(id, fn)
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
				D.callbacks.push(function()
				{
					var elm = delBtn;
					var newElm = elm.cloneNode(true);
				});
			}
		}
		catch(e)
		{
			D.RecordError(e);
		}
	}
	static deleteBtn(fn, title)
	{
		const uid = ++D.id;
		const html = H.span(
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg id="svg${uid}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="0.32in" height="0.32in" version="1.1" viewBox="0 0 320 320" xmlns:xlink="http://www.w3.org/1999/xlink">
<rect id="delBtn${uid}" x="0" y="0" width="320" height="320" fill="white">
<animate attributeName="fill" values="white;yellow" dur="0.25s" begin="anim${uid}.begin" fill="freeze"/>
</rect>
<g>
${D.svg.delete}
<rect class="btn" x="0" y="0" width="320" height="320" onclick="D.clickDeleteBtn(${uid}, '${fn}')"/>
<animateTransform id="anim${uid}" attributename="transform" type="rotate" from="0 160 160" to="360 160 160" begin="click" dur="0.25s" fill="freeze"/>
</g>
</svg>`, '', '', title);
		return H.td(H.div(html), 'buttonBar');
	}
	*/
	static DownloadButton(txt, onclick, title, scale = D.default.button.small)
	{
		const html = H.span(D.SvgHeader(scale) + D.svg.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">${txt}</text>
${D.Button(onclick)}
</svg>`, '', '', title);
		return html;
	}
	static GetButton(buttonName, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let btn = D.svg[buttonName];
		return D.formButton(btn, onclick, title, scale, addNew = false, id = null, bgColor = '#ffffff')
	}
	static formButton(btn, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let button = btn;
		if (id !== null)
			button = `<g id="${id}">${button}</g>`;
		return H.span(D.SvgHeader(scale, bgColor) + button + (addNew ? D.svg.new : '') + D.Button(onclick) + '</svg>', '', id, title);
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
		const diagram = R.diagram;
		let inc = Math.log(diagram.viewport.scale)/Math.log(D.default.scale.base) + scalar;
		let nuScale = D.default.scale.base ** inc;
		nuScale = nuScale < D.default.scale.limit.min ? D.default.scale.limit.min : nuScale;
		nuScale = nuScale > D.default.scale.limit.max ? D.default.scale.limit.max : nuScale;
		diagram.viewport.scale = nuScale;
		const pnt = D.mouse.position();
		const dx = scalar * (1.0 - 1.0 / D.default.scale.base) * (pnt.x - diagram.viewport.x);
		const dy = scalar * (1.0 - 1.0 / D.default.scale.base) * (pnt.y - diagram.viewport.y);
		const s = D.default.scale.base;
		diagram.viewport.x = diagram.viewport.x - dx;
		diagram.viewport.y = diagram.viewport.y - dy;
		diagram.setView();
	}
	static AddEventListeners()
	{
		document.addEventListener('mousemove', function(e)
		{
			if (D.statusbar.style.display === 'block' && D2.Dist(D.statusXY, {x:e.clientX, y:e.clientY}) > 50)
				D.statusbar.style.display = 'none';
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
				switch(e.code)	// TODO need keydown handlers
				{
				case 'Space':
					if (D.tool !== 'pan')
					{
						D.tool = 'pan';
						D.dragStart = D.mouse.position();
						R.diagram.initializeView();
					}
					break;
				}
				D.shiftKey = e.shiftKey;
				D.setCursor();
			}
		});
		document.addEventListener('keyup', function(e)
		{
			if (e.target === document.body)
			{
				const dgrm = R.diagram;
				if (!dgrm)
					return;
				D.shiftKey = e.shiftKey;
				const name = `${e.ctrlKey ? 'Control' : ''}${e.shiftKey ? 'Shift' : ''}${e.altKey ? 'Alt' : ''}${e.code}`;
				if (name in D.keyboard)
					D.keyboard[name](e);
				D.setCursor();
			}
		});
		document.addEventListener('wheel', function(e)
		{
			if (e.target.id === 'topSVG')
			{
				D.HideToolbar();
				D.Zoom(e, Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))));
			}
		}, false);
	}
	static textWidth(txt)
	{
		if (isGUI)
		{
			let svg = `<text text-anchor="middle" class="object" x="0" y="0" id="testTextWidthElt">${txt}</text>`;
			D.uiSVG.innerHTML = svg;
			const txtElt = document.getElementById('testTextWidthElt');
			const width = txtElt.parentNode.getBBox().width;
			D.uiSVG.innerHTML = '';
			return width;
		}
		return 10;
	}
	static Status(e, msg, record = false)
	{
		const s = D.statusbar;
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
			s.style.opacity = "1";
			s.style.display = 'block';
			D.statusXY = {x:e.clientX, y:e.clientY};
		}
		else
			D.RecordError(msg);
		if (record)
			document.getElementById('tty-out').innerHTML += msg + "\n";
	}
	static Grid(x)
	{
		const d = D.default.layoutGrid;
		switch (typeof x)
		{
		case 'number':
			return D.gridding ? d * Math.round(x / d) : x;
		case 'object':
			return new D2(D.Grid(x.x), D.Grid(x.y));
		}
	}
	static limit(s)
	{
		return s.length > D.textDisplayLimit ? s.slice(0, D.textDisplayLimit) + '...' : s;
	}
	static intro()
	{
		let btns = '';
		for (const b in D.svg.Buttons)
			btns += D.GetButton(b);
		let html = H.h1('Catecon') +
					H.div(
						H.small('The Categorical Console', 'italic underline bold') + H.br() +
						H.small('Shareable Executable Diagrams') +
						H.table(H.tr(H.td(H.a('Blog', 'intro', '', '', 'href="https://harrydole.com/wp/tag/catecon/"'))), 'center') +
						H.h4('Alpha') +
						H.h4('Catecon Uses Cookies') +
						H.small('Your diagrams and those of others downloaded are stored as cookies as well as authentication tokens and user preferences.', 'italic') +
						H.p('Accept cookies by entering the categorical access code below:', 'txtCenter') +
						H.table((!!window.chrome ?
										(H.tr(H.td(H.input('', '', 'cookieSecret', 'text', {ph:'????????', x:'size="6" onkeydown="D.OnEnter(event, R.CookieAccept)"'}))) +
										H.tr(H.td(H.button('OK', '', '', '', 'onclick=R.CookieAccept()')))) :
									H.tr(H.td(H.h4('Use Chrome to access', 'error')))), 'center') +
						H.table(H.tr(H.td(btns)), 'buttonBar center') +
						H.span('', '', 'introPngs') + '<br/>' +
						H.table(H.tr(H.td(H.small('&copy;2018-2019 Harry Dole'), 'left') + H.td(H.small('harry@harrydole.com', 'italic'), 'right')), '', 'footbar')
					, 'txtCenter');
		return html;
	}
	static RecordError(err)
	{
		let txt = U.GetError(err);
		console.log('Error: ', txt);
		if (isGUI)
		{
			if (typeof err === 'object' && 'stack' in err && err.stack != '')
				txt += H.br() + H.small('Stack Trace') + H.pre(err.stack);
			D.ttyPanel.error.innerHTML += '<br/>' + txt;
			D.ttyPanel.open();
			Panel.SectionOpen('tty-error-section');
		}
		else
			process.exit(1);
	}
	static UpdateDiagramDisplay(name)
	{
		if (!R.initialized)
			return;
		D.diagramPanel.update();
		D.objectPanel.update();
		D.morphismPanel.update();
		D.textPanel.update();
		D.diagramSVG.innerHTML = R.diagram.makeAllSVG();
		D.diagramPanel.setToolbar(R.diagram);
		R.diagram.update(false);	// do not save
		R.diagram.updateMorphisms();
	}
	static copyStyles(dest, src)
	{
		for (var cd = 0; cd < dest.childNodes.length; cd++)
		{
			var dstChild = dest.childNodes[cd];
			if (D.svgContainers.indexOf(dstChild.tagName) != -1)
			{
				D.copyStyles(dstChild, src.childNodes[cd]);
				continue;
			}
			const srcChild = src.childNodes[cd];
			if ('data' in srcChild)
				continue;
			var srcStyle = window.getComputedStyle(srcChild);
			if (srcStyle == "undefined" || srcStyle == null)
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
	static Svg2canvas(svg, name, fullscreen, fn)
	{
		const copy = svg.cloneNode(true);
		D.copyStyles(copy, svg);
		const canvas = document.createElement('canvas');
		const bbox = svg.getBBox();
		canvas.width = fullscreen ? window.innerWidth : D.snapWidth;
		canvas.height = fullscreen ? window.innerHeight : D.snapHeight;
		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const data = (new XMLSerializer()).serializeToString(copy);
		const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
		const url = D.url.createObjectURL(svgBlob);
		const img = new Image();
		img.onload = function()
		{
			ctx.drawImage(img, 0, 0);
			D.url.revokeObjectURL(url);
			const cargo = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
			const dgrmImg = document.getElementById(`img_${name}`);
			if (dgrmImg)
				dgrmImg.src = cargo;
			if (fn)
				fn(cargo, `${name}.png`);
		};
		img.src = url;
	}
	static OnEnter(e, fn, that = null)
	{
		if (e.key === 'Enter')
			this ? fn.call(that, e) : fn(e);
	}
	static Width()
	{
		return isGUI ? window.innerWidth : 1024;
	}
	static Height()
	{
		return isGUI ? window.innerHeight : 768;
	}
	static SvgHeader(scale, bgColor = '#ffffff')
	{
		const v = 0.32 * (typeof scale !== 'undefined' ? scale : 1.0);
		const html =
`<svg xmlns="http://www.w3.org/2000/svg" width="${v}in" height="${v}in" version="1.1" viewBox="0 0 320 320">
<rect x="0" y="0" width="320" height="320" style="fill:${bgColor}"/>`;
		return html;
	}
	static Button(onclick)
	{
		return `<rect class="btn" x="0" y="0" width="320" height="320" onclick="${onclick}"/>`;
	}
	static MergeObjectsRefCnt(dgrm, dragObject, targetObject)
	{
		dragObject.decrRefcnt();
		targetObject.incrRefcnt();
		targetObject.to.incrRefcnt();
	}
	static Input(val, id, ph, x='', cls='in100', type='text')
	{
		return H.input(val, cls, id, type, {ph});
	}
	static MorphismTableRows(morphisms, action = null, drag = true)
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
					`${drag ? 'grabbable ' : ''}sidenavRow`, '', U.cap(m.description), drag ? `draggable="true" ondragstart="D.morphismPanel.drag(event, '${m.name}')" ${act}` : act);
		}
		return html;
	}
	static Barycenter(ary)
	{
		let elts = {};
		for(let i=0; i < ary.length; ++i)
		{
			const elt = ary[i];
			if ((DiagramObject.prototype.isPrototypeOf(elt) || DiagramText.prototype.isPrototypeOf(elt)) && !(elt.name in elts))
				elts[elt.name] = elt;
			else if (DiagramMorphism.prototype.isPrototypeOf(elt))
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
			xy.increment(elts[i]);
		}
		xy = xy.scale(1.0/cnt);
		return xy;
	}
	static testAndFireAction(name, ary)
	{
		const diagram = R.diagram;
		const a = diagram.codomain.get(name);
		a && a.hasForm(e, diagram, ary) && a.action(e, diagram);
	}
	static HtmlRow(m, handler)
	{
		return H.tr(
			H.td(m.properName) +
			H.td(m.domain.properName) +
			H.td('&rarr;') +
			H.td(m.codomain.properName),				// content
			`sidenavRow`,								// class
			'',											// id
			U.cap(m.description),						// title
			handler
		);
	}
	static Center()
	{
		return D.Grid(R.diagram.userToDiagramCoords({x:D.Grid(D.Width()/2), y:D.Grid(D.Height()/2)}));
	}
	static DragElement(e, name)
	{
		D.HideToolbar();
		e.dataTransfer.setData('text/plain', name);
	}
	static Drag(elt, dragId)	// drag toolbar
	{
		var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
		const onmouseup = document.onmouseup;
		const onmousemove = document.onmousemove;
		const dragElt = document.getElementById(dragId);
		if (dragElt)
			dragElt.onmousedown = dragMouseDown; // if present, the header is where you move the DIV from
		else
			elt.onmousedown = dragMouseDown; // otherwise, move the DIV from anywhere inside the DIV
		function dragMouseDown(e)
		{
			e = e || window.event;
			e.preventDefault();
			// get the mouse cursor position at startup:
			pos3 = e.clientX;
			pos4 = e.clientY;
			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;
		}
		function elementDrag(e)
		{
			e = e || window.event;
			e.preventDefault();
			// calculate the new cursor position:
			pos1 = pos3 - e.clientX;
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;
			// set the element's new position:
			elt.style.top = (elt.offsetTop - pos2) + "px";
			elt.style.left = (elt.offsetLeft - pos1) + "px";
		}
		function closeDragElement()
		{
			/* stop moving when mouse button is released:*/
			document.onmouseup = onmouseup;
			document.onmousemove = onmousemove;
		}
	}
	static Home()
	{
		D.HideToolbar();
		R.diagram.viewport.x = 0;
		R.diagram.viewport.y = 0;
		R.diagram.viewport.scale = 1;
		R.diagram.setView();
		D.SaveLocal(R.diagram);
	}
	static ReadLocalDiagramList()
	{
		const diagrams = JSON.parse(localStorage.getItem('/Cat/Anon/diagrams'));
		if (diagrams)
			diagrams.map(d => R.Diagrams.set(d.name, d));
		// TODO debug, clean-up, remove, eventually
		/*
		if (R.debug && diagrams)
			diagrams.map(d =>
			{
				if (!localStorage.getItem(U.StorageName(d.name)))
				{
					console.log('ReadLocalDiagramList deleting', d.name);
					D.SaveLocalDiagramList();
				}
			});
			*/
	}
	static SaveLocalDiagramList()
	{
		localStorage.setItem('/Cat/Anon/diagrams', JSON.stringify(U.JsonMap(R.Diagrams)));
	}
	static SaveLocal(diagram, savePng = true)
	{
		if (R.debug)
			console.log('save to local storage', U.StorageName(diagram.name));
		diagram.timestamp = Date.now();
		localStorage.setItem(U.StorageName(diagram.name), diagram.stringify());
		D.Svg2canvas(D.topSVG, this.name, true, function(png, pngName)
		{
			D.diagramPNG.set(diagram.name, png);
			localStorage.setItem(U.StorageName(`${diagram.name}.png`), png);
		});
		return true;
	}
	static ReadLocal(name)
	{
		const data = localStorage.getItem(U.StorageName(name));
		if (data)
		{
			const diagram = new Diagram(R.$CAT, JSON.parse(data));
			const png = localStorage.getItem(U.StorageName(`${diagram.name}.png`));
			if (png)
				D.diagramPNG.set(diagram.name, png);
			// TODO eventually remove, should already be in the list
			R.AddDiagram(diagram);
			if (R.debug)
				console.log('ReadLocal',name,diagram);
			return diagram;
		}
		return null;
	}
	// TODO unused?
	static removeFromLocalDiagramList(dgrmName)
	{
		if (R.Diagrams.has(dgrmName))
		{
			R.Diagrams.delete(dgrmName);
			D.SaveLocalDiagramList();
		}
	}
	// TODO unused?
	static DeleteLocalDiagram(dgrmName)
	{
		try
		{
			localStorage.removeItem(U.StorageName(dgrmName));
			const diagram = R.Diagrams.getMorphism(dgrmName);
			if (diagram)
			{
				diagram.refcnt = 0;// FORCE DELETE
				diagram.decrRefcnt();
				R.Diagrams.removeMorphism(diagram);
				if (R.debug)
					console.log('delete local diagram', dgrmName);
			}
			R.removeFromLocalDiagramList(dgrmName);
		}
		catch(e)
		{
			D.RecordError(e);
		}
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
	static LocalStorageCategoryName()
	{
		let catName = localStorage.getItem(`${R.categoryName} ${R.user.name}`);
		catName = catName === null ? 'Cat' : catName;
		return catName;
	}
	static setLocalStorageDefaultCategory()
	{
		localStorage.setItem(`${R.categoryName} ${R.user.name}`, R.categoryName);
	}
	static GetLocalStorageDiagramName(cat)
	{
		return localStorage.getItem(`Diagram default ${R.user.name} ${cat}`);
	}
	static SetDefaultDiagram()
	{
		if (!R.diagram)
			throw 'no diagram';
		localStorage.setItem(`Diagram default ${R.user.name} ${R.categoryName}`, R.diagram.name);
	}
	static AddReference(e, name)
	{
		const diagram = R.LoadDiagram(name);
		if (diagram)
			R.diagram.addReference(name);
		else
			throw 'no reference diagram';
		D.diagramPanel.referenceSection.update();
		D.SaveLocal(R.diagram);
		D.Status(e, `Diagram ${diagram.properName} now referenced`);
		D.diagramPanel.referenceSection.update();
	}
	static RemoveReference(e, name)
	{
		const diagram = R.LoadDiagram(name);
		if (!diagram)
			throw 'no reference diagram';
		R.diagram.removeReference(name);
		D.diagramPanel.referenceSection.update();
	}
}
Object.defineProperties(D,
{
	'bracketWidth':		{value: 0,			writable: true},
	'callbacks':		{value: [],			writable: true},
	'category':			{value: null,		writable: true},
	'categoryPanel':	{value: null,		writable: true},
	'commaWidth':		{value: 0,			writable: true},
	'dataPanel':		{value: null,		writable: true},
	'default':
	{
		value:
		{
			button:		{tiny:0.4, small:0.66, large:1.0},
			panel:		{width:	230},
			dragDelay:	100,	// ms
			font:		{height:24},
//			arrow:		{length:150, height:20, margin:16, lineDash:[], strokeStyle:'#000', lineWidth:2},
			arrow:		{length:150, margin:16},
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
			stdOffset:	new D2(150, 25),
			stdArrow:	new D2(150, 0),
			toolbar:	{x:15, y:70},
		},
		writable:		false,
	},
	'diagramPanel':		{value: null,		writable: true},
	'diagramPNG':		{value: new Map,	writable: true},
	'diagramSVG':		{value: null,		writable: true},
	'drag':				{value: false,		writable: true},
	'dragClone':		{value: false,		writable: true},
	'dragStart':		{value: new D2,		writable: true},
	'gridding':			{value: true,		writable: true},
	'header':			{value: document.getElementById('toolbar-header'),	writable: false},
	'help':				{value: document.getElementById('toolbar-help'),		writable: false},
	'helpPanel':		{value: null,		writable: true},
	'id':				{value: 0,			writable: true},
	'keyboard':			// keyup actions
	{
		value:
		{
			Minus(e) { D.Zoom(e, -1);},
			Equal(e) { D.Zoom(e, 1);},
			Home(e) { D.Home();},
			Space(e)
			{
				D.tool = 'select';
				D.drag = false;
				R.diagram.update();
			},
			Digit0(e) { D.testAndFireAction(e, 'initialMorphism', R.diagram.selected); },
			Digit1(e) { D.testAndFireAction(e, 'terminalMorphism', R.diagram.selected); },
			Digit3(e) { D.threeDPanel.toggle(); },
			Escape(e)
			{
				if (D.toolbar.classList.contains('hidden'))
					D.panels.closeAll();
				else
					D.HideToolbar();
			},
			ShiftKeyC(e) { D.categoryPanel.toggle(); },
			ShiftKeyD(e) { D.diagramPanel.toggle(); },
			ShiftKeyH(e) { D.helpPanel.toggle(); },
			ShiftKeyL(e) { D.loginPanel.toggle(); },
			ShiftKeyM(e) { D.morphismPanel.toggle(); },
			ShiftKeyO(e) { D.objectPanel.toggle(); },
			ShiftKeyS(e) { D.settingsPanel.toggle(); },
			ShiftKeyT(e) { D.textPanel.toggle(); },
			ShiftKeyY(e) { D.ttyPanel.toggle(); },
			KeyT(e)
			{
				const diagram = R.diagram;
				diagram.deselectAll();
				const xy = D.Grid(diagram.userToDiagramCoords(D.mouse.position()));		// current mouse location
				const txt = new DiagramText(diagram, {name:`Text${dgrm.textId++}`, description:'Lorem ipsum cateconium', xy});
				diagram.placeText(e, txt);
			},
			Delete(e)
			{
				R.diagram && R.diagram.activate(e, 'delete');
			},
		},
		writable:	true,
	},
	'loginPanel':		{value: null,		writable: true},
	'morphismPanel':	{value: null,		writable: true},
	mouse:				{
							value:
							{
								down:	new D2,
								save:	false,
								xy:		[new D2],
								position()
								{
									return this.xy[this.xy.length -1];
								},
								savePosition(e)
								{
									this.xy.push(new D2(e.clientX, e.clientY));
									if (this.xy.length > 2)
										this.xy.shift();
								},
								delta()
								{
									return this.xy.length > 1 ? this.xy[1].subtract(this.xy[0]) : new D2;
								},
							},
							writable: true,
						},
	'mouseIsDown':		{value: false,		writable: true},	// is the mouse key down? the onmousedown attr is not connected to mousedown or mouseup
	'mouseover':		{value: null,		writable: true},
	'navbar':			{value: new Navbar(),		writable: false},
	'objectPanel':		{value: null,		writable: true},
	'Panel':			{value: null,		writable: true},
	'panels':			{value: null,		writable: true},
	'settingsPanel':	{value: null,		writable: true},
	'shiftKey':			{value: false,		writable: true},
	'showInternals':	{value: true,		writable: true},
	'showUploadArea':	{value: false,		writable: true},
	'snapWidth':		{value: 1024,		writable: true},
	'snapHeight':		{value: 768,		writable: true},
	'statusbar':		{value: document.getElementById('statusbar'),	writable: false},
	'statusXY':			{value: new D2,		writable: true},
	'svgContainers':	{value: ['svg', 'g'],	writable: false},
	'svgStyles':	
	{
		value:
		{
			path:	['fill', 'fill-rule', 'marker-end', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-miterlimit'],
			text:	['fill', 'font', 'margin', 'stroke'],
		},
		writable:	false,
	},
	'textDisplayLimit':	{value: 60,			writable: true},
	'textPanel':		{value: null,		writable: true},
	'threeDPanel':		{value: null,		writable: true},
	'tool':				{value: 'select',	writable: true},
	'toolbar':			{value: document.getElementById('toolbar'),		writable: false},
	'topSVG':			{value: document.getElementById('topSVG'),		writable: false},
	'ttyPanel':			{value: null,	writable: true},
	'uiSVG':			{value: document.getElementById('uiSVG'),		writable: false},
	'upSVG':			{value: document.getElementById('upSVG'),		writable: false},
	'svg':
	{
		value:
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
chevronLeft:
`<path class="svgfilNone svgstr1" d="M120,40 80,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 160,160 200,280"/>`,
chevronRight:
`<path class="svgfilNone svgstr1" d="M120,40 160,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 240,160 200,280"/>`,
close:
`<line class="arrow0 str0" x1="40" y1="40" x2="280" y2= "280" />
<line class="arrow0 str0" x1="280" y1="40" x2="40" y2= "280" />`,
copy:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
delete:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="230" marker-end="url(#arrowhead)"/>
<path class="svgfilNone svgstr1" d="M90,190 A120,50 0 1,0 230,190"/>`,
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
functor:
`<line class="arrow0" x1="40" y1="40" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>`,
help:
`<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,120 C100,40 280,40 210,120 S170,170 160,200"/>`,
			/*
homFactor:
`<circle cx="80" cy="240" r="100" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad2)"/>
<circle cx="240" cy="160" r="80" fill="url(#radgrad2)"/>
<circle cx="240" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="120" y1="120" x2="40" y2="40" marker-end="url(#arrowhead)"/>`,
*/
lambda2:
`<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="120" y1="120" x2="40" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="200" y1="200" x2="280" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="200" x2="40" y2="280" marker-end="url(#arrowhead)"/>`,
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
move:
`<line class="svgfilNone arrow0-30px" x1="60" y1="80" x2="240" y2= "80" />
<line class="svgfilNone arrow0-30px" x1="60" y1="160" x2="240" y2= "160" />
<line class="svgfilNone arrow0-30px" x1="60" y1="240" x2="240" y2= "240" />`,
new:
`<circle class="svgfil4" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
object:
`<circle cx="160" cy="160" r="140" fill="url(#radgrad1)"/>`,
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
		writable:	false,
	},
});

class Panels
{
	constructor()
	{
		this.panels = {};
	}
	closeAll(side)
	{
		for (const [name, panel] of Object.entries(this.panels))
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
	update()
	{
		for (const [name, panel] of Object.entries(this.panels))
			panel.update();
	}
}

class Section
{
	constructor(title, parent, id, tip)
	{
		this.elt = document.createElement('button');
		this.elt.innerHTML = title;
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
	toggle()
	{
		this.elt.classList.toggle('active');
		this.section.style.display = this.section.style.display === 'block' ? 'none' : 'block';
		this.update();
	}
	open()
	{
		this.elt.classList.add('active');
		this.section.style.display = 'block';
		this.update();
	}
	close()
	{
		this.elt.classList.remove('active');
		this.section.style.display = 'none';
	}
	update()		// fitb
	{
		return this.elt.classList.contains('active');
	}
	static Html(header, action, panelId, title = '', buttonId = '')
	{
		return H.button(header, 'sidenavSection', buttonId, title, `onclick="${action};D.Panel.SectionToggle(this, \'${panelId}\')"`) +
				H.div('', 'section', panelId);
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
		D.panels.panels[this.name] = this;
	}
	initialize()
	{
		this.expandBtnElt = document.getElementById(`${this.name}-expandBtn`);
	}
	collapse()
	{
		this.elt.style.width = this.width + 'px';
		this.expandBtnElt.innerHTML = D.GetButton(this.right ? 'chevronLeft' : 'chevronRight', `D.${this.name}Panel.expand()`, 'Collapse');
	}
	closeBtnCell()
	{
		return H.td(D.GetButton('close', `D.${this.name}Panel.close()`, 'Close'), 'buttonBar');
	}
	expand()
	{
		this.elt.style.width = 'auto';
		this.expandBtnElt.innerHTML = D.GetButton(this.right ? 'chevronRight' : 'chevronLeft', `D.${this.name}Panel.collapse()`, 'Expand');
	}
	open()
	{
		D.panels.closeAll(this.right ? 'right' : 'left');
		this.elt.style.width = this.width + 'px';
	}
	close()
	{
		this.elt.style.width = '0';
	}
	toggle()
	{
		const width = this.elt.style.width;
		if (width === 'auto' || Number.parseInt(width, 10) > 0)
			this.close();
		else
			this.open();
	}
	expandPanelBtn()
	{
		return H.td(D.GetButton(this.right ? 'chevronLeft' : 'chevronRight', `D.${this.name}Panel.expand()`, 'Expand'), 'buttonBar', `${this.name}-expandBtn`);
	}
	update()	// fitb
	{}
	static SectionToggle(btn, pnlId)
	{
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
	static SectionPanelDyn(header, action, panelId, title = '', buttonId = '')
	{
		return H.button(header, 'sidenavSection', buttonId, title, `onclick="${action};D.Panel.SectionToggle(this, \'${panelId}\')"`) +
				H.div('', 'section', panelId);
	}
}

class NewCategorySection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'category-new-section', 'Create new category');
		this.section.innerHTML = H.table(
				H.tr(H.td(D.Input('', 'category-new-basename', 'Name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-properName', 'Proper name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-description', 'Description')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-hasProducts', '', '', 'in100', 'checkbox') + '<label for="category-new-hasProducts">Products</label>' +
					H.p('Products, projections, pullbacks. product assemblies, terminal object and morphisms'), 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-hasCoproducts', '', '', 'in100', 'checkbox') + '<label for="category-new-hasCoproducts">Coproducts</label>' +
					H.p('Coproducts, insertions, pushouts. coproduct assemblies, initial object and morphisms'), 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-isClosed', '', '', 'in100', 'checkbox') + '<label for="category-new-isClosed">Closed</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-monoid', '', '', 'in100', 'checkbox') + '<label for="category-new-monoid">Monoid</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-finiteObjects', '', '', 'in100', 'checkbox') + '<label for="category-new-finiteObjects">Finite objects</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'category-new-naturalNumbers', '', '', 'in100', 'checkbox') + '<label for="category-new-naturalNumbers">Natural numbers</label>', 'left'), 'sidenavRow'), 'sidenav') +
			H.span(D.GetButton('edit', 'CategoryPanel.Create()', 'Create new category')) + H.br() +
			H.span('', 'error', 'category-new-error');
		this.error = document.getElementById('category-new-error');
		this.basenameElt = document.getElementById('category-new-basename');
		this.properNameElt = document.getElementById('category-new-properName');
		this.descriptionElt = document.getElementById('category-new-description');
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
		}
	}
	create(e)
	{
		try
		{
			const basename = U.htmlSafe(this.basenameElt.value);
			const name = Element.Codename(R.$CAT, basename);
			if (R.$CAT.getMorphism(name))
				throw 'Category already exists';
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
}

class CategorySection extends Section
{
	constructor(title, parent, id, tip, updateFn = function(diagram){return '';}, filterFn = function(diagram){return true;})
	{
		super(title, parent, id, tip);
		this.diagrams = null;
		this.updateFn = updateFn;
		this.filterFn = filterFn;
	}
	setDiagrams(diagrams)
	{
		this.diagrams = diagrams;
		this.update();
	}
	update()
	{
		if (super.update())
		{
			let rows = '';
			const that = this;	// can't use this below
			this.diagrams.forEach(function(diagram)
			{
				if (that.filterFn(diagram))
					rows += that.diagramRow(diagram, that.updateFn(diagram));
			});
			this.section.innerHTML = H.table(rows);
		}
	}
	/*
	diagramRow(diagram, tb = '')
	{
		const dt = new Date(diagram.timestamp);
//		const url = R.cloud ? R.cloud.getURL(diagram.codomain.basename, diagram.user, diagram.basename + '.png') : R.Diagrams.get(diagram.name).png;
		let src = '';
		if (D.diagramPNG.has(diagram.name))
			src = D.diagramPNG.get(diagram.name);
		if (src === '' && R.cloud)
			src = R.cloud.getURL(diagram.codomain.basename, diagram.user, diagram.basename + '.png')
		let tools = tb;
		tools +=	D.DownloadButton('JSON', `R.LoadDiagram('${diagram.name}').downloadJSON(evt)`, 'Download JSON') +
				D.DownloadButton('JS', `R.LoadDiagram('${diagram.name}').downloadJS(evt)`, 'Download Javascript') +
				D.DownloadButton('PNG', `R.LoadDiagram('${diagram.name}').downloadPNG(evt)`, 'Download PNG');
		const tbl = H.table(
				H.tr(H.td(H.h4(diagram.properName)) + H.td(tools, 'right')) +
				H.tr(H.td(`<img src="${src}" id="img_${diagram.name}" width="200" height="150"/>`, 'white', '', '', 'colspan="2"')) +
				H.tr(H.td(diagram.description, 'description', '', '', 'colspan="2"')) +
				H.tr(H.td(diagram.user, 'author') + H.td(dt.toLocaleString(), 'date')));
		return H.tr(H.td(`<a onclick="R.SelectDiagram('${diagram.name}')">` + tbl + '</a>'), 'grabbable sidenavRow', '', '',
			`draggable="true" ondragstart="D.DragElement(event, 'diagram ${diagram.name}')"`);
	}
	*/
}

class CategoryPanel extends Panel
{
	constructor()
	{
		super('category');
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell()), 'buttonBarRight') +
			H.h3('Categories') + H.div('', '', 'categoryTbl');
			/*
			H.button('New Category', 'sidenavSection', '', 'New Category', `onclick="D.Panel.SectionToggle(this, \'newCategoryPnl\')"`) +
			H.div(H.table(
				H.tr(H.td(D.Input('', 'categoryName', 'Name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'categoryProperName', 'Proper name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'categoryDescription', 'Description')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasProducts', '', '', 'in100', 'checkbox') + '<label for="hasProducts">Products</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasCoproducts', '', '', 'in100', 'checkbox') + '<label for="hasCoproducts">Coproducts</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'isClosed', '', '', 'in100', 'checkbox') + '<label for="isClosed">Closed</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasPullbacks', '', '', 'in100', 'checkbox') + '<label for="hasPullbacks">Pullbacks</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasPushouts', '', '', 'in100', 'checkbox') + '<label for="hasPushouts">Pushouts</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'finiteObjects', '', '', 'in100', 'checkbox') + '<label for="finiteObjects">Finite objects</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'naturalNumbers', '', '', 'in100', 'checkbox') + '<label for="naturalNumbers">Natural numbers</label>', 'left'), 'sidenavRow'),
					'sidenav') +
			H.span(D.GetButton('edit', 'CategoryPanel.Create()', 'Create new category')) + H.br() +
			H.span('', 'error', 'categoryError'), 'section', 'newCategoryPnl');
			*/
		this.newCategorySection = new NewCategorySection(this.elt);
		this.initialize();
		/*
		this.categoryTbl = document.getElementById('categoryTbl');
		this.error = document.getElementById('categoryError');
		this.basenameElt = document.getElementById('categoryBasename');
		this.properNameElt = document.getElementById('categoryProperName');
		this.descriptionElt = document.getElementById('categoryDescription');
		*/
	}
	update()
	{
		this.newCategorySection.update();
		/*
		const cats = [];
		if (R.Cat)
			for(const [catName, cat] of R.Cat.objects)
				cats.push(cat);
		this.categoryTbl.innerHTML = H.table(cats.map(c => H.tr(H.td(`<a onclick="R.SelectCategoryDiagram('${c.name}')">${c.properName}</a>`), 'sidenavRow')).join(''));
		*/
	}
	create()
	{
		try
		{
			this.error.innerHTML = '';
			const basename = U.htmlSafe(this.basenameElt.value);
			if (basename === '')
				throw 'Category name must be specified.';
			if (!RegExp(U.basenameEx).test(basename))
				throw 'Invalid category name.';
			// TODO finite objects attribute
			const cat = new Category(R.$Cat, {basename, properName:U.htmlSafe(this.properNameElt.value), description:U.htmlSafe(this.descriptionElt.value)});
			if (document.getElementById('hasProducts').checked)
			{
				cat.actions.set('product', R.$Actions.getObject('product'));
				cat.actions.set('productAssembly', R.$Actions.getObject('productAssembly'));
				cat.actions.set('project', R.$Actions.getObject('project'));
			}
			if (document.getElementById('hasCoproducts').checked)
			{
				cat.actions.set('coproduct', R.$Actions.getObject('coproduct'));
				cat.actions.set('coproductAssembly', R.$Actions.getObject('coproductAssembly'));
			}
			if (document.getElementById('hasPullbacks').checked)
				cat.actions.set('pullback', R.$Actions.getObject('pullback'));
			if (document.getElementById('hasPushouts').checked)
				cat.actions.set('pushout', R.$Actions.getObject('pushout'));
			if (document.getElementById('isClosed').checked)
				cat.actions.set('hom', R.$Actions.getObject('hom'));
			// TODO natural numbers object added to category and action
		}
		catch(err)
		{
			this.error.innerHTML = 'Error: ' + U.GetError(err);
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
		this.elt.innerHTML = H.table(
								H.tr(
									this.closeBtnCell() +
									this.expandPanelBtn() +
									H.td(D.GetButton('delete', "D.threeDPanel.initialize()", 'Clear display'), 'buttonBar') +
									H.td(D.GetButton('threeD_left', "D.threeDPanel.view('left')", 'Left'), 'buttonBar') +
									H.td(D.GetButton('threeD_top', "D.threeDPanel.view('top')", 'Top'), 'buttonBar') +
									H.td(D.GetButton('threeD_back', "D.threeDPanel.view('back')", 'Back'), 'buttonBar') +
									H.td(D.GetButton('threeD_right', "D.threeDPanel.view('right')", 'Right'), 'buttonBar') +
									H.td(D.GetButton('threeD_bottom', "D.threeDPanel.view('bottom')", 'Bottom'), 'buttonBar') +
									H.td(D.GetButton('threeD_front', "D.threeDPanel.view('front')", 'Front'), 'buttonBar')
								), 'buttonBarLeft') +
						H.div('', '', 'threeDiv');
		this.display = document.getElementById('threeDiv');
		this.initialized = false;
	}
	initialize()
	{
		super.initialize();
		try
		{
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
			if (this.display.children.length > 0)
				this.display.removeChild(this.display.children[0]);
			this.display.appendChild(this.renderer.domElement);
			this.renderer.gammaInput = true;
			this.renderer.gammaOutput = true;
			this.renderer.shadowMap.enabled = true;
			this.view('front');
			this.animate();
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
		this.expandBtnElt.innerHTML = D.GetButton('chevronRight', `D.threeDPanel.collapse(true)`, 'Expand');
		this.resizeCanvas();
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
}

class TtyPanel extends Panel
{
	constructor()
	{
		super('tty', true);
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('TTY') +
			H.button('Output', 'sidenavAccordion', '', 'TTY output from some composite', `onclick="D.Panel.SectionToggle(this, \'tty-out-section\')"`) +
			H.div(
				H.table(H.tr(
					H.td(D.GetButton('delete', `D.ttyPanel.ttyOut.innerHTML = ''`, 'Clear output'), 'buttonBar') +
					H.td(D.DownloadButton('LOG', `D.DownloadString(D.ttyPanel.out.innerHTML, 'text', 'console.log')`, 'Download tty log file'), 'buttonBar')), 'buttonBarLeft') +
				H.pre('', 'tty', 'tty-out'), 'section', 'tty-out-section') +
			H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="D.Panel.SectionToggle(this, \'tty-error-section\')"`) +
			H.div(H.table(H.tr(
					H.td(D.GetButton('delete', `D.ttyPanel.error.innerHTML = ''`, 'Clear errors')) +
					H.td(D.DownloadButton('ERR', `D.DownloadString(D.ttyPanel.error.innerHTML, 'text', 'console.err')`, 'Download error log file'), 'buttonBar')), 'buttonBarLeft') +
				H.span('', 'tty', 'tty-error-out'), 'section', 'tty-error-section');
		this.initialize();
		this.out = document.getElementById('tty-out');
		this.error = document.getElementById('tty-error-out');
	}
}

class DataPanel extends Panel
{
	constructor()
	{
		super('data', true);
		this.elt.innerHTML =
			H.table(
				H.tr(	this.closeBtnCell() +
						this.expandPanelBtn() +
						H.td(D.GetButton('delete', `R.diagram.gui(evt, this, 'clearDataMorphism')`, 'Clear all data'))), 'buttonBarLeft') +
			H.div('', '', 'data-view');
		this.initialize();
		this.dataView = document.getElementById('data-view');
	}
	update()
	{
		this.dataView.innerHTML = '';
		let dgrm = R.diagram;
		if (dgrm !== null)
		{
			if (dgrm.selected.length === 1 && DiagramMorphism.prototype.isPrototypeOf(dgrm.getSelected()))
			{
				let from = dgrm.getSelected();
				const to = from.to;
				let tbl = '';
				if (DataMorphism.prototype.isPrototypeOf(to))
				{
					to.updateRecursor();
					html += H.h3(to.properName, '', 'dataPanelTitle');
					if (to.recursor !== null)
						html += H.small(`Recursor morphism is ${to.recursor.properName}`);
					if (to.domain.isEditable())
					{
						html += H.button('Add Data', 'sidenavAccordion', '', 'Add entries to this map', `onclick="D.Panel.SectionToggle(this, \'dataInputPnl\')"`);
						const irx = 'regexp' in to.domain ? `pattern="${to.regexp}"`: '';
						const inputForm = D.Input('', 'inputTerm', to.domain.properName, irx);
						const outputForm = to.codomain.toHTML();	// TODO fix toHTML
						tbl =	H.tr(H.td('Domain')) +
								H.tr(H.td(inputForm)) +
								H.tr(H.td('Codomain')) +
								H.tr(H.td(outputForm));
						html += H.div(H.table(tbl) + D.GetButton('edit', `dataPanel.handler(evt, '${from.name}')`, 'Edit data'), 'section', 'dataInputPnl');
						html += H.div('', 'error', 'editError');
					}
					html += H.button('Current Data', 'sidenavAccordion', 'dataPnlBtn', 'Current data in this morphism', `onclick="D.Panel.SectionToggle(this, \'dataPnl\')"`) +
							H.small('To determine the value of an index, first the data values are consulted then the data ranges.');
					tbl = H.tr(H.th(to.domain.properName) + H.th(to.codomain.properName));
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
				Panel.SectionToggle(dpb, 'dataPnl');
		}
	}
	handler(e, nm)
	{
		try
		{
			const m = R.diagram.domain.getMorphism(nm).to;
			m.addData(e);
			this.update();
			D.SaveLocal(diagram);
		}
		catch(err)
		{
			document.getElementById('editError').innerHTML = 'Error: ' + U.GetError(err);
		}
	}
}

class NewDiagramSection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'diagram-new-section', 'Create new diagram');
		this.section.innerHTML =
			H.h5('Create a New Diagram') +
			H.table(H.tr(H.td(D.Input('', 'diagram-new-basename', 'Base name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'diagram-new-properName', 'Proper name')), 'sidenavRow') +
					H.tr(H.td(H.input('', 'in100', 'diagram-new-description', 'text',
						{ph: 'Description', x:'onkeydown="D.OnEnter(event, D.diagramPanel.newDiagramSection.create, D.diagramPanel.newDiagramSection)"'})), 'sidenavRow')) +
			H.span(D.GetButton('edit', 'D.diagramPanel.newDiagramSection.create(evt)', 'Create new diagram')) +
			H.span('', 'error', 'diagram-new-error');
		this.error = document.getElementById('diagram-new-error');
		this.basenameElt = document.getElementById('diagram-new-basename');
		this.properNameElt = document.getElementById('diagram-new-properName');
		this.descriptionElt = document.getElementById('diagram-new-description');
		this.update();
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
		}
	}
	create(e)
	{
		try
		{
			const basename = U.htmlSafe(this.basenameElt.value);
			const name = Element.Codename(R.$CAT, basename);
			if (R.$CAT.getMorphism(name))
				throw 'Diagram already exists';
			let diagram = D.ReadLocal(name);
			if (diagram)
			{
				// TODO recovery, remove later
				if (!R.Diagrams.has(name))
				{
					R.AddDiagram(diagram);
					R.SelectDiagram(diagram.name);
					if (diagram.user === R.user.name)
						R.diagramPanel.userDiagramsSection.update();
					throw 'diagram found locally!';
				}
			}
			diagram = new Diagram(R.$CAT,
			{
				basename,
				codomain:		R.Cat,
				properName:		U.htmlSafe(this.properNameElt.value),
				description:	U.htmlSafe(this.descriptionElt.value),
				user:			R.user.name,
			});
			R.AddDiagram(diagram);
			R.SelectDiagram(diagram.name);
			diagram.update();
			this.close();
			this.update();
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
}

class DiagramSection extends Section
{
	constructor(title, parent, id, tip, updateFn = function(diagram){return '';}, filterFn = function(diagram){return true;})
	{
		super(title, parent, id, tip);
		this.diagrams = null;
		this.updateFn = updateFn;
		this.filterFn = filterFn;
	}
	setDiagrams(diagrams)
	{
		this.diagrams = diagrams;
		this.update();
	}
	update()
	{
		if (super.update())
		{
			let rows = '';
			const that = this;	// can't use this below
			this.diagrams.forEach(function(diagram)
			{
				if (that.filterFn(diagram))
					rows += that.diagramRow(diagram, that.updateFn(diagram));
			});
			this.section.innerHTML = H.table(rows);
		}
	}
	diagramRow(diagram, tb = '')
	{
		const dt = new Date(diagram.timestamp);
//		const url = R.cloud ? R.cloud.getURL(diagram.codomain.basename, diagram.user, diagram.basename + '.png') : R.Diagrams.get(diagram.name).png;
		let src = '';
		if (D.diagramPNG.has(diagram.name))
			src = D.diagramPNG.get(diagram.name);
		if (src === '' && R.cloud)
			src = R.cloud.getURL(diagram.codomain.basename, diagram.user, diagram.basename + '.png')
		let tools = tb;
		tools +=	D.DownloadButton('JSON', `R.LoadDiagram('${diagram.name}').downloadJSON(evt)`, 'Download JSON') +
				D.DownloadButton('JS', `R.LoadDiagram('${diagram.name}').downloadJS(evt)`, 'Download Javascript') +
				D.DownloadButton('PNG', `R.LoadDiagram('${diagram.name}').downloadPNG(evt)`, 'Download PNG');
		const tbl = H.table(
				H.tr(H.td(H.h4(diagram.properName)) + H.td(tools, 'right')) +
				H.tr(H.td(`<img src="${src}" id="img_${diagram.name}" width="200" height="150"/>`, 'white', '', '', 'colspan="2"')) +
				H.tr(H.td(diagram.description, 'description', '', '', 'colspan="2"')) +
				H.tr(H.td(diagram.user, 'author') + H.td(dt.toLocaleString(), 'date')));
		return H.tr(H.td(`<a onclick="R.SelectDiagram('${diagram.name}')">` + tbl + '</a>'), 'grabbable sidenavRow', '', '',
			`draggable="true" ondragstart="D.DragElement(event, 'diagram ${diagram.name}')"`);
	}
}

class DiagramPanel extends Panel
{
	constructor()
	{
		super('diagram');
		this.elt.innerHTML =
			H.div('', '', 'diagramInfoDiv') +
			H.div('', '', 'diagramPanelToolbar') +
			H.h3(H.span('Diagram')) +
			H.h4(H.span('', '', 'diagram-basename') + H.span('', '', 'diagram-basename-edit')) +
			H.h4(H.span('', '', 'diagram-properName') + H.span('', '', 'diagram-properName-edit')) +
			H.p(H.span('', 'description', 'diagram-description', 'Description') + H.span('', '', 'diagram-description-edit')) +
			H.table(H.tr(H.td(H.span('', '', 'diagram-user')) + H.td(H.span('', '', 'diagram-timestamp'))));
		const deleteReferenceButton = function(diagram)
		{
			return diagram.refcnt === 0 ? D.GetButton('delete', `R.RemoveReference(evt,'${diagram.name}')`, 'Remove reference diagram') : '';
		};
		this.referenceSection = new DiagramSection('Reference Diagrams', this.elt, 'diagram-references-section', 'Diagrams referenced by this diagram', deleteReferenceButton);
		this.newDiagramSection = new NewDiagramSection(this.elt);
		const deleteUserDiagramButton = function(diagram)
		{
			return diagram.refcnt === 0 ? D.GetButton('delete', `R.DeleteUserDiagram('${diagram.name}')`, 'Delete user diagram permanently (no undo)') : '';
		};
		const userDiagramFilter = function(diagram)
		{
			return diagram.user === R.user.name;
		};
		this.userDiagramsSection = new DiagramSection('User Diagrams', this.elt, `diagram-user-section`, 'Diagrams created by the user', deleteUserDiagramButton, userDiagramFilter);
		this.initialize();
		this.basenamelt = document.getElementById('diagram-basename');
		this.properNameElt = document.getElementById('diagram-properName');
		this.properNameEditElt = document.getElementById('diagram-properName-edit');
		this.descriptionElt = document.getElementById('diagram-description');
		this.descriptionEditElt = document.getElementById('diagram-description-edit');
		this.userElt = document.getElementById('diagram-user');
		this.timestampElt = document.getElementById('diagram-timestamp');
		this.diagramPanelToolbarElt = document.getElementById('diagramPanelToolbar');
	}
	update()
	{
		const diagram = R.diagram;
		if (diagram)
		{
			this.referenceSection.setDiagrams(diagram.references);
			this.userDiagramsSection.setDiagrams(R.Diagrams);
			D.navbar.update();
			this.properNameElt.innerHTML = diagram.properName;
			this.descriptionElt.innerHTML = diagram.description;
			this.userElt.innerHTML = diagram.user;
			this.properNameEditElt.innerHTML = diagram.readonly ? '' :
				D.GetButton('edit', `R.diagram.editElementText(event, 'diagram-properName', 'properName')`, 'Retitle', D.default.button.tiny);
			this.descriptionEditElt.innerHTML = diagram.readonly ? '' :
				D.GetButton('edit', `D.diagramPanel.setDiagramDescription()`, 'Edit description', D.default.button.tiny);
			this.setToolbar(diagram);
		}
	}
	setDiagramDescription()
	{
		const diagram = R.diagram;
		if (!diagram.readonly && this.descriptionElt.contentEditable === 'true' && this.descriptionElt.textContent !== '')
		{
			R.diagram.description = this.descriptionElt.textContent;	// TODO safety check
			this.descriptionElt.contentEditable = false;
			D.SaveLocal(diagram);
		}
		else
		{
			this.descriptionElt.contentEditable = true;
			this.descriptionElt.focus();
		}
	}
	setToolbar(diagram)
	{
		const isUsers = diagram && (R.user.name === diagram.user);
		const html = H.table(H.tr(
//					(isUsers ? H.td(DiagramPanel.GetEraseBtn(diagram), 'buttonBar', 'eraseBtn') : '') +
					(isUsers ? H.td(DiagramPanel.GetLockBtn(diagram), 'buttonBar', 'lockBtn') : '') +
					((R.cloud && isUsers) ? H.td(D.GetButton('upload', 'R.diagram.upload(evt)', 'Upload', D.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '') +
					H.td(D.DownloadButton('JSON', 'R.diagram.downloadJSON(evt)', 'Download JSON'), 'buttonBar') +
					H.td(D.DownloadButton('JS', 'R.diagram.downloadJS(evt)', 'Download Javascript'), 'buttonBar') +
					H.td(D.DownloadButton('PNG', 'R.diagram.downloadPNG(evt)', 'Download PNG'), 'buttonBar') +
					this.expandPanelBtn() +
					this.closeBtnCell()), 'buttonBarRight');
		this.diagramPanelToolbarElt.innerHTML = html;
	}
	fetchRecentDiagrams()
	{
		R.cloud && fetch(R.cloud.getURL() + '/recent.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
return;	// TODO
					U.recentDiagrams = data.diagrams;
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
							return `<img class="intro" src="${R.cloud.getURL(tokens[1], d.user, d.name)}.png" width="300" height="225" title="${d.properName} by ${d.user}: ${d.description}"/>`;
						}).join('');
				});
		});
	}
	fetchCatalogDiagramTable()
	{
		if (R.cloud && !('catalogDiagrams' in Cat))
			fetch(R.cloud.getURL() + '/catalog.json').then(function(response)
			{
				if (response.ok)
					response.json().then(function(data)
					{
						U.catalogDiagrams = data.diagrams;
						let html = data.diagrams.map(d => DiagramPanel.DiagramRow(d)).join('');
						const dt = new Date(data.timestamp);
						document.getElementById('catalogDiagrams').innerHTML = H.span(`Last updated ${dt.toLocaleString()}`, 'smallPrint') + H.table(html);
					});
			});
	}
	static GetLockBtn(diagram)
	{
		const lockable = diagram.readonly ? 'unlock' : 'lock';
		return D.GetButton(lockable, `R.diagram.${lockable}(evt)`, U.cap(lockable));
	}
	static GetEraseBtn(diagram)
	{
		return diagram.readonly ? '' : D.GetButton('delete', "R.diagram.clear(evt)", 'Erase diagram!', D.default.button.small, false, 'eraseBtn');
	}
	static UpdateLockBtn(diagram)
	{
		if (diagram && R.user.name === diagram.user)
		{
			document.getElementById('lockBtn').innerHTML = DiagramPanel.GetLockBtn(diagram);
			const eb = document.getElementById('eraseBtn');
			if (eb)
				eb.innerHTML = DiagramPanel.GetEraseBtn(diagram);
		}
	}
	static SetupDiagramElementPnl(diagram, pnl, updateFnName)
	{
		const pnlName = diagram.name + pnl;
		return Panel.SectionPanelDyn(diagram.properName, `${updateFnName}(R.$CAT.getMorphism('${diagram.name}'))`, pnlName);
	}
}

class HelpPanel extends Panel
{
	constructor()
	{
		super('help', true)
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('Catecon') +
			H.h4('The Categorical Console')	+
			H.p(H.small('Level 1', 'smallCaps italic'), 'txtCenter') + H.br() +
			H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Interactive actions', `onclick="D.Panel.SectionToggle(this, \'catActionHelpPnl\')"`) +
			H.div(	H.h4('Mouse Actions') +
					H.h5('Select With Mouse') +
						H.p('Select an object or a morphism with the mouse.  You may window select by keeping the mouse down, then dragging, then releasing the mouse.') +
					H.h5('Region Select With Mouse') +
						H.p('Click the mouse button, then drag without releasing to cover some elements, and then release to select those elements.') +
					H.h5('Multi-Select With Shift Click') +
						H.p('Shift click to add another element to the select list') +
					H.h5('Control Drag') +
						H.p('Click with the mouse on an object with the Ctrl key down and then drag to create an identity morphism for that object.') +
						H.p('Doing the same with a morphism makes a copy of the morphism.') +
					H.h5('Mouse Wheel') +
						H.p('Use the mouse wheel to zoom in and out.') +
					H.h4('Key Actions') +
					H.h5('Delete') +
						H.p('Selected objects or morphisms are deleted.  Some elements cannot be deleted if they are referred to by another element.') +
					H.h5('Spacebar') +
						H.p('Press the spacebar and then with the mouse click-drag-release on the diagram to pan the view.') +
					H.h5('Home') +
						H.p('Return to the home view.') +
					H.h5('D') +
						H.p('Toggle the diagram panel.') +
					H.h5('F') +
						H.span('[Shift-f]', 'italic') + H.p('Place the floating point number object if it exists.') +
					H.h5('H') +
						H.p('Toggle the help panel.') +
					H.h5('L') +
						H.p('Toggle the login panel.') +
					H.h5('M') +
						H.p('Toggle the morphism panel.') +
					H.h5('N') +
						H.span('[Shift-n]', 'italic') + H.p('Place the natural number object if it exists.') +
					H.h5('O') +
						H.p('Toggle the object panel.') +
//					H.h5('O') +
//						H.span('[Shift-o]', 'italic') + H.p('Place the sub-object classifier object if it exists.') +
					H.h5('s') +
						H.p('Toggle the settings panel.') +
					H.h5('S') +
						H.span('[Shift-s]', 'italic') + H.p('Place the string object if it exists.') +
					H.h5('Y') +
						H.p('Toggle the tty panel.') +
					H.h5('Z') +
						H.span('[Shift-z]', 'italic') + H.p('Place the integers object if it exists.') +
					H.h5('3') +
						H.p('Toggle the 3D panel.')
					, 'section', 'catActionHelpPnl') +
			H.button('Category Theory', 'sidenavAccordion', 'catHelpPnlBtn', 'References', `onclick="D.Panel.SectionToggle(this, \'catHelpPnl\')"`) +
			H.div(
				H.small('All of mathematics is divided into one part: Category Theory', '') +
				H.h4('References') +
				H.p(H.a('"Categories For The Working Mathematician"', 'italic', '', '', 'href="https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician" target="_blank"')), 'section', 'catHelpPnl') +
			H.button('Articles', 'sidenavAccordion', 'referencesPnlBtn', '', `onclick="D.Panel.SectionToggle(this, \'referencesPnl\')"`) +
			H.div(	H.p(H.a('Intro To Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/09/16/cat-prog/"')) +
					H.p(H.a('V Is For Vortex - More Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"')), 'section', 'referencesPnl') +
			H.button('License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="D.Panel.SectionToggle(this, \'licensePnl\')"`) +
			H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
					H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
					H.p('Inelegant or unreferenced diagrams are removed.'), 'section', 'licensePnl') +
			H.button('Credits', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="D.Panel.SectionToggle(this, \'creditsPnl\')"`) +
			H.div(	H.a('Saunders Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
					H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'section', 'creditsPnl') +
			H.button('Third Party Software', 'sidenavAccordion', 'third-party', '', `onclick="D.Panel.SectionToggle(this, \'thirdPartySoftwarePnl\')"`) +
			H.div(
						H.a('3D', '', '', '', 'href="https://threejs.org/"') +
						H.a('Compressors', '', '', '', 'href="https://github.com/imaya/zlib.js"') +
						H.a('Crypto', '', '', '', 'href="http://bitwiseshiftleft.github.io/sjcl/"'), 'section', 'thirdPartySoftwarePnl') +
			H.hr() +
			H.small('&copy;2018-2019 Harry Dole') + H.br() +
			H.small('harry@harrydole.com', 'italic');
		this.initialize();
	}
}

class LoginPanel extends Panel
{
	constructor()
	{
		super('login', true);
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell()), 'buttonBarLeft') +
			H.h3('User') +
			H.table(
				H.tr(H.td('User:') + H.td(H.span('', 'smallBold', 'login-user-name'))) +
				H.tr(H.td('Email:') + H.td(H.span('', 'smallBold', 'login-user-email')))) +
			H.div('', '', 'login-info');
		this.initialize();
		this.loginInfoElt = document.getElementById('login-info');
		this.passwordResetFormElt = document.getElementById('login-password-reset');
		this.userNameElt = document.getElementById('login-user-name');
		this.userEmailElt = document.getElementById('login-user-email');
	}
	update()
	{
		this.userNameElt.innerHTML = R.user.name;
		this.userEmailElt.innerHTML = R.user.email;
		this.loginInfoElt.innerHTML = '';
		let html = '';
		if (R.user.status !== 'logged-in' && R.user.status !== 'registered')
			html += H.table(	H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'loginUserName', 'text', {ph:'Name'}))) +
								H.tr(H.td('Password')) +
								H.tr(H.td(H.input('', '', 'loginPassword', 'password', {ph:'********', x:'onkeydown="D.OnEnter(event, R.cloud.login)"'}))) +
								H.tr(H.td(H.button('Login', '', '', '', 'onclick=R.cloud.login()'))));
		if (R.user.status === 'unauthorized')
			html += H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="D.Panel.SectionToggle(this, \'signupPnl\')"`) +
					H.div( H.table(H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
								H.tr(H.td('Email')) +
								H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
								LoginPanel.PasswordForm() +
								H.tr(H.td(H.button('Sign up', '', '', '', 'onclick=R.cloud.signup()')))), 'section', 'signupPnl');
		if (R.user.status === 'registered')
			html += H.h3('Confirmation Code') +
					H.span('The confirmation code is sent by email to the specified address above.') +
					H.table(	H.tr(H.td('Confirmation code')) +
								H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code', x:'onkeydown="D.OnEnter(event, R.cloud.confirm)"'}))) +
								H.tr(H.td(H.button('Submit Confirmation Code', '', '', '', 'onclick=R.cloud.confirm()'))));
		this.loginInfoElt.innerHTML = html;
	}
	// TODO not used
	showResetForm()
	{
		this.passwordResetFormElt.innerHTML =
			H.table(
				LoginPanel.PasswordForm('reset') +
				H.tr(H.td(H.button('Reset password', '', '', '', 'onclick=R.cloud.resetPassword()'))));
	}
	static PasswordForm(sfx = '')
	{
		return H.tr(H.td('Secret Key for Access')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupSecret`, 'text', {ph:'????????'}))) +
				H.tr(H.td('Password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPassword`, 'password', {ph:'Password'}))) +
				H.tr(H.td('Confirm password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPasswordConfirm`, 'password', {ph:'Confirm'})));
	}
}

class NewObjectSection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'object-new-section', 'Create new object');
		this.section.innerHTML =
			H.table(H.tr(H.td(D.Input('', 'object-new-basename', 'Base name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'object-new-properName', 'Proper name')
//						+ H.button('&Dopf;', '', D.elementId(), 'Convert to double-struck font', `onclick="U.DoubleStruck(this.parentElement.children[0])"`
						), 'sidenavRow') +
		
					H.tr(H.td(H.input('', 'in100', 'object-new-description', 'text',
										{ph: 'Description', x:'onkeydown="D.OnEnter(event, D.objectPanel.newObjectSection.create, D.objectPanel.newObjectSection)"'})), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', 'D.objectPanel.newObjectSection.create(evt)', 'Create new object in this diagram')) +
			H.span('', 'error', 'object-new-error');
		this.error = document.getElementById('object-new-error');
		this.basenameElt = document.getElementById('object-new-basename');
		this.properNameElt = document.getElementById('object-new-properName');
		this.descriptionElt = document.getElementById('object-new-description');
		this.update();
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
		}
	}
	create(e)
	{
		try
		{
			const diagram = R.diagram;
			if (diagram.readonly)
				throw 'Diagram is read only';
			const basename = U.htmlSafe(this.basenameElt.value);
			const name = Element.Codename(diagram, basename);
			if (diagram.getObject(name))
				throw 'Object already exists';
			const to = new CatObject(diagram,
			{
				basename,
				category:		diagram.codomain,
				properName:		U.htmlEntitySafe(this.properNameElt.value),
				description:	U.htmlSafe(this.descriptionElt.value),
			});
			diagram.placeObject(e, to);
			D.ShowToolbar(e, D.Center());
			this.update();
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
}

class ObjectSection extends Section
{
	constructor(title, parent, id, tip, category)
	{
		super(title, parent, id, tip);
		this.objects = null;
	}
	setObjects(objs)
	{
		this.objects = objs;
		this.update();
	}
	update()
	{
		if (super.update())
		{
			let rows = H.tr((D.showInternals ? H.th('Ref. Count') : '') + H.th('Object'));
			if (this.objects)
			{
				const objects = this.objects instanceof Map ? this.objects.values() : this.objects;
				for (const o of objects)
				{
					const deletable = D.showInternals && o.refcnt === 0 && !(o.diagram && o.diagram.readonly);
					rows += H.tr(
						(D.showInternals ?
							H.td(o.refcnt.toString()
//								+ (deletable ?  D.GetButton('delete', `R.$CAT.getMorphism('${o.diagram.name}').deleteElement('${o.name}')`, 'Delete object') : '')
							) : '') +
						H.td(o.properName),
						'grabbable sidenavRow', '', U.cap(o.description), `draggable="true" ondragstart="D.DragElement(event, 'object ${o.name}')"`);
				}
				this.section.innerHTML = H.table(rows);
			}
		}
	}
}

class ObjectPanel extends Panel
{
	constructor()
	{
		super('object');
		this.elt.innerHTML =
			H.table(H.tr(this.expandPanelBtn() + this.closeBtnCell()), 'buttonBarRight') +
			H.h3('Objects');
		this.newObjectSection = new NewObjectSection(this.elt);
		this.diagramObjectSection = new ObjectSection('Diagram', this.elt, `object-diagram-section`, 'Objects in the current diagram');
		this.categoryObjectSection = new ObjectSection('Category', this.elt, `object-category-section`, 'Objects in the current category');
		this.initialize();
		// TODO references
	}
	update()
	{
		this.newObjectSection.update();
		if (R.diagram)
		{
			this.diagramObjectSection.setObjects(R.diagram.objects);
			this.categoryObjectSection.setObjects(R.diagram.codomain.objects);
		}
	}
}

class NewMorphismSection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'object-new-section', 'Create new object');
		this.section.innerHTML =
			H.table(
						H.tr(H.td(D.Input('', 'morphism-new-basename', 'Base name')), 'sidenavRow') +
						H.tr(H.td(D.Input('', 'morphism-new-properName', 'Proper name')), 'sidenavRow') +
						H.tr(H.td(H.input('', 'in100', 'morphism-new-description', 'text', {ph: 'Description',
											x:'onkeydown="D.OnEnter(event, D.morphismPanel.newMorphismSection.create, D.morphismPanel.newMorphismSection)"'})), 'sidenavRow') +
						H.tr(H.td(H.select('', 'in100', 'morphism-new-domain')), 'sidenavRow') +
						H.tr(H.td(H.select('', 'in100', 'morphism-new-codomain')), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', 'D.morphismPanel.newMorphismSection.create(evt)', 'Create new morphism in this diagram')) +
			H.span('', 'error', 'morphism-new-error');
		this.error = document.getElementById('morphism-new-error');
		this.basenameElt = document.getElementById('morphism-new-basename');
		this.properNameElt = document.getElementById('morphism-new-properName');
		this.descriptionElt = document.getElementById('morphism-new-description');
		this.domainElt = document.getElementById('morphism-new-domain');
		this.codomainElt = document.getElementById('morphism-new-codomain');
		this.update();
	}
	update()
	{
		if (super.update())
		{
			this.error.innerHTML = '';
			this.basenameElt.value = '';
			this.properNameElt.value = '';
			this.descriptionElt.value = '';
			this.domainElt.value = '';
			this.codomainElt.value = '';
			this.error.style.padding = '0px';
			let objects = '';
			for (const [name, o] of R.category.objects)
				objects += H.option(o.properName, o.name);
			this.domainElt.innerHTML = H.option('Domain', '') + objects;
			this.codomainElt.innerHTML = H.option('Codomain', '') + objects;
		}
	}
	create(e)
	{
		try
		{
			const diagram = R.diagram;
			if (diagram.readonly)
				throw 'Diagram is read only';
			const basename = U.htmlSafe(this.basenameElt.value);
			const name = Element.Codename(diagram, basename);
			if (diagram.getMorphism(name))
				throw 'Morphism already exists';
			const to = new Morphism(diagram,
			{
				basename,
				category:		diagram.codomain,
				properName:		U.htmlEntitySafe(this.properNameElt.value),
				description:	U.htmlSafe(this.descriptionElt.value),
				domain:			diagram.codomain.getObject(this.domainElt.value),
				codomain:		diagram.codomain.getObject(this.codomainElt.value),
			});
			diagram.placeMorphism(e, to);
			D.ShowToolbar(e, D.Center());
			this.update();
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
}

class MorphismSection extends Section
{
	constructor(title, parent, id, tip, isCurrentDiagram = false)
	{
		super(title, parent, id, tip);
		this.morphisms = null;
		this.isCurrentDiagram = isCurrentDiagram;
	}
	setMorphisms(morphisms)
	{
		this.morphisms = morphisms;
		this.update();
	}
	update()
	{
		if (super.update())
		{
			let rows = H.tr((D.showInternals ? H.th('Ref. Count') : '') + H.th('Morphism'));
			if (this.morphisms)
			{
				const morphisms = this.morphisms instanceof Map ? this.morphisms.values() : this.morphisms;
				for (const m of morphisms)
				{
					rows += H.tr(	(D.showInternals ? H.td(m.refcnt) : '') +
									H.td(m.properName +
										(this.isCurrentDiagram && m.refcnt <= 0 ?
											D.GetButton('delete', `R.$CAT.getMorphism('${R.diagram.name}').removeMorphism(evt, '${m.name}')`, 'Delete morphism') : '')) +
									H.td(m.domain.properName) +
									H.td('&rarr;') +
									H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="D.DragElement(event, 'morphism ${m.name}')"`);
				}
				this.section.innerHTML = H.table(rows);
			}
		}
	}
}

class MorphismPanel extends Panel
{
	constructor()
	{
		super('morphism');
		this.elt.innerHTML =
			H.table(H.tr(this.expandPanelBtn() + this.closeBtnCell()), 'buttonBarRight') +
			H.h3('Morphisms');
		this.newMorphismSection = new NewMorphismSection(this.elt);
		this.diagramMorphismSection = new MorphismSection('Diagram', this.elt, `morphism-diagram-section`, 'Morphisms in the current diagram', true);
		this.categoryMorphismSection = new MorphismSection('Category', this.elt, `morphism-category-section`, 'Morphisms in the current category');
		this.initialize();
	}
	update()
	{
		this.newMorphismSection.update();
		if (R.diagram)
		{
			this.diagramMorphismSection.setMorphisms(R.diagram.morphisms);
			this.categoryMorphismSection.setMorphisms(R.diagram.codomain.morphisms);
		}
	}
}

class SettingsPanel extends Panel
{
	constructor()
	{
		super('settings', true);
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell()), 'buttonBarLeft') +
			H.h3('Settings') +
			H.table(
				H.tr(H.td(`<input type="checkbox" ${D.gridding ? 'checked' : ''} onchange="D.gridding = !D.gridding">`) + H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${D.showInternals ? 'checked' : ''} onchange="D.SettingsPanel.ToggleShowInternals()">`) +
						H.td('Show internal info', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${D.showUploadArea ? 'checked' : ''} onchange="SettingsPanel.ToggleShowUploadArea()">`) +
						H.td('Show upload area for diagram snapshots.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${R.debug ? 'checked' : ''} onchange="R.debug = !R.debug">`) +
						H.td('Debug', 'left'), 'sidenavRow')
			);
		this.initialize();
	}
	static ToggleShowInternals()
	{
		D.showInternals = !D.showInternals;
		const diagram = R.diagram;
		if (diagram)
		{
			D.objectPanel.update();
			D.morphismPanel.update();
		}
	}
	// TODO move
	static ToggleShowUploadArea()
	{
		D.showUploadArea = !D.showUploadArea;
		D.upSVG.style.display = D.showUploadArea ? 'block' : 'none';
	}
}

class NewTextSection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'text-new-section', 'Create new text');
		this.section.innerHTML =
				H.table(H.tr(H.td(H.textarea('', 'textHtml', 'text-description')), 'sidenavRow')) +
				H.span(D.GetButton('edit', 'D.textPanel.newTextSection.create(evt)', 'Create new text for this diagram')) +
			H.span('', 'error', 'text-new-error');
		this.error = document.getElementById('text-new-error');
		this.descriptionElt = document.getElementById('text-description');
		this.update();
	}
	update()
	{
		this.error.innerHTML = '';
		this.descriptionElt.innerHTML = '';
	}
	create(e)
	{
		try
		{
			const diagram = R.diagram;
			const txt = new DiagramText(diagram, {diagram, description:U.htmlSafe(this.descriptionElt.value), xy:D.Center()});
			diagram.placeText(e, txt);
			this.update();
			D.textPanel.textSection.open();
		}
		catch(e)
		{
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
}

class TextSection extends Section
{
	constructor(parent)
	{
		super('Text', parent, 'text-section', 'Text in this diagram');
	}
	update()
	{
		const diagram = R.diagram;
		if (!diagram)
			return;
		let rows = '';
		diagram.texts.forEach(function(t)
		{
			rows += H.tr(	H.td(H.table(H.tr(H.td(D.GetButton('delete', `D.textPanel.delete('${t.name}')`, 'Delete text'))), 'buttonBarLeft')) +
							H.td(H.span(t.description, 'tty', `edit_${t.name}`) +
								(diagram.readonly ? '' :
									D.GetButton('edit', `R.diagram.getElement('${t.name}').editText(evt, 'edit_${t.name}')`, 'Edit', D.default.button.tiny)),
										'left'), 'sidenavRow');
		});
		this.section.innerHTML = rows === '' ?  '' : H.table(rows);
	}
}

class TextPanel extends Panel
{
	constructor()
	{
		super('text');
		this.elt.innerHTML =
			H.table(
				H.tr(this.closeBtnCell() + H.td(this.expandPanelBtn())), 'buttonBarRight') +
				H.h3('Text');
		this.initialize();
		this.newTextSection = new NewTextSection(this.elt);
		this.textSection = new TextSection(this.elt);
		this.textSection.open();
	}
	delete(name)
	{
		const diagram = R.diagram;
		if (diagram && diagram.texts.has(name))
		{
			const t = diagram.texts.get(name);
			t.decrRefcnt();
			this.textSection.update();
			diagram.update();
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
		if ('basename' in args)
		{
			if (!U.basenameEx.test(args.basename))
				throw 'invalid base name';
			Object.defineProperty(this, 'basename', {value: args.basename, writable: false});
			if (name === '')
				name = Element.Codename(diagram, args.basename);
		}
		if ('category' in args)
			Object.defineProperty(this, 'category', {value: R.GetCategory(args.category),	writable: false});
		else
			Object.defineProperty(this, 'category', {value:diagram.codomain,	writable: false});
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,										writable: true},	// is true for bootstrapping
			name:			{value: name,											writable: false},
			properName:		{value: 'properName' in args ? args.properName : 'basename' in args ? args.basename : name,	writable: true},
			description:	{value: 'description' in args ? args.description : '',	writable: true},
			readonly:		{value: 'readonly' in args ? args.readonly : false,		writable: true},
			refcnt:			{value: 0,												writable: true},
			user:			{value: 'user' in args ? args.user : R.user.name,		writable: false},
		});
	}
	help()
	{
		const html = H.h4(H.span(this.properName, '', 'properNameElt')) +
						(D.showInternals ? H.p(`Internal name: ${this.name}`) : '') +
						(D.showInternals ? ('basename' in this ? H.p(H.span(D.limit(this.basename), '', 'basenameElt', this.name)) : '') : '') +
						(D.showInternals ?  H.p(`Reference count: ${this.refcnt}`) : '') +
						H.p(H.span(U.cap(this.description), '', 'descriptionElt')) +
						H.p(`Prototype: ${this.constructor.name}`) +
						H.p(`User: ${this.user}`);
		return html;
	}
	isIterable()
	{
		return false;		// fitb
	}
	signature(sig = '')
	{
		return U.sha256(`${sig}-${this.constructor.name}-${this.name}`);
	}
	setSignature(sig = null)
	{
		return;	// TODO
		const s = this.computeSignature(sig);
		if ('signature' in this && this.signature !== s)
			throw `bad signature ${s} != ${this.signature}`;
		else
			Object.defineProperty(this, 'signature', {value: s, enumerable: true});
	}
	incrRefcnt()
	{
		++this.refcnt;
	}
	decrRefcnt()
	{
		if (R.debug)
			console.log('Element.decrRefcnt', this.name, this.refcnt);
		--this.refcnt;
	}
	json()
	{
		const a = {};
		a.description =	this.description;
//		a.signature =	this.signature;
		if ('basename' in this)
			a.basename =	this.basename;
		if ('name' in this)
			a.name =	this.name;
		a.prototype =	this.constructor.name;
		a.properName =	this.properName;
		a.readonly =	this.readonly;
		if ('category' in this)
			a.category = this.category.name;
		if ('user' in this)
			a.user = this.user;
		if ('diagram' in this && this.diagram !== null)
			a.diagram =	this.diagram.name;
		return a;
	}
	js(dgrmVarName = 'dgrm')
	{
		return `		new ${this.constructor.name}(${dgrmVarName}), ${this.stringify()};\n`;
	}
	stringify()
	{
		return JSON.stringify(this.json());
	}
	isEquivalent(elt)
	{
		// TODO
//		return elt ? this.signature === elt.signature : false;
		return elt ? this.name === elt.name : false;
	}
	isDeletable()
	{
		return this.refcnt <= 1;
	}
	needsParens()		// Most elements do not need parenthesis, but products and coproducts do.
	{
		return false;
	}
	moreHelp()
	{
		return '';
	}
	svg(sfx = '')
	{
		return document.getElementById(this.elementId() + (sfx !== '' ? sfx : ''));
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
		return `do_${this.name}`;
	}
	usesDiagram(diagram)
	{
		return this.diagram && this.diagram.name === diagram.name;
	}
	static Codename(diagram, basename)
	{
		return diagram ? `${diagram.name}/${basename}` : basename;
	}
}

class Graph
{
	constructor(tag, position, width, graphs = [])
	{
		this.tags = [tag];
		this.position = position;
		this.width = width;
		this.graphs = graphs;
		this.links = [];
		this.visited = [];
	}
	isLeaf()
	{
		return this.graphs.length === 0;
	}
	getFactor(...indices)
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
	tagGraph(tag)
	{
		if (this.tags.indexOf(tag) === -1)
			graph.tags.push(tag);
		this.graphs.map(g => g.tagGraph(tag));
	}
	componentGraph(graph, index)
	{
		if (this.isLeaf())
			this.links.map(lnk => lnk.splice(1, 0, index));
		else
			this.graphs.map((g, i) => g.componentGraph(graph.graphs[i], index));
	}
	traceLinks(link = [])
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
				U.ArrayMerge(this.tags, g.tags);
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
	mergeGraphs(data) // data: {from, base, inbound, outbound}
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
			U.ArrayMerge(this.links, links);
			//
			// merge the tags to our tags
			//
			U.ArrayMerge(this.tags, data.from.tags);
		}
		else
			this.graphs.map((g, i) => g.mergeGraphs({from:data.from.graphs[i], base:data.base, inbound:data.inbound, outbound:data.outbound}));
	}
	bindGraph(data)	// data: {cod, link, tag, domRoot, codRoot, offset}
	{
		if (this.isLeaf())
		{
			const domRoot = data.domRoot.slice();
			const codRoot = data.codRoot.slice();
			domRoot.push(...data.link);
			codRoot.push(...data.link);
			U.arraySet(this, 'links', codRoot);
			U.arraySet(data.cod, 'links', domRoot);
			U.arrayInclude(this, 'tags', data.tag);
			U.arrayInclude(data.cod, 'tags', data.tag);
		}
		else this.graphs.map((g, i) =>
		{
			//
			// add a level to our link
			//
			const subIndex = data.link.slice();
			subIndex.push(i + data.offset);
			const args = U.clone(data);
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
	copyDomCodLinks(seqGraph, data)	// data {cnt, link}
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
	copyGraph(data)	// data {map, src}
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
	svg(dgrm, data, first = true)	// data {index, dom:{x,y, name}, cod:{x,y, name}, visited, elementId}
	{
		if (this.isLeaf())
		{
			const dom = new D2({x:Math.round(this.position + (this.width/2.0) + (data.index[0] === 0 ? data.dom.x : data.cod.x)), y:data.index[0] === 0 ? data.dom.y : data.cod.y});
			let colorIndex = Number.MAX_VALUE;
			const srcKey = StringMorphism.LinkColorKey(data.index, data.dom.name, data.cod.name);
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
				const d = StringMorphism.SvgLinkUpdate(dom, lnk, data);
				const fs = this.tags.sort().join();
				const linkId = StringMorphism.LinkId(data, lnk);
				const lnkKey = StringMorphism.LinkColorKey(lnk, data.dom.name, data.cod.name);
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
					color = StringMorphism.ColorWheel(data);
					dgrm.colorIndex2color[colorIndex] = color;
				}
				data.visited.push(idxStr + ' ' + lnkStr);
				data.visited.push(lnkStr + ' ' + idxStr);
				return `<path data-link="${lnkStr} ${idxStr}" class="string" style="stroke:#${color}AA" id="${linkId}" d="${d}" filter="url(#softGlow)" onmouseover="D.Status(evt, '${fs}')"/>\n`;
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
}

class CatObject extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		if (this.category)
			this.category.addObject(this);
		else if (diagram)
			diagram.codomain.addObject(this);
	}
	help()
	{
		return super.help() + (this.category ? H.p(`Object in category: ${this.category.properName}`) : 'Object');
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		this.refcnt <= 0 && this.category && this.category.deleteObject(this);
	}
	getFactor(factor)	// With no further structure the ony factor we could possibly return is the object itself.
	{
		return this;
	}
	isEditable()		// Return true if the object has an editor for a web page
	{
		return false;	// override as needed
	}
	getGraph(data = {position:0})
	{
		const width = D.textWidth(this.properName);
		const position = data.position;
		data.position += width;
		return new Graph(this.constructor.name, position, width);
	}
	//
	// data: {fname, root, index, id, action, op}
	// e.g., {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}
	//
	factorButton(properName, data)
	{
		// TODO no action
		// TODO fix D.elementId()
		return H.table(H.tr(H.td(H.button(properName + data.txt, '', D.elementId(), data.title,
			`data-indices="${data.index.toString()}" onclick="R.diagram.${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`))));
	}
	static Process(diagram, args)
	{
		return new R.protos[args.prototype](diagram, args);
	}
	static Get(diagram, basename)
	{
		const object = diagram.getObject(Element.Codename(diagra, basename));
		return object ? object : new CatObject(diagram, {basename});
	}
}

class FiniteObject extends CatObject	// finite, explicit size or not
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.properName = args.size === '0' ? '&null;' : FiniteObject.ProperName(diagram, nuArgs);
		nuArgs.name = FiniteObject.Codename(diagram, nuArgs);
		super(diagram, nuArgs);
		if ('size' in nuArgs)
			Object.defineProperty(this, 'size', {value:	nuArgs.size, writable:	false});
	}
	help(suppress = false)
	{
		return super.help() + (suppress ? '' : H.p(`Finite object${'size' in this ? ' of size: ' + this.size.toString() : ''}`));
	}
	json()
	{
		const d = super.json();
		if ('size' in this)
			d.size = this.size;
		return d;
	}
	isIterable()
	{
		return true;
	}
	static Codename(diagram, args)
	{
		return `${args.category.name}/${args.size}`;
	}
	static ProperName(diagram, args)
	{
		return 'size' in args ? args.size.toString() : args.properName;
	}
	static Get(diagram, size)
	{
		const args = typeof size === 'undefined' ? {category:diagram.codomain} : {category:diagram.codomain, size};
		const object = diagram.getObject(FiniteObject.Codename(diagram, args));
		return object ? object : new FiniteObject(diagram, args);
	}
}

class InitialObject extends FiniteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.size = 0;
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help(true) + H.p('Initial object');
	}
	static Get(diagram)
	{
		const args = {category:diagram.codomain, size:0};
		const object = diagram.getObject(FiniteObject.Codename(diagram, args));
		return object ? object : new InitialObject(diagram, args);
	}
}

class TerminalObject extends FiniteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.size = 1;
		super(diagram, nuArgs);
		this[Symbol.iterator] = function*()
		{
			yield 0;
		}
	}
	help()
	{
		return super.help(true) + H.p('Terminal object');
	}
	static Get(diagram)
	{
		const args = {category:diagram.codomain, size:1};
		const object = diagram.getObject(FiniteObject.Codename(diagram, args));
		return object ? object : new TerminalObject(diagram, args);
	}
}

class SubobjectClassifier extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = SubobjectClassifer.Codename(diagram);
		nuArgs.properName = '&Omega;';
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help() + H.p('Subobject classifier');
	}
	static Codename(diagram)
	{
		return Element.Codename(diagram, 'Omega');
	}
	static Get(diagram)
	{
		const object = diagram.getObject('Omega');
		return object ? object : new SubobjectClassifier(diagram);
	}
}

class MultiObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'objects', {value:	nuArgs.objects.map(o => this.diagram.getObject(o)), writable:	false});
		this.objects.map(o => o.incrRefcnt());
		this.seperatorWidth = D.textWidth(', ');	// runtime; don't save; TODO remove
	}
	help(hdr)
	{
		return super.help() + hdr + this.objects.map(o => o.help()).join('');
	}
	signature(sig = '')
	{
		return U.sha256(`${sig}${this.codomain.name}:${this.constructor.name} ${objects.map(o => o.signature()).join()}`);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 0)
			this.objects.map(o => o.decrRefcnt());
		super.decrRefcnt();
	}
	json()
	{
		const object = super.json();
		object.objects = this.objects.map(o => o.name);
		return object;
	}
	getFactor(factor)
	{
		return factor.length > 0 ? this.objects[factor[0]].getFactor(factor.slice(1)) : this;
	}
	getFactorName(factor)
	{
		return this.getFactor(factor).name;
	}
	getFactorProperName(indices)
	{
		const f = this.getFactor(indices);
		return `<tspan>${f.properName}</tspan>${U.subscript(indices)}`;
	}
	isEditable()
	{
		return this.objects.reduce((r, o) => r &= o.isEditable(), true);
	}
	needsParens()
	{
		return true;
	}
	getGraph(tag, data, parenWidth, sepWidth, first = true)	// data: {position: 0}
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
	resetPosition()
	{
		return false;
	}
	moreHelp()
	{
		return H.table(H.tr(H.th('Objects', '', '', '', 'colspan=2')) + this.objects.map(o => H.tr(H.td(o.diagram.properName) + H.td(o.properName, 'left'))).join(''));
	}
	factorButton(data)
	{
		let html = H.tr(this.factorButton(data), 'sidename');
		let tbl = '';
		this.objects.map((o, i) =>
		{
			const subIndex = data.index.slice();
			subIndex.push(i);
			const d = U.clone(data);
			d.index = subIndex;
			tbl += H.td(o.factorButton(d));
		});
		return html + H.tr(H.td(H.table(H.tr(tbl))), 'sidename');
	}
	static ProperName(sep, objects)
	{
		return objects.map(o => o.needsParens() ? `(${o.properName})` : o.properName).join(sep);
	}
	static GetObjects(diagram, objects)
	{
		return objects.map(o => diagram.getObject(o));
	}
}

class ProductObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.name = ProductObject.Codename(diagram, nuArgs.objects);
		nuArgs.properName = 'properName' in args ? args.properName : ProductObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		this.seperatorWidth = D.textWidth('&times');	// in pixels
		this.setSignature();
	}
	help()
	{
		return super.help(H.p('Product of the following objects'));
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return this.objects.map(o => o.FromInput(false, uid));
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.textWidth('('), D.textWidth('&times;'), first);
	}
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, `Po{${objects.map(o => o.name).join(',')}}oP`);
	}
	static Get(diagram, objects)
	{
		const name = ProductObject.Codename(diagram, objects);
		const object = diagram.getObject(name);		// no products in the diagram domain cats
		return object ? object : new ProductObject(diagram, {objects});
	}
	static ProperName(objects)
	{
		return MultiObject.ProperName('&times;', objects);
	}
}

class Sequence extends ProductObject
{
	constructor(diagram, args)
	{
		super(diagram, args);
	}
	help()
	{
		return super.help(H.p('Sequence of the following objects'));
	}
	resetPosition()
	{
		return true;
	}
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, `So{${objects.map(o => o.name).join(',')}}oS`);
	}
	static Get(diagram, objects)
	{
		const name = Sequence.Codename(diagram, objects);
		const object = diagram.getObject(name);
		return object ? object : new Sequence(diagram, {objects});
	}
}

class CoproductObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.name = CoproductObject.Codename(diagram, nuArgs.objects);
		nuArgs.properName = 'properName' in args ? args.properName : CoproductObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		this.seperatorWidth = D.textWidth('&times');	// runtime, don't save TODO remove
		this.setSignature();
	}
	help()
	{
		return super.help(H.p('Coproduct of the following objects'));
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.parenWidth, D.textWidth('&plus;'), first);
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return {};	// TODO
	}
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, `Co{${objects.map(o => o.name).join(',')}}oC`);
	}
	static Get(diagram, objects)
	{
		const name = CoproductObject.Codename(diagram, objects);
		const object = diagram.getObject(name);
		return object ? object : new CoproductObject(diagram, {objects});
	}
	static ProperName(objects)
	{
		return MultiObject.ProperName('&plus;', objects);
	}
}

class HomObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.name = HomObject.Codename(diagram, nuArgs.objects);
		nuArgs.properName = 'properName' in args ? args.properName : HomObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		this.setSignature();
	}
	help()
	{
		return super.help(H.p('Hom of the following objects'));
	}
	/*
	toHTML(first=true, uid={uid:0, idp:'data'})
	{
		const domain = this.objects[0]
		const codomain = this.objects[1];
		const homKey = Category.HomKey(domain, codomain);
		const homset = this.diagram.getHomSet(domain, codomain);
		++uid.uid;
		const id = `${uid.idp}_${uid.uid}`;
		const th = H.tr(H.td(HomObject.ProperName(this.objects), '', '', '', `colspan='4'`));
		return H.table(th + D.MorphismTableRows(homset, `data-name="%1" onclick="Diagram.ToggleTableMorphism(event, '${id}', '%1')"`, false), 'toolbarTbl', id);
	}
	*/
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
	//	this.position = data.position;	// TODO ???
		const f = this.getFactor(indices);
		return `<tspan>${f.properName}</tspan>${U.subscript(indices)}`;
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.bracketWidth, D.commaWidth, first)
	}
	needsParens()
	{
		return false;
	}
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, `Ho{${objects.map(o => o.name).join(',')}}oH`);
	}
	static Get(diagram, objects)
	{
		const name = HomObject.Codename(diagram, objects);
		const object = diagram.getObject(name);
		return object ? object : new HomObject(diagram, {objects});
	}
	static ProperName(objects)
	{
		return `[${objects[0].properName}, ${objects[1].properName}]`;
	}
	static FromInput(first = true, uid={uid:9, idp:'data'})
	{
		++uid.uid;
		const morphism = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
		// TODO
	}
}

class DiagramText
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		const xy = U.getArg(args, 'xy', new D2);
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,													writable:	false},
			name:			{value: U.getArg(nuArgs, 'name', diagram.domain.getAnon('text_')),	writable:	false},
			x:				{value:	xy.x,														writable:	true},
			y:				{value:	xy.y,														writable:	true},
			width:			{value:	U.getArg(nuArgs, 'width', 0),								writable:	true},
			height:			{value:	U.getArg(nuArgs, 'height', D.default.font.height),			writable:	true},
			description:	{value:	U.getArg(nuArgs, 'description', 'Lorem ipsum categoricum'), writable:	true},
		});
		diagram.texts.set(this.name, this);
	}
	decrRefcnt()
	{
		this.diagram.texts.delete(this.name);
		const svg = this.svg();
		if (svg !== null)
		{
			svg.innerHTML = '';
			svg.parentNode.removeChild(svg);
		}
	}
	setXY(xy)
	{
		this.x = D.Grid(xy.x);
		this.y = D.Grid(xy.y);
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
			description:	this.description,
			height:		this.height,
			xy:			this.getXY(),
			width:		this.width,
			prototype:	'DiagramText',
		};
		return a;
	}
	editText(e, id)
	{
		const svg = document.getElementById(this.elementId());
		const from = this;
		R.diagram.editElementText(e, id, 'description', function()
		{
			R.diagram.updateElementAttribute(from, 'description', document.getElementById(id).innerText);
			svg.innerHTML = from.description;
		});
		/*
		const h = document.getElementById(id);
		if (!this.diagram.readonly && !this.readonly)
		{
			if (h.contentEditable === 'true')
			{
				this.diagram.updateElementAttribute(this, attr, h.innerText);
				h.contentEditable = false;
				document.getElementById(this.elementId()).innerHTML = this.description;
			}
			else
			{
				h.contentEditable = true;
				h.focus();
			}
		}
		*/
	}
	showSelected(state = true)
	{
		this.svg().classList[state ? 'add' : 'remove']('selected');
	}
	elementId()
	{
		return `dt_${this.name}`;
	}
	makeSVG()
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `nan in makeSVG`;
		let html = '';
		if (this.description.indexOf('\n') > -1)		// multi-line svg
		{
			let lines = this.description.split('\n').map(t => `<tspan x="0" dy="1.2em">${t}</tspan>`).join('');
			html =
`<g id="${this.elementId()}" transform="translate(${this.x} ${this.y + D.default.font.height/2})">
<text data-type="text" data-name="${this.name}" x="0" y="0" text-anchor="left" class="diagramText grabbable"
	onmousedown="R.diagram.pickElement(evt, '${this.name}')"> ${lines}</text></g>`;
		}
		else
			html =
`<text data-type="text" data-name="${this.name}" text-anchor="middle" class="diagramText grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + D.default.font.height/2}"
onmousedown="R.diagram.pickElement(evt, '${this.name}')">${this.description}</text>`;
		return html;
	}
	svg(sfx = '')
	{
		return document.getElementById(this.elementId() + (sfx !== '' ? sfx : ''));
	}
	isDeletable()
	{
		return true;
	}
	isEquivalent(t)
	{
		return t && this.name === t.name;
	}
	updatePosition(xy)
	{
		this.setXY(xy.round());		// round to pixel location
		const svg = this.svg();
		if (svg.hasAttribute('transform'))
			svg.setAttribute('transform', `translate(${D.Grid(this.x)} ${D.Grid(this.y)})`);
		else
		{
			if (svg.hasAttribute('x'))
			{
				svg.setAttribute('x', this.x);
				svg.setAttribute('y', this.y);
			}
		}
	}
	isFusible()
	{
		return false;
	}
	updateFusible()
	{}
}

class DiagramObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : diagram.domain.getAnon('dgrm_');
		nuArgs.category = diagram.domain;
		super(diagram, nuArgs);
		this.incrRefcnt();
		const xy = U.getArg(nuArgs, 'xy', new D2);
		Object.defineProperties(this,
		{
			category:	{value:	diagram.domain,										writable:	false},
			x:			{value:	xy.x,												writable:	true},
			y:			{value:	xy.y,												writable:	true},
			width:		{value:	U.getArg(nuArgs, 'width', 0),						writable:	true},
			height:		{value:	U.getArg(nuArgs, 'height', D.default.font.height),	writable:	true},
			to:			{value:	null,												writable:	true},
		});
		if ('to' in nuArgs)
			this.setObject(diagram.getObject(nuArgs.to));
	}
	help()
	{
		return super.help() + H.p('Object in index category');
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
		if (this.to)
		{
			if (this.to.isEquivalent(to))
				return;
			this.to.decrRefcnt();
		}
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
	makeSVG()
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `nan in ${this.name}`;
		return `<text data-type="object" data-name="${this.name}" text-anchor="middle" class="object grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + D.default.font.height/2}"
			onmousedown="R.diagram.pickElement(evt, '${this.name}')">${this.to.properName}</text>`;
	}
	getBBox()
	{
		return {x:this.x - this.width/2, y:this.y + this.height/2 - D.default.font.height, width:this.width, height:this.height};
	}
	updatePosition(xy)
	{
		this.setXY(xy.round());		// round to pixel location
		const svg = this.svg();
		if (svg.hasAttribute('transform'))
			svg.setAttribute('transform', `translate(${D.Grid(this.x)} ${D.Grid(this.y)})`);
		else
		{
			if (svg.hasAttribute('x'))
			{
				svg.setAttribute('x', this.x);
				svg.setAttribute('y', this.y + ('height' in this ? this.height/2 : 0));
			}
		}
	}
	showSelected(state = true)
	{
		this.svg().classList[state ? 'add' : 'remove']('selected');
	}
	isFusible(m)
	{
		return m && m.to && this.to.name === m.to.name;
	}
	updateFusible(on)
	{
		const e = this.svg();
		if (on)
		{
			e.classList.add(...['fuseObject']);
			e.classList.remove(...['selected', 'grabbable', 'object']);
		}
		else
		{
			e.classList.add(...['selected', 'grabbable', 'object']);
			e.classList.remove(...['fuseObject']);
		}
	}
}

class Action extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.category = diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'icon', {value:nuArgs.icon,	writable:	false});
	}
	help()
	{
		return super.help() + H.p('Action');
	}
	action(e, diagram, ary) {};	// fitb
	hasForm(e, diagram, ary) {return false;};	// fitb
}

class CompositeAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create composite of morphisms',
			name:			'composite',
			icon:
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, morphisms)
	{
		const to = Composite.Get(diagram, morphisms.map(m => m.to));
		const from = new DiagramMorphism(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms)});
		diagram.domain.makeHomSets();
		from.morphisms = morphisms;
		morphisms.map(m => m.incrRefcnt());
		diagram.addSVG(from);
		diagram.makeSelected(e, from);
		diagram.update();
	}
	hasForm(e, diagram, ary)
	{
		if (!diagram.readonly && ary.length > 1 && ary.reduce((hasIt, r) => hasIt && DiagramMorphism.prototype.isPrototypeOf(r), true))
		{
			let cod = ary[0].codomain;
			for(let i=1; i<ary.length; ++i)
			{
				const m = ary[i];
				if (!m.domain.isEquivalent(cod))
					return false;
				cod = m.codomain;
			}
			return true;
		}
		return false;
	}
}

class IdentityAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create identity morphism',
			name:			'identity',
			icon:	// TODO
`<line class="arrow0" x1="160" y1="60" x2="120" y2="100"/>
<line class="arrow0" x1="130" y1="260" x2="190" y2="260"/>
<line class="arrow0" x1="160" y1="60" x2="160" y2="260"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, set)
	{
		const domain = set[0];
		const id = Identity.Get(diagram, domain.to);
		diagram.objectPlaceMorphism(e, 'domain', domain, id);
	}
	hasForm(e, diagram, ary)
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

/*
	activateNamedElementForm(e)
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
	// TODO move to action
	createNamedIdentity(e)
	{
		try
		{
			if (this.readonly)
				throw 'diagram is read only';
			const from = this.getSelected();
			if (DiagramObject.prototype.isPrototypeOf(from))
			{
				document.getElementById('namedElementError').innerHTML = '';
				const basenameElt = document.getElementById('basenameElt');
				const basename = basenameElt.innerText;
				if (!U.basenameEx.test(basename))
					throw 'Invalid basename';
				const object = this.codomain.getObject(Element.Codename(this, basename));
				if (object)
					throw `object with basename ${basename} already exists in diagram ${this.properName}`;
				const properNameElt = document.getElementById('properNameElt');
				const properName = U.htmlEntitySafe(properNameElt.innerText);
				const descriptionElt = document.getElementById('descriptionElt');
				const description = U.htmlEntitySafe(descriptionElt.innerText);
				let toNI = new CatObject(this, {basename, description, properName});
				const iso = new Identity(this, {domain:toNI, codomain:from.to, description:`Named identity from ${toNI.properName} to ${from.to.properName}`});
				const iso2 = new Identity(this, {domain:from.to, codomain:toNI, description:`Named identity from ${from.to.properName} to ${toNI.properName}`});
				this.deselectAll();
				const isoFrom = this.objectPlaceMorphism(e, 'codomain', from.name, iso.name)
				const iso2From = new DiagramMorphism(this, {to:iso2, domain:isoFrom.codomain, codomain:isoFrom.domain});
				this.addSVG(iso2From);
				this.makeSelected(e, isoFrom);
				this.addSelected(iso2From);
				this.domain.makeHomSets();
				save && D.SaveLocal(this);
			}
			else
				throw 'Not implemented';
		}
		catch(e)
		{
			document.getElementById('namedElementError').innerHTML = 'Error: ' + U.GetError(e);
		}
	}
	*/
class NamedIdentityAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create named identity',
			name:			'namedIdentity',
			icon:	// TODO
`<path class="svgstr4" d="M100,120 C140,60 180,60 220,120" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M220,200 C180,260 140,260 100,200" marker-end="url(#arrowhead)"/>
<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="260" cy="160" r="60" fill="url(#radgrad1)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, set)
	{
		const domain = set[0];
		const id = Identity.Get(diagram, domain.to);
		diagram.objectPlaceMorphism(e, 'domain', domain, id);
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		let html =
			H.h5('Create Named Identity') +
			H.table(H.tr(H.td(D.Input('', 'named-identity-new-basename', 'Base name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'named-identity-new-properName', 'Proper name')
//						+ H.button('&Dopf;', '', D.elementId(), 'Convert to double-struck font', `onclick="U.DoubleStruck(this.parentElement.children[0])"`
						), 'sidenavRow') +
					H.tr(H.td(H.input('', 'in100', 'named-identity-new-description', 'text',
										{ph: 'Description', x:`onkeydown="D.OnEnter(event, R.$Actions.getObject('namedIdentity').create, D.objectPanel.newObjectSection)"`})), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', `R.$Actions.getObject('namedIdentity').create(evt)`, 'Create named identity')) +
			H.span('', 'error', 'named-identity-new-error');
		D.help.innerHTML = html;
	}
	create(e)
	{
		const error = document.getElementById('named-identity-new-error');
		const basenameElt = document.getElementById('named-identity-new-basename');
		const properNameElt = document.getElementById('named-identity-new-properName');
		const descriptionElt = document.getElementById('named-identity-new-description');
//			const basename = U.htmlSafe(this.basenameElt.value);
		try
		{
			const diagram = R.diagram;
			const sourceIndex = R.diagram.getSelected();
			const source = sourceIndex.to;
			const nid = new NamedIdentityObject(R.diagram, {source, basename:U.htmlSafe(basenameElt.value.trim()),
				properName:U.htmlEntitySafe(properNameElt.value.trim()), description:U.htmlSafe(descriptionElt.value)});
			const nidIndex = diagram.placeObject(e, nid, D.default.stdOffset.add(sourceIndex));
			const idx1 = new DiagramMorphism(diagram, {to:nid.idFrom, domain:nidIndex, codomain:sourceIndex});
			const idx2 = new DiagramMorphism(diagram, {to:nid.idTo, codomain:nidIndex, domain:sourceIndex});
			diagram.domain.makeHomSets();
			nidIndex.makeSVG();
			idx1.makeSVG();
			idx2.makeSVG();
			diagram.update();
		}
		catch(x)
		{
			error.style.padding = '4px';
			error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	hasForm(e, diagram, ary)
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

class CopyAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Copy an object or morphism',
			name:		'copy',
			icon:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary, args = {offset:D.default.stdOffset})
	{
		const from = ary[0];
		if (DiagramMorphism.prototype.isPrototypeOf(from))
			diagram.placeMorphism(e, from.to, args.offset.add(from.domain), args.offset.add(from.codomain))
		else if (DiagramObject.prototype.isPrototypeOf(from))
			diagram.placeObject(e, from.to, args.offset.add(from));
		else if (DiagramText.prototype.isPrototypeOf(from))
		{
			const txt = new DiagramText(diagram, {description:from.description, xy:args.offset.add(from)});
			diagram.placeText(e, txt);
		}
		diagram.update();
	}
	hasForm(e, diagram, ary)	// one element
	{
		return !diagram.readonly && ary.length === 1;
	}
}

class ProductAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a product of two or more objects or morphisms',
			name:			'product',
			icon:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const elt = ary[0];
		if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			const morphisms = ary.map(m => m.to);
			const to = ProductMorphism.Get(diagram, morphisms);
			diagram.placeMorphism(e, to, D.Barycenter(ary));
		}
		else if (DiagramObject.prototype.isPrototypeOf(elt))
		{
			const objects = ary.map(o => o.to);
			const to = ProductObject.Get(diagram, objects);
			diagram.placeObject(e, to, elt);
		}
	}
	hasForm(e, diagram, ary)
	{
		if (ary.length < 2)
			return false;
		return !diagram.readonly && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.prototype.isPrototypeOf(v), true));
	}
}

class CoproductAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a coproduct of two or more objects or morphisms',
			name:			'coproduct',
			icon:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="160" y1="80" x2="160" y2="240"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const elt = ary[0];
		if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			const morphisms = ary.map(m => m.to);
			const to = CoproductMorphism.Get(diagram, morphisms);
			diagram.placeMorphism(e, to, D.Barycenter(ary));
		}
		else if (DiagramObject.prototype.isPrototypeOf(elt))
		{
			const objects = ary.map(o => o.to);
			const to = CoproductObject.Get(diagram, objects);
			diagram.placeObject(e, to, elt);
		}
	}
	hasForm(e, diagram, ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		return !diagram.readonly && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.prototype.isPrototypeOf(v), true));
	}
}

class PullbackAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a pullback of two or more morphisms with a common codomain',
			name:			'pullback',
			icon:
`<path class="svgstr4" d="M60,120 120,120 120,60"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const cone = ary.map(m => m.to);
		const source = new DiagramObject(diagram, {xy:D.Barycenter(ary), to:PullbackObject.Get(diagram, {cone})});
		diagram.addSVG(source);
		cone.map((m, i) =>
		{
			const to = PullbackMorphism.Get(diagram, {object, leg:m});
			const from = new DiagramMorphism(diagram, {to, domain:source, codomain:ary[i].domain});
			diagram.addSVG(from);
			diagram.addSelected(from);
		});
		diagram.domain.makeHomSets();
		diagram.update();
	}
	hasForm(e, diagram, ary)
	{
		return !diagram.readonly && Category.IsSink(ary);
	}
}

class PushoutAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a pushout of two or more morphisms with a common domain',
			name:			'pushout',
			icon:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M200,260 200,200 260,200"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const cone = ary.map(m => m.to);
		const sink = new DiagramObject(diagram, {xy:D.Barycenter(ary), to:PushoutObject.Get(diagram, {cone})});
		diagram.addSVG(sink);
		cone.map((m, i) =>
		{
			const to = PullbackMorphism.Get(diagram, {object, leg:m});
			const from = new DiagramMorphism(diagram, {to, codomain:sink, domain:ary[i].codomain});
			diagram.addSVG(from);
			diagram.addSelected(from);
		});
		diagram.domain.makeHomSets();
		diagram.update();
	}
	hasForm(e, diagram, ary)
	{
		return !diagram.readonly && Category.IsSource(ary);
	}
}

class ProductAssemblyAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a product assembly of two or more morphisms with a common domain',
						name:			'productAssembly',
						icon:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="80" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="60" y1="80" x2="120" y2="260" marker-end="url(#arrowhead)"/>`, };
		super(diagram, args);
	}
	action(e, diagram, diagramMorphisms)
	{
		const morphisms = diagramMorphisms.map(m => m.to);
		const m = ProductAssembly.Get(diagram, morphisms);
		diagram.objectPlaceMorphism(e, 'domain', diagramMorphisms[0].domain, m);
	}
	hasForm(e, diagram, ary)
	{
		return !diagram.readonly && Category.IsSource(ary);
	}
}

class CoproductAssemblyAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a product assembly of two or more morphisms with a common codomain',
						name:			'coproductAssembly',
						icon:
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, diagramMorphisms)
	{
		const morphisms = diagramMorphisms.map(m => m.to);
		const m = CoproductAssembly.Get(diagram, morphisms);
		diagram.objectPlaceMorphism(e, 'codomain', diagramMorphisms[0].codomain, m);
	}
	hasForm(e, diagram, ary)
	{
		return !diagram.readonly && Category.IsSink(ary);
	}
}

class HomAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a hom object or morphism from two such items',
						name:			'hom',
						icon:	// TODO
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const xy = D.Barycenter(ary);
		if (DiagramObject.prototype.isPrototypeOf(ary[0]))
			diagram.placeObject(e, HomObject.Get(diagram, ary.map(o => o.to)), xy);
		else if (DiagramMorphism.prototype.isPrototypeOf(ary[0]))
			diagram.placeMorphism(e, HomMorphism.Get(diagram, ary.map(m => m.to)), xy);
	}
	hasForm(e, diagram, ary)	// two objects or morphisms
	{
		return !diagram.readonly && ary.length === 2 && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.prototype.isPrototypeOf(v), true));
	}
}

class HomRightAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Select a morphism listed from a common domain',
						name:		'homRight',
						icon:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const morphisms = [];
		let rows = '';
		for(const [key, m] of diagram.codomain.morphisms)
			if (from.to.name === m.domain.name)
				rows += D.HtmlRow(m, `onclick="R.diagram.objectPlaceMorphism(event, 'domain', '${from.name}', '${m.name}')"`);
		D.help.innerHTML = H.small(`Morphisms from ${from.to.properName}`, 'italic') + H.table(rows);
	}
	hasForm(e, diagram, ary)	// one object
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

class HomLeftAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Select a morphism listed from a common codomain',
						name:		'homLeft',
						icon:
`<circle cx="260" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="30" y1="160" x2="200" y2="160" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const morphisms = [];
		let rows = '';
		for(const [key, m] of diagram.codomain.morphisms)
			if (from.to.name === m.codomain.name)
				rows += D.HtmlRow(m, `onclick="R.diagram.objectPlaceMorphism(event, 'codomain', '${from.name}', '${m.name}')"`);
		D.help.innerHTML = H.small(`Morphisms to ${from.to.properName}`, 'italic') + H.table(rows);
	}
	hasForm(e, diagram, ary)	// one object
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

class DetachDomainAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Detach a morphism\'s domain',
						name:		'detachDomain',
						icon:
`<circle cx="40" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="100" cy="200" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="140" y1="200" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)		// diagram unused
	{
		const from = ary[0];
		const domain = from.domain;
		const detachedObj = new DiagramObject(diagram, {xy: {x:domain.x + D.default.toolbar.x, y:domain.y + D.default.toolbar.y } });
		domain.decrRefcnt();
		from.domain = detachedObj;
		diagram.domain.makeHomSets();
		detachedObj.setObject(from.to.domain);
		detachedObj.incrRefcnt();
		from.update();
		diagram.addSVG(detachedObj);
		diagram.makeSelected(e, from);
		diagram.update();
	}
	hasForm(e, diagram, ary)	// one morphism with connected domain but not a def of something
	{
		if (!diagram.readonly && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]) && !('morphisms' in ary[0]))
		{
			const from = ary[0];
			const domMorphs = diagram.domain.obj2morphs.get(from.domain);
			return from.isDeletable() && (domMorphs ? domMorphs.dom.length + domMorphs.cod.length > 1 : false);
		}
		return false;
	}
}

class DetachCodomainAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Detach a morphism\'s codomain',
						name:		'detachCodomain',
						icon:
`<circle cx="220" cy="200" r="60" fill="url(#radgrad1)"/>
<circle cx="280" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="40" y1="160" x2="180" y2="200" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)		// diagram unused
	{
		const from = ary[0];
		const codomain = from.codomain;
		const detachedObj = new DiagramObject(diagram, {xy: {x:codomain.x + D.default.toolbar.x, y:codomain.y + D.default.toolbar.y } });
		codomain.decrRefcnt();
		from.codomain = detachedObj;
		diagram.domain.makeHomSets();
		detachedObj.setObject(from.to.codomain);
		detachedObj.incrRefcnt();
		from.update();
		diagram.addSVG(detachedObj);
		diagram.makeSelected(e, from);
		diagram.update();
	}
	hasForm(e, diagram, ary)	// one morphism with connected codomain
	{
		if (!diagram.readonly && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]) && !('morphisms' in ary[0]))
		{
			const from = ary[0];
			const codMorphs = diagram.domain.obj2morphs.get(from.codomain);
			return from.isDeletable() && (codMorphs ? codMorphs.dom.length + codMorphs.cod.length > 1 : false);
		}
		return false;
	}
}

class EditMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Edit a morphism',
						name:		'editMorphism',
						icon:
`<circle cx="220" cy="200" r="60" fill="url(#radgrad1)"/>
<circle cx="280" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="40" y1="160" x2="180" y2="200" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const to = diagram.newDataMorphism(from.to.domain, from.to.codomain);	// TODO new is edit?
		diagram.setMorphism(from, to);
		diagram.updateElementAttribute(from, 'properName', to.properName);
		diagram.update(e);
		D.dataPanel.update();
		D.dataPanel.open();
	}
	hasForm(e, diagram, ary)	// one editable morphism
	{
		if (!diagram.readonly && ary.length === 1)
		{
			const from = ary[0];
			// TODO isTerminal
			return DataMorphism.prototype.isPrototypeOf(from.to) ||
						(Identity.prototype.isPrototypeOf(from.to) &&
							from.refcnt === 1 &&
//							!from.to.domain.isInitial &&
//							!from.to.codomain.isTerminal &&
							from.to.domain.isEditable());
		}
		return false;
	}
}

class DeleteAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Delete objects, morphisms or text',
						name:			'delete',
						icon:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="230" marker-end="url(#arrowhead)"/>
<path class="svgfilNone svgstr1" d="M90,190 A120,50 0 1,0 230,190"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		let updateObjects = false;
		let updateMorphisms = false;
		let updateTexts = false;
		for(let i=0; i<ary.length; ++i)
		{
			let s = ary[i];
			s.decrRefcnt();
			if (DiagramObject.prototype.isPrototypeOf(s))	// TODO what about morphisms as objects in 2Cat?
				updateObjects = true;
			else if (DiagramMorphism.prototype.isPrototypeOf(s))
				updateMorphisms = true;
			else if (DiagramText.prototype.isPrototypeOf(s))
				updateTexts = true;
		}
		if (updateObjects)
			D.objectPanel.update();
		if (updateMorphisms)
		{
			D.morphismPanel.update();
			diagram.domain.makeHomSets();
		}
		if (updateTexts)
			D.textPanel.update();
		diagram.selected = [];	// do not use diagram.deselectAll()
		diagram.update();
		D.HideToolbar();
	}
	hasForm(e, diagram, ary)	// all are deletable
	{
		return !diagram.readonly && ary.reduce((hasIt, a) => hasIt && a.isDeletable(), true);
	}
}

class TerminalMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a terminal morphism from an object',
						name:		'terminalMorphism',
						icon:	// TODO
`<line class="arrow0" x1="20" y1="160" x2="160" y2="160" marker-end="url(#arrowhead)"/>
<line class="svgstr3" x1="180" y1="160" x2="300" y2="160"/>
<line class="svgstr3" x1="200" y1="120" x2="280" y2="200"/>
<line class="svgstr3" x1="200" y1="200" x2="280" y2="120"/>
<line class="svgstr3" x1="240" y1="100" x2="240" y2="220"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const object = ary[0];
		const m = TerminalMorphism.Get(diagram, object.to);
		diagram.objectPlaceMorphism(e, 'domain', object, m.name)
	}
	initialize(category)
	{
		new TerminalObject(null, {category});
	}
	hasForm(e, diagram, ary)	// one object
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

class InitialMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create an initial morphism to an object',
						name:			'initialMorphism',
						icon:
`<circle cx="80" cy="160" r="60" class="svgstr3"/>
<line class="svgstr3" x1="140" y1="100" x2="20" y2="220"/>
<line class="arrow0" x1="160" y1="160" x2="300" y2="160" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)		// diagram unused
	{
		const object = ary[0];
		const m = InitialMorphism.Get(diagram, object.to);
		diagram.objectPlaceMorphism(e, 'codomain', object, m.name)
	}
	initialize(category)
	{
		new InitialObject(null, {category});
	}
	hasForm(e, diagram, ary)	// one object
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

class LambdaMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Form a lambda of a morphism',
						name:			'lambdaMorphism',
						icon:
`<circle cx="120" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="200" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="120" cy="240" r="60" fill="url(#radgrad1)"/>
<circle cx="200" cy="240" r="60" fill="url(#radgrad1)"/>
<polyline class="svgstr3" points="80,200 60,200 60,280 100,280"/>
<polyline class="svgstr3" points="240,200 260,200 260,280 240,280"/>
<line class="arrow0" x1="160" y1="100" x2="160" y2="200" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const domFactors = U.GetFactorsByDomCodId('domainDiv');
		const homFactors = U.GetFactorsByDomCodId('codomainDiv');
		const m = LambdaMorphism.Get(this, {preCurry:from.to, domFactors, homFactors});
		const v = D2.Subtract(from.codomain, from.domain);
		const normV = v.normal().normalize();
		const xyDom = normV.scale(D.default.arrow.length).add(from.domain);
		const xyCod = normV.scale(D.default.arrow.length, normV).add(from.codomain);
		diagram.placeMorphism(e, m);
	}
	hasForm(e, diagram, ary)	// 
	{
		return !diagram.readonly && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]) &&
			(ProductObject.prototype.isPrototypeOf(ary[0].to.domain) || HomObject.prototype.isPrototypeOf(ary[0].to.codomain));
	}
	html(e, diagram, ary)
	{
		const domain = ary[0].domain;
		const codomain = ary[0].codomain;
		const html =
			H.h4('Curry A &otimes; B -> [C, D]') +
			H.h5('Domain Factors: A &otimes; B') +
			H.small('Click to move to C') +
			H.div(domain.getSubFactorBtnCode({dir:	0, fromId:'domainDiv', toId:'codomainDiv'}), '', 'domainDiv') +
			H.h5('Codomain Factors: C') +
			(HomObject.prototype.isPrototypeOf(codomain) ?
				H.small('Merge to codomain hom') + D.GetButton('codhom', `R.diagram.toggleCodHom()`, 'Merge codomain hom', D.default.button.tiny) + H.br() : '') +
			H.small('Click to move to A &otimes; B') +
			// TODO this factorButton arguments are not correct
			H.div(HomObject.prototype.isPrototypeOf(codomain) ? codomain.homDomain().factorButton({dir:1, fromId:'codomainDiv', toId:'domainDiv'})
																: '', '', 'codomainDiv') +
			H.span(D.GetButton('edit', `R.diagram.activate(evt, 'lambdaMorphism')`, 'Curry morphism'));
		D.help.innerHTML = html;
	}
}

class ProjectAction extends Action
{
	constructor(diagram)
	{
		const args = {	name:		'project',
						icon:
					`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="110" y1="120" x2="240" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="200" x2="240" y2="280" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = this.addFactorMorphism(from.to, U.GetFactorsById('codomainDiv'));
		this.objectPlaceMorphism(e, 'domain', from, m)
	}
	hasForm(e, diagram, ary)	// one product object
	{
		return !diagram.readonly && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]) && ProductObject.prototype.isPrototypeOf(ary[0].to);
	}
	html(e, diagram, ary)
	{
		const to = ary[0].to;
		const html = H.h4('Create Factor Morphism') +
					H.h5('Domain Factors') +
					H.small('Click to place in codomain') +
			// TODO fix D.elementId()
					H.button('1', '', D.elementId(), 'Add terminal object', `onclick="R.diagram.addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					to.factorButton({fname:'selectedFactorMorphism', root:to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		D.help.innerHTML = html;
	}
}

class HelpAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Give help for an item',
						name:			'help',
						icon:
`<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,120 C100,40 280,40 210,120 S170,170 160,200"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary) {}
	hasForm(e, diagram, ary)	// one element
	{
		return ary.length === 1;
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const readonly = from.diagram.readonly;
		let html = '';
		if (from.to)
			html = from.to.help();
		else if (DiagramText.prototype.isPrototypeOf(from) && !readonly)
		{
			const btn = from.constructor.name === 'DiagramText' ?
				D.GetButton('edit', `R.diagram.getElement('${from.name}').editText(evt, 'descriptionElt')`, 'Edit', D.default.button.tiny) :
				D.GetButton('edit', `R.diagram.editElementText(event, 'descriptionElt', 'description')`, 'Edit text', D.default.button.tiny);
			html = H.p(H.span(from.description, 'tty', 'descriptionElt') + btn);
		}
		D.help.innerHTML = html;
	}
}

class JavascriptAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Give javascript code for a bare morphism',
						name:			'javascript',
						icon:
'<text text-anchor="middle" x="160" y="280" style="font-size:240px;stroke:#000;">JS</text>',};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const m = ary[0].to;
		if (m.constructor.name === 'Morphism')	// only edit Morphisms and not derived ones
		{
			if (!('code' in m))
				m.code = {};
			m.code.javascript = this.header(m) + document.getElementById('morphism-javascript').innerText.trim() + this.tail(m);
			diagram.update();
		}
	}
	hasForm(e, diagram, ary)
	{
		return ary.length === 1 && Morphism.prototype.isPrototypeOf(ary[0]);
	}
	isEditable(m)
	{
		return !m.diagram.readonly && m.constructor.name === 'Morphism' &&
			!InitialObject.prototype.isPrototypeOf(m.domain) &&
			!TerminalObject.prototype.isPrototypeOf(m.codomain) &&
			!InitialObject.prototype.isPrototypeOf(m.codomain);
	}
	header(m)
	{
		return `function ${this.jsName(m)}(args)\n{\n`;
	}
	tail(m)
	{
		return `}\n`;
	}
	html(e, diagram, ary)
	{
		const m = ary[0].to;
		let html = '';
		if (m.constructor.name === 'Morphism')
		{
			/*
			html += H.p(`${this.jsName(m)}(args)\n{`, 'code') + H.p(code, 'code indent', 'morphism-javascript') + H.p(`}`, 'code') +
					(this.isEditable(m) ? D.GetButton('edit', `R.diagram.setMorphismCode(event, 'morphism-javascript', 'javascript')`, 'Edit code', D.default.button.tiny): '');
			*/
			let code = 'code' in m ? ('javascript' in m.code ? m.code.javascript : '') : '';
			if (code === '')
				code = this.generate(m);
			const header = this.header(m);
			const tail = this.tail(m);
			let body = '';
			body = code.substring(header.length, code.length - tail.length);
			html += H.div(header, 'code') + H.div(body, 'code indent', 'morphism-javascript') + H.div(tail, 'code') +
					(this.isEditable(m) ? D.GetButton('edit', `R.$Actions.getObject('javascript').setMorphismCode(event, 'morphism-javascript', 'javascript')`,
						'Edit code', D.default.button.tiny): '');
		}
		else
			html = H.p(this.generate(m), 'code', 'morphism-javascript');
		D.help.innerHTML = html;
	}
	jsName(e, cls = false)
	{
		const s = e.name;
		const r = s.replace(/\//g, '_').replace(/{/g, '_Br_').replace(/}/g, '_rB_').replace(/,/g, '_c_');
		return r;
	}
	setMorphismCode(e, id, type)
	{
		const elt = document.getElementById(id);
		if (!R.diagram.readonly && elt.contentEditable === 'true' && elt.textContent !== '')
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
	objectStructure(o)
	{
		let code = '';
		switch(o.constructor.name)
		{
			case 'CatObject':
				const jsn = this.jsName(o);
				code += `'${jsn}'`;
				break;
			case 'ProductObject':
				code += `[${o.objects.map(so => this.objectStructure(so)).join()}]`;
				break;
			case 'CoproductObject':
				code += `[${o.objects.map(so => this.objectStructure(so)).join()}]`;
				break;
		}
		return code;
	}
	generate(m, generated = new Set)
	{
		let code = '';
		const proto = m.constructor.name;
		if (!generated.has(m.name))
		{
			if ('code' in m && 'javascript' in m.code)
			{
				code += m.code.javascript;
				generated.add(m.name);
				return code;
			}
	 		if (MultiMorphism.prototype.isPrototypeOf(m))
				code += m.morphisms.map(n => this.generate(n, generated)).join('\n');
			const jsName = this.jsName(m);
			const header = `function ${jsName}(args)\n{\n`;
			const tail = `\n}\n`;
			if (InitialObject.prototype.isPrototypeOf(m.domain))
				code += `${header}	return;	// abandon computation\n'${tail}`;
			else if (TerminalObject.prototype.isPrototypeOf(m.codomain))
				code += `${header}	return 0;${tail}`;
			else if (InitialObject.prototype.isPrototypeOf(m.codomain))
				code += `${header}	throw 'do not do this';${tail}`;
			else if (TerminalObject.prototype.isPrototypeOf(m.domain))
				code += `${header}	// TODO replace this code with that which returns the desired object\n	return ${this.objectStructure(m.codomain)}${tail}`;
			else
				switch(proto)
				{
					case 'Morphism':
						if ('code' in m)
							code += `${m.code.javascript}\n`;
						break;
					case 'Composite':
						code += `${header}	${m.morphisms.map(n => this.jsName(n) + '(').reverse().join('')}args${ ")".repeat(m.morphisms.length) };${tail}`;
						break;
					case 'Identity':
						code += `${header}	return args;${tail}`;
						break;
					case 'ProductMorphism':
						code += `${header}	return [${m.morphisms.map((n, i) => this.jsName(n) + '(args[' + i + '])').join()}];${tail}`;
						break;
					case 'CoproductMorphism':
						code +=
`const ${jsName}_morphisms = [${m.morphisms.map((n, i) => this.jsName(n)).join()}];
${header}	return [args(0), ${jsName}_morphisms[args[0]](args[1])];${tail}`;
						break;
					case 'ProductAssembly':
						code += `${header}	return [${m.morphisms.map((n, i) => this.jsName(n) + '(args)').join()}];${tail}`;
						break;
					case 'CoproductAssembly':
						code +=
`const ${jsName}_morphisms = [${m.morphisms.map((n, i) => this.jsName(n)).join()}];
${header}	return ${jsName}_morphisms[args[0]](args[1]);${tail}`;
						break;
					case 'FactorMorphism':
						// TODO
						break;
					case 'DiagonalMorphism':
						code += `${header}	const a = [];\n	return a.fill(args, 0, ${m.count});${tail}`;
						break;
					case 'FoldMorphism':
						code += `${header}	return args[args[0]];${tail}`;
						break;
					case 'DataMorphism':
						code +=	// TODO safety check?
`const ${jsName}_Data =
{
	${m.data.forEach(function(i){return `	'${i}':'${m.data[i]}',\n`;})}
}
function ${jsName}_Iterator(fn)
{
	const result = {};
	Object.keys(${jsName}_Data).forEach(function(i)
	{
		result[i] = fn(i);
	});
	return result;
}
${header}	return ${jsName}_Data[args];${tail}`;
						break;
					case 'Recursive':
						break;
					case 'LambdaMorphism':
						break;
					case 'HomMorphism':
						break;
					case 'Evaluation':
						break;
					case 'InitialMorphism':
						code += `${header}	return;${tail}`;
						break;
					case 'TerminalMorphism':
						code += `${header}	return 0;${tail}`;
						break;
					case 'StringMorphism':
						break;
				}
			generated.add(m.name);
		}
		return code;
	}
	generateDiagram(diagram)
	{
		let code = '';
		const generated = new Set;
		generated.add('');	// no exec
		for (const m of diagram.morphisms)
			code += this.generate(m, generated);
		return code;
	}
}

class RunAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Run a morphism',
						name:		'run',
						icon:
`<line class="arrow0" x1="20" y1="80" x2="180" y2="80" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="140" y1="240" x2="300" y2="240" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
		this.workers = [];
		this.jsAction = R.$Actions.getObject('javascript');
	}
	action(e, diagram, ary)
	{
		const m = ary[0].to;
		if (Morphism.prototype.isPrototypeOf(m) && m.isIterable())
		{
			const start = Date.now();
			const jsName = this.jsAction.jsName(m);
			const dmName = this.jsAction.jsName(m.morphisms[0]);
			const code =
`// Catecon javascript code generator ${Date()}
onmessage = function(e)
{
	console.log('worker onmessage',e);
	postMessage([0, 'Starting']);
	try
	{
		const result = ${dmName}_Iterator(${jsName});
		console.log('worker work',result);
		postMessage([1, result]);
	}
	catch(e)
	{
		postMessage([2, e]);
	}
}
${this.jsAction.generate(m)}
`;
console.log('run code', code);
			const blob = new Blob([code], {type:'application/javascript'});
			const url = D.url.createObjectURL(blob);
			const w = new Worker(url);
			this.workers.push(w);
			w.onmessage = function(e)
			{
				console.log('result from worker', e.data);
				w.terminate();
			};
			w.postMessage('crank it up');
		}
	}
	hasForm(e, diagram, ary)	// one iterable composite morphism
	{
		return ary.length === 1 && Composite.prototype.isPrototypeOf(ary[0].to) && ary[0].to.isIterable();
	}
}

class FiniteObjectAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Convert to or edit a finite discrete object',
						name:		'finiteObject',
						icon:	// TODO 3x3 dots
`<circle cx="80" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="80" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="80" cy="240" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="240" r="60" fill="url(#radgrad1)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		if (to.constructor.name === 'CatObject' && to.refcnt === 1)
			from.setObject(new FiniteObject(diagram, {category:diagram.codomain, properName:to.properName}));
		else
		{
			const sizeElt = document.getElementById('finiteObject-size');
			const txt = sizeElt.innerText.trim();
			const size = Number.parseInt(txt);
			if (size < 0 || size.toString() !== txt)
			{
				sizseElt.classList.add('error');
				return;
			}
			sizeElt.classList.remove('error');
			m.size.javascript = size;
			sizeElt.innerHTML = size.toString();
		}
		this.html(e, diagram, ary);
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const isEditable = diagram.objects.has(to) && !diagram.readonly;
		let html = ''
		if (isEditable && to.constructor.name === 'CatObject' && to.refcnt === 1)
		{
			html += H.div('Convert generic object to a finite object') +
				D.GetButton('edit', `R.$Actions.getObject('finiteObject').action(event, R.diagram, R.diagram.selected)`, 'Convert to finite object', D.default.button.tiny);
		}
		else
		{
			html += H.div('Finite object');
			html += 'size' in to ? H.div('Size ' + H.span(to.size, '', 'finiteObject-size')) : '';
			if (isEditable)
			{
				html += D.GetButton('edit', `R.$Actions.getObject('finiteObject').action(event, R.diagram, R.diagram.selected)`,
						'Change finite object size', D.default.button.tiny);
			}
		}
		D.help.innerHTML = html;
	}
	hasForm(e, diagram, ary)
	{
		if (!diagram.readonly && ary.length === 1)
		{
			const from = ary[0];
			if (diagram.objects.has(from.to) && from.to.constructor.name === 'CatObject' && from.to.refcnt === 1)
				return  true;
			return FiniteObject.prototype.isPrototypeOf(from.to);
		}
		return false;
	}
}

class DataAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create or edit a data morphism',
						name:		'data',
						icon:	// TODO table
`<line class="arrow0" x1="20" y1="80" x2="180" y2="80" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="140" y1="240" x2="300" y2="240" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = from.to;
		if (m.constructor.name === 'Morphism')
		{
			const args =
			{
				description:	`data morphism from ${m.domain.properName} to ${m.codomain.properName}`,
				properName:		m.properName,
			}
			from.setMorphism(new DataMorphism(diagram, args));
			diagram.makeSelected(from);	// probably already was
		}
		D.dataPanel.open();
	}
	hasForm(e, diagram, ary)
	{
		if (!diagram.readonly && ary.length === 1)
		{
			const m = ary[0].to;
			if (diagram.morphisms.has(m) && m.domain.isIterable())
				return  m.constructor.name === 'Morphism' || DataMorphism.prototype.isPrototypeOf(ary[0].to);
		}
		return false;
	}
}

class Category extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Element.Codename(diagram, nuArgs.basename);
		nuArgs.category = diagram && 'codomain' in diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			objects:	{value:	new Map(),	writable:	false},
			morphisms:	{value:	new Map(),	writable:	false},
			actions:	{value:	new Map(R.standardActions),	writable:	false},
		});
		this.initializeActions();
		this.process(diagram, nuArgs);
	}
	help()
	{
		return super.help() + H.p(`Category with ${this.objects.size} objects, ${this.morphisms.size} morphisms, and ${this.actions.size} actions.`);
	}
	initializeActions()
	{
		for (const [n, a] of this.actions)
			if ('initialize' in a)
				a.initialize(this);
	}
	/*
	signature()
	{
		let s = '';
		for ([key, o] of this.objects)
			s += o.signature;
		for ([key, m] of this.morphisms)
			s += m.signature;
		return U.sha256(`Cat ${this.name} ${this.constructor.name} ${s});
	}
	*/
	//
	// Reconstitute this category from its saved contents.
	//
	process(diagram, args, objects = null, morphisms = null)
	{
		let errMsg = '';
		if (args && 'objects' in args)
			args.objects.map(o =>
			{
				if (!this.getObject(o.name))
				{
					try
					{
						const object = CatObject.Process(diagram, o);
						objects && objects.add(object);
if (!object.category)debugger;
					}
					catch(x)
					{
						errMsg += x + '\n';
					}
				}
				else
					throw 'object already exists';
			}, this);
		if (args && 'morphisms' in args)
			args.morphisms.map(m =>
			{
				if (!this.getMorphism(m.name))
				{
					try
					{
						const morphism = Morphism.Process(diagram, m);
						morphisms && morphisms.add(morphism);
if (!morphism.category)debugger;
					}
					catch(x)
					{
						errMsg += x + '\n';
					}
				}	// skip duplicates from auto-gens like named ids
//				else
//					errMsg += `morphism ${m.name} already exists\n`;
			}, this);
		if ('Actions' in R && 'actions' in args)	// bootstrap issue
			args.actions.map(a => this.actions.set(a, R.$Actions.getObject(a)));
		if (errMsg != '')
			D.RecordError(errMsg);
		for(const [key, m] of this.morphisms)
			if (Recursive.prototype.isPrototypeOf(m) && String.prototype.isPrototypeOf(m.recursor))
				m.setRecursor(m.recursor);
	}
	json()
	{
		const a = super.json();
		a.objects = U.jsonArray(this.objects);
		a.morphisms = U.jsonArray(this.morphisms);
		a.actions = new Array(this.actions.keys());
		return a;
	}
	getObject(name)
	{
//		if (Element.prototype.isPrototypeOf(name))
		if (typeof name === 'string')
			return this.objects.get(name);
		return name;
	}
	addObject(o)
	{
		if (this.objects.has(o.name))
			throw `Object with given name already exists in category`;
		this.objects.set(o.name, o);
		o.diagram && !DiagramObject.prototype.isPrototypeOf(o) && o.diagram.objects.add(o);
	}
	deleteObject(o)
	{
		this.objects.delete(o.name);
		o.diagram && o.diagram.objects.delete(o);
	}
	getMorphism(name)
	{
		if (Morphism.prototype.isPrototypeOf(name))
			return name;
		return this.morphisms.has(name) ? this.morphisms.get(name) : null;
	}
	addMorphism(m)
	{
		if (this.getMorphism(m.name))
			throw 'morphism with given name already exists in category';
		this.morphisms.set(m.name, m);
		m.diagram && !DiagramMorphism.prototype.isPrototypeOf(m) && m.diagram.morphisms.add(m);
	}
	deleteMorphism(m)
	{
		this.morphisms.delete(m.name);
		m.diagram && m.diagram.morphisms.delete(m);
	}
	basenameIsUsed(name)
	{
		return this.getObject(name) || this.getMorphism(name);
	}
	getAnon(s = 'Anon')
	{
		while(true)
		{
			const name = `${s}_${U.random()}`;
			if (!this.basenameIsUsed(name))
				return name;
		}
	}
	static IsSink(ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		const elt = ary[0];
		if (!DiagramMorphism.prototype.isPrototypeOf(elt))
			return false;
		const codomain = elt.codomain;
		for(let i=1; i<ary.length; ++i)
		{
			const a = ary[i];
			if (!DiagramMorphism.prototype.isPrototypeOf(a) || !a.codomain.isEquivalent(codomain))
				return false;
		}
		return true;
	}
	static IsSource(ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		const elt = ary[0];
		if (!DiagramMorphism.prototype.isPrototypeOf(elt))
			return false;
		const domain = elt.domain;
		for(let i=1; i<ary.length; ++i)
		{
			const a = ary[i];
			if (!DiagramMorphism.prototype.isPrototypeOf(a) || !a.domain.isEquivalent(domain))
				return false;
		}
		return true;
	}
	/*
	// TODO which category owns this?
	static Run(m, diagram)
	{
		let dm = m.morphisms[0];
		if (!DataMorphism.prototype.isPrototypeOf(dm))
			throw 'Needs a data morphism first in the composite to run';
		//
		// there is no output morphism for the codomains tty and threeD
		//
//		let dataOut = (m.codomain.basename !== 'tty' && m.codomain.basename !== 'threeD') ? diagram.newDataMorphism(m.domain, m.codomain) : null;
		let dataOut = (TtyObject.prototype.isPrototypeOf(m.codomain) && m.codomain.basename !== 'threeD') ? diagram.newDataMorphism(m.domain, m.codomain) : null;
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
	*/
	static HomKey(domain, codomain)
	{
		return `${domain.name} ${codomain.name}`;
	}
	static Get(diagram, user, basename)
	{
		const m = diagram.getMorphism(Element.Codename(diagram, basename));
		if (m)
			return m.codomain;
		return new Category(diagram, {user, basename});
	}
}

/*
class TtyObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'TTY';
		nuArgs.description = 'TTY object to write to the console';
		nuArgs.properName = 'TTY';
		super(diagram, nuArgs);
	}
	static Get(diagram)
	{
		const o = diagram.getObject('TTY');
		return o ? o : new TtyObject(diagram, {});
	}
}

class ThreeDObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'ThreeD';
		nuArgs.description = 'For viewing 3D info';
		nuArgs.properName = '3D';
		super(diagram, nuArgs);
	}
	static Get(diagram)
	{
		const o = diagram.getObject('ThreeD');
		return o ? o : new ThreeDObject(diagram, {});
	}
}
*/

class Morphism extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		let domain = null;
		let codomain = null;
		if ('domain' in args)
			domain = this.diagram ? this.diagram.getObject(args.domain) : args.domain;
		else
			throw 'no domain for morphism';
		if ('codomain' in args)
			codomain = this.diagram ? this.diagram.getObject(args.codomain) : args.codomain;
		else
			throw 'no codomain for morphism';
		Object.defineProperties(this,
		{
			domain:		{value: domain,		writable: true,	enumerable: true},
			codomain:	{value: codomain,	writable: true,	enumerable: true},
		});
		if ('code' in args)
			Object.defineProperty(this, 'code', {value:args.code,	writable:false});
		if (this.category)
			this.category.addMorphism(this);
		else if (diagram)
			this.diagram.codomain.addMorphism(this);
		this.codomain.incrRefcnt();
		this.domain.incrRefcnt();
	}
	help()
	{
		return super.help() + H.p('Morphism') + H.p(`Domain: ${this.domain.properName}`) + H.p(`Codomain: ${this.codomain.properName}`);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.domain.decrRefcnt();
			if (this.diagram && this.diagram.isIsolated(this.domain))
				this.domain.decrRefcnt();
			this.codomain.decrRefcnt();
			if (this.diagram && this.diagram.isIsolated(this.codomain))
				this.codomain.decrRefcnt();
			this.category && this.category.deleteMorphism(this);
		}
		super.decrRefcnt();
	}
	json()
	{
		const a = super.json();
		a.domain = this.domain.name;
		a.codomain = this.codomain.name;
		if ('code' in this)
			a.code = U.clone(this.code);
		return a;
	}
	isIterable()
	{
		return this.domain.isIterable();
	}
	hasMorphism(mor, start = true)		// True if the given morphism is used in the construction of this morphism somehow.
	{
		return false;
	}
	$(args)
	{
		throw 'unknown action in morphism';
	}
	getGraph(data = {position:0})
	{
		return Sequence.Get(this.diagram, [this.domain, this.codomain]).getGraph(data);
	}
	static Process(diagram, args)
	{
		return new R.protos[args.prototype](diagram, args);
	}
}

class Identity extends Morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram ? diagram.getObject(args.domain) : args.domain;
		if ('codomain' in args)
			nuArgs.codomain = diagram ? diagram.getObject(args.codomain) : args.codomain;
		else
			nuArgs.codomain = nuArgs.domain;
		nuArgs.name = Identity.Codename(diagram, nuArgs.domain, nuArgs.codomain);
		nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : Identity.ProperName(nuArgs.domain, nuArgs.codomain);
//		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help() + H.p('Identity');
	}
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
		g.tagGraph(this.constructor.name);
		return g;
	}
	$(args)
	{
		return args;
	}
	static Codename(diagram, domain, codomain = null)
	{
		let basename = '';
		if (codomain && domain.name !== codomain.name)
			basename = `Id{${domain.name} ${codomain.name}}dI`;
		else
			basename = `Id{${domain.name}}dI`;
		return Element.Codename(diagram, basename);
	}
	static Get(diagram, dom, cod = null)
	{
		const domain = diagram.getObject(dom);
		const codomain = cod ? diagram.getObject(cod) : null;
		const name = Identity.Codename(diagram, domain, codomain);
		const m = diagram.getMorphism(name);
		return m ? m : new Identity(diagram, {name, domain, codomain});
	}
	static ProperName(domain, codomain = null)
	{
		return 'id';
	}
}

class NamedIdentityObject extends CatObject
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		super(diagram, nuArgs);
		this.source = diagram ? diagram.getObject(args.source) : args.source;
		this.idFrom= Identity.Get(diagram, this, this.source);
		this.idTo = Identity.Get(diagram, this.source, this);
	}
	json()
	{
		const a = super.json();
		a.source = this.source.name;
		return a;
	}
	help()
	{
		return super.help() + H.p('Named Identity');
	}
	// TODO
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
		g.tagGraph(this.constructor.name);
		return g;
	}
	static Codename(diagram, domain)
	{
		return Element.Codename(diagram, `Nd{${name},${source.name}}dN`);
	}
	static Get(diagram, dom)
	{
		const domain = diagram.getObject(dom);
		const name = NamedIdentity.Codename(diagram, domain);
		const m = diagram.getMorphism(name);
		return m ? m : new NamedIdentity(diagram, {name, domain});
	}
}

class DiagramMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.index = true;
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : diagram.domain.getAnon('dgrmM');
		nuArgs.category = diagram.domain;
		super(diagram, nuArgs);
		this.incrRefcnt();
		this.flipName = U.getArg(args, 'flipName', false);
		if ('morphisms' in nuArgs)
			this.morphisms = nuArgs.morphisms.map(m => diagram.domain.getMorphism(m));
		this.setMorphism(this.diagram.getMorphism(nuArgs.to));
	}
	help()
	{
		return super.help() + H.p('Morphism in index category');
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1 && this.to)
		{
			if ('morphisms' in this)
				this.morphisms.map(m => m.decrRefcnt());
			this.to.decrRefcnt();
			this.removeSVG();
		}
		super.decrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.flipName = this.flipName;
		mor.to = this.to.name;
		if ('morphisms' in this)
			mor.morphisms = this.morphisms.map(m => m.name);
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
		this.domain.setObject(to.domain);
		this.codomain.setObject(to.codomain);
		this.to = to;
	}
	getNameOffset()
	{
		let mid = 'bezier' in this ? new D2(this.bezier.cp2) : this.start.add(this.end).scale(0.5);
		const v = D2.Subtract(this.codomain, this.domain).normal().scale(this.flipName ? -1 : 1);
		const normal = D2.Subtract(this.codomain, this.domain).normal().scale(this.flipName ? -1 : 1).normalize();
		if (normal.y > 0.0)
			normal.y *= 0.5;
		return normal.scale(-D.default.font.height).add(mid);
	}
	makeSVG()
	{
		this.predraw();
		const off = this.getNameOffset();
		if (isNaN(off.x) || isNaN(off.y))
			throw 'bad name offset';
		let svg =
`<g id="${this.elementId()}">
<path data-type="morphism" data-name="${this.name}" class="morphism grabbable" id="${this.elementId()}_path" d="M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}"
onmousedown="R.diagram.pickElement(evt, '${this.name}')" marker-end="url(#arrowhead)"/>
<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_name'}" x="${off.x}" y="${off.y}"
onmousedown="R.diagram.pickElement(evt, '${this.name}')">${this.to.properName}</text>`;
		if (Composite.prototype.isPrototypeOf(this.to) && 'morphisms' in this)
		{
			const xy = D.Barycenter(this.morphisms);
			if (isNaN(xy.x) || isNaN(xy.y))
				throw 'Nan!';
			svg += `<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_comp'}" x="${xy.x}" y="${xy.y}"
	onmousedown="R.diagram.pickElement(evt, '${this.name}')">${D.default.composite}</text></g>`;
		}
		svg += '</g>';
		return svg;
	}
	elementId()
	{
		return `mor_${this.name.replace(/{}:/, '_')}`;
	}
	showSelected(state = true)
	{
		this.svg('_path').classList[state ? 'add' : 'remove']('selected');
		this.svg('_name').classList[state ? 'add' : 'remove']('selected');
		const svg = this.svg('_comp');
		if (svg)
			svg.classList[state ? 'add' : 'remove']('selected');
	}
	updateFusible(on)
	{
//		this.showSelected(!state);
//		this.svg('_path').classList[!state ? 'add' : 'remove']('grabbable','morphism');
//		this.svg('_path').classList[state ? 'add' : 'remove']('fusible');
//		this.svg('_name').classList[state ? 'add' : 'remove']('fusible');
		const path = this.svg('_path');
		const name = this.svg('_name');
		if (on)
		{
			path.classList.add(...['selected', 'grabbable', 'morphism', 'fuseMorphism']);
			path.classList.remove(...['selected', 'grabbable', 'morphism', 'fuseMorphism']);

			path.classList.add(...['fuseMorphism']);
			path.classList.remove(...['selected', 'grabbable', 'morphism']);
			name.classList.add(...['fuseMorphism']);
			name.classList.remove(...['morphTxt', 'selected', 'grabbable']);
		}
		else
		{
			path.classList.add(...['selected', 'grabbable', 'morphism']);
			path.classList.remove(...['fuseMorphism']);
			name.classList.add(...['morphTxt', 'selected', 'grabbable']);
			name.classList.remove(...['fuseMorphism']);
		}
	}
	updateDecorations()
	{
		const off = this.getNameOffset();
		if (isNaN(off.x) || isNaN(off.y))
			throw 'NaN';
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
		if (Composite.prototype.isPrototypeOf(this.to) && 'morphisms' in this)
		{
			const compSvg = this.svg('_comp');
			const xy = D.Barycenter(this.morphisms);
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
			width:	Math.abs(this.start.x - this.end.x),
			height:	Math.abs(this.start.y - this.end.y),
		};
		if (r.width === 0.0)
		{
			r.width = fontHeight = D.default.font.height;
			r.x += r.width/2;
		}
		else if (r.height === 0.0)
		{
			r.height = r.width;
			r.y -= r.width/2;
		}
		return r;
	}
	predraw()
	{
		const domBBox = this.domain.getBBox();
		const codBBox = this.codomain.getBBox();
		const delta = D2.Subtract(this.codomain, this.domain);
		let start = null
		let end = null
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
		this.adjustByHomSet();
		return end !== false;
	}
	adjustByHomSet()
	{
		const i = this.homSetIndex;
		if (i > 0)
		{
			const midpoint = {x:(this.start.x + this.end.x)/2, y:(this.start.y + this.end.y)/2};
			const normal = this.end.subtract(this.start).normal().normalize();
			const band = Math.trunc(i/2);
			const v = normal.scale(2 * D.default.font.height * (band+1) * (i % 2 > 0 ? -1 : 1));
			const w = normal.scale(10 * ((i % 2) + 1) * (i % 2 ? -1 : 1));
			this.start = this.start.add(w).round();
			this.end = this.end.add(w).round();
			let cp1 = v.add(midpoint).round();
			let cp2 = w.add(midpoint).round();
			this.bezier = {cp1, cp2, index:i, offset:v};
		}
		else
			delete this.bezier;
	}
	update()
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
	intersect(bbox, side, m = D.default.arrow.margin)
	{
		let pnt = new D2;
		const x = bbox.x - m;
		const y = bbox.y - m;
		const width = bbox.width + 2 * m;
		const height = bbox.height + 2 * m;
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
		return m && m.to && this.to.name === m.to.name;
	}
}

class IndexCategory extends Category
{
	constructor(diagram, args)
	{
		super(diagram, args);
		Object.defineProperties(this,
		{
			'homSets': 		{value:new Map(), writable: false},
			'obj2morphs':	{value:new Map(), writable: false},
		});
	}
	help()
	{
		return super.help() + H.p('Index category');
	}
	makeHomSets()
	{
		this.homSets.clear();
		this.obj2morphs.clear();
		this.addHomSets();
	}
	addHomSets()
	{
		for(const [key, m] of this.morphisms)
		{
			delete m.bezier;
			this.addHom(m);
			this.addHomDir(m, 'dom');
			this.addHomDir(m, 'cod');
		}
	}
	addHom(m)
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
	addHomDir(m, dir)
	{
		const key = dir === 'dom' ? m.domain : m.codomain;
		if (!this.obj2morphs.has(key))
			this.obj2morphs.set(key, {dom:[], cod:[]});
		const ms = this.obj2morphs.get(key);
		ms[dir].push(m);
	}
}

class MultiMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		const morphisms = MultiMorphism.SetupMorphisms(diagram, nuArgs.morphisms);
		Object.defineProperty(this, 'morphisms', {value:morphisms, writable:false});
		this.morphisms.map(m => m.incrRefcnt());
	}
	help(hdr, processed)
	{
		let html = super.help();
		html += this.morphisms.map(m =>
		{
			if (processed.has(m.name))
				return '';
			processed.add(m.name);
			return m.help(processed);
		}).join('');
		return html;
	}
	signature(sig = null)
	{
		return U.sha256(`${sig}${this.diagram.codomain.name} ${this.constructor.name} ${morphisms.map(m => m.signature()).join()}`);
	}
	decrRefcnt()
	{
		if (this.refcnt === 0)
			this.morphisms.map(m => m.decrRefcnt());
		super.decrRefcnt();
	}
	json(a = {})
	{
		a = super.json(a);
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
	moreHelp()
	{
		return H.table(H.tr(H.th('Morphisms', '', '', '', 'colspan=2')) + this.morphisms.map(m => H.tr(H.td(m.diagram.properName) + H.td(m.properName, 'left'))).join(''));
	}
	mergeMorphismGraphs(dual = false)
	{
		const graph = this.getGraph();
		const graphs = this.morphisms.map(m => m.getGraph());
		const domNdx = dual ? 1 : 0;
		const codNdx = dual ? 0 : 1;
		const dom = graphs[domNdx];
		const cod = graphs[codNdx];
		graphs.map((g, i) =>
		{
			this.graph.graphs[domNdx].mergeGraphs({from:g.graphs[domNdx], base:[domNdx], inbound:[], outbound:[codNdx, i]});
			const gCod = g.graphs[codNdx];
			const tCod = graphs[codNdx];
			const thisGraph = tCod.isLeaf() ? tCod : tCod.graphs[i];
			thisGraph.mergeGraphs({from:gCod, base:[codNdx, i], inbound:[codNdx, i], outbound:[]});
			cod.graphs[i] = U.clone(g.graphs[dual ? 0 : 1]);
			cod.componentGraph(cod.graphs[i], i);
		});
		return graph;
	}
	usesDiagram(diagram)
	{
		for (let i=0; i<this.morphisms.length; ++i)
			if (this.morphisms[i].usesDiagram(diagram))
				return true;
		return false;
	}
	static SetupMorphisms(diagram, morphisms)
	{
		return morphisms.map(m => (typeof m === 'string' ? diagram.codomain.getMorphism(m) : m));
	}
}

class Composite extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.name = Composite.Codename(diagram, morphisms);
		nuArgs.domain = Composite.Domain(morphisms);
		nuArgs.codomain = Composite.Codomain(morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = 'properName' in args ? args.properName : Composite.ProperName(morphisms);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help(processed = new Set)
	{
		return super.help(H.p('Composite'), processed);
	}
	isIterable()		// A composite is considered iterable if the first morphism is iterable.
	{
		return this.morphisms[0].isIterable();
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data);
		//
		// get the graphs of the comprising morphisms.
		//
		const graphs = this.morphisms.map(m => m.getGraph());
		//
		// Next build a sequence of all the domains and last codomain.
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
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, `Cm{${morphisms.map(m => m.name).join(',')}}mC`);
	}
	static Domain(morphisms)
	{
		return morphisms[0].domain;
	}
	static Codomain(morphisms)
	{
		return morphisms[morphisms.length - 1].codomain;
	}
	static Get(diagram, morphisms)
	{
		const name = Composite.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m ? m : new Composite(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return MultiObject.ProperName('&#8728;', morphisms);
	}
}

class ProductMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.name = ProductMorphism.Codename(diagram, morphisms);
		nuArgs.domain = ProductMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = ProductMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = 'properName' in args ? args.properName : ProductMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	help(processed = new Set)
	{
		return super.help(H.p('Product'), processed);
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, `Pm{${morphisms.map(m => m.name).join(',')}}mP`);
	}
	static Domain(diagram, morphs)
	{
		return ProductObject.Get(diagram, morphs.map(m => m.domain));
	}
	static Codomain(diagram, morphs)
	{
		return ProductObject.Get(diagram, morphs.map(m => m.codomain));
	}
	static Get(diagram, morphisms)
	{
		const name = ProductMorphism.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m ? m : new ProductMorphism(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return MultiObject.ProperName('&times;', morphisms);
	}
}

class CoproductMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in args ? args.name : CoproductMorphism.Codename(diagram, morphisms);
		nuArgs.domain = CoproductMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = CoproductMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = 'properName' in args ? args.properName : CoproductMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	help(processed = new Set)
	{
		return super.help(H.p('Coproduct'), processed);
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, `Cm{${morphisms.map(m => m.name).join(',')}}mC`);
	}
	static Domain(diagram, morphs)
	{
		return CoproductObject.Get(diagram, morphs.map(m => m.domain));
	}
	static Codomain(diagram, morphs)
	{
		return CoproductObject.Get(diagram, morphs.map(m => m.codomain));
	}
	static Get(diagram, morphisms)
	{
		const name = CoproductMorphism.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m ? m: new CoproductMorphism(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return MultiObject.ProperName('&plus;', morphisms);
	}
}

class ProductAssembly extends MultiMorphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		nuArgs.domain = ProductAssembly.Domain(diagram, nuArgs.morphisms);
		nuArgs.codomain = ProductAssembly.Codomain(diagram, nuArgs.morphisms);
		nuArgs.name = ProductAssembly.Codename(diagram, nuArgs.morphisms);
		nuArgs.properName = 'properName' in args ? args.properName : ProductAssembly.ProperName(nuArgs.morphisms);
		super(diagram, nuArgs);
	}
	help(processed = new Set)
	{
		return super.help(H.p('Product assembly'), processed);
	}
	getGraph(data = {position:0})
	{
		return this.mergeMorphismGraphs(graph);
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, `Pa{${morphisms.map(m => m.name).join(',')}}aP`);
	}
	static Domain(diagram, morphisms)
	{
		return morphisms[0].domain;
	}
	static Codomain(diagram, morphisms)
	{
		return ProductObject.Get(diagram, morphisms.map(m => m.codomain));
	}
	static Get(diagram, morphisms)
	{
		const name = ProductAssembly.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m ? m: new ProductAssembly(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return `&Pi;<${morphisms.map(m => m.codomain.properName).join(',')}>`;
	}
}

class CoproductAssembly extends MultiMorphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		nuArgs.name = CoproductAssembly.Codename(diagram, nuArgs.morphisms);
		nuArgs.domain = CoproductAssemblyMorphism.Domain(diagram, nuArgs.morphisms);
		nuArgs.codomain = CoproductAssemblyMorphism.Codomain(diagram, nuArgs.morphisms);
		nuArgs.properName = 'properName' in args ? args.properName : CoproductAssembly.ProperName(nuArgs.morphisms);
		super(diagram, nuArgs);
	}
	help(processed = new Set)
	{
		return super.help(H.p('Coproduct assembly'), processed);
	}
	getGraph(data = {position:0})
	{
		return this.mergeMorphismGraphs(graph)
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, `Ca{${morphisms.map(m => m.name).join(',')}}aC`);
	}
	static Domain(diagram, morphisms)
	{
		return CoproductObject.Get(diagram, morphisms.map(m => m.domain));
	}
	static Codomain(diagram, morphisms)
	{
		return morphisms[0].codomain;
	}
	static Get(diagram, morphisms)
	{
		const name = CoproductAssemblyMorphism.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m ? m : new CoproductAssemblyMorphism(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return `&#x2210;<${morphisms.map(m => m.codomain.properName).join(',')}>`;
	}
}

class FactorMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in args ? args.name : FactorMorphism.Codename(domain, factors);
		nuArgs.domain = diagram.getObject(args.domain);
		nuArgs.codomain = FactorMorphism.Codomain(diagram, nuArgs.domain, nuArgs.factors);
		nuArgs.properName = FactorMorphism.ProperName(nuArgs.domain, nuArgs.factors);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.factors = nuArgs.factors;
	}
	help()
	{
		return super.help() + H.p(`Factor morphism: ${this.factors}`);
	}
	/*
	$(args)
	{
		const r = this.factors.map(f => f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
		return r.length === 1 ? r[0] : r;
	}
	*/
	signature()
	{
		return U.sha256(`${this.diagram.codomain.name} ${this.constructor.name} ${factors.map(f => f.join('-')).join(':')}`);
	}
	json()
	{
		const a = super.json();
		a.factors = this.factors;
		return a;
	}
	getGraph(data)
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
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static Codename(domain, factors)
	{
		let name = Element.Codename(diagram, `Fa{${domain.name},`);
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
	static Codomain(diagram, domain, factors)
	{
		return ProductObject.Get(diagram, factors.map(f => domain.getFactor(f)));
	}
	static Get(diagram, domain, factors)
	{
		const name = FactorMorphism.Codename(domain, factors);
		const m = diagram.getMorphism(name);
		return m ? m : new FactorMorphism(diagram, {domain, factors});
	}
	static ProperName(domain, factors)
	{
		return `&lt;${factors.map(f => domain.getFactorProperName(f)).join(',')}&gt;`;
	}
}

class DiagonalMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getObject(args.domain);
		nuArgs.count = U.getArg(args, 'count', 2);
		if (nuArgs.count < 2)
			throw 'count is not two or greater';
		const objects = [];
		nuArgs.codomain = DiagonalMorphism.Codomain(diagram, objects.fill(nuArgs.domain, 0, nuArgs.count));
		nuArgs.name = DiagonalMorphism.Codename(nuArgs.domain, nuArgs.count);
		nuArgs.properName = DiagonalMorphism.ProperName(nuArgs.domain, nuArgs.count)
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'count', {value:nuArgs.count,	writable:false});
	}
	help()
	{
		return super.help() + H.p(`Diagonal morphism of count ${this.count}`);
	}
	json()
	{
		const a = super.json();
		a.count = this.count;
		return a;
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data, first);
		const domain = graph.graphs[0];
		const codomain = graph.graphs[1];
		codomain.map((g, i) => domain.bindGraph({cod:g, link:[], domRoot:[0], codRoot:[1, i], offset:0}));
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static Codename(domain, count)
	{
		return Element.Codename(diagram, `Dm{${domain.name}/${count}}mD`);
	}
	static Codomain(diagram, object, count)
	{
		const objects = [];
		return ProductObject.Get(diagram, objects.fill(object, 0, count));
	}
	static Get(diagram, domain, count)
	{
		if (count < 2)
			throw 'Count is less than 2';
		const name = DiagonalMorphism.Codename(domain);
		const m = diagram.getMorphism(name);
		return m ? m : new DiagonalMorphism(diagram, {domain, count});
	}
	static ProperName(domain, count)
	{
		return `&delta;&lt;${domain.properName}:${count}&gt;`;
	}
}

class FoldMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.codomain = diagram.getObject(args.codomain);
		nuArgs.count = U.getArg(args, 'count', 2);
		if (nuArgs.count < 2)
			throw 'count is not two or greater';
		const objects = [];
		nuArgs.domain = FoldMorphism.Domain(diagram, objects.fill(nuArgs.codomain, 0, nuArgs.count));
		nuArgs.name = FoldMorphism.Codename(nuArgs.codomain, nuArgs.count);
		nuArgs.properName = FoldMorphism.ProperName(nuArgs.codomain, nuArgs.count)
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.count = nuArgs.count;
	}
	help()
	{
		return super.help() + H.p(`Fold morphism of count ${this.count}`);
	}
	json()
	{
		const a = super.json();
		a.count = this.count;
		return a;
	}
	static Codename(codomain, count)
	{
		return Element.Codename(diagram, `Fm{${codomain.name}/${count}}mF`);
	}
	static Domain(diagram, object, count)
	{
		const objects = [];
		nuArgs.domain = CoproductObject.Get(diagram, objects.fill(object, 0, count));
	}
	static Get(diagram, codomain, count)
	{
		if (count < 2)
			throw 'count is not two or greater';
		const name = FoldMorphism.Codename(codomain, count);
		const m = diagram.getMorphism(name);
		return m ? m : new FoldMorphism(diagram, {codomain, count});
	}
	static ProperName(codomain, count)
	{
		return `&nabla;&lt;${codomain.properName}:${count}&gt;`;
	}
}

class DataMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = this.getObject(args.domain);
		if (nuArgs.domain.name !== 'N' || nuArgs.domain.name !== 'One')
			throw 'Domain is not N or 1';
		nuArgs.codomain = this.getObject(args.codomain);
		if (!nuArgs.codomain.isEditable())
			throw `codomain is not editable`;
		nuArgs.category = diagram.codomain;
		super(diagram, args);
		this.data = U.getArg(args, 'data', {});
		this.limit = U.getArg(args, 'limit', Number.MAX_SAFE_INTEGER);	// TODO rethink the limit
	}
	help()
	{
		return super.help() + H.p(`Data morphism entries: ${Object.keys(this.data).length}`);
	}
	isIterable()
	{
		return true;
	}
	signature(sig)
	{
		return U.sha256(`${sig}${this.diagram.codomain.name} ${this.constructor.name} ${data.join(':')}`);
	}
	json()
	{
		let mor = super.json();
		mor.data = this.data;
		mor.limit = this.limit;
		return mor;
	}
	addData(e)
	{
		const i = Math.min(this.limit, U.htmlSafe(document.getElementById('inputTerm').value));
		this.data[i] = this.codomain.fromHTML();
	}
	clear()
	{
		this.data = {};
	}
}

class Recursive extends DataMorphism
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.setRecursor(args.recursor);
		this.setSignature();
	}
	help()
	{
		return super.help() + H.p(`Recursion with ${this.recursor.properName}`);
	}
	/*
	$()
	{
		this.updateRecursor();	// TODO still needed?
		if (args in this.data)
			return this.data[args];
		if (Object.keys(this.data).length === 0)
		{
			if (args[0] === 0)
				return args[2];
			if (args[1] === 1)
				return eval(args[1], args[2])
		}
		if (this.recursor)
			return this.recursor.$(args);
		return null;
	}
	*/
	getGraph(data = {position:0})
	{
		// TODO
		return StringMorphism.graph(this.diagram, this.recursor);
	}
	signature()
	{
		return U.sha256(super.signature() + (typeof this.recursor === 'string' ? this.recursor : this.recursor.name));
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
		mor.recursor = Morphism.prototype.isPrototypeOf(this.recursor) ? this.recursor.name : this.recursor;
		return mor;
	}
	setRecursor(r)
	{
		const rcrs = typeof r === 'string' ? this.diagram.codomain.getMorphism(r) : r;
		if (!rcrs.hasMorphism(this))
			throw `The recursive morphism does not refer to itself so no recursion.`;
		Object.defineProperty(this, 'recursor', {value:rcrs,	writable:false});
		this.recursor.incrRefcnt();
	}
	updateRecursor()
	{
		if (typeof this.recursor === 'string')
		{
			const r = this.diagram.getMorphism(this.recursor);
			if (typeof r === 'object')
				this.recursor = r;
		}
	}
}

class LambdaMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const preCurry = typeof args.preCurry === 'string' ? diagram.codomain.getMorphism(args.preCurry) : args.preCurry;
		const nuArgs = U.clone(args);
		nuArgs.domain = LambdaMorphism.Domain(diagram, preCurry, arg.domFactors);
		nuArgs.codomain = LambdaMorphism.Codomain(diagram, preCurry, arg.homFactors);
		nuArgs.description = 'description' in args ? args.description : `The currying of the morphism ${this.preCurry.properName} by the factors ${this.homFactors.toString()}`;
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.name = 'name' in args ? args.name : LambdaMorphism.Codename(diagram, preCurry, args.domFactors, args.homFactors);
		this.properName = this.properName === '' ? LambdaMorphism.ProperName(preCurry, args.domFactors, args.homFactors) : this.properName;
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = args.homFactors;
		const domPermutation = args.domFactors.map(f => f[1]);
		const homPermutation = args.homFactors.map(f => f[1]);
		const centralDomain = ProductObject.Get(this.diagram, [this.codomain.objects[0], this.domain]);
		this.factors = this.diagram.addFactorMorphism(centralDomain, [homPermutation, domPermutation]);
		this.setSignature();
	}
	help()
	{
		return super.help() + H.p(`Lambda morphism of pre-curry ${this.preCurry.properName} and domain factors ${this.domFactors} and codomain factors ${this.codFactors}`);
	}
	/*
	$(args)
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
	*/
	signature()
	{
		return U.sha256(`${this.diagram.codomain.name} ${this.preCurry.sig} ${this.domFactors.map(f => f.join('-')).join(':')} ${this.homFactors.map(f => f.join('-')).join(':')}`);
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
	getGraph(data = {position:0})
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
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static Codename(diagram, preCurry, domFactors, homFactors)
	{
		const preCur = diagram.codomain.getMorphism(preCurry);
		const hom = HomObject.Get(diagram, [preCurry.domain, preCurry.codomain]);
		return Element.Codename(diagram, `${preCurry.domain.name}:Lm{${preCur.name},${ProductObject.Codename(domFactors.map(f => hom.getFactorName(f)))},${ProductObject.Codename(codFactors.map(f => hom.getFactorName(f)))}}mL`);
	}
	static Domain(diagram, preCurry, factors)
	{
		return ProductObject.Get(diagram, factors.map(f => preCurry.domain.getFactor(f)));
	}
	static Codomain(diagram, preCurry, factors)
	{
		const codDom = ProductObject.Get(diagram, factors.map(f => preCurry.domain.getFactor(f)));
		return HomObject.Get(diagram, [codDom, preCurry.codomain]);
	}
	static Get(diagram, preCurry, domFactors, homFactors)
	{
		const name = LambdaMorphism.Codename(diagram, preCurry, domFactors, homFactors);
		const m = diagram.getMorphism(name);
		return m ? m : new LambdaMorphism(diagram, {preCurry, domFactors, homFactors});
	}
	static ProperName(preCurry, domFactors, homFactors)
	{
		return `&lambda.;${preCurry.properName}&lt;${domFactors}:${homFactors}`;
	}
}

class HomMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		if (morphisms.length !== 2)
			throw 'not exactly two morphisms';
		const nuArgs = U.clone(args);
		nuArgs.name = HomMorphism.Codename(diagram, morphisms);
		nuArgs.domain = HomMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = HomMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = 'properName' in args ? args.properName : HomMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help(H.p('Hom'));
	}
	/*
	$(args)
	{
		return this.morphisms.map((m, i) => m.$(args[i]));
	}
	*/
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, `Ho{${morphisms.map(m => m.name).join(',')}}oH`);
	}
	static Domain(diagram, morphisms)
	{
		return HomObject.Get(diagram, morphisms.map(m => m.domain));
	}
	static Codomain(diagram, morphisms)
	{
		return HomObject.Get(diagram, morphisms.map(m => m.codomain));
	}
	static Get(diagram, morphisms)
	{
		const name = HomMorphism.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m ? m : new HomMorphism(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return HomObject.ProperName(morphisms);
	}
}

class StringMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		const source = diagram.getMorphism(args.source);
		nuArgs.domain = source.domain;
		nuArgs.codomain = source.codomain;
		nuArgs.category = diagram.graphCat;
		super(diagram, nuArgs);
		this.source = source;
		this.graph = src.getGraph();	// a graph is like a net list between the ports
	}
	help()
	{
		return super.help(H.p('String morphism'));
	}
	isIterable()
	{
		return false;
	}
	json()
	{
		const a = super.json();
		a.source = this.source.name;
		a.graph = this.graph;
		return a;
	}
	updateSVG(data)	// data {index, graph, dom:{x,y}, cod:{x,y}, visited, elementId}
	{
		const diagram = this.diagram;
		if (this.graphs.length === 0)
		{
			const dom = D2({x:Math.round(expr.position + (expr.width/2.0) + (data.index[0] === 0 ? data.dom.x : data.cod.x)), y:data.index[0] === 0 ? data.dom.y : data.cod.y});
			const color = Math.round(Math.random() * 0xffffff).toString(16);
			const srcKey = StringMorphism.LinkColorKey(data.index, data.dom.name, data.cod.name);
			let colorIndex = diagram.link2colorIndex[srcKey];
			while(colorIndex in diagram.colorIndex2colorIndex)
				colorIndex = diagram.colorIndex2colorIndex[colorIndex];
			for (let i=0; i<expr.links.length; ++i)
			{
				const lnk = expr.links[i];
				const lnkStr = lnk.toString();
				const lnkKey = StringMorphism.LinkColorKey(lnk, data.dom.name, data.cod.name);
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
				const idxStr = data.index.toString();
				if (data.visited.indexOf(lnkStr + ' ' + idxStr) >= 0)
					continue;
				const d = StringMorphism.SvgLinkUpdate(dom, lnk, data);
				const linkId = StringMorphism.LinkId(data, lnk);
				const lnkElt = document.getElementById(linkId);
				lnkElt.setAttribute('d', d);
				lnkElt.setAttribute('style', `stroke:#${color}AA`);
				data.visited.push(idxStr + ' ' + lnkStr);
			}
		}
		else
		{
			this.graphs.map((g, i) =>
			{
				data.index.push(i);
				g.updateSVG(data);
				data.index.pop();
			});
		}
	}
	update()
	{
	//	const id = StringMorphism.GraphId(from);
	//	const graphFunctor = R.$CAT.getMorphism('Graph');
	//	const sm = graphFunctor.$$(diagram, from.to);
		const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
		this.updateSVG({index:[], dom, cod, visited:[], elementId:from.elementId()});
	}
	//
	// StringMorphism static methods
	//
	static RemoveStringSvg(from)
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
	static Get(graphCat, m)
	{
		const s = graphCat.getMorphism(m.name);
		if (s)
			return s;
		return StringMorphism.makeGraph(graphCat, m);
	}
	static GraphId(m)
	{
		return `graph_${m.elementId()}`;
	}
	static LinkId(data, lnk)
	{
		return `link_${data.elementId}_${data.index.join('_')}:${lnk.join('_')}`;
	}
	static LinkColorKey(lnk, dom, cod)
	{
		return `${lnk[0] === 0 ? dom : cod} ${lnk.slice(1).toString()}`;
	}
	static ColorWheel(data)
	{
		const tran = ['ff', 'ff', 'ff', 'ff', 'ff', '90', '00', '00', '00', '00', '00', '90'];
		const cnt = tran.length;
		data.color = (data.color + 5) % cnt;
		return `${tran[(data.color + 2) % cnt]}${tran[(data.color + 10) % cnt]}${tran[(data.color + 6) % cnt]}`;
	}
	static SvgLinkUpdate(dom, lnk, data)	// data {graph, dom:{x,y}, cod:{x,y}}
	{
		const isDomLink = lnk[0] === 0;
		const f = R.getFactor(data.graph, lnk);
		const cod = new D2(Math.round(f.position + (f.width/2.0) + (isDomLink ? data.dom.x : data.cod.x)), isDomLink ? data.dom.y : data.cod.y);
		const dx = cod.x - dom.x;
		const dy = cod.y - dom.y;
		const adx = Math.abs(dx);
		const ady = Math.abs(dy);
		const normal = dy === 0 ? ((data.cod.y - data.dom.y) > 0 ? new D2({x:0, y:-1}) : new D2({x:0, y:1})) : cod.subtract(dom).normal().normalize();
		const h = (adx - ady) / (1.0 * adx);
		const v = normal.scale(cod.dist(dom) * h / 4.0);
		const cp1 = v.add(dom).round();
		const cp2 = v.add(cod).round();
		return adx < ady ? `M${dom.x},${dom.y} L${cod.x},${cod.y}` : `M${dom.x},${dom.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`;
	}
}

class Evaluation extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getObject(args.domain);
		if (!Evaluation.CanEvaluate(nuArgs.domain))
			throw 'object for evaluation domain cannot be evaluated';
		nuArgs.name = Evaluation.Codename(diagram, nuArgs.domain);
		nuArgs.codomain = nuArgs.domain.objects[0].objects[1];
		nuArgs.properName = Evaluation.ProperName(nuArgs.domain);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help() + H.p('Evaluation');
	}
	$(args)
	{
		if (typeof args[0] === 'string')
			args[0] = this.diagram.getMorphism(args[0]);
		return args[0].$([args[1]]);
	}
	getGraph()
	{
		const graph = super.getGraph();
		const domain = graph.graphs[0];
		const domHom = domain.graphs[0];
		const codomain = graph.graphs[1];
		domain.graphs[1].bindGraph({cod:domHom.graphs[0],	link:[], domRoot:[0, 1],	codRoot:[0, 0, 0],	offset:0});
		domHom.graphs[1].bindGraph({cod:codomain, 			link:[], domRoot:[0, 0, 1], codRoot:[1],		offset:0});
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static CanEvaluate(object)
	{
		return
			ProductObject.prototype.isPrototypeOf(object) &&
			object.objects.length === 2 &&
			HomObject.prototype.isPrototypeOf(object.objects[0]) &&
			object.objects[0].objects[0].isEquivalent(object.objects[1]);
	}
	static Codename(diagram, object)
	{
		return Element.Codename(diagram, `Ev{${object.name}}vE`);
	}
	static ProperName(diagram, object)
	{
		return `Ev&lt;${object.properName}&gt;`;
	}
	static Get(diagram, domain)
	{
		const name = Evaluation.Codename(diagram, domain);
		const m = diagram.getMorphism(name);
		return m ? m : new Evaluation(diagram, {domain});
	}
}

class InitialMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.codomain = diagram.getObject(args.codomain);
		nuArgs.domain = InitialObject.Get(diagram);
		nuArgs.name = InitialMorphism.Codename(diagram, nuArgs.codomain);
		nuArgs.properName = 'properName' in args ? args.properName : InitialMorphism.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help(H.p('Initial morphism'));
	}
	isIterable()
	{
		return true;	// null iterator
	}
	static Codename(diagram, codomain)
	{
		return Element.Codename(diagram, `In{${codomain.name}}nI`);
	}
	static Get(diagram, codomain)
	{
		const name = InitialMorphism.Codename(diagram, codomain);
		const m = diagram.getMorphism(name);
		return m ? m : new InitialMorphism(diagram, {codomain, description:`initial morphism to ${codomain.properName}`});
	}
	static ProperName()
	{
		return '&empty;';
	}
}

class TerminalMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getObject(args.domain);
		nuArgs.codomain = TerminalObject.Get(diagram);
		nuArgs.name = TerminalMorphism.Codename(diagram, nuArgs.domain);
		nuArgs.properName = 'properName' in args ? args.properName : TerminalMorphism.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help(H.p('Terminal morphism'));
	}
	static Codename(diagram, domain)
	{
		return Element.Codename(diagram, `Te{${domain.name}}eT`);
	}
	static Get(diagram, domain)
	{
		const name = TerminalMorphism.Codename(diagram, domain);
		const m = diagram.getMorphism(name);
		return m ? m : new TerminalMorphism(diagram, {domain, name, description:`terminal morphism from ${domain.properName}`});
	}
	static ProperName()
	{
		return '*';
	}
}

class Functor extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		if (typeof nuArgs.domain === 'string')
			nuArgs.domain = diagram.getObject(args.domain);
		if (typeof nuArgs.codomain === 'string')
			nuArgs.codomain = diagram.getObject(args.codomain);
		super(diagram, nuArgs);
	}
	help()
	{
		return super.help(H.p('Functor'));
	}
}

class Diagram extends Functor
{
	constructor(diagram, args)
	{
		if (!('user' in args))
			throw 'Specify user for a diagram';
		if (!('basename' in args))
			throw 'no basename for diagram';
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.category = U.getArg(args, 'category', (diagram && 'codomain' in diagram) ? diagram.codomain : null);
		const indexName = `${nuArgs.name}:Index`;
		nuArgs.domain = new IndexCategory(diagram, {name:indexName, description:`index category for diagram ${nuArgs.name}`});
		if (!Category.prototype.isPrototypeOf(nuArgs.codomain))
			nuArgs.codomain = diagram ? diagram.getObject(nuArgs.codomain) : R.Cat;
		super(diagram, nuArgs);
		this.objects = new Set();
		this.morphisms = new Set();
		if ('codomainData' in nuArgs)
			this.codomain.process(this, nuArgs.codomainData, this.objects, this.morphisms);
		if ('domainData' in nuArgs)
			this.domain.process(this, nuArgs.domainData);
		this.references = new Map;
		if ('references' in args)
			args.references.map(r => this.addReference(r));
		this.domain.makeHomSets();
		this.selected = [];
		this.viewport = U.getArg(args, 'viewport', {x:0, y:0, scale:1, width:D.Width(), height:D.Height()});
		if (isGUI && this.viewport.width === 0)
		{
			this.viewport.width = window.innerWidth;
			this.viewport.height = window.innerHeight;
			this.viewport.scale = 1;
		}
		this.timestamp = U.getArg(args, 'timestamp', Date.now());
		this.texts = new Map();
		if ('texts' in args)
			args.texts.map(d => new DiagramText(this, d));
		this.textId = U.getArg(args, 'textId', 0);
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
	}
	help()
	{
		return super.help(H.p('Diagram'));
	}
	json()
	{
		const a = super.json();
		a.viewport =	this.getViewport();		// don't want viewport.orig
		a.references =	[];
		this.references.forEach(function(ref)
		{
			a.references.push(ref.name);
		});
		a.textId =		this.textId;
		a.timestamp =	this.timestamp;
		a.domainData =	this.domain.json();
		const objects = [];
		this.objects.forEach(function(o){objects.push(o.json())});
		const morphisms = [];
		this.morphisms.forEach(function(m){morphisms.push(m.json())});
		a.codomainData = {objects, morphisms};
		const texts = [];
		this.texts.forEach(function(t){texts.push(t.json())});
		a.texts =		texts;
		return a;
	}
	deleteElement(name)
	{
		const o = this.getObject(name);
		if (o && o.isDeletable())
		{
			o.category.deleteObject(o);
			D.objectPanel.update();
			this.update();
			return;
		}
		const m = this.getMorphism(name);
		if (m && m.isDeletable())
		{
			m.category.deleteMorphism(m);
			D.morphismPanel.update();
			this.update();
			return;
		}
		if (this.texts.has(name))
		{
			this.texts.delete(name);
			D.textPanel.update();
			this.update();
		}
	}
	initializeView()
	{
		this.viewport.orig = this.getViewport();
	}
	getObject(name)
	{
		if (Element.prototype.isPrototypeOf(name))
			return name;
		let object = this.codomain.getObject(name);
		if (object)
			return object;
		return this.domain.getObject(name);
	}
	getMorphism(name)
	{
		if (Morphism.prototype.isPrototypeOf(name))
			return name;
		const morphism = this.codomain.getMorphism(name);
		if (morphism)
			return morphism;
		return this.domain.getMorphism(name);
	}
	getViewport()
	{
		const v =
		{
			x:		this.viewport.x,
			y:		this.viewport.y,
			width:	this.viewport.width,
			height:	this.viewport.height,
			scale:	this.viewport.scale,
		};
		return v;
	}
	addSVG(element)
	{
		D.diagramSVG.innerHTML += typeof element === 'string' ? element : element.makeSVG();
	}
	gui(e, elt, fn)
	{
		try
		{
			if (fn in this.codomain && typeof this.codomain[fn] === 'function')
				this.codomain[fn](e, elt);
			else if (fn in this && typeof this[fn] === 'function')
				this[fn](e, elt);
		}
		catch(x)
		{
			D.RecordError(x);
		}
	}
	update(save = true)
	{
		this.setView();
		save && D.SaveLocal(this);
	}
	actionHtml(e, name)
	{
		const action = this.codomain.actions.get(name);
		if (action && action.hasForm(e, R.diagram, this.selected))
			action.html(e, R.diagram, this.selected);
	}
	activate(e, name, args)
	{
		try
		{
			const action = this.codomain.actions.get(name);
			if (action && action.hasForm(e, R.diagram, this.selected))
				args ? action.action(e, this, this.selected, args) : action.action(e, this, this.selected);
		}
		catch(x)
		{
			D.RecordError(x);
		}
	}
	setView()
	{
		if ('x' in this.viewport)
			D.diagramSVG.setAttribute('transform', `translate(${this.viewport.x}, ${this.viewport.y})scale(${this.viewport.scale})`);
	}
	mousePosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
	}
	deselectAll(toolbarOff = true)
	{
		D.dataPanel.close();
		if (toolbarOff)
			D.HideToolbar();
		this.selected.map(elt => elt.showSelected(false));
		this.selected = [];
	}
	makeSelected(e, elt)
	{
		this.deselectAll(!elt);
		if (elt)
			this.addSelected(elt);
		if (R.debug)
			console.log('selected', elt);
		D.ShowToolbar(e);
	}
	addSelected(elt)
	{
		elt.showSelected();
		if (this.selected.indexOf(elt) >= 0)	// already selected
			return;
		this.selected.push(elt);
		if (DiagramObject.prototype.isPrototypeOf(elt) || DiagramText.prototype.isPrototypeOf(elt))
			elt.orig = {x:elt.x, y:elt.y};
		else if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			elt.domain.orig = {x:elt.domain.x, y:elt.domain.y};
			elt.codomain.orig = {x:elt.codomain.x, y:elt.codomain.y};
			if (DataMorphism.prototype.isPrototypeOf(elt) && elt.name !== document.getElementById('dataPanelTitle').innerHTML)
				D.dataPanel.close();
		}
	}
	pickElement(e, name)
	{
		const elt = this.getElement(name);
		if (elt)
		{
			window.setTimeout(function()
			{
				if (D.mouseIsDown)
					D.drag = true;
			}, D.default.dragDelay);
			D.dragStart = this.mousePosition(e);
			if (!this.isSelected(elt))
			{
				if (D.shiftKey)
				{
					this.addSelected(elt);
					D.ShowToolbar(e);
				}
				else
					this.makeSelected(e, elt);
			}
			if (DiagramObject.prototype.isPrototypeOf(elt))
				elt.orig = {x:elt.x, y:elt.y};
		}
		else if (!D.shiftKey)
			this.deselectAll();
	}
	isSelected(elt)
	{
		for(let i=0; i<this.selected.length; ++i)
			if (elt.name === this.selected[i].name)
				return true;
		return false;
	}
	/*
	deleteAll()
	{
		this.deselectAll();
		this.domain.clear();	// TODO
		this.codomain.clear();	// TODO
		if ('homSets' in this.domain)	// TODO
			this.domain.homSets.clear();	// TODO
	}
	distribute(e)
	{
		const from = this.getSelected();
		const text = from.to.properName;
		let html = H.h4('Distribute') +
					H.h5(`Domain Factors`) +
					H.small('Click to place in codomain') +
		// TODO fix D.elementId()
						H.button('1', '', D.elementId(), 'Add terminal object',
						`onclick="R.diagram.addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					this.getFactorButtonCode(from.to, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		D.help.innerHTML = html;
	}
	factorBtnCode()
	{
		const from = this.getSelected();
		const to = from.to;
		let html = H.h4('Create Factor Morphism') +
					H.h5('Domain Factors') +
					H.small('Click to place in codomain') +
						H.button('1', '', D.elementId(), 'Add terminal object',
						`onclick="R.diagram.addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					to.factorButton({fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		D.toolbarTip.innerHTML = html;
	}
	lambdaMorphism(e)
	{
		const from = this.getSelected();
		let domFactors = Diagram.GetFactorsByDomCodId('domainDiv');
		let homFactors = dIagram.GetFactorsByDomCodId('codomainDiv');
		const m = LambdaMorphism.Get(this, {preCurry:from.to, domFactors, homFactors});
		const v = D2.Subtract(from.codomain, from.domain);
		const normV = v.normal().normalize();
		const xyDom = normV.scale(D.default.arrow.length).add(from.domain);
	//	const xyCod = D2.add(from.codomain, D2.scale(D.default.arrow.length, normV));
		const xyCod = normV.scale(D.default.arrow.length, normV).add(from.codomain);
		this.placeMorphism(e, m, xyDom, xyCod);
	}
	displayString(event, from)
	{
		this.showString(this.getSelected());
	}
	*/
	showString(from)
	{
		const id = StringMorphism.GraphId(from);
		if (StringMorphism.RemoveStringSvg(from))
			return;
		const graphFunctor = R.$CAT.getMorphism('Graph');
		const sm = graphFunctor.$$(this, from.to);
		const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
		const svg = `<g id="${id}">${sm.graph.svg(this, {index:[], dom, cod, visited:[], elementId:from.elementId(), color:Math.floor(Math.random()*12)})}</g>`;
		D.diagramSVG.innerHTML += svg;
	}
	getSubFactorBtnCode(object, data)
	{
		let html = '';
		// TODO
		/*
		if ('data' in expr)
			for(let i=0; i<expr.data.length; ++i)
				html += H.button(this.getObject(expr.data[i]).properName + H.sub(i), '', D.elementId(), '', `data-factor="${data.dir} ${i}" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
		else
			html += H.button(this.getObject(expr).properName, '', D.elementId(), '', `data-factor="${data.dir} -1" onclick="Cat.H.toggle(this, '${data.fromId}', '${data.toId}')"`);
			*/
		return html;
	}
	lambdaForm(event, elt)
	{
		const from = this.getSelected();
		this.lambdaBtnForm(from.to.domain, from.to.codomain, from.to.domain.name);
	}
	lambdaBtnForm(domain, codomain, root)
	{
		const html =
			H.h4('Curry A &otimes; B -> [C, D]') +
			H.h5('Domain Factors: A &otimes; B') +
			H.small('Click to move to C') +
			H.div(domain.getSubFactorBtnCode({dir:	0, fromId:'domainDiv', toId:'codomainDiv'}), '', 'domainDiv') +
			H.h5('Codomain Factors: C') +
			(HomObject.prototype.isPrototypeOf(codomain) ?
				H.small('Merge to codomain hom') + D.GetButton('codhom', `R.diagram.toggleCodHom()`, 'Merge codomain hom', D.default.button.tiny) + H.br() : '') +
			H.small('Click to move to A &otimes; B') +
			// TODO this factorButton arguments are not correct
			H.div(HomObject.prototype.isPrototypeOf(codomain) ? codomain.homDomain().factorButton({dir:1, fromId:'codomainDiv', toId:'domainDiv'}) : '', '', 'codomainDiv') +
			H.span(D.GetButton('edit', `R.diagram.gui(evt, this, 'lambdaMorphism')`, 'Curry morphism'));
		D.help.innerHTML = html;
	}
	activateNamedElementForm(e)
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
	// TODO move to action
	createNamedIdentity(e)
	{
		try
		{
			if (this.readonly)
				throw 'diagram is read only';
			const from = this.getSelected();
			if (DiagramObject.prototype.isPrototypeOf(from))
			{
				document.getElementById('namedElementError').innerHTML = '';
				const basenameElt = document.getElementById('basenameElt');
				const basename = basenameElt.innerText;
				if (!U.basenameEx.test(basename))
					throw 'Invalid basename';
				const object = this.codomain.getObject(Element.Codename(this, basename));
				if (object)
					throw `object with basename ${basename} already exists in diagram ${this.properName}`;
				const properNameElt = document.getElementById('properNameElt');
				const properName = U.htmlEntitySafe(properNameElt.innerText);
				const descriptionElt = document.getElementById('descriptionElt');
				const description = U.htmlEntitySafe(descriptionElt.innerText);
				let toNI = new CatObject(this, {basename, description, properName});
				const iso = new Identity(this, {domain:toNI, codomain:from.to, description:`Named identity from ${toNI.properName} to ${from.to.properName}`});
				const iso2 = new Identity(this, {domain:from.to, codomain:toNI, description:`Named identity from ${from.to.properName} to ${toNI.properName}`});
				this.deselectAll();
				const isoFrom = this.objectPlaceMorphism(e, 'codomain', from.name, iso.name)
				const iso2From = new DiagramMorphism(this, {to:iso2, domain:isoFrom.codomain, codomain:isoFrom.domain});
				this.addSVG(iso2From);
				this.makeSelected(e, isoFrom);
				this.addSelected(iso2From);
				this.domain.makeHomSets();
				save && D.SaveLocal(this);
			}
			else
				throw 'Not implemented';
		}
		catch(e)
		{
			document.getElementById('namedElementError').innerHTML = 'Error: ' + U.GetError(e);
		}
	}
	//
	// Draw the morphism's proper name on the other side of the morphism.
	//
	flipName()
	{
		const from = this.getSelected();
		if (DiagramMorphism.prototype.isPrototypeOf(from))
		{
			from.flipName = !from.flipName;
			from.update();
			this.update();
		}
	}
	updateDragObjects()
	{
		const delta = this.userToDiagramCoords(D.mouse.position()).subtract(D.dragStart);
		let dragObjects = {};
		for(let i=0; i < this.selected.length; ++i)
		{
			const elt = this.selected[i];
			if (DiagramMorphism.prototype.isPrototypeOf(elt))
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
			elt.updatePosition(delta.add(elt.orig));
			const homset = this.domain.obj2morphs.get(elt);
			if (typeof homset !== 'undefined')
			{
				homset.dom.map(m => m.update());
				homset.cod.map(m => m.update());
			}
		}, this);
	}
	placeText(e, txt)
	{
		D.diagramSVG.innerHTML += txt.makeSVG();
		this.makeSelected(e, txt);
		this.update(e);
	}
	placeObject(e, to, xy)
	{
		const from = xy ? new DiagramObject(this, {xy:D.Grid(xy), to}) : new DiagramObject(this, {xy:D.Center(), to});
		this.addSVG(from);
		this.makeSelected(e, from);
		this.update(e);
		D.objectPanel.update();
		return from;
	}
	placeMorphism(e, to, xyDom, xyCod)
	{
		const xyD = typeof xyDom !== 'undefined' ? new D2(D.Grid(xyDom)) : D.Center();;
		const domain = new DiagramObject(this, {to:to.domain, xy:xyD});
		const codomain = new DiagramObject(this, {to:to.codomain});
		const from = new DiagramMorphism(this, {to, domain, codomain});
		const tw = D.textWidth(to.domain.properName)/2 + D.textWidth(to.properName) + D.textWidth(to.codomain.properName)/2 + 2 * D.textWidth('&emsp;');
		if (typeof xyCod !== 'undefined')
		{
			let xyC = new D2(xyCod);
			const angle = D2.Angle(xyDom, xyCod);
			const xyCmin = D.Grid({x:xyD.x + Math.cos(angle) * tw, y:xyD.y + Math.sin(angle) * tw});
			if (xyD.dist(xyC) < xyD.dist(xyCmin))
				xyC = xyCmin;
			codomain.setXY(xyC);
		}
		else
			codomain.setXY({x:xyD.x + Math.max(D.default.arrow.length, tw), y:xyD.y});
		this.domain.makeHomSets();
		this.addSVG(domain);
		this.addSVG(codomain);
		this.addSVG(from);
		this.makeSelected(e, from);
		this.update(e);
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
			const angles = [];
			// TODO use hom sets?
			for(const [name, m] of this.domain.morphisms)
				if (fromObj.name === m.domain.name)
					angles.push(D2.Angle(fromObj, m.codomain));
				else if (fromObj.name === m.codomain.name)
					angles.push(D2.Angle(fromObj, m.domain));
			angles.sort();
			let gap = 0;
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
			const tw = Math.abs(cosAngle) * D.textWidth(to.codomain.properName);
			const al = D.default.arrow.length;
			const xy = D.Grid({x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)});
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
			const from = new DiagramMorphism(this, {to, domain:domainElt, codomain:codomainElt});
			this.domain.makeHomSets();
			this.addSVG(newElt);
			this.addSVG(from);
			this.makeSelected(e, from);
			this.update(e);
			return from;
		}
		catch(x)
		{
			D.RecordError(x);
		}
	}
	getObjectMorphisms(object)
	{
		const domains = [];
		const codomains = [];
		for(const [name, from] of this.domain.morphisms)
		{
			if (from.domain.isEquivalent(object))
				domains.push(from);
			if (from.codomain.isEquivalent(object))
				codomains.push(from);
		}
		return {domains, codomains};
	}
	updateFusible()
	{
		if (this.selected.length === 1)
		{
			const elt = this.getSelected();
			elt.updateFusible(elt.isFusible(D.mouseover));
		}
	}
	findElement(pnt, except = '')
	{
		let elt = null;
		D.topSVG.querySelectorAll('.object').forEach(function(o)
		{
			if (o.dataset.name === except)
				return;
			const bbox = o.getBBox();
			const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
			if (D2.Inside(bbox, pnt, upperRight))
				elt = this.domain.getObject(o.dataset.name);
		}, this);
		if (!elt)
			D.topSVG.querySelectorAll('.morphTxt').forEach(function(o)
			{
				if (o.dataset.name === except)
					return;
				const bbox = o.getBBox();
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (D2.Inside(bbox, pnt, upperRight))
					elt = this.domain.getMorphism(o.dataset.name);
			}, this);
		if (!elt)
		{
			D.topSVG.querySelectorAll('.morphism').forEach(function(m)
			{
				if (m.dataset.name === except)
					return;
				const bbox = m.getBBox();
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (D2.SegmentDistance(pnt, bbox, upperRight) < 5)
					elt = this.domain.getMorphism(m.dataset.name);
			}, this);
		}
		if (!elt)
		{
			D.topSVG.querySelectorAll('.diagramText').forEach(function(t)
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
				if (D2.Inside(bbox, pnt, upperRight))
					elt = this.getElement(t.dataset.name);
			}, this);
		}
		return typeof elt === 'undefined' ? null : elt;
	}
			/*
	canFuseObjects(dragFrom, targetFrom)
	{
		if (DiagramObject.prototype.isPrototypeOf(dragFrom) && DiagramObject.prototype.isPrototypeOf(targetFrom))
		{
			const dragTo = dragFrom.to;
			const targetTo = targetFrom.to;
			if (dragTo.name === targetTo.name)
				return true;
//			if ((dragTo.isInitial && !targetTo.isInitial) || (!dragTo.isInitial && targetTo.isInitial))
//				return false;
			const morphisms = this.getObjectMorphisms(dragFrom);
			if (morphisms.domains.length === 0 && morphisms.codomains.length === 0)
{
console.log('canFuseObjects 1 true ');
				return true;
}
			const a = dragTo.name === targetTo.name && !dragFrom.isEquivalent(targetFrom);
			let b = false;
			if (morphisms.codomains.length > 0)
			{
				const to = morphisms.codomains[0].to;
				b = morphisms.codomains.length === 1 && morphisms.domains.length === 0 && Identity.prototype.isPrototypeOf(to);  // TODO multiple forms of identities
			}
console.log('canFuseObjects 2', a||b);
			return a||b;
		}
		return false;
	}
			*/
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	/*
	run(e)
	{
		const from = this.getSelected();
//		const isThreeD = from.to.codomain.name === 'threeD';
//		const isTty = from.to.codomain.name === 'TTY';
		if (Morphism.isProtypeOf(from) && from.to.isIterable())
		{
			const start = Date.now();
			if (isThreeD)
			{
				D.threeDPanel.open();
				D.threeDPanel.resizeCanvas();
			}
			const toResult = this.codomain.run(from.to, this);
//			if (isThreeD)
//				D.threeDPanel.view('front');
			if (toResult !== null)
			{
				const fromResult = new DiagramMorphism(this, {to, domain:from.domain, codomain:from.codomain});
				this.addSVG(fromResult);
				this.makeSelected(e, fromResult);
			}
//			if (isTty)
//			{
//				D.ttyPanel.open();
//				Panel.SectionOpen('tty-out-section');
//			}
			const delta = Date.now() - start;
			D.Status(e, `<br/>Elapsed ${delta}ms`);
		}
		D.drag = false;
	}
	*/
	addFactor(id, fname, root, action, ...indices)
	{
		const div = document.getElementById(id);
		if (div.innerHTML === '')
			div.innerHTML = H.span(D.GetButton('edit', `R.diagram.${fname}(evt)`, 'Create morphism'));
		const object = this.getObject(root);
		const factor = object.getFactor(indices);
		const sub = indices.join();
		div.innerHTML += H.button(factor.properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="U.H.del(this);${action}"`);
	}
	selectedFactorMorphism(e)		// TODO moved
	{
		const from = this.getSelected();
		const m = this.addFactorMorphism(from.to, U.GetFactorsById('codomainDiv'));
		this.objectPlaceMorphism(e, 'domain', from, m)
	}
	// TODO move to action?
	newDataMorphism(dom, cod)
	{
		const name = this.codomain.getAnon('Data');
		return new DataMorphism(this.codomain, {name, properName:name.slice(0, 9) + '&hellip;', diagram:this.name, domain:dom.name, codomain:cod.name});
	}
	makeAllSVG()
	{
		let svg = '';
		const fn = function(t)
		{
			svg += t.makeSVG();
		};
		this.domain.objects.forEach(fn);
		this.domain.morphisms.forEach(fn);
		this.texts.forEach(fn);
		return svg;
	}
	upload(e, fn = null)
	{
		if (R.user.status === 'logged-in')
		{
			document.getElementById('diagramUploadBtn').classList.add('vanish');
			const start = Date.now();
			R.cloud.ingestDiagramLambda(e, this, function(err, data)
			{
				if (err)
					alert(err.message);
				const delta = Date.now() - start;
				D.Status(e, `Uploaded diagram.<br/>Elapsed ${delta}ms`, true);
			});
		}
		else
			D.RecordError('You need to be logged in to upload your work.');
	}
	userToDiagramCoords(xy, orig = false)
	{
		const pos = D.topSVG.getBoundingClientRect();
		const s = 1.0 / this.viewport.scale;
		if (isNaN(pos.left) || isNaN(this.viewport.x) || isNaN(s))
			throw 'NaN in coords';
		return new D2(	s * (xy.x - pos.left - (orig ? this.viewport.orig.x : this.viewport.x)),
						s * (xy.y - pos.top -  (orig ? this.viewport.orig.y : this.viewport.y)));
	}
	diagramToUserCoords(xy)
	{
		const pos = D.topSVG.getBoundingClientRect();
		const s = this.viewport.scale;
		return new D2(	s * xy.x + pos.left + this.viewport.x,
						s * xy.y + pos.top  + this.viewport.y);
	}
	updateElementAttribute(from, attr, val)
	{
		if (from)
		{
			const isMorphism = DiagramMorphism.prototype.isPrototypeOf(from);
			if (DiagramObject.prototype.isPrototypeOf(from) || isMorphism)
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
				if (attr === 'properName')
					svg.outerHTML = from.makeSVG();
				D.textPanel.update();
			}
		}
	}
	editElementText(e, id, attr, fn = null)
	{
		const elt = document.getElementById(id);
		if (!this.readonly && elt.contentEditable === 'true' && elt.textContent !== '')
		{
			const from = this.getSelected();
			elt.contentEditable = false;
			this.updateElementAttribute(from, attr, U.htmlEntitySafe(elt.innerText));
			R.diagram.actionHtml(e, 'help');
			from && from.showSelected();
			if (fn)
				fn();
			D.SaveLocal(this);
		}
		else
		{
			elt.contentEditable = true;
			elt.focus();
		}
	}
	clearDataMorphism()
	{
		const from = this.getSelected();
		if (DataMorphism.prototype.isPrototypeOf(from.to))
		{
			from.to.clear();
			D.SaveLocal(this);
		}
	}
	updateMorphisms()
	{
		for(const [name, from] of this.domain.morphisms)
			from.update();
	}
	isIsolated(elt)
	{
		let r = false;
		if (DiagramObject.prototype.isPrototypeOf(elt))
			r = elt.refcnt === 1;
		else if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			let domMorphs = this.domain.obj2morphs.get(elt.domain);
			domMorphs = domMorphs ? domMorphs : {dom:[], cod:[]};
			let codMorphs = this.domain.obj2morphs.get(elt.codomain);
			codMorphs = codMorphs ? codMorphs : {dom:[], cod:[]};
			r = domMorphs.dom.length === 1 && domMorphs.cod.length === 0 && codMorphs.dom.length === 0 && codMorphs.cod.length === 1;
		}
		return r;
	}
	selectedCanRecurse()
	{
		let r = false;
		if (this.selected.length === 2)
		{
			const sel0 = this.selected[0].to;
			const sel1 = this.selected[1].to;
			if (DiagramMorphism.prototype.isPrototypeOf(sel0) && DiagramMorphism.prototype.isPrototypeOf(sel1))
			{
				const domain = sel0.domain;
				r = sel0.domain.isEquivalent(sel1.domain) &&
					sel0.codomain.isEquivalent(sel1.codomain) &&
					DataMorphism.prototype.isPrototypeOf(sel0) &&
					Composite.prototype.isPrototypeOf(sel1) &&
					sel1.getMorphism(sel0);
				const N = this.getObject('N');
				if (r && N)
				{
					if (sel0.domain.isEquivalent(N))
						return true;
					r = ProductObject.prototype.isPrototypeOf(domain) &&
						domain.objects.length === 3 &&
						N.isEquivalent(domain.objects[0]);
					if (r)
					{
						const factor1 = domain.objects[1];
						const factor2 = domain.objects[2];
						r = HomObject.prototype.isPrototypeOf(factor1) &&
							factor2.isEquivalent(factor1.objects[0]) &&
							factor2.isEquivalent(factor1.objects[1]);
					}
				}
			}
		}
		return r;
	}
	recursion(e)	// TODO used?
	{
		if (this.selectedCanRecurse())
		{
			const sel0 = this.selected[0].to;
			const sel1 = this.selected[1].to;
			sel0.setRecursor(sel1);
			D.SaveLocal(this);
			D.Status(e, `Recursor for ${sel0.properName} has been set`);
		}
	}
	removeMorphism(e, name)
	{
		const m = this.codomain.getMorphism(name);
		if (m)
		{
			m.decrRefcnt();
			D.morphismPanel.update();
			D.morphismPanel.diagramMorphismSection.update();
			this.update(e);
		}
	}
	getElement(name)
	{
		let elt = this.domain.getObject(name);
		if (elt)
			return elt;
		elt = this.domain.getMorphism(name);
		if (elt)
			return elt;
		return this.texts.get(name);
	}
	showStrings(e)
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
	getHomSet(dom, cod)		// TODO change to getIndexHomSet
	{
		const morphisms = [];
		for(const [name, from] of this.domain.morphisms)
		{
			if ((from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
				morphisms.push(from);
		}
		this.references.forEach(function(diagram, name)
		{
			for(const [name, from] of r.domain.morphisms)
			{
				if ((from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
					morphisms.push(from);
			}
		});
		return morphisms;
	}
	addWindowSelect(e)
	{
		const p = this.userToDiagramCoords(D.mouse.down);
		const q = this.userToDiagramCoords(D.mouse.position());
		this.texts.forEach(function(t)
		{
			if (D2.Inside(p, t, q))
			{
				this.addSelected(t);
			}
		}, this);
		this.domain.objects.forEach(function(o)
		{
			if (D2.Inside(p, o, q))
			{
				this.addSelected(o);
			}
		}, this);
		this.domain.morphisms.forEach(function(m)
		{
			if (D2.Inside(p, m.domain, q) && D2.Inside(p, m.codomain, q))
			{
				this.addSelected(m);
			}
		}, this);
		D.ShowToolbar(e);
	}
	downloadJSON(e)
	{
		D.DownloadString(this.stringify(), 'json', `${this.name}.json`);
	}
	downloadJS(e)
	{
		if (this.codomain.actions.has('javascript'))
		{
			const action = this.codomain.actions.get('javascript');
			const code = action.generateDiagram(this);
			const start = Date.now();
			const blob = new Blob([code], {type:'application/javascript'});
			const url = D.url.createObjectURL(blob);
			D.Download(url, `${this.basename}.js`);
			const delta = Date.now() - start;
			D.Status(e, `Diagram ${name} Javascript generated<br/>Elapsed ${delta}ms`, true);
		}
	}
	downloadPNG()
	{
		D.Svg2canvas(D.topSVG, this.name, true, D.Download);
	}
	getReferenceCounts(refs = {})
	{
		this.references.forEach(function(r)
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
		const ref = R.$CAT.getMorphism(name);		// TODO fix this
		if (!this.references.has(name))
			return false;
		const breakme = {};
		const usesIt = function(e)
		{
			if (e.usesDiagram(ref))
				throw breakme;
		}
		try
		{
			this.objects.forEach(usesIt);
			this.morphisms.forEach(usesIt);
		}
		catch(x)
		{
			if (x !== breakme)
				throw x;
			return true;
		}
		return false;
	}
	removeReference(e, name)
	{
		if (R.diagram.canRemoveReferenceDiagram(name))
		{
			const r = this.references.get(name);
			if (r)
			{
				this.references.delete(r.name);
				R.SetDiagramInfo(this);
			}
		}
	}
	addReference(name)	// immediate, no background fn
	{
		if (name === this.name)
			throw 'Do not reference yourself';
		const dependencies = this.getReferenceCounts();
		if (name in dependencies)
			throw `Diagram ${name} is already referenced ${dependencies[name]} times`;
		const diagram = R.LoadDiagram(name);
		if (!diagram)
			throw 'cannot load diagram';
		this.references.set(name, diagram);
		R.SetDiagramInfo(this);
	}
	unlock(e)
	{
		this.readonly = false;
		D.DiagramPanel.UpdateLockBtn(this);
	}
	lock(e)
	{
		this.readonly = true;
		D.DiagramPanel.UpdateLockBtn(this);
	}
	addFactorMorphism(domain, factors)
	{
		let m = FactorMorphism.Get(this, domain, factors);
		m.incrRefcnt();
		return m;
	}
	static Codename(args)
	{
		const codomainName = typeof args.codomain === 'string' ? args.codomain : args.codomain.name;
		return `/${codomainName}/${args.user}/${args.basename}`;
	}
}

R.protos =
{
	Category,
	CatObject,
	Composite,
	CoproductObject,
	DiagramObject,
	DiagramMorphism,
	DiagramText,
	DataMorphism,
	FiniteObject,
	Identity,
	IndexCategory,
	InitialObject,
	InitialMorphism,
	NamedIdentityObject,
	ProductObject,
	TerminalObject,
	TerminalMorphism,
	SubobjectClassifier,
	Sequence,
	HomObject,
	HomMorphism,
	Morphism,
	ProductObject,
	ProductMorphism,
	ProductAssembly,
	CoproductObject,
	CoproductMorphism,
	CoproductAssembly,
	FoldMorphism,
	DataMorphism,
};

if (isGUI)
{
	window.R			= R;
	window.D			= D;
	window.U			= U;
	//
	// show the intro if user has not accepted cookies
	//
	if (!R.HasAcceptedCookies())
	{
		document.getElementById('intro').innerHTML = D.intro();
		D.diagramPanel.fetchRecentDiagrams();
		window.R = R;
		return;
	}
}

R.Initialize();	// boot-up

})(typeof exports === 'undefined' ? this['Cat'] = this.Cat : exports);
