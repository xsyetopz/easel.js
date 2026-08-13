import * as ts from "typescript-api";

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === kind),
  );
}

export function location(source: ts.SourceFile, node: ts.Node): string {
  const line =
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  return `${source.fileName}:${line}`;
}

export function memberName(member: ts.ClassElement): string {
  const name = member.name;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : "";
}
