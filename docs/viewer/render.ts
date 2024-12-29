// (C) buildingSMART International
// published under MIT license 

import { ClassJson, DefJson, DisclaimerJson, Ifc5FileJson, OverJson } from '../../schema/out/@typespec/json-schema/ts/ifc5file';
import { compose, ComposedObject, getChildByName } from './compose';

let controls, renderer, scene, camera;
type datastype = [string, Ifc5FileJson][];
let datas: datastype = [];
let autoCamera = true;

// hack
let THREE = window["THREE"];

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

    //@ts-ignore
    renderer.setSize(nd.offsetWidth, nd.offsetHeight);

    //@ts-ignore
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    nd!.appendChild(renderer.domElement);

    return scene;
}

function createCurveFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['UsdGeom:BasisCurves:points'].flat());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x202020 });
    return new THREE.Line(geometry, material);
}

function createMeshFromJson(node: ComposedObject, parent: ComposedObject | undefined, root: ComposedObject) {
    let points = new Float32Array(node.attributes['UsdGeom:Mesh:points'].flat());
    let indices = new Uint16Array(node.attributes['UsdGeom:Mesh:faceVertexIndices']);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    // material on parent?
    let reference = parent!.attributes['UsdShade:MaterialBindingAPI:material:binding'];
    //@ts-ignore
    let material: THREE.MeshBasicMaterial | null = null;
    if (reference) {
        const materialNode = getChildByName(root, reference.ref);
        let shader = materialNode!.children!.find(i => i.type === 'UsdShade:Shader');
        let color = shader!.attributes['inputs:diffuseColor'];
        material = new THREE.MeshBasicMaterial();
        material.color = new THREE.Color(...color);
        if (shader!.attributes['inputs:opacity']) {
            material.transparent = true;
            material.opacity = shader!.attributes['inputs:opacity'];
        }
    } else {
        material = new THREE.MeshBasicMaterial();
        material.color = new THREE.Color(0.6, 0.6, 0.6);
    }

    return new THREE.Mesh(geometry, material);
}

function traverseTree(node: ComposedObject, parent, root: ComposedObject, parentNode: ComposedObject | undefined = undefined) {
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
            //@ts-ignore
            matrix.set(...matrixNode);
            matrix.transpose();
            elem.matrix = matrix;
        }
    }

    (node.children || []).forEach(child => traverseTree(child, elem || parent, root, node));
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
        document.querySelector('.attributes .table')!.innerHTML = `<table border="0">${rows}</table>`;
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

    document.querySelector('.tree')!.innerHTML = '';

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
    document.querySelector('.layers div')!.innerHTML = '';
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
        document.querySelector('.layers div')!.appendChild(elem);
    });
}

export default function addModel(name, m: Ifc5FileJson) {
    datas.push([name, m]);
    createLayerDom();
    composeAndRender();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
