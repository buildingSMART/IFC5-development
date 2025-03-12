import { glob } from "glob";
import { Ifc5FileJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { compose2 } from "./compose2";
import { describe, each, it } from "./test/util/cappucino";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";


function Cleanup(obj)
{
    return JSON.parse(JSON.stringify((obj)));
}

const fixtureDirectories = glob.sync('test/fixtures/*');

describe("composition", () => {
    each("should properly handle fixture directory", fixtureDirectories, (fixtureDir) => {

        const inputFiles = glob.sync(`${fixtureDir.replace(/\\/g, '/')}/input_*.ifcx.json`);
        expect(inputFiles.length).to.be.above(0);
        const inputs = inputFiles.map((inputFile) => {
            return JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        });      
        let actualResult = Cleanup(compose2(inputs as Ifc5FileJson[]));
        const outputFile = path.join(fixtureDir, 'output.json');
        const expectedOutput = JSON.parse(fs.readFileSync(outputFile).toString());
        // console.log("actual", JSON.stringify(actualResult, null, 4));
        // console.log("expected", JSON.stringify(expectedOutput, null, 4));
        expect(actualResult).to.deep.equal(expectedOutput);
    });
})