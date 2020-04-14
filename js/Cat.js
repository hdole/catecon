// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
'use strict';

(function(exports)
{

if (typeof require !== 'undefined')
{
	var ACI = null;
	var sjcl = null;
	var zlib = null;
	AWS = require('aws-sdk');
	sjcl = require('./sjcl.js');
	zlib = require('./zlib_and_gzip.min.js');
	var crypto = require('crypto');
}
else
{
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
			this.width = 'width' in x ? x.width : 0;
			this.height = 'height' in x ? x.height : 0;
		}
		else
		{
			this.x = x;
			this.y = y;
			this.width = 0;
			this.height = 0;
		}
	}
	add(w)
	{
		const a = new D2(this);
		a.x += w.x;
		a.y += w.y;
		return a;
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
	static Overlap(abox, bbox)
	{
		const aLeft = abox.x;
		const aRight = abox.x + abox.width;
		const aTop = abox.y;
		const aBottom = abox.y + abox.height;
		const bLeft = bbox.x;
		const bRight = bbox.x + bbox.width;
		const bTop = bbox.y;
		const bBottom = bbox.y + bbox.height;
		const h =	D2.Inbetween(aLeft, bLeft, aRight) ||
					D2.Inbetween(aLeft, bRight, aRight) ||
					D2.Inbetween(bLeft, aLeft, bRight) ||
					D2.Inbetween(bLeft, aRight, bRight);
		const w =	D2.Inbetween(bBottom, aBottom, bTop) ||
					D2.Inbetween(bBottom, aTop, bTop) ||
					D2.Inbetween(aBottom, bBottom, aTop) ||
					D2.Inbetween(aBottom, bTop, aTop);
		return h && w;
	}
	static Merge(...boxes)
	{
		const x = Math.min(...boxes.map(bx => bx.x));
		const y = Math.min(...boxes.map(bx => bx.y));
		const width = Math.max(...boxes.map(bx => bx.x + bx.width - x));
		const height = Math.max(...boxes.map(bx => bx.y + bx.height - y));
		return {x, y, width, height};
	}
	static IsA(obj)
	{
		return D2.prototype.isPrototypeOf(obj);
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
	static input(h, c, i, t, x)	{return `<input id="${i}" class="${c}" type="${t}" value="${h}" placeholder="${x.ph}" ${'x' in x ? x.x : ''}/>`;}
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
	static select(h, c, i, t, x) {return H.x('select', '', c, i, t, x); }
	static option(h, v, sel = false)			{return H.x('option', h, '', '', '', `${sel ? 'selected ' : ''}value="${v}"`); }
	static del(elt) {elt.parentElement.removeChild(elt);}
	static move(elt, toId) {document.getElementById(toId).appendChild(elt); }
	static toggle(elt, here, there) {elt.parentNode.id === here ? H.move(elt, there) : H.move(elt, here); }
}

class H3
{
	static _p(elt, args)
	{
		for (let i=0; i<args.length; ++i)
		{
			const arg = args[i];
			const type = arg.constructor.name;
			switch(arg.constructor.name)
			{
				case 'String':
					elt.innerHTML = arg;
					break;
				case 'Object':
					Object.keys(arg).map(k => elt.setAttribute(k, arg[k]));
					break;
				case 'Array':
					arg.map(c => c && elt.appendChild(c));
					break;
				default:
					elt.appendChild(arg);
					break;
			}
		}
		return elt;
	}
	static _h(type, args)
	{
		return H3._p(document.createElement(type), args);
	}
	static _v(type, args)
	{
		return H3._p(document.createElementNS(D.xmlns, type), args);
	}
	static a(...args)		{ return H3._h('a', args); }
	static animateTransform(...args)		{ return H3._v('animateTransform', args); }
	static br(...args)		{ return H3._h('br', args); }
	static div(...args)		{ return H3._h('div', args); }
	static g(...args)		{ return H3._v('g', args); }
	static h1(...args)		{ return H3._h('h1', args); }
	static h2(...args)		{ return H3._h('h2', args); }
	static h3(...args)		{ return H3._h('h3', args); }
	static h4(...args)		{ return H3._h('h4', args); }
	static hr(...args)		{ return H3._h('hr', args); }
	static img(...args)		{ return H3._h('img', args); }
	static line(...args)	{ return H3._v('line', args); }
	static p(...args)		{ return H3._h('p', args); }
	static path(...args)	{ return H3._v('path', args); }
	static rect(...args)	{ return H3._v('rect', args); }
	static span(...args)	{ return H3._h('span', args); }
	static svg(...args)		{ return H3._v('svg', args); }
	static table(...args)	{ return H3._h('table', args); }
	static text(...args)	{ return H3._v('text', args); }
	static td(...args)		{ return H3._h('td', args); }
	static th(...args)		{ return H3._h('th', args); }
	static tr(...args)		{ return H3._h('tr', args); }
}

const isCloud = true;		// TODO turn on when cloud ready

const isGUI = typeof window === 'object';
if (isGUI)
{
	(function(d)
	{
		const a = d.createElement('script');
		a.type = 'text/javascript';
		a.async = true;
		a.id = 'amazon-login-sdk';
		a.src = 'https://api-cdn.amazon.com/sdk/login1.js?v=3';
		d.getElementById('navbar').appendChild(a);
	})(document);
}

class U
{
	static random()
	{
		const ary = new Uint8Array(16);
		isGUI ? window.crypto.getRandomValues(ary) : crypto.randomFillSync(ary);
		let cid = '';
		for (let i=0; i<16; ++i)
			cid += ary[i].toString(16);
		return U.Sig(cid);
	}
	static getUserSecret(s)
	{
		return sjcl.codec.hex.fromBits(U.Sig(`TURKEYINTHESTRAW${s}THEWORLDWONDERS`));
	}
	static GetError(err)
	{
		return typeof err === 'string' ? err : `${err.name}: ${err.message}`;
	}
	static Clone(o)
	{
		if (null === o || o instanceof Element || o instanceof Blob)
			return o;
		else if (typeof o === 'object')
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
	static ArrayHas(a, b)
	{
		return a.reduce((r, sa) => r || sa.reduce((sr, ai, i) => sr && ai === b[i], true), false);
	}
	static GetFactorsById(id)
	{
		const btns = document.getElementById(id).querySelectorAll('button');
		let factors = [];
		btns.forEach(function(b)
		{
			const idx = JSON.parse(`[${b.dataset.indices}]`);
			factors.push(idx.length === 1 ? idx[0] : idx);
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
	static Token(e, cls = false)
	{
		const s = typeof e === 'string' ? e : e.name;
		const r = s.replace(/\//g, '_').replace(/{/g, '_Br_').replace(/}/g, '_rB_').replace(/,/g, '_c_').replace(/:/g, '_o_').replace(/#/g, '_n_')
			.replace(/\[/g, '_br_')
			.replace(/\]/g, '_rb_');
		return r;
	}
	static a2s(a)	// array to string
	{
		if (Array.isArray(a))
			return '[' + a.map(e => U.a2s(e)).join() + ']';
		return typeof a !== 'undefined' ? a.toString() : '';
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
}
Object.defineProperties(U,
{
	basenameEx:		{value:RegExp('^[a-zA-Z_$]+[a-zA-Z0-9_$]*$'),	writable:false},
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

class R
{
	static CookieAccept()
	{
		if (U.secret !== U.getUserSecret(U.HtmlSafe(document.getElementById('cookieSecret').value)))
		{
			alert('Your secret is not good enough.');
			return;
		}
		localStorage.setItem('Cookies Accepted', JSON.stringify(Date.now()));
		const intro = document.getElementById('intro');
		intro.parentNode.removeChild(intro);
		R.Initialize();	// boot-up
		R.cloud && R.cloud.onCT();
	}
	// TODO move to D
	static HasAcceptedCookies()
	{
		return true;
	}
	static SetupUserHome(user, fn = null)
	{
		const subFun = function()
		{
			const userDiagram = R.GetUserDiagram(user);
			let home = userDiagram.getElement(`${user}/Home`);
			if (!home)
				home = R.ReadLocal(R.UserHomeDiagramName(user));
			if (!home)
			{
				home = new Diagram(userDiagram,
				{
					description:	'User home diagram',
					codomain:		'hdole/PFS',
					basename:		'Home',
					properName:		'Home',
					references:		['hdole/HTML'],
					user,
				});
				R.EmitDiagramEvent(diagram, 'load');
				const args =
				{
					description:
`Welcome to Catecon: The Categorical Console
Create diagrams and execute morphisms.
`,
					xy:			new D2(300, 300),
				};
				R.AddDiagram(home);
				home.makeSvg();
				const intro = new Cat.DiagramText(home, args);
				home.addSVG(intro);
				home.home();
				home.update();
				R.diagram = home;
				R.EmitDiagramEvent(home, 'new');
				R.Actions.javascript.loadHTML(fn);
			}
			else
				fn && fn();
		}
		const coreDiagrams = ['hdole/Basics', 'hdole/Logic', 'hdole/Narithmetics', 'hdole/Integers', 'hdole/floats', 'hdole/Strings', 'hdole/HTML'].filter(d => !R.HasLocal(d));
		if (coreDiagrams.length > 0)
			R.fetchDiagrams(coreDiagrams, {}, subFun);
		else
			subFun();
	}
	static LoadScript(url, fn)
	{
		const s = document.createElement('script');
		s.type = 'text/javascript';
		s.onload = fn;
		s.async = true;
		s.onerror = function()
		{
			debugger;
		}
		s.src = url;
		document.getElementsByTagName('head')[0].appendChild(s);
	}
	static Initialize()
	{
		try
		{
			window.addEventListener('Diagram', function(e)
			{
				R.LoadDiagramEquivalences(e.detail.diagram);
			});
			window.addEventListener('Login', function(e) { R.SetupUserHome(e.detail.user); } );
			const worker = new Worker('js/workerEquality.js');
			R.workers['equality'] = worker;
			worker.addEventListener('message', function(msg)
			{
				const args = msg.data;
				const diagram = R.$CAT.getElement(args.diagram);
				switch(args.command)
				{
					case 'CheckEquivalence':
						const cell = diagram.domain.cells.get(args.cell);
						const isEqual = args.isEqual;
						const assertion = diagram.getAssertion(cell.signature);
						if (isEqual)
						{
							if (assertion)
							{
								cell.setCommutes('assertion');
								assertion.setCell(cell);
							}
							else if (DiagramComposite.CellIsComposite(cell))
								cell.setCommutes('composite');
							else if (cell.isNamedMorphism())
								cell.setCommutes('named');
							else
								cell.setCommutes('computed');
						}
						else
							cell.setCommutes('unknown');
						const objs = cell.getObjects();
						if (!cell.svg)
							diagram.addSVG(cell);
						cell.update();
						break;
					case 'start':
					case 'Info':
					case 'LoadEquivalence':
					case 'Load':
					case 'RemoveEquivalences':
						break;
					default:
						debugger;
						break;
				}
			});
			worker.postMessage({command:'start', url:window.location.origin + window.location.pathname});
			D.url = isGUI ? (window.URL || window.webkitURL || window) : null;
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
				R.ReadLocalDiagramList();
				R.ReadLocalCategoryList();
			}
			const CATargs =
			{
				basename:		'CAT',
				name:			'CAT',
				user:			'sys',
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
				user:			'sys',
			};
			R.UserDiagram = new Map;
			R.$CAT = new Diagram(null, $CATargs);
			R.UserDiagram.set('sys', R.$CAT);
			R.Cat = new Category(R.$CAT,
			{
				basename:		'Cat',
				category:		R.CAT,
				name:			'Cat',
				description:	'category of smaller categories',
				properName:		'ℂ𝕒𝕥',
				user:			'sys',
			});
			const actionCat = new Category(R.$CAT,
			{
				basename:		'Actions',
				name:			'Actions',
				properName:		'Actions',
				description:	'discrete category of currently loaded actions',
				user:			'sys',
			});
			R.$Actions = new Diagram(R.$CAT,
			{
				basename:		'$Actions',
				name:			'$Actions',
				codomain:		'Actions',
				properName:		'Actions',
				description:	'diagram of currently loaded actions',
				user:			'sys',
			});
			const categoryActions = new Set([
				new IdentityAction(R.$Actions),
				new GraphAction(R.$Actions),
				new NameAction(R.$Actions),
				new CompositeAction(R.$Actions),
				new DetachDomainAction(R.$Actions),
				new DetachDomainAction(R.$Actions, true),
				new HomObjectAction(R.$Actions),
				new HomObjectAction(R.$Actions, true),
				new DeleteAction(R.$Actions),
				new CopyAction(R.$Actions),
				new FlipNameAction(R.$Actions),
				new HelpAction(R.$Actions),
				new JavascriptAction(R.$Actions),
				new CppAction(R.$Actions),
				new RunAction(R.$Actions),
				new AlignHorizontalAction(R.$Actions),
				new AlignVerticalAction(R.$Actions),
				new AssertionAction(R.$Actions),
			]);
			const categoryDiagram = new Diagram(R.$CAT, {basename:'category', name:'category', codomain:'Actions', description:'diagram for a category', user:'sys'});
			let xy = new D2(300, 300);
			let diagram = categoryDiagram;
			function placeAction(a)
			{
				diagram.elements.set(a.basename, a);
				const from = new DiagramObject(diagram, {xy, to:a});
				xy.add(D.default.stdArrow);
			};
			categoryActions.forEach(placeAction);
			const productActions = new Set([
				new ProductAction(R.$Actions),
				new ProjectAction(R.$Actions),
				new PullbackAction(R.$Actions),
				new ProductAssemblyAction(R.$Actions),
				new TerminalMorphismAction(R.$Actions)]);
			const productDiagram = new Diagram(R.$CAT, {basename:'product', name:'product', codomain:'Actions', description:'diagram for products', user:'sys'});
			xy = new D2(300, 300);
			diagram = productDiagram;
			productActions.forEach(placeAction);
			const coproductActions = new Set([
				new ProductAction(R.$Actions, true),
				new ProjectAction(R.$Actions, true),
				new PullbackAction(R.$Actions, true),
				new ProductAssemblyAction(R.$Actions, true),
				new TerminalMorphismAction(R.$Actions, true),
				new FiniteObjectAction(R.$Actions),
				new DataAction(R.$Actions),
				new RecursionAction(R.$Actions),
			]);
			const coproductDiagram = new Diagram(R.$CAT, {basename:'coproduct', name:'coproduct', codomain:'Actions', description:'diagram for coproducts', user:'sys'});
			xy = new D2(300, 300);
			diagram = coproductDiagram;
			coproductActions.forEach(placeAction);
			const homActions = new Set([
				new HomAction(R.$Actions),
				new EvaluateAction(R.$Actions),
				new LambdaMorphismAction(R.$Actions)]);
			const homDiagram = new Diagram(R.$CAT, {basename:'hom', name:'hom', codomain:'Actions', description:'diagram for hom actions', user:'sys'});
			xy = new D2(300, 300);
			diagram = homDiagram;
			homActions.forEach(placeAction);
			//
			const distributeActions = new Set([
				new DistributeAction(R.$Actions),
				]);
			const distributeDiagram = new Diagram(R.$CAT, {basename:'distribute', name:'distribute', codomain:'Actions', description:'diagram for distribution actions', user:'sys'});
			xy = new D2(300, 300);
			diagram = distributeDiagram;
			distributeActions.forEach(placeAction);
			//
			const tensorActions = new Set([
				new TensorAction(R.$Actions),
				]);
			const tensorDiagram = new Diagram(R.$CAT, {basename:'tensor', name:'tensor', codomain:'Actions', description:'diagram for tensor actions', user:'sys'});
			xy = new D2(300, 300);
			diagram = tensorDiagram;
			tensorActions.forEach(placeAction);
			//
			R.Cat.addActions('category');
			R.Cat.addActions('product');
			R.Cat.addActions('coproduct');
			R.Cat.addActions('hom');
			R.Cat.addActions('distribute');
			R.Actions = {};
			R.$Actions.elements.forEach(function(e)
			{
				R.Actions[e.name] = e;
			});
			const user = 'hdole';
			const pfs = new Category(R.$CAT,
			{
				basename:'PFS',
				user,
				properName:'&Popf;&Fopf;&Sopf;',
				actionDiagrams:	['product', 'coproduct', 'hom', 'distribute'],
			});
			isGUI && D.Initialize();
			const replayDrop =
			{
				replay(e, diagram, args)
				{
					const from = diagram.getElement(args.from);
					const target = diagram.getElement(args.target);
					const action = R.$Actions.getElement(args.action);
					diagram.drop(e, action, from, target);
				}
			};
			R.ReplayCommands.set('drop', replayDrop);
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
							elt.update(xy);
							elt.finishMove();
						}
					}
				},
			};
			R.ReplayCommands.set('move', replayMove);
			const replayFuse =
			{
				replay(e, diagram, args)
				{
					const from = diagram.getElement(args.from);
					const target = diagram.getElement(args.target);
					diagram.fuse(e, from, target, false);
				}
			};
			R.ReplayCommands.set('fuse', replayFuse);
			const replayText =
			{
				replay(e, diagram, args)
				{
					const xy = new D2(args.xy);
					diagram.placeText(e, xy, args.text, false);
				}
			};
			R.ReplayCommands.set('text', replayText);
			const replayEditText =
			{
				replay(e, diagram, args)
				{
					const t = diagram.getElement(args.name);
					t.editText(e, args.attribute, args.value, false);
				}
			};
			R.ReplayCommands.set('editText', replayEditText);
			const replayView =
			{
				replay(e, diagram, args)
				{
					diagram.setView(args.x, args.y, args.scale, true, false);
				}
			};
			R.ReplayCommands.set('view', replayView);
			const replayPaste =
			{
				replay(e, diagram, args)
				{
					D.DoPaste(e, args.xy, diagram.getElements(args.elements));
				}
			};
			R.ReplayCommands.set('paste', replayPaste);
			const replayAddReference =
			{
				replay(e, diagram, args)
				{
					D.AddReference(args.diagram, false);
				}
			};
			R.ReplayCommands.set('addReference', replayAddReference);
			const replayRemoveReference =
			{
				replay(e, diagram, args)
				{
					D.RemoveReference(e, args.diagram, false);
				}
			};
			R.ReplayCommands.set('removeReference', replayRemoveReference);
			//
			const loader = function()
			{
				R.Setup(function()
				{
					R.initialized = true;
					R.Actions.javascript.loadHTML();
				});
			};
			const params = (new URL(document.location)).searchParams;
			if (params.has('boot'))
				R.LoadScript(window.location.origin + window.location.pathname + 'js/boot.js', function() { Boot(loader); });
			else
				loader();
		}
		catch(e)
		{
			D.RecordError(e);
		}
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
			description:	'User diagrams',
			user,
		};
		d = new Diagram(null, $CATargs);
		R.UserDiagram.set(user, d);
		return d;
	}
	static SaveLocal(diagram, savePng = true, updateTime = true)
	{
		if (R.default.debug)
			console.log('SaveLocal', diagram.name);
		if (updateTime)
			diagram.timestamp = Date.now();
		localStorage.setItem(`${diagram.name}.json`, diagram.stringify());
		// TODO put in web worker since it takes a while
		D.Svg2canvas(D.topSVG, diagram.name, function(png, pngName)
		{
			D.diagramPNG.set(diagram.name, png);
			localStorage.setItem(`${diagram.name}.png`, png);
		});
		return true;
	}
	static HasLocal(name)
	{
		return localStorage.getItem(`${name}.json`) !== null;
	}
	static ReadLocal(name, clear = false)
	{
		const data = localStorage.getItem(`${name}.json`);
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
			const localLog = localStorage.getItem(`${name}.log`);
			if (localLog)
				args.log = JSON.parse(localLog);
			const diagram = new Diagram(userDiagram, args);
			const png = localStorage.getItem(`${diagram.name}.png`);
			if (png)
				D.diagramPNG.set(diagram.name, png);
			R.AddDiagram(diagram); // TODO eventually remove, should already be in the list
			if (R.default.debug)
				console.log('ReadLocal',name,diagram);
			R.EmitDiagramEvent(diagram, 'load');
			return diagram;
		}
		return null;
	}
	static ReadLocalDiagramList()
	{
		const diagrams = JSON.parse(localStorage.getItem('diagrams'));
		if (diagrams)
			diagrams.map(d => R.Diagrams.set(d.name, d));
	}
	static SaveLocalDiagramList()
	{
		localStorage.setItem('diagrams', JSON.stringify(U.JsonMap(R.Diagrams, false)));
	}
	static ReadLocalCategoryList()
	{
		const categories = JSON.parse(localStorage.getItem('categories'));
		if (categories)
			categories.map(d => R.Categories.set(d.name, d));
	}
	static SaveLocalCategoryList()
	{
		localStorage.setItem('categories', JSON.stringify(U.JsonMap(R.GetCategoriesInfo(), false)));
	}
// TODO unused; move to cloud class?
	static fetchCategories(fn = null)
	{
		fetch(R.cloud.getURL() + '/categories.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					data.map(cat =>
					{
						if (!R.$CAT.getElement(cat.name))
						{
							const nuCat = new Category(R.$CAT, {name:cat.name, properName:cat.properName, description:cat.description});
							R.catalog[nuCat] = {};
						}
					});
					if (fn)
						fn(data);
				});
			else
				D.RecordError(response);
		});
	}
