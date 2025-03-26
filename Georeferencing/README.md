@aothms, @janbrouwer, @rubendecuypere, thanks for the great discussions last week and thanks for picking back up the discussion in this PR.

I've given it quite some thought since then, and think there are several use cases we should keep in mind, but first some definitions...

## Definitions

### Coordinate System

A Coordinate System (CS) [[1]](https://en.wikipedia.org/wiki/Coordinate_system) is a system that uses one or more coordinates, to uniquely determine the position of points or other geometric elements within space. There are basically three Coordinate Systems of interest to Surveyors [[2]](https://www.buildingsmart.org/wp-content/uploads/2020/02/User-Guide-for-Geo-referencing-in-IFC-v2.0.pdf):

1. Cartesian: X, Y, Z
2. Ellipsoidal: Longitude, Latitude, Ellipsoid Height
3. Height: a 1D vertical Coordinate System

In IFC we want to exclusively use (2D or 3D) Cartesian Coordinate Systems for geometry.  

Or do we? Some field measurements could be done in geographic coordinates. We could enforce that these geographic coordinates must be converted to coordinates in a projected CRS first?

### Datum

A Datum [\[2,](https://www.buildingsmart.org/wp-content/uploads/2020/02/User-Guide-for-Geo-referencing-in-IFC-v2.0.pdf) [3\]](https://www.crs-geo.eu/definition-crs.htm) together with a Coordinate System makes a Coordinate **REFERENCE** System. The datum defines how a Coordinate System is related to the earth (position of the origin, the scale and the orientation of coordinate axes). A datum may be:

1. Geodetic: describes how a 2D Coordinate System is related to the earth.
2. Engineering: describes how an Engineering Coordinates System or Engineering Grid is related 
3. Vertical: the surface relative to which height is measured, see the section on heights below.

![image](https://github.com/user-attachments/assets/4a1510c2-aba6-444e-92be-659519300b6a)

### Coordinate Reference System

A Coordinate Reference System (CRS) [[3]](https://www.crs-geo.eu/definition-crs.htm) or Spatial Reference System (SRS) [[4]](https://en.wikipedia.org/wiki/Spatial_reference_system) is a framework used to precisely measure locations on Earth as coordinates.

A particular CRS, i.e. SRS specification comprises:

* Earth Ellipsoid (see definition below)
* Geodetic Datum
* Map Projection (except in the case of a geographic CRS)
* Origin Point
* Unit of Measurement

Types of CRS'es:

1. Geodetic CRS'es: CRS'es used to describe locations on the surface of the earth (except for the ECEF CRS, see d.). There are 4 types of geodetic CRS'es relevant to IFC:
  a. Geographic CRS'es: (Longitude, Latitude)
  b. Projected CRS'es: (Easting, Northing)
  c. Custom projected CRS'es defined for linear infrastructure projects: (Easting, Northing)
  d. The Earth Centered Earth Fixed (ECEF) or Geocentric CRS: a cartesian CRS that represents locations in the vicinity of the Earth (including its surface, interior, atmosphere, and surrounding outer space) as X, Y, and Z measurements from its center of mass.
2. Vertical CRS'es: 1D Coordinate Systems that measure height relative to a Vertical Datum. Usually either Ellipsoidal Height or Orthometric Height, see section on heights below.
3. Compound CRS'es: Geodetic CRS + Vertical CRS. For example Amersfoort / RD New + NAP height | [EPSG:7415](https://epsg.io/7415) = Amersfoort / RD New | [EPSG:28992](https://epsg.io/28992) + NAP height | [EPSG:5709](https://epsg.io/5709) or see the example in [IfcCoordinateReferenceSystem](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcCoordinateReferenceSystem.htm).
4. Engineering CRS'es: a georeferenced Engineering Coordinate System, which very often will actually be a compound CRS, because most engineering models nowadays have 3D geometry, meaning that the Engineering CS has X, Y and Z coordinates and therefore also has heights.

### Georeferencing

In our case I'd define Georeferencing as binding an Engineering CS to a Geodetic (+ Vertical) Datum, thereby defining the Engineering Datum, such that the Engineering Coordinate System becomes an Engineering Coordinate Reference System, i.e. Spatial Reference System.

Once an Engineering Coordinate System is georeferenced, every location in engineering coordinates is linked to a location on earth.

## The 1M$ Question

How do we georeference an Engineering Coordinate System?  
That is, how do we define an Engineering Datum such that Engineering CS → Engineering CRS, through which every location in engineering coordinates is linked to a location on earth?

As I understand it, there are at least three ways to georeference an Engineering CS:

1. Georeferencing to the WGS84 | [EPSG:4326](https://epsg.io/4326) Geographic CRS, by defining the following for the Engineering CS origin (This is what you have to do in Rhino, SketchUp and Revit. In these software there is no way to georeference with a Projected CRS.):
  a. Longitude
  b. Latitude
  c. Vertical Datum (for WGS84 | EPSG:4326 the vertical datum is the WGS84 ellipsoid, so vertical datum not relevant in case Ellipsoidal Height is given)
  d. "Height"
  e. Angle between Y-axis of the Engineering CS and "True" North, i.e. Geographic North
2. Georeferencing to a Projected or Compound (Projected + Vertical) CRS, e.g. Amersfoort / RD New + NAP height | [EPSG:7415](https://epsg.io/7415) by defining the following for the Engineering CS origin ([IfcMapConversion](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcMapConversion.htm)):
  a. Geodetic Projected CRS
  b. Easting
  c. Northing
  d. Vertical Datum
  e. Orthogonal height relative to the specified Vertical Datum
  f. Angle between the Y-axis of the Engineering CS and the Grid North of the used Geodetic Projected CRS = X Axis Abscissa + X Axia Ordinate
  g. Scale
3. Georeferencing to a Projected | Compound (Projected + Vertical) CRS using two or more survey points, for which the coordinates in both the Projected | Compound CRS as well as in the Engineering CS are known. Using these survey points, the values from method 2. can be calculated. This is the method described in the "User Guide for Geo-referencing in IFC" [[2]](https://www.buildingsmart.org/wp-content/uploads/2020/02/User-Guide-for-Geo-referencing-in-IFC-v2.0.pdf.
4. Any other methods?

To answer the 1M$ Question, I think we should keep multiple use cases in mind. From "Simple" to "Complicated":

1. An architect creates a model and georeferences it using method 1.
2. A project with models in an Engineering CS and data in a Projected | Compound CRS, e.g. cadastre, geotech, ground models, etc.
3. A project with multiple Engineering CS'es and other data in a Projected | Compound CRS, e.g. a railway project with:
  a. Railway alignment in Projected | Compound CRS
  b. Cadastre + Geotech + other data in Projected | Compound CRS
  c. Train station (F) in Engineering CS (F)
  d. A Bridge somewhere along the railway alignment in Engineering CS (B)
  e. Train station (G) in Engineering CS (G)
4. A project with multiple Engineering CS'es and multiple Projected | Compound CRS'es, e.g. a very long railway. For very long linear infrastructure one has to either use different Projected | Compound CRS'es for different parts of the railway (Zone 30 for red part of alignment, Zone 31 for orange part of alignment), or create a project specific Geodetic Projected | Compound CRS (green box). In the latter case one would still have to work with multiple Projected | Compound CRS'es, because for one geotechnical data will be supplied in Projected | Compound CRS coordinates.
  
![image](https://github.com/user-attachments/assets/920e2666-adfa-4a2d-a422-0243f77230a3)

5. An asset manager that has a portfolio of assets all around the world, including projects of all types described above.

## Transformation Matrices

A transformation implies that you transform from one CRS to another CRS.

These transformations can be defined for use cases 2, 3 and possibly for use case 4 as well, in case we are smart about how we require people to structure such projects and assign CRS objects.

For use case 1 - using method 1 for georeferencing - it is not possible to define a transformation that "dumb" BIM viewer can use, because **TO** what CRS would you like to define the transformation? No projected CRS is defined, so it's also not possible to define a transformation matrix, right?

For use case 5 I think it's evident that defining transformations would become "crazy", because there would be too many possible transformations and also non-sensible transformations, because one should not want to transform a road in a Projected CRS in Mexico to a road in a Projected CRS in Spain => too much distortion.

Would it make sense to include transformation matrices to non-projected geodetic CRS'es, e.g. to WGS84 and / or ECEF?  
What coordinates are used by web mapping software?  
Most work with GeoJSON, right? So, according to GeoJSON's spec, the coordinates of this geometry should then all be in WGS84 (Lon, Lat, Ellipsoidal Height), right?  
But then Cesium.js is famous for using the ECEF CRS, so maybe include both a transformation matrix to WGS84 and ECEF?  
But then are these software able do something with these transformation matrices, or maybe they're not necessary, because these web mapping software should be able to calculate these transformation matrices themselves based on the WKT-CRS strings? Or would that be slow / unhandy?

## An Important Part of the Solution: **WKT-CRS**

Well-known text representation of coordinate reference systems (WKT or WKT-CRS) [[5]](https://en.wikipedia.org/wiki/Well-known_text_representation_of_coordinate_reference_systems) is an ISO standardized text markup language for representing CRS'es. So, ALL CRS'es - including Engineering CRS'es - can be represented with a WKT-CRS string and then software such as [PROJ](https://proj.org/en/stable/) can be used to calculate the transformation between ANY two CRS'es.

## Definitions continued...

### Earth Ellipsoid

An Earth ellipsoid [[6]](https://en.wikipedia.org/wiki/Earth_ellipsoid) or Earth spheroid is a mathematical figure approximating the Earth's form, used as a reference frame for computations in geodesy, geosciences and ofc civil engineering...

### Geoid

The geoid [[7]](https://en.wikipedia.org/wiki/Geoid) is the shape that the ocean surface would take under the influence of the gravity of Earth, including gravitational attraction and Earth's rotation, if other influences such as winds and tides were absent.

ATTENTION: Geoid ≠ Mean Sea Level [[8]](https://en.wikipedia.org/wiki/Sea_level) due to differences in sea water density (mainly due to temperature differences), tides, currents and weather. The permanent deviation between the geoid and mean sea level is called ocean surface topography [[7]](https://en.wikipedia.org/wiki/Geoid).

### Height on Earth

Heights as most people think of them, are usually defined by an equipotential gravity field. Or more simply, two heights are the same if water will not flow between them. One height is greater than another if water flows from one to the other. Gravity is what determines how water flows, so the definition of equal heights is defined by gravity [[2]](https://www.buildingsmart.org/wp-content/uploads/2020/02/User-Guide-for-Geo-referencing-in-IFC-v2.0.pdf). Therefore, heights are usually measured relative to the geoid. This height is called the orthometric height.

The height relative to the Earth Ellipsoid is called the Ellipsoidal Height.

![HeightsOnEarth](https://github.com/user-attachments/assets/6f6160cb-942f-4463-95d9-15b51974ab61)

## Conclusion

Well, that was quite the story...

Please let me know if anything is unclear, forgot anything, got any definitions wrong, incomplete or whatever and please let me know what you think about this story and my questions.

Have fun! 🌍🌎🌏

## References

1. https://en.wikipedia.org/wiki/Coordinate_system
2. https://www.buildingsmart.org/wp-content/uploads/2020/02/User-Guide-for-Geo-referencing-in-IFC-v2.0.pdf
3. https://www.crs-geo.eu/definition-crs.htm
4. https://en.wikipedia.org/wiki/Spatial_reference_system
5. https://en.wikipedia.org/wiki/Well-known_text_representation_of_coordinate_reference_systems
6. https://en.wikipedia.org/wiki/Earth_ellipsoid
7. https://en.wikipedia.org/wiki/Geoid
8. https://en.wikipedia.org/wiki/Sea_level
