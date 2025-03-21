// @note This is a schema that covers the current two example models,
// it does not cover the full breadth of the envisioned IFC5 schema. In
// addition, several questions on modularity and extensibility still
// need to be answered.

import "@typespec/json-schema";

import "./ifcx-measures.tsp";

using TypeSpec.JsonSchema;

@pattern("</[A-Za-z0-9_/.:]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9]+>")
scalar code extends string;

@jsonSchema
model IfcxNode {
    name: path;
    children: Record<string | null>;
    inherits: Record<string | null>;
    attributes: Record<unknown>;
}

@jsonSchema
model IfcxHeader {
    version: string;
    author: string;
    timestamp: string;
    defaultNode: path;
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
    Object: "Object"
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
    measure?: Measure;

    enumRestrictions?: EnumRestrictions;
    arrayRestrictions?: ArrayRestrictions;
    objectRestrictions?: ObjectRestrictions;
}

model IfcxSchema
{
    code: code;
    uri?: string;
    value: IfcxValueDescription;    
}

@jsonSchema
model IfcxFile {
    header: IfcxHeader;
    schemas: Record<IfcxSchema>;
    data: IfcxNode[]
}