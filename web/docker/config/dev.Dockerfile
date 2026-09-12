FROM nginx:alpine

# Remove default Nginx site configuration and install Node.js tooling
RUN rm /etc/nginx/conf.d/default.conf \
    && apk add --no-cache nodejs npm

# Copy custom Nginx configuration and the container entrypoint
COPY docker/config/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/config/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Application root inside the container (the repo is bind-mounted here)
WORKDIR /app

# HTTP port exposed by Nginx
EXPOSE 80

# Build viewer bundle on container start and then launch Nginx
CMD ["/docker-entrypoint.sh"]
