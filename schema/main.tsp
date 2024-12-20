import "@typespec/json-schema";

using TypeSpec.JsonSchema;

@jsonSchema
model Disclaimer {
    disclaimer: string;
}

enum ClassType
{
  Mesh: "UsdGeom:Mesh",
  XForm: "UsdGeom:Xform",
  BasisCurves: "UsdGeom:BasisCurves",
  Material: "UsdShade:Material",
  Shader: "UsdShade:Shader" 
}

@jsonSchema
model UsdGeomMesh {
    faceVertexIndices: int32[],
    points: float[][]
}

@jsonSchema
model UsdGeomVisibilityAPIvisibility {
    visibility: "visible" | "invisible"
}

@jsonSchema
model Over {
    def: "over";
    name: string;
    attributes: {
        "UsdGeom:Mesh"?: UsdGeomMesh;
        "UsdGeom:VisibilityAPI:visibility"?: UsdGeomVisibilityAPIvisibility;
    }
}

@jsonSchema
model Def {
    def: "def";
    type?: ClassType;
    name: string;
    children?: Def[];
}

@jsonSchema
model Class {
    def: "class";
    type?: ClassType;
    name: string;
    children?: Def[];
}

@jsonSchema
model Ifc5File is Array<Class | Def | Over | Disclaimer> {
    
}