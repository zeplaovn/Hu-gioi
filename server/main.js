/* Điểm vào máy chủ: file tĩnh, /api/health và API gameplay /api/v1 (khi đã cấu hình xác thực).
   Chạy: npm start   (HOST, PORT tùy chọn; mặc định 127.0.0.1:8000)
   Biến môi trường gameplay:
     SUPABASE_URL           URL project Supabase (suy ra issuer + JWKS để xác minh JWT)
     SUPABASE_JWT_SECRET    (tùy chọn) secret HS256 cho project chưa dùng khóa bất đối xứng
     SUPABASE_PUBLISHABLE_KEY  key public của project để xác minh chấp thuận RLS
     SUPABASE_SERVICE_ROLE_KEY  (tùy chọn, chỉ ở máy chủ) bật POST /api/v1/me/delete-account xóa cả tài khoản Supabase
     HU_LEGACY_AUTH=1       bật AuthService cookie thử nghiệm thay cho Supabase (chỉ dev/test)
     HU_DB_FILE             đường dẫn SQLite (mặc định .hu-gioi/game.sqlite)
     HU_ALLOWED_ORIGINS     danh sách origin được gọi API, ngăn cách bằng dấu phẩy (khi game tĩnh ở origin khác)
     HU_AUTH_TRUSTED_PROXY_IPS  danh sách IP proxy được phép khai báo X-Forwarded-For
     HU_ONLINE_GRACE_MS     quá ngưỡng này kể từ lần thấy gần nhất thì đóng băng tiến trình (mặc định 60000)
   Không đặt cấu hình xác thực → API gameplay tắt, chỉ phục vụ file tĩnh. */
'use strict';
const http = require('node:http');
const path = require('node:path');
const { createRouter } = require('./http/router.js');

function buildGameApi(env = process.env) {
  const { verifierFromEnv } = require('./auth/jwt.js');
  const { createPrincipalResolver } = require('./auth/principal.js');
  const { createConsentVerifier } = require('./auth/consent.js');
  const { SqlitePlayers } = require('./repositories/sqlite-players.js');
  const { PlayerService } = require('./services/player-service.js');
  const { createGameApi } = require('./http/game-api.js');
  const { createSupabaseLoginGateway } = require('./http/supabase-login.js');
  const { createClientIp } = require('./http/client-ip.js');
  const { computeContentVersion } = require('./content-version.js');
  const { AuthService } = require('./services/auth-service.js');
  const { createAccountAdmin } = require('./auth/account-admin.js');

  if (env.HU_LEGACY_AUTH === '1' && env.NODE_ENV === 'production')
    throw Error('Không bật HU_LEGACY_AUTH trong production.');
  const jwt = verifierFromEnv(env);
  const legacy = env.HU_LEGACY_AUTH === '1' ? new AuthService() : null;
  if (!jwt && !legacy) return { auth: null, gameApi: null, loginGateway: null, close() {} };
  const verifyConsent = jwt ? createConsentVerifier({
    url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY
  }).check : null;

  const file = env.HU_DB_FILE || path.resolve(process.cwd(), '.hu-gioi', 'game.sqlite');
  const publicRoot = path.resolve(__dirname, '..');
  const exposed = ['client', 'css', 'data', 'engine', 'media'].some(dir => path.resolve(file).startsWith(path.join(publicRoot, dir) + path.sep));
  if (exposed) throw Error('HU_DB_FILE không được đặt trong thư mục tài nguyên công khai.');

  const repository = new SqlitePlayers(file);
  const grace = Number(env.HU_ONLINE_GRACE_MS);
  const service = new PlayerService({
    repository, contentVersion: computeContentVersion(),
    config: Number.isFinite(grace) && grace >= 0 && env.HU_ONLINE_GRACE_MS ? { onlineGraceMs: grace } : {}
  });
  const purge = setInterval(() => { void repository.purgeExpired(Date.now()).catch(e => console.error('[purge]', e.message)); }, 3600000);
  purge.unref();
  repository.purgeExpired(Date.now());
  const allowedOrigins = String(env.HU_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const trustedProxyIps = String(env.HU_AUTH_TRUSTED_PROXY_IPS || '').split(',').map(x => x.trim()).filter(Boolean);
  const clientIp = createClientIp(trustedProxyIps);
  const loginGateway = jwt ? createSupabaseLoginGateway({
    url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY, clientIp
  }) : null;
  const accountAdmin = jwt && env.SUPABASE_SERVICE_ROLE_KEY
    ? createAccountAdmin({ url: env.SUPABASE_URL, secretKey: env.SUPABASE_SERVICE_ROLE_KEY }) : null;
  const gameApi = createGameApi({
    service, accountAdmin, clientIp, resolvePrincipal: createPrincipalResolver({ jwt, legacy, verifyConsent }), allowedOrigins,
    log: err => console.error('[game-api]', err.cause?.stack || err.stack || err)
  });
  return { auth: legacy, gameApi, loginGateway, close() { clearInterval(purge); repository.close(); } };
}

if (require.main === module) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8000);
  process.on('unhandledRejection', err => console.error('[unhandledRejection]', err?.stack || err));
  const { auth, gameApi, loginGateway, close } = buildGameApi();
  const server = http.createServer(createRouter(null, auth, gameApi, loginGateway));
  server.listen(port, host, () => console.log(`Hư Giới tại http://${host}:${port} · gameplay ${gameApi ? 'BẬT' : 'tắt (chưa cấu hình xác thực)'}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { close(); process.exit(0); }));
}
module.exports = { buildGameApi };
