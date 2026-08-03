import type {
  ApiManifest,
  ApiMember,
  ApiParameter,
  ApiSignature,
  ApiSymbol,
  ApiTypeParameter,
  CompatibilityMapping,
  CompatibilityRecord,
  CompatibilityReport,
  MemberChange,
  ParameterChange,
  SignatureChange,
  SignatureDelta,
  SurfaceId,
  SymbolChanges,
  TypeParameterChange,
  VersionDiffReport,
} from "./types.ts";

/**
 * JSON.stringify is intentionally used after all arrays have been sorted by
 * the callers.  Manifest values are normalized by the extractor, so this is
 * a stable comparison without depending on source declaration ordering.
 */
function stable(value: unknown): string {
  return JSON.stringify(value);
}

function surfaceFromId(id: string): SurfaceId {
  return id.split(":", 1)[0] as SurfaceId;
}

function memberKey(member: ApiMember): string {
  return `${member.scope}:${member.name}:${member.kind}`;
}

function parameterChanges(
  source: ApiParameter,
  target: ApiParameter,
  index: number,
): ParameterChange | undefined {
  const changes: ParameterChange["changes"] = [];
  if (source.name !== target.name) {
    changes.push("name");
  }
  if (source.type !== target.type) {
    changes.push("type");
  }
  if (source.optional !== target.optional) {
    changes.push("optional");
  }
  if (source.rest !== target.rest) {
    changes.push("rest");
  }
  if (source.default !== target.default) {
    changes.push("default");
  }
  if (changes.length === 0) {
    return;
  }
  return { index, source, target, changes };
}

function typeParameterChanges(
  source: ApiTypeParameter,
  target: ApiTypeParameter,
  index: number,
): TypeParameterChange | undefined {
  const changes: TypeParameterChange["changes"] = [];
  if (source.name !== target.name) {
    changes.push("name");
  }
  if (source.constraint !== target.constraint) {
    changes.push("constraint");
  }
  if (source.default !== target.default) {
    changes.push("default");
  }
  if (changes.length === 0) {
    return;
  }
  return { index, source, target, changes };
}

function compareTypeParameters(
  source: ApiTypeParameter[],
  target: ApiTypeParameter[],
): SignatureDelta["typeParameters"] {
  const count = Math.min(source.length, target.length);
  const changed: TypeParameterChange[] = [];
  for (let index = 0; index < count; index += 1) {
    const sourceParameter = source[index];
    const targetParameter = target[index];
    if (!(sourceParameter && targetParameter)) {
      continue;
    }
    const item = typeParameterChanges(sourceParameter, targetParameter, index);
    if (item) {
      changed.push(item);
    }
  }
  return {
    added: target.slice(count),
    removed: source.slice(count),
    changed,
  };
}

export function signatureDelta(
  source: ApiSignature,
  target: ApiSignature,
): SignatureDelta {
  const parameterCount = Math.min(
    source.parameters.length,
    target.parameters.length,
  );
  const changedParameters: ParameterChange[] = [];
  const defaults: SignatureDelta["defaults"] = [];
  for (let index = 0; index < parameterCount; index += 1) {
    const sourceParameter = source.parameters[index];
    const targetParameter = target.parameters[index];
    if (!(sourceParameter && targetParameter)) {
      continue;
    }
    const changed = parameterChanges(sourceParameter, targetParameter, index);
    if (changed) {
      changedParameters.push(changed);
    }
    if (sourceParameter.default !== targetParameter.default) {
      const item: { index: number; source?: string; target?: string } = {
        index,
      };
      if (sourceParameter.default !== undefined) {
        item.source = sourceParameter.default;
      }
      if (targetParameter.default !== undefined) {
        item.target = targetParameter.default;
      }
      defaults.push(item);
    }
  }
  return {
    parameters: {
      added: target.parameters.slice(parameterCount),
      removed: source.parameters.slice(parameterCount),
      changed: changedParameters,
    },
    defaults,
    returnType: (() => {
      const item: SignatureDelta["returnType"] = {
        changed: source.returnType !== target.returnType,
      };
      if (source.returnType !== undefined) {
        item.source = source.returnType;
      }
      if (target.returnType !== undefined) {
        item.target = target.returnType;
      }
      return item;
    })(),
    typeParameters: compareTypeParameters(
      source.typeParameters ?? [],
      target.typeParameters ?? [],
    ),
  };
}

