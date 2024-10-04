import toposort from "./toposort.mjs";


let controls, renderer, scene, camera;
let datas = [];

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
        reference = reference.ref;
        let referenceFragments = reference.substring(2, reference.length - 1).split('/');
        let currentIndex = root;
        while (referenceFragments.length) {
            currentIndex = currentIndex.children.find(i => i.name.split('/').reverse()[0] === referenceFragments[0]);
            referenceFragments.shift();
        }

        let shader = currentIndex.children.find(i => i.type === 'UsdShade:Shader');
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
    } else if (node.type === "UsdGeom:Mesh") {
        if (node.attributes["UsdGeom:VisibilityAPI:visibility:visibility"] === 'invisible') {
            return;
        }
        elem = createMeshFromJson(node, parentNode, root);
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
    //  - flatten tree to list of <path, object> pairs
    //  - group objects with among layers with the same path
    //  - apply inheritance relationships
    //  - recompose into hierarchical structure

    const compositionEdges = {};

    // Undo the hierarhy introduced in 'ECS'.
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

    // Traverse forest and yield paths as a map of str -> dict
    function collectPaths(nodes) {
        const paths = {};

        function traverse(node, path) {
            if (node.name) {
                path = path.concat(node.name);
                let pathStr = path.join('/');
                if (!pathStr.startsWith('/')) {
                    // @todo make this generic
                    pathStr = '/' + pathStr;
                }
                const N = flattenAttributes(node);
                N.name = pathStr;
                (paths[pathStr] = paths[pathStr] || []).push(N);

                for (let ih of node.inherits || []) {
                    (compositionEdges[pathStr] = compositionEdges[pathStr] || []).push(ih.substring(1, ih.length - 1));
                }
                (node.children || []).forEach(child => {
                    if (child.name) {
                        (compositionEdges[pathStr] = compositionEdges[pathStr] || []).push(`/${path.join('/')}/${child.name}`);
                    }
                    traverse(child, path);
                });
            }
        }
        nodes.forEach((n) => traverse(n, []));
        return paths;
    }

    const maps = datas.map(collectPaths);
    const sorted = toposort(compositionEdges);

    // Reduction function to override prim attributes
    // Assumes 'unpacked' attribute namespaces
    function composePrim(right, left) {
        return {
            def: left.def || (right !== null ? right.def : null),
            type: left.type || (right !== null ? right.type : null),
            name: right ? right.name : left.name,
            attributes: {
                ...((left !== null) ? left.attributes : {}),
                ...((right !== null) ? right.attributes : {})
            },
            children: (left.children || []).concat(right ? (right.children || []) : [])
        }
    }

    const composed = {};

    // apply overs:
    // @todo this only works with overs pre-composition,
    // better make over resolution part of the dependency
    // graph so overs over non-root nodes also apply correctly.
    sorted.forEach(p => {
        const opinions = maps.map(m => m[p]).filter(a => a).flat(1);
        if (opinions.length == 1) {
            composed[p] = composePrim(null, opinions[0]);
        } else {
            composed[p] = opinions.reduce(composePrim);
        }
        delete composed[p].children;
    });

    const updateName = (oldPrefix, newPrefix, prim) => {
        return {
            ...prim,
            name: prim.name.replace(oldPrefix, newPrefix),
            children: prim.children.map(c => updateName(oldPrefix, newPrefix, c))
        }
    };

    const applyOvers = (prim) => {
        console.log(prim.name);
        if (prim.name.split('/').length <= 2) {
            // direct overs already applied, @todo make generic by folding over behaviour into composition edges
            return {
                ...prim,
                children: prim.children.map(applyOvers)
            }
        }
        const opinions = maps.map(m => m[prim.name]).filter(a => a).flat(1).filter(a => a.def === 'over');
        return {
            ...[...opinions, prim].reduce(composePrim),
            children: prim.children.map(applyOvers)
        }
    };

    // Apply edges in dependency order
    sorted.forEach(k => {
        (compositionEdges[k] || []).forEach(v => {
            if (v.startsWith(k + '/')) {
                // If k is a subpath of v it's a subPrim relationship
                composed[k].children = composed[k].children || [];
                composed[k].children.push(composed[v]);

                console.log(...[k, v]);
                console.log(...[composed[k].name, composed[v].name]);
            } else {
                // Else it's an inheritance relationship
                composed[k] = applyOvers(updateName(composed[v].name, composed[k].name, composePrim(composed[k], composed[v])));
            }
        });
    });

    // Filter only def'ed roots, and skip classes and overs
    // @todo classes needs to be culled in non-root nodes as well
    const q = {
        'children': Object.values(composed).filter(v => {
            if (v.name.split('/').length == 2) {
                return maps.some(m => m[v.name] && m[v.name].some(p => p.def === 'def'))
            } else {
                return false;
            }
        })
    };
    console.log(q);
    return q;
}

function encodeHtmlEntities(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

function buildDomTree(prim, node) {
    const elem = document.createElement('div');
    elem.appendChild(document.createTextNode(prim.name ? prim.name.split('/').reverse()[0] : 'root'));
    elem.onclick = (evt) => {
        let rows = Object.entries(prim.attributes).map(([k, v]) => `<tr><td>${encodeHtmlEntities(k)}</td><td>${encodeHtmlEntities(typeof v === 'object' ? JSON.stringify(v) : v)}</td>`).join('');
        document.querySelector('.attributes').innerHTML = `<table border="1">${rows}</table>`;
        evt.stopPropagation();
    };
    node.appendChild(elem);
    (prim.children || []).forEach(p => buildDomTree(p, elem));
}

export function composeAndRender() {
    const tree = compose(datas.map(arr => arr[1]));
    traverseTree(tree, scene || init(), tree);
    document.querySelector('.tree').innerHTML = '';
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