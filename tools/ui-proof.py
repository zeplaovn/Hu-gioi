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
    ("sect-dungeons", "sect", "dungeons"),
    ("world-quests", "quests", None),
    ("sect-missions", "sect", "missions"),
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



def mock_ci_chat(page, url):
    """Only for browser CI: emulate Edge chat on a localhost test server.

    Node's /api/v1 intentionally does not implement chat, while production
    Supabase Edge does. Never use this fixture on a non-loopback target.
    """
    parsed = urlsplit(url)
    assert parsed.scheme == 'http' and parsed.hostname == '127.0.0.1' and parsed.port in (8000, 8001)

    def respond(route):
        request = route.request
        auth = request.headers.get('authorization', '')
        headers = {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}
        if request.method != 'POST' or not auth.startswith('Bearer ci-access-token-'):
            return route.fulfill(status=401, headers=headers, body='{"error":{"code":"UNAUTHENTICATED"}}')
        try:
            payload = request.post_data_json or {}
        except ValueError:
            return route.fulfill(status=400, headers=headers, body='{"error":{"code":"INVALID_JSON"}}')
        channel = payload.get('channel') or 'world'
        if channel not in ('world', 'sect', 'dao_huu', 'dao_lu'):
            return route.fulfill(status=422, headers=headers, body='{"error":{"code":"INVALID_CHANNEL"}}')
        path = urlsplit(request.url).path
        if path.endswith('/social/chat/connect'):
            result = {
                'self': {'id': '11111111-2222-4333-8444-555555555555', 'name': 'CI Đạo Hữu'},
                'messages': [], 'cursor': '0', 'online': 1, 'channel': channel
            }
        elif path.endswith('/social/chat/poll'):
            result = {'messages': [], 'cursor': '0', 'online': 1, 'channel': channel, 'hasMore': False}
        elif path.endswith('/social/chat/leave'):
            result = {'left': True}
        else:
            return route.fulfill(status=404, headers=headers, body='{"error":{"code":"NOT_FOUND"}}')
        route.fulfill(status=200, headers=headers, body=json.dumps(result, ensure_ascii=False))

    page.route('**/api/v1/social/chat/**', respond)


def enter_game(page, url, folder=None, name=None, outcome=None):
    # Dùng tap thật cho iOS giả lập; các bài proof khác vẫn giữ hành vi cũ.
    touch = name in ("after_390x844", "webkit_390x844", "release_390x844")
    def activate(locator):
        locator.tap() if touch else locator.click()
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.locator('#loading').wait_for(state='hidden', timeout=45000)
    # Màn Tiên Tịch dùng tài khoản và máy chủ giả lập của CI.
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
            activate(page.locator("#authSubmit"))
            page.locator("#welcome").wait_for(state="visible", timeout=20000)
    # Every viewport creates a different character in the shared in-memory CI server.
    # Avoid NAME_TAKEN (409) without changing gameplay name uniqueness.
    viewport = name.split("_", 1)[-1] if name else ""
    test_names = {
        "1366x768": "Vân Tiêu",
        "390x844": "Vân Lam",
        "360x640": "Vân Hàn",
        "844x390": "Vân Phong",
    }
    page.locator("#nameInput").fill("Vân Băng" if name == "webkit_390x844" else test_names.get(viewport, "Vân Tiêu"))
    for _ in range(8):
        activate(page.locator('#statGrid .stat-pm[data-delta="1"]:not([disabled])').first)
    activate(page.locator("#startNew"))
    page.locator('#gameLoading').wait_for(state='hidden', timeout=45000)
    # Không dựa vào thời gian chờ cố định: mở đầu được tạo ngay sau loading.
    intro = page.locator('#storyIntro')
    intro.wait_for(state='visible', timeout=15000)
    # Intro tự chạy qua cả năm cảnh, không còn phím hoặc thao tác bỏ qua.
    intro.wait_for(state='detached', timeout=120000)
    # Hướng dẫn tân thủ hiện là bảng đồng hành, không phải lớp tutorial cũ.
    guide = page.locator('#noviceGuide')
    guide.wait_for(state='visible', timeout=15000)
    activate(page.locator('#noviceGuideHide'))
    guide.wait_for(state='detached', timeout=15000)
    page.locator("#menu button").first.wait_for(state="visible", timeout=25000)

def open_page(page, section):
    # Trang khác che menu chính; trở về sân khấu trước khi mở trang kế tiếp.
    current = page.locator(f'.win.desktop-window[data-window="{section}"]')
    if current.count():
        if current.first.is_visible():
            page.evaluate("(id) => window.HU_UI.windows.focus(id)", section)
        else:
            page.locator(f'#windowTaskbar [data-task-window="{section}"]').first.click()
    else:
        previous = page.locator('.win.page .page-back')
        if previous.count():
            previous.first.click()
        page.locator(f'#menu button[data-window="{section}"]').click()
    current.first.wait_for(state="visible", timeout=15000)

