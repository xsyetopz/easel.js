"""Check that package dependencies are current."""

import re
import subprocess
import sys
from pathlib import Path

from .. import resolve_repo_root

_JS_WHITESPACE_CLASS = (
    r"[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a"
    r"\u2028\u2029\u202f\u205f\u3000\ufeff]"
)
_JS_WHITESPACE_CHARACTERS = (
    "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680"
    "\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007"
    "\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)
OUTDATED_ROW_PATTERN = re.compile(
    rf"^\|{_JS_WHITESPACE_CLASS}+(?![-|{_JS_WHITESPACE_CLASS[1:-1]}])[^|]*\|"
)
ALLOWED_OUTDATED_ROWS = [
    # Astro check still depends on the TypeScript 5/6 compiler API.
    # The project keeps TypeScript 7 for the package and uses the alias
    # `typescript-compiler-api` for patched Astro/Volar compatibility.
    re.compile(
        rf"^\|{_JS_WHITESPACE_CLASS}+typescript \(dev\)"
        rf"{_JS_WHITESPACE_CLASS}+\|{_JS_WHITESPACE_CLASS}+"
        rf"(?:5\.9|6\.[0-9]+)\.[0-9]+{_JS_WHITESPACE_CLASS}+\|"
        rf"{_JS_WHITESPACE_CLASS}+(?:5\.9|6\.[0-9]+)\.[0-9]+"
        rf"{_JS_WHITESPACE_CLASS}+\|{_JS_WHITESPACE_CLASS}+"
        rf"7\.[0-9]+\.[0-9]+{_JS_WHITESPACE_CLASS}+\|"
    )
]


def decode_output(output):
    return output.decode("utf-8", errors="replace")


def write_error(message):
    sys.stderr.write(f"{message}\n")


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    del argv
    root = resolve_repo_root(repo_root)
    outdated_run = subprocess.run(
        ["bun", "outdated", "--latest", "--no-progress"],
        capture_output=True,
        check=False,
        cwd=root,
    )
    stdout_text = decode_output(outdated_run.stdout)
    stderr_text = decode_output(outdated_run.stderr)

    if outdated_run.returncode != 0:
        write_error(stderr_text or stdout_text)
        return outdated_run.returncode

    outdated_lines = [
        line
        for line in re.split(r"\r?\n", stdout_text)
        if OUTDATED_ROW_PATTERN.search(line)
        and "| Package" not in line
        and "| Workspace" not in line
        and not any(pattern.search(line) for pattern in ALLOWED_OUTDATED_ROWS)
    ]

    if outdated_lines:
        write_error(
            "Outdated dependencies found. Update every dependency before publishing."
        )
        write_error(stdout_text.strip(_JS_WHITESPACE_CHARACTERS))
        return 1

    sys.stdout.write("Dependencies are current.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
