import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const assetRoot = path.join(repoRoot, 'assets');
const mime = { '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json; charset=utf-8' };

function gameAssets() {
  return {
    name: 'game-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res) => {
        let rel;
        try { rel = decodeURIComponent(new URL(req.url || '/', 'http://local').pathname); } catch { res.statusCode = 400; return res.end(); }
        const file = path.resolve(assetRoot, '.' + rel);
        if (!file.startsWith(assetRoot + path.sep)) { res.statusCode = 403; return res.end(); }
        fs.stat(file, (err, st) => {
          if (err || !st.isFile()) { res.statusCode = 404; return res.end(); }
          res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
          fs.createReadStream(file).pipe(res);
        });
      });
    },
    closeBundle() {
      const out = path.resolve(here, '../../dist/assets');
      fs.rmSync(out, { recursive: true, force: true });
      fs.cpSync(assetRoot, out, { recursive: true });
    }
  };
}

export default defineConfig({
  plugins: [react(), gameAssets()],
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:3001' } }
});
