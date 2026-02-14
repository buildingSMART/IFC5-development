// To parse this data:
//
//   import { Convert, IfcxIndexFile } from "./file";
//
//   const ifcxIndexFile = Convert.toIfcxIndexFile(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface IfcxIndexFile {
    attributeTables: AttributeTableElement[];
    header:          IfcxIndexFileHeader;
    imports:         ImportElement[];
    sections:        SectionElement[];
    [property: string]: any;
}

export interface AttributeTableElement {
    filename: string;
    schema:   any;
    type:     Type;
    [property: string]: any;
}

export enum Type {
    Ndjson = "NDJSON",
    Parquet = "PARQUET",
}

export interface IfcxIndexFileHeader {
    ifcxVersion: string;
    [property: string]: any;
}

export interface ImportElement {
    integrity?: string;
    uri:        string;
    [property: string]: any;
}

export interface SectionElement {
    header: SectionHeader;
    nodes:  NodeElement[];
    [property: string]: any;
}

export interface SectionHeader {
    author:      string;
    dataVersion: string;
    id:          string;
    timestamp:   string;
    [property: string]: any;
}

export interface NodeElement {
    attributes?: AttributeElement[];
    children?:   ChildElement[];
    inherits?:   ChildElement[];
    path:        string;
    [property: string]: any;
}

export interface AttributeElement {
    name:    string;
    opinion: Opinion;
    value:   Value;
    [property: string]: any;
}

export enum Opinion {
    Delete = "DELETE",
    PassThrough = "PASS_THROUGH",
    Value = "VALUE",
}

export interface Value {
    componentIndex: number;
    fileIndex:      number;
    [property: string]: any;
}

export interface ChildElement {
    name:    string;
    opinion: Opinion;
    value:   string;
    [property: string]: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toIfcxIndexFile(json: string): IfcxIndexFile {
        return cast(JSON.parse(json), r("IfcxIndexFile"));
    }

    public static ifcxIndexFileToJson(value: IfcxIndexFile): string {
        return JSON.stringify(uncast(value, r("IfcxIndexFile")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "IfcxIndexFile": o([
        { json: "attributeTables", js: "attributeTables", typ: a(r("AttributeTableElement")) },
        { json: "header", js: "header", typ: r("IfcxIndexFileHeader") },
        { json: "imports", js: "imports", typ: a(r("ImportElement")) },
        { json: "sections", js: "sections", typ: a(r("SectionElement")) },
    ], "any"),
    "AttributeTableElement": o([
        { json: "filename", js: "filename", typ: "" },
        { json: "schema", js: "schema", typ: "any" },
        { json: "type", js: "type", typ: r("Type") },
    ], "any"),
    "IfcxIndexFileHeader": o([
        { json: "ifcxVersion", js: "ifcxVersion", typ: "" },
    ], "any"),
    "ImportElement": o([
        { json: "integrity", js: "integrity", typ: u(undefined, "") },
        { json: "uri", js: "uri", typ: "" },
    ], "any"),
    "SectionElement": o([
        { json: "header", js: "header", typ: r("SectionHeader") },
        { json: "nodes", js: "nodes", typ: a(r("NodeElement")) },
    ], "any"),
    "SectionHeader": o([
        { json: "author", js: "author", typ: "" },
        { json: "dataVersion", js: "dataVersion", typ: "" },
        { json: "id", js: "id", typ: "" },
        { json: "timestamp", js: "timestamp", typ: "" },
    ], "any"),
    "NodeElement": o([
        { json: "attributes", js: "attributes", typ: u(undefined, a(r("AttributeElement"))) },
        { json: "children", js: "children", typ: u(undefined, a(r("ChildElement"))) },
        { json: "inherits", js: "inherits", typ: u(undefined, a(r("ChildElement"))) },
        { json: "path", js: "path", typ: "" },
    ], "any"),
    "AttributeElement": o([
        { json: "name", js: "name", typ: "" },
        { json: "opinion", js: "opinion", typ: r("Opinion") },
        { json: "value", js: "value", typ: r("Value") },
    ], "any"),
    "Value": o([
        { json: "componentIndex", js: "componentIndex", typ: 0 },
        { json: "fileIndex", js: "fileIndex", typ: 0 },
    ], "any"),
    "ChildElement": o([
        { json: "name", js: "name", typ: "" },
        { json: "opinion", js: "opinion", typ: r("Opinion") },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "Type": [
        "NDJSON",
        "PARQUET",
    ],
    "Opinion": [
        "DELETE",
        "PASS_THROUGH",
        "VALUE",
    ],
};
