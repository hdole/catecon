console.log('starting worker...');

onmessage = function(e)
{
	const args = e.data;
	try
	{
		switch(args[0])
		{
			case 'start':
				let url = args[1];
				const index = url.indexOf('index.html');
				if (index !== -1)
					url = url.substring(0, index);
				importScripts(url + '/js/sjcl.js');
				break;
			case 'LoadEquivalence':
				LoadEquivalence(args[1], args[2], args[3]);
				break;
			case 'CheckEquivalence':
				CheckEquivalence(args[1], args[2], args[3], args[4]);
				break;
			case 'RemoveEquivalence':
				RemoveEquivalence(args[1], args[2], args[3]);
				break;
		}
	}
	catch(e)
	{
		postMessage(['exception', e]);
	}
}

const equivalences = new Map;		// sig to the list of pairs [leg, item]
const equals = new Map;

const Sig = function(...elts)
{
	if (elts.length === 0)
		throw 'no info';
	else if (elts.length === 1)
		return elts[0];
	return sjcl.hash.sha256.hash(elts.join());
}

const LoadEquivalence = function(item, leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	if (equals.has(leftSig))
	{
		debugger;
		const leftSigs = equals.get(leftSig);
		if (leftSigs.has(rightSig))
		{
			// do nothing, slready processed
		}
		else if (equals.has(rightSig))	// merge right sigs to the left
		{
			const rightSigs = equals.get(rightSig);
			rightSigs.forEach(function(sig)
			{
				leftSigs.add(sig);
			});
		}
		else
		{
			leftSigs.add(rightSig);
		}
	}
	else if (equals.has(rightSig))
	{
		debugger;
		const rightSigs = equals.get(rightSig);
		if (rightSigs.has(leftSig))
		{
			// do nothing, slready processed
		}
		else
		{
			rightSigs.add(leftSig);
		}
	}
	else
	{
		const sigs = new Set([leftSig, rightSig]);
		equals.set(leftSig, sigs);
		equals.set(rightSig, sigs);
	}
	const fn = function(sig, leg, item)
	{
		if (!equivalences.has(sig))
			equivalences.set(sig, []);
		const equs = equivalences.get(sig);
		equs.push([leg, item]);
	}
	fn(leftSig, rightLeg, item);
	fn(rightSig, leftLeg, item);
}

const CheckEquivalence = function(diagram, tag, leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	const equ = equals.get(leftSig);
	let item = null;
	if (equ && equ.has(rightSig))
	{
		const equs = equivalences.get(rightSig);
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
	postMessage(['CheckEquivalence', diagram, tag, item]);
}

const RemoveEquivalence = function(item, leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	const equ = equals.get(leftSig);
	let ndx = equ.indexOf(rightSig);
	const nuLeft = equ.splice(ndx, 1);
	ndx = equ.indexOf(leftSig);
	const nuRight = equ.splice(ndx, 1);
	nuLeft.map(s => equals.set(s, nuLeft));
	nuRight.map(s => equals.set(s, nuRight));
	// TODO find all legs having leftSig or rightSig and revalidate
}
