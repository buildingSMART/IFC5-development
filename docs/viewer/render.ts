// (C) buildingSMART International
// published under MIT license 

import { ClassJson, DefJson, DisclaimerJson, Ifc5FileJson, OverJson } from '../../schema/out/@typespec/json-schema/ts/ifc5file';
import { compose, ComposedObject, getChildByName } from './compose';
import { compose2 } from './compose2';
import { compose3 } from './compose3';
import { components } from "../../schema/out/ts/ifcx";
type IfcxFile = components["schemas"]["IfcxFile"];


let controls, renderer, scene, camera;
type datastype = [string, Ifc5FileJson | IfcxFile][];
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
        alpha: true,
        logarithmicDepthBuffer: true
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

function HasAttr(node: ComposedObject | undefined, attrName: string)
{
    if (!node || !node.attributes) return false;
    return !!node.attributes[attrName];
}

function FindChildWithAttr(node: ComposedObject | undefined, attrName: string)
{
    if (!node || !node.children) return undefined;
    for (let i = 0; i < node.children.length; i++)
    {
        if (HasAttr(node.children[i], attrName))
        {
            return node.children[i];
        }
    }

    return undefined;
}

function createMaterialFromParent(parent, root) {
    let reference = parent.attributes['usd::usdshade::materialbindingapi::material::binding'];
    let material = {
        color: new THREE.Color(0.6, 0.6, 0.6),
        transparent: false,
        opacity: 1
    };
    if (reference) {
        const materialNode = getChildByName(root, reference.ref);
        let shader = FindChildWithAttr(materialNode, "usd::materials::inputs::diffuseColor");
        if (shader)
        {
            let color = shader?.attributes['usd::materials::inputs::diffuseColor'];
            material.color = new THREE.Color(...color);
            if (shader?.attributes['usd::materials::inputs::opacity']) {
                material!.transparent = true;
                material!.opacity = shader.attributes['usd::materials::inputs::opacity'];
            }
        }
    }
    return material;
}

function createCurveFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['usd::usdgeom::basiscurves::points'].flat());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const material = createMaterialFromParent(parent, root);
    let lineMaterial = new THREE.LineBasicMaterial({...material});
    // Make lines a little darker, otherwise they have the same color as meshes
    lineMaterial.color.multiplyScalar(0.8)
    return new THREE.Line(geometry, lineMaterial);
}

function createMeshFromJson(node, parent, root) {
    let points = new Float32Array(node.attributes['usd::usdgeom::mesh::points'].flat());
    let indices = new Uint16Array(node.attributes['usd::usdgeom::mesh::faceVertexIndices']);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = createMaterialFromParent(parent, root);
    let meshMaterial = new THREE.MeshBasicMaterial({...material});

    return new THREE.Mesh(geometry, meshMaterial);
}

function traverseTree(node: ComposedObject, parent, root: ComposedObject, parentNode: ComposedObject | undefined = undefined) {
    let elem = new THREE.Group();
    if (HasAttr(node, "usd::usdgeom::visibility::visibility"))
    {
        if (node.attributes["usd::usdgeom::visibility::visibility"] === 'invisible') {
            return;
        }
    } 
    else if (HasAttr(node, "usd::usdgeom::mesh::points")) {
        elem = createMeshFromJson(node, parentNode, root);
    } 
    else if (HasAttr(node, "usd::usdgeom::basiscurves::points"))
    {
        elem = createCurveFromJson(node, parentNode, root);
    } 

    parent.add(elem);
    if (node !== root) {
        elem.matrixAutoUpdate = false;

        let matrixNode = node.attributes && node.attributes['usd::xformop::transform'] ? node.attributes['usd::xformop::transform'].flat() : null;
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
    'usd::usdgeom::mesh::points': 'deployed_code', 
    'usd::usdgeom::basiscurves::points': 'line_curve',
    'usd::usdshade::material::outputs::surface.connect': 'line_style'
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

    let tree: null | ComposedObject = null;
    let dataArray = datas.map(arr => arr[1]);
    if (Array.isArray(dataArray[0]))
    {
        alert(`Please upgrade your files to ifcx alpha, see https://github.com/buildingSMART/IFC5-development for more info.`);
        // pre-alpha
        tree = compose2(dataArray as Ifc5FileJson[]);
    }
    else
    {
        // alpha
        tree = compose3(dataArray as IfcxFile[]);
    }
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
