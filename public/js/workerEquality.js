// (C) 2000-2022 Harry Dole
// Catecon equality worker

const sig2legs = new Map();		// sig to the list of pairs [leg, item]
const equals = new Map();		// sig maps to a set of sigs that are equal to each other
const notEquals = new Map();		// sig maps to a set of sigs that are not equal to each other
const items = new Map();		// equivalences loaded by the client can be tracked by an item; typically the name of the element
const identities = new Set();	// sigs of identities
const cellToItem = new Map();	// cell sig to item
let maxLegLength = 0;			// keep track of this since no point substituting legs bigger than our biggest leg
let spoiled = false;			// gets spoiled by editting deleting something
let diagramItems = new Map();	// tracks which items belong to which diagram
let contextDiagrams = [];		// the diagrams that have been loaded so far

onmessage = e =>
{
	const start = Date.now();
	const args = e.data;
	try
	{
		const command = args.command;
		let val = {};
		let item = null;
		switch(command)
		{
			case 'start':
				importScripts((typeof exports === 'object' ? args.url : '') + '/js/sjcl.js');
				break;
			case 'LoadIdentity':
				loadIdentity(args.diagram, args.item, args.signature);
				break;
			case 'LoadItem':
				loadItem(args.diagram, args.item, args.leftLeg, args.rightLeg, args.equal);
				val.item = args.item;
				break;
			case 'CheckEquivalence':
				val = checkEquivalence(args.diagram, args.cell, args.leftLeg, args.rightLeg);
				break;
			case 'RemoveEquivalences':
				removeEquivalences(args.diagram, args.items);
				break;
			case 'LoadDiagrams':
				console.log('equality load diagrams', args.diagrams);
				loadDiagrams(args.diagrams);
				break;
			case 'Info':
				val =
				{
					totalItems:			items.size,
					maxLegLength,
					equals:				equals.size,
					notEquals:			notEquals.size,
					sigs:				sig2legs.size,
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
		console.error('workerEquality exception', x);
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

function arrayEquals(a, b)
{
	if (a === b)
		return true;
	if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
		return false;
	return a.reduce((r, suba, i) => r && arrayEquals(suba, b[i]), true);
}

function loadSigLeg(sig, leg)
{
	!sig2legs.has(sig) && sig2legs.set(sig, []);
	const equs = sig2legs.get(sig);
	for (let i=0; i<equs.length; ++i)
		if (arrayEquals(equs[i], leg))
			return;
	equs.push(leg);
}

function loadIdentity(diagram, item, sig)
{
	identities.add(sig);
}

function getEquals(sig)
{
	if (equals.has(sig))
		return equals.get(sig);
	const sigs = new Set();
	equals.set(sig, sigs);
	return sigs;
}

function setEquals(leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	const leftSigs = getEquals(leftSig);
	const rightSigs = getEquals(rightSig);
	leftSigs.add(rightSig);
	rightSigs.forEach(s => leftSigs.add(s));
	leftSigs.add(leftSig);
	leftSigs.add(rightSig);
	equals.set(rightSig, leftSigs);	// since equal set is same
	loadSigLeg(leftSig, leftLeg);
	loadSigLeg(leftSig, rightLeg);
	loadSigLeg(rightSig, rightLeg);
	loadSigLeg(rightSig, leftLeg);
}

function loadEquivalences(diagram, lLeg, rLeg, equal)
{
	const leftLeg = lLeg.length > 1 ? removeIdentities(lLeg) : lLeg;
	const rightLeg = rLeg.length > 1 ? removeIdentities(rLeg) : rLeg;
	maxLegLength = Math.max(maxLegLength, leftLeg.length, rightLeg.length);
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	if (equal)
		setEquals(leftLeg, rightLeg);
	else
	{
		const leftSigs = notEquals.has(leftSig) ? notEquals.get(leftSig) : new Set();
		const rightSigs = notEquals.has(rightSig) ? notEquals.get(rightSig) : new Set();
		leftSigs.add(rightSig);
		rightSigs.add(leftSig);
		notEquals.set(leftSig, leftSigs);
		notEquals.set(rightSig, rightSigs);
	}
	return true;
}

function loadItem(diagram, item, leftLeg, rightLeg, equal)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	!items.has(item) && items.set(item, new Map());
	const cellSig = Sig(leftSig, rightSig);
	items.get(item).set(cellSig, [leftLeg, rightLeg, equal]);
	!diagramItems.has(diagram) && diagramItems.set(diagram, new Set());
	diagramItems.get(diagram).add(item);
	loadEquivalences(diagram, leftLeg, rightLeg, equal);
	cellToItem.set(cellSig, item);
}

function compareSigs(leftSig, rightSig)
{
	const equs = getEquals(leftSig);
	if (equs.has(rightSig))
		return true;
	const notEqu = notEquals.get(leftSig);
	if (notEqu && notEqu.has(rightSig))
		return false;
	return 'unknown';
}

function removeIdentities(leg)
{
	return leg.filter(s => !identities.has(s));
}

function scanLeg(leg, sig, scanned, sigs)		// recursive scanning of the leg trying to match the sig
{
	const result = compareSigs(sig, Sig(...leg));
	if (result === 'unknown')
	{
		const len = leg.length;
		if (len > 1)
			for (let ndx=0; ndx < len; ++ndx)
			{
				const maxCnt = Math.min(maxLegLength, ndx > 0 ? len - ndx : 1);
				for (let cnt=1; cnt <= maxCnt; ++cnt)
					if (checkLeg(leg, ndx, cnt, sig, scanned, sigs))
						return true;
			}
		return false;
	}
	return result;
}

function checkLeg(leg, ndx, cnt, sig, scanned, sigs)
{
	let isEqual = false;
	const subLeg = leg.slice(ndx, ndx + cnt);
	const subSig = Sig(...subLeg);
	const equs = getEquals(subSig);
	if (equs && equs.size > 1)		// try substituting sigs equal to the sub-leg
	{
		for (const equ of equs)
		{
			if (scanned.has(equ) || equ === subSig)
				continue;
			const nuLeg = leg.slice(0, ndx);	// first part of leg
			const equalLegs = sig2legs.get(equ);
			for (let i=0; i < equalLegs.length; ++i)
			{
				const equLeg = equalLegs[i];
				if (Sig(...equLeg) === equ)
					continue;
				nuLeg.push(...equLeg);
				if (ndx + cnt < leg.length)			// add rest of original leg
					nuLeg.push(...leg.slice(ndx + cnt, leg.length));
				const nuLegSig = Sig(...nuLeg);
				if (sigs.has(nuLegSig))
					return true;
				sigs.add(nuLegSig);
				if (nuLegSig === sig)
					return true;
			}
		}
	}
	if (sig2legs.has(subSig) && !scanned.has(subSig))		// try substituting shorter legs for the sub-leg and scanning that leg
	{
		const subSet = sig2legs.get(subSig);
		for (const altLeg of subSet)
		{
			if (altLeg.length < subLeg.length)
			{
				const nuLeg = leg.slice(0, ndx);	// first part of leg
				nuLeg.push(...altLeg);				// push alternate leg
				if (ndx + cnt < leg.length)			// add rest of original leg
					nuLeg.push(...leg.slice(ndx + cnt, leg.length));
				const nuSig = Sig(nuLeg);
				isEqual = sig === nuSig ? true : equals.has(sig) && equals.get(sig).has(nuSig);
				if (!isEqual)
					isEqual = scanLeg(nuLeg, sig, scanned, sigs);
				if (isEqual)
				{
					loadEquivalences(null, leg, nuLeg, true);
					sigs.add(nuSig);
				}
			}
		}
	}
	return isEqual;
}

function loadDiagrams(diagrams)
{
	contextDiagrams = diagrams;
	maxLegLength = 0;
	sig2legs.clear();
	equals.clear();
	diagrams.map(diagram => diagramItems.has(diagram) && diagramItems.get(diagram).forEach(item => items.get(item).forEach(equ => loadEquivalences(diagram, equ[0], equ[1], equ[2]))));
	spoiled = false;
}

function getItem(leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	let item = cellToItem.get(Sig(leftSig, rightSig));
	if (!item)
		item = cellToItem.get(Sig(rightSig, leftSig));
	return item ? item : null;
}

function trimLegs(inLeft, inRight)
{
	if (inLeft.length <= 1 || inRight.length <= 1)
		return {left:inLeft, right:inRight};
	let min = Math.min(inLeft.length, inRight.length);
	let left = null;
	let right = null;
	for (let i=0; i<min; ++i)
	{
		if (inLeft[i] === inRight[i])
			continue;
		left = inLeft.slice(i);
		right = inRight.slice(i);
		break;
	}
	min = Math.min(left.length, right.length);
	for (let i=0; i<min; ++i)
	{
		if (left[left.length -1 - i] === right[right.length -1 - i])
			continue;
		left = left.slice(0, left.length - i);
		right = right.slice(0, right.length - i);
		break;
	}
	return {left, right};
}

// cell: tracking token for client; typically the sig of a cell
function checkEquivalence(diagram, cell, lLeg, rLeg)
{
	if (spoiled)		// spoilage comes from editting
		loadDiagrams(contextDiagrams);
	const leftIdless = lLeg.length > 1 ? removeIdentities(lLeg) : lLeg;
	const rightIdless = rLeg.length > 1 ? removeIdentities(rLeg) : rLeg;
	const {left, right} = trimLegs(leftIdless, rightIdless);
	const leftSig = Sig(...left);
	const rightSig = Sig(...right);
	let isEqual = compareSigs(leftSig, rightSig);
	const scanned = new Set();
	if (typeof isEqual === 'string')
	{
		const sigs = new Set();
		sigs.add(leftSig);
		let equal = scanLeg(left, rightSig, scanned, sigs);
		if (!equal)
		{
			sigs.clear();
			sigs.add(rightSig);
			equal = scanLeg(right, leftSig, scanned, sigs);
		}
		isEqual = equal ? true : 'unknown';
	}
	const item = getItem(lLeg, rLeg);
	if (isEqual === true)
		setEquals(left, right);
	return {diagram, cell, isEqual, item};
}

function removeEquivalences(diagram, delItems)		// when deletion occurs due to editting
{
	const myItems = diagramItems.get(diagram);
	myItems && delItems.map(item =>
	{
		items.delete(item);
		myItems.delete(item);
	});
	spoiled = true;
}
