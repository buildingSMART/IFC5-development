

/*
openapi: 3.0.0
info:
  title: (title)
  version: 0.0.0
tags: []
paths: {}
components:
  schemas:

*/

import { IfcxFile, IfcxValueDescription } from "./schema-helper";

class yml
{
    lines: string[] = [];
    prefix = "";
    push()
    {
        this.prefix += "  ";
    }
    pop()
    {
        this.prefix = this.prefix.substring(2);
    }

    line(str: string)
    {
        this.lines.push(`${this.prefix}${str}`);
    }

    str()
    {
        return this.lines.join("\n");
    }
}

function PushSchemaValue(openAPI: yml, schema: IfcxValueDescription)
{
    if (schema.dataType === "String")
    {
        openAPI.line("type: string");
    }
    else if (schema.dataType === "Boolean")
    {
        openAPI.line("type: boolean");
    }
    else if (schema.dataType === "DateTime")
    {
        openAPI.line("type: date");
    }
    else if (schema.dataType === "Enum")
    {
        openAPI.line("type: string");
        openAPI.line("enum: ");
        openAPI.push();
        schema.enumRestrictions?.options.forEach((option) => {
            openAPI.line(`- ${option}`);
        });
        openAPI.pop();
    }
    else if (schema.dataType === "Integer")
    {
        openAPI.line("type: number");
    }
    else if (schema.dataType === "Real")
    {
        openAPI.line("type: number");
    }
    else if (schema.dataType === "Object")
    {
        openAPI.line("type: object");
        openAPI.line("properties:");
        openAPI.push();
        Object.keys(schema.objectRestrictions!.values).forEach((valueName) => {
            let value = schema.objectRestrictions!.values[valueName];
            openAPI.line(`${valueName}:`);
            openAPI.push();
            PushSchemaValue(openAPI, value);
            openAPI.pop();

        });
        openAPI.pop();
    }
    else if (schema.dataType === "Array")
    {
        openAPI.line("type: array");
        openAPI.line("items:");
        openAPI.push();
        openAPI.push();
        PushSchemaValue(openAPI, schema.arrayRestrictions!.value);
        openAPI.pop();
        openAPI.pop();
    }
    else
    {
        throw new Error(`unknown schema type ${schema.dataType}`);
    }
}

export function SchemasToOpenAPI(file: IfcxFile)
{
    let openAPI = new yml();
    openAPI.line("openapi: 3.0.0");
    openAPI.line("info:");
    openAPI.push();
    openAPI.line("title: (title)");
    openAPI.line("version: 0.0.0");
    openAPI.pop();
    openAPI.line("tags: []");
    openAPI.line("paths: {}");
    openAPI.line("components:");
    openAPI.push();
    openAPI.line("schemas:");
    openAPI.push();

    Object.keys(file.schemas).forEach((schemaID) => {
        let schema = file.schemas[schemaID];

        openAPI.line(`${schemaID}:`);
        openAPI.push();
        PushSchemaValue(openAPI, schema.value);
        openAPI.pop();
    });
    return openAPI.str();
}