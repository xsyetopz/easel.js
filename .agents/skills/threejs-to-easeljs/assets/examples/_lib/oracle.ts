// Shared oracle helpers for the threejs-to-easeljs examples.
// Each check prints "PASS <construct>: <label>" or "FAIL ..." and a failed
// check sets a non-zero exit code without stopping the remaining checks.

export function check(
  construct: string,
  label: string,
  ok: boolean,
  detail = "",
): void {
  const suffix = detail === "" ? "" : ` (${detail})`;
  if (ok) {
    console.log(`PASS ${construct}: ${label}${suffix}`);
    return;
  }
  console.log(`FAIL ${construct}: ${label}${suffix}`);
  process.exitCode = 1;
}

export function near(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function thrown(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.name : String(error);
  }
  return "none";
}
