import { Ifc5FileJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { compose } from "./render";
let fs = require("fs");

let helloWallFileName = "../../Hello Wall/hello-wall.ifcx";
let helloWallJSON = JSON.parse(fs.readFileSync(helloWallFileName).toString());

console.log(helloWallJSON);

let composed = compose([helloWallJSON] as Ifc5FileJson[]);