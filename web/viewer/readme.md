# Viewer

These are the viewer application distributables, their source can be found at `/src/viewer`. Please do not modify `render.mjs` directly.

## Offline / standalone build

`index.html` + `render.mjs` need a local HTTP server (browsers block ES module
`import` and most local `fetch()` calls under `file://`) and network access
to `https://ifcx.dev` for the standard IFCX schema layers.

For a build that needs neither, run from `ifcx/src`:

```bash
npm run build-offline-html
```

This bundles `render.ts` (three.js, OrbitControls, RGBELoader, PCDLoader,
and the whole `ifcx-core` composition/schema/layers stack included, no
`--external:three`) as a classic IIFE into `standalone/render.js` (gitignored,
matching this repo's `*.js` convention), then inlines it -- together with the
page's existing CSS -- into a single file: `standalone/ifcx-viewer-offline.html`.
That file has no `<script type="module">`, no import map, no external
stylesheet link, and never calls `fetch()` on its own:

- The environment HDR (`images/wildflower_field_1k.hdr`) is embedded as a
  base64 data URI (`viewer/environment-hdr.generated.ts`).
- The standard schema layers referenced by `imports[].uri` across
  `examples/**/*.ifcx` (`ifc@v5a`, `prop@v5a`, `usd@v1`, `nlsfb@v1`,
  `infra@v1.0.0`, `ifc-mat@v1.0.0`) are embedded as a lookup table
  (`viewer/builtin-layers.generated.ts`) consulted by a new
  `BuiltinLayerProvider`, which replaces the network-backed
  `FetchLayerProvider` in `compose-flattened.ts`. A schema not embedded
  here (and not one of the files you loaded yourself) fails with a clear
  error -- it is never fetched.

Regenerating those two embedded files (`npm run fetch-builtin-layers`,
`npm run embed-hdr`) is the *only* step that touches the network; both are
already committed so the default `build-offline-html` build does not need
connectivity.

Open the result directly, no server needed:

```text
file:///.../web/viewer/standalone/ifcx-viewer-offline.html
```

The one thing that still needs the network is the optional "load from URL"
field in the page itself -- it is a manual, user-typed action, not something
the file does on its own.

The file is large (~3 MB: three.js + the HDR + the schema layers) but is
committed, so it can be opened straight from a checkout without running the
build first. Re-run `npm run build-offline-html` after changing `render.ts`
(or either generated embed) to refresh it.