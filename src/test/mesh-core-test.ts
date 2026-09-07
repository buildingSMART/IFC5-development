import { describe, it } from "./util/cappucino";
import { expect } from "chai";

import { AttributeTable } from "../ifcx-core/geometry/attribute-table";
import { InMemoryTableProvider, TierResolver } from "../ifcx-core/geometry/tier-resolver";
import { DisplayMesh, TIER_TABLE_NAMES } from "../ifcx-core/geometry/geometry-tiers";

// ── NDJSON attribute table ──

describe("attribute table", () => {
    it("reads entries by index", () => {
        const ndjson = '{"a":1}\n{"a":2}\n{"a":3}';
        const table = new AttributeTable("test", ndjson);
        expect(table.length).to.equal(3);
        expect(table.read<{ a: number }>(0).a).to.equal(1);
        expect(table.read<{ a: number }>(2).a).to.equal(3);
    });

    it("throws on out-of-range index", () => {
        const table = new AttributeTable("test", '{"a":1}');
        expect(() => table.read(5)).to.throw();
    });

    it("round-trips from entries", () => {
        const entries = [{ x: 1 }, { x: 2 }];
        const table = AttributeTable.fromEntries("test", entries);
        expect(table.length).to.equal(2);
        expect(table.read<{ x: number }>(1).x).to.equal(2);
        expect(table.toNDJSON()).to.equal('{"x":1}\n{"x":2}');
    });
});

// ── Tier resolver — selective loading ──
// The procedural rows are opaque on purpose: this module ships only the mesh
// type + the tier routing contract, so the guarantee under test is which tables
// are touched, not the payload shape.

describe("tier resolver", () => {
    function makeMeshTable(): AttributeTable {
        const meshes: DisplayMesh[] = [
            { points: [[0, 0, 0], [1, 0, 0], [1, 1, 0]], faceVertexIndices: [0, 1, 2] },
            { points: [[0, 0, 0], [2, 0, 0], [2, 2, 0]], faceVertexIndices: [0, 1, 2], derivedFrom: "procedural", tolerance: 0.001 },
        ];
        return AttributeTable.fromEntries(TIER_TABLE_NAMES.mesh, meshes);
    }

    function makeProcTable(): AttributeTable {
        return AttributeTable.fromEntries(TIER_TABLE_NAMES.procedural, [{ opaque: 1 }]);
    }

    function makeProvider(): InMemoryTableProvider {
        return new InMemoryTableProvider().addTable(makeMeshTable()).addTable(makeProcTable());
    }

    it("resolves display mesh when mesh tier is requested", () => {
        const provider = makeProvider();
        const resolver = new TierResolver(provider, ["mesh"]);
        const mesh = resolver.resolveDisplayMesh(0);
        expect(mesh).to.not.be.null;
        expect(mesh!.points.length).to.equal(3);
        expect(mesh!.faceVertexIndices).to.deep.equal([0, 1, 2]);
    });

    it("a mesh-only consumer never reads the procedural table", () => {
        const provider = makeProvider();
        const resolver = new TierResolver(provider, ["mesh"]);

        resolver.resolveDisplayMesh(0);
        resolver.resolveDisplayMesh(1);
        // Even an explicit request for a non-allowed tier is refused, not read.
        expect(resolver.resolveByRef(TIER_TABLE_NAMES.procedural, 0)).to.be.null;

        expect(resolver.accessLog.has(TIER_TABLE_NAMES.mesh)).to.be.true;
        expect(resolver.accessLog.has(TIER_TABLE_NAMES.procedural)).to.be.false;
    });

    it("analysis config loads only procedural, not mesh", () => {
        const provider = makeProvider();
        const resolver = new TierResolver(provider, ["procedural"]);

        expect(resolver.resolveByRef(TIER_TABLE_NAMES.procedural, 0)).to.not.be.null;
        expect(resolver.resolveDisplayMesh(0)).to.be.null;

        expect(resolver.accessLog.has(TIER_TABLE_NAMES.procedural)).to.be.true;
        expect(resolver.accessLog.has(TIER_TABLE_NAMES.mesh)).to.be.false;
    });

    it("preserves mesh derivation metadata", () => {
        const provider = new InMemoryTableProvider().addTable(makeMeshTable());
        const resolver = new TierResolver(provider, ["mesh"]);

        expect(resolver.resolveDisplayMesh(0)!.derivedFrom).to.be.undefined;
        const mesh1 = resolver.resolveDisplayMesh(1);
        expect(mesh1!.derivedFrom).to.equal("procedural");
        expect(mesh1!.tolerance).to.equal(0.001);
    });
});
