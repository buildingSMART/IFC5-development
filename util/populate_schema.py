import json
import sys

obj = json.load(open(sys.argv[1]))

def make_schema(v):
    if isinstance(v, dict):
        return {
            "dataType": "Object",
            "objectRestrictions": {
                "values": {k: make_schema(v) for k, v in v.items()}
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
                    "value": make_schema(v[0])
                }
            }
    elif isinstance(v, float):
        return {
            "dataType": "Real"
        }
    elif isinstance(v, int):
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
            new_schema = { "value": make_schema(v) }
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
