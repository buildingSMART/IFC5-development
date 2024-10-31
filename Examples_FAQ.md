# IFC 5 examples 


## Disclaimer: Early Stage Examples

Please note that these examples are **preliminary** and represent a direction of working for IFC 5. 

## What you need to know

The current examples are:
- hello wall 
- Linear placement of signals

The folders contain:
- a SPFF file in either IFC 4 or IFC 4.3, shared as .ifc
- a JSON file, shared as .ifcx 
- some screenshot(s)

The files contain a couple of terms you need to know:
- The files contain a list of 'components'. You can recognize them because the start with  { and end with }.
- These components hold the data. These components can also be shared in multiple files, but also in one file. 
- The components can refer to 'children' and can 'inherit'. This is how you construct a tree. 
	- The tree structure for the Linear-placement is IfcProject (stationing) -> IfcSite (Default_Site_name) -> IfcRailWay (Default_Railway_name) -> IfcAlignment (Track_alignment) -> etc.
	- The tree structure for the Hello-Wall example is IfcProject (My_project) -> IfcSite (My_Site) -> IfcBuilding (My_Building) -> IfcBuildingStorey (My_Storey) -> etc.
- An implementation needs to 'compose' the scene from the available data.
- The 'originalStepInstance' is only in the examples to show the relation to the original SPFF file. There will not be STEP syntax in IFC 5.
- The field 'name' does  not represent a name, but something that is closer to a GUID.
- The examples use a lot of terms from openUSD. For example:
	- Class (https://openusd.org/release/glossary.html#class): something that is not positioned but can be instantiated. Similar to the 'Type' objects IFC 2x3 and 4.x have.
	- Def (https://openusd.org/release/glossary.html#def): a way to place / instantiate something.
	- Over (https://openusd.org/release/glossary.html#usdglossary-over): A way to 'overlay' data over other data. This is a way to extend/add data to objects of yourself and others.
	- Inherits (https://openusd.org/release/glossary.html#usdglossary-inherits): A way to add data to your object. 
	- UsdGeom.mesh (https://openusd.org/dev/api/class_usd_geom_mesh.html): Mesh geometry. These first examples will only focus on Meshes ('Reference View'). Alignment is supported with curves. More detailled geometry will follow later. 
	- Attributes (https://openusd.org/release/glossary.html#attribute): Not the same as IFC attributes. A way to add information to components.
	- Xform (https://openusd.org/release/api/class_usd_geom_xform.html): Mainly used for transformations.
   	- UsdShade:Material (https://openusd.org/dev/api/class_usd_shade_material.html): for Materials.
   	- UsdShade:Shader (https://openusd.org/dev/api/class_usd_shade_shader.html): for things like color.
- The 'hello-wall_add-firerating' file can be seen as a file from another author (actually every component can be authored by different people). By adding that file as a new 'layer' to the composition, the additional FireRating properties will provide the new value (while the original ones from the first author are also still in the original dataset). 
- This example only shows a very small  number of IFC Entities (project, site, building, alignment, railway, etc). The eventual IFC 5 schema will have more. 
- This example only shows a very small  number of IFC Properties (FireRating, IsExternal, etc). The eventual IFC 5 schema will have more. 
- This example only shows a very small  number of IFC Relations (RelatingSpace, RelatingElement, etc). The eventual IFC 5 schema will have more. 
- Materials still need a lot of work. 
- The 'hello-wall' example also contains references to non-IFC classes (21.21 in this example). References are now to bSDD published content, but are not restricted to bSDD.
- The 'hello-wall' example contains an example of a space boundary that is defined as an object insteaf of a relationship. The intent is to keep it that way in IFC 5.
- The examples do not have header information about author and version info yet. This will be added in a next itteration. 
- Opening the SPFF files may provide you information that is not relevant (predefinedType, etc). This is due to the viewer  following the IFC 4.x schema. Please ignore for this purpose.
- Units will be documented later.

There are .usda files available for these examples on request. Please contact technical@buildingsmart.org.

More documentation will follow soon. Also a rudimentary JSON Schema will be published soon.
We are actively working on enhancing these examples, addressing known issues. Contributions, feedback, and collaboration are welcome! If you would like to contribute or discuss the development of these examples, feel free to open an issue.
Next step in the development is to generate small assignments for people to explore. Next major milestone will be the Implementer Assembly in Budapest in February 2025 where an in-person hackathon will be organized. 
After that an API will be developed. 


