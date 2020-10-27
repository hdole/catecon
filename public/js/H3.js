class H3
{
	static safe(str)
	{
		return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
	}
	static _p(elt, arg)
	{
		const type = arg.constructor.name;
		switch(arg.constructor.name)
		{
			case 'Number':
			case 'Boolean':
				elt.innerHTML += arg;
				break;
			case 'String':
				if (arg.charAt(0) === '#')
				{
					const tokens = arg.substr(1).split('.');
					elt.id = tokens[0];
					tokens.shift();
					tokens.map(c => elt.classList.add(c));
				}
				else if (arg.charAt(0) === '.')
				{
					const tokens = arg.substr(1).split('.');
					tokens.map(c => elt.classList.add(c));
				}
				else
					elt.innerHTML += H3.safe(arg);
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
		return H3._p(document.createElementNS('http://www.w3.org/2000/svg', type), args);
	}
	static a(...args)			{ return H3._h('a', args); }
	static abbr(...args)		{ return H3._h('abbr', args); }
	static address(...args)		{ return H3._h('address', args); }
	static b(...args)			{ return H3._h('b', args); }
	static base(...args)		{ return H3._h('base', args); }
	static body(...args)		{ return H3._h('body', args); }
	static blockquote(...args)	{ return H3._h('blockquote', args); }
	static br(...args)			{ return H3._h('br', args); }
	static button(...args)		{ return H3._h('button', args); }
	static div(...args)			{ return H3._h('div', args); }
	static h1(...args)			{ return H3._h('h1', args); }
	static h2(...args)			{ return H3._h('h2', args); }
	static h3(...args)			{ return H3._h('h3', args); }
	static h4(...args)			{ return H3._h('h4', args); }
	static h5(...args)			{ return H3._h('h5', args); }
	static hr(...args)			{ return H3._h('hr', args); }
	static img(...args)			{ return H3._h('img', args); }
	static input(...args)		{ return H3._h('input', args); }
	static label(...args)		{ return H3._h('label', args); }
	static option(...args)		{ return H3._h('option', args); }
	static p(...args)			{ return H3._h('p', args); }
	static script(...args)		{ return H3._h('script', args); }
	static select(...args)		{ return H3._h('select', args); }
	static small(...args)		{ return H3._h('small', args); }
	static span(...args)		{ return H3._h('span', args); }
	static strong(...args)		{ return H3._h('strong', args); }
	static style(...args)		{ return H3._h('style', args); }
	static sub(...args)			{ return H3._h('sub', args); }
	static table(...args)		{ return H3._h('table', args); }
	static tag(t, ...args)		{ return H3._h(t, args); }
	static textarea(...args)	{ return H3._h('textarea', args); }
	static td(...args)			{ return H3._h('td', args); }
	static th(...args)			{ return H3._h('th', args); }
	static tr(...args)			{ return H3._h('tr', args); }
	// SVG
	static animateTransform(...args)	{ return H3._v('animateTransform', args); }
	static circle(...args)				{ return H3._v('circle', args); }
	static g(...args)					{ return H3._v('g', args); }
	static image(...args)				{ return H3._v('image', args); }
	static line(...args)				{ return H3._v('line', args); }
	static link(...args)				{ return H3._v('link', args); }
	static marker(...args)				{ return H3._v('marker', args); }
	static path(...args)				{ return H3._v('path', args); }
	static polyline(...args)			{ return H3._v('polyline', args); }
	static rect(...args)				{ return H3._v('rect', args); }
	static svg(...args)					{ return H3._v('svg', args); }
	static text(...args)				{ return H3._v('text', args); }
}