function changedSignature(
  source: ApiSignature,
  target: ApiSignature,
  sourceOverload: number,
  targetOverload: number,
): SignatureChange | undefined {
  if (stable(source) === stable(target)) {
    return;
  }
  return {
    source,
    target,
    sourceOverload,
    targetOverload,
    delta: signatureDelta(source, target),
  };
}

interface SignatureComparison {
  matched: number;
  added: ApiSignature[];
  removed: ApiSignature[];
  changed: SignatureChange[];
}

/**
 * Match overloads by normalized signature first, then pair remaining
 * overloads by position.  This keeps additions/removals explicit while
 * retaining a useful source/target payload for changed overloads.
 */
function compareSignatures(
  source: ApiSignature[],
  target: ApiSignature[],
): SignatureComparison {
  const matchedTarget = new Set<number>();
  const pairedSource = new Set<number>();
  let matched = 0;
  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    const sourceSignature = source[sourceIndex];
    if (!sourceSignature) {
      continue;
    }
    const targetIndex = target.findIndex(
      (targetSignature, index) =>
        !matchedTarget.has(index) &&
        stable(sourceSignature) === stable(targetSignature),
    );
    if (targetIndex < 0) {
      continue;
    }
    matchedTarget.add(targetIndex);
    pairedSource.add(sourceIndex);
    matched += 1;
  }
  const changed: SignatureChange[] = [];
  const unmatchedTargets = target
    .map((signature, index) => ({ signature, index }))
    .filter((item) => !matchedTarget.has(item.index));
  const unmatchedSources = source
    .map((signature, index) => ({ signature, index }))
    .filter((item) => !pairedSource.has(item.index));
  const pairCount = Math.min(unmatchedSources.length, unmatchedTargets.length);
  for (let index = 0; index < pairCount; index += 1) {
    const sourceItem = unmatchedSources[index];
    const targetItem = unmatchedTargets[index];
    if (!(sourceItem && targetItem)) {
      continue;
    }
    const item = changedSignature(
      sourceItem.signature,
      targetItem.signature,
      sourceItem.index,
      targetItem.index,
    );
    if (item) {
      changed.push(item);
    }
  }
  return {
    matched,
    added: unmatchedTargets.slice(pairCount).map((item) => item.signature),
    removed: unmatchedSources.slice(pairCount).map((item) => item.signature),
    changed,
  };
}

function memberComparable(member: ApiMember): unknown {
  const { declarationCount: _declarationCount, ...rest } = member;
  return rest;
}

function memberSignatureChanges(
  source: ApiMember,
  target: ApiMember,
): SignatureChange[] {
  const sourceSignatures = source.signatures ?? [];
  const targetSignatures = target.signatures ?? [];
  return compareSignatures(sourceSignatures, targetSignatures).changed;
}

