FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf \
    && apk add --no-cache nodejs npm

WORKDIR /app

COPY src ./src
COPY web ./web
COPY web/docker/config/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /app/src

RUN rm -rf node_modules \
    && npm install \
    && npm run build-viewer

WORKDIR /app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
