// (C) buildingSMART International
// published under MIT license 

import { ComposedObject } from './composed-object';
import { IfcxFile } from '../ifcx-core/schema/schema-helper';
import { compose3 } from './compose-flattened';


let controls, renderer, scene, camera;
type datastype = [string, IfcxFile][];
let datas: datastype = [];
let autoCamera = true;


let objectMap: { [path: string]: any } = {};
let domMap: { [path: string]: HTMLElement } = {};
let primMap: { [path: string]: ComposedObject } = {};
let currentPathMapping: any = null;
let rootPrim: ComposedObject | null = null;

let selectedObject: any = null;
let selectedDom: HTMLElement | null = null;


// hack
let THREE = window["THREE"];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

function init() {
    scene = new THREE.Scene();
    
    // lights
    const ambient = new THREE.AmbientLight(0xddeeff, 0.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, -10, 7.5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 5, 5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 8, -10);
    scene.add(rimLight);

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
    renderer.domElement.addEventListener('click', onCanvasClick);

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

function setHighlight(obj: any, highlight: boolean) {
    if (!obj) return;
    obj.traverse((o) => {
        const mat = o.material;
        if (mat && mat.color) {
            if (highlight) {
                if (!o.userData._origColor) {
                    o.userData._origColor = mat.color.clone();
                }
                o.material = mat.clone();
                o.material.color.set(0xff0000);
            } else if (o.userData._origColor) {
                mat.color.copy(o.userData._origColor);
                delete o.userData._origColor;
            }
        }
    });
}

function selectPath(path: string | null) {
    if (!path) {
        if (selectedObject) setHighlight(selectedObject, false);
        if (selectedDom)    selectedDom.classList.remove('selected');
        selectedObject = null;
        selectedDom    = null;
        return;
    }

    if (selectedObject) {
        setHighlight(selectedObject, false);
    }
    if (selectedDom) {
        selectedDom.classList.remove('selected');
    }
    selectedObject = objectMap[path] || null;
    selectedDom = domMap[path] || null;
    if (selectedObject) setHighlight(selectedObject, true);
    if (selectedDom) selectedDom.classList.add('selected');
}

function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Object.values(objectMap), true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData.path) obj = obj.parent;
        if (obj && obj.userData.path) {
            const path = obj.userData.path;
            const prim = primMap[path];
            if (prim) {
                handleClick(prim, currentPathMapping, rootPrim || prim);
            }
            selectPath(path);
        }
    }
    else {
        selectPath(null);
    }
}


function createMaterialFromParent(path: ComposedObject[]) {
    let material = {
        color: new THREE.Color(0.6, 0.6, 0.6),
        transparent: false,
        opacity: 1
    };
    for (let p of path) {
        const color = p.attributes ? p.attributes["bsi::ifc::presentation::diffuseColor"] : null;
        if (color) {
        material.color = new THREE.Color(...color);
        const opacity = p.attributes["bsi::ifc::presentation::opacity"];
        if (opacity) {
            material.transparent = true;
            material.opacity = opacity;
        }
        break;
        }
    }
    return material;
}

function createCurveFromJson(path: ComposedObject[]) {
  let points = new Float32Array(path[0].attributes["usd::usdgeom::basiscurves::points"].flat());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  
  const material = createMaterialFromParent(path);
  let lineMaterial = new THREE.LineBasicMaterial({ ...material });
  lineMaterial.color.multiplyScalar(0.8);
  
  return new THREE.Line(geometry, lineMaterial);
}

function createMeshFromJson(path: ComposedObject[]) {
  let points = new Float32Array(path[0].attributes["usd::usdgeom::mesh::points"].flat());
  let indices = new Uint16Array(path[0].attributes["usd::usdgeom::mesh::faceVertexIndices"]);
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  
  const material = createMaterialFromParent(path);
  
  let meshMaterial = new THREE.MeshLambertMaterial({ ...material });
  return new THREE.Mesh(geometry, meshMaterial);
}

