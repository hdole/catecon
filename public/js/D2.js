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
		return D2.inbetween(this.x, d.x, this.x + this.width) &&
		D2.inbetween(this.y, d.y, this.y + this.height) &&
		D2.inbetween(this.x, d.x + d.width, this.x + this.width) &&
		D2.inbetween(this.y, d.y + d.height, this.y + this.height);
	}
	dist(v)
	{
		return D2.dist(this, v);
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
		return D2.inner(this);
	}
	length()
	{
		return Math.sqrt(this.inner());
	}
	merge(box)
	{
		const merge = D2.merge(this, box);
		this.x = merge.x;
		this.y = merge.y;
		this.width = merge.width;
		this.height = merge.height;
	}
	normal()
	{
		return D2.normal(this);
	}
	normalize()
	{
		const length = this.length();
		return new D2(this.x / length, this.y / length);
	}
	pointInside(pnt)
	{
		return D2.inbetween(this.x, pnt.x, this.x + this.width) && D2.inbetween(this.y, pnt.y, this.y + this.height);
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
		return D2.scale(a, this);
	}
	sub(w)
	{
		return D2.subtract(this, w);
	}
	subtract(w)
	{
		return D2.subtract(this, w);
	}
	getXY()
	{
		return {x:this.x, y:this.y};
	}
	nonZero()
	{
		return this.x !== 0 || this.y !== 0;
	}
	static add(v, w)
	{
		return new D2(v.x + w.x, v.y + w.y);
	}
	static dist2(v, w)
	{
		return D2.inner(D2.subtract(v, w));
	}
	static dist(v, w)
	{
		return Math.sqrt(D2.dist2(v, w));
	}
	static cross(o, a, b)
	{
		return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	}
	static inner(v)
	{
		return v.x * v.x + v.y * v.y;
	}
	static innerProduct(v, w)
	{
		return v.x * w.x + v.y * w.y;
	}
	static length(v)
	{
		return Math.sqrt(D2.inner(v));
	}
	static normal(v)
	{
		return new D2(-v.y, v.x);
	}
	static round(v)
	{
		return new D2(Math.round(v.x), Math.round(v.y));
	}
	static scale(a, v)
	{
		const args = {x:v.x * a, y:v.y * a};
		if ('width' in v)
		{
			args.width = v.width * a;
			args.height = v.height * a;
		}
		return new D2(args);
	}
	static subtract(v, w)
	{
		return new D2(v.x - w.x, v.y - w.y);
	}
	static segmentDistance(p, v, w)
	{
		const l2 = D2.dist2(v, w);
		if (l2 === 0)
			return D2.dist(p, v);
		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		return D2.dist(p, {x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y)});
	}
	static updatePoint(p, c, basePoint)
	{
		return D2.dist2(c, basePoint) < D2.dist2(p, basePoint) ? c : p;
	}
	static inbetween(a, b, c)
	{
		return (a - D2.eps() <= b && b <= c + D2.eps()) || (c - D2.eps() <= b && b <= a + D2.eps());
	}
	static inside(a, b, c)
	{
		return D2.inbetween(a.x, b.x, c.x) && D2.inbetween(a.y, b.y, c.y);
	}
	static segmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4)
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
		if (!(D2.inbetween(x2, x, x1) && D2.inbetween(y2, y, y1) && D2.inbetween(x3, x, x4) && D2.inbetween(y3, y, y4)))
			return null;
		return new D2(x, y);
	}
	static angle(from, to)
	{
		return D2.subtract(to, from).angle();
	}
	static eps()
	{
		return(0.0000001);
	}
	static overlap(abox, bbox)	// do two bounding boxes overlap?
	{
		const aLeft = abox.x;
		const aRight = abox.x + abox.width;
		const aTop = abox.y;
		const aBottom = abox.y + abox.height;
		const bLeft = bbox.x;
		const bRight = bbox.x + bbox.width;
		const bTop = bbox.y;
		const bBottom = bbox.y + bbox.height;
		const h =	D2.inbetween(aLeft, bLeft, aRight) ||
					D2.inbetween(aLeft, bRight, aRight) ||
					D2.inbetween(bLeft, aLeft, bRight) ||
					D2.inbetween(bLeft, aRight, bRight);
		const w =	D2.inbetween(bBottom, aBottom, bTop) ||
					D2.inbetween(bBottom, aTop, bTop) ||
					D2.inbetween(aBottom, bBottom, aTop) ||
					D2.inbetween(aBottom, bTop, aTop);
		return h && w;
	}
	static merge(...boxes)
	{
		const x = Math.min(...boxes.map(bx => bx.x));
		const y = Math.min(...boxes.map(bx => bx.y));
		const width = Math.max(...boxes.map(bx => bx.x + bx.width - x));
		const height = Math.max(...boxes.map(bx => bx.y + bx.height - y));
		return {x, y, width, height};
	}
	static bBox(...coords)
	{
		const x = Math.min(...coords.map(c => c.x));
		const y = Math.min(...coords.map(c => c.y));
		const maxX = Math.max(...coords.map(c => c.x));
		const maxY = Math.max(...coords.map(c => c.y));
		const width = maxX - x;
		const height = maxY - y;
		return {x, y, width, height};
	}
	static hull(ary)
	{
		const cnt = ary.length;
		if (cnt <= 3)
			return ary;
		ary.sort((a, b) => a.x < b.x ? true : a.y < b.y);
		let k = 0;
		const r = [];
		for (let i=0; i<cnt; ++i)
		{
			while(k >= 2 && D2.cross(r[k -2], r[k -1], ary[i]) <= 0)
				k--;
			r[k++] = ary[i];
		}
		let t = k + 1;
		for (let i=cnt -1; i>0; --i)
		{
			while(k >= t && D2.cross(r[k -2], r[k -1], ary[i -1]) <= 0)
				k--;
			r[k++] = ary[i -1];
		}
		return r;
	}
	static expand(box, dist)
	{
		return new D2({x:box.x - dist, y:box.y - dist, width:box.width + 2 * dist, height:box.height + 2 * dist});
	}
	static polar(cx, cy, r, angleDeg)
	{
		const angleRad = angleDeg * Math.PI / 180.0;
		return new D2({x:cx + r * Math.cos(angleRad), y:cy + r * -Math.sin(angleRad)});
	}
	static lineBoxIntersect(pt0, pt1, box)
	{
		return	D2.segmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x, box.y, box.x + box.width, box.y) ||			// top edge
				D2.segmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x, box.y, box.x, box.y + box.height) ||		// left edge
				D2.segmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x, box.y + box.height, box.x + box.width, box.y + box.height) ||	// bottom edge
				D2.segmentIntersect(pt0.x, pt0.y, pt1.x, pt1.y, box.x + box.width, box.y, box.x + box.width, box.y + box.height);		// right edge
	}
	// https://www.particleincell.com/2013/cubic-line-intersection/
	static sortSpecial(a)
	{
		let flip;
		let temp;
		do
		{
			flip=false;
			for (var i=0;i<a.length-1;i++)
			{
				if ((a[i+1]>=0 && a[i]>a[i+1]) ||
					(a[i]<0 && a[i+1]>=0))
				{
					flip=true;
					temp=a[i];
					a[i]=a[i+1];
					a[i+1]=temp;
				}
			}
		}
		while (flip);
		return a;
	}
	static sign(x)
	{
		return x < 0.0 ? -1 : 1;
	}
	// based on http://mysite.verizon.net/res148h4j/javascript/script_exact_cubic.html#the%20source%20code
	static cubicRoots(P)
	{
		let t = [];
		if(P[0] === 0)
		{
			if(P[1] === 0)		// linear
			{
				t[0] = -1 * ( P[3] / P[2] );
				t[1] = -1;
				t[2] = -1;
				// discard out of spec roots
				for (let i=0;i<1;i++)
					if (t[i] > 1.0)
						t[i] = -1;
				// sort but place -1 at the end
				t = D2.sortSpecial(t);
				return t;
			}
			// quadratic
			let DQ = Math.pow(P[2], 2) - 4*P[1]*P[3]; // quadratic discriminant
			if( DQ >= 0 )
			{
				DQ = Math.sqrt(DQ);
				t[0] = -1 * ( ( DQ + P[2] ) / ( 2 * P[1] ) );
				t[1] = ( ( DQ - P[2] ) / ( 2 * P[1] ) );
				t[2] = -1;
				// discard out of spec roots
				for (let i=0;i<2;i++)
					if (t[i] > 1.0)
						t[i]=-1;
				// sort but place -1 at the end
				t = D2.sortSpecial(t);
				return t;
			}
		}
		const a = P[0];
		const b = P[1];
		const c = P[2];
		const d = P[3];
		const A = b/a;
		const B = c/a;
		const C = d/a;
		let Im;
		const Q = (3*B - Math.pow(A, 2))/9;
		const R = (9*A*B - 27*C - 2*Math.pow(A, 3))/54;
		const D = Math.pow(Q, 3) + Math.pow(R, 2);    // polynomial discriminant
		if (D >= 0)                                 // complex or duplicate roots
		{
			const S = D2.sign(R + Math.sqrt(D))*Math.pow(Math.abs(R + Math.sqrt(D)),(1/3));
			const T = D2.sign(R - Math.sqrt(D))*Math.pow(Math.abs(R - Math.sqrt(D)),(1/3));
			t[0] = -A/3 + (S + T);                    // real root
			t[1] = -A/3 - (S + T)/2;                  // real part of complex root
			t[2] = -A/3 - (S + T)/2;                  // real part of complex root
			Im = Math.abs(Math.sqrt(3)*(S - T)/2);    // complex part of root pair
			// discard complex roots
			if (Im != 0)
			{
				t[1] = -1;
				t[2] = -1;
			}
		}
		else                                          // distinct real roots
		{
			const th = Math.acos(R/Math.sqrt(-Math.pow(Q, 3)));
			t[0] = 2*Math.sqrt(-Q)*Math.cos(th/3) - A/3;
			t[1] = 2*Math.sqrt(-Q)*Math.cos((th + 2*Math.PI)/3) - A/3;
			t[2] = 2*Math.sqrt(-Q)*Math.cos((th + 4*Math.PI)/3) - A/3;
			Im = 0.0;
		}
		// discard out of spec roots
		for (let i = 0;i<3;i++)
			if (t[i] < 0 || t[i] > 1.0 || isNaN(t[i]))
				t[i] = -1;
		// sort but place -1 at the end
		t = D2.sortSpecial(t);
		return t;
	}
	static bezierCoeffs(P0, P1, P2, P3)
	{
		const Z = [];
		Z[0] = -P0 + 3*P1 + -3*P2 + P3;
		Z[1] = 3*P0 - 6*P1 + 3*P2;
		Z[2] = -3*P0 + 3*P1;
		Z[3] = P0;
		return Z;
	}
	// computes intersection between a cubic spline and a line segment
	static hasBezierIntersection(start, end, cp1, cp2, lineStart, lineEnd)
	{
		let X = [];
		const A = lineEnd.y-lineStart.y;	    //A=y2-y1
		const B = lineStart.x-lineEnd.x;	    //B=x1-x2
		const C = lineStart.x * (lineStart.y - lineEnd.y) + lineStart.y*(lineEnd.x-lineStart.x);	//C=x1*(y1-y2)+y1*(x2-x1)
		const bx = D2.bezierCoeffs(start.x, cp1.x, cp2.x, end.x);
		const by = D2.bezierCoeffs(start.y, cp1.y, cp2.y, end.y);
		const P = [];
		P[0] = A*bx[0]+B*by[0];		// t^3
		P[1] = A*bx[1]+B*by[1];		// t^2
		P[2] = A*bx[2]+B*by[2];		// t
		P[3] = A*bx[3]+B*by[3] + C;	// 1
		const r = D2.cubicRoots(P);
		// verify the roots are in bounds of the linear segment
		for (let i = 0; i<3;i++)
		{
			t = r[i];
			if (t === -1)
				return false;
			X[0] = bx[0]*t*t*t+bx[1]*t*t+bx[2]*t+bx[3];
			X[1] = by[0]*t*t*t+by[1]*t*t+by[2]*t+by[3];
			//above is intersection point assuming infinitely long line segment, make sure we are also in bounds of the line
			let s;
			if ((lineEnd.x-lineStart.x)!=0)           // if not vertical line
				s = (X[0]-lineStart.x)/(lineEnd.x-lineStart.x);
			else
				s = (X[1]-lineStart.y)/(lineEnd.y-lineStart.y);
			// in bounds?
			if (!(t<0 || t>1.0 || s<0 || s>1.0))
				return true;
		}
		return false;
	}
	static boxBezierIntersection(start, cp1, cp2, end, box)
	{
		if (D2.hasBezierIntersection(start, end, cp1, cp2, {x:box.x, y:box.y}, {x:box.x + box.width, y:box.y}))
			return true;
		if (D2.hasBezierIntersection(start, end, cp1, cp2, {x:box.x, y:box.y}, {x:box.x, y:box.y + box.height}))
			return true;
		if (D2.hasBezierIntersection(start, end, cp1, cp2, {x:box.x, y:box.y + box.height}, {x:box.x + box.width, y:box.y + box.height}))
			return true;
		if (D2.hasBezierIntersection(start, end, cp1, cp2, {x:box.x + box.width, y:box.y}, {x:box.x + box.width, y:box.y + box.height}))
			return true;
		return false;
	}
}

if (typeof window === 'object')
	window.D2 = D2;
else
	module.exports = D2;
