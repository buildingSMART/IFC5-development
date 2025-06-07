import { CycleError, FindRootsOrCycles } from "./cycles";
import { CompositionInputNode, GetChildNodeWithPath, MakePostCompositionNode, PostCompositionNode, PreCompositionNode } from "./node";
import { GetHead, GetTail } from "./path";

/* 
    Doing composition on ifcx files takes three phases:

    1. Federation:
        Merging all ifcx data into a single ifcx file, in layer order
        
        In the remaining proces, the layers or ifcx files are irrelevant, the only thing that matters is the order of the nodes.

    2. Flattening: 
        convert the ifcx input nodes (where many nodes can talk about the same path) 
            to "pre-composition" nodes, where there is a unique node per path.
            
            This proces resolves the layer conflicts by having later nodes "win" over earlier nodes
    
    2. Composition
        convert the pre-composition nodes in to post-composition nodes by expanding the inherits,
            and recursively composing all children
            
            This proces resolves occurrence vs type level data
*/

function FlattenPathToPreCompositionNode(path: string, inputNodes: CompositionInputNode[])
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

export function FlattenCompositionInput(input: Map<string, CompositionInputNode[]>)
{
    let compositionNodes = new Map<string, PreCompositionNode>();

    for(let [path, inputNodes] of input)
    {
        compositionNodes.set(path, FlattenPathToPreCompositionNode(path, inputNodes));
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
    return ComposeNodeFromPath([...roots.values()][0], nodes);
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
        pseudoRoot.children.set(root, ComposeNodeFromPath(root, nodes));
    });

    return pseudoRoot;
}

export function ComposeNodeFromInput(path: string, compositionInputNodes: Map<string, CompositionInputNode[]>)
{
    return ExpandNodeWithCompositionInput(path, FlattenCompositionInput(compositionInputNodes));
}

export function ExpandNodeWithCompositionInput(path: string, preCompositionNodes: Map<string, PreCompositionNode>)
{
    let roots = FindRootsOrCycles(preCompositionNodes);
    if (!roots)
    {
        throw new CycleError();
    }
    return ComposeNodeFromPath(path, preCompositionNodes);
}

export function ComposeNodeFromPath(path: string, preCompositionNodes: Map<string, PreCompositionNode>)
{
    return ComposeNode(path, MakePostCompositionNode(path), preCompositionNodes);
}

export function ComposeNode(path: string, postCompositionNode: PostCompositionNode, preCompositionNodes: Map<string, PreCompositionNode>)
{
    let preCompositionNode = preCompositionNodes.get(path);

    if (preCompositionNode)
    {
        // fill children from inherits/children on <class>
        AddDataFromPreComposition(preCompositionNode, postCompositionNode, preCompositionNodes);
    }

    // bunch of children are now added, but this creates new prefixes for the children
    // must check these prefixes now
    postCompositionNode.children.forEach((child, name) => {
        ComposeNode(`${path}/${name}`, child, preCompositionNodes);
    })

    return postCompositionNode;
}

function AddDataFromPreComposition(input: PreCompositionNode, node: PostCompositionNode, nodes: Map<string, PreCompositionNode>)
{
    Object.values(input.inherits).forEach((inheritPath) => {
        // inherit can be <class>/a/b
        // request <class>
        let classNode = ComposeNodeFromPath(GetHead(inheritPath), nodes);
        // request /a/b
        let subnode = GetChildNodeWithPath(classNode, GetTail(inheritPath));
        if (!subnode) throw new Error(`Unknown node ${inheritPath}`);
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
            let classNode = ComposeNodeFromPath(GetHead(child), nodes);
            // request /b/c
            let subnode = GetChildNodeWithPath(classNode, GetTail(child));
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
