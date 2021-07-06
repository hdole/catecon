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

	function cline(indent, line)
	{
		return "\t".repeat(indent) + line + '\n';
	}
	class CppAction extends Cat.LanguageAction
	{
		constructor(diagram)
		{
			const args = {basename:'cpp', description:'C++ support', ext:'cpp'};
			super(diagram, args);
			Object.defineProperty(this, 'currentDiagram', {value:null, writable:true});
			Cat.R.languages.set(this.basename, this);
			Cat.R.$CAT.getElement('PFS').actions.set(args.basename, this);
			this.varMap = new Map();
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
			basetype = isLocal ? basetype : `${this.getNamespace(elt.diagram)}__${basetype}`;
			this.currentDiagram = priorDiagram;
			return !first ? U.Token(basetype) : basetype;
		}
		generateProductObject(object, generated)
		{
			const name = this.getType(object);
			let code = '';
			code += object.objects.map(o => this.generateObject(o, generated)).join('');
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
			out ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) ? ` << obj.m_${i} << " "` : '').join('')};
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
			in ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) ? ` >> obj.m_${i}` : '').join('')};
			return in;            
		}
		friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
		{ 
			out ${object.objects.map((o, i) => !(o instanceof Cat.HomObject) ? ` << obj.m_${i} << " "` : '').join('')};
			return out;            
		}
