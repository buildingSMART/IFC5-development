import * as process from "process";
import * as fs from "fs";

import { components } from "../../schema/out/ts/ifcx";
import { Diff, Federate, LoadIfcxFile } from "../ifcx-core/workflows";
import { ExampleFile } from "../test/example-file";
import { SchemasToOpenAPI } from "../ifcx-core/schema/schema-export";
import { PostCompositionNode } from "../ifcx-core/composition/node";
import { InMemoryLayerProvider, StackedLayerProvider } from "../ifcx-core/layers/layer-providers";
import { FetchLayerProvider } from "../ifcx-core/layers/fetch-layer-provider";
import { IfcxLayerStackBuilder } from "../ifcx-core/layers/layer-stack";

type IfcxFile = components["schemas"]["IfcxFile"];

let args = process.argv.slice(2);

console.log("running ifcx [alpha]...", JSON.stringify(args));
console.log();


async function processArgs(args: string[])
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
    else if (operation === "compose")
    {
        const parseFlags = (args: string[]) => {
            let fetch = true;
            let validate = true;
            let rest: string[] = [];

            args.forEach((arg) => {
                if (arg === "--no-fetch") {
                    fetch = false;
                } else if (arg === "--no-validate") {
                    validate = false;
                } else if (arg.startsWith("-")) {
                    throw Error(`Unsupported flag ${arg}`);
                } else {
                    rest.push(arg);
                }
            });

            return { fetch, validate, rest };
        }

        let { fetch, validate, rest } = parseFlags(args.slice(1));

        if (rest.length < 2) throw new Error(`expected at least 2 arguments`);

        let outputPath = rest[rest.length - 1];
        if (fs.existsSync(outputPath)) throw new Error(`Output file already exists: ${outputPath}`);

        let inputPaths = rest.slice(0, -1);
        let files = inputPaths.map(p => JSON.parse(fs.readFileSync(p).toString()) as IfcxFile);

        let userDefinedOrder: IfcxFile = {
            header: {...files[0].header},
            imports: files.map(f => { return { uri: f.header.id }; }),
            schemas: {},
            data: []
        }
        userDefinedOrder.header.id = "_cli";

        const providers = fetch ? [new FetchLayerProvider()] : [];
        let provider = new StackedLayerProvider([
            new InMemoryLayerProvider().AddAll([userDefinedOrder, ...files]), 
            ...providers
        ]);
        let layerStack = await (new IfcxLayerStackBuilder(provider).FromId(userDefinedOrder.header.id)).Build();
        if (layerStack instanceof Error)
        {
            throw layerStack;
        }

        let federated = layerStack.GetFederatedLayer();
        let composed = LoadIfcxFile(federated, validate, true);

        fs.writeFileSync(outputPath, JSON.stringify(NodeToJSON(composed), null, 4));
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
        console.log(`compose`);
        console.log(`compose [--no-fetch] [--no-validate] <input1> <input2> ... <output>`);
        console.log(`make_default_file`);
        console.log(`help`);
    }
    else
    {
        console.log(`Unknown command ${operation}`)
    }
}

function NodeToJSON(node: PostCompositionNode)
{
    let obj: any = {};
    obj.node = node.node;
    obj.children = {};
    obj.attributes = {};
    [...node.children.entries()].forEach(c => {
        obj.children[c[0]] = NodeToJSON(c[1]);
    });
    [...node.attributes.entries()].forEach(c => {
        obj.attributes[c[0]] = c[1];
    });
    return obj;
}

processArgs(args).catch((e) => {
    console.error(e);
    process.exit(1);
});
