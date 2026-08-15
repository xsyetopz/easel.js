import {
  isExportDeclaration,
  isExportSpecifier,
  isImportDeclaration,
  isNamedImports,
  SymbolFlags,
  SyntaxKind,
} from "typescript-api";
import type {
  Declaration,
  Node,
  SourceFile,
  Symbol as TypeScriptSymbol,
} from "typescript-api";
import {
  declarationName,
  hasModifier,
  isPrivateName,
  parseDoc,
  precedingJsDoc,
} from "./text.ts";
import type { ExtractionContext } from "./types.ts";

function isUsableDeclaration(node: Node): boolean {
  return !(isDocOnlyDeclaration(node) || isExportSpecifier(node));
}

export function isDocOnlyDeclaration(node: Node): boolean {
  return (
    node.kind === SyntaxKind.JSDocTypedefTag ||
    node.kind === SyntaxKind.JSDocCallbackTag
  );
}

function importedExport(
  context: ExtractionContext,
  file: SourceFile,
  name: string,
): TypeScriptSymbol | undefined {
  const imports = file.statements.filter(isImportDeclaration);
  for (const statement of imports) {
    const bindings = statement.importClause?.namedBindings;
    if (!(bindings && isNamedImports(bindings))) continue;
    const element = bindings.elements.find(
      (candidate) => (candidate.propertyName ?? candidate.name).text === name,
    );
    if (!element) continue;
    const moduleSymbol = context.checker.getSymbolAtLocation(
      statement.moduleSpecifier,
    );
    const exported = moduleSymbol
      ? context.checker
          .getExportsOfModule(moduleSymbol)
          .find((item) => item.name === name)
      : undefined;
    if (exported) return exported;
  }
  return undefined;
}

function localDeclaration(
  context: ExtractionContext,
  file: SourceFile,
  name: string,
): TypeScriptSymbol | undefined {
  for (const statement of file.statements) {
    if (declarationName(statement) !== name) continue;
    const named = statement as Node & { name?: Node };
    const symbol = named.name
      ? context.checker.getSymbolAtLocation(named.name)
      : context.checker.getSymbolAtLocation(statement);
    if (symbol) return symbol;
  }
  return undefined;
}

function moduleSymbols(
  context: ExtractionContext,
  declaration: Declaration,
): TypeScriptSymbol[] {
  const sourceModule = context.checker.getSymbolAtLocation(
    declaration.getSourceFile(),
  );
  const modules = sourceModule ? [sourceModule] : [];
  if (
    isExportSpecifier(declaration) &&
    isExportDeclaration(declaration.parent.parent) &&
    declaration.parent.parent.moduleSpecifier
  ) {
    const moduleSymbol = context.checker.getSymbolAtLocation(
      declaration.parent.parent.moduleSpecifier,
    );
    if (moduleSymbol) modules.push(moduleSymbol);
  }
  return modules;
}

function directExport(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  modules: readonly TypeScriptSymbol[],
): TypeScriptSymbol | undefined {
  for (const moduleSymbol of modules) {
    const direct = context.checker
      .getExportsOfModule(moduleSymbol)
      .find((item) => item.name === symbol.name && item !== symbol);
    if (direct) return direct;
  }
  return undefined;
}

function resolveDeclaration(
  context: ExtractionContext,
  declaration: Declaration,
  symbol: TypeScriptSymbol,
  seen: Set<TypeScriptSymbol>,
): TypeScriptSymbol | undefined {
  const local = localDeclaration(
    context,
    declaration.getSourceFile(),
    symbol.name,
  );
  if (local && local !== symbol) return resolveExport(context, local, seen);
  const imported = importedExport(
    context,
    declaration.getSourceFile(),
    symbol.name,
  );
  if (imported) return resolveExport(context, imported, seen);
  const direct = directExport(
    context,
    symbol,
    moduleSymbols(context, declaration),
  );
  if (direct) return resolveExport(context, direct, seen);
  return undefined;
}

export function resolveExport(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  seen = new Set<TypeScriptSymbol>(),
): TypeScriptSymbol {
  if (seen.has(symbol)) return symbol;
  seen.add(symbol);
  const target =
    symbol.flags & SymbolFlags.Alias
      ? context.checker.getAliasedSymbol(symbol)
      : symbol;
  if (target.declarations?.some(isUsableDeclaration)) return target;
  for (const declaration of symbol.declarations ?? []) {
    const resolved = resolveDeclaration(context, declaration, symbol, seen);
    if (resolved?.declarations?.some(isUsableDeclaration)) return resolved;
  }
  return target;
}

export function declarationFor(
  symbol: TypeScriptSymbol,
): Declaration | undefined {
  return symbol.valueDeclaration ?? symbol.declarations?.[0];
}

export function declarationMatching(
  symbol: TypeScriptSymbol,
  predicate: (declaration: Declaration) => boolean,
): Declaration | undefined {
  return symbol.declarations?.find(predicate);
}

export function publicDeclaration(
  node: Node | undefined,
  name: string,
): boolean {
  if (!node || isPrivateName(name) || isDocOnlyDeclaration(node)) return false;
  if (
    hasModifier(node, SyntaxKind.PrivateKeyword) ||
    hasModifier(node, SyntaxKind.ProtectedKeyword)
  ) {
    return false;
  }
  const docs = parseDoc(precedingJsDoc(node));
  return !(docs.private || docs.internal);
}

export function publicSymbol(symbol: TypeScriptSymbol, name: string): boolean {
  const declarations = (symbol.declarations ?? []).filter(
    (declaration) =>
      !(isExportSpecifier(declaration) || isDocOnlyDeclaration(declaration)),
  );
  return (
    declarations.length > 0 &&
    declarations.every((declaration) => publicDeclaration(declaration, name))
  );
}
