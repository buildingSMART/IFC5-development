import { Diff, Federate, LoadIfcxFile } from "../ifcx-core/workflows";
import { DefaultFile } from "./compose-test";
import { describe, it } from "./util/cappucino";
import { NodeToJSON } from "./util/node2json";
import { expect } from "chai";

describe("workflows", () => {
    it("allow federation", () => {
        let file1 = DefaultFile("a");
        let file2 = DefaultFile("b");

        let federated1 = Federate([file1, file2]);
        let federated2 = Federate([file2, file1]);
``
        let root1 = NodeToJSON(LoadIfcxFile(federated1, true, false));
        let root2 = NodeToJSON(LoadIfcxFile(federated2, true, false));

        expect(root1.attributes.attribute).to.equal("b");
        expect(root2.attributes.attribute).to.equal("a");
        expect(root1.attributes.fixed_attribute).to.exist;
        expect(root2.attributes.fixed_attribute).to.exist;
    });

    it("allow diffs", () => {
        let file1 = DefaultFile("a");
        let file2 = DefaultFile("b");

        let diff = Diff(file1, file2);
        let root = NodeToJSON(LoadIfcxFile(diff, true, false));

        expect(diff.data.length).to.equal(1);
        expect(root.attributes.attribute).to.equal("b");
        expect(root.attributes.fixed_attribute).to.not.exist;
    });
    
    it("allow federating diffs", () => {
        let file1 = DefaultFile("a");
        let file2 = DefaultFile("b");

        let diff = Diff(file1, file2);
        let federated = Federate([file1, diff]);

        let root = NodeToJSON(LoadIfcxFile(federated, true, false));
        expect(root.attributes.attribute).to.equal("b");
        expect(root.attributes.fixed_attribute).to.exist;
    });
})


