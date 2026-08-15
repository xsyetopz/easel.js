import type { ComparisonRow, PublicFact } from "./types.ts";
import {
  GETTER_PATTERN,
  SETTER_PATTERN,
  escapeCell,
  namedCapture,
} from "./text.ts";

const THREE_TO_EASEL_CLASS: Record<string, string> = {
  AnimationMixer: "Animator",
  AnimationObjectGroup: "AnimationGroup",
  AudioAnalyser: "AudioAnalyzer",
  BufferAttribute: "Attribute",
  BufferGeometry: "Geometry",
  Clock: "Timer",
  InterleavedBuffer: "InterleavedData",
  InterleavedBufferAttribute: "InterleavedAttribute",
  KeyframeTrack: "Track",
  LineBasicMaterial: "LineMaterial",
  LineDashedMaterial: "DashedLineMaterial",
  MeshBasicMaterial: "BasicMaterial",
  MeshLambertMaterial: "LambertMaterial",
  Object3D: "Node",
  PropertyBinding: "Binding",
};

function splitSubject(subject: string): { className: string; member: string } {
  const dot = subject.indexOf(".");
  if (dot < 0) return { className: subject, member: "" };
  return {
    className: subject.slice(0, dot),
    member: subject.slice(dot + 1),
  };
}

function accessorSubject(
  className: string,
  member: string,
  prefix: string,
): string {
  const pattern = prefix === "get" ? GETTER_PATTERN : SETTER_PATTERN;
  const match = pattern.exec(member);
  const captured = namedCapture(match?.groups, "member");
  if (!captured) return "";
  const accessorMember = `${captured[0]?.toLowerCase() ?? ""}${captured.slice(1)}`;
  return `${className}.${accessorMember}`;
}

function normalizeThreeFact(
  fact: PublicFact,
  easelAccessorSubjects: ReadonlySet<string>,
): PublicFact {
  const { className, member } = splitSubject(fact.subject);
  const normalizedClass = THREE_TO_EASEL_CLASS[className] ?? className;
  if (fact.kind === "method" && member) {
    for (const prefix of ["get", "set"]) {
      const subject = accessorSubject(normalizedClass, member, prefix);
      if (subject && easelAccessorSubjects.has(subject)) {
        return { ...fact, kind: "accessor", subject };
      }
    }
  }
  if (normalizedClass === className) return fact;
  const subject = member ? `${normalizedClass}.${member}` : normalizedClass;
  return { ...fact, subject };
}

function factSort(left: PublicFact, right: PublicFact): number {
  if (left.subject !== right.subject)
    return left.subject < right.subject ? -1 : 1;
  if (left.kind !== right.kind) return left.kind < right.kind ? -1 : 1;
  if (left.shape !== right.shape) return left.shape < right.shape ? -1 : 1;
  return 0;
}

function rowSort(left: ComparisonRow, right: ComparisonRow): number {
  const stateOrder: Record<ComparisonRow["state"], number> = {
    "=": 0,
    "!": 1,
    "<": 2,
    ">": 3,
  };
  if (left.subject !== right.subject) {
    return left.subject < right.subject ? -1 : 1;
  }
  if (left.kind !== right.kind) return left.kind < right.kind ? -1 : 1;
  const stateDifference = stateOrder[left.state] - stateOrder[right.state];
  if (stateDifference !== 0) return stateDifference;
  if (left.easel !== right.easel) return left.easel < right.easel ? -1 : 1;
  if (left.three !== right.three) return left.three < right.three ? -1 : 1;
  return 0;
}

interface FactGroup {
  easel: PublicFact[];
  three: PublicFact[];
}

function groupFacts(
  easelFacts: readonly PublicFact[],
  threeFacts: readonly PublicFact[],
): Map<string, FactGroup> {
  const groups = new Map<string, FactGroup>();
  for (const [side, facts] of [
    ["easel", easelFacts],
    ["three", threeFacts],
  ] as const) {
    for (const fact of facts) {
      let group = groups.get(fact.subject);
      if (!group) {
        group = { easel: [], three: [] };
        groups.set(fact.subject, group);
      }
      group[side].push(fact);
    }
  }
  return groups;
}

