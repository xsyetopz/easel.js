import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { ts } from "ts-morph";
import type {
  ApiManifest,
  ApiMember,
  ApiParameter,
  ApiSignature,
  ApiSymbol,
  ExtractOptions,
  ManifestExport,
  ManifestFile,
  MemberKind,
  MemberScope,
  SurfaceId,
  SymbolKind,
} from "./types.ts";
import { MANIFEST_SCHEMA_VERSION } from "./types.ts";

const EXTRACTOR_VERSION = "easel-api-compat/2.0";
const SURFACE_NAMES: Record<SurfaceId, string> = {
  easel: "EASEL root",
  "three-core": "three.js core",
  "three-addons": "three.js addons",
  "three-webgpu": "three.js WebGPU",
  "three-tsl": "three.js TSL",
};
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const pathText = (value: string): string => value.replaceAll("\\", "/");

interface ResolvedDeclaration {
  symbol: ts.Symbol;
  node?: ts.Node;
}

type CachedSymbolShape = Omit<
  ApiSymbol,
  "id" | "name" | "exportKind" | "module"
>;

interface ExtractionContext {
  checker: ts.TypeChecker;
  program: ts.Program;
  packageRoot: string;
  declarations: Map<ts.Symbol, ResolvedDeclaration>;
  symbolShapes: Map<ts.Symbol, CachedSymbolShape>;
  typeStrings: Map<ts.Node, string>;
  files: Map<string, ManifestFile[]>;
  namedDeclarations?: Map<string, ts.Node>;
  tslExports?: Map<string, ResolvedDeclaration>;
}

interface ExtractBatchOptions {
  timings?: boolean;
}

function packagePath(file: string, packageRoot: string): string {
  return pathText(relative(packageRoot, resolve(file)));
}

function nodeName(node: ts.Node | undefined): string {
  if (!node) {
    return "unknown";
  }
  const text = node.getText(node.getSourceFile());
  return text.replace(/^['"]|['"]$/gu, "");
}

function stableMemberName(name: string): string {
  return name.replace(/^__#\d+@#/u, "#").replace(/^__#\d+@/u, "");
}

function declarationName(node: ts.Node): string {
  return nodeName((node as ts.NamedDeclaration).name) || "default";
}

function nodeText(node: ts.Node | undefined): string | undefined {
  return node
    ? node.getText(node.getSourceFile()).replaceAll(/\s+/gu, " ").trim()
    : undefined;
}

function parameterDefault(node: ts.Expression): string | undefined {
  const text = nodeText(node);
  return text === "void 0" || text === "undefined" ? "undefined" : text;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === kind),
  );
}

function hasJSDocTag(node: ts.Node, names: readonly string[]): boolean {
  const source = node.getSourceFile();
  const leading = source.text.slice(node.getFullStart(), node.getStart(source));
  return names.some((name) => new RegExp(`@${name}\\b`, "u").test(leading));
}

function isPrivateDeclaration(node: ts.Node): boolean {
  const name = stableMemberName(nodeName((node as ts.NamedDeclaration).name));
  return (
    name.startsWith("#") ||
    (node.getSourceFile().fileName.endsWith(".js") && name.startsWith("_")) ||
    hasModifier(node, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(node, ts.SyntaxKind.ProtectedKeyword) ||
    hasJSDocTag(node, ["private", "internal"])
  );
}

function jsDocText(node: ts.Node): string {
  const source = node.getSourceFile();
  return source.text.slice(node.getFullStart(), node.getStart(source));
}

function balancedTypeAt(
  text: string,
  openingBrace: number,
): { type: string; end: number } | void {
  let depth = 0;
  for (let index = openingBrace; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          type: text.slice(openingBrace + 1, index).trim(),
          end: index + 1,
        };
      }
    }
  }
}

