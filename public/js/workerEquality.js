// (C) 2021 Harry Dole
// Catecon equality worker

const sig2legs = new Map();		// sig to the list of pairs [leg, item]
const equals = new Map();		// sig maps to a set of sigs that are equal to each other
const notEquals = new Map();		// sig maps to a set of sigs that are not equal to each other
const items = new Map();		// equivalences loaded by the client can be tracked by an item; typically the name of the element
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
		switch(command)
		{
			case 'start':
				importScripts((typeof exports === 'object' ? args.url : '') + '/js/sjcl.js');
				break;
			case 'LoadItem':
				loadItem(args.diagram, args.item, args.leftLeg, args.rightLeg, args.equal);
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

function loadSigLeg(sig, leg)
{
	!sig2legs.has(sig) && sig2legs.set(sig, []);
	const equs = sig2legs.get(sig);
	equs.push(leg);
}

function loadItem(diagram, item, leftLeg, rightLeg, equal)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	!items.has(item) && items.set(item, new Map());
	items.get(item).set(Sig(leftSig, rightSig), [leftLeg, rightLeg, equal]);
	!diagramItems.has(diagram) && diagramItems.set(diagram, new Set());
	diagramItems.get(diagram).add(item);
	loadEquivalences(diagram, item, leftLeg, rightLeg, equal);
}

function loadEquivalences(diagram, item, leftLeg, rightLeg, equal)
{
	maxLegLength = Math.max(maxLegLength, leftLeg.length, rightLeg.length);
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	if (equal)
	{
		const leftSigs = equals.has(leftSig) ? equals.get(leftSig) : new Set();
		const rightSigs = equals.has(rightSig) ? equals.get(rightSig) : new Set();
		leftSigs.add(rightSig);
		rightSigs.forEach(s => leftSigs.add(s));
		equals.set(leftSig, leftSigs);
		equals.set(rightSig, leftSigs);	// since equal set is same
		loadSigLeg(leftSig, rightLeg);
		leftSig !== rightSig && loadSigLeg(rightSig, leftLeg);
	}
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

function compareSigs(leftSig, rightSig)
{
	const equ = equals.get(leftSig);
	if (equ && equ.has(rightSig))
		return true;
	const notEqu = notEquals.get(leftSig);
	if (notEqu && notEqu.has(rightSig))
		return false;
	return 'unknown';
}

function scanLeg(leg, sig)		// recursive scanning of the leg trying to match the sig
{
	const len = leg.length;
	if (len > 2)
		for (let ndx=0; ndx < len-1; ++ndx)
			for (let cnt=2; cnt <= Math.min(maxLegLength, len - ndx); ++cnt)
				if (checkLeg(leg, ndx, cnt, sig))
					return true;
	return false;
}

function checkLeg(leg, ndx, cnt, sig)
{
	let isEqual = false;
	const subLeg = leg.slice(ndx, ndx + cnt);
	const subSig = Sig(...subLeg);
	const equs = equals.get(subSig);
	if (equs)		// try substituting sigs equal to the sub-leg
	{
		for (const equ of equs)
		{
			const nuLeg = leg.slice(0, ndx);	// first part of leg
			nuLeg.push(equ)						// replace sub-leg with sig
			if (ndx + cnt < leg.length)			// add rest of original leg
				nuLeg.push(...leg.slice(ndx + cnt, leg.length));
			if (Sig(...nuLeg) === sig)
				return true;
		}
	}
	if (sig2legs.has(subSig))		// try substituting shorter legs for the sub-leg and scanning that leg
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
					isEqual = scanLeg(nuLeg, sig);
				if (isEqual)
					loadEquivalences(null, null, leg, nuLeg, true);
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
	diagrams.map(diagram => diagramItems.has(diagram) && diagramItems.get(diagram).forEach(item => items.get(item).forEach(equ => loadEquivalences(diagram, item, equ[0], equ[1], equ[2]))));
	console.log({spoiled});
	spoiled = false;
}

// cell: tracking token for client; typically the sig of a cell
function checkEquivalence(diagram, cell, leftLeg, rightLeg)
{
	if (spoiled)		// spoilage comes from editting
		loadDiagrams(contextDiagrams);
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	let isEqual = compareSigs(leftSig, rightSig);
	if (typeof isEqual === 'string')
	{
		let equal = scanLeg(leftLeg, rightSig);
		if (!equal)
			equal = scanLeg(rightLeg, leftSig);
		isEqual = equal ? true : 'unknown';
	}
	return {diagram, cell, isEqual};
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
	console.log({spoiled});
}
