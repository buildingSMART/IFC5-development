# Hello Wall: the space's predefined type as a class

In `hello-wall.ifc` the space has `PredefinedType = SPACE`. In `hello-wall.ifcx` its `bsi::ifc::class` is `IfcSpace`,
and `SPACE` survives only inside `customdata.originalStepInstance`, as the original STEP line.

`hello-wall-add-space-predefined-type.ifcx` is a layer, like the fire-rating ones, that sets the space's `bsi::ifc::class` to
`IfcSpaceSPACE`, the bSDD class for that predefined type. This is the form `PCERT-Sample-Scene` already uses
(`IfcBridgePartPIER`, `IfcRoadPartSHOULDER`, ...). Load it on top of `hello-wall.ifcx`.
