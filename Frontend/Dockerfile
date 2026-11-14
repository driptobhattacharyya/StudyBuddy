# Stage 1: build the static bundle
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js eslint.config.js jsconfig.json ./
COPY public ./public
COPY src ./src
# Vite inlines VITE_* variables at build time, so the API URL is fixed per image.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: serve the bundle with nginx (SPA fallback configured in nginx.conf)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
