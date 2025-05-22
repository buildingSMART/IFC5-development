import json
import sys

obj = json.load(open(sys.argv[1]))
known_quants = {
    "volume": {"quantityKind": "Volume"},
    "height": {"quantityKind": "Length"}
}

def make_schema(v, path=[]):
    if isinstance(v, dict):
        return {
            "dataType": "Object",
            "objectRestrictions": {
                "values": {k: make_schema(v, [*path, k]) for k, v in v.items()}
            }
        }
    elif isinstance(v, list):
        if set(map(type, v)) == {int, float}:
            return {
                "dataType": "Array",
                "arrayRestrictions": {
                    "value": {
                        "dataType": "Real"
                    }
                }
            }
        else:
            assert len(set(map(type, v))) == 1
            return {
                "dataType": "Array",
                "arrayRestrictions": {
                    "value": make_schema(v[0], [*path, k])
                }
            }
    elif isinstance(v, float):
        return {
            "dataType": "Real",
            **known_quants.get(path[-1].split('::')[-1], {})
        }
    elif isinstance(v, bool):
        return {
            "dataType": "Boolean"
        }
    elif isinstance(v, int):
        if "points" in path or "transform" in path:
            return {
                "dataType": "Real"
            }
        return {
            "dataType": "Integer"
        }
    elif isinstance(v, str):
        return {
            "dataType": "String"
        }
    else:
        breakpoint()

schema = {}
for elem in obj["data"]:
    if attr := elem.get("attributes"):
        for k, v in attr.items():
            new_schema = { "value": make_schema(v, [k]) }
            if old_schema := schema.get(k):
                new_schema_str, old_schema_str = map(json.dumps, (new_schema, old_schema))
                if new_schema != old_schema and (new_schema_str.replace('"Real"', '"Integer"') == old_schema_str or old_schema_str.replace('"Real"', '"Integer"') == new_schema_str):
                    # lazy way to assess compatibility, potentially wrong
                    if new_schema_str.count('"Real"') > old_schema_str.count('"Real"'):
                        schema[k] = new_schema
                else:
                    assert new_schema == old_schema
            else:
                schema[k] = new_schema

obj["schemas"] = schema

ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
