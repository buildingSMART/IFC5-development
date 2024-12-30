import { ClassJson, DefJson, Ifc5FileJson, OverJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { ComposedObject } from "./compose";

const ID_DELIM = "/";
const PSEUDO_ROOT = "";

type ComponentTypes = "UsdGeom:Mesh" | "UsdGeom:Xform" | "UsdGeom:BasisCurves" | "UsdShade:Material" | "UsdShade:Shader" | "Xform" | undefined;

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

// wtb multimap
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

function BuildOversForId(overs: OverJson[])
{
    let oversForID = new Map<string, OverJson[]>();

    overs.forEach(over => {
        MMSet(oversForID, over.name, over);
    })

    return oversForID;
}

function CollectDefChildren(objects: {name: string, children?: DefJson[]}[], output: DefJson[], children: Map<string, string[]>)
{
    let addedDefs: DefJson[] = []; // two phase because defs are nested
    objects.filter(o => "children" in o).forEach((parent) => {
        parent.children!.forEach(def => {
            //hack defs are not uniquely named, so we prefix them with parent
            def.name = `${parent.name}__${def.name}`;
            addedDefs.push(def);
            MMSet(children, parent.name, def.name);
        })
    })

    output.push(...addedDefs);
}

function CleanInherit(inheritString: string)
{
    // inherits looks like this: </Ne0834921e09540f088743c6bd1ec699e>
    return inheritString.substring(2, inheritString.length - 1);
}

// Undo the attribute namespace of over prims introduced in 'ECS'.
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

// later indices in the array should "win"
function CondenseAttributes(attrs: any[] | undefined)
{
    if (!attrs) return undefined;

    let condensed = {};
    attrs.filter(a => a).forEach(attributes => {
        condensed = {...condensed, ...attributes}
    });

    return condensed;
}

class IntermediateComposition
{
    names = new Set<string>();
    children = new Map<string, string[]>;
    isClass = new Map<string, boolean>;
    types = new Map<string, ComponentTypes>;
    attributes = new Map<string, any[]>;
}

function BuildTree(node: string, parentPath: string, ic: IntermediateComposition): ComposedObject
{
    // root node is an exception in that its "" not "/"
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
            let childObject = BuildTree(child, childNodePath, ic);
            if (ic.isClass.has(child))
            {
                if (childObject.children)
                {
                    obj.children?.push(...childObject.children!);
                }
                obj.type = childObject.type;
                obj.attributes = CondenseAttributes([childObject.attributes, obj.attributes]);
            }
            else
            {
                obj.children?.push(childObject);
            }
        });
    }

    return obj;
}

function UpdateIntermediateCompositionWithFile(ic: IntermediateComposition, file: Ifc5FileJson)
{
    let classes = file.filter(element => "def" in element && element.def === "class") as ClassJson[];
    let defs = file.filter(element => "def" in element && element.def === "def") as DefJson[];
    let overs = file.filter(element => "def" in element && element.def === "over") as OverJson[];

    // collect all nested child defs into the main def array, store parent/child links
    CollectDefChildren(classes, defs, ic.children);
    CollectDefChildren(defs, defs, ic.children);

    classes.forEach(c => ic.names.add(c.name));
    defs.forEach(d => ic.names.add(d.name));
    
    classes.forEach(c => ic.isClass.set(c.name, true));

    classes.forEach(c => ic.types.set(c.name, c.type));
    defs.forEach(d => ic.types.set(d.name, d.type));

    let plainAttributes = new Map<string, any[]>();
    defs.forEach(d => MMSet(plainAttributes, d.name, d.attributes));
    overs.forEach(o => MMSet(plainAttributes, o.name, o.attributes));

    plainAttributes.forEach((attrs, node) => {
        attrs.filter(a=>a).forEach((attr) => {
            MMSet(ic.attributes, node, prefixAttributesWithComponentName(attr));
        })
    });

    // add all inherits as parent child
    {
        defs.forEach(def => {
            if (def.inherits)
            {
                def.inherits.forEach(parent => {
                    // inherits seems to work in reverse
                    MMSet(ic.children, def.name, CleanInherit(parent));
                })
            }
        })
        classes.forEach(clss => {
            if (clss.inherits)
            {
                clss.inherits.forEach(parent => {
                    // inherits seems to work in reverse
                    MMSet(ic.children, clss.name, CleanInherit(parent));
                })
            }
        })
    }

    return ic;
}

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

    return BuildTree(PSEUDO_ROOT, PSEUDO_ROOT, ic);
}

export function compose2(files: Ifc5FileJson[]): ComposedObject {
    let ic = new IntermediateComposition();
    files.forEach(file => UpdateIntermediateCompositionWithFile(ic, file))
    return BuildTreeFromIntermediateComposition(ic);
}