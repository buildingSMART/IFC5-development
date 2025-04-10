/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ArrayRestrictions: {
            min?: number;
            max?: number;
            value: components["schemas"]["IfcxValueDescription"];
        };
        /** @enum {string} */
        DataType: "Real" | "Boolean" | "Integer" | "String" | "DateTime" | "Enum" | "Array" | "Object" | "Relation";
        EnumRestrictions: {
            options: string[];
        };
        IfcxFile: {
            header: components["schemas"]["IfcxHeader"];
            schemas: {
                [key: string]: components["schemas"]["IfcxSchema"];
            };
            data: components["schemas"]["IfcxNode"][];
        };
        IfcxHeader: {
            version: string;
            author: string;
            timestamp: string;
        };
        IfcxNode: {
            name: components["schemas"]["path"];
            children?: {
                [key: string]: string | null;
            };
            inherits?: {
                [key: string]: string | null;
            };
            attributes?: {
                [key: string]: unknown;
            };
        };
        IfcxSchema: {
            uri?: string;
            value: components["schemas"]["IfcxValueDescription"];
        };
        IfcxValueDescription: {
            dataType: components["schemas"]["DataType"];
            measure?: components["schemas"]["Measure"];
            enumRestrictions?: components["schemas"]["EnumRestrictions"];
            arrayRestrictions?: components["schemas"]["ArrayRestrictions"];
            objectRestrictions?: components["schemas"]["ObjectRestrictions"];
            relationRestrictions?: components["schemas"]["RelationRestrictions"];
        };
        /** @enum {string} */
        Measure: "Plane angle" | "Thermodynamic temperature" | "Electric current" | "Time" | "Frequency" | "Mass" | "Length" | "Linear velocity" | "Force" | "Pressure" | "Area" | "Energy" | "Power" | "Volume";
        ObjectRestrictions: {
            values: {
                [key: string]: components["schemas"]["IfcxValueDescription"];
            };
        };
        RelationRestrictions: {
            type: string;
        };
        code: string;
        path: string;
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
