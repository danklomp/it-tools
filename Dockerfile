# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build Backend/Final Image
FROM node:20-alpine
WORKDIR /app
# Install ping and other network tools
RUN apk add --no-cache iputils

COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server/ ./server/
COPY --from=frontend-builder /app/client/dist ./client/dist

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.js"]
