"""Validate source correspondence metadata in website examples."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from . import iter_files

_SOURCE_PATTERN = re.compile(
    r"export const (easelSource|threeSource) = "
    r"(`([\s\S]*?)`|undefined);",
)
_JS_WHITESPACE_CLASS = (
    r"[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a"
    r"\u2028\u2029\u202f\u205f\u3000\ufeff]"
)
_JS_WHITESPACE_CHARACTERS = (
    "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680"
    "\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007"
    "\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)
_META_ID_PATTERN = re.compile(
    r"export const meta"
    + _JS_WHITESPACE_CLASS
    + r"*="
    + _JS_WHITESPACE_CLASS
    + r"*\{[\s\S]*?"
    + r"(?<![A-Za-z0-9_])id:"
    + _JS_WHITESPACE_CLASS
    + r'*["\']([^"\']+)["\']'
)
_ADAPTER_ID_PATTERN = re.compile(
    r"export const threeAdapterId"
    + _JS_WHITESPACE_CLASS
    + r"*="
    + _JS_WHITESPACE_CLASS
    + r"*meta\.id;"
)
_NO_THREE_REASON_PATTERN = re.compile(r'export const noThreeReason = "([^"]+)";')
_COMMENT_PATTERN = re.compile(r"//[^\r\n\u2028\u2029]*|/\*[\s\S]*?\*/")
_WHITESPACE_PATTERN = re.compile(_JS_WHITESPACE_CLASS + r"+")


def _normalize_comment(comment: str) -> str:
    for name in ("EASEL.js", "THREE.js", "EASEL", "THREE"):
        comment = comment.replace(name, "LIB")
    return _WHITESPACE_PATTERN.sub(" ", comment).strip(_JS_WHITESPACE_CHARACTERS)


def _collect_comments(source: str) -> list[str]:
    return [
        _normalize_comment(match.group(0))
        for match in _COMMENT_PATTERN.finditer(source)
    ]


def _source_exports(source: str) -> dict[str, str | None]:
    exports: dict[str, str | None] = {}
    for match in _SOURCE_PATTERN.finditer(source):
        exports[match.group(1)] = (
            None if match.group(2) == "undefined" else match.group(3)
        )
    return exports


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Run the example source correspondence check."""
    del argv
    failures: list[str] = []
    for display_path, file_path in iter_files("www/examples", ".js", repo_root):
        source = file_path.read_text(encoding="utf-8")
        meta_match = _META_ID_PATTERN.search(source)
        meta_id = meta_match.group(1) if meta_match else None
        sources = _source_exports(source)
        if "easelSource" not in sources:
            continue
        if not meta_id:
            failures.append(
                f"{display_path}: missing meta.id for source correspondence"
            )
            continue
        if "threeSource" not in sources:
            failures.append(f"{display_path}: missing threeSource export")
            continue

        three_source = sources["threeSource"]
        if three_source is None:
            reason_match = _NO_THREE_REASON_PATTERN.search(source)
            reason = reason_match.group(1).strip() if reason_match else ""
            if not reason:
                failures.append(f"{display_path}: missing noThreeReason")
            continue

        easel_source = sources["easelSource"]
        if easel_source is None or "easel" not in easel_source.lower():
            failures.append(
                f"{display_path}: easelSource does not identify EASEL.js code"
            )
        if "three" not in three_source.lower():
            failures.append(
                f"{display_path}: threeSource does not identify THREE.js code"
            )
        if _ADAPTER_ID_PATTERN.search(source) and f'id: "{meta_id}"' not in source:
            failures.append(
                f"{display_path}: threeAdapterId must refer to the module's exact meta.id"
            )

        easel_comments = _collect_comments(easel_source or "")
        three_comments = _collect_comments(three_source)
        if len(easel_comments) != len(three_comments):
            failures.append(
                f"{display_path}: comment count "
                f"{len(easel_comments)} vs {len(three_comments)}"
            )
            continue
        for index, easel_comment in enumerate(easel_comments):
            three_comment = three_comments[index]
            if easel_comment != three_comment:
                failures.append(
                    f"{display_path}: comment {index + 1} differs: "
                    f"{easel_comment} vs {three_comment}"
                )

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
