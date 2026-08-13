"""Canonical command dispatcher for ``python -m scripts``."""

from __future__ import annotations

import sys
from collections.abc import Sequence
from pathlib import Path

from . import COMMANDS, dispatch_command

_USAGE = """Usage: python -m scripts <command>

Commands:
  check-version
  check-no-test-any
  check-example-source-parity
  check-dependencies
  verify-package
  version
  release
  audit-threejs-parity"""


def main(
    argv: Sequence[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Dispatch one maintenance command and return its process exit status."""
    arguments = list(sys.argv[1:] if argv is None else argv)
    if not arguments:
        print(_USAGE, file=sys.stderr)
        return 1

    command, command_arguments = arguments[0], arguments[1:]
    if command in {"-h", "--help"}:
        print(_USAGE)
        return 0

    if command not in COMMANDS:
        print(f"Unknown command: {command}", file=sys.stderr)
        print(_USAGE, file=sys.stderr)
        return 1

    return dispatch_command(command, command_arguments, repo_root=repo_root)


if __name__ == "__main__":
    raise SystemExit(main())
