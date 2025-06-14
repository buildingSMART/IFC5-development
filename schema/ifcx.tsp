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
    id: string;
    version: string;
    author: string;
    timestamp: string;
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
    Blob: "Blob"
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

model IfcxValueDescription
{
    dataType: DataType;
    optional?: boolean;
    inherits?: string[];
    quantityKind?: QuantityKind;

    enumRestrictions?: EnumRestrictions;
    arrayRestrictions?: ArrayRestrictions;
    objectRestrictions?: ObjectRestrictions;
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