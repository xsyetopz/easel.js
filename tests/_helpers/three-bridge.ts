export function nearEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}

export function compareArrays(
  EASELArr: ArrayLike<number>,
  THREEArr: ArrayLike<number>,
  epsilon = 1e-6,
): { pass: boolean; failures: string[] } {
  if (EASELArr.length !== THREEArr.length) {
    return {
      pass: false,
      failures: [`length ${EASELArr.length} vs ${THREEArr.length}`],
    };
  }
  const failures: string[] = [];
  for (let i = 0; i < EASELArr.length; i++) {
    if (Math.abs(EASELArr[i] - THREEArr[i]) >= epsilon) {
      failures.push(`[${i}]: ${EASELArr[i]} vs ${THREEArr[i]}`);
    }
  }
  return { pass: failures.length === 0, failures };
}
