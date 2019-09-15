// (C) 2018-2019 Har
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
// 2-D vector support
//
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
	normalize(v)
	{
		const length = D2.Length(v);
		return new D2(v.x / length, v.y / length);
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
	//
	// static methods
	//
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
		return D2.Inner(D2.subtract(v, w));
	}
	static Dist(v, w)
	{
		return Math.sqrt(D2.Dist2(v, w));
	}
	static SegmentDistance(p, v, w)
	{
		const l2 = D2.dist2(v, w);
		if (l2 === 0)
			return D2.Dist(p, v);
		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		return D2.Dist(p, {x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y)});
	}
	static UpdatePoint(p, c, basePoint)
	{
		return D2.dist2(c, basePoint) < D2.dist2(p, basePoint) ? c : p;
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

//
// utilities
//
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
	static getError(err)
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
		if (null === o || 'object' !== typeof o || o instanceof Element || o instanceof Blob)
			return o;
//		let c = o.constructor();
		let c = {};
		for(const a in o)
			if (o.hasOwnProperty(a))
				c[a] = U.clone(o[a]);
		return c;
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
	static jsonAssoc(assoc)
	{
		let data = [];
		Object.keys(assoc).forEach(function(key)
		{
			data.push(assoc[key].json());
		});
		return data;
	}
	static jsonMap(map)
	{
		let data = {};
		for(const [key, val] of map)
			data[key] = val.json();
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
	//
	// merge array b to a
	//
	static arrayMerge(a, b)
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
	//
	// Set an argument in an associative array but not overwriting a previously set value.
	//
	static setArg(a, k, v)
	{
		if (k in a)
			return;
		a.k = v;
	}
}
Object.defineProperties(U,
{
	basenameEx:		{value:RegExp('^[a-zA-Z_]+[@a-zA-Z0-9_-]*[a-zA-Z]$'),	writable:false},
//	opEx:			{value:RegExp('^..{'),	writable:false},
	recentDiagram:	{value:{},		writable:false},
	secret:			{value:'0afd575e4ad6d1b5076a20bf53fcc9d2b110d3f0aa7f64a66f4eee36ec8d201f',	writable:false},
	userNameEx:		{value:RegExp('^[a-zA-Z_-]+[a-zA-Z0-9_]*$'),	writable:false},
	uploadLimit:	{value:1000000,	writable:false},
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

//
// runtime utilities and references
//
class R
{
	static CookieAccept()
	{
		if (U.secret !== U.getUserSecret(document.getElementById('cookieSecret').value))
		{
			alert('Your secret is not good enough');
			return;
		}
		localStorage.setItem('CateconCookiesAccepted', JSON.stringify(Date.now()));
		const intro = document.getElementById('intro');
		intro.parentNode.removeChild(intro);
		R.Initialize();	// boot-up
		R.cloud.onCT();
	}
	static HasAcceptedCookies()
	{
		return isGUI && localStorage.getItem('CateconCookiesAccepted') !== null;
	}
	static HasLocalDiagram(dgrmName)
	{
		return dgrmName in R.localDiagrams;
	}
	static getLocalDiagramList()
	{
		if (!isGUI)
			return {};
		R.localDiagrams = JSON.parse(localStorage.getItem('Cat.diagrams.local'));
		if (R.localDiagrams === null)
			R.localDiagrams = {};
		// TODO debug, clean-up, remove, eventually
		for (let d in R.localDiagrams)
			if (!localStorage.getItem(Diagram.StorageName(d)))
			{
				if (R.debug)
					console.log('getLocalDiagramList deleting', d);
				delete R.localDiagrams[d];
				R.saveLocalDiagramList();
			}
	}
	static saveLocalDiagramList()
	{
		isGUI && localStorage.setItem('Cat.diagrams.local', JSON.stringify(R.localDiagrams));
	}
// TODO unused
	static addToLocalDiagramList(dgrm)
	{
		if (dgrm.name in R.localDiagrams)
			return;
		R.localDiagrams[dgrm.name] = {name:dgrm.name, properName:dgrm.properName, timestamp:dgrm.timestamp, description:dgrm.description, user:dgrm.user};
		R.saveLocalDiagramList();
	}
	static removeFromLocalDiagramList(dgrmName)
	{
		if (R.HasLocalDiagram(dgrmName))
		{
			delete R.localDiagrams[dgrmName];
			R.saveLocalDiagramList();
		}
	}
	static deleteLocalDiagram(dgrmName)
	{
		try
		{
			isGUI && localStorage.removeItem(Diagram.StorageName(dgrmName));
			const diagram = R.Diagrams.getMorphism(dgrmName);
			if (diagram)
			{
				diagram.refcnt = 1;// FORCE DELETE
				diagram.decrRefcnt();
				R.Diagrams.removeMorphism(diagram);
				if (R.debug)
					console.log('delete local diagram', dgrmName);
			}
			R.removeFromLocalDiagramList(dgrmName);
		}
		catch(e)
		{
			D.recordError(e);
		}
	}
	/*
	clearLocalStorage()
	{
		//
		// Danger!
		//
		isGUI && localStorage.clear();
		if ($Cat !== null)
			R.diagram.deleteAll();
		R.localDiagrams = {};
	},
	*/
	static download(href, filename)
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
	static downloadString(string, type, filename)
	{
		const blob = new Blob([string], {type:`application/${type}`});
		R.download(D.url.createObjectURL(blob), filename);
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
	static setLocalStorageDiagramName()
	{
		localStorage.setItem(`Diagram default ${R.user.name} ${R.categoryName}`, R.diagram);
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
			if (isGUI)
			{
				U.autosave = true;
				R.getLocalDiagramList();
				D.Initialize();
			}
			R.compositeAction = new Action(null,
			{
				basename:		'composite',
				type:			'Composite',
				icon:
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const morphisms = diagram.getSelectedMorphisms();
					const to = Composite.Get(diagram, morphisms.map(m => m.to));
					const from = new DiagramMorphism(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms)});
					from.morphisms = morphisms;
					from.addSVG();
					this.update(e, from, true);
					diagram.update(e, from);
				},
				ProperName(ary)
				{
					return Composite.ProperName(ary);
				},
				hasForm(ary)
				{
					return Diagram.IsComposite(ary);
				},
			});
			//
			// top CAT
			//
			const CATargs =
			{
				basename:		'CAT',
				name:			'CAT',
				objects:		new Map(),
				morphisms:		new Map(),
				user:			'system',
				properName:		'CAT',
				description:	'top category',
			};
			const CAT = new Category(null, CATargs);
			//
			// top level diagram
			//
			const TLDargs =
			{
//				category:		null,		// bootstrap
				codomain:		CAT,
				basename:		'TLD',
				properName:		'TLD',
				description:	'top level diagram',
				getObject()
				{
					return R.Cat2;
				},
				user:			'system',
			};
			const TLD = new Diagram(null, TLDargs);

			/*
			const compositeAction = new Object();
			compositeAction.basename =			'composite';
			compositeAction.type =				'Composite';
			compositeAction.icon =
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`;
				//
				// assumes the diagram's selected set already has the proper form
				//
			compositeAction.action = function(e, diagram)
			{
				const morphisms = diagram.getSelectedMorphisms();
				const to = Composite.Get(diagram, morphisms.map(m => m.to));
				const from = new DiagramMorphism(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms)});
				from.morphisms = morphisms;
				from.addSVG();
				this.update(e, from, true);
			}
			compositeAction.ProperName = function(ary)
			{
				return Composite.ProperName(ary);
			}
			compositeAction.hasForm = function(ary)
			{
				return Diagram.IsComposite(ary);
			}
			{
				basename:			'composite',
				type:			'Composite',
				icon:
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const morphisms = diagram.getSelectedMorphisms();
					const to = Composite.Get(diagram, morphisms.map(m => m.to));
					const from = new DiagramMorphism(diagram, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms)});
					from.morphisms = morphisms;
					from.addSVG();
					this.update(e, from, true);
				},
				ProperName(ary)
				{
					return Composite.ProperName(ary);
				},
				hasForm(ary)
				{
					return Diagram.IsComposite(ary);
				},
			});
			*/
			//
			// natural transformations
			//
			R.Cat2 = new Category(TLD,
			{
				basename:		'Cat2',
				properName:		'ℂ𝕒𝕥𝟚',
			});
			R.$Cat2 = new Diagram(TLD,
			{
				basename:		'$Cat2',
				codomain:		'Cat2',
//				properName:		'&#x2102;&#x1D552;&#x1D565;',
				properName:		'ℂ𝕒𝕥𝟚',
				description:	'natural transfroms of functors on the category of smaller categories',
				user:			'system',
			});
			//
			// category of smaller cats
			//
			R.Cat = new Category(R.$Cat2,
			{
				basename:		'Cat',
				properName:		'ℂ𝕒𝕥',
			});
			R.$Cat = new Diagram(R.$Cat2,
			{
				basename:		'$Cat',
				codomain:		'Cat',
				properName:		'&#x2102;&#x1D552;&#x1D565;',
				description:	'diagram of currently loaded smaller categories',
				user:			'system',
			});
			//
			// discrete category of actions
			//
			R.Actions = new Category(R.$Cat2,
			{
				basename:		'Actions',
				properName:		'Actions',
				description:	'discrete category of currently loaded actions',
			});
			R.$Actions = new Diagram(R.$Cat2,
			{
				basename:		'$Actions',
				codomain:		'Actions',
				properName:		'Actions',
				description:	'diagram of currently loaded actions',
				user:			'system',
			});
			const productAction = new Action(R.$Actions,
			{
				basename:		'product',
				type:			'Product',
				icon:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					let from = null;
					const elt = diagram.getSelected();
					if (DiagramMorphism.prototype.isPrototypeOf(elt))
					{
						const diagramMorphisms = diagram.getSelectedMorphisms();
						const morphisms = diagramMorphisms.map(m => m.to);
						const to = ProductMorphism.Get(diagram, morphisms);
						to.incrRefcnt();
						from = diagram.trackMorphism(diagram.mousePosition(e), m);
						if (!e.shiftKey)
							diagramMorphisms.map(m => diagram.isIsolated(m) ? m.decrRefcnt() : null);
					}
					else if (DiagramObject.prototype.isPrototypeOf(elt))
					{
						const diagramObjects = diagram.getSelectedObjects();
						const objects = diagramObjects.map(o => o.to);
						const to = ProductObject.Get(diagram, objects);
						from = new DiagramObject(diagram, {xy:D.Barycenter(diagram.selected), to});
						from.addSVG();
						if (!e.shiftKey)
							diagramObjects.map(o => diagram.isIsolated(o) ? o.decrRefcnt() : null);
					}
					diagram.addSelected(e, from, true);
					diagram.update(e, from);
				},
				ProperName(ary)
				{
					return ProductObject.ProperName(ary);
				},
				hasForm(ary)
				{
					if (ary.length < 2)
						return false;
					//
					// currently we take all objects or all morphisms though one could turn objects into identities
					//
					return ary.reduce((s, v) => v && DiagramObject.prototype.isPrototypeOf(s), true) ||
						ary.reduce((s, v) => v && DiagramMorphism.prototype.isPrototypeOf(s), true);
				},
			});
			const coproductAction = new Action(R.$Actions,
			{
				basename:			'coproduct',
				type:			'Coproduct',
				icon:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="160" y1="80" x2="160" y2="240"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					let from = null;
					const elt = diagram.getSelected();
					if (DiagramMorphism.prototype.isPrototypeOf(elt))
					{
						const diagramMorphisms = diagram.getSelectedMorphisms();
						const morphisms = diagramMorphisms.map(m => m.to);
						const to = CoproductMorphism.Get(diagram, morphisms);
						to.incrRefcnt();
						from = diagram.trackMorphism(diagram.mousePosition(e), m);
						if (!e.shiftKey)
							diagramMorphisms.map(m => diagram.isIsolated(m) ? m.decrRefcnt() : null);
					}
					else if (DiagramObject.prototype.isPrototypeOf(elt))
					{
						const diagramObjects = diagram.getSelectedObjects();
						const objects = diagramObjects.map(o => o.to);
						const to = CoproductObject.Get(diagram, objects);
						from = new DiagramObject(diagram, {xy:D.Barycenter(diagram.selected), to});
						from.addSVG();
						if (!e.shiftKey)
							diagramObjects.map(o => diagram.isIsolated(o) ? o.decrRefcnt() : null);
					}
					diagram.addSelected(e, from, true);
					diagram.update(e, from);
				},
				ProperName(ary)
				{
					return CoproductObject.ProperName(ary);
				},
				hasForm(ary)
				{
					if (ary.length < 2)		// just don't bother
						return false;
					//
					// currently we take all objects or all morphisms though one could turn objects into identities
					//
					return ary.reduce((s, v) => v && DiagramObject.prototype.isPrototypeOf(s), true) ||
						ary.reduce((s, v) => v && DiagramMorphism.prototype.isPrototypeOf(s), true);
				},
			});
			const pullbackAction = new Action(R.$Actions,
			{
				basename:			'pullback',
				type:			'Pullback',
				icon:
`<path class="svgstr4" d="M60,120 120,120 120,60"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const diagramMorphisms = diagram.getSelectedMorphisms();
					const morphisms = diagramMorphisms.map(m => m.to);
					const to = PullbackObject.Get(diagram, {morphisms});
					const from = new DiagramObject(diagram, {xy:D.Barycenter(diagram.selected), to});
					diagram.addSelected(e, from, true);
					morphisms.map((m, i) =>
					{
						const legTo = PullbackMorphism.Get(diagram, {object:to, leg:m});
						const legFrom = new DiagramMorphism(diagram, {to:legTo, domain:from, codomain:diagramMorphisms[i].domain});
						diagram.addSelected(e, legFrom);
					});
					diagram.update(e, from);
				},
				ProperName(ary)
				{
					return PullbackObject.ProperName(ary);
				},
				hasForm(ary)
				{
					return Diagram.IsSink(ary);
				},
			});
			const pushoutAction = new Action(R.$Actions,
			{
				basename:			'pushout',
				type:			'Pushout',
				icon:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M200,260 200,200 260,200"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const diagramMorphisms = diagram.getSelectedMorphisms();
					const morphisms = diagramMorphisms.map(m => m.to);
					const to = PushoutObject.Get(diagram, {morphisms});
					const from = new DiagramObject(diagram, {xy:D.Barycenter(diagram.selected), to});
					diagram.addSelected(e, from, true);
					morphisms.map((m, i) =>
					{
						const legTo = PushoutMorphism.Get(diagram, {object:to, leg:m});
						const legFrom = new DiagramMorphism(diagram, {to:legTo, codomain:from, domain:diagramMorphisms[i].codomain});
						diagram.addSelected(e, legFrom);
					});
					diagram.update(e, from);
				},
				ProperName(ary)
				{
					return PushoutObject.ProperName(ary);
				},
				hasForm(ary)
				{
					return Diagram.IsSource(ary);
				},
			});
			const productAssemblyAction = new Action(R.$Actions,
			{
				basename:			'productAssembly',
				type:			'ProductAssembly',
				icon:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="80" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="60" y1="80" x2="120" y2="260" marker-end="url(#arrowhead)"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const diagramMorphisms = diagram.getSelectedMorphisms();
					const morphisms = diagramMorphisms.map(m => m.to);
					const m = ProductAssembly.Get(diagram, morphisms);
					diagram.objectPlaceMorphism(e, 'domain', diagramMorphisms[0].domain, m);
				},
				ProperName(ary)
				{
					return PushoutObject.ProperName(ary);
				},
				hasForm(ary)
				{
					return Diagram.IsSource(ary);
				},
			});
			const coproductAssemblyAction = new Action(R.$Actions,
			{
				basename:			'coproductAssembly',
				type:			'CoproductAssembly',
				icon:
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const diagramMorphisms = diagram.getSelectedMorphisms();
					const morphisms = diagramMorphisms.map(m => m.to);
					const m = CoproductAssembly.Get(diagram, morphisms);
					diagram.objectPlaceMorphism(e, 'codomain', diagramMorphisms[0].dcoomain, m);
				},
				ProperName(ary)
				{
					return PushoutObject.ProperName(ary);
				},
				hasForm(ary)
				{
					return Diagram.IsSource(ary);
				},
			});
			const homObjectAction = new Action(R.$Actions,
			{
				basename:			'hom',
				type:			'HomObject',
				icon:	// TODO
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,
				//
				// assumes the diagram's selected set already has the proper form
				//
				action(e, diagram)
				{
					const diagramMorphisms = diagram.getSelectedMorphisms();
					const morphisms = diagramMorphisms.map(m => m.to);
					const m = HomObject.Get(diagram, morphisms);
					// TODO
				},
				ProperName(ary)
				{
					return HomObject.ProperName(ary);
				},
				hasForm(ary)
				{
					return false;	// TODO
				},
			});
			R.Cat.actions.push(...
				[
					productAction,
					coproductAction,
					pullbackAction,
					pushoutAction,
					productAssemblyAction,
					coproductAssemblyAction,
					homObjectAction,
				]);
			R.SelectCategoryDiagram(R.LocalStorageCategoryName(),
				function()
				{
					U.initialized = true;
					D.UpdateDiagramDisplay(R.diagram);
				});
			R.GraphCat = new Category(R.$Cat, {basename:'Graph', user:'system', properName:'𝔾𝕣𝕒'});
			R.cloud.initialize();
			isGUI && D.UpdateNavbar();
			isGUI && D.panels.update();
			if (!isGUI)
			{
				exports.cloud =					R.cloud;
				exports.default =				D.default;
				exports.deleteLocalDiagram =	R.deleteLocalDiagram;
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
				window.R			= R;
				window.D			= D;
			}
		}
		catch(e)
		{
			D.recordError(e);
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
				D.recordError('Categories request failed.', response);
		});
	}
// TODO unused
	static getCategoryUsers(cat, fn = null)
	{
		fetch(R.cloud.getURL(cat) + `/users.json`).then(function(response)
		{
			if (response.ok)
				response.json().then(function(data)
				{
					cat.users = data;
					if (fn != null)
						fn(data);
				});
			else
				D.recordError(`Cannot get list of diagrams for category ${cat}`);
		});
	}
// TODO unused
	static deleteDiagram(cat, dgrmName)
	{
		alert('Not implemented!');
	}
// TODO unused?
	static fetchDiagrams(dgrms, refs, fn)
	{
		R.cloud.fetchDiagramJsons(dgrms, function(jsons)
		{
			jsons.map(j =>
			{
				const dgrm = new Diagram(R.$Cat, j);
				dgrm.saveLocal();
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
	static SelectCategoryDiagram(category, fn)
	{
		D.selectCategory(category, function()
		{
			let diagramName = R.GetLocalStorageDiagramName(category);
			if (diagramName === null)
				diagramName = 'Home';
			let diagram = R.$Cat.getMorphism(diagramName);
			if (!diagram && Diagram.ReadLocal(diagramName) === null)
			{
				const topDiagram = category === 'Cat' ? R.$Cat2 : R.$Cat;
				diagram = new Diagram(topDiagram, {basename:'Home', codomain:category, properName:'Home', description:'User home diagram', user:R.user.name});
				diagram.saveLocal();
			}
			D.selectDiagram(diagramName);
			fn && fn();
			D.panels.update();
			R.setLocalStorageDiagramName();
		});
	}
}
Object.defineProperties(R,
{
	//
	// Built-in categories and diagrams
	//
	Cat:				{value:null,	writable:true},
	Cat2:				{value:null,	writable:true},		// working nat trans
	Diagrams:			{value:null,	writable:true},		// loaded diagrams
	Actions:			{value:null,	writable:true},		// loaded actions
	Graph:				{value:null,	writable:true},		// loaded string graphs
	categoryName:		{value:'',		writable:true},		// current category's name
	category:			{value:null,	writable:true},		// current category
	compositeAction:	{value:null,	writable:true},		// the action all categories have
	diagramName:		{value:'',		writable:true},
	diagram:			{value:null,	writable:true},
	cloud:				{value:null,	writable:true},		// cloud we're using
	autosave:			{value:false,	writable:true},		// is autosave turned on for diagrams?
	catalog:			{value:{},		writable:true},
	clear:				{value:false,	writable:true},
	debug:				{value:true,	writable:true},		// Are we in debug mode to print messages on the console?
	initialized:		{value:false,	writable:true},		// Have we finished the boot sequence and initialized properly?
	localDiagrams:		{value:{},		writable:true},
	serverDiagrams:		{value:{},		writable:true},
	url:				{value:'',		writable:true},
	user:				{value:{name:'Anon', email:'anon@example.com', status:'unauthorized'},	writable:true},	// TODO fix after bootstrap removed	writable:true,
});

// TODO
class Cloud
{
	constructor()
	{}
}

class Amazon extends Cloud
{
	constructor()
	{
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
				D.recordError(`Cannot save category: ${err.message}`);
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
				D.recordError(`Cannot save diagram: ${err.message}`);
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
					D.UpdateNavbar();
					D.loginPanel.update();
					this.getUserDiagramsFromServer(function(dgrms)
					{
						if (R.debug)
							console.log('user diagrams on server',dgrms);
					});
					R.SelectCategoryDiagram(R.LocalStorageCategoryName(), function()
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
		const userName = document.getElementById('signupUserName').value;
		const email = document.getElementById('signupUserEmail').value;
		if (U.secret !== U.getUserSecret(document.getElementById('SignupSecret').value))
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
			D.UpdateNavbar();
			D.loginPanel.update();
			if (R.debug)
				console.log('user name is ' + this.user.getUsername());
		});
	}
	resetPassword()
	{
		const userName = document.getElementById('signupUserName').value;
		const email = document.getElementById('signupUserEmail').value;
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
			this.user = result.user;
			R.user.name = userName;
			R.user.email = email;
			R.user.status = 'registered';
			D.UpdateNavbar();
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
			D.UpdateNavbar();
			D.loginPanel.update();
		});
	}
	login()
	{
		const userName = document.getElementById('loginUserName').value;
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
					D.UpdateNavbar();
					D.loginPanel.update();
					D.morphismPanel.update();
					D.loginPanel.toggle();
					R.SelectCategoryDiagram(R.LocalStorageCategoryName(), function()
					{
						D.UpdateDiagramDisplay(R.diagram);
					});
					R.setLocalStorageDefaultCategory();
					R.setLocalStorageDiagramName();
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
		R.SelectCategoryDiagram(R.LocalStorageCategoryName(), function()
		{
			D.UpdateDiagramDisplay(R.diagram);
		});
		D.UpdateNavbar();
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
							D.recordError(error);
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
				D.recordError(error);
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
			D.status(e, 'CANNOT UPLOAD!<br/>Diagram too large!');
			return;
		}
		U.svg2canvas(D.topSVG, dgrm.name, function(url, filename)
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
					D.recordError(error);
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
		const someDiagrams = diagrams.filter(d => typeof d === 'string' && R.$Cat.getMorphism(d) === null);
		if (someDiagrams.length > 0)
			Promise.all(someDiagrams.map(d => this.fetchDiagram(d))).then(fetchedJsons =>
			{
				jsons.push(...fetchedJsons);
				fetchedJsons.map(j => {refs[j.name] = true; return true;});
				const nextRound = [];
				for (let i=0; i<fetchedJsons.length; ++i)
					nextRound.push(...fetchedJsons[i].references.filter(r => !(r in refs) && nextRound.indexOf(r) < 0));
				const filteredRound = nextRound.filter(d => typeof d === 'string' && R.$Cat.getMorphism(d) === null);
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
				D.recordError(error);
				return;
			}
			const payload = JSON.parse(data.Payload);
			payload.Items.map(i => R.serverDiagrams[i.subkey.S] = {timestamp:Number.parseInt(i.timestamp.N), description:i.description.S, properName:i.properName.S});
			D.diagramPanel.setUserDiagramTable();
			if (fn)
				fn(payload.Items);
		});
	}
}
R.cloud = new Amazon();

//
// Display
//
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
		D.UpdateNavbar();
		D.topSVG.addEventListener('mousemove', D.mousemove, true);
		D.topSVG.addEventListener('mousedown', D.mousedown, true);
		D.topSVG.addEventListener('mouseup', D.mouseup, true);
		D.uiSVG.style.left = '0px';
		D.uiSVG.style.top = '0px';
		D.upSVG.style.left = '0px';
		D.upSVG.style.top = '0px';
		D.Resize();
		D.upSVG.style.display = D.showUploadArea ? 'block' : 'none';
		D.addEventListeners();
		D.parenWidth = D.textWidth('(');
		D.commaWidth = D.textWidth(', ');
		D.bracketWidth = D.textWidth('[');
		D.diagramSVG =	document.getElementById('diagramSVG');
//		D.navbar =	document.getElementById('navbar');
		D.Panel = 			Panel;
		D.panels =			new Panels();
		D.categoryPanel =	new CategoryPanel();
		D.threeDPanel =		new ThreeDPanel();
		D.ttyPanel =		new TtyPanel();
		D.dataPanel =		new DataPanel();
		D.diagramPanel =	new DiagramPanel();
		D.helpPanel =		new HelpPanel();
		D.loginPanal =		new LoginPanel();
		D.morphismPanel =	new MorphismPanel();
		D.objectPanel =		new ObjectPanel();
		D.settingsPanel =	new SettingsPanel();
		D.textPanel =		new TextPanel();
		D.panels.update();
	}
	static mousedown(e)
	{
		D.mouseDown = true;
		D.mouse.down = {x:e.clientX, y:e.clientY};
		const dgrm = R.diagram;
		D.callbacks.map(f => f());
		D.callbacks = [];
		const pnt = dgrm.mousePosition(e);
		if (D.mouseover)
		{
			if (!dgrm.isSelected(D.mouseover) && !D.shiftKey)
				dgrm.deselectAll();
		}
		else
			dgrm.deselectAll();
		if (e.which === 2)
			D.tool = 'pan';
		if (D.tool === 'pan')
		{
			if (!D.drag)
			{
				dgrm.viewport.orig = U.clone(dgrm.viewport);
				if ('orig' in dgrm.viewport.orig)
					delete dgrm.viewport.orig.orig;
				D.dragStart = pnt;
				D.drag = true;
			}
		}
	}
	static mousemove(e)
	{
		D.mouse.xy = new D2({x:e.clientX, y:e.clientY});
		try
		{
			D.shiftKey = e.shiftKey;
			const dgrm = R.diagram;
			if (!dgrm)
				return;
			const xy = dgrm.mousePosition(e);
			if (D.drag)
			{
				D.deactivateToolbar();
				if (!dgrm.readonly && e.ctrlKey && dgrm.selected.length == 1 && D.fuseObject === null)
				{
					const from = dgrm.getSelected();
					D.mouseover = dgrm.findElement(xy, from.name);
					const isolated = from.refcnt === 1;
					//
					// create identity by dragging object
					//
					if (DiagramObject.prototype.isPrototypeOf(from))
					{
						const to = from.to;
						D.fuseObject = new DiagramObject(dgrm, {xy});
						dgrm.deselectAll();
						const id = Identity.Get(dgrm, to);
						const fromMorph = new DiagramMorphism(dgrm, {to:id, domain:from.name, codomain:D.fuseObject.name});
						fromMorph.incrRefcnt();
						D.fuseObject.addSVG();
						fromMorph.addSVG();
						fromMorph.update();
						from = D.fuseObject;
						dgrm.addSelected(e, D.fuseObject);
						from.setXY(xy);
						dgrm.saveLocal();
						dgrm.checkFusible(xy);
					}
					//
					// create a copy of a morphism
					//
					else if (DiagramMorphism.prototype.isPrototypeOf(from))
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
						D.fuseObject = fromCopy;
						dgrm.checkFusible(xy);
					}
				}
				else
				{
					const skip = dgrm.getSelected();
					D.mouseover = dgrm.findElement(xy, skip ? skip.name : '');
					switch(D.tool)
					{
					case 'select':
						if (!dgrm.readonly)
						{
							dgrm.updateDragObjects(xy);
							dgrm.checkFusible(xy);
						}
						break;
					case 'pan':
						const delta = dgrm.userToDiagramCoords(D.mouse.xy, true).subtract(D.dragStart).scale(dgrm.viewport.orig.scale);
						dgrm.viewport.x = dgrm.viewport.orig.x + delta.x;
						dgrm.viewport.y = dgrm.viewport.orig.y + delta.y;
						dgrm.setView();
						break;
					}
				}
			}
			else if (D.mouseDown === true)
			{
				D.mouseover = dgrm.findElement(xy);
				const x = Math.min(D.mouse.xy.x, D.mouse.down.x);
				const y = Math.min(D.mouse.xy.y, D.mouse.down.y);
				const width = Math.abs(D.mouse.xy.x - D.mouse.down.x);
				const height = Math.abs(D.mouse.xy.y - D.mouse.down.y);
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
			else
			{
				D.mouseover = dgrm.findElement(xy);
				const svg = document.getElementById('selectRect');
				if (svg)
					svg.parentNode.removeChild(svg);
			}
		}
		catch(e)
		{
			D.recordError(e);
		}
	}
	static mouseup(e)
	{
		D.mouseDown = false;
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
				if (diagram.selected.length === 1)
				{
					const dragObject = diagram.getSelected();
					let targetObject = dragObject.isEquivalent(D.mouseover) ? null : D.mouseover;
					if (targetObject !== null)
					{
						if (DiagramObject.prototype.isPrototypeOf(dragObject) && DiagramObject.prototype.isPrototypeOf(targetObject))
						{
							if (diagram.isIsolated(dragObject) && diagram.isIsolated(targetObject))
							{
								let to = null;
	//							if (e.shiftKey && cat.coproducts)
								//
								// coproduct with shift key
								//
								if (e.shiftKey && 'coproductFunctor' in cat)
	//								to = coproductObject.get(dgrm.codomain, [targetObject.to, dragObject.to]);
									to = cat.coproductFunctor.$(diagram, [targetObject.to, dragObject.to]);
								//
								// hom object with alt key
								//
								else if (e.altKey && ClosedMonoidalCategory.prototype.isPrototypeOf(cat))
	//								to = homObject.get(dgrm.codomain, [dragObject.to, targetObject.to]);
									to = cat.homFunctor.$(diagram, [dragObject.to, targetObject.to]);
								//
								// product
								//
								else if ('productFunctor' in cat)
	//								to = productObject.get(dgrm.codomain, [targetObject.to, dragObject.to]);
									to = cat.productFunctor.$(diagram, [targetObject.to, dragObject.to]);
								//
								// monoidal action
								//
								else if (MonoidalCategory.prototype.isPrototypeOf(cat))
									to = cat.monoidal.operator.$(diagram, [targetObject.to, dragObject.to]);
								else
									return;
								targetObject.setObject(to);
								diagram.deselectAll(false);
								targetObject.removeSVG();
								targetObject.addSVG();
								diagram.addSelected(e, targetObject);
								dragObject.decrRefcnt();
							}
							else if(diagram.canFuseObjects(dragObject, targetObject))
							{
								diagram.deselectAll();
								const morphisms = diagram.getObjectMorphisms(dragObject);
								if (morphisms.codomains.length > 0)
								{
									const from = morphisms.codomains[0];
									if (morphisms.codomains.length === 1 && morphisms.domains.length === 0 && Identity.prototype.isPrototypeOf(from.to) && !from.to.domain.isInitial)
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
												const to = R.Diagrams.getMorphism(`terminal-${diagram.codomain.name}`).$(diagram, from.to.domain);  // TODO fix this
												from.removeSVG();
												diagram.setMorphism(from, to);
												from.addSVG();
											}
											//
											// TODO ability to convert identity to some morphism?
											//
											else
											{
												const to = R.diagram.newDataMorphism(cod, toTargetObject);
												from.removeSVG();
												diagram.setMorphism(from, to);
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
								for(const [from, to] of diagram.morphisms)
								{
									if (from.domain.isEquivalent(dragObject))
									{
										from.domain.decrRefcnt();
										from.domain = targetObject;
										D.MergeObjectsRefCnt(diagram, dragObject, targetObject);
									}
									else if (from.codomain.isEquivalent(dragObject))
									{
										from.codomain.decrRefcnt();
										from.codomain = targetObject;
										D.MergeObjectsRefCnt(diagram, dragObject, targetObject);
									}
								}
								dragObject.decrRefcnt();
								diagram.update(e, null, true);
							}
						}
						else if (DiagramMorphism.prototype.isPrototypeOf(dragObject) && DiagramMorphism.prototype.isPrototypeOf(targetObject))
						{
							if (diagram.isIsolated(dragObject) && diagram.isIsolated(targetObject))
							{
								let to = null;
								//
								// coproduct with shift key
								//
								if (e.shiftKey && 'coproductFunctor' in cat)
									to = cat.coproductFunctor.$$(diagram, [targetObject.to, dragObject.to]);
								//
								// hom it with alt key
								//
								else if (e.altKey && ClosedMonoidalCategory.prototype.isPrototypeOf(cat))
									to = cat.homFunctor.$$(diagram, [dragObject.to, targetObject.to]);
								//
								// product
								//
								else if ('productFunctor' in cat)
									to = cat.productFunctor.$$(diagram, [targetObject.to, dragObject.to]);
								//
								// monoidal action
								//
								else if (MonoidalCategory.prototype.isPrototypeOf(cat))
									to = cat.monoidal.operator.$$(diagram, [targetObject.to, dragObject.to]);
								else
									return;
								targetObject.setObject(to);
								diagram.deselectAll(false);
								targetObject.removeSVG();
								targetObject.addSVG();
								diagram.addSelected(e, targetObject);
								dragObject.decrRefcnt();
							}
						}
						/*
						//
						// TODO * is monoidal
						//
						else if (diagram.codomain.hasProducts &&
							DiagramMorphism.prototype.isPrototypeOf(dragObject) &&
							DiagramMorphism.prototype.isPrototypeOf(targetObject) &&
							diagram.isIsolated(dragObject) &&
							diagram.isIsolated(targetObject))
						{
							diagram.deselectAll();
							const dragMorphTo = dragObject.to;
							const targetMorphTo = targetObject.to;
							const morphisms = [targetMorphTo, dragMorphTo];
							const newTo = ProductMorphism.Get(diagram, morphisms);
							newTo.incrRefcnt();
							diagram.placeMorphism(e, newTo, targetObject.domain, targetObject.codomain);
							dragObject.decrRefcnt();
							targetObject.decrRefcnt();
							targetObject.update();
						}
						*/
					}
				}
				if (!diagram.readonly)
					diagram.saveLocal();
			}
			else if (e.ctrlKey)
			{
			}
			else
				diagram.addWindowSelect(e);
			D.fuseObject = null;
		}
		catch(x)
		{
			D.recordError(x);
		}
		D.drag = false;
	}
	static drop(e)
	{
		try
		{
			e.preventDefault();
			D.drag = false;
			let cat = D.getCat();
			const diagram = R.diagram;
			if (diagram.readonly)
			{
				D.status(e, 'Diagram is not editable!');
				return;
			}
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
				to = diagram.getObject(name);
				from = new DiagramObject(diagram, {xy, to});
				break;
			case 'morphism':
				to = diagram.getMorphism(name);
				if (to === null)
					throw `Morphism ${name} does not exist in category ${cat.properName}`;
				const domain = new DiagramObject(diagram, {xy});
				const codLen = D.textWidth(to.domain.properName)/2;
				const domLen = D.textWidth(to.codomain.properName)/2;
				const namLen = D.textWidth(to.properName);
				const codomain = new DiagramObject(diagram,
					{
						xy:
						{
							x:pnt.x + Math.max(D.default.arrow.length, domLen + namLen + codLen + D.default.arrow.length/4),
							y:pnt.y
						}
					});
				from = new DiagramMorphism(diagram, {to, domain, codomain});
				from.incrRefcnt();	// TODO ???
				from.update();
				domain.addSVG();
				codomain.addSVG();
				break;
			}
			from.addSVG();
			diagram.update(e, from);
		}
		catch(err)
		{
			D.recordError(err);
		}
	}
	static deactivateToolbar()
	{
		D.toolbar.style.display = 'none';
	}
	static closeBtnCell(typeName)
	{
		return H.td(D.getButton('close', `D.${typeName}Panel.close()`, 'Close'), 'buttonBar');
	}
	static expandPanelBtn(panelName, right)
	{
		return H.td(D.getButton(right ? 'chevronLeft' : 'chevronRight', `D.${panelName}.expand()`, 'Expand'), 'buttonBar', `${panelName}-expandBtn`);
	}
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
			D.recordError(e);
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
	static downloadButton(txt, onclick, title, scale = D.default.button.small)
	{
		const html = H.span(D.SvgHeader(scale) + D.svg.download +
`<text text-anchor="middle" x="160" y="280" style="font-size:120px;stroke:#000;">${txt}</text>
${D.Button(onclick)}
</svg>`, '', '', title);
		return html;
	}
	//
	// get button by name
	//
	static getButton(buttonName, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let btn = D.svg[buttonName];
		return D.formButton(btn, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	}
	static formButton(btn, onclick, title, scale = D.default.button.small, addNew = false, id = null, bgColor = '#ffffff')
	{
		let button = btn;
		if (id !== null)
			button = `<g id="${id}">${button}</g>`;
		return H.span(D.SvgHeader(scale, bgColor) + button + (addNew ? D.svg.new : '') + D.Button(onclick) + '</svg>', '', id, title);
	}
	static UpdateNavbar()
	{
		const sz = D.default.button.large;
		const left = H.td(H.div(D.getButton('category', "D.categoryPanel.toggle()", 'Categories', sz))) +
			H.td(H.div(D.getButton('diagram', "D.diagramPanel.toggle()", 'Diagrams', sz))) +
			H.td(H.div(D.getButton('object', "D.objectPanel.toggle()", 'Objects', sz))) +
			H.td(H.div(D.getButton('morphism', "D.morphismPanel.toggle()", 'Morphisms', sz))) +
			H.td(H.div(D.getButton('functor', "D.functorPanel.toggle()", 'Functors', sz))) +
			H.td(H.div(D.getButton('transform', "D.transformPanel.toggle()", 'Transforms', sz))) +
			H.td(H.div(D.getButton('text', "D.textPanel.toggle()", 'Text', sz)));
		const right =
			H.td(H.div(D.getButton('cateapsis', "R.diagram.home()", 'Cateapsis', sz))) +
			H.td(H.div(D.getButton('string', "R.diagram.showStrings(evt)", 'Graph', sz))) +
			H.td(H.div(D.getButton('threeD', "D.threeDPanel.toggle();D.threeDPanel.resizeCanvas()", '3D view', sz))) +
			H.td(H.div(D.getButton('tty', "D.ttyPanel.toggle()", 'Console', sz))) +
			H.td(H.div(D.getButton('help', "D.helpPanel.toggle()", 'Help', sz))) +
			H.td(H.div(D.getButton('login', "D.loginPanel.toggle()", 'Login', sz))) +
			H.td(H.div(D.getButton('settings', "D.settingsPanel.toggle()", 'Settings', sz))) +
			H.td('&nbsp;&nbsp;&nbsp;');
		let navbar = H.table(H.tr(	H.td(H.table(H.tr(left), 'buttonBar'), 'w20', '', '', 'align="left"') +
									H.td(H.span('', 'navbar-inset', 'category-navbar'), 'w20') +
									H.td(H.span('Catecon', 'title'), 'w20') +
									H.td(H.span('', 'navbar-inset', 'diagram-navbar'), 'w20') +
									H.td(H.table(H.tr(right), 'buttonBar', '', '', 'align="right"'), 'w20')), 'navbarTbl');
		D.navbar.innerHTML = navbar;
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
		D.navbar.style.background = c;
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
	static addEventListeners()
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
				switch(e.keyCode)
				{
				case 32:	// 'space'
					D.tool = 'pan';
					break;
				case 36:	// 'home'
					R.diagram.home();
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
				const cat = dgrm.codomain;
				const xy = dgrm.userToDiagramCoords(D.mouse.xy);
				D.shiftKey = e.shiftKey;
				const plain = !(e.shiftKey || e.ctrlKey || e.altKey);
				const plainShift = e.shiftKey && !(e.ctrlKey || e.altKey);
				switch(e.keyCode)
				{
				case 32:	// 'space'
					if (plain)
					{
						D.tool = 'select';
						D.drag = false;
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
						D.threeDPanel.toggle();
					break;
				case 67:	// c
					if (plainShift)
						D.categoryPanel.toggle();
					break;
				case 68:	// d
					if (plainShift)
						D.diagramPanel.toggle();
					break;
				case 72:	// h
					if (plainShift)
						D.helpPanel.toggle();
					break;
				case 76:	// l
					if (plainShift)
						D.loginPanel.toggle();
					break;
				case 77:	// m
					if (plainShift)
						D.morphismPanel.toggle();
					break;
				case 79:	// O
					if (plain)
						D.objectdPanel.toggle();
					break;
				case 83:	// S
					if (plain)
						D.settingsPanel.toggle();
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
						const txt = new DiagramText(dgrm, {name:`Text${dgrm.textId++}`, diagram:dgrm, properName:'Lorem ipsum cateconium', xy});
						dgrm.texts.push(txt);
						dgrm.placeElement(e, txt);
					}
					else if (plain)
						D.textPanel.toggle();
					break;
				case 89:	// y
					if (plainShift)
						D.ttyPanel.toggle();
					break;
				}
				D.setCursor();
			}
		});
		document.addEventListener('wheel', function(e)
		{
			if (e.target.id === 'topSVG')
			{
				D.deactivateToolbar();
				let mouseInc = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
				const dgrm = R.diagram;
				let inc = Math.log(dgrm.viewport.scale)/Math.log(D.default.scale.base) + mouseInc;
				let nuScale = D.default.scale.base ** inc;
				nuScale = nuScale < D.default.scale.limit.min ? D.default.scale.limit.min : nuScale;
				nuScale = nuScale > D.default.scale.limit.max ? D.default.scale.limit.max : nuScale;
				dgrm.viewport.scale = nuScale;
				let pnt = {x:e.clientX, y:e.clientY};
				const dx = mouseInc * (1.0 - 1.0 / D.default.scale.base) * (pnt.x - dgrm.viewport.x);
				const dy = mouseInc * (1.0 - 1.0 / D.default.scale.base) * (pnt.y - dgrm.viewport.y);
				const s = D.default.scale.base;
				dgrm.viewport.x = dgrm.viewport.x - dx;
				dgrm.viewport.y = dgrm.viewport.y - dy;
				dgrm.setView();
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
	static status(e, msg)
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
			s.style.opacity = 1;
			s.style.display = 'block';
			D.statusXY = {x:e.clientX, y:e.clientY};
		}
		else
			D.recordError(msg);
		document.getElementById('tty-out').innerHTML += msg + "\n";
	}
	static grid(x)
	{
		const d = D.default.layoutGrid;
		switch (typeof x)
		{
		case 'number':
			return D.gridding ? d * Math.round(x / d) : x;
		case 'object':
			return {x:D.grid(x.x), y:D.grid(x.y)};
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
			btns += D.getButton(b);
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
									H.tr(H.td(H.button('OK', '', '', '', 'onclick=R.CookieAccept()'))) :
									H.tr(H.td(H.h4('Use Chrome to access', 'error')))), 'center') +
	//						H.table(btns.map(row => H.tr(row.map(b => H.td(D.getButton(b))).join(''))).join(''), 'buttonBar center') +
						H.table(H.tr(H.td(btns)), 'buttonBar center') +
						H.span('', '', 'introPngs') + '<br/>' +
						H.table(H.tr(H.td(H.small('&copy;2018-2019 Harry Dole'), 'left') + H.td(H.small('harry@harrydole.com', 'italic'), 'right')), '', 'footbar')
					, 'txtCenter');
		return html;
	}
	static recordError(err)
	{
		let txt = U.getError(err);
		console.log('Error: ', txt);
		if (isGUI)
		{
			if (typeof err === 'object' && 'stack' in err && err.stack != '')
				txt += H.br() + H.small('Stack Trace') + H.pre(err.stack);
			D.ttyPanel.errorElt.innerHTML += '<br/>' + txt;
			D.ttyPanel.open();
			Panel.AccordionOpen('errorOutPnl');
		}
		else
			process.exit(1);
	}
	static selectCategory(catName, fn)
	{
		R.categoryName = catName;
		R.setLocalStorageDefaultCategory();
		D.diagram = null;
		const nbCat = document.getElementById('category-navbar');
		const category = catName === 'Cat' ? R.$Cat : R.$Cat.getObject(catName);
		nbCat.innerHTML = category.properName;
		nbCat.title = U.cap(category.description);
		if (typeof fn === 'function')
			fn();
//		Category.FetchReferenceDiagrams(category, fn);
	}
	static selectDiagram(name, update = true)
	{
		D.deactivateToolbar();
		function setup(name)
		{
			R.diagramName = name;
			R.diagram = null;
			R.setLocalStorageDiagramName();
			if (update)
				D.UpdateDiagramDisplay(name);
		}
		if (R.$Cat.getMorphism(name))
			setup(name);
		else
			// TODO turn on/off busy cursor
			Diagram.FetchDiagram(name, setup);
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
		diagramPanel.setToolbar(R.diagram);
		R.diagram.update(null, null, true, false);
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
	static svg2canvas(svg, name, fn)
	{
		const copy = svg.cloneNode(true);
		D.copyStyles(copy, svg);
		const canvas = document.createElement('canvas');
		const bbox = svg.getBBox();
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
			ctx.drawImage(img, 0, 0);
			D.url.revokeObjectURL(url);
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
	// static methods
	//
	/*
	//
	// TODO unused?
	//
	static toolbarMorphism(form)
	{
		let td = '';
		if (form.composite)
			td += H.td(D.getButton('compose', `R.diagram.gui(evt, D, 'compose')`, 'Compose'), 'buttonBar');
		return td;
	}
	*/
	static OnEnter(e, fn)
	{
		if (e.key === 'Enter')
			fn(e);
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
					`${drag ? 'grabbable ' : ''}sidenavRow`, '', U.cap(m.description), drag ? `draggable="true" ondragstart="morphismPanel.drag(event, '${m.name}')" ${act}` : act);
		}
		return html;
	}
	static Barycenter(ary)
	{
		let elts = {};
		for(let i=0; i < ary.length; ++i)
		{
			const elt = ary[i];
			if (DiagramObject.prototype.isPrototypeOf(elt) || DiagramText.prototype.isPrototypeOf(elt))
				if (!(elt.name in elts))
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
}
Object.defineProperties(D,
{
	'callbacks':		{value: [],			writable: true},
	'category':			{value: null,		writable: true},
	'commaWidth':		{value: 0,			writable: true},
	'bracketWidth':		{value: 0,			writable: true},
	'categoryPanel':	{value: null,	writable: true},
	'threeDPanel':		{value: null,	writable: true},
	'ttyPanel':			{value: null,	writable: true},
	'dataPanel':		{value: null,	writable: true},
	'default':
	{
		value:
		{
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
		writable:		false,
	},
	'diagram':			{value: null,		writable: true},
	'diagramSVG':		{value: null,		writable: true},
	'diagramPanel':		{value: null,	writable: true},
	'drag':				{value: false,		writable: true},
	'dragStart':		{value: new D2,		writable: true},
	'fuseObject':		{value: null,		writable: true},
	'gridding':			{value: true,		writable: true},
	'helpPanel':		{value: null,	writable: true},
	'id':				{value: 0,			writable: true},
	'loginPanal':		{value: null,	writable: true},
	'morphismPanel':	{value: null,	writable: true},
	'mouse':			{
							value:
							{
								down:new D2,
								xy:new D2,
							},
							writable: true,
						},
	'mouseDown':		{value: false,		writable: true},
	'mouseover':		{value: null,		writable: true},
	'navbar':			{value: document.getElementById('navbar'),		writable: false},
	'objectPanel':		{value: null,		writable: true},
	'Panel':			{value: null,		writable: true},
	'panels':			{value: null,		writable: true},
	'settingsPanel':	{value: null,		writable: true},
	'shiftKey':			{value: false,		writable: true},
	'showRefcnts':		{value: true,		writable: true},
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
	'textPanel':		{value: null,	writable: true},
	'tool':				{value: 'select',	writable: true},
	'toolbar':			{value: document.getElementById('toolbar'),		writable: false},
	'topSVG':			{value: document.getElementById('topSVG'),		writable: false},
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
			/*
compose:
`<line class="arrow9" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
*/
chevronLeft:
`<path class="svgfilNone svgstr1" d="M120,40 80,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 160,160 200,280"/>`,
chevronRight:
`<path class="svgfilNone svgstr1" d="M120,40 160,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 240,160 200,280"/>`,
close:
`<line class="arrow0 str0" x1="40" y1="40" x2="280" y2= "280" />
<line class="arrow0 str0" x1="280" y1="40" x2="40" y2= "280" />`,
			/*
coproduct:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="160" y1="80" x2="160" y2="240"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160"/>`,
coproductAssembly:
`<line class="arrow0" x1="60" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="280" x2="280" y2="100" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="120" y1="260" x2="240" y2="100" marker-end="url(#arrowhead)"/>`,
*/
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
			/*
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
*/
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
			/*
product:
`<circle class="svgstr4" cx="160" cy="160" r="80"/>
<line class="arrow0" x1="103" y1="216" x2="216" y2="103"/>
<line class="arrow0" x1="216" y1="216" x2="103" y2="103"/>`,
productAssembly:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="80" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="60" y1="80" x2="120" y2="260" marker-end="url(#arrowhead)"/>`,
*/
project:
`<circle cx="60" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="110" y1="120" x2="240" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="160" x2="280" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="110" y1="200" x2="240" y2="280" marker-end="url(#arrowhead)"/>`,
			/*
pullback:
`<path class="svgstr4" d="M60,120 120,120 120,60"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
pushout:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M200,260 200,200 260,200"/>`,
*/
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
		writable:	false,
	},
});

