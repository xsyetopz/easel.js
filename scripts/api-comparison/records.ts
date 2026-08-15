import { isInterfaceDeclaration, isTypeAliasDeclaration } from "typescript-api";
import type { Declaration, Symbol as TypeScriptSymbol } from "typescript-api";
import {
  heritageText,
  MEMBER_TERMINATOR_PATTERN,
  normalizeWhitespace,
  typeOfSymbol,
  typeParametersText,
} from "./text.ts";
import type { ExtractionContext } from "./types.ts";

export function recordShape(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  declaration: Declaration,
): string {
  if (isInterfaceDeclaration(declaration)) {
    const interfaceDeclaration = declaration;
    const typeParameters = typeParametersText(interfaceDeclaration);
    const members = interfaceDeclaration.members.map((member) =>
      normalizeWhitespace(
        member
          .getText(member.getSourceFile())
          .replace(MEMBER_TERMINATOR_PATTERN, ""),
      ),
    );
    return `interface${typeParameters}${heritageText(interfaceDeclaration)} { ${members.join("; ")} }`;
  }
  if (isTypeAliasDeclaration(declaration)) {
    const typeAliasDeclaration = declaration;
    const typeParameters = typeParametersText(typeAliasDeclaration);
    return `type${typeParameters} = ${normalizeWhitespace(typeAliasDeclaration.type.getText(typeAliasDeclaration.getSourceFile()))}`;
  }
  return `record = ${typeOfSymbol(context, symbol, declaration)}`;
}
