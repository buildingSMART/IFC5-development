import { components } from "../../schema/out/ts/ifcx";

type IfcxFile = components["schemas"]["IfcxFile"];
type IfcxNode = components["schemas"]["IfcxNode"];

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


function ToInputNodes(data: IfcxNode[])
{
    let inputNodes = new Map<string, InputNode[]>();
    data.forEach((ifcxNode) => {
        let node = {
            path: ifcxNode.name,
            children: ifcxNode.children,
            inherits: ifcxNode.inherits,
            attributes: ifcxNode.attributes
        } as InputNode;
        MMSet(inputNodes, node.path, node);
    });
    return inputNodes;
}

function LoadIfcxFile(file: IfcxFile)
{
    return ExpandNodeWithInput(file.header.defaultNode, ToInputNodes(file.data));
}

function Federate(file1: IfcxFile, file2: IfcxFile)
{
    let result: IfcxFile = {
        header: file1.header,
        schemas: {},
        data: []
    };

    file1.data.forEach((node) => result.data.push(node));
    file2.data.forEach((node) => result.data.push(node));

    return Prune(result);
}

function Collapse(nodes: InputNode[]): InputNode
{
    let result: InputNode = {
        path: nodes[0].path,
        children: {},
        inherits: {},
        attributes: {}
    }

    nodes.forEach((node) => {
        Object.keys(node.children).forEach((name) => {
            result.children[name] = node.children[name];
        })
        Object.keys(node.inherits).forEach((name) => {
            result.inherits[name] = node.inherits[name];
        })
        Object.keys(node.attributes).forEach((name) => {
            result.attributes[name] = node.attributes[name];
        })
    })

    // even if a node is empty, it sticks around, as it may be doing a delete

    return result;
}

function Prune(file: IfcxFile)
{
    let result: IfcxFile = {
        header: file.header,
        schemas: file.schemas,
        data: []
    };

    let inputNodes = ToInputNodes(file.data);

    inputNodes.forEach((nodes) => {
        let collapsed = Collapse(nodes);
        result.data.push({
            name: collapsed.path,
            children: collapsed.children,
            inherits: collapsed.inherits,
            attributes: collapsed.attributes
        });
    })

    return result;
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

function ConvertNodes(input: Map<string, InputNode[]>)
{
    let compositionNodes = new Map<string, CompositionInput>();

    for(let [path, inputNodes] of input)
    {
        compositionNodes.set(path, ConvertToCompositionNode(path, inputNodes));
    }

    return compositionNodes;
}

export function ExpandNodeWithInput(node: string, nodes: Map<string, InputNode[]>)
{
    return ExpandNode(node, MakeNode(node), ConvertNodes(nodes));
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