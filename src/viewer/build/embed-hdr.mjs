// Encodes the viewer's HDR environment map as a base64 data URI and writes
// it into a generated TypeScript module, so the offline bundle never issues
// an HTTP request (or a file:// relative fetch, which Chrome blocks under
// CORS) to load it.
//
// Run from `ifcx/src`: `node viewer/build/embed-hdr.mjs`

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HDR_SOURCE_PATH = path.join(
    __dirname, "..", "..", "..", "web", "viewer", "images", "wildflower_field_1k.hdr",
);
const OUTPUT_PATH = path.join(__dirname, "..", "environment-hdr.generated.ts");

const bytes = readFileSync(HDR_SOURCE_PATH);
const base64 = bytes.toString("base64");
const dataUri = `data:application/octet-stream;base64,${base64}`;

const body = [
    "// GENERATED FILE -- do not edit by hand.",
    "// Regenerate with: node viewer/build/embed-hdr.mjs",
    "// Source: web/viewer/images/wildflower_field_1k.hdr",
    "",
    `export const ENVIRONMENT_HDR_DATA_URI = "${dataUri}";`,
    "",
].join("\n");

writeFileSync(OUTPUT_PATH, body, "utf-8");
console.log(`wrote ${OUTPUT_PATH} (${bytes.length} bytes source, ${dataUri.length} chars data URI)`);
