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
console.log('remove equivalence');
				RemoveEquivalence(args[1], args[2]);
				break;
		}
	}
	catch(e)
	{
		postMessage(['exception', e]);
	}
}

const equivalences = new Set;
const sig2equivalences = new Map;		// sig to the list of pairs [leg, item]
const equals = new Map;

const Sig = function(...elts)
{
	if (elts.length === 0)
		throw 'no info';
	else if (elts.length === 1)
		return elts[0];
//	return sjcl.hash.sha256.hash(elts.join());
	return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(elts.join()));
}

const LoadEquivalence = function(item, leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	const leftSigs = equals.has(leftSig) ? equals.get(leftSig) : new Set;
	const rightSigs = equals.has(rightSig) ? equals.get(rightSig) : new Set;
	leftSigs.add(rightSig);
	leftSigs.add(...rightSigs);		// copy right sigs to left
	equals.set(leftSig, leftSigs);
	equals.set(rightSig, leftSigs);	// since equal set is same

		/*
		if (leftSigs.has(rightSig))
		{
			// do nothing, slready processed
		}
		else if (equals.has(rightSig))	// merge right sigs to the left
		{
			const rightSigs = equals.get(rightSig);
			rightSigs.add(leftSig);
//			rightSigs.forEach(function(sig)
//			{
//				leftSigs.add(sig);
//			});
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
		else if (equals.has(leftSig))	// merge left sigs to the right
		{
			const leftSigs = equals.get(leftSig);
			leftSigs.add(leftSig);
//			leftSigs.forEach(function(sig)
//			{
//				rightSigs.add(sig);
//			});
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
		if (leftSig !== rightSig)
			equals.set(rightSig, sigs);
	}
	*/
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
}

const CheckEquivalence = function(diagram, tag, leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	const equ = equals.get(leftSig);
	let item = null;
	if (equ && equ.has(rightSig))
	{
		const equs = sig2equivalences.get(rightSig);
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

const RemoveEquivalence = function(leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
	const leftEqus = sig2equivalences.get(leftSig);
	let ndx = -1;
	for (let i=0; i<leftEqus.length; ++i)
	{
		const a = leftEqus[i];
		const leg = a[0];
		const legSig = Sig(...leg);
		if (legSig === rightSig)
		{
			ndx = i;
			break;
		}
	};
	leftEqus.splice(ndx, 1);
	const rightEqus = sig2equivalences.get(rightSig);
	ndx = -1;
	for (let i=0; i<rightEqus.length; ++i)
	{
		const a = rightEqus[i];
		const leg = a[0];
		const legSig = Sig(...leg);
		if (legSig === leftSig)
		{
			ndx = i;
			break;
		}
	};
	rightEqus.splice(ndx, 1);
	const oldEquivalences = new Set(equivalences);
	equivalences.clear();
	sig2equivalences.clear();
	equals.clear();
	oldEquivalences.forEach(function(e)
	{
		LoadEquivalence(e[0], e[1], e[2]);
	});
}
