import { PostCompositionNode } from "../composition/node";
import { IfcxFile, IfcxSchema } from "../schema/schema-helper";
import { Federate, LoadIfcxFile } from "../workflows";
import { RemoteLayerProvider } from "./layer-providers";


export class IfcxLayerStack
{
    // main layer at 0
    private layers: IfcxFile[];
    private tree: PostCompositionNode;
    private schemas: {[key:string]:IfcxSchema};
    private federated: IfcxFile;

    constructor(layers: IfcxFile[])
    {
        this.layers = layers;
        this.Compose();
    }

    public GetLayerIds()
    {
        return this.layers.map(l => l.header.id);
    }

    private Compose()
    {
        this.federated = Federate(this.layers);
        // TODO: schema files
        this.schemas = this.federated.schemas;
        this.tree = LoadIfcxFile(this.federated);
    }

    public GetFullTree()
    {
        this.Compose();
        return this.tree;
    }

    public GetFederatedLayer()
    {
        return this.federated;
    }

    public GetSchemas()
    {
        return this.schemas;
    }
}

export class IfcxLayerStackBuilder
{
    provider: RemoteLayerProvider;
    mainLayerId: string | null = null;

    constructor(provider: RemoteLayerProvider)
    {
        this.provider = provider;
    }
    
    FromId(id: string)
    {
        this.mainLayerId = id;
        return this;
    }

    async Build(): Promise<IfcxLayerStack | Error>
    {
        if (!this.mainLayerId) throw new Error(`no main layer ID specified`);

        let layers = await this.BuildLayerSet(this.mainLayerId);

        if (layers instanceof Error)
        {
            return layers;
        }

        try
        {
            return new IfcxLayerStack(layers);
        }
        catch (e)
        {
            return e;
        }
    }

    private async SatisfyDependencies(activeLayer: IfcxFile, placed: Map<string, boolean>, orderedLayers: IfcxFile[])
    {
        let pending: IfcxFile[] = [];
        for (const impt of activeLayer.imports) {
            if (!placed.has(impt.uri))
            {
                let layer = await this.provider.GetLayerByURI(impt.uri);
                if (layer instanceof Error)
                {
                    return layer;
                }
                pending.push(layer);
                placed.set(impt.uri, true);
            }
        }
        let temp: IfcxFile[] = [];
        for (const layer of pending) {
            temp.push(layer);
            let layers = await this.SatisfyDependencies(layer, placed, orderedLayers);
            if (layers instanceof Error)
            {
                return layers;
            }
            temp.push(...layers);
        }

        temp.forEach(t => orderedLayers.push(t));

        return temp;
    }

    private async BuildLayerSet(activeLayerID: string)
    {
        let activeLayer = await this.provider.GetLayerByURI(activeLayerID);
        if (activeLayer instanceof Error)
        {
            return activeLayer;
        }

        let layerSet: IfcxFile[] = [activeLayer]; // TODO: remove
        let placed = new Map<string, boolean>();
        placed.set(activeLayer.header.id, true); // TODO: remove
        let result = await this.SatisfyDependencies(activeLayer, placed, layerSet);
        if (result instanceof Error)
        {
            return result;
        }
        
        return layerSet;
    }
}