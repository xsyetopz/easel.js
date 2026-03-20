/**
 * Earcut polygon triangulator.
 * ISC-licensed port of https://github.com/mapbox/earcut
 *
 * @param {number[]} data - flat array of 2D coordinates [x0,y0, x1,y1, ...]
 * @param {number[]} [holeIndices] - array of hole start indices in data
 * @param {number} [dim=2] - number of coordinates per vertex
 * @returns {number[]} - array of triangle indices (groups of 3)
 */
export function earcut(data, holeIndices, dim = 2) {
	const hasHoles = holeIndices != null && holeIndices.length > 0;
	const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
	let outerNode = linkedList(data, 0, outerLen, dim, true);
	/** @type {number[]} */
	const triangles = [];

	if (!outerNode || outerNode.next === outerNode.prev) return triangles;

	let minX = 0;
	let minY = 0;
	let maxX = 0;
	let maxY = 0;
	let invSize = 0;

	if (hasHoles)
		outerNode = eliminateHoles(
			data,
			/** @type {number[]} */ (holeIndices),
			outerNode,
			dim,
		);

	if (data.length > 80 * dim) {
		minX = maxX = data[0];
		minY = maxY = data[1];

		for (let i = dim; i < outerLen; i += dim) {
			const x = data[i];
			const y = data[i + 1];
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}

		invSize = Math.max(maxX - minX, maxY - minY);
		invSize = invSize === 0 ? 0 : 32767 / invSize;
	}

	earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
	return triangles;
}

/**
 * @typedef {{
 *   i: number,
 *   x: number,
 *   y: number,
 *   prev: EarcutNode,
 *   next: EarcutNode,
 *   z: number,
 *   prevZ: EarcutNode|null,
 *   nextZ: EarcutNode|null,
 *   steiner: boolean,
 * }} EarcutNode
 */

/**
 * @param {number} i
 * @param {number} x
 * @param {number} y
 * @returns {EarcutNode}
 */
function createNode(i, x, y) {
	/** @type {any} */
	const node = {
		i,
		x,
		y,
		z: 0,
		prevZ: null,
		nextZ: null,
		steiner: false,
	};
	node.prev = node;
	node.next = node;
	return /** @type {EarcutNode} */ (node);
}

/**
 * @param {number} i
 * @param {number} x
 * @param {number} y
 * @param {EarcutNode} [last]
 * @returns {EarcutNode}
 */
function insertNode(i, x, y, last) {
	const p = createNode(i, x, y);

	if (last) {
		p.next = last.next;
		p.prev = last;
		last.next.prev = p;
		last.next = p;
	}
	return p;
}

/**
 * @param {EarcutNode} p
 */
function removeNode(p) {
	p.next.prev = p.prev;
	p.prev.next = p.next;

	if (p.prevZ) p.prevZ.nextZ = p.nextZ;
	if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

/**
 * @param {number[]} data
 * @param {number} start
 * @param {number} end
 * @param {number} dim
 * @param {boolean} clockwise
 * @returns {EarcutNode|undefined}
 */
function linkedList(data, start, end, dim, clockwise) {
	/** @type {EarcutNode|undefined} */
	let last;

	if (clockwise === signedArea(data, start, end, dim) > 0) {
		for (let i = start; i < end; i += dim) {
			last = insertNode(i, data[i], data[i + 1], last);
		}
	} else {
		for (let i = end - dim; i >= start; i -= dim) {
			last = insertNode(i, data[i], data[i + 1], last);
		}
	}

	if (last && equals(last, last.next)) {
		removeNode(last);
		last = last.next;
	}

	return last;
}

/**
 * @param {EarcutNode} list
 * @param {EarcutNode|undefined} start
 * @returns {EarcutNode}
 */
function filterPoints(list, start) {
	let cur = start ?? list;

	let p = cur;
	let again;
	do {
		again = false;
		if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
			removeNode(p);
			p = p.prev;
			cur = p;
			if (p === p.next) break;
			again = true;
		} else {
			p = p.next;
		}
	} while (again || p !== cur);

	return cur;
}

