"""Audit three.js examples for CPU Canvas2D parity.

This script compares three.js examples with the EASEL.js renderer contract and
classifies each example as CPU-compatible or GPU-only.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from .. import resolve_repo_root

_EASEL_EXAMPLES_ROOT = "www/examples"
_THREE_EXAMPLES_ROOT = "node_modules/three/examples/jsm"

_GPU_PATTERNS = [
    re.compile(r"\beffects\b", re.ASCII),
    re.compile(r"\bshaders\b", re.ASCII),
    re.compile(r"\btsl\b", re.ASCII),
    re.compile(r"\bcsm\b", re.ASCII),
    re.compile(r"\bbloom\b", re.ASCII),
    re.compile(r"\bpostprocessing\b", re.ASCII),
    re.compile(r"\bxr\b", re.ASCII),
    re.compile(r"\bwebxr\b", re.ASCII),
    re.compile(r"\bgpgpu\b", re.ASCII),
    re.compile(r"\bwebgpu\b", re.ASCII),
]

_GPU_REASONS = [
    "GPU shader programs",
    "Post-processing pipelines",
    "WebXR devices and sessions",
    "GPGPU compute shaders",
    "WebGPU rendering",
]

_CPU_CATEGORIES = [
    "animation",
    "controls",
    "geometries",
    "materials",
    "scene",
    "texture",
    "lighting",
    "lights",
    "lines",
    "loaders",
    "math",
    "misc",
    "modififiers",
    "physics",
    "audio",
    "css",
    "svg",
    "games",
    "exporters",
]


def is_gpu_only(file_path: str | Path) -> bool:
    """Check whether a path matches a GPU-only pattern."""
    lower_path = str(file_path).lower()
    return (
        any(pattern.search(lower_path) for pattern in _GPU_PATTERNS)
        or "halftone" in lower_path
        or "drawing" in lower_path
        or "fbos" in lower_path
    )


def classify_gpu(file_path: str | Path) -> str:
    """Return the classification reason for a GPU-only path."""
    lower_path = str(file_path).lower()
    for index, pattern in enumerate(_GPU_PATTERNS):
        if pattern.search(lower_path):
            return _GPU_REASONS[index] if index < len(_GPU_REASONS) else "GPU feature"
    return "Unknown GPU feature"


def walk_and_classify(root_path: str | Path, label: str) -> list[dict[str, object]]:
    """Walk a directory and classify its JavaScript files."""
    root = Path(root_path)
    if not root.exists():
        print(f"❌ Directory not found: {root}", file=sys.stderr)
        return []

    def walk(directory: Path, relative_directory: Path) -> list[dict[str, object]]:
        results: list[dict[str, object]] = []
        with os.scandir(directory) as entries:
            for entry in sorted(entries, key=lambda item: item.name):
                file_path = directory / entry.name
                relative_path = relative_directory / entry.name
                if entry.is_dir(follow_symlinks=False):
                    results.extend(walk(file_path, relative_path))
                elif entry.name.endswith(".js"):
                    relative_file_path = relative_path.as_posix()
                    gpu_only = is_gpu_only(relative_file_path)
                    results.append(
                        {
                            "category": label,
                            "path": relative_file_path,
                            "gpuOnly": gpu_only,
                            "reason": (
                                classify_gpu(relative_file_path) if gpu_only else ""
                            ),
                            "basename": entry.name,
                        }
                    )
        return results

    return walk(root, Path())


def _extract_meta_id(content: str) -> str | None:
    match = re.search(r"""id:\s*["']([^"']+)["']""", content)
    return match.group(1) if match else None


def _read_file_content(file_path: str | Path) -> str:
    try:
        path = Path(file_path)
        return path.read_text(encoding="utf-8") if path.exists() else ""
    except (OSError, UnicodeError):
        return ""


def audit(
    three_js_results: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    """Print the audit report and return its CPU/GPU result groups."""
    print("=== Three.js Example Parity Audit ===\n")

    gpu_examples = [result for result in three_js_results if result["gpuOnly"]]
    cpu_examples = [result for result in three_js_results if not result["gpuOnly"]]
    unknown_gpu = [result for result in gpu_examples if not result["reason"]]

    print("📊 Summary:")
    print(f"   • GPU-only examples: {len(gpu_examples)}")
    print(f"   • CPU-compatible examples: {len(cpu_examples)}")
    print(f"   • GPU only without reason: {len(unknown_gpu)}\n")

    if cpu_examples:
        print("🟢 CPU-Compatible Examples (Top 20):")
        for index, example in enumerate(cpu_examples[:20], start=1):
            print(
                f"   {index}. {example['category']}/{example['basename']}: "
                f"ID={example['path']}"
            )

    if gpu_examples:
        print("\n🚫 GPU-Only Examples (Top 20):")
        for index, example in enumerate(gpu_examples[:20], start=1):
            reason = example["reason"] or "Unknown"
            print(f"   {index}. {example['category']}/{example['basename']}: {reason}")

    return {"cpuExamples": cpu_examples, "gpuExamples": gpu_examples}


def main(
    argv: list[str] | None = None,
    repo_root: str | Path | None = None,
) -> int:
    """Run the three.js example parity audit."""
    del argv
    root = resolve_repo_root(repo_root)
    examples_root = root / _THREE_EXAMPLES_ROOT
    audit(walk_and_classify(examples_root, "threejs"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
