"""Update the package, JSR, and source revision versions."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from .. import resolve_repo_root

_SEMVER_PATTERN = re.compile(r"^([0-9]+)\.([0-9]+)\.([0-9]+)$")
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
_VERSION_TARGETS = ("patch", "minor", "major")
_UNDEFINED = object()


def _read_json(path: Path) -> dict[str, object]:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def _write_json(path: Path, body: dict[str, object]) -> None:
    path.write_text(
        json.dumps(body, ensure_ascii=False, indent=2, separators=(",", ": ")) + "\n",
        encoding="utf-8",
    )


def _property(body: dict[str, object], name: str) -> object:
    return body.get(name, _UNDEFINED)


def _javascript_strict_equal(left: object, right: object) -> bool:
    if left is _UNDEFINED or right is _UNDEFINED:
        return left is right
    if isinstance(left, bool) or isinstance(right, bool):
        return isinstance(left, bool) and isinstance(right, bool) and left == right
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return left == right
    if isinstance(left, (dict, list)) or isinstance(right, (dict, list)):
        return left is right
    return type(left) is type(right) and left == right


def _javascript_string(value: object) -> str:
    if value is _UNDEFINED:
        return "undefined"
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    return str(value)


def _parse_semver(version: str) -> tuple[int, int, int]:
    match = _SEMVER_PATTERN.fullmatch(version)
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
    if target is not None and _SEMVER_PATTERN.fullmatch(target):
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
    package_json = _read_json(root / "package.json")
    jsr_json = _read_json(root / "jsr.json")
    index_path = root / "src/index.ts"
    index_source = index_path.read_text(encoding="utf-8")
    revision_match = _REVISION_PATTERN.search(index_source)
    revision_version = (
        revision_match.group(1) if revision_match is not None else _UNDEFINED
    )

    package_version = _property(package_json, "version")
    jsr_version = _property(jsr_json, "version")
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

    _write_json(root / "package.json", package_json)
    _write_json(root / "jsr.json", jsr_json)
    index_path.write_text(
        _REVISION_PATTERN.sub(
            f'export const REVISION: string = "{next_version}";',
            index_source,
            count=1,
        ),
        encoding="utf-8",
    )
    print(f"Version set to {next_version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
