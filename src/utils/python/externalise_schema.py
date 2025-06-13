import json
import os
import shutil
import sys

obj = json.load(open(sys.argv[1]))

prefix = 'https://ifc5.technical.buildingsmart.org'

mapping = {
    'bsi::ifc::v5a::prop': 'schemas/bsi/ifc/v5a/prop.json',
    'bsi::ifc::v5a': 'schemas/bsi/ifc/v5a/schema.json',
    'usd': 'schemas/usd.json',
    'nlsfb': 'schemas/nlsfb.json'
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
            if m not in obj["schemas"]:
                obj["schemas"][m] = {
                    "uri": f'{prefix}/{n}'
                }
            break


ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
