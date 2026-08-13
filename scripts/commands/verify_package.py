"""Verify the package tarball and smoke-install its ESM and CJS entrypoints."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .. import resolve_repo_root

REQUIRED_PACKAGE_FILES = [
    "dist/index.es.js",
    "dist/index.cjs",
    "dist/index.umd.js",
    "dist/index.d.ts",
]


def decode_output(output):
    return output.decode("utf-8", errors="replace")


def read_json(path):
    with open(path, encoding="utf-8") as file:
        return json.load(file)


def write_error(message):
    sys.stderr.write(f"{message}\n")


def remove_directory(path):
    try:
        shutil.rmtree(path)
    except FileNotFoundError:
        pass


def run(command, cwd=None, capture=False):
    if capture:
        command_run = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            check=False,
        )
        stdout_text = decode_output(command_run.stdout)
        stderr_text = decode_output(command_run.stderr)
    else:
        command_run = subprocess.run(command, cwd=cwd, check=False)
        stdout_text = ""
        stderr_text = ""

    if command_run.returncode != 0:
        if stdout_text:
            write_error(stdout_text)
        if stderr_text:
            write_error(stderr_text)
        raise RuntimeError(f"Command failed: {' '.join(command)}")

    return stdout_text


def pack_package(directory, cwd=None):
    pack_json = run(
        [
            "npm",
            "--cache",
            "/tmp/easel-npm-cache",
            "pack",
            "--ignore-scripts",
            "--pack-destination",
            directory,
            "--json",
        ],
        cwd=cwd,
        capture=True,
    )
    parsed_pack_json = json.loads(pack_json)
    pack_entry = (
        parsed_pack_json[0]
        if isinstance(parsed_pack_json, list) and parsed_pack_json
        else parsed_pack_json
    )

    if (
        isinstance(pack_entry, dict)
        and pack_entry.get("filename")
        and isinstance(pack_entry.get("files"), list)
    ):
        return pack_entry

    return inspect_packed_tarball(directory)


def inspect_packed_tarball(directory):
    tarball_names = sorted(
        name for name in os.listdir(directory) if name.endswith(".tgz")
    )
    if len(tarball_names) != 1:
        raise RuntimeError(
            f"Expected exactly one packed tarball in {directory}, found {len(tarball_names)}"
        )

    filename = tarball_names[0]
    extract_directory = tempfile.mkdtemp(prefix="easel-pack-inspect-")
    try:
        run(
            [
                "tar",
                "-xzf",
                os.path.join(directory, filename),
                "-C",
                extract_directory,
            ]
        )
        package_directory = os.path.join(extract_directory, "package")
        files = []
        unpacked_size = [0]
        collect_packed_files(
            package_directory,
            "",
            files,
            lambda size: unpacked_size.__setitem__(0, unpacked_size[0] + size),
        )

        return {
            "filename": filename,
            "files": [{"path": path} for path in files],
            "entryCount": len(files),
            "unpackedSize": unpacked_size[0],
        }
    finally:
        remove_directory(extract_directory)


def collect_packed_files(directory, prefix, files, on_file_size):
    for entry_name in sorted(os.listdir(directory)):
        entry_path = os.path.join(directory, entry_name)
        relative_path = f"{prefix}/{entry_name}" if prefix else entry_name
        stat_result = os.stat(entry_path)
        if os.path.isdir(entry_path):
            collect_packed_files(entry_path, relative_path, files, on_file_size)
        elif os.path.isfile(entry_path):
            files.append(relative_path)
            on_file_size(stat_result.st_size)


def verify_file_list(pack_entry):
    packed_paths = {file_entry["path"] for file_entry in pack_entry["files"]}
    missing_paths = [
        path for path in REQUIRED_PACKAGE_FILES if path not in packed_paths
    ]

    if missing_paths:
        raise RuntimeError(
            f"Package is missing required files: {', '.join(missing_paths)}"
        )

    stale_declaration_paths = [
        file_entry["path"]
        for file_entry in pack_entry["files"]
        if file_entry["path"].startswith("src/")
        and (
            file_entry["path"].endswith(".d.ts")
            or file_entry["path"].endswith(".d.ts.map")
        )
        and file_entry["path"] != "src/globals.d.ts"
    ]

    if stale_declaration_paths:
        raise RuntimeError(
            "Package includes stale source declarations: "
            + ", ".join(stale_declaration_paths)
        )


def json_stringify(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def smoke_install(pack_entry, pack_directory, package_name, version):
    smoke_directory = tempfile.mkdtemp(prefix="easel-smoke-")
    tarball_path = os.path.join(pack_directory, pack_entry["filename"])
    try:
        run(
            ["npm", "--cache", "/tmp/easel-npm-cache", "init", "-y"],
            cwd=smoke_directory,
        )
        run(
            [
                "npm",
                "--cache",
                "/tmp/easel-npm-cache",
                "install",
                tarball_path,
                "--ignore-scripts",
            ],
            cwd=smoke_directory,
        )
        run(
            [
                "node",
                "--input-type=module",
                "-e",
                f"import * as pkg from {json_stringify(package_name)}; if (pkg.REVISION !== {json_stringify(version)}) throw new Error(`Bad ESM REVISION: ${{pkg.REVISION}}`);",
            ],
            cwd=smoke_directory,
        )
        run(
            [
                "node",
                "-e",
                f"const pkg = require({json_stringify(package_name)}); if (pkg.REVISION !== {json_stringify(version)}) throw new Error(`Bad CJS REVISION: ${{pkg.REVISION}}`);",
            ],
            cwd=smoke_directory,
        )
    finally:
        remove_directory(smoke_directory)


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    del argv
    root = resolve_repo_root(repo_root)
    package_json = read_json(root / "package.json")
    pack_directory = tempfile.mkdtemp(prefix="easel-pack-")
    try:
        pack_entry = pack_package(pack_directory, cwd=root)
        verify_file_list(pack_entry)
        smoke_install(
            pack_entry,
            pack_directory,
            package_json["name"],
            package_json["version"],
        )
        sys.stdout.write(
            f"Package verified: {pack_entry['filename']} "
            f"({pack_entry['entryCount']} files, {pack_entry['unpackedSize']} bytes)\n"
        )
    finally:
        remove_directory(pack_directory)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
