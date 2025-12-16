# syntax=docker/dockerfile:1.6

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS dependencies
COPY package.json ./
RUN npm install --omit=dev

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

FROM base AS production
COPY --from=build /app .
EXPOSE 8080
ENV PORT=8080
CMD ["node", "src/server.js"]
