# Hợp đồng engine

Tài liệu này là **đặc tả để viết lại `engine/`**. Nó ghi lại những gì giao diện (`client/`) đang gọi và đọc, trích từ mã nguồn tại thời điểm dọn backend. Engine mới chỉ cần thỏa hợp đồng này là UI chạy lại được mà không phải sửa.

> Trạng thái: `engine/` là khung rỗng. `HU_GAME.READY === false` cho tới khi mọi mục dưới đây được cài đặt; `HU_GAME.MISSING` liệt kê phần còn thiếu và `client/main.js` hiển thị thông báo thay vì khởi động UI.
>
> Cài đặt cũ vẫn xem được trong lịch sử git để đối chiếu hành vi: `git show 5f6b9bc:shared/rules/<miền>.js` (cũng như `shared/state/player.js`, `shared/game.js`, `server/services/player-service.js`). Không sao chép nguyên văn; dùng làm tham chiếu hành vi.

## 1. Ranh giới

- `engine/` không dùng DOM, `localStorage`, mạng, timer hay `Date.now()`/`Math.random()` trực tiếp. Thời gian (`now`) và RNG do bên sở hữu phiên cung cấp: `LocalSession` ở client, `PlayerService` ở server.
- `engine/` chạy trong Node (CommonJS `require`) và trình duyệt (classic script, `file://`). Mỗi file dùng mẫu `(function (root) { … })(window | globalThis)` và gán vào `root.HU_*` cùng `module.exports`.
- `engine/` đọc dữ liệu từ `data/`, không bao giờ ngược lại.
- Payload lệnh không chứa `now`, RNG, giá, phần thưởng hay state (xem `engine/protocol/commands.js`).

## 2. `HU_GAME` (engine/game.js)

UI đọc `root.HU_GAME` (viết tắt `H`). Phần **dữ liệu** đã có sẵn từ `data/` và được trải vào `H`: `F` (công thức), `item()`, `ITEMS`, `ZONES`, `DUNGEONS`, `QUESTS`, `ENCOUNTERS`, `SECTS`, `SECT_RANKS`, `SECT_SHOP`, `SECT_MISSIONS`, `META_UPGRADES`, `META_ACHIEVEMENTS`, `TALENT_INFO`, `ROOT_TYPES`, `DI_LINH_CAN`, `DESIGN`, … (và `rollRoots`, `rollRace`, `randomName`, `cleanName`, `rootLabel`, `raceName`…).

Phần **engine phải cung cấp**:

| Thành viên | Vai trò |
|---|---|
| `VERSION` | Phiên bản schema (hiện 7), lấy từ `engine/state/player.js`. |
| `create(now)` | State mới, `created: false`. |
| `createCharacter(profile, now, rng)` | Tạo nhân vật; profile do màn tạo nhân vật dựng (`name`, `gender`, `age`, `race`, `roots`, `rootType`, `talent`, …). |
| `normalize(raw, now)` | Làm sạch và nâng cấp bản lưu V4–V7 về V7; trả `null` nếu không hợp lệ. |
| `Game` | Lớp bọc `(state, rng, onLog)`; xem §4. |

## 3. Phiên chơi (client/session/local-session.js)

`LocalSession` là adapter đồng bộ, do client sở hữu đồng hồ và RNG:

- `game`, `ready`, `subscribe(fn)`, `replace(state)`, `create(profile)`, `dispatch(type, payload)`, `advance(now, offline)`, `drainAchievements()`.
- Sự kiện phát ra: `{ type: 'log', message }` mỗi khi `Game.log()` được gọi, và `{ type: 'death', report }` khi `isDead()` sau `advance`.
- `dispatch` = `validate` → `advance(now)` → `execute` → thu thành tựu qua `checkMeta()`.

`client/persistence/local-store.js` bọc phiên: tự lưu `localStorage` (khóa `huGioiWorkspaceV1`, dự phòng `huGioiWorkspaceV1Backup`), xuất/nhập JSON, `preference(key, value)` cho cài đặt hiển thị. Nó gọi `H.create` và `H.normalize`, và mọi bản lưu đọc vào đều phải qua `H.normalize`.

## 4. Lệnh (46)

Mỗi lệnh là phương thức `game[type](payload, now)` trên `Game.prototype`, thuộc đúng một miền trong `engine/rules/` (game.js kiểm tra điều này khi nạp). Schema payload nằm ở `engine/protocol/commands.js`.

