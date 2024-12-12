// (C) buildingSMART International
// published under MIT license 

let controls, renderer, scene, camera;
let datas = [];
let autoCamera = true;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    camera.up.set(0, 0, 1);
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);

    const nd = document.querySelector('.viewport');
    renderer = new THREE.WebGLRenderer({
        alpha: true
    });

    renderer.setSize(nd.offsetWidth, nd.offsetHeight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    nd.appendChild(renderer.domElement);

    return scene;
}

function createCurveFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['UsdGeom:BasisCurves:points'].flat());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x202020 });
    return new THREE.Line(geometry, material);
}

function getChildByName(root, childName, skip=0) {
    let fragments = childName.replace(/^<\/|^\/|>$/g, '').split('/');
    for (let i = 0; i < skip; ++i) {
        fragments.shift();
    }
    while (fragments.length && root) {
        let f = fragments.shift();
        root = root.children.find(i => i.name.split('/').reverse()[0] === f);
    }
    return root;
}

function createMeshFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['UsdGeom:Mesh:points'].flat());
    let indices = new Uint16Array(node.attributes['UsdGeom:Mesh:faceVertexIndices']);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    // material on parent?
    let reference = parent.attributes['UsdShade:MaterialBindingAPI:material:binding'];
    let material = null;
    if (reference) {
        const materialNode = getChildByName(root, reference.ref);
        let shader = materialNode.children.find(i => i.type === 'UsdShade:Shader');
        let color = shader.attributes['inputs:diffuseColor'];
        material = new THREE.MeshBasicMaterial();
        material.color = new THREE.Color(...color);
        if (shader.attributes['inputs:opacity']) {
            material.transparent = true;
            material.opacity = shader.attributes['inputs:opacity'];
        }
    } else {
        material = new THREE.MeshBasicMaterial();
        material.color = new THREE.Color(0.6, 0.6, 0.6);
    }

    return new THREE.Mesh(geometry, material);
}

function traverseTree(node, parent, root, parentNode) {
    let elem;
    if (node.type === "UsdGeom:Xform") {
        elem = new THREE.Group();
    } else if (node.type === "UsdGeom:Mesh" || node.type === "UsdGeom:BasisCurves") {
        if (node.attributes["UsdGeom:VisibilityAPI:visibility:visibility"] === 'invisible') {
            return;
        }
        if (node.type === "UsdGeom:Mesh") {
            elem = createMeshFromJson(node, parentNode, root);
        } else {
            elem = createCurveFromJson(node, parentNode, root);
        }
    } else if (node !== root) {
        return;
    }

    if (node !== root) {
        parent.add(elem);
        elem.matrixAutoUpdate = false;

        let matrixNode = node.attributes && node.attributes['xformOp:transform'] ? node.attributes['xformOp:transform'].flat() : null;
        if (matrixNode) {
            let matrix = new THREE.Matrix4();
            matrix.set(...matrixNode);
            matrix.transpose();
            elem.matrix = matrix;
        }
    }

    (node.children || []).forEach(child => traverseTree(child, elem || parent, root, node));
}

function* collectNames(node) {
    yield node.name;
    // @todo assert node.name matches path
    for (const child of node.children || []) {
        yield* collectNames(child);
    }
}

