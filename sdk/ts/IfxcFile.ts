import JSZip from "jszip";
import { IfcxIndexFile, Convert } from "./IfcxIndexFile";

interface TypeIdentity<T> {
    typeID: string;
    originSchemaSrc: string;
    fromJSONString: (str: string) => T;
    toJSONString: (component: T) => string;
}

export async function LoadIfcxFile(bytes: Uint8Array)
{
    const zip = new JSZip();
    let output = await zip.loadAsync(bytes);
    
    let files: Map<string, Uint8Array> = new Map();
    for (let key in output.files) {
        let file = output.files[key];
        let arr = await file.async("uint8array");
        let name = key;
        files.set(name, arr);
    }

    let ifcxFile = new IfcxFile();

    let arr = files.get("index.json");
    if (!arr) throw new Error(`No index file`);
    
    const decoder = new TextDecoder("utf-8");
    const str = decoder.decode(arr);

    ifcxFile.index = Convert.toIfcxIndexFile(str);

    for (let [filename, bytes] of files)
    {
        if (filename.endsWith(".ndjson"))
        {
            let type = filename.replace(".ndjson", "");
            
            const decoder = new TextDecoder("utf-8");
            const str = decoder.decode(bytes);
            ifcxFile.serializedComponents.set(type, str.split("\n"));
        }
    }

    return ifcxFile;
}

export async function WriteIfcxFile(file: IfcxFile)
{
    const zip = new JSZip();

    await zip.file("index.json", JSON.stringify(file.index));
    for (let [typeID, components] of file.serializedComponents)
    {
        await zip.file(`${typeID}.ndjson`, components.join("\n"));
    }

    return await zip.generateAsync({type: "uint8array"});
}

export class IfcxFile
{
    public index: IfcxIndexFile;
    public serializedComponents: Map<string, string[]>;

    constructor()
    {
        this.serializedComponents = new Map();
        this.index = {
            header: {
                ifcxVersion: "post-alpha"
            },
            sections: [],
            imports: [],
            attributeTables: []
        };
    }

    private GetSerializedComponentsArray<T>(identity: TypeIdentity<T>): string[]
    {
        if (!this.serializedComponents.has(identity.typeID))
        {
            this.serializedComponents.set(identity.typeID, []);
        }
        return this.serializedComponents.get(identity.typeID)!;
    }

    AddComponent<T>(id: TypeIdentity<T>, component: T): number
    {
        let arr = this.GetSerializedComponentsArray(id);
        let index = arr.length;
        let indentedStr = id.toJSONString(component);
        arr.push(JSON.stringify(JSON.parse(indentedStr))); // this dance is due to quicktype pretty printing...
        return index;
    }

    ReadComponent<T>(id: TypeIdentity<T>, index: number)
    {
        let arr = this.GetSerializedComponentsArray(id);
        if (arr.length <= index)
        {
            throw new Error(`No component with index ${index}`);
        }
        return id.fromJSONString(arr[index]);
    }
}