// ifcx-core/util/mm.ts
function MMSet(map, key, value) {
  if (map.has(key)) {
    map.get(key)?.push(value);
  } else {
    map.set(key, [value]);
  }
}

// ifcx-core/composition/cycles.ts
var CycleError = class extends Error {
};
function FindRootsOrCycles(nodes) {
  let dependencies = /* @__PURE__ */ new Map();
  let dependents = /* @__PURE__ */ new Map();
  nodes.forEach((node, path) => {
    Object.keys(node.inherits).forEach((inheritName) => {
      MMSet(dependencies, path, node.inherits[inheritName]);
      MMSet(dependents, node.inherits[inheritName], path);
    });
    Object.keys(node.children).forEach((childName) => {
      MMSet(dependencies, path, node.children[childName]);
      MMSet(dependents, node.children[childName], path);
    });
  });
  let paths = [...nodes.keys()];
  let perm = {};
  let temp = {};
  function visit(path) {
    if (perm[path]) return;
    if (temp[path]) throw new Error(`CYCLE!`);
    temp[path] = true;
    let deps = dependencies.get(path);
    if (deps) {
      deps.forEach((dep) => visit(dep));
    }
    perm[path] = true;
  }
  let roots = /* @__PURE__ */ new Set();
  try {
    paths.forEach((path) => {
      if (!dependents.has(path) && path.indexOf("/") === -1) {
        roots.add(path);
      }
      visit(path);
    });
  } catch (e) {
    return null;
  }
  return roots;
}

// ifcx-core/composition/path.ts
function GetHead(path) {
  return path.split("/")[0];
}
function GetTail(path) {
  let parts = path.split("/");
  parts.shift();
  return parts.join("/");
}

// ifcx-core/composition/node.ts
function MakePostCompositionNode(node) {
  return {
    node,
    children: /* @__PURE__ */ new Map(),
    attributes: /* @__PURE__ */ new Map()
  };
}
function GetChildNodeWithPath(node, path) {
  if (path === "") return node;
  let parts = path.split("/");
  let child = node.children.get(parts[0]);
  if (child) {
    if (parts.length === 1) {
      return child;
    }
    return GetChildNodeWithPath(child, GetTail(path));
  } else {
    return null;
  }
}

// ifcx-core/composition/compose.ts
function FlattenPathToPreCompositionNode(path, inputNodes) {
  let compositionNode = {
    path,
    children: {},
    inherits: {},
    attributes: {}
  };
  inputNodes.forEach((node) => {
    Object.keys(node.children).forEach((childName) => {
      compositionNode.children[childName] = node.children[childName];
    });
    Object.keys(node.inherits).forEach((inheritName) => {
      let ih = node.inherits[inheritName];
      if (ih === null) {
        delete compositionNode.inherits[inheritName];
      } else {
        compositionNode.inherits[inheritName] = ih;
      }
    });
    Object.keys(node.attributes).forEach((attrName) => {
      compositionNode.attributes[attrName] = node.attributes[attrName];
    });
  });
  return compositionNode;
}
function FlattenCompositionInput(input) {
  let compositionNodes = /* @__PURE__ */ new Map();
  for (let [path, inputNodes] of input) {
    compositionNodes.set(path, FlattenPathToPreCompositionNode(path, inputNodes));
  }
  return compositionNodes;
}
function ExpandFirstRootInInput(nodes) {
  let roots = FindRootsOrCycles(nodes);
  if (!roots) {
    throw new CycleError();
  }
  return ComposeNodeFromPath([...roots.values()][0], nodes);
}
function CreateArtificialRoot(nodes) {
  let roots = FindRootsOrCycles(nodes);
  if (!roots) {
    throw new CycleError();
  }
  let pseudoRoot = {
    node: "",
    attributes: /* @__PURE__ */ new Map(),
    children: /* @__PURE__ */ new Map()
  };
  roots.forEach((root) => {
    pseudoRoot.children.set(root, ComposeNodeFromPath(root, nodes));
  });
  return pseudoRoot;
}
function ComposeNodeFromPath(path, preCompositionNodes) {
  return ComposeNode(path, MakePostCompositionNode(path), preCompositionNodes);
}
function ComposeNode(path, postCompositionNode, preCompositionNodes) {
  let preCompositionNode = preCompositionNodes.get(path);
  if (preCompositionNode) {
    AddDataFromPreComposition(preCompositionNode, postCompositionNode, preCompositionNodes);
  }
  postCompositionNode.children.forEach((child, name) => {
    ComposeNode(`${path}/${name}`, child, preCompositionNodes);
  });
  return postCompositionNode;
}
function AddDataFromPreComposition(input, node, nodes) {
  Object.values(input.inherits).forEach((inheritPath) => {
    let classNode = ComposeNodeFromPath(GetHead(inheritPath), nodes);
    let subnode = GetChildNodeWithPath(classNode, GetTail(inheritPath));
    if (!subnode) throw new Error(`Unknown node ${inheritPath}`);
    subnode.children.forEach((child, childName) => {
      node.children.set(childName, child);
    });
    for (let [attrID, attr] of subnode.attributes) {
      node.attributes.set(attrID, attr);
    }
  });
  Object.entries(input.children).forEach(([childName, child]) => {
    if (child !== null) {
      let classNode = ComposeNodeFromPath(GetHead(child), nodes);
      let subnode = GetChildNodeWithPath(classNode, GetTail(child));
      if (!subnode) throw new Error(`Unknown node ${child}`);
      node.children.set(childName, subnode);
    } else {
      node.children.delete(childName);
    }
  });
  Object.entries(input.attributes).forEach(([attrID, attr]) => {
    node.attributes.set(attrID, attr);
  });
}

