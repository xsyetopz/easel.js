"""Validate the task-oriented EASEL.js example catalog."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from . import iter_files

_EXPECTED_CATEGORIES = (
    "motion",
    "worlds",
    "interaction",
    "materials",
    "geometry",
    "assets",
    "data",
)
_REGISTRY_ENTRY_PATTERN = re.compile(
    r"  \{\n"
    r"    meta: \{(?P<meta>[\s\S]*?)\n"
    r"    \},\n"
    r"    controls: (?P<controls>[\s\S]*?),\n"
    r"    easelSource: `(?P<source>(?:\\`|[^`])*)`,\n"
    r"    load:\s*async \(\) =>\s*\(await import\(\"\./(?P<path>[^\"]+)\"\)\)\.example,\n"
    r"  \},",
    re.MULTILINE,
)
_META_PATTERN = re.compile(r"export const meta = \{([\s\S]*?)\n\};")
_FIELD_PATTERN = re.compile(r'\b(id|name|category|description):\s*"([^"]*)",')
_ANIMATED_PATTERN = re.compile(r"\banimated:\s*(true|false),")
_SOURCE_PATTERN = re.compile(r"export const easelSource = `")
_HELPER_PATHS = {
    "www/examples/canvas/direct/direct_helpers.js",
    "www/examples/canvas/interaction/canvas_interaction_helpers.js",
}


def _template_body(source: str, start: int) -> str | None:
    index = start
    while index < len(source):
        if source[index] == "\\":
            index += 2
            continue
        if source[index] == "`":
            return source[start:index]
        index += 1
    return None


def _error(failures: list[str], message: str) -> None:
    failures.append(message)


def check_catalog(repo_root: Path) -> list[str]:
    failures: list[str] = []
    registry_path = repo_root / "www/examples/registry.ts"
    try:
        registry_source = registry_path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        return [f"missing catalog file: {error.filename}"]

    registry_entries = list(_REGISTRY_ENTRY_PATTERN.finditer(registry_source))
    if not registry_entries:
        return ["registry has no lazy example entries"]
    entry_paths = [entry.group("path") for entry in registry_entries]
    entry_fields = [
        dict(_FIELD_PATTERN.findall(entry.group("meta")))
        for entry in registry_entries
    ]
    entry_ids = [fields.get("id", "") for fields in entry_fields]
    if len(entry_paths) != len(set(entry_paths)):
        _error(failures, "registry contains duplicate module paths")
    if len(entry_ids) != len(set(entry_ids)):
        _error(failures, "registry contains duplicate example IDs")

    labels_match = re.search(
        r"export const categoryLabels = \{([\s\S]*?)\} as const;",
        registry_source,
    )
    if not labels_match:
        _error(failures, "registry is missing categoryLabels")
    else:
        labels = re.findall(r"^\s*([a-z]+):", labels_match.group(1), re.MULTILINE)
        if labels != list(_EXPECTED_CATEGORIES):
            _error(failures, "categoryLabels are not in deterministic catalog order")

    registry_paths = {f"www/examples/{path}" for path in entry_paths}
    actual_modules = {
        display_path
        for display_path, _ in iter_files("www/examples", ".js", repo_root)
        if display_path not in _HELPER_PATHS
    }
    if actual_modules != registry_paths:
        missing = sorted(registry_paths - actual_modules)
        unexpected = sorted(actual_modules - registry_paths)
        if missing:
            _error(failures, f"registry modules are missing: {', '.join(missing)}")
        if unexpected:
            _error(failures, f"unregistered example modules remain: {', '.join(unexpected)}")

    for entry, relative_path, registry_fields in zip(
        registry_entries, entry_paths, entry_fields, strict=True
    ):
        display_path = f"www/examples/{relative_path}"
        path = repo_root / display_path
        if not path.is_file():
            _error(failures, f"registry module is missing: {relative_path}")
            continue
        registry_source_body = entry.group("source")
        if "@xsyetopz/easel" not in registry_source_body:
            _error(failures, f"{display_path}: registry source is not a package example")
        if registry_fields.get("category") not in _EXPECTED_CATEGORIES:
            _error(failures, f"{display_path}: registry category is not in the catalog")

        source = path.read_text(encoding="utf-8")
        meta_match = _META_PATTERN.search(source)
        if not meta_match:
            _error(failures, f"{display_path}: missing meta")
            continue
        fields = dict(_FIELD_PATTERN.findall(meta_match.group(1)))
        if not fields.get("id") or not re.fullmatch(
            r"[a-z0-9]+(?:-[a-z0-9]+)*", fields["id"]
        ):
            _error(failures, f"{display_path}: meta.id is not a canonical slug")
        if fields.get("id") != registry_fields.get("id"):
            _error(failures, f"{display_path}: module and registry IDs differ")
        if fields.get("category") not in _EXPECTED_CATEGORIES:
            _error(failures, f"{display_path}: meta.category is not in the catalog")
        if fields.get("category") != registry_fields.get("category"):
            _error(failures, f"{display_path}: module and registry categories differ")
        module_animated_match = _ANIMATED_PATTERN.search(meta_match.group(1))
        registry_animated_match = _ANIMATED_PATTERN.search(entry.group("meta"))
        if module_animated_match is None or registry_animated_match is None:
            _error(failures, f"{display_path}: missing animated capability metadata")
        elif module_animated_match.group(1) != registry_animated_match.group(1):
            _error(
                failures,
                f"{display_path}: module and registry animation metadata differ",
            )
        if not fields.get("name") or not fields.get("description"):
            _error(failures, f"{display_path}: user-facing name/description is incomplete")
        elif fields["description"] == f'{fields["name"]}.':
            _error(failures, f"{display_path}: description repeats the title")
        elif len(fields["description"]) < 40:
            _error(failures, f"{display_path}: description is too short for a real task")
        if re.search(r"three|webgl|webgpu|upstream|comparison|migration", source, re.IGNORECASE):
            _error(failures, f"{display_path}: comparison language remains in the EASEL example")
        has_animation_loop = any(
            marker in source
            for marker in (
                "createExampleAnimationLoop",
                "runLoop(",
                "setupDirect(",
                "mountGLTFExample(",
            )
        )
        if module_animated_match is not None:
            is_animated = module_animated_match.group(1) == "true"
            if has_animation_loop != is_animated:
                _error(
                    failures,
                    f"{display_path}: animated metadata does not match its loop capability",
                )
        if "threeSource" in source or "upstreamExample" in source or "upstreamSourceHash" in source:
            _error(failures, f"{display_path}: legacy comparison payload remains")
        source_match = _SOURCE_PATTERN.search(source)
        if not source_match:
            _error(failures, f"{display_path}: missing easelSource")
            continue
        body = _template_body(source, source_match.end())
        if body is None or "@xsyetopz/easel" not in body:
            _error(failures, f"{display_path}: easelSource is not a package example")
        if re.search(r"/\*\s*(?:glsl|placeholder)|TODO|FIXME", body or "", re.IGNORECASE):
            _error(failures, f"{display_path}: placeholder source remains")

    return failures


def main(argv: list[str] | None = None, repo_root: str | Path | None = None) -> int:
    del argv
    root = Path(repo_root) if repo_root is not None else Path.cwd()
    failures = check_catalog(root)
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    registry_source = (root / "www/examples/registry.ts").read_text(encoding="utf-8")
    print(f"example catalog OK: {len(_REGISTRY_ENTRY_PATTERN.findall(registry_source))} entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