function jsDocParameters(
  text: string,
): Map<string, { type: string; optional: boolean }> {
  const result = new Map<string, { type: string; optional: boolean }>();
  for (const match of text.matchAll(/@param\s+\{/gu)) {
    const parsed = balancedTypeAt(text, match.index + match[0].length - 1);
    if (!parsed) continue;
    const nameMatch = /^\s*(\[)?([A-Za-z_$][\w$]*)/u.exec(
      text.slice(parsed.end),
    );
    if (nameMatch) {
      result.set(nameMatch[2]!, {
        type: parsed.type,
        optional: Boolean(nameMatch[1]),
      });
    }
  }
  return result;
}

function jsDocReturnType(text: string): string | undefined {
  const match = /@returns?\s+\{/u.exec(text);
  return match
    ? balancedTypeAt(text, match.index + match[0].length - 1)?.type
    : undefined;
}

function precedingJsDoc(text: string, offset: number): string {
  const start = text.lastIndexOf("/**", offset);
  if (start < 0) return "";
  const end = text.indexOf("*/", start);
  if (end < 0 || end > offset || text.slice(end + 2, offset).trim()) return "";
  return text.slice(start + 3, end);
}

function declarationLooksLikeClass(node: ts.Node): boolean {
  return /^class(?:\s+|\s*\{)/u.test(nodeText(node) ?? "");
}

function declarationLooksLikeFunction(node: ts.Node): boolean {
  return /^(?:async\s+)?function(?:\s+|\s*\*)/u.test(nodeText(node) ?? "");
}

function deprecated(node: ts.Node): string | undefined {
  const source = node.getSourceFile();
  const leading = source.text.slice(node.getFullStart(), node.getStart(source));
  const match = /@deprecated(?:\s+([^\r\n*][^\r\n]*))?/u.exec(leading);
  if (!match) {
    return;
  }
  return match[1]?.trim() || "deprecated";
}

function symbolKind(node: ts.Node | undefined): SymbolKind {
  if (!node) {
    return "unknown";
  }
  if (ts.isClassDeclaration(node) || declarationLooksLikeClass(node)) {
    return "class";
  }
  if (ts.isInterfaceDeclaration(node)) {
    return "interface";
  }
  if (ts.isEnumDeclaration(node)) {
    return "enum";
  }
  if (ts.isFunctionDeclaration(node) || declarationLooksLikeFunction(node)) {
    return "function";
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return "type";
  }
  if (ts.isModuleDeclaration(node)) {
    return "namespace";
  }
  if (ts.isVariableDeclaration(node)) {
    return /^[A-Z][A-Z0-9_]*$/u.test(declarationName(node))
      ? "constant"
      : "variable";
  }
  return "unknown";
}

function typeString(context: ExtractionContext, node: ts.Node): string {
  const previous = context.typeStrings.get(node);
  if (previous) {
    return previous;
  }
  try {
    const type = context.checker.getTypeAtLocation(node);
    const value = type
      ? pathText(
          context.checker.typeToString(
            type,
            node,
            ts.TypeFormatFlags.NoTruncation |
              ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          ),
        )
          .replaceAll(/\s+/gu, " ")
          .trim() || "unknown"
      : "unknown";
    context.typeStrings.set(node, value);
    return value;
  } catch {
    return "unknown";
  }
}

function parameter(node: ts.ParameterDeclaration): ApiParameter {
  const initializer = node.initializer;
  const rest = Boolean(node.dotDotDotToken);
  return {
    name: nodeName(node.name),
    type: node.type?.getText(node.getSourceFile()) ?? "unknown",
    optional: Boolean(node.questionToken || initializer || rest),
    rest,
    ...(initializer
      ? {
          default:
            parameterDefault(initializer) ??
            initializer.getText(node.getSourceFile()),
        }
      : {}),
  };
}

function typeParameters(
  node: ts.Node,
): NonNullable<ApiSignature["typeParameters"]> {
  const parameters = (
    node as ts.Declaration & {
      typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
    }
  ).typeParameters;
  if (!parameters?.length) {
    return [];
  }
  return parameters.map((parameter) => {
    const constraint = parameter.constraint?.getText(parameter.getSourceFile());
    const defaultType = parameter.default?.getText(parameter.getSourceFile());
    return {
      name: nodeName(parameter.name),
      ...(constraint ? { constraint } : {}),
      ...(defaultType ? { default: defaultType } : {}),
    };
  });
}

function signature(node: ts.SignatureDeclaration): ApiSignature {
  const docs = jsDocText(node);
  const documentedParameters = jsDocParameters(docs);
  const result: ApiSignature = {
    parameters: node.parameters.map((item) => {
      const value = parameter(item);
      const documented = documentedParameters.get(value.name);
      value.type =
        item.type?.getText(item.getSourceFile()) ??
        documented?.type ??
        "unknown";
      value.optional ||= documented?.optional ?? false;
      return value;
    }),
  };
  const returnType =
    node.type?.getText(node.getSourceFile()) ?? jsDocReturnType(docs);
  if (returnType) {
    result.returnType = returnType;
  }
  const generics = typeParameters(node);
  if (generics.length > 0) {
    result.typeParameters = generics;
  }
  return result;
}

function signatureFromType(
  context: ExtractionContext,
  item: ts.Signature,
): ApiSignature {
  const declaration = item.getDeclaration();
  if (declaration && ts.isFunctionLike(declaration)) {
    return signature(declaration);
  }
  return {
    parameters: item.parameters.map((parameterSymbol) => {
      const declaration = parameterSymbol.valueDeclaration;
      return declaration && ts.isParameter(declaration)
        ? parameter(declaration)
        : {
            name: parameterSymbol.name,
            type: parameterSymbol.valueDeclaration
              ? typeString(context, parameterSymbol.valueDeclaration)
              : "unknown",
            optional: Boolean(parameterSymbol.flags & ts.SymbolFlags.Optional),
            rest: false,
          };
    }),
  };
}

function signaturesFromType(
  context: ExtractionContext,
  node: ts.Node,
  construct: boolean,
): ApiSignature[] {
  let type: ts.Type;
  try {
    type = context.checker.getTypeAtLocation(node);
  } catch {
    // Some JSDoc-created synthetic declarations have no parent. They are
    // valid exports but cannot be queried through getTypeAtLocation.
    return [];
  }
  return context.checker
    .getSignaturesOfType(
      type,
      construct ? ts.SignatureKind.Construct : ts.SignatureKind.Call,
    )
    .map((item) => signatureFromType(context, item));
}

function callableInitializerSignature(
  node: ts.VariableDeclaration,
): ApiSignature | void {
  const initializer = node.initializer;
  if (!initializer) return;
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return signature(initializer);
  }
  const text = initializer.getText(node.getSourceFile());
  const fixedLength = /\.setParameterLength\(\s*(\d+)\s*\)/u.exec(text);
  if (fixedLength) {
    return {
      parameters: Array.from(
        { length: Number(fixedLength[1]) },
        (_, index) => ({
          name: `arg${index}`,
          type: "unknown",
          optional: false,
          rest: false,
        }),
      ),
      returnType: "unknown",
    };
  }
  if (
    /^(?:\/\*@__PURE__\*\/\s*)?(?:new\s+ConvertType|(?:nodeProxy|nodeProxyIntent|Fn)\s*\()/u.test(
      text,
    )
  ) {
    return {
      parameters: [
        {
          name: "params",
          type: "unknown[]",
          optional: true,
          rest: true,
        },
      ],
      returnType: "unknown",
    };
  }
}

function overloadSignatures(
  symbol: ts.Symbol,
  fallback: ts.FunctionDeclaration,
): ApiSignature[] {
  const declarations = (symbol.declarations ?? []).filter(
    (declaration): declaration is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(declaration) ||
      declarationLooksLikeFunction(declaration),
  );
  const selected =
    declarations.length > 1
      ? declarations.filter((declaration) => !declaration.body)
      : declarations;
  const values = (selected.length ? selected : [fallback]).map((declaration) =>
    signature(declaration),
  );
  const unique = new Map<string, ApiSignature>();
  for (const value of values) {
    unique.set(JSON.stringify(value), value);
  }
  return [...unique.values()];
}

function memberKind(node: ts.Node): MemberKind | undefined {
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
    return "method";
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    return "accessor";
  }
  if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
    return "property";
  }
  if (ts.isCallSignatureDeclaration(node)) {
    return "call";
  }
  if (ts.isConstructSignatureDeclaration(node)) {
    return "constructor";
  }
  return ts.isIndexSignatureDeclaration(node) ? "index" : undefined;
}

function member(node: ts.Node, scope: MemberScope): ApiMember | undefined {
  const kind = memberKind(node);
  if (!kind || kind === "constructor" || isPrivateDeclaration(node)) {
    return;
  }
  const staticMember = hasModifier(node, ts.SyntaxKind.StaticKeyword);
  const item: ApiMember = {
    name: stableMemberName(nodeName((node as ts.NamedDeclaration).name)),
    kind,
    scope: staticMember ? "static" : scope,
    optional: Boolean((node as ts.PropertyDeclaration).questionToken),
    readonly: hasModifier(node, ts.SyntaxKind.ReadonlyKeyword),
    static: staticMember,
  };
  if (
    kind === "method" ||
    kind === "call" ||
    kind === "index" ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    item.signatures = [signature(node as ts.SignatureDeclaration)];
  } else {
    item.type =
      (node as ts.PropertyDeclaration).type?.getText(node.getSourceFile()) ??
      "unknown";
  }
  if (kind === "accessor") {
    item.access = ts.isGetAccessorDeclaration(node) ? "get" : "set";
  }
  const tag = deprecated(node);
  if (tag) {
    item.deprecated = tag;
  }
  return item;
}

function constructorProperties(node: ts.Node): ApiMember[] {
  const sourceFile = node.getSourceFile();
  if (!sourceFile.fileName.endsWith(".js")) {
    return [];
  }
  const text = sourceFile.text.slice(node.pos, node.end);
  const names = new Set<string>();
  const propertyTypes = new Map<string, string>();
  const methods = new Map<string, ApiMember>();
  const signatureFromText = (
    parametersText: string,
    docs: string,
  ): ApiSignature => {
    const documentedParameters = jsDocParameters(docs);
    const parameters = parametersText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value): ApiParameter => {
        const rest = value.startsWith("...");
        const plain = rest ? value.slice(3) : value;
        const [rawName, defaultValue] = plain.split(/\s*=\s*/u, 2);
        const name = rawName!.trim();
        return {
          name,
          type: documentedParameters.get(name)?.type ?? "unknown",
          optional:
            defaultValue !== undefined ||
            (documentedParameters.get(name)?.optional ?? false),
          rest,
          ...(defaultValue !== undefined
            ? { default: defaultValue.trim() }
            : {}),
        };
      });
    const returnType = jsDocReturnType(docs);
    return { parameters, ...(returnType ? { returnType } : {}) };
  };
  const functions = new Map<string, ApiSignature>();
  for (const match of text.matchAll(
    /(?:\/\*\*([\s\S]*?)\*\/\s*)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/gu,
  )) {
    functions.set(match[2]!, signatureFromText(match[3]!, match[1] ?? ""));
  }
  for (const match of text.matchAll(
    /\bthis\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/gu,
  )) {
    const name = match[1]!;
    const methodSignature = functions.get(match[2]!);
    if (methodSignature && !name.startsWith("_")) {
      methods.set(name, {
        name,
        kind: "method",
        scope: "instance",
        optional: false,
        readonly: false,
        static: false,
        signatures: [methodSignature],
      });
    }
  }
  for (const match of text.matchAll(
    /\bthis\.([A-Za-z_$][\w$]*)\s*=\s*function\s*\(([^)]*)\)/gu,
  )) {
    const name = match[1]!;
    if (name.startsWith("_")) continue;
    const docs = precedingJsDoc(text, match.index);
    methods.set(name, {
      name,
      kind: "method",
      scope: "instance",
      optional: false,
      readonly: false,
      static: false,
      signatures: [signatureFromText(match[2]!, docs)],
    });
  }
  const isPrivateAssignment = (offset: number): boolean => {
    // Inspect only the immediately preceding JSDoc block. Slicing from the
    // start for every `this.x` assignment made large controls quadratic.
    return /@(?:private|internal)\b/u.test(precedingJsDoc(text, offset));
  };
  for (const match of text.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*=/gu)) {
    if (
      !(
        isPrivateAssignment(match.index) ||
        match[1]!.startsWith("_") ||
        methods.has(match[1]!)
      )
    ) {
      names.add(match[1]!);
      const docs = precedingJsDoc(text, match.index);
      const typeMatch = /@type\s*\{/u.exec(docs);
      const type = typeMatch
        ? balancedTypeAt(docs, typeMatch.index + typeMatch[0].length - 1)?.type
        : undefined;
      if (type) propertyTypes.set(match[1]!, type);
    }
  }
  for (const match of text.matchAll(
    /Object\.definePropert(?:y|ies)\s*\(\s*this\s*,\s*['"]([A-Za-z_$][\w$]*)['"]/gu,
  )) {
    if (!(isPrivateAssignment(match.index) || match[1]!.startsWith("_"))) {
      names.add(match[1]!);
    }
  }
  for (const match of text.matchAll(
    /@name\s+[A-Za-z_$][\w$]*#([A-Za-z_$][\w$]*)/gu,
  )) {
    if (!match[1]!.startsWith("_")) names.add(match[1]!);
  }
  const result: ApiMember[] = [...methods.values()];
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const tagged = new RegExp(`@name\\s+[^#\\s]+#${escaped}`, "u").exec(text);
    const taggedText = tagged
      ? text.slice(tagged.index, tagged.index + 500)
      : "";
    const typeMatch = /@type\s*\{/u.exec(taggedText);
    const type =
      (typeMatch
        ? balancedTypeAt(taggedText, typeMatch.index + typeMatch[0].length - 1)
            ?.type
        : undefined) ?? propertyTypes.get(name);
    if (/@(?:private|internal)\b/u.test(taggedText)) {
      continue;
    }
    result.push({
      name,
      kind: "property",
      scope: "instance",
      optional: false,
      readonly: Boolean(tagged && /@readonly/u.test(tagged[0])),
      static: false,
      ...(type ? { type } : {}),
    });
  }
  return result;
}

function declarationFor(
  context: ExtractionContext,
  symbol: ts.Symbol,
): ResolvedDeclaration {
  const previous = context.declarations.get(symbol);
  if (previous) {
    return previous;
  }
  let target = symbol;
  const seen = new Set<ts.Symbol>();
  while (target.flags & ts.SymbolFlags.Alias && !seen.has(target)) {
    seen.add(target);
    const aliased = context.checker.getAliasedSymbol(target);
    if (aliased === target) {
      break;
    }
    target = aliased;
  }
  const declarations = [
    ...(target.valueDeclaration ? [target.valueDeclaration] : []),
    ...(target.declarations ?? []).filter(
      (declaration) => declaration !== target.valueDeclaration,
    ),
  ];
  const node = declarations.find(
    (value) =>
      ts.isClassDeclaration(value) ||
      ts.isFunctionDeclaration(value) ||
      ts.isInterfaceDeclaration(value) ||
      ts.isEnumDeclaration(value) ||
      ts.isVariableDeclaration(value) ||
      ts.isTypeAliasDeclaration(value) ||
      ts.isModuleDeclaration(value),
  );
  const result = {
    symbol: target,
    node: node ?? declarations[0] ?? namedDeclaration(context, symbol.name),
  };
  context.declarations.set(symbol, result);
  context.declarations.set(target, result);
  return result;
}

function namedDeclaration(
  context: ExtractionContext,
  name: string,
): ts.Node | undefined {
  if (!context.namedDeclarations) {
    const declarations = new Map<string, ts.Node>();
    for (const sourceFile of context.program.getSourceFiles()) {
      if (!sourceFile.fileName.startsWith(context.packageRoot)) {
        continue;
      }
      for (const statement of sourceFile.statements) {
        if (
          ts.isClassDeclaration(statement) ||
          ts.isFunctionDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isEnumDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement)
        ) {
          if (statement.name) {
            declarations.set(statement.name.text, statement);
          }
        } else if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) {
              declarations.set(declaration.name.text, declaration);
            }
          }
        }
      }
    }
    context.namedDeclarations = declarations;
  }
  return context.namedDeclarations.get(name);
}