// ifcx-core/schema/schema-validation.ts
var SchemaValidationError = class extends Error {
};
function ValidateAttributeValue(desc, value, path, schemas) {
  if (desc.inherits) {
    desc.inherits.forEach((inheritedSchemaID) => {
      let inheritedSchema = schemas[inheritedSchemaID];
      if (!inheritedSchema) {
        throw new SchemaValidationError(`Unknown inherited schema id "${desc.inherits}"`);
      }
      ValidateAttributeValue(inheritedSchema.value, value, path, schemas);
    });
  }
  if (desc.dataType === "Boolean") {
    if (typeof value !== "boolean") {
      throw new SchemaValidationError(`Expected "${value}" to be of type boolean`);
    }
  } else if (desc.dataType === "String") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type string`);
    }
  } else if (desc.dataType === "DateTime") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type date`);
    }
  } else if (desc.dataType === "Enum") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type string`);
    }
    let found = desc.enumRestrictions.options.filter((option) => option === value).length === 1;
    if (!found) {
      throw new SchemaValidationError(`Expected "${value}" to be one of [${desc.enumRestrictions.options.join(",")}]`);
    }
  } else if (desc.dataType === "Integer") {
    if (typeof value !== "number") {
      throw new SchemaValidationError(`Expected "${value}" to be of type int`);
    }
  } else if (desc.dataType === "Real") {
    if (typeof value !== "number") {
      throw new SchemaValidationError(`Expected "${value}" to be of type real`);
    }
  } else if (desc.dataType === "Relation") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type string`);
    }
  } else if (desc.dataType === "Object") {
    if (typeof value !== "object") {
      throw new SchemaValidationError(`Expected "${value}" to be of type object`);
    }
    if (desc.objectRestrictions) {
      Object.keys(desc.objectRestrictions.values).forEach((key) => {
        if (!Object.hasOwn(value, key)) {
          throw new SchemaValidationError(`Expected "${value}" to have key ${key}`);
        }
        ValidateAttributeValue(desc.objectRestrictions.values[key], value[key], path + "." + key, schemas);
      });
    }
  } else if (desc.dataType === "Array") {
    if (!Array.isArray(value)) {
      throw new SchemaValidationError(`Expected "${value}" to be of type array`);
    }
    value.forEach((entry) => {
      ValidateAttributeValue(desc.arrayRestrictions.value, entry, path + ".<array>.", schemas);
    });
  } else {
    throw new SchemaValidationError(`Unexpected datatype ${desc.dataType}`);
  }
}
function Validate(schemas, inputNodes) {
  inputNodes.forEach((node) => {
    Object.keys(node.attributes).filter((v) => !v.startsWith("__internal")).forEach((schemaID) => {
      if (!schemas[schemaID]) {
        throw new SchemaValidationError(`Missing schema "${schemaID}" referenced by ["${node.path}"].attributes`);
      }
      let schema = schemas[schemaID];
      let value = node.attributes[schemaID];
      try {
        ValidateAttributeValue(schema.value, value, "", schemas);
      } catch (e) {
        if (e instanceof SchemaValidationError) {
          throw new SchemaValidationError(`Error validating ["${node.path}"].attributes["${schemaID}"]: ${e.message}`);
        } else {
          throw e;
        }
      }
    });
  });
}

