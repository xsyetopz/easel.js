"""Validate the three.js side-by-side EASEL.js example catalog."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from . import iter_files

# Category order of three.js r186 examples/files.json; the catalog uses an
# ordered subset of it.
_THREE_CATEGORY_ORDER = (
    "canvas",
    "webaudio",
    "physics",
    "misc",
)
_THREE_REVISION = "r186"
_REGISTRY_ENTRY_PATTERN = re.compile(
    r"  \{\n"
    r"    meta: \{(?P<meta>[\s\S]*?)\n"
    r"    \},\n"
    r"    controls: (?P<controls>[\s\S]*?),\n"
    r"    load:\s*async \(\) =>\s*\(await import\(\"\./(?P<path>[^\"]+)\"\)\)\s*\.example,\n"
    r"    loadThree:\s*async \(\) =>\s*\(await import\(\"\./(?P<three>[^\"]+)\"\)\)\s*\.example,\n"
    r"  \},",
    re.MULTILINE,
)
_META_PATTERN = re.compile(r"export const meta = \{([\s\S]*?)\n\};")
_FIELD_PATTERN = re.compile(
    r'\b(id|upstream|name|category|description):\s*"([^"]*)",'
)
_ANIMATED_PATTERN = re.compile(r"\banimated:\s*(true|false),")
_DIFFERENCES_PATTERN = re.compile(r"\bdifferences:\s*\[")
_SOURCE_PATTERN = re.compile(r"export const easelSource = `")
_ID_PATTERN = re.compile(r"[a-z0-9]+(?:_[a-z0-9]+)*")
_HELPER_PATHS: set[str] = set()


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


def _check_three_module(
    failures: list[str], display_path: str, source: str, example_id: str
) -> None:
    header = f"examples/{example_id}.html"
    if f"three.js {_THREE_REVISION} {header}" not in source:
        failures.append(
            f"{display_path}: missing 'Adapted from three.js {_THREE_REVISION} {header}' header"
        )
    if "MIT License" not in source:
        failures.append(f"{display_path}: missing three.js MIT license notice")
    if "export function setup(" not in source:
        failures.append(f"{display_path}: missing setup(canvas, params)")


def _check_easel_module(
    failures: list[str],
    display_path: str,
    source: str,
    entry: re.Match[str],
    registry_fields: dict[str, str],
) -> None:
    meta_match = _META_PATTERN.search(source)
    if not meta_match:
        failures.append(f"{display_path}: missing meta")
        return
    fields = dict(_FIELD_PATTERN.findall(meta_match.group(1)))
    if fields.get("upstream") != registry_fields.get("upstream"):
        failures.append(f"{display_path}: module and registry upstream ids differ")
    if fields.get("id") != registry_fields.get("id"):
        failures.append(f"{display_path}: module and registry IDs differ")
    if fields.get("category") != registry_fields.get("category"):
        failures.append(f"{display_path}: module and registry categories differ")
    if not _DIFFERENCES_PATTERN.search(meta_match.group(1)):
        failures.append(f"{display_path}: meta.differences is missing")
    module_animated = _ANIMATED_PATTERN.search(meta_match.group(1))
    registry_animated = _ANIMATED_PATTERN.search(entry.group("meta"))
    if module_animated is None or registry_animated is None:
        failures.append(f"{display_path}: missing animated capability metadata")
    elif module_animated.group(1) != registry_animated.group(1):
        failures.append(f"{display_path}: module and registry animation metadata differ")
    elif (module_animated.group(1) == "true") != (
        "createExampleAnimationLoop" in source
    ):
        failures.append(
            f"{display_path}: animated metadata does not match its loop capability"
        )
    if not fields.get("name") or not fields.get("description"):
        failures.append(f"{display_path}: user-facing name/description is incomplete")
    elif len(fields["description"]) < 40:
        failures.append(f"{display_path}: description is too short for a real task")
    source_match = _SOURCE_PATTERN.search(source)
    if not source_match:
        failures.append(f"{display_path}: missing easelSource")
        return
    body = _template_body(source, source_match.end())
    if body is None or "@xsyetopz/easel" not in body:
        failures.append(f"{display_path}: easelSource is not a package example")
    if re.search(r"/\*\s*(?:glsl|placeholder)|TODO|FIXME", body or "", re.IGNORECASE):
        failures.append(f"{display_path}: placeholder source remains")


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
    entry_fields = [
        dict(_FIELD_PATTERN.findall(entry.group("meta"))) for entry in registry_entries
    ]
    entry_ids = [fields.get("id", "") for fields in entry_fields]
    if len(entry_ids) != len(set(entry_ids)):
        failures.append("registry contains duplicate example IDs")

    labels_match = re.search(
        r"export const categoryLabels = \{([\s\S]*?)\} as const;",
        registry_source,
    )
    labels: list[str] = []
    if not labels_match:
        failures.append("registry is missing categoryLabels")
    else:
        labels = re.findall(r"^\s*([a-z]+):", labels_match.group(1), re.MULTILINE)
        ordered = [category for category in _THREE_CATEGORY_ORDER if category in labels]
        if labels != ordered or len(labels) != len(set(labels)):
            failures.append("categoryLabels are not an ordered subset of three.js categories")
        used = {fields.get("category") for fields in entry_fields}
        if unused := sorted(set(labels) - used):
            failures.append(f"categoryLabels without examples: {', '.join(unused)}")

    registry_paths: set[str] = set()
    for entry, fields in zip(registry_entries, entry_fields, strict=True):
        example_id = fields.get("id", "")
        upstream = fields.get("upstream", "")
        category = fields.get("category", "")
        if not _ID_PATTERN.fullmatch(upstream):
            failures.append(f"{example_id!r}: upstream is not a three.js example id")
        # EASEL renders with Canvas2D, so three.js webgl_ ids become canvas_.
        expected_id = (
            "canvas_" + upstream[len("webgl_") :]
            if upstream.startswith("webgl_")
            else upstream
        )
        if example_id != expected_id:
            failures.append(f"{example_id!r}: id must be {expected_id!r}")
        if category not in labels:
            failures.append(f"{example_id}: registry category is not in the catalog")
        expected_dir = f"{category}/{example_id}"
        for group, name in (("path", "easel.js"), ("three", "three.js")):
            relative_path = entry.group(group)
            display_path = f"www/examples/{relative_path}"
            registry_paths.add(display_path)
            if relative_path != f"{expected_dir}/{name}":
                failures.append(f"{display_path}: expected www/examples/{expected_dir}/{name}")
            path = repo_root / display_path
            if not path.is_file():
                failures.append(f"registry module is missing: {relative_path}")
                continue
            source = path.read_text(encoding="utf-8")
            if name == "three.js":
                _check_three_module(failures, display_path, source, upstream)
            else:
                _check_easel_module(failures, display_path, source, entry, fields)

    actual_modules = {
        display_path
        for display_path, _ in iter_files("www/examples", ".js", repo_root)
        if display_path not in _HELPER_PATHS
    }
    # Helper modules may sit beside the pair inside a registered example's own
    # directory; anything else under www/examples must be registered.
    example_dirs = {path.rsplit("/", 1)[0] + "/" for path in registry_paths}
    if unexpected := sorted(
        path
        for path in actual_modules - registry_paths
        if not any(path.startswith(directory) for directory in example_dirs)
    ):
        failures.append(f"unregistered example modules remain: {', '.join(unexpected)}")

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
