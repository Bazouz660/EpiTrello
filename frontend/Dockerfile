# syntax=docker/dockerfile:1.6

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package*.json ./
RUN npm install

FROM base AS build
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=${VITE_API_URL}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
