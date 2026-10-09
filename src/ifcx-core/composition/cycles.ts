import { MMSet } from "../util/mm";
import { PreCompositionNode } from "./node";
import { GetHead } from "./path";

export class CycleError extends Error
{
    
}

// https://en.wikipedia.org/wiki/Topological_sorting
export function FindRootsOrCycles(nodes: Map<string, PreCompositionNode>)
{
    // Composition resolves a reference `head/a/b` by composing `head`, and a
    // node at `head/a` is applied while composing `head`. Cycles therefore
    // run between heads, so dependencies are tracked head to head.
    let dependencies = new Map<string, string[]>();
    let dependents = new Map<string, string[]>();
    nodes.forEach((node, path) => {
        Object.keys(node.inherits).forEach((inheritName) => {
            let ref = node.inherits[inheritName];
            if (ref === null) return;
            MMSet(dependencies, GetHead(path), GetHead(ref));
            MMSet(dependents, ref, path);
        })
        Object.keys(node.children).forEach((childName) => {
            let ref = node.children[childName];
            if (ref === null) return;
            MMSet(dependencies, GetHead(path), GetHead(ref));
            MMSet(dependents, ref, path);
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
            visit(GetHead(path));
        })    
    } catch (e)
    {
        // cycle found, return
        return null;
    }

    return roots;
}
