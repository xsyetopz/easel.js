import * as ts from "typescript-api";
import { isPublicDocSourcePath } from "../starlight-docs/api-model.ts";
import { hasModifier, location } from "./ast.ts";
import {
  declarationName,
  hasJsDoc,
  isPublicMember,
  jsDocQualityIssue,
} from "./public-jsdoc.ts";

export interface PublicJsDocIssues {
  missing: string[];
  lowQuality: string[];
}

export function publicJsDocIssues(source: ts.SourceFile): PublicJsDocIssues {
  const missing: string[] = [];
  const lowQuality: string[] = [];
  if (!isPublicDocSourcePath(source.fileName)) {
    return { lowQuality, missing };
  }
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
  return { lowQuality, missing };
}
