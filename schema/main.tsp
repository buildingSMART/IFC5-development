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

// @todo this is IFC4.3 product subtypes with abstract entities commented out,
// needs refinement
enum IfcClassType {
//IfcProduct: "IfcProduct",
IfcAnnotation: "IfcAnnotation",
//IfcElement: "IfcElement",
 IfcBuiltElement: "IfcBuiltElement",
  IfcBeam: "IfcBeam",
  IfcBearing: "IfcBearing",
  IfcBuildingElementProxy: "IfcBuildingElementProxy",
  IfcChimney: "IfcChimney",
  IfcColumn: "IfcColumn",
  IfcCourse: "IfcCourse",
  IfcCovering: "IfcCovering",
  IfcCurtainWall: "IfcCurtainWall",
  IfcDeepFoundation: "IfcDeepFoundation",
   IfcCaissonFoundation: "IfcCaissonFoundation",
   IfcPile: "IfcPile",
  IfcDoor: "IfcDoor",
  IfcEarthworksElement: "IfcEarthworksElement",
   IfcEarthworksFill: "IfcEarthworksFill",
   IfcReinforcedSoil: "IfcReinforcedSoil",
  IfcFooting: "IfcFooting",
  IfcKerb: "IfcKerb",
  IfcMember: "IfcMember",
  IfcMooringDevice: "IfcMooringDevice",
  IfcNavigationElement: "IfcNavigationElement",
  IfcPavement: "IfcPavement",
  IfcPlate: "IfcPlate",
  IfcRail: "IfcRail",
  IfcRailing: "IfcRailing",
  IfcRamp: "IfcRamp",
  IfcRampFlight: "IfcRampFlight",
  IfcRoof: "IfcRoof",
  IfcShadingDevice: "IfcShadingDevice",
  IfcSlab: "IfcSlab",
  IfcStair: "IfcStair",
  IfcStairFlight: "IfcStairFlight",
  IfcTrackElement: "IfcTrackElement",
  IfcWall: "IfcWall",
   IfcWallStandardCase: "IfcWallStandardCase",
  IfcWindow: "IfcWindow",
 IfcCivilElement: "IfcCivilElement",
 IfcDistributionElement: "IfcDistributionElement",
  IfcDistributionControlElement: "IfcDistributionControlElement",
   IfcActuator: "IfcActuator",
   IfcAlarm: "IfcAlarm",
   IfcController: "IfcController",
   IfcFlowInstrument: "IfcFlowInstrument",
   IfcProtectiveDeviceTrippingUnit: "IfcProtectiveDeviceTrippingUnit",
   IfcSensor: "IfcSensor",
   IfcUnitaryControlElement: "IfcUnitaryControlElement",
  IfcDistributionFlowElement: "IfcDistributionFlowElement",
   IfcDistributionChamberElement: "IfcDistributionChamberElement",
   IfcEnergyConversionDevice: "IfcEnergyConversionDevice",
    IfcAirToAirHeatRecovery: "IfcAirToAirHeatRecovery",
    IfcBoiler: "IfcBoiler",
    IfcBurner: "IfcBurner",
    IfcChiller: "IfcChiller",
    IfcCoil: "IfcCoil",
    IfcCondenser: "IfcCondenser",
    IfcCooledBeam: "IfcCooledBeam",
    IfcCoolingTower: "IfcCoolingTower",
    IfcElectricGenerator: "IfcElectricGenerator",
    IfcElectricMotor: "IfcElectricMotor",
    IfcEngine: "IfcEngine",
    IfcEvaporativeCooler: "IfcEvaporativeCooler",
    IfcEvaporator: "IfcEvaporator",
    IfcHeatExchanger: "IfcHeatExchanger",
    IfcHumidifier: "IfcHumidifier",
    IfcMotorConnection: "IfcMotorConnection",
    IfcSolarDevice: "IfcSolarDevice",
    IfcTransformer: "IfcTransformer",
    IfcTubeBundle: "IfcTubeBundle",
    IfcUnitaryEquipment: "IfcUnitaryEquipment",
   IfcFlowController: "IfcFlowController",
    IfcAirTerminalBox: "IfcAirTerminalBox",
    IfcDamper: "IfcDamper",
    IfcDistributionBoard: "IfcDistributionBoard",
    IfcElectricDistributionBoard: "IfcElectricDistributionBoard",
    IfcElectricTimeControl: "IfcElectricTimeControl",
    IfcFlowMeter: "IfcFlowMeter",
    IfcProtectiveDevice: "IfcProtectiveDevice",
    IfcSwitchingDevice: "IfcSwitchingDevice",
    IfcValve: "IfcValve",
   IfcFlowFitting: "IfcFlowFitting",
    IfcCableCarrierFitting: "IfcCableCarrierFitting",
    IfcCableFitting: "IfcCableFitting",
    IfcDuctFitting: "IfcDuctFitting",
    IfcJunctionBox: "IfcJunctionBox",
    IfcPipeFitting: "IfcPipeFitting",
   IfcFlowMovingDevice: "IfcFlowMovingDevice",
    IfcCompressor: "IfcCompressor",
    IfcFan: "IfcFan",
    IfcPump: "IfcPump",
   IfcFlowSegment: "IfcFlowSegment",
    IfcCableCarrierSegment: "IfcCableCarrierSegment",
    IfcCableSegment: "IfcCableSegment",
    IfcConveyorSegment: "IfcConveyorSegment",
    IfcDuctSegment: "IfcDuctSegment",
    IfcPipeSegment: "IfcPipeSegment",
   IfcFlowStorageDevice: "IfcFlowStorageDevice",
    IfcElectricFlowStorageDevice: "IfcElectricFlowStorageDevice",
    IfcTank: "IfcTank",
   IfcFlowTerminal: "IfcFlowTerminal",
    IfcAirTerminal: "IfcAirTerminal",
    IfcAudioVisualAppliance: "IfcAudioVisualAppliance",
    IfcCommunicationsAppliance: "IfcCommunicationsAppliance",
    IfcElectricAppliance: "IfcElectricAppliance",
    IfcFireSuppressionTerminal: "IfcFireSuppressionTerminal",
    IfcLamp: "IfcLamp",
    IfcLightFixture: "IfcLightFixture",
    IfcLiquidTerminal: "IfcLiquidTerminal",
    IfcMedicalDevice: "IfcMedicalDevice",
    IfcMobileTelecommunicationsAppliance: "IfcMobileTelecommunicationsAppliance",
    IfcOutlet: "IfcOutlet",
    IfcSanitaryTerminal: "IfcSanitaryTerminal",
    IfcSignal: "IfcSignal",
    IfcSpaceHeater: "IfcSpaceHeater",
    IfcStackTerminal: "IfcStackTerminal",
    IfcWasteTerminal: "IfcWasteTerminal",
   IfcFlowTreatmentDevice: "IfcFlowTreatmentDevice",
    IfcDuctSilencer: "IfcDuctSilencer",
    IfcElectricFlowTreatmentDevice: "IfcElectricFlowTreatmentDevice",
    IfcFilter: "IfcFilter",
    IfcInterceptor: "IfcInterceptor",
 IfcElementAssembly: "IfcElementAssembly",
 //IfcElementComponent: "IfcElementComponent",
  IfcBuildingElementPart: "IfcBuildingElementPart",
  IfcDiscreteAccessory: "IfcDiscreteAccessory",
  IfcFastener: "IfcFastener",
  IfcImpactProtectionDevice: "IfcImpactProtectionDevice",
  IfcMechanicalFastener: "IfcMechanicalFastener",
  //IfcReinforcingElement: "IfcReinforcingElement",
   IfcReinforcingBar: "IfcReinforcingBar",
   IfcReinforcingMesh: "IfcReinforcingMesh",
   IfcTendon: "IfcTendon",
   IfcTendonAnchor: "IfcTendonAnchor",
   IfcTendonConduit: "IfcTendonConduit",
  IfcSign: "IfcSign",
  IfcVibrationDamper: "IfcVibrationDamper",
  IfcVibrationIsolator: "IfcVibrationIsolator",
 //IfcFeatureElement: "IfcFeatureElement",
  //IfcFeatureElementAddition: "IfcFeatureElementAddition",
   IfcProjectionElement: "IfcProjectionElement",
  //IfcFeatureElementSubtraction: "IfcFeatureElementSubtraction",
   IfcEarthworksCut: "IfcEarthworksCut",
   IfcOpeningElement: "IfcOpeningElement",
   IfcVoidingFeature: "IfcVoidingFeature",
  IfcSurfaceFeature: "IfcSurfaceFeature",
 IfcFurnishingElement: "IfcFurnishingElement",
  IfcFurniture: "IfcFurniture",
  IfcSystemFurnitureElement: "IfcSystemFurnitureElement",
 IfcGeographicElement: "IfcGeographicElement",
 //IfcGeotechnicalElement: "IfcGeotechnicalElement",
  //IfcGeotechnicalAssembly: "IfcGeotechnicalAssembly",
   IfcBorehole: "IfcBorehole",
   IfcGeomodel: "IfcGeomodel",
   IfcGeoslice: "IfcGeoslice",
  IfcGeotechnicalStratum: "IfcGeotechnicalStratum",
 //IfcTransportationDevice: "IfcTransportationDevice",
  IfcTransportElement: "IfcTransportElement",
  IfcVehicle: "IfcVehicle",
 IfcVirtualElement: "IfcVirtualElement",
IfcLinearElement: "IfcLinearElement",
 IfcAlignmentCant: "IfcAlignmentCant",
 IfcAlignmentHorizontal: "IfcAlignmentHorizontal",
 IfcAlignmentSegment: "IfcAlignmentSegment",
 IfcAlignmentVertical: "IfcAlignmentVertical",
//IfcPort: "IfcPort",
 IfcDistributionPort: "IfcDistributionPort",
//IfcPositioningElement: "IfcPositioningElement",
 IfcGrid: "IfcGrid",
 IfcLinearPositioningElement: "IfcLinearPositioningElement",
  IfcAlignment: "IfcAlignment",
 IfcReferent: "IfcReferent",
//IfcSpatialElement: "IfcSpatialElement",
 //IfcExternalSpatialStructureElement: "IfcExternalSpatialStructureElement",
  IfcExternalSpatialElement: "IfcExternalSpatialElement",
 //IfcSpatialStructureElement: "IfcSpatialStructureElement",
  IfcBuildingStorey: "IfcBuildingStorey",
  IfcFacility: "IfcFacility",
   IfcBridge: "IfcBridge",
   IfcBuilding: "IfcBuilding",
   IfcMarineFacility: "IfcMarineFacility",
   IfcRailway: "IfcRailway",
   IfcRoad: "IfcRoad",
  //IfcFacilityPart: "IfcFacilityPart",
   IfcBridgePart: "IfcBridgePart",
   IfcFacilityPartCommon: "IfcFacilityPartCommon",
   IfcMarinePart: "IfcMarinePart",
   IfcRailwayPart: "IfcRailwayPart",
   IfcRoadPart: "IfcRoadPart",
  IfcSite: "IfcSite",
  IfcSpace: "IfcSpace",
 IfcSpatialZone: "IfcSpatialZone",
//IfcStructuralActivity: "IfcStructuralActivity",
 //IfcStructuralAction: "IfcStructuralAction",
  IfcStructuralCurveAction: "IfcStructuralCurveAction",
   IfcStructuralLinearAction: "IfcStructuralLinearAction",
  IfcStructuralPointAction: "IfcStructuralPointAction",
  IfcStructuralSurfaceAction: "IfcStructuralSurfaceAction",
   IfcStructuralPlanarAction: "IfcStructuralPlanarAction",
 //IfcStructuralReaction: "IfcStructuralReaction",
  IfcStructuralCurveReaction: "IfcStructuralCurveReaction",
  IfcStructuralPointReaction: "IfcStructuralPointReaction",
  IfcStructuralSurfaceReaction: "IfcStructuralSurfaceReaction",
//IfcStructuralItem: "IfcStructuralItem",
 //IfcStructuralConnection: "IfcStructuralConnection",
  IfcStructuralCurveConnection: "IfcStructuralCurveConnection",
  IfcStructuralPointConnection: "IfcStructuralPointConnection",
  IfcStructuralSurfaceConnection: "IfcStructuralSurfaceConnection",
 //IfcStructuralMember: "IfcStructuralMember",
  IfcStructuralCurveMember: "IfcStructuralCurveMember",
   IfcStructuralCurveMemberVarying: "IfcStructuralCurveMemberVarying",
  IfcStructuralSurfaceMember: "IfcStructuralSurfaceMember",
   IfcStructuralSurfaceMemberVarying: "IfcStructuralSurfaceMemberVarying",
}

// name clash with native "class"
// code should be enum (distinction from nlsfb)
@jsonSchema
model Ifc5ClassComponent
{
    "ifc5:class": {
        code: IfcClassType;
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

// @todo we should really rename the 'def' key to 'kind'
@discriminator("def")
model Prim {
    name: string;
    type?: ClassType;
}

@jsonSchema
model Over extends Prim {
    def: "over";
    attributes: ComponentType;
}

@jsonSchema
model Def extends Prim {
    def: "def";
    children?: Def[];
    inherits?: reference[]; // optional but very rarely so, see (hello-wall WallMaterial)
}

@jsonSchema
model Class extends Prim {
    def: "class";
    type?: ClassType;
    name: string;
    children?: Def[];
}

@jsonSchema
model Ifc5File is Array<Prim | Disclaimer> {}
