FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY src ./src

ENV NODE_ENV=production

CMD ["node", "src/server.js"]

