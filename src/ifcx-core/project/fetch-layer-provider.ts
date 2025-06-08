import { IfcxFile } from "../schema/schema-helper";
import { RemoteLayerProvider } from "./layer-providers";

export class FetchLayerProvider implements RemoteLayerProvider
{
    layers: Map<string, IfcxFile>;

    constructor()
    {
        this.layers = new Map<string, IfcxFile>();
    }
    
    async FetchJson(url: string) {
        let result = await fetch(url);
        if (!result.ok) {
            return new Error(`Failed to fetch ${url}: ${result.status}`);
        }
        return result.json();
    }

    async GetLayerByID(id: string): Promise<IfcxFile | Error> {
        
        if (!this.layers.has(id))
        {
            let fetched = await this.FetchJson(id);
            if (fetched instanceof Error)
            {
                return new Error(`File with id "${id}" not found`);
            }
            // TODO: validation, integrity?
            let file = fetched as IfcxFile;
            this.layers.set(id, file);
            return file;
        }
        return this.layers.get(id)!; 
    }
}