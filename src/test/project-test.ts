import { InMemoryLayerProvider } from "../ifcx-core/project/layer-providers";
import { IfcxProject, IfcxProjectBuilder } from "../ifcx-core/project/project";
import { ExampleFile, ExampleFileWithUsing } from "./example-file";
import { describe, it } from "./util/cappucino";
import { NodeToJSON } from "./util/node2json";
import { expect } from "chai";

describe("project builder", () => {
    it("fetches dependencies with provider", async () => {
        let file1 = ExampleFileWithUsing("file1", "a", [{id: "file2"}]);
        let file2 = ExampleFileWithUsing("file2", "b");

        let provider = 
            new InMemoryLayerProvider()
                .add(file1)
                .add(file2);

        let project = await new IfcxProjectBuilder(provider).FromId(file1.header.id).Build();

        expect(project instanceof Error).to.be.false;
        let p = project as IfcxProject;
        expect(p.GetLayerIds().length).to.equal(2);
    });
})


