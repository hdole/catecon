// (C) 2020 Harry Dole
// Catecon equality worker

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

function Sig(...elts)
{
	if (elts.length === 0)
		throw 'no info';
	else if (elts.length === 1)
		return elts[0];
	return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(elts.join()));
}

function LoadSigLeg(sig, leg)
{
	if (!sig2equivalences.has(sig))
		sig2equivalences.set(sig, []);
	const equs = sig2equivalences.get(sig);
	equs.push(leg);
}

function LoadEquivalence(item, leftLeg, rightLeg)
{
	maxLegLength = Math.max(maxLegLength, leftLeg.length, rightLeg.length)
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	if (item)
	{
		if (!items.has(item))
			items.set(item, new Map);
		const itemEqus = items.get(item);
		itemEqus.set(Sig(leftSig, rightSig), [leftLeg, rightLeg]);
	}
	const leftSigs = equals.has(leftSig) ? equals.get(leftSig) : new Set;
	const rightSigs = equals.has(rightSig) ? equals.get(rightSig) : new Set;
	leftSigs.add(rightSig);
	rightSigs.forEach(function(s) { leftSigs.add(s); });
	equals.set(leftSig, leftSigs);
	equals.set(rightSig, leftSigs);	// since equal set is same
	LoadSigLeg(leftSig, rightLeg);
	if (leftSig !== rightSig)
		LoadSigLeg(rightSig, leftLeg);
	return true;
}

function CompareSigs(leftSig, rightSig)
{
	const equ = equals.get(leftSig);
	return equ ? equ.has(rightSig) : false;
}

function TryAlternateLeg(leg, ndx, cnt, sig, subLeg, altLeg)
{
	let isEqual = false;
	if (altLeg.length < subLeg.length)
	{
		const nuLeg = leg.slice(0, ndx);
		nuLeg.push(...altLeg);
		if (ndx + cnt < leg.length)
			nuLeg.push(...leg.slice(ndx + cnt, leg.length));
		const nuSig = Sig(...nuLeg);
		if (sig === nuSig)
			isEqual = true;
		else
		{
			const sigEqus = equals.get(sig);
			const nuSigEqus = equals.get(nuSig);
			if ((sigEqus && sigEqus.has(nuSig)) || (nuSigEqus && nuSigEqus.has(sig)))
				isEqual = true;
		}
		if (!isEqual)
			isEqual = ScanLeg(nuLeg, sig);
		if (isEqual)
			LoadEquivalence(null, leg, nuLeg);
	}
	return isEqual;
}

function CheckLeg(leg, ndx, cnt, sig)
{
	let isEqual = false;
	const subLeg = leg.slice(ndx, ndx + cnt);
	const subSig = Sig(...subLeg);
	if (sig2equivalences.has(subSig))
	{
		const subSet = sig2equivalences.get(subSig);
		for (const altLeg of subSet)
			if (isEqual = TryAlternateLeg(leg, ndx, cnt, sig, subLeg, altLeg))
				break;
	}
	return isEqual;
}

function ScanLeg(leg, sig)
{
	const len = leg.length;
	if (len > 2)
		for (let ndx=0; ndx < len-1; ++ndx)
			for (let cnt=2; cnt <= Math.min(maxLegLength, len - ndx); ++cnt)
				if (CheckLeg(leg, ndx, cnt, sig))
					return true;
	return false;
}

function CheckEquivalence(diagram, cell, leftLeg, rightLeg)
{
	if (spoiled)
		Reload();
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	let isEqual = false;
	isEqual = CompareSigs(leftSig, rightSig);
	if (!isEqual)
	{
		isEqual = ScanLeg(leftLeg, rightSig);
		if (!isEqual)
			isEqual = ScanLeg(rightLeg, leftSig);
	}
	return {diagram, cell, isEqual};
}

function RemoveEquivalences(delItems)
{
	delItems.map(item => items.delete(item));
	spoiled = true;
}

function Reload()
{
	maxLegLength = 0;
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
