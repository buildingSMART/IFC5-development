import { IfcxFile } from "../schema/schema-helper";
import { log } from "../util/log";

export interface RemoteLayerProvider
{
    GetLayerByID(id: string): Promise<IfcxFile | Error>;
}

export class InMemoryLayerProvider implements RemoteLayerProvider
{
    layers: Map<string, IfcxFile>;

    constructor()
    {
        this.layers = new Map<string, IfcxFile>();
    }

    async GetLayerByID(id: string): Promise<IfcxFile | Error> {
        
        if (!this.layers.has(id))
        {
            return new Error(`File with id "${id}" not found`);
        }
        return this.layers.get(id)!; 
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
}
