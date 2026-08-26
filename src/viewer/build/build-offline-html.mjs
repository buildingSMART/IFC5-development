// Assembles the single, fully self-contained `ifcx-viewer-offline.html`:
// the existing viewer page's HTML/CSS, the IIFE-bundled viewer+three.js
// (built by `npm run build-viewer-offline`, which already has the HDR
// environment map and the builtin IFCX schema layers embedded in it, see
// `environment-hdr.generated.ts` / `builtin-layers.generated.ts`), with the
// import map and the ES module script replaced by plain inline <script>
// tags. No <script type="module">, no importmap, no external stylesheet
// link, no fetch of viewer assets.
//
// Run from `ifcx/src` (after `npm run build-viewer-offline`):
//   node viewer/build/build-offline-html.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const TEMPLATE_PATH = path.join(REPO_ROOT, "web", "viewer", "index.html");
const BUNDLE_PATH = path.join(REPO_ROOT, "web", "viewer", "standalone", "render.js");
const OUTPUT_PATH = path.join(REPO_ROOT, "web", "viewer", "standalone", "ifcx-viewer-offline.html");

function removeBetween(html, startMarker, endMarker) {
    const start = html.indexOf(startMarker);
    if (start === -1) {
        throw new Error(`marker not found: ${startMarker}`);
    }
    const end = html.indexOf(endMarker, start);
    if (end === -1) {
        throw new Error(`end marker not found after ${startMarker}: ${endMarker}`);
    }
    return html.slice(0, start) + html.slice(end + endMarker.length);
}

function main() {
    let html = readFileSync(TEMPLATE_PATH, "utf-8");
    const bundle = readFileSync(BUNDLE_PATH, "utf-8");

    // 1. Drop the external Google Fonts stylesheet (Material Symbols icons
    //    fall back to their plain ligature text, e.g. "deployed_code",
    //    which is a purely cosmetic degradation).
    html = html.replace(
        /\n?\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*" \/>\n?/,
        "\n",
    );

    // 2. Drop the <script type="importmap"> block entirely -- the bundle
    //    below has three.js (and OrbitControls/RGBELoader/PCDLoader)
    //    compiled in, so nothing needs to resolve "three" as a module
    //    specifier anymore.
    html = removeBetween(html, '<script type="importmap">', "</script>");

    // 3. Replace the ES module wiring script with a plain classic script:
    //    no `import`, calling the IIFE global's default export instead.
    const moduleStart = html.indexOf('<script type="module">');
    const moduleEnd = html.indexOf("</script>", moduleStart) + "</script>".length;
    if (moduleStart === -1 || moduleEnd === -1) {
        throw new Error("module wiring script not found");
    }
    let wiring = html.slice(moduleStart, moduleEnd);
    wiring = wiring.replace('<script type="module">', "<script>");
    wiring = wiring.replace("import addModel from './render.mjs';\n\n        ", "");
    wiring = wiring.replaceAll("addModel(", "window.IFCXViewer.default(");

    // 4. Inline the bundle in its own <script> tag immediately before the
    //    wiring script, so window.IFCXViewer exists by the time it runs.
    const bundleScript = `<script>\n${bundle}\n</script>\n    `;

    html = html.slice(0, moduleStart) + bundleScript + wiring + html.slice(moduleEnd);

    writeFileSync(OUTPUT_PATH, html, "utf-8");

    const remaining = [];
    if (html.includes("importmap")) remaining.push("importmap");
    if (/type=["']module["']/.test(html)) remaining.push('type="module"');
    if (html.includes("fonts.googleapis.com")) remaining.push("fonts.googleapis.com");
    if (html.includes("cdn.jsdelivr.net")) remaining.push("cdn.jsdelivr.net");
    if (remaining.length > 0) {
        throw new Error(`offline HTML still references: ${remaining.join(", ")}`);
    }

    console.log(`wrote ${OUTPUT_PATH} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
}

main();
