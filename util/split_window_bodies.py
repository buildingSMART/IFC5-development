import itertools
import json
import sys
import uuid
import numpy as np
import networkx as nx

obj = json.load(open(sys.argv[1]))

def make_material(name):
    assert name.lower() in ("concrete", "glass", "wood")
    colors = {
        "concrete": [0.5,0.5,0.5],
        "glass": [0.5,0.8,0.6,0.3],
        "wood": [0.8,0.7,0.6]
    }
    clr = colors[name.lower()]
    
    d = {
        "path": str(uuid.uuid5(uuid.NAMESPACE_OID, name.lower())),
        "attributes": {
            "bsi::ifc::v5a::material": {
                "code": name.upper(),
                "uri": 'https://identifier.buildingsmart.org/uri/fish/midas-materials/26/class/'+name.upper()
            },
            "bsi::ifc::v5a::presentation::diffuseColor": clr[0:3],
            **({"bsi::ifc::v5a::presentation::opacity": clr[3]} if len(clr) == 4 else {})
        }
    }
    
    if d not in obj["data"]:
        obj["data"].append(d)
    return d

parents = dict(itertools.chain.from_iterable(([(c, o['path']) for k, c in o['children'].items() if k != 'Void'] for o in obj['data'] if o.get('children'))))

to_remove = []

for d in [d for d in list(obj['data']) if d.get('attributes', {}).get('usd::usdgeom::mesh')]:
    mesh = d['attributes']['usd::usdgeom::mesh']
    g = nx.Graph()
    indices = np.array(mesh["faceVertexIndices"], dtype=int)
    points = np.array(mesh["points"], dtype=float)

    g = nx.Graph()
    for i in range(0, len(indices), 3):
      for j in range(3):
        k = tuple(points[indices[i + j]])
        l = tuple(points[indices[i + ((j + 1) % 3)]])
        g.add_edge(k, l)
    
    for i, comp in enumerate(nx.connected_components(g)):
        comp2 = np.concatenate([np.where(np.sum(points == p, axis=1) == 3)[0] for p in comp])
        comp2.sort()
        assert comp2[-1] - comp2[0] == len(comp2) - 1
        points2 = points[comp2]
        indices2 = np.array([i for i in indices if i in range(comp2[0], comp2[-1]+1)]) - comp2[0]
        if indices.size != indices2.size:
            try:
                # delete existing mesh on body
                del d['attributes']['usd::usdgeom::mesh']
            except:
                pass

            name = 'Frame' if points2.T[1].ptp() > 0.02 else 'Glazing'
            child_guid = str(uuid.uuid5(uuid.UUID(d['path']), name))
            
            obj['data'].append({
                "path": child_guid,
                "attributes": {
                    'usd::usdgeom::mesh': {
                        'faceVertexIndices': indices2.tolist(),
                        'points': points2.tolist()
                    }
                },
                "inherits": {
                    "material": make_material("wood" if points2.T[1].ptp() > 0.02 else "glass")["path"]
                }
            })
            my_parents = [x for x in obj['data'] if x['path'] == parents[d['path']] and 'children' in x]
            assert len(my_parents) == 1
            my_parent = my_parents[0]
            try:
                del my_parent['children']['Body']
            except: pass
            
            while name in my_parent['children']:
                name_parts = name.split('_')
                if len(name_parts) == 1:
                    name, suffix = name, 1
                else:
                    name, suffix = name_parts
                    suffix = int(suffix)
                name = f'{name}_{suffix:03d}'
            my_parent['children'][name] = child_guid

            to_remove.append(d['path'])

obj['data'] = [x for x in obj['data'] if x['path'] not in to_remove]

ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