//
// Panels
//
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

class Panel
{
	constructor(name, right = false, width = D.default.panel.width)
	{
		this.name = name;
		this.width = width;
		this.right = right;
		this.elt = document.getElementById(`${this.name}-sidenav`);
		this.expandBtnElt = document.getElementById(`${this.name}-expandBtn`);
		D.panels.panels[this.name] = this;
	}
	collapse()
	{
		this.elt.style.width = this.width + 'px';
		this.expandBtnElt.innerHTML = D.getButton(this.right ? 'chevronLeft' : 'chevronRight', `D.${this.name}.expand()`, 'Collapse');
	}
	expand()
	{
		this.elt.style.width = 'auto';
		this.expandBtnElt.innerHTML = D.getButton(this.right ? 'chevronRight' : 'chevronLeft', `$D.{this.name}.collapse()`, 'Expand');
	}
	open()
	{
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
	//
	// override as necessary
	//
	update()
	{}
	//
	// Panel static methods
	//
	static AccordionToggle(btn, pnlId)
	{
		btn.classList.toggle('active');
		const elt = document.getElementById(pnlId);
		elt.style.display = elt.style.display === 'block' ? 'none' : 'block';
	}
	static AccordionOpen(pnlId)
	{
		const elt = document.getElementById(pnlId);
		elt.style.display = 'block';
	}
	static AccordionClose(pnlId)
	{
		const elt = document.getElementById(pnlId);
		elt.style.display = 'none';
	}
	static AccordionPanelDyn(header, action, panelId, title = '', buttonId = '')
	{
		return H.button(header, 'sidenavAccordion', buttonId, title, `onclick="${action};Panel.AccordionToggle(this, \'${panelId}\')"`) +
				H.div('', 'accordionPnl', panelId);
	}
}

//
// CategoryPanel is a Panel on the left
//
class CategoryPanel extends Panel
{
	constructor()
	{
		super('category');
		this.elt.innerHTML =
			H.table(H.tr(D.closeBtnCell('category', false)), 'buttonBarRight') +
			H.h3('Categories') + H.div('', '', 'categoryTbl') +
			H.button('New Category', 'sidenavAccordion', '', 'New Category', `onclick="D.Panel.AccordionToggle(this, \'newCategoryPnl\')"`) +
			H.div(H.table(
				H.tr(H.td(D.Input('', 'categoryName', 'Name')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'categoryProperName', 'HTML Entities')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'categoryDescription', 'Description')), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasProducts', '', '', 'in100', 'checkbox') + '<label for="hasProducts">Products</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasCoproducts', '', '', 'in100', 'checkbox') + '<label for="hasCoproducts">Coproducts</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'isClosed', '', '', 'in100', 'checkbox') + '<label for="isClosed">Closed</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasPullbacks', '', '', 'in100', 'checkbox') + '<label for="hasPullbacks">Pullbacks</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'hasPushouts', '', '', 'in100', 'checkbox') + '<label for="hasPushouts">Pushouts</label>', 'left'), 'sidenavRow') +
				H.tr(H.td(D.Input('', 'allObjectsFinite', '', '', 'in100', 'checkbox') + '<label for="allObjectsFinite">Finite objects</label>', 'left'), 'sidenavRow'),
					'sidenav') +
			H.span(D.getButton('edit', 'CategoryPanel.Create()', 'Create new category')) + H.br() +
			H.span('', 'error', 'categoryError'), 'accordionPnl', 'newCategoryPnl');
		this.categoryTbl = document.getElementById('categoryTbl');
		this.errorElt = document.getElementById('categoryError');
		this.basenameElt = document.getElementById('categoryBasename');
		this.properNameElt = document.getElementById('categoryProperName');
		this.descriptionElt = document.getElementById('categoryDescription');
	}
	update()
	{
		const cats = [];
		if (R.Cat)
			for(const [catName, cat] of R.Cat.objects)
				cats.push(cat);
		this.categoryTbl.innerHTML = H.table(cats.map(c => H.tr(H.td(`<a onclick="R.SelectCategoryDiagram('${c.name}')">${c.properName}</a>`), 'sidenavRow')).join(''));
	}
	create()
	{
		try
		{
			this.errorElt.innerHTML = '';
			const basename = this.basenameElt.value;
			if (basename === '')
				throw 'Category name must be specified.';
			if (!RegExp(U.nameEx).test(basename))
				throw 'Invalid category name.';
			const cat = new Category(R.$Cat, {basename, properName:this.properNameElt.value, description:this.descriptionElt.value});
			if (document.getElementById('hasProducts').checked)
				cat.actions.push(productAction, productAssemblyAction);
			if (document.getElementById('hasCoproducts').checked)
				cat.actions.push(coproductAction, coproductAssemblyAction);
			if (document.getElementById('hasPullbacks').checked)
				cat.actions.push(pullbackAction);
			if (document.getElementById('hasPushouts').checked)
				cat.actions.push(pushoutAction);
			if (document.getElementById('isClosed').checked)
				cat.actions.push(homObjectAction);
		}
		catch(err)
		{
			this.errorElt.innerHTML = 'Error: ' + U.getError(err);
		}
	}
}

