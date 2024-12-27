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
  Shader: "UsdShade:Shader",
  PlainXForm: "Xform"; // whats this?
}

@jsonSchema
model UsdGeomMeshComponent {
    "UsdGeom:Mesh": {
        faceVertexIndices: int32[],
        points: float[][]
    }
}

@jsonSchema
model UsdGeomVisibilityAPIvisibilityComponent {
    "UsdGeom:VisibilityAPI:visibility": {
        visibility: "visible" | "invisible";
    }
}

@jsonSchema
model Ifc5ClassComponent
{
    "ifc5:class": {
        code: string;
        uri: string;
    }
}

@jsonSchema
model UsdShadeMaterialBindingAPIComponent
{
    "UsdShade:MaterialBindingAPI": {
        "material:binding": {
            ref: string;
        }
    }
}

@jsonSchema
model UsdShadeMaterialComponent
{
    "UsdShade:Material": {
        "outputs:surface.connect": {
            ref: string;
        }
    }
}

@jsonSchema
model xformOpComponent
{
    "xformOp": {
        transform: float[][];
    }
}

@jsonSchema
model CustomDataComponent
{
    "customdata": unknown;
}

@jsonSchema
model NLSFBComponent
{
    "nlsfb:class": unknown;
}

@jsonSchema
model PropertiesComponent
{
    "ifc5:properties": unknown;
}

@jsonSchema
model UsdGeomBasisCurvesComponent
{
    "UsdGeom:BasisCurves": {
        points: float[][];
    };
}

@jsonSchema
model ifc5spaceboundaryComponent
{
    "ifc5:spaceboundary": {
        relatedElement: {
            ref: string
        }
    };
}

@jsonSchema
model ifc5alignmentComponent
{
    "ifc5:alignment": {
        segments: {
            ref: string
        }[]
    };
}

// bit of duplication here
@jsonSchema
model ifc5alignmentsegmentComponent
{
    "ifc5:alignmentsegment": {
        EndRadiusOfCurvature: float,
        PredefinedType: "LINE" | "CLOTHOID" | "CIRCULARARC" | "CONSTANTGRADIENT",
        SegmentLength: float,
        StartDirection: float,
        StartPoint: float[],
        StartRadiusOfCurvature: float
    } | {
        EndGradient: float,
        PredefinedType: "LINE" | "CLOTHOID" | "CIRCULARARC" | "CONSTANTGRADIENT",
        HorizontalLength: float,
        StartDistAlong: float,
        StartGradient: float,
        StartHeight: float
    } | {
        EndCantLeft: float,
        EndCantRight: float,
        HorizontalLength: float,
        PredefinedType: "CONSTANTCANT" | "LINEARTRANSITION",
        StartCantLeft: float,
        StartCantRight: float,
        StartDistAlong: float
    };
}

// naming inconsistencies
alias ComponentType = 
    ifc5alignmentsegmentComponent | 
    ifc5alignmentComponent | 
    UsdShadeMaterialComponent | 
    ifc5spaceboundaryComponent | 
    NLSFBComponent | 
    UsdGeomBasisCurvesComponent | 
    PropertiesComponent | 
    CustomDataComponent | 
    xformOpComponent | 
    UsdShadeMaterialBindingAPIComponent | 
    UsdGeomMeshComponent | 
    UsdGeomVisibilityAPIvisibilityComponent | 
    Ifc5ClassComponent;

@jsonSchema
model Over {
    def: "over";
    name: string;
    attributes: ComponentType;
}

@jsonSchema
model Def {
    def: "def";
    type?: ClassType;
    name: string;
    children?: Def[];
    inherits?: string[]; // optional but very rarely so
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