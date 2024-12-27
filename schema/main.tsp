import "@typespec/json-schema";

using TypeSpec.JsonSchema;

// _ . : rarely used, / used for relative paths (hello-wall WallMaterial)
@pattern("</[A-Za-z0-9_/.:]+>")
scalar reference extends string;

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

// name clash with native "class"
// code should be enum (distinction from nlsfb)
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
            ref: reference;
        }
    }
}

@jsonSchema
model UsdShadeMaterialComponent
{
    "UsdShade:Material": {
        "outputs:surface.connect": {
            ref: reference;
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
            ref: reference
        }
    };
}

@jsonSchema
model ifc5alignmentComponent
{
    "ifc5:alignment": {
        segments: {
            ref: reference
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
    inherits?: reference[]; // optional but very rarely so, see (hello-wall WallMaterial)
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