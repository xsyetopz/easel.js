import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";
import * as ts from "typescript";

type FactKind =
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

interface ParsedDoc {
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

interface ExtractionContext {
  checker: ts.TypeChecker;
  program: ts.Program;
  root: ts.SourceFile;
}

interface SignatureLike {
  flags?: number;
  parameters: readonly ts.Symbol[];
  getTypeParameters?(): readonly ts.TypeParameter[] | undefined;
  getReturnType(): ts.Type;
  getDeclaration(): ts.Declaration | undefined;
}

// TypeScript's internal SignatureFlags enum is not exposed by its declaration file.
const SIGNATURE_HAS_REST_PARAMETER = 1;

const ROOT = path.resolve(import.meta.dir, "..");
const EASEL_ROOT = path.join(ROOT, "src", "index.ts");
const THREE_SOURCE_ROOT = path.join(ROOT, "node_modules", "three", "src");
const THREE_ENTRY = path.join(THREE_SOURCE_ROOT, "Three.Core.js");
const OUTPUT = path.join(ROOT, "api-comparison", "three-core.txt");

const compilerOptions: ts.CompilerOptions = {
  allowJs: true,
  allowImportingTsExtensions: true,
  checkJs: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true,
  skipLibCheck: true,
  strictNullChecks: true,
  target: ts.ScriptTarget.ES2022,
};

function normalizeWhitespace(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Escape report cells after all source/type text has been normalized. */
export function escapeCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\t", "\\t")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n");
}

function sourceText(node: ts.Node | undefined): string {
  return node ? node.getText(node.getSourceFile()) : "";
}

function declarationName(node: ts.Node | undefined): string {
  if (!node) return "";
  const named = node as ts.NamedDeclaration;
  const name = named.name;
  if (!name) return "";
  return ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : normalizeWhitespace(name.getText(name.getSourceFile()));
}

function typeParametersText(node: ts.Node): string {
  const parameters = (
    node as ts.Declaration & {
      typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
    }
  ).typeParameters;
  return parameters?.length
    ? `<${parameters.map((parameter) => normalizeWhitespace(parameter.getText(parameter.getSourceFile()))).join(", ")}>`
    : "";
}

function typeParameterNamesText(node: ts.Node): string {
  const parameters = (
    node as ts.Declaration & {
      typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
    }
  ).typeParameters;
  return parameters?.length
    ? `<${parameters.map((parameter) => normalizeWhitespace(parameter.name.getText(parameter.getSourceFile()))).join(", ")}>`
    : "";
}

function signatureTypeParametersText(
  context: ExtractionContext,
  signature: SignatureLike,
  node: ts.Node,
): string {
  const parameters = signature.getTypeParameters?.();
  if (!parameters?.length) return "";
  const text = parameters.map((parameter) => {
    const declaration = parameter.symbol?.declarations?.find(
      ts.isTypeParameterDeclaration,
    );
    if (declaration)
      return normalizeWhitespace(
        declaration.getText(declaration.getSourceFile()),
      );
    const name = parameter.symbol?.name ?? "T";
    const constraint = parameter.getConstraint();
    const defaultType = parameter.getDefault();
    const constraintText = constraint
      ? normalizeWhitespace(
          context.checker.typeToString(
            constraint,
            node,
            ts.TypeFormatFlags.NoTruncation |
              ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          ),
        )
      : "";
    const defaultText = defaultType
      ? normalizeWhitespace(
          context.checker.typeToString(
            defaultType,
            node,
            ts.TypeFormatFlags.NoTruncation |
              ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          ),
        )
      : "";
    return `${name}${constraintText && constraintText !== "any" ? ` extends ${constraintText}` : ""}${defaultText && defaultText !== "any" ? ` = ${defaultText}` : ""}`;
  });
  return `<${text.join(", ")}>`;
}

function heritageText(node: ts.Node): string {
  const heritageClauses = (node as ts.ClassLikeDeclaration).heritageClauses;
  return heritageClauses?.length
    ? ` ${normalizeWhitespace(heritageClauses.map((clause) => clause.getText(clause.getSourceFile())).join(" "))}`
    : "";
}

function isPrivateName(name: string): boolean {
  return name.startsWith("#");
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === kind),
  );
}

