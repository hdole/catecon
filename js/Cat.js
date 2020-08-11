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
// 			delete
// 			download	diagram came from server
// 			load		diagram now available for viewing, but may have no view yet
// 			new			new diagram exists
// 			png
// 			preload
// 			upload		diagram sent to server
// 		Diagram
// 			addReference
// 			move
// 			removeReference
// 			select
// 			showInternals
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
//
//

(function(exports)
{
'use strict';

var require;
var sjcl;
var zlib;

if (require && require !== null)
{
	var ACI = null;
//	var sjcl = null;
//	var zlib = null;
	AWS = require('aws-sdk');
	sjcl = require('./sjcl.js');
	zlib = require('./zlib_and_gzip.min.js');
	var crypto = require('crypto');
}
else
{
	sjcl = window.sjcl;
	zlib = window.zlib;
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
		if (this.x !== 0)
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
	grid(g)
	{
		this.x = g * Math.round(this.x / g);
		this.y = g * Math.round(this.y / g);
		return this;
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
	static Dist2(v, w)
	{
		return D2.Inner(D2.Subtract(v, w));
	}
	static Dist(v, w)
	{
		return Math.sqrt(D2.Dist2(v, w));
	}
	static Cross(o, a, b)
	{
		return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	}
	static Inner(v)
	{
		return v.x * v.x + v.y * v.y;
	}
	static Length(v)
	{
		return Math.sqrt(D2.Inner(v));
	}
	static Normal(v)
	{
		return new D2(-v.y, v.x);
	}
	static Round(v)
	{
		return new D2(Math.round(v.x), Math.round(v.y));
	}
	static Scale(a, v)
	{
		return new D2(v.x*a, v.y*a);
	}
	static Subtract(v, w)
	{
		return new D2(v.x - w.x, v.y - w.y);
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
	static Hull(ary)
	{
		const cnt = ary.length;
		if (cnt <= 3)
			return ary;
		const pnts = ary.sort(function(a, b) { return a.x < b.x ? true : a.y < b.y; });
		let k = 0;
		const r = [];
		for (let i=0; i<cnt; ++i)
		{
			while(k >= 2 && D2.Cross(r[k -2], r[k -1], pnts[i]) <= 0)
				k--;
			r[k++] = pnts[i];
		}
		let t = k + 1;
		for (let i=cnt -1; i>0; --i)
		{
			while(k >= t && D2.Cross(r[k -2], r[k -1], pnts[i -1]) <= 0)
				k--;
			r[k++] = pnts[i -1];
		}
		return r;
	}
	static Expand(box, dist)
	{
		return new D2({x:box.x - dist, y:box.y - dist, width:box.width + 2 * dist, height:box.height + 2 * dist});
	}
	static Polar(cx, cy, r, angleDeg)
	{
		const angleRad = angleDeg * Math.PI / 180.0;
		return new D2({x:cx + r * Math.cos(angleRad), y:cy + r * -Math.sin(angleRad)});
	}
}

class H
{
	static ok(a)
	{
		return a !== undefined && a !== '' && a !== null;
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
	static tag(tg, h, c, i, t, x)	{return H.x(tg, h, c, i, t, x); }
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
	static _p(elt, arg)
	{
		const type = arg.constructor.name;
		switch(arg.constructor.name)
		{
			case 'Number':
			case 'String':
				elt.innerHTML = arg;
				break;
			case 'Object':
				Object.keys(arg).map(k =>
				{
					if (typeof arg[k] === 'function')
						elt[k] = arg[k];
					else
						elt.setAttribute(k, arg[k]);
				});
				break;
			case 'Array':
				arg.map(c => c && this._p(elt, c));
				break;
			default:
				elt.appendChild(arg);
				break;
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
	static button(...args)	{ return H3._h('button', args); }
	static circle(...args)	{ return H3._v('circle', args); }
	static div(...args)		{ return H3._h('div', args); }
	static g(...args)		{ return H3._v('g', args); }
	static h1(...args)		{ return H3._h('h1', args); }
	static h2(...args)		{ return H3._h('h2', args); }
	static h3(...args)		{ return H3._h('h3', args); }
	static h4(...args)		{ return H3._h('h4', args); }
	static h5(...args)		{ return H3._h('h5', args); }
	static hr(...args)		{ return H3._h('hr', args); }
	static img(...args)		{ return H3._h('img', args); }
	static image(...args)	{ return H3._v('image', args); }
	static input(...args)	{ return H3._h('input', args); }
	static line(...args)	{ return H3._v('line', args); }
	static marker(...args)	{ return H3._v('marker', args); }
	static option(...args)	{ return H3._h('option', args); }
	static p(...args)		{ return H3._h('p', args); }
	static path(...args)	{ return H3._v('path', args); }
	static rect(...args)	{ return H3._v('rect', args); }
	static script(...args)	{ return H3._h('script', args); }
	static select(...args)	{ return H3._h('select', args); }
	static small(...args)	{ return H3._h('small', args); }
	static span(...args)	{ return H3._h('span', args); }
	static svg(...args)		{ return H3._v('svg', args); }
	static table(...args)	{ return H3._h('table', args); }
	static tag(t, ...args)	{ return H3._h(t, args); }
	static text(...args)	{ return H3._v('text', args); }
	static textarea(...args)	{ return H3._h('textarea', args); }
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
		const a = H3.script();
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
		return U.Sig(`TURKEYINTHESTRAW${s}THEWORLDWONDERS`);
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
		function submap(m)
		{
			return U.submap[m];
		}
		for (let i=0; i<subs.length; ++i)
		{
			let s = subs[i].toString();
//			sub += s.replace(/[0-9]/g, function (m)
//			{
//				return U.submap[m];
//			});
			sub += s.replace(/[0-9]/g, submap);
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
		const r = s.replace(/\//g, '_').replace(/{/g, '_Br_').replace(/}/g, '_rB_').replace(/,/g, '_c_').replace(/:/g, '_').replace(/#/g, '_n_')
			.replace(/\[/g, '_br_')
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
		return id.replace(/\//g, '--').replace(/{/g, '---').replace(/}/g, '---');
	}
	static Tab(s)
	{
		return s.replace(/^./gm, '\t$&');
	}
	static IsNumeric(obj)
	{
		return ProductObject.IsA(obj) && obj.dual && obj.objects.reduce((r, oi) => r && oi.getBase().isTerminal(), true);	// convert to numeric?
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
	static RefcntSorter(a, b) { return a.refcnt < b.refcnt ? -1 : b.refcnt > a.refcnt ? 1 : 0; }
}
Object.defineProperties(U,
{
	basenameEx:		{value:RegExp('^[a-zA-Z_$]+[a-zA-Z0-9_$]*$'),	writable:false},
	finiteEx:		{value:RegExp('^#[0-9]+[0-9]*$'),				writable:false},
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
	static Busy()
	{
		if (!('busyBtn' in R))
		{
			const svg = document.getElementById('topSVG');
			const cx = window.innerWidth/2 - 160;
			const cy = window.innerHeight/2 - 160;
			const btn = H3.g(H3.g(H3.animateTransform({attributeName:"transform", type:"rotate", from:"360 160 160", to:"0 160 160", dur:"0.5s", repeatCount:'indefinite'}),
									D.svg.commutes()), {transform:`translate(${cx}, ${cy})`});
			R.busyBtn = btn;
			svg.appendChild(btn);
		}
	}
	static NotBusy()
	{
		if ('busyBtn' in R)
		{
			R.busyBtn.parentNode.removeChild(R.busyBtn);
			delete R.busyBtn;
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
				case 'new':
				case 'update':
					args.diagram.makeCells();
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
				case 'detach':
				case 'new':
					if (DiagramMorphism.IsA(args.element))
						args.diagram.makeCells();
					D.Autosave(args.diagram);
					break;
				case 'update':
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
					args.diagram.makeCells();
					D.Autosave(args.diagram);
					break;
				case 'delete':
				case 'new':
				case 'update':
				case 'move':
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
			switch(args.command)
			{
				case 'addReference':
				case 'removeReference':
					R.LoadDiagramEquivalences(diagram);
					diagram.makeCells();
					D.Autosave(args.diagram);
					break;
				case 'update':
				case 'delete':
					D.Autosave(args.diagram);
					break;
			}
		});
		window.addEventListener('CAT', function(e)
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
					R.LoadDiagramEquivalences(diagram);
					diagram.makeCells();
					if (R.initialized)
					{
						R.default.diagram = diagram.name;
						R.SaveDefaults();
					}
					break;
				case 'preload':
					if (R.LoadingDiagrams.size === 0 && R.JsonDiagrams.size > 0)	// last preload event
					{
						const references = [...R.GetReferences(R.loadingDiagram)].reverse();
						references.map(refName =>
						{
							if (R.JsonDiagrams.has(refName))
							{
								const json = R.JsonDiagrams.get(refName);
								let d = R.$CAT.getElement(refName);
								if (d) // reloading a diagram? get rid of the old one
								{
									R.default.debug && console.log('diagram already loaded', refName);
									if (d.refcnt > 1)
										// TODO reloading a diagram that is in use is bad; fix it
										console.error('reloading diagram referenced elsewhere is bad');
									d.decrRefcnt();
								}
								d = new Diagram(R.GetUserDiagram(json.user), json);
								R.EmitCATEvent('download', d);
								R.EmitCATEvent('load', d);
							}
						});
						R.JsonDiagrams.clear();
						R.SelectDiagram(R.loadingDiagram);
						delete R.loadingDiagram;
						R.postLoadFunction && R.postLoadFunction();
						delete R.postLoadFunction;
					}
					break;
				case 'download':
					R.SaveLocal(diagram);
					break;
			}
		});
		window.addEventListener('Login', function(e)
		{
			!('loadingDiagram' in R) && R.SelectDiagram(R.default.diagram);
		});
	}
	static SetupWorkers()
	{
		const worker = new Worker('js/workerEquality.js');
		worker.addEventListener('message', function(msg)
		{
			const args = msg.data;
			const diagram = R.$CAT.getElement(args.diagram);
			switch(args.command)
			{
				case 'CheckEquivalence':
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
				case 'Info':
					break;
				default:
					console.error('bad message', args.command);
					break;
			}
		});
		R.workers.equality = worker;
		const tokens = window.location.pathname.split('/');
		tokens.pop();
		worker.postMessage({command:'start', url:window.location.origin + tokens.join('/')});
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
		D.diagramSVG =		document.getElementById('diagramSVG');
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
		const actionCat = new Category(R.$CAT,
		{
			basename:		'Actions',
			properName:		'Actions',
			description:	'discrete category of currently loaded actions',
			user:			'sys',
		});
		R.$Actions = new Diagram(R.$CAT,
		{
			basename:		'$Actions',
			codomain:		'Actions',
			properName:		'Actions',
			description:	'diagram of currently loaded actions',
			user:			'sys',
		});
	}
	static SetupActions()
	{
		const categoryActions = new Set([
			new IdentityAction(R.$Actions),
			new GraphAction(R.$Actions),
			new NameAction(R.$Actions),
			new CompositeAction(R.$Actions),
			new DetachDomainAction(R.$Actions),
			new DetachDomainAction(R.$Actions, true),
			new HomObjectAction(R.$Actions),
			new HomObjectAction(R.$Actions, true),
			new HomsetAction(R.$Actions, true),
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
		const placeAction = function(a)
		{
			diagram.elements.set(a.basename, a);
			const from = new DiagramObject(diagram, {xy, to:a});
			xy.add(D.default.stdArrow);
		};
		categoryActions.forEach(placeAction);
		const productActions = new Set([
			new ProductAction(R.$Actions),
			new ProductEditAction(R.$Actions),
			new ProjectAction(R.$Actions),
			new PullbackAction(R.$Actions),
			new ProductAssemblyAction(R.$Actions),
			new MorphismAssemblyAction(R.$Actions)]);
		const productDiagram = new Diagram(R.$CAT, {basename:'product', name:'product', codomain:'Actions', description:'diagram for products', user:'sys'});
		xy = new D2(300, 300);
		diagram = productDiagram;
		productActions.forEach(placeAction);
		const coproductActions = new Set([
			new ProductAction(R.$Actions, true),
			new ProductEditAction(R.$Actions, true),
			new ProjectAction(R.$Actions, true),
			new PullbackAction(R.$Actions, true),
			new ProductAssemblyAction(R.$Actions, true),
			new FiniteObjectAction(R.$Actions),
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
			R.Actions[e.basename] = e;
		});
	}
	static SetupReplay()
	{
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
						elt.setXY(xy);
						R.EmitElementEvent(diagram, 'move', elt);
					}
				}
				R.EmitDiagramEvent(diagram, 'move');
			},
		};
		R.ReplayCommands.set('move', replayMove);
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
				}
			}
		};
		R.ReplayCommands.set('fuse', replayFuse);
		const replayText =
		{
			replay(e, diagram, args)
			{
				const xy = new D2(args.xy);
				diagram.placeText(e, xy, args.text, false);		// TODO avoid saving
			}
		};
		R.ReplayCommands.set('text', replayText);
		const replayEditText =
		{
			replay(e, diagram, args)
			{
				const t = diagram.getElement(args.name);
				t.editText(e, args.attribute, args.value, false);		// TODO avoid saving
			}
		};
		R.ReplayCommands.set('editText', replayEditText);
		const replayView =
		{
			replay(e, diagram, args)
			{
				diagram.setView(args.x, args.y, args.scale, false);		// TODO avoid saving
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
				D.AddReference(e, args.name);		// TODO async
			}
		};
		R.ReplayCommands.set('addReference', replayAddReference);
		const replayRemoveReference =
		{
			replay(e, diagram, args)
			{
				D.RemoveReference(e, args.name);
			}
		};
		R.ReplayCommands.set('removeReference', replayRemoveReference);
	}
	static SetupPFS()
	{
		const user = 'hdole';
		const pfs = new Category(R.$CAT,
		{
			basename:'PFS',
			user,
			properName:'&Popf;&Fopf;&Sopf;',
			actionDiagrams:	['product', 'coproduct', 'hom', 'distribute'],
		});
	}
	static InitCloud()
	{
		R.cloud = isCloud ? new Amazon() : null;
	}
	static Initialize()
	{
		try
		{
			R.sync = false;
			R.Busy();
			R.ReadDefaults();
			R.AddEventListeners();
			R.SetupWorkers();
			D.url = isGUI ? (window.URL || window.webkitURL || window) : null;
			const intro = document.getElementById('intro');	// TODO
			if (intro)
				intro.parentNode.removeChild(intro);
			R.InitCloud();
			if (isGUI)
			{
				U.autosave = true;
				R.ReadLocalDiagramList();
				R.ReadLocalCategoryList();
			}
			R.SetupCore();
			R.SetupActions();
			R.SetupPFS();
			isGUI && D.Initialize();		// initialize GUI
			R.SetupReplay();
			R.sync = true;
			const params = (new URL(document.location)).searchParams;
			isGUI && !params.has('boot') && R.DownloadDiagram('hdole/HTML');
			const loader = function()
			{
				R.diagram = null;
				const params = (new URL(document.location)).searchParams;
				let diagramName = params.get('d') || params.get('diagram');
				const doDisplayMorphism = diagramName !== null;
				if (!diagramName)
					diagramName = R.default.diagram;
				R.initialized = true;
				R.NotBusy();
				R.EmitLoginEvent();	// Anon login
				R.cloud.load();		// cloud login
			};
			const bootLoader = function()
			{
				const params = (new URL(document.location)).searchParams;
				if (params.has('boot'))
					R.LoadScript(window.location.origin + window.location.pathname + 'js/boot.js', function() { Boot(loader); });
				else
					loader();
			};
			R.FetchCatalog(bootLoader);
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
			description:	`${user} diagrams`,
			user,
		};
		d = new Diagram(null, $CATargs);
		R.UserDiagram.set(user, d);
		return d;
	}
	static SaveLocal(diagram)
	{
		R.default.debug && console.log('SaveLocal', diagram.name);
		localStorage.setItem(`${diagram.name}.json`, diagram.stringify());
		// TODO put in web worker since it takes a while
		D.Svg2canvas(diagram, function(png, pngName)
		{
			D.diagramPNG.set(diagram.name, png);
			localStorage.setItem(`${diagram.name}.png`, png);
			R.EmitCATEvent('png', diagram);
		});
		R.SetDiagramInfo(diagram);
		R.SetLocalDiagramInfo(diagram);
		R.SaveLocalDiagramList();
		R.SaveLocalCategoryList();	// TODO needed?
		return true;
	}
	static HasLocal(name)
	{
		return localStorage.getItem(`${name}.json`) !== null;
	}
	static ReadLocal(name, clear = false)
	{
		R.sync = false;
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
			R.SetDiagramInfo(diagram);
			R.sync = true;
			R.EmitCATEvent('load', diagram);
			R.default.debug && console.log('ReadLocal',name,diagram);
			return diagram;
		}
		R.sync = true;
		return null;
	}
	static ReadLocalDiagramList()
	{
		const diagrams = JSON.parse(localStorage.getItem('diagrams'));
		if (diagrams)
		{
			diagrams.map(d => R.SetDiagramInfo(d));
			diagrams.map(d => R.LocalDiagrams.set(d.name, d));
		}
	}
	static SaveLocalDiagramList()
	{
		localStorage.setItem('diagrams', JSON.stringify(U.JsonMap(R.LocalDiagrams, false)));
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
					}
					if (foundIt)
					{
						const bbox = foundIt.getBBox();
						R.diagram.setViewport(bbox);
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
	static Setup(fn)
	{
		R.diagram = null;
		const params = (new URL(document.location)).searchParams;
		let diagramName = params.get('d') || params.get('diagram');
		const doDisplayMorphism = diagramName !== null;
		if (!diagramName)
			diagramName = R.default.diagram;
		fn();
		R.SelectDiagram(diagramName);
	}
	static LocalTimestamp(name)
	{
		const data = localStorage.getItem(`${name}.json`);
		return data ? JSON.parse(data).timestamp : 0;
	}
	static isCloudNewer(name)
	{
		const cloudInfo = R.catalog.get(name);
		return cloudInfo && cloudInfo.timestamp > R.LocalTimestamp(name);
	}
	static DownloadDiagram(name, fn = null)
	{
		let diagram = null;
		const downloads = [...R.GetReferences(name)].reverse().filter(d => R.isCloudNewer(d));
		if (downloads.length > 0)
		{
			if ('loadingDiagram' in R)
				console.error('already loading', R.loadingDiagram);
			R.LoadingDiagrams = new Set(downloads);
			R.loadingDiagram = name;
			R.postLoadFunction = fn;
			downloads.map(d => R.cloud._downloadDiagram(d));
			R.default.debug && console.log('Fetching diagrams', ...downloads);
			// wait for downloads and try agagin
		}
		else if (R.CanLoad(name))
		{
			diagram = R.LoadDiagram(name);		// immediate loading
			fn && fn();
		}
		return diagram;
	}
	static SelectDiagram(name, fn = null)		// can be async if diagram not local; fn runs in final preload event
	{
//console.trace('SelectDiagram', {name});
		if (R.diagram && R.diagram.name === name)
			return;
		R.Busy();
		R.diagram && R.diagram.hide();
		R.default.debug && console.log('SelectDiagram', name);
		R.diagram = null;
		D.toolbar.hide();
		let diagram = R.$CAT.getElement(name);		// already loaded?
		if (!diagram)
		{
			diagram = R.DownloadDiagram(name, fn);
			if (!diagram)
				return;
		}
		if (!diagram)
			throw 'no such diagram';
		diagram.makeSVG();
		diagram.show();
		R.diagram = diagram;
		R.NotBusy();
		R.EmitCATEvent('default', diagram);
		fn && fn();
	}
	static GetCategory(name)
	{
		if (name === 'CAT')
			return R.CAT;
		else if (name === 'Cat')
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
				return;
			}
		}
		else
			fn && fn(dgrm);
	}
	static CanLoad(name)
	{
		return [...R.GetReferences(name)].reverse().reduce((r, d) => r && (R.HasLocalDiagram(d) || R.$CAT.getElement(d)), true);
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
	static SetDiagramInfo(diagram) { R.Diagrams.set(diagram.name, Diagram.GetInfo(diagram)); }				// ut
	static SetLocalDiagramInfo(diagram) { R.LocalDiagrams.set(diagram.name, Diagram.GetInfo(diagram)); }	// ut
	static GetCategoriesInfo()
	{
		const info = new Map();
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
		// TODO remove fetchDiagram and change to 'preload' event listener that deletes itself
		R.cloud && R.cloud.fetchDiagram(name, false).then(function(data)
		{
			R.diagram.clear();
			localStorage.setItem(`${name}.json`, JSON.stringify(data));
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
	static EmitLoginEvent()
	{
//		R.default.debug && console.log('emit LOGIN event', R.user.name, R.user.status);
		return window.dispatchEvent(new CustomEvent('Login', {detail:	{command:R.user.status, name:R.user.name}, bubbles:true, cancelable:true}));
	}
	static EmitCATEvent(command, diagram)	// like diagram was loaded
	{
		R.default.debug && console.log('emit CAT event', {command, diagram});
		return window.dispatchEvent(new CustomEvent('CAT', {detail:	{command, diagram}, bubbles:true, cancelable:true}));
	}
	static EmitDiagramEvent(diagram, command, name = '')	// like something happened in a diagram
	{
//		R.default.debug && console.log('emit DIAGRAM event', diagram.name, {command, name});
		return window.dispatchEvent(new CustomEvent('Diagram', {detail:	{diagram, command, name}, bubbles:true, cancelable:true}));
	}
	static EmitObjectEvent(diagram, command, element, extra = {})	// like an object changed
	{
//		R.default.debug && console.log('emit OBJECT event', {command, name:element.name});
		const detail = { diagram, command, element, };
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		const args = {detail, bubbles:true, cancelable:true};
		return window.dispatchEvent(new CustomEvent('Object', args));
	}
	static EmitMorphismEvent(diagram, command, element, extra = {})
	{
//		R.default.debug && console.log('emit MORPHISM event', {command, name:element.name});
		const detail = { diagram, command, element, };
		Object.keys(extra).map(k => detail[k] = extra[k]);		// merge the defaults
		const args = {detail, bubbles:true, cancelable:true};
		return window.dispatchEvent(new CustomEvent('Morphism', args));
	}
	static EmitAssertionEvent(diagram, command, element)
	{
//		R.default.debug && console.log('emit ASSERTION event', {command, name:element.name});
		return window.dispatchEvent(new CustomEvent('Assertion', {detail:	{diagram, command, element}, bubbles:true, cancelable:true}));
	}
	static EmitTextEvent(diagram, command, element)
	{
//		R.default.debug && console.log('emit TEXT event', {command, name:element.name});
		return window.dispatchEvent(new CustomEvent('Text', {detail:	{diagram, command, element}, bubbles:true, cancelable:true}));
	}
	static EmitElementEvent(diagram, command, elt)
	{
		if (CatObject.IsA(elt))
			R.EmitObjectEvent(diagram, command, elt);
		else if (Morphism.IsA(elt))
			R.EmitMorphismEvent(diagram, command, elt);
		else if (DiagramText.IsA(elt))
			R.EmitTextEvent(diagram, command, elt);
		else if (Assertion.IsA(elt))
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
		R.cloud && fetch(R.cloud.getURL() + '/catalog.json').then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					data.diagrams.map(d =>
					{
						R.catalog.set(d.name, d);
						if (!R.Diagrams.has(d.name))	// TODO out of sync timestamps cloud vs local
							R.SetDiagramInfo(d);
						R.EmitCATEvent('catalogAdd', d);
					});
					fn();
				});
			else
				console.error('error downloading catalog');
		});
	}
	static CanDeleteDiagram(d)
	{
		// were we given a diagram or the name of a diagram?
		let diagram = Diagram.IsA(d) ? d : R.$CAT.getElement(d.name);
		// is the diagram in the catalog of diagrams?
		diagram = diagram ? diagram : d in R.catalog ? R.catalog[d] : null;
		return diagram ? R.diagram && ('refcnt' in diagram ? diagram.refcnt === 0 : true) && R.UserHomeDiagramName(R.user.name) !== diagram.name && diagram.name !== R.diagram.name : true;
	}
	static DeleteDiagram(e, name)
	{
		if (R.CanDeleteDiagram(name) && confirm(`Are you sure you want to delete diagram ${name}?`))
		{
			const diagram = R.$CAT.getElement(name);
			diagram && diagram.decrRefcnt();
			R.Diagrams.delete(name);		// all local diagrams
			R.SaveLocalDiagramList();		// save updated R.Diagrams
			['.json', '.png', '.log'].map(ext => localStorage.removeItem(`${name}${ext}`));		// remove local files
		}
	}
	static GetDiagramInfo(name)
	{
		const diagram = R.$CAT.getElement(name);
		return diagram ? diagram : R.catalog.get(name);
	}
	static SaveDefaults()
	{
		localStorage.setItem('defaults.json', JSON.stringify(R.default));
	}
	static ReadDefaults()
	{
		const defaults = JSON.parse(localStorage.getItem('defaults.json'));
		if (defaults)
			Object.keys(defaults).map(k => R.default[k] = defaults[k]);		// merge the defaults
	}
	static login(e)
	{
		Cat.R.cloud.login(e, function(ok)
		{
			if (R.default.diagram === 'Anon/Home')
				R.default.diagram = `${R.user.name}/Home`;
		});
	}
	static CanFormat(elt)
	{
		return Morphism.IsA(elt) && (elt.isIterable() || R.Actions.javascript.canFormat(elt));
	}
	static HasLocalDiagram(name)
	{
		if (R.LocalDiagrams.has(name))
			return true;
		// try to fix corrupted local diagram list
		const diagram = JSON.parse(localStorage.getItem(`${name}.json`));
		if (diagram)
		{
			R.SetDiagramInfo(diagram);
			R.SetLocalDiagramInfo(diagram);
			R.SaveLocalDiagramList();
			R.EmitCATEvent('new', diagram);
			return true;
		}
		return false;
	}
}
Object.defineProperties(R,
{
	Actions:			{value:null,		writable:true},		// loaded actions
	autosave:			{value:false,		writable:true},		// is autosave turned on for diagrams?
	Cat:				{value:null,		writable:true},
	CAT:				{value:null,		writable:true},		// working nat trans
	catalog:			{value:new Map(),	writable:true},
	category:			{value:null,		writable:true},		// current category
	Categories:			{value:new Map(),	writable:false},	// available categories
	clear:				{value:false,		writable:true},
	cloud:				{value:null,		writable:true},		// cloud we're using
	default:
	{
		value:
		{
			category:		'hdole/PFS',
			diagram:		'Anon/Home',
			debug:			true,
		},
		writable:	true,
	},
	Diagrams:			{value:new Map(),	writable:false},	// available diagrams
	JsonDiagrams:		{value:new Map(),	writable:false},	// diagrams presented as json
	LoadingDiagrams:	{value:new Set(),	writable:true},		// diagrams waiting to be loaded
	LocalDiagrams:		{value:new Map(),	writable:false},	// diagrams stored locally
	diagram:			{value:null,	writable:true},		// current diagram
	initialized:		{value:false,	writable:true},		// Have we finished the boot sequence and initialized properly?
	ReplayCommands:		{value:new Map(),	writable:false},
	ServerDiagrams:		{value:new Map(),	writable:false},
	sync:				{value:false,	writable:true},		// when to turn on sync of gui and local storage
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
		});
	}
	load(fn = null)
	{
//console.trace('cognito load');
		const that = this;
		const script = H3.script({src:"https://sdk.amazonaws.com/js/aws-sdk-2.306.0.min.js", type:"text/javascript", id:'cloud-amazon', onload:function()
		{
			const url = document.location;
			const tokens = url.pathname.split('/');
			tokens.pop();
			tokens.shift();
			const host = `${url.protocol}//${url.host}/${url.pathname === '/' ? '' : '/' + tokens.join('/')}`;
			const script = H3.script({src:host + "/js/amazon-cognito-identity.min.js", type:"text/javascript", onload:function()
			{
				R.cloud = that;
				window.AWS.config.update(
				{
					region:			that.region,
					credentials:	new window.AWS.CognitoIdentityCredentials(that.loginInfo),
				});
				isGUI && that.registerCognito();
				fn && fn();
			}});
			document.body.appendChild(script);
		}});
		document.body.appendChild(script);
	}
	getURL(suffix)
	{
		let url = `https://s3-${this.region}.amazonaws.com/${this.diagramBucketName}`;
		if (suffix === undefined)
			return url;
		url += `/${suffix}`;
		return url;
	}
	updateServiceObjects()
	{
		this.diagramBucket = new window.AWS.S3({apiVersion:'2006-03-01', params: {Bucket: this.diagramBucketName}});
		this.lambda = new window.AWS.Lambda({region: R.cloud.region, apiVersion: '2015-03-31'});
		R.cloud.onCT();
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
			R.default.debug && console.log('saved category', category.name);
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
		else if (AmazonCognitoIdentity !== undefined)
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
					R.user.name = data.Username;
					R.user.email = data.UserAttributes.filter(attr => attr.Name === 'email')[0].Value;
					R.user.status = 'logged-in';
					that.getUserDiagramsFromServer(function(dgrms)
					{
						if (R.default.debug)
							console.log('registerCognito: user diagrams on server', dgrms);
					});
					R.EmitLoginEvent();
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
		const that = this;
		this.userPool.signUp(userName, password, attributes, null, function(err, result)
		{
			if (err)
			{
				alert(err.message);
				return;
			}
			that.user = result.user;
			R.user.name = userName;
			R.user.email = email;
			R.user.status = 'registered';
			R.EmitLoginEvent();
		});
		event.preventDefault();		// prevent network error
	}
	resetPassword(e)	// start the process; a code is sent to the user
	{
		const idPro = new window.AWS.CognitoIdentityServiceProvider();
		idPro.forgotPassword({ClientId:'fjclc9b9lpc83tmkm8b152pin', Username:R.user.name}, function(err, data)
		{
			if (err)
				console.log(err);
			else
				console.log(data);
		});
		e.preventDefault();		// prevent network error
	}
	confirm(e)
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
			R.EmitLoginEvent();
		});
		e.preventDefault();		// prevent network error
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
		e.preventDefault();		// prevent network error
	}
	login(e, fn)
	{
		try
		{
			const userName = U.HtmlSafe(D.loginPanel.loginUserNameElt.value);
			const password = D.loginPanel.passwordElt.value;
			const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({Username:userName, Password:password});
			const userData = {Username:userName, Pool:this.userPool};
			this.user = new AmazonCognitoIdentity.CognitoUser(userData);
			R.user.name = userName;
			R.user.email = '';
			const that = this;
			e.preventDefault();		// prevent network error
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
					R.cloud.lambda.invoke(params, handler);
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
		const Payload = JSON.stringify({diagram:dgrmJson, user:R.user.name, png:D.diagramPNG.get(dgrm.name)});
		if (Payload.length > U.uploadLimit)
		{
			D.statusbar.show(e, 'CANNOT UPLOAD!<br/>Diagram too large!');
			return;
		}
		const params =
		{
			FunctionName:	'CateconIngestDiagram',
			InvocationType:	'Event',
			LogType:		'None',
			Payload,
		};
		function handler(error, data)
		{
			if (error)
			{
				D.RecordError(error);
				return;
			}
			fn && fn();
		}
		this.lambda.invoke(params, handler);
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
	async fetchDiagram(name, cache = true)		// single diagram is fetched, no references
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
	_downloadDiagram(name)
	{
		const url = this.getURL(name) + '.json';
		fetch(url, {cache: true ? 'default' : 'reload'}).then(response => response.json()).then(json =>
		{
			R.default.debug && console.log('_downloadDiagram', name);
			R.LoadingDiagrams.delete(name);
			R.JsonDiagrams.set(name, json);
			R.EmitCATEvent('preload', json);
		});
	}
	downloadDiagram(name)
	{
		if (R.$CAT.getElement(name))
			return;
		const downloads = [...R.GetReferences(name)].reverse().filter(d => R.isCloudNewer(d));
		R.LoadingDiagrams = new Set(downloads);
		downloads.map(d => R.cloud._downloadDiagram(d));
	}
	getUserDiagramsFromServer(fn)	// TODO needed?
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
			H.td(H.div(D.GetButton('diagramPaenlToggle', 'diagram', "Cat.D.diagramPanel.toggle()", 'Diagrams', sz))) +
			H.td(H.div(D.GetButton('categoryPanelToggle', 'category', "Cat.D.categoryPanel.toggle()", 'Categories', sz))) +
			H.td(H.div(D.GetButton('objectPanelToggle', 'object', "Cat.D.objectPanel.toggle()", 'Objects', sz))) +
			H.td(H.div(D.GetButton('morphismPanelToggle', 'morphism', "Cat.D.morphismPanel.toggle()", 'Morphisms', sz))) +
			H.td(H.div(D.GetButton('textPanelToggle', 'text', "Cat.D.textPanel.toggle()", 'Text', sz))) +
			H.td(H.div(D.GetButton('showGraphs', 'string', "Cat.R.diagram.showGraphs()", 'Graph', sz)));
		const right =
			H.td(H.div(D.GetButton('homeView', 'cateapsis', "Cat.R.diagram.home()", 'Home', sz))) +
			H.td(H.div(D.GetButton('threeDPanelToggle', 'threeD', "Cat.D.threeDPanel.toggle()", '3D view', sz))) +
			H.td(H.div(D.GetButton('ttyPanelToggle', 'tty', "Cat.D.ttyPanel.toggle()", 'Console', sz))) +
			H.td(H.div(D.GetButton('helpPanelToggle', 'help', "Cat.D.helpPanel.toggle()", 'Help', sz))) +
			H.td(H.div(D.GetButton('loginPanelToggle', 'login', "Cat.D.loginPanel.toggle()", 'Login', sz))) +
			H.td(H.div(D.GetButton('settingsPanelToggle', 'settings', "Cat.D.settingsPanel.toggle()", 'Settings', sz))) +
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
			D.statusbar.show(e, title);
		}, true);
		const that = this;
		this.element.addEventListener('mouseenter', function(e){ D.mouse.onGUI = that; });
		this.element.addEventListener('mouseleave', function(e){ D.mouse.onGUI = null;});
		window.addEventListener('Login', this.updateByUserStatus);
		window.addEventListener('Registration', this.updateByUserStatus);
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (args.command === 'default')
			{
				that.diagramElt.innerHTML = U.HtmlEntitySafe(diagram.htmlName()) + H.span(` by ${diagram.user}`, 'italic');
				that.categoryElt.innerHTML = U.HtmlEntitySafe(diagram.codomain.htmlName());
			}
		});
		window.addEventListener('Autohide', function(e)
		{
			const args = e.detail;
			if (args.command === 'hide')
			{
				D.navbar.element.style.opacity = "0";
				D.navbar.element.style.height = "0px";
			}
			else
			{
				D.navbar.element.style.opacity = "100";
				D.navbar.element.style.height = "32px";
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
		D.navbar.element.style.background = c;
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
		const that = this;
		this.element.addEventListener('mouseenter', function(e){ D.mouse.onGUI = that; });
		this.element.addEventListener('mouseleave', function(e){ D.mouse.onGUI = null;});
		window.addEventListener('Diagram', function(e) { e.detail.command === 'select' && D.toolbar.show(event); });
		function hideToolbar(e)
		{
			const args = e.detail;
			if (!args.diagram || args.diagram !== R.diagram)
				return;
			switch (args.command)
			{
				case 'delete':
					if (R.diagram.selected.length === 0)
						D.toolbar.hide();
					break;
				case 'new':
				case 'select':
					D.toolbar.show();
					break;
			}
		}
		window.addEventListener('Diagram', function(e) { e.detail.command === 'load' && D.toolbar.resetMouseCoords(); });
		window.addEventListener('Object', hideToolbar);
		window.addEventListener('Morphism', hideToolbar);
		window.addEventListener('Text', hideToolbar);
		window.addEventListener('Assertion', hideToolbar);
		window.addEventListener('mouseenter', function(e) { D.mouse.savePosition(e); } );
		window.addEventListener('Autohide', function(e)
		{
			if (e.detail.command === 'hide')
				that.element.classList.add('hidden');
			else if (!that.closed)
				that.element.classList.remove('hidden');
		});
		window.addEventListener('Login', function(e) { that.hide(); });
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
		if (!diagram)
			return;
		let xy = U.Clone(D.mouse.down);
		xy.x += 8;
		this.mouseCoords = diagram.userToDiagramCoords(xy);
		const element = this.element;
		if (element.classList.contains('hidden') || diagram.selected.length > 0)
			this.reveal();
		else
		{
			this.hide();
			if (toggle)
				return;
		}
		D.RemoveChildren(this.help);
		D.RemoveChildren(this.header);
		element.style.display = 'block';
		if (diagram.selected.length > 0)
		{
			let header = H.span(D.SvgHeader(D.default.button.small, '#ffffff') + D.svg.move +
				`<rect class="btn" x="0" y="0" width="320" height="320"/></svg>`, 'button', 'toolbar-drag-handle', 'Move toolbar');
			let actions = [...diagram.codomain.actions.values()];
			actions.sort(function(a, b) { return a.priority < b.priority ? -1 : b.priority > a.priority ? 1 : 0; });
			actions.map(a =>
			{
				if (!a.hidden() && a.hasForm(diagram, diagram.selected))
					header += D.formButton(a.basename, a.icon, `Cat.R.diagram.${'html' in a ? 'actionHtml' : 'activate'}(event, '${a.basename}')`, a.description);
			});
			header += D.GetButton('toolbarHide', 'close', 'Cat.D.toolbar.hide()', 'Close');
			this.header.innerHTML = H.table(H.tr(H.td(header)), 'buttonBarLeft');
		}
		else
		{
			const btns = [	D.GetButton3('moveToolbar', 'move3', '', 'Move toolbar', D.default.button.small, 'toolbar-drag-handle'),
							D.GetButton3('newDiagram', 'diagram3', 'Cat.D.newElement.Diagram.html()', 'New diagram')];
			if (diagram.isEditable())
			{
				btns.push(D.GetButton3('newObject', 'object3', 'Cat.D.newElement.Object.html()', 'New object'));
				btns.push(D.GetButton3('newMorphism', 'morphism3', 'Cat.D.newElement.Morphism.html()', 'New morphism'));
				btns.push(D.GetButton3('newText', 'text3', 'Cat.D.newElement.Text.html()', 'New text'));
			}
			btns.push(D.GetButton3('toolbarShowSearch', 'search', 'Cat.D.toolbar.showSearch()', 'Search in a diagram', D.default.button.small,
										'toolbar-diagram-search-button', 'toolbar-diagram-search-button-ani'));
			btns.push(D.GetButton3('toolbarHide', 'close3', 'Cat.D.toolbar.hide()', 'Close'));
			this.header.appendChild(H3.span(btns, {class:'buttonBarLeft'}));
		}
		const toolbox = element.getBoundingClientRect();
		if (diagram.selected.length === 1 && DiagramObject.IsA(diagram.selected[0]))
		{
			const obj = diagram.getSelected();
			const bbox = diagram.diagramToUserCoords(obj.svg.getBBox());
		}
		xy.y = xy.y + D.default.margin + 20;
		element.style.left = `${xy.x - toolbox.width/2}px`;
		element.style.top = `${xy.y}px`;
		D.Drag(element, 'toolbar-drag-handle');
		D.drag = false;
	}
	showSearch()
	{
		function onkeydown() { Cat.D.OnEnter(event, function(e) { Cat.D.toolbar.search(e); }); }
		D.RemoveChildren(this.help);
		const input = H3.input({class:'in100', id:'toolbar-diagram-search', title:'Search', placeholder:'Contains...', onkeydown, size:8});
		const btn = D.GetButton3('toolbarSearch', 'edit3', 'Cat.D.toolbar.search()', 'Search in a diagram');
		this.help.appendChild(H3.div(H3.span('Find in diagram:', {class:'smallPrint'}), H3.br(), input, btn));
		this.help.appendChild(H3.div({id:'toolbar-search-items'}));
		input.focus();
	}
	search()
	{
		const searchItems = document.getElementById('toolbar-search-items');
		const searchInput = document.getElementById('toolbar-diagram-search');
		D.RemoveChildren(searchItems);
		const elts = [];
		R.diagram.domain.elements.forEach(function(elt)
		{
			const rx = new RegExp(searchInput.value, 'gi');
			if (DiagramObject.IsA(elt) || DiagramMorphism.IsA(elt))
				rx.exec(elt.to.basename.toString()) && elts.push(elt);
			else if (DiagramText.IsA(elt))
				rx.exec(elt.description.toString()) && elts.push(elt);
		});
		function showElement(elt)
		{
			const to = elt.to;
			let txt = '';
			if (DiagramObject.IsA(elt))
				txt = [H3.span(to.htmlName()), H3.br(), H3.span(to.name, {class:'smallPrint'})];
			else if (DiagramMorphism.IsA(elt))
				txt = [H3.span(`${to.htmlName()}:${to.domain.htmlName()}&rarr;${to.codomain.htmlName()}`), H3.br(), H3.span(to.name, {class:'smallPrint'})];
			else if (DiagramText.IsA(elt))
				txt = elt.description.length < 100 ? elt.description : elt.description.substring(0,15) + '...';
			return txt;
		}
		searchItems.appendChild(H3.small('Click to view', {class:'italic'}));
		elts.sort(U.RefcntSorter);
		elts.map(elt =>
		{
			const item = H3.div(showElement(elt), {onclick:function(e) { R.diagram.viewElements(elt); }, class:'left panelElt'});
			item.addEventListener('mouseenter', function(e) { Cat.R.diagram.emphasis(elt.name, true);});
			item.addEventListener('mouseleave', function(e) { Cat.R.diagram.emphasis(elt.name, false);});
			searchItems.appendChild(item);
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
	show(e, msg, record = false)
	{
		this.message = U.HtmlEntitySafe(msg);
		if (this.timerOut)
			clearInterval(this.timerOut);
		if (this.timerIn)
			clearInterval(this.timerIn);
		const that = this;
		if (msg === '')
		{
			this.hide();
			return;	// nothing to show later
		}
		this.timerIn = setTimeout(function()
		{
			that.element.classList.remove('hidden');
			if (!D.toolbar.element.classList.contains('hidden'))
			{
				const toolbox = D.toolbar.element.getBoundingClientRect();
				const statusbox = elt.getBoundingClientRect();
				if (D2.Overlap(toolbox, statusbox))
					elt.style.top = `${toolbox.top + toolbox.height + D.default.font.height}px`;
			}
		}, D.default.statusbar.timein); 
		this.timerOut = setTimeout(function() { that.hide(); }, D.default.statusbar.timeout); 
		const elt = this.element;
		elt.innerHTML = H.div(msg);
		if (typeof e === 'object')
		{
			const x = e ? e.clientX : 100;
			const y = e ? e.clientY : 100;
			elt.style.left = `${x + 10}px`;
			elt.style.top = `${y - 30}px`;
			elt.style.display = 'block';
			this.xy = {x, y};
			this.hide();
		}
		else
			D.RecordError(msg);
		if (record)
			document.getElementById('tty-out').innerHTML += this.message + "\n";
	}
	hide() { this.element.classList.add('hidden'); }
}

class NewElement
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
		R.ReplayCommands.set(`new${this.type}`, this);
	}
	html()
	{
		const help = D.toolbar.help;
		help.innerHTML = '';
		let focus = null;
		const that = this;
		function action()
		{
			const e = event;
			switch(that.type)
			{
				case 'Category':
					break;
				case 'Object':
					that.createObject(e);
					break;
				case 'Morphism':
					that.createMorphism(e);
					break;
				case 'Text':
					that.createText(e);
					break;
				case 'Diagram':
					that.createDiagram(e);
					break;
			}
		}
		const elts = [H3.h5(this.headline)];
		const rows = [];
		switch(this.type)
		{
			case 'Object':
			case 'Morphism':
			case 'Diagram':
				rows.push(H3.tr(H3.td(this.basenameElt = H3.input({id:'new-basename', placeholder:'Base name', title:'Base name'})), {class:'sidenavRow'}));
				rows.push(H3.tr(H3.td(this.properNameElt = H3.input({id:'new-properName', placeholder:'Proper name', title:'Proper name'})), {class:'sidenavRow'}));
				focus = this.basenameElt;
				break;
		}
		function onkeydown() { Cat.D.OnEnter(event, action); }
		this.descriptionElt = H3.input({class:'in100', id:'new-description', title:'Description', placeholder:'Description', onkeydown });
		this.descriptionElt.onkeydown = onkeydown;
		rows.push(H3.tr(H3.td(this.descriptionElt), {class:'sidenavRow'}));
		const existingRows = this.getMatchingRows();
		let canSearch = false;
		switch(this.type)
		{
			case 'Morphism':
				canSearch = true;
				const objects = R.diagram.getObjects();
				if (!this.suppress)
				{
					this.domainElt = H3.select({class:'w100', id:'new-domain'});
					this.domainElt.appendChild(H3.option('Domain'));
					objects.map(o => this.domainElt.appendChild(H3.option(o.htmlName(), {value:o.name})));
					this.codomainElt = H3.select({class:'w100', id:'new-codomain'});
					this.codomainElt.appendChild(H3.option('Codomain'));
					objects.map(o => this.codomainElt.appendChild(H3.option(o.htmlName(), {value:o.name})));
					rows.push(H3.tr(H3.td(this.domainElt), {class:'sidenavRow'}));
					rows.push(H3.tr(H3.td(this.codomainElt), {class:'sidenavRow'}));
				}
				else
				{
					this.domainElt = {value:''};
					this.codomainElt = {value:''};
				}
				break;
			case 'Diagram':
				let categories = '';
				this.codomainElt = H3.select({class:'w100', id:'new-codomain'});
				for (const [name, e] of R.$CAT.elements)
					if (Category.IsA(e) && !IndexCategory.IsA(e) && e.user !== 'sys')
						this.codomainElt.appendChild(H3.option(e.htmlName(), e.name));
				rows.push(H3.tr(H3.td(this.codomainElt), {class:'sidenavRow'}));
				break;
			case 'Object':
				canSearch = true;
				break;
			case 'Text':
				focus = this.descriptionElt;
				break;
		}
		elts.push(H3.table(rows));
		elts.push(H3.span(D.GetButton3(action.name, 'edit3', action, this.headline)));
		elts.push(this.error = H3.span({class:'error', id:'new-error'}));
		function onkeyup(e)
		{
			that.filter = document.getElementById('help-element-search').value;
			const rows = that.getMatchingRows();
			const tbl = document.getElementById('help-matching-table');
			D.RemoveChildren(tbl);
			rows.map(r => tbl.appendChild(r));
		}
		help.appendChild(H3.div(elts));
		canSearch && help.appendChild(H3.input({class:'in100', id:'help-element-search', title:'Search', placeholder:'Name contains...', onkeyup }));
		if (existingRows.length > 0)
		{
			help.appendChild(H3.br());
			help.appendChild(H3.small('Click to place', {class:'italic'}));
			help.appendChild(H3.table(existingRows, {id:'help-matching-table'}));
		}
		if (focus)
		{
			focus.focus();
			focus.select();
		}
	}
	getMatchingRows()
	{
		const rows = [];
		const filter = new RegExp(this.filter);
//		function sorter(a, b) { return a.refcnt < b.refcnt ? -1 : b.refcnt > a.refcnt ? 1 : 0; }
		switch(this.type)
		{
			case 'Morphism':
				const objects = R.diagram.getObjects();
				if (!this.suppress)
				{
					let morphisms = R.diagram.getMorphisms().filter(m => filter.test(m.name));
					morphisms.sort(U.RefcntSorter);
					morphisms.map(m => rows.push(H3.tr(H3.td(m.domain.htmlName()), H3.td(m.properName), H3.td(m.codomain.htmlName()),
														{onclick:`Cat.R.diagram.placeMorphism(event, '${m.name}', null, null, true, false)`, class:'panelElt'})));
				}
				else
				{
					this.domainElt = {value:''};
					this.codomainElt = {value:''};
				}
				break;
			case 'Object':
			{
				const objects = R.diagram.getObjects().filter(o => filter.test(o.name));
				objects.sort(U.RefcntSorter);
				objects.map(o => rows.push(H3.tr(H3.td(o.properName,{onclick:`Cat.R.diagram.placeObject(event, '${o.name}')`, class:'panelElt'}))));
				break;
			}
		}
		return rows;
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
			diagram.svgRoot.classList.remove('hidden');
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
				properName:		U.HtmlSafe(D.newElement.Object.properNameElt.value),
				description:	U.HtmlSafe(D.newElement.Object.descriptionElt.value),
			};
			args.xy = D.toolbar.mouseCoords;	// use original location
			const from = D.newElement.Object.doit(e, R.diagram, args);
			D.newElement.Object.update();
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
//			if (MouseEvent.prototype.isPrototypeOf(e))
				args.xyDom = D.toolbar.mouseCoords;	// use original location
			const from = this.doit(e, diagram, args);
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
		catch(x)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(x);
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
			diagram.log({command:'text', xy, text});
			diagram.antilog({command:'delete', elements:[from.name]});
			this.update();
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
}

class D
{
	static Initialize()
	{
		window.addEventListener('Diagram', D.Autohide);
		window.addEventListener('mousemove', D.Autohide);
		window.addEventListener('mousedown', D.Autohide);
		window.addEventListener('keydown', D.Autohide);
		D.navbar =			new Navbar();
		D.Navbar =			Navbar;
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
//		D.diagramSVG =		document.getElementById('diagramSVG');
		D.NewElement =		NewElement;
		//
		D.Panel = 			Panel;
		//
		D.panels =			new Panels();
		D.Panels =			Panels;
		//
		D.categoryPanel =	new CategoryPanel();
		D.CategoryPanel =	CategoryPanel;
		//
		D.diagramPanel =	new DiagramPanel();
		D.DiagramPanel =	DiagramPanel;
		//
		D.helpPanel =		new HelpPanel();
		D.HelpPanel =		HelpPanel;
		//
		D.loginPanel =		new LoginPanel();
		D.LoginPanel =		LoginPanel;
		//
		D.morphismPanel =	new MorphismPanel();
		D.MorphismPanel =	MorphismPanel;
		//
		D.objectPanel =		new ObjectPanel();
		D.ObjectPanel =		ObjectPanel;
		//
		D.settingsPanel =	new SettingsPanel();
		D.SettingsPanel =	SettingsPanel;
		//
		D.textPanel =		new TextPanel();
		D.TextPanel =		TextPanel;
		//
		D.threeDPanel =		new ThreeDPanel();
		D.ThreeDPanel =		ThreeDPanel;
		//
		D.ttyPanel =		new TtyPanel();
		D.TtyPanel =		TtyPanel;
		//
		D.newElement =
		{
			Diagram:	new NewElement('Diagram', 'Create a new diagram'),
			Object:		new NewElement('Object', 'Create a new object in this diagram'),
			Morphism:	new NewElement('Morphism', 'Create a new morphism in this diagram'),
			Text:		new NewElement('Text', 'Create new text in this diagram'),
		},
		D.Resize();
		window.addEventListener('resize', D.Resize);
		window.addEventListener('CAT', D.UpdateDiagramDisplay);
		function jsHtmlLoader(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (args.command === 'load' && diagram.name === 'hdole/HTML')
			{
				R.Actions.javascript.loadHTML();
				window.removeEventListener('CAT', jsHtmlLoader);
			}
		}
		window.addEventListener('CAT', 	jsHtmlLoader);
		D.Autohide();
		window.addEventListener('Assertion', D.UpdateDisplay);
		window.addEventListener('Morphism', D.UpdateMorphismDisplay);
		window.addEventListener('Object', D.UpdateObjectDisplay);
		window.addEventListener('Text', D.UpdateTextDisplay);
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
				if (DiagramObject.IsA(args.element))
					D.GlowBadObjects(args.diagram);
				break;
			case 'new':
			case 'move':
				if (DiagramObject.IsA(args.element))
					D.GlowBadObjects(args.diagram);
				break;
		}
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
		D.autohideTimer = setTimeout(function()
		{
			if (D.mouse.onGUI)
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
		D.autosaveTimer = setTimeout(function()
		{
			if (timestamp === diagram.timestamp)
				R.SaveLocal(diagram);
		}, D.default.autosaveTimer);
	}
	static Mousedown(e)
	{
		if (e.button === 0)
		{
			D.mouseIsDown = true;
			D.mouse.down = new D2(e.clientX, e.clientY);	// screen coords
			const diagram = R.diagram;
			if (!diagram)
				return;
			const pnt = diagram.mousePosition(e);
			if (D.mouseover)
			{
				if (!diagram.selected.includes(D.mouseover) && !D.shiftKey)
					diagram.deselectAll(e);
			}
			else
				diagram.deselectAll(e);
			if (e.which === 2)	// middle mouse button
			{
				D.tool = 'pan';
				diagram.initializeView();
			}
			D.dragStart = D.mouse.position();
			if (D.tool === 'pan' && !D.drag)
				D.drag = true;
		}
		else if (e.button === 1)
			D.keyboardDown.Space(e);
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
					const oldMouseover = D.mouseover;
					if (from === D.mouseover)
						D.mouseover = null;
					const isMorphism = Morphism.IsA(from);
					if (diagram.selected.length === 1)		// check for fusing
					{
						if (e.ctrlKey && !D.dragClone)
						{
							const isolated = from.refcnt === 1;
							if (DiagramObject.IsA(from))		// ctrl-drag identity
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
									D.statusbar.show(e, msg);
									from.updateGlow(true, 'glow');
								}
								else if (D.mouseover)
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
			else if (D.mouseIsDown && !D.drag)
			{
				const xy = D.mouse.position();
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
				diagram.setView(diagram.viewport.x + e.movementX, diagram.viewport.y + e.movementY, diagram.viewport.scale);
				D.DeleteSelectRectangle();
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
									diagram.deselectAll(e);
								}
							}
							else if (DiagramObject.IsA(from) && DiagramObject.IsA(target))
							{
								if(from.isFusible(target))
								{
									const domains = [];
									from.domains.forEach(function(m) { domains.push(m.name); });
									const codomains = [];
									from.codomains.forEach(function(m) { m.domain !== m.codomain && codomains.push(m.name); });
									diagram.fuse(e, from, target);
									diagram.log({command:'fuse', from:from.name, target:target.name});
									diagram.antilog({command:'fuse', to:from.to, xy:{x:from.orig.x, y:from.orig.y}, domains, codomains, target});
								}
							}
						}
						if (!DiagramText.IsA(from))
							from.updateGlow(false, '');
					}
					const elts = new Map();
					const orig = new Map();
					const movables = new Set();
					diagram.selected.map(e =>
					{
						if (Assertion.IsA(e))
							return;
						if (DiagramMorphism.IsA(e))
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
						movables.forEach(function(elt) { R.EmitElementEvent(diagram, 'move', elt); });
						R.EmitDiagramEvent(diagram, 'move', '');
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
			const xy = diagram.mousePosition(e);
			const name = e.dataTransfer.getData('text');
			if (name.length === 0)
				return;
			let elt = diagram.getElement(name);
			const addRef = function(ref) { D.AddReference(e, name); };
			if (!elt)
				R.GetDiagram(name, addRef);
			else
			{
				let from = null;
				if (CatObject.IsA(elt))
				{
					from = diagram.placeObject(e, elt, xy);
					diagram.log({command:'copy', source:elt.name, xy});
				}
				else if (Morphism.IsA(elt))
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
		const v = 0.32 * (scale !== undefined ? scale : 1.0);
		return H3.svg({title, width:`${v}in`, height:`${v}in`, viewBox:"0 0 320 320"},
			[
				H3.rect({x:0, y:0, width:320, height:320, style:'fill:white'}),
				D.svg.download3(),
				H3.text({'text-anchor':'middle', x:160, y:280, style:'font-size:120px;stroke:#000;'}, txt),
				H3.rect({class:'btn', x:0, y:0, width:320, height:320, onclick})
			]);
	}
	static GetButton(name, buttonName, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let btn = D.svg[buttonName];
		return D.formButton(name, btn, onclick, title, scale, addNew, id, bgColor);
	}
	static formButton(name, btn, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let button = btn;
		if (id !== null)
			button =
`<g>
<animateTransform id="${id}" attributeName="transform" type="rotate" from="0 160 160" to="360 160 160" dur="0.5s" repeatCount="1" begin="indefinite"/>
${button}
</g>`;
		return H.span(D.SvgHeader(scale, bgColor) + button + (addNew ? D.svg.new : '') + D.Button(onclick) + '</svg>', 'button', '', title, `data-name='${name}'`);
	}
	static GetButton3(name, buttonName, onclick, title, scale = D.default.button.small, id = null, aniId = null, repeatCount = "1")
	{
		const children = [H3.rect({x:0, y:0, width:320, height:320, style:`fill:#ffffff`})];
		if (aniId)
			children.push(H3.g(	H3.animateTransform({id:aniId, attributeName:"transform", type:"rotate", from:"360 160 160", to:"0 160 160",
														dur:"0.5s", repeatCount, begin:"indefinite"}),
								D.svg[buttonName]()));
		else
			children.push(D.svg[buttonName]());
		children.push(H3.rect({class:"btn", x:"0", y:"0", width:"320", height:"320", onclick}));	// click on this!
		const v = 0.32 * (scale !== undefined ? scale : 1.0);
		const args = {width:`${v}in`, height:`${v}in`, viewBox:"0 0 320 320"};
		if (id)
			args.id = id;
		const span = H3.span(H3.svg(args, children), {title, class:'button', 'data-name':name});
		span.style.verticalAlign = 'middle';
		return span;
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
		const vp = diagram.viewport;
		const scale = vp.scale;
		let inc = Math.log(scale)/Math.log(D.default.scale.base) + scalar;
		let nuScale = D.default.scale.base ** inc;
		nuScale = nuScale < D.default.scale.limit.min ? D.default.scale.limit.min : nuScale;
		nuScale = nuScale > D.default.scale.limit.max ? D.default.scale.limit.max : nuScale;
		const pnt = D.mouse.position();
		const dx = pnt.x - (nuScale / scale) * (pnt.x - vp.x);
		const dy = pnt.y - (nuScale / scale) * (pnt.y - vp.y);
		diagram.setView(dx, dy, nuScale);
	}
	static AddEventListeners()
	{
		document.addEventListener('mousemove', function(e)
		{
			if (D.statusbar.element.style.display === 'block' && D2.Dist(D.statusbar.xy, {x:e.clientX, y:e.clientY}) > 50)
				D.statusbar.hide();
		});
		document.addEventListener('dragover', function(e)
		{
			e.preventDefault();
		}, false);
		document.addEventListener('drop', function(e)
		{
			e.preventDefault();
		}, true);
		function getKeyName(e)
		{
			let name = e.ctrlKey && e.key !== 'Control' ? 'Control' : '';
			name += e.shiftKey && e.key !== 'Shift' ? 'Shift' : '';
			name += e.altKey && e.key !== 'Alt' ? 'Alt' : '';
			name += e.code;
			return name;
		}
		document.addEventListener('keydown', function(e)
		{
			if (e.target === document.body)
			{
				const name = getKeyName(e);
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
				D.setCursor();
				const name = getKeyName(e);
				if (name in D.keyboardUp)
					D.keyboardUp[name](e);
			}
		});
		document.addEventListener('wheel', function(e)
		{
			if (e.target.id === 'topSVG')
			{
				D.toolbar.hide();
				R.diagram.svgTranslate.classList.remove('trans025s');
				D.Zoom(e, Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY))));
				R.diagram.svgTranslate.classList.add('trans025s');
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
	static Grid(x)
	{
		const d = D.shiftKey && !D.ctrlKey ? D.default.majorGridMult * D.default.layoutGrid : D.default.layoutGrid;
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
			if (typeof err === 'object' && 'stack' in err && err.stack !== '')
				txt += H.br() + H.small('Stack Trace') + H.pre(err.stack);
			D.ttyPanel.error.innerHTML += '<br/>' + txt;
			D.ttyPanel.open();
			Panel.SectionOpen('tty-error-section');
		}
		else
			process.exit(1);
	}
	static ShowDiagramRoot()
	{
		D.diagramSVG.style.display = 'block';
	}
	static UpdateDiagramDisplay(e)
	{
		const args = e.detail;
		const diagram = args.diagram;
		if (!diagram)
			return;
		switch(args.command)
		{
			case 'new':
				break;
			case 'default':
				if (!diagram.svgRoot)
					diagram.makeSVG();
				if ('viewport' in diagram)
					diagram.setView(diagram.viewport.x, diagram.viewport.y, diagram.viewport.scale, false);
				else
					diagram.home();
				D.GlowBadObjects(diagram);
				diagram.svgTranslate.classList.add('trans025s');
				break;
		}
	}
	static UpdateMorphismDisplay(e)
	{
		D.UpdateDisplay(e);
		const args = e.detail;
		const diagram = args.diagram;
//		if (!diagram || diagram !== R.diagram)
//			return;
		const element = args.element;
		switch(args.command)
		{
			case 'new':
				if (DiagramMorphism.IsA(element))
				{
					element.update();
					diagram.domain.updateHomset(element.domain, element.codomain);
				}
				break;
			case 'detach':
				diagram.domain.updateHomset(args.old, args.dual ? element.domain : element.codomain);
				diagram.domain.updateHomset(args.old, args.dual ? element.codomain : element.domain);
				break;
			default:
				break;
		}
	}
	static UpdateObjectDisplay(e)
	{
		D.UpdateDisplay(e);
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
				homObjs.forEach(function(o) { diagram.domain.updateHomset(element, o); });
				if ('target' in args)
				{
					const target = args.target;
					homObjs.clear();
					target.domains.forEach(addCod);
					target.codomains.forEach(addDom);
					homObjs.forEach(function(o) { diagram.domain.updateHomset(target, o); });
				}
				break;
			case 'move':
				element.finishMove();
				if (DiagramObject.IsA(element))
					element.update();
				break;
			case 'update':
			case 'new':
				if (DiagramObject.IsA(element))
					element.update();
				break;
		}
	}
	static UpdateTextDisplay(e)
	{
		D.UpdateDisplay(e);
		const args = e.detail;
		const diagram = args.diagram;
		if (!diagram)
			return;
		const element = args.element;
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
		const notUs = diagram !== R.diagram;
		if (notUs)	// for booting
		{
			if (R.diagram)
				R.diagram.svgRoot.style.display = 'none';
			diagram.svgRoot.style.display = 'block';
		}
		const svg = diagram.svgRoot;
		const copy = svg.cloneNode(true);
		const top = document.createElementNS(D.xmlns, 'svg');
		top.appendChild(copy);
		D.copyStyles(copy, svg);
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
		if (notUs)
		{
			if (R.diagram)
				R.diagram.svgRoot.style.display = 'block';
			diagram.svgRoot.style.display = 'none';
		}
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
		const v = 0.32 * (scale !== undefined ? scale : 1.0);
		return `<svg xmlns="${D.xmlns}" width="${v}in" height="${v}in" version="1.1" viewBox="0 0 320 320">
<rect x="0" y="0" width="320" height="320" style="fill:${bgColor}"/>`;
	}
	static Button(onclick)
	{
		return `<rect class="btn" x="0" y="0" width="320" height="320" onclick="${onclick}"/>`;
	}
	static Input(val, id, ph, x='', cls='in100', type='text')
	{
		return H.input(val, cls, id, type, {ph});
	}
	static GetObjects(ary)
	{
		const elts = new Set();
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
				{
					elts.add(elt.domain);
					elts.add(elt.codomain);
				}
			}
			else if (D2.IsA(elt))
				elts.add(elt);
		}
		return elts;
	}
	static Barycenter(ary)
	{
		const elts = D.GetObjects(ary);
		const xy = new D2();
		elts.forEach(function(pnt) { xy.increment(pnt); });
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
	static HtmlRow3(m, handler)
	{
		return H3.tr([
			H3.td(m.htmlName()),
			H3.td(m.domain.htmlName()),
			H3.td('&rarr;'),
			H3.td(m.codomain.htmlName())],
			{
				class:'sidenavRow',
				title:U.HtmlSafe(U.Formal(m.description)),
			},
			handler);
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
		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
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
	static AddReference(e, name)
	{
		const ref = R.$CAT.getElement(name);
		if (!ref)
			throw 'no diagram';
		const diagram = R.diagram;
		diagram.addReference(name);
		D.statusbar.show(e, `Diagram ${ref.htmlName()} now referenced`);
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
		R.EmitDiagramEvent(diagram, 'removeReference', name);
		D.statusbar.show(e, `${diagram.htmlName()} reference removed`);
		diagram.log({command:'removeReference', name});
		diagram.antilog({command:'addReference', name});
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
	static Mouseover(e, name, on)
	{
		const diagram = R.diagram;
		if (!diagram)
			return;
		const from = diagram.getElement(name);
		if (from)
		{
			diagram.emphasis(from.name, on);
			let msg = '';
			if (on && !DiagramText.IsA(from))
			{
				msg = from.to.description;
				if (R.default.debug && 'assyGraph' in from)
					msg = msg + `  <br>Has info: ${from.assyGraph.hasTag('info')}`;
				D.statusbar.show(e, msg);
			}
			else
				clearInterval(D.statusbar.timerIn);
		}
		else
			console.error('Mouseover missing element', name);
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
			D.statusbar.show(e, `Diagram ${D.copyDiagram.htmlName()} is not referenced by this diagram`);
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
		let png = D.diagramPNG.get(name);
		if (!png)
		{
			png = localStorage.getItem(`${name}.png`);
			if (png)
				D.diagramPNG.set(name, png);
		}
		return png;
	}
	static GetImageElement(name)
	{
		let src = D.GetPng(name);
		if (!src && R.cloud)
			src = R.cloud.getURL(name + '.png');
		const imgId = U.SafeId(`img-el_${name}`);
		return `<image href="${src}" id="${imgId}" alt="Not loaded" width="200" height="150"/>`;
	}
	static GetImageElement3(name)
	{
		let src = D.GetPng(name);
		if (!src && R.cloud)
			src = R.cloud.getURL(name + '.png');
		const imgId = U.SafeId(`img-el_${name}`);
		return H3.img({src, id:imgId, alt:"Not loaded", width:"200", height:"150"});
	}
	static GetSvgImageElement3(name)
	{
		const href = R.cloud.getURL(name + '.png');
		const imgId = U.SafeId(`image-el_${name}`);
		return H3.image({href, id:imgId, alt:"Not loaded", width:"300", height:"225"});
	}
	static PlaceComposite(e, diagram, comp)
	{
		const morphisms = Composite.IsA(comp) ? comp.morphisms : [comp];
		const objects = [morphisms[0].domain];
		const composite = [];
		function compScan(m)
		{
			if (Composite.IsA(m))
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
}
Object.defineProperties(D,
{
	'bracketWidth':		{value: 0,			writable: true},
	'category':			{value: null,		writable: true},
	'categoryPanel':	{value: null,		writable: true},
	'commaWidth':		{value: 0,			writable: true},
	'ctrlKey':			{value: false,		writable: true},
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
			majorGridMult:	20,
			pan:			{scale:	0.05},
			scale:			{base:1.05, limit:{min:0.05, max:20}},
			scale3D:		1,
			stdOffset:		new D2(30, 30),
			stdArrow:		new D2(200, 0),
			stdArrowDown:	new D2(0, 200),
			autohideTimer:	10000,	// ms
			autosaveTimer:	2000,	// ms
			statusbar:		{timein: 1000, timeout: 3000},	// ms
			saveInterval:	5000,	// ms
			toolbar:		{x:15, y:70},
			margin:			5,
		},
		writable:		false,
	},
	'diagramPanel':		{value: null,		writable: true},
	'diagramPNG':		{value: new Map(),	writable: true},
	'diagramSVG':		{value: null,		writable: true},
	'drag':				{value: false,		writable: true},
	'dragClone':		{value: false,		writable: true},
	'dragStart':		{value: new D2(),	writable: true},
	'gridding':			{value: true,		writable: true},
	'helpPanel':		{value: null,		writable: true},
	'id':				{value: 0,			writable: true},
	'keyboardDown':			// keyup actions
	{
		value:
		{
			Minus(e) { D.Zoom(e, -2);},
			Equal(e) { D.Zoom(e, 2);},
			Home(e)
			{
				const diagram = R.diagram;
				diagram.selected.length > 0 ? diagram.viewElements(...diagram.selected) : diagram.home();
			},
			ArrowUp(e)
			{
				const diagram = R.diagram;
				const delta = Math.min(D.Width(), D.Height()) * D.default.pan.scale;
				diagram.setView(diagram.viewport.x, diagram.viewport.y + delta, diagram.viewport.scale);
			},
			ArrowDown()
			{
				const diagram = R.diagram;
				const delta = Math.min(D.Width(), D.Height()) * D.default.pan.scale;
				diagram.setView(diagram.viewport.x, diagram.viewport.y - delta, diagram.viewport.scale);
			},
			ArrowLeft()
			{
				const diagram = R.diagram;
				const delta = Math.min(D.Width(), D.Height()) * D.default.pan.scale;
				diagram.setView(diagram.viewport.x + delta, diagram.viewport.y, diagram.viewport.scale);
			},
			ArrowRight()
			{
				const diagram = R.diagram;
				const delta = Math.min(D.Width(), D.Height()) * D.default.pan.scale;
				diagram.setView(diagram.viewport.x - delta, diagram.viewport.y, diagram.viewport.scale);
			},
			Slash(e)
			{
				D.toolbar.show(e, false);
				D.toolbar.showSearch();
				e.preventDefault();
			},
			Space(e)
			{
				R.diagram.svgTranslate.classList.remove('trans025s');
				D.tool = 'pan';
				D.drag = false;
				D.setCursor();
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
				const xy = D.mouse.position();
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
				D.diagramPanel.userDiagramSection.open();
				e.preventDefault();
			},
			ControlKeyV(e)	{	D.Paste(e);	},
			Digit0(e) { D.testAndFireAction(e, 'initialMorphism', R.diagram.selected); },
			Digit1(e)
			{
				const diagram = R.diagram;
				const terminal = diagram.get('FiniteObject', {size:1});
				diagram.placeObject(e, terminal, D.mouse.diagramPosition(diagram));
			},
			ControlDigit3(e) { D.threeDPanel.toggle(); },
			Delete(e)
			{
				R.diagram && R.diagram.activate(e, 'delete');
			},
			Escape(e)
			{
				if (D.toolbar.element.classList.contains('hidden'))
					D.panels.closeAll();
				else
					D.toolbar.hide();
				D.DeleteSelectRectangle();
			},
			KeyT(e)
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
	'keyboardUp':
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
				R.diagram.svgTranslate.classList.add('trans025s');
				D.tool = 'select';
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
			down:		new D2(window.innerWidth/2, window.innerHeight/2),
			onPanel:	false,
			xy:			[new D2()],
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
				return this.xy.length > 1 ? this.xy[1].subtract(this.xy[0]) : new D2();
			},
		},
		writable: true,
	},
	'mouseIsDown':		{value: false,		writable: true},	// is the mouse key down? the onmousedown attr is not connected to mousedown or mouseup
	'mouseover':		{value: null,		writable: true},
	'navbar':			{value: null,		writable: true},
	'newElement':		{value: null,		writable: true},
	'objectPanel':		{value: null,		writable: true},
	'openPanels':		{value: [],			writable: true},
	'Panel':			{value: null,		writable: true},
	'panels':			{value: null,		writable: true},
	'pasteBuffer':		{value: [],			writable: true},
	'copyDiagram':		{value:	null,		writable: true},
	'settingsPanel':	{value: null,		writable: true},
	'shiftKey':			{value: false,		writable: true},
	'showUploadArea':	{value: false,		writable: true},
	'snapshotWidth':	{value: 1024,		writable: true},
	'snapshotHeight':	{value: 768,		writable: true},
	'statusbar':		{value: new StatusBar(),	writable: false},
	'statusMessage':	{value:	'',			writable: true},
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
	'textSize':			{value:	new Map(),	writable: false},
	'threeDPanel':		{value: null,		writable: true},
	'tool':				{value: 'select',	writable: true},
	'toolbar':			{value: new Toolbar(),							writable: false},
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
close3()
{
	return H3.g([	H3.line({class:"arrow0 str0", x1:"40", y1:"40", x2:"280", y2: "280"}),
					H3.line({class:"arrow0 str0", x1:"280", y1:"40", x2:"40", y2: "280"})]);
},
commutes()
{
	return H3.path({class:"svgfilNone svgstr1", d:D.GetArc(160, 160, 100, 45, 360), 'marker-end':'url(#arrowhead)'});
},
copy:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
delete:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="230" marker-end="url(#arrowhead)"/>
<path class="svgfilNone svgstr1" d="M90,190 A120,50 0 1,0 230,190"/>`,
delete3()
{
	return H3.g([H3.line({class:"arrow0", x1:"160", y1:"40", x2:"160", y2:"230", 'marker-end':"url(#arrowhead)"}),
			H3.path({class:"svgfilNone svgstr1", d:"M90,190 A120,50 0 1,0 230,190"})]);
},
diagram:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
diagram3()
{
	return H3.g([H3.line({class:"arrow0", x1:"60", y1:"40", x2:"260", y2:"40", 'marker-end':"url(#arrowhead)"}),
			H3.line({class:"arrow0", x1:"40", y1:"60", x2:"40", y2:"260", 'marker-end':"url(#arrowhead)"}),
			H3.line({class:"arrow0", x1:"60", y1:"280", x2:"250", y2:"280", 'marker-end':"url(#arrowhead)"}),
			H3.line({class:"arrow0", x1:"280", y1:"60", x2:"280", y2:"250", 'marker-end':"url(#arrowhead)"})]);
},
down(){ return H3.line({class:"arrow0", x1:"160", y1:"60", x2:"160", y2:"260", 'marker-end':"url(#arrowhead)"}); },
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
edit3()
{
	return H3.path({class:"svgstr4", d:"M280 40 160 280 80 240"});
},
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
morphism3()
{
	return H3.line({class:"arrow0", x1:"60", y1:"160", x2:"260", y2:"160", 'marker-end':"url(#arrowhead)"});
},
move:
`<line class="svgfilNone arrow0-30px" x1="60" y1="80" x2="240" y2="80" />
<line class="svgfilNone arrow0-30px" x1="60" y1="160" x2="240" y2="160" />
<line class="svgfilNone arrow0-30px" x1="60" y1="240" x2="240" y2="240" />`,
move3()
{
	return H3.g([H3.line({class:"svgfilNone arrow0-30px", x1:"60", y1:"80", x2:"240", y2:"80"}),
			H3.line({class:"svgfilNone arrow0-30px", x1:"60", y1:"160", x2:"240", y2:"160"}),
			H3.line({class:"svgfilNone arrow0-30px", x1:"60", y1:"240", x2:"240", y2:"240"})]);
},
new:
`<circle class="svgstr3" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
object:
`<circle cx="160" cy="160" r="160" fill="url(#radgrad1)"/>`,
object3()
{
	return H3.circle({cx:"160", cy:"160", r:"160", fill:"url(#radgrad1)"});
},
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
search()
{
	return [H3.circle({class:'search', cx:"240", cy:"80", r:"120"}),
			H3.line({class:"arrow0", x1:"20", y1:"300", x2:"220", y2:"120", 'marker-end':"url(#arrowhead)"})];
},
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
text3()
{
	return H3.g([	H3.line({class:"arrow0", x1:"40", y1:"60", x2:"280", y2:"60", 'marker-end':"url(#arrowhead)"}),
					H3.line({class:"arrow0", x1:"160", y1:"280", x2:"160", y2:"60"})]);
},
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
up() { return H3.line({class:"arrow0", x1:"160", y1:"260", x2:"160", y2:"60", 'marker-end':"url(#arrowhead)"}); },
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
		window.addEventListener('Autohide', function(e)
		{
			const panels = D.panels.panels;
			if (D.panels.checkPanels())
			{
				e.preventDefault();		// cancel!
				return;
			}
			if (e.detail.command === 'hide')
				for (const name in panels)
					if (panels.hasOwnProperty(name))
						panels[name].elt.style.width = '0';
			else
				for (const name in panels)
					if (panels.hasOwnProperty(name))
					{
						const pnl = panels[name];
						pnl.state === 'open' ? pnl.open() : (pnl.state === 'expand' ? pnl.expand() : null);
					}
		});
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
	static Html(header, action, panelId, title = '', buttonId = '')
	{
		return H.button(header, 'sidenavSection', buttonId, title, `onclick="${action};Cat.D.Panel.SectionToggle(event, this, \'${panelId}\')"`) +
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
		this.elt.addEventListener('mouseleave', function(e){ D.mouse.onPanel = false;});
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
		this.expandBtnElt.innerHTML = D.GetButton('panelCollapse', this.right ? 'chevronLeft' : 'chevronRight', `Cat.D.${this.name}Panel.expand()`, 'Collapse');
		this.state = 'open';
	}
	closeBtnCell()
	{
		return H.td(D.GetButton('panelClose', 'close', `Cat.D.${this.name}Panel.close()`, 'Close'), 'buttonBar');
	}
	expand(exp = 'auto')
	{
		this.elt.style.width = exp;
		D.panels.closeAll(this);
		this.expandBtnElt.innerHTML = D.GetButton('panelExpand', this.right ? 'chevronRight' : 'chevronLeft', `Cat.D.${this.name}Panel.collapse()`, 'Expand');
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
		return H.td(D.GetButton('panelExpand', this.right ? 'chevronLeft' : 'chevronRight', `Cat.D.${this.name}Panel.expand()`, 'Expand'), 'buttonBar', `${this.name}-expandBtn`);
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
	static SectionPanelDyn(header, action, panelId, title = '', buttonId = '')
	{
		return H.button(U.HtmlEntitySafe(header), 'sidenavSection', buttonId, U.HtmlEntitySafe(title), `onclick="${action};Cat.D.Panel.SectionToggle(event, this, \'${panelId}\')"`) +
				H.div('', 'section', panelId);
	}
}

/* 	TODO nneds work
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
			H.h4(H.tag('basename', '') + H.span('', '', 'category-basename-edit')) +
			H.h4(H.tag('proper-name', '') + H.span('', '', 'category-properName-edit')) +
			H.p(H.tag('description', '', 'description') + H.span('', '', 'category-description-edit')) +
			H.p(H.span('Actions: ', 'smallBold') + H.span('', 'left', 'category-actions')) +
			H.p('User: ' + H.span('', '', 'category-user', 'User'), 'description');
		this.categorySection = new CategorySection('Categories', this.elt, 'category-all-section', 'All available categories');
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
				D.GetButton('editProperName', 'edit', `Cat.R.$CAT.editElementText(event, '${R.category.name}', '${category.elementId()}', 'proper-name')`, 'Edit', D.default.button.tiny) : '';
			this.descriptionEditElt.innerHTML = isEditable ?
				D.GetButton('editDescription', `Cat.R.$CAT.editElementText(event, '${R.category.name}', '${category.elementId()}', 'description')`, 'Edit', D.default.button.tiny) : '';
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
									H.td(D.GetButton('threeDClear', 'delete', "Cat.D.threeDPanel.initialize()", 'Clear display'), 'buttonBar') +
									H.td(D.GetButton('threeDLeft', 'threeD_left', "Cat.D.threeDPanel.view('left')", 'Left'), 'buttonBar') +
									H.td(D.GetButton('threeDtop', 'threeD_top', "Cat.D.threeDPanel.view('top')", 'Top'), 'buttonBar') +
									H.td(D.GetButton('threeDback', 'threeD_back', "Cat.D.threeDPanel.view('back')", 'Back'), 'buttonBar') +
									H.td(D.GetButton('threeDright', 'threeD_right', "Cat.D.threeDPanel.view('right')", 'Right'), 'buttonBar') +
									H.td(D.GetButton('threeDbotom', 'threeD_bottom', "Cat.D.threeDPanel.view('bottom')", 'Bottom'), 'buttonBar') +
									H.td(D.GetButton('threeDfront', 'threeD_front', "Cat.D.threeDPanel.view('front')", 'Front'), 'buttonBar')
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
			let url = window.location.origin + window.location.pathname;
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
		this.expandBtnElt.innerHTML = D.GetButton('threeDPanelCollapse', 'chevronRight', `Cat.D.threeDPanel.collapse(true)`, 'Expand');
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
		const html = H.table(H.tr(
						H.td(D.GetButton('logClear', 'delete', 'Cat.R.diagram.clearLog(event)', 'Clear log'), 'buttonBar') +
						H.td(D.DownloadButton('LOG', 'Cat.R.diagram.downloadLog(event)', 'Download log'), 'buttonBar')
//						H.td(D.GetButton('play', 'Cat.D.ttyPanel.logSection.replayLog(event)', 'Play log file'), 'buttonBar') +
//						H.td(D.GetButton('save', `Cat.R.SaveLocal(Cat.R.diagram);Cat.D.statusbar.show(event, 'Diagram saved')`, 'Save diagram'), 'buttonBar')
					), 'buttonBarLeft') + H.hr();
		this.section.innerHTML = html;
		const that = this;
		window.addEventListener('CAT', function(e) { e.detail.command === 'default' && that.update(); });
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
		this.logElt.appendChild(H3.p(U.HtmlEntitySafe(R.diagram.prettifyCommand(args))));
	}
	antilog(args)	// TODO
	{
		const elt = document.createElement('p');
		this.logElt.appendChild(H3.p(U.HtmlEntitySafe(R.diagram.prettifyCommand(args))));
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
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('TTY') +
			H.button('Output', 'sidenavAccordion', '', 'TTY output from some composite', `onclick="Cat.D.Panel.SectionToggle(event, this, \'tty-out-section\')"`) +
			H.div(
				H.table(H.tr(
					H.td(D.GetButton('ttyClear', 'delete', `Cat.D.ttyPanel.out.innerHTML = ''`, 'Clear output'), 'buttonBar') +
					H.td(D.DownloadButton('LOG', `Cat.D.DownloadString(Cat.D.ttyPanel.out.innerHTML, 'text', 'console.log')`, 'Download tty log file'), 'buttonBar')),
						'buttonBarLeft') +
				H.pre('', 'tty', 'tty-out'), 'section', 'tty-out-section') +
			H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="Cat.D.Panel.SectionToggle(event, this, \'tty-error-section\')"`) +
			H.div(H.table(H.tr(
					H.td(D.GetButton('ttyErrorClear', 'delete', `Cat.D.ttyPanel.error.innerHTML = ''`, 'Clear errors')) +
					H.td(D.DownloadButton('ERR', `Cat.D.DownloadString(Cat.D.ttyPanel.error.innerHTML, 'text', 'console.err')`, 'Download error log file'), 'buttonBar')),
						'buttonBarLeft') +
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
//		R.CanDeleteDiagram(diagram) && toolbar.push(D.GetButton3('delete3', `Cat.R.DeleteDiagram(event,'${diagram.name}')`, 'Delete local copy of diagram'));
//		toolbar.push(D.DownloadButton3('JSON', `Cat.R.LoadDiagram('${diagram.name}').downloadJSON(event)`, 'Download JSON'));
//		toolbar.push(D.DownloadButton3('JS', `Cat.R.LoadDiagram('${diagram.name}').downloadJS(event)`, 'Download Javascript'));
//		toolbar.push(D.DownloadButton3('C++', `Cat.R.LoadDiagram('${diagram.name}').downloadCPP(event)`, 'Download C++'));
//		toolbar.push(D.DownloadButton3('PNG', `Cat.R.LoadDiagram('${diagram.name}').downloadPNG(event)`, 'Download PNG'));
		const elt = H3.div({class:'grabbable', id, 'data-timestamp':diagram.timestamp, 'data-name':diagram.name},
			H3.table(
			[
				H3.tr(
				[
					H3.td(H3.h4(U.HtmlEntitySafe(diagram.properName))),
					H3.td(toolbar, {class:'right'}),
				]),
				H3.tr(H3.td({class:'white', colspan:2}, H3.a({onclick:`Cat.D.diagramPanel.collapse();Cat.R.SelectDiagram('${diagram.name}')`},
															D.GetImageElement3(diagram.name)))),
				H3.tr(H3.td({description:U.HtmlEntitySafe(diagram.description), colspan:2})),
				H3.tr([H3.td(diagram.name, {class:'author'}), H3.td(dt.toLocaleString(), {class:'date'})], {class:'diagramSlot'}),
			]), {class:'grabbable', draggable:true, ondragstart:`Cat.D.DragElement(event, '${diagram.name}')`});
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

class ReferenceDiagramSection extends DiagramSection
{
	constructor(parent)
	{
		super('References', parent, 'diagram-reference-section', 'Diagrams referenced by this diagram');
		const that = this;
		function addRef(ref) {that.add(ref);}
		window.addEventListener('Diagram', function(e)
		{
			if (!R.diagram)
				return;
			const args = e.detail;
			switch(args.command)
			{
				case 'addReference':
					const ref = R.$CAT.getElement(args.name);
					that.add(ref);
					R.diagram.references.forEach(addRef);
					break;
				case 'removeReference':
					that.remove(args.name);
					break;
			}
		});
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'default':
					D.RemoveChildren(that.catalog);
					R.diagram.references.forEach(addRef);
					break;
			}
		});
	}
	add(diagram)
	{
		super.add(diagram, [D.GetButton3('RemoveReference', 'delete3', `Cat.D.RemoveReference(event,'${diagram.name}')`, 'Remove reference diagram')]);
	}
}

class UserDiagramSection extends DiagramSection
{
	constructor(parent)
	{
		super('User', parent, 'diagram-user-section', 'Diagrams authored by the user');
		const that = this;
		window.addEventListener('Login', function(e)
		{
			D.RemoveChildren(that.catalog);
			const userDiagrams = new Map();
			function addem(d)
			{
				if (userDiagrams.has(d.name) || d.user !== R.user.name || d.basename === R.user.name)
					return;
				userDiagrams.set(d.name, d);
				that.add(d);
			}
			R.Diagrams.forEach(addem);
			R.ServerDiagrams.forEach(addem);
		});
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			const diagram = R.GetDiagramInfo(args.diagram.name);
			switch(args.command)
			{
				case 'new':
				case 'download':
					if (diagram.user === R.user.name)
						that.add(diagram);
					break;
				case 'default':
					if (diagram.user === R.user.name)
						that.add(diagram);
					break;
				case 'delete':
					that.remove(args.name);
					break;
			}
		});
		this.sortBy = 'timestamp';
	}
	refresh()
	{
		this.diagrams.length = 0;
	}
}

class CatalogDiagramSection extends DiagramSection
{
	constructor(parent)
	{
		super('Catalog', parent, 'diagram-catalog-section', 'Catalog of available diagram');
		const that = this;
		function onkeydown() { Cat.D.OnEnter(event, function(e) { that.search(e); }); }
		this.searchInput = H3.input({class:'in100', id:'cloud-search', title:'Search', placeholder:'Diagram name contains...', onkeydown });
		const btn = D.GetButton3('CatalogSectionSearch', 'search', 'Cat.D.panels.panels.diagram.catalogSection.search()', 'Search for diagrams', D.default.button.small,
									'catalog-search-button', 'catalog-search-button-ani');
		this.header.appendChild(H3.div(H3.span(this.searchInput), H3.span(btn)));
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			const diagram = R.GetDiagramInfo(args.diagram.name);
			switch(args.command)
			{
				case 'catalogAdd':
					that.add(diagram);
					break;
				case 'catalogRemove':	// TODO not emitted eyt
					that.remove(args.diagram.name);
					break;
			}
		});
		this.sortBy = 'timestamp';
	}
	search(e)
	{
		this.searchButton = document.getElementById('catalog-search-button-ani');
		this.searchInput.classList.add('searching');
		const that = this;
		this.searchButton.setAttribute('repeatCount', 'indefinite');
		this.searchButton.beginElement();
		R.cloud.diagramSearch(this.searchInput.value, function(diagrams)
		{
			that.searchInput.classList.remove('searching');
			that.clear();
			that.searchButton.setAttribute('repeatCount', 1);
			diagrams.map(d => that.add(d));
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
		const that = this;
		function refresh(e) { R.diagram === e.detail.diagram && that.refresh(R.diagram); }
		window.addEventListener('Login', function(e) { R.diagram && that.refresh(R.diagram); });
		window.addEventListener('CAT', refresh);
		window.addEventListener('Assertion', refresh);
		this.assertions = H3.div({class:'catalog'});
		this.section.appendChild(this.assertions);
	}
	addAssertion(diagram, assertion)
	{
		if (diagram !== R.diagram)
			return;
		const canEdit = diagram.isEditable();
		const delBtn = H3.span(canEdit ? D.GetButton('assertionDelete', 'delete', `Cat.D.diagramPanel.assertionSection.deleteAssertion('${assertion.name}')`, 'Delete assertion') : '');
		const viewBtn = H3.span(D.GetButton('assertionView', 'view', `Cat.R.diagram.viewElements('${assertion.name}')`, 'View assertion'));
		const desc = H.span(assertion.description, '', `a_${assertion.name}`) +
							(canEdit ? D.GetButton('assertionEdit', 'edit', `Cat.R.diagram.editElementText(event, '${assertion.name}', 'a_${assertion.name}', 'description')`, 'Edit') : '');
		const div = H3.div({class:'right', id:`assertion ${assertion.name}`},
				[
					viewBtn, delBtn,
					H3.table(	[H3.tr([H3.td({}, H3.table(assertion.left.map(m => H3.tr(H3.td(m.to.properName))))),
										H3.td(H3.table(assertion.right.map(m => H3.tr(H3.td(m.to.properName)))))])], {class:'panelElt'})]);
		const sig = assertion.signature;
		div.addEventListener('mouseenter', function(e) { Cat.R.diagram.emphasis(sig, true);});
		div.addEventListener('mouseleave', function(e) { Cat.R.diagram.emphasis(sig, false);});
		div.addEventListener('mousedown', function(e) { Cat.R.diagram.selectElement(event, assertion.name);});
		this.assertions.appendChild(div);
	}
	refresh(diagram)
	{
		D.RemoveChildren(this.assertions);
		const that = this;
		diagram.assertions.forEach(function(a) { that.addAssertion(diagram, a); });
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
		const top = H3.span([H3.div({id:'diagramPanelToolbar'}),
							H3.h3(H3.span('Diagram')),
							H3.h4([H3.span({id:'diagram-basename'}), H3.span({id:'diagram-basename-edit'})]),
							H3.h4(H3.span({id:'diagram-category'})),
							H3.h4([H3.span({id:'diagram-properName'}), H3.span({id:'diagram-properName-edit'})]),
							H3.table(H3.tr(H3.td({id:'diagram-image', class:'center white'}))),
							H3.p([H3.span({class:'description', id:'diagram-description', title:'Description'}), H3.span({id:'diagram-description-edit'})]),
							H3.table(H3.tr([	H3.td([H3.span('By '), H3.span({id:'diagram-user'}), {class:'smallPrint'}]),
												H3.td([H3.span({id:'diagram-timestamp'}), H3.br(), H3.span({id:'diagram-info'}), {class:'smallPrint'}])])),
							H3.br()]);
		this.elt.appendChild(top);
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
			infoElt:					{value:document.getElementById('diagram-info'),				writable: false},
			imageElt:					{value:document.getElementById('diagram-image'),			writable: false},
			user:						{value: R.user.name,										writable: true},
		});
		const that = this;
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			const diagram = R.GetDiagramInfo(args.diagram.name);
			switch(args.command)
			{
				case 'default':
					that.categoryElt.innerHTML = diagram.codomain.htmlName();
					that.refresh(e);
					that.setToolbar(diagram);
					break;
				case 'png':
					const png = D.diagramPNG.get(diagram.name);
					const images = [...document.querySelectorAll(`#img-${diagram.elementId()}`)];
					images.map(img => img.src = png);
					break;
				case 'upload':
					that.refresh(e, false);
					break;
			}
		});
		window.addEventListener('Login', function(e) { D.diagramPanel.refresh(e); });
		window.addEventListener('Object', function(e) { D.diagramPanel.refreshInfo(e); });
		window.addEventListener('Morphism', function(e) { D.diagramPanel.refreshInfo(e); });
		window.addEventListener('Text', function(e) { D.diagramPanel.refreshInfo(e); });
		window.addEventListener('Assertion', function(e) { D.diagramPanel.refreshInfo(e); });
	}
	setToolbar(diagram)
	{
		if (!diagram)
			return;
		const isUsers = diagram && (R.user.name === diagram.user);
		const uploadBtn = (R.user.status === 'logged-in' && R.cloud && isUsers) ? H.td(D.GetButton('diagramUpload', 'upload', 'Cat.R.diagram.upload(event)',
			'Upload to cloud', D.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '';
		const deleteBtn = R.CanDeleteDiagram(diagram) ?
			H.td(D.GetButton('diagramDelete', 'delete', `Cat.R.DeleteDiagram(event, '${diagram.name}')`, 'Delete diagram', D.default.button.small, false, 'diagram-delete-btn'), 'buttonBar') : '';
		let downcloudBtn = '';
		if (R.diagram.refcnt <= 0 && R.cloud && R.ServerDiagrams.has(diagram.name))
		{
			const data = R.catalog.get(diagram.name);
			if (diagram.timestamp !== data.timestamp)
			{
				const date = new Date(data.timestamp);
				const tip = R.ServerDiagrams.get(diagram.name).timestamp > diagram.timestamp ? `Download newer version from cloud: ${date.toLocaleString()}` :
					'Download older version from cloud';
				downcloudBtn = H.td(D.GetButton('diagramReload', 'downcloud', 'Cat.R.ReloadDiagramFromServer()', tip, D.default.button.small, false, 'diagramDowncloudBtn'), 'buttonBar');
			}
		}
		const html = H.table(H.tr(
					(isUsers ? H.td(DiagramPanel.GetLockBtn(diagram), 'buttonBar', 'lockBtn') : '') +
					deleteBtn +
					downcloudBtn +
					uploadBtn +
					H.td(D.DownloadButton('JSON', 'Cat.R.diagram.downloadJSON(event)', 'Download JSON'), 'buttonBar') +
					H.td(D.DownloadButton('JS', 'Cat.R.diagram.downloadJS(event)', 'Download Javascript'), 'buttonBar') +
					H.td(D.DownloadButton('C++', 'Cat.R.diagram.downloadCPP(event)', 'Download C++'), 'buttonBar') +
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
	refresh(e, all = true)
	{
		const diagram = R.diagram;
		if (!diagram)
			return;
		this.descriptionElt.innerHTML = U.HtmlEntitySafe(diagram.description);
		this.properNameElt.innerHTML = diagram.htmlName();
		this.userElt.innerHTML = diagram.user;
		this.properNameEditElt.innerHTML = !diagram.isEditable() ? '' :
			D.GetButton('editProperName', 'edit', `Cat.R.$CAT.editElementText(event, '${R.diagram.name}', '${diagram.elementId()}', 'proper-name')`, 'Edit', D.default.button.tiny);
		this.descriptionEditElt.innerHTML = !diagram.isEditable() ? '' :
			D.GetButton('editDescription', 'edit', `Cat.R.$CAT.editElementText(event, '${R.diagram.name}', '${diagram.elementId()}', 'description')`, 'Edit', D.default.button.tiny);
		D.RemoveChildren(this.imageElt);
		this.imageElt.appendChild(D.GetImageElement3(diagram.name));
		this.setToolbar(diagram);
		this.refreshInfo(e);
		all && this.userDiagramSection.refresh();
	}
	refreshInfo(e)
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
				this.infoElt.appendChild(H3.span('Cloud has newer version of diagram', {class:'warning'}));
			else if (diagram.timestamp === info.timestamp)
				this.infoElt.appendChild(H3.span('Synced with cloud', {class:'warning'}));
			else if (diagram.timestamp > info.timestamp)
				this.infoElt.appendChild(H3.span('Newer than cloud', {class:'warning'}));
		}
		else
			this.infoElt.appendChild(H3.span('Not on cloud'));
	}
	static GetLockBtn(diagram)
	{
		const lockable = diagram.readonly ? 'unlock' : 'lock';
		return D.GetButton('lock', lockable, `Cat.R.diagram.${lockable}(event)`, U.Formal(lockable));
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
		super('help', true);
		const date = '04/11/2020 00:00:01 AM';
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('Catecon') +
			H.h4('The Categorical Console')	+
			H.p(H.small('Level 1', 'smallCaps italic'), 'txtCenter') +
			H.p(H.small(`Deployed ${date}`, 'smallCaps'), 'txtCenter') + H.br() +
			H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Help for mouse and key actions', `onclick="Cat.D.Panel.SectionToggle(event, this, \'catActionHelpPnl\')"`) +
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
						H.h5('Middle Mouse Button') +
							H.p('Click and drag to pan the diagram view.') +
					H.h4('Key Actions') +
						H.h5('Arrow Keys') +
							H.p('Pan the diagram view in the indicated direction.') +
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
						H.h5('Control-A') +
							H.p('Select all elements.') +
						H.h5('Control-C') +
							H.p('Copy elements into the paste buffer.') +
						H.h5('Control-D') +
							H.p('Open diagram panel.') +
						H.h5('Control-L') +
							H.p('Open output panel.') +
						H.h5('Control-M') +
							H.p('Open morphism panel.') +
						H.h5('Control-O') +
							H.p('Open object panel.') +
						H.h5('Control-V') +
							H.p('Paste elements from the paste buffer.') +
						H.h5('Control-Z') +
							H.p('Undo the last edit action.'), 'section', 'catActionHelpPnl') +
			H.button('Category Theory', 'sidenavAccordion', 'catHelpPnlBtn', 'References', `onclick="Cat.D.Panel.SectionToggle(event, this, \'catHelpPnl\')"`) +
			H.div(
				H.small('All of mathematics is divided into one part: Category Theory', '') +
				H.h4('References') +
				H.p(H.a('"Categories For The Working Mathematician"', 'italic', '', '',
					'href="https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician" target="_blank"')), 'section', 'catHelpPnl') +
			H.button('Articles', 'sidenavAccordion', 'referencesPnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(event, this, \'referencesPnl\')"`) +
			H.div(	H.p(H.a('Intro To Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/09/16/cat-prog/"')) +
					H.p(H.a('V Is For Vortex - More Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"')),
						'section', 'referencesPnl') +
			H.button('Terms and Conditions', 'sidenavAccordion', 'TermsPnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(event, this, \'TermsPnl\')"`) +
			H.div(	H.p('No hate.'), 'section', 'TermsPnl') +
			H.button('License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(event, this, \'licensePnl\')"`) +
			H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
					H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
					H.p('Inelegant or unreferenced diagrams are removed.  See T&amp;C\'s'), 'section', 'licensePnl') +
			H.button('Credits', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="Cat.D.Panel.SectionToggle(event, this, \'creditsPnl\')"`) +
			H.div(	H.a('Saunders Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
					H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'section', 'creditsPnl') +
			H.button('Third Party Software', 'sidenavAccordion', 'third-party', '', `onclick="Cat.D.Panel.SectionToggle(event, this, \'thirdPartySoftwarePnl\')"`) +
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
		this.userNameElt = document.getElementById('user-name');
		this.userEmailElt = document.getElementById('user-email');
		this.errorElt = document.getElementById('login-error');
		const that = this;
		window.addEventListener('Login', function(e)
		{
			that.update();
			if (e.detail.command === 'logged-in')
				that.close();
		});
		window.addEventListener('Registered', function() {that.update();});
		window.addEventListener('load', function() {that.update();});
	}
	update()
	{
		this.userNameElt.innerHTML = R.user.name;
		this.userEmailElt.innerHTML = R.user.email;
		this.loginInfoElt.innerHTML = '';
		this.errorElt.innerHTML = '';
		let html = '';
		function getLoginForm()
		{
			return H.form(H.table(	H.tr(H.td('User name')) +
									H.tr(H.td(H.input('', '', 'login-user-name', 'text', { ph:'Name', x:	'autocomplete="username"', }))) +
									H.tr(H.td('Password')) +
									H.tr(H.td(H.input('', '', 'login-password', 'password',
									{ ph:'********',
// TODO? causes weirdness										x:'autocomplete="current-password" onkeydown="Cat.D.OnEnter(event, Cat.R.cloud.login, Cat.R.cloud)"',
									}))) +
								H.tr(H.td(H.button('Login', '', '', '', 'onclick="Cat.R.login(event)"')))));
		}
		function getLogoutButton() { return H.button('Log Out', '', '', '', 'onclick="Cat.R.cloud.logout()"'); }
		function getResetButton() { return H.button('Reset password', '', '', '', 'onclick="Cat.R.cloud.resetPassword(event)"'); }
		function getConfirmationInput(endRows)
		{
			return H.form(H.h3('Confirmation Code') +
				H.span('The confirmation code is sent by email to the specified address above.') +
				H.table(	H.tr(H.td('Confirmation code')) +
							H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code', x:'onkeydown="Cat.D.OnEnter(event, Cat.R.cloud.confirm, Cat.R.cloud)"'}))) +
					endRows));
		}
		switch(R.user.status)
		{
			case 'logged-in':
				html += H.table(H.tr(H.td(getLogoutButton()) + H.td(getResetButton())));
				break;
			case 'unauthorized':
				html += getLoginForm();
				html += H.form(H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="Cat.D.Panel.SectionToggle(event, this, \'signupPnl\')"`) +
					H.div( H.table(H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
								H.tr(H.td('Email')) +
								H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
								LoginPanel.PasswordForm('', "Cat.R.cloud.signup") +
								H.tr(H.td(H.button('Sign up', '', '', '', 'onclick="Cat.R.cloud.signup()"')))), 'section', 'signupPnl'));
				break;
			case 'registered':
				html += getConfirmationInput(H.tr(H.td(H.button('Submit Confirmation Code', '', '', '', 'onclick="Cat.R.cloud.confirm(event)"')))) + getLogoutButton();
				break;
			case 'reset':
				html += getConfirmationInput(	H.tr(H.td(H.input('', '', 'login-new-password', 'password', { ph:'Password', x:	'autocomplete="new-password"', }))) +
												H.tr(H.td(H.button('Submit new password', '', '', '', 'onclick="Cat.R.cloud.updatePassword(event)"'))));
				html += getLogoutButton();
				break;
			default:
				html += getLoginForm();
				break;
		}

		this.loginInfoElt.innerHTML = html;
		this.loginUserNameElt = document.getElementById('login-user-name');
		this.passwordElt = document.getElementById('login-password');
	}
	toggle()
	{
		super.toggle();
		this.update();
	}
	static PasswordForm(sfx, onkeydown)
	{
		return H.tr(H.td('Categorical Access Key')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupSecret`, 'text',
				{
					ph:'????????',
					x:	'autocomplete="none"',
				}))) +
				H.tr(H.td('Password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPassword`, 'password', { ph:'Password', x:	'autocomplete="new-password"', }))) +
				H.tr(H.td('Confirm password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPasswordConfirm`, 'password',
				{
					ph:'Confirm',
					x:	`autocomplete="confirm-password" onkeydown="Cat.D.OnEnter(event, ${onkeydown}, Cat.R.cloud)"`,
				})));
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
		const that = this;
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
		if (!DiagramText.IsA(elt))
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
		const that = this;
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			const diagram = R.GetDiagramInfo(args.diagram.name);
			if (args.command === 'default')
			{
				D.RemoveChildren(that.catalog);
				that.refresh();
			}
		});
		window.addEventListener('Login', function(e) {that.refresh();});
		window.addEventListener(this.type, function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			if (!diagram || diagram !== R.diagram)
				return;
			let element = args.element;
			if (!element)
				return;
			const to = DiagramMorphism.IsA(element) || DiagramObject.IsA(element) ? element.to : element;
			switch(args.command)
			{
				case 'new':
					!(DiagramMorphism.IsA(element) || DiagramObject.IsA(element)) && that.add(to);
					break;
				case 'delete':
					to.refcnt === 1 && that.remove(to.name);
					break;
				case 'update':
					that.update(diagram, element.name);
					break;
			}
		});
	}
	refresh()
	{
		const that = this;
		if (!R.diagram)
			return;
		switch(this.type)
		{
			case 'Object':
				R.diagram.forEachObject(function(o){that.add(o);});
				break;
			case 'Morphism':
				R.diagram.forEachMorphism(function(m){that.add(m);});
				break;
			case 'Text':
				R.diagram.forEachText(function(t){that.add(t);});
				break;
		}
	}
}

class ReferenceElementSection extends ElementSection
{
	constructor(title, parent, id, tip, type)
	{
		super(title, parent, id, tip, type);
		const that = this;
		function addRefs(diagram)
		{
			diagram.allReferences.forEach(function(cnt, name)
			{
				const ref = R.$CAT.getElement(name);
				ref[that.type === 'Object' ? 'forEachObject' : 'forEachMorphism'](function(o) { that.add(o); });
			});
		}
		window.addEventListener('CAT', function(e)
		{
			const args = e.detail;
			switch(args.command)
			{
				case 'default':
					D.RemoveChildren(that.catalog);
					addRefs(args.diagram);
					break;
			}
		});
		window.addEventListener('Diagram', function(e)
		{
			const args = e.detail;
			const diagram = args.diagram;
			switch (args.command)
			{
				case 'addReference':
					addRefs(diagram);
					break;
				case 'removeReference':
					that.remove(args.name);
					diagram[that.type === 'Object' ? 'forEachObject' : 'forEachMorphism'](function(o) { that.remove(o); });
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
		this.elt.innerHTML = H.table(H.tr(this.expandPanelBtn() + this.closeBtnCell()), 'buttonBarRight') + H.h3(title);
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
		const that = this;
		function thatSearch(e) { that.search(e); }
		function onkeydown(e) { Cat.D.OnEnter(event, thatSearch); }
		this.searchInput = H3.input({class:'in100', id:`element-panel-${this.name}-diagram-search`, title:'Search', placeholder:'Search', onkeydown, size:8});
		const btn = D.GetButton3(`${name}Search`, 'edit3', thatSearch, 'Search in a diagram');
		this.elt.appendChild(H3.div(H3.span('Find in category:', {class:'smallPrint'}), this.searchInput, btn));
		this.searchItems = H3.div({id:`element-panel-${this.name}-search-items`, class:'catalog'});
		this.elt.appendChild(this.searchItems);
	}
	search(e)
	{
		D.RemoveChildren(this.searchItems);
		const that = this;
		R.diagram.codomain[this.iterator](function(o)
		{
			const rx = new RegExp(that.searchInput.value, 'gi');
			rx.exec(o.basename.toString()) && that.searchItems.appendChild(o.getHtmlRep(that.constructor.name));
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
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell()), 'buttonBarLeft') +
			H.button('Settings', 'sidenavAccordion', 'catActionPnlBtn', 'Help for mouse and key actions', `onclick="Cat.D.Panel.SectionToggle(event, this, \'settings-actions\')"`) +
			H.div(
				H.table(
					H.tr(	H.td(`<input type="checkbox" ${D.gridding ? 'checked' : ''} onchange="Cat.D.gridding = !D.gridding;R.SaveDefaults()">`) +
							H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
					H.tr(	H.td(`<input type="checkbox" ${R.default.debug ? 'checked' : ''} onchange="Cat.R.default.debug = !Cat.R.default.debug;Cat.R.SaveDefaults()">`) +
							H.td('Debug', 'left'), 'sidenavRow')
			), 'section', 'settings-actions') +
			H.button('Defaults', 'sidenavAccordion', 'catActionPnlBtn', 'Help for mouse and key actions', `onclick="Cat.D.Panel.SectionToggle(event, this, \'settings-defaults\')"`) +
			H.div('', 'section', 'settings-defaults') +
			H.button('Equality Info', 'sidenavAccordion', 'catActionPnlBtn', 'Help for mouse and key actions',
				`onclick="Cat.D.Panel.SectionToggle(event, this, \'settings-equality\')"`) +
			H.div('', 'section', 'settings-equality');

		this.initialize();
		this.equalityElt = document.getElementById('settings-equality');
		const that = this;
		R.workers.equality.addEventListener('message', function(msg)
		{
			if (msg.data.command === 'Info')
			{
				const elt = that.equalityElt;
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
	}
}

class TextPanel extends Panel
{
	constructor()
	{
		super('text');
		this.elt.innerHTML =
			H.table(H.tr(this.expandPanelBtn() + this.closeBtnCell()), 'buttonBarRight') +
			H.h3('Text');
		this.textSection = new DiagramElementSection('Text', this.elt, 'diagram-object', 'Text in this diagram', 'Text');
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
			description:	{value: 'description' in args ? U.HtmlEntitySafe(args.description) : '',	writable: true},
			diagram:		{value: diagram,										writable: true},	// is true for bootstrapping
			dual:			{value:	dual,											writable: false},
			name:			{value: name,											writable: true},
			properName:		{value: U.HtmlEntitySafe(properName),					writable: true},
			refcnt:			{value: 0,												writable: true},
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
					baseBtn = this.refcnt <= 1 ? D.GetButton('editBasename', 'edit', `Cat.R.diagram.editElementText(event, '${this.name}', '${id}', 'basename')`, 'Edit', tny) : '';
					descBtn = D.GetButton('editDescription', 'edit', `Cat.R.diagram.editElementText(event, '${this.name}', '${id}', 'description')`, 'Edit', tny);
					pNameBtn = this.canChangeProperName() ? D.GetButton('editProperName', 'edit', `Cat.R.diagram.editElementText(event, '${this.name}', '${id}', 'properName')`, 'Edit', tny) : '';
					break;
			}
		}
		return H.table(
				H.tr(H.th(H.tag('proper-name', this.htmlName()) + pNameBtn, 'center', '', '', 'colspan=2')) +
				H.tr(H.td('Base name:', 'left') + H.td(H.tag('basename', this.basename) + baseBtn, 'left')) +
				H.tr(H.td('Description:', 'left') + H.td(H.tag('description', this.description, 'left') + descBtn)) +
				H.tr(H.td('Type:', 'left') + H.td(U.Cap(U.DeCamel(this.constructor.name)), 'left')) +
				H.tr(H.td('Diagram:', 'left') + H.td(this.diagram ? this.diagram.htmlName() : '', 'left')) +
				H.tr(H.td('User:', 'left') + H.td(this.diagram ? this.diagram.user : '', 'left')), '', id);
	}
	isEditable()
	{
		return R.diagram && (R.diagram.name === this.diagram.name || R.diagram.name === this.name) &&
			('readonly' in this ? !this.readonly : true) && this.diagram.user === R.user.name;
	}
	isIterable()
	{
		return false;		// fitb
	}
	getElementSignature()
	{
		return 'code' in this ? U.SigArray([this.signature, U.Sig(this.code)]) : U.Sig(this.name);
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
	moreHelp()
	{
		return '';
	}
	removeSVG()
	{
		if (this.svg && this.svg.parentNode)
			this.svg.parentNode.removeChild(this.svg);
	}
	elementId(prefix = '')
	{
		return U.DeCamel(Element.SafeName((prefix === '' ? '' : prefix + '-') + this.name));
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
	find(elt, index = [])
	{
		return elt === this ? index : [];
	}
	basic()
	{
		return 'base' in this ? this.base : this;
	}
	getBase()
	{
		return this;
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
	static SafeName(name)
	{
		return U.SafeId(`el_${name}`);
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
		this.visited = new Set();
	}
	isLeaf()
	{
		return this.graphs.length === 0;
	}
	getIndices(indices)		// indices may be truncated by name objects; return it
	{
		let fctr = this;
		let nuIndices = [];
		if (this.graphs.length === 0)
			return this;
		if (indices.length === 1 && indices[0].length === 0)
			return this;
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
			fctr = fctr.graphs.length > 0 ? fctr.graphs[k] : fctr;
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
		if (this.isLeaf())
		{
			const links = this.links.slice();
			this.visited = new Set();
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
				const path = document.createElementNS(D.xmlns, 'path');
				node.appendChild(path);
				path.setAttributeNS(null, 'data-link', `${visitedStr} ${idxStr}`);
				path.setAttributeNS(null, 'class', 'string');
				path.setAttributeNS(null, 'style', `stroke:#${color}AA`);
				path.setAttributeNS(null, 'id', linkId);
				path.setAttributeNS(null, 'd', coords);
				path.setAttributeNS(null, 'filter', filter);
				path.addEventListener('mouseover', showStatusBar);
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
		const mouseenter = function(e) { Cat.R.diagram.emphasis(sig, true);};
		const mouseleave = function(e) { Cat.R.diagram.emphasis(sig, false);};
		const mousedown = function(e) { Cat.R.diagram.selectElement(event, sig);};
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
		return {coords:adx < ady ? `M${this.xy.x},${this.xy.y} L${cod.x},${cod.y}` : `M${this.xy.x},${this.xy.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`,
			vertical:dx === 0};
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
		this.scan(function(g, ndx) { hasTag = hasTag || g.hasTag(tag); });
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
}

class CatObject extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		diagram && diagram.addElement(this);
		this.constructor.name === 'CatObject' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return H3.div(super.help(), (this.category ? H3.p(`Category: ${this.category.htmlName()}`) : 'Object'));
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
	isTerminal() { return false; }		// fitb
	isInitial() { return false; }
	getSize() { return Number.MAX_VALUE; }
	getHtmlRep(idPrefix)
	{
		const id = this.elementId(idPrefix);
		const that = this;
		const onclick = function(e) { Cat.R.diagram.placeObject(event, that.name); };
		const ondragstart = function(e) { Cat.D.DragElement(event, that.name); };
		return H3.table(	[H3.tr(H3.td(H3.tag('proper-name', this.properName), {class:'left'})),
							H3.tr(H3.td(H3.tag('basename', this.basename), {class:'left'})),
							H3.tr(H3.td(H3.tag('description', this.description), {class:'left'}))],
							{id, class:'panelElt grabbable sidenavRow', draggable:true, ondragstart, onclick});
	}
	static IsA(obj)
	{
		return CatObject.prototype.isPrototypeOf(obj);
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
		return H3.div(super.help(), H3.p(`Finite object of ${'size' in this ? 'size: ' + this.size.toString() : 'indeterminate size'}`));
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
		/*
		if ('size' in args)
		{
			if (args.size === 1)
				return '#1';
			if (args.size === 0)
				return '#0';
		}
		*/
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
	static IsA(obj)
	{
		return FiniteObject.prototype.isPrototypeOf(obj);
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
		return H3.div(super.help(), hdr, ...this.objects.map(o => o.getHtmlRep()));
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
		return new Graph(this.diagram, position, width, graphs);
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
	isIterable()	// Default is for a MultiObject to be iterable if all its morphisms are iterable.
	{
		return this.objects.reduce((r, o) => r && o.isIterable(), true);
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
	}
	help()
	{
		return H3.div(super.help(H3.p(this.dual ? 'Coproduct' : 'Product')));
	}
	getFactor(factor)
	{
		if (factor === -1)
			return this.diagram.get('FiniteObject', {size:this.dual ? 0 : 1});
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
				const base = NamedObject.IsA(o) ? o.base : o;
				if (ProductObject.IsA(base) && base.dual === this.dual)		// continue the search hierarchically
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
		return `${c}Po{${args.objects.map(o => o.name).join(',')}}oP${c}`;
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
	static Get(diagram, args)
	{
		if ('objects' in args && args.objects.length === 0)
		{
			const size = ('dual' in args && args.dual) ? 0 : 1;
			return diagram.get('FiniteObject', {size});
		}
		return null;
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
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return H3.div(super.help(), H3.p('Pullback object'));
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
	loadEquivalences()
	{
		for (let i=1; i<this.cone.length; ++i)
		{
			const base = [this.diagram.getElement(this.cone[0]), this.source[0]];
			const leg = [this.diagram.getElement(this.cone[i]), this.source[i]];
			const {leftSig, rightSig} = R.LoadEquivalences(this.diagram, this, base, leg);
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
		R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return H3.div(super.help(H3.p('Hom')));
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
		const xy = U.GetArg(args, 'xy', new D2());
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,													writable:	false},
			name:			{value: U.GetArg(nuArgs, 'name', `${diagram.name}/${diagram.getAnon('r')}`),	writable:	false},
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
		const paraElements = [H3.tag('description', this.description, {class:'tty', id:'descriptionElt'}), {id}];
		canEdit && paraElements.push(D.GetButton3('EditElementText', 'edit3', `Cat.R.diagram.editElementText(event, '${this.name}', '${id}', 'description')`, 'Commit editing', D.default.button.tiny));
		const elements = [H3.p(paraElements)];
		if (canEdit)
		{
			const inId = 'toolbar-help-text-height';
			elements.push(H3.table(
				H3.tr(H3.td('Text height:'), H3.td(
`<input class="in100" id="${inId}" type="number", onchange="Cat.DiagramText.UpdateHeight('${this.name}', this.value)" min=3 max=500 width=8 value="${this.height}"</input>`),
					{class:'sidenavRow'}),
				H3.tr(H3.td('Text weight:'), H3.td(
`<select onchange="Cat.DiagramText.UpdateWeight('${this.name}', this.value)" value="${this.weight}">
<option value="normal" ${'normal' === this.weight ? 'selected="selected"' : ''}>normal</option>
<option value="bold" ${'bold' === this.weight ? 'selected="selected"' : ''}>bold</option>
<option value="lighter" ${'lighter' === this.weight ? 'selected="selected"' : ''}>lighter</option>
<option value="bolder" ${'bolder' === this.weight ? 'selected="selected"' : ''}>bolder</option>
</select>`),
					{class:'sidenavRow'})));
		}
		return H3.div(elements);
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
		return this.description.includes('\n') ? this.description.split('\n').map(t => `<tspan text-anchor="left" x="0" dy="1.2em">${t}</tspan>`).join('') :
			this.description;
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const svgText = H3.text({'text-anchor':'left', class:'diagramText grabbable', style:`font-size:${this.height}px; font-weight:${this.weight}`});
		const svg = H3.g({'data-type':'text', 'data-name':name, 'text-anchor':'left', class:'diagramText grabbable', id:this.elementId(),
			transform:`translate(${this.x} ${this.y})`}, svgText);
		node.appendChild(svg);
		this.svg = svg;
		this.svgText = svgText;
		svgText.innerHTML = this.tspan();
		const mousedown = function(e) { Cat.R.diagram.selectElement(event, name);};
		const mouseenter = function(e) { Cat.D.Mouseover(event, name, true);};
		const mouseleave = function(e) { Cat.D.Mouseover(event, name, false);};
		svg.addEventListener('mousedown', mousedown);
		svg.addEventListener('mouseenter', mouseenter);
		svg.addEventListener('mouseleave', mouseleave);
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
			this.svg.setAttribute('transform', `translate(${this.x} ${this.y})`);
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
		box.x = this.x;
		box.y = this.y;
		return box;
	}
	emphasis(on)
	{
		D.SetClass('emphasis', on, this.svgText);
	}
	getHtmlRep(idPrefix)
	{
		const div = H3.div();
		const viewBtn = H3.span(D.GetButton('viewElements', 'view', `Cat.R.diagram.viewElements('${this.name}')`, 'View text'));
		const canEdit = R.diagram.isEditable();
		const delBtn = canEdit ? H3.span(D.GetButton('delete', 'delete', `Cat.R.Actions.delete.action('${this.name}', Cat.R.diagram, [Cat.R.diagram.getElement('${this.name}')])`,
			'Delete text')) : null;
		const editBtn = canEdit ? H3.span(D.GetButton('editDescription', 'edit', `Cat.R.diagram.editElementText(event, '${this.name}', '${this.elementId(idPrefix)}', 'description')`, 'Edit')) : null;
		const inDiv = H3.div(H3.span(this.description, {id:`edit_${this.name}`}), {class:'panelElt'});
		editBtn && inDiv.appendChild(editBtn);
		div.appendChild(H3.div([viewBtn, delBtn], {class:'right'}));
		div.appendChild(inDiv);
		div.addEventListener('mouseenter', function(e) { Cat.R.diagram.emphasis(this.name, true);});
		div.addEventListener('mouseleave', function(e) { Cat.R.diagram.emphasis(this.name, false);});
		inDiv.addEventListener('mousedown', function(e) { Cat.R.diagram.selectElement(event, this.name);});
		return div;
	}
	static IsA(obj)
	{
		return DiagramText.prototype.isPrototypeOf(obj);
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
		return H3.div(super.help(), H3.p('Tensor'));
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
		return H3.div(super.help(), H.p('Object in index category'));
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
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const mouseenter = function(e) { Cat.D.Mouseover(event, name, true);};
		const mouseleave = function(e) { Cat.D.Mouseover(event, name, false);};
		const mousedown = function(e) { Cat.R.diagram.selectElement(event, name);};
		const svg = H3.text();
		node.appendChild(svg);
		this.svg = svg;
		svg.setAttributeNS(null, 'data-type', 'object');
		svg.setAttributeNS(null, 'data-name', this.name);
		svg.setAttributeNS(null, 'text-anchor', 'middle');
		svg.setAttributeNS(null, 'class', 'object grabbable');
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
		if (!this.svg)
			this.diagram.addSVG(this);
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
		return DiagramObject.IsA(o) && (this.to.isEquivalent(o.to) || this.isIdentityFusible());
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
		R.EmitElementEvent(diagram, 'new', this);
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
		const objs = new Set();
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
		Object.defineProperty(this, 'icon', 	{value:nuArgs.icon,	writable:	false});
		Object.defineProperty(this, 'priority', {value:U.GetArg(args, 'priority', 0),	writable:	false});
	}
	help()
	{
		return H3.div(super.help(), H3.p('Action'));
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
			icon:
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
		return from;
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
			basename:			'identity',
			icon:	// TODO
`<line class="arrow0" x1="160" y1="60" x2="120" y2="100"/>
<line class="arrow0" x1="130" y1="260" x2="190" y2="260"/>
<line class="arrow0" x1="160" y1="60" x2="160" y2="260"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
			basename:			'name',
			icon:
`<circle cx="80" cy="240" r="90" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,180 L170,120"/>
<path class="svgstr4" d="M140,210 L200,150"/>
<path class="svgstr3" d="M220,130 L260,40 L300,130"/>
<line class="svgstr3" x1="235" y1="95" x2="285" y2="95"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
			const named = this.doit(e, diagram, args);
			args.source = source.name;
			diagram.log(args);
			const elements = CatObject.IsA(source) ? [named.idFrom.name, named.idTo.name, named.name] : [named.name];
			diagram.antilog({command:'delete', elements});
			D.toolbar.hide();
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
			return nidIndex;
		}
		else if (Morphism.IsA(source))
		{
			const nuArgs = U.Clone(args);
			nuArgs.source.to = source;
			nuArgs.domain = source.domain.to;
			nuArgs.codomain = source.codomain.to;
			const to = new NamedMorphism(diagram, nuArgs);
			const nuFrom = new DiagramMorphism(diagram, {to, domain:source.domain, codomain:source.codomain});
			source.update();
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
			description:	'Copy an element',
			basename:			'copy',
			icon:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		let elt = null;
		let args = {};
		if (DiagramMorphism.IsA(from))
		{
			let dom = new D2(from.domain.getXY()).add(D.default.stdOffset);
			let cod = new D2(from.codomain.getXY()).add(D.default.stdOffset);
			args = {command: 'copy', source:from.to, xy:dom, xyCod:cod};
		}
		else if (DiagramObject.IsA(from))
		{
			const xy = new D2(from.getXY()).add(D.default.stdOffset);
			args = {command: 'copy', source:from.to, xy};
		}
		else if (DiagramText.IsA(from))
		{
			const xy = new D2(from.getXY()).add(D.default.stdOffset);
			args = {command: 'copy', source:from.description, xy};
		}
		elt = this.doit(e, diagram, args);
		diagram.log(args);
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, args)
	{
		const source = args.source;
		if (Morphism.IsA(source))
			return diagram.placeMorphism(e, source, args.xy, args.xyCod, args.save);
		else if (CatObject.IsA(source))
			return diagram.placeObject(e, source, args.xy, args.save);
		else if (typeof source === 'string')
			return diagram.placeText(e, args.xy, source, args.save);
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
			description:	'Flip the name',
			basename:		'flipName',
			priority:		89,
			icon:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="280"/>
<line class="arrow0" x1="80" y1="120" x2="80" y2="220"/>
<line class="arrow0" x1="240" y1="120" x2="240" y2="220"/>
<line class="arrow0" x1="40" y1="120" x2="120" y2="120"/>
<line class="arrow0" x1="200" y1="120" x2="280" y2="120"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
		return diagram.isEditable() && ary.length === 1 && DiagramMorphism.IsA(ary[0]);
	}
}

class ProductAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			description:	`Create ${dual ? 'co' : ''}product of two or more objects or morphisms`,
			basename:		dual ? 'coproduct' : 'product',
			icon:			dual ?  D.svg.add :
`<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
		if (DiagramMorphism.IsA(elt))
		{
			const morphisms = elements.map(m => m.to);
			const to = diagram.get('ProductMorphism', {morphisms, dual:this.dual});
			return diagram.placeMorphism(e, to, D.Barycenter(elements));
		}
		else if (DiagramObject.IsA(elt))
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
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && DiagramObject.IsA(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.IsA(v), true));
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
			icon:			dual ?  D.svg.add :
`<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
			dual,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
		this.table = null;
	}
	html(e, diagram, ary)
	{
		D.RemoveChildren(D.toolbar.help);
		const elt = ary[0].to;
		let top = null;
		if (ProductObject.IsA(elt))
		{
			const used = new Set();
			const that = this;
			diagram.codomain.forEachMorphism(function(m)
			{
				if (FactorMorphism.IsA(m) && m.dual === that.dual)
				{
					let base = m[that.dual ? 'codomain' : 'domain'];
					if (NamedObject.IsA(base))
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
						H3.td(!used.has(o) ? D.GetButton3(this.name, 'delete3', `Cat.R.Actions.${this.name}.remove(event, this)`, 'Remove', D.default.button.tiny) : '&nbsp;', style),
						H3.td(o.htmlName()),
					];
					return H3.tr(row, {'data-ndx':i, 'data-name':o.name});
				}),
				this.getObjectSelectorRow(diagram),
			]);
			top = H3.div([	H3.h4(`Edit a ${this.dual ? 'Cop' : 'P'}roduct`),
							this.table,
							D.GetButton3(this.name, 'edit3', `Cat.R.Actions.${this.name}.action(event, Cat.R.diagram, '${elt.name}')`, 'Commit editing', D.default.button.tiny)]);
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
		i > 0 && up.children.length === 0 && up.appendChild(D.GetButton3(this.name, 'up', `Cat.R.Actions.${this.name}.up(event, this)`, 'Move down', D.default.button.tiny));
		i < cnt -1 && down.children.length === 0 && down.appendChild(D.GetButton3(this.name, 'down', `Cat.R.Actions.${this.name}.down(event, this)`, 'Move down', D.default.button.tiny));
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
		const that = this;
		function newFactor()
		{
			if (that.options.selectedIndex !== 0)
			{
				const editor = Cat.R.Actions[that.name];
				editor.table.appendChild(editor.getObjectSelectorRow(diagram));
				editor.updateTable();
			}
		}
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
		if (DiagramMorphism.IsA(elt))
		{
			// TODO
		}
		else if (DiagramObject.IsA(elt))
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
				else if (NamedObject.IsA(elt) && elt.source === elt)
				{
					const nuNo = new NamedObject(diagram, {basename:elt.basename, source:nuProd});
					const oldIndexes = diagram.domain.find(elt);
				}
				else if (Morphism.IsA(elt))
				{
					const src = this.dual ? elt.codomain : elt.domain;
					if ((FactorMorphism.IsA(elt) && src === oldProd) || (NamedObject.IsA(src) && src.base === oldProd))
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
		return ary.length === 1 && ary[0].isEditable() && ProductObject.IsA(ary[0].to) && ary[0].to.dual === this.dual;
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
		R.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, source)
	{
		const names = source.map(m => m.name);
		const pg = this.doit(e, diagram, source);
		diagram.log({command:this.name, source:names});
		// 	TODO antilog
		diagram.deselectAll(e);
		diagram.addSelected(pb);
	}
	doit(e, diagram, source)
	{
		const morphisms = source.map(m => m.to);
		const to = diagram.get('PullbackObject', {morphisms, dual:this.dual});
		const bary = D.Barycenter(source.map(m => m.domain));
		const sink = this.dual ? source[0].domain : source[0].codomain;
		const xy = bary.add(bary.subtract(sink));
		const pb = new DiagramPullback(diagram, {xy, to, source, dual:this.dual});
		return pb;
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
			basename:		`${dual ? 'co' : ''}productAssembly`,
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
		R.ReplayCommands.set(this.basename, this);
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
			icon:
`<line class="arrow0" x1="40" y1="60" x2="300" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="260" x2="140" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="180" y1="100" x2="280" y2="260" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
	}
	html(e, diagram, ary)
	{
		D.RemoveChildren(D.toolbar.help);
		const issues = diagram.assemble(e, ary[0]);
		const rows = issues.map(isu => H3.tr([H3.td(isu.message), H3.td(H3.button(isu.element.to.htmlName(),
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
		return ary.length === 1 && ary[0].isEditable() && DiagramObject.IsA(ary[0]);
	}
}

class HomAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a hom object or morphism from two such items',
						basename:		'hom',
						icon:
`<path class="arrow0" d="M100 80 L80 80 L80 240 L 100 240"/>
<path class="arrow0" d="M220 80 L240 80 L240 240 L 220 240"/>
<line class="arrow0rnd" x1="170" y1="240" x2="150" y2="260"/>`};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
		if (DiagramObject.IsA(elements[0]))
			return diagram.placeObject(e, diagram.get('HomObject', {objects:elements.map(o => o.to)}), xy);
		else if (DiagramMorphism.IsA(elements[0]))
			return diagram.placeMorphism(e, diagram.get('HomMorphism', {morphisms:elements.map(m => m.to)}), xy);
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
			description:	`Select a morphism listed from a common ${dual ? 'co' : ''}domain`,
			dual,
			basename:		dual ? 'homLeft' : 'homRight',
			icon:			dual ?
`<circle cx="260" cy="160" r="60" fill="url(#radgrad1)"/><line class="arrow0" x1="30" y1="160" x2="200" y2="160" marker-end="url(#arrowhead)"/>`
				:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/><line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
			let rows = '';
			const to = from.to;
			const that = this;
			diagram.codomain.forEachMorphism(function(m)
			{
				const obj = that.dual ? m.codomain : m.domain;
				if (Morphism.IsA(m) && to.isEquivalent(obj) && to.properName === obj.properName && (m.diagram.name === diagram.name || diagram.allReferences.has(m.diagram.name)))
					rows += D.HtmlRow(m, `onclick="Cat.R.$Actions.getElement('${that.name}').action(event, Cat.R.diagram, ['${from.name}', '${m.name}'])"`);
			});
			D.toolbar.help.innerHTML = H.small(`Morphisms ${this.dual ? 'to' : 'from'} ${U.HtmlEntitySafe(to.htmlName())}`, 'italic') + H.table(rows);
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
		return diagram.isEditable() && ary.length === 1 && DiagramObject.IsA(ary[0]);
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
			icon:
`<circle cx="260" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="100" y1="160" x2="200" y2="160" marker-end="url(#arrowhead)"/>
`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
		this.newMorphism = new NewElement('Morphism', '', true);
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
		D.toolbar.help.appendChild(H3.table(rows));
	}
	doit(e, diagram, morphism, domName, codName, save = true)
	{
		const to = diagram.getElement(morphism);
		const domain = diagram.getElement(domName);
		const codomain = diagram.getElement(codName);
		const nuFrom = new DiagramMorphism(diagram, {to, domain, codomain});
		diagram.makeSelected(nuFrom);
		return nuFrom;
	}
	replay(e, diagram, args)
	{
		this.doit(e, diagram, args.morphism, args.domain, args.codomain, false);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 2 && DiagramObject.IsA(ary[0]) && DiagramObject.IsA(ary[1]);
	}
}

class DetachDomainAction extends Action
{
	constructor(diagram, dual = false)
	{
		const args =
		{
			basename:		dual ? 'detachCodomain' : 'detachDomain',
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
		R.ReplayCommands.set(this.basename, this);
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
		return obj;
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
		const args = {	description:	'Delete objects, morphisms or text',
						basename:		'delete',
						priority:		98,
						icon:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="230" marker-end="url(#arrowhead)"/>
<path class="svgfilNone svgstr1" d="M90,190 A120,50 0 1,0 230,190"/>`,};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const names = ary.map(m => m.name);
		const elements = ary.map(elt => Cell.IsA(elt) ? diagram.getAssertion(elt.signature) : elt);		// convert cells to assertions
		diagram.deselectAll();
		const notDeleted = this.doit(e,diagram, elements);
		notDeleted.map(elt => diagram.addSelected(elt));	// reselect items that were not deleted
		diagram.log({command:'delete', elements:names});
		const commands = elements.map(from =>
		{
			if (DiagramMorphism.IsA(from))
				return {command:'copy', source:from.to, xy:from.domain.getXY(), xyCod:from.codomain.getXY()};
			else if (DiagramObject.IsA(from))
				return {command:'copy', source:from.to, xy:from.getXY()};
			else if (DiagramText.IsA(from))
				return {command:'copy', source:from.description, xy:from.getXY()};
		});
		diagram.antilog({command:'multiple', commands});
	}
	doit(e, diagram, items)
	{
		const sorted = diagram.sortByCreationOrder(items).reverse();
		const notDeleted = [];
		sorted.map(elt =>
		{
			if (elt.refcnt === 1)
			{
				elt.decrRefcnt();
				Morphism.IsA(elt) && diagram.domain.removeMorphism(elt);
			}
			else if (elt.refcnt > 1)
				notDeleted.push(elt);
		});
		if (notDeleted.length > 0)
			D.statusbar.show(e, 'Cannot delete an element due to it being used elsewhere');
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
			description:	'Create factor morphism',
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
		R.ReplayCommands.set(this.basename, this);
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
					H.button(this.dual ? '0' : '*', '', Cat.R.diagram.elementId(), `Add ${this.dual ? 'initial' : 'terminal'} object`,
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
			this.codomainDiv.innerHTML = H.span(D.GetButton(this.dual ? 'inject' : 'project', 'edit',
				`Cat.R.Actions.${this.dual ? 'inject' : 'project'}.action(event, Cat.R.diagram, Cat.R.diagram.selected)`,
				'Create morphism'));
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
		diagram.placeMorphismByObject(e, this.dual ? 'codomain' : 'domain', from, m);
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
						basename:		'lambda',
						icon:
`<line class="arrow0" x1="40" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="280" x2="140" y2="180" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const domFactors = U.GetFactorsById('lambda-domain');
		const homFactors = U.GetFactorsById('lambda-codomain');
		const elt = this.doit(e, diagram, from, domFactors, homFactors);
		diagram.log({command:'lambda', from:from.name, domFactors, homFactors});
		diagram.antilog({command:'delete', elements:[elt.name]});
	}
	doit(e, diagram, from, domFactors, homFactors)
	{
		const m = diagram.get('LambdaMorphism', {preCurry:from.to, domFactors, homFactors});
		return diagram.placeMorphism(e, m);
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
			if (m.domain.isTerminal() && !HomObject.IsA(m.codomain))
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
			H.button(`&#10034;&rarr;[${domain.htmlName()}, ${codomain.htmlName()}]`, '', '', '',
				`onclick="Cat.R.Actions.lambda.createNamedElement(event, Cat.R.diagram.getSElected())"`) +
			H.hr() +
			H.h4('Curry Morphism') +
			H.h5('Domain') +
			H.small('Click to move to codomain:') +
			H.span(this.getButtons(domain, {dir:	0, fromId:'lambda-domain', toId:'lambda-codomain'}), '', 'lambda-domain') +
			H.h5('Codomain') +
			H.small('Click to move to codomain: [') +
			H.span(homCod, '', 'lambda-codomain') +
			H.span(`, ${HomObject.IsA(codomain) ? codomain.minimalHomDom().htmlName() : codomain.htmlName()}]`) +
			H.span(D.GetButton('lambda', 'edit', `Cat.R.Actions.lambda.action(event, Cat.R.diagram, Cat.R.diagram.selected)`,
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
	createNamedElement(e, morphism)
	{
		const factors = [[]];
		const m = diagram.get('LambdaMorphism', {preCurry:morphism, domFactors:[[]], homFactors:[]});
		return diagram.placeMorphism(e, m);
	}
}

class HelpAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Give help for an item',
						basename:		'help',
						priority:		99,
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
		const help = D.toolbar.help;
		const from = ary[0];
		const js = R.Actions.javascript;
		const cpp = R.Actions.cpp;
		let toolbar2 = '';
		if (cpp.hasForm(diagram, ary))
			toolbar2 += D.formButton('cpp', cpp.icon, 'Cat.R.Actions.cpp.html(event, Cat.R.diagram, Cat.R.diagram.selected)', cpp.description);
		if (js.hasForm(diagram, ary))
			toolbar2 += D.formButton('javascript', js.icon, 'Cat.R.Actions.javascript.html(event, Cat.R.diagram, Cat.R.diagram.selected)', js.description);
		if (toolbar2 !== '')
			help.innerHTML = H.table(H.tr(H.td(toolbar2)), 'buttonBarLeft');
		let elt = null;
		if (from.to)
			elt = from.to.help();
		else if (DiagramText.IsA(from))
			elt = from.help();
		else if (Assertion.IsA(from))
			elt = from.help();
		D.toolbar.help.appendChild(elt);
	}
}

class LanguageAction extends Action
{
	constructor(diagram, language, ext, icon)
	{
		const args =
		{
			description:	`Morphism\'s ${language} code`,
			basename:		language,
			icon,
		};
		super(diagram, args);
		Object.defineProperties(this,
		{
			diagram:		{value:	null,		writable:	true},
			currentDiagram:	{value:	null,		writable:	true},
			htmlReady:		{value:	false,		writable:	true},
			ext:			{value:	ext,		writable:	false},
			language:		{value:	language,	writable:	false},
		});
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
		return ary.length === 1 && (CatObject.IsA(ary[0]) || Morphism.IsA(ary[0]));
	}
	isEditable(m)
	{
		return m.isEditable() &&
			((m.constructor.name === 'Morphism' && !m.domain.isInitial() && !m.codomain.isTerminal && !m.codomain.isInitial()) || m.constructor.name === 'CatObject');
	}
	html(e, diagram, ary)
	{
		const elt = ary[0].to;
		let div = H3.div();
		const help = D.toolbar.help;
		D.RemoveChildren(help);
		if (elt.constructor.name === 'Morphism' || elt.constructor.name === 'CatObject')
		{
			let code = 'code' in elt ? (this.hasCode(elt) ? elt.code[this.ext] : '') : '';
			if (code === '')
				code = this.template(elt);
			const old = this.currentDiagram;
			this.currentDiagram = elt.diagram;
			const rows =	[H3.tr([H3.td('Namespace', {class:'smallPrint left'}), H3.td(this.getNamespace(diagram), {class:'smallBold left'})]),
							H3.tr([H3.td('Type', {class:'smallPrint left'}), H3.td(this.getType(elt), {class:'smallBold left'})])];
			if (Morphism.IsA(elt))
				rows.push( H3.tr([H3.td('Domain', {class:'smallPrint left'}), H3.td(this.getType(elt.domain), {class:'smallBold left'})]),
							H3.tr([H3.td('Codomain', {class:'smallPrint left'}), H3.td(this.getType(elt.codomain), {class:'smallBold left'})]));
			this.currentDiagram = old;
			div.appendChild(H3.table(rows, {width:'auto'}));
			div.appendChild(H3.div(U.HtmlSafe(code), {class:'code', id:`element-${this.ext}`}));
			if (this.isEditable(elt))
				div.appendChild(D.GetButton3(this.name, 'edit3', `Cat.R.Actions.${this.name}.setCode(event, 'element-${this.ext}', '${this.ext}')`, 'Edit code', D.default.button.tiny));
		}
		else
		{
			this.diagram = diagram;
			this.currentDiagram = null;
			div.appendChild(H3.p(U.HtmlSafe(this.generate(elt)), {class:'code', id:`element-${this.ext}`}));
		}
		help.appendChild(div);
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
		const that = this;
		this.currentDiagram = null;
		this.diagram = diagram;
		let code = '';
		diagram.elements.forEach(function(elt)
		{
			if (Morphism.IsA(elt) || CatObject.IsA(elt))
				code += that.generate(elt, generated);
		});
		return code;
	}
	getNamespace(diagram)
	{
		return U.Token(diagram.name);
	}
	generate(m, generated = new Set())		// fitb
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
			D.statusbar.show(e, `Diagram ${name} ${this.name} generated<br/>&#9201;${delta}ms`, true);
		}
	}
	instantiate(element)
	{
		let code = this.getCode(element).replace(/%Type/g, this.getType(element)).replace(/%Namespace/gm, this.getNamespace(element.diagram));
		if (Morphism.IsA(element))
			code = code.replace(/%Dom/g, this.getType(element.domain)).replace(/%Cod/g, this.getType(element.codomain));
		return U.Tab(code);
	}
	hidden() { return true; }
}

class JavascriptAction extends LanguageAction
{
	constructor(diagram)
	{
		super(diagram, 'javascript', 'js', '<text text-anchor="middle" x="160" y="280" style="font-size:240px;stroke:#000;">JS</text>');
	}
	getType(elt, first = true)
	{
		return U.Token(elt);
	}
	generate(m, generated = new Set())
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
			const domain = NamedObject.IsA(m.domain) ? m.domain.base : m.domain;
			const codomain = NamedObject.IsA(m.codomain) ? m.codomain.base : m.codomain;
			if (R.CanFormat(m))
				code +=	// TODO safety check?
`
	function ${jsName}_Iterator(fn)
	{
		const result = new Map();
		for (let i=0; i<${domain.size}; ++i)
			result.set(i, fn(i));
		return result;
	}
`;
			if ('domain' in m && domain.isInitial())
				code += `${header}	return;	// abandon computation\n'${tail}`;	// domain is null, yuk
			else if ('codomain' in m && codomain.isTerminal())
				code += `${header}	return 0;${tail}`;
			else if ('codomain' in m && codomain.isInitial())
				code += `${header}	throw 'do not do this';${tail}`;
			else
				switch(proto)
				{
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
					case 'Morphism':
						if ('code' in m && this.ext in m.code)
							code += this.instantiate(m) + '\n';
						else
							code += `${header}	${tail}`;
						if ('recursor' in m)
						{
							generated.add(m.name);	// add early to avoid infinite loop
							code += this.generate(m.recursor, generated);
						}
						if ('data' in m)
						{
							let homMorphs = [];
							const that = this;
							m.data.forEach(function(d)
							{
								that.findHomMorphisms(m.codomain, d, homMorphs);
							});
							if (homMorphs.length > 0)
							{
								generated.add(m.name);	// add early to avoid infinite loop
								code += homMorphs.map(hm => this.generate(hm, generated)).join('');
							}
							const data = [];
							m.data.forEach(function(d, k)
							{
								data.push(`[${k}, ${that.convertData(codomain, d)}]`);
							});
							code +=	// TODO safety check?
`
const ${jsName}_Data = new Map([${data.join()}]);
function ${jsName}_Iterator(fn)
{
	const result = new Map();
	${jsName}_Data.forEach(function(d, i)
	{
		result.set(i, fn(i));
	});
	return result;
}
`;
						}
						if ('recursor' in m)
							code +=
`${header}	if (${jsName}_Data.has(args))
		return ${jsName}_Data.get(args);
	return ${U.Token(m.recursor)}(args);
${tail}`;
//						if ('data' in m)
//							code +=
//`
//${header}	return ${jsName}_Data.get(args);${tail}`;
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
						const domLength = JavascriptAction.ObjectLength(domain);
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
							const preMap = new Map();
							const postMap = new Map();
							for (let i=0; i<m.domFactors.length; ++i)
							{
								const f = m.domFactors[i];
								if (f[0] === 1 && f.length === 2)
									preMap.set(f[1], i);
								else if (f[0] === 0 && f.length === 2)
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
				}
			generated.add(m.name);
		}
		return code;
	}
	convertData(obj, data)	// hom elements have to be converted from objects to their name
	{
		let out = '';
		switch(obj.constructor.name)
		{
			case 'CatObject':
				out = JSON.stringify(data);
				break;
			case 'ProductObject':
				if (this.dual)
					return [data[0], this.convertData(obj.objects[data[0]], data[1])];
				else
					out = `[${obj.objects.map((o, i) => this.convertData(o, data[i])).join()}]`;
				break;
			case 'HomObject':
				out = U.Token(data);
				break;
			case 'NamedObject':
				out = this.convertData(obj.base, data);
				break;
		}
		return out;
	}
	findHomMorphisms(obj, data, homers = [])
	{
		let out = '';
		switch(obj.constructor.name)
		{
			case 'ProductObject':
				if (this.dual)
					this.findHomMorphisms(obj.objects[data[0]], data[1], homers);
				else
					obj.objects.map((o, i) => this.findHomMorphisms(o, data[i], homers));
				break;
			case 'HomObject':
				!homers.includes(data) && homers.push(data);
				break;
			case 'NamedObject':
				this.findHomMorphisms(obj.base, data, homers);
				break;
		}
		return homers;
	}
	loadHTML(fn)
	{
		const htmlDiagram = R.$CAT.getElement('hdole/HTML');
		D.htmlDiagram = htmlDiagram;
		const html = htmlDiagram.getElement('HTML');
		const str = htmlDiagram.codomain.getElement('hdole/Strings/str');
		this.formatters = new Map();
		const that = this;
		htmlDiagram.forEachMorphism(function(m)
		{
			const domain = m.domain;
			if (ProductObject.IsA(domain) && !domain.dual && domain.objects[0].name === html.name &&
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
		if (!this.formatters)
			throw 'no formatters';
		if (NamedObject.IsA(o))
			return this.canFormat(o.source);
		if (ProductObject.IsA(o))
			return o.objects.reduce((r, ob) => r && this.canFormat(ob));
		else if (Morphism.IsA(o))
			return this.canFormat(o.domain) && (this.canFormat(o.codomain) || HomObject.IsA(o.codomain));
		else if (o.isTerminal() && !o.dual)
			return true;
		else if (FiniteObject.IsA(o))
			return true;
		else if (CatObject.IsA(o))
			return this.formatters.has(o.signature);
		return false;
	}
	getInputHtml(o, value = null, prefix = '', factor = [], index = null)
	{
		const from = R.diagram.selected[0];
		const morph = from.to;
		let html = '';
		const id = `${prefix} ${o.name} ${factor.toString()}`;
		switch(o.constructor.name)
		{
			case 'NamedObject':
				html = this.getInputHtml(o.getBase(), value, prefix, factor);
				break;
			case 'CatObject':
				if (this.formatters.has(o.signature))
				{
					const f = this.formatters.get(o.signature);
					const out = window[U.Token(f)]([id, value !== null ? [0, value] : [1, 0]]);
					html = out[0];
				}
				else
					D.RecordError('object has no formatter');
				break;
			case 'ProductObject':
				if (o.dual)
				{
					const isNumeric = U.IsNumeric(o);
					if (U.IsNumeric(o))
						html += `<input id="${id}" type="number" min="0" max="${o.objects.length -1}"${typeof value === 'number' ? ' value="' + value.toString() + '"' : ''}/>`;
					else
					{
						let options = '';
						let divs = '';
						for (let i=0; i<o.objects.length; ++i)
						{
							const ob = o.objects[i];
							const f = [...factor, i];
							const oid = `dv_${ob.name} ${f.toString()}`;
							options += `<option value="${i}"${i === value[0] ? ' selected="selected"' : ''}>${i}: ${ob.htmlName()}</option>`;
							divs += H.div(this.getInputHtml(ob, value !== null && value[0] === i ? value[1] : null, prefix, [...factor, i]), 'nodisplay', oid);
						}
						html +=
`<select id="${id}" onchange="Cat.D.ShowInput('${o.name}', '${id}', ${factor.length === 0 ? '[]' : factor.toString()})">
<option>Choose</option>
${options}
</select>
<div>
${divs}
</div>
`;
					}
				}
				else
					html += o.objects.map((ob, i) => this.getInputHtml(ob, value !== null ? value[i] : null, prefix, [...factor, i]));
				break;
			case 'FiniteObject':
				const dv = typeof value === 'number' ? ` value="${value.toString()}"` : '';
				if ('size' in o)
				{
					if (o.size < 2)
						return '';
					html = `<input type="number" min="0" id="${id}" max="${o.size}"${dv}/>`;
				}
				else
					html = `<input type="number" min="0" id="${id}"${dv}/>`;
				break;
			case 'HomObject':
				const homset = R.diagram.codomain.getHomset(o.objects[0], o.objects[1]);
				const options = homset.map(m => `<option value="${m.name}"${value && m.name === value.name ? ' selected="selected"' : ''}>${m.htmlName()}</option>`).join('');
				const selector =
`<select data-index="${index}" id="help-run-homset-${index ? index : 'next'}" onchange="Cat.R.Actions.javascript.setHomValue(this)"><option>Choose</option>${options}</select>`;
				html = selector;
				break;
		}
		return html;
	}
	setHomValue(selector)		// TODO work hierarchically
	{
		const from = R.diagram.selected[0];
		const morph = from.to;
		const index = Number.parseInt(selector.dataset.index);
		const value = selector.value;
		const selected = R.diagram.getElement(value);
		if (selected)
		{
			morph.data.set(index, selected);
			R.EmitMorphismEvent(R.diagram, 'update', from);
		}
		else
			morph.data.delete(index);
	}
	getInputValue(domain, prefix = '', factor = [])
	{
		let value = null;
		const dom = NamedObject.IsA(domain) ? domain.getBase() : domain;
		const id = `${prefix} ${dom.name} ${factor.toString()}`;
		switch(dom.constructor.name)
		{
			case 'FiniteObject':
				if (dom.size === 1)
					return 0;
				const f = D.htmlDiagram.getElement('html2Nat');
				const out = window[U.Token(f)]([0, dom.name + factor.toString()]);	// no default value
				const formatter = out[1]();
				value = formatter(id);
				break;
			case 'CatObject':
				if (this.formatters.has(dom.signature))
				{
					const f = this.findFormat(dom);
					const out = window[U.Token(f)]([0, dom.name + factor.toString()]);	// no default value
					const formatter = out[1]();
					value = formatter(id);
				}
				else
					D.RecordError('object has no formatter');
				break;
			case 'ProductObject':
				if (dom.dual)
				{
					const i = Number.parseInt(document.getElementById(id).value);
					const isNumber = dom.objects.reduce((r, oi) => r && oi.isTerminal(), true);	// convert to numeric?
					if (isNumber)
						value = i;
					else
					{
						let val = dom.objects[i].getBase().isTerminal() ? 0 : this.getInputValue(dom.objects[i], prefix, [...factor, i]);
						value = [i, val];
					}
				}
				else
					value = dom.objects.map((o, i) => this.getInputValue(o, prefix, [...factor, i]));
				break;
			case 'HomObject':
				break;
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
		R.default.debug && console.log('run code', code);
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
		R.default.debug && console.log('run code', code);
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
					D.RecordError(args);
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
	template()
	{
		return 'function %Type(args, out)\n{\n\t\n}\n';
	}
	static ObjectLength(o)
	{
		if (FiniteObject.IsA(o) && o.size <= 1)
			return 0;
		if (ProductObject.IsA(o) && !o.dual)
			return o.objects.reduce((r, o) => r + (o.isTerminal() ? 0 : 1), 0);
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
		Object.defineProperty(this, 'currentCiagram', {value:null, writable:true});
	}
	getType(elt, first = true)
	{
		const isLocal = elt.diagram === this.currentDiagram;
		const priorDiagram = this.currentDiagram;
		this.currentDiagram = elt.diagram;
		let basetype = '';
		switch(elt.constructor.name)
		{
			case 'CatObject':
				basetype = elt.basename;
				break;
			case 'ProductObject':
				basetype = (elt.dual ? 'Copr_' : 'Pr_') + elt.objects.map(o => this.getType(o, false)).join('_c_');
				break;
			case 'ProductMorphism':
				basetype = (elt.dual ? 'Copr_' : 'Pr_') + elt.morphisms.map(m => this.getType(m, false)).join('_c_');
				break;
			case 'HomObject':
				basetype = `hom_${this.getType(elt.objects[0], false)}_c_${this.getType(elt.objects[1], false)}`;
				break;
			case 'HomMorphism':
				basetype = `hom_${this.getType(elt.morphisms[0], false)}_c_${this.getType(elt.morphisms[1], false)}`;
				break;
			case 'Morphism':
				basetype = elt.basename;
				break;
			case 'Identity':
				basetype = `id_${this.getType(elt.domain, false)}`;
				break;
			case 'Composite':
				basetype = 'Comp_' + elt.morphisms.slice().reverse().map(m => this.getType(m, false)).join('_c_');
				break;
			case 'Evaluation':
				basetype = `Eval_${this.getType(elt.domain.objects[0])}_by_${this.getType(elt.domain.objects[1])}_to_${this.getType(elt.codomain)}`;
				break;
			case 'FactorMorphism':
				basetype = (elt.dual ? 'Cofctr_' : 'Fctr_') + this.getType(this.dual ? elt.codomain : elt.domain, false) + '_' + elt.factors.map(f => U.a2s(f, '_', '_c_', '_')).join('_c_');
				break;
			case 'ProductAssembly':
				basetype = (elt.dual ? 'CoPrAs_' : 'PrAs_') + elt.morphisms.map(m => this.getType(m, false)).join('_c_');
				break;
			default:
				basetype = U.Token(elt.basename);
				break;
		}
		if (!first && elt.needsParens())
			basetype = `Pa_${basetype}_aP`;
		basetype = isLocal ? basetype : `${this.getNamespace(elt.diagram)}::${basetype}`;
		this.currentDiagram = priorDiagram;
		return !first ? U.Token(basetype) : basetype;
	}
	generateProductObject(object, generated)
	{
		const name = this.getType(object);
		let code = '';
		code += object.objects.map(o => this.generate(o, generated)).join('');
		code += this.getComments(object);
		const members = object.objects.map((o, i) => `${object.dual ? '\t\t\t' : '\t\t'}${this.getType(o)} m_${i};`).join('\n');
		if (object.dual)
			code +=
`	struct ${name}
	{
		unsigned long index;
		union
		{
${members}
		};
		friend std::istream & operator>>(std::istream  & in, ${name} & obj )
		{ 
			in >> obj.index;
			switch(obj.index)
			{
${object.objects.map((o, i) => `\t\t\t\t\tcase 0:
					in >> obj.m_${i};
					break;
`).join('')}
			}
			return in;            
		}
		friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
		{ 
			out ${object.objects.map((o, i) => !HomObject.IsA(o) ? ` << obj.m_${i} << " "` : '').join('')};
			return out;            
		}
	};
`;
		else
			code +=
`\tstruct ${name}
\t{
${members}
		friend std::istream & operator>>(std::istream  & in, ${name} & obj )
		{ 
			in ${object.objects.map((o, i) => !HomObject.IsA(o) ? ` >> obj.m_${i}` : '').join('')};
			return in;            
		}
		friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
		{ 
			out ${object.objects.map((o, i) => !HomObject.IsA(o) ? ` << obj.m_${i} << " "` : '').join('')};
			return out;            
		}
\t};
`;
		return code;
	}
	generateObject(object, generated)
	{
		const proto = object.constructor.name;
		let code = '';
		const name = this.getType(object);
		if (CatObject.IsA(object))
		{
			switch(proto)
			{
				case 'CatObject':
					code += this.getComments(object) + this.instantiate(object);
					break;
				case 'ProductObject':
					code += this.generateProductObject(object, generated);
					break;
				case 'HomObject':
					code += `\t\t${this.getComments(object)}\ttypedef void (*${name})(const ${this.getType(object.objects[0])} &, ${this.getType(object.objects[1])} &);\n`;
					break;
				default:
					break;
			}
		}
		return code;
	}
	generateMorphism(morphism, generated)
	{
		const proto = morphism.constructor.name;
		const name = this.getType(morphism);
		let code = '';
		if (MultiMorphism.IsA(morphism))
			code += morphism.morphisms.map(n => this.generate(n, generated)).join('\n');
		const header = this.header(morphism);
		const tail = this.tail();
		const domainStruct = this.getType(morphism.domain);
		const codomainStruct = this.getType(morphism.codomain);
		if (morphism.domain.isInitial())
			code += `${header}	return;	// abandon computation\n'${tail}\n${tail}`;	// domain is null, yuk
		else if (morphism.codomain.isTerminal())
			code += `${header}	out = 0;${tail}`;
		else if (morphism.codomain.isInitial())
			code += `${header}	throw 'do not do this';${tail}`;
		else
			switch(proto)
			{
				case 'Composite':
					code += morphism.morphisms.map(m => this.generate(m, generated)).join('');
					code += this.getComments(morphism);
					code += header;
					const lngth = morphism.morphisms.length;
					for (let i=0; i<lngth; ++i)
					{
						const m = morphism.morphisms[i];
						if (i !== lngth -1)
							code += `\t\t${this.getType(m.codomain)} out_${i};\n`;
						code += `\t\t${this.getType(m)}(${i === 0 ? 'args' : `out_${i -1}`}, ${i !== lngth -1 ? `out_${i}` : 'out'});${i !== lngth -1 ? '\n' : ''}`;
					}
					code += tail;
					break;
				case 'Identity':
					code += this.getComments(morphism);
					code += `${header}\t\tout = args;${tail}`;
					break;
				case 'ProductMorphism':
					code += morphism.morphisms.map(m => this.generate(m, generated)).join('');
					code += this.getComments(morphism);
					if (morphism.dual)
					{
						const subcode = morphism.morphisms.map((m, i) => this.getType(m).join(',\n\t\t\t'));
						code += `${header}		const void (*)(void*)[] fns = {${subcode}};\n\t\tfns[args.index]();${tail}`;
					}
					else
						code += `${header}\t\t${morphism.morphisms.map((m, i) => `\t\t${this.getType(m)}(args.m_${i}, out.m_${i});\n`).join('')}${tail}`;
					break;
				case 'ProductAssembly':
					code += `${header}\t\t${morphism.morphisms.map((m, i) => `\t\t${this.getType(m)}(args, out.m_${i});\n`).join('')}${tail}`;
					break;
				case 'Morphism':
					code += this.getComments(morphism);
					code += this.instantiate(morphism);
					if ('recursor' in morphism)
					{
						generated.add(morphism.name);	// add early to avoid infinite loop
						code += this.generate(morphism.recursor, generated);
					}
					let data = JSON.stringify(U.JsonMap(morphism.data));
					code += this.getComments(morphism);
					code +=	// TODO safety check?
`
const ${name}_Data = new Map(${data});
function ${name}_Iterator(fn)
{
const result = new Map();
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
return ${this.getType(morphism.recursor)}(args);
${tail}`;
				else
					code +=
`
${header}	return ${name}_Data.get(args);${tail}`;
					break;
				case 'Distribute':
				case 'Dedistribute':
					code += this.getComments(morphism);
					code +=
`${header}	out.m_0 = args.m_1.m_0;
out.m_1.m+0 = args.m_0;
out.m_1.m_2 = args.m_1.m_1;${tail}`;
					break;
				case 'Evaluation':
					code += this.getComments(morphism);
					code += `${header}\t\targs.m_0(args.m_1, out);${tail}`;
					break;
				case 'FactorMorphism':
					code += this.getComments(morphism);
					if (morphism.dual)
					{
						// TODO
					}
					else
					{
						const factors = morphism.factors;
						if (factors.length === 1)
							code += `${header}\t\tout = args.${this.getFactorAccessor(factors[0])};${tail}`;
						else
						{
							const factorCode = $this.factors.map((factor, i) => `\t\tout.m_${i} = args.${this.getFactorAccessor(factors[i])};\n`).join('');
							code += `${header}${factorCode}${tail}`;
						}
					}
					break;
				case 'HomMorphism':
					code += morphism.morphisms.map(m => this.generate(m, generated)).join('');
					code += this.getComments(morphism);
					const top = morphism.morphisms[0];
					const btm = morphism.morphisms[1];
					const obj0 = this.getType(top.domain);
					const obj1 = this.getType(top.codomain);
					const obj2 = this.getType(btm.domain);
					const obj3 = this.getType(btm.codomain);
					code +=
`${header}	out = [&](const ${obj0} & _morph, ${obj3} & _out)
{
${obj2} _args2;
${this.getType(top)}(_args, _args2);
${obj3} _args3;
_morph(_args2, _args3);
${this.getType(btm)}(_args3, _out);
}
${tail}`;
					break;
				case 'LambdaMorphism':
					code += this.generate(morphism.preCurry, generated);
					code += this.getComments(morphism);
					const inputs = new Array(this.ObjectLength(morphism.preCurry.domain));
					const domLength = this.ObjectLength(morphism.domain);
					const homLength = morphism.homFactors.length;
					if (homLength > 0)
					{
						const domArgs = m.homFactors.map((f, i) => `\t\tlargs.${this.getFactorAccessor(f)} = args.m_${i}`).join('\n');
						const homArgs = m.domFactors.map((f, i) => `\t\tlargs.${this.getFactorAccessor(f)} = _args.m_${i}`).join('\n');
						code +=
`${header}	
out = void [&](const ${this.getType(m.codomain.objects[0])} & args, ${this.getType(m.codomain.objects[1])} & out)
{
${this.getType(m.preCurry.domain)} largs;
${homArgs};
${domArgs};
${this.getType(m.preCurry)}(largs, out);
};
${tail}`;
					}
					else	// must evaluate lambda!
					{
						const preMap = new Map();
						const postMap = new Map();
						for (let i=0; i<morphism.domFactors.length; ++i)
						{
							const f = morphism.domFactors[i];
							if (f[0] === 1 && f.length === 2)
								preMap.set(f[1], i);
							else if (f[0] === 0 && f.length === 2)
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
						code += `${header}	out = ${this.getType(morphism.preCurry)}(${preInput})(${postInput});${tail}`;
					}
					break;
				case 'NamedMorphism':
					code += this.generate(morphism.source, generated);
					code += this.getComments(morphism);
					code += `${header}\t\t${this.getType(morphism.source)}(args, out);${tail}`;
					break;
			}
		return code;
	}
	generate(element, generated = new Set())
	{
		if (generated.has(element.name))
			return '';
		generated.add(element.name);
		let code = '';
		let addNamespace = false;
		const namespace = this.getNamespace(element.diagram);
		if (this.currentDiagram !== element.diagram)
		{
			addNamespace = true;
			code += this.currentDiagram ? '} // eons\n\n' : '';
			code += `namespace ${this.getNamespace(element.diagram)}\n{\n`;
			this.currentDiagram = element.diagram;
		}
		if (CatObject.IsA(element))
			code += this.generateObject(element, generated);
		else if (Morphism.IsA(element))
			code += this.generateMorphism(element, generated);
		return code;
	}
	generateMain(diagram)
	{
		this.currentDiagram = null;
		const namedMorphisms = new Set();
		diagram.forEachMorphism(function(m)
		{
			if (NamedMorphism.IsA(m))
				namedMorphisms.add(m);
		});
		const named = [...namedMorphisms];
		const nameCode = named.map(nm => `\t\t{"${nm.basename}", (CatFn)${this.getType(nm)}}`).join(',\n');
		let code =
`}

#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <map>
#include <cstring>

int main(int argc, char ** argv)
{
	unsigned long index = 0;
	typedef void (*CatFn)(void*);
	std::map<std::string, CatFn> str2fn =
	{
${nameCode}
	};
	const std::string help("${diagram.description}");
	try
	{
		if (argc > 1 && (strcmp("-s", argv[1]) || strcmp("--signatures", argv[1])))
		{
${named.map(nm => `std::cout << "${nm.basename}:\t${nm.signature}" << std::endl\n`).join('')}
		}
		if (argc > 1 && (strcmp("-h", argv[1]) || strcmp("--help", argv[1])))
`;
		if (named.size > 1)
			code +=
`		{
			std::cout << help << std::endl << "Select one of the following to execute from the command line:" << std::endl;
			${named.map((nm, i) => `\tstd::cout << "\t${i}:\t${nm.basename}" << std::endl;`).join(',\n')}
			return 1;
		}
		std::cout << "Enter a number for which morphism to run:" << std::endl;
${named.map((nm, i) => `\t\tstd::cout << '\t' << ${i} << ":\t${nm.basename}" << std::endl;`)}
		std::cin >> index;
		switch (index)
		{
			${named.map((nm, i) =>
`
			case ${i}:
			{
				${this.getType(nm.domain)} args;
				std::cin >> args;
				${this.getType(nm.codomain)} out;
				${this.getType(nm)}(args, out);
				std::cout << out;
				break;
			}
`).join('')}
			default:
				std::cerr << "Bad choice" << std::endl;
				return 1;
		}
		return 0;
`;
		else if (named.size === 1)
		{
			let nm = [...named][0];
			code +=
`		{
			std::cout << help << std::endl << "${nm.description}" << std::endl;
			return 1;
		}
		${this.getType(nm.domain)} args;
		std::cin >> args;
		${this.getType(nm.codomain)} out;
		${this.getType(nm)}(args, out);
		std::cout << out << std::endl;
		return 0;
`;
		}
		else
		{
		}
		code +=
`	}
	catch(std::exception x)
	{
		std::cerr << "An error occurred" << std::endl;
		return 1;
	}
}
`;
		return code;
	}
	getFactorAccessor(factor)
	{
		return Array.isArray(factor) ? factor.map(i => `m_${i}`).join('.') : `m_${factor}`;
	}
	getComments(m)
	{
		return `\t//
\t// ${m.constructor.name}
\t// ${m.name}
\t// ${m.description}
\t//
`;
	}
	header(m)
	{
		return `\tvoid ${this.getType(m)}(const ${this.getType(m.domain)} & args, ${this.getType(m.codomain)} & out)\n\t{\n`;
	}
	tail()
	{
		return `\n\t}\n`;
	}
	template(elt)
	{
		if (elt.constructor.name === 'CatObject')
			return `
struct %Type
{
};
`;
		else if (elt.constructor.name === 'Morphism')
			return `
void %Type(const %Dom args, %Cod out)
{
}
`;
	}
	generateDiagram(diagram)
	{
		const code = super.generateDiagram(diagram);
		return `
#include <iostream>
${code}
${this.generateMain(diagram)}
`;
	}
}

class RunAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Run a morphism or view its contents',
						basename:		'run',
						icon:
`<g>
<animateTransform id="RunAction btn" attributeName="transform" type="rotate" from="0 160 160" to="360 160 160" dur="0.5s" repeatCount="1" begin="indefinite"/>
<line class="arrow0" x1="20" y1="80" x2="180" y2="80" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="140" y1="240" x2="300" y2="240" marker-end="url(#arrowhead)"/>
</g>`,};
		super(diagram, args);
		this.workers = [];
		this.data = new Map();
		this.js = null;		// fill in later
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const js = R.Actions.javascript;
		const addDataBtn = D.GetButton('addInput', 'edit', `Cat.R.Actions.run.addInput()`, 'Add data');
		const {properName, description} = to;
		let html = H.h3(properName) + (description !== '' ? H.p(description, 'smallPrint') : '');
		let canMakeData = true;
		const source = NamedObject.IsA(to) ? to.base : to;
		if (DiagramObject.IsA(from))
		{
			if (js.canFormat(source))
				html += js.getInputHtml(source) + addDataBtn;
		}
		else	// morphism
		{
			const {domain, codomain} = to;
			const evalCode = H.h5('Evaluate the Morphism') +
								js.getInputHtml(domain) +
								D.GetButton('run', 'edit', `Cat.R.Actions.javascript.evaluate(event, Cat.R.diagram, '${to.name}', Cat.R.Actions.run.postResult)`, 'Evaluate inputs');
			if (to.constructor.name === 'Morphism' && FiniteObject.IsA(domain) && !js.hasCode(to))
			{
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
			}
			else if (R.CanFormat(to) && ('data' in to))
			{
//				if ('data' in to)
//				{
					const sz = domain.getSize();
					let rows = H.tr(H.td(H.small('Domain')) + H.td(H.small('Codomain')) + H.td('')) +
								H.tr(H.td(domain.htmlName() + (domain.getBase() !== domain ? ` [${domain.getBase().htmlName()}]` : ''), 'smallBold') +
									H.td(codomain.htmlName() + (codomain.getBase() !== codomain ? ` [${codomain.getBase().htmlName()}]` : ''), 'smallBold') + H.td(''));
					const dataRow = function(d,i)
					{
						if (d !== null)
						{
							const editDataBtn = D.GetButton('editData', 'edit', `Cat.R.Actions.run.editData(${i})`, 'Set data');
							rows += H.tr(H.td(i) + H.td(d) + H.td(editDataBtn));
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
						html += H.h5('Data In Morphism');
						html += H.table(rows);
						canMakeData = false;
					}
					else
					{
						html += H.h5('Add Data To Morphism');
						rows += H.tr(H.td(js.getInputHtml(domain, null, 'dom')) + H.td(js.getInputHtml(codomain, null, 'cod')) + H.td(addDataBtn));
						html += H.table(rows);
						canMakeData = false;
						if ('data' in to && to.data.size > 0)
						{
							html += H.h5('Data In Morphism');
							let rows = '';
							to.data.forEach(dataRow);
							html += H.table(rows);
						}
						else
							html += H.small('No data');
					}
//				}
//				else
//				{
//					const btn = D.GetButton('add', `Cat.R.Actions.run.addDataInput(event, Cat.R.diagram, '${to.name}')`, 'Add data input');
//					html += H.div(js.getInputHtml(domain, null, 'dom') + H.td(btn));
//				}
			}
			else if (to.isIterable())
				html += D.GetButton('evaluate', 'edit',
					`Cat.R.Actions.javascript.evaluateMorphism(event, Cat.R.diagram, '${to.name}', Cat.R.Actions.run.postResults)`, 'Evaluate morphism');
			else		// try to evaluate an input
				html += evalCode;
		}
		if (canMakeData)
		{
			const createDataBtn = H.div(D.GetButton('createData', 'table',
				`Cat.R.Actions.run.createData(event, Cat.R.diagram, '${from.name}')`, 'Create data morphism'), '', 'run-createDataBtn');
			D.toolbar.help.innerHTML = html + H.div(H.h5('Data'), '', 'run-display') + createDataBtn;
			const btn = document.getElementById('run-createDataBtn');
			btn.style.display = 'none';
			this.createDataBtn = btn;
			const watcher = function(mutationsList, observer)
			{
				for(const m of mutationsList)
					btn.style = m.target.children.length > 0 ? 'block' : 'none';
			};
			const observer = new MutationObserver(watcher);
			const childList = true;
			observer.observe(document.getElementById('run-display'), {childList});
		}
		else
			D.toolbar.help.innerHTML = html + H.div('', '', 'run-display');
		this.display = document.getElementById('run-display');
		this.data = new Map();
	}
	postResult(result)
	{
		const that = R.Actions.run;
		const morphism = R.diagram.getSelected();
		const domInfo = U.ConvertData(morphism.domain.to, result[0]).toString();
		const codInfo = U.ConvertData(morphism.codomain.to, result[1]);
		const div = H3.div([H3.span(domInfo), H3.span('&rarr;'), H3.span(codInfo)]);
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
		if (CatObject.IsA(to))
		{
			dom = this.data.size;
			cod = this.js.getInputValue(NamedObject.IsA(to) ? to.getBase() : to);
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
			D.toolbar.error.innerHTML = '';
			if (this.data.size > 0)
			{
				const selected = diagram.getElement(eltName);
				const domain = diagram.get('FiniteObject', {size:this.data.size});
				const {to, name} = DiagramObject.IsA(selected) ? selected : selected.codomain;
				const dm = new Morphism(diagram, {basename:diagram.getAnon('data'), domain, codomain:to, data:this.data});
				diagram.placeMorphismByObject(e, 'codomain', name, dm.name);
			}
		}
		catch(x)
		{
			D.toolbar.error.innerHTML = 'Error: ' + U.GetError(x);
		}
	}
	getMorphismData(morph)
	{
		this.js.getInputValue(domain, prefix = '', factor = []);
	}
	editData(i)
	{
		const morph = R.diagram.getSelected();
		const val = this.js.getInputValue(morph.to.codomain, i);
		morph.to.data.set(i, val);
		R.EmitMorphismEvent(R.diagram, 'update', morph);
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
						basename:		'finiteObject',
						icon:			D.svg.table,
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
		let html = H.h4('Finite Object');
		html += (to.constructor.name === 'CatObject' ? H.span('Convert generic object to a finite object.', 'smallPrint') : H.span('Finite object', 'smallPrint')) +
					H.table(H.tr(H.td(D.Input('size' in to ? to.size : '', 'finite-new-size', 'Size')), 'sidenavRow')) +
					H.span('Leave size blank to indicate finite of unknown size', 'smallPrint') +
					D.GetButton('finiteObject', 'edit', 'Cat.R.Actions.finiteObject.action(event, Cat.R.diagram, Cat.R.diagram.selected)', 'Finite object', D.default.button.tiny);
		D.toolbar.help.innerHTML = html;
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
			basename:		'evaluate',
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
		diagram.placeMorphismByObject(e, 'domain', from, m.name);
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
			basename:		'distribute',
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
			icon:
`<circle cx="80" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="240" cy="160" r="80" fill="url(#radgrad1)"/>
<line class="arrow6" x1="0" y1="160" x2="320" y2="160"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
			basename:		'alignVertical',
			icon:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="80" fill="url(#radgrad1)"/>
<circle cx="160" cy="240" r="80" fill="url(#radgrad1)"/>
<line class="arrow6" x1="160" y1="0" x2="160" y2="320""/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
			basename:		'tensor',
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
			basename:		'assert',
			icon:			`<path class="svgstr4" d="${D.GetArc(160, 160, 100, 45, 360)}" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
		R.ReplayCommands.set(this.basename, this);
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
		D.statusbar.show(e, `Data morphism ${recursor.htmlName()} is now recursive with morphism ${form.htmlName()}`);
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
						icon:			D.svg.string,
						priority:		97,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		ary.map(m => diagram.showGraph(m));
		diagram.log({command:this.name, morphisms:ary.map(m => m.name)});
		diagram.antilog({command:this.name, morphisms:ary.map(m => m.name)});
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
		return H3.div(super.help(), H3.p(`Category with ${this.elements.size} elements and ${this.actions.size} actions.`));
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
// TODO REMOVE
if (args.prototype === 'DataMorphism')
{
	console.error('DataMorphism conversion', args.name);
	args.prototype = 'Morphism';
}
if (args.to === 'false') args.to = 'hdole/Logic/false';
if (args.to === 'true') args.to = 'hdole/Logic/true';
if (args.name === '#0') args.name = 'hdole/Basics/#0';
if (args.name === '#1') args.name = 'hdole/Basics/#1';
//if (args.prototype === 'Assertion') return;
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
if (name === '#0') name = 'hdole/Basics/#0';
if (name === '#1') name = 'hdole/Basics/#1';
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
			R.EmitElementEvent(elt.diagram, 'delete', elt);
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
		this.codomain.incrRefcnt();
		this.domain.incrRefcnt();
		let sigs = [this.signature];
		if ('data' in this)
			this.data.forEach(function(d, i) { sigs.push(U.SigArray([U.Sig(i.toString()), U.Sig(d ? d.toString() : 'null')])); });
		if ('recursor' in this && typeof this.recursor !== 'string')
			sigs.push(this.recursor.sig);
		if (sigs.length > 1)
			this.signature = U.SigArray(sigs);
		diagram && diagram.addElement(this);
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
		const sections = [super.help(), H3.p(`Domain: ${this.domain.htmlName()}`), H3.p(`Codomain: ${this.codomain.htmlName()}`)];
		'recursor' in this && sections.push(H3.p(`Recursor ${this.recursor.htmlName()}`));
		'data' in this && sections.push(H3.p(`Data morphism entries: ${this.data.size}`));
		return H3.div(...sections);
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
		return new Graph(this.diagram, data.position, 0, [domGraph, codGraph]);
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
		return D.textWidth(this.domain.htmlName())/2 + D.textWidth(this.htmlName()) + D.textWidth(this.codomain.htmlName())/2 + 2 * D.textWidth('&emsp;');
	}
	getHtmlRep(idPrefix)
	{
		const id = this.elementId(idPrefix);
		const that = this;
		const onclick = function(e) { Cat.R.diagram.placeMorphism(event, that.name, null, null, true, false); };
		const ondragstart = function(e) { Cat.D.DragElement(event, that.name); };
		const div = H3.div({id, class:'panelElt grabbable sidenavRow', draggable:true, ondragstart, onclick});
		const rows = [H3.tr(H3.th(H3.tag('proper-name', this.htmlName() + ':' + this.domain.htmlName() + '&rarr;' + this.codomain.htmlName()), {class:'center'}))];
		this.properName !== this.basename && rows.push(H3.tr(H3.td(H3.tag('basename', this.basename), {class:'left'})));
		this.description !== '' && rows.push(H3.tr(H3.td(H3.tag('description', this.description))));
		div.appendChild(H3.table(rows));
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
			if (DiagramMorphism.IsA(r) && DiagramMorphism.IsA(f))
				return f.to.hasMorphism(r.to);
		}
		return false;
	}
	static IsIdentity(morph)
	{
		if (MultiMorphism.IsA(morph))
			return morph.morphisms.reduce((r, m) => r && Identity.IsIdentity(m), true);
		return Identity.IsA(morph);
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
		nuArgs.properName = 'properName' in nuArgs ? U.HtmlEntitySafe(nuArgs.properName) : Identity.ProperName(nuArgs.domain, nuArgs.codomain);
//		nuArgs.description = domain.name === nuArgs.codomain.name ? `Identity for the object ${nuArgs.domain.properName}` :
//			`Identity between objects ${domain.properName} and ${nuArgs.codomain.properName}`;
		super(diagram, nuArgs);
		this.signature = Identity.Signature(diagram, this.domain);
		this.constructor.name === 'Identity' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return H3.div(super.help(), H3.p('Identity'));
	}
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.graphs[0].bindGraph({cod:g.graphs[1], index:[], domRoot:[0], codRoot:[1], offset:0, tag:this.constructor.name});
		g.tagGraph(this.constructor.name);
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
		};
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
		return 'id';
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
	static LoadEquivalences(diagram, obj, dual)
	{
		if (ProductObject.IsA(obj))
		{
			const subs = obj.objects.map(o => Identity.Signature(this.diagram, o));
			const op = ProductMorphism.Signature(subs, this.dual);
			R.LoadEquivalentSigs(diagram, this, [this.signature], [op]);
		}
		else if (HomObject.IsA(obj))
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
			if (ProductObject.IsA(domain))
				return diagram.get('ProductMorphism', {morphisms:domain.objects.map(o => diagram.get('Identity', {domain:o})), dual:domain.dual});
			else if (HomObject.IsA(domain))
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
		return H3.div(super.help(),  H3.p(`Named object of ${this.source.htmlName()}`));
	}
	getBase()
	{
		if ('base' in this)
			return this.base;
		let source = this.source;
		while(NamedObject.IsA(source))
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
		if (ProductObject.IsA(this.source))
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
		const w = D.textWidth(this.htmlName());
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
	static IsA(m)
	{
		return NamedObject.prototype.isPrototypeOf(m);
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
		return H3.div(super.help(), H3.p(`Named morphism of ${this.source.htmlName()}`));
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
		while(NamedObject.IsA(source))
			source = source.source;
		return source;
	}
	static IsA(m)
	{
		return NamedMorphism.prototype.isPrototypeOf(m);
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
		super(diagram, nuArgs);
		if (!DiagramObject.IsA(this.domain))
			throw 'domain must be DiagramObject';
		if (!DiagramObject.IsA(this.codomain))
			throw 'codomain must be DiagramObject';
		this.setMorphism(to);
		this.incrRefcnt();
		this.diagram.domain.addMorphism(this);
		Object.defineProperties(this,
		{
			flipName:	{value: U.GetArg(args, 'flipName', false),	writable: true,	enumerable: true},
			svg_path:	{value: null,	writable: true,	enumerable: true},
			svg_path2:	{value: null,	writable: true,	enumerable: true},
			svg_name:	{value: null,	writable: true,	enumerable: true},
		});
		this.constructor.name === 'DiagramMorphism' && R.EmitElementEvent(diagram, 'new', this);
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
		return H3.div(super.help(), H3.p('Morphism in index category'));
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
			return new D2();
		return D2.Round(r);
	}
	getSVG(node)
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
		const g = H3.g();
		node.appendChild(g);
		this.svg = g;
		g.setAttributeNS(null, 'id', id);
		const path = H3.path();
		path.setAttributeNS(null, 'data-type', 'morphism');
		path.setAttributeNS(null, 'data-name', this.name);
		path.setAttributeNS(null, 'class', 'morphism grabbable');
		path.setAttributeNS(null, 'id', `${id}_path`);
		path.setAttributeNS(null, 'd', coords);
		path.setAttributeNS(null, 'marker-end', 'url(#arrowhead)');
		const path2 = H3.path();
		g.appendChild(path2);
		g.appendChild(path);
		path2.setAttributeNS(null, 'data-type', 'morphism');
		path2.setAttributeNS(null, 'data-name', this.name);
		path2.setAttributeNS(null, 'class', 'grabme grabbable');
		path2.setAttributeNS(null, 'id', `${id}_path2`);
		path2.setAttributeNS(null, 'd', coords);
		const name = this.name;
		const mouseenter = function(e) { Cat.D.Mouseover(event, name, true);};
		const mouseleave = function(e) { Cat.D.Mouseover(event, name, false);};
		const mousedown = function(e) { Cat.R.diagram.selectElement(event, name);};
		path.addEventListener('mouseenter', mouseenter);
		path.addEventListener('mouseleave', mouseleave);
		path.addEventListener('mousedown', mousedown);
		path2.addEventListener('mouseenter', mouseenter);
		path2.addEventListener('mouseleave', mouseleave);
		path2.addEventListener('mousedown', mousedown);
		const text = H3.text();
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
		this.svg_path2 = document.getElementById(id + '_path2');
		this.svg_name = document.getElementById(id + '_name');
		this.update();
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
		return D2.Merge(this.domain.getBBox(), this.codomain.getBBox());
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
		!this.svg && this.diagram.addSVG(this);
		const svg = this.svg_path;
		const start = this.start;
		const end = this.end;
		if (svg !== null && start.x !== undefined)
		{
			let coords = '';
			if ('bezier' in this)
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
//	removeGraph()
//	{
//		const id = this.graphId();
//		const svgElt = document.getElementById(id);
//		if (svgElt !== null)
//		{
//			svgElt.remove();
//			return true;
//		}
//		return false;
//	}
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
	isEndo()
	{
		return this.domain === this.codomain;
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
		this.commutes = 'unknown';
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
			default:
				this.properName = D.default.cell.unknown;
				break;
		}
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
		const r = D.BaryHull([...this.left, ...this.right]);
		if (isNaN(r.x) || isNaN(r.y))
			return new D2();
		return D2.Round(r);
	}
	getSVG(node)
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `NaN in getSVG`;
		const name = this.name;
		const sig = this.signature;
		const mouseenter = function(e) { Cat.R.diagram.emphasis(sig, true);};
		const mouseleave = function(e) { Cat.R.diagram.emphasis(sig, false);};
		const mousedown = function(e) { Cat.R.diagram.selectElement(event, sig);};
		const svg = H3.text();
		node.appendChild(svg);
		this.svg = svg;
		svg.setAttributeNS(null, 'data-type', 'assertion');
		svg.setAttributeNS(null, 'data-name', this.name);
		svg.setAttributeNS(null, 'text-anchor', 'middle');
		svg.setAttributeNS(null, 'x', this.x);
		svg.setAttributeNS(null, 'y', this.y + D.default.font.height/2);	// TODO should be this.height?
		svg.innerHTML = this.properName;
		svg.addEventListener('mouseenter', mouseenter);
		svg.addEventListener('mouseleave', mouseleave);
		svg.addEventListener('mousedown', mousedown);
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
			this.svg.innerHTML = this.htmlName();
			this.svg.setAttribute('x', xy.x);
			this.svg.setAttribute('y', xy.y);
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
			const cmp = function(a, b) { return NamedMorphism.IsA(a.to) && a.to.source === b.to; };
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
			'cells':		{value:new Map(), writable: false},
		});
		this.constructor.name === 'IndexCategory' && R.EmitElementEvent(diagram, 'new', this);
	}
	process(diagram, data)
	{
		super.process(diagram, data);
//		this.postProcess(diagram);
	}
	help()
	{
		return H3.div(super.help(), H3.p('Index category'));
	}
	clear()
	{
		super.clear();
		this.cells.forEach(function(c) { c => c.deregister(); });
	}
	getHomset(domain, codomain)
	{
		const homset = new Set();
		domain.domains.forEach(function(m) { m.codomain === codomain ? homset.add(m) : null; });
		codomain.codomains.forEach(function(m) { m.domain === domain ? homset.add(m) : null; });
		return homset;
	}
	updateHomset(domain, codomain)	// actually this a symmetric update
	{
		this.updateHomsetIndices(domain, codomain).map(m => m.update());
	}
	updateHomsetIndices(domain, codomain)
	{
		const homset = [...this.getHomset(domain, codomain)];
		const dual = [...this.getHomset(codomain, domain)];
		const homLength = homset.length;
		const dualLength = dual.length;
		homset.map((m, i) => m.homSetIndex = (homLength === 1 ? -1 : i) + dualLength);
		dual.map((m, i) => m.homSetIndex = (dualLength === 1 ? -1 : i) + homLength);
		return [...homset, ...dual];
	}
	addMorphism(m)
	{
		m.domain.domains.add(m);
		m.codomain.codomains.add(m);
		this.updateHomsetIndices(m.domain, m.codomain);
	}
	removeMorphism(m)
	{
		m.domain.domains.delete(m);
		m.codomain.codomains.delete(m);
		this.updateHomsetIndices(m.domain, m.codomain);
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
		const badCells = new Set();
		obj.nodes.forEach(function(cell)
		{
			if (Cell.IsA(cell) && ((cell.left.includes(from)) || (cell.right.includes(from))))
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
							if (Cell.HasSubCell(that.cells, leg, alt))
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
			const flatLeft = diagram.decompose(left.map(m => m.to));
			const flatRight = diagram.decompose(right.map(m => m.to));
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
	find(elt)
	{
		const fnd = [];
		this.elements.forEach(function(from) { from.to === elt && fnd.push(from); });
		return fnd;
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
		return H3.div(super.help(), hdr, ...this.morphisms.map(m => m.getHtmlRep()));
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
		return H3.div(super.help(H3.p('Composite')));
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
	static IsA(m) { return Composite.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(H3.p(this.dual ? 'Coproduct' : 'Product')));
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
	static IsA(m) { return ProductMorphism.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(), H3.p(`${this.dual ? 'Co' : 'P'}roduct assembly`));
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
	static IsA(m) { return ProductAssembly.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(), H3.p(`${this.dual ? 'Cofactor' : 'Factor'} morphism: ${this.factors}`));
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
//				const args = {factors:[i], dual:this.dual};
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
			});
		}
	}
	static Basename(diagram, args)
	{
		const factors = args.factors;
		if (factors.length === 0 || (factors.length === 1 && factors[0].length === 0))
			return Identity.Basename(args);
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
		const sigs = [dual];
		if (!cofactors)
			factors.map(f => sigs.push(Identity.Signature(diagram, f === -1 ? diagram.getTerminal(this.dual) : domain.getFactor(f)), f));
		else
			throw 'TODO';
		return U.SigArray(sigs);
	}
	static IsA(m) { return FactorMorphism.prototype.isPrototypeOf(m) || (NamedMorphism.prototype.isPrototypeOf(m) && FactorMorphism.prototype.isPrototypeOf(m.base)); }
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
		this.properName = LambdaMorphism.ProperName(preCurry, args.domFactors, args.homFactors);
		this.preCurry = preCurry;
		this.preCurry.incrRefcnt();
		this.domFactors = args.domFactors;
		this.homFactors = args.homFactors;
		this.signature = this.getLambdaSignature();
		this.constructor.name === 'LambdaMorphism' && R.EmitElementEvent(diagram, 'new', this);
	}
	help()
	{
		return H3.div(super.help(),
			H3.p(`Lambda morphism of pre-curry ${this.preCurry.htmlName()} and domain factors [${this.domFactors}] and codomain factors [${this.homFactors}]`));
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
	static IsA(m) { return LambdaMorphism.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(H3.p('Hom')));
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
	static IsA(m) { return HomMorphism.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(), H.p('Evaluation'));
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
	static IsA(m) { return Evaluation.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(), H3.p('Distribute a product over a coproduct'));
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
	static IsA(m) { return Distribute.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(), H3.p('Gather a product from a coproduct'));
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
	static IsA(m) { return Dedistribute.prototype.isPrototypeOf(m); }
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
		return H3.div(super.help(), H3.p('Functor'));
	}
}

class Diagram extends Functor
{
	constructor(diagram, args)
	{
		const nuArgs = U.Clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.category = U.GetArg(args, 'category', (diagram && 'codomain' in diagram) ? diagram.codomain : null);
		if (!Category.IsA(nuArgs.codomain))
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
			viewport:					{value:{x:0, y:0, scale:1.0},	writable:true},
		});
		if ('references' in args)
			args.references.map(r => this.addReference(r, false));
		R.sync = true;
		if ('viewport' in nuArgs)
			this.viewport = nuArgs.viewport;
		if ('elements' in nuArgs)
			this.codomain.process(this, nuArgs.elements, this.elements);
		this.makeSVG(false);
		if ('domainElements' in nuArgs)
			this.domain.process(this, nuArgs.domainElements);

		R.SetDiagramInfo(this);
		this.postProcess();
//		diagram && this.constructor.name === 'Diagram' && R.EmitElementEvent(diagram, 'new', this);
		diagram && this.constructor.name === 'Diagram' && R.EmitCATEvent(diagram, 'new', this);
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
	help()
	{
		return H3.div(super.help(), H3.p('Diagram'));
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
//		a.timestamp = this.timestamp;
		a.domainElements = [];
		this.domain.elements.forEach(function(e)
		{
			if ((e.to && e.to.canSave()) || (!('to' in e)))
				a.domainElements.push(e.json());
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
			const name = `${this.name}/${basename}`;
			if (!this.elements.has(basename) && !this.domain.elements.has(name))
				return basename;
		}
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
	setView(x, y, s, log = true)
	{
		const oldport = U.Clone(this.viewport);
		this.viewport.x = x;
		this.viewport.y = y;
		this.viewport.scale = s;
		this.svgTranslate.setAttribute('transform', `translate(${this.viewport.x} ${this.viewport.y}) scale(${this.viewport.scale} ${this.viewport.scale})`);
		log && this.updateViewSaveTimer(oldport);
	}
	setViewport(bbox, log = true)
	{
		if (bbox.width === 0)
			bbox.width = D.Width();
		const margin = D.navbar.element.getBoundingClientRect().height;
		const dw = D.Width() - 2 * D.default.panel.width - 2 * margin;
		const dh = D.Height() - 4 * margin;
		const xRatio = bbox.width / dw;
		const yRatio = bbox.height / dh;
		const s = 1.0/Math.max(xRatio, yRatio);
		let x = - bbox.x * s + D.default.panel.width + margin;
		let y = - bbox.y * s + 2 * margin;
		if (xRatio > yRatio)
			y += dh/2 - s * bbox.height/2;
		else
			x += dw/2 - s * bbox.width/2;
		this.setView(x, y, s, log);
	}
	home(log = true)
	{
		this.setViewport(this.svgBase.getBBox(), log);
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
	addSVG(element)
	{
		if (this.svgBase)
			element.getSVG(this.svgBase);
	}
	actionHtml(e, name, args = {})
	{
		D.RemoveChildren(D.toolbar.error);
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
	mousePosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
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
		this.domain.elements.forEach(function(e) {this.addSelected(e);}, this);
		this.assertions.forEach(function(e) {this.addSelected(e);}, this);
	}
	selectElement(e, name)
	{
		const elt = this.getElement(name);
		if (elt)
		{
			D.dragStart = D.mouse.position();
			if (!this.selected.includes(elt))
			{
				if (D.shiftKey)
					this.addSelected(elt);
				else
					this.makeSelected(elt);
			}
			else if (D.shiftKey)
				this.deselect(elt);
			else
				D.toolbar.show();
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
		R.default.debug && console.log('selected', elt && elt.basename, elt && elt.refcnt, elt, elt && 'assyGraph' in elt ? elt.assyGraph.hasTag('info') : '');
	}
	addSelected(elt)
	{
		elt.showSelected();
		if (!this.selected.includes(elt))	// not already selected
		{
			this.selected.push(elt);
			if (DiagramObject.IsA(elt) || DiagramText.IsA(elt))
				elt.finishMove();
			else if (DiagramMorphism.IsA(elt))
			{
				elt.domain.finishMove();
				elt.codomain.finishMove();
			}
		}
		R.EmitElementEvent(this, 'select', elt);
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
		const delta = D.mouse.position().subtract(D.dragStart);
		delta.x = delta.x / this.viewport.scale;
		delta.y = delta.y / this.viewport.scale;
		const dragObjects = new Set();
		this.selected.map(elt =>
		{
			if (DiagramMorphism.IsA(elt))
			{
				dragObjects.add(elt.domain);
				dragObjects.add(elt.codomain);
			}
			else if (DiagramObject.IsA(elt) || DiagramText.IsA(elt))
				dragObjects.add(elt);
			else if (Cell.IsA(elt))
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
			if (DiagramObject.IsA(o))
			{
				o.domains.forEach(updateMorphism);
				o.codomains.forEach(updateMorphism);
			}
		});
	}
	placeText(e, xy, description)
	{
		const txt = new DiagramText(this, {description, xy});
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
		return from;
	}
	placeMorphism(e, to, xyDom = null, xyCod = null, save = true, doOffset = true)
	{
		if (typeof to === 'string')
			to = this.getElement(to);
		let xyD = null;
		let domain = null;
		if (DiagramObject.IsA(xyDom))
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
		if (DiagramObject.IsA(xyCod))
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
		const bbox = new D2(from.svg.getBBox());
		let offboxes = [new D2(domain.getBBox()), new D2(bbox), new D2(codomain.getBBox())];
		const names = [domain.name, from.name, codomain.name];
/*
		if (doOffset)
		{
			let offset = new D2;
			while (offboxes.reduce((r, bx, i) => r || this.hasOverlap(bx, names[i]), false))
			{
				offboxes = offboxes.map(bx => bx.add(D.default.stdOffset));
				offset = offset.add(D.default.stdOffset);
			}
			from.domain.update(xyD.add(offset));
			from.codomain.update(xyC.add(offset));
			from.update();
		}
*/
		if (save)
			this.makeSelected(from);
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
			fromObj.domains.forEach(function(m) { angles.push(D2.Angle(fromObj, m.codomain)); });
			fromObj.codomains.forEach(function(m) { angles.push(D2.Angle(fromObj, m.domain)); });
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
			const arrowLength = Cat.D.GetArrowLength(to);
			const xy = D.Grid(D2.Scale(arrowLength, {x:cosAngle, y:Math.sin(angle)}).add(fromObj));
			const newElt = new DiagramObject(this, {xy, to: dir === 'domain' ? to.codomain : to.domain});
			const {domainElt, codomainElt} = dir === 'domain' ? {domainElt:fromObj, codomainElt:newElt} : {domainElt:newElt, codomainElt:fromObj};
			const from = new DiagramMorphism(this, {to, domain:domainElt, codomain:codomainElt});
			if (save)
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
	makeSVG(anim = true)
	{
		this.svgRoot = document.getElementById(this.elementId('root'));
		if (!this.svgRoot)
		{
			this.svgRoot = H3.g();
			this.svgRoot.classList.add('hidden');
			D.diagramSVG.appendChild(this.svgRoot);
			this.svgRoot.id = this.elementId('root');
			this.svgBase = H3.g({id:`${this.elementId()}-base`});
			this.svgTranslate = H3.g({id:`${this.elementId()}-T`}, this.svgBase);
			this.svgRoot.appendChild(this.svgTranslate);
			this.svgRoot.style.display = 'block';
			this.domain.elements.forEach(function(elt) { this.addSVG(elt); }, this);
		}
		this.domain.cells.forEach(function(d) { this.addSVG(d); }, this);
	}
	upload(e)
	{
		if (R.cloud && this.user === R.user.name && R.user.status === 'logged-in')
		{
			const start = Date.now();
			const btn = document.getElementById('diagramUploadBtn');
			if (e && btn)	// start button animation
			{
				btn.setAttribute('repeatCount', 'indefinite');
				btn.beginElement();
			}
			const that = this;
			R.cloud.ingestDiagramLambda(e, this, function()
			{
				R.default.debug && console.log('uploaded', that.name);
				R.catalog.set(that.name, R.GetDiagramInfo(that));
				R.ServerDiagrams.set(that.name, that);
				const delta = Date.now() - start;
				if (e)
				{
					D.statusbar.show(e, 'Uploaded diagram', true);
					console.log('diagram uploaded ms:', delta);
					R.EmitCATEvent('upload', that);
					btn.setAttribute('repeatCount', 1);
				}
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
		D.toolbar.error.innerHTML = '';
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
				e && e.stopPropagation();
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
				R.EmitElementEvent(this, 'update', elt);
			}
			else
			{
				txtbox.contentEditable = true;
				txtbox.focus();
			}
			return value;
		}
		catch(x)
		{
			D.toolbar.error.innerHTML = U.HtmlEntitySafe(`Error: ${x}`);
		}
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
		return ary.map(e => this.getElement(e)).filter(e => e !== undefined);
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
		this.domain.forEachMorphism(function(m) { exist = exist || ('graph' in m && m.graph.svg && !m.graph.svg.classList.contains('hidden')); });
		this.domain.forEachMorphism(function(m) { exist ? m.removeGraph() : m.showGraph(); });
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
		D.Download(D.diagramPNG.get(this.name), `${this.name}.png`);
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
	addReference(elt, emit = true)	// immediate, no background fn
	{
		const name = Diagram.IsA(elt) ? elt.name : elt;
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
		const fn = function(o) { objects.add(o); };
		this.forEachObject(fn);
		this.allReferences.forEach(function(cnt, name)
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachObject(fn);
		});
		return [...objects];
	}
	getMorphisms()
	{
		const morphisms = new Set();
		const fn = function(m) { morphisms.add(m); };
		this.forEachMorphism(fn);
		this.allReferences.forEach(function(cnt, name)
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachMorphism(fn);
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
		if (elt && (DiagramMorphism.IsA(elt) || DiagramObject.IsA(elt) || DiagramText.IsA(elt)))
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
		const that = this;
		function doit(m)
		{
			switch(m.constructor.name)
			{
				case 'Composite':
					m.morphisms.map(sm => morphs.push(...that.decompose(sm)));
					break;
				case 'NamedMorphism':
					morphs.push(...that.decompose(m.source));
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
			if (prototype === 'Category' && 'Actions' in R && 'actions' in args)	// bootstrap issue
				args.actions.map(a => this.actions.set(a, R.$Actions.getElement(a)));
		}
		if (!DiagramMorphism.IsA(elt) && 'loadEquivalences' in elt)
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
		return elements.length > 1 ? (CatObject.IsA(elements[0]) ? this.get('ProductObject', {objects:elements}) : this.get('ProductMorphism', {morphisms:elements})) :
			elements[0];
	}
	coprod(...elements)
	{
		return elements.length > 1 ?
			(CatObject.IsA(elements[0]) ? this.get('ProductObject', {objects:elements, dual:true}) : this.get('ProductMorphism', {morphisms:elements, dual:true})) :
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
		return CatObject.IsA(elements[0]) ? this.get('HomObject', {objects:elements}) : this.get('HomMorphism', {morphisms:elements});
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
	// TODO what about dedist?
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
	log(cmd)
	{
		cmd.date = new Date();
		this._log.push(cmd);
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
		localStorage.setItem(`${this.name}.log`, JSON.stringify(this._log));
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
			m.svg_name.innerHTML = m.to.htmlName();
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
		if (R.ReplayCommands.has(cmd.command))
		{
			const obj = R.ReplayCommands.get(cmd.command);
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
		function update(m){ m.update(); }
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
	updateViewSaveTimer(oldport)
	{
		if (this.viewSaveTimer)
			clearInterval(this.viewSaveTimer);
		const diagram = this;
		oldport.name = this.name;
		this.viewSaveTimer = setTimeout(function()
		{
			R.default.debug && console.log('updateViewSaveTimer fired!');
			if (R.diagram && oldport.name === R.diagram.name &&
				(oldport.x !== R.diagram.viewport.x || oldport.y !== R.diagram.viewport.y || oldport.scale !== R.diagram.viewport.scale))
				diagram.logViewCommand();
		}, D.default.saveInterval);
	}
	logViewCommand()
	{
		const log = this._log;
		if (log.length > 0 && log[log.length -1].command === 'view')	// replace last view command?
			D.ttyPanel.logSection.removeLogCommand(null, log.length -1);
		R.SaveLocal(this);
		this.log({command:'view', x:Math.round(this.viewport.x), y:Math.round(this.viewport.y), scale:Math.round(10000.0 * this.viewport.scale)/10000.0});
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
			this.setViewport(bbox);
		}
	}
	addFactorMorphisms(domain, codomain)
	{
		const dom = domain.getBase();
		const cod = codomain.getBase();
		if (ProductObject.IsA(dom) && !dom.dual)
			domain.find(codomain).map((f, i) => this.fctr(domain, [f]));
		if (ProductObject.IsA(codomain) && codomain.dual)
			codomain.find(domain).map((f, i) => this.fctr(domain, [f]));
	}
	getObjectSelector(id, text, change)
	{
		const options = [H3.option(text)];
		const objects = this.getObjects().reverse();
		this.allReferences.forEach(function(cnt, ref) { objects.push(...R.$CAT.getElement(ref).getObjects().reverse()); });
		options.push(...objects.map(o => H3.option(o.htmlName(), {value:o.name})));
		const sel = H3.select({class:'w100', id}, options);
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
			const morph = DiagramMorphism.IsA(m) ? m.to.basic() : m.basic();
			return Identity.IsA(morph) || FactorMorphism.IsA(morph);
		};
		const isProjection = function(m)
		{
			const morph = DiagramMorphism.IsA(m) ? m.to.basic() : m.basic();
			return Identity.IsA(morph) || (FactorMorphism.IsA(morph) && !morph.dual);
		};
		const isInjection = function(m)
		{
			const morph = DiagramMorphism.IsA(m) ? m.to.basic() : m.basic();
			return Identity.IsA(morph) || (FactorMorphism.IsA(morph) && morph.dual);
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
			const barGraph = new Graph();
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
			if (MultiMorphism.IsA(m))	// break it down
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
				if (FactorMorphism.IsA(to) && !to.dual)
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
			if (DiagramObject.IsA(o))
			{
				o.svg.parentNode.insertBefore(H3.circle({class:'ball', cx:o.x, cy:o.y, r:radius, fill}), o.svg);
			}
			else if (DiagramMorphism.IsA(o))
			{
				const xy = o.getNameOffset();
				o.svg_name.parentNode.insertBefore(H3.circle({class:'ball', cx:xy.x, cy:xy.y, r:radius, fill}), o.svg_name);
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
				if (FactorMorphism.IsA(m.to))
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

		//
		// propagate tags from inputs
		//
		inputs.map(i => issues.push({message:'Input', element:i}));

		inputs.map(i =>
		{
			i.domains.forEach(function(m)
			{
				isConveyance(m) && references.delete(m);
				propTag(m, m.to, m.graph, getBarGraph(m), tag, setTag);
			});
		});
		//
		// look for outputs; they have info and no non-info factor morphisms
		//
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
			if ([...s.domains, ...s.codomains].reduce((r, m) => r && isConveyance(m)))
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
			//
			// downstream objects that refer to this index object need to find our index
			//
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
				!Identity.IsA(preFactor) && morphs.unshift(preFactor);
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
//				scanning.push({domain:cod, currentDomain:morphs[morphs.length -1].codomain, index});
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
					if (FactorMorphism.IsA(r))
					{
						const f = r.factors[0];
						if (f.length > 1)
							issues.push({message:'Factor is too deep', morphism:r});
						elt = r.factors[0][0];
					}
					else if (Morphism.IsA(r) && 'data' in r)
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
			!Identity.IsA(morphism) && components.push(morphism);
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
		}
	}
	hide()
	{
		this.svgRoot.classList.add('hidden');
		this.svgRoot.style.display = 'none';
	}
	show()
	{
		this.svgRoot.classList.remove('hidden');
		this.svgRoot.style.display = 'block';
	}
	isEditable()
	{
		return 	('readonly' in this ? !this.readonly : true) && this.user === R.user.name;
	}
	postProcess()
	{
		const that = this;
		this.forEachMorphism(function(m)
		{
			if ('recursor' in m && typeof m.recursor === 'string')	// set recursive function as it is defined after m is
				m.setRecursor(m.recursor);
			'data' in m && m.data.forEach(function(d, i) { m.data.set(i, U.InitializeData(that, m.codomain, d)); });
		});
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
	Action,
	Assertion,
	Category,
	CatObject,
	Cell,
	CppAction,
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
};

window.Cat			= Cat;

!('QUnit' in window) && R.Initialize();	// boot-up

})();
