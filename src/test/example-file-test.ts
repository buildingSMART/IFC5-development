import * as fs from "fs";

import { describe, it } from "./util/cappucino";
import { expect } from "chai";
import { Federate, LoadIfcxFile } from "../ifcx-core/workflows";
import { IfcxFile } from "../ifcx-core/schema/schema-helper";
import { InMemoryLayerProvider, StackedLayerProvider } from "../ifcx-core/layers/layer-providers";
import { FetchLayerProvider } from "../ifcx-core/layers/fetch-layer-provider";
import { IfcxLayerStackBuilder } from "../ifcx-core/layers/layer-stack";
import { NodeToJSON } from "./util/node2json";

let examplesFolderPath = "../examples"

describe("example file", () => {
    it("hello wall validates properly", async () => {
        let file = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Hello Wall/hello-wall.ifcx`).toString()) as IfcxFile;
        
        let provider = new StackedLayerProvider([
            new InMemoryLayerProvider().AddAll([file]), 
            new FetchLayerProvider()
        ]);

        let layerStack = await (new IfcxLayerStackBuilder(provider).FromId(file.header.id)).Build();
        expect(layerStack instanceof Error).to.be.false;
    });
    it("signals validates properly", async () => {
        let file = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Linear placement of signals/linear-placement-of-signal.ifcx`).toString()) as IfcxFile;
       
        let provider = new StackedLayerProvider([
            new InMemoryLayerProvider().AddAll([file]), 
            new FetchLayerProvider()
        ]);

        let layerStack = await (new IfcxLayerStackBuilder(provider).FromId(file.header.id)).Build();
        expect(layerStack instanceof Error).to.be.false;
    });
    it("hello wall space predefined-type layer validates and composes on top of hello wall", async () => {
        let base = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Hello Wall/hello-wall.ifcx`).toString()) as IfcxFile;
        let layer = JSON.parse(fs.readFileSync(`${examplesFolderPath}/Hello Wall/hello-wall-add-space-predefined-type.ifcx`).toString()) as IfcxFile;

        let provider = new StackedLayerProvider([new InMemoryLayerProvider().AddAll([layer]), new FetchLayerProvider()]);
        expect((await new IfcxLayerStackBuilder(provider).FromId(layer.header.id).Build()) instanceof Error).to.be.false;

        let root = NodeToJSON(LoadIfcxFile(Federate([base, layer]), false, true));
        let find = (n: any, path: string): any => n.node === path ? n : Object.values(n.children).map((c: any) => find(c, path)).find(x => x);
        expect(find(root, "e3035b71-bd9f-4cdc-86fd-b56e2f4605b6").attributes["bsi::ifc::class"].code).to.equal("IfcSpaceSPACE");
    });
});