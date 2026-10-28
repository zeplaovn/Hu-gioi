#!/usr/bin/env python3
"""Cắt các bảng sprite vật phẩm (media/assets/item/*.png, ô 128×128) thành ảnh riêng theo mã vật phẩm,
đúng đường dẫn trong media/assets/vat_pham.xlsx, và sinh client/assets/item-index.js (mã -> đường dẫn).
Thứ tự ô = thứ tự mã trong từng nhóm của vat_pham.xlsx. Chạy: python3 tools/cut-item-atlases.py"""
import os, json, sys
import openpyxl
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
A = os.path.join(ROOT, 'media/assets')
SHEETS = {  # sheet -> các thư mục ảnh nó chứa (theo thứ tự trong xlsx)
  'herb.png': ['item/linh_thao'], 'seed.png': ['item/hat_giong'], 'material.png': ['item/khoang_san'],
  'talisman.png': ['item/phu_luc'], 'gift.png': ['item/qua_tang'],
  'cong_phap.png': ['item/cong_phap'], 'phap_bao.png': ['item/phap_bao'],
  'single_pill.png': ['item/dan_duoc/single'], 'pack_pill.png': ['item/dan_duoc/pack'],
}
ws = openpyxl.load_workbook(os.path.join(A, 'vat_pham.xlsx'), read_only=True)['Vật phẩm']
rows = [r for r in ws.iter_rows(values_only=True) if r[0] and r[3] and str(r[3]).startswith('item/')]
index = {r[0]: r[3] for r in rows}
made = 0
for sheet, prefixes in SHEETS.items():
    codes = [r for r in rows if any(r[3].startswith(p) for p in prefixes)]
    im = Image.open(os.path.join(A, 'item', sheet)).convert('RGBA')
    cols = im.width // 128
    for k, r in enumerate(codes):
        x, y = (k % cols) * 128, (k // cols) * 128
        out = os.path.join(A, r[3]); os.makedirs(os.path.dirname(out), exist_ok=True)
        im.crop((x, y, x + 128, y + 128)).save(out, optimize=True); made += 1
missing = [c for c, p in index.items() if not os.path.exists(os.path.join(A, p))]
if missing: sys.exit('Thiếu ảnh: ' + ', '.join(missing[:10]))
with open(os.path.join(ROOT, 'client/assets/item-index.js'), 'w', encoding='utf-8') as f:
    f.write('(function(root){root.HU_ITEM_INDEX=' + json.dumps(index, ensure_ascii=False, separators=(',', ':')) + ';if(typeof module!=="undefined")module.exports=root.HU_ITEM_INDEX;})(typeof window!=="undefined"?window:globalThis);\n')
print('cắt', made, 'ảnh; chỉ mục', len(index), 'mã')
