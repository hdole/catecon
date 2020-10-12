
const CatIcons =
{
	sizes:		{tiny:0.4, small:0.66, large:1.0},
add:
`<line class="arrow0" x1="160" y1="80" x2="160" y2="240"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160"/>`,
cateapsis:
`<circle cx="160" cy="60" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M40,280 40,160 110,90" marker-end="url(#arrowhead)"/>
<path class="svgstr4" d="M280,280 280,160 210,90" marker-end="url(#arrowhead)"/>`,
category:
`<line class="arrow0" x1="40" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="260" y1="80" x2="260" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="80" x2="220" y2="260" marker-end="url(#arrowhead)"/>`,
chevronLeft:
`<path class="svgfilNone svgstr1" d="M120,40 80,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 160,160 200,280"/>`,
chevronRight:
`<path class="svgfilNone svgstr1" d="M120,40 160,160 120,280"/>
<path class="svgfilNone svgstr1" d="M200,40 240,160 200,280"/>`,
close:
`<line class="arrow0 str0" x1="40" y1="40" x2="280" y2= "280" />
<line class="arrow0 str0" x1="280" y1="40" x2="40" y2= "280" />`,
close3()
{
	return H3.g([	H3.line({class:"arrow0 str0", x1:"40", y1:"40", x2:"280", y2: "280"}),
					H3.line({class:"arrow0 str0", x1:"280", y1:"40", x2:"40", y2: "280"})]);
},
commutes()
{
	return H3.path({class:"svgfilNone svgstr1", d:CatIcons.getArc(160, 160, 100, 45, 360), 'marker-end':'url(#arrowhead)'});
},
copy:
`<circle cx="200" cy="200" r="160" fill="#fff"/>
<circle cx="200" cy="200" r="160" fill="url(#radgrad1)"/>
<circle cx="120" cy="120" r="120" fill="url(#radgrad2)"/>`,
delete:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="230" marker-end="url(#arrowhead)"/>
<path class="svgfilNone svgstr1" d="M90,190 A120,50 0 1,0 230,190"/>`,
delete3()
{
	return H3.g([H3.line({class:"arrow0", x1:"160", y1:"40", x2:"160", y2:"230", 'marker-end':"url(#arrowhead)"}),
			H3.path({class:"svgfilNone svgstr1", d:"M90,190 A120,50 0 1,0 230,190"})]);
},
diagram:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="260" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="60" x2="280" y2="250" marker-end="url(#arrowhead)"/>`,
diagram3()
{
	return H3.g([H3.line({class:"arrow0", x1:"60", y1:"40", x2:"260", y2:"40", 'marker-end':"url(#arrowhead)"}),
			H3.line({class:"arrow0", x1:"40", y1:"60", x2:"40", y2:"260", 'marker-end':"url(#arrowhead)"}),
			H3.line({class:"arrow0", x1:"60", y1:"280", x2:"250", y2:"280", 'marker-end':"url(#arrowhead)"}),
			H3.line({class:"arrow0", x1:"280", y1:"60", x2:"280", y2:"250", 'marker-end':"url(#arrowhead)"})]);
},
down(){ return H3.line({class:"arrow0", x1:"160", y1:"60", x2:"160", y2:"260", 'marker-end':"url(#arrowhead)"}); },
downcloud:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="160" y1="160" x2="160" y2="300" marker-end="url(#arrowhead)"/>`,
download:
`<line class="arrow0" x1="160" y1="40" x2="160" y2="160" marker-end="url(#arrowhead)"/>`,
download3()
{
	return H3.line({class:'arrow0', x1:160, y1:40, x2:160, y2:160, 'marker-end':'url(#arrowhead)'});
},
edit:
`<path class="svgstr4" d="M280 40 160 280 80 240" marker-end="url(#arrowhead)"/>`,
edit3()
{
	return H3.path({class:"svgstr4", d:"M280 40 160 280 80 240"});
},
functor:
`<line class="arrow0" x1="40" y1="40" x2="40" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>`,
help:
`<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<path class="svgstr4" d="M110,120 C100,40 280,40 210,120 S170,170 160,200"/>`,
io:
`
	<line class="arrow0" x1="100" y1="160" x2="220" y2="160" marker-end="url(#arrowhead)"/>
	<polygon points="0 0, 120 160, 0 320" fill="url(#radgrad1)"/>
	<polygon points="320 0, 200 160, 320 320" fill="url(#radgrad1)"/>
`,
lambda2:
`<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="120" y1="120" x2="40" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="200" y1="200" x2="280" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="200" x2="40" y2="280" marker-end="url(#arrowhead)"/>`,
login:
`<polyline class="svgstr4" points="160,60 160,200 70,280 70,40 250,40 250,280"/>`,
morphism:
`<marker id="arrowhead" viewBox="6 12 60 90" refX="50" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
<path class="svgstr3" d="M10 20 L60 50 L10 80"/>
</marker>
<marker id="arrowheadRev" viewBox="6 12 60 90" refX="15" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
<path class="svgstr3" d="M60 20 L10 50 L60 80"/>
</marker>
<marker id="arrowheadWide" viewBox="0 -20 60 140" refX="50" refY="50" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
<path class="svgstr4" d="M0 0 L80 50 L10 100"/>
</marker>
<line class="arrow0" x1="60" y1="160" x2="260" y2="160" marker-end="url(#arrowhead)"/>`,
morphism3()
{
	return H3.line({class:"arrow0", x1:"60", y1:"160", x2:"260", y2:"160", 'marker-end':"url(#arrowhead)"});
},
move:
`<line class="svgfilNone arrow0-30px" x1="60" y1="80" x2="240" y2="80" />
<line class="svgfilNone arrow0-30px" x1="60" y1="160" x2="240" y2="160" />
<line class="svgfilNone arrow0-30px" x1="60" y1="240" x2="240" y2="240" />`,
move3()
{
	return H3.g([H3.line({class:"svgfilNone arrow0-30px", x1:"60", y1:"80", x2:"240", y2:"80"}),
			H3.line({class:"svgfilNone arrow0-30px", x1:"60", y1:"160", x2:"240", y2:"160"}),
			H3.line({class:"svgfilNone arrow0-30px", x1:"60", y1:"240", x2:"240", y2:"240"})]);
},
new:
`<circle class="svgstr3" cx="80" cy="70" r="70"/>
<line class="svgfilNone arrow0" x1="80" y1="20" x2="80" y2= "120" />
<line class="svgfilNone arrow0" x1="30" y1="70" x2="130" y2= "70" />`,
object:
`<circle cx="160" cy="160" r="160" fill="url(#radgrad1)"/>`,
object3()
{
	return H3.circle({cx:"160", cy:"160", r:"160", fill:"url(#radgrad1)"});
},
play:
`<text text-anchor="middle" x="160" y="260" style="font-size:240px;stroke:#000;">&#9654;</text>`,
recursion:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow3" x1="40" y1="120" x2="240" y2="120" marker-end="url(#arrowhead)"/>
<line class="arrow6" x1="40" y1="180" x2="200" y2="180" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="40" y1="240" x2="160" y2="240" marker-end="url(#arrowhead)"/>`,
reference:
`<line class="arrow9" x1="120" y1="100" x2="260" y2="100"/>
<line class="arrow9" x1="100" y1="120" x2="100" y2="260"/>
<line class="arrow9" x1="120" y1="280" x2="250" y2="280" marker-end="url(#arrowhead)"/>
<line class="arrow9" x1="280" y1="120" x2="280" y2="250" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="40" x2="200" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="60" x2="40" y2="200" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="220" x2="190" y2="220" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="220" y1="60" x2="220" y2="190" marker-end="url(#arrowhead)"/>`,
save:
`<text text-anchor="middle" x="160" y="260" style="font-size:240px;stroke:#000;">&#128190;</text>`,
search()
{
	return [H3.circle({class:'search', cx:"240", cy:"80", r:"120"}),
			H3.line({class:"arrow0", x1:"20", y1:"300", x2:"220", y2:"120", 'marker-end':"url(#arrowhead)"})];
},
settings:
`<line class="arrow0" x1="40" y1="160" x2="280" y2="160" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="160" y1="40" x2="160" y2="280" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="60" x2="240" y2="260" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="80" y1="260" x2="240" y2="60" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<circle class="svgfil4" cx="160" cy="160" r="60"/>
<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>`,
string:
`<line class="arrow0" x1="60" y1="40" x2="260" y2="200"/>
<path class="svgstr4" d="M60,120 C120,120 120,200 60,200"/>
<path class="svgstr4" d="M260,40 C200,40 200,120 260,120"/>
<line class="arrow0" x1="60" y1="260" x2="260" y2="260"/>`,
table:
`<circle cx="80" cy="80" r="60" fill="url(#radgrad2)"/>
<circle cx="80" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="80" cy="240" r="60" fill="url(#radgrad2)"/>
<circle cx="160" cy="80" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="160" cy="240" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="80" r="60" fill="url(#radgrad2)"/>
<circle cx="240" cy="160" r="60" fill="url(#radgrad1)"/>
<circle cx="240" cy="240" r="60" fill="url(#radgrad2)"/>`,
text:
`<line class="arrow0" x1="40" y1="60" x2="280" y2="60" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="160" y1="280" x2="160" y2="60"/>`,
text3()
{
	return H3.g([	H3.line({class:"arrow0", x1:"40", y1:"60", x2:"280", y2:"60", 'marker-end':"url(#arrowhead)"}),
					H3.line({class:"arrow0", x1:"160", y1:"280", x2:"160", y2:"60"})]);
},
threeD:
`<line class="arrow0" x1="120" y1="180" x2="280" y2="180" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="180" x2="120" y2="40" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="120" y1="180" x2="40" y2="280" marker-end="url(#arrowhead)"/>`,
threeD_bottom:
`<polygon class="svgfil1" points="120,180 280,180 200,280 40,280"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
threeD_front:
`<polygon class="svgfil1" points="40,120 200,120 200,280 40,280"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
threeD_back:
`<polygon class="svgfil1" points="120,40 280,40 280,180 120,180"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
threeD_top:
`<polygon class="svgfil1" points="120,40 280,40 200,140 40,140"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
threeD_left:
`<polygon class="svgfil1" points="120,20 120,180 40,280 40,120"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
threeD_right:
`<polygon class="svgfil1" points="280,20 280,180 200,280 200,120"/>
<use xlink:href="#threeD_base" x="0" y="0"/>`,
transform:
`<circle cx="50" cy="160" r="60" fill="url(#radgrad1)"/>
<line class="arrow0" x1="100" y1="160" x2="240" y2="160" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="280" y1="40" x2="280" y2="280" marker-end="url(#arrowhead)"/>`,
tty:
`<path class="svgstrThinGray" d="M70,40 240,40 240,280 70,280 70,40"/>
<line class="svgstr3" x1="90" y1="80" x2="220" y2="80"/>
<line class="svgstr3" x1="90" y1="120" x2="200" y2="120"/>
<line class="svgstr3" x1="90" y1="160" x2="160" y2="160"/>
<line class="svgstr3" x1="90" y1="200" x2="120" y2="200"/>`,
lock:
`<rect class="svgfil5" x="20" y="20" width="280" height="280"/>
<line class="arrow0" x1="60" y1="60" x2="260" y2="260" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="60" y1="260" x2="260" y2="60" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<circle class="svgfil4" cx="160" cy="160" r="40"/>`,
unlock:
`<line class="arrow0" x1="40" y1="40" x2="280" y2="280" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<line class="arrow0" x1="40" y1="280" x2="280" y2="40" marker-start="url(#arrowheadRev)" marker-end="url(#arrowhead)"/>
<rect class="svgfil5" x="120" y="120" width="80" height="80"/>`,
up() { return H3.line({class:"arrow0", x1:"160", y1:"260", x2:"160", y2:"60", 'marker-end':"url(#arrowhead)"}); },
upload:
`<circle cx="160" cy="80" r="80" fill="url(#radgrad1)"/>
<line class="arrow0" x1="160" y1="300" x2="160" y2="160" marker-end="url(#arrowhead)"/>`,
view:
`<circle cx="160" cy="160" r="120" fill="url(#radgrad1)"/>
<path class="svgfilNone svgstrThinGray" d="M20 160 A40 25 0 0 0 300 160 A40 25 0 0 0 20 160" marker-end="url(#arrowheadWide)"/>
`,

	getArc(cx, cy, r, startAngle, endAngle)
	{
		const start = D2.Polar(cx, cy, r, startAngle);
		const end = D2.Polar(cx, cy, r, endAngle);
		const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
	},

	getButton(name, buttonName, onclick, title, scale = CatIcons.sizes.small, id = null, aniId = null, repeatCount = "1")
	{
		const btn = typeof buttonName === 'string' ? CatIcons[buttonName]() : buttonName;
		const children = [	H3.marker({id:"arrowhead", viewBox:"6 12 60 90", refX:"50", refY:"50", markerUnits:"strokeWidth", markerWidth:"6", markerHeight:"5", orient:"auto"}),
							H3.rect({x:0, y:0, width:320, height:320, style:`fill:#ffffff`})];
		if (aniId)
			children.push(H3.g(	H3.animateTransform({id:aniId, attributeName:"transform", type:"rotate", from:"360 160 160", to:"0 160 160", dur:"0.5s", repeatCount, begin:"indefinite"}), btn));
		else
			children.push(btn);
		children.push(H3.rect({class:"btn", x:"0", y:"0", width:"320", height:"320", onclick}));	// click on this!
		const v = 0.32 * (scale !== undefined ? scale : 1.0);
		const args = {width:`${v}in`, height:`${v}in`, viewBox:"0 0 320 320"};
		if (id)
			args.id = id;
		const span = H3.span(H3.svg(args, children), {title, class:'button', 'data-name':name});
		span.style.verticalAlign = 'middle';
		return span;
	},

};

if (typeof module === 'object')
	module.exports = CatIcons;
