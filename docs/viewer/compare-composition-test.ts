import { Ifc5FileJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { compose, ComposedObject } from "./compose";
import { compose2 } from "./compose2";
import { describe, each, it } from "./test/util/cappucino";
import { expect } from "chai";
import * as fs from "fs";

function CompareComposition(a: ComposedObject, b: ComposedObject)
{
    try{
        if (a.name !== b.name)
        {
            throw new Error(`Name mismatch ${a.name} - ${b.name}`);
        }

        if (a.type !== b.type)
        {
            throw new Error(`Type mismatch ${a.type} - ${b.type}`);
        }

        if (!!a.children !== !!b.children)
        {
            throw new Error(`Children mismatch ${a.children} - ${b.children}`);
        }

        if (a.children)
        {
            if (a.children.length !== b.children?.length)
            {
                console.log(a.children, b.children);
                throw new Error(`Children count mismatch ${a.name} - ${b.name}`);
            }

            for (let i = 0; i < a.children.length; i++)
            {
                let childA = a.children[i];
                let childB = b.children[i];
                if (!CompareComposition(childA, childB)) return false;
            }
        }

        if (!!a.attributes !== !!b.attributes)
        {
            throw new Error(`Attributes mismatch ${a.children} - ${b.children}`);
        }

        if (a.attributes)
        {
            if (Object.keys(a.attributes).length !== Object.keys(b.attributes).length)
            {
                throw new Error(`Attribute count mismatch ${a.name} - ${b.name}`);
            }

            Object.keys(a.attributes).forEach(attrName => {
                if (a.attributes[attrName] !== b.attributes[attrName])
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
        acopy.children = [];
        let bcopy = {...b};
        bcopy.children = [];
        console.log(`A: `, acopy);
        console.log(`B: `, bcopy);
        console.error(e);
        return false;
    }

    return true;
}

describe("composition comparison", () => {
    it("should be equal for 'hello-wall.ifcx' and 'hello-wall_add-firerating.ifcx'", async() => {
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
});