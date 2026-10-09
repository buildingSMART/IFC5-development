import { PostCompositionNode } from "../composition/node";
import { IfcxFile, IfcxSchema } from "../schema/schema-helper";
import { Federate, LoadIfcxFile } from "../workflows";
import { RemoteLayerProvider } from "./layer-providers";


export class IfcxLayerStack
{
    // In federation order: every layer after the layers it imports, so a
    // layer overrides its imports. The main layer is last.
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
        this.federated.header = this.layers[this.layers.length - 1].header;
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

    // Returns the layers `activeLayer` depends on, each once, in federation
    // order: every layer after its own imports, and sibling imports in the
    // order they are written, so a later import overrides an earlier one.
    // A layer is placed where the walk first reaches it, so when an earlier
    // import also imports a later sibling, that sibling goes before it.
    // The caller adds them to the layer set; a nested call must not, or its
    // layers would be added once there and again by every caller above it.
    private async ReturnRecursiveDependencies(activeLayer: IfcxFile, placed: Set<string>)
    {
        let temp: IfcxFile[] = [];
        for (const impt of activeLayer.imports) {
            if (placed.has(impt.uri))
            {
                continue;
            }
            placed.add(impt.uri);
            let layer = await this.provider.GetLayerByURI(impt.uri);
            if (layer instanceof Error)
            {
                return layer;
            }
            let layers = await this.ReturnRecursiveDependencies(layer, placed);
            if (layers instanceof Error)
            {
                return layers;
            }
            temp.push(...layers);
            temp.push(layer);
        }

        return temp;
    }

    private async BuildLayerSet(activeLayerID: string)
    {
        let activeLayer = await this.provider.GetLayerByURI(activeLayerID);
        if (activeLayer instanceof Error)
        {
            return activeLayer;
        }

        let placed = new Set<string>();
        placed.add(activeLayer.header.id); // TODO: remove
        let result = await this.ReturnRecursiveDependencies(activeLayer, placed);
        if (result instanceof Error)
        {
            return result;
        }
        // The main layer goes last, so it overrides everything it imports.
        return [...result, activeLayer];
    }
}