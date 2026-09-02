#!/usr/bin/env python3
"""Import all configured Road to Somewhere products."""
from product_importer import import_product
from product_paths import SOURCES, fail, load_json


def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1:
        fail("Unsupported products/sources.json schemaVersion")
    for entry in registry.get("products", []):
        import_product(entry)


if __name__ == "__main__":
    main()