/**
 * @param {EarcutNode|undefined} ear
 * @param {number[]} triangles
 * @param {number} dim
 * @param {number} minX
 * @param {number} minY
 * @param {number} invSize
 * @param {number} pass
 */
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
	if (!ear) return;

	if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

	/** @type {EarcutNode} */
	let node = ear;
	let stop = node;

	while (node.prev !== node.next) {
		const prev = node.prev;
		const next = node.next;

		const earValid =
			invSize === 0 ? testEar(node) : testEarHashed(node, minX, minY, invSize);

		if (earValid) {
			triangles.push(
				(prev.i / dim) | 0,
				(node.i / dim) | 0,
				(next.i / dim) | 0,
			);
			removeNode(node);
			node = next.next;
			stop = next.next;
			continue;
		}

		node = next;

		if (node === stop) {
			if (!pass) {
				earcutLinked(
					filterPoints(node, undefined),
					triangles,
					dim,
					minX,
					minY,
					invSize,
					1,
				);
			} else if (pass === 1) {
				node = cureLocalIntersections(
					filterPoints(node, undefined),
					triangles,
					dim,
				);
				earcutLinked(node, triangles, dim, minX, minY, invSize, 2);
			} else if (pass === 2) {
				splitEarcut(node, triangles, dim, minX, minY, invSize);
			}
			break;
		}
	}
}

/**
 * @param {EarcutNode} ear
 * @returns {boolean}
 */
function testEar(ear) {
	const a = ear.prev;
	const b = ear;
	const c = ear.next;

	if (area(a, b, c) >= 0) return false;

	const ax = a.x;
	const bx = b.x;
	const cx = c.x;
	const ay = a.y;
	const by = b.y;
	const cy = c.y;

	const x0 = ax < bx ? (ax < cx ? ax : cx) : bx < cx ? bx : cx;
	const y0 = ay < by ? (ay < cy ? ay : cy) : by < cy ? by : cy;
	const x1 = ax > bx ? (ax > cx ? ax : cx) : bx > cx ? bx : cx;
	const y1 = ay > by ? (ay > cy ? ay : cy) : by > cy ? by : cy;

	let p = c.next;
	while (p !== a) {
		if (
			p.x >= x0 &&
			p.x <= x1 &&
			p.y >= y0 &&
			p.y <= y1 &&
			pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
			area(p.prev, p, p.next) >= 0
		)
			return false;
		p = p.next;
	}

	return true;
}

/**
 * @param {EarcutNode} ear
 * @param {number} minX
 * @param {number} minY
 * @param {number} invSize
 * @returns {boolean}
 */
function testEarHashed(ear, minX, minY, invSize) {
	const a = ear.prev;
	const b = ear;
	const c = ear.next;

	if (area(a, b, c) >= 0) return false;

	const ax = a.x;
	const bx = b.x;
	const cx = c.x;
	const ay = a.y;
	const by = b.y;
	const cy = c.y;

	const x0 = ax < bx ? (ax < cx ? ax : cx) : bx < cx ? bx : cx;
	const y0 = ay < by ? (ay < cy ? ay : cy) : by < cy ? by : cy;
	const x1 = ax > bx ? (ax > cx ? ax : cx) : bx > cx ? bx : cx;
	const y1 = ay > by ? (ay > cy ? ay : cy) : by > cy ? by : cy;

	const minZ = zOrder(x0, y0, minX, minY, invSize);
	const maxZ = zOrder(x1, y1, minX, minY, invSize);

	let p = ear.prevZ;
	let n = ear.nextZ;

	while (p && p.z >= minZ && n && n.z <= maxZ) {
		if (
			p !== ear.prev &&
			p !== ear.next &&
			pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
			area(p.prev, p, p.next) >= 0
		)
			return false;
		p = p.prevZ;

		if (
			n !== ear.prev &&
			n !== ear.next &&
			pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
			area(n.prev, n, n.next) >= 0
		)
			return false;
		n = n.nextZ;
	}

	while (p && p.z >= minZ) {
		if (
			p !== ear.prev &&
			p !== ear.next &&
			pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
			area(p.prev, p, p.next) >= 0
		)
			return false;
		p = p.prevZ;
	}
	while (n && n.z <= maxZ) {
		if (
			n !== ear.prev &&
			n !== ear.next &&
			pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
			area(n.prev, n, n.next) >= 0
		)
			return false;
		n = n.nextZ;
	}

	return true;
}

