FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 4007

CMD ["node", "src/server.js"]
