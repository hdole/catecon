// Catecon Diagram hdole/HTML @ Thu Feb 10 2022 13:51:08 GMT-0800 (Pacific Standard Time)
function hdole_HTML_html2N64(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r > Number.MAX_SAFE_INTEGER)
		throw 'out of range';
	const bfr = new ArrayBuffer(8);
	const rslt = new Uint64Array(bfr);
	rslt[0] = r;
	return rslt;
}


function hdole_HTML_html2N8(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < 0 || r > 255)
		throw 'out of range';
	const bfr = new ArrayBuffer(1);
	const rslt = new Uint8Array(bfr);
	rslt[0] = r;
	return rslt;
}


function hdole_HTML_html2N16(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < 0 || r > 65536)
		throw 'out of range';
	const bfr = new ArrayBuffer(2);
	const rslt = new Uint16Array(bfr);
	rslt[0] = r;
	return rslt;
}


function hdole_HTML_html2Z32(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < -2417483648 || r > 2417483647)
		throw 'out of range';
	const bfr = new ArrayBuffer(4);
	const rslt = new Int32Array(bfr);
	rslt[0] = r;
	return rslt;
}

function hdole_HTML_html2Z32F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="-2417483648" max="2417483647" id="' + args[0] + '" placeholder="32-bit integer"' + dv + '/>', hdole_HTML_Lm_Br_html2Z32__br__rb___br__br_0_rb__rb__rB_mL];
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

function hdole_HTML_html2line(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="text" id="' + args[0] + '" placeholder="Text"' + dv + '/>', hdole_HTML_Lm_Br_html2Str__br__rb___br__br_0_rb__rb__rB_mL]
}

function hdole_HTML_html2Nat(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" id="' + args[0] + '" placeholder="Natural number"' + dv + '/>', hdole_HTML_Lm_Br_html2N64__br__rb___br__br_0_rb__rb__rB_mL];
}

function hdole_HTML_html2N8F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" max="255" id="' + args[0] + '" placeholder="0 to 255"' + dv + '/>', hdole_HTML_Lm_Br_html2N8__br__rb___br__br_0_rb__rb__rB_mL];
}

function hdole_HTML_html2N16F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" max="65535" id="' + args[0] + '" placeholder="0 to 65535"' + dv + '/>', hdole_HTML_Lm_Br_html2N16__br__rb___br__br_0_rb__rb__rB_mL];
}

function hdole_HTML_html2Z64F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" id="' + args[0] + '" placeholder="Integer"' + dv + '/>', hdole_HTML_Lm_Br_html2Z__br__rb___br__br_0_rb__rb__rB_mL];
}

function hdole_HTML_html2Float(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" id="' + args[0] + '" placeholder="Float"' + dv + '/>', hdole_HTML_Lm_Br_html2F__br__rb___br__br_0_rb__rb__rB_mL];
}

function hdole_HTML_html2N32(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if (r < 0 || r > 4294967295)
		throw 'out of range';
	const bfr = new ArrayBuffer(4);
	const rslt = new Uint32Array(bfr);
	rslt[0] = r;
	return rslt;
}

function hdole_HTML_html2N32F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="0" max="4294967295" id="' + args[0] + '" placeholder="0 to 4,294,967,295"' + dv + '/>', hdole_HTML_Lm_Br_html2N32__br__rb___br__br_0_rb__rb__rB_mL];
}

// LambdaMorphism: Lm{html2N8:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2N8__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2N8;;
}
// LambdaMorphism: Lm{html2N16:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2N16__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2N16;;
}
// LambdaMorphism: Lm{html2N32:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2N32__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2N32;;
}
// LambdaMorphism: Lm{html2N64:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2N64__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2N64;;
}
function hdole_HTML_html2Z8(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if ((r < -128) || (r > 127))
		throw 'out of range';
	const bfr = new ArrayBuffer(1);
	const rslt = new Int8Array(bfr);
	rslt[0] = r;
	return rslt;
}

function hdole_HTML_html2Z16(args)
{
	const v = document.getElementById(args).value;
	if (v === '')
		throw 'no input';
	const r = Number.parseInt(v);
	if ((r < -32768) || (r > 32767))
		throw 'out of range';
	const bfr = new ArrayBuffer(2);
	const rslt = new Int16Array(bfr);
	rslt[0] = r;
	return rslt;
}

// LambdaMorphism: Lm{html2Z8:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html3Z8__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2Z8;;
}
// LambdaMorphism: Lm{html2Z16:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2Z16__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2Z16;;
}
// LambdaMorphism: Lm{html2Z32:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2Z32__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2Z32;;
}
// LambdaMorphism: Lm{html2Z:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2Z__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2Z;;
}
// LambdaMorphism: Lm{html2F:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2F__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2F;;
}
// LambdaMorphism: Lm{html2Str:[]:[[0]]}mL
function hdole_HTML_Lm_Br_html2Str__br__rb___br__br_0_rb__rb__rB_mL(args)
{
		return hdole_HTML_html2Str;;
}
function hdole_HTML_html2Z8F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="-128" max="127" id="' + args[0] + '" placeholder="8-bit integer"' + dv + '/>', hdole_HTML_Lm_Br_html2Z8__br__rb___br__br_0_rb__rb__rB_mL];
}

function hdole_HTML_html2Z16F(args)
{
	const dv = args[1][0] !== 1 ? ' value="' + args[1][1].toString() + '" ' : '';
	return ['<input type="number" min="-32768" max="32767" id="' + args[0] + '" placeholder="16-bit integer"' + dv + '/>', hdole_HTML_Lm_Br_html2Z16__br__rb___br__br_0_rb__rb__rB_mL];
}