// ifcx-core/workflows.ts
function ToInputNodes(data) {
  let inputNodes = /* @__PURE__ */ new Map();
  data.forEach((ifcxNode) => {
    let node = {
      path: ifcxNode.path,
      children: ifcxNode.children ? ifcxNode.children : {},
      inherits: ifcxNode.inherits ? ifcxNode.inherits : {},
      attributes: ifcxNode.attributes ? ifcxNode.attributes : {}
    };
    MMSet(inputNodes, node.path, node);
  });
  return inputNodes;
}
async function FetchRemoteSchemas(file) {
  async function fetchJson(url) {
    let result = await fetch(url);
    if (!result.ok) {
      throw new Error(`Failed to fetch ${url}: ${result.status}`);
    }
    return result.json();
  }
  async function fetchAll(urls) {
    const promises = urls.map(fetchJson);
    return await Promise.all(promises);
  }
  let schemasURIs = Object.values(file.schemas).map((s) => s.uri).filter((s) => s);
  let remoteSchemas = (await fetchAll(schemasURIs)).map((r) => r.schemas);
  remoteSchemas.forEach((remoteSchema) => {
    Object.keys(remoteSchema).forEach((schemaID) => {
      file.schemas[schemaID] = remoteSchema[schemaID];
    });
  });
}
function LoadIfcxFile(file, checkSchemas = true, createArtificialRoot = false) {
  let inputNodes = ToInputNodes(file.data);
  let compositionNodes = FlattenCompositionInput(inputNodes);
  try {
    if (checkSchemas) {
      Validate(file.schemas, compositionNodes);
    }
  } catch (e) {
    throw e;
  }
  if (createArtificialRoot) {
    return CreateArtificialRoot(compositionNodes);
  } else {
    return ExpandFirstRootInInput(compositionNodes);
  }
}
function Federate(files) {
  let result = {
    header: files[0].header,
    schemas: {},
    data: []
  };
  files.forEach((file) => {
    Object.keys(file.schemas).forEach((schemaID) => result.schemas[schemaID] = file.schemas[schemaID]);
  });
  files.forEach((file) => {
    file.data.forEach((node) => result.data.push(node));
  });
  return Prune(result);
}
function Collapse(nodes, deleteEmpty = false) {
  let result = {
    path: nodes[0].path,
    children: {},
    inherits: {},
    attributes: {}
  };
  nodes.forEach((node) => {
    Object.keys(node.children).forEach((name) => {
      result.children[name] = node.children[name];
    });
    Object.keys(node.inherits).forEach((name) => {
      result.inherits[name] = node.inherits[name];
    });
    Object.keys(node.attributes).forEach((name) => {
      result.attributes[name] = node.attributes[name];
    });
  });
  if (deleteEmpty) {
    let empty = true;
    Object.keys(result.children).forEach((name) => {
      if (result.children[name] !== null) empty = false;
    });
    Object.keys(result.inherits).forEach((name) => {
      if (result.inherits[name] !== null) empty = false;
    });
    Object.keys(result.attributes).forEach((name) => {
      if (result.attributes[name] !== null) empty = false;
    });
    if (empty) return null;
  }
  return result;
}
function Prune(file, deleteEmpty = false) {
  let result = {
    header: file.header,
    schemas: file.schemas,
    data: []
  };
  let inputNodes = ToInputNodes(file.data);
  inputNodes.forEach((nodes) => {
    let collapsed = Collapse(nodes, deleteEmpty);
    if (collapsed) result.data.push({
      path: collapsed.path,
      children: collapsed.children,
      inherits: collapsed.inherits,
      attributes: collapsed.attributes
    });
  });
  return result;
}

