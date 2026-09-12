IFC5 Web Docker
================

This directory contains the Docker setup used to run the standard IFC5 viewer **completely locally**, without depending on any external web service.

The original motivation was very practical: corporate and restricted networks that block external web applications, inspect HTTPS traffic, or simply do not allow WebGL-heavy sites to load properly. In those environments, hosting the viewer yourself — on `localhost`, inside a container — is often the only reliable option.

With this setup:

- The viewer is served locally by Nginx running in a Docker container.
- The IFCX core and viewer code come directly from this repository.
- Dependencies are installed in a controlled Node.js environment.
- You open the viewer at `http://localhost:8080/`.


Environments Overview
---------------------

There are **two** main Docker environments defined here, each with a different goal:

- **Development (dev)**  
  - Uses bind mounts to point the container at your local checkout.  
  - Rebuilds the viewer bundle (`render.mjs`) when the container is recreated.  
  - Ideal for local development and experimentation.

- **Staging (self-contained)**  
  - Copies the `src/` and `web/` folders into the image at build time.  
  - Builds the viewer bundle **inside** the image.  
  - The running container has no external volumes and is self-contained.  
  - Ideal when you want a reproducible image or to run in a more “production-like” way.

At the moment:

- `docker-compose-dev.yaml` uses `dev.Dockerfile` and is tuned for development.
- `docker-compose-staging.yaml` uses `Dockerfile` and is tuned for self-contained staging.
- The convenience script `web/up.sh` points to the **staging** compose.


High-Level Architecture
-----------------------

Regardless of dev or staging, the core architecture is:

- **Base image:** `nginx:alpine`.
- **Node.js + npm:** installed in the image for building the viewer.
- **Paths inside the container:**
  - `/app/src` → IFCX TypeScript source (the `src/` folder from the repo).
  - `/app/web` → the `web/` folder, including `web/viewer/`.
  - `/app/web/viewer` → contains `index.html` and the compiled `render.mjs`.
- **Nginx:**
  - Serves the static viewer from `/app/web/viewer`.
  - Serves `.mjs` files with `Content-Type: application/javascript`.
- **Viewer bundle:**
  - Built via `npm run build-viewer` in `/app/src`.
  - Outputs `web/viewer/render.mjs` (ignored by Git; considered a build artifact).


Key Files
---------

### Compose files

- `docker/compose/docker-compose-dev.yaml`
  - Defines the **development** service `ifc5-web`.
  - Build context: the `web/` directory.
  - Dockerfile: `docker/config/${DOCKERFILE:-dev.Dockerfile}` (by default `dev.Dockerfile`).
  - Sets up bind mounts for live code and a named volume for `node_modules`.

- `docker/compose/docker-compose-staging.yaml`
  - Defines the **staging** service `ifc5-web`.
  - Build context: the repository root.
  - Dockerfile: `web/docker/config/${DOCKERFILE:-Dockerfile}` (by default `Dockerfile`).
  - No external volumes; everything needed is baked into the image.

### Dockerfiles

- `docker/config/dev.Dockerfile`
  - Base: `nginx:alpine`.
  - Removes the default Nginx config and installs `nodejs` and `npm`.
  - Copies `nginx.conf` and `entrypoint.sh` into the image.
  - Sets `WORKDIR /app`.
  - Exposes port `80`.
  - Uses `entrypoint.sh` as `CMD`, which:
    - Runs `npm install` in `/app/src` (using bind-mounted source).
    - Runs `npm run build-viewer` (to rebuild the bundle).
    - Starts Nginx in the foreground.

- `docker/config/Dockerfile`
  - Base: `nginx:alpine`.
  - Removes the default Nginx config and installs `nodejs` and `npm`.
  - Sets `WORKDIR /app`.
  - Copies the entire `src/` and `web/` directories into the image:
    - `COPY src ./src`
    - `COPY web ./web`
  - Copies `web/docker/config/nginx.conf` to `/etc/nginx/conf.d/default.conf`.
  - Switches to `/app/src` and:
    - Deletes any existing `node_modules` (`rm -rf node_modules`), to avoid leaking host-specific binaries.
    - Runs `npm install`.
    - Runs `npm run build-viewer`, generating `/app/web/viewer/render.mjs` inside the image.
  - Returns to `/app`, exposes port `80`, and uses Nginx as the container’s main process.