//
// ThreeDPanel is a Panel on the right
//
class ThreeDPanel extends Panel
{
	constructor()
	{
		super('threeD', true);
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
		this.elt.innerHTML = H.table(H.tr(D.closeBtnCell('threeD', false) +
								D.expandPanelBtn('threeD', true) +
							H.td(D.getButton('delete', 'threeD.initialize()', 'Clear display'), 'buttonBar') +
							H.td(D.getButton('threeD_left', `D.threeD.view('left')`, 'Left'), 'buttonBar') +
							H.td(D.getButton('threeD_top', `D.threeD.view('top')`, 'Top'), 'buttonBar') +
							H.td(D.getButton('threeD_back', `D.threeD.view('back')`, 'Back'), 'buttonBar') +
							H.td(D.getButton('threeD_right', `D.threeD.view('right')`, 'Right'), 'buttonBar') +
							H.td(D.getButton('threeD_bottom', `D.threeD.view('bottom')`, 'Bottom'), 'buttonBar') +
							H.td(D.getButton('threeD_front', `D.threeD.view('front')`, 'Front'), 'buttonBar')
							), 'buttonBarLeft') +
						H.div('', '', 'threeDiv');
		this.threeDiv = document.getElementById('threeDiv');
		this.initialize();
//		this.animate();
	}
	initialize()
	{
		try
		{
			this.bbox =
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
			D.recordError(e);
		}
	}
	animate()
	{
		D.threeDPanel.resizeCanvas();
		requestAnimationFrame(this.animate);
		D.threeDPanel.renderer.setViewport(0, 0, this.threeDiv.clientWidth, this.threeDiv.clientHeight);
		D.threeDPanel.renderer.render(this.scene, this.camera);
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
		this.elt.style.width = '100%';
		this.expandBtnElt.innerHTML = D.getButton('chevronRight', `D.threeDPanel.collapse(true)`, 'Expand');
		this.resizeCanvas();
	}
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
	}
}

//
// TtyPanel is a Panel on the right
//
class TtyPanel extends Panel
{
	constructor()
	{
		super('tty', true);
		this.elt.innerHTML =
			H.table(H.tr(D.closeBtnCell('tty', false) + D.expandPanelBtn('tty', true)), 'buttonBarLeft') +
			H.h3('TTY') +
			H.button('Output', 'sidenavAccordion', '', 'TTY output from some composite', `onclick="D.Panel.AccordionToggle(this, \'ttyOutPnl\')"`) +
			H.div(
				H.table(H.tr(
					H.td(D.getButton('delete', `tty.ttyOut.innerHTML = ''`, 'Clear output'), 'buttonBar') +
					H.td(D.downloadButton('LOG', `R.downloadString(tty.out.innerHTML, 'text', 'console.log')`, 'Download tty log file'), 'buttonBar')), 'buttonBarLeft') +
				H.pre('', 'tty', 'tty-out'), 'accordionPnl', 'ttyOutPnl') +
			H.button('Errors', 'sidenavAccordion', '', 'Errors from some action', `onclick="D.Panel.AccordionToggle(this, \'errorOutPnl\')"`) +
			H.div(H.table(H.tr(
					H.td(D.getButton('delete', `tty.out.innerHTML = ''`, 'Clear errors')) +
					H.td(D.downloadButton('ERR', `R.downloadString(tty.error.innerHTML, 'text', 'console.err')`, 'Download error log file'), 'buttonBar')), 'buttonBarLeft') +
				H.span('', 'tty', 'tty-error-out'), 'accordionPnl', 'errorOutPnl');
		this.out = document.getElementById('tty-out');
		this.errorElt = document.getElementById('tty-error-out');
	}
}

//
// DataPanel is a Panel on the right
//
class DataPanel extends Panel
{
	constructor()
	{
		super('data', true);
		this.elt.innerHTML =
			H.table(
				H.tr(	D.closeBtnCell('data', false) +
						D.expandPanelBtn('data', true) +
						H.td(D.getButton('delete', `R.diagram.gui(evt, this, 'clearDataMorphism')`, 'Clear all data'))), 'buttonBarLeft') +
			H.div('', '', 'data-view');
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
						html += H.button('Add Data', 'sidenavAccordion', '', 'Add entries to this map', `onclick="D.Panel.AccordionToggle(this, \'dataInputPnl\')"`);
						const irx = 'regexp' in to.domain ? `pattern="${to.regexp}"`: '';
						const inputForm = D.Input('', 'inputTerm', to.domain.properName, irx);
						const outputForm = to.codomain.toHTML();
						tbl =	H.tr(H.td('Domain')) +
								H.tr(H.td(inputForm)) +
								H.tr(H.td('Codomain')) +
								H.tr(H.td(outputForm));
						html += H.div(H.table(tbl) + D.getButton('edit', `dataPanel.handler(evt, '${from.name}')`, 'Edit data'), 'accordionPnl', 'dataInputPnl');
						html += H.div('', 'error', 'editError');
					}
					html += H.button('Current Data', 'sidenavAccordion', 'dataPnlBtn', 'Current data in this morphism', `onclick="D.Panel.AccordionToggle(this, \'dataPnl\')"`) +
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
	handler(e, nm)
	{
		try
		{
			const m = R.diagram.domain.getMorphism(nm).to;
			m.addData(e);
			this.update();
			R.diagram.saveLocal();
		}
		catch(err)
		{
			document.getElementById('editError').innerHTML = 'Error: ' + U.getError(err);
		}
	}
}

