import { GetTail } from "./path";

export interface CompositionInputNode
{
    path: string;
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
}

export interface PostCompositionNode
{
    node: string;
    attributes: Map<string, any>;
    children: Map<string, PostCompositionNode>;
}


export function MakePostCompositionNode(node: string)
{
    return {
        node,
        children: new Map<string, PostCompositionNode>,
        attributes: new Map<string, any>
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