function surfaceDeclaration(
  context: ExtractionContext,
  resolved: ResolvedDeclaration,
  name: string,
  surface: SurfaceId,
): ResolvedDeclaration {
  if (
    surface !== "three-tsl" ||
    !resolved.node?.getSourceFile().fileName.endsWith("Three.TSL.js")
  ) {
    return resolved;
  }
  if (!context.tslExports) {
    const barrel = context.program.getSourceFile(
      resolve(context.packageRoot, "src/nodes/TSL.js"),
    );
    const barrelSymbol = barrel
      ? context.checker.getSymbolAtLocation(barrel)
      : undefined;
    context.tslExports = new Map(
      barrelSymbol
        ? context.checker
            .getExportsOfModule(barrelSymbol)
            .map((exported) => [
              exported.name,
              declarationFor(context, exported),
            ])
        : [],
    );
  }
  return context.tslExports.get(name) ?? resolved;
}

function addMember(members: Map<string, ApiMember>, value: ApiMember): void {
  const key = `${value.scope}:${value.name}`;
  const previous = members.get(key);
  if (!previous) {
    const copy: ApiMember = {
      ...value,
      declarationCount: 1,
    };
    if (value.signatures) {
      copy.signatures = [...value.signatures];
    }
    members.set(key, copy);
    return;
  }
  previous.declarationCount = (previous.declarationCount ?? 1) + 1;
  if (value.signatures) {
    const signatures = [...(previous.signatures ?? []), ...value.signatures];
    const unique = new Map<string, ApiSignature>();
    for (const item of signatures) {
      unique.set(JSON.stringify(item), item);
    }
    previous.signatures = [...unique.values()];
  }
  if (value.access) {
    previous.access =
      previous.access && previous.access !== value.access
        ? "get-set"
        : value.access;
  }
  if (previous.kind === "property" && value.kind === "accessor") {
    previous.kind = "accessor";
  }
  previous.optional ||= value.optional;
  previous.readonly ||= value.readonly;
  previous.static ||= value.static;
  if (!previous.type && value.type) {
    previous.type = value.type;
  }
  if (!previous.deprecated && value.deprecated) {
    previous.deprecated = value.deprecated;
  }
}

