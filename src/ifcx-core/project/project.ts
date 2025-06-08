
// TODO: schema prefixes
async function SatisfyDependencies(activeLayer: IfcxFile, placed: Map<string, boolean>, orderedLayers: IfcxFile[])
{
    let pending: IfcxFile[] = [];
    for (const using of activeLayer.using) {
        if (!placed.has(using.id))
        {
            let layer = await FetchUsing(using);
            pending.push(layer);
            placed.set(using.id, true);
        }
    }
    let temp: IfcxFile[] = [];
    for (const layer of pending) {
        temp.push(layer);
        temp.push(...(await SatisfyDependencies(layer, placed, orderedLayers)));
    }

    return temp;
}

async function BuildLayerSet(activeLayer: IfcxFile)
{
    let layerSet: IfcxFile[] = [];
    await SatisfyDependencies(activeLayer, new Map<string, boolean>(), layerSet);
    return layerSet;
}