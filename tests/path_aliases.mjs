import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Test-only compatibility layer: các test hiện có vẫn dùng đường dẫn JS phẳng cũ.
// Runtime/browser không tải file này; nó chỉ ánh xạ đường dẫn đọc file sang cấu trúc production mới.
const aliases = new Map([
  ["js/data.js", "src/game/core/data.js"],
  ["js/idle_data.js", "src/game/features/idle_data.js"],
  ["js/assets.js", "src/platform/assets.js"],
  ["js/player.js", "src/game/core/player.js"],
  ["js/ui.js", "src/ui/ui.js"],
  ["js/scene.js", "src/ui/scene.js"],
  ["js/minigames.js", "src/game/features/minigames.js"],
  ["js/game.js", "src/game/core/game.js"],
  ["js/screens.js", "src/ui/screens.js"],
  ["js/farm.js", "src/game/features/farm.js"],
  ["js/crafts.js", "src/game/features/crafts.js"],
  ["js/train.js", "src/game/core/train.js"],
  ["js/idle.js", "src/game/features/idle.js"],
  ["js/sect.js", "src/game/features/sect.js"],
  ["js/guide.js", "src/ui/guide.js"],
  ["js/security.js", "src/platform/security.js"],
  ["js/meta.js", "src/game/features/meta.js"],
  ["js/config.js", "src/services/config.js"],
  ["js/cloud.js", "src/services/cloud.js"],
  ["js/auth.js", "src/services/auth.js"],
  ["js/chat.js", "src/ui/chat.js"],
  ["js/ux.js", "src/ui/ux.js"],
]);

const readFileSync = fs.readFileSync.bind(fs);
fs.readFileSync = function readAliased(target, ...args) {
  const raw = target instanceof URL ? fileURLToPath(target) : String(target);
  const normalized = raw.replaceAll("\\", "/");
  for (const [oldPath, newPath] of aliases) {
    if (normalized.endsWith("/" + oldPath)) {
      const root = normalized.slice(0, -oldPath.length);
      target = path.normalize(root + newPath);
      break;
    }
  }
  return readFileSync(target, ...args);
};
