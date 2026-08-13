"""Reject uses of the bare ``any`` type in TypeScript tests."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from . import iter_files

_ANY_PATTERN = re.compile(r"\bany\b", re.ASCII)
_LINE_BREAK_PATTERN = re.compile(r"\r?\n")


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Run the test source ``any`` check."""
    del argv
    matches: list[str] = []
    for display_path, file_path in iter_files("tests", ".ts", repo_root):
        lines = _LINE_BREAK_PATTERN.split(file_path.read_text(encoding="utf-8"))
        for line_number, line in enumerate(lines, start=1):
            if _ANY_PATTERN.search(line):
                matches.append(f"{display_path}:{line_number}: {line}")

    if matches:
        print("\n".join(matches), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
