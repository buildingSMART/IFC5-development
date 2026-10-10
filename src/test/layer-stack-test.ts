import { Federate, LoadIfcxFile } from "../ifcx-core/workflows";
import { GetOpinions } from "../ifcx-core/composition/node";
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



describe("composition provenance", () => {
    function Layers()
    {
        let type = { path: "type", children: {}, inherits: {}, attributes: { colour: "grey", height: "low" } };
        let building = { path: "building", children: {}, inherits: { type: "type" }, attributes: { colour: "red" } };
        let site = { path: "site", children: { b: "building" }, inherits: {}, attributes: {} };
        let base = new IfcxFileBuilder().Id("base").Schema("colour", StringValueSchema()).Schema("height", StringValueSchema())
            .Node(type).Node(building).Node(site).Build();
        let view = new IfcxFileBuilder().Id("view").Node(NodeWithAttr("building", "colour", "blue")).Build();
        return [base, view];
    }

    it("is off by default", () => {
        let layers = Layers();
        let root = LoadIfcxFile(Federate(layers));
        expect(root.children.get("site")!.children.get("b")!.sources).to.be.undefined;
    });

    it("lists every opinion per attribute, the last one is the composed value", () => {
        let layers = Layers();
        let root = LoadIfcxFile(Federate(layers), true, true, layers);
        // the building is reached as a child of the site
        let building = root.children.get("site")!.children.get("b")!;

        expect(building.attributes.get("colour")).to.equal("blue");
        expect(GetOpinions(building, "colour")).to.deep.equal([
            { layer: "base", path: "type", value: "grey" },
            { layer: "base", path: "building", value: "red" },
            { layer: "view", path: "building", value: "blue" },
        ]);
        expect(GetOpinions(building, "height")).to.deep.equal([{ layer: "base", path: "type", value: "low" }]);
    });

    it("layer stack composes with provenance when asked", async () => {
        let [base, view] = Layers();
        let main = new IfcxFileBuilder().Id("main").Import({uri: "base"}).Import({uri: "view"}).Build();
        let provider = new InMemoryLayerProvider().add(main).add(base).add(view);

        let plain = await new IfcxLayerStackBuilder(provider).FromId("main").Build() as IfcxLayerStack;
        expect(plain.GetFullTree().children.get("site")!.children.get("b")!.sources).to.be.undefined;

        let stack = await new IfcxLayerStackBuilder(provider).FromId("main").WithProvenance().Build() as IfcxLayerStack;
        let building = stack.GetFullTree().children.get("site")!.children.get("b")!;
        let opinions = GetOpinions(building, "colour")!;
        expect(opinions[opinions.length - 1].value).to.equal(building.attributes.get("colour"));
        expect(opinions.map(o => o.layer).every(l => stack.GetLayerIds().includes(l))).to.be.true;
    });
});
