import { describe, each, it } from "./util/cappucino";
import { expect } from "chai";
import * as fs from "fs";
import { LoadIfcxFile, SchemaValidationError } from "../workflow-alpha";
import { components } from "../../../schema/out/ts/ifcx";

type IfcxFile = components["schemas"]["IfcxFile"];

describe("example file", () => {
    it("hello wall validates properly", () => {
        let file = JSON.parse(fs.readFileSync("../../Hello Wall/hello-wall.ifcx").toString()) as IfcxFile;
        expect(() => LoadIfcxFile(file)).to.not.throw();
    });
});