import path from "node:path";
import * as ts from "typescript-api";
import {
  type ApiDoc,
  CATEGORY_NAMES,
  ENTRY,
  isPublicDocSourcePath,
  lexicalCompare,
  SRC_ROOT,
} from "./api-model.ts";

function normalizeWhitespace(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function resolveExport(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function declarationFor(symbol: ts.Symbol): ts.Declaration {
  const declarations = (symbol.declarations ?? []).filter(
    (declaration) =>
      !ts.isExportSpecifier(declaration) &&
      declaration.getSourceFile().fileName.startsWith(SRC_ROOT),
  );
  const declaration = symbol.valueDeclaration ?? declarations[0];
  if (!declaration) {
    throw new Error(`Cannot locate source declaration for ${symbol.name}.`);
  }
  return declaration;
}

function symbolDocumentation(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): string | undefined {
  const normalized = normalizeWhitespace(
    ts.displayPartsToString(symbol.getDocumentationComment(checker)),
  );
  return normalized || undefined;
}

function sanitizeDescription(description: string): string | undefined {
  if (
    /\b(?:src\/|bun\s+run\s+docs:generate|generated from|source declaration|source path|docs? generator|generator process|build process)\b/iu.test(
      description,
    ) ||
    /```(?:ts|typescript)\b/iu.test(description) ||
    /\bexport\s+(?:class|const|function|interface|type)\b/iu.test(
      description,
    ) ||
    /\b(?:webgl|webgpu|pbr)\b/iu.test(description) ||
    /gpu/iu.test(description) ||
    /\b(?:device api|environment map|render target|shader|shadow map)\b/iu.test(
      description,
    )
  ) {
    return undefined;
  }
  const sanitized = description
    .replaceAll(/\bthree(?:\.js|js)['’](?=\W)/giu, "EASEL.js")
    .replace(/\bthree(?:\.js|js)(?:['’]s)?\b/giu, (match) =>
      /['’]s$/u.test(match) ? "EASEL.js's" : "EASEL.js",
    )
    .replaceAll(/\b(?:THREE|Three|three)['’]s\b/gu, "EASEL.js's")
    .replaceAll(/\bTHREE\b/gu, "EASEL.js")
    .trim();
  return sanitized || undefined;
}

function categoryFor(declaration: ts.Declaration): string {
  const relative = path.relative(
    SRC_ROOT,
    declaration.getSourceFile().fileName,
  );
  const owner = relative.split(path.sep)[0] ?? "core";
  return CATEGORY_NAMES[owner] ?? "Core";
}

function kindFor(
  symbol: ts.Symbol,
  declaration: ts.Declaration,
): ApiDoc["kind"] {
  if (ts.isClassDeclaration(declaration)) return "class";
  if (ts.isInterfaceDeclaration(declaration)) return "interface";
  if (ts.isTypeAliasDeclaration(declaration)) return "type";
  if (symbol.flags & ts.SymbolFlags.Function) return "function";
  return "constant";
}

export function extractDocs(): ApiDoc[] {
  const rootNames = ts.sys.readDirectory(SRC_ROOT, [".ts", ".tsx"], undefined, [
    "**/*",
  ]);
  const program = ts.createProgram({
    options: {
      allowImportingTsExtensions: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
    },
    rootNames,
  });
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(ENTRY);
  if (!entry) throw new Error(`Missing public entrypoint: ${ENTRY}`);
  const moduleSymbol = checker.getSymbolAtLocation(entry);
  if (!moduleSymbol)
    throw new Error(`Cannot resolve public entrypoint: ${ENTRY}`);

  const docs: ApiDoc[] = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = resolveExport(checker, exported);
    const declaration = declarationFor(symbol);
    if (!isPublicDocSourcePath(declaration.getSourceFile().fileName)) continue;
    const description = symbolDocumentation(checker, symbol);
    const sanitizedDescription = description
      ? sanitizeDescription(description)
      : undefined;
    docs.push({
      category: categoryFor(declaration),
      ...(sanitizedDescription ? { description: sanitizedDescription } : {}),
      kind: kindFor(symbol, declaration),
      name: exported.name,
    });
  }
  return docs.sort(
    (left, right) =>
      lexicalCompare(left.category, right.category) ||
      lexicalCompare(left.name, right.name),
  );
}
