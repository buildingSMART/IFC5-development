// Tier-aware resolver that loads only requested geometry tiers from attribute
// tables. Enforces the core constraint: a consumer that requests only Tier M
// never reads any other tier's table.

import { AttributeTable } from "./attribute-table";
import { DisplayMesh, GeometryTier, TIER_TABLE_NAMES } from "./geometry-tiers";

export interface AttributeTableProvider {
    getTable(filename: string): AttributeTable | null;
}

export class TierResolver {
    private provider: AttributeTableProvider;
    private allowedTiers: Set<GeometryTier>;
    private _accessLog: Set<string> = new Set();

    constructor(provider: AttributeTableProvider, requestedTiers: GeometryTier[]) {
        this.provider = provider;
        this.allowedTiers = new Set(requestedTiers);
    }

    /** Table names the resolver read, in access order. */
    get accessLog(): ReadonlySet<string> {
        return this._accessLog;
    }

    private getTableForTier(tier: GeometryTier): AttributeTable | null {
        if (!this.allowedTiers.has(tier)) {
            return null;
        }
        const tableName = TIER_TABLE_NAMES[tier];
        const table = this.provider.getTable(tableName);
        if (table) this._accessLog.add(tableName);
        return table;
    }

    resolveDisplayMesh(componentIndex: number): DisplayMesh | null {
        const table = this.getTableForTier("mesh");
        if (!table) return null;
        return table.read<DisplayMesh>(componentIndex);
    }

    /**
     * Resolve a row from the tier table named by typeID, gated by the requested
     * tiers: returns null if typeID is not a known tier, or its tier was not
     * requested. So a mesh-only resolver never reads another tier's table.
     */
    resolveByRef(typeID: string, componentIndex: number): unknown {
        for (const [tier, tableName] of Object.entries(TIER_TABLE_NAMES)) {
            if (typeID === tableName) {
                const table = this.getTableForTier(tier as GeometryTier);
                return table ? table.read(componentIndex) : null;
            }
        }
        return null;
    }
}

export class InMemoryTableProvider implements AttributeTableProvider {
    private tables: Map<string, AttributeTable> = new Map();

    addTable(table: AttributeTable): this {
        this.tables.set(table.filename, table);
        return this;
    }

    getTable(filename: string): AttributeTable | null {
        return this.tables.get(filename) ?? null;
    }
}
