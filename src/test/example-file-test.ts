import * as fs from "fs";

import { describe, it } from "./util/cappucino";
import { expect } from "chai";
import { FetchRemoteSchemas, LoadIfcxFile, SchemaValidationError } from "../ifcx-core/workflow-alpha";
import { IfcxFile } from "../ifcx-core/schema-helper";

let examplesFolderPath = "../examples"

describe("example file", () => {
    it("hello wall validates properly", async () => {
        let file = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Hello Wall/hello-wall.ifcx`).toString()) as IfcxFile;
        await FetchRemoteSchemas(file);
        expect(() => LoadIfcxFile(file)).to.not.throw();
    });
    it("signals validates properly", async () => {
        let file = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Linear placement of signals/linear-placement-of-signal.ifcx`).toString()) as IfcxFile;
        await FetchRemoteSchemas(file);
        expect(() => LoadIfcxFile(file)).to.not.throw();
    });
});