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
    let material = {
        color: new THREE.Color(0.6, 0.6, 0.6)
    };
    if (parent.attributes['usd::usdshade::materialbindingapi::material::binding']) {
        let reference = parent.attributes['usd::usdshade::materialbindingapi::material::binding'].value;
        const materialNode = getChildByName(root, reference.ref);
        if (!materialNode) {
            return null;
        }
        let shader = materialNode.children.find(i => i.attributes['usd::materials::inputs::diffuseColor']);
        let color = shader.attributes['usd::materials::inputs::diffuseColor'].value;
        material.color = new THREE.Color(...color);
        if (shader.attributes['usd::materials::inputs::opacity']) {
            material.transparent = true;
            material.opacity = shader.attributes['usd::materials::inputs::opacity'].value;
        }
    }
    return material;
}

function createCurveFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['usd::usdgeom::basiscurves::points'].value.flat());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const material = createMaterialFromParent(parent, root);
    let lineMaterial = new THREE.LineBasicMaterial({...(material || {})});
    // Make lines a little darker, otherwise they have the same color as meshes
    lineMaterial.color.multiplyScalar(0.8)
    return new THREE.Line(geometry, lineMaterial);
}


function createMeshFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['usd::usdgeom::mesh::points'].value.flat());
    let indices = new Uint16Array(node.attributes['usd::usdgeom::mesh::faceVertexIndices'].value);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = createMaterialFromParent(parent, root);
    let meshMaterial = new THREE.MeshBasicMaterial({...(material || {})});

    return new THREE.Mesh(geometry, meshMaterial);
}

function traverseTree(node, parent, root, parentNode) {
    let elem = null;
    if (node.attributes["usd::xformop::transform"]) {
        elem = new THREE.Group();
    } else if (node.attributes["usd::usdgeom::mesh::points"] || node.attributes["usd::usdgeom::basiscurves::points"]) {
        if (node.attributes["usd::usdgeom::visibility::visibility"] && node.attributes["usd::usdgeom::visibility::visibility"].value === 'invisible') {
            return;
        }
        if (node.attributes['usd::usdgeom::mesh::faceVertexIndices']) {
            elem = createMeshFromJson(node, parentNode, root);
        } else {
            elem = createCurveFromJson(node, parentNode, root);
        }
    } else if (node !== root) {
        // return;
    }

    if (elem !== null) {
        parent.add(elem);
        elem.matrixAutoUpdate = false;

        let matrixNode = node.attributes && node.attributes['usd::xformop::transform'] ? node.attributes['usd::xformop::transform'].value.flat() : null;
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
    // Namespace as object no longer present, but we still want to decorate with {value:, opinions[]}
    function flattenAttributes(modelId, prim) {
        const isObject = (x) => typeof x === 'object' && !Array.isArray(x) && x !== null;
        const pairs = Object.entries(prim.attributes || {}).map(([k, v]) => isObject(v) ? Object.entries(v).map(([kk, vv]) => [`${k}::${kk}`, vv]) : [[k, v]]).flat(1) 
        const attrs = Object.fromEntries(pairs.map(([k, v]) => [k, {
            value: v,
            opinions: Object.fromEntries([[modelId, v]])
        }]));
        return {
            ...prim,
            attributes: attrs
        };
    }

    function addEdge(a, b) {
        (compositionEdges[a] = compositionEdges[a] || []).push(b);
    }

    // Traverse forest and yield paths as a map of str -> dict
    function collectPaths(nodes, modelId) {
        const paths = {};

        function process(node) {
            const nodeId = node.identifier;
            const N = flattenAttributes(modelId, node);
            // Store in map
            (paths[nodeId] = paths[nodeId] || []).push(N);

            // Add inheritance edges
            for (let tgt of Object.values(node.inherits || {})) {
                addEdge(nodeId, tgt);
            }

            // Add subprim edges
            Object.entries(node.children || {}).forEach(([localName, tgt]) => {
                const childName = `${nodeId}/${localName}`;
                addEdge(nodeId, childName);
                addEdge(childName, tgt);
            });

            if (!node.inherits && !node.children) {
                // A bit ugly, but necessary to detect isolated nodes as roots
                (compositionEdges[nodeId] = compositionEdges[nodeId] || []);
            }

            if (nodeId.indexOf('/') !== -1) {
                let [parent, localChild] = nodeId.split('/', 2);
                addEdge(parent, nodeId);
            }
        }

        // traverse is no longer necessary, we can just loop
        nodes.forEach(process);

        return paths;
    }

    // Prim storage based on path for the various layers
    const maps = datas.map(d => d.data ? d.data : d).map(ds => ds.filter(d => !d.disclaimer)).map(collectPaths);
    
    // Reduction function to override prim attributes
    //
    // Children relationship is based on key prefixes in the map,
    // not yet part of the current prim object structure.
    function composePrim(weaker, stronger) {
        function composeAttribute(weaker, stronger) {
            return !weaker ? stronger : (!stronger ? weaker : {
                value: stronger.value || weaker.value,
                // @todo because we only use modelId as a key we will not detect conflicts within the same layer
                opinions: {...weaker.opinions, ...stronger.opinions}
            });
        }
        let weakerAttributes = ((weaker && weaker.attributes) ? weaker.attributes : {});
        let strongerAttributes = ((stronger && stronger.attributes) ? stronger.attributes : {});
        let keyUnion = Array.from(new Set([...Object.keys(weakerAttributes), ...Object.keys(strongerAttributes)]));
        return {
            attributes: Object.fromEntries(keyUnion.map(k => [k, composeAttribute(weakerAttributes[k], strongerAttributes[k])]))
        }
    }

    // Compose all paths prior to solving for inheritance.
    // Set(maps.map(m => Object.keys(m)).flat()): all identifiers across layers
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
    const roots = new Set(Array.from((new Set(Object.keys(compositionEdges))).difference(new Set(Object.values(compositionEdges).flat()))));
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
            acc[k] = { name: k, children: [], attributes: v.attributes || {} };
            return acc;
        }, {});
        // Assign children to parent
        Object.keys(map).forEach(key => {
            const parentKey = key.split('/').slice(0,-1).join('/');
            if (nodes[parentKey] && nodes[key]) {
                nodes[parentKey].children.push(nodes[key]);
            }
        });
        return {
            name: 'root',
            children: Object.entries(nodes).filter(([k, v]) => roots.has(k)).map(([k, v]) => v),
            attributes: {}
        };
    };

    return buildTree(composed);
}

