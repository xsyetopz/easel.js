import { describe, expect, it } from "bun:test";
import * as ts from "typescript-api";
import { publicJsDocIssues } from "../../scripts/api-policy/public-jsdoc-policy.ts";

function source(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
}

describe("public JSDoc policy", () => {
  it("ignores underscore and pipeline implementation modules", () => {
    const internal = publicJsDocIssues(
      source("src/loaders/_Internal.ts", "export const value = 1;"),
    );
    const pipeline = publicJsDocIssues(
      source("src/pipeline/Worker.ts", "export const value = 1;"),
    );

    expect(internal).toEqual({ lowQuality: [], missing: [] });
    expect(pipeline).toEqual({ lowQuality: [], missing: [] });
  });

  it("keeps checks for eligible public declarations and members", () => {
    const issues = publicJsDocIssues(
      source(
        "src/renderers/PublicRenderer.ts",
        "/** Public renderer. */\nexport class PublicRenderer {\n  width = 0;\n}",
      ),
    );

    expect(issues.missing).toContain(
      "src/renderers/PublicRenderer.ts:3 PublicRenderer.width",
    );
  });
});
