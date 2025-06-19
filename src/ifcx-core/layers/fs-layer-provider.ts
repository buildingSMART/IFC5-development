import { IfcxFile } from "../schema/schema-helper";
import { RemoteLayerProvider } from "./layer-providers";

import * as fs from "fs";
import * as path from "path";

export class FSLayerProvider implements RemoteLayerProvider
{
    layers: Map<string, IfcxFile>;
    dir: string;

    constructor(dir: string)
    {
        this.layers = new Map<string, IfcxFile>();
        this.dir = dir;
    }
    
    async ReadJsonFile(url: string) {
        let result = await fetch(url);
        if (!result.ok) {
            return new Error(`Failed to fetch ${url}: ${result.status}`);
        }
        return result.json();
    }

    // TODO: this is quite costly, loading layers that are not needed
    // TODO: repeated logic with other providers
    async BuildMap()
    {
        if (this.layers.size !== 0) return; 

        let paths = fs.readDirSync(this.dir);
        for (const file of paths) {
            let filepath = path.join(this.dir, file);
            if (!fs.statSync(filepath).isFile() || !fs.existSync(filepath))
            {
                return new Error(`File not found with path ${filepath}`);
            }
            let json = JSON.parse(fs.readFileSync(filepath).toString());
            // TODO: validation, integrity?
            let ifcx = json as IfcxFile;
            this.layers.set(ifcx.header.id, ifcx);
        }
    }

    async GetLayerByURI(uri: string): Promise<IfcxFile | Error> {
        
        if (!this.layers.has(uri))
        {
            await this.BuildMap();
            if (!this.layers.has(uri))
            {
                return new Error(`File with id "${uri}" not found`);
            }
        }
        return this.layers.get(uri)!; 
    }
}