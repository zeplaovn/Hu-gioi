#!/usr/bin/env python3
"""Real Chromium limited-release smoke. Mock Auth + localhost SQLite API ONLY.

Run with tools/online-ci-server.cjs on localhost:8001. This is deliberately
separate from npm test; never targets Supabase or Cloudflare production.
"""
import argparse
import importlib.util
import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location("hu_ui_proof", Path(__file__).with_name("ui-proof.py"))
proof = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proof)


def snapshot(page):
    return page.evaluate("""() => {
        const s = window.HU_UI.s();
        return {
          created: s.created, dead: !!s.death, qi: s.qi, totalRunExp: s.totalRunExp,
          rate: window.HU_UI.g().rate(), revision: window.HU_UI.session.revision,
          paused: !!window.HU_UI.session.paused, name: s.name
        };
    }""")


def command(page, type_, payload):
    return page.evaluate("(arg) => window.HU_UI.command(arg.type, arg.payload)",
                         {"type": type_, "payload": payload})


def setup_page(browser, url, name, viewport, report):
    context = browser.new_context(viewport=viewport, is_mobile=viewport["width"] < 500,
                                  has_touch=viewport["width"] < 500)
    page = context.new_page()
    proof.mock_ci_config(page, url)
    proof.mock_supabase(page, name)
    report["errors"] = []
    report["network"] = []
    page.on("pageerror", lambda error: report["errors"].append("pageerror: " + str(error)))
    page.on("console", lambda msg: report["errors"].append("console.error: " + msg.text)
            if msg.type == "error" else None)
    page.on("response", lambda response: report["network"].append({
        "status": response.status, "url": response.url
    }) if proof.is_game_api(response.url) else None)
    return context, page


