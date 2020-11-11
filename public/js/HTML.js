// Catecon Diagram hdole/HTML @ 1601858820992
function hdole_HTML_html2N(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	return r;
}


function hdole_HTML_html2N8(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < 0 || r > 255)
		throw 'out of range';
	return r;
}


function hdole_HTML_html2N16(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < 0 || r > 65536)
		throw 'out of range';
	return r;
}


function hdole_HTML_html2Z32(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < -2417483648 || r > 2417483647)
		throw 'out of range';
	return r;
}


function hdole_HTML_Lm_Br_hdole_HTML_html2Z32__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2Z32:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2Z32__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2Z32;
}
function hdole_HTML_html2Z32F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="-2417483648" max="2417483647" id="' + args[0] + '" placeholder="32-bit integer"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2Z32__br__rb___br_0_rb__rB_mL];
}

function hdole_HTML_html2Z(args)
{
	return Number.parseInt(document.getElementById(args).value);
}

function hdole_HTML_html2F(args)
{
	return Number.parseFloat(document.getElementById(args).value);
}

function hdole_HTML_html2Str(args)
{
	return document.getElementById(args).value;
}


function hdole_HTML_Lm_Br_hdole_HTML_html2Str__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2Str:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2Str__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2Str;
}
function hdole_HTML_html2line(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="text" id="' + args[0] + '" placeholder="Text"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2Str__br__rb___br_0_rb__rB_mL];
}


function hdole_HTML_Lm_Br_hdole_HTML_html2N__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2N:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2N__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2N;
}
function hdole_HTML_html2Nat(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" id="' + args[0] + '" placeholder="Natural number"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2N__br__rb___br_0_rb__rB_mL];
}


function hdole_HTML_Lm_Br_hdole_HTML_html2N8__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2N8:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2N8__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2N8;
}
function hdole_HTML_html2N8F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" max="255" id="' + args[0] + '" placeholder="0 to 255"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2N8__br__rb___br_0_rb__rB_mL];
}


function hdole_HTML_Lm_Br_hdole_HTML_html2N16__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2N16:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2N16__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2N16;
}
function hdole_HTML_html2N16F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" max="255" id="' + args[0] + '" placeholder="0 to 255"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2N16__br__rb___br_0_rb__rB_mL];
}


function hdole_HTML_Lm_Br_hdole_HTML_html2Z__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2Z:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2Z__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2Z;
}
function hdole_HTML_html2Int(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" id="' + args[0] + '" placeholder="Integer"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2Z__br__rb___br_0_rb__rB_mL];
}


function hdole_HTML_Lm_Br_hdole_HTML_html2F__br__rb___br_0_rb__rB_mL_Iterator(fn)
{
	const result = new Map();
	for (let i=0; i<1; ++i)
		result.set(i, fn(i));
	return result;
}
// LambdaMorphism: Lm{hdole/HTML/html2F:[]:[[0]]}mL
function hdole_HTML_Lm_Br_hdole_HTML_html2F__br__rb___br_0_rb__rB_mL(args)
{
		return hdole_HTML_html2F;
}
function hdole_HTML_html2Float(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" id="' + args[0] + '" placeholder="Float"' + dv + '/>', hdole_HTML_Lm_Br_hdole_HTML_html2F__br__rb___br_0_rb__rB_mL];
}

