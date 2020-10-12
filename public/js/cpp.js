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

	class CppAction extends Cat.LanguageAction
	{
		constructor(diagram)
		{
			super(diagram, 'cpp', 'cpp', typeof module !== 'undefined' ? H3.g([H3.text({"text-anchor":"middle", x:"160", y:"200", style:"font-size:220px;font-weight:bold;stroke:#000;"}, "C"),
												H3.text({"text-anchor":"middle", x:"160", y:"330", style:"font-size:200px;font-weight:bold;stroke:#000;"}, "++")]) : null);
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
			out ${object.objects.map((o, i) => !(o instanceof HomObject) ? ` << obj.m_${i} << " "` : '').join('')};
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
			in ${object.objects.map((o, i) => !(o instanceof HomObject) ? ` >> obj.m_${i}` : '').join('')};
			return in;            
		}
		friend std::ostream & operator<<(std::ostream  & out, const ${name} & obj )
		{ 
			out ${object.objects.map((o, i) => !(o instanceof HomObject) ? ` << obj.m_${i} << " "` : '').join('')};
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
			if (object instanceof CatObject)
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
			if (morphism instanceof MultiMorphism)
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
			if (element instanceof CatObject)
				code += this.generateObject(element, generated);
			else if (element instanceof Morphism)
				code += this.generateMorphism(element, generated);
			return code;
		}
		generateMain(diagram)
		{
			this.currentDiagram = null;
			const namedMorphisms = new Set();
			diagram.forEachMorphism(function(m)
			{
				if (m instanceof NamedMorphism)
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

	if (typeof module !== 'undefined')
	{
		module.exports.CppAction = CppAction;
		Cat.R.Actions.cpp = new CppAction(Cat.R.$Actions);
	}
	else
	{
		window.CppAction = CppAction;
		window.Cat.R.Actions.cpp = new CppAction(Cat.R.$Actions);
	}

})();	// end anon function
