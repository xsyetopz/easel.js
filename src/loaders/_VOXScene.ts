import type { Node } from "../core/Node.ts";
import { Group } from "../objects/Group.ts";
import type {
  VOXChunk,
  VOXGroupNode,
  VOXNode,
  VOXShapeNode,
  VOXTransformNode,
} from "./VOXLoader.ts";
import { buildMesh } from "./_VOXMeshing.ts";
import { fail } from "./_VOXLoaderBinary.ts";

function applyNodeMetadata(
  object: Node,
  attributes: Readonly<Record<string, string>>,
  kind: string,
): void {
  const nameKey = "_name";
  const name = Object.hasOwn(attributes, nameKey)
    ? attributes[nameKey]
    : undefined;
  if (name !== undefined) object.name = name;
  Object.assign(object.userData, {
    vox: { type: kind, attributes: { ...attributes } },
  });
}

function applyTransform(object: Node, node: VOXTransformNode): void {
  applyNodeMetadata(object, node.attributes, node.type);
  const frame = node.frames[0];
  if (!frame) return;
  if (frame.rotation) object.applyMatrix4(frame.rotation);
  if (frame.translation) {
    object.position.set(
      frame.translation.x,
      frame.translation.z,
      -frame.translation.y,
    );
  }
}

function getChunk(chunks: readonly VOXChunk[], modelId: number): VOXChunk {
  const chunk = chunks[modelId];
  if (!chunk) fail(`shape references missing model ${modelId}.`);
  return chunk;
}

function getReference(node: VOXShapeNode): (typeof node.models)[number] {
  const reference = node.models[0];
  if (!reference) fail(`shape node ${node.id} has no model references.`);
  return reference;
}

interface BuildContext {
  readonly nodes: Readonly<Record<number, VOXNode>>;
  readonly chunks: readonly VOXChunk[];
  readonly path: Set<number>;
}

function buildTransform(
  node: VOXTransformNode,
  context: BuildContext,
): Node | null {
  const childNode = context.nodes[node.childNodeId];
  if (!childNode)
    fail(
      `transform node ${node.id} references missing child ${node.childNodeId}.`,
    );
  if (childNode.type === "shape" && childNode.models.length === 1) {
    const object = buildMesh(
      getChunk(context.chunks, getReference(childNode).modelId),
    );
    applyTransform(object, node);
    return object;
  }
  const hasTransform = node.frames.some(
    (frame) => frame.rotation || frame.translation,
  );
  if (!hasTransform) {
    const object = buildObject(node.childNodeId, context);
    if (object) applyNodeMetadata(object, node.attributes, node.type);
    return object;
  }
  const group = new Group();
  applyTransform(group, node);
  const child = buildObject(node.childNodeId, context);
  if (child) group.add(child);
  return group;
}

function buildGroup(node: VOXGroupNode, context: BuildContext): Node {
  const group = new Group();
  applyNodeMetadata(group, node.attributes, node.type);
  for (const childId of node.childIds) {
    const child = buildObject(childId, context);
    if (child) group.add(child);
  }
  return group;
}

function buildShape(node: VOXShapeNode, context: BuildContext): Node {
  if (node.models.length === 1) {
    const object = buildMesh(
      getChunk(context.chunks, getReference(node).modelId),
    );
    applyNodeMetadata(object, node.attributes, node.type);
    return object;
  }
  const group = new Group();
  applyNodeMetadata(group, node.attributes, node.type);
  for (const reference of node.models)
    group.add(buildMesh(getChunk(context.chunks, reference.modelId)));
  return group;
}

function buildObject(nodeId: number, context: BuildContext): Node | null {
  const node = context.nodes[nodeId];
  if (!node) fail(`scene references missing node ${nodeId}.`);
  if (context.path.has(nodeId))
    fail(`scene graph contains a cycle at node ${nodeId}.`);
  context.path.add(nodeId);
  let object: Node | null;
  if (node.type === "transform") object = buildTransform(node, context);
  else if (node.type === "group") object = buildGroup(node, context);
  else object = buildShape(node, context);
  context.path.delete(nodeId);
  return object;
}

/** Builds an EASEL scene-graph subtree from a decoded VOX node graph.
 *
 * @param nodeId Identifier of the node to use as the subtree root.
 * @param nodes Parsed scene-graph nodes keyed by source identifier.
 * @param chunks Decoded voxel model chunks referenced by shape nodes.
 * @returns The built node, or null when the requested root is absent.
 */
export function buildScene(
  nodeId: number,
  nodes: Readonly<Record<number, VOXNode>>,
  chunks: readonly VOXChunk[],
): Node | null {
  return buildObject(nodeId, { nodes, chunks, path: new Set() });
}