\t};
`;
			return code;
		}
		instantiate(element)
		{
			const code = this.getCode(element).replace(/%Type/g, this.getType(element)).replace(/%Namespace/gm, this.getNamespace(element.diagram));
			return code.slice(-1) === '\n' ? code : code + '\n';
//			if (element instanceof Morphism)
//				code = code.replace(/%Dom/g, this.getType(element.domain)).replace(/%Cod/g, this.getType(element.codomain));
//			return code;
		}
		generateObject(object, generated = new Set())
		{
			if (generated.has(object.name))
				return;
			generated.add(object.name);
			const proto = object.constructor.name;
			let code = '';
			const name = this.getType(object);
			if (object instanceof Cat.CatObject)
			{
				switch(proto)
				{
					case 'CatObject':
//						code += this.getComments(object) + this.instantiate(object);
						code += this.instantiate(object);
						break;
					case 'ProductObject':
//						code += this.generateProductObject(object, generated);
						break;
					case 'HomObject':
//						code += cline(2, `${this.getComments(object)}\ttypedef void (*${name})(const ${this.getType(object.objects[0])} &, ${this.getType(object.objects[1])} &);`);
						break;
					default:
						break;
				}
			}
			return code;
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
//			const domainStruct = this.getType(morphism.domain);
//			const codomainStruct = this.getType(morphism.codomain);
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
								code += cline(2, `${this.getType(m.codomain)} out_${i};`);
							code += cline(2, `${this.getType(m)}(${i === 0 ? 'args' : `out_${i -1}`}, ${i !== lngth -1 ? `out_${i}` : 'out'});${i !== lngth -1 ? '\n' : ''}`);
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
							code += `${header}\t\t${morphism.morphisms.map((m, i) => cline(2, `${this.getType(m)}(args.m_${i}, out.m_${i});`)).join('')}${tail}`;
						break;
					case 'ProductAssembly':
						code += `${header}\t\t${morphism.morphisms.map((m, i) => cline(2, `${this.getType(m)}(args, out.m_${i});\n`)).join('')}${tail}`;
						break;
					case 'Morphism':
						code += this.getComments(morphism);
						code += this.instantiate(morphism);
						if ('recursor' in morphism)
						{
							generated.add(morphism.name);	// add early to avoid infinite loop
							code += this.generate(morphism.recursor, generated);
						}
						if ('data' in morphism)
						{
							const data = JSON.stringify(U.JsonMap(morphism.data));
							code += this.getComments(morphism);
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
		*/

		generateObjects(morphism)		// not recursive
		{
			const generated = new Set();
			return this.generateObject(morphism.domain, generated) + this.generateObject(morphism.codomain, generated);
		}
		generateMorphism(morphism, ndxMap = new Map(), generated = new Set())		// recursive
		{
			let code = '';
			switch(morphism.constructor.name)
			{
				case 'Morphism':
					if ('data' in morphism)
					{
						const data = JSON.stringify(U.JsonMap(morphism.data));
						const type = this.getType(morphism);
						code += `std::map<${this.getType(morphism.domain)}, ${this.getType(morphism.codomain)}> ${type}_data ${data};\n`;
					}
					break;
				case 'Identity':
				case 'FactorMorphism':
				case 'LambdaMorphism':
				case 'Distribute':
				case 'DeDistribute':
				case 'Evaluation':
					break;
				case 'Composite':
					code += this.generateComposite(morphism, ndxMap);
					break;
				case 'ProductMorphism':
					// TODO skip id's, factor morphisms, and product, coproduct, ... thereof
					code += morphism.morphisms.map(m => this.generateMorphism(m, ndxMap, generated)).join('');
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
					code += morphism.morphisms.map(m => this.generateMorphism(m, ndxMap, generated)).join('');
					code += `${this.header(morphism)}\t\t${morphism.morphisms.map((m, i) => cline(2, `${this.getType(m)}(args, out.m_${i});\n`)).join('')}${this.tail()}`;
					break;
				case 'HomMorphism':
					code += morphism.morphisms.map(m => this.generateMorphism(m, ndxMap, generated)).join('');
					break;
				case 'NamedMorphism':
					code += this.generateMorphism(morphism.base, ndxMap, generated);
					break;
			}
			return code;
		}
		initialize()
		{
			this.varCount = 0;
		}
		copyVariables(graph, ndxMap, upGraph, domFactor, codFactor)
		{
			const fn = (g, f) =>
			{
				const upFactor = U.pushFactor(factor, f);
				g.var = upGraph.getFactor(upFactor).var;
				ndxMap.set(upFactor.toString(), g.var);
			}
			let factor = domFactor;
			graph.graphs[0].scan(fn);
			factor = codFactor;
			graph.graphs[graph.graphs.length -1].scan(fn);
		}
		// label the leafs in the graphs with a variable name
		setupVariables(morphism, graph, ndxMap, upGraph, domFactor, codFactor)		// assume morphism is flattened composite
		{
			if (upGraph)
				this.copyVariables(graph, ndxMap, upGraph, domFactor, codFactor);
			const doLeaf = (g, f) => !('var' in g);
			let code = '';
			const doit = (g, ndx) =>
			{
				if ('var' in g)
					return;
				const indexes = g.links.filter(lnk => ndxMap.has(lnk.toString()));
				const strNdx = ndx.toString();
				if (indexes.length > 0)
				{
					const v = ndxMap.get(indexes[0].toString());
					g.var = v;
					ndxMap.set(strNdx, v);
				}
				else
				{
					if (!ndxMap.has(strNdx))
					{
						const v = `var_${this.varCount++}`;
						ndxMap.set(strNdx, v);
						code += `${this.getType(R.diagram.getElement(g.name))} ${v};\n`;
					}
					g.var = ndxMap.get(strNdx);
				}
			};
			graph.funLinks(graph, doLeaf, doit);
			return code;
		}
		generateComposite(m, ndxMap, upGraph = null, domFactor = [], codFactor = [])
		{
			const morphism = m.diagram.comp(...m.expand());
			const graph = morphism.getSequenceGraph();
			const nuNdxMap = new Map();
			const code = this.setupVariables(morphism, graph, nuNdxMap, upGraph, domFactor, codFactor);
//			return m.morphisms.map((m, i) => this.scanner(m, U.pushFactor(domFactor, i), U.pushFactor(codFactor, i+1), graph, nuNdxMap)).join('');
			return code + m.morphisms.map((m, i) => this.scanner(m, [i], [i+1], graph, nuNdxMap)).join('');
		}
		scanner(morphism, domFactor, codFactor, graph, ndxMap)
		{
			let code = '';
			switch(morphism.constructor.name)
			{
				case 'Morphism':
					const dom = morphism.domain;
					const cod = morphism.codomain;
					const domCnt = !dom.dual && 'objects' in dom ? dom.objects.filter(o => !o.isTerminal()).length : 1;
					const codCnt = !cod.dual && 'objects' in cod ? cod.objects.filter(o => !o.isTerminal()).length : 1;
					let nuCode = morphism.code.cpp;
					if (domCnt > 1)
					{
						for (let i=0; i<domCnt; ++i)
						{
							const arg = `%${i}`;
							const rx = new RegExp(arg, 'g');
							const v = graph.getFactor(U.pushFactor(domFactor, i)).var;
							nuCode = nuCode.replace(rx, v);
						}
					}
					else
						nuCode = nuCode.replace(/%0/g, graph.getFactor(domFactor).var);
					if (codCnt > 1)
					{
						for (let i=domCnt; i<domCnt+codCnt; ++i)
						{
							const rx = new RegExp(`%${i}`, 'g');
							nuCode = nuCode.replace(rx, graph.getFactor(codFactor).var);
						}
					}
					else
					{
						const rx = new RegExp(`%${domCnt}`, 'g');
						nuCode = nuCode.replace(rx, graph.getFactor(codFactor).var);
					}
					if (nuCode.slice(-1) !== '\n')
						nuCode = nuCode + '\n';
					code += nuCode;
					break;
				case 'Evaluation':
					break;
				case 'Composite':
					code += this.generateComposite(morphism, ndxMap, graph, domFactor, codFactor);
					break;
				case 'Identity':
				case 'FactorMorphism':
				case 'LambdaMorphism':
				case 'Distribute':
				case 'DeDistribute':
					break;
				case 'ProductMorphism':
				case 'HomMorphism':
					morphism.morphisms.map((m, i) => this.scanner(m, Cat.U.pushFactor(domFactor, i), Cat.U.pushFactor(codFactor, i+1), graph, ndxMap));
					break;
				case 'ProductAssembly':
					if (!morphism.dual)
						code += morphism.morphisms.map((m, i) => this.scanner(m, domFactor, Cat.U.pushFactor(codFactor, i+1), graph, ndxMap)).join('');
					break;
				case 'NamedMorphism':
					this.scanner(morphism.base, domFactor, codFactor, graph, ndxMap);
					break;
			}
			return cline(2, code);
		}
		// top level code emitter; not recursive
		generate(morphism)
		{
			this.initialize();
			let code =
`
#include <iostream>

#include <string>
#include <stdlib.h>
#include <map>
#include <cstring>

// objects
${this.generateObjects(morphism)}


int main(int argc, char ** argv)
{
	try
	{
		if (argc == 1 && (strcmp("-h", argv[1]) || strcmp("--help", argv[1])))
		{
			std::cout << "${morphism.basename}: ${morphism.description}" << std::endl;
			return 1;
		}
${this.generateMorphism(morphism)}
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
		}

			/*
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
		/*
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
		*/
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
	//
	// Loading
	//
	const pfs = Cat.R.$CAT.getElement('sys/pfs');
	if (typeof module !== 'undefined')
	{
		module.exports.CppAction = CppAction;
		Cat.R.Actions.cpp = new CppAction(pfs);
	}
	else
	{
		window.CppAction = CppAction;
//		window.addEventListener('load', _ => {window.Cat.R.Actions.cpp = new CppAction(Cat.R.Actions)});
		window.Cat.R.Actions.cpp = new CppAction(pfs);
	}

})();	// end anon function
