import { components } from "../../schema/out/ts/ifcx";
type IfcxFile = components["schemas"]["IfcxFile"];

export function ExampleFile()
{
    return {
        header: {
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now"
        },
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
            name: "root",
            children: {},
            inherits: {},
            attributes: {
                "example::string": "stringvalue",
                "example::boolean": true
            }
        }]
    } as IfcxFile;
}