function precedingJsDoc(node: ts.Node): string {
  const file = node.getSourceFile();
  const start = node.getStart(file);
  const before = file.text.slice(0, start);
  const open = before.lastIndexOf("/**");
  const close = before.lastIndexOf("*/");
  if (open < 0 || close < open) return "";
  if (before.slice(close + 2).trim() !== "") return "";
  return before.slice(open + 3, close);
}

function balancedTagType(
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

function parseDoc(text: string): ParsedDoc {
  const result: ParsedDoc = {
    internal: /@internal\b/u.test(text),
    params: new Map(),
    private: /@private\b/u.test(text),
    readonly: /@readonly\b/u.test(text),
  };
  const typeTag = /@type\s+\{/u.exec(text);
  if (typeTag) {
    const type = balancedTagType(text, typeTag.index + typeTag[0].length - 1);
    if (type) result.type = type;
  }
  const returnTag = /@returns?\s+\{/u.exec(text);
  if (returnTag) {
    const returns = balancedTagType(
      text,
      returnTag.index + returnTag[0].length - 1,
    );
    if (returns) result.returns = returns;
  }
  for (const match of text.matchAll(/@param\s+\{/gu)) {
    const type = balancedTagType(text, match.index + match[0].length - 1);
    if (!type) continue;
    const rest = text
      .slice(match.index + match[0].length + type.length + 1)
      .match(/^\s+(\[[^\]]+\]|\.\.\.[\w$]+|[\w$]+)/u);
    if (!rest) continue;
    const rawName = rest[1]!;
    const isRest = rawName.startsWith("...");
    const optional = rawName.startsWith("[");
    const clean = rawName.replace(/^\[|\]$/gu, "").replace(/^\.\.\./u, "");
    const defaultMatch = /^([^=]+)=\s*(.*)$/u.exec(clean);
    const parameter: {
      type: string;
      optional: boolean;
      rest: boolean;
      defaultText?: string;
    } = { optional, rest: isRest, type };
    if (defaultMatch?.[2]) parameter.defaultText = defaultMatch[2].trim();
    result.params.set(clean.split("=")[0]!.trim(), parameter);
  }
  return result;
}

function typeText(
  context: ExtractionContext,
  node: ts.Node,
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
        ts.TypeFormatFlags.NoTruncation |
          ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      ),
    );
  } catch {
    return "unknown";
  }
}

function typeOfSymbol(
  context: ExtractionContext,
  symbol: ts.Symbol,
  node: ts.Node,
): string {
  try {
    return normalizeWhitespace(
      context.checker.typeToString(
        context.checker.getTypeOfSymbolAtLocation(symbol, node),
        node,
        ts.TypeFormatFlags.NoTruncation |
          ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      ),
    );
  } catch {
    return typeText(context, node);
  }
}

function isOptionalParameter(
  node: ts.ParameterDeclaration,
  docs: ParsedDoc,
): boolean {
  return Boolean(
    node.questionToken ||
      node.initializer ||
      node.dotDotDotToken ||
      docs.params.get(declarationName(node))?.optional,
  );
}

function parameterText(
  context: ExtractionContext,
  node: ts.ParameterDeclaration,
  docs = parseDoc(precedingJsDoc(node.parent)),
  typeOverride?: string,
): string {
  const name = declarationName(node) || "arg";
  const documented = ts.isIdentifier(node.name)
    ? docs.params.get(node.name.text)
    : undefined;
  const type = typeText(
    context,
    node,
    typeOverride ??
      node.type?.getText(node.getSourceFile()) ??
      documented?.type,
  );
  const optional = isOptionalParameter(node, docs);
  const rest = Boolean(node.dotDotDotToken);
  const defaultText = node.initializer
    ? normalizeWhitespace(sourceText(node.initializer))
    : documented?.defaultText;
  const prefix = rest ? "..." : "";
  const question = optional && !rest && !defaultText ? "?" : "";
  const defaultSuffix = defaultText ? ` = ${defaultText}` : "";
  return `${prefix}${name}${question}: ${type}${defaultSuffix}`;
}

