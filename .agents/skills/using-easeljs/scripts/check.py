#!/usr/bin/env python3
"""Self-check the using-easeljs skill package."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []

for path in ROOT.rglob("*"):
    if not path.is_file() or path.name == "LICENSE":
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    stale_versions = ("0.6" + ".1", "0.6" + ".0")
    if any(version in text for version in stale_versions):
        ERRORS.append(f"stale version in {path.relative_to(ROOT)}")
    if path.suffix == ".md":
        for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", text):
            if target.startswith(("http://", "https://", "#")):
                continue
            file_target = target.split("#", 1)[0]
            if file_target and not (path.parent / file_target).exists():
                ERRORS.append(
                    f"broken link in {path.relative_to(ROOT)}: {target}"
                )

for package in (ROOT / "assets" / "templates").glob("*/package.json"):
    if '"@xsyetopz/easel": "0.7.0"' not in package.read_text(encoding="utf-8"):
        ERRORS.append(f"template is not pinned to 0.7.0: {package.relative_to(ROOT)}")

deno = ROOT / "assets" / "templates" / "deno-browser" / "deno.json"
if "@xsyetopz/easel@0.7.0" not in deno.read_text(encoding="utf-8"):
    ERRORS.append("Deno template is not pinned to 0.7.0")

if ERRORS:
    for error in ERRORS:
        print(f"ERROR: {error}")
    raise SystemExit(1)

print("PASS: using-easeljs package links, versions, and template pins")
