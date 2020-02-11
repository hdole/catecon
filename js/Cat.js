// (C) 2018-2019 Harry Dole
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
	static Merge(abox, bbox)
	{
		const x = Math.min(abox.x, bbox.x);
		const y = Math.min(abox.y, bbox.y);
		const width = Math.max(abox.x + abox.width - x, bbox.x + bbox.width - x);
		const height = Math.max(abox.y + abox.height - y, bbox.y + bbox.height - y);
		return {x, y, width, height};
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
	static select(h, c, i, t, x) {return H.x('select', '', c, i, t, x); }
	static option(h, v, sel = false)			{return H.x('option', h, '', '', '', `${sel ? 'selected ' : ''}value="${v}"`); }
	static del(elt) {elt.parentElement.removeChild(elt);}
	static move(elt, toId) {document.getElementById(toId).appendChild(elt); }
	static toggle(elt, here, there) {elt.parentNode.id === here ? H.move(elt, there) : H.move(elt, here); }
}

const isCloud = true;		// TODO turn on when cloud ready

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

class U
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
		return typeof err === 'string' ? err : `${err.name}: ${err.message}`;
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
			else if (Map.prototype.isPrototypeOf(o))
				return new Map(o);
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
	static JsName(e, cls = false)
	{
		const s = e.name;
		const r = s.replace(/\//g, '_').replace(/{/g, '_Br_').replace(/}/g, '_rB_').replace(/,/g, '_c_').replace(/:/g, '_o_').replace(/#/g, '_n_')
			.replace(/\[/g, '_br_')
			.replace(/\]/g, '_rb_');
		return r;
	}
	static Lines2tspan(elt)
	{
		return elt.description.indexOf('\n') > -1 ?  elt.description.split('\n').map(t => `<tspan text-anchor="left" x="${elt.x}" dy="1.2em">${t}</tspan>`).join('') : elt.description;
	}
	static a2s(a)	// array to string
	{
		if (Array.isArray(a))
			return '[' + a.map(e => U.a2s(e)).join() + ']';
		return a.toString();
	}
	static safe(a)
	{
		return U.HtmlSafe(U.a2s(a));
	}
	static GetSignature(type, elts)
	{
		return elts.length > 1 ? U.sha256(`${type} ${elts.map(e => e.signature).join()}`) : elts[0].signature;
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
	static SetupUserHome(user)
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
			const args =
			{
				user,
				diagram:	home,
				xy:			new D2(300, 300),
			};
			R.AddDiagram(home);
			home.makeSvg();
			R.Autoplace(home,
			{
				description:
`Welcome to Catecon: The Categorical Console
Create diagrams and execute morphisms.
`,
				prototype:		'DiagramText',
				user,
			}, args.xy);
			D.ShowDiagram(home);
			home.home();
			home.update();
		}
		return home;
	}
	static Initialize()
	{
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
				new NameAction(R.$Actions),
				new CompositeAction(R.$Actions),
				new DetachDomainAction(R.$Actions),
				new DetachCodomainAction(R.$Actions),
				new HomRightAction(R.$Actions),
				new HomLeftAction(R.$Actions),
				new DeleteAction(R.$Actions),
				new CopyAction(R.$Actions),
				new FlipNameAction(R.$Actions),
				new HelpAction(R.$Actions),
				new JavascriptAction(R.$Actions),
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
				new DiagonalAction(R.$Actions),
				new ProjectAction(R.$Actions),
				new PullbackAction(R.$Actions),
				new ProductAssemblyAction(R.$Actions),
				new TerminalMorphismAction(R.$Actions)]);
			const productDiagram = new Diagram(R.$CAT, {basename:'product', name:'product', codomain:'Actions', description:'diagram for products', user:'sys'});
			xy = new D2(300, 300);
			diagram = productDiagram;
			productActions.forEach(placeAction);
			const coproductActions = new Set([
				new CoproductAction(R.$Actions),
				new FoldAction(R.$Actions),
				new InjectAction(R.$Actions),
				new PushoutAction(R.$Actions),
				new CoproductAssemblyAction(R.$Actions),
				new InitialMorphismAction(R.$Actions),
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
			isGUI && D.Initialize();
			R.Boot(function()
			{
				R.Setup(function() { R.initialized = true; });
				R.GraphCat = new Category(R.$CAT, {basename:'Graph', user:'sys', properName:'𝔾𝕣𝕒'});
				isGUI && D.panels.update();
				if (!isGUI)
				{
					exports.cloud =					R.cloud;
					exports.default =				D.default;
					exports.sep =					'-',
					exports.user =					R.user;
					exports.Diagram =				Diagram;
					exports.Element =				Element;
					exports.CatObject =				CatObject;
					exports.Morphism =				Morphism;
					exports.StringMorphism =		StringMorphism;
				}
			});
		}
		catch(e)
		{
			D.RecordError(e);
		}
	}
	static GetUserDiagram(user)
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
	static CheckColumn(args)
	{
		if ('rowCount' in args && args.rowCount >= args.rows)
		{
			const bbox = args.diagram.svgRoot.getBBox();
			if (bbox.width === 0)	// TODO issue with firefox
			{
				bbox.width = 600;
				bbox.x = args.xy.x;
			}
			args.xy = D.Grid(new D2(bbox.x + bbox.width + 160, 300 + 8 * 16));
			args.rowCount = 0;
		}
	}
	static Autoplace(diagram, args, xy)
	{
		let index = null;
		if (args.prototype === 'DiagramText')
		{
			const nuArgs = U.clone(args);
			nuArgs.xy = xy;
			index = new DiagramText(diagram, nuArgs);
			diagram.addSVG(index);
		}
		else if (CatObject.prototype.isPrototypeOf(args))
			index = diagram.placeObject(null, args, xy, false);
		else
		{
			const to = Element.Process(diagram, args);
			if (Morphism.prototype.isPrototypeOf(to))
			{
				index = diagram.placeMorphism(null, to, xy, xy.add(D.default.stdArrow), false);
				if ('js' in args)
					to.code = {javascript:JavascriptAction.Header(to) + '\t' + args.js + JavascriptAction.Tail(to)};
				else if ('code' in args)
					to.code.javascript = args.code.javascript.replace(/%1/g, U.JsName(to));
			}
			else if (CatObject.prototype.isPrototypeOf(to))
				index = diagram.placeObject(null, to, xy, false);
		}
		if ('rowCount' in args)
		{
			args.rowCount++;
			xy.y += 16 * D.default.layoutGrid;
		}
		return index;
	}
	static DiagramReferences(user, diagram, xy)
	{
		const names = [];
		diagram.references.forEach(function(d){names.push(d.properName);});
		R.Autoplace(diagram,
		{
			description:	'References: ' + names.join(),
			prototype:		'DiagramText',
			user,
		}, xy);
	}
	static PlaceSideText(args, text)
	{
		R.Autoplace(args.diagram,
		{
			description:	U.Formal(text),
			prototype:		'DiagramText',
			user:			args.user,
		}, args.xy.add(args.side));
	}
	static PlaceObject(args, o)
	{
		R.CheckColumn(args);
		R.PlaceSideText(args, o.description);
		const i = args.diagram.placeObject(null, o, args.xy, false);
		args.rowCount++;
		args.xy.y += 16 * D.default.layoutGrid;
		return i;
	}
	static MakeObject(args, basename, prototype, properName, description, moreArgs = {})
	{
		R.CheckColumn(args);
		R.PlaceSideText(args, description);
		const nuArgs = U.clone(args);
		nuArgs.xy = new D2(args.xy);
		for (const n in moreArgs)
			nuArgs[n] = moreArgs[n];
		nuArgs.description = description;
		nuArgs.prototype = prototype;
		nuArgs.basename = basename;
		if (properName !== '')
			nuArgs.properName = properName;
		const e = R.Autoplace(args.diagram, nuArgs, nuArgs.xy);
		args.xy = new D2(nuArgs.xy);
		args.rowCount = nuArgs.rowCount;
		return e;
	}
	static PlaceMorphism(args, m)
	{
		R.CheckColumn(args);
		R.PlaceSideText(args, m.description);
		const i = args.diagram.placeMorphism(null, m, args.xy, args.xy.add(D.default.stdArrow), false);
		args.xy = new D2(args.xy);
		args.rowCount++;
		args.xy.y += 16 * D.default.layoutGrid;
		return i;
	}
	static MakeMorphism(args, basename, prototype, properName, description, domain, codomain, moreArgs = {})
	{
		const nuArgs = U.clone(args);
		nuArgs.xy = new D2(args.xy);
		for (const n in moreArgs)
			nuArgs[n] = moreArgs[n];
		nuArgs.description = description;
		nuArgs.basename = basename;
		nuArgs.prototype = prototype;
		if (properName !== '')
			nuArgs.properName = properName;
		nuArgs.domain = domain;
		nuArgs.codomain = codomain;
		const to = Element.Process(args.diagram, nuArgs);
		if ('js' in nuArgs)
			to.code = {javascript:JavascriptAction.Header(to) + '\t' + nuArgs.js + JavascriptAction.Tail(to)};
		else if ('code' in nuArgs)
			to.code.javascript = nuArgs.code.javascript.replace(/%1/g, U.JsName(to));
		const e = R.PlaceMorphism(nuArgs, to);
		args.xy = new D2(nuArgs.xy);
		args.rowCount = nuArgs.rowCount;
		return e;
	}
	static Boot(fn)
	{
		let user = 'hdole';
		const side = D.Grid(new D2(0, 4 * D.default.layoutGrid));
		const pfs = new Category(R.$CAT,
			{
				basename:'PFS',
				user,
				properName:'<tspan class="bold">&Popf;</tspan>&Fopf;&Sopf;',
				actionDiagrams:	['product', 'coproduct', 'hom', 'distribute'],
			});
		let userDiagram = R.GetUserDiagram(user);
		const args =
		{
			user,
			xy:			new D2(300,300),
			side,
			rows:		8,
			rowCount:	0,
		};
		//
		// basics
		//
		const basics = new Diagram(userDiagram,
		{
			codomain:		pfs,
			basename:		'Basics',
			properName:		'Basics',
			description:	'Basic objects for interacting with the real world',
			user,
		});
		args.diagram = basics;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		basics.makeSvg(false);
		R.AddDiagram(basics);
		R.Autoplace(basics,
		{
			description:	'This diagram contains initial and terminal objects\nas well as objects for interacting with the real world.\nIn other words, device drivers',
			prototype:		'DiagramText',
			user,
		}, args.xy);
		args.xy.y += 16 * D.default.layoutGrid;
		const zero = InitialObject.Get(basics);	// creates if need be
		const one = TerminalObject.Get(basics);	// creates if need be
		R.PlaceObject(args, zero);
		R.PlaceObject(args, one);
		const tty = R.MakeObject(args, 'TTY', 'FiniteObject', 'TTY', 'The TTY object interacts with serial devices').to;
		D.ShowDiagram(basics);
		basics.home(false);
		basics.update();
		//
		// logic
		//
		const logic = new Diagram(userDiagram,
		{
			codomain:		pfs,
			basename:		'Logic',
			properName:		'&Omega; Logic',
			description:	'Basic logic functions',
			references:		[basics],
			user,
		});
		args.diagram = logic;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		logic.makeSvg(false);
		R.AddDiagram(logic);
		R.Autoplace(logic,
		{
			description:	'This diagram contains typical logic objects and morphisms',
			prototype:		'DiagramText',
			user,
			properName:		'&Omega;',
		}, args.xy);
		args.xy.y += 16 * D.default.layoutGrid;
		const two = CoproductObject.Get(logic, [one, one]);
		const omega = new NamedObject(logic, {basename:'Omega', properName:'&Omega;', source:two});
		const omega2twoId = logic.placeMorphism(null, omega.idFrom, args.xy, args.xy.add(D.default.stdArrow), false);
		args.rowCount++;
		args.xy.y += 16 * D.default.layoutGrid;
		const id2 = new DiagramMorphism(logic, {to:omega.idTo, domain:omega2twoId.codomain, codomain:omega2twoId.domain});
		const omegaPair = R.MakeObject(args, '', 'ProductObject', '', 'A pair of 2\'s', {objects:[omega, omega]}).to;
		const mTrue = R.MakeMorphism(args, 'true', 'Morphism', '&#8868;', 'The truth value known as true', one, omega, {js:'return true;'}).to;
		const mFalse = R.MakeMorphism(args, 'false', 'Morphism', '&perp;', 'The truth value known as false', one, omega, {js:'return false;'}).to;
		const logicNot = R.MakeMorphism(args, 'not', 'Morphism', '&not;', 'The negation of a logic value', omega, omega, {js:'return !args;'}).to;
		const logicAnd = R.MakeMorphism(args, 'and', 'Morphism', '&and;', 'The logical and of two logic values', omegaPair, omega, {js:'return args[0] && args[1];'}).to;
		const logicOr = R.MakeMorphism(args, 'or', 'Morphism', '&or;', 'The logical or of two logic values', omegaPair, omega, {js:'return args[0] || args[1];'}).to;
		R.DiagramReferences(user, logic, args.xy);
		D.ShowDiagram(logic);
		logic.home(false);
		logic.update();
		//
		// N arithemtic
		//
		const Narith = new Diagram(userDiagram,
		{
			description:	'Arithmetic functions for natural numbers',
			codomain:		pfs,
			basename:		'Narithmetics',
			properName:		'&Nopf; Arithmetic',
			references:		[logic],
			user,
		});
		args.diagram = Narith;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		Narith.makeSvg(false);
		R.AddDiagram(Narith);
		R.Autoplace(Narith,
		{
			description:	'Basic morphisms for natural numbers are given here',
			prototype:		'DiagramText',
			user,
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const N = R.MakeObject(args, 'N', 'CatObject', '<tspan class="bold">&Nopf;</tspan>', 'The natural numbers').to;
		const Nzero = R.MakeMorphism(args, 'zero', 'Morphism', '0', 'The first interesting natural number', one, N, {js:'return 0;'}).to;
		const None = R.MakeMorphism(args, 'one', 'Morphism', '1', 'The natural number one', one, N, {js:'return 1;'}).to;
		const Ninfinity = R.MakeMorphism(args, 'infinity', 'Morphism', '&infin;', 'The maximum safe natural number', one, N, {js:'return Number.MAX_SAFE_INTEGER;'}).to;
		const Npair = R.MakeObject(args, '', 'ProductObject', '', 'A pair of natural numbers', {objects:[N, N]}).to;
		const Nadd = R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two natural numbers', Npair, N, {js:'return args[0] + args[1];'}).to;
		const Nmult = R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two natural numbers', Npair, N, {js:'return args[0] * args[1];'}).to;
		const Nsucc = R.MakeMorphism(args, 'successor', 'Morphism', 'succ', 'The successor function for the natural numbers', N, N, {js:'return args + 1;'}).to;
		const Ndecr = R.MakeMorphism(args, 'decrement', 'Morphism', 'decr', 'The decrement function for the natural numbers', N, N, {js:'return args > 0 ? args - 1 : 0;'}).to;
		const Nless = R.MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first natural number less than the second', Npair, omega, {js:'return args[0] < args[1];'}).to;
		const NlessEq = R.MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first natural number less than or equal to the second', Npair, omega, {js:'return args[0] <= args[1];'}).to;
		const Nequals = R.MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two natural numbers for equality', Npair, omega, {js:'return args[0] === args[1];'}).to;
		R.DiagramReferences(user, Narith, args.xy);
		D.ShowDiagram(Narith);
		Narith.home(false);
		Narith.update();
		//
		// integers
		//
		const integers = new Diagram(userDiagram,
		{
			description:	'Arithmetic functions for integers',
			codomain:		pfs,
			basename:		'Integers',
			properName:		'&Zopf; Arithmetic',
			references:		[Narith],
			user,
		});
		args.diagram = integers;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		integers.makeSvg(false);
		R.AddDiagram(integers);
		R.Autoplace(integers,
		{
			description:	'Basic morphisms for the integers are given here',
			prototype:		'DiagramText',
			user,
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const Z = R.MakeObject(args, 'Z', 'CatObject', '<tspan class="bold">&Zopf;</tspan>', 'The integers').to;
		const N2Z = R.MakeMorphism(args, 'N2Z', 'Morphism', '&sub;', 'every natural number is an integer', N, Z, {js:'return args;'}).to;
		const Zabs = R.MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of an integer is a natural number', Z, N, {js:'return Math.abs(args);'}).to;
		const Zzero = R.MakeMorphism(args, 'zero', 'Morphism', '&lsquo;0&rsquo;', 'The integer zero', one, Z, {js:'return 0;'}).to;
		const ZminusOne = R.MakeMorphism(args, 'minusOne', 'Morphism', '&lsquo;-1&rsquo;', 'The first interesting integer: minus one', one, Z, {js:'return -1;'}).to;
		const Zpair = R.MakeObject(args, '', 'ProductObject', '', 'A pair of integers', {objects:[Z, Z]}).to;
		const Zadd = R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two integers', Zpair, Z, {js:'return args[0] + args[1];'}).to;
		const Zsubtract = R.MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two integers', Zpair, Z, {js:'return args[0] - args[1];'}).to;
		const Zmult = R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two integers', Zpair, Z, {js:'return args[0] * args[1];'}).to;
		const ZplusOne = R.MakeObject(args, '', 'CoproductObject', '', 'An integer or an exception', {objects:[Z, one]}).to;
		const Zdiv = R.MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two integers or an exception', Zpair, ZplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args[1] === 0)
		return [1, 0];
	return [0, args[0] / args[1]];
}
`			},
		}).to;
		const Zsucc = R.MakeMorphism(args, 'successor', 'Morphism', 'succ', 'The successor function for the integers', Z, Z, {js:'return args + 1;'});
		const Zmodulus = R.MakeMorphism(args, 'modulus', 'Morphism', '%', 'The modulus of two integers or an exception', Zpair, ZplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args[1] === 0)
		return [1, 0];
	return [0, args[0] % args[1]];
}
`			},
		});
		const Zless = R.MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first given integer number less than the second', Zpair, omega, {js:'return args[0] < args[1];'});
		const ZlessEq = R.MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first integer less than or equal to the second', Zpair, omega, {js:'return args[0] <= args[1];'});
		const Zequals = R.MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two integers for equality', Zpair, omega, {js:'return args[0] === args[1];'});
		R.DiagramReferences(user, integers, args.xy);
		D.ShowDiagram(integers);
		integers.home(false);
		integers.update();
		//
		// floating point
		//
		const floats = new Diagram(userDiagram,
		{
			description:	'Floating point artihmetic functions',
			codomain:		pfs,
			basename:		'floats',
			properName:		'&Fopf; Arithmetic',
			references:		[integers],
			user,
		});
		args.diagram = floats;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		floats.makeSvg(false);
		R.AddDiagram(floats);
		R.Autoplace(floats,
		{
			description:	'Basic floating point morphisms are given here',
			prototype:		'DiagramText',
			user,
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const F = R.MakeObject(args, 'F', 'CatObject', '&Fopf;', 'Floating point numbers').to;
		const Fzero = R.MakeMorphism(args, 'zero', 'Morphism', '0.0', 'The floating point zero', one, F, {js:'return 0.0;'}).to;
		const Fe = R.MakeMorphism(args, 'e', 'Morphism', 'e', 'Euler\'s constant', one, F, {js:'return Math.E;'}).to;
		const Frandom = R.MakeMorphism(args, 'random', 'Morphism', '?', 'a random number between 0.0 and 1.0', one, F, {js:'return Math.random();'}).to;
		const Fnl10 = R.MakeMorphism(args, 'pi', 'Morphism', '&pi;', 'ratio of a circle\'s circumference to its diameter', one, F, {js:'return Math.PI;'}).to;
		const Z2F = R.MakeMorphism(args, 'Z2F', 'Morphism', '&sub;', 'every integer is (sort of) a floating point number', Z, F, {js:'return args;'}).to;
		const Fabs = R.MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of a floating point number', F, F, {js:'return Math.abs(args);'}).to;
		const Fpair = R.MakeObject(args, '', 'ProductObject', '', 'A pair of floating point numbers', {objects:[F, F]}).to;
		const Fadd = R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two floating point numbers', Fpair, F, {js:'return args[0] + args[1];'}).to;
		const Fsubtract = R.MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two floating point numbers', Fpair, F, {js:'return args[0] - args[1];'}).to;
		const Fmult = R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two floating point numbers', Fpair, F, {js:'return args[0] * args[1];'}).to;
		const FplusOne = R.MakeObject(args, '', 'CoproductObject', '', 'A floating point number or an exception', {objects:[F, one]}).to;
		const Fdiv = R.MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two floating point numbers or an exception', Fpair, FplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args[1] === 0)
		return [1, 0];
	return [0, args[0] / args[1]];
}
`			},
		}).to;
		const Fmodulus = R.MakeMorphism(args, 'modulus', 'Morphism', '%', 'The modulus of two floating point numbers or an exception', Fpair, FplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args[1] === 0)
		return [1, 0];
	return [0, args[0] % args[1]];
}
`			},
		}).to;
		const Fless = R.MakeMorphism(args, 'lessThan', 'Morphism', '&lt;', 'Is the first given floating point number less than the second', Fpair, omega, {js:'return args[0] < args[1];'}).to;
		const FlessEq = R.MakeMorphism(args, 'lessThanEq', 'Morphism', '&le;', 'Is the first floating point number less than or equal to the second', Fpair, omega, {js:'return args[0] <= args[1];'}).to;
		const Fequals = R.MakeMorphism(args, 'equals', 'Morphism', '=', 'compare two floating point numbers for equality', Fpair, omega, {js:'return args[0] === args[1];'}).to;
		const ceil = R.MakeMorphism(args, 'ceil', 'Morphism', 'ceil', 'The smallest integer greater than or equal to a given floating point number', F, Z, {js:'return Math.ceil(args);'}).to;
		const round = R.MakeMorphism(args, 'round', 'Morphism', 'round', 'The nearest integer to a given floating point number', F, Z, {js:'return Math.round(args);'}).to;
		const floor = R.MakeMorphism(args, 'floor', 'Morphism', 'floor', 'The greatest integer smaller than or equal to a given floating point number', F, Z, {js:'return Math.floor(args);'}).to;
		const truncate = R.MakeMorphism(args, 'truncate', 'Morphism', 'trunc', 'The integer portion of a floating point number', F, Z, {js:'return Math.trunc(args);'}).to;
		const log = R.MakeMorphism(args, 'log', 'Morphism', 'log', 'the natural logarithm of a given floating point number or an exception', F, FplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args <= 0.0)
		return [1, 0];
	return [0, Math.log(args)];
}
`
			},
		}).to;
		const Fpow = R.MakeMorphism(args, 'pow', 'Morphism', 'x&#x02b8;', 'raise the first number to the second number as exponent or an exception', Fpair, FplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args[0] === 0 && args[1] === 0)
		return [1, 0];
	return [0, Math.pow(args[0], args[1])];
}
`
			},
		}).to;
		const Flist = R.MakeObject(args, '', 'HomObject', '', 'A list of floating point numbers', {objects:[N, F]}).to;
		const Fmax = R.MakeMorphism(args, 'max', 'Morphism', 'max', 'The maximum floating point number of the given list', Flist, F, {js:'return Math.max(...args);'}).to;
		const Fmin = R.MakeMorphism(args, 'min', 'Morphism', 'min', 'The minimum floating point number of the given list', Flist, F, {js:'return Math.min(...args);'}).to;
		R.DiagramReferences(user, floats, args.xy);
		D.ShowDiagram(floats);
		floats.home(false);
		floats.update();
		//
		// complex numbers
		//
		const complex = new Diagram(userDiagram,
		{
			description:	'complex artihmetic functions',
			codomain:		pfs,
			basename:		'complex',
			properName:		'&Copf; Arithmetic',
			references:		[floats],
			user,
		});
		args.diagram = complex;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		complex.makeSvg(false);
		R.AddDiagram(complex);
		R.Autoplace(complex,
		{
			description:	'A complex number is a pair of floating point numbers.',
			prototype:		'DiagramText',
			user,
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const C = new NamedObject(complex, {basename:'C', properName:'&Copf;', source:Fpair});
		const C2Fpair = complex.placeMorphism(null, C.idFrom, args.xy, args.xy.add(D.default.stdArrow), false);
		args.rowCount++;
		args.xy.y += 16 * D.default.layoutGrid;
		const Cid2 = new DiagramMorphism(complex, {to:C.idTo, domain:C2Fpair.codomain, codomain:C2Fpair.domain});
//		const C = R.MakeObject(args, 'C', 'CatObject', '&Copf;', 'complex numbers').to;
		const Czero = R.MakeMorphism(args, 'zero', 'Morphism', '0.0', 'The complex number zero', one, C, {js:'return 0.0;'}).to;
		const Ce = R.MakeMorphism(args, 'e', 'Morphism', 'e', 'Euler\'s constant', one, C, {js:'return [Math.E, 0];'}).to;
		const Creal = R.MakeMorphism(args, 'real', 'Morphism', 'real', 'the real part of a complex numbers', C, F, {js:'return args[0];'}).to;
		const Cimag = R.MakeMorphism(args, 'imag', 'Morphism', 'imag', 'the imaginary part of a complex numbers', C, F, {js:'return args[1];'}).to;
//		const Cnl10 = R.MakeMorphism(args, 'pi', 'Morphism', '&pi;', 'ratio of a circle\'s circumference to its diameter', one, C, {js:'return Math.PI;'}).to;
		const F2C = R.MakeMorphism(args, 'F2C', 'Morphism', '&sub;', 'every floating point number is a complex number', F, C, {js:'return [args, 0];'}).to;
		const conjugate = R.MakeMorphism(args, 'conjugate', 'Morphism', '&dagger;', 'conjugate of a complex number', C, C, {js:'return [args[0], -args[1]];'}).to;
		const Cabs = R.MakeMorphism(args, 'abs', 'Morphism', '||', 'the absolute value of a complex number', C, F, {js:'return Math.sqrt(args[0] * args[0] + args[1] * args[1]);'}).to;
		const Cpair = R.MakeObject(args, '', 'ProductObject', '', 'A pair of complex numbers', {objects:[C, C]}).to;
		const Cadd = R.MakeMorphism(args, 'add', 'Morphism', '+', 'Addition of two complex numbers', Cpair, C, {js:'return [args[0][0] + args[1][0], args[0][1] + args[1][1]];'}).to;
		const Csubtract = R.MakeMorphism(args, 'subtract', 'Morphism', '&ndash;', 'subtraction of two complex numbers', Cpair, C, {js:'return [args[0][0] - args[1][0], args[0][1] - args[1][1]];'}).to;
		const Cmult = R.MakeMorphism(args, 'multiply', 'Morphism', '&sdot;', 'Multiplication of two complex numbers', Cpair, C,
			{js:'return [args[0][0] * args[1][0] - args[0][1] * args[1][1], args[0][0] * args[1][1] + args[0][1] * args[1][0]];'}).to;
		const CplusOne = R.MakeObject(args, '', 'CoproductObject', '', 'A complex number or an exception', {objects:[C, one]}).to;
		const Cdiv = R.MakeMorphism(args, 'divide', 'Morphism', '&div;', 'division of two complex numbers or an exception', Cpair, CplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	const x = args[1][0];
	const y = args[1][1];
	const n = x * x + y * y;
	if (n === 0.0)
		return [1, [0, 0]];		// exception
	return [0, [(args[0][0] * x + args[0][1] * y) / n, (args[0][0] * y - args[0][1] * x) / n]];
}
`			},
		}).to;
		const Cpow = R.MakeMorphism(args, 'pow', 'Morphism', 'x&#x02b8;', 'raise the first number to the second number as exponent or an exception', Cpair, CplusOne,
		{
			code:			{javascript:
`function %1(args)
{
	if (args[0] === 0 && args[1] === 0)
		return [1, 0];
	return [0, Math.pow(args[0], args[1])];
}
`
			},
		}).to;
		const Clist = R.MakeObject(args, '', 'HomObject', '', 'A list of complex numbers', {objects:[N, C]}).to;
		R.DiagramReferences(user, complex, args.xy);
		D.ShowDiagram(complex);
		complex.home(false);
		complex.update();
		//
		// Strings
		//
		const strings = new Diagram(userDiagram,
		{
			description:	'functions for strings',
			codomain:		pfs,
			basename:		'Strings',
			properName:		'Strings',
			references:		[floats],
			user,
		});
		args.diagram = strings;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		strings.makeSvg(false);
		R.AddDiagram(strings);
		R.Autoplace(strings,
		{
			description:	'Basic morphisms for strings are given here as well as\nvarious conversion functions from and to basic types',
			prototype:		'DiagramText',
			user,
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const str = R.MakeObject(args, 'str', 'CatObject', 'Str', 'the space of all strings').to;
		const strPair = R.MakeObject(args, '', 'ProductObject', '', 'A pair of strings', {objects:[str, str]}).to;
		const emptyString = new DataMorphism(strings, {domain:one, codomain:str, data:[[0, '']]});
		R.PlaceMorphism(args, emptyString);
		const strLength = R.MakeMorphism(args, 'length', 'Morphism', '#', 'length of a string', str, N, {js:'return args.length;'}).to;
		const strAppend = R.MakeMorphism(args, 'append', 'Morphism', '&bull;', 'append two strings', strPair, str, {js:'return args[0].concat(args[1]);'}).to;
		const strIncludes = R.MakeMorphism(args, 'includes', 'Morphism', 'includes', 'is the first string included in the second', strPair, omega, {js:'return args[1].includes(args[0]);'}).to;
		const strIndexOf = R.MakeMorphism(args, 'indexOf', 'Morphism', '@', 'where in the first string is the second', strPair, Z, {js:'return args[0].indexOf(args[1]);'}).to;
		const strList = R.MakeObject(args, '', 'HomObject', '', 'A list of strings', {objects:[N, str]}).to;
		const strListStr = new ProductObject(strings, {objects:[strList, str]});
		const strJoin = R.MakeMorphism(args, 'join', 'Morphism', 'join', 'join a list of strings into a single string with another string as the conjunction', strListStr, str, {js:'// TODO'}).to;
		const strN = new ProductObject(strings, {objects:[str, N]});
		const strCharAt = R.MakeMorphism(args, 'charAt', 'Morphism', '@', 'the n\'th character in the string', strN, str, {js:'return args[0].charAt(args[1]);'}).to;
		const N2str = R.MakeMorphism(args, 'N2str', 'Morphism', '&lsquo;&rsquo;', 'convert a natural number to a string', N, str, {js:'return args.toString();'}).to;
		const Z2str = R.MakeMorphism(args, 'Z2str', 'Morphism', '&lsquo;&rsquo;', 'convert an integer to a string', Z, str, {js:'return args.toString();'}).to;
		const F2str = R.MakeMorphism(args, 'F2str', 'Morphism', '&lsquo;&rsquo;', 'convert a floating point number to a string', F, str, {js:'return args.toString();'}).to;
		const str2tty = R.MakeMorphism(args, 'str2tty', 'Morphism', '&#120451;&#120451;&#120456;', 'emit the string to the TTY', str, tty,
		{
			code:			{javascript:
`
function %1(args)
{
	postMessage(['str2tty', args]);
}
`			},
		}).to;
		R.DiagramReferences(user, strings, args.xy);
		D.ShowDiagram(strings);
		strings.home(false);
		strings.update();
		//
		// htmlDiagram
		//
		const htmlDiagram = new Diagram(userDiagram,
		{
			codomain:		pfs,
			basename:		'HTML',
			properName:		'HTML',
			description:	'Basic HTML input and output',
			references:		[strings],
			user,
		});
		args.diagram = htmlDiagram;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		htmlDiagram.makeSvg(false);
		R.AddDiagram(htmlDiagram);
		R.Autoplace(htmlDiagram,
		{
			description:	'Various HTML input and output morphisms are found here',
			prototype:		'DiagramText',
			user,
			properName:		'&Omega;',
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const html = R.MakeObject(args, 'HTML', 'FiniteObject', 'HTML', 'The HTML object intereacts with web devices').to;
		const html2N = R.MakeMorphism(args, 'html2N', 'Morphism', 'input', 'read a natural number from an HTML input tag', html, N,
//			{js:`return Number.parseInt(document.getElementById(args).value);`}).to;
			{js:
`const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	return r;
`,
			}).to;
		const html2Z = R.MakeMorphism(args, 'html2Z', 'Morphism', 'input', 'read an integer from an HTML input tag', html, Z,
			{js:`return Number.parseInt(document.getElementById(args).value);`}).to;
		const html2F = R.MakeMorphism(args, 'html2F', 'Morphism', 'input', 'read a floating point number from an HTML input tag', html, F,
			{js:`return Number.parseFloat(document.getElementById(args).value);`}).to;
		const html2Str = R.MakeMorphism(args, 'html2Str', 'Morphism', 'input', 'read a string from an HTML input tag', html, str,
			{js:`return document.getElementById(args).value;`}).to;
		const html2omega = R.MakeMorphism(args, 'html2omega', 'Morphism', 'input', 'HTML input for truth values', html, two).to;
		const N_html2str = LambdaMorphism.Get(args.diagram, html2Str, [], [0]);
		R.PlaceMorphism(args, N_html2str);
		const strXN_html2str = ProductObject.Get(args.diagram, [str, N_html2str.codomain]);
		const html2line = R.MakeMorphism(args, 'html2line', 'Morphism', 'line', 'Input a line of text from HTML', html, strXN_html2str,
			{js:`return ['<input type="text" id="' + args + '" value="" placeholder="Text"/>', ${U.JsName(N_html2str)}]`}).to;
		const N_html2N = LambdaMorphism.Get(args.diagram, html2N, [], [0]);
		R.PlaceMorphism(args, N_html2N);
		const strXN_html2N = ProductObject.Get(args.diagram, [str, N_html2N.codomain]);
		const html2Nat = R.MakeMorphism(args, 'html2Nat', 'Morphism', '&Nopf;', 'Input a natural number from HTML', html, strXN_html2N,
			{js:`return ['<input type="number" min="0" id="' + args + '" placeholder="Natural number"/>', ${U.JsName(N_html2N)}];`}).to;
		const N_html2Z = LambdaMorphism.Get(args.diagram, html2Z, [], [0]);
		R.PlaceMorphism(args, N_html2Z);
		const strXN_html2Z = ProductObject.Get(args.diagram, [str, N_html2Z.codomain]);
		const html2Int = R.MakeMorphism(args, 'html2Int', 'Morphism', '&Zopf;', 'Input an integer from HTML', html, strXN_html2Z,
			{js:`return ['<input type="number" id="' + args + '" value="0" placeholder="Integer"/>', ${U.JsName(N_html2Z)}];`}).to;
		const N_html2F = LambdaMorphism.Get(args.diagram, html2F, [], [0]);
		R.PlaceMorphism(args, N_html2F);
		const strXN_html2F = ProductObject.Get(args.diagram, [str, N_html2F.codomain]);
		const html2Float = R.MakeMorphism(args, 'html2Float', 'Morphism', '&Fopf;', 'Input a floating point number from the HTML input tag', html, strXN_html2F,
			{js:`return ['<input type="number" id="' + args + '" placeholder="Float"/>', ${U.JsName(N_html2F)}];`}).to;
		R.DiagramReferences(user, htmlDiagram, args.xy);
		D.ShowDiagram(htmlDiagram);
		htmlDiagram.home(false);
		htmlDiagram.update();
		//
		// 3D diagram
		//
		const threeD = new Diagram(userDiagram,
		{
			codomain:		pfs,
			basename:		'threeD',
			properName:		'3D',
			description:	'Three dimensional object and morphisms',
			references:		[strings],
			user,
		});
		args.diagram = threeD;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		threeD.makeSvg(false);
		R.AddDiagram(threeD);
		R.Autoplace(threeD,
		{
			description:	'Various 3-D morphisms are found here',
			prototype:		'DiagramText',
			user,
		}, args.xy);
args.xy.y += 16 * D.default.layoutGrid;
		const d3 = R.MakeObject(args, 'threeD', 'FiniteObject', '3D', 'The 3D object interacts with graphic devices').to;
		const f2d3 = R.MakeMorphism(args, 'f2d3', 'Morphism', '1D', 'visualize a number in 3D', F, d3,
		{
			code:	{javascript:
`
function %1(args)
{
	postMessage(['f2d3', args]);
}
`
			},
		});
		const ff2d3 = R.MakeMorphism(args, 'ff2d3', 'Morphism', '2D', 'visualize a pair of numbers in 3D', Fpair, d3,
		{
			code:	{javascript:
`
function %1(args)
{
	postMessage(['ff2d3', args]);
}
`
			},
		});
		const Ftrip = ProductObject.Get(threeD, [F, F, F]);
		const f3 = new NamedObject(threeD, {basename:'F3', properName:'&Fopf;&sup3', source:Ftrip});
		const f3toFtrip = threeD.placeMorphism(threeD, f3.idFrom, args.xy, args.xy.add(D.default.stdArrow), false);
		args.rowCount++;
		args.xy.y += 16 * D.default.layoutGrid;
		const ftripTof3 = new DiagramMorphism(threeD, {to:f3.idTo, domain:f3toFtrip.codomain, codomain:f3toFtrip.domain});
		threeD.domain.makeHomSets();
		threeD.addSVG(ftripTof3);
		const fff2d3 = R.MakeMorphism(args, 'fff2d3', 'Morphism', '3D', 'visualize a triplet of numbers in 3D', f3, d3,
		{
			code:	{javascript:
`
function %1(args)
{
	postMessage(['fff2d3', args]);
}
`
			},
		});
		const Ftrip2 = ProductObject.Get(threeD, [f3, f3]);
		const fff2toline = R.MakeMorphism(args, 'fff2toLine', 'Morphism', 'Line', 'visualize two points as a line in 3D', Ftrip2, d3,
		{
			code:	{javascript:
`
function %1(args)
{
	postMessage(['fff2toLine', args]);
}
`
			},
		});
		const Ftrip3 = ProductObject.Get(threeD, [f3, f3, f3]);
		const AxAxAToQuadraticBezierCurve3= R.MakeMorphism(args, 'fff2toQB3', 'Morphism', '1D', 'visualize three points as a Bezier curbe in 3D', Ftrip3, d3,
		{
			code:	{javascript:
`
function %1(args)
{
	postMessage(['fff2toQB3', args]);
}
`
			},
		});
		R.DiagramReferences(user, threeD, args.xy);
		D.ShowDiagram(threeD);
		threeD.home(false);
		threeD.update();
		/*
		//
		// quantum cat
		//
		const qCat = new Category(R.$CAT,
			{
				basename:'Qu',
				user,
				properName:'&Qopf;&uopf;',
				actionDiagrams:	['tensor'],
			});
			*/
		//
		// quantum gates
		//
		const qGates = new Diagram(userDiagram,
		{
			codomain:		pfs,
			basename:		'gates',
			properName:		'Gates',
			description:	'Quantum gates',
			user,
		});
		args.diagram = qGates;
		args.rowCount = 0;
		args.xy = new D2(300, 300);
		qGates.makeSvg(false);
		R.AddDiagram(qGates);
		R.Autoplace(qGates,
		{
			description:	'Basic quantum gates are given here.',
			prototype:		'DiagramText',
			user,
		}, args.xy);
		args.xy.y += 16 * D.default.layoutGrid;
		const qubit = R.MakeObject(args, 'q', 'CatObject', '&Qopf;', 'The quantum qubit').to;
		const qPair = R.MakeObject(args, '', 'TensorObject', '', 'A pair of qubits', {objects:[qubit, qubit]}).to;
		const qId = R.MakeMorphism(args, 'id', 'Identity', 'id', 'identity', qubit, qubit,
		{
			code:	{javascript:
`
const oSqrt2 = 1/Math.SQRT2;
function matrix_multiply(m1, m2)
{
    let result = [];
    for (let i=0; i<m1.length; i++)
	{
        result[i] = [];
        for (let j=0; j<m2[0].length; j++)
		{
            let sum = 0;
            for (let k=0; k<m1[0].length; k++)
                sum += m1[i][k] * m2[k][j];
            result[i][j] = sum;
        }
    }
    return result;
}
%1_matrix = [	[[1, 0], [0, 0]],
				[[0, 0], [1, 0]]];
function %1(args)
{
	return matrix_multiply(%1_matrix, args);
}
`
			},
		});
		const basis0 = R.MakeMorphism(args, 'basis0', 'Morphism', '&VerticalBar;0&RightAngleBracket;', 'the 0 basis vector', one, qubit,
		{
			code:	{javascript:
`
function %1(args)
{
	return [1, [0, 0]];
}
`
			},
		});
		const pauliX = R.MakeMorphism(args, 'X', 'Morphism', 'X', 'Pauli-X gate', qubit, qubit,
		{
			code:	{javascript:
`
%1_matrix = [	[[0, 0],	[1, 0]],
				[[1, 0],	[0, 0]]];
function %1(args)
{
	return matrix_multiply(%1_matrix, args);
}
`
			},
		});
		const pauliY = R.MakeMorphism(args, 'Y', 'Morphism', 'Y', 'Pauli-Y gate', qubit, qubit,
		{
			code:	{javascript:
`
%1_matrix = [	[[0, 0],	[0, -1]],
				[[0, 1],	[0, 0]]];
function %1(args)
{
	return matrix_multiply(%1_matrix, args);
}
`
			},
		});
		const pauliZ = R.MakeMorphism(args, 'Z', 'Morphism', 'Z', 'Pauli-Z gate', qubit, qubit,
		{
			code:	{javascript:
`
%1_matrix = [	[[1, 0],	[0, 0]],
				[[0, 0],	[-1, 0]]];
function %1(args)
{
	return matrix_multiply(%1_matrix, args);
}
`
			},
		});
		const hademard = R.MakeMorphism(args, 'H', 'Morphism', 'H', 'hademard gate', qubit, qubit,
		{
			code:	{javascript:
`
%1_matrix = [	[[oSqrt2, 0],	[oSqrt2, 0]],
				[[oSqrt2, 0],	[-oSqrt2, 0]]];
function %1(args)
{
	return matrix_multiply(%1_matrix, args);
}
`
			},
		});
		D.ShowDiagram(qGates);
		qGates.home(false);
		qGates.update();
		//
		// wrapup
		//
		R.SetupUserHome(R.user.name);
		R.Actions.javascript.loadHTML(fn);
		D.ShowDiagram(null);
	}
	static SaveLocal(diagram, savePng = true, updateTime = true)
	{
		if (R.default.debug)
			console.log('SaveLocal', diagram.name);
		if (updateTime)
			diagram.timestamp = Date.now();
		localStorage.setItem(`${diagram.name}.json`, diagram.stringify());
		D.Svg2canvas(D.topSVG, diagram.name, function(png, pngName)
		{
			D.diagramPNG.set(diagram.name, png);
			localStorage.setItem(`${diagram.name}.png`, png);
		});
		return true;
	}
	static ReadLocal(name)
	{
		const data = localStorage.getItem(`${name}.json`);
		if (data)
		{
			const args = JSON.parse(data);
			const userDiagram = R.GetUserDiagram(args.user);
			const diagram = new Diagram(userDiagram, args);
			const png = localStorage.getItem(`${diagram.name}.png`);
			if (png)
				D.diagramPNG.set(diagram.name, png);
			// TODO eventually remove, should already be in the list
			R.AddDiagram(diagram);
			if (R.default.debug)
				console.log('ReadLocal',name,diagram);
			diagram.domain.makeHomSets();
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
							const nuCat = new Category(R.$CAT, {name:cat.name, properName:cat.properName, description:cat.description, signature:cat.signature});
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
						D.ShowToolbar(e, m);
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
		if (diagramName)
		{
			if (!params.get('f'))	// force local
				R.diagram = R.ReadLocal(diagramName);
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
		//
		// try finding the default diagram
		//
		if (!R.diagram)
			R.SelectDiagram(R.default.diagram);
		R.SetupUserHome(R.user.name);
		if (!R.diagram)
			R.SelectDiagram(R.UserHomeDiagramName(R.user.name));
		R.category = R.diagram.codomain;
		fn && fn();
		D.panels.update();
		D.navbar.update();
	}
	static SelectDiagram(name)
	{
		D.HideToolbar();
		function setup(name)
		{
			if (!R.diagram)
				R.diagram = R.$CAT.getElement(name);
			R.diagram.domain.makeHomSets();
			if (!R.diagram.svgRoot)
				R.diagram.makeSvg();
			D.SetDefaultDiagram();
			D.UpdateDiagramDisplay();
		}
		R.diagram = R.$CAT.getElement(name);
		if (!R.diagram)
			R.diagram = R.ReadLocal(name);
		if (!R.diagram && R.cloud)		// TODO possible inf loop?
			R.FetchDiagram(name, setup);
		if (R.diagram)
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
				diagram = new Diagram(userDiagram, j);
				R.SaveLocal(diagram, true, false);
			});
			if (jsons.length > 0 && fn)
				fn(dgrmName);
		});
		return diagram;
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
		let refs = [];
		diagram.references.forEach(function(r)
		{
			refs.push(typeof r === 'string' ? r : r.name);
		});
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
			if (Category.prototype.isPrototypeOf(o) && !IndexCategory.prototype.isPrototypeOf(o))
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
	static LoadEquivalence(leftLeg, rightLeg)
	{
		const leftSig = U.GetSignature('Composite', leftLeg);
		const rightSig = U.GetSignature('Composite', rightLeg);
		if (!R.sig2Leg.has(leftSig))
			R.sig2Leg.set(leftSig, leftLeg);
		if (!R.sig2Leg.has(rightSig))
			R.sig2Leg.set(rightSig, rightLeg);
		if (R.equals.has(leftSig))
		{
			const leftSigs = R.equals.get(leftSig);
			if (leftSigs.has(rightSig))
			{
				// do nothing, slready processed
			}
			else if (R.equals.has(rightSig))	// merge right sigs to the left
			{
				const rightSigs = R.equals.get(rightSig);
				rightSigs.forEach(function(sig)
				{
					leftSigs.add(sig);
					R.equals.set(sig, leftSigs);
				});
			}
			else
			{
				leftSigs.add(rightSig);
				R.equals.set(rightSig, leftSigs);
			}
		}
		else if (R.equals.has(rightSig))
		{
			const rightSigs = R.equals.get(rightSig);
			if (rightSigs.has(leftSig))
			{
				// do nothing, slready processed
			}
			else
			{
				rightSigs.add(leftSig);
				R.equals.set(leftSig, rightSigs);
			}
		}
		else
		{
			const sigs = new Set([leftSig, rightSig]);
			R.equals.set(leftSig, sigs);
			R.equals.set(rightSig, sigs);
		}
		return {leftSig, rightSig};
	}
}
Object.defineProperties(R,
{
	Cat:				{value:null,	writable:true},
	CAT:				{value:null,	writable:true},		// working nat trans
	Categories:			{value:new Map,	writable:false},	// available categories
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
	Actions:			{value:null,	writable:true},		// loaded actions
	Graph:				{value:null,	writable:true},		// loaded string graphs
	category:			{value:null,	writable:true},		// current category
	diagram:			{value:null,	writable:true},		// current diagram
	cloud:				{value:null,	writable:true},		// cloud we're using
	autosave:			{value:false,	writable:true},		// is autosave turned on for diagrams?
	catalog:			{value:{},		writable:true},
	clear:				{value:false,	writable:true},
	initialized:		{value:false,	writable:true},		// Have we finished the boot sequence and initialized properly?
	ServerDiagrams:		{value:new Map,	writable:false},
	sig2Leg:			{value:new Map,	writable:false},
//	sig2Item:			{value:new Map,	writable:false},
	equals:				{value:new Map,	writable:false},
	url:				{value:'',		writable:true},
	user:
	{
		value:
		{
			name:	'Anon',
			email:	'anon@example.com',
			status:	'unauthorized',
		},
		writable:true},	// TODO fix after bootstrap removed	writable:true,
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
					D.panels.update();
					that.getUserDiagramsFromServer(function(dgrms)
					{
						if (R.default.debug)
							console.log('registerCognito: user diagrams on server', dgrms);
					});
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
			D.navbar.update();
			D.loginPanel.update();
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
			D.navbar.update();
			D.loginPanel.update();
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
		try
		{
			const userName = U.HtmlSafe(D.loginPanel.loginUserNameElt.value);
			const password = D.loginPanel.passwordElt.value;
			const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({Username:userName, Password:password});
			const userData = {Username:userName, Pool:this.userPool};
			this.user = new AmazonCognitoIdentity.CognitoUser(userData);
			const that = this;
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
						R.SetupUserHome(R.user.name);
						D.panels.update();
						D.loginPanel.toggle();
						D.SaveDefaults();
						D.SetDefaultDiagram();
						that.getUserDiagramsFromServer(function(dgrms)
						{
							if (R.default.Debug)
								console.log('login: user diagrams on server', dgrms);
						});
						D.navbar.update();
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
			D.loginPanel.errorElt.innerHTML = x.message;
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
		D.navbar.update();
		D.panels.update();
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
			D.diagramPanel.update();
			D.diagramPanel.setToolbar(R.diagram);	// for downcloud button
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
		this.diagram = null;
		const sz = D.default.button.large;
		const left =
			H.td(H.div(D.GetButton('diagram', "D.diagramPanel.toggle()", 'Diagrams', sz))) +
			H.td(H.div(D.GetButton('category', "D.categoryPanel.toggle()", 'Categories', sz))) +
			H.td(H.div(D.GetButton('object', "D.objectPanel.toggle()", 'Objects', sz))) +
			H.td(H.div(D.GetButton('morphism', "D.morphismPanel.toggle()", 'Morphisms', sz))) +
			H.td(H.div(D.GetButton('text', "D.textPanel.toggle()", 'Text', sz))) +
			H.td(H.div(D.GetButton('string', "R.diagram.showStrings(event)", 'Graph', sz)));
		const right =
			H.td(H.div(D.GetButton('cateapsis', "D.Home()", 'Home', sz))) +
			H.td(H.div(D.GetButton('threeD', "D.threeDPanel.toggle()", '3D view', sz))) +
			H.td(H.div(D.GetButton('tty', "D.ttyPanel.toggle()", 'Console', sz))) +
			H.td(H.div(D.GetButton('help', "D.helpPanel.toggle()", 'Help', sz))) +
			H.td(H.div(D.GetButton('login', "D.loginPanel.toggle()", 'Login', sz))) +
			H.td(H.div(D.GetButton('settings', "D.settingsPanel.toggle()", 'Settings', sz))) +
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
			const title = R.diagram ? `${R.diagram.properName} ${H.span('by '+R.diagram.user, 'italic')}: ${U.Formal(R.diagram.description)}` : '';
			D.Status(e, title);
		}, true);
	}
	update()
	{
		if (R.diagram)
		{
			this.diagram = R.diagram;
			this.diagramElt.innerHTML = R.diagram ? R.diagram.properName + H.span(` by ${R.diagram.user}`, 'italic'): '';
			this.categoryElt.innerHTML = R.diagram.codomain.properName;
		}
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
	}
}

class D
{
	static Initialize()
	{
		D.ReadDefaults();
		D.navbar =			new Navbar;
		D.navbar.update();
		D.topSVG.addEventListener('mousemove', D.Mousemove, true);
		D.topSVG.addEventListener('mousedown', D.Mousedown, true);
		D.topSVG.addEventListener('mouseup', D.Mouseup, true);
		D.topSVG.addEventListener('drop', D.Drop, true);
		D.uiSVG.style.left = '0px';
		D.uiSVG.style.top = '0px';
		D.Resize();
		D.AddEventListeners();
		D.parenWidth = D.textWidth('(');
		D.commaWidth = D.textWidth(', ');
		D.bracketWidth = D.textWidth('[');
		D.diagramSVG =		document.getElementById('diagramSVG');
		D.Panel = 			Panel;
		D.panels =			new Panels;
		D.categoryPanel =	new CategoryPanel;
//		D.dataPanel =		new DataPanel;
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
		D.panels.update();
	}
	static SaveDefaults()
	{
		localStorage.setItem('defaults', JSON.stringify(R.default));
	}
	static ReadDefaults()
	{
		const defaults = JSON.parse(localStorage.getItem('defaults'));
		if (defaults)
			R.default = defaults;
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
	}
	static Mousedown(e)
	{
		D.mouseIsDown = true;
		D.mouse.save = false;
		D.mouse.down = new D2(e.clientX, e.clientY);	// screen coords
		const diagram = R.diagram;
		D.callbacks.map(f => f());
		D.callbacks = [];
		const pnt = diagram.mousePosition(e);
		if (D.mouseover)
		{
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
			const xy = diagram.mousePosition(e);
			xy.width = 2;
			xy.height = 2;
			if (D.drag && diagram.isEditable())
			{
				if (diagram.selected.length > 0)
				{
					const from = diagram.getSelected();
					D.mouseover = diagram.hasOverlap(xy, from.name);
					if (diagram.selected.length === 1)
					{
						if (e.ctrlKey && !D.dragClone)
						{
							const isolated = from.refcnt === 1;
							if (DiagramObject.prototype.isPrototypeOf(from))		// ctrl-drag identity
							{
								diagram.activate(e, 'identity');
								const id = diagram.getSelected();
								id.codomain.update(xy);
								diagram.makeSelected(e, id.codomain);	// restore from identity action
								D.dragClone = true;
							}
							else if (DiagramMorphism.prototype.isPrototypeOf(from))	// ctrl-drag morphism copy
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
									const elt = diagram.getSelected();
									if (diagram.isIsolated(elt) && diagram.isIsolated(D.mouseover) &&
											((Morphism.prototype.isPrototypeOf(D.mouseover) && Morphism.prototype.isPrototypeOf(elt)) ||
											(CatObject.prototype.isPrototypeOf(D.mouseover) && CatObject.prototype.isPrototypeOf(elt))))
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
									from.updateGlow(false);
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
				D.mouse.save = true;
				D.HideToolbar();
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
			{
				D.mouseover = diagram.hasOverlap(xy);
				D.DeleteSelectRectangle();
				if (D.mouseover && 'to' in D.mouseover)
					D.Status(e, D.mouseover.to.description);
				else if (!D.mouseover)
					D.statusbar.style.display = 'none';
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
			R.SaveLocal(R.diagram);
			D.diagramPanel.setToolbar(R.diagram);
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
								from.showSelected(false);
//								diagram.selected = [];
								diagram.deselectAll();
								a.action(e, diagram, ary);
								target.decrRefcnt();	// do not decrement earlier than this
								from.decrRefcnt();
								didSomething = true;
							}
						}
						else if (DiagramObject.prototype.isPrototypeOf(from) && DiagramObject.prototype.isPrototypeOf(target))
						{
							if(from.isFusible(target))
							{
								diagram.selected.map(s => s.updateFusible(e, false));
								diagram.deselectAll();
								const morphisms = [];
								let dragIsFirst = true;
								for (const [name, e] of diagram.domain.elements)
								{
									if (name === from.name)
										break;
									if (name === target.name)
									{
										dragIsFirst = false;
										break;
									}
								}
								for(const [name, m] of diagram.domain.elements)
								{
									if (!Morphism.prototype.isPrototypeOf(m))	// morphisms only
										continue;
									if (m.domain.name === (dragIsFirst ? target.name : from.name))
									{
										morphisms.push(m);
										if (dragIsFirst)
										{
											from.incrRefcnt();
											target.decrRefcnt();
											m.domain = from;
										}
										else
										{
											from.decrRefcnt();
											target.incrRefcnt();
											m.domain = target;
										}
									}
									if (m.codomain.name === (dragIsFirst ? target.name : from.name))
									{
										morphisms.push(m);
										if (dragIsFirst)
										{
											from.incrRefcnt();
											target.decrRefcnt();
											m.codomain = from;
										}
										else
										{
											from.decrRefcnt();
											target.incrRefcnt();
											m.codomain = target;
										}
									}
								}
								dragIsFirst ? target.decrRefcnt() : from.decrRefcnt();
								diagram.domain.makeHomSets();
								morphisms.map(m => m.update());
								diagram.update();
								didSomething = true;
							}
						}
					}
					if (!DiagramText.prototype.isPrototypeOf(from))
						from.updateGlow(false);
				}
				for (let i=0; i<diagram.selected.length; ++i)
				{
					const e = diagram.selected[i];
					if (DiagramObject.prototype.isPrototypeOf(e) || DiagramText.prototype.isPrototypeOf(e))
						e.orig = {x:e.x, y:e.y};
					if (DiagramMorphism.prototype.isPrototypeOf(e))
					{
						e.domain.orig = {x:e.domain.x, y:e.domain.y};
						e.codomain.orig = {x:e.codomain.x, y:e.codomain.y};
					}
				}
				if (diagram.isEditable() && didSomething)
					R.SaveLocal(diagram);
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
				if (Diagram.prototype.isPrototypeOf(elt))
					D.AddReference(e, name);
			}
			else
			{
				let from = null;
				let to = null;
				if (CatObject.prototype.isPrototypeOf(elt))
					diagram.placeObject(e, elt, xy);
				else if (Morphism.prototype.isPrototypeOf(elt))
					diagram.placeMorphism(e, elt, xy);
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
		D.statusbar.style.display = 'none';
		D.toolbar.classList.remove('hidden');
		const diagram = R.diagram;
		if (diagram.selected.length === 0)
		{
			D.HideToolbar();
			return;
		}
		D.help.innerHTML = '';
		let header = H.span(D.SvgHeader(D.default.button.small, '#ffffff') + D.svg['move'] + `<rect class="btn" x="0" y="0" width="320" height="320"/></svg>`, '', 'toolbar-drag-handle', 'Move toolbar');
		diagram.codomain.actions.forEach(function(a, n)
		{
			if (a.hasForm(R.diagram, diagram.selected))
				header += D.formButton(a.icon, `R.diagram.${'html' in a ? 'actionHtml' : 'activate'}(event, '${a.name}')`, a.description);
		});
		header += D.GetButton('close', 'D.HideToolbar()', 'Close');
		D.header.innerHTML = H.table(H.tr(H.td(header)), 'buttonBarLeft');
		D.Drag(D.toolbar, 'toolbar-drag-handle');
		D.toolbar.style.display = 'block';
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
			const sBbox = s.svg().getBoundingClientRect();	// TODO use getBBox()?
			bbox.left = Math.min(bbox.left, sBbox.left);
			bbox.top = Math.min(bbox.top, sBbox.top);
			bbox.width = Math.max(bbox.width, sBbox.width);
			bbox.height = Math.max(bbox.height, sBbox.height);
		});
		let xy = {x:e.clientX + D.toolbar.clientHeight, y:e.clientY - 2 * D.toolbar.clientHeight};
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
		const pnt = D.mouse.position();
		const dx = scalar * (1.0 - 1.0 / D.default.scale.base) * (pnt.x - diagram.viewport.x);
		const dy = scalar * (1.0 - 1.0 / D.default.scale.base) * (pnt.y - diagram.viewport.y);
		const s = D.default.scale.base;
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
				D.Zoom(e, Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY))));
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
			s.style.opacity = "0";
			return;
		}
		s.innerHTML = H.div(msg);
		if (typeof e === 'object')
		{
			const x = e.clientX;
			const y = e.clientY;
			s.style.left = `${x + 10}px`;
			s.style.top = `${y - 30}px`;
			s.style.display = 'block';
			D.statusXY = {x, y};
			s.classList.add('appear');
		}
		else
			D.RecordError(msg);
		if (!D.toolbar.classList.contains('hidden'))
		{
			const toolbox = D.toolbar.getBoundingClientRect();
			const statusbox = s.getBoundingClientRect();
			if (D2.Overlap(toolbox, statusbox))
				s.style.top = toolbox.top - statusbox.height + 'px';
		}
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
		if ('viewport' in R.diagram)
			R.diagram.setView(R.diagram.viewport.x, R.diagram.viewport.y, R.diagram.viewport.scale);
		else
			R.diagram.home();
		D.diagramPanel.update();
		D.objectPanel.update();
		D.morphismPanel.update();
		D.textPanel.update();
		R.diagram.makeSvg();
		D.diagramPanel.setToolbar(R.diagram);
		R.diagram.update(false);	// do not save
		R.diagram.updateMorphisms();
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
`<svg xmlns="http://www.w3.org/2000/svg" width="${v}in" height="${v}in" version="1.1" viewBox="0 0 320 320">
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
				`${drag ? 'grabbable ' : ''}sidenavRow`, '', U.Formal(m.description), drag ? `draggable="true" ondragstart="D.morphismPanel.drag(event, '${m.name}')" ${act}` : act);
		}
		return html;
	}
	static Barycenter(ary)
	{
		const elts = new Set;
		for(let i=0; i < ary.length; ++i)
		{
			const elt = ary[i];
			if ((DiagramObject.prototype.isPrototypeOf(elt) || DiagramText.prototype.isPrototypeOf(elt)) && !(elt.name in elts))
				elts.add(elt);
			else if (DiagramMorphism.prototype.isPrototypeOf(elt))
			{
				if (!elts.has(elt.domain))
					elts.add(elt.domain);
				if (!elts.has(elt.codomain))
					elts.add(elt.codomain);
			}
			else if (D2.prototype.isPrototypeOf(elt))
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
			H.td(m.properName) +
			H.td(m.domain.properName) +
			H.td('&rarr;') +
			H.td(m.codomain.properName),				// content
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
			document.onmouseup = onmouseup;
			document.onmousemove = onmousemove;
		}
	}
	static Home()
	{
		D.HideToolbar();
		R.diagram.home();
		return;
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
	static SetDefaultDiagram()
	{
		if (!R.diagram)
			throw 'no diagram';
		R.default.diagram = R.diagram.name;
		D.SaveDefaults();
	}
	static AddReference(e, name)
	{
		const diagram = R.LoadDiagram(name);
		if (diagram)
			R.diagram.addReference(name);
		else
			throw 'no reference diagram';
		D.diagramPanel.referenceSection.update();
		D.objectPanel.update();
		D.morphismPanel.update();
		R.diagram.update();
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
		D.objectPanel.update();
		D.morphismPanel.update();
		R.diagram.update();
		D.Status(e, `${diagram.properName} reference removed`);
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
}
Object.defineProperties(D,
{
	'bracketWidth':		{value: 0,			writable: true},
	'callbacks':		{value: [],			writable: true},
	'category':			{value: null,		writable: true},
	'categoryPanel':	{value: null,		writable: true},
	'commaWidth':		{value: 0,			writable: true},
//	'dataPanel':		{value: null,		writable: true},
	default:
	{
		value:
		{
			arrow:		{length:150, margin:16},
			button:		{tiny:0.4, small:0.66, large:1.0},
			composite:	'&#8797;',	// is defined as
			panel:		{width:	230},
			dragDelay:	100,	// ms
			font:		{height:24},
			fuse:
			{
				fillStyle:	'#3f3a',
				lineDash:	[],
				lineWidth:	2,
				margin:		2,
			},
			layoutGrid:	8,
			scale:		{base:1.05, limit:{min:0.05, max:20}},
			scale3D:	1,
			stdOffset:	new D2(32, 32),
			stdArrow:	new D2(200, 0),
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
	'help':				{value: document.getElementById('toolbar-help'),	writable: false},
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
			ControlKeyC(e)
			{
//				D.pasteBuffer = R.diagram.selected.map(e => e.name);
				D.pasteBuffer = R.diagram.selected.slice();
				D.pasteDiagram = R.diagram;
				D.Status(e, 'Copied to paste buffer');
			},
			ControlKeyV(e)	{	R.diagram.paste(e);	},
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
//				diagram.placeText(e, D.Grid(diagram.userToDiagramCoords(D.mouse.position())), 'Lorem ipsum cateconium');
				diagram.placeText(e, D.Grid(R.mouse.diagramPosition(diagram)), 'Lorem ipsum cateconium');
				D.textPanel.textSection.update();
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
								diagramPosition(diagram)
								{
//									return D.Grid(diagram.userToDiagramCoords(D.mouse.position()));
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
//	'upSVG':			{value: document.getElementById('upSVG'),		writable: false},
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
//`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">&gt;&rarr;&lt;</text>`,
//`<line class="arrow0" x1="60" y1="260" x2="60" y2="80" marker-end="url(#arrowhead)"/>
//<path class="arrow0" d="M180 80 A90 90 0 1 0 250 80" marker-end="url(#arrowheadWide)"/>`,
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
`<circle class="svgfil4" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
object:
`<circle cx="160" cy="160" r="160" fill="url(#radgrad1)"/>`,
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
	closeAll(side = '')
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
		return true;
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
			H.span(D.GetButton('edit', 'D.categoryPanel.Create()', 'Create new category')) + H.br() +
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
			const name = Element.Codename(R.$CAT, basename);
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
			D.navbar.update();
			this.properNameElt.innerHTML = this.category.properName;
			this.descriptionElt.innerHTML = this.category.description;
			this.userElt.innerHTML = this.category.user;
			const isEditable = this.category.isEditable();
			this.properNameEditElt.innerHTML = isEditable ?
				// TODO editElementText cannot work
				D.GetButton('edit', `D.categoryPanel.setProperName('category-properName')`, 'Retitle', D.default.button.tiny) : '';
			this.descriptionEditElt.innerHTML = isEditable ?
				D.GetButton('edit', `D.categoryPanel.setDescription()`, 'Edit description', D.default.button.tiny) : '';
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
		this.shapeGeometry = new THREE.BoxBufferGeometry(D.default.scale3D, D.default.scale3D, D.default.scale3D);
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
					H.td(D.GetButton('delete', `D.ttyPanel.out.innerHTML = ''`, 'Clear output'), 'buttonBar') +
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
	toOutput(s)
	{
		this.out.innerHTML += U.HtmlSafe(s) + '\n';
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
					H.tr(H.td(H.span('Target category', 'smallPrint') + H.select('', 'w100', 'diagram-new-codomain')), 'sidenavRow') +
			H.span(D.GetButton('edit', 'D.diagramPanel.newDiagramSection.create(event)', 'Create new diagram')) +
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
				if (Category.prototype.isPrototypeOf(e) && !IndexCategory.prototype.isPrototypeOf(e) && e.user !== 'sys')
					categories += H.option(e.properName, e.name, e.basename === 'Cat');
			this.codomainElt.innerHTML = categories;
		}
	}
	create(e)
	{
		try
		{
			const basename = U.HtmlSafe(this.basenameElt.value);
			const userDiagram = R.GetUserDiagram(R.user.name);
			if (userDiagram.getElement(basename))
				throw 'diagram already loaded';
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
			diagram.makeSvg();
			diagram.home();
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
			const diagramFn = function(diagram)
			{
				if ((Diagram.prototype.isPrototypeOf(diagram) || typeof diagram === 'object') && (D.default.internals ? true : diagram.user !== 'sys') && that.filterFn(diagram))
					rows += that.diagramRow(diagram, that.updateFn(diagram));
			};
			if ('elements' in this.diagrams)
				this.diagrams.forEachMorphism(diagramFn);
			else
				this.diagrams.forEach(diagramFn);
			this.section.innerHTML = H.table(rows);
		}
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
	diagramRow(diagram, tb = '')
	{
		const dt = new Date(diagram.timestamp);
		let src = this.getPng(diagram.name);
		if (!src && R.cloud)
			src = R.cloud.getURL(diagram.user, diagram.basename + '.png')
		let tools = tb;
		tools +=	D.DownloadButton('JSON', `R.LoadDiagram('${diagram.name}').downloadJSON(event)`, 'Download JSON') +
				D.DownloadButton('JS', `R.LoadDiagram('${diagram.name}').downloadJS(event)`, 'Download Javascript') +
				D.DownloadButton('PNG', `R.LoadDiagram('${diagram.name}').downloadPNG(event)`, 'Download PNG');
//		if (R.diagram.references.has(diagram.name) &&
//			R.diagram.user === R.user.name && 'refcnt' in diagram && R.diagram.refcnt === 1 && R.diagram.canRemoveReferenceDiagram(diagram.name))
//			R.diagram.user === R.user.name && 'refcnt' in diagram && R.diagram.canRemoveReferenceDiagram(diagram.name))
//			tools += D.GetButton('delete', `R.RemoveReference(event,'${diagram.name}')`, 'Remove reference diagram');
		const tbl = H.table(
				H.tr(H.td(H.h4(diagram.properName)) + H.td(tools, 'right')) +
				H.tr(H.td(`<a onclick="R.SelectDiagram('${diagram.name}')"><img src="${src}" id="img_${diagram.name}" alt="Not loaded" width="200" height="150"/></a>`, 'white', '', '', 'colspan="2"')) +
				H.tr(H.td(diagram.description, 'description', '', '', 'colspan="2"')) +
				H.tr(H.td(diagram.user, 'author') + H.td(dt.toLocaleString(), 'date')));
		return H.tr(H.td(tbl), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="D.DragElement(event, '${diagram.name}')"`);
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
		const deleteReferenceButton = function(diagram)
		{
			if (R.diagram.references.has(diagram.name) && R.diagram.user === R.user.name && 'refcnt' in diagram && R.diagram.canRemoveReferenceDiagram(diagram.name))
				return D.GetButton('delete', `D.RemoveReference(event,'${diagram.name}')`, 'Remove reference diagram');
			return '';
		};
		this.referenceSection = new DiagramSection('Reference Diagrams', this.elt, 'diagram-references-section', 'Diagrams referenced by this diagram', deleteReferenceButton);
		const deleteUserDiagramButton = function(diagram)
		{
			return (diagram.refcnt === 1 && diagram.user === R.user.name) ?
				D.GetButton('delete', `R.DeleteUserDiagram('${diagram.name}')`, 'Delete user diagram permanently (no undo)') : '';
		};
		const userDiagramFilter = function(diagram)
		{
			return diagram.user === R.user.name;
		};
		this.userDiagramsSection = new DiagramSection('User Diagrams', this.elt, `diagram-user-section`, 'Diagrams created by the user', deleteUserDiagramButton, userDiagramFilter);
		this.allDiagramsSection = new DiagramSection('Catalog', this.elt, `diagram-all-section`, 'Catalog of available diagrams');
		this.initialize();
		this.categoryElt = document.getElementById('diagram-category');
		this.basenamelt = document.getElementById('diagram-basename');
		this.properNameElt = document.getElementById('diagram-properName');
		this.properNameEditElt = document.getElementById('diagram-properName-edit');
		this.descriptionElt = document.getElementById('diagram-description');
		this.descriptionEditElt = document.getElementById('diagram-description-edit');
		this.userElt = document.getElementById('diagram-user');
		this.timestampElt = document.getElementById('diagram-timestamp');
		this.diagramPanelToolbarElt = document.getElementById('diagramPanelToolbar');
		this.diagram = R.diagram;
		this.user = R.user.name;
	}
	update()
	{
		if (R.diagram && (R.diagram !== this.diagram || R.user.name !== this.user))
		{
			this.diagram = R.diagram;
			this.referenceSection.setDiagrams(this.diagram.references);
			const userDiagrams = new Map;
			const addem = function(d)
			{
				if (!userDiagrams.has(d.name) && d.user === R.user.name)
					userDiagrams.set(d.name, d);
			};
			R.Diagrams.forEach(addem);
			R.ServerDiagrams.forEach(addem);
			this.userDiagramsSection.setDiagrams(userDiagrams);
			this.allDiagramsSection.setDiagrams(R.$CAT.codomain);
			D.navbar.update();
			this.categoryElt.innerHTML = this.diagram.codomain.properName;
			this.properNameElt.innerHTML = this.diagram.properName;
			this.descriptionElt.innerHTML = this.diagram.description;
			this.userElt.innerHTML = this.diagram.user;
			this.properNameEditElt.innerHTML = !this.diagram.isEditable() ? '' :
				D.GetButton('edit', `D.diagramPanel.setProperName('diagram-properName')`, 'Retitle', D.default.button.tiny);
			this.descriptionEditElt.innerHTML = !this.diagram.isEditable() ? '' :
				D.GetButton('edit', `D.diagramPanel.setDescription()`, 'Edit description', D.default.button.tiny);
			this.setToolbar(this.diagram);
			const dt = new Date(this.diagram.timestamp);
			this.timestampElt.innerHTML = dt.toLocaleString();
		}
	}
	setProperName()
	{
		const diagram = R.diagram;
		if (diagram.isEditable() && this.properNameElt.contentEditable === 'true' && this.properNameElt.textContent !== '')
		{
			diagram.properName = U.HtmlEntitySafe(this.properNameElt.innerText);
			D.navbar.update();
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
			R.diagram.description = U.HtmlEntitySafe(this.descriptionElt.textContent);
			D.navbar.update();
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
		const uploadBtn = (R.cloud && isUsers) ? H.td(D.GetButton('upload', 'R.diagram.upload(event)', 'Upload to cloud', D.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '';
		let downcloudBtn = '';
		if (R.diagram.refcnt <= 0 && R.cloud && R.ServerDiagrams.has(diagram.name))
		{
			const data = R.ServerDiagrams.get(diagram.name);
			if (diagram.timestamp !== data.timestamp)
			{
				const date = new Date(data.timestamp);
				const tip = R.ServerDiagrams.get(diagram.name).timestamp > diagram.timestamp ? `Download newer version from cloud: ${date.toLocaleString()}` : 'Download older version from cloud';
				downcloudBtn = H.td(D.GetButton('downcloud', 'R.ReloadDiagramFromServer()', tip, D.default.button.small, false, 'diagramDowncloudBtn'), 'buttonBar');
			}
		}
		const html = H.table(H.tr(
					(isUsers ? H.td(DiagramPanel.GetLockBtn(diagram), 'buttonBar', 'lockBtn') : '') +
					(isUsers ? H.td(DiagramPanel.GetEraseBtn(diagram), 'buttonBar', 'eraseBtn') : '') +
					downcloudBtn +
					uploadBtn +
					H.td(D.DownloadButton('JSON', 'R.diagram.downloadJSON(event)', 'Download JSON'), 'buttonBar') +
					H.td(D.DownloadButton('JS', 'R.diagram.downloadJS(event)', 'Download Javascript'), 'buttonBar') +
					H.td(D.DownloadButton('PNG', 'R.diagram.downloadPNG(event)', 'Download PNG'), 'buttonBar') +
					this.expandPanelBtn() +
					this.closeBtnCell()), 'buttonBarRight');
		this.diagramPanelToolbarElt.innerHTML = html;
		this.initialize();
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
		return D.GetButton(lockable, `R.diagram.${lockable}(event)`, U.Formal(lockable));
	}
	static GetEraseBtn(diagram)
	{
		return diagram.readonly ? '' : D.GetButton('delete', "R.diagram.clear(event)", 'Erase diagram!', D.default.button.small, false, 'eraseBtn');
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
		return Panel.SectionPanelDyn(diagram.properName, `${updateFnName}(R.$CAT.getElement('${diagram.name}'))`, pnlName);
	}
}

class HelpPanel extends Panel
{
	constructor()
	{
		super('help', true)
		const date = '12/17/2019 11:29:07 PM';
		this.elt.innerHTML =
			H.table(H.tr(this.closeBtnCell() + this.expandPanelBtn()), 'buttonBarLeft') +
			H.h3('Catecon') +
			H.h4('The Categorical Console')	+
			H.p(H.small('Level 1', 'smallCaps italic'), 'txtCenter') +
			H.p(H.small(`Deployed ${date}`, 'smallCaps'), 'txtCenter') + H.br() +
			H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Interactive actions', `onclick="D.Panel.SectionToggle(this, \'catActionHelpPnl\')"`) +
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
			H.button('Terms and Conditions', 'sidenavAccordion', 'TermsPnlBtn', '', `onclick="D.Panel.SectionToggle(this, \'TermsPnl\')"`) +
			H.div(	H.p('No hate.'), 'section', 'TermsPnl') +
			H.button('License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="D.Panel.SectionToggle(this, \'licensePnl\')"`) +
			H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
					H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
					H.p('Inelegant or unreferenced diagrams are removed.  See T&amp;C\'s'), 'section', 'licensePnl') +
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
	}
	update()
	{
		this.userNameElt.innerHTML = R.user.name;
		this.userEmailElt.innerHTML = R.user.email;
		this.loginInfoElt.innerHTML = '';
		this.errorElt.innerHTML = '';
		let html = '';
		if (R.user.status !== 'logged-in' && R.user.status !== 'registered')
			html += H.table(	H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'login-user-name', 'text', {ph:'Name'}))) +
								H.tr(H.td('Password')) +
								H.tr(H.td(H.input('', '', 'login-password', 'password', {ph:'********', x:'onkeydown="D.OnEnter(event, R.cloud.login, R.cloud)"'}))) +
								H.tr(H.td(H.button('Login', '', '', '', 'onclick="R.cloud.login()"'))));
		if (R.user.status === 'unauthorized')
			html += H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="D.Panel.SectionToggle(this, \'signupPnl\')"`) +
					H.div( H.table(H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
								H.tr(H.td('Email')) +
								H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
								LoginPanel.PasswordForm() +
								H.tr(H.td(H.button('Sign up', '', '', '', 'onclick="R.cloud.signup()"')))), 'section', 'signupPnl');
		if (R.user.status === 'registered')
			html += H.h3('Confirmation Code') +
					H.span('The confirmation code is sent by email to the specified address above.') +
					H.table(	H.tr(H.td('Confirmation code')) +
								H.tr(H.td(H.input('', '', 'confirmationCode', 'text', {ph:'six digit code', x:'onkeydown="D.OnEnter(event, R.cloud.confirm, R.cloud)"'}))) +
								H.tr(H.td(H.button('Submit Confirmation Code', '', '', '', 'onclick=R.cloud.confirm()'))));
		if (R.user.status === 'logged-in')
			html += H.button('Log Out', '', '', '', 'onclick="R.cloud.logout()"');
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
				H.tr(H.td(H.button('Reset password', '', '', '', 'onclick=R.cloud.resetPassword()'))));
	}
	static PasswordForm(sfx = '')
	{
		return H.tr(H.td('Categorical Access Key')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupSecret`, 'text', {ph:'????????'}))) +
				H.tr(H.td('Password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPassword`, 'password', {ph:'Password'}))) +
				H.tr(H.td('Confirm password')) +
				H.tr(H.td(H.input('', '', `${sfx}SignupUserPasswordConfirm`, 'password', {ph:'Confirm'})));
	}
}

class ElementSection extends Section
{
	constructor(title, parent, id, tip, doObjects, isCurrentDiagram = false)
	{
		super(title, parent, id, tip);
		this.elements = null;
		this.isCurrentDiagram = isCurrentDiagram;
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
						rows += H.tr(H.th(e.diagram.properName, '', '', '', `colspan="${columns}"`));
					}
					if (this.doObjects)
					{
						if (!CatObject.prototype.isPrototypeOf(e))
							continue;
						const deletable = R.default.internals && e.refcnt === 0 && e.diagram && e.diagram.isEditable();
						rows += H.tr( (R.default.internals ?  H.td(e.refcnt.toString()) : '') + H.td(e.properName),
							'grabbable sidenavRow', '', U.Formal(e.description), `draggable="true" ondragstart="D.DragElement(event, '${e.name}')"`);
					}
					else
					{
						if (!Morphism.prototype.isPrototypeOf(e))
							continue;
						rows += H.tr(H.td(H.table(
							H.tr(	H.td(e.properName, 'center', '', '', `colspan="${columns}"`))+
							H.tr(	(R.default.internals ? H.td(e.refcnt) : '') +
										H.td(e.domain.properName, 'left') +
										H.td('&rarr;', 'w10 center') +
										H.td(e.codomain.properName, 'right')), 'panelElt')), 'grabbable', '', U.Formal(e.description), `draggable="true" ondragstart="D.DragElement(event, '${e.name}')"`);
					}
				}
				this.section.innerHTML += H.table(rows);
			}
		}
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
										{ph: 'Description', x:'onkeydown="D.OnEnter(event, D.objectPanel.newObjectSection.create, D.objectPanel.newObjectSection)"'})), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', 'D.objectPanel.newObjectSection.create(event)', 'Create new object in this diagram')) +
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
			if (!diagram.isEditable())
				throw 'diagram is read only';
			const basename = U.HtmlSafe(this.basenameElt.value);
			const name = Element.Codename(diagram, basename);
			if (diagram.getElement(name))
				throw 'name already exists';
			const to = new CatObject(diagram,
			{
				basename,
				category:		diagram.codomain,
				properName:		U.HtmlEntitySafe(this.properNameElt.value),
				description:	U.HtmlEntitySafe(this.descriptionElt.value),
			});
			diagram.placeObject(e, to);
			D.ShowToolbar(e, D.Center(R.diagram));
			D.morphismPanel.newMorphismSection.update();
			this.update();
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
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
		this.diagramObjectSection = new ElementSection('Diagram', this.elt, `object-diagram-section`, 'Objects in the current diagram', true);
		this.referenceObjectSection = new ElementSection('References', this.elt, `object-references-section`, 'Objects in the reference diagrams', true);
		this.refDiv = document.createElement('div');
		this.elt.appendChild(this.refDiv);
