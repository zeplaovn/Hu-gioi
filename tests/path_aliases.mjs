import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Test-only compatibility layer: các test hiện có vẫn dùng đường dẫn JS phẳng cũ.
// Runtime/browser không tải file này; nó chỉ ánh xạ đường dẫn đọc file sang cấu trúc theo domain mới.
const aliases = new Map([
  ["js/data.js", "js/core/data.js"],
  ["js/idle_data.js", "js/systems/idle_data.js"],
  ["js/assets.js", "js/infrastructure/assets.js"],
  ["js/player.js", "js/core/player.js"],
  ["js/ui.js", "js/ui/ui.js"],
  ["js/scene.js", "js/ui/scene.js"],
  ["js/minigames.js", "js/systems/minigames.js"],
  ["js/game.js", "js/core/game.js"],
  ["js/screens.js", "js/ui/screens.js"],
  ["js/farm.js", "js/systems/farm.js"],
  ["js/crafts.js", "js/systems/crafts.js"],
  ["js/train.js", "js/core/train.js"],
  ["js/idle.js", "js/systems/idle.js"],
  ["js/sect.js", "js/systems/sect.js"],
  ["js/guide.js", "js/ui/guide.js"],
  ["js/security.js", "js/infrastructure/security.js"],
  ["js/meta.js", "js/systems/meta.js"],
  ["js/config.js", "js/online/config.js"],
  ["js/cloud.js", "js/online/cloud.js"],
  ["js/auth.js", "js/online/auth.js"],
  ["js/chat.js", "js/ui/chat.js"],
  ["js/ux.js", "js/ui/ux.js"],
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
