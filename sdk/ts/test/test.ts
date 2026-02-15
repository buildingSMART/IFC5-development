import { Opinion } from "../IfcxIndexFile";
import { IfcxFile, LoadIfcxFile, WriteIfcxFile } from "../IfxcFile";
import * as MyComponent from "./mycomponent";
import * as fs from "fs";


async function Test()
{
    let file = new IfcxFile();

    let comp1: MyComponent.Mycomponent = {
        firstName: "Alice",
        lastName: "Anderson",
        age: 21
    };
    
    let comp2: MyComponent.Mycomponent = {
        firstName: "Bob",
        lastName: "Bobson",
        age: 22
    };

    let comp1_id = file.AddComponent(MyComponent.Identity, comp1);
    let comp2_id = file.AddComponent(MyComponent.Identity, comp2);

    file.AddSection({
        header: {
            id: "v2",
            author: "bob@example.com",
            dataVersion: "v2",
            timestamp: new Date().toString()
        },
        nodes: [{
            path: "obj/a",
            inherits: [],
            children: [],
            attributes: [{
                name: "user",
                opinion: Opinion.Value,
                value: {
                    typeID: MyComponent.Identity.typeID,
                    componentIndex: comp1_id
                }
            },{
                name: "user2",
                opinion: Opinion.Value,
                value: {
                    typeID: MyComponent.Identity.typeID,
                    componentIndex: comp2_id
                }
            }]
        }]
    })

    let zipbytes = await WriteIfcxFile(file);
    fs.writeFileSync("output.ifcx", zipbytes);

    let readBack = await LoadIfcxFile(zipbytes);

    let readBackComp = readBack.ReadComponent(MyComponent.Identity, 1);

    console.log(readBackComp);
}

Test();