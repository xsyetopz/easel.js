"""Dispatch the repository release workflow."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from .. import resolve_repo_root

_SEMVER_PATTERN = r"^[0-9]+\.[0-9]+\.[0-9]+$"
_UNDEFINED = object()


def _read_json(path: Path) -> dict[str, object]:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def _property(body: dict[str, object], name: str) -> object:
    return body.get(name, _UNDEFINED)


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


def _decode_output(output: bytes) -> str:
    return output.decode("utf-8", errors="replace")


_JS_TRIM_CHARACTERS = (
    "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680"
    "\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007"
    "\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)


def _javascript_trim(value: str) -> str:
    return value.strip(_JS_TRIM_CHARACTERS)


def _run(
    command: list[str],
    *,
    capture: bool = False,
    cwd: Path,
) -> str:
    if capture:
        command_run = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            check=False,
        )
        stdout_text = _javascript_trim(_decode_output(command_run.stdout))
        stderr_text = _javascript_trim(_decode_output(command_run.stderr))
    else:
        command_run = subprocess.run(command, cwd=cwd, check=False)
        stdout_text = ""
        stderr_text = ""

    if command_run.returncode != 0:
        if stdout_text:
            print(stdout_text, file=sys.stderr)
        if stderr_text:
            print(stderr_text, file=sys.stderr)
        raise RuntimeError(f"Command failed: {' '.join(command)}")

    return stdout_text


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Validate release preconditions and dispatch the workflow."""
    arguments = sys.argv[1:] if argv is None else list(argv)
    version = arguments[0] if arguments else None
    if version is None or not re.fullmatch(_SEMVER_PATTERN, version):
        print("Usage: bun run release -- X.Y.Z", file=sys.stderr)
        return 1

    root = resolve_repo_root(repo_root)
    package_json = _read_json(root / "package.json")
    package_version = _property(package_json, "version")
    if package_version != version:
        print(
            f"package.json version {_javascript_string(package_version)} "
            f"does not match {version}",
            file=sys.stderr,
        )
        return 1

    branch_name = _run(
        ["git", "branch", "--show-current"],
        capture=True,
        cwd=root,
    )
    if branch_name != "main":
        print(f"Release must run from main, got {branch_name}", file=sys.stderr)
        return 1

    git_status = _run(
        ["git", "status", "--porcelain"],
        capture=True,
        cwd=root,
    )
    if git_status:
        print("Release requires a clean working tree.", file=sys.stderr)
        print(git_status, file=sys.stderr)
        return 1

    tag_name = f"v{version}"
    local_tag = _run(
        ["git", "tag", "--list", tag_name],
        capture=True,
        cwd=root,
    )
    if local_tag:
        print(f"Tag already exists locally: {tag_name}", file=sys.stderr)
        return 1

    if shutil.which("gh") is None:
        print("GitHub CLI is required: gh", file=sys.stderr)
        return 1

    _run(
        [
            "gh",
            "workflow",
            "run",
            "release.yml",
            "--ref",
            "main",
            "-f",
            f"version={version}",
        ],
        cwd=root,
    )
    print(f"Release workflow dispatched for {tag_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
