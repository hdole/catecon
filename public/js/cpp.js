// (C) 2018-2021 Harry Dole
// Catecon:  The Categorical Console
//
var Cat = Cat || require('./Cat.js');

(function()
{
	'use strict';

	const D = Cat.D;
	const R = Cat.R;
	const U = Cat.U;

	class CppAction extends Cat.LanguageAction
	{
		constructor(diagram)
		{
			const args = {basename:'cpp', description:'C++ support', ext:'cpp'};
			super(diagram, args);
			Object.defineProperties(this,
			{
				currentDiagram:			{value:	null,	writable:	true},
				context:				{value:	null,	writable:	true},
				references:				{value:	new Map(),	writable:	false},
				tab:					{value:	1,		writable:	true},
				dependencies:			{value: new Set(),	writable:	false},		// from element name t0 symbol
				generated:				{value: new Set(),	writable:	false},		// elements already produced
				objects:				{value: new Set(),	writable:	false},		// elements already produced
			});
			R.languages.set(this.basename, this);
			R.$CAT.getElement('Set').actions.set(args.basename, this);
			this.initialize(null);
		}
		initialize(diagram)
		{
			this.varCount = 0;
			this.tab = 1;
			this.context = diagram;
			this.dependencies.clear();
			this.generated.clear();
			this.references.clear();
			this.objects.clear();
			if (diagram)
			{
				this.references.set(diagram.name, new Set());
				const refs = this.context.getAllReferenceDiagrams();
				refs.forEach((dgrm, name) => this.references.set(name, new Set()));
			}
		}
		incTab()
		{
			this.tab++;
		}
		decTab()
		{
			this.tab--;
		}
		cline(line, extra = 0)
		{
			const lines = line.split('\n');
			return lines.map(line =>
			{
				if (line === '')
					return '';
				return "\t".repeat(this.tab + extra) + line + '\n';
			}).join('');
		}
		getType(elt, first = true)
		{
			let isLocal = false;
			if (!this.currentDiagram)
				this.currentDiagram = this.context;
			isLocal = elt.diagram === this.currentDiagram;
			const priorDiagram = this.currentDiagram;
			this.currentDiagram = elt.diagram;
			let basetype = '';
			switch(elt.constructor.name)
			{
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
					basetype = U.Token(elt.name);
					break;
			}
			if (!first && elt.needsParens())
				basetype = `Pa_${basetype}_aP`;
			this.currentDiagram = priorDiagram;
			return !first ? U.Token(basetype) : basetype;
		}
		generateHeader()
		{
			let code = '';
			[...this.references.keys()].reverse().map(dgrm =>
			{
				const d = R.$CAT.getElement(dgrm);
				this.references.set(d.name, new Set());
				let nuCode = this.getCode(d);
				if (nuCode !== '' && nuCode.slice(-1) !== '\n')
					nuCode = nuCode + '\n';
				code += nuCode;
			});
			if (code !== '')
				code = '// from diagrams\n' + code;
			return code;
		}
		generateProductObject(object)
		{
			if (this.hasCode(object))
				return this.generateRuntime(object);
			const name = this.getType(object);
			let code = object.objects.map(o => this.generateObject(o)).join('');
			const members = object.objects.filter(o => !o.isTerminal()).map((o, i) => this.cline(`${this.getType(o)} m_${i};`, object.dual ? 1 : 0)).join('\n');
			if (object.dual)
				code +=
`struct ${name}
{
	unsigned long c;
	union
	{
${members}
	};
	friend std::istream & operator>>(std::istream  & in, ${name} & obj )
	{ 
		in >> obj.index;
		switch(obj.index)
		{
${object.objects.map((o, i) => this.cline(`case 0:\n\tin >> obj.m_${i};\n\tbreak;\n`, 1)).join('')}
			}
			return in;            
		}
		friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
		{ 
			out ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) && !o.isTerminal() ? ` << obj.m_${i} << " "` : '').join('')};
			return out;            
		}
	};
};
`;
			else
				code +=
`struct ${name}
{
${members}
	friend std::istream & operator>>(std::istream  & in, ${name} & obj )
	{ 
		in ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) && !o.isTerminal() ? ` >> obj.m_${i}` : '').join('')};
		return in;            
	}
	friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
	{ 
		out ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) && !o.isTerminal() ? ` << obj.m_${i} << " "` : '').join('')};
		return out;            
	}
};
`;
			return this.cline(code);
		}
		generateRuntime(element)
		{
			return this.cline(this.getCode(element).replace(/%0/g, this.getType(element)));
		}
		generateObject(object, force = false)
		{
			if (!force && this.generated.has(object.name))
				return '';
			this.generated.add(object.name);
			const proto = object.constructor.name;
			let code = '';
			const name = this.getType(object);
			if (object instanceof Cat.CatObject)
			{
				switch(proto)
				{
					case 'CatObject':
					case 'FiniteObject':
						code += this.generateRuntime(object);
						break;
					case 'ProductObject':
						code += this.generateProductObject(object);
						break;
					case 'HomObject':
						code += this.generateFunctionPointer(object);
						break;
					default:
						break;
				}
			}
			return this.cline(this.generateComments(object)) + code;
		}
		findObjects(object)		// recursive
		{
			if (this.generated.has(object.name))
				return;
			this.generated.add(object.name);
			this.references.get(object.diagram.name).add(object);
			switch(object.constructor.name)
			{
				case 'CatObject':
					break;
				case 'ProductObject':
				case 'HomObject':
					object.objects.map(o => this.findObjects(o));
					break;
			}
		}
		_findAllObjects(morphism, found)		// recursive
		{
			switch(morphism.constructor.name)
			{
				case 'Identity':
					this.findObjects(morphism.domain, found);
					break;
				case 'Morphism':
				case 'FactorMorphism':
					this.findObjects(morphism.domain, found);
					this.findObjects(morphism.codomain, found);
					break;
				case 'HomMorphism':
				case 'ProductAssembly':
				case 'ProductMorphism':
					morphism.morphisms.map(m => this._findAllObjects(m, found));
					break;
				case 'LambdaMorphism':
				case 'Distribute':
				case 'DeDistribute':
				case 'Evaluation':
					// TODO
					break;
			}
		}
		findAllObjects(m)		// not recursive
		{
			if (m instanceof Cat.Morphism)
			{
				this.findObjects(m.domain);
				this.findObjects(m.codomain);
			}
			else
			{
				const found = new Set();
				this.context.forEachObject(o => this.findObjects(o, found));
				this.context.forEachMorphism(m =>
				{
					this.findObjects(m.domain, found);
					this.findObjects(m.codomain, found);
				});
			}
		}
		generateObjects()		// not recursive
		{
			let code = '';
			const oldIndent = this.tab;
			this.tab = 0;
			this.references.forEach((set, name) =>
			{
				const diagram = Cat.R.$CAT.getElement(name);
				if (set.size > 0)
				{
					this.incTab();
					this.currentDiagram = diagram;
					const objectCode = [...set].map(o => this.generateObject(o)).join('');
					this.decTab();
					if (objectCode !== '')
						code += this.cline(`namespace ${this.getNamespace(diagram)}\n{\n${objectCode}\n}\n`);
				}
				this.currentDiagram = null;
			});
			this.tab = oldIndent;
			if (code !== '')
				code = '// objects from diagrams\n' + code;
			return code;
		}
		static CheckGraph(g)
		{
			return g.element instanceof Cat.CatObject &&
				(	(g.element instanceof Cat.ProductObject && g.element.dual) ||		// process a coproduct as var
					(g.element instanceof Cat.HomObject) ||								// process a hom object as var
					(g.isLeaf() && !('var' in g)));										// process a leaf as var
		}
		// Copy variables from the upGraph to the graph, and set the ndxMap as to where the variables are located.
		// The domFactor and codFactor give the location of the morphism's graph in the upGraph.
		copyVariables(graph, ndxMap, upGraph, domFactor, codFactor)
		{
			let factor = domFactor;	// scan the domain
			let downFactor = [0];		// domain
			const process = (g, i) =>
			{
				const upG = upGraph.getFactor(factor);
				if (upG.element.isTerminal())
					return;
				const upFactor = U.pushFactor(factor, i);
				const up = upGraph.getFactor(upFactor);
				if ('var' in up)
				{
					g.var = up.var;
					const thisFactor = U.pushFactor(downFactor, i);
					ndxMap.set(thisFactor.toString(), g.var);
					if (up.element instanceof Cat.ProductObject && up.element.dual)		// distribute coproduct terms
					{
						up.element.objects.map((o, i) =>
						{
							const v = `${g.var}.m_${i}`;
							g.graphs[i].var = v;
							const iFactor = U.pushFactor(factor, i);
							ndxMap.set(iFactor.toString(), v);
						});
					}
				}
			};
			graph.graphs[0].scanCheck(CppAction.CheckGraph, process);
			factor = codFactor;		// now scan the codomain
			const cnt = graph.graphs.length -1;
			downFactor = [cnt];		// codomain
			graph.graphs[cnt].scanCheck(CppAction.CheckGraph, process);
		}
		setupVariables(morphism, graph, ndxMap, upGraph, domFactor, codFactor)
		{
			if (upGraph)
				this.copyVariables(graph, ndxMap, upGraph, domFactor, codFactor);
			const process = (g, ndx) =>
			{
				if (g.element.isTerminal() || this.getCode(g.element) === '//' || 'var' in g)		// skip this element as it is a terminal or global variable '//'
					return;
				const indexes = g.links.filter(lnk => ndxMap.has(lnk.toString()));
				const strNdx = ndx.toString();
				if (indexes.length > 0)
				{
					const v = ndxMap.get(indexes[0].toString());
					g.var = v;
					if (ndxMap.has(strNdx))
						return;
					ndxMap.set(strNdx, v);
				}
				else
				{
					if (!ndxMap.has(strNdx))
						ndxMap.set(strNdx, `var_${this.varCount++}`);
					g.var = ndxMap.get(strNdx);
				}
			};
			graph.scanLinks(graph, CppAction.CheckGraph, process);
		}
		generateFunctionPointer(hom)
		{
			return `${this.generateComments(object)}\ttypedef void (*${U.Token(hom.name)});`;		// TODO
		}
		// label nodes in the graphs with a variable name
		generateFunctionInterface(graph)
		{
			const args = [];
			const codNdx = graph.graphs.length -1;
			const process = (g, ndx) =>
			{
				if (g.element.isTerminal() || this.getCode(g.element) === '//')		// skip this element as it is a terminal or global variable '//'
					return;
				let modifier = '';
				let constant = '';
				if (ndx[0] === codNdx)
					modifier = '& ';
				else
					constant = 'const ';
				args.push(`${constant}${this.getType(this.context.getElement(g.element.name))} ${modifier}${g.var}`);
			};
			// domain args
			const domGraph = graph.graphs[0];
			if (domGraph.element instanceof Cat.ProductObject && !domGraph.element.dual && domGraph.graphs.length > 0)
				graph.graphs[0].graphs.map((g, i) => process(g, U.pushFactor([0], i)));
			else
				process(domGraph, [0]);
			// codomain args
			const codGraph = graph.graphs[codNdx];
			if (codGraph.element instanceof Cat.ProductObject && !codGraph.element.dual && codGraph.graphs.length > 0)
				codGraph.graphs.map((g, i) => process(g, U.pushFactor([codNdx], i)));
			else
				process(codGraph, [codNdx]);
			return args.join(', ');
		}
		generateFunctionInvocation(graph)
		{
			const args = [];
			const codNdx = graph.graphs.length -1;
			const process = (g, ndx) =>
			{
				if (g.element.isTerminal() || this.getCode(g.element) === '//')		// skip this element as it is a terminal or global variable '//'
					return;
				args.push(g.var);
			};
			// domain args
			const domGraph = graph.graphs[0];
			if (domGraph.element instanceof Cat.ProductObject && !domGraph.element.dual && domGraph.graphs.length > 0)
				graph.graphs[0].graphs.map((g, i) => process(g, U.pushFactor([0], i)));
			else
				process(domGraph, [0]);
			// codomain args
			const codGraph = graph.graphs[codNdx];
			if (codGraph.element instanceof Cat.ProductObject && !codGraph.element.dual && codGraph.graphs.length > 0)
				codGraph.graphs.map((g, i) => process(g, U.pushFactor([codNdx], i)));
			else
				process(codGraph, [codNdx]);
			return args.join(', ');
		}
		generateInternalVariables(graph)
		{
			let code = '';
			const codNdx = graph.graphs.length -1;
			const process = (g, ndx) =>
			{
				if (g.element.isTerminal() || this.getCode(g.element) === '//')		// skip this element as it is a terminal or global variable '//'
					return;
				let modifier = '';
				let constant = '';
				if (ndx[0] === codNdx)
					modifier = '& ';
				else
					constant = 'const ';
				code += `${this.getType(this.context.getElement(g.element.name))} ${g.var};\n`;
			};
			for (let i=1; i<graph.graphs.length -1; ++i)
			{
				const g = graph.graphs[i];
				if (g.element instanceof Cat.ProductObject && !g.element.dual && g.graphs.length > 0)
					graph.graphs[0].graphs.map((g, j) => process(g, U.pushFactor([i], j)));
				else
					process(g, [i]);
			}
			return code;
		}
		__findVars(graph, ndx)
		{
			if ('var' in graph)
				console.log('var', ndx, graph.var);
			graph.graphs.map((g, i) => this.__findVars(g, U.pushFactor(ndx, i)));
		}
		// generate code for the morphism as a function
		// not recursive
		generateMorphism(morphism)
		{
			if (this.generated.has(morphism.name))
				return '';
			this.generated.add(morphism.name);
			const code = this.cline(this.generateComments(morphism)) +
				this.instantiateMorphism(this.getType(morphism), morphism);
			return code;
		}
		objectScanner(object)		// recursive
		{
			if (this.objects.has(object))
				return;
			this.objects.add(object);
			switch(object.constructor.name)
			{
				case 'ProductObject':
				case 'HomObject':
					object.objects.map(o => this.objectScanner(o));
					break;
				default:
					break;
			}
		}
		// upGraph has the morphisms input and output variables at the domFactor and codFactor locations
		instantiateMorphism(symbol, morphism, ndxMap = new Map(), upGraph = null, domFactor = [0], codFactor = [1])		// recursive
		{
			this.objectScanner(morphism.domain);
			this.objectScanner(morphism.codomain);
			const span = H3.span(morphism.properName);
			let code = this.cline(`// ${this.getStd(morphism)} ${span.innerHTML}`);		// TODO really debug code
			const graph = morphism.getGraph();
			switch(morphism.constructor.name)
			{
				case 'Morphism':
					if ('recursor' in morphism)
					{
						const name = morphism.recursor.name;
						if (!this.generated.has(name) && !this.dependencies.has(name))
							this.dependencies.add(name);
					}
					this.setupVariables(morphism, graph, new Map(), upGraph, domFactor, codFactor);
					if ('data' in morphism)
					{
						/*
						const data = JSON.stringify(U.JsonMap(morphism.data));
						code += this.cline(`std::map<${this.getType(morphism.domain)}, ${this.getType(morphism.codomain)}> ${symbol}_data ${data};\n`);
						*/
						if (morphism.domain.isTerminal() && morphism.codomain instanceof Cat.HomObject)
						{
							if (codFactor.length > 1)
							{
								const upFactor = codFactor.slice();
								upFactor.pop();
								const upper = upGraph.getFactor(upFactor);
								if ('dom' in upper && upper.dom instanceof Cat.Evaluation)
									upper.eval = morphism.data.get(0);
							}
						}
						else
						{
						}
					}
					else
					{
						code += this.cline(symbol ? `void ${symbol}(${this.generateFunctionInterface(graph)})\n{\n` : this.generateInternalVariables(graph));
						symbol && this.incTab();
						const dom = morphism.domain;
						const cod = morphism.codomain;
						const domCnt = dom.isTerminal() ? 0 : (!dom.dual && 'objects' in dom ? dom.objects.filter(o => !o.isTerminal()).length : 1);
						const codCnt = cod instanceof Cat.ProductObject && !cod.dual && 'objects' in cod ? cod.objects.filter(o => !o.isTerminal()).length : 1;
						let nuCode = this.getCode(morphism);
						if (nuCode !== '')
						{
							// handle domain variables
							if (domCnt > 1)
							{
								for (let i=0; i<domCnt; ++i)
								{
									const arg = `%${i}`;
									const rx = new RegExp(arg, 'g');
									const v = graph.getFactor([0, i]).var;
		if (v === undefined)debugger;
									nuCode = nuCode.replace(rx, v);
								}
							}
							else if (domCnt === 1)
								nuCode = nuCode.replace(/%0/g, graph.getFactor([0]).var);
							// handle codomain variables
							if (codCnt > 1)
							{
								for (let i=domCnt; i<domCnt+codCnt; ++i)
								{
									const rx = new RegExp(`%${i}`, 'g');
									const v = graph.getFactor([1, i - domCnt]).var;
		if (v === undefined)debugger;
									nuCode = nuCode.replace(rx, v);
								}
							}
							else
							{
								const g = graph.getFactor([1]);
								if (this.getCode(g.element) !== '//')
								{
									const v = g.var;
		if (v === undefined)debugger;
									const rx = new RegExp(`%${domCnt}`, 'g');
									nuCode = nuCode.replace(rx, v);
								}
							}
							code += this.cline(nuCode);
						}
						else if ('recursor' in morphism)
							code += this.cline(`${this.getType(morphism.recursor)}(${this.generateFunctionInvocation(graph)});`);
						else
						{
							// no data or code; treat as function call
							code += this.cline(`${symbol ? symbol : this.getType(morphism)}(${this.generateFunctionInvocation(graph)});`);
						}
						if (symbol)
						{
							this.decTab();
							code = code + this.cline('}');
						}
					}
					break;
				case 'Identity':
					break;
				case 'FactorMorphism':
					if (morphism.dual)
					{
						this.setupVariables(morphism, graph, new Map(), upGraph, domFactor, codFactor);
						if (morphism.factors.reduce((r, f) => r && f.length === 0))		// morphism is a fold
							code += this.cline(`${graph.graphs[1].var} = ${graph.graphs[0].var}.m_0;`);
						else
							debugger;
					}
					else
					{
					}
					break;
				case 'LambdaMorphism':
				case 'Distribute':
				case 'DeDistribute':
					// TODO
					break;
				case 'Evaluation':
					const domGraph = upGraph.getFactor(domFactor);
					if ('eval' in domGraph)
					{
						const domNdx = Cat.U.pushFactor(domFactor, 1);
						code += this.instantiateMorphism(null, domGraph.eval, ndxMap, upGraph, domNdx, codFactor);
					}
					else
					{
						// TODO
					}
					break;
				case 'Composite':
					code += this.instantiateComposite(morphism, upGraph, domFactor, codFactor, symbol);
					break;
				case 'ProductMorphism':
					this.setupVariables(morphism, graph, new Map(), upGraph, domFactor, codFactor);
					if (morphism.dual)		// coproduct
					{
						const cnt = morphism.morphisms.length;
						if (cnt === 2)	// if-then-else
						{
							code += this.cline(`if (${graph.graphs[0].var}.c)\n{`);
							this.incTab();
							code += this.cline(`${graph.graphs[1].var}.c = 1;`);
							code += this.instantiateMorphism(null, morphism.morphisms[1], ndxMap, graph, [0, 1], [1, 1]);
							this.decTab();
							code += this.cline('}\nelse\n{');
							this.incTab();
							code += this.cline(`${graph.graphs[1].var}.c = 0;`);
							code += this.instantiateMorphism(null, morphism.morphisms[0], ndxMap, graph, [0, 0], [1, 0]);
							this.decTab();
							code += this.cline('}');
						}
						else if (cnt === 3)	// if 0 else if 1 else
						{
							code += this.cline(`if (${graph.graphs[0].var}.c === 0)\n{`);
							this.incTab();
							code += this.instantiateMorphism(null, morphism.morphisms[0], ndxMap, graph, [0, 0], [1, 0]);
							this.decTab();
							code += this.cline(`}\nelse if (${graph.graphs[0].var}.c == 1)\n{`);
							this.incTab();
							code += this.instantiateMorphism(null, morphism.morphisms[1], ndxMap, graph, [0, 1], [1, 1]);
							this.decTab();
							code += this.cline('}\nelse\n{');
							this.incTab();
							code += this.instantiateMorphism(null, morphism.morphisms[2], ndxMap, graph, [0, 2], [1, 2]);
							this.decTab();
							code += this.cline(`}`);
						}
						else		// switch
						{
							code += this.cline(`switch(${graph.graphs[0].var})\n{`);
							this.incTab();
							for (let i=0; i<cnt; ++i)
							{
								code += this.cline(`case ${i}:`);
								code += code += this.instantiateMorphism(null, morphism.morphisms[i], ndxMap, graph, [0, i], [1, i]);
								code += this.cline('break;');
							}
							this.decTab();
							code += this.cline('}');
						}
					}
					else		// product
						code += morphism.morphisms.map((m, i) => this.instantiateMorphism(null, m, ndxMap, upGraph, Cat.U.pushFactor(domFactor, i), Cat.U.pushFactor(codFactor, i))).join('');
					break;
				case 'ProductAssembly':
					if (!morphism.dual)
						code += morphism.morphisms.map((m, i) => this.instantiateMorphism(null, m, ndxMap, upGraph, domFactor, Cat.U.pushFactor(codFactor, i))).join('');
					break;
				case 'HomMorphism':
					code += morphism.morphisms.map(m => this.instantiateMorphism(null, m, ndxMap, upGraph)).join('');		// TODO wrong number of arguments
					break;
				case 'NamedMorphism':
					// instantiate the named morphism's base
					code += this.instantiateMorphism(symbol, morphism.base, ndxMap, upGraph, domFactor, codFactor);
					break;
			}
			return code;
		}
		instantiateComposite(morphism, upGraph, domFactor, codFactor, symbol)
		{
			const seqGraph = morphism.getCompositeGraph();
			const ndxMap = new Map();
			this.setupVariables(morphism, seqGraph, ndxMap, upGraph, domFactor, codFactor);
			let code = '';
			if (symbol)
			{
				code += this.cline(`void ${symbol}(${this.generateFunctionInterface(seqGraph)})\n{\n`);
				this.incTab();
			}
			code += this.cline(this.generateInternalVariables(seqGraph));
			code += morphism.morphisms.map((m, i) => this.instantiateMorphism(null, m, ndxMap, seqGraph, [i], [i+1])).join('');
			if (symbol)
			{
				this.decTab();
				code += this.cline('}');
			}
			return code;
		}
		generateInputs(graph)
		{
			let code = '';
			graph.graphs[0].scan((g, f) =>
			{
				code += this.cline(`std::cin >> ${g.var};\n`);
			});
			return code + '\n';
		}
		generateOutputs(graph)
		{
			let code = '';
			graph.graphs[graph.graphs.length -1].scan((g, f) =>
			{
				code += this.cline(`std::cout << ${g.var} << std::endl;\n`);
			});
			return code;
		}
		generate(morphism)		// not recursive
		{
			if (this.generated.has(morphism.name))
				return '';
			if (morphism instanceof Cat.Diagram)
				return this.generateDiagram(morphism);
			this.initialize(morphism.diagram);
			this.dependencies.add(morphism.name);
			const morphCode = new Map();
			let code =
`
#include <iostream>
#include <string>
#include <stdlib.h>
#include <map>
#include <cstring>

`;
			this.decTab();
			while(this.dependencies.size > 0)
			{
				const name = [...this.dependencies].shift();
				this.dependencies.delete(name);
				const m = this.context.getElement(name);
				morphCode.set(name, this.generateMorphism(m));
			}
			this.incTab();
			this.objectScanner(morphism.domain);
			this.objectScanner(morphism.codomain);
			[...this.objects].reverse().map(o => code += this.generateObject(o, true)).join('\n');
			return code + [...morphCode.values()].reverse().join('\n');
			/*
			let code =
`
#include <iostream>
#include <string>
#include <stdlib.h>
#include <map>
#include <cstring>

${this.generateHeader()}
${this.generateObjects(morphism)}
int main(int argc, char ** argv)
{
	try
	{
		if (argc == 2 && (strcmp("-h", argv[1]) || strcmp("--help", argv[1])))
		{
			std::cout << "Diagram: ${this.context.name}" << std::endl;
			std::cout << "Morphism: ${morphism.name}" << std::endl;
`;
			if (morphism.description !== '')
				code +=
`			std::cout << "Description: ${morphism.description}" << std::endl;
`;
			code +=
`			return 1;
		}

${morphismCode}
		return 0;
	}
	catch(std::exception x)
	{
		std::cerr << "An error occurred" << std::endl;
		return 1;
	}
}
`;
			return code;
			*/
		}

		getFactorAccessor(factor)
		{
			return Array.isArray(factor) ? factor.map(i => `m_${i}`).join('.') : `m_${factor}`;
		}
		getStd(element)
		{
			let name = '';
			switch(element.constructor.name)
			{
				case 'ProductObject':
					name = element.dual ? 'Coproduct object' : 'Product object';
					break;
				case 'ProductMorphism':
					name = element.dual ? 'Coproduct morphism' : 'Product morphism';
					break;
				case 'FactorMorphism':
					name = element.dual ? 'Cofactor morphism' : 'Factor morphism';
					break;
				default:
					name = element.constructor.name;
					break;
			}
			return name;
		}
		generateComments(element)
		{
			const name = this.getStd(element);
			let txt = `//\n// ${name}\n// ${element.name}\n`;
			if (element.description !== '')
				txt += `// ${element.description}\n`;
			if (element instanceof Cat.Morphism)
				txt += `// ${element.domain.name} --> ${element.codomain.name}\n`;
			return txt + '//\n';
		}
		generateDiagram(diagram)
		{
			this.initialize(diagram);
			this.currentDiagram = null;
			let code =
`// Catecon Diagram ${diagram.name} @ ${Date()}
#include <iostream>
#include <string>
#include <stdlib.h>
#include <map>
#include <cstring>

${this.generateHeader()}
`;
			this.findAllObjects();
			code += this.generateObjects();
			code +=
`
namespace ${this.getNamespace(diagram)}
{
`
;
			diagram.forEachMorphism(m =>
			{
				this.initialize(this.context);
				code += this.generateMorphism(m);
			});
			code += '}\n';
			return code;
		}
	}
	//
	// Loading
	//
	if (typeof module !== 'undefined')
	{
		module.exports.CppAction = CppAction;
		Cat.R.Actions.cpp = new CppAction(Cat.R.$CAT);
	}
	else
	{
		window.CppAction = CppAction;
		window.Cat.R.Actions.cpp = new CppAction(Cat.R.$CAT);
	}

})();	// end anon function
