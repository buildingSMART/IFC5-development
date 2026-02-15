let  {
    quicktype,
    InputData,
    JSONSchemaInput,
    FetchingJSONSchemaStore
} = require("quicktype-core");
let fs = require("fs");
let path = require("path");

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

function getAllFiles(dir) {
  return fs.readdirSync(dir, { recursive: true })
    .filter(file => {
        const fullPath = path.join(dir, file);
        return fs.statSync(fullPath).isFile();
    })
    .map(file => path.join(dir, file));
}

async function ConvertFile(input_path, output_path)
{
    console.log(`Converting: ${input_path} -> ${output_path}`);

    let schema = fs.readFileSync(input_path).toString();
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


    fs.writeFileSync(output_path, cscode.join("\n"));
}

async function main(input_dir, output_dir, language)
{
    if (!fs.existsSync(input_dir)) throw new Error(`Dir ${input_dir} does not exist`);
    if (!fs.existsSync(output_dir)) throw new Error(`Dir ${output_dir} does not exist`);
    if (language !== "ts") throw new Error(`Unknown language ${language}`);

    let files = getAllFiles(input_dir);
    files = files.filter(f => f.endsWith(".schema.json"));

    console.log(`Files (looking for .schema.json):`);
    files.forEach(filepath => {
        console.log(filepath);
    });

    files.forEach(filepath => {
        let input_path = filepath;
        let output_path =  path.join(output_dir, path.basename(filepath).replace(".schema.json", `.${language}`));
        ConvertFile(input_path, output_path);
    })

}

let args = process.argv;
console.log();
console.log(`Invoke like: ifcx-codgen.exe <input_dir> <output_dir> <ts/cs>`);
console.log(`Invoked ifcx-codgen with: `, args);
console.log();
let input_dir = process.argv[2];
let output_dir = process.argv[3];
let language = process.argv[4];
console.log(`input_dir:`, input_dir);
console.log(`output_dir:`, output_dir);
console.log(`language:`, language);
main(input_dir, output_dir, language);