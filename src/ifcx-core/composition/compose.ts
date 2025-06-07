import { CycleError, FindRootsOrCycles } from "./cycles";
import { CompositionInputNode, GetNode, MakeNode, PostCompositionNode, PreCompositionNode } from "./node";
import { GetHead, GetTail } from "./path";


function ConvertToPreCompositionNode(path: string, inputNodes: CompositionInputNode[])
{
    let compositionNode = {
        path,
        children: {},
        inherits: {},
        attributes: {}
    } as PreCompositionNode;

    inputNodes.forEach((node) => {
        Object.keys(node.children).forEach((childName) => {
            compositionNode.children[childName] = node.children[childName];
        })
        
        Object.keys(node.inherits).forEach((inheritName) => {
            let ih = node.inherits[inheritName];
            if (ih === null)
            {
                delete compositionNode.inherits[inheritName];
            }
            else
            {
                compositionNode.inherits[inheritName] = ih;
            }
        })

        Object.keys(node.attributes).forEach((attrName) => {
            compositionNode.attributes[attrName] = node.attributes[attrName];
        })
    })
    
    return compositionNode;
}

// this is a helper function that makes a regular Map behave as a multi map
function MMSet<A, B>(map: Map<A, B[]>, key: A, value: B)
{
    if (map.has(key))
    {
        map.get(key)?.push(value);
    }
    else
    {
        map.set(key, [value]);
    }
}

export function ConvertNodes(input: Map<string, CompositionInputNode[]>)
{
    let compositionNodes = new Map<string, PreCompositionNode>();

    for(let [path, inputNodes] of input)
    {
        compositionNodes.set(path, ConvertToPreCompositionNode(path, inputNodes));
    }

    return compositionNodes;
}

export function ExpandFirstRootInInput(nodes: Map<string, PreCompositionNode>)
{
    let roots = FindRootsOrCycles(nodes);
    if (!roots)
    {
        throw new CycleError();
    }
    return ExpandNewNode([...roots.values()][0], nodes);
}

export function CreateArtificialRoot(nodes: Map<string, PreCompositionNode>)
{
    let roots = FindRootsOrCycles(nodes);
    if (!roots)
    {
        throw new CycleError();
    }
    let pseudoRoot = {
        node: "",
        attributes: new Map<string, any>(),
        children: new Map<string, PostCompositionNode>()
    } as PostCompositionNode;

    roots.forEach((root) => {
        pseudoRoot.children.set(root, ExpandNewNode(root, nodes));
    });

    return pseudoRoot;
}

export function ExpandNodeWithInput(node: string, nodes: Map<string, CompositionInputNode[]>)
{
    return ExpandNodeWithCompositionInput(node, ConvertNodes(nodes));
}

export function ExpandNodeWithCompositionInput(node: string, nodes: Map<string, PreCompositionNode>)
{
    let roots = FindRootsOrCycles(nodes);
    if (!roots)
    {
        throw new CycleError();
    }
    return ExpandNewNode(node, nodes);
}

export function ExpandNewNode(node: string, nodes: Map<string, PreCompositionNode>)
{
    return ExpandNode(node, MakeNode(node), nodes);
}

export function ExpandNode(path: string, node: PostCompositionNode, nodes: Map<string, PreCompositionNode>)
{
    let input = nodes.get(path);

    if (input)
    {
        // fill children from inherits/children on <class>
        AddDataFromInput(input, node, nodes);
    }

    // bunch of children are now added, but this creates new prefixes for the children
    // must check these prefixes now
    node.children.forEach((child, name) => {
        ExpandNode(`${path}/${name}`, child, nodes);
    })

    return node;
}

function AddDataFromInput(input: PreCompositionNode, node: PostCompositionNode, nodes: Map<string, PreCompositionNode>)
{
    Object.values(input.inherits).forEach((inherit) => {
        // inherit can be <class>/a/b
        // request <class>
        let classNode = ExpandNewNode(GetHead(inherit), nodes);
        // request /a/b
        let subnode = GetNode(classNode, GetTail(inherit));
        if (!subnode) throw new Error(`Unknown node ${inherit}`);
        // add children of /a/b to this children
        subnode.children.forEach((child, childName) => {
            node.children.set(childName, child);
        })
        
        for (let [attrID, attr] of subnode.attributes) {
            node.attributes.set(attrID, attr);
        }
    });

    Object.entries(input.children).forEach(([childName, child]) => {
        if (child !== null)
        {
            // child is always a -> <class>/b/c
            let classNode = ExpandNewNode(GetHead(child), nodes);
            // request /b/c
            let subnode = GetNode(classNode, GetTail(child));
            if (!subnode) throw new Error(`Unknown node ${child}`);
            // add <node>/a/b/c
            node.children.set(childName, subnode);
        }
        else
        {
            node.children.delete(childName);
        }
    });

    Object.entries(input.attributes).forEach(([attrID, attr]) => {
        node.attributes.set(attrID, attr);
    })
}
