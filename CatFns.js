// (C) 2018 Harry Dole
// Catecon Functions for Javascript:  The Categorical Console, Harry Dole
// vim: ts=4 sw=4
'use strict';

(function(exports)
{

	const CatFns =
	{
		function:
		{
			compose(args)
			{
				return this.morphisms.reduce((d, m) => d !== null ? m.$(d) : null, args);
			},
			data(args)
			{
				if (args in this.data)
					return this.data[args];
				for (let i=0; i<this.ranges.length; ++i)
				{
					const r = this.ranges[i];
					if (args >= r.startIndex && args <= r.startIndex + r.count)
						switch(r.type)
						{
						case 'range':
							return Cat.element.makeRangeData(null, this.codomain.expr, true, {idx:args, startIndex:r.startIndex, startValue:r.startValue});
						case 'random':
							return Cat.element.makeRandomData(null, this.codomain.expr, true, {idx:args, min:r.min[i], max:r.max[i]});
						case 'url':
							return Cat.element.makeUrlData(null, this.codomain.expr, true, r.data[args]);
						}
				}
				return null;
			},
			recurse(args)
			{
				this.updateRecursor();
				if (args in this.data)
					return this.data[args];
				if (Object.keys(this.data).length === 0)
				{
					if (args[0] === 0)
						return args[2];
					if (args[1] === 1)
						return CatFns.function.eval([args[1], args[2]]);
				}
				if (this.recursor !== null)
					return this.recursor.$(args);
				return null;
			},
			productAssembly(args)
			{
				return this.morphisms.map(m => m.$(args));
			},
			fold(args)
			{
				return args[1];
			},
			product(args)
			{
				return this.morphisms.map((m, i) => m.$(args[i]));
			},
			coproduct(args)
			{
				return [args[0], this.morphisms[args[0]].$(args[1])];
			},
			factor(args)
			{
				const r = this.factors.map(r => r.reduce((d, j) => j === -1 ? 0 : d = d[j], args));
				return r.length === 1 ? r[0] : r;
			},
			lambda(args)
			{
				return {$:function(b)
							{
								const those = this.that.factors.$([this.args, b]);
								return this.that.preCurry.$(those);
							},
							args,
							that:this
						};
			},
			eval(args)
			{
				if (typeof args[0] === 'string')
					args[0] = Cat.getDiagram().getMorphism(args[0]);
				return args[0].$([args[1]]);
			},
			initial(args)
			{},
			terminal(args)
			{
				return 0;
			},
			equals(args)
			{
				return args[0] === args[1];
			},
			and(args)
			{
				return args[0] && args[1];
			},
			or(args)
			{
				return args[0] || args[1];
			},
			false(args)
			{
				return false;
			},
			true(args)
			{
				return true;
			},
			not(args)
			{
				return !args;
			},
			null(args)
			{
				return null;
			},
			natAdd(args)
			{
				return args[0] + args[1];
			},
			natPred(args)
			{
				let val = args;
				return val > 0 ? --val : 0;
			},
			natSucc(args)
			{
				let val = args[0];
				return ++val;
			},
			natMult(args)
			{
				return args[0] * args[1];
			},
			natStrict(args)
			{
				return args[0] < args[1];
			},
			natOrder(args)
			{
				return args[0] <= args[1];
			},
			intAdd(args)
			{
				return args[0] + args[1];
			},
			intSub(args)
			{
				return args[0] - args[1];
			},
			intMult(args)
			{
				return args[0] * args[1];
			},
			intStrict(args)
			{
				return args[0] < args[1];
			},
			intOrder(args)
			{
				return args[0] <= args[1];
			},
			intModulo(args)
			{
				return args[0] % args[1];
			},
			floatAdd(args)
			{
				return args[0] + args[1];
			},
			floatSub(args)
			{
				return args[0] - args[1];
			},
			floatMult(args)
			{
				return args[0] * args[1];
			},
			floatDiv(args)
			{
				const a1 = args[1];
				if (a1 === 0)
					return [1, true];
				const r = args[0] / args[1];
				return Number.isNaN(r) ? [1, true] : [0, r];
			},
			floatStrict(args)
			{
				return args[0] < args[1];
			},
			floatOrder(args)
			{
				return args[0] <= args[1];
			},
			nat2int(args)
			{
				return args;
			},
			int2float(args)
			{
				return args;
			},
			strAppend(args) 
			{
				return args[0] + args[1];
			},
			strLength(args)
			{
				return args !== null ? args.length : null;
			},
			nat2str(args)
			{
				return args.toString();
			},
			int2str(args)
			{
				return args.toString();
			},
			omega2str(args)
			{
				return args.toString();
			},
			float2str(args)
			{
				return args.toString();
			},
			ttyOut(args)
			{
				document.getElementById('tty-out').innerHTML += args + "\n";
				return null;
			},
			identity(args)
			{
				return args;
			},
			diagonal(args)
			{
				return [args, args];
			},
			Ato3D(args)
			{
				CatFns.util.checkGeometry(this);
				const cube = new THREE.Mesh(this.shapeGeometry, new THREE.MeshLambertMaterial({color:Math.random() * 0xffffff}));
				cube.position.z = Cat.default.scale3D * args;
				CatFns.util.updateBBox(cube.position.z);
				Cat.display.threeD.scene.add(cube);
				return null;
			},
			AxAto3D(args)
			{
				CatFns.util.checkGeometry(this);
				const cube = new THREE.Mesh(this.shapeGeometry, new THREE.MeshLambertMaterial({color:Math.random() * 0xffffff}));
				cube.position.z = Cat.default.scale3D * args[0];
				cube.position.x = Cat.default.scale3D * args[1];
				CatFns.util.updateBBox(cube.position.z, cube.position.x);
				Cat.display.threeD.scene.add(cube);
				return null;
			},
			AxAxAto3D(args)
			{
				CatFns.util.checkGeometry(this);
				const cube = new THREE.Mesh(this.shapeGeometry, new THREE.MeshLambertMaterial({color:Math.random() * 0xffffff}));
				cube.position.x = Cat.default.scale3D * args[0];
				cube.position.y = Cat.default.scale3D * args[1];
				cube.position.z = Cat.default.scale3D * args[2];
				CatFns.util.updateBBox(cube.position.z, cube.position.x, cube.position.y);
				Cat.display.threeD.scene.add(cube);
				return null;
			},
			AxAxAx2toLine(args)
			{
				const geo = new THREE.Geometry();
				const from = args[0];
				const to = args[1];
				geo.vertices.push(new THREE.Vector3(from[0], from[1], from[2]));
				geo.vertices.push(new THREE.Vector3(to[0], to[1], to[2]));
				const material = new THREE.LineBasicMaterial({color:Math.random() * 0xffffff});
				const line = new THREE.Line(geo, material);
				Cat.display.threeD.scene.add(line);
				CatFns.util.updateBBox(from[0], from[1], from[2]);
				CatFns.util.updateBBox(to[0], to[1], to[2]);
				return null;
			},
			AxAxAToQuadraticBezierCurve3(args)
			{
				const from = args[0];
				const mid = args[1];
				const to = args[2];
				const curve = new THREE.QuadraticBezierCurve3( new THREE.Vector3(from[0], from[1], from[2]), new THREE.Vector3(mid[0], mid[1], mid[2]), new THREE.Vector3(to[0], to[1], to[2]));
				const points = curve.getPoints(10);
				const geo = new THREE.BufferGeometry().setFromPoints(points);
				const material = new THREE.LineBasicMaterial({color:Math.random() * 0xffffff});
				Cat.display.threeD.scene.add(new THREE.Line(geo, material));
				CatFns.util.updateBBox(from[0], from[1], from[2]);
				CatFns.util.updateBBox(mid[0], mid[1], mid[2]);
				CatFns.util.updateBBox(to[0], to[1], to[2]);
				return null;
			},
			unknown(args)
			{
			},
		},
		functor:
		{
			graph(dgrm, args)
			{
				return Cat.stringMorphism.graph(dgrm, args);
			},
		},
		transform:
		{
			identity(dgrm, obj)
			{
				return dgrm.hasMorphism(obj.name) ? dgrm.getMorphism(obj.name) :
					new Cat.morphism(dgrm.codomain, {name:obj.name, description:'Identity morphism', diagram:dgrm.name, domain:obj.name, codomain:obj.name, code:obj.code, function:'identity', html:'1', readonly:true});
			},
			diagonal(dgrm, obj)
			{
				const name = 'diagonal-'+obj.name;
				if (dgrm.hasMorphism(name))
					return dgrm.getMorphism(name)
				const code = `(${obj.code})*(${obj.code})`;
				const codename = Cat.element.codename(dgrm, this.domain.parseObject(code));
				if (!dgrm.hasObject(codename))
					dgrm.newObject({code, diagram:dgrm, html:obj.html + Cat.basetypes.operators.product.sym+obj.html});
				return new Cat.morphism(dgrm.codomain, {name, diagram:dgrm.name, domain:obj, codomain:codename, function:'diagonal', html:'&#x0394', description:`The diagonal morphism on the object ${obj.getText()}`});
			},
			fold(dgrm, obj)
			{
				const name = 'fold-'+obj.name;
				if (dgrm.hasMorphism(name))
					return dgrm.getMorphism(name)
				const code = obj.getFirstFactor().code;
				const codename = Cat.element.codename(dgrm, this.domain.parseObject(code));
				if (!dgrm.hasObject(codename))
					dgrm.newObject({code, diagram:dgrm, html:obj.html + Cat.basetypes.operators.product.sym+obj.html});
				return new Cat.morphism(dgrm.codomain, {name, diagram:dgrm.name, domain:obj, codomain:codename, function:'fold', html:'&nabla;', description:`The fold morphism on the object ${obj.getText()}`});
			},
			terminal(dgrm, obj)
			{
				const name = `${obj.name}-2-terminal`;
				if (dgrm.hasMorphism(name))
					return dgrm.getMorphism(name);
				return new Cat.morphism(dgrm.codomain, {name, diagram:dgrm.name, domain:obj, codomain:dgrm.getObject('One'), function:'terminal', html:'&#x2203!', description:`Unique morphism from ${obj.getText()} to the terminal object`});
			},
			apply(dgrm, obj)
			{
				if (!dgrm.canEvaluate(obj))
					throw `Cannot apply an evaluation to ${obj.getText()}.`;
				const name = `${obj.name}-2-eval`;
				if (dgrm.hasMorphism(name))
					return dgrm.getMorphism(name);
				const factors = dgrm.getProductFactors(obj);
				if (factors.length !== 2)
					throw `Not enough factors in object ${obj.getText()} for applying.`;
				const codomain = dgrm.getHomCodomain(factors[0]);
				return new Cat.morphism(dgrm.codomain, {name, diagram:dgrm.name, domain:obj, codomain, function:'eval', html:'e', description:`Evalution of morphisms in ${factors[0].getText()}`});
			},
			equals(dgrm, obj)
			{
				const name = `${obj.name}-equals`;
				if (dgrm.hasMorphism(name))
					return dgrm.getMorphism(name);
				return new Cat.morphism(dgrm.codomain, {name:name, description:`Test for equality on ${obj.name}`, diagram:dgrm.name, domain:obj, codomain:'Omega', function:'equals', html:'=', readonly:true});
			}
		},
		util:
		{
			checkGeometry(elt)
			{
				if (!('shapeGeometry' in elt))
					elt.shapeGeometry = new THREE.BoxBufferGeometry(Cat.default.scale3D, Cat.default.scale3D, Cat.default.scale3D);
			},
			updateBBox(x, y = 0, z = 0)
			{
				const min = Cat.display.threeD.bbox.min;
				const max = Cat.display.threeD.bbox.max;
				min.x = Math.min(min.x, x);
				max.x = Math.max(max.x, x);
				min.y = Math.min(min.y, y);
				max.y = Math.max(max.y, y);
				min.z = Math.min(min.z, z);
				max.z = Math.max(max.z, z);
			},
		},
	};

	if (typeof exports !== 'undefined')
	{
		exports.function =	CatFns.function;
		exports.functor =	CatFns.functor;
		exports.transform =	CatFns.transform;
		exports.util =		CatFns.util;
	}
	else if (typeof module !== 'undefined')
	{
		module.exports.function =	CatFns.function;
		module.exports.functor =	CatFns.functor;
		module.exports.transform =	CatFns.transform;
		module.exports.util =		CatFns.util;
	}
	else
	{
		window.CatFns = CatFns;
	}

})
.call(this);
