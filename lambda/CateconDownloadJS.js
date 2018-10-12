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

function formJS(dgrm)
{
	let js =
`//
// Catelitical version of ${dgrm.username}'s diagram ${dgrm.basename} for Ecmascript
//
// Date: ${Date()}
// CID:  ${dgrm.cid}
//
const CatFns = {function:{}, functor:{}, transform:{}, util:{}};

`;
	Object.keys(CatFns.function).forEach(function(name)
	{
		if (name === 'ttyOut')
			js += `CatFns.function['ttyOut'] = function(args)\n\t\t{\n\t\t\tconsole.log(args);\n\t\t\treturn null;\n\t\t};`;
		else
			js += Cat.diagram.functionBody('function', name, CatFns.function);
	});
	Object.keys(CatFns.util).forEach(function(name)
	{
		js += Cat.diagram.functionBody('util', name, CatFns.util);
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
	js += dgrm.js(found);
	found[dgrm.name] = true;
	js += 'const diagrams = {};\n';
	Object.keys(found).forEach(function(d)
	{
		js += `diagrams['${d}'] = \tnew ${d}();\n`;
	});
	js += `
function getDiagram()
{
	return diagrams.${dgrm.name};
}
`;
	return js;
}

exports.handler = (event, context, callback) =>
{
	const dgrmInfo = event.diagram;
	const Body = JSON.stringify(dgrmInfo);
	if (Body.length > 1000000)
	{
		const message = 'Error:  Diagram is too large to load';
		console.log(message);
		callback(message, null);
		return;
	}

	const dgrm = new Cat.diagram(dgrmInfo);

	const js = formJS(dgrm);

	callback(null, js);
};
