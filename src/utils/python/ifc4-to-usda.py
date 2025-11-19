import collections
import itertools
import json
import os
import re
import shutil
import subprocess
import sys
import pyvista as pv
                    
import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.guid
import numpy as np

S = ifcopenshell.geom.settings(WELD_VERTICES=False, DIMENSIONALITY=2)

USD_HOME = os.environ['USD_HOME']
sys.path.extend((rf'{USD_HOME}\lib\python', rf'{USD_HOME}\pip-packages'))
os.environ['PATH'] += ''.join(map(lambda s: f';{s}', map(os.path.abspath, (rf'{USD_HOME}\bin', rf'{USD_HOME}\plugin\usd', rf'{USD_HOME}\lib'))))
os.environ['PLUG_INFO_LIBRARY_PATH'] = os.path.abspath('schema/ifc5')
os.environ['PLUG_INFO_RESOURCE_PATH'] = os.path.abspath('schema/ifc5')

subprocess.call([rf'{USD_HOME}\scripts\usdGenSchema.bat', 'schema.usd'], cwd='schema/ifc5', shell=True)

with open('schema/ifc5/plugInfo.2.json', 'w') as g:
    with open('schema/ifc5/plugInfo.json', 'r') as f:
        for i in range(3):
            g.write(f.readline())
        d = json.load(f)
        d['Plugins'][0]['LibraryPath'] = os.path.abspath('schema/ifc5')
        d['Plugins'][0]['ResourcePath'] = os.path.abspath('schema/ifc5')
        json.dump(d, g, indent=4)

shutil.move('schema/ifc5/plugInfo.2.json', 'schema/ifc5/plugInfo.json')

existing_paths = os.getenv('PXR_PLUGINPATH_NAME', '')
os.environ['PXR_PLUGINPATH_NAME'] = os.pathsep.join((os.path.abspath('schema/ifc5'), existing_paths))

from pxr import Usd, UsdGeom, Vt, Gf, Sdf, UsdShade

fn, ofn = sys.argv[1:]

f = ifcopenshell.open(fn)

if os.path.basename(fn) == 'linear-placement-of-signal.ifc':
    # remove footprint representation
    f.remove(f[2697])

    # move enormous point offsets a bit closer
    M = np.array([i[0] for i in f.by_type('IfcCartesianPoint') if i[0][0] > 10000]).min(axis=0)
    for i in f.by_type('IfcCartesianPoint'):
        if i[0][0] > 10000:
            i[0] = (np.array(i[0]) - M).tolist()

elif os.path.basename(fn) == 'bonsai-wall.ifc':
    # we don't want the containment rel to dominate over the void-fill rel
    for rel in f.by_type('IfcRelContainedInSpatialStructure'):
        rel.RelatedElements = [a for a in rel.RelatedElements if a.is_a() not in ('IfcDoor', 'IfcWindow')]


    def get_placement_x(w):
        return ifcopenshell.ifcopenshell_wrapper.map_shape(
            ifcopenshell.geom.settings(),
            w.ObjectPlacement.wrapped_data).components[0][3]

    # create space boundaries
    # in this case we just take the loops of the wall face
    wall, space = f.by_type('IfcWall')[0], f.by_type('IfcSpace')[0]
    wall_geom = ifcopenshell.geom.create_shape(ifcopenshell.geom.settings(USE_WORLD_COORDS=True, TRIANGULATION_TYPE=2), wall) 
    space_geom = ifcopenshell.geom.create_shape(ifcopenshell.geom.settings(USE_WORLD_COORDS=False, TRIANGULATION_TYPE=2), space)
    space_place = np.array(space_geom.transformation.matrix).reshape((4,4)).T
    space_place_inverted = np.linalg.inv(space_place)
    windows = sorted(f.by_type('IfcWindow'), key=get_placement_x)

    vs = np.array(wall_geom.geometry.verts).reshape((-1, 3))
    vs = np.concatenate((vs, np.ones((len(vs),1))), axis=1)
    vs = np.array([space_place_inverted @ v for v in vs])

    def create_boundary(elem, indices):
        return f.createIfcRelSpaceBoundary(
            ifcopenshell.guid.new(),
            RelatingSpace=space,
            RelatedBuildingElement=elem,
            ConnectionGeometry=f.createIfcConnectionSurfaceGeometry(
                # @nb deprecated, doesn't matter
                SurfaceOnRelatingElement=f.createIfcFaceBasedSurfaceModel(
                    [f.createIfcOpenShell([
                        f.createIfcFace([
                            f.createIfcFaceOuterBound(
                                f.createIfcPolyLoop(
                                    list(map(f.createIfcCartesianPoint, vs[list(indices)][:,0:3].tolist()))
                                ),
                                True
                            )
                        ])
                    ])]
                )
            )
        )

    for fa in [bs for bs in wall_geom.geometry.faces if len(bs) == 3]:
        print(*vs[list(sum(fa, ()))][:,1])
        if np.allclose(vs[list(sum(fa, ()))][:,1], 0.0, 1.e-5, 1.e-5):
            outer = fa[0]
            create_boundary(wall, outer)
            inner = sorted(map(list, map(reversed, fa[1:])), key=lambda tup: np.average(vs[tup], axis=0)[0])
            for w, lp in zip(windows, inner):
                create_boundary(w, lp)