function fallbackParameterText(
  context: ExtractionContext,
  symbol: ts.Symbol,
  index: number,
  declaration: ts.Node,
  docs: ParsedDoc,
  documented?: {
    name: string;
    type?: string;
    optional: boolean;
    rest: boolean;
    defaultText?: string;
  },
  signatureRest = false,
  typeContext?: ts.Node,
): string {
  const parameter = symbol.valueDeclaration;
  if (parameter && ts.isParameter(parameter)) {
    const contextualType =
      parameter.getSourceFile() === (typeContext ?? declaration).getSourceFile()
        ? undefined
        : typeOfSymbol(context, symbol, typeContext ?? declaration);
    return parameterText(context, parameter, docs, contextualType);
  }
  const type = documented?.type ?? typeOfSymbol(context, symbol, declaration);
  const optional =
    documented?.optional ?? Boolean(symbol.flags & ts.SymbolFlags.Optional);
  const rest = signatureRest || Boolean(documented?.rest);
  const defaultText = documented?.defaultText;
  const name = documented?.name ?? symbol.name ?? `arg${index}`;
  const question = optional && !rest && !defaultText ? "?" : "";
  return `${rest ? "..." : ""}${name}${question}: ${type}${defaultText ? ` = ${defaultText}` : ""}`;
}

function signatureText(
  context: ExtractionContext,
  signature: SignatureLike,
  declaration?: ts.Node,
  returnOverride?: string,
  typeContext?: ts.Node,
  includeTypeParameters = true,
): string {
  const declarationNode =
    declaration ?? signature.getDeclaration() ?? context.root;
  const docs = parseDoc(precedingJsDoc(declarationNode));
  const orderedDocs = [...docs.params.entries()].map(([name, value]) => ({
    name,
    ...value,
  }));
  const signatureRest = Boolean(
    (signature.flags ?? 0) & SIGNATURE_HAS_REST_PARAMETER,
  );
  const usedDocs = new Set<string>();
  const parameters = signature.parameters.map((parameter, index) => {
    const byName = orderedDocs.find(
      (item) => item.name === parameter.name && !usedDocs.has(item.name),
    );
    const byPosition = orderedDocs.find((item) => !usedDocs.has(item.name));
    const documented = byName ?? byPosition;
    if (documented) usedDocs.add(documented.name);
    return fallbackParameterText(
      context,
      parameter,
      index,
      declarationNode,
      docs,
      documented,
      signatureRest && index === signature.parameters.length - 1,
      typeContext,
    );
  });
  for (const documented of orderedDocs) {
    if (usedDocs.has(documented.name)) continue;
    parameters.push(
      `${documented.rest ? "..." : ""}${documented.name}${documented.optional && !documented.rest && !documented.defaultText ? "?" : ""}: ${documented.type ?? "unknown"}${documented.defaultText ? ` = ${documented.defaultText}` : ""}`,
    );
  }
  let returnType = returnOverride;
  if (!returnType) {
    const docs = parseDoc(precedingJsDoc(declarationNode));
    returnType = docs.returns;
  }
  if (!returnType) {
    try {
      returnType = normalizeWhitespace(
        context.checker.typeToString(
          signature.getReturnType(),
          declarationNode,
          ts.TypeFormatFlags.NoTruncation |
            ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
        ),
      );
    } catch {
      returnType = "unknown";
    }
  }
  const typeParameters = includeTypeParameters
    ? signatureTypeParametersText(context, signature, declarationNode)
    : "";
  return `${typeParameters}(${parameters.join(", ")}) => ${returnType}`;
}

function signatureList(
  context: ExtractionContext,
  declarations: readonly ts.Node[],
  callType: ts.Type,
  returnOverride?: string,
): string {
  const results: string[] = [];
  for (const declaration of declarations) {
    if (!ts.isFunctionLike(declaration)) continue;
    const signature = context.checker.getSignatureFromDeclaration(declaration);
    if (signature)
      results.push(
        signatureText(context, signature, declaration, returnOverride),
      );
  }
  if (results.length === 0) {
    for (const signature of context.checker.getSignaturesOfType(
      callType,
      ts.SignatureKind.Call,
    )) {
      results.push(
        signatureText(
          context,
          signature,
          signature.getDeclaration(),
          returnOverride,
        ),
      );
    }
  }
  const unique = [...new Set(results)];
  return unique.length > 0 ? unique.map(String).join(" | ") : "() => unknown";
}

