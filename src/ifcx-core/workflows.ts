import { FlattenCompositionInput, CreateArtificialRoot, ExpandFirstRootInInput } from "./composition/compose";
import { CompositionInputNode } from "./composition/node";
import { IfcxFile, IfcxNode, ImportNode } from "./schema/schema-helper";
import { Validate } from "./schema/schema-validation";
import { MMSet } from "./util/mm";

function ToInputNodes(data: IfcxNode[])
{
    let inputNodes = new Map<string, CompositionInputNode[]>();
    data.forEach((ifcxNode) => {
        let node = {
            path: ifcxNode.path,
            children: ifcxNode.children ? ifcxNode.children : {}, 
            inherits: ifcxNode.inherits ? ifcxNode.inherits : {},
            attributes: ifcxNode.attributes ? ifcxNode.attributes : {}
        } as CompositionInputNode;
        MMSet(inputNodes, node.path, node);
    });
    return inputNodes;
}


// TODO: cleanup options by creating better API
export function LoadIfcxFile(file: IfcxFile, checkSchemas: boolean = true, createArtificialRoot: boolean = true)
{
    let inputNodes = ToInputNodes(file.data);
    let compositionNodes = FlattenCompositionInput(inputNodes);

    try {
        if (checkSchemas)
        {
            Validate(file.schemas, compositionNodes);
        }
    } catch (e)
    {
        throw e;
    }

    if (createArtificialRoot)
    {
        return CreateArtificialRoot(compositionNodes);
    }
    else
    {
        return ExpandFirstRootInInput(compositionNodes);
    }
}

function MakeInputNode(path: string)
{
    return {
        path,
        children: {},
        inherits: {},
        attributes: {}
    } as CompositionInputNode;
}

function DeepEqual(a: any, b: any)
{
    // TODO: slow
    return JSON.stringify(a) === JSON.stringify(b);
}

// Node 2 wins
function DiffNodes(node1: CompositionInputNode, node2: CompositionInputNode): IfcxNode
{
    let result = {
        path: node1.path,
        children: {},
        inherits: {},
        attributes: {}
    } as IfcxNode;

    Object.keys(node1.children).forEach((name) => {
        if (node1.children[name] !== node2.children[name])
        {
            result.children![name] = node2.children[name] ? node2.children[name] : null;
        }
    })
    
    Object.keys(node1.inherits).forEach((name) => {
        if (node1.inherits[name] !== node2.inherits[name])
        {
            result.inherits![name] = node2.inherits[name] ? node2.inherits[name] : null;
        }
    })
    
    Object.keys(node1.attributes).forEach((name) => {
        if (!DeepEqual(node1.attributes[name], node2.attributes[name]))
        {
            result.attributes![name] = node2.attributes[name] ? node2.attributes[name] : null;
        }
    })

    return result;
}

// file 2 wins
export function Diff(file1: IfcxFile, file2: IfcxFile)
{
    let result: IfcxFile = {
        header: file1.header,
        imports: [],
        schemas: {},
        data: []
    };

    let i1 = ToInputNodes(file1.data);
    let i2 = ToInputNodes(file2.data);

    for (let [path, nodes] of i1)
    {
        let file2Node: CompositionInputNode | null = null;
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
        if (i1.has(path))
        {
            // diff has already been done
            continue;
        }
        // node was added, make dummy
        let file1Node = MakeInputNode(path);
        let file2Node = Collapse(nodes)!;
        result.data.push(DiffNodes(file1Node, file2Node));
    }

    result.data.forEach((node) => {
        if (node.attributes)
        {
            Object.keys(node.attributes).forEach((schemaID) => {
                result.schemas[schemaID] = file2.schemas[schemaID];
            });
        }
    })

    return result;
}

export function Federate(files: IfcxFile[])
{
    if (files.length === 0)
    {
        throw new Error(`Trying to federate empty set of files`);
    }

    let result: IfcxFile = {
        header: files[0].header,
        imports: [],
        schemas: {},
        data: []
    };

    files.forEach((file) => {
        Object.keys(file.schemas).forEach((schemaID) => result.schemas[schemaID] = file.schemas[schemaID]);
    })

    files.forEach((file) => {
        file.data.forEach((node) => result.data.push(node));
    })

    return Prune(result);
}

function Collapse(nodes: CompositionInputNode[], deleteEmpty: boolean = false): CompositionInputNode | null
{
    let result: CompositionInputNode = {
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
        imports: [],
        schemas: file.schemas,
        data: []
    };

    let inputNodes = ToInputNodes(file.data);

    inputNodes.forEach((nodes) => {
        let collapsed = Collapse(nodes, deleteEmpty);
        if (collapsed) result.data.push({
            path: collapsed.path,
            children: collapsed.children,
            inherits: collapsed.inherits,
            attributes: collapsed.attributes
        });
    })

    return result;
}