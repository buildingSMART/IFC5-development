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
            //hack defs are not uniquely named, so we prefix them with parent and copy
            let newDefName = `${parent.name}__${def.name}`;
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

function CollectInheritsAsChildren(input: {name: string, inherits?: string[]}[], children: Map<string, string[]>)
{
    input.forEach(input => {
        if (input.inherits)
        {
            input.inherits.forEach(parent => {
                // inherits seems to work in reverse
                MMSet(children, input.name, CleanInherit(parent));
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
    isClass = new Map<string, boolean>;
    types = new Map<string, ComponentTypes>;
    attributes = new Map<string, any[]>;
}

// once IC contains the data of all layers, we can build the composed object tree. Note that building the whole tree is something we probably dont want to do in real life
function BuildTreeNodeFromIntermediateComposition(node: string, parentPath: string, ic: IntermediateComposition): ComposedObject
{
    // root node is an exception in some ways, should fix this
    let isPseudoRoot = node === PSEUDO_ROOT;
    //hack because nested defs are not uniquely named they are prefixed with parent, need to remove for display
    let displayName = node.indexOf("__") > 0 ? node.substring(node.indexOf("__") + 2) : node;
    let currentNodePath = isPseudoRoot ? PSEUDO_ROOT : `${parentPath}/${displayName}`;
    let nodeAttributes = CondenseAttributes(ic.attributes.get(node));
    
    let obj: ComposedObject = {
        name: currentNodePath, 
        attributes: isPseudoRoot ? undefined : nodeAttributes, 
        type: isPseudoRoot ? undefined : ic.types.get(node)
    };

    if (ic.children.has(node))
    {
        obj.children = [];
        ic.children.get(node)?.forEach(child => {
            let childNodePath = ic.isClass.has(node) ? parentPath : currentNodePath;
            let childObject = BuildTreeNodeFromIntermediateComposition(child, childNodePath, ic);
            {
                // if a child is a class, we "merge" it with the current node
                if (childObject.children)
                {
                    obj.children?.push(...childObject.children!);
                }
                obj.type = childObject.type;
                obj.attributes = CondenseAttributes([childObject.attributes, obj.attributes]);
            }
            else
            {
                // child is a regular child, not a class
                obj.children?.push(childObject);
            }
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

    // add all inherits as parent child
    CollectInheritsAsChildren(defs, ic.children);
    CollectInheritsAsChildren(classes, ic.children);

    return ic;
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

    roots.forEach(root => {
        MMSet(ic.children, PSEUDO_ROOT, root);
    })

    return BuildTreeNodeFromIntermediateComposition(PSEUDO_ROOT, PSEUDO_ROOT, ic);
}

// this compose works by constructing an intermediate composition of all files and then building a single object tree from it
export function compose2(files: Ifc5FileJson[]): ComposedObject {
    let ic = new IntermediateComposition();
    files.forEach(file => UpdateIntermediateCompositionWithFile(ic, file))
    return BuildTreeFromIntermediateComposition(ic);
}