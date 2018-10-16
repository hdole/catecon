// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
const AWS = require('aws-sdk');
const C = require('./AWSconstants.js');
const Cat = require('./Cat.js');
const CatFns = require('./CatFns.js');

const credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId:C.IDENTITY_POOL_ID});

AWS.config.update(
{
	region:		C.COGNITO_REGION,
	credentials
});

const S3 = new AWS.S3({apiVersion: '2006-03-01'});

function morphismJS(m, close = true)
{
	let js =
`			//
			// ${m.html}
			//
			this.morphisms.set('${m.name}',
			{
				name:	'${m.name}',
				$:		CatFns.function['${m.function}'],
`;
	if ('morphisms' in m)
		js +=
`				morphisms:	[${m.morphisms.map(m => "this.getMorphism('" + m.name + "')").join()}],
`;
	if ('recursor' in m)
		js +=
`				updateRecursor:	function()
				{
					if (typeof m.recursor === 'string')
						this.recursor = Cat.getDiagram().getMorphism(this.recursor);
				},
`;
	switch(m.subClass)
	{
	case 'dataMorphism':
		js += `
				data:${JSON.stringify(m.data)},\n`;
			if (m.recursor !== null)
				js += `
				recursor:'${typeof m.recursor === 'string' ? m.recursor : m.recursor.name}'\n`;
		break;
	case 'factorMorphism':
		js += `				factors:${JSON.stringify(m.factors)},\n`
		break;
	case 'curryMorphism':
		js = `
				factors:${JSON.stringify(m.factors)},
				preCurry:${m.preCurry.name}\n`
		break;
	case 'default':
	}
	if (close)
		js += '			});\n';
	return js;
}

function diagramJS(dgrm, foundDiagram = {})
{
	let js = '';
	for (let i=0; i<dgrm.references.length; ++i)
	{
		const r = dgrm.references[i];
		if (r.name in foundDiagram)
			continue;
		js += diagramJS(r, foundDiagram);
		foundDiagram[r.name] = true;
	}
	const jsName = dgrm.name.replace(/[-@]/g, '_');
	js +=
`
	class ${jsName} extends diagram
	{
		constructor()
		{
			super();
			this.name = '${jsName}';
			this.cid = '${dgrm.cid}';
			this.references = [${dgrm.references.map(r => 'diagrams.' + r.name).join('\t\t\t\t,\n')}];
			Cat.diagrams[${jsName}] = this;
`;
	let foundMorphism = {};
	for(const [name, mor] of dgrm.codomain.morphisms)
		if (!(mor.name in foundMorphism))
		{
			js += morphismJS(mor);
			foundMorphism[mor.name] = true;
		}
	js += '		}\n';
	for(const [name, mor] of dgrm.codomain.morphisms)
	{
		const args = 'data' in mor.domain.expr ? mor.domain.expr.data.map((x, i) => `a${i}`).join(', ') : 'a';
		const name = mor.name.replace(/-/g, '_');
		js += `		//
		// ${mor.name}
		// ${mor.description}
		//
		${name}(${args})
		{
			return CatFns.function['${mor.function}'](${args});
		}
`;
	}
	js += `
	}
`;
	return js;
}

function functionBody(type, name, functions)
{
	let funText = functions[name].toString();
	funText = funText.replace(new RegExp(name), 'function');
	return `\tCatFns.${type}['${name}'] = ${funText};\n`;
}

function formJS(dgrm)
{
	let js =
`//
// Catecon
//
// Diagram: ${dgrm.basename}
// User:    ${dgrm.username}
// Date:    ${Date()}
// CID:     ${dgrm.cid}
//
(function(exports)
{
	const CatFns = {function:{}, functor:{}, transform:{}, util:{}};

`;
	Object.keys(CatFns.function).forEach(function(name)
	{
		if (name === 'ttyOut')
			js += `CatFns.function['ttyOut'] = function(args)\n\t\t{\n\t\t\tconsole.log(args);\n\t\t\treturn null;\n\t\t};`;
		else
			js += functionBody('function', name, CatFns.function);
	});
	Object.keys(CatFns.util).forEach(function(name)
	{
		js += functionBody('util', name, CatFns.util);
	});
	js = js.replace(/\r/g, '');
	js +=
`
	class diagram
	{
		constructor()
		{
			this.morphisms = new Map();
			this.references = [];
		}
		getMorphism(name)
		{
			let m = null;
			for (let i=0; i<this.references.length; ++i)
			{
				const r = this.references[i];
				m = r.getMorphism(name);
				if (m)
					return m;
			}
			return this.morphisms.has(name) ? this.morphisms.get(name) : null;
		}
	}
`;
	let found = {};
	js += diagramJS(dgrm, found);
	found[dgrm.name] = true;
	js += `
	const Cat =
	{
		diagrams:	{},
		getDiagram(name)
		{
			return Cat.diagrams[name];
		}
	};
`;
	Object.keys(found).forEach(function(d)
	{
		js += `\tCat.diagrams['${d}'] = \tnew ${d}();\n`;
	});
	js += `
}).call(this);
`;
	return js;
}

exports.handler = (event, context, callback) =>
{
	const dgrmInfo = event.diagrams;
	const Body = JSON.stringify(dgrmInfo);
	if (Body.length > 1000000)
	{
		const message = 'Error:  Diagram is too large to load';
		console.log(message);
		callback(message, null);
		return;
	}

	const diagrams = dgrmInfo.map(d => new Cat.diagram(d));

	const js = formJS(diagrams.pop());

	callback(null, js);
};
