import { Ifc5FileJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { compose } from "./compose";
import { compose2 } from "./compose2";
let fs = require("fs");

let helloWallFileName = "../../Hello Wall/hello-wall.ifcx";
let helloWallJSON = JSON.parse(fs.readFileSync(helloWallFileName).toString());

console.log(helloWallJSON);

let composed = compose([helloWallJSON] as Ifc5FileJson[]);

console.log(JSON.stringify(composed, null, 4));

let composed2 = compose2([helloWallJSON] as Ifc5FileJson[]);
console.log(JSON.stringify(composed2, null, 4));
