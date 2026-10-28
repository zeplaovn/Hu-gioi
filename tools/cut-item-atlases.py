#!/usr/bin/env python3
"""Đồng bộ bảng tra cứu vật phẩm với atlas 128×128, đánh số ô từ 1.

Nguồn tên: media/assets/bang_tra_cuu.json. Nhóm ảnh: sheet Vật phẩm trong
vat_pham.xlsx (đọc được cả đường dẫn ảnh rời cũ lẫn đường dẫn atlas).
Thứ tự: mã tăng dần trong từng atlas, trái → phải, trên → dưới.
Chạy: python3 tools/cut-item-atlases.py (cần Pillow và openpyxl).
"""
import json
from copy import copy
from html import escape
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'media/assets'
CELL = 128
SHEETS = {
    'herb.png': 'item/linh_thao',
    'seed.png': 'item/hat_giong',
    'material.png': 'item/khoang_san',
    'talisman.png': 'item/phu_luc',
    'gift.png': 'item/qua_tang',
    'cong_phap.png': 'item/cong_phap',
    'phap_bao.png': 'item/phap_bao',
    'single_pill.png': 'item/dan_duoc/single',
    'pack_pill.png': 'item/dan_duoc/pack',
}
ITEM_PREFIXES = ('HERB-', 'SEED-HERB-', 'MAT-', 'TAL-', 'GFT-', 'BT-',
                 'EQ-', 'PILL-', 'CAT-', 'FERT-', 'INK-', 'QITEM-')