def set_tab(page, section, tab):
    if tab is None:
        return
    if section == 'character' and tab == 'skills':
        # Công pháp đã chuyển từ tab riêng vào mục mở rộng của trang Đạo thể.
        page.locator('.win.desktop-window[data-window="character"] .tabbar [data-tab="stats"]').first.click()
        details = page.locator('.win.desktop-window[data-window="character"] .char-techniques')
        if details.get_attribute('open') is None:
            details.locator('summary').click()
        return
    selector = (f'[data-act="sectPanel"][data-panel="{tab}"]' if section == 'sect'
                else f'.tabbar [data-tab="{tab}"]')
    btn = page.locator(f'.win.desktop-window[data-window="{section}"] {selector}')
    btn.first.click()
    page.wait_for_timeout(250)

def snap(page, folder, prefix, name, where="top"):
    area = page.locator(".win.desktop-window.top .win-body")
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
    if page.evaluate("() => window.HU_UI?.release?.chat === false"):
        assert trigger.is_hidden(), "Chat bubble is visible in the limited release"
        assert page.locator("#chatBubblePanel").is_hidden(), "Chat panel is visible"
        menu_entry = page.locator('#menu [data-window="chat"]')
        assert not menu_entry.count() or menu_entry.first.is_hidden(), "Chat menu is visible"
        outcome["chat_hidden_for_release"] = True
        return
    # Launcher hiện mở cửa sổ desktop Truyền âm, không mở chatBubblePanel
    # legacy; cùng contract cho cả BEFORE/AFTER.
    trigger.wait_for(state="visible", timeout=15000)
    trigger.click()
    win = page.locator('.win.desktop-window[data-window="chat"]')
    win.wait_for(state="visible", timeout=15000)
    assert win.locator("#chatChannels").is_visible(), "Thiếu bốn kênh chat"
    assert win.locator('#chatChannels [data-chat-channel="world"]').count() == 1
    if name.startswith("after_") or name.startswith("webkit_"):
        assert win.locator(".chat-panel").is_visible(), "Chưa dựng giao diện messenger"
        assert win.locator("#chatInput").is_visible(), "Ô soạn chat bị khuất trong khung mobile"
        rect = win.evaluate("""el => {
          const panel = el.querySelector('.chat-panel').getBoundingClientRect();
          const feed = el.querySelector('.chat-transcript').getBoundingClientRect();
          const composer = el.querySelector('.chat-form').getBoundingClientRect();
          return { feedH: feed.height, gap: composer.top - feed.bottom,
            composerBottom: composer.bottom, panelBottom: panel.bottom };
        }""")
        assert rect["feedH"] >= 54, "Vùng tin nhắn quá nhỏ"
        assert abs(rect["gap"]) < 5, "Transcript không sát ô soạn chat"
        assert rect["composerBottom"] <= rect["panelBottom"] + 4, "Ô soạn bị cắt khuất"
        outcome["chat_composer_fits_window"] = True
    win.locator('[data-chat-channel="journal"]').click()
    assert win.locator('#chatJournal').is_visible(), "Nhật ký trong chat không hiển thị"
    assert win.locator('#chatForm').is_hidden(), "Ô soạn vẫn hiện ở tab nhật ký"
    win.locator('[data-chat-channel="world"]').click()
    outcome["chat_journal"] = True
    outcome["screenshots"].append(snap(page, folder, name, "chat-open"))
    trigger.click()
    win.wait_for(state="detached", timeout=15000)
    trigger.click()
    win.wait_for(state="visible", timeout=15000)
    win.locator(".win-close").click()
    assert win.count() == 0, "Cửa sổ chat vẫn tồn tại sau khi đóng"
    assert trigger.is_visible(), "Nút mở Truyền âm không trở lại"
    outcome["chat_icon_persistent"] = True
    outcome["chat_toggle"] = True