// TODO unused?
	static fetchDiagrams(dgrms, refs, fn)
	{
		R.cloud.fetchDiagramJsons(dgrms, function(jsons)
		{
			jsons.map(j =>
			{
				const userDiagram = R.GetUserDiagram(j.user);
				const diagram = new Diagram(userDiagram, j);
				R.SaveLocal(diagram, true, false);
			});
			if (fn)
				fn(jsons);
			return jsons;
		}, [], refs);
	}
	static UserHomeDiagramName(user)
	{
		return `${user}/Home`;
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
					};
					if (foundIt)
					{
						const bbox = foundIt.getBBox();
						R.diagram.setViewport(bbox);
						const center = R.diagram.diagramToUserCoords(D.Center(R.diagram));
						center.y = center.y / 4;
						R.diagram.addSelected(foundIt);
						const e = {clientX:center.x, clientY:center.y};
						D.toolbar.show(e, m);
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
	static Setup(fn)
	{
		R.diagram = null;
		const subFn = function()
		{
			const params = (new URL(document.location)).searchParams;
			let diagramName = params.get('d') || params.get('diagram');
			if (diagramName)
			{
				if (!params.get('f'))	// force local
					R.diagram = R.ReadLocal(diagramName, params.has('clear'));
				else
					R.diagram = R.$CAT.getElement(diagramName);
				if (!R.diagram)
				{
					R.FetchDiagram(diagramName, function()
					{
						R.SelectDiagram(diagramName);
						if (R.diagram)
						{
							const morphismName = params.get('m');
							R.DisplayMorphismInput(morphismName);		// TODO
						}
						else
							D.RecordError('Diagram specified in URL could not be loaded.');
					});
					return;
				}
				else
					R.SelectDiagram(diagramName);
				const morphismName = params.get('m');
				R.DisplayMorphismInput(morphismName);		// TODO
			}
			if (!R.diagram)
				R.SelectDiagram(R.default.diagram);
			if (!R.diagram)
				R.SelectDiagram(R.UserHomeDiagramName(R.user.name));
			R.category = R.diagram.codomain;
			fn && fn();
		}
		R.SetupUserHome(R.user.name, subFn);
	}
	static SelectDiagram(name)
	{
		D.toolbar.hide();
		function setup(name)
		{
			if (!R.diagram)
				R.diagram = R.$CAT.getElement(name);
			R.EmitDiagramEvent(R.diagram, 'select');
			R.diagram.updateMorphisms();
			R.diagram.update(false);
			R.diagram.svgTranslate.classList.add('autohide');
		}
		R.diagram = R.$CAT.getElement(name);
		if (!R.diagram)
			R.diagram = R.ReadLocal(name);
		if (!R.diagram && R.cloud)
		{
			R.FetchDiagram(name, setup);
			return;
		}
		setup(name);
	}
	static GetCategory(name)
	{
		if (name === 'CAT')
			return R.CAT;
		else if (name === 'Cat')
			return R.Cat;
		return R.CAT ? R.CAT.getElement(name) : null;
	}
	static FetchDiagram(dgrmName, fn)
	{
		let diagram = null;
		R.cloud && R.cloud.fetchDiagramJsons([dgrmName], function(jsons)
		{
			jsons.reverse().map(j =>
			{
				const userDiagram = R.GetUserDiagram(j.user);
				// TODO for clearing corrupted diagrams
				const params = (new URL(document.location)).searchParams;
				const diagramName = params.get('d') || params.get('diagram');
				if (diagramName && diagramName === j.name && params.has('clear'))	// clear contents of diagram
				{
					j.elements = [];
					j.domainElements = [];
					j.texts = [];
					j.timestamp = Date.now();
				}
				diagram = new Diagram(userDiagram, j);
				R.EmitDiagramEvent(diagram, 'load');
			});
			if (jsons.length > 0 && fn)
				fn(diagram);
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
			let diagram = R.$CAT.getElement(name);
			if (diagram)
				return;
			if (isGUI)
				diagram = R.ReadLocal(name);
			// else TODO cloud fetch
		});
	}
	static LoadDiagram(name)	// TODO cloud loading is in background fn
	{
		let diagram = R.$CAT.getElement(name);
		if (diagram)
			return diagram;
		R.LoadDiagrams(R.GetReferences(name));
		if (isGUI && !diagram)
			diagram = R.ReadLocal(name);
		// else TODO cloud fetch
		return diagram;
	}
	static SetDiagramInfo(diagram)
	{
		R.Diagrams.set(diagram.name, Diagram.GetInfo(diagram));
	}
	static AddDiagram(diagram)
	{
		R.SetDiagramInfo(diagram);
		R.SaveLocalDiagramList();
		R.SaveLocalCategoryList();
	}
	static GetCategoriesInfo()
	{
		const info = new Map;
		R.$CAT.codomain.elements.forEach(function(o)
		{
			if (Category.IsA(o) && !IndexCategory.IsA(o))
				info.set(o.name, o.info());
		});
		return info;
	}
	static ReloadDiagramFromServer()
	{
		const name = R.diagram.name;
		const svg = R.diagram.svgRoot;
		R.cloud && R.cloud.fetchDiagram(name, false).then(function(data)
		{
			R.diagram.clear();
			localStorage.setItem(`${name}.json`, JSON.stringify(data));
			svg && svg.parentNode.removeChild(svg);
			R.diagram.decrRefcnt();
			R.SelectDiagram(name);
		});
	}
	static LoadEquivalence(diagram, item, leftLeg, rightLeg)
	{
		const leftSigs = leftLeg.map(m => m.signature);
		const rightSigs = rightLeg.map(m => m.signature);
		R.LoadEquivalentSigs(diagram, item, leftSigs, rightSigs)
	}
	static LoadEquivalentSigs(diagram, item, leftSigs, rightSigs)
	{
		R.workers.equality.postMessage({command:'LoadEquivalence', diagram:diagram.name, item:item.name, leftLeg:leftSigs, rightLeg:rightSigs});
	}
	static RemoveEquivalences(diagram, ...items)
	{
		R.workers.equality.postMessage({command:'RemoveEquivalences', diagram:diagram.name, items});
	}
	static LoadDiagramEquivalences(diagram)
	{
		R.workers.equality.postMessage({command:'Load', diagrams:[...[...diagram.allReferences.keys()].reverse(), diagram.name]});
	}
	static EmitDiagramEvent(diagram, command, name = '')	// like diagram was loaded
	{
		window.dispatchEvent(new CustomEvent('Diagram', {detail:	{diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static EmitObjectEvent(command, name)	// like an object changed
	{
		window.dispatchEvent(new CustomEvent('Object', {detail:	{diagram:R.diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static EmitMorphismEvent(command, name)
	{
		window.dispatchEvent(new CustomEvent('Morphism', {detail:	{diagram:R.diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static EmitAssertionEvent(command, name)
	{
		window.dispatchEvent(new CustomEvent('Assertion', {detail:	{diagram:R.diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static EmitTextEvent(command, name)
	{
		window.dispatchEvent(new CustomEvent('Text', {detail:	{diagram:R.diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static LoadScript(url, fn)
	{
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.async = true;
		script.src = url;
		script.addEventListener('load', fn);
		document.body.appendChild(script);
	}
}
Object.defineProperties(R,
{
	Actions:			{value:null,	writable:true},		// loaded actions
	autosave:			{value:false,	writable:true},		// is autosave turned on for diagrams?
	Cat:				{value:null,	writable:true},
	CAT:				{value:null,	writable:true},		// working nat trans
	catalog:			{value:{},		writable:true},
	category:			{value:null,	writable:true},		// current category
	Categories:			{value:new Map,	writable:false},	// available categories
	clear:				{value:false,	writable:true},
	cloud:				{value:null,	writable:true},		// cloud we're using
	default:
	{
		value:
		{
			category:		'hdole/PFS',
			diagram:		'Anon/Home',
			debug:			false,
			internals:		false,
		},
		writable:	true,
	},
	Diagrams:			{value:new Map,	writable:false},	// available diagrams
	diagram:			{value:null,	writable:true},		// current diagram
	initialized:		{value:false,	writable:true},		// Have we finished the boot sequence and initialized properly?
	ReplayCommands:		{value:new Map,	writable:false},
	ServerDiagrams:		{value:new Map,	writable:false},
	url:				{value:'',		writable:true},
	user:
	{
		value:
		{
			name:	'Anon',
			email:	'anon@example.com',
			status:	'unauthorized',
		},
		writable:true
	},	// TODO fix after bootstrap removed	writable:true,
	workers:			{value:{},		writable: false},
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
			'diagramBucket':	{value:	null,																	writable: true},
			'userPool':			{value:	null,																	writable: true},
			'loggedIn':			{value:	false,																	writable: true},
		});
		const that = this;
		const script = document.createElement('script');
		script.src = "https://sdk.amazonaws.com/js/aws-sdk-2.306.0.min.js";
		script.type = "text/javascript";
		script.onload = function()
		{
			const url = document.location;
			const host = `${url.protocol}//${url.host}/${url.pathname === '/' ? '' : url.pathname}`;
			
			const script = document.createElement('script');
			script.src = host + "js/amazon-cognito-identity.min.js";
			script.type = "text/javascript";
			script.onload = function()
			{
				R.cloud = that;
				window.AWS.config.update(
				{
					region:			that.region,
					credentials:	new window.AWS.CognitoIdentityCredentials(that.loginInfo),
				});
				isGUI && that.registerCognito();
			};
			document.body.appendChild(script);
		};
		document.body.appendChild(script);
	}
	getURL(user, basename)
	{
		let url = `https://s3-${this.region}.amazonaws.com/${this.diagramBucketName}`;
		if (typeof user === 'undefined')
			return url;
		url += `/${user}`;
		if (typeof basename === 'undefined')
			return url;
		return `${url}/${basename}`;
	}
	updateServiceObjects()
	{
		this.diagramBucket = new window.AWS.S3({apiVersion:'2006-03-01', params: {Bucket: this.diagramBucketName}});
		this.lambda = new window.AWS.Lambda({region: R.cloud.region, apiVersion: '2015-03-31'});
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
			if (R.default.debug)
				console.log('saved category', category.name);
		});
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
		else if (typeof AmazonCognitoIdentity !== 'undefined')
		{
			this.userPool = new AmazonCognitoIdentity.CognitoUserPool(poolInfo);
			this.user = this.userPool.getCurrentUser();
		}
		if (this.user)
		{
			const that = this;
			this.user.getSession(function(err, session)
			{
				if (err)
				{
					alert(err.message);
					return;
				}
				window.AWS.config.credentials = new window.AWS.CognitoIdentityCredentials(that.loginInfo);
				that.accessToken = session.getAccessToken().getJwtToken();
				const idPro = new window.AWS.CognitoIdentityServiceProvider();
				idPro.getUser({AccessToken:that.accessToken}, function(err, data)
				{
					// TODO merge with login()
					if (err)
					{
						console.log('getUser error', err);
						return;
					}
					that.loggedIn = true;
					R.user.name = data.Username;
					R.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
					R.user.status = 'logged-in';
					that.getUserDiagramsFromServer(function(dgrms)
					{
						if (R.default.debug)
							console.log('registerCognito: user diagrams on server', dgrms);
					});
					const loginEvent = new CustomEvent('Login', {detail:	{user:R.user.name}, bubbles:true, cancelable:true});
					window.dispatchEvent(loginEvent);
				});
			});
			this.updateServiceObjects();
		}
		else
		{
			window.AWS.config.credentials = new window.AWS.CognitoIdentityCredentials(this.loginInfo);
			window.AWS.config.credentials.get();
			this.updateServiceObjects();
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
			window.dispatchEvent(new CustomEvent('Login', {detail:	{user:R.user.name}, bubbles:true, cancelable:true}));
		});
	}
	resetPassword()
	{
		const userName = U.HtmlSafe(document.getElementById('signupUserName').value);
		const email = U.HtmlSafe(document.getElementById('signupUserEmail').value);
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
			window.dispatchEvent(new CustomEvent('Login', {detail:	{user:R.user.name}, bubbles:true, cancelable:true}));
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
			window.dispatchEvent(new CustomEvent('Login', {detail:	{user:R.user.name}, bubbles:true, cancelable:true}));
		});
	}
	login(e)
	{
		try
		{
			const userName = U.HtmlSafe(D.loginPanel.loginUserNameElt.value);
			const password = D.loginPanel.passwordElt.value;
			const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({Username:userName, Password:password});
			const userData = {Username:userName, Pool:this.userPool};
			this.user = new AmazonCognitoIdentity.CognitoUser(userData);
			const that = this;
			e.preventDefault();		// prevent network error
			this.user.authenticateUser(authenticationDetails,
			{
				onSuccess:function(result)
				{
					this.accessToken = result.getAccessToken().getJwtToken();
					this.loggedIn = true;
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
						const fn = function()
						{
							D.panels.update();
							D.loginPanel.toggle();
							that.getUserDiagramsFromServer(function(dgrms)
							{
								if (R.default.Debug)
									console.log('login: user diagrams on server', dgrms);
							});
						}
						R.SetupUserHome(R.user.name, fn);
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
		catch(x)
		{
			D.loginPanel.errorElt.innerHTML = U.HtmlEntitySafe(x.message);
		}
	}
	logout()
	{
		this.user.signOut();
		this.loggedIn = false;
		R.user.status = 'unauthorized';
		R.user.name = 'Anon';
		R.user.email = '';
		R.user.status = 'unauthorized';
		window.dispatchEvent(new CustomEvent('Login', {detail:	{user:R.user.name}, bubbles:true, cancelable:true}));
	}
	async fetchDiagram(name, cache = true)
	{
		try
		{
			const url = this.getURL(name) + '.json';
			const response = await fetch(url, {cache: cache ? 'default' : 'reload'});
			const json = await response.json();
			R.ServerDiagrams.set(name, Diagram.GetInfo(json));
			return json;
		}
		catch(x)
		{
			return null;
		}
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
		if (R.default.debug)
			console.log('uploaded diagram size', dgrmPayload.length);
		if (dgrmPayload.length > U.uploadLimit)
		{
			D.Status(e, 'CANNOT UPLOAD!<br/>Diagram too large!');
			return;
		}
		const that = this;
		D.Svg2canvas(D.topSVG, dgrm.name, function(url, filename)
		{
			const params =
			{
				FunctionName:	'CateconIngestDiagram',
				InvocationType:	'Event',
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
				if (fn)
					fn();
			};
			that.lambda.invoke(params, handler);
		});
	}
	// entire dependency tree is fetched if need be
	fetchDiagramJsons(diagrams, fn, jsons = [], refs = {})
	{
		const someDiagrams = diagrams.filter(d => typeof d === 'string' && !R.$CAT.getElement(d));
		if (isCloud && someDiagrams.length > 0)
			Promise.all(someDiagrams.map(d => this.fetchDiagram(d))).then(fetchedJsons =>
			{
				fetchedJsons = fetchedJsons.filter(j => j);
				jsons.push(...fetchedJsons);
				fetchedJsons.map(j => {refs[j.name] = true; return true;});
				const nextRound = [];
				for (let i=0; i<fetchedJsons.length; ++i)
					nextRound.push(...fetchedJsons[i].references.filter(r => !(r in refs) && nextRound.indexOf(r) < 0));
				const filteredRound = nextRound.filter(d => typeof d === 'string' && R.$CAT.getElement(d) === null);
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
		const user = R.user.name;	// in case of delay
		this.lambda.invoke(params, function(error, data)
		{
			if (error)
			{
				D.RecordError(error);
				return;
			}
			if ('FunctionError' in data)
			{
				D.RecordError(`${data.FunctionError}: ${data.Payload}`);
				return;
			}
			const payload = JSON.parse(data.Payload);
			payload.Items.map(i => R.ServerDiagrams.set(i.name.S,
			{
				name:			i.name.S,
				basename:		i.basename.S,
				timestamp:		Number.parseInt(i.timestamp.N),
				description:	i.description.S,
				properName:		i.properName.S,
				references:		i.references.L.map(r => r.S),
				user,
			}));
			if (fn)
				fn(payload.Items);
		});
	}
}

class Navbar
{
	constructor()
	{
		this.element = document.getElementById('navbar');
		const sz = D.default.button.large;
		const left =
			H.td(H.div(D.GetButton('diagram', "Cat.D.diagramPanel.toggle()", 'Diagrams', sz))) +
			H.td(H.div(D.GetButton('category', "Cat.D.categoryPanel.toggle()", 'Categories', sz))) +
			H.td(H.div(D.GetButton('object', "Cat.D.objectPanel.toggle()", 'Objects', sz))) +
			H.td(H.div(D.GetButton('morphism', "Cat.D.morphismPanel.toggle()", 'Morphisms', sz))) +
			H.td(H.div(D.GetButton('text', "Cat.D.textPanel.toggle()", 'Text', sz))) +
			H.td(H.div(D.GetButton('string', "Cat.R.diagram.showGraphs()", 'Graph', sz)));
		const right =
			H.td(H.div(D.GetButton('cateapsis', "Cat.R.diagram.home()", 'Home', sz))) +
			H.td(H.div(D.GetButton('threeD', "Cat.D.threeDPanel.toggle()", '3D view', sz))) +
			H.td(H.div(D.GetButton('tty', "Cat.D.ttyPanel.toggle()", 'Console', sz))) +
			H.td(H.div(D.GetButton('help', "Cat.D.helpPanel.toggle()", 'Help', sz))) +
			H.td(H.div(D.GetButton('login', "Cat.D.loginPanel.toggle()", 'Login', sz))) +
			H.td(H.div(D.GetButton('settings', "Cat.D.settingsPanel.toggle()", 'Settings', sz))) +
			H.td('&nbsp;&nbsp;&nbsp;');		// TODO for weird spacing problem with navbar
		const html = H.table(H.tr(	H.td(H.table(H.tr(left), 'buttonBar'), 'w20', '', '', 'align="left"') +
									H.td(H.span('', 'navbar-inset', 'category-navbar'), 'w20') +
									H.td(H.span('Catecon', 'title'), 'w20') +
									H.td(H.span('', 'navbar-inset', 'diagram-navbar'), 'w20') +
									H.td(H.table(H.tr(right), 'buttonBar', '', '', 'align="right"'), 'w20')), 'navbarTbl');
		this.element.innerHTML = html;
		this.categoryElt = document.getElementById('category-navbar');
		this.diagramElt = document.getElementById('diagram-navbar');
		this.diagramElt.addEventListener('mouseenter', function(e)
		{
			const title = R.diagram ? `${R.diagram.htmlName()} ${H.span('by '+R.diagram.user, 'italic')}: ${U.Formal(R.diagram.description)}` : '';
			D.Status(e, title);
		}, true);
		const that = this;
		this.element.addEventListener('mouseenter', function(e){ D.mouse.onGUI = that; });
		this.element.addEventListener('mouseleave', function(e){ D.mouse.onGUI = null;});
		window.addEventListener('Login', this.updateByUserStatus);
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			if (args.command === 'select')
			{
				const diagram = args.diagram;
				that.diagramElt.innerHTML = U.HtmlEntitySafe(diagram.htmlName()) + H.span(` by ${diagram.user}`, 'italic');
				that.categoryElt.innerHTML = U.HtmlEntitySafe(diagram.codomain.htmlName());
			}
		});
	}
	updateByUserStatus()
	{
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
		D.navbar.element.style.background = c;
	}
}

class Toolbar
{
	constructor()
	{
		Object.defineProperties(this,
		{
			'diagram':		{value: null,										writable: true},
			'element':		{value: document.getElementById('toolbar'),			writable: false},
			'header':		{value: document.getElementById('toolbar-header'),	writable: false},
			'help':			{value: document.getElementById('toolbar-help'),	writable: false},
			'wasHidden':	{value:	false,										writable: true},
		});
		const that = this;
		this.element.addEventListener('mouseenter', function(e){ D.mouse.onGUI = that; });
		this.element.addEventListener('mouseleave', function(e){ D.mouse.onGUI = null;});
		this.element.addEventListener('mouseleave', function(e){ D.mouse.onGUI = null;});
		window.addEventListener('Diagram', function(e){ that.diagram = e.detail.diagram;});
		window.addEventListener('Autohide', function(e)
		{
			if (e.detail.command === 'hide')
			{
				that.wasHidden = that.element.classList.contains('hidden');
				that.hide();
			}
			else
			{
				if (!that.wasHidden)
				{
					that.reveal();
				}
			}
		});
	}
	hide()
	{
		this.element.classList.add('hidden');
	}
	reveal()
	{
		this.element.classList.remove('hidden');
	}
	show(e, loc)
	{
		if (!e || !R.diagram)		// no event so show nothing
			return;
		const element = this.element;
		this.wasHidden = element.classList.contains('hidden');
		this.reveal();
		const diagram = this.diagram;
		if (diagram.selected.length === 0)
		{
			this.hide();
			return;
		}
		this.help.innerHTML = '';
		let header = H.span(D.SvgHeader(D.default.button.small, '#ffffff') + D.svg['move'] +
			`<rect class="btn" x="0" y="0" width="320" height="320"/></svg>`, '', 'toolbar-drag-handle', 'Move toolbar');
		diagram.codomain.actions.forEach(function(a, n)
		{
			if (a.hasForm(diagram, diagram.selected))
				header += D.formButton(a.icon, `Cat.R.diagram.${'html' in a ? 'actionHtml' : 'activate'}(event, '${a.name}')`, a.description);
		});
		header += D.GetButton('close', 'Cat.D.toolbar.hide()', 'Close');
		this.header.innerHTML = H.table(H.tr(H.td(header)), 'buttonBarLeft');
		D.Drag(element, 'toolbar-drag-handle');
		this.element.style.display = 'block';
		const rect = D.topSVG.getBoundingClientRect();	// TODO use getBBox()?
		let bbox =
		{
			left:	rect.width,
			top:	rect.height,
			width:	0,
			height:	0,
		};
		diagram.selected.map(s =>
		{
			const sBbox = s.svg.getBoundingClientRect();	// TODO use getBBox()?
			bbox.left = Math.min(bbox.left, sBbox.left);
			bbox.top = Math.min(bbox.top, sBbox.top);
			bbox.width = Math.max(bbox.width, sBbox.width);
			bbox.height = Math.max(bbox.height, sBbox.height);
		});
		if (element)
		{
			let xy = D.mouse.onPanel ? diagram.diagramToUserCoords(diagram.selected[0].getXY()) : {x:e.clientX + element.clientHeight, y:e.clientY - 2 * element.clientHeight};
			if (D2.IsA(loc))
				xy = diagram.diagramToUserCoords(loc);
			else
			{
				let nuTop = xy.y;
				if (xy.y >= bbox.top && xy.y <= bbox.top + bbox.height)
					nuTop = bbox.top - element.clientHeight;
				let nuLeft = xy.x;
				if (xy.x >= bbox.left && xy.x <= bbox.left + bbox.width)
					nuLeft = bbox.left + bbox.width;
			}
			let left = rect.left + xy.x;
			left = left >= 0 ? left : 0;
			left = (left + element.clientWidth) >= window.innerWidth ? window.innerWidth - element.clientWidth : left;
			element.style.left = `${left}px`;
			let top = rect.top + xy.y;
			top = top >= 0 ? top : 0;
			top = (top + element.clientHeight) >= window.innerHeight ? window.innerHeight - element.clientHeight : top;
			element.style.top = `${top}px`;
		}
	}
}

class D
{
	static Initialize()
	{
		window.addEventListener('Diagram', D.Autohide);
		window.addEventListener('mousemove', D.Autohide);
		window.addEventListener('mousedown', D.Autohide);
		window.addEventListener('keydown', D.Autohide);
		D.ReadDefaults();
		D.navbar =			new Navbar;
		D.topSVG.addEventListener('mousemove', D.Mousemove, true);
		D.topSVG.addEventListener('mousedown', D.Mousedown, true);
		D.topSVG.addEventListener('mouseup', D.Mouseup, true);
		D.topSVG.addEventListener('drop', D.Drop, true);
		D.uiSVG.style.left = '0px';
		D.uiSVG.style.top = '0px';
		D.AddEventListeners();
		D.parenWidth = D.textWidth('(');
		D.commaWidth = D.textWidth(',&nbsp;'),
		D.bracketWidth = D.textWidth('[');
		D.diagramSVG =		document.getElementById('diagramSVG');
		D.Panel = 			Panel;
		D.panels =			new Panels;
		D.categoryPanel =	new CategoryPanel;
		D.diagramPanel =	new DiagramPanel;
		D.DiagramPanel =	DiagramPanel;
		D.helpPanel =		new HelpPanel;
		D.loginPanel =		new LoginPanel;
		D.morphismPanel =	new MorphismPanel;
		D.MorphismPanel =	MorphismPanel;
		D.objectPanel =		new ObjectPanel;
		D.ObjectPanel =		ObjectPanel;
		D.settingsPanel =	new SettingsPanel;
		D.SettingsPanel =	SettingsPanel;
		D.textPanel =		new TextPanel;
		D.TextPanel =		TextPanel;
		D.threeDPanel =		new ThreeDPanel;
		D.ttyPanel =		new TtyPanel;
		//
		D.Resize();
		window.addEventListener('resize', D.Resize);
		window.addEventListener('Diagram', D.UpdateDiagramDisplay);
		D.Autohide();
		function updateSelected(e)
		{
			const args = e.detail;
			if (args.command === 'delete')
				args.diagram.selected = args.diagram.selected.filter((r, elt) => elt.name !== args.name);
		}
		window.addEventListener('Assertion', updateSelected);
		window.addEventListener('Morphism', updateSelected);
		window.addEventListener('Object', updateSelected);
		window.addEventListener('Text', updateSelected);
	}
	static SaveDefaults()
	{
		localStorage.setItem('defaults', JSON.stringify(R.default));
	}
	static ReadDefaults()
	{
		const defaults = JSON.parse(localStorage.getItem('defaults'));
		if (defaults)
			Object.keys(defaults).map(k => R.default[k] = defaults[k]);		// merge the defaults
	}
	static Resize()
	{
		const diagram = R.diagram;
		const scale = diagram !== null ? diagram.viewport.scale : 1.0;
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
	}
	static CheckPanels()
	{
		if (D.mouse.onPanel)
			return true;
		for (const name in D.panels.panels)
			if (D.panels.panels[name].state === 'expand')
				return true;
		return false;
	}
	static Autohide()
	{
		if (D.CheckPanels())
			return;
		window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'show'}}));
		// TODO move to their own listeners
		D.openPanels.map(pnl => pnl.open());
		D.openPanels = [];
		D.navbar.element.style.opacity = "100";
		D.navbar.element.style.height = "32px";
		if (D.autohideTimer)
			clearInterval(D.autohideTimer);
		D.autohideTimer = setTimeout(function()
		{
			if (D.CheckPanels())
				return;
			for (const name in D.panels.panels)
			{
				const pnl = D.panels.panels[name];
				if (pnl.state === 'open')
				{
					D.openPanels.push(pnl);
					pnl.close();
				}
			}
			D.navbar.element.style.opacity = "0";
			D.navbar.element.style.height = "0px";
			window.dispatchEvent(new CustomEvent('Autohide', {detail:	{command:'hide'}}));
		}, D.default.autohideTimer);
	}
	static Mousedown(e)
	{
		D.mouseIsDown = true;
		D.mouse.down = new D2(e.clientX, e.clientY);	// screen coords
		const diagram = R.diagram;
		const pnt = diagram.mousePosition(e);
		if (D.mouseover)
		{
			if (!diagram.isSelected(D.mouseover) && !D.shiftKey)
				diagram.deselectAll();
			else if (D.toolbar.style.display === 'none')
				D.toolbar.show(e, D.mouseover);
			else
				D.toolbar.hide();
		}
		else
			diagram.deselectAll();
		if (e.which === 2)	// middle mouse button
		{
			D.tool = 'pan';
			diagram.initializeView();
		}
		D.dragStart = D.mouse.position();
		if (D.tool === 'pan' && !D.drag)
			D.drag = true;
	}
	static DeleteSelectRectangle()
	{
		const svg = document.getElementById('selectRect');
		if (svg)
			svg.parentNode.removeChild(svg);
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
			D.drag = D.mouseIsDown && diagram.selected.length > 0;
			const xy = diagram.mousePosition(e);
			xy.width = 2;
			xy.height = 2;
			if (D.drag && diagram.isEditable())
			{
				if (diagram.selected.length > 0)
				{
					const from = diagram.getSelected();
					if (from === D.mouseover)
						D.mouseover = null;
					const isMorphism = Morphism.IsA(from);
					if (diagram.selected.length === 1)
					{
						if (e.ctrlKey && !D.dragClone)
						{
							const isolated = from.refcnt === 1;
							if (DiagramObject.IsA(from))		// ctrl-drag identity
							{
								diagram.activate(e, 'identity');
								const id = diagram.getSelected();
								id.codomain.update(xy);
								diagram.makeSelected(e, id.codomain);	// restore from identity action
								D.dragClone = true;
							}
							else if (isMorphism)	// ctrl-drag morphism copy
							{
								diagram.activate(e, 'copy', {offset: new D2});
								D.dragClone = true;
							}
						}
						else if (D.mouse.delta().nonZero())
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
											((Morphism.IsA(D.mouseover) && Morphism.IsA(from)) ||
											(CatObject.IsA(D.mouseover) && CatObject.IsA(from))))
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
									D.Status(e, msg);
									from.updateGlow(true, 'glow');
								}
								else if (D.mouseover && !from.isFusible(D.mouseover))
									from.updateGlow(true, 'badGlow');
								else if (!fusible)
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
				}
				else
					diagram.updateFusible(e);
				D.toolbar.hide();
			}
			else if (D.mouseIsDown && !D.drag)
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
				diagram.setView(diagram.viewport.x + e.movementX, diagram.viewport.y + e.movementY, diagram.viewport.scale, false);
				D.DeleteSelectRectangle();
			}
			else
				D.DeleteSelectRectangle();
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
								diagram.deselectAll();
							}
						}
						else if (DiagramObject.IsA(from) && DiagramObject.IsA(target))
						{
							if(from.isFusible(target))
							{
								diagram.fuse(e, from, target);
								diagram.log({command:'fuse', from:from.name, target:target.name});
							}
						}
					}
					if (!DiagramText.IsA(from))
						from.updateGlow(false, '');
				}
				const elts = new Map;
				diagram.selected.map(e =>
				{
					const moved = e.finishMove();
					if (moved)
					{
						if (DiagramMorphism.IsA(e))
						{
							elts.set(e.domain.name, e.domain.getXY())
							elts.set(e.codomain.name, e.codomain.getXY())
						}
						else
							elts.set(e.name, e.getXY())
					}
				});
				const elements = [...elts];
				if (elements.length > 0)
				{
					diagram.log({command: 'move', elements});
					R.SaveLocal(diagram);
				}
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
	static Drop(e)	// from panel dragging
	{
		const diagram = R.diagram;
		if (!diagram.isEditable())
		{
			D.Status(e, 'Diagram is not editable');
			return;
		}
		try
		{
			e.preventDefault();
			D.drag = false;
			const xy = diagram.mousePosition(e);
			const name = e.dataTransfer.getData('text');
			if (name.length === 0)
				return;
			let elt = diagram.getElement(name);
			if (!elt)
			{
				elt = R.$CAT.getElement(name);		// dropping a diagram?
				if (Diagram.IsA(elt))
					D.AddReference(e, name);
			}
			else
			{
				let from = null;
				let to = null;
				if (CatObject.IsA(elt))
					diagram.placeObject(e, elt, xy);
				else if (Morphism.IsA(elt))
					diagram.placeMorphism(e, elt, xy);
			}
			diagram.update();
		}
		catch(err)
		{
			D.RecordError(err);
		}
	}
	static DownloadButton(txt, onclick, title, scale = D.default.button.small)
	{
		const html = H.span(D.SvgHeader(scale) + D.svg.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">${txt}</text>
${D.Button(onclick)}
</svg>`, '', '', title);
		return html;
	}
	static DownloadButton3(txt, onclick, title, scale = D.default.button.small)
	{
		const v = 0.32 * (typeof scale !== 'undefined' ? scale : 1.0);
		return H3.svg({title, width:`${v}in`, height:`${v}in`, viewBox:"0 0 320 320"},
			[
				H3.rect({x:0, y:0, width:320, height:320, style:'fill:white'}),
				D.svg.download3(),
				H3.text({'text-anchor':'middle', x:160, y:280, style:'font-size:120px;stroke:#000;'}, txt),
				H3.rect({class:'btn', x:0, y:0, width:320, height:320, onclick})
			]);
	}
	static GetButton(buttonName, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let btn = D.svg[buttonName];
		return D.formButton(btn, onclick, title, scale, addNew, id, bgColor)
	}
	static formButton(btn, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let button = btn;
		if (id !== null)
			button =
`<g>
<animateTransform id="${id}" attributeName="transform" type="rotate" from="0 160 160" to="360 160 160" dur="0.5s" repeatCount="1" begin="indefinite"/>
${button}
</g>`;
		return H.span(D.SvgHeader(scale, bgColor) + button + (addNew ? D.svg.new : '') + D.Button(onclick) + '</svg>', '', '', title);
	}
	static GetButton3(buttonName, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		const children = [H3.rect({x:0, y:0, width:320, height:320, style:`fill:${bgColor}`})];
		if (id)
			children.addChild(
				h3.animateTransform({id, attributeName:"transform", type:"rotate", from:"0 160 160", to:"360 160 160", dur:"0.5s", repeatCount:"1", begin:"indefinite"}));
		children.push(...D.svg[`${buttonName}3`]());
		children.push(H3.rect({class:"btn", x:"0", y:"0", width:"320", height:"320", onclick:"${onclick}"}));
		const v = 0.32 * (typeof scale !== 'undefined' ? scale : 1.0);
		return H3.svg({title, width:`${v}in`, height:`${v}in`, viewBox:"0 0 320 320"}, children);
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
		let inc = Math.log(diagram.viewport.scale)/Math.log(D.default.scale.base) + scalar;
		let nuScale = D.default.scale.base ** inc;
		nuScale = nuScale < D.default.scale.limit.min ? D.default.scale.limit.min : nuScale;
		nuScale = nuScale > D.default.scale.limit.max ? D.default.scale.limit.max : nuScale;
		const pnt = D.mouse.position();
		const dx = scalar * (1.0 - 1.0 / D.default.scale.base) * (pnt.x - diagram.viewport.x);
		const dy = scalar * (1.0 - 1.0 / D.default.scale.base) * (pnt.y - diagram.viewport.y);
		diagram.setView(diagram.viewport.x - dx, diagram.viewport.y - dy, nuScale);
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
				D.shiftKey = e.shiftKey;
				const name = `${e.ctrlKey ? 'Control' : ''}${e.shiftKey ? 'Shift' : ''}${e.altKey ? 'Alt' : ''}${e.code}`;
				if (name in D.keyboardDown)
					D.keyboardDown[name](e);
				else
				{
					// TODO look up key stroke in basenames
				}
			}
		});
		document.addEventListener('keyup', function(e)
		{
			if (e.target === document.body)
			{
				D.shiftKey = e.shiftKey;
				D.setCursor();
				const name = `${e.ctrlKey ? 'Control' : ''}${e.shiftKey ? 'Shift' : ''}${e.altKey ? 'Alt' : ''}${e.code}`;
				if (name in D.keyboardUp)
					D.keyboardUp[name](e);
			}
		});
		document.addEventListener('wheel', function(e)
		{
			if (e.target.id === 'topSVG')
			{
				D.toolbar.hide();
				R.diagram.svgTranslate.classList.remove('autohide');
				D.Zoom(e, Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY))));
				R.diagram.svgTranslate.classList.add('autohide');
			}
		}, false);
	}
	static textWidth(txt)
	{
		if (isGUI)
		{
			const safeTxt = U.HtmlEntitySafe(txt);
			if (D.textSize.has(safeTxt))
				return D.textSize.get(safeTxt);
			let svg = `<text text-anchor="middle" class="object" x="0" y="0" id="testTextWidthElt">${safeTxt}</text>`;
			D.uiSVG.innerHTML = svg;
			const txtElt = document.getElementById('testTextWidthElt');
			const width = txtElt.parentNode.getBBox().width;
			D.uiSVG.innerHTML = '';
			D.textSize.set(safeTxt, width);
			return width;
		}
		return 10;
	}
	static Status(e, msg, record = false)
	{
		const s = D.statusbar;
		if (msg === null || msg === '')
		{
			s.style.opacity = "0";
			D.statusMessage = '';
			return;
		}
		s.innerHTML = H.div(msg);
		if (typeof e === 'object')
		{
			const x = e ? e.clientX : 100;
			const y = e ? e.clientY : 100;
			s.style.left = `${x + 10}px`;
			s.style.top = `${y - 30}px`;
			s.style.display = 'block';
			D.statusXY = {x, y};
			s.classList.add('appear');
			s.style.opacity = "1";
		}
		else
			D.RecordError(msg);
		if (!D.toolbar.element.classList.contains('hidden'))
		{
			const toolbox = D.toolbar.element.getBoundingClientRect();
			const statusbox = s.getBoundingClientRect();
			if (D2.Overlap(toolbox, statusbox))
				s.style.top = toolbox.top - statusbox.height + 'px';
		}
		D.statusMessage = msg;
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
	static ShowDiagram(diagram)
	{
		diagram.svgRoot.classList.remove('hidden');
		for (let i=0; i<D.diagramSVG.children.length; ++i)
		{
			const c = D.diagramSVG.children[i];
			c.style.display = (diagram && c.id === diagram.name) ? 'block' : 'none';
		}
	}
	static ShowDiagramRoot()
	{
		D.diagramSVG.style.display = 'block';
	}
	static UpdateDiagramDisplay()
	{
		if (!R.diagram)
			return;
		R.default.diagram = R.diagram.name;
		D.SaveDefaults();
		if (!R.diagram.svgRoot)
		{
			R.diagram.makeSvg();
		}
		if ('viewport' in R.diagram)
			R.diagram.setView(R.diagram.viewport.x, R.diagram.viewport.y, R.diagram.viewport.scale, true, false);
		else
			R.diagram.home();
		D.textPanel.update();
		D.ttyPanel.update();
		D.ShowDiagram(R.diagram);
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
	static Svg2canvas(svg, name, fn)
	{
		const copy = svg.cloneNode(true);
		D.copyStyles(copy, svg);
		const canvas = document.createElement('canvas');
		canvas.width = D.snapWidth;
		canvas.height = D.snapHeight;
		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const data = (new XMLSerializer()).serializeToString(copy);
		const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
		const url = D.url.createObjectURL(svgBlob);
		const img = new Image();
		img.onload = function()
		{
			ctx.drawImage(img, D.default.panel.width, 0, window.innerWidth - 2 * D.default.panel.width, window.innerHeight, 0, 0, D.snapWidth, D.snapHeight);
			D.url.revokeObjectURL(url);
			const cargo = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
			const dgrmImg = document.getElementById(`img_${name}`);
			if (dgrmImg)
				dgrmImg.src = cargo;
			if (fn)
				fn(cargo, `${name}.png`);
		};
		img.crossOrigin = "";
		img.src = url;
	}
	static OnEnter(e, fn, that = null)
	{
		if (e.key === 'Enter')
			that ? fn.call(that, e) : fn(e);
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
`<svg xmlns="${D.xmlns}" width="${v}in" height="${v}in" version="1.1" viewBox="0 0 320 320">
<rect x="0" y="0" width="320" height="320" style="fill:${bgColor}"/>`;
		return html;
	}
	static Button(onclick)
	{
		return `<rect class="btn" x="0" y="0" width="320" height="320" onclick="${onclick}"/>`;
	}
	static Input(val, id, ph, x='', cls='in100', type='text')
	{
		return H.input(val, cls, id, type, {ph});
	}
	static Barycenter(ary)
	{
		const elts = new Set;
		for(let i=0; i < ary.length; ++i)
		{
			const elt = ary[i];
			if ((DiagramObject.IsA(elt) || DiagramText.IsA(elt)) && !(elt.name in elts))
				elts.add(elt);
			else if (DiagramMorphism.IsA(elt))
			{
				if ('bezier' in elt)
					elts.add(D.Barycenter([elt.bezier.cp1, elt.bezier.cp2]));
				else
					elts.add(D.Barycenter([elt.domain, elt.codomain]));
			}
			else if (D2.IsA(elt))
				elts.add(elt);
		}
		let xy = new D2;
		let cnt = 0;
		elts.forEach(function(e)
		{
			++cnt;
			xy.increment(e);
		});
		xy = xy.scale(1.0/cnt);
		return xy;
	}
	static testAndFireAction(e, name, ary)
	{
		const diagram = R.diagram;
		const a = diagram.codomain.getElement(name);
		a && a.hasForm(diagram, ary) && a.action(e, diagram);
	}
	static HtmlRow(m, handler)
	{
		return H.tr(
			H.td(m.htmlName()) +
			H.td(m.domain.htmlName()) +
			H.td('&rarr;') +
			H.td(m.codomain.htmlName()),				// content
			`sidenavRow`,								// class
			'',											// id
			U.Formal(m.description),						// title
			handler
		);
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
			pos3 = e.clientX;		// get the mouse cursor position at startup
			pos4 = e.clientY;
			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;
		}
		function elementDrag(e)
		{
			e = e || window.event;
			e.preventDefault();
			pos1 = pos3 - e.clientX;		// calculate the new cursor position
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;
			elt.style.top = (elt.offsetTop - pos2) + "px";		// set the element's new position
			elt.style.left = (elt.offsetLeft - pos1) + "px";
		}
		function closeDragElement()
		{
			document.onmouseup = onmouseup;
			document.onmousemove = onmousemove;
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
	static AddReference(e, name, save = true)
	{
		const diagram = R.LoadDiagram(name);
		if (diagram)
			R.diagram.addReference(name);
		else
			throw 'no reference diagram';
		D.diagramPanel.referenceSection.update();
		R.EmitDiagramEvent(diagram, 'addReference', name);
		R.diagram.update(save);
		D.Status(e, `Diagram ${diagram.htmlName()} now referenced`);
		D.diagramPanel.referenceSection.update();
		save && diagram.log({command:'addReference', diagram:diagram.name});
	}
	static RemoveReference(e, name, save = true)
	{
		const diagram = R.LoadDiagram(name);
		if (!diagram)
			throw 'no reference diagram';
		R.diagram.removeReference(name);
		D.diagramPanel.referenceSection.update();
		R.EmitDiagramEvent(diagram, 'removeReference', name);
		R.diagram.update(save);
		D.Status(e, `${diagram.htmlName()} reference removed`);
		save && diagram.log({command:'removeReference', diagram:diagram.name});
	}
	static ShowInput(name, id, factor)
	{
		const o = R.diagram.getElement(name);
		const sel = document.getElementById(id);
		const ndx = Number.parseInt(sel.value);
		const f = Array.isArray(factor) ? [...factor, ndx] : [factor, ndx];
		const divId = `dv_${o.objects[ndx].name} ${f.toString()}`;
		const elt = document.getElementById(divId);
		for (let i=0; i<elt.parentNode.children.length; ++i)
			elt.parentNode.children[i].classList.add('nodisplay');
		elt.classList.remove('nodisplay');
	}
	static Mouseover(e, name, on)
	{
		const diagram = R.diagram;
		const from = diagram.getElement(name);
		diagram.emphasis(from.name, on);
		if (on && diagram.selected.indexOf(from) >= 0 && !DiagramText.IsA(from))
			D.Status(e, from.to.description);
	}
	static Paste(e)
	{
		const diagram = R.diagram;
		const mouse = D.mouse.diagramPosition(diagram);
		const refs = diagram.getAllReferenceDiagrams();
		if (!refs.has(D.pasteDiagram.name) && diagram !== D.pasteDiagram)
		{
			D.Statua(e, `Diagram ${D.pasteDiagram.htmlName()} is not referenced by this diagram`);
			return;
		}
		const copies = D.DoPaste(e, mouse, D.pasteBuffer);
		diagram.deselectAll();
		copies.map(e => diagram.addSelected(e));
		D.toolbar.show(e, mouse);
		diagram.log({command:'paste', elements:D.pasteBuffer.map(e => e.name), xy:{x:mouse.x, y:mouse.y}});
	}
	static DoPaste(e, xy, elements, save = true)
	{
		const diagram = R.diagram;
		const base = D.Barycenter(elements);
		const pasteMap = new Map;
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
		}
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
					diagram.addSVG(copy);
					R.EmitMorphismEvent('add', copy.name);
					break;
				case 'DiagramObject':
				case 'DiagramPullback':
					copy = pasteObject(elt);
					diagram.addSVG(copy);
					R.EmitObjectEvent('add', copy.name);
					break;
				case 'DiagramText':
					const xy = D2.Add(xy, D2.Subtract(elt.getXY(), base));
					copy = new DiagramText(diagram, {xy, description:elt.description});
					diagram.addSVG(copy);
					R.EmitTextEvent('add', copy.name);
					break;
			}
			return copy;
		}
		const copies = elements.map(e => pasteElement(e));
		diagram.update(save);
		return copies;
	}
	static SetClass(cls, on, ...elts)
	{
		if (on)
			elts.map((e, i) => e.classList.add(cls));
		else
			elts.map((e, i) => e.classList.remove(cls));
	}
	static RemoveChildren(elt)
	{
		while(elt.firstChild)
			elt.removeChild(elt.firstChild);
	}
}
Object.defineProperties(D,
{
	'bracketWidth':		{value: 0,			writable: true},
	'category':			{value: null,		writable: true},
	'categoryPanel':	{value: null,		writable: true},
	'commaWidth':		{value: 0,			writable: true},
	default:
	{
		value:
		{
			arrow:		{length:150, margin:16},
			button:		{tiny:0.4, small:0.66, large:1.0},
			cell:		{
							unknown:		'&#8799;',
							composite:		'&#8797;',
							assertion:		'&#10609;',
							computed:		'&#10226;',
							named:			'&#8797;',
						},
			panel:		{width:	230},
			font:		{height:24},
			fuse:
			{
				fillStyle:	'#3f3a',
				lineDash:	[],
				lineWidth:	2,
				margin:		2,
			},
			layoutGrid:	10,
			scale:		{base:1.05, limit:{min:0.05, max:20}},
			scale3D:	1,
			stdOffset:	new D2(32, 32),
			stdArrow:	new D2(200, 0),
			autohideTimer:	30000,	// ms
			saveInterval:	5000,	// ms
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
	'helpPanel':		{value: null,		writable: true},
	'id':				{value: 0,			writable: true},
	'keyboardDown':			// keyup actions
	{
		value:
		{
			Minus(e) { D.Zoom(e, -1);},
			Equal(e) { D.Zoom(e, 1);},
			Home(e) { R.diagram.home();},
			Space(e)
			{
				R.diagram.svgTranslate.classList.remove('autohide');
				D.tool = 'pan';
				D.drag = false;
				R.diagram.update(false);
				D.setCursor();
			},
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
				D.pasteDiagram = R.diagram;
				const xy = D.mouse.position();
				D.Status({clientX:xy.x, clientY:xy.y}, 'Copied to paste buffer');
			},
			ControlKeyD(e)
			{
				D.diagramPanel.open();
				D.diagramPanel.newDiagramSection.open();
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
				D.morphismPanel.newMorphismSection.open();
				e.preventDefault();
			},
			ControlKeyO(e)
			{
				D.objectPanel.open();
				D.objectPanel.newObjectSection.open();
				e.preventDefault();
			},
			ControlKeyU(e)
			{
				D.diagramPanel.open();
				D.diagramPanel.userDiagramsSection.open();
				e.preventDefault();
			},
			ControlKeyV(e)	{	D.Paste(e);	},
			Digit0(e) { D.testAndFireAction(e, 'initialMorphism', R.diagram.selected); },
			Digit1(e) { D.testAndFireAction(e, 'terminalMorphism', R.diagram.selected); },
			ControlDigit3(e) { D.threeDPanel.toggle(); },
			Escape(e)
			{
				if (D.toolbar.element.classList.contains('hidden'))
					D.panels.closeAll();
				else
					D.toolbar.hide();
			},
			/*
			ShiftKeyC(e) { D.categoryPanel.toggle(); },
			ShiftKeyD(e) { D.diagramPanel.toggle(); },
			ShiftKeyG(e) { R.diagram.showGraphs(); },
			ShiftKeyH(e) { D.helpPanel.toggle(); },
			ShiftKeyL(e) { D.loginPanel.toggle(); },
			ShiftKeyM(e) { D.morphismPanel.toggle(); },
			ShiftKeyO(e) { D.objectPanel.toggle(); },
			ShiftKeyS(e) { D.settingsPanel.toggle(); },
			ShiftKeyT(e) { D.textPanel.toggle(); },
			ShiftKeyY(e) { D.ttyPanel.toggle(); },
			*/
			KeyT(e)
			{
				const diagram = R.diagram;
				diagram.deselectAll();
				const text = 'Lorem ipsum cateconium';
				const xy = D.Grid(D.mouse.diagramPosition(diagram));
				diagram.placeText(e, xy, text);
				diagram.log({command:'text', xy:xy.getXY(), text});
				D.textPanel.textSection.update();
			},
			Delete(e)
			{
				R.diagram && R.diagram.activate(e, 'delete');
			},
		},
		writable:	true,
	},
	'keyboardUp':
	{
		value:
		{
			Space(e)
			{
				R.diagram.svgTranslate.classList.add('autohide');
				D.tool = 'select';
				R.diagram.update(false);
				D.setCursor();
			},
		},
		writable:	true,
	},
	'loginPanel':		{value: null,		writable: true},
	'morphismPanel':	{value: null,		writable: true},
	mouse:
	{
		value:
		{
			down:		new D2,
			onPanel:	false,
			xy:			[new D2],
			position()
			{
				return this.xy[this.xy.length -1];
			},
			diagramPosition(diagram)
			{
				return diagram.userToDiagramCoords(D.mouse.position());
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
	'navbar':			{value: null,		writable: true},
	'objectPanel':		{value: null,		writable: true},
	'openPanels':		{value: [],			writable: true},
	'Panel':			{value: null,		writable: true},
	'panels':			{value: null,		writable: true},
	'pasteBuffer':		{value: [],			writable: true},
	'pasteDiagram':		{value:	null,		writable: true},
	'settingsPanel':	{value: null,		writable: true},
	'shiftKey':			{value: false,		writable: true},
	'showUploadArea':	{value: false,		writable: true},
	'snapWidth':		{value: 1024,		writable: true},
	'snapHeight':		{value: 768,		writable: true},
	'statusbar':		{value: document.getElementById('statusbar'),	writable: false},
	'statusMessage':	{value:	'',			writable: true},
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
	'textSize':			{value:	new Map,	writable: false},
	'threeDPanel':		{value: null,		writable: true},
	'tool':				{value: 'select',	writable: true},
	'toolbar':			{value: new Toolbar,							writable: false},
	'topSVG':			{value: document.getElementById('topSVG'),		writable: false},
	'ttyPanel':			{value: null,									writable: true},
	'uiSVG':			{value: document.getElementById('uiSVG'),		writable: false},
	'xmlns':			{value: 'http://www.w3.org/2000/svg',			writable: false},
	'svg':
	{
		value:
		{
add:
`<line class="arrow0" x1="160" y1="80" x2="160" y2="240"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160"/>`,
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
delete3()
{
	return [H3.line({class:"arrow0", x1:"160", y1:"40", x2:"160", y2:"230", 'marker-end':"url(#arrowhead)"}),
			H3.path({class:"svgfilNone svgstr1", d:"M90,190 A120,50 0 1,0 230,190"})];
},
diagram:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
downcloud:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="160" y1="160" x2="160" y2="300" marker-end="url(#arrowhead)"/>`,
download:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="160" marker-end="url(#arrowhead)"/>`,
download3()
{
	return H3.line({class:'arrow0', x1:160, y1:40, x2:160, y2:160, 'marker-end':'url(#arrowhead)'});
},
edit:
`<path class="svgstr4" d="M280 40 160 280 80 240" marker-end="url(#arrowhead)"/>`,
functor:
`<line class="arrow0" x1="40" y1="40" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>`,
help:
`<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,120 C100,40 280,40 210,120 S170,170 160,200"/>`,
io:
`
	<line class="arrow0" x1="100" y1="160" x2="220" y2="160" marker-end="url(#arrowhead)"/>
	<polygon points="0 0, 120 160, 0 320" fill="url(#radgrad1)"/>
	<polygon points="320 0, 200 160, 320 320" fill="url(#radgrad1)"/>
`,
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
<marker id="arrowheadWide" viewBox="0 -20 60 140" refX="50" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
<path class="svgstr4" d="M0 0 L80 50 L10 100"/>
</marker>
<line class="arrow0" x1="60" y1="160" x2="260" y2="160" marker-end="url(#arrowhead)"/>`,
move:
`<line class="svgfilNone arrow0-30px" x1="60" y1="80" x2="240" y2="80" />
<line class="svgfilNone arrow0-30px" x1="60" y1="160" x2="240" y2="160" />
<line class="svgfilNone arrow0-30px" x1="60" y1="240" x2="240" y2="240" />`,
new:
`<circle class="svgstr3" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
object:
`<circle cx="160" cy="160" r="160" fill="url(#radgrad1)"/>`,
play:
//`<polygon fill="black" points="60,60 220,160 60,260"/>`,
`<text text-anchor="middle" x="160" y="260" style="font-size:240px;stroke:#000;">&#9654;</text>`,
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
save:
`<text text-anchor="middle" x="160" y="260" style="font-size:240px;stroke:#000;">&#128190;</text>`,
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
table:
`<circle cx="80" cy="80" r="60" fill="url(#radgrad2)"/>
<circle cx="80" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="80" cy="240" r="60" fill="url(#radgrad2)"/>
<circle cx="160" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="80" r="60" fill="url(#radgrad2)"/>
<circle cx="240" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="240" r="60" fill="url(#radgrad2)"/>`,
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
`<line class="arrow0" x1="40" y1="40" x2="280" y2="280" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="280" x2="280" y2="40" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<rect class="svgfil5" x="120" y="120" width="80" height="80"/>`,
upload:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="160" y1="300" x2="160" y2="160" marker-end="url(#arrowhead)"/>`,
view:
`<circle cx="160" cy="160" r="120" fill="url(#radgrad1)"/>
<path class="svgfilNone svgstrThinGray" d="M20 160 A40 25 0 0 0 300 160 A40 25 0 0 0 20 160" marker-end="url(#arrowheadWide)"/>
`,
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
	update()
	{
		for (const [name, panel] of Object.entries(this.panels))
			panel.update();
	}
	resize()
	{
		for (const [name, panel] of Object.entries(this.panels))
			panel.resize();
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
		return `${this.section.id} ${name}`;
	}
	toggle()
	{
		this.elt.classList.toggle('active');
		if (this.section.style.display === 'block')
			this.section.style.display = 'none';
		else
		{
			this.section.style.display = 'block';
			this.update();
		}
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
		return true;
	}
	static Html(header, action, panelId, title = '', buttonId = '')
	{
		return H.button(header, 'sidenavSection', buttonId, title, `onclick="${action};Cat.D.Panel.SectionToggle(this, \'${panelId}\')"`) +
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
		this.elt.addEventListener('mouseenter', function(e){ D.mouse.onPanel = true; });
		this.elt.addEventListener('mouseleave', function(e){ D.mouse.onPanel = false; console.log('panel lost mouse!');});
		const that = this;
		this.elt.addEventListener('mouseenter', function(e){ D.mouse.onGUI = that; });
		this.elt.addEventListener('mouseleave', function(e){ D.mouse.onGUI = null;});
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
		this.expandBtnElt.innerHTML = D.GetButton(this.right ? 'chevronLeft' : 'chevronRight', `Cat.D.${this.name}Panel.expand()`, 'Collapse');
		this.state = 'open';
	}
	closeBtnCell()
	{
		return H.td(D.GetButton('close', `Cat.D.${this.name}Panel.close()`, 'Close'), 'buttonBar');
	}
	expand(exp = 'auto')
	{
		this.elt.style.width = exp;
		D.panels.closeAll(this);
		this.expandBtnElt.innerHTML = D.GetButton(this.right ? 'chevronRight' : 'chevronLeft', `Cat.D.${this.name}Panel.collapse()`, 'Expand');
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
		return H.td(D.GetButton(this.right ? 'chevronLeft' : 'chevronRight', `Cat.D.${this.name}Panel.expand()`, 'Expand'), 'buttonBar', `${this.name}-expandBtn`);
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
		return H.button(U.HtmlEntitySafe(header), 'sidenavSection', buttonId, U.HtmlEntitySafe(title), `onclick="${action};Cat.D.Panel.SectionToggle(this, \'${panelId}\')"`) +
				H.div('', 'section', panelId);
	}
}

class NewCategorySection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'category-new-section', 'Create new category');
		const categoryActions = [];
		R.$CAT.getElement('category').elements.forEach(function(a) { categoryActions.push(U.DeCamel(a.htmlName())); });
		const productActions = [];
		R.$CAT.getElement('product').elements.forEach(function(a) { productActions.push(U.DeCamel(a.htmlName())); });
		const coproductActions = [];
		R.$CAT.getElement('coproduct').elements.forEach(function(a) { coproductActions.push(U.DeCamel(a.htmlName())); });
		const homActions = [];
		R.$CAT.getElement('hom').elements.forEach(function(a) { homActions.push(U.DeCamel(a.htmlName())); });
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
			this.categories.forEach(function(category)
			{
				if (this.filterFn(category))
					rows += this.categoryRow(category, this.updateFn(category));
			}, this);
			this.section.innerHTML = H.table(rows);
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
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarRight') +
			H.h3(H.span('Category')) +
			H.h4(H.span('', '', 'category-basename') + H.span('', '', 'category-basename-edit')) +
			H.h4(H.span('', '', 'category-properName') + H.span('', '', 'category-properName-edit')) +
			H.p(H.span('', 'description', 'category-description', 'Description') + H.span('', '', 'category-description-edit')) +
			H.p(H.span('Actions: ', 'smallBold') + H.span('', 'left', 'category-actions')) +
			H.p('User: ' + H.span('', '', 'category-user', 'User'), 'description');
		this.categorySection = new CategorySection('Categories', this.elt, 'category-all-section', 'All available categories');
		this.newCategorySection = new NewCategorySection(this.elt);
		this.basenamelt = document.getElementById('category-basename');
		this.properNameElt = document.getElementById('category-properName');
		this.properNameEditElt = document.getElementById('category-properName-edit');
		this.descriptionElt = document.getElementById('category-description');
		this.descriptionEditElt = document.getElementById('category-description-edit');
		this.actionsElt = document.getElementById('category-actions');
		this.userElt = document.getElementById('category-user');
		this.category = R.category;
		this.initialize();
	}
	update()
	{
		this.newCategorySection.update();
		this.categorySection.update();
		if (R.category && this.category !== R.category)
		{
			this.category = R.category;
			this.properNameElt.innerHTML = this.category.htmlName();
			this.descriptionElt.innerHTML = this.category.description;
			this.userElt.innerHTML = this.category.user;
			const isEditable = this.category.isEditable();
			this.properNameEditElt.innerHTML = isEditable ?
				// TODO editElementText cannot work
				D.GetButton('edit', `Cat.D.categoryPanel.setProperName('category-properName')`, 'Retitle', D.default.button.tiny) : '';
			this.descriptionEditElt.innerHTML = isEditable ?
				D.GetButton('edit', `Cat.D.categoryPanel.setDescription()`, 'Edit description', D.default.button.tiny) : '';
			const actions = [];
			this.category.actions.forEach(function(a) { actions.push(U.DeCamel(a.htmlName())); });
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
		this.elt.innerHTML = H.table(
								H.tr(
									this.closeBtnCell() +
									this.expandPanelBtn() +
									H.td(D.GetButton('delete', "Cat.D.threeDPanel.initialize()", 'Clear display'), 'buttonBar') +
									H.td(D.GetButton('threeD_left', "Cat.D.threeDPanel.view('left')", 'Left'), 'buttonBar') +
									H.td(D.GetButton('threeD_top', "Cat.D.threeDPanel.view('top')", 'Top'), 'buttonBar') +
									H.td(D.GetButton('threeD_back', "Cat.D.threeDPanel.view('back')", 'Back'), 'buttonBar') +
									H.td(D.GetButton('threeD_right', "Cat.D.threeDPanel.view('right')", 'Right'), 'buttonBar') +
									H.td(D.GetButton('threeD_bottom', "Cat.D.threeDPanel.view('bottom')", 'Bottom'), 'buttonBar') +
									H.td(D.GetButton('threeD_front', "Cat.D.threeDPanel.view('front')", 'Front'), 'buttonBar')
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
			const url = window.location.origin + window.location.pathname;
			const index = url.indexOf('index.html');
			if (index !== -1)
				url = url.substring(0, index);
			const that = this;
			R.LoadScript(url + '/js/three.min.js', function()
			{
				R.LoadScript(url + '/js/OrbitControls.js', function()
				{
					that.shapeGeometry = new THREE.BoxBufferGeometry(D.default.scale3D, D.default.scale3D, D.default.scale3D);
					that.bbox =
					{
						min:{x:Number.POSITIVE_INFINITY, y:Number.POSITIVE_INFINITY, z:Number.POSITIVE_INFINITY},
						max:{x:Number.NEGATIVE_INFINITY, y:Number.NEGATIVE_INFINITY, z:Number.NEGATIVE_INFINITY}
					};
					const properties = window.getComputedStyle(that.display, null);
					let width = parseInt(properties.width, 10);
					width = width === 0 ? D.default.panel.width : width;
					const height = parseInt(properties.height, 10);
					that.camera = new THREE.PerspectiveCamera(70, width / height, 1, 2 * that.horizon);
					that.scene = new THREE.Scene();
					that.scene.background = new THREE.Color().setHSL(0.6, 0, 1);
					const horizon = 100000;
					const fogDistance = that.horizon/2;
					that.scene.fog = new THREE.Fog(that.scene.background, 1, fogDistance);
					const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
					hemiLight.color.setHSL(0.6, 1, 0.6);
					hemiLight.groundColor.setHSL(0.095, 1, 0.74);
					hemiLight.position.set(0, 50, 0);
					that.scene.add(hemiLight);
					const groundGeo = new THREE.PlaneBufferGeometry(that.horizon, that.horizon );
					const groundMat = new THREE.MeshPhongMaterial({color: 0xffffff, specular: 0x050505});
					groundMat.color.set(0xf0e68c);
					const ground = new THREE.Mesh(groundGeo, groundMat);
					ground.rotation.x = -Math.PI/2;
					that.scene.add(ground);
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
					const skyGeo = new THREE.SphereBufferGeometry( that.horizon, 32, 15 );
					const skyMat = new THREE.ShaderMaterial({vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
					const sky = new THREE.Mesh(skyGeo, skyMat);
					that.scene.add(sky);
					let light = new THREE.DirectionalLight(0xffffff, 1);
					light.position.set(-1, 1, -1).normalize();
					light.position.multiplyScalar(30);
					that.scene.add(light);
					that.scene.add(new THREE.AxesHelper(that.axesHelperSize));
					that.raycaster = new THREE.Raycaster();
					that.renderer = new THREE.WebGLRenderer({antialias:true});
					that.renderer.setPixelRatio(window.devicePixelRatio);
					that.resizeCanvas();
					that.controls = new THREE.OrbitControls(that.camera, that.renderer.domElement);
					if (that.display.children.length > 0)
						that.display.removeChild(that.display.children[0]);
					that.display.appendChild(that.renderer.domElement);
					that.renderer.gammaInput = true;
					that.renderer.gammaOutput = true;
					that.renderer.shadowMap.enabled = true;
					that.view('front');
					that.animate();
					that.initialized = true;
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
		this.expandBtnElt.innerHTML = D.GetButton('chevronRight', `Cat.D.threeDPanel.collapse(true)`, 'Expand');
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
		const curve = new THREE.QuadraticBezierCurve3( new THREE.Vector3(from[0], from[1], from[2]), new THREE.Vector3(mid[0], mid[1], mid[2]), new THREE.Vector3(to[0], to[1], to[2]));
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
		const html = H.table(H.tr(
						H.td(D.GetButton('delete', 'Cat.R.diagram.clearLog(event)', 'Clear log'), 'buttonBar') +
						H.td(D.DownloadButton('LOG', 'Cat.R.diagram.downloadLog(event)', 'Download log'), 'buttonBar') +
						H.td(D.GetButton('play', 'Cat.D.ttyPanel.logSection.replayLog(event)', 'Play log file'), 'buttonBar') +
						H.td(D.GetButton('save', `Cat.R.SaveLocal(Cat.R.diagram);Cat.D.Status(event, 'Diagram saved')`, 'Save diagram'), 'buttonBar')
					), 'buttonBarLeft') +
					(R.default.internals ? H.button('&#9656;&nbsp; Clear Diagram', 'clickable', '', '', 'onclick="Cat.R.diagram.clear(event)"') : '') +
					H.hr();
		this.section.innerHTML = html;
		const that = this;
		window.addEventListener('Login', function(e) { that.update(); });
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
			if (this.diagram !== R.diagram)
			{
				this.diagram = R.diagram;
				if (this.logElt)
					this.section.removeChild(this.logElt);
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
		let html = R.default.internals ? (R.ReplayCommands.has(args.command) ?
			D.GetButton('play', `Cat.D.ttyPanel.logSection.replayCommand(event, ${this.logElt.childElementCount})`) : '') +
			D.GetButton('delete', `Cat.D.ttyPanel.logSection.removeLogCommand(event, ${this.logElt.childElementCount})`) : '';
		const line = R.diagram.prettifyCommand(args);
		html += U.HtmlEntitySafe(line);
		elt.innerHTML = html;
		this.logElt.appendChild(elt);
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
			D.Status(e, x);
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
		D.Status(e, msg);
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
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('TTY') +
			H.button('Output', 'sidenavAccordion', '', 'TTY output from some composite', `onclick="Cat.D.Panel.SectionToggle(this, \'tty-out-section\')"`) +
			H.div(
				H.table(H.tr(
					H.td(D.GetButton('delete', `Cat.D.ttyPanel.out.innerHTML = ''`, 'Clear output'), 'buttonBar') +
					H.td(D.DownloadButton('LOG', `Cat.D.DownloadString(Cat.D.ttyPanel.out.innerHTML, 'text', 'console.log')`, 'Download tty log file'), 'buttonBar')), 'buttonBarLeft') +
				H.pre('', 'tty', 'tty-out'), 'section', 'tty-out-section') +
			H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="Cat.D.Panel.SectionToggle(this, \'tty-error-section\')"`) +
			H.div(H.table(H.tr(
					H.td(D.GetButton('delete', `Cat.D.ttyPanel.error.innerHTML = ''`, 'Clear errors')) +
					H.td(D.DownloadButton('ERR', `Cat.D.DownloadString(Cat.D.ttyPanel.error.innerHTML, 'text', 'console.err')`, 'Download error log file'), 'buttonBar')), 'buttonBarLeft') +
				H.span('', 'tty', 'tty-error-out'), 'section', 'tty-error-section');
		this.initialize();
		this.out = document.getElementById('tty-out');
		this.error = document.getElementById('tty-error-out');
		this.logSection = new LogSection(this.elt);
	}
	toOutput(s)
	{
		this.out.innerHTML += U.HtmlSafe(s) + '\n';
	}
	update()
	{
		this.logSection.update();
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
						{
							ph: 'Description',
							x:'onkeydown="Cat.D.OnEnter(event, Cat.D.diagramPanel.newDiagramSection.create, Cat.D.diagramPanel.newDiagramSection)"'
						})), 'sidenavRow')) +
					H.tr(H.td(H.span('Target category', 'smallPrint') + H.select('', 'w100', 'diagram-new-codomain')), 'sidenavRow') +
			H.span(D.GetButton('edit', 'Cat.D.diagramPanel.newDiagramSection.create(event)', 'Create new diagram')) +
			H.span('', 'error', 'diagram-new-error');
		this.error = document.getElementById('diagram-new-error');
		this.basenameElt = document.getElementById('diagram-new-basename');
		this.properNameElt = document.getElementById('diagram-new-properName');
		this.descriptionElt = document.getElementById('diagram-new-description');
		this.codomainElt = document.getElementById('diagram-new-codomain');
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
			this.codomainElt.value = '';
			let categories = '';
			for (const [name, e] of R.$CAT.elements)
				if (Category.IsA(e) && !IndexCategory.IsA(e) && e.user !== 'sys')
					categories += H.option(e.htmlName(), e.name, e.basename === 'Cat');
			this.codomainElt.innerHTML = categories;
		}
	}
	create(e)
	{
		try
		{
			const basename = U.HtmlSafe(this.basenameElt.value);
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
			R.EmitDiagramEvent(diagram, 'load');
			R.AddDiagram(diagram);
			R.SelectDiagram(diagram.name);
			diagram.update();
			diagram.makeSvg();
			diagram.home();
			diagram.svgRoot.classList.remove('hidden');
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
	constructor(title, parent, id, tip)
	{
		super(title, parent, id, tip);
		Object.defineProperties(this,
		{
			catalog:					{value:H3.div(),									writable: false},
		});
		this.catalog.classList.add('catalog');
		this.section.appendChild(this.catalog);
	}
	add(diagram, btns = [])
	{
		const dt = new Date(diagram.timestamp);
		let src = this.getPng(diagram.name);
		if (!src && R.cloud)
			src = R.cloud.getURL(diagram.user, diagram.basename + '.png');
		const elt = H3.div({class:'grabbable', id:this.getId(diagram.name)},
			H3.table(
			[
				H3.tr(
				[
					H3.td(H3.h4(U.HtmlEntitySafe(diagram.properName))),
					H3.td(
						[
							...btns,
							D.DownloadButton3('JSON', `Cat.R.LoadDiagram('${diagram.name}').downloadJSON(event)`, 'Download JSON'),
							D.DownloadButton3('JS', `Cat.R.LoadDiagram('${diagram.name}').downloadJS(event)`, 'Download Javascript'),
							D.DownloadButton3('PNG', `Cat.R.LoadDiagram('${diagram.name}').downloadPNG(event)`, 'Download PNG'),
						], {class:'right'}),
				]),
				H3.tr(H3.td({class:'white', colspan:2}, H3.a({onclick:`Cat.D.diagramPanel.collapse();Cat.R.SelectDiagram('${diagram.name}')`},
															H3.img({src, id:"img_${diagram.name}", alt:"Not loaded", width:"200", height:"150"})))),
				H3.tr(H3.td({description:U.HtmlEntitySafe(diagram.description), colspan:2})),
				H3.tr([H3.td(diagram.user, {class:'author'}), H3.td(dt.toLocaleString(), {class:'date'})], {class:'diagramSlot'}),
			],
			{class:'grabbable', draggable:true, ondragstart:`"Cat.D.DragElement(event, '${diagram.name}')"`}));
		this.catalog.appendChild(elt);
	}
	getPng(name)
	{
		let png = D.diagramPNG.get(name);
		if (!png)
		{
			png = localStorage.getItem(`${name}.png`);
			if (png)
				D.diagramPNG.set(name, png);
		}
		return png;
	}
	remove(name)
	{
		const elt = document.getElementById(this.getId(name));
		elt && elt.parent.removeChild(elt);
	}
}

class ReferenceDiagramSection extends DiagramSection
{
	constructor(parent)
	{
		super('Reference Section', parent, 'diagram-reference-section', 'Diagrams referenced by this diagram');
		const that = this;
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'addReference':
					const ref = R.$CAT.getElement(args.name);
					that.add(ref);
					break;
				case 'removeReference':
					that.remove(args.name);
					break;
				case 'select':
					D.RemoveChildren(that.catalog);
					R.diagram.references.forEach(function(ref) {that.add(ref);});
					break;
			}
		});
	}
	add(diagram)
	{
		super.add(diagram, [D.GetButton3('delete', `Cat.D.RemoveReference(event,'${diagram.name}')`, 'Remove reference diagram')]);
	}
}

class UserDiagramSection extends DiagramSection
{
	constructor(parent)
	{
		super('User Diagrams', parent, 'diagram-user-section', 'Diagrams referenced by this diagram');
		const that = this;
		window.addEventListener('Login', function(e)
		{
			D.RemoveChildren(that.catalog);
			const userDiagrams = new Map;
			function addem(d)
			{
				if (userDiagrams.has(d.name) || d.user !== R.user.name || d.basename === R.user.name)
					return;
				userDiagrams.set(d.name, d);
				that.add(d);
			};
			R.Diagrams.forEach(addem);
			R.ServerDiagrams.forEach(addem);
		});
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'new':
					const ref = R.$CAT.getElement(args.name);
					if (args.diagram.user === R.user.name)
						that.add(ref);
					break;
				case 'load':
					if (args.diagram.user === R.user.name)
						that.add(diagram);
					break;
			}
		});
	}
}

class CatalogDiagramSection extends DiagramSection
{
	constructor(parent)
	{
		super('Catalog', parent, 'diagram-all-section', 'Catalog of available diagram');
		const that = this;
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'new':
					const ref = R.$CAT.getElement(args.name);
					that.add(ref);
					break;
				case 'load':
					that.add(diagram);
					break;
			}
		});
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
			if (args.command === 'add')
				D.diagramPanel.assertionSection.addAssertion(args.diagram, args.assertion);
			else if (args.command === 'delete')
			{
				const elt = document.getElementById(`assertion ${args.name}`);
				elt.parentNode.removeChild(elt);
			}
		});
		this.assertions = H3.div({class:'catalog'});
		this.section.appendChild(this.assertions);
		const that = this;
		function updateAssertions(e)
		{
			const diagram = e.detail.diagram;
			const cmd = e.detail.command;
			switch(cmd)
			{
				case 'new':
					break;
			}
			D.RemoveChildren(that.assertions);
			diagram.assertions.forEach(function(a) { that.addAssertion(R.diagram, a); });
		}
		window.addEventListener('Diagram', updateAssertions);
	}
	addAssertion(diagram, assertion)
	{
		const canEdit = diagram.isEditable();
		const delBtn = H3.span(canEdit ? D.GetButton('delete', `Cat.D.diagramPanel.assertionSection.deleteAssertion('${assertion.name}')`, 'Delete assertion') : '');
		const viewBtn = H3.span(D.GetButton('view', `Cat.R.diagram.viewElements('${assertion.name}')`, 'View assertion'));
		const desc = H.span(assertion.description, '', `a_${assertion.name}`) +
							(canEdit ? D.GetButton('edit', `Cat.R.diagram.editElementText(event, '${assertion.name}', 'a_${assertion.name}', 'description')`, 'Edit') : '');
		const div = H3.div({class:'right', id:`assertion ${assertion.name}`},
				[
					viewBtn, delBtn,
					H3.table(	[H3.tr([H3.td({}, H3.table(assertion.left.map(m => H3.tr(H3.td(m.to.properName))))),
										H3.td(H3.table(assertion.right.map(m => H3.tr(H3.td(m.to.properName)))))]),
								H3.tr(H3.td(desc, {colspan:2}))]
					, {class:'panelElt'})
				]);
		const sig = assertion.signature;
		div.addEventListener('mouseenter', function(e) { Cat.R.diagram.emphasis(sig, true);});
		div.addEventListener('mouseleave', function(e) { Cat.R.diagram.emphasis(sig, false);});
		div.addEventListener('mousedown', function(e) { Cat.R.diagram.pickElement(event, sig);});
		this.assertions.appendChild(div);
	}
	deleteAssertion(name)
	{
		const a = R.diagram.assertions.get(name);
		if (a)
		{
			R.EmitAssertionEvent('delete', a.name);
			a.decrRefcnt();
			R.diagram.update();
		}
	}
}

