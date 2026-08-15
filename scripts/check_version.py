"""Validate that the package, JSR, and source revision versions agree."""

from __future__ import annotations

import sys
from pathlib import Path

from . import resolve_repo_root
from ._version_metadata import SEMVER_PATTERN, UNDEFINED, read_version_metadata


def _display_version(version: object) -> str:
    if version is None or version is UNDEFINED:
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
    metadata = read_version_metadata(root)

    versions = [
        ("package.json", metadata.package_version),
        ("jsr.json", metadata.jsr_version),
        ("src/index.ts REVISION", metadata.revision_version),
    ]
    for source, version in versions:
        if not SEMVER_PATTERN.fullmatch(
            "" if version is None or version is UNDEFINED else str(version)
        ):
            print(
                f"{source} has invalid version: {_display_version(version)}",
                file=sys.stderr,
            )
            return 1

    if (
        metadata.package_version != metadata.jsr_version
        or metadata.package_version != metadata.revision_version
    ):
        print(
            "Version mismatch: "
            f"package.json={_display_version(metadata.package_version)} "
            f"jsr.json={_display_version(metadata.jsr_version)} "
            f"REVISION={_display_version(metadata.revision_version)}",
            file=sys.stderr,
        )
        return 1

    print(f"Version consistent: {_display_version(metadata.package_version)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
