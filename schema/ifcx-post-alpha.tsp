// @note This is a schema that attempts to depart from the current Alpha schema without breaking backwards compatibility of the viewer, examples & tooling

import "./ifcx-quantity-kinds.tsp";

@pattern("</(\\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\\}{0,1})[0-9a-zA-Z\\/]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9.]+:[A-Za-z0-9]+>")
scalar attribute_uri extends string;

@pattern("</[A-Za-z0-9.]+")
scalar attribute_file_name extends string;

enum OpinionType
{
    PASS_THROUGH, // I have no opinion
    DELETE, // my opinion is that this attribute should not have a value
    VALUE // my opinion is that the attribute should have a value
}

model OpinionWithValue<T>
{
    opinion: OpinionType.VALUE;
    value: T;
}

model OpinionPassthrough
{
    opinion: OpinionType.PASS_THROUGH;
}

model OpinionDelete
{
    opinion: OpinionType.DELETE;
}

alias OpinionatedValue<T> = OpinionWithValue<T> | OpinionPassthrough | OpinionDelete;

model IfcxNode {
    path: path;
    children?: Record<OpinionatedValue<path>>;
    inherits?: Record<OpinionatedValue<path>>;
    attributes?: Record<OpinionatedValue<attribute_uri>>;
}

model IfcxHeader {
    id: string;             // identifier of the dataset; name or path e.g. "ifc5.technical.buildingsmart.org/examples/example@v1.ifcx"
    ifcxVersion: string;    // "ifcx_post_alpha"
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

enum AttributeFileType
{
    JSON,
    PARQUET
}

model AttributeTableReference
{
    filename: attribute_file_name;
    type: AttributeFileType;
    schema: IfcxSchema;
}

model IfcxFile {
    header: IfcxHeader;
    "imports": ImportNode[];
    attributeTables: AttributeTableReference[];
    nodes: IfcxNode[]
}