/**
 * @param {EarcutNode} list
 * @param {number[]} triangles
 * @param {number} dim
 * @returns {EarcutNode}
 */
function cureLocalIntersections(list, triangles, dim) {
	let head = list;
	let p = head;
	do {
		const a = p.prev;
		const b = p.next.next;

		if (
			!equals(a, b) &&
			intersects(a, p, p.next, b) &&
			locallyInside(a, b) &&
			locallyInside(b, a)
		) {
			triangles.push((a.i / dim) | 0, (p.i / dim) | 0, (b.i / dim) | 0);
			removeNode(p);
			removeNode(p.next);
			head = b;
			p = head;
		} else {
			p = p.next;
		}
	} while (p !== head);

	return filterPoints(head, undefined);
}

/**
 * @param {EarcutNode} ear
 * @param {number[]} triangles
 * @param {number} dim
 * @param {number} minX
 * @param {number} minY
 * @param {number} invSize
 */
function splitEarcut(ear, triangles, dim, minX, minY, invSize) {
	let a = ear;
	do {
		let b = a.next.next;
		while (b !== a.prev) {
			if (a.i !== b.i && isValidDiagonal(a, b)) {
				let c = splitPolygon(a, b);
				a = filterPoints(a, a.next);
				c = filterPoints(c, c.next);
				earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
				earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
				return;
			}
			b = b.next;
		}
		a = a.next;
	} while (a !== ear);
}

/**
 * @param {number[]} data
 * @param {number[]} holeIndices
 * @param {EarcutNode} outerNode
 * @param {number} dim
 * @returns {EarcutNode}
 */
function eliminateHoles(data, holeIndices, outerNode, dim) {
	/** @type {EarcutNode[]} */
	const queue = [];

	for (let i = 0, len = holeIndices.length; i < len; i++) {
		const start = holeIndices[i] * dim;
		const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
		const list = linkedList(data, start, end, dim, false);
		if (list) {
			if (list === list.next) list.steiner = true;
			queue.push(getLeftmost(list));
		}
	}

	queue.sort(compareX);

	let node = outerNode;
	for (const hole of queue) {
		node = eliminateHole(hole, node);
	}

	return node;
}

/**
 * @param {EarcutNode} a
 * @param {EarcutNode} b
 * @returns {number}
 */
function compareX(a, b) {
	return a.x - b.x;
}

/**
 * @param {EarcutNode} hole
 * @param {EarcutNode} outerNode
 * @returns {EarcutNode}
 */
function eliminateHole(hole, outerNode) {
	const bridge = findHoleBridge(hole, outerNode);
	if (!bridge) return outerNode;

	const bridgeReverse = splitPolygon(bridge, hole);
	filterPoints(bridgeReverse, bridgeReverse.next);
	return filterPoints(bridge, bridge.next);
}

/**
 * @param {EarcutNode} hole
 * @param {EarcutNode} outerNode
 * @returns {EarcutNode|undefined}
 */
function findHoleBridge(hole, outerNode) {
	let p = outerNode;
	const hx = hole.x;
	const hy = hole.y;
	let qx = Number.NEGATIVE_INFINITY;
	/** @type {EarcutNode|undefined} */
	let m;

	do {
		if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
			const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
			if (x <= hx && x > qx) {
				qx = x;
				m = p.x < p.next.x ? p : p.next;
				if (x === hx) return m;
			}
		}
		p = p.next;
	} while (p !== outerNode);

	if (!m) return undefined;

	const stop = m;
	const mx = m.x;
	const my = m.y;
	let tanMin = Number.POSITIVE_INFINITY;

	p = m;
	do {
		if (
			hx >= p.x &&
			p.x >= mx &&
			hx !== p.x &&
			pointInTriangle(
				hy < my ? hx : qx,
				hy,
				mx,
				my,
				hy < my ? qx : hx,
				hy,
				p.x,
				p.y,
			)
		) {
			const tan = Math.abs(hy - p.y) / (hx - p.x);
			if (
				locallyInside(p, hole) &&
				(tan < tanMin ||
					(tan === tanMin &&
						(p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))
			) {
				m = p;
				tanMin = tan;
			}
		}
		p = p.next;
	} while (p !== stop);

	return m;
}

