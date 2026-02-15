import { IfcxFile, LoadIfcxFile, WriteIfcxFile } from "../IfxcFile";
import * as MyComponent from "./mycomponent";
import * as fs from "fs";


async function Test()
{
    let file = new IfcxFile();

    let comp: MyComponent.Mycomponent = {
        firstName: "Bob",
        lastName: "Bobson",
        age: 21
    };

    file.AddComponent(MyComponent.Identity, comp);

    let zipbytes = await WriteIfcxFile(file);
    // fs.writeFileSync("output.ifcx", zipbytes);

    let readBack = await LoadIfcxFile(zipbytes);

    let readBackComp = readBack.ReadComponent(MyComponent.Identity, 0);

    console.log(readBackComp);
}

Test();