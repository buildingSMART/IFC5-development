import { ClassJson, DefJson, Ifc5FileJson, OverJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { ComposedObject } from "./compose";

const ID_DELIM = "/";
const PSEUDO_ROOT = "";

type ComponentTypes = "UsdGeom:Mesh" | "UsdGeom:Xform" | "UsdGeom:BasisCurves" | "UsdShade:Material" | "UsdShade:Shader" | "Xform" | undefined;

// should really use something like this class to support more interesting OVERs, but first fix name !== id problem
class Ifc5ID
{
    parts: string[];

    constructor(parts: string[])
    {
        this.parts = parts;
    }

    toString()
    {
        return this.parts.join(ID_DELIM);
    }

    static fromString(id: string)
    {
        return new Ifc5ID(id.split(ID_DELIM));
    }
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

// currently both class and def support nested children, this creates complexity that we can avoid by pulling those nested children out and renaming them
function CollectDefChildren(input: {name: string, children?: DefJson[]}[], output: DefJson[], children: Map<string, string[]>)
{
    // we do this in two phases because the input and output may be the same array
    let addedDefs: DefJson[] = []; 

    input.filter(o => "children" in o).forEach((parent) => {
        parent.children!.forEach(def => {
            // hack defs are not uniquely named, so we prefix them with parent and copy
            let newDefName = `${parent.name}/${def.name}`;
            addedDefs.push({
                ...def,
                name: newDefName
            });
            MMSet(children, parent.name, newDefName);
        })
    })

    output.push(...addedDefs);
}

// the inherit paths are not used as paths but only as identifiers, see IFC5ID above
function CleanInherit(inheritString: string)
{
    // inherits looks like this: </Ne0834921e09540f088743c6bd1ec699e>
    return inheritString.substring(2, inheritString.length - 1);
}

function CollectInherits(input: {name: string, inherits?: string[]}[], collection: Map<string, string[]>)
{
    input.forEach(input => {
        if (input.inherits)
        {
            input.inherits.forEach(parent => {
                // inherits seems to work in reverse
                MMSet(collection, input.name, CleanInherit(parent));
            })
        }
    })
}

// Undo the attribute namespace of over prims introduced in 'ECS'.
// this should probably not be done to simplify validation and (de)serialization of components
function prefixAttributesWithComponentName(attributes: any): any {
    let prefixed = {};
    
    Object.keys(attributes).forEach((componentName) => {
        // regular component attributes, hard to detect...
        if (attributes[componentName] !== null && typeof attributes[componentName] === "object" && !Array.isArray(attributes[componentName]))
        {
            Object.keys(attributes[componentName]).forEach((valueName) => {
                prefixed[`${componentName}:${valueName}`] = attributes[componentName][valueName];
            });
        }
        else
        {
            // special inline attributes, nothing to prefix
            prefixed[componentName] = attributes[componentName];
        }
    });

    return prefixed;
}

// an array of attributes ("opinions") are flattened to one (conflict-free) list, later indices in the array should "win"
function CondenseAttributes(attrs: any[] | undefined)
{
    if (!attrs) return undefined;

    let condensed = {};
    attrs.filter(a => a).forEach(attributes => {
        condensed = {...condensed, ...attributes}
    });

    return condensed;
}

/*
    The layer system requires us to delay the actual composition 
    until after all layers have contributed their "opinion" of 
    what the composition tree looks like

    This data structure contains all information that a layer expresses about the tree,
    multiple layers can be composed by filling the instance of this datastructure, 
    the order insertion into this datastructure determines the priority of the layers,
    later being more important and overriding earlier layers.

    This data structure, after all layers are added to it, can be used to construct a composed tree.
    */
class IntermediateComposition
{
    names = new Set<string>();
    children = new Map<string, string[]>;
    inherits = new Map<string, string[]>;
    dependencies = new Map<string, string[]>;
    isClass = new Map<string, boolean>;
    types = new Map<string, ComponentTypes>;
    attributes = new Map<string, any[]>;
}

function GetAllAttributesForNode( ic: IntermediateComposition, fullNodePath: string): any[][]
{
    let attributeArray: (any[] | undefined)[] = [];

    let pathParts = fullNodePath.split("/");

    // for a/b/c we want to resolve c b/c a/b/c, last having highest precedence
    for (let i = pathParts.length - 1; i >= 0; i--)
    {
        let prefix = pathParts.slice(i, pathParts.length).join("/");
        let attrs = ic.attributes.get(prefix);
        if (attrs) attributeArray.push(...attrs);
    }
    
    return attributeArray.filter(a => !!a);
}

// once IC contains the data of all layers, we can build the composed object tree. Note that building the whole tree is something we probably dont want to do in real life
function BuildTreeNodeFromIntermediateComposition(node: string, parentPath: string, parentInherits: boolean, ic: IntermediateComposition): ComposedObject
{
    // root node is an exception in some ways, should fix this
    let isPseudoRoot = node === PSEUDO_ROOT;
    // hack because nested defs are not uniquely named they are prefixed with parent, need to remove for display
    let displayName = node.indexOf("/") > 0 ? node.substring(node.indexOf("/") + 1) : node;
    let currentNodePath = isPseudoRoot ? PSEUDO_ROOT : (parentInherits ? parentPath : `${parentPath}/${displayName}`);
    let nodeAttributes = CondenseAttributes(GetAllAttributesForNode(ic, node));
    
    let obj: ComposedObject = {
        name: currentNodePath, 
        attributes: isPseudoRoot ? undefined : nodeAttributes, 
        type: isPseudoRoot ? undefined : ic.types.get(node)
    };

    // TODO: should probably decide whether to always, or never, have children property
    if (ic.children.has(node))
    {
        obj.children = [];
        ic.children.get(node)?.forEach(child => {
            let childObject = BuildTreeNodeFromIntermediateComposition(child, currentNodePath, false, ic);
            obj.children?.push(childObject);
        });
    }

    if (ic.inherits.has(node))
    {
        obj.children = obj.children ? obj.children : [];
        ic.inherits.get(node)?.forEach(child => {
            let childObject = BuildTreeNodeFromIntermediateComposition(child, currentNodePath, true, ic);
            if (childObject.children)
            {
                obj.children?.push(...childObject.children!);
            }
            obj.type = childObject.type;
            obj.attributes = CondenseAttributes([childObject.attributes, obj.attributes]);
        });
    }

    return obj;
}

// here we update our intermediate datastructures with the input of a file
function UpdateIntermediateCompositionWithFile(ic: IntermediateComposition, file: Ifc5FileJson)
{
    let classes = file.filter(element => "def" in element && element.def === "class") as ClassJson[];
    let defs = file.filter(element => "def" in element && element.def === "def") as DefJson[];
    let overs = file.filter(element => "def" in element && element.def === "over") as OverJson[];

    // collect all nested child defs into the main def array, store parent/child links
    CollectDefChildren(classes, defs, ic.children);
    CollectDefChildren(defs, defs, ic.children);

    // collect all names, used to find roots later
    classes.forEach(c => ic.names.add(c.name));
    defs.forEach(d => ic.names.add(d.name));
    
    // classes are special in that they are "merged" with inherited nodes
    classes.forEach(c => ic.isClass.set(c.name, true));

    // collect the type of all objects
    classes.forEach(c => ic.types.set(c.name, c.type));
    defs.forEach(d => ic.types.set(d.name, d.type));

    // collect the attributes of all objects and prefix them
    {
        let plainAttributes = new Map<string, any[]>();
        defs.forEach(d => MMSet(plainAttributes, d.name, d.attributes));
        overs.forEach(o => MMSet(plainAttributes, o.name, o.attributes));

        plainAttributes.forEach((attrs, node) => {
            attrs.filter(a=>a).forEach((attr) => {
                MMSet(ic.attributes, node, prefixAttributesWithComponentName(attr));
            })
        });
    }

    CollectInherits(defs, ic.inherits);
    CollectInherits(classes, ic.inherits);

    return ic;
}

function GetDependency(path: string, exclude: string)
{
    let parts = path.split("/");
    return parts.filter(s => s != exclude)[0];
}

function BuildDependencyGraph(ic: IntermediateComposition)
{
    ic.children.forEach((children, parent) => {
        children.forEach((child) => {
            MMSet(ic.dependencies, parent, child);
        })
    })
    
    ic.inherits.forEach((parents, node) => {
        parents.forEach((parent) => {
            MMSet(ic.dependencies, node, GetDependency(parent, node));
        })
    })
}

// https://en.wikipedia.org/wiki/Topological_sorting
function TopoSortDependencies(ic: IntermediateComposition)
{
    let nodes = [...ic.names];
    let sorted: string[] = [];
    let perm: {} = {};
    let temp: {} = {};

    function visit(node: string)
    {
        // console.log(`visit `, node);
        if (perm[node]) return;
        if (temp[node]) throw new Error(`CYCLE!`);

        temp[node] = true;

        let deps = ic.dependencies.get(node);
        if (deps)
        {
            deps.forEach(dep => visit(dep));
        }

        perm[node] = true;
        sorted.push(node);

        // console.log(`done visiting `, node);
    }

    nodes.forEach((node) => {
        visit(node);
    })    

    return sorted;
}

function BuildTreeNode()
{
    // for node X
    // grab inherits (assume they are complete because of toposort)
    // grab children (and inherited children), prefix with X, eval attrs
    // grab attributes of X
    // store node X (downside: explodes number of nodes, but can forget subnodes if toposort is done well)

    // dynamic nature of the graph means we have to do something recursively
}

export interface Attribute
{
    code: string;
}

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

// this function figures out which nodes are root, connects them to the pseudo root, and kicks of composition for it
function BuildTreeFromIntermediateComposition(ic: IntermediateComposition)
{
    // build parents
    let parents = new Map<string, string[]>();
    ic.children.forEach((children, parent) => {
        children.forEach(child => {
            MMSet(parents, child, parent);
        });
    });

    // find roots
    let roots: string[] = [];
    ic.names.forEach(name => {
        if (!parents.has(name) || parents.get(name)?.length === 0)
        {
            roots.push(name);
        }
    });

    roots = roots.filter(root => !ic.isClass.get(root));

    roots.forEach(root => {
        MMSet(ic.children, PSEUDO_ROOT, root);
    })
    
    ic.names.add(PSEUDO_ROOT);
    BuildDependencyGraph(ic);
    
    let sorted = TopoSortDependencies(ic);
    console.log(sorted);

    return BuildTreeNodeFromIntermediateComposition(PSEUDO_ROOT, PSEUDO_ROOT, false, ic);
}

// this compose works by constructing an intermediate composition of all files and then building a single object tree from it
export function compose2(files: Ifc5FileJson[]): ComposedObject {
    let ic = new IntermediateComposition();
    files.forEach(file => UpdateIntermediateCompositionWithFile(ic, file))
    return BuildTreeFromIntermediateComposition(ic);
}