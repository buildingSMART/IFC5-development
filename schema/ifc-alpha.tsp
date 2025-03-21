// @note This is a schema that covers the current two example models,
// it does not cover the full breadth of the envisioned IFC5 schema. In
// addition, several questions on modularity and extensibility still
// need to be answered.

import "@typespec/json-schema";

using TypeSpec.JsonSchema;

@pattern("</[A-Za-z0-9_/.:]+>")
scalar path extends string;

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

model IfcxSchema
{
    // tbd
}

@jsonSchema
model IfcxFile {
    header: IfcxHeader;
    schemas: Record<IfcxSchema>;
    data: IfcxNode[]
}