"""Update the package, JSR, and source revision versions."""

from __future__ import annotations

import sys
from pathlib import Path

from .. import resolve_repo_root
from .._version_metadata import (
    SEMVER_PATTERN,
    UNDEFINED,
    read_version_metadata,
    replace_revision_version,
    write_json,
)

_VERSION_TARGETS = ("patch", "minor", "major")


def _javascript_strict_equal(left: object, right: object) -> bool:
    if left is UNDEFINED or right is UNDEFINED:
        return left is right
    if isinstance(left, bool) or isinstance(right, bool):
        return isinstance(left, bool) and isinstance(right, bool) and left == right
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return left == right
    if isinstance(left, (dict, list)) or isinstance(right, (dict, list)):
        return left is right
    return type(left) is type(right) and left == right


def _javascript_string(value: object) -> str:
    if value is UNDEFINED:
        return "undefined"
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    return str(value)


def _parse_semver(version: str) -> tuple[int, int, int]:
    match = SEMVER_PATTERN.fullmatch(version)
    if not match:
        raise ValueError(f"Invalid semver: {version}")

    return tuple(int(part) for part in match.groups())


def _bump_version(version: str, target: str | None) -> str:
    major, minor, patch = _parse_semver(version)

    if target == "major":
        return f"{major + 1}.0.0"
    if target == "minor":
        return f"{major}.{minor + 1}.0"
    if target == "patch":
        return f"{major}.{minor}.{patch + 1}"
    if target is not None and SEMVER_PATTERN.fullmatch(target):
        return target

    target_display = "missing" if target is None else target
    raise ValueError(
        f"Expected version target {'|'.join(_VERSION_TARGETS)} or X.Y.Z, "
        f"got {target_display}"
    )


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Update all repository version declarations."""
    arguments = sys.argv[1:] if argv is None else list(argv)
    target = arguments[0] if arguments else None
    if not target:
        print("Usage: bun run version -- X.Y.Z|patch|minor|major", file=sys.stderr)
        return 1

    root = resolve_repo_root(repo_root)
    metadata = read_version_metadata(root)
    package_json = metadata.package_json
    jsr_json = metadata.jsr_json
    package_version = metadata.package_version
    jsr_version = metadata.jsr_version
    revision_version = metadata.revision_version
    if not _javascript_strict_equal(
        package_version, jsr_version
    ) or not _javascript_strict_equal(package_version, revision_version):
        print(
            "Version mismatch: "
            f"package.json={_javascript_string(package_version)} "
            f"jsr.json={_javascript_string(jsr_version)} "
            f"REVISION={_javascript_string(revision_version)}",
            file=sys.stderr,
        )
        return 1

    next_version = _bump_version(package_version, target)
    package_json["version"] = next_version
    jsr_json["version"] = next_version

    write_json(metadata.package_path, package_json)
    write_json(metadata.jsr_path, jsr_json)
    metadata.index_path.write_text(
        replace_revision_version(metadata, next_version),
        encoding="utf-8",
    )
    print(f"Version set to {next_version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
