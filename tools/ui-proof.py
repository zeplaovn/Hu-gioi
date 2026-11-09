#!/usr/bin/env python3
"""Ảnh đối chiếu UX Hư Giới (không cài thư viện vào game).
Chạy bằng Playwright Python trong GitHub Actions; dùng server tĩnh cho trước/sau.
"""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

CASES = [
    ("idle", None, None),
    ("world-map", "world", "map"),
    ("world-dungeons", "world", "dungeons"),
    ("world-quests", "world", "quests"),
    ("world-sect", "world", "sect"),
    ("world-shop", "world", "shop"),
    ("world-auction", "world", "auction"),
    ("character-stats", "character", "stats"),
    ("character-skills", "character", "skills"),
    ("character-roots", "character", "roots"),
    ("character-bag", "character", "bag"),
    ("craft-dan", "craft", "dan"),
    ("craft-khi", "craft", "khi"),
    ("craft-dien", "craft", "dien"),
]

def enter_game(page, url):
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(13500)
    page.locator("#nameInput").fill("Vân Tiêu")
    for _ in range(8):
        page.locator('#statGrid .stat-pm[data-delta="1"]:not([disabled])').first.click()
    page.locator("#startNew").click()
    page.wait_for_timeout(15000)
    page.keyboard.press("Escape")
    page.wait_for_timeout(2500)
    if page.locator("#tutorialSkip").is_visible():
        page.locator("#tutorialSkip").click()
    else:
        page.keyboard.press("Escape")
    page.locator("#menu button").first.wait_for(state="visible", timeout=25000)

def open_page(page, section):
    current = page.locator(".win.page")
    if current.count():
        btn = current.last.locator(f'[data-open-page="{section}"]')
        if btn.count() and btn.first.is_visible():
            btn.first.click()
            return
        page.locator(".win.page .page-back").last.click()
    page.locator(f'#menu button[data-window="{section}"]').click()

def set_tab(page, section, tab):
    btn = page.locator(f'.win.page[data-window="{section}"] .tabbar [data-tab="{tab}"]')
    btn.first.click()
    page.wait_for_timeout(250)

def snap(page, folder, prefix, name, where="top"):
    area = page.locator(".win.page .win-body")
    if area.count():
        area.last.evaluate("(element, where) => { element.scrollTop = where === 'bottom' ? element.scrollHeight : 0; }", where)
    page.wait_for_timeout(200)
    file = folder / f"{prefix}_{name}{'-bottom' if where == 'bottom' else ''}.png"
    page.screenshot(path=str(file), animations="disabled")
    return str(file)

def verify_log_float(page, folder, name, outcome):
    panel = page.locator("#logPanel")
    float_btn = page.locator("#logFloatToggle")
    collapse_btn = page.locator("#logToggle")
    assert float_btn.is_visible(), "Thiếu nút đưa nhật ký nổi"
    float_btn.click()
    assert "log-floating" in (panel.get_attribute("class") or ""), "Nhật ký không nổi"
    assert float_btn.get_attribute("aria-pressed") == "true"
    outcome["screenshots"].append(snap(page, folder, name, "log-floating"))
    header = page.locator("#logPanel .log-head")
    rect = header.bounding_box()
    assert rect, "Không tìm thấy vùng kéo nhật ký"
    page.mouse.move(rect["x"] + 35, rect["y"] + 18)
    page.mouse.down()
    page.mouse.move(rect["x"] + 57, rect["y"] - 24, steps=5)
    page.mouse.up()
    pos = panel.bounding_box()
    assert pos and pos["x"] >= 0 and pos["y"] >= 0, "Nhật ký bị kéo khỏi màn hình"
    collapse_btn.click()
    assert "collapsed" in (panel.get_attribute("class") or ""), "Không thu gọn được"
    assert collapse_btn.get_attribute("aria-expanded") == "false"
    outcome["screenshots"].append(snap(page, folder, name, "log-minimized"))
    collapse_btn.click()
    assert "collapsed" not in (panel.get_attribute("class") or ""), "Không mở rộng được"
    float_btn.click()
    assert "log-floating" not in (panel.get_attribute("class") or ""), "Không ghim lại được"
    assert float_btn.get_attribute("aria-pressed") == "false"
    outcome["log_float_toggle_drag"] = True


