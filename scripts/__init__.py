"""Command package for repository maintenance scripts."""

from __future__ import annotations

import importlib
import os
from collections.abc import Iterator, Sequence
from pathlib import Path
from types import ModuleType

COMMANDS: dict[str, str] = {
    "check-version": "check_version",
    "check-no-test-any": "check_no_test_any",
    "check-example-catalog": "check_example_catalog",
    "check-dependencies": "commands.check_dependencies",
    "verify-package": "commands.verify_package",
    "version": "commands.version",
    "release": "commands.release",
}


def resolve_repo_root(repo_root: str | Path | None = None) -> Path:
    """Return the repository root used by a command.

    Commands intentionally default to the process working directory, matching
    the former JavaScript entrypoints. Tests can provide an explicit root.
    """
    if repo_root is None:
        return Path.cwd()
    return Path(repo_root).expanduser().resolve()


def iter_files(
    relative_root: str | Path,
    suffix: str,
    repo_root: str | Path | None = None,
) -> Iterator[tuple[str, Path]]:
    """Yield matching files as display paths and absolute read paths."""
    root = resolve_repo_root(repo_root)
    relative_directory = Path(relative_root)
    if relative_directory.is_absolute():
        raise ValueError("relative_root must be relative to the repository root")

    def walk(directory: Path, relative_directory: Path) -> Iterator[tuple[str, Path]]:
        with os.scandir(directory) as entries:
            for entry in sorted(entries, key=lambda item: item.name):
                entry_relative_path = relative_directory / entry.name
                if entry.is_dir(follow_symlinks=False):
                    yield from walk(directory / entry.name, entry_relative_path)
                elif entry.name.endswith(suffix):
                    yield entry_relative_path.as_posix(), directory / entry.name

    yield from walk(root / relative_directory, relative_directory)


def dispatch_command(
    command: str,
    argv: Sequence[str] = (),
    repo_root: str | Path | None = None,
) -> int:
    """Run a registered command and return its process exit status."""
    module_name = COMMANDS[command]
    module: ModuleType = importlib.import_module(f".{module_name}", __name__)
    command_main = module.main
    return int(command_main(list(argv), repo_root=repo_root))
