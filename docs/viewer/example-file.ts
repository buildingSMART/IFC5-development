import { components } from "../../schema/out/ts/ifcx";
type IfcxFile = components["schemas"]["IfcxFile"];

export function ExampleFile()
{
    return {
        header: {
            version: "ifcx_alpha",
            author: "tom",
            timestamp: "now",
            defaultNode: "root"
        },
        schemas: {
            "a": {
                code: "example::attribute",
                uri: "http://www.example.com/attribute",
                value: {
                    dataType: "String"
                }
            },
            "b": {
                code: "example::fixed_attribute",
                uri: "http://www.example.com/fixed_attribute",
                value: {
                    dataType: "Boolean"
                }
            },
            "c": {
                code: "example::fixed_attribute",
                uri: "http://www.example.com/fixed_attribute",
                value: {
                    dataType: "DateTime"
                }
            },
            "d": {
                code: "example::fixed_attribute",
                uri: "http://www.example.com/fixed_attribute",
                value: {
                    dataType: "Enum",
                    enumRestrictions: {
                        options: ["a", "b", "c"]
                    }
                }
            },
            "e": {
                code: "example::fixed_attribute",
                uri: "http://www.example.com/fixed_attribute",
                value: {
                    dataType: "Integer"
                }
            },
            "f": {
                code: "example::object_attr",
                uri: "http://www.example.com/fixed_attribute",
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
            "g": {
                code: "example::object_attr",
                uri: "http://www.example.com/fixed_attribute",
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
                "attribute1": {
                    schema: "a",
                    value: "stringvalue"
                },
                "attribute2": {
                    schema: "b",
                    value: true
                }
            }
        }]
    } as IfcxFile;
}