def verify_bubble(page, folder, name, outcome):
    trigger = page.locator("#chatBubble .chat-bubble-btn")
    trigger.wait_for(state="visible", timeout=15000)
    trigger.click()
    assert page.locator("#chatBubblePanel").is_visible(), "Bảng chat không mở"
    assert trigger.is_visible(), "Icon chat biến mất khi mở bảng chat"
    assert trigger.get_attribute("aria-expanded") == "true"
    assert page.locator("#chatBubble .chat-bubble-icon").is_visible(), "Ảnh icon chat bị ẩn"
    assert trigger.evaluate("""el => {
      const r = el.getBoundingClientRect();
      const elAtCenter = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return el.contains(elAtCenter);
    }"""), "Bảng chat hoặc lớp khác che icon chat"
    if name.startswith("after_"):
        outcome["screenshots"].append(snap(page, folder, name, "chat-open"))
    # Bấm lại đúng icon chat: phải đóng được, không cần tìm nút X.
    trigger.click()
    assert page.locator("#chatBubblePanel").is_hidden(), "Bảng chat không đóng qua icon"
    assert trigger.is_visible(), "Icon chat mất sau khi đóng"
    outcome["chat_icon_persistent"] = True
    outcome["chat_toggle"] = True

def run_set(browser, folder, name, url, width, height, mobile):
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        is_mobile=mobile, has_touch=mobile,
        device_scale_factor=1, reduced_motion="reduce",
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append("pageerror: " + str(error)))
    page.on("console", lambda msg: errors.append("console.error: " + msg.text) if msg.type == "error" and "501" not in msg.text else None)
    outcome = {"url": url, "viewport": f"{width}x{height}", "screenshots": [], "errors": errors}
    try:
        enter_game(page, url)
        verify_bubble(page, folder, name, outcome)
        if name.startswith('after_'):
            verify_log_float(page, folder, name, outcome)
            assert page.locator('#menu [data-window="settings"]').count() == 0, "Menu Cài đặt vẫn hiện"
            assert page.locator('.status-settings').count() == 0, "Nút Cài đặt ở thanh trạng thái vẫn hiện"
        for key, section, tab in CASES:
            if section:
                open_page(page, section)
                set_tab(page, section, tab)
            else:
                current = page.locator(".win.page .page-back")
                if current.count():
                    current.last.click()
            outcome["screenshots"].append(snap(page, folder, name, key))
            if section in ("world", "character", "craft", "settings"):
                outcome["screenshots"].append(snap(page, folder, name, key, "bottom"))
        # Thanh menu thứ năm trở đi được phép cuộn, và Menu không dùng dấu X.
        page.locator(".win.page .page-back").last.click()
        outcome["screenshots"].append(snap(page, folder, name, "menu"))
        if name.startswith("after_"):
            assert page.locator("#menuToggle .ico").inner_text().strip() != "✕", "Nút Menu còn hiện X"
            issues = page.locator(".action-group > .btn").evaluate_all(
                "(buttons) => buttons.filter(b => b.scrollWidth > b.clientWidth + 2).map(b => b.textContent.trim())"
            )
            outcome["overflow_buttons"] = issues
    except Exception as exc:
        outcome["exception"] = str(exc)
        try:
            outcome["screenshots"].append(snap(page, folder, name, "failure"))
        except Exception:
            pass
    finally:
        ctx.close()
    return outcome

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", required=True)
    parser.add_argument("--after", required=True)
    parser.add_argument("--output", default="ui-proof")
    args = parser.parse_args()
    folder = Path(args.output)
    folder.mkdir(parents=True, exist_ok=True)
    report = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        for width, height in [(1366, 768), (390, 844), (360, 640), (844, 390)]:
            for label, url in (("before", args.before), ("after", args.after)):
                report.append(run_set(browser, folder, f"{label}_{width}x{height}", url, width, height, width < 900))
        # Smoke test file:// không dùng mạng, chỉ kiểm tra nạp script/DOM.
        file_ctx = browser.new_context()
        file_page = file_ctx.new_page()
        file_errors = []
        file_page.on("pageerror", lambda e: file_errors.append(str(e)))
        try:
            uri = Path("index.html").resolve().as_uri()
            file_page.goto(uri, wait_until="domcontentloaded", timeout=45000)
            file_page.wait_for_timeout(14000)
            report.append({"file_url": uri, "errors": file_errors, "welcome": file_page.locator("#welcome").count() > 0})
            file_page.screenshot(path=str(folder / "file-smoke.png"))
        except Exception as e:
            report.append({"file_error": str(e), "errors": file_errors})
        file_ctx.close()
        browser.close()
    (folder / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    failures = [r for r in report if r.get("exception") or r.get("file_error") or r.get("errors") or (r.get("chat_toggle") is False)]
    print(json.dumps({"screenshots": sum(len(r.get("screenshots", [])) for r in report), "failures": failures}, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