function isUsableDeclaration(node: ts.Node): boolean {
  return !(isDocOnlyDeclaration(node) || ts.isExportSpecifier(node));
}

function importedExport(
  context: ExtractionContext,
  file: ts.SourceFile,
  name: string,
): ts.Symbol | undefined {
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (!(bindings && ts.isNamedImports(bindings))) continue;
    for (const element of bindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (importedName !== name) continue;
      const moduleSymbol = context.checker.getSymbolAtLocation(
        statement.moduleSpecifier,
      );
      const exported =
        moduleSymbol &&
        context.checker
          .getExportsOfModule(moduleSymbol)
          .find((item) => item.name === importedName);
      if (exported) return exported;
    }
  }
}

function localDeclaration(
  context: ExtractionContext,
  file: ts.SourceFile,
  name: string,
): ts.Symbol | undefined {
  for (const statement of file.statements) {
    if (declarationName(statement) !== name) continue;
    const nameNode = (statement as unknown as ts.NamedDeclaration).name;
    const symbol = nameNode
      ? context.checker.getSymbolAtLocation(nameNode)
      : context.checker.getSymbolAtLocation(statement);
    if (symbol) return symbol;
  }
}

function resolveExport(
  context: ExtractionContext,
  symbol: ts.Symbol,
  seen = new Set<ts.Symbol>(),
): ts.Symbol {
  if (seen.has(symbol)) return symbol;
  seen.add(symbol);
  const target =
    symbol.flags & ts.SymbolFlags.Alias
      ? context.checker.getAliasedSymbol(symbol)
      : symbol;
  if (target.declarations?.some(isUsableDeclaration)) return target;
  for (const declaration of symbol.declarations ?? []) {
    const local = localDeclaration(
      context,
      declaration.getSourceFile(),
      symbol.name,
    );
    if (local && local !== symbol) {
      const resolved = resolveExport(context, local, seen);
      if (resolved.declarations?.some(isUsableDeclaration)) return resolved;
    }
    const imported = importedExport(
      context,
      declaration.getSourceFile(),
      symbol.name,
    );
    if (imported) {
      const resolved = resolveExport(context, imported, seen);
      if (resolved.declarations?.some(isUsableDeclaration)) return resolved;
    }
    const sourceModule = context.checker.getSymbolAtLocation(
      declaration.getSourceFile(),
    );
    const modules = sourceModule ? [sourceModule] : [];
    if (ts.isExportSpecifier(declaration)) {
      const exportDeclaration = declaration.parent.parent;
      if (
        ts.isExportDeclaration(exportDeclaration) &&
        exportDeclaration.moduleSpecifier
      ) {
        const moduleSymbol = context.checker.getSymbolAtLocation(
          exportDeclaration.moduleSpecifier,
        );
        if (moduleSymbol) modules.push(moduleSymbol);
      }
    }
    for (const moduleSymbol of modules) {
      const direct = context.checker
        .getExportsOfModule(moduleSymbol)
        .find((item) => item.name === symbol.name && item !== symbol);
      if (!direct) continue;
      const resolved = resolveExport(context, direct, seen);
      if (resolved.declarations?.some(isUsableDeclaration)) return resolved;
    }
  }
  return target;
}

function declarationFor(symbol: ts.Symbol): ts.Declaration | undefined {
  return symbol.valueDeclaration ?? symbol.declarations?.[0];
}

function declarationMatching(
  symbol: ts.Symbol,
  predicate: (declaration: ts.Declaration) => boolean,
): ts.Declaration | undefined {
  return symbol.declarations?.find(predicate);
}

function isDocOnlyDeclaration(node: ts.Node): boolean {
  return (
    node.kind === ts.SyntaxKind.JSDocTypedefTag ||
    node.kind === ts.SyntaxKind.JSDocCallbackTag
  );
}