function traverseTree(path: ComposedObject[], parent, pathMapping) {
    const node = path[0];
    let elem: any = new THREE.Group();
    if (HasAttr(node, "usd::usdgeom::visibility::visibility"))
    {
        if (node.attributes["usd::usdgeom::visibility::visibility"] === 'invisible') {
            return;
        }
    } 
    else if (HasAttr(node, "usd::usdgeom::mesh::points")) {
        elem = createMeshFromJson(path);
    } 
    else if (HasAttr(node, "usd::usdgeom::basiscurves::points"))
    {
        elem = createCurveFromJson(path);
    } 
    
    objectMap[node.name] = elem;
    primMap[node.name] = node;
    elem.userData.path = node.name;

    for (let path of Object.entries(node.attributes || {}).filter(([k, _]) => k.startsWith('__internal_')).map(([_, v]) => v)) {
      (pathMapping[String(path)] = pathMapping[String(path)] || []).push(node.name);
    }

    parent.add(elem);
    if (path.length > 1) {
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

    (node.children || []).forEach(child => traverseTree([child, ...path], elem || parent, pathMapping));
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

function handleClick(prim, pathMapping, root) {
  const container = document.querySelector(".attributes .table");
  if (container !== null) {
  container.innerHTML = "";
  const table = document.createElement("table");
  table.setAttribute("border", "0");
  const entries = [["name", prim.name], ...Object.entries(prim.attributes).filter(([k, _]) => !k.startsWith('__internal_'))];
  const format = (value) => {
    if (Array.isArray(value)) {
      let N = document.createElement('span');
      N.appendChild(document.createTextNode('('));
      let first = true;
      for (let n of value.map(format)) {
        if (!first) {
          N.appendChild(document.createTextNode(','));
        }
        N.appendChild(n);
        first = false;
      }
      N.appendChild(document.createTextNode(')'));
      return N;
    } else if (typeof value === "object") {
      const ks = Object.keys(value);
      if (ks.length == 1 && ks[0] === 'ref' && pathMapping[value.ref] && pathMapping[value.ref].length == 1) {
        let a = document.createElement('a');
        let resolvedRefAsPath = pathMapping[value.ref][0];
        a.setAttribute('href', '#');
        a.textContent = resolvedRefAsPath;
        a.onclick = () => {
          let prim = null;
          const recurse = (n) => {
            if (n.name === resolvedRefAsPath) {
              prim = n;
            } else {
              (n.children || []).forEach(recurse);
            }
          }
          recurse(root);
          if (prim) { 
            handleClick(prim, pathMapping, root);
          }
        }
        return a;
      } else {
        return document.createTextNode(JSON.stringify(value));
      }
    } else {
      return document.createTextNode(value);
    }
  };
  entries.forEach(([key, value]) => {
    const tr = document.createElement("tr");
    const tdKey = document.createElement("td");
    tdKey.textContent = encodeHtmlEntities(key);
    const tdValue = document.createElement("td");
    tdValue.appendChild(format(value));
    tr.appendChild(tdKey);
    tr.appendChild(tdValue);
    table.appendChild(tr);
  });
  container.appendChild(table);
  }
}

function buildDomTree(prim, node, pathMapping, root=null) {
    const elem = document.createElement('div');
    let span;
    elem.appendChild(document.createTextNode(prim.name ? prim.name.split('/').reverse()[0] : 'root'));
    elem.appendChild(span = document.createElement('span'));
    Object.entries(icons).forEach(([k, v]) => span.innerText += (prim.attributes || {})[k] ? v : ' ');
    span.className = "material-symbols-outlined";
    domMap[prim.name] = elem as HTMLElement;
    elem.dataset.path = prim.name;
    elem.onclick = (evt) => {
        handleClick(prim, pathMapping, root || prim);
        selectPath(prim.name);
        evt.stopPropagation();
    };
    node.appendChild(elem);
    (prim.children || []).forEach(p => buildDomTree(p, elem, pathMapping, root || prim));
}

export async function composeAndRender() {
    if (scene) {
        // @todo does this actually free up resources?
        // retain only the lights
        scene.children = scene.children.filter(n => n instanceof THREE.Light);
    }

    objectMap = {};
    domMap = {};
    primMap = {};
    currentPathMapping = null;
    rootPrim = null;

    document.querySelector('.tree')!.innerHTML = '';

    if (datas.length === 0) {
        return;
    }

    let tree: null | ComposedObject = null;
    let dataArray = datas.map(arr => arr[1]);
    
    tree = await compose3(dataArray as IfcxFile[]);
    if (!tree) {
        console.error("No result from composition");
        return;
    }

    let pathMapping = {};
    traverseTree([tree], scene || init(), pathMapping);
    currentPathMapping = pathMapping;
    rootPrim = tree;

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

    buildDomTree(tree, document.querySelector('.tree'), pathMapping);
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
                // TODO: await this
                composeAndRender();
                createLayerDom();
            }
            btn.appendChild(document.createTextNode(lbl));
            elem.appendChild(btn);
        });
        document.querySelector('.layers div')!.appendChild(elem);
    });
}

export default async function addModel(name, m: IfcxFile) {
    datas.push([name, m]);
    createLayerDom();
    await composeAndRender();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
