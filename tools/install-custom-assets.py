#!/usr/bin/env python3
"""Install and verify the 15 prepared Hư Giới WebP assets in a local checkout.

Usage: python3 tools/install-custom-assets.py /path/hugioi-custom-assets-2026-11.zip
The ready-made ZIP includes asset-manifest.json and a media/assets/custom/2026-11 tree.
No third-party Python dependencies required.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from zipfile import ZipFile

BASE = 'media/assets/custom/2026-11/'
FILES = frozenset(BASE + x for x in (
    'workshops/dan-cac.webp', 'workshops/lo-ren.webp', 'workshops/lo-dan.webp',
    'meridians/nam-xanh.webp', 'meridians/nam-vang.webp',
    'meridians/nu-xanh.webp', 'meridians/nu-vang.webp',
    'animations/nam/ren-vu-khi.webp', 'animations/nam/ren-vu-khi-still.webp',
    'animations/nam/luyen-dan.webp', 'animations/nam/luyen-dan-still.webp',
    'animations/nu/ren-vu-khi.webp', 'animations/nu/ren-vu-khi-still.webp',
    'animations/nu/luyen-dan.webp', 'animations/nu/luyen-dan-still.webp',
))


def install(package: Path, repo: Path) -> int:
    media_config = repo / 'client/assets/custom-media.js'
    if not media_config.is_file():
        raise ValueError(f'Not a Hư Giới checkout: {media_config} missing')
    with ZipFile(package) as archive:
        manifest = json.loads(archive.read('asset-manifest.json').decode('utf-8'))
        if set(manifest) != FILES:
            raise ValueError('Asset manifest must list exactly the 15 required WebP files')
        extracted = {}
        for relative, meta in sorted(manifest.items()):
            data = archive.read(relative)
            if len(data) != meta['bytes'] or hashlib.sha256(data).hexdigest() != meta['sha256']:
                raise ValueError(f'Invalid asset checksum: {relative}')
            if not (data[:4] == b'RIFF' and data[8:12] == b'WEBP'):
                raise ValueError(f'Not a WebP asset: {relative}')
            extracted[relative] = data

    # Disable feature before writing files: never advertise an incomplete installation.
    config = media_config.read_text(encoding='utf-8')
    if not re.search(r'installed:\s*(true|false)\s*,', config):
        raise ValueError('Could not find installed flag in client/assets/custom-media.js')
    disabled = re.sub(r'installed:\s*(true|false)\s*,', 'installed: false,', config, count=1)
    media_config.write_text(disabled, encoding='utf-8')
    for relative, data in extracted.items():
        dst = repo / relative
        dst.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=dst.parent, delete=False) as f:
            temp = Path(f.name)
            f.write(data)
        os.replace(temp, dst)
    enabled = disabled.replace('installed: false,', 'installed: true,', 1)
    media_config.write_text(enabled, encoding='utf-8')
    return len(extracted)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 tools/install-custom-assets.py hugioi-custom-assets-2026-11.zip')
    try:
        count = install(Path(sys.argv[1]).resolve(), Path(__file__).resolve().parent.parent)
    except (ValueError, KeyError, FileNotFoundError, OSError) as e:
        raise SystemExit(f'Asset installation failed: {e}') from e
    print(f'Installed {count} verified WebP assets and enabled HU_CUSTOM_MEDIA.')
