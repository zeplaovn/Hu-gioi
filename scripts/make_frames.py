"""Cắt assets_src/frames_sheet.png (1 khung dọc + 1 khung ngang) thành các mảnh nhỏ: 4 góc, 4 cạnh (lát cắt thẳng, lặp được) và viên ngọc giữa cạnh.
CSS (styles/responsive.css, mục "Khung họa tiết") xếp các mảnh này bằng nhiều lớp nền nên góc to mà viền vẫn mỏng.
Chạy:  python3 scripts/make_frames.py   (cần pillow, numpy, scipy)   ->   assets/ui/frame/{w,t}_{tl,tr,bl,br,top,bot,left,right}.png + gem.png
w = khung ngang, t = khung dọc. Ảnh lưu ở nửa độ phân giải (SIZES bên dưới dùng trong CSS)."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, "assets_src", "frames_sheet.png"), os.path.join(ROOT, "assets", "ui", "frame")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
SCALE = 0.5

A = np.array(Image.open(SRC).convert("RGBA"))
lab, _ = ndimage.label(A[:, :, 3] > 20)
comps = sorted(((int((lab == i + 1).sum()), i + 1, s) for i, s in enumerate(ndimage.find_objects(lab))), key=lambda t: -t[0])[:2]
frames = {}
for _, idx, s in comps:
    keep = ndimage.binary_dilation(lab == idx, iterations=6)       # giữ cả quầng sáng mờ, bỏ phần của khung kia
    B = A.copy(); B[~keep] = 0
    crop = B[max(0, s[0].start - 6):s[0].stop + 6, max(0, s[1].start - 6):s[1].stop + 6]
    frames["t" if crop.shape[0] > crop.shape[1] else "w"] = crop

def save(a, name):
    im = Image.fromarray(np.ascontiguousarray(a))
    im = im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.LANCZOS)
    im.save(os.path.join(OUT, name), optimize=True); print(name, im.size)

# (cao góc trên, cao góc dưới, rộng góc) ở độ phân giải đầy đủ; (cột/hàng mẫu cạnh: chỗ chỉ có đường viền)
SPEC = {"w": dict(ct=190, cb=112, cw=172, col=215, row=212), "t": dict(ct=200, cb=140, cw=135, col=160, row=300)}
for k, F in frames.items():
    sp = SPEC[k]; h, w = F.shape[:2]; ct, cb, cw = sp["ct"], sp["cb"], sp["cw"]; row = sp["row"] or h // 2
    save(F[:ct, :cw], f"{k}_tl.png"); save(F[:ct, w - cw:], f"{k}_tr.png")
    save(F[h - cb:, :cw], f"{k}_bl.png"); save(F[h - cb:, w - cw:], f"{k}_br.png")
    c = sp["col"]
    save(np.repeat(F[:ct, c:c + 1], 8, axis=1), f"{k}_top.png"); save(np.repeat(F[h - cb:, c:c + 1], 8, axis=1), f"{k}_bot.png")
    save(np.repeat(F[row:row + 1, :cw], 8, axis=0), f"{k}_left.png"); save(np.repeat(F[row:row + 1, w - cw:], 8, axis=0), f"{k}_right.png")
save(frames["w"][6:76, 466:634], "gem.png")                        # viên ngọc + đoạn viền hai bên (đặt đè lên đường viền)
