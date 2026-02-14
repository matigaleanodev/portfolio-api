FROM node:22-alpine3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