//		this.categoryObjectSection = new ElementSection('Category', this.elt, `object-category-section`, 'Objects in the current category', true);
		this.initialize();
		this.diagram = null;
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
//			this.categoryObjectSection.setElements(allObjects);
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
						H.tr(H.td(H.select('', 'w100', 'morphism-new-domain')), 'sidenavRow') +
						H.tr(H.td(H.select('', 'w100', 'morphism-new-codomain')), 'sidenavRow')
			) +
			H.span(D.GetButton('edit', 'D.morphismPanel.newMorphismSection.create(event)', 'Create new morphism in this diagram')) +
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
		if (R.diagram && super.update())
		{
			this.error.innerHTML = '';
			this.basenameElt.value = '';
			this.properNameElt.value = '';
			this.descriptionElt.value = '';
			this.domainElt.value = '';
			this.codomainElt.value = '';
			this.error.style.padding = '0px';
//			let objects = '';
//			for (const [name, o] of R.category.elements)
//				objects += CatObject.prototype.isPrototypeOf(o) ? H.option(o.properName, o.name) : '';
			const objects = R.diagram.getObjects();
			const options = objects.map(o => H.option(o.properName, o.name)).join('');
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
			const name = Element.Codename(diagram, basename);
			if (diagram.getElement(name))
				throw 'Morphism already exists';
			const to = new Morphism(diagram,
			{
				basename,
				category:		diagram.codomain,
				properName:		U.HtmlEntitySafe(this.properNameElt.value),
				description:	U.HtmlEntitySafe(this.descriptionElt.value),
				domain:			diagram.codomain.getElement(this.domainElt.value),
				codomain:		diagram.codomain.getElement(this.codomainElt.value),
			});
			diagram.placeMorphism(e, to);
			D.ShowToolbar(e, D.Center(R.diagram));
			this.update();
		}
		catch(e)
		{
			this.error.style.padding = '4px';
			this.error.innerHTML = 'Error: ' + U.GetError(e);
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
		this.diagramMorphismSection = new ElementSection('Diagram', this.elt, `morphism-diagram-section`, 'Morphisms in the current diagram', false, true);
		this.referenceMorphismSection = new ElementSection('References', this.elt, `morphism-references-section`, 'Morphisms in the reference diagrams', false, true);
		this.refDiv = document.createElement('div');
		this.elt.appendChild(this.refDiv);
//		this.categoryMorphismSection = new ElementSection('Category', this.elt, `morphism-category-section`, 'Morphisms in the current category', false);
		this.initialize();
		this.diagram = null;
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
//			this.categoryMorphismSection.setElements(allMorphisms);
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
				H.tr(H.td(`<input type="checkbox" ${D.gridding ? 'checked' : ''} onchange="D.gridding = !D.gridding;D.SaveDefaults()">`) + H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${R.default.internals ? 'checked' : ''} onchange="D.SettingsPanel.ToggleShowInternals();D.SaveDefaults()">`) +
						H.td('Show internal info', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${R.default.debug ? 'checked' : ''} onchange="R.default.debug = !R.default.debug;D.SaveDefaults()">`) +
						H.td('Debug', 'left'), 'sidenavRow')
			);
		this.initialize();
	}
	static ToggleShowInternals()
	{
		R.default.internals = !R.default.internals;
		const diagram = R.diagram;
		if (diagram)
		{
			D.objectPanel.update();
			D.morphismPanel.update();
		}
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
				H.span(D.GetButton('edit', 'D.textPanel.newTextSection.create(event)', 'Create new text for this diagram')) +
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
			diagram.placeText(e, D.Center(R.diagram), U.HtmlSafe(this.descriptionElt.value));
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
	}
	update()
	{
		const diagram = R.diagram;
		if (!diagram)
			return;
		let rows = '';
		diagram.texts.forEach(function(t)
		{
			rows += H.tr(
						H.td(H.table(H.tr(
							(diagram.isEditable() ? H.td(D.GetButton('delete', `D.textPanel.delete('${t.name}')`, 'Delete text')) +
													H.td(D.GetButton('edit', `R.diagram.getElement('${t.name}').editText(event, 'edit_${t.name}')`, 'Edit')) : '')), 'buttonBarLeft'))) +
					H.tr(H.td(H.span(t.description, 'tty', `edit_${t.name}`, '', `onclick="R.diagram.viewElement('${t.name}')"`), 'left'), 'sidenavRow');
		});
		this.section.innerHTML = rows === '' ?  '' : H.table(rows);
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
	delete(name)
	{
		const diagram = R.diagram;
		if (diagram && diagram.texts.has(name))
		{
			const t = diagram.texts.get(name);
			diagram.removeSelected(t);
			t.decrRefcnt();
			this.textSection.update();
			diagram.update();
		}
		event.stopPropagation();
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
				name = Element.Codename(diagram, basename);
		}
		else if (U.basenameEx.test(name))
			basename = name;
		if ('category' in args)
			Object.defineProperty(this, 'category', {value: R.GetCategory(args.category),	writable: false});
		else
			Object.defineProperty(this, 'category', {value:diagram.codomain,	writable: false});
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,										writable: true},	// is true for bootstrapping
			basename:		{value: basename,										writable: false},
			name:			{value: name,											writable: false},
			properName:		{value: 'properName' in args ? args.properName : 'basename' in args ? args.basename : name,	writable: true},
			description:	{value: 'description' in args ? args.description : '',	writable: true},
			readonly:		{value: 'readonly' in args ? args.readonly : false,		writable: true},
			refcnt:			{value: 0,												writable: true},
			user:			{value: 'user' in args ? args.user : R.user.name,		writable: false},
		});
		this.signature = this.getElementSignature();
	}
	editText(e, id, attr)
	{
		const from = this;
		R.diagram.editElementText(e, id, attr);
		e.stopPropagation();
	}
	help()
	{
		let descBtn = '';
		let pNameBtn = '';
		if (this.isEditable() && this.diagram.isEditable())
		{
			descBtn = D.GetButton('edit', `R.diagram.getElement('${this.name}').editText(event, '${this.elementId()}-description', 'description')`, 'Edit', D.default.button.tiny);
			pNameBtn = this.canChangeProperName() ? D.GetButton('edit', `R.diagram.getElement('${this.name}').editText(event, '${this.elementId()}-properName', 'properName')`, 'Edit', D.default.button.tiny) : '';
		}
		const html =	H.h4(H.span(this.properName, '', `${this.elementId()}-properName`) + pNameBtn) +
						H.p(H.span(this.description, '', `${this.elementId()}-description`) + descBtn) +
						(R.default.internals ? H.p(`Internal name: ${this.name}`) : '') +
						(R.default.internals ? ('basename' in this ? H.p(H.span(D.limit(this.basename))) : '') : '') +
						(R.default.internals ?  H.p(`Reference count: ${this.refcnt}`) : '') +
						(R.default.internals ? H.p(`Prototype: ${this.constructor.name}`) : '') +
						H.p(`User: ${this.user}`);
		return html;
	}
	isEditable()
	{
		return (R.diagram.name === this.diagram.name || R.diagram.name === this.name) && !this.readonly && this.user === R.user.name;
	}
	isIterable()
	{
		return false;		// fitb
	}
	getElementSignature()
	{
		return U.sha256(this.name);
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
		if ('signature' in this)	// not for index cats
			a.signature =	this.signature;
		if ('basename' in this)
			a.basename =	this.basename;
		if ('name' in this)
			a.name =	this.name;
		a.prototype =	this.constructor.name;
		a.properName =	this.properName;
		a.readonly =	this.readonly;
		if ('category' in this && this.category)
			a.category = this.category.name;
		a.user = this.user;
		if ('diagram' in this && this.diagram)
			a.diagram =	this.diagram.name;
		return a;
	}
	info()
	{
		const a =
		{
			basename:	this.basename,
			name:		this.name,
			prototype:	this.prototype,
			readonly:	this.readonly,
			user:		this.user,
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
		return JSON.stringify(this.json());
	}
	isEquivalent(elt)
	{
		return elt ? this.signature === elt.signature : false;
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
	svg(sfx = '')
	{
		return document.getElementById(this.elementId() + (sfx !== '' ? sfx : ''));
	}
	removeSVG()
	{
		const svg = this.svg();
		if (svg)
			svg.parentNode.removeChild(svg);
	}
	elementId()
	{
		return `el_${this.name}`;
	}
	usesDiagram(diagram)
	{
		return this.diagram && this.diagram.name === diagram.name;
	}
	updateGlow(on, glow)
	{
		const e = this.svg();
		e && e.classList.remove(...['glow', 'badGlow']);
		if (on)
			e.classList.add(...[glow]);
		else
			e && e.classList.remove(...['glow', 'badGlow']);
	}
	canSave()
	{
		return true;
	}
	static Codename(diagram, basename)
	{
		return diagram ? `${diagram.name}/${basename}` : basename;
	}
	static Process(diagram, args)
	{
		return new R.protos[args.prototype](diagram, args);
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
				return `<path data-link="${lnkStr} ${idxStr}" class="string" style="stroke:#${color}AA" id="${linkId}" d="${d}" filter="url(#softGlow)" onmouseover="D.Status(event, '${fs}')"/>\n`;
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
			this.category.addElement(this);
		else if (diagram)
			diagram.codomain.addElement(this);
		this.signature = this.getObjectSignature();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + (this.category ? H.p(`Category: ${this.category.properName}`) : 'Object');
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
		return new Graph(this.constructor.name, position, width);
	}
	getObjectSignature()
	{
		return U.sha256(`${this.constructor.name} ${this.name}`);
	}
	static Get(diagram, basename)
	{
		const object = diagram.getElement(Element.Codename(diagram, basename));
		return object ? object : new CatObject(diagram, {basename});
	}
}

class FiniteObject extends CatObject	// finite, explicit size or not
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
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
		nuArgs.name = FiniteObject.Codename(diagram, nuArgs.basename, 'size' in nuArgs ? nuArgs.size : '');
		super(diagram, nuArgs);
		if ('size' in nuArgs && nuArgs.size !== '')
			Object.defineProperty(this, 'size', {value:	nuArgs.size, writable:	false});
		if ('size' in this)		// signature is the sig of the coproduct of 1's/Show
			this.signature = this.size > 0 ? U.GetSignature('CoproductObject', Array(this.size).fill(1)) : 0;
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
			d.size = this.size;
			delete d.properName;
		}
		return d;
	}
	isIterable()
	{
		return true;
	}
	static Basename(basename, size)
	{
		return basename === '' ? (size === '' ? basename : `${basename}#${Number.parseInt(size)}`) : basename;
	}
	static Codename(diagram, basename, size)
	{
		return Element.Codename(diagram, FiniteObject.Basename(basename, size));
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
	static Get(diagram, basename, size)
	{
		const object = diagram.getElement(FiniteObject.Codename(diagram, basename, size));
		return object ? object : new FiniteObject(diagram, {basename, size});
	}
}

