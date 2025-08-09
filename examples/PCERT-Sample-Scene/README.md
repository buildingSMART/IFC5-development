# PCERT-Sample-Scene – IFC5 example

## Overview

This directory contains a set of **IFC5 (`.ifcx`)** demo models based on the _PCERT Sample Scene_ in IFC5 format (see the original [IFC4.3 files](<https://github.com/buildingSMART/Sample-Test-Files/tree/main/IFC%204.3.2.0%20(IFC4X3_ADD2)/PCERT-Sample-Scene>)).

These models demonstrate the modular and extensible capabilities of IFC5, with a focus on multi-disciplinary collaboration and classification integration.

The demo set is organized into two domains:

### Building Models

- Building-Architecture.ifcx
- Building-Hvac.ifcx
- Building-Landscaping.ifcx
- Building-Structural.ifcx

### Infrastructure Models

- Infra-Bridge.ifcx
- Infra-Electrical.ifcx
- Infra-Landscaping.ifcx
- Infra-Plumbing.ifcx
- Infra-Rail.ifcx
- Infra-Road.ifcx

Each file represents a discipline-specific model, allowing for modular loading and data layering.

## Classification Files

Two additional `.ifcx` files contain extended classification data referencing standards from the buildingSMART Data Dictionary (bSDD):

- cci@v1.ifcx – Construction Classification International  
   [bSDD URI](https://search.bsdd.buildingsmart.org/uri/molio/cciconstruction/1.0)
- fruitvegs@v1.6.ifcx – Fruit and Vegetables Classification  
   [bSDD URI](https://search.bsdd.buildingsmart.org/uri/bs-agri/fruitvegs/1.6)

These files include:

- Schema definitions for each classification
- Element-level classification data
- Can be loaded alongside models to enrich semantic context

## Model Structure and Decomposition

### Shared Site and Hexagon Tiles

When opening any of the building or infrastructure models, you will see a combined decomposition hierarchy. All models share the same main site, and each model includes a site for every hexagon tile relevant to that discipline. This allows for seamless merging and navigation across models.

### Examples

The Building-Hvac model contains only the elements from the distribution system for the fireplace, but these are integrated into the overall building decomposition, so you see them in context with the rest of the building.

Another example is the Building-Landscaping model, which contains a park with apple trees. Each tree instance contains nested apple instances, demonstrating deep hierarchical nesting within the existing decomposition.

### Classification Integration

When the CCI classification file is active, you will notice the tree is also classified as a CCI Tree. When the Fruits and Vegetables classification is active, all apples are classified as an Apple.

### Instance, Type, Geometry, and Quantity Structure

Every instance in the model inherits from a type definition that contains all attributes and properties. Geometries are children of the instance, and quantities are assigned directly to the instance. This approach supports possible instance-level scaling and ensures that all relevant data is accessible at the instance level.

## How to Use

To view and interact with the models:

1. Open the [buildingSMART IFC5 Viewer](https://ifc5.technical.buildingsmart.org/viewer/)
2. Open `.ifcx` files from the [IFC5-development repository](https://github.com/buildingSMART/IFC5-development)
3. Explore:
   - 3D Model View
   - Model Tree
   - Element Data

## Viewer Tips

- Select objects in the 3D view
- Locate them in the model tree
- Select the parent object to view full data (not the geometry object from the selection)
