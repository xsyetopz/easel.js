import type {
  Declaration,
  Node,
  Program,
  SourceFile,
  Symbol as TypeScriptSymbol,
  Type,
  TypeChecker,
  TypeParameter,
} from "typescript-api";

export type FactKind =
  | "class"
  | "record"
  | "const"
  | "function"
  | "constructor"
  | "field"
  | "accessor"
  | "method";

export interface PublicFact {
  subject: string;
  kind: FactKind;
  shape: string;
}

export interface ComparisonRow {
  state: "=" | "!" | "<" | ">";
  subject: string;
  kind: string;
  easel: string;
  three: string;
}

export interface ParsedDoc {
  type?: string;
  returns?: string;
  readonly: boolean;
  private: boolean;
  internal: boolean;
  params: Map<
    string,
    { type?: string; optional: boolean; rest: boolean; defaultText?: string }
  >;
}

export interface ExtractionContext {
  checker: TypeChecker;
  program: Program;
  root: SourceFile;
}

export interface SignatureLike {
  flags?: number;
  parameters: readonly TypeScriptSymbol[];
  getTypeParameters?(): readonly TypeParameter[] | undefined;
  getReturnType(): Type;
  getDeclaration(): Declaration | undefined;
}

export interface DocumentedParameter {
  name: string;
  type?: string;
  optional: boolean;
  rest: boolean;
  defaultText?: string;
}

export interface SignatureTextOptions {
  declaration?: Node;
  returnOverride?: string;
  typeContext?: Node;
  includeTypeParameters?: boolean;
}
