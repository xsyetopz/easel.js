import { describe, expect, it } from "bun:test";
import { Object3D } from "three";
import { Node } from "../../src/core/Node.ts";
import { Matrix4 } from "../../src/math/Matrix4.ts";
import { Quaternion } from "../../src/math/Quaternion.ts";
import { Vector3 } from "../../src/math/Vector3.ts";

const SELF_KEY = "self";

describe("Node", () => {
  class TestNode extends Node {
    updateCalls = 0;

    override updateMatrix(): void {
      this.updateCalls++;
      super.updateMatrix();
    }
  }

  it("assigns incrementing ids", () => {
    const a = new Node();
    const b = new Node();
    expect(b.id).toBe(a.id + 1);
  });

  it("has expected defaults", () => {
    const node = new Node();
    expect(node.type).toBe("Node");
    expect(node.name).toBe("");
    expect(node.parent).toBeUndefined();
    expect(node.children).toEqual([]);
    expect(node.visible).toBe(true);
    expect(node.uuid).toMatch(/^[0-9a-f-]{36}$/u);
    expect(node.up).toEqual(new Vector3(0, 1, 0));
    expect(node.pivot).toBeUndefined();
  });

  it("add sets parent and pushes child", () => {
    const parent = new Node();
    const child = new Node();
    parent.add(child);
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
  });

  it("adds and removes multiple children in one mutation", () => {
    const parent = new Node();
    const first = new Node();
    const second = new Node();
    expect(parent.add(first, second, parent)).toBe(parent);
    expect(parent.children).toEqual([first, second]);
    expect(first.parent).toBe(parent);
    expect(second.parent).toBe(parent);
    expect(parent.remove(first, second)).toBe(parent);
    expect(parent.children).toEqual([]);
    expect(first.parent).toBeUndefined();
    expect(second.parent).toBeUndefined();
  });

  it("add re-parents child from previous parent", () => {
    const p1 = new Node();
    const p2 = new Node();
    const child = new Node();
    p1.add(child);
    p2.add(child);
    expect(child.parent).toBe(p2);
    expect(p1.children).not.toContain(child);
  });

  it("remove clears parent and splices children", () => {
    const parent = new Node();
    const child = new Node();
    parent.add(child);
    child.matrixWorldNeedsUpdate = false;
    parent.remove(child);
    expect(child.parent).toBeUndefined();
    expect(child.matrixWorldNeedsUpdate).toBe(true);
    expect(parent.children).not.toContain(child);
  });

  it("add(self) is a no-op", () => {
    const node = new Node();
    node.add(node);
    expect(node.children).toHaveLength(0);
  });

  it("traverse visits self and all descendants", () => {
    const root = new Node();
    const child = new Node();
    const grandchild = new Node();
    root.add(child);
    child.add(grandchild);
    const visited: Node[] = [];
    root.traverse((n) => visited.push(n));
    expect(visited).toEqual([root, child, grandchild]);
  });

  it("traverseVisible skips invisible nodes and their subtrees", () => {
    const root = new Node();
    const child = new Node();
    const grandchild = new Node();
    root.add(child);
    child.add(grandchild);
    child.visible = false;
    const visited: Node[] = [];
    root.traverseVisible((n) => visited.push(n));
    expect(visited).toEqual([root]);
  });

  it("provides canonical hierarchy queries and ancestor traversal", () => {
    const root = new Node();
    const first = new Node();
    const second = new Node();
    first.name = "match";
    second.name = "match";
    root.add(first);
    first.add(second);

    expect(root.getObjectById(second.id)).toBe(second);
    expect(root.getObjectByName("match")).toBe(first);
    expect(root.getObjectsByProperty("name", "match")).toEqual([first, second]);

    const ancestors: Node[] = [];
    second.traverseAncestors((node) => ancestors.push(node));
    expect(ancestors).toEqual([first, root]);
  });

  it("clears and removes hierarchy links without aliases", () => {
    const root = new Node();
    const first = new Node();
    const second = new Node();
    root.add(first);
    root.add(second);
    expect(first.removeFromParent()).toBe(first);
    expect(first.parent).toBeUndefined();
    expect(root.clear()).toBe(root);
    expect(root.children).toEqual([]);
    expect(second.parent).toBeUndefined();
  });

  it("updateMatrix composes position/rotation/scale into matrix", () => {
    const node = new Node();
    node.position.set(1, 2, 3);
    node.updateMatrix();
    const elems = node.matrix.elements;
    // Translation is in column 3 (indices 12, 13, 14 in column-major)
    expect(elems[12]).toBeCloseTo(1);
    expect(elems[13]).toBeCloseTo(2);
    expect(elems[14]).toBeCloseTo(3);
  });

  it("composes an explicit pivot into the local matrix", () => {
    const node = new Node();
    node.pivot = new Vector3(1, 0, 0);
    node.rotateZ(Math.PI / 2);
    node.updateMatrix();
    expect(node.matrix.elements[12]).toBeCloseTo(1);
    expect(node.matrix.elements[13]).toBeCloseTo(-1);
  });

  it("updateMatrixWorld without parent copies matrix to matrixWorld", () => {
    const node = new TestNode();
    node.updateCalls = 0;
    node.position.set(5, 0, 0);
    node.updateMatrixWorld(false, false);
    expect(node.updateCalls).toBe(1);
    expect(node.matrixWorld.elements[12]).toBeCloseTo(5);

    // Subsequent update without changes should not re-compose local matrix.
    node.updateMatrixWorld(false, false);
    expect(node.updateCalls).toBe(1);
  });

  it("updateMatrixWorld propagates parent transform to child", () => {
    const parent = new TestNode();
    const child = new TestNode();
    parent.add(child);
    parent.updateCalls = 0;
    child.updateCalls = 0;
    parent.position.set(10, 0, 0);
    child.position.set(1, 0, 0);
    parent.updateMatrixWorld(false, true);
    expect(parent.updateCalls).toBe(1);
    expect(child.updateCalls).toBe(1);
    expect(child.matrixWorld.elements[12]).toBeCloseTo(11);

    // Parent-only motion should not force child local recomposition on next frame.
    parent.position.x = 12;
    parent.updateMatrixWorld(false, true);
    expect(parent.updateCalls).toBe(2);
    expect(child.updateCalls).toBe(1);
    expect(child.matrixWorld.elements[12]).toBeCloseTo(13);
  });

  it("updateMatrixWorld copies parent matrix when child local transform is identity", () => {
    const parent = new Node();
    const child = new Node();
    parent.add(child);
    parent.position.set(10, 0, 0);
    parent.updateMatrixWorld(false, true);
    expect(child.matrixWorld.elements[12]).toBeCloseTo(10);
  });

  it("updateMatrixWorld(updateChildren=false) marks children dirty", () => {
    const parent = new Node();
    const child = new Node();
    parent.add(child);
    parent.position.set(10, 0, 0);
    parent.updateMatrixWorld(false, false);
    expect(child.matrixWorldNeedsUpdate).toBe(true);

    child.updateMatrixWorld(false, false);
    expect(child.matrixWorld.elements[12]).toBeCloseTo(10);
  });

  it("clone returns new node with same position", () => {
    const node = new Node();
    node.position.set(3, 4, 5);
    node.name = "orig";
    const c = node.clone();
    expect(c).not.toBe(node);
    expect(c.name).toBe("orig");
    expect(c.position.x).toBeCloseTo(3);
  });

  it("clone with recursive=true copies children", () => {
    const node = new Node();
    const child = new Node();
    child.name = "kid";
    node.add(child);
    const c = node.clone();
    expect(c.children).toHaveLength(1);
    expect(c.children[0].name).toBe("kid");
    expect(c.children[0]).not.toBe(child);
  });

  it("rejects non-finite values at the serialized JSON boundary", () => {
    const node = new Node();
    node.position.x = Number.NaN;
    expect(() => node.toJSON()).toThrow("finite");

    node.position.x = 0;
    node.userData = {
      custom: {
        toJSON: () => Number.POSITIVE_INFINITY,
      },
    };
    expect(() => node.toJSON()).toThrow("finite");
  });

  it("preserves cyclic user-data failure instead of silently coercing it", () => {
    const node = new Node();
    const userData: Record<string, unknown> = {};
    userData[SELF_KEY] = userData;
    node.userData = userData;

    expect(() => node.toJSON()).toThrow(TypeError);
  });

  it("matrixWorldAutoUpdate defaults to true", () => {
    expect(new Node().matrixWorldAutoUpdate).toBe(true);
  });

  it("matrixAutoUpdate controls automatic local-matrix rebuilding", () => {
    const node = new Node();
    expect(node.matrixAutoUpdate).toBe(true);
    expect("autoUpdateMatrix" in node).toBe(false);
    node.matrixAutoUpdate = false;
    expect(node.matrixAutoUpdate).toBe(false);
  });

  it("copy preserves static transform flags", () => {
    const source = new Node();
    source.matrixAutoUpdate = false;
    source.matrixWorldAutoUpdate = false;
    source.frustumCulled = false;
    const copy = new Node().copy(source, false);
    expect(copy.matrixAutoUpdate).toBe(false);
    expect(copy.matrixWorldAutoUpdate).toBe(false);
    expect(copy.frustumCulled).toBe(false);
  });

  it("matrixWorldAutoUpdate=false skips child in updateMatrixWorld", () => {
    const parent = new Node();
    const child = new Node();
    parent.add(child);
    parent.position.set(10, 0, 0);
    child.position.set(1, 0, 0);
    child.matrixWorldAutoUpdate = false;
    parent.updateMatrixWorld(false, true);
    // Child world matrix should still be at construction default (identity + compose(0,0,0))
    expect(child.matrixWorld.elements[12]).toBeCloseTo(0);
  });

  it("lookAt rotates node to face target", () => {
    const node = new TestNode();
    node.updateCalls = 0;
    node.lookAt(1, 0, 0);
    expect(node.updateCalls).toBe(0);
    // quaternion should be non-identity after lookAt
    const q = node.quaternion;
    const isIdentity =
      Math.abs(q.x) < 1e-6 &&
      Math.abs(q.y) < 1e-6 &&
      Math.abs(q.z) < 1e-6 &&
      Math.abs(q.w - 1) < 1e-6;
    expect(isIdentity).toBe(false);
  });

  it("applies local rotations and translations explicitly", () => {
    const node = new Node();
    expect(node.rotateY(Math.PI / 2)).toBe(node);
    expect(node.translateZ(2)).toBe(node);
    expect(node.position.x).toBeCloseTo(2);
    expect(node.position.z).toBeCloseTo(0);

    node.setRotationFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    node.translateX(3);
    expect(node.position.y).toBeCloseTo(3);
  });

  it("matches locked THREE.js local transform semantics", () => {
    const node = new Node();
    const THREENode = new Object3D();
    node.rotateY(0.75).translateZ(3).rotateX(-0.2).translateY(1.5);
    THREENode.rotateY(0.75).translateZ(3).rotateX(-0.2).translateY(1.5);

    expect(node.position.x).toBeCloseTo(THREENode.position.x);
    expect(node.position.y).toBeCloseTo(THREENode.position.y);
    expect(node.position.z).toBeCloseTo(THREENode.position.z);
    expect(node.quaternion.x).toBeCloseTo(THREENode.quaternion.x);
    expect(node.quaternion.y).toBeCloseTo(THREENode.quaternion.y);
    expect(node.quaternion.z).toBeCloseTo(THREENode.quaternion.z);
    expect(node.quaternion.w).toBeCloseTo(THREENode.quaternion.w);
  });

  it("applies matrices and quaternions to the canonical TRS state", () => {
    const node = new Node();
    node.position.set(1, 0, 0);
    node.applyMatrix4(new Matrix4().makeTranslation(2, 3, 4));
    expect(node.position).toEqual(new Vector3(3, 3, 4));

    const rotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI,
    );
    expect(node.applyQuaternion(rotation)).toBe(node);
    expect(Math.abs(node.quaternion.y)).toBeCloseTo(1);
  });

  it("reads world transforms without updating matrices implicitly", () => {
    const node = new Node();
    node.position.set(4, 5, 6);
    expect(node.getWorldPosition(new Vector3())).toEqual(new Vector3());

    node.updateMatrixWorld(false, false);
    expect(node.getWorldPosition(new Vector3())).toEqual(new Vector3(4, 5, 6));
    expect(node.getWorldScale(new Vector3())).toEqual(new Vector3(1, 1, 1));
    expect(node.getWorldQuaternion(new Quaternion())).toEqual(new Quaternion());
    expect(node.getWorldDirection(new Vector3())).toEqual(new Vector3(0, 0, 1));

    const world = node.localToWorld(new Vector3(1, 0, 0));
    expect(world).toEqual(new Vector3(5, 5, 6));
    expect(node.worldToLocal(world)).toEqual(new Vector3(1, 0, 0));
  });

  it("attaches using prepared world matrices without implicit updates", () => {
    const oldParent = new Node();
    const newParent = new Node();
    const child = new Node();
    oldParent.position.x = 4;
    newParent.position.x = 10;
    child.position.x = 2;
    oldParent.add(child);
    oldParent.updateMatrixWorld(false, true);
    newParent.updateMatrixWorld(false, false);

    newParent.attach(child);
    expect(child.parent).toBe(newParent);
    expect(child.position.x).toBeCloseTo(-4);
    newParent.updateMatrixWorld(false, true);
    expect(child.getWorldPosition(new Vector3()).x).toBeCloseTo(6);
  });
});
