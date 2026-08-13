"""Validate that the package, JSR, and source revision versions agree."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from . import resolve_repo_root

_SEMVER_PATTERN = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
_JS_WHITESPACE_CLASS = (
    r"[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a"
    r"\u2028\u2029\u202f\u205f\u3000\ufeff]"
)
_REVISION_PATTERN = re.compile(
    r"export const REVISION(?::"
    + _JS_WHITESPACE_CLASS
    + r"*string)?"
    + _JS_WHITESPACE_CLASS
    + r"*="
    + _JS_WHITESPACE_CLASS
    + r'*"([^"]+)";'
)


def _read_json(path: Path) -> object:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def _display_version(version: object) -> str:
    if version is None:
        return "missing"
    if version is True:
        return "true"
    if version is False:
        return "false"
    return str(version)


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Run the version consistency check."""
    del argv
    root = resolve_repo_root(repo_root)
    package_version = _read_json(root / "package.json").get("version")
    jsr_version = _read_json(root / "jsr.json").get("version")
    index_source = (root / "src/index.ts").read_text(encoding="utf-8")
    revision_match = _REVISION_PATTERN.search(index_source)
    revision_version = revision_match.group(1) if revision_match else None

    versions = [
        ("package.json", package_version),
        ("jsr.json", jsr_version),
        ("src/index.ts REVISION", revision_version),
    ]
    for source, version in versions:
        if not _SEMVER_PATTERN.fullmatch("" if version is None else str(version)):
            print(
                f"{source} has invalid version: {_display_version(version)}",
                file=sys.stderr,
            )
            return 1

    if package_version != jsr_version or package_version != revision_version:
        print(
            "Version mismatch: "
            f"package.json={_display_version(package_version)} "
            f"jsr.json={_display_version(jsr_version)} "
            f"REVISION={_display_version(revision_version)}",
            file=sys.stderr,
        )
        return 1

    print(f"Version consistent: {_display_version(package_version)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
