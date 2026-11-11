# Hợp đồng engine

> Trạng thái: Hiện hành.
Tài liệu này là **đặc tả hợp đồng engine**. Nó ghi lại những gì giao diện (`client/`) đang gọi và đọc, trích từ mã nguồn tại thời điểm dọn backend. Engine hiện đã thỏa hợp đồng này nên UI chạy mà không phải sửa.

> Trạng thái: engine đã cài đặt đầy đủ 9 miền luật, 48 lệnh và state V9. `HU_GAME.READY === true`, `HU_GAME.MISSING` rỗng; `client/main.js` mở phiên chơi thật và bài kiểm tra nằm trong `tests/`.
>
> Cài đặt cũ vẫn xem được trong lịch sử git để đối chiếu hành vi: `git show 5f6b9bc:shared/rules/<miền>.js` (cũng như `shared/state/player.js`, `shared/game.js`, `server/services/player-service.js`). Không sao chép nguyên văn; dùng làm tham chiếu hành vi.

## 1. Ranh giới

- `engine/` không dùng DOM, `localStorage`, mạng, timer hay `Date.now()`/`Math.random()` trực tiếp. Thời gian (`now`) và RNG trong gameplay online do `PlayerService` ở Node (dev) hoặc Supabase Edge cung cấp. Trình duyệt chỉ dùng `RemoteSession` để hiển thị snapshot và gửi intent.
- `engine/` chạy trong Node (CommonJS `require`) và trình duyệt (classic script, `file://`). Mỗi file dùng mẫu `(function (root) { … })(window | globalThis)` và gán vào `root.HU_*` cùng `module.exports`.
- `engine/` đọc dữ liệu từ `data/`, không bao giờ ngược lại.
- Payload lệnh không chứa `now`, RNG, giá, phần thưởng hay state (xem `engine/protocol/commands.js`).

## 2. `HU_GAME` (engine/game.js)

UI đọc `root.HU_GAME` (viết tắt `H`). Phần **dữ liệu** đã có sẵn từ `data/` và được trải vào `H`: `F` (công thức), `item()`, `ITEMS`, `ZONES`, `DUNGEONS`, `QUESTS`, `ENCOUNTERS`, `SECTS`, `SECT_RANKS`, `SECT_SHOP`, `SECT_MISSIONS`, `META_UPGRADES`, `META_ACHIEVEMENTS`, `TALENT_INFO`, `ROOT_TYPES`, `DI_LINH_CAN`, `DESIGN`, … (và `rollRoots`, `rollRace`, `randomName`, `cleanName`, `rootLabel`, `raceName`…).

Phần **engine phải cung cấp**:

| Thành viên | Vai trò |
|---|---|
| `VERSION` | Phiên bản schema (hiện 9), lấy từ `engine/state/player.js`. |
| `create(now)` | State mới, `created: false`. |
| `createCharacter(profile, now, rng)` | Tạo nhân vật; profile do màn tạo nhân vật dựng (`name`, `gender`, `age`, `race`, `roots`, `rootType`, `talent`, …). |
| `normalize(raw, now)` | Làm sạch và nâng cấp bản lưu V4–V9 về V9; trả `null` nếu không hợp lệ. |
| `Game` | Lớp bọc `(state, rng, onLog)`; xem §4. |

## 3. Phiên gameplay online (`client/session/remote-session.js`)

**Mở rộng Thiên Mệnh Các:** `RemoteSession.pavilionPurchase(kind, key)` xếp chung hàng đợi với `dispatch()` và `sync`. Kho tài khoản được đọc từ `bootstrap` hoặc các phản hồi `state`, `commands`, `sync`. Retry cùng requestId; optimistic `expectedVersion` chống mua trùng. Xem [Thiên Mệnh Các](thien-menh-cac.md).

`RemoteSession` dùng Supabase JWT với `/api/v1`: `connect(account)`, `previewCreation()`, `create(profile)`, `dispatch(type,payload)`, `synchronize(force)`, `pause()`, `resetAfterDeath()`, `subscribe(fn)`, `drainAchievements()`. Các thao tác là Promise và được tuần tự hóa theo revision của máy chủ.

