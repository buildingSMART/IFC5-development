// @note This is a schema that covers the current example models,
// it does not cover the full breadth of the envisioned IFC5 schema. In
// addition, several questions on modularity and extensibility still
// need to be answered.

import "./ifcx-measures.tsp";

@pattern("</[A-Za-z0-9_/.:]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9]+>")
scalar code extends string;

model IfcxNode {
    identifier: path;
    children?: Record<string | null>;
    inherits?: Record<string | null>;
    attributes?: Record<unknown>;
}

model IfcxHeader {
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
    Relation: "Relation"
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

model RelationRestrictions
{
    type: string;
}

model IfcxValueDescription
{
    dataType: DataType;
    inherits?: string[];
    measure?: Measure;

    enumRestrictions?: EnumRestrictions;
    arrayRestrictions?: ArrayRestrictions;
    objectRestrictions?: ObjectRestrictions;
    relationRestrictions?: RelationRestrictions;
}

model IfcxSchema
{
    uri?: string;
    value: IfcxValueDescription;    
}

model IfcxFile {
    header: IfcxHeader;
    schemas: Record<IfcxSchema>;
    data: IfcxNode[]
}