function buildSymbolUncached(
  context: ExtractionContext,
  resolved: ResolvedDeclaration,
): CachedSymbolShape {
  const node = resolved.node;
  const item: CachedSymbolShape = {
    kind: symbolKind(node),
    extends: [],
    implements: [],
    typeParameters: [],
    constructors: [],
    signatures: [],
    members: [],
  };
  if (node) {
    item.source = packagePath(
      node.getSourceFile().fileName,
      context.packageRoot,
    );
  }
  if (!node) {
    return item;
  }
  const deprecatedTag = deprecated(node);
  if (deprecatedTag) {
    item.deprecated = deprecatedTag;
  }
  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
    item.typeParameters = typeParameters(node);
    const extendsList: string[] = [];
    const implementsList: string[] = [];
    for (const clause of node.heritageClauses ?? []) {
      for (const heritageType of clause.types) {
        const output = heritageType.getText(node.getSourceFile());
        (clause.token === ts.SyntaxKind.ImplementsKeyword
          ? implementsList
          : extendsList
        ).push(output);
      }
    }
    item.extends = [...new Set(extendsList)].sort();
    item.implements = [...new Set(implementsList)].sort();
    const members = new Map<string, ApiMember>();
    const classMembers = node.members ?? [];
    const methodDeclarations = new Map<string, ts.MethodDeclaration[]>();
    for (const child of classMembers) {
      if (ts.isMethodDeclaration(child)) {
        const key = nodeName(child.name);
        methodDeclarations.set(key, [
          ...(methodDeclarations.get(key) ?? []),
          child,
        ]);
      }
    }
    const overloadedMethods = new Set(
      [...methodDeclarations.entries()]
        .filter(
          ([, declarations]) =>
            declarations.length > 1 &&
            declarations.some((declaration) => !declaration.body),
        )
        .map(([key]) => key),
    );
    for (const child of classMembers) {
      const childName = nodeName((child as ts.NamedDeclaration).name);
      if (
        overloadedMethods.has(childName) &&
        ts.isMethodDeclaration(child) &&
        child.body
      ) {
        continue;
      }
      if (ts.isConstructorDeclaration(child)) {
        item.constructors.push(signature(child));
        continue;
      }
      const value = member(
        child,
        ts.isInterfaceDeclaration(node) ? "type" : "instance",
      );
      if (value) {
        addMember(members, value);
      }
    }
    // JavaScript constructor assignments are collected directly from source
    // below.  Avoid a full checker walk for every class; it scales poorly for
    // three.js' 400+ classes and duplicates declarations already in the AST.
    for (const value of constructorProperties(node)) {
      addMember(members, value);
    }
    item.members = [...members.values()].sort((a, b) =>
      `${a.scope}:${a.name}:${a.kind}`.localeCompare(
        `${b.scope}:${b.name}:${b.kind}`,
      ),
    );
    if (item.constructors.length === 0 && ts.isClassDeclaration(node)) {
      item.constructors = [{ parameters: [] }];
    }
  } else if (
    ts.isFunctionDeclaration(node) ||
    declarationLooksLikeFunction(node)
  ) {
    item.signatures = overloadSignatures(
      resolved.symbol,
      node as ts.FunctionDeclaration,
    );
  } else {
    item.type = typeString(context, node);
    item.signatures = signaturesFromType(context, node, false);
    if (ts.isVariableDeclaration(node)) {
      const initializerSignature = callableInitializerSignature(node);
      if (initializerSignature) item.signatures = [initializerSignature];
    }
    if (item.signatures.length > 0 && item.kind === "variable") {
      item.kind = "function";
    }
  }
  return item;
}