//
// DiagramPanel is a Panel on the left
//
class DiagramPanel extends Panel
{
	constructor()
	{
		super('diagram');
		this.elt.innerHTML =
			H.div('', '', 'diagramInfoDiv') +
			H.div('', '', 'diagramPanelToolbar') +
			H.h3(H.span('Diagram')) +
			H.h4(H.span('', '', 'diagram-properName') + H.span('', '', 'diagram-properName-edit')) +
			H.p(H.span('', 'description', 'diagram-description', 'Description') + H.span('', '', 'diagram-description-edit')) +
			H.table(H.tr(H.td(H.p(''), 'diagram-user') + H.td(H.p(), 'diagram-timestamp'))) +
			H.button('References', 'sidenavAccordion', '', 'Diagrams referenced by this diagram', 'onclick="D.Panel.AccordionToggle(this, \'referenceDiagrams\')"') +
			H.div(H.div('', 'accordionPnl', 'referenceDiagrams')) +
			H.button('New', 'sidenavAccordion', '', 'New Diagram', `onclick="D.Panel.AccordionToggle(this, \'newDiagramPnl\')"`) +
			H.div(
				H.small('The chosen name must have no spaces and must be unique among the diagrams you have in this category.') +
				H.table(
					H.tr(H.td(D.Input('', 'diagram-basename-new', 'Basename')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'diagram-properName-new', 'Proper Name')), 'sidenavRow') +
					H.tr(H.td(D.Input('', 'diagram-description-new', 'Description')), 'sidenavRow'), 'sidenav') +
				H.span(D.getButton('edit', 'diagramPanel.create()', 'Create new diagram')) +
				H.span('', 'error', 'diagram-error'), 'accordionPnl', 'newDiagramPnl');
			H.button(`${R.user.name}`, 'sidenavAccordion', '', 'User diagrams', 'onclick="D.Panel.AccordionToggle(this, \'userDiagramDisplay\')"') +
			H.div(	H.small('User diagrams') +
					H.div('', '', 'userDiagrams'), 'accordionPnl', 'userDiagramDisplay') +
			H.button('Recent', 'sidenavAccordion', '', 'Recent diagrams from Catecon', 'onclick="D.Panel.AccordionToggle(this, \'recentDiagrams\');DiagramPanel.FetchRecentDiagrams()"') +
			H.div(H.div('', 'accordionPnl', 'recentDiagrams')) +
			H.button('Catalog', 'sidenavAccordion', '', 'Catalog of available diagrams', 'onclick="D.Panel.AccordionToggle(this, \'catalogDiagrams\');D.FetchCatalogDiagramTable()"') +
			H.div(H.div('', 'accordionPnl', 'catalogDiagrams'));
		this.baseameElt = document.getElementById('diagram-baseame');
		this.properNameElt = document.getElementById('diagram-properName');
		this.properNameEditElt = document.getElementById('diagram-properName-edit');
		this.descriptionElt = document.getElementById('diagram-description');
		this.descriptionEditElt = document.getElementById('diagram-description-edit');
		this.userElt = document.getElementById('diagram-user');
		this.timestampElt = document.getElementById('diagram-timestamp');
		this.errorElt = document.getElementById('diagram-error');
		this.diagramPanelToolbarElt = document.getElementById('diagramPanelToolbar');
		this.referenceDiagramsElt = document.getElementById('referenceDiagrams');
	}
	update()
	{
		const dgrm = R.diagram;
		if (dgrm !== null)
		{
			const dt = new Date(dgrm.timestamp);
			this.navbar.innerHTML = `${dgrm.properName} ${H.span('by '+dgrm.user, 'italic')}`;
			this.navbar.title = U.cap(dgrm.description);
			this.properNameElt.innerHTML = dgrm.properName;
			this.descriptionElt.innerHTML = dgrm.description;
			this.userElt.innerHTML = dgrm.user;
			this.properNameEditElt.innerHTML = dgrm.readonly ? '' :
				D.getButton('edit', `R.diagram.editElementText('dgrmHtmlElt', 'properName')`, 'Retitle', D.default.button.tiny);
			this.descriptionEditElt.innerHTML = dgrm.readonly ? '' :
				D.getButton('edit', `R.diagram.editElementText('dgrmDescElt', 'description')`, 'Edit description', D.default.button.tiny);
			this.setUserDiagramTable();
			D.diagram.setReferencesDiagramTable();
			this.setToolbar(dgrm);
		}
	}
	create()
	{
		try
		{
			this.errorElt.innerHTML = '';
			const basename = this.basenameElt.value;
			let codomain = D.codomain.name;	// TODO what is this?
			const fullname = diagram.nameCheck(codomain, R.user.name, basename);
			// TODO make it <> safe
			const dgrm = new Diagram(R.$Cat, {basename, codomain, properName:this.properNameElt.value, description:this.descriptionElt.value, user:R.user.name});
			dgrm.saveLocal();
			//
			// select the new diagram
			//
			R.selectDiagram(dgrm.name);
			Panel.AccordionClose('newDiagramPnl');
			this.close();
			this.setUserDiagramTable();
			this.setReferencesDiagramTable();
			this.update();
		}
		catch(e)
		{
			this.errorElt.innerHTML = 'Error: ' + U.getError(e);
		}
	}
	setReferencesDiagramTable()
	{
		if (R.diagram === null)
			return;
		const refcnts = R.diagram.getReferenceCounts();
		let html = H.small('References for this diagram') + R.diagram.references.map(d =>
		{
			const del = refcnts[d.name] === 1 ? H.td(D.getButton('delete', `R.diagram.removeReferenceDiagram(evt,'${d.name}')`, 'Remove reference'), 'buttonBar') : '';
			return DiagramPanel.DiagramRow(DiagramPanel.GetDiagramInfo(d), del);
		}).join('');
		this.referenceDiagramsElt.innerHTML = H.table(html);
	}
	setToolbar(dgrm)
	{
		const nonAnon = R.user.name !== 'Anon';
		const isUsers = dgrm && (R.user.name === dgrm.user);
		const html = H.table(H.tr(
					(isUsers ? H.td(DiagramPanel.GetEraseBtn(dgrm), 'buttonBar', 'eraseBtn') : '') +
					(isUsers ? H.td(this.getLockBtn(dgrm), 'buttonBar', 'lockBtn') : '') +
					(nonAnon && isUsers ? H.td(D.getButton('upload', 'R.diagram.upload(evt)', 'Upload', D.default.button.small, false, 'diagramUploadBtn'), 'buttonBar') : '') +
					(nonAnon ? H.td(D.downloadButton('JSON', 'R.diagram.downloadJSON(evt)', 'Download JSON'), 'buttonBar') : '' ) +
					(nonAnon ? H.td(D.downloadButton('JS', 'R.diagram.downloadJS(evt)', 'Download Ecmascript'), 'buttonBar') : '' ) +
					(nonAnon ? H.td(D.downloadButton('PNG', 'R.diagram.downloadPNG(evt)', 'Download PNG'), 'buttonBar') : '' ) +
					D.expandPanelBtn('diagram', false) +
					D.closeBtnCell('diagram', true)), 'buttonBarRight');
		this.diagramPanelToolbarElt.innerHTML = html;
	}
	setUserDiagramTable()
	{
		const dgrm = R.diagram;
		if (dgrm === null)
			return;
		const dgrms = {};
		for (const d in R.localDiagrams)
		{
			const dgrm = R.localDiagrams[d];
			if (dgrm.user === R.user.name)
				dgrms[d] = true;
		}
		Object.keys(R.serverDiagrams).map(d => dgrms[d] = dgrm.user === R.user.name);
		let html = Object.keys(dgrms).map(d =>
		{
			const refBtn = !(dgrm.name == d || dgrm.hasReference(d)) ? H.td(this.getButton('reference', `R.diagram.addReferenceDiagram(evt, '${d}')`, 'Add reference diagram'), 'buttonBar') : '';
			return DiagramPanel.DiagramRow(DiagramPanel.GetDiagramInfo(d), refBtn);
		}).join('');
		document.getElementById('userDiagrams').innerHTML = H.table(html);
	}
	//
	// DiagramPanel static methods
	//
	// TODO move to Cat
	//
	static GetDiagramInfo(dgrm)
	{
		if (Diagram.prototype.isPrototypeOf(dgrm))
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
			const serverInfo = dgrm in R.serverDiagrams ? R.serverDiagrams[dgrm] : false;
			const localInfo = dgrm in R.localDiagrams ? R.localDiagrams[dgrm] : false;
			const serverTime = serverInfo ? serverInfo.timestamp : 0;
			const localTime = localInfo ? localInfo.timestamp : 0;
	//		const info = Elememt.NameTokens(dgrm);
			info.timestamp = localInfo ? localInfo.timestamp : (serverInfo ? serverInfo.timestamp : '');
			return info;
		}
	}
	static DiagramRow(dgrm, tb = null)
	{
		const dt = new Date(dgrm.timestamp);
		const url = R.cloud.getURL(dgrm.codomain.basename, dgrm.user, dgrm.basename + '.png');
		const tbTbl =
			H.table(
				H.tr( (tb ? tb : '') +
					(R.user.name !== 'Anon' ? H.td(D.downloadButton('JSON', `R.$Cat.getMorphism('${dgrm.name}').downloadJSON(evt)`, 'Download JSON'), 'buttonBar', '', 'Download diagram JSON') : '' ) +
					(R.user.name !== 'Anon' ? H.td(D.downloadButton('JS', `R.$Cat.getMorphism('${dgrm.name}').downloadJS(evt)`, 'Download Ecmascript'), 'buttonBar', '', 'Download diagram ecmascript') : '' ) +
					(R.user.name !== 'Anon' ? H.td(D.downloadButton('PNG', `R.$Cat.getMorphism('${dgrm.name}').downloadPNG(evt)`, 'Download PNG'), 'buttonBar', '', 'Download diagram PNG') : '' )),
				'buttonBarLeft');
		const tbl =
			H.table(
				H.tr(H.td(H.h5(dgrm.properName), '', '', '', 'colspan="2"')) +
				H.tr(H.td(`<img src="${url}" id="img_${dgrm.name}" width="200" height="150"/>`, 'white', '', '', 'colspan="2"')) +
				H.tr(H.td(dgrm.description, 'description', '', '', 'colspan="2"')) +
				H.tr(H.td(dgrm.user, 'author') + H.td(dt.toLocaleString(), 'date')));
		return H.tr(H.td(tbTbl)) + H.tr(H.td(`<a onclick="R.selectDiagram('${dgrm.name}')">` + tbl + '</a>'), 'sidenavRow');
	}
	static FetchCatalogDiagramTable()
	{
		if (!('catalogDiagrams' in Cat))
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
	static GetLockBtn(dgrm)
	{
		const lockable = dgrm.readonly ? 'unlock' : 'lock';
		return D.getButton(lockable, `R.diagram.${lockable}(evt)`, U.cap(lockable));
	}
	static GetEraseBtn(dgrm)
	{
		return dgrm.readonly ? '' : D.getButton('delete', "R.diagram.clear(evt)", 'Erase diagram!', D.default.button.small, false, 'eraseBtn');
	}
	static updateLockBtn(dgrm)
	{
		if (dgrm && R.user.name === dgrm.user)
		{
			document.getElementById('lockBtn').innerHTML = DiagramPanel.GetLockBtn(dgrm);
			const eb = document.getElementById('eraseBtn');
			if (eb)
				eb.innerHTML = DiagramPanel.GetEraseBtn(dgrm);
		}
	}
	static SetupDiagramElementPnl(dgrm, pnl, updateFnName)
	{
		const pnlName = dgrm.name + pnl;
		return Panel.AccordionPanelDyn(dgrm.properName, `${updateFnName}(R.$Cat.getMorphism('${dgrm.name}'))`, pnlName);
	}
	//
	// DiagramPanel static methods
	//
	static FetchRecentDiagrams()
	{
//		if ('recentDiagrams' in U)
//			return;
		fetch(R.cloud.getURL() + '/recent.json').then(function(response)
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
}

//
// HelpPanel is a Panel on the right
//
class HelpPanel extends Panel
{
	constructor()
	{
		super('help', true)
		this.elt.innerHTML =
			H.table(H.tr(D.closeBtnCell('help', false) + D.expandPanelBtn('help', true)), 'buttonBarLeft') +
			H.h3('Catecon') +
			H.h4('The Categorical Console')	+
			H.h5('Extreme Alpha Version') +
			H.button('Help', 'sidenavAccordion', 'catActionPnlBtn', 'Interactive actions', `onclick="D.Panel.AccordionToggle(this, \'catActionHelpPnl\')"`) +
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
			H.button('Category Theory', 'sidenavAccordion', 'catHelpPnlBtn', 'References to Category Theory', `onclick="D.Panel.AccordionToggle(this, \'catHelpPnl\')"`) +
			H.div(H.p(H.a('Categories For The Working Mathematician', '', '', '', 'href="https://en.wikipedia.org/wiki/Categories_for_the_Working_Mathematician" target="_blank"')), 'accordionPnl', 'catHelpPnl') +
			H.button('References', 'sidenavAccordion', 'referencesPnlBtn', '', `onclick="D.Panel.AccordionToggle(this, \'referencesPnl\')"`) +
			H.div(	H.p(H.a('Intro To Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/09/16/cat-prog/"')) +
					H.p(H.a('V Is For Vortex - More Categorical Programming', '', '', '', 'href="https://harrydole.com/wp/2017/10/08/v-is-for-vortex/"')), 'accordionPnl', 'referencesPnl') +
			H.button('The Math License', 'sidenavAccordion', 'licensePnlBtn', '', `onclick="D.Panel.AccordionToggle(this, \'licensePnl\')"`) +
			H.div(	H.p('Vernacular code generated by the Categorical Console is freely usable by those with a cortex. Machines are good to go, too.') +
					H.p('Upload a diagram to Catecon and others there are expected to make full use of it.') +
					H.p('Inelegant or unreferenced diagrams are removed.'), 'accordionPnl', 'licensePnl') +
			H.button('Credits', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="D.Panel.AccordionToggle(this, \'creditsPnl\')"`) +
			H.div(	H.a('Saunders Mac Lane', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=834"') +
					H.a('Harry Dole', '', '', '', 'href="https://www.genealogy.math.ndsu.nodak.edu/id.php?id=222286"'), 'accordionPnl', 'creditsPnl') +
			H.button('Third Party Software', 'sidenavAccordion', 'creditsPnlBtn', '', `onclick="D.Panel.AccordionToggle(this, \'thirdPartySoftwarePnl\')"`) +
			H.div(
						H.a('3D', '', '', '', 'href="https://threejs.org/"') +
						H.a('Compressors', '', '', '', 'href="https://github.com/imaya/zlib.js"') +
						H.a('Crypto', '', '', '', 'href="http://bitwiseshiftleft.github.io/sjcl/"'), 'accordionPnl', 'thirdPartySoftwarePnl') +
			H.hr() +
			H.small('&copy;2018-2019 Harry Dole') + H.br() +
			H.small('harry@harrydole.com', 'italic');
	}
}

//
// LoginPanel is a panel of the right
//
class LoginPanel extends Panel
{
	constructor()
	{
		super('login', true);
		this.elt.innerHTML =
			H.table(H.tr(D.closeBtnCell('login', false)), 'buttonBarLeft') +
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
			html += H.button('Signup', 'sidenavAccordion', '', 'Signup for the Categorical Console', `onclick="D.Panel.AccordionToggle(this, \'signupPnl\')"`) +
					H.div( H.table(H.tr(H.td('User name')) +
								H.tr(H.td(H.input('', '', 'signupUserName', 'text', {ph:'No spaces'}))) +
								H.tr(H.td('Email')) +
								H.tr(H.td(H.input('', '', 'signupUserEmail', 'text', {ph:'Email'}))) +
								LoginPanel.PasswordForm() +
								H.tr(H.td(H.button('Sign up', '', '', '', 'onclick=R.cloud.signup()')))), 'accordionPnl', 'signupPnl');
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
	//
	// LoginPanel static methods
	//
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

//
// MorphismPanel is a panel on the left
//
class MorphismPanel extends Panel
{
	constructor()
	{
		super('morphism');
		this.elt.innerHTML =
			H.table(H.tr(D.expandPanelBtn('morphism', false) + D.closeBtnCell('morphism', true)), 'buttonBarRight') +
			H.h3('Morphisms') +
			H.div('', '', 'morphisms-pnl') +
			H.h4('References') +
			H.div('', '', 'references-morphisms-pnl');
		this.morphismPnl = document.getElementById('morphisms-pnl');
		this.referencesPnl = document.getElementById('references-morphisms-pnl');
	}
	update()
	{
		this.morphismPnl.innerHTML = '';
		this.referencesPnl.innerHTML = '';
		if (R.diagram)
		{
			this.morphismPnl.innerHTML = DiagramPanel.SetupDiagramElementPnl(R.diagram, '_MorPnl', 'MorphismPanel.UpdateRows');
			this.referencesPnl.innerHTML = R.diagram.references.map(r => DiagramPanel.SetupDiagramElementPnl(r, '_MorPnl', 'MorphismPanel.UpdateRows')).join('');
		}
	}
	//
	// MorphismPanel static methods
	//
	static Drag(e, morphismName)
	{
		D.deactivateToolbar();
		e.dataTransfer.setData('text/plain', 'morphism ' + morphismName);
	}
	static UpdateRows(diagram)
	{
		let html = '';
		const found = {};
		const morphisms = [];
		for (const [k, m] of diagram.morphisms)
		{
			if (m.name in found)
				continue;
			found[m.name] = true;
			html += H.tr(	(D.showRefcnts ? H.td(m.refcnt) : '') +
							H.td(m.refcnt <= 0 && !diagram.readonly ?
								D.getButton('delete', `R.$Cat.getMorphism('${diagram.name}').removeMorphism(evt, '${k.name}')`, 'Delete morphism') : '', 'buttonBar') +
							H.td(m.properName) +
							H.td(m.domain.properName) +
							H.td('&rarr;') +
							H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="MorphismPanel.Drag(event, '${m.name}')"`);
		}
		for (const [k, m] of diagram.codomain.morphisms)
		{
			if (m.name in found)
				continue;
			found[m.name] = true;
			html += H.tr(	(D.showRefcnts ? H.td(m.refcnt) : '') +
							H.td(m.refcnt <= 0 && !diagram.readonly ?
								D.getButton('delete', `R.$Cat.getMorphism('${diagram.name}').removeCodomainMorphism(evt, '${m.name}');`, 'Delete dangling codomain morphism') :
									'', 'buttonBar') +
							H.td(m.properName) +
							H.td(m.domain.properName) +
							H.td('&rarr;') +
							H.td(m.codomain.properName), 'grabbable sidenavRow', '', '', `draggable="true" ondragstart="MorphismPanel.Drag(event, '${m.name}')"`);
		}
		document.getElementById(`${diagram.name}_MorPnl`).innerHTML = H.table(html);
	}
}

//
// ObjectPanel is a panel on the left
//
class ObjectPanel extends Panel
{
	constructor()
	{
		super('object');
		this.elt.innerHTML =
			H.table(H.tr(D.expandPanelBtn('object', false) + D.closeBtnCell('object', true)), 'buttonBarRight') +
			H.h3('Objects') +
			H.div('', '', 'object-new-pnl') +
			H.div('', '', 'objects-pnl') +
			H.h4('References') +
			H.div('', '', 'references-objects-pnl');
		this.objectNewPnl = document.getElementById('object-new-pnl');
		this.objectsPnl = document.getElementById('objects-pnl');
		this.referencesPnl = document.getElementById('references-objects-pnl');
	}
	update()
	{
		const dgrm = R.diagram;
		this.objectNewPnl.innerHTML = '';
		this.objectsPnl.innerHTML = '';
		this.referencesPnl.innerHTML = '';
		if (dgrm)
		{
			if (!dgrm.readonly)
			{
				this.objectNewPnl.innerHTML =
					H.h4('New Object') +
					H.div(
						H.table(
//							H.tr(H.td(H.small('The following tokens may be used to form an object depending on your category: One, Omega, N, Z, F, ...'), 'left'), 'sidenavRow') +
//							H.tr(H.td(H.small('Usual operators are *, +, []'), 'left'), 'sidenavRow') +
//							H.tr(H.td(H.small('Example: <span class="code">[N,N*N]</span> as the hom set from N to the product N*N'), 'left'), 'sidenavRow') +
//							H.tr(H.td(D.Input('', 'objectCode', 'Code')), 'sidenavRow') +
							H.tr(H.td(D.Input('', 'objectBasename', 'Base Name')), 'sidenavRow') +
							H.tr(H.td(D.Input('', 'objectProperName', 'Proper Name')), 'sidenavRow') +
							H.tr(H.td(D.Input('', 'objectDescription', 'Description')), 'sidenavRow')
						) +
						H.span(D.getButton('edit', 'D.objectPanel.create(evt)', 'Create new object for this diagram')) +
						H.span('', 'error', 'objectError'));
			}
			this.objectsPnl.innerHTML = DiagramPanel.SetupDiagramElementPnl(dgrm, '_ObjPnl', 'ObjectPanel.UpdateRows');
			this.referencesPnl.innerHTML = dgrm.references.map(r => DiagramPanel.SetupDiagramElementPnl(r, '_ObjPnl', 'ObjectPanel.UpdateRows')).join('');
			dgrm.updateObjectTableRows();
		}
	}
	//
	// static methods
	//
	static Drag(e, name)
	{
		D.deactivateToolbar();
		e.dataTransfer.setData('text/plain', 'object ' + name);
	}
	static UpdateRows(dgrm)
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
			(D.showRefcnts ? H.td(o.refcnt) : '') +
				H.td(o.refcnt === 0 && !dgrm.readonly ?
					D.getButton('delete', `R.$Cat.getMorphism('${dgrm.name}').removeCodomainObject(evt, '${o.name}')`, 'Delete object') : '', 'buttonBar') +
				H.td(o.properName),
				'grabbable sidenavRow', '', U.cap(o.description), `draggable="true" ondragstart="ObjectPanel.Drag(event, '${o.name}')"`)).join(''));
	}
}

//
// SettingsPanel is a panel on the right
//
class SettingsPanel extends Panel
{
	constructor()
	{
		super('settings', true);
		this.elt.innerHTML =
			H.table(H.tr(D.closeBtnCell('settings', false)), 'buttonBarLeft') +
			H.h3('Settings') +
			H.table(
				H.tr(H.td(`<input type="checkbox" ${D.gridding ? 'checked' : ''} onchange="D.gridding = !D.gridding">`) + H.td('Snap objects to a grid.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${D.showRefcnts ? 'checked' : ''} onchange="SettingsPanel.ToggleShowRefcnts()">`) +
						H.td('Show reference counts for objects and morphisms in their respective panels.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${D.showUploadArea ? 'checked' : ''} onchange="SettingsPanel.ToggleShowUploadArea()">`) +
						H.td('Show upload area for diagram snapshots.', 'left'), 'sidenavRow') +
				H.tr(	H.td(`<input type="checkbox" ${R.debug ? 'checked' : ''} onchange="R.debug = !R.debug">`) +
						H.td('Debug', 'left'), 'sidenavRow')
			);
	}
	//
	// SettingsPanel static methods
	//
	static ToggleShowRefcnts()
	{
		D.showRefcnts = !D.showRefcnts;
		const dgrm = R.diagram;
		if (dgrm)
		{
			dgrm.updateObjectTableRows();
			dgrm.references.map(r => r.updateObjectTableRows());
			MorphismPanel.UpdateRows(dgrm);
			dgrm.references.map(r => MorphismPanel.UpdateRows(r));
		}
	}
	// TODO move
	static ToggleShowUploadArea()
	{
		D.showUploadArea = !D.showUploadArea;
		D.upSVG.style.display = D.showUploadArea ? 'block' : 'none';
	}
}

//
// TextPanel is a Panel on the left
//
class TextPanel extends Panel
{
	constructor()
	{
		super('text');
		this.elt.innerHTML =
			H.table(
				H.tr(D.closeBtnCell('text', false) + H.td(D.expandPanelBtn('text', false))), 'buttonBarRight') +
				H.h3('Text') +
				H.div('', '', 'text-new-pnl') +
					H.h4('New Text') +
					H.div(
						H.span('Create new text.', 'small') +
						H.table(H.tr(H.td(H.textarea('', 'textHtml', 'text-properName')), 'sidenavRow')) +
						H.span(D.getButton('edit', 'D.textPanel.create(evt)', 'Create new text for this diagram')) +
					H.span('', 'error', 'text-error'), '', 'text-new-pnl') +
	//???			H.button('Text', 'sidenavAccordion', '', 'New Text', `onclick="D.Panel.AccordionToggle(this, \'textPnl\')"`) +
				H.div('', 'accordionPnl', 'text-pnl');
		Panel.AccordionOpen('text-pnl');
		this.panel = document.getElementById('text-pnl');
		this.newPnl = document.getElementById('text-new-pnl');
		this.newPnl.style.display = 'none';
		this.errorElt = document.getElementById('text-error');
		this.properNameElt = document.getElementById('text-properName');
	}
	create(e)
	{
		try
		{
			this.errorElt.innerHTML = '';
			const dgrm = R.diagram;
			const mdl = {x:D.Width()/2, y:D.Height()/2};
	//		const xy = D2.subtract(dgrm.userToDiagramCoords(mdl), dgrm.viewport);
			const xy = dgrm.userToDiagramCoords(mdl).subtract(dgrm.viewport);
			const txt = new DiagramText(dgrm, {name:`Text${dgrm.textId++}`, diagram:dgrm, properName:this.properNameElt.value, xy});
			this.properNameElt.value = '';
			dgrm.texts.push(txt);
			dgrm.placeElement(e, txt);
			this.update();
			Panel.AccordionOpen('text-pnl');
		}
		catch(e)
		{
			this.errorElt.innerHTML = 'Error: ' + U.getError(e);
		}
	}
	update()
	{
		const diagram = R.diagram;
		this.newPnl.style.display = diagram && !diagram.readonly ? 'block' : 'none';
		this.panel.innerHTML = diagram ?
			H.table(
				diagram.texts.map((t, i) =>
					H.tr(	H.td(H.table(H.tr(H.td(D.getButton('delete', `D.textPanel.delete(${i})`, 'Delete text'))), 'buttonBarLeft')) +
							H.td(H.span(U.htmlSafe(t.properName), 'tty', `text_${i}`) +
								(diagram.readonly ? '' :
									D.getButton('edit', `R.diagram.getElement('${t.name}').editText('text_${i}', 'properName')`, 'Edit', D.default.button.tiny)),
										'left'), 'sidenavRow')
				).join('')
			) : '';
	}
	//
	// static methods
	//
	static Delete(i)
	{
		const dgrm = R.diagram;
		if (dgrm && i in dgrm.texts)
		{
			dgrm.texts[i].decrRefcnt();
			this.update();
			dgrm.update();
		}
	}
}

//
// Element is the root class for Catecon objects and morphisms
//
// args:
// 		basename if no name
//		name:		otherwise Codename derived from diagram and basename
//		properName:	otherwise the basename
//		description:	otherwise blank
//		readonly:		otherwise false
//
class Element
{
	constructor(diagram, args)
	{
		Object.defineProperties(this,
		{
			diagram:		{value: diagram,	writable: true},	// is true for bootstrapping
			name:			{value: 'name' in args ? args.name : Element.Codename(diagram, args.basename),	writable: false},
			properName:		{value: 'properName' in args ? args.properName : Element.Codename(diagram, args.basename),	writable: true},
			description:	{value: 'description' in args ? args.description : '',	writable: true},
			readonly:		{value: 'readonly' in args ? args.readonly : false,	writable: true},
			refcnt:			{value: 0,	writable: true},
			user:			{value: 'user' in args ? args.user : '',	writable: false},
		});
		if ('basename' in args)
			Object.defineProperty(this, 'basename', {value: args.basename, writable: false});
	}
	//
	// override as needed
	//
	signature(sig = '')
	{
		return U.sha256(`${sig}-${this.constructor.name}-${this.name}`);
	}
	setSignature(sig = null)
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
	incrRefcnt()
	{
		++this.refcnt;
	}
	//
	// decrement the reference count
	//
	// Memory management comes in the derived objects and morphisms, not here.
	//
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
		if ('category' in this)		// although we don't set 'category' we save it here for convenience
			a.category = this.category.name;
		if ('user' in this)
			a.user = this.user;
		if ('diagram' in this && this.diagram !== null)
			a.diagram =	this.diagram.name;
//		if ('index' in this)
//			a.index = true;
		return a;
	}
	//
	// FITB
	//
	js(dgrmVarName = 'dgrm')
	{
		return `		new ${this.constructor.name}(${dgrmVarName}), ${this.stringify()};\n`;
	}
	//
	// Return a string representing the element.  Reconstitute it with process().
	//
	stringify()
	{
		return JSON.stringify(this.json());
	}
	//
	// If two elements have the same signature then they are the same.
	//
	isEquivalent(elt)
	{
		return elt ? this.signature === elt.signature : false;
	}
	//
	// isDeleteable means that the reference count is 0 or 1.  In other words, already being at zero means
	// nothing else is referring to the object and so it can already be deleted.  For 1, that means if you
	// decrement the reference count as expected, then it can be deleted.
	//
	isDeletable()
	{
		return this.refcnt <= 1;
	}
	//
	// Most elements do not need parenthesis, but products and coproducts do.
	//
	needsParens()
	{
		return false;
	}
	moreHelp()
	{
		return '';
	}
	//
	// Element static methods
	//
	static Codename(diagram, basename = '')
	{
	//	return `:${diagram.codomain.name}:Ob{${diagram.user}:${diagram.basename + (basename !== '' ? ':' + basename : ''}bO`;
		return diagram ? `:${diagram.codomain.name}:${diagram.user}:${diagram.basename + (basename !== '' ? ':' + basename : '')}` : basename;
	}
}

//
// Graph is for graphing string morphisms.
//
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
				U.arrayMerge(this.tags, g.tags);
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
			U.arrayMerge(this.links, links);
			//
			// merge the tags to our tags
			//
			U.arrayMerge(this.tags, data.from.tags);
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
				return `<path data-link="${lnkStr} ${idxStr}" class="string" style="stroke:#${color}AA" id="${linkId}" d="${d}" filter="url(#softGlow)" onmouseover="D.status(evt, '${fs}')"/>\n`;
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

//
// CatObject is an Element
//
class CatObject extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		Object.defineProperty(this, 'category', {value: args.category,	writable: false});
//		if (!this.category)
//			debugger;
		this.category && 'addObject' in this.category && this.category.addObject(this);	// no need to remember this in a local json()
	}
	json()
	{
		const o = super.json();
		o.category = this.category.name;
		return o;
	}
	decrRefcnt()
	{
		super.decrRefcnt();
		this.refcnt <= 0 && this.category && this.category.deleteObject(this);
	}
	//
	// With no further structure the ony factor we could possibly return is the object itself.
	//
	getFactor(factor)
	{
		return this;
	}
	//
	// Return true if the object has an editor for a web page
	//
	isEditable()
	{
		return false;	// override as needed
	}
	//
	// If possible, read the value of the object from the document's HTML.
	//
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{}
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
		return H.table(H.tr(H.td(H.button(properName + data.txt, '', D.elementId(), data.title,
			`data-indices="${data.index.toString()}" onclick="R.diagram.${action}('${data.id}', '${data.fname}', '${data.root}', '${data.action}', ${data.index.toString()});${'x' in data ? data.x : ''}"`))));
	}
	//
	// CatObject static methods
	//
	static Process(diagram, args)
	{
		return new Cat[args.prototype](args);
	}
}