`client/persistence/remote-store.js` cung cấp facade cho UI mà **không lưu trạng thái nhân vật vào localStorage**. Chỉ backend giữ RNG, đồng hồ, state và giao dịch SQLite/Postgres. Tab ẩn gửi `pause`, heartbeat sau khoảng 20 giây, server grace mặc định 60 giây; khi offline không tăng tài nguyên hay tuổi.

`LocalSession` (legacy/dev-only) và `LocalStore` (legacy/dev-only) chỉ giữ trong kho mã phục vụ kiểm toán/migration; chúng không được import trong `index.html` hoặc đóng gói vào `dist/`. Mã gameplay thật là `PlayerService` ở Node.

## 4. Lệnh (48, protocol V2)

Mỗi lệnh là phương thức `game[type](payload, now)` trên `Game.prototype`, thuộc đúng một miền trong `engine/rules/` (game.js kiểm tra điều này khi nạp). Schema payload nằm ở `engine/protocol/commands.js`.

| Lệnh | Miền | Trường payload |
|---|---|---|
| `absorb` | progression | `index` |
| `upgrade` | progression | `index`, `count` |
| `breakthrough` | progression | — |
| `setAuto` | progression | `enabled` |
| `setPreference` | time | `key`, `value` (cài đặt giao diện được xác minh server) |
| `buy` | inventory | `code` |
| `sell` | inventory | `code` |
| `equip` | inventory | `code` |
| `learn` | inventory | `code` |
| `activate` | inventory | `code` |
| `use` | inventory | `code` |
| `sellYao` | inventory | — |
| `bid` | inventory | `code` |
| `craft` | crafting | `code` |
| `forge` | crafting | `code` |
| `garden` | crafting | `slot`, `action`, `terrain` |
| `strike` | combat | — |
| `skill` | combat | `index` |
| `castManual` | combat | `code` |
| `activateArtifact` | combat | `code` |
| `startExploration` | combat | — |
| `setEnemyKind` | combat | `kind` |
| `travel` | combat | `zone` |
| `claimQuest` | world | `id` |
| `claimFragments` | world | — |
| `manualEncounter` | world | `index` |
| `joinSect` | world | `id` |
| `leaveSect` | world | — |
| `donateSect` | world | — |
| `setBlessing` | world | `enabled` |
| `setSectRepeat` | world | `enabled` |
| `startSectMission` | world | `id` |
| `claimSectMission` | world | — |
| `abortSectMission` | world | — |
| `buySect` | world | `id`, `element` |
| `temperRoot` | world | `index` |
| `storyMark` | world | `id`, `option` (tùy chọn) |
| `startDungeon` | adventures | `id` |
| `abortDungeon` | adventures | — |
| `enterDungeon` | adventures | `id` |
| `dungeonAct` | adventures | `action` (`attack`/`power`/`guard`/`heal`/`retreat`) |
| `meetFriend` | social | `id` |
| `giftFriend` | social | `id` |
| `discuss` | social | `id` |
| `npcGift` | social | `id` |
| `npcOffer` | social | `id` |
| `npcQuest` | social | `id` |
| `duel` | social | `id` |

`storyMark` chỉ ghi `s.story.read` và `s.story.flags`. Engine kiểm tra ID, cảnh giới, thiện cảm và lựa chọn; không cấp chỉ số hay phần thưởng.

Ngoài lệnh, `Game` phải có: `advance(now, offline)` (miền `time`), `isDead()` (miền `time`), `checkMeta()` (miền `progression`, trả danh sách thành tựu mới).

`execute` **từ chối tất cả 48 lệnh khi `isDead()`**, không có lệnh hồi sinh. `resetAfterDeath` là endpoint backend riêng chỉ dùng sau khi máy chủ xác nhận chết và chủ tài khoản yêu cầu xóa.

## 5. Phương thức truy vấn UI đang gọi

Các phép tính/tra cứu chỉ-đọc mà UI gọi trên `UI.g()` (tức `session.game`). Danh sách trích bằng tìm kiếm trong mã `client/ui`; `tests/engine.test.cjs` kiểm tra tất cả đều tồn tại và chạy được.

