/* Điểm vào: ghép auth + game store + router theo hash (#/play, #/quan-dinh, #/lich-su). Không framework; static host nào cũng chạy được. */
import "./styles/app.css";
import { createApi } from "./api.js";
import { createAuth } from "./auth.js";
import { SUPABASE_ANON_KEY, functionUrl } from "./config.js";
import { num } from "./format.js";
import { createGame } from "./game.js";
import { clear, h, icon } from "./ui/dom.js";
import { createLichSuView } from "./views/lich-su.js";
import { createLoginView } from "./views/login.js";
import { createPlayView } from "./views/play.js";
import { createQuanDinhView } from "./views/quan-dinh.js";

const BRAND = "Thiên Vân Đại Lục";
const auth = createAuth();
const game = createGame({ api: createApi({ baseUrl: functionUrl(), getToken: auth.token, anonKey: SUPABASE_ANON_KEY }) });

const ROUTES = {
  "/play": { label: "Tu luyện", wide: true, make: () => createPlayView({ game }) },
  "/quan-dinh": { label: "Quán Đỉnh", make: () => createQuanDinhView({ game }) },
  "/lich-su": { label: "Bia Thiên Mệnh", make: () => createLichSuView({ game }) },
};
const DEFAULT_ROUTE = "/play";
const currentRoute = () => {
  const p = location.hash.replace(/^#/, "");
  return p in ROUTES ? p : DEFAULT_ROUTE;
};

const root = document.getElementById("app");
const topbar = h("header", { class: "topbar" });
const main = h("main", { class: "page" });
root.append(main);

let active = null;   // { key, view }

function drawTopbar(signedIn) {
  if (!signedIn) { topbar.remove(); return; }
  if (!topbar.isConnected) root.prepend(topbar);
  const route = currentRoute();
  clear(topbar,
    h("a", { class: "game-title", href: "#/play" }, BRAND),
    route !== "/play" && h("a", { class: "btn ghost sm", href: "#/play", style: { textDecoration: "none" } }, "← Về Tu luyện"),
    h("span", { class: "spacer" }),
    game.state && h("span", { class: "chip gold", title: "Điểm Thiên Mệnh" },
      icon("orb_gold", "btn-ico", { width: "16px", height: "16px" }), " Thiên Mệnh ", h("b", { class: "num" }, num(game.state.account.tm_balance))),
    auth.session?.user?.email && h("span", { class: "dim small acct", title: auth.session.user.email }, auth.session.user.email),
    h("button", { class: "btn ghost sm", onclick: () => auth.signOut() }, "Thoát"));
}

function renderShell() {
  if (!auth.ready) {
    active?.view.destroy(); active = null;
    clear(main, h("p", { class: "dim" }, "Đang tải…"));
    return;
  }
  const signedIn = !!auth.session;
  const key = signedIn ? currentRoute() : "login";
  if (active?.key !== key) {
    active?.view.destroy();
    const view = key === "login" ? createLoginView({ auth }) : ROUTES[key].make();
    active = { key, view };
    main.className = key === "/play" ? "page" : "page narrow";
    clear(main, view.el);                                    // phải gắn vào DOM trước khi render (hộp thoại cần isConnected)
    document.title = key === "login" ? BRAND : `${ROUTES[key].label} · ${BRAND}`;
  }
  drawTopbar(signedIn);
  active.view.render();
}

let wasSignedIn = false;
auth.subscribe(() => {
  const now = !!auth.session;
  if (now && !wasSignedIn) game.start();
  if (!now && wasSignedIn) game.reset();
  wasSignedIn = now;
  renderShell();
});
game.subscribe(() => { if (auth.session) renderShell(); });
window.addEventListener("hashchange", renderShell);

renderShell();
void auth.init();