class DiagramPanel extends Panel
{
	constructor()
	{
		super('diagram');
		this.elt.innerHTML =
			H.div('', '', 'diagramPanelToolbar') +
			H.h3(H.span('Diagram')) +
			H.h4(H.span('', '', 'diagram-category')) +
			H.h4(H.span('', '', 'diagram-basename') + H.span('', '', 'diagram-basename-edit')) +
			H.h4(H.span('', '', 'diagram-properName') + H.span('', '', 'diagram-properName-edit')) +
			H.p(H.span('', 'description', 'diagram-description', 'Description') + H.span('', '', 'diagram-description-edit')) +
			H.table(H.tr(H.td('By '+ H.span('', '', 'diagram-user'), 'smallPrint') + H.td(H.span('', '', 'diagram-timestamp'), 'smallPrint')));
		this.newDiagramSection = new NewDiagramSection(this.elt);
		this.assertionSection = new AssertionSection(this.elt);
		this.referenceSection = new ReferenceDiagramSection(this.elt);
		this.userDiagramSection = new UserDiagramSection(this.elt);
		this.catalogSection = new CatalogDiagramSection(this.elt);
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
			user:						{value: R.user.name,										writable: true},
		});
		const that = this;
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'new':
					break;
				case 'select':
					that.categoryElt.innerHTML = diagram.codomain.htmlName();
					that.properNameElt.innerHTML = diagram.htmlName();
					that.descriptionElt.innerHTML = diagram.description;
					that.userElt.innerHTML = diagram.user;
					that.properNameEditElt.innerHTML = !diagram.isEditable() ? '' :
						D.GetButton('edit', `Cat.D.diagramPanel.setProperName('diagram-properName')`, 'Retitle', D.default.button.tiny);
					that.descriptionEditElt.innerHTML = !diagram.isEditable() ? '' :
						D.GetButton('edit', `Cat.D.diagramPanel.setDescription()`, 'Edit description', D.default.button.tiny);
					that.setToolbar(diagram);
					const dt = new Date(diagram.timestamp);
					that.timestampElt.innerHTML = dt.toLocaleString();
					break;
				case 'addReference':
					break;
				case 'removeReference':
					break;
			}
		});
	}
	update()
	{
		debugger;
	}
	setProperName()
	{
		const diagram = R.diagram;
		if (diagram.isEditable() && this.properNameElt.contentEditable === 'true' && this.properNameElt.textContent !== '')
		{
			diagram.properName = this.properNameElt.innerText;
			this.properNameElt.contentEditable = false;
			R.SaveLocal(diagram);
		}
		else
		{
			this.properNameElt.contentEditable = true;
			this.properNameElt.focus();
		}
	}
	setDescription()
	{
		const diagram = R.diagram;
		if (diagram.isEditable() && this.descriptionElt.contentEditable === 'true' && this.descriptionElt.textContent !== '')
		{
			R.diagram.description = this.descriptionElt.textContent;
			this.descriptionElt.contentEditable = false;
			R.SaveLocal(diagram);
		}
		else
		{
			this.descriptionElt.contentEditable = true;
			this.descriptionElt.focus();
		}
	}
	setToolbar(diagram)
	{
		if (!diagram)
			return;
		const isUsers = diagram && (R.user.name === diagram.user);
		const uploadBtn = (R.cloud && isUsers) ? H.td(D.GetButton('upload', 'Cat.R.diagram.upload(event)', 'Upload to cloud', D.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '';
		let downcloudBtn = '';
		if (R.diagram.refcnt <= 0 && R.cloud && R.ServerDiagrams.has(diagram.name))
		{
			const data = R.ServerDiagrams.get(diagram.name);
			if (diagram.timestamp !== data.timestamp)
			{
				const date = new Date(data.timestamp);
				const tip = R.ServerDiagrams.get(diagram.name).timestamp > diagram.timestamp ? `Download newer version from cloud: ${date.toLocaleString()}` : 'Download older version from cloud';
				downcloudBtn = H.td(D.GetButton('downcloud', 'Cat.R.ReloadDiagramFromServer()', tip, D.default.button.small, false, 'diagramDowncloudBtn'), 'buttonBar');
			}
		}
		const html = H.table(H.tr(
					(isUsers ? H.td(DiagramPanel.GetLockBtn(diagram), 'buttonBar', 'lockBtn') : '') +
					downcloudBtn +
					uploadBtn +
					H.td(D.DownloadButton('JSON', 'Cat.R.diagram.downloadJSON(event)', 'Download JSON'), 'buttonBar') +
					H.td(D.DownloadButton('JS', 'Cat.R.diagram.downloadJS(event)', 'Download Javascript'), 'buttonBar') +
					H.td(D.DownloadButton('PNG', 'Cat.R.diagram.downloadPNG(event)', 'Download PNG'), 'buttonBar') +
					this.expandPanelBtn() +
					this.closeBtnCell()), 'buttonBarRight');
		this.diagramPanelToolbarElt.innerHTML = html;
		this.initialize();
	}
	expand()
	{
		super.expand("100%");
	}
	fetchRecentDiagrams()
	{
		R.cloud && fetch(R.cloud.getURL() + '/recent.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
return;	// TODO
/*
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
							return `<img class="intro" src="${R.cloud.getURL(d.user, d.name)}.png" width="300" height="225" title="${d.properName} by ${d.user}: ${d.description}"/>`;
						}).join('');
*/
				});
		});
	}
	/* TODO unused but use it?
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
	*/
	static GetLockBtn(diagram)
	{
		const lockable = diagram.readonly ? 'unlock' : 'lock';
		return D.GetButton(lockable, `Cat.R.diagram.${lockable}(event)`, U.Formal(lockable));
	}
	static UpdateLockBtn(diagram)
	{
		if (diagram && R.user.name === diagram.user)
			document.getElementById('lockBtn').innerHTML = DiagramPanel.GetLockBtn(diagram);
	}
	static SetupDiagramElementPnl(diagram, pnl, updateFnName)
	{
		const pnlName = diagram.name + pnl;
		return Panel.SectionPanelDyn(diagram.properName, `${updateFnName}(R.$CAT.getElement('${diagram.name}'))`, pnlName);
	}
}

class HelpPanel extends Panel
{
	constructor()
	{
		super('help', true)
		const date = '04/11/2020 00:00:01 AM';
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('Catecon') +
			H.h4('The Categorical Console')	+
			H.p(H.small('Level 1', 'smallCaps italic'), 'txtCenter') +
			H.p(H.small(`Deployed ${date}`, 'smallCaps'), 'txtCenter') + H.br() +
			H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Interactive actions', `onclick="Cat.D.Panel.SectionToggle(this, \'catActionHelpPnl\')"`) +
			H.div(	H.h4('Mouse Actions') +
					H.h5('Select') +
						H.p('Select an object or a morphism with the mouse by left-clicking on the element.  Previously selected objects are unselected.') +
					H.h5('Region Select') +
						H.p('Click the mouse button, then drag without releasing to cover some elements, and then release to select those elements.') +
					H.h5('Multi-Select With Shift Click') +
						H.p('Shift left mouse click to add another element to the select list') +
					H.h5('Control Drag') +
						H.p('Left click with the mouse on an object with the Ctrl key down and then drag to create an identity morphism for that object.') +
						H.p('Doing the same with a morphism makes a copy of the morphism.') +
					H.h5('Mouse Wheel') +
						H.p('Use the mouse wheel to zoom in and out.') +
					H.h4('Key Actions') +
					H.h5('Delete') +
						H.p('Selected objects or morphisms are deleted.  Some elements cannot be deleted if they are referred to by another element.') +
					H.h5('Escape') +
						H.p('Dismiss toolbar and side panels.') +
					H.h5('Spacebar') +
						H.p('Press the spacebar and move the mouse to pan the view.') +
					H.h5('Home') +
						H.p('Return to the home view.') +
					H.h5('D') +
						H.p('Toggle the diagram panel.') +
					H.h5('F') +
						H.p('Place the floating point number object if it exists.') +
					H.h5('H') +
						H.p('Toggle the help panel.') +
					H.h5('L') +
						H.p('Toggle the login panel.') +
					H.h5('M') +
						H.p('Toggle the morphism panel.') +
					H.h5('N') +
						H.p('Place the natural number object if it exists.') +
					H.h5('O') +
						H.p('Toggle the object panel.') +
					H.h5('s') +
						H.p('Toggle the settings panel.') +
					H.h5('S') +
						H.p('Place the string object if it exists.') +
					H.h5('Y') +
						H.p('Toggle the tty panel.') +
					H.h5('Z') +
						H.p('Place the integers object if it exists.') +
					H.h5('3') +
						H.p('Toggle the 3D panel.') +
					H.h5('Control-A') +
						H.p('Select all elements.') +
					H.h5('Control-C') +
						H.p('Copy elements into the paste buffer.') +
					H.h5('Control-V') +
						H.p('Paste elements from the paste buffer.')
					, 'section', 'catActionHelpPnl') +
			H.button('Category Theory', 'sidenavAccordion', 'catHelpPnlBtn', 'References', `onclick="Cat.D.Panel.SectionToggle(this, \'catHelpPnl\')"`) +
			H.div(
				H.small('All of mathematics is divided into one part: Category Theory', '') +
				H.h4('References') +
				H.p(H.a('"Categories For The Working Mathematician"', 'italic', '', '', 'href="https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician" target="_blank"')), 'section', 'catHelpPnl') +
			H.button('Articles', 'sidenavAccordion', 'referencesPnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(this, \'referencesPnl\')"`) +
			H.div(	H.p(H.a('Intro To Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/09/16/cat-prog/"')) +
					H.p(H.a('V Is For Vortex - More Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"')), 'section', 'referencesPnl') +
			H.button('Terms and Conditions', 'sidenavAccordion', 'TermsPnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(this, \'TermsPnl\')"`) +
			H.div(	H.p('No hate.'), 'section', 'TermsPnl') +
			H.button('License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(this, \'licensePnl\')"`) +
			H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
					H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
					H.p('Inelegant or unreferenced diagrams are removed.  See T&amp;C\'s'), 'section', 'licensePnl') +
			H.button('Credits', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(this, \'creditsPnl\')"`) +
			H.div(	H.a('Saunders Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
					H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'section', 'creditsPnl') +
			H.button('Third Party Software', 'sidenavAccordion', 'third-party', '', `onclick="Cat.D.Panel.SectionToggle(this, \'thirdPartySoftwarePnl\')"`) +
			H.div(
						H.a('3D', '', '', '', 'href="https://threejs.org/"') +
						H.a('Compressors', '', '', '', 'href="https://github.com/imaya/zlib.js"') +
						H.a('Crypto', '', '', '', 'href="http://bitwiseshiftleft.github.io/sjcl/"'), 'section', 'thirdPartySoftwarePnl') +
			H.hr() +
			H.small('&copy;2018-2020 Harry Dole') + H.br() +
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
				H.tr(H.td('User:') + H.td(H.span('', 'smallBold', 'user-name'))) +
				H.tr(H.td('Email:') + H.td(H.span('', 'smallBold', 'user-email')))) +
			H.span('', 'error', 'login-error') +
			H.div('', '', 'login-info');
		this.initialize();
		this.loginInfoElt = document.getElementById('login-info');
		this.passwordResetFormElt = document.getElementById('login-password-reset');
		this.userNameElt = document.getElementById('user-name');
		this.userEmailElt = document.getElementById('user-email');
		this.errorElt = document.getElementById('login-error');
		const that = this;
		window.addEventListener('Login', function() {that.update();});
		window.addEventListener('load', function() {that.update();});
	}
	update()
	{
		this.userNameElt.innerHTML = R.user.name;
		this.userEmailElt.innerHTML = R.user.email;
		this.loginInfoElt.innerHTML = '';
		this.errorElt.innerHTML = '';
		let html = '';
		if (R.user.status !== 'logged-in' && R.user.status !== 'registered')
			html += H.form(H.table(	H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'login-user-name', 'text',
								{
									ph:'Name',
									x:	'autocomplete="username"',
								}))) +
								H.tr(H.td('Password')) +
								H.tr(H.td(H.input('', '', 'login-password', 'password',
									{
										ph:'********',
										x:'autocomplete="current-password" onkeydown="Cat.D.OnEnter(event, Cat.R.cloud.login, Cat.R.cloud)"',
									}))) +
								H.tr(H.td(H.button('Login', '', '', '', 'onclick="Cat.R.cloud.login(event)"')))));
		if (R.user.status === 'unauthorized')
			html += H.form(H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="Cat.D.Panel.SectionToggle(this, \'signupPnl\')"`) +
					H.div( H.table(H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
								H.tr(H.td('Email')) +
								H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
								LoginPanel.PasswordForm() +
								H.tr(H.td(H.button('Sign up', '', '', '', 'onclick="Cat.R.cloud.signup()"')))), 'section', 'signupPnl'));
		if (R.user.status === 'registered')
			html += H.form(H.h3('Confirmation Code') +
					H.span('The confirmation code is sent by email to the specified address above.') +
					H.table(	H.tr(H.td('Confirmation code')) +
								H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code', x:'onkeydown="Cat.D.OnEnter(event, Cat.R.cloud.confirm, R.cloud)"'}))) +
								H.tr(H.td(H.button('Submit Confirmation Code', '', '', '', 'onclick="Cat.R.cloud.confirm()"')))));
		if (R.user.status === 'logged-in')
			html += H.button('Log Out', '', '', '', 'onclick="Cat.R.cloud.logout()"');
		this.loginInfoElt.innerHTML = html;
		this.loginUserNameElt = document.getElementById('login-user-name');
		this.passwordElt = document.getElementById('login-password');
	}
	// TODO not used
	showResetForm()
	{
		this.passwordResetFormElt.innerHTML =
			H.table(
				LoginPanel.PasswordForm('reset') +
				H.tr(H.td(H.button('Reset password', '', '', '', 'onclick="Cat.R.cloud.resetPassword()"'))));
	}
	toggle()
	{
		super.toggle();
		this.update();
	}
	static PasswordForm(sfx = '')
	{
		return H.tr(H.td('Categorical Access Key')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupSecret`, 'text',
				{
					ph:'????????',
					x:	'autocomplete="none"',
				}))) +
				H.tr(H.td('Password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPassword`, 'password',
				{
					ph:'Password',
					x:	'autocomplete="new-password"',
				}))) +
				H.tr(H.td('Confirm password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPasswordConfirm`, 'password',
				{
					ph:'Confirm',
					x:	'autocomplete="confirm-password"',
				})));
	}
}

