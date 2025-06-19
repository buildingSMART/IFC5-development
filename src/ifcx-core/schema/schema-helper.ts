// the current typespec -> openapi -> TS output has a strange structure
// TODO: use typespec TS export and remove this file

import { components } from "../../../schema/out/ts/ifcx";

export type IfcxFile = components["schemas"]["IfcxFile"];
export type IfcxSchema = components["schemas"]["IfcxSchema"];
export type IfcxValueDescription = components["schemas"]["IfcxValueDescription"];
export type IfcxNode = components["schemas"]["IfcxNode"];
export type DataType = components["schemas"]["DataType"];
export type ImportNode = components["schemas"]["ImportNode"];