def run_set(browser, folder, name, url, width, height, mobile):
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        is_mobile=mobile, has_touch=mobile,
        device_scale_factor=1, reduced_motion="reduce",
    )
    page = ctx.new_page()
    if name == "after_390x844":
        # Simulate old iOS/WebKit: features missing in Safari 15.x. Before branch
        # keeps the baseline untouched; only the patched mobile flow is tested.
        page.add_init_script("""
            Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
            Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
        """)
    mock_ci_config(page, url)
    mock_supabase(page, name)  # identical auth/consent fixture for before and after
    mock_ci_chat(page, url)  # Edge-only chat is mocked only in browser CI
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
        if name == "after_390x844":
            assert page.evaluate("typeof AbortSignal.timeout") == "undefined"
            assert page.evaluate("typeof crypto.randomUUID") == "undefined"
            # Touch navigation and a genuine server-authoritative game command.
            page.locator('#menu button[data-window="world"]').tap()
            world = page.locator('.win.desktop-window[data-window="world"]')
            world.wait_for(state="visible", timeout=15000)
            world.locator('[data-tab="shop"]').first.tap()
            world.locator('.page-back').tap()
            assert world.count() == 0, "Touch không đóng được cửa sổ"
            rev = page.evaluate("""async () => {
                const ui = window.HU_UI, old = ui.session.revision;
                await ui.command('buy', { code: 'HERB-001' });
                return { before: old, after: ui.session.revision };
            }""")
            assert rev["after"] == rev["before"] + 1, "Lệnh mobile không được server xác nhận"
            outcome["mobile_touch_and_command"] = True
        # Capture the loaded game before opening modal pages or chat fixtures.
        outcome["screenshots"].append(snap(page, folder, name, "game-main"))
        verify_bubble(page, folder, name, outcome)
        if name.startswith('after_'):
            if not page.evaluate("() => window.HU_UI.release.chat"):
                verify_log_float(page, folder, name, outcome)
            assert page.locator('#menu [data-window="settings"]').count() == 0, "Menu Cài đặt vẫn hiện"
            assert page.locator('.status-settings').count() == 1, "Nút Cài đặt ở thanh trạng thái bị mất"
        for key, section, tab in CASES:
            if section:
                open_page(page, section)
                set_tab(page, section, tab)
            else:
                # Không tự đóng cửa sổ ở case idle; chụp nguyên sân khấu hiện hành.
                pass
            outcome["screenshots"].append(snap(page, folder, name, key))
            if section in ("world", "character", "craft", "settings"):
                outcome["screenshots"].append(snap(page, folder, name, key, "bottom"))
        # Thanh menu thứ năm trở đi được phép cuộn, và Menu không dùng dấu X.
        page.evaluate("() => window.HU_UI.windows.closeAll()")
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

def run_webkit_mobile(playwright, url, folder):
    """WebKit touch smoke: iOS engine under localhost with old Safari APIs disabled.

    Not a physical iPhone: no production network calls; this catches Safari
    DOM/touch regressions that Chromium mobile emulation cannot cover.
    """
    parsed = urlsplit(url)
    assert parsed.scheme == "http" and parsed.hostname == "127.0.0.1" and parsed.port == 8001
    outcome = {"url": url, "viewport": "WebKit 390x844", "screenshots": [],
               "errors": [], "gameplay_reached": False}
    browser = playwright.webkit.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844},
                              is_mobile=True, has_touch=True, device_scale_factor=1,
                              reduced_motion="reduce")
    page = ctx.new_page()
    page.add_init_script("""
        Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
        Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
    """)
    mock_ci_config(page, url)
    mock_supabase(page, "webkit_390x844")
    mock_ci_chat(page, url)
    page.on("pageerror", lambda error: outcome["errors"].append("pageerror: " + str(error)))
    try:
        enter_game(page, url, folder, "webkit_390x844", outcome)
        assert page.locator("#game").is_visible()
        assert page.evaluate("typeof AbortSignal.timeout") == "undefined"
        assert page.evaluate("typeof crypto.randomUUID") == "undefined"
        outcome["gameplay_reached"] = True
        page.locator('#menu button[data-window="world"]').tap()
        world = page.locator('.win.desktop-window[data-window="world"]')
        world.wait_for(state="visible", timeout=15000)
        world.locator('[data-tab="shop"]').first.tap()
        world.locator('.page-back').tap()
        assert world.count() == 0, "WebKit touch không đóng được cửa sổ"
        revisions = page.evaluate("""async () => {
            const ui = window.HU_UI, before = ui.session.revision;
            await ui.command('buy', { code: 'HERB-001' });
            return { before, after: ui.session.revision };
        }""")
        assert revisions["after"] == revisions["before"] + 1, "WebKit không ghi được lệnh gameplay"
        outcome["webkit_touch_and_command"] = True
        outcome["screenshots"].append(snap(page, folder, "webkit_390x844", "mobile-play"))
    except Exception as e:
        outcome["exception"] = str(e)
        try:
            outcome["screenshots"].append(snap(page, folder, "webkit_390x844", "failure"))
        except Exception:
            pass
    finally:
        ctx.close()
        browser.close()
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
        # Kiểm thử WebKit riêng để bắt lỗi thao tác chạm/iPhone ngoài Chromium.
        report.append(run_webkit_mobile(p, args.after, folder))
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
