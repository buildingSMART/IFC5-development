
export interface CompositionInput
{
    path: string;
    children: {[key: string]: string | null};
    inherits: {[key: string]: string};
    attributes: {[key: string]: any | null};
}

export interface InputNode
{
    path: string;
    children: {[key: string]: string | null};
    inherits: {[key: string]: string | null};
    attributes: {[key: string]: any | null};
}

export interface TreeNode
{
    node: string;
    attributes: Map<string, any>;
    children: Map<string, TreeNode>;
}

function GetNode(node: TreeNode, path: string): TreeNode | null
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
        return GetNode(child, GetTail(path));
    }
    else
    {
        return null;
    }
}

function GetHead(path: string)
{
    return path.split("/")[0];
}

function GetTail(path: string)
{
    let parts = path.split("/");
    parts.shift();
    return parts.join("/");
}

function MakeNode(node: string)
{
    return {
        node,
        children: new Map<string, TreeNode>,
        attributes: new Map<string, any>
    } as TreeNode;   
}

function ConvertToCompositionNode(path: string, inputNodes: InputNode[])
{
    let compositionNode = {
        path,
        children: {},
        inherits: {},
        attributes: {}
    } as CompositionInput;

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

// https://en.wikipedia.org/wiki/Topological_sorting
function FindRootsOrCycles(nodes: Map<string, CompositionInput>)
{
    let dependencies = new Map<string, string[]>();
    let dependents = new Map<string, string[]>();
    nodes.forEach((node, path) => {
        Object.keys(node.inherits).forEach((inheritName) => {
            MMSet(dependencies, path, node.inherits[inheritName]);
            MMSet(dependents, node.inherits[inheritName], path);
        })
        Object.keys(node.children).forEach((childName) => {
            MMSet(dependencies, path, node.children[childName]);
            MMSet(dependents, node.children[childName], path);
        })
    });
    let paths = [...nodes.keys()];
    let perm: {} = {};
    let temp: {} = {};

    function visit(path: string)
    {
        if (perm[path]) return;
        if (temp[path]) throw new Error(`CYCLE!`);

        temp[path] = true;

        let deps = dependencies.get(path);
        if (deps)
        {
            deps.forEach(dep => visit(dep));
        }

        perm[path] = true;

        // if we wanted to toposort, this is where we would add the node to a sorted list
    }

    let roots = new Set<string>();
    try {
        paths.forEach((path) => {
            // TODO: dirty check for "/", fix: look only at heads for dependencies and determining roots, should check
            if (!dependents.has(path) && path.indexOf("/") === -1)
            {
                roots.add(path);
            }
            visit(path);
        })    
    } catch (e)
    {
        // cycle found, return
        return null;
    }

    return roots;
}

export function ConvertNodes(input: Map<string, InputNode[]>)
{
    let compositionNodes = new Map<string, CompositionInput>();

    for(let [path, inputNodes] of input)
    {
        compositionNodes.set(path, ConvertToCompositionNode(path, inputNodes));
    }

    return compositionNodes;
}

export class CycleError extends Error
{
    
}

export function ExpandFirstRootInInput(nodes: Map<string, CompositionInput>)
{
    let roots = FindRootsOrCycles(nodes);
    if (!roots)
    {
        throw new CycleError();
    }
    return ExpandNewNode([...roots.values()][0], nodes);
}

export function CreateArtificialRoot(nodes: Map<string, CompositionInput>)
{
    let roots = FindRootsOrCycles(nodes);
    if (!roots)
    {
        throw new CycleError();
    }
    let pseudoRoot = {
        node: "",
        attributes: new Map<string, any>(),
        children: new Map<string, TreeNode>()
    } as TreeNode;

    roots.forEach((root) => {
        pseudoRoot.children.set(root, ExpandNewNode(root, nodes));
    });

    return pseudoRoot;
}

export function ExpandNodeWithInput(node: string, nodes: Map<string, InputNode[]>)
{
    return ExpandNodeWithCompositionInput(node, ConvertNodes(nodes));
}

export function ExpandNodeWithCompositionInput(node: string, nodes: Map<string, CompositionInput>)
{
    let roots = FindRootsOrCycles(nodes);
    if (!roots)
    {
        throw new CycleError();
    }
    return ExpandNewNode(node, nodes);
}

export function ExpandNewNode(node: string, nodes: Map<string, CompositionInput>)
{
    return ExpandNode(node, MakeNode(node), nodes);
}

export function ExpandNode(path: string, node: TreeNode, nodes: Map<string, CompositionInput>)
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

function AddDataFromInput(input: CompositionInput, node: TreeNode, nodes: Map<string, CompositionInput>)
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