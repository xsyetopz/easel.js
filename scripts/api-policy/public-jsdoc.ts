import * as ts from "typescript-api";
import { hasModifier } from "./ast.ts";

export function hasJsDoc(node: ts.Node): boolean {
  return ts.getJSDocCommentsAndTags(node).length > 0;
}

export function jsDocQualityIssue(node: ts.Node): string | undefined {
  for (const doc of ts.getJSDocCommentsAndTags(node)) {
    if (!ts.isJSDoc(doc) || typeof doc.comment !== "string") continue;
    const summary = doc.comment.trim().split(/\r?\n/u, 1)[0]?.trim() ?? "";
    if (/^The [\p{L}\p{N}_ -]+\.$/u.test(summary)) {
      return `placeholder summary "${summary}"`;
    }
    if (/\b([\p{L}]+)\s+\1\b/iu.test(summary)) {
      return `duplicated word in summary "${summary}"`;
    }
    if (/^Tests equality with\.$/u.test(summary)) {
      return `incomplete summary "${summary}"`;
    }
  }
  return undefined;
}

export function isPublicMember(node: ts.ClassElement): boolean {
  if (
    ts.isSemicolonClassElement(node) ||
    ts.isClassStaticBlockDeclaration(node)
  ) {
    return false;
  }
  return !(
    hasModifier(node, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(node, ts.SyntaxKind.ProtectedKeyword) ||
    (node.name && ts.isPrivateIdentifier(node.name))
  );
}

export function declarationName(node: ts.Node): string {
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if ("name" in node && node.name) {
    const name = node.name as ts.Node;
    if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
    return name.getText();
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations[0]?.name.getText() ?? "value";
  }
  return ts.SyntaxKind[node.kind];
}
