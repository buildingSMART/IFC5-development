import { ClassJson, DefJson, DisclaimerJson, Ifc5FileJson, OverJson } from "../../schema/out/@typespec/json-schema/ts/ifc5file";

export type ComposedObject = {
    name: string, attributes?: any, 
    type?: "UsdGeom:Mesh" | "UsdGeom:Xform" | "UsdGeom:BasisCurves" | "UsdShade:Material" | "UsdShade:Shader" | "Xform";
    children?: ComposedObject[]
};

function* collectNames(node: ComposedObject): IterableIterator<string> {
    yield node.name;
    // @todo assert node.name matches path
    for (const child of node.children || []) {
        yield* collectNames(child);
    }
}

export function getChildByName(root: ComposedObject, childName, skip=0) {
    let fragments = childName.replace(/^<\/|^\/|>$/g, '').split('/');
    for (let i = 0; i < skip; ++i) {
        fragments.shift();
    }
    let start: ComposedObject | undefined = root;
    while (fragments.length && start && start.children) {
        console.log(start, fragments[0]);
        let f = fragments.shift();
        start = start.children!.find(i => i.name.split('/').reverse()[0] === f);
    }
    if (fragments.length == 0) {
        return start;
    }
}

export function compose(datas: Ifc5FileJson[]) {
    // Composition, the naive way:
    //  - flatten tree to list of <path, object> pairs
    //  - group objects with among layers with the same path
    //  - apply inheritance relationships
    //  - recompose into hierarchical structure

    type EdgeMap = Record<string, string[]>;
    let compositionEdges: EdgeMap = {};

    interface Prim
    {
        def: string;
        name: string;
        type?: "UsdGeom:Mesh" | "UsdGeom:Xform" | "UsdGeom:BasisCurves" | "UsdShade:Material" | "UsdShade:Shader" | "Xform";
        attributes?: any;
    }

    // Undo the attribute namespace of over prims introduced in 'ECS'.
    function prefixAttributesWithComponentName(prim: (ClassJson | DefJson | OverJson)): Prim {
        if (prim.name !== 'Shader' && "attributes" in prim) {
            const [componentName, componentNamedValues] = Object.entries(prim.attributes)[0];
            //@ts-ignore
            const attrs = Object.fromEntries(Object.entries(componentNamedValues).map(([valueName, value]) => [`${componentName}::${valueName}`, value]));
            return {
                ...prim,
                attributes: attrs
            };
        } else {
            return {
                ...prim
            };
        }
    }

    function addEdge(a: string, b: string) {
        (compositionEdges[a] = compositionEdges[a] || []).push(b);
    }

    // Traverse forest and yield paths as a map of str -> dict
    function collectPaths(nodes: Ifc5FileJson) {
        type pathstype = Record<string, Prim[]>;
        const paths: pathstype = {};

        function traverse(node: (ClassJson | DefJson | OverJson | DisclaimerJson), parentPathStr: string) {
            if ('name' in node) {
                // Fully qualified means an over on a full path like /Project/Site/Something/Body. These
                // are applied differntly. on non-root nodes we don't assemble immutably bottom up, but rather mutate top down.
                const isFullyQualified = node.name.split('/').length > 2;
                const reverseWhenFullyQualified = isFullyQualified ? ((a: string[]) => a.reverse()) : ((a:string[]) => a);
                
                const pathStr = `${parentPathStr}/${node.name.replace(/^\//, '')}`
                
                let nodeId = pathStr;
                
                // 'complete' refers to the composition lifecycle when all overs are applied and the prim is ready
                // to be inherited from or used as a subprim.
                let nodeIdComplete = `${pathStr} complete`;
                
                const N = prefixAttributesWithComponentName(node);
                N.name = pathStr;
                
                if (node.def === 'over') {
                    nodeId = `${pathStr} over`;
                    let e = reverseWhenFullyQualified([nodeId, pathStr]);
                    addEdge(e[0], e[1]);
                    addEdge(nodeIdComplete, nodeId);
                }
                
                addEdge(nodeIdComplete, pathStr);

                // Store in map
                (paths[nodeId] = paths[nodeId] || []).push(N);

                // Add inheritance edges
                if ('inherits' in node)
                {
                    for (let ih of node.inherits || []) {
                        const target = ih.substring(1, ih.length - 1);
                        addEdge(nodeId, `${target} complete`)
                    }
                }

                // Add subprim edges
                if ('children' in node)
                {
                    (node.children || []).forEach(child => {
                        // We only instantiate def'ed children, not classes
                        if (child.name && child.def === 'def') {
                            const childName = `${pathStr}/${child.name}`;
                            let e = reverseWhenFullyQualified([pathStr, `${childName} complete`]);
                            addEdge(e[0], e[1]);
                            if (nodeId.endsWith('over')) {
                                // when we have an over on a deeper namespace we need to make sure the root is already built
                                if (pathStr.split('/').length > 2) {
                                    addEdge(childName, `/${pathStr.split('/')[1]}`);
                                }
                            }
                        }
                        traverse(child, pathStr);
                    });
                }
            }
        }

        // Create the pseudo root and connect to its children
        nodes.forEach((n) => traverse(n, ''));
        nodes.filter(n => 'name' in n && n.def === 'def').forEach(n => {
            addEdge('', `/${n.name} complete`);
        });

        return paths;
    }

    // This is primarily for children, loading the same layer multiple times should not have an effect
    // so the child composition edges should not be duplicated. Applying overs should be idempotent.
    function removeDuplicates(map_of_arrays: EdgeMap) {
        return Object.fromEntries(Object.entries(map_of_arrays).map(([k, vs]) => [k, vs.filter((value, index, array) => 
            array.indexOf(value) === index
        )]));
    }

    // Prim storage based on path for the various lauers
    const maps = datas.map(collectPaths);
    // maps is correct

    // composition edges not correct, so rem dup also not correct
    let compositionEdgesOrig: EdgeMap = removeDuplicates(compositionEdges);
    
    // Reduction function to override prim attributes
    // Assumes 'unpacked' attribute namespaces
    function composePrim(right, left) {
        return {
            def: left.def || (right !== null ? right.def : null),
            type: left.type || (right !== null ? right.type : null),
            name: right ? right.name : left.name,
            attributes: {
                ...((right !== null) ? right.attributes : {}),
                ...((left !== null) ? left.attributes : {})
            },
            children: (left.children || []).concat(right ? (right.children || []) : [])
        }
    }

    // Copy the input to avoid modifying it.
    // Discard self-dependencies and copy two levels deep.
    type UniqueEdgeMap = Record<string, Set<string>>;
    let compositionEdgesUnique: UniqueEdgeMap = Object.fromEntries(
        Object.entries(compositionEdgesOrig).map(([item, dep]) => [
            item,
            new Set([...dep].filter((e) => e !== item)),
        ])
    );

    // Find all items that don't depend on anything.
    const extraItemsInDeps = new Set(
        [...Object.values(compositionEdgesUnique).map(st => Array.from(st)).flat()].filter((value) => !compositionEdgesUnique.hasOwnProperty(value))
    );

    // Add empty dependencies where needed.
    extraItemsInDeps.forEach((item) => {
        if (maps.map(m => m[item]).some(i => i)) {
            // only add defined things, not overs on concatenated paths that don't exist yet which need to be the result of actual composition steps
            compositionEdgesUnique[item] = new Set();
        }
    });

    const composed: Record<string, ComposedObject> = {};
    const built = new Set();

    Object.keys(compositionEdgesUnique).forEach(p => {
        const opinions = maps.map(m => m[p]).filter(a => a).flat(1);
        if (p == '') {
            composed[p] = {name: p};
        } else if (opinions.length === 0) {
            return;
        } else if (opinions.length == 1) {
            composed[p] = composePrim(null, opinions[0]);
        } else {
            composed[p] = opinions.reverse().reduce(composePrim);
        }

        delete composed[p].children;
    });

    const updateName = (oldPrefix, newPrefix, prim) => {
        return {
            ...prim,
            name: prim.name.replace(new RegExp(`^${oldPrefix}(?=/)`), newPrefix),
            children: prim.children.map(c => updateName(oldPrefix, newPrefix, c))
        }
    };

    // Essentially we do an 'interactive' topological sort. Where we process the composition edges for
    // those prims that do not have any dependencies left. However, as a consequence of composition,
    // novel prim paths can also be formed which can resolve the dependencies for other prims.
    let maxIterations = 100;
    while (maxIterations --) {
        const bottomRankNodes = Object.entries(compositionEdgesUnique).filter(([_, dep]) => dep.size === 0 && (composed[_] || built.has(_) || _.endsWith(' complete'))).map(([k, v]) => k);
        // console.log('Bottom rank prims to resolve:', ...bottomRankNodes);

        if (bottomRankNodes.length === 0) {
            break;
        }

        const definedPrims = new Set<string>();

        // Apply edges in dependency order
        bottomRankNodes.forEach(k => {
            (Array.from(compositionEdgesOrig[k] || [])).forEach(v => {
                // We don't have typed edges because of the somewhat primitive type system in JS.
                // (An array does not really function as a tuple). So we need to reverse engineer
                // the type of the edge (and therefore what composition action to apply) based on
                // the names of the vertices.
                // console.log('Processing edge:', k, ' --- ', v);
                if (k.endsWith(' complete') && v.endsWith(' over')) {
                    // Only for life cycle dependency management, no action associated
                } else if (v.startsWith(k + '/')) {
                    // If k is a subpath of v it's a subPrim relationship
                    if (k.split('/').length > 2) {
                        // this should not occur
                    } else {
                        v = v.replace(/ complete$/, '');

                        composed[k].children = composed[k].children || [];
                        composed[k].children?.push(composed[v]);
                        Array.from(collectNames(composed[k])).forEach(a => definedPrims.add(a));
                    }
                } else if (k.startsWith(v + '/')) {
                    // reversed child definition for top-down over application
                    if (k.endsWith(' complete')) {
                        // @todo immutability
                        let child = getChildByName(composed[`/${v.split('/')[1]}`], v, /*skip=*/ 1);
                        if (child) {
                            k = k.replace(/ complete$/, '');
                            child.children!.push(composed[k]);
                        } else {
                            console.error(v, '-->', k, 'not applied');
                        }
                        Array.from(collectNames(child!)).forEach(a => definedPrims.add(a));
                    }
                } else if (k.search(/over$/) !== -1) {
                    if (k.split('/').length > 2) {
                        // @todo immutability
                        let child = getChildByName(composed[`/${v.split('/')[1]}`], k.split(' ')[0], /*skip=*/ 1);
                        if (child) {
                            Object.assign(child.attributes, composed[k].attributes);
                        } else {
                            console.error(k, '-->', v, 'not applied');
                        }
                    } else {
                        composed[v] = composePrim(composed[v], composed[k]);
                    }
                } else if (v.search(/over$/) !== -1) {
                    // reversed top-down over
                    if (v.split('/').length > 2) {
                        // @todo immutability
                        let child = getChildByName(composed[`/${k.split('/')[1]}`], v.split(' ')[0], /*skip=*/ 1);
                        if (child) {
                            Object.assign(child.attributes, composed[v].attributes);
                        } else {
                            console.error(v, '-->', k, 'not registered');
                        }
                    } else {
                        composed[k] = composePrim(composed[k], composed[v]);
                    }
                } else {
                    // Else it's an inheritance relationship
                    if (v.endsWith('complete')) {
                        // only when ends with complete, otherwise it could be the dependency edge between a concatenated-prim over and its root.
                        v = v.replace(/ complete$/, '');
                        composed[k] = updateName(composed[v].name, composed[k].name, composePrim(composed[k], composed[v]));
                        Array.from(collectNames(composed[k])).forEach(a => definedPrims.add(a));
                    }
                }
            });
        });

        // console.log('Constructed prims:', ...definedPrims);

        Array.from(definedPrims).forEach(a => built.add(a));

        let orderedSet = new Set(bottomRankNodes);
        compositionEdgesUnique = Object.fromEntries(
            Object.entries(compositionEdgesUnique)
            .filter(([item]) => !orderedSet.has(item))
            .map(([item, dep]) => [item, new Set([...dep].filter((d) => (!orderedSet.has(d) && !definedPrims.has(d))))])
        );
    }

    if (Object.keys(compositionEdgesUnique).length !== 0) {
        console.error("Unresolved nodes:", ...Object.keys(compositionEdgesUnique));
    }

    // console.log(composed['']);
    return composed[''];
}
