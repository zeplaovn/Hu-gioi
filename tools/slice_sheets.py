#!/usr/bin/env python3
"""Cắt 3 ảnh sheet trong assets_src/ (lưới 4 cột x 3 hàng) thành sprite lẻ trong assets/.
Chạy:  pip install pillow numpy scipy   rồi   python tools/slice_sheets.py
Thay ảnh sheet mới (cùng bố cục 4x3) rồi chạy lại là cập nhật asset."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, "assets_src"), os.path.join(ROOT, "assets")

PLANTS = ["grass", "ginseng", "lingzhi", "lotus", "fire", "gold", "lily", "blood", "bamboo", "fruit", "jade", "cloud"]
TILES = ["empty", "seed", "sprout", "grow", "ripe", "wilt", "water", "gold", "fence", "trough", "rune", "scarecrow"]
SKILLS = ["meditate", "sword", "body", "scroll", "fist", "book_gold", "book_blue", "book_brown",
          "book_pale", "book_purple", "book_green", "book_red"]


def grid_order(comps, H, W):
    """Xếp 12 thành phần theo hàng (trên->dưới) rồi cột (trái->phải) của lưới 3x4."""
    return sorted(comps, key=lambda c: (min(2, int(c[1] / (H / 3))), min(3, int(c[2] / (W / 4)))))


def components(mask):
    lab, n = ndi.label(mask)
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    ids = [i + 1 for i in np.argsort(sizes)[::-1][:12]]
    comps = []
    for i in ids:
        ys, xs = np.where(lab == i)
        comps.append((i, ys.mean(), xs.mean()))
    return lab, comps


def save(img, folder, name, sizes):
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    for suffix, m in sizes:
        im = img.copy()
        im.thumbnail((m, m), Image.LANCZOS)
        im.save(os.path.join(OUT, folder, f"{name}{suffix}.png"), optimize=True)


def cut_rgba(path, names, folder, sizes, grow=5, th=60):
    a = np.array(Image.open(path).convert("RGBA"))
    al = a[..., 3]
    lab, comps = components(al > th)
    for (i, _, _), nm in zip(grid_order(comps, *al.shape), names):
        m = ndi.binary_dilation(lab == i, iterations=grow)
        sub = a.copy()
        sub[..., 3] = np.where(m, al, 0)
        sub[..., 3] = np.where(sub[..., 3] < 24, 0, sub[..., 3])
        ys, xs = np.where(sub[..., 3] > 0)
        save(Image.fromarray(sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]), folder, nm, sizes)
        print(folder, nm)


def cut_medallions(path, names, folder, sizes):
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    bg = np.median(a[:8, :8].reshape(-1, 3), axis=0)
    fg = np.abs(a - bg).sum(2) > 40
    lab, comps = components(ndi.binary_closing(fg, iterations=3))
    for (i, _, _), nm in zip(grid_order(comps, *fg.shape), names):
        m = ndi.binary_fill_holes(lab == i)
        ys, xs = np.where(m)
        rgba = np.dstack([a.astype(np.uint8), (m * 255).astype(np.uint8)])
        save(Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]), folder, nm, sizes)
        print(folder, nm)


if __name__ == "__main__":
    cut_rgba(os.path.join(SRC, "plants_sheet.png"), PLANTS, "plants", [("", 160), ("_48", 48)])
    cut_rgba(os.path.join(SRC, "farm_sheet.png"), TILES, "farm", [("", 220)], grow=4)
    cut_medallions(os.path.join(SRC, "skills_sheet.png"), SKILLS, "skills", [("", 128), ("_40", 40)])
