import { readFile } from "node:fs/promises";
import process from "node:process";
import { Glob } from "bun";
import * as ts from "typescript";

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === kind),
  );
}

function location(source: ts.SourceFile, node: ts.Node): string {
  const line =
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  return `${source.fileName}:${line}`;
}

function memberName(member: ts.ClassElement): string {
  const name = member.name;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : "";
}

const violations: string[] = [];
for await (const fileName of new Glob("src/**/*.ts").scan(".")) {
  const source = ts.createSourceFile(
    fileName,
    await readFile(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of source.statements) {
    if (ts.isEnumDeclaration(statement)) {
      violations.push(
        `${location(source, statement)} enum ${statement.name.text}`,
      );
    }
    if (!ts.isClassDeclaration(statement)) continue;
    const accessors = new Set(
      statement.members
        .filter(
          (
            member,
          ): member is ts.GetAccessorDeclaration | ts.SetAccessorDeclaration =>
            ts.isGetAccessorDeclaration(member) ||
            ts.isSetAccessorDeclaration(member),
        )
        .map(memberName),
    );
    for (const member of statement.members) {
      if (memberName(member).startsWith("_")) {
        violations.push(
          `${location(source, member)} underscore-prefixed public member; use # private state or a public semantic name`,
        );
      }
      if (hasModifier(member, ts.SyntaxKind.StaticKeyword)) {
        violations.push(`${location(source, member)} static class member`);
      }
      if (hasModifier(member, ts.SyntaxKind.PrivateKeyword)) {
        violations.push(`${location(source, member)} private keyword`);
      }
      if (
        ts.isMethodDeclaration(member) &&
        member.parameters.length === 0 &&
        /^get[A-Z]/u.test(memberName(member))
      ) {
        violations.push(
          `${location(source, member)} parameterless get-method; use an accessor`,
        );
      }
      if (ts.isMethodDeclaration(member) && member.parameters.length === 1) {
        const name = memberName(member);
        const match = /^set([A-Z].*)$/u.exec(name);
        const accessorName = match
          ? `${match[1]![0]!.toLowerCase()}${match[1]!.slice(1)}`
          : "";
        if (accessorName && accessors.has(accessorName)) {
          violations.push(
            `${location(source, member)} redundant set-method; use the ${accessorName} accessor`,
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(
  "Modern API policy passed: no enums, static class items, private keywords, underscore-prefixed public members, or redundant accessor methods.",
);