function buildSymbol(
  context: ExtractionContext,
  exported: ts.Symbol,
  name: string,
  id: string,
  module: ts.SourceFile,
  resolved = declarationFor(context, exported),
): ApiSymbol {
  let shape = context.symbolShapes.get(resolved.symbol);
  if (!shape) {
    shape = buildSymbolUncached(context, resolved);
    context.symbolShapes.set(resolved.symbol, shape);
  }
  return {
    ...shape,
    id,
    name:
      name === "default" && resolved.node
        ? declarationName(resolved.node)
        : name,
    exportKind: name === "default" ? "default" : "named",
    module: packagePath(module.fileName, context.packageRoot),
  };
}

function isRuntimeExport(resolved: ResolvedDeclaration): boolean {
  const symbol = resolved.symbol;
  return Boolean(symbol.flags & ts.SymbolFlags.Value);
}

function entries(
  context: ExtractionContext,
  module: ts.SourceFile,
  surface: SurfaceId,
): { exports: ManifestExport[]; symbols: ApiSymbol[] } {
  const moduleSymbol = context.checker.getSymbolAtLocation(module);
  if (!moduleSymbol) {
    return { exports: [], symbols: [] };
  }
  const exports: ManifestExport[] = [];
  const symbols: ApiSymbol[] = [];
  for (const exported of context.checker.getExportsOfModule(moduleSymbol)) {
    const exportedDeclaration = declarationFor(context, exported);
    if (surface !== "easel" && !isRuntimeExport(exportedDeclaration)) {
      continue;
    }
    const resolved = surfaceDeclaration(
      context,
      exportedDeclaration,
      exported.name,
      surface,
    );
    const id = `${surface}:${exported.name}`;
    exports.push({
      name: exported.name,
      id,
      kind: symbolKind(resolved.node),
      ...(resolved.node
        ? {
            source: packagePath(
              resolved.node.getSourceFile().fileName,
              context.packageRoot,
            ),
          }
        : {}),
    });
    symbols.push(
      buildSymbol(context, exported, exported.name, id, module, resolved),
    );
  }
  exports.sort((a, b) => a.name.localeCompare(b.name));
  symbols.sort((a, b) => a.name.localeCompare(b.name));
  return { exports, symbols };
}

