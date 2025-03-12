// compose.ts
function getChildByName(root, childName, skip = 0) {
  let fragments = childName.replace(/^<\/|^\/|>$/g, "").split("/");
  for (let i = 0; i < skip; ++i) {
    fragments.shift();
  }
  let start = root;
  while (fragments.length && start && start.children) {
    console.log(start, fragments[0]);
    let f = fragments.shift();
    start = start.children.find((i) => i.name.split("/").reverse()[0] === f);
  }
  if (fragments.length == 0) {
    return start;
  }
}

// compose2.ts
var PSEUDO_ROOT = "";
function MMSet(map, key, value) {
  if (map.has(key)) {
    map.get(key)?.push(value);
  } else {
    map.set(key, [value]);
  }
}
function CollectDefChildren(input, output, children) {
  let addedDefs = [];
  input.filter((o) => "children" in o).forEach((parent) => {
    parent.children.forEach((def) => {
      let newDefName = `${parent.name}/${def.name}`;
      addedDefs.push({
        ...def,
        name: newDefName
      });
      MMSet(children, parent.name, newDefName);
    });
  });
  output.push(...addedDefs);
}
function CleanInherit(inheritString) {
  return inheritString.substring(2, inheritString.length - 1);
}
function CollectInherits(input, collection) {
  input.forEach((input2) => {
    if (input2.inherits) {
      input2.inherits.forEach((parent) => {
        MMSet(collection, input2.name, CleanInherit(parent));
      });
    }
  });
}
function prefixAttributesWithComponentName(attributes) {
  let prefixed = {};
  Object.keys(attributes).forEach((componentName) => {
    if (attributes[componentName] !== null && typeof attributes[componentName] === "object" && !Array.isArray(attributes[componentName])) {
      Object.keys(attributes[componentName]).forEach((valueName) => {
        prefixed[`${componentName}:${valueName}`] = attributes[componentName][valueName];
      });
    } else {
      prefixed[componentName] = attributes[componentName];
    }
  });
  return prefixed;
}
function CondenseAttributes(attrs) {
  if (!attrs) return void 0;
  let condensed = {};
  attrs.filter((a) => a).forEach((attributes) => {
    condensed = { ...condensed, ...attributes };
  });
  return condensed;
}
var IntermediateComposition = class {
  names = /* @__PURE__ */ new Set();
  children = /* @__PURE__ */ new Map();
  inherits = /* @__PURE__ */ new Map();
  isClass = /* @__PURE__ */ new Map();
  types = /* @__PURE__ */ new Map();
  attributes = /* @__PURE__ */ new Map();
};
function GetAllAttributesForNode(ic, fullNodePath) {
  let attributeArray = [];
  let pathParts = fullNodePath.split("/");
  for (let i = pathParts.length - 1; i >= 0; i--) {
    let prefix = pathParts.slice(i, pathParts.length).join("/");
    let attrs = ic.attributes.get(prefix);
    if (attrs) attributeArray.push(...attrs);
  }
  return attributeArray.filter((a) => !!a);
}
function BuildTreeNodeFromIntermediateComposition(node, parentPath, parentInherits, ic) {
  let isPseudoRoot = node === PSEUDO_ROOT;
  let displayName = node.indexOf("/") > 0 ? node.substring(node.indexOf("/") + 1) : node;
  let currentNodePath = isPseudoRoot ? PSEUDO_ROOT : parentInherits ? parentPath : `${parentPath}/${displayName}`;
  let nodeAttributes = CondenseAttributes(GetAllAttributesForNode(ic, node));
  let obj = {
    name: currentNodePath,
    attributes: isPseudoRoot ? void 0 : nodeAttributes,
    type: isPseudoRoot ? void 0 : ic.types.get(node)
  };
  if (ic.children.has(node)) {
    obj.children = [];
    ic.children.get(node)?.forEach((child) => {
      let childObject = BuildTreeNodeFromIntermediateComposition(child, currentNodePath, false, ic);
      obj.children?.push(childObject);
    });
  }
  if (ic.inherits.has(node)) {
    obj.children = obj.children ? obj.children : [];
    ic.inherits.get(node)?.forEach((child) => {
      let childObject = BuildTreeNodeFromIntermediateComposition(child, currentNodePath, true, ic);
      if (childObject.children) {
        obj.children?.push(...childObject.children);
      }
      obj.type = childObject.type;
      obj.attributes = CondenseAttributes([childObject.attributes, obj.attributes]);
    });
  }
  return obj;
}
function UpdateIntermediateCompositionWithFile(ic, file) {
  let classes = file.filter((element) => "def" in element && element.def === "class");
  let defs = file.filter((element) => "def" in element && element.def === "def");
  let overs = file.filter((element) => "def" in element && element.def === "over");
  CollectDefChildren(classes, defs, ic.children);
  CollectDefChildren(defs, defs, ic.children);
  classes.forEach((c) => ic.names.add(c.name));
  defs.forEach((d) => ic.names.add(d.name));
  classes.forEach((c) => ic.isClass.set(c.name, true));
  classes.forEach((c) => ic.types.set(c.name, c.type));
  defs.forEach((d) => ic.types.set(d.name, d.type));
  {
    let plainAttributes = /* @__PURE__ */ new Map();
    defs.forEach((d) => MMSet(plainAttributes, d.name, d.attributes));
    overs.forEach((o) => MMSet(plainAttributes, o.name, o.attributes));
    plainAttributes.forEach((attrs, node) => {
      attrs.filter((a) => a).forEach((attr) => {
        MMSet(ic.attributes, node, prefixAttributesWithComponentName(attr));
      });
    });
  }
  CollectInherits(defs, ic.inherits);
  CollectInherits(classes, ic.inherits);
  return ic;
}
function BuildTreeFromIntermediateComposition(ic) {
  let parents = /* @__PURE__ */ new Map();
  ic.children.forEach((children, parent) => {
    children.forEach((child) => {
      MMSet(parents, child, parent);
    });
  });
  let roots = [];
  ic.names.forEach((name) => {
    if (!parents.has(name) || parents.get(name)?.length === 0) {
      roots.push(name);
    }
  });
  roots = roots.filter((root) => !ic.isClass.get(root));
  roots.forEach((root) => {
    MMSet(ic.children, PSEUDO_ROOT, root);
  });
  return BuildTreeNodeFromIntermediateComposition(PSEUDO_ROOT, PSEUDO_ROOT, false, ic);
}
function compose2(files) {
  let ic = new IntermediateComposition();
  files.forEach((file) => UpdateIntermediateCompositionWithFile(ic, file));
  return BuildTreeFromIntermediateComposition(ic);
}

