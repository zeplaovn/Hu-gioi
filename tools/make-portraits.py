#!/usr/bin/env python3
"""Bộ assets mới không kèm portrait.png. Sinh chân dung vuông 256×256 (đầu và vai) từ khung dung_yen/1.png
của từng giới tính × đại giới. Chạy: python3 tools/make-portraits.py"""
import os
from PIL import Image
A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../media/assets/chars/player')
for g in ('nam', 'nu'):
    for w in ('ha_gioi', 'linh_gioi', 'tien_gioi'):
        src = os.path.join(A, g, w, 'dung_yen', '1.png')
        im = Image.open(src).convert('RGBA'); box = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
        x0, y0, x1, y1 = box; h = int((y1 - y0) * .52); side = max(x1 - x0, h)
        cx = (x0 + x1) // 2
        crop = im.crop((cx - side // 2, y0, cx + side // 2, y0 + side))
        crop.resize((256, 256), Image.LANCZOS).save(os.path.join(A, g, w, 'portrait.png'), optimize=True)
print('xong 6 chân dung')
