#!/usr/bin/env python3
"""Self-check the portable using-easeljs skill package."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []
EXPECTED_HEADINGS = [
    "Use this skill",
    "Rules",
    "Steps",
    "Resources",
    "Verify",
]
REQUIRED_FILES = [
    "SKILL.md",
    "LICENSE",
    ".skill-validator.json",
    "agents/openai.yaml",
    "references/index.md",
    "assets/contract.json",
    "evals/evals.json",
    "scripts/check.py",
]


def error(message: str) -> None:
    ERRORS.append(message)


def load_json(relative: str) -> object | None:
    try:
        return json.loads((ROOT / relative).read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        error(f"invalid {relative}: {exc}")
        return None


for relative in REQUIRED_FILES:
    if not (ROOT / relative).exists():
        error(f"missing required path: {relative}")

skill_text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
frontmatter_match = re.match(r"^---\n(.*?)\n---\n", skill_text, re.DOTALL)
if frontmatter_match is None:
    error("SKILL.md frontmatter is missing or malformed")
else:
    frontmatter_lines = frontmatter_match.group(1).splitlines()
    if not frontmatter_lines or frontmatter_lines[0] != "name: using-easeljs":
        error("SKILL.md name must be using-easeljs")
    if len(frontmatter_lines) != 2 or not frontmatter_lines[1].startswith("description: "):
        error("SKILL.md frontmatter must contain only name and description")
h2s = re.findall(r"^## ([^#].*)$", skill_text, re.MULTILINE)
if h2s != EXPECTED_HEADINGS:
    error(f"SKILL.md H2 order is {h2s!r}, expected {EXPECTED_HEADINGS!r}")
if "python3 scripts/check.py" not in skill_text:
    error("SKILL.md Verify must name python3 scripts/check.py")
if "UNVERIFIED" not in skill_text:
    error("SKILL.md Verify must classify unavailable evidence as UNVERIFIED")

contract = load_json("assets/contract.json")
evals = load_json("evals/evals.json")
config = load_json(".skill-validator.json")

if isinstance(contract, dict):
    if contract.get("schema_version") != 1:
        error("assets/contract.json schema_version must be 1")
    if contract.get("skill_name") != "using-easeljs":
        error("assets/contract.json skill_name must be using-easeljs")
    if contract.get("required_headings") != EXPECTED_HEADINGS:
        error("contract required_headings do not match SKILL.md contract")
    for relative in contract.get("required_files", []):
        if not isinstance(relative, str) or not (ROOT / relative).exists():
            error(f"contract required path is missing: {relative!r}")
    reference_paths = contract.get("reference_paths")
    actual_references = sorted(
        str(path.relative_to(ROOT)) for path in (ROOT / "references").glob("*.md")
    )
    if reference_paths != actual_references:
        error("contract reference_paths do not match references/*.md")
else:
    reference_paths = []

if isinstance(evals, dict):
    if evals.get("schema_version") != 1 or evals.get("skill_name") != "using-easeljs":
        error("eval manifest identity or schema_version is invalid")
    cases = evals.get("codex_cases")
    if not isinstance(cases, list):
        error("eval manifest codex_cases must be a list")
        case_ids: list[str] = []
    else:
        case_ids = []
        for case in cases:
            if not isinstance(case, dict) or set(case) != {"id", "prompt", "expected_outcome"}:
                error("each eval case must contain only id, prompt, and expected_outcome")
                continue
            if not all(isinstance(case[key], str) and case[key].strip() for key in case):
                error(f"eval case has an empty or non-string field: {case!r}")
                continue
            case_ids.append(case["id"])
        if len(case_ids) != len(set(case_ids)):
            error("eval case ids must be unique")
        if sum(case_id.startswith("positive-") for case_id in case_ids) < 3:
            error("eval manifest needs at least three positive routing cases")
        if sum(case_id.startswith("near-miss-") for case_id in case_ids) < 3:
            error("eval manifest needs at least three near-miss routing cases")
    if isinstance(contract, dict) and contract.get("eval_case_ids") != case_ids:
        error("contract eval_case_ids do not match eval manifest order")

if isinstance(config, dict):
    expected_config_headings = ["# Using EASEL.js"] + [
        f"## {heading}" for heading in EXPECTED_HEADINGS
    ]
    if config.get("required_headings") != expected_config_headings:
        error(".skill-validator.json required_headings do not match the contract")
    configured = config.get("required_files", [])
    for relative in configured:
        if not isinstance(relative, str) or not (ROOT / relative).exists():
            error(f"validator-configured path is missing: {relative!r}")

openai_text = (ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")
for field in ("display_name:", "short_description:", "default_prompt:"):
    if field not in openai_text:
        error(f"agents/openai.yaml is missing {field[:-1]}")
if "$using-easeljs" not in openai_text:
    error("agents/openai.yaml default_prompt must invoke $using-easeljs")

route_text = skill_text + "\n" + (ROOT / "references/index.md").read_text(encoding="utf-8")
for relative in reference_paths if isinstance(reference_paths, list) else []:
    if relative == "references/index.md":
        target = "references/index.md"
    else:
        target = Path(relative).name
    if f"]({target}" not in route_text:
        error(f"contract reference is not routed in one hop: {relative}")

for path in ROOT.rglob("*"):
    if path.is_symlink():
        error(f"symlink is not portable: {path.relative_to(ROOT)}")
    if not path.is_file() or path.name == "LICENSE":
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    stale_versions = ("0.6" + ".1", "0.6" + ".0")
    if any(version in text for version in stale_versions):
        error(f"stale version in {path.relative_to(ROOT)}")
    forbidden_roots = ("/" + "Users/", "/" + "home/", "~/" + ".agents/")
    if any(fragment in text for fragment in forbidden_roots):
        error(f"host-specific path in {path.relative_to(ROOT)}")
    if path.suffix == ".md":
        for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", text):
            if target.startswith(("http://", "https://", "#")):
                continue
            file_target = target.split("#", 1)[0]
            if file_target and not (path.parent / file_target).exists():
                error(f"broken link in {path.relative_to(ROOT)}: {target}")

for package in (ROOT / "assets" / "templates").glob("*/package.json"):
    if '"@xsyetopz/easel": "0.7.0"' not in package.read_text(encoding="utf-8"):
        error(f"template is not pinned to 0.7.0: {package.relative_to(ROOT)}")

deno = ROOT / "assets" / "templates" / "deno-browser" / "deno.json"
if "@xsyetopz/easel@0.7.0" not in deno.read_text(encoding="utf-8"):
    error("Deno template is not pinned to 0.7.0")

geometry_text = (ROOT / "references" / "geometry.md").read_text(encoding="utf-8")
if "`Geometry.index` is an accessor in 0.7.0" not in geometry_text:
    error("geometry guide must identify Geometry.index as the 0.7.0 accessor")
if re.search(r"\bgeometry\.setIndex\s*\(", geometry_text):
    error("geometry guide must not call removed geometry.setIndex()")

loader_text = (ROOT / "references" / "loaders-and-serialization.md").read_text(
    encoding="utf-8"
)
if "`GeometryLoader` is the single geometry-JSON loader." not in loader_text:
    error("loader guide must identify the canonical GeometryLoader")
removed_loader_name = "Buffer" + "GeometryLoader"
for path in (ROOT / "SKILL.md", *(ROOT / "references").glob("*.md"), ROOT / "evals" / "evals.json"):
    if removed_loader_name in path.read_text(encoding="utf-8"):
        error(f"removed geometry-loader name in {path.relative_to(ROOT)}")

if ERRORS:
    for message in ERRORS:
        print(f"ERROR: {message}")
    raise SystemExit(1)

print("PASS: using-easeljs package contract, routes, links, versions, and template pins")
