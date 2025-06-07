import * as process from "process";
import * as fs from "fs";

import { components } from "../../schema/out/ts/ifcx";
import { Diff, Federate } from "../ifcx-core/workflows";
import { ExampleFile } from "../test/example-file";
import { SchemasToOpenAPI } from "../ifcx-core/schema/schema-export";

type IfcxFile = components["schemas"]["IfcxFile"];

let args = process.argv.slice(2);

console.log("running ifcx [alpha]...", JSON.stringify(args));
console.log();


function processArgs(args: string[])
{
    let operation = args[0];

    if (operation === "schema_to_openapi")
    {
        let path = args[1];
        if (!path.endsWith(".ifcx.json")) throw new Error(`Expected extension .ifcx.json`);
        let file = JSON.parse(fs.readFileSync(path).toString());
        let openAPI = SchemasToOpenAPI(file as IfcxFile);
        let openaAPIPath = path.replace(".ifcx.json", ".openapi.yml");
        fs.writeFileSync(openaAPIPath, openAPI);
    }
    else if (operation === "diff" || operation === "federate")
    {
        if (args.length !== 4) throw new Error(`expected 3 arguments`);

        let path1 = args[1];
        let path2 = args[2];
        let outputPath = args[3];

        let data1 = JSON.parse(fs.readFileSync(path1).toString());
        let data2 = JSON.parse(fs.readFileSync(path2).toString());

        let result: IfcxFile | null = null;
        if (operation === "diff")
        {
            result = Diff(data1, data2);
        }
        if (operation === "federate")
        {
            result = Federate([data1, data2]);
        }

        fs.writeFileSync(outputPath, JSON.stringify(result, null, 4));
    }
    else if (operation === "make_default_file")
    {
        let path = args[1];
        fs.writeFileSync(`${path}.ifcx.json`, JSON.stringify(ExampleFile(), null, 4))
    }
    else if (!operation || operation === "help")
    {
        console.log(`available commands:`);
        console.log(`schema_to_openapi`);
        console.log(`diff`);
        console.log(`federate`);
        console.log(`make_default_file`);
        console.log(`help`);
    }
    else
    {
        console.log(`Unknown command ${operation}`)
    }
}

processArgs(args);