if os.path.basename(fn).startswith("bonsai-wall"):
    import ifcopenshell.api.pset
    pset = ifcopenshell.api.pset.add_pset(f, product=f.by_type('IfcBuildingElement')[0], name="Pset_WallCommon")
    ifcopenshell.api.pset.edit_pset(f,
        pset=pset, properties={"IsExternal": "True"}
    )
    pset.DefinesOccurrence[0].RelatedObjects = f.by_type('IfcBuildingElement')

stage = Usd.Stage.CreateNew(ofn)
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)

# relationships to follow to build placement tree
inverses = [
    ('Declares', 'RelatedDefinitions'),
    ('IsNestedBy', 'RelatedObjects'),
    ('IsDecomposedBy', 'RelatedObjects'),
    ('HasOpenings', 'RelatedOpeningElement'), #| @todo:
    ('HasFillings', 'RelatedBuildingElement'),#| merge
    ('Positions', 'RelatedProducts'),
    ('ContainsElements', 'RelatedElements'),
]


# Create globally unique names and remember name given to entity instance
names = set()
name_mapping = {}

def get_name(el):
    if el in name_mapping:
        return name_mapping[el]
    n = el.Name or f'Unnamed {el.is_a()[3:]}'
    
    postfix = 0
    while True:
        unique_name = n + (f' {postfix:03d}' if postfix else '')
        if re.sub(r'[^a-zA-Z0-9]', '_', unique_name) not in names:
            break
        postfix += 1
        
    unique_name = re.sub(r'[^a-zA-Z0-9]', '_', unique_name)

    names.add(unique_name)
    name_mapping[el] = unique_name

    return unique_name


# Write converted placement as USD xform
def write_placement(pl, prim):
    M4 = ifcopenshell.ifcopenshell_wrapper.map_shape(S, pl.wrapped_data)
    if not M4.is_identity():
        UsdGeom.Xform(prim).AddTransformOp().Set(Gf.Matrix4d((np.array(M4.components).T)))

# Tesselate geometries
geometries = {}
object_to_geom = collections.defaultdict(list)

for geom in ifcopenshell.geom.iterate(S, f):
    vs = np.array(geom.geometry.verts).reshape((-1, 3))
    idxs = np.array(geom.geometry.faces).reshape((-1, 3))
    eds = np.array(geom.geometry.edges).reshape((-1, 2))

    if geom.context == 'Body' and ((vs[:,2].max() - vs[:,2].min()) < 1.e-5):
        continue
    
    geometries[geom.geometry.id] = (geom.context, vs, idxs, eds)
    object_to_geom[f[geom.id]].append(geom.geometry.id)

shared_geometries = set(k for k, v in collections.Counter(itertools.chain.from_iterable(object_to_geom.values())).items() if v > 1)

