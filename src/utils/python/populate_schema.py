import json
import sys

obj = json.load(open(sys.argv[1]))
known_quants = {
    "volume": {"quantityKind": "Volume"},
    "height": {"quantityKind": "Length"}
}

class frozendict(dict):
    def __key(self):
        return frozenset((k,self[k]) for k in self)

    def __hash__(self):
        return hash(self.__key())

    def __eq__(self, other):
        return self.__key() == other.__key()

def make_schema(v, path=[]):
    if isinstance(v, dict):
        return frozendict({
            "dataType": "Object",
            "objectRestrictions": frozendict({
                "values": frozendict({k: make_schema(v, [*path, k]) for k, v in v.items()})
            })
        })
    elif isinstance(v, list):
        if set(map(type, v)) == {int, float}:
            return frozendict({
                "dataType": "Array",
                "arrayRestrictions": frozendict({
                    "value": frozendict({
                        "dataType": "Real"
                    })
                })
            })
        else:
            assert len(set(map(type, v))) == 1
            schemas = set(make_schema(i, [*path, k]) for i in v)
            if len(schemas) == 1:
                element_schema = next(iter(schemas))
            else:
                element_schema = frozendict({
                    "dataType": "Union",
                    "unionRestrictions": frozendict({
                        "values": tuple(sorted(schemas, key=str))
                    })
                })
            return frozendict({
                "dataType": "Array",
                "arrayRestrictions": frozendict({
                    "value": element_schema
                })
            })
    elif isinstance(v, float):
        return frozendict({
            "dataType": "Real",
            **known_quants.get(path[-1].split('::')[-1], {})
        })
    elif isinstance(v, bool):
        return frozendict({
            "dataType": "Boolean"
        })
    elif isinstance(v, int):
        if "points" in path or "transform" in path:
            return frozendict({
                "dataType": "Real"
            })
        return frozendict({
            "dataType": "Integer"
        })
    elif isinstance(v, str):
        return frozendict({
            "dataType": "String"
        })
    else:
        breakpoint()


def unify_schemas(left, right):
    if None in (left, right):
        return left or right
    types = set(map(type, (left, right)))
    assert types in ({str}, {frozendict})
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