//
// DiscreteObject is a CatObject
//
// args: size
//
class DiscreteObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.properName = DiscreteObject.ProperName(nuArgs.size);
		nuArgs.name = DiscreteObject.Codename(diagram, nuArgs.size);
		nuArgs.category = diagram.codomain;		// TODO doesn't work for index category objects which are presumably discrete
		super(diagram, nuArgs);
//		this.size = nuArgs.size;
		Object.defineProperty(this, 'size', {value:	nuArgs.size, writable:	false});
	}
	json()
	{
		const d = super.json();
		d.size = this.size;
		return d;
	}
	//
	// DiscreteObject static methods
	//
	static Codename(diagram, size)
	{
		return `${diagram.codomain.name}:${size}`;
	}
	static ProperName(diagram, size)
	{
		return size.toString();
	}
	static Get(diagram, size)
	{
		const object = diagram.getObject(DiscreteObject.Codename(size));
		return object ? object : new DiscreteObject(diagram, {size});
	}
}

//
// InitialObject is a DiscreteObject
//
class InitialObject extends DiscreteObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		super(diagram, {size:0});
	}
	//
	// InitialObject static methods
	//
	static Get(diagram)
	{
		const object = diagram.getObject('0');
		return object ? object : new InitialObject(diagram);
	}
}

//
// TerminalObject is a DiscreteObject
//
class TerminalObject extends DiscreteObject
{
	constructor(diagram, args)
	{
		super(diagram, {size:1});
	}
	//
	// TerminalObject static methods
	//
	static Get(diagram)
	{
		const object = diagram.getObject('1');
		return object ? object : new TerminalObject(diagram);
	}
}

//
// SubobjectClassifier is a CatObject
//
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
	//
	// SubobjectClassifier static methods
	//
	static Codename(diagram)
	{
		return `${diagram.codomain.name}:Omega`;
	}
	static Get(diagram)
	{
		const object = diagram.getObject('Omega');
		return object ? object : new SubobjectClassifier(diagram);
	}
}

//
// MultiObject is a CatObject
//
// An object comprised of a list of other objects.  Really expects to be used by derived classes only.
//
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
	signature(sig = '')
	{
		return U.sha256(`${sig}${this.codomain.name}:${this.constructor.name} ${objects.map(o => o.signature()).join()}`);
	}
	decrRefcnt()
	{
		//
		// if at zero, then we're going away so release our holds on our comprising objects
		//
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
	//
	// Return true if the object has an editor for a web page.
	// Generally a MultiObject is editable if all the pieces are editable.
	//
	isEditable()
	{
		return this.objects.reduce((o, r) => r &= o.isEditable(), true);
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
	//
	// Used for graphing string morphisms.  Basically only sequence objects return true.
	//
	resetPosition()
	{
		return false;
	}
	moreHelp()
	{
		return H.table(H.tr(H.th('Objects', '', '', '', 'colspan=2')) + this.objects.map(o => H.tr(H.td(o.diagram.properName) + H.td(o.properName, 'left'))).join(''));
	}
	//
	// Return my button plus my objects' buttons.
	//
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
	//
	// MultiObject static methods
	//
	static ProperName(sep, objects)
	{
		let n = '';
		const doit = this.needsParens();
		if (doit)
			n += '(';
		n += objects.map(o => o.properName).join(sep);
		if (doit)
			n += ')';
	}
	static GetObjects(diagram, objects)
	{
		return args.objects.map(o => diagram.getObject(o));
	}
}

//
// ProductObject is a MultiObject
//
class ProductObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.name = ProductObject.Codename(diagram, nuArgs.objects);
		nuArgs.properName = 'properName' in args ? args.properName : ProductObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
//		this.size = this.objects.reduce((sz, o) => sz += o.size, 0);	// sum of all sub-sizes
		this.seperatorWidth = D.textWidth('&times');	// in pixels
		this.setSignature();
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return this.objects.map(o => o.FromInput(false, uid));
	}
	toHTML(first=true, uid={uid:0, idp:'data'})
	{
		// TODO
	//	const codes = this.objects.map(d => {uid.uid; return d.toHTML(false, uid)});
	//	return U.parens(codes.join(op.sym), '(', ')', first);
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.textWidth('('), D.textWidth('&times;'), first);
	}
	needsParens()
	{
		return true;
	}
	//
	// ProductObject static methods
	//
	static Codename(diagram, objects)
	{
		return `:${this.codomain.name}:Po{${objects.map(o => o.name).join(',')}}oP`;
	}
	static Get(diagram, objects)
	{
		const name = ProductObject.Codename(diagram, objects);
		const object = diagram.getObject(name);		// no products in the diagram domain cats
		return object === null ? new ProductObject(diagram, {objects}) : object;
	}
	static ProperName(objects)
	{
		return super.ProperName('&times;', objects);
	}
}

//
// Sequence is a ProductObject
//
// This is only for graphing string morphisms.
//
class Sequence extends ProductObject
{
	constructor(diagram, args)
	{
		super(diagram, args);
	}
	resetPosition()
	{
		return true;
	}
	//
	// Sequence static methods
	//
	static Codename(diagram, objects)
	{
		return `:${diagram.codomain.name}:So{${objects.map(o => o.name).join(',')}}oS`;
	}
	static Get(diagram, objects)
	{
		const name = Sequence.Codename(diagram, objects);
		const object = diagram.getObject(name);
		return object === null ? new Sequence(diagram, {objects}) : object;
	}
}

//
// CoproductObject is a MultiObject
//
class CoproductObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.name = CoproductObject.Codename(diagram, nuArgs.objects);
		nuArgs.properName = 'properName' in args ? args.properName : CoproductObject.ProperName(nuArgs.objects);
		super(diagram, nuArgs);
//		this.size = 1 + this.objects.reduce((sz, o) => sz = Math.max(o.size, sz), 0);
		this.seperatorWidth = D.textWidth('&times');	// runtime, don't save TODO remove
		this.setSignature();
	}
	getGraph(data = {position:0}, first = true)
	{
		return super.getGraph(this.constructor.name, data, D.parenWidth, D.textWidth('&plus;'), first);
	}
	needsParens()
	{
		return true;
	}
	fromHTML(first = true, uid = {uid:0, id:'data'})
	{
		return {};	// TODO
	}
	//
	// CoproductObject static methods
	//
	static Codename(diagram, objects)
	{
		return Element.Codename(diagram, `Co-${objects.map(o => o.name).join(',')}-oC`);
	}
	static Get(diagram, objects)
	{
		const name = CoproductObject.Codename(this.diagram, objects);
		let object = diagram.getObject(name);
		return object === null ? new CoproductObject(diagram, {objects}) : object;
	}
	static ProperName(objects)
	{
		return super.ProperName('&plus;', objects);
	}
}

//
// HomObject is a MultiObject
//
class HomObject extends MultiObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.objects = MultiObject.GetObjects(diagram, args.objects);
		nuArgs.name = HomObject.Codename(diagram, nuArgs.objects);
		nuArgs.name = HomObject.Codename(diagram, nuArgs.objects);
		nuArgs.properName = args.properName === '' ? HomObject.ProperName(nuArgs.objects) : args.properName;
		super(diagram, nuArgs);
//		this.size = 1;
		this.setSignature();
	}
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
	//
	// static methods
	//
	static Codename(diagram, objects)
	{
		return `:${this.codomain.name}:Ho{${objects.map(o => o.name).join(',')}}oH`;
	}
	static Get(diagram, objects)
	{
		const name = HomObject.Codename(diagram, objects);
		const object = diagram.getObject(name);
		return object === null ? new HomObject(diagram, {objects}) : object;
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

//
// DiagramText
//
// a text element placed on the diagram.
//
class DiagramText
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = U.getArg(args, 'name', diagram.domain.getAnon());
		const xy = U.getArg(args, 'xy', new D2);
		this.x = xy.x;
		this.y = xy.y;
		this.width = U.getArg(args, 'width', 0);
		this.height = U.getArg(args, 'height', D.default.font.height);
		Object.defineProperties(this,
		{
			x:		{value:	xy.x,	writable:	true},
			y:		{value:	xy.y,	writable:	true},
			width:	{value:	U.getArg(nuArgs, 'width', 0),	writable:	true},
			height:	{value:	U.getArg(nuArgs, 'height', D.default.font.height),	writable:	true},
			properName:	{value:	U.getArg(args, 'properName', 'Lorem ipsum categoricum'), writable:	true},
		});
	}
	setXY(xy)
	{
		this.x = D.grid(xy.x);
		this.y = D.grid(xy.y);
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	json()
	{
		a =
		{
			name:		this.name,
			properName:	this.properName,
			height:		this.height,
			xy:			this.getXY(),
			width:		this.width,
			prototype:	'DiagramText',
		};
		return a;
	}
	update()
	{}
	editText(id, attr)
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
}

//
// DiagramObject is a CatObject
//
// This is the object for the source category in a diagram.
// It points to the object in the target category of the diagram.
//
class DiagramObject extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : diagram.domain.getAnon('dgrmO');
		nuArgs.category = diagram.domain;
		super(diagram, nuArgs);
		const xy = U.getArg(nuArgs, 'xy', new D2);
		Object.defineProperties(this,
		{
			x:		{value:	xy.x,	writable:	true},
			y:		{value:	xy.y,	writable:	true},
			width:	{value:	U.getArg(nuArgs, 'width', 0),	writable:	true},
			height:	{value:	U.getArg(nuArgs, 'height', D.default.font.height),	writable:	true},
		});
		//
		// the object in the target category that this object maps to, if any
		//
		if ('to' in nuArgs)
			this.setObject(diagram.getObject(nuArgs.to));
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
	//
	// Set the object in the diagram's category that this diagram object points to.
	//
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
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	makeSVG()
	{
		if (isNaN(this.x) || isNaN(this.y))
			throw `nan in ${this.name}`;
		return `<text data-type="object" data-name="${this.name}" text-anchor="middle" class="object grabbable" id="${this.elementId()}" x="${this.x}" y="${this.y + D.default.font.height/2}"
			onmousedown="R.diagram.pickElement(evt, '${this.name}', 'object')">${this.to.properName}</text>`;
	}
	getBBox()
	{
		return {x:this.x - this.width/2, y:this.y + this.height/2 - D.default.font.height, width:this.width, height:this.height};
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
	//
	// xy is a D2
	//
	updatePosition(xy)
	{
		this.setXY(xy.round());		// round to pixel location
		const svg = this.svg();
		if (svg.hasAttribute('transform'))
			svg.setAttribute('transform', `translate(${D.grid(this.x)} ${D.grid(this.y)})`);
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
	addSVG()
	{
		D.diagramSVG.innerHTML += typeof this === 'string' ? this : this.makeSVG();
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
			action:			{value:	nuArgs.action,	writable:	false},		// gui action
			type:			{value:	nuArgs.type,	writable:	false},
			icon:			{value:	nuArgs.icon,	writable:	false},		// svg
			ProperName:		{value:	nuArgs.ProperName,	writable:	false},		// function that creates proper name from args
			hasForm:		{value:	nuArgs.hasForm,	writable:	false},		// function to pattern match the selected set
		});
	}
}

//
// Category is a CatObject
//
class Category extends CatObject
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Category.Codename(diagram, nuArgs);
		nuArgs.category = diagram && 'codomain' in diagram ? diagram.codomain : null;
		super(diagram, nuArgs);
		Object.defineProperties(this,
		{
			// for graph and nCats categories that share the same objects as the source category
//			objects:	{value:	'objects' in nuArgs ? new Map(nuArgs.objects) : new Map(),	writable:	false},
			objects:	{value:	new Map(),	writable:	false},
			morphisms:	{value:	new Map(),	writable:	false},
			actions:	{value:	[R.compositeAction],	writable:	false},	// all categories have a composite action
		});
		//
		// part of the boot sequence
		//
		if (R.$Cat === null)
		{
			R.$Cat = this;
			R.$Cat.addObject(R.$Cat);
		}
		this.process(this.diagram, nuArgs);
	}
	//
	// override these as needed, e.g., dual
	//
	id(o)
	{
		return Identity.Get(this.diagram, o);
	}
	domain(m)
	{
		return m.domain;
	}
	codomain(m)
	{
		return m.codomain;
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
	process(args)
	{
		let errMsg = '';
		if (args && 'objects' in args)
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
		if (args && 'morphisms' in args)
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
		if ('$Actions' in R)	// bootstrap issue
			this.actions.push(...('actions' in args ? args.actions.map(u => R.$Actions.getObject(u)) : []));
		if (errMsg != '')
			D.recordError(errMsg);
		//
		// for our recursive morphisms, setup the their recursors now that all morphisms are loaded and the searches can be satisfied
		//
		for(const [key, m] of this.morphisms)
			if (Recursive.prototype.isPrototypeOf(m) && String.prototype.isPrototypeOf(m.recursor))
				m.setRecursor(m.recursor);
	}
	json()
	{
		const a = super.json();
		/*
		const objects = [];
		if (this.name === 'Cat')	// no infinite recursion on Cat
		{
			for(const [key, object] of this.objects)
			{
				if (object.name === 'Cat')
					return;
				objects.push(object);
			}
			a.objects = U.jsonAssoc(objects);
		}
		else
			a.objects = U.jsonMap(this.objects);
			*/
		a.objects = U.jsonMap(this.objects);
		a.morphisms = U.jsonMap(this.morphisms);
		//
		// just need the name of the index categories
		//
		a.actions = this.actions.map(a => a.name);
		return a;
	}
	/*
	js()
	{
		for (const [name, o] in this.objects)
			js += `		const ${name} = ${o.js()}`;
		for (const [name, m] in this.morphisms)
			js += `		const ${name} = ${m.js()}`;
		return js;
	}
	*/
	getObject(name)
	{
		//
		// if it is already an object, return it
		//
		if (Element.prototype.isPrototypeOf(name))
			// TODO check for correct category?
			return name;
		return this.objects.get(name);
	}
	addObject(object)
	{
		if (this.objects.has(object.name))
			throw `Object with name ${object.name} already exists in category ${this.name}`;
		this.objects.set(object.name, object);
	}
	deleteObject(o)
	{
		this.objects.delete(o.name);
	}
	getMorphism(name)
	{
		//
		// if it is already a morphism, return it
		//
		if (Morphism.prototype.isPrototypeOf(name))
			return name;
		return this.morphisms.has(name) ? this.morphisms.get(name) : null;
	}
	addMorphism(m)
	{
		if (this.getMorphism(m.name))
			throw 'morphism with given name already exists in category';
		this.morphisms.set(m.name, m);
	}
	deleteMorphism(m)
	{
		this.morphisms.delete(m.name);
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
	validateName(name)
	{
		return name !== '' && !this.basenameIsUsed(name) && U.nameEx.test(name);
	}
	//
	// static methods
	//
	static IsSink(ary)
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
			if (!DiagramMorphism.prototype.isPrototypeOf(a))
				return false;
			if (!elt.domain.isEquivalent(domain))
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
		const codomain = elt.codomain;
		for(let i=1; i<ary.length; ++i)
		{
			const a = ary[i];
			if (!DiagramMorphism.prototype.isPrototypeOf(a))
				return false;
			if (!elt.codomain.isEquivalent(codomain))
				return false;
		}
		return true;
	}
	static AddHomDir(obj2morphs, m, dir)
	{
		const key = dir === 'dom' ? m.domain : m.codomain;
		if (!obj2morphs.has(key))
			obj2morphs.set(key, {dom:[], cod:[]});
		const ms = obj2morphs.get(key);
		ms[dir].push(m);
	}
	static IsComposite(ary)
	{
		if (ary.length > 1 && ary.reduce((m, r) => r &= DiagramMorphism.prototype.isPrototypeOf(m), true))
		{
			const first = ary[0];
			let compositeCod = first.codomain;
			for(let i=0; i<ary.length; ++i)
			{
				const elt = ary[i];
				if (!elt.domain.isEquivalent(compositeCod))
					return false;
			}
			return true;
		}
		return false;
	}
	/*
	//
	// Determine the form of the selected morphisms:  source, sink, composite, distinct
	//
	static HasForm(ary)
	{
		let bad = {composite: false, source: false, sink: false, distinct: false};
		if (ary.length < 2)
			return bad;
		const elt = ary[0];
		if (!DiagramMorphism.prototype.isPrototypeOf(elt))
			return bad;
		const dom = elt.domain;
		const cod = elt.codomain;
		let compositeCod = elt.codomain;
		let good = {composite:true, source:true, sink:true, distinct: true};
		let foundObjects = {};
		for(let i=1; i<ary.length; ++i)
		{
			const elt = ary[i];
			if (!DiagramMorphism.prototype.isPrototypeOf(elt))
				return bad;
			good.source =	!elt.domain.isEquivalent(dom) ? false : good.source;
			good.sink =		!elt.codomain.isEquivalent(cod) ? false : good.sink;
			good.composite= !elt.domain.isEquivalent(compositeCod) ? false : good.composite;
			good.distinct = good.distinct && !(elt.domain in foundObjects) && !(elt.codomain in foundObjects);
			compositeCod = elt.codomain;
		}
		return good;
	}
	*/
	// TODO which category owns this?
	static Run(m, diagram)
	{
		let dm = m.morphisms[0];
		if (!DataMorphism.prototype.isPrototypeOf(dm))
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
	static HomKey(domain, codomain)
	{
		return `${domain.name} ${codomain.name}`;
	}
	static Codename(diagram, args)
	{
		if ('user' in args && 'basename' in args)
			return `${args.user}:${args.basename}`;
		return 'name' in args ? args.name : args.basename;
	}
	static Get(diagram, user, basename)
	{
		const m = diagram.getMorphism(Category.Codename(user, basename));
		if (m)
			return m.codomain;
		return new Category(diagram, {user, basename});
	}
}

//
// Morphism is an Element
//
class Morphism extends Element
{
	constructor(diagram, args)
	{
		super(diagram, args);
		const domain = this.diagram ? this.diagram.getObject(args.domain) : args.domain;
		const codomain = this.diagram ? this.diagram.getObject(args.codomain) : args.codomain;
		Object.defineProperties(this,
		{
			domain:		{value: domain, enumerable: true},
			codomain:	{value: codomain, enumerable: true},
			category:	{value: args.category,	writable: false},
		});
		this.category && this.category.addMorphism(this);
		this.codomain.incrRefcnt();
		this.domain.incrRefcnt();
	}
	decrRefcnt()
	{
		if (this.refcnt <= 0)
		{
			this.domain.decrRefcnt();
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
		return a;
	}
	//
	// Is this morphism iterable?  Generically return false.
	//
	isIterable()	// FITB
	{
		return false;
	}
	//
	// True if the given morphism is used in the construction of this morphism somehow.
	// Generically return false.
	//
	hasMorphism(mor, start = true)
	{
		return false;
	}
	$(args)
	{
		throw 'unknown action in morphism';
	}
	//
	// A generic morphism has an empty graph constructe from its domain and codomain.
	//
	getGraph(data = {position:0})
	{
		return Sequence.Get(this.diagram, [this.domain, this.codomain]).getGraph(data);
	}
	//
	// static methods
	//
	static Process(diagram, args)
	{
		return new window[args.prototype](args);
	}
}

//
// Identity is a Morphism
//
class Identity extends Morphism
{
	constructor (diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram ? diagram.getObject(args.domain) : args.domain;
		nuArgs.codomain = diagram ? diagram.getObject(args.codomain) : args.domain;
		nuArgs.name = Identity.Codename(diagram, nuArgs.domain, nuArgs.codomain);
		nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : Identity.ProperName(nuArgs.domain, nuArgs.codomain);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
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
	//
	// good for identity functors
	//
	$$(args)
	{
		return args;
	}
	//
	// static methods
	//
	static Codename(diagram, domain, codomain = null)
	{
		const basename = (codomain && domain.name !== codomain.name) ? `Id{${domain.name},${codomain.name}}dI` : `Id{${domain.name}}dI`;
		return `:${diagram.codomain.name}:${basename}`;
	}
	static Get(diagram, dom, cod = null)
	{
		const domain = diagram.getObject(dom);
		let codomain = null;
		if (cod)
			codomain = diagram.getObject(cod);
		const name = Identity.Codename(diagram, domain, codomain);
		const m = diagram.getMorphism(name);
		return m ? m : new Identity(diagram, codomain ? {domain, codomain} : {domain});
	}
	static ProperName(domain, codomain = null)
	{
		return 'id';
	}
}

//
// DiagramMorphism is a Morphism
//
// Supports the placement and drawing of a morphism in a diagram.
// This is *not* a DiagramText as this is suspended between two such.
//
class DiagramMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.index = true;
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : diagram.domain.getAnon('dgrmM');
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		//
		// graphical attributes
		//
		this.start = new D2(U.getArg(args, 'start', {x:0, y:0}));
		this.end = new D2(U.getArg(args, 'end', {x:150, y:0}));	// TODO make a default
		this.angle = U.getArg(args, 'angle', 0.0);
		this.flipName = U.getArg(args, 'flipName', false);
		if ('morphisms' in nuArgs)
			this.morphisms = nuArgs.morphisms.map(m => diagram.domain.getMorphism(m));
		//
		// the morphism in the target category that this morphism maps to, if any
		//
		this.setMorphism(this.diagram.getMorphism(nuArgs.to));
	}
	decrRefcnt()
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
	json()
	{
		let mor = super.json();
		mor.start = this.start.getXY();
		mor.end = this.end.getXY();
		mor.angle = this.angle;
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
		const normal = D2.Subtract(this.codomain, this.domain).normal().scale(this.flipName ? -1 : 1).normalize();
		if (normal.y > 0.0)
			normal.y *= 0.5;
		return normal.scale(-D.default.font.height).add(mid);
	}
	makeSVG()
	{
		const off = this.getNameOffset();
		let svg =
	`<g id="${this.elementId()}">
	<path data-type="morphism" data-name="${this.name}" class="${this.to.constructor.name !== 'unknown' ? 'morphism' : 'unknownMorph'} grabbable" id="${this.elementId()}_path" d="M${this.start.x},${this.start.y} L${this.end.x},${this.end.y}"
	onmousedown="R.diagram.pickElement(evt, '${this.name}', 'morphism')" marker-end="url(#arrowhead)"/>
	<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_name'}" x="${off.x}" y="${off.y}"
	onmousedown="R.diagram.pickElement(evt, '${this.name}', 'morphism')">${this.to.properName}</text>`;
		if (Composite.prototype.isPrototypeOf(this.to))
		{
			const xy = D.Barycenter(this.morphisms);
			if (isNaN(xy.x) || isNaN(xy.y))
				throw 'Nan!';
			svg += `<text data-type="morphism" data-name="${this.name}" text-anchor="middle" class="morphTxt" id="${this.elementId()+'_comp'}" x="${xy.x}" y="${xy.y}"
	onmousedown="R.diagram.pickElement(evt, '${this.name}', 'morphism')">${D.default.composite}</text></g>`;
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
		if (Composite.prototype.isPrototypeOf(this.to))
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
	//	const deltaX = this.codomain.x - this.domain.x;
	//	const deltaY = this.codomain.y - this.domain.y;
		const delta = D2.Subtract(this.codomain, this.domain);
		let start = new D2;
		let end = new D2;
	//	if (deltaX === 0)
		if (delta.x === 0)
		{
			if (delta.y > 0)
			{
	//			start = D2.round(this.intersect(domBBox, 'bottom'));
				start = this.intersect(domBBox, 'bottom').round();
	//			end = D2.round(this.intersect(codBBox, 'top'));
				end = this.intersect(codBBox, 'top').round();
			}
			else
			{
	//			start = D2.round(this.intersect(domBBox, 'top'));
				start = this.intersect(domBBox, 'top').round();
				end = this.intersect(codBBox, 'bottom').round();
			}
		}
		else if (delta.y === 0)
		{
			if (delta.x > 0)
			{
				start = this.intersect(domBBox, 'right').round();
				end = this.intersect(codBBox, 'left').round();
			}
			else
			{
				start = this.intersect(domBBox, 'left').round();
				end = this.intersect(codBBox, 'right').round();
			}
		}
		else
		{
			start = this.closest(domBBox, this.codomain).round();
			end = this.closest(codBBox, this.domain).round();
		}
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
			const normal = this.end.subtrace(this.start).normal().normalize();
			const band = Math.trunc(i/2);
			const v = normal.scale(2 * D.default.font.height * (band+1) * (i % 2 > 0 ? -1 : 1));
	//		const w = D2.scale(10 * ((i % 2) + 1) * (i % 2 ? -1 : 1), normal);
			const w = normal.scale(10 * ((i % 2) + 1) * (i % 2 ? -1 : 1));
	//		this.start = D2.round(D2.add(w, this.start));
			this.start = this.start.add(w).round();
	//		this.end = D2.round(D2.add(w, this.end));
			this.end = this.end.add(w).round();
	//		let cp1 = D2.round(D2.add(v, midpoint));
	//		let cp2 = D2.round(D2.add(v, midpoint));
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
		if (pntTop != false)
			r = D2.UpdatePoint(pntTop, r, pnt);
		if (pntBtm != false)
			r = D2.UpdatePoint(pntBtm, r, pnt);
		if (pntLft != false)
			r = D2.UpdatePoint(pntLft, r, pnt);
		if (pntRgt != false)
			r = D2.UpdatePoint(pntRgt, r, pnt);
		if (r.x === Number.MAX_VALUE)
			r = new D2({x:pnt.x, y:pnt.y});
		return r;
	}
}

//
// IndexCategory is a Category
//
class IndexCategory extends Category
{
	constructor(diagram, args)
	{
		super(diagram, args);
	}
}

//
// MultiMorphism is a Morphism
//
// a morphism comprised of other morphisms
//
class MultiMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
		this.morphisms = multiMorphism.SetupMorphisms(diagram, nuArgs.morphisms);
		this.morphisms.map(m => m.incrRefCnt());
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
	isIterable()
	{
		return this.morphisms.reduce((m, r) => r &= m.isIterable(), true);
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
			cod.graphs[i] = U.clone(g.graphs[dual ? 0 : 1]);
			cod.componentGraph(cod.graphs[i], i);
		});
		return graph;
	}
	//
	// MultiMorphism static methods
	//
	static SetupMorphisms(diagram, morphs)
	{
		return args.morphisms.map(m => (typeof m === 'string' ? diagram.codomain.getMorphism(m) : m));
	}
}

