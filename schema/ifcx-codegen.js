let  {
    quicktype,
    InputData,
    JSONSchemaInput,
    FetchingJSONSchemaStore
} = require("quicktype-core");
let fs = require("fs");
let path = require("path");

async function quicktypeJSONSchema(targetLanguage, typeName, jsonSchemaString, options) {
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
          ...options
        }
    });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
function decapitalize(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

// !!! pkg does not support recursive readdirsync !!!
function getAllFiles(dir) {
  let results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

async function ConvertFile(input_path, output_path, language)
{
    console.log(`Converting: ${input_path} -> ${output_path}`);

    let schema = fs.readFileSync(input_path).toString();
    let userSpecifiedId = JSON.parse(schema)["x-ifc5-id"];
    let className = capitalize(userSpecifiedId.split("::").at(-1));

    if (language === "ts")
    {
        const { lines: cscode } = await quicktypeJSONSchema("ts", className, schema, {});

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
    else
    {
        let ns = `${userSpecifiedId.replaceAll("::", "_")}`;
        const { lines: cscode } = await quicktypeJSONSchema("cs", className, schema, {
          namespace: ns,
          framework: "SystemTextJson",

        });
        
        let code = cscode;
        code.push("// start insert");
        code.push(`namespace ${ns} {`);
        code.push(`\tpartial class ${className} {`);
        code.push(`\t\tpublic static ifcx_sdk.IfcxIdentity<${className}> Identity() {`);
        code.push(`\t\t\treturn new ifcx_sdk.IfcxIdentity<${className}> {`);
        code.push(`\t\t\t     typeID = "${userSpecifiedId}",`);
        code.push(`\t\t\t     originSchemaSrc = ${JSON.stringify(schema)},`);
        code.push(`\t\t\t     fromJSONString = str => ${className}.FromJson(str),`);
        code.push(`\t\t\t     toJSONString = obj => Serialize.ToJson(obj)`);
        code.push(`\t\t\t};`);
        code.push(`\t\t}`);
        code.push(`\t}`);
        code.push(`}`);
        code.push("// end insert");

        fs.writeFileSync(output_path, cscode.join("\n"));
    }
}

async function main(input_dir, output_dir, language)
{
    if (!fs.existsSync(input_dir)) throw new Error(`Dir ${input_dir} does not exist`);
    if (["ts", "cs"].indexOf(language) === -1) throw new Error(`Unknown language ${language}, only support: [ts,cs]`);

    let files = getAllFiles(input_dir);
    console.log(files);
    files = files.filter(f => f.endsWith(".schema.json"));

    console.log();
    console.log(`Files (looking for .schema.json):`);
    files.forEach(filepath => {
        console.log(` - ${filepath}`);
    });
    console.log();

    if (files.length === 0)
    {
        throw new Error(`No files found!`);
    }

    files.forEach(filepath => {
        let input_path = filepath;
        let output_path =  path.join(output_dir, filepath.replace(input_dir, "").replace(".schema.json", `.${language}`));
        fs.mkdirSync(path.dirname(output_path), { recursive: true })
        ConvertFile(input_path, output_path, language);
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