| Lệnh | Miền | Trường payload |
|---|---|---|
| `absorb` | progression | `index` |
| `upgrade` | progression | `index`, `count` |
| `upgradeOffline` | progression | `type` |
| `buyMeta` | progression | `key` |
| `breakthrough` | progression | — |
| `prestige` | progression | — |
| `reincarnate` | progression | — |
| `setAuto` | progression | `enabled` |
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
| `startDungeon` | adventures | `id` |
| `abortDungeon` | adventures | — |
| `meetFriend` | social | `id` |
| `giftFriend` | social | `id` |
| `discuss` | social | `id` |
| `npcGift` | social | `id` |
| `npcOffer` | social | `id` |
| `duel` | social | `id` |

Ngoài lệnh, `Game` phải có: `advance(now, offline)` (miền `time`), `isDead()` (miền `time`), `checkMeta()` (miền `progression`, trả danh sách thành tựu mới).

`execute` chỉ cho `reincarnate` khi `isDead()`, và từ chối mọi lệnh khi nhân vật chưa tạo.

## 5. Phương thức truy vấn UI đang gọi

Các phép tính/tra cứu chỉ-đọc mà UI gọi trên `UI.g()` (tức `session.game`). Danh sách trích bằng tìm kiếm trong mã `client/ui`; khi viết lại hãy chạy từng màn để bắt thêm nếu còn thiếu.

`stats`, `need`, `rate`, `price`, `count`, `ingredientCount`, `maxMp`, `realmLabel`, `enemy`, `chance`, `chaosChance`, `craftChance`, `missionChance`, `encounterChance`, `discussGain`, `attackInterval`, `lifeInfo`, `upgradeBase`, `tribulation`, `temperCost`, `recipe`, `forgeRecipe`, `gardenInfo`, `activeElements`, `manualEffects`, `affinity`, `rivalPower`, `lots`, `estimateDungeon`, `featuredMission`, `sectDefinition`, `sectRank`, `sectMissions`, `sectShopOffer`, `sectIncome`.

## 6. Trường state UI đang đọc (`UI.s()`)

Tên: `name`, `gender`, `age`, `race`, `created`, `roots`, `rootType`, `rootSub`, `rootCraft`, `talent`, `chaosTries`.
Cảnh giới và tu luyện: `realm`, `stage`, `qi`, `progress`, `totalRunExp`, `breakBonus`, `pity`, `daoVan`, `rebirths`, `extraLife`, `tech`, `auto`, `tick`.
Chiến đấu: `hp`, `mp`, `shield`, `reduction`, `zone`, `enemyKind`, `enemyNum`, `enemyHp`, `cooldowns`, `designCombat`, `activeManuals`, `encounter`, `dungeon`.
Kinh tế và hành trang: `stone`, `bag`, `equipment`, `learned`, `yaoValue`, `claimed`, `completed`, `auction`, `pillUses`, `pillRealmExp`.
Nghề phụ: `alchemySkill`, `craftQueue`, `craftBoost`, `garden`, `gardenSoils`.
Thế giới và xã hội: `sect`, `social`, `npcAffinities`.
Xuyên kiếp và ngoại tuyến: `meta`, `offlineCap`, `offlineEff`.
Hệ thống: `settings`, `logs`, `lastUpdate`, `lastSaved`.

Hình dạng chi tiết của từng trường: xem `git show 5f6b9bc:shared/state/player.js` (`createBase`, `normalize`).

## 7. Bản lưu

- Schema hiện hành V7; nhập được V4, V5, V6, V7 (`SUPPORTED_VERSIONS`).
- `normalize` phải chống khóa nguy hiểm, giới hạn số, độ sâu và kích thước (phần kiểm tra JSON an toàn nằm ở `local-store.js`, phần làm sạch giá trị nằm ở `normalize`).
- Thiên mệnh (`meta`) được giữ qua trọng sinh.

## 8. Thứ tự việc gợi ý khi viết lại

1. `state/player.js`: `create`, `normalize` (+ test nạp V4–V7).
2. `rules/time.js` và `rules/creation.js`: `advance`, `isDead`, `createCharacter`.
3. `rules/progression.js`: tu luyện, đột phá, độ kiếp, thiên mệnh.
4. `rules/inventory.js`, `rules/crafting.js`, `rules/combat.js`.
5. `rules/world.js`, `rules/adventures.js`, `rules/social.js`.
6. Mỗi bước: thêm test hành vi vào `tools/test-skeleton.mjs` (hoặc tách file mới), tham chiếu `tools/pending-engine/test-game-integration.mjs`, rồi chạy `npm run check && npm test`. Khi `HU_GAME.MISSING` rỗng thì UI tự khởi động.
