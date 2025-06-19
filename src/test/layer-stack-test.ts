import { InMemoryLayerProvider } from "../ifcx-core/layers/layer-providers";
import { IfcxLayerStack, IfcxLayerStackBuilder } from "../ifcx-core/layers/layer-stack";
import { ExampleFile, ExampleFileWithImport, IfcxFileBuilder, NodeWithAttr, StringValueSchema } from "./example-file";
import { describe, it } from "./util/cappucino";
import { NodeToJSON } from "./util/node2json";
import { expect } from "chai";

function ExampleInputLayers()
{
    let file1 = ExampleFileWithImport("file1", "1", [{uri: "file2"}, {uri: "file3"}, {uri: "file4"}]);
    let file2 = ExampleFileWithImport("file2", "2", [{uri: "file4"}, {uri: "file3"}, {uri: "file1"}]);
    let file3 = ExampleFileWithImport("file3", "3");
    let file4 = ExampleFileWithImport("file4", "4");

    return new InMemoryLayerProvider()
        .add(file1)
        .add(file2)
        .add(file3)
        .add(file4);
}

describe("layerStack builder", () => {
    it("fetches dependencies with provider", async () => {
        let file1 = ExampleFileWithImport("file1", "a", [{uri: "file2"}]);
        let file2 = ExampleFileWithImport("file2", "b");

        let provider = 
            new InMemoryLayerProvider()
                .add(file1)
                .add(file2);

        let layerStack = await new IfcxLayerStackBuilder(provider).FromId(file1.header.id).Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds().length).to.equal(2);
    });

    it("respects layer order of the main layer", async () => {
        let provider = ExampleInputLayers();
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("file1").Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds().length).to.equal(4);
        expect(p.GetLayerIds()[0]).to.equal("file1");
        expect(p.GetLayerIds()[1]).to.equal("file2");
        expect(p.GetLayerIds()[2]).to.equal("file3");
        expect(p.GetLayerIds()[3]).to.equal("file4");
    });
    
    it("respects layer order of the main layer #2", async () => {
        let provider = ExampleInputLayers();
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("file2").Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds().length).to.equal(4);
        expect(p.GetLayerIds()[0]).to.equal("file2");
        expect(p.GetLayerIds()[1]).to.equal("file4");
        expect(p.GetLayerIds()[2]).to.equal("file3");
        expect(p.GetLayerIds()[3]).to.equal("file1");
    });
    
    it("schemas are found in imports", async () => {
        let file1 = new IfcxFileBuilder().Id("file1").Import({uri:"file2"}).Node(NodeWithAttr("root", "attr", "1")).Build();
        let file2 = new IfcxFileBuilder().Id("file2").Schema("attr", StringValueSchema()).Build();

        let provider = 
            new InMemoryLayerProvider()
                .add(file1)
                .add(file2);

        let layerStack = await new IfcxLayerStackBuilder(provider).FromId(file1.header.id).Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds().length).to.equal(2);
    });
})