def write_geom_2(xf, ctx, vs, idxs, eds, override=None):
    path1 = xf.GetPath().pathString + f"/{ctx}"
    path2 = "/" + xf.GetPath().pathString.split('/')[-1] + f"_{ctx}"

    if idxs.size:
        # mesh = UsdGeom.Mesh.Define(stage, path2)
        prim = stage.CreateClassPrim(path2)
        prim.SetTypeName("Mesh")
        mesh = UsdGeom.Mesh(prim)
        mesh.GetPointsAttr().Set(Vt.Vec3fArray(vs.tolist()))
        mesh.GetFaceVertexIndicesAttr().Set(Vt.IntArray(idxs.flatten().tolist()))
        mesh.GetFaceVertexCountsAttr().Set(Vt.IntArray([3] * len(idxs)))
    else:
        vs2, mapping = np.unique(vs, axis=0, return_inverse=True)
        mm = mapping[eds].flatten()
        mmm = mm[np.concatenate((np.diff(mm) != 0, (True,)))]

        # line = UsdGeom.BasisCurves.Define(stage, path2)
        prim = stage.CreateClassPrim(path2)
        prim.SetTypeName("BasisCurves")
        line = UsdGeom.BasisCurves(prim)
        line.GetPointsAttr().Set(Vt.Vec3fArray(vs2[mmm].tolist()))
        line.GetCurveVertexCountsAttr().Set(Vt.IntArray([len(mmm)]))
        line.GetTypeAttr().Set(UsdGeom.Tokens.linear)
        line.GetWidthsAttr().Set(Vt.FloatArray([0.01] * len(mmm)))

    # mesh / line is the classdef in global namespace,
    # ref below is the concrete instantiation within the parent
    ref = getattr(UsdGeom, "Mesh" if idxs.size else "BasisCurves").Define(stage, path1)
    ref.GetPrim().GetInherits().AddInherit(path2)

    if override == "Void":
        UsdGeom.Imageable(prim).GetVisibilityAttr().Set('invisible')

def write_geom(el, xf, override=None, istype=False):
    for gid in object_to_geom[el]:
        if not istype and gid in shared_geometries:
            continue
        ctx, vs, idxs, eds = geometries[gid]

        if override:
            ctx = override

        write_geom_2(xf, ctx, vs, idxs, eds, override)

visited = set()
types = collections.defaultdict(list)

def getSdfType(v):
    if isinstance(v, tuple) and set(map(type, v)) == {float}:
        return Sdf.ValueTypeNames.Point3d
    elif isinstance(v, float):
        return Sdf.ValueTypeNames.Float
    elif isinstance(v, str):
        return Sdf.ValueTypeNames.String
    elif isinstance(v, bool):
        return Sdf.ValueTypeNames.Bool
    elif isinstance(v, int):
        return Sdf.ValueTypeNames.Int
    else:
        breakpoint()

# build tree as parent->child references instead of nested tree
FLATTEN_TREE=True

def fmt_guid(g):
    return 'N' + ifcopenshell.guid.expand(g)

created_nodes = {}