function publicDeclaration(node: ts.Node | undefined, name: string): boolean {
  if (!node || isPrivateName(name) || isDocOnlyDeclaration(node)) return false;
  if (
    hasModifier(node, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(node, ts.SyntaxKind.ProtectedKeyword)
  )
    return false;
  const docs = parseDoc(precedingJsDoc(node));
  return !(docs.private || docs.internal);
}

function publicSymbol(symbol: ts.Symbol, name: string): boolean {
  const declarations = (symbol.declarations ?? []).filter(
    (declaration) =>
      !(ts.isExportSpecifier(declaration) || isDocOnlyDeclaration(declaration)),
  );
  return (
    declarations.length > 0 &&
    declarations.every((declaration) => publicDeclaration(declaration, name))
  );
}

function isNodeWithin(node: ts.Node, container: ts.Node): boolean {
  const source = node.getSourceFile();
  return (
    source === container.getSourceFile() &&
    node.getStart(source) >= container.getStart(container.getSourceFile()) &&
    node.getEnd() <= container.getEnd()
  );
}

function isOwnedClassMember(
  context: ExtractionContext,
  classDeclaration: ts.Declaration,
  node: ts.Node,
  scope: "instance" | "static",
): boolean {
  if (isNodeWithin(node, classDeclaration)) return true;
  if (
    scope !== "static" ||
    !ts.isPropertyAccessExpression(node) ||
    !ts.isBinaryExpression(node.parent) ||
    node.parent.left !== node ||
    !ts.isIdentifier(node.expression)
  )
    return false;
  const ownerSymbol = context.checker.getSymbolAtLocation(node.expression);
  if (!ownerSymbol) return false;
  const resolvedOwner =
    ownerSymbol.flags & ts.SymbolFlags.Alias
      ? context.checker.getAliasedSymbol(ownerSymbol)
      : ownerSymbol;
  return (resolvedOwner.declarations ?? []).some((candidate) =>
    isNodeWithin(candidate, classDeclaration),
  );
}

function recordShape(
  context: ExtractionContext,
  symbol: ts.Symbol,
  declaration: ts.Declaration,
): string {
  if (ts.isInterfaceDeclaration(declaration)) {
    const typeParameters = typeParametersText(declaration);
    const members = declaration.members.map((member) =>
      normalizeWhitespace(
        member.getText(member.getSourceFile()).replace(/;$/u, ""),
      ),
    );
    return `interface${typeParameters}${heritageText(declaration)} { ${members.join("; ")} }`;
  }
  if (ts.isTypeAliasDeclaration(declaration)) {
    const typeParameters = typeParametersText(declaration);
    return `type${typeParameters} = ${normalizeWhitespace(declaration.type.getText(declaration.getSourceFile()))}`;
  }
  return `record = ${typeOfSymbol(context, symbol, declaration)}`;
}

function exportFacts(context: ExtractionContext): PublicFact[] {
  const moduleSymbol = context.checker.getSymbolAtLocation(context.root);
  if (!moduleSymbol)
    throw new Error(`Cannot resolve module symbol: ${context.root.fileName}`);
  const facts: PublicFact[] = [];
  for (const exported of context.checker.getExportsOfModule(moduleSymbol)) {
    const symbol = resolveExport(context, exported);
    const name = exported.name;
    if (!publicSymbol(symbol, name)) continue;
    const declaration = declarationFor(symbol);
    if (symbol.flags & ts.SymbolFlags.Class) {
      const typeParameters =
        declaration && ts.isClassDeclaration(declaration)
          ? typeParametersText(declaration)
          : "";
      facts.push({
        kind: "class",
        shape: `class${typeParameters}${declaration && ts.isClassDeclaration(declaration) ? heritageText(declaration) : ""}`,
        subject: name,
      });
      if (declaration)
        facts.push(...classFacts(context, symbol, declaration, name));
    }
    if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
      const recordDeclaration = declarationMatching(
        symbol,
        (item) =>
          ts.isInterfaceDeclaration(item) || ts.isTypeAliasDeclaration(item),
      );
      if (!recordDeclaration) continue;
      facts.push({
        kind: "record",
        shape: recordShape(context, symbol, recordDeclaration),
        subject: name,
      });
    }
    if (symbol.flags & ts.SymbolFlags.Function) {
      const functionDeclaration = declarationMatching(
        symbol,
        ts.isFunctionDeclaration,
      );
      if (!functionDeclaration) continue;
      const type = context.checker.getTypeOfSymbolAtLocation(
        symbol,
        functionDeclaration,
      );
      facts.push({
        kind: "function",
        shape: signatureList(context, symbol.declarations ?? [], type),
        subject: name,
      });
      continue;
    }
    if (
      symbol.flags &
      (ts.SymbolFlags.Variable |
        ts.SymbolFlags.BlockScopedVariable |
        ts.SymbolFlags.ConstEnum)
    ) {
      const valueDeclaration = declarationFor(symbol);
      if (!valueDeclaration) continue;
      facts.push({
        kind: "const",
        shape: `const ${typeOfSymbol(context, symbol, valueDeclaration)}`,
        subject: name,
      });
    }
  }
  return facts;
}

