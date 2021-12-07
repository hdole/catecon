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
				case 'CatObject':
					basetype = elt.name;
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
					basetype = elt.name;
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
			basetype = isLocal ? basetype : `${this.getNamespace(elt.diagram)}::${basetype}`;
			this.currentDiagram = priorDiagram;
			return !first ? U.Token(basetype) : basetype;
		}
		generateHeader()
		{
			const refs = this.context.getAllReferenceDiagrams();
			let code = '';
			this.references = new Map();
			[...refs.keys()].reverse().map(dgrm =>
			{
				const d = R.$CAT.getElement(dgrm);
				this.references.set(d.name, new Set());
				let nuCode = this.getCode(d);
				if (nuCode !== '' && nuCode.slice(-1) !== '\n')
					nuCode = nuCode + '\n';
				code += nuCode;
			});
			this.references.set(this.context.name, new Set());
			if (code !== '')
				code = '// from diagrams\n' + code;
			return code;
		}
		generateProductObject(object, generated)
		{
			if (this.hasCode(object))
				return this.generateRuntime(object);
			const name = this.getType(object);
			let code = object.objects.map(o => this.generateObject(o, generated)).join('');
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
			out ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) ? ` << obj.m_${i} << " "` : '').join('')};
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
		in ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) ? ` >> obj.m_${i}` : '').join('')};
		return in;            
	}
	friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
	{ 
		out ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) ? ` << obj.m_${i} << " "` : '').join('')};
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
		generateObject(object, generated = new Set())
		{
			if (generated.has(object.name))
				return '';
			generated.add(object.name);
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
						code += this.generateProductObject(object, generated);
						break;
					case 'HomObject':
//						code += this.cline(`${this.generateComments(object)}\ttypedef void (*${name})(const ${this.getType(object.objects[0])} &, ${this.getType(object.objects[1])} &);`);
						break;
					default:
						break;
				}
			}
			return this.cline(this.generateComments(object)) + code;
		}
		findObjects(object, generated)		// recursive
		{
			if (generated.has(object.name))
				return;
			generated.add(object.name);
			this.references.get(object.diagram.name).add(object);
			switch(object.constructor.name)
			{
				case 'CatObject':
					break;
				case 'ProductObject':
				case 'HomObject':
					object.objects.map(o => this.findObjects(o, generated));
					break;
			}
		}
		_findAllObjects(morphism, generated)		// recursive
		{
			switch(morphism.constructor.name)
			{
				case 'Identity':
					this.findObjects(morphism.domain, generated);
					break;
				case 'Morphism':
				case 'FactorMorphism':
					this.findObjects(morphism.domain, generated);
					this.findObjects(morphism.codomain, generated);
					break;
				case 'HomMorphism':
				case 'ProductAssembly':
				case 'ProductMorphism':
					morphism.morphisms.map(m => this._findAllObjects(m, generated));
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

			}
			else
			{
				const generated = new Set();
				this.context.forEachObject(o => this.findObjects(o, generated));
				this.context.forEachMorphism(m =>
				{
					this.findObjects(m.domain, generated);
					this.findObjects(m.codomain, generated);
				});
			}
		}
		generateObjects()		// not recursive
		{
			const generated = new Set();
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
					const objectCode = [...set].map(o => this.generateObject(o, generated)).join('');
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
					{
if (ndxMap.get(strNdx) !== v) debugger;
						return;
					}
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
		generateMorphism(morphism, generated)
		{
			if (generated.has(morphism.name))
				return '';
			generated.add(morphism.name);
			const code = this.cline(this.generateComments(morphism)) +
				this.instantiateMorphism(this.getType(morphism), morphism);
			return code;
		}
		// upGraph has the morphisms input and output variables at the domFactor and codFactor locations
		instantiateMorphism(symbol, morphism, ndxMap = new Map(), upGraph = null, domFactor = [0], codFactor = [1])		// recursive
		{
if (upGraph && upGraph.getFactor(domFactor) === undefined) debugger;
if (upGraph && upGraph.getFactor(codFactor) === undefined) debugger;
//			let code = '';
//			let code = this.cline(`// ${this.getStd(morphism)} ${morphism.name}`);		// TODO really debug code
			const span = H3.span(morphism.properName);
			let code = this.cline(`// ${this.getStd(morphism)} ${span.innerHTML}`);		// TODO really debug code
			const graph = morphism.getGraph();
			switch(morphism.constructor.name)
			{
				case 'Morphism':
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
		generate(morphism, generated = new Set())
		{
			if (generated.has(morphism.name))
				return '';
			if (morphism instanceof Cat.Diagram)
				return this.generateDiagram(morphism);
			this.initialize(morphism.diagram);
			return this.generateMorphism(morphism, generated)
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
			const generated = new Set();
			diagram.forEachMorphism(m =>
			{
				this.initialize(this.context);
				code += this.generateMorphism(m, generated);
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

		/*
		generateMorphism(morphism, generated)
		{
			const proto = morphism.constructor.name;
			const name = this.getType(morphism);
			let code = '';
			if (morphism instanceof Cat.MultiMorphism)
				code += morphism.morphisms.map(n => this.generate(n, generated)).join('\n');
			const header = this.header(morphism);
			const tail = this.tail();
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
						code += this.generateComments(morphism);
						code += header;
						const lngth = morphism.morphisms.length;
						for (let i=0; i<lngth; ++i)
						{
							const m = morphism.morphisms[i];
							if (i !== lngth -1)
								code += this.cline(2, `${this.getType(m.codomain)} out_${i};`);
							code += this.cline(2, `${this.getType(m)}(${i === 0 ? 'args' : `out_${i -1}`}, ${i !== lngth -1 ? `out_${i}` : 'out'});${i !== lngth -1 ? '\n' : ''}`);
						}
						code += tail;
						break;
					case 'Identity':
						code += this.generateComments(morphism);
						code += `${header}\t\tout = args;${tail}`;
						break;
					case 'ProductMorphism':
						code += morphism.morphisms.map(m => this.generate(m, generated)).join('');
						code += this.generateComments(morphism);
						if (morphism.dual)
						{
							const subcode = morphism.morphisms.map((m, i) => this.getType(m).join(',\n\t\t\t'));
							code += `${header}		const void (*)(void*)[] fns = {${subcode}};\n\t\tfns[args.index]();${tail}`;
						}
						else
							code += `${header}\t\t${morphism.morphisms.map((m, i) => this.cline(2, `${this.getType(m)}(args.m_${i}, out.m_${i});`)).join('')}${tail}`;
						break;
					case 'ProductAssembly':
						code += `${header}\t\t${morphism.morphisms.map((m, i) => this.cline(2, `${this.getType(m)}(args, out.m_${i});\n`)).join('')}${tail}`;
						break;
					case 'Morphism':
						code += this.generateComments(morphism);
						code += this.generateRuntime(morphism);
						if ('recursor' in morphism)
						{
							generated.add(morphism.name);	// add early to avoid infinite loop
							code += this.generate(morphism.recursor, generated);
						}
						if ('data' in morphism)
						{
							const data = JSON.stringify(U.JsonMap(morphism.data));
							code += this.generateComments(morphism);
							code +=
`
const ${name}_Data = new Map(${data});
function ${name}_Iterator(fn)
{
	const result = new Map();
	${name}_Data.forEach(function(d, i)		// TODO? not C++
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
return ${this.getType(morphism.recursor)}(args);
${tail}`;
				else
					code +=
`
	${header}	return ${name}_Data.get(args);${tail}`;
						break;
					case 'Distribute':
					case 'Dedistribute':
						code += this.generateComments(morphism);
						code +=
`${header}	out.m_0 = args.m_1.m_0;
out.m_1.m+0 = args.m_0;
out.m_1.m_2 = args.m_1.m_1;${tail}`;
						break;
					case 'Evaluation':
						code += this.generateComments(morphism);
						code += `${header}\t\targs.m_0(args.m_1, out);${tail}`;
						break;
					case 'FactorMorphism':
						code += this.generateComments(morphism);
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
						code += this.generateComments(morphism);
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
						code += this.generateComments(morphism);
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
						code += this.generateComments(morphism);
						code += `${header}\t\t${this.getType(morphism.source)}(args, out);${tail}`;
						break;
				}
			return code;
		}
		evalComposite(morphism, factor)
		{
			let code = '';
			switch(morphism.constructor.name)
			{
				case 'Morphism':
					break;
				case 'Evaluation':
					break;
				case 'Composite':
					break;
				case 'Identity':
				case 'FactorMorphism':
				case 'LambdaMorphism':
				case 'Distribute':
				case 'DeDistribute':
					break;
				case 'ProductMorphism':
				case 'ProductAssembly':
				case 'HomMorphism':
					morphism.morphisms.map((mm, i) => evalComposite(mm, Cat.U.pushFactor(factor, i)));
					break;
				case 'NamedMorphism':
					evalComposite(morphism.base);
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
			if (element instanceof Cat.CatObject)
				code += this.generateObject(element, generated);
			else if (element instanceof Cat.Morphism)
				code += this.generateMorphism(element, generated);
			return code;
		}
		generateMain(diagram)
		{
			this.currentDiagram = null;
			const namedMorphisms = new Set();
			diagram.forEachMorphism(m =>
			{
				if (m instanceof Cat.NamedMorphism)
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
		*/
})();	// end anon function
