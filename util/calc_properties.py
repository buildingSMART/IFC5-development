import json
import sys
import numpy as np

obj = json.load(open(sys.argv[1]))

def volume(data):
    indices = np.array(data["faceVertexIndices"], dtype=int)
    points = np.array(data["points"], dtype=float)
    ref = points.mean(axis=0)
    vol = 0.0
    for i in range(0, len(indices), 3):
        a = points[indices[i    ]] - ref
        b = points[indices[i + 1]] - ref
        c = points[indices[i + 2]] - ref
        vol += np.dot(np.cross(a, b), c) / 6.0
    return vol

def height(data):
    points = np.array(data["points"], dtype=float)
    return points[:,2].max() - points[:,2].min()

for d in [d for d in list(obj['data']) if d.get('attributes', {}).get('usd::usdgeom::mesh')]:
    mesh = d['attributes']['usd::usdgeom::mesh']
    obj['data'].append({
      "identifier":"f079bafd-8733-48d8-85df-1c1656a17c1f",
      "attributes": {
        "bsi::ifc::v5a::prop::volume": volume(mesh),
        "bsi::ifc::v5a::prop::height": height(mesh),
      }
    })

ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
