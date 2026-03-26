#!/bin/sh
set -e

# Build the viewer bundle if the TypeScript sources are available
if [ -d /app/src ]; then
  cd /app/src

  # Install dependencies in the container (Linux) environment
  npm install

  # Produce web/viewer/render.mjs from src/viewer/render.ts
  npm run build-viewer
fi

# Start Nginx in foreground (container main process)
nginx -g "daemon off;"
