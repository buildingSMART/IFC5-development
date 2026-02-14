let  {
    quicktype,
    InputData,
    JSONSchemaInput,
    FetchingJSONSchemaStore
} = require("quicktype-core");
let fs = require("fs");

async function quicktypeJSONSchema(targetLanguage, typeName, jsonSchemaString) {
    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

    // We could add multiple schemas for multiple types,
    // but here we're just making one type from JSON schema.
    await schemaInput.addSource({ name: typeName, schema: jsonSchemaString });

    const inputData = new InputData();
    inputData.addInput(schemaInput);

    return await quicktype({
        inputData,
        lang: targetLanguage,
        rendererOptions: {
        }
    });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
function decapitalize(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

async function main()
{
    let schema = fs.readFileSync("file.json").toString();
    let userSpecifiedId = JSON.parse(schema)["x-ifc5-id"];
    let className = capitalize(userSpecifiedId.split("::").at(-1));
    const { lines: cscode } = await quicktypeJSONSchema("ts", className, schema);

        let code = cscode;
        code.push("\t// start insert");
        code.push(`\texport let Identity = {`);
        code.push(`\t\t     typeID: "${userSpecifiedId}",`);
        code.push(`\t\t     originSchemaSrc: ${JSON.stringify(schema)},`);
        code.push(`\t\t     fromJSONString: Convert.to${className},`);
        code.push(`\t\t     toJSONString: Convert.${decapitalize(className)}ToJson`);
        code.push(`\t\t }`);
        code.push("\t// end insert");


    fs.writeFileSync("./output.ts", cscode.join("\n"));
}

let args = process.argv;
console.log();
console.log(`Invoke like: ifcx-codgen.exe <input_dir> <output_dir>`);
console.log(`Invoked ifcx-codgen with: `, args);
console.log();
let input_dir = process.argv[2];
let output_dir = process.argv[3];
console.log(`input_dir:`, input_dir);
console.log(`output_dir:`, output_dir);
main();