# traverse from project
def process(el, path=(), parentPath=None, asclass=False):
    if os.path.basename(fn) == 'domestic-hot-water.ifc' and el.is_a('IfcWall'):
        return

    if el in visited:
        return
    visited.add(el)

    xf = None
    xf2 = None
    path_str = None
    if el.is_a('IfcOpeningElement'):
        pass
    else:
        print(' '*len(path), el)
        path = path + (get_name(el),)
        path_str = "/" + "/".join(path)
        
        if FLATTEN_TREE:
            path_str = f"/{fmt_guid(el.GlobalId)}"

        if asclass:
            xf = stage.CreateClassPrim(Sdf.Path(path_str))
            xf.SetTypeName('Xform')
        elif parentPath is None:
            xf = stage.CreateClassPrim(Sdf.Path(path_str))
            xf.SetTypeName('Xform')
            # define prim for root
            root = UsdGeom.Xform.Define(stage, "/" + "/".join(path))
            root.GetPrim().GetInherits().AddInherit(path_str)
        else:
            xf = stage.CreateClassPrim(Sdf.Path(path_str))
            xf.SetTypeName('Xform')

        created_nodes[el] = xf

        xf.CreateAttribute('customdata:originalStepInstance', Sdf.ValueTypeNames.String).Set(str(el))

        if not el.is_a('IfcPropertySet'):
            xf.CreateAttribute('ifc5:class:uri', Sdf.ValueTypeNames.String).Set(f'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/{el.is_a().replace("Type", "")}')
            xf.CreateAttribute('ifc5:class:code', Sdf.ValueTypeNames.String).Set(el.is_a().replace("Type", ""))

        if el.is_a('IfcWall'):
            xf.CreateAttribute('nlsfb:class:uri', Sdf.ValueTypeNames.String).Set(f'https://identifier.buildingsmart.org/uri/nlsfb/nlsfb2005/2.2/class/21.21')
            xf.CreateAttribute('nlsfb:class:code', Sdf.ValueTypeNames.String).Set('21.21')

        if el.is_a('IfcProduct') and el.ObjectPlacement:
            write_placement(el.ObjectPlacement.RelativePlacement, xf)

        if el.is_a('IfcDistributionPort'):
            if fd := el.FlowDirection:
                xf.CreateAttribute('ifc5:system:flowDirection', Sdf.ValueTypeNames.String).Set(fd)

        if el in object_to_geom:
            write_geom(el, xf)

        if getattr(el, 'FillsVoids', ()):
            write_geom(el.FillsVoids[0].RelatingOpeningElement, xf, override='Void')
            write_placement(el.FillsVoids[0].RelatingOpeningElement.ObjectPlacement.RelativePlacement, xf)

        for ty in types[el]:
            xf.GetPrim().GetInherits().AddInherit(ty)

        if getattr(el, 'Representation', None):
            for r in [r for r in el.Representation.Representations if r.RepresentationIdentifier == 'Body']:
                if os.path.basename(fn) == 'georeferenced-bridge-deck.ifc':
                    shp = ifcopenshell.geom.create_shape(ifcopenshell.geom.settings(USE_WORLD_COORDS=True), el)
                    xs,ys,zs = np.array(shp.geometry.verts).reshape((-1, 3)).T
                    for i, x in enumerate((xs.min(), xs.max())):
                        prim = stage.CreateClassPrim(f"/refpoint{i}")
                        prim.SetTypeName("Points")
                        pointclass = UsdGeom.Points(prim)
                        pointclass.GetPointsAttr().Set(Vt.Vec3fArray([(0., 0., 0.)]))
                        pointdef = UsdGeom.Points.Define(stage, xf.GetPath().pathString + f"/ReferencePoint{i}")
                        pointdef.GetPrim().GetInherits().AddInherit(pointclass.GetPath())

                        mapc = f.by_type('IfcMapConversion')[0]

                        crs2d = mapc.TargetCRS.Name
                        crsh = mapc.TargetCRS.VerticalDatum

                        M4 = np.eye(4)
                        xyz = (x, 0., zs.min())
                        M4[0:2,3] = xyz[0:2]

                        UsdGeom.Xform(prim).AddTransformOp().Set(Gf.Matrix4d((M4.T)))

                        the = np.arctan2(mapc.XAxisAbscissa, mapc.XAxisOrdinate)
                        scm = np.zeros((3, 3))
                        np.fill_diagonal(scm, mapc.Scale or 1)
                        rot = np.array([
                            [np.cos(the), -np.sin(the), 0],
                            [np.sin(the), -np.cos(the), 0],
                            [0,0,1]
                        ])
                        e,n,h = (rot @ scm @ xyz + (mapc.Eastings, mapc.Northings, mapc.OrthogonalHeight))

                        from pyproj import Transformer
                        to_latlon = Transformer.from_crs("EPSG:32610", "EPSG:4326")
                        lat, lon = to_latlon.transform(e,n,h)[0:2]

                        prim.CreateAttribute(f'{crs2d.lower().replace(":", "")}:eastings', Sdf.ValueTypeNames.Double).Set(e)
                        prim.CreateAttribute(f'{crs2d.lower().replace(":", "")}:northings', Sdf.ValueTypeNames.Double).Set(n)
                        prim.CreateAttribute(f'{crsh.lower().replace(":", "")}:height', Sdf.ValueTypeNames.Double).Set(h)
                        prim.CreateAttribute(f'epsg4326:latitude', Sdf.ValueTypeNames.Double).Set(lat)
                        prim.CreateAttribute(f'epsg4326:longitude', Sdf.ValueTypeNames.Double).Set(lon)

                if r.Items[0].is_a('IfcExtrudedAreaSolid') and os.path.basename(fn) == 'bonsai-wall.ifc':
                    B = ifcopenshell.ifcopenshell_wrapper.map_shape(ifcopenshell.geom.settings(), r.Items[0].wrapped_data)
                    V = np.array(B.direction.components) * B.depth
                    # @nb does not work for trimmed curves like this
                    Ps = np.array([e.start.components for e in B.basis[0].children])

                    line_points = np.array([
                        Ps.min(axis=0),
                        Ps.min(axis=0) + V
                    ])
                    
                    prim = stage.CreateClassPrim(xf.GetPath().pathString + "_Directrix")
                    prim.SetTypeName("BasisCurves")
                    lineclass = UsdGeom.BasisCurves(prim)

                    lineclass.GetPointsAttr().Set(Vt.Vec3fArray(line_points.tolist()))
                    lineclass.GetCurveVertexCountsAttr().Set(Vt.IntArray([2]))
                    lineclass.GetTypeAttr().Set(UsdGeom.Tokens.linear)
                    lineclass.GetWidthsAttr().Set(Vt.FloatArray([0.01] * len(line_points)))
                    linedef = UsdGeom.BasisCurves.Define(stage, xf.GetPath().pathString + "/Directrix")
                    linedef.GetPrim().GetInherits().AddInherit(lineclass.GetPath())

                    prim = stage.CreateClassPrim(xf.GetPath().pathString + "_Basis")
                    prim.SetTypeName("Mesh")
                    basisclass = UsdGeom.Mesh(prim)

                    if True:
                        # triangulate basis
                        pd = pv.PolyData(Ps, [len(Ps), *range(len(Ps))]).triangulate()
                        ps = pd.points.tolist()
                        fs = pd.faces.reshape((-1, 4))[:,1:].flatten().tolist()

                        basisclass.GetPointsAttr().Set(Vt.Vec3fArray(ps))
                        basisclass.GetFaceVertexIndicesAttr().Set(Vt.IntArray(fs))
                        basisclass.GetFaceVertexCountsAttr().Set(Vt.IntArray([3 for _ in range(len(fs))]))
                    else:
                        basisclass.GetPointsAttr().Set(Vt.Vec3fArray(Ps.tolist()))
                        basisclass.GetFaceVertexIndicesAttr().Set(Vt.IntArray(np.arange(len(Ps)).tolist()))
                        basisclass.GetFaceVertexCountsAttr().Set(Vt.IntArray([len(Ps)]))
                    basisdef = UsdGeom.Mesh.Define(stage, xf.GetPath().pathString + "/Basis")
                    basisdef.GetPrim().GetInherits().AddInherit(basisclass.GetPath())

        if el.is_a('IfcAlignmentSegment'):
            args = el.DesignParameters.get_info(recursive=True, include_identifier=False)
            args.pop('type')
            for k, v in args.items():
                if v is not None:
                    if isinstance(v, dict):
                        v.pop('type')
                        v = next(iter(v.values()))
                    xf.GetPrim().CreateAttribute(f'ifc5:{el.DesignParameters.is_a()[3:]}:{k}', getSdfType(v)).Set(
                        (v + (0.,)) if isinstance(v, tuple) and set(map(type, v)) == {float} else v
                    )

    for attr_name, other_end in inverses:
        for rel in getattr(el, attr_name, ()):
            children = getattr(rel, other_end)
            if isinstance(children, ifcopenshell.entity_instance):
                children = [children]
            emitted = []
            for child in children:
                xf2 = process(child, path, parentPath=path_str or parentPath)
                emitted.append(xf2)
                if xf2 is not None and path_str and FLATTEN_TREE:
                    if child.is_a('IfcOpeningElement'):
                        child = child.HasFillings[0].RelatedBuildingElement
                    print(path_str, '->', xf2.GetPath().pathString + f"/{get_name(child)}")
                    stage.DefinePrim(path_str + f"/{get_name(child)}").GetInherits().AddInherit(xf2.GetPath())
            if attr_name == 'IsNestedBy' and el.is_a('IfcLinearElement') and not el.is_a('IfcAlignment'):
                xf.GetPrim().ApplyAPI('AlignmentAPI')
                rel = xf.GetPrim().GetRelationship('ifc5:alignment:segments')
                for ch in emitted:
                    rel.AddTarget(ch.GetPath())

    return xf or xf2

