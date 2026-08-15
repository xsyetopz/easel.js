import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

const root = `${import.meta.dir}/../..`;
const workflowDirectory = `${root}/.github/workflows`;
const workflows = new Map(
  readdirSync(workflowDirectory)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => [
      name,
      readFileSync(`${workflowDirectory}/${name}`, "utf8"),
    ]),
);
const releaseWorkflow = workflows.get("release.yml");
if (releaseWorkflow === undefined) {
  throw new Error("Missing release workflow");
}

function occurrences(source: string, value: string): number {
  return source.split(value).length - 1;
}

describe("workflow policy", () => {
  it("delegates source revision validation to the canonical version check", () => {
    expect(releaseWorkflow).toContain("bun run version:check");
    expect(releaseWorkflow).not.toContain("src/index.ts");
    expect(releaseWorkflow).not.toContain("REVISION");
  });

  it("keeps current tool versions available to historical release checkouts", () => {
    const nodeVersionFile = readFileSync(`${root}/.node-version`, "utf8");
    const bunVersionFile = readFileSync(`${root}/.bun-version`, "utf8");
    const nodeVersion = nodeVersionFile.trim();
    const bunVersion = bunVersionFile.trim();
    const workflowSource = [...workflows.values()].join("\n");

    expect(nodeVersionFile).toBe(`${nodeVersion}\n`);
    expect(bunVersionFile).toBe(`${bunVersion}\n`);
    expect(nodeVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(bunVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(workflowSource).not.toContain(nodeVersion);
    expect(workflowSource).not.toContain(bunVersion);

    for (const name of ["ci.yml", "pages.yml"]) {
      const workflow = workflows.get(name);
      if (workflow === undefined) throw new Error(`Missing ${name}`);

      const nodeSetups = occurrences(workflow, "uses: actions/setup-node@");
      const bunSetups = occurrences(workflow, "uses: oven-sh/setup-bun@");
      expect(nodeSetups).toBeGreaterThan(0);
      expect(bunSetups).toBeGreaterThan(0);
      expect(occurrences(workflow, "node-version-file: .node-version")).toBe(
        nodeSetups,
      );
      expect(occurrences(workflow, "bun-version-file: .bun-version")).toBe(
        bunSetups,
      );
    }

    const readVersions = releaseWorkflow.indexOf(
      "- name: Read current tool versions",
    );
    const validateNodeSetup = releaseWorkflow.indexOf(
      "uses: actions/setup-node@",
    );
    expect(readVersions).toBeGreaterThan(
      releaseWorkflow.indexOf("uses: actions/checkout@"),
    );
    expect(validateNodeSetup).toBeGreaterThan(readVersions);
    expect(releaseWorkflow).toContain(
      'if ! [[ "$NODE_VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]',
    );
    expect(releaseWorkflow).toContain(
      'if ! [[ "$BUN_VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]',
    );
    expect(occurrences(releaseWorkflow, "cat .node-version")).toBe(1);
    expect(occurrences(releaseWorkflow, "cat .bun-version")).toBe(1);
    expect(releaseWorkflow).not.toContain("node-version-file:");
    expect(releaseWorkflow).not.toContain("bun-version-file:");

    expect(releaseWorkflow).toContain(
      `node_version: \${{ steps.tool_versions.outputs.node_version }}`,
    );
    expect(releaseWorkflow).toContain(
      `bun_version: \${{ steps.tool_versions.outputs.bun_version }}`,
    );
    expect(
      occurrences(
        releaseWorkflow,
        `\${{ steps.tool_versions.outputs.node_version }}`,
      ),
    ).toBe(3);
    expect(
      occurrences(
        releaseWorkflow,
        `\${{ steps.tool_versions.outputs.bun_version }}`,
      ),
    ).toBe(3);
    expect(
      occurrences(
        releaseWorkflow,
        `\${{ needs.validate.outputs.node_version }}`,
      ),
    ).toBe(2);
    expect(
      occurrences(
        releaseWorkflow,
        `\${{ needs.validate.outputs.bun_version }}`,
      ),
    ).toBe(2);
  });

  it("keeps the pinned JSR CLI version centralized without a dependency", () => {
    const versionMatch = releaseWorkflow.match(
      /^ {2}JSR_CLI_VERSION: ([^\s#]+)$/mu,
    );
    expect(versionMatch).not.toBeNull();
    const version = versionMatch?.[1];
    if (version === undefined) return;

    expect(version).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(occurrences(releaseWorkflow, version)).toBe(1);
    expect(
      occurrences(releaseWorkflow, 'bunx "jsr@$JSR_CLI_VERSION" publish'),
    ).toBe(2);
  });
});