function matchingRows(
  subject: string,
  group: FactGroup,
): { rows: ComparisonRow[]; usedEasel: Set<number>; usedThree: Set<number> } {
  const rows: ComparisonRow[] = [];
  const usedEasel = new Set<number>();
  const usedThree = new Set<number>();
  for (let index = 0; index < group.easel.length; index += 1) {
    const left = group.easel[index];
    if (!left) continue;
    const rightIndex = group.three.findIndex(
      (candidate, candidateIndex) =>
        !usedThree.has(candidateIndex) && candidate.kind === left.kind,
    );
    const right = rightIndex < 0 ? undefined : group.three[rightIndex];
    if (!right) continue;
    usedEasel.add(index);
    usedThree.add(rightIndex);
    rows.push({
      easel: left.shape,
      kind: left.kind,
      state: left.shape === right.shape ? "=" : "!",
      subject,
      three: right.shape,
    });
  }
  return { rows, usedEasel, usedThree };
}

function unmatchedRows(
  subject: string,
  group: FactGroup,
  usedEasel: ReadonlySet<number>,
  usedThree: ReadonlySet<number>,
): ComparisonRow[] {
  const unmatchedEasel = group.easel
    .map((fact, index) => ({ fact, index }))
    .filter((item) => !usedEasel.has(item.index));
  const unmatchedThree = group.three
    .map((fact, index) => ({ fact, index }))
    .filter((item) => !usedThree.has(item.index));
  const rows: ComparisonRow[] = [];
  const pairCount = Math.min(unmatchedEasel.length, unmatchedThree.length);
  for (let index = 0; index < pairCount; index += 1) {
    const left = unmatchedEasel[index]?.fact;
    const right = unmatchedThree[index]?.fact;
    if (!(left && right)) continue;
    rows.push({
      easel: left.shape,
      kind: left.kind === right.kind ? left.kind : `${left.kind}/${right.kind}`,
      state: "!",
      subject,
      three: right.shape,
    });
  }
  for (const item of unmatchedEasel.slice(pairCount)) {
    rows.push({
      easel: item.fact.shape,
      kind: item.fact.kind,
      state: "<",
      subject,
      three: "-",
    });
  }
  for (const item of unmatchedThree.slice(pairCount)) {
    rows.push({
      easel: "-",
      kind: item.fact.kind,
      state: ">",
      subject,
      three: item.fact.shape,
    });
  }
  return rows;
}

export function compareFacts(
  easelFacts: readonly PublicFact[],
  threeFacts: readonly PublicFact[],
): ComparisonRow[] {
  const easel = [...easelFacts].sort(factSort);
  const easelAccessorSubjects = new Set(
    easel
      .filter((fact) => fact.kind === "accessor")
      .map((fact) => fact.subject),
  );
  const three = threeFacts
    .map((fact) => normalizeThreeFact(fact, easelAccessorSubjects))
    .sort(factSort);
  const rows: ComparisonRow[] = [];
  for (const [subject, group] of groupFacts(easel, three)) {
    const matching = matchingRows(subject, group);
    rows.push(
      ...matching.rows,
      ...unmatchedRows(subject, group, matching.usedEasel, matching.usedThree),
    );
  }
  return rows.sort(rowSort);
}

export function formatReport(
  rows: readonly ComparisonRow[],
  easelVersion: string,
  threeVersion: string,
): string {
  const header = [
    `# EASEL=${easelVersion}\tTHREE=${threeVersion}\tentry=src/Three.Core.js`,
    "# columns: state\tsubject\tkind\tEASEL\tTHREE",
    "# state: = both; < EASEL-only; > THREE-only; ! same name but different public shape; EASEL limits: CPU/Canvas2D; affine UV; baked flat/Gouraud; no GPU/shader/PBR/shadow/environment-map surface; limits do not describe THREE core",
  ];
  return `${header.join("\n")}\n${rows
    .map((row) =>
      [row.state, row.subject, row.kind, row.easel, row.three]
        .map(escapeCell)
        .join("\t"),
    )
    .join("\n")}\n`;
}
