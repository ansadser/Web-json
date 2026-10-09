FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./server.js
COPY public ./public

ENV PORT=8000
EXPOSE 8000

USER node
CMD ["npm", "start"]