class ElementSection extends Section
{
	constructor(title, parent, id, tip, doObjects)
	{
		super(title, parent, id, tip);
		this.elements = null;
		this.doObjects = doObjects;
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
			if (this.elements)
			{
				let rows = '';
				const elements = this.elements instanceof Map ? this.elements.values() : this.elements;
				const columns = (R.default.internals ? 2 : 1) + (this.doObjects ? 0 : 2);
				let diagram = null;
				this.section.innerHTML = '';
				for (const e of elements)
				{
					if (diagram !== e.diagram)
					{
						if (rows !== '')
						{
							this.section.innerHTML += H.table(rows);
							rows = '';
						}
						diagram = e.diagram;
						rows += H.tr(H.th(e.diagram.htmlName(), '', '', '', `colspan="${columns}"`));
					}
					if (this.doObjects)
					{
						if (!CatObject.IsA(e))
							continue;
						const deletable = R.default.internals && e.refcnt === 0 && e.diagram && e.diagram.isEditable();
						rows += H.tr( (R.default.internals ?  H.td(e.refcnt.toString()) : '') + H.td(e.htmlName()),
							'grabbable sidenavRow', '', U.Formal(e.description), `draggable="true" ondragstart="Cat.D.DragElement(event, '${e.name}')"`);
					}
					else
					{
						if (!Morphism.IsA(e))
							continue;
						rows += H.tr(H.td(H.table(
											H.tr(	H.td(e.htmlName(), 'center', '', '', `colspan="${columns}"`)) +
											H.tr(	(R.default.internals ? H.td(e.refcnt) : '') +
													H.td(U.HtmlEntitySafe(e.domain.htmlName()), 'left') +
													H.td('&rarr;', 'w10 center') +
													H.td(e.codomain.htmlName(), 'right')), 'panelElt')), 'grabbable', '', U.Formal(e.description),
										`draggable="true" ondragstart="Cat.D.DragElement(event, '${e.name}')"`);
					}
				}
				this.section.innerHTML += H.table(rows);
			}
		}
	}
}

class ElementSection3 extends Section
{
	constructor(title, parent, id, tip, type)
	{
		super(type, title, parent, id, tip);
		Object.defineProperties(this,
		{
			catalog:					{value:H3.div(),	writable: false},
			type:						{value:type,		writable: false},	// 'Object', 'Morphism'
		});
		this.catalog.classList.add('catalog');
		this.section.appendChild(this.catalog);
		const that = this;
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (args.command === 'select')
			{
				D.RemoveChildren(that.catalog);
				diagram[that.type === 'Object' ? 'forEachObject' : 'forEachMorphism'](function(o) { that.add(o); });
			}
		});
		window.addEventListener(type, function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch(args.command)
			{
				case 'add':
					that.add(diagram.getElement(args.name));
					break;
				case 'remove':
					that.remove(args.name);
					break;
			}
		});
	}
	add(elt)
	{
		let id = `${this.section.id} ${elt.diagram.name}`;	// diagram id
		let diagramElt = document.getElementById(id);
		if (!diagramElt)
		{
			diagramElt = H3.div({id}, H3.h3(elt.diagram.name));
			this.catalog.appendChild(diagramElt);
		}
		const tds = [];
		if (R.default.internals)
			tds.push(H3.td(elt.refcnt.toString()));
		let div = null;
		id = this.getId(elt.name);		// element id
		if (this.type === 'Object')
		{
			tds.push(H3.td(elt.htmlName()));
			div = H3.div({id},
				H3.table(H3.tr(tds), {class:'grabbable sidenavRow', title:Formal(elt.description), draggable:true, ondragstart:"Cat.D.DragElement(event, '${elt.name}')"}));
		}
		else
		{
			const colspan = R.default.internals ? 3 : 2;
			tds.push(H3.td(U.HtmlEntitySafe(elt.domain.htmlName()), {class:'left'}));
			tds.push(H3.td('&rarr;', {class:'w10 center'}));
			tds.push(H3.td(elt.codomain.htmlName(), {class:'right'}));
			div = H3.div({id}, H3.table(	[H3.tr(H3.th(elt.htmlName(), {class:'center', colspan})), H3.tr(tds)],
											{class:'panelElt grabbable', tip:U.Formal(elt.description), draggable:true, ondragstart:"Cat.D.DragElement(event, '${elt.name}')"}));
		}
		diagramElt.appendChild(div);
	}
	remove(name)
	{
		const elt = document.getElementById(this.getId(name));
		elt && elt.parent.removeChild(elt);
	}
}

class NewObjectSection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'object-new-section', 'Create new object');
		this.section.innerHTML =
			H.table(H.tr(H.td(D.Input('', 'object-new-basename', 'Base name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'object-new-properName', 'Proper name')), 'sidenavRow') +
					H.tr(H.td(H.input('', 'in100', 'object-new-description', 'text',
						{ph: 'Description', x:'onkeydown="Cat.D.OnEnter(event, Cat.D.objectPanel.newObjectSection.create, Cat.D.objectPanel.newObjectSection)"'})), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', 'Cat.D.objectPanel.newObjectSection.create(event)', 'Create new object in this diagram')) +
			H.span('', 'error', 'object-new-error');
		this.error = document.getElementById('object-new-error');
		this.basenameElt = document.getElementById('object-new-basename');
		this.properNameElt = document.getElementById('object-new-properName');
		this.descriptionElt = document.getElementById('object-new-description');
		this.update();
		R.ReplayCommands.set('newObject', this);
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
			const basename = this.basenameElt.value;
			const properName = this.properNameElt.value;
			const description = this.descriptionElt.value;
			const from = this.doit(e, R.diagram, basename, properName, description, D.Center(R.diagram));
			D.toolbar.show(e, D.Center(R.diagram));
			R.diagram.log({command:'newObject', basename, properName, description, xy:from.getXY()});
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
	doit(e, diagram, basename, properName, description, xy, save = true)
	{
		try
		{
			if (!diagram.isEditable())
				throw 'diagram is read only';
			const name = Element.Codename(diagram, {basename});
			if (diagram.getElement(name))
				throw 'name already exists';
			const to = new CatObject(diagram,
			{
				basename,
				category:		diagram.codomain,
				properName,
				description,
			});
			const from = diagram.placeObject(e, to, xy, save);
			this.update();
			return from;
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args.basename, args.properName, args.description, args.xy, false);
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
		this.diagramObjectSection = new ElementSection('Diagram', this.elt, `object-diagram-section`, 'Objects in the current diagram', true);
		this.referenceObjectSection = new ElementSection('References', this.elt, `object-references-section`, 'Objects in the reference diagrams', true);
		this.refDiv = document.createElement('div');
		this.elt.appendChild(this.refDiv);
		this.initialize();
		this.diagram = null;

		const that = this;
		function process(e)
		{
			that.diagramObjectSection.setElements(R.diagram.elements);
			that.diagramObjectSection.update();
		}
		window.addEventListener('Object', process);
		window.addEventListener('Diagram', function(e) { that.update(); });
	}
	update()
	{
		this.newObjectSection.update();
		if (R.diagram)
		{
			this.diagram = R.diagram;
			this.diagramObjectSection.setElements(this.diagram.elements);
			this.referenceObjectSection.setElements(this.diagram.getObjects());
			const allObjects = [];
			this.diagram.codomain.forEachObject(function(o)
			{
				if (o.diagram && !o.diagram.allReferences.has(R.diagram.name))	// avoid circular refs
					allObjects.push(o);
			});
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
									x:'onkeydown="Cat.D.OnEnter(event, Cat.D.morphismPanel.newMorphismSection.create, Cat.D.morphismPanel.newMorphismSection)"'})), 'sidenavRow') +
						H.tr(H.td(H.select('', 'w100', 'morphism-new-domain')), 'sidenavRow') +
						H.tr(H.td(H.select('', 'w100', 'morphism-new-codomain')), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', 'Cat.D.morphismPanel.newMorphismSection.create(event)', 'Create new morphism in this diagram')) +
			H.span('', 'error', 'morphism-new-error');
		this.error = document.getElementById('morphism-new-error');
		this.basenameElt = document.getElementById('morphism-new-basename');
		this.properNameElt = document.getElementById('morphism-new-properName');
		this.descriptionElt = document.getElementById('morphism-new-description');
		this.domainElt = document.getElementById('morphism-new-domain');
		this.codomainElt = document.getElementById('morphism-new-codomain');
		this.update();
		R.ReplayCommands.set('newMorphism', this);
	}
	update()
	{
		if (R.diagram && super.update())
		{
			this.error.innerHTML = '';
			this.basenameElt.value = '';
			this.properNameElt.value = '';
			this.descriptionElt.value = '';
			this.domainElt.value = '';
			this.codomainElt.value = '';
			this.error.style.padding = '0px';
			const objects = R.diagram.getObjects();
			const options = objects.map(o => H.option(o.htmlName(), o.name)).join('');
			this.domainElt.innerHTML = H.option('Domain', '') + options;
			this.codomainElt.innerHTML = H.option('Codomain', '') + options;
		}
	}
	create(e)
	{
		try
		{
			const diagram = R.diagram;
			if (!diagram.isEditable())
				throw 'Diagram is read only';
			const basename = U.HtmlSafe(this.basenameElt.value);
			const name = Element.Codename(diagram, {basename});
			if (diagram.getElement(name))
				throw 'Morphism already exists';
			const properName = this.properNameElt.value;
			const description = this.descriptionElt.value;
			const domain = diagram.codomain.getElement(this.domainElt.value);
			const codomain = diagram.codomain.getElement(this.codomainElt.value);
			const from = this.doit(e, diagram, domain, codomain, basename, properName, description);
			diagram.log(
			{
				command:'newMorphism',
				domain:domain.name,
				codomain:codomain.name,
				basename,
				properName,
				description,
				xyDom:from.domain.getXY(),
				xyCod:from.codomain.getXY(),
			});
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
		}
	}
	doit(e, diagram, domain, codomain, basename, properName, description, xyDom = null, xyCod = null)
	{
		if (!diagram.isEditable())
			throw 'Diagram is read only';
		if (diagram.getElement(name))
			throw 'Morphism already exists';
		const to = new Morphism(diagram,
		{
			basename,
			properName,
			description,
			domain,
			codomain,
		});
		to.loadEquivalence();
		const from = diagram.placeMorphism(e, to, xyDom, xyCod, false);
		D.toolbar.show(e, D.Center(R.diagram));
		this.update();
		return from;
	}
	replay(e, diagram, args)
	{
		const domain = diagram.codomain.getElement(args.domain);
		const codomain = diagram.codomain.getElement(args.codomain);
		const basename = args.basename;
		const properName = args.properName;
		const description = args.description;
		this.doit(e, diagram, domain, codomain, basename, properName, description, args.xyDom, args.xyCod);
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
		this.diagramMorphismSection = new ElementSection('Diagram', this.elt, `morphism-diagram-section`, 'Morphisms in the current diagram', false);
		this.referenceMorphismSection = new ElementSection('References', this.elt, `morphism-references-section`, 'Morphisms in the reference diagrams', false);
		this.refDiv = document.createElement('div');
		this.elt.appendChild(this.refDiv);
		this.initialize();
		this.diagram = null;
		const that = this;
		function process(e)
		{
			if (R.diagram)
			{
				that.diagramMorphismSection.setElements(R.diagram.elements);
				that.diagramMorphismSection.update();
			}
		}
		window.addEventListener('Morphism', process);
		window.addEventListener('Diagram', function(e) { that.update(); });
	}
	update()
	{
		this.newMorphismSection.update();
		if (R.diagram)
		{
			this.diagram = R.diagram;
			this.diagramMorphismSection.setElements(this.diagram.elements);
			const morphisms = [];
			this.diagram.allReferences.forEach(function(cnt, name)
			{
				const diagram = R.$CAT.getElement(name);
				diagram.forEachMorphism(function(m)
				{
					morphisms.push(m);
				});
			});
			this.referenceMorphismSection.setElements(morphisms);
			const allMorphisms = [];
			this.diagram.codomain.forEachMorphism(function(o)
			{
				if (o.diagram && !o.diagram.allReferences.has(R.diagram.name))	// avoid circular refs
					allMorphisms.push(o);
			});
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
				H.tr(H.td(`<input type="checkbox" ${D.gridding ? 'checked' : ''} onchange="Cat.D.gridding = !D.gridding;D.SaveDefaults()">`) + H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${R.default.internals ? 'checked' : ''} onchange="Cat.D.SettingsPanel.ToggleShowInternals();Cat.D.SaveDefaults()">`) +
						H.td('Show internal info', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${R.default.debug ? 'checked' : ''} onchange="Cat.R.default.debug = !Cat.R.default.debug;Cat.D.SaveDefaults()">`) +
						H.td('Debug', 'left'), 'sidenavRow')
			) +
			H.h3('Equality Info') +
			H.div('', '', 'settings-equality');
		this.initialize();
		this.equalityElt = document.getElementById('settings-equality');
		const that = this;
		R.workers.equality.addEventListener('message', function(msg)
		{
			if (msg.data.command === 'Info')
			{
				const elt = that.equalityElt;
				D.RemoveChildren(elt);
				Object.keys(msg.data).forEach(function(i)
				{
					if (i !== 'command' && i !== 'delta')
						elt.appendChild(H3.p(`${U.DeCamel(i)}: ${msg.data[i]}`));
				});
			}
			else if (msg.data.command === 'Load')
				R.workers.equality.postMessage({command:'Info'});
		});
	}
	static ToggleShowInternals()
	{
		R.default.internals = !R.default.internals;
		if (R.diagram)
			R.EmitDiagramEvent(R.diagram, 'showInternals');
	}
}

class NewTextSection extends Section
{
	constructor(parent)
	{
		super('New', parent, 'text-new-section', 'Create new text');
		this.section.innerHTML =
				H.h5('Create text') +
				H.table(H.tr(H.td(H.textarea('', 'textHtml', 'text-description')), 'sidenavRow')) +
				H.span(D.GetButton('edit', 'Cat.D.textPanel.newTextSection.create(event)', 'Create new text for this diagram')) +
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
			if (!diagram.isEditable())
				throw 'Diagram is not editable';	// TODO should disable instead
			const xy = D.Center(R.diagram);
			const text = this.descriptionElt.value;
			diagram.placeText(e, xy, text);
			diagram.log({command:'text', xy, text});
			this.update();
			D.textPanel.textSection.update();
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
		this.catalog = document.createElement('div');
		this.section.appendChild(this.catalog);
		const that = this;
		window.addEventListener('Text', function(e)
		{
			const args = e.detail;
			if (args.command === 'add')
				that.addText(args.diagram, args.name);
			else if (args.command === 'delete')
				that.deleteText(args.diagram, args.name);
		});
	}
	update()
	{
		const diagram = R.diagram;
		if (!diagram)
			return;
		D.RemoveChildren(this.catalog);
		let rows = [];
		const that = this;
		/*
		diagram.forEachText(function(t)
		{
			const canEdit = diagram.isEditable();
			const viewBtn = H3.span(D.GetButton('view', `Cat.R.diagram.viewElements('${t.name}')`, 'View text'));
			const delBtn = canEdit ? H3.span(D.GetButton('delete', `Cat.R.Actions.delete.action('${t.name}', Cat.R.diagram, [Cat.R.diagram.getElement('${t.name}')])`, 'Delete text')) : null;
			const editBtn = canEdit ? H3.span(D.GetButton('edit', `Cat.R.diagram.editElementText(event, '${t.name}', 'edit_${t.name}', 'description')`, 'Edit')) : null;
			const inDiv = H3.div(H3.span(t.description, {id:`edit_${t.name}`}), {class:'panelElt'})
			editBtn && inDiv.appendChild(editBtn);
			const div = H3.div( [ H3.div([viewBtn, delBtn], {class:'right'}), inDiv, ]);
			div.addEventListener('mouseenter', function(e) { Cat.R.diagram.emphasis(t.name, true);});
			div.addEventListener('mouseleave', function(e) { Cat.R.diagram.emphasis(t.name, false);});
			inDiv.addEventListener('mousedown', function(e) { Cat.R.diagram.pickElement(event, t.name);});
			that.catalog.appendChild(div);
		});
		*/
		diagram.forEachText(function(t){that.addText(diagram, t.name);});
	}
	addText(diagram, name)
	{
		const t = diagram.getElement(name);
		const canEdit = diagram.isEditable();
		const viewBtn = H3.span(D.GetButton('view', `Cat.R.diagram.viewElements('${t.name}')`, 'View text'));
		const delBtn = canEdit ? H3.span(D.GetButton('delete', `Cat.R.Actions.delete.action('${t.name}', Cat.R.diagram, [Cat.R.diagram.getElement('${t.name}')])`, 'Delete text')) : null;
		const editBtn = canEdit ? H3.span(D.GetButton('edit', `Cat.R.diagram.editElementText(event, '${t.name}', 'edit_${t.name}', 'description')`, 'Edit')) : null;
		const inDiv = H3.div(H3.span(t.description, {id:`edit_${t.name}`}), {class:'panelElt'})
		editBtn && inDiv.appendChild(editBtn);
		const div = H3.div( [H3.hr(), H3.div([viewBtn, delBtn], {class:'right'}), inDiv, ], {id:`txt ${name}`});
		div.addEventListener('mouseenter', function(e) { Cat.R.diagram.emphasis(t.name, true);});
		div.addEventListener('mouseleave', function(e) { Cat.R.diagram.emphasis(t.name, false);});
		inDiv.addEventListener('mousedown', function(e) { Cat.R.diagram.pickElement(event, t.name);});
		this.catalog.appendChild(div);
	};
	deleteText(diagram, name)
	{
		const elt = document.getElementById(`txt ${name}`);
		elt && elt.parentNode.removeChild(elt);
	}
}

class TextPanel extends Panel
{
	constructor()
	{
		super('text');
		this.elt.innerHTML = H.table(H.tr(this.closeBtnCell() + H.td(this.expandPanelBtn())), 'buttonBarRight') + H.h3('Text');
		this.initialize();
		this.newTextSection = new NewTextSection(this.elt);
		this.textSection = new TextSection(this.elt);
	}
	update()
	{
		this.newTextSection.update();
		this.textSection.update();
	}
}

class Element
{
	constructor(diagram, args)
	{
		let name = '';
		if ('name' in args)
			name = args.name;
		let basename = '';
		if ('basename' in args)
		{
			basename = args.basename;
			if (name === '')
				name = Element.Codename(diagram, {basename});
		}
		else if (U.basenameEx.test(name))
			basename = name;
		if ('category' in args)
			Object.defineProperty(this, 'category', {value: R.GetCategory(args.category),	writable: false});
		else
			Object.defineProperty(this, 'category', {value:diagram.codomain,	writable: false});
		const dual = U.GetArg(args, 'dual', false);
		const properName = ('properName' in args && args.properName !== '') ? args.properName : 'basename' in args ? args.basename : name;
		Object.defineProperties(this,
		{
			basename:		{value: basename,										writable: false},
			description:	{value: 'description' in args ? U.HtmlEntitySafe(args.description) : '',	writable: true},
			diagram:		{value: diagram,										writable: true},	// is true for bootstrapping
			dual:			{value:	dual,											writable: false},
			name:			{value: name,											writable: false},
			properName:		{value: U.HtmlEntitySafe(properName),					writable: true},
			refcnt:			{value: 0,												writable: true},
			svg:			{value: null,											writable: true},
		});
		Object.defineProperty(this, 'signature',
		{
			set(sig)
			{
				this._sig = sig;
			},
			get()
			{
				return this._sig;
			}
		});
		this.signature = this.getElementSignature();
	}
	editText(e, attribute, value, log = true)
	{
		this[attribute] = value;
		log && this.diagram.log({command:'editText', name:this.name, attribute, value});
		e && e.stopPropagation();
		attribute === 'properName' && this.diagram.updateProperName(this);
	}
	help()
	{
		let descBtn = '';
		let pNameBtn = '';
		if (this.isEditable() && this.diagram.isEditable())
		{
			descBtn = D.GetButton('edit', `Cat.R.diagram.editElementText(event, '${this.name}', '${this.elementId()}-description', 'description')`,
				'Edit', Cat.D.default.button.tiny);
			pNameBtn = this.canChangeProperName() ? D.GetButton('edit',
				`Cat.R.diagram.editElementText(event, '${this.name}', '${this.elementId()}-properName', 'properName')`, 'Edit', D.default.button.tiny) : '';
		}
		const html =	H.h4(H.span(this.htmlName(), '', `${this.elementId()}-properName`) + pNameBtn) +
						H.p(H.span(this.description, '', `${this.elementId()}-description`) + descBtn) +
						(R.default.internals ? H.p(`Internal name: ${this.name}`) : '') +
						(R.default.internals ? ('basename' in this ? H.p(H.span(D.limit(this.basename))) : '') : '') +
						(R.default.internals ?  H.p(`Reference count: ${this.refcnt}`) : '') +
						(R.default.internals ? H.p(`Prototype: ${this.constructor.name}`) : '') +
						H.p(`User: ${this.diagram.user}`);
		return html;
	}
	isEditable()
	{
		return (R.diagram.name === this.diagram.name || R.diagram.name === this.name) && ('readonly' in this ? !this.readonly : true) && this.diagram.user === R.user.name;
	}
	isIterable()
	{
		return false;		// fitb
	}
	getElementSignature()
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
		if (this.description !== '')
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
	moreHelp()
	{
		return '';
	}
	removeSVG()
	{
		if (this.svg)
			this.svg.parentNode.removeChild(this.svg);
	}
	elementId()
	{
		return `el_${this.name}`;
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
	show(state)
	{
		this.svg.style.display = state ? 'block' : 'none';
	}
	htmlName()
	{
		return U.HtmlEntitySafe(this.properName);
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
	emphasis(on)
	{
		D.SetClass('emphasis', on, this.svg);
	}
	static Codename(diagram, args)
	{
		return diagram ? `${diagram.name}/${args.basename}` : args.basename;
	}
	static Process(diagram, args)
	{
		return 'prototype' in args ? new Cat[args.prototype](diagram, args) : null;
	}
	static IsA(obj)
	{
		return Element.prototype.isPrototypeOf(obj);
	}
}

class Graph
{
	constructor(diagram, position, width, graphs = [])
	{
		this.diagram = diagram;
		this.tags = [];
		this.position = position;
		this.width = width;
		this.graphs = graphs;
		this.links = [];
		this.visited = new Set;
	}
	isLeaf()
	{
		return this.graphs.length === 0;
	}
	getFactor(indices)
	{
		let fctr = this;
		if (this.graphs.length === 0)
			return this;
		if (indices.length === 1 && indices[0].length === 0)
			return this;
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
			this.tags.push(tag);
		this.graphs.map(g => g.tagGraph(tag));
	}
	traceLinks(top, ndx = [])
	{
		if (this.isLeaf())
		{
			const links = this.links.slice();
			this.visited = new Set;
			const nuLinks = [];
			while(links.length > 0)
			{
				const lnk = links.pop();
				if (this.visited.has(lnk.toString()))
					continue;
				const g = top.getFactor(lnk);
				for (let j=0; j<g.links.length; ++j)
				{
					const glnk = g.links[j];
					if (ndx.reduce((isEqual, lvl, i) => lvl === glnk[i] && isEqual, true))	// ignore links back to where we came from
						continue;
					this.visited.add(glnk.toString());
					nuLinks.push(glnk);
					links.push(glnk);
				}
				U.ArrayMerge(this.tags, g.tags);
				if (ndx.reduce((isEqual, lvl, i) => lvl === lnk[i] && isEqual, true))
					continue;
				this.visited.add(lnk.toString());
			}
			if (ndx.length === 1 && (ndx[0] === 0 || ndx[0] === top.graphs.length -1))
				this.links = nuLinks.filter(lnk => lnk[0] === 0 || lnk[0] === top.graphs.length -1);
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
	bindGraph(data)	// data: {cod, index, tag, domRoot, codRoot, offset}
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
			args.cod = data.cod.graphs[i + data.offset];
			args.domRoot.push(i);
			args.codRoot.push(i);
			g.bindGraph(args);
		});
	}
	copyGraph(data)	// data {map, src}
	{
		if (this.isLeaf())
		{
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
			while(colorIndex in diagram.colorIndex2colorIndex)
				colorIndex = diagram.colorIndex2colorIndex[colorIndex];
			let path = null;
			for (let i=0; i<this.links.length; ++i)
			{
				const lnk = this.links[i];
				const lnkStr = lnk.toString();
				const idxStr = data.index.toString();
				if (data.visited.indexOf(lnkStr + ' ' + idxStr) >= 0)
					continue;
				const {coords, vertical} = this.svgLinkUpdate(lnk, data);
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
				data.visited.push(idxStr + ' ' + lnkStr);
				data.visited.push(lnkStr + ' ' + idxStr);
				const filter = vertical ? '' : 'url(#softGlow)';
				const path = document.createElementNS(D.xmlns, 'path');
				node.appendChild(path);
				path.setAttributeNS(null, 'data-link', `${lnkStr} ${idxStr}`);
				path.setAttributeNS(null, 'class', 'string');
				path.setAttributeNS(null, 'style', `stroke:#${color}AA`);
				path.setAttributeNS(null, 'id', linkId);
				path.setAttributeNS(null, 'd', coords);
				path.setAttributeNS(null, 'filter', filter);
				const fs = this.tags.sort().join();
				path.addEventListener('mouseover', function(e){ Cat.D.Status(event, fs); });
			}
		}
		let svg = this.graphs.map((g, i) =>
		{
			data.index.push(i);
			g.makeSVG(node, data, false);
			data.index.pop();
		});
	}
	getSVG(node, id, data, replace = false)
	{
		const name = this.name;
		const sig = this.signature;
		const mouseenter = function(e) { Cat.R.diagram.emphasis(sig, true);};
		const mouseleave = function(e) { Cat.R.diagram.emphasis(sig, false);};
		const mousedown = function(e) { Cat.R.diagram.pickElement(event, sig);};
		const g = document.createElementNS(D.xmlns, 'g');
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
		const cp1 = v.add(this.xy).round();
		const cp2 = v.add(cod).round();
		return {coords:adx < ady ? `M${this.xy.x},${this.xy.y} L${cod.x},${cod.y}` : `M${this.xy.x},${this.xy.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`, vertical:dx === 0};
	}
	updateGraph(data)	// data {index, graph, dom:name, cod:name, visited, elementId}
	{
		const diagram = this.diagram;
		if (this.isLeaf() && this.links.length > 0)
		{
			const color = Math.round(Math.random() * 0xffffff).toString(16);
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
				if (data.visited.indexOf(lnkStr + ' ' + idxStr) >= 0)
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
}

class CatObject extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		diagram && diagram.addElement(this);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + (this.category ? H.p(`Category: ${this.category.htmlName()}`) : 'Object');
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
		const width = D.textWidth(this.htmlName());
		const position = data.position;
		data.position += width;
		return new Graph(this.diagram, position, width);
	}
	getFactorProperName(indices)
	{
		return this.properName;
	}
	static IsA(obj)
	{
		return CatObject.prototype.isPrototypeOf(obj);
	}
}

class FiniteObject extends CatObject	// finite, explicit size or not
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		if (('basename' in nuArgs && nuArgs.basename === '') || !('basename' in nuArgs))
			nuArgs.basename = 'size' in nuArgs ? '#' + Number.parseInt(nuArgs.size).toString() : diagram.getAnon('#');
		if ('size' in nuArgs)
		{
			if (nuArgs.size === 0)
				nuArgs.properName = '&empty;'
			else if (nuArgs.size === 1)
				nuArgs.properName = '&#10034;'
			else
				nuArgs.properName = FiniteObject.ProperName(diagram, nuArgs.basename, nuArgs.size);
		}
		if (!('name' in nuArgs))
			nuArgs.name = FiniteObject.Codename(diagram, {basename:nuArgs.basename, size:'size' in nuArgs ? nuArgs.size : ''});
		super(diagram, nuArgs);
		if ('size' in nuArgs && nuArgs.size !== '')
			Object.defineProperty(this, 'size', {value:	Number.parseInt(nuArgs.size), writable:	false});
		if ('size' in this)		// signature is the sig of the coproduct of 1's/Show
			this.signature = U.Sig(this.size.toString());;
	}
	help(helped = new Set, suppress = false)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + (suppress ? '' : H.p(`Finite object of ${'size' in this ? 'size: ' + this.size.toString() : 'indeterminate size'}`));
	}
	json()
	{
		const d = super.json();
		if ('size' in this)
		{
			d.size = Number.parseInt(this.size);
			delete d.properName;
		}
		return d;
	}
	isIterable()
	{
		return true;
	}
	static Basename(diagram, args)
	{
		const basename = args.basename;
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
				return '&empty;'
			else if (size === 1)
				return '&#10034;'
			return size.toString();
		}
		return basename;
	}
	static IsA(obj)
	{
		return FiniteObject.prototype.isPrototypeOf(obj);
	}
}

class InitialObject extends FiniteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.size = 0;
		if (!('description' in nuArgs))
			nuArgs.description = 'the initial object in this category';
		nuArgs.name = '#0';
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Initial object');
	}
	static IsA(obj)
	{
		return InitialObject.prototype.isPrototypeOf(obj);
	}
}

class TerminalObject extends FiniteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.size = 1;
		if (!('description' in nuArgs))
			nuArgs.description = 'the terminal object in this category';
		nuArgs.name = '#1';
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Terminal object');
	}
	static Codename(diagram, args)
	{
		return this.dual ? '#0' : '#1';
	}
	static IsA(m)
	{
		return TerminalObject.prototype.isPrototypeOf(m);
	}
}

class MultiObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'objects', {value:	nuArgs.objects.map(o => this.diagram.getElement(o)), writable:	false});
		this.objects.map(o => o.incrRefcnt());
		this.signature = U.SigArray([U.Sig((this.dual ? 'Co' : '') + this.constructor.name), ...this.objects.map(o => o.signature)]);
	}
	help(hdr, helped)
	{
		return super.help() + hdr + this.objects.map(o => o.help(helped)).join('');
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
					return this.diagram.get(this.dual ? 'InitialObject' : 'TerminalObject', {});
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
		return `${f.htmlName()}${U.subscript(indices)}`;
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
		const graph = new Graph(this.diagram, position, width, graphs);
		return graph;
	}
	resetPosition()
	{
		return false;
	}
	moreHelp()
	{
		return H.table(H.tr(H.th('Objects', '', '', '', 'colspan=2')) + this.objects.map(o => H.tr(H.td(o.diagram.htmlName()) + H.td(o.htmlName(), 'left'))).join(''));
	}
	canChangeProperName()
	{
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
	isIterable()	// Default is for a MultiObject to be iterable if all its morphisms are iterable.
	{
		return this.objects.reduce((r, o) => r && o.isIterable(), true);
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p(this.dual ? 'Coproduct' : 'Product'), helped);
	}
	getFactor(factor)
	{
		if (factor === -1)
			return this.dual ? this.diagram.get('InitialObject') : diagram.get('TerminalObject');
		return super.getFactor(factor);
	}
	getGraph(data = {position:0}, first = true)
	{
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
	getIdentity()
	{
		const morphisms = this.objects.map(o =>
		{
			if ('getIdentity' in o)
				return o.getIdentity();
			return diagram.get('Identity', {domain:o});
		});
		return diagram.get('ProductMorphism', {morphisms, dual:this.dual});
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		return `${c}Po{${args.objects.map(o => o.name).join(',')}}oP${c}`;
	}
	static Codename(diagram, args)
	{
		const objects = args.objects;
		const dual = 'dual' in args ? args.dual : false;
		if (!objects || objects.length === 0)
			return dual ? '#0' : '#1';
		if (objects.length === 1)
			return typeof objects[0] === 'object' ? objects[0].name : objects[0];
		return Element.Codename(diagram, {basename:ProductObject.Basename(diagram, args)});
	}
	static ProperName(objects, dual = false)
	{
		return MultiObject.ProperName(dual ? '&plus;' : '&times;', objects);
	}
	static CanFlatten(obj)
	{
		return ProductObject.IsA(obj) && obj.objects.reduce((r, o) => r || (ProductObject.IsA(o) && o.dual === obj.dual), false);
	}
	static Signature(diagram, objects, dual = false)
	{
		return U.SigArray([dual, ...objects.map(o => o.signature)]);
	}
	static IsA(obj)
	{
		return ProductObject.prototype.isPrototypeOf(obj);
	}
}

