// (C) 2020 Harry Dole
//
onmessage = function(e)
{
	const start = Date.now();
	const args = e.data;
	try
	{
		let val = null;
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
				val = CheckEquivalence(args[1], args[2], args[3], args[4]);
				break;
			case 'RemoveEquivalence':
				RemoveEquivalence(args[1], args[2]);
				break;
		}
		if (val)
		{
			const delta = Date.now() - start;
			val.push(delta);
			postMessage(val);
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
	return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(elts.join()));
}

const LoadEquivalence = function(item, leftLeg, rightLeg)
{
	const leftSig = Sig(...leftLeg);
	const rightSig = Sig(...rightLeg);
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

const CheckEquivalence = function(diagram, tag, leftLeg, rightLeg)
{
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
					for (let cnt=2; cnt < len - ndx; ++cnt)
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
	return ['CheckEquivalence', diagram, tag, isEqual, item];
}

const CheckLeg = function(leg, ndx, cnt, sig)
{
	let item = null;
	const subLeg = leg.slice(ndx, cnt);
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
					nuLeg.push(...leg.slice(ndx + cnt, leg.length - ndx - cnt));
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
	return null;
}
