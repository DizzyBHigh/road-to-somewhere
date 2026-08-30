#!/usr/bin/env python3
"""Basic validation tests for the RTS private-extension importer."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("importer", ROOT / "tools" / "import-private-extensions.py")
module = module_from_spec(spec)
spec.loader.exec_module(module)


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    missing = root / "missing"
    assert not missing.exists()

    empty = root / "empty"
    empty.mkdir()
    assert list(empty.iterdir()) == []

    populated = root / "assets"
    (populated / "images").mkdir(parents=True)
    (populated / "images" / "test.png").write_bytes(b"test")

    assert module.copy_tree(missing, root / "out-missing") is False
    assert module.copy_tree(empty, root / "out-empty") is True
    assert module.copy_tree(populated, root / "out-assets") is True
    assert (root / "out-assets" / "images" / "test.png").is_file()

print("Importer asset handling tests passed.")