class PullbackObject extends ProductObject
{
	constructor(diagram, args)
	{
		const dual = U.GetArg(args, 'dual', false);
		const nuArgs = U.Clone(args);
		nuArgs.source = 'morphisms' in args ? diagram.getElements(args.morphisms) : diagram.getElements(args.source);
		nuArgs.objects = nuArgs.source.map(m => m.domain);
		nuArgs.basename = PullbackObject.Basename(diagram, {basename:nuArgs.source});
		nuArgs.properName = PullbackObject.ProperName(nuArgs.source);
		nuArgs.name = PullbackObject.Codename(diagram, {source:nuArgs.source});
		super(diagram, nuArgs);
		this.source = nuArgs.source;
		this.source.map(m => m.incrRefcnt());
		if ('cone' in nuArgs)
			this.cone = nuArgs.cone;
		else
		{
			const cone = [];
			this.source.map((m, i) =>
			{
				const pbm = diagram.get('FactorMorphism', {domain:this, factors:[i], dual:this.dual});
				cone.push(pbm.name);
			});
			this.cone = cone;
		}
	}
	help(helped = new Set)
	{
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.source.map(m => m.decrRefcnt());
		}
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.source = this.source.map(m => m.name);
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
	loadEquivalence()
	{
		for (let i=1; i<this.cone.length; ++i)
		{
			const base = [this.diagram.getElement(this.cone[0]), this.source[0]];
			const leg = [this.diagram.getElement(this.cone[i]), this.source[i]];
			const {leftSig, rightSig} = R.LoadEquivalence(this.diagram, this, base, leg);
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
		return morphisms.map(m => m.domain.needsParens() ? `(${m.domain.properName})` : m.domain.properName).join(dual ? '&plus' : '&times;') + '/' + morphisms[0].codomain.properName;
	}
	static IsA(obj)
	{
		return PullbackObject.prototype.isPrototypeOf(obj);
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Hom'), helped);
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
		return super.getGraph(this.constructor.name, data, D.bracketWidth, D.commaWidth, false, true);
	}
	needsParens()
	{
		return false;
	}
	minimalHomDom()
	{
		let obj = this.objects[1];
		while (HomObject.IsA(obj))
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
	static FromInput(first = true, uid={uid:9, idp:'data'})
	{
		++uid.uid;
		const morphism = document.getElementById(`${uid.idp}_${uid.uid}`).querySelectorAll('.selRow');
		// TODO
	}
	static IsA(obj)
	{
		return HomObject.prototype.isPrototypeOf(obj);
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
		const xy = U.GetArg(args, 'xy', new D2);
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,													writable:	false},
			name:			{value: U.GetArg(nuArgs, 'name', `${diagram.name}/${diagram.getAnon('t')}`),	writable:	false},
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
		return `${this.constructor.name}_${this.name}`;
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
	htmlName()
	{
		return U.HtmlEntitySafe(this.properName);
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
		nuArgs.basename = U.GetArg(nuArgs, 'name', diagram.getAnon('t'));
		super(diagram, nuArgs);
		const xy = U.GetArg(nuArgs, 'xy', new D2);
		Object.defineProperties(this,
		{
			x:				{value:	xy.x,												writable:	true},
			y:				{value:	xy.y,												writable:	true},
			width:			{value:	U.GetArg(nuArgs, 'width', 0),						writable:	true},
			height:			{value:	U.GetArg(nuArgs, 'height', D.default.font.height),	writable:	true},
		});
		diagram && diagram.addElement(this);
	}
	editText(e, attribute, value, log = true)	// only valid for attr == 'description'
	{
		this.description = U.HtmlEntitySafe(value);
		this.svg.innerHTML = this.tspan(U.HtmlEntitySafe(value));
		log && this.diagram.log({command:'editText', name:this.name, attribute, value});
		e && e.stopPropagation();
	}
	tspan()
	{
		return this.description.indexOf('\n') > -1 ?  this.description.split('\n').map(t => `<tspan text-anchor="left" x="${this.x}" dy="1.2em">${t}</tspan>`).join('') :
			this.description;
	}
	elementId()
	{
		return `dt_${this.name}`;
	}
	getSVG(node, replace = false)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const svg = document.createElementNS(D.xmlns, 'text');
		node.appendChild(svg);
		this.svg = svg;
		svg.setAttributeNS(null, 'data-type', 'text');
		svg.setAttributeNS(null, 'data-name', name);
		svg.setAttributeNS(null, 'text-anchor', 'left');
		svg.setAttributeNS(null, 'class', 'diagramText grabbable');
		svg.setAttributeNS(null, 'id', this.elementId());
		svg.setAttributeNS(null, 'x', this.x);
		svg.setAttributeNS(null, 'y', this.y);	// TODO should be this.height?
		svg.innerHTML = this.tspan();
		const mousedown = function(e) { Cat.R.diagram.pickElement(event, name);};
		const mouseenter = function(e) { Cat.D.Mouseover(event, name, true);};
		const mouseleave = function(e) { Cat.D.Mouseover(event, name, false);};
		svg.addEventListener('mousedown', mousedown);
		svg.addEventListener('mouseenter', mouseenter);
		svg.addEventListener('mouseleave', mouseleave);
	}
	update(xy = null)
	{
		super.update(xy);
		const x = this.x;
		const tspans = this.svg.querySelectorAll('tspan')
		tspans.forEach(function(t)
		{
			t.setAttribute('x', x);
		});
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
		a.height = this.height;
		a.xy = this.getXY();
		a.width = this.width;
		a.height = this.height;
		return a;
	}
	showSelected(state = true)
	{
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	elementId()
	{
		return `${this.constructor.name}_${this.name}`;
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
	isFusible()
	{
		return false;
	}
	updateFusible(e)
	{}
	getBBox()
	{
		return this.svg.getBBox();
	}
	static IsA(obj)
	{
		return DiagramText.prototype.isPrototypeOf(obj);
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Tensor'), helped);
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
		return TensorObject.IsA(obj) && obj.objects.reduce((r, o) => r || TensorObject.IsA(o), false);
	}
	static IsA(obj)
	{
		return TensorObject.prototype.isPrototypeOf(obj);
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
			const to = diagram.getElement(args.to);
			if (!to)
				throw `no to! ${args.to}`;
			nuArgs.to = to;
		}
		super(diagram, nuArgs);
		this.incrRefcnt();
		const xy = U.GetArg(nuArgs, 'xy', new D2);
		Object.defineProperties(this,
		{
			x:			{value:	xy.x,												writable:	true},
			y:			{value:	xy.y,												writable:	true},
			orig:		{value:	{x:xy.x, y:xy.y},									writable:	true},
			width:		{value:	U.GetArg(nuArgs, 'width', 0),						writable:	true},
			height:		{value:	U.GetArg(nuArgs, 'height', D.default.font.height),	writable:	true},
			to:			{value:	null,												writable:	true},
			nodes:		{value:	new Set,											writable:	false},
			domains:	{value:	new Set,											writable:	false},
			codomains:	{value:	new Set,											writable:	false},
		});
		this.setObject(nuArgs.to);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
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
		if (to === this.to)
			return;
		if (this.to && this.to !== to)
			this.to.decrRefcnt();
		to.incrRefcnt();
		this.to = to;
		this.width = D.textWidth(to.htmlName());
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
		return {x:this.x - this.width/2, y:this.y + this.height/2 - D.default.font.height, width:this.width, height:this.height};
	}
	getSVG(node, replace = false)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const mouseenter = function(e) { Cat.D.Mouseover(event, name, true);};
		const mouseleave = function(e) { Cat.D.Mouseover(event, name, false);};
		const mousedown = function(e) { Cat.R.diagram.pickElement(event, name);};
		const svg = document.createElementNS(D.xmlns, 'text');
		node.appendChild(svg);
		this.svg = svg;
		svg.setAttributeNS(null, 'data-type', 'object');
		svg.setAttributeNS(null, 'data-name', this.name);
		svg.setAttributeNS(null, 'text-anchor', 'middle');
		svg.setAttributeNS(null, 'class', 'object grabble');
		svg.setAttributeNS(null, 'id', this.elementId());
		svg.setAttributeNS(null, 'x', this.x);
		svg.setAttributeNS(null, 'y', this.y + D.default.font.height/2);	// TODO should be this.height?
		svg.innerHTML = this.to.htmlName();
		svg.addEventListener('mouseenter', mouseenter);
		svg.addEventListener('mouseleave', mouseleave);
		svg.addEventListener('mousedown', mousedown);
	}
	update(xy = null)
	{
		xy && this.setXY(xy);
		const svg = this.svg;
		if (svg && svg.hasAttribute('x'))
		{
			svg.setAttribute('x', this.x);
			svg.setAttribute('y', this.y + ('height' in this ? this.height/2 : 0));
		}
		this.nodes.forEach(function(d){d.update();});
		const fn = function(m) { m.update(); };
		this.domains.forEach(fn);
		this.codomains.forEach(fn);
	}
	showSelected(state = true)
	{
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	isFusible(o)
	{
		return o && this !== o && o.to && this.to.isEquivalent(o.to);
	}
	updateFusible(e, on)
	{
		const s = this.svg;
		if (on)
		{
			s.classList.add(...['fuseObject']);
			s.classList.remove(...['selected', 'grabbable', 'object']);
			D.Status(e, 'Fuse');
			this.updateGlow(true, 'glow');
		}
		else
		{
			s.classList.add(...['selected', 'grabbable', 'object']);
			s.classList.remove(...['fuseObject']);
			D.Status(e, '');
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
		return this.domains.length === 0 && this.codomains.length === 0;
	}
	static IsA(obj)
	{
		return DiagramObject.prototype.isPrototypeOf(obj);
	}
}

class DiagramPullback extends DiagramObject
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.source = args.source.map(m =>
		{
			const mo = diagram.getElement(m);
			mo.incrRefcnt();
			return mo;
		});
		const object = this.source[0].codomain;		// all have the same codomain
		if ('cone' in args)
			this.cone = args.cone;
		else
			this.cone = this.source.map((m, index) =>
			{
				const to = diagram.get('FactorMorphism', {domain:this.to, factors:[index], dual:this.dual});
				const from = new DiagramMorphism(diagram, {to, anon:'pb', domain:this, codomain:this.source[index].domain});
				return from.name;
			});
	}
	json()
	{
		let a = super.json();
		a.source = this.source.map(m => m.name);
		a.cone = this.cone;
		return a;
	}
	getObjects()
	{
		const objs = new Set;
		objs.add(this);
		this.source && this.source.map(m =>
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
			left:			{value: left, writable: false},
			right:			{value: right, writable: false},
		});
		this.signature = Cell.Signature(left, right);
		this.incrRefcnt();		// nothing refers to them, to increment
		diagram.assertions.set(this.name, this);
		this.loadEquivalence();
		diagram.addElement(this);
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
		if ('cell' in this)
			this.cell.getSVG(node);
	}
	showSelected(state = true)
	{
		this.svg.classList[state ? 'add' : 'remove']('selected');
		this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
	}
	canSave()
	{
		return true;
	}
	loadEquivalence()
	{
		R.LoadEquivalence(this.diagram, this, this.left.map(m => m.to), this.right.map(m => m.to));
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
		if (!cell.svg)
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
		if (!ary.reduce((r, m) => r && DiagramMorphism.IsA(m), true))
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
	static IsA(obj)
	{
		return Assertion.prototype.isPrototypeOf(obj);
	}
}

class Action extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.category = diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'icon', {value:nuArgs.icon,	writable:	false});
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Action');
	}
	action(e, diagram, ary) {};	// fitb
	hasForm(diagram, ary) {return false;};	// fitb
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
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		this.doit(e, diagram, morphisms);
		diagram.log({command:'composite', morphisms:names});
	}
	doit(e, diagram, morphisms)
	{
		const to = diagram.get('Composite', {morphisms:morphisms.map(m => m.to)});
		const from = new DiagramComposite(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms), morphisms});
		diagram.addSVG(from);
		from.update();
		diagram.makeSelected(e, from);
		diagram.update();
	}
	replay(e, diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		this.doit(null, diagram, morphisms);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length > 1 && ary.reduce((hasIt, r) => hasIt && DiagramMorphism.IsA(r), true))
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
		if (leg.length === 1 && Composite.IsA(leg[0]))
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
			name:			'identity',
			icon:	// TODO
`<line class="arrow0" x1="160" y1="60" x2="120" y2="100"/>
<line class="arrow0" x1="130" y1="260" x2="190" y2="260"/>
<line class="arrow0" x1="160" y1="60" x2="160" y2="260"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const domain = ary[0];
		this.doit(e, diagram, domain);
		diagram.log({command:'identity', domain:domain.name});
	}
	doit(e, diagram, domain, save = true)
	{
		const id = diagram.get('Identity', {domain:domain.to});
		diagram.placeMorphismByObject(e, 'domain', domain, id, save);
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, diagram.getElement(args.domain), false);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.IsA(ary[0]);
	}
	static Reduce(leg)		// remove identities
	{
		const nuLeg = leg.filter(m => !Identity.IsA(m) && m.domain.name === m.codomain.name);
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
			name:			'name',
			icon:
`<circle cx="80" cy="240" r="90" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,180 L170,120"/>
<path class="svgstr4" d="M140,210 L200,150"/>
<path class="svgstr3" d="M220,130 L260,40 L300,130"/>
<line class="svgstr3" x1="235" y1="95" x2="285" y2="95"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		try
		{
			const source = ary[0];
			const args =
			{
				command:		this.name,
				source,
				basename:		U.HtmlSafe(			document.getElementById('named-element-new-basename').value.trim()),
				properName:		U.HtmlEntitySafe(	document.getElementById('named-element-new-properName').value.trim()),
				description:	U.HtmlEntitySafe(	document.getElementById('named-element-new-description').value),
			};
			this.doit(e, diagram, args);
			args.source = source.name;
			diagram.log(args);
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
		const source = args.source;
		args.source = source.to;
		if (CatObject.IsA(source))
		{
			const nid = new NamedObject(diagram, args);
			const nidIndex = diagram.placeObject(e, nid, D.default.stdArrow.add(source));
			const idx1 = new DiagramMorphism(diagram, {to:nid.idFrom, domain:nidIndex, codomain:source});
			const idx2 = new DiagramMorphism(diagram, {to:nid.idTo, codomain:nidIndex, domain:source});
			diagram.addSVG(idx1);
			diagram.addSVG(idx2);
			idx1.update();
			idx2.update();
			R.EmitObjectEvent('add', nid.name);
			R.EmitMorphismEvent('add', idx1.name);
			R.EmitMorphismEvent('add', idx2.name);
		}
		else if (Morphism.IsA(source))
		{
			const nuArgs = U.Clone(args);
			nuArgs.domain = source.domain.to;
			nuArgs.codomain = source.codomain.to;
			const to = new NamedMorphism(diagram, nuArgs);
			const nuFrom = new DiagramMorphism(diagram, {to, domain:source.domain, codomain:source.codomain});
			diagram.addSVG(nuFrom);
			source.update();
			nuFrom.update();
			R.EmitMorphismEvent('add', nuFrom.name);
		}
		diagram.update();
		D.toolbar.hide();
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
		let html =
			H.h5('Create Named Element') +
			H.table(H.tr(H.td(D.Input('', 'named-element-new-basename', 'Base name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'named-element-new-properName', 'Proper name')
						), 'sidenavRow') +
					H.tr(H.td(H.input('', 'in100', 'named-element-new-description', 'text',
										{ph: 'Description'})), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', `Cat.R.Actions.name.create(event)`, 'Create named element')) +
			H.span('', 'error', 'named-element-new-error');
		D.toolbar.help.innerHTML = html;
	}
	create(e)
	{
		this.action(e, R.diagram, R.diagram.selected);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && (DiagramMorphism.IsA(ary[0]) || DiagramObject.IsA(ary[0]));
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
			description:	'Copy an object or morphism',
			name:		'copy',
			icon:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		this.doit(e, diagram, from);
		diagram.log({command:'copy', from:from.name, offset:D.default.stdOffset});
	}
	doit(e, diagram, from, save = true)
	{
		if (DiagramMorphism.IsA(from))
			diagram.placeMorphism(e, from.to, from.domain, from.codomain, save)
		else if (DiagramObject.IsA(from))
			diagram.placeObject(e, from.to, from, save);
		else if (DiagramText.IsA(from))
			diagram.placeText(e, new D2(from), from.description, save);
	}
	replay(e, diagram, args)
	{
		const from = diagram.getElement(args.from);
		this.doit(e, diagram, from, false);
	}
	hasForm(diagram, ary)	// one element
	{
		if (diagram.isEditable() && ary.length === 1)
		{
			const elt = ary[0];
			if (Assertion.IsA(elt))
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
			description:	'Flip the name on a morphism to the other side',
			name:		'flipName',
			icon:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="280"/>
<line class="arrow0" x1="80" y1="120" x2="80" y2="220"/>
<line class="arrow0" x1="240" y1="120" x2="240" y2="220"/>
<line class="arrow0" x1="40" y1="120" x2="120" y2="120"/>
<line class="arrow0" x1="200" y1="120" x2="280" y2="120"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		this.doit(e, diagram, from);
		diagram.log({command:'flipName', from:from.name});
	}
	doit(e, diagram, from)
	{
		from.flipName = !from.flipName;
		from.update();
		diagram.update();
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, diagram.getElement(args.from));
	}
	hasForm(diagram, ary)	// one element
	{
		return diagram.isEditable() && ary.length === 1 && DiagramMorphism.IsA(ary[0]);
	}
}

class ProductAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Create a ${dual ? 'co' : ''}product of two or more objects or morphisms`,
			name:			dual ? 'coproduct' : 'product',
			icon:			dual ?  D.svg.add :
`<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, morphisms, log = true)
	{
		const names = morphisms.map(m => m.name);
		this.doit(e, diagram, morphisms);
		log && diagram.log({command:this.name, elements:names});
	}
	doit(e, diagram, elements)
	{
		const elt = elements[0];
		if (DiagramMorphism.IsA(elt))
		{
			const morphisms = elements.map(m => m.to);
			const to = diagram.get('ProductMorphism', {morphisms, dual:this.dual});
			diagram.placeMorphism(e, to, D.Barycenter(elements));
		}
		else if (DiagramObject.IsA(elt))
		{
			const objects = elements.map(o => o.to);
			const to = diagram.get('ProductObject', {objects, dual:this.dual});
			diagram.placeObject(e, to, elt);
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
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && DiagramObject.IsA(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.IsA(v), true));
	}
}

class PullbackAction extends Action
{
	constructor(diagram, dual)
	{
		const name = dual ? 'pushout' : 'pullback';
		const args =
		{
			description:	`Create a ${dual ? 'pushout' : 'pullback'} of two or more morphisms with a common ${dual ? 'domain' : 'codomain'}`,
			name,
			icon:			dual ?
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M160,260 160,160 260,160"/>`
			:
`<path class="svgstr4" d="M60,160 160,160 160,60"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, source)
	{
		const names = source.map(m => m.name);
		this.doit(e, diagram, source);
		diagram.log({command:this.name, source:names});
	}
	doit(e, diagram, source)
	{
		const morphisms = source.map(m => m.to);
		const to = diagram.get('PullbackObject', {morphisms, dual:this.dual});
		const bary = D.Barycenter(source.map(m => m.domain));
		const sink = this.dual ? source[0].domain : source[0].codomain;
		const xy = bary.add(bary.subtract(sink));
		const pb = new DiagramPullback(diagram, {xy, to, source, dual:this.dual});
		diagram.addSVG(pb);
		pb.cone.map(m => diagram.addSVG(diagram.getElement(m)));
		diagram.deselectAll();
		diagram.addSelected(pb);
		diagram.update();
	}
	replay(e, diagram, args)
	{
		const source = diagram.getElements(args.source);
		this.doit(e, diagram, source);
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
			name:			`${dual ? 'co' : ''}productAssembly`,
			icon:	dual ?
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`
		:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="80" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="60" y1="80" x2="160" y2="240" marker-end="url(#arrowhead)"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		this.doit(e, diagram, morphisms);
		diagram.log({command:this.name, morphisms:names});
	}
	doit(e, diagram, diagramMorphisms)
	{
		const morphisms = diagramMorphisms.map(m => m.to);
		const m = diagram.get('ProductAssembly', {morphisms, dual:this.dual});
		diagram.placeMorphismByObject(e, 'domain', diagramMorphisms[0].domain, m);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && this.dual ? Category.IsSink(ary) : Category.IsSource(ary);
	}
}

class HomAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a hom object or morphism from two such items',
						name:			'hom',
						icon:
`<path class="arrow0" d="M100 80 L80 80 L80 240 L 100 240"/>
<path class="arrow0" d="M220 80 L240 80 L240 240 L 220 240"/>
<line class="arrow0rnd" x1="170" y1="240" x2="150" y2="260"/>`};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, morphisms)
	{
		const names = morphisms.map(m => m.name);
		this.doit(e, diagram, morphisms);
		diagram.log({command:this.name, elements:names});
	}
	doit(e, diagram, elements)
	{
		const xy = D.Barycenter(elements);
		if (DiagramObject.IsA(elements[0]))
			diagram.placeObject(e, diagram.get('HomObject', {objects:elements.map(o => o.to)}), xy);
		else if (DiagramMorphism.IsA(elements[0]))
			diagram.placeMorphism(e, diagram.get('HomMorphism', {morphisms:elements.map(m => m.to)}), xy);
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	hasForm(diagram, ary)	// two objects or morphisms
	{
		return diagram.isEditable() && ary.length === 2 && (ary.reduce((hasIt, v) => hasIt && DiagramObject.IsA(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.IsA(v), true));
	}
}

class HomObjectAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	'Select a morphism listed from a common domain',
			dual,
			name:			dual ? 'homLeft' : 'homRight',
			icon:			dual ?
`<circle cx="260" cy="160" r="60" fill="url(#radgrad1)"/><line class="arrow0" x1="30" y1="160" x2="200" y2="160" marker-end="url(#arrowhead)"/>`
				:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/><line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const domain = ary[0];
		const morphism = ary[1];
		this.doit(e, diagram, domain, morphism);
		diagram.log({command:this.name, domain:domain, morphism:morphism});
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const morphisms = [];
		let rows = '';
		for(const [key, m] of diagram.codomain.elements)
			if (Morphism.IsA(m) && from.to.isEquivalent(m.domain) && (m.diagram.name === diagram.name || diagram.allReferences.has(m.diagram.name)))
				rows += D.HtmlRow(m, `onclick="Cat.R.$Actions.getElement('${this.name}').action(event, Cat.R.diagram, ['${from.name}', '${m.name}'])"`);
		D.toolbar.help.innerHTML = H.small(`Morphisms from ${U.HtmlEntitySafe(from.to.htmlName())}`, 'italic') + H.table(rows);
	}
	doit(e, diagram, domain, morphism, save = true)
	{
		Cat.R.diagram.placeMorphismByObject(event, this.dual ? 'codomain' : 'domain', domain, morphism, save);
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args.domain, args.morphism, false);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.IsA(ary[0]);
	}
}

class DetachDomainAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			name:			dual ? 'detachCodomain' : 'detachDomain',
			description:	`Detach a morphism\'s ${dual ? 'co' : ''}domain`,
			dual,
			icon:			dual ?
`<circle cx="220" cy="200" r="60" fill="url(#radgrad1)"/>
<circle cx="280" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="40" y1="160" x2="180" y2="200" marker-end="url(#arrowhead)"/>`
				:
`<circle cx="40" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="100" cy="200" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="140" y1="200" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		this.doit(e, diagram, from);
		diagram.log({command:this.name, from:from.name});
	}
	doit(e, diagram, from)
	{
		const obj = this.dual ? from.codomain : from.domain;
		diagram.addSVG(diagram.domain.detachDomain(from, {x:obj.x + D.default.toolbar.x, y:obj.y + D.default.toolbar.y }, this.dual));
		diagram.update();
		from.update();
		diagram.makeSelected(e, from);
	}
	replay(e, diagram, args)
	{
		const from = diagram.getElement(args.from);
		this.doit(e, diagram, from);
	}
	hasForm(diagram, ary)	// one morphism with connected domain but not a def of something
	{
		if (diagram.isEditable() && ary.length === 1 && DiagramMorphism.IsA(ary[0]) && !DiagramComposite.IsA(ary[0]))
		{
			const from = ary[0];
			let soFar = from.isDeletable() && this.dual ? from.codomain.domains.size + from.codomain.codomains.size > 1 :
													from.domain.domains.size + from.domain.codomains.size > 1;
			if (soFar)
				return ![...from.domain.nodes].reduce((r, cell) => r || ([...cell.left, ...cell.right].indexOf(from) >= 0 && diagram.getAssertion(cell.signature)), false);
			return soFar;
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
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const names = ary.map(m => m.name);
		const elements = ary.map(elt => Cell.IsA(elt) ? diagram.getAssertion(elt.signature) : elt);		// convert cells to assertions
		this.doit(e,diagram, elements);
		diagram.log({command:'delete', elements:names});
	}
	doit(e, diagram, items)
	{
		const stuff = new Set(items);
		const elements = [];
		const findEm = function(m)	// find dependency order
		{
			if (stuff.has(m))
				elements.push(m);
		};
		diagram.domain.elements.forEach(findEm);
		elements.reverse();	// delete in reverse order
		const updateHomSets = new Set;
		for(let i=0; i<elements.length; ++i)
		{
			let s = elements[i];
			if (DiagramObject.IsA(s))	// TODO what about morphisms as objects in 2Cat?
			{
				R.EmitObjectEvent('delete', s.name);
				s.refcnt > 0 && s.decrRefcnt();
			}
			else if (DiagramMorphism.IsA(s))
			{
				R.EmitMorphismEvent('delete', s.name);
				s.decrRefcnt();
				updateHomSets.add([s.domain.name, s.codomain.name]);	// TODO
			}
			else if (DiagramText.IsA(s))
			{
				R.EmitTextEvent('delete', s.name);
				s.decrRefcnt();
			}
			else if (Assertion.IsA(s))
			{
				R.EmitAssertionEvent('delete', s.name);
				s.decrRefcnt();
			}
		}
		updateHomSets.forEach(function(pair)
		{
			diagram.domain.getHomSet(pair[0], pair[1]).map(m => m.update());
		});
		diagram.selected.length = 0;	// do not use diagram.deselectAll()
		diagram.update();
		D.toolbar.hide();
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	hasForm(diagram, ary)	// all are deletable
	{
		const elements = ary.filter(elt => DiagramObject.IsA(elt) ? [...elt.domains, elt.codomains].reduce((r, m) => r && !ary.indexOf(m) > -1, true) : true);
		if (!diagram.isEditable())
			return false;
		const morphisms = [];
		const texts = [];
		const objects = [];
		const assertions = [];
		for (let i=0; i<ary.length; ++i)
		{
			const elt = ary[i];
			if (DiagramComposite.IsA(elt) && elt.to.refcnt > 1)
				return false;
			if (DiagramMorphism.IsA(elt))
				elt.refcnt === 1 && morphisms.push(elt);
			else if (DiagramText.IsA(elt))
				texts.push(elt);
			else if (Assertion.IsA(elt))
				assertions.push(elt);
			else if (elt.isIsolated())
				objects.push(elt);
		}
		return morphisms.length + objects.length + texts.length + assertions.length === elements.length;
	}
}

class TerminalMorphismAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Create a ${dual ? 'initial' : 'terminal'} morphism ${dual ? 'to' : 'from'} an object`,
			name:			dual ? 'initialMorphism' : 'terminalMorphism',
			dual,
			icon:			dual ?
`<circle cx="80" cy="160" r="60" class="svgstr3"/>
<line class="svgstr3" x1="140" y1="100" x2="20" y2="220"/>
<line class="arrow0" x1="160" y1="160" x2="300" y2="160" marker-end="url(#arrowhead)"/>`
			:
`<line class="arrow0" x1="20" y1="160" x2="160" y2="160" marker-end="url(#arrowhead)"/>
<line class="svgstr3" x1="180" y1="160" x2="300" y2="160"/>
<line class="svgstr3" x1="200" y1="120" x2="280" y2="200"/>
<line class="svgstr3" x1="200" y1="200" x2="280" y2="120"/>
<line class="svgstr3" x1="240" y1="100" x2="240" y2="220"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, elements)
	{
		const object = elements[0];
		this.doit(e, diagram, object);
		diagram.log({command:this.name, object:object.name});
	}
	doit(e, diagram, object)
	{
		const m = diagram.get('TerminalMorphism', {domain:object.to, dual:this.dual});
		diagram.placeMorphismByObject(e, this.dual ? 'codomain' : 'domain', object, m.name)
	}
	hasForm(diagram, elements)	// one object
	{
		if (diagram.isEditable() && elements.length === 1 && DiagramObject.IsA(elements[0]))
		{
			const obj = elements[0].to;
			if (TerminalObject.IsA(obj) && this.dual === obj.dual)
				return false;	// use id's instead
			return true;
		}
		return false;
	}
}

class ProjectAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			name:			dual ? 'inject' : 'project',
			description:	`Create ${dual ? 'injection' : 'projection'} morphism`,
			icon:			dual ?
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x2="110" y2="120" x1="240" y1="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x2="110" y2="160" x1="280" y1="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x2="110" y2="200" x1="240" y1="280" marker-end="url(#arrowhead)"/>`
			:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="110" y1="120" x2="240" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="200" x2="240" y2="280" marker-end="url(#arrowhead)"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, elements)
	{
		const from = elements[0];
		const factors = U.GetFactorsById(`${this.dual ? 'inject' : 'project'}-codomain`);
		this.doit(e, diagram, from, factors);
		diagram.log({command:this.name, object:from.name, factors});
	}
	doit(e, diagram, from, factors)
	{
		let m = null;
		if (factors.length === 1 && factors[0] === -1)
			m = diagram.get('TerminalMorphism', {domain:from.to, dual:this.dual});
		else
			m = diagram.get('FactorMorphism', {domain:from.to, factors, dual:this.dual});
		diagram.placeMorphismByObject(e, 'domain', from, m);
	}
	replay(e, diagram, args)
	{
		const object = diagram.getElement(args.object);
		this.doit(e, diagram, object, args.factors);
	}
	hasForm(diagram, ary)	// one product object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.IsA(ary[0]);
	}
	html(e, diagram, ary)
	{
		const to = ary[0].to;
		const canFlatten = ProductObject.CanFlatten(to);
		const id = this.dual ? 'inject-domain' : 'project-codomain';
		const obj = this.dual ? 'domain' : 'codomain';
		const html = H.h4(`Create ${this.dual ? 'Cof' : 'F'}actor Morphism`) +
					(canFlatten ?
						H.div(H.span('Remove parenthesis', 'little') +
							H.button(`Flatten ${this.dual ? 'Coproduct' : 'Product'}`, '', '', '',
								`onclick="Cat.R.Actions.${this.dual ? 'inject' : 'project'}.flatten(event, Cat.R.diagram, Cat.R.diagram.getSelected())"`)) : '') +
					H.h5(`${this.dual ? 'Codomain' : 'Domain'} Factors`) +
					H.small(`Click to place in ${obj}`) +
					H.button('1', '', Cat.R.diagram.elementId(), `Add ${this.dual ? 'initial' : 'terminal'} object`,
						`onclick="Cat.R.Actions.${this.dual ? 'inject' : 'project'}.addFactor('${to.name}', -1)"`) +
					ProjectAction.FactorButton(obj, to, to, [], this.dual) +
					H.h5(`${this.dual ? 'Domain' : 'Codomain'} Factors`) + H.br() +
					H.span(`Click objects to remove from ${obj}`, 'smallPrint') +
					H.div('', '', id);
		D.toolbar.help.innerHTML = html;
		this.codomainDiv = document.getElementById(id);
	}
	addFactor(root, ...indices)
	{
		if (this.codomainDiv.innerHTML === '')
			this.codomainDiv.innerHTML = H.span(D.GetButton('edit', `Cat.R.Actions.${this.dual ? 'inject' : 'project'}.action(event, Cat.R.diagram, Cat.R.diagram.selected)`, 'Create morphism'));
		const object = R.diagram.getElement(root);
		const isTerminal = indices.length === 1 && indices[0] === -1; 
		const factor =  isTerminal ? R.diagram.getTerminal(this.dual) : object.getFactor(indices);
		const sub = isTerminal ? '' : indices.join();
		this.codomainDiv.innerHTML += H.button(factor.htmlName() + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="Cat.H.del(this)"`);
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
			if (ProductObject.IsA(ob) && ob.dual === this.dual)
				ob.objects.map((obo, i) => searchObjects.push([obo, [...f, i]]));
			else
				factors.push(f);
		}
		const m = diagram.get('FactorMorphism', {domain:to, factors, dual:this.dual});
		diagram.placeMorphismByObject(e, this.dual ? 'codomain' : 'domain', from, m)
	}
	static ObjectFactorButton(dir, root, object, index, dual)
	{
		return H.table(H.tr(H.td(
			H.button(object.htmlName() + H.sub(index.join()), '', Cat.R.diagram.elementId(), 'Place object',
			`data-indices="${index.toString()}" onclick="Cat.R.Actions.${dual ? 'inject' : 'project'}.addFactor('${root.name}', ${index.toString()})"`)
		)));
	}
	static ProductObjectFactorButton(dir, root, object, index, dual)
	{
		let header = H.tr(H.td(ProjectAction.ObjectFactorButton(dir, root, object, index, dual)), 'sidename');
		let tbl = '';
		object.objects.map((o, i) =>
		{
			const subIndex = index.slice();
			subIndex.push(i);
			tbl += H.td(ProjectAction.FactorButton(dir, root, o, subIndex, dual));
		});
		return H.table(header + H.tr(H.td(H.table(H.tr(tbl))), 'sidename'));
	}
	static FactorButton(dir, root, object, index, dual)
	{
		return (ProductObject.IsA(object) && object.dual === dual) ? ProjectAction.ProductObjectFactorButton(dir, root, object, index, dual) :
			ProjectAction.ObjectFactorButton(dir, root, object, index, dual);
	}
}

class LambdaMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Curry a morphism',
						name:			'lambda',
						icon:
`<line class="arrow0" x1="40" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="280" x2="140" y2="180" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const domFactors = U.GetFactorsById('lambda-domain');
		const homFactors = U.GetFactorsById('lambda-codomain');
		this.doit(e, diagram, from, domFactors, homFactors);
		diagram.log({command:'lambda', from:from.name, domFactors, homFactors});
	}
	doit(e, diagram, from, domFactors, homFactors)
	{
		const m = diagram.get('LambdaMorphism', {preCurry:from.to, domFactors, homFactors});
		const v = D2.Subtract(from.codomain, from.domain);
		const normV = v.normal().normalize();
		const xyDom = normV.scale(D.default.arrow.length).add(from.domain);
		const xyCod = normV.scale(D.default.arrow.length, normV).add(from.codomain);
		diagram.placeMorphism(e, m);
	}
	replay(e, diagram, args)
	{
		from = diagram.getElement(args.from);
		this.doit(e, diagram, from, args.domFactors, args.homFactors);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1 && DiagramMorphism.IsA(ary[0]))
		{
			const m = ary[0].to;
			if (TerminalObject.IsA(m.domain) && !HomObject.IsA(m.codomain))
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
		let homCod = '';
		let id = 0;
		while (HomObject.IsA(obj))
		{
			obj = obj.homDomain();
			homCod += this.getButtons(obj, {dir:1, fromId:'lambda-codomain', toId:'lambda-domain'});
		}
		const html =
			H.h4('Create Named Morphism') +
			H.button(`&#10034;&rarr;[${domain.htmlName()}, ${codomain.htmlName()}]`, '', '', '', `onclick="Cat.R.Actions.lambda.createNamedElement(event, Cat.R.diagram.selected)"`) +
			H.hr() +
			H.h4('Curry Morphism') +
			H.h5('Domain') +
			H.small('Click to move to codomain:') +
			H.span(this.getButtons(domain, {dir:	0, fromId:'lambda-domain', toId:'lambda-codomain'}), '', 'lambda-domain') +
			H.h5('Codomain') +
			H.small('Click to move to codomain: [') +
			H.span(homCod, '', 'lambda-codomain') +
			H.span(`, ${HomObject.IsA(codomain) ? codomain.minimalHomDom().htmlName() : codomain.htmlName()}]`) +
			H.span(D.GetButton('edit', `Cat.R.Actions.lambda.action(event, Cat.R.diagram, Cat.R.diagram.selected)`,
				'Create lambda morphism'));
		D.toolbar.help.innerHTML = html;
		this.domainElt = document.getElementById('lambda-domain');
		this.codomainElt = document.getElementById('lambda-codomain');
	}
	getButtons(object, data)
	{
		let html = '';
		const onclick = `Cat.R.Actions.lambda.moveFactor(this)`;
		const homBtn = H.button('&times;', '', '', 'Convert to hom', `data-indices="-1"`, `onclick="Cat.R.Actions.lambda.toggleOp(this)"`) + html;
		const codSide = data.dir === 1 && 'objects' in object;
		if ('objects' in object)
			object.objects.map((o, i) =>
				html += H.button(o.htmlName() + H.sub(i), '', D.elementId(), '', `data-indices="${data.dir}, ${i}" onclick="${onclick}"`) +
					((codSide && i < object.objects.length - 1) ? homBtn : '')
			).join('');
		else
			html += H.button(object.htmlName(), '', D.elementId(), '', `data-indices="${data.dir}, 0" onclick="${onclick}"`);
		if (codSide)
			html = H.button('[', '', '', 'Convert to product', `data-indices="-2"`, `onclick="Cat.R.Actions.lambda.toggleOp(this)"`) + html;
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
			elt.dataset.indices = -2
			elt.innerText = '[';
			elt.setAttribute('title', 'Convert to product');
		}
		else
		{
			elt.dataset.indices = -1
			elt.innerHTML = '&times;';
			elt.setAttribute('title', 'Convert to hom');
		}
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
	hasForm(diagram, ary)	// one element
	{
		return ary.length === 1;
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		let html = '';
		if (from.to)
			html = from.to.help();
		else if (DiagramText.IsA(from) && from.diagram.isEditable())
		{
			const btn = D.GetButton('edit', `Cat.R.diagram.editElementText(event, '${from.name}', 'descriptionElt', 'properName')`,
				'Edit text', D.default.button.tiny);
			html = H.p(H.span(from.description, 'tty', 'descriptionElt') + btn);
		}
		else if (Assertion.IsA(from))
			html = from.help();
		D.toolbar.help.innerHTML = html;
	}
}

