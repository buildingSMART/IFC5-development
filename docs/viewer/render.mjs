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
  let points = new Float32Array(node.attributes["UsdGeom:BasisCurves:points"].flat());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({ color: 2105376 });
  return new THREE.Line(geometry, material);
}
function getChildByName(root, childName, skip = 0) {
  let fragments = childName.replace(/^<\/|^\/|>$/g, "").split("/");
  for (let i = 0; i < skip; ++i) {
    fragments.shift();
  }
  let start = root;
  while (fragments.length && start) {
    let f = fragments.shift();
    start = root.children.find((i) => i.name.split("/").reverse()[0] === f);
  }
  return start;
}
function createMeshFromJson(node, parent, root) {
  let points = new Float32Array(node.attributes["UsdGeom:Mesh:points"].flat());
  let indices = new Uint16Array(node.attributes["UsdGeom:Mesh:faceVertexIndices"]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  let reference = parent.attributes["UsdShade:MaterialBindingAPI:material:binding"];
  let material = null;
  if (reference) {
    const materialNode = getChildByName(root, reference.ref);
    let shader = materialNode.children.find((i) => i.type === "UsdShade:Shader");
    let color = shader.attributes["inputs:diffuseColor"];
    material = new THREE.MeshBasicMaterial();
    material.color = new THREE.Color(...color);
    if (shader.attributes["inputs:opacity"]) {
      material.transparent = true;
      material.opacity = shader.attributes["inputs:opacity"];
    }
  } else {
    material = new THREE.MeshBasicMaterial();
    material.color = new THREE.Color(0.6, 0.6, 0.6);
  }
  return new THREE.Mesh(geometry, material);
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
function* collectNames(node) {
  yield node.name;
  for (const child of node.children || []) {
    yield* collectNames(child);
  }
}
function compose(datas2) {
  let compositionEdges = {};
  function flattenAttributes(prim) {
    if (prim.name !== "Shader" && "attributes" in prim) {
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
  function collectPaths(nodes) {
    const paths = {};
    function traverse(node, parentPathStr) {
      if ("name" in node) {
        const isFullyQualified = node.name.split("/").length > 2;
        const reverseWhenFullyQualified = isFullyQualified ? (a) => a.reverse() : (a) => a;
        const pathStr = `${parentPathStr}/${node.name.replace(/^\//, "")}`;
        let nodeId = pathStr;
        let nodeIdComplete = `${pathStr} complete`;
        const N = flattenAttributes(node);
        N.name = pathStr;
        if (node.def === "over") {
          nodeId = `${pathStr} over`;
          let e = reverseWhenFullyQualified([nodeId, pathStr]);
          addEdge(e[0], e[1]);
          addEdge(nodeIdComplete, nodeId);
        }
        addEdge(nodeIdComplete, pathStr);
        (paths[nodeId] = paths[nodeId] || []).push(N);
        if ("inherits" in node) {
          for (let ih of node.inherits || []) {
            const target = ih.substring(1, ih.length - 1);
            addEdge(nodeId, `${target} complete`);
          }
        }
        if ("children" in node) {
          (node.children || []).forEach((child) => {
            if (child.name && child.def === "def") {
              const childName = `${pathStr}/${child.name}`;
              let e = reverseWhenFullyQualified([pathStr, `${childName} complete`]);
              addEdge(e[0], e[1]);
              if (nodeId.endsWith("over")) {
                if (pathStr.split("/").length > 2) {
                  addEdge(childName, `/${pathStr.split("/")[1]}`);
                }
              }
            }
            traverse(child, pathStr);
          });
        }
      }
    }
    nodes.forEach((n) => traverse(n, ""));
    nodes.filter((n) => "name" in n && n.def === "def").forEach((n) => {
      addEdge("", `/${n.name} complete`);
    });
    return paths;
  }
  function removeDuplicates(map_of_arrays) {
    return Object.fromEntries(Object.entries(map_of_arrays).map(([k, vs]) => [k, vs.filter(
      (value, index, array) => array.indexOf(value) === index
    )]));
  }
  const maps = datas2.map(collectPaths);
  let compositionEdgesOrig = removeDuplicates(compositionEdges);
  function composePrim(right, left) {
    return {
      def: left.def || (right !== null ? right.def : null),
      type: left.type || (right !== null ? right.type : null),
      name: right ? right.name : left.name,
      attributes: {
        ...right !== null ? right.attributes : {},
        ...left !== null ? left.attributes : {}
      },
      children: (left.children || []).concat(right ? right.children || [] : [])
    };
  }
  let compositionEdgesUnique = Object.fromEntries(
    Object.entries(compositionEdgesOrig).map(([item, dep]) => [
      item,
      new Set([...dep].filter((e) => e !== item))
    ])
  );
  const extraItemsInDeps = new Set(
    [...Object.values(compositionEdgesUnique).map((st) => Array.from(st)).flat()].filter((value) => !compositionEdgesUnique.hasOwnProperty(value))
  );
  extraItemsInDeps.forEach((item) => {
    if (maps.map((m) => m[item]).some((i) => i)) {
      compositionEdgesUnique[item] = /* @__PURE__ */ new Set();
    }
  });
  const composed = {};
  const built = /* @__PURE__ */ new Set();
  Object.keys(compositionEdgesUnique).forEach((p) => {
    const opinions = maps.map((m) => m[p]).filter((a) => a).flat(1);
    if (p == "") {
      composed[p] = { name: p };
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
      children: prim.children.map((c) => updateName(oldPrefix, newPrefix, c))
    };
  };
  console.log(compositionEdgesUnique);
  let maxIterations = 100;
  while (maxIterations--) {
    const bottomRankNodes = Object.entries(compositionEdgesUnique).filter(([_, dep]) => dep.size === 0 && (composed[_] || built.has(_) || _.endsWith(" complete"))).map(([k, v]) => k);
    console.log("Bottom rank prims to resolve:", ...bottomRankNodes);
    if (bottomRankNodes.length === 0) {
      break;
    }
    const definedPrims = /* @__PURE__ */ new Set();
    bottomRankNodes.forEach((k) => {
      Array.from(compositionEdgesOrig[k] || []).forEach((v) => {
        console.log("Processing edge:", k, " --- ", v);
        if (k.endsWith(" complete") && v.endsWith(" over")) {
        } else if (v.startsWith(k + "/")) {
          if (k.split("/").length > 2) {
          } else {
            v = v.replace(/ complete$/, "");
            composed[k].children = composed[k].children || [];
            composed[k].children?.push(composed[v]);
            Array.from(collectNames(composed[k])).forEach((a) => definedPrims.add(a.substring(k.length)));
          }
        } else if (k.startsWith(v + "/")) {
          if (k.endsWith(" complete")) {
            let child = getChildByName(
              composed[`/${v.split("/")[1]}`],
              v,
              /*skip=*/
              1
            );
            if (child) {
              k = k.replace(/ complete$/, "");
              child.children.push(composed[k]);
            } else {
              console.error(v, "-->", k, "not applied");
            }
            Array.from(collectNames(child)).forEach((a) => definedPrims.add(a.substring(child.name.length)));
          }
        } else if (k.search(/over$/) !== -1) {
          if (k.split("/").length > 2) {
            let child = getChildByName(
              composed[`/${v.split("/")[1]}`],
              k.split(" ")[0],
              /*skip=*/
              1
            );
            if (child) {
              Object.assign(child.attributes, composed[k].attributes);
            } else {
              console.error(k, "-->", v, "not applied");
            }
          } else {
            composed[v] = composePrim(composed[v], composed[k]);
          }
        } else if (v.search(/over$/) !== -1) {
          if (v.split("/").length > 2) {
            let child = getChildByName(
              composed[`/${k.split("/")[1]}`],
              v.split(" ")[0],
              /*skip=*/
              1
            );
            if (child) {
              Object.assign(child.attributes, composed[v].attributes);
            } else {
              console.error(v, "-->", k, "not registered");
            }
          } else {
            composed[k] = composePrim(composed[k], composed[v]);
          }
        } else {
          if (v.endsWith("complete")) {
            v = v.replace(/ complete$/, "");
            composed[k] = updateName(composed[v].name, composed[k].name, composePrim(composed[k], composed[v]));
            Array.from(collectNames(composed[k])).forEach((a) => definedPrims.add(a.substring(k.length)));
          }
        }
      });
    });
    console.log("Constructed prims:", ...definedPrims);
    Array.from(definedPrims).forEach((a) => built.add(a));
    let orderedSet = new Set(bottomRankNodes);
    compositionEdgesUnique = Object.fromEntries(
      Object.entries(compositionEdgesUnique).filter(([item]) => !orderedSet.has(item)).map(([item, dep]) => [item, new Set([...dep].filter((d) => !orderedSet.has(d) && !definedPrims.has(d)))])
    );
  }
  if (Object.keys(compositionEdgesUnique).length !== 0) {
    console.error("Unresolved nodes:", ...Object.keys(compositionEdgesUnique));
  }
  console.log(composed[""]);
  return composed[""];
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
  const tree = compose(datas.map((arr) => arr[1]));
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