`stats`, `need`, `rate`, `price`, `count`, `ingredientCount`, `maxMp`, `realmLabel`, `enemy`, `chance`, `chaosChance`, `craftChance`, `missionChance`, `encounterChance`, `discussGain`, `attackInterval`, `lifeInfo`, `upgradeBase`, `tribulation`, `breakthroughOdds`, `temperCost`, `recipe`, `forgeRecipe`, `gardenInfo`, `activeElements`, `manualEffects`, `affinity`, `rivalPower`, `lots`, `estimateDungeon`, `featuredMission`, `sectDefinition`, `sectRank`, `sectMissions`, `sectShopOffer`, `sectIncome`.

## 6. Trường state UI đang đọc (`UI.s()`)

Tên: `name`, `gender`, `age`, `race`, `created`, `destiny`, `death`, `roots`, `rootType`, `rootSub`, `rootCraft`, `talent`, `chaosTries`.
Cảnh giới và tu luyện: `realm`, `stage`, `qi`, `progress`, `totalRunExp`, `breakBonus`, `pity`, `daoVan`, `rebirths`, `extraLife`, `tech`, `auto`, `tick`.
Chiến đấu: `hp`, `mp`, `shield`, `reduction`, `zone`, `enemyKind`, `enemyNum`, `enemyHp`, `cooldowns`, `designCombat`, `activeManuals`, `encounter`, `dungeon`.
Kinh tế và hành trang: `stone`, `bag`, `equipment`, `learned`, `yaoValue`, `claimed`, `completed`, `auction`, `pillUses`, `pillRealmExp`.
Nghề phụ: `alchemySkill`, `craftQueue`, `craftBoost`, `garden`, `gardenSoils`.
Thế giới và xã hội: `sect`, `social`, `npcAffinities`.
Kiếp hiện tại: `meta` (thành tựu không cấp điểm), `destiny` (Thiên mệnh lúc tạo), `death` (nguyên nhân tử vong), `presencePaused` (tạm dừng server). `offlineCap`, `offlineEff` và `daoVan` chỉ còn để đọc dữ liệu cũ.
Hệ thống: `settings`, `logs`, `lastUpdate`, `lastSaved`.

Hình dạng chi tiết của từng trường: xem `git show 5f6b9bc:shared/state/player.js` (`createBase`, `normalize`).

## 7. Bản lưu

- Schema hiện hành V9; normalize V4, V5, V6, V7, V8, V9 (`SUPPORTED_VERSIONS`). Bản lưu client cũ không được nhập trực tiếp vào account online.
- `normalize` làm sạch giá trị; `PlayerService` giới hạn JSON, kích thước và khóa. Dữ liệu PostgreSQL được ghi ở Edge theo giao dịch; SQLite chỉ dùng Node dev/test.
- Thiên mệnh được chọn một lần tại tạo nhân vật. Không có lệnh `prestige`/`reincarnate` và không tích lũy **thành tựu nhân vật** xuyên kiếp. **Bản code 11/11/2026:** Thiên Tinh, cấp Thiên Mệnh Các và Kỳ Trân lưu tách trong `pavilion_accounts` nhưng bị xóa cùng nhân vật khi `reset-after-death`; không có kế thừa xuyên kiếp. Backend production dùng Postgres; Node/SQLite chỉ dành cho dev/test.

## 8. Thứ tự đã triển khai

1. `state/player.js`: `create`, `normalize` (+ test nạp V4–V9).
2. `rules/time.js` và `rules/creation.js`: `advance`, `isDead`, `createCharacter`.
3. `rules/progression.js`: tu luyện, đột phá, độ kiếp, thiên mệnh.
4. `rules/inventory.js`, `rules/crafting.js`, `rules/combat.js`.
5. `rules/world.js`, `rules/adventures.js`, `rules/social.js`.
6. Mỗi bước: thêm test hành vi vào `tests/` (ví dụ `tests/engine.test.cjs`), rồi chạy `npm run check && npm test`. Khi `HU_GAME.MISSING` rỗng thì UI tự khởi động.
