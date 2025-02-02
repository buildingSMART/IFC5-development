// (C) buildingSMART International
// published under MIT license 

import toposort from "./toposort.mjs";

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

function createMaterialFromParent(parent, root) {
    let reference = parent.attributes['UsdShade:MaterialBindingAPI:material:binding'];
    let material = {
        color: new THREE.Color(0.6, 0.6, 0.6)
    };
    if (reference) {
        const materialNode = getChildByName(root, reference.ref);
        let shader = materialNode.children.find(i => i.type === 'UsdShade:Shader');
        let color = shader.attributes['inputs:diffuseColor'];
        material.color = new THREE.Color(...color);
        if (shader.attributes['inputs:opacity']) {
            material.transparent = true;
            material.opacity = shader.attributes['inputs:opacity'];
        }
    }
    return material;
}

function createCurveFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['UsdGeom:BasisCurves:points'].flat());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const material = createMaterialFromParent(parent, root);
    let lineMaterial = new THREE.LineBasicMaterial({...material});
    // Make lines a little darker, otherwise they have the same color as meshes
    lineMaterial.color.multiplyScalar(0.8)
    return new THREE.Line(geometry, lineMaterial);
}


function createMeshFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['UsdGeom:Mesh:points'].flat());
    let indices = new Uint16Array(node.attributes['UsdGeom:Mesh:faceVertexIndices']);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = createMaterialFromParent(parent, root);
    let meshMaterial = new THREE.MeshBasicMaterial({...material});

    return new THREE.Mesh(geometry, meshMaterial);
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


function compose(datas) {
    // Composition, the naive way:
    //  - flatten forest to mapping of <path, object> pairs
    //  - group and compose objects among layers with the same path
    //  - apply inheritance relationships in topological order from bottom rank to top
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
                const nodeId = `${parentPathStr}/${node.name.replace(/^\//, '')}`                
                const N = flattenAttributes(node);
                // Store in map
                (paths[nodeId] = paths[nodeId] || []).push(N);

                // Add inheritance edges
                for (let ih of node.inherits || []) {
                    const target = ih.substring(1, ih.length - 1);
                    addEdge(nodeId, `${target}`)
                }

                // Add subprim edges
                (node.children || []).forEach(child => {
                    // We only instantiate def'ed children, not classes
                    if (child.name && child.def === 'def') {
                        const childName = `${nodeId}/${child.name}`;
                        addEdge(nodeId, childName)
                    }
                    traverse(child, nodeId);
                });
            }
        }

        // Create the pseudo root and connect to its children
        nodes.forEach((n) => traverse(n, ''));
        nodes.filter(n => n.name && n.def === 'def').forEach(n => {
            addEdge('', `/${n.name}`);
        });

        return paths;
    }

    // Prim storage based on path for the various layers
    const maps = datas.map(collectPaths);

    function maxSpecifier(...args) {
        const specs = ["over", "class", "def"];
        return specs[Math.max(...args.map(s => specs.indexOf(s)))];
    }
    
    // Reduction function to override prim attributes
    // Assumes 'unpacked' attribute namespaces
    //
    // Children relationship is based on key prefixes in the map,
    // not yet part of the current prim object structure.
    function composePrim(weaker, stronger) {
        return {
            def: maxSpecifier(stronger && stronger.def, weaker && weaker.def),
            type: stronger && stronger.type || (weaker !== null ? weaker.type : null),
            attributes: {
                ...((weaker !== null) ? weaker.attributes : {}),
                ...((stronger !== null) ? stronger.attributes : {})
            },
        }
    }

    const composed = Object.fromEntries(Array.from(new Set(maps.map(m => Object.keys(m)).flat())).map(k => {
        let v;
        const opinions = maps.map(m => m[k]).filter(a => a).flat(1);
        if (opinions.length == 1) {
            v = composePrim(null, opinions[0]);
        } else {
            v = opinions.reverse().reduce(composePrim);
        }
        return [k, v];
    }));

    const publishAsNewPrefix = (oldPrefix, newPrefix) => {
        let rp = new RegExp(`^${oldPrefix}(?=/)`);
        for (let [k, v] of Array.from(Object.entries(composed))) {
            if (k.match(rp) !== null) {
                let k2 = k.replace(rp, newPrefix);
                composed[k2] = composePrim(v, composed[k2] || null);
            }
        }
    };

    // Apply edges in dependency order
    const sorted = toposort(compositionEdges);
    sorted.forEach(source => {
        (Array.from(compositionEdges[source] || [])).forEach(target => {
            // We don't have typed edges because of the somewhat primitive type system in JS.
            // (An array does not really function as a tuple). So we need to reverse engineer
            // the type of the edge (and therefore what composition action to apply) based on
            // the names of the vertices.
            console.log('Processing edge:', source, ' --- ', target);
            if (target.startsWith(source + '/')) {
                // Parent-child relationship
                // nothing to do anymore, only for dependency sorting
            } else {
                // Else it's an inheritance relationship
                publishAsNewPrefix(target, source);
                composed[source] = composePrim(composed[target] || null, composed[source]);
            }
        });
    });

    // Build a nested tree from the path -> object map
    const buildTree = (map) => {
        // First pass: create a node for each key.
        const nodes = Object.entries(map).reduce((acc, [k, v]) => {
            if (v.def == 'def') {
                acc[k] = { name: k, children: [], type: v.type, attributes: v.attributes || {} };
            }
            return acc;
        }, {});
        // Create pseudo-root
        nodes[''] = { name: '', children: [] };
        // Assign children to parent
        Object.keys(map).forEach(key => {
            const parentKey = key.split('/').slice(0,-1).join('/');
            if (nodes[parentKey] && nodes[key]) {
                nodes[parentKey].children.push(nodes[key]);
            }
        });
        return nodes[''];
    };

    return buildTree(composed);
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
    datas.slice().reverse().forEach(([name, _], index) => {
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
