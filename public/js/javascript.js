// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
var Cat = Cat || require('./Cat.js');

(function()
{
	'use strict';

	const D = Cat.D;
	const R = Cat.R;
	const U = Cat.U;

	class JavascriptAction extends Cat.LanguageAction
	{
		constructor(diagram)
		{
			const args = {basename:'javascript', description:'Javascript support', ext:'js'};
			super(diagram, args);
			R.languages.set(this.basename, this);
			R.DownloadDiagram('hdole/HTML', _ => this.loadHTML(R.$CAT.getElement('hdole/HTML')));
		}
		getType(elt, first = true)
		{
			return Cat.U.Token(elt);
		}
		generateComposite(morphism)
		{
			let code = '\tlet result = null;';
			morphism.morphisms.map((m, i) =>
			{
				code += '\tresult = ';
				if (this.isAsync(m))
					code += 'await ';
				code += `${this.getType(m)}(${i > 0 ? 'result' : 'args'});\n`;
			});
			code += '\treturn result;\n';
			return this.header(morphism) + code + this.tail();
		}
		generate(morphism, generated = new Set())
		{
			let code = '';
			const proto = morphism.constructor.name;
			if (!generated.has(morphism.name))
			{
				if (morphism instanceof Cat.MultiMorphism)
					code += morphism.morphisms.map(n => this.generate(n, generated)).join('\n');
				const name = this.getType(morphism);
				const header = this.header(morphism);
				const tail = this.tail();
				const domain = morphism.domain instanceof Cat.NamedObject ? morphism.domain.base : morphism.domain;
				const codomain = morphism.codomain instanceof Cat.NamedObject ? morphism.codomain.base : morphism.codomain;
				if (Cat.R.CanFormat(morphism) && domain.size)
					code +=	// TODO safety check?
`
function ${name}_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<${domain.size}; ++i)
		result.set(i, fn(i));
	return result;
}
`;
				if ('domain' in morphism && domain.isInitial())
					code += `${header}	return;	// abandon computation\n'${tail}`;	// domain is null, yuk
				else if ('codomain' in morphism && codomain.isTerminal())
					code += `${header}	return 0;${tail}`;
				else if ('codomain' in morphism && codomain.isInitial())
					code += `${header}	throw 'do not do this';${tail}`;
				else
					switch(proto)
					{
						case 'Composite':
							code += this.generateComposite(morphism);
							break;
						case 'Identity':
							code += `${header}	return args;${tail}`;
							break;
						case 'ProductMorphism':
							if (morphism.dual)
								code +=
`const ${name}_morphisms = [${morphism.morphisms.map((n, i) => Cat.U.Token(n)).join()}];
${header}	return [args[0], ${name}_morphisms[args[0]](args[1])];${tail}`;
							else
								code += `${header}	return [${morphism.morphisms.map((n, i) => Cat.U.Token(n) + '(args[' + i + '])').join()}];${tail}`;
							break;
						case 'ProductAssembly':
							code += this.dual ?
`const ${name}_morphisms = [${morphism.morphisms.map((n, i) => Cat.U.Token(n)).join()}];
${header}	return ${name}_morphisms[args[0]](args[1]);${tail}`
								:
									`${header}	return [${morphism.morphisms.map((n, i) => Cat.U.Token(n) + '(args)').join()}];${tail}`;
							break;
						case 'Morphism':
							if ('code' in morphism && this.ext in morphism.code)
								code += this.instantiate(morphism) + '\n';
							else
								code += `${header}	${tail}`;
							if ('recursor' in morphism)
							{
								generated.add(morphism.name);	// add early to avoid infinite loop
								code += this.generate(morphism.recursor, generated);
							}
							if ('data' in morphism)
							{
								let homMorphs = [];
								morphism.data.forEach(d => this.findHomMorphisms(morphism.codomain, d, homMorphs));
								if (homMorphs.length > 0)
								{
									generated.add(morphism.name);	// add early to avoid infinite loop
									code += homMorphs.map(hm => this.generate(hm, generated)).join('');
								}
								const data = [];
								morphism.data.forEach((d, k) => data.push(`[${k}, ${that.convertData(codomain, d)}]`));
								code +=	// TODO safety check?
`
const ${name}_Data = new Map([${data.join()}]);
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
							}
							if ('recursor' in morphism)
								code +=
`${header}	if (${name}_Data.has(args))
		return ${name}_Data.get(args);
	return ${U.Token(morphism.recursor)}(args);
${tail}`;
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
${header}	const r = ${name}_factors.map(f => f === -1 ? 0 : f.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
	return ${morphism.factors.length === 1 ? 'r[0]' : 'r'};${tail}`;
							break;
						case 'HomMorphism':
							break;
						case 'LambdaMorphism':
							code += this.generate(morphism.preCurry, generated);
							code += `${header}	${this.generateLambda(morphism)}${tail}`;
							break;
						case 'NamedMorphism':
							code += this.generate(morphism.source, generated);
							code += `${header}	return ${U.Token(morphism.source)}(args);${tail}`;
							break;
					}
				generated.add(morphism.name);
			}
			return code;
		}
		generateLambda(morphism)
		{
			const preCurry = morphism.preCurry;
			let domArgs = '';
			const domFactors = morphism.domFactors;
			const homFactors = morphism.homFactors;
			let k = Cat.U.HasFactor(homFactors, [0]);
			if (k >= 0 && domFactors.length === 0)	// domain is one-point set
				domArgs += '';	// null-op
			else
			{
				// scan domain
				const scanDomain = (obj, ndx) =>
				{
					k = Cat.U.HasFactor(domFactors, ndx);
					if (k >= 0 && domFactors.length === 1)	// domain unchanged
					{
						domArgs += 'args';
					}
					else if (obj instanceof Cat.ProductObject && !obj.dual)	// is product, not coproduct
					{
						for(let i=0; i<obj.objects.length; ++i)
						{
							ndx.push(i);
							k = Cat.U.HasFactor(domFactors, ndx);
							if (k >= 0)
							{
								if (i > 0)
									domArgs += ', ';
								domArgs += `args[${ndx.toString()}]`;
							}
							else
							{
								k = Cat.U.HasFactor(homFactors, ndx);
								if (k >= 0)
								{
									if (i > 0)
										domArgs += ', ';
									const lnk = homFactors(k);
									domArgs += 'homArgs';
									if (homFactors.length > 1)
										domArgs += `[${k}]`;
								}
								else
									scanDomain(obj.objects[i], ndx);
							}
							ndx.pop();
						}
					}
				};
				scanDomain(preCurry.domain, [0]);
				domArgs = `(${domArgs})`;
			}
			let nuCode = '';
			// scan codomain
			let homArgs = '';
			if (preCurry.codomain instanceof Cat.HomObject)
			{
				const scanCodomain = (obj, ndx) =>
				{
					if (obj instanceof Cat.HomObject)
					{
						ndx.push(0);
						k = Cat.U.HasFactor(domFactors, ndx);
						if (k >= 0)
						{
							if (domFactors.length === 1)
								homArgs += `args[${k}]`;
							else if (k === 0)
								homArgs += `[args[${k}], `;
							else if (k === domFactors.length -1)
								homArgs += `args[${k}]]`;
							else
								homArgs += `args[${k}], `;
						}
						else
						{
							const homdom = obj.objects[0];
							if (homdom instanceof Cat.ProductObject)
							{
								homdom.objects.map((o, i) =>
								{
									const nuNdx = ndx.slice();
									nuNdx.push(i);
									k = Cat.U.HasFactor(domFactors, nuNdx);
									if (k >= 0)
									{
										if (i > 0)
											homArgs += ', ';
										const argOffset = nuNdx.slice(2);
										homArgs += `args[${argOffset.toString()}]`;
									}
								});
								if (homdom.objects.length > 1)
									homArgs = `[${homArgs}]`;
							}
						}
						ndx.pop();
						const nuNdx = ndx.slice();
						nuNdx.push(1);
						scanCodomain(obj.objects[1], nuNdx);
					}
					else
					{
					}
				};
				scanCodomain(preCurry.codomain, [1]);
				if (homArgs !== '')
					homArgs = `(${homArgs})`;
				nuCode = `	return ${morphism.codomain instanceof Cat.HomObject ? ' homArgs => ' : ''}${U.Token(preCurry)}${domArgs}${homArgs};`;
			}
			else	// evaluate pre-curry
			{
				nuCode = `	return ${U.Token(preCurry)}${homArgs};`;
			}
			return nuCode + ';';
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
					out = Cat.U.Token(data);
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
		loadHTML(htmlDiagram)	// bootstrap basic diagrams for startup
		{
//			const htmlDiagram = R.$CAT.getElement('hdole/HTML');
			D.htmlDiagram = htmlDiagram;
			const html = htmlDiagram.getElement('HTML');
			const str = htmlDiagram.codomain.getElement('hdole/Strings/str');
			this.formatters = new Map();
//			const that = this;
			htmlDiagram.forEachMorphism(m =>
			{
				const domain = m.domain;
				if (domain instanceof Cat.ProductObject && !domain.dual && domain.objects[0].name === html.name &&
					m.codomain instanceof Cat.ProductObject &&
					m.codomain.objects[0].name === str.name)
				{
					const hom = m.codomain.objects[1];
					if (hom instanceof Cat.HomObject)
					{
						const homDom = hom.objects[0];
						if (homDom.isEquivalent(html))
							this.formatters.set(hom.objects[1].signature, m);
					}
				}
			});
		}
		canFormat(o)
		{
			if (!this.formatters)
				return false;
			if (o instanceof Cat.NamedObject)
				return this.canFormat(o.source);
			if (o instanceof Cat.ProductObject)
				return o.objects.reduce((r, ob) => r && this.canFormat(ob));
			else if (o instanceof Cat.Morphism)
				return this.canFormat(o.domain) && (this.canFormat(o.codomain) || o.codomain instanceof Cat.HomObject);
			else if (o.isTerminal() && !o.dual)
				return true;
			else if (o instanceof Cat.FiniteObject)
				return true;
			else if (o instanceof Cat.CatObject)
				return this.formatters.has(o.signature);
			return false;
		}
		getInputId(prefix, object, factor)
		{
			return Cat.U.SafeId(`fctr-${prefix}-${object.name}-${factor.toString()}`);
		}
		getInputHtml(object, value = null, prefix = '', factor = [], index = null, first = true)
		{
			const from = R.diagram.selected[0];
			const morph = from.to;
			let html = '';
			const id = this.getInputId(prefix, object, factor);
			switch(object.constructor.name)
			{
				case 'NamedObject':
					html = this.getInputHtml(object.getBase(), value, prefix, factor);
					break;
				case 'CatObject':
					if (this.formatters.has(object.signature))
					{
						const f = this.formatters.get(object.signature);
						const out = window[U.Token(f)]([id, value !== null ? [0, value] : [1, 0]]);
						html = out[0];
					}
					else
						D.RecordError('object has no formatter');
					break;
				case 'ProductObject':
					if (object.dual)
					{
						const isNumeric = Cat.U.IsNumeric(object);
						if (U.IsNumeric(object))
							html += `<input id="${id}" type="number" min="0" max="${object.objects.length -1}"${typeof value === 'number' ? ' value="' + value.toString() + '"' : ''}/>`;
						else
						{
							let options = '';
							let divs = '';
							for (let i=0; i<object.objects.length; ++i)
							{
								const ob = object.objects[i];
								const f = [...factor, i];
								const oid = `dv_${ob.name} ${f.toString()}`;
								options += `<option value="${i}"${i === value[0] ? ' selected="selected"' : ''}>${i}: ${ob.htmlName()}</option>`;
								divs += H.div(this.getInputHtml(ob, value !== null && value[0] === i ? value[1] : null, prefix, [...factor, i]), 'nodisplay', oid, false);
							}
							html +=
`<select id="${id}" onchange="Cat.D.ShowInput('${object.name}', '${id}', ${factor.length === 0 ? '[]' : factor.toString()})">
<option>Choose</option>${options}</select><div>${divs}</div>`;
					}
				}
				else
					html += object.objects.map((ob, i) => this.getInputHtml(ob, value !== null ? value[i] : null, prefix, [...factor, i], null, false));
					if (!first)
						html = `(${html})`;
				break;
			case 'FiniteObject':
				const dv = typeof value === 'number' ? ` value="${value.toString()}"` : '';
				if ('size' in object)
				{
					if (object.size === 1)
						return '0';
					else if (object.size === 0)
						return '';
					html = `<input type="number" min="0" id="${id}" max="${object.size}"${dv}/>`;
				}
				else
					html = `<input type="number" min="0" id="${id}"${dv}/>`;
				break;
			case 'HomObject':
				const homset = R.diagram.codomain.getHomset(object.objects[0], object.objects[1]);
				const options = homset.map(m => `<option value="${m.name}"${value && m.name === value.name ? ' selected="selected"' : ''}>${m.htmlName()}</option>`).join('');
				const selector =
`<select data-index="${index}" id="help-run-homset-${index ? index : 'next'}" onchange="R.Actions.javascript.setHomValue(this)"><option>Choose</option>${options}</select>`;
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
				R.EmitMorphismEvent(Cat.R.diagram, 'update', from);
			}
			else
				morph.data.delete(index);
		}
		getInputValue(domain, prefix = '', factor = [])
		{
			let value = null;
			const dom = domain instanceof Cat.NamedObject ? domain.getBase() : domain;
			const id = this.getInputId(prefix, dom, factor);
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
		evaluate(e, diagram, morphismName, fn)
		{
			const morphism = diagram.getElement(morphismName);
			const args = this.getInputValue(morphism.domain);
			const type = this.getType(morphism);
			const code =
`// Catecon javascript code generator ${Date()}
onmessage = function(e)
{
	const args = e.data;
	postMessage(['start', 'Starting']);
	try
	{
		const result = ${type}(args);
		postMessage(['result', [args, result]]);
	}
	catch(e)
	{
		postMessage(['exception', e]);
	}
}
${this.generate(morphism)}
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
			const morphism = diagram.getElement(name);
			const args = this.getInputValue(morphism.domain);
			const type = this.getType(morphism);
			const isIterable = morphism.isIterable();
			const iterInvoke = morphism instanceof Cat.Composite ? `${Cat.U.Token(morphism.getFirstMorphism())}_Iterator(${type})` : `${Cat.U.Token(morphism.domain)}_Iterator(${type})`;
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
${this.generate(morphism)}
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
		isAsync(morphism)
		{
			switch(morphism.constructor.name)
			{
				case 'Morphism':
					return 'code' in morphism && typeof morphism.code.js === 'object' && 'async' in morphism.code.js && morphism.code.js.async;
				case 'Composite':
				case 'Product':
				case 'HomMorphism':
					return morphism.morphisms.reduce((r, subm) => r || this.isAsync(subm), false);
			}
			return false;
		}
		header(morphism)
		{
			return `// ${morphism.constructor.name}: ${morphism.basename}\n${this.isAsync(morphism) ? 'async ' : ''}function ${U.Token(morphism)}(args)\n{\n`;
		}
		tail()
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
		template(elt)
		{
			return `${this.isAsync(elt) ? 'async ' : ''}function %Type(args, out)\n{\n\t\n}\n`;
		}
		getEditHtml(div, elt)
		{
			const id = `element-${this.ext}`;
			let code = '';
			if (this.hasCode(elt))
				code = typeof elt.code.js === 'object' ? elt.code.js.code : elt.code.js;
			else
				code = this.template(elt);
			const asyncAttrs = {class:'textButton', onclick:e => e.target.classList.toggle('blueRow')};
			if (this.isAsync(elt))
				asyncAttrs.class += ' blueRow';
			div.appendChild(H3.div([H3.button('async', asyncAttrs), H3.span('Remember to declare function as async in code!')]));
			div.appendChild(H3.div(Cat.U.HtmlSafe(code), {class:'code padding', id, onkeydown:e => e.stopPropagation()}));
			if (this.isEditable(elt))
				div.appendChild(D.getIcon(this.name, 'edit', e => R.Actions[this.basename].setCode(e, id, this.ext), 'Edit code', D.default.button.tiny));
			return div;
		}
		static ObjectLength(o)
		{
			if (o instanceof Cat.FiniteObject && o.size <= 1)
				return 0;
			if (o instanceof Cat.ProductObject && !o.dual)
				return o.objects.reduce((r, o) => r + (o.isTerminal() ? 0 : 1), 0);
			else
				return 1;
		}
	}

	const pfs = Cat.R.$CAT.getElement('sys/pfs');
	if (typeof module !== 'undefined')
	{
		module.exports.JavascriptAction = JavascriptAction;
		R.Actions.javascript = new JavascriptAction(pfs);
	}
	else
	{
		window.JavascriptAction = JavascriptAction;
		Cat.R.Actions.javascript = new JavascriptAction(pfs);
	}

})();	// end anon function
