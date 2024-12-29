import { ClassJson, DefJson, Ifc5FileJson, OverJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";
import { ComposedObject } from "./compose";

const ID_DELIM = "/";
const PSEUDO_ROOT = "";

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

function BuildTree(node: string, children: Map<string, string[]>, isClass: Map<string, boolean>): ComposedObject
{
    let obj: ComposedObject = {
        name: node, 
        attributes: {}, 
        type: "UsdGeom:Mesh"
    };

    if (children.has(node))
    {
        obj.children = [];
        children.get(node)?.forEach(child => {
            let childObject = BuildTree(child, children, isClass);
            if (isClass.has(child))
            {
                if (childObject.children)
                {
                    obj.children?.push(...childObject.children!);
                }
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

    let tree = BuildTree(PSEUDO_ROOT, children, isClass);

    let oversForID = BuildOversForId(overs);

    console.log("classes", children);
    console.log("roots", roots);

    return tree;
}

export function compose2(files: Ifc5FileJson[]): ComposedObject {
    return compose(files[0]);
}