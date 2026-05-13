FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
# npm ci no Linux falha se o lock estiver levemente fora de sync com o package.json
# (comum após merges); npm install instala de forma determinística o suficiente para dev.
RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=development

CMD ["npm", "run", "start:dev"]