//
// Composite is a Morphism
//
class Composite extends Morphism
{
	constructor(diagram, args)
	{
		const morphisms = multiMorphism.SetupMorphisms(diagram, args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.name = Composite.Codename(diagram, morphisms);
		nuArgs.domain = Composite.Domain(diagram, morphisms);
		nuArgs.codomain = composite.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = 'properName' in args ? args.properName : Composite.ProperName(morphisms);
		nuArgs.category = diagram.codomain;
		super(diagram, args);
	}
	$(args)
	{
		return this.morphisms.reduce((d, m) => d ? m.$(d) : null, args);
	}
	//
	// A composite is considered iterable if the first morphism is iterable.
	//
	isIterable()
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
	static Codename(diagram, morphisms)
	{
		return `:${diagram.codomain.name}:Cm{${morphisms(m => m.name).join(',')}}mC`;
	}
	static Domain(diagram, morphisms)
	{
		return morphisms[0].domain;
	}
	static Codomain(diagram, morphisms)
	{
		return morphisms[morphisms.length - 1].codomain;
	}
	static Get(diagram, morphisms)
	{
		const name = Composite.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m === null ? new Composite(diagram, {morphisms}) : m;
	}
	static ProperName(morphisms)
	{
		return morphisms.map(m => m.properName).join('&#8728;');
	}
}

//
// ProductMorphism is a MultiMorphism
//
class ProductMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		const morphisms = multiMorphism.SetupMorphisms(diagram, args.morphisms);
		const nuArgs = U.clone(args);
		nuArgs.name = ProductMorphism.Codename(diagram, morphisms);
		nuArgs.domain = ProductMorphsim.Domain(diagram, morphisms);
		nuArgs.codomain = ProductMorphsim.Codomain(diagram, morphisms);
		nuArgs.morphisms = morphisms;
		nuArgs.properName = 'properName' in args ? args.properName : ProductMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	$(args)
	{
		return this.morphisms.map((m, i) => m.$(args[i]));
	}
	//
	// ProductMorphism static methods
	//
	static Codename(diagram, morphisms)
	{
		return `:${this.codomain.name}:Pm{${morphisms(m => m.name).join(',')}}mP`;
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
		return m === null ? new ProductMorphism(diagram, {morphisms}) : m;
	}
	static ProperName(morphisms)
	{
		return ProductObject.ProperName(morphisms);
	}
}

//
// CoproductMorphism is a Morphism
//
class CoproductMorphism extends MultiMorphism
{
	constructor(diagram, args)
	{
		let nuArgs = U.clone(args);
		nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		nuAargs.name = 'name' in args ? args.name : CoproductMorphism.Codename(diagram, morphisms);
		nuArgs.domain = CoproductMorphism.Domain(diagram, morphisms);
		nuArgs.codomain = CoproductMorphism.Codomain(diagram, morphisms);
		nuAargs.properName = 'properName' in args ? args.properName : CoproductMorphism.ProperName(morphisms);
		super(diagram, nuArgs);
	}
	$(args)
	{
		return [args[0], this.morphisms[args[0]].$(args[1])];
	}
	//
	// CoproductMorphism static methods
	//
	static Codename(diagram, morphs)
	{
		return `${this.codomain.name}:Cm{${morphs(m => m.name).join(',')}}mC`;
	}
	static Domain(diagram, morphs)
	{
		return coproductObject.Get(diagram, morphs.map(m => m.domain));
	}
	static Codomain(morphs)
	{
		return coproductObject.Get(diagram, morphs.map(m => m.codomain));
	}
	static Get(diagram, morphisms)
	{
		const name = CoproductMorphism.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m === null ? new CoproductMorphism(diagram, {morphisms}) : m;
	}
	static ProperName(morphisms)
	{
		return CoproductObject.ProperName(morphisms);
	}
}

//
// ProductAssembly is a MultiMorphism
//
class ProductAssembly extends MultiMorphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.morphisms = MultiMorphism.SetupMorphisms(diagram, args.morphisms);
		nuArgs.domain = ProductAssemblyMorphism.Domain(diagram, nuArgs.morphisms);
		nuArgs.codomain = ProductAssemblyMorphism.Codomain(diagram, nuArgs.morphisms);
		nuArgs.name = ProductAssembly.Codename(diagram, nuArgs.morhisms);
		nuArgs.properName = 'properName' in args ? args.properName : ProductAssembly.ProperName(nuArgs.morphisms);
		super(diagram, nuArgs);
	}
	$(args)
	{
		return this.morphisms.map(m => m.$(args));
	}
	getGraph(data = {position:0})
	{
		return this.mergeMorphismGraphs(graph);
	}
	//
	// ProductAssembly static methods
	//
	static Codename(diagram, morphisms)
	{
		return `${this.codomain.name}:Pa{${morphisms.map(m => m.name).join(',')}}aP`;
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
		const name = ProductAssemblyMorphism.Codename(diagram, morphisms);
		const m = diagram.getMorphism(name);
		return m === null ? new ProductAssemblyMorphism(diagram, {morphisms}) : m;
	}
	static ProperName(morphisms)
	{
		return `Pa{${morphisms.map(m => m.codomain.properName).join(',')}}`;
	}
}

//
// CoproductAssembly is a MultiMorphism
//
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
	getGraph(data = {position:0})
	{
		return this.mergeMorphismGraphs(graph)
	}
	//
	// static methods
	//
	static Codename(diagram, morphisms)
	{
		return `:${this.codomain.name}:Ca{${morphisms.map(m => m.name).join(',')}}aC`;
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
		return m === null ? new CoproductAssemblyMorphism(diagram, {morphisms}) : m;
	}
	static ProperName(morphisms)
	{
		return `(${morphisms.map(m => m.properName).join(',')})`;
	}
}

//
// FactorMorphism is a Morphism
//
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
	$(args)
	{
		const r = this.factors.map(f => f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
		return r.length === 1 ? r[0] : r;
	}
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
	//
	// static methods
	//
	static Codename(domain, factors)
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
	static Codomain(diagram, domain, factors)
	{
		return ProductObject.Get(diagram, factors.map(f => domain.getFactor(f)));
	}
	static Get(diagram, domain, factors)
	{
		const name = FactorMorphism.Codename(domain, factors);
		const m = diagram.getMorphism(name);
		return m === null ? new FactorMorphism(diagram, {domain, factors}) : m;
	}
	static ProperName(domain, factors)
	{
		return `&lt;${factors.map(f => domain.getFactorProperName(f)).join(',')}&gt;`;
	}
}

//
// DiagonalMorphism is a Morphism
//
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
		this.count = nuArgs.count;
	}
	$(args)
	{
		const d = [];
		return d.fill(args, 0, this.count);
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
	//
	// static methods
	//
	static Codename(domain, count)
	{
		return `:${this.codomain.name}:Dm{${domain.name}:${count}}mD`;
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
		return m === null ? new DiagonalMorphism(diagram, {domain, count}) : m;
	}
	static ProperName(domain, count)
	{
		return `&delta;&lt;${domain.properName}:${count}&gt;`;
	}
}

//
// FoldMorphism is a Morphism
//
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
	$(args)
	{
		return args[1];
	}
	//
	// static methods
	//
	static Codename(codomain, count)
	{
		return `:${this.codomain.name}:Fm{${codomain.name}:${count}}mF`;
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
		return m === null ? new FoldMorphism(diagram, {codomain, count}) : m;
	}
	static ProperName(codomain, count)
	{
		return `&nabla;&lt;${codomain.properName}:${count}&gt;`;
	}
}

//
// DataMorphism is a Morphism
//
// These do not live in the diagram source categories.
//
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
	$(args)
	{
		return args in this.data ? this.data[args] : null;
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
		const i = Math.min(this.limit, document.getElementById('inputTerm').value);
		this.data[i] = this.codomain.fromHTML();
	}
	clear()
	{
		this.data = {};
	}
}

//
// Recursive is a DataMorphism
//
class Recursive extends DataMorphism
{
	constructor(diagram, args)
	{
		super(diagram, args);
		this.setRecursor(args.recursor);
		this.setSignature();
	}
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
		if (Morphism.prototype.isPrototypeOf(this.recursor))
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

//
// LambdaMorphism is a Morphism
//
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
	//
	// static methods
	//
	static Codename(diagram, preCurry, domFactors, homFactors)
	{
		const preCur = diagram.codomain.getMorphism(preCurry);
		const hom = HomObject.Get(diagram, [preCurry.domain, preCurry.codomain]);
		return `:${preCurry.domain.name}:Lm{${preCur.name},${ProductObject.Codename(domFactors.map(f => hom.getFactorName(f)))},${ProductObject.Codename(codFactors.map(f => hom.getFactorName(f)))}}mL`;
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
		return m === null ? new LambdaMorphism(diagram, {preCurry, domFactors, homFactors}) : m;
	}
	static ProperName(preCurry, domFactors, homFactors)
	{
		return `&lambda.;${preCurry.properName}&lt;${domFactors}:${homFactors}`;
	}
}

//
// StringMorphism is a Morphism
//
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
	//	const graphFunctor = R.$Cat.getMorphism('Graph');
	//	const sm = graphFunctor.$$(diagram, from.to);
		const dom = {x:from.domain.x - from.domain.width/2, y:from.domain.y, name:from.domain.name};
		const cod = {x:from.codomain.x - from.codomain.width/2, y:from.codomain.y, name:from.codomain.name};
		this.updateSVG({index:[], dom, cod, visited:[], elementId:from.elementId()});
	}
	RemoveStringSvg(from)
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
	//
	// dom is a D2
	//
	static SvgLinkUpdate(dom, lnk, data)	// data {graph, dom:{x,y}, cod:{x,y}}
	{
		const isDomLink = lnk[0] === 0;
		const f = R.getFactor(data.graph, lnk);
		const cod = new D2(Math.round(f.position + (f.width/2.0) + (isDomLink ? data.dom.x : data.cod.x)), isDomLink ? data.dom.y : data.cod.y);
		const dx = cod.x - dom.x;
		const dy = cod.y - dom.y;
		const adx = Math.abs(dx);
		const ady = Math.abs(dy);
	//	const normal = dy === 0 ? ((data.cod.y - data.dom.y) > 0 ? {x:0, y:-1} : {x:0, y:1}) : D2.normalize(D2.normal(D2.subtract(cod, dom)));
		const normal = dy === 0 ? ((data.cod.y - data.dom.y) > 0 ? new D2({x:0, y:-1}) : new D2({x:0, y:1})) : cod.subtract(dom).normal().normalize();
		const h = (adx - ady) / (1.0 * adx);
	//	const v = D2.scale(D2.dist(dom, cod) * h / 4.0, normal);
		const v = normal.scale(cod.dist(dom) * h / 4.0);
	//	let cp1 = D2.round(D2.add(v, dom));
	//	let cp2 = D2.round(D2.add(v, cod));
		const cp1 = v.add(dom).round();
		const cp2 = v.add(cod).round();
		return adx < ady ? `M${dom.x},${dom.y} L${cod.x},${cod.y}` : `M${dom.x},${dom.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cod.x},${cod.y}`;
	}
}

//
// Evaluation is a Morphism
//
class Evaluation extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getObject(args.domain);
		if (!Evaluation.CanEvaluate(nuArgs.domain))
			throw 'object for evaluation domain cannot be evaluated';
		nuArgs.name = Evaluation.Codename(diagram, nuArgs.domain);
		nuArgs.codoamin = nuArgs.domain.objects[0].objects[1];
		nuArgs.properName = Evaluation.ProperName(nuArgs.domain);
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
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
	$(args)
	{
		return args[0].$([args[1]]);
	}
	//
	// static methods
	//
	// Check that the object is of the form [A, B] x A
	//
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
		return `:${diagram.codomain.name}:Ev{${object.name}}vE`;
	}
	static ProperName(diagram, object)
	{
		return `Ev&lt;${object.properName}&gt;`;
	}
	static Get(diagram, domain)
	{
		const name = Evaluation.Codename(diagram, domain);
		const m = diagram.getMorphism(name);
		return m === null ? new Evaluation(diagram, {domain}) : m;
	}
}

//
// InitialMorphism is a Morphism
//
class InitialMorphism extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.codomain = diagram.getObject(args.codomain);
		nuArgs.domain = diagram.getObject('0');
		if (!nuArgs.domain)
			throw 'no initial object';
		nuArgs.name = InitialMorphism.Codename(diagram, nuArgs.codomain);
		nuArgs.properName = 'properName' in args ? args.properName : InitialMorphism.ProperName();
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	//
	// static methods
	//
	static Codename(diagram, domain, codomain = null)
	{
		return `:${diagram.codomain.name}:In{${basename}}nI`;
	}
	static Get(diagram, codomain)
	{
		const name = InitialMorphism.Codename(diagram, codomain);
		const m = diagram.getMorphism(name);
		return m === null ? new InitialMorphism(diagram, {codomain}) : m;
	}
	static ProperName()
	{
		return '0';
	}
}

//
// Functor is a Morphism
//
// Generally expect diagram to be R.$Cat.
//
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
	//
	// FITB
	//
	$(args)
	{
		throw 'functor has no object action';
	}
	$$(args)
	{
		throw 'functor has no morphism action';
	}
}

/*
//
// NProductFunctor is a Functor
//
class NProductFunctor extends Functor
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getObject(args.domain);
		const objects = [];
		nuArgs.codomain = ProductObject.Get(diagram, objects.fill(nuArgs.domain, 0, args.count));
		nuArgs.name = NProductFunctor.Codename(diagram, nuArgs.domain, nuArgs.count)
		nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : NProductFunctor.ProperName(diagram, nuArgs.domain, nuArgs.count)
		super(diagram, nuArgs);
	}
	$(args)
	{
		const objects = [];
		return ProductObject.Get(this.diagram, objects.fill(args[0], 0, args[1]));
	}
	$$(args)
	{
		const morphisms = [];
		return ProductMorphism.Get(this.diagram, morphisms.fill(args[0], 0, args[1]));
	}
	//
	// DiagonalMorphism static methods
	//
	static Codename(diagram, domain, count)
	{
		return `:${diagram.codomain.name}:Nf{${domain.name}:${count}}fN`;
	}
	static ProperName(domain, count)
	{
		return `&Pi;&lt;${domain.properName}:${count}&gt;>`;
	}
	static Get(diagram, domain, count)
	{
		const f = diagram.getMorphism(NProductFunctor.Codename(diagram, domain, count));
		return f ? f : new NProductFunctor(diagram, {domain, count});
	}
}
*/

//
// Diagram is a Functor
//
// args:
//		name is taken from the Element Codename
//		domain is the name of an index category
//		codomain is a string naming a category, or is taken to be the name of the codomain argument
//		references is a list of reference diagrams
//
class Diagram extends Functor
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		if (!('user' in args))
			throw 'Specify user for a diagram';
		nuArgs.name = 'name' in nuArgs ? nuArgs.name : Diagram.Codename(args);
		nuArgs.domain = new IndexCategory(diagram, 'domainData' in args ? args.domainData : {name:`${R.user.name}:${nuArgs.name}:Index`});
		nuArgs.codomain = U.getArg(nuArgs, 'codomain', diagram ? diagram.getObject(nuArgs.codomain) : null);R.Cat2;
		nuArgs.category = U.getArg(args, 'category', diagram && 'codomain' in diagram ? diagram.codomain : null);
		super(diagram, nuArgs);
		this.references = 'references' in nuArgs ? args.references.map(ref => R.Diagrams.getMorphism(ref)) : [];
		this.makeHomSets();
