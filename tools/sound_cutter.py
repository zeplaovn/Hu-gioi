#!/usr/bin/env python3
"""Hư Giới · Công cụ cắt âm thanh bằng Tkinter.

Mở tệp MP3/WAV/OGG/FLAC/M4A/Opus, xem sóng âm, kéo chọn đoạn cần giữ,
nghe thử và xuất đoạn đã chọn. Công cụ dùng FFmpeg để giải mã/ghép âm thanh
nên không cần cài thêm thư viện Python.

Yêu cầu:
    - Python 3.10+ có Tkinter
    - ffmpeg, ffprobe trong PATH
    - ffplay trong PATH (chỉ cần cho nút Nghe thử)

Chạy:
    python3 tools/sound_cutter.py
    python3 tools/sound_cutter.py media/audio/vo_uu.mp3

Kiểm tra môi trường:
    python3 tools/sound_cutter.py --check
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import threading
from array import array
from dataclasses import asdict, dataclass
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


APP_TITLE = "Hư Giới · Cắt âm thanh"
FFMPEG = shutil.which("ffmpeg")
FFPROBE = shutil.which("ffprobe")
FFPLAY = shutil.which("ffplay")

BG = "#10151b"
PANEL = "#171e27"
CANVAS_BG = "#0a0e13"
BORDER = "#2a3441"
FG = "#e7e1d4"
MUTED = "#97a3b2"
GOLD = "#d8b15e"
GOLD_HI = "#efd08a"
SELECT_OUTLINE = "#9cc7ff"
CURSOR = "#ff6b6b"
WAVE = "#c9a45c"
GRID = "#18212b"
TICK = "#526070"
RED = "#ff7b7b"

AUDIO_FILETYPES = [
    ("Tệp âm thanh", "*.mp3 *.wav *.ogg *.oga *.flac *.m4a *.aac *.opus *.wma *.aiff *.aif"),
    ("Tất cả tệp", "*.*"),
]

FORMATS = {
    "MP3": ".mp3",
    "WAV": ".wav",
    "OGG": ".ogg",
    "FLAC": ".flac",
    "M4A": ".m4a",
    "Opus": ".opus",
}
LOSSLESS_OR_FIXED = {"WAV", "OGG", "FLAC"}


@dataclass
class MediaInfo:
    path: str
    duration: float
    sample_rate: int
    channels: int
    codec: str
    size: int


def format_size(size: int) -> str:
    value = float(max(0, size))
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{int(value)} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} GB"


def format_timecode(seconds: float) -> str:
    total_ms = max(0, int(round(float(seconds) * 1000)))
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def format_duration(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    if seconds >= 3600:
        return f"{int(seconds // 3600)}h {int(seconds % 3600 // 60):02d}m {seconds % 60:04.1f}s"
    if seconds >= 60:
        return f"{int(seconds // 60)}m {seconds % 60:04.1f}s"
    return f"{seconds:.2f}s"


def format_tick(seconds: float, span: float) -> str:
    seconds = max(0.0, seconds)
    if span < 10:
        return f"{seconds:.2f}s"
    hours = int(seconds // 3600)
    minutes = int(seconds % 3600 // 60)
    secs = int(seconds % 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def parse_timecode(text: str) -> float | None:
    """Nhận 12.5, 1:23.5, 01:23:45.250. Trả None nếu sai."""
    raw = str(text).strip().replace(",", ".")
    if not raw:
        return None
    parts = raw.split(":")
    if len(parts) > 3:
        return None
    try:
        values = [float(part) for part in parts]
    except ValueError:
        return None
    if any(value < 0 or not math.isfinite(value) for value in values):
        return None
    if len(values) == 1:
        return values[0]
    if len(values) == 2:
        return values[0] * 60 + values[1]
    return values[0] * 3600 + values[1] * 60 + values[2]


def nice_step(span: float, target_ticks: int) -> float:
    raw = max(1e-6, span / max(1, target_ticks))
    steps = (
        0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5,
        1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800,
        3600, 7200, 14400, 21600, 43200, 86400,
    )
    for step in steps:
        if raw <= step:
            return step
    return steps[-1]


def probe_media(path: str) -> MediaInfo:
    if not FFPROBE:
        raise RuntimeError("Không tìm thấy ffprobe trong PATH.")
    cmd = [
        FFPROBE, "-v", "error",
        "-show_entries",
        "format=duration,size,bit_rate:stream=codec_type,codec_name,sample_rate,channels,duration",
        "-of", "json", path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffprobe không đọc được tệp.")
    data = json.loads(result.stdout or "{}")
    streams = [s for s in data.get("streams", []) if s.get("codec_type") == "audio"]
    if not streams:
        raise RuntimeError("Tệp không có luồng âm thanh.")
    stream = streams[0]
    fmt = data.get("format", {})
    duration = 0.0
    for value in (fmt.get("duration"), stream.get("duration")):
        try:
            duration = float(value)
        except (TypeError, ValueError):
            duration = 0.0
        if duration > 0:
            break
    if duration <= 0:
        raise RuntimeError("Không xác định được thời lượng tệp.")
    try:
        size = int(fmt.get("size") or os.path.getsize(path))
    except (TypeError, ValueError, OSError):
        size = 0
    return MediaInfo(
        path=os.path.abspath(path),
        duration=duration,
        sample_rate=int(stream.get("sample_rate") or 0),
        channels=int(stream.get("channels") or 0),
        codec=str(stream.get("codec_name") or "?"),
        size=size,
    )


def decode_waveform(path: str, duration: float) -> tuple[array, int]:
    """Giải mã thành PCM mono nhỏ để vẽ sóng âm, không dùng cho xuất tệp."""
    if not FFMPEG:
        raise RuntimeError("Không tìm thấy ffmpeg trong PATH.")
    if duration <= 600:
        rate = 8000
    elif duration <= 7200:
        rate = 4000
    else:
        rate = 2000
    cmd = [
        FFMPEG, "-hide_banner", "-loglevel", "error",
        "-i", path, "-map", "0:a:0", "-vn", "-ac", "1",
        "-ar", str(rate), "-f", "s16le", "pipe:1",
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(message or "ffmpeg không giải mã được tệp.")
    raw = result.stdout
    raw = raw[: len(raw) // 2 * 2]
    samples = array("h")
    samples.frombytes(raw)
    if sys.byteorder == "big":
        samples.byteswap()
    return samples, rate


class SoundCutterApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.media: MediaInfo | None = None
        self.samples: array | None = None
        self.sample_rate = 4000
        self.view_start = 0.0
        self.view_end = 1.0
        self.sel_start = 0.0
        self.sel_end = 1.0
        self.cursor = 0.0
        self.drag_anchor = 0.0
        self.drag_start_x = 0
        self.dragging = False
        self.drag_moved = False
        self.preview_proc: subprocess.Popen | None = None
        self.load_token = 0
        self.loading = False
        self.busy = False
        self._updating_entries = False
        self._resize_job: str | None = None
        self._last_dir = os.path.expanduser("~")
        self._media_controls: list[tk.Widget] = []

        self._configure_window()
        self._configure_styles()
        self._build_ui()
        self._bind_shortcuts()
        self._set_media_enabled(False)
        self._show_empty()

    # ------------------------------------------------------------------ UI

    def _configure_window(self) -> None:
        self.root.title(APP_TITLE)
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        width = max(860, min(1120, screen_w - 80))
        height = max(600, min(760, screen_h - 80))
        x = max(0, (screen_w - width) // 2)
        y = max(0, (screen_h - height) // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        self.root.minsize(860, 600)
        self.root.configure(bg=BG)
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(2, weight=1)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _configure_styles(self) -> None:
        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(".", background=BG, foreground=FG, bordercolor=BORDER,
                        lightcolor=BORDER, darkcolor=BORDER, focuscolor=GOLD)
        style.configure("TFrame", background=BG)
        style.configure("Panel.TFrame", background=PANEL)
        style.configure("TLabel", background=PANEL, foreground=FG)
        style.configure("Muted.TLabel", background=PANEL, foreground=MUTED)
        style.configure("Error.TLabel", background=PANEL, foreground=RED)
        style.configure("File.TLabel", background=PANEL, foreground=GOLD)
        style.configure("Title.TLabel", background=PANEL, foreground=GOLD,
                        font=("TkDefaultFont", 17, "bold"))
        style.configure("Mono.TLabel", background=PANEL, foreground=MUTED,
                        font=("TkFixedFont", 9))
        style.configure("TButton", padding=(10, 5), background="#222b36",
                        foreground=FG, bordercolor=BORDER, lightcolor="#2f3a47",
                        darkcolor="#161d25", focuscolor=GOLD)
        style.map("TButton",
                  background=[("pressed", "#1a222b"), ("active", "#2d3846"),
                              ("disabled", "#151b22")],
                  foreground=[("disabled", "#5f6b7a")],
                  bordercolor=[("active", GOLD)])
        style.configure("Accent.TButton", background=GOLD, foreground="#1b1306",
                        padding=(13, 6))
        style.map("Accent.TButton",
                  background=[("active", GOLD_HI), ("disabled", "#5b4d33")],
                  foreground=[("disabled", "#8a7a5a")])
        style.configure("TLabelframe", background=PANEL, bordercolor=BORDER)
        style.configure("TLabelframe.Label", background=PANEL, foreground=GOLD)
        style.configure("TEntry", fieldbackground="#0c1117", foreground=FG,
                        insertcolor=FG, bordercolor=BORDER)
        style.configure("TCombobox", fieldbackground="#0c1117", foreground=FG,
                        background=PANEL, arrowcolor=FG, bordercolor=BORDER)
        style.map("TCombobox",
                  fieldbackground=[("readonly", "#0c1117")],
                  foreground=[("readonly", FG)],
                  selectbackground=[("readonly", "#0c1117")],
                  selectforeground=[("readonly", FG)])
        style.configure("TCheckbutton", background=PANEL, foreground=FG)
        style.map("TCheckbutton", background=[("active", PANEL)])
        style.configure("Horizontal.TProgressbar", troughcolor="#0c1117",
                        background=GOLD, bordercolor=BORDER, lightcolor=GOLD,
                        darkcolor=GOLD)
        style.configure("TSeparator", background=BORDER)

    def _build_ui(self) -> None:
        header = ttk.Frame(self.root, style="Panel.TFrame", padding=(16, 12, 16, 8))
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(1, weight=1)
        ttk.Label(header, text="CẮT ÂM THANH", style="Title.TLabel").grid(
            row=0, column=0, sticky="w")
        ttk.Label(header, text="Chọn đoạn trên sóng âm hoặc nhập mốc thời gian",
                  style="Muted.TLabel").grid(row=1, column=0, sticky="w", pady=(2, 0))
        self.file_label = ttk.Label(header, text="Chưa mở tệp", style="File.TLabel",
                                    anchor="e")
        self.file_label.grid(row=0, column=1, rowspan=2, sticky="e")

        bar = ttk.Frame(self.root, style="Panel.TFrame", padding=(16, 6, 16, 8))
        bar.grid(row=1, column=0, sticky="ew")
        self.open_btn = ttk.Button(bar, text="Mở tệp…", command=self.open_file,
                                   style="Accent.TButton")
        self.open_btn.pack(side="left")
        self.play_btn = ttk.Button(bar, text="▶ Nghe thử", command=self.toggle_preview)
        self.play_btn.pack(side="left", padx=(8, 0))
        ttk.Separator(bar, orient="vertical").pack(side="left", fill="y", padx=10)
        self.zoom_all_btn = ttk.Button(bar, text="Toàn bộ", command=self.zoom_all)
        self.zoom_all_btn.pack(side="left")
        self.zoom_out_btn = ttk.Button(bar, text="−", width=3, command=self.zoom_out)
        self.zoom_out_btn.pack(side="left", padx=(6, 0))
        self.zoom_in_btn = ttk.Button(bar, text="+", width=3, command=self.zoom_in)
        self.zoom_in_btn.pack(side="left", padx=(4, 0))
        self.pan_left_btn = ttk.Button(bar, text="◀", width=3,
                                       command=lambda: self.pan(-0.12))
        self.pan_left_btn.pack(side="left", padx=(10, 0))
        self.pan_right_btn = ttk.Button(bar, text="▶", width=3,
                                        command=lambda: self.pan(0.12))
        self.pan_right_btn.pack(side="left", padx=(4, 0))
        self.zoom_var = tk.StringVar(value="")
        ttk.Label(bar, textvariable=self.zoom_var, style="Mono.TLabel").pack(
            side="right", padx=(12, 0))

        canvas_frame = ttk.Frame(self.root, style="Panel.TFrame", padding=(16, 0, 16, 0))
        canvas_frame.grid(row=2, column=0, sticky="nsew")
        canvas_frame.rowconfigure(0, weight=1)
        canvas_frame.columnconfigure(0, weight=1)
        self.canvas = tk.Canvas(canvas_frame, bg=CANVAS_BG, highlightthickness=0,
                                bd=0, cursor="crosshair")
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.canvas.bind("<ButtonPress-1>", self._on_canvas_press)
        self.canvas.bind("<B1-Motion>", self._on_canvas_motion)
        self.canvas.bind("<ButtonRelease-1>", self._on_canvas_release)
        self.canvas.bind("<Double-Button-1>", lambda _e: self.select_all())
        self.canvas.bind("<Configure>", self._on_canvas_configure)
        self.canvas.bind("<MouseWheel>", self._on_mousewheel)
        self.canvas.bind("<Button-4>", self._on_mousewheel)
        self.canvas.bind("<Button-5>", self._on_mousewheel)

        info = ttk.Frame(self.root, style="Panel.TFrame", padding=(16, 6, 16, 0))
        info.grid(row=3, column=0, sticky="ew")
        self.info_var = tk.StringVar(value="Mở một tệp âm thanh để bắt đầu.")
        ttk.Label(info, textvariable=self.info_var, style="Muted.TLabel").pack(side="left")
        self.cursor_var = tk.StringVar(value="")
        ttk.Label(info, textvariable=self.cursor_var, style="Mono.TLabel").pack(side="right")

        bottom = ttk.Frame(self.root, style="Panel.TFrame", padding=(16, 8, 16, 8))
        bottom.grid(row=4, column=0, sticky="ew")
        bottom.columnconfigure(0, weight=1)

        selection = ttk.LabelFrame(bottom, text="Đoạn cắt", padding=(10, 8))
        selection.grid(row=0, column=0, sticky="ew")
        for column in (1, 3):
            selection.columnconfigure(column, weight=1)

        self.start_var = tk.StringVar(value="00:00:00.000")
        self.end_var = tk.StringVar(value="00:00:00.000")
        self.length_var = tk.StringVar(value="—")
        ttk.Label(selection, text="Bắt đầu").grid(row=0, column=0, sticky="w", padx=(0, 6))
        self.start_entry = ttk.Entry(selection, textvariable=self.start_var, width=15)
        self.start_entry.grid(row=0, column=1, sticky="w")
        self.start_entry.bind("<Return>", self._apply_time_entries)
        self.start_entry.bind("<FocusOut>", self._apply_time_entries)
        self.set_start_btn = ttk.Button(selection, text="Đặt từ con trỏ",
                                        command=self.set_start_from_cursor)
        self.set_start_btn.grid(row=0, column=2, padx=(6, 16))
        ttk.Label(selection, text="Kết thúc").grid(row=0, column=3, sticky="w", padx=(0, 6))
        self.end_entry = ttk.Entry(selection, textvariable=self.end_var, width=15)
        self.end_entry.grid(row=0, column=4, sticky="w")
        self.end_entry.bind("<Return>", self._apply_time_entries)
        self.end_entry.bind("<FocusOut>", self._apply_time_entries)
        self.set_end_btn = ttk.Button(selection, text="Đặt từ con trỏ",
                                      command=self.set_end_from_cursor)
        self.set_end_btn.grid(row=0, column=5, padx=(6, 16))
        ttk.Label(selection, text="Dài").grid(row=0, column=6, sticky="e", padx=(0, 6))
        ttk.Label(selection, textvariable=self.length_var, style="Mono.TLabel").grid(
            row=0, column=7, sticky="w")

        self.select_all_btn = ttk.Button(selection, text="Chọn tất cả",
                                         command=self.select_all)
        self.select_all_btn.grid(row=1, column=0, columnspan=2, sticky="w", pady=(8, 0))
        ttk.Label(
            selection,
            text=("Kéo chuột trên sóng âm để chọn · Cuộn để di chuyển · "
                  "Ctrl+cuộn để phóng to"),
            style="Muted.TLabel",
        ).grid(row=1, column=2, columnspan=6, sticky="e", pady=(8, 0))

        export = ttk.LabelFrame(bottom, text="Xuất tệp", padding=(10, 8))
        export.grid(row=1, column=0, sticky="ew", pady=(8, 0))
        export.columnconfigure(6, weight=1)
        ttk.Label(export, text="Định dạng").grid(row=0, column=0, sticky="w", padx=(0, 6))
        self.format_var = tk.StringVar(value="MP3")
        self.format_cb = ttk.Combobox(export, textvariable=self.format_var, width=9,
                                      values=list(FORMATS), state="readonly")
        self.format_cb.grid(row=0, column=1, sticky="w")
        self.format_cb.bind("<<ComboboxSelected>>", self._on_format_change)
        ttk.Label(export, text="Bitrate").grid(row=0, column=2, sticky="w", padx=(14, 6))
        self.bitrate_var = tk.StringVar(value="192k")
        self.bitrate_cb = ttk.Combobox(export, textvariable=self.bitrate_var, width=7,
                                       values=["128k", "192k", "256k", "320k"],
                                       state="readonly")
        self.bitrate_cb.grid(row=0, column=3, sticky="w")
        self.fade_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(export, text="Fade 50 ms", variable=self.fade_var).grid(
            row=0, column=4, padx=(14, 0))
        self.export_btn = ttk.Button(export, text="Xuất đoạn…", command=self.export,
                                     style="Accent.TButton")
        self.export_btn.grid(row=0, column=5, padx=(14, 0))
        ttk.Label(export, text="Xuất đúng đoạn đang chọn, giữ metadata cơ bản.",
                  style="Muted.TLabel").grid(row=0, column=6, sticky="e")

        status = ttk.Frame(self.root, style="Panel.TFrame", padding=(16, 0, 16, 10))
        status.grid(row=5, column=0, sticky="ew")
        status.columnconfigure(0, weight=1)
        self.status_var = tk.StringVar(value="Sẵn sàng.")
        self.status_label = ttk.Label(status, textvariable=self.status_var,
                                      style="Muted.TLabel")
        self.status_label.grid(row=0, column=0, sticky="w")
        self.progress = ttk.Progressbar(status, mode="indeterminate", length=160)
        self.progress.grid(row=0, column=1, sticky="e")
        self.progress.grid_remove()

        self._media_controls = [
            self.play_btn, self.export_btn, self.select_all_btn,
            self.start_entry, self.end_entry, self.set_start_btn, self.set_end_btn,
            self.zoom_all_btn, self.zoom_in_btn, self.zoom_out_btn,
            self.pan_left_btn, self.pan_right_btn,
        ]

    def _bind_shortcuts(self) -> None:
        self.root.bind("<Control-o>", lambda _e: self.open_file())
        self.root.bind("<Control-O>", lambda _e: self.open_file())
        self.root.bind("<Control-e>", lambda _e: self.export())
        self.root.bind("<Control-E>", lambda _e: self.export())
        self.root.bind("<space>", self._on_space)
        self.root.bind("<Escape>", lambda _e: self.stop_preview())
        self.root.bind("<Left>", lambda _e: self._nudge_cursor(-0.1))
        self.root.bind("<Right>", lambda _e: self._nudge_cursor(0.1))
        self.root.bind("<Shift-Left>", lambda _e: self._nudge_end(-0.1))
        self.root.bind("<Shift-Right>", lambda _e: self._nudge_end(0.1))
        self.root.bind("<bracketleft>", lambda _e: self.set_start_from_cursor())
        self.root.bind("<bracketright>", lambda _e: self.set_end_from_cursor())
        self.root.bind("<Home>", lambda _e: self._move_cursor(0.0))
        self.root.bind(
            "<End>",
            lambda _e: self._move_cursor(self.media.duration if self.media else 0.0),
        )

    # ------------------------------------------------------------- helpers

    def _typing(self) -> bool:
        widget = self.root.focus_get()
        return isinstance(widget, (tk.Entry, ttk.Entry, ttk.Combobox, tk.Text, tk.Spinbox))

    def _on_space(self, _event: tk.Event) -> str | None:
        widget = self.root.focus_get()
        if isinstance(widget, (tk.Button, ttk.Button)) or self._typing():
            return None
        self.toggle_preview()
        return "break"

    def set_status(self, text: str, error: bool = False) -> None:
        self.status_var.set(text)
        self.status_label.configure(style="Error.TLabel" if error else "Muted.TLabel")

    def _set_media_enabled(self, enabled: bool) -> None:
        state = "normal" if enabled else "disabled"
        for widget in self._media_controls:
            try:
                widget.configure(state=state)
            except tk.TclError:
                pass

    def _set_busy(self, busy: bool) -> None:
        self.busy = busy
        self.open_btn.configure(state="disabled" if busy else "normal")
        if busy:
            self.progress.grid()
            self.progress.start(12)
            self._set_media_enabled(False)
        else:
            self.progress.stop()
            self.progress.grid_remove()
            self._set_media_enabled(bool(self.media))

    def _show_empty(self) -> None:
        self.canvas.delete("all")
        width = max(1, self.canvas.winfo_width())
        height = max(1, self.canvas.winfo_height())
        text = ("Đang đọc tệp và dựng sóng âm…" if self.loading else
                "Mở tệp âm thanh để bắt đầu\nMP3 · WAV · OGG · FLAC · M4A · Opus")
        self.canvas.create_text(
            width / 2, height / 2, text=text,
            fill=MUTED, justify="center", font=("TkDefaultFont", 12), tags="empty",
        )

    def _on_canvas_configure(self, _event: tk.Event) -> None:
        if self._resize_job:
            self.root.after_cancel(self._resize_job)
        self._resize_job = self.root.after(120, self._after_resize)

    def _after_resize(self) -> None:
        self._resize_job = None
        if self.media and self.samples:
            self._render_waveform()
        else:
            self._show_empty()

    # --------------------------------------------------------------- load

    def open_file(self) -> None:
        if self.busy:
            return
        path = filedialog.askopenfilename(
            title="Chọn tệp âm thanh", initialdir=self._last_dir,
            filetypes=AUDIO_FILETYPES,
        )
        if not path:
            return
        self._last_dir = os.path.dirname(path)
        self.load_file(path)

    def load_file(self, path: str) -> None:
        if self.busy:
            return
        if not os.path.isfile(path):
            messagebox.showerror("Không tìm thấy tệp", f"Không có tệp:\n{path}")
            return
        self.stop_preview()
        self.load_token += 1
        token = self.load_token
        self.media = None
        self.samples = None
        self.loading = True
        self._set_busy(True)
        self.file_label.configure(text=os.path.basename(path))
        self.info_var.set("Đang đọc tệp…")
        self.cursor_var.set("")
        self.set_status("Đang đọc tệp và dựng sóng âm…")
        self.canvas.delete("all")
        width = max(1, self.canvas.winfo_width())
        height = max(1, self.canvas.winfo_height())
        self.canvas.create_text(width / 2, height / 2, text="Đang tải…",
                                fill=MUTED, font=("TkDefaultFont", 12), tags="loading")
        threading.Thread(target=self._load_worker, args=(path, token), daemon=True).start()

    def _load_worker(self, path: str, token: int) -> None:
        try:
            info = probe_media(path)
            samples, rate = decode_waveform(path, info.duration)
            self.root.after(0, lambda: self._finish_load(token, info, samples, rate, None))
        except Exception as exc:  # noqa: BLE001 - hiển thị lỗi cho người dùng
            self.root.after(0, lambda err=exc: self._finish_load(token, None, None, 0, err))

    def _finish_load(self, token: int, info: MediaInfo | None, samples: array | None,
                     rate: int, error: Exception | None) -> None:
        if token != self.load_token:
            return
        self.loading = False
        if error or info is None or samples is None:
            self.media = None
            self.samples = None
            self._set_busy(False)
            self.file_label.configure(text="Chưa mở tệp")
            self.info_var.set("Mở một tệp âm thanh để bắt đầu.")
            self.cursor_var.set("")
            self._show_empty()
            self.set_status("Không đọc được tệp.", error=True)
            messagebox.showerror(
                "Không mở được tệp",
                str(error or "Lỗi không xác định."),
            )
            return
        self.media = info
        self.samples = samples
        self.sample_rate = rate
        self.view_start = 0.0
        self.view_end = info.duration
        self.sel_start = 0.0
        self.sel_end = info.duration
        self.cursor = 0.0
        self._sync_time_fields()
        self.info_var.set(self._info_text(info))
        self.cursor_var.set("Con trỏ  " + format_timecode(0))
        self._set_busy(False)
        self._render_waveform()
        self.set_status(
            "Sẵn sàng. Kéo chuột trên sóng âm để chọn đoạn cần giữ."
        )
        self.root.after(80, self.canvas.focus_set)

    @staticmethod
    def _info_text(info: MediaInfo) -> str:
        parts = [format_duration(info.duration)]
        if info.codec and info.codec != "?":
            parts.append(info.codec.upper())
        if info.sample_rate:
            parts.append(f"{info.sample_rate / 1000:g} kHz")
        if info.channels:
            parts.append(f"{info.channels} kênh")
        if info.size:
            parts.append(format_size(info.size))
        return "  ·  ".join(parts)

    # ----------------------------------------------------------- waveform

    def _time_to_x(self, seconds: float) -> float:
        width = max(1, self.canvas.winfo_width())
        span = max(1e-9, self.view_end - self.view_start)
        return (seconds - self.view_start) / span * width

    def _x_to_time(self, x: float) -> float:
        width = max(1, self.canvas.winfo_width())
        span = self.view_end - self.view_start
        value = self.view_start + (x / width) * span
        if self.media:
            value = max(0.0, min(self.media.duration, value))
        return value

    def _compute_peaks(self, width: int) -> list[tuple[int, int]]:
        if not self.samples or not self.media:
            return []
        count = len(self.samples)
        duration = max(1e-9, self.media.duration)
        start_i = int(self.view_start / duration * count)
        end_i = int(self.view_end / duration * count)
        start_i = max(0, min(count - 1, start_i))
        end_i = max(start_i + 1, min(count, end_i))
        span = max(1, end_i - start_i)
        peaks: list[tuple[int, int]] = []
        for x in range(width):
            a = start_i + span * x // width
            b = start_i + span * (x + 1) // width
            if b <= a:
                b = min(end_i, a + 1)
            if a >= end_i:
                a = end_i - 1
                b = end_i
            chunk = self.samples[a:b]
            peaks.append((min(chunk), max(chunk)) if chunk else (0, 0))
        return peaks

    def _render_waveform(self) -> None:
        self.canvas.delete("all")
        if not self.media or not self.samples:
            self._show_empty()
            return
        width = max(1, self.canvas.winfo_width())
        height = max(1, self.canvas.winfo_height())
        middle = height * 0.5
        amplitude = height * 0.38 / 32768.0

        for y in (height * 0.25, middle, height * 0.75):
            self.canvas.create_line(0, y, width, y, fill=GRID, tags="wave")

        for x, (low, high) in enumerate(self._compute_peaks(width)):
            if low == 0 and high == 0:
                continue
            y1 = middle - high * amplitude
            y2 = middle - low * amplitude
            self.canvas.create_line(x + 0.5, y1, x + 0.5, y2, fill=WAVE, tags="wave")

        span = self.view_end - self.view_start
        step = nice_step(span, max(2, width // 110))
        tick = math.ceil(self.view_start / step) * step
        while tick <= self.view_end + 1e-9:
            x = self._time_to_x(tick)
            if -1 <= x <= width + 1:
                self.canvas.create_line(x, height - 18, x, height - 6,
                                        fill=TICK, tags="wave")
                label_x, anchor = x, "s"
                if x < 28:
                    label_x, anchor = x + 2, "sw"
                elif x > width - 28:
                    label_x, anchor = x - 2, "se"
                self.canvas.create_text(label_x, height - 6, text=format_tick(tick, span),
                                        anchor=anchor, fill=MUTED,
                                        font=("TkFixedFont", 8), tags="wave")
            tick += step

        self._draw_overlay()
        self._update_zoom_label()

    def _draw_overlay(self) -> None:
        self.canvas.delete("overlay")
        if not self.media:
            return
        width = max(1, self.canvas.winfo_width())
        height = max(1, self.canvas.winfo_height())
        x1 = max(0.0, min(float(width), self._time_to_x(self.sel_start)))
        x2 = max(0.0, min(float(width), self._time_to_x(self.sel_end)))
        if x2 > x1:
            self.canvas.create_rectangle(x1, 0, x2, height, fill="#17324d",
                                         outline="", tags=("overlay", "sel_fill"))
            self.canvas.tag_lower("sel_fill", "wave")
            self.canvas.create_line(x1, 0, x1, height, fill=SELECT_OUTLINE,
                                    tags="overlay")
            self.canvas.create_line(x2, 0, x2, height, fill=SELECT_OUTLINE,
                                    tags="overlay")
            if x2 - x1 > 70:
                self.canvas.create_text(
                    (x1 + x2) / 2, 13,
                    text=format_duration(self.sel_end - self.sel_start),
                    fill="#e6f0ff", font=("TkFixedFont", 9), tags="overlay",
                )
        cursor_x = self._time_to_x(self.cursor)
        if 0 <= cursor_x <= width:
            self.canvas.create_line(cursor_x, 0, cursor_x, height, fill=CURSOR,
                                    tags="overlay")
            self.canvas.create_polygon(cursor_x - 4, 0, cursor_x + 4, 0,
                                       cursor_x, 7, fill=CURSOR, outline="",
                                       tags="overlay")

    def _update_zoom_label(self) -> None:
        if not self.media:
            self.zoom_var.set("")
            return
        self.zoom_var.set(
            f"Hiển thị {format_duration(self.view_end - self.view_start)} / "
            f"{format_duration(self.media.duration)}"
        )

    def _set_view(self, start: float, end: float) -> None:
        if not self.media:
            return
        duration = self.media.duration
        span = max(0.02, min(duration, end - start))
        if start < 0:
            start = 0.0
        if start + span > duration:
            start = max(0.0, duration - span)
        self.view_start = start
        self.view_end = start + span
        self._render_waveform()

    def zoom_all(self) -> None:
        if not self.media:
            return
        self._set_view(0.0, self.media.duration)

    def zoom_in(self) -> None:
        self._zoom(2.0)

    def zoom_out(self) -> None:
        self._zoom(0.5)

    def _zoom(self, factor: float) -> None:
        if not self.media:
            return
        anchor = self.cursor if self.view_start <= self.cursor <= self.view_end else \
            (self.view_start + self.view_end) / 2
        old_span = self.view_end - self.view_start
        new_span = max(0.02, min(self.media.duration, old_span / factor))
        ratio = (anchor - self.view_start) / max(1e-9, old_span)
        new_start = anchor - ratio * new_span
        self._set_view(new_start, new_start + new_span)

    def pan(self, ratio: float) -> None:
        if not self.media:
            return
        span = self.view_end - self.view_start
        self._set_view(self.view_start + span * ratio,
                       self.view_end + span * ratio)

    def _on_mousewheel(self, event: tk.Event) -> str:
        if not self.media:
            return "break"
        delta = 1 if getattr(event, "delta", 0) > 0 else -1
        if getattr(event, "num", None) == 4:
            delta = 1
        elif getattr(event, "num", None) == 5:
            delta = -1
        control = bool(getattr(event, "state", 0) & 0x0004)
        if control:
            self._zoom(1.25 if delta > 0 else 0.8)
        else:
            self.pan(-0.12 * delta)
        return "break"

    # ----------------------------------------------------------- selection

    def _on_canvas_press(self, event: tk.Event) -> None:
        if not self.media or self.busy:
            return
        self.canvas.focus_set()
        self.drag_anchor = self._x_to_time(event.x)
        self.drag_start_x = event.x
        self.dragging = True
        self.drag_moved = False
        self.cursor = self.drag_anchor
        self.cursor_var.set("Con trỏ  " + format_timecode(self.cursor))
        self._draw_overlay()

    def _on_canvas_motion(self, event: tk.Event) -> None:
        if not self.dragging or not self.media:
            return
        if abs(event.x - self.drag_start_x) > 2:
            self.drag_moved = True
        if not self.drag_moved:
            return
        point = self._x_to_time(event.x)
        self.sel_start = min(self.drag_anchor, point)
        self.sel_end = max(self.drag_anchor, point)
        self.cursor = point
        self.cursor_var.set("Con trỏ  " + format_timecode(self.cursor))
        self._sync_time_fields()
        self._draw_overlay()

    def _on_canvas_release(self, _event: tk.Event) -> None:
        if not self.dragging:
            return
        self.dragging = False
        if not self.drag_moved:
            self.cursor = self.drag_anchor
            self.cursor_var.set("Con trỏ  " + format_timecode(self.cursor))
            self._draw_overlay()
            return
        self._normalize_selection()
        self._sync_time_fields()
        self._draw_overlay()

    def _normalize_selection(self) -> None:
        if not self.media:
            return
        duration = self.media.duration
        start = max(0.0, min(duration, self.sel_start))
        end = max(0.0, min(duration, self.sel_end))
        if end < start:
            start, end = end, start
        if end - start < 0.02:
            end = min(duration, start + 0.02)
            if end - start < 0.02:
                start = max(0.0, end - 0.02)
        self.sel_start, self.sel_end = start, end

    def _set_selection(self, start: float, end: float) -> None:
        if not self.media:
            return
        self.sel_start = start
        self.sel_end = end
        self._normalize_selection()
        self._sync_time_fields()
        self._draw_overlay()

    def select_all(self) -> None:
        if self.media:
            self._set_selection(0.0, self.media.duration)

    def set_start_from_cursor(self) -> None:
        if self.media:
            self._set_selection(min(self.cursor, self.sel_end - 0.02), self.sel_end)

    def set_end_from_cursor(self) -> None:
        if self.media:
            self._set_selection(self.sel_start, max(self.cursor, self.sel_start + 0.02))

    def _move_cursor(self, seconds: float) -> str:
        if self._typing() or not self.media:
            return ""
        self.cursor = max(0.0, min(self.media.duration, seconds))
        self.cursor_var.set("Con trỏ  " + format_timecode(self.cursor))
        self._draw_overlay()
        return "break"

    def _nudge_cursor(self, delta: float) -> str:
        if self._typing() or not self.media:
            return ""
        self.cursor = max(0.0, min(self.media.duration, self.cursor + delta))
        self.cursor_var.set("Con trỏ  " + format_timecode(self.cursor))
        self._draw_overlay()
        return "break"

    def _nudge_end(self, delta: float) -> str:
        if self._typing() or not self.media:
            return ""
        self._set_selection(self.sel_start, self.sel_end + delta)
        return "break"

    def _sync_time_fields(self) -> None:
        self._updating_entries = True
        self.start_var.set(format_timecode(self.sel_start))
        self.end_var.set(format_timecode(self.sel_end))
        self.length_var.set(format_duration(self.sel_end - self.sel_start))
        self._updating_entries = False

    def _apply_time_entries(self, _event: tk.Event | None = None) -> str:
        if self._updating_entries or not self.media:
            return ""
        start = parse_timecode(self.start_var.get())
        end = parse_timecode(self.end_var.get())
        if start is None or end is None or start >= end:
            self.set_status(
                "Mốc thời gian không hợp lệ. Dùng dạng 00:00:00.000.",
                error=True,
            )
            self._sync_time_fields()
            return "break"
        if end > self.media.duration:
            self.set_status("Mốc kết thúc vượt quá thời lượng tệp.", error=True)
            self._sync_time_fields()
            return "break"
        self._set_selection(start, end)
        self.set_status("Đã cập nhật đoạn cắt.")
        return "break"

    # ------------------------------------------------------------- preview

    def toggle_preview(self) -> None:
        if self.preview_proc:
            self.stop_preview()
            return
        if not self.media:
            return
        if not FFPLAY:
            messagebox.showerror(
                "Thiếu ffplay",
                "Không tìm thấy ffplay trong PATH.\n"
                "Cài FFmpeg hoặc thêm ffplay vào PATH để nghe thử.",
            )
            return
        if self.sel_end - self.sel_start < 0.02:
            self.set_status("Đoạn chọn quá ngắn để phát.", error=True)
            return
        duration = self.sel_end - self.sel_start
        cmd = [
            FFPLAY, "-nodisp", "-autoexit", "-loglevel", "error",
            "-ss", f"{self.sel_start:.6f}", "-t", f"{duration:.6f}",
            self.media.path,
        ]
        try:
            self.preview_proc = subprocess.Popen(
                cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        except OSError as exc:
            self.preview_proc = None
            messagebox.showerror("Không phát được", str(exc))
            return
        self.play_btn.configure(text="■ Dừng")
        self.set_status(f"Đang phát đoạn {format_duration(duration)}…")
        self._poll_preview()

    def _poll_preview(self) -> None:
        proc = self.preview_proc
        if proc is None:
            return
        if proc.poll() is not None:
            self.preview_proc = None
            self.play_btn.configure(text="▶ Nghe thử")
            self.set_status("Sẵn sàng.")
        else:
            self.root.after(200, self._poll_preview)

    def stop_preview(self) -> None:
        proc = self.preview_proc
        self.preview_proc = None
        if proc is not None:
            try:
                proc.terminate()
                proc.wait(timeout=1)
            except Exception:  # noqa: BLE001 - tiến trình có thể đã thoát
                try:
                    proc.kill()
                except Exception:  # noqa: BLE001
                    pass
        if hasattr(self, "play_btn"):
            self.play_btn.configure(text="▶ Nghe thử")

    # -------------------------------------------------------------- export

    def _on_format_change(self, _event: tk.Event | None = None) -> None:
        self.bitrate_cb.configure(
            state="disabled" if self.format_var.get() in LOSSLESS_OR_FIXED else "readonly"
        )

    def export(self) -> None:
        if self.busy or not self.media:
            return
        if self.sel_end - self.sel_start < 0.02:
            self.set_status("Đoạn chọn quá ngắn để xuất.", error=True)
            return
        fmt = self.format_var.get()
        extension = FORMATS[fmt]
        default_name = Path(self.media.path).stem + "_cut" + extension
        path = filedialog.asksaveasfilename(
            title="Xuất đoạn âm thanh",
            initialdir=os.path.dirname(self.media.path) or self._last_dir,
            initialfile=default_name,
            defaultextension=extension,
            filetypes=[(fmt, "*" + extension), ("Tất cả tệp", "*.*")],
        )
        if not path:
            return
        if os.path.abspath(path) == os.path.abspath(self.media.path):
            messagebox.showerror("Không thể ghi đè",
                                 "Hãy chọn tên khác để không ghi đè tệp gốc.")
            return
        if not path.lower().endswith(extension):
            path += extension
        self._set_busy(True)
        self.set_status(f"Đang xuất {os.path.basename(path)}…")
        threading.Thread(
            target=self._export_worker,
            args=(path, fmt, self.bitrate_var.get(), self.fade_var.get(),
                  self.sel_start, self.sel_end),
            daemon=True,
        ).start()

    def _build_export_cmd(self, path: str, fmt: str, bitrate: str,
                          fade: bool, start: float, end: float) -> list[str]:
        if not self.media:
            raise RuntimeError("Chưa mở tệp.")
        duration = end - start
        cmd = [
            FFMPEG, "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{start:.6f}", "-i", self.media.path,
            "-t", f"{duration:.6f}", "-map", "0:a:0", "-vn",
            "-map_metadata", "0",
        ]
        if fade and duration > 0.12:
            fade_time = min(0.05, duration / 2)
            fade_out_at = max(0.0, duration - fade_time)
            cmd += ["-af",
                    f"afade=t=in:st=0:d={fade_time:.4f},"
                    f"afade=t=out:st={fade_out_at:.6f}:d={fade_time:.4f}"]
        if fmt == "MP3":
            cmd += ["-c:a", "libmp3lame", "-b:a", bitrate]
        elif fmt == "WAV":
            cmd += ["-c:a", "pcm_s16le"]
        elif fmt == "OGG":
            cmd += ["-c:a", "libvorbis", "-q:a", "5"]
        elif fmt == "FLAC":
            cmd += ["-c:a", "flac", "-compression_level", "8"]
        elif fmt == "M4A":
            cmd += ["-c:a", "aac", "-b:a", bitrate, "-movflags", "+faststart"]
        elif fmt == "Opus":
            cmd += ["-c:a", "libopus", "-b:a", bitrate]
        else:
            raise RuntimeError("Định dạng xuất không hợp lệ.")
        cmd.append(path)
        return cmd

    def _export_worker(self, path: str, fmt: str, bitrate: str, fade: bool,
                       start: float, end: float) -> None:
        try:
            cmd = self._build_export_cmd(path, fmt, bitrate, fade, start, end)
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                message = result.stderr.decode("utf-8", "replace").strip()
                raise RuntimeError(message or "FFmpeg xuất tệp thất bại.")
            size = os.path.getsize(path)
            self.root.after(0, lambda: self._finish_export(path, size, None))
        except Exception as exc:  # noqa: BLE001 - hiển thị lỗi cho người dùng
            self.root.after(0, lambda err=exc: self._finish_export(path, 0, err))

    def _finish_export(self, path: str, size: int, error: Exception | None) -> None:
        self._set_busy(False)
        if error:
            self.set_status("Xuất tệp thất bại.", error=True)
            messagebox.showerror("Xuất tệp thất bại", str(error))
            return
        self.set_status(f"Đã xuất {os.path.basename(path)} · {format_size(size)}")
        messagebox.showinfo(
            "Xuất tệp thành công",
            f"Đã lưu:\n{path}\n\nDung lượng: {format_size(size)}",
        )

    # --------------------------------------------------------------- close

    def _on_close(self) -> None:
        self.stop_preview()
        self.root.destroy()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Cắt âm thanh bằng Tkinter và FFmpeg.")
    parser.add_argument("file", nargs="?", help="Tệp âm thanh cần mở ngay")
    parser.add_argument(
        "--probe", metavar="FILE", help="Chỉ đọc thông tin tệp rồi thoát"
    )
    parser.add_argument("--check", action="store_true", help="Kiểm tra ffmpeg/ffprobe/ffplay")
    args = parser.parse_args(argv)

    tools = {"ffmpeg": FFMPEG, "ffprobe": FFPROBE, "ffplay": FFPLAY}
    if args.check:
        for name, path in tools.items():
            print(f"{name}: {path or 'KHÔNG TÌM THẤY'}")
        return 0 if all(tools.values()) else 1

    if not FFMPEG or not FFPROBE:
        message = ("Thiếu FFmpeg/ffprobe trong PATH.\n"
                   "Cài FFmpeg rồi mở lại công cụ.\n"
                   "Linux: sudo apt install ffmpeg\n"
                   "Windows: thêm thư mục bin của FFmpeg vào PATH.")
        print(message, file=sys.stderr)
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Thiếu FFmpeg", message)
            root.destroy()
        except tk.TclError:
            pass
        return 1

    if args.probe:
        try:
            info = probe_media(args.probe)
        except Exception as exc:  # noqa: BLE001
            print(f"Lỗi: {exc}", file=sys.stderr)
            return 1
        print(json.dumps(asdict(info), ensure_ascii=False, indent=2))
        return 0

    try:
        root = tk.Tk()
    except tk.TclError as exc:
        print(f"Không mở được giao diện Tkinter: {exc}", file=sys.stderr)
        return 1
    app = SoundCutterApp(root)
    if args.file:
        root.after(120, lambda: app.load_file(os.path.abspath(args.file)))
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
