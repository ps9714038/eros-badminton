#!/usr/bin/env python3
"""Safely append new, EXIF-stripped images to the ERos permanent album.

Run from anywhere: python scripts/add_photos.py 'path/to/photos' --album '球團合照'
Never deletes historical photos; deduplicates by SHA-256 of source bytes.
"""
from __future__ import annotations
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys

try:
    from PIL import Image, ImageOps, UnidentifiedImageError
except ImportError:
    raise SystemExit("需要 Pillow。先執行：python -m pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'data' / 'photos.json'
JS_PATH = ROOT / 'data' / 'photos.js'
PHOTOS = ROOT / 'photos'
THUMBS = PHOTOS / 'thumbs'
TYPES = {'.jpg','.jpeg','.png','.webp','.bmp','.tif','.tiff','.heic'}


def gather(paths: list[str]) -> list[Path]:
    found = []
    for item in paths:
        path = Path(item).expanduser()
        if path.is_dir():
            found += [p for p in sorted(path.rglob('*')) if p.is_file() and p.suffix.lower() in TYPES]
        elif path.is_file() and path.suffix.lower() in TYPES:
            found.append(path)
        else:
            print('跳過無法處理的來源：', path)
    return list(dict.fromkeys(found))


def save_manifest(items: list[dict]):
    obj={'schema':1,'photos':items}
    new_json=json.dumps(obj, ensure_ascii=False, indent=2)+'\n'
    new_js='window.EROS_PHOTOS = '+json.dumps(items, ensure_ascii=False, indent=2)+';\n'
    # prepare both files before replacement
    jtmp=DATA_PATH.with_suffix('.json.tmp')
    stmp=JS_PATH.with_suffix('.js.tmp')
    jtmp.write_text(new_json,encoding='utf-8')
    stmp.write_text(new_js,encoding='utf-8')
    jtmp.replace(DATA_PATH)
    stmp.replace(JS_PATH)


def main():
    ap=argparse.ArgumentParser(description='將團體照累積加入 ERos 網站，不會刪除舊照片。')
    ap.add_argument('paths',nargs='+',help='照片檔或資料夾，可多個')
    ap.add_argument('--album', default='球場日常', help='分類，例如 球團合照、球場日常')
    ap.add_argument('--title',default=None, help='照片標題；多張時自動加上序號')
    ap.add_argument('--date',default='',help='拍攝日期 YYYY-MM-DD（可留空）')
    ap.add_argument('--note',default='',help='簡短備註')
    args=ap.parse_args()
    if args.date:
        try:date.fromisoformat(args.date)
        except ValueError: ap.error('--date 必須為 YYYY-MM-DD')
    sources=gather(args.paths)
    if not sources:raise SystemExit('找不到可匯入的照片')
    data=json.loads(DATA_PATH.read_text(encoding='utf-8'))
    items=data.get('photos',[])
    if not isinstance(items,list): raise SystemExit('photos.json 格式錯誤')
    known={p.get('sha256') for p in items}
    ids={p.get('id') for p in items}
    PHOTOS.mkdir(exist_ok=True)
    THUMBS.mkdir(exist_ok=True)
    added=skipped=0
    for src in sources:
        checksum=hashlib.sha256(src.read_bytes()).hexdigest()
        if checksum in known:
            print('已有照片，不重複新增：',src.name)
            skipped+=1;continue
        digest=checksum[:16]
        if digest in ids:raise SystemExit(f'照片 ID 碰撞：{src.name}')
        out=PHOTOS / (digest+'.webp')
        thumb=THUMBS / (digest+'.webp')
        try:
            with Image.open(src) as source:
                im=ImageOps.exif_transpose(source)
                if im.mode in ('RGBA','LA'):
                    background=Image.new('RGB',im.size,'white')
                    if im.mode=='RGBA':background.paste(im, mask=im.getchannel('A'))
                    else: background.paste(im.convert('RGBA'), mask=im.getchannel('A'))
                    im=background
                else:im=im.convert('RGB')
                large=im.copy();large.thumbnail((2000,2000),Image.Resampling.LANCZOS)
                large.save(out,'WEBP',quality=86,method=6)  # no original metadata copied
                preview=im.copy();preview.thumbnail((680,680),Image.Resampling.LANCZOS)
                preview.save(thumb,'WEBP',quality=80,method=6)
        except (OSError,UnidentifiedImageError,ValueError) as exc:
            out.unlink(missing_ok=True);thumb.unlink(missing_ok=True)
            print('略過無法解碼的照片：',src.name,exc)
            skipped+=1;continue
        title=(args.title + (f'（{added+1}）' if len(sources)>1 else '')) if args.title else src.stem
        items.append({'id':digest,'sha256':checksum,'src':f'photos/{digest}.webp','thumb':f'photos/thumbs/{digest}.webp','title':title,'date':args.date,'album':args.album,'note':args.note,'alt':f'ERos 羽球團・{title}'})
        known.add(checksum);ids.add(digest)
        print('已新增：',title)
        added+=1
    if added:save_manifest(items)
    print(f'完成：新增 {added} 張，略過 {skipped} 張，相簿共 {len(items)} 張。')

if __name__=='__main__': main()