for typeobj in [t for t in f.by_type('IfcTypeObject') if t.Types and len(t.Types[0].RelatedObjects) > 1]:
    if os.path.basename(fn) == 'domestic-hot-water.ifc' and typeobj.is_a('IfcWallType'):
        continue

    xf = process(typeobj, ('TypeLibrary',), asclass=True)
    for occ in typeobj.Types[0].RelatedObjects:
        types[occ].append(xf.GetPath())
    occ = typeobj.Types[0].RelatedObjects[0]
    if occ.FillsVoids:
        write_geom(occ.FillsVoids[0].RelatingOpeningElement, xf, override='Void', istype=True)
    write_geom(occ, xf, istype=True)

DIRECT_PROPS = True

for typeobj in f.by_type('IfcPropertySet'):
    if typeobj.Name.startswith('EPset_'): continue
    if DIRECT_PROPS:
        continue
    else:
        xf = process(typeobj, ('PropertyCollections',), asclass=True)
        if typeobj.DefinesOccurrence:
            for occ in typeobj.DefinesOccurrence[0].RelatedObjects:
                types[occ].append(xf.GetPath())
        for p in typeobj.HasProperties:
            xf.GetPrim().CreateAttribute(f'ifc5:properties:{p.Name}', getSdfType(p.NominalValue[0])).Set(
                p.NominalValue[0]
            )

