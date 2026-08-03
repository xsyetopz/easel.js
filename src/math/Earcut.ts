export interface EarcutNode {
  i: number;
  x: number;
  y: number;
  prev: EarcutNode;
  next: EarcutNode;
  z: number;
  prevZ: EarcutNode | null;
  nextZ: EarcutNode | null;
  steiner: boolean;
}

/**
 * Earcut polygon triangulator.
 * MIT-licensed port of https://github.com/mapbox/earcut
 */
export function earcut(
  data: number[],
  holeIndices?: number[],
  dim = 2,
): number[] {
  const hasHoles = holeIndices != null && holeIndices.length > 0;
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  const triangles: number[] = [];

  if (!outerNode || outerNode.next === outerNode.prev) return triangles;

  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  let invSize = 0;

  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

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

function createNode(i: number, x: number, y: number): EarcutNode {
  const node = {
    i,
    x,
    y,
    z: 0,
    prevZ: null,
    nextZ: null,
    steiner: false,
  } as EarcutNode;
  node.prev = node;
  node.next = node;
  return node;
}

function insertNode(
  i: number,
  x: number,
  y: number,
  last?: EarcutNode,
): EarcutNode {
  const p = createNode(i, x, y);

  if (last) {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }
  return p;
}

function removeNode(p: EarcutNode): void {
  p.next.prev = p.prev;
  p.prev.next = p.next;

  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function linkedList(
  data: number[],
  start: number,
  end: number,
  dim: number,
  clockwise: boolean,
): EarcutNode | undefined {
  let last: EarcutNode | undefined;

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

function filterPoints(
  list: EarcutNode,
  start: EarcutNode | undefined,
): EarcutNode {
  let cur = start ?? list;

  let p = cur;
  let again: boolean;
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

function earcutLinked(
  ear: EarcutNode | undefined,
  triangles: number[],
  dim: number,
  minX: number,
  minY: number,
  invSize: number,
  pass: number,
): void {
  if (!ear) return;

  if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

  let node: EarcutNode = ear;
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

function testEar(ear: EarcutNode): boolean {
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
    ) {
      return false;
    }
    p = p.next;
  }

  return true;
}

function testEarHashed(
  ear: EarcutNode,
  minX: number,
  minY: number,
  invSize: number,
): boolean {
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
    ) {
      return false;
    }
    p = p.prevZ;

    if (
      n !== ear.prev &&
      n !== ear.next &&
      pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    ) {
      return false;
    }
    n = n.nextZ;
  }

  while (p && p.z >= minZ) {
    if (
      p !== ear.prev &&
      p !== ear.next &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    ) {
      return false;
    }
    p = p.prevZ;
  }
  while (n && n.z <= maxZ) {
    if (
      n !== ear.prev &&
      n !== ear.next &&
      pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    ) {
      return false;
    }
    n = n.nextZ;
  }

  return true;
}

function cureLocalIntersections(
  list: EarcutNode,
  triangles: number[],
  dim: number,
): EarcutNode {
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

function splitEarcut(
  ear: EarcutNode,
  triangles: number[],
  dim: number,
  minX: number,
  minY: number,
  invSize: number,
): void {
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

function eliminateHoles(
  data: number[],
  holeIndices: number[],
  outerNode: EarcutNode,
  dim: number,
): EarcutNode {
  const queue: EarcutNode[] = [];

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

function compareX(a: EarcutNode, b: EarcutNode): number {
  return a.x - b.x;
}

function eliminateHole(hole: EarcutNode, outerNode: EarcutNode): EarcutNode {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) return outerNode;

  const bridgeReverse = splitPolygon(bridge, hole);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
}

function findHoleBridge(
  hole: EarcutNode,
  outerNode: EarcutNode,
): EarcutNode | undefined {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = Number.NEGATIVE_INFINITY;
  let m: EarcutNode | undefined;

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

  if (!m) return;

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

function sectorContainsSector(m: EarcutNode, p: EarcutNode): boolean {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

function indexCurve(
  start: EarcutNode,
  minX: number,
  minY: number,
  invSize: number,
): void {
  let p = start;
  do {
    if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p = p.next;
  } while (p !== start);

  (p.prevZ as EarcutNode).nextZ = null;
  p.prevZ = null;

  sortLinked(p);
}

/** Merge sort on z-order linked list (Simon Tatham's bottom-up algorithm). */
function sortLinked(list: EarcutNode): EarcutNode {
  let inSize = 1;
  let numMerges: number;
  let result: EarcutNode = list;

  do {
    let p: EarcutNode | null = result;
    let head: EarcutNode | null = null;
    let tail: EarcutNode | null = null;
    numMerges = 0;

    while (p) {
      numMerges++;
      let q: EarcutNode | null = p;
      let pSize = 0;
      for (let i = 0; i < inSize; i++) {
        pSize++;
        q = q.nextZ;
        if (!q) break;
      }
      let qSize = inSize;

      while (pSize > 0 || (qSize > 0 && q)) {
        let e: EarcutNode;
        if (pSize !== 0 && (qSize === 0 || !q || (p as EarcutNode).z <= q.z)) {
          e = p as EarcutNode;
          p = e.nextZ;
          pSize--;
        } else {
          e = q as EarcutNode;
          q = (q as EarcutNode).nextZ;
          qSize--;
        }

        if (tail) tail.nextZ = e;
        else head = e;

        e.prevZ = tail;
        tail = e;
      }

      p = q;
    }

    (tail as EarcutNode).nextZ = null;
    inSize *= 2;
    result = head as EarcutNode;
  } while (numMerges > 1);

  return result;
}

function zOrder(
  x: number,
  y: number,
  minX: number,
  minY: number,
  invSize: number,
): number {
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

function getLeftmost(p: EarcutNode): EarcutNode {
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

function pointInTriangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  px: number,
  py: number,
): boolean {
  return (
    (cx - px) * (ay - py) >= (ax - px) * (cy - py) &&
    (ax - px) * (by - py) >= (bx - px) * (ay - py) &&
    (bx - px) * (cy - py) >= (cx - px) * (by - py)
  );
}

function isValidDiagonal(a: EarcutNode, b: EarcutNode): boolean {
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

function area(p: EarcutNode, q: EarcutNode, r: EarcutNode): number {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function equals(p1: EarcutNode, p2: EarcutNode): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}

function intersects(
  p1: EarcutNode,
  p2: EarcutNode,
  p3: EarcutNode,
  p4: EarcutNode,
): boolean {
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

function onSegment(p: EarcutNode, q: EarcutNode, r: EarcutNode): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function intersectsPolygon(a: EarcutNode, b: EarcutNode): boolean {
  let p = a;
  do {
    if (
      p.i !== a.i &&
      p.next.i !== a.i &&
      p.i !== b.i &&
      p.next.i !== b.i &&
      intersects(p, p.next, a, b)
    ) {
      return true;
    }
    p = p.next;
  } while (p !== a);

  return false;
}

function locallyInside(a: EarcutNode, b: EarcutNode): boolean {
  return area(a.prev, a, a.next) < 0
    ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
    : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

function middleInside(a: EarcutNode, b: EarcutNode): boolean {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    if (
      p.y > py !== p.next.y > py &&
      p.next.y !== p.y &&
      px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
    ) {
      inside = !inside;
    }
    p = p.next;
  } while (p !== a);

  return inside;
}

function splitPolygon(a: EarcutNode, b: EarcutNode): EarcutNode {
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

/** @returns positive = CCW winding */
function signedArea(
  data: number[],
  start: number,
  end: number,
  dim: number,
): number {
  let sum = 0;
  let j = end - dim;
  for (let i = start; i < end; i += dim) {
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i;
  }
  return sum;
}
