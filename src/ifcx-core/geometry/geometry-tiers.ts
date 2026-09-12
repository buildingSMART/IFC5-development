// Tier-M display mesh + the tier routing keys — the minimal geometry core.
// A Tier-M mesh is a plain JSON triangle mesh (points + triangle indices) that
// maps to both UsdGeomMesh and glTF and is readable without a USD/glTF runtime.
// The procedural (P) and Brep (B) catalogs are separate, proposed independently.

// =============================================================================
// Tier M — Display mesh
// =============================================================================

export type MeshSourceTier = "procedural" | "brep";

/**
 * Maps a contiguous slice of `faceVertexIndices` back to the source face that
 * produced it. Present when the mesh was derived from a Brep — lets a consumer
 * apply per-face data authored on the source face node.
 */
export interface MeshFaceGroup {
    /** Start index in faceVertexIndices (multiple of 3) */
    start: number;
    /** Number of indices in this group (multiple of 3) */
    count: number;
    /** Position of the face in the source faces[] array */
    faceIndex: number;
    /** Stable name of the source face node (e.g. "Face_3"). */
    faceName?: string;
}

export interface DisplayMesh {
    /** Vertex positions, one [x, y, z] per entry. */
    points: number[][];
    /** Triangle list: every three consecutive entries index `points` to form one
     *  triangle (face counts are implicit — this tier is triangles only). */
    faceVertexIndices: number[];
    normals?: number[][];
    uvs?: number[][];
    /** Higher tier this mesh was derived from, if any. Absent means authored. */
    derivedFrom?: MeshSourceTier;
    /** Tessellation tolerance in source units */
    tolerance?: number;
    /** Opaque content hash of the source-tier record, for staleness/cache
     *  validation. The hashing scheme is proposed separately. */
    sourceHash?: string;
    /** Triangle-range → source-face mapping */
    faceGroups?: MeshFaceGroup[];
}

// =============================================================================
// Tier identifiers and table mapping
// =============================================================================

// The tier taxonomy is the routing contract: each tier maps to a table name so
// a consumer can route by tier. Payload schemas for procedural/brep/external
// are out of scope for this module; their keys are reserved here so the routing
// contract is complete. `external` is reserved for opaque interop references.
export type GeometryTier = "procedural" | "mesh" | "brep" | "external";

export const TIER_TABLE_NAMES: Record<GeometryTier, string> = {
    procedural: "ifcx.geom.proc",
    mesh: "ifcx.geom.mesh",
    brep: "ifcx.geom.brep",
    external: "ifcx.geom.ext",
};
