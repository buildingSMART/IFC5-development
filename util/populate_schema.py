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


def unify_schemas(left, right):
    if None in (left, right):
        return left or right
    types = set(map(type, (left, right)))
    assert types in ({str}, {dict})
    if types == {str}:
        if {left, right} == {'Integer', 'Real'}:
            return 'Real'
        elif left == right:
            return left
        else:
            return None
    if not (left.keys() <= right.keys() or right.keys() <= left.keys()):
        return None
    di = {
        k: unify_schemas(left.get(k), right.get(k)) for k in (left.keys() | right.keys())
    }
    if None in di.values():
        return None
    return di



schema = {}
for elem in obj["data"]:
    if attr := elem.get("attributes"):
        for k, v in attr.items():
            new_schema = { "value": make_schema(v, [k]) }
            if old_schema := schema.get(k):
                if new_schema != old_schema: 
                    unified = unify_schemas(old_schema, new_schema)
                    if unified:
                        schema[k] = unified
                    else:
                        breakpoint()
                        assert False
            else:
                schema[k] = new_schema

obj["schemas"] = schema

ostream = None
try:
    ostream = open(sys.argv[2], 'w')
except: 
    ostream = sys.stdout

json.dump(obj, ostream, indent=2)