export function symbolChanges(
  source: ApiSymbol,
  target: ApiSymbol,
): SymbolChanges {
  const sourceExtends = new Set(source.extends);
  const targetExtends = new Set(target.extends);
  const sourceImplements = new Set(source.implements);
  const targetImplements = new Set(target.implements);
  const extendsAdded = [...targetExtends]
    .filter((item) => !sourceExtends.has(item))
    .sort((a, b) => a.localeCompare(b));
  const extendsRemoved = [...sourceExtends]
    .filter((item) => !targetExtends.has(item))
    .sort((a, b) => a.localeCompare(b));
  const implementsAdded = [...targetImplements]
    .filter((item) => !sourceImplements.has(item))
    .sort((a, b) => a.localeCompare(b));
  const implementsRemoved = [...sourceImplements]
    .filter((item) => !targetImplements.has(item))
    .sort((a, b) => a.localeCompare(b));

  const sourceMembers = new Map(
    source.members.map((member) => [memberKey(member), member]),
  );
  const targetMembers = new Map(
    target.members.map((member) => [memberKey(member), member]),
  );
  const missingInTarget = [...sourceMembers.keys()]
    .filter((key) => !targetMembers.has(key))
    .sort((a, b) => a.localeCompare(b));
  const extraInTarget = [...targetMembers.keys()]
    .filter((key) => !sourceMembers.has(key))
    .sort((a, b) => a.localeCompare(b));
  const changedMembers: MemberChange[] = [];
  let matchedMembers = 0;
  for (const key of [...sourceMembers.keys()].sort((a, b) =>
    a.localeCompare(b),
  )) {
    const sourceMember = sourceMembers.get(key);
    const targetMember = targetMembers.get(key);
    if (!(sourceMember && targetMember)) {
      continue;
    }
    matchedMembers += 1;
    const signatureChanges = memberSignatureChanges(sourceMember, targetMember);
    if (
      stable(memberComparable(sourceMember)) !==
        stable(memberComparable(targetMember)) ||
      signatureChanges.length > 0
    ) {
      changedMembers.push({
        key,
        source: sourceMember,
        target: targetMember,
        signatureChanges,
      });
    }
  }
  const constructors = compareSignatures(
    source.constructors,
    target.constructors,
  );
  const callSignatures = compareSignatures(
    source.signatures,
    target.signatures,
  );
  return {
    exportName: {
      source: source.name,
      target: target.name,
      changed: source.name !== target.name,
    },
    kind: {
      source: source.kind,
      target: target.kind,
      changed: source.kind !== target.kind,
    },
    type: {
      ...(source.type !== undefined ? { source: source.type } : {}),
      ...(target.type !== undefined ? { target: target.type } : {}),
      changed: source.type !== target.type,
    },
    deprecated: {
      ...(source.deprecated !== undefined ? { source: source.deprecated } : {}),
      ...(target.deprecated !== undefined ? { target: target.deprecated } : {}),
      changed: source.deprecated !== target.deprecated,
    },
    inheritance: {
      changed:
        extendsAdded.length > 0 ||
        extendsRemoved.length > 0 ||
        implementsAdded.length > 0 ||
        implementsRemoved.length > 0,
      extends: { added: extendsAdded, removed: extendsRemoved },
      implements: { added: implementsAdded, removed: implementsRemoved },
    },
    typeParameters: compareTypeParameters(
      source.typeParameters ?? [],
      target.typeParameters ?? [],
    ),
    constructors,
    members: {
      matched: matchedMembers,
      changed: changedMembers,
      missingInTarget,
      extraInTarget,
    },
    callSignatures,
  };
}

function hasStructuralChanges(changes: SymbolChanges): boolean {
  return (
    changes.exportName.changed ||
    changes.kind.changed ||
    changes.type.changed ||
    changes.deprecated.changed ||
    changes.inheritance.changed ||
    changes.typeParameters.added.length > 0 ||
    changes.typeParameters.removed.length > 0 ||
    changes.typeParameters.changed.length > 0 ||
    changes.constructors.added.length > 0 ||
    changes.constructors.removed.length > 0 ||
    changes.constructors.changed.length > 0 ||
    changes.members.changed.length > 0 ||
    changes.members.missingInTarget.length > 0 ||
    changes.members.extraInTarget.length > 0 ||
    changes.callSignatures.added.length > 0 ||
    changes.callSignatures.removed.length > 0 ||
    changes.callSignatures.changed.length > 0
  );
}