class InitialObject extends FiniteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.size = 0;
		if (!('description' in nuArgs))
			nuArgs.description = 'the initial object in this category';
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Initial object');
	}
	static Get(diagram)
	{
		const args = {category:diagram.codomain, size:0};
		const object = diagram.getElement(FiniteObject.Codename(diagram, '', 0));
		return object ? object : new InitialObject(diagram, args);
	}
}

class TerminalObject extends FiniteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.size = 1;
		if (!('description' in nuArgs))
			nuArgs.description = 'the terminal object in this category';
		super(diagram, nuArgs);
		this[Symbol.iterator] = function*()
		{
			yield 0;
		}
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Terminal object');
	}
	static Get(diagram)
	{
		const args = {category:diagram.codomain, size:1};
		const object = diagram.getElement(FiniteObject.Codename(diagram, '', 1));
		return object ? object : new TerminalObject(diagram, args);
	}
}

// TODO remove and place in diagram?
// TODO turn into named identity
class SubobjectClassifier extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = SubobjectClassifer.Codename(diagram);
		nuArgs.basename = 'Omega';
		nuArgs.properName = '&Omega;';
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Subobject classifier');
	}
	static Codename(diagram)
	{
		return Element.Codename(diagram, '#Omega');
	}
	static Get(diagram)
	{
		const object = diagram.getElement(SubobjectClassifier.Codename(diagram, 'Omega'));
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
		Object.defineProperty(this, 'objects', {value:	nuArgs.objects.map(o => this.diagram.getElement(o)), writable:	false});
		this.objects.map(o => o.incrRefcnt());
		this.seperatorWidth = D.textWidth(', ');	// runtime; don't save; TODO remove
		this.signature = U.GetSignature(this.constructor.name, this.objects);
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
					return ProductObject.Get(this.diagram, []);
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
		return `<tspan>${f.properName}</tspan>${U.subscript(indices)}`;
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
	canChangeProperName()
	{
		return false;
	}
	static ProperName(sep, objects, reverse = false)
	{
		const obs = reverse ? objects.slice().reverse() : objects;
		return obs.map(o => o.needsParens() ? `(${o.properName})` : o.properName).join(sep);
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
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = ProductObject.Basename(diagram, nuArgs.objects);
		nuArgs.properName = ProductObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		this.seperatorWidth = D.textWidth('&times;');	// in pixels
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Product'), helped);
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return this.objects.map(o => o.FromInput(false, uid));
	}
	getFactor(factor)
	{
		if (factor === -1)
			return TerminalObject.Get(this.diagram);
		return super.getFactor(factor);
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.textWidth('('), D.textWidth('&times;'), first);
	}
	static Basename(diagram, objects)
	{
		return `Po{${objects.map(o => o.name).join(',')}}oP`;
	}
	static Codename(diagram, objects)
	{
		if (!objects || objects.length === 0)
			return '#1';
		if (objects.length === 1)
			return typeof objects[0] === 'object' ? objects[0].name : objects[0];
		return Element.Codename(diagram, ProductObject.Basename(diagram, objects));
	}
	static Get(diagram, objects)
	{
		if (!objects || objects.length === 0)
			return TerminalObject.Get(diagram);
		if (objects.length === 1)
			return objects[0];	// do not make a product wrapper of length 1
		else if (objects.length === 0)
			return TerminalObject.Get(diagram);
		const name = ProductObject.Codename(diagram, objects);
		const object = diagram.getElement(name);		// no products in the diagram domain cats
		return object ? object : new ProductObject(diagram, {objects});
	}
	static ProperName(objects)
	{
		return MultiObject.ProperName('&times;', objects);
	}
	static CanFlatten(obj)
	{
		return ProductObject.prototype.isPrototypeOf(obj) && obj.objects.reduce((r, o) => r || ProductObject.prototype.isPrototypeOf(o), false);
	}
}

class PullbackObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.source = 'morphisms' in args ? diagram.getElements(args.morphisms) : diagram.getElements(args.source);
		nuArgs.basename = PullbackObject.Basename(diagram, nuArgs.source);
		nuArgs.properName = PullbackObject.ProperName(nuArgs.source);
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
				const pbm = PullbackMorphism.Get(diagram, this, i);
//				pbm.incrRefcnt();
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
//			this.cone.map(m => m.decrRefcnt());
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
	static Basename(diagram, morphisms)
	{
		return `Pb{${morphisms.map(m => m.name).join(',')}}bP`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, PullbackObject.Basename(diagram, morphisms));
	}
	static Get(diagram, morphisms)
	{
		const name = PullbackObject.Codename(diagram, morphisms);
		const object = diagram.getElement(name);
		return object ? object : new PullbackObject(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return morphisms.map(m => m.domain.needsParens() ? `(${m.domain.properName})` : m.domain.properName).join('&times;') + '/' + morphisms[0].codomain.properName;
	}
}

class Sequence extends ProductObject
{
	constructor(diagram, args)
	{
		super(diagram, args);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Sequence'));
	}
	resetPosition()
	{
		return true;
	}
	static Basename(diagram, objects)
	{
		return `So{${objects.map(o => o.name).join(',')}}oS`;
	}
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, Sequence.Basename(diagram, objects));
	}
	static Get(diagram, objects)
	{
		const name = Sequence.Codename(diagram, objects);
		const object = diagram.getElement(name);
		return object ? object : new Sequence(diagram, {objects});
	}
}

class CoproductObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = CoproductObject.Basename(diagram, nuArgs.objects);
		nuArgs.properName = CoproductObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		this.seperatorWidth = D.textWidth('&times;');	// runtime, don't save TODO remove
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Coproduct'), helped);
	}
	getFactor(factor)
	{
		if (factor.length === 1 && factor[0] === -1)
			return InitialObject.Get(diagram);
		return super.getFactor(factor);
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.parenWidth, D.textWidth('&plus;'), first);
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return {};	// TODO
	}
	static Basename(diagram, objects)
	{
		return `Co{${objects.map(o => o.name).join(',')}}oC`;
	}
	static Codename(diagram, objects)
	{
		return objects.length > 0 ? Element.Codename(diagram, CoproductObject.Basename(diagram, objects)) : '#0';
	}
	static Get(diagram, objects)
	{
		const name = CoproductObject.Codename(diagram, objects);
		const object = diagram.getElement(name);
		return object ? object : new CoproductObject(diagram, {objects});
	}
	static ProperName(objects)
	{
		return MultiObject.ProperName('&plus;', objects);
	}
	static CanFlatten(obj)
	{
		return CoproductObject.prototype.isPrototypeOf(obj) && obj.objects.reduce((r, o) => r || CoproductObject.prototype.isPrototypeOf(o), false);
	}
	getFoldInfo()
	{
		const objects = new Map;
		this.objects.map(o =>
		{
			if (objects.has(o))
				objects.set(o, objects.get(o) + 1);
			else
				objects.set(o, 1);
		});
		return objects;
	}
	static CanFold(obj)
	{
		if (CoproductObject.prototype.isPrototypeOf(obj))
		{
			const objects = obj.getFoldInfo();
			const throwMe = {};
			try
			{
				objects.forEach(function(cnt, o)
				{
					if (cnt > 1)
						throw throwMe;
				});
			}
			catch(x)
			{
				if (x === throwMe)
					return true;
			}
		}
		return false;
	}
}

class HomObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = HomObject.Basename(diagram, nuArgs.objects);
		nuArgs.properName = HomObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
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
	minimalHomDom()
	{
		let obj = this.objects[1];
		while (HomObject.prototype.isPrototypeOf(obj))
			obj = obj.homDomain();
		return obj;
	}
	static Basename(diagram, objects)
	{
		return `Ho{${objects.map(o => o.name).join(',')}}oH`;
	}
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, HomObject.Basename(diagram, objects));
	}
	static Get(diagram, objects)
	{
		const name = HomObject.Codename(diagram, objects);
		const object = diagram.getElement(name);
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

class DiagramCore
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
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
		diagram.texts.set(this.name, this);
	}
	incrRefcnt()
	{
		this.refcnt++;
	}
	decrRefcnt()
	{
		this.refcnt--;
		if (this.refcnt <= 0)
		{
			const svg = this.svg();
			if (svg !== null)
			{
				if ('innerHTML' in svg)
					svg.innerHTML = '';
				svg.parentNode.removeChild(svg);
			}
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
			prototype:	this.constructor.name,
		};
		return a;
	}
	showSelected(state = true)
	{
		this.svg().classList[state ? 'add' : 'remove']('selected');
	}
	elementId()
	{
		return `${this.constructor.name}_${this.name}`;
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
	update(xy = null)
	{
		this.setXY(xy ? xy : this.getXY());
		const svg = this.svg();
		if (svg && svg.hasAttribute('x'))
		{
			svg.setAttribute('x', this.x);
			svg.setAttribute('y', this.y);
		}
	}
	isFusible()	// fitb
	{
		return false;
	}
	updateFusible(e)	// fitb
	{}
	updateGlow(on, glow)	// same as Element
	{
		const svg = this.svg();
		svg && svg.classList.remove(...['glow', 'badGlow']);
		if (on)
			svg.classList.add(...[glow]);
		else
			svg && svg.classList.remove(...['glow', 'badGlow']);
	}
}

class DiagramText extends DiagramCore
{
	constructor(diagram, args)
	{
		super(diagram, args);
		diagram.texts.set(this.name, this);
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
			this.diagram.texts.delete(this.name);
	}
	editText(e, id)
	{
		const svg = document.getElementById(this.elementId());
		const from = this;
		R.diagram.editElementText(e, id, 'description', function()
		{
			R.diagram.updateElementAttribute(from, 'description', document.getElementById(id).innerText);
			svg.innerHTML = U.Lines2tspan(from);
		});
		e.stopPropagation();
	}
	elementId()
	{
		return `dt_${this.name}`;
	}
	getSVG()
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `nan in getSVG`;
		let html = '';
		if (this.description.indexOf('\n') > -1)		// multi-line svg
		{
			let lines = U.Lines2tspan(this);
			html =
`<text id="${this.elementId()}" data-type="text" data-name="${this.name}" x="${this.x}" y="${this.y}" text-anchor="left" class="diagramText grabbable"
	onmousedown="R.diagram.pickElement(event, '${this.name}')"> ${lines}</text>`;
		}
		else
			html =
`<text data-type="text" data-name="${this.name}" text-anchor="left" class="diagramText grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y}"
onmousedown="R.diagram.pickElement(event, '${this.name}')">${this.description}</text>`;
		return html;
	}
	update(xy = null)
	{
		super.update(xy);
		const svg = this.svg();
		const x = this.x;
		const tspans = svg.querySelectorAll('tspan')
		tspans.forEach(function(t)
		{
			t.setAttribute('x', x);
		});
	}
}

class TensorObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.basename = TensorObject.Basename(diagram, nuArgs.objects);
		nuArgs.properName = TensorObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
		this.seperatorWidth = D.textWidth('&otimes');	// in pixels
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Tensor'), helped);
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return this.objects.map(o => o.FromInput(false, uid));
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.textWidth('('), D.textWidth('&times;'), first);
	}
	static Basename(diagram, objects)
	{
		return `Po{${objects.map(o => o.name).join(',')}}oP`;
	}
	static Codename(diagram, objects)
	{
		if (!objects || objects.length === 0)
			return 'I';
		if (objects.length === 1)
			return typeof objects[0] === 'object' ? objects[0].name : objects[0];
		return Element.Codename(diagram, TensorObject.Basename(diagram, objects));
	}
	static Get(diagram, objects)
	{
		if (!objects || objects.length === 0)
			return TerminalObject.Get(diagram);
		if (objects.length === 1)
			return objects[0];	// do not make a product wrapper of length 1
		const name = TensorObject.Codename(diagram, objects);
		const object = diagram.getElement(name);		// no products in the diagram domain cats
		return object ? object : new TensorObject(diagram, {objects});
	}
	static ProperName(objects)
	{
		return MultiObject.ProperName('&otimes;', objects);
	}
	static CanFlatten(obj)
	{
		return TensorObject.prototype.isPrototypeOf(obj) && obj.objects.reduce((r, o) => r || TensorObject.prototype.isPrototypeOf(o), false);
	}
}

class DiagramObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
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
			category:	{value:	diagram.domain,										writable:	false},
			x:			{value:	xy.x,												writable:	true},
			y:			{value:	xy.y,												writable:	true},
			width:		{value:	U.GetArg(nuArgs, 'width', 0),						writable:	true},
			height:		{value:	U.GetArg(nuArgs, 'height', D.default.font.height),	writable:	true},
			to:			{value:	null,												writable:	true},
			decorations:{value:	new Set,											writable:	false},
		});
		this.setObject(nuArgs.to);
		delete this.signature;
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
		if (this.to)
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
	getSVG()
	{
if (!this.y)this.y = 0;
		if (isNaN(this.x) || isNaN(this.y))
			throw `nan in getSVG`;
		return `<text data-type="object" data-name="${this.name}" text-anchor="middle" class="object grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + D.default.font.height/2}"
			onmousedown="R.diagram.pickElement(event, '${this.name}')">${this.to.properName}</text>`;
	}
	getBBox()
	{
		return {x:this.x - this.width/2, y:this.y + this.height/2 - D.default.font.height, width:this.width, height:this.height};
	}
	update(xy = null)
	{
		xy && this.setXY(xy);
		const svg = this.svg();
		if (svg && svg.hasAttribute('x'))
		{
			svg.setAttribute('x', this.x);
			svg.setAttribute('y', this.y + ('height' in this ? this.height/2 : 0));
		}
		this.decorations.forEach(function(d){d.update();});
	}
	showSelected(state = true)
	{
		this.svg().classList[state ? 'add' : 'remove']('selected');
	}
	isFusible(m)
	{
		return m && m.to && this.to.signature === m.to.signature;
	}
	updateFusible(e, on)
	{
		const s = this.svg();
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
		this.getObjects().map(o => o !== this && o.decorations.add(this));
		if ('cone' in args)
			this.cone = args.cone;
		else
			this.cone = this.source.map((m, index) =>
			{
				const to = PullbackMorphism.Get(diagram, this.to, index);
				const from = new DiagramMorphism(diagram, {to, anon:'pb_', domain:this, codomain:this.source[index].domain});
//				from.incrRefcnt();
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
	getPullbackPosition()	// for the pullback symbol
	{
		return D.Barycenter(this.getObjects());
	}
	getSVG()
	{
		let svg = super.getSVG();
		const xy = this.getPullbackPosition();
		svg +=
`<text data-type="object" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_pb'}" x="${xy.x}" y="${xy.y}" onmousedown="R.diagram.pickElement(event, '${this.name}')">&#8991;</text>`;
		return svg;
	}
	removeSVG()
	{
		super.removeSVG();
		const svg = this.svg('_pb');
		if (svg)
			svg.parentNode.removeChild(svg);
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
		{
			this.removeSVG();
			this.getObjects().map(o => o.decorations.delete(this));
			this.source.map(m => m.decrRefcnt());
//			this.cone.map(m => m && m.decrRefcnt());
		}
		super.decrRefcnt();
	}
	update(xy)
	{
		super.update(xy);
		const pbxy = this.getPullbackPosition();
		const svg = this.svg('_pb');
		svg.setAttribute('x', pbxy.x);
		svg.setAttribute('y', pbxy.y);
	}
}

class DiagramAssertion extends DiagramCore
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		const leg0 = nuArgs.leg0.map(m => diagram.getElement(m));
		const leg1 = nuArgs.leg1.map(m => diagram.getElement(m));
		const toLeg0 = leg0.length === 1 ? leg0[0].to : Composite.Get(diagram, leg0.map(m => m.to));
		const toLeg1 = leg1.length === 1 ? leg1[0].to : Composite.Get(diagram, leg1.map(m => m.to));
		const assert = [toLeg0, toLeg1];
		const key = DiagramAssertion.GetKey(assert);
		if (diagram.assertions.has(key))
			throw 'assertion already exists';
		super(diagram, nuArgs);
		leg0.map(m => m.incrRefcnt());
		leg1.map(m => m.incrRefcnt());
		toLeg0.incrRefcnt();
		toLeg1.incrRefcnt();
		if (!('description' in nuArgs))
			this.description = `The assertion that the morphism ${toLeg0.properName} is equal to ${toLeg1.properName}.`;
		Object.defineProperties(this,
		{
			leg0:			{value: leg0, writable: false},
			leg1:			{value: leg1, writable: false},
			assert:			{value: assert, writable: false},
		});
		diagram.assertions.set(key, this);
		const objs = this.getObjects();
		objs.map(o => o.decorations.add(this));
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		if (this.refcnt <= 0)
		{
			const objs = this.getObjects();
			objs.map(o => o.decorations.delete(this));
			this.leg0.map(m => m.decrRefcnt());
			this.leg1.map(m => m.decrRefcnt());
			this.diagram.assertions.delete(DiagramAssertion.GetKey(this.assert));
			this.assert[0].decrRefcnt();
			this.assert[1].decrRefcnt();
		}
	}
	json()
	{
		const a = super.json();
		a.leg0 = this.leg0.map(m => m.name);
		a.leg1 = this.leg1.map(m => m.name);
		a.assert = [this.assert[0].name, this.assert[1].name];
		return a;
	}
	getObjects()
	{
		const objs = new Set;
		const findObjs = function(m)
		{
			objs.add(m.domain);
			objs.add(m.codomain);
		};
		this.leg0.map(m => findObjs(m));
		this.leg1.map(m => findObjs(m));
		return [...objs];
	}
	getXY()
	{
		return D.Barycenter(this.getObjects());
	}
	update()
	{
		this.setXY(this.getXY());
		super.update();
	}
	getSVG()
	{
		const xy = this.getXY();
		this.setXY(xy);
		const svg =
`<text data-type="object" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_as'}" x="${xy.x}" y="${xy.y}" onmousedown="R.diagram.pickElement(event, '${this.name}')">&#10226;</text>`;
		return svg;
	}
	svg()
	{
		return super.svg('_as');
	}
	loadEquivalence()
	{
		const {leftSig, rightSig} = R.LoadEquivalence(this.leg0.map(m => m.to), this.leg1.map(m => m.to));
//		R.sig2Item.set(leftSig, this);
//		R.sig2Item.set(rightSig, this);
	}
	static GetKey(assert)
	{
		const name0 = assert[0].name;
		const name1 = assert[1].name;
		if (name0.localeCompare(name1) > 0)
			return [name1, name0];
		else
			return [name0, name1];
	}
	static GetLegs(ary)
	{
		const legs = [[], []];
		if (!ary.reduce((r, m) => r && DiagramMorphism.prototype.isPrototypeOf(m), true))
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
	static HasForm(ary)
	{
		if (ary.length < 2)
			return false;	// not enough stuff
		const legs = DiagramAssertion.GetLegs(ary);
		const leg0 = legs[0];
		const leg1 = legs[1];
		const length0 = leg0.length;
		const length1 = leg1.length;
		if ((length0 + length1 !== ary.length)  || length0 === 0 || length1 === 0)
			return false;	// bad legs
		return leg0[0].domain === leg1[0].domain && leg0[length0 -1].codomain === leg1[length1 -1].codomain;	// legs have same domain and codomain
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
	}
	action(e, diagram, morphisms)
	{
		const to = Composite.Get(diagram, morphisms.map(m => m.to));
		const from = new DiagramComposite(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms), morphisms});
		diagram.domain.makeHomSets();
		diagram.addSVG(from);
		diagram.makeSelected(e, from);
		diagram.update();
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length > 1 && ary.reduce((hasIt, r) => hasIt && DiagramMorphism.prototype.isPrototypeOf(r), true))
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
		if (leg.length === 1 && Composite.prototype.isPrototypeOf(leg[0]))
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
	}
	action(e, diagram, set)
	{
		const domain = set[0];
		const id = Identity.Get(diagram, domain.to);
		diagram.objectPlaceMorphism(e, 'domain', domain, id);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
	static Reduce(leg)		// remove identities
	{
		const nuLeg = leg.filter(m => !Identity.prototype.isPrototypeOf(m) && m.domain.name === m.codomain.name);
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
//<text text-anchor="middle" x="260" y="140" style="font-size:160px;stroke:#000;">A</text>
		};
		super(diagram, args);
	}
	action(e, diagram, set)
	{
		const error = document.getElementById('named-element-new-error');
		const from = set[0];
		const source = from.to;
		const args =
		{
			source,
			basename:		U.HtmlSafe(			document.getElementById('named-element-new-basename').value.trim()),
			properName:		U.HtmlEntitySafe(	document.getElementById('named-element-new-properName').value.trim()),
			description:	U.HtmlEntitySafe(			document.getElementById('named-element-new-description').value),
		};
		try
		{
			if (CatObject.prototype.isPrototypeOf(source))
			{
				const nid = new NamedObject(diagram, args);
				const nidIndex = diagram.placeObject(e, nid, D.default.stdOffset.add(from));
				const idx1 = new DiagramMorphism(diagram, {to:nid.idFrom, domain:nidIndex, codomain:from});
				const idx2 = new DiagramMorphism(diagram, {to:nid.idTo, codomain:nidIndex, domain:from});
				diagram.domain.makeHomSets();
				diagram.addSVG(idx1);
				diagram.addSVG(idx2);
				D.objectPanel.update();
				D.morphismPanel.update();
			}
			else if (Morphism.prototype.isPrototypeOf(source))
			{
				args.domain = source.domain;
				args.codomain = source.codomain;
				const to = new NamedMorphism(diagram, args);
				const nuFrom = new DiagramMorphism(diagram, {to, domain:from.domain, codomain:from.codomain});
				diagram.domain.makeHomSets();
				from.update();
				diagram.addSVG(nuFrom);
				D.morphismPanel.update();
			}
			diagram.update();
			D.HideToolbar();
		}
		catch(x)
		{
			error.style.padding = '4px';
			error.innerHTML = 'Error: ' + U.GetError(x);
		}
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
			H.span(D.GetButton('edit', `R.Actions.name.create(event)`, 'Create named element')) +
			H.span('', 'error', 'named-element-new-error');
		D.help.innerHTML = html;
	}
	create(e)
	{
		this.action(e, R.diagram, R.diagram.selected);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && ary.length === 1 && (DiagramMorphism.prototype.isPrototypeOf(ary[0]) || DiagramObject.prototype.isPrototypeOf(ary[0]));
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
	}
	action(e, diagram, ary, args = {offset:D.default.stdOffset})
	{
		const from = ary[0];
		if (DiagramMorphism.prototype.isPrototypeOf(from))
			diagram.placeMorphism(e, from.to, from.domain, from.codomain)
		else if (DiagramObject.prototype.isPrototypeOf(from))
			diagram.placeObject(e, from.to, from);
		else if (DiagramText.prototype.isPrototypeOf(from))
		{
			diagram.placeText(e, new D2(from), from.description);
		}
		diagram.update();
	}
	hasForm(diagram, ary)	// one element
	{
		return diagram.isEditable() && ary.length === 1 && !DiagramAssertion.prototype.isPrototypeOf(ary[0]);
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
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		from.flipName = !from.flipName;
		from.update();
		diagram.update();
	}
	hasForm(diagram, ary)	// one element
	{
		return diagram.isEditable() && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]);
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
`<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
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
	hasForm(diagram, ary)
	{
		if (ary.length < 2)
			return false;
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.prototype.isPrototypeOf(v), true));
	}
}

class DiagonalAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a diagonal morphism from an object',
			name:			'diagonal',
			icon:			`<path class="arrow0rnd" d="M60,260 260,260 160,60 60,260"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const d = Diagonal.Get(diagram, from.to, this.countElt.value);
		diagram.objectPlaceMorphism(e, 'domain', from.name, d.name);
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		D.help.innerHTML = H.h5(`Create Diagonal Morphism for ${from.to.properName}`) +
			H.table(H.tr(H.td(D.Input('', 'diagonal-new-count', 'Copies &ge; 2')), 'sidenavRow')) +
			H.span(D.GetButton('edit', `R.Actions.diagonal.action(event, R.diagram, R.diagram.selected)`, 'Create diagonal morphism')) +
			H.span('', 'error', 'diagonal-new-error');
		this.countElt = document.getElementById('diagonal-new-count');
		U.SetInputFilter(this.countElt, function(v)
		{
			return /^\d*$/.test(v) && (v === "" || parseInt(v) > 1)
		});
	}
	hasForm(diagram, ary)
	{
		if (ary.length !== 1 )
			return false;
		return diagram.isEditable() && CatObject.prototype.isPrototypeOf(ary[0]);
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
			icon:			D.svg.add,
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
	hasForm(diagram, ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.prototype.isPrototypeOf(v), true));
	}
}

class FoldAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			description:	'Create a fold morphism to an object',
			name:			'fold',
			icon:			`<path class="arrow0rnd" d="M60,60 260,60 160,260 60,60"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		if (this.countElt.value > 1)
		{
			const domain = CoproductObject.Get(diagram, Array(this.countElt.value).fill(from.to));
			const f = FoldMorphism.Get(diagram, domain, from.to);
			diagram.objectPlaceMorphism(e, 'codomain', from.name, f.name);
		}
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		const n = to.properName;
		const canFold = CoproductObject.CanFold(to);
		let foldBtn = '';
		if (canFold)
		{
			const objects = new Array(...to.getFoldInfo().keys());
			const name = objects.map(o => o.needsParens() ? `(${o.properName})` : o.properName).join('+');
			foldBtn = H.button(`&nabla;: ${n} &rarr; ${name}`, '', R.diagram.elementId(), 'Create fold morphism', `onclick="R.Actions.fold.defold(event, '${from.name}')"`) + H.hr();
		}
		D.help.innerHTML = H.h5('Create Fold') +
			foldBtn +
			H.span(`Create morphism &Sigma;${n} &rarr; ${n}`) + H.br() + H.span('with specified number of summands') +
			D.Input('', 'fold-new-count', 'Copies &ge; 2') +
			H.span(D.GetButton('edit', `R.Actions.fold.action(event, R.diagram, R.diagram.selected)`, 'Create fold morphism')) +
			H.span('', 'error', 'fold-new-error');
		this.countElt = document.getElementById('fold-new-count');
		U.SetInputFilter(this.countElt, function(v)
		{
			return /^\d*$/.test(v) && (v === "" || parseInt(v) > 1)	// integer greater than 1
		});
	}
	hasForm(diagram, ary)
	{
		if (ary.length !== 1 )
			return false;
		return diagram.isEditable() && CatObject.prototype.isPrototypeOf(ary[0]);
	}
	defold(e, name)
	{
		const from = R.diagram.getElement(name);
		const to = from.to;
		if (!CoproductObject.CanFold(to))
			throw 'element not defoldable';
		const codomain = CoproductObject.Get(diagram, to.getFoldInfo().keys());
		const f = FoldMorphism.Get(R.diagram, to, codomain);
		R.diagram.objectPlaceMorphism(e, 'domain', name, f.name);
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
`<path class="svgstr4" d="M60,160 160,160 160,60"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
		};
		super(diagram, args);
	}
	action(e, diagram, source)
	{
		const toCone = source.map(m => m.to);
		const to = PullbackObject.Get(diagram, toCone);
		const bary = D.Barycenter(source.map(m => m.domain));
		const sink = source[0].codomain;
		const xy = bary.add(bary.subtract(sink));
		const pb = new DiagramPullback(diagram, {xy, to, source});
		diagram.addSVG(pb);
		pb.cone.map(m => diagram.addSVG(diagram.getElement(m)));
		diagram.deselectAll();
		diagram.addSelected(pb);
//		toCone.map((m, index) =>
//		{
//			const pb = source.cone[index];
//			const from = new DiagramMorphism(diagram, {to:pb, domain:source, codomain:cone[index].domain});
//			diagram.addSVG(from);
//			diagram.addSelected(from);
//			diagram.addSelected(from);
//		});
		diagram.domain.makeHomSets();
		diagram.update();
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Category.IsSink(ary);
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
<path class="svgstr4" d="M160,260 160,160 260,160"/>`,
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
			const to = PushoutMorphism.Get(diagram, {object, leg:m});
			const from = new DiagramMorphism(diagram, {to, codomain:sink, domain:ary[i].codomain});
			diagram.addSVG(from);
			diagram.addSelected(from);
		});
		diagram.domain.makeHomSets();
		diagram.update();
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Category.IsSource(ary);
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
<line class="arrow9" x1="60" y1="80" x2="160" y2="240" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, diagramMorphisms)
	{
		const morphisms = diagramMorphisms.map(m => m.to);
		const m = ProductAssembly.Get(diagram, morphisms);
		diagram.objectPlaceMorphism(e, 'domain', diagramMorphisms[0].domain, m);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Category.IsSource(ary);
	}
}

class CoproductAssemblyAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Create a coproduct assembly of two or more morphisms with a common codomain',
						name:			'coproductAssembly',
						icon:
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, diagramMorphisms)
	{
		const morphisms = diagramMorphisms.map(m => m.to);
		const m = CoproductAssembly.Get(diagram, morphisms);
		diagram.objectPlaceMorphism(e, 'codomain', diagramMorphisms[0].codomain, m);
	}
	hasForm(diagram, ary)
	{
		return diagram.isEditable() && Category.IsSink(ary);
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
	}
	action(e, diagram, ary)
	{
		const xy = D.Barycenter(ary);
		if (DiagramObject.prototype.isPrototypeOf(ary[0]))
			diagram.placeObject(e, HomObject.Get(diagram, ary.map(o => o.to)), xy);
		else if (DiagramMorphism.prototype.isPrototypeOf(ary[0]))
			diagram.placeMorphism(e, HomMorphism.Get(diagram, ary.map(m => m.to)), xy);
	}
	hasForm(diagram, ary)	// two objects or morphisms
	{
		return diagram.isEditable() && ary.length === 2 && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
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
		for(const [key, m] of diagram.codomain.elements)
			if (Morphism.prototype.isPrototypeOf(m) && from.to.signature === m.domain.signature && (m.diagram.name === diagram.name || diagram.allReferences.has(m.diagram.name)))
				rows += D.HtmlRow(m, `onclick="R.diagram.objectPlaceMorphism(event, 'domain', '${from.name}', '${m.name}')"`);
		D.help.innerHTML = H.small(`Morphisms from ${from.to.properName}`, 'italic') + H.table(rows);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
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
		for(const [key, m] of diagram.codomain.elements)
			if (Morphism.prototype.isPrototypeOf(m) && from.to.signature === m.codomain.signature && (m.diagram.name === diagram.name || diagram.allReferences.has(m.diagram.name)))
				rows += D.HtmlRow(m, `onclick="R.diagram.objectPlaceMorphism(event, 'codomain', '${from.name}', '${m.name}')"`);
		D.help.innerHTML = H.small(`Morphisms to ${from.to.properName}`, 'italic') + H.table(rows);
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
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
		diagram.domain.elements.delete(from.name);
		diagram.domain.elements.set(from.name, from);	// reset the order in the map
		diagram.domain.makeHomSets();
		detachedObj.setObject(from.to.domain);
		detachedObj.incrRefcnt();
		from.update();
		diagram.addSVG(detachedObj);
		diagram.makeSelected(e, from);
		diagram.update();
	}
	hasForm(diagram, ary)	// one morphism with connected domain but not a def of something
	{
		if (diagram.isEditable() && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]) && !('morphisms' in ary[0]))
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
		diagram.domain.elements.delete(from.name);
		diagram.domain.elements.set(from.name, from);	// reset the order in the map
		diagram.domain.makeHomSets();
		detachedObj.setObject(from.to.codomain);
		detachedObj.incrRefcnt();
		from.update();
		diagram.addSVG(detachedObj);
		diagram.makeSelected(e, from);
		diagram.update();
	}
	hasForm(diagram, ary)	// one morphism with connected codomain
	{
		if (diagram.isEditable() && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]) && !('morphisms' in ary[0]))
		{
			const from = ary[0];
			const codMorphs = diagram.domain.obj2morphs.get(from.codomain);
			return from.isDeletable() && (codMorphs ? codMorphs.dom.length + codMorphs.cod.length > 1 : false);
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
		const updateHomSets = new Set;
		for(let i=0; i<ary.length; ++i)
		{
			let s = ary[i];
			s.decrRefcnt();
			if (DiagramObject.prototype.isPrototypeOf(s))	// TODO what about morphisms as objects in 2Cat?
				updateObjects = true;
			else if (DiagramMorphism.prototype.isPrototypeOf(s))
			{
				updateMorphisms = true;
				updateObjects = true;
				updateHomSets.add([s.domain.name, s.codomain.name]);
			}
			else if (DiagramText.prototype.isPrototypeOf(s))
				updateTexts = true;
		}
		if (updateObjects)
			D.objectPanel.update();
		if (updateMorphisms)
		{
			D.morphismPanel.update();
			diagram.domain.makeHomSets();
			updateHomSets.forEach(function(pair)
			{
				diagram.domain.getHomSet(pair[0], pair[1]).map(m => m.update());
			});
		}
		if (updateTexts)
			D.textPanel.update();
		diagram.selected = [];	// do not use diagram.deselectAll()
		diagram.update();
		D.HideToolbar();
	}
	hasForm(diagram, ary)	// all are deletable
	{
		return diagram.isEditable() && ary.reduce((hasIt, a) => hasIt && a.isDeletable(), true);
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
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
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
	/*
	initialize(category)
	{
		new InitialObject(null, {category});
	}
	*/
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]);
	}
}

class ProjectAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			name:		'project',
			description:	'Create projection morphism',
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
		const factors = U.GetFactorsById('project-codomain');
		let m = null;
		if (factors.length === 1 && factors[0] === -1)
			m = TerminalMorphism.Get(diagram, from.to);
		else
			m = FactorMorphism.Get(diagram, from.to, factors);
		diagram.objectPlaceMorphism(e, 'domain', from, m)
	}
	hasForm(diagram, ary)	// one product object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]) && ProductObject.prototype.isPrototypeOf(ary[0].to);
	}
	html(e, diagram, ary)
	{
		const to = ary[0].to;
//		const canFlatten = to.objects.reduce((r, o) => r || ProductObject.prototype.isPrototypeOf(o), false);
		const canFlatten = ProductObject.CanFlatten(to);
		const html = H.h4('Create Factor Morphism') +
					(canFlatten ?
						H.div(H.span('Remove parenthesis', 'little') +
							H.button('Flatten Product', '', '', '', `onclick="R.Actions.project.flatten(event, R.diagram, R.diagram.getSelected())"`)) : '') +
					H.h5('Domain Factors') +
					H.small('Click to place in codomain') +
					H.button('1', '', R.diagram.elementId(), 'Add terminal object', `onclick="R.Actions.project.addFactor('${to.name}', -1)"`) +
					ProjectAction.FactorButton('codomain', to, to, []) +
					H.h5('Codomain Factors') + H.br() +
					H.span('Click objects to remove from codomain', 'smallPrint') +
					H.div('', '', 'project-codomain');
		D.help.innerHTML = html;
		this.codomainDiv = document.getElementById('project-codomain');
	}
	addFactor(root, ...indices)
	{
		if (this.codomainDiv.innerHTML === '')
			this.codomainDiv.innerHTML = H.span(D.GetButton('edit', `R.Actions.project.action(event, R.diagram, R.diagram.selected)`, 'Create morphism'));
		const object = R.diagram.getElement(root);
		const factor = object.getFactor(indices);
		const sub = indices.join();
		this.codomainDiv.innerHTML += H.button(factor.properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="H.del(this)"`);
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
			if (ProductObject.prototype.isPrototypeOf(ob))
				ob.objects.map((obo, i) => searchObjects.push([obo, [...f, i]]));
			else
				factors.push(f);
		}
		const m = FactorMorphism.Get(diagram, to, factors);
		diagram.objectPlaceMorphism(e, 'domain', from, m)
	}
	static ObjectFactorButton(dir, root, object, index)
	{
		return H.table(H.tr(H.td(
			H.button(object.properName + H.sub(index.join()), '', R.diagram.elementId(), 'Place object',
			`data-indices="${index.toString()}" onclick="R.Actions.project.addFactor('${root.name}', ${index.toString()})"`)
		)));
	}
	static ProductObjectFactorButton(dir, root, object, index)
	{
		let header = H.tr(H.td(ProjectAction.ObjectFactorButton(dir, root, object, index)), 'sidename');
		let tbl = '';
		object.objects.map((o, i) =>
		{
			const subIndex = index.slice();
			subIndex.push(i);
			tbl += H.td(ProjectAction.FactorButton(dir, root, o, subIndex));
		});
		return H.table(header + H.tr(H.td(H.table(H.tr(tbl))), 'sidename'));
	}
	static FactorButton(dir, root, object, index)
	{
		return ProductObject.prototype.isPrototypeOf(object) ? ProjectAction.ProductObjectFactorButton(dir, root, object, index) :
			ProjectAction.ObjectFactorButton(dir, root, object, index);
	}
}