/**
 * @param {EarcutNode} m
 * @param {EarcutNode} p
 * @returns {boolean}
 */
function sectorContainsSector(m, p) {
	return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

/**
 * @param {EarcutNode} start
 * @param {number} minX
 * @param {number} minY
 * @param {number} invSize
 */
function indexCurve(start, minX, minY, invSize) {
	let p = start;
	do {
		if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize);
		p.prevZ = p.prev;
		p.nextZ = p.next;
		p = p.next;
	} while (p !== start);

	/** @type {EarcutNode} */ (p.prevZ).nextZ = null;
	p.prevZ = null;

	sortLinked(p);
}

/**
 * Merge sort on z-order linked list (Simon Tatham's bottom-up algorithm).
 * @param {EarcutNode} list
 * @returns {EarcutNode}
 */
function sortLinked(list) {
	let inSize = 1;
	let numMerges;
	/** @type {EarcutNode} */
	let result = list;

	do {
		/** @type {EarcutNode|null} */
		let p = result;
		/** @type {EarcutNode|null} */
		let head = null;
		/** @type {EarcutNode|null} */
		let tail = null;
		numMerges = 0;

		while (p) {
			numMerges++;
			/** @type {EarcutNode|null} */
			let q = p;
			let pSize = 0;
			for (let i = 0; i < inSize; i++) {
				pSize++;
				q = q.nextZ;
				if (!q) break;
			}
			let qSize = inSize;

			while (pSize > 0 || (qSize > 0 && q)) {
				/** @type {EarcutNode} */
				let e;
				if (
					pSize !== 0 &&
					(qSize === 0 || !q || /** @type {EarcutNode} */ (p).z <= q.z)
				) {
					e = /** @type {EarcutNode} */ (p);
					p = e.nextZ;
					pSize--;
				} else {
					e = /** @type {EarcutNode} */ (q);
					q = /** @type {EarcutNode} */ (q).nextZ;
					qSize--;
				}

				if (tail) tail.nextZ = e;
				else head = e;

				e.prevZ = tail;
				tail = e;
			}

			p = q;
		}

		/** @type {EarcutNode} */ (tail).nextZ = null;
		inSize *= 2;
		result = /** @type {EarcutNode} */ (head);
	} while (numMerges > 1);

	return result;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} minX
 * @param {number} minY
 * @param {number} invSize
 * @returns {number}
 */
function zOrder(x, y, minX, minY, invSize) {
	let lx = (32767 * (x - minX) * invSize) | 0;
	let ly = (32767 * (y - minY) * invSize) | 0;

	lx = (lx | (lx << 8)) & 0x00ff00ff;
	lx = (lx | (lx << 4)) & 0x0f0f0f0f;
	lx = (lx | (lx << 2)) & 0x33333333;
	lx = (lx | (lx << 1)) & 0x55555555;

	ly = (ly | (ly << 8)) & 0x00ff00ff;
	ly = (ly | (ly << 4)) & 0x0f0f0f0f;
	ly = (ly | (ly << 2)) & 0x33333333;
	ly = (ly | (ly << 1)) & 0x55555555;

	return lx | (ly << 1);
}

/**
 * @param {EarcutNode} p
 * @returns {EarcutNode}
 */
function getLeftmost(p) {
	let leftmost = p;
	let cur = p;
	do {
		if (cur.x < leftmost.x || (cur.x === leftmost.x && cur.y < leftmost.y)) {
			leftmost = cur;
		}
		cur = cur.next;
	} while (cur !== p);
	return leftmost;
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} cx
 * @param {number} cy
 * @param {number} px
 * @param {number} py
 * @returns {boolean}
 */
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
	return (
		(cx - px) * (ay - py) >= (ax - px) * (cy - py) &&
		(ax - px) * (by - py) >= (bx - px) * (ay - py) &&
		(bx - px) * (cy - py) >= (cx - px) * (by - py)
	);
}

/**
 * @param {EarcutNode} a
 * @param {EarcutNode} b
 * @returns {boolean}
 */
