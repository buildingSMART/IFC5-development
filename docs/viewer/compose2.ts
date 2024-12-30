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
            addedDefs.push(def);
            MMSet(children, parent.name, def.name);
        })
    })
    console.log(addedDefs);
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

function CondenseAttributes(attrs: any[] | undefined)
{
    if (!attrs) return undefined;

    let condensed = {};
    attrs.filter(a => a).forEach(attributes => {
        condensed = {...condensed, ...attributes}
    });

    return condensed;
}

// TODO: fix signature
function BuildTree(node: string, parentPath: string, children: Map<string, string[]>, isClass: Map<string, boolean>, types: Map<string, ComponentTypes>, attributes: Map<string, any[]>): ComposedObject
{
    // root node is an exception in that its "" not "/"
    let isPseudoRoot = node === PSEUDO_ROOT;
    let currentNodePath = isPseudoRoot ? PSEUDO_ROOT : `${parentPath}/${node}`;
    let nodeAttributes = CondenseAttributes(attributes.get(node));
    let obj: ComposedObject = {
        name: currentNodePath, 
        attributes: isPseudoRoot ? undefined : nodeAttributes, 
        type: isPseudoRoot ? undefined : types.get(node)
    };

    if (children.has(node))
    {
        obj.children = [];
        children.get(node)?.forEach(child => {
            let childNodePath = isClass.has(node) ? parentPath : currentNodePath;
            let childObject = BuildTree(child, childNodePath, children, isClass, types, attributes);
            if (isClass.has(child))
            {
                if (childObject.children)
                {
                    obj.children?.push(...childObject.children!);
                }
                obj.type = childObject.type;
                obj.attributes = CondenseAttributes([obj.attributes, childObject.attributes]);
            }
            else
            {
                obj.children?.push(childObject);
            }
        });
    }

    return obj;
}

function compose(file: Ifc5FileJson): ComposedObject
{
    let classes = file.filter(element => "def" in element && element.def === "class") as ClassJson[];
    let defs = file.filter(element => "def" in element && element.def === "def") as DefJson[];
    let overs = file.filter(element => "def" in element && element.def === "over") as OverJson[];

    let children = new Map<string, string[]>();

    // collect all nested child defs into the main def array, store parent/child links
    CollectDefChildren(classes, defs, children);
    CollectDefChildren(defs, defs, children);

    let names = new Set<string>();

    classes.forEach(c => names.add(c.name));
    defs.forEach(d => names.add(d.name));
    
    let isClass = new Map<string, boolean>();
    classes.forEach(c => isClass.set(c.name, true));

    let types = new Map<string, ComponentTypes>();
    classes.forEach(c => types.set(c.name, c.type));
    defs.forEach(d => types.set(d.name, d.type));

    let attributes = new Map<string, any[]>();
    overs.forEach(c => MMSet(attributes, c.name, c.attributes));
    defs.forEach(d => MMSet(attributes, d.name, d.attributes));

    let prefixedAttrs = new Map<string, any[]>();
    attributes.forEach((attrs, node) => {
        attrs.filter(a=>a).forEach((attr) => {
            MMSet(prefixedAttrs, node, prefixAttributesWithComponentName(attr));
        })
    });

    // add all inherits as parent child
    {
        defs.forEach(def => {
            if (def.inherits)
            {
                def.inherits.forEach(parent => {
                    // inherits seems to work in reverse
                    MMSet(children, def.name, CleanInherit(parent));
                })
            }
        })
        classes.forEach(clss => {
            if (clss.inherits)
            {
                clss.inherits.forEach(parent => {
                    // inherits seems to work in reverse
                    MMSet(children, clss.name, CleanInherit(parent));
                })
            }
        })
    }

    let parents = new Map<string, string[]>();
    children.forEach((children, parent) => {
        children.forEach(child => {
            MMSet(parents, child, parent);
        });
    })

    // find roots
    let roots: string[] = [];
    names.forEach(name => {
        if (!parents.has(name) || parents.get(name)?.length === 0)
        {
            roots.push(name);
        }
    });

    roots.forEach(root => {
        MMSet(children, PSEUDO_ROOT, root);
    })

    let tree = BuildTree(PSEUDO_ROOT, PSEUDO_ROOT, children, isClass, types, prefixedAttrs);

    let oversForID = BuildOversForId(overs);

    console.log("classes", children);
    console.log("roots", roots);

    return tree;
}

export function compose2(files: Ifc5FileJson[]): ComposedObject {
    return compose(files[0]);
}