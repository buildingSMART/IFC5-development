import functools
import json
import operator
import sys

obj = json.load(open(sys.argv[1]))

to_remove = set()

def it():
    for d in list(obj['data']):
        if d.get('attributes', {}).get('usd::usdshade::materialbindingapi'):
            mat = d['attributes']['usd::usdshade::materialbindingapi']
            assert len(d['attributes']) == 1
            del d['attributes']
            entity_type = next(filter(None, (x.get('attributes', {}).get('bsi::ifc::v5a::class', {}).get('code') for x in obj['data'] if x['path'] == d['path'])))
            if entity_type == 'IfcWindow':
                # skip the window material associations, split_window_bodies takes care of those in an aggregation
                to_remove.add(next(iter(mat.values()))['ref'])
                continue
            elif entity_type == "IfcSpace":
                # The space should not have a material, rather direct presentation properties
                mat_path = next(iter(mat.values()))['ref']
                mat_attrs = functools.reduce(operator.or_, (x.get('attributes', {}) for x in obj['data'] if x.get('path') == mat_path))
                d['attributes'] = mat_attrs
                to_remove.add(mat_path)
            else:
                d['inherits'] = {'material': next(iter(mat.values()))[0]['ref']}
        yield d

obj['data'] = [x for x in list(it()) if x.get('path') not in to_remove]

def it2(d):
    # overwrite our wall materials
    attrs = functools.reduce(operator.or_, (x.get('attributes', {}) for x in obj['data'] if x.get('path') == d['path']))
    if d.get('attributes', {}).get('bsi::ifc::v5a::presentation::diffuseColor') and not (attrs.get('bsi::ifc::v5a::material') or attrs.get('bsi::ifc::v5a::class')):
        d['attributes']['bsi::ifc::v5a::presentation::diffuseColor'] = [0.5,0.5,0.5]
        d['attributes']['bsi::ifc::v5a::material'] = {"code": "CONCRETE", "uri": 'https://identifier.buildingsmart.org/uri/fish/midas-materials/26/class/CONCRETE'}
    return d

obj['data'] = list(map(it2, obj['data']))

ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