function normalizedOption(options: ExtractOptions): {
  options: ExtractOptions;
  rootFile: string;
  packageRoot: string;
  sourceRoot: string;
} {
  const rootFile = resolve(options.rootFile);
  const packageRoot = resolve(
    options.packageRoot ??
      (options.surface === "easel"
        ? resolve(rootFile, "..", "..")
        : options.surface === "three-addons"
          ? resolve(rootFile, "..", "..", "..")
          : resolve(rootFile, "..", "..")),
  );
  const sourceRoot = isAbsolute(options.sourceRoot)
    ? resolve(options.sourceRoot)
    : resolve(packageRoot, options.sourceRoot);
  return { options, rootFile, packageRoot, sourceRoot };
}

function collectSourceFiles(
  rootFiles: readonly string[],
  _sourceRoots: readonly string[],
): string[] {
  // JavaScript `export *` targets must be compiler roots for the checker to
  // expose their symbols reliably. Walk only the public barrel graph rather
  // than every source file in the package; ordinary imports remain compiler-
  // resolved dependencies and do not inflate the declared public surface.
  const files = new Set<string>();
  const pending = rootFiles.map((file) => resolve(file));
  const moduleFrom =
    /\b(?:import|export)\s+(?:\*[^'";]*|\{[\s\S]*?\}|[^'";]+?)\s+from\s+['"]([^'"]+)['"]/gu;
  while (pending.length) {
    const file = pending.pop()!;
    if (files.has(file)) {
      continue;
    }
    files.add(file);
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(moduleFrom)) {
      const specifier = match[1]!;
      if (!specifier.startsWith(".")) {
        continue;
      }
      const requested = resolve(dirname(file), specifier);
      const target = existsSync(requested)
        ? requested
        : existsSync(requested.replace(/\.js$/u, ".ts"))
          ? requested.replace(/\.js$/u, ".ts")
          : requested;
      if (existsSync(target) && SOURCE_EXTENSIONS.has(extname(target))) {
        pending.push(target);
      }
    }
  }
  return [...files].sort();
}

function compilerOptions(options: ExtractOptions): ts.CompilerOptions {
  return {
    allowJs: true,
    allowSyntheticDefaultImports: true,
    checkJs: false,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    resolveJsonModule: true,
    ...(options.compilerOptions as ts.CompilerOptions | undefined),
  };
}

function provenanceFiles(
  context: ExtractionContext,
  rootFile: string,
  sourceRoot: string,
  surface: SurfaceId,
): ManifestFile[] {
  const extraRoots =
    surface === "three-tsl"
      ? [resolve(context.packageRoot, "src/nodes/TSL.js")]
      : [];
  const cacheKey = `${rootFile}:${sourceRoot}:${surface}`;
  const cached = context.files.get(cacheKey);
  if (cached) return cached;
  const files = collectSourceFiles([rootFile, ...extraRoots], [sourceRoot])
    .filter((file) => file === sourceRoot || file.startsWith(`${sourceRoot}/`))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      path: packagePath(file, context.packageRoot),
      hash: createHash("sha256").update(readFileSync(file)).digest("hex"),
    }));
  context.files.set(cacheKey, files);
  return files;
}

