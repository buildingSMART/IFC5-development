// @note This is a schema that attempts to depart from the current Alpha schema without breaking backwards compatibility of the viewer, examples & tooling

import "@typespec/json-schema";

using JsonSchema;

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

model AttributeReference
{
    typeID: string;
    componentIndex: uint32;
}

model OpinionatedValue<T>
{
    opinion: OpinionType;
    name: string; // may make this guid
    value?: T;
}

model IfcxNode {
    path: path;
    children?: OpinionatedValue<path>[];
    inherits?: OpinionatedValue<path>[];
    attributes?: OpinionatedValue<AttributeReference>[];
}

model IfcxProvenanceHeader
{
    id: string;             // identifier of the full dataset; name or path e.g. "ifc5.technical.buildingsmart.org/examples/example@v1.ifcx"
    dataVersion: string;    // "1.0.0"
    author: string;         // who created the dataset, e.g. "John.Doe@mail.com"
    timestamp: string;      // ISO 8601 datetime e.g. "2025-06-25"
}

model IfcxFileHeader {
    ifcxVersion: string;    // "ifcx_post_alpha"
}

model ImportNode
{
    uri: string;
    integrity?: string;
}

enum AttributeFileType
{
    NDJSON,
    PARQUET
}

model AttributeTableReference
{
    filename: attribute_file_name;
    type: AttributeFileType;
    schema: unknown;
}

model IfcxDataSection
{
    header: IfcxProvenanceHeader;
    nodes: IfcxNode[];
}

@jsonSchema
model IfcxIndexFile {
    header: IfcxFileHeader;
    "imports": ImportNode[];
    attributeTables: AttributeTableReference[];
    sections: IfcxDataSection[];
}