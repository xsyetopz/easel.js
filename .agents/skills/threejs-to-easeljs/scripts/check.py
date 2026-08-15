#!/usr/bin/env python3
"""Check the portable threejs-to-easeljs skill package."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_H2 = ["Use this skill", "Rules", "Steps", "Resources", "Verify"]
EXPECTED_REFERENCES = [
    "references/animation-controls-picking-audio-physics.md",
    "references/baseline-audit.md",
    "references/geometry-objects.md",
    "references/index.md",
    "references/loaders-exporters-dom-assets.md",
    "references/materials-textures-lights.md",
    "references/renderer-scene-cameras.md",
    "references/unsupported-validation.md",
]
CORE_FILES = [
    "SKILL.md",
    "LICENSE",
    ".skill-validator.json",
    "agents/openai.yaml",
    "assets/contract.json",
    "evals/evals.json",
    "scripts/check.py",
]
STALE_PATHS = ("REFERENCE.md", "references/grounding.md", "references/threejs-migration.md")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
H2_RE = re.compile(r"^## ([^#].*)$", re.MULTILINE)


def load_json(relative: str, errors: list[str]) -> object | None:
    try:
        return json.loads((ROOT / relative).read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        errors.append(f"invalid {relative}: {exc}")
        return None


def local_markdown_links(path: Path, errors: list[str]) -> list[str]:
    links: list[str] = []
    for raw in LINK_RE.findall(path.read_text(encoding="utf-8")):
        target = raw.split("#", 1)[0].strip()
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        links.append(target)
        resolved = (path.parent / target).resolve()
        try:
            resolved.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"{path.relative_to(ROOT)}: link escapes package: {raw}")
            continue
        if not resolved.is_file():
            errors.append(f"{path.relative_to(ROOT)}: broken link: {raw}")
    return links


def check() -> list[str]:
    errors: list[str] = []
    skill_path = ROOT / "SKILL.md"
    skill = skill_path.read_text(encoding="utf-8")

    frontmatter = skill.split("---", 2)[1]
    keys = [line.split(":", 1)[0] for line in frontmatter.splitlines() if ":" in line]
    if keys != ["name", "description"]:
        errors.append(f"SKILL.md frontmatter keys are {keys!r}; expected name and description")
    headings = H2_RE.findall(skill)
    if headings != EXPECTED_H2:
        errors.append(f"SKILL.md H2 headings are {headings!r}; expected {EXPECTED_H2!r}")
    if "python3 scripts/check.py" not in skill or "UNVERIFIED" not in skill:
        errors.append("SKILL.md Verify lacks the package command or UNVERIFIED limit")

    expected_files = {*CORE_FILES, *EXPECTED_REFERENCES}
    for relative in sorted(expected_files):
        if not (ROOT / relative).is_file():
            errors.append(f"missing required file: {relative}")
    actual_references = sorted(
        str(path.relative_to(ROOT)) for path in (ROOT / "references").glob("*.md")
    )
    if actual_references != EXPECTED_REFERENCES:
        errors.append(
            f"reference inventory is {actual_references!r}; expected {EXPECTED_REFERENCES!r}"
        )
    for relative in STALE_PATHS:
        if (ROOT / relative).exists():
            errors.append(f"stale path exists: {relative}")
    for path in ROOT.rglob("*"):
        if path.is_symlink():
            errors.append(f"symlink is not portable: {path.relative_to(ROOT)}")

    markdown = [skill_path, *((ROOT / "references").glob("*.md"))]
    links_by_path = {path: local_markdown_links(path, errors) for path in markdown}
    root_links = links_by_path[skill_path]
    if root_links != ["references/index.md"]:
        errors.append(f"SKILL.md must route only to references/index.md; found {root_links!r}")
    index_path = ROOT / "references/index.md"
    index_routes = sorted({
        str((index_path.parent / link).relative_to(ROOT))
        for link in links_by_path.get(index_path, [])
    })
    expected_leaves = [path for path in EXPECTED_REFERENCES if path != "references/index.md"]
    if index_routes != expected_leaves:
        errors.append(f"index routes are {index_routes!r}; expected {expected_leaves!r}")

    checked_text = [skill_path, ROOT / "agents/openai.yaml", *(ROOT / "references").glob("*.md")]
    for path in checked_text:
        text = path.read_text(encoding="utf-8")
        for stale in STALE_PATHS:
            if stale in text:
                errors.append(f"{path.relative_to(ROOT)}: stale path {stale}")

    config = load_json(".skill-validator.json", errors)
    if isinstance(config, dict):
        expected_config_headings = ["# Three.js to EASEL.js", *[f"## {item}" for item in EXPECTED_H2]]
        if config.get("required_headings") != expected_config_headings:
            errors.append("validator heading contract differs from SKILL.md")
        if sorted(config.get("required_files", [])) != sorted(expected_files):
            errors.append("validator required_files differ from package inventory")

    contract = load_json("assets/contract.json", errors)
    evaluations = load_json("evals/evals.json", errors)
    case_ids: list[str] = []
    if isinstance(evaluations, dict):
        if evaluations.get("schema_version") != 1 or evaluations.get("skill_name") != "threejs-to-easeljs":
            errors.append("eval manifest identity or schema version is invalid")
        static = evaluations.get("static")
        if not isinstance(static, list) or not any(
            isinstance(case, dict) and case.get("command") == "python3 scripts/check.py" and case.get("expect_exit") == 0
            for case in static
        ):
            errors.append("eval manifest lacks the passing package check")
        cases = evaluations.get("codex_cases")
        if not isinstance(cases, list):
            errors.append("eval manifest codex_cases must be a list")
        else:
            for case in cases:
                if not isinstance(case, dict) or set(case) != {"id", "prompt", "expected_outcome"}:
                    errors.append("each codex case must contain id, prompt, and expected_outcome")
                    continue
                if not all(isinstance(case[key], str) and case[key].strip() for key in case):
                    errors.append(f"eval case has an empty field: {case!r}")
                    continue
                case_ids.append(case["id"])
            if len(case_ids) != len(set(case_ids)):
                errors.append("eval case IDs are not unique")
            if not any(case.startswith("positive-") for case in case_ids):
                errors.append("eval manifest lacks a positive case")
            if not any(case.startswith("near-miss-") for case in case_ids):
                errors.append("eval manifest lacks a near-miss case")
            if not any(case.startswith(("safety-", "failure-")) for case in case_ids):
                errors.append("eval manifest lacks a safety or failure case")

    if isinstance(contract, dict):
        if contract.get("schema_version") != 1 or contract.get("skill_name") != "threejs-to-easeljs":
            errors.append("contract identity or schema version is invalid")
        if contract.get("required_headings") != EXPECTED_H2:
            errors.append("contract headings differ from SKILL.md")
        if contract.get("reference_paths") != EXPECTED_REFERENCES:
            errors.append("contract reference_paths differ from the focused inventory")
        if contract.get("eval_case_ids") != case_ids:
            errors.append("contract eval_case_ids differ from the eval manifest")
        for relative in contract.get("required_files", []):
            if not isinstance(relative, str) or not (ROOT / relative).exists():
                errors.append(f"contract required path is missing: {relative!r}")

    loaders = (ROOT / "references/loaders-exporters-dom-assets.md").read_text(
        encoding="utf-8"
    )
    for evidence in (
        "Three r185 also exposes `BufferGeometryLoader`; EASEL does not.",
        "Use EASEL's canonical `GeometryLoader`",
        "supported attribute storage types, index width, morph data",
    ):
        if evidence not in loaders:
            errors.append(f"geometry-loader migration contract is missing: {evidence}")

    baseline = (ROOT / "references/baseline-audit.md").read_text(encoding="utf-8")
    for evidence in (
        "three@0.185.1",
        "@xsyetopz/easel` version `0.7.0",
        "d9fa4d0b272f691b8123ce57dd89c2b4be7698cf",
        "ecf643a7ce6e296464d442acbd242c0364a78a61",
        "would be an inference",
    ):
        if evidence not in baseline:
            errors.append(f"baseline evidence is missing: {evidence}")

    return errors


def main() -> int:
    errors = check()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"FAIL: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print("PASS: package contract, one-hop routes, local links, stale paths, evals, and baseline evidence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
