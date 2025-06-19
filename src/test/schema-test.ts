import { SchemasToOpenAPI } from "../ifcx-core/schema/schema-export";
import { SchemaValidationError } from "../ifcx-core/schema/schema-validation";
import { LoadIfcxFile } from "../ifcx-core/workflows";
import { ExampleFile, ExampleFileMissingSchema, ExampleFileWithSchema } from "./example-file";
import { describe, it } from "./util/cappucino";
import { expect } from "chai";

describe("schemas", () => {
    it("can generate openAPI", () => {
        let openAPISchema = SchemasToOpenAPI(ExampleFile());

        // TODO
        expect(openAPISchema.length).to.equal(926);
    });

    it("throws error if attribute references unknown schema ID", () => {
        expect(() => LoadIfcxFile(ExampleFileMissingSchema())).to.throw(SchemaValidationError);
    });

    it("throws error if attributes fail to validate", () => {
        expect(() => LoadIfcxFile(ExampleFileWithSchema("Boolean", null))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFileWithSchema("String", null))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFileWithSchema("DateTime", null))).to.throw(SchemaValidationError);
        
        expect(() => LoadIfcxFile(ExampleFileWithSchema("Enum", null))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::enum", [null]))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::enum", "d"))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::enum", "c"))).to.not.throw(SchemaValidationError);
        
        expect(() => LoadIfcxFile(ExampleFileWithSchema("Integer", null))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFileWithSchema("Real", null))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFileWithSchema("Reference", null))).to.throw(SchemaValidationError);

        expect(() => LoadIfcxFile(ExampleFileWithSchema("Object", false))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::object", [null]))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::object", {val1: ""}))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::object", {val1: "", val2: "d"}))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::object", {val1: false, val2: "a"}))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::object", {val1: "", val2: "a"}))).to.not.throw(SchemaValidationError);
        
        expect(() => LoadIfcxFile(ExampleFile("example::optional_object", {val1: "", val2: "a"}))).to.not.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::optional_object", {val1: undefined, val2: "a"}))).to.not.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::optional_object", {val2: "a"}))).to.not.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::optional_object", {val1: null, val2: null}))).to.throw(SchemaValidationError);

        expect(() => LoadIfcxFile(ExampleFileWithSchema("Array", null))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::array", [false]))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::array", ["d"]))).to.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::array", []))).to.not.throw(SchemaValidationError);
        expect(() => LoadIfcxFile(ExampleFile("example::array", ["a"]))).to.not.throw(SchemaValidationError);
    });
});