class InjectAction extends Action
{
	constructor(diagram)
	{
		const args =
		{
			name:		'inject',
			description:	'Create injection morphism',
			icon:	// TODO
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x2="110" y2="120" x1="240" y1="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x2="110" y2="160" x1="280" y1="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x2="110" y2="200" x1="240" y1="280" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const m = CofactorMorphism.Get(diagram, from.to, U.GetFactorsById('inject-domain'));
		diagram.objectPlaceMorphism(e, 'codomain', from, m)
	}
	hasForm(diagram, ary)	// one coproduct object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]) && CoproductObject.prototype.isPrototypeOf(ary[0].to);
	}
	html(e, diagram, ary)
	{
		const to = ary[0].to;
		const canFlatten = to.objects.reduce((r, o) => r || CoproductObject.prototype.isPrototypeOf(o), false);
		const html = H.h4('Create Injection Morphism') +
					(canFlatten ?
						H.div(H.span('Remove parenthesis', 'little') +
							H.button('Flatten Coproduct', '', '', '', `onclick="R.Actions.inject.flatten(event, R.diagram, R.diagram.getSelected())"`)) : '') +
					H.h5('Codomain Factors') +
					H.small('Click to place in domain') +
					InjectAction.FactorButton('domain', to, to, []) +
					H.h5('Domain Factors') + H.br() +
					H.span('Click objects to remove from domain', 'smallPrint') +
					H.div('', '', 'inject-domain');
		D.help.innerHTML = html;
		this.domainDiv = document.getElementById('inject-domain');
	}
	addFactor(root, ...indices)
	{
		if (this.domainDiv.innerHTML === '')
			this.domainDiv.innerHTML = H.span(D.GetButton('edit', 'R.Actions.inject.action(event, R.diagram, R.diagram.selected)', 'Create morphism'));
		const object = R.diagram.getElement(root);
		const factor = object.getFactor(indices);
		const sub = indices.join();
		this.domainDiv.innerHTML += H.button(factor.properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="H.del(this)"`);
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
			if (CoproductObject.prototype.isPrototypeOf(ob))
				ob.objects.map((obo, i) => searchObjects.push([obo, [...f, i]]));
			else
				factors.push(f);
		}
		const m = CofactorMorphism.Get(diagram, to, factors);
		diagram.objectPlaceMorphism(e, 'codomain', from, m)
	}
	static ObjectFactorButton(dir, root, object, index)
	{
		return H.table(H.tr(H.td(
			H.button(object.properName + H.sub(index.join()), '', R.diagram.elementId(), 'Place object',
			`data-indices="${index.toString()}" onclick="R.Actions.inject.addFactor('${root.name}', ${index.toString()})"`)
		)));
	}
	static CoproductObjectFactorButton(dir, root, object, index)
	{
		let header = H.tr(H.td(InjectAction.ObjectFactorButton(dir, root, object, index)), 'sidename');
		let tbl = '';
		object.objects.map((o, i) =>
		{
			const subIndex = index.slice();
			subIndex.push(i);
			tbl += H.td(InjectAction.FactorButton(dir, root, o, subIndex));
		});
		return H.table(header + H.tr(H.td(H.table(H.tr(tbl))), 'sidename'));
	}
	static FactorButton(dir, root, object, index)
	{
		return CoproductObject.prototype.isPrototypeOf(object) ? InjectAction.CoproductObjectFactorButton(dir, root, object, index) :
			InjectAction.ObjectFactorButton(dir, root, object, index);
	}
}

class LambdaMorphismAction extends Action
{
	constructor(diagram)
	{
		const args = {	description:	'Curry a morphism',
						name:			'lambdaMorphism',
						icon:
`<line class="arrow0" x1="40" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="280" x2="140" y2="180" marker-end="url(#arrowhead)"/>`,};
		super(diagram, args);
	}
	action(e, diagram, ary)
	{
		const from = ary[0];
		const domFactors = U.GetFactorsById('lambda-domain');
		const homFactors = U.GetFactorsById('lambda-codomain');
		const m = LambdaMorphism.Get(diagram, from.to, domFactors, homFactors);
		const v = D2.Subtract(from.codomain, from.domain);
		const normV = v.normal().normalize();
		const xyDom = normV.scale(D.default.arrow.length).add(from.domain);
		const xyCod = normV.scale(D.default.arrow.length, normV).add(from.codomain);
		diagram.placeMorphism(e, m);
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1 && DiagramMorphism.prototype.isPrototypeOf(ary[0]))
		{
			const m = ary[0].to;
			if (TerminalObject.prototype.isPrototypeOf(m.domain) && !HomObject.prototype.isPrototypeOf(m.codomain))
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
		while (HomObject.prototype.isPrototypeOf(obj))
		{
			obj = obj.homDomain();
			homCod += this.getButtons(obj, {dir:1, fromId:'lambda-codomain', toId:'lambda-domain'});
		}
		const html =
			H.h4('Create Named Morphism') +
			H.button(`&#10034;&rarr;[${domain.properName}, ${codomain.properName}]`, '', '', '', `onclick="R.Actions.lambdaMorphism.createNamedElement(event, R.diagram.selected)"`) +
			H.hr() +
			H.h4('Curry Morphism') +
			H.h5('Domain') +
			H.small('Click to move to codomain:') +
			H.span(this.getButtons(domain, {dir:	0, fromId:'lambda-domain', toId:'lambda-codomain'}), '', 'lambda-domain') +
			H.h5('Codomain') +
			H.small('Click to move to codomain: [') +
			H.span(homCod, '', 'lambda-codomain') +
			H.span(`, ${HomObject.prototype.isPrototypeOf(codomain) ? codomain.minimalHomDom().properName : codomain.properName}]`) +
			H.span(D.GetButton('edit', `R.Actions.lambdaMorphism.action(event, R.diagram, R.diagram.selected)`,
				'Create lambda morphism'));
		D.help.innerHTML = html;
		this.domainElt = document.getElementById('lambda-domain');
		this.codomainElt = document.getElementById('lambda-codomain');
	}
	getButtons(object, data)
	{
		let html = '';
		const onclick = `R.Actions.lambdaMorphism.moveFactor(this)`;
		const homBtn = H.button('&times;', '', '', 'Convert to hom', `data-indices="-1"`, `onclick="R.Actions.lambdaMorphism.toggleOp(this)"`) + html;
		const codSide = data.dir === 1 && 'objects' in object;
		if ('objects' in object)
			object.objects.map((o, i) =>
				html += H.button(o.properName + H.sub(i), '', D.elementId(), '', `data-indices="${data.dir}, ${i}" onclick="${onclick}"`) +
					((codSide && i < object.objects.length - 1) ? homBtn : '')
			).join('');
		else
			html += H.button(object.properName, '', D.elementId(), '', `data-indices="${data.dir}, 0" onclick="${onclick}"`);
		if (codSide)
			html = H.button('[', '', '', 'Convert to product', `data-indices="-2"`, `onclick="R.Actions.lambdaMorphism.toggleOp(this)"`) + html;
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
				b.setAttribute('onclick', "R.Actions.lambdaMorphism.toggleOp(this)");
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
	createNamedElement(e, ary)
	{
		const from = ary[0];
		const to = from.to;
		const m = LambdaMorphism.Get(from.diagram, to, [], [[0, 0]]);
		const v = D2.Subtract(from.codomain, from.domain);		// TODO use?
		const normV = v.normal().normalize();		// TODO use?
		const xyDom = normV.scale(D.default.arrow.length).add(from.domain);		// TODO use?
		const xyCod = normV.scale(D.default.arrow.length, normV).add(from.codomain);		// TODO use?
		from.diagram.placeMorphism(e, m);
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
		else if (DiagramText.prototype.isPrototypeOf(from) && from.diagram.isEditable())
		{
			const btn = from.constructor.name === 'DiagramText' ?
				D.GetButton('edit', `R.diagram.getElement('${from.name}').editText(event, 'descriptionElt')`, 'Edit', D.default.button.tiny) :
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
		const args = {	description:	'Morphism\'s javascript code',
						name:			'javascript',
						icon:
'<text text-anchor="middle" x="160" y="280" style="font-size:240px;stroke:#000;">JS</text>',};
		super(diagram, args);
		this.htmlReady = false;
	}
	action(e, diagram, ary)
	{
		const m = ary[0].to;
		if (m.constructor.name === 'Morphism')	// only edit Morphisms and not derived ones
		{
			if (!('code' in m))
				m.code = {};
			m.code.javascript = document.getElementById('morphism-javascript').innerText;
			diagram.update();
		}
	}
	hasForm(diagram, ary)
	{
		return ary.length === 1 && Morphism.prototype.isPrototypeOf(ary[0]);
	}
	isEditable(m)
	{
		return m.isEditable() && m.constructor.name === 'Morphism' &&
			!InitialObject.prototype.isPrototypeOf(m.domain) &&
			!TerminalObject.prototype.isPrototypeOf(m.codomain) &&
			!InitialObject.prototype.isPrototypeOf(m.codomain);
	}
	html(e, diagram, ary)
	{
		const m = ary[0].to;
		let html = '';
		if (m.constructor.name === 'Morphism')
		{
			let code = 'code' in m ? (this.hasCode(m) ? m.code.javascript : '') : '';
			if (code === '')
				code = this.generate(m);
			html += H.div(U.HtmlSafe(code), 'code', 'morphism-javascript') +
					(this.isEditable(m) ? D.GetButton('edit', `R.Actions.javascript.setMorphismCode(event, 'morphism-javascript', 'javascript')`,
						'Edit code', D.default.button.tiny): '');
		}
		else
			html = H.p(U.HtmlSafe(this.generate(m)), 'code', 'morphism-javascript');
		D.help.innerHTML = html;
	}
	hasCode(m)
	{
		return Morphism.prototype.isPrototypeOf(m) && 'code' in m && 'javascript' in m.code;
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
	objectStructure(o)
	{
		let code = '';
		switch(o.constructor.name)
		{
			case 'CatObject':
				const jsn = U.JsName(o);
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
	static Header(m)
	{
		return `function ${U.JsName(m)}(args)\n{\n`;
	}
	static Tail()
	{
		return `\n}\n`;
	}
	generate(m, generated = new Set)
	{
		let code = '';
		const proto = m.constructor.name;
		if (!generated.has(m.name))
		{
			/*
			if (this.hasCode(m))
			{
				code += m.code.javascript;
				generated.add(m.name);
				return code;
			}
			*/
	 		if (MultiMorphism.prototype.isPrototypeOf(m))
				code += m.morphisms.map(n => this.generate(n, generated)).join('\n');
			const jsName = U.JsName(m);
			const header = JavascriptAction.Header(m);
			const tail = JavascriptAction.Tail();
/*
			if (m.domain.isIterable() && !generated.has(m.domain.name))
			{
				if (FiniteObject.prototype.isPrototypeOf(m.domain) && 'size' in m.domain)
				{
					generated.add(m.domain.name);
					if (DataMorphism.prototype.isPrototypeOf(m))
					{
						if (m.data.size === 1)
						{
							const it = m.data[Symbol.iterator]();
							const r = it.next();
//							const data = [...m.data.values()];
							code +=
`
function ${U.JsName(m.domain)}_Iterator(fn)
{
	return fn(${r.value});
}
`;
						}
					}
					else
					{
						if (TerminalObject.prototype.isPrototypeOf(m.domain))
							code +=
`
function ${U.JsName(m.domain)}_Iterator(fn)
{
	return fn();
}
`;
						else
							code +=
`
function ${U.JsName(m.domain)}_Iterator(fn)
{
	const result = new Array(${m.domain.size});
	for (let i=0; i<${m.domain.size}; ++i)
		result[i] = fn(i);
	return result;
}
`;
					}
				}
				else if (ProductObject.prototype.isPrototypeOf(m.domain))
				{
					// TODO
				}
				else if (CoproductObject.prototype.isPrototypeOf(m.domain))
				{
					// TODO
				}
			}
*/
			if (InitialObject.prototype.isPrototypeOf(m.domain))
				code += `${header}	return;	// abandon computation\n'${tail}`;	// domain is null, yuk
			else if (TerminalObject.prototype.isPrototypeOf(m.codomain))
				code += `${header}	return 0;${tail}`;
			else if (InitialObject.prototype.isPrototypeOf(m.codomain))
				code += `${header}	throw 'do not do this';${tail}`;
//			else if (TerminalObject.prototype.isPrototypeOf(m.domain) && m.constructor.name === 'Morphism')
//				code += `${header}	// TODO replace this code with that which returns the desired object\n	return ${this.objectStructure(m.codomain)}${tail}`;
			else
				switch(proto)
				{
					case 'Morphism':
						if ('code' in m)		// TODO still needed
							code += `${m.code.javascript}\n`;
						break;
					case 'Composite':
						code += `${header}	return ${m.morphisms.map(n => U.JsName(n) + '(').reverse().join('')}args${ ")".repeat(m.morphisms.length) };${tail}`;
						break;
					case 'Identity':
						code += `${header}	return args;${tail}`;
						break;
					case 'ProductMorphism':
						code += `${header}	return [${m.morphisms.map((n, i) => U.JsName(n) + '(args[' + i + '])').join()}];${tail}`;
						break;
					case 'CoproductMorphism':
						code +=
`const ${jsName}_morphisms = [${m.morphisms.map((n, i) => U.JsName(n)).join()}];
${header}	return [args[0], ${jsName}_morphisms[args[0]](args[1])];${tail}`;
						break;
					case 'ProductAssembly':
						code += `${header}	return [${m.morphisms.map((n, i) => U.JsName(n) + '(args)').join()}];${tail}`;
						break;
					case 'CoproductAssembly':
						code +=
`const ${jsName}_morphisms = [${m.morphisms.map((n, i) => U.JsName(n)).join()}];
${header}	return ${jsName}_morphisms[args[0]](args[1]);${tail}`;
						break;
					case 'DataMorphism':
						if ('recursor' in m)
						{
							generated.add(m.name);	// add early to avoid infinite loop
							code += this.generate(m.recursor, generated);
						}
// {
// 	${m.data.forEach(function(v, i){return `	'${i}':'${v}',\n`;})}
// }
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
	return ${U.JsName(m.recursor)}(args);
${tail}`;
						else
							code +=
`
${header}	return ${jsName}_Data.get(args);${tail}`;
						break;
					case 'Diagonal':
						code += `${header}	return Array(${m.count}).fill(args);${tail}`;
						break;
					case 'Distribute':
					case 'Dedistribute':
						code += `${header}	return [args[1][0], [args[0], args[1][1]]];${tail}`;
						break;
					case 'Evaluation':
						code += `${header}	return args[0](args[1]);${tail}`;
						break;
					case 'FactorMorphism':
						code +=
`const ${jsName}_factors = ${JSON.stringify(m.factors)};
${header}	const r = ${jsName}_factors.map(f => f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
	return ${m.factors.length === 1 ? 'r[0]' : 'r'};${tail}`;
						break;
					case 'FoldMorphism':
						code += `${header}	return args[1];${tail}`;
						break;
					case 'HomMorphism':
						break;
					case 'InitialMorphism':
						code += `${header}	return;${tail}`;
						break;
					case 'LambdaMorphism':
						code += this.generate(m.preCurry, generated);
						const inputs = new Array(this.objectLength(m.preCurry.domain));
						const domLength = this.objectLength(m.domain);
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
//								inputs[f[1]] = lambdaHomCodLength > 1 ? 'bargs[i]' : 'bargs';
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
		return ${U.JsName(m.preCurry)}(${input});
	}${tail}`;
						else if (domLength === 0 && homLength >= 1)
							code +=
`${header}	return ${U.JsName(m.preCurry)};${tail}`;
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
`${header}return ${U.JsName(m.preCurry)}(${preInput})(${postInput});${tail}`;
						}
						break;
					case 'NamedMorphism':
						code += this.generate(m.source, generated);
						code += `${header}	return ${U.JsName(m.source)}(args);${tail}`;
						break;
//					case 'Recursive':
//						break;
					case 'StringMorphism':
						break;
					case 'TerminalMorphism':
						code += `${header}	return 0;${tail}`;
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
		const that = this;
		diagram.forEachMorphism(function(m)
		{
			code += that.generate(m, generated);
		});
		return code;
	}
	objectLength(o)
	{
		if (TerminalObject.prototype.isPrototypeOf(o) || InitialObject.prototype.isPrototypeOf(o))
			return 0;
		if (ProductObject.prototype.isPrototypeOf(o))
			return o.objects.reduce((r, o) => r + (TerminalObject.prototype.isPrototypeOf(o) ? 0 : 1), 0);
		else
			return 1;
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
				ProductObject.prototype.isPrototypeOf(m.codomain) &&
				m.codomain.objects[0].name === str.name)
			{
				const hom = m.codomain.objects[1];
				if (HomObject.prototype.isPrototypeOf(hom))
				{
					const homDom = hom.objects[0];
					if (homDom.signature === html.signature)
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
			fn();
		};
		scriptElt.src = D.url.createObjectURL(new Blob([script], {type:'application/javascript'}));
		document.head.appendChild(scriptElt);
	}
	canFormat(o)
	{
		if (ProductObject.prototype.isPrototypeOf(o) || CoproductObject.prototype.isPrototypeOf(o))
			return o.objects.reduce((r, ob) => r && this.canFormat(ob));
		else if (Morphism.prototype.isPrototypeOf(o))
			return this.canFormat(o.domain) && this.canFormat(o.codomain);
		else if (TerminalObject.prototype.isPrototypeOf(o))
			return true;
		else if (CatObject.prototype.isPrototypeOf(o))
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
//					const fName = U.JsName(f);
					const out = window[U.JsName(f)](`${prefix} ${o.name} ${factor.toString()}`);
					html = out[0];
				}
				else
					D.RecordError('object has no formatter');
				break;
			case 'ProductObject':
				html += o.objects.map((ob, i) => this.getInput(ob, prefix, [...factor, i]));
				break;
			case 'CoproductObject':
				let options = '';
				let divs = '';
				for (let i=0; i<o.objects.length; ++i)
				{
					const ob = o.objects[i];
					const f = [...factor, i];
					const oid = `dv_${ob.name} ${f.toString()}`;
					options += `<option value="${i}">${i}: ${ob.properName}</option>`;
					divs += H.div(this.getInput(ob, prefix, [...factor, i]), 'nodisplay', oid);
				}
//				const id = `${prefix} ${o.name} ${factor.toString()}`;
				html +=
`<select id="${id}" onchange="D.ShowInput('${o.name}', '${id}', ${factor.length === 0 ? '[]' : factor.toString()})">
<option>Choose one</option>
${options}
</select>
<div>
${divs}
</div>
`;
				break;
			case 'FiniteObject':
			case 'TerminalObject':
//				html = `<input type="number" min="0" id="${o.name}"`;
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
//					const fName = U.JsName(f);
					const out = window[U.JsName(f)](domain.name + factor.toString());
					const formatter = out[1]();
					value = formatter(`${prefix} ${domain.name} ${factor.toString()}`);;
				}
				else
					D.RecordError('object has no formatter');
				break;
			case 'ProductObject':
				value = domain.objects.map((o, i) => this.getInputValue(o, prefix, [...factor, i]));
				break;
			case 'TerminalObject':
				value = 0;
				break;
			case 'CoproductObject':
				const i = Number.parseInt(document.getElementById(`${prefix} ${domain.name} ${factor.toString()}`).value);
				value = [i, this.getInputValue(domain.objects[i], prefix, [...factor, i])];
				break;
		}
		return value;
	}
	evaluate(e, diagram, name, fn)
	{
		const m = diagram.getElement(name);
		const args = this.getInputValue(m.domain);
		const jsName = U.JsName(m);
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
		const jsName = U.JsName(m);
		const isIterable = m.isIterable();
		const iterInvoke = Composite.prototype.isPrototypeOf(m) ? `${U.JsName(m.getFirstMorphism())}_Iterator(${jsName})` : `${U.JsName(m.domain)}_Iterator(${jsName})`;
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
		if (this.formatters.has(o.signature))
			return this.formatters.get(o.signature);
		return null;
	}
	getInputString(o)
	{
		const f = this.findFormat(o);
		if (f)
		{
			const p = window[U.JsName(f)]();
			return p[0];
		}
		return '';
	}
	getInputFunction(o)
	{
		const f = this.findFormat(o);
		if (f)
		{
			const p = window[U.JsName(f)]()();
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
			case 'CoproductObject':
				return o.objects.reduce((r, so) => r && this.formatters.has(so.signature), true);
		}
		return false;
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
					D.threeDPanel.Ato3D(args);
					D.threeDPanel.open();
					break;
				case 'ff2d3':
					D.threeDPanel.AxAto3D(args);
					D.threeDPanel.open();
					break;
				case 'fff2d3':
					D.threeDPanel.AxAxAto3D(args);
					D.threeDPanel.open();
					break;
				case 'fff2toLine':
					D.threeDPanel.AxAxAx2toLine(args);
					D.threeDPanel.open();
					break;
				case 'fff2toQB3':
					D.threeDPanel.AxAxAToQuadraticBezierCurve3(args);
					D.threeDPanel.open();
					break;
				case 'str2tty':
					D.ttyPanel.toOutput(args);
					D.ttyPanel.open();
					D.Panel.SectionOpen('tty-out-section');
					break;
			}
		});
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
		const addDataBtn = D.GetButton('edit', `R.Actions.run.addInput()`, 'Add data');
		const {properName, description} = to;
		let html = H.h3(properName) + (description !== '' ? H.p(description, 'smallPrint') : '');
		let canMakeData = true;
		if (DiagramObject.prototype.isPrototypeOf(from))
		{
			if (js.canFormat(to))
				html += js.getInput(to) + addDataBtn;
		}
		else	// morphism
		{
			const {domain, codomain} = to;
			const evalCode = H.h5('Evaluate the Morphism') +
								js.getInput(domain) +
								D.GetButton('edit', `R.Actions.javascript.evaluate(event, R.diagram, '${to.name}', R.Actions.run.postResult)`, 'Evaluate inputs');
			if (to.constructor.name === 'Morphism' && FiniteObject.prototype.isPrototypeOf(domain) && !js.hasCode(to))
			{
				if ('size' in domain && domain.size > 0)
				{
					for (let i=0; i<domain.size; ++i)
						html += js.getInput(codomain, i.toString());
				}
				else	// indeterminate size
				{
					html += js.getInput(codomain);
					html += D.GetButton('add', `R.Actions.run.addDataInput(event, R.diagram, '${to.name}')`, 'Add data input');
				}
			}
			else if (DataMorphism.prototype.isPrototypeOf(to))
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
				html += D.GetButton('edit', `R.Actions.javascript.evaluateMorphism(event, R.diagram, '${to.name}', R.Actions.run.postResults)`, 'Evaluate morphism');
			else		// try to evaluate an input
				html += evalCode;
		}
		if (canMakeData)
		{
			const createDataBtn = H.div(D.GetButton('table', `R.Actions.run.createData(event, R.diagram, '${from.name}')`, 'Create data morphism'), '', 'run-createDataBtn');
			D.help.innerHTML = html + H.div(H.h5('Data'), '', 'run-display') + createDataBtn;
			const btn = document.getElementById('run-createDataBtn');
			btn.style.display = 'none'
			this.createDataBtn = btn;
			const watcher = function(mutationsList, observer)
			{
				for(const m of mutationsList)
				{
console.log('watcher', m);
					btn.style = m.target.children.length > 0 ? 'block' : 'none';
				}
			};
			const observer = new MutationObserver(watcher);
			const childList = true;
			observer.observe(document.getElementById('run-display'), {childList});
		}
		else
			D.help.innerHTML = html + H.div('', '', 'run-display');
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
		if (CatObject.prototype.isPrototypeOf(to))
		{
			dom = this.data.size;
			cod = this.js.getInputValue(to);
			d.innerHTML = U.HtmlSafe(U.a2s(cod));
			this.data.set(dom, cod);
		}
		else if (DataMorphism.prototype.isPrototypeOf(to))
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
			const domain = FiniteObject.Get(diagram, '', this.data.size);
			const {to, name} = DiagramObject.prototype.isPrototypeOf(selected) ? selected : selected.codomain;
			const dm = new DataMorphism(diagram, {domain, codomain:to, data:this.data});
			diagram.objectPlaceMorphism(e, 'codomain', name, dm.name);
		}
	}
	hasForm(diagram, ary)
	{
		if (!this.js)
			this.js = R.Actions.javascript;
		if (ary.length === 1 && 'to' in ary[0])
		{
			const {to} = ary[0];
			if (Morphism.prototype.isPrototypeOf(to) && (this.js.canFormat(to) || to.isIterable()))
				return true;
			if (CatObject.prototype.isPrototypeOf(to))
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
		if (to.constructor.name === 'CatObject' && to.refcnt === 1)
		{
			diagram.codomain.deleteElement(to);
			const newTo = new FiniteObject(diagram, {basename:to.basename, category:diagram.codomain, properName:to.properName, size:this.sizeElt.value.trim()});
			from.to = null;
			from.setObject(newTo);
		}
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
		diagram.update();
		this.html(e, diagram, ary);
	}
	html(e, diagram, ary)
	{
		const from = ary[0];
		const to = from.to;
		let html = H.h4('Finite Object');
		html += (to.constructor.name === 'CatObject' ? H.span('Convert generic object to a finite object.', 'smallPrint') : H.span('Finite object', 'smallPrint')) +
					H.table(H.tr(H.td(D.Input('size' in to ? to.size : '', 'finite-new-size', 'Size')), 'sidenavRow')) +
					H.span('Leave size blank to indicate finite of unknown size', 'smallPrint') +
					D.GetButton('edit', 'R.Actions.finiteObject.action(event, R.diagram, R.diagram.selected)', 'Finite object', D.default.button.tiny);
		D.help.innerHTML = html;
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
				return FiniteObject.prototype.isPrototypeOf(from.to);
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
		const m = Evaluation.Get(diagram, from.to);
		diagram.objectPlaceMorphism(e, 'domain', from, m.name)
	}
	hasForm(diagram, ary)	// one object
	{
		return diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]) && Evaluation.CanEvaluate(ary[0].to);
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
		let m = null;
		if (Distribute.HasForm(diagram, ary))
			m = Distribute.Get(diagram, from.to);
		if (Dedistribute.HasForm(diagram, ary))
			m = Dedistribute.Get(diagram, from.to);
		diagram.objectPlaceMorphism(e, 'domain', from, m.name)
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
	}
	action(e, diagram, ary)
	{
		const items = this.getItems(ary);
		const xy = items[0].getXY();
		items.shift();
		items.map(i => i.update({x:i.x, y:xy.y}));
		diagram.updateMorphisms();
		diagram.update();
		D.ShowToolbar(e);
	}
	getItems(ary)
	{
		return ary.filter(s => DiagramObject.prototype.isPrototypeOf(s) || DiagramText.prototype.isPrototypeOf(s));
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
	}
	action(e, diagram, ary)
	{
		const items = this.getItems(ary);
		const xy = items[0].getXY();
		items.shift();
		items.map(i => i.update({x:xy.x, y:i.y}));
		diagram.updateMorphisms();
		diagram.update();
		D.ShowToolbar(e);
	}
	getItems(ary)
	{
		return ary.filter(s => DiagramObject.prototype.isPrototypeOf(s) || DiagramText.prototype.isPrototypeOf(s));
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
		if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			const morphisms = ary.map(m => m.to);
			const to = TensorMorphism.Get(diagram, morphisms);
			diagram.placeMorphism(e, to, D.Barycenter(ary));
		}
		else if (DiagramObject.prototype.isPrototypeOf(elt))
		{
			const objects = ary.map(o => o.to);
			const to = TensorObject.Get(diagram, objects);
			diagram.placeObject(e, to, elt);
		}
	}
	hasForm(diagram, ary)
	{
		if (ary.length < 2)
			return false;
		return diagram.isEditable() && (ary.reduce((hasIt, v) => hasIt && DiagramObject.prototype.isPrototypeOf(v), true) ||
			ary.reduce((hasIt, v) => hasIt && DiagramMorphism.prototype.isPrototypeOf(v), true));
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
	}
	action(e, diagram, ary)
	{
		const legs = DiagramAssertion.GetLegs(ary);
		const a = diagram.addAssertion(legs[0], legs[1]);
		diagram.makeSelected(e, a);
		diagram.update();
	}
	hasForm(diagram, ary)
	{
		return DiagramAssertion.HasForm(ary);
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
		D.Status(e, `Data morphism ${recursor.properName} is now recursive with morphism ${form.properName}`);
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
			D.Status(e, `Morphism ${from.to.properName} is now a data morphism`);
			diagram.update();
		}
	}
	hasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1)
		{
			const from = ary[0];
			const to = ary[0].to;
			if (diagram.isIsolated(from) && diagram.elements.has(to.basename) && Morphism.prototype.isPrototypeOf(to) && !('code' in to))
				return  to.constructor.name === 'Morphism';
		}
		return false;
	}
}

class Category extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : `${nuArgs.user}/${nuArgs.basename}`;
		nuArgs.category = diagram && 'codomain' in diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			elements:	{value:	new Map,	writable:	false},
			actions:	{value:	new Map,	writable:	false},
			actionDiagrams:	{value:	new Set('actionDiagrams' in nuArgs ? nuArgs.actionDiagrams : []),	writable:	false},
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
		return U.sha256(`${this.constructor.name} ${this.name} ${s}`);
	}
	process(diagram, args, elements = null)
	{
		let errMsg = '';
		args.map((e, i) =>
		{
			try
			{
				if (!this.getElement(e.name))
				{
					if (elements && elements.has(e.basename))
						throw 'elements already has basename';
					const element = Element.Process(diagram, e);
					elements && elements.set(e.basename, element);
				}
				else if (e.prototype !== 'Identity')	// skip duplicate id's
					throw `element already exists: ${e.name}`;
			}
			catch(x)
			{
				errMsg += x + '\n';
			}
		}, this);
		if ('Actions' in R && 'actions' in args)	// bootstrap issue
			args.actions.map(a => this.actions.set(a, R.$Actions.getElement(a)));
		if (errMsg != '')
			D.RecordError(errMsg);
		if (!IndexCategory.prototype.isPrototypeOf(this))
			for(const [key, m] of this.elements)
			{
				if (DataMorphism.prototype.isPrototypeOf(m) && 'recursor' in m && typeof m.recursor === 'string')	// set recursive function as it is defined after m is
					m.setRecursor(m.recursor);
			}
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
	addElement(e)
	{
		if (this.elements.has(e.name))
			throw `Element with given name already exists in category`;
		if (e.diagram && e.diagram.elements.has(e.basename))
			throw `Element with given basename already exists in diagram`;
		this.elements.set(e.name, e);
		e.diagram && !(DiagramObject.prototype.isPrototypeOf(e) || DiagramMorphism.prototype.isPrototypeOf(e)) && e.diagram.elements.set(e.basename, e);
	}
	deleteElement(e)
	{
		this.elements.delete(e.name);
		e.diagram && e.diagram.elements.delete(e.basename);
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
			CatObject.prototype.isPrototypeOf(e) && fn(e);
		});
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(function(e)
		{
			if (Morphism.prototype.isPrototypeOf(e))
				fn(e);
		});
	}
	clear()
	{
		Array.from(this.elements).reverse().map((a, i) => a[1].decrRefcnt());
		this.elements.clear();
	}
	static IsSink(ary)
	{
		if (ary.length < 2)		// just don't bother
			return false;
		if (!ary.reduce((r, m) => r && DiagramMorphism.prototype.isPrototypeOf(m), true))	// all morphisms
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
		if (!ary.reduce((r, m) => r && DiagramMorphism.prototype.isPrototypeOf(m), true))	// all morphisms
			return false;
		const domain = ary[0].domain.name;
		for(let i=1; i<ary.length; ++i)
		{
			if (ary[i].domain.name !== domain)
				return false;
		}
		return true;
	}
	static Get(diagram, user, basename)
	{
		const m = diagram.getElement(Element.Codename(diagram, basename));
		if (m)
			return m.codomain;
		return new Category(diagram, {user, basename});
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
		if ('code' in args)
			Object.defineProperty(this, 'code', {value:args.code,	writable:false});
		if (this.category)
			this.category.addElement(this);
		else if (diagram)
			this.diagram.codomain.addElement(this);
		this.codomain.incrRefcnt();
		this.domain.incrRefcnt();
		this.signature = this.getMorphismSignature();
	}
	getMorphismSignature()
	{
//		return U.sha256(`${this.domain.signature}${this.constructor.name}${this.name}${this.codomain.signature}`);
		return Morphism.Signature(this.domain, this.name, this.codomain);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() +
			H.p(this.diagram ? this.diagram.properName : '') +
			H.p(`Domain: ${this.domain.properName}`) +
			H.p(`Codomain: ${this.codomain.properName}`);
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
		if ('code' in this)
			a.code = U.clone(this.code);
		return a;
	}
	isIterable()
	{
		return this.domain.isIterable();
	}
	hasMorphism(mor, start = true)		// True if the given morphism is used in the construction of this morphism somehow or identical to it
	{
		return this.signature === mor.signature;
	}
	getGraph(data = {position:0})
	{
		return Sequence.Get(this.diagram, [this.domain, this.codomain]).getGraph(data);
	}
	hasInverse()
	{
		return false;	// fitb
	}
	getInverse()
	{
		return null;	// fitb
	}
	loadEquivalence(diagram)
	{
		const sig = this.signature;
		/*
if (R.sig2Item.has(sig))
{
	const alt = R.sig2Item.get(sig);
	console.log('sig2item', diagram.properName, this.properName, this === alt ? 'equals' : 'not equal',alt.properName);
	console.log('sig2item', this, alt);
	debugger;
}
*/
//if (R.sig2Leg.has(sig))debugger;
//if (R.equals.has(sig))debugger;
//		R.sig2Item.set(sig, this);
		R.sig2Leg.set(sig, [this]);
		R.equals.set(sig, new Set([sig]));
	}
	static Signature(domain, name, codomain)
	{
		return U.sha256(`${domain.signature} ${name} ${codomain.signature}`);
	}
}

class Identity extends Morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram ? diagram.getElement(args.domain) : args.domain;
		if ('codomain' in args && args.codomain)
			nuArgs.codomain = diagram ? diagram.getElement(args.codomain) : args.codomain;
		else
			nuArgs.codomain = nuArgs.domain;
		nuArgs.basename = Identity.Basename(diagram, nuArgs.domain, nuArgs.codomain);
//		nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : Identity.ProperName(nuArgs.domain, nuArgs.codomain);
		nuArgs.properName = Identity.ProperName(nuArgs.domain, nuArgs.codomain);
		super(diagram, nuArgs);
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
		g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
		g.tagGraph(this.constructor.name);
		return g;
	}
	static Basename(diagram, domain, codomain = null)
	{
		let basename = '';
		if (codomain && domain.name !== codomain.name)
			basename = `Id{${domain.name} ${codomain.name}}dI`;
		else
			basename = `Id{${domain.name}}dI`;
		return basename;
	}
	static Basename(diagram, domain, codomain = null)
	{
		let basename = '';
		if (codomain && domain.name !== codomain.name)
			basename = `Id{${domain.name},${codomain.name}}dI`;
		else
			basename = `Id{${domain.name}}dI`;
		return basename;
	}
	static Codename(diagram, domain, codomain = null)
	{
		return Element.Codename(diagram, Identity.Basename(diagram, domain, codomain));
	}
	static Get(diagram, dom, cod = null)
	{
		const domain = diagram.getElement(dom);
		const codomain = cod ? diagram.getElement(cod) : null;
		const name = Identity.Codename(diagram, domain, codomain);
		const m = diagram.getElement(name);
		return m ? m : new Identity(diagram, {name, domain, codomain});
	}
	static ProperName(domain, codomain = null)
	{
		return '1';
	}
}

class NamedObject extends CatObject	// name of an object
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		const source = diagram.getElement(args.source);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.source.incrRefcnt();
		this.idFrom= Identity.Get(diagram, this, this.source);
		this.idTo = Identity.Get(diagram, this.source, this);
//		if (this.constructor.name === 'NamedObject')
//			this.signature = this.source.signature;
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
	// TODO
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
		g.tagGraph(this.constructor.name);
		return g;
	}
	static Get(diagram, dom, basename)
	{
		const source = diagram.getElement(dom);
		const m = diagram.getElement(basename);
		return m ? m : new NamedObject(diagram, {basename, source});
	}
}

class NamedMorphism extends Morphism	// name of a morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		const source = diagram.getElement(nuArgs.source);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.source = source;
		this.source.incrRefcnt();
		if (this.constructor.name === 'NamedMorphism')
			this.signature = this.source.signature;
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
			this.source && this.source.decrRefcnt();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p('Named Morphism');
	}
	// TODO
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
		g.tagGraph(this.constructor.name);
		return g;
	}
	static Get(diagram, source, basename)
	{
		const m = diagram.getElement(source);
		const nm = diagram.getElement(basename);
		return nm ? nm : new NamedMorphism(diagram, {basename, source});
	}
}

class DiagramMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.index = true;
		nuArgs.basename = U.GetArg(args, 'basename', diagram.getAnon('anon' in args ? args.anon : 'm'));
		nuArgs.category = diagram.domain;
		super(diagram, nuArgs);
		this.incrRefcnt();
		this.flipName = U.GetArg(args, 'flipName', false);
		this.setMorphism(this.diagram.getElement(nuArgs.to));
		delete this.signature;
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
			if (this.diagram && this.diagram.isIsolated(this.domain))
				this.domain.decrRefcnt();
			if (this.diagram && this.diagram.isIsolated(this.codomain))
				this.codomain.decrRefcnt();
		}
	}
	json()
	{
		let mor = super.json();
		mor.flipName = this.flipName;
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
	getSVG(group = true)
	{
		this.predraw();
		const off = this.getNameOffset();
		if (isNaN(off.x) || isNaN(off.y))
			throw 'bad name offset';
		let svg =
`<g id="${this.elementId()}">
<path data-type="morphism" data-name="${this.name}" class="morphism grabbable" id="${this.elementId()}_path" d="M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}"
onmousedown="R.diagram.pickElement(event, '${this.name}')" marker-end="url(#arrowhead)"/>
<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_name'}" x="${off.x}" y="${off.y}"
onmousedown="R.diagram.pickElement(event, '${this.name}')">${this.to.properName}</text>`;
		svg += group ? '</g>' : '';
		return svg;
	}
	elementId()
	{
		return this.name.replace(/{}:/, '_');	// TODO check this
	}
	showSelected(state = true)
	{
		try
		{
			this.svg('_path').classList[state ? 'add' : 'remove']('selected');
			this.svg('_name').classList[state ? 'add' : 'remove']('selected');
			const svg = this.svg('_comp');
			if (svg)
				svg.classList[state ? 'add' : 'remove']('selected');
		}
		catch(x)
		{
		}
	}
	updateFusible(e, on)
	{
		const path = this.svg('_path');
		const name = this.svg('_name');
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
	}
	getBBox()
	{
		return D2.Merge(this.domain.getBBox(), this.codomain.getBBox());
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
			let cp1 = v.add(this.start.add(midpoint).scale(0.5)).round();
			let cp2 = v.add(this.end.add(midpoint).scale(0.5)).round();
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
		return m && m.to && this.to.signature === m.to.name;
	}
	setXY(ixy)
	{
debugger;
		const xy = D.Grid(ixy);
		const domXY = new D2(this.domain.getXY());
		this.domain.setXY(xy);
		let codXY = new D2(this.codomain.getXY()).add(xy.subtract(domXY));
		this.codomain.setXY(codXY);
		this.update();
	}
}

