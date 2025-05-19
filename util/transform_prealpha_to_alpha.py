import functools
import itertools
import operator
import sys
import json
import uuid

def transform_iden(s):
    postfix = None
    if len(s) < 33:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, s))
    
    s = s[1:]
    if len(s) > 32:
        s, postfix = s.split('_')
            
    u = uuid.UUID(s)
    if postfix:
        u = uuid.uuid5(u, postfix)
    return str(u)

def transform_attributes(d):
    ignored = ("info:id", "outputs:surface", "outputs:surface.connect")
    def transform(k, v):
        if k in ignored:
            return None
        if k == "ref":
            parts = v[2:-1].split('/')
            v = "/".join([transform_iden(parts[0])] + parts[1:])

        if k == "xformOp":
            k = "usd::xformop"
        else:
            parts = k.split(':')
            try: parts.remove('VisibilityAPI')
            except: pass
            for i in range(len(parts) - (0 if isinstance(v, dict) else 1)):
                parts[i] = parts[i].lower()
            k = '::'.join(parts)

            if k.startswith('usd'):
                k = "usd::" + k

        if isinstance(v, dict):
            v = transform_attributes(v)
            if not v:
                return None
        return k, v
    return dict(filter(None, itertools.starmap(transform, d.items())))

def process():
    for elem in json.load(open(sys.argv[1])):
        if "disclaimer" in elem:
            continue

        print(elem["name"], '->', transform_iden(elem["name"]))

        children = list(filter(lambda c: c.get("inherits"), elem.get("children", [])))
        weird_children = filter(lambda c: not c.get("inherits"), elem.get("children", []))
        weird_child_attrs = functools.reduce(operator.or_, (c.get('attributes') or {} for c in filter(lambda c: not c.get("inherits"), weird_children)), {})
        attributes = {**weird_child_attrs, **(elem.get("attributes") or {})}

        if (attributes and transform_attributes(attributes)) or elem.get("inherits") or children:
            yield {
                "path": transform_iden(elem["name"]),
                **({"attributes": transform_attributes(attributes)} if attributes and transform_attributes(attributes) else {}),
                **({"inherits": dict((f"i{k}", transform_iden(v[2:-1])) for k, v in enumerate(elem["inherits"]))} if elem.get("inherits") else {}),
                **({"children": dict((d["name"], transform_iden(d["inherits"][0][2:-1])) for d in children)} if children else {}),
            }

def fold(k, vs):
    raise NotImplementedError


items = list(process())

if False:
    items = list(itertools.starmap(fold, itertools.groupby(sorted(items, key=operator.attrgetter('path')), key=operator.attrgetter('path'))))

json.dump({
    "header": {
        "version": "ifcx_alpha",
        "author": "authorname",
        "timestamp": "time string"
    },
    "schemas": {},
    "data": items
}, open(sys.argv[2], 'w'), indent=2)