class LanguageAction extends Action
{
	constructor(diagram, language, ext, icon)
	{
		const args =
		{
			description:	`Morphism\'s ${language} code`,
			name:			language,
			icon,
		};
		super(diagram, args);
		Object.defineProperties(this,
		{
			htmlReady:	{value:	false,		writable:	true},
			ext:		{value:	ext,		writable:	false},
			language:	{value:	language,	writable:	false},
		});
	}
	action(e, diagram, ary)
	{
		const m = ary[0].to;
		if (m.constructor.name === 'Morphism')	// only edit Morphisms and not derived ones
		{
			if (!('code' in m))
				m.code = {};
			m.code[this.ext] = document.getElementById(`morphism-${this.ext}`).innerText;
			diagram.update();
		}
	}
	hasForm(diagram, ary)
	{
		return ary.length === 1 && Morphism.IsA(ary[0]);
	}
	isEditable(m)
	{
		return m.isEditable() && m.constructor.name === 'Morphism' &&
			!InitialObject.IsA(m.domain) &&
			!TerminalObject.IsA(m.codomain) &&
			!InitialObject.IsA(m.codomain);
	}
	html(e, diagram, ary)
	{
		const m = ary[0].to;
		let html = '';
		if (m.constructor.name === 'Morphism')
		{
			let code = 'code' in m ? (this.hasCode(m) ? m.code[this.name] : '') : '';
			if (code === '')
				code = this.generate(m);
			html += H.div(U.HtmlSafe(code), 'code', `morphism-${this.ext}`) +
					(this.isEditable(m) ? D.GetButton('edit', `Cat.R.Actions.${this.name}.setMorphismCode(event, 'morphism-${this.ext}', '${this.ext}')`,
						'Edit code', D.default.button.tiny): '');
		}
		else
			html = H.p(U.HtmlSafe(this.generate(m)), 'code', `morphism-${this.ext}`);
		D.toolbar.help.innerHTML = html;
	}
	hasCode(m)
	{
		return Morphism.IsA(m) && 'code' in m && this.name in m.code;
	}
	setMorphismCode(e, id, type)
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
		let code = '';
		const generated = new Set;
		generated.add('');	// no exec
		const that = this;
		diagram.forEachMorphism(function(m)
		{
			code += that.generate(m, generated);
		});
		return code;
	}
	generate(m, generated = new Set)		// fitb
	{
	}
	evaluate(e, diagram, name, fn)
	{
	}
	evaluateMorphism(e, diagram, name, fn)
	{
	}
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
			D.Status(e, `Diagram ${name} ${this.name} generated<br/>&#9201;${delta}ms`, true);
		}
	}
}

class JavascriptAction extends LanguageAction
{
	constructor(diagram)
	{
		super(diagram, 'javascript', 'js', '<text text-anchor="middle" x="160" y="280" style="font-size:240px;stroke:#000;">JS</text>');
	}
	generate(m, generated = new Set)
	{
		let code = '';
		const proto = m.constructor.name;
		if (!generated.has(m.name))
		{
	 		if (MultiMorphism.IsA(m))
				code += m.morphisms.map(n => this.generate(n, generated)).join('\n');
			const jsName = U.Token(m);
			const header = JavascriptAction.Header(m);
			const tail = JavascriptAction.Tail();
			if (FiniteObject.IsA(m.domain) && m.domain.size > 0 && !DataMorphism.IsA(m))
				code +=	// TODO safety check?
`
function ${jsName}_Iterator(fn)
{
	const result = new Map;
	for (let i=0; i<${m.domain.size}; ++i)
		result.set(i, fn(i));
	return result;
}
`;
			if (InitialObject.IsA(m.domain))
				code += `${header}	return;	// abandon computation\n'${tail}`;	// domain is null, yuk
			else if (TerminalObject.IsA(m.codomain))
				code += `${header}	return 0;${tail}`;
			else if (InitialObject.IsA(m.codomain))
				code += `${header}	throw 'do not do this';${tail}`;
			else
				switch(proto)
				{
					case 'Morphism':
						if ('code' in m)
							code += m.code.javascript + '\n';
						break;
					case 'Composite':
						code += `${header}	return ${m.morphisms.map(n => U.Token(n) + '(').reverse().join('')}args${ ")".repeat(m.morphisms.length) };${tail}`;
						break;
					case 'Identity':
						code += `${header}	return args;${tail}`;
						break;
					case 'ProductMorphism':
						if (m.dual)
							code +=
`const ${jsName}_morphisms = [${m.morphisms.map((n, i) => U.Token(n)).join()}];
${header}	return [args[0], ${jsName}_morphisms[args[0]](args[1])];${tail}`;
						else
							code += `${header}	return [${m.morphisms.map((n, i) => U.Token(n) + '(args[' + i + '])').join()}];${tail}`;
						break;
					case 'ProductAssembly':
						code += this.dual ?
`const ${jsName}_morphisms = [${m.morphisms.map((n, i) => U.Token(n)).join()}];
${header}	return ${jsName}_morphisms[args[0]](args[1]);${tail}`
							:
								`${header}	return [${m.morphisms.map((n, i) => U.Token(n) + '(args)').join()}];${tail}`;
						break;
					case 'DataMorphism':
						if ('recursor' in m)
						{
							generated.add(m.name);	// add early to avoid infinite loop
							code += this.generate(m.recursor, generated);
						}
						let data = JSON.stringify(U.JsonMap(m.data));
						code +=	// TODO safety check?
`
const ${jsName}_Data = new Map(${data});
function ${jsName}_Iterator(fn)
{
	const result = new Map;
	${jsName}_Data.forEach(function(d, i)
	{
		result.set(i, fn(i));
	});
	return result;
}
`;
						if ('recursor' in m)
							code +=
`${header}	if (${jsName}_Data.has(args))
		return ${jsName}_Data.get(args);
	return ${U.Token(m.recursor)}(args);
${tail}`;
						else
							code +=
`
${header}	return ${jsName}_Data.get(args);${tail}`;
						break;
					case 'Distribute':
					case 'Dedistribute':
						code += `${header}	return [args[1][0], [args[0], args[1][1]]];${tail}`;
						break;
					case 'Evaluation':
						code += `${header}	return args[0](args[1]);${tail}`;
						break;
					case 'FactorMorphism':
						code += m.dual ?
							''	// TODO
							:
`const ${jsName}_factors = ${JSON.stringify(m.factors)};
${header}	const r = ${jsName}_factors.map(f => f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
	return ${m.factors.length === 1 ? 'r[0]' : 'r'};${tail}`;
						break;
					case 'HomMorphism':
						break;
					case 'LambdaMorphism':
						code += this.generate(m.preCurry, generated);
						const inputs = new Array(JavascriptAction.ObjectLength(m.preCurry.domain));
						const domLength = JavascriptAction.ObjectLength(m.domain);
						const homLength = m.homFactors.length;
						for(let i=0; i<m.domFactors.length; ++i)
						{
							const f = m.domFactors[i];
							if (f[0] === 0)
							{
								const k = f[1];
								inputs[k] = domLength > 1 ? `cargs[${k}]` : 'cargs';
							}
						}
						for(let i=0; i<homLength; ++i)
						{
							const f = m.homFactors[i];
							if (f[0] === 0)
							{
								const k = f[1];
								inputs[k] = homLength > 1 ? `bargs[${k}]` : 'bargs';
							}
						}
						let input = inputs.join();
						if (inputs.length >= 0)
							input = `[${inputs}]`;
						if (domLength >= 1 && homLength > 0)
							code +=
`${header}	const cargs = args;
	return function(bargs)
	{
		return ${U.Token(m.preCurry)}(${input});
	}${tail}`;
						else if (domLength === 0 && homLength >= 1)
							code +=
`${header}	return ${U.Token(m.preCurry)};${tail}`;
						else	// must evaluate lambda!
						{
							const preMap = new Map;
							const postMap = new Map;
							for (let i=0; i<m.domFactors.length; ++i)
							{
								const f = m.domFactors[i];
								if (f[0] === 1 && f.length == 2)
									preMap.set(f[1], i);
								else if (f[0] === 0 && f.length == 2)
									postMap.set(f[1], i);
							}
							let preInput = '';
							for (let i=0; i<preMap.size; ++i)
								preInput += `${i > 0 ? ', ' : ''}args[${preMap.get(i)}]`;
							if (preMap.size > 1)
								preInput = `[${preInput}]`;
							let postInput = '';
							for (let i=0; i<postMap.size; ++i)
								postInput += `${i > 0 ? ', ' : ''}args[${postMap.get(i)}]`;
							if (postMap.size > 1)
								postInput = `[${postInput}]`;
							code +=
`${header}return ${U.Token(m.preCurry)}(${preInput})(${postInput});${tail}`;
						}
						break;
					case 'NamedMorphism':
						code += this.generate(m.source, generated);
						code += `${header}	return ${U.Token(m.source)}(args);${tail}`;
						break;
					case 'TerminalMorphism':
						code += m.dual ? `${header}	return;${tail}` : `${header}	return 0;${tail}`;
						break;
				}
			generated.add(m.name);
		}
		return code;
	}
	loadHTML(fn)
	{
		const htmlDiagram = R.$CAT.getElement('hdole/HTML');
		const html = htmlDiagram.getElement('HTML');
		const str = htmlDiagram.codomain.getElement('hdole/Strings/str');
		this.formatters = new Map;
		const that = this;
		htmlDiagram.forEachMorphism(function(m)
		{
			if (m.domain.name === html.name &&
				ProductObject.IsA(m.codomain) &&
				m.codomain.objects[0].name === str.name)
			{
				const hom = m.codomain.objects[1];
				if (HomObject.IsA(hom))
				{
					const homDom = hom.objects[0];
					if (homDom.isEquivalent(html))
						that.formatters.set(hom.objects[1].signature, m);
				}
			}
		});
		const id = 'hdole/PFS/HTML';
		let scriptElt = document.getElementById(id);
		if (scriptElt)
			H.del(scriptElt);
		const script = this.generateDiagram(htmlDiagram);
		scriptElt = document.createElement('script');
		scriptElt.id = id;
		scriptElt.onload = function()
		{
			this.htmlReady = true;
			fn && fn();
		};
		scriptElt.src = D.url.createObjectURL(new Blob([script], {type:'application/javascript'}));
		document.head.appendChild(scriptElt);
	}
	canFormat(o)
	{
		if (ProductObject.IsA(o))
			return o.objects.reduce((r, ob) => r && this.canFormat(ob));
		else if (Morphism.IsA(o))
			return this.canFormat(o.domain) && this.canFormat(o.codomain);
		else if (TerminalObject.IsA(o) && !o.dual)
			return true;
		else if (CatObject.IsA(o))
			return this.formatters.has(o.signature);
		return false;
	}
	getInput(o, prefix = '', factor = [])
	{
		let html = '';
		const id = `${prefix} ${o.name} ${factor.toString()}`;
		switch(o.constructor.name)
		{
			case 'CatObject':
				if (this.formatters.has(o.signature))
				{
					const f = this.formatters.get(o.signature);
					const out = window[U.Token(f)](`${prefix} ${o.name} ${factor.toString()}`);
					html = out[0];
				}
				else
					D.RecordError('object has no formatter');
				break;
			case 'ProductObject':
				if (o.dual)
				{
					let options = '';
					let divs = '';
					for (let i=0; i<o.objects.length; ++i)
					{
						const ob = o.objects[i];
						const f = [...factor, i];
						const oid = `dv_${ob.name} ${f.toString()}`;
						options += `<option value="${i}">${i}: ${ob.htmlName()}</option>`;
						divs += H.div(this.getInput(ob, prefix, [...factor, i]), 'nodisplay', oid);
					}
					html +=
`<select id="${id}" onchange="Cat.D.ShowInput('${o.name}', '${id}', ${factor.length === 0 ? '[]' : factor.toString()})">
<option>Choose one</option>
${options}
</select>
<div>
${divs}
</div>
`;
				}
				else
					html += o.objects.map((ob, i) => this.getInput(ob, prefix, [...factor, i]));
				break;
			case 'FiniteObject':
			case 'TerminalObject':
				html = `<input type="number" min="0" id="${id}"`;
				if ('size' in o)
					html += ` max="${o.size}"`;
				html += '/>';
				break;
			case 'DataMorphism':
				break;
		}
		return html;
	}
	getInputValue(domain, prefix = '', factor = [])
	{
		let value = null;
		switch(domain.constructor.name)
		{
			case 'CatObject':
				if (this.formatters.has(domain.signature))
				{
					const f = this.formatters.get(domain.signature);
					const out = window[U.Token(f)](domain.name + factor.toString());
					const formatter = out[1]();
					value = formatter(`${prefix} ${domain.name} ${factor.toString()}`);;
				}
				else
					D.RecordError('object has no formatter');
				break;
			case 'TerminalObject':
				value = 0;
				break;
			case 'ProductObject':
				if (domain.dual)
				{
					const i = Number.parseInt(document.getElementById(`${prefix} ${domain.name} ${factor.toString()}`).value);
					value = [i, this.getInputValue(domain.objects[i], prefix, [...factor, i])];
				}
				else
					value = domain.objects.map((o, i) => this.getInputValue(o, prefix, [...factor, i]));
		}
		return value;
	}
	evaluate(e, diagram, name, fn)
	{
		const m = diagram.getElement(name);
		const args = this.getInputValue(m.domain);
		const jsName = U.Token(m);
		const code =
`// Catecon javascript code generator ${Date()}
onmessage = function(e)
{
	const args = e.data;
	postMessage(['start', 'Starting']);
	try
	{
		const result = ${jsName}(args);
		postMessage(['result', [args, result]]);
	}
	catch(e)
	{
		postMessage(['exception', e]);
	}
}
${this.generate(m)}
`;
		if (R.default.debug)
			console.log('run code', code);
		const blob = new Blob([code], {type:'application/javascript'});
		const url = D.url.createObjectURL(blob);
		const w = new Worker(url);
		JavascriptAction.AddMessageListener(w, fn);
		w.postMessage(args);	// start worker
	}
	evaluateMorphism(e, diagram, name, fn)
	{
		const m = diagram.getElement(name);
		const args = this.getInputValue(m.domain);
		const jsName = U.Token(m);
		const isIterable = m.isIterable();
		const iterInvoke = Composite.IsA(m) ? `${U.Token(m.getFirstMorphism())}_Iterator(${jsName})` : `${U.Token(m.domain)}_Iterator(${jsName})`;
		const code =
`// Catecon javascript code generator ${Date()}
onmessage = function(e)
{
	postMessage(['start', 'Starting']);
	try
	{
		const results = ${iterInvoke};
		postMessage(['result', results]);
	}
	catch(e)
	{
		postMessage(['exception', e]);
	}
}
${this.generate(m)}
`;
		if (R.default.debug)
			console.log('run code', code);
		const blob = new Blob([code], {type:'application/javascript'});
		const url = D.url.createObjectURL(blob);
		const w = new Worker(url);
		JavascriptAction.AddMessageListener(w, fn);
		w.postMessage(args);	// start worker
	}
	findFormat(o)
	{
		const sig = o.signature;
		if (this.formatters.has(sig))
			return this.formatters.get(sig);
		return null;
	}
	getInputString(o)
	{
		const f = this.findFormat(o);
		if (f)
		{
			const p = window[U.Token(f)]();
			return p[0];
		}
		return '';
	}
	getInputFunction(o)
	{
		const f = this.findFormat(o);
		if (f)
		{
			const p = window[U.Token(f)]()();
			return p[1];
		}
		return function(){};
	}
	canInputObject(o)
	{
		switch(o.constructor.name)
		{
			case 'TerminalObject':
			case 'FiniteObject':
				return true;
			case 'CatObject':
				return this.formatters.has(o.signature);
			case 'ProductObject':
				return o.objects.reduce((r, so) => r && this.formatters.has(so.signature), true);
		}
		return false;
	}
	static Header(m)
	{
		return `function ${U.Token(m)}(args)\n{\n`;
	}
	static Tail()
	{
		return `\n}\n`;
	}
	static AddMessageListener(w, fn = null)
	{
		w.addEventListener('message', function(msg)
		{
			const stat = msg.data[0];
			const args = msg.data[1];
			switch(stat)
			{
				case 'result':		// success, show's over
					if (fn)
						fn(args);
					w.terminate();
					break;
				case 'exception':		// exception thrown inside worker, TODO what happened?
					w.terminate();
					break;
				case 'f2d3':
					D.threeDPanel.open();
					D.threeDPanel.Ato3D(args);
					break;
				case 'ff2d3':
					D.threeDPanel.open();
					D.threeDPanel.AxAto3D(args);
					break;
				case 'fff2d3':
					D.threeDPanel.open();
					D.threeDPanel.AxAxAto3D(args);
					break;
				case 'fff2toLine':
					D.threeDPanel.open();
					D.threeDPanel.AxAxAx2toLine(args);
					break;
				case 'fff2toQB3':
					D.threeDPanel.open();
					D.threeDPanel.AxAxAToQuadraticBezierCurve3(args);
					break;
				case 'str2tty':
					D.ttyPanel.toOutput(args);
					D.ttyPanel.open();
					D.Panel.SectionOpen('tty-out-section');
					break;
			}
		});
	}
	static ObjectLength(o)
	{
		if (TerminalObject.IsA(o) || InitialObject.IsA(o))
			return 0;
		if (ProductObject.IsA(o) && !o.dual)
			return o.objects.reduce((r, o) => r + (TerminalObject.IsA(o) ? 0 : 1), 0);
		else
			return 1;
	}
}

class CppAction extends LanguageAction
{
	constructor(diagram)
	{
		super(diagram, 'cpp', 'cpp',
`
<text text-anchor="middle" x="160" y="140" style="font-size:140px;font-weight:bold;stroke:#000;">C</text>
<text text-anchor="middle" x="160" y="280" style="font-size:120px;font-weight:bold;stroke:#000;">++</text>
`
		);
		this.sizes = new Map([['/hdole/cpp/B', 1], ['/hdole/cpp/F', 8], ['/hdole/cpp/U', 8], ['/hdole/cpp/USh', 2], ['/hdole/cpp/Z', 8]]);
	}
	sizeof(object)
	{
		if (ProductObject.IsA(object))
			return object.dual ? 8 + Math.max(...object.objects.map(o => this.sizeof(o))) : object.objects.reduce((r, o) => r + this.sizeof(o), 0);
		else if (HomObject.IsA(object))
			return 8;	// function pointers are all the same
		else if (NamedObject.IsA(object))
			return this.sizeof(object.source);
		else if (TerminalObject.IsA(object))
			return 0;
		else if (this.sizes.has(object.name))
			return this.sizes.get(object.name);
	}
	generate(morphism, generated = new Set)
	{
		let code = '';
		const proto = morphism.constructor.name;
		if (!generated.has(morphism.name))
		{
	 		if (MultiMorphism.IsA(morphism))
				code += morphism.morphisms.map(n => this.generate(n, generated)).join('\n');
			const name = U.Token(morphism);
			const header = this.header(morphism);
			const tail = this.tail();
			const domainStruct = U.Token(morphism.domain);
			const codomainStruct = U.Token(morphism.codomain);
			/*
			if (FiniteObject.IsA(morphism.domain) && morphism.domain.size > 0 && !DataMorphism.IsA(morphism))
				code +=
`
void ${name}_Iterator(fn, ${codomainStruct} (& out)[${morphism.domain.size}])
{
	for (unsigned long i=0; i<${morphism.domain.size}; ++i)
		fn(i, out[i]);
}
`;
*/
			if (InitialObject.IsA(morphism.domain))
				code += `${header}	return;	// abandon computation\n'${tail}\n${tail}`;	// domain is null, yuk
			else if (TerminalObject.IsA(morphism.codomain))
				code += `${header}	out = 0;${tail}`;
			else if (InitialObject.IsA(morphism.codomain))
				code += `${header}	throw 'do not do this';${tail}`;
			else
				switch(proto)
				{
					case 'Morphism':
//						if ('code' in morphism && this.ext in morphism.code)		// TODO still needed
						code += `${header}${tail}\n`;
						break;
					case 'Composite':
						code +=
`${header}	return ${morphism.morphisms.map(n => U.Token(n) + '(').reverse().join('')}args${ ")".repeat(morphism.morphisms.length) };${tail}`;
						break;
					case 'Identity':
						code += `${header}	out = args;${tail}`;
						break;
					case 'ProductMorphism':
						if (morphism.dual)
							code +=
`catFunctions ${name}_morphisms[${morphism.morphisms.length}] = { ${morphism.morphisms.map(m => U.Token(m.name)).join(',\n')} };
const ${name}_morphisms = [${morphism.morphisms.map((n, i) => U.Token(n)).join()}];
${header}	return [args[0], ${name}_morphisms[args[0]](args[1])];${tail}`;
						else
							code += `${header}	return [${morphism.morphisms.map((n, i) => U.Token(n) + '(args[' + i + '])').join()}];${tail}`;
						break;
					case 'ProductAssembly':
						code += this.dual ?
`const ${name}_morphisms = [${morphism.morphisms.map((n, i) => U.Token(n)).join()}];
${header}	return ${name}_morphisms[args[0]](args[1]);${tail}`
							:
								`${header}	return [${morphism.morphisms.map((n, i) => U.Token(n) + '(args)').join()}];${tail}`;
						break;
					case 'DataMorphism':
						if ('recursor' in morphism)
						{
							generated.add(morphism.name);	// add early to avoid infinite loop
							code += this.generate(morphism.recursor, generated);
						}
						let data = JSON.stringify(U.JsonMap(morphism.data));
						code +=	// TODO safety check?
`
const ${name}_Data = new Map(${data});
function ${name}_Iterator(fn)
{
	const result = new Map;
	${name}_Data.forEach(function(d, i)
	{
		result.set(i, fn(i));
	});
	return result;
}
`;
						if ('recursor' in morphism)
							code +=
`${header}	if (${name}_Data.has(args))
		return ${name}_Data.get(args);
	return ${U.Token(morphism.recursor)}(args);
${tail}`;
						else
							code +=
`
${header}	return ${name}_Data.get(args);${tail}`;
						break;
					case 'Distribute':
					case 'Dedistribute':
						code += `${header}	return [args[1][0], [args[0], args[1][1]]];${tail}`;
						break;
					case 'Evaluation':
						code += `${header}	return args[0](args[1]);${tail}`;
						break;
					case 'FactorMorphism':
						code += morphism.dual ?
							''	// TODO
							:
`const ${name}_factors = ${JSON.stringify(morphism.factors)};
${header}	const r = ${name}_factors.map(f => f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
	return ${morphism.factors.length === 1 ? 'r[0]' : 'r'};${tail}`;
						break;
					case 'HomMorphism':
						break;
					case 'LambdaMorphism':
						code += this.generate(morphism.preCurry, generated);
						const inputs = new Array(this.ObjectLength(morphism.preCurry.domain));
						const domLength = this.ObjectLength(morphism.domain);
						const homLength = morphism.homFactors.length;
						for(let i=0; i<morphism.domFactors.length; ++i)
						{
							const f = morphism.domFactors[i];
							if (f[0] === 0)
							{
								const k = f[1];
								inputs[k] = domLength > 1 ? `cargs[${k}]` : 'cargs';
							}
						}
						for(let i=0; i<homLength; ++i)
						{
							const f = morphism.homFactors[i];
							if (f[0] === 0)
							{
								const k = f[1];
								inputs[k] = homLength > 1 ? `bargs[${k}]` : 'bargs';
							}
						}
						let input = inputs.join();
						if (inputs.length >= 0)
							input = `[${inputs}]`;
						if (domLength >= 1 && homLength > 0)
							code +=
`${header}	const cargs = args;
	return function(bargs)
	{
		return ${U.Token(morphism.preCurry)}(${input});
	}${tail}`;
						else if (domLength === 0 && homLength >= 1)
							code +=
`${header}	return ${U.Token(morphism.preCurry)};${tail}`;
						else	// must evaluate lambda!
						{
							const preMap = new Map;
							const postMap = new Map;
							for (let i=0; i<morphism.domFactors.length; ++i)
							{
								const f = morphism.domFactors[i];
								if (f[0] === 1 && f.length == 2)
									preMap.set(f[1], i);
								else if (f[0] === 0 && f.length == 2)
									postMap.set(f[1], i);
							}
							let preInput = '';
							for (let i=0; i<preMap.size; ++i)
								preInput += `${i > 0 ? ', ' : ''}args[${preMap.get(i)}]`;
							if (preMap.size > 1)
								preInput = `[${preInput}]`;
							let postInput = '';
							for (let i=0; i<postMap.size; ++i)
								postInput += `${i > 0 ? ', ' : ''}args[${postMap.get(i)}]`;
							if (postMap.size > 1)
								postInput = `[${postInput}]`;
							code +=
`${header}return ${U.Token(morphism.preCurry)}(${preInput})(${postInput});${tail}`;
						}
						break;
					case 'NamedMorphism':
						code += this.generate(morphism.source, generated);
						code += `${header}	return ${U.Token(morphism.source)}(args);${tail}`;
						break;
					case 'TerminalMorphism':
						code += morphism.dual ? `${header}	return;${tail}` : `${header}	return 0;${tail}`;
						break;
				}
			generated.add(morphism.name);
		}
		return code;
	}
	header(m)
	{
		return `void ${U.Token(m)}(${U.Token(m.domain)} & args, ${U.Token(m.codomain)} & out)\n{\n`;
	}
	tail()
	{
		return `\n}\n`;
	}
}

class RunAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Run a morphism or view its contents',
						name:			'run',
						icon:
`<g>
<animateTransform id="RunAction btn" attributeName="transform" type="rotate" from="0 160 160" to="360 160 160" dur="0.5s" repeatCount="1" begin="indefinite"/>
<line class="arrow0" x1="20" y1="80" x2="180" y2="80" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="140" y1="240" x2="300" y2="240" marker-end="url(#arrowhead)"/>
</g>`,};
		super(diagram, args);
		this.workers = [];
		this.data = new Map;
		this.js = null;		// fill in later
	}
	action(e, diagram, ary)
	{
debugger;
		const btn = document.getElementById('RunAction btn');
		btn.setAttribute('repeatCount', 'indefinite');
		btn.beginElement();
		R.Actions.javascript.evaluate(e, diagram, ary[0].to.name, R.Actions.run.postResult);
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const js = R.Actions.javascript;
		const addDataBtn = D.GetButton('edit', `Cat.R.Actions.run.addInput()`, 'Add data');
		const {properName, description} = to;
		let html = H.h3(properName) + (description !== '' ? H.p(description, 'smallPrint') : '');
		let canMakeData = true;
		if (DiagramObject.IsA(from))
		{
			if (js.canFormat(to))
				html += js.getInput(to) + addDataBtn;
		}
		else	// morphism
		{
			const {domain, codomain} = to;
			const evalCode = H.h5('Evaluate the Morphism') +
								js.getInput(domain) +
								D.GetButton('edit', `Cat.R.Actions.javascript.evaluate(event, Cat.R.diagram, '${to.name}', Cat.R.Actions.run.postResult)`, 'Evaluate inputs');
			if (to.constructor.name === 'Morphism' && FiniteObject.IsA(domain) && !js.hasCode(to))
			{
				if ('size' in domain && domain.size > 0)
				{
					for (let i=0; i<domain.size; ++i)
						html += js.getInput(codomain, i.toString());
				}
				else	// indeterminate size
				{
					html += js.getInput(codomain);
					html += D.GetButton('add', `Cat.R.Actions.run.addDataInput(event, Cat.R.diagram, '${to.name}')`, 'Add data input');
				}
			}
			else if (DataMorphism.IsA(to))
			{
				html += H.h5('Add Data To Morphism');
				let rows = H.tr(H.td(H.small('Domain')) + H.td(H.small('Codomain')) + H.td(''));
				rows += H.tr(H.td(js.getInput(domain, 'dom')) + H.td(js.getInput(codomain, 'cod')) + H.td(addDataBtn));
				html += H.table(rows);
				canMakeData = false;
				if (to.data.size > 0)
				{
					html += H.h5('Data In Morphism');
					let rows = '';
					to.data.forEach(function(d,i)
					{
						if (d !== null)
							rows += H.tr(H.td(i) + H.td(d));
					});
					html += H.table(rows) + H.hr();
				}
				else
					html += H.small('No data');
				html += evalCode;
			}
			else if (to.isIterable())
				html += D.GetButton('edit', `Cat.R.Actions.javascript.evaluateMorphism(event, Cat.R.diagram, '${to.name}', Cat.R.Actions.run.postResults)`, 'Evaluate morphism');
			else		// try to evaluate an input
				html += evalCode;
		}
		if (canMakeData)
		{
			const createDataBtn = H.div(D.GetButton('table', `Cat.R.Actions.run.createData(event, R.diagram, '${from.name}')`, 'Create data morphism'), '', 'run-createDataBtn');
			D.toolbar.help.innerHTML = html + H.div(H.h5('Data'), '', 'run-display') + createDataBtn;
			const btn = document.getElementById('run-createDataBtn');
			btn.style.display = 'none'
			this.createDataBtn = btn;
			const watcher = function(mutationsList, observer)
			{
				for(const m of mutationsList)
				{
					btn.style = m.target.children.length > 0 ? 'block' : 'none';
				}
			};
			const observer = new MutationObserver(watcher);
			const childList = true;
			observer.observe(document.getElementById('run-display'), {childList});
		}
		else
			D.toolbar.help.innerHTML = html + H.div('', '', 'run-display');
		this.display = document.getElementById('run-display');
		this.data = new Map;
	}
	postResult(r)
	{
		var d = document.createElement('div');
		d.innerHTML = U.HtmlSafe(U.a2s(r[1]));
		const that = R.Actions.run;
		that.display.appendChild(d);
		that.data.set(r[0], r[1]);
	}
	postResults(r)
	{
		const that = R.Actions.run;
		r.forEach(function(v, i)
		{
			that.postResult([i, v]);
		});
	}
	addInput()
	{
		const to = R.diagram.getSelected().to;
		let dom = null;
		let cod = null;
		const d = document.createElement('div');
		if (CatObject.IsA(to))
		{
			dom = this.data.size;
			cod = this.js.getInputValue(to);
			d.innerHTML = U.HtmlSafe(U.a2s(cod));
			this.data.set(dom, cod);
		}
		else if (DataMorphism.IsA(to))
		{
			const {domain, codomain} = this.setInputValue(to);
			d.innerHTML = this.htmlInputValue(domain, codomain);
		}
		this.display.appendChild(d);
		R.diagram.update();
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
		if (this.data.size > 0)
		{
			const selected = diagram.getElement(eltName);
			const domain = diagram.get('FiniteObject', {size:this.data.size});
			const {to, name} = DiagramObject.IsA(selected) ? selected : selected.codomain;
			const dm = new DataMorphism(diagram, {domain, codomain:to, data:this.data});
			diagram.placeMorphismByObject(e, 'codomain', name, dm.name);
		}
	}
	hasForm(diagram, ary)
	{
		if (!this.js)
			this.js = R.Actions.javascript;
		if (ary.length === 1 && 'to' in ary[0])
		{
			const {to} = ary[0];
			if (Morphism.IsA(to) && (this.js.canFormat(to) || to.isIterable()))
				return true;
			if (CatObject.IsA(to))
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
						name:			'finiteObject',
						icon:			D.svg.table,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const size = Number.parseInt(this.sizeElt.value.trim());
		this.sizeElt.classList.remove('error');
		if (size < 0 || size.toString() !== txt)
		{
			this.sizseElt.classList.add('error');
			return;
		}
		this.doit(e, diagram, from, size);
		diagram.log({command:'finiteObject', from:from.name, size});
		this.html(e, diagram, ary);
	}
	doit(e, diagram, from, size)
	{
		const to = from.to;
		if (to.constructor.name === 'CatObject' && to.refcnt === 1)
		{
			diagram.codomain.deleteElement(to);
			const newTo = new FiniteObject(diagram, {basename:to.basename, category:diagram.codomain, properName:to.properName, size});
			from.to = null;
			from.setObject(newTo);
		}
		else
		{
			if (size < 0 || size.toString() !== txt)
				return;
			m.size.javascript = size;
		}
		diagram.update();
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		let html = H.h4('Finite Object');
		html += (to.constructor.name === 'CatObject' ? H.span('Convert generic object to a finite object.', 'smallPrint') : H.span('Finite object', 'smallPrint')) +
					H.table(H.tr(H.td(D.Input('size' in to ? to.size : '', 'finite-new-size', 'Size')), 'sidenavRow')) +
					H.span('Leave size blank to indicate finite of unknown size', 'smallPrint') +
					D.GetButton('edit', 'Cat.R.Actions.finiteObject.action(event, R.diagram, R.diagram.selected)', 'Finite object', D.default.button.tiny);
		D.toolbar.help.innerHTML = html;
		this.sizeElt = document.getElementById('finite-new-size');
		U.SetInputFilter(this.sizeElt, function(v)
		{
			return /^\d*$/.test(v);	//digits
		});
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
				return FiniteObject.IsA(from.to);
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
			name:			'evaluate',
			icon:	// TODO needs new icon
`
<circle cx="80" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="80" r="60" fill="url(#radgrad1)"/>
<polyline class="svgstr3" points="50,40 30,40 30,120 50,120"/>
<polyline class="svgstr3" points="190,40 210,40 210,120 190,120"/>
<circle cx="260" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="280" r="60" fill="url(#radgrad1)"/>
<path class="svgfilNone svgstrThinGray" d="M80 100 A40 40 1 0 0 260 100"/>
<line class="svgstrThinGray" x1="160" y1="100" x2="160" y2="170"/>
<line class="svgstrThinGray" x1="160" y1="210" x2="160" y2="250"/>
`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = diagram.get('Evaluation', {domain:from.to});
		diagram.placeMorphismByObject(e, 'domain', from, m.name)
diagram.log({command:'evaluate', from:from.name});
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.IsA(ary[0]) && Evaluation.CanEvaluate(ary[0].to);
	}
}

class DistributeAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Distribute a product over a coproduct',
			name:			'distribute',
			icon:	// TODO needs new icon
