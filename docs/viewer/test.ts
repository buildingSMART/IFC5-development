import { Ifc5FileJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { compose, ComposedObject } from "./compose";
import { compose2 } from "./compose2";
let fs = require("fs");

let helloWallFileName = "../../Hello Wall/hello-wall.ifcx";
let helloWallJSON = JSON.parse(fs.readFileSync(helloWallFileName).toString());

console.log(helloWallJSON);

let composed = compose([helloWallJSON] as Ifc5FileJson[]);

console.log(JSON.stringify(composed, null, 4));

let composed2 = compose2([helloWallJSON] as Ifc5FileJson[]);
console.log(JSON.stringify(composed2, null, 4));


function CompareComposition(a: ComposedObject, b: ComposedObject)
{
    try{
        if (a.name !== b.name)
        {
            throw new Error(`Name mismatch ${a.name} - ${b.name}`);
        }

        if (!!a.children !== !!b.children)
        {
            throw new Error(`Children mismatch ${a.children} - ${b.children}`);
        }

        if (a.children)
        {
            if (a.children.length !== b.children?.length)
            {
                throw new Error(`Children count mismatch ${a.name} - ${b.name}`);
            }

            for (let i = 0; i < a.children.length; i++)
            {
                let childA = a.children[i];
                let childB = b.children[i];
                CompareComposition(childA, childB);
            }
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
        throw e;
    }

    return true;
}

let outcome = CompareComposition(composed, composed2);
console.log(outcome ? "success" : "failed");