def build_lookup(workbook, names):
    rows = {}
    for row in workbook['Vật phẩm'].iter_rows(min_row=7, values_only=True):
        code, old_name, group, path = row[:4]
        if not code:
            continue
        if code in rows:
            raise ValueError('Trùng mã: ' + code)
        if code not in names or not isinstance(path, str) or not path.startswith('item/'):
            raise ValueError('Mã hoặc đường dẫn không hợp lệ: ' + str(code))
        rows[code] = (old_name, group, path)
    expected = {code for code in names if code.startswith(ITEM_PREFIXES)}
    if set(rows) != expected:
        raise ValueError('Lệch mã giữa JSON và Excel: ' + str(sorted(set(rows) ^ expected)))
    for code in expected:
        if code.startswith('SEED-HERB-') and names[code] != 'Hạt ' + names[code[5:]]:
            raise ValueError('Tên hạt giống lệch linh thảo: ' + code)

    sheets, items = {}, {}
    for sheet, prefix in SHEETS.items():
        path = 'item/' + sheet
        codes = sorted(code for code, row in rows.items()
                       if row[2] == path or row[2].startswith(prefix + '/'))
        with Image.open(ASSETS / path) as image:
            if image.width % CELL or image.height % CELL:
                raise ValueError('Kích thước atlas không chia hết cho 128: ' + sheet)
            cols, height = image.width // CELL, image.height // CELL
            alpha = image.convert('RGBA').getchannel('A')
            occupied = [k for k in range(cols * height) if alpha.crop((
                k % cols * CELL, k // cols * CELL,
                (k % cols + 1) * CELL, (k // cols + 1) * CELL)).getbbox()]
        if not codes or occupied != list(range(len(codes))):
            raise ValueError(f'{sheet}: {len(codes)} mã không khớp {len(occupied)} ô có ảnh')
        sheets[sheet] = {'columns': cols, 'rows': height, 'count': len(codes)}
        for slot, code in enumerate(codes, 1):
            items[code] = {'name': names[code], 'group': rows[code][1], 'image': path,
                           'slot': slot, 'row': (slot - 1) // cols + 1,
                           'column': (slot - 1) % cols + 1}
    for code, (_, group, path) in sorted(rows.items()):
        if code not in items:
            if not (ASSETS / path).is_file() or Path(path).stem != code:
                raise ValueError('Thiếu ảnh riêng hoặc atlas chưa khai báo: ' + code)
            items[code] = {'name': names[code], 'group': group, 'image': path,
                           'slot': None, 'row': None, 'column': None}
    return {'cellSize': CELL, 'indexBase': 1, 'order': 'row-major',
            'sheets': sheets, 'items': items}


def sync_workbook(workbook, lookup):
    items, sheets = lookup['items'], lookup['sheets']
    ws = workbook['Vật phẩm']
    atlas_count = sum(item['slot'] is not None for item in items.values())
    ws['D2'] = f'{len(items)} mục'
    ws['A3'] = 'Tên theo hình: bang_tra_cuu.json. Atlas: trái → phải, trên → dưới; ô, hàng, cột bắt đầu từ 1.'
    ws['A4'] = f'{atlas_count} mã trong {len(sheets)} atlas; {len(items) - atlas_count} ảnh riêng. Đường dẫn tính từ assets/; X/Y tính bằng pixel từ 0.'
    ws.merge_cells('A2:C2')
    ws.merge_cells('A3:J3')
    ws.merge_cells('A4:J4')
    headers = ['Mã', 'Tên vật phẩm theo hình', 'Nhóm', 'Đường dẫn ảnh',
               'Ô atlas (từ 1)', 'Hàng (từ 1)', 'Cột (từ 1)', 'X (px)', 'Y (px)', 'Tên trước đồng bộ']
    for col, title in enumerate(headers, 1):
        cell = ws.cell(6, col, title)
        cell._style = copy(ws['A6']._style)
    for row in range(7, ws.max_row + 1):
        code = ws.cell(row, 1).value
        if code not in items:
            continue
        item = items[code]
        old_name = ws.cell(row, 2).value
        if old_name != item['name'] and not ws.cell(row, 10).value:
            ws.cell(row, 10, old_name)
        values = [item['name'], item['group'], item['image'], item['slot'],
                  item['row'], item['column'],
                  (item['column'] - 1) * CELL if item['slot'] else None,
                  (item['row'] - 1) * CELL if item['slot'] else None]
        for col, value in enumerate(values, 2):
            cell = ws.cell(row, col)
            cell.value = value
            cell.alignment = Alignment(vertical='center', wrap_text=True)
    for col, width in {'A': 22, 'B': 48, 'C': 26, 'D': 45, 'E': 18,
                       'F': 16, 'G': 16, 'H': 12, 'I': 12, 'J': 48}.items():
        ws.column_dimensions[col].width = width
    ws.freeze_panes = 'D7'
    ws.auto_filter.ref = f'A6:J{ws.max_row}'
    ws.print_area = f'A1:J{ws.max_row}'

    # Cập nhật đường dẫn hiện tại trong nhật ký; cột ảnh nguồn vẫn là lịch sử nhập ảnh.
    if 'Ảnh mới cập nhật' in workbook.sheetnames:
        history = workbook['Ảnh mới cập nhật']
        history['A3'] = 'Ảnh nguồn: new/. Ảnh hiện tại tính từ assets/; số ô atlas bắt đầu từ 1.'
        history.merge_cells('A3:F3')
        history['E5'] = 'Đường dẫn ảnh hiện tại'
        history['F5'] = 'Vị trí hiện tại'
        for row in range(6, history.max_row + 1):
            item = items.get(history.cell(row, 1).value)
            if item:
                history.cell(row, 2, item['name'])
                history.cell(row, 5, item['image'])
                history.cell(row, 6, f"Ô {item['slot']} · hàng {item['row']}, cột {item['column']}"
                             if item['slot'] else 'Ảnh riêng')

    summary = workbook['Atlas'] if 'Atlas' in workbook.sheetnames else workbook.create_sheet('Atlas')
    summary.delete_rows(1, summary.max_row)
    summary.append(['Atlas', 'Nhóm', 'Số cột', 'Số hàng', 'Số item', 'Ô đầu', 'Ô cuối', 'Ô trống cuối'])
    for sheet, info in sheets.items():
        group = next(item['group'] for item in items.values() if item['image'] == 'item/' + sheet)
        summary.append(['item/' + sheet, group, info['columns'], info['rows'], info['count'],
                        1, info['count'], info['columns'] * info['rows'] - info['count']])
    for cell in summary[1]:
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='243447')
    for col in 'AB':
        summary.column_dimensions[col].width = 32
    for col in 'CDEFGH':
        summary.column_dimensions[col].width = 18
    summary.freeze_panes = 'A2'
    summary.auto_filter.ref = f'A1:H{summary.max_row}'


def write_indexes(lookup):
    # Một dòng mỗi item để dễ tra cứu và xem diff.
    head = {key: value for key, value in lookup.items() if key != 'items'}
    text = json.dumps(head, ensure_ascii=False, indent=2)[:-2] + ',\n  "items": {\n'
    text += ',\n'.join('    ' + json.dumps(code) + ': ' + json.dumps(item, ensure_ascii=False)
                       for code, item in lookup['items'].items())
    (ASSETS / 'item/atlas.json').write_text(text + '\n  }\n}\n', encoding='utf-8')
    runtime = {'indexBase': 1, 'sheets': {
        sheet: [info['columns'], info['rows']] for sheet, info in lookup['sheets'].items()},
        'items': {code: item['image'][5:] + '#' + str(item['slot']) if item['slot'] else item['image']
                  for code, item in sorted(lookup['items'].items())}}
    (ROOT / 'client/assets/item-index.js').write_text(
        '(function(root){root.HU_ITEM_INDEX=' + json.dumps(runtime, ensure_ascii=False, separators=(',', ':'))
        + ';if(typeof module!=="undefined")module.exports=root.HU_ITEM_INDEX;})(typeof window!=="undefined"?window:globalThis);\n',
        encoding='utf-8')


def write_preview(lookup):
    sections = []
    for image in ['item/' + sheet for sheet in lookup['sheets']] + [None]:
        entries = [(code, item) for code, item in lookup['items'].items()
                   if item['image'] == image or (image is None and item['slot'] is None)]
        cols = lookup['sheets'][image[5:]]['columns'] if image else 5
        cards = []
        for code, item in entries:
            if item['slot']:
                x, y = (item['column'] - 1) * CELL, (item['row'] - 1) * CELL
                icon = f'<div class="icon" style="background-image:url({escape(item["image"], quote=True)});background-position:-{x}px -{y}px"></div>'
                position = f'Ô {item["slot"]} · hàng {item["row"]}, cột {item["column"]}'
            else:
                icon = f'<img class="icon" src="{escape(item["image"], quote=True)}" alt="">'
                position = 'Ảnh riêng'
            cards.append(f'<article>{icon}<small>{position}</small><code>{escape(code)}</code><strong>{escape(item["name"])}</strong></article>')
        title = image or 'Ảnh riêng'
        sections.append(f'<section><h2>{escape(title)} — {len(entries)} item</h2><div class="scroll"><div class="grid" style="grid-template-columns:repeat({cols},170px)">\n'
                        + '\n'.join(cards) + '\n</div></div></section>')
    page = '''<!doctype html>
<html lang="vi">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tra cứu item theo atlas</title>
<style>
body{font:15px system-ui,sans-serif;background:#18202b;color:#edf2f7;margin:24px}
h1{font-size:26px}h2{font-size:20px}p{max-width:1000px;line-height:1.6}
.scroll{overflow-x:auto}.grid{display:grid;gap:8px;width:max-content;padding-bottom:12px}
article{background:#273344;border:1px solid #45566c;border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:6px}
.icon{width:128px;height:128px;object-fit:contain;background-repeat:no-repeat;align-self:center}
small{color:#b8d5f6;font-size:12px}code{color:#ffd682}strong{font-size:14px;line-height:1.4}
a{color:#b8d5f6}nav{display:flex;flex-wrap:wrap;gap:16px;margin:20px 0}section{margin:28px 0}
</style>
<h1>Tra cứu item theo atlas</h1>
<p>Đọc từ trái sang phải, rồi xuống hàng. Số ô bắt đầu từ <b>1 trong từng atlas</b>; mỗi ô 128×128 px.
Mã item có thể không liên tục; số ô là vị trí trong ảnh, không phải hậu tố mã.
Tên được hiệu chỉnh theo biểu tượng. Tên hạt giống theo linh thảo cùng mã.
Các tên mang tính mô tả hình ảnh, không xác định hiệu ứng gameplay.</p>
<nav><a href="vat_pham.xlsx">Bảng Excel</a><a href="item/atlas.json">JSON vị trí atlas</a><a href="bang_tra_cuu.json">JSON tên</a></nav>
'''
    (ASSETS / 'tra_cuu_item.html').write_text(page + '\n'.join(sections) + '\n</html>\n', encoding='utf-8')


def main():
    names = json.loads((ASSETS / 'bang_tra_cuu.json').read_text(encoding='utf-8'))
    workbook = openpyxl.load_workbook(ASSETS / 'vat_pham.xlsx')
    lookup = build_lookup(workbook, names)
    sync_workbook(workbook, lookup)
    workbook.save(ASSETS / 'vat_pham.xlsx')
    workbook.close()
    write_indexes(lookup)
    write_preview(lookup)
    count = sum(info['count'] for info in lookup['sheets'].values())
    print(f'Đồng bộ {len(lookup["items"])} mã: {count} ô trong {len(lookup["sheets"])} atlas; số ô từ 1.')


if __name__ == '__main__':
    main()
