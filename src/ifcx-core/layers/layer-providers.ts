import { IfcxFile } from "../schema/schema-helper";
import { log } from "../util/log";

export interface RemoteLayerProvider
{
    GetLayerByURI(uri: string): Promise<IfcxFile | Error>;
}

export class StackedLayerProvider implements RemoteLayerProvider
{
    providers: RemoteLayerProvider[];
    constructor(providers: RemoteLayerProvider[])
    {
        this.providers = providers;
    }

    async GetLayerByURI(uri: string): Promise<IfcxFile | Error> 
    {
        let errorStack: Error[] = [];
        for (let provider of this.providers)
        {
            let layer = await provider.GetLayerByURI(uri);
            if (!(layer instanceof Error))
            {
                return layer;
            }
            else
            {
                errorStack.push(layer);
            }
        }

        return new Error(JSON.stringify(errorStack));
    }
}

export class InMemoryLayerProvider implements RemoteLayerProvider
{
    layers: Map<string, IfcxFile>;

    constructor()
    {
        this.layers = new Map<string, IfcxFile>();
    }

    async GetLayerByURI(uri: string): Promise<IfcxFile | Error> {
        
        if (!this.layers.has(uri))
        {
            return new Error(`File with uri "${uri}" not found`);
        }
        return this.layers.get(uri)!; 
    }

    add(file: IfcxFile)
    {
        if (this.layers.has(file.header.id))
        {
            throw new Error(`Inserting file with duplicate ID "${file.header.id}"`);
        }
        this.layers.set(file.header.id, file);
        return this;
    }
    
    AddAll(files: IfcxFile[])
    {
        files.forEach(f => this.add(f));
        return this;
    }
}
