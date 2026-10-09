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
        expect(p.GetLayerIds()).to.deep.equal(["file4", "file3", "file2", "file1"]);
    });
    
    it("respects layer order of the main layer #2", async () => {
        let provider = ExampleInputLayers();
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("file2").Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds()).to.deep.equal(["file4", "file3", "file1", "file2"]);
    });
    
    it("adds nested imports once", async () => {
        let provider = new InMemoryLayerProvider()
            .add(ExampleFileWithImport("main", "1", [{uri: "a"}, {uri: "b"}]))
            .add(ExampleFileWithImport("a", "2", [{uri: "c"}]))
            .add(ExampleFileWithImport("b", "3"))
            .add(ExampleFileWithImport("c", "4"));
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("main").Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds()).to.deep.equal(["c", "a", "b", "main"]);
    });

    it("adds deeply nested imports once", async () => {
        let provider = new InMemoryLayerProvider()
            .add(ExampleFileWithImport("main", "1", [{uri: "a"}]))
            .add(ExampleFileWithImport("a", "2", [{uri: "b"}]))
            .add(ExampleFileWithImport("b", "3", [{uri: "c"}]))
            .add(ExampleFileWithImport("c", "4"));
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("main").Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetLayerIds()).to.deep.equal(["c", "b", "a", "main"]);
    });

    it("a layer overrides the layers it imports", async () => {
        let provider = new InMemoryLayerProvider()
            .add(ExampleFileWithImport("main", "main", [{uri: "a"}]))
            .add(ExampleFileWithImport("a", "a", [{uri: "b"}]))
            .add(ExampleFileWithImport("b", "b"));
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("main").Build();

        expect(layerStack instanceof Error).to.be.false;
        let root = NodeToJSON((layerStack as IfcxLayerStack).GetFullTree());
        expect(root.children.root.attributes["example::attribute"]).to.equal("main");
    });

    it("an import overrides the layers it imports", async () => {
        let provider = new InMemoryLayerProvider()
            .add(new IfcxFileBuilder().Id("main").Import({uri: "a"}).Build())
            .add(ExampleFileWithImport("a", "a", [{uri: "b"}]))
            .add(ExampleFileWithImport("b", "b"));
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("main").Build();

        expect(layerStack instanceof Error).to.be.false;
        let p = layerStack as IfcxLayerStack;
        expect(p.GetFederatedLayer().header.id).to.equal("main");
        let root = NodeToJSON(p.GetFullTree());
        expect(root.children.root.attributes["example::attribute"]).to.equal("a");
    });

    it("an import that a sibling also imports goes before that sibling", async () => {
        let provider = new InMemoryLayerProvider()
            .add(ExampleFileWithImport("main", "main", [{uri: "a"}, {uri: "b"}]))
            .add(ExampleFileWithImport("a", "a", [{uri: "b"}]))
            .add(ExampleFileWithImport("b", "b"));
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("main").Build() as IfcxLayerStack;

        // `a` imports `b`, so `a` overrides `b` even though `main` lists `b` later.
        expect(layerStack.GetLayerIds()).to.deep.equal(["b", "a", "main"]);
    });

    it("a later import overrides an earlier one", async () => {
        let provider = new InMemoryLayerProvider()
            .add(ExampleFileWithImport("main", "main", [{uri: "a"}, {uri: "b"}]))
            .add(ExampleFileWithImport("a", "a"))
            .add(ExampleFileWithImport("b", "b"));
        let layerStack = await new IfcxLayerStackBuilder(provider).FromId("main").Build() as IfcxLayerStack;

        expect(layerStack.GetLayerIds()).to.deep.equal(["a", "b", "main"]);
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


