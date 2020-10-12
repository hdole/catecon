// (C) 2020 Harry Dole
// Catecon equality worker

const sig2equivalences = new Map();		// sig to the list of pairs [leg, item]
const equals = new Map();
const items = new Map();
let maxLegLength = 0;
let spoiled = false;
let diagramItems = new Map();
let contextDiagrams = [];

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
				importScripts(args.url + '/js/sjcl.js');
				break;
			case 'LoadEquivalences':
				LoadEquivalences(args.diagram, args.item, args.leftLeg, args.rightLeg);
				break;
			case 'CheckEquivalence':
				val = CheckEquivalence(args.diagram, args.cell, args.leftLeg, args.rightLeg);
				break;
			case 'RemoveEquivalences':
				RemoveEquivalences(args.diagram, args.items);
				break;
			case 'Load':
				Load(args.diagrams);
				break;
			case 'Info':
				val =
				{
					totalItems:			items.size,
					maxLegLength,
					equals:				equals.size,
					sigs:				sig2equivalences.size,
					contextDiagrams:	contextDiagrams.length,
					totalDiagrams:		diagramItems.size,
				};
				break;
		}
		val.command = command;
		val.delta = Date.now() - start;
		postMessage(val);
	}
	catch(x)
	{
		postMessage({command:'exception', value:x});
		console.error('workerEQuality exception', x);
	}
};

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
	!sig2equivalences.has(sig) && sig2equivalences.set(sig, []);
	const equs = sig2equivalences.get(sig);
	equs.push(leg);
}

function LoadEquivalences(diagram, item, leftLeg, rightLeg)
{
	maxLegLength = Math.max(maxLegLength, leftLeg.length, rightLeg.length);
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	if (item)
	{
		!items.has(item) && items.set(item, new Map());
		items.get(item).set(Sig(leftSig, rightSig), [leftLeg, rightLeg]);
		!diagramItems.has(diagram) && diagramItems.set(diagram, new Set());
		diagramItems.get(diagram).add(item);
	}
	const leftSigs = equals.has(leftSig) ? equals.get(leftSig) : new Set();
	const rightSigs = equals.has(rightSig) ? equals.get(rightSig) : new Set();
	leftSigs.add(rightSig);
	rightSigs.forEach(function(s) { leftSigs.add(s); });
	equals.set(leftSig, leftSigs);
	equals.set(rightSig, leftSigs);	// since equal set is same
	LoadSigLeg(leftSig, rightLeg);
	leftSig !== rightSig && LoadSigLeg(rightSig, leftLeg);
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
			LoadEquivalences(null, null, leg, nuLeg);
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
			if ((isEqual = TryAlternateLeg(leg, ndx, cnt, sig, subLeg, altLeg)))
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
		Load(contextDiagrams);
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
	isEqual && !CompareSigs(leftSig, rightSig) && LoadEquivalences(diagram, null, leftLeg, rightLeg);
	return {diagram, cell, isEqual};
}

function RemoveEquivalences(diagram, delItems)
{
	const myItems = diagramItems.get(diagram);
	myItems && delItems.map(item =>
	{
		items.delete(item);
		myItems.delete(item);
	});
	spoiled = true;
}

function Load(diagrams)
{
	contextDiagrams = diagrams;
	maxLegLength = 0;
	sig2equivalences.clear();
	equals.clear();
	diagrams.map(diagram =>
	{
		diagramItems.has(diagram) && diagramItems.get(diagram).forEach(function(item)
		{
			items.get(item).forEach(function(equ)
			{
				LoadEquivalences(diagram, item, equ[0], equ[1]);
			});
		});
	});
	spoiled = false;
}
