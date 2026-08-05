import process from "node:process";
import { readFile } from "node:fs/promises";
import { Glob } from "bun";
import * as ts from "typescript-api";

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
  );
}

function hasJsDoc(node: ts.Node): boolean {
  return ts.getJSDocCommentsAndTags(node).length > 0;
}

function jsDocQualityIssue(node: ts.Node): string | undefined {
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
}

function isPublicMember(node: ts.ClassElement): boolean {
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

function declarationName(node: ts.Node): string {
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

function location(source: ts.SourceFile, node: ts.Node): string {
  const line =
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  return `${source.fileName}:${line}`;
}

const missing: string[] = [];
const lowQuality: string[] = [];
for await (const fileName of new Glob("src/**/*.ts").scan(".")) {
  if (fileName === "src/index.ts") continue;
  const source = ts.createSourceFile(
    fileName,
    await readFile(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of source.statements) {
    if (
      !hasModifier(statement, ts.SyntaxKind.ExportKeyword) ||
      ts.isExportDeclaration(statement)
    ) {
      continue;
    }
    if (!hasJsDoc(statement)) {
      missing.push(
        `${location(source, statement)} export ${declarationName(statement)}`,
      );
    }
    const statementQualityIssue = jsDocQualityIssue(statement);
    if (statementQualityIssue) {
      lowQuality.push(
        `${location(source, statement)} export ${declarationName(statement)}: ${statementQualityIssue}`,
      );
    }
    if (ts.isClassDeclaration(statement)) {
      for (const member of statement.members) {
        if (isPublicMember(member) && !hasJsDoc(member)) {
          missing.push(
            `${location(source, member)} ${declarationName(statement)}.${declarationName(member)}`,
          );
        }
        const memberQualityIssue = jsDocQualityIssue(member);
        if (isPublicMember(member) && memberQualityIssue) {
          lowQuality.push(
            `${location(source, member)} ${declarationName(statement)}.${declarationName(member)}: ${memberQualityIssue}`,
          );
        }
      }
    }
    if (ts.isInterfaceDeclaration(statement)) {
      for (const member of statement.members) {
        if (!hasJsDoc(member)) {
          missing.push(
            `${location(source, member)} ${declarationName(statement)}.${declarationName(member)}`,
          );
        }
        const memberQualityIssue = jsDocQualityIssue(member);
        if (memberQualityIssue) {
          lowQuality.push(
            `${location(source, member)} ${declarationName(statement)}.${declarationName(member)}: ${memberQualityIssue}`,
          );
        }
      }
    }
  }
}

if (missing.length > 0) {
  console.error(missing.join("\n"));
  console.error(`Missing public JSDoc: ${missing.length}`);
  process.exit(1);
}

if (lowQuality.length > 0) {
  console.error(lowQuality.join("\n"));
  console.error(`Low-quality public JSDoc: ${lowQuality.length}`);
  process.exit(1);
}

console.log(
  "All exported declarations and public members have substantive JSDoc summaries.",
);
