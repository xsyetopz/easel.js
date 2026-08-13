import {
  SymbolFlags,
  isClassDeclaration,
  isFunctionDeclaration,
  isInterfaceDeclaration,
  isTypeAliasDeclaration,
} from "typescript-api";
import type { Declaration, Symbol as TypeScriptSymbol } from "typescript-api";
import {
  declarationFor,
  declarationMatching,
  publicSymbol,
  resolveExport,
} from "./resolution.ts";
import { classFacts } from "./members.ts";
import { recordShape } from "./records.ts";
import { signatureList } from "./signatures.ts";
import { heritageText, typeOfSymbol, typeParametersText } from "./text.ts";
import type { ExtractionContext, PublicFact } from "./types.ts";

function classFact(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  declaration: Declaration | undefined,
  name: string,
): PublicFact[] {
  const typeParameters =
    declaration && isClassDeclaration(declaration)
      ? typeParametersText(declaration)
      : "";
  const heritage =
    declaration && isClassDeclaration(declaration)
      ? heritageText(declaration)
      : "";
  const facts: PublicFact[] = [
    {
      kind: "class",
      shape: `class${typeParameters}${heritage}`,
      subject: name,
    },
  ];
  if (declaration) facts.push(...classFacts(context, symbol, declaration, name));
  return facts;
}

function recordFact(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
): PublicFact[] {
  const declaration = declarationMatching(
    symbol,
    (item) => isInterfaceDeclaration(item) || isTypeAliasDeclaration(item),
  );
  if (!declaration) return [];
  return [
    {
      kind: "record",
      shape: recordShape(context, symbol, declaration),
      subject: symbol.name,
    },
  ];
}

function functionFact(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
): PublicFact[] {
  const declaration = declarationMatching(symbol, isFunctionDeclaration);
  if (!declaration) return [];
  const type = context.checker.getTypeOfSymbolAtLocation(symbol, declaration);
  return [
    {
      kind: "function",
      shape: signatureList(context, symbol.declarations ?? [], type),
      subject: symbol.name,
    },
  ];
}

function constFact(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
): PublicFact[] {
  const declaration = declarationFor(symbol);
  if (!declaration) return [];
  return [
    {
      kind: "const",
      shape: `const ${typeOfSymbol(context, symbol, declaration)}`,
      subject: symbol.name,
    },
  ];
}

export function exportedFactsForSymbol(
  context: ExtractionContext,
  exported: TypeScriptSymbol,
): PublicFact[] {
  const symbol = resolveExport(context, exported);
  if (!publicSymbol(symbol, exported.name)) return [];
  const declaration = declarationFor(symbol);
  const facts: PublicFact[] = [];
  if (symbol.flags & SymbolFlags.Class) {
    facts.push(...classFact(context, symbol, declaration, exported.name));
  }
  if (symbol.flags & (SymbolFlags.Interface | SymbolFlags.TypeAlias)) {
    facts.push(...recordFact(context, symbol));
  }
  if (symbol.flags & SymbolFlags.Function) {
    facts.push(...functionFact(context, symbol));
  }
  if (
    symbol.flags &
    (SymbolFlags.Variable | SymbolFlags.BlockScopedVariable | SymbolFlags.ConstEnum)
  ) {
    facts.push(...constFact(context, symbol));
  }
  return facts;
}