function memberDocs(declarations: readonly ts.Node[]): ParsedDoc {
  const merged: ParsedDoc = {
    internal: false,
    params: new Map(),
    private: false,
    readonly: false,
  };
  for (const declaration of declarations) {
    const docs = parseDoc(precedingJsDoc(declaration));
    merged.readonly ||= docs.readonly;
    merged.private ||= docs.private;
    merged.internal ||= docs.internal;
    if (docs.type) merged.type = docs.type;
    if (docs.returns) merged.returns = docs.returns;
    for (const [name, parameter] of docs.params)
      merged.params.set(name, parameter);
  }
  return merged;
}

function fieldShape(
  context: ExtractionContext,
  symbol: ts.Symbol,
  declarations: readonly ts.Node[],
  scope: string,
): string {
  const docs = memberDocs(declarations);
  let readonly = docs.readonly;
  for (const declaration of declarations)
    readonly ||= hasModifier(declaration, ts.SyntaxKind.ReadonlyKeyword);
  const mode = readonly ? "ro" : "rw";
  const declaration = declarations[0] ?? context.root;
  const type = docs.type ?? typeOfSymbol(context, symbol, declaration);
  return `${scope} ${mode} ${type}`;
}

function accessorShape(
  context: ExtractionContext,
  symbol: ts.Symbol,
  declarations: readonly ts.Node[],
  scope: string,
): string {
  const readable = declarations.some((declaration) =>
    ts.isGetAccessorDeclaration(declaration),
  );
  const writable = declarations.some((declaration) =>
    ts.isSetAccessorDeclaration(declaration),
  );
  const mode = readable && writable ? "rw" : readable ? "r" : "w";
  const declaration = declarations[0] ?? context.root;
  const docs = memberDocs(declarations);
  const type = docs.type ?? typeOfSymbol(context, symbol, declaration);
  return `${scope} ${mode} ${type}`;
}

function classFacts(
  context: ExtractionContext,
  symbol: ts.Symbol,
  declaration: ts.Declaration,
  owner: string,
): PublicFact[] {
  const facts: PublicFact[] = [];
  const genericOwner = `${owner}${ts.isClassDeclaration(declaration) ? typeParameterNamesText(declaration) : ""}`;
  const instanceType = context.checker.getDeclaredTypeOfSymbol(symbol);
  const staticType = context.checker.getTypeOfSymbolAtLocation(
    symbol,
    declaration,
  );
  const constructorSignatures = context.checker.getSignaturesOfType(
    staticType,
    ts.SignatureKind.Construct,
  );
  const constructorDeclarations = constructorSignatures
    .map((signature) => signature.getDeclaration())
    .filter((item): item is ts.SignatureDeclaration => Boolean(item));
  const constructorsPublic = constructorDeclarations.every((item) =>
    publicDeclaration(item, "constructor"),
  );
  const constructors =
    constructorSignatures.length > 0 && constructorsPublic
      ? constructorSignatures.map((signature) =>
          signatureText(
            context,
            signature,
            signature.getDeclaration(),
            genericOwner,
            declaration,
            false,
          ),
        )
      : constructorsPublic
        ? [`() => ${genericOwner}`]
        : [];
  if (constructors.length > 0)
    facts.push({
      kind: "constructor",
      shape: `instance ${[...new Set(constructors)].join(" | ")}`,
      subject: `${owner}.constructor`,
    });

  const addMembers = (type: ts.Type, scope: "instance" | "static") => {
    for (const member of context.checker.getPropertiesOfType(type)) {
      const name = member.name;
      if (name === "prototype" || isPrivateName(name)) continue;
      const allDeclarations = (member.declarations ?? []).filter(
        (node) =>
          !isDocOnlyDeclaration(node) &&
          isOwnedClassMember(context, declaration, node, scope),
      );
      if (allDeclarations.some((node) => !publicDeclaration(node, name)))
        continue;
      const declarations = allDeclarations.filter((node) =>
        publicDeclaration(node, name),
      );
      if (declarations.length === 0) continue;
      const subject = `${owner}.${name}`;
      const declarationKinds = declarations.map((node) => node.kind);
      if (
        declarationKinds.some(
          (kind) =>
            kind === ts.SyntaxKind.GetAccessor ||
            kind === ts.SyntaxKind.SetAccessor,
        )
      ) {
        facts.push({
          kind: "accessor",
          shape: accessorShape(context, member, declarations, scope),
          subject,
        });
        continue;
      }
      if (
        declarationKinds.some(
          (kind) =>
            kind === ts.SyntaxKind.MethodDeclaration ||
            kind === ts.SyntaxKind.MethodSignature,
        )
      ) {
        const callType = context.checker.getTypeOfSymbolAtLocation(
          member,
          declarations[0]!,
        );
        facts.push({
          kind: "method",
          shape: `${scope} ${signatureList(context, declarations, callType, memberDocs(declarations).returns)}`,
          subject,
        });
        continue;
      }
      facts.push({
        kind: "field",
        shape: fieldShape(context, member, declarations, scope),
        subject,
      });
    }
  };
  addMembers(instanceType, "instance");
  addMembers(staticType, "static");
  return facts;
}

