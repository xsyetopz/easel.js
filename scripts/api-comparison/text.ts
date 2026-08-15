import {
  TypeFormatFlags,
  canHaveModifiers,
  getModifiers,
  isNumericLiteral,
  isStringLiteral,
} from "typescript-api";
import type {
  ClassLikeDeclaration,
  Declaration,
  NamedDeclaration,
  Node,
  NodeArray,
  SourceFile,
  Symbol as TypeScriptSymbol,
  SyntaxKind,
  TypeParameterDeclaration,
} from "typescript-api";
import type { ExtractionContext, ParsedDoc } from "./types.ts";

export const GETTER_PATTERN = /^get(?<member>[A-Z].*)$/u;
export const SETTER_PATTERN = /^set(?<member>[A-Z].*)$/u;
export const INTERNAL_TAG_PATTERN = /@internal\b/u;
export const PRIVATE_TAG_PATTERN = /@private\b/u;
export const READONLY_TAG_PATTERN = /@readonly\b/u;
export const TYPE_TAG_PATTERN = /@type\s+\{/u;
export const RETURN_TAG_PATTERN = /@returns?\s+\{/u;
export const PARAM_TAG_PATTERN = /@param\s+\{/gu;
export const PARAM_NAME_PATTERN =
  /^\s+(?<name>\[[^\]]+\]|\.\.\.[\w$]+|[\w$]+)/u;
export const OPTIONAL_PARAMETER_PATTERN = /^\[|\]$/gu;
export const REST_PARAMETER_PATTERN = /^\.\.\./u;
export const DEFAULT_PARAMETER_PATTERN = /^(?<name>[^=]+)=\s*(?<default>.*)$/u;
export const MEMBER_TERMINATOR_PATTERN = /;$/u;
export const WHITESPACE_PATTERN = /\s+/gu;

export function namedCapture(
  groups: Readonly<Record<string, string>> | undefined,
  name: string,
): string | undefined {
  return groups?.[name];
}

export function normalizeWhitespace(value: string): string {
  return value.replaceAll(WHITESPACE_PATTERN, " ").trim();
}

export function sourceText(node: Node | undefined): string {
  return node ? node.getText(node.getSourceFile()) : "";
}

export function declarationName(node: Node | undefined): string {
  if (!node) return "";
  const named = node as NamedDeclaration;
  const name = named.name;
  if (!name) return "";
  return isStringLiteral(name) || isNumericLiteral(name)
    ? name.text
    : normalizeWhitespace(name.getText(name.getSourceFile()));
}

function declarationTypeParameters(
  node: Node,
): NodeArray<TypeParameterDeclaration> | undefined {
  return (
    node as Declaration & {
      typeParameters?: NodeArray<TypeParameterDeclaration>;
    }
  ).typeParameters;
}

export function typeParametersText(node: Node): string {
  const parameters = declarationTypeParameters(node);
  if (!parameters || parameters.length === 0) return "";
  return `<${parameters
    .map((parameter) =>
      normalizeWhitespace(parameter.getText(parameter.getSourceFile())),
    )
    .join(", ")}>`;
}

export function typeParameterNamesText(node: Node): string {
  const parameters = declarationTypeParameters(node);
  if (!parameters || parameters.length === 0) return "";
  return `<${parameters
    .map((parameter) =>
      normalizeWhitespace(parameter.name.getText(parameter.getSourceFile())),
    )
    .join(", ")}>`;
}

export function heritageText(node: Node): string {
  const heritageClauses = (node as ClassLikeDeclaration).heritageClauses;
  if (!heritageClauses || heritageClauses.length === 0) return "";
  return ` ${normalizeWhitespace(
    heritageClauses
      .map((clause) => clause.getText(clause.getSourceFile()))
      .join(" "),
  )}`;
}

export function hasModifier(node: Node, kind: SyntaxKind): boolean {
  return Boolean(
    canHaveModifiers(node) &&
      getModifiers(node)?.some((modifier) => modifier.kind === kind),
  );
}

export function precedingJsDoc(node: Node): string {
  const file: SourceFile = node.getSourceFile();
  const start = node.getStart(file);
  const before = file.text.slice(0, start);
  const open = before.lastIndexOf("/**");
  const close = before.lastIndexOf("*/");
  if (open < 0 || close < open) return "";
  if (before.slice(close + 2).trim() !== "") return "";
  return before.slice(open + 3, close);
}

export function balancedTagType(
  text: string,
  openingBrace: number,
): string | undefined {
  let depth = 0;
  let result: string | undefined;
  for (let index = openingBrace; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        result = normalizeWhitespace(text.slice(openingBrace + 1, index));
        break;
      }
    }
  }
  return result;
}

