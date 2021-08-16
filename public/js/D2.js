'use strict';

class D2
{
	constructor(x = 0, y = 0, width = 0, height = 0)
	{
		if (typeof x === 'object')
		{
			this.x = x.x;
			this.y = x.y;
			this.width = 'width' in x ? x.width : 0;
			this.height = 'height' in x ? x.height : 0;
		}
		else
		{
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
		}
	}
	add(w)
	{
		const a = new D2(this);
		a.x += w.x;
		a.y += w.y;
		if ('width' in w)
		{
			a.width = w.width;
			a.height = w.height;
		}
		return a;
	}
	angle()
	{
		let angle = 0;
		if (this.x !== 0)
		{
			angle = Math.atan(this.y/this.x);
			if (this.x < 0.0)
				angle += Math.PI;
		}
		else
			angle = this.y > 0 ? Math.PI/2 : - Math.PI/2;
		if (angle < 0)
			angle += 2 * Math.PI;
		return angle % (2 * Math.PI);
	}
	area()
	{
		return this.width * this.height;
	}
	contains(d)
	{
		return D2.Inbetween(this.x, d.x, this.x + this.width) &&
		D2.Inbetween(this.y, d.y, this.y + this.height) &&
		D2.Inbetween(this.x, d.x + d.width, this.x + this.width) &&
		D2.Inbetween(this.y, d.y + d.height, this.y + this.height);
	}
	dist(v)
	{
		return D2.Dist(this, v);
	}
	equals(v)
	{
		return this.x === v.x && this.y === v.y && ('width' in v ? this.width === v.width && this.height === v.height : true);
	}
	grid(g)
	{
		this.x = g * Math.round(this.x / g);
		this.y = g * Math.round(this.y / g);
		return this;
	}
	increment(w)
	{
		this.x += w.x;
		this.y += w.y;
		return this;
	}
	inner()
	{
		return D2.Inner(this);
	}
	length()
	{
		return Math.sqrt(this.inner());
	}
	merge(box)
	{
		const merge = D2.Merge(this, box);
		this.x = merge.x;
		this.y = merge.y;
		this.width = merge.width;
		this.height = merge.height;
	}
	normal()
	{
		return D2.Normal(this);
	}
	normalize()
	{
		const length = this.length();
		return new D2(this.x / length, this.y / length);
	}
	pointInside(pnt)
	{
		return D2.Inbetween(this.x, pnt.x, this.x + this.width) && D2.Inbetween(this.y, pnt.y, this.y + this.height);
	}
	round()
	{
		return new D2(Math.round(this.x), Math.round(this.y));
	}
	trunc()
	{
		return new D2(Math.trunc(this.x), Math.trunc(this.y));
	}
	scale(a)
	{
		return D2.Scale(a, this);
	}
	sub(w)
	{
		return D2.Subtract(this, w);
	}
	subtract(w)
	{
		return D2.Subtract(this, w);
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	nonZero()
	{
		return this.x !== 0 || this.y !== 0;
	}
	static Add(v, w)
	{
		return new D2(v.x + w.x, v.y + w.y);
	}
	static Dist2(v, w)
	{
		return D2.Inner(D2.Subtract(v, w));
	}
	static Dist(v, w)
	{
		return Math.sqrt(D2.Dist2(v, w));
	}
	static Cross(o, a, b)
	{
		return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	}
	static Inner(v)
	{
		return v.x * v.x + v.y * v.y;
	}
	static Length(v)
	{
		return Math.sqrt(D2.Inner(v));
	}
	static Normal(v)
	{
		return new D2(-v.y, v.x);
	}
	static Round(v)
	{
		return new D2(Math.round(v.x), Math.round(v.y));
	}
	static Scale(a, v)
	{
		const args = {x:v.x * a, y:v.y * a};
		if ('width' in v)
		{
			args.width = v.width * a;
			args.height = v.height * a;
		}
		return new D2(args);
	}
	static Subtract(v, w)
	{
		return new D2(v.x - w.x, v.y - w.y);
	}
	static SegmentDistance(p, v, w)
	{
		const l2 = D2.Dist2(v, w);
		if (l2 === 0)
			return D2.Dist(p, v);
		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		return D2.Dist(p, {x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y)});
	}
	static UpdatePoint(p, c, basePoint)
	{
		return D2.Dist2(c, basePoint) < D2.Dist2(p, basePoint) ? c : p;
	}
	static Inbetween(a, b, c)
	{
		return (a - D2.Eps() <= b && b <= c + D2.Eps()) || (c - D2.Eps() <= b && b <= a + D2.Eps());
	}
	static Inside(a, b, c)
	{
		return D2.Inbetween(a.x, b.x, c.x) && D2.Inbetween(a.y, b.y, c.y);
	}
	static SegmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4)
	{
		const deltaX12 = x1 - x2;
		const deltaX34 = x3 - x4;
		const deltaY12 = y1 - y2;
		const deltaY34 = y3 - y4;
		const x1y2 = x1 * y2;
		const x2y1 = x2 * y1;
		const x3y4 = x3 * y4;
		const x4y3 = x4 * y3;
		const deltaX1Y1_X2Y1 = x1y2 - x2y1;
		const deltaX3Y4_X4Y3 = x3y4 - x4y3;
		const denom = deltaX12 * deltaY34 - deltaY12 * deltaX34;
		const x = (deltaX1Y1_X2Y1 * deltaX34 - deltaX12 * deltaX3Y4_X4Y3) / denom;
		const y = (deltaX1Y1_X2Y1 * deltaY34 - deltaY12 * deltaX3Y4_X4Y3) / denom;
		if (denom === 0.0)
			return null;
		if (!(D2.Inbetween(x2, x, x1) && D2.Inbetween(y2, y, y1) && D2.Inbetween(x3, x, x4) && D2.Inbetween(y3, y, y4)))
			return null;
		return new D2(x, y);
	}
	static Angle(from, to)
	{
		return D2.Subtract(to, from).angle();
	}
	static Eps()
	{
		return(0.0000001);
	}
	static Overlap(abox, bbox)	// do two bounding boxes overlap?
	{
		const aLeft = abox.x;
		const aRight = abox.x + abox.width;
		const aTop = abox.y;
		const aBottom = abox.y + abox.height;
		const bLeft = bbox.x;
		const bRight = bbox.x + bbox.width;
		const bTop = bbox.y;
		const bBottom = bbox.y + bbox.height;
		const h =	D2.Inbetween(aLeft, bLeft, aRight) ||
					D2.Inbetween(aLeft, bRight, aRight) ||
					D2.Inbetween(bLeft, aLeft, bRight) ||
					D2.Inbetween(bLeft, aRight, bRight);
		const w =	D2.Inbetween(bBottom, aBottom, bTop) ||
					D2.Inbetween(bBottom, aTop, bTop) ||
					D2.Inbetween(aBottom, bBottom, aTop) ||
					D2.Inbetween(aBottom, bTop, aTop);
		return h && w;
	}
	static Merge(...boxes)
	{
		const x = Math.min(...boxes.map(bx => bx.x));
		const y = Math.min(...boxes.map(bx => bx.y));
		const width = Math.max(...boxes.map(bx => bx.x + bx.width - x));
		const height = Math.max(...boxes.map(bx => bx.y + bx.height - y));
		return {x, y, width, height};
	}
	static Hull(ary)
	{
		const cnt = ary.length;
		if (cnt <= 3)
			return ary;
		ary.sort((a, b) => a.x < b.x ? true : a.y < b.y);
		let k = 0;
		const r = [];
		for (let i=0; i<cnt; ++i)
		{
			while(k >= 2 && D2.Cross(r[k -2], r[k -1], ary[i]) <= 0)
				k--;
			r[k++] = ary[i];
		}
		let t = k + 1;
		for (let i=cnt -1; i>0; --i)
		{
			while(k >= t && D2.Cross(r[k -2], r[k -1], ary[i -1]) <= 0)
				k--;
			r[k++] = ary[i -1];
		}
		return r;
	}
	static Expand(box, dist)
	{
		return new D2({x:box.x - dist, y:box.y - dist, width:box.width + 2 * dist, height:box.height + 2 * dist});
	}
	static Polar(cx, cy, r, angleDeg)
	{
		const angleRad = angleDeg * Math.PI / 180.0;
		return new D2({x:cx + r * Math.cos(angleRad), y:cy + r * -Math.sin(angleRad)});
	}
	static lineBoxIntersect(pt0, pt1, box)
	{
		return	D2.SegmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x, box.y, box.x + box.width, box.y) ||			// top edge
				D2.SegmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x, box.y, box.x, box.y + box.height) ||		// left edge
				D2.SegmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x, box.y + box.height, box.x + box.width, box.y + box.height) ||	// bottom edge
				D2.SegmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x + box.width, box.y, box.x + box.width, box.y + box.height);		// right edge
	}
}

if (typeof window === 'object')
	window.D2 = D2;
else
	module.exports = D2;