function makeProgram(rootNames: readonly string[]): ts.Program {
  return ts.createProgram(rootNames, compilerOptions);
}

function extractSide(root: string, roots: readonly string[]): PublicFact[] {
  const program = makeProgram(roots);
  const source = program.getSourceFile(root);
  if (!source) throw new Error(`Cannot read API entrypoint: ${root}`);
  return exportFacts({
    checker: program.getTypeChecker(),
    program,
    root: source,
  });
}

function factSort(left: PublicFact, right: PublicFact): number {
  return (
    lexicalCompare(left.subject, right.subject) ||
    lexicalCompare(left.kind, right.kind) ||
    lexicalCompare(left.shape, right.shape)
  );
}

function rowSort(left: ComparisonRow, right: ComparisonRow): number {
  const stateOrder: Record<ComparisonRow["state"], number> = {
    "=": 0,
    "!": 1,
    "<": 2,
    ">": 3,
  };
  return (
    lexicalCompare(left.subject, right.subject) ||
    lexicalCompare(left.kind, right.kind) ||
    stateOrder[left.state] - stateOrder[right.state] ||
    lexicalCompare(left.easel, right.easel) ||
    lexicalCompare(left.three, right.three)
  );
}

export function compareFacts(
  easelFacts: readonly PublicFact[],
  threeFacts: readonly PublicFact[],
): ComparisonRow[] {
  const easel = [...easelFacts].sort(factSort);
  const three = [...threeFacts].sort(factSort);
  const bySubject = new Map<
    string,
    { easel: PublicFact[]; three: PublicFact[] }
  >();
  for (const fact of easel)
    (
      bySubject.get(fact.subject) ??
      (bySubject.set(fact.subject, { easel: [], three: [] }),
      bySubject.get(fact.subject)!)
    ).easel.push(fact);
  for (const fact of three)
    (
      bySubject.get(fact.subject) ??
      (bySubject.set(fact.subject, { easel: [], three: [] }),
      bySubject.get(fact.subject)!)
    ).three.push(fact);
  const rows: ComparisonRow[] = [];
  for (const [subject, group] of bySubject) {
    const usedEasel = new Set<number>();
    const usedThree = new Set<number>();
    for (let index = 0; index < group.easel.length; index += 1) {
      const left = group.easel[index]!;
      const rightIndex = group.three.findIndex(
        (candidate, candidateIndex) =>
          !usedThree.has(candidateIndex) && candidate.kind === left.kind,
      );
      if (rightIndex < 0) continue;
      const right = group.three[rightIndex]!;
      usedEasel.add(index);
      usedThree.add(rightIndex);
      rows.push({
        easel: left.shape,
        kind: left.kind,
        state: left.shape === right.shape ? "=" : "!",
        subject,
        three: right.shape,
      });
    }
    const unmatchedEasel = group.easel
      .map((fact, index) => ({ fact, index }))
      .filter((item) => !usedEasel.has(item.index));
    const unmatchedThree = group.three
      .map((fact, index) => ({ fact, index }))
      .filter((item) => !usedThree.has(item.index));
    const pairCount = Math.min(unmatchedEasel.length, unmatchedThree.length);
    for (let index = 0; index < pairCount; index += 1) {
      const left = unmatchedEasel[index]!.fact;
      const right = unmatchedThree[index]!.fact;
      rows.push({
        easel: left.shape,
        kind:
          left.kind === right.kind ? left.kind : `${left.kind}/${right.kind}`,
        state: "!",
        subject,
        three: right.shape,
      });
    }
    for (const item of unmatchedEasel.slice(pairCount))
      rows.push({
        easel: item.fact.shape,
        kind: item.fact.kind,
        state: "<",
        subject,
        three: "-",
      });
    for (const item of unmatchedThree.slice(pairCount))
      rows.push({
        easel: "-",
        kind: item.fact.kind,
        state: ">",
        subject,
        three: item.fact.shape,
      });
  }
  return rows.sort(rowSort);
}