function record(
  source: ApiSymbol,
  target: ApiSymbol | undefined,
  status: CompatibilityRecord["status"],
  notes: string[],
): CompatibilityRecord {
  const result: CompatibilityRecord = {
    source: {
      id: source.id,
      name: source.name,
      surface: surfaceFromId(source.id),
    },
    status,
    notes: [...notes].sort(),
  };
  if (target) {
    result.target = {
      id: target.id,
      name: target.name,
      surface: surfaceFromId(target.id),
    };
    result.structural = symbolChanges(source, target);
  }
  return result;
}

export interface DiffOptions {
  easelManifestPath?: string;
  threeManifestPath?: string;
}

function targetSurfaceSet(manifests: ApiManifest[]): Set<SurfaceId> {
  return new Set(manifests.map((manifest) => manifest.surface.id));
}

function curatedTargetForSurface(
  entry: CompatibilityMapping["mappings"][number] | undefined,
  surfaces: Set<SurfaceId>,
): { targetId?: string; claimsSurface: boolean; unrelated: boolean } {
  if (!entry?.target) {
    return { claimsSurface: false, unrelated: false };
  }
  const targetSurface = surfaceFromId(entry.target);
  return {
    targetId: entry.target,
    claimsSurface: surfaces.has(targetSurface),
    unrelated: !surfaces.has(targetSurface),
  };
}

export function diffManifests(
  easel: ApiManifest,
  threeInput: ApiManifest | ApiManifest[],
  mapping: CompatibilityMapping,
  paths: DiffOptions = {},
): CompatibilityReport {
  const threeManifests = Array.isArray(threeInput) ? threeInput : [threeInput];
  const three = threeManifests[0];
  if (!three) {
    throw new Error("At least one three.js manifest is required");
  }
  const surfaces = targetSurfaceSet(threeManifests);
  const allTargetSymbols = threeManifests.flatMap(
    (manifest) => manifest.symbols,
  );
  const targetById = new Map(
    allTargetSymbols.map((symbol) => [symbol.id, symbol]),
  );
  const targetByName = new Map<string, ApiSymbol[]>();
  for (const symbol of allTargetSymbols) {
    const symbols = targetByName.get(symbol.name) ?? [];
    symbols.push(symbol);
    targetByName.set(symbol.name, symbols);
  }
  for (const symbols of targetByName.values()) {
    symbols.sort((a, b) => a.id.localeCompare(b.id));
  }
  const mappingBySource = new Map(
    mapping.mappings.map((entry) => [entry.source, entry]),
  );
  const usedTargets = new Set<string>();
  const comparisons: CompatibilityRecord[] = [];
  let exactNameMatches = 0;
  let renamedMatches = 0;
  let changed = 0;
  for (const source of easel.symbols) {
    const curated = mappingBySource.get(source.id);
    const curatedSurface = curatedTargetForSurface(curated, surfaces);
    const curatedTarget = curatedSurface.targetId
      ? targetById.get(curatedSurface.targetId)
      : undefined;
    const exactTarget = targetByName.get(source.name)?.[0];
    // A mapping owned by another surface is metadata for that surface only;
    // it must never suppress this surface's exact-name comparison.
    const target = curatedSurface.claimsSurface
      ? curatedTarget
      : curatedSurface.unrelated || !curated
        ? exactTarget
        : undefined;
    if (target) {
      usedTargets.add(target.id);
    }
    if (target && target.name === source.name) {
      exactNameMatches += 1;
    }
    if (target && target.name !== source.name) {
      renamedMatches += 1;
    }
    const missingCuratedTarget =
      curatedSurface.claimsSurface &&
      Boolean(curated?.target) &&
      !curatedTarget;
    const status = missingCuratedTarget
      ? "unknown"
      : curatedSurface.claimsSurface
        ? (curated?.status ?? (target ? "unknown" : "easel-only"))
        : curatedSurface.unrelated
          ? "unknown"
          : (curated?.status ?? (target ? "unknown" : "easel-only"));
    const notes = [
      ...(curatedSurface.claimsSurface ? (curated?.notes ?? []) : []),
    ];
    if (missingCuratedTarget) {
      notes.push(
        `Curated target ${curated?.target ?? "unknown"} is missing from ${three.surface.id}`,
      );
    }
    const item = record(source, target, status, notes);
    if (item.structural && hasStructuralChanges(item.structural)) {
      changed += 1;
    }
    comparisons.push(item);
  }
  comparisons.sort((a, b) => a.source.id.localeCompare(b.source.id));
  const unmappedTargetCount = allTargetSymbols.filter(
    (symbol) => !usedTargets.has(symbol.id),
  ).length;
  return {
    schemaVersion: 1,
    generatedFrom: {
      easel: {
        surface: easel.surface.id,
        version: easel.package.version,
        manifest: paths.easelManifestPath ?? easel.surface.entrypoint,
      },
      three: {
        surface: three.surface.id,
        version: three.package.version,
        manifest: paths.threeManifestPath ?? three.surface.entrypoint,
      },
    },
    comparisons,
    summary: {
      sourceSymbols: easel.symbols.length,
      targetSymbols: allTargetSymbols.length,
      exactNameMatches,
      renamedMatches,
      added: unmappedTargetCount,
      removed: comparisons.filter((item) => !item.target).length,
      changed,
    },
  };
}

