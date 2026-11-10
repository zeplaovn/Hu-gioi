# Hư Giới online: Node 24 + SQLite trên volume riêng. HTTPS cần reverse proxy phía trước.
FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data && chmod 0700 /data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000 HU_DB_FILE=/data/game.sqlite
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http=require('node:http');const req=http.get({host:'127.0.0.1',port:Number(process.env.PORT||8000),path:'/api/health',timeout:4000},res=>{res.resume();process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.on('timeout',()=>req.destroy())"
VOLUME ["/data"]
CMD ["node", "server/main.js"]