function packageVersion(packagePath: string): string {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
    name?: string;
    version?: string;
  };
  return `${packageJson.name ?? "unknown"}@${packageJson.version ?? "unknown"}`;
}

export function formatReport(
  rows: readonly ComparisonRow[],
  easelVersion: string,
  threeVersion: string,
): string {
  const header = [
    `# EASEL=${easelVersion}\tTHREE=${threeVersion}\tentry=src/Three.Core.js`,
    "# columns: state\tsubject\tkind\tEASEL\tTHREE",
    "# state: = both; < EASEL-only; > THREE-only; ! same name but different public shape; EASEL limits: CPU/Canvas2D; affine UV; baked flat/Gouraud; no GPU/shader/PBR/shadow/environment-map surface; limits do not describe THREE core",
  ];
  // Keep the format intentionally line-oriented: all source/type text stays in cells.
  return `${header.join("\n")}\n${rows
    .map((row) =>
      [row.state, row.subject, row.kind, row.easel, row.three]
        .map(escapeCell)
        .join("\t"),
    )
    .join("\n")}\n`;
}

export function generateReport(): string {
  if (!fs.existsSync(EASEL_ROOT))
    throw new Error(`Missing EASEL entrypoint: ${EASEL_ROOT}`);
  if (!fs.existsSync(THREE_ENTRY))
    throw new Error(`Missing three entrypoint: ${THREE_ENTRY}`);
  const easelRoots = ts.sys.readDirectory(
    path.join(ROOT, "src"),
    [".ts", ".tsx"],
    undefined,
    ["**/*"],
  );
  const threeRoots = ts.sys.readDirectory(
    THREE_SOURCE_ROOT,
    [".js"],
    undefined,
    ["**/*"],
  );
  const easelFacts = extractSide(EASEL_ROOT, [
    EASEL_ROOT,
    ...easelRoots.filter((root) => root !== EASEL_ROOT),
  ]);
  const threeFacts = extractSide(THREE_ENTRY, threeRoots);
  const rows = compareFacts(easelFacts, threeFacts);
  return formatReport(
    rows,
    packageVersion(path.join(ROOT, "package.json")),
    packageVersion(path.join(ROOT, "node_modules", "three", "package.json")),
  );
}

function main(): void {
  const report = generateReport();
  const check = process.argv.includes("--check");
  if (check) {
    const current = fs.existsSync(OUTPUT)
      ? fs.readFileSync(OUTPUT, "utf8")
      : "";
    if (current !== report) {
      console.error(
        "api-comparison/three-core.txt is stale; run bun run api:compare",
      );
      process.exitCode = 1;
    }
  } else {
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    const temporary = `${OUTPUT}.tmp-${process.pid}`;
    fs.writeFileSync(temporary, report, "utf8");
    fs.renameSync(temporary, OUTPUT);
  }
  process.stdout.write(report);
}

if (import.meta.main) main();