class DiagramComposite extends DiagramMorphism
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.morphisms = args.morphisms.map(m => diagram.domain.getElement(m));
		this.morphisms.map((m, i) =>
		{
			m.incrRefcnt();
			if (i !== this.morphisms.length)
				m.codomain.decorations.add(this);
		});
	}
	decrRefcnt()
	{
		if (this.refcnt <= 1)
			this.morphisms.map((m, i) =>
			{
				if (i !== this.morphisms.length)
					m.codomain.decorations.delete(this);
				m.decrRefcnt();
			});
		super.decrRefcnt();
	}
	json()
	{
		let mor = super.json();
		mor.morphisms = this.morphisms.map(m => m.name);
		return mor;
	}
	getSVG()
	{
		let svg = `<g id="${this.elementId()}">${super.getSVG(false)}`;
		const xy = D.Barycenter(this.morphisms);
		if (isNaN(xy.x) || isNaN(xy.y))
			throw 'Nan!';
		svg += `<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_comp'}" x="${xy.x}" y="${xy.y}"
	onmousedown="R.diagram.pickElement(event, '${this.name}')">${D.default.composite}</text></g>`;
		svg += '</g>';
		return svg;
	}
	update()
	{
		super.update();
		const svg = this.svg('_comp');
		const xy = D.Barycenter(this.morphisms);
		if (isNaN(xy.x) || isNaN(xy.y))
			throw 'NaN!';
		svg.setAttribute('x', xy.x);
		svg.setAttribute('y', xy.y);
	}
}

/*
class Associative extends Morphism
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.factors = args.factors;
	}
}

class ProductAssociative extends Associative
{
	constructor(diagram, args)
	{
		super(diagram, args);
	}
	static Codomain(diagram, domain, factors)
	{
	}
}
*/

class IndexCategory extends Category
{
	constructor(diagram, args)
	{
		super(diagram, args);
		Object.defineProperties(this,
		{
			'homSets': 		{value:new Map(), writable: false},
			'obj2morphs':	{value:new Map(), writable: false},
			'id':			{value:Number.parseInt(U.GetArg(args, 'id', 0)), writable: true},
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
		a.id = this.id;
		return a;
	}
	clear()
	{
		super.clear();
		this.id = 0;
	}
	makeHomSets()
	{
		this.homSets.clear();
		this.obj2morphs.clear();
		this.addHomSets();
	}
	addHomSets()
	{
		for(const [key, e] of this.elements)
		{
			if (Morphism.prototype.isPrototypeOf(e))
			{
				delete e.bezier;
				this.addHom(e);
				this.addHomDir(e, 'dom');
				this.addHomDir(e, 'cod');
			}
		}
		const initials = new Set;
		this.obj2morphs.forEach(function(morphs, o)
		{
			if (morphs.dom.length > 1)
				initials.add(o);
		});
		const legs = [];
//		const full = [];
		initials.forEach(function(o)
		{
			const morphs = this.obj2morphs.get(o);
			legs.push(...morphs.dom.map(m => [m]));
		}, this);
		const domLegs = new Map;
		const codLegs = new Map;
		while(legs.length > 0)
		{
			const leg = legs.pop();
			const dom = leg[0].domain;
			const cod = leg[leg.length -1].codomain;
			const morphs = this.obj2morphs.get(cod);
			if (morphs.cod.length > 1)			// potential full leg
			{
				if (!domLegs.has(dom))
					domLegs.set(dom, []);
				domLegs.get(dom).push(leg);
			}
			if (morphs.dom.length === 0)	// cannot continue
			{
			}
			else if (morphs.dom.length === 1)	// continue
			{
				const nuLeg = leg.slice();
				nuLeg.push(morphs.dom[0]);
				legs.push(nuLeg);	// TODO circularity test
			}
			else
			{
				morphs.dom.map(m =>
				{
					const nuLeg = leg.slice();
					nuLeg.push(m);
					legs.push(nuLeg);
				});	// TODO circularity test
			}
		}
		const cells = new Set;
		domLegs.forEach(function(legs, dom)		// for all domain legs...
		{
			legs.map((leg, i) =>			// for all legs ...
			{
				const cod = leg[leg.length -1].codomain;
				for (let j=i+1; j<legs.length; ++j)		// for all other legs ...
				{
					const altLeg = legs[j];
					const altDom = altLeg[0].domain;
					const altCod = altLeg[altLeg.length -1].codomain;
					if (dom.name === altDom.name && altCod.name === cod.name)
						leg.length < altLeg.length ? cells.add([leg, altLeg]) : cells.add([altLeg, leg]);
				}
			});
		});
		cells.forEach(function(c)
		{
			const left = c[0];
			const right = c[1];
			const firstLeft = left[0];
			if (left.length === 1 && DiagramComposite.prototype.isPrototypeOf(firstLeft) && firstLeft.morphisms.length === right.length && firstLeft.morphisms.reduce((r, m, i) => r && m.name === right[i].name, true))
			{
				// check for decoration
			}
			const leftSig = U.GetSignature('Composite', left.map(m => m.to));
			const rightSig = U.GetSignature('Composite', right.map(m => m.to));
			const equ = R.equals.get(leftSig);
			if (equ && equ.has(rightSig))
				console.log('equal legs', c, c[0].map(m => m.basename), '==', c[1].map(m => m.basename) );
		});
	}
	addHom(m)
	{
		const key = IndexCategory.HomKey(m.domain, m.codomain);
		if (!this.homSets.has(key))
			this.homSets.set(key, []);
		const a = this.homSets.get(key);
		a.push(m);
		const dualKey = IndexCategory.HomKey(m.codomain, m.domain);
		const dualLength = this.homSets.has(dualKey) ? this.homSets.get(dualKey).length : 0;
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
	getHomSet(domain, codomain)
	{
		const key = IndexCategory.HomKey(domain, codomain);
		return this.homSets.has(key) ? this.homSets.get(key) : [];
	}
	makeCells()
	{
		this.homSets.forEach(function(s, k)
		{
		});
	}
	static HomKey(domain, codomain)
	{
		return `${CatObject.prototype.isPrototypeOf(domain) ? domain.name : domain} ${CatObject.prototype.isPrototypeOf(codomain) ? codomain.name : codomain}`;
//		return [domain, codomain];
	}
}

class MultiMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		const morphisms = diagram.getElements(nuArgs.morphisms);
		Object.defineProperty(this, 'morphisms', {value:morphisms, writable:false});
		this.morphisms.map(m => m.incrRefcnt());
		this.signature = U.GetSignature(this.constructor.name, this.morphisms);
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
	canChangeProperName()
	{
		return false;
	}
}

class Composite extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.basename = Composite.Basename(diagram, morphisms);
		nuArgs.domain = Composite.Domain(morphisms);
		nuArgs.codomain = Composite.Codomain(morphisms);
		nuArgs.morphisms = morphisms;
// TODO		nuArgs.properName = 'properName' in args ? args.properName : Composite.ProperName(morphisms);
		nuArgs.properName = Composite.ProperName(morphisms);
		nuArgs.category = diagram.codomain;
		nuArgs.description = 'description' in args ? args.description : `The composite of ${morphisms.map(m => m.properName).join(', ')}.`;
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
	getFirstMorphism()
	{
		const m = this.morphisms[0];
		if (Composite.prototype.isPrototypeOf(m))
			return m.getFirstMorphism();
		return m;
	}
	loadEquivalence()
	{
		super.loadEquivalence();
		R.LoadEquivalence([this], this.morphisms);
	}
	static Basename(diagram, morphisms)
	{
		return `Cm{${morphisms.map(m => m.name).join(',')}}mC`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, Composite.Basename(diagram, morphisms));
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
		const m = diagram.getElement(name);
		return m ? m : new Composite(diagram, {morphisms});
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
//		const morphisms = MultiMorphism.GetMorphisms(diagram, args.morphisms);
		const morphisms = diagram.getElements(args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.basename = ProductMorphism.Basename(diagram, morphisms);
		nuArgs.domain = ProductMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = ProductMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
//		nuArgs.properName = 'properName' in args ? args.properName : ProductMorphism.ProperName(morphisms);
		nuArgs.properName = ProductMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Product'), helped);
	}
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		this.morphisms.map((m, i) =>
		{
			const pDom = FactorMorphism.Get(diagram, this.domain, [i]);
			const pCod = FactorMorphism.Get(diagram, this.codomain, [i]);
			R.LoadEquivalence([pCod, this], [m, pDom]);
		});
	}
	static Basename(diagram, morphisms)
	{
		return `Pm{${morphisms.map(m => m.name).join(',')}}mP`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, ProductMorphism.Basename(diagram, morphisms));
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
		const m = diagram.getElement(name);
		return m ? m : new ProductMorphism(diagram, {morphisms});
	}
	static ProperName(morphisms)
	{
		return MultiObject.ProperName('&times;', morphisms);
	}
}

class PullbackMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		const {index} = nuArgs;
		const domain = diagram.getElement(nuArgs.domain);
		nuArgs.basename = PullbackMorphism.Basename(diagram, domain, index);
		nuArgs.domain = domain;
		nuArgs.codomain = PullbackMorphism.Codomain(diagram, domain, index);
		nuArgs.properName = PullbackMorphism.ProperName(domain, index);
		super(diagram, nuArgs);
		this.index = index;
		this.signature = PullbackMorphism.Signature(this.domain, this.codomain, index);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		return super.help(helped) + H.p(`Pullback morphism to ${this.domain.properName}`);
	}
//	canSave()		// do not save, they are automatically reconstituted when the pullback object is created
//	{
//		return false;
//	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.index = this.index;
		return a;
	}
	canChangeProperName()
	{
		return false;
	}
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		const ndx = this.index;
		if (ndx > 0)
		{
			const base = [diagram.getElement(this.domain.cone[0]), this.domain.source[0]];
			const leg = [diagram.getElement(this.domain.cone[ndx]), this.domain.source[ndx]];
			R.LoadEquivalence(base, leg);
		}
	}
	static Basename(diagram, domain, index)
	{
		return `Pi{${domain.name}:${index}}iP`;
	}
	static Codename(diagram, domain, index)
	{
		return Element.Codename(diagram, PullbackMorphism.Basename(diagram, domain, index));
	}
	static Codomain(diagram, domain, index)
	{
		return domain.source[index].domain;
	}
	static Get(diagram, domain, index)
	{
		const name = PullbackMorphism.Codename(diagram, domain, index);
		const m = diagram.getElement(name);
		return m ? m : new PullbackMorphism(diagram, {domain, index});
	}
	static ProperName(domain, index)
	{
		return `&rho;${U.subscript(index)}`;
	}
	static Signature(domain, codomain, index)
	{
		return U.sha256(`${domain.signature} ${codomain.signature} ${index}`);
	}
}

class CoproductMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = diagram.getElements(args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.basename = CoproductMorphism.Basename(diagram, morphisms);
		nuArgs.domain = CoproductMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = CoproductMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = CoproductMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Coproduct'), helped);
	}
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		this.morphisms.map((m, i) =>
		{
			const iDom = CofactorMorphism.Get(diagram, this.domain, [i]);
			const iCod = CofactorMorphism.Get(diagram, this.codomain, [i]);
			R.LoadEquivalence([this, iDom], [iCod, m]);
		});
	}
	static Basename(diagram, morphisms)
	{
		return `Cm{${morphisms.map(m => m.name).join(',')}}mC`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, CoproductMorphism.Basename(diagram, morphisms));
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
		const m = diagram.getElement(name);
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
		nuArgs.morphisms = diagram.getElements(args.morphisms);
		nuArgs.domain = ProductAssembly.Domain(diagram, nuArgs.morphisms);
		nuArgs.codomain = ProductAssembly.Codomain(diagram, nuArgs.morphisms);
		nuArgs.basename = ProductAssembly.Basename(diagram, nuArgs.morphisms);
//		nuArgs.properName = 'properName' in args ? args.properName : ProductAssembly.ProperName(nuArgs.morphisms);
		nuArgs.properName = ProductAssembly.ProperName(nuArgs.morphisms);
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Product assembly'), helped);
	}
	getGraph(data = {position:0})
	{
		return this.mergeMorphismGraphs(graph);
	}
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		this.morphisms.map((m, i) =>
		{
			const pCod = FactorMorphism.Get(diagram, this.codomain, [i]);
			R.LoadEquivalence([m], [pCod, this]);
		});
	}
	static Basename(diagram, morphisms)
	{
		return `Pa{${morphisms.map(m => m.name).join(',')}}aP`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, ProductAssembly.Basename(diagram, morphisms));
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
		const m = diagram.getElement(name);
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
		nuArgs.morphisms = diagram.getElements(args.morphisms);
		nuArgs.basename = CoproductAssembly.Basename(diagram, nuArgs.morphisms);
		nuArgs.domain = CoproductAssembly.Domain(diagram, nuArgs.morphisms);
		nuArgs.codomain = CoproductAssembly.Codomain(diagram, nuArgs.morphisms);
//		nuArgs.properName = 'properName' in args ? args.properName : CoproductAssembly.ProperName(nuArgs.morphisms);
		nuArgs.properName = CoproductAssembly.ProperName(nuArgs.morphisms);
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Coproduct assembly'), helped);
	}
	getGraph(data = {position:0})
	{
		return this.mergeMorphismGraphs(graph)
	}
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		this.morphisms.map((m, i) =>
		{
			const iCod = CofactorMorphism.Get(diagram, this.domain, [i]);
			R.LoadEquivalence([m], [this, iCod]);
		});
	}
	static Basename(diagram, morphisms)
	{
		return `Ca{${morphisms.map(m => m.name).join(',')}}aC`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, CoproductAssembly.Basename(diagram, morphisms));
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
		const name = CoproductAssembly.Codename(diagram, morphisms);
		const m = diagram.getElement(name);
		return m ? m : new CoproductAssembly(diagram, {morphisms});
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
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.basename = FactorMorphism.Basename(nuArgs.domain, nuArgs.factors);
		nuArgs.codomain = FactorMorphism.Codomain(diagram, nuArgs.domain, nuArgs.factors);
		nuArgs.properName = FactorMorphism.ProperName(nuArgs.domain, nuArgs.factors);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.factors = nuArgs.factors;
		this.signature = this.getFactorSignature();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`Factor morphism: ${this.factors}`);
	}
	getFactorSignature()
	{
//		return U.sha256(`${Morphism.Signature(name)} ${this.factors.map(f => f.join('-')).join(':')}`);
		return FactorMorphism.Signature(this.domain, this.name, this.codomain, this.factors);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.factors = this.factors;
		return a;
	}
	canChangeProperName()
	{
		return false;
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
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		if (this.factors.length > 1)
		{
			this.factors.map((f, i) =>
			{
				const fm = FactorMorphism.Get(diagram, this.codomain, [i]);
				const base = FactorMorphism.Get(diagram, this.domain, this.factors[i]);
				R.LoadEquivalence([base], [fm, this]);
			});
		}
	}
	static Basename(domain, factors)
	{
		let basename = `Fa{${domain.name},`;
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = domain.getFactor(indices);
			if (TerminalObject.prototype.isPrototypeOf(f))	// TODO
				basename += '#1';
			else
				basename += f.name;
			if (i !== factors.length -1)
				basename += ',';
		}
		basename += '}aF';
		return basename;
	}
	static Codename(diagram, domain, factors)
	{
		return Element.Codename(diagram, FactorMorphism.Basename(domain, factors));
	}
	static Codomain(diagram, domain, factors)
	{
		return factors.length > 1 ? ProductObject.Get(diagram, factors.map(f => domain.getFactor(f))) : domain.getFactor(factors[0]);
	}
	static Get(diagram, domain, factors)
	{
		const name = FactorMorphism.Codename(diagram, domain, factors);
		const m = diagram.getElement(name);
		return m ? m : new FactorMorphism(diagram, {domain, factors});
	}
	static ProperName(domain, factors)
	{
		return `&lt;${factors.map(f => domain.getFactorProperName(f)).join(',')}&gt;`;
	}
	static Signature(domain, name, codomain, factors)
	{
//		return U.sha256(`${Morphism.Signature(name)} ${factors.map(f => f.join('-')).join(':')}`);
		return U.sha256(`${Morphism.Signature(domain, name, codomain)} ${factors.map(f => Array.isArray(f) ? f.join('-') : f).join(':')}`);
	}
}

class CofactorMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.codomain = diagram.getElement(args.codomain);
		nuArgs.basename = CofactorMorphism.Basename(nuArgs.codomain, nuArgs.factors);
		nuArgs.domain = CofactorMorphism.Domain(diagram, nuArgs.codomain, nuArgs.factors);
		nuArgs.properName = CofactorMorphism.ProperName(nuArgs.codomain, nuArgs.factors);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.factors = nuArgs.factors;
		this.signature = this.getFactorSignature();
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`Cofactor morphism: ${this.factors}`);
	}
	getFactorSignature()
	{
		return U.sha256(`${this.diagram.codomain.name} ${this.constructor.name} ${this.factors.map(f => Array.isArray(f) ? f.join('-') : f).join(':')}`);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.factors = this.factors;
		return a;
	}
	canChangeProperName()
	{
		return false;
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
			domain.bindGraph(true, {cod:codomain, link:[], tag:'cofactor', domRoot, codRoot:m.factors.length > 1 ? [1, i] : [1], offset});
		});
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static Basename(domain, factors)
	{
		let basename = `Ca{${domain.name},`;
		for (let i=0; i<factors.length; ++i)
		{
			const indices = factors[i];
			const f = domain.getFactor(indices);
			if (f.name !== '#1')	// TODO
//				basename += f.name + ',' + indices.join(',');
				basename += f.name + ',' + indices.toString();
			else
				basename += f.name;
			if (i !== factors.length -1)
				basename += ',';
		}
		basename += '}aC';
		return basename;
	}
	static Codename(diagram, domain, factors)
	{
		return Element.Codename(diagram, CofactorMorphism.Basename(domain, factors));
	}
	static Domain(diagram, domain, factors)
	{
		return factors.length > 1 ? CoproductObject.Get(diagram, factors.map(f => domain.getFactor(f))) : domain.getFactor(factors);
	}
	static Get(diagram, codomain, factors)
	{
		const name = CofactorMorphism.Codename(diagram, codomain, factors);
		const m = diagram.getElement(name);
		return m ? m : new CofactorMorphism(diagram, {codomain, factors});
	}
	static ProperName(codomain, factors)
	{
		return `&lt;${factors.map(f => codomain.getFactorProperName(f)).join(',')}&gt;`;
	}
}

class Diagonal extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.count = Number.parseInt(U.GetArg(args, 'count', 2));
		if (nuArgs.count < 2)
			throw 'count is not two or greater';
		nuArgs.codomain = Diagonal.Codomain(diagram, nuArgs.domain, nuArgs.count);
		nuArgs.basename = Diagonal.Basename(nuArgs.domain, nuArgs.count);
		nuArgs.properName = Diagonal.ProperName(nuArgs.domain, nuArgs.count)
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'count', {value:nuArgs.count,	writable:false});
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`Diagonal morphism of count ${this.count}`);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.count = this.count;
		return a;
	}
	canChangeProperName()
	{
		return false;
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
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		const id = Identity.Get(diagram, this.domain);
		for (let i=0; i<this.count; ++i)
		{
			const p = FactorMorphism.Get(diagram, this.codomain, [i]);
			R.LoadEquivalence([id], [p, this]);
		}
	}
	static Basename(domain, count)
	{
		return `Dm{${domain.name}/${count}}mD`;
	}
	static Codename(diagram, domain, count)
	{
		return Element.Codename(diagram, Diagonal.Basename(domain, count));
	}
	static Codomain(diagram, object, count)
	{
		return ProductObject.Get(diagram, Array(count).fill(object));
	}
	static Get(diagram, domain, count)
	{
		if (count < 2)
			throw 'Count is less than 2';
		const name = Diagonal.Codename(diagram, domain, count);
		const m = diagram.getElement(name);
		return m ? m : new Diagonal(diagram, {domain, count});
	}
	static ProperName(domain, count)
	{
		return '&Delta;';
	}
}

class FoldMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.codomain = diagram.getElement(args.codomain);
		nuArgs.count = Number.parseInt(U.GetArg(args, 'count', 2));
		if (nuArgs.count < 2)
			throw 'count is not two or greater';
		nuArgs.domain = FoldMorphism.Domain(diagram, nuArgs.codomain, nuArgs.count);
		nuArgs.basename = FoldMorphism.Basename(nuArgs.codomain, nuArgs.count);
		nuArgs.properName = FoldMorphism.ProperName(nuArgs.codomain, nuArgs.count)
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		Object.defineProperty(this, 'count', {value:nuArgs.count,	writable:false});
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help() + H.p(`FoldMorphism morphism of count ${this.count}`);
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.count = this.count;
		return a;
	}
	canChangeProperName()
	{
		return false;
	}
	getGraph(data = {position:0})
	{
		const graph = super.getGraph(data, first);
		const domain = graph.graphs[0];
		const codomain = graph.graphs[1];
		domain.map((g, i) => codomain.bindGraph({cod:g, link:[], domRoot:[0], codRoot:[1, i], offset:0}));
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	loadEquivalence(diagram)
	{
		super.loadEquivalence();
		const id = Identity.Get(diagram, this.codomain);
		for (let i=0; i<this.count; ++i)
		{
			const p = CofactorMorphism.Get(diagram, this.domain, [i]);
			R.LoadEquivalence([id], [this, p]);
		}
	}
	static Basename(codomain, count)
	{
		return `Fm{${codomain.name}/${count}}mF`;
	}
	static Codename(diagram, codomain, count)
	{
		return Element.Codename(diagram, FoldMorphism.Basename(codomain, count));
	}
	static Domain(diagram, object, count)
	{
		return CoproductObject.Get(diagram, Array(count).fill(object));
	}
	static Get(diagram, codomain, count)
	{
		if (count < 2)
			throw 'Count is less than 2';
		const name = FoldMorphism.Codename(diagram, codomain, count);
		const m = diagram.getElement(name);
		return m ? m : new FoldMorphism(diagram, {codomain, count});
	}
	static ProperName(domain, count)
	{
		return '&nabla;';
	}
}

class DataMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
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
			this.sig = this.getDataSignature();
	}
	getDataSignature()
	{
		let sig = this.getElementSignature();
		this.data.forEach(function(d, i)
		{
			sig = U.sha256(sig + U.sha256(i) + U.sha256(d));
		});
		if ('recursor' in this && typeof this.recursor !== 'string')
			sig = U.sha256(sig + this.recursor.signature);
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
			if (DiagramMorphism.prototype.isPrototypeOf(r) && DiagramMorphism.prototype.isPrototypeOf(f) && DataMorphism.prototype.isPrototypeOf(r.to))
				return f.to.hasMorphism(r.to);
		}
		return false;
	}
}

class LambdaMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const preCurry = typeof args.preCurry === 'string' ? diagram.codomain.getElement(args.preCurry) : args.preCurry;
		const nuArgs = U.clone(args);
		nuArgs.domain = LambdaMorphism.Domain(diagram, preCurry, args.domFactors);
		nuArgs.codomain = LambdaMorphism.Codomain(diagram, preCurry, args.homFactors);
		nuArgs.category = diagram.codomain;
		nuArgs.basename = LambdaMorphism.Basename(diagram, preCurry, args.domFactors, args.homFactors);
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
		return super.help() + H.p(`Lambda morphism of pre-curry ${this.preCurry.properName} and domain factors [${this.domFactors}] and codomain factors [${this.homFactors}]`);
	}
	getLambdaSignature()
	{
//		return U.sha256(`${this.diagram.codomain.name} ${this.preCurry.sig} ${U.a2s(this.domFactors)} ${U.a2s(this.homFactors)}`);
		return U.sha256(`${this.getMorphismSignature()} ${this.preCurry.sig} ${U.a2s(this.domFactors)} ${U.a2s(this.homFactors)}`);
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
		this.domFactors.map((f, i) => (dom.isLeaf() ? dom : dom.data[i]).copyGraph({map, src:preCurryGraph.getFactor(f)}));
		this.homFactors.map((f, i) => (homDom.isLeaf() ? homDom : homDom.data[i]).copyGraph({map, src:preCurryGraph.getFactor(f)}));
		homCod.copyGraph({map, src:preCurryGraph.graph.data[1]});
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static Basename(diagram, preCurry, domFactors, homFactors)
	{
		const preCur = diagram.codomain.getElement(preCurry);
		return `Lm{${preCur.name}:${U.a2s(domFactors)}:${U.a2s(homFactors)}}mL`;
	}
	static Codename(diagram, preCurry, domFactors, homFactors)
	{
		return Element.Codename(diagram, LambdaMorphism.Basename(diagram, preCurry, domFactors, homFactors));
	}
	static Domain(diagram, preCurry, factors)
	{
		const seq = ProductObject.Get(diagram, [preCurry.domain, preCurry.codomain]);
		const dom = ProductObject.Get(diagram, factors.map(f => seq.getFactor(f)));
		seq.decrRefcnt();
		return dom;
	}
	static Codomain(diagram, preCurry, factors)
	{
		const seq = ProductObject.Get(diagram, [preCurry.domain, preCurry.codomain]);
		const isCodHom = HomObject.prototype.isPrototypeOf(preCurry.codomain);
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
				codomain = HomObject.Get(diagram, [ProductObject.Get(diagram, objects), codomain]);
				objects = [];
				isProd = false;
			}
			else
				objects.push(seq.getFactor(f));
		}
		if (objects.length > 0)
			codomain = HomObject.Get(diagram, [ProductObject.Get(diagram, objects), codomain]);
		seq.decrRefcnt();
		return codomain;
	}
	static Get(diagram, preCurry, domFactors, homFactors)
	{
		const name = LambdaMorphism.Codename(diagram, preCurry, domFactors, homFactors);
		const m = diagram.getElement(name);
		return m ? m : new LambdaMorphism(diagram, {preCurry, domFactors, homFactors});
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
		const nuArgs = U.clone(args);
		nuArgs.basename = HomMorphism.Basename(diagram, morphisms);
		nuArgs.domain = HomMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = HomMorphism.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = HomMorphism.ProperName(morphisms);
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
	static Basename(diagram, morphisms)
	{
		return `Ho{${morphisms.map(m => m.name).join(',')}}oH`;
	}
	static Codename(diagram, morphisms)
	{
		return Element.Codename(diagram, HomMorphism.Basename(diagram, morphisms));
	}
	static Domain(diagram, morphisms)
	{
		return HomObject.Get(diagram, [morphisms[1].codomain, morphisms[0].domain]);
	}
	static Codomain(diagram, morphisms)
	{
		return HomObject.Get(diagram, [morphisms[1].domain, morphisms[0].codomain]);
	}
	static Get(diagram, morphisms)
	{
		const name = HomMorphism.Codename(diagram, morphisms);
		const m = diagram.getElement(name);
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
		const source = diagram.getElement(args.source);
		nuArgs.domain = source.domain;
		nuArgs.codomain = source.codomain;
		nuArgs.category = diagram.graphCat;
		super(diagram, nuArgs);
		this.source = source;
		this.graph = src.getGraph();	// a graph is like a net list between the ports
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('String morphism'));
	}
	isIterable()
	{
		return false;
	}
	json()
	{
		const a = super.json();
		delete a.properName;
		a.source = this.source.name;
		a.graph = this.graph;
		return a;
	}
	canChangeProperName()
	{
		return false;
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
				const lnkStr = lnk.toString();	// TODO use U.a2s?
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
				const idxStr = data.index.toString();	// TODO use U.a2s?
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
		const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
		this.updateSVG({index:[], dom, cod, visited:[], elementId:from.elementId()});
	}
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
		const s = graphCat.getElement(m.name);
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
		return `${lnk[0] === 0 ? dom : cod} ${lnk.slice(1).toString()}`;	// TODO use U.a2s?
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
		nuArgs.domain = diagram.getElement(args.domain);
		if (!Evaluation.CanEvaluate(nuArgs.domain))
			throw 'object for evaluation domain cannot be evaluated';
		nuArgs.basename = Evaluation.Basename(diagram, nuArgs.domain);
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
		domain.graphs[1].bindGraph({cod:domHom.graphs[0],	link:[], domRoot:[0, 1],	codRoot:[0, 0, 0],	offset:0});
		domHom.graphs[1].bindGraph({cod:codomain, 			link:[], domRoot:[0, 0, 1], codRoot:[1],		offset:0});
		graph.tagGraph(this.constructor.name);
		return graph;
	}
	static CanEvaluate(object)
	{
		return ProductObject.prototype.isPrototypeOf(object) &&
			object.objects.length === 2 &&
			HomObject.prototype.isPrototypeOf(object.objects[0]) &&
			object.objects[0].objects[0].isEquivalent(object.objects[1]);
	}
	static Basename(diagram, object)
	{
		return `Ev{${object.name}}vE`;
	}
	static Codename(diagram, object)
	{
		return Element.Codename(diagram, Evaluation.Basename(diagram, object));
	}
	static ProperName(object)
	{
		return 'e';
	}
	static Get(diagram, domain)
	{
		const name = Evaluation.Codename(diagram, domain);
		const m = diagram.getElement(name);
		return m ? m : new Evaluation(diagram, {domain});
	}
}

class InitialMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.codomain = diagram.getElement(args.codomain);
		nuArgs.domain = InitialObject.Get(diagram);
		nuArgs.basename = InitialMorphism.Basename(diagram, nuArgs.codomain);
		nuArgs.properName = InitialMorphism.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Initial morphism'));
	}
	isIterable()
	{
		return true;	// null iterator
	}
	static Basename(diagram, codomain)
	{
		return `In{${codomain.name}}nI`;
	}
	static Codename(diagram, codomain)
	{
		return Element.Codename(diagram, InitialMorphism.Basename(diagram, codomain));
	}
	static Get(diagram, codomain)
	{
		const name = InitialMorphism.Codename(diagram, codomain);
		const m = diagram.getElement(name);
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
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = TerminalObject.Get(diagram);
		nuArgs.basename = TerminalMorphism.Basename(diagram, nuArgs.domain);
		nuArgs.properName = TerminalMorphism.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	help(helped = new Set)
	{
		if (helped.has(this.name))
			return '';
		helped.add(this.name);
		return super.help(H.p('Terminal morphism'));
	}
	static Basename(diagram, domain)
	{
		return `Te{${domain.name}}eT`;
	}
	static Codename(diagram, domain)
	{
		return Element.Codename(diagram, TerminalMorphism.Basename(diagram, domain));
	}
	static Get(diagram, domain)
	{
		const name = TerminalMorphism.Codename(diagram, domain);
		const m = diagram.getElement(name);
		return m ? m : new TerminalMorphism(diagram, {domain, name, description:`terminal morphism from ${domain.properName}`});
	}
	static ProperName()
	{
		return '&#10034;';
	}
}

class Distribute extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = Distribute.Codomain(diagram, nuArgs.domain);
		nuArgs.basename = Distribute.Basename(diagram, nuArgs.domain);
//		nuArgs.properName = 'properName' in args ? args.properName : Distribute.ProperName();
		nuArgs.properName = Distribute.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.signature = this.getDistributeSignature();
	}
	getDistributeSignature()
	{
		return U.sha256(`distribute ${this.domain.signature} ${this.codomain.signature}`);
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
		return Dedistribute.Get(this.diagram, this.codomain);
	}
	static Basename(diagram, domain)
	{
		return `Di{${domain.name}}iD`;
	}
	static Codename(diagram, domain)
	{
		return Element.Codename(diagram, Distribute.Basename(diagram, domain));
	}
	static Get(diagram, domain)
	{
		const name = Distribute.Codename(diagram, domain);
		const m = diagram.getElement(name);
		return m ? m : new Distribute(diagram, {domain, name, description:`Distribution morphism`});
	}
	static HasForm(diagram, ary)
	{
		if (ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]))
		{
			const from = ary[0];
			const to = from.to;
			if (ProductObject.prototype.isPrototypeOf(to) && CoproductObject.prototype.isPrototypeOf(to.objects[1]))
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
		const objects = object.objects[1].objects.map(o => ProductObject.Get(diagram, [a, o]));
		return CoproductObject.Get(diagram, objects);
	}
}

class Dedistribute extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getElement(args.domain);
		nuArgs.codomain = Dedistribute.Codomain(diagram, nuArgs.domain);
		nuArgs.basename = Distribute.Basename(diagram, nuArgs.domain);
//		nuArgs.properName = 'properName' in args ? args.properName : Distribute.ProperName();
		nuArgs.properName = Distribute.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.signature = this.getDistributeSignature();
	}
	getDistributeSignature()
	{
		return U.sha256(`distribute ${this.domain.signature} ${this.codomain.signature}`);
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
		return Distribute.Get(this.diagram, this.codomain);
	}
	static Basename(diagram, domain)
	{
		return `De{${domain.name}}eD`;
	}
	static Codename(diagram, domain)
	{
		return Element.Codename(diagram, Dedistribute.Basename(diagram, domain));
	}
	static Get(diagram, domain)
	{
		const name = Dedistribute.Codename(diagram, domain);
		const m = diagram.getElement(name);
		return m ? m : new Dedistribute(diagram, {domain, name, description:`Distribution morphism`});
	}
	static HasForm(diagram, ary)
	{
		if (diagram.isEditable() && ary.length === 1 && DiagramObject.prototype.isPrototypeOf(ary[0]))
		{
			const from = ary[0];
			const to = from.to;
			if (CoproductObject.prototype.isPrototypeOf(to) && ProductObject.prototype.isPrototypeOf(to.objects[0]))
			{
				const s = to.objects[0].objects[0].signature;
				return to.objects.reduce((doit, o) => doit && ProductObject.prototype.isPrototypeOf(o) && o.objects[0].signature === s, true);
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
		const sum = CoproductObject.Get(diagram, objects);
		return ProductObject.Get(diagram, [a, sum]);
	}
}

class Functor extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
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
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.category = U.GetArg(args, 'category', (diagram && 'codomain' in diagram) ? diagram.codomain : null);
		if (!Category.prototype.isPrototypeOf(nuArgs.codomain))
			nuArgs.codomain = diagram ? diagram.getElement(nuArgs.codomain) : R.Cat;
		const indexName = `${nuArgs.basename}_Index`;
		nuArgs.domain = new IndexCategory(diagram, {basename:indexName, description:`index category for diagram ${nuArgs.name}`, user:nuArgs.user});
		super(diagram, nuArgs);
		this.elements = new Map;
		this.references = new Map;
		this.allReferences = new Map;
		if ('references' in args)
			args.references.map(r => this.addReference(r));
		this.domain.makeHomSets();
		this.selected = [];
		if ('viewport' in nuArgs)
			this.viewport = nuArgs.viewport;
		this.timestamp = U.GetArg(args, 'timestamp', Date.now());
		this.texts = new Map;
		if ('texts' in args)
			args.texts.map(d => new DiagramText(this, d));
		this.textId = U.GetArg(args, 'textId', 0);
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
		if ('elements' in nuArgs)
			this.codomain.process(this, nuArgs.elements, this.elements);
		if ('domainElements' in nuArgs)
			this.domain.process(this, nuArgs.domainElements);
		this.svgRoot = null;
		this.svgBase = null;
		this.assertions = new Map;
		this.elements.forEach(function(e)
		{
			Morphism.prototype.isPrototypeOf(e) && e.loadEquivalence(this);
		}, this);
		if ('assertions' in nuArgs)
			nuArgs.assertions.map(i =>
			{
				const a = new DiagramAssertion(this, i);
				a.incrRefcnt();
				a.loadEquivalence();
			});
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
		a.textId =		this.textId;
		a.timestamp =	this.timestamp;
		a.domainElements =	[];
		this.domain.elements.forEach(function(e)
		{
if (DiagramMorphism.prototype.isPrototypeOf(e) && !e.to)	// bypass corruption
	return;
			if (e.to.canSave())
				a.domainElements.push(e.json())
		});
		a.elements = [];
		this.elements.forEach(function(e)
		{
if (e.refcnt === 0)console.log('not saving',e.properName);
			if (e.canSave() && e.refcnt > 0)
				a.elements.push(e.json());
		});
		const texts = [];
		this.texts.forEach(function(t){texts.push(t.json())});
		a.texts = texts;
		a.assertions = [];
		this.assertions.forEach(function(assert, legs) { a.assertions.push(assert.json());	});
		return a;
	}
	getAnon(s)
	{
		while(true)
		{
			const basename = `${s}_${this.domain.id++}`;
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
		this.svgBase.innerHTML += element.getSVG();
	}
	update(save = true)
	{
		save && R.SaveLocal(this);
		R.diagram && D.diagramPanel.setToolbar(R.diagram);
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
	setView(x, y, s, anim = true)
	{
		if ('viewport' in this && this.viewport.anim)
		{
			return;
		}
		if ('viewport' in this)
		{
			this.svgTranslate.endElement();
			this.svgScale.endElement();
			const to = `${x} ${y}`;
			this.svgTranslate.setAttribute('to', to);
//			this.svgTranslate.setAttribute('dur', anim ? '0.5s' : '1ms');
			this.viewport.x = x;
			this.viewport.y = y;
			const fs = this.viewport.scale ? this.viewport.scale : 1.0;
			if (!('x' in this.viewport))
				this.svgScale.setAttribute('from', '0 0');
			this.svgScale.setAttribute('to', `${s} ${s}`);
//			this.svgScale.setAttribute('dur', anim ? '0.5s' : '1ms');
			this.viewport.scale = s;
			this.svgTranslate.beginElement();
			this.svgScale.beginElement();
			this.viewport.anim = true;
		}
	}
	mousePosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
	}
	deselectAll(toolbarOff = true)
	{
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
		if (R.default.debug)
			console.log('selected', elt.basename, elt);
		D.ShowToolbar(e);
	}
	addSelected(elt)
	{
		elt.showSelected();
		if (this.selected.indexOf(elt) >= 0)	// already selected
			return;
		this.selected.push(elt);
		if (DiagramObject.prototype.isPrototypeOf(elt) || DiagramText.prototype.isPrototypeOf(elt) || DiagramAssertion.prototype.isPrototypeOf(elt))
			elt.orig = {x:elt.x, y:elt.y};
		else if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			elt.domain.orig = {x:elt.domain.x, y:elt.domain.y};
			elt.codomain.orig = {x:elt.codomain.x, y:elt.codomain.y};
		}
	}
	removeSelected(elt)
	{
		const idx = this.selected.indexOf(elt);
		if (idx >= 0)
			this.selected.splice(idx, 1);
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
			D.dragStart = D.mouse.position();
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
	showString(from)
	{
		const id = StringMorphism.GraphId(from);
		if (StringMorphism.RemoveStringSvg(from))
			return;
		const graphFunctor = R.$CAT.getElement('Graph');
		const sm = graphFunctor.$$(this, from.to);
		const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
		const svg = `<g id="${id}">${sm.graph.svg(this, {index:[], dom, cod, visited:[], elementId:from.elementId(), color:Math.floor(Math.random()*12)})}</g>`;
		this.svgBase.innerHTML += svg;
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
			if (DiagramAssertion.prototype.isPrototypeOf(elt))
				continue;
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
			elt.update(delta.add(elt.orig));
			const homset = this.domain.obj2morphs.get(elt);
			if (typeof homset !== 'undefined')
			{
				homset.dom.map(m => m.update());
				homset.cod.map(m => m.update());
			}
		}, this);
	}
	placeText(e, xy, description, save = true)
	{
		const txt = new DiagramText(this, {description, xy});
		this.addSVG(txt);
		const bbox = new D2(txt.svg().getBBox());
		let offbox = new D2(bbox);
		while (this.hasOverlap(offbox, txt.name))
			offbox = offbox.add(D.default.stdOffset);
		txt.update(xy.add(offbox.subtract(bbox)));
		R.diagram && this.makeSelected(e, txt);
		this.update(save);
	}
	placeObject(e, to, ixy, save = true)
	{
		const xy = D.Grid(ixy ? ixy : D.Center(this));
		const from = new DiagramObject(this, {xy, to});
		this.addSVG(from);
		const bbox = new D2(from.svg().getBBox());
		let offbox = new D2(bbox);
		while (this.hasOverlap(offbox, from.name))
			offbox = offbox.add(D.default.stdOffset);
		from.update(xy.add(offbox.subtract(bbox)));
		if (save)
		{
			this.makeSelected(e, from);
			this.update(save);
			D.objectPanel.update();
		}
		return from;
	}
	placeMorphism(e, to, xyDom, xyCod, save = true)
	{
		const xyD = typeof xyDom !== 'undefined' ? new D2(D.Grid(xyDom)) : D.Center(this);;
		const domain = new DiagramObject(this, {to:to.domain, xy:xyD});
		const codomain = new DiagramObject(this, {to:to.codomain});
		const from = new DiagramMorphism(this, {to, domain, codomain});
		const tw = D.textWidth(to.domain.properName)/2 + D.textWidth(to.properName) + D.textWidth(to.codomain.properName)/2 + 2 * D.textWidth('&emsp;');
		let xyC = null;
		if (xyCod)
		{
			xyC = D.Grid(new D2(xyCod));
			const angle = D2.Angle(xyDom, xyCod);
			const xyCmin = D.Grid({x:xyD.x + Math.cos(angle) * tw, y:xyD.y + Math.sin(angle) * tw});
			if (xyD.dist(xyC) < xyD.dist(xyCmin))
				xyC = xyCmin;
			codomain.update(xyC);
		}
		else
		{
			xyC = new D2({x:xyD.x + Math.max(D.default.arrow.length, tw), y:xyD.y});
			codomain.update(xyCod);
		}
		save && this.domain.makeHomSets();
		this.addSVG(domain);
		this.addSVG(codomain);
		this.addSVG(from);
		const bbox = new D2(from.svg().getBBox());
		let offbox = new D2(bbox);
		while (this.hasOverlap(offbox, from.name))
			offbox = offbox.add(D.default.stdOffset);
		from.domain.update(xyD.add(offbox.subtract(bbox)));
		from.codomain.update(xyC.add(offbox.subtract(bbox)));
		from.update();
		R.diagram && this.makeSelected(e, from);
		this.update(save);
		R.diagram && D.morphismPanel.update();
		return from;
	}
	objectPlaceMorphism(e, dir, objName, morphName)
	{
		try
		{
			const to = this.getElement(morphName);
			const fromObj = this.domain.getElement(objName);
			const toObj = fromObj.to;
			if (!to[dir].isEquivalent(toObj))
				throw `Source and target do not have same signature: ${to[dir].properName} vs ${toObj.properName}`;
			const angles = [];
			this.domain.forEachMorphism(function(m)
			{
				if (Morphism.prototype.isPrototypeOf(m) && fromObj.name === m.domain.name)
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
			const tw = Math.abs(cosAngle) * D.textWidth(to.codomain.properName);
			const al = D.default.arrow.length;
			const xy = D.Grid({x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)});
			let domainElt = null;
			let codomainElt = null;
//			const newElt = new DiagramObject(this, {xy});
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
			this.domain.makeHomSets();
			this.addSVG(newElt);
			this.addSVG(from);
			from.update();
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
		for(const [name, from] of this.domain.elements)
		{
			if (!Morphism.prototype.isPrototypeOf(from))
				continue;
			if (from.domain.isEquivalent(object))
				domains.push(from);
			if (from.codomain.isEquivalent(object))
				codomains.push(from);
		}
		return {domains, codomains};
	}
	updateFusible(e)
	{
		let fusible = false;
		if (this.selected.length === 1)
		{
			const elt = this.getSelected();
			fusible = elt.isFusible(D.mouseover);
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
		const elts = this.svgBase.querySelectorAll('.object, .morphTxt, .morphism, .diagramText');
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
			this.svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			D.diagramSVG.appendChild(this.svgRoot);
			this.svgRoot.id = this.name;
			const base = this.name + ' base';
			this.svgRoot.innerHTML +=
`
<g>
<animateTransform id="${this.name} T" attributeName="transform" type="translate" dur="1ms" repeatCount="1" begin="indefinite" fill="freeze" easing="ease-in-out"/>
<g>
<animateTransform id="${this.name} S" attributeName="transform" type="scale" dur="1ms" repeatCount="1" begin="indefinite" fill="freeze" easing="ease-in-out"/>
<g id="${base}">
</g>
</g>
</g>
`;
			this.svgBase = document.getElementById(base);
			this.svgTranslate = document.getElementById(this.name + ' T');
			this.svgScale = document.getElementById(this.name + ' S');
			const that = this;
			this.svgTranslate.addEventListener('endEvent', function()
			{
				that.svgTranslate.setAttribute('from', `${that.viewport.x} ${that.viewport.y}`);
				that.svgScale.setAttribute('from', `${that.viewport.scale} ${that.viewport.scale}`);
				that.viewport.anim = false;
			});
			this.svgRoot.style.display = 'block';
		}
		let svg = '';
		const fn = function(t)
		{
			try
			{
				svg += t.getSVG();
			}
			catch(x)
			{
				console.log('makeSvg exception',t,x);
			}
		};
		this.domain.elements.forEach(fn);
		this.texts.forEach(fn);
		this.svgBase.innerHTML = svg;
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
	updateElementAttribute(from, attr, val)
	{
		const safe = U.HtmlEntitySafe(val);
		if (from)
		{
			const isMorphism = DiagramMorphism.prototype.isPrototypeOf(from);
			if (DiagramObject.prototype.isPrototypeOf(from) || isMorphism)
			{
				if (from.to)
				{
					from.to[attr] = safe;
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
				from[attr] = safe;
				const svg = from.svg();
				if (svg && attr === 'properName')
					svg.outerHTML = from.getSVG();
				D.textPanel.update();
			}
		}
	}
	editElementText(e, id, attr, fn = null)
	{
		const elt = document.getElementById(id);
		if (this.isEditable() && elt.contentEditable === 'true' && elt.textContent !== '')
		{
			const from = this.getSelected();
			elt.contentEditable = false;
			this.updateElementAttribute(from, attr, U.HtmlEntitySafe(elt.innerText));
			R.diagram.actionHtml(e, 'help');
			from && from.showSelected();
			if (fn)
				fn();
			R.SaveLocal(this);
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
			R.SaveLocal(this);
		}
	}
	updateMorphisms()
	{
		for(const [name, from] of this.domain.elements)
			if (Morphism.prototype.isPrototypeOf(from))
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
					sel1.getElement(sel0);
				const N = this.getElement('N');
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
			R.SaveLocal(this);
			D.Status(e, `Recursor for ${sel0.properName} has been set`);
		}
	}
	removeMorphism(e, name)
	{
		const m = this.codomain.getElement(name);
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
		let elt = this.domain.getElement(name);
		if (elt)
			return elt;
		if (this.elements.has(name))
			return this.elements.get(name);
		elt = this.codomain.getElement(name);
		if (elt)
			return elt;
		return this.texts.get(name);
	}
	getElements(ary)
	{
		return ary.map(e => this.getElement(e));
	}
	forEachObject(fn)
	{
		this.elements.forEach(function(e)
		{
			if (CatObject.prototype.isPrototypeOf(e))
				fn(e);
		});
	}
	forEachMorphism(fn)
	{
		this.elements.forEach(function(e)
		{
			if (Morphism.prototype.isPrototypeOf(e))
				fn(e);
		});
	}
	showStrings(e)
	{
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
		let exist = false;
		for(const [name, from] of this.domain.elements)
			if (Morphism.prototype.isPrototypeOf(from))
				exist = StringMorphism.RemoveStringSvg(from) || exist;
		if (exist)
			return;
		for(const [name, from] of this.domain.elements)
			if (Morphism.prototype.isPrototypeOf(from))
				this.showString(from);
		this.update(e, null, false, false);
	}
	/*
	getHomSet(dom, cod)		// TODO change to getIndexHomSet
	{
		const morphisms = [];
		for(const [name, from] of this.domain.elements)
		{
			if (Morphism.prototype.isPrototypeOf(from) &&
				(from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
				morphisms.push(from);
		}
		this.references.forEach(function(diagram, name)
		{
			for(const [name, from] of r.domain.elements)
			{
				if (Morphism.prototype.isPrototypeOf(from) &&
					(from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
					morphisms.push(from);
			}
		});
		return morphisms;
	}
	*/
	addWindowSelect(e)
	{
		const p = this.userToDiagramCoords(D.mouse.down);
		const q = D.mouse.diagramPosition(this);
		let selected = [];
		this.texts.forEach(function(t)
		{
			if (D2.Inside(p, t, q))
				selected.push(t);
		}, this);
		this.domain.elements.forEach(function(e)
		{
			if (DiagramMorphism.prototype.isPrototypeOf(e) && D2.Inside(p, e.domain, q) && D2.Inside(p, e.codomain, q))
				selected.push(e);
			else if (D2.Inside(p, e, q))
				selected.push(e);
		}, this);
		if (selected.length > 0)
			selected.map(e => this.addSelected(e));
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
			D.Status(e, `Diagram ${name} Javascript generated<br/>&#9201;${delta}ms`, true);
		}
	}
	downloadPNG()
	{
		D.Svg2canvas(D.topSVG, this.name, D.Download);
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
		const name = Diagram.prototype.isPrototypeOf(theName) ? theName.name : theName;
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
		R.SetDiagramInfo(this);
		this.allReferences = this.getAllReferenceDiagrams();
	}
	unlock(e)
	{
		if (this.user === R.user.name)
		{
			this.readonly = false;
			D.DiagramPanel.UpdateLockBtn(this);
		}
	}
	lock(e)
	{
		if (this.user === R.user.name)
		{
			this.readonly = true;
			D.DiagramPanel.UpdateLockBtn(this);
		}
	}
	clear()
	{
		this.domain.clear();
		Array.from(this.elements).reverse().map(a => a[1].decrRefcnt());
		this.texts.forEach(function(t) { t.decrRefcnt(); });
		this.elements.clear();
		this.update();
	}
	viewElement(name)
	{
		const e = this.getElement(name);
		this.setViewport(new D2(e.svg().getBBox()));
	}
	getObjects()
	{
		const objects = [];
		const fn = function(o)
		{
			objects.push(o);
		};
		this.forEachObject(fn);
		this.allReferences.forEach(function(cnt, name)
		{
			const diagram = R.$CAT.getElement(name);
			diagram.forEachObject(fn);
		});
		return objects;
	}
	addAssertion(leg0, leg1)
	{
		const elt = new DiagramAssertion(this, {leg0, leg1});
		this.addSVG(elt);
		return elt;
	}
	paste(e)
	{
		const refs = this.getAllReferenceDiagrams();
		if (!refs.has(D.pasteDiagram.name) && this !== D.pasteDiagram)
		{
			D.Statua(e, `Diagram ${D.pasteDiagram.properName} is not referenced by this diagram`);
			return;
		}
		const base = D.Barycenter(D.pasteBuffer);
		const pasteMap = new Map;
		const diagram = this;
		const mouse = D.mouse.diagramPosition(this);
		const pasteObject = function(o)
		{
			if (!pasteMap.has(o))
			{
				const xy = D.Grid(D2.Add(mouse, D2.Subtract(o.getXY(), base)));
				const copy = diagram.placeObject(e, o.to, xy, false);
				pasteMap.set(o, copy);
				return copy;
			}
			return pasteMap.get(o);
		}
		let objectUpdate = false;
		let morphismUpdate = false;
		let textUpdate = false;
		const pasteElement = function(elt)
		{
			let copy = null;
			switch(elt.constructor.name)
			{
				case 'DiagramAssertion':
					break;
				case 'DiagramComposite':
				case 'DiagramMorphism':
					const domain = pasteObject(elt.domain);
					const codomain = pasteObject(elt.codomain);
					const {to, flipName} = elt;
					copy = new DiagramMorphism(diagram, {domain, codomain, to, flipName});
					morphismUpdate = true;
					break;
				case 'DiagramObject':
				case 'DiagramPullback':
					copy = pasteObject(elt);
					objectUpdate = true;
					break;
				case 'DiagramText':
					const xy = D2.Add(mouse, D2.Subtract(edlt.getXY(), base));
					copy = new DiagramText(diagram, {xy, description:elt.description});
					textUpdate = true;
					break;
			}
			return copy;
		}
		const copies = D.pasteBuffer.map(e => pasteElement(e));
		if (textUpdate)
			D.textPanel.update();
		if (objectUpdate)
			D.objectPanel.update();
		if (morphismUpdate)
		{
			this.domain.makeHomSets();
			copies.map(e => DiagramMorphism.prototype.isPrototypeOf(e) ? this.addSVG(e) : null);
			D.morphismPanel.update();
		}
		this.deselectAll();
		copies.map(e => this.addSelected(e));
		D.ShowToolbar(e, mouse);
		this.update();
	}
	/*
	loadSignatures()
	{
		this.elements.forEach(function(e)
		{
			const sig = e.signature;
//			if (!R.sig2Item.has(sig))		// what object has this signature
//				R.sig2Item.set(sig, e);
			if (Morphism.prototype.isPrototypeOf(e))
			{
//				if (!R.sig2Leg.has(sig))	// remember all morphisms as a leg with one segment
//					R.sig2Leg(sig, [e]);
//				if (!R.equals.has(sig))		// set the sig equal to itself
//					R.equals.set(sig, new Set([sig]));
				if (Composite.prototype.isPrototypeOf(e))	// a composite has two equal legs
				{
				}
				else if (FactorMorphism.prototype.isPrototypeOf(e) && e.factors.length > 1)
				{
				}
				else if (ProductMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (CoproductMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (ProductAssembly.prototype.isPrototypeOf(e))
				{
				}
				else if (CoproductAssembly.prototype.isPrototypeOf(e))
				{
				}
				else if (Diagonal.prototype.isPrototypeOf(e))
				{
				}
				else if (FoldMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (DataMorphism.prototype.isPrototypeOf(e) && 'recursor' in e)	// recursive, no legs?
				{
				}
				else if (LambdaMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (HomMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (Evaluation.prototype.isPrototypeOf(e))
				{
				}
				else if (InitialMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (TerminalMorphism.prototype.isPrototypeOf(e))
				{
				}
				else if (Distribute.prototype.isPrototypeOf(e))
				{
				}
				else if (Dedistribute.prototype.isPrototypeOf(e))
				{
				}
			}
			else if (CatObject.prototype.isPrototypeOf(e))
			{
				if (PullbackObject.prototype.isPrototypeOf(e))
				{
					const legs = e.cone.map((m, i) => [e.source[i], e.cone[i]]);
					for (const i=1; i<legs.length; ++i)
						R.LoadEquivalence(legs[0], legs[i]);
				}
				else if (NamedObject.prototype.isPrototypeOf(e))
				{
					const srcId = Identity.Get(this, e.source);
					const namId = Identity.Get(this, e);
					R.LoadEquivalence([srcId], [namId, srcId])
					R.LoadEquivalence([objId], [srcId, namId])
				}
			}
			// skip:
			// namedMorphism:  handled by namedObject
			// pullbackMorphism:  handled by pullbackObject
		});
		this.assertions.forEach(function(a)
		{
			const {leftSig, rightSig} = R.LoadEquivalence(a.toLeg0, a.toLeg1);
			R.sig2Item(leftSig, a);
			R.sig2Item(rightSig, a);
		});
	}
	*/
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
}

R.protos =
{
	Category,
	CatObject,
	CofactorMorphism,
	Composite,
	CoproductObject,
	CoproductMorphism,
	CoproductAssembly,
	DataMorphism,
	Dedistribute,
	Diagonal,
	DiagramAssertion,
	DiagramComposite,
	DiagramMorphism,
	DiagramObject,
	DiagramPullback,
	DiagramText,
	Distribute,
	Evaluation,
	FactorMorphism,
	FiniteObject,
	FoldMorphism,
	HomObject,
	HomMorphism,
	Identity,
	IndexCategory,
	InitialObject,
	InitialMorphism,
	LambdaMorphism,
	Morphism,
	NamedObject,
	NamedMorphism,
	ProductObject,
	ProductMorphism,
	ProductAssembly,
	PullbackObject,
	PullbackMorphism,
	SubobjectClassifier,
	Sequence,
	TensorObject,
	TerminalObject,
	TerminalMorphism,
};

if (isGUI)
{
	window.R			= R;
	window.D			= D;
	window.U			= U;
	window.H			= H;
}

R.Initialize();	// boot-up

//})(typeof exports === 'undefined' ? this['Foobar'] = this.Cat : exports);
})()
