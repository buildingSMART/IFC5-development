import json
import os
import shutil
import sys

obj = json.load(open(sys.argv[1]))
obj["imports"] = []

prefix = 'https://ifcx.dev'

mapping = {
    'bsi::ifc::prop': '@standards.buildingsmart.org/ifc/core/prop@v5a.ifcx',
    'bsi::ifc': '@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx',
    'usd': '@openusd.org/usd@v1.ifcx',
    'nlsfb': '@nlsfb/nlsfb@v1.ifcx'
}

def w(path, name, schema):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with open(path, 'r') as f:
            data = json.load(f)
    except:
        data = {
            "header": {
                "version": "ifcx_alpha",
                "author": "authorname",
                "timestamp": "time string"
            },
            "schemas": {}
        }
    if name not in data['schemas']:
        data['schemas'][name] = schema
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

for k, v in list(obj["schemas"].items()):
    for m, n in mapping.items():
        if k.startswith(m):
            w('../../../web/' + n, k, v)
            del obj["schemas"][k]
            if m not in (x['uri'] for x in obj["imports"]):
                obj["imports"].append({
                    "uri": f'{prefix}/{n}'
                })
            break


ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
