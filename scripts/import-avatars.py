#!/usr/bin/env python3
"""Import live agent portraits into the docs site.

Usage: python3 scripts/import-avatars.py <agents-dir>

<agents-dir> holds one folder per agent (<slug>/avatar.jpg + <slug>/identity.json).
For each agent this writes two re-encoded copies to docs/public/avatars/
(<slug>-240.jpg and <slug>-720.jpg) with every metadata segment stripped
(EXIF, XMP, ICC, comments, C2PA/JUMBF), and records only the fields the
site needs to pair a portrait with its ledger row in
docs/.vitepress/data/avatars.json. Nothing else from identity.json is kept.

Needs Pillow (pip install pillow).
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / 'docs' / 'public' / 'avatars'
OUT_MANIFEST = ROOT / 'docs' / '.vitepress' / 'data' / 'avatars.json'
SIZES = (240, 720)


def gender_key(text):
    t = text.lower()
    if 'nonbinary' in t or 'androgynous' in t:
        return 'nb'
    if t.startswith(('fem', 'woman')):
        return 'fem'
    if t.startswith(('masc', 'man')):
        return 'masc'
    raise ValueError(f'unrecognised gender presentation: {text!r}')


def age_key(text):
    band = text.strip().split(' ')[0]
    if band not in ('20s', '30s', '40s', '50s', '60s+'):
        raise ValueError(f'unrecognised age band: {text!r}')
    return band


def main(src):
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    manifest = []
    for folder in sorted(p for p in Path(src).iterdir() if (p / 'avatar.jpg').exists()):
        slug = folder.name
        identity = json.loads((folder / 'identity.json').read_text())
        with Image.open(folder / 'avatar.jpg') as im:
            im = im.convert('RGB')
            for size in SIZES:
                # A fresh image carries no info dict, so nothing but JFIF is written.
                out = Image.new('RGB', (size, size))
                out.paste(im.resize((size, size), Image.LANCZOS))
                out.save(OUT_IMG / f'{slug}-{size}.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
        manifest.append({
            'slug': slug,
            'name': identity['name'],
            'gender': gender_key(identity['gender']),
            'age': age_key(identity['age_band']),
        })
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f'{len(manifest)} portraits -> {OUT_IMG.relative_to(ROOT)}, manifest -> {OUT_MANIFEST.relative_to(ROOT)}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