### Nginx configuration

- `docker/config/nginx.conf`
  - Serves the viewer from `/app/web/viewer`.
  - Ensures `.mjs` files are served as JavaScript modules.
  - Enables gzip for text-based assets.

### Entrypoint (dev only)

- `docker/config/entrypoint.sh`
  - Only used in the **dev** image (`dev.Dockerfile`).
  - On container start:
    - Switches to `/app/src`.
    - Runs `npm install`.
    - Runs `npm run build-viewer` (producing `web/viewer/render.mjs` in the bind-mounted tree).
    - Starts Nginx in the foreground.

### Convenience script

- `web/up.sh`
  - Convenience script that currently runs **staging**:

    ```bash
    docker compose -f docker/compose/docker-compose-staging.yaml up --force-recreate --build -d
    ```

  - In other words:
    - Builds the staging image.
    - Recreates the `ifc5-web` container.
    - Runs it detached, exposing the viewer on `http://localhost:8080/`.


Volumes and Folder Layout (dev)
-------------------------------

In `docker-compose-dev.yaml`, the most important volumes are:

- `../../../src:/app/src`
  - Mounts the repository’s `src/` folder into `/app/src` inside the container.
  - This is where `package.json`, `viewer/render.ts`, and other TypeScript files live.

- `../..:/app/web`
  - Mounts the repository’s `web/` folder into `/app/web`.
  - Nginx serves files from `/app/web/viewer`.

- `ifc5-node-modules:/app/src/node_modules`
  - Named volume that holds Node dependencies for the dev container.
  - Avoids mixing host `node_modules` (for macOS/Windows) with the Linux environment inside Docker.
  - Makes the development environment more predictable and reproducible.

In short:

- Your **code** comes from the local Git checkout (bind-mounted).
- Your **dependencies** live inside a Docker volume, tailored for the Linux container.


Story & Motivation: Why Run Locally?
------------------------------------

This setup exists because real-world environments are often restrictive:

- Corporate networks may:
  - Block or throttle access to external sites.
  - Intercept or inspect HTTPS traffic.
  - Restrict WebGL or other advanced browser features.
- In some cases, you simply cannot use an externally hosted IFC viewer.

Running the viewer locally, inside Docker, solves this:

- The application is served from `localhost`.
- No external DNS, proxies, or firewalls are involved for the viewer itself.
- IFC/IFCX files do not leave your machine.
- It becomes much easier to:
  - Debug issues with specific models.
  - Reproduce bugs in a clean environment.
  - Test viewer changes safely, without touching any production system.


Requirements
------------

- Docker and Docker Compose.
- Git (to clone this repository).
- Terminal access.

You **do not** need Node.js installed on the host machine – Node is used inside the Docker images.


Quick Start – Staging (Self-Contained)
--------------------------------------

Use this if you just want to run the viewer in a predictable, self-contained way.

1. **Clone the IFC5 repository:**

   ```bash
   git clone https://github.com/buildingSMART/IFC5-development.git
   cd IFC5-development/web
   ```

2. **Start the container (staging):**

   ```bash
   ./up.sh
   ```

   This will:

   - Build the staging image using `web/docker/config/Dockerfile`.
   - Copy `src/` and `web/` into the image.
   - Run `npm install` and `npm run build-viewer` inside the image.
   - Start Nginx serving `/app/web/viewer`.

3. **Open the viewer in your browser:**

   - Visit `http://localhost:8080/`.

4. **Stop the container:**

   ```bash
   cd IFC5-development/web
   docker compose -f docker/compose/docker-compose-staging.yaml down
   ```


Quick Start – Development
-------------------------

Use this when you want to edit the IFCX core or viewer and see changes reflected locally.

1. **Clone the repository (if you haven’t already):**

   ```bash
   git clone https://github.com/buildingSMART/IFC5-development.git
   cd IFC5-development/web
   ```

2. **Start the dev container:**

   ```bash
   docker compose -f docker/compose/docker-compose-dev.yaml up --force-recreate
   ```

   This will:

   - Build the dev image from `docker/config/dev.Dockerfile`.
   - Mount your local `src/` as `/app/src`.
   - Mount your local `web/` as `/app/web`.
   - Attach the `ifc5-node-modules` volume to `/app/src/node_modules`.
   - Run `entrypoint.sh`, which:
     - Installs dependencies (`npm install`) in `/app/src`.
     - Runs `npm run build-viewer`.
     - Starts Nginx.

