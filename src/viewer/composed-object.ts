
export type ComposedObject = {
    name: string, attributes?: any, 
    type?: "UsdGeom:Mesh" | "UsdGeom:Xform" | "UsdGeom:BasisCurves" | "UsdShade:Material" | "UsdShade:Shader" | "Xform";
    children?: ComposedObject[]
};
