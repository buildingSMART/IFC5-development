// Downloads the standard IFCX schema/layer files referenced by the example
// files under ifcx.dev and writes them into a single generated TypeScript
// module (`viewer/builtin-layers.generated.ts`) that the offline viewer
// bundles at build time via `BuiltinLayerProvider`.
//
// This is the *only* step in the offline viewer toolchain that touches the
// network, and it only runs when explicitly invoked (`npm run
// fetch-builtin-layers`) -- the generated file is committed, so the regular
// `build-viewer-offline` / `build-offline-html` scripts never need network
// access.
//
// Run from `ifcx/src`: `node viewer/build/fetch-builtin-layers.mjs`

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "builtin-layers.generated.ts");

// The full set of `https://ifcx.dev/...` URIs referenced by `imports[].uri`
// across every example file in this repository (see `examples/**/*.ifcx`).
// None of these layers import anything else themselves (verified: each
// fetched file's own `imports` array is empty), so there is no transitive
// closure to chase here.
const SCHEMA_URLS = [
    "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx",
    "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/prop@v5a.ifcx",
    "https://ifcx.dev/@openusd.org/usd@v1.ifcx",
    "https://ifcx.dev/@nlsfb/nlsfb@v1.ifcx",
    "https://ifcx.dev/@standards.buildingsmart.org/ifc/ifc-infra/infra@v1.0.0.ifcx",
    "https://ifcx.dev/@standards.buildingsmart.org/ifc/ifc-mat/ifc-mat@v1.0.0.ifcx",
];

async function main() {
    const entries = {};
    for (const url of SCHEMA_URLS) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        const json = await response.json();
        entries[url] = json;
        console.log(`fetched ${url} (id: ${json?.header?.id ?? "?"})`);
    }

    const body = [
        "// GENERATED FILE -- do not edit by hand.",
        "// Regenerate with: node viewer/build/fetch-builtin-layers.mjs",
        "",
        "import { IfcxFile } from '../ifcx-core/schema/schema-helper';",
        "",
        "export const BUILTIN_LAYERS: Record<string, IfcxFile> = " +
            JSON.stringify(entries, null, 2) +
            ";",
        "",
    ].join("\n");

    writeFileSync(OUTPUT_PATH, body, "utf-8");
    console.log(`wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