export async function extractManifests(
  options: readonly ExtractOptions[],
  batchOptions: ExtractBatchOptions = {},
): Promise<ApiManifest[]> {
  if (options.length === 0) {
    return [];
  }
  const normalized = options.map(normalizedOption);
  const groups = new Map<string, typeof normalized>();
  for (const item of normalized) {
    const group = groups.get(item.packageRoot) ?? [];
    group.push(item);
    groups.set(item.packageRoot, group);
  }
  const manifests = new Map<ExtractOptions, ApiManifest>();
  for (const group of groups.values()) {
    const started = Date.now();
    const first = group[0]!;
    const openFiles = collectSourceFiles(
      group.flatMap((item) =>
        item.options.surface === "three-tsl"
          ? [item.rootFile, resolve(item.packageRoot, "src/nodes/TSL.js")]
          : [item.rootFile],
      ),
      group.map((item) => item.sourceRoot),
    );
    const compiler = compilerOptions(first.options);
    const host = ts.createCompilerHost(compiler, true);
    const program = ts.createProgram({
      rootNames: openFiles,
      options: compiler,
      host,
    });
    const context: ExtractionContext = {
      checker: program.getTypeChecker(),
      program,
      packageRoot: first.packageRoot,
      declarations: new Map(),
      symbolShapes: new Map(),
      typeStrings: new Map(),
      files: new Map(),
    };
    for (const item of group) {
      const module = program.getSourceFile(item.rootFile);
      if (!module) {
        throw new Error(`Could not load API entrypoint: ${item.rootFile}`);
      }
      const found = entries(context, module, item.options.surface);
      const files = provenanceFiles(
        context,
        item.rootFile,
        item.sourceRoot,
        item.options.surface,
      );
      const manifest: ApiManifest = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        manifestVersion: "1.0",
        package: {
          name: item.options.packageName,
          version: item.options.packageVersion,
        },
        surface: {
          id: item.options.surface,
          name: SURFACE_NAMES[item.options.surface],
          entrypoint: packagePath(item.rootFile, item.packageRoot),
          sourceRoot: packagePath(item.sourceRoot, item.packageRoot),
        },
        exports: found.exports,
        symbols: found.symbols,
        provenance: {
          extractor: EXTRACTOR_VERSION,
          compiler: `typescript/${ts.versionMajorMinor}`,
          entrypoint: packagePath(item.rootFile, item.packageRoot),
          files,
        },
      };
      manifests.set(item.options, manifest);
      if (batchOptions.timings) {
        console.error(
          `[api-compat] ${item.options.surface}: ${Date.now() - started}ms`,
        );
      }
    }
    if (batchOptions.timings) {
      console.error(
        `[api-compat] package group ${first.packageRoot}: ${Date.now() - started}ms`,
      );
    }
  }
  return options.map((option) => {
    const manifest = manifests.get(option);
    if (!manifest) {
      throw new Error(`Manifest was not generated for ${option.surface}`);
    }
    return manifest;
  });
}

