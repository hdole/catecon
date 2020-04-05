// (C) 2020 Harry Dole
// Catecon equality worker

const equivalences = new Set;
const sig2equivalences = new Map;		// sig to the list of pairs [leg, item]
const equals = new Map;
const items = new Map;
let maxLegLength = 0;
let spoiled = false;

onmessage = function(e)
{
	const start = Date.now();
	const args = e.data;
	try
	{
		const command = args.command;
		let val = {};
		switch(command)
		{
			case 'start':
				let url = args.url;
				const index = url.indexOf('index.html');
				if (index !== -1)
					url = url.substring(0, index);
				importScripts(url + '/js/sjcl.js');
				break;
			case 'LoadEquivalence':
				LoadEquivalence(args.item, args.leftLeg, args.rightLeg);
				break;
			case 'CheckEquivalence':
				val = CheckEquivalence(args.diagram, args.cell, args.leftLeg, args.rightLeg);
				break;
			case 'RemoveEquivalences':
				RemoveEquivalences(args.items);
				break;
			case 'Reload':
				Reload();
				break;
			case 'Info':
				val =
				{
					items:			items.size,
					maxLegLength,
					equals:			equals.size,
					equivalences:	equivalences.size,
					sigs:			sig2equivalences.size,
				};
				break;
		}
		val.command = command;
		val.delta = Date.now() - start;
		postMessage(val);
	}
	catch(e)
	{
		postMessage({command:'exception', value:e});
	}
}

const Sig = function(...elts)
{
	if (elts.length === 0)
		throw 'no info';
	else if (elts.length === 1)
		return elts[0];
	return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(elts.join()));
}

const LoadEquivalence = function(item, leftLeg, rightLeg)
{
	maxLegLength = Math.max(maxLegLength, leftLeg.length, rightLeg.length)
	if (!items.has(item))
		items.set(item, new Map);
	const itemEqus = items.get(item);
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	itemEqus.set(Sig(leftSig, rightSig), [leftLeg, rightLeg]);
	const leftSigs = equals.has(leftSig) ? equals.get(leftSig) : new Set;
	const rightSigs = equals.has(rightSig) ? equals.get(rightSig) : new Set;
	leftSigs.add(rightSig);
	rightSigs.forEach(function(s) { leftSigs.add(s); });
	equals.set(leftSig, leftSigs);
	equals.set(rightSig, leftSigs);	// since equal set is same
	const fn = function(sig, leg, item)
	{
		if (!sig2equivalences.has(sig))
			sig2equivalences.set(sig, []);
		const equs = sig2equivalences.get(sig);
		equs.push([leg, item]);
	}
	fn(leftSig, rightLeg, item);
	if (leftSig !== rightSig)
		fn(rightSig, leftLeg, item);
	equivalences.add([item, leftLeg, rightLeg]);
	return null;
}

function CheckEquivalence(diagram, cell, leftLeg, rightLeg)
{
	if (spoiled)
		Reload();
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	let item = null;
	let isEqual = false;
	const fn = function(leg, leftSig, rightSig)
	{
		const equ = equals.get(leftSig);
		if (equ && equ.has(rightSig))
		{
			isEqual = true;
			const equs = sig2equivalences.get(rightSig);	// item search
			if (equs)
				for (let i=0; i< equs.length; ++i)
				{
					const equ = equs[i];
					const sig = Sig(...equ[0]);
					if (sig === leftSig)
					{
						item = equ[1];
						break;
					}
				}
		}
		return item;
	};
	item = fn(leftLeg, leftSig, rightSig);
	if (!item)
	{
		const fn = function(leg, sig)
		{
			const len = leg.length;
			if (len > 2)
				for (let ndx=0; ndx < len-1; ++ndx)
					for (let cnt=2; cnt <= Math.min(maxLegLength, len - ndx); ++cnt)
					{
						item = CheckLeg(leg, ndx, cnt, sig);
						if (item)
						{
							isEqual = true;
							return item;
						}
					}
			return null;
		};
		item = fn(leftLeg, rightSig);
		if (!item)
			item = fn(rightLeg, leftSig);
	}
	return {diagram, cell, isEqual, item};
}

function CheckLeg(leg, ndx, cnt, sig)
{
	let item = null;
	const subLeg = leg.slice(ndx, ndx + cnt);
	const subSig = Sig(...subLeg);
	if (sig2equivalences.has(subSig))
	{
		const subSet = sig2equivalences.get(subSig);
		subSet.forEach(function(s)
		{
			const altLeg = s[0];
			if (altLeg.length < subLeg.length)
			{
				const nuLeg = leg.slice(0, ndx);
				nuLeg.push(...altLeg);
				if (ndx + cnt < leg.length)
					nuLeg.push(...leg.slice(ndx + cnt, leg.length));
				const nuSig = Sig(...nuLeg);
				if (sig === nuSig)
					item = s[1];
				else
				{
					const sigEqus = equals.get(sig);
					const nuSigEqus = equals.get(nuSig);
					if ((sigEqus && sigEqus.has(nuSig)) || (nuSigEqus && nuSigEqus.has(sig)))
						item = s[1];
				}
				if (item)
					LoadEquivalence(item, leg, nuLeg);
			}
		});
	}
	return item;
}

function RemoveEquivalences(delItems)
{
	delItems.map(item => items.delete(item));
	spoiled = true;
}

function Reload()
{
	maxLegLength = 0;
	equivalences.clear();
	sig2equivalences.clear();
	equals.clear();
	items.forEach(function(equs, item)
	{
		equs.forEach(function(equ)
		{
			LoadEquivalence(item, equ[0], equ[1]);
		});
	});
	spoiled = false;
console.log('Reloaded!');
}