function isValidDiagonal(a, b) {
	return (
		a.next.i !== b.i &&
		a.prev.i !== b.i &&
		!intersectsPolygon(a, b) &&
		((locallyInside(a, b) &&
			locallyInside(b, a) &&
			middleInside(a, b) &&
			(area(a.prev, a, b.prev) !== 0 || area(a, b.prev, b) !== 0)) ||
			(equals(a, b) &&
				area(a.prev, a, a.next) > 0 &&
				area(b.prev, b, b.next) > 0))
	);
}

/**
 * @param {EarcutNode} p
 * @param {EarcutNode} q
 * @param {EarcutNode} r
 * @returns {number}
 */
function area(p, q, r) {
	return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

/**
 * @param {EarcutNode} p1
 * @param {EarcutNode} p2
 * @returns {boolean}
 */
function equals(p1, p2) {
	return p1.x === p2.x && p1.y === p2.y;
}

/**
 * @param {EarcutNode} p1
 * @param {EarcutNode} p2
 * @param {EarcutNode} p3
 * @param {EarcutNode} p4
 * @returns {boolean}
 */
function intersects(p1, p2, p3, p4) {
	const o1 = sign(area(p1, p2, p3));
	const o2 = sign(area(p1, p2, p4));
	const o3 = sign(area(p3, p4, p1));
	const o4 = sign(area(p3, p4, p2));

	if (o1 !== o2 && o3 !== o4) return true;

	if (o1 === 0 && onSegment(p1, p3, p2)) return true;
	if (o2 === 0 && onSegment(p1, p4, p2)) return true;
	if (o3 === 0 && onSegment(p3, p1, p4)) return true;
	if (o4 === 0 && onSegment(p3, p2, p4)) return true;

	return false;
}

/**
 * @param {EarcutNode} p
 * @param {EarcutNode} q
 * @param {EarcutNode} r
 * @returns {boolean}
 */
function onSegment(p, q, r) {
	return (
		q.x <= Math.max(p.x, r.x) &&
		q.x >= Math.min(p.x, r.x) &&
		q.y <= Math.max(p.y, r.y) &&
		q.y >= Math.min(p.y, r.y)
	);
}

/**
 * @param {number} n
 * @returns {number}
 */
function sign(n) {
	return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * @param {EarcutNode} a
 * @param {EarcutNode} b
 * @returns {boolean}
 */
function intersectsPolygon(a, b) {
	let p = a;
	do {
		if (
			p.i !== a.i &&
			p.next.i !== a.i &&
			p.i !== b.i &&
			p.next.i !== b.i &&
			intersects(p, p.next, a, b)
		)
			return true;
		p = p.next;
	} while (p !== a);

	return false;
}

/**
 * @param {EarcutNode} a
 * @param {EarcutNode} b
 * @returns {boolean}
 */
function locallyInside(a, b) {
	return area(a.prev, a, a.next) < 0
		? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
		: area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

/**
 * @param {EarcutNode} a
 * @param {EarcutNode} b
 * @returns {boolean}
 */
function middleInside(a, b) {
	let p = a;
	let inside = false;
	const px = (a.x + b.x) / 2;
	const py = (a.y + b.y) / 2;
	do {
		if (
			p.y > py !== p.next.y > py &&
			p.next.y !== p.y &&
			px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
		)
			inside = !inside;
		p = p.next;
	} while (p !== a);

	return inside;
}

/**
 * @param {EarcutNode} a
 * @param {EarcutNode} b
 * @returns {EarcutNode}
 */
function splitPolygon(a, b) {
	const a2 = createNode(a.i, a.x, a.y);
	const b2 = createNode(b.i, b.x, b.y);
	const an = a.next;
	const bp = b.prev;

	a.next = b;
	b.prev = a;

	a2.next = an;
	an.prev = a2;

	b2.next = a2;
	a2.prev = b2;

	bp.next = b2;
	b2.prev = bp;

	return b2;
}

/**
 * @param {number[]} data
 * @param {number} start
 * @param {number} end
 * @param {number} dim
 * @returns {number} positive = CCW winding
 */
function signedArea(data, start, end, dim) {
	let sum = 0;
	let j = end - dim;
	for (let i = start; i < end; i += dim) {
		sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
		j = i;
	}
	return sum;
}
