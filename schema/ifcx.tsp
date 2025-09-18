// @note This is a schema that covers the current example models,
// it does not cover the full breadth of the envisioned IFC5 schema. In
// addition, several questions on modularity and extensibility still
// need to be answered.

import "./ifcx-quantity-kinds.tsp";

@pattern("</[A-Za-z0-9_/.:]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9]+>")
scalar code extends string;

model IfcxNode {
    path: path;
    children?: Record<string | null>;
    inherits?: Record<string | null>;
    attributes?: Record<unknown>;
}

model IfcxHeader {
    id: string;             // identifier of the dataset; name or path e.g. "ifc5.technical.buildingsmart.org/examples/example@v1.ifcx"
    ifcxVersion: string;    // "ifcx_alpha"
    dataVersion: string;    // "1.0.0"
    author: string;         // who created the dataset, e.g. "John.Doe@mail.com"
    timestamp: string;      // ISO 8601 datetime e.g. "2025-06-25"
}

enum DataType
{
    Real: "Real",
    Boolean: "Boolean",
    Integer: "Integer",
    String: "String",
    DateTime: "DateTime",
    Enum: "Enum",
    Array: "Array",
    Object: "Object",
    Reference: "Reference",
    Blob: "Blob",
    Union: "Union"
}

model EnumRestrictions
{
    options: string[];
}

model ArrayRestrictions
{
    min?: numeric;
    max?: numeric;

    value: IfcxValueDescription;
}

model ObjectRestrictions
{
    values: Record<IfcxValueDescription>;
}

model UnionRestrictions
{
    values: IfcxValueDescription[];
}

model IfcxValueDescription
{
    dataType?: DataType;
    optional?: boolean;
    inherits?: string[];
    quantityKind?: QuantityKind;

    enumRestrictions?: EnumRestrictions;
    arrayRestrictions?: ArrayRestrictions;
    objectRestrictions?: ObjectRestrictions;
    unionRestrictions?: UnionRestrictions;
    ref?: string;
}

model IfcxSchema
{
    uri?: string;
    value: IfcxValueDescription;    
}

model ImportNode
{
    uri: string;
    integrity?: string;
}

model IfcxFile {
    header: IfcxHeader;
    "imports": ImportNode[];
    schemas: Record<IfcxSchema>;
    data: IfcxNode[]
}