export interface VersionDiffOptions {
  sourceManifestPath?: string;
  targetManifestPath?: string;
}

export function diffManifestVersions(
  source: ApiManifest,
  target: ApiManifest,
  paths: VersionDiffOptions = {},
): VersionDiffReport {
  if (source.package.name !== target.package.name) {
    throw new Error(
      `Version diff requires the same package: ${source.package.name} versus ${target.package.name}`,
    );
  }
  if (source.surface.id !== target.surface.id) {
    throw new Error(
      `Version diff requires the same surface: ${source.surface.id} versus ${target.surface.id}`,
    );
  }
  const sourceById = new Map(
    source.symbols.map((symbol) => [symbol.id, symbol]),
  );
  const targetById = new Map(
    target.symbols.map((symbol) => [symbol.id, symbol]),
  );
  const added = [...targetById.entries()]
    .filter(([id]) => !sourceById.has(id))
    .map(([, symbol]) => symbol)
    .sort((a, b) => a.id.localeCompare(b.id));
  const removed = [...sourceById.entries()]
    .filter(([id]) => !targetById.has(id))
    .map(([, symbol]) => symbol)
    .sort((a, b) => a.id.localeCompare(b.id));
  const changed: Array<{
    id: string;
    source: ApiSymbol;
    target: ApiSymbol;
    structural: SymbolChanges;
  }> = [];
  for (const [id, sourceSymbol] of sourceById) {
    const targetSymbol = targetById.get(id);
    if (!targetSymbol) {
      continue;
    }
    const structural = symbolChanges(sourceSymbol, targetSymbol);
    if (hasStructuralChanges(structural)) {
      changed.push({
        id,
        source: sourceSymbol,
        target: targetSymbol,
        structural,
      });
    }
  }
  changed.sort((a, b) => a.id.localeCompare(b.id));
  return {
    schemaVersion: 1,
    generatedFrom: {
      source: {
        surface: source.surface.id,
        package: source.package.name,
        version: source.package.version,
        manifest: paths.sourceManifestPath ?? source.surface.entrypoint,
      },
      target: {
        surface: target.surface.id,
        package: target.package.name,
        version: target.package.version,
        manifest: paths.targetManifestPath ?? target.surface.entrypoint,
      },
    },
    symbols: { added, removed, changed },
    summary: {
      sourceSymbols: source.symbols.length,
      targetSymbols: target.symbols.length,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
    },
  };
}
