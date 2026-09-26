FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8090/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Ruta base de la app ('/scanner/' cuando se sirve detrás de Traefik).
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5200
CMD ["nginx", "-g", "daemon off;"]
