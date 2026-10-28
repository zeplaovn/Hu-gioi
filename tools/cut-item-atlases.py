#!/usr/bin/env python3
"""Sinh client/assets/item-index.js: mã vật phẩm -> vị trí trong bảng sprite (media/assets/item/*.png, ô 128×128).
Thứ tự ô = thứ tự mã trong từng bảng, đọc từ trái sang phải, từ trên xuống (ô 1 của herb.png = HERB-001).
Game cắt ảnh bằng CSS (background-position) từ chính bảng sprite, không tạo ảnh riêng.
Mã không nằm trong bảng (mực, phân bón, tinh hoa, vật phẩm nhiệm vụ) giữ đường dẫn ảnh riêng.
Giá trị: "bảng.png#chỉ-số-ô" hoặc đường dẫn ảnh riêng. Chạy: python3 tools/cut-item-atlases.py"""
import os, json, sys
import openpyxl
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
A = os.path.join(ROOT, 'media/assets')
SHEETS = {
  'herb.png': 'item/linh_thao', 'seed.png': 'item/hat_giong', 'material.png': 'item/khoang_san',
  'talisman.png': 'item/phu_luc', 'gift.png': 'item/qua_tang', 'cong_phap.png': 'item/cong_phap',
  'phap_bao.png': 'item/phap_bao', 'single_pill.png': 'item/dan_duoc/single', 'pack_pill.png': 'item/dan_duoc/pack',
}
ws = openpyxl.load_workbook(os.path.join(A, 'vat_pham.xlsx'), read_only=True)['Vật phẩm']
rows = [r for r in ws.iter_rows(values_only=True) if r[0] and r[3] and str(r[3]).startswith('item/')]
index = {r[0]: r[3] for r in rows}
dims = {}
for sheet, prefix in SHEETS.items():
    codes = sorted(r[0] for r in rows if r[3].startswith(prefix))
    im = Image.open(os.path.join(A, 'item', sheet)); cols, rws = im.width // 128, im.height // 128
    if len(codes) > cols * rws: sys.exit('Bảng %s thiếu ô: %d mã, %d ô' % (sheet, len(codes), cols * rws))
    dims[sheet] = [cols, rws]
    for k, c in enumerate(codes): index[c] = '%s#%d' % (sheet, k)
for c, p in index.items():
    if '#' not in p and not os.path.exists(os.path.join(A, p)): sys.exit('Thiếu ảnh: ' + c)
out = {'sheets': dims, 'items': index}
with open(os.path.join(ROOT, 'client/assets/item-index.js'), 'w', encoding='utf-8') as f:
    f.write('(function(root){root.HU_ITEM_INDEX=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';if(typeof module!=="undefined")module.exports=root.HU_ITEM_INDEX;})(typeof window!=="undefined"?window:globalThis);\n')
print('chỉ mục', len(index), 'mã;', sum('#' in v for v in index.values()), 'mã dùng bảng sprite')
