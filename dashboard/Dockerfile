FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server.js db.js ./
COPY routes/ ./routes/
COPY config/ ./config/
COPY utils/ ./utils/
COPY 8a9sud89aus8d/ ./8a9sud89aus8d/

EXPOSE 3333

ENV NODE_ENV=production
ENV PORT=3333

CMD ["node", "server.js"]
