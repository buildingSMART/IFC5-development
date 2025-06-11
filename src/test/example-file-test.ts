import * as fs from "fs";

import { describe, it } from "./util/cappucino";
import { expect } from "chai";
import { LoadIfcxFile } from "../ifcx-core/workflows";
import { IfcxFile } from "../ifcx-core/schema/schema-helper";
import { InMemoryLayerProvider, StackedLayerProvider } from "../ifcx-core/project/layer-providers";
import { FetchLayerProvider } from "../ifcx-core/project/fetch-layer-provider";
import { IfcxProjectBuilder } from "../ifcx-core/project/project";

let examplesFolderPath = "../examples"

describe("example file", () => {
    it("hello wall validates properly", async () => {
        let file = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Hello Wall/hello-wall.ifcx`).toString()) as IfcxFile;
        
        let provider = new StackedLayerProvider([
            new InMemoryLayerProvider().AddAll([file]), 
            new FetchLayerProvider()
        ]);

        let project = await (new IfcxProjectBuilder(provider).FromId(file.header.id)).Build();
        expect(project instanceof Error).to.be.false;
    });
    it("signals validates properly", async () => {
        let file = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Linear placement of signals/linear-placement-of-signal.ifcx`).toString()) as IfcxFile;
       
        let provider = new StackedLayerProvider([
            new InMemoryLayerProvider().AddAll([file]), 
            new FetchLayerProvider()
        ]);

        let project = await (new IfcxProjectBuilder(provider).FromId(file.header.id)).Build();
        expect(project instanceof Error).to.be.false;
    });
});