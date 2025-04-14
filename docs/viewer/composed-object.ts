
export function getChildByName(root: ComposedObject, childName, skip=0) {
    let fragments = childName.replace(/^<\/|^\/|>$/g, '').split('/');
    for (let i = 0; i < skip; ++i) {
        fragments.shift();
    }
    let start: ComposedObject | undefined = root;
    while (fragments.length && start && start.children) {
        console.log(start, fragments[0]);
        let f = fragments.shift();
        start = start.children!.find(i => i.name.split('/').reverse()[0] === f);
    }
    if (fragments.length == 0) {
        return start;
    }
}

export type ComposedObject = {
    name: string, attributes?: any, 
    type?: "UsdGeom:Mesh" | "UsdGeom:Xform" | "UsdGeom:BasisCurves" | "UsdShade:Material" | "UsdShade:Shader" | "Xform";
    children?: ComposedObject[]
};