function compose(datas) {
    // Composition, the naive way:
    //  - flatten tree to list of <path, object> pairs
    //  - group objects with among layers with the same path
    //  - apply inheritance relationships
    //  - recompose into hierarchical structure

    let compositionEdges = {};

    // Undo the attribute namespace of over prims introduced in 'ECS'.
    function flattenAttributes(prim) {
        if (prim.name !== 'Shader' && prim.attributes) {
            const [k, vs] = Object.entries(prim.attributes)[0];
            const attrs = Object.fromEntries(Object.entries(vs).map(([kk, vv]) => [`${k}:${kk}`, vv]));
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

    function addEdge(a, b) {
        (compositionEdges[a] = compositionEdges[a] || []).push(b);
    }

    // Traverse forest and yield paths as a map of str -> dict
    function collectPaths(nodes) {
        const paths = {};

        function traverse(node, parentPathStr) {
            if (node.name) {
                // Fully qualified means an over on a full path like /Project/Site/Something/Body. These
                // are applied differntly. on non-root nodes we don't assemble immutably bottom up, but rather mutate top down.
                const isFullyQualified = node.name.split('/').length > 2;
                const reverseWhenFullyQualified = isFullyQualified ? (a => a.reverse()) : (a => a);
                
                const pathStr = `${parentPathStr}/${node.name.replace(/^\//, '')}`
                
                let nodeId = pathStr;
                
                // 'complete' refers to the composition lifecycle when all overs are applied and the prim is ready
                // to be inherited from or used as a subprim.
                let nodeIdComplete = `${pathStr} complete`;
                
                const N = flattenAttributes(node);
                N.name = pathStr;
                
                if (node.def === 'over') {
                    nodeId = `${pathStr} over`;
                    addEdge(...reverseWhenFullyQualified([nodeId, pathStr]));
                    addEdge(nodeIdComplete, nodeId);
                }
                
                addEdge(nodeIdComplete, pathStr);

                // Store in map
                (paths[nodeId] = paths[nodeId] || []).push(N);

                // Add inheritance edges
                for (let ih of node.inherits || []) {
                    const target = ih.substring(1, ih.length - 1);
                    addEdge(nodeId, `${target} complete`)
                }

                // Add subprim edges
                (node.children || []).forEach(child => {
                    // We only instantiate def'ed children, not classes
                    if (child.name && child.def === 'def') {
                        const childName = `${pathStr}/${child.name}`;
                        addEdge(...reverseWhenFullyQualified([pathStr, `${childName} complete`]));
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

        // Create the pseudo root and connect to its children
        nodes.forEach((n) => traverse(n, ''));
        nodes.filter(n => n.name && n.def === 'def').forEach(n => {
            addEdge('', `/${n.name} complete`);
        });

        return paths;
    }

    // This is primarily for children, loading the same layer multiple times should not have an effect
    // so the child composition edges should not be duplicated. Applying overs should be idempotent.
    function removeDuplicates(map_of_arrays) {
        return Object.fromEntries(Object.entries(map_of_arrays).map(([k, vs]) => [k, vs.filter((value, index, array) => 
            array.indexOf(value) === index
        )]));
    }

    // Prim storage based on path for the various lauers
    const maps = datas.map(collectPaths);

    let compositionEdgesOrig = removeDuplicates(compositionEdges);
    
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
    compositionEdges = Object.fromEntries(
        Object.entries(compositionEdgesOrig).map(([item, dep]) => [
            item,
            new Set([...dep].filter((e) => e !== item)),
        ])
    );

    // Find all items that don't depend on anything.
    const extraItemsInDeps = new Set(
        [...Object.values(compositionEdges).map(st => Array.from(st)).flat()].filter((value) => !compositionEdges.hasOwnProperty(value))
    );

    // Add empty dependencies where needed.
    extraItemsInDeps.forEach((item) => {
        if (maps.map(m => m[item]).some(i => i)) {
            // only add defined things, not overs on concatenated paths that don't exist yet which need to be the result of actual composition steps
            compositionEdges[item] = new Set();
        }
    });

    const composed = {};
    const built = new Set();

    Object.keys(compositionEdges).forEach(p => {
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
        const bottomRankNodes = Object.entries(compositionEdges).filter(([_, dep]) => dep.size === 0 && (composed[_] || built.has(_) || _.endsWith(' complete'))).map(([k, v]) => k);
        console.log('Bottom rank prims to resolve:', ...bottomRankNodes);

        if (bottomRankNodes.length === 0) {
            break;
        }

        const definedPrims = new Set();

        // Apply edges in dependency order
        bottomRankNodes.forEach(k => {
            (Array.from(compositionEdgesOrig[k] || [])).forEach(v => {
                // We don't have typed edges because of the somewhat primitive type system in JS.
                // (An array does not really function as a tuple). So we need to reverse engineer
                // the type of the edge (and therefore what composition action to apply) based on
                // the names of the vertices.
                console.log('Processing edge:', k, ' --- ', v);
                if (k.endsWith(' complete') && v.endsWith(' over')) {
                    // Only for life cycle dependency management, no action associated
                } else if (v.startsWith(k + '/')) {
                    // If k is a subpath of v it's a subPrim relationship
                    if (k.split('/').length > 2) {
                        // this should not occur
                    } else {
                        v = v.replace(/ complete$/, '');

                        composed[k].children = composed[k].children || [];
                        composed[k].children.push(composed[v]);
                        Array.from(collectNames(composed[k])).forEach(a => definedPrims.add(a.substring(k.length)));
                    }
                } else if (k.startsWith(v + '/')) {
                    // reversed child definition for top-down over application
                    if (k.endsWith(' complete')) {
                        // @todo immutability
                        let child = getChildByName(composed[`/${v.split('/')[1]}`], v, /*skip=*/ 1);
                        if (child) {
                            k = k.replace(/ complete$/, '');
                            child.children.push(composed[k]);
                        } else {
                            console.error(v, '-->', k, 'not applied');
                        }
                        Array.from(collectNames(child)).forEach(a => definedPrims.add(a.substring(child.name.length)));
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
                        Array.from(collectNames(composed[k])).forEach(a => definedPrims.add(a.substring(k.length)));
                    }
                }
            });
        });

        console.log('Constructed prims:', ...definedPrims);

        Array.from(definedPrims).forEach(a => built.add(a));

        let orderedSet = new Set(bottomRankNodes);
        compositionEdges = Object.fromEntries(
            Object.entries(compositionEdges)
            .filter(([item]) => !orderedSet.has(item))
            .map(([item, dep]) => [item, new Set([...dep].filter((d) => (!orderedSet.has(d) && !definedPrims.has(d))))])
        );
    }

    if (Object.keys(compositionEdges).length !== 0) {
        console.error("Unresolved nodes:", ...Object.keys(compositionEdges));
    }

    console.log(composed['']);
    return composed[''];
}

function encodeHtmlEntities(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const icons = {
    'UsdGeom:Mesh:points': 'deployed_code', 
    'UsdGeom:BasisCurves:points': 'line_curve',
    'UsdShade:Material:outputs:surface.connect': 'line_style'
};

function buildDomTree(prim, node) {
    const elem = document.createElement('div');
    let span;
    elem.appendChild(document.createTextNode(prim.name ? prim.name.split('/').reverse()[0] : 'root'));
    elem.appendChild(span = document.createElement('span'));
    Object.entries(icons).forEach(([k, v]) => span.innerText += (prim.attributes || {})[k] ? v : ' ');
    span.className = "material-symbols-outlined";
    elem.onclick = (evt) => {
        let rows = [['name', prim.name]].concat(Object.entries(prim.attributes)).map(([k, v]) => `<tr><td>${encodeHtmlEntities(k)}</td><td>${encodeHtmlEntities(typeof v === 'object' ? JSON.stringify(v) : v)}</td>`).join('');
        document.querySelector('.attributes .table').innerHTML = `<table border="0">${rows}</table>`;
        evt.stopPropagation();
    };
    node.appendChild(elem);
    (prim.children || []).forEach(p => buildDomTree(p, elem));
}

export function composeAndRender() {
    if (scene) {
        // @todo does this actually free up resources?
        scene.children = [];
    }

    document.querySelector('.tree').innerHTML = '';

    if (datas.length === 0) {
        return;
    }

    const tree = compose(datas.map(arr => arr[1]));
    if (!tree) {
        console.error("No result from composition");
        return;
    }

    traverseTree(tree, scene || init(), tree);

    if (autoCamera) {
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(scene);
        if (!boundingBox.isEmpty()) {
            let avg = boundingBox.min.clone().add(boundingBox.max).multiplyScalar(0.5);
            let ext = boundingBox.max.clone().sub(boundingBox.min).length();
            camera.position.copy(avg.clone().add(new THREE.Vector3(1,1,1).normalize().multiplyScalar(ext)));
            camera.far = ext * 3;
            camera.updateProjectionMatrix();
            controls.target.copy(avg);
            controls.update();
            
            // only on first successful load
            autoCamera = false;
        }
    }


    buildDomTree(tree, document.querySelector('.tree'));
    animate();
}

function createLayerDom() {
    document.querySelector('.layers div').innerHTML = '';
    datas.forEach(([name, _], index) => {
        const elem = document.createElement('div');
        elem.appendChild(document.createTextNode(name));
        ['\u25B3', '\u25BD', '\u00D7'].reverse().forEach((lbl, cmd) => {
            const btn = document.createElement('span');
            btn.onclick = (evt) => {
                evt.stopPropagation();
                if (cmd === 2) {
                    if (index > 0) {
                        [datas[index], datas[index - 1]] = [datas[index - 1], datas[index]];
                    }
                } else if (cmd === 1) {
                    if (index < datas.length - 1) {
                        [datas[index], datas[index + 1]] = [datas[index + 1], datas[index]];
                    }
                } else if (cmd === 0) {
                    datas.splice(index, 1);
                }
                composeAndRender();
                createLayerDom();
            }
            btn.appendChild(document.createTextNode(lbl));
            elem.appendChild(btn);
        });
        document.querySelector('.layers div').appendChild(elem);
    });
}

export default function addModel(name, m) {
    datas.push([name, m]);
    createLayerDom();
    composeAndRender();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