// viewer/compose-flattened.ts
function TreeNodeToComposedObject(path, node, schemas) {
  let co = {
    name: path,
    attributes: {},
    children: []
  };
  node.children.forEach((childNode, childName) => {
    co.children?.push(TreeNodeToComposedObject(`${path}/${childName}`, childNode, schemas));
  });
  node.attributes.forEach((attr, attrName) => {
    if (attr && typeof attr === "object" && !Array.isArray(attr)) {
      Object.keys(attr).forEach((compname) => {
        co.attributes[`${attrName}::${compname}`] = attr[compname];
      });
    } else {
      let schema = schemas[attrName];
      if (schema && schema.value.quantityKind) {
        let postfix = "";
        let quantityKind = schema.value.quantityKind;
        if (quantityKind === "Length") {
          postfix = "m";
        } else if (quantityKind === "Volume") {
          postfix = "m" + String.fromCodePoint(179);
        }
        co.attributes[attrName] = `${attr} ${postfix}`;
      } else {
        co.attributes[attrName] = attr;
      }
    }
  });
  if (Object.keys(co.attributes).length === 0) delete co.attributes;
  return co;
}
async function compose3(files) {
  let federated = Federate(files);
  federated.data.forEach((n, i) => {
    n.attributes = n.attributes || {};
    n.attributes[`__internal_${i}`] = n.path;
  });
  await FetchRemoteSchemas(federated);
  let tree = LoadIfcxFile(federated, true, true);
  return TreeNodeToComposedObject("", tree, federated.schemas);
}

