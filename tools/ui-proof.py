#!/usr/bin/env python3
"""Ảnh đối chiếu UX Hư Giới (không cài thư viện vào game).
Chạy bằng Playwright Python trong GitHub Actions; dùng server tĩnh cho trước/sau.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
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

def mock_ci_config(page, url):
    """Only in Playwright: use this page's CI server for game API calls.

    Cloudflare/Supabase production config is not changed, fetched, or invoked.
    Registration happens before page.goto for both before and after contexts.
    """
    parsed = urlsplit(url)
    assert parsed.scheme == 'http' and parsed.hostname == '127.0.0.1' and parsed.port in (8000, 8001), (
        f"Refusing non-local test target: {url}"
    )
    api = f"{parsed.scheme}://{parsed.netloc}/api/v1"
    config = (
        "(function (root) { 'use strict';"
        f"root.HU_API_BASE = {json.dumps(api)};"
        "root.HU_AUTH_MODE = 'direct';"
        "})(typeof window !== 'undefined' ? window : globalThis);"
    )
    page.route('**/client/config.js', lambda route: route.fulfill(
        status=200,
        headers={'Content-Type': 'application/javascript; charset=utf-8',
                 'Cache-Control': 'no-store'},
        body=config
    ))


def is_game_api(url):
    path = urlsplit(url).path
    return any(path == prefix or path.startswith(prefix + '/') for prefix in (
        '/functions/v1/api', '/api/v1'
    ))


def mock_supabase(page, name):
    # Browser-only CI fixture. External Supabase Auth is never called with real accounts.
    token = 'ci-access-token-' + ''.join(c if c.isalnum() or c in '_-' else '_' for c in name)
    user_id = '11111111-2222-4333-8444-555555555555'
    def respond(route):
        request = route.request
        origin = request.headers.get('origin', 'http://127.0.0.1:8001')
        headers = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
        if request.method == 'OPTIONS':
            return route.fulfill(status=204, headers=headers, body='')
        pathname = request.url.split('?', 1)[0]
        if pathname.endswith('/auth/v1/token'):
            body = {'access_token': token, 'refresh_token': 'ci-refresh', 'expires_in': 3600}
        elif pathname.endswith('/auth/v1/user'):
            body = {'id': user_id, 'email': 'ci@example.invalid'}
        elif pathname.endswith('/rest/v1/policy_acceptances'):
            body = [{'policy_kind': 'privacy'}, {'policy_kind': 'release_terms'}]
        else:
            return route.fulfill(status=404, headers=headers, body='{"message":"Unexpected test request"}')
        route.fulfill(status=200, headers=headers, body=json.dumps(body))
    # Intercept all project Auth/consent traffic; never access real Supabase.
    page.route('**/*.supabase.co/**', lambda route: route.fulfill(
        status=404, content_type='application/json',
        body='{"message":"Unexpected Supabase host in browser-proof"}'
    ))
    page.route('https://rvrwfeblishqadkpzspb.supabase.co/**', respond)


def enter_game(page, url, folder=None, name=None, outcome=None):
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.locator('#loading').wait_for(state='hidden', timeout=45000)
    # Màn Tiên Tịch: chụp Đăng nhập/Đăng ký và vào chế độ offline để kiểm luồng game cũ.
    if page.locator("#authGate").count() and page.locator("#authGate").is_visible():
        if folder is not None and outcome is not None:
            outcome["screenshots"].append(snap(page, folder, name, "auth-login"))
            page.locator('[data-auth-view="signup"]').click()
            outcome["screenshots"].append(snap(page, folder, name, "auth-signup"))
        if page.locator("#authGuest").count():
            if page.locator("#authGuestRelease").count():
                page.locator("#authGuestRelease").check()
            page.locator("#authGuest").click()
        else:
            page.locator('[data-auth-view="login"]').click()
            page.locator("#authEmail").fill("ci@example.invalid")
            page.locator("#authPassword").fill("ci-test-password-1234")
            page.locator("#authSubmit").click()
            page.locator("#welcome").wait_for(state="visible", timeout=20000)
    # One unique character per viewport on each in-memory CI server.
    # Both before/after use the same name for like-for-like visual comparison.
    page.locator("#nameInput").fill("Vân " + name.split("_", 1)[-1])
    for _ in range(8):
        page.locator('#statGrid .stat-pm[data-delta="1"]:not([disabled])').first.click()
    page.locator("#startNew").click()
    page.locator('#gameLoading').wait_for(state='hidden', timeout=45000)
    # Không dựa vào thời gian chờ cố định: mở đầu được tạo ngay sau loading.
    intro = page.locator('#storyIntro')
    intro.wait_for(state='visible', timeout=15000)
    intro.press('Escape')
    intro.wait_for(state='detached', timeout=15000)
    # Nhân vật được tạo sau intro; lúc này tutorial mới khởi tạo.
    tutorial = page.locator('#tutorialLayer')
    tutorial.wait_for(state='visible', timeout=15000)
    page.locator('#tutorialSkip').click()
    tutorial.wait_for(state='detached', timeout=15000)
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
    assert collapse_btn.evaluate(
        "el => getComputedStyle(el, '::after').backgroundImage === 'none'"
    ), "Chuông chưa ẩn sau khi mở thông báo"
    float_btn.click()
    assert "log-floating" not in (panel.get_attribute("class") or ""), "Không ghim lại được"
    assert float_btn.get_attribute("aria-pressed") == "false"
    outcome["log_float_toggle_drag"] = True


def verify_bubble(page, folder, name, outcome):
    trigger = page.locator("#chatBubble .chat-bubble-btn")
    trigger.wait_for(state="visible", timeout=15000)
    trigger.click()
    assert page.locator("#chatBubblePanel").is_visible(), "Bảng chat không mở"
    if name.startswith("after_"):
        assert trigger.is_hidden(), "Icon chat phải ẩn khi đang mở cửa sổ"
        assert trigger.get_attribute("aria-expanded") == "true"
        assert page.locator("#chatBubble .chat-bubble-icon").is_hidden(), "Hình icon chat chưa ẩn"
        outcome["screenshots"].append(snap(page, folder, name, "chat-open"))
        page.locator(".chat-bubble-close").click()
        assert page.locator("#chatBubblePanel").is_hidden(), "Không đóng được bằng nút ×"
        assert trigger.is_visible(), "Icon chat không trở lại sau khi đóng"
        outcome["chat_icon_persistent"] = True
    else:
        page.locator(".chat-bubble-close").click()
        assert page.locator("#chatBubblePanel").is_hidden(), "Bảng chat không đóng"
    outcome["chat_toggle"] = True

def run_set(browser, folder, name, url, width, height, mobile):
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        is_mobile=mobile, has_touch=mobile,
        device_scale_factor=1, reduced_motion="reduce",
    )
    page = ctx.new_page()
    mock_ci_config(page, url)
    mock_supabase(page, name)  # identical auth/consent fixture for before and after
    errors = []
    game_api_responses = []
    game_api_failures = []
    def inspect_game_api_response(res):
        if not is_game_api(res.url):
            return
        game_api_responses.append(f"{res.status} {res.url}")
        if res.status == 404 or res.status >= 500:
            game_api_failures.append(
                f"Unexpected game API HTTP {res.status}: {res.request.method} {res.url}"
            )
    page.on("response", inspect_game_api_response)
    expected_auth_404 = []
    http_404_urls = []
    page.on("response", lambda res: http_404_urls.append(res.url) if res.status == 404 else None)
    page.on("response", lambda res: expected_auth_404.append(res.url)
            if res.status == 404 and res.url.endswith("/api/auth/session") else None)
    page.on("pageerror", lambda error: errors.append("pageerror: " + str(error)))
    page.on("console", lambda msg: errors.append("console.error: " + msg.text) if msg.type == "error" and "501" not in msg.text else None)
    outcome = {"url": url, "viewport": f"{width}x{height}", "screenshots": [], "errors": errors, "http_404_urls": http_404_urls,
               "game_api_responses": game_api_responses, "game_api_failures": game_api_failures,
               "gameplay_reached": False}
    try:
        enter_game(page, url, folder, name, outcome)
        assert page.locator('#game').is_visible(), f"{name}: game main screen #game is not visible"
        assert page.locator('#menu button').first.is_visible(), f"{name}: game main menu not visible"
        outcome["gameplay_reached"] = True
        outcome["screenshots"].append(snap(page, folder, name, "game-main"))
        chat_enabled = bool(page.evaluate("Boolean(window.HU_UI?.release?.chat)"))
        if chat_enabled:
            verify_bubble(page, folder, name, outcome)
        else:
            assert page.locator('#chatBubble').count() == 0, (
                f"{name}: chat bubble must not render when UI.release.chat is false"
            )
            outcome["chat_disabled_as_configured"] = True
        if name.startswith('after_'):
            verify_log_float(page, folder, name, outcome)
            assert page.locator('#menu [data-window="settings"]').count() == 0, "Menu Cài đặt vẫn hiện"
            assert page.locator('.status-settings').count() == 1, "Nút Cài đặt ở thanh trạng thái bị mất"
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
            # Tọa hóa thực: reset ngay cả Thiên mệnh, cài đặt và bản lưu dự phòng.
            if width == 1366 and not name.startswith('after_'):
                page.evaluate("""() => {
                    const ui = window.HU_UI;
                    ui.s().meta.points = 999;
                    ui.s().settings.music = false;
                    ui.s().age = ui.g().maxLife() + 1;
                    ui.s().lastUpdate = Date.now() - 3000;
                }""")
                death = page.locator('[data-act="resetAfterDeath"]')
                death.wait_for(state="visible", timeout=5000)
                outcome["screenshots"].append(snap(page, folder, name, "death"))
                death.click()
                assert page.locator("#welcome").is_visible(), "Tọa hóa không về tạo nhân vật"
                assert page.locator("#game").is_hidden(), "Game vẫn hiện sau tọa hóa"
                assert page.locator("#continueGame").is_hidden(), "Vẫn còn bản lưu sau tọa hóa"
                reset = page.evaluate("""() => ({
                    created: window.HU_UI.s().created,
                    points: window.HU_UI.s().meta.points,
                    music: window.HU_UI.s().settings.music,
                    ready: window.HU_UI.store.ready
                })""")
                assert reset == {"created": False, "points": 0, "music": True, "ready": False}, reset
                outcome["death_reset"] = True
                outcome["screenshots"].append(snap(page, folder, name, "back-to-creation"))
    except Exception as exc:
        outcome["exception"] = str(exc)
        try:
            outcome["screenshots"].append(snap(page, folder, name, "failure"))
        except Exception:
            pass
    finally:
        if game_api_failures:
            outcome['exception'] = (outcome.get('exception', '') +
                '\n' + '; '.join(game_api_failures)).strip()
        # Python http.server không có auth API; bỏ đúng một 404 đã được xác nhận
        # qua response của /api/auth/session, không bỏ qua lỗi file game khác.
        if expected_auth_404:
            for i, err in enumerate(errors):
                if err.startswith("console.error: Failed to load resource:") and "404" in err:
                    errors.pop(i)
                    break
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
        mock_supabase(file_page, 'file_smoke')  # forbid real Supabase even in file:// smoke
        file_errors = []
        file_page.on("pageerror", lambda e: file_errors.append(str(e)))
        try:
            uri = Path("index.html").resolve().as_uri()
            file_page.goto(uri, wait_until="domcontentloaded", timeout=45000)
            file_page.locator('#loading').wait_for(state='hidden', timeout=45000)
            report.append({"file_url": uri, "errors": file_errors, "welcome": file_page.locator("#welcome").count() > 0})
            file_page.screenshot(path=str(folder / "file-smoke.png"))
        except Exception as e:
            report.append({"file_error": str(e), "errors": file_errors})
        file_ctx.close()
        browser.close()
    (folder / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    failures = [r for r in report if r.get("exception") or r.get("file_error") or
                r.get("errors") or r.get("game_api_failures") or
                (r.get("url") and not r.get("gameplay_reached")) or
                (r.get("chat_toggle") is False)]
    print(json.dumps({"screenshots": sum(len(r.get("screenshots", [])) for r in report), "failures": failures}, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
