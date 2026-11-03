#!/usr/bin/env python3
"""Pre-publish verification of versioned ERos album and HTML assets."""
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
html=(ROOT/'index.html').read_text(encoding='utf8')
for id in ['top','intro','rules','specs','gallery','lessons']:
 if f'id="{id}"' not in html:errors.append(f'頁面缺少區塊 #{id}')
for path in ['data/gallery.js','data/photos.js','data/photos.json','assets/duck.webp','assets/tiger.webp','assets/mascots.webp','assets/duck_head.png','assets/tiger_head.png']:
 if not (ROOT/path).is_file():errors.append(f'缺少檔案 {path}')
items=json.loads((ROOT/'data/photos.json').read_text(encoding='utf8'))['photos']
js=(ROOT/'data/photos.js').read_text(encoding='utf8').strip()
if not js.startswith('window.EROS_PHOTOS = ') or not js.endswith(';'):
 errors.append('相簿 JS 格式有誤')
else:
 jsitems=json.loads(js.removeprefix('window.EROS_PHOTOS = ').removesuffix(';'))
 if jsitems!=items:errors.append('照片 JSON 與 JS 資料不一致')
seen=set()
for item in items:
 id=item.get('id','')
 if id in seen: errors.append(f'重複相片 ID：{id}')
 seen.add(id)
 for name in ('src','thumb'):
  p=item.get(name,'')
  if not isinstance(p,str) or not p.startswith('photos/') or '..' in p or not (ROOT/p).is_file():
   errors.append(f'照片 {id} 缺少或不安全：{name}={p}')
print(f'ERos 網站檢查：{len(items)} 張照片，{len(errors)} 個問題')
for e in errors:print('錯誤：',e)
sys.exit(1 if errors else 0)
