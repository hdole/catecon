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
			case 'loadEquality':
				loadEquality(args.diagram, args.item, args.leftLeg, args.rightLeg, args.equal);
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
}

function loadEquality(diagram, item, leftLeg, rightLeg, equal)
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
	if (leftSig === rightSig)
		return 1;
	const equs = getEquals(leftSig);
	if (equs.has(rightSig))
		return 1;		// equal
	const notEqu = notEquals.get(leftSig);
	if (notEqu && notEqu.has(rightSig))
		return 2;		// not equal
	return 0;		// unkown
}

function removeIdentities(leg)
{
	const nuLeg = leg.filter(s => !identities.has(s));
	if (nuLeg.length === 0)
		nuLeg.push(leg[0]);
	return nuLeg;
}

function scanLeg(left, leftSig, right, rightSig, scanned)		// recursive scanning of the left leg trying to match the rightSig
{
	const result = compareSigs(rightSig, leftSig);
	if (result === 0)		// unkonwn
	{
		const len = left.length;
		if (len > 1)
			for (let ndx=0; ndx < len; ++ndx)
			{
				let scanLength = Math.min(len -1, maxLegLength);
				scanLength = len - ndx < scanLength ? len - ndx : scanLength;
				for (let cnt=1; cnt <= scanLength; ++cnt)
				{
					const equal = checkLeg(left, leftSig, right, rightSig, ndx, cnt, scanned);
					if (equal > 0)
						return equal;
				}
			}
		return 0;		// unkonwn
	}
	return result;
}

function checkLeg(left, leftSig, right, rightSig, ndx, cnt, scanned)
{
	let equal = 0;
	const subLeg = left.slice(ndx, ndx + cnt);		// the subleg to replace
	const subSig = Sig(...subLeg);
	const equs = getEquals(subSig);		// get equivalents of the subleg
	let nuLeg = null;
	let nuSig = null;
	const legs = new Set();
	if (equs && equs.size > 1)		// try substituting sigs equal to the sub-leg
	{
		for (const equ of equs)
		{
			if (legs.has(equ))
				continue;
			legs.add(equ);
			const equalLegs = sig2legs.get(equ);
			for (let i=0; i < equalLegs.length; ++i)
			{
				const equLeg = equalLegs[i];
				if (Sig(...equLeg) === subSig)
					continue;
				nuLeg = left.slice(0, ndx);	// first part of leg
				nuLeg.push(...equLeg);
				if (ndx + cnt < left.length)			// add rest of original leg
					nuLeg.push(...left.slice(ndx + cnt, left.length));
				if (arrayEquals(left, nuLeg))
					continue;
				if (nuLeg.length > maxLegLength)
					continue;
				nuSig = Sig(...nuLeg);
				setEquals(left, nuLeg);
				if (nuSig === rightSig)
				{
					equal = 1;
					break;
				}
				if (equal === 0)
					equal = checkTrimmedLegs(nuLeg, right, scanned);
				if (equal > 0)
					break;
			}
		}
	}
	if (equal === 0 && sig2legs.has(subSig))		// try substituting shorter legs for the sub-leg and scanning that leg
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
				nuSig = Sig(...nuLeg);
				if (scanned.has(nuSig))
					continue;
				scanned.add(nuSig);
				setEquals(left, nuLeg);
				equal = rightSig === nuSig ? 1 : (equals.has(rightSig) && equals.get(rightSig).has(nuSig) ? 1 : 0);
				if (equal === 0)
					equal = scanLeg(nuLeg, nuSig, right, rightSig, scanned);
//				if (equal === 0)
//					equal = checkTrimmedLegs(nuLeg, right);
				if (equal > 0)
					break;
			}
		}
	}
	equal === 1 && loadEquivalences(null, left, nuLeg, true);		// TODO not equal?
	return equal;
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
	let min = Math.min(inLeft.length, inRight.length);
	let left = inLeft.slice();
	let right = inRight.slice();
	for (let i=0; i<min; ++i)
	{
		if (left[i] === right[i])
		{
			left.shift();
			right.shift();
		}
		else
			break;
	}
	min = Math.min(left.length, right.length);
	for (let i=0; i<min; ++i)
	{
		if (left[left.length -1] === right[right.length -1])
		{
			left.pop();
			right.pop();
		}
		else
			break;
	}
	return {left, right};
}

function checkTrimmedLegs(left, right, scanned)
{
	const trimmed = trimLegs(left, right);
	if (trimmed.left.length > 0 && trimmed.right.length > 0 && trimmed.left.length < left.length)
	{
		const chk = check(trimmed.left, trimmed.right, scanned);
		if (chk > 0)
		{
			setEquals(left, right);
			return chk;
		}
	}
	else		// check for identities
	{
		if (trimmed.left.length === 0)
			return identities.has(Sig(...trimmed.right)) ? 1 : 0;
		else if (trimmed.right.length === 0)
			return identities.has(Sig(...trimmed.left)) ? 1 : 0;
	}
	return 0;		// unknown
}

function removeIds(lLeg, rLeg)
{
	const left = lLeg.length > 1 ? removeIdentities(lLeg) : lLeg;
	const right = rLeg.length > 1 ? removeIdentities(rLeg) : rLeg;
	return {left, right};
}

function check(left, right, scanned)
{
	const leftSig = Sig(...left);
	const rightSig = Sig(...right);
	let equal = compareSigs(leftSig, rightSig);
	if (equal === 0)
	{
		equal = scanLeg(left, leftSig, right, rightSig, scanned);
		if (equal === 0)
			equal = scanLeg(right, rightSig, left, leftSig, scanned);
	}
	if (equal === 1)		// TODO not equals?
		setEquals(left, right);
	return equal;
}

function checkEquivalence(diagram, lLeg, rLeg)		// not recursive
{
	if (spoiled)		// spoilage comes from editting
		loadDiagrams(contextDiagrams);
	let equal = compareSigs(Sig(...lLeg), Sig(...rLeg));
	if (equal === 0)
	{
		const {left, right} = removeIds(lLeg, rLeg);
		const leftSig = Sig(...left);
		const rightSig = Sig(...right);
		equal = compareSigs(leftSig, rightSig);
		if (equal === 0)
		{
			const scanned = new Set();
			equal = scanLeg(left, leftSig, right, rightSig, scanned);
			scanned.clear();
			if (equal === 0)
				equal = scanLeg(right, rightSig, left, leftSig, scanned);
			if (equal === 0)
				equal = checkTrimmedLegs(left, right, scanned);
		}
		if (equal === 1)
			setEquals(left, right);
	}
	else if (equal === 1)
		setEquals(lLeg, rLeg);
	const item = getItem(lLeg, rLeg);
	return {diagram, equal, item};
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
