FROM node:24.21.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_LOGS_API_URL
ENV VITE_LOGS_API_URL=$VITE_LOGS_API_URL
RUN npm run build

FROM nginx:1.29-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