function encodeHtmlEntities(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const icons = {
    'usd::usdgeom::mesh::points': 'deployed_code', 
    'usd::usdgeom::basiscurves::points': 'line_curve',
    'usd::materials::inputs::diffuseColor': 'line_style'
};

function buildDomTree(headers, prim, node) {
    const elem = document.createElement('div');
    let span;
    elem.appendChild(document.createTextNode(prim.name ? prim.name.split('/').reverse()[0] : 'root'));
    elem.appendChild(span = document.createElement('span'));
    Object.entries(icons).forEach(([k, v]) => span.innerText += (prim.attributes || {})[k] ? v : ' ');
    span.className = "material-symbols-outlined";
    function renderValue(v) {
        if (typeof v === 'object') {
            if (v.value && v.opinions) {
                let numDistinctValues = [...new Set(Object.values(v.opinions))].length;
                let opinionList;
                if (numDistinctValues > 1) {
                    opinionList = Object.entries(v.opinions).map(([k, v]) => `${headers[k].author}: ${v}`).join(', ');
                } else {
                    opinionList = Object.keys(v.opinions).map(v => headers[v].author).join(', ');
                }
                let postfix = (Object.keys(v.opinions).length > 1) ? ` <span class='material-symbols-outlined' title='opinions: ${opinionList}' style='cursor:pointer'>${numDistinctValues === 1 ? 'warning' : 'error'}</span>` : "";
                return encodeHtmlEntities(renderValue(v.value)) + postfix;
            } else {
                return encodeHtmlEntities(JSON.stringify(v));
            }
        } else {
            return encodeHtmlEntities(v);
        }
    }
    elem.onclick = (evt) => {
        let rows = [['name', prim.name]].concat(Object.entries(prim.attributes || {})).map(([k, v]) => `<tr><td>${encodeHtmlEntities(k)}</td><td>${renderValue(v)}</td>`).join('');
        document.querySelector('.attributes .table').innerHTML = `<table border="0">${rows}</table>`;
        evt.stopPropagation();
    };
    node.appendChild(elem);
    (prim.children || []).forEach(p => buildDomTree(headers, p, elem));
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

    const headers = datas.map(d => d[1].header || {});
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

    buildDomTree(headers, tree, document.querySelector('.tree'));
    animate();
}

function createLayerDom() {
    document.querySelector('.layers div').innerHTML = '';
    datas.slice()/*.reverse()*/.forEach(([name, _], index) => {
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
