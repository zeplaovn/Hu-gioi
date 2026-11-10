# Hư Giới online: Node 24 + SQLite trên volume riêng. HTTPS cần reverse proxy phía trước.
FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data && chmod 0700 /data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000 HU_DB_FILE=/data/game.sqlite
EXPOSE 8000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:8000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "server/main.js"]
