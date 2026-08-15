import { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript-api";
import type { Program } from "typescript-api";
import { exportedFactsForSymbol } from "./facts.ts";
import type { ExtractionContext, PublicFact } from "./types.ts";

export const COMPILER_OPTIONS: import("typescript-api").CompilerOptions = {
  allowJs: true,
  allowImportingTsExtensions: true,
  checkJs: true,
  module: ModuleKind.NodeNext,
  moduleResolution: ModuleResolutionKind.NodeNext,
  noEmit: true,
  skipLibCheck: true,
  strictNullChecks: true,
  target: ScriptTarget.ES2022,
};

export function exportFacts(context: ExtractionContext): PublicFact[] {
  const moduleSymbol = context.checker.getSymbolAtLocation(context.root);
  if (!moduleSymbol) {
    throw new Error(`Cannot resolve module symbol: ${context.root.fileName}`);
  }
  const facts: PublicFact[] = [];
  for (const exported of context.checker.getExportsOfModule(moduleSymbol)) {
    facts.push(...exportedFactsForSymbol(context, exported));
  }
  return facts;
}

export function extractSide(
  root: string,
  roots: readonly string[],
  makeProgram: (rootNames: readonly string[]) => Program,
): PublicFact[] {
  const program = makeProgram(roots);
  const source = program.getSourceFile(root);
  if (!source) throw new Error(`Cannot read API entrypoint: ${root}`);
  return exportFacts({
    checker: program.getTypeChecker(),
    program,
    root: source,
  });
}
