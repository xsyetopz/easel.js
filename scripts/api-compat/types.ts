export const MANIFEST_SCHEMA_VERSION = 1 as const;
export const COMPATIBILITY_SCHEMA_VERSION = 1 as const;

export type SurfaceId =
  | "easel"
  | "three-core"
  | "three-addons"
  | "three-webgpu"
  | "three-tsl";

export type SymbolKind =
  | "class"
  | "interface"
  | "enum"
  | "function"
  | "variable"
  | "constant"
  | "type"
  | "namespace"
  | "unknown";

export type MemberKind =
  | "property"
  | "accessor"
  | "method"
  | "constructor"
  | "call"
  | "index";
export type MemberScope = "instance" | "static" | "type";

export interface ApiParameter {
  name: string;
  type: string;
  optional: boolean;
  rest: boolean;
  default?: string;
}

export interface ApiTypeParameter {
  name: string;
  constraint?: string;
  default?: string;
}

export interface ApiSignature {
  parameters: ApiParameter[];
  returnType?: string;
  typeParameters?: ApiTypeParameter[];
}

export interface ApiMember {
  name: string;
  kind: MemberKind;
  scope: MemberScope;
  optional: boolean;
  readonly: boolean;
  static: boolean;
  type?: string;
  access?: "get" | "set" | "get-set";
  signatures?: ApiSignature[];
  declarationCount?: number;
  deprecated?: string;
}

export interface ApiSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  exportKind: "named" | "default" | "namespace";
  module?: string;
  extends: string[];
  implements: string[];
  typeParameters: ApiTypeParameter[];
  constructors: ApiSignature[];
  signatures: ApiSignature[];
  members: ApiMember[];
  type?: string;
  deprecated?: string;
  description?: string;
  source?: string;
}

export interface ManifestExport {
  name: string;
  id: string;
  kind: SymbolKind;
  source?: string;
}

export interface ManifestFile {
  path: string;
  hash: string;
}

export interface ApiManifest {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  manifestVersion: string;
  package: {
    name: string;
    version: string;
  };
  surface: {
    id: SurfaceId;
    name: string;
    entrypoint: string;
    sourceRoot: string;
  };
  exports: ManifestExport[];
  symbols: ApiSymbol[];
  provenance: {
    extractor: string;
    compiler: string;
    entrypoint: string;
    files: ManifestFile[];
  };
}

export const SEMANTIC_STATUSES = [
  "exact",
  "shape-compatible",
  "adapted",
  "partial",
  "conceptual",
  "unsupported",
  "easel-only",
  "unknown",
] as const;
export type SemanticStatus = (typeof SEMANTIC_STATUSES)[number];

export interface MappingEntry {
  source: string;
  target?: string;
  status: SemanticStatus;
  notes: string[];
}

export interface CompatibilityMapping {
  schemaVersion: typeof COMPATIBILITY_SCHEMA_VERSION;
  mappings: MappingEntry[];
}

export interface ParameterChange {
  index: number;
  source: ApiParameter;
  target: ApiParameter;
  changes: Array<"name" | "type" | "optional" | "rest" | "default">;
}

export interface TypeParameterChange {
  index: number;
  source: ApiTypeParameter;
  target: ApiTypeParameter;
  changes: Array<"name" | "constraint" | "default">;
}

export interface SignatureDelta {
  parameters: {
    added: ApiParameter[];
    removed: ApiParameter[];
    changed: ParameterChange[];
  };
  defaults: Array<{ index: number; source?: string; target?: string }>;
  returnType: { source?: string; target?: string; changed: boolean };
  typeParameters: {
    added: ApiTypeParameter[];
    removed: ApiTypeParameter[];
    changed: TypeParameterChange[];
  };
}

export interface SignatureChange {
  source?: ApiSignature;
  target?: ApiSignature;
  sourceOverload?: number;
  targetOverload?: number;
  delta: SignatureDelta;
}

export interface MemberChange {
  key: string;
  source: ApiMember;
  target: ApiMember;
  signatureChanges: SignatureChange[];
}

export interface SymbolChanges {
  exportName: { source: string; target: string; changed: boolean };
  kind: { source: SymbolKind; target: SymbolKind; changed: boolean };
  type: { source?: string; target?: string; changed: boolean };
  deprecated: { source?: string; target?: string; changed: boolean };
  inheritance: {
    changed: boolean;
    extends: { added: string[]; removed: string[] };
    implements: { added: string[]; removed: string[] };
  };
  typeParameters: SignatureDelta["typeParameters"];
  constructors: {
    matched: number;
    added: ApiSignature[];
    removed: ApiSignature[];
    changed: SignatureChange[];
  };
  members: {
    matched: number;
    changed: MemberChange[];
    missingInTarget: string[];
    extraInTarget: string[];
  };
  callSignatures: {
    matched: number;
    added: ApiSignature[];
    removed: ApiSignature[];
    changed: SignatureChange[];
  };
}

export interface CompatibilityRecord {
  source: { id: string; name: string; surface: SurfaceId };
  target?: { id: string; name: string; surface: SurfaceId };
  status: SemanticStatus;
  notes: string[];
  structural?: SymbolChanges;
}

export interface CompatibilityReport {
  schemaVersion: typeof COMPATIBILITY_SCHEMA_VERSION;
  generatedFrom: {
    easel: { surface: SurfaceId; version: string; manifest: string };
    three: { surface: SurfaceId; version: string; manifest: string };
  };
  comparisons: CompatibilityRecord[];
  summary: {
    sourceSymbols: number;
    targetSymbols: number;
    exactNameMatches: number;
    renamedMatches: number;
    added: number;
    removed: number;
    changed: number;
  };
}

export interface VersionDiffReport {
  schemaVersion: typeof COMPATIBILITY_SCHEMA_VERSION;
  generatedFrom: {
    source: {
      surface: SurfaceId;
      package: string;
      version: string;
      manifest: string;
    };
    target: {
      surface: SurfaceId;
      package: string;
      version: string;
      manifest: string;
    };
  };
  symbols: {
    added: ApiSymbol[];
    removed: ApiSymbol[];
    changed: Array<{
      id: string;
      source: ApiSymbol;
      target: ApiSymbol;
      structural: SymbolChanges;
    }>;
  };
  summary: {
    sourceSymbols: number;
    targetSymbols: number;
    added: number;
    removed: number;
    changed: number;
  };
}

export interface ExtractOptions {
  packageName: string;
  packageVersion: string;
  surface: SurfaceId;
  entrypoint: string;
  sourceRoot: string;
  rootFile: string;
  packageRoot?: string;
  compilerOptions?: Record<string, unknown>;
}
