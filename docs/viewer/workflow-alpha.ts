import { components } from "../../schema/out/ts/ifcx";
import { ExpandNodeWithInput, InputNode } from "./compose-alpha";

type IfcxFile = components["schemas"]["IfcxFile"];
type IfcxNode = components["schemas"]["IfcxNode"];
type IfcxJSONFile = components["schemas"]["IfcxJSONFile"];

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

export function IfcxJSONToIfcxFile(file: IfcxJSONFile)
{
    file.data.forEach(node => {
        Object.keys(node.attributes).forEach((key) => {
            let val = node.attributes[key];
            node.attributes[key] = JSON.stringify(val);
        })
    });

    return file as IfcxFile;
}

export function IfcxToIfcxJSONFile(file: IfcxFile)
{
    file.data.forEach(node => {
        Object.keys(node.attributes).forEach((key) => {
            let val = node.attributes[key];
            node.attributes[key] = JSON.parse(val);
        })
    });

    return file as IfcxJSONFile;
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

export function LoadIfcxFile(file: IfcxFile)
{
    return ExpandNodeWithInput(file.header.defaultNode, ToInputNodes(file.data));
}

function MakeInputNode(path: string)
{
    return {
        path,
        children: {},
        inherits: {},
        attributes: {}
    } as InputNode;
}

function DeepEqual(a: any, b: any)
{
    // TODO: slow
    return JSON.stringify(a) === JSON.stringify(b);
}

// Node 2 wins
function DiffNodes(node1: InputNode, node2: InputNode): IfcxNode
{
    let result = {
        name: node1.path,
        children: {},
        inherits: {},
        attributes: {}
    } as IfcxNode;

    Object.keys(node1.children).forEach((name) => {
        if (node1.children[name] !== node2.children[name])
        {
            result.children[name] = node2.children[name] ? node2.children[name] : null;
        }
    })
    
    Object.keys(node1.inherits).forEach((name) => {
        if (node1.inherits[name] !== node2.inherits[name])
        {
            result.inherits[name] = node2.inherits[name] ? node2.inherits[name] : null;
        }
    })
    
    Object.keys(node1.attributes).forEach((name) => {
        if (!DeepEqual(node1.attributes[name], node2.attributes[name]))
        {
            result.attributes[name] = node2.attributes[name] ? node2.attributes[name] : null;
        }
    })

    return result;
}

// file 2 wins
export function Diff(file1: IfcxFile, file2: IfcxFile)
{
    let result: IfcxFile = {
        header: file1.header,
        schemas: {},
        data: []
    };

    let i1 = ToInputNodes(file1.data);
    let i2 = ToInputNodes(file2.data);

    for (let [path, nodes] of i1)
    {
        let file2Node: InputNode | null = null;
        if (i2.has(path))
        {
            // diff
            file2Node = Collapse(i2.get(path)!);
        }
        if (file2Node === null)
        {
            // node was removed, make dummy
            file2Node = MakeInputNode(path);
        }
        let file1Node = Collapse(nodes)!;
        result.data.push(DiffNodes(file1Node, file2Node));
    }

    for (let [path, nodes] of i2)
    {
        let file1Node: InputNode | null = null;
        if (i1.has(path))
        {
            // diff
            file1Node = Collapse(i1.get(path)!);
        }
        if (file1Node === null)
        {
            // node was added, make dummy`
            file1Node = MakeInputNode(path);
        }
        let file2Node = Collapse(nodes)!;
        result.data.push(DiffNodes(file1Node, file2Node));
    }

    return result;
}

export function Federate(file1: IfcxFile, file2: IfcxFile)
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

function Collapse(nodes: InputNode[], deleteEmpty: boolean = false): InputNode | null
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

    if (deleteEmpty)
    {
        let empty = true;
        Object.keys(result.children).forEach((name) => {
            if (result.children[name] !== null) empty = false;
        })
        Object.keys(result.inherits).forEach((name) => {
            if (result.inherits[name] !== null) empty = false;
        })
        Object.keys(result.attributes).forEach((name) => {
            if (result.attributes[name] !== null) empty = false;
        })

        if (empty) return null;
    }

    return result;
}

function Prune(file: IfcxFile, deleteEmpty: boolean = false)
{
    let result: IfcxFile = {
        header: file.header,
        schemas: file.schemas,
        data: []
    };

    let inputNodes = ToInputNodes(file.data);

    inputNodes.forEach((nodes) => {
        let collapsed = Collapse(nodes, deleteEmpty);
        if (collapsed) result.data.push({
            name: collapsed.path,
            children: collapsed.children,
            inherits: collapsed.inherits,
            attributes: collapsed.attributes
        });
    })

    return result;
}