// viewer/render.ts
var controls;
var renderer;
var scene;
var camera;
var datas = [];
var autoCamera = true;
var objectMap = {};
var domMap = {};
var primMap = {};
var currentPathMapping = null;
var rootPrim = null;
var selectedObject = null;
var selectedDom = null;
var THREE = window["THREE"];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
function init() {
  scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(14544639, 0.4);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(16777215, 1);
  keyLight.position.set(5, -10, 7.5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(16777215, 0.5);
  fillLight.position.set(-5, 5, 5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(16777215, 0.3);
  rimLight.position.set(0, 8, -10);
  scene.add(rimLight);
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
  renderer.domElement.addEventListener("click", onCanvasClick);
  return scene;
}
function HasAttr(node, attrName) {
  if (!node || !node.attributes) return false;
  return !!node.attributes[attrName];
}
function setHighlight(obj, highlight) {
  if (!obj) return;
  obj.traverse((o) => {
    const mat = o.material;
    if (mat && mat.color) {
      if (highlight) {
        if (!o.userData._origColor) {
          o.userData._origColor = mat.color.clone();
        }
        o.material = mat.clone();
        o.material.color.set(16711680);
      } else if (o.userData._origColor) {
        mat.color.copy(o.userData._origColor);
        delete o.userData._origColor;
      }
    }
  });
}
function selectPath(path) {
  if (!path) {
    if (selectedObject) setHighlight(selectedObject, false);
    if (selectedDom) selectedDom.classList.remove("selected");
    selectedObject = null;
    selectedDom = null;
    return;
  }
  if (selectedObject) {
    setHighlight(selectedObject, false);
  }
  if (selectedDom) {
    selectedDom.classList.remove("selected");
  }
  selectedObject = objectMap[path] || null;
  selectedDom = domMap[path] || null;
  if (selectedObject) setHighlight(selectedObject, true);
  if (selectedDom) selectedDom.classList.add("selected");
}
function onCanvasClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
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
  } else {
    selectPath(null);
  }
}
function createMaterialFromParent(path) {
  let material = {
    color: new THREE.Color(0.6, 0.6, 0.6),
    transparent: false,
    opacity: 1
  };
  for (let p of path) {
    const color = p.attributes ? p.attributes["bsi::ifc::v5a::presentation::diffuseColor"] : null;
    if (color) {
      material.color = new THREE.Color(...color);
      const opacity = p.attributes["bsi::ifc::v5a::presentation::opacity"];
      if (opacity) {
        material.transparent = true;
        material.opacity = opacity;
      }
      break;
    }
  }
  return material;
}
function createCurveFromJson(path) {
  let points = new Float32Array(path[0].attributes["usd::usdgeom::basiscurves::points"].flat());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const material = createMaterialFromParent(path);
  let lineMaterial = new THREE.LineBasicMaterial({ ...material });
  lineMaterial.color.multiplyScalar(0.8);
  return new THREE.Line(geometry, lineMaterial);
}
function createMeshFromJson(path) {
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
function traverseTree(path, parent, pathMapping) {
  const node = path[0];
  let elem = new THREE.Group();
  if (HasAttr(node, "usd::usdgeom::visibility::visibility")) {
    if (node.attributes["usd::usdgeom::visibility::visibility"] === "invisible") {
      return;
    }
  } else if (HasAttr(node, "usd::usdgeom::mesh::points")) {
    elem = createMeshFromJson(path);
  } else if (HasAttr(node, "usd::usdgeom::basiscurves::points")) {
    elem = createCurveFromJson(path);
  }
  objectMap[node.name] = elem;
  primMap[node.name] = node;
  elem.userData.path = node.name;
  for (let path2 of Object.entries(node.attributes || {}).filter(([k, _]) => k.startsWith("__internal_")).map(([_, v]) => v)) {
    (pathMapping[String(path2)] = pathMapping[String(path2)] || []).push(node.name);
  }
  parent.add(elem);
  if (path.length > 1) {
    elem.matrixAutoUpdate = false;
    let matrixNode = node.attributes && node.attributes["usd::xformop::transform"] ? node.attributes["usd::xformop::transform"].flat() : null;
    if (matrixNode) {
      let matrix = new THREE.Matrix4();
      matrix.set(...matrixNode);
      matrix.transpose();
      elem.matrix = matrix;
    }
  }
  (node.children || []).forEach((child) => traverseTree([child, ...path], elem || parent, pathMapping));
}
function encodeHtmlEntities(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
var icons = {
  "usd::usdgeom::mesh::points": "deployed_code",
  "usd::usdgeom::basiscurves::points": "line_curve",
  "usd::usdshade::material::outputs::surface.connect": "line_style"
};
function handleClick(prim, pathMapping, root) {
  const container = document.querySelector(".attributes .table");
  if (container !== null) {
    container.innerHTML = "";
    const table = document.createElement("table");
    table.setAttribute("border", "0");
    const entries = [["name", prim.name], ...Object.entries(prim.attributes).filter(([k, _]) => !k.startsWith("__internal_"))];
    const format = (value) => {
      if (Array.isArray(value)) {
        let N = document.createElement("span");
        N.appendChild(document.createTextNode("("));
        let first = true;
        for (let n of value.map(format)) {
          if (!first) {
            N.appendChild(document.createTextNode(","));
          }
          N.appendChild(n);
          first = false;
        }
        N.appendChild(document.createTextNode(")"));
        return N;
      } else if (typeof value === "object") {
        const ks = Object.keys(value);
        if (ks.length == 1 && ks[0] === "ref" && pathMapping[value.ref] && pathMapping[value.ref].length == 1) {
          let a = document.createElement("a");
          let resolvedRefAsPath = pathMapping[value.ref][0];
          a.setAttribute("href", "#");
          a.textContent = resolvedRefAsPath;
          a.onclick = () => {
            let prim2 = null;
            const recurse = (n) => {
              if (n.name === resolvedRefAsPath) {
                prim2 = n;
              } else {
                (n.children || []).forEach(recurse);
              }
            };
            recurse(root);
            if (prim2) {
              handleClick(prim2, pathMapping, root);
            }
          };
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
function buildDomTree(prim, node, pathMapping, root = null) {
  const elem = document.createElement("div");
  let span;
  elem.appendChild(document.createTextNode(prim.name ? prim.name.split("/").reverse()[0] : "root"));
  elem.appendChild(span = document.createElement("span"));
  Object.entries(icons).forEach(([k, v]) => span.innerText += (prim.attributes || {})[k] ? v : " ");
  span.className = "material-symbols-outlined";
  domMap[prim.name] = elem;
  elem.dataset.path = prim.name;
  elem.onclick = (evt) => {
    handleClick(prim, pathMapping, root || prim);
    selectPath(prim.name);
    evt.stopPropagation();
  };
  node.appendChild(elem);
  (prim.children || []).forEach((p) => buildDomTree(p, elem, pathMapping, root || prim));
}
async function composeAndRender() {
  if (scene) {
    scene.children = scene.children.filter((n) => n instanceof THREE.Light);
  }
  objectMap = {};
  domMap = {};
  primMap = {};
  currentPathMapping = null;
  rootPrim = null;
  document.querySelector(".tree").innerHTML = "";
  if (datas.length === 0) {
    return;
  }
  let tree = null;
  let dataArray = datas.map((arr) => arr[1]);
  tree = await compose3(dataArray);
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
      camera.position.copy(avg.clone().add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(ext)));
      camera.far = ext * 3;
      camera.updateProjectionMatrix();
      controls.target.copy(avg);
      controls.update();
      autoCamera = false;
    }
  }
  buildDomTree(tree, document.querySelector(".tree"), pathMapping);
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
async function addModel(name, m) {
  datas.push([name, m]);
  createLayerDom();
  await composeAndRender();
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