//		this.updateElements();
		//
		// the currently selected objects and morphisms in the GUI
		//
		this.selected = [];
		//
		// where are we viewing the diagram
		//
		this.viewport = U.getArg(args, 'viewport', {x:0, y:0, scale:1, width:D.Width(), height:D.Height()});
		if (isGUI && this.viewport.width === 0)
		{
			this.viewport.width = window.innerWidth;
			this.viewport.height = window.innerHeight;
			this.viewport.scale = 1;
		}
		this.timestamp = U.getArg(args, 'timestamp', Date.now());
		this.texts = 'texts' in args ? args.texts.map(d => new DiagramText(this, d)) : [];
		//
		// load the codomain data so we get its objects and morphisms
		//
		if ('codomainData' in args)
			this.codomain.Process(this, args.codomainData);
		this.textId = U.getArg(args, 'textId', 0);
		//
		// the graph category for the string morphisms
		//
//		this.graphCat = new Category(diagram, {basename:'Graph', user:this.user, objects:this.codomain.objects});
		this.colorIndex2colorIndex = {};
		this.colorIndex2color = {};
		this.link2colorIndex = {};
		this.colorIndex = 0;
	}
	/*
	Diagram.prototype.info()
	{
		let d = super.json();
		d.viewport =	this.viewport;
		d.references =	this.references.map(r => r.name);
		d.textId =		this.textId;
		d.timestamp =	this.timestamp;
		return d;
	}
	*/
	json()
	{
		const a = super.json();
		a.viewport =	this.viewport;
		a.references =	this.references.map(r => r.name);
		a.textId =		this.textId;
		a.timestamp =	this.timestamp;
		a.domainData =	this.domain.json();
		a.codomainData =this.codomain.json();
		a.texts =	this.texts.map(t => t.json());
		return a;
	}
	//
	// Retrieve an object from the diagram's target category.
	//
	getObject(name)
	{
		//
		// if it is already an element, return it
		//
		if (Element.prototype.isPrototypeOf(name))
			return name;
		//
		// if it is an operator name, then it must be for this diagram's category
		//
		let object = this.codomain.getObject(name);
		if (object)
			return object;
		//
		// search the reference diagrams
		//
		for (let i=0; i<this.references.length; ++i)
		{
			object = this.references[i].getObject(name);
			if (object)
				return object;
		}
		//
		// last chance try the diagram's domain graph category
		//
		return this.domain.getObject(name);
	}
	getMorphism(name)
	{
		//
		// if it is already an object, return it
		//
		if (Morphism.prototype.isPrototypeOf(name))
			return name;
		//
		// if it is an operator name, then it must be for this diagram's category
		//
		let morphism = this.codomain.getMorphism(name);
		//
		// search the reference diagrams
		//
		for (let i=0; i<this.references.length; ++i)
		{
			morphism = this.references[i].getMorphism(name);
			if (morphism)
				return morphism;
		}
		//
		// last chance try the diagram's domain graph category
		//
		return this.domain.getMorphism(name);
	}
	gui(e, elt, fn)
	{
		try
		{
			//
			// see if the category has a special handler
			// and if not take the diagram's handler for stock actions
			//
			if (fn in this.codomain)
				this.codomain[fn](e, elt);
			else if (fn in this)
				this[fn](e, elt);
		}
		catch(x)
		{
			D.recordError(x);
		}
	}
	saveLocal()
	{
		if (R.debug)
			console.log('save to local storage', Diagram.StorageName(this.name));
		this.timestamp = Date.now();
		localStorage.setItem(Diagram.StorageName(this.name), this.stringify());
	}
	setView()
	{
		D.diagramSVG.setAttribute('transform', `translate(${this.viewport.x}, ${this.viewport.y})scale(${this.viewport.scale})`);
	}
	update(e, sel = null, hom = false, save = true)
	{
		this.setView();
		if (e && sel)
			this.addSelected(e, sel, true);
		if (hom)
			this.makeHomSets();
		this.updateMorphisms();
		if (save && R.autosave)
			this.saveLocal();
		if (DiagramObject.prototype.isPrototypeOf(sel))
			D.objectPanel.update();
		else if (DiagramMorphism.prototype.isPrototypeOf(sel))
			D.morphismPanel.update();
		else if (DiagramText.prototype.isPrototypeOf(sel))
			D.textPanel.update();
	}
	/*
	clear(e)
	{
		if (this.readonly)
			return;
		U.display.deactivateToolbar();
		this.domain.clear();
		this.codomain.clear();
		this.selected = [];
		this.makeHomSets();
		this.texts = [];
		U.display.diagramSVG.innerHTML = R.diagram.makeAllSVG();
		display.updatePanels();
		if ('orig' in this.viewport)
			delete this.viewport.orig;
		this.update(e);
	}
	*/
	addSelected(e, elt, clear = false)
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
		if (DiagramObject.prototype.isPrototypeOf(elt))	// TODO what about morphisms as objects in 2Cat?
			elt.orig = {x:elt.x, y:elt.y};
		else
		{
			elt.domain.orig = {x:elt.domain.x, y:elt.domain.y};
			elt.codomain.orig = {x:elt.codomain.x, y:elt.codomain.y};
			if (DataMorphism.prototype.isPrototypeOf(elt) && elt.name !== document.getElementById('dataPanelTitle').innerHTML)
				D.dataPanel.close();
		}
		this.activateToolbar(e);
	}
	removeSelected(e)
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
			if (DiagramObject.prototype.isPrototypeOf(s))	// TODO what about morphisms as objects in 2Cat?
				updateOjects = true;
			else if (DiagramMorphism.prototype.isPrototypeOf(s))
				updateMorphisms = true;
			else if (DiagramText.prototype.isPrototypeOf(s))
				updateTexts = true;
		}
		this.update(null, null, updateMorphisms, true);
		if (updateObjects)
			D.objectPanel.update();
		if (updateMorphisms)
			D.morphismPanel.update();
		if (updateTexts)
			D.textPanel.update();
	}
	pickElement(e, name, cls)
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
				if (D.mouseDown)
					D.drag = true;
			}, D.default.dragDelay);
			D.dragStart = this.mousePosition(e);
			if (!this.isSelected(elt))
				this.addSelected(e, elt, !D.shiftKey);
			else
				this.activateToolbar(e);
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
	editSelected(e)
	{
		const from = this.getSelected();
		if (this.readonly)
			throw 'Diagram is readonly.';
		if (!this.isMorphismEditable(from))
			throw `Morphism ${from.to.properName} is not editable.`;
		if (DataMorphism.prototype.isPrototypeOf(from.to))
		{
			const to = this.newDataMorphism(from.to.domain, from.to.codomain);
			this.setMorphism(from, to);
			this.updateElementAttribute(from, 'properName', to.properName);
			this.update(e, from, true);
		}
		D.dataPanel.update();
		D.dataPanel.open();
	}
	deleteAll()
	{
		this.deselectAll();
		this.domain.clear();	// TODO
		this.codomain.clear();	// TODO
		if ('homSets' in this.domain)
			this.domain.homSets.clear();
	}
	isMorphismEditable(from)
	{
		return !this.readonly &&
			(DataMorphism.prototype.isPrototypeOf(from.to) ||
			(Identity.prototype.isPrototypeOf(from.to) && from.refcnt === 1 && !from.to.domain.isInitial && !from.to.codomain.isTerminal && from.to.domain.isEditable()));
	}
	toolbar(from)
	{
		const del = !this.readonly && from.isDeletable();
		let btns = H.td(D.getButton('close', 'D.deactivateToolbar()', 'Close'), 'buttonBar') +
					(del ? H.td(D.getButton('delete', `R.diagram.gui(evt, this, 'removeSelected')`, 'Delete'), 'buttonBar') : '');
		if (!this.readonly)
		{
			if (DiagramMorphism.prototype.isPrototypeOf(from))
			{
				const domMorphs = this.domain.obj2morphs.get(from.domain);
				if (del && domMorphs.dom.length + domMorphs.cod.length > 1)
					btns += H.td(D.getButton('detachDomain', `R.diagram.guiDetach(evt, 'domain')`, 'Detach domain'), 'buttonBar');
				const codMorphs = this.domain.obj2morphs.get(from.codomain);
				if (del && codMorphs.dom.length + codMorphs.cod.length > 1)
					btns += H.td(D.getButton('detachCodomain', `R.diagram.guiDetach(evt, 'codomain')`, 'Detach codomain'), 'buttonBar');
				const isEditable = this.isMorphismEditable(from);
				if (isEditable)
					btns += H.td(D.getButton('edit', `R.diagram.gui(evt, this, 'editSelected')`, 'Edit data'), 'buttonBar');
				else if (Composite.prototype.isPrototypeOf(from.to) && from.to.isIterable())
					btns += (!this.readonly ? H.td(D.getButton('run', `R.diagram.gui(evt, this, 'run')`, 'Evaluate'), 'buttonBar') : '');
				if (this.codomain.isClosed && (ProductObject.prototype.isPrototypeOf(domain) || HomObject.prototype.isPrototypeOf(codomain)))
					btns += H.td(D.getButton('lambda', `R.diagram.gui(evt, this, 'lambdaForm')`, 'Curry'), 'buttonBar');
				btns += H.td(D.getButton('string', `R.diagram.gui(evt, this, 'displayString')`, 'String'), 'buttonBar');
			}
			else if (DiagramObject.prototype.isPrototypeOf(from))
				btns += H.td(D.getButton('copy', `R.diagram.copyObject(evt)`, 'Copy object'), 'buttonBar') +
						H.td(D.getButton('toHere', `R.diagram.toolbarHandler('codomain', 'toolbarTip')`, 'Morphisms to here'), 'buttonBar') +
						H.td(D.getButton('fromHere', `R.diagram.toolbarHandler('domain', 'toolbarTip')`, 'Morphisms from here'), 'buttonBar') +
						H.td(D.getButton('project', `R.diagram.gui(evt, this, 'Diagram.factorBtnCode')`, 'Factor morphism'), 'buttonBar');
	//					(this.hasDualSubExpr(from.to.expr) ? H.td(D.getButton('distribute', `R.diagram.gui(evt, this, 'distribute')`, 'Distribute terms'), 'buttonBar') : '');	// TODO whereto?
		}
		btns += DiagramMorphism.prototype.isPrototypeOf(from) ? H.td(D.getButton('symmetry', `R.diagram.gui(evt, this, 'flipName')`, 'Flip text'), 'buttonBar') : '';
		btns += H.td(D.getButton('help', `R.diagram.gui(evt, this, 'elementHelp')`, 'Description'), 'buttonBar');
		let html = H.table(H.tr(btns), 'buttonBarLeft') + H.br();
		return html;
	}
	toolbarHandler(dir, id)
	{
		if (this.selected.length !== 1)
			return;
		const from = this.getSelected();
		if (DiagramObject.prototype.isPrototypeOf(from))
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
			html += H.table(D.MorphismTableRows(morphs, `onclick="R.diagram.objectPlaceMorphism(event, '${dir}', '${from.name}', '%1')"`), 'toolbarTbl');
			morphs = this.getTransforms(dir, from.to);
			html += H.small('Transforms:');
			html += H.table(D.MorphismTableRows(morphs, `onclick="R.diagram.placeTransformMorphism(event, '%1', '${dir}', '${from.name}')"`), 'toolbarTbl');
			document.getElementById(id).innerHTML = html;
		}
	}
	distribute(e)
	{
		const from = this.getSelected();
		const text = from.to.properName;
		let html = H.h4('Distribute') +
					H.h5(`Domain Factors`) +
					H.small('Click to place in codomain') +
						H.button('1', '', D.elementId(), 'Add terminal object',
						`onclick="R.diagram.addFactor('codomainDiv', 'selectedFactorMorphism', 'One', '', -1)"`) +
					this.getFactorButtonCode(from.to, {fname:'selectedFactorMorphism', root:from.to.name, index:[], id:'codomainDiv', action:'', op:'product'}) +
					H.h5('Codomain Factors') + H.br() +
					H.small('Click to remove from codomain') +
					H.div('', '', 'codomainDiv');
		D.toolbarTip.innerHTML = html;
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
	showString(from)
	{
		const id = StringMorphism.GraphId(from);
		if (StringMorphism.RemoveStringSvg(from))
			return;
		const graphFunctor = R.$Cat.getMorphism('Graph');
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
				H.small('Merge to codomain hom') + D.getButton('codhom', `R.diagram.toggleCodHom()`, 'Merge codomain hom', D.default.button.tiny) + H.br() : '') +
			H.small('Click to move to A &otimes; B') +
			// TODO this factorButton arguments are not correct
			H.div(HomObject.prototype.isPrototypeOf(codomain) ? codomain.homDomain().factorButton({dir:1, fromId:'codomainDiv', toId:'domainDiv'}) : '', '', 'codomainDiv') +
			H.span(D.getButton('edit', `R.diagram.gui(evt, this, 'lambdaMorphism')`, 'Curry morphism'));
		D.toolbarTip.innerHTML = html;
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
				//
				// basename
				//
				const basenameElt = document.getElementById('basenameElt');
				const basename = basenameElt.innerText;
				// TODO why userNameEx?
				if (!U.userNameEx.test(basename))
					throw 'Invalid object basename';
				const object = this.codomain.getObject(Element.Codename(this, basename));
				if (object)
					throw `object with basename ${basename} already exists in diagram ${this.properName}`;
				//
				// properName
				//
				const properNameElt = document.getElementById('properNameElt');
				const properName = U.htmlEntitySafe(properNameElt.innerText);
				//
				// description
				//
				const descriptionElt = document.getElementById('descriptionElt');
				const description = U.htmlEntitySafe(descriptionElt.innerText);
				let toNI = new CatObject(this, {basename, description, properName});
				const iso = new Identity(this, {domain:toNI, codomain:from.to, description:`Named identity from ${toNI.properName} to ${from.to.properName}`});
				const iso2 = new Identity(this, {domain:from.to, codomain:toNI, description:`Named identity from ${from.to.properName} to ${toNI.properName}`});
				this.deselectAll();
				const isoFrom = this.objectPlaceMorphism(e, 'codomain', from.name, iso.name)
				const iso2From = new DiagramMorphism(this, {to:iso2, domain:isoFrom.codomain.name, codomain:isoFrom.domain.name});
				iso2From.addSVG();
				D.deactivateToolbar();
				this.makeHomSets();
				this.saveLocal();
			}
			else
				throw 'Not implemented';
		}
		catch(e)
		{
			document.getElementById('namedElementError').innerHTML = 'Error: ' + U.getError(e);
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
			this.saveLocal();
		}
	}
	//
	// Show the help page for the selected element.
	//
	elementHelp()
	{
		const from = this.getSelected();
		const readonly = from.diagram.readonly;
		let html = '';
		const create = (!readonly && from.to && from.to.isComplex()) ? D.getButton('edit', `R.diagram.activateNamedElementForm(evt)`, 'Create named identity', D.default.button.tiny) : '';
		if (from.to)
			html = H.h4(H.span(from.to.properName, '', 'properNameElt') + create) +
							H.p(H.span(U.cap(from.to.description), '', 'descriptionElt')) +
							H.p(H.span(U.limit(from.to.basename), '', 'basenameElt', from.to.name)) +
							H.p(`Prototype ${from.to.constructor.name}`) +
							H.p(`Category ${from.to.codomain.properName}`) +
							H.div('', 'error', 'namedElementError');
		else
			html = H.p(H.span(from.properName, 'tty', 'properNameElt') +
						(readonly ? '' : D.getButton('edit', `R.diagram.editElementText('properNameElt', 'properName')`, 'Edit proper name', D.default.button.tiny)));
		D.toolbarTip.innerHTML = html;
	}
	// TODO
	getTransforms(dir, object = null)
	{
		let transforms = [];
		const catName = this.codomain.name;
		for(const [tName, t] of R.$Cat2.morphisms)
			t[dir].name === catName && ((object && 'testFunction' in t) ? t.testFunction(this, object) : true) && transforms.push(t);
		return transforms;
	}
	updateDragObjects(p)
	{
		const delta = p.subtract(D.dragStart);
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
			if ('orig' in elt)
				elt.updatePosition(delta.add(elt.orig));
			const homset = this.domain.obj2morphs.get(elt);
			if (typeof homset !== 'undefined')
			{
				homset.dom.map(m => m.update());
				homset.cod.map(m => m.update());
			}
		}, this);
	}
	placeElement(e, elt)
	{
		elt.addSVG();
		this.update(e, elt);
	}
	placeObject(e, to, xy)
	{
		let from = null;
		if (typeof xy === 'undefined')
		{
			
			const xy = D.grid(this.userToDiagramCoords({x:D.grid(D.Width()/2), y:D.grid(D.Height()/2)}));
			from = new DiagramObject(this, {xy, to});
		}
		else
			from = new DiagramObject(this, {xy:D.grid(xy), to});
		this.placeElement(e, from);
		return from;
	}
	placeMorphism(e, to, xyDom, xyCod)
	{
		const domain = new DiagramObject(this, {xy:D.grid(xyDom)});
		const codomain = new DiagramObject(this, {xy:D.grid(xyCod)});
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
			for(const [name, m] of this.domain.morphisms)
				if (from.isEquivalent(m.domain))
					angles.push(D2.Angle(from, m.codomain));
				else if (from.isEquivalent(m.codomain))
					angles.push(D2.Angle(from, m.domain));
			angles.sort();
			let gap = 0;
			const al = D.default.arrow.length;
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
			const xy = D.grid({x:fromObj.x + cosAngle * (al + tw), y:fromObj.y + Math.sin(angle) * (al + tw)});
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
			const from = new DiagramMorphism(this, {to, domain:domainElt.name, codomain:codomainElt.name});
			from.incrRefcnt();
			newElt.addSVG();
			from.addSVG();
			this.update(e, from);
			return from;
		}
		catch(x)
		{
			D.recordError(x);
		}
	}
	placeTransformMorphism(e, tranName, dir, name)
	{
		try
		{
			const object = this.domain.getObject(name).to;
			const trn = R.$Cat2.getMorphism(tranName);
			const m = trn.$(this, object);
			this.objectPlaceMorphism(e, dir, name, m);
		}
		catch(x)
		{
			D.recordError(x);
		}
	}
	getAttachedObjects(dir)		// dir == 'domain'|'codomain'
	{
		const objects = [];
		for(let i=0; i<this.selected; ++i)
		{
			const elt = this.selected[i];
			if (DiagramMorphism.prototype.isPrototypeOf(elt))
				objects.push(elt[dir]);
		}
		return objects;
	}
	/*
	product(e)
	{
		let from = null;
		const elt = this.getSelected();
		if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			const diagramMorphisms = this.getSelectedMorphisms();
			const morphisms = diagramMorphisms.map(m => m.to);
			const to = ProductMorphism.Get(this, morphisms);
			to.incrRefcnt();
			from = this.trackMorphism(this.mousePosition(e), m);
			if (!e.shiftKey)
				diagramMorphisms.map(m => this.isIsolated(m) ? m.decrRefcnt() : null);
		}
		else if (DiagramObject.prototype.isPrototypeOf(elt))
		{
			const diagramObjects = this.getSelectedObjects());
			const objects = diagramObjects.map(o => o.to);
			const to = ProductObject.Get(this, objects);
			from = new DiagramObject(this, {xy:D.Barycenter(this.selected), to});
			from.addSVG();
			if (!e.shiftKey)
				diagramObjects.map(o => this.isIsolated(o) ? o.decrRefcnt() : null);
		}
		this.addSelected(e, from, true);
		this.update(e, from);
	}
	*/
	coproduct(e)
	{
		let from = null;
		const elt = this.getSelected();
		if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			const morphisms = this.getSelectedMorphisms();
			const toMorphs = morphisms.map(m => m.to);
			const to = CoproductMorphism.Get(this.codomain, toMorphs);
			to.incrRefcnt();
			from = this.trackMorphism(this.mousePosition(e), m);
			if (!e.shiftKey)
				morphisms.map(m => this.isIsolated(m) ? m.decrRefcnt() : null);
		}
		else if (DiagramObject.prototype.isPrototypeOf(elt))
		{
			const diagramObjects = this.getSelectedObjects();
			const objects = diagramObjects.map(o => o.to);
			const to = CoproductObject.Get(this, objects);
			from = new DiagramObject(this, {xy:D.Barycenter(this.selected), to});
			from.addSVG();
			if (!e.shiftKey)
				diagramObjects.map(o => this.isIsolated(o) ? o.decrRefcnt() : null);
		}
		this.addSelected(e, from, true);
		this.update(e, from);
	}
	trackMorphism(xy, to, src = null)
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
			const codLen = D.textWidth(to.domain.properName)/2;
			const domLen = D.textWidth(to.codomain.properName)/2;
			const namLen = D.textWidth(to.properName);
			codomain = new DiagramObject(this,
			{
				xy:
				{
					x:xy.x + Math.max(D.default.arrow.length, domLen + namLen + codLen + D.default.arrow.length/4),
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
	/*
	productAssembly(e)
	{
		const m = ProductAssembly.Get(this, this.getSelectedMorphisms());
		this.objectPlaceMorphism(e, 'domain', m.domain, m);
	}
	coproductAssembly(e)
	{
		const m = CoproductAssembly.Get(this, this.getSelectedMorphisms());
		this.objectPlaceMorphism(e, 'codomain', m.codomain, m);
	}
	*/
	deselectAll(toolbarOff = true)
	{
		D.dataPanel.close();
		if (toolbarOff)
			D.deactivateToolbar();
		this.selected.map(elt => elt.showSelected(false));
		this.selected = [];
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
	checkFusible(pnt)
	{
		if (this.selected.length === 1)
		{
			const elt = this.getSelected();
			const melt = elt.isEquivalent(D.mouseover) ? null : D.mouseover;
			if (DiagramObject.prototype.isPrototypeOf(elt))
			{
				if (DiagramObject.prototype.isPrototypeOf(melt))
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
			else if (DiagramMorphism.prototype.isPrototypeOf(elt))
				elt.showFusible(DiagramMorphism.prototype.isPrototypeOf(melt) && this.canProductMorphisms(elt, melt));
		}
	}
	//
	// Find an element in the diagram at a given location.
	//
	findElement(pnt, except = '')
	{
		let elt = null;
		//
		// search the diagram's objects for a hit
		//
		D.topSVG.querySelectorAll('.object').forEach(function(o)
		{
			if (o.dataset.name === except)
				return;
			const bbox = o.getBBox();
			const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
			if (D2.Inside(bbox, pnt, upperRight))
				elt = this.domain.getObject(o.dataset.name);
		}, this);
		//
		// if no hit start searching the morphism text label
		//
		if (elt === null)
			D.topSVG.querySelectorAll('.morphTxt').forEach(function(o)
			{
				if (o.dataset.name === except)
					return;
				const bbox = o.getBBox();
				const upperRight = {x:bbox.x + bbox.width, y:bbox.y + bbox.height};
				if (D2.Inside(bbox, pnt, upperRight))
					elt = this.domain.getMorphism(o.dataset.name);
			}, this);
		//
		// if no hit search the morphism arrows
		//
		if (elt === null)
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
		//
		// if no hit search the element text
		//
		if (elt === null)
		{
			D.topSVG.querySelectorAll('.element').forEach(function(t)
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
					elt = this.domain.getElement(t.dataset.name);
			}, this);
		}
		return elt;
	}
	canFuseObjects(dragFrom, targetFrom)
	{
		if (DiagramObject.prototype.isPrototypeOf(dragFrom))
		{
			const dragTo = dragFrom.to;
			const targetTo = targetFrom.to;
			if ((dragTo.isInitial && !targetTo.isInitial) || (!dragTo.isInitial && targetTo.isInitial))
				return false;
			const morphisms = this.getObjectMorphisms(dragFrom);
			if (morphisms.domains.length === 0 && morphisms.codomains.length === 0)
				return true;
			const a = dragTo.name === targetTo.name && !dragFrom.isEquivalent(targetFrom);
			let b = false;
			if (morphisms.codomains.length > 0)
			{
				const to = morphisms.codomains[0].to;
				b = morphisms.codomains.length === 1 && morphisms.domains.length === 0 && Identity.prototype.isPrototypeOf(to);  // TODO multiple forms of identities
			}
			return a||b;
		}
		return false;
	}
	/*
	canProductMorphisms(v, w)
	{
		// TODO
	//	return this.codomain.hasProducts && v.class === 'morphism' && w.class === 'morphism' && this.isIsolated(v) && this.isIsolated(w);
		return true;
	}
	*/
	getSelected()
	{
		return this.selected.length > 0 ? this.selected[0] : null;
	}
	getSelectedObjects()
	{
		return this.selected.filter(s => DiagramObject.prototype.isPrototypeOf(s));
	}
	getSelectedMorphisms()
	{
		return this.selected.filter(s => DiagramMorphism.prototype.isPrototypeOf(s));
	}
	/*
	compose(e)
	{
		const morphisms = this.getSelectedMorphisms();
		const to = Composite.Get(this, morphisms.map(m => m.to));
	//	const from = new DiagramMorphism(this, {to, domain:this.selected[0].domain, codomain:this.selected[this.selected.length -1].codomain});
		const from = new DiagramMorphism(this, {to, domain:Composite.Domain(morphisms), codomain:Composite.Codomain(morphisms)});
		from.morphisms = morphisms;
		from.addSVG();
		this.update(e, from, true);
	}
	*/
	run(e)
	{
		const from = this.getSelected();
		const isThreeD = from.to.codomain.name === 'threeD';
		const isTty = from.to.codomain.name === 'tty';
		if (Morphism.isProtypeOf(from) && from.to.isIterable())
		{
			const start = Date.now();
			if (isThreeD)
			{
				D.threeDPanel.open();
				D.threeDPanel.resizeCanvas();
			}
			const toResult = this.codomain.run(from.to, this);
			if (isThreeD)
				D.threeDPanel.view('front');
			if (toResult !== null)
			{
				const fromResult = new DiagramMorphism(this, {to, domain:from.domain, codomain:from.codomain});
				fromResult.incrRefcnt();
				fromResult.addSVG();
				this.addSelected(e, fromResult, true);
			}
			if (isTty)
			{
				D.ttyPanel.open();
				Panel.AccordionOpen('ttyOutPnl');
			}
			const delta = Date.now() - start;
			D.status(e, `<br/>Elapsed ${delta}ms`);
		}
		D.drag = false;
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
		const div = document.getElementById(id);
		if (div.innerHTML === '')
			div.innerHTML = H.span(D.getButton('edit', `R.diagram.${fname}(evt)`, 'Create morphism'));
		//
		// start with the first element and go down from there
		//
		const object = this.getObject(root);
		const factor = object.getFactor(indices);
		const sub = indices.join();
		div.innerHTML += H.button(factor.properName + H.sub(sub), '', '', '', `data-indices="${indices.toString()}" onclick="U.H.del(this);${action}"`);
	}
	selectedFactorMorphism(e)		// TODO moved
	{
		const from = this.getSelected();
		const m = this.addFactorMorphism(from.to, Diagram.GetFactorsById('codomainDiv'));
		this.objectPlaceMorphism(e, 'domain', from, m)
	}
	newDataMorphism(dom, cod)
	{
		const name = this.codomain.getAnon('Data');
		return new DataMorphism(this.codomain, {name, properName:name.slice(0, 9) + '&hellip;', diagram:this.name, domain:dom.name, codomain:cod.name});
	}
	makeAllSVG()
	{
		let svg = '';
		for (const [name, o] of this.domain.objects)
			try
			{
				svg += o.makeSVG();
			}
			catch(e)
			{
				D.recordError(e);
			}
		for (const [name, m] of this.domain.morphisms)
			try
			{
				svg += m.makeSVG();
			}
			catch(e)
			{
				D.recordError(e);
			}
		svg += this.texts.map(t => t.makeSVG());
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
				D.status(e, `Uploaded diagram.<br/>Elapsed ${delta}ms`);
			});
		}
		else
			D.recordError('You need to be logged in to upload your work.');
	}
	guiDetach(e, dir)
	{
		try
		{
			const from = this.getSelected();
			const object = from[dir];
			const detachedObj = new DiagramObject(this,
				{
					xy:
					{
						x:object.x + D.default.toolbar.x,
						y:object.y + D.default.toolbar.y
					}
				});
			object.decrRefcnt();
			from[dir] = detachedObj;
			detachedObj.setObject(from.to[dir]);
			detachedObj.incrRefcnt();
			detachedObj.addSVG();
			from.update();
			this.update(e, null, true)
			D.deactivateToolbar();
			this.activateToolbar(e);
		}
		catch(x)
		{
			D.recordError(x);
		}
	}
	userToDiagramCoords(xy, orig = false)
	{
		const pos = D.topSVG.getBoundingClientRect();
		const s = 1.0 / this.viewport.scale;
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
	mousePosition(e)
	{
		return this.userToDiagramCoords({x:e.clientX, y:e.clientY});
	}
	home()
	{
		D.deactivateToolbar();
		this.viewport.x = 0;
		this.viewport.y = 0;
		this.viewport.scale = 1;
		this.setView();
		this.saveLocal();
	}
	updateElementAttribute(from, attr, val)
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
	editElementText(id, attr)
	{
		const h = document.getElementById(id);
		if (!this.readonly && h.contentEditable === 'true' && h.textContent !== '')
		{
			const from = this.getSelected();
			h.contentEditable = false;
			this.updateElementAttribute(from, attr, U.htmlEntitySafe(h.innerText));
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
		if (DataMorphism.prototype.isPrototypeOf(from.to))
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
	isIsolated(elt)
	{
		let r = false;
		if (DiagramObject.prototype.isPrototypeOf(elt))
			r = elt.refcnt === 1;
		else if (DiagramMorphism.prototype.isPrototypeOf(elt))
		{
			const domMorphs = this.domain.obj2morphs.get(elt.domain);
			const codMorphs = this.domain.obj2morphs.get(elt.codomain);
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
				//
				// find the natural numbers object
				//
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
	recursion(e)
	{
		if (this.selectedCanRecurse())
		{
			const sel0 = this.selected[0].to;
			const sel1 = this.selected[1].to;
			sel0.setRecursor(sel1);
			this.saveLocal();
			D.status(e, `Recursor for ${sel0.properName} has been set`);
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
	removeMorphism(e, name)
	{
		const m = this.domain.getMorphism(name);
		if (m !== null)
		{
			m.decrRefcnt();
			MorphismTable.UpdateRows(this);
			this.update(e);
			this.saveLocal();
		}
	}
	//
	// TODO remove?
	//
	removeCodomainMorphism(e, name)
	{
		const m = this.codomain.getMorphism(name);
		if (m !== null)
		{
			m.decrRefcnt();
			MorphismTable.UpdateRows(this);
			this.update(e);
			this.saveLocal();
		}
	}
	//
	// Get an element from the diagram's domain graph category.
	//
	getElement(name)
	{
		//
		// look for a text element
		//
		let elt = this.texts.filter(t => t.name === name);
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
	getHomSet(dom, cod)
	{
		const morphisms = [];
		for(const [name, from] of this.domain.morphisms)
		{
			if ((from.domain.name === dom.name || from.domain.name === dom.name) && (from.codomain.name === cod.name || from.codomain.name === cod.name))
				morphisms.push(from);
		}
		this.references.map(r =>
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
		const q = this.userToDiagramCoords(D.mouse.xy);
		this.texts.map(t =>
		{
			if (D2.Inside(p, t, q))
				this.addSelected(e, t);
		});
		this.domain.objects.forEach(function(o)
		{
			if (D2.Inside(p, o, q))
				this.addSelected(e, o);
		}, this);
		this.domain.morphisms.forEach(function(m)
		{
			if (D2.Inside(p, m.domain, q) && D2.Inside(p, m.codomain, q))
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
		const diagrams = Object.keys(this.getReferenceCounts()).map(r => R.$Cat.getMorphism(r).json());
		diagrams.push(this.json());
		const params =
		{
			FunctionName:	'CateconDownloadJS',
			InvocationType:	'RequestResponse',
			LogType:		'None',
			Payload:		JSON.stringify({diagrams})
		};
		const name = this.name;
		R.cloud.lambda.invoke(params, function(error, data)
		{
			if (error)
			{
				D.recordError(error);
				return;
			}
			const blob = new Blob([JSON.parse(data.Payload)], {type:'application/json'});
			const url = D.url.createObjectURL(blob);
			R.download(url, `${name}.js`);
			const delta = Date.now() - start;
			D.status(e, `Diagram ${name} Ecmascript generated<br/>Elapsed ${delta}ms`);
		});
	}
	downloadPNG()
	{
		U.svg2canvas(D.topSVG, this.name, R.download);
	}
	baseURL(ext = '.json')
	{
		return `${this.user}/${this.basename}${ext}`;
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
		const ref = Cat.getDiagram(name);		// TODO fix this
		// TODO wrong algorithm
		for(const [name, elt] of ref.domain.objects)
			if (element.hasDiagramElement(dgrm, elt, true, null))
				return false;
		for(const [name, elt] of ref.domain.morphisms)
			if (element.hasDiagramElement(dgrm, elt, true, null))
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
					D.status(`Reference diagram ${name} removed`);
					break;
				}
		}
		else
			D.status(`Reference diagram ${name} cannot be removed since references to it still exist`);
	}
	addReferenceDiagram(e, name, silent = true)
	{
		const dgrm = Cat.getDiagram(name);		// TODO fix this
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
				D.status(`Reference diagram ${name} is now referenced.`);
			}
		}
		else
			if (!silent)
				D.status(`Reference diagram ${name} is already referenced.`);
	}
	hasReference(name)
	{
		return this.references.filter(d => d.name === name).length > 0;
	}
	unlock(e)
	{
		this.readonly = false;
		D.diagramPanel.updateLockBtn(this);
	}
	lock(e)
	{
		this.readonly = true;
		D.diagramPanel.updateLockBtn(this);
	}
	copyObject(e)
	{
		const from = this.getSelected();
		const xy = new D2(1, 1).scale(D.default.arrow.length/2).add(from);
		this.placeObject(e, from.to, xy);
	}
	getMorphismGraph(m)
	{
		const sm = R.GraphCat.getMorphism(m.name);
		if (sm)
			return sm;
		return StringMorphism.graph(this, m);
	}
	activateToolbar(e)
	{
		if (this.selected.length === 0)
			return;
		D.toolbar.style.opacity = 1;
		D.toolbar.style.display = 'block';
		const xy = 'clientX' in e ? {x:e.clientX, y:e.clientY} : D.mouse.xy;
		let xyOffset = true;
		const elt = this.getSelected();
		if (this.selected.length === 1)
			D.toolbar.innerHTML = this.toolbar(elt);
		else
		{
			let html = H.td(D.getButton('close', 'D.deactivateToolbar()', 'Close'), 'buttonBar');
//			if (Category.isComposite(this.selected))
//				html += H.td(D.getButton('compose', `R.diagram.gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
			this.codomain.actions.map(a => a.hasForm(this.selected) ?
				H.td(D.formButton(a.icon, `R.diagram.gui(evt, this, ${a.action})`, a.properName), 'buttonBar')	: '').join('');
/*
			if (DiagramMorphism.prototype.isPrototypeOf(elt))
			{
				const form = Category.HasForm(this.selected);
				const htmlLength = html.length;
				if (form.composite)		// moved
					html += H.td(D.getButton('compose', `R.diagram.gui(evt, this, 'compose')`, 'Compose'), 'buttonBar');
				if (form.sink)
				{
					if ('pullback' in R.category)
						html += H.td(D.getButton('pullback', `R.diagram.gui(evt, this, 'pullback')`, 'Pullback'), 'buttonBar');
					if ('coproductAssembly' in R.category)
						html += H.td(D.getButton('coproductAssembly', `R.diagram.gui(evt, this, 'coproductAssembly')`, 'Coproduct assembly'), 'buttonBar');
				}
				if (form.source)
				{
					if ('pushout' in R.category)
						html += H.td(D.getButton('pushout', `R.diagram.gui(evt, this, 'pushout')`, 'Pushout'), 'buttonBar');
					if ('productAssembly' in R.category)
						html += H.td(D.getButton('productAssembly', `R.diagram.gui(evt, this, 'productAssembly')`, 'Product assembly'), 'buttonBar');
				}
				if (form.distinct && 'product' in R.category)
					html += H.td(D.getButton('product', `R.diagram.gui(evt, this, 'product')`, 'Product'), 'buttonBar');
				if (form.distinct && 'coproduct' in R.category)
					html += H.td(D.getButton('coproduct', `R.diagram.gui(evt, this, 'coproduct')`, 'Coproduct'), 'buttonBar');
				if (html.length !== htmlLength)
					xyOffset = false;
				if (this.selectedCanRecurse())
					html += H.td(D.getButton('recursion', `R.diagram.gui(evt, this, 'recursion')`, 'Recursion'), 'buttonBar');
			}
			else if (DiagramObject.prototype.isPrototypeOf(elt))
			{
				if ('product' in R.category)
					html += H.td(D.getButton('product', `R.diagram.gui(evt, this, 'product')`, 'Product'), 'buttonBar');
				if ('coproduct' in R.category)
					html += H.td(D.getButton('coproduct', `R.diagram.gui(evt, this, 'coproduct')`, 'Coproduct'), 'buttonBar');
			}
			this.toolbar.innerHTML = H.table(H.tr(html), 'buttonBarLeft');
					*/
		}
		const rect = D.topSVG.getBoundingClientRect();
		let left = rect.left + xy.x + (xyOffset ? D.default.toolbar.x : 0);
		left = left >= 0 ? left : 0;
		left = (left + D.toolbar.clientWidth) >= window.innerWidth ? window.innerWidth - D.toolbar.clientWidth : left;
		D.toolbar.style.left = `${left}px`;
		let top = rect.top + xy.y - (xyOffset ? D.default.toolbar.y : 0);
		top = top >= 0 ? top : 0;
		top = (top + D.toolbar.clientHeight) >= window.innerHeight ? window.innerHeight - D.toolbar.clientHeight : top;
		D.toolbar.style.top = `${top}px`;
	}
	$(args)
	{
		return args[0].to;
	}
	$$(args)
	{
		return args[0].to;
	}
	addFactorMorphism(domain, factors)
	{
		let m = FactorMorphism.Get(this, domain, factors);
		m.incrRefcnt();
		return m;
	}
	//
	// static methods
	//
	static Codename(args)
	{
		const codomainName = typeof args.codomain === 'string' ? args.codomain : args.codomain.name;
		return `:${codomainName}:${args.user}:${args.basename}`;
	}
	static FetchDiagram(dgrmName, fn)
	{
		R.cloud.fetchDiagramJsons([dgrmName], function(jsons)
		{
			jsons.reverse().map(j =>
			{
				const dgrm = new Diagram(R.$Cat, j);
				dgrm.saveLocal();
			});
			if (fn)
				fn(dgrmName);
		});
	}
	static ReadLocal(dgrmName)
	{
		const data = localStorage.getItem(Diagram.StorageName(dgrmName));
		let dgrm = null;
		if (data !== null)
			dgrm = new Diagram(R.$Cat, JSON.parse(data));
		if (R.debug)
			console.log('readLocal',dgrmName,dgrm);
		return dgrm;
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
	static ToggleTableMorphism(e, id, name)
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
}

/*
//
// Transform is a Morphism
//
// TODO if the only purpose is type checking, then discard?
//
class Transform extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
//		nuArgs.domain = this.diagram.getObject(args.domain);
//		if (!Functor.prototype.isPrototypeOf(nuArgs.domain))
//			throw `transform domain is not a functor`;
//		nuArgs.codomain this.diagram.getObject(args.codomain);
//		if (!Functor.prototype.isPrototypeOf(nuArgs.codomain))
//			throw `transform codomain is not a functor`;
		nuArgs.category = diagram.codomain;
		super(diagram, nuArgs);
	}
	//
	// given an object return a morphism naturally
	//
	$(args)
	{
		throw 'Unknown action in transform';	// forgot to override?
	}
}
*/

//
// IdentityTransform is a Morphism
//
class IdentityTransform extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = IdentityTransform.Codename(nuArgs.domain);
//		nuArgs.domain = diagram.getObject(args.domain);
		nuArgs.codomain = nuArgs.domain;
		nuArgs.properName = 'properName' in nuArgs ? nuArgs.properName : IdentityTransform.ProperName(nuArgs.domain, nuArgs.codomain);
		super(diagram, nuArgs);
	}
	//
	// args[0] === diagram
	// args[1] === domain
	// return identity of object
	//
	$(args)
	{
		return Identity.Get(args[0], {domain:args[1]});
	}
	getGraph(data = {position:0})
	{
		const g = super.getGraph(data);
		g.bindGraph({cod:s.cod, link:[], domRoot:[0], codRoot:[1], offset:0});
		g.tagGraph(this.constructor.name);
		return g;
	}
	//
	// static methods
	//
	static Codename(domain)
	{
		return `:$Cat2:It{${domain.name}}tI`;
	}
	static ProperName(domain)
	{
		return `Id&lt;${domain.properName}&gt;`;
	}
	static Get(diagram, dom, cod = null)
	{
		const domain = diagram.getObject(dom);
		let codomain = null;
		if (cod)
			codomain = diagram.getObject(cod);
		const name = IdentityTransform.Codename(diagram, domain, codomain);
		const m = diagram.getMorphism(name);
		return m ? m : new IdentityTransform(diagram, codomain ? {domain, codomain} : {domain});
	}
}

//
// DiagonalTransform is a Morphism
//
// domain: id:cat-->cat
// codomain: delta:cat-->cat := object->object x object, mor->mor x mor
//
class DiagonalTransform extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = DiagonalTransform.Codename(nuArgs.domain, nuArgs.count);
		nuArgs.properName = DiagonalTransform.Codename(nuArgs.domain, nuArgs.count);
		super(diagram, nuArgs);
		Object.defineProperty(this, 'count', {value:U.getArg(nuArgs, 'count', 2), writable: false});
	}
	//
	// args[0] === diagram
	// args[1] === domain
	// args[2] === count
	// return diagonal of object
	//
	$(args)
	{
		return DiagonalMorphism.Get(args[0], {domain:args[1], count:args[2]});
	}
	//
	// static methods
	//
	static Codename(domain, count)
	{
		return `:$Cat2:Dt{${domain.name}:${count}}tD`;
	}
	static ProperName(domain, count)
	{
		return `&delta;&lt;${domain.properName}:${count}&gt;`;
	}
}

//
// FoldTransform is a Morphism
//
class FoldTransform extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.name = FoldTransform.Codename(nuArgs.domain, nuArgs.count);
		nuArgs.properName = FoldTransform.ProperName(nuArgs.domain, nuArgs.count);
		super(diagram, nuArgs);
		Object.defineProperty(this, 'count', {value:U.getArg(nuArgs, 'count', 2), writable: false});
	}
	//
	// args[0] === diagram
	// args[1] === domain
	// args[2] === count
	// return fold of object
	//
	$(args)
	{
		return FoldMorphism.Get(args[0], {domain:args[1], count:args[2]});
	}
	//
	// static methods
	//
	static Codename(domain, count)
	{
		return `:$Cat2:Ft{${domain.name}:${count}}tF`;
	}
	static ProperName(domain, count)
	{
		return `&nabla;&lt;${domain.properName}:${count}&gt;`;
	}
}

//
// EvaluationTransform is a Morphism
//
class EvaluationTransform extends Morphism
{
	constructor(diagram, args)
	{
		const nuArgs = U.clone(args);
		nuArgs.domain = diagram.getObject(args.domain);
		if (!Evaluation.CanEvaluate(nuArgs.domain))
			throw 'domain cannot be evaluated';
		nuArgs.name = EvaluationTransform.Codename(nuArgs.domain);
		nuArgs.properName = EvaluationTransform.ProperName(nuArgs.domain);
		super(diagram, nuArgs);
	}
	//
	// args[0] === diagram
	// args[1] === domain
	// returns Evaluation
	//
	$(args)
	{
		return Evaluation.Get(args[0], {domain:args[1]});
	}
	//
	// EvaluationTransform static methods
	//
	static Codename(domain)
	{
		return `:$Cat2:Et{${domain.name}}tE`;
	}
	static ProperName(domain)
	{
		return `Eval;&lt;${domain.properName}&gt;`;
	}
}

if (isGUI)
{
	//
	// show the intro if user has not accepted cookies
	//
	if (!R.HasAcceptedCookies())
	{
		document.getElementById('intro').innerHTML = D.intro();
		DiagramPanel.FetchRecentDiagrams();
		window.R = R;
		return;
	}
}

R.Initialize();	// boot-up

})(typeof exports === 'undefined' ? this['Cat'] = this.Cat : exports);
