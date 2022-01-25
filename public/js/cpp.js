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
				debug:					{value: false,	writable:	true},
				references:				{value:	new Map(),	writable:	false},
				tab:					{value:	1,		writable:	true},
				dependencies:			{value: new Set(),	writable:	false},		// from element name t0 symbol
				generated:				{value: new Set(),	writable:	false},		// elements already produced
				objects:				{value: new Set(),	writable:	false},		// elements already produced
				generatedVariables:		{value: new Set(),	writable:	false},		// variables generated during the code generation
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
			this.generatedVariables.clear();
			if (diagram)
			{
				this.references.set(diagram.name, new Set());
				const refs = this.context.getAllReferenceDiagrams();
				refs.forEach((dgrm, name) => this.references.set(name, new Set()));
			}
			this.bool = diagram ? diagram.coprod(diagram.getTerminal(), diagram.getTerminal()).signature : null;
		}
		incTab()
		{
			this.tab++;
		}
		isBool(obj)
		{
			return obj.signature === this.bool;
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
			const name = U.Token(this.currentDiagram.name + '/');
			switch(elt.constructor.name)
			{
				case 'ProductObject':
					basetype = name + (elt.dual ? 'Copr_' : 'Pr_') + elt.objects.map(o => this.getType(o, false)).join('_c_');
					break;
				case 'ProductMorphism':
					basetype = name + (elt.dual ? 'Copr_' : 'Pr_') + elt.morphisms.map(m => this.getType(m, false)).join('_c_');
					break;
				case 'HomObject':
					basetype = name + `hom_${this.getType(elt.objects[0], false)}_c_${this.getType(elt.objects[1], false)}`;
					break;
				case 'HomMorphism':
					basetype = name + `hom_${this.getType(elt.morphisms[0], false)}_c_${this.getType(elt.morphisms[1], false)}`;
					break;
				case 'Identity':
					basetype = name + `id_${this.getType(elt.domain, false)}`;
					break;
				case 'Composite':
					basetype = name + 'Comp_' + elt.morphisms.slice().reverse().map(m => this.getType(m, false)).join('_c_');
					break;
				case 'Evaluation':
					basetype = name + `Eval_${this.getType(elt.domain.objects[0])}_by_${this.getType(elt.domain.objects[1])}_to_${this.getType(elt.codomain)}`;
					break;
				case 'FactorMorphism':
					basetype = name + (elt.dual ? 'Cofctr_' : 'Fctr_') + this.getType(this.dual ? elt.codomain : elt.domain, false) + '_' + U.Token(elt.factors.map(f => U.a2s(f, '_', '_c_', '_')).join('_c_'));
					break;
				case 'ProductAssembly':
					basetype = name + (elt.dual ? 'CoPrAs_' : 'PrAs_') + elt.morphisms.map(m => this.getType(m, false)).join('_c_');
					break;
				default:
					basetype = U.Token(elt.name);
					break;
			}
			if (!first && elt.needsParens())
				basetype = `Pa_${basetype}_aP`;
			this.currentDiagram = priorDiagram;
			return basetype;
		}
		hasHomObject(object)
		{
			let result = false;
			switch(object.constructor.name)
			{
				case 'ProductObject':
				case 'PullbackObject':
					result = object.objects.reduce((r, o) => r || this.hasHomObject(o), false);
					break;
				case 'HomObject':
					result = true;
			}
			return result;
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
			this.incTab();
			const members = object.objects.filter(o => !o.isTerminal()).map((o, i) => this.cline(`${this.getType(o)} m_${i};`, object.dual ? 1 : 0)).join('\n');
			this.decTab();
			const objects = object.objects.filter(o => !o.isTerminal()  && !this.hasHomObject(o));
			if (object.dual)		// coproduct object
			{
				if (objects.length > 0)
				{
				code +=
`
${this.generateComments(object)}
struct ${name}
{
	unsigned long c;
	union
	{
${members}
	};
`;
					if (!this.hasHomObject(object))
					{
						code +=
`	friend std::istream & operator>>(std::istream & in, ${name} & obj)
	{
		in >> obj.c;
		switch(obj.c)
		{
${objects.map((o, i) => `\t\t\tcase ${i}:\n\t\t\t\tin >> obj.m_${i};\n\t\t\t\tbreak;\n`).join('')}
			default:
				break;
		}
		return in;            
	}
	friend std::ostream & operator<<(std::ostream & out, const ${name} & obj)
	{
		out << obj.c;
		switch(obj.c)
		{
${objects.map((o, i) => `\t\t\tcase ${i}:\n\t\t\t\tout << obj.m_${i};\n\t\t\t\tbreak;\n`).join('')}
			default:
				break;
		}
		return out;            
	}
`;
					}
					code += '};\n';
				}
				else
				{
					if (object.objects.length === 2)
						code +=
`
typedef bool ${name};
`;
					else
						code +=
`
typedef unsigned long ${name};
`;
				}
			}
			else	// product object
			{
				code +=
`
${this.generateComments(object)}
struct ${name}
{
${members}
`;
				if (objects.length > 0 && !this.hasHomObject(object))
					code +=
`	friend std::istream & operator>>(std::istream & in, ${name} & obj)
	{ 
		in${objects.map((o, i) => ` >> obj.m_${i}`).join('')};
		return in;            
	}
	friend std::ostream & operator<<(std::ostream & out, const ${name} & obj)
	{ 
		out${objects.map((o, i) => ` << obj.m_${i} << " "`).join('')};
		return out;            
	}
`;
				code += '};\n';
			}
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
//						code += this.generateProductObject(object);
						if (this.isBool(object))		// TODO sz > 2
							code += this.generateProductObject(object);
						break;
					case 'HomObject':
						code += this.generateFunctionPointer(object);
						break;
					default:
						break;
				}
			}
			return this.cline(code);
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
				(	
					(g.element instanceof Cat.ProductObject && g.element.dual) ||		// process a coproduct as var
					(g.element instanceof Cat.HomObject) ||								// process a hom object as var
					('var' in g) ||														// variable declared
					(g.isLeaf() && !('var' in g)));										// process a leaf as var
		}
		// Copy variables from the upGraph to the graph, and set the ndxMap as to where the variables are located.
		// The domFactor and codFactor give the location of the morphism's graph in the upGraph.
		copyVariables(graph, ndxMap, upGraph, domFactor, codFactor)
		{
			let factor = domFactor;	// scan the domain
			let downFactor = [0];		// domain
			const process = (g, ndx) =>
			{
				const upG = upGraph.getFactor(factor);
				const upFactor = U.pushFactor(factor, ndx);
				const up = upGraph.getFactor(upFactor);
//				if ('alloc' in up)
//					g.alloc = up.alloc;
				if ('dom' in up)
					g.dom = up.dom;
				if ('cod' in up)
					g.cod = up.cod;
				if (upG.element.isTerminal())
					return;
				if ('var' in up)
				{
					g.var = up.var;
					const thisFactor = U.pushFactor(downFactor, ndx);
					ndxMap.set(thisFactor.toString(), g.var);
						/*
					if (up.element instanceof Cat.ProductObject && up.element.dual && !this.isBool(up.element))		// distribute coproduct terms  TODO process >2
					{
						const isFold = 'dom' in up && up.dom instanceof Cat.FactorMorphism && up.dom.isFold();
						up.element.objects.map((o, i) =>
						{
							const v = isFold ? g.var : `${g.var}.m_${i}`;
							g.graphs[i].var = v;
							const iFactor = U.pushFactor(factor, i);
							ndxMap.set(iFactor.toString(), v);
						});
					}
						*/
				}
				if (up.element instanceof Cat.ProductObject && up.element.dual)
					g.graphs.map((subg, i) => subg.scanCheck(CppAction.CheckGraph, process, U.pushFactor(ndx, i)));
//				g.graphs.map((subg, i) =>
//				{
//					if ('alloc' in up.graphs[i])
//						subg.alloc = true;
//				});
			};
			graph.graphs[0].scanCheck(CppAction.CheckGraph, process);
			factor = codFactor;		// now scan the codomain
			const cnt = graph.graphs.length -1;
			downFactor = [cnt];		// codomain
			graph.graphs[cnt].scanCheck(CppAction.CheckGraph, process);
		}
		setupEvaluations(graph)
		{
			const check = g => 'dom' in g && 'cod' in g && g.dom instanceof Cat.Evaluation && g.cod instanceof Cat.ProductMorphism && g.cod.morphisms[0].domain.isTerminal();
			const process = (g, ndx) =>
			{
				const m = g.cod.morphisms[0];
				if ('data' in m)
					g.eval = m.data.get(0);
			};
			graph.scanCheck(check, process);
		}
		setupVariables(morphism, graph, ndxMap, upGraph, domFactor, codFactor)
		{
			if (upGraph)
				this.copyVariables(graph, ndxMap, upGraph, domFactor, codFactor);
//			let alloc = false;
			const check = g =>
			{
//				if ('alloc' in g)
//					alloc = g.alloc;
				return CppAction.CheckGraph(g);
			};
			const process = (g, ndx) =>
			{
				if (g.element.isTerminal() || this.getCode(g.element) === '//' || 'var' in g)		// skip this element as it is a terminal or global variable '//'
					return;
				const indexes = g.links.filter(lnk => ndxMap.has(lnk.toString()));
				const strNdx = ndx.toString();
//				if (alloc)
//					g.alloc = alloc;
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
					if (ndx.length > 1)
					{
						const upNdx = ndx.slice(0, -1);
						const up = graph.getFactor(upNdx);
						if ('eval' in up)		// do not need to allocate space for this eval
							return;
					}
					if (g.cod instanceof Cat.Distribute)
					{
						const dtor = ndx.slice(0, -1);
						dtor.push(ndx[ndx.length -1] -1, 0);	// TODO fix for side
						const strDtor = dtor.toString();
						if (ndxMap.has(strDtor))
							ndxMap.set(strNdx, ndxMap.get(strDtor));
					}
					else if (g.cod instanceof Cat.ProductMorphism && g.cod.dual)
					{
						const preFctr = ndx.slice(0, -1);
						preFctr.push(ndx[ndx.length -1] -1);
						const strPreFctr = preFctr.toString();
						if (ndxMap.has(strPreFctr))
							ndxMap.set(strNdx, ndxMap.get(strPreFctr));
					}
					if (!ndxMap.has(strNdx))
					{
						ndxMap.set(strNdx, `var_${this.varCount++}`);
//						if (g.element instanceof Cat.ProductObject && g.element.dual)
//							g.graphs.map(subg => subg.alloc = true);
					}
//					if (g.element instanceof Cat.ProductObject && g.element.dual)
//						g.graphs.map(subg => subg.alloc = true);
					g.var = ndxMap.get(strNdx);
					if (g.element instanceof Cat.ProductObject && g.element.dual && !this.isBool(g.element))
//						g.graphs.map((g, i) => process(g, U.pushFactor(ndx, i)));
						g.graphs.map((subg, i) => subg.scanLinks(subg, check, process));
				}
			};
			graph.scanLinks(graph, check, process);
		}
		generateFunctionPointer(hom)
		{
			const dom = hom.objects[0];
			let domObjects = dom instanceof Cat.ProductObject && !dom.dual ? dom.objects : [dom];
			domObjects = domObjects.filter(o => !o.isTerminal());
			const cod = hom.objects[1];
			let codObjects = cod instanceof Cat.ProductObject && !dom.dual ? dom.objects : [cod];
			codObjects = codObjects.filter(o => !o.isTerminal());
			const domIface = domObjects.map(o => `const ${this.getType(o)} &`).join(', ');
			const codIface = codObjects.map(o => `${this.getType(o)} &`).join(', ');
			return this.cline(`${this.generateComments(hom)}typedef void (*${this.getType(hom)})(${domIface}${domIface !== '' && codIface !== '' ? ', ' : ''}${codIface});\n`);
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
				this.generatedVariables.add(g.var);
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
			const codNdx = graph.graphs.length -1;		// we might have been given a sequence graph
			const process = (g, ndx) =>
			{
				if (g.element.isTerminal() || this.getCode(g.element) === '//')		// skip this element as it is a terminal or global variable '//'
					return;
//				if ('alloc' in g && g.alloc)
//					return;
				if (g.links.reduce((r, lnk) => r || lnk[0] === codNdx, false))		// return if linked to output
					return;
				if (ndx.length > 1)
				{
					const upNdx = ndx.slice(0, -1);
					const up = graph.getFactor(upNdx);
					if ('eval' in up)		// do not need to allocate space for this eval
						return;
				}
				if ('var' in g)
				{
					if (this.generatedVariables.has(g.var))
						return;
					this.generatedVariables.add(g.var);
				}
				let modifier = '';
				let constant = '';
				if (ndx[0] === codNdx)
					modifier = '& ';
				else
					constant = 'const ';
				const isFold = 'dom' in g && g.dom instanceof Cat.FactorMorphism && g.dom.isFold();
				code += `${this.getType(this.context.getElement(isFold ? g.element.objects[0].name : g.element.name))} ${g.var};\n`;
			};
			graph.scanCheck(CppAction.CheckGraph, process);
			return code;
		}
		__findVars(graph, ndx)
		{
			if ('var' in graph)
				console.log('var', ndx, graph.var);
			graph.graphs.map((g, i) => this.__findVars(g, U.pushFactor(ndx, i)));
		}
		__find(graph, term, ndx = [])
		{
			if (term in graph)
				console.log(term, ndx, graph[term]);
			graph.graphs.map((g, i) => this.__find(g, term, U.pushFactor(ndx, i)));
		}
		// generate code for the morphism as a function
		// not recursive
		generateMorphism(morphism)
		{
			if (this.generated.has(morphism.name))
				return '';
			this.generated.add(morphism.name);
			const ndxMap = new Map();
			const graph = morphism.getGraph();
			this.setupVariables(morphism, graph, ndxMap, graph, [0], [1]);
			const code = this.cline(this.generateComments(morphism)) +
				this.instantiateMorphism(this.getType(morphism), morphism, new Map(), graph);
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
			let code = '';
			if (this.debug)
			{
				const span = H3.span(morphism.properName);
				code += this.cline(`// ${this.getStd(morphism)} ${span.innerHTML} ${domFactor.toString()} ${codFactor.toString()}`);
			}
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
									nuCode = nuCode.replace(rx, v);
								}
							}
							else
							{
								const g = graph.getFactor([1]);
								if (this.getCode(g.element) !== '//')
								{
									const v = g.var;
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
				/*
					if (morphism.dual)
					{
						this.setupVariables(morphism, graph, new Map(), upGraph, domFactor, codFactor);
						if (morphism.isFold())
							code += this.cline(`${graph.graphs[1].var} = ${graph.graphs[0].var};`);
						else
							debugger;
					}
					else
					{
					}
					*/
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
						delete domGraph.graphs[0].var;		// variable is consumed here
//						domGraph.graphs[0].alloc = true;
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
						const up = upGraph.getFactor(codFactor);
						const upperDomainMorph = 'dom' in up ? up.dom : null;
						const isFold = upperDomainMorph && upperDomainMorph instanceof Cat.FactorMorphism && upperDomainMorph.isFold();
						const cnt = morphism.morphisms.length;
						if (cnt === 2)	// if-then-else
						{
//							code += this.cline(`if (${graph.graphs[0].var}${this.isBool(graph.graphs[0].element) ? '' : '.c'})\n{`);
							code += this.cline(`if (${graph.graphs[0].var})\n{`);
							this.incTab();
							code += isFold ? '' : this.cline(`${graph.graphs[1].var}.c = 1;`);
							code += this.instantiateMorphism(null, morphism.morphisms[1], ndxMap, graph, [0, 1], [1, 1]);
							this.decTab();
							code += this.cline('}\nelse\n{');
							this.incTab();
							code += isFold ? '' : this.cline(`${graph.graphs[1].var}.c = 0;`);
							code += this.instantiateMorphism(null, morphism.morphisms[0], ndxMap, graph, [0, 0], [1, 0]);
							this.decTab();
							code += this.cline('}');
						}
						else if (cnt === 3)	// if 0 else if 1 else
						{
							code += isFold ? '' : this.cline(`if (${graph.graphs[0].var}.c === 0)\n{`);
							this.incTab();
							code += this.instantiateMorphism(null, morphism.morphisms[0], ndxMap, graph, [0, 0], [1, 0]);
							this.decTab();
							code += isFold ? '' : this.cline(`}\nelse if (${graph.graphs[0].var}.c == 1)\n{`);
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
								this.incTab();
								code += this.instantiateMorphism(null, morphism.morphisms[i], ndxMap, graph, [0, i], [1, i]);
								code += this.cline('break;');
								this.decTab();
							}
							code += this.cline('default:');
							this.incTab();
							// TODO default case
							code += this.cline('break;');
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
			this.setupEvaluations(seqGraph);
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
			const graph = morphism.getGraph();
			let code =
`
#include <iostream>
#include <string>
#include <stdlib.h>
#include <map>
#include <cstring>


${this.generateHeader()}


`;
			this.decTab();
			while(this.dependencies.size > 0)
			{
				const name = [...this.dependencies].shift();
				this.dependencies.delete(name);
				const m = this.context.getElement(name);
				morphCode.set(name, this.generateMorphism(m));
			}
			this.objectScanner(morphism.domain);
			this.objectScanner(morphism.codomain);
			[...this.objects].reverse().map(o => code += this.generateObject(o)).join('\n');
			code += [...morphCode.values()].reverse().join('\n');
			code +=
`
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
		${this.getType(morphism)}(${this.generateFunctionInvocation(graph)});
		return 0;
	}
	catch(std::exception x)
	{
		std::cerr << "An error occurred" << std::endl;
		return 1;
	}
}
`;

			return this.cline(code);
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
