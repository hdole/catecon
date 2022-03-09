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
				val = checkEquivalence(args.diagram, args.leftLeg, args.rightLeg);
				val.cell = args.cell;
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
					identities:			identities.size,
					maxLegLength,
					equals:				equals.size,
					notEquals:			notEquals.size,
					sigs:				sig2legs.size,
					contextDiagrams:	contextDiagrams.length,
					totalDiagrams:		diagramItems.size,
					cells:				cellToItem.size,
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
		console.error('equator exception', x);
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
	if (lLeg.length > leftLeg.length)
		setEquals(lLeg, leftLeg);
	const rightLeg = rLeg.length > 1 ? removeIdentities(rLeg) : rLeg;
	if (rLeg.length > rightLeg.length)
		setEquals(rLeg, rightLeg);
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

//function scanLeg(leg, sig, scanned, sigs)		// recursive scanning of the leg trying to match the sig
function scanLeg(left, leftSig, right, rightSig, scanned)		// recursive scanning of the left leg trying to match the rightSig
{
	const result = compareSigs(rightSig, Sig(...left));
	if (result === 'unknown')
	{
		const len = left.length;
		if (len > 1)
			for (let ndx=0; ndx < len; ++ndx)
			{
				const maxCnt = Math.min(maxLegLength, ndx > 0 ? len - ndx : 1);
				for (let cnt=1; cnt <= maxCnt; ++cnt)
					if (checkLeg(left, leftSig, right, rightSig, ndx, cnt, scanned))
						return true;
			}
		return false;
	}
	return result;
}

function checkLeg(left, leftSig, right, rightSig, ndx, cnt, scanned)
{
	let isEqual = false;
	const subLeg = left.slice(ndx, ndx + cnt);		// the subleg to replace
	const subSig = Sig(...subLeg);
	const equs = getEquals(subSig);		// get equivalents of the subleg
	let nuLeg = null;
	let nuSig = null;
	if (equs && equs.size > 1)		// try substituting sigs equal to the sub-leg
	{
		for (const equ of equs)
		{
			if (scanned.has(equ))
				continue;
			nuLeg = left.slice(0, ndx);	// first part of leg
			const equalLegs = sig2legs.get(equ);
			for (let i=0; i < equalLegs.length; ++i)
			{
				const equLeg = equalLegs[i];
				if (Sig(...equLeg) === subSig)
					continue;
				nuLeg.push(...equLeg);
				if (ndx + cnt < left.length)			// add rest of original leg
					nuLeg.push(...left.slice(ndx + cnt, left.length));
				if (arrayEquals(left, nuLeg))
					continue;
				nuSig = Sig(...nuLeg);
				if (nuSig === rightSig)
				{
					isEqual = true;
					break;
				}
				if (!isEqual)
				{
					isEqual = checkTrimmedLegs(nuLeg, right);
					if (isEqual)
						break;
				}
			}
		}
	}
	if (!isEqual && sig2legs.has(subSig) && !scanned.has(subSig))		// try substituting shorter legs for the sub-leg and scanning that leg
	{
		const subSet = sig2legs.get(subSig);
		for (const altLeg of subSet)
		{
			if (altLeg.length < subLeg.length)
			{
				nuLeg = left.slice(0, ndx);	// first part of leg
				nuLeg.push(...altLeg);				// push alternate leg
				if (ndx + cnt < left.length)			// add rest of original leg
					nuLeg.push(...left.slice(ndx + cnt, left.length));
				nuSig = Sig(nuLeg);
				isEqual = rightSig === nuSig ? true : equals.has(rightSig) && equals.get(rightSig).has(nuSig);
				if (!isEqual)
					isEqual = scanLeg(nuLeg, nuSig, right, rightSig, scanned);
				if (!isEqual)
					isEqual = checkTrimmedLegs(nuLeg, right);
			}
		}
	}
	isEqual && loadEquivalences(null, left, nuLeg, true);
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
		if (inLeft.length === i + 1 || inRight.length === i + 1)
		{
			left = inLeft.slice(i);
			right = inRight.slice(i);
			break;
		}
		if (inLeft[i] === inRight[i])
			continue;
		left = inLeft.slice(i);
		right = inRight.slice(i);
		break;
	}
	min = Math.min(left.length, right.length);
	for (let i=0; i<min; ++i)
	{
		if (inLeft.length === i + 1 || inRight.length === i + 1)
		{
			left = left.slice(0, left.length - i);
			right = right.slice(0, right.length - i);
			break;
		}
		if (left[left.length -1 - i] === right[right.length -1 - i])
			continue;
		left = left.slice(0, left.length - i);
		right = right.slice(0, right.length - i);
		break;
	}
	return {left, right};
}

function checkTrimmedLegs(left, right)
{
	const trimmed = trimLegs(left, right);
	if (trimmed.left.length < left.length)
	{
		const chk =check(trimmed.left, trimmed.right);
		if (chk === 'unknown')
			return false;
		return chk;
	}
	return false;
}

function removeIds(lLeg, rLeg)
{
	const left = lLeg.length > 1 ? removeIdentities(lLeg) : lLeg;
	const right = rLeg.length > 1 ? removeIdentities(rLeg) : rLeg;
	return {left, right};
}

function check(left, right)
{
	const leftSig = Sig(...left);
	const rightSig = Sig(...right);
	let isEqual = compareSigs(leftSig, rightSig);
	const scanned = new Set();
	if (typeof isEqual === 'string')
	{
		let equal = scanLeg(left, leftSig, right, rightSig, scanned);
		if (!equal)
			equal = scanLeg(right, rightSig, left, leftSig, scanned);
		isEqual = equal ? true : 'unknown';
	}
	if (isEqual === true)
		setEquals(left, right);
	return isEqual;
}

// cell: tracking token for client; typically the sig of a cell
function checkEquivalence(diagram, lLeg, rLeg)		// not recursive
{
	if (spoiled)		// spoilage comes from editting
		loadDiagrams(contextDiagrams);
	const {left, right} = removeIds(lLeg, rLeg);
	const leftSig = Sig(...left);
	const rightSig = Sig(...right);
	let isEqual = compareSigs(leftSig, rightSig);
	const scanned = new Set();
	if (typeof isEqual === 'string')
	{
		let equal = scanLeg(left, leftSig, right, rightSig, scanned);
		if (equal === false)
			equal = scanLeg(right, rightSig, left, leftSig, scanned);
		if (equal === false)
			equal = checkTrimmedLegs(left, right);
//		isEqual = equal ? true : 'unknown';
		isEqual = typeof equal === 'string' ? equal : equal ? true : 'unknown';
	}
	const item = getItem(lLeg, rLeg);
	if (isEqual === true)
		setEquals(left, right);
	return {diagram, isEqual, item};
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
