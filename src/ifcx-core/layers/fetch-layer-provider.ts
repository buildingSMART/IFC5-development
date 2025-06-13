import { IfcxFile } from "../schema/schema-helper";
import { log } from "../util/log";
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
        try 
        {
            return await result.json();
        }
        catch(e)
        {
            log(url);
            return new Error(`Failed to parse json at ${url}: ${e}`);
        }
    }

    async GetLayerByURI(uri: string): Promise<IfcxFile | Error> {
        
        if (!this.layers.has(uri))
        {
            let fetched = await this.FetchJson(uri);
            if (fetched instanceof Error)
            {
                return new Error(`File with id "${uri}" not found`);
            }
            // TODO: validation, integrity?
            let file = fetched as IfcxFile;
            this.layers.set(uri, file);
            return file;
        }
        return this.layers.get(uri)!; 
    }
}