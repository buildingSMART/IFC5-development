import { Ifc5FileJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { compose, ComposedObject } from "./compose";
import { compose2 } from "./compose2";
import { describe, each, it, nope } from "./test/util/cappucino";
import { expect } from "chai";
import * as fs from "fs";
import { components } from "../../schema/out/ts/ifcx";
import { compose3 } from "./compose3";

type IfcxFile = components["schemas"]["IfcxFile"];

function CompareComposition(a: ComposedObject, b: ComposedObject, checkTypes: boolean = true)
{
    try{
        if (a.name !== b.name)
        {
            throw new Error(`Name mismatch ${a.name} - ${b.name}`);
        }

        if (checkTypes && a.type !== b.type)
        {
            throw new Error(`Type mismatch ${a.type} - ${b.type}`);
        }

        if (a.children?.length === 0) delete a.children;
        if (b.children?.length === 0) delete b.children;

        if (!!a.children !== !!b.children)
        {
            throw new Error(`Children mismatch ${a.children} - ${b.children}`);
        }

        if (a.children)
        {
            if (a.children.length !== b.children?.length)
            {
                console.log(a.children, b.children);
                throw new Error(`Children count mismatch ${a.name} - ${b.name}: ${a.children.length} - ${b.children?.length}`);
            }

            for (let i = 0; i < a.children.length; i++)
            {
                let childA = a.children[i];
                let childB = b.children[i];
                if (!CompareComposition(childA, childB, checkTypes)) return false;
            }
        }

        if (!!a.attributes !== !!b.attributes)
        {
            throw new Error(`Attributes mismatch ${a.attributes} - ${b.attributes}`);
        }

        if (a.attributes)
        {
            if (Object.keys(a.attributes).length !== Object.keys(b.attributes).length)
            {
                throw new Error(`Attribute count mismatch ${a.name} - ${b.name}`);
            }

            Object.keys(a.attributes).forEach(attrName => {
                if (JSON.stringify(a.attributes[attrName]) !== JSON.stringify(b.attributes[attrName]))
                {
                    throw new Error(`Mismatched attribute ${attrName} on B`);
                }
            })
        }
    }
    catch (e)
    {
        console.error(`issue with nodes:`);
        let acopy = {...a};
        let bcopy = {...b};
        // acopy.children = [];
        // bcopy.children = [];
        console.log(`A: `, acopy);
        console.log(`B: `, bcopy);
        console.error(e);
        return false;
    }

    return true;
}

describe("composition comparison", () => {
    nope("should be equal for 'hello-wall.ifcx' and 'hello-wall_add-firerating.ifcx'", async() => {
        // arrange
        let helloWallFileName = "../../Hello Wall/hello-wall.ifcx";
        let helloWallFR = "../../Hello Wall/hello-wall_add-firerating.ifcx";
        let helloWallJSON = JSON.parse(fs.readFileSync(helloWallFileName).toString());
        let helloWallFRJSON = JSON.parse(fs.readFileSync(helloWallFR).toString());
        
        let composed = compose([helloWallJSON, helloWallFRJSON] as Ifc5FileJson[]);
        let composed2 = compose2([helloWallJSON, helloWallFRJSON] as Ifc5FileJson[]);

        // act
        let outcome = CompareComposition(composed, composed2);

        // assert
        expect(outcome).to.be.true;
    });

    it("should be equal for 'hello-wall.ifcx' pre and post alpha", async() => {
        // arrange
        let helloWallFileName = "../../Hello Wall/hello-wall-pre-alpha.ifcx";
        let helloWallAlpha = "../../Hello Wall/hello-wall.ifcx";
        let helloWallJSON = JSON.parse(fs.readFileSync(helloWallFileName).toString());
        let helloWallAlphaJSON = JSON.parse(fs.readFileSync(helloWallAlpha).toString());
        
        let composed = compose([helloWallJSON] as Ifc5FileJson[]);
        let composed3 = compose3([helloWallAlphaJSON] as IfcxFile[]);

        // act
        let outcome = CompareComposition(composed, composed3, false);

        // assert
        expect(outcome).to.be.true;
    });
});