// render.ts
var controls;
var renderer;
var scene;
var camera;
var datas = [];
var autoCamera = true;
var THREE = window["THREE"];
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.up.set(0, 0, 1);
  camera.position.set(50, 50, 50);
  camera.lookAt(0, 0, 0);
  const nd = document.querySelector(".viewport");
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    logarithmicDepthBuffer: true
  });
  renderer.setSize(nd.offsetWidth, nd.offsetHeight);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  nd.appendChild(renderer.domElement);
  return scene;
}
function createMaterialFromParent(parent, root) {
  let reference = parent.attributes["UsdShade:MaterialBindingAPI:material:binding"];
  let material = {
    color: new THREE.Color(0.6, 0.6, 0.6),
    transparent: false,
    opacity: 1
  };
  if (reference) {
    const materialNode = getChildByName(root, reference.ref);
    let shader = materialNode?.children?.find((i) => i.type === "UsdShade:Shader");
    let color = shader?.attributes["inputs:diffuseColor"];
    material.color = new THREE.Color(...color);
    if (shader?.attributes["inputs:opacity"]) {
      material.transparent = true;
      material.opacity = shader.attributes["inputs:opacity"];
    }
  }
  return material;
}
function createCurveFromJson(node, parent, root) {
  let points = new Float32Array(node.attributes["UsdGeom:BasisCurves:points"].flat());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const material = createMaterialFromParent(parent, root);
  let lineMaterial = new THREE.LineBasicMaterial({ ...material });
  lineMaterial.color.multiplyScalar(0.8);
  return new THREE.Line(geometry, lineMaterial);
}
function createMeshFromJson(node, parent, root) {
  let points = new Float32Array(node.attributes["UsdGeom:Mesh:points"].flat());
  let indices = new Uint16Array(node.attributes["UsdGeom:Mesh:faceVertexIndices"]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const material = createMaterialFromParent(parent, root);
  let meshMaterial = new THREE.MeshBasicMaterial({ ...material });
  return new THREE.Mesh(geometry, meshMaterial);
}
function traverseTree(node, parent, root, parentNode = void 0) {
  let elem;
  if (node.type === "UsdGeom:Xform") {
    elem = new THREE.Group();
  } else if (node.type === "UsdGeom:Mesh" || node.type === "UsdGeom:BasisCurves") {
    if (node.attributes["UsdGeom:VisibilityAPI:visibility:visibility"] === "invisible") {
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
    let matrixNode = node.attributes && node.attributes["xformOp:transform"] ? node.attributes["xformOp:transform"].flat() : null;
    if (matrixNode) {
      let matrix = new THREE.Matrix4();
      matrix.set(...matrixNode);
      matrix.transpose();
      elem.matrix = matrix;
    }
  }
  (node.children || []).forEach((child) => traverseTree(child, elem || parent, root, node));
}
function encodeHtmlEntities(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
var icons = {
  "UsdGeom:Mesh:points": "deployed_code",
  "UsdGeom:BasisCurves:points": "line_curve",
  "UsdShade:Material:outputs:surface.connect": "line_style"
};
function buildDomTree(prim, node) {
  const elem = document.createElement("div");
  let span;
  elem.appendChild(document.createTextNode(prim.name ? prim.name.split("/").reverse()[0] : "root"));
  elem.appendChild(span = document.createElement("span"));
  Object.entries(icons).forEach(([k, v]) => span.innerText += (prim.attributes || {})[k] ? v : " ");
  span.className = "material-symbols-outlined";
  elem.onclick = (evt) => {
    let rows = [["name", prim.name]].concat(Object.entries(prim.attributes)).map(([k, v]) => `<tr><td>${encodeHtmlEntities(k)}</td><td>${encodeHtmlEntities(typeof v === "object" ? JSON.stringify(v) : v)}</td>`).join("");
    document.querySelector(".attributes .table").innerHTML = `<table border="0">${rows}</table>`;
    evt.stopPropagation();
  };
  node.appendChild(elem);
  (prim.children || []).forEach((p) => buildDomTree(p, elem));
}
function composeAndRender() {
  if (scene) {
    scene.children = [];
  }
  document.querySelector(".tree").innerHTML = "";
  if (datas.length === 0) {
    return;
  }
  const tree = compose2(datas.map((arr) => arr[1]));
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
      camera.position.copy(avg.clone().add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(ext)));
      camera.far = ext * 3;
      camera.updateProjectionMatrix();
      controls.target.copy(avg);
      controls.update();
      autoCamera = false;
    }
  }
  buildDomTree(tree, document.querySelector(".tree"));
  animate();
}
function createLayerDom() {
  document.querySelector(".layers div").innerHTML = "";
  datas.forEach(([name, _], index) => {
    const elem = document.createElement("div");
    elem.appendChild(document.createTextNode(name));
    ["\u25B3", "\u25BD", "\xD7"].reverse().forEach((lbl, cmd) => {
      const btn = document.createElement("span");
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
      };
      btn.appendChild(document.createTextNode(lbl));
      elem.appendChild(btn);
    });
    document.querySelector(".layers div").appendChild(elem);
  });
}
function addModel(name, m) {
  datas.push([name, m]);
  createLayerDom();
  composeAndRender();
}
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
export {
  composeAndRender,
  addModel as default
};