xf = process(f.by_type('IfcProject')[0])

for rel in f.by_type('IfcRelSpaceBoundary'):
    # @todo I'd really want the window space bs listed under those of the wall..
    path_str = f"/{fmt_guid(rel.GlobalId)}"
    xf = stage.CreateClassPrim(Sdf.Path(path_str))
    xf.SetTypeName('Xform')
    xf.ApplyAPI('SpaceBoundaryAPI')
    xf.GetRelationship('ifc5:spaceboundary:relatingSpace')\
        .AddTarget(created_nodes[rel.RelatingSpace].GetPath())
    xf.GetRelationship('ifc5:spaceboundary:relatedElement')\
        .AddTarget(created_nodes[rel.RelatedBuildingElement].GetPath())
    geom = ifcopenshell.geom.create_shape(ifcopenshell.geom.settings(), rel.ConnectionGeometry.SurfaceOnRelatingElement)
    vs = np.array(geom.verts).reshape((-1, 3))
    idxs = np.array(geom.faces).reshape((-1, 3))
    eds = np.array(geom.edges).reshape((-1, 2))
    write_geom_2(xf, "Body", vs, idxs, eds)
    stage.DefinePrim(created_nodes[rel.RelatingSpace].GetPath().pathString + f"/Boundary_{get_name(rel.RelatedBuildingElement)}").GetInherits().AddInherit(path_str)


