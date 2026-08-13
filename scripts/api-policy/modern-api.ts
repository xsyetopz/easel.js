import * as ts from "typescript-api";
import { hasModifier, location, memberName } from "./ast.ts";

export function modernApiViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [];
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
          ? `${match[1]?.[0]?.toLowerCase()}${match[1]?.slice(1)}`
          : "";
        if (
          accessorName &&
          !(
            source.fileName.endsWith("src/animation/Animator.ts") &&
            name === "setTime"
          ) &&
          accessors.has(accessorName)
        ) {
          violations.push(
            `${location(source, member)} redundant set-method; use the ${accessorName} accessor`,
          );
        }
      }
    }
  }
  return violations;
}
