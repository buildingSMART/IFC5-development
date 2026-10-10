import { GetTail } from "./path";

// One layer's value for an attribute: the layer id, the node path that held it, and the value
export interface Opinion
{
    layer: string;
    path: string;
    value: any;
}

export interface CompositionInputNode
{
    path: string;
    layer?: string;
    children: {[key: string]: string | null};
    inherits: {[key: string]: string | null};
    attributes: {[key: string]: any | null};
}

export interface PreCompositionNode
{
    path: string;
    children: {[key: string]: string | null};
    inherits: {[key: string]: string};
    attributes: {[key: string]: any | null};
    // only set when the input nodes carry a layer: the input nodes for this path, in layer order
    inputs?: CompositionInputNode[];
}

export interface PostCompositionNode
{
    node: string;
    attributes: Map<string, any>;
    children: Map<string, PostCompositionNode>;
    // only set when composing with provenance; read it with GetOpinions
    sources?: OpinionSource[];
}

// an input node that wrote attributes here, or the sources of a node inherited from
export type OpinionSource = CompositionInputNode | OpinionSource[];

// Every opinion for an attribute of a node composed with provenance, in precedence order: the last one is the composed value
export function GetOpinions(node: PostCompositionNode, attrID: string): Opinion[]
{
    let opinions: Opinion[] = [];
    let collect = (sources: OpinionSource[]) => sources.forEach((source) => {
        if (Array.isArray(source)) return collect(source);
        if (attrID in source.attributes) opinions.push({ layer: source.layer!, path: source.path, value: source.attributes[attrID] });
    });
    collect(node.sources || []);
    return opinions;
}


export function MakePostCompositionNode(node: string)
{
    return {
        node,
        children: new Map<string, PostCompositionNode>,
        attributes: new Map<string, any>,
        sources: undefined
    } as PostCompositionNode;   
}

export function GetChildNodeWithPath(node: PostCompositionNode, path: string): PostCompositionNode | null
{
    if (path === "") return node;
    let parts = path.split("/");
    let child = node.children.get(parts[0]);
    if (child)
    {
        if (parts.length === 1)
        {
            return child;
        }
        return GetChildNodeWithPath(child, GetTail(path));
    }
    else
    {
        return null;
    }
}