for system in f.by_type('IfcSystem'):
    path_str = f"/{fmt_guid(system.GlobalId)}"
    xf = stage.CreateClassPrim(Sdf.Path(path_str))
    xf.SetTypeName('Xform')
    xf.CreateAttribute('ifc5:class:uri', Sdf.ValueTypeNames.String).Set(f'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/5/class/{system.is_a().replace("Type", "")}')
    xf.CreateAttribute('ifc5:class:code', Sdf.ValueTypeNames.String).Set(system.is_a().replace("Type", ""))

    targets = []
    refs = system.ServicesBuildings + getattr(system, 'ServicesFacilities', ())
    for rel in refs:
        elem = (getattr(ref, 'RelatedBuildings', ()) + getattr(ref, 'RelatingStructure', ()))[0]
        targets.append(elem)
    if not targets:
        targets.append(f.by_type('IfcBuilding')[0])

    rel = xf.GetPrim().CreateRelationship(f'ifc5:system:servicesFacility')
    for elem in targets:
        rel.AddTarget(created_nodes[elem].GetPath().pathString)

    for ref in system.IsGroupedBy[0].RelatedObjects:
        created_nodes[ref].GetPrim().CreateRelationship(f'ifc5:system:partOfSystem').AddTarget(path_str)

    # if system.is_a('IfcDistributionSystem'):
    #     if pt := system.PredefinedType:
    #         xf.CreateAttribute('ifc5:system:systemType', Sdf.ValueTypeNames.String).Set(pt)

    stage.DefinePrim(f"/{get_name(system)}").GetInherits().AddInherit(path_str)


for rel in f.by_type('IfcRelConnectsPorts'):
    cons = (rel.RelatedPort, rel.RelatingPort)
    for a, b in zip(cons, cons[::-1]):
        created_nodes[a].GetPrim().CreateRelationship(f'ifc5:system:connectsTo').AddTarget(created_nodes[b].GetPath().pathString)


for typeobj in f.by_type('IfcPropertySet'):
    if typeobj.Name.startswith('EPset_'): continue
    if DIRECT_PROPS:
        for rel in typeobj.DefinesOccurrence:
            for el in rel.RelatedObjects:
                for p in typeobj.HasProperties:
                    def val():
                        try:
                            return p.NominalValue[0]
                        except:
                            return p.EnumerationValues[0][0]
                    created_nodes[el].GetPrim().CreateAttribute(f'ifc5:properties:{p.Name}', getSdfType(val())).Set(
                        val()
                    )


##########################################################################
# materials: this is just a test for presentation, not official IFC5 yet #
##########################################################################

mats = {
    'IfcSpace': (0.6,0.7,0.8,0.3),
    'IfcWindow': (0.6,0.5,0.4,0.8),
    'IfcWall': (0.8,0.7,0.6,1.0)
}

for k, v in created_nodes.items():
    for m, mv in mats.items():
        if k.is_a(m):
            UsdShade.MaterialBindingAPI.Apply(v.GetPrim())
            material = UsdShade.Material.Define(stage, f'/{m[3:]}Material')
            shader = UsdShade.Shader.Define(stage, f'/{m[3:]}Material/Shader')
            shader.CreateIdAttr("UsdPreviewSurface")
            shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*mv[0:3]))
            shader.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(mv[3])
            material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
            UsdShade.MaterialBindingAPI(v.GetPrim()).Bind(material)

##########################################################################
##########################################################################
##########################################################################

stage.GetRootLayer().Save()

if os.path.basename(fn).startswith("bonsai-wall"):
    newLayer = Sdf.Layer.CreateNew(ofn[:-5] + "-firerating.usda")
    stage.GetRootLayer().subLayerPaths.append(newLayer.identifier)
    stage.SetEditTarget(newLayer)
    ratings = {
        'IfcWall': 'R60',
        'IfcWindow': 'R30'
    }
    for el, prim in created_nodes.items():
        if R := ratings.get(el.is_a()):
            overPrim = stage.OverridePrim(prim.GetPath())
            overPrim.CreateAttribute(f'ifc5:properties:firerating', getSdfType(R)).Set(R)
    newLayer.Save()
