#!/usr/bin/env python3
"""Standard-library tests for parity.py. Run: python3 test_parity.py"""

from __future__ import annotations

import contextlib
import io
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

import parity  # noqa: E402

LEDGER = """\
state,subject,kind,easel,three
=,Node,class,class extends EventDispatcher,class extends EventDispatcher
<,Node.position,field,instance rw Vector3,-
>,Node.dispose,method,-,instance () => void
!,Color.hex,accessor,instance rw number,instance () => number
>,AnimationClip.findByName,method,-,"static (a: Array, n: string) => ?AnimationClip"
<,findByName,function,"(clips: object, name: string) => AnimationClip | undefined",-
=,Timer,class,class,class
>,Timer,class,-,class
"""


def run(*argv: str) -> tuple[int, str]:
    out = io.StringIO()
    err = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = parity.main(list(argv))
    return code, out.getvalue() + err.getvalue()


class ParityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.dir = tempfile.TemporaryDirectory()
        self.ledger = Path(self.dir.name) / "three-core.csv"
        self.ledger.write_text(LEDGER, encoding="utf-8")

    def tearDown(self) -> None:
        self.dir.cleanup()

    def test_rename_and_member_summary(self) -> None:
        code, out = run("--ledger", str(self.ledger), "THREE.Object3D")
        self.assertEqual(code, 0)
        self.assertIn("# THREE.Object3D -> Node", out)
        self.assertIn("# Node members: =0 !0 <1 >1", out)

    def test_getter_folds_into_accessor(self) -> None:
        code, out = run("--ledger", str(self.ledger), "Color.getHex")
        self.assertEqual(code, 0)
        self.assertIn("!\tColor.hex\taccessor", out)

    def test_static_lists_standalone_function(self) -> None:
        code, out = run("--ledger", str(self.ledger),
                        "AnimationClip.findByName")
        self.assertEqual(code, 0)
        self.assertIn("<\tfindByName\tfunction", out)

    def test_duplicate_subject_prints_every_row(self) -> None:
        code, out = run("--ledger", str(self.ledger), "Clock")
        self.assertEqual(code, 0)
        self.assertEqual(out.count("\tTimer\tclass"), 2)

    def test_missing_symbol_exits_1(self) -> None:
        code, out = run("--ledger", str(self.ledger), "WebGLRenderer")
        self.assertEqual(code, 1)
        self.assertIn("NOT FOUND WebGLRenderer", out)

    def test_bad_usage_exits_2(self) -> None:
        self.assertEqual(run()[0], 2)
        self.assertEqual(run("--ledger")[0], 2)

    def test_missing_ledger_exits_2(self) -> None:
        code, out = run("--ledger", str(self.ledger) + ".gone", "Node")
        self.assertEqual(code, 2)
        self.assertIn("cannot read", out)

    def test_malformed_ledger_exits_2(self) -> None:
        self.ledger.write_text(
            "state,subject,kind,easel,three\n?,Node\n", encoding="utf-8"
        )
        code, out = run("--ledger", str(self.ledger), "Node")
        self.assertEqual(code, 2)
        self.assertIn("malformed row", out)

    def test_rename_map_matches_generator(self) -> None:
        repo = Path(__file__).resolve().parents[4]
        compare = repo / "scripts" / "api-comparison" / "compare.ts"
        if not compare.is_file():
            self.skipTest(f"{compare} not present")
        text = compare.read_text(encoding="utf-8")
        block = re.search(
            r"THREE_TO_EASEL_CLASS[^{]*\{(.*?)\};", text, re.S
        )
        self.assertIsNotNone(block)
        assert block is not None
        pairs = dict(re.findall(r"(\w+):\s*\"(\w+)\"", block.group(1)))
        self.assertEqual(pairs, parity.THREE_TO_EASEL_CLASS)


if __name__ == "__main__":
    unittest.main()
