import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.json':'application/json; charset=utf-8' };
function legacyBridge() { return { name:'legacy-bridge', configureServer(server) { server.middlewares.use('/legacy', (req,res,next) => { let pathname; try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); } catch { res.statusCode=400; return res.end(); } const full = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)); if (!full.startsWith(root + path.sep)) { res.statusCode=403; return res.end(); } if (!['/index.html','/maintenance.html','/staff.html'].includes(pathname) && !/^\/(src|styles|assets)\//.test(pathname)) { res.statusCode=404; return res.end(); } fs.stat(full, (err,stat) => { if(err || !stat.isFile()) { res.statusCode=404; return res.end(); } res.setHeader('Content-Type', mime[path.extname(full)] || 'application/octet-stream'); res.setHeader('X-Content-Type-Options','nosniff'); fs.createReadStream(full).pipe(res); }); }); } }; }
export default defineConfig({ plugins:[react(),legacyBridge()], server:{ proxy:{'/api':'http://localhost:3001'} } });