def run(url, folder):
    assert url == "http://127.0.0.1:8001", "Only the local test server is allowed"
    folder.mkdir(parents=True, exist_ok=True)
    report = {"target": url, "desktop": {}, "mobile": {}, "screenshots": [],
              "expected_maintenance": 0, "failure": None}
    start = time.monotonic()

    def shot(page, label):
        path = folder / (label + ".png")
        page.screenshot(path=str(path), animations="disabled", full_page=True)
        report["screenshots"].append(str(path))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        desktop_ctx = mobile_ctx = None
        try:
            d = report["desktop"]
            desktop_ctx, page = setup_page(browser, url, "release_1366x768",
                                            {"width": 1366, "height": 768}, d)
            proof.enter_game(page, url, folder, "release_1366x768", {"screenshots": []})
            shot(page, "01-desktop-game")
            assert page.locator("#game").is_visible(), "Game did not become visible"
            assert page.evaluate("() => !HU_UI.release.chat && !HU_UI.release.ranking")
            assert page.locator("#chatBubble").is_hidden(), "Hidden chat became accessible"
            assert not page.locator('#moreMenu [data-more-go="more:ranking"]').count(), (
                "Hidden ranking is still in moreMenu")
            d["initial"] = snapshot(page)
            # Catch even transient failed-sync toasts which can auto-dismiss
            # before the final snapshot. Only inspect, never modify the UI.
            page.evaluate("""() => {
                window.__hu_sync_toast_errors = [];
                new MutationObserver(() => {
                    for (const toast of document.querySelectorAll('.toast-item.toast-danger')) {
                        const msg = (toast.textContent || '').trim();
                        if (/đồng bộ|synchronize|sync/i.test(msg) &&
                            !window.__hu_sync_toast_errors.includes(msg))
                            window.__hu_sync_toast_errors.push(msg);
                    }
                }).observe(document.body, { childList: true, subtree: true });
            }""")

            # Real server-authoritative commands, with the original client API.
            command(page, "buy", {"code": "HERB-001"})
            command(page, "sell", {"code": "HERB-001"})
            command(page, "absorb", {"index": 0})
            shot(page, "02-buy-sell-absorb")

            # Choose an actual recipe affordable with the character's server state.
            recipe = page.evaluate("""() => {
              const ui=window.HU_UI, s=ui.s(), game=ui.g();
              return window.HU_GAME.ITEMS.filter(x=>x.kind==='PILL'&&x.tier<=s.realm+1)
                .map(x=>{try{return {code:x.code,recipe:game.recipe(x.code)}}
                          catch{return null}})
                .find(x=>x && s.stone>=x.recipe.stone &&
                  Object.entries(x.recipe.herbs).every(([c,n])=>game.ingredientCount(c)>=n))
                ?.code || null;
            }""")
            assert recipe, "No alchemy recipe fits starting materials and funds"
            command(page, "craft", {"code": recipe})
            d["crafted"] = recipe
            shot(page, "03-craft-queued")

            # 180 seconds of REAL wall-clock time (not mocked Date.now).
            d["idle_samples"] = [snapshot(page)]
            for minute in range(1, 4):
                page.wait_for_timeout(60000)
                state = snapshot(page)
                d["idle_samples"].append(state)
                shot(page, "04-idle-%d-minute" % minute)
                earlier = d["idle_samples"][-2]
                assert state["totalRunExp"] > earlier["totalRunExp"], (
                    "Cultivation did not increase during idle minute %d" % minute)
                assert not state["dead"], "Character died during the 3-minute smoke"
            success_syncs = [r for r in d["network"] if r["status"] == 200
                             and r["url"].split("?")[0].endswith("/sync")]
            d["successful_idle_syncs"] = len(success_syncs)
            assert len(success_syncs) >= 3, "Too few successful online syncs"

            # Test a recoverable 503 with Retry-After on a command; one retry
            # must preserve requestId and increment revision exactly once.
            injected = {"n": 0}
            def maintenance(route):
                if injected["n"] == 0:
                    injected["n"] += 1
                    route.fulfill(status=503, headers={
                        "Content-Type": "application/json", "Retry-After": "1"},
                        body=json.dumps({"error": {
                            "code": "MAINTENANCE", "message": "CI temporary maintenance"}}))
                else:
                    route.continue_()
            page.route("**/api/v1/players/*/commands", maintenance)
            before = snapshot(page)
            command(page, "buy", {"code": "HERB-001"})
            after = snapshot(page)
            assert injected["n"] == 1, "503 fixture was not triggered"
            assert after["revision"] == before["revision"] + 1, (
                "Retry did not commit exactly one transaction")
            assert after["totalRunExp"] >= before["totalRunExp"], "Progress disappeared after 503"
            report["expected_maintenance"] = injected["n"]
            shot(page, "05-maintenance-recovered")
            page.unroute("**/api/v1/players/*/commands", maintenance)

            # Visible NPC/simulation notices, not just flags in source.
            proof.open_page(page, "world")
            proof.set_tab(page, "world", "auction")
            auction_text = page.locator('.win.page[data-window="world"] .release-label').inner_text()
            assert "mô phỏng" in auction_text, "Auction is not labelled simulation"
            shot(page, "06-auction-npc-label")
            proof.set_tab(page, "world", "sect")
            sect_text = page.locator('.win.page[data-window="world"] .release-label').inner_text()
            assert "Tông môn cá nhân" in sect_text, "Sect is not labelled private"
            shot(page, "07-sect-npc-label")
            # The world is a modal overlay; close it before using the main
            # 'Thêm' menu. The menu button exists in DOM but is not clickable
            # while a modal page is open.
            page.locator(".win.page .page-back").last.click()
            page.locator("#moreMenuBtn").click()
            page.locator('#moreMenu [data-more-go="more:friends"]').click()
            assert "NPC" in page.locator('.win.page[data-window="more"] .release-label').inner_text()
            shot(page, "08-friends-npc-label")

            # Check native tab-switch visibility if the Chromium runner emits
            # it. Headless Chromium commonly keeps BOTH pages "visible" even
            # after bring_to_front(), so this cannot be a mandatory assertion.
            # In that case exercise the app's real event listener and real
            # /pause + /sync HTTP requests via an explicitly recorded synthetic
            # visibility state (never misreport this as a native tab switch).
            page.evaluate("""() => {
                window.__hu_visibility = [];
                document.addEventListener('visibilitychange',
                    () => window.__hu_visibility.push(document.hidden));
            }""")
            auxiliary = desktop_ctx.new_page()
            auxiliary.goto("about:blank")
            auxiliary.bring_to_front()
            page.wait_for_timeout(1400)
            d["tab_hidden"] = page.evaluate("document.hidden")
            page.bring_to_front()
            page.wait_for_timeout(1400)
            d["visibility_events"] = page.evaluate("window.__hu_visibility")
            d["native_tab_switched"] = True in d["visibility_events"] and False in d["visibility_events"]
            auxiliary.close()
            if d["native_tab_switched"]:
                d["visibility_verification"] = "native_tab_switch"
                assert any(r["status"] == 200 and r["url"].endswith("/pause")
                           for r in d["network"]), "Hidden tab failed to send /pause"
            else:
                d["visibility_verification"] = "synthetic_headless_fallback"
                # No mock API responses: the real browser handler must send an
                # actual successful POST to the isolated local backend.
                with page.expect_response(
                    lambda r: r.request.method == "POST" and r.url.endswith("/pause") and r.status == 200,
                    timeout=15000
                ):
                    page.evaluate("""() => {
                        Object.defineProperty(document, 'hidden',
                            {configurable: true, get: () => true});
                        Object.defineProperty(document, 'visibilityState',
                            {configurable: true, get: () => 'hidden'});
                        document.dispatchEvent(new Event('visibilitychange'));
                    }""")
                page.wait_for_function("window.HU_UI.session.paused === true", timeout=5000)
                with page.expect_response(
                    lambda r: r.request.method == "POST" and r.url.endswith("/sync") and r.status == 200,
                    timeout=15000
                ):
                    page.evaluate("""() => {
                        Object.defineProperty(document, 'hidden',
                            {configurable: true, get: () => false});
                        Object.defineProperty(document, 'visibilityState',
                            {configurable: true, get: () => 'visible'});
                        document.dispatchEvent(new Event('visibilitychange'));
                    }""")
                page.wait_for_function("window.HU_UI.session.paused === false", timeout=5000)
                d["visibility_events"] = page.evaluate("window.__hu_visibility")
                assert d["visibility_events"][-2:] == [True, False], (
                    "Fallback did not fire hidden + visible events")
            shot(page, "09-return-from-tab")

            m = report["mobile"]
            mobile_ctx, mobile = setup_page(browser, url, "release_390x844",
                                           {"width": 390, "height": 844}, m)
            proof.enter_game(mobile, url, folder, "release_390x844", {"screenshots": []})
            assert mobile.locator("#game").is_visible(), "390x844 gameplay not visible"
            assert mobile.locator("#chatBubble").is_hidden()
            m["state"] = snapshot(mobile)
            shot(mobile, "10-mobile-game")

            for area in (d, m):
                bad = [r for r in area["network"] if r["status"] in (404, 429)
                       or r["status"] >= 500 and not
                       (r["status"] == 503 and report["expected_maintenance"] and
                        "/commands" in r["url"])]
                assert not bad, "Unexpected game API 404/429/5xx: " + repr(bad)
                # Browser prints one console.error for an intentionally injected
                # 503 even when the fetch retry succeeds. Preserve it in evidence.
                unknown_errors = [e for e in area["errors"] if not
                                  (report["expected_maintenance"] and
                                   "503" in e and "Failed to load resource" in e)]
                assert not unknown_errors, "Browser console errors: " + repr(unknown_errors)
            d["sync_error_toasts"] = page.evaluate("window.__hu_sync_toast_errors")
            assert not d["sync_error_toasts"], (
                "Unexpected synchronization error toast during real idle: " +
                repr(d["sync_error_toasts"]))
            d["final"] = snapshot(page)
        except Exception as e:
            report["failure"] = str(e)
            try:
                if desktop_ctx:
                    shot(desktop_ctx.pages[0], "failure-desktop")
            except Exception:
                pass
        finally:
            report["elapsed_real_seconds"] = round(time.monotonic() - start, 1)
            (folder / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                                 encoding="utf-8")
            if mobile_ctx:
                mobile_ctx.close()
            if desktop_ctx:
                desktop_ctx.close()
            browser.close()
    print(json.dumps({"failure": report["failure"], "elapsed_real_seconds": report["elapsed_real_seconds"],
                      "screenshots": len(report["screenshots"]),
                      "idle_samples": report["desktop"].get("idle_samples"),
                      "sync_count": report["desktop"].get("successful_idle_syncs")},
                     ensure_ascii=False, indent=2))
    if report["failure"]:
        raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8001")
    parser.add_argument("--output", default="release-browser-smoke")
    args = parser.parse_args()
    run(args.url, Path(args.output))