3. **Edit the code:**

   - **Viewer TypeScript:**
     - `src/viewer/render.ts`
     - Other files in `src/viewer/`.
   - **Viewer HTML and assets:**
     - `web/viewer/index.html`
     - `web/viewer/images/`.

4. **Rebuild after changes to TypeScript:**

   - The bundle is generated by `npm run build-viewer` when the container starts.
   - After editing `src/viewer/*.ts`, recreate the container:

     ```bash
     docker compose -f docker/compose/docker-compose-dev.yaml up --force-recreate
     ```

5. **Debugging:**

   - Open your browser’s DevTools.
   - The bundle is produced by `esbuild`, so paths in stack traces may differ slightly, but error messages still help you find problems in `src/viewer`.


Environment Variables
---------------------

Both dev and staging support a few useful environment variables.

- `PORT`
  - Host port to expose.
  - Default: `8080`.
  - Example:

    ```bash
    PORT=9090 ./up.sh
    ```

    The viewer will then be available at `http://localhost:9090/`.

- `WEB_IMAGE_TAG`
  - Tag for the `ifc5-web` image.
  - Default: `latest`.
  - Useful in CI pipelines or when you want to keep multiple versions.

- `DOCKERFILE`
  - Name of the Dockerfile to use.
  - Defaults:
    - Dev: `docker/config/dev.Dockerfile`.
    - Staging: `web/docker/config/Dockerfile`.
  - You can override for experiments, e.g.:

    ```bash
    DOCKERFILE=Dockerfile.custom ./up.sh
    ```


Troubleshooting
---------------

### 404 Not Found at `http://localhost:8080/`

Possible causes:

- The container is not running.
- For dev: the `web/` and `web/viewer/` folders are not mounted as expected.

Steps:

1. Check if the container is up:

   ```bash
   cd IFC5-development/web
   docker compose -f docker/compose/docker-compose-dev.yaml ps
   ```

2. Tear everything down and start again (dev):

   ```bash
   docker compose -f docker/compose/docker-compose-dev.yaml down -v
   docker compose -f docker/compose/docker-compose-dev.yaml up --force-recreate
   ```


### `npm error enoent Could not read package.json`

Typical message:

- `npm error path /app/src/package.json`
- `npm error enoent Could not read package.json`

This means `/app/src` does not contain the expected `package.json`.

Check:

- In dev:
  - That you did not change `docker-compose-dev.yaml` in a way that breaks `../../../src:/app/src`.
  - That you are running the compose from `IFC5-development/web`.
- In staging:
  - That the build context is the repository root (`../../..` from `web/docker/compose`).
  - That `COPY src ./src` is present in `web/docker/config/Dockerfile`.


### `sh: esbuild: not found`

This usually means dependencies have not been correctly installed for the container’s environment.

For dev:

```bash
cd IFC5-development/web
docker compose -f docker/compose/docker-compose-dev.yaml down -v
docker compose -f docker/compose/docker-compose-dev.yaml up --force-recreate
```

This recreates the `ifc5-node-modules` volume and reruns `npm install` inside the container.

For staging:

- Simply rebuild the image:

  ```bash
  cd IFC5-development/web
  docker compose -f docker/compose/docker-compose-staging.yaml build
  ```


### Port already in use

If port `8080` is busy:

```bash
PORT=9090 ./up.sh
```

Then open `http://localhost:9090/`.


Notes and Limitations
---------------------

- This setup is designed for **local development and local use**, not for production:
  - No TLS/HTTPS termination.
  - No reverse proxy hardening.
  - No load balancing.
- The viewer is served as a static site:
  - No backend.
  - No persistent server-side state.
- The primary goals are:
  - Make it easy to run and test the IFC5 viewer on restricted networks.
  - Provide a predictable environment for developing the viewer and IFCX core.


Summary
-------

- If you are a **user**:
  - Run `./up.sh` and open `http://localhost:8080/` (staging / self-contained mode).

- If you are a **developer**:
  - Use `docker-compose-dev.yaml` to mount your local `src/` and `web/`.
  - Recreate the dev container to rebuild the viewer bundle after code changes.

In both cases, everything runs locally on your machine, with no external services required.
