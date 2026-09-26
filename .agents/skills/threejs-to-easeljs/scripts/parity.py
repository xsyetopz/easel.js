#!/usr/bin/env python3
"""Print the three.js/EASEL parity rows for one or more symbols.

Usage: parity.py [--ledger PATH] SYMBOL...

SYMBOL is a three.js or EASEL name: `Object3D`, `THREE.Color.getHex`,
`AnimationClip.findByName`, `Node.position`. The lookup:

- strips a leading `THREE.` or `EASEL.`;
- renames three.js classes the way the ledger generator does
  (`Object3D` -> `Node`, `Clock` -> `Timer`, ...);
- folds `getX`/`setX` into the accessor subject `x` when that row exists;
- for a class, prints the class row and a count of member rows per state;
- for a three-only static, also prints EASEL top-level functions or
  constants with the same member name (statics become standalone exports).

The ledger defaults to `api-comparison/three-core.txt` in the nearest
directory above the current one, then above this script. Row states:
`=` both, `<` EASEL-only, `>` three-only, `!` shape differs.

Exit status: 0 every symbol found, 1 a symbol has no ledger row, 2 bad
usage or a missing or malformed ledger.
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

LEDGER = Path("api-comparison") / "three-core.txt"

# Copy of THREE_TO_EASEL_CLASS in scripts/api-comparison/compare.ts;
# test_parity.py fails when the two drift.
THREE_TO_EASEL_CLASS = {
    "AnimationMixer": "Animator",
    "AnimationObjectGroup": "AnimationGroup",
    "AudioAnalyser": "AudioAnalyzer",
    "BooleanKeyframeTrack": "BooleanTrack",
    "BufferAttribute": "Attribute",
    "BufferGeometry": "Geometry",
    "Clock": "Timer",
    "ColorKeyframeTrack": "ColorTrack",
    "InterleavedBuffer": "InterleavedData",
    "InterleavedBufferAttribute": "InterleavedAttribute",
    "KeyframeTrack": "Track",
    "LineBasicMaterial": "LineMaterial",
    "LineDashedMaterial": "DashedLineMaterial",
    "MeshBasicMaterial": "BasicMaterial",
    "MeshLambertMaterial": "LambertMaterial",
    "MeshToonMaterial": "ToonMaterial",
    "NumberKeyframeTrack": "NumberTrack",
    "Object3D": "Node",
    "PropertyBinding": "Binding",
    "QuaternionKeyframeTrack": "QuaternionTrack",
    "StringKeyframeTrack": "StringTrack",
    "VectorKeyframeTrack": "VectorTrack",
}

ACCESSOR = re.compile(r"^(get|set)([A-Z]\w*)$")


class LedgerError(Exception):
    """The ledger is missing or malformed."""


def find_ledger(start: Path) -> Path | None:
    for base in [start, *start.parents]:
        candidate = base / LEDGER
        if candidate.is_file():
            return candidate
    return None


def load(path: Path) -> tuple[list[str], dict[str, list[list[str]]]]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        raise LedgerError(f"cannot read {path}: {error}") from error
    header: list[str] = []
    rows: dict[str, list[list[str]]] = {}
    for number, line in enumerate(text.splitlines(), 1):
        if not line:
            continue
        if line.startswith("#"):
            header.append(line)
            continue
        cells = line.split("\t")
        if len(cells) != 5 or cells[0] not in "=<>!":
            raise LedgerError(f"{path}:{number}: malformed row")
        rows.setdefault(cells[1], []).append(cells)
    if not rows:
        raise LedgerError(f"{path}: no rows")
    return header, rows


def normalize(symbol: str) -> str:
    for prefix in ("THREE.", "EASEL."):
        if symbol.startswith(prefix):
            symbol = symbol[len(prefix):]
    head, dot, member = symbol.partition(".")
    return THREE_TO_EASEL_CLASS.get(head, head) + dot + member


def subjects(symbol: str, rows: dict[str, list[list[str]]]) -> list[str]:
    name = normalize(symbol)
    found = [name] if name in rows else []
    head, _, member = name.partition(".")
    match = ACCESSOR.match(member)
    if match:
        accessor = f"{head}.{match.group(2)[0].lower()}{match.group(2)[1:]}"
        if accessor in rows and accessor not in found:
            found.append(accessor)
    if member:
        statics = [r for r in rows.get(name, []) if r[4].startswith("static")]
        if statics and member in rows and member not in found:
            found.append(member)
    return found


def lookup(symbol: str, rows: dict[str, list[list[str]]]) -> list[str]:
    out: list[str] = []
    name = normalize(symbol)
    if name != symbol:
        out.append(f"# {symbol} -> {name}")
    for subject in subjects(symbol, rows):
        out.extend("\t".join(r) for r in rows[subject])
        if "." not in subject and subject == name:
            states = Counter(
                r[0]
                for key, value in rows.items()
                if key.startswith(subject + ".")
                for r in value
            )
            if states:
                summary = " ".join(f"{s}{states[s]}" for s in "=!<>")
                out.append(f"# {subject} members: {summary}")
    return out


def main(argv: list[str]) -> int:
    args = list(argv)
    ledger: Path | None = None
    if args[:1] == ["--ledger"]:
        if len(args) < 2:
            print(__doc__, file=sys.stderr)
            return 2
        ledger = Path(args[1])
        args = args[2:]
    if not args or any(a.startswith("-") for a in args):
        print(__doc__, file=sys.stderr)
        return 2
    if ledger is None:
        ledger = find_ledger(Path.cwd()) or find_ledger(
            Path(__file__).resolve().parent
        )
    if ledger is None:
        print(f"error: {LEDGER} not found; pass --ledger", file=sys.stderr)
        return 2
    try:
        header, rows = load(ledger)
    except LedgerError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    print(header[0] if header else f"# {ledger}")
    missing = False
    for symbol in args:
        lines = lookup(symbol, rows)
        if not any(not line.startswith("#") for line in lines):
            print(f"NOT FOUND {symbol} (as {normalize(symbol)})")
            missing = True
            continue
        print("\n".join(lines))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