export async function extractManifest(
  options: ExtractOptions,
): Promise<ApiManifest> {
  return (await extractManifests([options]))[0]!;
}

export interface RepositorySurfaceOptions {
  repositoryRoot: string;
  threeRoot?: string;
  easelVersion?: string;
  threeVersion?: string;
}

export function defaultSurfaceOptions(
  options: RepositorySurfaceOptions,
): ExtractOptions[] {
  const repositoryRoot = resolve(options.repositoryRoot);
  const threeRoot = resolve(
    options.threeRoot ?? resolve(repositoryRoot, "node_modules/three"),
  );
  const easelVersion =
    options.easelVersion ??
    readFileSync(resolve(repositoryRoot, "package.json"), "utf8").match(
      /"version"\s*:\s*"([^"]+)"/u,
    )?.[1] ??
    "unknown";
  const threeVersion =
    options.threeVersion ??
    (
      JSON.parse(readFileSync(resolve(threeRoot, "package.json"), "utf8")) as {
        version: string;
      }
    ).version;
  return [
    {
      packageName: "@xsyetopz/easel",
      packageVersion: easelVersion,
      surface: "easel",
      entrypoint: "src/index.ts",
      sourceRoot: resolve(repositoryRoot, "src"),
      rootFile: resolve(repositoryRoot, "src/index.ts"),
      packageRoot: repositoryRoot,
    },
    {
      packageName: "three",
      packageVersion: threeVersion,
      surface: "three-core",
      entrypoint: "node_modules/three/src/Three.js",
      sourceRoot: resolve(threeRoot, "src"),
      rootFile: resolve(threeRoot, "src/Three.js"),
      packageRoot: threeRoot,
    },
    {
      packageName: "three",
      packageVersion: threeVersion,
      surface: "three-addons",
      entrypoint: "node_modules/three/examples/jsm/Addons.js",
      sourceRoot: resolve(threeRoot, "examples/jsm"),
      rootFile: resolve(threeRoot, "examples/jsm/Addons.js"),
      packageRoot: threeRoot,
    },
    {
      packageName: "three",
      packageVersion: threeVersion,
      surface: "three-webgpu",
      entrypoint: "node_modules/three/src/Three.WebGPU.js",
      sourceRoot: resolve(threeRoot, "src"),
      rootFile: resolve(threeRoot, "src/Three.WebGPU.js"),
      packageRoot: threeRoot,
    },
    {
      packageName: "three",
      packageVersion: threeVersion,
      surface: "three-tsl",
      entrypoint: "node_modules/three/src/Three.TSL.js",
      sourceRoot: resolve(threeRoot, "src"),
      rootFile: resolve(threeRoot, "src/Three.TSL.js"),
      packageRoot: threeRoot,
    },
  ];
}
