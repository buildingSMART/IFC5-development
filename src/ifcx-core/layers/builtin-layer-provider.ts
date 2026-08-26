import { IfcxFile } from "../schema/schema-helper";
import { RemoteLayerProvider } from "./layer-providers";

// Offline counterpart to FetchLayerProvider: resolves the well-known
// standard schema/layer URIs (https://ifcx.dev/...) from a map embedded at
// build time instead of issuing a network request. Never fetches -- an
// unresolved URI is always an Error, exactly like a 404 would have been.
export class BuiltinLayerProvider implements RemoteLayerProvider
{
    layers: Record<string, IfcxFile>;

    constructor(layers: Record<string, IfcxFile>)
    {
        this.layers = layers;
    }

    async GetLayerByURI(uri: string): Promise<IfcxFile | Error> {
        const layer = this.layers[uri];
        if (!layer) {
            return new Error(`File with id "${uri}" not found (offline viewer: not embedded)`);
        }
        return layer;
    }
}
