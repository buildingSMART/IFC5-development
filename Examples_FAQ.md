# IFC 5 examples 


## Disclaimer: Alpha Stage Examples

Please note that these examples are **preliminary** and will be updated. 

## What you need to know

The current examples are:
- Hello wall 
- Linear placement of signals

The folders contain:
- a SPFF file in either IFC 4 or IFC 4.3, shared as .ifc
- a JSON file, shared as .ifcx 
- some screenshot(s)

The files contain a couple of terms you need to know:
- The files contain a list of 'objects'. You can recognize them because the start with  { and end with }.
- These objects hold the data. These components can also be shared in multiple files, but also in one file. 
- The components can refer to 'children' and can 'inherit'. This is how you construct a tree. 
	- The tree structure for the Linear-placement is IfcProject (stationing) -> IfcSite (Default_Site_name) -> IfcRailWay (Default_Railway_name) -> IfcAlignment (Track_alignment) -> etc.
	- The tree structure for the Hello-Wall example is IfcProject (My_project) -> IfcSite (My_Site) -> IfcBuilding (My_Building) -> IfcBuildingStorey (My_Storey) -> etc.
- An implementation needs to 'compose' the scene from the available data.
- The 'originalStepInstance' is only in the examples to show the relation to the original SPFF file. There will not be STEP syntax in IFC 5.
- The 'add-firerating' file can be seen as a file from another author (actually every component can be authored by different people). By adding that file as a new 'layer' to the composition, the additional FireRating properties will provide the new value (while the original ones from the first author are also still in the original dataset). 
- This example only shows a very small number of IFC Entities (project, site, building, alignment, railway, etc). The eventual IFC 5 schema will have more. 
- This example only shows a very small number of IFC Properties (FireRating, IsExternal, etc). The eventual IFC 5 schema will have more. 
- This example only shows a very small number of IFC Relations (RelatingSpace, RelatingElement, etc). The eventual IFC 5 schema will have more. 
- The 'hello-wall' example also contains references to non-IFC classes (21.21 in this example). References are now to bSDD published content, but are not restricted to bSDD.
- The 'hello-wall' example contains an example of a space boundary that is defined as an object insteaf of a relationship. The intent is to keep it that way in IFC 5.
- Opening the SPFF files may provide you information that is not relevant (predefinedType, etc). This is due to the viewer  following the IFC 4.x schema. Please ignore for this purpose.
- Units will be documented later.

More documentation will follow soon. 
We are actively working on enhancing these examples, addressing known issues. Contributions, feedback, and collaboration are welcome! If you would like to contribute or discuss the development of these examples, feel free to open an issue.