function parseParameterDoc(
  text: string,
  match: RegExpMatchArray,
):
  | {
      name: string;
      type: string;
      optional: boolean;
      rest: boolean;
      defaultText?: string;
    }
  | undefined {
  const index = match.index;
  if (index === undefined) return;
  const type = balancedTagType(text, index + match[0].length - 1);
  if (!type) return;
  const rest = text
    .slice(index + match[0].length + type.length + 1)
    .match(PARAM_NAME_PATTERN);
  const rawName = namedCapture(rest?.groups, "name");
  if (!rawName) return;
  const isRest = rawName.startsWith("...");
  const optional = rawName.startsWith("[");
  const clean = rawName
    .replace(OPTIONAL_PARAMETER_PATTERN, "")
    .replace(REST_PARAMETER_PATTERN, "");
  const defaultMatch = DEFAULT_PARAMETER_PATTERN.exec(clean);
  const defaultText = namedCapture(defaultMatch?.groups, "default")?.trim();
  const name = clean.split("=")[0]?.trim();
  if (!name) return;
  if (defaultText === undefined) {
    return { name, optional, rest: isRest, type };
  }
  return { defaultText, name, optional, rest: isRest, type };
}

export function parseDoc(text: string): ParsedDoc {
  const result: ParsedDoc = {
    internal: INTERNAL_TAG_PATTERN.test(text),
    params: new Map(),
    private: PRIVATE_TAG_PATTERN.test(text),
    readonly: READONLY_TAG_PATTERN.test(text),
  };
  const typeTag = TYPE_TAG_PATTERN.exec(text);
  if (typeTag) {
    const type = balancedTagType(text, typeTag.index + typeTag[0].length - 1);
    if (type) result.type = type;
  }
  const returnTag = RETURN_TAG_PATTERN.exec(text);
  if (returnTag) {
    const returns = balancedTagType(
      text,
      returnTag.index + returnTag[0].length - 1,
    );
    if (returns) result.returns = returns;
  }
  for (const match of text.matchAll(PARAM_TAG_PATTERN)) {
    const parameter = parseParameterDoc(text, match);
    if (parameter) {
      const { name, ...value } = parameter;
      result.params.set(name, value);
    }
  }
  return result;
}

export function isPrivateName(name: string): boolean {
  return name.startsWith("#");
}

export function escapeCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\t", "\\t")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n");
}

export function typeText(
  context: ExtractionContext,
  node: Node,
  preferred?: string,
): string {
  const explicit = preferred && normalizeWhitespace(preferred);
  if (explicit) return explicit;
  const docs = parseDoc(precedingJsDoc(node));
  if (docs.type) return docs.type;
  try {
    const type = context.checker.getTypeAtLocation(node);
    return normalizeWhitespace(
      context.checker.typeToString(
        type,
        node,
        TypeFormatFlags.NoTruncation |
          TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      ),
    );
  } catch {
    return "unknown";
  }
}

export function typeOfSymbol(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  node: Node,
): string {
  try {
    return normalizeWhitespace(
      context.checker.typeToString(
        context.checker.getTypeOfSymbolAtLocation(symbol, node),
        node,
        TypeFormatFlags.NoTruncation |
          TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      ),
    );
  } catch {
    return typeText(context, node);
  }
}