`<circle class="svgstr4" cx="80" cy="80" r="60"/>
<line class="arrow0" x1="38" y1="38" x2="122" y2="122"/>
<line class="arrow0" x1="38" y1="122" x2="122" y2="38"/>
<line class="arrow0" x1="240" y1="80" x2="80" y2="240"/>
<circle class="svgstr4" cx="240" cy="240" r="60"/>
<line class="arrow0" x1="198" y1="198" x2="282" y2="282"/>
<line class="arrow0" x1="282" y1="198" x2="198" y2="282"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		this.doit(e, diagram, from);
		diagram.log({command:'distribute', from:from.name});
	}
	doit(e, diagram, from)
	{
		let m = null;
		if (Distribute.HasForm(diagram, ary))
			m = diagram.get('Distribute', {domain:from.to});
		if (Dedistribute.HasForm(diagram, ary))
			m = diagram.get('Dedistribute', {domain:from.to});
		diagram.placeMorphismByObject(e, 'domain', from, m.name)
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
			name:			'alignHorizontal',
			icon:
`<circle cx="80" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="240" cy="160" r="80" fill="url(#radgrad1)"/>
<line class="arrow6" x1="0" y1="160" x2="320" y2="160"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const elements = this.getItems(ary);
		this.doit(e, diagram, elements);
		diagram.log({command:'alignHorizontal', elements:elements.map(i => i.name)});
	}
	doit(e, diagram, items)
	{
		const elements = this.getItems(items);
		const xy = D.Grid(elements[0].getXY());		// basepoint
		elements.map(i =>
		{
			i.update({x:i.x, y:xy.y});
			i.finishMove();
		});
		diagram.updateMorphisms();
		diagram.update();
		D.toolbar.show(e);
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements);
	}
	getItems(ary)
	{
		return ary.filter(s => DiagramObject.IsA(s) || DiagramText.IsA(s));
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
			name:			'alignVertical',
			icon:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="240" r="80" fill="url(#radgrad1)"/>
<line class="arrow6" x1="160" y1="0" x2="160" y2="320""/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const elements = this.getItems(ary);
		this.doit(e, diagram, elements);
		diagram.log({command:this.name, elements:elements.map(i => i.name)});
	}
	doit(e, diagram, items, save = true)
	{
		const elements = this.getItems(items);
		const xy = elements[0].getXY();
		elements.shift();
		elements.map(i =>
		{
			i.update({x:xy.x, y:i.y});
			i.finishMove();
		});
		diagram.updateMorphisms();
		diagram.update(save);
		D.toolbar.show(e);
	}
	replay(e, diagram, args)
	{
		const elements = diagram.getElements(args.elements);
		this.doit(e, diagram, elements, false);
	}
	getItems(ary)
	{
		return ary.filter(s => DiagramObject.IsA(s) || DiagramText.IsA(s));
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
			name:			'tensor',
			icon:
`<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>
<circle cx="160" cy="160" r="80" class="svgfilNone svgstr1"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const elt = ary[0];
		if (DiagramMorphism.IsA(elt))
		{
			const morphisms = ary.map(m => m.to);
			const to = diagram.get('TensorMorphism', {morphisms});
			diagram.placeMorphism(e, to, D.Barycenter(ary));
		}
		else if (DiagramObject.IsA(elt))
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
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && DiagramObject.IsA(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.IsA(v), true));
	}
}

class AssertionAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Assert that two legs of a diagram commute.',
			name:			'assert',
			icon:
`<line class="arrow0" x1="120" y1="80" x2="120" y2="240"/>
<line class="arrow0" x1="120" y1="160" x2="240" y2="160"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.name, this);
	}
	action(e, diagram, ary)
	{
		const legs = Assertion.GetLegs(ary);
		const left = legs[0];
		const right = legs[1];
		this.doit(e, diagram, left, right);
		D.toolbar.show(e);
		diagram.log({command:this.name, left:left.map(m => m.name), right:right.map(m => m.name)});
	}
	doit(e, diagram, left, right, save = true)
	{
		if (!this.hasForm(diagram, [...left, ...right]))
			throw 'cannot form assertion';
		const cell = diagram.domain.getCell(left, right);
		const a = diagram.addAssertion(left, right);
		a.setCell(cell);
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
		diagram.pickElement(e, a);
		diagram.update(save);
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
			name:			'recursion',
			icon:	// TODO
`<path class="svgstr4" d="M40,160 C40,0 280,0 280,160 C280,280 100,280 80,160 C80,60 220,60 220,160 L220,180" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const recursor = ary[0].to;
		const form = ary[1].to;
		recursor.setRecursor(form);
		D.Status(e, `Data morphism ${recursor.htmlName()} is now recursive with morphism ${form.htmlName()}`);
		diagram.update();
	}
	hasForm(diagram, ary)
	{
		return DataMorphism.HasRecursiveForm(ary);
	}
}

class DataAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Convert to data morphism',
						name:			'data',
						icon:			D.svg.table,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		let to = from.to;
		if (to.constructor.name === 'Morphism')
		{
			diagram.deselectAll();
			diagram.codomain.deleteElement(to);
			from.to = null;	// TODO decrRefcnt()?
			from.setMorphism(new DataMorphism(diagram, to.json()));
			to = from.to;
			diagram.makeSelected(e, from);
			D.Status(e, `Morphism ${from.to.htmlName()} is now a data morphism`);
			diagram.update();
		}
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1)
		{
			const from = ary[0];
			const to = ary[0].to;
			if (diagram.isIsolated(from) && diagram.elements.has(to.basename) && Morphism.IsA(to) && !('code' in to))
				return  to.constructor.name === 'Morphism';
		}
		return false;
	}
}

class GraphAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Show morphism graph',
						name:			'graph',
						icon:			D.svg.string,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		ary.map(m => diagram.showGraph(m));
		diagram.update(false);
		diagram.log({command:this.name, morphisms:ary.map(m => m.name)});
	}
	hasForm(diagram, ary)
	{
		return ary.length >= 1 && ary.reduce((r, m) => r && DiagramMorphism.IsA(m), true);	// all morphisms
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
			elements:		{value:	new Map,	writable:	false},
			actions:		{value:	new Map,	writable:	false},
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`Category with ${this.elements.size} elements and ${this.actions.size} actions.`);
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
		for ([key, e] of this.elements)
			s += e.signature;
		return U.Sig(`${this.constructor.name} ${this.name} ${s}`);
	}
	process(diagram, data)
	{
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
		if (errMsg != '')
			D.RecordError(errMsg);
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
	deleteElement(elt)
	{
		this.elements.delete(elt.name);
		if (elt.diagram)
		{
			elt.diagram.elements.delete(elt.basename);
			if (!DiagramMorphism.IsA(elt) && !DiagramObject.IsA(elt))
				R.RemoveEquivalences(elt.diagram, elt.name);
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
			CatObject.IsA(e) && fn(e);
		}, this);
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(function(e)
		{
			if (Morphism.IsA(e))
				fn(e);
		}, this);
	}
	clear()
	{
		Array.from(this.elements).reverse().map((a, i) => a[1].refcnt > 0 ? a[1].decrRefcnt() : null);
		this.elements.clear();
	}
	static IsSink(ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		if (!ary.reduce((r, m) => r && DiagramMorphism.IsA(m), true))	// all morphisms
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
		if (!ary.reduce((r, m) => r && DiagramMorphism.IsA(m), true))	// all morphisms
			return false;
		const domain = ary[0].domain.name;
		for(let i=1; i<ary.length; ++i)
		{
			if (ary[i].domain.name !== domain)
				return false;
		}
		return true;
	}
	static IsA(obj)
	{
		return Category.prototype.isPrototypeOf(obj);
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
			dom:	{value: domain,		writable: true,	enumerable: true},
			cod:	{value: codomain,	writable: true,	enumerable: true},
		});
		Object.defineProperty(this, 'domain',
		{
			get()
			{
				return this.dom;
			},
			set(o)
			{
				if (this.dom)
					this.dom.decrRefcnt();
				this.dom = o;
				o.incrRefcnt();
			},
		});
		Object.defineProperty(this, 'codomain',		
		{
			get()
			{
				return this.cod;
			},
			set(o)
			{
				if (this.cod)
					this.cod.decrRefcnt();
				this.cod = o;
				o.incrRefcnt();
			},
		});
		if ('code' in args)
		{
			Object.defineProperty(this, 'code', {value:args.code,	writable:false});
			this.signature = U.SigArray([this.signature, U.Sig(this.code)]);
		}
		diagram && diagram.addElement(this);
		this.codomain.incrRefcnt();
		this.domain.incrRefcnt();
	}
	setDomain(dom)
	{
		if (dom === this.dom)
			return;
		if (this.dom)
			this.dom.decrRefcnt();
		dom.incrRefcnt();
		this.dom = dom;
	}
	setCodomain(cod)
	{
		if (cod === this.cod)
			return;
		if (this.cod)
			this.cod.decrRefcnt();
		cod.incrRefcnt();
		this.cod = cod;
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() +
			H.p(this.diagram ? this.diagram.htmlName() : '') +
			H.p(`Domain: ${this.domain.htmlName()}`) +
			H.p(`Codomain: ${this.codomain.htmlName()}`);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.domain && this.domain.decrRefcnt();
			this.codomain && this.codomain.decrRefcnt();
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
		if ('code' in this)
			a.code = U.Clone(this.code);
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
		const graph = new Graph(this.diagram, data.position, 0, [domGraph, codGraph]);
		return graph;
	}
	hasInverse()
	{
		return false;	// fitb
	}
	getInverse()
	{
		return null;	// fitb
	}
	loadEquivalence()	// don't call in Morphism constructor since signature may change
	{
		const diagram = this.diagram;
		const sig = this.signature;
		R.LoadEquivalence(diagram, this, [this], [this]);
		const domIdSig = Identity.Signature(diagram, this.domain);
		R.LoadEquivalentSigs(diagram, this, [sig], [domIdSig, sig]);
		const codIdSig = Identity.Signature(diagram, this.codomain)
		R.LoadEquivalentSigs(diagram, this, [sig], [sig, codIdSig]);
		if (this.diagram.codomain.actions.has('product'))
		{
				const domTermSig = TerminalMorphism.Signature(diagram, false, this.domain);
				const codTermSig = TerminalMorphism.Signature(diagram, false, this.codomain);
				R.LoadEquivalentSigs(diagram, this, [domTermSig], [sig, codTermSig]);
		}
		if (this.diagram.codomain.actions.has('coproduct'))
				R.LoadEquivalentSigs(diagram, this, [TerminalMorphism.Signature(diagram, true, this.domain)], [sig, TerminalMorphism.Signature(diagram, true, this.codomain)]);
	}
	static IsA(m)
	{
		return Morphism.prototype.isPrototypeOf(m);
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
		nuArgs.basename = Identity.Basename({domain:nuArgs.domain, codomain:nuArgs.codomain});
		nuArgs.properName = Identity.ProperName(nuArgs.domain, nuArgs.codomain);
		nuArgs.description = `Identity for the object ${nuArgs.domain.properName}`;
		super(diagram, nuArgs);
		this.signature = Identity.Signature(diagram, this.domain);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Identity');
	}
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		if (this.domain === this.codomain)
		{
			g.graphs[0].bindGraph({cod:g.graphs[1], index:[], domRoot:[0], codRoot:[1], offset:0, tag:this.constructor.name});
			g.tagGraph(this.constructor.name);
		}
		return g;
	}
	static Basename(args)
	{
		const domain = args.domain;
		const codomain = 'codomain' in args ? args.codomain : null;
		let basename = '';
		if (codomain && domain.name !== codomain.name)
			basename = `Id{${domain.name},${codomain.name}}dI`;
		else
			basename = `Id{${domain.name}}dI`;
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
			if (NamedObject.IsA(codomain))
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
		}
		if (ProductObject.IsA(obj))
			codename = ProductMorphism.Codename(diagram, {morphisms:fn(obj), dual:domain.dual});
		else if (HomObject.IsA(obj))
			codename = HomMorphism.Codename(diagram, {morphisms:fn(obj)});
		if (!codomain && codename)
			return codename;
		const basename = codomain ? Identity.Basename({domain, codomain}) : Identity.Basename({domain});
		return Element.Codename(diagram, {basename});
	}
	static ProperName(domain, codomain = null)
	{
		return '1';
	}
	static Signature(diagram, obj)
	{
		if (ProductObject.IsA(obj))
			return ProductMorphism.Signature(obj.objects.map(o => Identity.Signature(diagram, o)), obj.dual);
		else if (HomObject.IsA(obj))
			return HomMorphism.Signature(obj.objects);
		return U.Sig(Identity.Codename(diagram, {domain:obj}));
	}
	static IsA(obj)
	{
		return Identity.prototype.isPrototypeOf(obj);
	}
	static LoadEquivalence(diagram, obj, dual)
	{
		if (ProductObject.IsA(obj))
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = ProductMorphism.Signature(subs, this.dual);
			R.LoadEquivalentSigs(diagram, this, [this.signature], [op])
		}
		else if (HomObject.IsA(obj))
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = HomMorphism.Signature(subs);
			R.LoadEquivalentSigs(diagram, this, [this], [op])
		}
	}
	static Get(diagram, args)
	{
		const domain = diagram.getElement(args.domain);
		const codomain = 'codomain' in args ? diagram.getElement(args.codomain) : null;
		const name = Identity.Codename(diagram, {domain, codomain});
		const m = diagram.getElement(name);
		if (!codomain)
		{
			if (ProductObject.IsA(domain))
				return diagram.get('ProductMorphism', {morphisms:domain.objects.map(o => diagram.get('Identity', {domain:o})), dual:domain.dual});
			else if (HomObject.IsA(domain))
				return diagram.get('HomMorphism', {morphisms:domain.objects.map(o => diagram.get('Identity', {domain:o}))});
		}
		return m ? m : new Identity(diagram, {name, domain, codomain});
	}
}

class NamedObject extends CatObject	// name of an object
{
	constructor (diagram, args)
	{
		const nuArgs = U.Clone(args);
		const source = diagram.getElement(args.source);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.signature = this.source.signature;
		this.source.incrRefcnt();
		this.idFrom = diagram.get('Identity', {domain:this, codomain:this.source});
		this.idTo = diagram.get('Identity', {domain:this.source, codomain:this});
		this.refcnt = 0;	// id's increased it so set it back
	}
	json()
	{
		const a = super.json();
		a.source = this.source.name;
		return a;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.source.decrRefcnt();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Named Object');
	}
}

class NamedMorphism extends Morphism	// name of a morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.Clone(args);
		const source = diagram.getElement(nuArgs.source);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.signature = this.source.signature;
		this.source.incrRefcnt();
		if (this.constructor.name === 'NamedMorphism')
			this.signature = this.source.sig;
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
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Named Morphism');
	}
	loadEquivalence()	// don't call in Morphism constructor since signature may change
	{
		super.loadEquivalence();
		R.LoadEquivalence(this.diagram, this, [this], [this.source]);
	}
	getGraph(data = {position:0})
	{
		const oldData = U.Clone(data);
		const graph = super.getGraph(data);
		const srcGraph = this.source.getGraph(oldData);
		graph.graphs[0].copyGraph({src:srcGraph.graphs[0], map:[[[1], [1]]]});
		graph.graphs[1].copyGraph({src:srcGraph.graphs[1], map:[[[0], [0]]]});
		return graph;
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
		super(diagram, nuArgs);
		this.incrRefcnt();
		if (this.setMorphism(this.diagram.getElement(nuArgs.to)))
			this.diagram.domain.addMorphism(this);
		else
		{
			this.diagram.elements.delete(this.name);
			this.diagram.domain.elements.delete(this.name);
		}
		Object.defineProperties(this,
		{
			flipName:	{value: U.GetArg(args, 'flipName', false),	writable: true,	enumerable: true},
			svg_path:	{value: null,	writable: true,	enumerable: true},
			svg_name:	{value: null,	writable: true,	enumerable: true},
		});
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
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Morphism in index category');
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1 && this.to)
		{
			this.to.decrRefcnt();
			this.removeSVG();
		}
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			this.domain.domains.delete(this);
			this.codomain.codomains.delete(this);
			if (this.diagram && this.diagram.isIsolated(this.domain))
				this.domain.decrRefcnt();
			if (this.diagram && this.diagram.isIsolated(this.codomain))
				this.codomain.decrRefcnt();
			this.diagram.domain.removeMorphism(this);
		}
	}
	json()
	{
		try
		{
			let mor = super.json();
			mor.flipName = this.flipName;
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
		if  (!to && this.to !== to)
			return null;
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
		return true;
	}
	getNameOffset()
	{
		const {pt1, pt2} = 'bezier' in this ? {pt1:this.bezier.cp1, pt2:this.bezier.cp2} : {pt1:this.start, pt2:this.end};
		const mid = pt1.add(pt2).scale(0.5);
		const normal = D2.Subtract(pt2, pt1).normal().scale(this.flipName ? 1 : -1).normalize();
		const adj = (normal.y < 0 && 'bezier' in this) ? 0.5 : 0.0;
		const r = normal.scale((normal.y > 0 ? 1 + normal.y/2 : adj + 0.5) * D.default.font.height).add(mid);
		if (isNaN(r.x) || isNaN(r.y))
			return new D2;
		return r;
	}
	getSVG(node, replace = false)
	{
		this.predraw();
		const off = this.getNameOffset();
		if (isNaN(off.x) || isNaN(off.y))
			throw 'bad name offset';
		const coords = 'bezier' in this ? 
				`M${this.start.x},${this.start.y} C${this.bezier.cp1.x},${this.bezier.cp1.y} ${this.bezier.cp2.x},${this.bezier.cp2.y} ${this.end.x},${this.end.y}`
			:
				`M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}`;
		const id = this.elementId();
		const g = document.createElementNS(D.xmlns, 'g');
		node.appendChild(g);
		this.svg = g;
		g.setAttributeNS(null, 'id', id);
		const path = document.createElementNS(D.xmlns, 'path');
		g.appendChild(path);
		path.setAttributeNS(null, 'data-type', 'morphism');
		path.setAttributeNS(null, 'data-name', this.name);
		path.setAttributeNS(null, 'class', 'morphism grabble');
		path.setAttributeNS(null, 'id', `${id}_path`);
		path.setAttributeNS(null, 'd', coords);
		path.setAttributeNS(null, 'marker-end', 'url(#arrowhead)');
		const name = this.name;
		const mouseenter = function(e) { Cat.D.Mouseover(event, name, true);};
		const mouseleave = function(e) { Cat.D.Mouseover(event, name, false);};
		const mousedown = function(e) { Cat.R.diagram.pickElement(event, name);};
		path.addEventListener('mouseenter', mouseenter);
		path.addEventListener('mouseleave', mouseleave);
		path.addEventListener('mousedown', mousedown);
		const text = document.createElementNS(D.xmlns, 'text');
		g.appendChild(text);
		text.setAttributeNS(null, 'data-type', 'morphism');
		text.setAttributeNS(null, 'data-name', this.name);
		text.setAttributeNS(null, 'class', 'morphTxt');
		text.setAttributeNS(null, 'id', `${id}_name`);
		text.setAttributeNS(null, 'x', off.x);
		text.setAttributeNS(null, 'y', off.y + D.default.font.height/2);
		text.innerHTML = this.to.htmlName();
		text.addEventListener('mouseenter', mouseenter);
		text.addEventListener('mouseleave', mouseleave);
		text.addEventListener('mousedown', mousedown);
		this.svg_path = document.getElementById(id + '_path');
		this.svg_name = document.getElementById(id + '_name');
	}
	elementId()
	{
		return this.name.replace(/{}:/, '_');	// TODO check this
	}
	showSelected(state = true)
	{
		try
		{
			this.svg_path.classList[state ? 'add' : 'remove']('selected');
			this.svg_name.classList[state ? 'add' : 'remove']('selected');
			this.svg && this.svg.classList[state ? 'add' : 'remove']('selected');
			this.diagram.svgBase[state ? 'prepend' : 'appendChild'](this.svg);
		}
		catch(x)
		{
		}
	}
	updateFusible(e, on)
	{
		const path = this.svg_path;
		const name = this.svg_name;
		if (on)
		{
			D.Status(e, 'Fuse');
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
			D.Status(e, '');
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
		let anchor = 'middle';
		const angle = this.angle;
		const bnd = Math.PI/12;
		if (angle > Math.PI + bnd && angle < 2 * Math.PI - bnd)
			anchor = this.flipName ? 'start' : 'end';
		else if (angle > bnd && angle < Math.PI - bnd)
			anchor = this.flipName ? 'end' : 'start';
		svg.setAttribute('text-anchor', anchor);
	}
	getBBox()
	{
		return D2.Merge(this.domain.getBBox(), this.codomain.getBBox());
	}
	predraw()
	{
		const domBBox = this.domain.svg.getBBox();
		const codBBox = this.codomain.svg.getBBox();
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
		const ndx = this.homSetIndex;
		if (ndx >= 0)
		{
			const midpoint = {x:(this.start.x + this.end.x)/2, y:(this.start.y + this.end.y)/2};
			const normal = this.end.subtract(this.start).normal().normalize();
			const band = Math.trunc(ndx/2);
			const alt = ndx % 2;
			const sign = alt > 0 ? -1 : 1;
			const offset = normal.scale(2 * D.default.font.height * (band + 1) * sign);
			const w = normal.scale(10 * (1 + (ndx / 2)) * sign);
			this.start = this.start.add(w).round();
			this.end = this.end.add(w).round();
			let cp1 = offset.add(this.start.add(midpoint).scale(0.5)).round();
			let cp2 = offset.add(this.end.add(midpoint).scale(0.5)).round();
			this.bezier = {cp1, cp2, index:ndx, offset};
		}
		else
			delete this.bezier;
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
		const svg = this.svg_path;
		const start = this.start;
		const end = this.end;
		if (svg !== null && typeof start.x !== 'undefined')
		{
			if ('bezier' in this)
				svg.setAttribute('d', `M${start.x},${start.y} C${this.bezier.cp1.x},${this.bezier.cp1.y} ${this.bezier.cp2.x},${this.bezier.cp2.y} ${end.x},${end.y}`);
			else
				svg.setAttribute('d', `M${start.x},${start.y} L${end.x},${end.y}`);
			this.updateDecorations();
		}
		if ('graph' in this)
			this.graph.updateGraph({root:this.graph, index:[], dom:this.domain.name, cod:this.codomain.name, visited:[], elementId:this.elementId()});
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
		return false;
	}
	removeGraph()
	{
		const id = this.graphId();
		const svgElt = document.getElementById(id);
		if (svgElt !== null)
		{
			svgElt.remove();
			return true;
		}
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
		if (!('graph' in this))
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
							{index:[], root:this.graph, dom:dom.name, cod:cod.name, visited:[], elementId:this.elementId(), color:Math.floor(Math.random()*12)});
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
	static IsA(m)
	{
		return DiagramMorphism.prototype.isPrototypeOf(m);
	}
}

class Cell extends DiagramCore
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.basename = diagram.getAnon('c');
		super(diagram, nuArgs);
		this.properName = U.GetArg(nuArgs, 'properName', '');
		this.left = nuArgs.left;
		this.right = nuArgs.right;
		this.signature = Cell.Signature(this.left, this.right);
		this.to = null;
		this.description = '';
		this.commutes = 'unknown'
	}
	setCommutes(com)
	{
		this.commutes = com;
		switch(com)
		{
			case 'assertion':
				this.properName = D.default.cell.assertion;
				break;
			case 'composite':
				this.properName = D.default.cell.composite;
				break;
			case 'computed':
				this.properName = D.default.cell.computed;
				break;
			case 'named':
				this.properName = D.default.cell.named;
				break;
			case 'unknown':
			default:
				this.properName = D.default.cell.unknown;
				break;
		}
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
		const r = D.Barycenter([...this.left, ...this.right]);
		if (isNaN(r.x) || isNaN(r.y))
			return new D2;
		return r;
	}
	getSVG(node, replace = false)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const sig = this.signature;
		const mouseenter = function(e) { Cat.R.diagram.emphasis(sig, true);};
		const mouseleave = function(e) { Cat.R.diagram.emphasis(sig, false);};
		const mousedown = function(e) { Cat.R.diagram.pickElement(event, sig);};
		const svg = document.createElementNS(D.xmlns, 'text');
		node.appendChild(svg);
		this.svg = svg;
		svg.setAttributeNS(null, 'data-type', 'assertion');
		svg.setAttributeNS(null, 'data-name', this.name);
		svg.setAttributeNS(null, 'text-anchor', 'middle');
		svg.setAttributeNS(null, 'x', this.x);
		svg.setAttributeNS(null, 'y', this.y + D.default.font.height/2);	// TODO should be this.height?
		svg.innerHTML = this.description;
		svg.addEventListener('mouseenter', mouseenter);
		svg.addEventListener('mouseleave', mouseleave);
		svg.addEventListener('mousedown', mousedown);
		this.setGlow();
	}
	removeSVG()
	{
		this.svg && this.svg.parentNode.removeChild(this.svg);
	}
	update()
	{
		const xy = this.getXY();
		if (isNaN(xy.x) || isNaN(xy.y))
			throw 'NaN!';
		if (this.svg)
		{
			this.svg.innerHTML = this.htmlName();
			this.svg.setAttribute('x', xy.x);
			this.svg.setAttribute('y', xy.y);
		}
	}
	getObjects()
	{
		const morphs = [...this.left, ...this.right];
		const objs = new Set;
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
		}
		if (!checkObjects(this.left))
			return false;
		if (!checkObjects(this.right))
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
			function cmp(a, b)
			{
				return NamedMorphism.IsA(a.to) && a.to.source === b.to;
			}
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
			cell = new Cell(diagram, {left, right, item:sig, properName:''});
		diagram.domain.cells.set(sig, cell);
		return cell;
	}
	static CommonLink(left, right)
	{
		return left.filter(m => right.indexOf(m) !== -1);
	}
	static HasSubCell(cells, left, right)
	{
		const legHasObject = function(leg, obj)
		{
			return leg.reduce((r, m) => r || m.codomain === obj, false);
		}
		const cellCheck = function(cell, left, right)
		{
			let leftCommon = Cell.CommonLink(cell.left, left);
			let rightCommon = Cell.CommonLink(cell.right, right);
			if (leftCommon.length > 0 && rightCommon.length > 0)
				return true;
			leftCommon = Cell.CommonLink(cell.left, right);
			rightCommon = Cell.CommonLink(cell.right, left);
			return leftCommon.length > 0 && rightCommon.length > 0;
		}
		let result = false;
		cells.forEach(function(cell)
		{
			result = result || cellCheck(cell, left, right);
		});
		return result;
	}
	static IsA(c)
	{
		return Cell.prototype.isPrototypeOf(c);
	}
}

class DiagramComposite extends DiagramMorphism
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.morphisms = args.morphisms.map(m => diagram.domain.getElement(m));
		this.morphisms.map((m, i) => { m.incrRefcnt(); });
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.domain.nodes.delete(this);
			this.morphisms.map((m, i) =>
			{
				m.codomain.nodes.delete(this);
				m.decrRefcnt();
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
	static IsA(m)
	{
		return DiagramComposite.prototype.isPrototypeOf(m);
	}
	static CellIsComposite(cell)
	{
		function fn(left, right)
		{
			if (left.length === 1 && DiagramComposite.IsA(left[0]))
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
			'homSets': 		{value:new Map, writable: false},
			'cells':		{value:new Map, writable: false},
		});
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Index category');
	}
	json(a = {})
	{
		a = super.json(a);
		return a;
	}
	clear()
	{
		super.clear();
		this.homSets.clear();
		this.cells.forEach(function(c) { c => c.deregister(); });
	}
	getHomSet(domain, codomain)
	{
		const key = IndexCategory.HomKey(domain, codomain);
		return this.homSets.has(key) ? this.homSets.get(key) : [];
	}
	updateHomSetIndices(m)
	{
		const homset = this.getHomSet(m.domain, m.codomain);
		const dual = this.getHomSet(m.codomain, m.domain);
		const homLength = homset.length;
		const dualLength = dual.length;
		homset.map((m, i) => m.homSetIndex = (homLength === 1 ? -1 : i) + dualLength);
		dual.map((m, i) => m.homSetIndex = (dualLength === 1 ? -1 : i) + homLength);
	}
	addMorphism(m)
	{
		const domMorphs = m.domain.domains;
		domMorphs.add(m);
		const codMorphs = m.codomain.codomains;
		codMorphs.add(m);
		const key = IndexCategory.HomKey(m.domain, m.codomain);
		if (!this.homSets.has(key))
			this.homSets.set(key, []);
		const homset = this.homSets.get(key);
		homset.push(m);
		const dualHomset = this.getHomSet(m.codomain, m.domain);
		const dualLength = dualHomset.length;
		this.updateHomSetIndices(m);
	}
	removeMorphism(m)
	{
		const domain = m.domain;
		const codomain = m.codomain;
		const key = IndexCategory.HomKey(domain, codomain);
		const homset = this.homSets.has(key) ? this.homSets.get(key) : [];
		const ndx = homset.indexOf(m);
		if (ndx > -1)
			homset.splice(ndx, 1);
		this.updateHomSetIndices(m);
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
		this.elements.delete(from.name);
		this.elements.set(from.name, from);	// reset the order in the map
		const badCells = new Set;
		obj.nodes.forEach(function(cell)
		{
			if (Cell.IsA(cell) && ((cell.left.indexOf(from) !== -1) || (cell.right.indexOf(from) !== -1)))
				badCells.add(cell);
		});
		badCells.forEach(function(cell)
		{
			cell.deregister();
		});
		return detachedObj;
	}
	getCell(left, right)
	{
		const sig = Cell.Signature(left, right);
		return this.cells.get(sig);
	}
	makeCells(diagram)
	{
		this.cells.forEach(function(cell) { cell.deregister(); });
		const that = this;
		this.forEachObject(function(o)
		{
			if (o.domains.size > 1)
			{
				const paths = [];
				o.domains.forEach(function(m) { paths.push([m]); });
				const legs = [];
				const visited = new Map;	// object to leg that gets there
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
							if (Cell.HasSubCell(that.cells, leg, alt))
							{
								const badCells = new Set;
								cells.map(cell =>
								{
									if (Cell.CommonLink(cell.left, alt).length > 0 || Cell.CommonLink(cell.right, alt).length > 0)
										badCells.add(cell);
								});
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
						if (leg.indexOf(m) === -1)
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
			const flatLeft = diagram.flatten(left.map(m => m.to));
			const flatRight = diagram.flatten(right.map(m => m.to));
			R.workers.equality.postMessage(
				{
					command:'CheckEquivalence',
					diagram:diagram.name,
					cell:cell.signature,
					leftLeg:flatLeft.map(m => m.signature),
					rightLeg:flatRight.map(m => m.signature)
				});
		});
	}
	static HomKey(domain, codomain)
	{
		return `${CatObject.IsA(domain) ? domain.name : domain} ${CatObject.IsA(codomain) ? codomain.name : codomain}`;
	}
	static IsA(obj)
	{
		return IndexCategory.prototype.isPrototypeOf(obj);
	}
}

class MultiMorphism extends Morphism
{
	constructor(diagram, args)
	{
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
	help(hdr, helped)
	{
		return super.help() + this.morphisms.map(m => m.help(helped)).join('');
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
	moreHelp()
	{
		return H.table(H.tr(H.th('Morphisms', '', '', '', 'colspan=2')) + this.morphisms.map(m => H.tr(H.td(m.diagram.htmlName()) + H.td(m.htmlName(), 'left'))).join(''));
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
	static IsA(m)
	{
		return MultiMorphism.prototype.isPrototypeOf(m);
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
		nuArgs.properName = Composite.ProperName(morphisms);
		nuArgs.category = diagram.codomain;
		nuArgs.description = 'description' in args ? args.description : `The morphism ${nuArgs.properName} is the composite of ${morphisms.map(m => m.properName).join(', ')}.`;
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		helped.add(this.name);
		return super.help(H.p('Composite'), helped);
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
		const seqGraph = sequence.getGraph();
		graphs.map((g, i) =>
		{
			seqGraph.graphs[i].mergeGraphs({from:g.graphs[0], base:[0], inbound:[i], outbound:[i+1]});
			seqGraph.graphs[i+1].mergeGraphs({from:g.graphs[1], base:[1], inbound:[i+1], outbound:[i]});
		});
		seqGraph.traceLinks(seqGraph);
		const ndx = this.morphisms.length;
		graph.graphs[0].copyGraph({src:seqGraph.graphs[0], map:[[[1], [1]]]});
		graph.graphs[1].copyGraph({src:seqGraph.graphs[ndx], map:[[[0], [0]]]});
		return graph;
	}
	getFirstMorphism()
	{
		const m = this.morphisms[0];
		if (Composite.IsA(m))
			return m.getFirstMorphism();
		return m;
	}
	loadEquivalence()
	{
		super.loadEquivalence();
		R.LoadEquivalence(this.diagram, this, [this], this.morphisms);
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
	static IsA(m)
	{
		return Composite.prototype.isPrototypeOf(m);
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
	}
	json()
	{
		const a = super.json();
		if (this.dual)
			a.dual = true;
		return a;
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p(this.dual ? 'Coproduct' : 'Product'), helped);
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
	loadEquivalence()
	{
		super.loadEquivalence();
		this.morphisms.map((m, i) =>
		{
			const pDom = FactorMorphism.Signature(this.diagram, this.domain, [i], this.dual);
			const pCod = FactorMorphism.Signature(this.diagram, this.codomain, [i], this.dual);
			if (this.dual)
				R.LoadEquivalence(this.diagram, this, [this, pCod], [pDom, m]);
			else
				R.LoadEquivalence(this.diagram, this, [pCod, this], [m, pDom]);
		});
	}
	static Basename(diagram, args)
	{
		const dual = 'dual' in args ? args.dual : false;
		const c = dual ? 'C' : '';
		if (Morphism.IsA(args.morphisms[0]))
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p(`${this.dual ? 'Co' : 'P'}roduct assembly`), helped);
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
	loadEquivalence()
	{
		super.loadEquivalence();
		this.morphisms.map((m, i) =>
		{
			const pCod = this.diagram.get('FactorMorphism', {domain:this.codomain, factors:[i], dual:this.dual});
			R.LoadEquivalence(this.diagram, this, [m], this.dual ? [this, pCod] : [pCod, this]);
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
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.cofactors = U.GetArg(args, 'cofactors', null);
		nuArgs.codomain = FactorMorphism.Codomain(diagram, nuArgs.domain, nuArgs.factors, dual, nuArgs.coFactors);
		if (dual)
			[nuArgs.domain, nuArgs.codomain] = [nuArgs.codomain, nuArgs.domain];
		nuArgs.basename = FactorMorphism.Basename(diagram, {domain:dual ? nuArgs.codomain : nuArgs.domain, factors:nuArgs.factors, dual, cofactors:nuArgs.cofactors});
		nuArgs.properName = FactorMorphism.ProperName(diagram, dual ? nuArgs.codomain : nuArgs.domain, nuArgs.factors, dual, nuArgs.cofactors);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.factors = nuArgs.factors;
		this.signature = FactorMorphism.Signature(this.diagram, nuArgs.domain, nuArgs.factors, dual, nuArgs.cofactors)
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`${this.dual ? 'Cofactor' : 'Factor'} morphism: ${this.factors}`);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
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
		const domain = graph.graphs[0];
		const codomain = graph.graphs[1];
		if (this.cofactors)
		{
			// TODO
		}
		else
		{
			let offset = 0;
			this.factors.map((index, i) =>
			{
				const d = domain.getFactor(index);
				if (d === null)
				{
					++offset;
					return;
				}
				const cod = this.factors.length === 1 ? codomain : codomain.getFactor([i]);
				const domRoot = index.slice();
				domRoot.unshift(0);
				d.bindGraph({cod, index, tag:this.constructor.name, domRoot, codRoot:this.factors.length > 1 ? [1, i] : [1], offset});	// TODO dual name
			});
			graph.tagGraph(this.dual ? 'Cofactor' : ' Factor');
		}
		return graph;
	}
	loadEquivalence()
	{
		super.loadEquivalence();
		if (this.cofactors)
		{
			// TODO
		}
		else if (this.factors.length > 1)
		{
			this.factors.map((f, i) =>
			{
				const fm = this.diagram.get('FactorMorphism', {domain:this.codomain, factors:[i], dual:this.dual});
				const base = this.diagram.get('FactorMorphism', {domain:this.domain, factors:[this.factors[i]], dual:this.dual});
				R.LoadEquivalence(this.diagram, this, [base], [fm, this]);
			});
		}
	}
	static Basename(diagram, args)
	{
		const factors = args.factors;
		const dual = 'dual' in args ? args.dual : false;
		const cofactors = 'cofactors' in args ? args.cofactors : null;
		const c = this.dual ? 'C' : '';
		const domain = diagram.getElement(args.domain);
		let basename = `${c}Fa{${domain.name},`;
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = domain.getFactor(indices);
			if (TerminalObject.IsA(f))	// TODO dual object
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
			return factors.length > 1 ? diagram.get('ProductObject', {objects:factors.map(f => f === -1 ? diagram.getTerminal(dual) : domain.getFactor(f)), dual}) : domain.getFactor(factors[0]);
	}
	static ProperName(diagram, domain, factors, dual, cofactors = null)
	{
		return `&lt;${factors.map(f => f === -1 ? diagram.getTerminal(dual).properName : domain.getFactorProperName(f)).join(',')}&gt;`;	// TODO cofactors
	}
	static Signature(diagram, domain, factors, dual, cofactors = null)
	{
		const sigs = [dual];
		if (!cofactors)
			factors.map(f => sigs.push(Identity.Signature(diagram, f === -1 ? diagram.getTerminal(this.dual) : domain.getFactor(f)), f));
		else
			throw 'TODO';
		return U.SigArray(sigs);
	}
}

class DataMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = diagram.getElement(args.codomain);
		nuArgs.properName = U.GetArg(nuArgs, 'properName', 'Data');
		nuArgs.basename = U.GetArg(nuArgs, 'basename', diagram.getAnon('data'));
		super(diagram, nuArgs);
		if ('data' in nuArgs)
		{
			const data = nuArgs.data;
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
					this.data = new Map;
			}
			else if (Map.prototype.isPrototypeOf(nuArgs.data))
				this.data = new Map(nuArgs.data);
		}
		else
			this.data = new Map;
		if ('limit' in nuArgs)
			this.limit = U.GetArg(nuArgs, 'limit', Number.MAX_SAFE_INTEGER);	// TODO rethink the limit
		if ('recursor' in nuArgs)
			this.setRecursor(args.recursor);
		this.signature = this.getDataSignature();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		const recursion = 'recursor' in this ? ` with recursor ${this.recursor.properName}` : '';
		return super.help() + H.p(`Data morphism entries: ${this.data.size}${recursion}`);
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
	getDataSignature()
	{
		let sig = this.getElementSignature();
		this.data.forEach(function(d, i)
		{
			sig = U.SigArray([sig, U.Sig(i.toString()), U.Sig(d.toString())]);
		});
		if ('recursor' in this && typeof this.recursor !== 'string')
			sig = U.SigArray([sig, this.recursor.sig]);
		return sig;
	}
	json()
	{
		let mor = super.json();
		mor.data = U.JsonMap(this.data);
		if ('limit' in this)
			mor.limit = this.limit;
		if ('recursor' in this)
			mor.recursor = this.recursor.name;
		return mor;
	}
	clear()
	{
		this.data = new Map;
	}
	static HasRecursiveForm(ary)
	{
		if (ary.length === 2)
		{
			const r = ary[0];
			const f = ary[1];
			if (DiagramMorphism.IsA(r) && DiagramMorphism.IsA(f) && DataMorphism.IsA(r.to))
				return f.to.hasMorphism(r.to);
		}
		return false;
	}
	static IsA(m)
	{
		return DataMorphism.prototype.isPrototypeOf(m);
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
		super(diagram, nuArgs);
		if (!('properName' in nuArgs))
			this.properName = LambdaMorphism.ProperName(preCurry, args.domFactors, args.homFactors);
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = args.homFactors;
		if (!('description' in nuArgs))
			this.description = `The currying of the morphism ${this.preCurry.properName} by the factors ${U.a2s(this.homFactors)}`;
		this.signature = this.getLambdaSignature();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`Lambda morphism of pre-curry ${this.preCurry.htmlName()} and domain factors [${this.domFactors}] and codomain factors [${this.homFactors}]`);
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
	loadEquivalence(diagram)
	{
		super.loadEquivalence(diagram);
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
		this.domFactors.map((f, i) => (dom.isLeaf() ? dom : dom.graphs[i]).copyGraph({map, src:preCurryGraph.getFactor(f)}));
		this.homFactors.map((f, i) => (homDom.isLeaf() ? homDom : homDom.graphs[i]).copyGraph({map, src:preCurryGraph.getFactor(f)}));
		homCod.copyGraph({map, src:preCurryGraph.graphs[1]});
		graph.tagGraph(this.constructor.name);
		return graph;
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
		const isCodHom = HomObject.IsA(preCurry.codomain);
		let codomain = isCodHom ? preCurry.codomain.minimalHomDom() : preCurry.codomain;
		const fctrs = factors.slice();
		let objects = [];
		let isProd = true;
		while(fctrs.length > 0)
		{
			const f = fctrs.pop();
			if (Array.isArray(f))
				objects.push(seq.getFactor(f));
			else if (f === -1)	// add to products at this level
				isProd = true;
			else if (f === -2)	// form hom level
			{
				codomain = diagram.get('HomObject', {objects: [diagram.get('ProductObject', {objects}), codomain]});
				objects = [];
				isProd = false;
			}
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
			const g = f.slice();
			g.shift();
			return g.toString();
		}).join();
		const hf = homFactors.map(f =>
		{
			if (Array.isArray(f))
			{
				const g = f.slice();
				g.shift();
				return g.toString();
			}
			return f.toString();	// for -1 & -2
		}).join();
		return `&lambda;${preCurry.properName}${U.subscript(df)},${U.subscript(hf)}`;
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Hom'), helped);
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Evaluation');
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
	static CanEvaluate(object)
	{
		return ProductObject.IsA(object) &&
			object.objects.length === 2 &&
			HomObject.IsA(object.objects[0]) &&
			object.objects[0].objects[0].isEquivalent(object.objects[1]);
	}
	static Basename(diagram, args)
	{
		return `Ev{${args.object.name}}vE`;
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

class TerminalMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const dual = U.GetArg(args, 'dual', false);
		const nuArgs = U.Clone(args);
		const domain = diagram.getElement(dual ? args.codomain : args.domain);
		const codomain = TerminalMorphism.Codomain(diagram, dual);
		[nuArgs.domain, nuArgs.codomain] = dual ? [codomain, domain] : [domain, codomain];
		nuArgs.basename = TerminalMorphism.Basename(diagram, {domain, dual});
		nuArgs.properName = TerminalMorphism.ProperName(dual);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p(`${this.dual ? 'Initial' : 'Terminal'} morphism`));
	}
	static Basename(diagram, args)
	{
		const c = args.dual ? 'C' : 'c';
		return `${c}Te{${args.domain.name}}eT${c}`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:TerminalMorphism.Basename(diagram, args)});
	}
	static ProperName(dual)
	{
		return dual ? '&empty;' : '&#10034;';
	}
	static Codomain(diagram, dual = false)
	{
		return diagram.get('ProductObject', {objects:[], dual});
	}
	static Signature(diagram, dual, domain)
	{
		return TerminalObject.IsA(domain) && dual === domain.dual ? Identity.Signature(diagram, domain) : U.Sig(TerminalMorphism.Codename(diagram, {dual, domain}));
	}
}

class Distribute extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = Distribute.Codomain(diagram, nuArgs.domain);
		nuArgs.basename = Distribute.Basename(diagram, {domain:nuArgs.domain});
		nuArgs.properName = Distribute.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		return super.help(H.p('Distribute a product over a coproduct'));
	}
	hasInverse()
	{
		return true;
	}
	getInverse()
	{
		return this.diagram.get('Dedistribute', {domain:this.codomain});
	}
	static Basename(diagram, args)
	{
		return `Di{${args.domain.name}}iD`;
	}
	static Codename(diagram, args)
	{
		return Element.Codename(diagram, {basename:Distribute.Basename(diagram, args)});
	}
	static Get(diagram, args)
	{
		const name = Distribute.Codename(diagram, {domain:args.domain});
		const m = diagram.getElement(name);
		return m ? m : new Distribute(diagram, args);
	}
	static HasForm(diagram, ary)
	{
		if (ary.length === 1 && DiagramObject.IsA(ary[0]))
		{
			const from = ary[0];
			const to = from.to;
			if (ProductObject.IsA(to) && !to.dual && ProductObject.IsA(to.objects[1]) && to.objects[1].dual)
				return true;
		}
		return false;
	}
	static ProperName()
	{
		return 'dist';
	}
	static Codomain(diagram, object)
	{
		const a = object.objects[0];
		const objects = object.objects[1].objects.map(o => diagram.get('ProductObject', {objects:[a, o]}));
		return diagram.get('ProductObject', {objects});
	}
}

class Dedistribute extends Morphism
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
	}
	help(helped = new Set)
	{
		return super.help() + H.p('Gather a product from a coproduct');
	}
	hasInverse()
	{
		return true;
	}
	getInverse()
	{
		return this.diagram.get('Distribute', {domain:this.codomain});
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
		if (diagram.isEditable() && ary.length === 1 && DiagramObject.IsA(ary[0]))
		{
			const from = ary[0];
			const to = from.to;
			if (ProductObject.IsA(to) && to.dual && ProductObject.IsA(to.objects[0]) && !to.objects[0].dual)
			{
				const obj0 = to.objects[0].objects[0];
				return to.objects.reduce((doit, o) => doit && ProductObject.IsA(o) && !o.dual && obj0.isEquivalent(o.objects[0]), true);
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
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Functor'));
	}
}

class Diagram extends Functor
{
	constructor(diagram, args)
	{
		if (!('user' in args))
			throw 'no user for diagram';
		const nuArgs = U.Clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.category = U.GetArg(args, 'category', (diagram && 'codomain' in diagram) ? diagram.codomain : null);
		if (!Category.IsA(nuArgs.codomain))
			nuArgs.codomain = diagram ? diagram.getElement(nuArgs.codomain) : R.Cat;
		const indexName = `${nuArgs.basename}_Index`;
		nuArgs.domain = new IndexCategory(diagram, {basename:indexName, description:`index category for diagram ${nuArgs.name}`, user:nuArgs.user});
		super(diagram, nuArgs);
		const _log = 'log' in nuArgs ? nuArgs.log : [];
		Object.defineProperties(this,
		{
			assertions:					{value:new Map,	writable:false},
			colorIndex2colorIndex:		{value:{},		writable:true},
			colorIndex2color:			{value:{},		writable:true},
			colorIndex:					{value:0,		writable:true},
			elements:					{value:new Map,	writable:false},
			link2colorIndex:			{value:{},		writable:true},
			_log:						{value:_log,	writable:true},
			readonly:					{value: 'readonly' in nuArgs ? nuArgs.readonly : false,		writable: true},
			references:					{value:new Map,	writable:false},
			allReferences:				{value:new Map,	writable:true},
			selected:					{value:[],		writable:true},
			svgRoot:					{value:null,	writable:true},
			svgBase:					{value:null,	writable:true},
			texts:						{value:new Map,	writable:false},
			timestamp:					{value:U.GetArg(args, 'timestamp', Date.now()),	writable:true},
			user:						{value:args.user,	writable:false},
		});
		if ('references' in args)
			args.references.map(r => this.addReference(r));
		if ('viewport' in nuArgs)
			this.viewport = nuArgs.viewport;
		if ('elements' in nuArgs)
			this.codomain.process(this, nuArgs.elements, this.elements);
		if ('domainElements' in nuArgs)
			this.domain.process(this, nuArgs.domainElements);
		R.SetDiagramInfo(this);
	}
	addElement(elt)
	{
		const isIndex = DiagramObject.IsA(elt) || DiagramMorphism.IsA(elt) || DiagramComposite.IsA(elt) || Assertion.IsA(elt) || DiagramText.IsA(elt);
		const cat = isIndex ? this.domain : this.codomain;
		if (cat.elements.has(elt.name))
			throw `Element with given name already exists in category`;
		if (this.elements.has(elt.basename))
			throw `Element with given basename already exists in diagram`;
		if (!isIndex)
			this.elements.set(elt.basename, elt);
		cat.elements.set(elt.name, elt);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Diagram'));
	}
	json()
	{
		const a = super.json();
		if ('viewport' in this)
			a.viewport =	this.getViewport();		// don't want viewport.orig
		a.references =	[];
		this.references.forEach(function(ref)
		{
			a.references.push(ref.name);
		});
		a.timestamp = this.timestamp;
		a.domainElements = [];
		this.domain.elements.forEach(function(e)
		{
			if ((e.to && e.to.canSave()) || (!('to' in e)))
				a.domainElements.push(e.json())
		});
		a.elements = [];
		this.elements.forEach(function(e)
		{
			if (e.canSave() && e.refcnt > 0)	// only referenceed elements are saved
				a.elements.push(e.json());
		}, this);
		a.readonly = this.readonly;
		a.user = this.user;
		return a;
	}
	getAnon(s)
	{
		let id = 0;
		while(true)
		{
			const basename = `${s}_${id++}`;
			if (!this.domain.elements.has(`${this.name}/${basename}`))
				return basename;
		}
	}
	setViewport(bbox, anim = true)
	{
		if (bbox.width === 0)
			bbox.width = D.Width();
		const margin = D.navbar.element.getBoundingClientRect().height;
		const dw = D.Width() - 2 * D.default.panel.width - 2 * margin;
		const dh = D.Height() - 3 * margin;
		const xRatio = bbox.width / dw;
		const yRatio = bbox.height / dh;
		const s = 1.0/Math.max(xRatio, yRatio);
		if (!('viewport' in this))
			this.viewport = {};
		let x = - bbox.x * s + D.default.panel.width + margin;
		let y = - bbox.y * s + 2 * margin;
		if (xRatio > yRatio)
			y += dh/2 - s * bbox.height/2;
		else
			x += dw/2 - s * bbox.width/2;
		this.setView(x, y, s, anim);
	}
	home(anim = true)
	{
		this.setViewport(this.svgBase.getBBox(), anim);
	}
	deleteElement(name)
	{
		const o = this.getElement(name);
		if (o && o.isDeletable())
		{
			o.category.deleteElement(o);
			D.objectPanel.update();
			this.update();
			return;
		}
		const m = this.getElement(name);
		if (m && m.isDeletable())
		{
			m.category.deleteElement(m);
			D.morphismPanel.update();
			this.update();
			return;
		}
	}
	initializeView()
	{
		this.viewport.orig = this.getViewport();
	}
	getObject(name)
	{
		if (Element.IsA(name))
			return name;
		let object = this.codomain.getElement(name);
		if (object)
			return object;
		return this.domain.getElement(name);
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
		if (this.svgBase)
			element.getSVG(this.svgBase);
	}
	update(save = true)
	{
		this.makeCells();
		save && R.SaveLocal(this);
	}
	actionHtml(e, name)
	{
		const action = this.codomain.actions.get(name);
		if (action && action.hasForm(R.diagram, this.selected))
			action.html(e, R.diagram, this.selected);
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
	setView(x, y, s, anim = true, log = true)
	{
		if ('viewport' in this && this.viewport.anim)
			return;
		this.viewport.x = x;
		this.viewport.y = y;
		this.viewport.scale = s;
		this.svgTranslate.setAttribute('transform', `translate(${this.viewport.x} ${this.viewport.y}) scale(${this.viewport.scale} ${this.viewport.scale})`);
	}
	mousePosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
	}
	deselectAll(toolbarOff = true)
	{
		if (toolbarOff)
			D.toolbar.hide();
		this.selected.map(elt => elt.showSelected(false));
		this.selected.length = 0;
	}
	selectAll()
	{
		this.deselectAll();
		this.domain.elements.forEach(function(e) {this.addSelected(e);}, this);
		this.assertions.forEach(function(e) {this.addSelected(e);}, this);
	}
	makeSelected(e, elt)
	{
		this.deselectAll(!elt);
		if (elt)
			this.addSelected(elt);
		if (R.default.debug)
			console.log('selected', elt.basename, elt.refcnt, elt);
		D.toolbar.show(e);
	}
	addSelected(elt)
	{
		elt.showSelected();
		if (this.selected.indexOf(elt) >= 0)	// already selected
			return;
		this.selected.push(elt);
		if (DiagramObject.IsA(elt) || DiagramText.IsA(elt))
			elt.finishMove();
		else if (DiagramMorphism.IsA(elt))
		{
			elt.domain.finishMove();
			elt.codomain.finishMove();
		}
	}
	deleteSelected(elt)
	{
		const idx = this.selected.indexOf(elt);
		this.svgBase.append(elt.svg);
		if (idx >= 0)
		{
			this.selected.splice(idx, 1);
			t.decrRefcnt();
		}
	}
	getAssertion(sig)
	{
		for (const [n, a] of this.assertions)
			if (sig === a.signature)
				return a;
		return null;
	}
	pickElement(e, name)
	{
		const elt = this.getElement(name);
		if (elt)
		{
			if (this.isSelected(elt))
				return;
			if (!D.shiftKey)
				this.deselectAll();
			D.dragStart = D.mouse.position();
			if (!this.isSelected(elt))
			{
				if (D.shiftKey)
				{
					this.addSelected(elt);
					D.toolbar.show(e);
				}
				else
					this.makeSelected(e, elt);
			}
			if (DiagramObject.IsA(elt))
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
			D.toolbar.show(e);
		}
		else
			this.deselectAll();
	}
	isSelected(elt)
	{
		for(let i=0; i<this.selected.length; ++i)
			if (elt.name === this.selected[i].name)
				return true;
		return false;
	}
	showGraph(from)
	{
		if ('graph' in from)
		{
			const gsvg = from.graph.svg;
			if (gsvg)
			{
				gsvg.classList.contains('hidden') ? from.showGraph() : from.removeGraph();
				return;
			}
		}
		from.makeGraph();
		const dom = from.domain;
		const cod = from.codomain;
		let xy = new D2({x:dom.x - dom.width/2, y:dom.y}).round();
		from.graph.graphs[0].updateXY(xy);	// set locations inside domain
		xy = new D2({x:cod.x - cod.width/2, y:cod.y}).round();
		from.graph.graphs[1].updateXY(xy);	// set locations inside codomain
		from.graph.getSVG(this.svgBase.innerHTML,
			{index:[], root:from.graph, dom:dom.name, cod:cod.name, visited:[], elementId:from.elementId(), color:Math.floor(Math.random()*12)});
	}
	updateDragObjects(e)
	{
		const delta = D.mouse.position().subtract(D.dragStart);
		delta.x = delta.x / this.viewport.scale;
		delta.y = delta.y / this.viewport.scale;
		let dragObjects = {};
		for(let i=0; i < this.selected.length; ++i)
		{
			const elt = this.selected[i];
			if (DiagramMorphism.IsA(elt))
			{
				dragObjects[elt.domain.name] = elt.domain;
				dragObjects[elt.codomain.name] = elt.codomain;
			}
			else if (DiagramObject.IsA(elt) || DiagramText.IsA(elt))
				dragObjects[elt.name] = elt;
			else if (Cell.IsA(elt))
				elt.getObjects().map(o => dragObjects[o.name] = o);
		}
		Object.keys(dragObjects).forEach(function(i)
		{
			const elt = dragObjects[i];
			elt.update(delta.add(elt.orig));
		});
	}
	placeText(e, xy, description, save = true)
	{
		const txt = new DiagramText(this, {description, xy});
		this.addSVG(txt);
		const bbox = new D2(txt.svg.getBBox());
		let offbox = new D2(bbox);
		while (this.hasOverlap(offbox, txt.name))
			offbox = offbox.add(D.default.stdOffset);
		txt.update(xy.add(offbox.subtract(bbox)));
		R.diagram && this.makeSelected(e, txt);
		this.update(save);
	}
	placeObject(e, to, xy, save = true)
	{
		const from = new DiagramObject(this, {xy, to});
		this.addSVG(from);
		const bbox = new D2(from.svg.getBBox());
		let offbox = new D2(bbox);
		let offset = new D2;
		while (this.hasOverlap(offbox, from.name))
		{
			offset = offset.add(D.default.stdOffset);
			offbox = offbox.add(D.default.stdOffset);
		}
		from.update(offset.add(xy));
		if (save)
		{
			this.makeSelected(e, from);
			this.update(save);
		}
		D.objectPanel.update();
		return from;
	}
	placeMorphism(e, to, xyDom = null, xyCod = null, save = true)
	{
		if (typeof to === 'string')
			to = this.getElemente(to);
		const xyD = xyDom ? new D2(D.Grid(xyDom)) : D.Center(this);;
		const domain = new DiagramObject(this, {to:to.domain, xy:xyD});
		const codomain = new DiagramObject(this, {to:to.codomain});
		const from = new DiagramMorphism(this, {to, domain, codomain});
		const tw = D.textWidth(to.domain.htmlName())/2 + D.textWidth(to.htmlName()) + D.textWidth(to.codomain.htmlName())/2 + 2 * D.textWidth('&emsp;');
		let xyC = null;
		if (xyCod)
		{
			xyC = D.Grid(new D2(xyCod));
			const angle = D2.Angle(xyDom, xyCod);
			const xyCmin = D.Grid({x:xyD.x + Math.cos(angle) * tw, y:xyD.y + Math.sin(angle) * tw});
			if (xyD.dist(xyC) < xyD.dist(xyCmin))
				xyC = xyCmin;
			codomain.x = xyC.x;
			codomain.y = xyC.y;
		}
		else
		{
			xyC = new D2({x:xyD.x + Math.max(D.default.arrow.length, tw), y:xyD.y});
			codomain.x = xyC.x;
			codomain.y = xyC.y;
		}
		this.addSVG(domain);
		this.addSVG(codomain);
		this.addSVG(from);
		const bbox = new D2(from.svg.getBBox());
		let offboxes = [new D2(domain.getBBox()), new D2(bbox), new D2(codomain.getBBox())];
		const names = [domain.name, from.name, codomain.name];
		let offset = new D2;
		while (offboxes.reduce((r, bx, i) => r || this.hasOverlap(bx, names[i]), false))
		{
			offboxes = offboxes.map(bx => bx.add(D.default.stdOffset));
			offset = offset.add(D.default.stdOffset);
		}
		from.domain.update(xyD.add(offset));
		from.codomain.update(xyC.add(offset));
		from.update();
		if (save)
		{
			this.makeSelected(e, from);
			this.update(save);
		}
		D.morphismPanel.update();	// TODO remove
		R.EmitMorphismEvent();
		return from;
	}
	placeMorphismByObject(e, dir, objectName, morphismName, save = true)
	{
		try
		{
			const to = this.getElement(morphismName);
			const fromObj = this.domain.getElement(objectName);
			const toObj = fromObj.to;
			if (!to[dir].isEquivalent(toObj))
				throw `Source and target do not have same signature: ${to[dir].htmlName()} vs ${toObj.htmlName()}`;
			const angles = [];
			this.domain.forEachMorphism(function(m)
			{
				if (Morphism.IsA(m) && fromObj.name === m.domain.name)
					angles.push(D2.Angle(fromObj, m.codomain));
				else if (fromObj.name === m.codomain.name)
					angles.push(D2.Angle(fromObj, m.domain));
			});
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
			const tw = Math.abs(cosAngle) * D.textWidth(to.codomain.htmlName());
			const al = D.default.arrow.length;
			const xy = D.Grid({x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)});
			let domainElt = null;
			let codomainElt = null;
			const newElt = new DiagramObject(this, {xy, to: dir === 'domain' ? to.codomain : to.domain});
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
			this.addSVG(newElt);
			this.addSVG(from);
			from.update();
			this.makeSelected(e, from);
			this.update(save);
			R.EmitMorphismEvent('add', from.name);
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
			fusible = D.mouseover && elt !== D.mouseover && elt.isFusible(D.mouseover);
			elt.updateFusible(e, fusible);
		}
		return fusible;
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
				elt = this.domain.getElement(o.dataset.name);
		}, this);
		if (!elt)
			D.topSVG.querySelectorAll('.morphTxt').forEach(function(o)
			{
				if (o.dataset.name === except)
					return;
				const bbox = o.getBBox();
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (D2.Inside(bbox, pnt, upperRight))
					elt = this.domain.getElement(o.dataset.name);
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
					elt = this.domain.getElement(m.dataset.name);
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
	hasOverlap(bbox, except = '')
	{
		const elts = this.svgBase.querySelectorAll('.object, .diagramText');
		let r = null;
		for (let i=0; i<elts.length; ++i)
		{
			const e = elts[i];
			if (e.dataset.name === except)
				continue;
			if (D2.Overlap(bbox, new D2(e.getBBox())))
			{
				r = e;
				break;
			}
		}
		if (r)
			return this.getElement(r.dataset.name);
		return false;
	}
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	makeSvg(anim = true)
	{
		this.svgRoot = document.getElementById(this.name);
		if (!this.svgRoot)
		{
			this.svgRoot = H3.g();
			this.svgRoot.classList.add('hidden');
			D.diagramSVG.appendChild(this.svgRoot);
			this.svgRoot.id = this.name;
			this.svgBase = H3.g({id:`${this.name} base`});
			this.svgTranslate = H3.g({id:`${this.name} T`}, this.svgBase);
			this.svgRoot.appendChild(this.svgTranslate);
			this.svgRoot.style.display = 'block';
		}
		const fn = function(t) { t.getSVG(this.svgBase); };
		this.domain.elements.forEach(fn, this);
		this.domain.cells.forEach(function(d) { this.addSVG(d); }, this);
	}
	upload(e)
	{
		if (R.cloud && this.user === R.user.name && R.user.status === 'logged-in')
		{
			const btn = document.getElementById('diagramUploadBtn');
			btn.setAttribute('repeatCount', 'indefinite');
			btn.beginElement();
			const start = Date.now();
			const that = this;
			R.cloud.ingestDiagramLambda(e, this, function()
			{
				const delta = Date.now() - start;
				D.Status(e, `Uploaded diagram${R.default.internals ? '<br/>&#9201;' + delta + 'ms': ''}`, true);
				R.ServerDiagrams.set(that.name, that);
				D.diagramPanel.setToolbar(that);
				btn.setAttribute('repeatCount', 1);
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
	editElementText(e, name, id, attr)
	{
		const txtbox = document.getElementById(id);
		let value = null;
		if (this.isEditable() && txtbox.contentEditable === 'true' && txtbox.textContent !== '')
		{
			txtbox.contentEditable = false;
			const elt = this.getElement(name);
			value = txtbox.innerText;
			elt.editText(e, attr, value);
			let p = e.toElement;
			while(p.parentElement)
				if (p.parentElement.id === 'toolbar')
				{
					R.diagram.actionHtml(e, 'help');	// if the toolbar is up
					break;
				}
				else
					p = p.parentElement;
			if (!DiagramText.IsA(elt))
				this.updateProperName(elt);
			R.SaveLocal(this);
		}
		else
		{
			txtbox.contentEditable = true;
			txtbox.focus();
		}
		return value;
	}
	updateMorphisms()
	{
		this.domain.forEachMorphism(function(m){m.update();});
	}
	isIsolated(elt)
	{
		let r = false;
		if (DiagramObject.IsA(elt))
			r = elt.refcnt === 1;
		else if (DiagramMorphism.IsA(elt))
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
			if (DiagramMorphism.IsA(sel0) && DiagramMorphism.IsA(sel1))
			{
				const domain = sel0.domain;
				r = sel0.domain.isEquivalent(sel1.domain) &&
					sel0.codomain.isEquivalent(sel1.codomain) &&
					DataMorphism.IsA(sel0) &&
					Composite.IsA(sel1) &&
					sel1.getElement(sel0);
				const N = this.getElement('N');
				if (r && N)
				{
					if (sel0.domain.isEquivalent(N))
						return true;
					r = ProductObject.IsA(domain) &&
						domain.objects.length === 3 &&
						N.isEquivalent(domain.objects[0]);
					if (r)
					{
						const factor1 = domain.objects[1];
						const factor2 = domain.objects[2];
						r = HomObject.IsA(factor1) &&
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
			R.SaveLocal(this);
			D.Status(e, `Recursor for ${sel0.htmlName()} has been set`);
		}
	}
	getElement(name)
	{
		let elt = this.domain.getElement(name);
		if (elt)
			return elt;
		if (this.elements.has(name))
			return this.elements.get(name);
		return this.codomain.getElement(name);
	}
	getElements(ary)
	{
		return ary.map(e => this.getElement(e)).filter(e => e !== undefined);;
	}
	forEachObject(fn)
	{
		this.elements.forEach(function(e)
		{
			if (CatObject.IsA(e))
				fn(e);
		}, this);
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(function(e)
		{
			if (Morphism.IsA(e))
				fn(e);
		}, this);
	}
	forEachText(fn)
	{
		this.domain.elements.forEach(function(e)
		{
			if (DiagramText.IsA(e))
				fn(e);
		}, this);
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
		this.domain.forEachMorphism(function(m)
		{
			exist = exist || ('graph' in m && !m.graph.svg.classList.contains('hidden'))
		});
		this.domain.forEachMorphism(function(m) { exist ? m.removeGraph() : m.showGraph(); });
		this.update(false);
	}
	addWindowSelect(e)
	{
		const p = this.userToDiagramCoords(D.mouse.down);
		const q = D.mouse.diagramPosition(this);
		let selected = [];
		this.domain.elements.forEach(function(e)
		{
			if (DiagramMorphism.IsA(e) && D2.Inside(p, e.domain, q) && D2.Inside(p, e.codomain, q))
				selected.push(e);
			else if (D2.Inside(p, e, q))
				selected.push(e);
		}, this);
		selected.map(e => this.addSelected(e));
		D.toolbar.show(e);
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
		D.Svg2canvas(D.topSVG, this.name, D.Download);
	}
	downloadLog(e)
	{
		D.DownloadString(JSON.stringify(this._log), 'log', `${this.name}.json`);
	}
	getAllReferenceDiagrams(refs = new Map)
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
	canRemoveReferenceDiagram(name)
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
		if (R.diagram.canRemoveReferenceDiagram(name))
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
	addReference(theName)	// immediate, no background fn
	{
		const name = Diagram.IsA(theName) ? theName.name : theName;
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
	}
	unlock(e)
	{
		if (this.user === R.user.name)
		{
			this.readonly = false;
			D.DiagramPanel.UpdateLockBtn(this);
		}
		R.SaveLocal(this);
		this.log({command:'unlock'});
	}
	lock(e)
	{
		if (this.user === R.user.name)
		{
			this.readonly = true;
			D.DiagramPanel.UpdateLockBtn(this);
		}
		R.SaveLocal(this);
		this.log({command:'lock'});
	}
	clear(save = true)
	{
		this.deselectAll();
		Array.from(this.assertions).reverse().map(a =>
		{
			const assertion = a[1];
			window.dispatchEvent(new CustomEvent('Assertion', {detail:	{diagram:this, command:'delete', name:assertion.name}}));
			assertion.decrRefcnt();
		});
		this.domain.clear();
		Array.from(this.elements).reverse().map(a => a[1].decrRefcnt());
		this.update(save);
	}
	viewElement(name)
	{
		const e = this.getElement(name);
		this.setViewport(new D2(e.svg.getBBox()));
	}
	getObjects()
	{
		const objects = new Set;
		const fn = function(o)
		{
			objects.add(o);
		};
		this.forEachObject(fn);
		this.allReferences.forEach(function(cnt, name)
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachObject(fn);
		});
		return [...objects];
	}
	addAssertion(left, right)
	{
		const assertion = this.get('Assertion', {left, right});
		isGUI && assertion && window.dispatchEvent(new CustomEvent('Assertion', { detail:	{diagram:this, command:'add', assertion}, bubbles:true, cancelable:true}));
		return assertion;
	}
	makeCells()
	{
		this.domain.makeCells(this);
	}
	emphasis(c, on)
	{
		const elt = this.getElement(c);
		D.mouseover = on ? elt : null;
		if (elt && (DiagramMorphism.IsA(elt) || DiagramObject.IsA(elt) || DiagramText.IsA(elt)))
			elt.emphasis(on);
		else if (this.domain.cells.has(c))
			this.domain.cells.get(c).emphasis(on);
	}
	flatten(leg)
	{
		const that = this;
		function doit(m)
		{
			switch(m.constructor.name)
			{
				case 'Composite':
					m.morphisms.map(sm => morphs.push(...that.flatten(sm)));
					break;
				case 'NamedMorphism':
					morphs.push(...that.flatten(m.source));
					break;
				default:
					morphs.push(m);
					break;
			}
		}
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
		const name = proto.Codename(this, args);
		let elt = this.getElement(name);
		if (!elt && 'Get' in proto)
			elt = proto.Get(this, args);
		if (!elt)
		{
			elt = new Cat[prototype](this, args);
			if (prototype === 'IndexCategory')
				elt.forEachMorphism(function(m)
				{
					if ('recursor' in m && typeof m.recursor === 'string')	// set recursive function as it is defined after m is
						m.setRecursor(m.recursor);
				});
			else if (prototype === 'Category' && 'Actions' in R && 'actions' in args)	// bootstrap issue
				args.actions.map(a => this.actions.set(a, R.$Actions.getElement(a)));
		}
		if (!DiagramMorphism.IsA(elt) && 'loadEquivalence' in elt)
			elt.loadEquivalence();
		return elt;
	}
	prettifyCommand(cmd)
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
		}
		const args = U.Clone(cmd);
		let line = args.command + ' ';;
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
	log(cmd)
	{
		cmd.date = new Date;
		this._log.push(cmd)
		D.ttyPanel.logSection.log(cmd);
		this.saveLog();
	}
	saveLog()
	{
		localStorage.setItem(`${this.name}.log`, JSON.stringify(this._log));
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
		R.SaveLocal(this);
		log && this.log({command:'drop', action:action.name, from:fromName, target:targetName});
	}
	fuse(e, from, target, save = true)
	{
		if (from.getSeq() < target.getSeq())	// keep oldest object
		{
			const f = from;
			from = target;
			target = f;
			target.update(from.getXY());
			target.finishMove();
		}
		this.selected.map(s => s.updateFusible(e, false));
		this.deselectAll();
		from.domains.forEach(function(m) { m.setDomain(target); m.update();});
		from.codomains.forEach(function(m) { m.setCodomain(target); m.update();});
		from.decrRefcnt();
		this.update(save);
	}
	replayCommand(e, ndx)
	{
		let cmd = null;
		if (typeof ndx === 'object')
			cmd = ndx;
		else
			cmd = this._log[ndx];
		if (R.ReplayCommands.has(cmd.command))
		{
			const obj = R.ReplayCommands.get(cmd.command);
			obj.replay(e, R.diagram, cmd);
			if (R.default.debug)
				console.log('replayCommand', cmd);
		}
	}
	clearLog(e)
	{
		this._log.length = 0;
		this.saveLog();
		D.ttyPanel.logSection.diagram = null;
		D.ttyPanel.logSection.update();
	}
	updateProperName(to)
	{
		function update(m){ m.update(); };
		this.domain.elements.forEach(function(from)
		{
			if (from.to === to)
			{
				if ('svg_name' in from)
					from.svg_name.innerHTML = to.htmlName();
				else if (CatObject.IsA(to))
				{
					from.svg.innerHTML = to.htmlName();
					from.domains.forEach(update);
					from.codomains.forEach(update);
				}
				else
					from.svg.innerHTML = to.htmlName();
			}
		});
	}
	updateViewSaveTimer()
	{
		if (this.viewSaveTimer)
			clearInterval(this.viewSaveTimer);
		const diagram = this;
		this.viewSaveTimer = setTimeout(function()
		{
			diagram.logViewCommand();
		}, D.default.saveInterval);
	}
	logViewCommand()
	{
		const log = this._log;
		if (log.length > 0 && log[log.length -1].command === 'view')	// replace last view command?
			D.ttyPanel.logSection.removeLogCommand(null, log.length -1)
		R.SaveLocal(this, true, false);
		this.log({command:'view', x:Math.round(this.viewport.x), y:Math.round(this.viewport.y), scale:Math.round(10000.0 * this.viewport.scale)/10000.0});
	}
	getTerminal(dual = false)
	{
		return this.get(dual ? 'InitialObject' : 'TerminalObject', {});
	}
	viewElements(...elts)
	{
		const elements = this.getElements(elts);
		const bbox = D2.Merge(...elements.map(a => a.getBBox()));
		this.setViewport(bbox);
	}
	static Codename(args)
	{
		return `${args.user}/${args.basename}`;
	}
	static GetInfo(diagram)
	{
		let refs = [];
		diagram.references.forEach(function(r)
		{
			refs.push(typeof r === 'string' ? r : r.name);
		});
		return {
			name:			diagram.name,
			basename:		diagram.basename,
			description	:	diagram.description,
			properName:		diagram.properName,
			timestamp:		diagram.timestamp,
			user:			diagram.user,
			references:		refs,
		};
	}
	static IsA(obj)
	{
		return Diagram.prototype.isPrototypeOf(obj);
	}
}

const Cat =
{
	D2,
	R,
	D,
	U,
	H,
	Assertion,
	Category,
	CatObject,
	CppAction,
	Composite,
	DataMorphism,
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
	InitialObject,
	JavascriptAction,
	LambdaMorphism,
	Morphism,
	NamedObject,
	NamedMorphism,
	ProductObject,
	ProductMorphism,
	ProductAssembly,
	PullbackObject,
	TensorObject,
	TerminalObject,
	TerminalMorphism,
};

window.Cat			= Cat;

R.Initialize();	// boot-up

})()
