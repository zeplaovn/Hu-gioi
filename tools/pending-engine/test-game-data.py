#!/usr/bin/env python3
"""Kiểm tra bộ Excel xuất từ workspace, chạy bằng Python có openpyxl."""

import hashlib
import importlib.util
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parent.parent
EXPORTER = ROOT / 'tools' / 'export-game-data.py'
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('game_data_export', EXPORTER)
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def rows(book, name):
    values = iter(book[name].values)
    headers = next(values)
    return [dict(zip(headers, row)) for row in values]


class GameDataExportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='hu-gioi-data-')
        cls.output = Path(cls.tmp.name)
        subprocess.run([sys.executable, str(EXPORTER), '--output', str(cls.output)], cwd=ROOT, check=True, capture_output=True, text=True)
        cls.data = json.loads(subprocess.check_output(['node', '-e', exporter.NODE_DATA], cwd=ROOT, text=True))
        cls.books = {name: load_workbook(cls.output / name, data_only=True) for name in exporter.FILES}

    @classmethod
    def tearDownClass(cls):
        for book in cls.books.values():
            book.close()
        cls.tmp.cleanup()

    def test_all_items_and_links(self):
        book = self.books['vat_pham_game.xlsx']
        source = {x['code']: x for x in self.data['items']}
        groups = [('Hạt giống', 'Mã hạt'), ('Linh thảo', 'Mã cây'), ('Pháp bảo', 'Mã PB'),
                  ('Công pháp', 'Mã CP'), ('Vật phẩm khác', 'Mã')]
        ids = [row[key] for sheet, key in groups for row in rows(book, sheet)]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), set(source))
        for sheet, _ in groups:
            for row in rows(book, sheet):
                self.assertTrue(row['Tên theo ảnh'], row)
                self.assertTrue(row['Ảnh atlas'], row)
                self.assertTrue((ROOT / 'media/assets' / row['Ảnh atlas']).is_file(), row)
        for row in rows(book, 'Hạt giống'):
            item = source[row['Mã hạt']]
            self.assertEqual(row['Mã cây'], item['herb'])
            self.assertEqual(row['Tên cây trong game'], source[item['herb']]['name'])
            self.assertAlmostEqual(row['Thời gian trồng (giây)'], item['growthSeconds'], delta=.00051)

    def test_bonuses_and_recipes(self):
        book = self.books['vat_pham_game.xlsx']
        source = {x['code']: x for x in self.data['items']}
        for row in rows(book, 'Pháp bảo'):
            bonus = source[row['Mã PB']]['bonus']
            for col, key in [('HP cộng', 'hp'), ('ATK cộng', 'atk'), ('DEF cộng', 'def')]:
                self.assertTrue(math.isclose(row[col], bonus[key], rel_tol=1e-12), row)
            self.assertIsNone(row['CRIT cộng'])
        for row in rows(book, 'Công pháp'):
            bonus = source[row['Mã CP']]['bonus']
            for col, key in [('HP %', 'tang_HP_DEF'), ('ATK %', 'tang_ATK'),
                             ('DEF %', 'tang_HP_DEF'), ('Tốc tu %', 'cong_gop_toc_do'),
                             ('Kỹ năng luyện đan', 'ky_nang_luyen_dan')]:
                self.assertEqual(row[col], bonus.get(key))
        recipes = {r['code']: r for r in self.data['recipes']}
        self.assertEqual({r['Mã đan'] for r in rows(book, 'Đan phương')}, set(recipes))
        for row in rows(book, 'Đan phương'):
            recipe = recipes[row['Mã đan']]
            self.assertEqual(row['Nguyên liệu'], '; '.join(f'{code} ×{count}' for code, count in recipe['herbs'].items()))

    def test_enemy_mapping(self):
        book = self.books['quai_va_boss_game.xlsx']
        assets = {r['Mã ảnh']: r for sheet in ('Quái vật', 'Boss') for r in rows(book, sheet)}
        combat = {(r['ID địa điểm'], r['Loại đối thủ']): r for r in rows(book, 'Lịch luyện')}
        self.assertEqual(len(combat), len(self.data['combat']))
        for entry in self.data['combat']:
            row = combat[(entry['zone']['id'], entry['kind'])]
            self.assertEqual(row['Tên game'], entry['name'])
            self.assertEqual(row['Hệ số HP ATK DEF'], entry['mult'])
            self.assertEqual(row['Đường dẫn ảnh hiện tại'], entry['path'])
            self.assertEqual(assets[row['Mã ảnh']]['Đường dẫn nguồn cũ'], 'monster/' + entry['dir'])
            self.assertTrue((ROOT / entry['path'] / 'dung_yen' / '1.png').is_file(), entry)
        self.assertEqual({r['Mã bí cảnh'] for r in rows(book, 'Boss bí cảnh')}, {d['id'] for d in self.data['dungeons']})

    def test_npcs_and_suggestions(self):
        book = self.books['npc_game.xlsx']
        main = rows(book, 'NPC chính')
        self.assertEqual({r['Mã NPC'] for r in main}, set(exporter.NPC_IDEAS))
        for row in main:
            self.assertTrue((ROOT / row['Ảnh hiện tại']).is_file(), row)
            for col in ('Bối cảnh (đề xuất)', 'Quan hệ (đề xuất)', 'Thích (đề xuất)', 'Không thích (đề xuất)'):
                self.assertTrue(row[col], row)
        social = rows(book, 'Nhân vật mô phỏng')
        actual_ids = {x['id'] for group in self.data['social'].values() for x in group}
        self.assertEqual({r['ID game'] for r in social}, actual_ids)
        self.assertEqual({r['ID game'] for r in social}, set(exporter.SOCIAL_IDEAS))

    def test_existing_files_are_not_overwritten(self):
        target = self.output / exporter.FILES[0]
        before = hashlib.sha256(target.read_bytes()).hexdigest()
        result = subprocess.run([sys.executable, str(EXPORTER), '--output', str(self.output)], cwd=ROOT, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('--force', result.stderr)
        self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
