# Extension asset publishing

This repository publishes private Streamer.bot extensions into the public Road to Somewhere site.

## Two kinds of assets

There are two deliberately different asset locations. The distinction is subtle, so follow the path rules exactly.

### Shared Road to Somewhere assets

Assets that are used by multiple extensions live in the public repository under:

```text
road-to-somewhere/
└── assets/
    └── images/
```

Reference shared assets with an **absolute site path**, including the leading `/`:

```json
"src": "/assets/images/sb-import-code-screenshot.png"
```

These paths are left unchanged by the importer. They resolve from the shared Road to Somewhere site.

### Extension-specific assets

Assets that belong only to one extension live in that extension's private repository:

```text
RTS-Some-Extension/
└── assets/
    ├── images/
    ├── videos/
    ├── audio/
    └── ...
```

Reference them with a **relative path**, without the leading `/`:

```json
"src": "assets/images/extension-specific-image.png"
```

The extension manifest should publish the directory:

```json
"publish": {
  "overlay": "overlay",
  "importFile": "RTS Some New Widget - Import Code.txt",
  "assets": "assets"
}
```

The importer copies the extension's `assets/` directory into the public extension directory and rewrites relative asset references to:

```text
/extensions/<extension-slug>/assets/...
```

For example:

```text
Private repo:
assets/images/ban-settings.png

Published site:
/extensions/rts-ban-timeout-widget/assets/images/ban-settings.png
```

## Why the leading `/` matters

These two paths look very similar but mean different things:

```text
/assets/images/shared.png
assets/images/extension.png
```

- `/assets/...` = shared Road to Somewhere asset; **do not publish it with the extension**.
- `assets/...` = extension-owned asset; **publish it with the extension**.

Do not use `assets/...` for a shared site asset, and do not use `/assets/...` for an extension-owned asset.

## Keep `publish.assets` in extension templates

The standard extension template should include:

```json
"publish": {
  "overlay": "overlay",
  "importFile": "RTS Some New Widget - Import Code.txt",
  "assets": "assets"
}
```

Even if an extension does not initially contain extension-specific assets, keeping this entry in the template establishes the expected structure for future images, videos, audio, and other extension-owned files. A finished extension may omit it only when its repository genuinely has no `assets/` directory and the publishing workflow is configured accordingly.
