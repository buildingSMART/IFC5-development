import { DataType, IfcxFile, IfcxNode, IfcxSchema, ImportNode } from "../ifcx-core/schema/schema-helper";

// TODO: make builder

export function ExampleFile(attribute: string = "example::string", value: any = "stringvalue")
{
    return {
        header: {
            id: "",
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now"
        },
        imports: [],
        schemas: {
            "example::string": {
                uri: "http://www.example.com/string",
                value: {
                    dataType: "String"
                }
            },
            "example::boolean": {
                uri: "http://www.example.com/boolean",
                value: {
                    dataType: "Boolean"
                }
            },
            "example::datetime": {
                uri: "http://www.example.com/datetime",
                value: {
                    dataType: "DateTime"
                }
            },
            "example::enum": {
                uri: "http://www.example.com/enum",
                value: {
                    dataType: "Enum",
                    enumRestrictions: {
                        options: ["a", "b", "c"]
                    }
                }
            },
            "example::integer": {
                uri: "http://www.example.com/integer",
                value: {
                    dataType: "Integer"
                }
            },
            "example::real": {
                uri: "http://www.example.com/integer",
                value: {
                    dataType: "Real",
                    quantityKind: "Length"
                }
            },
            "example::object": {
                uri: "http://www.example.com/object",
                value: {
                    dataType: "Object",
                    objectRestrictions: {
                        values: {
                            "val1": {
                                dataType: "String"
                            },
                            "val2": {
                                dataType: "Enum",
                                enumRestrictions: {
                                    options: ["a", "b", "c"]
                                }
                            }
                        }
                    }
                }
            },
            "example::optional_object": {
                uri: "http://www.example.com/object",
                value: {
                    dataType: "Object",
                    objectRestrictions: {
                        values: {
                            "val1": {
                                dataType: "String",
                                optional: true
                            },
                            "val2": {
                                dataType: "Enum",
                                enumRestrictions: {
                                    options: ["a", "b", "c"]
                                }
                            }
                        }
                    }
                }
            },
            "example::array": {
                uri: "http://www.example.com/array",
                value: {
                    dataType: "Array",
                    arrayRestrictions: {
                        value: {
                            dataType: "Enum",
                            enumRestrictions: {
                                options: ["a", "b", "c"]
                            }
                        }
                    }
                }
            },
        },
        data: [{
            path: "root",
            children: {},
            inherits: {},
            attributes: {
                [attribute]: value,
                "example::boolean": true
            }
        }]
    } as IfcxFile;
}

export function ExampleFileMissingSchema()
{
    return {
        header: {
            id: "",
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now"
        },
        imports: [],
        schemas: {},
        data: [{
            path: "root",
            children: {},
            inherits: {},
            attributes: {
                "example::missing::schema": "stringvalue",
            }
        }]
    } as IfcxFile;
}

export function ExampleFileWithSchema(datatype: DataType, data: any)
{
    return {
        header: {
            id: "",
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now"
        },
        imports: [],
        schemas: {
            "example::attribute": {
                value: {
                    dataType: datatype
                }
            },
        },
        data: [{
            path: "root",
            children: {},
            inherits: {},
            attributes: {
                "example::attribute": data,
            }
        }]
    } as IfcxFile;
}

export function ExampleFileWithImport(id: string, value: string, imports: ImportNode[] = [])
{
    return {
        header: {
            id: id,
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now"
        },
        imports: imports,
        schemas: {
            "example::attribute": {
                value: {
                    dataType: "String"
                }
            },
        },
        data: [{
            path: "root",
            children: {},
            inherits: {},
            attributes: {
                "example::attribute": value,
            }
        }]
    } as IfcxFile;
}

export function StringValueSchema()
{
    return {
        value: {
            dataType: "String"
        }
    } as IfcxSchema;
}

export function NodeWithAttr(id: string, attr: string, value: string)
{
    return {
            path: id,
            children: {},
            inherits: {},
            attributes: {
                [attr]: value,
            }
        }
}

function EmptyFile()
{
    return {
        header: {
            id: "",
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now"
        },
        imports: [],
        schemas: {
        },
        data: []
    } as IfcxFile;
}

export class IfcxFileBuilder
{
    private file: IfcxFile;

    constructor()
    {
        this.file = EmptyFile();
    }

    Id(id: string)
    {
        this.file.header.id = id;
        return this;
    }

    Import(us: ImportNode)
    {
        this.file.imports.push(us);
        return this;
    }

    Schema(name: string, schema: IfcxSchema)
    {
        this.file.schemas[name] = schema;
        return this;
    }    

    Node(node: IfcxNode)
    {
        this.file.data.push(node);
        return this;
    }

    Build()
    {
        return this.file;
    }
}