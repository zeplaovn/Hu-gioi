#!/usr/bin/env python3
"""Kiểm tra tính hợp lệ và liên kết bộ dữ liệu thiết kế."""

import copy
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / 'tools' / 'build-defined-game.py'
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('defined_game', SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class DefinedGameTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='hu-gioi-defined-')
        cls.output = Path(cls.temp.name)
        subprocess.run([sys.executable, str(SCRIPT), '--output', str(cls.output)], cwd=ROOT, check=True, capture_output=True, text=True)
        cls.data = json.loads((cls.output / 'du_lieu.json').read_text(encoding='utf-8'))
        cls.books = {n: load_workbook(cls.output / n, data_only=True) for n in builder.FILES if n.endswith('.xlsx')}

    @classmethod
    def tearDownClass(cls):
        for book in cls.books.values():
            book.close()
        cls.temp.cleanup()

    def test_schema_and_relations(self):
        builder.validate(self.data)
        self.assertEqual(len(self.data['hạt giống']), 30)
        self.assertEqual(len(self.data['linh thảo']), 30)
        self.assertEqual(len(self.data['pháp bảo']), 30)
        self.assertEqual(len(self.data['linh căn']), 10)
        self.assertEqual({r['độ khó'] for r in self.data['hạt giống']}, {1, 2, 3, 4, 5})
        self.assertEqual({r['độ hiếm'] for r in self.data['pháp bảo']}, set(builder.RARITIES))
        self.assertEqual({r['thể loại'] for r in self.data['bí tịch']}, {'luyện khí', 'luyện đan', 'luyện pháp bảo', 'vẽ phù lục'})
        self.assertEqual({r['công dụng'] for r in self.data['công pháp']}, {'công kích', 'phòng ngự', 'support'})
        self.assertEqual({r['hiệu ứng'] for r in self.data['hiệu ứng pháp bảo']}, {'giáp ảo', 'hồi máu', 'đóng băng', 'gây độc', 'chảy máu', 'gây choáng'})

    def test_excel_matches_json(self):
        mapping = {
            'vat_pham.xlsx': {'Hạt giống':'hạt giống', 'Linh thảo':'linh thảo', 'Đan dược':'đan dược',
                'Đan phương':'đan phương', 'Pháp bảo':'pháp bảo', 'Hiệu ứng pháp bảo':'hiệu ứng pháp bảo',
                'Công pháp':'công pháp', 'Bí tịch':'bí tịch', 'Rèn pháp bảo':'rèn pháp bảo', 'Phù lục':'phù lục', 'Vẽ phù':'vẽ phù'},
            'quai_boss.xlsx': {'Quái vật':'quái vật', 'Boss':'boss', 'Giai đoạn boss':'giai đoạn boss', 'Vật phẩm rơi':'vật phẩm rơi'},
            'npc.xlsx': {'NPC':'npc', 'Quy tắc NPC':'quy tắc npc'},
            'linh_can.xlsx': {'Linh căn':'linh căn', 'Loại linh căn':'loại linh căn', 'Ngũ hành':'ngũ hành', 'Quy tắc linh căn':'quy tắc linh căn'},
        }
        for filename, sheets in mapping.items():
            book = self.books[filename]
            for sheet, key in sheets.items():
                ws = book[sheet]
                self.assertTrue(ws.freeze_panes and ws.auto_filter.ref, (filename, sheet))
                values = iter(ws.values)
                headers = next(values)
                actual = [dict(zip(headers, row)) for row in values]
                for row in actual:
                    for k, v in row.items():
                        if v is None and self.data[key][0].get(k) == '':
                            row[k] = ''
                # Excel không phân biệt ô rỗng với chuỗi rỗng.
                expected = [{k: (v or None) if isinstance(v, str) else v for k, v in r.items()} for r in self.data[key]]
                normalized = [{k: (v or None) if isinstance(v, str) else v for k, v in r.items()} for r in actual]
                self.assertEqual(normalized, expected, (filename, sheet))

    def test_source_mapping_and_design_boundaries(self):
        raw = json.loads(subprocess.check_output(['node', '-e', builder.NODE_DATA], cwd=ROOT, text=True))
        originals = {x['code']: x for x in raw['items']}
        for sheet in ('hạt giống', 'linh thảo', 'đan dược', 'pháp bảo', 'công pháp', 'bí tịch'):
            for row in self.data[sheet]:
                if row['mã game cũ']:
                    self.assertIn(row['mã game cũ'], originals)
                    self.assertLessEqual(originals[row['mã game cũ']]['tier'], 4)
        roots = {r['mã LC']: r for r in self.data['linh căn']}
        self.assertEqual(roots['LC101']['khắc theo ví dụ'], 'thổ')
        self.assertIn('mộc', roots['LC101']['hệ gốc dị'])
        self.assertIn('mâu thuẫn', self.data['metadata']['lưu ý dị linh căn'].lower())
        self.assertEqual(roots['LC201']['tốc độ tu luyện cơ sở'], 3)

    def test_validator_rejects_broken_links(self):
        mutations = [
            lambda x: x['hạt giống'][0].update({'linh thảo thu được':'LT999'}),
            lambda x: x['pháp bảo'][0].update({'độ hiếm':'thần'}),
            lambda x: x['vật phẩm rơi'][0].update({'tỉ lệ (%)':101}),
            lambda x: x['giai đoạn boss'][0].update({'hp đến (%)':49}),
            lambda x: x['npc'][0].update({'thích (mã vật phẩm)':'LT999'}),
            lambda x: x['vẽ phù'][0].update({'mã bí tịch':'BT999'}),
        ]
        for mutate in mutations:
            data = copy.deepcopy(self.data)
            mutate(data)
            with self.assertRaises(ValueError):
                builder.validate(data)

    def test_refuses_overwrite(self):
        path = self.output / 'du_lieu.json'
        before = hashlib.sha256(path.read_bytes()).hexdigest()
        result = subprocess.run([sys.executable, str(SCRIPT), '--output', str(self.output)], cwd=ROOT, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('--force', result.stderr)
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
