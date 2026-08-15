"""Read and update the repository's canonical version metadata."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

SEMVER_PATTERN = re.compile(r"^([0-9]+)\.([0-9]+)\.([0-9]+)$")
UNDEFINED = object()

_JS_WHITESPACE_CLASS = (
    r"[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a"
    r"\u2028\u2029\u202f\u205f\u3000\ufeff]"
)
_REVISION_NAME_PATTERN = re.compile(
    r"export" + _JS_WHITESPACE_CLASS + r"+const" + _JS_WHITESPACE_CLASS + r"+REVISION\b"
)
_REVISION_LITERAL_PATTERN = re.compile(
    r"export"
    + _JS_WHITESPACE_CLASS
    + r"+const"
    + _JS_WHITESPACE_CLASS
    + r"+REVISION(?:"
    + _JS_WHITESPACE_CLASS
    + r"*:"
    + _JS_WHITESPACE_CLASS
    + r"*string)?"
    + _JS_WHITESPACE_CLASS
    + r"*="
    + _JS_WHITESPACE_CLASS
    + r'*"(?P<version>[^"\r\n]*)"'
    + _JS_WHITESPACE_CLASS
    + r"*;"
)


@dataclass(frozen=True)
class VersionMetadata:
    """Version-bearing files and the one supported REVISION literal."""

    package_path: Path
    package_json: dict[str, object]
    package_version: object
    jsr_path: Path
    jsr_json: dict[str, object]
    jsr_version: object
    index_path: Path
    index_source: str
    revision_version: object
    revision_span: tuple[int, int] | None


def _read_json(path: Path) -> dict[str, object]:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def write_json(path: Path, body: dict[str, object]) -> None:
    """Write a metadata JSON document in the repository's canonical format."""
    path.write_text(
        json.dumps(body, ensure_ascii=False, indent=2, separators=(",", ": ")) + "\n",
        encoding="utf-8",
    )


def read_version_metadata(root: Path) -> VersionMetadata:
    """Read package, JSR, and a unique literal REVISION declaration."""
    package_path = root / "package.json"
    jsr_path = root / "jsr.json"
    index_path = root / "src/index.ts"
    package_json = _read_json(package_path)
    jsr_json = _read_json(jsr_path)
    index_source = index_path.read_text(encoding="utf-8")

    revision_names = list(_REVISION_NAME_PATTERN.finditer(index_source))
    revision_literals = list(_REVISION_LITERAL_PATTERN.finditer(index_source))
    revision_match = (
        revision_literals[0]
        if len(revision_names) == 1
        and len(revision_literals) == 1
        and revision_names[0].start() == revision_literals[0].start()
        else None
    )

    return VersionMetadata(
        package_path=package_path,
        package_json=package_json,
        package_version=package_json.get("version", UNDEFINED),
        jsr_path=jsr_path,
        jsr_json=jsr_json,
        jsr_version=jsr_json.get("version", UNDEFINED),
        index_path=index_path,
        index_source=index_source,
        revision_version=(
            revision_match.group("version") if revision_match is not None else UNDEFINED
        ),
        revision_span=(
            revision_match.span("version") if revision_match is not None else None
        ),
    )


def replace_revision_version(metadata: VersionMetadata, version: str) -> str:
    """Replace only the version text in the unique REVISION literal."""
    if metadata.revision_span is None:
        raise ValueError("Missing unique literal REVISION declaration")

    start, end = metadata.revision_span
    return metadata.index_source[:start] + version + metadata.index_source[end:]
